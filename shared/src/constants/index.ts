/**
 * Cross-application constants shared by the customer, partner, rider and
 * admin frontends. Anything that must stay identical across the four apps
 * belongs here, not in an individual frontend.
 */

export const BRAND = {
  name: "QuickPress",
  tagline: "Hyperlocal On-Demand Laundry & Garment Care Platform",
  domain: "withquickpress.com",
  websiteUrl: "https://withquickpress.com",
  supportEmail: "official.quickpress@gmail.com",
  supportPhone: "1800 012 3456",
} as const;

/** Namespaces on the single shared QuickPress backend. */
export const API_NAMESPACES = {
  customer: "/api",
  partner: "/api/partner",
  rider: "/api/rider",
  admin: "/api/admin",
} as const;

export const APPS = {
  customer: { id: "customer", label: "Customer", devPort: 8080 },
  partner: { id: "partner", label: "Partner", devPort: 8081 },
  rider: { id: "rider", label: "Rider", devPort: 8082 },
  admin: { id: "admin", label: "Admin", devPort: 8083 },
} as const;

export const CURRENCY = "₹";

export const ORDER_STATUSES = [
  "placed",
  "picked_up",
  "in_wash",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
