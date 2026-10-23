/**
 * QuickPress Smart Device & Mobile App Redirection Utility
 * 
 * Automatically detects mobile phones and tablets (Android, iPhone, iPad)
 * and deep-links directly to the installed QuickPress Customer app.
 * If not installed, seamlessly falls back to the Google Play Store or Apple App Store.
 * 
 * Protects SEO crawlers (Googlebot) and B2B partner routes (#b2b, #b2b-partner).
 */

export const PLAY_STORE_CUSTOMER_URL =
  "https://play.google.com/store/apps/details?id=com.quickpress.customer";

export const APP_STORE_CUSTOMER_URL =
  "https://apps.apple.com/app/quickpress-laundry/id6449000000";

export const APK_CUSTOMER_DOWNLOAD_URL =
  "/apks/QuickPress-Customer.apk";

export const ANDROID_INTENT_CUSTOMER_URL =
  "intent://home#Intent;scheme=com.quickpress.customer;package=com.quickpress.customer;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.quickpress.customer;end";

export const IOS_CUSTOM_SCHEME_URL =
  "com.quickpress.customer://open";

/**
 * Checks whether the visitor is a search engine bot (Googlebot, Bingbot, etc.)
 * Crawlers MUST NEVER be redirected to prevent de-indexing in Google Search.
 */
export function isSearchEngineCrawler(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const botRegex = /bot|googlebot|crawler|spider|robot|crawling|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|whatsapp|twitterbot|linkedinbot/i;
  return botRegex.test(ua);
}

/**
 * Checks whether the current device is a Mobile Phone or Tablet.
 * (Android phone, Android tablet, iPhone, iPad, iPod, Windows Mobile, etc.)
 */
export function isMobileOrTabletDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  // 1. User Agent Inspection
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || "").toLowerCase();
  const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|kindle|silk|touch/i;
  const isMobileUA = mobileRegex.test(ua);

  // 2. iPadOS 13+ Check (reports MacIntel but has touch points)
  const isIPadOS =
    typeof navigator.platform === "string" &&
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1;

  // 3. Screen Dimensions + Coarse Pointer Check
  const isSmallScreen = window.innerWidth <= 1024;
  const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  return isMobileUA || isIPadOS || (isSmallScreen && isTouchDevice);
}

/**
 * Checks whether the user is on an Apple device (iPhone, iPad).
 */
export function isAppleDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS;
}

/**
 * Checks if the current page should be exempted from auto-redirection
 * (e.g. B2B partner registration, privacy policy review, or explicit ?web=true bypass).
 */
export function shouldBypassRedirect(): boolean {
  if (typeof window === "undefined") return true;

  // Search bots always bypass
  if (isSearchEngineCrawler()) return true;

  // Explicit URL query bypass
  const search = window.location.search;
  if (search.includes("no_redirect") || search.includes("view=web") || search.includes("mode=desktop")) {
    return true;
  }

  // Session storage bypass (if user clicked "Continue to Web" in this browser tab)
  try {
    if (sessionStorage.getItem("qp_web_bypass") === "1") {
      return true;
    }
  } catch {
    // ignore storage access errors
  }

  // Route hash bypass for B2B partner registration
  const hash = (window.location.hash || "").toLowerCase();
  if (hash === "#b2b" || hash === "#b2b-partner") {
    return true;
  }

  return false;
}

/**
 * Sets session bypass when user explicitly opts to view the desktop website on mobile.
 */
export function setWebBypass() {
  try {
    sessionStorage.setItem("qp_web_bypass", "1");
  } catch {
    // ignore
  }
}

/**
 * Dispatches the smart redirection to the installed app or relevant app store.
 */
export function triggerSmartAppRedirect() {
  if (typeof window === "undefined") return;
  if (shouldBypassRedirect()) return;

  const isApple = isAppleDevice();

  if (isApple) {
    // iOS: Try custom scheme, fallback to App Store after delay
    const start = Date.now();
    window.location.href = IOS_CUSTOM_SCHEME_URL;

    setTimeout(() => {
      // If user is still in the browser after 1500ms, the app wasn't opened
      if (Date.now() - start < 2000) {
        window.location.href = APP_STORE_CUSTOMER_URL;
      }
    }, 1500);
  } else {
    // Android: Use official Android Intent with built-in Play Store fallback
    window.location.href = ANDROID_INTENT_CUSTOMER_URL;
  }
}
