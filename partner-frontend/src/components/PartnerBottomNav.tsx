import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { partnerTabs, type PartnerTabId } from "../navigation/partner-routes";
import { useLanguage } from "../lib/i18n";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import { usePartnerContext } from "../context/PartnerContext";

/**
 * Full-width mobile bottom navigation bar.
 * - 4 options: Dashboard, Orders, Wallet, Profile
 * - Solid black icons, simple clean design, zero hover effects
 * - Auto-hides smoothly on scroll down, reveals on scroll up
 */
export function PartnerBottomNav({ active }: { active: PartnerTabId }) {
  const navigate = useNavigate();
  const router = useRouter();
  const { t, language } = useLanguage();
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
          // When scrolling down past 40px threshold by more than 6px, auto-hide
          if (currentScrollY > lastScrollY.current + 6 && currentScrollY > 40) {
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY.current - 6 || currentScrollY <= 15) {
            // When scrolling up or at top, auto-reveal
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

  // Fetch active operational orders count for the live Orders badge
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

  // Fetch online status for the Hub indicator
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
        navigator.vibrate(10);
      } catch {}
    }
  };

  const handleTabClick = (tab: (typeof partnerTabs)[number]) => {
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
      className={`fixed inset-x-0 bottom-0 z-40 w-full border-t border-zinc-200/90 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.04)] pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 px-4 transition-transform duration-300 ease-in-out md:hidden ${
        isVisible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-around">
        {partnerTabs.map((tab) => {
          const isActive = tab.id === active || (tab.id === "profile" && active === "profile");
          const isOrders = tab.id === "orders";
          const isHub = tab.id === "dashboard";
          const isStore = tab.id === "profile";
          const label = t(`nav.${tab.id}`, tab.label);

          return (
            <button
              key={tab.id}
              type="button"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => handleTabClick(tab)}
              onPointerEnter={() => void router.preloadRoute({ to: tab.to }).catch(() => undefined)}
              className="group relative flex flex-1 flex-col items-center justify-center py-1 select-none active:scale-95 transition-transform"
            >
              {/* Icon Container with live badges */}
              <div className="relative flex items-center justify-center">
                <tab.icon
                  className={`size-5 transition-colors ${
                    isActive ? "text-black dark:text-white stroke-[2.5]" : "text-zinc-500 dark:text-zinc-400 stroke-[1.8]"
                  }`}
                />

                {/* Hub or Store Tab: Live Store Online/Offline Dot */}
                {isHub || isStore ? (
                  <span
                    className={`absolute -top-0.5 -right-1 size-2 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                      isStoreOnline ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    title={isStoreOnline ? "Store Online" : "Store Offline"}
                  />
                ) : null}

                {/* Orders Tab: Live Active Orders Count Badge */}
                {isOrders && activeOrdersCount > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow-xs ring-2 ring-white dark:ring-zinc-900">
                    {activeOrdersCount > 99 ? "99+" : activeOrdersCount}
                  </span>
                ) : null}
              </div>

              {/* Tab Name under Icon */}
              <span
                className={`mt-1 text-[10.5px] tracking-tight transition-colors truncate max-w-[64px] ${
                  isActive ? "font-black text-black dark:text-white" : "font-semibold text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {label}
              </span>

              {/* Minimal Micro Indicator Dot under active label */}
              {isActive ? (
                <span className="mt-0.5 size-1 rounded-full bg-black dark:bg-white" />
              ) : (
                <span className="mt-0.5 size-1 rounded-full bg-transparent" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );

  return mounted ? createPortal(navContent, document.body) : navContent;
}

