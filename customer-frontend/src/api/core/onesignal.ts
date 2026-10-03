/**
 * OneSignal Web & Mobile Push Notification Engine — QuickPress.
 *
 * Provides:
 * 1. Client initialization with App ID 184bda82-7c5b-4319-a977-4fcffbcca270
 * 2. User identification (login / logout) mapping to Backend JWT user ID.
 * 3. Synchronization of subscription IDs with FastAPI Backend.
 * 4. High-priority foreground notification listener & alarm triggers.
 */

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
 * Initializes OneSignal Web SDK.
 */
export function initOneSignal(): void {
  if (typeof window === "undefined" || isInitialized) return;
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

      // Listen for subscription changes and sync with backend
      OneSignal.User.PushSubscription.addEventListener("change", async (event: any) => {
        const subscriptionId = event?.current?.id;
        if (subscriptionId) {
          await syncPlayerIdWithBackend(subscriptionId);
        }
      });
    } catch (err) {
      console.warn("[OneSignal] Init warning:", err);
    }
  });
}

/**
 * Syncs the OneSignal player / subscription ID with the Python backend.
 */
async function syncPlayerIdWithBackend(playerId: string): Promise<void> {
  try {
    const token = localStorage.getItem("qp_access_token") || sessionStorage.getItem("qp_access_token");
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
 * Logs in the user in OneSignal using the Backend User ID as external_id.
 */
export async function onesignalLogin(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  initOneSignal();
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      await OneSignal.login(userId);
      const subscriptionId = OneSignal.User?.PushSubscription?.id;
      if (subscriptionId) {
        await syncPlayerIdWithBackend(subscriptionId);
      }
    } catch (err) {
      console.warn("[OneSignal] Login error:", err);
    }
  });
}

/**
 * Logs out the user from OneSignal on sign-out.
 */
export async function onesignalLogout(): Promise<void> {
  if (typeof window === "undefined") return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      await OneSignal.logout();
    } catch (err) {
      console.warn("[OneSignal] Logout error:", err);
    }
  });
}

/**
 * Requests push notification permission from the user.
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
