/**
 * QuickPress Device Notifications Helper.
 * Handles Native iOS / Android Notifications via Capacitor, Service Worker Mobile Notifications, & Browser APIs.
 */

export type DevicePermissionStatus = "granted" | "denied" | "default" | "unsupported";

export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  // 1. Check Native Android App JavascriptInterface
  if ((window as any).AndroidNotification?.showNotification) return true;
  // 2. Check Capacitor Native Mobile Environment
  if ((window as any).Capacitor) return true;
  // 3. Check Standard Web / Mobile Notification & Service Worker
  return "Notification" in window || "serviceWorker" in navigator;
}

export function getDeviceNotificationPermission(): DevicePermissionStatus {
  if (typeof window === "undefined") return "unsupported";
  if ((window as any).AndroidNotification?.showNotification) {
    return "granted";
  }
  if (!("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Directly prompts native device notification permission alert.
 * On iOS: Triggers the native system alert "QuickPress Would Like to Send You Notifications".
 */
export async function requestDeviceNotificationPermission(): Promise<DevicePermissionStatus> {
  if (typeof window === "undefined") return "unsupported";

  // 1. Capacitor Native Mobile App check (iOS & Android)
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display === "granted") {
      return "granted";
    }
    if (perm.display === "denied") {
      return "denied";
    }
  } catch (err) {
    console.debug("[Notifications] Capacitor LocalNotifications error:", err);
  }

  // 2. Android Native App check
  if ((window as any).AndroidNotification?.showNotification) {
    return "granted";
  }

  // 3. Web / Mobile Browser Notification API
  if ("Notification" in window) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && "serviceWorker" in navigator) {
        navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" }).catch(() => {});
      }
      return permission;
    } catch (err) {
      console.error("Failed to request notification permission:", err);
      return Notification.permission ?? "denied";
    }
  }

  return "unsupported";
}

/**
 * Direct device permissions prompt invoked on initial app startup:
 * 1. Prompts native iOS Notification permission alert.
 * 2. Prompts native iOS Location permission alert.
 * Only runs once on initial launch without showing any intermediate page or custom modal.
 */
export async function requestStartupDevicePermissions(): Promise<{
  notifications: string;
  location: boolean;
}> {
  if (typeof window === "undefined") {
    return { notifications: "unsupported", location: false };
  }

  const STARTUP_PERMS_KEY = "qp_startup_permissions_requested_v2";
  const alreadyPrompted = localStorage.getItem(STARTUP_PERMS_KEY);
  if (alreadyPrompted) {
    return { notifications: "already_prompted", location: false };
  }
  // Record immediately so it only prompts once on first launch
  localStorage.setItem(STARTUP_PERMS_KEY, "true");

  console.log("[Permissions] Requesting direct startup device permissions...");

  let notifStatus = "default";
  try {
    // 1. Trigger Direct Native Notification Permission Dialog
    notifStatus = await requestDeviceNotificationPermission();
    console.log("[Permissions] Direct Notification prompt completed:", notifStatus);
  } catch (err) {
    console.warn("[Permissions] Notification prompt error:", err);
  }

  // Small pause (400ms) to ensure iOS alert transitions smoothly to the location prompt
  await new Promise((r) => setTimeout(r, 400));

  let locationAcquired = false;
  try {
    // 2. Trigger Direct Native Location Permission Dialog
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      locationAcquired = await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            console.log("[Permissions] Native location fix acquired:", pos.coords.latitude, pos.coords.longitude);
            try {
              const { reverseGeocode, saveLocation } = await import("@/api/customer/location");
              const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
              saveLocation(loc);
            } catch {}
            resolve(true);
          },
          (err) => {
            console.log("[Permissions] Native location response / dismissed:", err.message);
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    }
  } catch (err) {
    console.warn("[Permissions] Location prompt error:", err);
  }

  return { notifications: notifStatus, location: locationAcquired };
}

export async function openDeviceNotificationSettings(): Promise<boolean> {
  try {
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) {
      if (cap.Plugins?.App?.openAppSettings) {
        await cap.Plugins.App.openAppSettings();
        return true;
      }
      if (cap.Plugins?.NativeSettings?.open) {
        await cap.Plugins.NativeSettings.open({
          optionAndroid: "application_details",
          optionIOS: "app",
        });
        return true;
      }
    }
  } catch (err) {
    console.debug("Could not open device settings:", err);
  }
  return false;
}

export type TriggerOsNotificationOptions = {
  title: string;
  body: string;
  orderId?: string | undefined;
  url?: string | undefined;
  tag?: string | undefined;
  icon?: string | undefined;
  badge?: string | undefined;
};

/**
 * Universal Mobile OS Notification Dispatcher.
 * Delivers native banners & system tray notifications across:
 * 1. Native iOS & Android (Capacitor LocalNotifications with foreground presentation)
 * 2. Native Android App (Injected WebView Interface)
 * 3. Mobile PWA / Chrome Service Worker
 * 4. Desktop Browsers
 */
export async function triggerMobileOsNotification(
  options: TriggerOsNotificationOptions
): Promise<boolean> {
  const { title, body, orderId, url } = options;
  const clickUrl = url || (orderId ? `/track/${orderId}` : "/notifications");
  const notificationTag = options.tag || (orderId ? `order-${orderId}` : `quickpress-${Date.now()}`);
  const icon = options.icon || "/favicon.png";
  const badge = options.badge || "/favicon.png";

  // Channel 0: Real Native iOS & Android Notification (Capacitor LocalNotifications)
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }
    const notifId = Math.floor(Math.random() * 2147483647);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title,
          body,
          largeBody: body,
          summaryText: "QuickPress",
          sound: "default",
          // Pass foreground: true so iOS LocalNotificationsHandler presents banner, sound, badge, & list even in active view
          foreground: true,
          extra: {
            url: clickUrl,
            orderId,
          },
        } as any,
      ],
    });
    console.log("[MobileNotification] Native iOS / Capacitor notification dispatched successfully");
    return true;
  } catch (capErr) {
    console.debug("[MobileNotification] LocalNotifications notice:", capErr);
  }

  // Channel 1: Native Android App (Injected WebView Interface)
  if (typeof window !== "undefined" && (window as any).AndroidNotification?.showNotification) {
    try {
      const androidNotif = (window as any).AndroidNotification;
      let shown = false;
      if (typeof androidNotif.showNotificationWithUrl === "function") {
        shown = androidNotif.showNotificationWithUrl(title, body, orderId || "", clickUrl);
      } else {
        shown = androidNotif.showNotification(title, body, orderId || "");
      }
      if (shown) {
        return true;
      }
    } catch (androidErr) {
      console.debug("[MobileNotification] AndroidNotification interface notice:", androidErr);
    }
  }

  // Channel 2: Service Worker (Standard on Android Chrome, Mobile PWA, Edge, Firefox, Samsung)
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      let reg: ServiceWorkerRegistration | null | undefined = null;
      try {
        reg = await navigator.serviceWorker.ready;
      } catch {
        reg = await navigator.serviceWorker.getRegistration();
      }
      if (!reg) {
        reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      }

      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, {
          body,
          icon,
          badge,
          tag: notificationTag,
          renotify: true,
          vibrate: [200, 100, 200],
          data: {
            url: clickUrl,
            orderId,
          },
        });

        // Also post message to active service worker for extra resilience
        reg.active?.postMessage({
          type: "TRIGGER_OS_NOTIFICATION",
          title,
          options: {
            body,
            icon,
            badge,
            tag: notificationTag,
            renotify: true,
            vibrate: [200, 100, 200],
            data: { url: clickUrl, orderId },
          },
        });

        return true;
      }
    } catch (swErr) {
      console.debug("[MobileNotification] ServiceWorker showNotification notice:", swErr);
    }
  }

  // Channel 3: Desktop Browsers Fallback (Chrome/Safari on Mac/PC)
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      const n = new Notification(title, {
        body,
        icon,
        badge,
        tag: notificationTag,
      });
      n.onclick = () => {
        window.focus();
        if (clickUrl) {
          window.location.href = clickUrl;
        }
        n.close();
      };
      return true;
    } catch (desktopErr) {
      console.debug("[MobileNotification] Desktop Notification notice:", desktopErr);
    }
  }

  return false;
}

export async function sendTestNotification(
  title = "QuickPress Laundry Notifications Active 🎉",
  body = "You will now get live pickup, wash, and delivery updates right in your mobile notifications."
): Promise<boolean> {
  return triggerMobileOsNotification({
    title,
    body,
  });
}
