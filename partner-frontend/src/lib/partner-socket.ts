/**
 * Real-time Socket.IO client for Partner Store Console.
 * Listens for incoming orders and store status changes in real-time.
 */

import { io, type Socket } from "socket.io-client";
import { getStoredPartnerSession } from "../api/partner/partner-auth-api";

let socket: Socket | null = null;
const orderListeners = new Set<(order: any) => void>();
const statusListeners = new Set<(status: any) => void>();

function getSocketUrl(): string {
  if (typeof window === "undefined") return "http://localhost:8000";
  const custom = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL;
  if (custom && typeof custom === "string" && custom.trim()) {
    return custom.trim().replace(/\/+$/, "");
  }
  const host = window.location.hostname || "localhost";
  return `http://${host}:8000`;
}

export function initPartnerSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (socket && socket.connected) return socket;

  const url = getSocketUrl();
  const session: any = getStoredPartnerSession();
  const partnerId = session?.partnerId || session?.account?.partnerId || session?.id || "";
  const phone = (session?.phone || session?.account?.phone || "").replace("+", "").trim();
  const userId = session?.account?.id || session?.account?.user_id || session?.userId || "";
  const token = session?.token || "";

  try {
    if (!socket) {
      socket = io(url, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        auth: {
          role: "partner",
          partnerId,
          userId,
          phone,
          token,
        },
      });

      socket.on("connect", () => {
        console.log("[PartnerSocket] Connected to realtime gateway:", socket?.id);
        if (partnerId) socket?.emit("join", `partner:${partnerId}`);
        if (phone) socket?.emit("join", `phone:${phone}`);
        if (userId) socket?.emit("join", `user:${userId}`);
        socket?.emit("join", "partners");
      });

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

      socket.on("order.created", handleOrder);
      socket.on("order.rider_assigned", handleOrder);
      socket.on("order.picked_up", handleOrder);
      socket.on("order.ready", handleOrder);
      socket.on("order.at_partner", handleOrder);
      socket.on("order.out_for_delivery", handleOrder);
      socket.on("order.delivered", handleOrder);
      socket.on("order.cancelled", handleOrder);
      socket.on("order.status_changed", handleOrder);

      socket.on("partner.status_changed", handleStatus);
      socket.on("partner.online_status", handleStatus);

      socket.on("disconnect", (reason) => {
        console.log("[PartnerSocket] Disconnected from gateway:", reason);
      });
    } else if (!socket.connected) {
      socket.connect();
    }

    return socket;
  } catch (err) {
    console.warn("[PartnerSocket] Failed to initialize socket client:", err);
    return null;
  }
}

export function subscribePartnerOrders(callback: (order: any) => void): () => void {
  orderListeners.add(callback);
  initPartnerSocket();

  return () => {
    orderListeners.delete(callback);
  };
}

export function subscribePartnerStatus(callback: (status: any) => void): () => void {
  statusListeners.add(callback);
  initPartnerSocket();

  return () => {
    statusListeners.delete(callback);
  };
}
