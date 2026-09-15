import {
  Award,
  BarChart3,
  Bell,
  ClipboardList,
  History,
  LayoutDashboard,
  Navigation,
  MessageSquare,
  Megaphone,
  Settings2,
  Sparkles,
  Trophy,
  TrendingUp,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";

/**
 * Central route map for the Rider app. Route files under
 * `rider-frontend/src/routes/*.tsx` are thin wrappers around these screens so the
 * customer and partner frontends stay untouched.
 */
export const riderRoutes = {
  auth: "/auth",
  otp: "/otp",
  registration: "/registration",
  verification: "/verification",
  dashboard: "/dashboard",
  orders: "/orders",
  wallet: "/wallet",
  incentives: "/incentives",
  leaderboard: "/leaderboard",
  notifications: "/notifications",
  profile: "/profile",
} as const;

export const riderTabs = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, to: riderRoutes.dashboard },
  { id: "orders", label: "Orders", icon: ClipboardList, to: riderRoutes.orders },
  { id: "wallet", label: "Wallet", icon: Wallet, to: riderRoutes.wallet },
  { id: "profile", label: "Profile", icon: UserRound, to: riderRoutes.profile },
] as const;

export const riderMenuLinks = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: riderRoutes.dashboard },
  { id: "orders", label: "Assigned Orders", icon: ClipboardList, to: riderRoutes.orders },
  { id: "wallet", label: "Earnings & Payouts", icon: Wallet, to: riderRoutes.wallet },
  { id: "incentives", label: "Incentives & Targets", icon: TrendingUp, to: riderRoutes.incentives },
  { id: "leaderboard", label: "City Leaderboard", icon: Trophy, to: riderRoutes.leaderboard },
  { id: "notifications", label: "Notifications", icon: Bell, to: riderRoutes.notifications },
  { id: "profile", label: "Captain Profile", icon: UserRound, to: riderRoutes.profile },
] as const;

export type RiderTabId = (typeof riderTabs)[number]["id"];
