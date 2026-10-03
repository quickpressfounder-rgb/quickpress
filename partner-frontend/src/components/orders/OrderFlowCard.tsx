import {
  BadgeCheck,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Hourglass,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  PhoneCall,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Sparkles,
  Truck,
  User,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { ManagedOrder } from "../../data/partner-orders-mock";
import type { OrderActionId } from "./order-actions";

export interface OrderFlowCardProps {
  order: ManagedOrder;
  onAction?: (actionId: OrderActionId) => void;
  busyAction?: OrderActionId | null;
  dispatchInputOtp?: string;
  setDispatchInputOtp?: (val: string) => void;
  handleVerifyPartnerDispatch?: () => void;
  isVerifyingDispatch?: boolean;
  onShowInvoice?: () => void;
}

export function getFlowMilestone(stage: string): {
  index: number;
  label: string;
  subtext: string;
  statusTheme: "emerald" | "blue" | "amber" | "purple" | "rose";
  badgeText: string;
} {
  switch (stage) {
    case "new":
    case "placed":
      return {
        index: 0,
        label: "Incoming Order Awaiting Store Acceptance",
        subtext: "Customer placed the booking. Accept promptly to dispatch pickup captain.",
        statusTheme: "amber",
        badgeText: "Pending Acceptance ⏱️",
      };
    case "accepted":
      return {
        index: 0,
        label: "Order Accepted by Store",
        subtext: "Order confirmed. Pickup captain is assigned to collect clothes from customer.",
        statusTheme: "emerald",
        badgeText: "Store Confirmed ✓",
      };
    case "pickup_pending":
    case "pickup_rider_assigned":
    case "pickup_rider_accepted":
      return {
        index: 1,
        label: "Captain En Route for Customer Pickup",
        subtext: "Captain is traveling to the customer address to collect laundry bag.",
        statusTheme: "blue",
        badgeText: "Pickup in Progress 🛵",
      };
    case "picked":
    case "picked_up":
      return {
        index: 1,
        label: "Clothes Collected from Customer",
        subtext: "Captain has collected the bag and is on the way to your store.",
        statusTheme: "blue",
        badgeText: "En Route to Store 🛵",
      };
    case "at_partner":
      return {
        index: 1,
        label: "Clothes Arrived at Store",
        subtext: "Laundry package delivered to your store. Verify items and begin processing.",
        statusTheme: "emerald",
        badgeText: "Reached Store 🧺",
      };
    case "processing":
    case "washing":
    case "dry_cleaning":
    case "ironing":
      return {
        index: 2,
        label: "Laundry Cleaning & Care in Progress",
        subtext: "Clothes are in washing machine / steam press. Once packed in bag, mark ready.",
        statusTheme: "emerald",
        badgeText: "In Processing ✨",
      };
    case "ready":
    case "ready_for_delivery":
    case "delivery_rider_assigned":
    case "delivery_rider_accepted":
    case "dispatch_otp_pending":
      return {
        index: 3,
        label: "Order Packed & Ready for Pickup",
        subtext: "Delivery captain is arriving to collect. Verify the 4-digit Dispatch OTP to handover.",
        statusTheme: "purple",
        badgeText: "Ready for Handover 📦",
      };
    case "out_for_delivery":
      return {
        index: 4,
        label: "Out for Doorstep Delivery",
        subtext: "Delivery captain is en route to customer doorstep. Wallet settlement follows delivery.",
        statusTheme: "blue",
        badgeText: "Out for Delivery 🚀",
      };
    case "delivered":
    case "completed":
      return {
        index: 4,
        label: "Order Delivered & Wallet Settled",
        subtext: "Customer received clean laundry. Payment has been credited to your store balance.",
        statusTheme: "emerald",
        badgeText: "Delivered & Settled 🎉",
      };
    case "cancelled":
      return {
        index: -1,
        label: "Order Cancelled",
        subtext: "This booking was cancelled and closed. Amount refunded to customer wallet.",
        statusTheme: "rose",
        badgeText: "Cancelled ✕",
      };
    default:
      return {
        index: 0,
        label: "Order in Progress",
        subtext: "Operational laundry workflow active.",
        statusTheme: "emerald",
        badgeText: "Active",
      };
  }
}

const FLOW_STEPS = [
  { key: "confirmed", label: "Confirmed", icon: ClipboardCheck },
  { key: "pickup", label: "Pickup", icon: Bike },
  { key: "cleaning", label: "Cleaning", icon: Sparkles },
  { key: "ready", label: "Ready", icon: PackageCheck },
  { key: "delivered", label: "Delivered", icon: BadgeCheck },
] as const;

function formatEventTime(time?: string): string {
  if (!time) return "Completed";
  if (time.includes("ago") || time === "Just now" || time === "Completed" || time === "Pending") {
    return time;
  }
  try {
    const d = new Date(time);
    if (isNaN(d.getTime())) return time;
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return time;
  }
}

/**
 * Modern Interactive Order Progress Flow component for the Order Details page.
 * Displays visual 5-step track, contextual milestone highlights, and direct workflow actions.
 */
export function OrderFlowCard({
  order,
  onAction,
  busyAction,
  dispatchInputOtp = "",
  setDispatchInputOtp,
  handleVerifyPartnerDispatch,
  isVerifyingDispatch = false,
  onShowInvoice,
}: OrderFlowCardProps) {
  const [showFullHistory, setShowFullHistory] = useState(false);
  const milestone = getFlowMilestone(order.stage);
  const isCancelled = order.stage === "cancelled";
  const timeline = order.timeline || [];

  return (
    <div className="rounded-3xl border border-slate-200/90 dark:border-border/80 bg-white dark:bg-card p-4 sm:p-5 shadow-sm space-y-4">
      {/* 1. Header: Live Order Progress Flow */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-500/20">
            <Zap className="size-3.5 fill-emerald-600" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">
            Live Order Flow
          </h2>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide border ${
            milestone.statusTheme === "emerald"
              ? "bg-emerald-50 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-400"
              : milestone.statusTheme === "amber"
              ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400"
              : milestone.statusTheme === "blue"
              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400"
              : milestone.statusTheme === "purple"
              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400"
              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400"
          }`}
        >
          {milestone.badgeText}
        </span>
      </div>

      {/* 2. Visual 5-Milestone Stepper Track */}
      {!isCancelled ? (
        <div className="pt-1">
          <div className="relative flex items-center justify-between">
            {FLOW_STEPS.map((step, idx) => {
              const isPast = milestone.index > idx;
              const isCurrent = milestone.index === idx;
              const isFuture = milestone.index < idx;
              const isLast = idx === FLOW_STEPS.length - 1;

              return (
                <div key={step.key} className="flex flex-1 items-center last:flex-none">
                  {/* Step Item with Icon */}
                  <div className="flex flex-col items-center gap-1.5 relative z-10">
                    <div
                      className={`flex size-9 sm:size-10 items-center justify-center rounded-full transition-all duration-300 select-none ${
                        isPast
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isCurrent
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/35 ring-4 ring-emerald-500/25 scale-110"
                          : "bg-slate-100 text-slate-400 border border-slate-200/80 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500"
                      }`}
                    >
                      {isPast ? (
                        <Check className="size-4 stroke-[3]" />
                      ) : (
                        <step.icon
                          className={`size-4 sm:size-4.5 ${isCurrent ? "stroke-[2.5]" : "stroke-[1.9]"}`}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[9.5px] sm:text-[10.5px] tracking-tight text-center truncate max-w-[58px] ${
                        isCurrent
                          ? "font-black text-emerald-700 dark:text-emerald-400"
                          : isPast
                          ? "font-bold text-slate-800 dark:text-zinc-200"
                          : "font-semibold text-slate-400 dark:text-zinc-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {/* Connecting Bar */}
                  {!isLast && (
                    <div className="flex-1 h-1 mx-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isPast
                            ? "w-full bg-emerald-500"
                            : isCurrent
                            ? "w-1/2 bg-emerald-500 animate-pulse"
                            : "w-0"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Cancelled Banner */
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/90 dark:bg-rose-950/30 p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-rose-600 text-white font-black text-xs">
              ✕
            </span>
            <p className="text-xs font-black text-rose-800 dark:text-rose-300">
              Order Cancelled & Closed
            </p>
          </div>
          <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300/90">
            {order.cancelReason || "This order was cancelled by customer or platform."}
          </p>
        </div>
      )}

      {/* 3. Current Milestone Highlight & Workflow Action Box */}
      {!isCancelled && (
        <div
          className={`rounded-2xl p-4 transition-all border ${
            milestone.statusTheme === "emerald"
              ? "bg-gradient-to-br from-emerald-50/90 via-white to-white border-emerald-500/25 dark:from-emerald-950/30 dark:to-card"
              : milestone.statusTheme === "amber"
              ? "bg-gradient-to-br from-amber-50/90 via-white to-white border-amber-300/40 dark:from-amber-950/30 dark:to-card"
              : milestone.statusTheme === "purple"
              ? "bg-gradient-to-br from-purple-50/90 via-white to-white border-purple-200/80 dark:from-purple-950/30 dark:to-card"
              : "bg-gradient-to-br from-blue-50/90 via-white to-white border-blue-200/80 dark:from-blue-950/30 dark:to-card"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">
                {milestone.label}
              </h3>
              <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-zinc-400 leading-relaxed">
                {milestone.subtext}
              </p>
            </div>
          </div>

          {/* Contextual Interactive Actions directly in the Flow Box */}
          {order.stage === "new" && (
            <div className="mt-3.5 flex gap-2 pt-1 border-t border-amber-200/50">
              <button
                type="button"
                onClick={() => onAction?.("accept")}
                disabled={Boolean(busyAction)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <CheckCircle2 className="size-4" />
                <span>Accept Order</span>
              </button>
              <button
                type="button"
                onClick={() => onAction?.("reject")}
                disabled={Boolean(busyAction)}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-2.5 text-xs font-black text-rose-700 active:scale-95 transition-all cursor-pointer"
              >
                <X className="size-4" />
                <span>Reject</span>
              </button>
            </div>
          )}

          {order.stage === "at_partner" && (
            <div className="mt-3.5 pt-1 border-t border-emerald-500/15">
              <button
                type="button"
                onClick={() => onAction?.("start_washing")}
                disabled={Boolean(busyAction)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black text-white shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="size-4" />
                <span>Start Washing & Processing ({order.itemCount} Items)</span>
              </button>
            </div>
          )}

          {(order.stage === "washing" ||
            order.stage === "processing" ||
            order.stage === "dry_cleaning" ||
            order.stage === "ironing") && (
            <div className="mt-3.5 pt-1 border-t border-emerald-500/15">
              <button
                type="button"
                onClick={() => onAction?.("mark_ready")}
                disabled={Boolean(busyAction)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black text-white shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <PackageCheck className="size-4" />
                <span>Mark Cleaned & Ready for Delivery ✨</span>
              </button>
            </div>
          )}

          {(order.stage === "ready" ||
            (order.stage as string) === "ready_for_delivery" ||
            (order.stage as string) === "delivery_rider_assigned" ||
            (order.stage as string) === "dispatch_otp_pending") && (
            <div className="mt-3.5 pt-2 border-t border-purple-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-950 dark:text-purple-300">
                  🔑 Captain Dispatch Handover OTP
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded-full">
                  Handover Verification
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="4-digit OTP"
                  value={dispatchInputOtp || ""}
                  onChange={(e) =>
                    setDispatchInputOtp?.(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="w-32 rounded-xl border-2 border-emerald-400 bg-white dark:bg-zinc-900 px-3 py-2 text-center font-mono text-lg font-black tracking-widest text-emerald-950 dark:text-emerald-400 placeholder:text-zinc-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
                <button
                  type="button"
                  disabled={!dispatchInputOtp || dispatchInputOtp.trim().length !== 4 || isVerifyingDispatch}
                  onClick={handleVerifyPartnerDispatch}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 px-3.5 py-2.5 text-xs font-black text-white shadow-xs transition-all cursor-pointer"
                >
                  {isVerifyingDispatch ? (
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  <span>Verify & Release to Captain</span>
                </button>
              </div>
            </div>
          )}

          {((order.stage as string) === "delivered" || order.stage === "completed") && (
            <div className="mt-3.5 pt-2 border-t border-emerald-500/15 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                ✓ Payout credited to Store Wallet
              </span>
              {onShowInvoice && (
                <button
                  type="button"
                  onClick={onShowInvoice}
                  className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-black text-white shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="size-3.5" />
                  <span>Invoice</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Expandable Detailed Activity Log */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowFullHistory(!showFullHistory)}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 py-1 transition-colors cursor-pointer select-none"
        >
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-emerald-600" />
            <span>Activity Log ({timeline.length > 0 ? timeline.length : "Step-by-step"} events)</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span>{showFullHistory ? "Hide Log" : "View Full Log"}</span>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
                showFullHistory ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>

        {showFullHistory && (
          <div className="mt-3 space-y-2.5 pt-2 border-t border-slate-100 dark:border-border/60 animate-in fade-in slide-in-from-top-1 duration-200">
            {timeline.length > 0 ? (
              timeline.map((entry, index) => (
                <div key={entry.id || index} className="flex items-start gap-2.5 text-xs">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
                    <Check className="size-3 stroke-[3]" />
                  </div>
                  <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {entry.label}
                    </span>
                    <span className="text-[10.5px] font-medium text-slate-400 dark:text-zinc-500 shrink-0">
                      {formatEventTime(entry.time)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                Step-by-step operational logs recorded automatically in real-time.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
