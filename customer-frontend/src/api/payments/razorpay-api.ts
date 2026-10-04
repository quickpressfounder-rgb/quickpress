/**
 * Razorpay Payments REST API Client for QuickPress Customer App.
 *
 * Communicates with backend endpoints:
 *   GET  /api/payments/razorpay/config
 *   POST /api/payments/razorpay/order
 *   POST /api/payments/razorpay/verify
 *   POST /api/payments/razorpay/failure
 *   POST /api/payments/razorpay/simulate
 */

import { apiGetJson, apiPostJson } from "../core/transport";
import { ApiError } from "../core/errors";
import {
  envRazorpayKeyId,
  loadRazorpayCheckout,
  openRazorpayCheckout,
  razorpayMode,
  type CheckoutOutcome,
  type CheckoutProfile,
} from "../core/razorpay";
import type {
  GatewayPayment,
  GatewayRefund,
  PaymentVerificationResult,
  RazorpayConfig,
  RazorpayOrderResult,
  RazorpaySuccessPayload,
} from "@/shared/types/payment";

export const RAZORPAY_ENDPOINTS = {
  config: "/api/payments/razorpay/config",
  order: "/api/payments/razorpay/order",
  verify: "/api/payments/razorpay/verify",
  failure: "/api/payments/razorpay/failure",
  gatewayPayments: "/api/payments/gateway",
  simulate: "/api/payments/razorpay/simulate",
  refund: (paymentId: string) => `/api/payments/${encodeURIComponent(paymentId)}/refund`,
  refundStatus: (refundId: string) => `/api/refunds/${encodeURIComponent(refundId)}`,
} as const;

/** GET /api/payments/razorpay/config — publishable key + gateway mode. */
export async function fetchRazorpayConfig(): Promise<RazorpayConfig> {
  try {
    const raw = await apiGetJson<Partial<RazorpayConfig>>(RAZORPAY_ENDPOINTS.config, { anonymous: true });
    const keyId = (raw.keyId ?? "").trim() || envRazorpayKeyId();
    return {
      keyId,
      enabled: raw.enabled ?? Boolean(keyId),
      currency: raw.currency ?? "INR",
      mode: raw.mode ?? razorpayMode(keyId),
    };
  } catch {
    const keyId = envRazorpayKeyId();
    return { keyId, enabled: Boolean(keyId), currency: "INR", mode: razorpayMode(keyId) };
  }
}

export type CreateOrderInput = {
  amount: number;
  orderId?: string | undefined;
  purpose?: string | undefined;
  walletAmount?: number | undefined;
  savedMethodId?: string | undefined;
};

/** POST /api/payments/razorpay/order */
export async function createRazorpayOrder(input: CreateOrderInput): Promise<RazorpayOrderResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ApiError("validation", "Payment amount must be greater than ₹0.");
  }

  const raw = await apiPostJson<Partial<RazorpayOrderResult>>(RAZORPAY_ENDPOINTS.order, {
    amount: Number(input.amount.toFixed(2)),
    orderId: input.orderId ?? null,
    purpose: input.purpose ?? "Order payment",
    walletAmount: Number((input.walletAmount ?? 0).toFixed(2)),
    savedMethodId: input.savedMethodId ?? null,
  });

  const walletApplied = raw.walletApplied ?? 0;
  const payableAmount = raw.payableAmount ?? Math.max(0, input.amount - walletApplied);
  const keyId = (raw.keyId ?? "").trim() || envRazorpayKeyId();

  return {
    ok: raw.ok ?? true,
    paymentId: raw.paymentId ?? "",
    gatewayOrderId: raw.gatewayOrderId ?? "",
    keyId,
    currency: raw.currency ?? "INR",
    amount: raw.amount ?? input.amount,
    walletApplied,
    payableAmount,
    amountInPaise: raw.amountInPaise ?? Math.round(payableAmount * 100),
    fullyPaidByWallet: raw.fullyPaidByWallet ?? payableAmount <= 0,
    receipt: raw.receipt ?? "",
    notes: raw.notes ?? {},
  };
}

/** POST /api/payments/razorpay/verify — server-side HMAC SHA256 verification. */
export async function verifyRazorpayPayment(input: {
  paymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<PaymentVerificationResult> {
  const raw = await apiPostJson<Partial<PaymentVerificationResult>>(RAZORPAY_ENDPOINTS.verify, {
    paymentId: input.paymentId,
    razorpay_order_id: input.razorpayOrderId,
    razorpay_payment_id: input.razorpayPaymentId,
    razorpay_signature: input.razorpaySignature,
  });
  if (!raw.payment) {
    throw new ApiError("conflict", raw.message ?? "Payment could not be verified.");
  }
  return {
    ok: raw.ok ?? false,
    verified: raw.verified ?? false,
    message: raw.message ?? "Payment verified.",
    payment: raw.payment,
  };
}

/** POST /api/payments/razorpay/failure — persist gateway failures for support. */
export async function recordPaymentFailure(input: {
  paymentId: string;
  reason: string;
  code?: string;
}): Promise<GatewayPayment> {
  const raw = await apiPostJson<{ payment?: GatewayPayment }>(RAZORPAY_ENDPOINTS.failure, {
    paymentId: input.paymentId,
    reason: input.reason,
    code: input.code ?? "payment_failed",
  });
  if (!raw.payment) throw new ApiError("conflict", "Could not record the payment failure.");
  return raw.payment;
}

/** GET /api/payments/gateway — Razorpay/wallet payment history. */
export async function fetchGatewayPayments(): Promise<GatewayPayment[]> {
  const raw = await apiGetJson<{ items?: GatewayPayment[] }>(RAZORPAY_ENDPOINTS.gatewayPayments);
  return raw.items ?? [];
}

export type PayResult =
  | { status: "success"; paymentId: string; gatewayOrderId?: string; fullyPaidByWallet: boolean }
  | { status: "user_dropped"; reason?: string }
  | { status: "failed"; reason: string };

export interface PayWithRazorpayInput {
  amount: number;
  orderId?: string | undefined;
  walletAmount?: number | undefined;
  purpose?: string | undefined;
  customerName?: string | undefined;
  customerPhone?: string | undefined;
  customerEmail?: string | undefined;
  preferredMethod?: "upi" | "card" | "netbanking" | "wallet" | undefined;
  vpa?: string | undefined;
  bank?: string | undefined;
}

/**
 * End-to-end payment runner for QuickPress Customer App:
 * 1. Creates order on server with wallet allocation.
 * 2. If fully covered by wallet, bypasses checkout modal.
 * 3. Opens Razorpay standard checkout modal (Native Android SDK on APK, Web SDK on browser).
 * 4. Verifies HMAC-SHA256 signature server-to-server.
 */
export async function payWithRazorpay(input: PayWithRazorpayInput): Promise<PayResult> {
  try {
    const order = await createRazorpayOrder({
      amount: input.amount,
      orderId: input.orderId,
      purpose: input.purpose,
      walletAmount: input.walletAmount,
    });

    if (order.fullyPaidByWallet || order.payableAmount <= 0) {
      return {
        status: "success",
        paymentId: order.paymentId,
        fullyPaidByWallet: true,
      };
    }

    const outcome: CheckoutOutcome = await openRazorpayCheckout(order, {
      description: input.purpose || "QuickPress Laundry Order",
      profile: {
        name: input.customerName || "Customer",
        contact: input.customerPhone ? input.customerPhone.replace(/\D/g, "") : "",
        email: input.customerEmail || "",
      },
      appName: "QuickPress",
      themeColor: "#0c831f",
      preferredMethod: input.preferredMethod,
      vpa: input.vpa,
      bank: input.bank,
    });

    if (outcome.status === "dismissed") {
      return { status: "user_dropped", reason: outcome.reason };
    }

    if (outcome.status === "failed") {
      return { status: "failed", reason: outcome.reason };
    }

    // Verify cryptographic signature server-side
    const verification = await verifyRazorpayPayment({
      paymentId: order.paymentId,
      razorpayOrderId: outcome.payload.razorpay_order_id,
      razorpayPaymentId: outcome.payload.razorpay_payment_id,
      razorpaySignature: outcome.payload.razorpay_signature,
    });

    if (verification.verified) {
      return {
        status: "success",
        paymentId: order.paymentId,
        gatewayOrderId: order.gatewayOrderId,
        fullyPaidByWallet: false,
      };
    }

    return {
      status: "failed",
      reason: verification.message || "Payment verification failed.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Payment processing error";
    return {
      status: "failed",
      reason: msg,
    };
  }
}

// Backward-compatibility export so any existing caller functions smoothly
export const payWithCashfree = payWithRazorpay;
