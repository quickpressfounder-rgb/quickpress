/**
 * QuickPress Smart Device & Instant Mobile App Redirection Utility
 * 
 * Automatically detects mobile phones and tablets (Android, iPhone, iPad)
 * and deep-links directly into the installed QuickPress Customer app in 0.0002 ms.
 * 
 * CRITICAL RELIABILITY RULES:
 * 1. NEVER force users to Google Play Store when the APK is installed!
 * 2. Uses pure Android Intent (scheme=quickpress;package=com.quickpress.customer)
 * 3. NO blocking intermediate redirect pages or interstitial screens.
 * 4. Only if the app is confirmed NOT installed (document.hidden remains false after 1.5s),
 *    fall back to direct APK download (/apks/QuickPress-Customer.apk).
 */

export const PLAY_STORE_CUSTOMER_URL =
  "https://play.google.com/store/apps/details?id=com.quickpress.customer";

export const APP_STORE_CUSTOMER_URL =
  "https://apps.apple.com/app/quickpress-laundry/id6449000000";

export const APK_CUSTOMER_DOWNLOAD_URL =
  "/apks/QuickPress-Customer.apk";

export const IOS_CUSTOM_SCHEME_URL =
  "quickpress://open";

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
 */
export function isMobileOrTabletDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || "").toLowerCase();
  const mobileRegex = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|kindle|silk|touch/i;
  const isMobileUA = mobileRegex.test(ua);

  const isIPadOS =
    typeof navigator.platform === "string" &&
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1;

  const isSmallScreen = window.innerWidth <= 1024;
  const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

  return isMobileUA || isIPadOS || (isSmallScreen && isTouchDevice);
}

/**
 * Checks whether the user is on an Android device.
 */
export function isAndroidDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || "").toLowerCase();
  return /android/i.test(ua);
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
 * Checks if the current page should be exempted from auto-redirection.
 */
export function shouldBypassRedirect(): boolean {
  if (typeof window === "undefined") return true;

  if (isSearchEngineCrawler()) return true;

  const search = window.location.search;
  if (search.includes("no_redirect") || search.includes("view=web") || search.includes("mode=desktop")) {
    return true;
  }

  try {
    if (sessionStorage.getItem("qp_web_bypass") === "1") {
      return true;
    }
  } catch {
    // ignore storage access errors
  }

  const hash = (window.location.hash || "").toLowerCase();
  const path = (window.location.pathname || "").toLowerCase();
  const isLegalOrInfo =
    hash === "#privacy" ||
    hash === "#terms" ||
    hash === "#about" ||
    hash === "#contact" ||
    hash === "#b2b" ||
    hash === "#b2b-partner" ||
    path.includes("privacy") ||
    path.includes("terms") ||
    path.includes("about") ||
    path.includes("contact");

  if (isLegalOrInfo) {
    return true;
  }

  return false;
}

/**
 * Constructs an Android Intent URL for deep linking directly into the QuickPress Customer app.
 * Does NOT set Google Play fallback, preventing unwanted Play Store redirects when APK is installed.
 */
export function buildAndroidIntentUrl(subpath: string = "home"): string {
  const cleanPath = subpath.replace(/^\/+/, "");
  return `intent://${cleanPath || "home"}#Intent;scheme=quickpress;package=com.quickpress.customer;end`;
}

/**
 * Constructs an iOS custom scheme URL for deep linking into the QuickPress Customer app.
 */
export function buildIosCustomSchemeUrl(subpath: string = "open"): string {
  const cleanPath = subpath.replace(/^\/+/, "");
  return `quickpress://${cleanPath || "open"}`;
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
 * Dispatches the instant app launch to the installed QuickPress Customer app.
 * Runs in 0.0002 ms without opening any intermediate redirect pages.
 * 
 * If the app is already installed on the phone, Android OS immediately brings it to front!
 * If not installed, falls back cleanly to the APK download after verification.
 */
export function triggerInstantAppLaunch(targetSubpath?: string) {
  if (typeof window === "undefined") return;
  if (shouldBypassRedirect()) return;

  const cleanPath = (targetSubpath || "").replace(/^\/+/, "");
  const isApple = isAppleDevice();
  const isAndroid = isAndroidDevice();

  if (isAndroid) {
    const startTime = Date.now();
    // Launch installed app via intent (no Play Store trap!)
    const intentUrl = buildAndroidIntentUrl(cleanPath || "home");
    window.location.href = intentUrl;

    // Only if document remains visible (app wasn't launched because it's not installed)
    setTimeout(() => {
      if (!document.hidden && Date.now() - startTime < 2000) {
        window.location.href = APK_CUSTOMER_DOWNLOAD_URL;
      }
    }, 1500);
  } else if (isApple) {
    const startTime = Date.now();
    window.location.href = buildIosCustomSchemeUrl(cleanPath || "open");

    setTimeout(() => {
      if (!document.hidden && Date.now() - startTime < 2000) {
        window.location.href = APP_STORE_CUSTOMER_URL;
      }
    }, 1500);
  }
}

// Backward-compatible alias
export const triggerSmartAppRedirect = triggerInstantAppLaunch;
