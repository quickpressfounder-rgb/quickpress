import QRCode from "qrcode";

export const DEFAULT_MERCHANT_VPA =
  (import.meta.env["VITE_MERCHANT_UPI_VPA"] as string | undefined)?.trim() || "quickpress@icici";
export const DEFAULT_MERCHANT_NAME =
  (import.meta.env["VITE_MERCHANT_NAME"] as string | undefined)?.trim() || "QuickPress Laundry";

export interface UpiUriOptions {
  vpa?: string;
  payeeName?: string;
  amount: number;
  txnRef: string;
  note?: string;
}

/**
 * Builds standard NPCI-compliant UPI URI
 */
export function buildUpiUri(options: UpiUriOptions): string {
  const vpa = (options.vpa || DEFAULT_MERCHANT_VPA).trim();
  const name = encodeURIComponent(options.payeeName || DEFAULT_MERCHANT_NAME);
  const amount = Math.max(1, options.amount).toFixed(2);
  const ref = encodeURIComponent(options.txnRef);
  const note = encodeURIComponent(options.note || "QuickPress Laundry Order");

  return `upi://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR&tr=${ref}&tn=${note}`;
}

/**
 * Checks if the current client is a smartphone/tablet (Android or iOS)
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isTouch = navigator.maxTouchPoints > 1;
  const isMobileUa = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  return isMobileUa || (isTouch && window.innerWidth < 768);
}

export type UpiAppTarget = "phonepe" | "supermoney" | "famapp" | "gpay" | "paytm" | "cred" | "amazonpay" | "bhim" | "whatsapp" | "navi" | "any";

export type InstalledUpiApp = {
  packageName: string;
  appName: string;
  appId?: string;
};

declare global {
  interface Window {
    AndroidUpiLauncher?: {
      openUpiApp: (uriStr: string, packageName?: string) => boolean;
      getInstalledUpiApps?: () => string;
    };
    NativeRazorpay?: {
      openRazorpay: (optionsJson: string) => void;
      getInstalledUpiApps?: () => string;
    };
  }
}

export const ANDROID_PACKAGES: Record<string, string> = {
  phonepe: "com.phonepe.app",
  gpay: "com.google.android.apps.nbu.paisa.user",
  paytm: "net.one97.paytm",
  supermoney: "in.supermoney.android",
  famapp: "com.famorganizer",
  cred: "com.dreamplug.androidapp",
  amazonpay: "in.amazon.mShop.android.shopping",
  bhim: "in.org.npci.upiapp",
  whatsapp: "com.whatsapp",
  navi: "com.naviapp",
  any: "",
};

/**
 * Queries Android device via native bridge to get the real-time list of installed UPI apps.
 */
export function detectInstalledUpiApps(): InstalledUpiApp[] {
  if (typeof window === "undefined") return [];

  try {
    if (window.AndroidUpiLauncher && typeof window.AndroidUpiLauncher.getInstalledUpiApps === "function") {
      const raw = window.AndroidUpiLauncher.getInstalledUpiApps();
      const list = JSON.parse(raw || "[]") as InstalledUpiApp[];
      if (Array.isArray(list) && list.length > 0) return list;
    }
    if (window.NativeRazorpay && typeof window.NativeRazorpay.getInstalledUpiApps === "function") {
      const raw = window.NativeRazorpay.getInstalledUpiApps();
      const list = JSON.parse(raw || "[]") as InstalledUpiApp[];
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (err) {
    console.warn("[detectInstalledUpiApps] Bridge error:", err);
  }

  return [];
}

/**
 * Directly launches the requested UPI App on the user's mobile device.
 * Bypasses intermediate gateway popups and goes straight into PhonePe/Supermoney/FamApp/GPay/Paytm!
 */
export function launchDirectUpiApp(target: UpiAppTarget | string, upiUri: string, specificPackage?: string): void {
  if (typeof window === "undefined") return;

  const pkg = specificPackage || ANDROID_PACKAGES[target] || (target.includes(".") ? target : "");

  // 1. If running inside Native Android APK (Capacitor), trigger Android Intent directly via native bridge
  if (window.AndroidUpiLauncher && typeof window.AndroidUpiLauncher.openUpiApp === "function") {
    const success = window.AndroidUpiLauncher.openUpiApp(upiUri, pkg);
    if (success) {
      return;
    }
  }

  const isAndroid = /android/i.test(navigator.userAgent || "");
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "");

  let finalUrl = upiUri;
  const queryPart = upiUri.replace(/^upi:\/\/pay\??/, "");

  if (isAndroid) {
    if (pkg) {
      finalUrl = `intent://pay?${queryPart}#Intent;scheme=upi;package=${pkg};S.browser_fallback_url=${encodeURIComponent(upiUri)};end`;
    } else {
      finalUrl = upiUri;
    }
  } else if (isIOS) {
    switch (target) {
      case "phonepe":
        finalUrl = `phonepe://pay?${queryPart}`;
        break;
      case "supermoney":
        finalUrl = `supermoney://pay?${queryPart}`;
        break;
      case "famapp":
        finalUrl = `fampay://pay?${queryPart}`;
        break;
      case "gpay":
        finalUrl = `tez://upi/pay?${queryPart}`;
        break;
      case "paytm":
        finalUrl = `paytmmp://pay?${queryPart}`;
        break;
      case "cred":
        finalUrl = `cred://pay?${queryPart}`;
        break;
      default:
        finalUrl = upiUri;
        break;
    }
  }

  // Trigger directly via standard mobile deep-link handler
  try {
    window.location.href = finalUrl;
  } catch {
    const a = document.createElement("a");
    a.href = finalUrl;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 600);
  }
}

/**
 * Generates dynamic high-resolution QR code data URL from UPI URI for Laptop / Desktop screens
 */
export async function generateUpiQrDataUrl(upiUri: string): Promise<string> {
  try {
    return await QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 1.5,
      color: {
        dark: "#0a0a0a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.error("Failed to generate UPI QR code:", err);
    return "";
  }
}
