import { Link } from "@tanstack/react-router";
import {
  DollarSign,
  Package,
  ShoppingBag,
  Store,
  TrendingUp,
} from "lucide-react";

import { partnerRoutes } from "../../navigation/partner-routes";

export interface ZomatoBottomNavProps {
  mode?: "orders" | "hub";
  activeTab?: "hub" | "orders" | "growth" | "menu" | "finance" | "more" | "services" | "analytics" | "wallet" | "profile" | "shop";
  onSwitchMode?: (nextMode: "orders" | "hub") => void;
  ordersCount?: number;
}

export function ZomatoBottomNav({
  activeTab = "orders",
  ordersCount = 0,
}: ZomatoBottomNavProps) {
  const isOrdersActive = activeTab === "orders" || activeTab === "hub";
  const isServicesActive = activeTab === "menu" || activeTab === "services";
  const isAnalyticsActive = activeTab === "growth" || activeTab === "analytics";
  const isWalletActive = activeTab === "finance" || activeTab === "wallet";
  const isStoreActive = activeTab === "more" || activeTab === "profile" || activeTab === "shop";

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 flex items-center justify-center px-3 pointer-events-none md:hidden max-w-md mx-auto">
      {/* Main Customer-Theme Bottom Glass Dock */}
      <nav className="pointer-events-auto flex h-13 items-center justify-around w-full rounded-full bg-card/90 dark:bg-zinc-950/90 backdrop-blur-2xl px-2 py-1 shadow-2xl border border-border/70 dark:border-zinc-800">
        {/* 1. Orders Queue (Primary) */}
        <Link
          to={partnerRoutes.orders}
          className={`relative flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all ${
            isOrdersActive
              ? "bg-brand-green text-white shadow-cta font-black"
              : "text-muted-foreground hover:text-foreground active:scale-95"
          }`}
        >
          <ShoppingBag className="size-4" />
          <span>Orders</span>
          {ordersCount > 0 && (
            <span className={`flex size-4.5 items-center justify-center rounded-full text-[9px] font-black ${
              isOrdersActive ? "bg-white text-emerald-800" : "bg-brand-green text-white"
            }`}>
              {ordersCount > 9 ? "9+" : ordersCount}
            </span>
          )}
        </Link>

        {/* 2. Services Management */}
        <Link
          to={partnerRoutes.services}
          className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all ${
            isServicesActive
              ? "bg-brand-green text-white shadow-cta font-black"
              : "text-muted-foreground hover:text-foreground active:scale-95"
          }`}
        >
          <Package className="size-4" />
          <span>Services</span>
        </Link>

        {/* 3. Analytics & Growth */}
        <Link
          to={partnerRoutes.analytics}
          className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all ${
            isAnalyticsActive
              ? "bg-brand-green text-white shadow-cta font-black"
              : "text-muted-foreground hover:text-foreground active:scale-95"
          }`}
        >
          <TrendingUp className="size-4" />
          <span>Analytics</span>
        </Link>

        {/* 4. Wallet & Settlement */}
        <Link
          to={partnerRoutes.earnings}
          className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all ${
            isWalletActive
              ? "bg-brand-green text-white shadow-cta font-black"
              : "text-muted-foreground hover:text-foreground active:scale-95"
          }`}
        >
          <DollarSign className="size-4" />
          <span>Wallet</span>
        </Link>

        {/* 5. Store & Settings */}
        <Link
          to={partnerRoutes.profile}
          className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-all ${
            isStoreActive
              ? "bg-brand-green text-white shadow-cta font-black"
              : "text-muted-foreground hover:text-foreground active:scale-95"
          }`}
        >
          <Store className="size-4" />
          <span>Store</span>
        </Link>
      </nav>
    </div>
  );
}
