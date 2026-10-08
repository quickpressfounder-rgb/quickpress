/**
 * QuickPress Partner Details — live data layer (Sprint 2.2).
 *
 * Every function maps 1:1 to a FastAPI endpoint served by `backend-python`
 * (`app/api/partners.py`, backed by the `catalog_partners` and
 * `partner_reviews` MongoDB collections). In mock mode the same shapes come
 * from `backend/src/mock/partner-projections.ts`, so the screen code never
 * branches on transport.
 *
 *   GET  /api/partners/{id}            — profile + services + reviews + gallery
 *   GET  /api/partners/{id}/services   — service menu only
 *   GET  /api/partners/{id}/reviews    — rating summary + review list
 *   POST /api/cart                     — add items to the cart
 *
 * Partner details are cached per partner id (stale-while-revalidate) so
 * revisiting a store paints instantly and still refreshes in the background.
 */

import { apiGetJson, apiPostJson } from "@/api/core/transport";

import {
  readScopedCache,
  readStaleScopedCache,
  writeScopedCache,
  clearScopedCache,
} from "./api/cache";

export const PARTNER_API_ENDPOINTS = {
  partner: "/api/partners/{id}",
  partnerServices: "/api/partners/{id}/services",
  partnerReviews: "/api/partners/{id}/reviews",
  cart: "/api/cart",
} as const;

export type PartnerHours = {
  day: string;
  opensAt: string;
  closesAt: string;
  closed: boolean;
};

export type PartnerProfile = {
  id: string;
  name: string;
  cover: string;
  logo: string;
  verified: boolean;
  rating: number;
  /** Formatted label, e.g. "2.1k". */
  reviewCount: string;
  reviewsCount: number;
  distanceKm: number;
  pickupEta: string;
  deliveryEta: string;
  open: boolean;
  status: string;
  ownerName: string;
  address: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
  pickupRadius: string;
  deliveryRadiusKm: number;
  workingHours: string;
  hours: PartnerHours[];
  phone: string;
  about: string;
  yearsInBusiness: number;
  /** One line shop introduction shown under the name. */
  tagline: string;
  offerLabel: string | null;
  minOrderValue: number;
  /** Store policies shown on the profile. */
  policies: string[];
};

export type PartnerService = {
  id: string;
  name: string;
  description: string;
  image: string;
  startingPrice: number;
  basePrice: number;
  unit: string;
  deliveryEta: string;
  available: boolean;
};

export type PartnerFeature = {
  id: string;
  title: string;
  icon: string;
};

export type PartnerReview = {
  id: string;
  partnerId: string;
  name: string;
  initials: string;
  photo: string;
  rating: number;
  text: string;
  date: string;
  images: string[];
};

export type ReviewSummary = {
  average: number;
  total: number;
  breakdown: { star: number; count: number }[];
};

export type PartnerReviewsData = {
  summary: ReviewSummary;
  reviews: PartnerReview[];
};

export type GalleryImage = {
  id: string;
  image: string;
  caption: string;
};

export type PriceRow = {
  id: string;
  service: string;
  unit: string;
  price: number;
};

export type PartnerDetailData = {
  partner: PartnerProfile;
  services: PartnerService[];
  features: PartnerFeature[];
  reviews: PartnerReview[];
  reviewSummary: ReviewSummary;
  gallery: GalleryImage[];
  priceList: PriceRow[];
};

export type PartnerDetailResult = {
  data: PartnerDetailData;
  /** True when the payload came from cache because the network failed. */
  fromCache: boolean;
};

export type FetchOptions = {
  signal?: AbortSignal | undefined;
  /** Skip the fresh-cache shortcut and always hit the network. */
  forceRefresh?: boolean | undefined;
};

/** GET /api/partners/{id} — profile, services, reviews, gallery, price list. */
export async function fetchPartnerDetail(
  partnerId: string,
  options: FetchOptions = {},
): Promise<PartnerDetailResult> {
  try {
    const raw = await apiGetJson<any>(
      `/api/partners/${encodeURIComponent(partnerId)}`,
      { signal: options.signal },
    );
    const partner = raw?.partner || {};
    const normalized: PartnerDetailData = {
      partner: {
        ...partner,
        id: String(partner.id || partnerId),
        name: partner.name || partner.businessName || "QuickPress Partner",
        cover: partner.cover || partner.bannerUrl || "store-1",
        logo: partner.logo || partner.logoUrl || "store-1",
        verified: partner.verified !== false,
        rating: Number(partner.rating || 5.0),
        reviewCount: String(partner.reviewCount || "0"),
        reviewsCount: Number(partner.reviewsCount || 0),
        distanceKm: Number(partner.distanceKm || 1.5),
        pickupEta: partner.pickupEta || "30 min",
        deliveryEta: partner.deliveryEta || "24 hrs",
        open: partner.open !== false,
        status: partner.status || "open",
        ownerName: partner.ownerName || "Store Owner",
        address: partner.address || "Local Store Address",
        city: partner.city || "",
        area: partner.area || partner.address || "Local Area",
        latitude: partner.latitude != null ? Number(partner.latitude) : 28.5355,
        longitude: partner.longitude != null ? Number(partner.longitude) : 77.3910,
        pickupRadius: partner.pickupRadius || "10 km",
        deliveryRadiusKm: Number(partner.deliveryRadiusKm || 10),
        workingHours: partner.workingHours || "08:00 – 21:00",
        hours: Array.isArray(partner.hours) ? partner.hours : (Array.isArray(partner.openingHours) ? partner.openingHours : []),
        phone: partner.phone || "",
        about: partner.about || "Professional laundry and dry cleaning partner.",
        yearsInBusiness: Number(partner.yearsInBusiness || 2),
        tagline: partner.tagline || "Professional Laundry & Dry Cleaning",
        offerLabel: partner.offerLabel || null,
        minOrderValue: Number(partner.minOrderValue || 0),
        policies: Array.isArray(partner.policies) ? partner.policies : ["Hygienic processing", "On-time delivery"],
      },
      services: (raw?.services || []).map((s: any) => ({
        id: String(s.id || s._id),
        name: s.name || "Laundry Service",
        description: s.description || "",
        image: s.image || "",
        startingPrice: Number(s.startingPrice || s.finalPrice || s.basePrice || s.price || 0),
        basePrice: Number(s.basePrice || s.price || 0),
        unit: s.unit || "kg",
        deliveryEta: s.deliveryEta || s.processingTime || "24 hrs",
        available: s.available !== false && s.isActive !== false && s.enabled !== false,
      })),
      features: raw?.features || [],
      reviews: raw?.reviews || [],
      reviewSummary: {
        average: Number(raw?.reviewSummary?.average || 5.0),
        total: Number(raw?.reviewSummary?.total || 0),
        breakdown: Array.isArray(raw?.reviewSummary?.breakdown)
          ? raw.reviewSummary.breakdown
          : Object.entries(raw?.reviewSummary?.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })
              .map(([star, count]) => ({ star: Number(star), count: Number(count) }))
              .sort((a, b) => b.star - a.star),
      },
      gallery: raw?.gallery || [],
      priceList: raw?.priceList || [],
    };

    writeScopedCache("partner-detail", partnerId, normalized);
    return { data: normalized, fromCache: false };
  } catch (error) {
    const cached = readScopedCache<PartnerDetailData>("partner-detail", partnerId) ||
      readStaleScopedCache<PartnerDetailData>("partner-detail", partnerId);
    if (cached) return { data: cached, fromCache: true };
    throw error;
  }
}

async function revalidatePartnerDetail(partnerId: string): Promise<void> {
  try {
    const fresh = await apiGetJson<PartnerDetailData>(
      `/api/partners/${encodeURIComponent(partnerId)}`,
    );
    writeScopedCache("partner-detail", partnerId, fresh);
  } catch {
    /* background refresh is best effort */
  }
}

/** GET /api/partners/{id}/services */
export async function fetchPartnerServices(
  partnerId: string,
  options: FetchOptions = {},
): Promise<PartnerService[]> {
  return apiGetJson<PartnerService[]>(
    `/api/partners/${encodeURIComponent(partnerId)}/services`,
    { signal: options.signal },
  );
}

/** GET /api/partners/{id}/reviews */
export async function fetchPartnerReviews(
  partnerId: string,
  options: FetchOptions = {},
): Promise<PartnerReviewsData> {
  if (!options.forceRefresh) {
    const cached = readScopedCache<PartnerReviewsData>("partner-reviews", partnerId);
    if (cached) return cached;
  }
  try {
    const data = await apiGetJson<PartnerReviewsData>(
      `/api/partners/${encodeURIComponent(partnerId)}/reviews`,
      { signal: options.signal },
    );
    writeScopedCache("partner-reviews", partnerId, data);
    return data;
  } catch (error) {
    const stale = readStaleScopedCache<PartnerReviewsData>("partner-reviews", partnerId);
    if (stale) return stale;
    throw error;
  }
}

/** Drop the cached copy of a partner — used by pull to refresh / retry. */
export function invalidatePartnerDetail(partnerId?: string) {
  clearScopedCache("partner-detail", partnerId);
  clearScopedCache("partner-reviews", partnerId);
}

/** POST /api/cart — bulk add the quantities picked on the partner screen. */
export async function postPartnerCart(payload: {
  partnerId: string;
  quantities: Record<string, number>;
}): Promise<{ ok: true }> {
  await apiPostJson<{ ok: true }>("/api/cart", payload);
  try {
    const { refreshCart } = await import("./cart-store");
    await refreshCart();
  } catch {}
  return { ok: true };
}
