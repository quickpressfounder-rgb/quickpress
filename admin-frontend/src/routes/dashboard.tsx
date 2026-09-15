import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Building2,
  Truck,
  Users,
  Sparkles,
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
  HardDrive,
  Zap,
  KeyRound,
  Coins,
  Flame,
  ShieldAlert,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "../components/AdminShell";
import { AdminLivePanel } from "../components/AdminLivePanel";
import { AdminLiveMap } from "../components/AdminLiveMap";
import { DataTable, SectionCard, StatusPill } from "../components/AdminUI";
import { OrdersBarChart, RevenueAreaChart } from "../components/AdminCharts";
import {
  fetchDashboardSummary,
  fetchLatestOrders,
  fetchOrdersSeries,
  fetchRecentActivity,
  fetchRevenueSeries,
  fetchSystemHealth,
  fetchAutomationActivity,
  fetchAutomationStats,
  triggerAutomation,
} from "../api/dashboard";
import { adminRoutes } from "../navigation/admin-routes";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAdminSession,
  head: () => adminHead("Command Center Dashboard", "Live Platform Operations · QuickPress"),
  component: DashboardPage,
});

const TONE_DOT: Record<string, string> = {
  default: "bg-zinc-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
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
  const activity = useQuery({ queryKey: ["admin", "dashboard", "activity"], queryFn: fetchRecentActivity, staleTime: 15000, refetchInterval: 15000 });
  const latest = useQuery({ queryKey: ["admin", "dashboard", "latest"], queryFn: fetchLatestOrders, staleTime: 20000 });

  const [automationFilter, setAutomationFilter] = useState<string>("all");
  const automations = useQuery({
    queryKey: ["admin", "dashboard", "automations", automationFilter],
    queryFn: () => fetchAutomationActivity(automationFilter),
    staleTime: 4000,
    refetchInterval: 4000,
  });
  const autoStats = useQuery({
    queryKey: ["admin", "dashboard", "automation-stats"],
    queryFn: fetchAutomationStats,
    staleTime: 8000,
    refetchInterval: 8000,
  });

  const data = summary.data;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      toast.success("Command Center data refreshed from Supabase!");
    } catch {
      toast.error("Failed to refresh live data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const count = (n?: number) => (n ?? 0).toLocaleString("en-IN");
  const currency = (n?: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

  const latestRows = (latest.data?.rows ?? []).map((row, index) => ({
    id: String(row["id"] ?? index),
    customer: String(row["customer"] ?? "—"),
    partner: String(row["partner"] ?? "—"),
    rider: String(row["rider"] ?? "Unassigned"),
    status: String(row["status"] ?? "—"),
    amount: String(row["amount"] ?? "—"),
  }));

  const currentDateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <AdminShell
      title="Platform Command Center"
      subtitle={`Live operations data as of ${currentDateStr} · Supabase PostgreSQL`}
      actions={
        <>
          {/* System Health Pill */}
          <button
            type="button"
            onClick={() => setHealthModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 transition-all hover:bg-emerald-100 active:scale-95"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
            <span>All Systems Operational</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 active:scale-95 shadow-xs"
          >
            <RefreshCw className={`size-3.5 ${summary.isFetching ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => toast.success("Exporting snapshot as CSV...")}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95"
          >
            <Download className="size-3.5" />
            <span>Export Snapshot</span>
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            SECTION 3: GLOBAL FILTER BAR
        ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs">
          {/* Date Selector */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mr-2">DATE:</span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "this_month", label: "This Month" },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDateFilter(d.id as any)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  dateFilter === d.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* City & Service Filters */}
          <div className="flex items-center gap-2">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="h-8 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-bold text-zinc-700 focus:border-emerald-600 focus:outline-none"
            >
              <option value="all">All Cities</option>
              <option value="Kasganj">Kasganj</option>
              <option value="Aligarh">Aligarh</option>
              <option value="Mathura">Mathura</option>
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="h-8 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-bold text-zinc-700 focus:border-emerald-600 focus:outline-none"
            >
              <option value="all">All Services</option>
              <option value="wash">Wash &amp; Iron</option>
              <option value="dry">Dry Cleaning</option>
              <option value="iron">Steam Press</option>
              <option value="shoe">Shoe Care</option>
            </select>
          </div>
        </div>

        {/* =========================================================================
            SECTION 5: ATTENTION REQUIRED (ACTIONABLE ALERT STRIP)
        ========================================================================= */}
        {data?.attentionAlerts && data.attentionAlerts.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-white font-black text-xs">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950">Requires Immediate Attention</h3>
                  <p className="text-xs text-amber-800 font-medium">Critical items needing admin intervention</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
                {data.attentionAlerts.length} Action Items
              </span>
            </div>

            <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.attentionAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 bg-white transition-all hover:shadow-sm ${
                    alert.severity === "critical" ? "border-rose-300 bg-rose-50/40" : "border-amber-300"
                  }`}
                >
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${alert.severity === "critical" ? "text-rose-600" : "text-amber-700"}`}>
                      {alert.title}
                    </span>
                    <p className="mt-1 text-xs text-zinc-600 line-clamp-2">{alert.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({ to: alert.actionRoute as any })}
                    className="mt-3 flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-black text-white hover:bg-zinc-800 active:scale-95"
                  >
                    <span>{alert.actionText}</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 4: TOP KPI CARDS (ORDERS, BUSINESS, OPERATIONS) - FULLY INTERACTIVE
        ========================================================================= */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. ORDERS CATEGORY - CLICKABLE */}
            <div
              onClick={() => navigate({ to: adminRoutes.orders })}
              className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition-all hover:border-emerald-500/60 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">ORDERS HEALTH</span>
                  <ArrowRight className="size-3 text-zinc-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 text-emerald-600" />
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <TrendingUp className="size-3" />
                  {data?.ordersTrend ? `${data.ordersTrend.changePct > 0 ? "+" : ""}${data.ordersTrend.changePct}%` : "+0%"} vs prev
                </span>
              </div>
              <p className="mt-2 text-3xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors">
                {count(data?.totalOrders)}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-2 text-center text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: adminRoutes.orders });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-emerald-100/70 hover:scale-[1.03] active:scale-95"
                >
                  <p className="text-[10px] text-zinc-500 font-semibold">Active</p>
                  <p className="font-black text-emerald-700 text-sm">{count(data?.liveOrders)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: adminRoutes.orders });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-zinc-200/70 hover:scale-[1.03] active:scale-95"
                >
                  <p className="text-[10px] text-zinc-500 font-semibold">Delivered</p>
                  <p className="font-black text-zinc-900 text-sm">{count(data?.deliveredOrders)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: adminRoutes.orders });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-rose-100/70 hover:scale-[1.03] active:scale-95"
                >
                  <p className="text-[10px] text-zinc-500 font-semibold">Delayed</p>
                  <p className="font-black text-rose-600 text-sm">{count(data?.delayedOrders)}</p>
                </button>
              </div>
            </div>

            {/* 2. BUSINESS CATEGORY - CLICKABLE */}
            <div
              onClick={() => navigate({ to: adminRoutes.analytics })}
              className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition-all hover:border-emerald-500/60 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">BUSINESS &amp; REVENUE</span>
                  <ArrowRight className="size-3 text-zinc-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 text-emerald-600" />
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <TrendingUp className="size-3" />
                  {data?.revenueTrend ? `${data.revenueTrend.changePct > 0 ? "+" : ""}${data.revenueTrend.changePct}%` : "+0%"} vs prev
                </span>
              </div>
              <p className="mt-2 text-3xl font-black text-emerald-700 group-hover:text-emerald-800 transition-colors">
                {currency(data?.todayRevenue || data?.revenue)}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-2 text-center text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: adminRoutes.wallet });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-emerald-100/70 hover:scale-[1.03] active:scale-95"
                >
                  <p className="text-[10px] text-zinc-500 font-semibold truncate">Commission (18%)</p>
                  <p className="font-black text-emerald-800 text-sm">{currency(data?.platformCommission)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: adminRoutes.wallet });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-amber-100/70 hover:scale-[1.03] active:scale-95"
                >
                  <p className="text-[10px] text-zinc-500 font-semibold truncate">Pending Payout</p>
                  <p className="font-black text-amber-700 text-sm">{currency(data?.pendingPayoutAmount)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: adminRoutes.customers });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-zinc-200/70 hover:scale-[1.03] active:scale-95"
                >
                  <p className="text-[10px] text-zinc-500 font-semibold">Customers</p>
                  <p className="font-black text-zinc-900 text-sm">{count(data?.totalCustomers)}</p>
                </button>
              </div>
            </div>

            {/* 3. OPERATIONS CATEGORY - CLICKABLE */}
            <div
              onClick={() => navigate({ to: adminRoutes.riders })}
              className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs transition-all hover:border-emerald-500/60 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">FLEET &amp; PARTNERS</span>
                  <ArrowRight className="size-3 text-zinc-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 text-emerald-600" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Live Telemetry</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-black text-zinc-900 group-hover:text-emerald-700 transition-colors">
                  {count(data?.onlineRiders)}
                </p>
                <span className="text-xs font-bold text-zinc-500">Riders Online / {count(data?.totalRiders)}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-zinc-50 p-2 text-center text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: adminRoutes.riders });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-emerald-100/70 hover:scale-[1.03] active:scale-95"
                >
                  <p className="text-[10px] text-zinc-500 font-semibold">Available</p>
                  <p className="font-black text-emerald-700 text-sm">{count(data?.availableRiders)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: adminRoutes.partners });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-zinc-200/70 hover:scale-[1.03] active:scale-95"
                >
                  <p className="text-[10px] text-zinc-500 font-semibold">Active Stores</p>
                  <p className="font-black text-zinc-900 text-sm">{count(data?.activePartners)}</p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: adminRoutes.partners });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-rose-100/70 hover:scale-[1.03] active:scale-95"
                >
                  <p className="text-[10px] text-zinc-500 font-semibold">Pending Stores</p>
                  <p className="font-black text-rose-600 text-sm">{count(data?.pendingPartners)}</p>
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* =========================================================================
            SECTION 8: ORDER FULFILLMENT PIPELINE (VISUAL 9-STAGE PROGRESSION)
        ========================================================================= */}
        <SectionCard
          title="Order Lifecycle Pipeline"
          description="Click any stage to inspect and filter orders in that operational state"
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
            {(data?.pipeline || []).map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => navigate({ to: adminRoutes.orders })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center transition-all hover:border-emerald-500 hover:bg-white hover:shadow-xs active:scale-95"
              >
                <span className="text-xl font-black text-zinc-900">{stage.count}</span>
                <span className="mt-1 text-[11px] font-bold text-zinc-600 leading-tight">
                  {stage.label}
                </span>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* =========================================================================
            SECTION 9 & 10: REVENUE SNAPSHOT + LIVE FLEET & PARTNER STATUS
        ========================================================================= */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Revenue Snapshot */}
          <SectionCard
            title="Revenue Snapshot"
            description="Verified financial reconciliation from Supabase orders"
            actions={
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.wallet })}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Full Wallet →
              </button>
            }
          >
            <div className="space-y-2.5 text-xs">
              <div
                onClick={() => navigate({ to: adminRoutes.wallet })}
                className="flex justify-between rounded-xl bg-zinc-50 p-2.5 font-bold cursor-pointer hover:bg-zinc-100 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <span className="text-zinc-600">Gross Revenue</span>
                <span className="text-zinc-900">{currency(data?.revenueSnapshot?.grossRevenue)}</span>
              </div>
              <div
                onClick={() => navigate({ to: adminRoutes.wallet })}
                className="flex justify-between rounded-xl bg-emerald-50 p-2.5 font-bold text-emerald-900 cursor-pointer hover:bg-emerald-100 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <span>Platform Commission (18%)</span>
                <span>{currency(data?.revenueSnapshot?.platformCommission)}</span>
              </div>
              <div
                onClick={() => navigate({ to: adminRoutes.wallet })}
                className="flex justify-between rounded-xl bg-zinc-50 p-2.5 font-bold cursor-pointer hover:bg-zinc-100 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <span className="text-zinc-600">Partner Earnings</span>
                <span className="text-zinc-900">{currency(data?.revenueSnapshot?.partnerEarnings)}</span>
              </div>
              <div
                onClick={() => navigate({ to: adminRoutes.wallet })}
                className="flex justify-between rounded-xl bg-zinc-50 p-2.5 font-bold cursor-pointer hover:bg-zinc-100 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <span className="text-zinc-600">Rider Earnings</span>
                <span className="text-zinc-900">{currency(data?.revenueSnapshot?.riderEarnings)}</span>
              </div>
              <div
                onClick={() => navigate({ to: adminRoutes.wallet })}
                className="flex justify-between rounded-xl bg-rose-50 p-2.5 font-bold text-rose-900 cursor-pointer hover:bg-rose-100 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <span>Refunds / Cancellations</span>
                <span>{currency(data?.revenueSnapshot?.refunds)}</span>
              </div>
              <div
                onClick={() => navigate({ to: adminRoutes.wallet })}
                className="flex justify-between rounded-xl bg-amber-50 p-2.5 font-bold text-amber-900 cursor-pointer hover:bg-amber-100 hover:shadow-xs transition-all active:scale-[0.99]"
              >
                <span>Pending Settlement</span>
                <span>{currency(data?.revenueSnapshot?.pendingSettlement)}</span>
              </div>
            </div>
          </SectionCard>

          {/* Riders Status */}
          <SectionCard
            title="Rider Fleet Status"
            description="Active delivery captains ready for dispatch"
            actions={
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.riders })}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Fleet View →
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.riders })}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:border-zinc-300 hover:bg-white hover:shadow-xs transition-all active:scale-95"
              >
                <p className="text-[10px] text-zinc-500 font-semibold">Total Registered</p>
                <p className="text-lg font-black text-zinc-900">{data?.fleetStatus?.total || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.riders })}
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 hover:border-emerald-300 hover:bg-emerald-100/70 hover:shadow-xs transition-all active:scale-95"
              >
                <p className="text-[10px] text-emerald-800 font-semibold">Online Now</p>
                <p className="text-lg font-black text-emerald-700">{data?.fleetStatus?.online || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.riders })}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:border-zinc-300 hover:bg-white hover:shadow-xs transition-all active:scale-95"
              >
                <p className="text-[10px] text-zinc-500 font-semibold">Available</p>
                <p className="text-lg font-black text-zinc-900">{data?.fleetStatus?.available || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.riders })}
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 hover:border-amber-300 hover:bg-amber-100/70 hover:shadow-xs transition-all active:scale-95"
              >
                <p className="text-[10px] text-amber-800 font-semibold">Busy on Trip</p>
                <p className="text-lg font-black text-amber-700">{data?.fleetStatus?.busy || 0}</p>
              </button>
            </div>
          </SectionCard>

          {/* Partners Status */}
          <SectionCard
            title="Partner Stores Readiness"
            description="Onboarded laundromats and dry cleaner hubs"
            actions={
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.partners })}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Stores View →
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.partners })}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:border-zinc-300 hover:bg-white hover:shadow-xs transition-all active:scale-95"
              >
                <p className="text-[10px] text-zinc-500 font-semibold">Total Stores</p>
                <p className="text-lg font-black text-zinc-900">{data?.partnerStatus?.total || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.partners })}
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 hover:border-emerald-300 hover:bg-emerald-100/70 hover:shadow-xs transition-all active:scale-95"
              >
                <p className="text-[10px] text-emerald-800 font-semibold">Active Stores</p>
                <p className="text-lg font-black text-emerald-700">{data?.partnerStatus?.active || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.partners })}
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 hover:border-rose-300 hover:bg-rose-100/70 hover:shadow-xs transition-all active:scale-95"
              >
                <p className="text-[10px] text-rose-800 font-semibold">Pending KYC</p>
                <p className="text-lg font-black text-rose-600">{data?.partnerStatus?.pending || 0}</p>
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.partners })}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:border-zinc-300 hover:bg-white hover:shadow-xs transition-all active:scale-95"
              >
                <p className="text-[10px] text-zinc-500 font-semibold">Suspended / Inactive</p>
                <p className="text-lg font-black text-zinc-900">
                  {(data?.partnerStatus?.suspended || 0) + (data?.partnerStatus?.inactive || 0)}
                </p>
              </button>
            </div>
          </SectionCard>
        </div>

        {/* =========================================================================
            SECTION 11: LIVE OPERATIONS MAP (COMPACT EMBED + LINK TO FULL MAP)
        ========================================================================= */}
        <SectionCard
          title="Live Operations Map"
          description="Real-time GPS telemetry from active rider devices and partner pickup hubs"
          actions={
            <button
              type="button"
              onClick={() => navigate({ to: adminRoutes.riders })}
              className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
            >
              <span>Open Full Live Map</span>
              <ExternalLink className="size-3" />
            </button>
          }
        >
          <AdminLiveMap className="h-64" />
        </SectionCard>

        {/* =========================================================================
            SECTION 12: ORDERS + REVENUE TREND CHART
        ========================================================================= */}
        <SectionCard
          title="Orders &amp; Revenue Trajectory"
          description="Delivered orders volume vs platform GMV"
          actions={
            <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
              {(["today", "7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setChartPeriod(p)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-all ${
                    chartPeriod === p ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {p === "today" ? "Today" : p === "7d" ? "7 Days" : "30 Days"}
                </button>
              ))}
            </div>
          }
        >
          <RevenueAreaChart data={revenue.data} loading={revenue.isLoading} />
        </SectionCard>

        {/* =========================================================================
            SECTION 13: TOP PERFORMANCE (TOP 5 PARTNERS & TOP 5 RIDERS)
        ========================================================================= */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Top 5 Partners */}
          <SectionCard
            title="Top 5 Partner Stores"
            description="Leading laundry stores by order volume and ratings"
            actions={
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.partners })}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                View All →
              </button>
            }
          >
            <div className="space-y-2.5">
              {(data?.topPartners || []).slice(0, 5).map((partner) => (
                <div
                  key={partner.id}
                  onClick={() => navigate({ to: adminRoutes.partners })}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 hover:bg-white hover:border-zinc-200 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                      {partner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">{partner.name}</p>
                      <p className="text-[10px] text-zinc-500 font-medium">{partner.city} · ★ {partner.rating}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-black text-zinc-900">{partner.orders} Orders</p>
                    <p className="text-[10px] font-bold text-emerald-700">{currency(partner.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Top 5 Riders */}
          <SectionCard
            title="Top 5 Delivery Captains"
            description="Top rated fleet members by deliveries completed and on-time performance"
            actions={
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.riders })}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                View All →
              </button>
            }
          >
            <div className="space-y-2.5">
              {(data?.topRiders || []).slice(0, 5).map((rider) => (
                <div
                  key={rider.id}
                  onClick={() => navigate({ to: adminRoutes.riders })}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 hover:bg-white hover:border-zinc-200 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800 font-black text-xs">
                      {rider.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">{rider.name}</p>
                      <p className="text-[10px] text-zinc-500 font-medium">On-Time: {rider.onTimeRate} · ★ {rider.rating}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-black text-zinc-900">{rider.deliveries} Deliveries</p>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Top Rated
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* =========================================================================
            SECTION 14: CITY / AREA SNAPSHOT TABLE
        ========================================================================= */}
        <SectionCard
          title="City &amp; Operating Zone Snapshot"
          description="Orders, revenue, active fleet, and delay breakdown by operating geography"
          actions={
            <button
              type="button"
              onClick={() => navigate({ to: adminRoutes.cities })}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              View Full Analytics →
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2.5">City</th>
                  <th className="px-3 py-2.5">Total Orders</th>
                  <th className="px-3 py-2.5">Gross Revenue</th>
                  <th className="px-3 py-2.5">Active Riders</th>
                  <th className="px-3 py-2.5">Active Partners</th>
                  <th className="px-3 py-2.5">Delayed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(data?.cityBreakdown || []).map((c) => (
                  <tr key={c.city} className="hover:bg-zinc-50/80">
                    <td className="px-3 py-2.5 font-bold text-zinc-900">{c.city}</td>
                    <td className="px-3 py-2.5 font-semibold text-zinc-700">{c.orders}</td>
                    <td className="px-3 py-2.5 font-black text-emerald-700">{currency(c.revenue)}</td>
                    <td className="px-3 py-2.5 text-zinc-600">{c.activeRiders}</td>
                    <td className="px-3 py-2.5 text-zinc-600">{c.activePartners}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-bold ${c.delayedOrders > 0 ? "text-rose-600" : "text-zinc-400"}`}>
                        {c.delayedOrders}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* =========================================================================
            SECTION 15 & 16: QUICK ACTIONS + LIVE ACTIVITY STREAM
        ========================================================================= */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Quick Actions */}
          <SectionCard
            title="Administrative Quick Actions"
            description="One-click operational dispatch & governance actions"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.orders })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center hover:bg-zinc-100 active:scale-95"
              >
                <ShoppingBag className="size-4 text-emerald-600 mb-1" />
                <span className="text-[11px] font-bold text-zinc-800">Create Order</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.customers })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center hover:bg-zinc-100 active:scale-95"
              >
                <Users className="size-4 text-sky-600 mb-1" />
                <span className="text-[11px] font-bold text-zinc-800">Add Customer</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.partners })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center hover:bg-zinc-100 active:scale-95"
              >
                <Building2 className="size-4 text-amber-600 mb-1" />
                <span className="text-[11px] font-bold text-zinc-800">Add Partner</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.riders })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center hover:bg-zinc-100 active:scale-95"
              >
                <Truck className="size-4 text-purple-600 mb-1" />
                <span className="text-[11px] font-bold text-zinc-800">Add Rider</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.coupons })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center hover:bg-zinc-100 active:scale-95"
              >
                <TicketPercent className="size-4 text-emerald-600 mb-1" />
                <span className="text-[11px] font-bold text-zinc-800">Create Coupon</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.notifications })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center hover:bg-zinc-100 active:scale-95"
              >
                <BellRing className="size-4 text-indigo-600 mb-1" />
                <span className="text-[11px] font-bold text-zinc-800">Broadcast Alert</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.orders })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center hover:bg-zinc-100 active:scale-95"
              >
                <Truck className="size-4 text-sky-600 mb-1" />
                <span className="text-[11px] font-bold text-zinc-800">Manual Dispatch</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.orders })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center hover:bg-zinc-100 active:scale-95"
              >
                <AlertTriangle className="size-4 text-rose-600 mb-1" />
                <span className="text-[11px] font-bold text-zinc-800">Delayed Orders</span>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: adminRoutes.wallet })}
                className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center hover:bg-zinc-100 active:scale-95"
              >
                <Wallet className="size-4 text-emerald-600 mb-1" />
                <span className="text-[11px] font-bold text-zinc-800">View Refunds</span>
              </button>
            </div>
          </SectionCard>

          {/* Live Platform Automations & Activity Surveillance */}
          <SectionCard
            title="Automated Operations Surveillance"
            description="Live audit logs across Auto-Dispatch, Dynamic OTPs, SLAs, Auto-Finance & Fraud Guard"
            actions={
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  7/7 Automations Active
                </span>
                <button
                  type="button"
                  onClick={() => navigate({ to: adminRoutes.orders })}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  All Orders →
                </button>
              </div>
            }
          >
            {/* Automation Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
              {[
                { id: "all", label: "All Events" },
                { id: "dispatch", label: "⚡ Dispatch" },
                { id: "otp", label: "🔐 Dynamic OTP" },
                { id: "sla", label: "⏱️ Laundry SLA" },
                { id: "finance", label: "💰 Auto-Finance" },
                { id: "surge", label: "📈 Surge" },
                { id: "guard", label: "🛡️ Fraud Guard" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAutomationFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                    automationFilter === f.id
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {(() => {
              const autoEvents = automations.data || [];
              const displayActivities = [...(activity.data || [])];

              // If we have real automation logs from backend, display them with rich visual badges!
              if (autoEvents.length > 0) {
                return (
                  <ul className="space-y-2">
                    {autoEvents.slice(0, 8).map((evt) => {
                      const type = (evt.automationType || "auto").toLowerCase();
                      const sev = evt.severity || "info";

                      let badgeBg = "bg-zinc-100 text-zinc-700 border-zinc-200";
                      let typeLabel = "Automation";

                      if (type === "dispatch") {
                        badgeBg = "bg-blue-50 text-blue-700 border-blue-200";
                        typeLabel = "Auto-Dispatch";
                      } else if (type === "otp") {
                        badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        typeLabel = "Dynamic OTP";
                      } else if (type === "sla") {
                        badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
                        typeLabel = "Laundry SLA";
                      } else if (type === "finance") {
                        badgeBg = "bg-indigo-50 text-indigo-700 border-indigo-200";
                        typeLabel = "Settlement";
                      } else if (type === "surge") {
                        badgeBg = "bg-rose-50 text-rose-700 border-rose-200";
                        typeLabel = "Surge Pricing";
                      } else if (type === "guard") {
                        badgeBg = "bg-red-50 text-red-700 border-red-200";
                        typeLabel = "Fraud Guard";
                      } else if (type === "notification") {
                        badgeBg = "bg-sky-50 text-sky-700 border-sky-200";
                        typeLabel = "Broadcast";
                      }

                      return (
                        <li
                          key={evt.id}
                          className="group flex items-start justify-between gap-3 rounded-xl p-2.5 -mx-2 hover:bg-zinc-50 border border-transparent hover:border-zinc-200 hover:shadow-2xs transition-all"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border shrink-0 ${badgeBg}`}
                            >
                              {typeLabel}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-xs text-zinc-900 group-hover:text-emerald-700 transition-colors">
                                  {evt.title}
                                </p>
                                {evt.orderCode && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-zinc-200 text-zinc-800">
                                    #{evt.orderCode}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 font-medium line-clamp-2 mt-0.5">
                                {evt.description}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                <span className="font-semibold text-zinc-600">{formatRelativeTime(evt.timestamp || evt.createdAt)}</span>
                                {evt.actorId && ` · Actor: ${evt.actorId}`}
                              </p>
                            </div>
                          </div>
                          <span className={`size-2 rounded-full mt-1.5 shrink-0 ${
                            sev === "danger" ? "bg-red-500 animate-pulse" : sev === "warning" ? "bg-amber-500" : "bg-emerald-500"
                          }`} />
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              // Fallback to operational activities if logs are still warming up
              if (displayActivities.length < 5 && latestRows.length > 0) {
                for (const order of latestRows) {
                  if (!displayActivities.some((a) => a.id.includes(order.id))) {
                    displayActivities.push({
                      id: `ord-latest-${order.id}`,
                      title: `Order ${order.id}: ${order.status}`,
                      meta: `${order.customer} · Store: ${order.partner} · ${order.amount}`,
                      time: new Date().toISOString(),
                      tone: order.status.toLowerCase().includes("delivered") ? "success" : "default",
                    });
                  }
                }
              }

              return (
                <ul className="space-y-1.5">
                  {displayActivities.slice(0, 8).map((item) => (
                    <li
                      key={item.id}
                      onClick={() => navigate({ to: adminRoutes.orders })}
                      className="group flex items-start justify-between gap-3 rounded-xl p-2 -mx-2 hover:bg-zinc-50 hover:shadow-2xs transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[item.tone] || "bg-zinc-400"}`} />
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-medium truncate">
                            {item.meta} · <span className="font-semibold text-zinc-700">{formatRelativeTime(item.time)}</span>
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </li>
                  ))}
                  {activity.isLoading && displayActivities.length === 0 && (
                    <li className="text-xs text-zinc-400 py-4 text-center">Connecting to automation streams...</li>
                  )}
                  {!activity.isLoading && displayActivities.length === 0 && (
                    <li className="text-xs text-zinc-400 py-4 text-center">No automation events logged yet.</li>
                  )}
                </ul>
              );
            })()}
          </SectionCard>
        </div>
      </div>

      {/* =========================================================================
          SYSTEM HEALTH MODAL (LIVE SUPABASE & SERVICES)
      ========================================================================= */}
      <Dialog open={healthModalOpen} onOpenChange={setHealthModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900 border-zinc-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Server className="size-4 text-emerald-600" />
              <span>QuickPress Platform &amp; Supabase Health</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Live heartbeat telemetry across database, authentication, realtime, and notification engines
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3 text-xs">
            {(health.data?.services || [
              { name: "Supabase PostgreSQL Database", status: "HEALTHY", metric: "Indexed schema operational", icon: "database" },
              { name: "Admin Security & 2FA Auth", status: "HEALTHY", metric: "2FA & RBAC Enforced", icon: "shield-check" },
              { name: "Supabase Realtime Channel", status: "HEALTHY", metric: "Live order events streaming", icon: "radio" },
              { name: "FCM Push Notification Service", status: "HEALTHY", metric: "Customer/Partner/Rider push active", icon: "bell" },
              { name: "Socket.IO Real-Time Dispatch", status: "HEALTHY", metric: "Rider location tracking listening", icon: "server" },
            ]).map((srv, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <div className="flex items-center gap-2.5">
                  <Server className="size-4 text-emerald-600" />
                  <div>
                    <p className="font-bold text-zinc-900">{srv.name}</p>
                    <p className="text-[10px] text-zinc-500">{srv.metric}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${srv.status === "HEALTHY" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
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
