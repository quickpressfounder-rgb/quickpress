import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { readSession } from "../api/core/session-store";
import { restorePartnerSession } from "../api/partner/partner-auth-api";
import { partnerRoutes } from "../navigation/partner-routes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickPress Partner — Starting up" },
      {
        name: "description",
        content: "QuickPress Partner Console: managing your laundry orders, capacity and daily earnings.",
      },
      { property: "og:title", content: "QuickPress Partner — Starting up" },
      {
        property: "og:description",
        content: "QuickPress Partner Console: managing your laundry orders, capacity and daily earnings.",
      },
    ],
  }),
  component: PartnerSplashScreen,
});

async function initializePartnerApp(): Promise<{
  loggedIn: boolean;
  isOnboarded: boolean;
  isVerified: boolean;
  isSuspended: boolean;
}> {
  // Check internet
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    await new Promise((resolve) => {
      window.addEventListener("online", resolve, { once: true });
    });
  }

  try {
    const restored = await restorePartnerSession();
    if (restored && (restored.phone || (restored as any).partnerId)) {
      const isSuspended = (restored as any).status === "suspended" || (restored as any).isSuspended === true;
      const isOnboarded = Boolean(restored.isOnboarded ?? (restored as any).account?.isOnboarded);
      const isVerified = Boolean(
        restored.isVerified ??
        (restored as any).account?.isVerified ??
        (restored as any).status === "active"
      );
      return {
        loggedIn: true,
        isOnboarded,
        isVerified,
        isSuspended,
      };
    }
  } catch {
    // Session restore failed
  }

  return { loggedIn: false, isOnboarded: false, isVerified: false, isSuspended: false };
}

function PartnerSplashScreen() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      initializePartnerApp(),
      // Smooth visual splash hold duration (350ms)
      new Promise((resolve) => setTimeout(resolve, 350)),
    ]).then(([{ loggedIn, isOnboarded, isVerified, isSuspended }]) => {
      if (cancelled) return;
      if (loggedIn) {
        if (isSuspended) {
          navigate({ to: partnerRoutes.suspended });
        } else if (!isOnboarded) {
          navigate({ to: partnerRoutes.registration });
        } else if (!isVerified) {
          navigate({ to: partnerRoutes.registrationSubmitted });
        } else {
          navigate({ to: partnerRoutes.dashboard });
        }
      } else {
        navigate({ to: partnerRoutes.auth });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white px-6 text-[#111827] select-none font-sans">
      <div
        className="relative flex flex-col items-center transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {/* Wordmark + Partner Badge */}
        <div className="splash-mark relative flex flex-col items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-[3rem] font-black leading-none tracking-[-0.05em] sm:text-[3.75rem] text-[#111827]">
              <span>Quick</span>
              <span className="text-primary">Press</span>
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-black tracking-widest text-primary uppercase shadow-sm border border-primary/20">
              PARTNER
            </span>
          </div>

          <span className="splash-rise relative mt-3 block h-[3px] w-28 overflow-hidden rounded-full bg-primary/20">
            <span className="brand-sweep absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
          </span>

          <p className="splash-rise mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            Laundry <span className="text-primary">·</span> Pickup{" "}
            <span className="text-primary">·</span> Delivery
          </p>

          {/* Animated progressive loading bar */}
          <span className="splash-rise mt-8 block h-1.5 w-32 overflow-hidden rounded-full bg-zinc-200/80 border border-zinc-300/60 shadow-inner">
            <span className="splash-bar block h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-sky-400" />
          </span>
        </div>
      </div>

      {/* Footer Tagline */}
      <p
        className="absolute bottom-10 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-400 transition-opacity delay-300 duration-700"
        style={{ opacity: visible ? 1 : 0 }}
      >
        Powering your laundry business
      </p>
    </main>
  );
}
