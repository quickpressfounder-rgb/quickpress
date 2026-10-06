// Delivery Captain Settlement & Bank Payout Data Layer — Real FastAPI + Supabase / MongoDB backend.
import { apiGetJson, apiPostJson } from "../core/transport";

export interface RiderSettlementCycleSummary {
  cycleId: string;
  period: string;
  payoutDate: string;
  status: "PAID" | "PROCESSING" | "ACCRUING";
  netPayout: number;
  tripCount: number;
  utr?: string | null;
}

export interface RiderSettlementBankDetails {
  accountHolder: string;
  bankName: string;
  accountNumberMasked: string;
  ifsc: string;
  upiId?: string;
  utr?: string | null;
  creditedAt?: string | null;
  transferMode: string;
  isVerified?: boolean;
}

export interface RiderSettlementOverview {
  currentCycle: {
    cycleId: string;
    period: string;
    payoutDate: string;
    estPayout: number;
    tripCount: number;
    status: string;
  };
  availableBalance: number;
  pastCycles: RiderSettlementCycleSummary[];
  bankDetails: RiderSettlementBankDetails;
  filterOptions: string[];
}

export interface RiderSettlementTripItem {
  tripId: string;
  orderId: string;
  orderCode: string;
  date: string;
  rideType: string;
  pickupAddress: string;
  dropAddress: string;
  distanceKm: number;
  fare: number;
  status: string;
}

export interface RiderCycleBreakdown {
  riderId: string;
  riderName: string;
  phone: string;
  cycle: {
    cycleId: string;
    title: string;
    period: string;
    startDate: string;
    endDate: string;
    payoutDate: string;
    status: string;
    isCurrent: boolean;
  };
  totalTrips: number;
  netPayout: number;
  breakdown: {
    tripFares: number;
    distancePay: number;
    surgePay: number;
    questBonuses: number;
    customerTips: number;
    platformFee: number;
    tdsDeduction: number;
    netBankCredit: number;
  };
  trips: RiderSettlementTripItem[];
  bankDetails: RiderSettlementBankDetails;
}

/** GET /api/rider/finance/settlements — Fetch captain ongoing weekly cycle and past bank settlements. */
export async function fetchRiderSettlementOverview(): Promise<RiderSettlementOverview> {
  return await apiGetJson<RiderSettlementOverview>("/api/rider/finance/settlements");
}

/** GET /api/rider/finance/settlements/:cycleId — Fetch trip-by-trip settlement breakdown with bank UTR. */
export async function fetchRiderCycleBreakdown(cycleId: string): Promise<RiderCycleBreakdown> {
  return await apiGetJson<RiderCycleBreakdown>(`/api/rider/finance/settlements/${encodeURIComponent(cycleId)}`);
}

/** POST /api/rider/finance/instant-payout — Instant settlement payout directly to UPI/Bank. */
export async function requestInstantRiderSettlementPayout(amount: number, upiId: string = "") {
  return await apiPostJson<{
    ok: boolean;
    settlementId: string;
    amount: number;
    utr: string;
    newBalance: number;
    settledAt: string;
    message: string;
  }>("/api/rider/finance/instant-payout", {
    amount: Math.abs(amount),
    upiId: upiId.trim(),
  });
}
