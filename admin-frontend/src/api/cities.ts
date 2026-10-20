/**
 * Master City, State, Sector & Zone Delivery Engine API Client
 *
 * GET /api/admin/cities/intelligence       -> Complete cities & zones with live tracking metrics
 * GET /api/admin/cities/stats              -> Top geo KPI metrics
 * GET /api/admin/cities/{id}/360           -> Full 360 city & zone profile
 * PATCH /api/admin/cities/{id}/radius      -> Update delivery radius & delivery fees
 * POST /api/admin/cities/{id}/zones        -> Add operational sector / zone
 * PUT /api/admin/cities/{id}/zones/{zoneId}-> Update sector / zone geofence
 * DELETE /api/admin/cities/{id}/zones/{zoneId} -> Remove zone
 * POST /api/admin/partners/{id}/assign-zone-> Map partner store to sector/zone
 * POST /api/admin/riders/{id}/assign-zone  -> Map rider to sector/zone
 * POST/PUT/DELETE /api/admin/cities        -> City lifecycle management
 */
import { apiGetJson, apiPostJson, apiPutJson, apiPatchJson, apiDeleteJson } from "@/api/core/transport";

export type CityZone = {
  zoneId: string;
  id?: string;
  name: string;
  sector: string;
  radiusKm: number;
  lat: number;
  lng: number;
  pincodes: string[];
  status: "Operational" | "High Demand Surge" | "Paused" | string;
  baseFee: number;
  surgeMultiplier?: number;
};

export type CityFinancials = {
  grossRevenue: number;
  platformCommission: number;
  partnerEarnings: number;
  riderEarnings: number;
  totalOrders: number;
  deliveredOrders: number;
  liveOrders: number;
  cancelledOrders: number;
  aov: number;
};

export type CityPartner = {
  id: string;
  name: string;
  storeName?: string;
  address: string;
  phone: string;
  state?: string;
  city?: string;
  sector?: string;
  zoneId?: string;
  area?: string;
  pincode?: string;
  servicePincodes?: string[];
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
  rating: number;
  status: string;
  enabled?: boolean;
};

export type CityCaptain = {
  id?: string;
  riderId: string;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
  state?: string;
  city?: string;
  sector?: string;
  zoneId?: string;
  pincode?: string;
  pincodes?: string[];
  operatingPincodes?: string[];
  rating: number;
  liveState: "Online" | "On delivery" | "Offline" | string;
  trips: number;
  earnings: number;
};

export type CityCustomer = {
  id: string;
  name: string;
  phone: string;
  city: string;
};

export type CityIntelligence = {
  _id: string;
  id: string;
  city: string;
  name: string;
  state: string;
  country: string;
  tier: string;
  status: "Live" | "Pilot" | "Paused" | "Coming Soon";
  deliveryRadiusKm: number;
  pickupRadius: string;
  baseDeliveryFee: number;
  perKmFee: number;
  freeDeliveryAbove: number;
  minOrderValue: number;
  surgeMultiplier: number;
  center: { lat: number; lng: number };
  pincodes: string[];
  zones: CityZone[];
  totalZones: number;
  financials: CityFinancials;
  totalCustomers: number;
  totalPartners: number;
  activePartners: number;
  totalRiders: number;
  onlineRiders: number;
  partnerList: CityPartner[];
  riderList: CityCaptain[];
  customerList: CityCustomer[];
  recentOrders: Array<{
    id: string;
    code: string;
    customer: string;
    partner: string;
    rider: string;
    amount: number;
    status: string;
    placedAt: string;
  }>;
};

export type CityStats = {
  totalCities: number;
  totalZones: number;
  totalGeoRevenue: number;
  totalCityCustomers: number;
  totalPartnerHubs: number;
  totalActiveCaptains: number;
  avgDeliveryRadius: number;
};

export type AdminCity = CityIntelligence;

export type AdminState = {
  state: string;
  citiesCount: number;
  liveCities: number;
  partners: number;
  riders: number;
  customers: number;
  orders: number;
  sales: number;
};

export type AdminArea = {
  id: string;
  area: string;
  city: string;
  cityId?: string;
  state?: string;
  pincode: string;
  zone: string;
  status: "Live" | "Paused";
};

export type DeliveryZone = {
  id: string;
  zone: string;
  city: string;
  areas: number;
  slots: string;
  radius: string;
};

/** GET /api/admin/cities/intelligence */
export async function fetchCitiesIntelligence(): Promise<CityIntelligence[]> {
  try {
    const rows = await apiGetJson<CityIntelligence[]>("/api/admin/cities/intelligence");
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error("fetchCitiesIntelligence error:", err);
    return [];
  }
}

/** GET /api/admin/cities/stats */
export async function fetchCityStats(): Promise<CityStats> {
  try {
    return await apiGetJson<CityStats>("/api/admin/cities/stats");
  } catch {
    return {
      totalCities: 1,
      totalZones: 4,
      totalGeoRevenue: 366,
      totalCityCustomers: 19,
      totalPartnerHubs: 8,
      totalActiveCaptains: 17,
      avgDeliveryRadius: 15.0,
    };
  }
}

/** GET /api/admin/cities/{id}/360 */
export async function fetchCity360(id: string): Promise<CityIntelligence> {
  return await apiGetJson<CityIntelligence>(`/api/admin/cities/${encodeURIComponent(id)}/360`);
}

/** PATCH /api/admin/cities/{id}/radius */
export async function updateCityRadius(
  id: string,
  payload: {
    deliveryRadiusKm?: number;
    baseDeliveryFee?: number;
    perKmFee?: number;
    freeDeliveryAbove?: number;
    minOrderValue?: number;
    surgeMultiplier?: number;
    status?: string;
  },
) {
  return await apiPatchJson<CityIntelligence>(`/api/admin/cities/${encodeURIComponent(id)}/radius`, payload);
}

/** POST /api/admin/cities/{id}/zones */
export async function addCityZone(
  id: string,
  payload: {
    name: string;
    sector: string;
    radiusKm: number;
    lat?: number;
    lng?: number;
    pincodes?: string[];
    baseFee?: number;
    status?: string;
  },
) {
  return await apiPostJson<CityIntelligence>(`/api/admin/cities/${encodeURIComponent(id)}/zones`, payload);
}

/** PUT /api/admin/cities/{id}/zones/{zoneId} */
export async function updateCityZone(
  cityId: string,
  zoneId: string,
  payload: Partial<CityZone>,
) {
  return await apiPutJson<CityIntelligence>(`/api/admin/cities/${encodeURIComponent(cityId)}/zones/${encodeURIComponent(zoneId)}`, payload);
}

/** DELETE /api/admin/cities/{id}/zones/{zoneId} */
export async function deleteCityZone(cityId: string, zoneId: string) {
  return await apiDeleteJson<CityIntelligence>(`/api/admin/cities/${encodeURIComponent(cityId)}/zones/${encodeURIComponent(zoneId)}`);
}

/** POST /api/admin/partners/{id}/assign-zone */
export async function assignPartnerTerritory(
  partnerId: string,
  payload: {
    state?: string;
    city?: string;
    sector?: string;
    zoneId?: string;
    latitude?: number;
    longitude?: number;
    serviceRadiusKm?: number;
  },
) {
  return await apiPostJson<any>(`/api/admin/partners/${encodeURIComponent(partnerId)}/assign-zone`, payload);
}

/** POST /api/admin/riders/{id}/assign-zone */
export async function assignRiderTerritory(
  riderId: string,
  payload: {
    state?: string;
    city?: string;
    sector?: string;
    zoneId?: string;
  },
) {
  return await apiPostJson<any>(`/api/admin/riders/${encodeURIComponent(riderId)}/assign-zone`, payload);
}

export async function fetchCities(): Promise<CityIntelligence[]> {
  return await fetchCitiesIntelligence();
}

export async function fetchStates(): Promise<AdminState[]> {
  try {
    return await apiGetJson<AdminState[]>("/api/admin/states");
  } catch {
    return [];
  }
}

export async function saveState(payload: { state: string; capital?: string; tier?: string }) {
  return await apiPostJson<AdminState>("/api/admin/states", payload);
}

export async function fetchAreas(cityId?: string): Promise<AdminArea[]> {
  try {
    const q = cityId ? `?cityId=${cityId}` : "";
    const rows = await apiGetJson<any[]>(`/api/admin/areas${q}`);
    return (rows || []).map((r) => ({
      id: r._id || r.id,
      area: r.area,
      city: r.city,
      cityId: r.cityId,
      state: r.state || "Uttar Pradesh",
      pincode: r.pincode || "—",
      zone: r.zone || "Zone 1",
      status: r.status || "Live",
    }));
  } catch {
    return [];
  }
}

export async function toggleCityStatus(cityId: string, status: "Live" | "Pilot" | "Paused" | "Coming Soon") {
  return await apiPatchJson<CityIntelligence>(`/api/admin/cities/${encodeURIComponent(cityId)}/status`, { status });
}

export async function saveCity(payload: {
  city: string;
  name?: string;
  state: string;
  country?: string;
  pickupRadius?: string;
  deliveryRadiusKm?: number;
  baseDeliveryFee?: number;
  surgeMultiplier?: number;
  pincodes?: string[];
  tier?: string;
  status?: string;
}) {
  return await apiPostJson<CityIntelligence>("/api/admin/cities", {
    city: payload.city,
    name: payload.name || payload.city,
    state: payload.state || "Uttar Pradesh",
    country: payload.country || "India",
    deliveryRadiusKm: payload.deliveryRadiusKm || 15.0,
    baseDeliveryFee: payload.baseDeliveryFee || 20.0,
    surgeMultiplier: payload.surgeMultiplier || 1.0,
    pincodes: payload.pincodes || [],
    tier: payload.tier || "Tier-2",
    status: payload.status || "Live",
  });
}

export async function deleteCity(cityId: string) {
  return await apiDeleteJson<{ deleted: boolean; cityId: string }>(`/api/admin/cities/${encodeURIComponent(cityId)}`);
}

export async function saveArea(payload: { area: string; city: string; state: string; pincode: string; zone: string }) {
  return await apiPostJson<AdminArea>("/api/admin/areas", payload);
}

export async function deleteArea(areaId: string) {
  return await apiDeleteJson<{ ok: boolean }>(`/api/admin/areas/${encodeURIComponent(areaId)}`);
}

export async function fetchZones(): Promise<DeliveryZone[]> {
  const cities = await fetchCitiesIntelligence();
  return cities.map((c) => ({
    id: `zone-${c.id}`,
    zone: `${c.city} Express Zone`,
    city: c.city,
    areas: c.totalZones || 4,
    slots: "8 AM – 12 PM, 12 PM – 4 PM, 4 PM – 8 PM",
    radius: `${c.deliveryRadiusKm} km`,
  }));
}

export type PincodePartner = {
  id: string;
  name: string;
  storeName?: string;
  address: string;
  phone: string;
  rating: number;
  status: string;
  city?: string;
  state?: string;
  pincode?: string;
  servicePincodes?: string[];
  enabled?: boolean;
};

export type PincodeCaptain = {
  id?: string;
  riderId: string;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
  rating: number;
  liveState: string;
  city?: string;
  pincode?: string;
  pincodes?: string[];
  trips: number;
  earnings: number;
};

export type PincodeDetail = {
  pincode: string;
  areaName: string;
  city: string;
  state: string;
  status: "Active" | "Paused" | string;
  baseFee: number;
  surgeMultiplier: number;
  totalOrders: number;
  deliveredOrders: number;
  grossRevenue: number;
  platformCommission: number;
  partnerEarnings: number;
  riderEarnings: number;
  aov: number;
  partnersCount: number;
  partners: PincodePartner[];
  topPartner: PincodePartner | null;
  ridersCount: number;
  onlineRidersCount: number;
  riders: PincodeCaptain[];
  topRider: PincodeCaptain | null;
  customersCount: number;
  recentOrders: Array<{
    id: string;
    code: string;
    customer: string;
    partner: string;
    rider: string;
    amount: number;
    status: string;
    placedAt: string;
  }>;
};

export type CityPincodesIntelligence = {
  cityId: string;
  city: string;
  name: string;
  state: string;
  tier: string;
  status: string;
  totalPincodes: number;
  activePincodes: number;
  totalGMV: number;
  totalOrders: number;
  pincodes: PincodeDetail[];
};

export async function fetchCityPincodesIntelligence(cityId: string): Promise<CityPincodesIntelligence> {
  return await apiGetJson<CityPincodesIntelligence>(`/api/admin/cities/${encodeURIComponent(cityId)}/pincodes-intelligence`);
}

export async function addCityPincode(
  cityId: string,
  payload: { pincode: string; areaName?: string; baseFee?: number; surgeMultiplier?: number; status?: string },
) {
  return await apiPostJson<CityIntelligence>(`/api/admin/cities/${encodeURIComponent(cityId)}/pincodes`, payload);
}

export async function updateCityPincode(
  cityId: string,
  pincode: string,
  payload: { areaName?: string; baseFee?: number; surgeMultiplier?: number; status?: string },
) {
  return await apiPutJson<CityIntelligence>(`/api/admin/cities/${encodeURIComponent(cityId)}/pincodes/${encodeURIComponent(pincode)}`, payload);
}

export async function deleteCityPincode(cityId: string, pincode: string) {
  return await apiDeleteJson<CityIntelligence>(`/api/admin/cities/${encodeURIComponent(cityId)}/pincodes/${encodeURIComponent(pincode)}`);
}

export async function assignPartnerPincodes(
  partnerId: string,
  payload: { servicePincodes: string[]; pincode?: string; city?: string; state?: string },
) {
  return await apiPostJson<any>(`/api/admin/partners/${encodeURIComponent(partnerId)}/assign-pincodes`, payload);
}

export async function assignRiderPincodes(
  riderId: string,
  payload: { operatingPincodes: string[]; pincode?: string; city?: string; state?: string },
) {
  return await apiPostJson<any>(`/api/admin/riders/${encodeURIComponent(riderId)}/assign-pincodes`, payload);
}

export type ZomatoDispatchConfig = {
  wave1RadiusKm: number;
  wave2RadiusKm: number;
  wave3RadiusKm: number;
  wave1TimeoutSec: number;
  wave2TimeoutSec: number;
  architecture?: string;
};

export type LiveWaveItem = {
  rideId: string;
  orderId?: string;
  orderCode?: string;
  currentWave: number;
  tierLabel: string;
  waveCaptainsCount: number;
  dispatchedAt: string;
};

export type LiveWavesResponse = {
  activeCount: number;
  liveWaves: LiveWaveItem[];
};

export async function fetchDispatchConfig(): Promise<ZomatoDispatchConfig> {
  return await apiGetJson<ZomatoDispatchConfig>("/api/admin/dispatch/config");
}

export async function updateDispatchConfig(payload: Partial<ZomatoDispatchConfig>): Promise<ZomatoDispatchConfig> {
  return await apiPatchJson<ZomatoDispatchConfig>("/api/admin/dispatch/config", payload);
}

export async function fetchLiveWaves(): Promise<LiveWavesResponse> {
  return await apiGetJson<LiveWavesResponse>("/api/admin/dispatch/live-waves");
}

