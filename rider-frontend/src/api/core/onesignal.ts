/**
 * OneSignal Web & Mobile Push Notification Engine — QuickPress Rider Captain.
 *
 * Provides:
 * 1. Client initialization with App ID 184bda82-7c5b-4319-a977-4fcffbcca270
 * 2. User identification (login / logout) mapping to Backend Rider ID.
 * 3. High-priority foreground notification listener & continuous siren alarm trigger.
 */

import { startOrderAlertRing } from "@/lib/order-alert-sound";

export const ONESIGNAL_APP_ID =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_ONESIGNAL_APP_ID) ||
  "";

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
    OneSignal?: any;
  }
}

let isInitialized = false;

/**
 * Initializes OneSignal Web SDK for Rider Captain.
 */
export function initOneSignal(): void {
  if (typeof window === "undefined" || isInitialized) return;
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.includes("184bda82")) {
    // OneSignal App ID is not configured for Web Push in this environment.
    // Skip to prevent "App not configured for web push" warnings.
    return;
  }
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

      // When a new ride/order is assigned in foreground, ring high-pitch siren alarm
      OneSignal.Notifications?.addEventListener("foregroundWillDisplay", (event: any) => {
        try {
          const notif = event?.notification;
          const data = notif?.additionalData || {};
          const isTrip =
            notif?.title?.includes("ORDER") ||
            notif?.title?.includes("TRIP") ||
            notif?.title?.includes("ASSIGNED") ||
            data?.kind === "rider-assigned";

          if (isTrip) {
            startOrderAlertRing();
          }
        } catch (err) {
          // Quiet
        }
      });

      // Listen for subscription changes and sync with backend
      OneSignal.User?.PushSubscription?.addEventListener("change", async (event: any) => {
        const subscriptionId = event?.current?.id;
        if (subscriptionId) {
          await syncPlayerIdWithBackend(subscriptionId);
        }
      });
    } catch (err: any) {
      if (
        err?.message?.includes?.("not configured for web push") ||
        String(err).includes("not configured for web push")
      ) {
        return;
      }
      console.warn("[OneSignal-Rider] Init warning:", err);
    }
  });
}

/**
 * Syncs the OneSignal player / subscription ID with the Python backend.
 */
async function syncPlayerIdWithBackend(playerId: string): Promise<void> {
  try {
    const token = localStorage.getItem("qp_rider_token") || sessionStorage.getItem("qp_rider_token") || localStorage.getItem("qp_access_token");
    if (!token) return;

    await fetch("/api/notifications/onesignal/player-id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ playerId, deviceType: "web" }),
    });
  } catch {
    // Non-blocking sync
  }
}

/**
 * Logs in the rider in OneSignal using the Rider User ID.
 */
export async function onesignalLogin(riderId: string): Promise<void> {
  if (typeof window === "undefined" || !riderId) return;

  initOneSignal();
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (typeof OneSignal?.login === "function") {
        await OneSignal.login(riderId);
        const subscriptionId = OneSignal.User?.PushSubscription?.id;
        if (subscriptionId) {
          await syncPlayerIdWithBackend(subscriptionId);
        }
      }
    } catch {
      // quiet fallback in local development
    }
  });
}

/**
 * Logs out the rider from OneSignal on sign-out.
 */
export async function onesignalLogout(): Promise<void> {
  if (typeof window === "undefined") return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      await OneSignal.logout();
    } catch (err) {
      console.warn("[OneSignal-Rider] Logout error:", err);
    }
  });
}

/**
 * Requests push notification permission from the rider.
 */
export async function requestOneSignalPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  initOneSignal();
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        const permission = await OneSignal.Notifications.requestPermission();
        resolve(permission === true || permission === "granted");
      } catch {
        resolve(false);
      }
    });
  });
}
