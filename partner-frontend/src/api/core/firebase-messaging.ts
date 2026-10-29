/**
 * QuickPress Partner — Firebase Cloud Messaging (FCM) Web Push Client.
 *
 * Handles background & foreground notifications for incoming store orders,
 * rider assignments, and order processing alerts.
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
      console.debug("[Partner-FCM] Messaging not supported in this browser.");
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
        console.debug("[Partner-FCM] Service worker registration notice:", swErr);
      }
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.debug("[Partner-FCM] Init error:", err);
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

    // 0. Check for Native Android FCM Token from QuickPressMerchantBridge
    try {
      const nativeToken = (window as any).QuickPressMerchantBridge?.getNativeFcmToken?.();
      if (nativeToken && typeof nativeToken === "string" && nativeToken.length > 10) {
        currentToken = nativeToken;
        try {
          await apiPostJson("/api/notifications/fcm-token", {
            token: nativeToken,
            device: "android",
            deviceType: "android",
            role: "partner",
          });
        } catch (apiErr) {
          console.debug("[Partner-FCM] Native token sync notice:", apiErr);
        }
        return nativeToken;
      }
    } catch {}

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
          role: "partner",
        });
      } catch (apiErr) {
        console.debug("[Partner-FCM] Token sync notice:", apiErr);
      }
      return token;
    }
  } catch (err) {
    console.debug("[Partner-FCM] Push token request notice:", err);
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

      const title = notification.title || data.title || "⚡ New Partner Order!";
      const body = notification.body || data.body || data.message || "A new order requires attention.";
      const clickUrl = data.url || (data.orderId ? `/orders/${data.orderId}` : "/orders");

      toast(title, {
        description: body,
        action: {
          label: "View Order",
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
    console.debug("[Partner-FCM] Error setting up message listener:", err);
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
