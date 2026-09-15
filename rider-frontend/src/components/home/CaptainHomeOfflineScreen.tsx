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
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useLanguage } from "../../lib/i18n";

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

  return (
    <div
      className="flex flex-col flex-1 w-full h-full bg-zinc-50/50 text-zinc-900 select-none overflow-y-auto"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 76px, 92px)" }}
    >
      <div className="p-4 space-y-4">
        {/* 1. Captain Profile & Welcome Card */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex size-12 items-center justify-center rounded-2xl bg-zinc-900 font-black text-white text-base shadow-sm">
                <span>{initial}</span>
                <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-white bg-zinc-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {greeting}
                </p>
                <h1 className="text-base font-black tracking-tight text-zinc-900">
                  {captainName}
                </h1>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                    4.94
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400">·</span>
                  <span className="text-[11px] font-bold text-zinc-500">
                    Kasganj Fleet
                  </span>
                </div>
              </div>
            </div>

            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-600">
              Offline
            </span>
          </div>
        </div>

        {/* 2. Duty Hero Card (The central call to action) */}
        <div className="overflow-hidden rounded-3xl border border-zinc-900 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-5 text-white shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase text-zinc-300">
                <Radio className="size-3 text-emerald-400 animate-pulse" />
                <span>Ready to Ride</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Go On Duty to Earn
              </h2>
              <p className="text-xs text-zinc-300 max-w-xs leading-relaxed">
                Turn on duty to start receiving high-paying doorstep pickup & delivery dispatches nearby.
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-white shrink-0">
              <Bike className="size-6" />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onGoOnline}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 py-3.5 px-4 font-black text-sm text-zinc-950 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all"
            >
              <span>Go On Duty Now</span>
              <ArrowRight className="size-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 3. Today's Performance 3-Stat Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Stat 1: Earnings */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Earnings</span>
              <Wallet className="size-3.5 text-zinc-500" />
            </div>
            <p className="mt-1.5 text-base font-black text-zinc-900">
              ₹{todayEarnings.toFixed(0)}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-emerald-600 truncate">
              0% Commission
            </p>
          </div>

          {/* Stat 2: Deliveries */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Trips</span>
              <Navigation className="size-3.5 text-zinc-500" />
            </div>
            <p className="mt-1.5 text-base font-black text-zinc-900">
              {todayDeliveries}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-zinc-400 truncate">
              Orders done
            </p>
          </div>

          {/* Stat 3: Surge Bonus */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">Bonus</span>
              <Flame className="size-3.5 text-amber-500" />
            </div>
            <p className="mt-1.5 text-base font-black text-amber-600">
              +₹20
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-zinc-400 truncate">
              Per trip surge
            </p>
          </div>
        </div>

        {/* 4. Active Work Zone & High Demand Card */}
        <div
          onClick={onOpenWorkZoneInfo}
          className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 p-4 shadow-xs cursor-pointer hover:border-emerald-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                <MapPin className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-emerald-950">
                    Kasganj Central Work Zone
                  </span>
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="mt-0.5 text-[11px] text-emerald-800/80 font-medium">
                  High demand · Extra ₹20 bonus on all store pickups
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-emerald-700" />
          </div>
        </div>

        {/* 5. Quick Shortcuts Grid (Wallet, Targets, Leaderboard, Support) */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-2 px-1">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Wallet Tile */}
            <button
              type="button"
              onClick={() => navigate({ to: "/wallet" })}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-xs hover:border-zinc-300 active:scale-95 transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800">
                <Wallet className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-900">Wallet & Payouts</p>
                <p className="text-[10px] text-zinc-500 truncate">Weekly Auto-Settling</p>
              </div>
            </button>

            {/* Daily Targets Tile */}
            <button
              type="button"
              onClick={() => navigate({ to: "/incentives" })}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-xs hover:border-zinc-300 active:scale-95 transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Target className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-900">Daily Targets</p>
                <p className="text-[10px] text-amber-700 truncate">Earn up to ₹350</p>
              </div>
            </button>

            {/* Leaderboard Tile */}
            <button
              type="button"
              onClick={() => navigate({ to: "/leaderboard" })}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-xs hover:border-zinc-300 active:scale-95 transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Trophy className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-900">Leaderboard</p>
                <p className="text-[10px] text-blue-700 truncate">Top Kasganj Captains</p>
              </div>
            </button>

            {/* 24/7 SOS & Support Tile */}
            <button
              type="button"
              onClick={() => toast.info("Captain Support Helpline: +91 92587 30561 (24x7 Active)")}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 text-left shadow-xs hover:border-zinc-300 active:scale-95 transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                <ShieldCheck className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-zinc-900">Safety & SOS</p>
                <p className="text-[10px] text-zinc-500 truncate">24x7 Help Desk</p>
              </div>
            </button>
          </div>
        </div>

        {/* 6. Clean Brand Footer Watermark */}
        <div className="pt-6 pb-2 text-center select-none">
          <p className="text-xs font-black tracking-tight text-zinc-400">
            QuickPress Captain
          </p>
          <p className="mt-0.5 text-[10px] font-semibold text-zinc-300">
            Smart 2-Ride Partner Logistics Network
          </p>
        </div>
      </div>
    </div>
  );
};
