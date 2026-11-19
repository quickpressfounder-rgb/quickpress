/**
 * Google Maps data layer (Phase 5 Sprint 5.4).
 *
 * Every map feature in the four frontends talks to the FastAPI maps proxy
 * through this module — geocoding, autocomplete, routes, distance matrix,
 * delivery-area checks and live rider/partner tracking.
 *
 * The browser never calls Google's server APIs directly: the backend holds
 * GOOGLE_MAPS_SERVER_API_KEY. Only map *rendering* uses the browser key
 * (VITE_GOOGLE_MAPS_API_KEY, see `@shared/lib/google-maps-loader`).
 */

import { apiGetJson, apiPostJson } from "./transport";

export const MAPS_API_ENDPOINTS = {
  status: "/api/maps/status",
  geocode: "/api/maps/geocode",
  reverseGeocode: "/api/maps/reverse-geocode",
  autocomplete: "/api/maps/autocomplete",
  place: (placeId: string) => `/api/maps/place/${encodeURIComponent(placeId)}`,
  route: "/api/maps/route",
  eta: "/api/maps/eta",
  distanceMatrix: "/api/maps/distance-matrix",
  deliveryArea: "/api/maps/delivery-area",
  pincodeServiceability: "/api/maps/pincode-serviceability",
  liveRider: "/api/maps/live/rider",
  liveRiderById: (riderId: string) => `/api/maps/live/rider/${encodeURIComponent(riderId)}`,
  live: "/api/maps/live",
} as const;

export type LatLng = { latitude: number; longitude: number };

export type GeocodeResult = {
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
  area: string;
  street?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  description: string;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  area: string;
  city: string;
  state: string;
  pincode: string;
};

export type RouteStep = { instruction: string; maneuver: string; distanceMeters: number };

export type RouteResult = {
  polyline: string;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  etaMinutes: number;
  trafficDelayMinutes: number;
  steps: RouteStep[];
};

export type MatrixElement = {
  originIndex: number;
  destinationIndex: number;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  etaMinutes: number;
  reachable: boolean;
};

export type DeliveryAreaResult = {
  serviceable: boolean;
  radiusKm: number;
  message: string;
  nearest: { id: string; name: string; distanceKm: number; withinRadius: boolean } | null;
  partnersInRange: number;
};

export type LiveLocation = {
  id: string;
  kind: "rider" | "partner" | "customer";
  label: string;
  latitude: number;
  longitude: number;
  orderId?: string | null;
  status?: string | null;
  updatedAt?: string | null;
};

export type LiveMap = {
  riders: LiveLocation[];
  partners: LiveLocation[];
  customers: LiveLocation[];
  activeOrders: LiveLocation[];
};

export type MapsStatus = { configured: boolean; defaultRadiusKm: number; features: string[] };

/** GET /api/maps/status — is the server key wired up? */
export const fetchMapsStatus = () => apiGetJson<MapsStatus>(MAPS_API_ENDPOINTS.status);

/** GET /api/maps/geocode?address= */
export const geocodeAddress = (address: string) =>
  apiGetJson<GeocodeResult>(MAPS_API_ENDPOINTS.geocode, { params: { address } });

/** GET /api/maps/reverse-geocode?lat=&lng=&latitude=&longitude= */
export const reverseGeocodeCoords = (latitude: number, longitude: number) =>
  apiGetJson<GeocodeResult>(MAPS_API_ENDPOINTS.reverseGeocode, {
    params: { lat: latitude, lng: longitude, latitude, longitude },
  });

/** GET /api/maps/autocomplete?q=&lat=&lng= */
export const autocompletePlaces = (
  query: string,
  near?: LatLng,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> =>
  apiGetJson<PlaceSuggestion[]>(MAPS_API_ENDPOINTS.autocomplete, {
    params: {
      q: query,
      lat: near?.latitude ?? undefined,
      lng: near?.longitude ?? undefined,
      latitude: near?.latitude ?? undefined,
      longitude: near?.longitude ?? undefined,
    },
    signal,
  });

/** GET /api/maps/place/{placeId} */
export const fetchPlaceDetails = (placeId: string) =>
  apiGetJson<PlaceDetails>(MAPS_API_ENDPOINTS.place(placeId));

/** POST /api/maps/route */
export const computeRoute = (origin: LatLng, destination: LatLng, travelMode = "TWO_WHEELER") =>
  apiPostJson<RouteResult>(MAPS_API_ENDPOINTS.route, { origin, destination, travelMode });

/** POST /api/maps/eta */
export const computeEta = (origin: LatLng, destination: LatLng, travelMode = "TWO_WHEELER") =>
  apiPostJson<RouteResult>(MAPS_API_ENDPOINTS.eta, { origin, destination, travelMode });

/** POST /api/maps/distance-matrix */
export const computeDistanceMatrix = (
  origins: LatLng[],
  destinations: LatLng[],
  travelMode = "DRIVE",
) =>
  apiPostJson<MatrixElement[]>(MAPS_API_ENDPOINTS.distanceMatrix, {
    origins,
    destinations,
    travelMode,
  });

/** POST /api/maps/delivery-area — serviceability + radius check. */
export const checkDeliveryArea = (input: {
  latitude: number;
  longitude: number;
  radiusKm?: number | undefined;
  partnerId?: string | undefined;
}) => apiPostJson<DeliveryAreaResult>(MAPS_API_ENDPOINTS.deliveryArea, input);

/** POST /api/maps/live/rider — push the rider's current GPS fix. */
export const pushLiveRiderLocation = (update: {
  latitude: number;
  longitude: number;
  orderId?: string | undefined;
  heading?: number | undefined;
  speedKmph?: number | undefined;
}) => apiPostJson<LiveLocation>(MAPS_API_ENDPOINTS.liveRider, update);

/** GET /api/maps/live/rider/{riderId} */
export const fetchRiderLiveLocation = (riderId: string) =>
  apiGetJson<LiveLocation | null>(MAPS_API_ENDPOINTS.liveRiderById(riderId));

/** GET /api/maps/live — admin live map feed. */
export const fetchLiveMap = () => apiGetJson<LiveMap>(MAPS_API_ENDPOINTS.live);

/** Browser geolocation as a promise; rejects when denied or unavailable. */
export function currentPosition(timeoutMs = 10000): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("geolocation-unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}

/** Decodes a Google encoded polyline into coordinates for map rendering. */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

export type PincodeServiceabilityResult = {
  serviceable: boolean;
  pincode: string;
  city: string;
  state: string;
  areaName?: string;
  baseDeliveryFee: number;
  surgeMultiplier: number;
  activePartnersCount: number;
  activeRidersCount: number;
  matchedPartners: Array<{
    id: string;
    businessName: string;
    city: string;
    servicePincodes: string[];
  }>;
  stationedRiders: Array<{
    id: string;
    name: string;
    city: string;
    operatingPincodes: string[];
  }>;
  estimatedSlaMinutes: number;
  message: string;
};

/** Checks real-time geofenced serviceability, matched stores, and stationed fleet for a pincode. */
export async function checkPincodeServiceability(
  pincode: string,
  city?: string,
): Promise<PincodeServiceabilityResult> {
  return apiPostJson<PincodeServiceabilityResult>("/api/maps/pincode-serviceability", {
    pincode,
    city,
  });
}

