/**
 * The single Socket.IO client every QuickPress app uses.
 *
 *   UI screen → realtime hook (`@shared/hooks/use-realtime`) → this manager
 *
 * Like `transport.ts`, two modes sit behind one API:
 *   • simulated — deterministic fixture stream (default, no server needed)
 *   • live      — real Socket.IO gateway, used as soon as VITE_SOCKET_URL is set
 *
 * Responsibilities:
 *   · one shared connection per browser tab (no per-screen sockets)
 *   · automatic reconnect with exponential backoff + jitter
 *   · connection recovery: rooms are re-joined after every reconnect
 *   · offline handling: pauses on `offline`, resumes on `online`
 *   · event acknowledgement for client→server emits
 *   · duplicate prevention via an LRU of seen `eventId`s
 *   · memory-leak prevention: ref-counted rooms, every subscribe returns an
 *     unsubscribe, and the socket disconnects when the last listener leaves
 */

import { io, type Socket } from "socket.io-client";

import { apiBaseUrl, appEnvironment } from "../customer/api/config";
import { readToken, activeSessionRole } from "./session-store";
import type { AnyRealtimePayload } from "./socket-events";
import { startRealtimeSimulator } from "./realtime-simulator";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "offline";

export type RealtimeMode = "live" | "simulated";

export type ConnectionState = {
  status: ConnectionStatus;
  mode: RealtimeMode;
  /** Rooms currently joined (after reconnect these are re-joined verbatim). */
  rooms: string[];
  attempts: number;
  lastEventAt: string | null;
  lastError: string | null;
};

type Handler = (payload: AnyRealtimePayload) => void;

const DEDUPE_LIMIT = 500;

function socketUrl(): string {
  const raw = import.meta.env["VITE_SOCKET_URL"] || import.meta.env["VITE_API_BASE_URL"];
  if (raw && typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  return apiBaseUrl();
}

export function isRealtimeConfigured(): boolean {
  return true;
}

export function realtimeMode(): RealtimeMode {
  return isRealtimeConfigured() ? "live" : "simulated";
}

/* ------------------------------------------------------------------ */
/* Manager state                                                       */
/* ------------------------------------------------------------------ */

let socket: Socket | null = null;
let stopSimulator: (() => void) | null = null;
let listenerCount = 0;

const handlers = new Map<string, Set<Handler>>();
const roomRefs = new Map<string, number>();
const seenEvents = new Set<string>();
const seenOrder: string[] = [];
const stateListeners = new Set<(state: ConnectionState) => void>();

let state: ConnectionState = {
  status: "idle",
  mode: realtimeMode(),
  rooms: [],
  attempts: 0,
  lastEventAt: null,
  lastError: null,
};

function setState(patch: Partial<ConnectionState>): void {
  state = { ...state, ...patch, rooms: [...roomRefs.keys()] };
  stateListeners.forEach((listener) => listener(state));
}

export function connectionState(): ConnectionState {
  return state;
}

export function subscribeConnection(listener: (state: ConnectionState) => void): () => void {
  stateListeners.add(listener);
  listener(state);
  return () => {
    stateListeners.delete(listener);
  };
}

/* ------------------------------------------------------------------ */
/* Duplicate prevention                                                */
/* ------------------------------------------------------------------ */

function isDuplicate(payload: AnyRealtimePayload): boolean {
  const id = payload?.eventId;
  if (!id) return false;
  if (seenEvents.has(id)) return true;
  seenEvents.add(id);
  seenOrder.push(id);
  if (seenOrder.length > DEDUPE_LIMIT) {
    const oldest = seenOrder.shift();
    if (oldest) seenEvents.delete(oldest);
  }
  return false;
}

function dispatch(event: string, payload: AnyRealtimePayload): void {
  if (isDuplicate(payload)) return;
  setState({ lastEventAt: new Date().toISOString() });
  const set = handlers.get(event);
  if (!set) return;
  // Copy so a handler unsubscribing during dispatch cannot mutate the loop.
  [...set].forEach((handler) => {
    try {
      handler(payload);
    } catch (error) {
      console.error(`[realtime] handler for ${event} threw`, error);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Connection lifecycle                                                */
/* ------------------------------------------------------------------ */

function attachSocketHandlers(instance: Socket): void {
  instance.on("connect", () => {
    setState({ status: "connected", attempts: 0, lastError: null });
    // Connection recovery — re-join every room we believe we are in.
    roomRefs.forEach((_count, room) => {
      instance.emit("room.join", { room });
    });
  });

  instance.on("disconnect", (reason) => {
    setState({ status: reason === "io client disconnect" ? "idle" : "reconnecting" });
  });

  instance.io.on("reconnect_attempt", (attempt) => {
    setState({ status: "reconnecting", attempts: attempt });
  });

  instance.on("connect_error", (error) => {
    setState({ status: "reconnecting", lastError: error.message });
  });

  // A single server->client channel keeps listener count constant regardless
  // of how many event names the app subscribes to.
  instance.onAny((event: string, payload: AnyRealtimePayload) => {
    dispatch(event, payload);
  });
}

function ensureConnection(): void {
  if (state.mode === "simulated") {
    // Mirrors transport.ts: a production build must never emit fixture events
    // that look like real order/rider updates. Without VITE_SOCKET_URL the
    // realtime layer stays offline instead of faking a live connection.
    if (appEnvironment() === "production") {
      setState({
        status: "offline",
        lastError: "VITE_SOCKET_URL is not configured for this production build",
      });
      return;
    }
    if (!stopSimulator) {
      stopSimulator = startRealtimeSimulator((event, payload) => dispatch(event, payload));
      setState({ status: "connected" });
    }
    return;
  }


  if (socket) return;

  setState({ status: "connecting" });
  socket = io(socketUrl(), {
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 15_000,
    randomizationFactor: 0.5,
    timeout: 20_000,
    withCredentials: true,
    auth: (cb: (data: Record<string, unknown>) => void) => {
      cb({ token: readToken() ?? null, role: activeSessionRole() });
    },
  });
  attachSocketHandlers(socket);
}

function teardownConnection(): void {
  if (stopSimulator) {
    stopSimulator();
    stopSimulator = null;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  setState({ status: "idle", attempts: 0 });
}

/* ------------------------------------------------------------------ */
/* Offline handling                                                    */
/* ------------------------------------------------------------------ */

let networkBound = false;

function bindNetwork(): void {
  if (networkBound || typeof window === "undefined") return;
  networkBound = true;
  window.addEventListener("offline", () => {
    setState({ status: "offline" });
    socket?.disconnect();
  });
  window.addEventListener("online", () => {
    if (listenerCount > 0) {
      setState({ status: "connecting" });
      if (socket) socket.connect();
      else ensureConnection();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Subscribe to a realtime event. Returns an unsubscribe function. */
export function onRealtimeEvent(event: string, handler: Handler): () => void {
  if (typeof window === "undefined") return () => {};
  bindNetwork();

  const set = handlers.get(event) ?? new Set<Handler>();
  set.add(handler);
  handlers.set(event, set);
  listenerCount += 1;
  ensureConnection();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = handlers.get(event);
    current?.delete(handler);
    if (current && current.size === 0) handlers.delete(event);
    listenerCount = Math.max(0, listenerCount - 1);
    if (listenerCount === 0 && roomRefs.size === 0) teardownConnection();
  };
}

/** Join a room (ref-counted). Returns a leave function. */
export function joinRoom(room: string): () => void {
  if (typeof window === "undefined" || !room) return () => {};
  bindNetwork();
  ensureConnection();

  const next = (roomRefs.get(room) ?? 0) + 1;
  roomRefs.set(room, next);
  if (next === 1) socket?.emit("room.join", { room });
  setState({});

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const count = (roomRefs.get(room) ?? 1) - 1;
    if (count <= 0) {
      roomRefs.delete(room);
      socket?.emit("room.leave", { room });
    } else {
      roomRefs.set(room, count);
    }
    setState({});
    if (listenerCount === 0 && roomRefs.size === 0) teardownConnection();
  };
}

/**
 * Emit a client→server event and wait for the server acknowledgement.
 * In simulated mode the ack resolves locally so call sites behave identically.
 */
export function emitWithAck<T = unknown>(
  event: string,
  payload: unknown,
  timeoutMs = 8_000,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  if (state.mode === "simulated" || !socket) {
    return Promise.resolve({ ok: true });
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: "ack-timeout" }), timeoutMs);
    socket?.emit(event, payload, (ack: { ok?: boolean; data?: T; error?: string }) => {
      clearTimeout(timer);
      resolve({ ok: ack?.ok ?? true, ...(ack?.data !== undefined ? { data: ack.data } : {}), ...(ack?.error ? { error: ack.error } : {}) });
    });
  });
}

/** Force a reconnect (used by the "reconnect now" affordance). */
export function reconnectRealtime(): void {
  if (state.mode === "simulated") return;
  socket?.disconnect();
  socket?.connect();
  setState({ status: "connecting" });
}

/** Test/dev helper: push an event through the client pipeline. */
export function injectRealtimeEvent(event: string, payload: AnyRealtimePayload): void {
  dispatch(event, payload);
}
