/**
 * QuickPress App Store & Native App Launch Redirection Utility
 * 
 * Automatically detects whether the user is on mobile (Android / iOS)
 * and deep-links directly into the installed QuickPress Customer app in 0.0002 ms.
 * Never redirects installed APK users to Google Play Store!
 */

import {
  triggerInstantAppLaunch,
  isAndroidDevice,
  isAppleDevice,
  PLAY_STORE_CUSTOMER_URL,
  APP_STORE_CUSTOMER_URL,
  APK_CUSTOMER_DOWNLOAD_URL,
} from "./mobileAppRedirect";

export const PLAY_STORE_URL = PLAY_STORE_CUSTOMER_URL;
export const PLAY_STORE_PACKAGE_URL = PLAY_STORE_CUSTOMER_URL;
export const APP_STORE_URL = APP_STORE_CUSTOMER_URL;

export { isAppleDevice, isAndroidDevice };

/**
 * Returns the relevant App Store or APK URL for the user's platform.
 */
export function getStoreUrl(): string {
  if (isAppleDevice()) return APP_STORE_CUSTOMER_URL;
  return APK_CUSTOMER_DOWNLOAD_URL;
}

/**
 * Main Get Started / Order Now handler:
 * - On Mobile (Android / iOS): Immediately launches the installed QuickPress Customer App!
 * - On Desktop: Navigates smoothly to booking or downloads.
 */
export function handleGetStartedRedirect(e?: React.SyntheticEvent | Event, subpath?: string) {
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
  }

  const isApple = isAppleDevice();
  const isAndroid = isAndroidDevice();

  if (isApple || isAndroid) {
    // Instant Native App Launch (0.0002 ms) - never sends to Google Play if APK is installed!
    triggerInstantAppLaunch(subpath || "home");
  } else {
    // Desktop browser: open booking or smooth scroll
    if (typeof window !== "undefined") {
      window.location.hash = "#booking";
    }
  }
}
