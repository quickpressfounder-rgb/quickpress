/**
 * Partner orders data layer — talks to the shared QuickPress backend.
 *
 *   GET  /api/partner/orders
 *   GET  /api/partner/orders/{id}
 *   POST /api/partner/orders/{id}/accept | reject | start-processing | complete
 *
 * Enhanced with 120 FPS Offline-First caching and background mutation queue.
 */

import type { PartnerOrder, PartnerOrderStatus } from "@/shared/types/partner";
import { apiGetJson, apiPostJson } from "../core/transport";
import { offlineSyncQueue } from "@/lib/offline-sync-queue";

const PARTNER_ORDERS_CACHE_KEY = "qp_cached_partner_orders_v1";

function readCachedOrders(): PartnerOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PARTNER_ORDERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCachedOrders(orders: PartnerOrder[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PARTNER_ORDERS_CACHE_KEY, JSON.stringify(orders));
  } catch {}
}

/** GET /api/partner/orders with offline-first fallback */
export async function fetchPartnerOrders(): Promise<PartnerOrder[]> {
  try {
    const response = await apiGetJson<PartnerOrder[] | { items: PartnerOrder[]; total?: number }>("/api/partner/orders");
    const items = Array.isArray(response)
      ? response
      : (response && Array.isArray((response as any).items) ? (response as any).items : []);
    
    if (items.length > 0) {
      writeCachedOrders(items);
    }
    return items;
  } catch {
    // Offline / poor network fallback
    return readCachedOrders();
  }
}

/** GET /api/partner/orders/{id} */
export async function fetchPartnerOrder(orderId: string): Promise<PartnerOrder> {
  try {
    const order = await apiGetJson<PartnerOrder>(`/api/partner/orders/${orderId}`);
    return order;
  } catch (err) {
    const cached = readCachedOrders().find((o) => o.id === orderId || (o as any).orderId === orderId);
    if (cached) return cached;
    throw err;
  }
}

/** POST /api/partner/orders/{id}/accept with optimistic update and offline queue fallback */
export async function acceptPartnerOrder(orderId: string): Promise<PartnerOrder> {
  try {
    const res = await apiPostJson<PartnerOrder>(`/api/partner/orders/${orderId}/accept`);
    return res;
  } catch (err: any) {
    offlineSyncQueue.enqueue(`/api/partner/orders/${orderId}/accept`, undefined, `Accept order ${orderId}`);
    const cached = readCachedOrders().find((o) => o.id === orderId || (o as any).orderId === orderId);
    if (cached) {
      return { ...cached, status: "accepted" as any };
    }
    return { id: orderId, status: "accepted" } as any;
  }
}

/** POST /api/partner/orders/{id}/reject */
export async function rejectPartnerOrder(orderId: string, reason = ""): Promise<PartnerOrder> {
  try {
    return await apiPostJson<PartnerOrder>(`/api/partner/orders/${orderId}/reject`, { reason });
  } catch (err: any) {
    offlineSyncQueue.enqueue(`/api/partner/orders/${orderId}/reject`, { reason }, `Reject order ${orderId}`);
    return { id: orderId, status: "cancelled" } as any;
  }
}

/** POST /api/partner/orders/{id}/start-processing */
export async function startProcessingOrder(orderId: string): Promise<PartnerOrder> {
  try {
    return await apiPostJson<PartnerOrder>(`/api/partner/orders/${orderId}/start-processing`);
  } catch (err: any) {
    offlineSyncQueue.enqueue(`/api/partner/orders/${orderId}/start-processing`, undefined, `Process order ${orderId}`);
    return { id: orderId, status: "processing" } as any;
  }
}

/** POST /api/partner/orders/{id}/ready — laundry is processed, ready for delivery. */
export async function markReadyOrder(orderId: string): Promise<PartnerOrder> {
  try {
    return await apiPostJson<PartnerOrder>(`/api/partner/orders/${orderId}/ready`);
  } catch (err: any) {
    offlineSyncQueue.enqueue(`/api/partner/orders/${orderId}/ready`, undefined, `Ready order ${orderId}`);
    return { id: orderId, status: "ready" } as any;
  }
}

/** POST /api/partner/orders/{id}/complete — alias for ready. */
export async function completePartnerOrder(orderId: string): Promise<PartnerOrder> {
  return markReadyOrder(orderId);
}

/**
 * Status-driven helper used by the existing partner order screens.
 * Each target status maps to one lifecycle endpoint.
 */
export async function updateOrderStatus(
  orderId: string,
  status: PartnerOrderStatus,
): Promise<{ ok: true; orderId: string; status: PartnerOrderStatus; order: PartnerOrder }> {
  let order: PartnerOrder;

  switch (status) {
    case "accepted":
      order = await acceptPartnerOrder(orderId);
      break;
    case "cancelled":
      order = await rejectPartnerOrder(orderId, "Rejected by store");
      break;
    case "processing":
      order = await startProcessingOrder(orderId);
      break;
    case "ready":
    case "delivered":
      order = await completePartnerOrder(orderId);
      break;
    default:
      order = await fetchPartnerOrder(orderId);
  }

  return { ok: true, orderId, status: order.status, order };
}

/** POST /api/partner/orders/{id}/verify-dispatch-otp — verify 4-digit OTP told by Captain and dispatch */
export async function verifyPartnerDispatchOtp(orderId: string, otp: string): Promise<PartnerOrder> {
  return apiPostJson<PartnerOrder>(`/api/partner/orders/${orderId}/verify-dispatch-otp`, { otp });
}

/** POST /api/partner/orders/{id}/verify-handover-otp — verify pickup handover OTP from rider */
export async function verifyPartnerHandoverOtp(orderId: string, otp: string): Promise<PartnerOrder> {
  return apiPostJson<PartnerOrder>(`/api/partner/orders/${orderId}/verify-handover-otp`, { otp });
}

export interface PartnerReviewPayload {
  riderRating: number;
  riderFeedback?: string;
  riderTags?: string[];
  customerRating?: number;
  customerFeedback?: string;
  customerTags?: string[];
}

/** POST /api/partner/orders/{id}/review — partner rates captain & customer */
export async function submitPartnerOrderReview(
  orderId: string,
  payload: PartnerReviewPayload
): Promise<{ ok: boolean; message: string; review: any }> {
  return apiPostJson<{ ok: boolean; message: string; review: any }>(
    `/api/partner/orders/${encodeURIComponent(orderId)}/review`,
    payload
  );
}

/** GET /api/partner/orders/{id}/review — check if partner has reviewed */
export async function fetchPartnerOrderReview(orderId: string): Promise<any> {
  return apiGetJson<any>(`/api/partner/orders/${encodeURIComponent(orderId)}/review`);
}
