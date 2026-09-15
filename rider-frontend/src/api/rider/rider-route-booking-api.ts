import { apiGetJson, apiPostJson } from "../core/transport";
import { readSession } from "../core/session-store";

export interface RouteDestination {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
}

export interface RouteBookingState {
  _id: string;
  riderId: string;
  isActive: boolean;
  destination: RouteDestination | null;
  maxDetourKm: number;
  passesUsedToday: number;
  passesRemaining: number;
  maxPassesPerDay: number;
  lastResetDate: string;
  savedAddresses: RouteDestination[];
  activatedAt?: string | null;
  updatedAt?: string;
}

function getRiderIdQuery(): string {
  const sess = readSession("rider") || readSession();
  const riderId =
    (sess as any)?.account?.linkedId ??
    (sess as any)?.account?.id ??
    (sess as any)?.riderId ??
    (sess as any)?.id ??
    "";
  return riderId ? `?rider_id=${encodeURIComponent(riderId)}` : "";
}

/**
 * Fetch current Route Booking state for this Captain.
 */
export async function fetchRouteBookingState(): Promise<RouteBookingState> {
  const qs = getRiderIdQuery();
  return await apiGetJson<RouteBookingState>(`/api/rider/route-booking${qs}`);
}

/**
 * Toggle Route Booking ON or OFF.
 */
export async function toggleRouteBooking(
  enable: boolean
): Promise<{ ok: boolean; isActive: boolean; state: RouteBookingState; error?: string }> {
  const qs = getRiderIdQuery();
  const sess = readSession("rider") || readSession();
  const riderId =
    (sess as any)?.account?.linkedId ??
    (sess as any)?.account?.id ??
    (sess as any)?.riderId ??
    "";
  return await apiPostJson<{ ok: boolean; isActive: boolean; state: RouteBookingState; error?: string }>(
    `/api/rider/route-booking/toggle${qs}`,
    { enable, riderId }
  );
}

/**
 * Update the active Route Destination and Corridor tolerance.
 */
export async function setRouteDestination(data: {
  name: string;
  address: string;
  lat: number;
  lng: number;
  maxDetourKm?: number;
  type?: string;
}): Promise<{ ok: boolean; destination: RouteDestination; state: RouteBookingState }> {
  const qs = getRiderIdQuery();
  const sess = readSession("rider") || readSession();
  const riderId =
    (sess as any)?.account?.linkedId ??
    (sess as any)?.account?.id ??
    (sess as any)?.riderId ??
    "";
  return await apiPostJson<{ ok: boolean; destination: RouteDestination; state: RouteBookingState }>(
    `/api/rider/route-booking/destination${qs}`,
    { ...data, riderId }
  );
}

/**
 * Fetch saved destination presets.
 */
export async function fetchSavedRouteAddresses(): Promise<RouteDestination[]> {
  const qs = getRiderIdQuery();
  return await apiGetJson<RouteDestination[]>(`/api/rider/route-booking/saved-addresses${qs}`);
}

/**
 * Add a new saved destination preset.
 */
export async function addSavedRouteAddress(data: {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type?: string;
}): Promise<RouteDestination[]> {
  const qs = getRiderIdQuery();
  const sess = readSession("rider") || readSession();
  const riderId =
    (sess as any)?.account?.linkedId ??
    (sess as any)?.account?.id ??
    (sess as any)?.riderId ??
    "";
  return await apiPostJson<RouteDestination[]>(
    `/api/rider/route-booking/saved-addresses${qs}`,
    { ...data, riderId }
  );
}
