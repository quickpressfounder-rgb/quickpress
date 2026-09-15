// Partner profile / settings / notifications data layer — backed by the shared mock/live backend.
import { apiGetJson, apiPostJson, apiRequest } from "../core/transport";
import type { BusinessSettings, PartnerNotification, PartnerProfile } from "@/shared/types/partner";

type RawNotification = {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  kind: string;
};

const NOTIFICATION_KIND: Record<string, PartnerNotification["kind"]> = {
  "partner-accepted": "order",
  "pickup-scheduled": "order",
  "pickup-completed": "order",
  processing: "order",
  "out-for-delivery": "order",
  delivered: "order",
  wallet: "payout",
  cashback: "promo",
  offer: "promo",
};

function toPartnerNotification(item: RawNotification): PartnerNotification {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    time: item.date,
    read: item.read,
    kind: NOTIFICATION_KIND[item.kind] ?? "alert",
  };
}

let memoryProfileCache: PartnerProfile | null = null;
let inFlightProfilePromise: Promise<PartnerProfile> | null = null;

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
  await apiRequest<BusinessSettings>("PUT", "/api/partner/settings", { body: patch });
  return { ok: true as const, patch };
}

export async function fetchPartnerNotifications(): Promise<PartnerNotification[]> {
  const items = await apiGetJson<RawNotification[]>("/api/partner/notifications");
  return items.map(toPartnerNotification);
}

export async function markNotificationsRead() {
  return apiPostJson<{ ok: true }>("/api/notifications/read-all");
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

export async function toggleStoreStatus(isOnline: boolean): Promise<PartnerProfile> {
  return apiRequest<PartnerProfile>("PATCH", "/api/partner/store/status", { body: { isOnline } });
}

export async function requestPartnerWithdraw(amount: number): Promise<{ balance: number }> {
  return apiPostJson<{ balance: number }>("/api/partner/withdraw", { amount });
}
