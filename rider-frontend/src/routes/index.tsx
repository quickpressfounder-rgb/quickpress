import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";
import captainLogo from "../assets/quickpress-captain-hd-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickPress Captain" },
      {
        name: "description",
        content: "QuickPress Captain — Delivery Partner App",
      },
    ],
  }),
  component: RiderSplashScreen,
});

function RiderSplashScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    let cancelled = false;

    // Fast session detection
    let sess: any = readSession("rider") || readSession();
    if (!sess && typeof window !== "undefined") {
      try {
        const raw =
          window.localStorage.getItem("quickpress.session.rider") ||
          window.sessionStorage.getItem("quickpress.session.rider");
        if (raw) sess = JSON.parse(raw);
      } catch {}
    }

    let targetRoute = "/auth";
    if (sess && sess.token) {
      if (!isRiderOnboarded(sess)) {
        targetRoute = "/registration";
      } else if (!isRiderApproved(sess)) {
        targetRoute = "/verification";
      } else {
        targetRoute = "/dashboard";
      }
    } else {
      const hasSelectedLanguage =
        typeof window !== "undefined" && window.localStorage.getItem("qp_has_selected_language");
      if (!hasSelectedLanguage) {
        targetRoute = "/language";
      }
    }

    // Preload target route bundle immediately for zero-lag transition
    try {
      router.preloadRoute({ to: targetRoute as any });
    } catch {}

    // Ultra-snappy Zomato-style splash display (280ms)
    const timer = setTimeout(() => {
      if (cancelled) return;
      navigate({ to: targetRoute as any, replace: true });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigate, router]);

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center bg-white select-none overflow-hidden z-50">
      <div
        className="flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1)" : "scale(0.96)",
        }}
      >
        <img
          src={captainLogo}
          alt="QuickPress Captain"
          className="w-56 sm:w-64 max-w-[70vw] h-auto object-contain select-none pointer-events-none drop-shadow-2xs"
          loading="eager"
          decoding="async"
        />
      </div>
    </main>
  );
}
