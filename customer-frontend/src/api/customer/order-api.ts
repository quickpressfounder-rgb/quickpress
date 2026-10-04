/**
 * QuickPress Order Success & Live Tracking — customer data layer.
 *
 * Every function is one backend endpoint, called through the shared transport:
 *
 *   GET  /api/orders/{id}
 *   GET  /api/orders/{id}/tracking
 *   POST /api/orders/{id}/cancel
 *
 * The view models below are unchanged, so no screen needed edits.
 */

import store1 from "@/shared/assets/store-1.jpg";
import type { Order, OrderLifecycleStatus } from "@/shared/types";

import {
  CUSTOMER_STAGES,
  customerStageIndex,
  formatOrderDate,
  formatOrderTime,
  timeOfStatus,
} from "@/shared/utils/order-mappers";
import { apiGetJson, apiPostJson } from "../core/transport";

export const ORDER_API_ENDPOINTS = {
  order: "/api/orders/{id}",
  tracking: "/api/orders/{id}/tracking",
  cancel: "/api/orders/{id}/cancel",
} as const;

export type OrderStage =
  | "confirmed"
  | "rider-assigned"
  | "picked-up"
  | "in-cleaning"
  | "quality-check"
  | "out-for-delivery"
  | "delivered";

export type OrderItemLine = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type OrderSummary = {
  id: string;
  placedAt: string;
  storeName: string;
  storeImage: string;
  storePhone: string;
  address: { label: string; line: string; city: string; phone: string };
  pickup: { date: string; slot: string; express: boolean };
  delivery: { date: string; slot: string };
  payment: { label: string; note: string; paid: boolean };
  items: OrderItemLine[];
  totals: {
    itemsTotal: number;
    pickup: number;
    delivery: number;
    handling: number;
    gst: number;
    discount: number;
    grandTotal: number;
  };
};

export type TrackingStep = {
  id: OrderTimelineStage | OrderStage | string;
  label: string;
  description: string;
  time: string;
};

export type Rider = {
  id?: string;
  name: string;
  vehicle: string;
  plate: string;
  rating: number;
  trips: string;
  phone: string;
  avatar?: string;
  location?: { latitude: number; longitude: number } | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type TrackingData = {
  orderId: string;
  stageIndex: number;
  etaLabel: string;
  etaMinutes: number;
  steps: TrackingStep[];
  rider: Rider;
  storeName: string;
  storeImage: string;
  address: string;
  liveNote: string;
};

const STEP_COPY: Record<
  OrderStage,
  { label: string; description: string; pending: string }
> = {
  confirmed: {
    label: "Order confirmed",
    description: "Your laundry partner accepted your order",
    pending: "Awaiting store confirmation",
  },
  "rider-assigned": {
    label: "Rider assigned",
    description: "A QuickPress rider is on the way for pickup",
    pending: "Assigning a rider",
  },
  "picked-up": {
    label: "Clothes picked up",
    description: "Items counted and tagged at your door",
    pending: "Pickup pending",
  },
  "in-cleaning": {
    label: "In cleaning",
    description: "Wash, dry clean and steam press in progress",
    pending: "Cleaning not started",
  },
  "quality-check": {
    label: "Quality check",
    description: "Fabric inspection and premium packaging",
    pending: "Pending quality check",
  },
  "out-for-delivery": {
    label: "Out for delivery",
    description: "Rider heading back to your address",
    pending: "Delivery not started",
  },
  delivered: {
    label: "Delivered",
    description: "Fresh, folded and delivered to your door",
    pending: "Expected soon",
  },
};

const STAGE_STATUS: Record<OrderStage, Parameters<typeof timeOfStatus>[1]> = {
  confirmed: "partner_accepted",
  "rider-assigned": "rider_assigned",
  "picked-up": "picked_up",
  "in-cleaning": "processing",
  "quality-check": "completed",
  "out-for-delivery": "out_for_delivery",
  delivered: "delivered",
};

const ETA_COPY: Record<number, { label: string; minutes: number; note: string }> = {
  0: { label: "Store confirming in", minutes: 5, note: "Order placed, waiting for store acceptance." },
  1: { label: "Finding nearby rider", minutes: 8, note: "Store accepted. Finding nearby pickup rider." },
  2: { label: "Pickup rider assigned", minutes: 12, note: "Pickup rider assigned to collect your laundry." },
  3: { label: "Rider arriving for pickup", minutes: 7, note: "Rider is heading to your address." },
  4: { label: "Pickup OTP verification", minutes: 3, note: "Share your Pickup OTP with the rider." },
  5: { label: "Reaching store", minutes: 15, note: "Clothes collected, heading to the partner store." },
  6: { label: "Cleaning finishes in", minutes: 120, note: "Specialized cleaning and fabric care in progress." },
  7: { label: "Ready for delivery", minutes: 30, note: "Clothes packed, quality checked and ready for dispatch." },
  8: { label: "Finding delivery rider", minutes: 10, note: "Assigning nearby delivery rider." },
  9: { label: "Dispatch in progress", minutes: 10, note: "Delivery rider collecting packed order from store." },
  10: { label: "Delivery arriving in", minutes: 20, note: "Order is out for delivery to your doorstep." },
  11: { label: "Delivery OTP verification", minutes: 2, note: "Share your Delivery OTP with the rider." },
  12: { label: "Delivered", minutes: 0, note: "Delivered. Thanks for choosing QuickPress!" },
};

function toSummary(order: Order): OrderSummary {
  return {
    id: order.id,
    placedAt: `${formatOrderDate(order.createdAt)}, ${formatOrderTime(order.createdAt)}`,
    storeName: order.partner.name,
    storeImage: order.partner.image ?? store1,
    storePhone: order.partner.phone,
    address: order.address,
    pickup: order.pickup,
    delivery: order.delivery,
    payment: {
      label: order.payment.label,
      note: order.payment.note,
      paid: order.payment.paid,
    },
    items: order.items,
    totals: order.totals,
  };
}

export function toTracking(order: Order): TrackingData {
  const stageIndex = TIMELINE_INDEX_BY_STATUS[order?.status] ?? 0;
  const eta = ETA_COPY[stageIndex] ?? ETA_COPY[0]!;
  const partnerName = order?.partner?.name || (order as any)?.storeName || "QuickPress Partner";
  const partnerImage =
    order?.partner?.image && order.partner.image !== "store-1" && !order.partner.image.includes("store-1")
      ? order.partner.image
      : store1;
  const addressLine = order?.address ? `${order.address.line || ""}, ${order.address.city || ""}` : "Doorstep Delivery";

  return {
    orderId: String(order?.code || order?.id || ""),
    stageIndex,
    etaLabel: eta.label,
    etaMinutes: eta.minutes,
    storeName: partnerName,
    storeImage: partnerImage,
    address: addressLine,
    liveNote: order?.status === "cancelled" ? "This order was cancelled." : eta.note,
    rider: {
      id: order?.rider?.id,
      name: order?.rider?.name ?? "Assigning rider",
      vehicle: order?.rider?.vehicle ?? (order?.rider as any)?.vehicleType ?? "QuickPress Fleet",
      plate: order?.rider?.plate ?? (order?.rider as any)?.vehicleNumber ?? "—",
      rating: Number(order?.rider?.rating || 0),
      trips: String(order?.rider?.trips || "—"),
      phone: String(order?.rider?.phone || ""),
      avatar: (order?.rider as any)?.avatar || (order?.rider as any)?.photo || (order?.rider as any)?.image || "",
      location: (order?.rider as any)?.location ?? ((order?.rider as any)?.latitude && (order?.rider as any)?.longitude ? { latitude: (order?.rider as any).latitude, longitude: (order?.rider as any).longitude } : null),
    },
    steps: ORDER_TIMELINE.map((stage, index) => {
      const copy = TIMELINE_COPY[stage] || { label: stage, description: "", pending: "" };
      const time = timeOfStatus(order, copy.status);
      return {
        id: stage,
        label: copy.label,
        description: index <= stageIndex ? copy.description : copy.pending,
        time: time === "—" ? copy.pending : time,
      };
    }),
  };
}

/** GET /api/orders/{id} */
export async function fetchOrder(orderId: string): Promise<OrderSummary> {
  return toSummary(await apiGetJson<Order>(`/api/orders/${orderId}`));
}

/** GET /api/orders/{id}/tracking */
export async function fetchTracking(orderId: string): Promise<TrackingData> {
  return toTracking(await apiGetJson<Order>(`/api/orders/${orderId}/tracking`));
}

/** GET /api/orders — the signed-in customer's orders, newest first. */
export async function fetchMyOrders(): Promise<OrderSummary[]> {
  const orders = await apiGetJson<Order[]>("/api/orders");
  return orders.map(toSummary);
}

/** POST /api/orders/{id}/cancel */
export async function cancelOrder(orderId: string, reason = ""): Promise<{ ok: true }> {
  await apiPostJson<Order>(`/api/orders/${orderId}/cancel`, { reason });
  return { ok: true };
}

/* ====================================================================== *
 * Sprint 2.5 — Order Tracking & Order History
 *
 *   GET  /api/orders                     active + past orders
 *   GET  /api/orders/{id}                full order detail
 *   POST /api/orders/{id}/cancel         cancel before pickup
 *
 * Everything below is additive: the Sprint 2.4 exports above are untouched so
 * Order Success keeps rendering exactly as before.
 * ====================================================================== */

import { ORDER_STATUS_LABEL } from "@/shared/types/order";

import { readScopedCache, readStaleScopedCache, writeScopedCache } from "./api/cache";
import { formatOrderDate as fmtDate, formatOrderTime as fmtTime } from "@/shared/utils/order-mappers";

export const ORDER_TRACKING_ENDPOINTS = {
  orders: "/api/orders",
  order: "/api/orders/{id}",
  cancel: "/api/orders/{id}/cancel",
} as const;

/** The 13 canonical customer facing tracking stages, in progression order. */
export type OrderTimelineStage =
  | "placed"
  | "partner_accepted"
  | "pickup_rider_assigned"
  | "pickup_rider_accepted"
  | "pickup_otp"
  | "picked_up"
  | "processing"
  | "ready"
  | "delivery_rider_assigned"
  | "delivery_rider_accepted"
  | "out_for_delivery"
  | "delivery_otp"
  | "delivered";

export const ORDER_TIMELINE: OrderTimelineStage[] = [
  "placed",
  "partner_accepted",
  "pickup_rider_assigned",
  "pickup_rider_accepted",
  "pickup_otp",
  "picked_up",
  "processing",
  "ready",
  "delivery_rider_assigned",
  "delivery_rider_accepted",
  "out_for_delivery",
  "delivery_otp",
  "delivered",
];

const TIMELINE_COPY: Record<
  OrderTimelineStage,
  { label: string; description: string; pending: string; status: OrderLifecycleStatus }
> = {
  placed: {
    label: "Order Placed",
    description: "Order placed, waiting for store acceptance",
    pending: "Awaiting confirmation",
    status: "placed",
  },
  partner_accepted: {
    label: "Partner Accepted",
    description: "Your laundry partner accepted the order",
    pending: "Not accepted yet",
    status: "partner_accepted",
  },
  pickup_rider_assigned: {
    label: "Pickup Rider Assigned",
    description: "Pickup rider assigned for collection",
    pending: "Assigning pickup rider",
    status: "pickup_rider_assigned",
  },
  pickup_rider_accepted: {
    label: "Pickup Rider Accepted",
    description: "Pickup rider is on the way to collect laundry",
    pending: "Rider on the way",
    status: "pickup_rider_accepted",
  },
  pickup_otp: {
    label: "Pickup OTP",
    description: "Share 4-digit Pickup OTP with the rider",
    pending: "Pending pickup OTP",
    status: "pickup_otp_pending",
  },
  picked_up: {
    label: "Picked Up",
    description: "Items collected and received at store",
    pending: "Pending pickup",
    status: "picked_up",
  },
  processing: {
    label: "Processing",
    description: "Washing and specialized fabric cleaning in progress",
    pending: "Cleaning not started",
    status: "processing",
  },
  ready: {
    label: "Ready for Delivery",
    description: "Quality checked, packed and ready for delivery",
    pending: "Quality check & packing",
    status: "ready_for_delivery",
  },
  delivery_rider_assigned: {
    label: "Delivery Rider Assigned",
    description: "Delivery rider assigned to bring your clothes",
    pending: "Assigning delivery rider",
    status: "delivery_rider_assigned",
  },
  delivery_rider_accepted: {
    label: "Delivery Rider Accepted",
    description: "Rider collecting packed clothes from store",
    pending: "Handover in progress",
    status: "delivery_rider_accepted",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    description: "Rider is heading to your doorstep",
    pending: "Delivery pending",
    status: "out_for_delivery",
  },
  delivery_otp: {
    label: "Delivery OTP",
    description: "Share 4-digit Delivery OTP to receive clothes",
    pending: "Pending delivery OTP",
    status: "delivery_otp_pending",
  },
  delivered: {
    label: "Delivered",
    description: "Fresh, folded and delivered to your doorstep",
    pending: "Delivery pending",
    status: "delivered",
  },
};

const TIMELINE_INDEX_BY_STATUS: Record<string, number> = {
  placed: 0,
  pending_partner_acceptance: 0,
  partner_accepted: 1,
  rider_searching: 1,
  pickup_rider_assigned: 2,
  rider_assigned: 2,
  pickup_rider_accepted: 3,
  rider_accepted: 3,
  pickup_otp_pending: 4,
  picked_up: 5,
  at_partner: 5,
  "at-partner": 5,
  at_store: 5,
  "at-store": 5,
  store_received: 5,
  store_drop_confirmed: 5,
  processing: 6,
  processing_started: 6,
  ironing: 6,
  washing: 6,
  dry_cleaning: 6,
  ready_for_delivery: 7,
  ready: 7,
  completed: 7,
  delivery_rider_assigned: 8,
  delivery_rider_accepted: 9,
  dispatch_otp_pending: 9,
  out_for_delivery: 10,
  delivery_otp_pending: 11,
  delivered: 12,
  cancelled: 0,
};

/** Customers can only cancel until the rider has collected the laundry. */
export function isCancellable(status: OrderLifecycleStatus | string): boolean {
  return (
    status === "placed" ||
    status === "pending_partner_acceptance" ||
    status === "partner_accepted" ||
    status === "pickup_rider_assigned" ||
    status === "rider_assigned" ||
    status === "pickup_rider_accepted" ||
    status === "rider_accepted" ||
    status === "pickup_otp_pending"
  );
}

export const CANCEL_REASONS = [
  "Booked by mistake",
  "Pickup is taking too long",
  "I want to change the pickup slot",
  "I want to change items or service",
  "Found a better option",
  "Other",
] as const;

export type OrderTimelineStep = {
  id: OrderTimelineStage;
  label: string;
  description: string;
  time: string;
  state: "done" | "active" | "pending";
};

export type OrderRider = {
  assigned: boolean;
  id?: string;
  name: string;
  vehicle: string;
  plate: string;
  phone: string;
  avatar?: string;
  rating: number;
  trips: string;
  location?: { latitude: number; longitude: number } | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type OrderDetail = {
  id: string;
  /** Human readable order number, e.g. QP1041. */
  code: string;
  status: OrderLifecycleStatus;
  statusLabel: string;
  placedAt: string;
  partner: { id: string; name: string; image: string; phone: string; city: string };
  rider: OrderRider;
  pickup: { date: string; slot: string; express: boolean };
  delivery: { date: string; slot: string };
  deliveryEstimate: string;
  address: { label: string; line: string; city: string; phone: string };
  items: OrderItemLine[];
  totals: OrderSummary["totals"];
  payment: { label: string; note: string; paid: boolean; mode: string };
  timeline: OrderTimelineStep[];
  stageIndex: number;
  cancellable: boolean;
  cancelled: boolean;
  cancelledReason: string | null;
  /** Invoices arrive in a later sprint — the screen shows a placeholder. */
  invoice: { available: boolean; label: string };
  otp?: {
    pickup?: string;
    delivery?: string;
  };
};

export function toOrderDetail(order: Order): OrderDetail {
  const stageIndex = TIMELINE_INDEX_BY_STATUS[order?.status] ?? 0;
  const cancelled = order?.status === "cancelled";
  const rider = order?.rider ?? null;
  const partner = order?.partner ?? (order as any)?.store ?? {};
  const address = order?.address ?? { label: "Home", line: "Doorstep Delivery", city: "", phone: "" };
  const pickup = order?.pickup ?? { date: "Today", slot: "Morning", express: false };
  const delivery = order?.delivery ?? { date: "Tomorrow", slot: "Evening" };
  const payment = order?.payment ?? { label: "Payment", note: "", paid: false, mode: "cod" };
  const totals = order?.totals ?? { count: 0, itemsTotal: 0, pickup: 0, delivery: 0, handling: 0, gst: 0, discount: 0, couponDiscount: 0, grandTotal: 0 };

  return {
    id: String(order?.id || ""),
    code: String(order?.code || order?.id || ""),
    status: order?.status || "pending",
    statusLabel: ORDER_STATUS_LABEL[order?.status] ?? "Order placed",
    placedAt: order?.createdAt ? `${fmtDate(order.createdAt)}, ${fmtTime(order.createdAt)}` : "Recently",
    partner: {
      id: String(partner.id || (order as any)?.partnerId || ""),
      name: partner.name || "QuickPress Partner",
      image:
        partner.image && partner.image !== "store-1" && !partner.image.includes("store-1")
          ? partner.image
          : store1,
      phone: partner.phone ?? "",
      city: partner.city ?? "",
    },
    rider: {
      assigned: Boolean(rider && (rider.id || rider.name || (rider as any).phone)),
      id: String(rider?.id || ""),
      name: rider?.name ?? "Rider not assigned yet",
      vehicle: rider?.vehicle ?? (rider as any)?.vehicleType ?? "QuickPress Fleet",
      plate: rider?.plate ?? (rider as any)?.vehicleNumber ?? "—",
      phone: rider?.phone ?? "",
      avatar: (rider as any)?.avatar || (rider as any)?.photo || (rider as any)?.image || "",
      rating: Number(rider?.rating || 0),
      trips: rider?.trips ?? "—",
      location: (rider as any)?.location ?? ((rider as any)?.latitude && (rider as any)?.longitude ? { latitude: (rider as any).latitude, longitude: (rider as any).longitude } : null),
    },
    pickup,
    delivery,
    deliveryEstimate: delivery?.date ? `${delivery.date} · ${delivery.slot || ""}` : "Scheduled",
    address,
    items: Array.isArray(order?.items) ? order.items : [],
    totals,
    payment: {
      label: payment.label || "Payment",
      note: payment.note || "",
      paid: Boolean(payment.paid),
      mode: payment.mode || "cod",
    },
    stageIndex,
    cancelled,
    cancellable: isCancellable(order?.status),
    cancelledReason: order?.cancelledReason ?? null,
    invoice: { available: false, label: "Invoice will be available after delivery" },
    otp: (order as any)?.otp ?? (order as any)?.verificationOtp ?? undefined,
    timeline: ORDER_TIMELINE.map((stage, index) => {
      const copy = TIMELINE_COPY[stage];
      const time = timeOfStatus(order, copy.status);
      const state: OrderTimelineStep["state"] = cancelled
        ? index <= stageIndex
          ? "done"
          : "pending"
        : index < stageIndex
          ? "done"
          : index === stageIndex
            ? "active"
            : "pending";
      return {
        id: stage,
        label: copy.label,
        description: state === "pending" ? copy.pending : copy.description,
        time: time === "\u2014" ? (state === "pending" ? copy.pending : "Just now") : time,
        state,
      };
    }),
  };
}

/** GET /api/orders/{id} — full order detail, cache-first. */
export async function fetchOrderDetail(
  orderId: string,
  options: { signal?: AbortSignal | undefined; forceRefresh?: boolean } = {},
): Promise<OrderDetail> {
  const cleanId = String(orderId || "").trim();
  if (!cleanId) {
    throw new Error("Order ID is required");
  }

  if (!options.forceRefresh) {
    const cached = readScopedCache<OrderDetail>("order-detail", cleanId);
    if (cached) return cached;
  }
  try {
    const detail = toOrderDetail(
      await apiGetJson<Order>(`/api/orders/${encodeURIComponent(cleanId)}`, { signal: options.signal }),
    );
    writeScopedCache("order-detail", cleanId, detail);
    return detail;
  } catch (error) {
    // Strategy 2: If orderId had ord- or ord_ prefix, retry with stripped code; or if raw code, try with ord- prefix
    const stripped = cleanId.replace(/^ord[-_]/i, "");
    const candidates = [
      stripped !== cleanId ? stripped : "",
      stripped !== cleanId ? stripped.toUpperCase() : "",
      !cleanId.toLowerCase().startsWith("ord-") ? `ord-${cleanId}` : "",
      cleanId.toUpperCase(),
    ].filter((c): c is string => Boolean(c && c !== cleanId));

    for (const candidate of candidates) {
      try {
        const detail = toOrderDetail(
          await apiGetJson<Order>(`/api/orders/${encodeURIComponent(candidate)}`, { signal: options.signal }),
        );
        writeScopedCache("order-detail", cleanId, detail);
        writeScopedCache("order-detail", candidate, detail);
        return detail;
      } catch {
        /* try next candidate */
      }
    }

    // Strategy 3: Try tracking endpoint directly /api/orders/{id}/tracking
    try {
      const trackingOrder = await apiGetJson<Order>(`/api/orders/${encodeURIComponent(cleanId)}/tracking`, {
        signal: options.signal,
      });
      if (trackingOrder) {
        const detail = toOrderDetail(trackingOrder);
        writeScopedCache("order-detail", cleanId, detail);
        return detail;
      }
    } catch {
      /* proceed to recent orders scan */
    }

    // Strategy 4: Query /api/orders to find matching order by code, id, or suffix
    try {
      const allOrders = await apiGetJson<Order[]>("/api/orders", { signal: options.signal });
      if (Array.isArray(allOrders) && allOrders.length > 0) {
        const matched = allOrders.find(
          (o) =>
            o.id === cleanId ||
            o.code === cleanId ||
            o.id?.toLowerCase() === cleanId.toLowerCase() ||
            o.code?.toLowerCase() === cleanId.toLowerCase() ||
            (stripped && (o.id === stripped || o.code === stripped || o.code?.toUpperCase() === stripped.toUpperCase()))
        );
        if (matched) {
          const detail = toOrderDetail(matched);
          writeScopedCache("order-detail", cleanId, detail);
          return detail;
        }
      }
    } catch {
      /* ignore orders list failure */
    }

    const stale = readStaleScopedCache<OrderDetail>("order-detail", cleanId);
    if (stale) return stale;

    // Strategy 5: Check localStorage / sessionStorage for newly placed order
    try {
      const localStored = localStorage.getItem(`qp_order_${cleanId}`) || sessionStorage.getItem("qp_last_order");
      if (localStored) {
        const parsed = JSON.parse(localStored);
        if (parsed && (parsed.id === cleanId || parsed.code === cleanId || cleanId.includes(parsed.code || ""))) {
          const detail = toOrderDetail(parsed);
          writeScopedCache("order-detail", cleanId, detail);
          return detail;
        }
      }
    } catch {
      /* ignore */
    }

    throw error;
  }
}

/** GET /api/orders — active orders (anything not delivered or cancelled). */
export async function fetchActiveOrders(
  options: { signal?: AbortSignal | undefined } = {},
): Promise<OrderDetail[]> {
  const orders = await apiGetJson<Order[]>("/api/orders", { signal: options.signal });
  return orders
    .filter((order) => order.status !== "delivered" && order.status !== "cancelled")
    .map(toOrderDetail);
}

/** POST /api/orders/{id}/cancel — returns the refreshed order. */
export async function cancelOrderWithReason(
  orderId: string,
  reason: string,
): Promise<OrderDetail> {
  const order = await apiPostJson<Order>(`/api/orders/${orderId}/cancel`, { reason });
  const detail = toOrderDetail(order);
  writeScopedCache("order-detail", orderId, detail);
  return detail;
}
