import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CloudOff,
  CreditCard,
  Crown,
  HelpCircle,
  Loader2,
  Package,
  Percent,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/home/BottomNav";
import { FloatingCartBar } from "@/components/cart/FloatingCartBar";
import { EmptyState } from "@/components/common/EmptyState";
import {
  MembershipHistorySkeleton,
  MembershipSkeleton,
} from "@/components/membership/MembershipSkeletons";
import { NotificationBellAction, ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { isApiError } from "@/api/core/errors";
import { isOnline, onNetworkChange } from "@/api/customer/api/network";
import {
  cancelMembership,
  fetchMembership,
  fetchMembershipHistory,
  fetchMembershipPlans,
  formatMembershipDate,
  formatMembershipPrice,
  payMembershipWithRazorpay,
  subscribeMembership,
  DEFAULT_MEMBERSHIP_PLANS,
  type BillingCycle,
  type Membership,
  type MembershipHistory,
  type MembershipPlan,
  type MembershipPlanId,
  type MembershipPlans,
} from "@/api/customer/membership-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Quick+ — QuickPress" },
      {
        name: "description",
        content:
          "Join Quick+ for ₹0 Delivery on every order, flat laundry discounts, and priority express wash queues.",
      },
      { property: "og:title", content: "Quick+ — QuickPress" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: MembershipScreen,
});

type MemberTabId = "perks" | "plans" | "orders" | "history";

const MEMBER_TABS: { id: MemberTabId; label: string }[] = [
  { id: "perks", label: "Perks" },
  { id: "plans", label: "Plans" },
  { id: "orders", label: "Orders" },
  { id: "history", label: "Billing" },
];

const BENEFIT_ICONS = {
  truck: Truck,
  package: Package,
  percent: Percent,
  zap: Zap,
  clock: Clock,
  sparkles: Sparkles,
  shield: ShieldCheck,
} as const;

function benefitIcon(icon: string) {
  return BENEFIT_ICONS[icon as keyof typeof BENEFIT_ICONS] ?? Check;
}

function getCyclePricing(plan: MembershipPlan, cycle: BillingCycle) {
  if (cycle === "yearly") {
    const price = plan.yearlyPrice;
    const savings = plan.yearlySavings || Math.max(0, plan.monthlyPrice * 12 - price);
    return {
      price,
      savings,
      periodLabel: "1 Year",
      unitSuffix: "/yr",
      validity: `${plan.yearlyValidityDays || 365} days`,
      perMonth: Math.round(price / 12),
      discountBadge: savings > 0 ? `Save ₹${savings}` : null,
    };
  }
  if (cycle === "quarterly") {
    const qPrice =
      plan.quarterlyPrice && plan.quarterlyPrice > 0
        ? plan.quarterlyPrice
        : Math.round(plan.monthlyPrice * 2.7);
    const savings = Math.max(0, plan.monthlyPrice * 3 - qPrice);
    return {
      price: qPrice,
      savings,
      periodLabel: "3 Months",
      unitSuffix: "/3 mos",
      validity: "90 days",
      perMonth: Math.round(qPrice / 3),
      discountBadge: savings > 0 ? `Save ₹${savings}` : "3 Months",
    };
  }
  return {
    price: plan.monthlyPrice,
    savings: 0,
    periodLabel: "Monthly",
    unitSuffix: "/mo",
    validity: "30 days",
    perMonth: plan.monthlyPrice,
    discountBadge: null,
  };
}

function getTierBadgeLabel(plan: MembershipPlan): string {
  const id = plan.id.toLowerCase();
  if (id === "silver") return "10% Off";
  if (id === "gold") return "15% Off";
  if (id === "platinum") return "20% Off";
  if (id === "elite") return "25% Off";
  return plan.popular ? "Popular" : "VIP";
}

function CompactSavingsEstimator() {
  const [ordersPerMonth, setOrdersPerMonth] = useState<number>(4);
  const avgBasket = 350;
  const deliverySaved = ordersPerMonth * 40 * 12;
  const discountSaved = Math.round(ordersPerMonth * avgBasket * 0.15 * 12);
  const expressSaved = ordersPerMonth >= 4 ? 3 * 99 : 1 * 99;
  const totalAnnualSavings = deliverySaved + discountSaved + expressSaved;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-[#0c831f]">
            <TrendingUp className="size-3.5 stroke-[2.2]" />
          </span>
          <span className="text-xs font-black text-zinc-950">Quick Savings Check</span>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-[#0c831f] tabular-nums">
          {ordersPerMonth} orders/mo
        </span>
      </div>

      <input
        type="range"
        min="1"
        max="12"
        step="1"
        aria-label="Laundry orders per month"
        value={ordersPerMonth}
        onChange={(e) => setOrdersPerMonth(Number(e.target.value))}
        className="w-full accent-[#0c831f] cursor-pointer"
      />

      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2">
        <span className="text-xs font-bold text-emerald-950">Est. Annual Savings</span>
        <span className="text-sm font-black text-[#0c831f] tabular-nums font-mono">
          ₹{totalAnnualSavings.toLocaleString("en-IN")}/yr
        </span>
      </div>
    </section>
  );
}

function PlanSelectorSection({
  plans,
  cycle,
  onChangeCycle,
  selectedPlanId,
  onSelectPlan,
  activePlanId,
  activeCycle,
  pendingPlan,
  onSubscribe,
}: {
  plans: MembershipPlan[];
  cycle: BillingCycle;
  onChangeCycle: (c: BillingCycle) => void;
  selectedPlanId: MembershipPlanId;
  onSelectPlan: (id: MembershipPlanId) => void;
  activePlanId?: MembershipPlanId | null;
  activeCycle?: BillingCycle | null;
  pendingPlan: MembershipPlanId | null;
  onSubscribe: (id: MembershipPlanId) => void;
}) {
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId],
  );

  if (!selectedPlan) return null;

  const pricing = getCyclePricing(selectedPlan, cycle);
  const isCurrent = Boolean(activePlanId && activePlanId === selectedPlan.id && activeCycle === cycle);
  const busy = pendingPlan === selectedPlan.id;

  return (
    <div className="space-y-3.5">
      {/* Billing Cycle Switcher */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
            Choose Your Plan
          </h2>
          {pricing.discountBadge ? (
            <span className="text-[11px] font-bold text-[#0c831f]">{pricing.discountBadge}</span>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-zinc-200/80 bg-zinc-100/90 p-1">
          {(
            [
              { id: "monthly", label: "Monthly" },
              { id: "quarterly", label: "3 Months" },
              { id: "yearly", label: "Annual" },
            ] as { id: BillingCycle; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeCycle(item.id)}
              className={`h-9 rounded-xl text-xs transition-all cursor-pointer ${
                cycle === item.id
                  ? "bg-white font-black text-zinc-950 shadow-2xs"
                  : "font-bold text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal / Compact Tier Selector */}
      <div
        className={`grid gap-2 ${
          plans.length >= 4
            ? "grid-cols-2 sm:grid-cols-4"
            : plans.length === 3
            ? "grid-cols-3"
            : plans.length === 2
            ? "grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {plans.map((plan) => {
          const tierPricing = getCyclePricing(plan, cycle);
          const selected = plan.id === selectedPlan.id;
          const shortName = plan.name.replace(/\s*VIP$/i, "");
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelectPlan(plan.id)}
              className={`relative rounded-2xl p-2.5 text-left transition-all cursor-pointer ${
                selected
                  ? "border-2 border-[#0c831f] bg-emerald-50/40 shadow-2xs"
                  : "border border-zinc-200/80 bg-white hover:border-zinc-300"
              }`}
            >
              {plan.popular ? (
                <span className="absolute -top-2 right-2 rounded bg-[#0c831f] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                  Popular
                </span>
              ) : null}
              <p
                className={`truncate text-[11px] font-bold ${
                  selected ? "text-[#0c831f]" : "text-zinc-500"
                }`}
              >
                {shortName}
              </p>
              <p className="mt-0.5 text-sm font-black text-zinc-950 tabular-nums font-mono">
                {formatMembershipPrice(tierPricing.price)}
              </p>
              <p className="text-[10px] font-semibold text-zinc-500">{getTierBadgeLabel(plan)}</p>
            </button>
          );
        })}
      </div>

      {/* Selected Plan Detail Card (Clean, Zero Verbose Descriptions) */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
              <Crown className="size-4 stroke-[2.2]" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-black text-zinc-950">{selectedPlan.name}</h3>
                {isCurrent ? (
                  <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#0c831f]">
                    Active
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] font-medium text-zinc-500">
                {pricing.price > 0 ? `₹${pricing.perMonth}/mo equivalent · ${pricing.validity}` : "Free"}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-lg font-black text-zinc-950 tabular-nums font-mono">
              {formatMembershipPrice(pricing.price)}
            </p>
            <p className="text-[10px] font-bold text-[#0c831f]">{pricing.periodLabel}</p>
          </div>
        </div>

        {/* 3 Compact Quota Cells */}
        <div className="grid grid-cols-3 gap-2 border-y border-zinc-100 py-2.5 text-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Deliveries</p>
            <p className="mt-0.5 text-xs font-black text-zinc-950 tabular-nums">
              {selectedPlan.monthlyOrderLimit && selectedPlan.monthlyOrderLimit >= 999
                ? "Unlimited"
                : selectedPlan.monthlyOrderLimit && selectedPlan.monthlyOrderLimit > 0
                ? `${selectedPlan.monthlyOrderLimit}/mo`
                : "Unlimited"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Allowance</p>
            <p className="mt-0.5 text-xs font-black text-zinc-950 tabular-nums">
              {selectedPlan.monthlyWeightLimitKg && selectedPlan.monthlyWeightLimitKg >= 999
                ? "Unlimited"
                : selectedPlan.monthlyWeightLimitKg && selectedPlan.monthlyWeightLimitKg > 0
                ? `${selectedPlan.monthlyWeightLimitKg} kg`
                : "100 kg"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Express</p>
            <p className="mt-0.5 text-xs font-black text-zinc-950 tabular-nums">
              {selectedPlan.freeExpressCount && selectedPlan.freeExpressCount >= 999
                ? "Unlimited"
                : selectedPlan.freeExpressCount && selectedPlan.freeExpressCount > 0
                ? `${selectedPlan.freeExpressCount} Free`
                : "Standard"}
            </p>
          </div>
        </div>

        {/* Clean 1-Line Perks List (No Descriptions) */}
        <ul className="space-y-2">
          {selectedPlan.benefits.map((benefit) => {
            const Icon = benefitIcon(benefit.icon);
            return (
              <li key={benefit.id} className="flex items-center gap-2.5 text-xs font-semibold text-zinc-800">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#0c831f]">
                  <Icon className="size-3.5 stroke-[2.2]" />
                </span>
                <span className="truncate">{benefit.title}</span>
              </li>
            );
          })}
        </ul>

        {/* Primary CTA */}
        <div className="pt-1 space-y-1.5">
          <button
            type="button"
            disabled={busy || isCurrent}
            onClick={() => onSubscribe(selectedPlan.id)}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer ${
              isCurrent
                ? "border border-zinc-200 bg-zinc-100 text-zinc-500 cursor-default"
                : "bg-[#0c831f] hover:bg-[#0a701a] text-white shadow-xs"
            }`}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {isCurrent ? (
              "Current Active Plan"
            ) : pricing.price > 0 ? (
              <span>
                Activate {selectedPlan.name} · {formatMembershipPrice(pricing.price)} →
              </span>
            ) : (
              "Switch to Free"
            )}
          </button>
          {!isCurrent && pricing.price > 0 ? (
            <p className="flex items-center justify-center gap-1 text-[10px] font-medium text-zinc-400">
              <ShieldCheck className="size-3 text-[#0c831f]" />
              <span>Secure via Razorpay UPI, Cards &amp; NetBanking</span>
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

const FAQS = [
  {
    q: "How does ₹0 Delivery work?",
    a: "Delivery fees are automatically waived at checkout on eligible orders — no promo code needed.",
  },
  {
    q: "Can I stack Quick+ with coupons?",
    a: "Yes. Your Quick+ member discount applies on item totals alongside eligible promo codes.",
  },
  {
    q: "Can I upgrade or cancel anytime?",
    a: "Yes. Upgrades apply immediately and you can cancel anytime from your Quick+ screen.",
  },
  {
    q: "How do Express Passes work?",
    a: "Select 15-Min Express at checkout to use your complimentary monthly Express Pass.",
  },
];

function MembershipScreen() {
  const { session } = useAuthGuard();
  const navigate = useNavigate();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [plans, setPlans] = useState<MembershipPlans>({
    plans: DEFAULT_MEMBERSHIP_PLANS,
    currentPlanId: "free",
    fromCache: true,
  });
  const [history, setHistory] = useState<MembershipHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [memberTab, setMemberTab] = useState<MemberTabId>("perks");
  const [cycle, setCycle] = useState<BillingCycle>("quarterly");
  const [selectedPlanId, setSelectedPlanId] = useState<MembershipPlanId>("gold");
  const [pendingPlan, setPendingPlan] = useState<MembershipPlanId | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const load = useCallback(async (options: { refresh?: boolean } = {}) => {
    setError(null);
    try {
      const [currentRes, catalogueRes] = await Promise.allSettled([
        fetchMembership(options.refresh ? { forceRefresh: true } : {}),
        fetchMembershipPlans(options.refresh ? { forceRefresh: true } : {}),
      ]);

      if (currentRes.status === "fulfilled") {
        setMembership(currentRes.value);
      } else {
        setError(
          isApiError(currentRes.reason)
            ? currentRes.reason.userMessage
            : "Couldn't load your membership.",
        );
      }

      if (catalogueRes.status === "fulfilled") {
        setPlans(catalogueRes.value);
        const list = catalogueRes.value.plans;
        if (list.length > 0 && !list.some((p) => p.id === selectedPlanId)) {
          const popular = list.find((p) => p.popular) || list[0];
          if (popular) setSelectedPlanId(popular.id);
        }
      }
    } catch {
      /* handled per-settled */
    }
  }, [selectedPlanId]);

  const loadHistory = useCallback(async (options: { refresh?: boolean } = {}) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await fetchMembershipHistory(options.refresh ? { forceRefresh: true } : {});
      setHistory(data);
    } catch (caught) {
      setHistoryError(
        isApiError(caught) ? caught.userMessage : "Couldn't load membership history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    setOffline(!isOnline());
    const unsub = onNetworkChange((online) => setOffline(!online));
    void load();
    return unsub;
  }, [load]);

  useEffect(() => {
    if (memberTab === "history" && !history && !historyLoading) {
      void loadHistory();
    }
  }, [memberTab, history, historyLoading, loadHistory]);

  const handleSubscribe = async (planId: MembershipPlanId) => {
    setPendingPlan(planId);
    try {
      const selectedPlan = plans?.plans.find((p) => p.id === planId);
      const pricing = selectedPlan ? getCyclePricing(selectedPlan, cycle) : { price: 0 };

      if (planId !== "free" && pricing.price > 0) {
        const outcome = await payMembershipWithRazorpay({
          planId,
          billingCycle: cycle,
          amount: pricing.price,
          planName: selectedPlan?.name || "Quick+",
          ...(session?.account?.name ? { customerName: session.account.name } : {}),
          ...(session?.account?.phone ? { customerPhone: session.account.phone } : {}),
          ...(session?.account?.email ? { customerEmail: session.account.email } : {}),
        });

        if (outcome.status === "success") {
          toast.success(outcome.message || `Welcome to Quick+ ${selectedPlan?.name || ""}!`);
          setHistory(null);
          await load({ refresh: true });
          setMemberTab("perks");
        } else if (outcome.status === "user_dropped") {
          toast.info("Payment cancelled.");
        } else {
          toast.error(outcome.message || "Payment failed. Please try again.");
        }
      } else {
        const result = await subscribeMembership(planId, cycle);
        toast.success(result.message);
        setHistory(null);
        await load({ refresh: true });
        setMemberTab("perks");
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
      const result = await cancelMembership("Requested by customer from Quick+ portal");
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

  const isActiveMember = Boolean(membership?.active && membership.planId !== "free");
  const activePlan = membership?.plan ?? null;
  const totalOrdersQuota = membership?.quota.totalOrders ?? 0;
  const remainingOrdersQuota = membership?.quota.remainingOrders ?? 0;
  const quotaPct =
    totalOrdersQuota > 0
      ? Math.min(100, Math.max(6, Math.round((remainingOrdersQuota / totalOrdersQuota) * 100)))
      : 100;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fafafa] text-zinc-950 font-sans pb-28">
      <div className="relative mx-auto w-full max-w-md">
        {/* Existing Shared Top App Bar (Navbar Untouched) */}
        <ScreenTopBar title="quick+" action={<NotificationBellAction />} />

        {offline ? (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-600 shadow-2xs">
            <CloudOff className="size-4 shrink-0 text-zinc-500" />
            <span>Offline — showing saved Quick+ status</span>
          </div>
        ) : null}

        {!membership && !error ? <MembershipSkeleton /> : null}

        {!membership && error ? (
          <div className="px-4 pb-28 pt-6">
            <EmptyState
              icon={CloudOff}
              title="Quick+ didn't load"
              description={error}
              actionLabel="Try again"
              onAction={() => void load({ refresh: true })}
            />
          </div>
        ) : null}

        {membership ? (
          <div className="px-4 pt-3.5 space-y-4">
            {!isActiveMember ? (
              /* ===================== NON-MEMBER (JOIN FLOW) ===================== */
              <>
                {/* 1. Clean White Value Hero (No 3D Icon, No Description) */}
                <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0c831f]">
                        <Sparkles className="size-3" />
                        <span>Quick+ Membership</span>
                      </span>
                      <h2 className="mt-2 text-lg font-black leading-snug tracking-tight text-zinc-950">
                        Save up to ₹4,200/year on laundry &amp; dry clean
                      </h2>
                    </div>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                      <Crown className="size-5 stroke-[2.2]" />
                    </span>
                  </div>

                  {/* 3 Clean Value Chips */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/90 p-2 text-center">
                      <p className="text-xs font-black text-zinc-950">₹0</p>
                      <p className="text-[10px] font-medium text-zinc-500">Delivery</p>
                    </div>
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/90 p-2 text-center">
                      <p className="text-xs font-black text-zinc-950">10–25%</p>
                      <p className="text-[10px] font-medium text-zinc-500">Extra Off</p>
                    </div>
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/90 p-2 text-center">
                      <p className="text-xs font-black text-zinc-950">Zero</p>
                      <p className="text-[10px] font-medium text-zinc-500">Surge Fee</p>
                    </div>
                  </div>
                </section>

                {/* 2. Billing Switcher + Tier Pills + Selected Plan Card + CTA */}
                <PlanSelectorSection
                  plans={plans.plans}
                  cycle={cycle}
                  onChangeCycle={setCycle}
                  selectedPlanId={selectedPlanId}
                  onSelectPlan={setSelectedPlanId}
                  pendingPlan={pendingPlan}
                  onSubscribe={(id) => void handleSubscribe(id)}
                />

                {/* 3. Compact Interactive Savings Check */}
                <CompactSavingsEstimator />

                {/* 4. Compact FAQ Accordion */}
                <section className="space-y-2 pb-2">
                  <div className="flex items-center gap-1.5 px-1">
                    <HelpCircle className="size-3.5 text-zinc-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                      FAQs
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {FAQS.map((faq, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                          className="flex w-full items-center justify-between gap-3 text-left text-xs font-black text-zinc-950 cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`size-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
                              openFaqIndex === idx ? "rotate-180 text-[#0c831f]" : ""
                            }`}
                          />
                        </button>
                        {openFaqIndex === idx ? (
                          <p className="mt-2 border-t border-zinc-100 pt-2 text-[11px] leading-relaxed text-zinc-600">
                            {faq.a}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              /* ===================== ACTIVE MEMBER FLOW ===================== */
              <>
                {/* 1. Active Pass Card (Clean White + #0c831f Border) */}
                <section className="rounded-2xl border-2 border-[#0c831f]/75 bg-white p-4 shadow-2xs space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0c831f]">
                        ● Active Quick+ Member
                      </span>
                      <h2 className="mt-2 truncate text-lg font-black text-zinc-950">
                        {membership.planName}
                      </h2>
                      <p className="text-xs font-medium text-zinc-500">
                        Valid until {membership.expiresLabel} · {membership.remainingDays} days left
                      </p>
                    </div>

                    <div className="shrink-0 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-center">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                        Saved
                      </span>
                      <span className="text-sm font-black text-[#0c831f] tabular-nums font-mono">
                        ₹{membership.quota.totalSavings.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Quota Progress Bars */}
                  <div className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
                    <div className="flex justify-between text-[11px] font-bold text-zinc-700">
                      <span>Free Deliveries Left</span>
                      <span className="font-mono text-zinc-950">
                        {totalOrdersQuota > 0
                          ? `${remainingOrdersQuota} / ${totalOrdersQuota}`
                          : "Unlimited"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-[#0c831f] transition-all duration-500"
                        style={{ width: `${quotaPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between pt-1 text-[11px] font-bold text-zinc-700">
                      <span>Express Passes Left</span>
                      <span className="font-mono text-zinc-950">
                        {membership.quota.freeExpressRemaining} / {membership.quota.freeExpressTotal} Free
                      </span>
                    </div>
                  </div>
                </section>

                {/* 2. Member Segmented Tabs */}
                <div className="grid grid-cols-4 gap-1 rounded-2xl border border-zinc-200/80 bg-zinc-100/90 p-1">
                  {MEMBER_TABS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMemberTab(item.id)}
                      className={`h-9 rounded-xl text-xs transition-all cursor-pointer ${
                        memberTab === item.id
                          ? "bg-white font-black text-zinc-950 shadow-2xs"
                          : "font-bold text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* TAB: PERKS */}
                {memberTab === "perks" ? (
                  <div className="space-y-3.5">
                    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-2.5">
                      <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                        Included in Your Pass
                      </p>
                      <div className="divide-y divide-zinc-100">
                        {membership.benefits.map((benefit) => (
                          <div
                            key={benefit.id}
                            className="flex items-center justify-between gap-2 py-2.5 first:pt-1 last:pb-0 text-xs"
                          >
                            <span className="font-bold text-zinc-900">{benefit.title}</span>
                            <span className="shrink-0 text-[11px] font-black text-[#0c831f]">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Upgrade / Renew */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMemberTab("plans")}
                        className="h-10 rounded-xl bg-[#0c831f] hover:bg-[#0a701a] text-xs font-black text-white shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Upgrade Plan
                      </button>
                      <button
                        type="button"
                        disabled={pendingPlan !== null}
                        onClick={() =>
                          activePlan && activePlan.id !== "free"
                            ? void handleSubscribe(activePlan.id)
                            : setMemberTab("plans")
                        }
                        className="h-10 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-800 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {pendingPlan ? "Processing..." : "Renew Pass"}
                      </button>
                    </div>

                    {membership.canCancel ? (
                      <button
                        type="button"
                        disabled={cancelling}
                        onClick={() => void handleCancel()}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                      >
                        {cancelling ? <Loader2 className="size-4 animate-spin" /> : null}
                        Cancel Quick+ Membership
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {/* TAB: PLANS (Upgrade/Switch) */}
                {memberTab === "plans" ? (
                  <PlanSelectorSection
                    plans={plans.plans}
                    cycle={cycle}
                    onChangeCycle={setCycle}
                    selectedPlanId={selectedPlanId}
                    onSelectPlan={setSelectedPlanId}
                    activePlanId={membership.planId}
                    activeCycle={membership.billingCycle}
                    pendingPlan={pendingPlan}
                    onSubscribe={(id) => void handleSubscribe(id)}
                  />
                ) : null}

                {/* TAB: VIP ORDERS */}
                {memberTab === "orders" ? (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                        Quick+ Orders
                      </h2>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-[#0c831f]">
                        {membership.membershipOrders.length}{" "}
                        {membership.membershipOrders.length === 1 ? "order" : "orders"}
                      </span>
                    </div>

                    {membership.membershipOrders.length === 0 ? (
                      <div className="rounded-2xl border border-zinc-200/80 bg-white p-7 text-center shadow-2xs space-y-3">
                        <span className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                          <Package className="size-5" />
                        </span>
                        <p className="text-sm font-black text-zinc-950">No Quick+ orders yet</p>
                        <button
                          type="button"
                          onClick={() => navigate({ to: "/home" })}
                          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0c831f] hover:bg-[#0a701a] px-5 text-xs font-black text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          Book Laundry Now
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {membership.membershipOrders.map((ord) => (
                          <div
                            key={ord.orderId}
                            onClick={() =>
                              navigate({ to: "/track/$orderId", params: { orderId: ord.orderId } })
                            }
                            className="cursor-pointer rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-zinc-300 active:scale-[0.99]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-black tracking-tight text-zinc-950 font-mono">
                                    #{ord.orderCode}
                                  </p>
                                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-600">
                                    {ord.status}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-zinc-500">
                                  {formatMembershipDate(ord.placedAt)} · {ord.itemCount} items
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-zinc-950 tabular-nums font-mono">
                                  ₹{ord.totalAmount}
                                </p>
                                {ord.totalSaved > 0 ? (
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-black text-[#0c831f]">
                                    Saved ₹{ord.totalSaved}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[11px] font-bold">
                              <span className="flex items-center gap-1 text-[#0c831f]">
                                <Check className="size-3 stroke-[3]" />
                                ₹0 Delivery Applied
                              </span>
                              <span className="flex items-center gap-0.5 text-zinc-700">
                                Track <ChevronRight className="size-3.5" />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}

                {/* TAB: BILLING HISTORY */}
                {memberTab === "history" ? (
                  <section className="space-y-3">
                    <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                      Billing History
                    </h2>

                    {historyLoading && !history ? <MembershipHistorySkeleton /> : null}

                    {!historyLoading && historyError && !history ? (
                      <EmptyState
                        icon={CloudOff}
                        title="History didn't load"
                        description={historyError}
                        actionLabel="Try again"
                        onAction={() => void loadHistory({ refresh: true })}
                      />
                    ) : null}

                    {history && history.items.length === 0 ? (
                      <EmptyState
                        icon={CreditCard}
                        title="No transactions yet"
                        description="Your Quick+ subscription payments will appear here."
                        actionLabel="View Plans"
                        onAction={() => setMemberTab("plans")}
                      />
                    ) : null}

                    {history && history.items.length > 0 ? (
                      <div className="space-y-2.5">
                        {history.items.map((item) => (
                          <article
                            key={item.id}
                            className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-black capitalize text-zinc-950">
                                  {item.planName} · {item.type}
                                </p>
                                <p className="mt-1 text-[11px] text-zinc-500">
                                  {item.subscribedLabel} → {item.expiresLabel}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-black text-zinc-950 tabular-nums font-mono">
                                  {formatMembershipPrice(item.amount)}
                                </p>
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                                  {item.paymentStatus === "paid" ? (
                                    <Check className="size-3 text-[#0c831f]" />
                                  ) : null}
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
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Existing Shared Bottom Nav (Navbar Untouched) */}
      <FloatingCartBar />
      <BottomNav />
    </main>
  );
}
