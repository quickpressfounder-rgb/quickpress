/**
 * Canonical Order view-model mappers & date formatting utilities.
 */

import type {
  Order,
  OrderLifecycleStatus,
  PartnerOrder,
  PartnerOrderStatus,
  RiderOrder,
  RiderOrderStatus,
  RiderTaskType,
} from "@/shared/types";

/* ------------------------------ customer ------------------------------ */

export type CustomerOrderStage =
  | "confirmed"
  | "rider-assigned"
  | "picked-up"
  | "in-cleaning"
  | "quality-check"
  | "out-for-delivery"
  | "delivered";

export const CUSTOMER_STAGES: CustomerOrderStage[] = [
  "confirmed",
  "rider-assigned",
  "picked-up",
  "in-cleaning",
  "quality-check",
  "out-for-delivery",
  "delivered",
];

const CUSTOMER_STAGE_BY_STATUS: Record<string, CustomerOrderStage> = {
  placed: "confirmed",
  pending_partner_acceptance: "confirmed",
  partner_accepted: "confirmed",
  pickup_rider_assigned: "rider-assigned",
  rider_assigned: "rider-assigned",
  rider_searching: "rider-assigned",
  pickup_rider_accepted: "rider-assigned",
  rider_accepted: "rider-assigned",
  pickup_otp_pending: "rider-assigned",
  picked_up: "picked-up",
  at_store: "picked-up",
  at_partner: "picked-up",
  store_drop_confirmed: "in-cleaning",
  processing_started: "in-cleaning",
  processing: "in-cleaning",
  washing: "in-cleaning",
  drying: "in-cleaning",
  dry_cleaning: "in-cleaning",
  ironing: "in-cleaning",
  quality_check: "quality-check",
  packed: "quality-check",
  processing_completed: "quality-check",
  ready_for_delivery: "quality-check",
  ready: "quality-check",
  delivery_rider_assigned: "out-for-delivery",
  delivery_rider_2_assigned: "out-for-delivery",
  delivery_rider_reassigning: "out-for-delivery",
  delivery_failed: "out-for-delivery",
  delivery_rider_accepted: "out-for-delivery",
  dispatch_otp_pending: "out-for-delivery",
  dispatch_otp_verified: "out-for-delivery",
  out_for_delivery: "out-for-delivery",
  delivery_otp_pending: "out-for-delivery",
  delivery_otp_verified: "delivered",
  delivered: "delivered",
  completed: "delivered",
  cancelled: "confirmed",
};

export function customerStage(order: Order): CustomerOrderStage {
  const norm = String(order?.status || "").toLowerCase();
  return CUSTOMER_STAGE_BY_STATUS[norm] || "confirmed";
}

export function customerStageIndex(order: Order): number {
  return CUSTOMER_STAGES.indexOf(customerStage(order));
}

export function formatOrderDate(isoDate: string): string {
  if (!isoDate) return "Today";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "Today";
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "Today";
  }
}

export function formatOrderTime(isoDate: string): string {
  if (!isoDate) return "Just now";
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "Just now";
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Just now";
  }
}

export function timeOfStatus(order: Order, status: OrderLifecycleStatus): string {
  if (!order || !Array.isArray(order.events)) return "—";
  const event = order.events.find((item) => item.status === status);
  return event ? formatOrderTime(event.at) : "—";
}
