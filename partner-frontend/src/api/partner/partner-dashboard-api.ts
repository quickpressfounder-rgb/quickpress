/**
 * Partner dashboard summary — backed by the shared mock/live backend.
 */
import { apiGetJson, apiRequest } from "../core/transport";
import type { BusinessSettings } from "@/shared/types/partner";
import { fetchPartnerProfile } from "./partner-profile-api";

export type DashboardSummary = {
  todayEarnings: number;
  newOrders: number;
  inProcess: number;
  readyForDelivery: number;
  completedToday: number;
  rating: number;
  onTimeRate: number;
  isStoreOpen: boolean;
  capacityUsedPct: number;
};

type RawDashboard = {
  newOrders: number;
  inProgress: number;
  readyForDelivery: number;
  delivered: number;
  earningsToday: number;
};

let memorySummaryCache: DashboardSummary | null = null;
let inFlightSummaryPromise: Promise<DashboardSummary> | null = null;

export function getCachedDashboardSummary(): DashboardSummary | null {
  if (memorySummaryCache) return memorySummaryCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("qp.partner.dashboard_summary_cache");
    if (raw) {
      memorySummaryCache = JSON.parse(raw);
      return memorySummaryCache;
    }
  } catch {}
  return null;
}

export function setCachedDashboardSummary(summary: DashboardSummary) {
  memorySummaryCache = summary;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("qp.partner.dashboard_summary_cache", JSON.stringify(summary));
    } catch {}
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  if (inFlightSummaryPromise) return inFlightSummaryPromise;
  inFlightSummaryPromise = (async () => {
    const [dashboard, profile, settings] = await Promise.all([
      apiGetJson<RawDashboard>("/api/partner/dashboard"),
      fetchPartnerProfile(),
      apiGetJson<BusinessSettings>("/api/partner/settings"),
    ]);

    const capacityUsedPct = settings.dailyOrderCap
      ? Math.min(100, Math.round((dashboard.inProgress / settings.dailyOrderCap) * 100))
      : 0;

    const result: DashboardSummary = {
      todayEarnings: dashboard.earningsToday,
      newOrders: dashboard.newOrders,
      inProcess: dashboard.inProgress,
      readyForDelivery: dashboard.readyForDelivery,
      completedToday: dashboard.delivered,
      rating: profile.rating,
      onTimeRate: profile.onTimeRate,
      isStoreOpen: settings.isStoreOpen,
      capacityUsedPct,
    };
    setCachedDashboardSummary(result);
    return result;
  })().finally(() => {
    inFlightSummaryPromise = null;
  });

  return inFlightSummaryPromise;
}

export async function setStoreOpen(isOpen: boolean) {
  const { toggleStoreStatus } = await import("./partner-profile-api");
  await Promise.all([
    apiRequest<BusinessSettings>("PUT", "/api/partner/settings", { body: { isStoreOpen: isOpen, acceptingNewOrders: isOpen } }),
    toggleStoreStatus(isOpen).catch(() => null),
  ]);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("qp.partner.isOnline", isOpen ? "1" : "0");
      window.dispatchEvent(new CustomEvent("qp:partner-status-updated", { detail: { isOnline: isOpen } }));
    } catch {}
  }
  return { ok: true as const, isOpen };
}
