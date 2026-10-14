/**
 * QuickPress Merchant Device Optimization Manager.
 * Handles Android Battery Optimization Ignore, Lockscreen Overlay,
 * Notification Channels, Camera & Location Permissions.
 */

export function isNativeAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).QuickPressNativeBridge);
}

export function isBatteryOptimizationIgnored(): boolean {
  if (typeof window === "undefined") return true;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.isBatteryOptimizationIgnored === "function") {
    try {
      return Boolean(bridge.isBatteryOptimizationIgnored());
    } catch {
      return true;
    }
  }
  return true;
}

export function requestIgnoreBatteryOptimization(): void {
  if (typeof window === "undefined") return;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.requestIgnoreBatteryOptimization === "function") {
    try {
      bridge.requestIgnoreBatteryOptimization();
    } catch (err) {
      console.warn("[MerchantOpt] Battery opt request error:", err);
    }
  }
}

export function canDrawOverlays(): boolean {
  if (typeof window === "undefined") return true;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.canDrawOverlays === "function") {
    try {
      return Boolean(bridge.canDrawOverlays());
    } catch {
      return true;
    }
  }
  return true;
}

export function requestOverlayPermission(): void {
  if (typeof window === "undefined") return;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.requestOverlayPermission === "function") {
    try {
      bridge.requestOverlayPermission();
    } catch (err) {
      console.warn("[MerchantOpt] Overlay request error:", err);
    }
  }
}

export function areNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.areNotificationsEnabled === "function") {
    try {
      return Boolean(bridge.areNotificationsEnabled());
    } catch {
      return true;
    }
  }
  if ("Notification" in window) {
    return Notification.permission === "granted";
  }
  return true;
}

export function openNotificationSettings(): void {
  if (typeof window === "undefined") return;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.openNotificationSettings === "function") {
    try {
      bridge.openNotificationSettings();
      return;
    } catch {}
  }
  if ("Notification" in window && Notification.permission !== "granted") {
    void Notification.requestPermission();
  }
}

export function isLocationGranted(): boolean {
  if (typeof window === "undefined") return true;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.isLocationGranted === "function") {
    try {
      return Boolean(bridge.isLocationGranted());
    } catch {
      return true;
    }
  }
  return true;
}

export function requestLocationPermission(): void {
  if (typeof window === "undefined") return;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.requestLocationPermission === "function") {
    try {
      bridge.requestLocationPermission();
      return;
    } catch {}
  }
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      () => {},
      () => {},
      { timeout: 5000 }
    );
  }
}

export function isCameraGranted(): boolean {
  if (typeof window === "undefined") return true;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.isCameraGranted === "function") {
    try {
      return Boolean(bridge.isCameraGranted());
    } catch {
      return true;
    }
  }
  return true;
}

export function requestCameraPermission(): void {
  if (typeof window === "undefined") return;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.requestCameraPermission === "function") {
    try {
      bridge.requestCameraPermission();
      return;
    } catch {}
  }
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    }).catch(() => {});
  }
}

export function openAppSettings(): void {
  if (typeof window === "undefined") return;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.openAppSettings === "function") {
    try {
      bridge.openAppSettings();
    } catch {}
  }
}

export function requestAllPermissions(): void {
  if (typeof window === "undefined") return;
  const bridge = (window as any).QuickPressNativeBridge;
  if (bridge && typeof bridge.requestAllPermissions === "function") {
    try {
      bridge.requestAllPermissions();
    } catch {}
  }
  // Also request web notifications if supported
  if ("Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission();
  }
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(() => {}, () => {});
  }
}
