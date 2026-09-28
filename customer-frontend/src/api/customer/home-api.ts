/**
 * QuickPress Home Screen — shared contracts.
 *
 * This module holds ONLY types. All fetching lives in the service layer
 * under `./services`, and every service maps 1:1 to a FastAPI endpoint
 * declared in `./api/config`:
 *
 *   GET /api/profile
 *   GET /api/location
 *   GET /api/banners
 *   GET /api/categories
 *   GET /api/partners/nearby
 *   GET /api/offers
 *   GET /api/recommendations
 *   GET /api/orders/recent
 *   GET /api/notifications/unread-count
 */

import type { SavedLocation } from "./location";

export type Profile = {
  id?: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  phone?: string;
  /** Kept for backwards compatibility; the badge reads the notification service. */
  unreadNotifications: number;
};

export type Banner = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  image?: string;
  tone: "primary" | "green" | "dark";
  /** Deep link or web URL opened on tap. */
  redirectUrl?: string | null;
  /** Lower numbers render first. */
  priority?: number;
};

export type Category = {
  id: string;
  title: string;
  description: string;
  icon: string;
  image: string;
  sortOrder?: number;
  status?: "active" | "inactive";
};

export type Partner = {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: string;
  distanceKm: number;
  eta: string;
  open: boolean;
  minPrice: number;
  pickupTime?: string;
  deliveryTime?: string;
  minOrderValue?: number;
  services?: string[];
  /** Partner card extras returned by GET /api/partners[/nearby]. */
  logo?: string;
  reviewsCount?: number;
  servicesCount?: number;
  status?: "open" | "closed" | string;
};

export type PopularService = {
  id: string;
  title: string;
  price: number;
  unit: string;
  badge: "Trending" | "Best Seller" | null;
  icon: string;
  /** Service card extras returned by GET /api/services[/popular]. */
  name?: string;
  description?: string;
  image?: string;
  basePrice?: number;
  discountPercent?: number;
  discountLabel?: string | null;
  finalPrice?: number;
  processingTime?: string;
  partnerCount?: number;
  popular?: boolean;
  categoryId?: string;
};

export type Offer = {
  id: string;
  code: string;
  title: string;
  description: string;
  kind: "cashback" | "festival" | "referral";
  discountLabel?: string;
  expiresAt?: string | null;
  banner?: string | null;
};

export type RecentOrder = {
  id: string;
  reference: string;
  title: string;
  items: string;
  placed: string;
  status: string;
  rawStatus?: string;
  total: number;
};

export type Recommendation = {
  id: string;
  title: string;
  reason: string;
  price: number;
  icon: string;
};

export type SearchScope = "partners" | "categories" | "services" | "offers";

export type SearchResult = {
  id: string;
  scope: SearchScope;
  title: string;
  subtitle: string;
};

export type HomeData = {
  profile: Profile;
  location: SavedLocation;
  banners: Banner[];
  categories: Category[];
  partners: Partner[];
  popular: PopularService[];
  services: PopularService[];
  offers: Offer[];
  recentOrders: RecentOrder[];
  recommendations: Recommendation[];
  unreadNotifications: number;
};

