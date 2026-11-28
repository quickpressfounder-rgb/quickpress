import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Download,
  IndianRupee,
  Layers,
  Package,
  RotateCw,
  Share2,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import {
  fetchPartnerAnalytics,
  type HourlySlotStat,
  type PartnerAnalyticsData,
  type TopServiceStat,
} from "../api/partner/partner-analytics-api";
import { useCountUp } from "../hooks/use-count-up";
import { inr } from "../lib/currency";

type DeliverySpeedFilter = "all" | "express" | "standard";
type CategoryFilter = "all" | "wash_iron" | "dry_clean" | "shoe_care" | "bedding";
type PaymentFilter = "all" | "online" | "cod";
type StatusFilter = "completed_only" | "all";

const PERIOD_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "month", label: "Month" },
  { id: "all", label: "All" },
  { id: "custom", label: "Custom" },
] as const;

export function AnalyticsScreen() {
  const { orders: liveContextOrders, refresh: refreshOrders } = usePartnerOrders();

  const [period, setPeriod] = useState<string>("7d");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);

  const [speedFilter, setSpeedFilter] = useState<DeliverySpeedFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("completed_only");
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);

  const [backendData, setBackendData] = useState<PartnerAnalyticsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [chartMode, setChartMode] = useState<"revenue" | "orders">("revenue");
  const [chartView, setChartView] = useState<"area" | "bars">("area");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (speedFilter !== "all") count += 1;
    if (categoryFilter !== "all") count += 1;
    if (paymentFilter !== "all") count += 1;
    if (statusFilter !== "completed_only") count += 1;
    if (period === "custom" && (customStartDate || customEndDate)) count += 1;
    return count;
  }, [speedFilter, categoryFilter, paymentFilter, statusFilter, period, customStartDate, customEndDate]);

  const resetAllFilters = () => {
    setSpeedFilter("all");
    setCategoryFilter("all");
    setPaymentFilter("all");
    setStatusFilter("completed_only");
    setPeriod("7d");
    setShowCustomPicker(false);
    setCustomStartDate("");
    setCustomEndDate("");
    toast.info("Analytics filters reset");
  };

  const loadBackend = async (selectedPeriod: string) => {
    setIsRefreshing(true);
    try {
      const res = await fetchPartnerAnalytics(selectedPeriod);
      setBackendData(res);
    } catch {
      // Fallback gracefully to live context aggregation
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadBackend(period);
  }, [period]);

  const clientAggregated = useMemo(() => {
    const now = new Date();
    const getLocalDateStr = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const todayStr = getLocalDateStr(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);
    const firstDayOfMonthStr = getLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));

    const parseOrderDateStr = (order: any): string => {
      const raw = order?.placedAt || order?.createdAt || order?.placedAtRaw;
      if (!raw) return "";
      try {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) return getLocalDateStr(d);
      } catch {}
      return String(raw).slice(0, 10);
    };

    const filteredOrders = liveContextOrders.filter((o) => {
      const placed = parseOrderDateStr(o);
      const orderTime = new Date(o.placedAt || (o as any).createdAt || "").getTime();

      if (period === "today" && placed !== todayStr) return false;
      if (period === "yesterday" && placed !== yesterdayStr) return false;
      if (period === "7d" && (Number.isNaN(orderTime) || now.getTime() - orderTime > 7 * 86400000)) return false;
      if (period === "30d" && (Number.isNaN(orderTime) || now.getTime() - orderTime > 30 * 86400000)) return false;
      if (period === "month" && (!placed || placed < firstDayOfMonthStr)) return false;
      if (period === "custom") {
        if (customStartDate && (!placed || placed < customStartDate)) return false;
        if (customEndDate && (!placed || placed > customEndDate)) return false;
      }

      if (speedFilter === "express" && !o.isExpress && !(o as any).expressDelivery) return false;
      if (speedFilter === "standard" && (o.isExpress || (o as any).expressDelivery)) return false;

      if (categoryFilter !== "all") {
        const svcs = (o.services || []).join(" ").toLowerCase();
        const itemText = (o.items || []).map((it) => `${it.name || ""} ${it.service || ""}`).join(" ").toLowerCase();
        const combined = `${svcs} ${itemText}`;
        if (categoryFilter === "dry_clean" && !combined.includes("dry") && !combined.includes("suit") && !combined.includes("blazer")) return false;
        if (categoryFilter === "wash_iron" && !combined.includes("wash") && !combined.includes("iron") && !combined.includes("steam") && !combined.includes("press")) return false;
        if (categoryFilter === "shoe_care" && !combined.includes("shoe") && !combined.includes("sneaker")) return false;
        if (categoryFilter === "bedding" && !combined.includes("bed") && !combined.includes("blanket") && !combined.includes("quilt") && !combined.includes("duvet")) return false;
      }

      if (paymentFilter === "online" && o.paymentMode !== "online") return false;
      if (paymentFilter === "cod" && o.paymentMode !== "cod") return false;

      if (statusFilter === "completed_only") {
        const isCompleted =
          o.stage === "completed" ||
          (o as any).status === "delivered" ||
          (o as any).status === "completed";
        if (!isCompleted) return false;
      }

      return true;
    });

    const completedOrders = filteredOrders.filter(
      (o) =>
        o.stage === "completed" ||
        (o as any).status === "delivered" ||
        (o as any).status === "completed"
    );
    const activeOrders = filteredOrders.filter(
      (o) => o.stage !== "completed" && o.stage !== "cancelled"
    );

    const relevantOrders =
      statusFilter === "completed_only"
        ? completedOrders
        : filteredOrders.filter((o) => o.stage !== "cancelled");

    const totalRevenue = relevantOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalEarnings = Math.round(totalRevenue * 0.84);
    const completedCount = completedOrders.length;
    const avgOrderValue =
      completedCount > 0
        ? Math.round(totalRevenue / completedCount)
        : relevantOrders.length > 0
          ? Math.round(totalRevenue / relevantOrders.length)
          : 0;
    const totalGarments = relevantOrders.reduce(
      (sum, o) => sum + (o.itemCount || (o as any).itemsCount || 1),
      0
    );

    const custMap = new Map<string, number>();
    for (const o of filteredOrders) {
      const id = o.customerPhone || o.customerName || "Customer";
      custMap.set(id, (custMap.get(id) || 0) + 1);
    }
    const totalCustomers = custMap.size;
    const repeatCustomers = Array.from(custMap.values()).filter((c) => c > 1).length;
    const repeatRate =
      totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

    const expressOrders = relevantOrders.filter(
      (o) => o.isExpress || (o as any).expressDelivery
    ).length;
    const standardOrders = Math.max(0, relevantOrders.length - expressOrders);
    const expressBonusTotal = expressOrders * 25;

    const onlineCount = relevantOrders.filter((o) => o.paymentMode === "online").length;
    const codCount = relevantOrders.filter((o) => o.paymentMode === "cod").length;

    let numDays = 7;
    if (period === "today" || period === "yesterday") numDays = 1;
    else if (period === "30d" || period === "month") numDays = 30;

    const dayLabels: string[] = [];
    const dayRevenues: number[] = [];
    const dayOrders: number[] = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = getLocalDateStr(targetDate);
      const shortLabel =
        numDays === 1
          ? period === "today"
            ? "Today"
            : "Yesterday"
          : targetDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });

      dayLabels.push(shortLabel);
      const dayList = relevantOrders.filter((o) => parseOrderDateStr(o) === dateStr);
      dayRevenues.push(dayList.reduce((sum, o) => sum + (o.amount || 0), 0));
      dayOrders.push(dayList.length);
    }

    const dateWiseRecords = [];
    for (let i = 0; i < numDays; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = getLocalDateStr(targetDate);
      const fullDateLabel = targetDate.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const dayList = relevantOrders.filter((o) => parseOrderDateStr(o) === dateStr);
      const dayRev = dayList.reduce((sum, o) => sum + (o.amount || 0), 0);
      const dayExpress = dayList.filter(
        (o) => o.isExpress || (o as any).expressDelivery
      ).length;

      dateWiseRecords.push({
        dateStr,
        label: i === 0 ? "Today" : i === 1 ? "Yesterday" : fullDateLabel,
        fullDate: fullDateLabel,
        ordersCount: dayList.length,
        grossRevenue: dayRev,
        netPayout: Math.round(dayRev * 0.84),
        expressOrders: dayExpress,
        status: i === 0 ? "Accruing" : "Reconciled",
      });
    }

    return {
      totalOrders: filteredOrders.length,
      relevantOrders,
      completedOrders: completedCount,
      activeOrders: activeOrders.length,
      totalRevenue,
      totalEarnings,
      avgOrderValue,
      totalGarments,
      totalCustomers,
      repeatRate,
      expressOrders,
      standardOrders,
      expressBonusTotal,
      onlineCount,
      codCount,
      dayLabels,
      dayRevenues,
      dayOrders,
      dateWiseRecords,
    };
  }, [
    liveContextOrders,
    period,
    customStartDate,
    customEndDate,
    speedFilter,
    categoryFilter,
    paymentFilter,
    statusFilter,
  ]);

  const totalRevenue =
    clientAggregated.totalRevenue ||
    (backendData?.totalRevenue && activeFilterCount === 0 ? backendData.totalRevenue : 0);
  const completedOrders =
    clientAggregated.completedOrders ||
    (backendData?.completedOrders && activeFilterCount === 0 ? backendData.completedOrders : 0);
  const totalEarnings =
    clientAggregated.totalEarnings ||
    (backendData?.totalEarnings && activeFilterCount === 0 ? backendData.totalEarnings : 0);
  const avgOrderValue =
    clientAggregated.avgOrderValue ||
    (backendData?.avgOrderValue && activeFilterCount === 0 ? backendData.avgOrderValue : 0);
  const totalGarments =
    clientAggregated.totalGarments ||
    (backendData?.totalGarments && activeFilterCount === 0 ? backendData.totalGarments : 0);
  const totalCustomers =
    clientAggregated.totalCustomers ||
    (backendData?.totalCustomers && activeFilterCount === 0 ? backendData.totalCustomers : 0);
  const repeatRate =
    clientAggregated.repeatRate ||
    (backendData?.repeatRate && activeFilterCount === 0 ? backendData.repeatRate : 0);

  const animatedCompleted = useCountUp(completedOrders, 400);
  const animatedRevenue = useCountUp(totalRevenue, 400);
  const animatedEarnings = useCountUp(totalEarnings, 400);
  const animatedAOV = useCountUp(avgOrderValue, 400);
  const animatedGarments = useCountUp(totalGarments, 400);
  const animatedCustomers = useCountUp(totalCustomers, 400);

  const trendLabels = useMemo(() => {
    if (clientAggregated.dayLabels.length > 0) return clientAggregated.dayLabels;
    if (backendData?.trendLabels && backendData.trendLabels.length > 0) return backendData.trendLabels;
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }, [clientAggregated.dayLabels, backendData?.trendLabels]);

  const ordersTrend = useMemo(() => {
    if (clientAggregated.dayOrders.length > 0) return clientAggregated.dayOrders;
    if (backendData?.ordersTrend && backendData.ordersTrend.length > 0) return backendData.ordersTrend;
    return trendLabels.map(() => 0);
  }, [clientAggregated.dayOrders, backendData?.ordersTrend, trendLabels]);

  const revenueTrend = useMemo(() => {
    if (clientAggregated.dayRevenues.length > 0) return clientAggregated.dayRevenues;
    if (backendData?.revenueTrend && backendData.revenueTrend.length > 0) return backendData.revenueTrend;
    return trendLabels.map(() => 0);
  }, [clientAggregated.dayRevenues, backendData?.revenueTrend, trendLabels]);

  const activeSeries = chartMode === "revenue" ? revenueTrend : ordersTrend;
  const maxVal = useMemo(
    () => Math.max(...activeSeries, chartMode === "revenue" ? 500 : 5),
    [activeSeries, chartMode]
  );

  const peakDayIndex = useMemo(() => {
    let maxIdx = -1;
    let peak = 0;
    activeSeries.forEach((v, i) => {
      if (v > peak) {
        peak = v;
        maxIdx = i;
      }
    });
    return peak > 0 ? maxIdx : -1;
  }, [activeSeries]);

  const svgPoints = useMemo(() => {
    const count = activeSeries.length;
    if (count === 0) return [];
    const width = 680;
    const height = 180;
    const padX = 24;
    const padTop = 20;
    const padBottom = 24;
    const usableW = width - padX * 2;
    const usableH = height - padTop - padBottom;

    return activeSeries.map((val, i) => {
      const x = padX + (i / Math.max(1, count - 1)) * usableW;
      const yRatio = maxVal > 0 ? val / maxVal : 0;
      const y = padTop + (1 - yRatio) * usableH;
      return {
        x,
        y,
        val,
        rev: revenueTrend[i] ?? 0,
        ord: ordersTrend[i] ?? 0,
        label: trendLabels[i] || `Day ${i + 1}`,
      };
    });
  }, [activeSeries, maxVal, revenueTrend, ordersTrend, trendLabels]);

  const { linePath, areaPath } = useMemo(() => {
    const first = svgPoints[0];
    const last = svgPoints[svgPoints.length - 1];
    if (!first || !last || svgPoints.length < 2) {
      return { linePath: "", areaPath: "" };
    }
    let d = `M ${first.x} ${first.y}`;
    for (let i = 0; i < svgPoints.length - 1; i++) {
      const p0 = svgPoints[i]!;
      const p1 = svgPoints[i + 1]!;
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const baselineY = 180 - 24;
    const area = `${d} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
    return { linePath: d, areaPath: area };
  }, [svgPoints]);

  const topServices: TopServiceStat[] = useMemo(() => {
    if (backendData?.topServices && backendData.topServices.length > 0 && activeFilterCount === 0) {
      return backendData.topServices;
    }
    const serviceBuckets = new Map<string, { count: number; revenue: number }>();
    for (const order of clientAggregated.relevantOrders) {
      const key = (order.services && order.services[0]) || "Wash & Steam Iron";
      const cur = serviceBuckets.get(key) || { count: 0, revenue: 0 };
      cur.count += order.itemCount || 1;
      cur.revenue += order.amount || 0;
      serviceBuckets.set(key, cur);
    }
    const realEntries = Array.from(serviceBuckets.entries())
      .map(([name, val]) => ({
        name,
        count: val.count,
        revenue: val.revenue,
        sharePercent: totalRevenue > 0 ? Math.round((val.revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    return realEntries;
  }, [backendData?.topServices, activeFilterCount, clientAggregated.relevantOrders, totalRevenue]);

  const hourlySlots: HourlySlotStat[] = useMemo(() => {
    if (backendData?.hourlySlots && backendData.hourlySlots.length > 0 && activeFilterCount === 0) {
      return backendData.hourlySlots;
    }
    const buckets = [
      { slot: "Morning (07–11 AM)", count: 0 },
      { slot: "Afternoon (12–04 PM)", count: 0 },
      { slot: "Evening (05–09 PM)", count: 0 },
      { slot: "Night (09 PM+)", count: 0 },
    ];
    for (const order of clientAggregated.relevantOrders) {
      const raw = order.placedAt || (order as any).createdAt;
      const d = raw ? new Date(raw) : null;
      const hr = d && !Number.isNaN(d.getTime()) ? d.getHours() : 12;
      if (hr >= 6 && hr < 12) buckets[0]!.count += 1;
      else if (hr >= 12 && hr < 17) buckets[1]!.count += 1;
      else if (hr >= 17 && hr < 21) buckets[2]!.count += 1;
      else buckets[3]!.count += 1;
    }
    const sum = buckets.reduce((s, b) => s + b.count, 0);
    return buckets.map((b) => ({
      slot: b.slot,
      count: b.count,
      percentage: sum > 0 ? Math.round((b.count / sum) * 100) : 0,
    }));
  }, [backendData?.hourlySlots, activeFilterCount, clientAggregated.relevantOrders]);

  const handleShareReport = () => {
    const periodLabel = PERIOD_OPTIONS.find((p) => p.id === period)?.label || period;
    const text = `*QuickPress Store Analytics (${periodLabel})*\nGross Sales: ${inr(totalRevenue)}\nNet Payout: ${inr(totalEarnings)}\nOrders: ${completedOrders}\nGarments: ${totalGarments} pcs\nAOV: ${inr(avgOrderValue)} · Repeat: ${repeatRate}%`;
    void navigator.clipboard?.writeText(text);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    toast.success("Analytics report copied and opened in WhatsApp");
  };

  const handleExportCsv = () => {
    const header = "Date,Orders,Express Orders,Gross Revenue (INR),Net Payout (INR),Status";
    const rows = clientAggregated.dateWiseRecords.map(
      (r) =>
        `"${r.fullDate}",${r.ordersCount},${r.expressOrders},${r.grossRevenue},${r.netPayout},"${r.status}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `quickpress-analytics-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded settlement CSV");
  };

  const onlinePct =
    clientAggregated.onlineCount + clientAggregated.codCount > 0
      ? Math.round(
          (clientAggregated.onlineCount /
            (clientAggregated.onlineCount + clientAggregated.codCount)) *
            100
        )
      : 0;
  const expressPct =
    clientAggregated.expressOrders + clientAggregated.standardOrders > 0
      ? Math.round(
          (clientAggregated.expressOrders /
            (clientAggregated.expressOrders + clientAggregated.standardOrders)) *
            100
        )
      : 0;

  const activeHoverPoint =
    hoveredIdx !== null && svgPoints[hoveredIdx] ? svgPoints[hoveredIdx]! : null;

  return (
    <PartnerLayout
      activeTab="analytics"
      title="Analytics & Revenue"
      subtitle="Financial & demand intelligence"
    >
      <div className="min-h-full bg-[#FAFAFA] pb-20 text-zinc-950">
        {/* Sticky Clean Header */}
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
          <div className="app-header-safe mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 md:px-6 md:pt-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900">
                <BarChart3 className="size-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-zinc-950 truncate">
                    Analytics &amp; Revenue
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
                <p className="text-[11px] font-medium text-zinc-500 truncate">
                  Real-time order velocity, payout yield &amp; demand mix
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCsv}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 cursor-pointer transition-colors"
              >
                <Download className="size-3.5" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={handleShareReport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 cursor-pointer transition-colors"
              >
                <Share2 className="size-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  void loadBackend(period);
                  void refreshOrders();
                  toast.success("Analytics synced");
                }}
                disabled={isRefreshing}
                aria-label="Refresh analytics"
                className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace Container */}
        <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6 space-y-5">
          {/* 1. Unified Control Toolbar */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Segmented Timeframe Selector */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-zinc-200 bg-zinc-50/80 p-1">
                {PERIOD_OPTIONS.map((item) => {
                  const active = period === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPeriod(item.id);
                        setShowCustomPicker(item.id === "custom");
                      }}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? "bg-zinc-900 text-white shadow-2xs"
                          : "text-zinc-600 hover:text-zinc-950"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFilterDrawer((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    activeFilterCount > 0 || showFilterDrawer
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800"
                  }`}
                >
                  <SlidersHorizontal className="size-3.5" />
                  Filters
                  {activeFilterCount > 0 ? (
                    <span className="rounded-full bg-white text-zinc-900 px-1.5 py-0.2 text-[10px] font-bold tabular-nums">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>

                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-2 text-xs font-semibold text-zinc-600 cursor-pointer"
                  >
                    <X className="size-3.5" />
                    Reset
                  </button>
                ) : null}
              </div>
            </div>

            {/* Custom Date Picker */}
            {showCustomPicker ? (
              <div className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t border-zinc-100 text-xs">
                <Calendar className="size-4 text-zinc-500" />
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-900"
                />
                <span className="text-zinc-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-900"
                />
              </div>
            ) : null}

            {/* Clean Collapsible Filter Grid */}
            {showFilterDrawer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 text-xs animate-in fade-in duration-150">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Speed Tier
                  </label>
                  <select
                    value={speedFilter}
                    onChange={(e) => setSpeedFilter(e.target.value as DeliverySpeedFilter)}
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 font-semibold text-zinc-900"
                  >
                    <option value="all">All Speeds</option>
                    <option value="express">15-Min Express Only</option>
                    <option value="standard">Standard Slot Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Service Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 font-semibold text-zinc-900"
                  >
                    <option value="all">All Categories</option>
                    <option value="wash_iron">Wash &amp; Steam Iron</option>
                    <option value="dry_clean">Premium Dry Clean</option>
                    <option value="shoe_care">Shoe Care</option>
                    <option value="bedding">Bedding &amp; Blankets</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Payment Mode
                  </label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 font-semibold text-zinc-900"
                  >
                    <option value="all">Online + Cash</option>
                    <option value="online">Online Prepaid Only</option>
                    <option value="cod">Cash Collect Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Order Scope
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 font-semibold text-zinc-900"
                  >
                    <option value="completed_only">Settled &amp; Delivered</option>
                    <option value="all">Include Active Pipeline</option>
                  </select>
                </div>
              </div>
            ) : null}
          </div>

          {/* 2. Architectural Hero Bento KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Net Settlement */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Net Settlement
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                  <Wallet className="size-3.5" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 tabular-nums">
                {inr(animatedEarnings)}
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-500 tabular-nums">
                Gross {inr(animatedRevenue)} · 84% take-home
              </p>
            </div>

            {/* KPI 2: Fulfilled Orders */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Fulfilled Orders
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                  <Package className="size-3.5" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 tabular-nums">
                {animatedCompleted}
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-500 tabular-nums">
                {clientAggregated.activeOrders} in active pipeline
              </p>
            </div>

            {/* KPI 3: Average Order Value */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Avg. Order Value
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                  <IndianRupee className="size-3.5" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 tabular-nums">
                {inr(animatedAOV)}
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-500 tabular-nums">
                {animatedGarments} garments cleaned
              </p>
            </div>

            {/* KPI 4: Repeat Customers */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Repeat Rate
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                  <Users className="size-3.5" />
                </span>
              </div>
              <p className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 tabular-nums">
                {repeatRate}%
              </p>
              <p className="mt-1 text-[11px] font-medium text-zinc-500 tabular-nums">
                {animatedCustomers} unique customers
              </p>
            </div>
          </div>

          {/* 3. Main Revenue Curve + Mix Insights Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Revenue & Velocity Interactive Chart (8 cols) */}
            <section className="lg:col-span-8 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                <div>
                  <h2 className="text-sm font-bold text-zinc-950">
                    {chartMode === "revenue" ? "Gross Revenue Trend" : "Order Volume Trend"}
                  </h2>
                  <p className="text-[11px] font-medium text-zinc-500 mt-0.5 tabular-nums">
                    {activeHoverPoint
                      ? `${activeHoverPoint.label}: ${inr(activeHoverPoint.rev)} · ${activeHoverPoint.ord} orders`
                      : peakDayIndex >= 0
                        ? `Peak day: ${trendLabels[peakDayIndex]} (${
                            chartMode === "revenue"
                              ? inr(revenueTrend[peakDayIndex] ?? 0)
                              : `${ordersTrend[peakDayIndex] ?? 0} orders`
                          })`
                        : "Hover chart points to inspect daily metrics"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setChartMode("revenue")}
                      className={`rounded-lg px-2.5 py-1 cursor-pointer transition-colors ${
                        chartMode === "revenue" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500"
                      }`}
                    >
                      Revenue
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode("orders")}
                      className={`rounded-lg px-2.5 py-1 cursor-pointer transition-colors ${
                        chartMode === "orders" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500"
                      }`}
                    >
                      Orders
                    </button>
                  </div>

                  <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setChartView("area")}
                      className={`rounded-lg px-2.5 py-1 cursor-pointer transition-colors ${
                        chartView === "area" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500"
                      }`}
                    >
                      Spline
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartView("bars")}
                      className={`rounded-lg px-2.5 py-1 cursor-pointer transition-colors ${
                        chartView === "bars" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500"
                      }`}
                    >
                      Bars
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 relative">
                {chartView === "area" ? (
                  <svg
                    viewBox="0 0 680 180"
                    className="w-full h-48 overflow-visible select-none"
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <defs>
                      <linearGradient id="qpStudioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#09090B" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#09090B" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Clean Horizontal Gridlines */}
                    {[20, 88, 156].map((yPos) => (
                      <line
                        key={yPos}
                        x1="24"
                        y1={yPos}
                        x2="656"
                        y2={yPos}
                        stroke="#E4E4E7"
                        strokeDasharray="3 4"
                        strokeWidth="1"
                      />
                    ))}

                    {areaPath ? <path d={areaPath} fill="url(#qpStudioGrad)" /> : null}
                    {linePath ? (
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#09090B"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    ) : null}

                    {svgPoints.map((pt, idx) => {
                      const active = hoveredIdx === idx;
                      return (
                        <g key={`${pt.label}-${idx}`}>
                          <rect
                            x={pt.x - 18}
                            y={0}
                            width={36}
                            height={180}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIdx(idx)}
                          />
                          {active ? (
                            <line
                              x1={pt.x}
                              y1={16}
                              x2={pt.x}
                              y2={156}
                              stroke="#A1A1AA"
                              strokeDasharray="2 3"
                              strokeWidth="1"
                            />
                          ) : null}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={active ? 5 : 3}
                            fill={active ? "#059669" : "#09090B"}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="flex h-48 items-end gap-1.5 px-2 pt-6 pb-2">
                    {svgPoints.map((pt, idx) => {
                      const pct = Math.max(4, Math.round((pt.val / Math.max(1, maxVal)) * 100));
                      const active = hoveredIdx === idx;
                      return (
                        <button
                          key={`${pt.label}-${idx}`}
                          type="button"
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                          className="group flex-1 h-full flex flex-col justify-end items-center gap-1 cursor-pointer"
                        >
                          <div
                            className={`w-full max-w-[28px] rounded-t-md transition-all ${
                              active ? "bg-emerald-600" : "bg-zinc-900 group-hover:bg-zinc-700"
                            }`}
                            style={{ height: `${pct}%` }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* X-Axis Labels */}
                <div className="mt-1 flex items-center justify-between px-3 text-[10px] font-semibold text-zinc-400 tabular-nums">
                  {trendLabels.length <= 8
                    ? trendLabels.map((lbl, i) => <span key={i}>{lbl}</span>)
                    : [0, Math.floor(trendLabels.length / 2), trendLabels.length - 1].map((idx) => (
                        <span key={idx}>{trendLabels[idx]}</span>
                      ))}
                </div>
              </div>
            </section>

            {/* Mix Breakdown & Peak Hours Card (4 cols) */}
            <section className="lg:col-span-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-5">
              {/* Payment Split */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-950">Payment Mix</span>
                  <span className="font-semibold text-zinc-500 tabular-nums">
                    {onlinePct}% Online
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden flex">
                  <div className="h-full bg-emerald-600" style={{ width: `${onlinePct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 tabular-nums">
                  <span>UPI/Card: {clientAggregated.onlineCount}</span>
                  <span>Cash: {clientAggregated.codCount}</span>
                </div>
              </div>

              {/* Express Split */}
              <div className="space-y-2 pt-3 border-t border-zinc-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-bold text-zinc-950">
                    <Zap className="size-3.5 text-amber-600" />
                    Express Share
                  </span>
                  <span className="font-semibold text-amber-700 tabular-nums">
                    +{inr(clientAggregated.expressBonusTotal)} bonus
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden flex">
                  <div className="h-full bg-amber-500" style={{ width: `${expressPct}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 tabular-nums">
                  <span>Express: {clientAggregated.expressOrders}</span>
                  <span>Standard: {clientAggregated.standardOrders}</span>
                </div>
              </div>

              {/* Peak Demand Slots */}
              <div className="space-y-2.5 pt-3 border-t border-zinc-100">
                <p className="text-xs font-bold text-zinc-950">Hourly Demand Slots</p>
                <div className="space-y-2">
                  {hourlySlots.map((slot) => (
                    <div key={slot.slot} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-zinc-600">{slot.slot}</span>
                        <span className="font-bold text-zinc-900 tabular-nums">
                          {slot.count} ({slot.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-zinc-900"
                          style={{ width: `${slot.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* 4. Top Services & Settlement Ledger Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Service Breakdown (5 cols) */}
            <section className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h2 className="text-sm font-bold text-zinc-950">Top Services Mix</h2>
                <Layers className="size-4 text-zinc-400" />
              </div>

              {topServices.length === 0 ? (
                <div className="py-10 text-center text-xs font-medium text-zinc-500">
                  No service breakdown recorded for this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {topServices.map((svc) => (
                    <div key={svc.name} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-zinc-900 truncate">{svc.name}</span>
                        <span className="font-bold text-zinc-950 tabular-nums shrink-0">
                          {inr(svc.revenue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${Math.max(4, Number(svc.sharePercent ?? 0))}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-zinc-500 tabular-nums w-20 text-right">
                          {svc.count} pcs · {svc.sharePercent ?? 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Date-Wise Financial Ledger Table (7 cols) */}
            <section className="lg:col-span-7 rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-zinc-500" />
                  <h2 className="text-sm font-bold text-zinc-950">Daily Settlement Ledger</h2>
                </div>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="sm:hidden inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-800"
                >
                  <Download className="size-3" />
                  CSV
                </button>
              </div>

              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-zinc-50/95 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="py-2.5 pl-4 pr-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Orders</th>
                      <th className="py-2.5 px-3 text-right">Gross</th>
                      <th className="py-2.5 px-3 text-right">Net Payout</th>
                      <th className="py-2.5 pl-3 pr-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {clientAggregated.dateWiseRecords.slice(0, 14).map((row) => (
                      <tr key={row.dateStr} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-2.5 pl-4 pr-3 font-semibold text-zinc-900 whitespace-nowrap">
                          {row.label}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-zinc-700 tabular-nums">
                          {row.ordersCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-zinc-700 tabular-nums">
                          {inr(row.grossRevenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-zinc-950 tabular-nums">
                          {inr(row.netPayout)}
                        </td>
                        <td className="py-2.5 pl-3 pr-4 text-right">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              row.status === "Accruing"
                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Toaster />
    </PartnerLayout>
  );
}
