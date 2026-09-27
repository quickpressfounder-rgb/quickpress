/**
 * QuickPress Unified Permissions Manager
 * Coordinates Location (GPS) and Push Notification permissions together.
 */

import { readLocation, type SavedLocation } from "@/api/customer/location";
import { refreshLocationFromGps } from "@/api/customer/services/location-service";
import { requestPushNotificationPermission } from "@/api/core/firebase-messaging";
import { playOrderBellNotificationSound } from "@/lib/order-success-sound";

export type PermissionState = "granted" | "prompt" | "denied" | "unsupported";

export interface SystemPermissionsStatus {
  location: PermissionState;
  notification: PermissionState;
  allGranted: boolean;
}

/** Check current status of both Location and Notification permissions without prompting. */
export async function getPermissionsStatus(): Promise<SystemPermissionsStatus> {
  let locationStatus: PermissionState = "prompt";
  let notificationStatus: PermissionState = "prompt";

  // Check Notification permission
  if (typeof window === "undefined" || !("Notification" in window)) {
    notificationStatus = "unsupported";
  } else if (Notification.permission === "granted") {
    notificationStatus = "granted";
  } else if (Notification.permission === "denied") {
    notificationStatus = "denied";
  } else {
    notificationStatus = "prompt";
  }

  // Check Geolocation permission
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    locationStatus = "unsupported";
  } else if ("permissions" in navigator && typeof navigator.permissions.query === "function") {
    try {
      const geoPerm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (geoPerm.state === "granted") {
        locationStatus = "granted";
      } else if (geoPerm.state === "denied") {
        locationStatus = "denied";
      } else {
        locationStatus = "prompt";
      }
    } catch {
      // Fallback: check if location was previously saved
      const savedLoc = readLocation();
      locationStatus = savedLoc?.latitude ? "granted" : "prompt";
    }
  } else {
    const savedLoc = readLocation();
    locationStatus = savedLoc?.latitude ? "granted" : "prompt";
  }

  return {
    location: locationStatus,
    notification: notificationStatus,
    allGranted: locationStatus === "granted" && notificationStatus === "granted",
  };
}

/** Request device GPS location permission and reverse-geocode current coordinates. */
export async function requestLocationPermission(): Promise<SavedLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

  try {
    const location = await refreshLocationFromGps();
    if (location && location.latitude && location.longitude) {
      return location;
    }
    return null;
  } catch (err) {
    console.debug("[Permissions] Location access error:", err);
    return null;
  }
}

/** Request browser notification permission, register FCM/Service Worker, and play audio chime. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return false;
    }

    // 1. Play signature order bell chime to confirm sound authorization
    playOrderBellNotificationSound();

    // 2. Register Service Worker and sync FCM Push Token with backend
    try {
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      }
      await requestPushNotificationPermission();
    } catch (pushErr) {
      console.debug("[Permissions] Push token registration notice:", pushErr);
    }

    // 3. Show a welcoming native notification if supported
    try {
      new Notification("QuickPress Notifications Active 🔔", {
        body: "You will now get live pickup, wash, and 15-minute delivery alerts!",
        icon: "/favicon.png",
        badge: "/favicon.png",
      });
    } catch {
      // Ignore if native construction on active page is restricted
    }

    return true;
  } catch (err) {
    console.debug("[Permissions] Notification request error:", err);
    return false;
  }
}

/** Request both Notification and Location permissions together. */
export async function requestBothPermissions(): Promise<{
  location: boolean;
  notification: boolean;
  savedLocation: SavedLocation | null;
}> {
  // First request Notification (usually requires synchronous user gesture)
  const notificationGranted = await requestNotificationPermission();

  // Then request Location GPS
  const savedLocation = await requestLocationPermission();
  const locationGranted = Boolean(savedLocation && savedLocation.latitude);

  return {
    location: locationGranted,
    notification: notificationGranted,
    savedLocation,
  };
}
