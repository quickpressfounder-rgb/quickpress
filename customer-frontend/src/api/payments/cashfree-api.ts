/**
 * Cashfree Payments REST API Client for QuickPress Customer App.
 *
 * Communicates with backend endpoints:
 *   GET  /api/payments/cashfree/config
 *   POST /api/payments/cashfree/order
 *   POST /api/payments/cashfree/verify
 *   GET  /api/payments/cashfree/status/{orderId}
 *   POST /api/payments/cashfree/retry
 */

import { apiGetJson, apiPostJson } from "../core/transport";
import { launchCashfreeCheckout, type CheckoutOutcome } from "../core/cashfree";

export interface CashfreeConfig {
  appId: string;
  env: "SANDBOX" | "PROD";
  apiVersion: string;
  enabled: boolean;
  currency: string;
}

export interface CreateCashfreeOrderInput {
  amount: number;
  orderId?: string | undefined;
  walletAmount?: number | undefined;
  purpose?: string | undefined;
  customerPhone?: string | undefined;
  customerEmail?: string | undefined;
  customerName?: string | undefined;
  returnUrl?: string | undefined;
}

export interface CashfreeOrderResult {
  ok: boolean;
  paymentId: string;
  orderId: string;
  cfOrderId?: string | undefined;
  paymentSessionId?: string | undefined;
  amount: number;
  walletApplied: number;
  payableAmount: number;
  fullyPaidByWallet: boolean;
  currency: string;
  env: string;
  customerDetails?: {
    customerId?: string | undefined;
    customerPhone?: string | undefined;
    customerName?: string | undefined;
  } | undefined;
}

export interface VerifyCashfreeInput {
  orderId: string;
  cfOrderId?: string | undefined;
  paymentId?: string | undefined;
}

export interface CashfreeVerificationResult {
  ok: boolean;
  verified: boolean;
  status: "SUCCESS" | "FAILED" | "PENDING";
  message: string;
  payment?: unknown;
}

/**
 * Fetch publishable Cashfree config from server.
 */
export async function fetchCashfreeConfig(): Promise<CashfreeConfig> {
  return apiGetJson<CashfreeConfig>("/api/payments/cashfree/config", { anonymous: true });
}

/**
 * Create a Cashfree order and generate payment_session_id.
 */
export async function createCashfreeOrder(input: CreateCashfreeOrderInput): Promise<CashfreeOrderResult> {
  return apiPostJson<CashfreeOrderResult>("/api/payments/cashfree/order", input);
}

/**
 * Server-to-server verification of payment with Cashfree.
 */
export async function verifyCashfreePayment(input: VerifyCashfreeInput): Promise<CashfreeVerificationResult> {
  return apiPostJson<CashfreeVerificationResult>("/api/payments/cashfree/verify", input);
}

/**
 * Check payment status for an existing order.
 */
export async function fetchCashfreeStatus(orderId: string): Promise<{ ok: boolean; payment: unknown }> {
  return apiGetJson<{ ok: boolean; payment: unknown }>(`/api/payments/cashfree/status/${encodeURIComponent(orderId)}`);
}

/**
 * Re-generate session ID to retry payment on an order.
 */
export async function retryCashfreePayment(orderId: string): Promise<CashfreeOrderResult> {
  return apiPostJson<CashfreeOrderResult>("/api/payments/cashfree/retry", { orderId });
}

export interface PayWithCashfreeInput {
  amount: number;
  orderId?: string | undefined;
  walletAmount?: number | undefined;
  purpose?: string | undefined;
  customerName?: string | undefined;
  customerPhone?: string | undefined;
  customerEmail?: string | undefined;
  returnUrl?: string | undefined;
}

export type PayWithCashfreeOutcome =
  | { status: "success"; paymentId: string; cfOrderId?: string | undefined; fullyPaidByWallet: boolean }
  | { status: "user_dropped"; reason?: string | undefined }
  | { status: "failed"; reason: string };

/**
 * End-to-end payment runner for QuickPress Customer App.
 *
 * 1. Creates Cashfree order & payment_session_id on backend.
 * 2. If fully covered by Wallet, completes immediately without popup.
 * 3. Otherwise launches In-App Cashfree Checkout Modal.
 * 4. Verifies payment status cryptographically server-to-server.
 * 5. Returns final verified state.
 */
export async function payWithCashfree(input: PayWithCashfreeInput): Promise<PayWithCashfreeOutcome> {
  try {
    // 1. Backend Order & Session Creation
    const orderResult = await createCashfreeOrder({
      amount: input.amount,
      orderId: input.orderId,
      walletAmount: input.walletAmount,
      purpose: input.purpose,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      returnUrl: input.returnUrl,
    });

    // 2. Full Wallet Payment Bypass
    if (orderResult.fullyPaidByWallet || orderResult.payableAmount <= 0) {
      return {
        status: "success",
        paymentId: orderResult.paymentId,
        fullyPaidByWallet: true,
      };
    }

    if (!orderResult.paymentSessionId) {
      return {
        status: "failed",
        reason: "Failed to generate Cashfree payment session.",
      };
    }

    // 3. Launch In-App Cashfree Modal Checkout
    const checkoutOutcome: CheckoutOutcome = await launchCashfreeCheckout({
      paymentSessionId: orderResult.paymentSessionId,
      env: orderResult.env || "PROD",
      redirectTarget: "_modal",
    });

    if (checkoutOutcome.status === "user_dropped") {
      return { status: "user_dropped", reason: checkoutOutcome.reason || "Payment cancelled." };
    }

    // 4. Server-to-server verification
    const verification = await verifyCashfreePayment({
      orderId: orderResult.orderId,
      cfOrderId: orderResult.cfOrderId,
      paymentId: orderResult.paymentId,
    });

    if (verification.verified && verification.status === "SUCCESS") {
      return {
        status: "success",
        paymentId: orderResult.paymentId,
        cfOrderId: orderResult.cfOrderId,
        fullyPaidByWallet: false,
      };
    }

    if (verification.status === "PENDING") {
      // Allow a brief polling check (e.g. UPI Intent app return delay)
      await new Promise((r) => setTimeout(r, 1500));
      const retryVerify = await verifyCashfreePayment({
        orderId: orderResult.orderId,
        cfOrderId: orderResult.cfOrderId,
        paymentId: orderResult.paymentId,
      });

      if (retryVerify.verified && retryVerify.status === "SUCCESS") {
        return {
          status: "success",
          paymentId: orderResult.paymentId,
          cfOrderId: orderResult.cfOrderId,
          fullyPaidByWallet: false,
        };
      }
    }

    return {
      status: "failed",
      reason: verification.message || "Payment verification could not be completed.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment processing error";
    return {
      status: "failed",
      reason: message,
    };
  }
}
