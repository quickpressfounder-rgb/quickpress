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
 * Platform default location. Returns null so the app never forces
 * an arbitrary hardcoded city (like Kasganj) on users in other states.
 */
export function getDefaultLocation(): SavedLocation | null {
  return null;
}

/**
 * Reverse geocode coordinates into a readable area/city.
 *
 * Checks in-memory cache and sessionStorage first (<1ms) to eliminate redundant
 * network requests for the same or proximate coordinates (~110m bucket).
 *
 * Primary source is the backend Google Maps proxy (`/api/maps/reverse-geocode`,
 * server key). If backend proxy or Maps is unavailable or slow, falls back to
 * client-side lookup or coordinate fallback so the UI NEVER stalls.
 */
const GEOCODE_CACHE = new Map<string, SavedLocation>();

function getGeocodeCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<SavedLocation> {
  const cacheKey = getGeocodeCacheKey(latitude, longitude);

  // 1. Fast in-memory cache (<1ms)
  if (GEOCODE_CACHE.has(cacheKey)) {
    return GEOCODE_CACHE.get(cacheKey)!;
  }

  // 2. Fast session cache (<1ms)
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

  // Tier 1: Backend Google Maps / Nominatim proxy (strict 1500ms timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const result = await Promise.race([
      reverseGeocodeCoords(latitude, longitude),
      new Promise<null>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(new Error("Timeout")));
      }),
    ]);
    clearTimeout(timeoutId);

    if (result && (result.area || result.city || result.formattedAddress)) {
      let area = (result.area || "").trim();
      if (!area || area.toLowerCase() === "current location") {
        area = result.formattedAddress?.split(",")?.[0]?.trim() || "";
      }
      const city = (result.city && result.city.trim()) ? result.city.trim() : (result.state || "");
      const resolved: SavedLocation = {
        area: area || city || "Current Location",
        city: city || "",
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
    console.debug("[Location] Fast reverse geocode proxy bypassed, falling back:", err);
  }

  // Tier 2: Client-side OpenStreetMap / BigDataCloud reverse geocode fallback with deep colony parsing
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    // 2a. OpenStreetMap Nominatim with deep locality breakdown
    const osmRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      { signal: controller.signal, headers: { "Accept-Language": "en" } },
    ).catch(() => null);

    if (osmRes && osmRes.ok) {
      clearTimeout(timeoutId);
      const data = await osmRes.json();
      const addr = data.address || {};
      const deepColony =
        addr.amenity ||
        addr.building ||
        addr.neighbourhood ||
        addr.residential ||
        addr.suburb ||
        addr.subdistrict ||
        addr.quarter ||
        addr.road ||
        addr.village ||
        "";
      const city = addr.city || addr.town || addr.county || addr.state_district || "";
      const state = addr.state || "";
      const area = deepColony || city || "Current Location";
      const resolved: SavedLocation = {
        area,
        city: city || state,
        state,
        latitude,
        longitude,
      };
      GEOCODE_CACHE.set(cacheKey, resolved);
      return resolved;
    }

    // 2b. BigDataCloud with informative locality inspection
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: controller.signal },
    ).catch(() => null);
    clearTimeout(timeoutId);
    if (res && res.ok) {
      const data = await res.json();
      const localityInfo = Array.isArray(data.localityInfo?.informative) ? data.localityInfo.informative : [];
      let deepName = "";
      for (const item of [...localityInfo].reverse()) {
        const n = String(item?.name || "").trim();
        const desc = String(item?.description || "").toLowerCase();
        if (n && (desc.includes("suburb") || desc.includes("neighbourhood") || desc.includes("colony") || desc.includes("sector") || desc.includes("locality"))) {
          deepName = n;
          break;
        }
      }
      const area = deepName || data.locality || data.city || "Current Location";
      const city = data.city || data.principalSubdivision || "";
      const state = data.principalSubdivision || "";
      const resolved: SavedLocation = {
        area,
        city: city || state,
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
    city: "",
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
          ? "Location request timed out. Please ensure GPS is enabled."
          : kind === "UNSUPPORTED"
            ? "This device or browser does not support location access."
            : "Unable to detect your location.",
    );
    this.name = "GeoError";
  }
}

export type DeviceLocation = { latitude: number; longitude: number; accuracy?: number };

/**
 * Background GPS Refinement:
 * When a coarse or cached position resolves immediately (<300ms), this continues silently
 * in the background to acquire a pin-point satellite fix without keeping the user waiting.
 */
let isRefiningBackgroundGps = false;
function triggerBackgroundRefinement(): void {
  if (isRefiningBackgroundGps || typeof navigator === "undefined" || !navigator.geolocation) return;
  isRefiningBackgroundGps = true;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      isRefiningBackgroundGps = false;
      if (pos?.coords?.latitude && pos?.coords?.longitude) {
        try {
          const refined = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          saveLocation(refined);
        } catch {}
      }
    },
    () => {
      isRefiningBackgroundGps = false;
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
  );
}

/**
 * Ultra-Fast Multi-Tier Geolocation Acquisition (Blinkit/Swiggy Sub-500ms Fast Lock):
 *
 * Tier 0: Check browser/OS cached fix (maximumAge: 10 mins) with a fast 400ms cutoff.
 *         On Android WebView and mobile browsers, returns in <50ms if any app used location recently.
 * Tier 1: Parallel Race — Fast Network/Cell Triangulation (enableHighAccuracy: false, timeout: 2000ms)
 *         races against Hardware GPS (enableHighAccuracy: true, timeout: 3200ms).
 *         The FIRST valid fix to arrive resolves immediately (<300-600ms).
 *         High-accuracy GPS refinement silently continues in the background.
 */
export async function getCurrentDeviceLocation(
  options: { timeoutMs?: number; enableHighAccuracy?: boolean; preferCached?: boolean } = {},
): Promise<DeviceLocation> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new GeoError("UNSUPPORTED");
  }

  // Tier 0: Instant OS / Browser Cached Position (<400ms cutoff)
  try {
    const cachedFix = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 400,
        maximumAge: 600000, // 10 minutes cache
      });
    });

    if (cachedFix?.coords?.latitude && cachedFix?.coords?.longitude) {
      triggerBackgroundRefinement();
      return {
        latitude: cachedFix.coords.latitude,
        longitude: cachedFix.coords.longitude,
        accuracy: cachedFix.coords.accuracy,
      };
    }
  } catch (err: any) {
    if (err?.code === 1 /* PERMISSION_DENIED */) {
      throw new GeoError("PERMISSION_DENIED");
    }
    // Timeout or no cache -> proceed immediately to parallel race
  }

  // Tier 1: Parallel Fast-Lock Race (Cell/WiFi vs Hardware GPS)
  return new Promise<DeviceLocation>((resolve, reject) => {
    let settled = false;
    let coarseWatchId: number | null = null;
    let fineWatchId: number | null = null;

    const cleanup = () => {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        if (coarseWatchId !== null) {
          try { navigator.geolocation.clearWatch(coarseWatchId); } catch {}
          coarseWatchId = null;
        }
        if (fineWatchId !== null) {
          try { navigator.geolocation.clearWatch(fineWatchId); } catch {}
          fineWatchId = null;
        }
      }
    };

    const handleSuccess = (pos: GeolocationPosition, isFine: boolean) => {
      if (settled) return;
      if (pos?.coords?.latitude && pos?.coords?.longitude) {
        settled = true;
        cleanup();
        if (!isFine) {
          triggerBackgroundRefinement();
        }
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      }
    };

    let denied = false;
    const handleError = (err: GeolocationPositionError) => {
      if (settled) return;
      if (err.code === 1 /* PERMISSION_DENIED */) {
        denied = true;
        settled = true;
        cleanup();
        reject(new GeoError("PERMISSION_DENIED"));
      }
    };

    // 1. Fast Network / Cell / Wi-Fi Triangulation (Works indoors, 200-500ms)
    try {
      navigator.geolocation.getCurrentPosition(
        (p) => handleSuccess(p, false),
        handleError,
        { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 },
      );
    } catch {}

    // 2. Hardware GPS (Fused provider)
    const gpsTimeout = options.timeoutMs ?? 3200;
    try {
      navigator.geolocation.getCurrentPosition(
        (p) => handleSuccess(p, true),
        handleError,
        { enableHighAccuracy: true, timeout: gpsTimeout, maximumAge: 15000 },
      );
      fineWatchId = navigator.geolocation.watchPosition(
        (p) => handleSuccess(p, true),
        handleError,
        { enableHighAccuracy: true, timeout: gpsTimeout, maximumAge: 15000 },
      );
    } catch {}

    // Overall hard timeout cutoff (default 3200ms)
    const maxWait = Math.min(gpsTimeout, 4000);
    setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        if (denied) {
          reject(new GeoError("PERMISSION_DENIED"));
        } else {
          reject(new GeoError("TIMEOUT"));
        }
      }
    }, maxWait);
  });
}

/**
 * Fast client-side IP-based location detection:
 * Used as a fallback when device GPS is denied or unavailable,
 * detecting the user's real state & city via their internet connection (IP geolocation),
 * without ever showing a wrong city from another state!
 */
export async function detectIpLocation(): Promise<SavedLocation | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || "";
      const state = data.principalSubdivision || "";
      const area = data.locality || city || "Current Location";
      if (city || state) {
        return {
          area,
          city,
          state,
          latitude: typeof data.latitude === "number" ? data.latitude : undefined,
          longitude: typeof data.longitude === "number" ? data.longitude : undefined,
        };
      }
    }
  } catch {
    /* IP lookup unavailable */
  }
  return null;
}

/**
 * Device GPS → reverse geocoding → the customer's *real device* location.
 * Resolves within <500ms on cached/network fix.
 * If GPS fails and allowFallback is true, detects real IP location.
 */
export async function detectDeviceLocation(
  options: { allowFallback?: boolean; timeoutMs?: number } = {},
): Promise<SavedLocation> {
  try {
    const fix = await getCurrentDeviceLocation({ timeoutMs: options.timeoutMs ?? 3200 });
    const location = await reverseGeocode(fix.latitude, fix.longitude);
    saveLocation(location);
    return location;
  } catch (err) {
    if (options.allowFallback) {
      const ipLoc = await detectIpLocation();
      if (ipLoc) {
        saveLocation(ipLoc);
        return ipLoc;
      }
    }
    throw err;
  }
}


