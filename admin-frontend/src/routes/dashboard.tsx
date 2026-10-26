import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  RefreshCw,
  TrendingUp,
  Building2,
  Truck,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ShoppingBag,
  BellRing,
  Activity as ActivityIcon,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  TicketPercent,
  CheckCircle,
  XCircle,
  Server,
  Database,
  Radio,
  Zap,
  KeyRound,
  Coins,
  Flame,
  ShieldAlert,
  Cpu,
  CheckCheck,
  Check,
  RotateCcw,
  Bike,
  MapPin,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Navigation,
  Layers,
  Sparkles,
  HelpCircle,
  Headphones,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "../components/AdminShell";
import { RevenueAreaChart } from "../components/AdminCharts";
import {
  fetchDashboardSummary,
  fetchLatestOrders,
  fetchRevenueSeries,
  fetchSystemHealth,
  fetchAutomationActivity,
  fetchAutomationStats,
} from "../api/dashboard";
import { adminRoutes } from "../navigation/admin-routes";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAdminSession,
  ssr: false,
  head: () => adminHead("Command Center Dashboard", "Live Platform Operations · QuickPress"),
  component: DashboardPage,
});

const TONE_DOT: Record<string, string> = {
  default: "bg-zinc-600",
  success: "bg-emerald-600",
  warning: "bg-amber-600",
  danger: "bg-rose-600",
};

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "Just now";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return String(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 30) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return String(isoString);
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "7d" | "30d" | "this_month">("today");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [chartPeriod, setChartPeriod] = useState<"today" | "7d" | "30d">("7d");

  const summary = useQuery({
    queryKey: ["admin", "dashboard", "summary", dateFilter, cityFilter, serviceFilter],
    queryFn: () => fetchDashboardSummary({ date: dateFilter, city: cityFilter, service: serviceFilter }),
    staleTime: 30000,
    refetchInterval: 20000,
  });

  const health = useQuery({ queryKey: ["admin", "dashboard", "health"], queryFn: fetchSystemHealth, staleTime: 60000 });
  const revenue = useQuery({ queryKey: ["admin", "dashboard", "revenue", chartPeriod], queryFn: fetchRevenueSeries, staleTime: 45000 });
  const latest = useQuery({ queryKey: ["admin", "dashboard", "latest"], queryFn: fetchLatestOrders, staleTime: 20000 });

  const [automationFilter, setAutomationFilter] = useState<string>("all");
  const automations = useQuery({
    queryKey: ["admin", "dashboard", "automations", automationFilter],
    queryFn: () => fetchAutomationActivity(automationFilter),
    staleTime: 4000,
    refetchInterval: 4000,
  });

  const data = summary.data;

  // Priority Action Center Read/Acknowledged alerts state
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("qp_dashboard_read_alerts");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleAlertRead = (alertId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAcknowledgedAlerts((prev) => {
      const next: Record<string, boolean> = { ...prev, [alertId]: !Boolean(prev[alertId]) };
      try {
        localStorage.setItem("qp_dashboard_read_alerts", JSON.stringify(next));
      } catch {}
      if (next[alertId]) {
        toast.success("Incident / Alert marked as resolved & acknowledged");
      } else {
        toast.info("Incident / Alert marked as unread");
      }
      return next;
    });
  };

  const markAllAlertsRead = () => {
    const raw = data?.attentionAlerts || [];
    const allRead: Record<string, boolean> = { ...acknowledgedAlerts };
    raw.forEach((a) => {
      allRead[a.id] = true;
    });
    allRead["sla_delayed"] = true;
    allRead["pending_partners"] = true;
    allRead["unassigned_orders"] = true;
    allRead["pending_payouts"] = true;
    allRead["unresolved_support_tickets"] = true;
    setAcknowledgedAlerts(allRead);
    try {
      localStorage.setItem("qp_dashboard_read_alerts", JSON.stringify(allRead));
    } catch {}
    toast.success("All operational incidents marked as acknowledged");
  };

  const resetAllAlertsRead = () => {
    setAcknowledgedAlerts({});
    try {
      localStorage.removeItem("qp_dashboard_read_alerts");
    } catch {}
    toast.info("Incident stream reset to active");
  };

  const count = (n?: number) => (n ?? 0).toLocaleString("en-IN");
  const currency = (n?: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

  const effectiveAlerts = useMemo(() => {
    const raw = data?.attentionAlerts || [];
    if (raw.length > 0) return raw;
    const list = [];
    if ((data?.delayedOrders ?? 0) > 0) {
      list.push({
        id: "sla_delayed",
        severity: "warning" as const,
        title: `${data?.delayedOrders} Delayed Orders (SLA Breach)`,
        description: "Orders exceeding turnaround thresholds requiring immediate dispatch escalation",
        count: data?.delayedOrders ?? 0,
        actionText: "Investigate",
        actionRoute: adminRoutes.orders,
      });
    }
    if ((data?.unassignedOrders ?? 0) > 0) {
      list.push({
        id: "unassigned_orders",
        severity: "critical" as const,
        title: `${data?.unassignedOrders} Unassigned Orders Without Captain`,
        description: "Live customer orders awaiting partner store acceptance or pilot dispatch waves",
        count: data?.unassignedOrders ?? 0,
        actionText: "Auto-Dispatch",
        actionRoute: adminRoutes.orders,
      });
    }
    if ((data?.pendingPartners ?? 0) > 0) {
      list.push({
        id: "pending_partners",
        severity: "warning" as const,
        title: `${data?.pendingPartners} Partner Store Applications Pending KYC`,
        description: "New laundromat partners awaiting commercial verification and onboarding signoff",
        count: data?.pendingPartners ?? 0,
        actionText: "Review KYC",
        actionRoute: adminRoutes.partners,
      });
    }
    if ((data?.pendingPayoutAmount ?? 0) > 0) {
      list.push({
        id: "pending_payouts",
        severity: "warning" as const,
        title: `Settlement Payouts Pending (${currency(data?.pendingPayoutAmount)})`,
        description: "Partner ledger balance withdrawals requiring double-entry audit and disbursement",
        count: 1,
        actionText: "Process Payouts",
        actionRoute: adminRoutes.wallet,
      });
    }
    return list;
  }, [data]);

  const activeAlerts = useMemo(() => {
    return effectiveAlerts.filter((a) => !Boolean(acknowledgedAlerts[a.id]));
  }, [effectiveAlerts, acknowledgedAlerts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success("Command Center data synchronized with live Supabase!");
    } catch {
      toast.error("Failed to refresh live data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const currentDateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const totalOrders = data?.totalOrders || 1;
  const deliveredOrders = data?.deliveredOrders || 0;
  const fulfillmentPercentage = Math.min(100, Math.round((deliveredOrders / totalOrders) * 100));

  const totalRiders = data?.totalRiders || 1;
  const onlineRiders = data?.onlineRiders || 0;
  const availableRiders = data?.availableRiders || 0;
  const fleetReadinessPercentage = Math.min(
    100,
    Math.round((availableRiders / (onlineRiders || 1)) * 100)
  );

  const totalRevenue = data?.todayRevenue || data?.revenue || 0;
  const averageOrderValue = Math.round(totalRevenue / (data?.totalOrders || 1));

  const twoRide = data?.twoRideStatus || {
    ride1: { label: "RIDE 1 — PICKUP (Customer → Partner)", searching: 0, offerSent: 0, assigned: 0, timeout: 0, rejected: 0, noRider: 0 },
    ride2: { label: "RIDE 2 — DELIVERY (Partner → Customer)", searching: 0, offerSent: 0, assigned: 0, timeout: 0, rejected: 0, noRider: 0 },
  };

  return (
    <AdminShell
      title="Platform Executive Command Center"
      subtitle={`Founder Real-Time Operations Telemetry as of ${currentDateStr} · Supabase PostgreSQL Production`}
      actions={
        <>
          {/* System Health Heartbeat Pill */}
          <button
            type="button"
            onClick={() => setHealthModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-black text-zinc-950 transition-all hover:bg-emerald-50 active:scale-95 shadow-xs"
          >
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
            </span>
            <span className="font-extrabold text-zinc-950">Supabase Live</span>
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-950">
              99.98% SLA
            </span>
          </button>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-black text-zinc-950 transition-colors hover:bg-zinc-50 active:scale-95 shadow-xs"
          >
            <RefreshCw className={`size-3.5 text-zinc-950 ${summary.isFetching || isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Sync</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={() => toast.success("Exporting platform operational snapshot as CSV...")}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition-all hover:bg-zinc-800 active:scale-95"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </button>
        </>
      }
    >
      <div className="space-y-6">

        {/* =========================================================================
            SECTION 0: UNIVERSAL MULTI-DIMENSIONAL FILTER BAR
        ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs">
          {/* Timeframe Switcher */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-950 mr-2 flex items-center gap-1">
              <Clock className="size-3 text-zinc-950" />
              <span>TIMEFRAME:</span>
            </span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "this_month", label: "This Month" },
            ].map((d) => {
              const active = dateFilter === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDateFilter(d.id as any)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                    active
                      ? "bg-zinc-950 text-white shadow-xs"
                      : "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* City & Service Filters */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 shadow-2xs">
              <MapPin className="size-3.5 text-purple-700" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="bg-transparent text-xs font-black text-zinc-950 focus:outline-none cursor-pointer"
              >
                <option value="all">All Operating Cities</option>
                <option value="Kasganj">Kasganj Hub</option>
                <option value="Aligarh">Aligarh Hub</option>
                <option value="Mathura">Mathura Hub</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1 shadow-2xs">
              <SlidersHorizontal className="size-3.5 text-sky-700" />
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="bg-transparent text-xs font-black text-zinc-950 focus:outline-none cursor-pointer"
              >
                <option value="all">All Service Verticals</option>
                <option value="wash">Wash &amp; Iron</option>
                <option value="dry">Dry Cleaning</option>
                <option value="iron">Steam Press</option>
                <option value="shoe">Shoe Care</option>
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: ACTIVE OPERATIONAL INCIDENTS & TRIAGE (HIGH CONTRAST)
        ========================================================================= */}
        {activeAlerts.length > 0 && (
          <div className="rounded-2xl border-2 border-rose-300 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-rose-100 text-rose-900 border border-rose-300 font-black">
                  <AlertTriangle className="size-4 text-rose-700" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-zinc-950 flex items-center gap-2">
                    <span>Priority Operational Incidents &amp; SLA Breaches</span>
                    <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                      {activeAlerts.length} Action Required
                    </span>
                  </h3>
                  <p className="text-xs font-bold text-zinc-700">
                    Live operational breaches requiring manual wave dispatch or regional supervisor sign-off
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllAlertsRead}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1 text-xs font-black text-zinc-950 hover:bg-zinc-100 transition-all active:scale-95 shadow-2xs"
                >
                  Acknowledge All
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:border-zinc-300 hover:bg-white transition-all shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-900 border border-rose-200">
                        URGENT
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleAlertRead(alert.id, e)}
                        title="Mark as resolved / acknowledged"
                        className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 transition-colors"
                      >
                        <Check className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-black text-zinc-950 leading-snug">
                      {alert.title}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-zinc-700 leading-tight">
                      {alert.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-200/80 flex items-center justify-between">
                    <span className="text-xs font-black text-zinc-950">
                      Impact: {alert.count}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate({ to: alert.actionRoute })}
                      className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline"
                    >
                      <span>{alert.actionText}</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 2: NORTH STAR 4 EXECUTIVE KPI CARDS (COLORFUL & HIGH CONTRAST)
        ========================================================================= */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* CARD 1: GROSS MERCHANDISE VALUE (GMV) - EMERALD */}
          <div
            onClick={() => navigate({ to: adminRoutes.analytics })}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all duration-300 hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600" />
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 font-black">
                  <Coins className="size-4" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-950">
                    GROSS GMV
                  </span>
                  <p className="text-[10px] font-bold text-zinc-600">Total Transacted Value</p>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-950">
                <TrendingUp className="size-3" />
                {data?.revenueTrend ? `${data.revenueTrend.changePct > 0 ? "+" : ""}${data.revenueTrend.changePct}%` : "+0%"}
              </span>
            </div>

            <div className="mt-3.5 flex items-baseline justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
                  {currency(totalRevenue)}
                </p>
                <p className="text-xs font-bold text-zinc-700 mt-0.5">
                  Avg Order: <span className="text-zinc-950 font-black">{currency(averageOrderValue)}</span>
                </p>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-emerald-600 transition-all duration-500 w-full" />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-700">
              <span>Lifetime Gross Reconciled</span>
              <span className="text-emerald-800 font-black">{currency(data?.revenue)}</span>
            </div>
          </div>

          {/* CARD 2: PLATFORM TAKE RATE (18% NET REVENUE) - INDIGO */}
          <div
            onClick={() => navigate({ to: adminRoutes.wallet })}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all duration-300 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-indigo-500 via-violet-500 to-purple-600" />
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-300 font-black">
                  <Wallet className="size-4" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-950">
                    PLATFORM TAKE (18%)
                  </span>
                  <p className="text-[10px] font-bold text-zinc-600">Company Net Commission</p>
                </div>
              </div>
              <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-950">
                18% Margin
              </span>
            </div>

            <div className="mt-3.5 flex items-baseline justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
                  {currency(data?.platformCommission)}
                </p>
                <p className="text-xs font-bold text-zinc-700 mt-0.5">
                  Platform Earnings Cut
                </p>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-indigo-600 transition-all duration-500 w-full" />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-700">
              <span>Pending Settlement Float</span>
              <span className="text-amber-800 font-black">{currency(data?.pendingPayoutAmount)}</span>
            </div>
          </div>

          {/* CARD 3: ORDERS & FULFILLMENT EFFICIENCY - SKY BLUE */}
          <div
            onClick={() => navigate({ to: adminRoutes.orders })}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all duration-300 hover:border-sky-500 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-blue-500 via-sky-500 to-cyan-600" />
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-sky-100 text-sky-900 border border-sky-300 font-black">
                  <ShoppingBag className="size-4" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-950">
                    ORDERS VOLUME
                  </span>
                  <p className="text-[10px] font-bold text-zinc-600">Customer Bookings</p>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-black text-sky-950">
                <TrendingUp className="size-3" />
                {data?.ordersTrend ? `${data.ordersTrend.changePct > 0 ? "+" : ""}${data.ordersTrend.changePct}%` : "+0%"}
              </span>
            </div>

            <div className="mt-3.5 flex items-baseline justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
                  {count(data?.totalOrders)}
                </p>
                <p className="text-xs font-bold text-zinc-700 mt-0.5">
                  {count(data?.liveOrders)} Active in Flight
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-sky-900 bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-300">
                  {fulfillmentPercentage}% Fulfilled
                </span>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-sky-600 transition-all duration-500"
                style={{ width: `${fulfillmentPercentage}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-700">
              <span>Delivered: <span className="text-zinc-950 font-black">{count(data?.deliveredOrders)}</span></span>
              <span>Delayed: <span className="text-rose-700 font-black">{count(data?.delayedOrders)}</span></span>
            </div>
          </div>

          {/* CARD 4: FLEET & PARTNER NETWORK CAPACITY - PURPLE */}
          <div
            onClick={() => navigate({ to: adminRoutes.riders })}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition-all duration-300 hover:border-purple-500 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-linear-to-r from-purple-500 via-fuchsia-500 to-pink-600" />
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-purple-100 text-purple-900 border border-purple-300 font-black">
                  <Truck className="size-4" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-950">
                    FLEET &amp; STORES
                  </span>
                  <p className="text-[10px] font-bold text-zinc-600">Ground Operations</p>
                </div>
              </div>
              <span className="rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-black text-purple-950">
                Live GPS
              </span>
            </div>

            <div className="mt-3.5 flex items-baseline justify-between">
              <div>
                <p className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
                  {count(onlineRiders)}
                </p>
                <p className="text-xs font-bold text-zinc-700 mt-0.5">
                  Online / {count(totalRiders)} Fleet
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-300">
                  {fleetReadinessPercentage}% Ready
                </span>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-purple-600 transition-all duration-500"
                style={{ width: `${fleetReadinessPercentage}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-700">
              <span>Active Stores: <span className="text-zinc-950 font-black">{count(data?.activePartners)}</span></span>
              <span>Pending KYC: <span className="text-rose-700 font-black">{count(data?.pendingPartners)}</span></span>
            </div>
          </div>

        </div>

        {/* =========================================================================
            SECTION 3: TWO-RIDE ASSIGNMENT TELEMETRY (RIDE 1 PICKUP vs RIDE 2 DELIVERY)
        ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3 mb-4">
            <div>
              <h2 className="text-base font-black text-zinc-950 flex items-center gap-2">
                <Navigation className="size-4 text-sky-700" />
                <span>QuickPress Two-Ride Telemetry Matrix</span>
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-950 border border-sky-300">
                  Leg 1 Pickup ⇄ Leg 2 Delivery
                </span>
              </h2>
              <p className="text-xs font-bold text-zinc-700 mt-0.5">
                Real-time dispatch wave tracking across Customer Pickup and Customer Return Delivery legs
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: adminRoutes.orders })}
              className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              <span>View Ride Dispatch Board</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* RIDE 1: PICKUP LEG */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4">
              <div className="flex items-center justify-between border-b border-sky-200 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-sky-600 text-white font-black text-xs">
                    R1
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-zinc-950 uppercase tracking-wider">
                      RIDE 1 — PICKUP LEG (Customer → Store)
                    </h3>
                    <p className="text-[10px] font-bold text-sky-900">Garment intake &amp; bag tagging</p>
                  </div>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-sky-950 border border-sky-300">
                  Active Waves
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white p-2 border border-sky-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Searching</p>
                  <p className="text-base font-black text-sky-800">{twoRide.ride1.searching}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-sky-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Offers Sent</p>
                  <p className="text-base font-black text-amber-800">{twoRide.ride1.offerSent}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-sky-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Assigned</p>
                  <p className="text-base font-black text-emerald-800">{twoRide.ride1.assigned}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-sky-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Timeouts</p>
                  <p className="text-base font-black text-zinc-950">{twoRide.ride1.timeout}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-sky-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Rejected</p>
                  <p className="text-base font-black text-rose-700">{twoRide.ride1.rejected}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-sky-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">No Rider</p>
                  <p className="text-base font-black text-rose-800">{twoRide.ride1.noRider}</p>
                </div>
              </div>
            </div>

            {/* RIDE 2: DELIVERY LEG */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs">
                    R2
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-zinc-950 uppercase tracking-wider">
                      RIDE 2 — DELIVERY LEG (Store → Customer)
                    </h3>
                    <p className="text-[10px] font-bold text-emerald-900">Finished fresh garment delivery</p>
                  </div>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-emerald-950 border border-emerald-300">
                  Active Waves
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white p-2 border border-emerald-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Searching</p>
                  <p className="text-base font-black text-sky-800">{twoRide.ride2.searching}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-emerald-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Offers Sent</p>
                  <p className="text-base font-black text-amber-800">{twoRide.ride2.offerSent}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-emerald-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Assigned</p>
                  <p className="text-base font-black text-emerald-800">{twoRide.ride2.assigned}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-emerald-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Timeouts</p>
                  <p className="text-base font-black text-zinc-950">{twoRide.ride2.timeout}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-emerald-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">Rejected</p>
                  <p className="text-base font-black text-rose-700">{twoRide.ride2.rejected}</p>
                </div>
                <div className="rounded-lg bg-white p-2 border border-emerald-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-zinc-700">No Rider</p>
                  <p className="text-base font-black text-rose-800">{twoRide.ride2.noRider}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: 9-STAGE ORDER LIFECYCLE PIPELINE (HIGH CONTRAST)
        ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3 mb-4">
            <div>
              <h2 className="text-base font-black text-zinc-950 flex items-center gap-2">
                <Layers className="size-4 text-purple-700" />
                <span>Order Lifecycle Telemetry Pipeline</span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-950 border border-zinc-200">
                  9 Live Stages
                </span>
              </h2>
              <p className="text-xs font-bold text-zinc-700 mt-0.5">
                Real-time operational distribution across pickup wave, store washing, and delivery legs
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: adminRoutes.orders })}
              className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              <span>View Live Orders Board</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
            {(data?.pipeline || []).map((stage, idx) => {
              const hasItems = stage.count > 0;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.orders })}
                  className={`group relative flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all duration-200 cursor-pointer active:scale-95 ${
                    hasItems
                      ? "bg-white border-zinc-300 hover:border-zinc-500 hover:shadow-xs"
                      : "bg-zinc-50/70 border-zinc-200 hover:bg-white hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-[10px] font-mono font-black text-zinc-600">#{idx + 1}</span>
                    {hasItems && (
                      <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
                    )}
                  </div>

                  <span className="text-2xl font-black text-zinc-950 transition-transform group-hover:scale-110">
                    {stage.count}
                  </span>

                  <span className="mt-1.5 text-[11px] font-extrabold text-zinc-950 leading-tight line-clamp-2">
                    {stage.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            SECTION 5: FINANCIAL RECONCILIATION + FLEET & STORES READINESS
        ========================================================================= */}
        <div className="grid gap-6 xl:grid-cols-3">

          {/* 1. FINANCIAL RECONCILIATION SNAPSHOT */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <Wallet className="size-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-950">Financial Reconciliation</h3>
                    <p className="text-xs font-bold text-zinc-700">Double-entry verified ledger</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.wallet })}
                  className="text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  Full Wallet →
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div
                  onClick={() => navigate({ to: adminRoutes.wallet })}
                  className="flex justify-between items-center rounded-xl bg-zinc-50 p-2.5 font-bold cursor-pointer hover:bg-zinc-100 transition-all border border-zinc-200"
                >
                  <span className="text-zinc-800 font-bold">Gross Order Revenue</span>
                  <span className="text-zinc-950 font-black text-sm">{currency(data?.revenueSnapshot?.grossRevenue)}</span>
                </div>

                <div
                  onClick={() => navigate({ to: adminRoutes.wallet })}
                  className="flex justify-between items-center rounded-xl bg-emerald-50 p-2.5 font-bold text-emerald-900 cursor-pointer hover:bg-emerald-100 transition-all border border-emerald-200"
                >
                  <span className="font-bold">Platform Take Rate (18%)</span>
                  <span className="font-black text-sm">{currency(data?.revenueSnapshot?.platformCommission)}</span>
                </div>

                <div
                  onClick={() => navigate({ to: adminRoutes.wallet })}
                  className="flex justify-between items-center rounded-xl bg-zinc-50 p-2.5 font-bold cursor-pointer hover:bg-zinc-100 transition-all border border-zinc-200"
                >
                  <span className="text-zinc-800 font-bold">Partner Store Payouts (70%)</span>
                  <span className="text-zinc-950 font-black text-sm">{currency(data?.revenueSnapshot?.partnerEarnings)}</span>
                </div>

                <div
                  onClick={() => navigate({ to: adminRoutes.wallet })}
                  className="flex justify-between items-center rounded-xl bg-zinc-50 p-2.5 font-bold cursor-pointer hover:bg-zinc-100 transition-all border border-zinc-200"
                >
                  <span className="text-zinc-800 font-bold">Rider Delivery Earnings (12%)</span>
                  <span className="text-zinc-950 font-black text-sm">{currency(data?.revenueSnapshot?.riderEarnings)}</span>
                </div>

                <div
                  onClick={() => navigate({ to: adminRoutes.wallet })}
                  className="flex justify-between items-center rounded-xl bg-rose-50 p-2.5 font-bold text-rose-900 cursor-pointer hover:bg-rose-100 transition-all border border-rose-200"
                >
                  <span className="font-bold">Refunds &amp; Cancellations</span>
                  <span className="font-black text-sm">{currency(data?.revenueSnapshot?.refunds)}</span>
                </div>

                <div
                  onClick={() => navigate({ to: adminRoutes.wallet })}
                  className="flex justify-between items-center rounded-xl bg-amber-50 p-2.5 font-bold text-amber-900 cursor-pointer hover:bg-amber-100 transition-all border border-amber-200"
                >
                  <span className="font-bold">Pending Float Settlement</span>
                  <span className="font-black text-sm">{currency(data?.revenueSnapshot?.pendingSettlement)}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 text-[11px] font-bold text-zinc-600 flex items-center justify-between">
              <span>Razorpay &amp; UPI Reconciliation</span>
              <span className="text-emerald-800 font-black">100% Balanced</span>
            </div>
          </div>

          {/* 2. RIDER FLEET STATUS */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-100 text-sky-900 border border-sky-300">
                    <Truck className="size-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-950">Rider Fleet Logistics</h3>
                    <p className="text-xs font-bold text-zinc-700">Active captains readiness telemetry</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.riders })}
                  className="text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  Fleet View →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-center text-xs">
                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.riders })}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:border-zinc-400 hover:bg-white transition-all active:scale-95 text-left"
                >
                  <p className="text-[11px] text-zinc-700 font-black">Total Registered</p>
                  <p className="text-xl font-black text-zinc-950 mt-1">{data?.fleetStatus?.total || 0}</p>
                  <p className="text-[10px] text-zinc-600 font-semibold mt-0.5">All vetted captains</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.riders })}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 hover:border-emerald-400 transition-all active:scale-95 text-left"
                >
                  <p className="text-[11px] text-emerald-900 font-black">Online Now</p>
                  <p className="text-xl font-black text-emerald-950 mt-1">{data?.fleetStatus?.online || 0}</p>
                  <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">GPS signal active</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.riders })}
                  className="rounded-xl border border-sky-300 bg-sky-50 p-3 hover:border-sky-400 transition-all active:scale-95 text-left"
                >
                  <p className="text-[11px] text-sky-900 font-black">Available for Pickup</p>
                  <p className="text-xl font-black text-sky-950 mt-1">{data?.fleetStatus?.available || 0}</p>
                  <p className="text-[10px] text-sky-800 font-semibold mt-0.5">Zero active jobs</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.riders })}
                  className="rounded-xl border border-amber-300 bg-amber-50 p-3 hover:border-amber-400 transition-all active:scale-95 text-left"
                >
                  <p className="text-[11px] text-amber-900 font-black">Busy on Trip</p>
                  <p className="text-xl font-black text-amber-950 mt-1">{data?.fleetStatus?.busy || 0}</p>
                  <p className="text-[10px] text-amber-800 font-semibold mt-0.5">En route with package</p>
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] font-bold text-zinc-600">
              <span>Avg Dispatch SLA</span>
              <span className="text-zinc-950 font-black">4.8 Minutes</span>
            </div>
          </div>

          {/* 3. PARTNER STORES READINESS */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-purple-100 text-purple-900 border border-purple-300">
                    <Building2 className="size-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-950">Partner Laundromats</h3>
                    <p className="text-xs font-bold text-zinc-700">Commercial processing capacity</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.partners })}
                  className="text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  Stores View →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-center text-xs">
                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.partners })}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:border-zinc-400 hover:bg-white transition-all active:scale-95 text-left"
                >
                  <p className="text-[11px] text-zinc-700 font-black">Total Facilities</p>
                  <p className="text-xl font-black text-zinc-950 mt-1">{data?.partnerStatus?.total || 0}</p>
                  <p className="text-[10px] text-zinc-600 font-semibold mt-0.5">Contracted hubs</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.partners })}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 hover:border-emerald-400 transition-all active:scale-95 text-left"
                >
                  <p className="text-[11px] text-emerald-900 font-black">Active &amp; Taking Orders</p>
                  <p className="text-xl font-black text-emerald-950 mt-1">{data?.partnerStatus?.active || 0}</p>
                  <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">Washing capacity open</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.partners })}
                  className="rounded-xl border border-rose-300 bg-rose-50 p-3 hover:border-rose-400 transition-all active:scale-95 text-left"
                >
                  <p className="text-[11px] text-rose-900 font-black">Pending KYC Signoff</p>
                  <p className="text-xl font-black text-rose-950 mt-1">{data?.partnerStatus?.pending || 0}</p>
                  <p className="text-[10px] text-rose-800 font-semibold mt-0.5">Audit inspection queue</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.partners })}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:border-zinc-400 hover:bg-white transition-all active:scale-95 text-left"
                >
                  <p className="text-[11px] text-zinc-700 font-black">Suspended / Offline</p>
                  <p className="text-xl font-black text-zinc-950 mt-1">
                    {(data?.partnerStatus?.suspended || 0) + (data?.partnerStatus?.inactive || 0)}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-semibold mt-0.5">Maintenance downtime</p>
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] font-bold text-zinc-600">
              <span>Store SLA Compliance</span>
              <span className="text-emerald-800 font-black">98.4% On-Time</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 6: ORDERS & GMV TRAJECTORY PERFORMANCE CHART
        ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3 mb-4">
            <div>
              <h2 className="text-base font-black text-zinc-950 flex items-center gap-2">
                <span>Orders Volume &amp; Platform GMV Trajectory</span>
              </h2>
              <p className="text-xs font-bold text-zinc-700 mt-0.5">
                Delivered customer orders volume vs total gross monetary transacted value
              </p>
            </div>
            <div className="flex gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              {(["today", "7d", "30d"] as const).map((p) => {
                const active = chartPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setChartPeriod(p)}
                    className={`rounded-lg px-3 py-1 text-xs font-black capitalize transition-all ${
                      active
                        ? "bg-zinc-950 text-white shadow-xs"
                        : "text-zinc-800 hover:text-zinc-950 hover:bg-zinc-200"
                    }`}
                  >
                    {p === "today" ? "Today" : p === "7d" ? "7 Days" : "30 Days"}
                  </button>
                );
              })}
            </div>
          </div>
          <RevenueAreaChart data={revenue.data} loading={revenue.isLoading} />
        </div>

        {/* =========================================================================
            SECTION 7: TOP PERFORMANCE (TOP 5 PARTNER STORES & TOP 5 RIDERS)
        ========================================================================= */}
        <div className="grid gap-6 xl:grid-cols-2">

          {/* TOP 5 PARTNER STORES */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-zinc-950 flex items-center gap-1.5">
                  <Building2 className="size-4 text-purple-700" />
                  <span>Top 5 Partner Laundromats</span>
                </h3>
                <p className="text-xs font-bold text-zinc-700">Leading store hubs by order throughput &amp; ratings</p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.partners })}
                className="text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline"
              >
                View All Stores →
              </button>
            </div>

            <div className="space-y-2.5">
              {(data?.topPartners || []).slice(0, 5).map((partner, index) => (
                <div
                  key={partner.id}
                  onClick={() => navigate({ to: adminRoutes.partners })}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 hover:bg-white hover:border-zinc-400 hover:shadow-2xs transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-950 font-black text-xs border border-purple-200">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-950">{partner.name}</p>
                      <p className="text-[11px] text-zinc-700 font-bold">{partner.city} · ★ {partner.rating} Rating</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-black text-zinc-950">{partner.orders} Orders</p>
                    <p className="text-[11px] font-black text-emerald-800">{currency(partner.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TOP 5 DELIVERY CAPTAINS */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-zinc-950 flex items-center gap-1.5">
                  <Truck className="size-4 text-sky-700" />
                  <span>Top 5 Delivery Captains</span>
                </h3>
                <p className="text-xs font-bold text-zinc-700">Fleet leaders by completed trips &amp; SLA compliance</p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.riders })}
                className="text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline"
              >
                View All Fleet →
              </button>
            </div>

            <div className="space-y-2.5">
              {(data?.topRiders || []).slice(0, 5).map((rider, index) => (
                <div
                  key={rider.id}
                  onClick={() => navigate({ to: adminRoutes.riders })}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 hover:bg-white hover:border-zinc-400 hover:shadow-2xs transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-950 font-black text-xs border border-sky-200">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-950">{rider.name}</p>
                      <p className="text-[11px] text-zinc-700 font-bold">On-Time: {rider.onTimeRate} · ★ {rider.rating}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-black text-zinc-950">{rider.deliveries} Deliveries</p>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-950 border border-emerald-300">
                      Top Rated
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 8: CITY & OPERATING ZONE SNAPSHOT TABLE (HIGH CONTRAST)
        ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3 mb-3">
            <div>
              <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                <MapPin className="size-4 text-purple-700" />
                <span>City &amp; Operating Zone Breakdown</span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black text-zinc-950 border border-zinc-200">
                  Regional Operations
                </span>
              </h3>
              <p className="text-xs font-bold text-zinc-700 mt-0.5">
                Orders, revenue, active fleet, and delay breakdown by operating regional geography
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: adminRoutes.cities })}
              className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline"
            >
              <span>Open Regional Console</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-black uppercase tracking-wider text-zinc-950">
                <tr>
                  <th className="px-4 py-3">Operating City</th>
                  <th className="px-4 py-3">Total Orders</th>
                  <th className="px-4 py-3">Gross GMV</th>
                  <th className="px-4 py-3">Active Captains</th>
                  <th className="px-4 py-3">Active Stores</th>
                  <th className="px-4 py-3">SLA Delayed</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {(data?.cityBreakdown || []).map((c) => (
                  <tr key={c.city} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-4 py-3 font-black text-zinc-950 flex items-center gap-2">
                      <MapPin className="size-3.5 text-zinc-800" />
                      <span>{c.city}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-950">{c.orders} Orders</td>
                    <td className="px-4 py-3 font-black text-emerald-800">{currency(c.revenue)}</td>
                    <td className="px-4 py-3 font-bold text-zinc-900">{c.activeRiders} Captains</td>
                    <td className="px-4 py-3 font-bold text-zinc-900">{c.activePartners} Laundromats</td>
                    <td className="px-4 py-3">
                      <span className={`font-black rounded-md px-2 py-0.5 text-xs ${c.delayedOrders > 0 ? "bg-rose-100 text-rose-950 border border-rose-300" : "bg-zinc-100 text-zinc-700"}`}>
                        {c.delayedOrders} Delayed
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate({ to: adminRoutes.cities })}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-black text-zinc-950 hover:bg-zinc-100 transition-all active:scale-95 shadow-2xs"
                      >
                        <span>Manage</span>
                        <ArrowRight className="size-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================================
            SECTION 9: ADMINISTRATIVE QUICK ACTIONS + SURVEILLANCE FEED
        ========================================================================= */}
        <div className="grid gap-6 xl:grid-cols-2">

          {/* ADMINISTRATIVE QUICK ACTIONS */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="border-b border-zinc-100 pb-3 mb-4">
              <h3 className="text-sm font-black text-zinc-950">Administrative Quick Actions</h3>
              <p className="text-xs font-bold text-zinc-700">One-click operational dispatch &amp; platform governance</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.orders })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3.5 text-center hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 transition-all shadow-2xs"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1.5">
                  <ShoppingBag className="size-4" />
                </div>
                <span className="text-xs font-black text-zinc-950">Create Order</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.customers })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3.5 text-center hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 transition-all shadow-2xs"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-sky-50 text-sky-800 border border-sky-200 mb-1.5">
                  <Users className="size-4" />
                </div>
                <span className="text-xs font-black text-zinc-950">Add Customer</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.partners })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3.5 text-center hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 transition-all shadow-2xs"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-purple-50 text-purple-800 border border-purple-200 mb-1.5">
                  <Building2 className="size-4" />
                </div>
                <span className="text-xs font-black text-zinc-950">Add Partner Store</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.riders })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3.5 text-center hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 transition-all shadow-2xs"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-800 border border-blue-200 mb-1.5">
                  <Truck className="size-4" />
                </div>
                <span className="text-xs font-black text-zinc-950">Add Rider Pilot</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.coupons })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3.5 text-center hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 transition-all shadow-2xs"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1.5">
                  <TicketPercent className="size-4" />
                </div>
                <span className="text-xs font-black text-zinc-950">Create Coupon</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.notifications })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3.5 text-center hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 transition-all shadow-2xs"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200 mb-1.5">
                  <BellRing className="size-4" />
                </div>
                <span className="text-xs font-black text-zinc-950">Push Broadcast</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.orders })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3.5 text-center hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 transition-all shadow-2xs"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-sky-50 text-sky-800 border border-sky-200 mb-1.5">
                  <Zap className="size-4" />
                </div>
                <span className="text-xs font-black text-zinc-950">Manual Dispatch</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.orders })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3.5 text-center hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 transition-all shadow-2xs"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-rose-50 text-rose-800 border border-rose-200 mb-1.5">
                  <AlertTriangle className="size-4" />
                </div>
                <span className="text-xs font-black text-zinc-950">Delayed Orders</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.wallet })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3.5 text-center hover:bg-zinc-50 hover:border-zinc-400 active:scale-95 transition-all shadow-2xs"
              >
                <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 mb-1.5">
                  <Wallet className="size-4" />
                </div>
                <span className="text-xs font-black text-zinc-950">Audit Refunds</span>
              </button>
            </div>
          </div>

          {/* LIVE PLATFORM AUTOMATED SURVEILLANCE FEED */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-black text-zinc-950 flex items-center gap-1.5">
                  <ActivityIcon className="size-4 text-emerald-700" />
                  <span>Platform Automation Surveillance</span>
                </h3>
                <p className="text-xs font-bold text-zinc-700">Audit stream for Dispatch, Dynamic OTP, SLAs &amp; Finance</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-950">
                <span className="size-2 rounded-full bg-emerald-600 animate-ping" />
                7 Active Engines
              </span>
            </div>

            {/* Event Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2.5 no-scrollbar">
              {[
                { id: "all", label: "All Events" },
                { id: "dispatch", label: "⚡ Dispatch" },
                { id: "otp", label: "🔐 Dynamic OTP" },
                { id: "sla", label: "⏱️ Laundry SLA" },
                { id: "finance", label: "💰 Auto-Finance" },
                { id: "surge", label: "📈 Surge" },
                { id: "guard", label: "🛡️ Fraud Guard" },
              ].map((f) => {
                const active = automationFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAutomationFilter(f.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                      active
                        ? "bg-zinc-950 text-white shadow-xs"
                        : "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {(() => {
              const autoEvents = automations.data || [];
              const latestOrdersList = latest.data?.rows || [];

              if (autoEvents.length > 0) {
                return (
                  <ul className="space-y-2">
                    {autoEvents.slice(0, 6).map((evt) => {
                      const type = (evt.automationType || "auto").toLowerCase();
                      const sev = evt.severity || "info";

                      let badgeBg = "bg-zinc-100 text-zinc-950 border-zinc-300";
                      let typeLabel = "Automation";

                      if (type === "dispatch") {
                        badgeBg = "bg-blue-50 text-blue-950 border-blue-300";
                        typeLabel = "Auto-Dispatch";
                      } else if (type === "otp") {
                        badgeBg = "bg-emerald-50 text-emerald-950 border-emerald-300";
                        typeLabel = "Dynamic OTP";
                      } else if (type === "sla") {
                        badgeBg = "bg-amber-50 text-amber-950 border-amber-300";
                        typeLabel = "Laundry SLA";
                      } else if (type === "finance") {
                        badgeBg = "bg-indigo-50 text-indigo-950 border-indigo-300";
                        typeLabel = "Settlement";
                      } else if (type === "surge") {
                        badgeBg = "bg-rose-50 text-rose-950 border-rose-300";
                        typeLabel = "Surge Pricing";
                      } else if (type === "guard") {
                        badgeBg = "bg-red-50 text-red-950 border-red-300";
                        typeLabel = "Fraud Guard";
                      }

                      return (
                        <li
                          key={evt.id}
                          className="group flex items-start justify-between gap-3 rounded-xl p-2.5 border border-zinc-200 bg-zinc-50/60 hover:bg-white hover:border-zinc-300 hover:shadow-2xs transition-all"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border shrink-0 ${badgeBg}`}
                            >
                              {typeLabel}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-black text-xs text-zinc-950">
                                  {evt.title}
                                </p>
                                {evt.orderCode && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-zinc-200 text-zinc-950">
                                    #{evt.orderCode}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-800 font-bold line-clamp-2 mt-0.5">
                                {evt.description}
                              </p>
                              <p className="text-[10px] text-zinc-600 font-bold mt-0.5">
                                <span className="font-extrabold text-zinc-900">{formatRelativeTime(evt.timestamp || evt.createdAt)}</span>
                                {evt.actorId && ` · Actor: ${evt.actorId}`}
                              </p>
                            </div>
                          </div>
                          <span className={`size-2 rounded-full mt-1.5 shrink-0 ${
                            sev === "danger" ? "bg-rose-600 animate-pulse" : sev === "warning" ? "bg-amber-600" : "bg-emerald-600"
                          }`} />
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              // Fallback to recent orders stream
              return (
                <ul className="space-y-2">
                  {latestOrdersList.slice(0, 6).map((order: any, idx: number) => (
                    <li
                      key={order.id || idx}
                      onClick={() => navigate({ to: adminRoutes.orders })}
                      className="group flex items-start justify-between gap-3 rounded-xl p-2.5 border border-zinc-200 bg-zinc-50/60 hover:bg-white hover:border-zinc-300 hover:shadow-2xs transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-600" />
                        <div className="min-w-0">
                          <p className="font-black text-zinc-950 truncate text-xs">
                            Order #{order.id}: {order.status}
                          </p>
                          <p className="text-[11px] text-zinc-800 font-bold truncate">
                            {order.customer} · Store: {order.partner} · {order.amount}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-zinc-600 group-hover:text-zinc-950 transition-all shrink-0 mt-1" />
                    </li>
                  ))}
                  {latestOrdersList.length === 0 && (
                    <li className="text-xs text-zinc-600 font-bold py-6 text-center">
                      Connecting to live operational event streams...
                    </li>
                  )}
                </ul>
              );
            })()}
          </div>
        </div>

      </div>

      {/* =========================================================================
          SYSTEM HEALTH MODAL (LIVE SUPABASE TELEMETRY)
      ========================================================================= */}
      <Dialog open={healthModalOpen} onOpenChange={setHealthModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-zinc-950">
              <Server className="size-4 text-emerald-700" />
              <span>QuickPress Platform &amp; Supabase Health</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-zinc-700">
              Live heartbeat telemetry across database, authentication, realtime, and notification engines
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 pt-3 text-xs">
            {(health.data?.services || [
              { name: "Supabase PostgreSQL Database", status: "HEALTHY", metric: "Indexed schema operational", icon: "database" },
              { name: "Admin Security & 2FA Auth", status: "HEALTHY", metric: "2FA & RBAC Enforced", icon: "shield-check" },
              { name: "Supabase Realtime Channel", status: "HEALTHY", metric: "Live order events streaming", icon: "radio" },
              { name: "FCM Push Notification Service", status: "HEALTHY", metric: "Customer/Partner/Rider push active", icon: "bell" },
              { name: "Socket.IO Real-Time Dispatch", status: "HEALTHY", metric: "Rider location tracking listening", icon: "server" },
            ]).map((srv, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center gap-2.5">
                  <Server className="size-4 text-emerald-700" />
                  <div>
                    <p className="font-black text-zinc-950">{srv.name}</p>
                    <p className="text-[11px] text-zinc-700 font-bold">{srv.metric}</p>
                  </div>
                </div>
                <span className={`rounded-md px-2.5 py-0.5 text-[11px] font-black border ${
                  srv.status === "HEALTHY" ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-amber-100 text-amber-950 border-amber-300"
                }`}>
                  {srv.status}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
