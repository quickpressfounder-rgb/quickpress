/**
 * Home Service — orchestrates the Home Screen load.
 *
 * Load order matches the product spec:
 *
 *   Profile → Location → Banners → Categories → Nearby Partners →
 *   Recommended Services → Offers → Notifications Count
 *
 * Profile and location resolve first because nearby partners depend on the
 * resolved location. Everything after that loads in parallel, and each section
 * settles independently so one failing endpoint never blanks the screen.
 */

import { ApiError } from "../api/http-client";
import type {
  Banner,
  Category,
  Offer,
  Partner,
  PopularService,
  Profile,
  RecentOrder,
  Recommendation,
} from "../home-api";
import type { SavedLocation } from "../location";
import { fetchBanners } from "./banner-service";
import { DEFAULT_CATEGORIES, fetchCategories } from "./category-service";
import { fetchLocation } from "./location-service";
import { fetchUnreadNotificationCount } from "./notification-service";
import { fetchOffers } from "./offer-service";
import { fetchNearbyPartners } from "./partner-service";
import { fetchProfile } from "./profile-service";
import {
  fetchPopularServices,
  fetchRecentOrders,
  fetchRecommendations,
} from "./recommendation-service";

export {
  DEFAULT_CATEGORIES,
  fetchBanners,
  fetchCategories,
  fetchLocation,
  fetchNearbyPartners,
  fetchNearbyPartners as fetchPartners,
  fetchOffers,
  fetchPopularServices,
  fetchProfile,
  fetchRecentOrders,
  fetchRecommendations,
  fetchUnreadNotificationCount,
};

export type SectionKey =
  | "profile"
  | "location"
  | "banners"
  | "categories"
  | "partners"
  | "popular"
  | "recommendations"
  | "offers"
  | "recentOrders"
  | "notifications";

export type SectionState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export type HomeSections = {
  profile: SectionState<Profile>;
  location: SectionState<SavedLocation>;
  banners: SectionState<Banner[]>;
  categories: SectionState<Category[]>;
  partners: SectionState<Partner[]>;
  popular: SectionState<PopularService[]>;
  recommendations: SectionState<Recommendation[]>;
  offers: SectionState<Offer[]>;
  recentOrders: SectionState<RecentOrder[]>;
  notifications: SectionState<number>;
};

import { CACHE_KEYS, clearCache, readStaleCache } from "../api/cache";
import { getDefaultLocation, readLocation } from "../location";

export const IDLE_SECTION: SectionState<never> = { data: null, loading: true, error: null };

export function emptySections(): HomeSections {
  return {
    profile: { data: null, loading: true, error: null },
    location: { data: readLocation() || getDefaultLocation(), loading: false, error: null },
    banners: { data: null, loading: true, error: null },
    categories: { data: DEFAULT_CATEGORIES, loading: false, error: null },
    partners: { data: null, loading: true, error: null },
    popular: { data: null, loading: true, error: null },
    recommendations: { data: null, loading: true, error: null },
    offers: { data: null, loading: true, error: null },
    recentOrders: { data: null, loading: true, error: null },
    notifications: { data: 0, loading: false, error: null },
  };
}

export function initialSections(): HomeSections {
  if (typeof window === "undefined") {
    return emptySections();
  }
  const cachedProfile = readStaleCache<Profile>(CACHE_KEYS.profile);
  const cachedLocation = readStaleCache<SavedLocation>(CACHE_KEYS.location) || readLocation() || getDefaultLocation();
  const cachedBanners = readStaleCache<Banner[]>(CACHE_KEYS.banners);
  const cachedCategories = readStaleCache<Category[]>(CACHE_KEYS.categories) || DEFAULT_CATEGORIES;
  const cachedPartners = readStaleCache<Partner[]>(CACHE_KEYS.partners);
  const cachedPopular = readStaleCache<PopularService[]>(CACHE_KEYS.popular);
  const cachedRecommendations = readStaleCache<Recommendation[]>(CACHE_KEYS.recommendations);
  const cachedOffers = readStaleCache<Offer[]>(CACHE_KEYS.offers);
  const cachedRecentOrders = readStaleCache<RecentOrder[]>(CACHE_KEYS.recentOrders);
  const cachedNotifications = readStaleCache<number>(CACHE_KEYS.unreadNotifications);

  return {
    profile: { data: cachedProfile, loading: !cachedProfile, error: null },
    location: { data: cachedLocation, loading: false, error: null },
    banners: { data: cachedBanners, loading: !cachedBanners, error: null },
    categories: { data: cachedCategories, loading: false, error: null },
    partners: { data: cachedPartners, loading: !cachedPartners, error: null },
    popular: { data: cachedPopular, loading: !cachedPopular, error: null },
    recommendations: { data: cachedRecommendations, loading: !cachedRecommendations, error: null },
    offers: { data: cachedOffers, loading: !cachedOffers, error: null },
    recentOrders: { data: cachedRecentOrders, loading: !cachedRecentOrders, error: null },
    notifications: { data: cachedNotifications, loading: false, error: null },
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.userMessage;
  return "Something went wrong. Please try again.";
}

export type LoadHomeOptions = {
  forceRefresh?: boolean | undefined;
  signal?: AbortSignal | undefined;
  /** Called as each section settles so the UI can render progressively. */
  onSection: <K extends SectionKey>(key: K, state: HomeSections[K]) => void;
};

function settle<T>(
  key: SectionKey,
  promise: Promise<T>,
  onSection: LoadHomeOptions["onSection"],
): Promise<void> {
  return promise.then(
    (data) => {
      onSection(key as never, { data, loading: false, error: null } as never);
    },
    (error: unknown) => {
      onSection(key as never, { data: null, loading: false, error: errorMessage(error) } as never);
    },
  );
}

/** Load every Home Screen section. Resolves once all sections have settled. */
export async function loadHome(options: LoadHomeOptions): Promise<void> {
  const { forceRefresh, signal, onSection } = options;
  const shared = { forceRefresh, signal } as const;

  // Sab independent sections turant parallel me start hote hain; sirf partners
  // location par depend karta hai, isliye wahi await hota hai.
  const profilePromise = settle("profile", fetchProfile(shared), onSection);

  const locationPromise = fetchLocation(shared).then(
    (location) => {
      const active = location || getDefaultLocation();
      onSection("location", { data: active, loading: false, error: null });
      return active;
    },
    () => {
      const fallback = getDefaultLocation();
      onSection("location", { data: fallback, loading: false, error: null });
      return fallback;
    },
  );

  const partnersPromise = locationPromise.then((location) =>
    settle("partners", fetchNearbyPartners({ ...shared, location }), onSection),
  );

  const popularPromise = locationPromise.then((location) =>
    settle("popular", fetchPopularServices({ ...shared, location }), onSection),
  );

  await Promise.all([
    profilePromise,
    partnersPromise,
    popularPromise,
    settle("banners", fetchBanners(shared), onSection),
    settle("categories", fetchCategories(shared), onSection),
    settle("recommendations", fetchRecommendations(shared), onSection),
    settle("offers", fetchOffers(shared), onSection),
    settle("recentOrders", fetchRecentOrders(shared), onSection),
    settle("notifications", fetchUnreadNotificationCount(shared), onSection),
  ]);
}

/** Pull-to-refresh: drop cached Home data so every endpoint is re-read. */
export function invalidateHomeCache() {
  clearCache();
}

export const fetchHomeSections = loadHome;
export const refreshHomeSections = loadHome;
