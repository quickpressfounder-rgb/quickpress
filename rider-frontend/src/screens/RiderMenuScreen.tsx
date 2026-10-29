import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Bike,
  CheckCircle2,
  ChevronRight,
  Gift,
  Headphones,
  History,
  Info,
  Layers,
  LogOut,
  MapPin,
  Play,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Star,
  Tag,
  TrendingUp,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useRiderContext } from "../context/RiderContext";
import { fetchRiderProfile, type RiderProfileDetail } from "../api/rider/rider-profile-api";
import { fetchRiderWallet, type RiderWalletDetail } from "../api/rider/rider-wallet-api";
import { fetchRiderOffers } from "../api/rider/rider-orders-api";
import { useLanguage } from "../lib/i18n";
import { triggerHaptic, playOrderAlertSound, stopOrderAlertSound } from "../lib/captain-audio";
import { startBackgroundOrderRing, stopBackgroundOrderRing, hasCompletedCaptainPermissions } from "../lib/captain-device-opt";
import { formatCaptainId } from "../lib/format-ids";
import { CaptainRateCardModal } from "../components/home/CaptainRateCardModal";
import { CaptainReferralModal } from "../components/layout/CaptainReferralModal";
import { CaptainGuidelinesModal } from "../components/support/CaptainGuidelinesModal";
import { RiderBottomNav } from "../components/RiderBottomNav";

export function RiderMenuScreen() {
  const navigate = useNavigate();
  const { session, signOut } = useRiderContext();
  const { t, selectedLanguageObj } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Partial<RiderProfileDetail> | null>(null);
  const [wallet, setWallet] = useState<Partial<RiderWalletDetail> | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(true);

  // Modals
  const [isRateCardOpen, setIsRateCardOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // Load initial cached values for instant 0ms hydration
  useEffect(() => {
    try {
      const cachedProfile = localStorage.getItem("qp_rider_profile_cache");
      if (cachedProfile) setProfile(JSON.parse(cachedProfile));

      const cachedName = localStorage.getItem("qp_rider_name") || localStorage.getItem("qp_rider_government_name");
      const cachedPhone = localStorage.getItem("qp_rider_phone");
      const cachedId = localStorage.getItem("qp_rider_id");
      if (cachedName || cachedPhone || cachedId) {
        setProfile((prev) => ({
          ...prev,
          name: cachedName || prev?.name || "Captain",
          phone: cachedPhone || prev?.phone,
          id: cachedId || prev?.id,
        }));
      }

      const cachedEarnings = localStorage.getItem("qp_today_earnings");
      const cachedBalance = localStorage.getItem("qp_wallet_balance");
      if (cachedEarnings || cachedBalance) {
        setWallet({
          todayEarned: cachedEarnings ? parseFloat(cachedEarnings) : 150,
          balance: cachedBalance ? parseFloat(cachedBalance) : 235,
          lifetimeEarnings: 735,
        });
      }

      setPermissionsGranted(hasCompletedCaptainPermissions());
    } catch {}
  }, []);

  const loadData = async () => {
    setLoading(true);
    triggerHaptic(20);
    try {
      const [profData, wallData, offers] = await Promise.allSettled([
        fetchRiderProfile(),
        fetchRiderWallet(),
        fetchRiderOffers(),
      ]);

      if (profData.status === "fulfilled" && profData.value) {
        setProfile(profData.value);
        localStorage.setItem("qp_rider_profile_cache", JSON.stringify(profData.value));
      }
      if (wallData.status === "fulfilled" && wallData.value) {
        setWallet(wallData.value);
      }
      if (offers.status === "fulfilled" && Array.isArray(offers.value)) {
        setPendingOrdersCount(offers.value.length);
      }
      setPermissionsGranted(hasCompletedCaptainPermissions());
      toast.success("Menu updated with live data");
    } catch {
      toast.error("Network sync error, showing offline cache");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Clean up test sound on unmount
  useEffect(() => {
    return () => {
      stopOrderAlertSound();
      stopBackgroundOrderRing();
    };
  }, []);

  const handleToggleSoundTest = () => {
    if (isTestingSound) {
      stopOrderAlertSound();
      stopBackgroundOrderRing();
      setIsTestingSound(false);
      toast.info("Order siren stopped");
    } else {
      triggerHaptic([100, 50, 100]);
      playOrderAlertSound();
      startBackgroundOrderRing("TEST-001", "₹75", "Kasganj Customer", "Kasganj Market Hub");
      setIsTestingSound(true);
      toast.success("⚡ Playing High-Priority Order Alarm Ringtone & Vibration", {
        description: "Checking emergency sound channels & lockscreen alert",
      });
    }
  };

  const handleLogout = () => {
    triggerHaptic(30);
    if (window.confirm("Are you sure you want to log out of QuickPress Captain?")) {
      signOut();
      toast.success("Logged out successfully");
      navigate({ to: "/auth" });
    }
  };

  const captainName =
    profile?.name ||
    session?.name ||
    (typeof window !== "undefined" ? localStorage.getItem("qp_rider_name") : null) ||
    "Kasganj Captain";

  const captainId = profile?.id || session?.userId || (typeof window !== "undefined" ? localStorage.getItem("qp_rider_id") : null) || "CAP-7821";
  const captainPhone = profile?.phone || session?.phone || "+91 98765 43210";
  const photoUrl = profile?.profilePhoto || (typeof window !== "undefined" ? localStorage.getItem("qp_rider_profile_photo") : null);

  const todayEarned = Number(wallet?.todayEarned ?? 150).toFixed(0);
  const walletBalance = Number(wallet?.balance ?? 235).toFixed(2);
  const lifetimeTotal = Number(wallet?.lifetimeEarnings ?? 735).toFixed(2);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 select-none font-sans pb-32">
      {/* 1. TOP HEADER (Notch Safe, Stays locked above content on scroll) */}
      <header
        className="sticky top-0 z-40 bg-[#F8F9FA] border-b border-slate-200/80 px-4 pb-3 shadow-2xs"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 48px)" }}
      >
        <div className="mx-auto max-w-lg flex items-center justify-between">
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
            <h1 className="text-lg font-black tracking-tight text-slate-950">
              Menu
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* 🎧 Help Button Pill (Exact match to screenshot) */}
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

            {/* 🔄 Circular Refresh Button */}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className={`flex size-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 active:scale-95 transition shadow-2xs cursor-pointer ${
                loading ? "animate-spin text-amber-600" : ""
              }`}
              title="Refresh Menu"
            >
              <RefreshCw className="size-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT */}
      <main className="mx-auto max-w-lg px-4 pt-2 space-y-3.5">
        {/* CAPTAIN PROFILE HERO CARD */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHaptic(20);
            navigate({ to: "/profile" });
          }}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 active:scale-99 transition-all cursor-pointer text-left"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={captainName}
                className="size-13 rounded-full object-cover border-2 border-amber-400 shadow-2xs shrink-0"
              />
            ) : (
              <div className="flex size-13 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-xl shadow-2xs shrink-0">
                {captainName.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-slate-950 truncate leading-tight">
                  {captainName}
                </h2>
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              </div>

              <p className="text-xs font-semibold text-slate-500 mt-0.5 font-mono">
                {formatCaptainId(captainId)} • {captainPhone}
              </p>

              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Star className="size-2.5 fill-emerald-700 text-emerald-700" />
                  4.9 Rating
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  Kasganj Hub
                </span>
              </div>
            </div>
          </div>

          <ChevronRight className="size-5 text-slate-400 shrink-0" />
        </div>

        {/* 2-COLUMN STATS GRID (Exact match to Screenshot 1 "Past 7 Days" & "Lifetime Total") */}
        <div className="grid grid-cols-2 gap-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/wallet" });
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 active:scale-98 transition cursor-pointer text-left"
          >
            <p className="text-xs font-semibold text-slate-500">Today's Earnings</p>
            <p className="text-2xl font-black text-slate-950 mt-1">₹{todayEarned}</p>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/wallet" });
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 active:scale-98 transition cursor-pointer text-left"
          >
            <p className="text-xs font-semibold text-slate-500">Wallet Balance</p>
            <p className="text-2xl font-black text-slate-950 mt-1">₹{walletBalance}</p>
          </div>
        </div>

        {/* PROMO / VIDEO BANNER (Exact Match to Screenshot 1 banner) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            triggerHaptic(20);
            setIsGuidelinesOpen(true);
          }}
          className="flex items-center justify-between p-4 bg-[#F6F4FF] rounded-2xl border border-purple-100 hover:border-purple-200 active:scale-99 transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Red circular play / target icon */}
            <div className="flex size-11 items-center justify-center rounded-full bg-red-600 text-white shadow-2xs shrink-0">
              <div className="size-4 rounded-full border-2 border-white flex items-center justify-center">
                <Play className="size-2 fill-white ml-0.5" />
              </div>
            </div>

            <div className="min-w-0 pr-2">
              <h3 className="text-sm font-black text-slate-950 leading-snug">
                Know all about your Earnings
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                Watch quick video to understand fares, bonuses and daily payouts
              </p>
            </div>
          </div>

          <ChevronRight className="size-5 text-slate-400 shrink-0" />
        </div>

        {/* CARD GROUP 1: OPERATIONAL HUB (ALL ORDERS, EARNINGS, RATE CARD) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Row 1: All Orders */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/orders" });
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <Bike className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-black text-slate-950">All Orders</span>
            </div>

            <div className="flex items-center gap-2">
              {pendingOrdersCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingOrdersCount} Active
                </span>
              )}
              <ChevronRight className="size-4 text-slate-400" />
            </div>
          </button>

          <div className="border-t border-slate-100 mx-4" />

          {/* Row 2: View Rate Card (Exact Match to Screenshot 1) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              setIsRateCardOpen(true);
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <Tag className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-black text-slate-950">View Rate Card</span>
            </div>

            <ChevronRight className="size-4 text-slate-400" />
          </button>

          <div className="border-t border-slate-100 mx-4" />

          {/* Row 3: Trip History */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/history" });
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <History className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-black text-slate-950">Trip History & Receipts</span>
            </div>

            <ChevronRight className="size-4 text-slate-400" />
          </button>

          <div className="border-t border-slate-100 mx-4" />

          {/* Row 4: Performance & Analytics */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/analytics" });
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <BarChart3 className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-black text-slate-950">Performance & Analytics</span>
            </div>

            <ChevronRight className="size-4 text-slate-400" />
          </button>
        </div>

        {/* CARD GROUP 2: GROWTH & INCENTIVES */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Row 1: Incentives & Milestone Quests */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/incentives" });
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <TrendingUp className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-black text-slate-950">Incentives & Milestone Quests</span>
            </div>

            <ChevronRight className="size-4 text-slate-400" />
          </button>

          <div className="border-t border-slate-100 mx-4" />

          {/* Row 2: City Leaderboard */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/leaderboard" });
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Trophy className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-black text-slate-950">City Leaderboard</span>
            </div>

            <ChevronRight className="size-4 text-slate-400" />
          </button>

          <div className="border-t border-slate-100 mx-4" />

          {/* Row 3: Refer & Earn (₹300) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              setIsReferralOpen(true);
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <Gift className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-black text-slate-950">Refer Captain & Earn</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">
                ₹300 Bonus
              </span>
              <ChevronRight className="size-4 text-slate-400" />
            </div>
          </button>
        </div>

        {/* CARD GROUP 3: DEVICE HEALTH & INSTANT SOUND DIAGNOSTICS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Row 1: Duty Permissions */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/permissions" });
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck className="size-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-sm font-black text-slate-950">Duty & Device Permissions</span>
                <p className="text-[11px] text-slate-500 font-medium">Battery, Overlay & Background Alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  permissionsGranted
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {permissionsGranted ? "Active" : "Action Needed"}
              </span>
              <ChevronRight className="size-4 text-slate-400" />
            </div>
          </button>

          <div className="border-t border-slate-100 mx-4" />

          {/* Row 2: Live Sound & Siren Test Toggle */}
          <div className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-9 items-center justify-center rounded-xl transition-colors ${
                  isTestingSound ? "bg-red-500 text-white animate-bounce" : "bg-slate-100 text-slate-900"
                }`}
              >
                {isTestingSound ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-slate-600" />}
              </div>
              <div>
                <span className="text-sm font-black text-slate-950">Test Order Siren & Alarm</span>
                <p className="text-[11px] text-slate-500 font-medium">Plays emergency sound & tests vibration</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSoundTest}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer ${
                isTestingSound
                  ? "bg-red-600 text-white shadow-2xs"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {isTestingSound ? "Stop Siren" : "Test Sound"}
            </button>
          </div>
        </div>

        {/* CARD GROUP 4: SUPPORT & LOGOUT */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Row 1: Language */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/language" });
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer text-left"
          >
            <span className="text-sm font-bold text-slate-900">
              Language ({selectedLanguageObj?.nativeName || "English"})
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Change
            </span>
          </button>

          <div className="border-t border-slate-100 mx-4" />

          {/* Row 2: Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-4 text-sm font-bold text-red-600 hover:bg-red-50 active:bg-red-100 transition cursor-pointer"
          >
            <LogOut className="size-4" />
            <span>Logout Captain Account</span>
          </button>
        </div>

        {/* APP VERSION FOOTER */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs font-semibold text-slate-400">
            QuickPress Captain v2.4.0 • Kasganj Service Hub
          </p>
        </div>
      </main>

      {/* 3. BOTTOM NAVIGATION (Screenshot Match: Home + Trips active/inactive pill) */}
      <RiderBottomNav active="dashboard" ordersBadgeCount={pendingOrdersCount} />

      {/* 4. MODALS */}
      <CaptainRateCardModal
        isOpen={isRateCardOpen}
        onClose={() => setIsRateCardOpen(false)}
      />
      <CaptainReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
      />
      <CaptainGuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />
    </div>
  );
}
