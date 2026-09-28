import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useCart } from "@/hooks/useCart";

/**
 * Blinkit-style Floating "View Cart" Pill Bar:
 * - Rich green pill: `#0c831f`
 * - Left: Overlapping circular item thumbnails with white borders
 * - Center: "View cart" (bold white) and "X items" (soft white)
 * - Right: Chevron right arrow
 * - Navigates directly to `/cart` on tap
 */
export function FloatingCartBar({
  hasBottomNav,
}: {
  hasBottomNav?: boolean;
}) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { count, total, lines } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Preload cart route in background for 0ms instant open
  useEffect(() => {
    if (count > 0) {
      void router.preloadRoute({ to: "/cart" }).catch(() => undefined);
    }
  }, [count, router]);

  // Don't show floating bar on checkout, cart, or success pages
  if (!mounted || count === 0 || pathname === "/cart" || pathname === "/checkout" || pathname.startsWith("/order-success")) {
    return null;
  }

  // Auto-detect if current page has bottom navbar
  const pagesWithBottomNav = [
    "/home",
    "/history",
    "/membership",
    "/offers",
    "/profile",
    "/wallet",
    "/help",
    "/notifications",
    "/addresses",
    "/payment-methods",
    "/invoices",
  ];
  const showAboveNav =
    hasBottomNav !== undefined
      ? hasBottomNav
      : pagesWithBottomNav.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Up to 3 item thumbnails
  const displayItems = lines.slice(0, 3);

  const bar = (
    <aside
      aria-label="Floating View Cart Bar"
      className={`fixed inset-x-0 ${
        showAboveNav
          ? "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.25rem)]"
          : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
      } z-40 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-none`}
    >
      <div className="mx-auto w-full max-w-md px-4">
        <Link
          to="/cart"
          className="group pointer-events-auto relative overflow-hidden flex items-center justify-between gap-3 rounded-2xl bg-[#006045] text-white border border-[#006045] px-4 py-2.5 shadow-[0_12px_36px_-6px_rgba(0,96,69,0.4)] ring-1 ring-black/10 transition-all duration-300 cursor-pointer active:scale-[0.98] hover:brightness-105 hover:shadow-[0_16px_40px_-6px_rgba(0,96,69,0.5)]"
        >
          {/* Left: Overlapping circular item thumbnails + View Cart text */}
          <div className="flex items-center gap-3 min-w-0 z-10">
            {/* Overlapping circular product thumbnails */}
            <div className="flex items-center -space-x-3 shrink-0">
              {displayItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="size-9 rounded-full border-2 border-[#006045] bg-white overflow-hidden shadow-sm flex items-center justify-center shrink-0 ring-1 ring-white/20"
                  style={{ zIndex: 10 - idx }}
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full bg-emerald-50 flex items-center justify-center text-[#006045] text-[11px] font-black uppercase">
                      {item.name.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* View Cart & Item Count Text */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-black text-white leading-tight tracking-tight">
                  View cart
                </p>
                <span className="inline-flex items-center justify-center rounded-full bg-white/20 border border-white/25 px-1.5 py-0.2 text-[10px] font-black text-white">
                  {count}
                </span>
              </div>
              <p className="text-[11px] font-medium text-emerald-100/90 leading-tight mt-0.5 truncate">
                {count === 1 ? "1 item added" : `${count} items in basket`}
              </p>
            </div>
          </div>

          {/* Right: Subtotal & Chevron Right Arrow with Pill */}
          <div className="flex items-center gap-2 shrink-0 z-10">
            <div className="rounded-xl bg-black/20 hover:bg-black/30 px-3 py-1.5 border border-white/15 text-right transition-colors">
              <span className="text-xs font-black text-white tracking-tight">
                ₹{total}
              </span>
            </div>
            <div className="flex size-7 items-center justify-center rounded-full bg-white text-[#006045] transition-transform duration-200 group-hover:translate-x-0.5 shadow-xs">
              <ChevronRight className="size-4 stroke-[3]" />
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );

  return createPortal(bar, document.body);
}
