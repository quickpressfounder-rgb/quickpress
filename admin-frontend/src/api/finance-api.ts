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
    enabled?: boolean;
    pricingMode?: "exclusive" | "inclusive" | string;
    laundryGstRate: number;
    platformGstRate: number;
    deliveryGstRate: number;
    cgstRate?: number;
    sgstRate?: number;
    igstRate?: number;
    defaultState: string;
    quickpressGstin: string;
    tcsRate: number;
    tdsRate: number;
    categoryTaxOverrides?: Array<{ id: string; category: string; gstRate: number; active: boolean }>;
  };
  commission: {
    partnerCommissionType?: "tier" | "percentage" | "fixed" | string;
    partnerCommissionPercent?: number;
    fixedAmountPerOrder?: number;
    riderCommissionRate?: number;
    platformCommissionRate?: number;
    standardRate: number;
    silverRate: number;
    goldRate: number;
    silverThreshold: number;
    goldThreshold: number;
    captainCommissionRate: number;
    categoryOverrides?: Array<{ id: string; category: string; rate: number; active: boolean }>;
    cityAreaOverrides?: Array<{ id: string; city: string; area: string; rate: number; active: boolean }>;
  };
  delivery: {
    baseFee: number;
    baseDistanceKm: number;
    perKmRate: number;
    minimumDeliveryFee?: number;
    expressDeliveryFee?: number;
    slabs: Array<{ minKm: number; maxKm: number; fee: number }>;
    freeDeliveryThreshold: number;
    subsidyFundingSource: "QUICKPRESS_FUNDED" | "PARTNER_FUNDED" | "SHARED_FUNDED";
    nightSurge: number;
    rainSurge: number;
    cityAreaPricing?: Array<{ id: string; city: string; area: string; baseFee: number; perKmRate: number; minFee: number; active: boolean }>;
  };
  cancellation: Record<
    string,
    { cancellationFee: number; refundPct: number; allowCancel: boolean; notes?: string }
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
    partnerSharePercent?: number;
    platformSharePercent?: number;
    adjustmentRules?: string;
  };
  partnerSettlement?: {
    cycle: string;
    payoutDay: string;
    minSettlementPayout: number;
    minWithdrawal: number;
    autoApproveMaxAmount: number;
    partnerSharePercent: number;
    platformSharePercent: number;
    tcsRate: number;
    tdsRate: number;
    adjustmentRules: string;
  };
  servicePricing?: Array<{
    id: string;
    serviceName: string;
    category: string;
    city: string;
    area: string;
    basePrice: number;
    unit: string;
    additionalUnitPrice: number;
    minQuantity: number;
    expressPrice: number;
    effectiveFrom: string;
    effectiveUntil: string;
    status: string;
    active: boolean;
  }>;
  fees?: {
    platformFee: number;
    platformFeeType: string;
    handlingFee: number;
    handlingFeeType: string;
    convenienceFee: number;
    convenienceFeeType: string;
    packagingFee: number;
    packagingFeeType: string;
    serviceCharge: number;
    serviceChargeType: string;
    otherFees?: Array<{ id: string; name: string; type: string; value: number; active: boolean }>;
  };
  discount?: {
    minOrderValue: number;
    firstOrderDiscountPercent: number;
    firstOrderMaxDiscount: number;
    coupons: Array<{
      id: string;
      code: string;
      title: string;
      type: "flat" | "percent";
      discount: number;
      maxDiscount: number;
      minOrderValue: number;
      firstOrderOnly: boolean;
      citySpecific?: string;
      usageLimit: number;
      usedCount?: number;
      startDate: string;
      endDate: string;
      active: boolean;
    }>;
  };
  riderPayout?: {
    basePay: number;
    baseDistanceKm: number;
    perKmRate: number;
    pickupEarning?: number;
    deliveryEarning?: number;
    peakIncentive?: number;
    expressBonus: number;
    nightSurge: number;
    rainSurge: number;
    captainCommissionRate: number;
    orderCountIncentives?: Array<{ trips: number; reward: number }>;
    dailyTargets?: Array<{ targetTrips: number; bonus: number }>;
    bonusRules?: string;
  };
  expressPickup?: {
    enabled: boolean;
    fee: number;
    partnerSharePercent: number;
    riderSharePercent: number;
  };
  versioning?: {
    version: string;
    status: string;
    effectiveFrom: string;
    effectiveUntil: string;
    scheduledAt?: string | null;
    versionHistory?: any[];
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

// ============================================================================
// PHASE 1: GENERAL LEDGER & PERIOD GOVERNANCE
// ============================================================================
export interface GeneralLedgerLine {
  id: string;
  batch_id: string;
  line_number: number;
  posting_date: string;
  transaction_date: string;
  accounting_period: string;
  account_code: number;
  account_name: string;
  account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  debit: number;
  credit: number;
  currency: string;
  reference_type: string;
  reference_id: string;
  party_type?: string;
  party_id?: string;
  description: string;
  is_reversal: boolean;
  reversal_of_id?: string;
  metadata?: Record<string, any>;
  created_by: string;
}

export interface ChartOfAccountItem {
  account_code: number;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  net_balance: number;
}

export async function fetchGeneralLedger(params?: Record<string, any>): Promise<{
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  entries: GeneralLedgerLine[];
}> {
  return await apiGetJson("/api/finance-ledger", params);
}

export async function fetchChartOfAccounts(period?: string): Promise<{
  ok: boolean;
  accountingPeriod: string;
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  variance: number;
  accounts: ChartOfAccountItem[];
}> {
  return await apiGetJson("/api/finance-ledger/chart-of-accounts", { accounting_period: period });
}

export async function fetchAccountingPeriods(): Promise<{
  ok: boolean;
  periods: Array<{
    period: string;
    status: "OPEN" | "LOCKED";
    locked_by?: string;
    locked_at?: string;
    closing_notes?: string;
  }>;
}> {
  return await apiGetJson("/api/finance-ledger/periods");
}

export async function lockAccountingPeriod(period: string, notes: string): Promise<any> {
  return await apiPostJson(`/api/finance-ledger/periods/${period}/lock`, { notes });
}

export async function unlockAccountingPeriod(period: string, reason: string): Promise<any> {
  return await apiPostJson(`/api/finance-ledger/periods/${period}/unlock`, { reason });
}

export async function postLedgerReversal(entryId: string, reason: string): Promise<any> {
  return await apiPostJson("/api/finance-ledger/reversal", { entryId, reason });
}

export async function fetchEntityLedgerTrail(referenceType: string, referenceId: string): Promise<{
  ok: boolean;
  referenceType: string;
  referenceId: string;
  count: number;
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  entries: GeneralLedgerLine[];
}> {
  return await apiGetJson(`/api/finance-ledger/reference/${referenceType}/${referenceId}`);
}

// ============================================================================
// PHASE 2: COD MANAGEMENT & RIDER RISK
// ============================================================================
export interface CodCollectionRecord {
  id: string;
  order_id: string;
  customer_id: string;
  rider_id: string;
  partner_id: string;
  order_amount: number;
  collected_amount: number;
  deposited_amount: number;
  pending_amount: number;
  collected_at: string;
  deposit_deadline: string;
  status: "CASH_COLLECTED" | "DEPOSITED" | "PARTIALLY_DEPOSITED" | "VERIFIED" | "DISPUTED" | "OVERDUE";
  deposit_id?: string;
  bank_utr?: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
}

export async function fetchCodMetrics(): Promise<{
  ok: boolean;
  metrics: {
    total_cod_orders: number;
    total_cod_collected: number;
    total_deposited_verified: number;
    total_outstanding: number;
    total_overdue: number;
    overdue_orders_count: number;
    overdue_riders_count: number;
    pending_verifications_count: number;
  };
  activeRules: {
    max_holding_limit: number;
    overdue_hours: number;
  };
}> {
  return await apiGetJson("/api/cod/metrics");
}

export async function fetchCodCollections(params?: Record<string, any>): Promise<{
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  collections: CodCollectionRecord[];
}> {
  return await apiGetJson("/api/cod/collections", params);
}

export async function verifyCodDeposit(depositId: string, notes?: string): Promise<any> {
  return await apiPostJson(`/api/cod/deposit/${depositId}/verify`, { notes });
}

export async function fetchOverdueRiders(): Promise<{
  ok: boolean;
  count: number;
  overdueRiders: Array<{
    rider_id: string;
    rider_name: string;
    rider_phone: string;
    city: string;
    total_overdue_amount: number;
    orders_count: number;
    oldest_collection_time: string;
    order_ids: string[];
  }>;
}> {
  return await apiGetJson("/api/cod/overdue-riders");
}

export async function updateCodRules(payload: { maxHoldingLimit: number; overdueHours: number }): Promise<any> {
  return await apiPostJson("/api/cod/rules", payload);
}

// ============================================================================
// PHASE 3: GLOBAL FINANCE SEARCH & RECONCILIATION & ANOMALIES
// ============================================================================
export interface GlobalSearchResult {
  query: string;
  detectedType: string;
  totalMatches: number;
  users: any[];
  orders: any[];
  payments: any[];
  invoices: any[];
  settlements: any[];
  ledgerEntries: any[];
  codRecords: any[];
}

export async function performGlobalFinanceSearch(q: string): Promise<GlobalSearchResult> {
  return await apiGetJson("/api/finance-search", { q });
}

export async function fetchCustomerFinancialProfile(customerId: string): Promise<any> {
  return await apiGetJson(`/api/finance-search/customer/${customerId}/profile`);
}

export async function fetchReconciliationSummary(): Promise<{
  ok: boolean;
  summary: {
    total_runs: number;
    matched_count: number;
    mismatch_count: number;
    resolved_count: number;
    total_unresolved_variance: number;
    match_rate_percentage: number;
  };
}> {
  return await apiGetJson("/api/reconciliation/summary");
}

export async function fetchReconciliationRuns(params?: Record<string, any>): Promise<{
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  runs: Array<{
    id: string;
    recon_type: string;
    external_source: string;
    external_reference: string;
    internal_reference: string;
    external_amount: number;
    internal_amount: number;
    variance: number;
    status: string;
    discrepancy_reason: string;
    created_at: string;
  }>;
}> {
  return await apiGetJson("/api/reconciliation/runs", params);
}

export async function resolveReconciliationRun(runId: string, notes: string): Promise<any> {
  return await apiPostJson(`/api/reconciliation/runs/${runId}/resolve`, { notes });
}

export interface AnomalyItem {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: "CRITICAL_RED" | "WARNING_AMBER" | "INFO_BLUE";
  count: number;
  total_impact_amount: number;
  action_url: string;
  action_label: string;
}

export async function fetchAttentionRequiredAnomalies(): Promise<{
  ok: boolean;
  threatLevel: "GREEN_HEALTHY" | "AMBER_WARNING" | "RED_CRITICAL";
  totalActiveExceptions: number;
  criticalCount: number;
  warningCount: number;
  anomalies: AnomalyItem[];
  generatedAt: string;
}> {
  return await apiGetJson("/api/finance-anomalies/attention-required");
}

// ============================================================================
// PHASE 4: UNIT ECONOMICS & DYNAMIC MEMBERSHIP FINANCE
// ============================================================================
export async function fetchUnitEconomicsSummary(): Promise<{
  ok: boolean;
  margins: {
    total_orders: number;
    total_gross_gmv: number;
    total_net_gmv: number;
    total_cm1: number;
    blended_cm1_pct: number;
    total_cm2: number;
    blended_cm2_pct: number;
    profitable_orders_count: number;
    profitable_orders_pct: number;
  };
}> {
  return await apiGetJson("/api/unit-economics/summary");
}

export async function fetchCityProfitabilityHeatmap(): Promise<{
  ok: boolean;
  cityHeatmap: Array<{
    city: string;
    orders_count: number;
    gross_gmv: number;
    net_gmv: number;
    total_cm1: number;
    cm1_margin_pct: number;
    total_cm2: number;
    cm2_margin_pct: number;
    is_cash_flow_positive: boolean;
  }>;
}> {
  return await apiGetJson("/api/unit-economics/profitability/cities");
}

export async function fetchServiceProfitabilityComparison(): Promise<{
  ok: boolean;
  serviceComparison: Array<{
    service_category: string;
    orders_count: number;
    gross_gmv: number;
    net_gmv: number;
    total_cm1: number;
    cm1_margin_pct: number;
    total_cm2: number;
    cm2_margin_pct: number;
  }>;
}> {
  return await apiGetJson("/api/unit-economics/profitability/services");
}

export async function fetchMembershipMetrics(): Promise<{
  ok: boolean;
  metrics: {
    total_active_members: number;
    mrr: number;
    arr: number;
    churn_rate_percentage: number;
    total_upfront_cash_collected: number;
    total_subscriptions_count: number;
  };
}> {
  return await apiGetJson("/api/membership-finance/metrics");
}

export async function fetchMembershipPlans(): Promise<{
  ok: boolean;
  plans: any[];
}> {
  return await apiGetJson("/api/membership-finance/plans");
}

export async function createMembershipPlan(payload: any): Promise<any> {
  return await apiPostJson("/api/membership-finance/plans", payload);
}

export async function updateMembershipPlan(planId: string, payload: any): Promise<any> {
  return await apiPutJson(`/api/membership-finance/plans/${planId}`, payload);
}

export async function toggleMembershipPlan(planId: string, isActive: boolean): Promise<any> {
  return await apiPostJson(`/api/membership-finance/plans/${planId}/toggle`, { isActive });
}

export async function fetchActiveMembers(params?: Record<string, any>): Promise<{
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  members: Array<{
    subscription_id: string;
    user_id: string;
    customer_name: string;
    customer_phone: string;
    plan_id: string;
    billing_cycle: string;
    amount_paid: number;
    started_at: string;
    expires_at: string;
    days_remaining: number;
    is_expiring_soon: boolean;
    orders_count: number;
    total_spend: number;
  }>;
}> {
  return await apiGetJson("/api/membership-finance/members", params);
}

// --------------------------------------------------------------------------
// BUSINESS EXPENSES & REAL NET PROFIT REPORTING
// --------------------------------------------------------------------------

export interface BusinessExpense {
  id: string;
  title: string;
  category: "MARKETING" | "SERVERS_TECH" | "PACKAGING" | "STAFF_OFFICE" | "LOGISTICS" | "MISC" | string;
  amount: number;
  date: string;
  paymentMode: "UPI" | "BANK_TRANSFER" | "CARD" | "CASH" | string;
  status: "PAID" | "PENDING_APPROVAL" | string;
  notes?: string;
  addedBy?: string;
  createdAt?: string;
}

export interface NetProfitReport {
  ok: boolean;
  totalOrders: number;
  currency: string;
  inflows: {
    grossGmv: number;
    label: string;
  };
  outflows: {
    partnerPayouts: number;
    riderPayouts: number;
    taxesAndGst: number;
    gatewayCharges: number;
    totalDirectCosts: number;
    operatingExpenses: number;
    totalOutflows: number;
  };
  profitability: {
    grossProfit: number;
    grossMarginPct: number;
    realNetProfit: number;
    netProfitMarginPct: number;
    isProfitable: boolean;
  };
  opexBreakdown: Record<string, number>;
  waterfallPer100: {
    customerInflow: number;
    partnerShare: number;
    riderShare: number;
    taxesAndGst: number;
    gatewayFees: number;
    operatingExpenses: number;
    netProfitInHand: number;
  };
}

export async function fetchExpenses(category?: string): Promise<{
  ok: boolean;
  expenses: BusinessExpense[];
  totalCount: number;
  totalOpex: number;
  byCategory: Record<string, number>;
}> {
  return await apiGetJson("/api/finance-engine/expenses", category && category !== "ALL" ? { category } : undefined);
}

export async function createExpense(payload: Partial<BusinessExpense>): Promise<{
  ok: boolean;
  expense: BusinessExpense;
}> {
  return await apiPostJson("/api/finance-engine/expenses", payload);
}

export async function deleteExpense(expenseId: string): Promise<{
  ok: boolean;
  deletedId: string;
}> {
  return await apiPostJson(`/api/finance-engine/expenses/${expenseId}/delete`, {});
}

export async function fetchNetProfitReport(): Promise<NetProfitReport> {
  return await apiGetJson("/api/finance-engine/net-profit-report");
}

