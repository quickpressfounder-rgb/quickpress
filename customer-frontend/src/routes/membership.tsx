import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
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
  Info,
  Loader2,
  Package,
  Percent,
  Receipt,
  RefreshCw,
  Scale,
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
      { title: "QuickPress VIP Club — Plans, Benefits & Razorpay Checkout" },
      {
        name: "description",
        content:
          "Join QuickPress VIP Club for ₹0 Delivery on every order, flat 10%-20% laundry discounts, and turbo express wash queues. Instant 1-tap Razorpay activation.",
      },
      { property: "og:title", content: "QuickPress VIP Club — Ultra-Fast Garment Care" },
      {
        property: "og:description",
        content:
          "Subscribe to QuickPress VIP Club for free pickup, free delivery, extra laundry discounts and priority queue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MembershipScreen,
});

type TabId = "overview" | "plans" | "orders" | "history";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "My VIP Club" },
  { id: "plans", label: "Plans & Pricing" },
  { id: "orders", label: "VIP Orders" },
  { id: "history", label: "Billing History" },
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
    <div className="card-soft flex flex-col items-start gap-1.5 border border-border p-3.5 shadow-2xs">
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-xs">
        <Icon className="size-4" />
      </span>
      <p className="mt-1 text-base font-black leading-none tracking-tight text-foreground">{value}</p>
      <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      {sublabel ? <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{sublabel}</p> : null}
    </div>
  );
}

function BenefitRow({ title, description, icon }: { title: string; description: string; icon: string }) {
  const Icon = benefitIcon(icon);
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
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
    const qPrice = plan.quarterlyPrice && plan.quarterlyPrice > 0 ? plan.quarterlyPrice : Math.round(plan.monthlyPrice * 2.7);
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
  const isGold = plan.id === "gold";
  const isPlatinum = plan.id === "platinum";

  return (
    <article
      className={`relative overflow-hidden rounded-3xl p-5 transition-all ${
        isGold
          ? "border-2 border-amber-400 bg-gradient-to-b from-amber-500/10 via-amber-50/20 to-white shadow-soft dark:from-amber-950/30 dark:via-zinc-900 dark:to-zinc-950"
          : isPlatinum
          ? "border-2 border-purple-400 bg-gradient-to-b from-purple-500/10 via-purple-50/20 to-white shadow-soft dark:from-purple-950/30 dark:via-zinc-900 dark:to-zinc-950"
          : "border border-border bg-card shadow-2xs"
      }`}
    >
      {/* Top Banner Ribbon */}
      {plan.popular ? (
        <div className="absolute right-0 top-0 rounded-bl-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-2xs">
          ⭐ Most Popular
        </div>
      ) : isPlatinum ? (
        <div className="absolute right-0 top-0 rounded-bl-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-2xs">
          👑 Ultimate VIP
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-7 items-center justify-center rounded-lg shadow-2xs ${
                isGold ? "bg-amber-500 text-white" : isPlatinum ? "bg-purple-600 text-white" : "bg-primary text-white"
              }`}
            >
              <Crown className="size-3.5" />
            </span>
            <h3 className="text-base font-black tracking-tight text-foreground">{plan.name}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{plan.tagline}</p>
        </div>
      </div>

      {/* Pricing Header */}
      <div className="mt-4 flex items-baseline justify-between border-y border-border/70 py-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {formatMembershipPrice(pricing.price)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">/{cycle === "yearly" ? "yr" : cycle === "quarterly" ? "3 mos" : "mo"}</span>
          </div>
          <p className="text-[10px] font-medium text-muted-foreground">
            {pricing.price > 0 ? `Equivalent to ₹${pricing.perMonth}/mo` : "Always free"}
          </p>
        </div>

        <div className="text-right">
          {pricing.discountBadge ? (
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              {pricing.discountBadge}
            </span>
          ) : null}
          <p className="mt-0.5 text-[10px] font-bold text-muted-foreground">{pricing.validity}</p>
        </div>
      </div>

      {/* Quota Highlights */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-xl bg-muted/60 p-2">
          <p className="text-[10px] font-bold text-muted-foreground">Deliveries</p>
          <p className="text-xs font-black text-foreground">
            {plan.monthlyOrderLimit && plan.monthlyOrderLimit > 0 ? `${plan.monthlyOrderLimit}/mo` : "Unlimited"}
          </p>
        </div>
        <div className="rounded-xl bg-muted/60 p-2">
          <p className="text-[10px] font-bold text-muted-foreground">Allowance</p>
          <p className="text-xs font-black text-foreground">
            {plan.monthlyWeightLimitKg && plan.monthlyWeightLimitKg > 0 ? `${plan.monthlyWeightLimitKg} kg` : "100 kg"}
          </p>
        </div>
        <div className="rounded-xl bg-muted/60 p-2">
          <p className="text-[10px] font-bold text-muted-foreground">Express Pass</p>
          <p className="text-xs font-black text-foreground">
            {plan.freeExpressCount && plan.freeExpressCount > 0 ? `${plan.freeExpressCount} Free` : "Standard"}
          </p>
        </div>
      </div>

      {/* Benefit List */}
      <ul className="mt-4 space-y-2.5">
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
        className={`ripple mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-xs font-black tracking-wide transition-all duration-300 active:scale-[0.98] disabled:opacity-60 cursor-pointer shadow-md ${
          current
            ? "bg-muted text-muted-foreground cursor-default"
            : isGold
            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:brightness-105"
            : isPlatinum
            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-105"
            : "bg-primary text-primary-foreground hover:brightness-105"
        }`}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {current ? (
          "Active Plan"
        ) : pricing.price > 0 ? (
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4" /> Pay with Razorpay · {formatMembershipPrice(pricing.price)}
          </span>
        ) : (
          "Switch to Free"
        )}
      </button>
      <p className="mt-2 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
        <ShieldCheck className="size-3 text-emerald-600" /> 100% Secure via Razorpay (UPI, Cards & NetBanking)
      </p>
    </article>
  );
}

function SavingsCalculator() {
  const [ordersPerMonth, setOrdersPerMonth] = useState<number>(4);
  const avgBasket = 350;
  const deliverySaved = ordersPerMonth * 40 * 12; // ₹40 delivery fee * 12 mos
  const discountSaved = Math.round(ordersPerMonth * avgBasket * 0.15 * 12); // 15% VIP discount
  const expressSaved = ordersPerMonth >= 4 ? 3 * 99 : 1 * 99; // express fees saved
  const totalAnnualSavings = deliverySaved + discountSaved + expressSaved;

  return (
    <section className="mt-6 rounded-3xl border border-amber-300/70 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-emerald-500/10 p-5 shadow-2xs">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
          <TrendingUp className="size-4" />
        </span>
        <h3 className="text-sm font-black text-amber-950">How Much Will You Save?</h3>
      </div>
      <p className="mt-1 text-xs text-amber-900/80">
        Estimate your annual savings based on your monthly laundry habit.
      </p>

      <div className="mt-4">
        <div className="flex justify-between text-xs font-bold text-amber-950">
          <span>Laundry orders per month</span>
          <span className="rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-xs font-black shadow-xs">
            {ordersPerMonth} orders / mo
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="12"
          step="1"
          value={ordersPerMonth}
          onChange={(e) => setOrdersPerMonth(Number(e.target.value))}
          className="mt-2.5 w-full accent-amber-600 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-bold text-amber-800">
          <span>1 (Occasional)</span>
          <span>4 (Family)</span>
          <span>8 (Weekly Pro)</span>
          <span>12+ (Heavy)</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-amber-300/50 pt-3">
        <div className="rounded-xl bg-white/70 p-2 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-amber-900">Delivery</p>
          <p className="text-xs font-black text-emerald-700">₹{deliverySaved.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-amber-900">15% Off</p>
          <p className="text-xs font-black text-emerald-700">₹{discountSaved.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2 text-center shadow-2xs">
          <p className="text-[10px] font-bold text-amber-900">Total / yr</p>
          <p className="text-xs font-black text-emerald-700">₹{totalAnnualSavings.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-600 px-3 py-2 text-white shadow-xs">
        <span className="text-xs font-bold">Estimated Net Annual Savings</span>
        <span className="text-sm font-black">₹{totalAnnualSavings.toLocaleString("en-IN")} / year</span>
      </div>
    </section>
  );
}

const VIP_PERKS = [
  {
    icon: Truck,
    title: "Unlimited ₹0 Delivery",
    desc: "Free doorstep pickup & delivery on all eligible orders.",
    badge: "Most Loved",
  },
  {
    icon: Percent,
    title: "Flat 10%–20% Off",
    desc: "Automatic member discount stackable with coupon codes.",
    badge: "Instant Save",
  },
  {
    icon: Zap,
    title: "Turbo Express Fast-Track",
    desc: "Jump the queue with expedited 12-24h priority wash turnaround.",
    badge: "VIP Queue",
  },
  {
    icon: ShieldCheck,
    title: "Zero Surge Guarantee",
    desc: "Rain or festive rush — never pay rain or surge fees.",
    badge: "Rainproof",
  },
  {
    icon: Sparkles,
    title: "VIP Fabric Protection",
    desc: "Guaranteed garment replacement safety on luxury clothes.",
    badge: "Safe Care",
  },
  {
    icon: Headphones,
    title: "Dedicated VIP Support",
    desc: "Direct access to senior customer care & laundromat managers.",
    badge: "Priority Help",
  },
];

const FAQS = [
  {
    q: "How does the ₹0 Delivery Fee benefit work?",
    a: "As an active QuickPress VIP member, delivery fees are automatically waived at checkout on all orders above the minimum threshold. Zero promo code needed!",
  },
  {
    q: "Can I use member discounts with promotional coupons?",
    a: "Yes! Your VIP membership discount applies directly to item prices, and you can still apply eligible promotional coupons on top for double savings.",
  },
  {
    q: "How do Express Turnaround Passes work?",
    a: "VIP members get complimentary Express Passes each month. Toggle 'Express 15-Min Pickup' during checkout and the express surcharge is waived.",
  },
  {
    q: "Can I upgrade or switch my membership plan anytime?",
    a: "Absolutely. Upgrading from Silver to Gold or Platinum takes effect immediately, adjusting your benefits and remaining validity seamlessly.",
  },
  {
    q: "Is payment secure with Razorpay?",
    a: "Yes, 100%. We support all Indian payment modes including UPI (PhonePe, GPay, Paytm), RuPay/Visa/MasterCard Cards, and NetBanking with bank-grade 256-bit encryption.",
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
          planName: selectedPlan?.name || "VIP",
          customerName: session?.account?.name || undefined,
          customerPhone: session?.account?.phone || undefined,
          customerEmail: session?.account?.email || undefined,
        });

        if (outcome.status === "success") {
          toast.success(outcome.message || `🎉 Welcome to QuickPress ${selectedPlan?.name || "VIP"}!`);
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
      const result = await cancelMembership("Requested by customer from membership portal");
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
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground pb-24">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar title="QuickPress VIP Club" action={<NotificationBellAction />} />

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
            {/* VIP Card Hero */}
            <section
              className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-soft ${
                membership.active && membership.planId !== "free"
                  ? "bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-900 border border-amber-500/40"
                  : "bg-gradient-to-br from-[#0a0f1d] via-emerald-950 to-[#0a1a12] border border-emerald-500/30"
              }`}
            >
              <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-amber-400/20 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-emerald-500/20 blur-2xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                      <Crown className="size-3.5" />
                    </span>
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-amber-300">
                      {membership.active && membership.planId !== "free"
                        ? "Active VIP Club Member"
                        : "QuickPress VIP Club"}
                    </p>
                  </div>
                  <p className="mt-1.5 truncate text-2xl font-black tracking-tight text-white flex items-center gap-2">
                    {membership.active && membership.planId !== "free"
                      ? membership.planName
                      : "Join QuickPress VIP"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300 font-medium">
                    {membership.active && membership.planId !== "free"
                      ? `Active until ${membership.expiresLabel} · ${membership.remainingDays} days remaining`
                      : "Unlock unlimited ₹0 Delivery, up to 20% flat discount, and priority express turnaround."}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Refresh membership"
                  onClick={() => void load({ refresh: true })}
                  className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.95]"
                >
                  {refreshing ? (
                    <Loader2 className="size-4 animate-spin text-white" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                </button>
              </div>

              <div className="relative mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-0.5 text-[0.65rem] font-black uppercase tracking-wider text-amber-300">
                  {membership.active && membership.planId !== "free" ? `● ${membership.billingCycle || "active"}` : "Not Subscribed"}
                </span>
                {membership.amountPaid > 0 ? (
                  <span className="rounded-full border border-white/15 bg-black/40 px-3 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-300">
                    {formatMembershipPrice(membership.amountPaid)} paid
                  </span>
                ) : null}
                {!membership.active || membership.planId === "free" ? (
                  <button
                    type="button"
                    onClick={() => setTab("plans")}
                    className="ml-auto rounded-full bg-amber-500 px-3 py-1 text-[11px] font-black uppercase text-zinc-950 shadow-xs active:scale-95"
                  >
                    Join Now →
                  </button>
                ) : null}
              </div>
            </section>

            {/* Live Metrics Grid */}
            <section className="mt-4 grid grid-cols-2 gap-2.5">
              <StatCard
                icon={TrendingUp}
                label="Total Saved"
                value={`₹${membership.quota.totalSavings.toLocaleString("en-IN")}`}
                sublabel="Lifetime member savings"
              />
              <StatCard
                icon={Package}
                label="Free Deliveries"
                value={
                  membership.quota.totalOrders > 0
                    ? `${membership.quota.remainingOrders} Left`
                    : "Unlimited"
                }
                sublabel={`${membership.quota.usedOrders} used this month`}
              />
              <StatCard
                icon={Zap}
                label="Express Perks"
                value={`${membership.quota.freeExpressRemaining} Free`}
                sublabel={`${membership.quota.freeExpressTotal} allocated`}
              />
              <StatCard
                icon={Clock}
                label="Days Remaining"
                value={String(membership.remainingDays)}
                sublabel={`Expires ${membership.expiresLabel}`}
              />
            </section>

            {/* Navigation Tabs */}
            <div className="mt-6 flex gap-1.5 rounded-2xl bg-muted p-1">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`h-9 flex-1 rounded-xl text-xs font-bold transition-all duration-300 ${
                    tab === item.id
                      ? "bg-background text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW */}
            {tab === "overview" ? (
              <div className="space-y-6 mt-5">
                {/* Active Member Benefits */}
                <section>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black tracking-tight text-foreground">
                      Your VIP Benefits
                    </h2>
                    {membership.active && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        All Benefits Active
                      </span>
                    )}
                  </div>
                  {membership.benefits.length === 0 ? (
                    <div className="mt-3">
                      <EmptyState
                        icon={Gift}
                        title="No member benefits yet"
                        description="Subscribe to Silver, Gold or Platinum to unlock ₹0 delivery, laundry discounts, and priority express."
                        actionLabel="View VIP Plans"
                        onAction={() => setTab("plans")}
                      />
                    </div>
                  ) : (
                    <ul className="card-soft mt-3 space-y-3 border border-border p-4 shadow-2xs">
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

                {/* Savings Calculator Interactive */}
                <SavingsCalculator />

                {/* 6 VIP Perks Bento Grid */}
                <section>
                  <h3 className="text-sm font-black tracking-tight text-foreground">
                    Why Join QuickPress VIP?
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Engineered to make clean clothes completely effortless and ultra-affordable.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {VIP_PERKS.map((perk, i) => {
                      const Icon = perk.icon;
                      return (
                        <div key={i} className="card-soft border border-border p-3 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="size-3.5" />
                            </span>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-black text-muted-foreground uppercase">
                              {perk.badge}
                            </span>
                          </div>
                          <h4 className="mt-2 text-xs font-black text-foreground">{perk.title}</h4>
                          <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{perk.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Quick Action Buttons */}
                <section className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    disabled={pendingPlan !== null}
                    onClick={() =>
                      activePlan && activePlan.id !== "free"
                        ? void handleSubscribe(activePlan.id)
                        : setTab("plans")
                    }
                    className="ripple flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-xs font-black text-primary-foreground shadow-cta transition-all hover:brightness-105 active:scale-98 disabled:opacity-60 cursor-pointer"
                  >
                    {pendingPlan ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
                    {membership.active && membership.planId !== "free"
                      ? "Renew VIP Membership"
                      : "Explore VIP Plans & Pricing"}
                  </button>

                  {membership.canCancel ? (
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => void handleCancel()}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background text-xs font-bold text-muted-foreground transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
                    >
                      {cancelling ? <Loader2 className="size-4 animate-spin" /> : null}
                      Cancel VIP Membership
                    </button>
                  ) : null}
                </section>

                {/* FAQs */}
                <section className="pt-2">
                  <h3 className="text-sm font-black tracking-tight text-foreground flex items-center gap-1.5">
                    <HelpCircle className="size-4 text-primary" /> Frequently Asked Questions
                  </h3>
                  <div className="mt-3 space-y-2">
                    {FAQS.map((faq, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-border bg-card p-3 shadow-2xs transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                          className="flex w-full items-center justify-between text-left text-xs font-black text-foreground cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`size-4 text-muted-foreground transition-transform ${
                              openFaqIndex === idx ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {openFaqIndex === idx ? (
                          <p className="mt-2 border-t border-border/60 pt-2 text-[11px] leading-relaxed text-muted-foreground">
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
              <section className="mt-5 space-y-4">
                {/* 3-Cycle Billing Switcher */}
                <div className="flex gap-1.5 rounded-2xl bg-muted p-1">
                  {(
                    [
                      { id: "monthly", label: "Monthly" },
                      { id: "quarterly", label: "3-Month Pass 🔥" },
                      { id: "yearly", label: "Annual Pass (Save 60%)" },
                    ] as { id: BillingCycle; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCycle(item.id)}
                      className={`h-9 flex-1 rounded-xl text-[11px] font-black transition-all duration-300 ${
                        cycle === item.id
                          ? "bg-background text-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
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
                  <div className="space-y-4">
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

            {/* TAB 4: BILLING HISTORY */}
            {tab === "history" ? (
              <section className="mt-5">
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  Membership Billing History
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
                      title="No membership transactions yet"
                      description="Your subscription orders, renewals, and Razorpay payments will appear here."
                      actionLabel="Explore Plans"
                      onAction={() => setTab("plans")}
                    />
                  </div>
                ) : null}

                {history && history.items.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {history.items.map((item) => (
                      <article
                        key={item.id}
                        className="card-soft border border-border px-4 py-4 shadow-2xs"
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
                              {item.paymentStatus === "paid" ? <Check className="size-3 text-emerald-600" /> : null}
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
