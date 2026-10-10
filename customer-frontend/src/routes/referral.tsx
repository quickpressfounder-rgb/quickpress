import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  HelpCircle,
  Info,
  Link2,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/home/BottomNav";
import { ReferralSkeleton } from "@/components/rewards/RewardsSkeletons";
import { Toaster } from "@/shared/ui/sonner";
import { isApiError } from "@/api/core/errors";
import { isOnline, onNetworkChange } from "@/api/customer/api/network";
import {
  applyReferralCode,
  canNativeShare,
  copyToClipboard,
  fetchReferralDashboard,
  nativeShareReferral,
  recordReferralInvite,
  smsShareUrl,
  whatsappShareUrl,
  type ReferralDashboard,
  type ReferralFriend,
  type ReferralReward,
} from "@/api/customer/referral-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/referral")({
  head: () => ({
    meta: [
      { title: "Refer & Earn — QuickPress Referral Rewards" },
      {
        name: "description",
        content:
          "Invite friends to QuickPress: they get 50% OFF on their first laundry order, and you earn ₹150 in Quick Money wallet cash.",
      },
      { property: "og:title", content: "Refer & Earn — QuickPress" },
      {
        property: "og:description",
        content:
          "Share your QuickPress code on WhatsApp, invite friends, and collect instant wallet cashback on every referral.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReferralScreen,
});

/* -------------------------------------------------------------------------- */
/*  3D STYLIZED GIFT BOX / REWARDS BADGE (Matching Quick Money Aesthetic)     */
/* -------------------------------------------------------------------------- */

function QuickPress3DReferralBadge({ className = "w-28 h-28" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Soft emerald ambient glow */}
      <div className="absolute -bottom-2 w-24 h-5 bg-emerald-500/25 blur-lg rounded-full pointer-events-none" />

      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,200,83,0.32)] transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="refGiftGrad" x1="20" y1="30" x2="140" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="45%" stopColor="#00C853" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="refLidGrad" x1="25" y1="20" x2="135" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="50%" stopColor="#00C853" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <linearGradient id="refGoldRibbon" x1="40" y1="10" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="30%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          <linearGradient id="refCoinGold" x1="90" y1="15" x2="135" y2="55" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#A16207" />
          </linearGradient>
        </defs>

        {/* Floating Gold Coin in background */}
        <circle cx="120" cy="35" r="16" fill="url(#refCoinGold)" className="animate-pulse" />
        <circle cx="120" cy="35" r="13" fill="none" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1.5" />
        <text
          x="120"
          y="41"
          textAnchor="middle"
          fontSize="15"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#FFFFFF"
        >
          ₹
        </text>

        {/* Gift Box Base */}
        <rect x="36" y="52" width="88" height="66" rx="14" fill="url(#refGiftGrad)" />

        {/* Vertical Gold Ribbon */}
        <rect x="73" y="52" width="14" height="66" fill="url(#refGoldRibbon)" />

        {/* Gift Box Lid */}
        <rect x="30" y="42" width="100" height="18" rx="8" fill="url(#refLidGrad)" />

        {/* Horizontal Ribbon on Lid */}
        <rect x="73" y="42" width="14" height="18" fill="url(#refGoldRibbon)" />

        {/* Ribbon Bow Left Loop */}
        <path
          d="M 60 40 C 48 24, 68 18, 77 38 Z"
          fill="url(#refGoldRibbon)"
        />
        {/* Ribbon Bow Right Loop */}
        <path
          d="M 100 40 C 112 24, 92 18, 83 38 Z"
          fill="url(#refGoldRibbon)"
        />
        {/* Bow Knot */}
        <circle cx="80" cy="40" r="5" fill="#FEF08A" />

        {/* Front White Currency Emblem on Box */}
        <circle cx="80" cy="85" r="14" fill="rgba(255, 255, 255, 0.25)" />
        <text
          x="80"
          y="91"
          textAnchor="middle"
          fontSize="16"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#FFFFFF"
        >
          ₹
        </text>
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  EMPTY STATE (3 Stacked Wireframe Cards)                                   */
/* -------------------------------------------------------------------------- */

function WireframeReferralPlaceholder({ onInvite }: { onInvite: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center select-none">
      <div className="w-52 space-y-2.5 opacity-65">
        <div className="h-11 rounded-2xl border-2 border-neutral-200/80 bg-white shadow-2xs p-2.5 flex items-center gap-2.5">
          <div className="size-6 rounded-lg bg-neutral-200/90 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-2.5 w-20 rounded-full bg-neutral-200/90" />
            <div className="h-1.5 w-12 rounded-full bg-neutral-100" />
          </div>
        </div>
        <div className="h-11 rounded-2xl border-2 border-neutral-200/80 bg-white shadow-2xs p-2.5 flex items-center gap-2.5">
          <div className="size-6 rounded-lg bg-neutral-200/90 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-2.5 w-24 rounded-full bg-neutral-200/90" />
            <div className="h-1.5 w-14 rounded-full bg-neutral-100" />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold text-neutral-400">
        No friends joined yet
      </p>
      <p className="text-[11px] text-neutral-400 mt-0.5">
        Share your code on WhatsApp to see invited friends here!
      </p>

      <button
        type="button"
        onClick={onInvite}
        className="mt-4 px-4 py-2 bg-emerald-50 text-[#00C853] hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-200 cursor-pointer active:scale-95 transition"
      >
        Invite a Friend Now
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MAIN REFERRAL SCREEN                                                      */
/* -------------------------------------------------------------------------- */

type ReferralTab = "friends" | "rewards";

function ReferralScreen() {
  useAuthGuard();
  const navigate = useNavigate();

  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  // Active view tab
  const [tab, setTab] = useState<ReferralTab>("friends");

  // Apply code input
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Modals
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (options: { refresh?: boolean } = {}) => {
    if (options.refresh) setRefreshing(true);
    else setData((prev) => prev ?? null);
    setError(null);
    try {
      const result = await fetchReferralDashboard(
        options.refresh ? { forceRefresh: true } : {}
      );
      setData(result);
    } catch (caught) {
      setError(
        isApiError(caught) ? caught.userMessage : "We couldn't load your referral details."
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffline(!isOnline());
    return onNetworkChange((online) => {
      setOffline(!online);
      if (online) void load({ refresh: true });
    });
  }, [load]);

  const share = async (channel: "copy" | "link" | "whatsapp" | "sms" | "share") => {
    if (!data) return;
    void recordReferralInvite(channel);

    if (channel === "copy") {
      const ok = await copyToClipboard(data.code);
      if (ok) {
        setCopied(true);
        toast.success(`Referral code ${data.code} copied! 🎉`);
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Couldn't copy code.");
      }
      return;
    }

    if (channel === "link") {
      const ok = await copyToClipboard(data.link);
      if (ok) toast.success("Invite link copied to clipboard!");
      else toast.error("Couldn't copy link.");
      return;
    }

    if (channel === "whatsapp") {
      window.open(whatsappShareUrl(data.shareMessage), "_blank", "noopener,noreferrer");
      return;
    }

    if (channel === "sms") {
      window.location.href = smsShareUrl(data.shareMessage);
      return;
    }

    const shared = await nativeShareReferral(data.shareMessage, data.link);
    if (!shared) {
      const ok = await copyToClipboard(data.shareMessage);
      if (ok) toast.success("Invite text copied — paste it anywhere!");
    }
  };

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error("Please enter a referral code");
      return;
    }
    setApplyError(null);
    setApplying(true);
    try {
      const result = await applyReferralCode(code.trim().toUpperCase());
      toast.success(result.message || "Referral code applied successfully! 🎉");
      setCode("");
      await load({ refresh: true });
    } catch (caught) {
      const message = isApiError(caught)
        ? caught.userMessage
        : "Couldn't apply that referral code. Please check and try again.";
      setApplyError(message);
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const referrerReward = data?.stats.referrerReward ?? 150;
  const refereeReward = data?.stats.refereeReward ?? 150;
  const totalRewards = data?.stats.totalRewardsEarned ?? 0;
  const walletRewards = data?.stats.walletRewards ?? 0;

  return (
    <main className="min-h-screen bg-white text-neutral-900 font-sans pb-24 antialiased">
      <Toaster position="top-center" richColors />

      <div className="mx-auto w-full max-w-md">
        {/* ========================================================
            1. TOP BAR (Zomato/Swiggy Style: Arrow + Refer & Earn + Help)
        ======================================================== */}
        <header className="sticky top-0 z-40 flex items-center justify-between bg-white/95 backdrop-blur-md px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  void navigate({ to: "/profile" });
                }
              }}
              className="p-1 rounded-full text-neutral-800 hover:bg-neutral-100 active:scale-95 transition cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5.5 stroke-[2.2]" />
            </button>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight">
              Refer &amp; Earn
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100 active:scale-95 transition cursor-pointer"
              aria-label="Referral Program Rules"
              title="How it works & terms"
            >
              <HelpCircle className="size-5 stroke-[1.8]" />
            </button>
            <button
              type="button"
              onClick={() => void load({ refresh: true })}
              disabled={refreshing}
              className="p-1.5 rounded-full text-neutral-600 hover:bg-neutral-100 active:scale-95 transition cursor-pointer"
              aria-label="Refresh"
            >
              <RefreshCw className={`size-4.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </header>

        {/* Offline notification */}
        {offline && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-600 border border-neutral-200">
            <WifiOff className="size-3.5 shrink-0 text-neutral-500" />
            <span>Showing offline cached referral data. Syncs automatically.</span>
          </div>
        )}

        {!data && !error ? (
          <div className="p-4">
            <ReferralSkeleton />
          </div>
        ) : error && !data ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void load({ refresh: true })}
              className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl active:scale-95 transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : data ? (
          <div className="px-4 pt-4 space-y-5">
            {/* ========================================================
                2. HERO CARD (Zomato/Swiggy Clean Green Theme)
            ======================================================== */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-50/90 via-white to-white border border-emerald-100/90 p-5 shadow-xs text-center flex flex-col items-center">
              {/* Stylized 3D Referral Gift Badge */}
              <QuickPress3DReferralBadge className="w-24 h-24 mb-1" />

              {/* Dynamic Headline */}
              <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
                Invite Friends, Earn ₹{referrerReward}
              </h2>

              {/* Subheadline with Friend's Benefit */}
              <p className="mt-1 text-xs text-neutral-600 max-w-xs leading-relaxed font-medium">
                Your friend gets <span className="font-bold text-[#00C853]">50% OFF</span> on their 1st laundry order. You get <span className="font-bold text-neutral-900">₹{referrerReward}</span> in Quick Money.
              </p>

              {/* Direct Quick Money Wallet Pill */}
              <button
                type="button"
                onClick={() => void navigate({ to: "/wallet" })}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-full border border-emerald-200/80 text-[11px] font-bold text-emerald-800 transition cursor-pointer active:scale-95"
              >
                <Wallet className="size-3.5 text-[#00C853]" />
                <span>Earned: ₹{walletRewards} in Quick Money</span>
                <ArrowRight className="size-3 ml-0.5 text-emerald-600" />
              </button>
            </section>

            {/* ========================================================
                3. VIRAL 1-TAP SHARING SECTION (WhatsApp + Code Chip)
            ======================================================== */}
            <section className="space-y-3">
              {/* Primary High-Converting WhatsApp Button */}
              <button
                type="button"
                onClick={() => void share("whatsapp")}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20BA59] text-white font-bold text-sm shadow-md shadow-[#25D366]/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="size-5 fill-white stroke-none" />
                <span>Invite via WhatsApp</span>
              </button>

              {/* Referral Code Copy Card */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    YOUR REFERRAL CODE
                  </span>
                  <span className="font-mono text-base font-black tracking-wider text-neutral-900">
                    {data.code}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="p-2 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition active:scale-95 cursor-pointer"
                    title="Show QR Code"
                  >
                    <QrCode className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void share("copy")}
                    className="py-2 px-3.5 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-900 hover:bg-neutral-100 transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-2xs"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-[#00C853]" />
                        <span className="text-[#00C853]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-neutral-500" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Secondary Share Actions: Copy Link & More Apps */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void share("link")}
                  className="py-2.5 px-3 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Link2 className="size-3.5 text-neutral-500" />
                  <span>Copy Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => void share("share")}
                  className="py-2.5 px-3 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Share2 className="size-3.5 text-neutral-500" />
                  <span>{canNativeShare() ? "More Apps" : "Share"}</span>
                </button>
              </div>
            </section>

            {/* ========================================================
                4. VISUAL 3-STEP "HOW IT WORKS" (Zomato/Swiggy Style)
            ======================================================== */}
            <section className="p-4 rounded-2xl border border-neutral-100 bg-neutral-50/70 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                How It Works
              </h3>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-emerald-100 text-[#00C853] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">
                      Share your code or link
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Send your personal invite link to friends &amp; family on WhatsApp.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-emerald-100 text-[#00C853] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">
                      Friend places first order
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      They get an instant 50% discount (up to ₹{refereeReward}) on their booking.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-emerald-100 text-[#00C853] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">
                      Get ₹{referrerReward} Quick Money
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      As soon as their laundry is delivered, ₹{referrerReward} is added to your wallet!
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ========================================================
                5. LIVE TRACKING TABS (Friends & Rewards Won)
            ======================================================== */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  My Referrals
                </h3>

                <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTab("friends")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      tab === "friends"
                        ? "bg-white text-neutral-900 shadow-2xs"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Friends ({data.history.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("rewards")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      tab === "rewards"
                        ? "bg-white text-neutral-900 shadow-2xs"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Rewards ({data.rewards.length})
                  </button>
                </div>
              </div>

              {/* Friends Tab View */}
              {tab === "friends" && (
                <div>
                  {data.history.length === 0 ? (
                    <WireframeReferralPlaceholder onInvite={() => void share("whatsapp")} />
                  ) : (
                    <div className="space-y-2">
                      {data.history.map((friend: ReferralFriend) => {
                        const isCompleted = friend.status === "completed";
                        return (
                          <div
                            key={friend.id}
                            className="p-3 bg-white border border-neutral-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="size-9 rounded-xl bg-emerald-50 text-[#00C853] font-black text-xs flex items-center justify-center shrink-0 border border-emerald-100">
                                {friend.friendName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-neutral-900 truncate">
                                  {friend.friendName}
                                </p>
                                <p className="text-[10px] text-neutral-400">
                                  Joined {friend.joinedLabel}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  isCompleted
                                    ? "bg-emerald-50 text-[#00C853] border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {isCompleted ? "Completed" : "Order Pending"}
                              </span>
                              <p className="text-xs font-black text-neutral-900 mt-0.5">
                                {isCompleted ? `+₹${friend.rewardEarned || referrerReward}` : "—"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Rewards Tab View */}
              {tab === "rewards" && (
                <div>
                  {data.rewards.length === 0 ? (
                    <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-neutral-100">
                      <Gift className="size-8 text-neutral-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-neutral-600">No rewards unlocked yet</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Rewards will be credited automatically when friends place their first order.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.rewards.map((reward: ReferralReward) => (
                        <div
                          key={reward.id}
                          className="p-3 bg-white border border-neutral-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="size-9 rounded-xl bg-emerald-50 text-[#00C853] flex items-center justify-center shrink-0">
                              <Gift className="size-4.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 truncate">
                                {reward.title}
                              </p>
                              <p className="text-[10px] text-neutral-400">
                                {reward.dateLabel}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-[#00C853]">
                              +₹{reward.amount}
                            </span>
                            <p className="text-[9px] font-bold text-emerald-700 uppercase">
                              {reward.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ========================================================
                6. "HAVE A REFERRAL CODE?" APPLY SECTION
            ======================================================== */}
            <section className="pt-2">
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Ticket className="size-4 text-[#00C853]" />
                  <h3 className="text-xs font-bold text-neutral-900">
                    Have a referral code from a friend?
                  </h3>
                </div>

                {data.appliedCode ? (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                    <CheckCircle2 className="size-4 text-[#00C853] shrink-0" />
                    <span>
                      Code <strong>{data.appliedCode}</strong> applied! 50% discount active on your 1st order.
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={code}
                        disabled={applying}
                        onChange={(e) => {
                          setCode(e.target.value.toUpperCase());
                          setApplyError(null);
                        }}
                        placeholder="ENTER CODE (e.g. QP150)"
                        className="h-10 flex-1 px-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs font-bold text-neutral-900 focus:outline-hidden focus:border-[#00C853]"
                      />
                      <button
                        type="button"
                        disabled={applying || code.trim().length < 3}
                        onClick={() => void handleApply()}
                        className="h-10 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs disabled:opacity-50 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {applying ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <span>Apply</span>
                        )}
                      </button>
                    </div>

                    {applyError && (
                      <p className="mt-1 text-[11px] font-semibold text-red-500">
                        {applyError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {/* ========================================================
          7. TERMS & CONDITIONS MODAL
      ======================================================== */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
          <div
            className="w-full max-w-md rounded-t-3xl border-t border-neutral-200 bg-white p-5 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">
                Referral Program Rules &amp; FAQ
              </h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="size-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-neutral-600">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-[#00C853] shrink-0 mt-0.5" />
                <p>
                  <strong>50% First Order Discount:</strong> Valid for new customers using a valid friend referral code (capped up to ₹{refereeReward}).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-[#00C853] shrink-0 mt-0.5" />
                <p>
                  <strong>₹{referrerReward} Wallet Reward:</strong> Credited to the inviting customer's Quick Money wallet automatically once the friend's order is delivered.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-[#00C853] shrink-0 mt-0.5" />
                <p>
                  <strong>Minimum Order Value:</strong> A minimum booking cart value of ₹199 is required for referral qualification.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-[#00C853] shrink-0 mt-0.5" />
                <p>
                  <strong>No Expiry:</strong> Referral cashback in Quick Money never expires and can be used on all QuickPress laundry, dry cleaning, and shoe care orders.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="mt-6 w-full py-3 rounded-xl bg-neutral-900 text-white font-bold text-xs active:scale-98 transition cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          8. QR CODE MODAL
      ======================================================== */}
      {showQrModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl border border-neutral-200 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Scan to Join
              </span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="size-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="py-4 flex justify-center">
              <div className="p-3 bg-white rounded-2xl border border-neutral-200 shadow-xs">
                <img
                  src={data.qrCodeUrl}
                  alt={`QR code for ${data.code}`}
                  className="size-44 object-contain"
                />
              </div>
            </div>

            <p className="font-mono text-base font-black text-neutral-900">
              {data.code}
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Ask your friend to scan this QR code with their camera to join QuickPress.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowQrModal(false);
                void share("copy");
              }}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#00C853] text-white font-bold text-xs active:scale-98 transition cursor-pointer"
            >
              Copy Referral Code
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
