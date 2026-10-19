import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Home, ClipboardList, Wallet, User, type LucideIcon } from "lucide-react";
import { fetchRiderOffers } from "../api/rider/rider-orders-api";
import { subscribeRiderOffers } from "../lib/rider-socket";
import { triggerHaptic } from "../lib/captain-audio";
import { useLanguage } from "../lib/i18n";

export type RiderTabId = "dashboard" | "orders" | "wallet" | "profile";

type TabItem = {
  id: RiderTabId;
  labelKey: string;
  fallback: string;
  icon: LucideIcon;
  to: string;
};

// 2 Primary Rapido Captain Navigation Tabs (Screenshots 1 & 3)
const RIDER_TABS: TabItem[] = [
  { id: "dashboard", labelKey: "nav.dashboard", fallback: "Home", icon: Home, to: "/dashboard" },
  { id: "orders", labelKey: "nav.orders", fallback: "Orders", icon: ClipboardList, to: "/orders" },
];

interface RiderBottomNavProps {
  active?: RiderTabId;
  ordersBadgeCount?: number;
}

export function RiderBottomNav({ active = "dashboard", ordersBadgeCount }: RiderBottomNavProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [liveOrdersCount, setLiveOrdersCount] = useState<number>(ordersBadgeCount ?? 0);
  const [isVisible] = useState(true);

  // Sync or fetch live pending orders count with Socket.IO subscription
  useEffect(() => {
    if (typeof ordersBadgeCount === "number") {
      setLiveOrdersCount(ordersBadgeCount);
      return;
    }

    let isMounted = true;
    const fetchLiveCount = async () => {
      try {
        const offers = await fetchRiderOffers();
        if (isMounted) {
          setLiveOrdersCount(Array.isArray(offers) ? offers.length : 0);
        }
      } catch {
        if (isMounted) setLiveOrdersCount(0);
      }
    };

    fetchLiveCount();

    // Listen to real-time socket events for instantaneous order badge updates
    const unsubSocket = subscribeRiderOffers((offer: any) => {
      if (offer && isMounted) {
        setLiveOrdersCount((prev) => prev + 1);
      }
    });

    const interval = setInterval(fetchLiveCount, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubSocket();
    };
  }, [ordersBadgeCount]);

  // Eagerly preload all primary tab routes immediately on mount for zero-latency switching
  useEffect(() => {
    RIDER_TABS.forEach((item) => {
      void router.preloadRoute({ to: item.to as any }).catch(() => undefined);
    });
  }, [router]);

  // Calculate active tab
  const activeIndex = RIDER_TABS.findIndex(
    (t) =>
      t.id === active ||
      pathname === t.to ||
      (t.id === "dashboard" && (pathname === "/" || pathname === "/dashboard"))
  );
  const validIndex = activeIndex >= 0 ? activeIndex : 0;
  const isHomeActive = validIndex === 0;
  const isOrdersActive = validIndex === 1;

  return (
    <nav
      aria-label="Captain Primary Bottom Navigation"
      className={`fixed inset-x-0 bottom-0 z-40 bg-white border-t border-zinc-200/90 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-28 opacity-0 pointer-events-none"
      }`}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 6px, 12px)", paddingTop: "8px" }}
    >
      <div className="flex items-center justify-around max-w-sm mx-auto px-6">
        {/* 1. Home Tab (Solid Black Icon + Label) - Screenshot Match */}
        <Link
          to="/dashboard"
          preload="intent"
          preloadDelay={0}
          onPointerDown={() => void router.preloadRoute({ to: "/dashboard" as any }).catch(() => undefined)}
          onTouchStart={() => void router.preloadRoute({ to: "/dashboard" as any }).catch(() => undefined)}
          onClick={(e) => {
            try {
              triggerHaptic(20);
            } catch {}
            if (isHomeActive) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          aria-current={isHomeActive ? "page" : undefined}
          aria-label={t("nav.dashboard", "Home")}
          className="flex flex-col items-center justify-center py-1 px-4 cursor-pointer active:scale-95 transition-transform"
        >
          <Home
            className={`size-[22px] transition-colors ${
              isHomeActive ? "text-zinc-950 fill-zinc-950" : "text-zinc-400 fill-none"
            }`}
            strokeWidth={isHomeActive ? 2.5 : 2}
          />
          <span
            className={`text-[11px] leading-tight mt-1 transition-colors ${
              isHomeActive ? "font-bold text-zinc-950" : "font-medium text-zinc-500"
            }`}
          >
            {t("nav.dashboard", "Home")}
          </span>
        </Link>

        {/* 2. Orders Tab (Capsule Pill Button [ 📋 Orders ]) - Screenshot Match */}
        <Link
          to="/orders"
          preload="intent"
          preloadDelay={0}
          onPointerDown={() => void router.preloadRoute({ to: "/orders" as any }).catch(() => undefined)}
          onTouchStart={() => void router.preloadRoute({ to: "/orders" as any }).catch(() => undefined)}
          onClick={(e) => {
            try {
              triggerHaptic(20);
            } catch {}
            if (isOrdersActive) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          aria-current={isOrdersActive ? "page" : undefined}
          aria-label={t("nav.orders", "Orders")}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full transition-all cursor-pointer active:scale-95 ${
            isOrdersActive
              ? "bg-zinc-950 text-white shadow-xs"
              : "bg-[#F0F2F5] text-zinc-800 hover:bg-[#E5E7EB]"
          }`}
        >
          <div className="relative flex items-center justify-center">
            <ClipboardList
              className={`size-[17px] ${isOrdersActive ? "text-white" : "text-zinc-800"}`}
              strokeWidth={2.2}
            />

            {/* Orders Pending Count Badge */}
            {liveOrdersCount > 0 && (
              <span className="absolute -top-2 -right-2.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-black text-white bg-red-600 rounded-full border border-white shadow-xs animate-pulse">
                {liveOrdersCount}
              </span>
            )}
          </div>

          <span className="text-[13px] font-semibold tracking-tight">
            {t("nav.orders", "Orders")}
          </span>
        </Link>
      </div>
    </nav>
  );
}
