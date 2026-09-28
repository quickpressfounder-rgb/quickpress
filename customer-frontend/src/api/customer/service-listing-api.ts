/**
 * Service Listing API — the Zomato style "partners offering this service" screen.
 *
 * Screen flow: Home → tap a service category → the listing screen calls the
 * live FastAPI catalog endpoints served by `backend-python`:
 *
 *   GET /api/partners?q=&city=&sort=&minRating=&maxDistance=&maxPrice=
 *                    &maxPickupMinutes=&offers=&openNow=   (catalog_partners)
 *   GET /api/filter                                        (filter metadata)
 *   GET /api/search?q=&scope=                              (name/service/category/city)
 *   GET /api/services/{id}                                 (service header)
 *
 * Filtering, sorting and search all run server side; the pure helpers below
 * stay exported so the UI can re-apply them optimistically while a request is
 * in flight (and so unit tests keep working without a backend).
 */

import { apiGetJson } from "@/api/core/transport";

import type { Category, Partner, PopularService } from "./home-api";
import {
  CACHE_KEYS,
  readScopedCache,
  readStaleCache,
  readStaleScopedCache,
  writeScopedCache,
} from "./api/cache";
import { DEFAULT_CATEGORIES } from "./services/category-service";

export const SERVICE_LISTING_ENDPOINTS = {
  /** GET /api/services — every service category. */
  services: "/api/services",
  /** GET /api/services/:id — one service category. */
  service: "/api/services/:id",
  /** GET /api/partners — partner cards with filters, sorting and search. */
  partners: "/api/partners",
  /** GET /api/filter — available sorts, toggles, ranges and cities. */
  filter: "/api/filter",
  /** GET /api/search — cross catalog search. */
  search: "/api/search",
} as const;

export type ListingPartner = Partner & {
  logo: string;
  cover: string;
  city: string;
  area: string;
  tagline: string;
  pickupTime: string;
  pickupMinutes: number;
  deliveryTime: string;
  minOrderValue: number;
  services: string[];
  servicesCount: number;
  reviewsCount: number;
  status: string;
  verified: boolean;
  /** Offer strip shown on the card, e.g. "20% OFF up to ₹100". */
  offerLabel: string | null;
  /** Higher is more popular — powers the "Most popular" sort. */
  popularity: number;
  /** Days since the partner joined — powers the "New" filter. */
  joinedDaysAgo: number;
};

export type ServiceSummary = {
  id: string;
  title: string;
  description: string;
  image: string;
  startingPrice: number;
};

export type ServiceListingData = {
  service: ServiceSummary;
  partners: ListingPartner[];
};

export type ServiceListingResult = {
  data: ServiceListingData;
  fromCache: boolean;
};

export type SearchResult = {
  id: string;
  scope: "partners" | "categories" | "services" | "offers";
  title: string;
  subtitle: string;
  image?: string | undefined;
};

export type FilterOption = { id: string; label: string; value?: number };
export type FilterGroup = {
  id: string;
  label: string;
  kind: "single" | "multi";
  options: FilterOption[];
};
export type FilterOptionsData = {
  sorts: FilterOption[];
  toggles: FilterOption[];
  groups: FilterGroup[];
  cities: string[];
};

export type SortKey =
  | "recommended"
  | "rating"
  | "price-low"
  | "price-high"
  | "distance"
  | "pickup"
  | "delivery"
  | "popular";

export type ListingFilters = {
  sort: SortKey;
  openNow: boolean;
  freePickup: boolean;
  express: boolean;
  offers: boolean;
  verified: boolean;
  newlyAdded: boolean;
  /** 0 means "any rating". */
  minRating: number;
  /** 0 means "any distance". */
  maxDistance: number;
  /** 0 means "any starting price". */
  maxPrice: number;
  /** 0 means "any pickup time". */
  maxPickupMinutes: number;
};

/** Query string accepted by GET /api/partners. */
export type ListingQuery = {
  q?: string | undefined;
  city?: string | undefined;
  serviceName?: string | undefined;
  sort?: string | undefined;
  minRating?: number | undefined;
  maxDistance?: number | undefined;
  maxPrice?: number | undefined;
  maxPickupMinutes?: number | undefined;
  openNow?: boolean | undefined;
  offers?: boolean | undefined;
  verified?: boolean | undefined;
  freePickup?: boolean | undefined;
  newlyAdded?: boolean | undefined;
};

export const DEFAULT_LISTING_FILTERS: ListingFilters = {
  sort: "recommended",
  openNow: false,
  freePickup: false,
  express: false,
  offers: false,
  verified: false,
  newlyAdded: false,
  minRating: 0,
  maxDistance: 0,
  maxPrice: 0,
  maxPickupMinutes: 0,
};

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "distance", label: "Nearest" },
  { id: "rating", label: "Highest rated" },
  { id: "price-low", label: "Lowest price" },
  { id: "pickup", label: "Fastest pickup" },
  { id: "popular", label: "Most popular" },
];

export const QUICK_FILTERS: {
  id: keyof Pick<
    ListingFilters,
    "openNow" | "freePickup" | "express" | "offers" | "verified" | "newlyAdded"
  >;
  label: string;
}[] = [
  { id: "openNow", label: "Open now" },
  { id: "offers", label: "Offers" },
  { id: "express", label: "Express delivery" },
  { id: "freePickup", label: "Free pickup" },
  { id: "verified", label: "Verified" },
  { id: "newlyAdded", label: "Newly added" },
];

export const RATING_OPTIONS = [0, 4, 4.5];
export const DISTANCE_OPTIONS = [0, 2, 5, 10];
export const PRICE_OPTIONS = [0, 20, 50, 100];
export const PICKUP_OPTIONS = [0, 20, 30, 45];

function minutesFromEta(eta: string): number {
  const value = Number(String(eta ?? "").replace(/[^\d.]/g, "")) || 0;
  return /hr/i.test(eta ?? "") ? value * 60 : value;
}

import { readLocation } from "./location";

export function toListingQuery(filters: ListingFilters, query = "", city?: string): ListingQuery {
  const params: ListingQuery = { sort: filters.sort };
  const targetCity = (city || readLocation()?.city || "").trim();
  if (targetCity) params.city = targetCity;
  const trimmed = query.trim();
  if (trimmed) params.q = trimmed;
  if (filters.openNow) params.openNow = true;
  if (filters.offers) params.offers = true;
  if (filters.verified) params.verified = true;
  if (filters.freePickup) params.freePickup = true;
  if (filters.newlyAdded) params.newlyAdded = true;
  if (filters.minRating > 0) params.minRating = filters.minRating;
  if (filters.maxDistance > 0) params.maxDistance = filters.maxDistance;
  if (filters.maxPrice > 0) params.maxPrice = filters.maxPrice;
  if (filters.maxPickupMinutes > 0) params.maxPickupMinutes = filters.maxPickupMinutes;
  return params;
}

function toSearchParams(query: ListingQuery): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

/** GET /api/partners — filtered, sorted, searched partner cards. */
export async function fetchPartnerCards(
  query: ListingQuery = {},
  options: { signal?: AbortSignal | undefined } = {},
): Promise<ListingPartner[]> {
  const activeCity = query.city || readLocation()?.city || "";
  const mergedQuery = { ...query, ...(activeCity ? { city: activeCity } : {}) };
  return apiGetJson<ListingPartner[]>(`/api/partners${toSearchParams(mergedQuery)}`, {
    signal: options.signal,
  });
}

/** GET /api/filter — filter + sort metadata, cached for the session. */
export async function fetchFilterOptions(): Promise<FilterOptionsData | null> {
  const cached = readScopedCache<FilterOptionsData>("filter-options", "all");
  if (cached) return cached;
  try {
    const data = await apiGetJson<FilterOptionsData>("/api/filter");
    writeScopedCache("filter-options", "all", data);
    return data;
  } catch {
    return readStaleScopedCache<FilterOptionsData>("filter-options", "all");
  }
}

/** GET /api/search — name, service, category and city search. */
export async function searchCatalog(
  q: string,
  scopes: SearchResult["scope"][] = [],
  options: { signal?: AbortSignal | undefined } = {},
): Promise<SearchResult[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const search = new URLSearchParams({ q: trimmed });
  for (const scope of scopes) search.append("scope", scope);
  return apiGetJson<SearchResult[]>(`/api/search?${search.toString()}`, {
    signal: options.signal,
  });
}

/**
 * GET /api/services/{id} + GET /api/partners — the full listing screen payload.
 * Falls back to the last cached response when the network is unavailable.
 */
export async function fetchServiceListing(
  serviceId: string,
  query: ListingQuery = {},
  options: { signal?: AbortSignal | undefined } = {},
): Promise<ServiceListingResult> {
  const cityKey = (query.city || readLocation()?.city || "all").toLowerCase().trim();
  const cacheKey = `${serviceId}:${cityKey}`;
  const fallbackCat = DEFAULT_CATEGORIES.find((c) => c.id === serviceId);

  try {
    const [categoriesRes, popularServicesRes, partnersRes] = await Promise.allSettled([
      apiGetJson<Category[]>("/api/categories", { signal: options.signal }).catch(() => DEFAULT_CATEGORIES),
      apiGetJson<PopularService[]>("/api/services/popular", { signal: options.signal }).catch(() => []),
      fetchPartnerCards(query, options).catch((err) => {
        const homePartners = (readStaleCache<Partner[]>(CACHE_KEYS.partners) || []) as any[];
        if (homePartners.length > 0) return homePartners;
        throw err;
      }),
    ]);

    const categories =
      categoriesRes.status === "fulfilled" && Array.isArray(categoriesRes.value)
        ? categoriesRes.value
        : DEFAULT_CATEGORIES;
    const popularServices =
      popularServicesRes.status === "fulfilled" && Array.isArray(popularServicesRes.value)
        ? popularServicesRes.value
        : [];
    const partners =
      partnersRes.status === "fulfilled" && Array.isArray(partnersRes.value)
        ? partnersRes.value
        : ((readStaleCache<Partner[]>(CACHE_KEYS.partners) || []) as any[]);

    const category = categories.find((item: Category) => item.id === serviceId) ?? fallbackCat;
    const popular = popularServices.find((item: PopularService) => item.id === serviceId);
    const prices = partners.map((partner: any) => partner.minPrice).filter((price: any) => price > 0);

    const data: ServiceListingData = {
      service: {
        id: serviceId,
        title: category?.title ?? popular?.title ?? fallbackCat?.title ?? "Laundry Services",
        description:
          category?.description ??
          fallbackCat?.description ??
          "Nearby QuickPress partners offering this service with doorstep pickup and delivery.",
        image: category?.image ?? fallbackCat?.image ?? partners[0]?.image ?? "",
        startingPrice: popular?.price ?? (prices.length > 0 ? Math.min(...prices) : 49),
      },
      partners,
    };

    // Cache under multiple keys for instant access
    if (Object.keys(query).length <= 1) {
      writeScopedCache("partner-list", cacheKey, data);
      writeScopedCache("partner-list", `${serviceId}:all`, data);
      writeScopedCache("partner-list", `${serviceId}:initial`, data);
    }
    return { data, fromCache: false };
  } catch (error) {
    const stale =
      readStaleScopedCache<ServiceListingData>("partner-list", cacheKey) ||
      readStaleScopedCache<ServiceListingData>("partner-list", `${serviceId}:all`) ||
      readStaleScopedCache<ServiceListingData>("partner-list", `${serviceId}:initial`);
    if (stale) return { data: stale, fromCache: true };
    throw error;
  }
}

/** Pure filter + sort pipeline — same behaviour for fixtures and live data. */
export function applyListingFilters(
  partners: ListingPartner[],
  filters: ListingFilters,
): ListingPartner[] {
  const filtered = partners.filter((partner) => {
    if (filters.openNow && !partner.open) return false;
    if (filters.offers && !partner.offerLabel) return false;
    if (filters.verified && !partner.verified) return false;
    if (filters.newlyAdded && partner.joinedDaysAgo > 60) return false;
    if (filters.freePickup && partner.minOrderValue > 199) return false;
    if (filters.express && minutesFromEta(partner.deliveryTime) > 720) return false;
    if (filters.minRating > 0 && partner.rating < filters.minRating) return false;
    if (filters.maxDistance > 0 && partner.distanceKm > filters.maxDistance) return false;
    if (filters.maxPrice > 0 && partner.minPrice > filters.maxPrice) return false;
    if (filters.maxPickupMinutes > 0 && partner.pickupMinutes > filters.maxPickupMinutes)
      return false;
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case "rating":
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case "price-low":
      sorted.sort((a, b) => a.minPrice - b.minPrice);
      break;
    case "price-high":
      sorted.sort((a, b) => b.minPrice - a.minPrice);
      break;
    case "distance":
      sorted.sort((a, b) => a.distanceKm - b.distanceKm);
      break;
    case "pickup":
      sorted.sort((a, b) => a.pickupMinutes - b.pickupMinutes);
      break;
    case "delivery":
      sorted.sort((a, b) => minutesFromEta(a.deliveryTime) - minutesFromEta(b.deliveryTime));
      break;
    case "popular":
      sorted.sort((a, b) => b.popularity - a.popularity);
      break;
    case "recommended":
    default:
      sorted.sort(
        (a, b) => Number(b.open) - Number(a.open) || b.rating - a.rating || a.distanceKm - b.distanceKm,
      );
      break;
  }
  return sorted;
}

export function activeFilterCount(filters: ListingFilters): number {
  let count = 0;
  for (const filter of QUICK_FILTERS) if (filters[filter.id]) count += 1;
  if (filters.minRating > 0) count += 1;
  if (filters.maxDistance > 0) count += 1;
  if (filters.maxPrice > 0) count += 1;
  if (filters.maxPickupMinutes > 0) count += 1;
  if (filters.sort !== "recommended") count += 1;
  return count;
}
