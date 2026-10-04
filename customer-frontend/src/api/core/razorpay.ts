/**
 * Razorpay Checkout SDK Integration for QuickPress Customer App.
 *
 * Responsibilities:
 *   - Load the Razorpay Checkout script dynamically in the browser/app.
 *   - Open Checkout modal with custom QuickPress styling & callbacks.
 *   - Zero hardcoded credentials: Key ID is loaded dynamically from backend or env.
 */

import { ApiError } from "./errors";
import type { RazorpayOrderResult, RazorpaySuccessPayload } from "@/shared/types/payment";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Publishable key from client build environment (backend also provides it dynamically). */
export function envRazorpayKeyId(): string {
  const value = (import.meta.env["VITE_RAZORPAY_KEY_ID"] as string | undefined) ?? "";
  return value.trim();
}

export function razorpayMode(keyId: string): "test" | "live" | "disabled" {
  if (keyId.startsWith("rzp_live_")) return "live";
  if (keyId.startsWith("rzp_test_")) return "test";
  return "disabled";
}

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
  close: () => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

function windowRazorpay(): RazorpayConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay ?? null;
}

let loader: Promise<RazorpayConstructor> | null = null;

/** Injects the Checkout script once; resolves with the global constructor. */
export function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  if (typeof window === "undefined") {
    return Promise.reject(new ApiError("unconfigured", "Razorpay Checkout requires a browser window."));
  }
  const existing = windowRazorpay();
  if (existing) return Promise.resolve(existing);
  if (loader) return loader;

  loader = new Promise<RazorpayConstructor>((resolve, reject) => {
    const previous = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    const script = previous ?? document.createElement("script");
    const settle = () => {
      const ctor = windowRazorpay();
      if (ctor) resolve(ctor);
      else reject(new ApiError("unconfigured", "Razorpay Checkout failed to initialise."));
    };
    script.addEventListener("load", settle);
    script.addEventListener("error", () => {
      loader = null;
      reject(new ApiError("network", "Could not reach Razorpay CDN. Please check your connection."));
    });
    if (!previous) {
      script.src = CHECKOUT_SRC;
      script.async = true;
      document.head.appendChild(script);
    } else if (windowRazorpay()) {
      settle();
    }
  });
  return loader;
}

export type CheckoutProfile = {
  name?: string;
  email?: string;
  contact?: string;
};

export type CheckoutOutcome =
  | { status: "success"; payload: RazorpaySuccessPayload }
  | { status: "failed"; reason: string; code: string }
  | { status: "dismissed"; reason: string; code: "checkout_dismissed" };

/**
 * Opens Razorpay Checkout modal for a server-created order.
 */
export async function openRazorpayCheckout(
  order: RazorpayOrderResult,
  options: {
    description?: string;
    profile?: CheckoutProfile;
    themeColor?: string;
    appName?: string;
    preferredMethod?: "upi" | "card" | "netbanking" | "wallet";
  } = {},
): Promise<CheckoutOutcome> {
  if (!order.keyId) {
    throw new ApiError("unconfigured", "Razorpay Key ID is missing.");
  }
  if (!order.gatewayOrderId) {
    throw new ApiError("validation", "No Razorpay order ID found to pay for.");
  }
  const Razorpay = await loadRazorpayCheckout();

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const instance = new Razorpay({
      key: order.keyId,
      amount: order.amountInPaise,
      currency: order.currency || "INR",
      name: options.appName ?? "QuickPress",
      description: options.description ?? (order.notes?.["purpose"] as string) ?? "Laundry Order Payment",
      order_id: order.gatewayOrderId,
      prefill: {
        name: options.profile?.name ?? "",
        email: options.profile?.email ?? "",
        contact: options.profile?.contact ?? "",
        ...(options.preferredMethod ? { method: options.preferredMethod } : {}),
      },
      notes: order.notes,
      theme: { color: options.themeColor ?? "#0c831f" },
      modal: {
        ondismiss: () =>
          finish({
            status: "dismissed",
            reason: "Payment window was closed before completion.",
            code: "checkout_dismissed",
          }),
      },
      handler: (response: RazorpaySuccessPayload) => finish({ status: "success", payload: response }),
    } as Record<string, unknown>);

    instance.on("payment.failed", (raw) => {
      const error = (raw as { error?: { description?: string; code?: string } }).error;
      finish({
        status: "failed",
        reason: error?.description ?? "Payment failed at Razorpay gateway.",
        code: error?.code ?? "payment_failed",
      });
    });

    instance.open();
  });
}
