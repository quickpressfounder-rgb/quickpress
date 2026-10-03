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

// 4 Primary Captain App Navigation Tabs
const RIDER_TABS: TabItem[] = [
  { id: "dashboard", labelKey: "nav.dashboard", fallback: "Home", icon: Home, to: "/dashboard" },
  { id: "orders", labelKey: "nav.orders", fallback: "Trips", icon: ClipboardList, to: "/orders" },
  { id: "wallet", labelKey: "nav.wallet", fallback: "Earnings", icon: Wallet, to: "/wallet" },
  { id: "profile", labelKey: "nav.profile", fallback: "Profile", icon: User, to: "/profile" },
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
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Auto-hide bottom nav on scroll down, show on scroll up
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
          const diff = currentScrollY - lastScrollY.current;

          // If scrolled down by more than 6px and past 30px from top -> hide
          if (diff > 6 && currentScrollY > 30) {
            setIsVisible(false);
          } else if (diff < -6 || currentScrollY <= 20) {
            // Scrolled up or at top -> show
            setIsVisible(true);
          }
          lastScrollY.current = Math.max(0, currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  // Calculate active tab index for fluid gliding pill animation
  const activeIndex = RIDER_TABS.findIndex(
    (t) =>
      t.id === active ||
      pathname === t.to ||
      (t.id === "dashboard" && (pathname === "/" || pathname === "/dashboard"))
  );
  const validIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <nav
      aria-label="Captain Primary Bottom Navigation"
      className={`fixed inset-x-0 bottom-0 z-40 pt-1 transition-all duration-300 ease-out select-none ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-28 opacity-0 pointer-events-none"
      }`}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 8px, 14px)" }}
    >
      {/* Floating Glass Dock */}
      <div className="mx-auto w-full max-w-md px-4 pointer-events-auto">
        <div className="relative grid grid-cols-4 rounded-full border border-zinc-200/80 bg-white/95 p-1.5 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
          {/* Spring-Gliding Active Pill Indicator */}
          <div
            className="absolute top-1.5 bottom-1.5 rounded-full bg-zinc-950 shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] pointer-events-none"
            style={{
              left: `calc(6px + ${validIndex} * ((100% - 12px) / 4))`,
              width: `calc((100% - 12px) / 4)`,
            }}
          />

          {RIDER_TABS.map((item, idx) => {
            const isActive = idx === validIndex;
            const label = t(item.labelKey, item.fallback);

            return (
              <Link
                key={item.id}
                to={item.to as any}
                preload="intent"
                preloadDelay={0}
                onPointerDown={() => void router.preloadRoute({ to: item.to as any }).catch(() => undefined)}
                onTouchStart={() => void router.preloadRoute({ to: item.to as any }).catch(() => undefined)}
                onClick={(e) => {
                  try {
                    triggerHaptic(20);
                  } catch {}
                  if (isActive) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                className="tap-target relative z-10 flex flex-col items-center justify-center gap-1 rounded-full px-2 py-2 transition-transform duration-100 cursor-pointer active:scale-90"
              >
                <div className="relative flex items-center justify-center">
                  <item.icon
                    className={`size-[1.2rem] shrink-0 transition-all duration-300 ease-out ${
                      isActive
                        ? "text-white scale-110 -translate-y-0.5"
                        : "text-zinc-500 scale-100 hover:text-zinc-800"
                    }`}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />

                  {/* Orders Pending Count Badge */}
                  {item.id === "orders" && liveOrdersCount > 0 && (
                    <span className="absolute -top-1.5 -right-3 flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[9px] font-black text-white bg-red-600 rounded-full border-2 border-white shadow-xs animate-pulse">
                      {liveOrdersCount}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[0.7rem] leading-none tracking-[-0.01em] transition-all duration-300 ${
                    isActive ? "font-bold text-white scale-105" : "font-medium text-zinc-500"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );

  return bar;
}
