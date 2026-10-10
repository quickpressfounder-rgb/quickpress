/**
 * QuickPress Device Notifications Helper.
 * Handles Native Android OS Notifications, Service Worker Mobile Notifications, & Browser APIs.
 */

export type DevicePermissionStatus = "granted" | "denied" | "default" | "unsupported";

export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  // 1. Check Native Android App JavascriptInterface
  if ((window as any).AndroidNotification?.showNotification) return true;
  // 2. Check Standard Web / Mobile Notification & Service Worker
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

export async function requestDeviceNotificationPermission(): Promise<DevicePermissionStatus> {
  if (typeof window === "undefined") return "unsupported";

  // 1. Android Native App check
  if ((window as any).AndroidNotification?.showNotification) {
    return "granted";
  }

  // 2. Capacitor Native Mobile App check
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) {
    const push = cap.Plugins?.PushNotifications;
    if (push?.requestPermissions) {
      try {
        const capResult = await push.requestPermissions();
        if (capResult?.receive === "granted") {
          await push.register?.();
          return "granted";
        }
      } catch {
        // Fall through
      }
    }
  }

  // 3. Web / Mobile Browser Notification API
  if ("Notification" in window) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && "serviceWorker" in navigator) {
        // Ensure service worker is actively registered
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
  orderId?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
};

/**
 * Universal Mobile OS Notification Dispatcher.
 * Reliably delivers to the phone's top notification shade / status bar across:
 * 1. Native Android APK (via AndroidNotification JavascriptInterface)
 * 2. Android Chrome / PWA / Samsung Internet / Firefox (via ServiceWorkerRegistration.showNotification)
 * 3. Desktop Browsers (via Notification constructor)
 */
export async function triggerMobileOsNotification(
  options: TriggerOsNotificationOptions
): Promise<boolean> {
  const { title, body, orderId, url } = options;
  const clickUrl = url || (orderId ? `/track/${orderId}` : "/notifications");
  const notificationTag = options.tag || (orderId ? `order-${orderId}` : `quickpress-${Date.now()}`);
  const icon = options.icon || "/favicon.png";
  const badge = options.badge || "/favicon.png";

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
      let reg: ServiceWorkerRegistration | null = null;
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
