import QRCode from "qrcode";

export const DEFAULT_MERCHANT_VPA = "quickpress@icici";
export const DEFAULT_MERCHANT_NAME = "QuickPress Laundry";

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

export type UpiAppTarget = "phonepe" | "gpay" | "paytm" | "cred" | "any";

/**
 * Directly launches the requested UPI App on the user's mobile device.
 * Bypasses intermediate gateway popups and goes straight into PhonePe/GPay/Paytm!
 */
export function launchDirectUpiApp(target: UpiAppTarget, upiUri: string): void {
  if (typeof window === "undefined") return;

  const isAndroid = /android/i.test(navigator.userAgent || "");
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "");

  let finalUrl = upiUri;
  const queryPart = upiUri.replace(/^upi:\/\/pay\??/, "");

  if (isAndroid) {
    switch (target) {
      case "phonepe":
        // Direct PhonePe Android intent - launches PhonePe directly without intermediary gateway
        finalUrl = `intent://pay?${queryPart}#Intent;scheme=upi;package=com.phonepe.app;S.browser_fallback_url=${encodeURIComponent(upiUri)};end`;
        break;
      case "gpay":
        // Direct Google Pay Android intent
        finalUrl = `intent://pay?${queryPart}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;S.browser_fallback_url=${encodeURIComponent(upiUri)};end`;
        break;
      case "paytm":
        // Direct Paytm Android intent
        finalUrl = `intent://pay?${queryPart}#Intent;scheme=upi;package=net.one97.paytm;S.browser_fallback_url=${encodeURIComponent(upiUri)};end`;
        break;
      case "cred":
        // Direct CRED Android intent
        finalUrl = `intent://pay?${queryPart}#Intent;scheme=upi;package=com.dreamplug.androidapp;S.browser_fallback_url=${encodeURIComponent(upiUri)};end`;
        break;
      case "any":
      default:
        // Universal Android Intent: Triggers Android system chooser with ONLY user-installed UPI apps!
        finalUrl = upiUri;
        break;
    }
  } else if (isIOS) {
    switch (target) {
      case "phonepe":
        finalUrl = `phonepe://pay?${queryPart}`;
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
