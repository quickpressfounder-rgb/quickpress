// Real rider performance metrics — derived only from live backend records.
// Sources: GET /api/rider/dashboard and GET /api/rider/history.
// No metric here is fabricated: anything the backend does not expose
// (acceptance rate, on-time %, streaks, safety flags) is simply omitted.
import { fetchRiderDashboard } from "@/api/rider/rider-dashboard-api";
import { fetchRiderHistory } from "@/api/rider/rider-orders-api";
import type { RiderHistoryEntry } from "@/shared/types/rider";

import type { PerformanceStat } from "./rider-history-mock";

export type RiderPerformanceData = {
  stats: PerformanceStat[];
};

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function loadRiderPerformance(): Promise<RiderPerformanceData> {
  const [dashboard, history] = await Promise.all([
    fetchRiderDashboard(),
    fetchRiderHistory().catch(() => [] as RiderHistoryEntry[]),
  ]);

  const stats: PerformanceStat[] = [];

  stats.push({
    id: "total",
    label: "Completed Deliveries",
    value: dashboard.completedDeliveries,
    hint: "Lifetime, from your delivery record",
    tone: "primary",
  });

  if (dashboard.rating > 0) {
    stats.push({
      id: "rating",
      label: "Average Rating",
      value: dashboard.rating,
      decimals: 1,
      suffix: " ",
      hint: "Reported by the backend",
      tone: "primary",
    });
  }

  if (history.length > 0) {
    const completed = history.filter((row) => row.outcome === "completed").length;
    stats.push({
      id: "completion",
      label: "Completion Rate",
      value: round((completed / history.length) * 100, 1),
      suffix: "%",
      decimals: 1,
      hint: `${completed} of ${history.length} recorded jobs`,
      tone: "green",
    });

    const distance = history.reduce((sum, row) => sum + (row.distanceKm || 0), 0);
    if (distance > 0) {
      stats.push({
        id: "distance",
        label: "Total Distance",
        value: round(distance, 1),
        suffix: " km",
        decimals: 1,
        hint: "Sum of your recorded deliveries",
        tone: "muted",
      });
    }
  }

  if (dashboard.onlineMinutes > 0) {
    stats.push({
      id: "hours",
      label: "Online Hours",
      value: round(dashboard.onlineMinutes / 60, 1),
      suffix: " hrs",
      decimals: 1,
      hint: "Today",
      tone: "muted",
    });
  }

  return { stats };
}
