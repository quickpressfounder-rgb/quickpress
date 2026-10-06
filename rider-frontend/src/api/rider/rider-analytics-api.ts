// Rider Analytics API — Aggregated from live database and Supabase
import { apiGetJson } from "../core/transport";

export interface RiderAnalyticsBreakdown {
  baseFare: number;
  distancePay: number;
  surgeBonus: number;
  questBonus: number;
  tipAmount: number;
}

export interface RiderAnalyticsTrendPoint {
  date: string;
  label: string;
  earnings: number;
  orders: number;
  distanceKm: number;
}

export interface RiderAnalyticsSummary {
  period: "today" | "week" | "month" | "all";
  totalEarnings: number;
  tripsCompleted: number;
  tripsCancelled: number;
  completionRate: number;
  acceptanceRate: number;
  totalDistanceKm: number;
  avgDeliveryMinutes: number;
  customerRating: number;
  totalReviews: number;
  breakdown: RiderAnalyticsBreakdown;
  trends: RiderAnalyticsTrendPoint[];
}

/**
 * GET /api/rider/analytics/summary — Returns live performance and financial analytics
 */
export async function fetchRiderAnalyticsSummary(
  period: "today" | "week" | "month" | "all" = "today"
): Promise<RiderAnalyticsSummary> {
  const data = await apiGetJson<RiderAnalyticsSummary>(
    `/api/rider/analytics/summary?period=${period}`
  );
  return data;
}
