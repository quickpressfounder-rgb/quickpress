import {
  BarChart3,
  Bell,
  Building2,
  HelpCircle,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Central route map for the Partner app.
 */
export const partnerRoutes = {
  auth: "/auth",
  otp: "/otp",
  registration: "/registration",
  registrationSubmitted: "/registration-submitted",
  suspended: "/suspended",
  dashboard: "/dashboard",
  orders: "/orders",
  orderDetails: "/orders/$orderId",
  services: "/services",
  serviceNew: "/services/new",
  serviceEdit: "/services/$serviceId/edit",
  customers: "/customers",
  earnings: "/earnings",
  payouts: "/earnings",
  analytics: "/analytics",
  wallet: "/earnings",
  shop: "/shop",
  profile: "/profile",
  settings: "/settings",
  notifications: "/notifications",
} as const;

/**
 * Mobile Zomato-style 5 primary operational bottom navigation tabs.
 */
export const partnerTabs = [
  { id: "dashboard", label: "Hub", icon: LayoutDashboard, to: partnerRoutes.dashboard },
  { id: "orders", label: "Orders", icon: ListOrdered, to: partnerRoutes.orders },
  { id: "services", label: "Services", icon: Sparkles, to: partnerRoutes.services },
  { id: "earnings", label: "Finance", icon: Wallet, to: partnerRoutes.earnings },
  { id: "profile", label: "More", icon: UserRound, to: partnerRoutes.profile },
] as const;

/**
 * Desktop Left Sidebar Operations navigation links (Live Business Ops).
 */
export const partnerOperationsLinks = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: partnerRoutes.dashboard },
  { id: "orders", label: "Orders", icon: ListOrdered, to: partnerRoutes.orders },
  { id: "services", label: "Services", icon: Sparkles, to: partnerRoutes.services },
  { id: "customers", label: "Customers", icon: Users, to: partnerRoutes.customers },
  { id: "payouts", label: "Payouts", icon: BarChart3, to: partnerRoutes.earnings },
  { id: "analytics", label: "Analytics", icon: TrendingUp, to: partnerRoutes.analytics },
] as const;

/**
 * Desktop Left Sidebar Management navigation links (Store Settings & KYC).
 */
export const partnerManagementLinks = [
  { id: "shop", label: "Store", icon: Store, to: partnerRoutes.shop },
  { id: "profile", label: "KYC & Documents", icon: ShieldCheck, to: partnerRoutes.profile },
  { id: "notifications", label: "Notifications", icon: Bell, to: partnerRoutes.notifications },
  { id: "settings", label: "Settings", icon: Settings2, to: partnerRoutes.settings },
] as const;

/**
 * Combined sidebar links for backwards compatibility.
 */
export const partnerSidebarLinks = [
  ...partnerOperationsLinks,
  ...partnerManagementLinks,
] as const;

export const partnerMenuLinks = [
  { id: "shop", label: "Shop Management", icon: Store, to: partnerRoutes.shop },
  { id: "services", label: "Manage Services", icon: Sparkles, to: partnerRoutes.services },
  { id: "customers", label: "Customer List", icon: Users, to: partnerRoutes.customers },
  { id: "analytics", label: "Analytics & Growth", icon: TrendingUp, to: partnerRoutes.analytics },
  { id: "settings", label: "Business Settings", icon: Settings2, to: partnerRoutes.settings },
  { id: "notifications", label: "Notifications", icon: Bell, to: partnerRoutes.notifications },
  { id: "registration", label: "Business Profile", icon: Building2, to: partnerRoutes.registration },
] as const;

export type PartnerTabId = (typeof partnerTabs)[number]["id"] | "services";
