import { Link, useLocation, useNavigate } from "@tanstack/react-router";
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

import { partnerRoutes } from "../../navigation/partner-routes";

export function ZomatoBottomNav({
  activeTab = "hub",
}: {
  activeTab?: "hub" | "orders" | "growth" | "menu" | "finance" | "more";
}) {
  const navigate = useNavigate();
  const isOrdersMode = activeTab === "orders";

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 flex items-center justify-center gap-2 px-3 pointer-events-none md:hidden">
      {/* Left Pill: Switcher button */}
      <div className="pointer-events-auto shrink-0 shadow-2xl">
        {isOrdersMode ? (
          <button
            type="button"
            onClick={() => navigate({ to: partnerRoutes.dashboard })}
            className="flex h-12 items-center gap-1.5 rounded-full bg-zinc-950 px-4 text-white text-xs font-black shadow-lg transition-transform active:scale-95 border border-zinc-800"
          >
            <ArrowLeftRight className="size-3.5" />
            <span>To Hub</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate({ to: partnerRoutes.orders })}
            className="flex h-12 items-center gap-1.5 rounded-full bg-zinc-950 px-4 text-white text-xs font-black shadow-lg transition-transform active:scale-95 border border-zinc-800"
          >
            <ArrowLeftRight className="size-3.5" />
            <span>To Orders</span>
          </button>
        )}
      </div>

      {/* Main Pill Capsule */}
      <nav className="pointer-events-auto flex h-12 items-center rounded-full bg-zinc-950 px-1.5 py-1 shadow-2xl border border-zinc-800">
        {isOrdersMode ? (
          <>
            {/* Orders view tabs */}
            <Link
              to={partnerRoutes.orders}
              className={`flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-black transition-all ${
                activeTab === "orders"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ShoppingBag className="size-3.5" />
              <span>Orders</span>
            </Link>

            <Link
              to={partnerRoutes.services}
              className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-black transition-all ${
                activeTab === "menu"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Package className="size-3.5" />
              <span>Services</span>
            </Link>

            <Link
              to={partnerRoutes.reviews}
              className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-black text-zinc-400 hover:text-zinc-200 transition-all"
            >
              <MessageSquare className="size-3.5" />
              <span>Reviews</span>
            </Link>

            <Link
              to={partnerRoutes.analytics}
              className="flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-black text-zinc-400 hover:text-zinc-200 transition-all"
            >
              <Sparkles className="size-3.5" />
              <span>Growth</span>
            </Link>
          </>
        ) : (
          <>
            {/* Hub view tabs */}
            <Link
              to={partnerRoutes.dashboard}
              className={`flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-black transition-all ${
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
              className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-black transition-all ${
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
              className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-black transition-all ${
                activeTab === "menu"
                  ? "bg-zinc-800 text-white shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="size-3.5" />
              <span>Services</span>
            </Link>

            <Link
              to={partnerRoutes.earnings}
              className={`flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-black transition-all ${
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
