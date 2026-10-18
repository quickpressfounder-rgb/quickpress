import { apiGetJson } from "../core/transport";

export interface SurgeHotspotData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  bonus: number;
  multiplier: string;
  label: string;
  demandLevel: "CRITICAL 🔥" | "HIGH ⚡" | "MODERATE 🚀" | string;
  tag?: string;
  description?: string;
  ordersWaiting: number;
  ridersOnline: number;
  distanceKm: number;
  distanceMeters: number;
  etaMinutes: number;
  color: string;
  isCurrentRiderInside: boolean;
  isActive: boolean;
}

export interface SurgeZonesResponse {
  status: string;
  timestamp: string;
  timeShift: string;
  riderLocation: { lat: number; lng: number } | null;
  isRiderInSurgeZone: boolean;
  activeSurgeBonus: number;
  activeMultiplier: string;
  currentZone: SurgeHotspotData | null;
  nearestZone: SurgeHotspotData | null;
  totalZones: number;
  zones: SurgeHotspotData[];
}

export interface LocationSurgeStatus {
  hasSurge: boolean;
  bonus: number;
  multiplier: string;
  zoneName: string | null;
  reason: string;
}

/**
 * 📍 Fetches live location-based surge hotspots from the backend engine.
 */
export async function fetchSurgeZones(
  lat?: number | null,
  lng?: number | null,
  radiusKm: number = 15.0
): Promise<SurgeZonesResponse> {
  try {
    const params = new URLSearchParams();
    if (lat !== undefined && lat !== null) params.append("lat", String(lat));
    if (lng !== undefined && lng !== null) params.append("lng", String(lng));
    params.append("radius_km", String(radiusKm));

    const res = await apiGetJson<SurgeZonesResponse>(`/api/rider/surge/zones?${params.toString()}`);
    if (res && Array.isArray(res.zones)) {
      return res;
    }
  } catch (error) {
    console.warn("Failed to fetch live surge zones:", error);
  }

  return {
    status: "fallback",
    timestamp: new Date().toISOString(),
    timeShift: "Standard",
    riderLocation: lat && lng ? { lat, lng } : null,
    isRiderInSurgeZone: false,
    activeSurgeBonus: 0,
    activeMultiplier: "1.0x",
    currentZone: null,
    nearestZone: null,
    totalZones: 0,
    zones: [],
  };
}

/**
 * 🔍 Checks whether a specific coordinate has active surge pricing.
 */
export async function checkLocationSurge(
  lat: number,
  lng: number
): Promise<LocationSurgeStatus> {
  try {
    const res = await apiGetJson<LocationSurgeStatus>(`/api/rider/surge/check-location?lat=${lat}&lng=${lng}`);
    if (res) return res;
  } catch (error) {
    console.warn("Failed to check location surge:", error);
  }

  return {
    hasSurge: false,
    bonus: 0,
    multiplier: "1.0x",
    zoneName: null,
    reason: "Standard Rates (No Surge)",
  };
}
