/**
 * Reviews & 360-Degree Quality Rating API for QuickPress Admin.
 *
 * Connects to:
 * - GET /api/reviews/admin (all reviews audit feed)
 * - GET /api/orders/{id}/reviews-360 (360-degree mutual ratings inspection)
 */

import { apiGetJson } from "@/api/core/transport";

export interface ReviewItem {
  id: string;
  orderId: string;
  orderCode?: string;
  sourceRole: "customer" | "partner" | "rider";
  customerName?: string;
  storeName?: string;
  riderName?: string;
  partnerId?: string;
  riderId?: string;
  userId?: string;
  storeRating?: number;
  storeFeedback?: string;
  storeTags?: string[];
  riderRating?: number;
  riderFeedback?: string;
  riderTags?: string[];
  customerRating?: number;
  customerFeedback?: string;
  customerTags?: string[];
  tipAmount?: number;
  createdAt: string;
}

export interface Reviews360Data {
  orderId: string;
  hasCustomerReview: boolean;
  hasPartnerReview: boolean;
  hasRiderReview: boolean;
  customerReview: ReviewItem | null;
  partnerReview: ReviewItem | null;
  riderReview: ReviewItem | null;
  mutualRatings: {
    customerGaveStore: number | null;
    customerGaveRider: number | null;
    partnerGaveRider: number | null;
    partnerGaveCustomer: number | null;
    riderGaveCustomer: number | null;
    riderGaveStore: number | null;
  };
}

export async function fetchAdminReviews(limit: number = 100): Promise<ReviewItem[]> {
  const rows = await apiGetJson<ReviewItem[]>(`/api/reviews/admin?limit=${limit}`);
  return Array.isArray(rows) ? rows : [];
}

export async function fetchOrder360Reviews(orderId: string): Promise<Reviews360Data | null> {
  try {
    return await apiGetJson<Reviews360Data>(`/api/orders/${encodeURIComponent(orderId)}/reviews-360`);
  } catch (err) {
    console.warn(`Failed to fetch 360 reviews for order ${orderId}:`, err);
    return null;
  }
}
