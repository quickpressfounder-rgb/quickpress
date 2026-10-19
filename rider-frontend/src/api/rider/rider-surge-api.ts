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
    if (res && Array.isArray(res.zones) && res.zones.length > 0) {
      return res;
    }
  } catch (error) {
    console.warn("Failed to fetch live surge zones:", error);
  }

  // Active default Kasganj surge zones if network or backend unavailable
  const fallbackZones: SurgeHotspotData[] = [
    {
      id: "ksj-station",
      name: "Kasganj Junction Station Hub",
      lat: 27.8105,
      lng: 78.641,
      radiusMeters: 850,
      bonus: 25,
      multiplier: "1.6x",
      label: "+₹25 Surge 🔥",
      demandLevel: "CRITICAL 🔥",
      tag: "Transit Hotspot",
      description: "High passenger traffic & food deliveries",
      ordersWaiting: 8,
      ridersOnline: 3,
      distanceKm: 0.8,
      distanceMeters: 800,
      etaMinutes: 3,
      color: "#EF4444",
      isCurrentRiderInside: false,
      isActive: true,
    },
    {
      id: "ksj-market",
      name: "Main Bazaar & Gandhi Murti",
      lat: 27.8145,
      lng: 78.6495,
      radiusMeters: 750,
      bonus: 20,
      multiplier: "1.5x",
      label: "+₹20 Surge ⚡",
      demandLevel: "HIGH ⚡",
      tag: "Shopping Hub",
      description: "Retail orders, grocery & quick commerce",
      ordersWaiting: 6,
      ridersOnline: 4,
      distanceKm: 1.2,
      distanceMeters: 1200,
      etaMinutes: 4,
      color: "#F59E0B",
      isCurrentRiderInside: false,
      isActive: true,
    },
    {
      id: "ksj-bilram",
      name: "Bilram Gate Express Zone",
      lat: 27.808,
      lng: 78.6525,
      radiusMeters: 700,
      bonus: 20,
      multiplier: "1.4x",
      label: "+₹20 Surge ⚡",
      demandLevel: "HIGH ⚡",
      tag: "Express Zone",
      description: "Fast courier & instant laundry dispatches",
      ordersWaiting: 5,
      ridersOnline: 2,
      distanceKm: 1.6,
      distanceMeters: 1600,
      etaMinutes: 5,
      color: "#F59E0B",
      isCurrentRiderInside: false,
      isActive: true,
    },
    {
      id: "ksj-soron",
      name: "Soron Gate Commercial Hub",
      lat: 27.8182,
      lng: 78.6442,
      radiusMeters: 700,
      bonus: 15,
      multiplier: "1.3x",
      label: "+₹15 Surge 🚀",
      demandLevel: "MODERATE 🚀",
      tag: "Commercial Zone",
      description: "Wholesale and departmental store dispatches",
      ordersWaiting: 4,
      ridersOnline: 3,
      distanceKm: 1.9,
      distanceMeters: 1900,
      etaMinutes: 6,
      color: "#10B981",
      isCurrentRiderInside: false,
      isActive: true,
    },
  ];

  return {
    status: "active",
    timestamp: new Date().toISOString(),
    timeShift: "Peak Hours",
    riderLocation: lat && lng ? { lat, lng } : null,
    isRiderInSurgeZone: false,
    activeSurgeBonus: 25,
    activeMultiplier: "1.6x",
    currentZone: null,
    nearestZone: fallbackZones[0],
    totalZones: fallbackZones.length,
    zones: fallbackZones,
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
