/**
 * QuickPress Admin — Firebase Cloud Messaging (FCM) Web Push Client.
 *
 * Handles critical operations alerts, SLA notifications, and system dispatches.
 */

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config";
import { apiPostJson, apiDeleteJson } from "./transport";
import { toast } from "sonner";

let messagingInstance: any = null;
let currentToken: string | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export async function initFirebaseMessaging() {
  if (!isPushNotificationSupported() || !isFirebaseConfigured()) {
    return null;
  }

  if (messagingInstance) {
    return messagingInstance;
  }

  try {
    const [{ initializeApp, getApps, getApp }, { getMessaging, isSupported }] =
      await Promise.all([import("firebase/app"), import("firebase/messaging")]);

    const supported = await isSupported();
    if (!supported) {
      console.debug("[Admin-FCM] Messaging not supported in this browser.");
      return null;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig());

    if ("serviceWorker" in navigator) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        );
      } catch (swErr) {
        console.debug("[Admin-FCM] Service worker registration notice:", swErr);
      }
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.debug("[Admin-FCM] Init error:", err);
    return null;
  }
}

export async function requestPushNotificationPermission(): Promise<string | null> {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    const messaging = await initFirebaseMessaging();
    if (!messaging) return null;

    const { getToken } = await import("firebase/messaging");
    const config = firebaseConfig();
    const vapidKey =
      (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY ||
      config.apiKey ||
      undefined;

    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: serviceWorkerRegistration || undefined,
    });

    if (token) {
      currentToken = token;
      try {
        await apiPostJson("/api/notifications/fcm-token", {
          token,
          device: "web",
          deviceType: "web",
          role: "admin",
        });
      } catch (apiErr) {
        console.debug("[Admin-FCM] Token sync notice:", apiErr);
      }
      return token;
    }
  } catch (err) {
    console.debug("[Admin-FCM] Push token request notice:", err);
  }
  return null;
}

export async function setupForegroundMessageListener(
  onCustomMessage?: (payload: any) => void
): Promise<(() => void) | null> {
  const messaging = await initFirebaseMessaging();
  if (!messaging) return null;

  try {
    const { onMessage } = await import("firebase/messaging");

    const unsubscribe = onMessage(messaging, (payload) => {
      const notification = payload.notification || {};
      const data = payload.data || {};

      const title = notification.title || data.title || "QuickPress System Alert";
      const body = notification.body || data.body || data.message || "Admin broadcast event received.";
      const clickUrl = data.url || "/notifications";

      toast(title, {
        description: body,
        action: {
          label: "View Alert",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.href = clickUrl;
            }
          },
        },
      });

      if (onCustomMessage) {
        onCustomMessage(payload);
      }
    });

    return unsubscribe;
  } catch (err) {
    console.debug("[Admin-FCM] Error setting up message listener:", err);
    return null;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  if (currentToken) {
    try {
      await apiDeleteJson("/api/notifications/fcm-token", {
        params: { token: currentToken },
      });
    } catch {
      // Best-effort cleanup
    }
    currentToken = null;
  }
}
