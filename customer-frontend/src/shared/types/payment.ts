/**
 * Phase 5 · Sprint 5.6 — Production payment, wallet, settlement contracts.
 *
 * These types are the single source of truth shared by:
 *   • the frontend data layer (`backend/src/payments/*`)
 *   • the mock backend (`backend/src/mock/payments-core.ts`)
 *   • the FastAPI service (`backend-python/app/models/payment.py`)
 *
 * Additive only — no existing type was changed.
 */

export type PaymentGateway = "cashfree" | "wallet" | "cod" | "mixed" | "razorpay";

export type GatewayPaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "cancelled"
  | "user_dropped";

export type CashfreeConfig = {
  appId: string;
  env: "SANDBOX" | "PROD";
  apiVersion: string;
  enabled: boolean;
  currency: string;
};

export type CashfreeOrderResult = {
  ok: boolean;
  paymentId: string;
  orderId: string;
  cfOrderId?: string;
  paymentSessionId?: string;
  amount: number;
  walletApplied: number;
  payableAmount: number;
  fullyPaidByWallet: boolean;
  currency: string;
  env: string;
  customerDetails?: {
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
  };
};

export type RazorpayConfig = {
  /** Publishable key id (rzp_test_… / rzp_live_…). Never the secret. */
  keyId: string;
  enabled: boolean;
  currency: string;
  /** "test" | "live" — derived from the key prefix on the server. */
  mode: "test" | "live" | "disabled";
};

/** Response of POST /api/payments/razorpay/order */
export type RazorpayOrderResult = {
  ok: boolean;
  /** Internal payment document id. */
  paymentId: string;
  /** Razorpay order id (order_…) — empty when the whole amount came from wallet. */
  gatewayOrderId: string;
  keyId: string;
  currency: string;
  /** Total order amount in rupees. */
  amount: number;
  /** Portion settled from the wallet (mixed payment). */
  walletApplied: number;
  /** Portion Razorpay must collect, in rupees. */
  payableAmount: number;
  /** Razorpay expects paise. */
  amountInPaise: number;
  /** True when wallet covered everything and no checkout is required. */
  fullyPaidByWallet: boolean;
  receipt: string;
  notes: Record<string, string>;
};

/** Checkout handler payload handed back by Razorpay. */
export type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type PaymentVerificationResult = {
  ok: boolean;
  verified: boolean;
  message: string;
  payment: GatewayPayment;
};

export type GatewayPayment = {
  id: string;
  orderId: string | null;
  accountId: string;
  gateway: PaymentGateway;
  status: GatewayPaymentStatus;
  amount: number;
  walletAmount: number;
  gatewayAmount: number;
  currency: string;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  signatureVerified: boolean;
  purpose: string;
  failureReason: string | null;
  refundedAmount: number;
  createdAt: string;
  updatedAt: string;
};

/* ------------------------------ wallet ledger ----------------------------- */

export type LedgerDirection = "credit" | "debit";

export type LedgerReason =
  | "order-payment"
  | "wallet-topup"
  | "refund"
  | "cashback"
  | "settlement"
  | "withdrawal"
  | "incentive"
  | "adjustment"
  | "penalty";

export type WalletLedgerEntry = {
  id: string;
  accountId: string;
  role: "customer" | "partner" | "rider";
  direction: LedgerDirection;
  reason: LedgerReason;
  amount: number;
  balanceAfter: number;
  currency: string;
  reference: string | null;
  orderId: string | null;
  paymentId: string | null;
  note: string;
  status: "success" | "pending" | "failed";
  createdAt: string;
  dateLabel: string;
};

export type WalletLedgerResult = {
  entries: WalletLedgerEntry[];
  balance: number;
  pending: number;
  lifetimeCredit: number;
  lifetimeDebit: number;
  currency: string;
};

/* -------------------------------- refunds -------------------------------- */

export type GatewayRefundStatus = "requested" | "approved" | "processing" | "processed" | "rejected" | "failed";

export type GatewayRefund = {
  id: string;
  paymentId: string;
  orderId: string | null;
  accountId: string;
  amount: number;
  reason: string;
  status: GatewayRefundStatus;
  /** rfnd_… once Razorpay accepted it. */
  gatewayRefundId: string | null;
  /** "wallet" refunds land instantly; "source" goes back to the card/UPI. */
  destination: "source" | "wallet";
  createdAt: string;
  updatedAt: string;
  dateLabel: string;
  timeline: { label: string; at: string }[];
};

/* ------------------------------ settlements ------------------------------- */

export type SettlementStatus = "pending" | "approved" | "processing" | "settled" | "rejected";

export type Settlement = {
  id: string;
  accountId: string;
  role: "partner" | "rider";
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  orders: number;
  grossAmount: number;
  commission: number;
  taxDeducted: number;
  incentives: number;
  netAmount: number;
  status: SettlementStatus;
  utr: string | null;
  settledAt: string | null;
  createdAt: string;
};

export type SettlementResult = {
  items: Settlement[];
  totalSettled: number;
  totalPending: number;
  currency: string;
};

/* ------------------------------ withdrawals ------------------------------- */

export type WithdrawalStatus = "requested" | "approved" | "processing" | "paid" | "rejected";

export type WithdrawalRequest = {
  id: string;
  accountId: string;
  role: "partner" | "rider";
  amount: number;
  method: "bank" | "upi";
  destination: string;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt: string | null;
  rejectionReason: string | null;
  reference: string | null;
  dateLabel: string;
};

export type WithdrawalResult = {
  items: WithdrawalRequest[];
  available: number;
  pendingAmount: number;
  minimumAmount: number;
  currency: string;
};

/* -------------------------------- earnings -------------------------------- */

export type EarningsBreakdown = {
  today: number;
  week: number;
  month: number;
  lifetime: number;
  orders: number;
  averagePerOrder: number;
  commissionRate: number;
  pendingSettlement: number;
  currency: string;
  series: { label: string; amount: number }[];
};

export type RiderIncentive = {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: number;
  status: "active" | "completed" | "expired";
  expiresAt: string;
};

/* -------------------------------- admin ----------------------------------- */

export type AdminPaymentKpis = {
  grossVolume: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  refundedAmount: number;
  refundCount: number;
  walletFloat: number;
  pendingSettlements: number;
  pendingWithdrawals: number;
  currency: string;
};

export type AdminPaymentDashboard = {
  kpis: AdminPaymentKpis;
  recentPayments: GatewayPayment[];
  gatewayMode: "test" | "live" | "disabled";
  series: { label: string; captured: number; refunded: number }[];
};

export type AdminWalletMonitorRow = {
  accountId: string;
  name: string;
  role: "customer" | "partner" | "rider";
  balance: number;
  pending: number;
  lifetimeCredit: number;
  lifetimeDebit: number;
  lastActivityAt: string | null;
  flagged: boolean;
};
