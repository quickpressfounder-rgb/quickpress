import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickPress Captain — Starting Up" },
      {
        name: "description",
        content: "QuickPress Captain — Delivery Partner App with Zero Commission",
      },
    ],
  }),
  component: RiderSplashScreen,
});

function RiderSplashScreen() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Check rider session after smooth 850ms visual splash
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (typeof window === "undefined") return;

      let sess: any = readSession("rider") || readSession();
      if (!sess) {
        try {
          const raw =
            window.localStorage.getItem("quickpress.session.rider") ||
            window.sessionStorage.getItem("quickpress.session.rider");
          if (raw) sess = JSON.parse(raw);
        } catch {}
      }

      if (sess && sess.token) {
        if (!isRiderOnboarded(sess)) {
          navigate({ to: "/registration", replace: true });
        } else if (!isRiderApproved(sess)) {
          navigate({ to: "/verification", replace: true });
        } else {
          navigate({ to: "/dashboard", replace: true });
        }
      } else {
        navigate({ to: "/auth", replace: true });
      }
    }, 850);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white px-6 select-none font-sans text-zinc-950">
      {/* Background Subtle Ambient Aura */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Brand & Tagline Stage */}
      <div
        className="relative flex flex-col items-center text-center transition-all duration-700 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.96)",
        }}
      >
        {/* Brand Name Only (Logo Removed per User Request) */}
        <h1 className="splash-reveal relative text-5xl sm:text-6xl font-black tracking-[-0.04em] leading-none select-none text-zinc-950 flex items-center justify-center">
          <span>Quick</span>
          <span className="text-amber-500 ml-0.5">Press</span>
        </h1>

        {/* Small Font "Captain" Sub-Brand Badge (User Request) */}
        <div className="splash-badge-reveal mt-3.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-950 text-amber-400 border border-zinc-800 shadow-md">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs sm:text-[13px] font-black tracking-[0.22em] uppercase">
            Captain
          </span>
        </div>

        {/* Catchy Inspiring Tagline (User Request) */}
        <div className="splash-tagline-reveal mt-5 flex flex-col items-center space-y-2 max-w-xs">
          <p className="text-sm sm:text-base font-bold text-zinc-800 tracking-tight">
            Ride With Pride · Deliver With Speed
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-800">
            <span className="size-1 rounded-full bg-emerald-600" />
            <span>0% Commission · Instant Daily Settlements</span>
          </div>
        </div>

        {/* Minimal Smooth Glowing Loading Bar */}
        <div className="splash-tagline-reveal mt-8 h-1.5 w-32 overflow-hidden rounded-full bg-zinc-100 border border-zinc-200/80 shadow-2xs">
          <div className="splash-bar-sweep h-full w-1/2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 rounded-full" />
        </div>
      </div>

      {/* Bottom Sub-Tagline */}
      <p
        className="absolute bottom-10 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-400 transition-opacity duration-700"
        style={{ opacity: visible ? 1 : 0 }}
      >
        India's #1 On-Demand Garment Care Fleet 🇮🇳
      </p>
    </main>
  );
}

