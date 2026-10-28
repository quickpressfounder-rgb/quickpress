/**
 * QuickPress Partner Finance, Payout & Settlement API Client.
 */

import { apiGetJson, apiPostJson } from "../core/transport";
import { readToken } from "../core/session-store";
import { apiBaseUrl } from "../core/config";

export type SettlementCycle = {
  cycleId: string;
  title?: string;
  period: string;
  startDate?: string;
  endDate?: string;
  payoutDate: string;
  status: "PAID" | "PROCESSING" | "ON HOLD" | "FAILED";
  isCurrent?: boolean;
};

export type FinanceDailyTrend = {
  day: string;
  date: string;
  label: string;
  orderCount: number;
  grossAmount: number;
  netPayout: number;
  isToday: boolean;
};

export type PassbookEntry = {
  id: string;
  type: "cycle_settlement" | "current_cycle";
  title: string;
  period: string;
  date: string;
  utr?: string | null;
  status: "SETTLED" | "PAID" | "ACCRUING" | "PROCESSING" | "ON HOLD" | string;
  orderCount: number;
  grossAmount: number;
  commissionAmount: number;
  tcsAmount: number;
  taxTotal: number;
  netCredit: number;
  bankName?: string;
  accountNumberMasked?: string;
  cycleId: string;
};

export type FinanceOverviewResponse = {
  currentCycle: {
    cycleId: string;
    period: string;
    payoutDate: string;
    estPayout: number;
    orderCount: number;
    status: string;
    grossAmount?: number;
    commissionAmount?: number;
    tcsAmount?: number;
  };
  pastCycles: {
    cycleId: string;
    period: string;
    payoutDate: string;
    status: string;
    netPayout: number;
    orderCount: number;
    startDate?: string;
    endDate?: string;
    grossAmount?: number;
    commissionAmount?: number;
    tcsAmount?: number;
    taxTotal?: number;
    utr?: string | null;
    bankName?: string;
    accountNumberMasked?: string;
    orders?: SettlementOrder[];
  }[];
  filterOptions: string[];
  months?: {
    cycleId: string;
    period: string;
    monthKey: string;
  }[];
  dailyTrend?: FinanceDailyTrend[];
  currentOrders?: SettlementOrder[];
  allSettledOrders?: SettlementOrder[];
  passbook?: PassbookEntry[];
  bankDetails?: {
    accountHolder: string;
    bankName: string;
    accountNumberMasked: string;
    ifsc: string;
    utr?: string | null;
    creditedAt?: string | null;
    transferMode: string;
  };
  commissionRatePct?: number;
  storeName?: string;
  gstin?: string;
};

export type SettlementOrder = {
  orderId: string;
  orderCode: string;
  date: string;
  itemsSummary: string;
  customerName: string;
  grossValue: number;
  commission: number;
  commissionRatePct?: number;
  gstOnCommission?: number;
  tcsGst?: number;
  netEarning: number;
  status: string;
  utr?: string | null;
  payoutDate?: string;
  isSettled?: boolean;
  cycleId?: string;
  cyclePeriod?: string;
  settlementStatus?: string;
};

export type SettlementExpense = {
  title: string;
  category: string;
  amount: number;
  date: string;
};

export type SettlementBreakdown = {
  partnerId: string;
  businessName: string;
  ownerName: string;
  city: string;
  cycle: SettlementCycle;
  totalOrders: number;
  estNetPayout: number;
  netOrderValueA: {
    total: number;
    itemSubtotal: number;
    totalGstCollected: number;
    restaurantDiscountPromos: number;
    restaurantDiscountFlat: number;
  };
  additionsB: {
    total: number;
    tds194h: number;
    tds194c: number;
    targetIncentiveBonus: number;
    qualityRatingBonus: number;
  };
  orderLevelDeductionsC: {
    total: number;
    platformCommission: number;
    commissionRatePct: number;
    damagePenalty: number;
    cancellationFee: number;
  };
  taxDeductionsD: {
    total: number;
    gstOnServiceFees18: number;
    tds194o: number;
    tcsGst: number;
  };
  investmentsInGrowthE: {
    total: number;
    onlineOrderingAds: number;
  };
  suppliesSpendF: {
    total: number;
    packagingAndTags: number;
  };
  orders: SettlementOrder[];
  expenses: SettlementExpense[];
  bankDetails: {
    accountHolder: string;
    bankName: string;
    accountNumberMasked: string;
    ifsc: string;
    utr?: string | null;
    creditedAt?: string | null;
    transferMode: string;
  };
};

export type TaxInvoice = {
  invoiceNumber: string;
  orderNumber?: string;
  period: string;
  date: string;
  type: string;
  amount: number;
  gstAmount: number;
  status: string;
  downloadUrl?: string;
};

// Multi-tier client-side cache for instantaneous (<10ms) rendering
let _cachedOverview: FinanceOverviewResponse | null = null;
let _cachedInvoices: { invoices: TaxInvoice[]; orderInvoices?: TaxInvoice[] } | null = null;
const _cycleBreakdownsCache = new Map<string, SettlementBreakdown>();

export function getCachedFinanceOverview(): FinanceOverviewResponse | null {
  if (_cachedOverview) return _cachedOverview;
  try {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("qp_finance_overview_cache") : null;
    if (raw) {
      _cachedOverview = JSON.parse(raw);
      return _cachedOverview;
    }
  } catch {
    // ignore
  }
  return null;
}

export function getCachedFinanceInvoices(): { invoices: TaxInvoice[]; orderInvoices?: TaxInvoice[] } | null {
  if (_cachedInvoices) return _cachedInvoices;
  try {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("qp_finance_invoices_cache") : null;
    if (raw) {
      _cachedInvoices = JSON.parse(raw);
      return _cachedInvoices;
    }
  } catch {
    // ignore
  }
  return null;
}

export function invalidateFinanceCaches(): void {
  _cachedOverview = null;
  _cachedInvoices = null;
  _cycleBreakdownsCache.clear();
  try {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("qp_finance_overview_cache");
      sessionStorage.removeItem("qp_finance_invoices_cache");
    }
  } catch {
    // ignore
  }
}

export async function fetchFinanceOverview(): Promise<FinanceOverviewResponse> {
  const data = await apiGetJson<FinanceOverviewResponse>("/api/partner/finance/overview");
  if (data) {
    _cachedOverview = data;
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("qp_finance_overview_cache", JSON.stringify(data));
      }
    } catch {
      // ignore
    }
  }
  return data;
}

export async function fetchSettlementBreakdown(cycleId: string): Promise<SettlementBreakdown> {
  if (_cycleBreakdownsCache.has(cycleId)) {
    return _cycleBreakdownsCache.get(cycleId)!;
  }
  const data = await apiGetJson<SettlementBreakdown>(`/api/partner/finance/settlement/${cycleId}`);
  if (data) {
    _cycleBreakdownsCache.set(cycleId, data);
  }
  return data;
}

export async function downloadSettlementReport(cycleId: string): Promise<{ ok: boolean; filename: string; data: SettlementBreakdown }> {
  return apiGetJson<{ ok: boolean; filename: string; data: SettlementBreakdown }>(`/api/partner/finance/statement/${cycleId}/download`);
}

export async function emailSettlementReport(cycleId: string): Promise<{ ok: boolean; message: string }> {
  return apiPostJson<{ ok: boolean; message: string }>(`/api/partner/finance/statement/${cycleId}/email`, {});
}

export async function fetchFinanceTaxInvoices(): Promise<{ invoices: TaxInvoice[]; orderInvoices?: TaxInvoice[] }> {
  const data = await apiGetJson<{ invoices: TaxInvoice[]; orderInvoices?: TaxInvoice[] }>("/api/partner/finance/invoices");
  if (data) {
    _cachedInvoices = data;
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("qp_finance_invoices_cache", JSON.stringify(data));
      }
    } catch {
      // ignore
    }
  }
  return data;
}

export function getPartnerOrderInvoicePdfUrl(orderId: string): string {
  const token = readToken();
  const cleanId = encodeURIComponent(orderId);
  return `${apiBaseUrl()}/api/partner/orders/${cleanId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export async function fetchPartnerOrderInvoice(orderId: string): Promise<any> {
  return apiGetJson<any>(`/api/partner/orders/${encodeURIComponent(orderId)}/invoice`);
}

export async function downloadPartnerInvoicePdfBlob(orderId: string, customFileName?: string): Promise<string> {
  const token = readToken();
  const cleanId = encodeURIComponent(orderId);
  const url = `${apiBaseUrl()}/api/partner/orders/${cleanId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Failed to download invoice (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const fileName = customFileName || `QuickPress-Invoice-${orderId.replace(/\//g, "-")}.pdf`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  return fileName;
}

export async function downloadCommissionInvoicePdfBlob(periodKey: string, customFileName?: string): Promise<string> {
  const token = readToken();
  const cleanKey = encodeURIComponent(periodKey);
  const url = `${apiBaseUrl()}/api/partner/finance/commission-invoices/${cleanKey}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Failed to download commission invoice (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const fileName = customFileName || `QuickPress-Commission-Invoice-${periodKey}.pdf`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  return fileName;
}

export async function downloadCommissionInvoiceExcelBlob(periodKey: string, customFileName?: string): Promise<string> {
  const token = readToken();
  const cleanKey = encodeURIComponent(periodKey);
  const url = `${apiBaseUrl()}/api/partner/finance/commission-invoices/${cleanKey}/excel${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Failed to download commission invoice Excel (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const fileName = customFileName || `QuickPress-Commission-Invoice-${periodKey}.csv`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  return fileName;
}

export async function downloadSettlementPdfBlob(cycleId: string, customFileName?: string): Promise<string> {
  const token = readToken();
  const cleanId = encodeURIComponent(cycleId);
  const url = `${apiBaseUrl()}/api/partner/finance/statement/${cleanId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Failed to download settlement statement PDF (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const fileName = customFileName || `QuickPress-Settlement-${cycleId.replace(/\//g, "-")}.pdf`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  return fileName;
}

export async function downloadSettlementExcelBlob(cycleId: string, customFileName?: string): Promise<string> {
  const token = readToken();
  const cleanId = encodeURIComponent(cycleId);
  const url = `${apiBaseUrl()}/api/partner/finance/statement/${cleanId}/excel${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Failed to download settlement statement Excel (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const fileName = customFileName || `QuickPress-Settlement-${cycleId.replace(/\//g, "-")}.csv`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  return fileName;
}

export async function requestPartnerInstantPayout(amount: number) {
  const res = await apiPostJson<{
    ok: boolean;
    settlementId: string;
    amount: number;
    utr: string;
    newBalance: number;
    settledAt: string;
    message: string;
  }>("/api/partner/finance/instant-payout", {
    amount: Math.abs(amount),
  });
  invalidateFinanceCaches();
  return res;
}


