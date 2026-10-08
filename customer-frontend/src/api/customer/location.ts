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
export function getDefaultLocation(): SavedLocation | null {
  return null;
}

/**
 * Reverse geocode coordinates into a readable area/city.
 *
 * Primary source is the backend Google Maps proxy (`/api/maps/reverse-geocode`,
 * server key). If backend proxy or Maps is unavailable, falls back to detected location
 * so store listings, pricing, and serviceability never break.
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
 * server key). If backend proxy or Maps is unavailable, falls back to detected location
 * so store listings, pricing, and serviceability never break.
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

  // Tier 1: Backend Google Maps / Nominatim proxy
  try {
    const result = await reverseGeocodeCoords(latitude, longitude);
    if (result && (result.area || result.city || result.formattedAddress)) {
      const area = result.area || result.formattedAddress?.split(",")?.[0]?.trim() || "Current Location";
      const city = (result.city && result.city.trim()) ? result.city.trim() : (result.state || "Detected Location");
      const resolved: SavedLocation = {
        area,
        city,
        state: result.state ?? "",
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
    console.warn("[Location] Reverse geocode backend proxy warning, attempting client-side lookup:", err);
  }

  // Tier 2: Client-side OpenStreetMap / BigDataCloud reverse geocode fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const area = data.locality || data.city || data.principalSubdivision || "Current Location";
      const city = data.city || data.principalSubdivision || area || "Detected Location";
      const state = data.principalSubdivision || "";
      const resolved: SavedLocation = {
        area,
        city,
        state,
        latitude,
        longitude,
      };
      GEOCODE_CACHE.set(cacheKey, resolved);
      return resolved;
    }
  } catch {
    /* fallback to coordinate-based position */
  }

  const coordFallback: SavedLocation = {
    area: "Current Location",
    city: "Detected Location",
    state: "",
    latitude,
    longitude,
  };
  GEOCODE_CACHE.set(cacheKey, coordFallback);
  return coordFallback;
}


/* --------------------------------------------------------------- device GPS */

export type GeoErrorKind = "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT" | "UNSUPPORTED";

export class GeoError extends Error {
  constructor(public readonly kind: GeoErrorKind) {
    super(
      kind === "PERMISSION_DENIED"
        ? "Location permission is required to detect your current location."
        : kind === "TIMEOUT"
          ? "GPS satellite lock timed out. Please ensure GPS is enabled and try again."
          : kind === "UNSUPPORTED"
            ? "This device or browser does not support location access."
            : "Unable to detect your location.",
    );
    this.name = "GeoError";
  }
}

export type DeviceLocation = { latitude: number; longitude: number; accuracy?: number };

/**
 * Robust Multi-Tier Device Location Acquisition:
 *
 * Tier 1: Check existing device cached fix (maximumAge: 10 minutes, timeout: 2000ms).
 *         If browser / Android OS has any recent fix, returns in <100ms.
 * Tier 2: High-accuracy satellite GPS & Fused Provider (enableHighAccuracy: true, timeout: 12000ms).
 *         Simultaneously races getCurrentPosition and watchPosition for instant lock.
 * Tier 3: Network / Cell-tower triangulation fallback (enableHighAccuracy: false, timeout: 8000ms).
 */
export async function getCurrentDeviceLocation(
  options: { timeoutMs?: number; enableHighAccuracy?: boolean } = {},
): Promise<DeviceLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new GeoError("UNSUPPORTED");
  }

  // Tier 1: Instant cached position check
  try {
    const cachedPos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 2000,
        maximumAge: 600000, // 10 minutes
      });
    });
    if (cachedPos?.coords?.latitude && cachedPos?.coords?.longitude) {
      return {
        latitude: cachedPos.coords.latitude,
        longitude: cachedPos.coords.longitude,
        accuracy: cachedPos.coords.accuracy,
      };
    }
  } catch (tier1Err: any) {
    if (tier1Err?.code === 1 /* PERMISSION_DENIED */) {
      throw new GeoError("PERMISSION_DENIED");
    }
  }

  // Helper to race getCurrentPosition and watchPosition for quickest hardware fix
  const acquirePosition = (opts: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      let settled = false;
      let watchId: number | null = null;

      const onSucc = (pos: GeolocationPosition) => {
        if (!settled && pos?.coords?.latitude) {
          settled = true;
          if (watchId !== null) {
            try { navigator.geolocation.clearWatch(watchId); } catch {}
          }
          resolve(pos);
        }
      };

      const onErr = (err: GeolocationPositionError) => {
        if (!settled && err.code === 1 /* PERMISSION_DENIED */) {
          settled = true;
          if (watchId !== null) {
            try { navigator.geolocation.clearWatch(watchId); } catch {}
          }
          reject(err);
        }
      };

      try {
        navigator.geolocation.getCurrentPosition(onSucc, onErr, opts);
      } catch (e) {
        onErr(e as any);
      }

      try {
        watchId = navigator.geolocation.watchPosition(onSucc, onErr, opts);
      } catch {}

      const maxWait = (opts.timeout ?? 12000) + 500;
      setTimeout(() => {
        if (!settled) {
          settled = true;
          if (watchId !== null) {
            try { navigator.geolocation.clearWatch(watchId); } catch {}
          }
          reject({ code: 3, message: "Timeout" });
        }
      }, maxWait);
    });
  };

  // Tier 2: Real Satellite / Fused GPS Fix with adequate 12s window
  try {
    const highAccTimeout = options.timeoutMs ?? 12000;
    const gpsPos = await acquirePosition({
      enableHighAccuracy: true,
      timeout: highAccTimeout,
      maximumAge: 30000,
    });
    return {
      latitude: gpsPos.coords.latitude,
      longitude: gpsPos.coords.longitude,
      accuracy: gpsPos.coords.accuracy,
    };
  } catch (tier2Err: any) {
    if (tier2Err?.code === 1) {
      throw new GeoError("PERMISSION_DENIED");
    }

    // Tier 3: Network / Cell Triangulation Fallback (8s window)
    try {
      const netPos = await acquirePosition({
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000,
      });
      return {
        latitude: netPos.coords.latitude,
        longitude: netPos.coords.longitude,
        accuracy: netPos.coords.accuracy,
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
 */
export async function detectDeviceLocation(): Promise<SavedLocation> {
  const fix = await getCurrentDeviceLocation();
  return await reverseGeocode(fix.latitude, fix.longitude);
}

