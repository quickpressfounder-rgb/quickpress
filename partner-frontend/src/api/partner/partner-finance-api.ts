/**
 * QuickPress Partner Finance, Payout & Settlement API Client.
 */

import { apiGetJson, apiPostJson } from "../core/transport";
import { readToken } from "../core/session-store";

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

export type FinanceOverviewResponse = {
  currentCycle: {
    cycleId: string;
    period: string;
    payoutDate: string;
    estPayout: number;
    orderCount: number;
    status: string;
  };
  pastCycles: {
    cycleId: string;
    period: string;
    payoutDate: string;
    status: string;
    netPayout: number;
    orderCount: number;
  }[];
  filterOptions: string[];
};

export type SettlementOrder = {
  orderId: string;
  orderCode: string;
  date: string;
  itemsSummary: string;
  customerName: string;
  grossValue: number;
  commission: number;
  netEarning: number;
  status: string;
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

export async function fetchFinanceOverview(): Promise<FinanceOverviewResponse> {
  return apiGetJson<FinanceOverviewResponse>("/api/partner/finance/overview");
}

export async function fetchSettlementBreakdown(cycleId: string): Promise<SettlementBreakdown> {
  return apiGetJson<SettlementBreakdown>(`/api/partner/finance/settlement/${cycleId}`);
}

export async function downloadSettlementReport(cycleId: string): Promise<{ ok: boolean; filename: string; data: SettlementBreakdown }> {
  return apiGetJson<{ ok: boolean; filename: string; data: SettlementBreakdown }>(`/api/partner/finance/statement/${cycleId}/download`);
}

export async function emailSettlementReport(cycleId: string): Promise<{ ok: boolean; message: string }> {
  return apiPostJson<{ ok: boolean; message: string }>(`/api/partner/finance/statement/${cycleId}/email`, {});
}

export async function fetchFinanceTaxInvoices(): Promise<{ invoices: TaxInvoice[]; orderInvoices?: TaxInvoice[] }> {
  return apiGetJson<{ invoices: TaxInvoice[]; orderInvoices?: TaxInvoice[] }>("/api/partner/finance/invoices");
}

export function getPartnerOrderInvoicePdfUrl(orderId: string): string {
  const token = readToken();
  const cleanId = encodeURIComponent(orderId);
  return `/api/partner/orders/${cleanId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export async function fetchPartnerOrderInvoice(orderId: string): Promise<any> {
  return apiGetJson<any>(`/api/partner/orders/${encodeURIComponent(orderId)}/invoice`);
}

export async function downloadPartnerInvoicePdfBlob(orderId: string, customFileName?: string): Promise<string> {
  const token = readToken();
  const cleanId = encodeURIComponent(orderId);
  const url = `/api/partner/orders/${cleanId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
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
  const url = `/api/partner/finance/commission-invoices/${cleanKey}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
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

