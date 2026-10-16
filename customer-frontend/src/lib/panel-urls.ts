/**
 * QuickPress Ecosystem — Multi-Panel URLs Resolver
 * Dynamically computes working URLs for all 4 panels in development (localhost ports)
 * and production (configured domains / cloud instances).
 */

export interface PanelInfo {
  id: "customer" | "partner" | "rider" | "admin";
  name: string;
  shortName: string;
  tagline: string;
  role: string;
  description: string;
  iconName: "ShoppingBag" | "Building2" | "Truck" | "ShieldCheck";
  devPort: number;
  badge: string;
  themeColor: string;
  accentColor: string;
  bgLight: string;
  borderLight: string;
  url: string;
  isCurrent?: boolean;
}

export function getPanelUrls(currentPanel: "customer" | "partner" | "rider" | "admin" = "customer"): PanelInfo[] {
  let isLocal = false;
  let hostname = "localhost";
  let protocol = "http:";

  if (typeof window !== "undefined") {
    hostname = window.location.hostname;
    protocol = window.location.protocol;
    isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.endsWith(".local");
  }

  const getUrl = (prodEnvVar?: string, fallbackProdUrl?: string) => {
    if (prodEnvVar && typeof prodEnvVar === "string" && prodEnvVar.trim()) {
      return prodEnvVar.trim();
    }
    return fallbackProdUrl || `${protocol}//${hostname}`;
  };

  const customerUrl = getUrl(
    import.meta.env["VITE_CUSTOMER_URL"] as string | undefined,
    "https://quickpress-customer.vercel.app"
  );
  const partnerUrl = getUrl(
    import.meta.env["VITE_PARTNER_URL"] as string | undefined,
    "https://quickpress-partner-mu.vercel.app"
  );
  const riderUrl = getUrl(
    import.meta.env["VITE_RIDER_URL"] as string | undefined,
    "https://quickpress-caption.vercel.app"
  );
  const adminUrl = getUrl(
    import.meta.env["VITE_ADMIN_URL"] as string | undefined,
    "https://quickpress-admin-kappa.vercel.app"
  );

  return [
    {
      id: "customer",
      name: "Customer Storefront & App",
      shortName: "Customer App",
      tagline: "Laundry Pickup & Delivery",
      role: "Customers",
      description: "Browse services, place pickup orders, track live laundry, manage wallet & subscriptions.",
      iconName: "ShoppingBag",
      devPort: 8081,
      badge: "Storefront",
      themeColor: "text-emerald-600",
      accentColor: "bg-emerald-600",
      bgLight: "bg-emerald-50",
      borderLight: "border-emerald-200",
      url: customerUrl,
      isCurrent: currentPanel === "customer",
    },
    {
      id: "partner",
      name: "Partner & Vendor Console",
      shortName: "Partner Portal",
      tagline: "Laundry Store Operations",
      role: "Laundry Vendors",
      description: "Manage incoming laundry batches, wash/dry/iron stages, store catalogue, earnings & payouts.",
      iconName: "Building2",
      devPort: 8082,
      badge: "Store Console",
      themeColor: "text-blue-600",
      accentColor: "bg-blue-600",
      bgLight: "bg-blue-50",
      borderLight: "border-blue-200",
      url: partnerUrl,
      isCurrent: currentPanel === "partner",
    },
    {
      id: "rider",
      name: "Rider & Delivery Fleet App",
      shortName: "Rider App",
      tagline: "Fleet Logistics & Dispatch",
      role: "Delivery Agents",
      description: "Accept pickup & delivery dispatches, OTP handovers, GPS navigation, tips & trip commissions.",
      iconName: "Truck",
      devPort: 8083,
      badge: "Fleet Partner",
      themeColor: "text-amber-600",
      accentColor: "bg-amber-600",
      bgLight: "bg-amber-50",
      borderLight: "border-amber-200",
      url: riderUrl,
      isCurrent: currentPanel === "rider",
    },
    {
      id: "admin",
      name: "Super Admin Command HQ",
      shortName: "Admin Console",
      tagline: "Operations & Governance",
      role: "Platform Admins",
      description: "Master control center: orders, partners, riders, finances, live ledger, coupons, CMS & staff roles.",
      iconName: "ShieldCheck",
      devPort: 8084,
      badge: "Platform HQ",
      themeColor: "text-purple-600",
      accentColor: "bg-purple-600",
      bgLight: "bg-purple-50",
      borderLight: "border-purple-200",
      url: adminUrl,
      isCurrent: currentPanel === "admin",
    },
  ];
}
