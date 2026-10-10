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
    if (previous && !windowRazorpay()) {
      // Remove stale/failed script node to ensure a clean network retry
      try {
        previous.remove();
      } catch {}
    }
    const script = document.createElement("script");
    const settle = () => {
      const ctor = windowRazorpay();
      if (ctor) resolve(ctor);
      else reject(new ApiError("unconfigured", "Razorpay Checkout failed to initialise."));
    };
    script.addEventListener("load", settle);
    script.addEventListener("error", () => {
      loader = null;
      try {
        script.remove();
      } catch {}
      reject(new ApiError("network", "Could not reach Razorpay CDN. Please check your connection."));
    });
    script.src = CHECKOUT_SRC;
    script.async = true;
    document.head.appendChild(script);
  });
  return loader;
}

export type CheckoutProfile = {
  name?: string | undefined;
  email?: string | undefined;
  contact?: string | undefined;
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

export type CheckoutCardDetails = {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  name?: string | undefined;
};

export type CheckoutOptions = {
  description?: string | undefined;
  profile?: CheckoutProfile | undefined;
  themeColor?: string | undefined;
  appName?: string | undefined;
  preferredMethod?: "upi" | "card" | "netbanking" | "wallet" | undefined;
  upiAppPackage?: string | undefined;
  vpa?: string | undefined;
  bank?: string | undefined;
  wallet?: string | undefined;
  card?: CheckoutCardDetails | undefined;
};

/**
 * Opens Razorpay Checkout modal for a server-created order.
 * Automatically selects Native Android Razorpay SDK if available, or Web Checkout SDK.
 * Supports direct headless intent routing (Zomato-style 1-Click UPI/Card/NetBanking).
 */
export async function openRazorpayCheckout(
  order: RazorpayOrderResult,
  options: CheckoutOptions = {},
): Promise<CheckoutOutcome> {
  if (!order.keyId) {
    throw new ApiError("unconfigured", "Razorpay Key ID is missing.");
  }
  if (!order.gatewayOrderId) {
    throw new ApiError("validation", "No Razorpay order ID found to pay for.");
  }

  // Normalize Indian phone number for Razorpay prefill
  let normalizedContact = (options.profile?.contact || "").replace(/\D/g, "");
  if (normalizedContact.length === 12 && normalizedContact.startsWith("91")) {
    normalizedContact = normalizedContact.slice(2);
  } else if (normalizedContact.length > 10) {
    normalizedContact = normalizedContact.slice(-10);
  }

  const razorpayPayload: Record<string, any> = {
    key: order.keyId,
    amount: order.amountInPaise,
    currency: order.currency || "INR",
    name: options.appName ?? "QuickPress",
    description: options.description ?? (order.notes?.["purpose"] as string) ?? "Laundry Order Payment",
    order_id: order.gatewayOrderId,
    prefill: {
      name: options.profile?.name ?? "",
      email: options.profile?.email ?? "",
      contact: normalizedContact,
      ...(options.preferredMethod ? { method: options.preferredMethod } : {}),
      ...(options.vpa ? { vpa: options.vpa } : {}),
      ...(options.bank ? { bank: options.bank } : {}),
      ...(options.wallet ? { wallet: options.wallet } : {}),
    },
    notes: order.notes,
    theme: { color: options.themeColor ?? "#0c831f" },
  };

  // Direct Method Routing (Zomato-style 1-Click Intent / Direct 3DS)
  if (options.preferredMethod === "upi") {
    razorpayPayload.method = "upi";
    if (options.upiAppPackage) {
      razorpayPayload["_[flow]"] = "intent";
      razorpayPayload.upi_app_package_name = options.upiAppPackage;
    }
    if (options.vpa) {
      razorpayPayload.vpa = options.vpa;
    }
  } else if (options.preferredMethod === "card") {
    razorpayPayload.method = "card";
    if (options.card) {
      razorpayPayload["card[number]"] = options.card.number.replace(/\s/g, "");
      razorpayPayload["card[expiry_month]"] = options.card.expiryMonth;
      razorpayPayload["card[expiry_year]"] = options.card.expiryYear;
      razorpayPayload["card[cvv]"] = options.card.cvv;
      if (options.card.name) {
        razorpayPayload["card[name]"] = options.card.name;
      }
    }
  } else if (options.preferredMethod === "netbanking") {
    razorpayPayload.method = "netbanking";
    if (options.bank) {
      razorpayPayload.bank = options.bank;
    }
  } else if (options.preferredMethod === "wallet") {
    razorpayPayload.method = "wallet";
    if (options.wallet) {
      razorpayPayload.wallet = options.wallet;
    }
  }

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

      const handleSuccess = (evt: CustomEvent<{ code: number; message: string; data: string | Record<string, unknown> }>) => {
        const rawData = evt.detail?.data;
        let detail: Record<string, any> = {};

        if (typeof rawData === "string") {
          try {
            detail = JSON.parse(rawData || "{}");
          } catch {
            detail = {};
          }
        } else if (rawData && typeof rawData === "object") {
          detail = rawData as Record<string, any>;
        }

        const paymentId =
          detail.razorpay_payment_id ||
          detail.payment_id ||
          (typeof evt.detail?.message === "string" && evt.detail.message !== "success" ? evt.detail.message : "") ||
          "";

        const orderId =
          detail.razorpay_order_id ||
          detail.order_id ||
          order.gatewayOrderId;

        const signature =
          detail.razorpay_signature ||
          detail.signature ||
          "";

        finish({
          status: "success",
          payload: {
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature,
          },
        });
      };

      const handleError = (evt: CustomEvent<{ code: number; message: string; data?: any }>) => {
        const code = Number(evt.detail?.code ?? -1);
        const rawMsg = evt.detail?.message || "";

        // Parse possible embedded JSON error message from Razorpay Android SDK
        let friendlyReason = rawMsg;
        try {
          if (rawMsg.startsWith("{") && rawMsg.endsWith("}")) {
            const parsed = JSON.parse(rawMsg);
            if (parsed?.error?.description) {
              friendlyReason = parsed.error.description;
            }
          }
        } catch {}

        // In Razorpay Android SDK:
        // Checkout.PAYMENT_CANCELED = 0 (user pressed back button)
        // Checkout.NETWORK_ERROR = 2 (lost internet connectivity)
        if (code === 0) {
          finish({
            status: "dismissed",
            reason: friendlyReason || "Payment window was closed.",
            code: "checkout_dismissed",
          });
        } else if (code === 2) {
          finish({
            status: "failed",
            reason: "Internet connection was lost during payment. Please check your data connection and retry.",
            code: "network_error",
          });
        } else {
          finish({
            status: "failed",
            reason: friendlyReason || "Payment failed at Razorpay gateway.",
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
