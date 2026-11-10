/**
 * Admin Delivery Kits API — Track Captain starter gear orders, payments & courier dispatch.
 */

import { apiGetJson, apiPatchJson } from "@/api/core/transport";

export interface DeliveryKitPricing {
  totalKitPrice: number;
  paymentType: "FULL_PAYMENT" | "PART_PAYMENT";
  amountPaid: number;
  remainingBalance: number;
  upfrontPaid: number;
  installmentWeeklyDeduction: number;
  installmentsRecovered: number;
  fullySettled: boolean;
}

export interface DeliveryKitPayment {
  gateway: string;
  status: "PAID" | "PARTIALLY_PAID" | "UNPAID";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt?: string;
  signatureVerified: boolean;
}

export interface DeliveryKitFulfillment {
  status: "PENDING_DISPATCH" | "DISPATCHED" | "DELIVERED";
  courierName?: string;
  trackingNumber?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  deliveredBy?: string;
  notes?: string;
}

export interface AdminDeliveryKitOrder {
  _id: string;
  id: string;
  riderPhone: string;
  riderName: string;
  riderId: string;
  city: string;
  kitId: string;
  kitName: string;
  tshirtSize: string;
  deliveryPreference: "home_delivery" | "hub_pickup";
  shippingAddress?: Record<string, any>;
  pricing: DeliveryKitPricing;
  payment: DeliveryKitPayment;
  fulfillment: DeliveryKitFulfillment;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryKitsStats {
  ok: boolean;
  totalOrders: number;
  pendingDispatch: number;
  dispatched: number;
  delivered: number;
  totalRevenueCollected: number;
  outstandingInstallments: number;
  currency: string;
}

export async function fetchDeliveryKitsStats(): Promise<DeliveryKitsStats> {
  return apiGetJson<DeliveryKitsStats>("/api/admin/delivery-kits/stats");
}

export async function fetchDeliveryKits(
  statusFilter?: string,
  search?: string,
  limit: number = 50
): Promise<{ ok: boolean; items: AdminDeliveryKitOrder[]; total: number }> {
  const params: Record<string, any> = { limit };
  if (statusFilter && statusFilter !== "ALL") {
    params.status = statusFilter;
  }
  if (search && search.trim()) {
    params.search = search.trim();
  }
  return apiGetJson<{ ok: boolean; items: AdminDeliveryKitOrder[]; total: number }>(
    "/api/admin/delivery-kits",
    { params }
  );
}

export async function dispatchDeliveryKit(
  kitOrderId: string,
  payload: {
    courierName: string;
    trackingNumber: string;
    notes?: string;
  }
): Promise<{ ok: boolean; message: string; kitOrder: AdminDeliveryKitOrder }> {
  return apiPatchJson<{ ok: boolean; message: string; kitOrder: AdminDeliveryKitOrder }>(
    `/api/admin/delivery-kits/${encodeURIComponent(kitOrderId)}/dispatch`,
    payload
  );
}

export async function markDeliveryKitDelivered(
  kitOrderId: string,
  payload: {
    deliveredBy?: string;
    notes?: string;
  }
): Promise<{ ok: boolean; message: string; kitOrder: AdminDeliveryKitOrder }> {
  return apiPatchJson<{ ok: boolean; message: string; kitOrder: AdminDeliveryKitOrder }>(
    `/api/admin/delivery-kits/${encodeURIComponent(kitOrderId)}/deliver`,
    payload
  );
}
