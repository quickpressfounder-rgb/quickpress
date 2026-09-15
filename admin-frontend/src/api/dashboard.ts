/** GET /api/admin/dashboard/* — real dashboard KPIs and derived views from shared backend. */
import { apiGetJson } from "@/api/core/transport";

import { table, type Kpi, type SeriesPoint, type TableData } from "./client";

export type StatusBreakdown = { status: string; label: string; count: number };

export type TopServiceItem = { service: string; orders: number; revenue: number };

export type TopPartnerItem = {
  id: string;
  name: string;
  city: string;
  orders: number;
  revenue: number;
  rating: number;
  status: string;
};

export type AttentionAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  count: number;
  actionText: string;
  actionRoute: string;
  filterParam?: string;
};

export type TwoRideSection = {
  label: string;
  searching: number;
  offerSent: number;
  assigned: number;
  timeout: number;
  rejected: number;
  noRider: number;
};

export type TwoRideStatus = {
  ride1: TwoRideSection;
  ride2: TwoRideSection;
};

export type PipelineStage = {
  id: string;
  label: string;
  count: number;
  status: string;
};

export type RevenueSnapshot = {
  grossRevenue: number;
  platformCommission: number;
  partnerEarnings: number;
  riderEarnings: number;
  refunds: number;
  pendingSettlement: number;
};

export type FleetStatus = {
  total: number;
  online: number;
  available: number;
  busy: number;
  offline: number;
};

export type PartnerStatus = {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  inactive: number;
};

export type TopRiderItem = {
  id: string;
  name: string;
  deliveries: number;
  onTimeRate: string;
  rating: number;
};

export type CityPerformanceItem = {
  city: string;
  orders: number;
  revenue: number;
  activeRiders: number;
  activePartners: number;
  delayedOrders: number;
};

export type BackendDashboardSummary = {
  totalOrders: number;
  todayOrders: number;
  liveOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  delayedOrders: number;
  ordersTrend?: { value: number; changePct: number; positive: boolean };

  revenue: number;
  todayRevenue: number;
  platformCommission: number;
  pendingPayoutAmount: number;
  totalCustomers: number;
  activeCustomers: number;
  revenueTrend?: { value: number; changePct: number; positive: boolean };

  activePartners: number;
  totalPartners: number;
  pendingPartners: number;
  onlineRiders: number;
  availableRiders: number;
  busyRiders: number;
  totalRiders: number;
  criticalAlertsCount: number;

  attentionAlerts: AttentionAlert[];
  liveOperations: Record<string, number>;
  twoRideStatus: TwoRideStatus;
  pipeline: PipelineStage[];
  revenueSnapshot: RevenueSnapshot;
  fleetStatus: FleetStatus;
  partnerStatus: PartnerStatus;
  topPartners: TopPartnerItem[];
  topRiders: TopRiderItem[];
  cityBreakdown: CityPerformanceItem[];

  weeklyRevenue?: number;
  monthlyRevenue?: number;
  platformEarnings?: number;
  pendingPayouts?: number;
  unassignedOrders?: number;
  slaDelayedOrders?: number;
  topServices?: TopServiceItem[];
  statusBreakdown?: StatusBreakdown[];
};

export type GlobalSearchResult = {
  ok: boolean;
  query: string;
  total: number;
  results: {
    orders: Array<{ id: string; code: string; customer: string; phone: string; status: string; amount: number }>;
    customers: Array<{ id: string; name: string; phone: string; email: string; role: string }>;
    partners: Array<{ id: string; name: string; phone: string; city: string; status: string }>;
    riders: Array<{ id: string; name: string; phone: string; vehicle: string; isOnline: boolean }>;
  };
};

export async function fetchDashboardSummary(filters?: {
  date?: string;
  city?: string;
  service?: string;
}): Promise<BackendDashboardSummary> {
  const params = new URLSearchParams();
  if (filters?.date) params.set("date", filters.date);
  if (filters?.city && filters.city !== "all") params.set("city", filters.city);
  if (filters?.service && filters.service !== "all") params.set("service", filters.service);
  const qs = params.toString();
  return apiGetJson<BackendDashboardSummary>(`/api/admin/dashboard${qs ? `?${qs}` : ""}`);
}

export async function searchGlobal(q: string): Promise<GlobalSearchResult> {
  return apiGetJson<GlobalSearchResult>(`/api/admin/search?q=${encodeURIComponent(q)}`);
}

/** Legacy KPI format helper for widgets */
export async function fetchDashboardKpis(): Promise<Kpi[]> {
  const stats = await fetchDashboardSummary();
  const completion = stats.totalOrders
    ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100)
    : 0;

  return [
    { id: "today-orders", label: "Today's Orders", value: count(stats.todayOrders), hint: `${count(stats.totalOrders)} Total Lifetime`, positive: true },
    { id: "active-orders", label: "Active In-Flight", value: count(stats.liveOrders), hint: `${count(stats.unassignedOrders)} Unassigned`, positive: true },
    { id: "today-revenue", label: "Today's Revenue", value: `₹${count(stats.todayRevenue)}`, hint: `₹${count(stats.revenue)} Lifetime`, positive: true },
    { id: "platform-earnings", label: "Platform Earnings (18%)", value: `₹${count(stats.platformEarnings)}`, hint: "Net Commission", positive: true },
    { id: "pending-partners", label: "Pending Partners", value: count(stats.pendingPartners), hint: `${count(stats.activePartners)} Active Stores`, positive: stats.pendingPartners === 0 },
    { id: "online-riders", label: "Online Riders", value: `${count(stats.onlineRiders)} / ${count(stats.riders)}`, hint: `${count(stats.busyRiders)} On Delivery`, positive: true },
    { id: "active-customers", label: "Active Customers", value: count(stats.activeCustomers), hint: `${count(stats.customers)} Total Registered`, positive: true },
    { id: "pending-payouts", label: "Pending Payouts", value: `₹${count(stats.pendingPayoutAmount)}`, hint: `${count(stats.pendingPayouts)} Requests`, positive: stats.pendingPayouts === 0 },
  ];
}

/** GET /api/admin/dashboard/revenue-series */
export async function fetchRevenueSeries(): Promise<SeriesPoint[]> {
  const points = await apiGetJson<BackendSeriesPoint[]>("/api/admin/dashboard/revenue-series");
  return points.map((point) => (point.secondary === undefined ? { label: point.label, value: point.value } : { label: point.label, value: point.value, secondary: point.secondary }));
}

/** GET /api/admin/dashboard/orders-series */
export async function fetchOrdersSeries(): Promise<SeriesPoint[]> {
  const points = await apiGetJson<BackendSeriesPoint[]>("/api/admin/dashboard/orders-series");
  return points.map((point) => (point.secondary === undefined ? { label: point.label, value: point.value } : { label: point.label, value: point.value, secondary: point.secondary }));
}

/** GET /api/admin/dashboard/activity */
export async function fetchRecentActivity(): Promise<BackendActivity[]> {
  return apiGetJson<BackendActivity[]>("/api/admin/dashboard/activity");
}

/** GET /api/admin/dashboard/latest-orders */
export async function fetchLatestOrders(): Promise<TableData> {
  const rows = await apiGetJson<BackendLatestOrderRow[]>("/api/admin/dashboard/latest-orders");
  return table(
    [
      { key: "id", label: "Order" },
      { key: "customer", label: "Customer" },
      { key: "partner", label: "Partner" },
      { key: "rider", label: "Rider" },
      { key: "status", label: "Status" },
      { key: "amount", label: "Amount", className: "text-right" },
    ],
    rows.map((row) => ({
      id: row.code || row.id,
      customer: row.customer || "Customer",
      partner: row.partner || "Store",
      rider: row.rider || "Unassigned",
      status: row.statusLabel || row.status,
      amount: `₹${Number(row.amount || 0).toLocaleString("en-IN")}`,
    })),
  );
}

export type SystemHealthService = {

  name: string;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  metric: string;
  icon: string;
};

export type SystemHealthData = {
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  timestamp: string;
  services: SystemHealthService[];
};

/** GET /api/admin/dashboard/system-health */
export async function fetchSystemHealth(): Promise<SystemHealthData> {
  return apiGetJson<SystemHealthData>("/api/admin/dashboard/system-health");
}

export type AutomationActivityItem = {
  id: string;
  automationType: string; // dispatch, otp, sla, finance, surge, notification, guard
  title: string;
  description: string;
  orderId?: string;
  orderCode?: string;
  actorId?: string;
  actorType?: string;
  severity: "info" | "success" | "warning" | "danger";
  durationMs?: number;
  metadata?: Record<string, any>;
  timestamp: string;
  createdAt: string;
};

export type AutomationStats = {
  totalEvents: number;
  successRate: number;
  activeEngines: number;
  status: string;
  counts: Record<string, number>;
  breakdown: {
    success: number;
    warning: number;
    danger: number;
  };
  timestamp: string;
};

/** GET /api/admin/automations/activity */
export async function fetchAutomationActivity(type?: string, severity?: string, limit = 50): Promise<AutomationActivityItem[]> {
  const params = new URLSearchParams();
  if (type && type !== "all") params.set("type", type);
  if (severity && severity !== "all") params.set("severity", severity);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return apiGetJson<AutomationActivityItem[]>(`/api/admin/automations/activity${qs ? `?${qs}` : ""}`);
}

/** GET /api/admin/automations/stats */
export async function fetchAutomationStats(): Promise<AutomationStats> {
  return apiGetJson<AutomationStats>("/api/admin/automations/stats");
}

/** POST /api/admin/automations/trigger */
export async function triggerAutomation(payload: { engine: string; orderId?: string; leg?: string; city?: string }): Promise<any> {
  return apiPostJson<any>("/api/admin/automations/trigger", payload);
}


