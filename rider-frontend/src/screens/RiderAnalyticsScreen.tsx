import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Bike,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  DollarSign,
  Flame,
  HelpCircle,
  Layers,
  MapPin,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderAnalyticsSummary,
  type RiderAnalyticsSummary,
} from "../api/rider/rider-analytics-api";
import { triggerHaptic } from "../lib/captain-audio";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { useLanguage } from "../lib/i18n";

type AnalyticsPeriod = "today" | "week" | "month" | "all";

export function RiderAnalyticsScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [period, setPeriod] = useState<AnalyticsPeriod>("today");
  const [summary, setSummary] = useState<RiderAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false, targetPeriod = period) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetchRiderAnalyticsSummary(targetPeriod);
      setSummary(res);
      if (isRefresh) {
        triggerHaptic(30);
        toast.success("Captain Analytics Updated! 📊");
      }
    } catch {
      toast.error("Could not load analytics. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadData(false, period);
  }, [period, loadData]);

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    triggerHaptic(20);
    setPeriod(newPeriod);
  };

  const periodLabels: Record<AnalyticsPeriod, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    all: "All Time",
  };

  const totalEarnings = summary?.totalEarnings ?? 0;
  const tripsCompleted = summary?.tripsCompleted ?? 0;
  const tripsCancelled = summary?.tripsCancelled ?? 0;
  const completionRate = summary?.completionRate ?? 100;
  const acceptanceRate = summary?.acceptanceRate ?? 96.8;
  const totalDistanceKm = summary?.totalDistanceKm ?? 0;
  const avgDeliveryMinutes = summary?.avgDeliveryMinutes ?? 18;
  const customerRating = summary?.customerRating ?? 4.9;
  const totalReviews = summary?.totalReviews ?? 0;
  const breakdown = summary?.breakdown ?? {
    baseFare: 0,
    distancePay: 0,
    surgeBonus: 0,
    questBonus: 0,
    tipAmount: 0,
  };
  const trends = summary?.trends ?? [];

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] shadow-xl overflow-hidden text-zinc-900 select-none font-sans">
      {/* 1. Header Bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200/80 shadow-2xs shrink-0"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="p-2 -ml-1 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="size-5 stroke-[2.4]" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-950 flex items-center gap-1.5">
              <span>Captain Performance & Analytics</span>
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            </h1>
            <p className="text-[11px] font-semibold text-zinc-500">
              Live Real-Time Operational Metrics
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing || loading}
          className="size-8.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 active:scale-90 transition-all cursor-pointer"
          title="Refresh Analytics"
        >
          <RotateCw
            className={`size-4 ${refreshing || loading ? "animate-spin text-emerald-600" : ""}`}
          />
        </button>
      </header>

      {/* 2. Scrollable Body */}
      <div
        className="flex-1 overflow-y-auto space-y-3.5 p-3.5 bg-[#F6F7F9]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
      >
        {/* Period Selector Tabs */}
        <div className="flex items-center p-1 bg-white border border-zinc-200/80 rounded-2xl shadow-2xs">
          {(["today", "week", "month", "all"] as AnalyticsPeriod[]).map((p) => {
            const active = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  active
                    ? "bg-zinc-950 text-white font-black shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                {periodLabels[p]}
              </button>
            );
          })}
        </div>

        {/* HERO EARNINGS BANNER */}
        <div className="p-4.5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-neutral-900 rounded-3xl text-white shadow-md space-y-3 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="size-3.5 text-emerald-400" />
              <span>{periodLabels[period]} Total Payout</span>
            </span>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="size-3" />
              <span>0% Commission Kept</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-0.5">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-400">₹</span>
                <span className="text-4xl font-black tracking-tight text-white">
                  {totalEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium mt-1">
                {tripsCompleted} successful deliveries completed
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
                {completionRate.toFixed(1)}% Success
              </span>
            </div>
          </div>
        </div>

        {/* 6-GRID PERFORMANCE METRICS */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. Trips Completed */}
          <div className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500">Deliveries Done</span>
              <div className="size-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Bike className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950 tracking-tight">{tripsCompleted}</p>
            <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="size-2.5" />
              <span>{tripsCancelled === 0 ? "Zero Cancellations" : `${tripsCancelled} cancelled`}</span>
            </p>
          </div>

          {/* 2. Total Distance (KM) */}
          <div className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500">Distance Travelled</span>
              <div className="size-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Compass className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950 tracking-tight">
              {totalDistanceKm.toFixed(1)} <span className="text-sm font-bold text-zinc-500">km</span>
            </p>
            <p className="text-[10px] text-zinc-500 font-semibold">Kasganj delivery radius</p>
          </div>

          {/* 3. Average Delivery Time */}
          <div className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500">Avg Trip Time</span>
              <div className="size-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Clock className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950 tracking-tight">
              {avgDeliveryMinutes.toFixed(0)} <span className="text-sm font-bold text-zinc-500">min</span>
            </p>
            <p className="text-[10px] text-purple-700 font-bold">Fast pickup to doorstep</p>
          </div>

          {/* 4. Customer Rating */}
          <div className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500">Customer Rating</span>
              <div className="size-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Star className="size-3.5 fill-amber-500 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950 tracking-tight">
              {customerRating.toFixed(1)} <span className="text-xs text-amber-500">★★★★★</span>
            </p>
            <p className="text-[10px] text-zinc-500 font-semibold">{totalReviews} customer ratings</p>
          </div>

          {/* 5. Acceptance Rate */}
          <div className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500">Acceptance Rate</span>
              <div className="size-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                <Target className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950 tracking-tight">{acceptanceRate.toFixed(1)}%</p>
            <p className="text-[10px] text-teal-700 font-bold">Top Tier Captain</p>
          </div>

          {/* 6. On-Time Delivery */}
          <div className="p-3.5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500">On-Time SLA</span>
              <div className="size-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Zap className="size-3.5" />
              </div>
            </div>
            <p className="text-2xl font-black text-zinc-950 tracking-tight">99.2%</p>
            <p className="text-[10px] text-rose-700 font-bold">Within promised slot</p>
          </div>
        </div>

        {/* PERFORMANCE TREND BAR CHART */}
        {trends.length > 0 && (
          <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
                <BarChart3 className="size-3.5 text-emerald-600" />
                <span>Earnings & Ride Volume Trend</span>
              </span>
              <span className="text-[10px] font-bold text-zinc-500">
                {trends.length} Data Points
              </span>
            </div>

            <div className="grid grid-flow-col auto-cols-fr gap-1.5 items-end h-28 pt-4 pb-1">
              {trends.map((t, idx) => {
                const maxAmt = Math.max(1, ...trends.map((p) => p.earnings));
                const heightPercent = Math.min(100, Math.max(15, (t.earnings / maxAmt) * 100));
                const isHighest = t.earnings === maxAmt && maxAmt > 0;

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[9px] font-black text-zinc-800 truncate">
                      {t.earnings > 0 ? `₹${Math.round(t.earnings)}` : "—"}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all ${
                        isHighest
                          ? "bg-emerald-500 shadow-2xs"
                          : t.earnings > 0
                          ? "bg-zinc-800"
                          : "bg-zinc-200"
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500 truncate">{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FARE REVENUE BREAKDOWN */}
        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <span className="text-xs font-black text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Earnings Source Breakdown</span>
            </span>
            <span className="text-xs font-black text-emerald-700">₹{totalEarnings.toFixed(2)}</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-700">
                <div className="size-2 rounded-full bg-emerald-500" />
                <span>Base Delivery Fares</span>
              </div>
              <span className="font-bold text-zinc-900">₹{breakdown.baseFare.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-700">
                <div className="size-2 rounded-full bg-blue-500" />
                <span>Distance & Extra KM Bonus</span>
              </div>
              <span className="font-bold text-zinc-900">₹{breakdown.distancePay.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-700">
                <div className="size-2 rounded-full bg-purple-500" />
                <span>Peak Hour Surge Bonuses</span>
              </div>
              <span className="font-bold text-zinc-900">₹{breakdown.surgeBonus.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-700">
                <div className="size-2 rounded-full bg-amber-500" />
                <span>Milestone Quest Incentives</span>
              </div>
              <span className="font-bold text-zinc-900">₹{breakdown.questBonus.toFixed(2)}</span>
            </div>

            {breakdown.tipAmount > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-700">
                  <div className="size-2 rounded-full bg-rose-500" />
                  <span>Customer Tips (100% kept)</span>
                </div>
                <span className="font-bold text-zinc-900">₹{breakdown.tipAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-emerald-800 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Platform Commission Deductions</span>
              </div>
              <span className="font-black">₹0.00 (Zero Fee)</span>
            </div>
          </div>
        </div>

        {/* CAPTAIN BADGES & RELIABILITY */}
        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
            <Trophy className="size-3.5 text-amber-500" />
            <span>Captain Performance Badges</span>
          </h4>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
              <div className="text-xl">⚡</div>
              <p className="text-[11px] font-black text-zinc-900">Speed Demon</p>
              <p className="text-[9px] text-zinc-500 font-medium">Under 20 min avg</p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
              <div className="text-xl">🛡️</div>
              <p className="text-[11px] font-black text-zinc-900">Zero Fault</p>
              <p className="text-[9px] text-zinc-500 font-medium">0 delivery issues</p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
              <div className="text-xl">🌟</div>
              <p className="text-[11px] font-black text-zinc-900">5-Star Rider</p>
              <p className="text-[9px] text-zinc-500 font-medium">Top rated in city</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Nav */}
      <RiderBottomNav active="history" />
    </div>
  );
}
