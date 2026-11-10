import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { apiPostJson } from "./transport";

let isInitialized = false;

export async function initCapacitorPush(role: "customer" | "partner" | "rider" = "rider"): Promise<void> {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return;
  }

  if (isInitialized) {
    return;
  }
  isInitialized = true;

  try {
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
      console.log(`[NativePush] Rider device token registered (${Capacitor.getPlatform()}):`, token.value);
      try {
        await apiPostJson("/api/notifications/fcm-token", {
          token: token.value,
          device: Capacitor.getPlatform(),
          deviceType: Capacitor.getPlatform(),
          role: "rider",
        });
        console.log("[NativePush] Rider device token synced to backend successfully.");
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
        const { playOrderAlertSound } = await import("@/lib/order-alert-sound");
        playOrderAlertSound();
      } catch {}
      try {
        const { toast } = await import("sonner");
        toast.info(notification.title || "QuickPress Ride Dispatch", {
          description: notification.body || "New pickup offer received",
        });
      } catch {}
    });

    // When user taps on notification (banner, shade, lock screen)
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[NativePush] Notification action performed:", action);
      const data = action.notification.data || {};
      const targetUrl = data.url || (data.orderId ? `/active-order` : "/");
      if (typeof window !== "undefined" && targetUrl) {
        window.location.href = targetUrl;
      }
    });
  } catch (err) {
    console.debug("[NativePush] Capacitor Push init notice:", err);
  }
}
