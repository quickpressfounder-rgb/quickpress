import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, Sparkles } from "lucide-react";
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

    // Check rider session after smooth 650ms visual splash
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
    }, 650);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white px-6 select-none font-sans text-slate-950">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />

      <div
        className="relative flex flex-col items-center text-center transition-all duration-500 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.94)",
        }}
      >
        {/* Yellow Visual Brand Icon Container */}
        <div className="relative mb-5 flex size-20 sm:size-24 items-center justify-center rounded-3xl bg-amber-400 text-slate-950 shadow-xl shadow-amber-400/30">
          <Bike className="size-11 sm:size-13 stroke-[2.4]" />
          <span className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-slate-950 text-amber-400 border-2 border-white shadow-xs">
            <Sparkles className="size-3.5 fill-current" />
          </span>
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 flex items-center justify-center">
          <span>Quick</span>
          <span className="text-amber-500">Press</span>
        </h1>

        {/* Subtitle Badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-extrabold text-[11px] tracking-wider uppercase border border-slate-200/90 shadow-2xs">
          <span className="inline-block size-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Captain · Delivery Partner</span>
        </div>

        {/* Minimal Animated Loading Bar */}
        <div className="mt-8 w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
          <div className="h-full w-1/2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Bottom Tagline */}
      <p
        className="absolute bottom-10 text-[10.5px] font-bold uppercase tracking-[0.25em] text-slate-400 transition-opacity delay-200 duration-700"
        style={{ opacity: visible ? 1 : 0 }}
      >
        Fastest Hyperlocal Garment Care
      </p>
    </main>
  );
}

