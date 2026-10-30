import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Bell,
  Clock,
  FileText,
  Star,
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
  const isBusinessActive = activeTab === "growth" || activeTab === "analytics" || activeTab === "shop" || activeTab === "profile";
  const isFeedbackActive = activeTab === "reviews";
  const isHistoryActive = activeTab === "finance" || activeTab === "wallet";

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-zinc-200/90 py-1.5 px-3 md:hidden">
      <nav className="flex items-center justify-around w-full max-w-md mx-auto">
        {/* 1. Orders (Active blue in screenshot) */}
        <Link
          to={partnerRoutes.orders}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 transition-colors cursor-pointer ${
            isOrdersActive ? "text-[#0284c7]" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <div className="relative">
            <Bell className={`size-5 stroke-[2] ${isOrdersActive ? "text-[#0284c7]" : "text-zinc-500"}`} />
            {isOrdersActive && (
              <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#0284c7]" />
            )}
            {ordersCount > 0 && !isOrdersActive && (
              <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white">
                {ordersCount > 9 ? "9+" : ordersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight">Orders</span>
        </Link>

        {/* 2. Inventory */}
        <Link
          to={partnerRoutes.services}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 transition-colors cursor-pointer ${
            isInventoryActive ? "text-[#0284c7]" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <FileText className={`size-5 stroke-[2] ${isInventoryActive ? "text-[#0284c7]" : "text-zinc-500"}`} />
          <span className="text-[10px] font-bold tracking-tight">Inventory</span>
        </Link>

        {/* 3. Business (Center elevated button matching screenshot) */}
        <Link
          to={partnerRoutes.analytics}
          className="flex flex-col items-center justify-center gap-0.5 -mt-3 transition-transform active:scale-95 cursor-pointer"
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-md text-zinc-700">
            <ArrowLeftRight className="size-5 stroke-[2]" />
          </div>
          <span className="text-[10px] font-bold text-zinc-600 tracking-tight">Business</span>
        </Link>

        {/* 4. Feedback */}
        <Link
          to={partnerRoutes.reviews}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 transition-colors cursor-pointer ${
            isFeedbackActive ? "text-[#0284c7]" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Star className={`size-5 stroke-[2] ${isFeedbackActive ? "text-[#0284c7]" : "text-zinc-500"}`} />
          <span className="text-[10px] font-bold tracking-tight">Feedback</span>
        </Link>

        {/* 5. History */}
        <Link
          to={partnerRoutes.earnings}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 transition-colors cursor-pointer ${
            isHistoryActive ? "text-[#0284c7]" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Clock className={`size-5 stroke-[2] ${isHistoryActive ? "text-[#0284c7]" : "text-zinc-500"}`} />
          <span className="text-[10px] font-bold tracking-tight">History</span>
        </Link>
      </nav>
    </div>
  );
}
