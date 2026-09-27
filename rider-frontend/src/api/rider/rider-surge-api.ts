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
 * 📍 Surge is permanently disabled. Returns zero surge and empty zones.
 */
export async function fetchSurgeZones(
  lat?: number | null,
  lng?: number | null,
  radiusKm: number = 15.0
): Promise<SurgeZonesResponse> {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    timeShift: "normal",
    riderLocation: null,
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
 * 🔍 Surge is permanently disabled. Returns hasSurge: false.
 */
export async function checkLocationSurge(
  lat: number,
  lng: number
): Promise<LocationSurgeStatus> {
  return {
    hasSurge: false,
    bonus: 0,
    multiplier: "1.0x",
    zoneName: null,
    reason: "Standard Rates (No Surge)",
  };
}
