import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Compass, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { LocationDetecting } from "@/components/LocationDetecting";
import {
  detectAndVerifyLiveLocation,
} from "@/api/customer/services/location-verifier";

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
  const [progressState, setProgressState] = useState({
    label: "Detecting your location…",
    sublabel: "Finding verified laundry partners near you",
    statusBadge: "Live GPS Triangulation",
  });

  const detect = useCallback(async () => {
    setError(null);
    setIsLocating(true);

    try {
      const res = await detectAndVerifyLiveLocation({
        onProgress: setProgressState,
        timeoutMs: 3500,
      });

      setIsLocating(false);

      if (!res.success || !res.location) {
        setError(
          res.error ||
            "Unable to detect your exact GPS location. Please ensure location services are turned on."
        );
        return;
      }

      if (res.available) {
        const target = (search?.redirect as any) || "/home";
        void navigate({ to: target, replace: true });
      } else {
        void navigate({
          to: "/services-unavailable" as any,
          search: {
            area: res.location.area || "",
            city: res.location.city || "",
            state: res.location.state || "",
            lat: res.location.latitude ? String(res.location.latitude) : undefined,
            lng: res.location.longitude ? String(res.location.longitude) : undefined,
          } as any,
          replace: true,
        });
      }
    } catch {
      setIsLocating(false);
      setError(
        "Unable to detect your exact GPS location. Please ensure location services are turned on."
      );
    }
  }, [navigate, search?.redirect]);

  useEffect(() => {
    void detect();
  }, [detect, attempt]);

  if (isLocating) {
    return (
      <LocationDetecting
        label={progressState.label}
        sublabel={progressState.sublabel}
        statusBadge={progressState.statusBadge}
      />
    );
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

