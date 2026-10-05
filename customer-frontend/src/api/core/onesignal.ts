/**
 * OneSignal Web & Mobile Push Notification Engine — QuickPress.
 *
 * Provides:
 * 1. Safe client initialization only when a valid VITE_ONESIGNAL_APP_ID is present.
 * 2. User identification (login / logout) mapping to Backend JWT user ID.
 * 3. Synchronization of subscription IDs with FastAPI Backend.
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

export function isOneSignalEnabled(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      ONESIGNAL_APP_ID &&
      !ONESIGNAL_APP_ID.includes("184bda82") &&
      ONESIGNAL_APP_ID.trim().length > 10
  );
}

/**
 * Initializes OneSignal Web SDK safely if enabled.
 */
export function initOneSignal(): void {
  if (!isOneSignalEnabled() || isInitialized) return;
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
      OneSignal.User?.PushSubscription?.addEventListener?.("change", async (event: any) => {
        const subscriptionId = event?.current?.id;
        if (subscriptionId) {
          await syncPlayerIdWithBackend(subscriptionId);
        }
      });
    } catch (err) {
      console.debug("[OneSignal] Init notice:", err);
    }
  });
}

/**
 * Syncs the OneSignal player / subscription ID with the Python backend.
 */
async function syncPlayerIdWithBackend(playerId: string): Promise<void> {
  try {
    const token =
      localStorage.getItem("qp_access_token") ||
      sessionStorage.getItem("qp_access_token");
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
  if (!isOneSignalEnabled() || !userId) return;

  initOneSignal();
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (typeof OneSignal?.login === "function") {
        await OneSignal.login(userId);
        const subscriptionId = OneSignal.User?.PushSubscription?.id;
        if (subscriptionId) {
          await syncPlayerIdWithBackend(subscriptionId);
        }
      }
    } catch (err) {
      console.debug("[OneSignal] Login notice:", err);
    }
  });
}

/**
 * Logs out the user from OneSignal on sign-out.
 */
export async function onesignalLogout(): Promise<void> {
  if (!isOneSignalEnabled()) return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (typeof OneSignal?.logout === "function") {
        await OneSignal.logout();
      }
    } catch (err) {
      console.debug("[OneSignal] Logout notice:", err);
    }
  });
}

/**
 * Requests push notification permission from the user.
 */
export async function requestOneSignalPermission(): Promise<boolean> {
  if (!isOneSignalEnabled()) return false;

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
