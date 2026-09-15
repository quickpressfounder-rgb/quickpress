/**
 * Finance Engine API client for QuickPress Admin Console.
 */

import { apiGetJson, apiPostJson, apiPutJson } from "@/api/core/transport";

export interface FinancialRules {
  pricing: {
    platformFee: number;
    handlingFee: number;
    minimumOrderValue: number;
    expressMultiplier: number;
    surgeMultiplier: number;
  };
  gst: {
    laundryGstRate: number;
    platformGstRate: number;
    deliveryGstRate: number;
    defaultState: string;
    quickpressGstin: string;
    tcsRate: number;
    tdsRate: number;
  };
  commission: {
    standardRate: number;
    silverRate: number;
    goldRate: number;
    silverThreshold: number;
    goldThreshold: number;
    captainCommissionRate: number;
  };
  delivery: {
    baseFee: number;
    baseDistanceKm: number;
    perKmRate: number;
    slabs: Array<{ minKm: number; maxKm: number; fee: number }>;
    freeDeliveryThreshold: number;
    subsidyFundingSource: "QUICKPRESS_FUNDED" | "PARTNER_FUNDED" | "SHARED_FUNDED";
    nightSurge: number;
    rainSurge: number;
  };
  cancellation: Record<
    string,
    { cancellationFee: number; refundPct: number; allowCancel: boolean }
  >;
  incentives: {
    candyCrushLevels?: Array<{
      level: number;
      title: string;
      target: number;
      reward: number;
      badge?: string;
      flavor?: string;
      description?: string;
      color?: string;
      gradient?: string;
    }>;
    riderDaily: Array<{ trips: number; reward: number }>;
    riderWeeklyStreak: { trips: number; reward: number };
    partnerVolume: Array<{ orders: number; reward: number }>;
  };
  lateFee: {
    gracePeriodMinutes: number;
    slabs: Array<{ minDelayMin: number; maxDelayMin: number; fee: number }>;
    classification: string;
  };
  penalties: Record<string, number>;
  settlement: {
    cycle: string;
    payoutDay: string;
    autoApproveMaxAmount: number;
    requirePanTcs: boolean;
    tcsRate: number;
    minSettlementPayout: number;
  };
  expressPickup?: {
    enabled: boolean;
    fee: number;
    partnerSharePercent: number;
    riderSharePercent: number;
  };
}

export interface FinancialSummaryMetrics {
  totalOrders: number;
  grossMerchandiseValue: number;
  customerCollections: number;
  quickpressCommission: number;
  totalGstCollected: number;
  deliverySubsidies: number;
  partnerPayables: number;
  riderPayables: number;
  refundsDisbursed: number;
  quickpressNetRevenue: number;
  currency: string;
}

export interface FinancialLedgerEntry {
  _id: string;
  transactionId: string;
  orderId: string;
  userId?: string;
  partnerId?: string;
  riderId?: string;
  transactionType: string;
  credit: number;
  debit: number;
  amount: number;
  reference: string;
  timestamp: string;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface OrderFinancialObject {
  _id: string;
  orderId: string;
  customerId: string;
  partnerId?: string;
  riderId?: string;
  partnerTier?: string;
  commissionRate?: number;
  laundryServiceAmount: number;
  actualDeliveryFee: number;
  customerDeliveryFee: number;
  deliverySubsidy: number;
  deliverySubsidySource?: string;
  platformFee: number;
  handlingFee: number;
  surgeFee: number;
  couponDiscount: number;
  grossOrderValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  customerPayable: number;
  quickpressCommission: number;
  tcsAmount: number;
  partnerSettlement: number;
  deliverySettlement: number;
  quickpressRevenue: number;
  quickpressExpense: number;
  quickpressNetRevenue: number;
  paymentStatus: string;
  refundStatus: string;
  settlementStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementBatch {
  _id: string;
  cycleId: string;
  startDate: string;
  endDate: string;
  totalOrders: number;
  partnerCount: number;
  riderCount: number;
  totalPartnerPayable: number;
  totalRiderPayable: number;
  status: "GENERATED" | "APPROVED" | "PAID";
  partners: Array<any>;
  riders: Array<any>;
  generatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  payoutReference?: string;
  paidBy?: string;
  paidAt?: string;
}

export interface FinancialAuditLog {
  _id: string;
  adminId: string;
  action: string;
  oldRules: any;
  newRules: any;
  reason: string;
  effectiveFrom: string;
  effectiveUntil: string;
  timestamp: string;
}

// --------------------------------------------------------------------------
// API Functions
// --------------------------------------------------------------------------

export async function fetchFinancialRules(): Promise<FinancialRules> {
  const res = await apiGetJson<{ ok: boolean; rules: FinancialRules }>("/api/finance-engine/rules");
  return res.rules;
}

export async function updateFinancialRules(
  rules: Partial<FinancialRules>,
  reason: string = "Admin Control Update",
  effectiveFrom?: string,
  effectiveUntil?: string,
): Promise<{ ok: boolean; rules: FinancialRules; auditLogId: string }> {
  return await apiPutJson<{ ok: boolean; rules: FinancialRules; auditLogId: string }>(
    "/api/finance-engine/rules",
    { rules, reason, effectiveFrom, effectiveUntil },
  );
}

export async function fetchFinancialSummary(): Promise<FinancialSummaryMetrics> {
  const res = await apiGetJson<{ ok: boolean; metrics: FinancialSummaryMetrics }>(
    "/api/finance-engine/reports/summary",
  );
  return res.metrics;
}

export async function fetchOrderFinancials(
  orderId: string,
): Promise<{ financials: OrderFinancialObject; ledger: FinancialLedgerEntry[]; totalLedgerEntries: number }> {
  return await apiGetJson<{
    financials: OrderFinancialObject;
    ledger: FinancialLedgerEntry[];
    totalLedgerEntries: number;
  }>(`/api/finance-engine/orders/${encodeURIComponent(orderId)}/financials`);
}

export async function fetchSettlementBatches(): Promise<SettlementBatch[]> {
  const res = await apiGetJson<{ ok: boolean; batches: SettlementBatch[] }>(
    "/api/finance-engine/settlements",
  );
  return res.batches || [];
}

export async function generateSettlementBatch(
  startDate?: string,
  endDate?: string,
): Promise<SettlementBatch> {
  const res = await apiPostJson<{ ok: boolean; batch: SettlementBatch }>(
    "/api/finance-engine/settlements/generate",
    { startDate, endDate },
  );
  return res.batch;
}

export async function approveSettlementBatch(batchId: string): Promise<{ ok: boolean }> {
  return await apiPostJson<{ ok: boolean }>(
    `/api/finance-engine/settlements/${encodeURIComponent(batchId)}/approve`,
    {},
  );
}

export async function payoutSettlementBatch(
  batchId: string,
  payoutReference?: string,
): Promise<{ ok: boolean; payoutReference: string }> {
  return await apiPostJson<{ ok: boolean; payoutReference: string }>(
    `/api/finance-engine/settlements/${encodeURIComponent(batchId)}/payout`,
    { payoutReference },
  );
}

export async function fetchAuditLogs(limit: number = 50): Promise<FinancialAuditLog[]> {
  const res = await apiGetJson<{ ok: boolean; logs: FinancialAuditLog[] }>(
    `/api/finance-engine/audit-logs?limit=${limit}`,
  );
  return res.logs || [];
}

export async function applyPenalty(payload: {
  partnerId?: string;
  riderId?: string;
  orderId?: string;
  penaltyType: string;
  amount?: number;
  reason?: string;
}): Promise<{ ok: boolean; penalty: any }> {
  return await apiPostJson<{ ok: boolean; penalty: any }>(
    "/api/finance-engine/penalties/apply",
    payload,
  );
}

export async function processRefund(payload: {
  orderId: string;
  amount: number;
  reason: string;
  refundType?: string;
}): Promise<{ ok: boolean; refundAmount: number; totalRefunded: number; refundStatus: string }> {
  return await apiPostJson<{
    ok: boolean;
    refundAmount: number;
    totalRefunded: number;
    refundStatus: string;
  }>("/api/finance-engine/refunds/create", payload);
}

export interface LoyaltyCampaignConfig {
  campaignId: string;
  title: string;
  description: string;
  isActive: boolean;
  totalBudgetRupees: number;
  targetOrdersCount: number;
  pointsPerRupee: number;
  minPointsPerCard: number;
  maxPointsPerCard: number;
  spentBudgetRupees: number;
  totalCardsIssued: number;
  totalCardsScratched: number;
  totalPointsAwarded: number;
  totalPointsRedeemed: number;
  remainingBudgetRupees: number;
  avgPointsPerCard: number;
}

export async function fetchLoyaltyCampaignConfig(): Promise<LoyaltyCampaignConfig> {
  const res = await apiGetJson<{ ok: boolean; config: LoyaltyCampaignConfig }>(
    "/api/loyalty/admin/config",
  );
  return res.config;
}

export async function updateLoyaltyCampaignConfig(
  payload: Partial<LoyaltyCampaignConfig>,
): Promise<LoyaltyCampaignConfig> {
  const res = await apiPutJson<{ ok: boolean; config: LoyaltyCampaignConfig }>(
    "/api/loyalty/admin/config",
    payload,
  );
  return res.config;
}
