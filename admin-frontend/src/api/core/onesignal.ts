/**
 * OneSignal Web Push Notification Engine — QuickPress Admin.
 */

export const ONESIGNAL_APP_ID = "184bda82-7c5b-4319-a977-4fcffbcca270";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
    OneSignal?: any;
  }
}

let isInitialized = false;

export function initOneSignal(): void {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false,
        },
      });
    } catch (err: any) {
      const isUnconfigured =
        String(err?.message || "").includes("not configured") ||
        String(err?.message || "").includes("App not configured");
      if (!isUnconfigured) {
        console.warn("[OneSignal-Admin] Init warning:", err);
      }
    }
  });
}

export async function onesignalLogin(adminId: string): Promise<void> {
  if (typeof window === "undefined" || !adminId) return;

  initOneSignal();
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      await OneSignal.login(adminId);
    } catch (err) {
      console.warn("[OneSignal-Admin] Login error:", err);
    }
  });
}

export async function onesignalLogout(): Promise<void> {
  if (typeof window === "undefined") return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      await OneSignal.logout();
    } catch (err) {
      console.warn("[OneSignal-Admin] Logout error:", err);
    }
  });
}
