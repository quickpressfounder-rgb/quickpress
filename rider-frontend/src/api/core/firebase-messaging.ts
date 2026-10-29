/**
 * QuickPress Rider / Captain — Firebase Cloud Messaging (FCM) Web Push Client.
 *
 * Handles incoming ride dispatches, pickup offers, and navigation alerts.
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
      console.debug("[Rider-FCM] Messaging not supported in this browser.");
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
        console.debug("[Rider-FCM] Service worker registration notice:", swErr);
      }
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.debug("[Rider-FCM] Init error:", err);
    return null;
  }
}

export async function syncNativeFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const bridge = (window as any).QuickPressNativeBridge || (window as any).QuickPressRiderBridge;
    if (!bridge || typeof bridge.getNativeFcmToken !== "function") return null;

    const nativeToken = bridge.getNativeFcmToken();
    if (nativeToken && typeof nativeToken === "string" && nativeToken.trim().length > 10) {
      const cleanToken = nativeToken.trim();
      currentToken = cleanToken;
      console.log("[Rider-FCM] ⚡ Syncing native Android FCM token to backend:", cleanToken.slice(0, 18) + "...");
      try {
        await apiPostJson("/api/notifications/fcm-token", {
          token: cleanToken,
          device: "android",
          deviceType: "android",
          role: "rider",
        });
      } catch (apiErr) {
        console.debug("[Rider-FCM] Native token sync notice:", apiErr);
      }
      return cleanToken;
    }
  } catch (err) {
    console.debug("[Rider-FCM] syncNativeFcmToken error:", err);
  }
  return null;
}

export async function requestPushNotificationPermission(): Promise<string | null> {
  // 1. Native Android App: Always check and sync Native Captain FCM Token first
  const native = await syncNativeFcmToken();
  if (native) {
    return native;
  }

  const isNative =
    typeof window !== "undefined" &&
    Boolean((window as any).QuickPressNativeBridge || (window as any).QuickPressRiderBridge);

  if (isNative) {
    // Retry once after 600ms in case Firebase token was initializing
    await new Promise((r) => setTimeout(r, 600));
    const retryNative = await syncNativeFcmToken();
    if (retryNative) return retryNative;
  }

  // 2. Web Push for Desktop & Browsers (requires PushManager)
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
          role: "rider",
        });
      } catch (apiErr) {
        console.debug("[Rider-FCM] Token sync notice:", apiErr);
      }
      return token;
    }
  } catch (err) {
    console.debug("[Rider-FCM] Push token request notice:", err);
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

      const title = notification.title || data.title || "🛵 New Ride Assigned!";
      const body = notification.body || data.body || data.message || "A trip requires your immediate action.";
      const clickUrl = data.url || (data.orderId ? `/orders/${data.orderId}` : "/orders");

      toast(title, {
        description: body,
        action: {
          label: "View Trip",
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
    console.debug("[Rider-FCM] Error setting up message listener:", err);
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
