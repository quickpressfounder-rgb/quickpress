/**
 * Canonical QuickPress order contract.
 *
 * This is the ONE order model every application (customer, partner, rider,
 * admin) agrees on. Each app has its own view type tuned to its screens; those
 * are derived from this model by the mappers in `@backend/mock/mappers`, never
 * duplicated.
 *
 * When the real FastAPI backend lands, these are the response bodies the API
 * must return — nothing in the UI changes.
 */

/** The complete order lifecycle, in progression order. */
export type OrderLifecycleStatus =
  | "placed"
  | "pending_partner_acceptance"
  | "partner_accepted"
  | "pickup_rider_assigned"
  | "rider_assigned"
  | "rider_searching"
  | "pickup_rider_accepted"
  | "rider_accepted"
  | "pickup_otp_pending"
  | "picked_up"
  | "at_partner"
  | "processing"
  | "ironing"
  | "ready_for_delivery"
  | "ready"
  | "completed"
  | "delivery_rider_assigned"
  | "delivery_rider_accepted"
  | "dispatch_otp_pending"
  | "out_for_delivery"
  | "delivery_otp_pending"
  | "delivered"
  | "cancelled";

export const ORDER_LIFECYCLE: OrderLifecycleStatus[] = [
  "placed",
  "partner_accepted",
  "pickup_rider_assigned",
  "pickup_rider_accepted",
  "picked_up",
  "processing",
  "ready_for_delivery",
  "delivery_rider_assigned",
  "delivery_rider_accepted",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<string, string> = {
  placed: "Order placed",
  pending_partner_acceptance: "Order placed",
  partner_accepted: "Partner accepted",
  rider_searching: "Searching for pickup rider",
  pickup_rider_assigned: "Pickup rider assigned",
  rider_assigned: "Pickup rider assigned",
  pickup_rider_accepted: "Pickup rider accepted",
  rider_accepted: "Pickup rider accepted",
  pickup_otp_pending: "Pickup OTP verification",
  picked_up: "Picked up",
  at_partner: "Reached store",
  processing: "In cleaning",
  ironing: "Ironing & finishing",
  ready_for_delivery: "Ready for delivery",
  ready: "Ready for delivery",
  completed: "Ready for delivery",
  delivery_rider_assigned: "Delivery rider assigned",
  delivery_rider_accepted: "Delivery rider accepted",
  dispatch_otp_pending: "Dispatch OTP verification",
  out_for_delivery: "Out for delivery",
  delivery_otp_pending: "Delivery OTP verification",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function orderStageIndex(status: OrderLifecycleStatus): number {
  const index = ORDER_LIFECYCLE.indexOf(status);
  return index < 0 ? 0 : index;
}

export function isOrderAfter(
  status: OrderLifecycleStatus,
  reference: OrderLifecycleStatus,
): boolean {
  if (status === "cancelled") return false;
  return orderStageIndex(status) >= orderStageIndex(reference);
}

export type OrderParty = {
  id: string;
  name: string;
  phone: string;
};

export type OrderRiderParty = OrderParty & {
  vehicle: string;
  plate: string;
  rating: number;
  trips: string;
};

export type OrderPartnerParty = OrderParty & {
  image: string;
  city: string;
};

export type OrderLine = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type OrderAddress = {
  label: string;
  line: string;
  city: string;
  phone: string;
};

export type OrderTotals = {
  itemsTotal: number;
  pickup: number;
  delivery: number;
  handling: number;
  gst: number;
  discount: number;
  grandTotal: number;
};

export type OrderEvent = {
  id: string;
  status: OrderLifecycleStatus;
  label: string;
  /** ISO timestamp. */
  at: string;
  /** Which app/actor moved the order forward. */
  actor: "customer" | "partner" | "rider" | "admin" | "system";
};

/** The single shared order entity. */
export type Order = {
  id: string;
  code: string;
  status: OrderLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  customer: OrderParty;
  partner: OrderPartnerParty;
  rider: OrderRiderParty | null;
  serviceLabel: string;
  items: OrderLine[];
  totals: OrderTotals;
  address: OrderAddress;
  pickup: { date: string; slot: string; express: boolean };
  delivery: { date: string; slot: string };
  payment: { mode: "online" | "cod" | "wallet"; label: string; note: string; paid: boolean };
  /** OTPs the rider collects at pickup and at delivery. */
  otp: { pickup: string; delivery: string };
  events: OrderEvent[];
  cancelledReason: string | null;
};

export type PlaceOrderPayload = {
  /** Optional: the backend resolves it from the bearer token when omitted. */
  customerId?: string;
  partnerId?: string;
  items: OrderLine[];
  addressId?: string;
  address?: OrderAddress;
  pickup: { date: string; slot: string; express: boolean };
  delivery?: { date: string; slot: string };
  payment: { mode: "online" | "cod" | "wallet"; label: string; note?: string };
  totals?: Partial<OrderTotals>;
  serviceLabel?: string;
  isExpress?: boolean;
  expressFee?: number;
};