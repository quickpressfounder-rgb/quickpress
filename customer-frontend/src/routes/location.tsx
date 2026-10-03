import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass, MapPin, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { LocationDetecting } from "@/components/LocationDetecting";
import {
  detectDeviceLocation,
  getDefaultLocation,
  GeoError,
  readLocation,
  saveLocation,
} from "@/api/customer/location";

export const Route = createFileRoute("/location")({
  head: () => ({
    meta: [
      { title: "Detecting Your Location — QuickPress" },
      {
        name: "description",
        content:
          "QuickPress is finding your exact pickup location using your device GPS so we can show laundry partners near you.",
      },
      { property: "og:title", content: "Detecting Your Location — QuickPress" },
      {
        property: "og:description",
        content: "Real-time GPS detection for accurate QuickPress laundry pickup and delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LocationScreen,
});

/**
 * Post-login location flow.
 *
 *   LOGIN → this animation → real GPS → reverse geocoding → HOME
 *
 * If device GPS is slow or permission is not granted, gracefully falls back
 * to the operational service hub (Kasganj) so the customer is never blocked.
 */
function LocationScreen() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const proceedWithDefault = useCallback(() => {
    saveLocation(getDefaultLocation());
    void navigate({ to: "/home" });
  }, [navigate]);

  const detect = useCallback(async () => {
    setError(null);
    setCountdown(null);

    // Fast check: if valid location is already saved, proceed directly to home
    const existing = readLocation();
    if (existing && existing.city && existing.latitude && existing.city !== "Detected via GPS") {
      void navigate({ to: "/home" });
      return;
    }

    try {
      // 1. Request native device notification permission in background without blocking GPS
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        try {
          Notification.requestPermission()
            .then((perm) => {
              if (perm === "granted") {
                void import("@/api/core/firebase-messaging").then((m) => {
                  void m.requestPushNotificationPermission();
                });
              }
            })
            .catch(() => {});
        } catch {
          // ignore error if browser restricts invocation
        }
      }

      // 2. Ask native device GPS location permission (2-phase: GPS -> Network fallback)
      const location = await detectDeviceLocation(false);
      saveLocation(location);
      void navigate({ to: "/home" });
    } catch (cause) {
      // Prime default operational location in storage
      saveLocation(getDefaultLocation());

      const msg =
        cause instanceof GeoError
          ? cause.message
          : "We couldn't detect your exact GPS location right now.";
      setError(msg);
      // Auto-proceed after 4 seconds if user doesn't interact
      setCountdown(4);
    }
  }, [navigate]);

  useEffect(() => {
    void detect();
  }, [detect, attempt]);

  // Countdown timer to automatically proceed to /home
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      proceedWithDefault();
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, proceedWithDefault]);

  if (!error) return <LocationDetecting label="Fetching your location…" />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <MapPin className="size-8" aria-hidden />
        </span>
        <h1 className="mt-5 text-[1.35rem] font-black tracking-tight text-foreground">
          GPS Signal Weak
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{error}</p>
        <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          Using default service hub: Kasganj (Awas Vikas)
          {countdown !== null && countdown > 0 ? ` (Auto-entering in ${countdown}s)` : ""}
        </p>

        {/* Primary CTA: Enter with Kasganj */}
        <button
          type="button"
          onClick={proceedWithDefault}
          className="mt-6 flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-[15px] font-black text-white shadow-cta active:scale-[0.985] hover:bg-emerald-700"
        >
          <span>Continue with Kasganj</span>
          <ArrowRight className="size-[18px]" aria-hidden />
        </button>

        <button
          type="button"
          onClick={() => void navigate({ to: "/location-search" })}
          className="mt-3 flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card text-[15px] font-bold text-foreground active:scale-[0.985]"
        >
          <Search className="size-[18px]" aria-hidden />
          Choose location manually
        </button>

        <button
          type="button"
          onClick={() => {
            setCountdown(null);
            setAttempt((value) => value + 1);
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Retry GPS detection
        </button>
      </div>
    </main>
  );
}
