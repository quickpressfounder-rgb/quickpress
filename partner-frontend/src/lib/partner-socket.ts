/**
 * Real-time Socket.IO client for Partner Store Console.
 * Listens for incoming orders and store status changes in real-time.
 */

import { io, type Socket } from "socket.io-client";
import { getStoredPartnerSession } from "../api/partner/partner-auth-api";
import { readSession } from "../api/core/session-store";
import { getCachedPartnerProfile } from "../api/partner/partner-profile-api";

let socket: Socket | null = null;
const orderListeners = new Set<(order: any) => void>();
const statusListeners = new Set<(status: any) => void>();
const notificationListeners = new Set<(notification: any) => void>();

const PRODUCTION_SOCKET_URL = "https://quickpress-api-production.up.railway.app";

function getSocketUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_SOCKET_URL;
  const custom = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL;
  if (custom && typeof custom === "string" && custom.trim()) {
    let clean = custom.trim().replace(/\/+$/, "");
    if (clean.includes("quickpress-api-production-3292.up.railway.app")) {
      clean = clean.replace("-3292", "");
    }
    if (clean.startsWith("http://") && window.location.protocol === "https:") {
      return clean.replace("http://", "https://");
    }
    return clean;
  }
  return PRODUCTION_SOCKET_URL;
}

function getPartnerCredentials() {
  const rawSession: any = readSession("partner");
  const storedPartner: any = getStoredPartnerSession();
  const profile: any = getCachedPartnerProfile();

  const partnerId = String(
    profile?.partnerId ||
    profile?.id ||
    storedPartner?.partnerId ||
    rawSession?.account?.linkedId ||
    rawSession?.account?.id ||
    ""
  ).trim();

  const phone = String(
    storedPartner?.phone ||
    rawSession?.account?.phone ||
    profile?.phone ||
    ""
  ).replace("+", "").trim();

  const userId = String(
    rawSession?.account?.id ||
    rawSession?.account?.user_id ||
    storedPartner?.partnerId ||
    ""
  ).trim();

  const token = String(rawSession?.token || "").trim();

  return { partnerId, phone, userId, token };
}

let lastJoinedRoomsKey = "";

function joinPartnerRooms(sock: Socket, partnerId: string, phone: string, userId: string, force = false) {
  if (!sock || !sock.connected) return;
  const key = `${sock.id}:${partnerId}:${phone}:${userId}`;
  if (!force && lastJoinedRoomsKey === key) return;
  lastJoinedRoomsKey = key;
  console.log("[PartnerSocket] ⚡ Joining partner realtime rooms:", { partnerId, phone, userId });

  // Join global partners channel
  sock.emit("join", "partners");

  if (partnerId) {
    sock.emit("join", `partner:${partnerId}`);
    if (partnerId.toUpperCase().startsWith("PRT-")) {
      sock.emit("join", `partner:${partnerId.slice(4)}`);
    } else if (/^\d+$/.test(partnerId)) {
      sock.emit("join", `partner:PRT-${partnerId}`);
    }
  }

  if (phone) {
    sock.emit("join", `phone:${phone}`);
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      sock.emit("join", `phone:${digits.slice(-10)}`);
      sock.emit("join", `phone:91${digits.slice(-10)}`);
    }
  }

  if (userId) {
    sock.emit("join", `user:${userId}`);
  }
}

export function rebindPartnerSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const { partnerId, phone, userId, token } = getPartnerCredentials();

  if (socket) {
    socket.auth = {
      role: "partner",
      partnerId,
      userId,
      phone,
      token,
    };
    if (socket.connected) {
      joinPartnerRooms(socket, partnerId, phone, userId);
    } else {
      socket.connect();
    }
    return socket;
  }

  return initPartnerSocket();
}

export function initPartnerSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const { partnerId, phone, userId, token } = getPartnerCredentials();
  const url = getSocketUrl();

  try {
    if (!socket) {
      socket = io(url, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 2000,
        timeout: 10000,
        auth: {
          role: "partner",
          partnerId,
          userId,
          phone,
          token,
        },
      });

      const handleConnect = () => {
        console.log("[PartnerSocket] ⚡ Connected to realtime gateway:", socket?.id);
        const creds = getPartnerCredentials();
        if (socket) {
          joinPartnerRooms(socket, creds.partnerId, creds.phone, creds.userId);
        }
      };

      socket.on("connect", handleConnect);
      socket.on("reconnect", handleConnect);

      const handleOrder = (data: any) => {
        console.log("[PartnerSocket] ⚡ Realtime order event received:", data);
        orderListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error("[PartnerSocket] Error in order listener:", err);
          }
        });
      };

      const handleStatus = (data: any) => {
        console.log("[PartnerSocket] ⚡ Realtime partner status update received:", data);
        statusListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error("[PartnerSocket] Error in status listener:", err);
          }
        });
      };

      // Listen for all incoming order creation aliases
      socket.on("order.created", handleOrder);
      socket.on("order:created", handleOrder);
      socket.on("new_order", handleOrder);
      socket.on("ORDER_CREATED", handleOrder);
      socket.on("partner:order_created", handleOrder);
      socket.on("order_created", handleOrder);

      // Lifecycle transition events
      socket.on("order.partner_accepted", handleOrder);
      socket.on("order.rider_assigned", handleOrder);
      socket.on("order.picked_up", handleOrder);
      socket.on("order.ready", handleOrder);
      socket.on("order.at_partner", handleOrder);
      socket.on("order.out_for_delivery", handleOrder);
      socket.on("order.delivered", handleOrder);
      socket.on("order.cancelled", handleOrder);
      socket.on("order.status_changed", handleOrder);
      socket.on("order.stage_updated", handleOrder);

      // Partner store online/offline events
      socket.on("partner.status_changed", handleStatus);
      socket.on("partner.online_status", handleStatus);

      // Notification and Broadcast events
      const handleNotification = (data: any) => {
        console.log("[PartnerSocket] ⚡ Realtime notification received:", data);
        notificationListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error("[PartnerSocket] Error in notification listener:", err);
          }
        });
      };

      socket.on("notification_created", handleNotification);
      socket.on("notification:created", handleNotification);
      socket.on("admin_broadcast", handleNotification);
      socket.on("admin:broadcast", handleNotification);
      socket.on("partner.notification", handleNotification);
      socket.on("partner:notification", handleNotification);
      socket.on("broadcast:notification", handleNotification);

      socket.on("disconnect", (reason) => {
        lastJoinedRoomsKey = "";
        console.log("[PartnerSocket] Disconnected from gateway:", reason);
      });
    } else {
      socket.auth = {
        role: "partner",
        partnerId,
        userId,
        phone,
        token,
      };
      if (socket.connected) {
        joinPartnerRooms(socket, partnerId, phone, userId);
      } else {
        socket.connect();
      }
    }

    return socket;
  } catch (err) {
    console.warn("[PartnerSocket] Failed to initialize socket client:", err);
    return null;
  }
}

export function subscribePartnerOrders(callback: (order: any) => void): () => void {
  orderListeners.add(callback);
  rebindPartnerSocket();

  return () => {
    orderListeners.delete(callback);
  };
}

export function subscribePartnerStatus(callback: (status: any) => void): () => void {
  statusListeners.add(callback);
  rebindPartnerSocket();

  return () => {
    statusListeners.delete(callback);
  };
}

export function subscribePartnerNotifications(callback: (notification: any) => void): () => void {
  notificationListeners.add(callback);
  rebindPartnerSocket();

  return () => {
    notificationListeners.delete(callback);
  };
}
