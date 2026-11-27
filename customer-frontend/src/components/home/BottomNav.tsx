import { Home, Package, Sparkles } from "lucide-react";
import { useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const items = [
  { id: "home", label: "Home", icon: Home, to: "/home" },
  { id: "history", label: "History", icon: Package, to: "/history" },
] as const;

/** Scroll down → dock hides, scroll up → dock shows (Blinkit/District behaviour). */
function useHideOnScroll() {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (Math.abs(delta) < 6) return;
        if (y < 80) setVisible(true);
        else setVisible(delta < 0);
        lastY.current = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return visible;
}

export function BottomNav({ active = "home" }: { active?: string }) {
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [pressed, setPressed] = useState<string | null>(null);
  const visible = useHideOnScroll();

  // Tab routes ko idle time me pehle se load kar lo — tap par instant lage.
  useEffect(() => {
    const idle =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 400));
    const handle = idle(() => {
      items.forEach((item) => void router.preloadRoute({ to: item.to }).catch(() => undefined));
      void router.preloadRoute({ to: "/membership" }).catch(() => undefined);
    });
    return () => {
      const cancel = (window as any).cancelIdleCallback;
      if (cancel) cancel(handle);
      else window.clearTimeout(handle as number);
    };
  }, [router]);

  const bump = (id: string) => {
    setPressed(id);
    window.setTimeout(() => setPressed((p) => (p === id ? null : p)), 320);
  };

  const go = (id: string, to: string) => {
    bump(id);
    if (pathname === to) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate({ to });
  };

  const quickActive = active === "membership" || pathname === "/membership";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bar = (
    <nav
      aria-label="Primary"
      className={`fixed inset-x-0 bottom-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 transition-[transform,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible ? "nav-shown" : "nav-hidden"
      }`}
    >
      {/* Ek hi pill: Home · History · quick+ — transparent glass dock */}
      <div className="mx-auto w-full max-w-md px-4">
        <div className="flex items-stretch gap-1 rounded-full border border-border/40 bg-card/55 p-1.5 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          {items.map((item) => {
            const isActive = item.id === active && !quickActive;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id, item.to)}
                onPointerEnter={() => void router.preloadRoute({ to: item.to }).catch(() => undefined)}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`tap-target relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full px-3 py-2 transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-brand-green/12 text-brand-green"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon
                  className={`size-[1.2rem] shrink-0 transition-transform duration-300 ease-out ${
                    pressed === item.id ? "scale-[1.22]" : isActive ? "scale-110" : "scale-100"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.7}
                />
                <span
                  className={`text-[0.7rem] leading-none tracking-[-0.01em] transition-all duration-200 ${
                    isActive ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Third tab — same shape/size as Home & History */}
          <button
            type="button"
            aria-label="Quick Plus membership"
            aria-current={quickActive ? "page" : undefined}
            onClick={() => go("quick", "/membership")}
            onPointerEnter={() => void router.preloadRoute({ to: "/membership" }).catch(() => undefined)}
            className={`tap-target relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full px-3 py-2 transition-all duration-300 ease-out ${
              quickActive
                ? "bg-brand-green/12 text-brand-green"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles
              className={`size-[1.2rem] shrink-0 transition-transform duration-300 ease-out ${
                pressed === "quick" ? "scale-[1.22]" : quickActive ? "scale-110" : "scale-100"
              }`}
              strokeWidth={quickActive ? 2.2 : 1.7}
            />
            <span
              className={`text-[0.7rem] leading-none tracking-[-0.01em] transition-all duration-200 ${
                quickActive ? "font-semibold" : "font-medium"
              }`}
            >
              quick+
            </span>
          </button>

        </div>
      </div>
    </nav>
  );

  // Portal to body: page transition wrappers use transforms, which would
  // otherwise trap this fixed bar at the bottom of the document.
  return mounted ? createPortal(bar, document.body) : bar;
}
