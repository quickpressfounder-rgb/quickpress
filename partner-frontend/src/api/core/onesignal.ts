/**
 * OneSignal Web & Mobile Push Notification Engine — QuickPress Partner.
 *
 * Provides:
 * 1. Safe Client initialization guarded against unconfigured web push origins
 * 2. Partner user identification (login / logout) mapping
 * 3. High-priority foreground notification listener & continuous Zomato siren alarm trigger
 */

import { startOrderAlarm } from "@/lib/order-alarm";

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
let isConfiguredForWebPush = false;

/**
 * Initializes OneSignal Web SDK for Partner Hub.
 */
export function initOneSignal(): void {
  if (typeof window === "undefined" || isInitialized) return;

  // If App ID is missing or is the placeholder ID without web push configured, skip gracefully
  if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.includes("184bda82")) {
    return;
  }
  isInitialized = true;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (!OneSignal || typeof OneSignal.init !== "function") return;

      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false,
        },
      });

      isConfiguredForWebPush = true;

      // When an incoming order notification is received in foreground, ring the Zomato alarm!
      OneSignal?.Notifications?.addEventListener?.("foregroundWillDisplay", (event: any) => {
        try {
          const notif = event?.notification;
          const data = notif?.additionalData || {};
          const isOrder =
            notif?.title?.includes("ORDER") ||
            data?.kind === "order-new" ||
            data?.type === "ORDER_CREATED";

          if (isOrder) {
            startOrderAlarm(data?.orderCode || data?.orderId);
          }
        } catch {
          // Quiet
        }
      });

      // Listen for subscription changes and sync with backend
      OneSignal?.User?.PushSubscription?.addEventListener?.("change", async (event: any) => {
        try {
          const subscriptionId = event?.current?.id;
          if (subscriptionId) {
            await syncPlayerIdWithBackend(subscriptionId);
          }
        } catch {
          // Quiet
        }
      });
    } catch (err: any) {
      isConfiguredForWebPush = false;
      const msg = String(err?.message || err);
      if (msg.includes("not configured for web push")) {
        // App not configured for web push in OneSignal console; suppress cleanly
        return;
      }
      console.warn("[OneSignal-Partner] Init note:", err);
    }
  });
}

/**
 * Syncs the OneSignal player / subscription ID with the Python backend.
 */
async function syncPlayerIdWithBackend(playerId: string): Promise<void> {
  try {
    const token =
      localStorage.getItem("qp_partner_token") ||
      sessionStorage.getItem("qp_partner_token") ||
      localStorage.getItem("qp_access_token");
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
 * Logs in the partner in OneSignal using the Partner User ID.
 */
export async function onesignalLogin(partnerId: string): Promise<void> {
  if (typeof window === "undefined" || !partnerId) return;
  if (!isConfiguredForWebPush && (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.includes("184bda82"))) {
    return;
  }

  initOneSignal();
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (!isConfiguredForWebPush) return;
      if (OneSignal && typeof OneSignal.login === "function") {
        await OneSignal.login(partnerId);
        const subscriptionId = OneSignal.User?.PushSubscription?.id;
        if (subscriptionId) {
          await syncPlayerIdWithBackend(subscriptionId);
        }
      }
    } catch {
      // Gracefully prevent unhandled login crashes if OneSignal backend is unconfigured
    }
  });
}

/**
 * Logs out the partner from OneSignal on sign-out.
 */
export async function onesignalLogout(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isConfiguredForWebPush) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (OneSignal && typeof OneSignal.logout === "function") {
        await OneSignal.logout();
      }
    } catch {
      // Quiet
    }
  });
}

/**
 * Requests push notification permission from the partner.
 */
export async function requestOneSignalPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !isConfiguredForWebPush) return false;

  initOneSignal();
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        if (!OneSignal?.Notifications?.requestPermission) {
          resolve(false);
          return;
        }
        const permission = await OneSignal.Notifications.requestPermission();
        resolve(permission === true || permission === "granted");
      } catch {
        resolve(false);
      }
    });
  });
}
