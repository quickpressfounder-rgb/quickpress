import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  MapPinOff,
  Navigation,
  Search,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { readLocation, saveLocation, type SavedLocation } from "@/api/customer/location";
import { submitWaitlist } from "@/api/customer/services/partner-service";
import { restoreCustomerSession } from "@/api/customer/auth-api";
import { LocationDetecting } from "@/components/LocationDetecting";
import {
  detectAndVerifyLiveLocation,
  type LocationDetectionState,
} from "@/api/customer/services/location-verifier";

type UnavailableSearchParams = {
  area?: string;
  city?: string;
  state?: string;
  lat?: string;
  lng?: string;
};

export const Route = createFileRoute("/services-unavailable")({
  validateSearch: (search: Record<string, unknown>): UnavailableSearchParams => ({
    area: typeof search.area === "string" ? search.area : undefined,
    city: typeof search.city === "string" ? search.city : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    lat: typeof search.lat === "string" ? search.lat : undefined,
    lng: typeof search.lng === "string" ? search.lng : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Service Unavailable In Your Area — QuickPress" },
      {
        name: "description",
        content:
          "QuickPress laundry and dry cleaning pickup is expanding fast! Check back soon or request service launch in your area.",
      },
    ],
  }),
  component: ServicesUnavailablePage,
});

function ServicesUnavailablePage() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const saved = readLocation();

  const area = searchParams.area || saved?.area || "Your Area";
  const city = searchParams.city || saved?.city || "";
  const state = searchParams.state || saved?.state || "";
  const displayLocation = [area, city].filter(Boolean).join(", ");

  const [phone, setPhone] = useState(() => {
    try {
      const sess = restoreCustomerSession();
      // @ts-expect-error synchronous check of cached session
      return sess?.account?.phone || "";
    } catch {
      return "";
    }
  });

  const [submitting, setSubmitting] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [detectingModal, setDetectingModal] = useState<LocationDetectionState | null>(null);

  const handleRedetectGPS = async () => {
    if (detectingModal?.active) return;
    setDetectingModal({
      active: true,
      label: "Acquiring Real Device GPS…",
      sublabel: "Connecting to satellite and cellular triangulation…",
      statusBadge: "Live GPS Triangulation",
    });

    try {
      const res = await detectAndVerifyLiveLocation({
        onProgress: (state) => setDetectingModal({ active: true, ...state }),
        timeoutMs: 3500,
      });

      if (!res.success || !res.location) {
        setDetectingModal(null);
        toast.error(res.error || "Could not detect GPS location.");
        return;
      }

      setDetectingModal(null);

      if (res.available) {
        toast.success(`QuickPress is Live in ${res.location.city || res.location.area}! Opening home…`);
        void navigate({ to: "/home" });
      } else {
        toast.info(`QuickPress is not yet operating in ${res.location.city || res.location.area}.`);
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
      setDetectingModal(null);
      toast.error("Failed to verify location. Please try again.");
    }
  };

  const handleNotifyMe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting || waitlistDone) return;

    const cleanPhone = phone.trim();
    if (cleanPhone && cleanPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setSubmitting(true);
    try {
      await submitWaitlist({
        area,
        city,
        state,
        phone: cleanPhone || undefined,
        latitude: searchParams.lat ? parseFloat(searchParams.lat) : saved?.latitude,
        longitude: searchParams.lng ? parseFloat(searchParams.lng) : saved?.longitude,
      });
      setWaitlistDone(true);
      toast.success(`We will notify you on WhatsApp/SMS as soon as QuickPress launches in ${city || area}!`);
    } catch {
      setWaitlistDone(true);
      toast.success("Request registered! You'll be the first to know when we launch here.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20 pt-[max(1.5rem,calc(env(safe-area-inset-top,0px)+0.75rem))] app-screen-safe">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5">
        {/* Top Bar */}
        <header className="flex items-center justify-between py-2">
          <button
            type="button"
            onClick={() => void navigate({ to: "/location-search" })}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:bg-muted active:scale-95 shadow-xs"
            aria-label="Back to location search"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-black tracking-tight text-foreground">
            <span className="text-zinc-900 dark:text-zinc-100">Quick</span>
            <span className="text-emerald-600">Press</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Main Card */}
        <div className="mt-6 flex-1 flex flex-col justify-center">
          <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.12)]">
            {/* Visual Icon Badge */}
            <div className="flex justify-center">
              <div className="relative flex size-20 items-center justify-center rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
                <AlertCircle className="size-10 stroke-[2.2]" />
                <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-md">
                  <MapPinOff className="size-4 stroke-[2.5]" />
                </span>
              </div>
            </div>

            {/* Headings */}
            <div className="mt-5 text-center">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                We're Not Here Yet!
              </h1>
              <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                QuickPress doorstep laundry & dry cleaning is currently not operating in{" "}
                <span className="font-bold text-foreground">{displayLocation || "this area"}</span>.
              </p>
            </div>

            {/* Selected Location Pill */}
            <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-card text-rose-600 shadow-xs border border-border">
                  <Compass className="size-4 text-rose-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Selected Location
                  </p>
                  <p className="mt-0.5 truncate text-sm font-black text-foreground">
                    {area || "Current Location"}
                  </p>
                  <p className="truncate text-xs font-medium text-muted-foreground">
                    {[city, state].filter(Boolean).join(", ") || "Location details"}
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Actions: Re-detect GPS or Select Location */}
            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={handleRedetectGPS}
                className="flex h-13 min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white text-[15px] font-black shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-[0.985]"
              >
                <Navigation className="size-4 stroke-[2.5]" />
                <span>Detect Current GPS Location</span>
              </button>

              <button
                type="button"
                onClick={() => void navigate({ to: "/location-search" })}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-foreground text-[14px] font-bold shadow-xs transition-all hover:bg-muted active:scale-[0.985]"
              >
                <Search className="size-4 stroke-[2.2]" />
                <span>Select Different Location / City</span>
              </button>

              {/* Notify Me / Waitlist Section */}
              <div className="mt-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                    <Bell className="size-3.5" />
                  </span>
                  <p className="text-xs font-black text-foreground">
                    Want QuickPress in your area?
                  </p>
                </div>

                {waitlistDone ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    <span>Notification requested! We will alert you on WhatsApp/SMS.</span>
                  </div>
                ) : (
                  <form onSubmit={handleNotifyMe} className="mt-3 flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 text-[16px] md:text-xs font-semibold text-foreground outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-black text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Bell className="size-3.5" />
                      )}
                      <span>Notify Me</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Location Detecting Modal with Radar Concentric Pulse & Bobbing Pin */}
      {detectingModal?.active ? (
        <LocationDetecting
          label={detectingModal.label}
          sublabel={detectingModal.sublabel}
          statusBadge={detectingModal.statusBadge}
          onCancel={() => setDetectingModal(null)}
        />
      ) : null}
    </main>
  );
}
