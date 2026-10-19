/**
 * Captain Device & Permissions Bridge for QuickPress Rider.
 * Connects web frontend to native Android FloatingBubbleService,
 * background GPS, battery optimization bypass, and overlay permissions.
 */

declare global {
  interface Window {
    QuickPressNativeBridge?: {
      setCaptainOnlineStatus?: (online: boolean) => void;
      startFloatingBubble?: () => void;
      stopFloatingBubble?: () => void;
      isFloatingBubbleRunning?: () => boolean;
      canDrawOverlays?: () => boolean;
      requestOverlayPermission?: () => void;
      isBatteryOptimizationIgnored?: () => boolean;
      requestIgnoreBatteryOptimization?: () => void;
      areNotificationsEnabled?: () => boolean;
      openNotificationSettings?: () => void;
      isLocationGranted?: () => boolean;
      requestLocationPermission?: () => void;
      isBackgroundLocationGranted?: () => boolean;
      requestBackgroundLocationPermission?: () => void;
      isCameraGranted?: () => boolean;
      requestCameraPermission?: () => void;
      openAppSettings?: () => void;
      bringAppToFront?: (targetRoute?: string) => void;
    };
    __qpNavigate?: (route: string) => void;
  }
}

export function isNativeAndroidApp(): boolean {
  return typeof window !== "undefined" && Boolean(window.QuickPressNativeBridge);
}

export function setCaptainOnlineStatus(online: boolean): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.setCaptainOnlineStatus === "function") {
    try {
      bridge.setCaptainOnlineStatus(online);
    } catch (err) {
      console.warn("[CaptainOpt] setCaptainOnlineStatus error:", err);
    }
  }
}

export function startFloatingBubble(): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.startFloatingBubble === "function") {
    try {
      bridge.startFloatingBubble();
    } catch (err) {
      console.warn("[CaptainOpt] startFloatingBubble error:", err);
    }
  }
}

export function stopFloatingBubble(): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.stopFloatingBubble === "function") {
    try {
      bridge.stopFloatingBubble();
    } catch (err) {
      console.warn("[CaptainOpt] stopFloatingBubble error:", err);
    }
  }
}

export function isFloatingBubbleRunning(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.isFloatingBubbleRunning === "function") {
    try {
      return Boolean(bridge.isFloatingBubbleRunning());
    } catch {
      return false;
    }
  }
  return false;
}

export function canDrawOverlays(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.canDrawOverlays === "function") {
    try {
      return Boolean(bridge.canDrawOverlays());
    } catch {
      return false;
    }
  }
  return false;
}

export function requestOverlayPermission(): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.requestOverlayPermission === "function") {
    try {
      bridge.requestOverlayPermission();
    } catch (err) {
      console.warn("[CaptainOpt] requestOverlayPermission error:", err);
    }
  }
}

export function isBatteryOptimizationIgnored(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.isBatteryOptimizationIgnored === "function") {
    try {
      return Boolean(bridge.isBatteryOptimizationIgnored());
    } catch {
      return false;
    }
  }
  return false;
}

export function requestIgnoreBatteryOptimization(): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.requestIgnoreBatteryOptimization === "function") {
    try {
      bridge.requestIgnoreBatteryOptimization();
    } catch (err) {
      console.warn("[CaptainOpt] Battery opt request error:", err);
    }
  }
}

export function areNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.areNotificationsEnabled === "function") {
    try {
      return Boolean(bridge.areNotificationsEnabled());
    } catch {
      return false;
    }
  }
  if (typeof Notification !== "undefined") {
    return Notification.permission === "granted";
  }
  return false;
}

export function openNotificationSettings(): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.openNotificationSettings === "function") {
    try {
      bridge.openNotificationSettings();
      return;
    } catch (err) {
      console.warn("[CaptainOpt] Notification settings error:", err);
    }
  }
  if (typeof Notification !== "undefined" && typeof Notification.requestPermission === "function") {
    Notification.requestPermission().catch(() => {});
  }
}

export function isLocationGranted(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.isLocationGranted === "function") {
    try {
      return Boolean(bridge.isLocationGranted());
    } catch {
      return false;
    }
  }
  if (typeof window !== "undefined" && window.localStorage.getItem("qp_rider_loc_granted") === "true") {
    return true;
  }
  return false;
}

export function requestLocationPermission(): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.requestLocationPermission === "function") {
    try {
      bridge.requestLocationPermission();
      return;
    } catch (err) {
      console.warn("[CaptainOpt] Location request error:", err);
    }
  }
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => {
        try { window.localStorage.setItem("qp_rider_loc_granted", "true"); } catch {}
      },
      () => {},
      { timeout: 5000 }
    );
  }
}

export function isBackgroundLocationGranted(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.isBackgroundLocationGranted === "function") {
    try {
      return Boolean(bridge.isBackgroundLocationGranted());
    } catch {
      return false;
    }
  }
  return isLocationGranted();
}

export function requestBackgroundLocationPermission(): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.requestBackgroundLocationPermission === "function") {
    try {
      bridge.requestBackgroundLocationPermission();
      return;
    } catch (err) {
      console.warn("[CaptainOpt] Background location request error:", err);
    }
  }
  requestLocationPermission();
}

export function isCameraGranted(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.isCameraGranted === "function") {
    try {
      return Boolean(bridge.isCameraGranted());
    } catch {
      return false;
    }
  }
  if (typeof window !== "undefined" && window.localStorage.getItem("qp_rider_cam_granted") === "true") {
    return true;
  }
  return false;
}

export function requestCameraPermission(): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.requestCameraPermission === "function") {
    try {
      bridge.requestCameraPermission();
      return;
    } catch (err) {
      console.warn("[CaptainOpt] Camera request error:", err);
    }
  }
  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        try { window.localStorage.setItem("qp_rider_cam_granted", "true"); } catch {}
        stream.getTracks().forEach((track) => track.stop());
      })
      .catch(() => {});
  }
}

export function openAppSettings(): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.openAppSettings === "function") {
    try {
      bridge.openAppSettings();
    } catch (err) {
      console.warn("[CaptainOpt] Open app settings error:", err);
    }
  }
}

export function bringAppToFront(targetRoute: string = "/orders"): void {
  if (typeof window === "undefined") return;
  const bridge = window.QuickPressNativeBridge;
  if (bridge && typeof bridge.bringAppToFront === "function") {
    try {
      bridge.bringAppToFront(targetRoute);
    } catch (err) {
      console.warn("[CaptainOpt] bringAppToFront error:", err);
    }
  }
}

export function registerGlobalNavigationHook(navigateFn: (route: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.__qpNavigate = navigateFn;
  const handler = (e: any) => {
    if (e.detail?.route) {
      navigateFn(e.detail.route);
    }
  };
  window.addEventListener("qp:navigate", handler);
  return () => {
    window.removeEventListener("qp:navigate", handler);
    delete window.__qpNavigate;
  };
}
