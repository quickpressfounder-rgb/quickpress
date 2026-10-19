import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Award,
  ChevronRight,
  Crown,
  Headphones,
  HelpCircle,
  MapPin,
  Medal,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchCityLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardResponse,
} from "../api/rider/rider-leaderboard-api";
import { useRiderContext } from "../context/RiderContext";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { CaptainSupportModal } from "../components/support/CaptainSupportModal";
import { triggerHaptic } from "../lib/captain-audio";
import { useLanguage } from "../lib/i18n";

export function RiderLeaderboardScreen() {
  const navigate = useNavigate();
  const { session } = useRiderContext();
  const { t } = useLanguage();

  const [period, setPeriod] = useState<LeaderboardPeriod>("today");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Preferred or current city
  const captainCity = session?.city || "Kasganj";

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetchCityLeaderboard(period, captainCity);
        setData(res);
        if (isRefresh) {
          triggerHaptic();
          toast.success(t("leaderboard.synced") || "Leaderboard Updated 🏆");
        }
      } catch {
        toast.error("Failed to load leaderboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, captainCity, t]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const myRank = data?.myRank;
  const topThree = data?.topThree || [];
  const leaderboard = data?.leaderboard || [];

  const rank1 = topThree.find((c) => c.rank === 1);
  const rank2 = topThree.find((c) => c.rank === 2);
  const rank3 = topThree.find((c) => c.rank === 3);

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] shadow-xl overflow-hidden text-zinc-800 select-none font-sans">
      {/* 1. Header Bar matching Rapido / QuickPress Wallet Screen */}
      <header
        className="sticky top-0 z-30 bg-white border-b border-zinc-200/70 shadow-2xs shrink-0 select-none"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 48px)" }}
      >
        <div className="flex items-center justify-between px-4 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/dashboard" })}
              className="p-1.5 -ml-1 text-zinc-900 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-6 text-zinc-950 stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-zinc-950 flex items-center gap-1.5">
                <span>{t("nav.leaderboard") || "Leaderboard"}</span>
                <span className="flex size-2 rounded-full bg-amber-500" />
              </h1>
              <p className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                <MapPin className="size-3 text-amber-500" />
                <span>{data?.city || captainCity} Hub · Real Captains</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setIsHelpOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-95 transition-all text-xs font-bold text-zinc-900 shadow-2xs cursor-pointer"
            >
              <Headphones className="size-3.5 text-zinc-700" />
              <span>Help</span>
            </button>

            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 text-black hover:bg-zinc-100 rounded-xl active:scale-95 transition-all"
              title="Refresh Leaderboard"
            >
              <RefreshCw className={`size-4 text-black ${refreshing ? "animate-spin text-amber-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* 3 Sub-Tabs matching Wallet Screen with Solid Yellow Underline */}
        <div className="grid grid-cols-3 text-center text-sm font-bold border-t border-zinc-100">
          {[
            { id: "today", label: "Today" },
            { id: "weekly", label: "This Week" },
            { id: "all_time", label: "All Time" },
          ].map((tab) => {
            const active = period === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setPeriod(tab.id as LeaderboardPeriod);
                }}
                className={`py-3 relative cursor-pointer transition-colors ${
                  active ? "text-zinc-950 font-black" : "text-zinc-500 hover:text-zinc-800 font-bold"
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

      {/* 2. Scrollable Body Content */}
      <div
        className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#F8F9FA]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
      >
        {/* MY CURRENT RANK HERO CARD */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-zinc-500">Your Current City Ranking</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                Active Contender ✓
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="size-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-black text-xl shadow-2xs">
                #{myRank?.rank ?? 1}
              </div>
              <div>
                <h2 className="text-2xl font-black text-zinc-950 tracking-tight">
                  Rank #{myRank?.rank ?? 1}
                </h2>
                <p className="text-[11px] text-zinc-500 font-medium">
                  {myRank?.bonusStatus || "Complete rides to climb the podium!"}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar with Hairline Dividers */}
          <div className="grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 bg-zinc-50/50 text-center py-3">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Completed Trips</p>
              <p className="text-sm font-black text-zinc-950 mt-0.5">{myRank?.trips ?? 0} Rides</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Estimated Pay</p>
              <p className="text-sm font-black text-emerald-700 mt-0.5">₹{Number(myRank?.earnings ?? 0).toFixed(0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Gap to Next</p>
              <p className="text-sm font-black text-amber-700 mt-0.5">{myRank?.gapToNextRank ?? 0} Trips</p>
            </div>
          </div>
        </div>

        {/* TOP 3 PODIUM (Olympic Style) */}
        {topThree.length > 0 ? (
          <div className="p-4 bg-white rounded-3xl border border-zinc-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-1.5">
                <Crown className="size-4 text-amber-500" />
                <h3 className="text-xs font-black text-zinc-900">City Podium Champions</h3>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Weekly Prize Pool
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 items-end">
              {/* Rank 2 (Silver - Left) */}
              {rank2 ? (
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="relative">
                    <div className="size-12 rounded-full bg-zinc-100 border-2 border-zinc-300 text-zinc-700 font-bold flex items-center justify-center text-sm shadow-xs overflow-hidden">
                      {(rank2 as any).photoUrl ? (
                        <img src={(rank2 as any).photoUrl} alt={rank2.name} className="size-full object-cover" />
                      ) : (
                        rank2.avatar || "CP"
                      )}
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-zinc-200 text-zinc-700 text-[10px] font-bold flex items-center justify-center border border-white">
                      2
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-900 truncate max-w-[85px]">
                    {rank2.name.replace(" (You)", "")}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md tracking-tight">
                    {rank2.trips} Trips
                  </span>
                  <div className="w-full h-16 bg-zinc-100 rounded-t-2xl flex flex-col items-center justify-center border-t-2 border-zinc-300 p-1">
                    <span className="text-xs">🥈</span>
                    <span className="text-[10px] font-bold text-zinc-700">₹300 Prize</span>
                  </div>
                </div>
              ) : (
                <div className="h-16 bg-zinc-50 rounded-t-2xl border border-dashed border-zinc-200 flex items-center justify-center text-[10px] text-zinc-400">
                  Open 🥈
                </div>
              )}

              {/* Rank 1 (Gold - Center / Tallest) */}
              {rank1 ? (
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="relative">
                    <div className="size-14 rounded-full bg-amber-100 border-2 border-amber-400 text-amber-900 font-extrabold flex items-center justify-center text-base shadow-sm overflow-hidden">
                      {(rank1 as any).photoUrl ? (
                        <img src={(rank1 as any).photoUrl} alt={rank1.name} className="size-full object-cover" />
                      ) : (
                        rank1.avatar || "CP"
                      )}
                    </div>
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-base">
                      👑
                    </span>
                    <span className="absolute -bottom-1 right-0 size-5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                      1
                    </span>
                  </div>
                  <p className="text-xs font-black text-zinc-900 truncate max-w-[95px]">
                    {rank1.name.replace(" (You)", "")}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md tracking-tight">
                    {rank1.trips} Trips
                  </span>
                  <div className="w-full h-22 bg-amber-50 rounded-t-2xl flex flex-col items-center justify-center border-t-2 border-amber-400 p-1 shadow-2xs">
                    <span className="text-sm">🥇</span>
                    <span className="text-[10px] font-black text-amber-950">₹500 Prize</span>
                  </div>
                </div>
              ) : (
                <div className="h-22 bg-amber-50/50 rounded-t-2xl border border-dashed border-amber-200 flex items-center justify-center text-[10px] text-amber-600 font-bold">
                  Open 🥇
                </div>
              )}

              {/* Rank 3 (Bronze - Right) */}
              {rank3 ? (
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="relative">
                    <div className="size-12 rounded-full bg-amber-50 border-2 border-amber-300 text-amber-800 font-bold flex items-center justify-center text-sm shadow-xs overflow-hidden">
                      {(rank3 as any).photoUrl ? (
                        <img src={(rank3 as any).photoUrl} alt={rank3.name} className="size-full object-cover" />
                      ) : (
                        rank3.avatar || "CP"
                      )}
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center border border-white">
                      3
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-900 truncate max-w-[85px]">
                    {rank3.name.replace(" (You)", "")}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md tracking-tight">
                    {rank3.trips} Trips
                  </span>
                  <div className="w-full h-12 bg-amber-50/60 rounded-t-2xl flex flex-col items-center justify-center border-t-2 border-amber-300 p-1">
                    <span className="text-xs">🥉</span>
                    <span className="text-[10px] font-bold text-amber-900">₹150 Prize</span>
                  </div>
                </div>
              ) : (
                <div className="h-12 bg-zinc-50 rounded-t-2xl border border-dashed border-zinc-200 flex items-center justify-center text-[10px] text-zinc-400">
                  Open 🥉
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 bg-white rounded-3xl border border-zinc-200 text-center space-y-2">
            <Trophy className="size-10 text-amber-400 mx-auto" />
            <p className="text-xs font-black text-zinc-800">
              No delivery records yet for this period
            </p>
            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
              Complete trips today to claim your position on the Kasganj city podium! 🛵
            </p>
          </div>
        )}

        {/* PRIZE POOL REWARDS CARD (Matching Wallet Lilac Explainer Banner) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EDE9FE] to-[#F5F3FF] border border-[#DDD6FE] text-zinc-900 shadow-2xs flex items-center justify-between cursor-pointer active:scale-98 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center shrink-0 shadow-xs font-black">
              <Trophy className="size-6 text-zinc-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-zinc-950 leading-snug">
                  Weekly ₹1,000 Prize Pool
                </h4>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300">
                  Active 🎯
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">
                Top 3 Captains win cash prizes directly into wallet every Sunday
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-zinc-500 shrink-0 ml-2" />
        </div>

        {/* FULL LEADERBOARD LIST (Matching Divided Row Action Card) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-zinc-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Medal className="size-4 text-emerald-600" />
              <span>All Ranked City Captains ({leaderboard.length})</span>
            </h3>
            <span className="text-[11px] font-bold text-zinc-400">Kasganj Zone</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-6 bg-white rounded-2xl border border-zinc-200 text-center text-xs text-zinc-400 font-medium shadow-2xs">
              Start delivering to appear on the city rank board!
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden divide-y divide-zinc-100">
              {leaderboard.map((captain, idx) => {
                const rank = captain.rank || idx + 1;
                const isMe = captain.isMe || captain.id === session?.riderId;

                return (
                  <div
                    key={captain.id || idx}
                    className={`p-4 transition-colors flex items-center justify-between ${
                      isMe ? "bg-amber-50/70" : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Position */}
                      <div
                        className={`size-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                          rank === 1
                            ? "bg-amber-400 text-zinc-950 shadow-xs"
                            : rank === 2
                            ? "bg-zinc-200 text-zinc-800"
                            : rank === 3
                            ? "bg-amber-100 text-amber-900"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                      </div>

                      {/* Captain Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={`text-sm font-bold truncate ${
                              isMe ? "text-amber-950 font-black" : "text-zinc-900"
                            }`}
                          >
                            {captain.name}
                          </p>
                          {isMe && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500 font-medium">
                          <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {captain.rating?.toFixed(1) || "4.9"}
                          </span>
                          <span>•</span>
                          <span>{captain.city || captainCity}</span>
                          <span>•</span>
                          <span className="text-zinc-600 font-semibold">{captain.badge || "Verified"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Score */}
                    <div className="text-right shrink-0 pl-2">
                      <p className="text-sm font-black text-zinc-950 tracking-tight">
                        {captain.trips} Trips
                      </p>
                      <p className="text-[11px] text-emerald-700 font-bold tracking-tight">
                        ₹{Number(captain.earnings || 0).toFixed(0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. 2-TAB BOTTOM NAVIGATION */}
      <RiderBottomNav active="dashboard" />

      {/* 4. Support Modal */}
      <CaptainSupportModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
