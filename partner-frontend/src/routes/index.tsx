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
      // Smooth visual splash hold duration (500ms)
      new Promise((resolve) => setTimeout(resolve, 500)),
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
        className="relative flex flex-col items-center transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {/* Transparent HD Partner Logo */}
        <div className="relative flex flex-col items-center">
          <img
            src="/quickpress-partner-logo.png"
            alt="QuickPress Partner Onboarding"
            className="h-20 sm:h-24 w-auto max-w-[320px] sm:max-w-[420px] object-contain drop-shadow-xs"
          />

          {/* Minimalist subtle progress indicator without jerky background animations */}
          <div className="mt-8 flex flex-col items-center gap-2.5">
            <div className="h-1 w-28 overflow-hidden rounded-full bg-zinc-100 border border-zinc-200/60">
              <div className="h-full w-2/3 rounded-full bg-emerald-600 transition-all duration-500" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Starting up...
            </span>
          </div>
        </div>
      </div>

      {/* Footer Tagline */}
      <p
        className="absolute bottom-10 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-400 transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0 }}
      >
        Powering your laundry business
      </p>
    </main>
  );
}
