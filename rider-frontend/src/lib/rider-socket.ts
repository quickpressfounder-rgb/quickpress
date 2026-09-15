/**
 * Real-time Socket.IO client for Rider Cockpit.
 * Listens for instant order dispatches ('order.rider_offer', 'new_order_offer')
 * and triggers immediate audible siren bell alerts for the delivery captain.
 */

import { io, type Socket } from "socket.io-client";
import { readSession } from "../api/core/session-store";

let socket: Socket | null = null;
const offerListeners = new Set<(offer: any) => void>();
const statusListeners = new Set<(status: any) => void>();
const orderListeners = new Set<(order: any) => void>();
const walletListeners = new Set<(wallet: any) => void>();
const notificationListeners = new Set<(notif: any) => void>();

function getSocketUrl(): string {
  if (typeof window === "undefined") return "http://localhost:8000";
  const custom = import.meta.env["VITE_SOCKET_URL"] || import.meta.env["VITE_API_BASE_URL"];
  if (custom && typeof custom === "string" && custom.trim()) {
    return custom.trim().replace(/\/+$/, "");
  }
  const host = window.location.hostname || "localhost";
  return `http://${host}:8000`;
}

function joinRiderRooms(s: Socket) {
  if (!s || !s.connected) return;
  const session: any = readSession("rider") || readSession();
  const riderId = session?.["riderId"] || session?.["account"]?.["riderId"] || session?.["account"]?.["linkedId"] || "";
  const phone = (session?.["account"]?.["phone"] || session?.["phone"] || "").replace("+", "").trim();
  const userId = session?.["account"]?.["id"] || session?.["account"]?.["user_id"] || session?.["userId"] || "";

  if (riderId) {
    s.emit("join", `rider:${riderId}`);
    s.emit("room.join", `rider:${riderId}`);
  }
  if (phone) {
    s.emit("join", `rider:${phone}`);
    s.emit("join", `rider:+${phone}`);
    s.emit("join", `phone:${phone}`);
  }
  if (userId) {
    s.emit("join", `rider:${userId}`);
    s.emit("join", `user:${userId}`);
    s.emit("join", `customer:${userId}`);
  }
  s.emit("join", "riders");
}

export function syncRiderSocketAuth(sessionData?: any): void {
  if (socket && socket.connected) {
    joinRiderRooms(socket);
  } else {
    initRiderSocket();
  }
}

export function initRiderSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (socket && socket.connected) return socket;

  const url = getSocketUrl();
  const session: any = readSession("rider") || readSession();
  const riderId = session?.["riderId"] || session?.["account"]?.["riderId"] || session?.["account"]?.["linkedId"] || "";
  const phone = (session?.["account"]?.["phone"] || session?.["phone"] || "").replace("+", "").trim();
  const userId = session?.["account"]?.["id"] || session?.["account"]?.["user_id"] || session?.["userId"] || "";
  const token = session?.["token"] || "";

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
          role: "rider",
          riderId,
          userId,
          phone,
          token,
        },
      });

      socket.on("connect", () => {
        console.log("[RiderSocket] Connected to realtime dispatch gateway:", socket?.id);
        joinRiderRooms(socket!);
      });

      const handleOffer = (data: any) => {
        console.log("[RiderSocket] ⚡ Realtime order offer received:", data);
        offerListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error("[RiderSocket] Error in offer listener:", err);
          }
        });
      };

      const handleStatus = (data: any) => {
        console.log("[RiderSocket] ⚡ Realtime rider status update received:", data);
        statusListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error("[RiderSocket] Error in status listener:", err);
          }
        });
      };

      const handleOrderEvent = (data: any) => {
        console.log("[RiderSocket] 📦 Realtime order event received:", data);
        orderListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error("[RiderSocket] Error in order listener:", err);
          }
        });
      };

      const handleWalletEvent = (data: any) => {
        console.log("[RiderSocket] 💳 Realtime wallet event received:", data);
        walletListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error("[RiderSocket] Error in wallet listener:", err);
          }
        });
      };

      const handleNotifEvent = (data: any) => {
        console.log("[RiderSocket] 🔔 Realtime notification received:", data);
        notificationListeners.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error("[RiderSocket] Error in notif listener:", err);
          }
        });
      };

      // Order Offer & Dispatch events
      socket.on("order.rider_offer", handleOffer);
      socket.on("new_order_offer", handleOffer);
      socket.on("order.offer", handleOffer);
      socket.on("dispatch.offer", handleOffer);

      // Rider status & online events
      socket.on("rider.status_changed", handleStatus);
      socket.on("rider.online_status", handleStatus);

      // Order Lifecycle events
      socket.on("order.rider_assigned", handleOrderEvent);
      socket.on("order.partner_accepted", handleOrderEvent);
      socket.on("order.pickup_otp_pending", handleOrderEvent);
      socket.on("order.picked_up", handleOrderEvent);
      socket.on("order.at_partner", handleOrderEvent);
      socket.on("order.processing", handleOrderEvent);
      socket.on("order.ready", handleOrderEvent);
      socket.on("order.dispatch_otp_pending", handleOrderEvent);
      socket.on("order.out_for_delivery", handleOrderEvent);
      socket.on("order.delivery_otp_pending", handleOrderEvent);
      socket.on("order.delivered", handleOrderEvent);
      socket.on("order.completed", handleOrderEvent);
      socket.on("order.cancelled", handleOrderEvent);

      // Wallet events
      socket.on("wallet.updated", handleWalletEvent);

      // Notification events
      socket.on("admin_broadcast", handleNotifEvent);
      socket.on("notification_created", handleNotifEvent);

      socket.on("disconnect", (reason) => {
        console.log("[RiderSocket] Disconnected from gateway:", reason);
      });
    } else if (!socket.connected) {
      socket.connect();
    }

    return socket;
  } catch (err) {
    console.warn("[RiderSocket] Failed to initialize socket client:", err);
    return null;
  }
}

export function subscribeRiderOffers(callback: (offer: any) => void): () => void {
  offerListeners.add(callback);
  initRiderSocket();

  return () => {
    offerListeners.delete(callback);
  };
}

export function subscribeRiderStatus(callback: (status: any) => void): () => void {
  statusListeners.add(callback);
  initRiderSocket();

  return () => {
    statusListeners.delete(callback);
  };
}

export function subscribeRiderOrders(callback: (order: any) => void): () => void {
  orderListeners.add(callback);
  initRiderSocket();

  return () => {
    orderListeners.delete(callback);
  };
}

export function subscribeRiderWallet(callback: (wallet: any) => void): () => void {
  walletListeners.add(callback);
  initRiderSocket();

  return () => {
    walletListeners.delete(callback);
  };
}

export function subscribeRiderNotifications(callback: (notif: any) => void): () => void {
  notificationListeners.add(callback);
  initRiderSocket();

  return () => {
    notificationListeners.delete(callback);
  };
}

export function emitRiderLocation(data: {
  lat: number;
  lng: number;
  orderId?: string;
  heading?: number;
  speed?: number;
}): void {
  const s = socket && socket.connected ? socket : initRiderSocket();
  if (!s) return;

  const session: any = readSession("rider") || readSession();
  const riderId =
    session?.["riderId"] ||
    session?.["account"]?.["riderId"] ||
    session?.["account"]?.["linkedId"] ||
    "";

  const payload = {
    riderId,
    orderId: data.orderId,
    coords: { lat: data.lat, lng: data.lng },
    lat: data.lat,
    lng: data.lng,
    latitude: data.lat,
    longitude: data.lng,
    heading: data.heading,
    speed: data.speed,
  };

  s.emit("update_location", payload);
  s.emit("captain_location_update", payload);
}

