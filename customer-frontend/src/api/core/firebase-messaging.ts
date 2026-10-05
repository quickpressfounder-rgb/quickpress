/**
 * QuickPress Customer — Firebase Cloud Messaging (FCM) Web Push Client.
 *
 * Handles:
 * - Service Worker registration (/firebase-messaging-sw.js)
 * - Browser Notification Permission requests
 * - FCM Web Push Registration Token generation
 * - Syncing device push token with FastAPI backend (/api/notifications/fcm-token)
 * - Foreground push message listener with Toast / UI dispatch
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

/** Initialize Firebase Messaging and Service Worker. */
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
      console.debug("[FCM] Firebase Messaging is not supported in this browser environment.");
      return null;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig());

    // Register service worker if not already registered
    if ("serviceWorker" in navigator) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        );
      } catch (swErr) {
        console.debug("[FCM] Service worker registration notice:", swErr);
      }
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.debug("[FCM] Failed to initialize Firebase Messaging:", err);
    return null;
  }
}

/** Request notification permission and register FCM device token with backend. */
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

    const options: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {};
    if (vapidKey) options.vapidKey = vapidKey;
    if (serviceWorkerRegistration) options.serviceWorkerRegistration = serviceWorkerRegistration;

    const token = await getToken(messaging, Object.keys(options).length > 0 ? options : undefined);

    if (token) {
      currentToken = token;
      // Sync token with FastAPI backend
      try {
        await apiPostJson("/api/notifications/fcm-token", {
          token,
          device: "web",
          deviceType: "web",
        });
      } catch (apiErr) {
        console.debug("[FCM] Token backend sync notice:", apiErr);
      }
      return token;
    }
  } catch (err) {
    console.debug("[FCM] Notification token request notice:", err);
  }
  return null;
}

/** Subscribe to foreground messages while the app is active. */
export async function setupForegroundMessageListener(
  onCustomMessage?: (payload: any) => void
): Promise<(() => void) | null> {
  const messaging = await initFirebaseMessaging();
  if (!messaging) return null;

  try {
    const { onMessage } = await import("firebase/messaging");

    const unsubscribe = onMessage(messaging, (payload) => {
      const notification = payload.notification || {};
      const data = (payload.data || {}) as Record<string, string | undefined>;

      const title = notification.title || data["title"] || "🔔 QuickPress Update";
      const body = notification.body || data["body"] || data["message"] || "You have a new update.";
      const clickUrl = data["url"] || (data["orderId"] ? `/track/${data["orderId"]}` : "/notifications");

      // Render interactive Sonner toast
      toast(title, {
        description: body,
        action: clickUrl
          ? {
              label: "View",
              onClick: () => {
                if (typeof window !== "undefined") {
                  window.location.href = clickUrl;
                }
              },
            }
          : undefined,
      });

      // Dispatch to mobile phone's native notification tray
      import("@/lib/notifications")
        .then(({ triggerMobileOsNotification }) => {
          void triggerMobileOsNotification({
            title,
            body,
            orderId: data["orderId"],
            url: clickUrl,
          });
        })
        .catch(() => {});

      if (onCustomMessage) {
        onCustomMessage(payload);
      }
    });

    return unsubscribe;
  } catch (err) {
    console.debug("[FCM] Error setting up foreground message listener:", err);
    return null;
  }
}

/** Unregister FCM token on logout. */
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
