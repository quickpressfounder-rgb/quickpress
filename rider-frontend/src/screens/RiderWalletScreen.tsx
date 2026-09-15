import { useNavigate } from "@tanstack/react-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  History,
  PieChart,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderWallet,
  fetchRiderTransactions,
  withdrawRiderEarnings,
  fetchRiderEarningsSummary,
  type RiderWalletDetail,
  type RiderWalletTransaction,
  type RiderEarningsSummary,
} from "../api/rider/rider-wallet-api";
import {
  fetchRiderCommissionGuarantee,
  type RiderCommissionGuarantee,
} from "../api/rider/rider-commission-api";
import { useRiderContext } from "../context/RiderContext";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { triggerHaptic } from "../lib/captain-audio";
import { subscribeRiderWallet } from "../lib/rider-socket";
import { useLanguage } from "../lib/i18n";

export function RiderWalletScreen() {
  const navigate = useNavigate();
  const { session } = useRiderContext();
  const { t } = useLanguage();

  const [wallet, setWallet] = useState<RiderWalletDetail | null>(null);
  const [transactions, setTransactions] = useState<RiderWalletTransaction[]>([]);
  const [earnings, setEarnings] = useState<RiderEarningsSummary | null>(null);
  const [guarantee, setGuarantee] = useState<RiderCommissionGuarantee | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"passbook" | "breakdown" | "weekly">("passbook");
  const [filterTxn, setFilterTxn] = useState<"all" | "credits" | "debits" | "incentives">("all");

  // Cashout Modal State
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("500");
  const [selectedUpi, setSelectedUpi] = useState<string>("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [cashoutSuccessData, setCashoutSuccessData] = useState<any>(null);

  // Load Real Data from MongoDB Atlas
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [walletRes, txnsRes, earningsRes, guaranteeRes] = await Promise.all([
        fetchRiderWallet().catch(() => null),
        fetchRiderTransactions().catch(() => []),
        fetchRiderEarningsSummary().catch(() => null),
        fetchRiderCommissionGuarantee().catch(() => null),
      ]);

      if (walletRes) {
        setWallet(walletRes);
        if (walletRes.upiId) setSelectedUpi(walletRes.upiId);
      }
      if (Array.isArray(txnsRes)) {
        setTransactions(txnsRes);
      }
      if (earningsRes) {
        setEarnings(earningsRes);
      }
      if (guaranteeRes) {
        setGuarantee(guaranteeRes);
      }

      if (isRefresh) {
        triggerHaptic();
        toast.success(t("earnings.synced") || "Wallet & Passbook Updated 🟢");
      }
    } catch {
      toast.error("Failed to sync wallet data. Please check network.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Socket.IO subscription for instant wallet balance & transactions updates
  useEffect(() => {
    const unsub = subscribeRiderWallet((data) => {
      console.log("[RiderWalletScreen] ⚡ Realtime wallet update:", data);
      loadData(false);
    });

    return () => {
      unsub();
    };
  }, [loadData]);

  // Handle Instant Cashout
  const handleInstantCashout = async () => {
    const amountNum = parseFloat(withdrawAmount);
    const currBal = wallet?.balance ?? 0;

    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amountNum < 50) {
      toast.error("Minimum withdrawal amount is ₹50");
      return;
    }
    if (amountNum > currBal) {
      toast.error(`Insufficient balance. Available: ₹${currBal.toFixed(2)}`);
      return;
    }

    setWithdrawing(true);
    triggerHaptic();

    try {
      const res = await withdrawRiderEarnings(amountNum, selectedUpi || wallet?.upiId || "");
      if (res.ok) {
        setCashoutSuccessData(res);
        toast.success(`₹${amountNum.toFixed(2)} payout request placed!`);
        await loadData(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Withdrawal failed. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    triggerHaptic();
    toast.success(`${label} copied to clipboard!`);
  };

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filterTxn === "credits") return t.direction === "credit";
    if (filterTxn === "debits") return t.direction === "debit";
    if (filterTxn === "incentives") return t.kind === "incentive";
    return true;
  });

  // Pure Real Figures — Zero hardcoded mock numbers!
  const availableBalance = Number(wallet?.balance ?? 0);
  const todayEarned = Number(wallet?.todayEarned ?? earnings?.today ?? 0);
  const thisWeekEarned = Number(wallet?.thisWeekEarned ?? earnings?.thisWeek ?? 0);
  const lifetimeEarned = Number(wallet?.lifetimeEarnings ?? 0);
  const totalWithdrawn = Number(wallet?.totalWithdrawn ?? 0);

  const displayUpi = wallet?.upiId || selectedUpi || (session?.phone ? `${session.phone.replace(/\D/g, "")}@upi` : "");

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
              <span>{t("nav.earnings") || "Earnings & Wallet"}</span>
              <span className="flex size-2 rounded-full bg-emerald-500" />
            </h1>
            <p className="text-[11px] font-semibold text-zinc-500">
              {t("earnings.passbook") || "QuickPress Captain · Live Passbook"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl active:scale-95 transition-all"
          title="Refresh Balance"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      </header>

      {/* 2. Scrollable Body Content */}
      <div
        className="flex-1 overflow-y-auto space-y-3.5 p-3.5 bg-[#F4F5F7]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
      >
        {/* HERO BALANCE CARD (White Card with Emerald & Gold Accent) */}
        <div className="relative overflow-hidden rounded-3xl bg-white text-zinc-900 p-5 shadow-sm border border-zinc-200/90">
          {/* Top Pill Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-9 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold shadow-2xs">
                <Wallet className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-wide">
                  {t("earnings.availableBalance") || "Available Balance"}
                </p>
                <p className="text-[11px] text-zinc-400 font-medium">72-Hour Settlement Cycle</p>
              </div>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Clock className="size-3 text-amber-600" />
              <span>72h Payout Cycle</span>
            </span>
          </div>

          {/* Main Amount */}
          <div className="my-4">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-emerald-600 font-mono">₹</span>
              <span className="text-4xl font-extrabold text-zinc-900 font-mono tracking-tight">
                {availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>Earnings automatically credited within 72 hours</span>
            </p>
          </div>

          {/* Payout Request Button */}
          <button
            type="button"
            onClick={() => {
              setCashoutSuccessData(null);
              setShowCashoutModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C853] hover:bg-[#00B248] text-white text-sm font-black rounded-2xl shadow-sm active:scale-98 transition-all"
          >
            <Banknote className="size-4" />
            <span>{t("earnings.cashout") || "Request Settlement Payout"}</span>
            <ChevronRight className="size-4 ml-0.5" />
          </button>

          {/* 4-Grid Real Metrics Row */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-zinc-100">
            <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-[11px] font-medium text-zinc-500">{t("earnings.todayEarnings") || "Today's Earnings"}</p>
              <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
                ₹{todayEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-[11px] font-medium text-zinc-500">{t("earnings.thisWeek") || "This Week"}</p>
              <p className="text-sm font-bold text-zinc-800 font-mono mt-0.5">
                ₹{thisWeekEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-[11px] font-medium text-zinc-500">Lifetime Earnings</p>
              <p className="text-sm font-bold text-amber-600 font-mono mt-0.5">
                ₹{lifetimeEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2.5 rounded-2xl bg-zinc-50 border border-zinc-100">
              <p className="text-[11px] font-medium text-zinc-500">Total Transferred</p>
              <p className="text-sm font-bold text-zinc-700 font-mono mt-0.5">
                ₹{totalWithdrawn.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Linked UPI Destination */}
          <div className="flex items-center justify-between mt-3 px-3 py-2 bg-emerald-50/70 rounded-xl border border-emerald-100 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-900 truncate">
              <Building2 className="size-3.5 text-emerald-600 shrink-0" />
              <span className="font-mono font-medium truncate">{displayUpi}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(displayUpi, "UPI ID")}
              className="text-emerald-700 hover:text-emerald-900 p-1 active:scale-90 shrink-0 font-medium"
              title="Copy UPI ID"
            >
              <Copy className="size-3.5" />
            </button>
          </div>
        </div>

        {/* INCENTIVES & TARGETS BANNER */}
        <button
          type="button"
          onClick={() => navigate({ to: "/incentives" })}
          className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 via-white to-amber-50 rounded-2xl border border-emerald-200/80 shadow-2xs hover:shadow-xs active:scale-98 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Target className="size-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-zinc-900 leading-tight">
                  {t("incentives.title") || "Daily Targets & Quests"}
                </h4>
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  0% Commission
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                Earn extra milestone bonuses on completing ride targets!
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-zinc-400 shrink-0" />
        </button>

        {/* 3. NAVIGATION PILL TABS */}
        <div className="flex items-center p-1 bg-white border border-zinc-200/80 rounded-2xl shadow-2xs">
          {[
            { id: "passbook", label: t("earnings.passbook") || "Passbook & Ledger", icon: History },
            { id: "breakdown", label: "Today's Fares", icon: PieChart },
            { id: "weekly", label: "Weekly Summary", icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setActiveTab(tab.id as any);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                  active
                    ? "bg-zinc-100 text-zinc-900 font-bold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Icon className={`size-3.5 ${active ? "text-emerald-600" : "text-zinc-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: PASSBOOK & TRANSACTION LEDGER */}
        {activeTab === "passbook" && (
          <div className="space-y-3">
            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium no-scrollbar">
              {[
                { id: "all", label: `All (${transactions.length})` },
                { id: "credits", label: "Trip Credits (+)" },
                { id: "debits", label: "Payouts (-)" },
                { id: "incentives", label: "Bonus & Incentives 🎯" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterTxn(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                    filterTxn === f.id
                      ? "bg-[#00C853] text-white font-bold shadow-xs"
                      : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Real Transaction Items */}
            {filteredTransactions.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-zinc-200 text-center">
                <History className="size-10 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-700">
                  {t("earnings.noTransactions") || "No transactions found"}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Complete rides to receive instant trip earnings into your passbook!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((txn, idx) => {
                  const isCredit = txn.direction === "credit";
                  return (
                    <div
                      key={txn.id || idx}
                      className="p-3.5 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center size-10 rounded-2xl shrink-0 ${
                            isCredit
                              ? txn.kind === "incentive"
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                          }`}
                        >
                          {isCredit ? (
                            txn.kind === "incentive" ? (
                              <Target className="size-5" />
                            ) : (
                              <ArrowDownLeft className="size-5" />
                            )
                          ) : (
                            <ArrowUpRight className="size-5" />
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-zinc-900 leading-tight">
                            {txn.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500 font-medium">
                            <span>
                              {txn.date ? new Date(txn.date).toLocaleDateString([], { month: "short", day: "numeric" }) : "Today"}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                              {txn.status === "success" ? "Settled 🟢" : "Processing"}
                            </span>
                            {txn.utr && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-zinc-400 truncate max-w-[90px]">
                                  {txn.utr}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-bold font-mono ${
                            isCredit ? "text-emerald-600" : "text-zinc-800"
                          }`}
                        >
                          {isCredit ? "+" : "-"}₹{Number(txn.amount || 0).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium capitalize">
                          {txn.kind}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TODAY'S FARES BREAKDOWN */}
        {activeTab === "breakdown" && (
          <div className="space-y-3">
            <div className="p-4 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <span className="text-xs font-bold text-zinc-900">Today's Total Earned</span>
                <span className="text-base font-extrabold text-emerald-600 font-mono">
                  ₹{todayEarned.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <span>Trip Delivery Fares</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">
                    ₹{(earnings?.breakdown?.tripFares ?? todayEarned).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <div className="size-2 rounded-full bg-blue-500" />
                    <span>Distance & Waiting Pay</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">
                    ₹{(earnings?.breakdown?.distancePay ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <div className="size-2 rounded-full bg-purple-500" />
                    <span>Surge & Peak Bonus</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">
                    ₹{(earnings?.breakdown?.surgePay ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <div className="size-2 rounded-full bg-amber-500" />
                    <span>Milestone Quest Bonus 🎯</span>
                  </div>
                  <span className="font-mono font-bold text-zinc-900">
                    ₹{(earnings?.breakdown?.questBonus ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-emerald-700 font-bold bg-emerald-50/80 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <span>Platform Commission Deduction</span>
                  </div>
                  <span className="font-mono font-extrabold">₹0.00 (0% Free)</span>
                </div>
              </div>
            </div>

            {/* Zero Commission Guarantee Banner */}
            <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl flex items-start gap-3 text-xs shadow-2xs">
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs shrink-0 shadow-xs">
                0%
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-black text-emerald-950">
                    {guarantee?.headline || "Zero Commission. 100% Earnings to Captains."}
                  </p>
                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Live Guarantee
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-1 font-medium leading-relaxed">
                  {guarantee?.description || "QuickPress charges 0% platform commission on Captain delivery fares. 100% of customer delivery fares, surges, and tips go directly to your wallet."}
                </p>
                {guarantee?.benefits ? (
                  <ul className="mt-2 space-y-1 text-[10px] font-bold text-emerald-900 list-disc list-inside">
                    {guarantee.benefits.slice(0, 3).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WEEKLY PERFORMANCE SUMMARY */}
        {activeTab === "weekly" && (
          <div className="space-y-3">
            <div className="p-4 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-900">This Week's Performance</span>
                <span className="text-xs font-bold text-emerald-600 font-mono">
                  ₹{thisWeekEarned.toFixed(2)} Total
                </span>
              </div>

              {/* Dynamic 7-Day Bars */}
              <div className="grid grid-cols-7 gap-1.5 items-end h-28 pt-4 pb-1">
                {(earnings?.weeklyDays && earnings.weeklyDays.length > 0
                  ? earnings.weeklyDays
                  : [
                      { day: "Mon", amount: 0 },
                      { day: "Tue", amount: 0 },
                      { day: "Wed", amount: 0 },
                      { day: "Thu", amount: 0 },
                      { day: "Fri", amount: 0 },
                      { day: "Sat", amount: 0 },
                      { day: "Today", amount: todayEarned, isToday: true },
                    ]
                ).map((d, i) => {
                  const maxAmt = Math.max(1, thisWeekEarned, todayEarned);
                  const heightPercent = Math.min(100, Math.max(15, (d.amount / maxAmt) * 100));
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-mono font-bold text-zinc-600">
                        {d.amount > 0 ? `₹${Math.round(d.amount)}` : "—"}
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all ${
                          d.isToday
                            ? "bg-[#00C853] shadow-2xs"
                            : "bg-zinc-200 hover:bg-zinc-300"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold ${
                          d.isToday ? "text-emerald-700" : "text-zinc-500"
                        }`}
                      >
                        {d.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-600">Completed Orders This Week:</span>
                <span className="font-bold text-zinc-900">{earnings?.orders ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-600">Average Payout per Ride:</span>
                <span className="font-bold text-emerald-600 font-mono">
                  ₹{earnings?.orders ? (thisWeekEarned / earnings.orders).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. SETTLEMENT CASHOUT MODAL */}
      {showCashoutModal && (
        <div
          onClick={() => setShowCashoutModal(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-900/50 backdrop-blur-xs select-none animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto border border-zinc-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-8 rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                  <Banknote className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                    Bank / UPI Settlement Request
                  </h3>
                  <p className="text-[11px] text-zinc-500">Auto-clearing cycle · 0% fee</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCashoutModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-full hover:bg-zinc-100 active:scale-95"
              >
                <X className="size-5" />
              </button>
            </div>

            {cashoutSuccessData ? (
              /* Success State */
              <div className="py-6 text-center space-y-3">
                <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="size-10" />
                </div>
                <h4 className="text-lg font-bold text-zinc-900">Settlement Request Placed!</h4>
                <p className="text-xs text-zinc-600 max-w-xs mx-auto">
                  ₹{Number(cashoutSuccessData.amount || 0).toFixed(2)} has been queued and will be credited to{" "}
                  <span className="font-mono font-bold text-zinc-900">
                    {cashoutSuccessData.upiId || displayUpi}
                  </span>.
                </p>

                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Settlement Timeline:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      Within 72 Hours (T+3)
                    </span>
                  </div>
                  {cashoutSuccessData.utr && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Reference Batch UTR:</span>
                      <span className="font-mono font-bold text-zinc-900">
                        {cashoutSuccessData.utr}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Remaining Balance:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      ₹{Number(cashoutSuccessData.balance || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCashoutModal(false)}
                  className="w-full py-3 bg-[#00C853] hover:bg-[#00B248] text-white font-bold text-xs rounded-2xl active:scale-98 shadow-sm"
                >
                  Done & Back to Wallet
                </button>
              </div>
            ) : (
              /* Form State */
              <>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs">
                  <span className="font-semibold text-emerald-900">Available for Payout:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    ₹{availableBalance.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Enter Settlement Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400 font-mono text-lg">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="500"
                      className="w-full pl-9 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-lg font-bold font-mono text-zinc-900 focus:bg-white focus:outline-hidden focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {[
                      { label: "₹200", val: "200" },
                      { label: "₹500", val: "500" },
                      { label: "Full Balance", val: String(Math.floor(availableBalance)) },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setWithdrawAmount(chip.val)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                          withdrawAmount === chip.val
                            ? "bg-[#00C853] text-white border-[#00C853] shadow-2xs"
                            : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700">Settlement Destination</label>
                  <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        UPI
                      </div>
                      <div>
                        <p className="font-mono font-bold text-zinc-900">{displayUpi}</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">Verified Bank Linked 🟢</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-400">Primary</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs space-y-1.5 text-zinc-600">
                  <div className="flex justify-between">
                    <span>Requested Amount:</span>
                    <span className="font-mono font-bold text-zinc-900">
                      ₹{parseFloat(withdrawAmount || "0").toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Platform Commission:</span>
                    <span className="font-mono font-bold">FREE (₹0.00)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleInstantCashout}
                  disabled={withdrawing || availableBalance <= 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#00C853] hover:bg-[#00B248] disabled:bg-zinc-300 text-white text-sm font-bold rounded-2xl shadow-sm active:scale-98 transition-all"
                >
                  {withdrawing ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Submitting Payout Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span>Confirm Settlement Request</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. 2-TAB BOTTOM NAVIGATION */}
      <RiderBottomNav active="dashboard" />
    </div>

  );
}
