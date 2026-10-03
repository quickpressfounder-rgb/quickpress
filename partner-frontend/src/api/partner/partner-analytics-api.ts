import { apiGetJson } from "../core/transport";

export type TopServiceStat = {
  name: string;
  count: number;
  revenue: number;
  sharePercent?: number;
};

export type CategoryStat = {
  category: string;
  count: number;
  revenue: number;
  percentage: number;
  color?: string;
};

export type HourlySlotStat = {
  slot: string;
  count: number;
  percentage: number;
};

export type PartnerAnalyticsData = {
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalEarnings: number;
  avgOrderValue: number;
  fulfillmentRate: number;
  avgTurnaroundHours: number;
  totalGarments: number;
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  expressOrders: number;
  standardOrders: number;
  expressSharePct: number;
  paymentOnline: number;
  paymentCod: number;
  trendLabels: string[];
  ordersTrend: number[];
  revenueTrend: number[];
  earningsTrend?: number[];
  topServices: TopServiceStat[];
  categories?: CategoryStat[];
  hourlySlots?: HourlySlotStat[];
  stageFunnel?: Record<string, number>;
};

export async function fetchPartnerAnalytics(period: string = "7d"): Promise<PartnerAnalyticsData> {
  return apiGetJson<PartnerAnalyticsData>(`/api/partner/analytics?period=${encodeURIComponent(period)}`);
}
