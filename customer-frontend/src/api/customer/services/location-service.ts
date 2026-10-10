/**
 * Location Service — GET /api/location
 *
 * Supports the four Home location behaviours: current GPS, saved address,
 * change address and location refresh.
 */

import { API_ENDPOINTS } from "../api/config";
import { CACHE_KEYS, readCache, readStaleCache, writeCache } from "../api/cache";
import { apiGet, resolveResource } from "../api/http-client";
import {
  detectDeviceLocation,
  detectIpLocation,
  getDefaultLocation,
  readLocation,
  reverseGeocode,
  saveLocation,
  type SavedLocation,
} from "../location";

export type { SavedLocation };
export { readLocation, getDefaultLocation };

/** Saved address chosen by the customer, if any. */
export function readSavedLocation(): SavedLocation | null {
  return readLocation();
}

export function changeLocation(location: SavedLocation) {
  saveLocation(location);
  writeCache(CACHE_KEYS.location, location);
}

/** Resolve the customer's current location: saved address, then cached, then live device GPS / IP. */
export async function fetchLocation(options: { forceRefresh?: boolean | undefined; signal?: AbortSignal | undefined } = {}): Promise<SavedLocation | null> {
  const saved = readLocation();
  if (saved && !options.forceRefresh) return saved;

  const stale = readStaleCache<SavedLocation>(CACHE_KEYS.location);
  if (stale && stale.city && stale.area !== "Current Location" && !options.forceRefresh) return stale;

  // 1. Detect live real device GPS or real IP geolocation directly!
  try {
    const live = await detectDeviceLocation({ allowFallback: true, timeoutMs: 2500 });
    if (live && live.city && live.area !== "Current Location") {
      changeLocation(live);
      return live;
    }
  } catch {}

  // 2. Fallback to API endpoint only if it returns a real configured city
  try {
    const apiLoc = await apiGet<SavedLocation>(API_ENDPOINTS.location, { signal: options.signal });
    if (apiLoc && apiLoc.city && apiLoc.area !== "Current Location") {
      changeLocation(apiLoc);
      return apiLoc;
    }
  } catch {}

  // 3. Fallback to instant IP location detection
  const ipLoc = await detectIpLocation().catch(() => null);
  if (ipLoc && (ipLoc.city || ipLoc.area)) {
    changeLocation(ipLoc);
    return ipLoc;
  }

  return null;
}

/** Location refresh strictly via real device GPS, then reverse geocoding. Falls back gracefully without hanging. */
export async function refreshLocationFromGps(options: { allowFallback?: boolean } = {}): Promise<SavedLocation> {
  const location = await detectDeviceLocation({ allowFallback: options.allowFallback ?? true });
  changeLocation(location);
  return location;
}
