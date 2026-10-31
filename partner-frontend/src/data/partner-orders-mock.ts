/**
 * Sprint 3.3 — UI-only mock data for the Partner Order Management module.
 *
 * Nothing here touches a backend. Every export below is a future API
 * integration point (see PARTNER_SPRINT_3_3_ORDER_MANAGEMENT_REPORT.md).
 *
 * NOTE: no `Date.now()` / `new Date()` at module scope — SSR and the client
 * must render identical markup, so relative times are stored as plain labels
 * plus a numeric `placedMinutesAgo` used for sorting.
 */

import type { GarmentDefect } from "@/shared/types/partner";

export type OrderStage =
  | "new"
  | "accepted"
  | "pickup_pending"
  | "at_partner"
  | "processing"
  | "washing"
  | "dry_cleaning"
  | "ironing"
  | "ready"
  | "completed"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "paid" | "pending" | "refunded";
export type PaymentMode = "cod" | "online";
export type OrderDay = "today" | "tomorrow" | "past";

export type ManagedOrderItem = {
  id: string;
  name: string;
  service: string;
  qty: number;
  price: number;
  unit?: string;
};

export type OrderTimelineEntry = {
  id: string;
  label: string;
  time: string;
  note?: string;
};

export type ManagedOrder = {
  id: string;
  code: string;
  stage: OrderStage;
  customerName: string;
  customerRating: number;
  customerPhone: string;
  customerOrders: number;
  pickupAddress: string;
  deliveryAddress: string;
  pickupTime: string;
  pickupDay: OrderDay;
  deliveryEta: string;
  distanceKm: number;
  services: string[];
  itemCount: number;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  placedAt: string;
  placedMinutesAgo: number;
  specialInstructions: string;
  items: ManagedOrderItem[];
  charges: {
    subtotal: number;
    pickupFee: number;
    taxes: number;
    discount: number;
    total: number;
  };
  timeline: OrderTimelineEntry[];
  invoiceNo: string | null;
  cancelReason: string | null;
  assignedRider: any;
  rider?: any;
  isExpress?: boolean;
  expressFee?: number;
  partnerExpressBonus?: number;
  expressPartnerSharePercent?: number;
  partnerAcceptedAt?: string | null;
  cancelledBy?: string | null;
  slaBreached?: string | null;
  autoCancelled?: boolean;
  garmentDefects?: GarmentDefect[];
  hasDefectsReported?: boolean;
};

/* ------------------------------------------------------------------ */
/* Stage metadata                                                      */
/* ------------------------------------------------------------------ */

export const ORDER_TABS: { id: OrderStage; label: string; short: string }[] = [
  { id: "new", label: "New Orders", short: "New" },
  { id: "accepted", label: "Accepted", short: "Accepted" },
  { id: "pickup_pending", label: "Pickup Pending", short: "Pickup" },
  { id: "processing", label: "Processing", short: "Processing" },
  { id: "ready", label: "Ready for Delivery", short: "Ready" },
  { id: "completed", label: "Completed", short: "Done" },
  { id: "cancelled", label: "Cancelled", short: "Cancelled" },
  { id: "refunded", label: "Refunded", short: "Refunded" },
];

export const STAGE_LABEL: Record<string, string> = {
  new: "New",
  placed: "Placed",
  accepted: "Accepted",
  pickup_pending: "Pickup Pending",
  pickup_rider_assigned: "Pickup Rider Assigned",
  pickup_rider_accepted: "Pickup Rider Accepted",
  picked: "Picked Up",
  picked_up: "Picked Up",
  at_partner: "Laundry at Store",
  processing: "Processing",
  washing: "Processing",
  dry_cleaning: "Processing",
  ironing: "Processing",
  ready: "Ready for Delivery",
  ready_for_delivery: "Ready for Delivery",
  delivery_rider_assigned: "Delivery Rider Assigned",
  delivery_rider_accepted: "Delivery Rider Accepted",
  dispatch_otp_pending: "Dispatch OTP Pending",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const STAGE_TONE: Record<string, string> = {
  new: "bg-primary/15 text-brand-dark",
  placed: "bg-primary/15 text-brand-dark",
  accepted: "bg-primary/15 text-brand-dark",
  pickup_pending: "bg-primary/10 text-brand-dark",
  pickup_rider_assigned: "bg-primary/10 text-brand-dark",
  picked: "bg-secondary/10 text-brand-green",
  picked_up: "bg-secondary/10 text-brand-green",
  at_partner: "bg-secondary/10 text-brand-green",
  processing: "bg-secondary/10 text-brand-green",
  washing: "bg-secondary/10 text-brand-green",
  dry_cleaning: "bg-secondary/10 text-brand-green",
  ironing: "bg-secondary/10 text-brand-green",
  ready: "bg-secondary/15 text-brand-green-dark",
  ready_for_delivery: "bg-secondary/15 text-brand-green-dark",
  delivery_rider_assigned: "bg-secondary/10 text-brand-green",
  out_for_delivery: "bg-secondary/10 text-brand-green",
  completed: "bg-muted text-muted-foreground",
  delivered: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-amber-500/10 text-amber-700",
};

/** Vertical status timeline shown on the order details screen. */
export const TIMELINE_STEPS = [
  { key: "pending", label: "Order Placed" },
  { key: "accepted", label: "Accepted" },
  { key: "pickup_pending", label: "Waiting for Pickup" },
  { key: "picked", label: "Pickup Completed" },
  { key: "processing", label: "Processing" },
  { key: "ready", label: "Ready for Delivery" },
  { key: "delivery_assigned", label: "Delivery Rider Assigned" },
  { key: "dispatch", label: "Dispatch / Handover" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
] as const;

/** How far down the timeline a given stage sits. */
export const STAGE_TIMELINE_INDEX: Record<string, number> = {
  new: 0,
  placed: 0,
  accepted: 1,
  pickup_rider_assigned: 2,
  pickup_rider_accepted: 2,
  pickup_pending: 2,
  picked: 3,
  picked_up: 3,
  at_partner: 3,
  processing: 4,
  washing: 4,
  dry_cleaning: 4,
  ironing: 4,
  ready: 5,
  ready_for_delivery: 5,
  delivery_rider_assigned: 6,
  delivery_rider_accepted: 7,
  dispatch_otp_pending: 7,
  out_for_delivery: 8,
  delivery_otp_pending: 8,
  completed: 9,
  delivered: 9,
  cancelled: 0,
  refunded: 0,
};

export type PartnerOrderFilterTab =
  | "active"
  | "picked"
  | "process"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "all"
  | "pickup"
  | "processing"
  | "ready"
  | "dispatch"
  | "refunded";

export function formatOrderPlacedTime(placedAt?: string): { time: string; date: string; relative: string } {
  if (!placedAt) return { time: "Recently", date: "Today", relative: "Just now" };
  const d = new Date(placedAt);
  if (isNaN(d.getTime())) return { time: placedAt, date: "Today", relative: placedAt };

  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const date = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        });

  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  let relative = "Just now";
  if (diffMins >= 1 && diffMins < 60) {
    relative = `${diffMins}m ago`;
  } else if (diffMins >= 60 && diffMins < 1440) {
    relative = `${Math.floor(diffMins / 60)}h ago`;
  } else if (diffMins >= 1440) {
    relative = `${Math.floor(diffMins / 1440)}d ago`;
  }

  return { time, date, relative };
}

export function isOrderMatchingTab(order: ManagedOrder, tab: PartnerOrderFilterTab): boolean {
  const stage = String(order.stage || "").toLowerCase().trim();
  const rawStatus = String((order as any).status || "").toLowerCase().trim();
  const cancelReason = String(order.cancelReason || (order as any).cancelledReason || "").toLowerCase();

  const isRefunded =
    stage === "refunded" ||
    rawStatus === "refunded" ||
    order.paymentStatus === "refunded" ||
    (order as any).refund_status === "completed" ||
    (order as any).refund_status === "processed" ||
    (order as any).refund_status === "refunded" ||
    Boolean((order as any).refund_id) ||
    Boolean((order as any).refundAmount && (order as any).refundAmount > 0) ||
    Boolean((order as any).refundStatus && (order as any).refundStatus !== "none");

  const isCancelled =
    stage === "cancelled" ||
    rawStatus === "cancelled" ||
    rawStatus === "rejected" ||
    rawStatus === "store_rejected" ||
    rawStatus === "pickup_failed" ||
    rawStatus === "delivery_failed" ||
    Boolean(order.cancelledBy) ||
    Boolean(order.cancelReason) ||
    cancelReason.length > 0 ||
    isRefunded;

  if (tab === "all") return true;

  if (tab === "cancelled" || tab === "refunded") {
    return isCancelled;
  }

  // Non-cancelled tabs should NEVER show cancelled orders
  if (isCancelled) return false;

  if (tab === "delivered") {
    return (
      stage === "completed" ||
      stage === "delivered" ||
      rawStatus === "delivered" ||
      rawStatus === "completed"
    );
  }

  if (tab === "out_for_delivery" || tab === "ready" || tab === "dispatch") {
    return (
      stage === "ready" ||
      rawStatus === "ready" ||
      rawStatus === "ready_for_delivery" ||
      rawStatus === "delivery_rider_assigning" ||
      rawStatus === "delivery_rider_assigned" ||
      rawStatus === "delivery_rider_2_assigned" ||
      rawStatus === "delivery_rider_accepted" ||
      rawStatus === "dispatch_otp_pending" ||
      rawStatus === "dispatch_otp_verified" ||
      rawStatus === "dispatched" ||
      rawStatus === "out_for_delivery" ||
      rawStatus === "delivery_otp_pending" ||
      rawStatus === "delivery_otp_verified"
    );
  }

  if (tab === "process" || tab === "processing") {
    return (
      stage === "processing" ||
      stage === "washing" ||
      stage === "dry_cleaning" ||
      stage === "ironing" ||
      stage === "at_partner" ||
      rawStatus === "processing" ||
      rawStatus === "processing_started" ||
      rawStatus === "washing" ||
      rawStatus === "sorting" ||
      rawStatus === "drying" ||
      rawStatus === "dry_cleaning" ||
      rawStatus === "ironing" ||
      rawStatus === "quality_check" ||
      rawStatus === "packed" ||
      rawStatus === "processing_completed" ||
      rawStatus === "at_partner" ||
      rawStatus === "at_store" ||
      rawStatus === "store_received" ||
      rawStatus === "store_drop_confirmed"
    );
  }

  if (tab === "picked" || tab === "pickup") {
    return (
      rawStatus === "picked" ||
      rawStatus === "picked_up" ||
      rawStatus === "in_transit_to_store" ||
      rawStatus === "pickup_otp_verified" ||
      (stage === "pickup_pending" && Boolean((order as any).riderHandoverInitiated))
    );
  }

  if (tab === "active") {
    return (
      stage === "new" ||
      stage === "placed" ||
      stage === "accepted" ||
      (stage === "pickup_pending" && !(order as any).riderHandoverInitiated && rawStatus !== "picked" && rawStatus !== "picked_up" && rawStatus !== "in_transit_to_store") ||
      rawStatus === "new" ||
      rawStatus === "placed" ||
      rawStatus === "pending_partner_acceptance" ||
      rawStatus === "partner_accepted" ||
      rawStatus === "accepted" ||
      rawStatus === "rider_pickup_assigning" ||
      rawStatus === "rider_searching" ||
      rawStatus === "pickup_rider_assigned" ||
      rawStatus === "rider_assigned" ||
      rawStatus === "pickup_rider_accepted" ||
      rawStatus === "rider_accepted" ||
      rawStatus === "rider_going_to_pickup" ||
      rawStatus === "pickup_otp_pending"
    );
  }

  return true;
}

export const HIGH_VALUE_THRESHOLD = 1500;

export const managedOrders: ManagedOrder[] = [];

