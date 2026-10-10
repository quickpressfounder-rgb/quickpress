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

/** Resolve the customer's current location: saved address, then cached, then API. */
export function fetchLocation(options: { forceRefresh?: boolean | undefined; signal?: AbortSignal | undefined } = {}): Promise<SavedLocation | null> {
  const saved = readLocation();
  if (saved && !options.forceRefresh) return Promise.resolve(saved);

  const stale = readStaleCache<SavedLocation>(CACHE_KEYS.location);
  if (stale && !options.forceRefresh) return Promise.resolve(stale);

  return resolveResource<SavedLocation>({
    forceRefresh: options.forceRefresh,
    request: () => apiGet<SavedLocation>(API_ENDPOINTS.location, { signal: options.signal }),
    readCache: () => readCache<SavedLocation>(CACHE_KEYS.location),
    readStaleCache: () => readStaleCache<SavedLocation>(CACHE_KEYS.location),
    writeCache: (value) => writeCache(CACHE_KEYS.location, value),
  }).catch(() => null);
}

/** Location refresh strictly via real device GPS, then reverse geocoding. Falls back gracefully without hanging. */
export async function refreshLocationFromGps(options: { allowFallback?: boolean } = {}): Promise<SavedLocation> {
  const location = await detectDeviceLocation({ allowFallback: options.allowFallback ?? true });
  changeLocation(location);
  return location;
}
