/**
 * QuickPress App Store Redirection Utility
 * 
 * Automatically detects whether the user is on an iOS device (iPhone, iPad, iPod)
 * and redirects to the Apple App Store, or Google Play Store for Android & others.
 */

export const PLAY_STORE_URL = "https://play.google.com";
export const PLAY_STORE_PACKAGE_URL = "https://play.google.com/store/apps/details?id=com.quickpress.customer";
export const APP_STORE_URL = "https://apps.apple.com";

/**
 * Checks if the current user agent is an Apple iOS/iPadOS device.
 */
export function isAppleDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";

  // Standard iOS checks
  const isIOSUserAgent = /iPad|iPhone|iPod/i.test(ua);

  // Modern iPad check (iPadOS 13+ reports MacIntel but with multi-touch points)
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return isIOSUserAgent || isIPadOS;
}

/**
 * Checks if the current user agent is Android.
 */
export function isAndroidDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  return /Android/i.test(ua);
}

/**
 * Returns the relevant App Store URL for the user's platform.
 */
export function getStoreUrl(): string {
  return isAppleDevice() ? APP_STORE_URL : PLAY_STORE_URL;
}

/**
 * Main Get Started handler:
 * - iPhone / iPad -> Apple App Store
 * - Android / others -> Google Play Store
 * 
 * On mobile devices, sets window.location.href so the native App Store
 * or Google Play Store application triggers immediately.
 * On desktop computers, opens the store in a fresh tab.
 */
export function handleGetStartedRedirect(e?: React.SyntheticEvent | Event) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
  }

  const isApple = isAppleDevice();
  const isAndroid = isAndroidDevice();
  const targetUrl = isApple ? APP_STORE_URL : PLAY_STORE_URL;

  if (isApple || isAndroid) {
    // Native mobile app store trigger
    window.location.href = targetUrl;
  } else {
    // Desktop browser
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }
}
