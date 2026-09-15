/**
 * QuickPress Unified Finance Engine Client for Customer Frontend.
 *
 * Fetches real-time financial rules and dynamic checkout calculations directly
 * from the centralized Backend Finance Engine governed by Admin.
 */

import { apiGetJson, apiPostJson } from "../core/transport";

export interface DeliverySlab {
  minKm: number;
  maxKm: number;
  fee: number;
}

export interface FinancialRules {
  pricing: {
    platformFee: number;
    handlingFee: number;
    expressMultiplier: number;
    surgeMultiplier: number;
    minimumOrderValue: number;
    surgeReason?: string;
  };
  gst: {
    laundryGstRate: number;
    platformGstRate: number;
    deliveryGstRate: number;
    quickpressGstin: string;
    tcsRate: number;
    tdsRate: number;
  };
  delivery: {
    baseFee: number;
    baseDistanceKm: number;
    perKmRate: number;
    slabs: DeliverySlab[];
    freeDeliveryThreshold: number;
    subsidyFundingSource: string;
    nightSurge: number;
    rainSurge: number;
  };
  commission: {
    standardRate: number;
    silverRate: number;
    goldRate: number;
    silverThreshold: number;
    goldThreshold: number;
    captainCommissionRate: number;
  };
  expressPickup?: {
    enabled: boolean;
    fee: number;
    partnerSharePercent: number;
    riderSharePercent: number;
  };
}

export interface PricingCalculationResult {
  ok: boolean;
  itemsSubtotal: number;
  grossServiceValue: number;
  discount: number;
  couponDiscount: number;
  taxableLaundrySubtotal: number;
  deliveryFee: number;
  expressFee?: number;
  partnerExpressBonus?: number;
  riderExpressBonus?: number;
  customerDeliveryFee: number;
  deliverySubsidy: number;
  deliverySubsidySource: string | null;
  platformFee: number;
  handlingFee: number;
  laundryGst: number;
  serviceGst: number;
  totalGst: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  customerPayable: number;
  distanceKm: number;
  currency: string;
}

export const DEFAULT_FINANCIAL_RULES: FinancialRules = {
  pricing: {
    platformFee: 10.0,
    handlingFee: 15.0,
    expressMultiplier: 1.35,
    surgeMultiplier: 1.0,
    minimumOrderValue: 99.0,
    surgeReason: "Standard Operations",
  },
  gst: {
    laundryGstRate: 0.05,
    platformGstRate: 0.18,
    deliveryGstRate: 0.18,
    quickpressGstin: "09AAECQ1234F1Z5",
    tcsRate: 0.01,
    tdsRate: 0.01,
  },
  delivery: {
    baseFee: 30.0,
    baseDistanceKm: 2.0,
    perKmRate: 8.0,
    slabs: [
      { minKm: 0.0, maxKm: 2.0, fee: 30.0 },
      { minKm: 2.0, maxKm: 5.0, fee: 40.0 },
      { minKm: 5.0, maxKm: 8.0, fee: 60.0 },
      { minKm: 8.0, maxKm: 12.0, fee: 90.0 },
      { minKm: 12.0, maxKm: 999.0, fee: 120.0 },
    ],
    freeDeliveryThreshold: 499.0,
    subsidyFundingSource: "QUICKPRESS_FUNDED",
    nightSurge: 25.0,
    rainSurge: 20.0,
  },
  commission: {
    standardRate: 0.18,
    silverRate: 0.15,
    goldRate: 0.12,
    silverThreshold: 100,
    goldThreshold: 300,
    captainCommissionRate: 0.0,
  },
  expressPickup: {
    enabled: true,
    fee: 40.0,
    partnerSharePercent: 20.0,
    riderSharePercent: 80.0,
  },
};

/**
 * Fetches the active financial rules from the central backend finance engine.
 */
export async function fetchFinanceRules(): Promise<FinancialRules> {
  try {
    const res = await apiGetJson<{ ok: boolean; rules: FinancialRules }>("/api/finance-engine/rules");
    if (res && res.rules) {
      return res.rules;
    }
  } catch (error) {
    console.warn("Failed to fetch live finance rules, using fallback defaults:", error);
  }
  return DEFAULT_FINANCIAL_RULES;
}

/**
 * Computes exact unified checkout price with breakdown from backend.
 */
export async function computeCheckoutPrice(params: {
  items: Array<{ price: number; qty?: number; quantity?: number; name?: string }>;
  distanceKm?: number;
  couponCode?: string | null;
  couponDiscount?: number;
  isExpress?: boolean;
  isMember?: boolean;
  customerState?: string;
  partnerState?: string;
}): Promise<PricingCalculationResult> {
  try {
    const res = await apiPostJson<PricingCalculationResult>("/api/finance-engine/price/calculate", {
      items: params.items.map((it) => ({
        price: it.price,
        quantity: it.qty || it.quantity || 1,
        name: it.name,
      })),
      distanceKm: params.distanceKm ?? 2.5,
      couponCode: params.couponCode,
      couponDiscount: params.couponDiscount ?? 0,
      isExpress: params.isExpress ?? false,
      isMember: params.isMember ?? false,
      customerState: params.customerState ?? "Uttar Pradesh",
      partnerState: params.partnerState ?? "Uttar Pradesh",
    });
    if (res && res.ok) {
      return res;
    }
  } catch (error) {
    console.warn("Failed to compute backend price, computing locally:", error);
  }

  // Fallback client-side calculation using default rules
  const subtotal = params.items.reduce((acc, it) => acc + it.price * (it.qty || it.quantity || 1), 0);
  const isExpress = params.isExpress ?? false;
  const grossVal = Math.round(subtotal * (isExpress ? 1.35 : 1.0));
  const couponDisc = Math.min(params.couponDiscount || 0, grossVal);
  const taxable = Math.max(0, grossVal - couponDisc);

  const isFreeDelivery = (params.isMember || grossVal >= 499.0);
  const customerDelFee = isFreeDelivery ? 0 : 30.0;
  const platFee = 10.0;
  const handFee = subtotal > 0 ? 15.0 : 0.0;

  const laundryGst = Math.round(taxable * 0.05);
  const serviceGst = Math.round((customerDelFee + platFee + handFee) * 0.18);
  const totalGst = laundryGst + serviceGst;
  const payable = Math.max(0, taxable + customerDelFee + platFee + handFee + totalGst);

  return {
    ok: true,
    itemsSubtotal: subtotal,
    grossServiceValue: grossVal,
    discount: couponDisc,
    couponDiscount: couponDisc,
    taxableLaundrySubtotal: taxable,
    deliveryFee: 30.0,
    customerDeliveryFee: customerDelFee,
    deliverySubsidy: isFreeDelivery ? 30.0 : 0.0,
    deliverySubsidySource: isFreeDelivery ? "QUICKPRESS_FUNDED" : null,
    platformFee: platFee,
    handlingFee: handFee,
    laundryGst: laundryGst,
    serviceGst: serviceGst,
    totalGst: totalGst,
    cgst: Math.round(totalGst / 2),
    sgst: Math.round(totalGst / 2),
    igst: 0,
    grandTotal: payable,
    customerPayable: payable,
    distanceKm: params.distanceKm ?? 2.5,
    currency: "INR",
  };
}
