import { Capacitor } from "@capacitor/core";
import { apiPostJson } from "./transport";

let isInitialized = false;

export async function initCapacitorPush(role: "customer" | "partner" | "rider" = "customer"): Promise<void> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return;
  }

  if (isInitialized) {
    return;
  }
  isInitialized = true;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.log(`[NativePush] Permission not granted: ${permStatus.receive}`);
      return;
    }

    // Register with Apple APNs / Google FCM
    await PushNotifications.register();

    // On registration success, sync device token to FastAPI backend
    await PushNotifications.addListener("registration", async (token) => {
      console.log(`[NativePush] Device token registered (${Capacitor.getPlatform()}):`, token.value);
      try {
        await apiPostJson("/api/notifications/fcm-token", {
          token: token.value,
          device: Capacitor.getPlatform(),
          deviceType: Capacitor.getPlatform(),
          role,
        });
        console.log("[NativePush] Device token synced to backend successfully.");
      } catch (err) {
        console.debug("[NativePush] Backend token sync notice:", err);
      }
    });

    // On registration error
    await PushNotifications.addListener("registrationError", (error) => {
      console.warn("[NativePush] Error registering device token:", error);
    });

    // When a notification is received in foreground
    await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      console.log("[NativePush] Notification received in foreground:", notification);
      try {
        const { triggerMobileOsNotification } = await import("@/lib/notifications");
        void triggerMobileOsNotification({
          title: notification.title || "QuickPress Update",
          body: notification.body || "New update received",
          orderId: notification.data?.orderId,
          url: notification.data?.url,
        });
      } catch {}
    });

    // When user taps on notification (banner, shade, lock screen)
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[NativePush] Notification action performed:", action);
      const data = action.notification.data || {};
      const targetUrl = data.url || (data.orderId ? `/track/${data.orderId}` : "/notifications");
      if (typeof window !== "undefined" && targetUrl) {
        window.location.href = targetUrl;
      }
    });
  } catch (err) {
    console.debug("[NativePush] Capacitor Push init notice:", err);
  }
}

