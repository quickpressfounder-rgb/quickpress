/**
 * QuickPress Admin — Pure Native WebPush (VAPID / RFC 8292) Client.
 */

import { apiGetJson, apiPostJson, apiDeleteJson } from "./transport";
import { toast } from "sonner";

export function isNativeWebPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await apiGetJson<{ ok: boolean; publicKey: string }>(
      "/api/notifications/webpush/vapid-public-key",
      { anonymous: true }
    );
    return res?.publicKey || null;
  } catch (err) {
    console.debug("[Admin-WebPush] Failed to fetch VAPID public key:", err);
    return null;
  }
}

export async function subscribeToNativeWebPush(): Promise<PushSubscription | null> {
  if (!isNativeWebPushSupported()) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );
    await navigator.serviceWorker.ready;

    const vapidPublicKey = await fetchVapidPublicKey();
    if (!vapidPublicKey) {
      return null;
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    if (subscription) {
      await apiPostJson("/api/notifications/webpush/subscribe", {
        subscription: subscription.toJSON(),
        device: "web",
        deviceType: "web",
        role: "admin",
      });
      return subscription;
    }
  } catch (err) {
    console.debug("[Admin-WebPush] Subscription error:", err);
  }
  return null;
}

export async function unsubscribeFromNativeWebPush(): Promise<boolean> {
  if (!isNativeWebPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      try {
        await apiDeleteJson("/api/notifications/webpush/unsubscribe", {
          params: { endpoint },
        });
      } catch {
        // Best-effort
      }
      return true;
    }
  } catch (err) {
    console.debug("[Admin-WebPush] Unsubscribe error:", err);
  }
  return false;
}

export async function triggerTestWebPush(): Promise<boolean> {
  try {
    const res = await apiPostJson<{ ok: boolean; sentCount: number }>(
      "/api/notifications/webpush/test",
      {
        title: "Admin Native WebPush Active!",
        body: "Operations alerts and dispatch events will be pushed directly to this browser.",
        url: "/notifications",
      }
    );
    if (res?.ok) {
      toast.success("Native admin push dispatched!");
      return true;
    }
  } catch (err) {
    toast.error("Failed to send test push notification.");
  }
  return false;
}
