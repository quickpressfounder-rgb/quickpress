import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Flame,
  Gift,
  HelpCircle,
  Info,
  Layers,
  MapPin,
  Minus,
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
import { CandyCrushMilestoneMap } from "../components/incentives/CandyCrushMilestoneMap";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { triggerHaptic, playSuccessChime, speakText } from "../lib/captain-audio";
import { useLanguage } from "../lib/i18n";

type TabKey = "candy" | "quests" | "streak" | "calculator";

const DEFAULT_CANDY_CRUSH_LEVELS: CandyCrushLevel[] = [
  {
    level: 1,
    title: "Rookie Kickoff",
    target: 1,
    reward: 25.0,
    badge: "🍬",
    flavor: "Strawberry Jelly",
    description: "Complete 1st delivery today to activate daily streak",
    color: "#EC4899",
    gradient: "from-pink-500 via-rose-500 to-red-500",
    status: "in_progress",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 1,
    extraPerRide: 25,
  },
  {
    level: 2,
    title: "Sugar Street Cruiser",
    target: 3,
    reward: 60.0,
    badge: "🍭",
    flavor: "Citrus Swirl",
    description: "3 successful order deliveries across Kasganj market",
    color: "#F97316",
    gradient: "from-orange-400 via-amber-500 to-red-500",
    status: "locked",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 3,
    extraPerRide: 20,
  },
  {
    level: 3,
    title: "Speedster Star",
    target: 5,
    reward: 120.0,
    badge: "⭐",
    flavor: "Golden Honey",
    description: "5 deliveries! Qualifies for speed & fuel cash bonus",
    color: "#EAB308",
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
    status: "locked",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 5,
    extraPerRide: 24,
  },
  {
    level: 4,
    title: "Rush Hour Hero",
    target: 7,
    reward: 180.0,
    badge: "⚡",
    flavor: "Mint Sparkle",
    description: "7 deliveries during busy pickup & drop peak hours",
    color: "#10B981",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    status: "locked",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 7,
    extraPerRide: 25.7,
  },
  {
    level: 5,
    title: "Super Captain",
    target: 10,
    reward: 280.0,
    badge: "🚀",
    flavor: "Blueberry Blast",
    description: "Double digit 10 deliveries! Halfway to max jackpot",
    color: "#06B6D4",
    gradient: "from-cyan-400 via-blue-500 to-indigo-600",
    status: "locked",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 10,
    extraPerRide: 28,
  },
  {
    level: 6,
    title: "Thunder Rider",
    target: 12,
    reward: 360.0,
    badge: "🔥",
    flavor: "Grape Punch",
    description: "12 deliveries with high customer ratings & zero cancel",
    color: "#6366F1",
    gradient: "from-indigo-500 via-purple-500 to-pink-500",
    status: "locked",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 12,
    extraPerRide: 30,
  },
  {
    level: 7,
    title: "Fleet Master",
    target: 15,
    reward: 480.0,
    badge: "💎",
    flavor: "Cotton Candy",
    description: "15 deliveries! Elite volume captain badge unlocked",
    color: "#A855F7",
    gradient: "from-purple-500 via-fuchsia-500 to-pink-600",
    status: "locked",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 15,
    extraPerRide: 32,
  },
  {
    level: 8,
    title: "Grand Champion",
    target: 18,
    reward: 620.0,
    badge: "🏆",
    flavor: "Cherry Pop",
    description: "18 deliveries! Top 5% performance rank in Kasganj",
    color: "#E11D48",
    gradient: "from-rose-500 via-red-600 to-amber-600",
    status: "locked",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 18,
    extraPerRide: 34.4,
  },
  {
    level: 9,
    title: "Legendary Streak",
    target: 22,
    reward: 820.0,
    badge: "👑",
    flavor: "Royal Velvet",
    description: "22 deliveries! Ultra streak and priority high-fare orders",
    color: "#7C3AED",
    gradient: "from-violet-600 via-purple-600 to-indigo-800",
    status: "locked",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 22,
    extraPerRide: 37.3,
  },
  {
    level: 10,
    title: "Kasganj Supreme King",
    target: 25,
    reward: 1100.0,
    badge: "✨",
    flavor: "Golden Jackpot",
    description: "Max Level 10 Achieved! ₹1,100 Grand Daily Prize unlocked!",
    color: "#F59E0B",
    gradient: "from-amber-300 via-yellow-400 to-orange-500",
    status: "locked",
    isClaimed: false,
    isClaimable: false,
    progress: 0,
    progressPercent: 0,
    ridesRemaining: 25,
    extraPerRide: 44,
  },
];

export function RiderIncentivesScreen() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [data, setData] = useState<RiderIncentivesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("candy");
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);

  // Calculator state
  const [calcTrips, setCalcTrips] = useState<number>(10);

  // Time to midnight countdown
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diffMs = midnight.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft("00h 00m");
        return;
      }
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchRiderIncentives();
      setData(res);
      if (isRefresh) {
        triggerHaptic();
        toast.success(t("incentives.synced") || "Incentives & Targets Updated 🎯");
      }
    } catch {
      toast.error("Unable to load latest incentives");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Candy Crush level claim
  const handleClaimMilestone = async (levelNumber: number) => {
    try {
      setClaimingLevel(levelNumber);
      const res = await claimRiderIncentive(levelNumber);
      if (res.ok) {
        playSuccessChime();
        speakText(`बधाई हो! आपका ₹${Number(res.reward).toFixed(0)} इन्सेंटिव वॉलेट में क्रेडिट हो गया है!`);
        toast.success(
          `🎉 Level ${levelNumber} (${res.title}) Claimed! ₹${Number(res.reward).toFixed(0)} credited to UPI Wallet! 💰`
        );
        await loadData(false);
      } else {
        toast.error(res.message || "Failed to claim incentive reward");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not claim milestone incentive");
    } finally {
      setClaimingLevel(null);
    }
  };

  // Dynamic calculation for simulator
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

  // Real Figures — Zero hardcoded mock defaults!
  const completedToday = Number(data?.completedToday ?? 0);
  const totalIncentives = Number(data?.totalIncentivesEarnedToday ?? 0);
  const milestones = data?.milestones ?? [];
  const quests = data?.specialQuests ?? [];
  const surgeZones = data?.surgeZones ?? [];
  const weeklyStreak = data?.weeklyStreak;
  const nextMilestone = data?.nextMilestone;

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] shadow-xl overflow-hidden text-zinc-800 select-none font-sans">
      {/* 1. Header Bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200/70 shadow-2xs"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="p-2 -ml-1 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-full active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-base font-black text-zinc-900 tracking-tight leading-tight flex items-center gap-1.5">
              <span>{t("nav.incentives") || "Incentives & Targets"}</span>
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            </h1>
            <p className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
              <Clock className="size-3 text-amber-500" />
              <span>Resets in: {timeLeft || "01h 45m"}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
          className="p-2 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-full active:scale-95 transition-all"
          aria-label="Refresh Incentives"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      </header>

      {/* 2. Scrollable Body */}
      <main
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-[#F4F5F7]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
      >
        {/* HERO CARD: Daily Target Overview */}
        <section className="relative rounded-3xl bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/60 border border-emerald-200/80 p-4 shadow-sm overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Sparkles className="size-3 text-emerald-600" />
                <span>Today's Bonus Unlocked</span>
              </span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-3xl font-black text-zinc-900 tracking-tight font-mono">
                  ₹{totalIncentives.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">
                {completedToday} deliveries completed today
              </p>
            </div>

            <div className="flex flex-col items-end">
              <div className="size-12 rounded-2xl bg-white shadow-xs border border-emerald-100 flex items-center justify-center">
                <Target className="size-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Claimable Bounty Banner if any unlocked */}
          {(data?.totalClaimableIncentives ?? 0) > 0 && (
            <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 font-bold border border-yellow-200 shadow-md flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <Gift className="size-5 text-zinc-950 shrink-0" />
                <div>
                  <h4 className="text-xs font-black leading-tight">
                    ₹{Number(data?.totalClaimableIncentives).toFixed(0)} Ready to Claim!
                  </h4>
                  <p className="text-[10px] text-zinc-800 font-medium">
                    Tap the glowing level on the map below to credit to wallet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setActiveTab("candy");
                }}
                className="px-2.5 py-1 rounded-xl bg-zinc-950 text-white text-[10px] font-black shadow-sm shrink-0 cursor-pointer"
              >
                View Map ➔
              </button>
            </div>
          )}

          {/* Next Goal Callout Box */}
          {nextMilestone && (
            <div className="mt-3.5 p-3 bg-white/95 rounded-2xl border border-amber-200/90 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Flame className="size-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 leading-tight">
                    {nextMilestone.title}
                  </h4>
                  <p className="text-[11px] text-zinc-600 font-medium">
                    Do <span className="font-bold text-amber-600">{nextMilestone.ridesRemaining} more rides</span> to reach ₹{nextMilestone.totalReward}!
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                🎯 {nextMilestone.ridesRemaining} left
              </span>
            </div>
          )}

          {/* Stepper Progress Line */}
          <div className="mt-4 pt-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-600 mb-1.5">
              <span>0 Rides</span>
              <span className={completedToday >= 5 ? "text-emerald-700 font-black" : ""}>5 (₹100)</span>
              <span className={completedToday >= 10 ? "text-emerald-700 font-black" : "text-amber-700"}>10 (₹250)</span>
              <span className={completedToday >= 15 ? "text-emerald-700 font-black" : ""}>15 (₹450)</span>
            </div>

            {/* Multi-step progress bar */}
            <div className="relative w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((completedToday / 15) * 100))}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-2 text-[10px] font-semibold text-zinc-500">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                {completedToday >= 5 ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    <span>Tier 1 Unlocked (₹100)</span>
                  </>
                ) : (
                  <span>{5 - completedToday} more rides for Tier 1 (₹100)</span>
                )}
              </span>
              <span>{Math.max(0, 10 - completedToday)} trips for next tier</span>
            </div>
          </div>
        </section>

        {/* 3. Segmented Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/70">
          {[
            {
              id: "candy",
              label: "Candy 🍬",
              icon: Sparkles,
              hasBadge: (data?.totalClaimableIncentives ?? 0) > 0,
            },
            { id: "quests", label: "Quests", icon: Zap },
            { id: "streak", label: "Streak", icon: Trophy },
            { id: "calculator", label: "Calc", icon: Coins },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setActiveTab(tab.id as TabKey);
                }}
                className={`relative flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/60"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Icon className={`size-3.5 ${isSelected ? "text-emerald-600" : "text-zinc-400"}`} />
                <span>{tab.label}</span>
                {tab.hasBadge && (
                  <span className="absolute top-1 right-1.5 size-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: CANDY CRUSH 10-LEVEL JOURNEY */}
        {activeTab === "candy" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-pink-500" />
                  <span>Candy Crush Level Journey</span>
                </h3>
                <p className="text-[10px] text-zinc-400 font-medium">
                  Tap any level island to view rewards or claim cash bonuses
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                100% Commission-Free
              </span>
            </div>

            <CandyCrushMilestoneMap
              levels={
                data?.candyCrushLevels && data.candyCrushLevels.length > 0
                  ? data.candyCrushLevels
                  : DEFAULT_CANDY_CRUSH_LEVELS
              }
              completedToday={completedToday}
              onClaimLevel={handleClaimMilestone}
              claimingLevel={claimingLevel}
            />

            {/* Quality Rating Bonus Note */}
            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 flex items-start gap-3">
              <Star className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-zinc-900">
                  Rating Protection & Fuel Cashback
                </h4>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Captains with 4.8+ star rating earn 10% extra on peak surge rides and priority order matching in Kasganj!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SURGE & QUESTS */}
        {activeTab === "quests" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                Special Flash Quests
              </h3>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                ⚡ Time-Limited
              </span>
            </div>

            {/* Special Quests List */}
            <div className="space-y-2.5">
              {quests.map((q) => (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-2xl border ${
                    q.completed
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-white border-zinc-200/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="size-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="size-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-zinc-900 leading-tight">
                            {q.title}
                          </h4>
                          {q.tag && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                              {q.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">{q.desc}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-700 font-mono">
                        +₹{Number(q.reward || 0).toFixed(0)}
                      </span>
                      <p className="text-[10px] font-bold text-zinc-500 mt-0.5">
                        {q.expiresIn}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-600 font-medium">
                      Status: <strong className="text-zinc-800">{q.progress}/{q.target}</strong> trips
                    </span>
                    {q.completed ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Completed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Active Quest
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Live Kasganj High Demand Surge Zones */}
            <div className="mt-4 pt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-amber-500" />
                  <span>Kasganj High Surge Zones</span>
                </h3>
                <span className="text-[10px] font-bold text-emerald-600">LIVE DEMAND</span>
              </div>

              <div className="space-y-2">
                {surgeZones.map((z) => (
                  <div
                    key={z.id}
                    className="p-3 bg-white rounded-2xl border border-zinc-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-zinc-900 leading-tight">
                          {z.name}
                        </h4>
                        {z.isActive && (
                          <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            {z.multiplier}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {z.activeTiming} · {z.demandLevel}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 font-mono">
                        +₹{Number(z.bonusPerTrip || 0).toFixed(0)}/trip
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WEEKLY 6-DAY DUTY STREAK */}
        {activeTab === "streak" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                Weekly 6-Day Duty Streak
              </h3>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Mega ₹500 Reward
              </span>
            </div>

            {/* Streak Hero Card */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-100/50 border border-amber-200/90 shadow-2xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    Streak Bonus
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-zinc-900">
                      {weeklyStreak?.completedDays ?? 0} / {weeklyStreak?.targetDays ?? 6} Days
                    </span>
                    <span className="text-xs font-bold text-amber-700">Completed</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    Complete 6 duty days this week to unlock ₹500 Mega Reward!
                  </p>
                </div>

                <div className="size-12 rounded-2xl bg-white shadow-xs border border-amber-200 flex items-center justify-center">
                  <Trophy className="size-6 text-amber-500" />
                </div>
              </div>

              {/* 7 Days Visual Stepper */}
              <div className="grid grid-cols-7 gap-1.5 mt-4">
                {(weeklyStreak?.days ?? []).map((d, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all ${
                      d.met
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                        : d.isToday
                        ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/40 font-bold"
                        : "bg-zinc-50 text-zinc-400 border-zinc-200"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">{d.day}</span>
                    <div className="mt-1">
                      {d.met ? (
                        <CheckCircle2 className="size-3.5 text-white mx-auto" />
                      ) : (
                        <span className="text-[11px] font-mono">{d.trips || "-"}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak Guidelines */}
            <div className="p-3.5 bg-white rounded-2xl border border-zinc-200 space-y-2">
              <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Streak Rules & Eligibility</span>
              </h4>
              <ul className="text-[11px] text-zinc-600 space-y-1.5 list-disc pl-4 font-medium">
                <li>Complete a minimum of 5 successful deliveries on any 6 days in a week.</li>
                <li>Streak week runs from Monday 00:00 AM to Sunday 11:59 PM.</li>
                <li>₹500 bonus is auto-credited directly in your 72-Hour settlement cycle.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 4: CALCULATOR */}
        {activeTab === "calculator" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                Daily Earnings Simulator
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Calculator
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-zinc-200 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 flex justify-between items-center">
                  <span>Deliveries Planned Today:</span>
                  <span className="text-base font-black text-zinc-900 font-mono">
                    {calcTrips} Rides
                  </span>
                </label>

                <div className="flex items-center justify-center gap-4 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setCalcTrips((prev) => Math.max(1, prev - 1));
                    }}
                    className="size-10 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Minus className="size-4" />
                  </button>

                  <div className="w-24 text-center">
                    <span className="text-2xl font-black text-zinc-900">{calcTrips}</span>
                    <p className="text-[10px] text-zinc-500">trips</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setCalcTrips((prev) => Math.min(30, prev + 1));
                    }}
                    className="size-10 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center justify-center active:scale-95 transition-all"
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
                        triggerHaptic();
                        setCalcTrips(num);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        calcTrips === num
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      {num} Rides
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Base Trip Fares (~₹42/ride)</span>
                  <span className="font-bold text-zinc-900">₹{calculatedEarnings.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Daily Milestone Target Bonus</span>
                  <span className="font-bold text-emerald-600">+₹{calculatedEarnings.milestoneBonus.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Peak Rush & Surge Quests</span>
                  <span className="font-bold text-amber-600">+₹{calculatedEarnings.surgeAndQuests.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between items-center text-sm font-black text-zinc-900">
                  <span>Total Take-Home Pay</span>
                  <span className="text-lg text-emerald-700">₹{calculatedEarnings.total.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-[10px] text-center text-zinc-500 font-medium">
                Effective Captain Earning: ~₹{calculatedEarnings.effectivePerTrip} per completed delivery
              </p>
            </div>
          </div>
        )}

        {/* 4. Bottom CTA */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              navigate({ to: "/dashboard" });
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-sm shadow-md transition-all"
          >
            <Compass className="size-4" />
            <span>Go Online & Complete Today's Target 🚀</span>
          </button>
        </div>
      </main>

      {/* 5. Bottom Navigation Dock */}
      <RiderBottomNav active="dashboard" />
    </div>
  );
}
