// Rider dashboard data layer — backed by the shared mock/live backend.
import { apiGetJson, apiPostJson } from "../core/transport";
import type { RiderDashboard, RiderProfile } from "@/shared/types/rider";

type RawDashboard = {
  assigned: number;
  active: number;
  completedToday: number;
  earningsToday: number;
};

export async function fetchRiderDashboard(): Promise<RiderDashboard> {
  const [dashboard, profile] = await Promise.all([
    apiGetJson<RawDashboard>("/api/rider/dashboard"),
    apiGetJson<RiderProfile>("/api/rider/profile"),
  ]);

  return {
    riderName: profile.fullName,
    isOnline: (profile as RiderProfile & { isOnline?: boolean }).isOnline ?? true,
    todayDeliveries: dashboard.completedToday,
    todayEarnings: dashboard.earningsToday,
    pendingPickups: dashboard.assigned,
    pendingDeliveries: dashboard.active,
    completedDeliveries: dashboard.completedToday,
    rating: profile.rating,
    onlineMinutes: (profile as RiderProfile & { onlineMinutes?: number }).onlineMinutes ?? 0,
  };
}

export async function updateRiderStatus(isOnline: boolean) {
  return apiPostJson<{ ok: true; isOnline: boolean }>("/api/rider/online", { isOnline });
}

export async function pushRiderLocation(
  lat: number,
  lng: number,
  extra?: { isMock?: boolean; heading?: number | null; speed?: number | null; accuracy?: number | null }
) {
  return apiPostJson<{ ok: true; lat: number; lng: number }>("/api/rider/location", {
    lat,
    lng,
    ...extra,
  });
}
