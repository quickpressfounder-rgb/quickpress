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
 * 📍 Fetch live location-based dynamic surge zones computed by the backend engine.
 */
export async function fetchSurgeZones(
  lat?: number | null,
  lng?: number | null,
  radiusKm: number = 15.0
): Promise<SurgeZonesResponse> {
  const params = new URLSearchParams();
  if (lat !== undefined && lat !== null) params.set("lat", String(lat));
  if (lng !== undefined && lng !== null) params.set("lng", String(lng));
  params.set("radius_km", String(radiusKm));

  const query = params.toString();
  return await apiGetJson<SurgeZonesResponse>(`/api/rider/surge/zones${query ? `?${query}` : ""}`);
}

/**
 * 🔍 Quick check if a given pickup coordinate has active surge pricing.
 */
export async function checkLocationSurge(
  lat: number,
  lng: number
): Promise<LocationSurgeStatus> {
  return await apiGetJson<LocationSurgeStatus>(
    `/api/rider/surge/check-location?lat=${lat}&lng=${lng}`
  );
}
