/**
 * QuickPress Device Notifications Helper.
 * Handles native browser Notification API & Capacitor Mobile Push Permissions.
 */

export type DevicePermissionStatus = "granted" | "denied" | "default" | "unsupported";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getDeviceNotificationPermission(): DevicePermissionStatus {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestDeviceNotificationPermission(): Promise<DevicePermissionStatus> {
  if (!isNotificationSupported()) {
    return "unsupported";
  }

  try {
    // 1. Capacitor Native Mobile App check
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
          // Fall through to browser notification
        }
      }
    }

    // 2. Standard Web / Phone Browser Notification API
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("Failed to request notification permission:", err);
    return Notification.permission ?? "denied";
  }
}

/** Open device application settings (Android / iOS) when permission is denied or managed */
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

export function sendTestNotification(
  title = "QuickPress Laundry Notifications Active 🎉",
  body = "You will now get live pickup, wash, and delivery updates right here."
): boolean {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}
