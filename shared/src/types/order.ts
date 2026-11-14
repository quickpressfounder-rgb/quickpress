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
  | "placed" // customer placed the order, partner has it in "new"
  | "partner_accepted" // partner accepted the order
  | "rider_assigned" // a rider was assigned for pickup
  | "picked_up" // rider collected laundry from the customer
  | "at_partner" // laundry handed over at the partner facility
  | "processing" // partner is washing / cleaning
  | "completed" // partner marked laundry completed (ready for delivery)
  | "out_for_delivery" // rider is delivering back to the customer
  | "delivered" // customer received the order
  | "cancelled";

export const ORDER_LIFECYCLE: OrderLifecycleStatus[] = [
  "placed",
  "partner_accepted",
  "rider_assigned",
  "picked_up",
  "at_partner",
  "processing",
  "completed",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderLifecycleStatus, string> = {
  placed: "Order placed",
  partner_accepted: "Accepted by store",
  rider_assigned: "Rider assigned",
  picked_up: "Picked up",
  at_partner: "Reached store",
  processing: "In cleaning",
  completed: "Laundry completed",
  out_for_delivery: "Out for delivery",
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
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  heading?: number;
  speed?: number;
};

export type OrderPartnerParty = OrderParty & {
  image: string;
  city: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
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
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
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
  payment: { mode: "online" | "cod"; label: string; note: string; paid: boolean };
  /** OTPs the rider collects at pickup and at delivery. */
  otp: { pickup: string; delivery: string };
  events: OrderEvent[];
  cancelledReason: string | null;
  riderLocation?: {
    lat: number;
    lng: number;
    latitude?: number;
    longitude?: number;
    heading?: number;
    speed?: number;
    updatedAt?: string;
  } | null;
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
  payment: { mode: "online" | "cod"; label: string; note?: string };
  totals?: Partial<OrderTotals>;
  serviceLabel?: string;
};