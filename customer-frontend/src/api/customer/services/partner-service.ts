import { API_ENDPOINTS } from "../api/config";
import { CACHE_KEYS, readCache, readStaleCache, writeCache } from "../api/cache";
import { apiGet, apiPost, resolveResource } from "../api/http-client";
import type { Partner } from "../home-api";
import type { SavedLocation } from "../location";

export type { Partner };

export type NearbyPartnerQuery = {
  location?: SavedLocation | null | undefined;
  limit?: number | undefined;
  forceRefresh?: boolean | undefined;
  signal?: AbortSignal | undefined;
};

export type LocationAvailabilityResult = {
  success: boolean;
  available: boolean;
  partnerCount: number;
  partners: Partner[];
  nearbyAreas: string[];
  location: {
    area: string;
    city: string;
    state: string;
    pincode: string;
    lat?: number | null;
    lng?: number | null;
  };
};

export function fetchNearbyPartners(query: NearbyPartnerQuery = {}) {
  const cityKey = query.location?.city ? query.location.city.trim().toLowerCase() : "none";
  const areaKey = query.location?.area ? query.location.area.trim().toLowerCase() : "none";
  const cacheKey = `${CACHE_KEYS.partners}:${cityKey}:${areaKey}`;

  return resolveResource<Partner[]>({
    forceRefresh: query.forceRefresh,
    request: () =>
      apiGet<Partner[]>(API_ENDPOINTS.nearbyPartners, {
        signal: query.signal,
        params: {
          lat: query.location?.latitude ?? undefined,
          lng: query.location?.longitude ?? undefined,
          city: query.location?.city ?? undefined,
          area: query.location?.area ?? undefined,
          limit: query.limit ?? 10,
        },
      }),
    readCache: () => readCache<Partner[]>(cacheKey as any),
    readStaleCache: () => readStaleCache<Partner[]>(cacheKey as any),
    writeCache: (value) => writeCache(cacheKey as any, value),
  });
}

const AVAILABILITY_CACHE = new Map<string, { data: LocationAvailabilityResult; timestamp: number }>();
const AVAILABILITY_CACHE_TTL = 30_000;

/** Check real-time service availability for customer's location. */
export async function checkLocationAvailability(
  location: SavedLocation,
  signal?: AbortSignal,
): Promise<LocationAvailabilityResult> {
  const cityKey = (location.city || "").trim().toLowerCase();
  const areaKey = (location.area || "").trim().toLowerCase();
  const cacheKey = `${cityKey}:${areaKey}:${location.latitude ?? ""}:${location.longitude ?? ""}`;

  const cached = AVAILABILITY_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AVAILABILITY_CACHE_TTL) {
    return cached.data;
  }

  const result = await apiGet<LocationAvailabilityResult>(API_ENDPOINTS.checkLocationAvailability, {
    signal,
    params: {
      city: location.city || undefined,
      area: location.area || undefined,
      lat: location.latitude ?? undefined,
      lng: location.longitude ?? undefined,
    },
  });

  if (result) {
    AVAILABILITY_CACHE.set(cacheKey, { data: result, timestamp: Date.now() });
  }
  return result;
}

export type WaitlistPayload = {
  area: string;
  city: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
};

export async function submitWaitlist(
  payload: WaitlistPayload,
): Promise<{ ok: boolean; message: string; id?: string }> {
  return apiPost<{ ok: boolean; message: string; id?: string }>(
    API_ENDPOINTS.customerWaitlist,
    payload,
  );
}

