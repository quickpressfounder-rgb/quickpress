/**
 * Offers data layer — every function is one backend endpoint:
 *
 *   GET  /api/offers/page      → banners, special offers, scratch cards, points
 *   GET  /api/offers           → offers + coupons catalogue
 *   POST /api/offers/{code}/apply
 */

import type { CouponEntity, OfferEntity } from "@/shared/types";

import { apiGetJson, apiPostJson } from "../core/transport";

export const OFFERS_API_ENDPOINTS = {
  page: "/api/offers/page",
  offers: "/api/offers",
  apply: "/api/offers/{code}/apply",
} as const;

export type OfferBanner = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  tone: "festival" | "discount" | "cashback";
};

export type Coupon = {
  id: string;
  code: string;
  discount: string;
  description: string;
  expiry: string;
  minOrder: number;
};

export type SpecialOffer = {
  id: string;
  kind: "first-order" | "referral" | "membership" | "festival";
  title: string;
  description: string;
  highlight: string;
};

export type ScratchCard = {
  id: string;
  reward: string;
  caption: string;
  scratched?: boolean;
  points?: number;
  orderId?: string;
};

export type OffersPage = {
  banners: OfferBanner[];
  specialOffers: SpecialOffer[];
  scratchCards: ScratchCard[];
  rewardPoints: number;
};

export type ScratchResult = {
  ok: boolean;
  card: {
    id: string;
    points: number;
    scratched: boolean;
    scratchedAt?: string;
    orderId?: string;
  };
  points: number;
  newTotalPoints: number;
  rupeeValue: number;
};

export type RedeemResult = {
  ok: boolean;
  redeemedPoints: number;
  creditedRupees: number;
  remainingPoints: number;
  walletBalance: number;
};

/** GET /api/offers/page */
export async function fetchOffers(): Promise<OffersPage> {
  return apiGetJson<OffersPage>(OFFERS_API_ENDPOINTS.page);
}

/** GET /api/offers — coupons the customer can apply. */
export async function fetchCoupons(): Promise<Coupon[]> {
  const payload = await apiGetJson<any>(OFFERS_API_ENDPOINTS.offers);
  const list = Array.isArray(payload) ? payload : (payload?.coupons ?? payload?.offers ?? []);
  return list.map((coupon: any) => ({
    id: String(coupon.id || coupon._id || coupon.code),
    code: String(coupon.code || ""),
    discount: String(coupon.discount || coupon.discountLabel || "Special discount"),
    description: String(coupon.description || `Min order ₹${coupon.minOrder || 99}`),
    expiry: String(coupon.expiry || coupon.expiresAt || ""),
    minOrder: Number(coupon.minOrder || 0),
  }));
}

/** POST /api/offers/{code}/apply */
export async function applyCoupon(code: string) {
  await apiPostJson<unknown>(`/api/offers/${encodeURIComponent(code)}/apply`, {});
  return { ok: true as const, code };
}

/** POST /api/loyalty/scratch/{cardId} — scratch a card to reveal & claim loyalty points */
export async function scratchLoyaltyCard(cardId: string): Promise<ScratchResult> {
  return apiPostJson<ScratchResult>(`/api/loyalty/scratch/${encodeURIComponent(cardId)}`, {});
}

/** POST /api/loyalty/redeem — convert loyalty points into real wallet cash (100 pts = ₹10) */
export async function redeemLoyaltyPoints(points: number): Promise<RedeemResult> {
  return apiPostJson<RedeemResult>("/api/loyalty/redeem", { points });
}
