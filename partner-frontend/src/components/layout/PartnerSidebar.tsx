import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Layers,
  MessageSquare,
  ShoppingBag,
  Store,
  Wallet,
} from "lucide-react";

import { partnerRoutes } from "../../navigation/partner-routes";

export function PartnerSidebar({
  shopName,
  shopLogo,
  isOnline,
  onToggleStatus,
  onLogout,
}: {
  shopName?: string;
  shopLogo?: string;
  isOnline?: boolean;
  onToggleStatus?: () => void;
  onLogout?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);

  // Essential Partner Store Operations Menu
  const navItems = [
    {
      id: "orders",
      label: "Orders",
      icon: ShoppingBag,
      to: partnerRoutes.dashboard,
      isActive: pathname === partnerRoutes.dashboard || pathname === "/",
    },
    {
      id: "services",
      label: "Services",
      icon: Layers,
      to: partnerRoutes.services,
      isActive: pathname.startsWith("/services"),
    },
    {
      id: "order_history",
      label: "Order history",
      icon: Clock,
      to: partnerRoutes.orders,
      isActive: pathname === partnerRoutes.orders || pathname.startsWith("/orders/"),
    },
    {
      id: "reporting",
      label: "Reporting",
      icon: BarChart3,
      to: partnerRoutes.analytics,
      isActive: pathname === partnerRoutes.analytics,
    },
    {
      id: "finance",
      label: "Finance",
      icon: Wallet,
      to: partnerRoutes.earnings,
      isActive: pathname === partnerRoutes.earnings,
      hasChevron: true,
    },
    {
      id: "outlet_info",
      label: "Outlet info",
      icon: Store,
      to: partnerRoutes.shop,
      isActive: pathname === partnerRoutes.shop,
    },
    {
      id: "reviews",
      label: "Reviews",
      icon: MessageSquare,
      to: partnerRoutes.reviews,
      isActive: pathname === partnerRoutes.reviews,
    },
    {
      id: "help",
      label: "Help centre",
      icon: HelpCircle,
      to: partnerRoutes.help,
      isActive: pathname === partnerRoutes.help,
    },
  ];

  return (
    <aside
      className={`relative sticky top-14 hidden h-[calc(100vh-3.5rem)] flex-col border-r border-zinc-200/80 bg-white transition-all duration-300 md:flex select-none z-20 ${
        collapsed ? "w-16" : "w-56 lg:w-60"
      }`}
    >
      {/* Floating Sidebar Collapse Button matching Image 1 */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-20 flex size-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer z-30"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5 stroke-[2.2]" />
        ) : (
          <ChevronLeft className="size-3.5 stroke-[2.2]" />
        )}
      </button>

      {/* Navigation Links matching Zomato's exact typography and spacing */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.id}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs transition-colors cursor-pointer ${
                active
                  ? "bg-zinc-100 font-bold text-zinc-950 shadow-2xs"
                  : "font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`size-4.5 shrink-0 stroke-[1.8] transition-colors ${
                    active ? "text-zinc-950" : "text-zinc-500 group-hover:text-zinc-950"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}
              </div>

              {!collapsed && item.hasChevron && (
                <ChevronDown className="size-3 text-zinc-400 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
