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

  const hasLinkedStore = Boolean(sess.account?.linkedId || sess.partnerId);
  const explicitPending =
    sess.status === "pending_verification" ||
    sess.account?.status === "pending_verification" ||
    (sess as any).kycStatus === "pending";

  const isVerified = Boolean(
    (sess.isVerified ?? sess.account?.isVerified) ||
      sess.status === "active" ||
      sess.status === "approved" ||
      sess.account?.status === "active" ||
      sess.account?.status === "approved" ||
      sess.kycStatus === "verified" ||
      sess.account?.kycStatus === "verified" ||
      (hasLinkedStore && !explicitPending)
  );

  const isOnboarded = Boolean(
    (sess.isOnboarded ?? sess.account?.isOnboarded) ||
    isVerified ||
    hasLinkedStore
  );
  if (!isOnboarded) return partnerRoutes.registration;
  if (!isVerified) return partnerRoutes.registrationSubmitted;

  return partnerRoutes.orders;
}

function PartnerSplashScreen() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

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

    // Splash screen open to close display duration (1.5 seconds)
    const fadeTimer = setTimeout(() => {
      if (!cancelled) setClosing(true);
    }, 1200);

    Promise.all([
      restorePartnerSession().catch(() => sess),
      new Promise((res) => setTimeout(res, 1500)),
    ]).then(([restored]) => {
      if (cancelled) return;
      const finalTarget = computeTargetRoute(restored || sess);
      navigate({ to: finalTarget as any, replace: true });
    });

    return () => {
      cancelled = true;
      clearTimeout(fadeTimer);
    };
  }, [navigate, router]);

  return (
    <main
      className="fixed inset-0 flex flex-col items-center justify-center bg-[#0055ff] select-none overflow-hidden z-50 transition-opacity duration-300 ease-out"
      style={{
        opacity: closing ? 0 : 1,
      }}
    >
      <div
        className="flex flex-col items-center justify-center transition-all duration-500 ease-out px-4 text-center"
        style={{
          opacity: mounted && !closing ? 1 : 0,
          transform: mounted && !closing ? "scale(1)" : "scale(0.96)",
        }}
      >
        {/* QuickPress Brand Name matching Image 2 */}
        <div className="flex items-center gap-0.5 justify-center">
          <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white drop-shadow-md font-sans select-none">
            Quick
          </span>
          <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#10b981] drop-shadow-md font-sans select-none">
            Press
          </span>
        </div>

        {/* Clean Partner Subtitle with Divider Lines */}
        <div className="flex items-center gap-2.5 mt-3 sm:mt-4">
          <span className="h-[2px] w-6 bg-[#10b981]" />
          <p className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-white/95 select-none">
            PARTNER ONBOARDING
          </p>
          <span className="h-[2px] w-6 bg-[#10b981]" />
        </div>
      </div>
    </main>
  );
}
