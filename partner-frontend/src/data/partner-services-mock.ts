/**
 * Sprint 3.4 — Service Management & Pricing (Partner app, UI only).
 *
 * Mock rate card used by the Manage Services module. No backend calls: every
 * mutation lives in `PartnerServicesContext` until the API is wired up.
 */

export type ServiceUnit = "kg" | "piece" | "pair" | "fixed";

export type ServiceCategoryId =
  | "wash"
  | "dry-clean"
  | "iron"
  | "premium"
  | "shoe-care"
  | "home-care";

export type ServiceIconKey =
  | "wash"
  | "dryclean"
  | "iron"
  | "premium"
  | "shoe"
  | "blanket"
  | "curtain"
  | "carpet";

export type OfferType = "flat" | "percent" | "limited" | "festival";

export type ServiceOffer = {
  id: string;
  serviceId: string;
  type: OfferType;
  /** Rupees for flat offers, percentage for the rest. */
  value: number;
  title: string;
  validTill: string;
};

export type ManagedService = {
  id: string;
  name: string;
  category: ServiceCategoryId;
  icon: ServiceIconKey;
  description: string;
  price: number;
  unit: ServiceUnit;
  estimatedHours: number;
  minOrderValue: number;
  enabled: boolean;
  /** Popularity signal used by the "Most Ordered" filter + sort. */
  ordersThisMonth: number;
  updatedMinutesAgo: number;
  /** UI-only image placeholder label (no upload wired). */
  imageLabel: string | null;
  pendingApproval?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  pendingChanges?: Record<string, any>;
};

export const SERVICE_CATEGORIES: { id: ServiceCategoryId; label: string }[] = [
  { id: "wash", label: "Wash" },
  { id: "dry-clean", label: "Dry Cleaning" },
  { id: "iron", label: "Ironing" },
  { id: "premium", label: "Premium" },
  { id: "shoe-care", label: "Shoe Care" },
  { id: "home-care", label: "Home Care" },
];

export const SERVICE_UNITS: { id: ServiceUnit; label: string; suffix: string }[] = [
  { id: "kg", label: "Per Kg", suffix: "/kg" },
  { id: "piece", label: "Per Piece", suffix: "/piece" },
  { id: "pair", label: "Per Pair", suffix: "/pair" },
  { id: "fixed", label: "Fixed Price", suffix: " flat" },
];

export const OFFER_TYPES: { id: OfferType; label: string; hint: string }[] = [
  { id: "flat", label: "Flat Discount", hint: "Flat ₹ off the order total" },
  { id: "percent", label: "Percentage Discount", hint: "% off the service price" },
  { id: "limited", label: "Limited-Time Offer", hint: "Runs for a short window" },
  { id: "festival", label: "Festival Offer", hint: "Seasonal campaign pricing" },
];

export function categoryLabel(id: ServiceCategoryId) {
  return SERVICE_CATEGORIES.find((item) => item.id === id)?.label ?? "Service";
}

export function unitLabel(unit: ServiceUnit) {
  return SERVICE_UNITS.find((item) => item.id === unit)?.label ?? "Per Piece";
}

export function unitSuffix(unit: ServiceUnit) {
  return SERVICE_UNITS.find((item) => item.id === unit)?.suffix ?? "";
}

export function offerTypeLabel(type: OfferType) {
  return OFFER_TYPES.find((item) => item.id === type)?.label ?? "Offer";
}

export function formatTurnaround(hours: number) {
  if (hours < 24) return `${hours} hr`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? "s" : ""}`;
}

export function formatUpdated(minutes: number) {
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

export const managedServices: ManagedService[] = [];

export const managedOffers: ServiceOffer[] = [];

/** Popularity threshold for the "Most Ordered" filter. */
export const MOST_ORDERED_THRESHOLD = 200;

