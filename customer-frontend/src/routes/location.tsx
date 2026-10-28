import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Compass, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { LocationDetecting } from "@/components/LocationDetecting";
import {
  detectDeviceLocation,
  GeoError,
  saveLocation,
} from "@/api/customer/location";

type LocationSearchParams = {
  redirect?: string;
};

export const Route = createFileRoute("/location")({
  validateSearch: (search: Record<string, unknown>): LocationSearchParams => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
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
 * Fast Location Detection Screen:
 *   1. Displays the animated radar concentric pulsing rings and bobbing pin.
 *   2. Dual-tier GPS lock (<500ms cached/cell fix) with IP fallback.
 *   3. As soon as location is detected and saved, navigates immediately to /home.
 *   4. If GPS is off or denied, allows 1-tap retry or continuing to home.
 */
function LocationScreen() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const detect = useCallback(async () => {
    setError(null);
    setIsLocating(true);
    const startTimestamp = Date.now();

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

      // 2. Fetch real device GPS coordinates & reverse geocode (<500ms fast lock)
      const location = await detectDeviceLocation({ timeoutMs: 3200, allowFallback: true });
      saveLocation(location);

      // 3. Smooth animation display duration (at least 800ms for smooth visual feel)
      const elapsed = Date.now() - startTimestamp;
      if (elapsed < 800) {
        await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
      }

      setIsLocating(false);

      // 4. Immediately transition to home (or redirected destination)
      const target = (search?.redirect as any) || "/home";
      void navigate({ to: target, replace: true });
    } catch (cause) {
      setIsLocating(false);
      const msg =
        cause instanceof GeoError
          ? cause.message
          : "Unable to detect your exact GPS location. Please ensure location services are turned on.";
      setError(msg);
    }
  }, [navigate, search?.redirect]);

  useEffect(() => {
    void detect();
  }, [detect, attempt]);

  if (isLocating) {
    return <LocationDetecting label="Detecting your location…" />;
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

        {/* Secondary CTA: Continue to Home */}
        <button
          type="button"
          onClick={() => void navigate({ to: (search?.redirect as any) || "/home", replace: true })}
          className="mt-3 flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card text-[15px] font-bold text-foreground active:scale-[0.985] hover:bg-muted"
        >
          <span>Continue to Home</span>
        </button>
      </div>
    </main>
  );
}

