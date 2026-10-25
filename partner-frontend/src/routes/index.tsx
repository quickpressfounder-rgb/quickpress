import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { readSession } from "../api/core/session-store";
import { restorePartnerSession } from "../api/partner/partner-auth-api";
import { partnerRoutes } from "../navigation/partner-routes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickPress Partner" },
      {
        name: "description",
        content: "QuickPress Partner — Laundry & Garment Care Business Console",
      },
      { name: "theme-color", content: "#0055ff" },
    ],
  }),
  component: PartnerSplashScreen,
});

function computeTargetRoute(sess: any): string {
  if (!sess || (!sess.token && !sess.phone && !sess.partnerId && !sess.account?.id)) {
    return partnerRoutes.auth;
  }
  const isSuspended =
    sess.status === "suspended" || sess.isSuspended === true;
  if (isSuspended) return partnerRoutes.suspended;

  const isVerified = Boolean(
    (sess.isVerified ?? sess.account?.isVerified) ||
      sess.status === "active" ||
      sess.status === "approved" ||
      sess.account?.status === "active" ||
      sess.account?.status === "approved" ||
      sess.kycStatus === "verified" ||
      sess.account?.kycStatus === "verified"
  );

  const hasLinkedStore = Boolean(sess.account?.linkedId || sess.partnerId);
  const isOnboarded = Boolean(
    (sess.isOnboarded ?? sess.account?.isOnboarded) ||
    isVerified ||
    hasLinkedStore
  );
  if (!isOnboarded) return partnerRoutes.registration;
  if (!isVerified) return partnerRoutes.registrationSubmitted;

  return partnerRoutes.dashboard;
}

function PartnerSplashScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    // Fast synchronous session check
    let sess: any = readSession("partner") || readSession();
    if (!sess && typeof window !== "undefined") {
      try {
        const raw =
          window.localStorage.getItem("quickpress.session.partner") ||
          window.sessionStorage.getItem("quickpress.session.partner") ||
          window.localStorage.getItem("quickpress.session") ||
          window.sessionStorage.getItem("quickpress.session");
        if (raw) sess = JSON.parse(raw);
      } catch {}
    }

    const initialTarget = computeTargetRoute(sess);

    // Preload target route bundle immediately for zero-lag transition
    try {
      router.preloadRoute({ to: initialTarget as any });
    } catch {}

    // Ultra-snappy Zomato-style splash display (300ms) with background session restore
    Promise.all([
      restorePartnerSession().catch(() => sess),
      new Promise((res) => setTimeout(res, 300)),
    ]).then(([restored]) => {
      if (cancelled) return;
      const finalTarget = computeTargetRoute(restored || sess);
      navigate({ to: finalTarget as any, replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [navigate, router]);

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center bg-[#0055ff] select-none overflow-hidden z-50">
      <div
        className="flex flex-col items-center justify-center transition-all duration-300 ease-out px-4 text-center"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1)" : "scale(0.96)",
        }}
      >
        {/* QuickPress Wordmark in White and Emerald */}
        <div className="flex items-baseline tracking-tight select-none">
          <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white drop-shadow-sm font-sans">
            Quick
          </span>
          <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-emerald-400 drop-shadow-sm font-sans">
            Press
          </span>
        </div>

        {/* Partner Onboarding Subtitle matching official logo */}
        <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2.5 sm:gap-3.5 select-none">
          <span className="h-[2px] w-6 sm:w-10 bg-emerald-400 rounded-full" />
          <span className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-white">
            PARTNER ONBOARDING
          </span>
          <span className="h-[2px] w-6 sm:w-10 bg-emerald-400 rounded-full" />
        </div>
      </div>
    </main>
  );
}
