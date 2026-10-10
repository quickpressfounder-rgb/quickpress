import { Loader2, X } from "lucide-react";

import type { ManagedOrder } from "../../data/partner-orders-mock";
import { ACTION_INTENT_CLASS, getOrderActions, type OrderActionId } from "./order-actions";
import { SwipeActionButton } from "../common/SwipeActionButton";
import { DualSwipeActionButton } from "../common/DualSwipeActionButton";

/** Stage-aware action buttons with Swipe To Confirm & Dual Swipe Left-Reject/Right-Accept */
export function OrderActionBar({
  order,
  onAction,
  size = "compact",
  busyAction = null,
}: {
  order: ManagedOrder;
  onAction: (actionId: OrderActionId) => void;
  size?: "compact" | "full";
  busyAction?: OrderActionId | null;
}) {
  const isDryClean = order.services?.some((service) => service.toLowerCase().includes("dry"));
  const actions = getOrderActions(order.stage, isDryClean);

  if (!actions.length) {
    if (order.stage === "accepted" || order.stage === "pickup_pending") {
      return (
        <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-50 border border-amber-200/80 p-3 text-center text-xs font-bold text-amber-800">
          <span className="text-base">🛵</span>
          <span>Waiting for Captain to reach store with laundry (कैप्टन के कपड़े लेकर स्टोर पहुँचने की प्रतीक्षा है)</span>
        </div>
      );
    }
    if (
      order.stage === "ready" ||
      (order.stage as string) === "ready_for_delivery" ||
      (order.stage as string) === "delivery_rider_assigned" ||
      (order.stage as string) === "delivery_rider_2_assigned" ||
      (order.stage as string) === "dispatch_otp_pending"
    ) {
      const isRider2 =
        (order.stage as string) === "delivery_rider_2_assigned" ||
        Boolean((order as any)?.reassignmentPool && (order as any).reassignmentPool > 0) ||
        Boolean((order as any)?.isReassigned);

      return (
        <div
          className={`flex w-full items-center justify-center gap-2 rounded-2xl p-3 text-center text-xs font-bold shadow-xs ${
            isRider2
              ? "bg-purple-50 border border-purple-300 text-purple-900"
              : "bg-blue-50 border border-blue-200/80 text-blue-900"
          }`}
        >
          <span className="text-base">{isRider2 ? "🚀" : "🛵"}</span>
          <span>
            {isRider2
              ? "⚡ Rider 1 Breached 2m SLA (-₹20 Penalty). Rider 2 Assigned (+₹20 Bonus Pool). Awaiting store arrival."
              : "Delivery Captain Dispatched · 2-Minute SLA to reach store & verify Dispatch OTP"}
          </span>
        </div>
      );
    }
    return null;
  }

  const primaryAction = actions.find((a) => a.intent === "primary") || actions[0];
  const dangerAction = actions.find((a) => a.intent === "danger");

  // In full-screen mode (Order Details bottom bar), render swipe-to-confirm button
  if (size === "full") {
    // If order has both Accept and Reject (New / Placed incoming order) -> DUAL SWIPE
    if (primaryAction && dangerAction && primaryAction.id === "accept") {
      return (
        <div className="w-full">
          <DualSwipeActionButton
            acceptLabel="Swipe Right to Accept"
            rejectLabel="Swipe Left to Reject"
            onAccept={() => onAction(primaryAction.id)}
            onReject={() => onAction(dangerAction.id)}
            loading={Boolean(busyAction)}
          />
        </div>
      );
    }

    if (primaryAction) {
      const swipeLabel =
        primaryAction.id === "start_washing" || primaryAction.id === "processing" || primaryAction.id === "wash" || primaryAction.id === "dry_clean"
          ? "Swipe to Start Processing 🧺"
          : primaryAction.id === "mark_ready" || primaryAction.id === "ready"
          ? "Swipe: Process Complete ✨"
          : `Swipe to ${primaryAction.label}`;

      return (
        <div className="flex w-full items-center gap-2.5">
          {dangerAction && (
            <button
              type="button"
              disabled={Boolean(busyAction)}
              onClick={() => onAction(dangerAction.id)}
              className="flex h-13 shrink-0 items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-700 transition-all hover:bg-rose-100 active:scale-95 shadow-xs"
            >
              <X className="size-4" />
              <span>Reject</span>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <SwipeActionButton
              label={swipeLabel}
              onConfirm={() => onAction(primaryAction.id)}
              loading={busyAction === primaryAction.id}
              color="blue"
            />
          </div>
        </div>
      );
    }
  }

  const sizeClass = size === "full" ? "h-12 text-sm shadow-md" : "py-2.5 text-xs shadow-xs";

  return (
    <div className="flex w-full items-center gap-2.5">
      {actions.map((action) => {
        const Icon = action.icon;
        const busy = busyAction === action.id;
        const isPrimary = action.intent === "primary";
        return (
          <button
            key={action.id}
            type="button"
            disabled={busy}
            onClick={() => onAction(action.id)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl font-black tracking-tight transition-all duration-200 active:scale-[0.98] ${sizeClass} ${
              isPrimary
                ? "bg-primary hover:bg-primary-dark text-white shadow-primary/25"
                : action.intent === "danger"
                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                : "bg-zinc-900 hover:bg-black text-white"
            }`}
          >
            {busy ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : (
              <Icon className="size-4.5 shrink-0" />
            )}
            <span className="truncate">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
