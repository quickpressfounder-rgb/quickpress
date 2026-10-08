import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass, MapPin, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { LocationDetecting } from "@/components/LocationDetecting";
import {
  detectDeviceLocation,
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
 * Location screen:
 *
 *   1. Requests real device GPS coordinates.
 *   2. Reverse geocodes to user's real area and city.
 *   3. If GPS is weak or pending permission, keeps the user in control with
 *      active retry and manual search options — NO automatic redirect or forced default.
 */
function LocationScreen() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const detect = useCallback(async () => {
    setError(null);
    setIsLocating(true);

    try {
      // 1. Request native notification permission in background without blocking GPS
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

      // 2. Fetch real device GPS coordinates & reverse geocode
      const location = await detectDeviceLocation(false);
      saveLocation(location);
      setIsLocating(false);
      void navigate({ to: "/home" });
    } catch (cause) {
      setIsLocating(false);
      const msg =
        cause instanceof GeoError
          ? cause.message
          : "Unable to detect your exact GPS location. Please ensure location services are turned on.";
      setError(msg);
      // NOTE: We do NOT auto-proceed or auto-save default location here.
      // The user stays in control to retry GPS or choose location manually.
    }
  }, [navigate]);

  useEffect(() => {
    void detect();
  }, [detect, attempt]);

  if (isLocating) {
    return <LocationDetecting label="Detecting your real GPS location…" />;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
          <MapPin className="size-8" aria-hidden />
        </span>
        <h1 className="mt-5 text-[1.35rem] font-black tracking-tight text-foreground">
          {error?.toLowerCase().includes("permission")
            ? "Location Permission Needed"
            : "Detect Your Current Location"}
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {error || "Turn on device location so QuickPress can show verified laundry partners near you."}
        </p>

        {/* Primary CTA: Retry / Detect real GPS location */}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAttempt((v) => v + 1);
          }}
          className="mt-6 flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-[15px] font-black text-white shadow-cta active:scale-[0.985] hover:bg-emerald-700"
        >
          <Compass className="size-[18px]" aria-hidden />
          <span>Detect Current Location</span>
        </button>

        {/* Secondary CTA: Search or select location manually */}
        <button
          type="button"
          onClick={() => void navigate({ to: "/location-search" })}
          className="mt-3 flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card text-[15px] font-bold text-foreground active:scale-[0.985] hover:bg-muted"
        >
          <Search className="size-[18px]" aria-hidden />
          <span>Choose location manually</span>
        </button>
      </div>
    </main>
  );
}
