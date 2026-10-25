// Partner profile / settings / notifications data layer — backed by the shared mock/live backend.
import { apiGetJson, apiPostJson, apiRequest } from "../core/transport";
import type { BusinessSettings, PartnerNotification, PartnerProfile } from "@/shared/types/partner";

export type RawNotification = {
  id?: string;
  _id?: string;
  title?: string;
  body?: string;
  description?: string;
  message?: string;
  date?: string;
  createdAt?: string;
  created_at?: string;
  read?: boolean;
  kind?: string;
  category?: string;
  orderId?: string;
  order_id?: string;
  orderCode?: string;
  order_code?: string;
};

const NOTIFICATION_KIND_MAP: Record<string, PartnerNotification["kind"]> = {
  order: "order",
  "order-new": "order",
  "order-cancelled": "order",
  "partner-accepted": "order",
  "pickup-scheduled": "order",
  "pickup-completed": "order",
  processing: "order",
  "out-for-delivery": "order",
  delivered: "order",
  "rider-assigned": "order",
  payout: "payout",
  wallet: "payout",
  settlement: "payout",
  withdrawal: "payout",
  bank_transfer: "payout",
  cashback: "promo",
  promo: "promo",
  promotion: "promo",
  offer: "promo",
  coupon: "promo",
  broadcast: "promo",
  campaign: "promo",
  alert: "alert",
  urgent: "alert",
  system: "alert",
  operational: "alert",
};

export function toPartnerNotification(item: RawNotification): PartnerNotification {
  const rawKind = String(item.kind || "").toLowerCase().trim();
  const rawCat = String(item.category || "").toLowerCase().trim();
  const title = String(item.title || "").toLowerCase();

  let resolvedKind: PartnerNotification["kind"] = "alert";
  if (NOTIFICATION_KIND_MAP[rawKind]) {
    resolvedKind = NOTIFICATION_KIND_MAP[rawKind];
  } else if (
    rawCat === "order" ||
    title.includes("order") ||
    title.includes("cloth") ||
    title.includes("garment") ||
    title.includes("pickup")
  ) {
    resolvedKind = "order";
  } else if (
    rawCat === "wallet" ||
    rawCat === "payment" ||
    title.includes("payout") ||
    title.includes("settl") ||
    title.includes("bank") ||
    title.includes("withdraw") ||
    title.includes("earning")
  ) {
    resolvedKind = "payout";
  } else if (
    rawCat === "promotional" ||
    rawCat === "promo" ||
    rawCat === "offer" ||
    title.includes("offer") ||
    title.includes("discount") ||
    title.includes("deal") ||
    title.includes("voucher")
  ) {
    resolvedKind = "promo";
  }

  return {
    id: String(item.id || item._id || `notif-${Math.random().toString(36).substring(2, 9)}`),
    title: item.title || "Notification",
    body: item.body || item.description || item.message || "",
    time: item.date || item.createdAt || item.created_at || new Date().toISOString(),
    read: Boolean(item.read),
    kind: resolvedKind,
    orderId: item.orderId || item.order_id,
    orderCode: item.orderCode || item.order_code,
    category: item.category,
  };
}

let memoryProfileCache: PartnerProfile | null = null;
let inFlightProfilePromise: Promise<PartnerProfile> | null = null;

export function isPhoneNumber(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = String(val).trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  return (/^[+\d\s\-()]+$/.test(trimmed) && digitsOnly.length >= 10) || trimmed.startsWith("+");
}

export function getCleanPartnerName(
  candidates: (string | null | undefined)[],
  fallback = "QuickPress Partner"
): string {
  // First pass: Find explicit store/owner name that is not a placeholder or phone number
  for (const c of candidates) {
    if (c && typeof c === "string") {
      const trimmed = c.trim();
      if (
        trimmed &&
        !isPhoneNumber(trimmed) &&
        trimmed.toLowerCase() !== "null" &&
        trimmed.toLowerCase() !== "undefined" &&
        trimmed.toLowerCase() !== "merchant store" &&
        trimmed.toLowerCase() !== "quickpress partner" &&
        trimmed.toLowerCase() !== "quickpress store" &&
        trimmed.toLowerCase() !== "partner"
      ) {
        return trimmed;
      }
    }
  }
  // Second pass: Any non-phone non-empty string
  for (const c of candidates) {
    if (c && typeof c === "string") {
      const trimmed = c.trim();
      if (
        trimmed &&
        !isPhoneNumber(trimmed) &&
        trimmed.toLowerCase() !== "null" &&
        trimmed.toLowerCase() !== "undefined"
      ) {
        return trimmed;
      }
    }
  }
  return fallback;
}

export function getCachedPartnerProfile(): PartnerProfile | null {
  if (memoryProfileCache) return memoryProfileCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("qp.partner.profile_cache");
    if (raw) {
      memoryProfileCache = JSON.parse(raw);
      return memoryProfileCache;
    }
  } catch {}
  return null;
}

export function setCachedPartnerProfile(profile: PartnerProfile) {
  memoryProfileCache = profile;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("qp.partner.profile_cache", JSON.stringify(profile));
    } catch {}
  }
}

export async function fetchPartnerProfile(): Promise<PartnerProfile> {
  if (inFlightProfilePromise) return inFlightProfilePromise;
  inFlightProfilePromise = apiGetJson<PartnerProfile>("/api/partner/profile")
    .then((res) => {
      setCachedPartnerProfile(res);
      return res;
    })
    .finally(() => {
      inFlightProfilePromise = null;
    });
  return inFlightProfilePromise;
}

export async function fetchBusinessSettings(): Promise<BusinessSettings> {
  return apiGetJson<BusinessSettings>("/api/partner/settings");
}

export async function updateBusinessSettings(patch: Partial<BusinessSettings>) {
  const settings = await apiRequest<BusinessSettings>("PUT", "/api/partner/settings", { body: patch });
  return { ok: true as const, patch, settings };
}

export async function fetchPartnerNotifications(): Promise<PartnerNotification[]> {
  try {
    const raw = await apiGetJson<any>("/api/partner/notifications");
    let arr: any[] = [];
    if (Array.isArray(raw)) {
      arr = raw;
    } else if (raw && Array.isArray(raw.items)) {
      arr = raw.items;
    } else if (raw && Array.isArray(raw.notifications)) {
      arr = raw.notifications;
    } else if (raw && Array.isArray(raw.data)) {
      arr = raw.data;
    }
    return arr.map(toPartnerNotification);
  } catch (err) {
    console.warn("Failed to fetch partner notifications from /api/partner/notifications, falling back to /api/notifications:", err);
    try {
      const resp = await apiGetJson<any>("/api/notifications");
      let arr: any[] = [];
      if (Array.isArray(resp)) {
        arr = resp;
      } else if (resp && Array.isArray(resp.items)) {
        arr = resp.items;
      } else if (resp && Array.isArray(resp.notifications)) {
        arr = resp.notifications;
      }
      return arr.map(toPartnerNotification);
    } catch {
      return [];
    }
  }
}

export async function fetchPartnerUnreadCount(): Promise<number> {
  try {
    const res = await apiGetJson<{ count: number }>("/api/partner/notifications/unread-count");
    return typeof res?.count === "number" ? res.count : 0;
  } catch {
    try {
      const res = await apiGetJson<{ count: number }>("/api/notifications/unread-count");
      return typeof res?.count === "number" ? res.count : 0;
    } catch {
      return 0;
    }
  }
}

export async function markNotificationsRead() {
  try {
    return await apiPostJson<{ ok: boolean }>("/api/partner/notifications/read-all");
  } catch {
    return await apiPostJson<{ ok: boolean }>("/api/notifications/read-all");
  }
}

export async function markSingleNotificationRead(id: string) {
  try {
    return await apiPostJson<{ ok: boolean }>(`/api/partner/notifications/${id}/read`);
  } catch {
    return await apiPostJson<{ ok: boolean }>(`/api/notifications/${id}/read`);
  }
}

export async function updatePartnerProfile(
  patch: Partial<PartnerProfile>,
) {
  const profile = await apiRequest<PartnerProfile>("PUT", "/api/partner/profile", { body: patch });
  return { ok: true as const, profile };
}

export async function uploadPartnerLogo(image: string): Promise<{ url: string }> {
  return apiPostJson<{ url: string; field: string }>("/api/uploads/partner/logo", { image });
}

export async function uploadPartnerBanner(image: string): Promise<{ url: string }> {
  return apiPostJson<{ url: string; field: string }>("/api/uploads/partner/banner", { image });
}

export async function uploadPartnerGalleryPhoto(image: string): Promise<{ url: string }> {
  return apiPostJson<{ url: string; field: string }>("/api/uploads/partner/gallery", { image });
}

export async function toggleStoreStatus(isOnline: boolean, signal?: AbortSignal): Promise<PartnerProfile> {
  return apiRequest<PartnerProfile>("PATCH", "/api/partner/store/status", {
    body: { isOnline },
    timeoutMs: 25000,
    signal,
  });
}

export async function requestPartnerWithdraw(amount: number): Promise<{ balance: number }> {
  return apiPostJson<{ balance: number }>("/api/partner/withdraw", { amount });
}

export interface PartnerSessionItem {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface PartnerSessionsResponse {
  ok: boolean;
  currentSession: PartnerSessionItem;
  sessions: PartnerSessionItem[];
  totalDevices: number;
}

export interface ClosePartnerAccountPayload {
  pan: string;
  dob: string;
  reason?: string;
}

export async function closePartnerAccount(data: ClosePartnerAccountPayload): Promise<{ ok: boolean; message: string }> {
  return apiPostJson<{ ok: boolean; message: string }>("/api/partner/account/close", data);
}

export async function fetchPartnerSecuritySessions(): Promise<PartnerSessionsResponse> {
  return apiGetJson<PartnerSessionsResponse>("/api/partner/security/sessions");
}

export async function revokeOtherPartnerSessions(): Promise<{ ok: boolean; revokedCount: number; message: string }> {
  return apiPostJson<{ ok: boolean; revokedCount: number; message: string }>("/api/partner/security/revoke-others");
}

export async function fetchPartnerLockSettings(): Promise<{ ok: boolean; counterLockMinutes: number }> {
  return apiGetJson<{ ok: boolean; counterLockMinutes: number }>("/api/partner/security/counter-lock");
}

export async function updatePartnerLockSettings(counterLockMinutes: number): Promise<{ ok: boolean; counterLockMinutes: number; message: string }> {
  return apiPostJson<{ ok: boolean; counterLockMinutes: number; message: string }>("/api/partner/security/counter-lock", { counterLockMinutes });
}

