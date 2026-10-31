import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  Sparkles,
  TrendingUp,
  Wallet,
  Store,
  Layers,
  ShoppingBag,
} from "lucide-react";

import { partnerRoutes, type PartnerTabId } from "../navigation/partner-routes";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import { usePartnerContext } from "../context/PartnerContext";

interface NavTabItem {
  id: PartnerTabId;
  label: string;
  icon: typeof ShoppingBag;
  to: string;
  isCenter?: boolean;
}

const TABS: NavTabItem[] = [
  { id: "orders", label: "Orders", icon: Bell, to: partnerRoutes.orders },
  { id: "services", label: "Services", icon: Sparkles, to: partnerRoutes.services },
  { id: "analytics", label: "Analytics", icon: TrendingUp, to: partnerRoutes.analytics, isCenter: true },
  { id: "earnings", label: "Wallet", icon: Wallet, to: partnerRoutes.earnings },
  { id: "profile", label: "Store", icon: Store, to: partnerRoutes.profile },
];

/**
 * Modern Zomato Merchant Mobile Bottom Navigation Bar.
 * - Glassmorphic backdrop blur (bg-white/95 backdrop-blur-md)
 * - Elevated center button for Analytics/Business
 * - Live animated badge for incoming orders
 * - Live pulsating green dot for Store Online status
 * - Haptic feedback on touch
 * - Safe area padding for modern iPhones & Androids
 */
export function PartnerBottomNav({ active }: { active: PartnerTabId }) {
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setMounted(true);

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Auto-hide on deep scroll down, reveal on scroll up
          if (currentScrollY > lastScrollY.current + 8 && currentScrollY > 60) {
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY.current - 6 || currentScrollY <= 20) {
            setIsVisible(true);
          }
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch active orders count for live badge
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

  // Fetch online status for the Store indicator
  let isStoreOnline = true;
  try {
    const { isOnline } = usePartnerContext();
    isStoreOnline = isOnline;
  } catch {
    isStoreOnline = true;
  }

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(12);
      } catch {}
    }
  };

  const handleTabClick = (tab: NavTabItem) => {
    triggerHaptic();
    if (pathname === tab.to) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate({ to: tab.to });
  };

  const navContent = (
    <nav
      aria-label="Partner Navigation"
      className={`fixed inset-x-0 bottom-0 z-40 w-full border-t border-zinc-200/90 bg-white/95 backdrop-blur-md pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1.5 px-3 shadow-[0_-2px_12px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-in-out md:hidden select-none ${
        isVisible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-around">
        {TABS.map((tab) => {
          const isActive =
            tab.id === active ||
            (tab.id === "orders" && (active === "orders" || pathname.startsWith("/orders"))) ||
            (tab.id === "services" && pathname.startsWith("/services")) ||
            (tab.id === "analytics" && pathname.startsWith("/analytics")) ||
            (tab.id === "earnings" && (pathname.startsWith("/earnings") || pathname.startsWith("/wallet"))) ||
            (tab.id === "profile" && (pathname.startsWith("/profile") || pathname.startsWith("/shop")));

          const isOrders = tab.id === "orders";
          const isStore = tab.id === "profile";
          const Icon = tab.icon;

          if (tab.isCenter) {
            // Elevated Center Button (Analytics / Business Hub)
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                onPointerEnter={() => void router.preloadRoute({ to: tab.to }).catch(() => undefined)}
                className="group relative flex flex-col items-center justify-center -mt-3.5 focus:outline-hidden cursor-pointer"
              >
                <div
                  className={`flex size-11 items-center justify-center rounded-full shadow-md transition-all active:scale-90 ${
                    isActive
                      ? "bg-[#5B63D3] text-white shadow-indigo-500/30 ring-2 ring-[#5B63D3]/20"
                      : "bg-white border border-zinc-200/90 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-50"
                  }`}
                >
                  <Icon className="size-5 stroke-[2.2]" />
                </div>
                <span
                  className={`mt-0.5 text-[10px] font-bold tracking-tight transition-colors ${
                    isActive ? "text-[#5B63D3] font-black" : "text-zinc-500"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab)}
              onPointerEnter={() => void router.preloadRoute({ to: tab.to }).catch(() => undefined)}
              className="group relative flex flex-1 flex-col items-center justify-center py-1 transition-transform active:scale-95 focus:outline-hidden cursor-pointer"
            >
              {/* Icon Container with live badges */}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`size-5 transition-colors ${
                    isActive
                      ? "text-[#5B63D3] stroke-[2.4]"
                      : "text-zinc-500 group-hover:text-zinc-800 stroke-[1.9]"
                  }`}
                />

                {/* Orders Tab: Live Badge for active bookings */}
                {isOrders && activeOrdersCount > 0 ? (
                  <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-xs ring-2 ring-white animate-pulse">
                    {activeOrdersCount > 9 ? "9+" : activeOrdersCount}
                  </span>
                ) : null}

                {/* Store Tab: Live Store Online/Offline Dot */}
                {isStore ? (
                  <span
                    className={`absolute -top-0.5 -right-1 size-2 rounded-full ring-2 ring-white ${
                      isStoreOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                    }`}
                    title={isStoreOnline ? "Store Online" : "Store Offline"}
                  />
                ) : null}
              </div>

              {/* Tab Name under Icon */}
              <span
                className={`mt-1 text-[10px] tracking-tight truncate max-w-[64px] transition-colors ${
                  isActive ? "font-black text-[#5B63D3]" : "font-semibold text-zinc-500"
                }`}
              >
                {tab.label}
              </span>

              {/* Minimal Micro Indicator Dot under active label */}
              <span
                className={`mt-0.5 size-1 rounded-full transition-all ${
                  isActive ? "bg-[#5B63D3] scale-100" : "bg-transparent scale-0"
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );

  return mounted ? createPortal(navContent, document.body) : navContent;
}
