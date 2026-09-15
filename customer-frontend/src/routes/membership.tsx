import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  Clock,
  CloudOff,
  CreditCard,
  Crown,
  Gift,
  Headphones,
  Loader2,
  Package,
  Percent,
  Receipt,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingUp,
  Truck,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/home/BottomNav";
import { FloatingCartBar } from "@/components/cart/FloatingCartBar";
import { EmptyState } from "@/components/common/EmptyState";
import {
  MembershipHistorySkeleton,
  MembershipSkeleton,
} from "@/components/membership/MembershipSkeletons";
import { NotificationBellAction, ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import { isApiError } from "@/api/core/errors";
import { isOnline, onNetworkChange } from "@/api/customer/api/network";
import {
  cancelMembership,
  fetchMembership,
  fetchMembershipHistory,
  fetchMembershipPlans,
  formatMembershipDate,
  formatMembershipPrice,
  subscribeMembership,
  type BillingCycle,
  type Membership,
  type MembershipHistory,
  type MembershipPlan,
  type MembershipPlanId,
  type MembershipPlans,
} from "@/api/customer/membership-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { payWithRazorpay } from "@/api/payments/razorpay-api";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "QuickPress Membership — Plans, Benefits & Renewal" },
      {
        name: "description",
        content:
          "Compare QuickPress Free, Silver, Gold and Premium memberships, track your expiry and remaining days, renew or cancel, and view your subscription history.",
      },
      { property: "og:title", content: "QuickPress Membership — Plans, Benefits & Renewal" },
      {
        property: "og:description",
        content:
          "Subscribe to a QuickPress membership for free pickup, free delivery, extra discounts and priority laundry processing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MembershipScreen,
});

type TabId = "overview" | "orders" | "plans" | "history";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "My plan" },
  { id: "orders", label: "Orders" },
  { id: "plans", label: "Plans" },
  { id: "history", label: "Ledger" },
];


const BENEFIT_ICONS = {
  truck: Truck,
  package: Package,
  percent: Percent,
  zap: Zap,
  headphones: Headphones,
  gift: Gift,
  clock: Clock,
  sparkles: Sparkles,
} as const;

function benefitIcon(icon: string) {
  return BENEFIT_ICONS[icon as keyof typeof BENEFIT_ICONS] ?? Sparkles;
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Crown;
  label: string;
  value: string;
}) {
  return (
    <div className="card-soft flex flex-col items-start gap-2 border border-border px-4 py-4">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/12 text-brand-dark">
        <Icon className="size-4" />
      </span>
      <p className="text-lg font-black leading-none tracking-tight text-foreground">{value}</p>
      <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function BenefitRow({ title, description, icon }: { title: string; description: string; icon: string }) {
  const Icon = benefitIcon(icon);
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-brand-dark">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground">{title}</p>
        {description ? (
          <p className="mt-0.5 text-[0.7rem] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </li>
  );
}

function PlanCard({
  plan,
  cycle,
  current,
  busy,
  onSubscribe,
}: {
  plan: MembershipPlan;
  cycle: BillingCycle;
  current: boolean;
  busy: boolean;
  onSubscribe: (planId: MembershipPlanId) => void;
}) {
  const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const suffix = price > 0 ? (cycle === "yearly" ? "/year" : "/month") : "";
  return (
    <article className="card-soft border border-border px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-black tracking-tight text-foreground">
            {plan.name}
            {plan.popular ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-brand-dark">
                Popular
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">{plan.tagline}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-black leading-none tracking-tight text-foreground">
            {formatMembershipPrice(price)}
          </p>
          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-widest text-muted-foreground">
            {suffix || "forever"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2.5 py-1 text-[0.62rem] font-semibold text-muted-foreground">
          {cycle === "yearly" ? `Valid ${plan.yearlyValidityDays} days` : plan.validityLabel}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[0.62rem] font-semibold text-muted-foreground">
          {plan.savingsLabel}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {plan.benefits.map((benefit) => (
          <BenefitRow
            key={benefit.id}
            title={benefit.title}
            description={benefit.description}
            icon={benefit.icon}
          />
        ))}
      </ul>

      <button
        type="button"
        disabled={busy || current}
        onClick={() => onSubscribe(plan.id)}
        className="ripple mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.97] disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {current ? "Current plan" : price > 0 ? `Subscribe ${cycle}` : "Switch to Free"}
      </button>
    </article>
  );
}

function MembershipScreen() {
  useAuthGuard();
  const navigate = useNavigate();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [plans, setPlans] = useState<MembershipPlans | null>(null);
  const [history, setHistory] = useState<MembershipHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [pendingPlan, setPendingPlan] = useState<MembershipPlanId | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async (options: { refresh?: boolean } = {}) => {
    if (options.refresh) setRefreshing(true);
    setError(null);
    try {
      const [current, catalogue] = await Promise.all([
        fetchMembership(options.refresh ? { forceRefresh: true } : {}),
        fetchMembershipPlans(options.refresh ? { forceRefresh: true } : {}),
      ]);
      setMembership(current);
      setPlans(catalogue);
    } catch (caught) {
      setError(isApiError(caught) ? caught.userMessage : "We couldn't load your membership.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadHistory = useCallback(async (options: { refresh?: boolean } = {}) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await fetchMembershipHistory(options.refresh ? { forceRefresh: true } : {}));
    } catch (caught) {
      setHistoryError(
        isApiError(caught) ? caught.userMessage : "We couldn't load your membership history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === "history" && !history && !historyLoading) void loadHistory();
  }, [tab, history, historyLoading, loadHistory]);

  /* Offline banner + automatic sync when the connection returns. */
  useEffect(() => {
    setOffline(!isOnline());
    return onNetworkChange((online) => {
      setOffline(!online);
      if (online) {
        void load({ refresh: true });
        if (history) void loadHistory({ refresh: true });
      }
    });
  }, [load, loadHistory, history]);

  const handleSubscribe = async (planId: MembershipPlanId) => {
    setPendingPlan(planId);
    try {
      const selectedPlan = plans?.plans.find((p) => p.id === planId);
      const planPrice = selectedPlan ? (cycle === "yearly" ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice) : 0;

      if (planId !== "free" && planPrice > 0) {
        const payResult = await payWithRazorpay({
          amount: planPrice,
          purpose: `Membership: ${planId} (${cycle})`,
          description: `Subscribe to ${selectedPlan?.name || planId} Plan (${cycle})`,
        });

        if (payResult.status === "paid") {
          toast.success(`Welcome to ${selectedPlan?.name || "VIP"} Membership!`);
          setHistory(null);
          await load({ refresh: true });
          setTab("overview");
        } else if (payResult.status === "cancelled") {
          toast.info("Payment cancelled.");
        } else {
          toast.error(payResult.message || "Payment failed. Please try again.");
        }
      } else {
        const result = await subscribeMembership(planId, cycle);
        toast.success(result.message);
        setHistory(null);
        await load({ refresh: true });
        setTab("overview");
      }
    } catch (caught) {
      toast.error(
        isApiError(caught) ? caught.userMessage : "We couldn't update your membership.",
      );
    } finally {
      setPendingPlan(null);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const result = await cancelMembership();
      toast.success(result.message);
      setHistory(null);
      await load({ refresh: true });
    } catch (caught) {
      toast.error(
        isApiError(caught) ? caught.userMessage : "We couldn't cancel your membership.",
      );
    } finally {
      setCancelling(false);
    }
  };

  const activePlan = membership?.plan ?? null;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar title="Membership" action={<NotificationBellAction />} />

        {offline ? (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            <CloudOff className="size-4" />
            You're offline — showing your saved membership.
          </div>
        ) : null}

        {!membership && !error ? <MembershipSkeleton /> : null}

        {!membership && error ? (
          <div className="px-5 pb-32 pt-6">
            <EmptyState
              icon={CloudOff}
              title="Membership didn't load"
              description={error}
              actionLabel="Try again"
              onAction={() => void load({ refresh: true })}
            />
          </div>
        ) : null}

        {membership ? (
          <div className="px-5 pb-32 pt-4">
            {/* Current plan — GET /api/membership */}
            <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-white p-5 text-foreground shadow-soft dark:bg-card">
              <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
                    {membership.active ? "Current plan" : "VIP Membership"}
                  </p>
                  <p className="mt-1 flex items-center gap-2 truncate text-2xl font-black tracking-tight text-black dark:text-white">
                    <Crown className="size-5 text-emerald-600 dark:text-emerald-400" />
                    {membership.active ? membership.planName : "Join VIP Membership"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {membership.active
                      ? `Active until ${membership.expiresLabel} · ${membership.remainingDays} day${
                          membership.remainingDays === 1 ? "" : "s"
                        } remaining`
                      : membership.status === "expired"
                        ? "Your membership expired — renew to restore your benefits."
                        : membership.status === "cancelled"
                          ? "Membership cancelled. Choose a plan to unlock VIP benefits."
                          : "Choose a VIP plan below to unlock unlimited ₹0 Delivery, member discounts, and priority express turnaround."}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Refresh membership"
                  onClick={() => void load({ refresh: true })}
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/50 text-foreground transition-all duration-300 hover:bg-muted active:scale-[0.94]"
                >
                  {refreshing ? (
                    <Loader2 className="size-4 animate-spin text-emerald-600" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                </button>
              </div>

              <div className="relative mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  {membership.active ? membership.billingCycle ?? "active" : "no active plan"}
                </span>
                <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-foreground">
                  {membership.active ? membership.status : "Not Subscribed"}
                </span>
                {membership.amountPaid > 0 ? (
                  <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-foreground">
                    {formatMembershipPrice(membership.amountPaid)} paid
                  </span>
                ) : null}
              </div>
            </section>


            <section className="mt-5 grid grid-cols-2 gap-3">
              <StatCard
                icon={Clock}
                label="Days remaining"
                value={String(membership.remainingDays)}
              />
              <StatCard icon={BadgeCheck} label="Expires on" value={membership.expiresLabel} />
            </section>

            {/* Live Quotas & Limits ("Kitna Bacha Hai") */}
            {membership.active && membership.planId !== "free" ? (
              <section className="mt-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black tracking-tight text-foreground">
                    Plan Quota &amp; Balance
                  </h2>
                  <span className="text-[11px] font-bold text-primary">
                    {membership.quota.remainingOrders} orders left
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  {/* Orders Quota Card */}
                  <div className="card-soft border border-border p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <Package className="size-4" />
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {membership.quota.remainingOrders} Left
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">Monthly Orders</p>
                    <p className="text-base font-black text-foreground">
                      {membership.quota.usedOrders}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        / {membership.quota.totalOrders || "Unlimited"}
                      </span>
                    </p>
                    {membership.quota.totalOrders > 0 ? (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (membership.quota.usedOrders / membership.quota.totalOrders) * 100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Weight Quota Card */}
                  <div className="card-soft border border-border p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <Scale className="size-4" />
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {membership.quota.remainingWeightKg} kg Left
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">Weight Allowance</p>
                    <p className="text-base font-black text-foreground">
                      {membership.quota.usedWeightKg}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        / {membership.quota.totalWeightKg || "100"} kg
                      </span>
                    </p>
                    {membership.quota.totalWeightKg > 0 ? (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (membership.quota.usedWeightKg / membership.quota.totalWeightKg) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Total Savings & Express Perks */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="card-soft border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold uppercase text-muted-foreground">
                          Total Saved
                        </p>
                        <p className="truncate text-sm font-black text-emerald-600 dark:text-emerald-400">
                          ₹{membership.quota.totalSavings.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="card-soft border border-primary/20 bg-primary/5 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                        <Zap className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold uppercase text-muted-foreground">
                          Express Perks
                        </p>
                        <p className="truncate text-sm font-black text-foreground">
                          {membership.quota.freeExpressRemaining}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            / {membership.quota.freeExpressTotal}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Tabs */}
            <div className="mt-6 flex gap-2 rounded-2xl bg-muted p-1">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`h-9 flex-1 rounded-xl text-xs font-bold transition-all duration-300 ${
                    tab === item.id
                      ? "bg-background text-foreground shadow-soft"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "overview" ? (
              <>
                {/* Active benefits — GET /api/membership/benefits */}
                <section className="mt-5">
                  <h2 className="text-sm font-bold tracking-tight text-foreground">
                    Your benefits
                  </h2>
                  {membership.benefits.length === 0 ? (
                    <div className="mt-3">
                      <EmptyState
                        icon={Gift}
                        title="No member benefits yet"
                        description="Subscribe to Silver, Gold or Premium to unlock free pickup, free delivery and extra discounts."
                        actionLabel="See plans"
                        onAction={() => setTab("plans")}
                      />
                    </div>
                  ) : (
                    <ul className="card-soft mt-3 space-y-3 border border-border px-4 py-4">
                      {membership.benefits.map((benefit) => (
                        <BenefitRow
                          key={benefit.id}
                          title={benefit.title}
                          description={benefit.description}
                          icon={benefit.icon}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                {/* Renew / cancel — POST /api/membership/subscribe | /cancel */}
                <section className="mt-6 space-y-3">
                  <button
                    type="button"
                    disabled={pendingPlan !== null}
                    onClick={() =>
                      activePlan && activePlan.id !== "free"
                        ? void handleSubscribe(activePlan.id)
                        : setTab("plans")
                    }
                    className="ripple flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.97] disabled:opacity-60"
                  >
                    {pendingPlan ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    {membership.active && membership.planId !== "free"
                      ? "Renew membership"
                      : "Choose a plan"}
                  </button>

                  {membership.canCancel ? (
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => void handleCancel()}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background text-sm font-bold text-muted-foreground transition-all duration-300 active:scale-[0.97] disabled:opacity-60"
                    >
                      {cancelling ? <Loader2 className="size-4 animate-spin" /> : null}
                      Cancel membership
                    </button>
                  ) : null}
                </section>
              </>
            ) : null}

            {tab === "orders" ? (
              <section className="mt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black tracking-tight text-foreground">
                      Orders with Membership
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      All orders covered under your {membership.planName} plan
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                    {membership.membershipOrders.length}{" "}
                    {membership.membershipOrders.length === 1 ? "order" : "orders"}
                  </span>
                </div>

                {membership.membershipOrders.length === 0 ? (
                  <div className="card-soft mt-4 border border-dashed border-border p-8 text-center">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Package className="size-6" />
                    </span>
                    <p className="mt-3 text-sm font-bold text-foreground">No orders placed yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                      Start ordering with your active {membership.planName} membership to enjoy ₹0 Delivery and member discounts!
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/home" })}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-cta transition-transform hover:scale-105 active:scale-95"
                    >
                      <Sparkles className="size-3.5" /> Book Laundry Now
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {membership.membershipOrders.map((ord) => (
                      <div
                        key={ord.orderId}
                        onClick={() => navigate({ to: "/track/$orderId", params: { orderId: ord.orderId } })}
                        className="card-soft cursor-pointer border border-border p-4 transition-all hover:border-primary/60 hover:shadow-soft active:scale-[0.985]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black tracking-tight text-foreground">
                                #{ord.orderCode}
                              </p>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                                {ord.status}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {formatMembershipDate(ord.placedAt)} · {ord.itemCount} items
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-foreground">₹{ord.totalAmount}</p>
                            {ord.totalSaved > 0 ? (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                Saved ₹{ord.totalSaved}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {ord.services.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-border/80 pt-2.5">
                            {ord.services.map((svc, i) => (
                              <span
                                key={i}
                                className="rounded-lg bg-muted/70 px-2 py-0.5 text-[10px] font-medium text-foreground"
                              >
                                {svc}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-primary">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Check className="size-3" />
                            ₹0 Delivery Applied
                          </span>
                          <span className="flex items-center gap-0.5 text-xs font-bold">
                            View Track <ChevronRight className="size-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {tab === "plans" ? (

              <section className="mt-5">
                <div className="flex gap-2 rounded-2xl bg-muted p-1">
                  {(["monthly", "yearly"] as BillingCycle[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCycle(item)}
                      className={`h-9 flex-1 rounded-xl text-xs font-bold capitalize transition-all duration-300 ${
                        cycle === item
                          ? "bg-background text-foreground shadow-soft"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {!plans || plans.plans.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      icon={Crown}
                      title="No plans available"
                      description="Membership plans couldn't be loaded right now."
                      actionLabel="Try again"
                      onAction={() => void load({ refresh: true })}
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {plans.plans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        cycle={cycle}
                        current={
                          membership.active &&
                          membership.planId === plan.id &&
                          membership.billingCycle === cycle
                        }
                        busy={pendingPlan === plan.id}
                        onSubscribe={(planId) => void handleSubscribe(planId)}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {tab === "history" ? (
              <section className="mt-5">
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Membership history
                </h2>

                {historyLoading && !history ? <MembershipHistorySkeleton /> : null}

                {!historyLoading && historyError && !history ? (
                  <div className="mt-3">
                    <EmptyState
                      icon={CloudOff}
                      title="History didn't load"
                      description={historyError}
                      actionLabel="Try again"
                      onAction={() => void loadHistory({ refresh: true })}
                    />
                  </div>
                ) : null}

                {history && history.items.length === 0 ? (
                  <div className="mt-3">
                    <EmptyState
                      icon={CreditCard}
                      title="No membership activity yet"
                      description="Your subscriptions, renewals and payments will appear here."
                      actionLabel="See plans"
                      onAction={() => setTab("plans")}
                    />
                  </div>
                ) : null}

                {history && history.items.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {history.items.map((item) => (
                      <article
                        key={item.id}
                        className="card-soft border border-border px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold capitalize text-foreground">
                              {item.planName} · {item.type}
                            </p>
                            <p className="mt-1 text-[0.7rem] text-muted-foreground">
                              Subscribed {item.subscribedLabel}
                            </p>
                            {item.renewalAt ? (
                              <p className="text-[0.7rem] text-muted-foreground">
                                Renewed {item.renewalLabel}
                              </p>
                            ) : null}
                            <p className="text-[0.7rem] text-muted-foreground">
                              Expires {item.expiresLabel}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-foreground">
                              {formatMembershipPrice(item.amount)}
                            </p>
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">
                              {item.paymentStatus === "paid" ? <Check className="size-3" /> : null}
                              {item.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}
      </div>

      <FloatingCartBar />
      <BottomNav />
      <Toaster />
    </main>
  );
}
