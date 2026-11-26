import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CloudOff,
  CreditCard,
  Crown,
  Gift,
  Headphones,
  HelpCircle,
  Loader2,
  Package,
  Percent,
  RefreshCw,
  ShieldCheck,
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
      { title: "Quick+ Membership — QuickPress" },
      {
        name: "description",
        content:
          "Join Quick+ for ₹0 Delivery on every order, flat 10%-25% laundry discounts, and priority express wash queues. Instant 1-tap Razorpay activation.",
      },
      { property: "og:title", content: "Quick+ Membership — Ultra-Fast Garment Care" },
      {
        property: "og:description",
        content:
          "Subscribe to Quick+ for free pickup, free delivery, extra laundry discounts and priority queue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MembershipScreen,
});

type TabId = "overview" | "plans" | "orders" | "history";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "plans", label: "Plans" },
  { id: "orders", label: "Orders" },
  { id: "history", label: "Billing" },
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
  shield: ShieldCheck,
} as const;

function benefitIcon(icon: string) {
  return BENEFIT_ICONS[icon as keyof typeof BENEFIT_ICONS] ?? Sparkles;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: typeof Crown;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs transition-colors hover:border-zinc-300">
      <div className="flex items-center justify-between">
        <span className="flex size-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
          <Icon className="size-4 stroke-[2.2]" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
      </div>
      <p className="mt-2.5 text-lg font-black leading-none tracking-tight text-zinc-950 tabular-nums font-mono">
        {value}
      </p>
      {sublabel ? (
        <p className="mt-1 text-[11px] font-medium text-zinc-500 truncate">{sublabel}</p>
      ) : null}
    </div>
  );
}

function BenefitRow({ title, description, icon }: { title: string; description: string; icon: string }) {
  const Icon = benefitIcon(icon);
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
        <Icon className="size-4 stroke-[2.2]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black text-zinc-950">{title}</p>
        {description ? (
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{description}</p>
        ) : null}
      </div>
    </li>
  );
}

function getCyclePricing(plan: MembershipPlan, cycle: BillingCycle) {
  if (cycle === "yearly") {
    const price = plan.yearlyPrice;
    const savings = plan.yearlySavings || Math.max(0, plan.monthlyPrice * 12 - price);
    return {
      price,
      savings,
      label: "Billed annually",
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
      label: "Billed quarterly",
      validity: "90 days",
      perMonth: Math.round(qPrice / 3),
      discountBadge: savings > 0 ? `Save ₹${savings}` : "3 Months",
    };
  }
  return {
    price: plan.monthlyPrice,
    savings: 0,
    label: "Billed monthly",
    validity: "30 days",
    perMonth: plan.monthlyPrice,
    discountBadge: null,
  };
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
  const pricing = getCyclePricing(plan, cycle);
  const isHighlighted = plan.popular || current;

  return (
    <article
      className={`relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 transition-all ${
        current
          ? "border-2 border-[#0c831f] ring-2 ring-[#0c831f]/15 shadow-xs"
          : plan.popular
          ? "border-2 border-[#0c831f]/75 shadow-xs"
          : "border border-zinc-200/80 shadow-2xs hover:border-zinc-300"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-xl border ${
                isHighlighted
                  ? "bg-emerald-50 text-[#0c831f] border-emerald-100"
                  : "bg-zinc-50 text-zinc-700 border-zinc-200"
              }`}
            >
              <Crown className="size-4 stroke-[2.2]" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black tracking-tight text-zinc-950">{plan.name}</h3>
                {current ? (
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#0c831f] border border-emerald-200">
                    Active
                  </span>
                ) : plan.popular ? (
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800 border border-amber-200">
                    Most Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500 leading-snug">{plan.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Strip */}
      <div className="mt-3.5 flex items-center justify-between border-y border-zinc-100 py-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tight text-zinc-950 tabular-nums font-mono">
              {formatMembershipPrice(pricing.price)}
            </span>
            <span className="text-xs font-semibold text-zinc-400">
              /{cycle === "yearly" ? "yr" : cycle === "quarterly" ? "3 mos" : "mo"}
            </span>
          </div>
          <p className="text-[11px] font-medium text-zinc-500">
            {pricing.price > 0 ? `₹${pricing.perMonth}/mo equivalent` : "Always free"}
          </p>
        </div>

        <div className="text-right space-y-1">
          {pricing.discountBadge ? (
            <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-[#0c831f]">
              {pricing.discountBadge}
            </span>
          ) : null}
          <p className="text-[11px] font-semibold text-zinc-500">{pricing.validity} validity</p>
        </div>
      </div>

      {/* Quota Highlights */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Deliveries</p>
          <p className="mt-0.5 text-xs font-black text-zinc-950 tabular-nums">
            {plan.monthlyOrderLimit && plan.monthlyOrderLimit >= 999
              ? "Unlimited"
              : plan.monthlyOrderLimit && plan.monthlyOrderLimit > 0
              ? `${plan.monthlyOrderLimit}/mo`
              : "Unlimited"}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Allowance</p>
          <p className="mt-0.5 text-xs font-black text-zinc-950 tabular-nums">
            {plan.monthlyWeightLimitKg && plan.monthlyWeightLimitKg >= 999
              ? "Unlimited"
              : plan.monthlyWeightLimitKg && plan.monthlyWeightLimitKg > 0
              ? `${plan.monthlyWeightLimitKg} kg`
              : "100 kg"}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Express</p>
          <p className="mt-0.5 text-xs font-black text-zinc-950 tabular-nums">
            {plan.freeExpressCount && plan.freeExpressCount >= 999
              ? "Unlimited"
              : plan.freeExpressCount && plan.freeExpressCount > 0
              ? `${plan.freeExpressCount} Free`
              : "Standard"}
          </p>
        </div>
      </div>

      {/* Benefit List */}
      <ul className="mt-3.5 space-y-2.5">
        {plan.benefits.map((benefit) => (
          <BenefitRow
            key={benefit.id}
            title={benefit.title}
            description={benefit.description}
            icon={benefit.icon}
          />
        ))}
      </ul>

      {/* CTA Button */}
      <button
        type="button"
        disabled={busy || current}
        onClick={() => onSubscribe(plan.id)}
        className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black tracking-wide transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer ${
          current
            ? "bg-zinc-100 text-zinc-500 border border-zinc-200 cursor-default"
            : "bg-[#0c831f] hover:bg-[#0a701a] text-white shadow-xs"
        }`}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {current ? (
          "Current Active Plan"
        ) : pricing.price > 0 ? (
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4" />
            <span>Join {plan.name} · {formatMembershipPrice(pricing.price)}</span>
          </span>
        ) : (
          "Switch to Free"
        )}
      </button>
      {!current && pricing.price > 0 ? (
        <p className="mt-2 text-center text-[10px] font-medium text-zinc-400 flex items-center justify-center gap-1">
          <ShieldCheck className="size-3 text-[#0c831f]" /> Instant activation via UPI, Cards &amp; NetBanking
        </p>
      ) : null}
    </article>
  );
}

function SavingsCalculator() {
  const [ordersPerMonth, setOrdersPerMonth] = useState<number>(4);
  const avgBasket = 350;
  const deliverySaved = ordersPerMonth * 40 * 12;
  const discountSaved = Math.round(ordersPerMonth * avgBasket * 0.15 * 12);
  const expressSaved = ordersPerMonth >= 4 ? 3 * 99 : 1 * 99;
  const totalAnnualSavings = deliverySaved + discountSaved + expressSaved;

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
            <TrendingUp className="size-4 stroke-[2.2]" />
          </span>
          <div>
            <h3 className="text-xs font-black text-zinc-950">Annual Savings Estimator</h3>
            <p className="text-[11px] text-zinc-500">Slide to match your monthly orders</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-black text-[#0c831f] tabular-nums">
          {ordersPerMonth}/mo
        </span>
      </div>

      <div>
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
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-zinc-400">
          <span>1 (Light)</span>
          <span>4 (Family)</span>
          <span>8 (Weekly)</span>
          <span>12 (Heavy)</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Delivery</p>
          <p className="mt-0.5 text-xs font-black text-zinc-950 tabular-nums font-mono">
            ₹{deliverySaved.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">15% Off</p>
          <p className="mt-0.5 text-xs font-black text-zinc-950 tabular-nums font-mono">
            ₹{discountSaved.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Express</p>
          <p className="mt-0.5 text-xs font-black text-zinc-950 tabular-nums font-mono">
            ₹{expressSaved.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5">
        <span className="text-xs font-bold text-emerald-950">Estimated Annual Savings</span>
        <span className="text-sm font-black text-[#0c831f] tabular-nums font-mono">
          ₹{totalAnnualSavings.toLocaleString("en-IN")}/yr
        </span>
      </div>
    </section>
  );
}

const QUICK_PLUS_PERKS = [
  {
    icon: Truck,
    title: "Unlimited ₹0 Delivery",
    desc: "Free doorstep pickup & delivery on all eligible orders.",
    badge: "Most Loved",
  },
  {
    icon: Percent,
    title: "Flat 10%–25% Off",
    desc: "Automatic member discount stackable with coupon codes.",
    badge: "Instant Save",
  },
  {
    icon: Zap,
    title: "Turbo Express Queue",
    desc: "Jump the queue with expedited 12–24h priority wash turnaround.",
    badge: "Priority",
  },
  {
    icon: ShieldCheck,
    title: "Zero Surge Guarantee",
    desc: "Rain or festive rush — never pay extra rain or surge fees.",
    badge: "Rainproof",
  },
  {
    icon: Sparkles,
    title: "Fabric Protection",
    desc: "Enhanced garment care & priority inspection on delicate wear.",
    badge: "Safe Care",
  },
  {
    icon: Headphones,
    title: "Priority Care Desk",
    desc: "Direct access to senior customer care & store managers.",
    badge: "24x7 Help",
  },
];

const FAQS = [
  {
    q: "How does the ₹0 Delivery Fee benefit work?",
    a: "As an active Quick+ member, delivery fees are automatically waived at checkout on eligible orders — zero promo code needed.",
  },
  {
    q: "Can I use Quick+ discounts with promotional coupons?",
    a: "Yes. Your Quick+ discount applies directly to item prices, and you can stack eligible promotional coupons at checkout.",
  },
  {
    q: "How do Express Turnaround Passes work?",
    a: "Quick+ members receive complimentary Express Passes each month. Toggle 15-Min Express during checkout to prioritize pickup.",
  },
  {
    q: "Can I upgrade or switch my plan anytime?",
    a: "Yes. Upgrading from Silver to Gold, Platinum, or Elite takes effect immediately with updated benefits and validity.",
  },
  {
    q: "Is payment secure with Razorpay?",
    a: "Yes, 100%. We support UPI (PhonePe, GPay, Paytm), Cards, and NetBanking with bank-grade encryption.",
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
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [cycle, setCycle] = useState<BillingCycle>("quarterly");
  const [pendingPlan, setPendingPlan] = useState<MembershipPlanId | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const load = useCallback(async (options: { refresh?: boolean } = {}) => {
    if (options.refresh) setRefreshing(true);
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
      }
    } finally {
      if (options.refresh) setRefreshing(false);
    }
  }, []);

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
    if (tab === "history" && !history && !historyLoading) {
      void loadHistory();
    }
  }, [tab, history, historyLoading, loadHistory]);

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
          setTab("overview");
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

  const activePlan = membership?.plan ?? null;
  const isActiveMember = Boolean(membership?.active && membership.planId !== "free");

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fafafa] text-zinc-950 font-sans pb-28">
      {/* Clean Sticky Header matching Checkout */}
      <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/home" });
              }
            }}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 transition-colors hover:bg-zinc-200 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="size-4.5 stroke-[2.2]" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black text-zinc-950 tracking-tight">quick+</h1>
              <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-[#0c831f]">
                Club
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium truncate">
              Priority Laundry &amp; Zero Delivery Fees
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label="Refresh Quick+ status"
            onClick={() => void load({ refresh: true })}
            className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin text-[#0c831f]" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </button>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => navigate({ to: "/notifications" })}
            className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer"
          >
            <Bell className="size-4" />
          </button>
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-md">
        {offline ? (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-zinc-600 shadow-2xs">
            <CloudOff className="size-4 text-zinc-500 shrink-0" />
            <span>You&apos;re offline — showing your saved Quick+ status.</span>
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
            {/* Clean White Hero Card — ZERO Black Banner */}
            <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0c831f]">
                    <Sparkles className="size-3" />
                    <span>{isActiveMember ? "Active Quick+ Member" : "Quick+ Priority Pass"}</span>
                  </div>

                  <h2 className="mt-2.5 text-xl font-black tracking-tight text-zinc-950">
                    {isActiveMember ? membership.planName : "Save more on every wash"}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500 font-medium">
                    {isActiveMember
                      ? `Valid until ${membership.expiresLabel} · ${membership.remainingDays} days left`
                      : "Get ₹0 doorstep delivery, up to 25% flat off, zero weather surge, and priority pickup."}
                  </p>
                </div>

                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                  <Crown className="size-5 stroke-[2.2]" />
                </div>
              </div>

              {isActiveMember ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-zinc-700 capitalize">
                      {membership.billingCycle || "active"} Plan
                    </span>
                    <div className="flex items-center gap-2">
                      {membership.amountPaid > 0 ? (
                        <span className="font-bold text-zinc-600 tabular-nums font-mono">
                          {formatMembershipPrice(membership.amountPaid)} paid
                        </span>
                      ) : null}
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-[#0c831f]">
                        Active
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full rounded-full bg-[#0c831f] transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(8, Math.round((membership.remainingDays / 30) * 100)))}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-2.5 py-2 text-center">
                      <p className="text-xs font-black text-zinc-950">₹0</p>
                      <p className="text-[10px] font-medium text-zinc-500">Delivery</p>
                    </div>
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-2.5 py-2 text-center">
                      <p className="text-xs font-black text-zinc-950">10–25%</p>
                      <p className="text-[10px] font-medium text-zinc-500">Extra Off</p>
                    </div>
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-2.5 py-2 text-center">
                      <p className="text-xs font-black text-zinc-950">Zero</p>
                      <p className="text-[10px] font-medium text-zinc-500">Surge Fee</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTab("plans")}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0c831f] hover:bg-[#0a701a] text-xs font-black text-white shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Explore Quick+ Plans</span>
                    <ChevronRight className="size-4 stroke-[2.5]" />
                  </button>
                </div>
              )}
            </section>

            {/* Live Metrics Bento Grid */}
            <section className="grid grid-cols-2 gap-2.5">
              <StatCard
                icon={TrendingUp}
                label="Saved"
                value={`₹${membership.quota.totalSavings.toLocaleString("en-IN")}`}
                sublabel="Total member savings"
              />
              <StatCard
                icon={Package}
                label="Deliveries"
                value={
                  membership.quota.totalOrders > 0
                    ? `${membership.quota.remainingOrders} left`
                    : "Unlimited"
                }
                sublabel={`${membership.quota.usedOrders} used this cycle`}
              />
              <StatCard
                icon={Zap}
                label="Express"
                value={`${membership.quota.freeExpressRemaining} free`}
                sublabel={`${membership.quota.freeExpressTotal} allocated`}
              />
              <StatCard
                icon={Clock}
                label="Validity"
                value={`${membership.remainingDays}d`}
                sublabel={isActiveMember ? `Ends ${membership.expiresLabel}` : "Not active"}
              />
            </section>

            {/* Clean Segmented Navigation Tabs */}
            <div className="flex gap-1 rounded-2xl border border-zinc-200/80 bg-zinc-100/90 p-1">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`h-9 flex-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tab === item.id
                      ? "bg-white text-zinc-950 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW */}
            {tab === "overview" ? (
              <div className="space-y-4">
                {/* Active Member Benefits */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                      Your Quick+ Benefits
                    </h2>
                    {isActiveMember ? (
                      <span className="text-[11px] font-bold text-[#0c831f]">All Active</span>
                    ) : null}
                  </div>
                  {membership.benefits.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-center shadow-2xs">
                      <span className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                        <Gift className="size-5" />
                      </span>
                      <p className="mt-3 text-sm font-black text-zinc-950">No active Quick+ plan</p>
                      <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                        Choose Silver, Gold, or Platinum to unlock ₹0 delivery, extra discounts, and priority express.
                      </p>
                      <button
                        type="button"
                        onClick={() => setTab("plans")}
                        className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0c831f] hover:bg-[#0a701a] px-5 text-xs font-black text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        View Quick+ Plans
                      </button>
                    </div>
                  ) : (
                    <ul className="rounded-2xl border border-zinc-200/80 bg-white p-4 space-y-3 shadow-2xs">
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

                {/* Savings Calculator */}
                <SavingsCalculator />

                {/* 6 Quick+ Perks Grid */}
                <section className="space-y-2">
                  <div className="px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                      Why Choose Quick+
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {QUICK_PLUS_PERKS.map((perk, i) => {
                      const Icon = perk.icon;
                      return (
                        <div
                          key={i}
                          className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="flex size-7 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                              <Icon className="size-3.5 stroke-[2.2]" />
                            </span>
                            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-zinc-500">
                              {perk.badge}
                            </span>
                          </div>
                          <h4 className="mt-2.5 text-xs font-black text-zinc-950">{perk.title}</h4>
                          <p className="mt-0.5 text-[11px] text-zinc-500 leading-snug">{perk.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Quick Action Buttons */}
                <section className="space-y-2">
                  <button
                    type="button"
                    disabled={pendingPlan !== null}
                    onClick={() =>
                      activePlan && activePlan.id !== "free"
                        ? void handleSubscribe(activePlan.id)
                        : setTab("plans")
                    }
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0c831f] hover:bg-[#0a701a] text-xs font-black text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                  >
                    {pendingPlan ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
                    {isActiveMember ? "Renew Quick+ Membership" : "Compare Plans & Join Quick+"}
                  </button>

                  {membership.canCancel ? (
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => void handleCancel()}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-600 hover:bg-zinc-50 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                    >
                      {cancelling ? <Loader2 className="size-4 animate-spin" /> : null}
                      Cancel Quick+ Membership
                    </button>
                  ) : null}
                </section>

                {/* FAQs */}
                <section className="space-y-2">
                  <div className="flex items-center gap-1.5 px-1">
                    <HelpCircle className="size-3.5 text-zinc-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                      Frequently Asked Questions
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {FAQS.map((faq, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs transition-all"
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
                          <p className="mt-2.5 border-t border-zinc-100 pt-2.5 text-[11px] leading-relaxed text-zinc-600">
                            {faq.a}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {/* TAB 2: PLANS & PRICING */}
            {tab === "plans" ? (
              <section className="space-y-4">
                {/* 3-Cycle Billing Switcher */}
                <div className="flex gap-1 rounded-2xl border border-zinc-200/80 bg-zinc-100/90 p-1">
                  {(
                    [
                      { id: "monthly", label: "Monthly" },
                      { id: "quarterly", label: "3 Months" },
                      { id: "yearly", label: "Annual · Save" },
                    ] as { id: BillingCycle; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCycle(item.id)}
                      className={`h-9 flex-1 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                        cycle === item.id
                          ? "bg-white text-zinc-950 shadow-2xs"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {!plans || plans.plans.length === 0 ? (
                  <EmptyState
                    icon={Crown}
                    title="No plans available"
                    description="Membership plans couldn't be loaded right now."
                    actionLabel="Try again"
                    onAction={() => void load({ refresh: true })}
                  />
                ) : (
                  <div className="space-y-3.5">
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

            {/* TAB 3: ORDERS WITH MEMBERSHIP */}
            {tab === "orders" ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                      Quick+ Orders
                    </h2>
                    <p className="text-xs font-semibold text-zinc-700">
                      Orders covered under {membership.planName}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-[#0c831f]">
                    {membership.membershipOrders.length}{" "}
                    {membership.membershipOrders.length === 1 ? "order" : "orders"}
                  </span>
                </div>

                {membership.membershipOrders.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-7 text-center shadow-2xs">
                    <span className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-[#0c831f]">
                      <Package className="size-5" />
                    </span>
                    <p className="mt-3 text-sm font-black text-zinc-950">No Quick+ orders yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500">
                      Place a laundry order with an active Quick+ pass to track your ₹0 delivery and member savings here.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/home" })}
                      className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0c831f] hover:bg-[#0a701a] px-5 text-xs font-black text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="size-3.5" /> Book Laundry Now
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
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-black text-[#0c831f]">
                                Saved ₹{ord.totalSaved}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {ord.services.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-2.5">
                            {ord.services.map((svc, i) => (
                              <span
                                key={i}
                                className="rounded-lg bg-zinc-50 border border-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700"
                              >
                                {svc}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
                          <span className="flex items-center gap-1 text-[#0c831f]">
                            <Check className="size-3 stroke-[3]" />
                            ₹0 Delivery Applied
                          </span>
                          <span className="flex items-center gap-0.5 text-zinc-700">
                            Track Order <ChevronRight className="size-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {/* TAB 4: BILLING HISTORY */}
            {tab === "history" ? (
              <section className="space-y-3">
                <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  Quick+ Billing History
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
                    description="Your Quick+ subscription payments and renewals will appear here."
                    actionLabel="Explore Plans"
                    onAction={() => setTab("plans")}
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
                              Subscribed {item.subscribedLabel}
                            </p>
                            {item.renewalAt ? (
                              <p className="text-[11px] text-zinc-500">
                                Renewed {item.renewalLabel}
                              </p>
                            ) : null}
                            <p className="text-[11px] text-zinc-500">Expires {item.expiresLabel}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-zinc-950 tabular-nums font-mono">
                              {formatMembershipPrice(item.amount)}
                            </p>
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
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
          </div>
        ) : null}
      </div>

      <FloatingCartBar />
      <BottomNav />
    </main>
  );
}
