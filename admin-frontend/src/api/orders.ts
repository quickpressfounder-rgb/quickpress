/**
 * GET/POST /api/admin/orders/* — live orders from the shared QuickPress backend.
 *
 * Row shapes are unchanged; only the data source moved from local fixtures to
 * the shared API layer, so every admin order screen renders the same lifecycle
 * the customer, partner and rider apps are driving.
 */
import type { Order } from "@/shared/types";
import { ORDER_STATUS_LABEL } from "@/shared/types/order";
import { apiGetJson, apiPostJson } from "@/api/core/transport";
import { apiBaseUrl } from "./customer/api/config";
import { readToken } from "./core/session-store";

export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "Pickup Assigned"
  | "Picked up"
  | "Processing"
  | "Ready for delivery"
  | "Delivery Assigned"
  | "Out for delivery"
  | "Delivered"
  | "Cancelled";

export type AdminOrder = {
  id: string;
  customer: string;
  phone: string;
  service: string;
  city: string;
  partner: string;
  rider: string;
  status: OrderStatus;
  payment: "Paid" | "COD" | "Refunded";
  placedAt: string;
  total: string;
  cancellationReason?: string;
  cancelledBy?: string;
  slaBreached?: boolean | string;
  autoCancelled?: boolean;
  refundStatus?: string;
  refundAmount?: number;
  refundDate?: string;
  isReassigned?: boolean;
  reassignment?: any;
  custody?: string;
};

type AdminOrderRow = {
  id: string;
  code: string;
  customer: string;
  partner: string;
  rider: string;
  status: keyof typeof ORDER_STATUS_LABEL;
  statusLabel: string;
  amount: number;
  placedOn: string;
  city: string;
  paymentMode: "online" | "cod";
  cancellationReason?: string;
  cancelledBy?: string;
  slaBreached?: boolean | string;
  autoCancelled?: boolean;
  refundStatus?: string;
  refundAmount?: number;
  refundDate?: string;
  isReassigned?: boolean;
  reassignment?: any;
  custody?: string;
};

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

/** Lifecycle status → the label this console displays. */
const STATUS_LABEL: Record<string, OrderStatus> = {
  placed: "Pending",
  pending_partner_acceptance: "Pending",
  partner_accepted: "Accepted",
  rider_searching: "Accepted",
  pickup_rider_assigned: "Pickup Assigned",
  rider_assigned: "Pickup Assigned",
  pickup_rider_accepted: "Pickup Assigned",
  rider_accepted: "Pickup Assigned",
  pickup_otp_pending: "Pickup Assigned",
  picked_up: "Picked up",
  at_partner: "Picked up",
  processing: "Processing",
  washing: "Processing",
  dry_cleaning: "Processing",
  ironing: "Processing",
  ready_for_delivery: "Ready for delivery",
  ready: "Ready for delivery",
  completed: "Ready for delivery",
  delivery_rider_assigned: "Delivery Assigned",
  delivery_rider_accepted: "Delivery Assigned",
  dispatch_otp_pending: "Delivery Assigned",
  out_for_delivery: "Out for delivery",
  delivery_otp_pending: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function toAdminOrder(row: AdminOrderRow): AdminOrder {
  return {
    id: row.code,
    customer: row.customer,
    phone: "",
    service: row.statusLabel,
    city: row.city,
    partner: row.partner,
    rider: row.rider,
    status: STATUS_LABEL[row.status] ?? "Pending",
    payment: row.status === "cancelled" ? "Refunded" : row.paymentMode === "cod" ? "COD" : "Paid",
    placedAt: row.placedOn,
    total: money(row.amount),
    cancellationReason: row.cancellationReason,
    cancelledBy: row.cancelledBy,
    slaBreached: row.slaBreached,
    autoCancelled: row.autoCancelled,
    refundStatus: row.refundStatus,
    refundAmount: row.refundAmount,
    refundDate: row.refundDate,
    isReassigned: row.isReassigned,
    reassignment: row.reassignment,
    custody: row.custody,
  };
}

/** GET /api/admin/orders */
export async function fetchOrders(): Promise<AdminOrder[]> {
  const rows = await apiGetJson<AdminOrderRow[]>("/api/admin/orders");
  return rows.map(toAdminOrder);
}

export type OrderDetail = AdminOrder & {
  items: { name: string; qty: number; price: string }[];
  timeline: { label: string; at: string; done: boolean }[];
  address: string;
  slot: string;
  reassignment?: {
    requested?: boolean;
    requestedAt?: string;
    originalRiderId?: string;
    reason?: string;
    remarks?: string;
    custody?: string;
    dispatchOtp?: string;
    handoverOtp?: string;
    pickupLegPayout?: number;
    deliveryLegPayout?: number;
    handoverCompleted?: boolean;
    assignedTransferRiderId?: string;
    storeLocation?: {
      name?: string;
      address?: string;
      lat?: number;
      lng?: number;
    };
  } | null;
  rides?: any[];
  settlement?: any;
  custody?: string;
  rider1?: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    plate?: string;
    payout?: number;
  } | null;
  rider2?: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    plate?: string;
    payout?: number;
  } | null;
  dispatchOtp?: string;
  pickupOtp?: string;
  deliveryOtp?: string;
  isReassigned?: boolean;
};

export const STATUS_RANK: Record<string, number> = {
  placed: 1,
  pending: 1,
  Pending: 1,
  pending_partner_acceptance: 1,
  new: 1,
  order_created: 1,
  partner_accepted: 2,
  accepted: 2,
  Accepted: 2,
  rider_searching: 2,
  pickup_rider_assigned: 2,
  rider_assigned: 2,
  "Pickup Assigned": 2,
  pickup_rider_accepted: 2,
  rider_accepted: 2,
  pickup_otp_pending: 2,
  picked_up: 3,
  "Picked up": 3,
  at_partner: 3,
  dropped_at_partner: 3,
  processing: 4,
  Processing: 4,
  in_wash: 4,
  "In wash": 4,
  washing: 4,
  dry_cleaning: 4,
  ironing: 4,
  ready_for_delivery: 5,
  "Ready for delivery": 5,
  completed: 5,
  ready: 5,
  delivery_rider_assigned: 5,
  "Delivery Assigned": 5,
  delivery_rider_accepted: 5,
  dispatch_otp_pending: 5,
  out_for_delivery: 5,
  "Out for delivery": 5,
  delivery_otp_pending: 5,
  delivered: 6,
  Delivered: 6,
  cancelled: 99,
  Cancelled: 99,
};

/** GET /api/admin/orders/{id} */
export async function fetchOrder(id: string): Promise<OrderDetail> {
  const order = await apiGetJson<any>(`/api/admin/orders/${id}`);
  const time = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  const norm = (s?: string) => String(s || "").toLowerCase().trim();
  const currentRawStatus = norm(order.status);
  const currentRank = STATUS_RANK[order.status] ?? STATUS_RANK[currentRawStatus] ?? 1;
  const isCancelled = currentRawStatus === "cancelled" || Boolean(order.cancelledAt);

  const createdAt = order.createdAt || order.placedAt || order.placedOn;

  const STAGES_CONFIG: {
    label: string;
    stageRank: number;
    statuses: string[];
    fallbackTime?: string;
  }[] = [
    {
      label: "Order placed",
      stageRank: 1,
      statuses: ["placed", "pending", "pending_partner_acceptance", "new", "order_created"],
      fallbackTime: createdAt,
    },
    {
      label: "Partner accepted",
      stageRank: 2,
      statuses: ["partner_accepted", "accepted", "store_accepted"],
    },
    {
      label: "Rider assigned",
      stageRank: 2,
      statuses: [
        "pickup_rider_assigned",
        "rider_assigned",
        "rider_searching",
        "pickup_rider_accepted",
        "rider_accepted",
        "pickup_otp_pending",
      ],
    },
    {
      label: "Picked up",
      stageRank: 3,
      statuses: ["picked_up", "at_partner", "dropped_at_partner"],
    },
    {
      label: "In Processing",
      stageRank: 4,
      statuses: ["processing", "washing", "ironing", "dry_cleaning", "in_wash"],
    },
    {
      label: "Processing completed",
      stageRank: 5,
      statuses: ["ready_for_delivery", "ready", "completed"],
    },
    {
      label: "Out for delivery",
      stageRank: 5,
      statuses: ["out_for_delivery", "delivery_rider_assigned", "delivery_rider_accepted", "delivery_otp_pending"],
    },
    {
      label: "Delivered",
      stageRank: 6,
      statuses: ["delivered"],
    },
  ];

  const events: any[] = Array.isArray(order.events) ? order.events : [];
  const backendTimeline: any[] = Array.isArray(order.timeline) ? order.timeline : [];

  let lastKnownTime = createdAt ? time(createdAt) : "—";

  const timeline = STAGES_CONFIG.map((stage, idx) => {
    // 1. Check matching event in events audit log
    const matchedEvent = events.find((item: any) =>
      stage.statuses.includes(norm(item?.status))
    );

    // 2. Check matching stage in backend timeline
    const bStep = backendTimeline.find(
      (s: any) =>
        stage.statuses.includes(norm(s?.id)) ||
        norm(s?.label) === norm(stage.label)
    );

    // 3. Stage 0 is ALWAYS done for an existing order
    const isFirstStage = idx === 0;

    // 4. Milestone done evaluation with forward progression
    let done = Boolean(matchedEvent) || Boolean(bStep?.done);
    if (!done && !isCancelled) {
      if (isFirstStage) {
        done = true;
      } else if (currentRank >= stage.stageRank) {
        done = true;
      }
    }

    // Special case: "Rider assigned" is done if rider details or ride exists
    if (stage.label === "Rider assigned" && (order.rider?.id || (order.rider && order.rider !== "Unassigned") || order.assignedRiderId)) {
      done = true;
    }

    // 5. Compute formatted time string
    let atStr = "—";
    if (matchedEvent?.at) {
      atStr = time(matchedEvent.at);
    } else if (bStep?.at || bStep?.time) {
      atStr = time(bStep.at || bStep.time);
    } else if (done) {
      if (isFirstStage && createdAt) {
        atStr = time(createdAt);
      } else {
        atStr = lastKnownTime !== "—" ? lastKnownTime : "—";
      }
    }

    if (atStr !== "—") {
      lastKnownTime = atStr;
    }

    return {
      label: stage.label,
      at: atStr,
      done,
    };
  });

  // If order is cancelled, append cancelled milestone
  if (isCancelled) {
    const cancelEvt = events.find((e: any) => norm(e?.status) === "cancelled");
    const cancelTime = cancelEvt?.at || order.cancelledAt || order.updatedAt;
    const reason =
      order.cancellationReason ||
      order.cancelledReason ||
      order.refundReason ||
      "Order Cancelled";
    timeline.push({
      label: `Cancelled (${reason})`,
      at: cancelTime ? time(cancelTime) : "—",
      done: true,
    });
  }

  const cancReason =
    order.cancellationReason ||
    order.cancelledReason ||
    order.refundReason ||
    order.meta?.reason ||
    "";

  return {
    ...toAdminOrder({
      id: order.id || order._id,
      code: order.code,
      customer: order.customer?.name || order.customerName || "Customer",
      partner: order.partner?.name || "QuickPress Partner",
      rider: order.rider?.name ?? "Unassigned",
      status: order.status,
      statusLabel: ORDER_STATUS_LABEL[order.status as keyof typeof ORDER_STATUS_LABEL] ?? order.status,
      amount: order.totals?.grandTotal || order.pricing?.total || 0,
      placedOn: new Date(order.createdAt || Date.now()).toLocaleDateString("en-CA"),
      city: order.partner?.city || order.address?.city || "Kasganj",
      paymentMode: order.payment?.mode || order.payment?.method || "online",
      cancellationReason: cancReason,
      cancelledBy: order.cancelledBy,
      slaBreached: order.slaBreached,
      autoCancelled: order.autoCancelled,
      refundStatus: order.payment?.refundStatus || order.paymentStatus,
      refundAmount: order.refundAmount,
      refundDate: order.refundDate,
      isReassigned: Boolean(order.reassignment || order.isReassigned),
      reassignment: order.reassignment,
      custody: order.custody,
    }),
    phone: order.customer?.phone || order.customerPhone || "",
    service: order.serviceLabel || "Laundry Service",
    address: `${order.address?.line || order.address?.street || ""}, ${order.address?.city || ""}`,
    slot: `${order.pickup?.date || "Today"} · ${order.pickup?.slot || order.slot || ""}`,
    cancellationReason: cancReason,
    cancelledBy: order.cancelledBy,
    slaBreached: order.slaBreached,
    autoCancelled: order.autoCancelled,
    refundStatus: order.payment?.refundStatus || order.paymentStatus,
    refundAmount: order.refundAmount,
    refundDate: order.refundDate,
    reassignment: order.reassignment || null,
    rides: order.rides || [],
    settlement: order.settlement || null,
    custody: order.custody || "customer",
    rider1: order.rider1 || null,
    rider2: order.rider2 || null,
    dispatchOtp:
      order.dispatchOtp ||
      (typeof order.otp?.dispatch === "object" ? order.otp?.dispatch?.code : order.otp?.dispatch) ||
      order.reassignment?.dispatchOtp ||
      "",
    pickupOtp:
      order.pickupOtp ||
      (typeof order.otp?.pickup === "object" ? order.otp?.pickup?.code : order.otp?.pickup) ||
      "",
    deliveryOtp:
      order.deliveryOtp ||
      (typeof order.otp?.delivery === "object" ? order.otp?.delivery?.code : order.otp?.delivery) ||
      "",
    isReassigned: Boolean(order.reassignment || order.isReassigned),
    items: (order.items || []).map((item: any) => ({
      name: item.name,
      qty: item.qty || item.quantity || 1,
      price: money((item.qty || item.quantity || 1) * (item.price || 0)),
    })),
    timeline,
  };
}

/** No assign-partner endpoint exists on the backend; orders are auto-matched to a partner. */
export async function assignPartner(): Promise<never> {
  throw new Error("Assigning a partner manually is not supported by the backend yet.");
}
/** POST /api/admin/orders/{id}/assign-rider */
export async function assignRider(orderId: string, riderId: string) {
  await apiPostJson(`/api/admin/orders/${orderId}/assign-rider`, { riderId });
  return { ok: true as const, orderId, riderId };
}
/** POST /api/admin/orders/{id}/status or /api/admin/orders/{id}/cancel */
export async function changeOrderStatus(orderId: string, status: string, reason?: string) {
  if (status === "Cancelled" || status === "cancelled") {
    await apiPostJson(`/api/admin/orders/${orderId}/cancel`, { reason: reason || "Cancelled by admin" });
  } else {
    await apiPostJson(`/api/admin/orders/${orderId}/status`, { status, reason: reason || `Updated to ${status} by admin` });
  }
  return { ok: true as const, orderId, status };
}

/** Fetch full GST Tax Invoice JSON for an order */
export async function fetchOrderInvoice(orderId: string): Promise<any> {
  try {
    return await apiGetJson<any>(`/api/admin/orders/${orderId}/invoice`);
  } catch {
    return await apiGetJson<any>(`/api/orders/${orderId}/invoice`);
  }
}

/** Get pre-authorized direct URL to stream 3-page Tax Invoice PDF */
export function getOrderInvoicePdfUrl(orderId: string): string {
  const token = readToken();
  const base = apiBaseUrl();
  const cleanId = encodeURIComponent(orderId);
  return `${base}/api/orders/${cleanId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

/** Directly trigger a native client-side PDF file download via Blob for Admin */
export async function downloadOrderInvoicePdfBlob(orderId: string, customFileName?: string): Promise<string> {
  const token = readToken();
  const base = apiBaseUrl();
  const cleanId = encodeURIComponent(orderId);
  let url = `${base}/api/admin/orders/${cleanId}/invoice/pdf`;
  let response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    url = `${base}/api/orders/${cleanId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
  if (!response.ok) {
    throw new Error(`Failed to download Tax Invoice PDF (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const fileName = customFileName || `QuickPress-Tax-Invoice-${orderId.replace(/\//g, "-")}.pdf`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  return fileName;
}

/** View Tax Invoice PDF in a new window/tab */
export async function viewOrderInvoicePdf(orderId: string): Promise<void> {
  const token = readToken();
  const base = apiBaseUrl();
  const cleanId = encodeURIComponent(orderId);
  try {
    const url = `${base}/api/admin/orders/${cleanId}/invoice/pdf`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener");
      return;
    }
  } catch {
    // fallback
  }
  const fallbackUrl = `${base}/api/orders/${cleanId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  window.open(fallbackUrl, "_blank", "noopener");
}

/** Backward-compatible alias for downloadInvoice */
export async function downloadInvoice(orderId?: string, orderCode?: string): Promise<string> {
  if (!orderId) {
    throw new Error("Order ID is required to download invoice.");
  }
  return await downloadOrderInvoicePdfBlob(orderId, orderCode ? `QuickPress-Tax-Invoice-${orderCode}.pdf` : undefined);
}

/** No admin order-refund endpoint exists on the backend yet. */
export async function refundOrder(): Promise<never> {
  throw new Error("Refunding an order from here is not available yet.");
}