/**
 * Cashfree Payments JS SDK Integration for QuickPress.
 *
 * Official v3 SDK loader and In-App Checkout Orchestrator.
 * Supports:
 *   - In-App Modal / Seamless Drop Checkout (_modal redirectTarget)
 *   - UPI Intent (PhonePe, Google Pay, Paytm, BHIM, Supermoney)
 *   - Credit & Debit Cards (with 3DS OTP)
 *   - Net Banking (All Indian scheduled commercial banks)
 *   - Wallets
 *
 * Never exposes secrets to frontend. Uses short-lived, scoped `payment_session_id`.
 */

import { load, type Cashfree as CashfreeType } from "@cashfreepayments/cashfree-js";
import { ApiError } from "./errors";

const CASHFREE_SCRIPT_SRC = "https://sdk.cashfree.com/js/v3/cashfree.js";

export type CashfreeEnv = "sandbox" | "production";

let cachedCashfreeInstance: CashfreeType | null = null;
let cachedEnv: CashfreeEnv | null = null;
let loaderPromise: Promise<CashfreeType> | null = null;

/**
 * Initializes and returns singleton Cashfree SDK instance.
 */
export async function getCashfreeInstance(envMode: "SANDBOX" | "PROD" | string = "SANDBOX"): Promise<CashfreeType> {
  const mode: CashfreeEnv = envMode.toUpperCase() === "PROD" || envMode.toUpperCase() === "PRODUCTION"
    ? "production"
    : "sandbox";

  if (cachedCashfreeInstance && cachedEnv === mode) {
    return cachedCashfreeInstance;
  }

  if (loaderPromise && cachedEnv === mode) {
    return loaderPromise;
  }

  cachedEnv = mode;
  loaderPromise = (async () => {
    try {
      const instance = await load({ mode });
      if (!instance) {
        throw new Error("Cashfree SDK failed to initialize.");
      }
      cachedCashfreeInstance = instance;
      return instance;
    } catch {
      // Fallback: load script dynamically if npm package bundle encountered issues
      if (typeof window !== "undefined") {
        await new Promise<void>((resolve, reject) => {
          if (document.querySelector(`script[src="${CASHFREE_SCRIPT_SRC}"]`)) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = CASHFREE_SCRIPT_SRC;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Cashfree checkout script from CDN."));
          document.head.appendChild(script);
        });

        const windowCf = (window as unknown as { Cashfree?: (opts: { mode: string }) => CashfreeType }).Cashfree;
        if (windowCf) {
          const instance = windowCf({ mode });
          cachedCashfreeInstance = instance;
          return instance;
        }
      }
      throw new ApiError("unconfigured", "Unable to load Cashfree Payment SDK.");
    }
  })();

  return loaderPromise;
}

export interface LaunchCashfreeCheckoutOptions {
  paymentSessionId: string;
  env?: "SANDBOX" | "PROD" | string | undefined;
  redirectTarget?: "_modal" | "_self" | "_blank" | undefined;
  returnUrl?: string | undefined;
  onPaymentSuccess?: (() => void) | undefined;
  onPaymentFailure?: ((reason?: string) => void) | undefined;
  onPaymentClose?: (() => void) | undefined;
}

export type CheckoutOutcome =
  | { status: "success"; data?: unknown }
  | { status: "user_dropped"; reason?: string | undefined }
  | { status: "failed"; reason: string };

/**
 * Launch in-app Cashfree Checkout Modal.
 * Keeps customer inside QuickPress in-app payment experience.
 */
export async function launchCashfreeCheckout(options: LaunchCashfreeCheckoutOptions): Promise<CheckoutOutcome> {
  const { paymentSessionId, env = "PROD", redirectTarget = "_modal" } = options;

  if (!paymentSessionId) {
    throw new ApiError("validation", "payment_session_id is required to launch Cashfree.");
  }

  const cashfree = await getCashfreeInstance(env);

  return new Promise<CheckoutOutcome>((resolve) => {
    try {
      cashfree
        .checkout({
          paymentSessionId,
          redirectTarget,
        })
        .then((result: unknown) => {
          // Cashfree SDK resolves when modal is completed or closed
          if (result && typeof result === "object" && "error" in result && (result as { error?: { message?: string } }).error) {
            resolve({
              status: "failed",
              reason: (result as { error?: { message?: string } }).error?.message || "Payment attempt failed.",
            });
          } else if (result && typeof result === "object" && "paymentDetails" in result) {
            resolve({
              status: "success",
              data: (result as { paymentDetails?: unknown }).paymentDetails,
            });
          } else {
            // Modal closed or completed
            resolve({
              status: "success",
              data: result,
            });
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.toLowerCase().includes("user") || msg.toLowerCase().includes("close") || msg.toLowerCase().includes("dismiss")) {
            resolve({ status: "user_dropped", reason: "Payment cancelled by customer." });
          } else {
            resolve({ status: "failed", reason: msg || "Payment failed." });
          }
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open Cashfree checkout.";
      resolve({ status: "failed", reason: msg });
    }
  });
}
