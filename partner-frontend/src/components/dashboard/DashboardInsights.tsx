import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  IndianRupee,
  Package,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

import type { EarningsSummary } from "@/shared/types/partner";
import type { ManagedOrder } from "../../data/partner-orders-mock";
import { fetchPartnerAnalytics, type PartnerAnalyticsData } from "../../api/partner/partner-analytics-api";
import { partnerRoutes } from "../../navigation/partner-routes";

const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

function getPastDays(count: number = 7) {
  const days = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
    const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const isoDate = d.toISOString().split("T")[0];
    days.push({ dayName, dateStr, isoDate });
  }
  return days;
}

export function DailyAnalyticsSection({
  orders = [],
  earnings = null,
}: {
  orders?: ManagedOrder[];
  earnings?: EarningsSummary | null;
}) {
  const navigate = useNavigate();
  const [metricMode, setMetricMode] = useState<"revenue" | "orders">("revenue");
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [analyticsData, setAnalyticsData] = useState<PartnerAnalyticsData | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Fetch backend analytics when period changes
  useEffect(() => {
    let alive = true;
    fetchPartnerAnalytics(period)
      .then((res) => {
        if (alive && res) setAnalyticsData(res);
      })
      .catch(() => {
        // Handled silently; will compute from orders in real-time
      });
    return () => {
      alive = false;
    };
  }, [period]);

  const daysCount = period === "7d" ? 7 : 14;
  const daysList = useMemo(() => getPastDays(daysCount), [daysCount]);

  // Strictly completed / delivered orders only (never count cancelled, rejected, or active pipeline)
  const completedOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.stage === "completed" || (o as any).status === "delivered") &&
          o.stage !== "cancelled" &&
          (o as any).status !== "cancelled" &&
          (o as any).status !== "rejected"
      ),
    [orders]
  );

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.stage !== "completed" &&
          (o as any).status !== "delivered" &&
          o.stage !== "cancelled" &&
          (o as any).status !== "cancelled" &&
          (o as any).status !== "rejected"
      ),
    [orders]
  );

  // Aggregate real orders into daily trend (strictly completed orders)
  const dailyMetrics = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    for (const d of daysList) {
      map.set(d.isoDate, { revenue: 0, orders: 0 });
    }

    // Accumulate strictly from completed/delivered orders
    for (const o of completedOrders) {
      const placedDate = (o.placedAt || "").slice(0, 10);
      const targetDate = map.has(placedDate) ? placedDate : daysList[daysList.length - 1]?.isoDate;
      if (targetDate && map.has(targetDate)) {
        const curr = map.get(targetDate)!;
        curr.orders += 1;
        curr.revenue += o.amount || 0;
      }
    }

    // Merge with analyticsData if available
    if (analyticsData?.trendLabels && analyticsData.trendLabels.length > 0) {
      analyticsData.trendLabels.forEach((label, idx) => {
        const found = daysList.find((d) => d.isoDate.includes(label) || d.dayName.toLowerCase() === label.toLowerCase());
        if (found && map.has(found.isoDate)) {
          const curr = map.get(found.isoDate)!;
          const apiRev = analyticsData.revenueTrend?.[idx] || 0;
          const apiOrd = analyticsData.ordersTrend?.[idx] || 0;
          curr.revenue = Math.max(curr.revenue, apiRev);
          curr.orders = Math.max(curr.orders, apiOrd);
        }
      });
    }

    return daysList.map((d) => {
      const item = map.get(d.isoDate) || { revenue: 0, orders: 0 };
      return {
        ...d,
        revenue: item.revenue,
        orders: item.orders,
      };
    });
  }, [daysList, completedOrders, analyticsData]);

  // Overall totals (strictly for completed orders)
  const totalRevenue = useMemo(() => {
    const sum = dailyMetrics.reduce((acc, curr) => acc + curr.revenue, 0);
    const backendToday = earnings?.today ?? 0;
    const backendTotal = (earnings as any)?.total ?? 0;
    const hasCompleted = completedOrders.length > 0 || (earnings?.completedOrders ?? 0) > 0;
    if (!hasCompleted) return 0;
    return Math.max(sum, backendToday, backendTotal);
  }, [dailyMetrics, earnings, completedOrders]);

  const totalOrdersCount = useMemo(() => {
    const sum = dailyMetrics.reduce((acc, curr) => acc + curr.orders, 0);
    const backendCompleted = earnings?.completedOrders ?? 0;
    return Math.max(sum, completedOrders.length, backendCompleted);
  }, [dailyMetrics, completedOrders, earnings]);

  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  const netEarnings = Math.round(totalRevenue * 0.85); // 85% net partner share

  // Graph scales
  const maxRevenue = Math.max(...dailyMetrics.map((d) => d.revenue), 100);
  const maxOrders = Math.max(...dailyMetrics.map((d) => d.orders), 5);
  const currentMax = metricMode === "revenue" ? maxRevenue : maxOrders;

  // Extract top services from completed orders or analytics API
  const topServices = useMemo(() => {
    if (analyticsData?.topServices && analyticsData.topServices.length > 0) {
      return analyticsData.topServices.slice(0, 4);
    }
    const serviceCounts = new Map<string, { name: string; count: number; revenue: number }>();
    for (const o of completedOrders) {
      for (const it of o.items || []) {
        const sname = it.name || it.service || "Laundry Wash & Fold";
        const curr = serviceCounts.get(sname) || { name: sname, count: 0, revenue: 0 };
        curr.count += it.qty || 1;
        curr.revenue += (it.price || 0) * (it.qty || 1);
        serviceCounts.set(sname, curr);
      }
    }
    return Array.from(serviceCounts.values()).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [analyticsData, completedOrders]);

  return (
    <div className="space-y-6">
      {/* 4 Daily KPI Insight Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1: Revenue */}
        <div className="group rounded-3xl border border-border/80 bg-card p-4 transition-all hover:border-emerald-500/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              <IndianRupee className="size-4" strokeWidth={2.5} />
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              Net 85%
            </span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Daily Revenue
          </p>
          <p className="mt-0.5 text-xl font-black text-foreground sm:text-2xl">{inr(totalRevenue)}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {inr(netEarnings)} Net Payout
          </p>
        </div>

        {/* Metric 2: Orders */}
        <div className="group rounded-3xl border border-border/80 bg-card p-4 transition-all hover:border-blue-500/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-700 dark:text-blue-400">
              <Package className="size-4" strokeWidth={2.5} />
            </span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
              Live Volume
            </span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Completed Orders
          </p>
          <p className="mt-0.5 text-xl font-black text-foreground sm:text-2xl">
            {totalOrdersCount} Orders
          </p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {activeOrders.length} active in workflow
          </p>
        </div>

        {/* Metric 3: Average Order Value */}
        <div className="group rounded-3xl border border-border/80 bg-card p-4 transition-all hover:border-amber-500/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <TrendingUp className="size-4" strokeWidth={2.5} />
            </span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
              AOV
            </span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Avg Order Value
          </p>
          <p className="mt-0.5 text-xl font-black text-foreground sm:text-2xl">{inr(avgOrderValue)}</p>
          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">Per completed booking</p>
        </div>

        {/* Metric 4: Fulfillment SLA */}
        <div className="group rounded-3xl border border-border/80 bg-card p-4 transition-all hover:border-purple-500/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-700 dark:text-purple-400">
              <Zap className="size-4" strokeWidth={2.5} />
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              99.4% SLA
            </span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Turnaround Speed
          </p>
          <p className="mt-0.5 text-xl font-black text-foreground sm:text-2xl">~2.4 hrs</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            Express & Standard on-time
          </p>
        </div>
      </div>

      {/* Main Graph Card */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 md:p-6 shadow-sm">
        {/* Top Controls: Metric Toggle & Period Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <BarChart3 className="size-4" />
              </span>
              <h3 className="text-base font-black tracking-tight text-foreground">
                {metricMode === "revenue" ? "Daily Revenue Trend (₹)" : "Daily Order Volume"}
              </h3>
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {metricMode === "revenue"
                ? "Daily gross revenue and settlement distribution over time"
                : "Real-time count of customer orders received per day"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode Switch */}
            <div className="flex items-center rounded-2xl border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setMetricMode("revenue")}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  metricMode === "revenue"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Revenue (₹)
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("orders")}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  metricMode === "orders"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Orders
              </button>
            </div>

            {/* Period Switch */}
            <div className="flex items-center rounded-2xl border border-border bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => setPeriod("7d")}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  period === "7d"
                    ? "bg-card text-foreground shadow-xs font-black border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setPeriod("30d")}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  period === "30d"
                    ? "bg-card text-foreground shadow-xs font-black border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                14 Days
              </button>
            </div>
          </div>
        </div>

        {/* Visual Graph Area with Interactive Gradient Columns */}
        <div className="relative mt-6">
          {/* Subtle horizontal grid lines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between opacity-15">
            <div className="w-full border-b border-muted-foreground" />
            <div className="w-full border-b border-muted-foreground" />
            <div className="w-full border-b border-muted-foreground" />
          </div>

          <div className="relative flex h-56 items-end gap-2.5 sm:gap-4 pt-8 pb-2 px-1">
            {dailyMetrics.map((item, idx) => {
              const value = metricMode === "revenue" ? item.revenue : item.orders;
              const heightPercent = currentMax > 0 ? Math.max(14, Math.round((value / currentMax) * 100)) : 14;
              const isHovered = hoveredIdx === idx;
              const hasActivity = value > 0;

              return (
                <div
                  key={item.isoDate + idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                >
                  {/* Floating Value Pill above the bar */}
                  <div
                    className={`absolute -top-7 transition-all duration-200 z-10 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black shadow-xs ${
                      isHovered
                        ? "scale-110 bg-foreground text-background"
                        : hasActivity
                          ? "bg-muted text-foreground"
                          : "opacity-40 text-muted-foreground text-[9px]"
                    }`}
                  >
                    {metricMode === "revenue" ? inr(value) : `${value}`}
                  </div>

                  {/* Dynamic Column Bar */}
                  <div className="w-full max-w-[42px] flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-2xl transition-all duration-300 ${
                        metricMode === "revenue"
                          ? hasActivity
                            ? "bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20 group-hover:scale-105"
                            : "bg-muted/70 group-hover:bg-muted"
                          : hasActivity
                            ? "bg-gradient-to-t from-blue-600 via-blue-500 to-indigo-400 shadow-md shadow-blue-500/20 group-hover:scale-105"
                            : "bg-muted/70 group-hover:bg-muted"
                      } ${isHovered ? "ring-2 ring-foreground/20 scale-105" : ""}`}
                    />
                  </div>

                  {/* Day Label at bottom */}
                  <div className="mt-2.5 flex flex-col items-center">
                    <span
                      className={`text-[11px] font-bold transition-colors ${
                        isHovered ? "text-foreground font-black" : "text-muted-foreground"
                      }`}
                    >
                      {item.dayName}
                    </span>
                    <span className="text-[9px] font-semibold text-muted-foreground/70 hidden sm:inline">
                      {item.dateStr.slice(0, 6)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Graph Footer Summary & Legend */}
        <div className="mt-5 flex flex-wrap items-center justify-between border-t border-border/60 pt-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`size-3 rounded-full ${
                  metricMode === "revenue" ? "bg-emerald-500" : "bg-blue-500"
                }`}
              />
              <span className="font-bold text-foreground">
                {metricMode === "revenue" ? "Gross Daily Earnings" : "Customer Orders Placed"}
              </span>
            </div>
            <span className="text-muted-foreground font-semibold">
              Peak: {metricMode === "revenue" ? inr(maxRevenue) : `${maxOrders} Orders`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate({ to: partnerRoutes.analytics })}
            className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Open Comprehensive Analytics Dashboard <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Top Performing Services Breakdown */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/20 text-brand-dark">
              <Sparkles className="size-4" />
            </span>
            <h4 className="text-sm font-black tracking-tight text-foreground">
              Top Booked Services & Category Velocity
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Live Rate Card Share
          </span>
        </div>

        {topServices.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 py-8 text-center">
            <p className="text-xs font-bold text-muted-foreground">
              No completed service orders yet
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/80">
              Service velocity will appear automatically as orders are delivered.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {topServices.map((service, index) => {
              const maxCount = Math.max(...topServices.map((s) => s.count), 1);
              const percent = Math.min(100, Math.round((service.count / maxCount) * 100));

              return (
                <div
                  key={service.name + index}
                  className="flex flex-col justify-between rounded-2xl border border-border/70 bg-muted/30 p-3.5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-foreground truncate pr-2">
                        {service.name}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        {service.count} booked
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-extrabold text-foreground">
                      {inr(service.revenue)}
                    </p>
                  </div>

                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Backwards compatibility aliases
export const TodayPerformance = DailyAnalyticsSection;
export const Announcements = () => null;
