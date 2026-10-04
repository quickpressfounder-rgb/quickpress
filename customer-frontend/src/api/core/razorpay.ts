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

declare global {
  interface Window {
    NativeRazorpay?: {
      openRazorpay: (optionsJson: string) => void;
    };
  }
}

export type CheckoutOutcome =
  | { status: "success"; payload: RazorpaySuccessPayload }
  | { status: "failed"; reason: string; code: string }
  | { status: "dismissed"; reason: string; code: "checkout_dismissed" };

/**
 * Opens Razorpay Checkout modal for a server-created order.
 * Automatically selects Native Android Razorpay SDK if available, or Web Checkout SDK.
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

  const razorpayPayload = {
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
  };

  // 1. Check if running inside Native Android APK with official Razorpay Native SDK
  if (typeof window !== "undefined" && window.NativeRazorpay && typeof window.NativeRazorpay.openRazorpay === "function") {
    return new Promise<CheckoutOutcome>((resolve) => {
      let settled = false;
      const cleanup = () => {
        window.removeEventListener("razorpay:success", handleSuccess as EventListener);
        window.removeEventListener("razorpay:error", handleError as EventListener);
      };

      const finish = (outcome: CheckoutOutcome) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(outcome);
      };

      const handleSuccess = (evt: CustomEvent<{ code: number; message: string; data: string }>) => {
        try {
          const detail = JSON.parse(evt.detail.data || "{}");
          finish({
            status: "success",
            payload: {
              razorpay_payment_id: detail.razorpay_payment_id || evt.detail.message,
              razorpay_order_id: detail.razorpay_order_id || order.gatewayOrderId,
              razorpay_signature: detail.razorpay_signature || "",
            },
          });
        } catch {
          finish({
            status: "success",
            payload: {
              razorpay_payment_id: evt.detail.message,
              razorpay_order_id: order.gatewayOrderId,
              razorpay_signature: "",
            },
          });
        }
      };

      const handleError = (evt: CustomEvent<{ code: number; message: string }>) => {
        const code = evt.detail.code;
        // In Razorpay Android SDK, code 0 or 2 represents user cancellation / back press
        if (code === 0 || code === 2) {
          finish({
            status: "dismissed",
            reason: evt.detail.message || "Payment cancelled.",
            code: "checkout_dismissed",
          });
        } else {
          finish({
            status: "failed",
            reason: evt.detail.message || "Payment failed at Razorpay gateway.",
            code: String(code || "payment_failed"),
          });
        }
      };

      window.addEventListener("razorpay:success", handleSuccess as EventListener);
      window.addEventListener("razorpay:error", handleError as EventListener);

      window.NativeRazorpay!.openRazorpay(JSON.stringify(razorpayPayload));
    });
  }

  // 2. Standard Web Browser Checkout SDK
  const Razorpay = await loadRazorpayCheckout();

  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const instance = new Razorpay({
      ...razorpayPayload,
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
