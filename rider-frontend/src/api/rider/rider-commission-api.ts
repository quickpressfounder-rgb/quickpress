/**
 * QuickPress Captain (Rider) Commission Engine API.
 * Guarantees transparent 0% platform commission on trip fares & tips.
 */

import { apiGetJson } from "../core/transport";

export type RiderCommissionSlip = {
  orderId: string;
  orderCode: string;
  riderId: string;
  riderName: string;
  pickupLegFare: number;
  deliveryLegFare: number;
  grossFare: number;
  platformCommissionDeduction: number;
  platformCommissionRate: string;
  tips: number;
  netCreditToWallet: number;
  guarantee: string;
  settlementStatus: "CREDITED" | "PENDING_DELIVERY";
  creditedAt: string;
};

export type RiderCommissionGuarantee = {
  policy: string;
  guaranteeActive: boolean;
  commissionRate: number;
  commissionRatePct: number;
  headline: string;
  description: string;
  benefits: string[];
  effectiveDate: string;
  guaranteedAmount?: number;
  targetTrips?: number;
};

export async function fetchRiderCommissionSlip(
  orderId: string
): Promise<RiderCommissionSlip> {
  return apiGetJson<RiderCommissionSlip>(
    `/api/rider/commission/orders/${orderId}`
  );
}

export async function fetchRiderCommissionGuarantee(): Promise<RiderCommissionGuarantee> {
  return apiGetJson<RiderCommissionGuarantee>(
    "/api/rider/commission/guarantee"
  );
}
