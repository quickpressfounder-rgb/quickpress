/**
 * QuickPress Merchant Device Optimization Manager.
 * Handles Android Battery Optimization Ignore and Lockscreen Overlay Permissions.
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
