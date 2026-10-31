import { Link } from "@tanstack/react-router";
import {
  Bell,
  Sparkles,
  TrendingUp,
  Wallet,
  Store,
} from "lucide-react";

import { partnerRoutes } from "../../navigation/partner-routes";

export interface ZomatoBottomNavProps {
  mode?: "orders" | "hub";
  activeTab?: "hub" | "orders" | "growth" | "menu" | "finance" | "more" | "services" | "analytics" | "wallet" | "profile" | "shop" | "reviews";
  onSwitchMode?: (nextMode: "orders" | "hub") => void;
  ordersCount?: number;
}

export function ZomatoBottomNav({
  activeTab = "orders",
  ordersCount = 0,
}: ZomatoBottomNavProps) {
  const isOrdersActive = activeTab === "orders" || activeTab === "hub";
  const isInventoryActive = activeTab === "menu" || activeTab === "services";
  const isBusinessActive = activeTab === "growth" || activeTab === "analytics";
  const isWalletActive = activeTab === "finance" || activeTab === "wallet";
  const isProfileActive = activeTab === "profile" || activeTab === "shop";

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 py-1.5 px-3 md:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.04)] select-none">
      <nav className="flex items-center justify-around w-full max-w-md mx-auto">
        {/* 1. Orders */}
        <Link
          to={partnerRoutes.orders}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 transition-colors cursor-pointer ${
            isOrdersActive ? "text-[#5B63D3]" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <div className="relative">
            <Bell className={`size-5 stroke-[2] ${isOrdersActive ? "text-[#5B63D3]" : "text-zinc-500"}`} />
            {isOrdersActive && (
              <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#5B63D3]" />
            )}
            {ordersCount > 0 && !isOrdersActive && (
              <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white animate-pulse">
                {ordersCount > 9 ? "9+" : ordersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight">Orders</span>
        </Link>

        {/* 2. Services / Menu */}
        <Link
          to={partnerRoutes.services}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 transition-colors cursor-pointer ${
            isInventoryActive ? "text-[#5B63D3]" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Sparkles className={`size-5 stroke-[2] ${isInventoryActive ? "text-[#5B63D3]" : "text-zinc-500"}`} />
          <span className="text-[10px] font-bold tracking-tight">Services</span>
        </Link>

        {/* 3. Analytics (Center elevated button) */}
        <Link
          to={partnerRoutes.analytics}
          className="flex flex-col items-center justify-center gap-0.5 -mt-3.5 transition-transform active:scale-90 cursor-pointer"
        >
          <div
            className={`flex size-11 items-center justify-center rounded-full shadow-md ${
              isBusinessActive
                ? "bg-[#5B63D3] text-white shadow-indigo-500/30 ring-2 ring-[#5B63D3]/20"
                : "bg-white border border-zinc-200/90 text-zinc-700"
            }`}
          >
            <TrendingUp className="size-5 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] font-bold tracking-tight ${
              isBusinessActive ? "text-[#5B63D3] font-black" : "text-zinc-600"
            }`}
          >
            Analytics
          </span>
        </Link>

        {/* 4. Wallet */}
        <Link
          to={partnerRoutes.earnings}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 transition-colors cursor-pointer ${
            isWalletActive ? "text-[#5B63D3]" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Wallet className={`size-5 stroke-[2] ${isWalletActive ? "text-[#5B63D3]" : "text-zinc-500"}`} />
          <span className="text-[10px] font-bold tracking-tight">Wallet</span>
        </Link>

        {/* 5. Store / Profile */}
        <Link
          to={partnerRoutes.profile}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 transition-colors cursor-pointer ${
            isProfileActive ? "text-[#5B63D3]" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Store className={`size-5 stroke-[2] ${isProfileActive ? "text-[#5B63D3]" : "text-zinc-500"}`} />
          <span className="text-[10px] font-bold tracking-tight">Store</span>
        </Link>
      </nav>
    </div>
  );
}
