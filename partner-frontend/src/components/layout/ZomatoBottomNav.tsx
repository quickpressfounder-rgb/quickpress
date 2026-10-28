import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BarChart2,
  DollarSign,
  Layers,
  MessageSquare,
  Package,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { partnerRoutes } from "../../navigation/partner-routes";

export interface ZomatoBottomNavProps {
  mode?: "orders" | "hub";
  activeTab?: "hub" | "orders" | "growth" | "menu" | "finance" | "more";
  onSwitchMode?: (nextMode: "orders" | "hub") => void;
  ordersCount?: number;
}

export function ZomatoBottomNav({
  mode = "orders",
  activeTab = "orders",
  onSwitchMode,
  ordersCount = 0,
}: ZomatoBottomNavProps) {
  const navigate = useNavigate();
  const isOrdersMode = mode === "orders" || activeTab === "orders";

  const handleToggle = () => {
    const nextMode = isOrdersMode ? "hub" : "orders";
    if (onSwitchMode) {
      onSwitchMode(nextMode);
    } else {
      if (nextMode === "hub") {
        toast.info("Switching to Business Hub...", { duration: 1500 });
        navigate({ to: partnerRoutes.dashboard, search: { mode: "hub" } as any });
      } else {
        toast.info("Switching to Orders...", { duration: 1500 });
        navigate({ to: partnerRoutes.dashboard, search: { mode: "orders" } as any });
      }
    }
  };

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 flex items-center justify-center gap-2 px-2 pointer-events-none md:hidden max-w-md mx-auto">
      {/* Left Pill: Mode Switcher Button */}
      <div className="pointer-events-auto shrink-0 shadow-2xl">
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-11 sm:h-12 items-center gap-1.5 rounded-full bg-zinc-950 px-3.5 sm:px-4 text-white text-[11px] sm:text-xs font-black shadow-lg transition-transform active:scale-95 border border-zinc-800 cursor-pointer"
        >
          <ArrowLeftRight className="size-3.5 text-zinc-300" />
          <span>{isOrdersMode ? "To Hub" : "To Orders"}</span>
        </button>
      </div>

      {/* Main Pill Capsule */}
      <nav className="pointer-events-auto flex h-11 sm:h-12 items-center rounded-full bg-zinc-950 px-1.5 py-1 shadow-2xl border border-zinc-800 overflow-x-auto no-scrollbar">
        {isOrdersMode ? (
          <>
            {/* Orders Mode Navigation Tabs */}
            <Link
              to={partnerRoutes.dashboard}
              search={{ mode: "orders" } as any}
              className={`relative flex h-9 sm:h-10 items-center gap-1.5 rounded-full px-3 sm:px-3.5 text-[11px] sm:text-xs font-black transition-all ${
                activeTab === "orders"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ShoppingBag className="size-3.5" />
              <span>Orders</span>
              {ordersCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-white text-zinc-950 text-[9px] font-black">
                  {ordersCount > 9 ? "9+" : ordersCount}
                </span>
              )}
            </Link>

            <Link
              to={partnerRoutes.services}
              className={`flex h-9 sm:h-10 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition-all ${
                activeTab === "menu"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Package className="size-3.5" />
              <span>Services</span>
            </Link>

            <Link
              to={partnerRoutes.reviews}
              className={`flex h-9 sm:h-10 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition-all ${
                activeTab === "more"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <MessageSquare className="size-3.5" />
              <span>Feedback</span>
            </Link>

            <Link
              to={partnerRoutes.analytics}
              className={`flex h-9 sm:h-10 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition-all ${
                activeTab === "growth"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>Growth</span>
            </Link>
          </>
        ) : (
          <>
            {/* Hub Mode Navigation Tabs */}
            <Link
              to={partnerRoutes.dashboard}
              search={{ mode: "hub" } as any}
              className={`flex h-9 sm:h-10 items-center gap-1.5 rounded-full px-3 sm:px-3.5 text-[11px] sm:text-xs font-black transition-all ${
                activeTab === "hub"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BarChart2 className="size-3.5" />
              <span>Hub</span>
            </Link>

            <Link
              to={partnerRoutes.analytics}
              className={`flex h-9 sm:h-10 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition-all ${
                activeTab === "growth"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <TrendingUp className="size-3.5" />
              <span>Growth</span>
            </Link>

            <Link
              to={partnerRoutes.services}
              className={`flex h-9 sm:h-10 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition-all ${
                activeTab === "menu"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="size-3.5" />
              <span>Menu</span>
            </Link>

            <Link
              to={partnerRoutes.earnings}
              className={`flex h-9 sm:h-10 items-center gap-1.5 rounded-full px-3 sm:px-3.5 text-[11px] sm:text-xs font-black transition-all ${
                activeTab === "finance"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <DollarSign className="size-3.5" />
              <span>Finance</span>
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
