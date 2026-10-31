import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Layers,
  LogOut,
  MessageSquare,
  Power,
  Settings2,
  ShoppingBag,
  Sparkles,
  Store,
  Volume2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { partnerRoutes } from "../../navigation/partner-routes";
import { usePartnerOrders } from "../../context/PartnerOrdersContext";
import { playPartnerOrderAlertChime } from "../../lib/partner-order-alert-sound";

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

  // Active bookings count for live Orders badge
  let activeOrdersCount = 0;
  try {
    const { orders } = usePartnerOrders();
    activeOrdersCount =
      orders?.filter(
        (o) => o.stage !== "completed" && o.stage !== "delivered" && o.stage !== "cancelled"
      ).length || 0;
  } catch {
    activeOrdersCount = 0;
  }

  const handleTestChime = () => {
    try {
      playPartnerOrderAlertChime();
      toast.success("Order alert buzzer test ringing!");
    } catch {
      toast.error("Could not play sound. Please click anywhere to enable audio.");
    }
  };

  // Essential Partner Store Operations Menu
  const navItems = [
    {
      id: "orders",
      label: "Live Orders",
      icon: ShoppingBag,
      to: partnerRoutes.orders,
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      badgeColor: "bg-rose-500 text-white animate-pulse",
      isActive: pathname === partnerRoutes.orders || pathname.startsWith("/orders/") || pathname === "/",
    },
    {
      id: "services",
      label: "Rate Card & Menu",
      icon: Sparkles,
      to: partnerRoutes.services,
      isActive: pathname.startsWith("/services"),
    },
    {
      id: "reporting",
      label: "Analytics & Trends",
      icon: BarChart3,
      to: partnerRoutes.analytics,
      isActive: pathname === partnerRoutes.analytics,
    },
    {
      id: "finance",
      label: "Wallet & Payouts",
      icon: Wallet,
      to: partnerRoutes.earnings,
      isActive: pathname === partnerRoutes.earnings || pathname === partnerRoutes.wallet,
    },
    {
      id: "outlet_info",
      label: "Outlet Profile",
      icon: Store,
      to: partnerRoutes.shop,
      isActive: pathname === partnerRoutes.shop,
    },
    {
      id: "reviews",
      label: "Customer Reviews",
      icon: MessageSquare,
      to: partnerRoutes.reviews,
      isActive: pathname === partnerRoutes.reviews,
    },
    {
      id: "settings",
      label: "Store Settings",
      icon: Settings2,
      to: partnerRoutes.settings,
      isActive: pathname === partnerRoutes.settings,
    },
    {
      id: "help",
      label: "Help Centre",
      icon: HelpCircle,
      to: partnerRoutes.help,
      isActive: pathname === partnerRoutes.help,
    },
  ];

  return (
    <aside
      className={`relative sticky top-14 hidden h-[calc(100vh-3.5rem)] flex-col border-r border-zinc-200/90 bg-white transition-all duration-300 md:flex select-none z-20 ${
        collapsed ? "w-16" : "w-56 lg:w-60"
      }`}
    >
      {/* Floating Sidebar Collapse Button */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-6 flex size-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-xs transition-all hover:bg-zinc-50 hover:text-zinc-950 cursor-pointer z-30"
      >
        {collapsed ? (
          <ChevronRight className="size-3.5 stroke-[2.2]" />
        ) : (
          <ChevronLeft className="size-3.5 stroke-[2.2]" />
        )}
      </button>

      {/* Navigation Links matching Zomato's exact typography and spacing */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.id}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-all cursor-pointer ${
                active
                  ? "bg-[#5B63D3]/10 text-[#5B63D3] font-black shadow-2xs border border-[#5B63D3]/20"
                  : "font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`size-4.5 shrink-0 stroke-[2] transition-colors ${
                    active ? "text-[#5B63D3]" : "text-zinc-500 group-hover:text-zinc-950"
                  }`}
                />
                {!collapsed && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}
              </div>

              {!collapsed && item.badge ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-black shrink-0 ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Actions (Test Chime & Status Indicator) */}
      {!collapsed ? (
        <div className="border-t border-zinc-100 p-2.5 space-y-2">
          {/* Quick Sound Alert Test Button */}
          <button
            type="button"
            onClick={handleTestChime}
            className="flex w-full items-center justify-between rounded-xl bg-zinc-50 hover:bg-zinc-100/80 px-2.5 py-2 text-[11px] font-bold text-zinc-700 transition-all cursor-pointer border border-zinc-200/60"
            title="Test Order Alert Buzzer"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="size-3.5 text-zinc-500" />
              <span>Test Audio Buzzer</span>
            </div>
            <span className="text-[10px] text-zinc-400">Ring</span>
          </button>

          {/* Online / Offline Status Indicator */}
          <div className="flex items-center justify-between rounded-xl bg-zinc-50/70 p-2 border border-zinc-200/50">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`size-2 shrink-0 rounded-full ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="text-[11px] font-bold text-zinc-800 truncate">
                {isOnline ? "Store Online" : "Store Offline"}
              </span>
            </div>

            {onToggleStatus && (
              <button
                type="button"
                onClick={onToggleStatus}
                className="text-[10px] font-black text-[#5B63D3] hover:underline cursor-pointer"
              >
                Toggle
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-zinc-100 p-2 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleTestChime}
            className="size-8 rounded-lg bg-zinc-50 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
            title="Test Buzzer"
          >
            <Volume2 className="size-4" />
          </button>
          <span
            className={`size-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`}
            title={isOnline ? "Store Online" : "Store Offline"}
          />
        </div>
      )}
    </aside>
  );
}
