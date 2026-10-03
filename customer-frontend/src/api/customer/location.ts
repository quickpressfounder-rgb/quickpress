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
const GEOCODE_CACHE = new Map<string, SavedLocation>();

function getGeocodeCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * Reverse geocode coordinates into a readable area/city.
 *
 * Checks in-memory cache and sessionStorage first (<1ms) to eliminate redundant
 * network requests for the same or proximate coordinates.
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
  const cacheKey = getGeocodeCacheKey(latitude, longitude);

  // 1. Fast in-memory cache
  if (GEOCODE_CACHE.has(cacheKey)) {
    return GEOCODE_CACHE.get(cacheKey)!;
  }

  // 2. Fast session cache
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(`qp_geo_${cacheKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedLocation;
        GEOCODE_CACHE.set(cacheKey, parsed);
        return parsed;
      }
    } catch {
      /* ignore storage error */
    }
  }

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
      const resolved: SavedLocation = {
        area,
        city,
        state: result.state ?? fallback.state,
        latitude,
        longitude,
      };

      GEOCODE_CACHE.set(cacheKey, resolved);
      if (typeof window !== "undefined" && window.sessionStorage) {
        try {
          window.sessionStorage.setItem(`qp_geo_${cacheKey}`, JSON.stringify(resolved));
        } catch {}
      }
      return resolved;
    }
  } catch (err) {
    console.warn("[Location] Reverse geocode proxy warning, using fallback:", err);
  }

  GEOCODE_CACHE.set(cacheKey, fallback);
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
 * High-Speed 3-Tier Device Location Acquisition:
 *
 * Tier 1: Check existing device cached fix (maximumAge: 5 minutes, timeout: 1200ms).
 *         If browser has any recent fix, this returns in <100ms.
 * Tier 2: Fast network/cell triangulation (enableHighAccuracy: false, timeout: 2500ms).
 * Tier 3: High-accuracy satellite GPS (enableHighAccuracy: true, timeout: 3000ms).
 *
 * If permissions are denied, fails immediately without lingering timeouts.
 */
export async function getCurrentDeviceLocation(
  options: { timeoutMs?: number; enableHighAccuracy?: boolean } = {},
): Promise<DeviceLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new GeoError("UNSUPPORTED");
  }

  // Tier 1: Instant cached position test (sub-second response)
  try {
    const cachedPos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 1200,
        maximumAge: 300000, // up to 5 min old fix
      });
    });
    return {
      latitude: cachedPos.coords.latitude,
      longitude: cachedPos.coords.longitude,
      accuracy: cachedPos.coords.accuracy,
    };
  } catch (tier1Err: any) {
    if (tier1Err?.code === 1 /* PERMISSION_DENIED */) {
      throw new GeoError("PERMISSION_DENIED");
    }
  }

  // Tier 2: Fast Network/Cell-tower Triangulation
  try {
    const networkPos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: options.enableHighAccuracy ?? false,
        timeout: options.timeoutMs ? Math.min(options.timeoutMs, 2500) : 2500,
        maximumAge: 60000,
      });
    });

    return {
      latitude: networkPos.coords.latitude,
      longitude: networkPos.coords.longitude,
      accuracy: networkPos.coords.accuracy,
    };
  } catch (tier2Err: any) {
    if (tier2Err?.code === 1) {
      throw new GeoError("PERMISSION_DENIED");
    }

    // Tier 3: High-Accuracy GPS satellite attempt (3s)
    try {
      const gpsPos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 3000,
          maximumAge: 30000,
        });
      });

      return {
        latitude: gpsPos.coords.latitude,
        longitude: gpsPos.coords.longitude,
        accuracy: gpsPos.coords.accuracy,
      };
    } catch (tier3Err: any) {
      if (tier3Err?.code === 1) {
        throw new GeoError("PERMISSION_DENIED");
      }
      if (tier3Err?.code === 3 || tier2Err?.code === 3) {
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

