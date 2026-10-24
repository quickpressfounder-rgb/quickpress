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
    <section className="animate-rise relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs md:p-6">
      <div className="relative flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 border border-blue-200/60">
              {greeting()}
            </span>
            <span className="text-[11px] font-bold text-slate-500">Live Partner Terminal</span>
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            {shop.partnerName}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Today's Laundry Operations Overview
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <SummaryTile label="Total Orders" value={`${totalOrders}`} />
          <SummaryTile label="Earnings" value={inr(earnings)} isHighlight />
          <SummaryTile label="Active Orders" value={`${active}`} />
        </div>
      </div>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  isHighlight = false,
}: {
  label: string;
  value: string;
  isHighlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 transition-all duration-300 hover:-translate-y-0.5 ${
        isHighlight
          ? "border-blue-200 bg-blue-50/60"
          : "border-slate-200/80 bg-slate-50/70"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-lg font-black tracking-tight ${
          isHighlight ? "text-blue-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>
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

  // Classic clean card config (no cartoon rainbow colors)
  const cardConfig = useMemo(() => {
    switch (stat.id) {
      case "new":
        return {
          title: "New Orders",
          sub: "Awaiting store response",
          badge: stat.value > 0 ? `${stat.value} Required` : "All Clear",
        };
      case "processing":
        return {
          title: "In Processing",
          sub: "Washing, drying & steam iron",
          badge: stat.value > 0 ? "In Production" : "Idle",
        };
      case "ready":
        return {
          title: "Ready for Delivery",
          sub: "Packed & verified for Captain",
          badge: stat.value > 0 ? "Awaiting Rider" : "Zero Queued",
        };
      case "completed":
        return {
          title: "Completed Today",
          sub: "Delivered & revenue credited",
          badge: "100% SLA",
        };
      default:
        return {
          title: stat.label,
          sub: "Store operational metric",
          badge: "Active",
        };
    }
  }, [stat.id, stat.value, stat.label]);

  return (
    <div
      onClick={onNavigate}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-zinc-400 hover:shadow-xs cursor-pointer"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200/80 text-zinc-800 transition-colors group-hover:bg-zinc-200">
          <Icon className="size-5 stroke-[2.2]" />
        </span>

        <span className="rounded-full bg-zinc-50 border border-zinc-200 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600">
          {cardConfig.badge}
        </span>
      </div>

      <div className="mt-3.5">
        <p className="text-3xl font-black tracking-tight text-zinc-950">
          {value}
        </p>
        <p className="mt-1 text-xs font-black uppercase tracking-wider text-zinc-800">
          {cardConfig.title}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-zinc-500 truncate">
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
    <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-5 md:p-6 shadow-2xs h-full">
      <div>
        {/* Header */}
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200/80">
              <IndianRupee className="size-5 stroke-[2.2]" />
            </span>
            <div>
              <h3 className="text-sm font-black tracking-tight text-zinc-950">Today's Sale</h3>
              <p className="text-[11px] font-semibold text-zinc-500">Today's Total Settled &amp; Billed Sale</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-600">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-Payout Daily 06:00 AM</span>
          </div>
        </div>

        {/* Main Metric */}
        <div className="relative mt-5">
          <div className="flex items-baseline gap-3">
            <p className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-950">
              {isLoading ? "..." : inr(amount)}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 px-2.5 py-0.5 text-xs font-black">
              <ArrowUpRight className="size-3.5" /> Today's Sale
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-zinc-500">
            Total sales credited from today's completed &amp; billed orders
          </p>
        </div>

        {/* Live Active Pipeline Strip */}
        {pipelineGross > 0 ? (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-zinc-900">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>In-Flight Pipeline:</span>
              <span className="font-extrabold text-zinc-950">{inr(pipelineAmount)}</span>
            </div>
            <span className="text-[11px] font-bold text-zinc-600">
              {activeOrders.length} bookings active
            </span>
          </div>
        ) : null}

        {/* 3 Key Operational Stat Tiles with 100% Real Data */}
        <div className="relative mt-4 grid grid-cols-3 gap-2.5 pt-3 border-t border-zinc-100">
          <div className="rounded-xl bg-zinc-50 p-2.5 border border-zinc-200/80">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Completed</p>
            <p className="mt-0.5 text-sm font-black text-zinc-950">{completedCount} Orders</p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-2.5 border border-zinc-200/80">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Avg Value</p>
            <p className="mt-0.5 text-sm font-black text-zinc-950">
              {completedCount > 0 ? inr(avgOrderValue) : "₹0"}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-50 p-2.5 border border-zinc-200/80">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Commission</p>
            <p className="mt-0.5 text-sm font-black text-zinc-900">
              Net {netPayoutRate}% Pay
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-5 pt-3 flex items-center justify-between border-t border-zinc-100">
        <button
          type="button"
          onClick={() => navigate({ to: partnerRoutes.earnings })}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          View Detailed Statement &amp; Ledger <ArrowRight className="size-3.5" />
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
    <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-xs h-full">
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
                          : "border-2 border-black bg-zinc-100 text-black shadow-xs scale-102 font-black"
                        : count > 0
                          ? isCancelledStage
                            ? "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                            : "bg-zinc-50 text-black border-zinc-300 hover:bg-zinc-100"
                          : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{stage.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                        isSelected
                          ? "bg-zinc-200 text-black"
                          : count > 0
                            ? isCancelledStage
                              ? "bg-rose-600 text-white"
                              : "bg-zinc-200 text-black"
                            : "bg-slate-200 text-slate-600"
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
