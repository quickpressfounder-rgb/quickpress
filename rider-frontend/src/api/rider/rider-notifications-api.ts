// Rider notifications data layer — backed by FastAPI and MongoDB.
import { apiGetJson, apiPostJson } from "../core/transport";
import type { RiderNotification, RiderNotificationKind } from "@/shared/types/rider";

export type RawNotification = {
  id?: string;
  _id?: string;
  title: string;
  message?: string;
  description?: string;
  body?: string;
  date?: string;
  time?: string;
  read?: boolean;
  kind?: string;
  orderId?: string;
};

const KIND_MAP: Record<string, RiderNotificationKind> = {
  order: "new-order",
  "new-order": "new-order",
  "partner-accepted": "new-order",
  "pickup-scheduled": "pickup-reminder",
  "pickup-reminder": "pickup-reminder",
  "pickup-completed": "delivery-reminder",
  "delivery-reminder": "delivery-reminder",
  processing: "delivery-reminder",
  "out-for-delivery": "delivery-reminder",
  delivered: "system",
  payment: "payment",
  wallet: "payment",
  cashback: "payment",
  system: "system",
  offer: "system",
};

export async function fetchRiderNotifications(): Promise<RiderNotification[]> {
  try {
    const items = await apiGetJson<RawNotification[]>("/api/rider/notifications");
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      id: item.id || item._id || String(Math.random()),
      kind: KIND_MAP[item.kind ?? "system"] ?? "system",
      title: item.title,
      body: item.message || item.description || item.body || "",
      time: item.time || (item.date ? new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"),
      unread: !item.read,
      orderId: item.orderId,
    }));
  } catch (error) {
    console.warn("[rider-notifications-api] Failed to fetch notifications:", error);
    return [];
  }
}

export async function fetchUnreadCount(): Promise<number> {
  try {
    const res = await apiGetJson<{ ok: boolean; count: number }>("/api/rider/notifications/unread-count");
    return typeof res?.count === "number" ? res.count : 0;
  } catch {
    return 0;
  }
}

export async function markRiderNotificationRead(notificationId: string): Promise<void> {
  try {
    await apiPostJson(`/api/rider/notifications/${encodeURIComponent(notificationId)}/read`);
  } catch (err) {
    console.warn("[rider-notifications-api] Failed to mark read:", err);
  }
}

export async function markAllRiderNotificationsRead(): Promise<void> {
  try {
    await apiPostJson("/api/rider/notifications/read-all");
  } catch (err) {
    console.warn("[rider-notifications-api] Failed to mark all read:", err);
  }
}

export async function sendTestNotification(title?: string, message?: string): Promise<void> {
  await apiPostJson("/api/rider/notifications/test", {
    title: title || "QuickPress Captain Dispatch Notice",
    message: message || "High-priority Captain Notification Pipeline connected & operational.",
    kind: "order",
  });
}
