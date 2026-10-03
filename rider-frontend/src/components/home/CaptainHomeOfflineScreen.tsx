import React from "react";
import {
  ArrowRight,
  Bike,
  ChevronRight,
  Flame,
  HelpCircle,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useLanguage } from "../../lib/i18n";
import { triggerHaptic } from "../../lib/captain-audio";

interface CaptainHomeOfflineScreenProps {
  todayEarnings: number;
  todayDeliveries: number;
  captainName?: string;
  onGoOnline: () => void;
  onOpenWorkZoneInfo?: () => void;
}

export const CaptainHomeOfflineScreen: React.FC<CaptainHomeOfflineScreenProps> = ({
  todayEarnings = 0,
  todayDeliveries = 0,
  captainName = "Captain",
  onGoOnline,
  onOpenWorkZoneInfo,
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const firstName = captainName.split(" ")[0] || "Captain";
  const initial = firstName.charAt(0).toUpperCase();

  const handleStartDuty = () => {
    try {
      triggerHaptic();
    } catch {}
    onGoOnline();
  };

  return (
    <div
      className="flex flex-col flex-1 w-full h-full bg-slate-50/70 text-zinc-900 select-none overflow-y-auto"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
    >
      <div className="p-4 space-y-4">
        {/* 1. Captain Profile & Status Card */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-4.5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="relative flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 font-black text-white text-lg shadow-md ring-2 ring-zinc-200">
                <span>{initial}</span>
                <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-white bg-zinc-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                    Verified Captain
                  </span>
                </div>
                <h1 className="mt-1 text-base font-black tracking-tight text-zinc-900">
                  {captainName}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-800 border border-amber-200/60">
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                    4.94 Rating
                  </span>
                  <span className="text-zinc-300">·</span>
                  <span className="text-xs font-bold text-zinc-600">
                    Kasganj Fleet 🛵
                  </span>
                </div>
              </div>
            </div>

            <span className="rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-600">
              Offline
            </span>
          </div>
        </div>

        {/* 2. Duty Hero Card (Central Glowing Action Card) */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-950/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/40 p-5 text-white shadow-xl shadow-emerald-950/15">
          {/* Subtle Background Glow Rings */}
          <div className="absolute -top-12 -right-12 size-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 size-28 rounded-full bg-teal-500/10 blur-xl pointer-events-none" />

          <div className="relative flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black tracking-wider uppercase text-zinc-200 border border-white/10">
                <Radio className="size-3 text-emerald-400 animate-pulse" />
                <span>Ready for Dispatches</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">
                Go On Duty to Earn
              </h2>
              <p className="text-xs text-zinc-300 max-w-xs leading-relaxed font-medium">
                Turn on duty to receive instant doorstep laundry pickup & delivery tasks nearby.
              </p>
            </div>
            <div className="relative flex size-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-400 border border-white/15 shrink-0 shadow-inner">
              <Bike className="size-6" />
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
          </div>

          <div className="relative mt-5 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleStartDuty}
              className="relative w-full overflow-hidden flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-300 py-3.5 px-4 font-black text-sm text-zinc-950 shadow-lg shadow-emerald-500/30 active:scale-98 transition-all cursor-pointer"
            >
              <span>Go On Duty Now</span>
              <ArrowRight className="size-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 3. Today's Performance 3-Stat Modern Cards Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Stat 1: Earnings */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Earnings</span>
              <div className="size-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg font-black tracking-tight text-zinc-950">
              ₹{todayEarnings.toFixed(0)}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-emerald-700 truncate">
              0% Commission
            </p>
          </div>

          {/* Stat 2: Deliveries */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Trips</span>
              <div className="size-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Navigation className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg font-black tracking-tight text-zinc-950">
              {todayDeliveries}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-zinc-500 truncate">
              Completed
            </p>
          </div>

          {/* Stat 3: Surge Bonus */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs hover:shadow-xs transition-all">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Bonus</span>
              <div className="size-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Flame className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg font-black tracking-tight text-amber-700">
              +₹20
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-amber-800 truncate">
              Per trip surge
            </p>
          </div>
        </div>

        {/* 4. Active Work Zone & High Demand Card */}
        <div
          onClick={onOpenWorkZoneInfo}
          className="rounded-3xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50/70 p-4 shadow-2xs cursor-pointer hover:border-emerald-400 active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10.5 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                <MapPin className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-emerald-950">
                    Kasganj Central Work Zone
                  </span>
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="mt-0.5 text-[11px] text-emerald-800 font-medium">
                  High demand active · Extra ₹20 bonus on all store pickups
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-emerald-700" />
          </div>
        </div>

        {/* 5. Quick Shortcuts Grid (Wallet, Targets, Leaderboard, Support) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">
              Quick Actions
            </h3>
            <span className="text-[10px] font-bold text-zinc-400">Fast Navigation</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Wallet Tile */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate({ to: "/wallet" });
              }}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5 text-left shadow-2xs hover:border-zinc-300 hover:shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <div className="flex size-9.5 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Wallet className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-900">Wallet & Payouts</p>
                <p className="text-[10px] text-emerald-700 font-medium truncate">Direct Bank Payout</p>
              </div>
            </button>

            {/* Daily Targets Tile */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate({ to: "/incentives" });
              }}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5 text-left shadow-2xs hover:border-zinc-300 hover:shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <div className="flex size-9.5 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Target className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-900">Daily Targets</p>
                <p className="text-[10px] text-amber-700 font-medium truncate">Earn up to ₹350</p>
              </div>
            </button>

            {/* Leaderboard Tile */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                navigate({ to: "/leaderboard" });
              }}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5 text-left shadow-2xs hover:border-zinc-300 hover:shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <div className="flex size-9.5 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Trophy className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-900">Leaderboard</p>
                <p className="text-[10px] text-blue-700 font-medium truncate">Top Kasganj Captains</p>
              </div>
            </button>

            {/* 24/7 SOS & Support Tile */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                toast.info("Captain Support Helpline: +91 92587 30561 (24x7 Active)");
              }}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3.5 text-left shadow-2xs hover:border-zinc-300 hover:shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <div className="flex size-9.5 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-900">Safety & SOS</p>
                <p className="text-[10px] text-rose-700 font-medium truncate">24x7 Help Desk</p>
              </div>
            </button>
          </div>
        </div>

        {/* 6. Brand Watermark */}
        <div className="pt-4 pb-2 text-center select-none">
          <p className="text-xs font-black tracking-tight text-zinc-400">
            QuickPress Captain
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-zinc-400">
            Smart 2-Ride Partner Logistics Network
          </p>
        </div>
      </div>
    </div>
  );
};
