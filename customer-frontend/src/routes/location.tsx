import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Compass, MapPin, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { LocationDetecting } from "@/components/LocationDetecting";
import { detectDeviceLocation, GeoError, saveLocation } from "@/api/customer/location";

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
 * There is no fake coordinate fallback: when GPS fails the customer gets
 * "Retry" or "Choose location manually".
 */
function LocationScreen() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const detect = useCallback(async () => {
    setError(null);
    try {
      // 1. Ask real native device notification permission right after login
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            const { requestPushNotificationPermission } = await import("@/api/core/firebase-messaging");
            void requestPushNotificationPermission();
          }
        } catch {
          // ignore error if user dismisses native dialog
        }
      }

      // 2. Ask real native device GPS location permission
      const location = await detectDeviceLocation();
      // Current device location only — the saved default address is untouched.
      saveLocation(location);
      void navigate({ to: "/home" });
    } catch (cause) {
      setError(
        cause instanceof GeoError
          ? cause.message
          : "We couldn't detect your location right now.",
      );
    }
  }, [navigate]);

  useEffect(() => {
    void detect();
  }, [detect, attempt]);

  if (!error) return <LocationDetecting label="Fetching your location…" />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
          <MapPin className="size-7 text-muted-foreground" aria-hidden />
        </span>
        <h1 className="mt-5 text-[1.35rem] font-black tracking-tight text-foreground">
          Location not detected
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{error}</p>

        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="mt-6 flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-black text-primary-foreground shadow-cta active:scale-[0.985]"
        >
          <RefreshCw className="size-[18px]" aria-hidden />
          Retry
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
          onClick={() => void navigate({ to: "/home" })}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground hover:text-foreground"
        >
          <Compass className="size-4" aria-hidden />
          Skip for now
        </button>
      </div>
    </main>
  );
}
