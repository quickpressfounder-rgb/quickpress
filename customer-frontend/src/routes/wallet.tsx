import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  Plus,
  Receipt,
  RefreshCcw,
  Settings,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet as WalletIcon,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/home/BottomNav";
import { WalletSkeleton } from "@/components/rewards/RewardsSkeletons";
import { Toaster } from "@/shared/ui/sonner";
import {
  addFunds,
  fetchWallet,
  fetchWalletHistory,
  formatAmount,
  type TransactionKind,
  type TransactionStatus,
  type Wallet,
  type WalletTransaction,
} from "@/api/customer/wallet-api";
import {
  fetchPayments,
  fetchRefunds,
  type PaymentRecord,
  type RefundRecord,
} from "@/api/customer/payments-api";
import { payWithRazorpay } from "@/api/payments/razorpay-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { onRealtimeEvent } from "@/api/core/socket-client";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Quick Money — QuickPress Cashback & Wallet" },
      {
        name: "description",
        content:
          "Quick Money: Instant 1-tap laundry checkout, cashback rewards, zero fees top-up, and real-time transaction ledger.",
      },
      { property: "og:title", content: "Quick Money — QuickPress" },
      {
        name: "og:description",
        content:
          "Instant balance, cashback earnings and transaction history for QuickPress laundry and garment care.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletScreen,
});

/* -------------------------------------------------------------------------- */
/*  3D STYLIZED GREEN WALLET SVG (Matching Zomato Money aesthetic)            */
/* -------------------------------------------------------------------------- */

function QuickMoney3DWallet({ className = "w-28 h-28" }: { className?: string }) {
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
          <linearGradient id="qmMainGrad" x1="20" y1="20" x2="140" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="45%" stopColor="#00C853" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="qmFlapGrad" x1="25" y1="40" x2="135" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="50%" stopColor="#00C853" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <linearGradient id="qmGoldCard" x1="40" y1="12" x2="115" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>

          <filter id="qmSoftBevel" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#064E3B" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Gold VIP Member card peeking out */}
        <path
          d="M 44 26 C 44 20, 114 12, 118 12 C 122 12, 125 16, 124 20 L 120 40 L 44 38 Z"
          fill="url(#qmGoldCard)"
          opacity="0.95"
        />

        {/* Back leather shadow fold */}
        <rect
          x="28"
          y="26"
          width="104"
          height="76"
          rx="18"
          transform="rotate(-5 80 64)"
          fill="#064E3B"
          opacity="0.85"
        />

        {/* Main 3D Wallet Body */}
        <rect
          x="26"
          y="22"
          width="108"
          height="82"
          rx="20"
          transform="rotate(3 80 63)"
          fill="url(#qmMainGrad)"
          filter="url(#qmSoftBevel)"
        />

        {/* Front Wallet Pocket Curve */}
        <path
          d="M 29 48 C 29 38, 128 32, 131 44 C 132 52, 130 92, 128 98 C 126 102, 31 108, 29 100 Z"
          fill="url(#qmFlapGrad)"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.6"
        />

        {/* Pocket Stitching Line */}
        <path
          d="M 35 64 C 65 69, 96 66, 124 57"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="1.8"
          strokeDasharray="3.5 3"
          fill="none"
        />

        {/* Front Rupee Currency Center Emblem */}
        <circle cx="80" cy="74" r="19" fill="rgba(255, 255, 255, 0.22)" />
        <circle cx="80" cy="74" r="17" fill="rgba(255, 255, 255, 0.15)" />
        <text
          x="80"
          y="81.5"
          textAnchor="middle"
          fontSize="23"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#FFFFFF"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
        >
          ₹
        </text>

        {/* Top glossy sheen */}
        <ellipse
          cx="68"
          cy="34"
          rx="30"
          ry="6"
          transform="rotate(-4 68 34)"
          fill="rgba(255, 255, 255, 0.45)"
        />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  EMPTY STATE WIREFRAME (Matching Zomato Money 3-stacked cards)             */
/* -------------------------------------------------------------------------- */

function WireframeEmptyPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center select-none">
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

        <div className="h-11 rounded-2xl border-2 border-neutral-200/80 bg-white shadow-2xs p-2.5 flex items-center gap-2.5">
          <div className="size-6 rounded-lg bg-neutral-200/90 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-2.5 w-16 rounded-full bg-neutral-200/90" />
            <div className="h-1.5 w-10 rounded-full bg-neutral-100" />
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs font-semibold text-neutral-400 tracking-tight">
        Your transactions will appear here
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  WALLET TABS & TYPES                                                       */
/* -------------------------------------------------------------------------- */

type HistoryTab = "all" | "additions" | "deductions" | "refunds" | "expired";

const TABS: { id: HistoryTab; label: string }[] = [
  { id: "all", label: "All Transactions" },
  { id: "additions", label: "Additions" },
  { id: "deductions", label: "Deductions" },
  { id: "refunds", label: "Refunds" },
  { id: "expired", label: "Expired" },
];

const POPULAR_TOPUP_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

/* -------------------------------------------------------------------------- */
/*  MAIN SCREEN COMPONENT                                                     */
/* -------------------------------------------------------------------------- */

function WalletScreen() {
  const { session } = useAuthGuard();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  // Active filter tab
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");

  // Add Money Drawer State
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState<string>("500");
  const [adding, setAdding] = useState(false);

  // Settings & Receipt Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<WalletTransaction | null>(null);

  // Load wallet & transaction history
  const load = useCallback(async (forceRefresh = false) => {
    setError(null);
    try {
      const [walletResult, history] = await Promise.all([
        fetchWallet({ forceRefresh }),
        fetchWalletHistory({ forceRefresh }),
      ]);
      setWallet(walletResult);
      setTransactions(history.items);
      setOffline(walletResult.fromCache || history.fromCache);

      const [paymentsResult, refundsResult] = await Promise.allSettled([
        fetchPayments({ forceRefresh }),
        fetchRefunds({ forceRefresh }),
      ]);
      if (paymentsResult.status === "fulfilled") setPayments(paymentsResult.value.items);
      if (refundsResult.status === "fulfilled") setRefunds(refundsResult.value.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Quick Money balance.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time wallet update listener via Socket.IO
  useEffect(() => {
    const unsub = onRealtimeEvent("wallet.updated", (payload: any) => {
      if (payload) {
        setWallet((prev) => (prev ? { ...prev, ...payload, fromCache: false } : prev));
        void load(true);
      }
    });
    return unsub;
  }, [load]);

  // Online auto-sync
  useEffect(() => {
    const onOnline = () => void load(true);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load]);

  /* ------------------- Real Payment Gateway Top-up ------------------- */
  const handleProceedAddMoney = async (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Please enter an amount greater than ₹0");
      return;
    }
    if (value > 100000) {
      toast.error("Amount cannot exceed ₹1,00,000");
      return;
    }

    setAdding(true);
    try {
      // 1. Trigger Razorpay Checkout with Real Live API Key
      const outcome = await payWithRazorpay({
        amount: value,
        purpose: "Quick Money Wallet Recharge",
        customerName: session?.account?.name || undefined,
        customerPhone: session?.account?.phone || undefined,
        customerEmail: session?.account?.email || undefined,
      });

      if (outcome.status === "success" && outcome.paymentId) {
        // 2. Post real transaction credit to backend
        const result = await addFunds(value, "razorpay", outcome.paymentId);
        setWallet(result.wallet);
        toast.success(`₹${value} added to Quick Money successfully! 🎉`);
        setAddOpen(false);
        setAmount("500");
        await load(true);
      } else if (outcome.status === "user_dropped") {
        toast.info("Payment cancelled. You can retry anytime.");
      } else {
        toast.error(outcome.reason || "Payment was not completed. Please try again.");
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Payment processing error.");
    } finally {
      setAdding(false);
    }
  };

  /* ------------------- Filtered Transactions Ledger ------------------- */
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    switch (activeTab) {
      case "additions":
        return transactions.filter(
          (t) =>
            t.direction === "credit" ||
            t.kind === "add-funds" ||
            t.kind === "recharge" ||
            t.kind === "order-cashback" ||
            t.kind === "referral-bonus" ||
            t.kind === "reward-credit"
        );
      case "deductions":
        return transactions.filter(
          (t) => t.direction === "debit" || t.kind === "order-payment"
        );
      case "refunds":
        return transactions.filter((t) => t.kind === "refund");
      case "expired":
        return transactions.filter(
          (t) => (t as any).status === "expired" || (t as any).kind === "expired"
        );
      case "all":
      default:
        return transactions;
    }
  }, [transactions, activeTab]);

  const loading = !wallet || !transactions;
  const numAmount = Number(amount) || 0;
  const currentBal = wallet?.totalBalance ?? 0;
  const projectedBal = currentBal + (numAmount > 0 ? numAmount : 0);

  return (
    <main className="min-h-screen bg-white text-neutral-900 font-sans pb-24 antialiased">
      <Toaster position="top-center" richColors />

      <div className="mx-auto w-full max-w-md">
        {/* ========================================================
            1. TOP BAR (Zomato Money Style: Arrow + Quick Money + Gear)
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
              Quick Money
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 rounded-full text-neutral-700 hover:bg-neutral-100 active:scale-95 transition cursor-pointer"
            aria-label="Quick Money Settings"
          >
            <Settings className="size-5 stroke-[1.8]" />
          </button>
        </header>

        {/* Offline Banner */}
        {offline && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-600 border border-neutral-200">
            <WifiOff className="size-3.5 shrink-0 text-neutral-500" />
            <span>Showing offline cached balance. Changes sync when online.</span>
          </div>
        )}

        {loading && !error ? (
          <div className="p-4">
            <WalletSkeleton />
          </div>
        ) : error && !wallet ? (
          <div className="p-6 text-center">
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void load(true)}
              className="mt-3 px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="px-4">
            {/* ========================================================
                2. HERO BALANCE SECTION (3D Wallet + ₹ Balance + Add Money)
            ======================================================== */}
            <section className="flex flex-col items-center justify-center pt-8 pb-3 text-center">
              {/* 3D Stylized Green Wallet Graphic */}
              <QuickMoney3DWallet className="w-28 h-28" />

              {/* YOUR BALANCE label */}
              <span className="mt-4 text-[11px] font-bold tracking-[0.18em] text-neutral-400 uppercase">
                YOUR BALANCE
              </span>

              {/* Bold Current Balance */}
              <div className="mt-1 flex items-baseline justify-center">
                <span className="text-4xl font-extrabold text-neutral-900 tracking-tight">
                  ₹{Math.floor(wallet?.totalBalance ?? 0)}
                </span>
              </div>

              {/* Sub-balances breakdown pill */}
              {wallet && (wallet.balances.rewardBalance > 0 || wallet.balances.membershipCredits > 0) && (
                <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-neutral-500 bg-neutral-50 border border-neutral-200/80 px-2.5 py-1 rounded-full">
                  <span>Main: ₹{Math.floor(wallet.balances.currentBalance)}</span>
                  {wallet.balances.rewardBalance > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-[#00C853] font-bold">
                        Cashback: ₹{Math.floor(wallet.balances.rewardBalance)}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Full Width Primary Green "Add money" Button */}
              <div className="w-full mt-6">
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#00C853] hover:bg-[#00B048] text-white font-bold text-sm shadow-md shadow-[#00C853]/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Add money</span>
                </button>
              </div>
            </section>

            {/* ========================================================
                3. TRANSACTION HISTORY SECTION
            ======================================================== */}
            <section className="mt-8 border-t border-neutral-100 pt-6">
              {/* Header Title */}
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 mb-3 px-1">
                TRANSACTION HISTORY
              </h2>

              {/* Horizontal Scrollable Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-0.5">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? "border border-emerald-500 bg-emerald-50/70 text-emerald-800 font-bold shadow-2xs"
                          : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 font-medium"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Filtered Transactions List / Empty Placeholder */}
              <div className="mt-4">
                {filteredTransactions.length === 0 ? (
                  <WireframeEmptyPlaceholder />
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((txn) => {
                      const isCredit = txn.direction === "credit";
                      return (
                        <div
                          key={txn.id}
                          onClick={() => setSelectedTxn(txn)}
                          className="p-3.5 bg-white border border-neutral-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-200 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isCredit
                                  ? "bg-emerald-50 text-[#00C853] border border-emerald-100"
                                  : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="size-4.5 stroke-[2.5]" />
                              ) : (
                                <ArrowUpRight className="size-4.5 stroke-[2.5]" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 truncate">
                                {txn.title}
                              </p>
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                {txn.dateLabel || txn.createdAt}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-sm font-black ${
                                isCredit ? "text-[#00C853]" : "text-neutral-900"
                              }`}
                            >
                              {isCredit ? "+" : "−"}₹{txn.amount}
                            </span>
                            {txn.status !== "success" && (
                              <p className="text-[9px] font-bold text-amber-600 uppercase mt-0.5">
                                {txn.status}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ========================================================
          4. ADD MONEY BOTTOM SHEET (Real Razorpay Gateway)
      ======================================================== */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
          <div
            className="w-full max-w-md rounded-t-3xl border-t border-neutral-200 bg-white p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-emerald-50 text-[#00C853] flex items-center justify-center">
                  <Plus className="size-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Add Money to Quick Money
                  </h3>
                  <p className="text-[10px] text-neutral-500">
                    Real-time credit • UPI, Cards &amp; NetBanking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="size-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Popular Amount Chips */}
            <div className="mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Popular Amounts
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {POPULAR_TOPUP_AMOUNTS.map((val) => {
                  const isSelected = amount === String(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={adding}
                      onClick={() => setAmount(String(val))}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                        isSelected
                          ? "border-[#00C853] bg-emerald-50 text-emerald-800 shadow-2xs"
                          : "border-neutral-200 bg-neutral-50/60 text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      ₹{val}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Input Field */}
            <div className="mt-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Or Enter Custom Amount
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-xl font-black text-neutral-900">₹</span>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={amount}
                  disabled={adding}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-neutral-200 font-mono text-xl font-black text-neutral-900 focus:outline-hidden focus:border-[#00C853] focus:ring-2 focus:ring-emerald-100 transition"
                />
              </div>
            </div>

            {/* Projected Balance Pill */}
            {numAmount > 0 && (
              <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-medium">New Wallet Balance:</span>
                <span className="font-black text-emerald-700">₹{projectedBal}</span>
              </div>
            )}

            {/* Proceed Pay Button (Launches Live Razorpay) */}
            <button
              type="button"
              disabled={adding || numAmount <= 0}
              onClick={() => void handleProceedAddMoney(numAmount)}
              className="mt-5 w-full py-4 px-6 rounded-2xl bg-[#00C853] hover:bg-[#00B048] text-white font-bold text-sm shadow-md shadow-[#00C853]/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {adding ? (
                <>
                  <Loader2 className="size-4.5 animate-spin" />
                  <span>Opening Payment Gateway...</span>
                </>
              ) : (
                <>
                  <Lock className="size-4" />
                  <span>Pay &amp; Add ₹{numAmount || 0}</span>
                </>
              )}
            </button>

            {/* Security Badge */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-neutral-400">
              <ShieldCheck className="size-3.5 text-[#00C853]" />
              <span>100% Secured by Razorpay &amp; RBI Guidelines</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. SETTINGS BOTTOM SHEET (Gear Icon)
      ======================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full max-w-md rounded-t-3xl border-t border-neutral-200 bg-white p-5 pb-8 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">Quick Money Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="size-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-3 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  navigate({ to: "/payment-methods" });
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between hover:bg-neutral-50 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="size-4 text-neutral-600" />
                  <span className="text-xs font-bold text-neutral-800">Saved Payment Methods</span>
                </div>
                <ChevronRight className="size-4 text-neutral-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  navigate({ to: "/offers" });
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between hover:bg-neutral-50 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="size-4 text-[#00C853]" />
                  <span className="text-xs font-bold text-neutral-800">Offers &amp; Cashback Vouchers</span>
                </div>
                <ChevronRight className="size-4 text-neutral-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  navigate({ to: "/referral" });
                }}
                className="w-full p-3.5 rounded-2xl flex items-center justify-between hover:bg-neutral-50 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Share2 className="size-4 text-emerald-600" />
                  <span className="text-xs font-bold text-neutral-800">Refer &amp; Earn ₹150</span>
                </div>
                <ChevronRight className="size-4 text-neutral-400" />
              </button>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 text-xs text-neutral-500 mt-2">
                <p className="font-bold text-neutral-700">Zero Surcharge Guarantee</p>
                <p className="text-[10px] mt-0.5 text-neutral-400">
                  Quick Money balances never expire and can be used on all QuickPress laundry, dry cleaning, and shoe care orders.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. TRANSACTION RECEIPT SLIP MODAL
      ======================================================== */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Transaction Slip
              </span>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="size-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <div className="py-5 text-center">
              <div
                className={`mx-auto size-12 rounded-2xl flex items-center justify-center ${
                  selectedTxn.direction === "credit"
                    ? "bg-emerald-50 text-[#00C853]"
                    : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {selectedTxn.direction === "credit" ? (
                  <ArrowDownLeft className="size-6 stroke-[2.5]" />
                ) : (
                  <ArrowUpRight className="size-6 stroke-[2.5]" />
                )}
              </div>
              <h3 className="mt-3 text-2xl font-black text-neutral-900">
                {selectedTxn.direction === "credit" ? "+" : "−"}₹{selectedTxn.amount}
              </h3>
              <p className="text-xs font-bold text-neutral-700 mt-0.5">{selectedTxn.title}</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 bg-emerald-50 text-[#00C853] text-[10px] font-bold rounded-full border border-emerald-100">
                {selectedTxn.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 border-t border-neutral-100 pt-3 text-xs">
              <div className="flex items-center justify-between text-neutral-500">
                <span>Date &amp; Time</span>
                <span className="font-semibold text-neutral-800">
                  {selectedTxn.dateLabel || selectedTxn.createdAt}
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-500">
                <span>Transaction Ref</span>
                <span className="font-mono text-[10px] font-bold text-neutral-700">
                  {selectedTxn.id}
                </span>
              </div>
              {selectedTxn.method && (
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Payment Mode</span>
                  <span className="font-bold text-neutral-800 capitalize">
                    {selectedTxn.method}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedTxn(null)}
              className="mt-5 w-full py-3 rounded-xl bg-neutral-900 text-white font-bold text-xs active:scale-98 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav active="wallet" />
    </main>
  );
}
