import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  IndianRupee,
  ListOrdered,
  Loader2,
  Package,
  Sparkles,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import type { EarningsSummary } from "@/shared/types/partner";
import type { ManagedOrder } from "../../data/partner-orders-mock";

import { useCountUp } from "../../hooks/use-count-up";
import { partnerRoutes } from "../../navigation/partner-routes";
import { orderStatusFlow } from "../../data/partner-dashboard-mock";

const inr = (value: number) => `₹${value.toLocaleString("en-IN")}`;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

/* ------------------------------------------------------------------ Welcome */

export type DashboardShop = {
  shopName: string;
  partnerName: string;
  logoInitials: string;
  isVerified: boolean;
  notifications: number;
};

export type DashboardSummaryCard = {
  totalOrders: number;
  earnings: number;
  activeOrders: number;
};

export function WelcomeCard({
  shop,
  summary,
}: {
  shop: DashboardShop;
  summary: DashboardSummaryCard;
}) {
  const totalOrders = useCountUp(summary.totalOrders);
  const earnings = useCountUp(summary.earnings);
  const active = useCountUp(summary.activeOrders);

  return (
    <section className="animate-rise relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-brand-dark to-brand-green p-5 shadow-soft md:p-7">
      <div className="pointer-events-none absolute -right-12 -top-14 size-48 rounded-full bg-primary/25 blur-2xl" />
      <div className="relative">
        <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-background/70">
          {greeting()},
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-background md:text-3xl">
          {shop.partnerName}
        </h2>
        <p className="mt-1 text-[0.72rem] font-semibold text-background/70">Today's Summary</p>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <SummaryTile label="Total Orders" value={`${totalOrders}`} />
          <SummaryTile label="Earnings" value={inr(earnings)} />
          <SummaryTile label="Active Orders" value={`${active}`} />
        </div>
      </div>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/12 p-3 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5">
      <p className="text-[0.62rem] font-bold uppercase tracking-wider text-background/65">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black tracking-tight text-background">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------- Quick stats */

export type QuickStat = {
  id: string;
  label: string;
  value: number;
  tone: "primary" | "green" | "muted" | "danger";
};

const STAT_ICON = {
  new: ListOrdered,
  processing: Loader2,
  ready: Package,
  completed: CheckCircle2,
  cancelled: XCircle,
} as const;

const STAT_TONE: Record<QuickStat["tone"], string> = {
  primary: "bg-primary/15 text-brand-dark",
  green: "bg-secondary/10 text-brand-green",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-destructive/10 text-destructive",
};

export function QuickStatsGrid({ stats }: { stats: QuickStat[] }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <QuickStatCard
          key={stat.id}
          stat={stat}
          delay={index * 50}
          onNavigate={() => {
            if (stat.id === "new") navigate({ to: partnerRoutes.orders });
            else if (stat.id === "processing") navigate({ to: partnerRoutes.orders });
            else if (stat.id === "ready") navigate({ to: partnerRoutes.orders });
            else if (stat.id === "completed") navigate({ to: partnerRoutes.orders });
          }}
        />
      ))}
    </div>
  );
}

function QuickStatCard({
  stat,
  delay,
  onNavigate,
}: {
  stat: QuickStat;
  delay: number;
  onNavigate?: () => void;
}) {
  const value = useCountUp(stat.value, 700 + delay);
  const Icon = STAT_ICON[stat.id as keyof typeof STAT_ICON] ?? ListOrdered;

  // Rich themed styling per card category
  const cardConfig = useMemo(() => {
    switch (stat.id) {
      case "new":
        return {
          title: "New Orders",
          sub: "Awaiting store response",
          badge: stat.value > 0 ? "Action Required" : "All Clear",
          badgeColor:
            stat.value > 0
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-black animate-pulse"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
          bg: "bg-gradient-to-br from-amber-500/10 via-amber-500/3 to-transparent border-amber-200/90 dark:border-amber-900/40 hover:border-amber-500/60",
          iconColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
        };
      case "processing":
        return {
          title: "In Processing",
          sub: "Washing, drying & steam iron",
          badge: stat.value > 0 ? "In Production" : "Machines Idle",
          badgeColor: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
          bg: "bg-gradient-to-br from-sky-500/10 via-sky-500/3 to-transparent border-sky-200/90 dark:border-sky-900/40 hover:border-sky-500/60",
          iconColor: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25",
        };
      case "ready":
        return {
          title: "Ready for Delivery",
          sub: "Packed & verified for Captain",
          badge: stat.value > 0 ? "Awaiting Rider" : "Zero Queued",
          badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
          bg: "bg-gradient-to-br from-indigo-500/10 via-indigo-500/3 to-transparent border-indigo-200/90 dark:border-indigo-900/40 hover:border-indigo-500/60",
          iconColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
        };
      case "completed":
        return {
          title: "Completed Today",
          sub: "Delivered & revenue credited",
          badge: "100% SLA On-Time",
          badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          bg: "bg-gradient-to-br from-emerald-500/10 via-emerald-500/3 to-transparent border-emerald-200/90 dark:border-emerald-900/40 hover:border-emerald-500/60",
          iconColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
        };
      default:
        return {
          title: stat.label,
          sub: "Store operational metric",
          badge: "Active",
          badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
          bg: "bg-white border-slate-200 hover:border-slate-400",
          iconColor: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  }, [stat.id, stat.value, stat.label]);

  return (
    <div
      onClick={onNavigate}
      className={`group relative overflow-hidden rounded-3xl border p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${cardConfig.bg}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex size-11 items-center justify-center rounded-2xl border shadow-xs transition-transform duration-300 group-hover:scale-105 ${cardConfig.iconColor}`}
        >
          <Icon className="size-5" strokeWidth={2.3} />
        </span>

        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${cardConfig.badgeColor}`}>
            {cardConfig.badge}
          </span>
          <ArrowUpRight className="size-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
        <p className="mt-0.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {cardConfig.title}
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
          {cardConfig.sub}
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Revenue */

export const STATUS_TO_LIVE_MAP: Record<string, string> = {
  new: "pending",
  placed: "pending",
  pending: "pending",
  pending_partner_acceptance: "pending",
  accepted: "accepted",
  partner_accepted: "accepted",
  pickup_pending: "pickup",
  pickup_driver_assigned: "pickup",
  pickup_rider_assigned: "pickup",
  pickup_rider_accepted: "pickup",
  picked_up: "pickup",
  picked: "pickup",
  in_transit_to_store: "pickup",
  at_partner: "pickup",
  store_received: "pickup",
  washing: "washing",
  dry_cleaning: "washing",
  processing: "washing",
  ironing: "ironing",
  ready: "ready",
  ready_for_delivery: "ready",
  delivery_assigned: "ready",
  delivery_rider_assigned: "ready",
  delivery_rider_accepted: "ready",
  dispatch_otp_pending: "ready",
  completed: "delivered",
  delivered: "delivered",
  cancelled: "cancelled",
  rejected: "cancelled",
  store_rejected: "cancelled",
};

export function RevenueCard({
  earnings,
  isLoading,
  orders = [],
}: {
  earnings: EarningsSummary | null;
  isLoading: boolean;
  orders?: ManagedOrder[];
}) {
  const navigate = useNavigate();

  // Real calculations from orders and earnings (strict: never count cancelled orders)
  const deliveredOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.stage === "completed" || (o as any).status === "delivered") &&
          o.stage !== "cancelled" &&
          (o as any).status !== "cancelled"
      ),
    [orders]
  );
  const activeOrders = useMemo(
    () => orders.filter((o) => o.stage !== "completed" && o.stage !== "cancelled"),
    [orders]
  );

  const completedCount = earnings?.completedOrders && earnings.completedOrders > 0
    ? earnings.completedOrders
    : deliveredOrders.length;

  const rawCompletedAmount = deliveredOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const todayOrdersAmount = orders
    .filter((o) => o.stage !== "cancelled" && (o as any).status !== "cancelled")
    .reduce((sum, o) => sum + (o.amount || 0), 0);
  const rawAmount = (earnings?.today && earnings.today > 0)
    ? earnings.today
    : (todayOrdersAmount > 0 ? todayOrdersAmount : (rawCompletedAmount > 0 ? rawCompletedAmount : ((earnings as any)?.total || 0)));

  const amount = useCountUp(rawAmount, 800);
  const pipelineGross = activeOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const pipelineAmount = useCountUp(pipelineGross, 800);

  // Real average order value: 0 when no completed orders, never a hardcoded fallback
  const avgOrderValue = completedCount > 0 ? Math.round(rawAmount / completedCount) : 0;

  // Real commission calculation (default platform fee 15%, net partner 85%)
  const commissionRate = (earnings as any)?.commissionRate ?? 15;
  const netPayoutRate = Math.max(0, Math.round(100 - commissionRate - 1)); // -1% TCS

  return (
    <section className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-card via-card to-emerald-50/40 dark:to-emerald-950/20 p-5 md:p-6 shadow-sm h-full">
      {/* Decorative subtle ambient glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-emerald-500/10 blur-2xl" />

      <div>
        {/* Header */}
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <IndianRupee className="size-5" strokeWidth={2.4} />
            </span>
            <div>
              <h3 className="text-sm font-black tracking-tight text-foreground">Today's Sale</h3>
              <p className="text-[11px] font-semibold text-muted-foreground">Aaj Ki Kul Bikri (Today's Total Sale)</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-Payout Daily 06:00 AM</span>
          </div>
        </div>

        {/* Main Metric */}
        <div className="relative mt-5">
          <div className="flex items-baseline gap-3">
            <p className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {isLoading ? "..." : inr(amount)}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-black">
              <ArrowUpRight className="size-3.5" /> Today's Sale
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Aaj ke sabhi orders ki kul sale (Total sales from today's orders)
          </p>
        </div>

        {/* Live Active Pipeline Strip */}
        {pipelineGross > 0 ? (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>In-Flight Pipeline:</span>
              <span className="font-extrabold text-foreground">{inr(pipelineAmount)}</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              {activeOrders.length} bookings active
            </span>
          </div>
        ) : null}

        {/* 3 Key Operational Stat Tiles with 100% Real Data */}
        <div className="relative mt-4 grid grid-cols-3 gap-2.5 pt-3 border-t border-border/70">
          <div className="rounded-2xl bg-muted/40 p-2.5 border border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</p>
            <p className="mt-0.5 text-sm font-black text-foreground">{completedCount} Orders</p>
          </div>
          <div className="rounded-2xl bg-muted/40 p-2.5 border border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg Value</p>
            <p className="mt-0.5 text-sm font-black text-foreground">
              {completedCount > 0 ? inr(avgOrderValue) : "₹0"}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/40 p-2.5 border border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Commission</p>
            <p className="mt-0.5 text-sm font-black text-emerald-600 dark:text-emerald-400">
              Net {netPayoutRate}% Pay
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-5 pt-3 flex items-center justify-between border-t border-border/50">
        <button
          type="button"
          onClick={() => navigate({ to: partnerRoutes.earnings })}
          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          View Detailed Statement & Ledger <ArrowRight className="size-3.5" />
        </button>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Order Status Flow Card */

export const ORDER_STAGES = [
  { id: "pending", label: "Pending", icon: ListOrdered },
  { id: "accepted", label: "Accepted", icon: CheckCircle2 },
  { id: "pickup", label: "Pickup", icon: Package },
  { id: "washing", label: "Washing", icon: Sparkles },
  { id: "ironing", label: "Ironing", icon: Sparkles },
  { id: "ready", label: "Ready", icon: Package },
  { id: "delivered", label: "Delivered", icon: CheckCircle2 },
  { id: "cancelled", label: "Cancelled", icon: XCircle },
] as const;

export function OrderStatusFlowCard({
  orders = [],
  stageCounts = {},
}: {
  orders: ManagedOrder[];
  stageCounts: Record<string, number>;
}) {
  const navigate = useNavigate();

  // Find the most relevant stage to show first (the first active stage with count > 0, else "pending")
  const defaultStage = useMemo(() => {
    for (const stg of ["pending", "accepted", "pickup", "washing", "ironing", "ready"]) {
      if ((stageCounts[stg] || 0) > 0) return stg;
    }
    return "pending";
  }, [stageCounts]);

  const [selectedStage, setSelectedStage] = useState<string>(defaultStage);

  // Sync if stageCounts change and current selected has 0 but another has orders
  useEffect(() => {
    if ((stageCounts[selectedStage] || 0) === 0 && (stageCounts[defaultStage] || 0) > 0) {
      setSelectedStage(defaultStage);
    }
  }, [defaultStage, selectedStage, stageCounts]);

  // Real filtered orders for the selected stage
  const stageOrders = useMemo(() => {
    return orders.filter((o) => {
      const stage = (o.stage || (o as any).status || "").toLowerCase();
      const mapped = STATUS_TO_LIVE_MAP[stage] || "pending";
      return mapped === selectedStage;
    });
  }, [orders, selectedStage]);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.stage !== "completed" && o.stage !== "delivered" && o.stage !== "cancelled"),
    [orders]
  );
  const pipelineValue = activeOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  const currentStageObj = ORDER_STAGES.find((s) => s.id === selectedStage) || ORDER_STAGES[0];
  const CurrentIcon = currentStageObj.icon;

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-5 md:p-6 shadow-sm h-full">
      {/* Subtle ambient light */}
      <div className="pointer-events-none absolute -left-10 -top-10 size-36 rounded-full bg-primary/5 blur-2xl" />

      <div>
        {/* Interactive Horizontal Stage Chips */}
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
          {ORDER_STAGES.map((stage) => {
            const isSelected = stage.id === selectedStage;
            const count = stageCounts[stage.id] ?? 0;
            const Icon = stage.icon;

                const isCancelledStage = stage.id === "cancelled";
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setSelectedStage(stage.id)}
                    className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer border ${
                      isSelected
                        ? isCancelledStage
                          ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/25 scale-102"
                          : "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 scale-102"
                        : count > 0
                          ? isCancelledStage
                            ? "bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-muted/60 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{stage.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : count > 0
                            ? isCancelledStage
                              ? "bg-rose-600 text-white"
                              : "bg-emerald-600 text-white"
                            : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
          })}
        </div>

        {/* Real Status Bar & Active Order Counter */}
        <div className="mt-3.5 flex items-center justify-between border-b border-border/60 pb-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{currentStageObj.label}:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
              {stageOrders.length} {stageOrders.length === 1 ? "Order" : "Orders"}
            </span>
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">
            {activeOrders.length} active in workflow (₹{pipelineValue.toLocaleString("en-IN")})
          </div>
        </div>

        {/* Real Live Orders for Selected Stage */}
        <div className="mt-3 space-y-2.5">
          {stageOrders.length > 0 ? (
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {stageOrders.map((order) => {
                const servicesText = order.services?.length
                  ? order.services.join(", ")
                  : `${order.itemCount || 1} items`;

                return (
                  <div
                    key={order.id}
                    onClick={() => navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } })}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 p-3 transition-all hover:border-emerald-500/40 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-foreground group-hover:text-emerald-600 transition-colors">
                          #{order.code}
                        </span>
                        <span className="truncate text-xs font-semibold text-muted-foreground">
                          {order.customerName}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                        {servicesText} · {order.pickupTime || "Today"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {selectedStage === "cancelled" ? (
                        <div className="text-right">
                          <span className="font-black text-xs line-through text-rose-500 block">
                            ₹{order.amount}
                          </span>
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md">
                            Cancelled (₹0)
                          </span>
                        </div>
                      ) : (
                        <span className="font-extrabold text-xs text-foreground">
                          ₹{order.amount}
                        </span>
                      )}
                      <span className="flex size-7 items-center justify-center rounded-xl bg-background border border-border group-hover:border-emerald-500/40 text-muted-foreground group-hover:text-emerald-600 transition-colors">
                        <ChevronRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-5 text-center">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2">
                <CurrentIcon className="size-5" />
              </span>
              <p className="text-xs font-bold text-foreground">
                No orders in {currentStageObj.label} stage
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                {activeOrders.length > 0
                  ? `${activeOrders.length} bookings are currently moving through other pipeline stages.`
                  : "All clear! New incoming customer orders will appear here in real time."}
              </p>
              {stageCounts[defaultStage] > 0 && defaultStage !== selectedStage ? (
                <button
                  type="button"
                  onClick={() => setSelectedStage(defaultStage)}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                >
                  View {ORDER_STAGES.find((s) => s.id === defaultStage)?.label} ({stageCounts[defaultStage]}) →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate({ to: partnerRoutes.orders })}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  View Full Orders Queue →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer link to complete Queue */}
      <div className="mt-4 pt-3 flex items-center justify-between border-t border-border/50 text-xs">
        <button
          type="button"
          onClick={() => navigate({ to: partnerRoutes.orders })}
          className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          Open Live Queue Manager <ArrowRight className="size-3.5" />
        </button>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {orders.length} total orders recorded
        </span>
      </div>
    </div>
  );
}

export function OrderStatusChips({
  active = "Washing",
  counts = {},
  onSelect,
}: {
  active?: string;
  counts?: Record<string, number>;
  onSelect?: (stage: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {ORDER_STAGES.map((stage, index) => {
          const isActive = stage.label.toLowerCase() === active.toLowerCase();
          const count = counts[stage.id] ?? counts[stage.label.toLowerCase()] ?? 0;
          const Icon = stage.icon;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                if (onSelect) onSelect(stage.label);
                else navigate({ to: partnerRoutes.orders });
              }}
              className={`animate-rise flex shrink-0 snap-start items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer border ${
                isActive
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 scale-102"
                  : count > 0
                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-muted/60 text-muted-foreground border-border/70 hover:bg-muted hover:text-foreground"
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <Icon className="size-3.5" />
              <span>{stage.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  isActive
                    ? "bg-white/20 text-white"
                    : count > 0
                      ? "bg-emerald-600 text-white"
                      : "bg-muted-foreground/20 text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Quick actions */

const QUICK_ACTIONS = [
  {
    id: "orders",
    icon: ListOrdered,
    label: "Orders Queue",
    subtext: "Live pickups & drop",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    route: partnerRoutes.orders,
  },
  {
    id: "services",
    icon: Sparkles,
    label: "Rate Card",
    subtext: "Prices & active items",
    tone: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25",
    route: partnerRoutes.services,
  },
  {
    id: "shop",
    icon: Building2,
    label: "Store Profile",
    subtext: "Hours & documents",
    tone: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25",
    route: partnerRoutes.shop,
  },
  {
    id: "earnings",
    icon: Wallet,
    label: "Payouts & Ledger",
    subtext: "Bank settlements",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
    route: partnerRoutes.earnings,
  },
] as const;

export function QuickActionsGrid() {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => navigate({ to: action.route })}
          className="group relative flex flex-col items-start gap-2.5 rounded-3xl border border-border/80 bg-card p-4 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-md active:scale-[0.98] text-left cursor-pointer"
        >
          <div className={`flex size-11 items-center justify-center rounded-2xl border ${action.tone} transition-transform duration-300 group-hover:scale-110 shadow-xs`}>
            <action.icon className="size-5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-tight text-foreground group-hover:text-emerald-600 transition-colors">
              {action.label}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 truncate">
              {action.subtext}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
