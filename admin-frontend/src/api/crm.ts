/**
 * QuickPress Enterprise CRM & Geo-Intelligence API Client.
 * Multi-entity 360 lookup (Customer, Rider, Partner), Live Geo-Pulse, and Leaderboards.
 */

import { apiGetJson } from "./core/transport";

export type CrmEntityType = "customer" | "rider" | "partner";

export interface CrmLocationData {
  states: string[];
  cities: {
    city: string;
    state: string;
    pincodes: string[];
  }[];
}

export interface CrmSearchResult {
  id: string;
  entityType: CrmEntityType;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
  statusColor: string;
  primaryMetric: {
    label: string;
    value: string;
  };
  secondaryMetric: {
    label: string;
    value: string;
  };
  avatar: string;
  joinedAt: string;
  lastActive: string;
  tags: string[];
}

export interface CrmSearchResponse {
  items: CrmSearchResult[];
  total: number;
  query: string;
}

export interface CrmGeoPulse {
  summary: {
    totalSales: number;
    totalOrders: number;
    deliveredOrders: number;
    activeOrders: number;
    cancelledOrders: number;
    platformRevenue: number;
    refundsAmount: number;
    refundsCount: number;
    riderIncentives: number;
  };
  fleet: {
    totalRiders: number;
    onlineRiders: number;
    onDeliveryRiders: number;
    idleRiders: number;
    offlineRiders: number;
    activePartners: number;
    totalPartners: number;
  };
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
  location: {
    state: string;
    city: string;
    pincode: string;
  };
}

export interface LeaderboardPartner {
  rank: number;
  id: string;
  name: string;
  city: string;
  pincode: string;
  rating: number;
  gmv: number;
  orders: number;
  cancellationRate: number;
}

export interface LeaderboardRider {
  rank: number;
  id: string;
  name: string;
  city: string;
  pincode: string;
  rating: number;
  deliveries: number;
  earnings: number;
  onTimeRate: number;
}

export interface LeaderboardCustomer {
  rank: number;
  id: string;
  name: string;
  city: string;
  pincode: string;
  spend: number;
  orders: number;
  membership: string;
  loyaltyPoints: number;
}

export interface CrmLeaderboardResponse {
  partners: LeaderboardPartner[];
  riders: LeaderboardRider[];
  customers: LeaderboardCustomer[];
  timeframe: string;
  filters: {
    state: string;
    city: string;
    pincode: string;
  };
}

export interface CrmProfileResponse {
  entityType: CrmEntityType;
  profile: Record<string, any>;
}

/** GET /api/admin/crm/locations — States, cities, and pincodes list */
export async function fetchCrmLocations(): Promise<CrmLocationData> {
  return await apiGetJson<CrmLocationData>("/api/admin/crm/locations");
}

/** GET /api/admin/crm/search — Universal lookup across Customers, Riders, Partners */
export async function searchCrmEntities(params: {
  q?: string;
  entity_type?: string;
  state?: string;
  city?: string;
  pincode?: string;
  limit?: number;
}): Promise<CrmSearchResponse> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.entity_type && params.entity_type !== "all") query.set("entity_type", params.entity_type);
  if (params.state && params.state !== "all") query.set("state", params.state);
  if (params.city && params.city !== "all") query.set("city", params.city);
  if (params.pincode && params.pincode !== "all") query.set("pincode", params.pincode);
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  return await apiGetJson<CrmSearchResponse>(`/api/admin/crm/search${qs ? `?${qs}` : ""}`);
}

/** GET /api/admin/crm/profile/{entity_type}/{id} — Deep 360-degree profile dossier */
export async function fetchCrmDeepProfile(
  entityType: CrmEntityType | string,
  id: string
): Promise<CrmProfileResponse> {
  return await apiGetJson<CrmProfileResponse>(
    `/api/admin/crm/profile/${encodeURIComponent(entityType)}/${encodeURIComponent(id)}`
  );
}

/** GET /api/admin/crm/geo-pulse — Real-time Geo Operations metrics */
export async function fetchCrmGeoPulse(params: {
  state?: string;
  city?: string;
  pincode?: string;
  timeframe?: string;
}): Promise<CrmGeoPulse> {
  const query = new URLSearchParams();
  if (params.state && params.state !== "all") query.set("state", params.state);
  if (params.city && params.city !== "all") query.set("city", params.city);
  if (params.pincode && params.pincode !== "all") query.set("pincode", params.pincode);
  if (params.timeframe) query.set("timeframe", params.timeframe);

  const qs = query.toString();
  return await apiGetJson<CrmGeoPulse>(`/api/admin/crm/geo-pulse${qs ? `?${qs}` : ""}`);
}

/** GET /api/admin/crm/leaderboard — Top Partners, Riders, Customers by Geo */
export async function fetchCrmLeaderboard(params: {
  state?: string;
  city?: string;
  pincode?: string;
  timeframe?: string;
}): Promise<CrmLeaderboardResponse> {
  const query = new URLSearchParams();
  if (params.state && params.state !== "all") query.set("state", params.state);
  if (params.city && params.city !== "all") query.set("city", params.city);
  if (params.pincode && params.pincode !== "all") query.set("pincode", params.pincode);
  if (params.timeframe) query.set("timeframe", params.timeframe);

  const qs = query.toString();
  return await apiGetJson<CrmLeaderboardResponse>(`/api/admin/crm/leaderboard${qs ? `?${qs}` : ""}`);
}
