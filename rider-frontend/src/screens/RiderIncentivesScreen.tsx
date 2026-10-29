import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Headphones,
  Lock,
  Minus,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderIncentives,
  claimRiderIncentive,
  type RiderIncentivesResponse,
  type CandyCrushLevel,
} from "../api/rider/rider-incentives-api";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { triggerHaptic, playSuccessChime, speakText } from "../lib/captain-audio";
import { useLanguage } from "../lib/i18n";

type TabKey = "milestones" | "quests" | "streak" | "calculator";

interface MilestoneLevel {
  level: number;
  title: string;
  target: number;
  reward: number;
  description: string;
}

const DEFAULT_MILESTONE_LEVELS: MilestoneLevel[] = [
  {
    level: 1,
    title: "Level 1: Starter Target",
    target: 1,
    reward: 25.0,
    description: "Complete 1st delivery today to activate daily bonus streak",
  },
  {
    level: 2,
    title: "Level 2: City Cruiser",
    target: 3,
    reward: 60.0,
    description: "3 completed deliveries across Kasganj market hub",
  },
  {
    level: 3,
    title: "Level 3: Speedster Milestone",
    target: 5,
    reward: 120.0,
    description: "5 deliveries! Qualifies for speed and fuel cash bonus",
  },
  {
    level: 4,
    title: "Level 4: Express Milestone",
    target: 8,
    reward: 200.0,
    description: "8 deliveries completed with on-time delivery guarantee",
  },
  {
    level: 5,
    title: "Level 5: Master Champion",
    target: 12,
    reward: 350.0,
    description: "12 deliveries! Elite captain jackpot with weekly bonus multiplier",
  },
];

export function RiderIncentivesScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabKey>("milestones");
  const [data, setData] = useState<RiderIncentivesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);

  // Earnings Simulator State
  const [calcTrips, setCalcTrips] = useState<number>(8);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Countdown timer until 11:59:59 PM reset
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diffMs = Math.max(0, endOfDay.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeLeft(
        `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetchRiderIncentives();
      if (res) {
        setData(res);
        try {
          localStorage.setItem("qp_cached_incentives", JSON.stringify(res));
        } catch {}
      }
    } catch {
      try {
        const raw = localStorage.getItem("qp_cached_incentives");
        if (raw) setData(JSON.parse(raw));
      } catch {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaimMilestone = async (level: number) => {
    try {
      setClaimingLevel(level);
      triggerHaptic([40, 60, 100]);
      const res = await claimRiderIncentive(level);
      if (res && res.success) {
        playSuccessChime();
        speakText(`Milestone claimed. ₹${res.claimedAmount || 50} added to your wallet.`);
        toast.success(`Milestone Claimed! ₹${res.claimedAmount || 50} credited to wallet`);
        await loadData(true);
      } else {
        toast.error(res?.message || "Milestone not yet completed");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not claim milestone incentive");
    } finally {
      setClaimingLevel(null);
    }
  };

  const calculatedEarnings = useMemo(() => {
    const trips = Math.max(0, calcTrips);
    const avgFarePerTrip = 42;
    const baseFare = trips * avgFarePerTrip;

    let milestoneBonus = 0;
    if (trips >= 15) milestoneBonus = 450;
    else if (trips >= 10) milestoneBonus = 250;
    else if (trips >= 5) milestoneBonus = 100;

    let surgeAndQuests = 0;
    if (trips >= 5) surgeAndQuests += 100;
    if (trips >= 8) surgeAndQuests += 50;

    const total = baseFare + milestoneBonus + surgeAndQuests;
    const effectivePerTrip = trips > 0 ? Math.round(total / trips) : 0;

    return {
      trips,
      baseFare,
      milestoneBonus,
      surgeAndQuests,
      total,
      effectivePerTrip,
    };
  }, [calcTrips]);

  const completedToday = Number(data?.completedToday ?? 0);
  const totalIncentives = Number(data?.totalIncentivesEarnedToday ?? 0);
  const quests = data?.specialQuests ?? [];
  const surgeZones = data?.surgeZones ?? [];
  const weeklyStreak = data?.weeklyStreak;

  // Derive milestones list
  const activeMilestones = useMemo(() => {
    if (data?.candyCrushLevels && data.candyCrushLevels.length > 0) {
      return data.candyCrushLevels.map((lvl) => ({
        level: lvl.level,
        title: lvl.title || `Level ${lvl.level}`,
        target: lvl.target,
        reward: lvl.reward,
        description: lvl.description,
        isClaimed: lvl.isClaimed,
        isClaimable: lvl.isClaimable,
        progress: lvl.progress,
        progressPercent: lvl.progressPercent,
      }));
    }
    return DEFAULT_MILESTONE_LEVELS.map((lvl) => {
      const isClaimed = completedToday >= lvl.target && completedToday > 0;
      const isClaimable = completedToday >= lvl.target && !isClaimed;
      const progress = Math.min(completedToday, lvl.target);
      const progressPercent = Math.min(100, Math.round((progress / lvl.target) * 100));
      return {
        ...lvl,
        isClaimed,
        isClaimable,
        progress,
        progressPercent,
      };
    });
  }, [data?.candyCrushLevels, completedToday]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 select-none font-sans pb-32">
      {/* 1. TOP HEADER (Notch Safe: Padding on Header so it NEVER clips when scrolling) */}
      <header
        className="sticky top-0 z-40 bg-[#F8F9FA] border-b border-slate-200/80 px-4 pb-0 shadow-2xs"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 48px)" }}
      >
        <div className="mx-auto max-w-lg flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                navigate({ to: "/dashboard" });
              }}
              className="flex size-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="size-5 stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-950">
                Incentives & Targets
              </h1>
              <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Clock className="size-3 text-amber-500" />
                <span>Resets in: {timeLeft || "01h 45m"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                navigate({ to: "/help" });
              }}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 active:scale-95 transition shadow-2xs cursor-pointer"
            >
              <Headphones className="size-3.5 stroke-[2.2] text-slate-700" />
              <span>Help</span>
            </button>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              className={`flex size-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 active:scale-95 transition shadow-2xs cursor-pointer ${
                refreshing ? "animate-spin text-amber-600" : ""
              }`}
              title="Refresh Incentives"
            >
              <RefreshCw className="size-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* 4 SUB-TABS WITH WARM GOLDEN YELLOW UNDERLINE (Screenshot 2 & 3 Match) */}
        <div className="mx-auto max-w-lg grid grid-cols-4 text-center text-xs font-bold border-t border-slate-200/80">
          {[
            { id: "milestones", label: "Milestones" },
            { id: "quests", label: "Quests" },
            { id: "streak", label: "Streak" },
            { id: "calculator", label: "Calculator" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setActiveTab(tab.id as TabKey);
                }}
                className={`py-3 relative cursor-pointer transition-colors ${
                  active ? "text-slate-950 font-black" : "text-slate-500 hover:text-slate-800 font-bold"
                }`}
              >
                <span>{tab.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#FFC700] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT */}
      <main className="mx-auto max-w-lg px-4 pt-3 space-y-3.5">
        {/* SUMMARY 2-COLUMN METRICS CARD (Exact match to Screenshot 2 & 3) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="grid grid-cols-2 divide-x divide-slate-100 text-center">
            <div className="pr-2">
              <span className="text-2xl font-black text-slate-950 tracking-tight">
                {completedToday}
              </span>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Completed Orders
              </p>
            </div>
            <div className="pl-2">
              <span className="text-2xl font-black text-slate-950 tracking-tight">
                ₹{totalIncentives.toFixed(0)}
              </span>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Bonus Unlocked
              </p>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5">
              <span>0 Rides</span>
              <span className={completedToday >= 5 ? "text-emerald-700 font-black" : ""}>5 (₹100)</span>
              <span className={completedToday >= 10 ? "text-emerald-700 font-black" : "text-amber-700"}>10 (₹250)</span>
              <span className={completedToday >= 15 ? "text-emerald-700 font-black" : ""}>15 (₹450)</span>
            </div>

            <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-950 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((completedToday / 15) * 100))}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-2 text-[10px] font-semibold text-slate-500">
              <span className="text-emerald-700 font-bold">
                {completedToday >= 5
                  ? "✓ Tier 1 Unlocked (₹100 credited)"
                  : `${5 - completedToday} more deliveries for Tier 1 bonus`}
              </span>
              <span>{Math.max(0, 10 - completedToday)} trips for next slab</span>
            </div>
          </div>
        </div>

        {/* READY TO CLAIM NOTIFICATION BANNER */}
        {(data?.totalClaimableIncentives ?? 0) > 0 && (
          <div className="p-4 rounded-2xl bg-white border border-amber-300 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-black shrink-0">
                <Award className="size-5 text-amber-700" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-950">
                  ₹{Number(data?.totalClaimableIncentives).toFixed(0)} Ready to Claim
                </h4>
                <p className="text-xs text-slate-500">
                  Tap below to instantly credit bonus to your wallet
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("milestones")}
              className="px-3 py-1.5 rounded-full bg-slate-950 text-white text-xs font-bold active:scale-95 transition cursor-pointer"
            >
              Claim
            </button>
          </div>
        )}

        {/* VIDEO TUTORIAL CARD (Screenshot 1 Style) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHaptic(20);
            window.open("https://youtube.com/@QuickPressApp", "_blank");
          }}
          className="flex items-center justify-between p-4 bg-[#F6F4FF] rounded-2xl border border-purple-100 hover:border-purple-200 active:scale-99 transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 items-center justify-center rounded-full bg-red-600 text-white shadow-2xs shrink-0">
              <div className="size-4 rounded-full border-2 border-white flex items-center justify-center">
                <Play className="size-2 fill-white ml-0.5" />
              </div>
            </div>

            <div className="min-w-0 pr-2">
              <h3 className="text-sm font-black text-slate-950 leading-snug">
                How Daily Incentives & Slabs Work
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                Watch 1-min quick guide on milestone payouts & streak jackpots
              </p>
            </div>
          </div>

          <ChevronRight className="size-5 text-slate-400 shrink-0" />
        </div>

        {/* TAB 1: DAILY MILESTONE TARGETS (Speed-First, Pure White Clean Cards, Zero Cartoon Fluff) */}
        {activeTab === "milestones" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Daily Milestone Targets
              </h3>
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                0% Commission Guarantee
              </span>
            </div>

            <div className="space-y-2.5">
              {activeMilestones.map((m) => {
                const isReached = completedToday >= m.target;
                const progress = Math.min(completedToday, m.target);
                const percent = Math.min(100, Math.round((progress / m.target) * 100));

                return (
                  <div
                    key={m.level}
                    className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex size-10 items-center justify-center rounded-xl shrink-0 font-black text-sm ${
                            isReached
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {isReached ? <CheckCircle2 className="size-5 text-emerald-600" /> : m.level}
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-slate-950 leading-tight">
                            {m.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            {m.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-emerald-700">
                          +₹{Number(m.reward).toFixed(0)}
                        </span>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                          {m.target} {m.target === 1 ? "Trip" : "Trips"}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Progress: {progress}/{m.target} orders</span>
                        <span className="text-slate-950 font-bold">{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-950 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">
                        {isReached ? "Milestone Unlocked" : `${m.target - progress} more to unlock`}
                      </span>

                      {isReached ? (
                        m.isClaimed ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            Claimed ✓
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={claimingLevel === m.level}
                            onClick={() => handleClaimMilestone(m.level)}
                            className="px-4 py-1.5 rounded-full bg-slate-950 text-white text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
                          >
                            {claimingLevel === m.level ? "Claiming..." : `Claim ₹${m.reward}`}
                          </button>
                        )
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                          <Lock className="size-3 text-slate-400" />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: SPECIAL FLASH QUESTS */}
        {activeTab === "quests" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Special Flash Quests
              </h3>
              <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Active Today
              </span>
            </div>

            <div className="space-y-2.5">
              {quests.map((q) => (
                <div
                  key={q.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 shrink-0 mt-0.5">
                        <Zap className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-slate-950">
                            {q.title}
                          </h4>
                          {q.tag && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {q.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{q.desc}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-700">
                        +₹{Number(q.reward || 0).toFixed(0)}
                      </span>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                        {q.expiresIn}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-medium">
                      Status: <strong className="text-slate-900">{q.progress}/{q.target}</strong> trips
                    </span>
                    {q.completed ? (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Completed
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Live Surge Zones */}
            {Boolean(surgeZones && surgeZones.length > 0) && (
              <div className="mt-4 pt-2">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Kasganj Surge Zones
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600">LIVE DEMAND</span>
                </div>

                <div className="space-y-2">
                  {surgeZones.map((z) => (
                    <div
                      key={z.id}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-950">
                            {z.name}
                          </h4>
                          {z.isActive && (
                            <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              {z.multiplier}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {z.activeTiming} · {z.demandLevel}
                        </p>
                      </div>

                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        +₹{Number(z.bonusPerTrip || 0).toFixed(0)}/trip
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WEEKLY 6-DAY DUTY STREAK */}
        {activeTab === "streak" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Weekly 6-Day Duty Streak
              </h3>
              <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                ₹500 Mega Reward
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Active Streak
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-950">
                      {weeklyStreak?.completedDays ?? 0} / {weeklyStreak?.targetDays ?? 6} Days
                    </span>
                    <span className="text-xs font-bold text-slate-500">Completed</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Complete 6 duty days this week to unlock ₹500 Mega Reward
                  </p>
                </div>

                <div className="size-11 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <Trophy className="size-5 text-amber-600" />
                </div>
              </div>

              {/* 7 Days Stepper */}
              <div className="grid grid-cols-7 gap-1.5 mt-4">
                {(weeklyStreak?.days ?? []).map((d, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all ${
                      d.met
                        ? "bg-slate-950 text-white border-slate-950 shadow-2xs"
                        : d.isToday
                        ? "bg-amber-50 text-amber-900 border-amber-300 font-bold"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase">{d.day}</span>
                    <div className="mt-1">
                      {d.met ? (
                        <CheckCircle2 className="size-3.5 text-white mx-auto" />
                      ) : (
                        <span className="text-[11px] font-bold text-slate-700">{d.trips || "-"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak Guidelines */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
              <h4 className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Streak Rules & Eligibility</span>
              </h4>
              <ul className="text-[11px] text-slate-600 space-y-1.5 list-disc pl-4 font-medium">
                <li>Complete minimum 5 deliveries on any 6 days in a week.</li>
                <li>Streak week runs from Monday 00:00 AM to Sunday 11:59 PM.</li>
                <li>₹500 bonus is auto-credited to your settlement wallet.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 4: CALCULATOR */}
        {activeTab === "calculator" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Daily Earnings Simulator
              </h3>
              <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Instant Calculation
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 flex justify-between items-center">
                  <span>Deliveries Planned Today:</span>
                  <span className="text-base font-black text-slate-950">
                    {calcTrips} Rides
                  </span>
                </label>

                <div className="flex items-center justify-center gap-4 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setCalcTrips((prev) => Math.max(1, prev - 1));
                    }}
                    className="size-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center active:scale-95 transition cursor-pointer"
                  >
                    <Minus className="size-4" />
                  </button>

                  <div className="w-24 text-center">
                    <span className="text-3xl font-black text-slate-950">{calcTrips}</span>
                    <p className="text-[10px] text-slate-500 font-semibold">trips</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setCalcTrips((prev) => Math.min(30, prev + 1));
                    }}
                    className="size-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <div className="flex justify-center gap-2 mt-3">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        triggerHaptic(20);
                        setCalcTrips(num);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                        calcTrips === num
                          ? "bg-slate-950 text-white border-slate-950"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {num} Rides
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Base Trip Fares (~₹42/ride)</span>
                  <span className="font-bold text-slate-900">₹{calculatedEarnings.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Daily Milestone Target Bonus</span>
                  <span className="font-bold text-emerald-600">+₹{calculatedEarnings.milestoneBonus.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Peak Rush & Surge Quests</span>
                  <span className="font-bold text-amber-600">+₹{calculatedEarnings.surgeAndQuests.toFixed(2)}</span>
                </div>
                <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-950">
                  <span>Total Take-Home Pay</span>
                  <span className="text-xl text-emerald-700">₹{calculatedEarnings.total.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-[10px] text-center text-slate-500 font-medium">
                Effective Captain Earning: ~₹{calculatedEarnings.effectivePerTrip} per completed delivery
              </p>
            </div>
          </div>
        )}

        {/* BOTTOM CTA: GO ONLINE & START TARGET */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(30);
              navigate({ to: "/dashboard" });
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-98 text-white font-black text-sm shadow-xs transition cursor-pointer"
          >
            <Compass className="size-4" />
            <span>Go Online & Complete Today's Target</span>
          </button>
        </div>
      </main>

      {/* 3. BOTTOM NAVIGATION */}
      <RiderBottomNav active="dashboard" />
    </div>
  );
}
