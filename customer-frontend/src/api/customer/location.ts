import { reverseGeocodeCoords } from "../core/maps-api";

export type SavedLocation = {

  area: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
};

const KEY = "quickpress:location";

export function saveLocation(location: SavedLocation) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(location));
  } catch {
    /* storage unavailable */
  }
}

export function readLocation(): SavedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedLocation) : null;
  } catch {
    return null;
  }
}

/**
 * Reverse geocode coordinates into a readable area/city.
 *
 * Primary source is the backend Google Maps proxy (`/api/maps/reverse-geocode`,
 * server key). OpenStreetMap stays as a last-resort fallback so GPS keeps
 * working when Maps is unavailable.
 */
export const DEFAULT_OPERATIONAL_LOCATION: SavedLocation = {
  area: "Awas Vikas",
  city: "Kasganj",
  state: "Uttar Pradesh",
  latitude: 27.8083,
  longitude: 78.6475,
};

export function getDefaultLocation(): SavedLocation {
  return { ...DEFAULT_OPERATIONAL_LOCATION };
}

/**
 * Reverse geocode coordinates into a readable area/city.
 *
 * Primary source is the backend Google Maps proxy (`/api/maps/reverse-geocode`,
 * server key). If backend proxy or Maps is unavailable, falls back to the default
 * operational service hub (Kasganj) so store listings, pricing, and serviceability
 * never break.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<SavedLocation> {
  const fallback: SavedLocation = {
    ...DEFAULT_OPERATIONAL_LOCATION,
    latitude,
    longitude,
  };

  try {
    const result = await reverseGeocodeCoords(latitude, longitude);
    if (result && (result.area || result.city || result.formattedAddress)) {
      const area = result.area || result.formattedAddress?.split(",")?.[0] || fallback.area;
      const city = result.city && result.city.trim() ? result.city.trim() : fallback.city;
      return {
        area,
        city,
        state: result.state ?? fallback.state,
        latitude,
        longitude,
      };
    }
  } catch (err) {
    console.warn("[Location] Reverse geocode proxy warning, using fallback:", err);
  }

  return fallback;
}


/* --------------------------------------------------------------- device GPS */

export type GeoErrorKind = "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT" | "UNSUPPORTED";

export class GeoError extends Error {
  constructor(public readonly kind: GeoErrorKind) {
    super(
      kind === "PERMISSION_DENIED"
        ? "Location permission is required to detect your current location."
        : kind === "TIMEOUT"
          ? "GPS satellite lock timed out. Using default operational hub."
          : kind === "UNSUPPORTED"
            ? "This device or browser does not support location access."
            : "Unable to detect your location.",
    );
    this.name = "GeoError";
  }
}

export type DeviceLocation = { latitude: number; longitude: number; accuracy?: number };

/**
 * Robust 2-Phase Device Location Acquisition:
 *
 * Phase 1: High Accuracy GPS (satellites) with 5s timeout.
 * Phase 2: If Phase 1 times out or errors (common indoors or on mobile),
 *          immediately try Network/Cell/Wi-Fi positioning (enableHighAccuracy: false).
 *          Network triangulation returns in <500ms on mobile devices.
 */
export async function getCurrentDeviceLocation(
  options: { timeoutMs?: number; enableHighAccuracy?: boolean } = {},
): Promise<DeviceLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new GeoError("UNSUPPORTED");
  }

  // Phase 1: High Accuracy attempt
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeoutMs ? Math.min(options.timeoutMs, 5000) : 5000,
        maximumAge: 30000,
      });
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch (phase1Err: any) {
    // If permission was explicitly denied by user, stop here
    if (phase1Err?.code === 1 /* PERMISSION_DENIED */) {
      throw new GeoError("PERMISSION_DENIED");
    }

    // Phase 2: Fast Network/Cell-tower Triangulation
    try {
      const networkPos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 120000,
        });
      });

      return {
        latitude: networkPos.coords.latitude,
        longitude: networkPos.coords.longitude,
        accuracy: networkPos.coords.accuracy,
      };
    } catch (phase2Err: any) {
      if (phase2Err?.code === 1) {
        throw new GeoError("PERMISSION_DENIED");
      }
      if (phase2Err?.code === 3 || phase1Err?.code === 3) {
        throw new GeoError("TIMEOUT");
      }
      throw new GeoError("POSITION_UNAVAILABLE");
    }
  }
}

/**
 * Device GPS → reverse geocoding → the customer's *current device* location.
 *
 * If fallbackToDefault is true, any GPS or permission failure gracefully
 * returns the default Kasganj hub instead of throwing, ensuring the customer
 * is never blocked from using the app.
 */
export async function detectDeviceLocation(fallbackToDefault = false): Promise<SavedLocation> {
  try {
    const fix = await getCurrentDeviceLocation();
    return await reverseGeocode(fix.latitude, fix.longitude);
  } catch (err) {
    if (fallbackToDefault) {
      console.warn("[Location] Device GPS unavailable, falling back to default hub:", err);
      return getDefaultLocation();
    }
    throw err;
  }
}
