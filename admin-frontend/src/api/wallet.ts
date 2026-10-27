/**
 * Master Wallet, Payouts, Settlement & Refund Engine API Client
 *
 * GET /api/admin/wallet/all-wallets     — All Customer, Partner, Rider Wallets
 * POST /api/admin/wallet/adjust         — Manual credit/debit with audit trail
 * GET /api/admin/wallet/kpis            — Top financial KPI metrics
 * GET /api/admin/wallet/revenue-split   — Monthly 3-way revenue distribution
 * GET /api/admin/wallet/partner-earnings— Partner store wash earnings
 * GET /api/admin/wallet/rider-earnings  — Captain delivery earnings
 * GET /api/admin/wallet/withdrawals     — Payout requests
 * POST /api/admin/wallet/withdrawals/{id}/approve|reject
 * GET /api/admin/wallet/transactions    — Unified double-entry ledger
 * GET /api/admin/refunds                — Customer refund claims & history
 * GET /api/admin/refunds/stats          — Refund KPIs
 * POST /api/admin/refunds/initiate      — Issue full/partial refund
 * POST /api/admin/refunds/{id}/approve  — Execute pending refund
 * POST /api/admin/refunds/{id}/reject   — Reject refund claim
 */
import { apiGetJson, apiPostJson } from "@/api/core/transport";
import { type Kpi, type SeriesPoint } from "./client";

export type AccountWallet = {
  id: string;
  name: string;
  role: "customer" | "partner" | "rider";
  phone: string;
  city: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  codCashInHand: number;
  pendingPayout: number;
  status: "Active" | "Blocked" | "Suspended";
  bank?: { accountNumber: string; ifsc: string; upi: string } | null;
  createdAt?: string;
  updatedAt?: string;
};


export type Payout = {
  id: string;
  account: string;
  type: "Partner" | "Rider";
  amount: string;
  rawAmount: number;
  requested: string;
  method: string;
  status: "Pending" | "Approved" | "Processing" | "Rejected";
};

export type Transaction = {
  id: string;
  account: string;
  role: string;
  kind: string;
  amount: number;
  date: string;
  status: "Completed" | "Pending" | "Failed";
  refOrder?: string;
};

export type Earning = {
  id: string;
  account: string;
  city: string;
  orders: number;
  gross: string;
  commission: string;
  net: string;
};

export type RefundRecord = {
  id: string;
  refundNumber: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  method: "wallet" | "gateway";
  methodLabel: string;
  reason: string;
  category: string;
  status: "Completed" | "Pending" | "Processing" | "Rejected";
  notes?: string;
  processedBy: string;
  createdAt: string;
  processedAt?: string;
};

export type RefundStats = {
  totalRefundedAmount: string;
  rawTotalAmount: number;
  totalRefundsCount: number;
  pendingClaimsCount: number;
  walletRefundsCount: number;
  gatewayRefundsCount: number;
  instantSuccessRate: string;
  avgTurnaround: string;
};

const money = (value: number) => `₹${(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export async function fetchAllWallets(): Promise<AccountWallet[]> {
  try {
    const rows = await apiGetJson<AccountWallet[]>("/api/admin/wallet/all-wallets");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function adjustWalletBalance(payload: {
  accountId: string;
  role: "customer" | "partner" | "rider";
  amount: number;
  type: "credit" | "debit";
  reason: string;
}) {
  return await apiPostJson<{ accountId: string; previousBalance: number; newBalance: number }>("/api/admin/wallet/adjust", payload);
}

export async function toggleWalletBlock(payload: {
  accountId: string;
  role: "customer" | "partner" | "rider";
  block: boolean;
  reason?: string;
}): Promise<{ accountId: string; status: string; isBlocked: boolean; reason: string }> {
  return await apiPostJson("/api/admin/wallet/toggle-block", payload);
}

export type AccountHistoryItem = {
  id: string;
  date: string;
  kind: string;
  type: "credit" | "debit" | "block" | "unblock";
  amount: number;
  balanceAfter?: number | null;
  status: string;
  reason: string;
  refOrder?: string;
};

export async function fetchAccountWalletHistory(accountId: string): Promise<AccountHistoryItem[]> {
  try {
    const rows = await apiGetJson<AccountHistoryItem[]>(`/api/admin/wallet/${accountId}/history`);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}


export async function fetchFinanceKpis(): Promise<Kpi[]> {
  try {
    const rows = await apiGetJson<{ id: string; label: string; value: number; positive: boolean }[]>("/api/admin/wallet/kpis");
    return (rows || []).map((r) => ({ id: r.id, label: r.label, value: money(r.value), positive: r.positive }));
  } catch {
    return [];
  }
}

export async function fetchRevenueSplit(): Promise<SeriesPoint[]> {
  try {
    return await apiGetJson<SeriesPoint[]>("/api/admin/wallet/revenue-split");
  } catch {
    return [];
  }
}

export async function fetchPartnerEarnings(): Promise<Earning[]> {
  try {
    const rows = await apiGetJson<{ id: string; account: string; city: string; orders: number; gross: number; commission: number; net: number }[]>(
      "/api/admin/wallet/partner-earnings",
    );
    return (rows || []).map((r) => ({ ...r, gross: money(r.gross), commission: money(r.commission), net: money(r.net) }));
  } catch {
    return [];
  }
}

export async function fetchRiderEarnings(): Promise<Earning[]> {
  try {
    const rows = await apiGetJson<{ id: string; account: string; city: string; orders: number; gross: number; commission: number; net: number }[]>(
      "/api/admin/wallet/rider-earnings",
    );
    return (rows || []).map((r) => ({ ...r, gross: money(r.gross), commission: money(r.commission), net: money(r.net) }));
  } catch {
    return [];
  }
}

export async function fetchWithdrawRequests(): Promise<Payout[]> {
  try {
    const rows = await apiGetJson<any[]>("/api/admin/wallet/withdrawals");
    return (rows || []).map((r) => ({
      id: r._id || r.id,
      account: r.account || r.accountName || "Account",
      type: (r.role === "rider" || r.kind === "rider" ? "Rider" : "Partner") as "Partner" | "Rider",
      amount: money(r.amount ?? 0),
      rawAmount: Number(r.amount ?? 0),
      requested: (r.createdAt || r.requested || "").slice(0, 10),
      method: r.method || "Bank / UPI",
      status: (r.status as any) || "Pending",
    }));
  } catch {
    return [];
  }
}

export async function approveWithdrawal(withdrawalId: string) {
  return await apiPostJson<{ ok: boolean }>(`/api/admin/wallet/withdrawals/${withdrawalId}/approve`, {});
}

export async function rejectWithdrawal(withdrawalId: string) {
  return await apiPostJson<{ ok: boolean }>(`/api/admin/wallet/withdrawals/${withdrawalId}/reject`, {});
}

export async function fetchTransactions(): Promise<Transaction[]> {
  try {
    const rows = await apiGetJson<any[]>("/api/admin/wallet/transactions");
    return (rows || []).map((r) => ({
      id: r._id || r.id,
      account: r.account || r.accountId || "Account",
      role: r.role || "customer",
      kind: r.kind || "Adjustment",
      amount: Number(r.amount ?? 0),
      date: (r.createdAt || r.date || "").slice(0, 16).replace("T", " "),
      status: (r.status as any) || "Completed",
      refOrder: r.refOrder || r.orderId,
    }));
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------------
// CUSTOMER REFUND ENGINE API CLIENTS
// -----------------------------------------------------------------------------

export async function fetchAdminRefunds(): Promise<RefundRecord[]> {
  try {
    const rows = await apiGetJson<any[]>("/api/admin/refunds");
    return (rows || []).map((r) => ({
      id: r._id || r.id,
      refundNumber: r.refundNumber || `REF-${(r._id || "0000").slice(0, 4).toUpperCase()}`,
      orderId: r.orderId || "—",
      orderNumber: r.orderNumber || "QP1001",
      userId: r.userId || "",
      customerName: r.customerName || "Customer",
      customerPhone: r.customerPhone || "+91 98719 62596",
      amount: Number(r.amount ?? 0),
      method: r.method || "wallet",
      methodLabel: r.methodLabel || (r.method === "wallet" ? "QuickPress Wallet (Instant)" : "Razorpay UPI Reversal"),
      reason: r.reason || "Order Cancellation",
      category: r.category || "General Refund",
      status: (r.status as any) || "Completed",
      notes: r.notes || "",
      processedBy: r.processedBy || "Lead Admin",
      createdAt: (r.createdAt || "").slice(0, 16).replace("T", " "),
      processedAt: r.processedAt ? (r.processedAt || "").slice(0, 16).replace("T", " ") : undefined,
    }));
  } catch {
    return [];
  }
}

export async function fetchAdminRefundsStats(): Promise<RefundStats> {
  try {
    return await apiGetJson<RefundStats>("/api/admin/refunds/stats");
  } catch {
    return {
      totalRefundedAmount: "₹0.00",
      rawTotalAmount: 0,
      totalRefundsCount: 0,
      pendingClaimsCount: 0,
      walletRefundsCount: 0,
      gatewayRefundsCount: 0,
      instantSuccessRate: "100%",
      avgTurnaround: "0 Mins",
    };
  }
}

export async function initiateAdminRefund(payload: {
  orderId?: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  method: "wallet" | "gateway";
  reason: string;
  notes?: string;
}) {
  return await apiPostJson<RefundRecord>("/api/admin/refunds/initiate", payload);
}

export async function approveAdminRefund(refundId: string) {
  return await apiPostJson<{ ok: boolean }>(`/api/admin/refunds/${refundId}/approve`, {});
}

export async function rejectAdminRefund(refundId: string, reason: string) {
  return await apiPostJson<{ ok: boolean }>(`/api/admin/refunds/${refundId}/reject`, { reason });
}

export type SettlementSummary = {
  totalGmv: number;
  totalPartnerSettled: number;
  totalPartnerPending: number;
  totalRiderSettled: number;
  totalRiderPending: number;
  totalPlatformCommission: number;
  totalPlatformNetMargin: number;
  settledOrdersCount: number;
  pendingPayoutsCount: number;
};

export type SettlementRecordItem = {
  id: string;
  orderId: string;
  orderCode: string;
  role: "partner" | "rider";
  accountName: string;
  grossAmount: number;
  commission: number;
  netPayout: number;
  status: "SETTLED" | "PENDING" | "REJECTED";
  utr: string;
  date: string;
};

export type SettlementsOverview = {
  summary: SettlementSummary;
  settlements: SettlementRecordItem[];
  cycles: Array<{
    cycleId: string;
    title: string;
    period: string;
    startDate: string;
    endDate: string;
    payoutDate: string;
    status: string;
    isCurrent: boolean;
  }>;
};

export async function fetchSettlementsOverview(): Promise<SettlementsOverview> {
  try {
    const res = await apiGetJson<SettlementsOverview>("/api/admin/settlements/overview");
    return (
      res || {
        summary: {
          totalGmv: 0,
          totalPartnerSettled: 0,
          totalPartnerPending: 0,
          totalRiderSettled: 0,
          totalRiderPending: 0,
          totalPlatformCommission: 0,
          totalPlatformNetMargin: 0,
          settledOrdersCount: 0,
          pendingPayoutsCount: 0,
        },
        settlements: [],
        cycles: [],
      }
    );
  } catch {
    return {
      summary: {
        totalGmv: 0,
        totalPartnerSettled: 0,
        totalPartnerPending: 0,
        totalRiderSettled: 0,
        totalRiderPending: 0,
        totalPlatformCommission: 0,
        totalPlatformNetMargin: 0,
        settledOrdersCount: 0,
        pendingPayoutsCount: 0,
      },
      settlements: [],
      cycles: [],
    };
  }
}

export async function batchDisburseSettlements() {
  return await apiPostJson<{ ok: boolean; disbursedCount: number; totalAmount: number }>("/api/admin/settlements/batch-disburse", {});
}

export async function approveSettlementRecord(settlementId: string, utr?: string) {
  return await apiPostJson<{ ok: boolean }>(`/api/admin/settlements/${settlementId}/approve`, { utr });
}
