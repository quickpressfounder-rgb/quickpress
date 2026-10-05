/**
 * QuickPress session storage shared by all four apps.
 *
 * Holds the QuickPress JWT pair + account the transport attaches to every
 * request. Firebase owns the identity; this store owns the *app* session.
 *
 * Remember login
 * --------------
 *   remember = true  → session persists in localStorage   (auto login)
 *   remember = false → session lives in sessionStorage    (tab lifetime)
 *
 * Reads always check both storages, so sessions written by earlier builds keep
 * working after this upgrade.
 */

import type { AuthSession } from "@/shared/types";

const KEY_PREFIX = "quickpress.session.";
const REMEMBER_PREFIX = "quickpress.remember.";

let activeRole: string = "customer";
const memory = new Map<string, AuthSession>();
const listeners = new Set<() => void>();

/** Each app declares which role it authenticates, once, at bootstrap. */
export function configureSessionRole(role: string): void {
  activeRole = role;
}

/** The role this app authenticates (set once at bootstrap). */
export function activeSessionRole(): string {
  return activeRole;
}

function storageKey(role: string = activeRole): string {
  return `${KEY_PREFIX}${role}`;
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function local(): Storage | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function session(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------- remember login */

/**
 * Remember this login across browser restarts (default: true).
 * Called by the auth screens' "Remember me" checkbox.
 */
export function setRememberSession(remember: boolean, role: string = activeRole): void {
  const store = local();
  if (!store) return;
  try {
    store.setItem(`${REMEMBER_PREFIX}${role}`, remember ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** True when this role's session should survive a browser restart. */
export function isSessionRemembered(role: string = activeRole): boolean {
  const store = local();
  if (!store) return true;
  try {
    return store.getItem(`${REMEMBER_PREFIX}${role}`) !== "0";
  } catch {
    return true;
  }
}

function targetStorage(role: string): Storage | null {
  return isSessionRemembered(role) ? local() : (session() ?? local());
}

/* ------------------------------------------------------------- read/write */

export function readSession(role: string = activeRole): AuthSession | null {
  const cached = memory.get(role);
  if (cached) return cached;
  for (const store of [local(), session()]) {
    if (!store) continue;
    try {
      const raw = store.getItem(storageKey(role));
      if (!raw) continue;
      const parsed = JSON.parse(raw) as AuthSession;
      memory.set(role, parsed);
      return parsed;
    } catch {
      /* try the next storage */
    }
  }
  return null;
}

export function writeSession(session_: AuthSession, role: string = activeRole): void {
  memory.set(role, session_);
  const store = targetStorage(role);
  if (store) {
    try {
      store.setItem(storageKey(role), JSON.stringify(session_));
    } catch {
      /* ignore */
    }
  }
  // When "remember me" is off, make sure no long-lived copy survives.
  if (!isSessionRemembered(role) && store !== local()) {
    try {
      local()?.removeItem(storageKey(role));
    } catch {
      /* ignore */
    }
  }
  for (const listener of listeners) listener();
}

export function clearSession(role: string = activeRole): void {
  memory.delete(role);
  for (const store of [local(), session()]) {
    try {
      store?.removeItem(storageKey(role));
    } catch {
      /* ignore */
    }
  }
  for (const listener of listeners) listener();
}

export function readToken(role: string = activeRole): string | null {
  const sessionToken = readSession(role)?.token;
  if (sessionToken) return sessionToken;
  for (const store of [local(), session()]) {
    if (!store) continue;
    try {
      const direct =
        store.getItem("qp_access_token") ||
        store.getItem("token") ||
        store.getItem("accessToken");
      if (direct) return direct;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Access-token expiry for this role, or null when there is no session. */
export function sessionExpiresAt(role: string = activeRole): number | null {
  const stored = readSession(role);
  if (!stored?.expiresAt) return null;
  const at = Date.parse(stored.expiresAt);
  return Number.isFinite(at) ? at : null;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
