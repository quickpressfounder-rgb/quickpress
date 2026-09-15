import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  Loader2,
  Plus,
  Receipt,
  RefreshCcw,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet as WalletIcon,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/home/BottomNav";
import { WalletSkeleton } from "@/components/rewards/RewardsSkeletons";
import { NotificationBellAction, ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import {
  QUICK_AMOUNTS,
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
      { title: "Wallet — QuickPress Cashback & Rewards" },
      {
        name: "description",
        content:
          "Check your QuickPress wallet balance, cashback and reward points, add money, redeem rewards and track every laundry transaction in one place.",
      },
      { property: "og:title", content: "Wallet — QuickPress Cashback & Rewards" },
      {
        name: "description",
        content:
          "Wallet balance, cashback, reward points and referral earnings for your QuickPress laundry orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WalletScreen,
});

const TXN_META: Record<TransactionKind, { icon: typeof Receipt; tone: string }> = {
  "order-cashback": { icon: Sparkles, tone: "bg-primary/15 text-brand-dark" },
  "referral-bonus": { icon: Users, tone: "bg-secondary/10 text-brand-green" },
  refund: { icon: RefreshCcw, tone: "bg-secondary/10 text-brand-green" },
  recharge: { icon: Plus, tone: "bg-primary/15 text-brand-dark" },
  "add-funds": { icon: Plus, tone: "bg-primary/15 text-brand-dark" },
  "reward-credit": { icon: Gift, tone: "bg-muted text-muted-foreground" },
  "membership-credit": { icon: Sparkles, tone: "bg-secondary/10 text-brand-green" },
  "order-payment": { icon: Receipt, tone: "bg-primary/15 text-brand-dark" },
};

const STATUS_TONE: Record<TransactionStatus, string> = {
  success: "bg-secondary/10 text-brand-green",
  pending: "bg-primary/15 text-brand-dark",
  failed: "bg-destructive/10 text-destructive",
};

const PAYMENT_STATUS_TONE: Record<string, string> = {
  paid: "bg-secondary/10 text-brand-green",
  completed: "bg-secondary/10 text-brand-green",
  pending: "bg-primary/15 text-brand-dark",
  processing: "bg-primary/15 text-brand-dark",
  created: "bg-primary/15 text-brand-dark",
  requested: "bg-primary/15 text-brand-dark",
  failed: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

function statusTone(status: string) {
  return PAYMENT_STATUS_TONE[status] ?? "bg-muted text-muted-foreground";
}

const TOPUP_METHODS = [
  {
    id: "upi",
    name: "UPI / QR",
    description: "Google Pay, PhonePe, Paytm, BHIM",
    icon: Smartphone,
    badge: "Fastest",
  },
  {
    id: "card",
    name: "Cards",
    description: "Credit & Debit Cards (Visa, RuPay)",
    icon: CreditCard,
  },
  {
    id: "netbanking",
    name: "Net Banking",
    description: "All Major Indian Banks",
    icon: Building,
  },
  {
    id: "wallet",
    name: "Express Top-up",
    description: "Direct instant wallet credit",
    icon: Zap,
    badge: "Instant",
  },
];

const EXTENDED_QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

function WalletScreen() {
  useAuthGuard();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState<string>("500");
  const [selectedMethod, setSelectedMethod] = useState<string>("upi");
  const [adding, setAdding] = useState(false);

  // GET /api/wallet + /api/wallet/history + /api/payments + /api/refunds
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
      setError(cause instanceof Error ? cause.message : "We couldn't load your wallet.");
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

  // Auto-sync when the device comes back online.
  useEffect(() => {
    const onOnline = () => void load(true);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load]);

  const handleRefresh = async () => {
    setBusy("refresh");
    await load(true);
    setBusy(null);
  };

  const submitAddFunds = async (value: number) => {
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount greater than ₹0");
      return;
    }
    if (value > 100000) {
      toast.error("Amount can't exceed ₹1,00,000");
      return;
    }
    setAdding(true);
    try {
      if (selectedMethod === "wallet") {
        const result = await addFunds(value, selectedMethod);
        setWallet(result.wallet);
        toast.success(result.message || `₹${value} added to your wallet!`);
        setAddOpen(false);
        setAmount("500");
        await load(true);
      } else {
        // Online Payment via Razorpay (UPI, Cards, NetBanking)
        const payResult = await payWithRazorpay({
          amount: value,
          purpose: "Wallet Top-up",
          description: `Add ₹${value} to QuickPress Wallet via ${selectedMethod.toUpperCase()}`,
        });

        if (payResult.status === "paid") {
          const paymentId = payResult.payment?.id || (payResult.payment as any)?.razorpayPaymentId || undefined;
          const result = await addFunds(value, selectedMethod, paymentId);
          setWallet(result.wallet);
          toast.success(result.message || `₹${value} successfully added to your wallet!`);
          setAddOpen(false);
          setAmount("500");
          await load(true);
        } else if (payResult.status === "cancelled") {
          toast.info("Payment cancelled. You can try again anytime.");
        } else {
          toast.error(payResult.message || "Payment failed. Please try again.");
        }
      }
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Couldn't add money right now");
    } finally {
      setAdding(false);
    }
  };

  const handleShareReferral = async () => {
    const code = wallet?.referralCode ?? "QPRESS250";
    const text = `Use my QuickPress code ${code} and get ₹150 off your first laundry pickup!`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "QuickPress", text });
        return;
      } catch {
        /* user dismissed the share sheet */
      }
    }
    await navigator.clipboard?.writeText(text);
    toast.success("Referral link copied");
  };

  const quickActions = [
    { id: "add", label: "Add Money", icon: Plus, onClick: () => setAddOpen(true) },
    {
      id: "refresh",
      label: "Refresh",
      icon: RefreshCcw,
      onClick: () => void handleRefresh(),
    },
    {
      id: "redeem",
      label: "Redeem",
      icon: Gift,
      onClick: () => navigate({ to: "/offers" }),
    },
    {
      id: "history",
      label: "History",
      icon: Receipt,
      onClick: () =>
        document.getElementById("wallet-transactions")?.scrollIntoView({ behavior: "smooth" }),
    },
  ];

  const loading = !wallet || !transactions;
  const numAmount = Number(amount) || 0;
  const currentBal = wallet?.balances.currentBalance || 0;
  const projectedBal = currentBal + (numAmount > 0 ? numAmount : 0);

  return (
    <main className="relative min-h-screen overflow-x-hidden scroll-smooth bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar title="Wallet" action={<NotificationBellAction count={2} />} />

        {loading && !error ? (
          <WalletSkeleton />
        ) : error && !wallet ? (
          <div className="px-5 pb-32 pt-4">
            <section className="card-soft border border-border p-6 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <WifiOff className="size-5" />
              </span>
              <p className="mt-3 text-sm font-black tracking-tight text-foreground">
                Wallet unavailable
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              <button
                type="button"
                onClick={() => void load(true)}
                className="mt-4 rounded-full bg-gradient-to-r from-brand-green to-primary px-5 py-2.5 text-xs font-black tracking-tight text-background shadow-cta transition-transform duration-300 active:scale-[0.96]"
              >
                Try again
              </button>
            </section>
          </div>
        ) : wallet ? (
          <div className="px-5 pb-32 pt-4">
            {offline ? (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-2.5">
                <WifiOff className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-[0.68rem] font-semibold text-muted-foreground">
                  Showing saved wallet data — it syncs when you're back online.
                </p>
              </div>
            ) : null}

            {/* Balances hero */}
            <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-white p-6 text-foreground shadow-soft dark:bg-card">
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-emerald-500/5 blur-2xl" />

              <div className="relative flex items-start justify-between">
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
                    Total Spendable Balance
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tight text-black dark:text-white">
                      {formatAmount(wallet.totalBalance)}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">INR</span>
                  </div>
                </div>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <WalletIcon className="size-5" />
                </span>
              </div>

              {/* Sub-balances */}
              <div className="relative mt-6 grid grid-cols-3 gap-2 border-t border-border pt-4">
                <div>
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                    Main
                  </span>
                  <span className="mt-0.5 block text-sm font-black tracking-tight text-black dark:text-white">
                    {formatAmount(wallet.balances.currentBalance)}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                    Cashback
                  </span>
                  <span className="mt-0.5 block text-sm font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                    {formatAmount(wallet.balances.rewardBalance)}
                  </span>
                </div>
                <div>
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                    Credits
                  </span>
                  <span className="mt-0.5 block text-sm font-black tracking-tight text-black dark:text-white">
                    {formatAmount(wallet.balances.membershipCredits)}
                  </span>
                </div>
              </div>
            </section>

            {/* Quick action grid */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                const isSpinning = busy === action.id;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    className="card-soft flex flex-col items-center justify-center gap-1.5 border border-border p-3 text-center transition-all duration-300 hover:border-primary/60 active:scale-[0.95]"
                  >
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                      <Icon className={`size-4 ${isSpinning ? "animate-spin" : ""}`} />
                    </span>
                    <span className="text-[0.68rem] font-bold tracking-tight text-foreground">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Refer and Earn Banner */}
            <section className="card-soft mt-4 border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary/15 text-brand-green">
                    <Sparkles className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-black tracking-tight text-foreground">
                      Refer &amp; Earn ₹150
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      Your friend gets ₹150 off, you get ₹150 in wallet.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleShareReferral()}
                  className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-[0.68rem] font-bold text-brand-dark transition-transform duration-200 active:scale-95"
                >
                  <Share2 className="size-3" />
                  Share
                </button>
              </div>
            </section>

            {/* Transaction Ledger */}
            <section id="wallet-transactions" className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Recent Transactions
                </h2>
                <span className="text-[0.68rem] font-bold text-muted-foreground">
                  {transactions?.length ?? 0} entries
                </span>
              </div>

              <div className="stagger-children mt-4 space-y-3">
                {(transactions ?? []).length === 0 ? (
                  <article className="card-soft border border-border p-6 text-center">
                    <p className="text-sm font-bold tracking-tight text-foreground">
                      No wallet activity yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add money to your wallet to see transactions here.
                    </p>
                  </article>
                ) : (
                  (transactions ?? []).map((txn) => {
                    const meta = TXN_META[txn.kind] ?? TXN_META["add-funds"];
                    const Icon = meta.icon;
                    const isCredit = txn.direction === "credit";
                    return (
                      <article
                        key={txn.id} className="card-soft flex items-center gap-3 border border-border p-4 transition-all duration-300 hover:border-primary/60"
                      >
                        <span
                          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}
                        >
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold tracking-tight text-foreground">
                            {txn.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="truncate text-[0.68rem] text-muted-foreground">
                              {txn.dateLabel}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${STATUS_TONE[txn.status]}`}
                            >
                              {txn.status}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`shrink-0 text-sm font-black tracking-tight ${
                            isCredit ? "text-brand-green" : "text-foreground"
                          }`}
                        >
                          {isCredit ? "+" : "−"}
                          {formatAmount(txn.amount)}
                        </p>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            {/* Payment history — GET /api/payments */}
            <section className="mt-7">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black tracking-tight text-foreground">
                  Payment History
                </h2>
                <span className="text-[0.68rem] font-semibold text-muted-foreground">
                  {payments.length} payments
                </span>
              </div>

              <div className="stagger-children mt-4 space-y-3">
                {payments.length === 0 ? (
                  <article className="card-soft border border-border p-6 text-center">
                    <p className="text-sm font-bold tracking-tight text-foreground">
                      No payments yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your order payments will appear here with their transaction IDs.
                    </p>
                  </article>
                ) : (
                  payments.map((payment) => (
                    <article
                      key={payment.id}
                      className="card-soft border border-border p-4 transition-all duration-300 hover:border-primary/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold tracking-tight text-foreground">
                            {payment.methodLabel}
                          </p>
                          <p className="mt-1 text-[0.68rem] text-muted-foreground">
                            {payment.dateLabel} · {payment.transactionId}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black tracking-tight text-foreground">
                            {formatAmount(payment.amount)}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${statusTone(payment.status)}`}
                          >
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            {/* Refunds — GET /api/refunds */}
            <section className="mt-7">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black tracking-tight text-foreground">Refunds</h2>
                <span className="text-[0.68rem] font-semibold text-muted-foreground">
                  {refunds.length} refunds
                </span>
              </div>

              <div className="stagger-children mt-4 space-y-3">
                {refunds.length === 0 ? (
                  <article className="card-soft border border-border p-6 text-center">
                    <p className="text-sm font-bold tracking-tight text-foreground">
                      No refunds yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Refunds for cancelled orders show up here.
                    </p>
                  </article>
                ) : (
                  refunds.map((refund) => (
                    <article
                      key={refund.id}
                      className="card-soft flex items-center gap-3 border border-border p-4 transition-all duration-300 hover:border-primary/60"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                        <RefreshCcw className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold tracking-tight text-foreground">
                          {refund.reason}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="truncate text-[0.68rem] text-muted-foreground">
                            {refund.dateLabel}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${statusTone(refund.status)}`}
                          >
                            {refund.status}
                          </span>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-black tracking-tight text-brand-green">
                        +{formatAmount(refund.amount)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            {/* Refer & earn */}
            <section className="card-soft mt-7 border border-border p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                  <Users className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black tracking-tight text-foreground">
                    Refer &amp; Earn
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Invite friends and you both earn ₹150 wallet credit on their first pickup.
                    You've earned {formatAmount(wallet.referralEarned)} so far.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(wallet.referralCode);
                    toast.success("Referral code copied");
                  }}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border border-dashed border-primary bg-primary/10 px-4 py-3 transition-all duration-300 active:scale-[0.97]"
                >
                  <span className="truncate text-sm font-black tracking-widest text-brand-dark">
                    {wallet.referralCode || "—"}
                  </span>
                  <Copy className="size-4 shrink-0 text-brand-dark" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareReferral()}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-brand-green to-primary px-5 py-3 text-xs font-black tracking-tight text-background shadow-cta transition-transform duration-300 active:scale-[0.96]"
                >
                  <Share2 className="size-4" />
                  Share
                </button>
              </div>
            </section>

            <button
              type="button"
              onClick={() => navigate({ to: "/payment-methods" })}
              className="card-soft mt-4 flex w-full items-center justify-between gap-3 border border-border p-4 transition-all duration-300 hover:border-primary/60 active:scale-[0.98]"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                  <WalletIcon className="size-5" />
                </span>
                <span className="text-sm font-bold tracking-tight text-foreground">
                  Payment Methods
                </span>
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => navigate({ to: "/offers" })}
              className="card-soft mt-4 flex w-full items-center justify-between gap-3 border border-border p-4 transition-all duration-300 hover:border-primary/60 active:scale-[0.98]"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                  <Gift className="size-5" />
                </span>
                <span className="text-sm font-bold tracking-tight text-foreground">
                  Offers &amp; Coupons
                </span>
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Enhanced Add funds modal sheet */}
      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 backdrop-blur-sm px-0 transition-opacity">
          <div className="w-full max-w-md rounded-t-[2rem] border-t border-border bg-background p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark shadow-sm">
                  <Plus className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight text-foreground">Add Money to Wallet</h3>
                  <p className="text-[0.68rem] text-muted-foreground">
                    Instant credit • Zero fees • 100% Secure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="flex size-9 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-transform duration-200 active:scale-90 hover:bg-muted/80"
                aria-label="Close add funds"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick Amount Pills */}
            <div className="mt-5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                Popular Amounts
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {EXTENDED_QUICK_AMOUNTS.map((val) => {
                  const isSelected = amount === String(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={adding}
                      onClick={() => setAmount(String(val))}
                      className={`relative rounded-2xl border py-2.5 text-xs font-black tracking-tight transition-all duration-200 active:scale-95 disabled:opacity-60 ${
                        isSelected
                          ? "border-primary bg-primary/20 text-brand-dark shadow-sm ring-1 ring-primary"
                          : "border-border bg-muted/40 text-foreground hover:border-primary/50"
                      }`}
                    >
                      ₹{val}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Input */}
            <div className="mt-4">
              <label className="block">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Or Enter Custom Amount
                </span>
                <div className="relative mt-1.5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-foreground">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    inputMode="numeric"
                    value={amount}
                    disabled={adding}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter amount"
                    className="w-full rounded-2xl border border-border bg-background py-3.5 pl-9 pr-4 text-base font-black tracking-tight text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </label>
            </div>

            {/* Payment Method Selector */}
            <div className="mt-5">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted-foreground">
                Select Payment Mode
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {TOPUP_METHODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={adding}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-200 active:scale-98 disabled:opacity-60 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className={`flex size-7 items-center justify-center rounded-xl ${isSelected ? "bg-primary/20 text-brand-dark" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="size-3.5" />
                        </span>
                        {m.badge ? (
                          <span className="rounded-full bg-brand-green/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-brand-green">
                            {m.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs font-black tracking-tight text-foreground">{m.name}</p>
                      <p className="text-[0.62rem] text-muted-foreground line-clamp-1">{m.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Projected Balance Breakdown Card */}
            {numAmount > 0 ? (
              <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Current Balance</span>
                  <span className="font-bold text-foreground">₹{currentBal}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-semibold text-brand-green">
                  <span>Top-up Amount</span>
                  <span className="font-black">+₹{numAmount}</span>
                </div>
                <div className="mt-2 border-t border-border/80 pt-2 flex items-center justify-between text-xs font-black text-foreground">
                  <span>New Wallet Balance</span>
                  <span className="text-sm font-black text-brand-dark">₹{projectedBal}</span>
                </div>
              </div>
            ) : null}

            {/* Primary Submit Button */}
            <button
              type="button"
              disabled={adding || numAmount <= 0}
              onClick={() => void submitAddFunds(numAmount)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-green to-primary py-4 text-sm font-black tracking-tight text-background shadow-cta transition-transform duration-200 active:scale-98 disabled:opacity-50"
            >
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Proceed &amp; Add ₹{numAmount || 0}
            </button>

            {/* Trust & Compliance note */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.65rem] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-brand-green" />
              <span>256-bit SSL Security • Instant Credit • Zero Surcharge</span>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav active="wallet" />
    </main>
  );
}
