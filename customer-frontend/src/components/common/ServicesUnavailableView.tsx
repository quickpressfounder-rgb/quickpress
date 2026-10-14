import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Compass,
  Loader2,
  MapPinOff,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { saveLocation, type SavedLocation } from "@/api/customer/location";
import { submitWaitlist } from "@/api/customer/services/partner-service";

export type ServicesUnavailableViewProps = {
  location?: SavedLocation | null;
  nearbyAreas?: string[];
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  onSelectArea?: (area: string) => void;
};

const KASGANJ_HUB: SavedLocation = {
  area: "Kasganj Central",
  city: "Kasganj",
  state: "Uttar Pradesh",
  latitude: 27.8083,
  longitude: 78.6453,
};

export function ServicesUnavailableView({
  location,
  onRetry,
  isRetrying = false,
  onSelectArea,
}: ServicesUnavailableViewProps) {
  const navigate = useNavigate();

  const hasLocation = Boolean(location?.city || location?.area);
  const displayArea = location?.area || "Current Location";
  const displayCity = location?.city || "";
  const displayState = location?.state || "";

  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);

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
        area: displayArea,
        city: displayCity,
        state: displayState,
        phone: cleanPhone || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      setWaitlistDone(true);
      toast.success(`We will notify you on WhatsApp/SMS as soon as QuickPress launches in ${displayCity || displayArea}!`);
    } catch {
      setWaitlistDone(true);
      toast.success("Request registered! You'll be the first to know when we launch here.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchToKasganj = () => {
    saveLocation(KASGANJ_HUB);
    if (onSelectArea) {
      onSelectArea("Kasganj Central");
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 md:max-w-lg md:py-12 animate-in fade-in duration-300">
      {/* Premium Error Card */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        {/* Prominent Error / Alert Icon Badge */}
        <div className="flex items-center justify-center">
          <div className="relative flex size-18 items-center justify-center rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-rose-600 shadow-inner">
            <AlertCircle className="size-9 stroke-[2.3]" />
            <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs">
              <MapPinOff className="size-3.5 stroke-[2.5]" />
            </span>
          </div>
        </div>

        {/* Headings */}
        <div className="mt-5 text-center">
          <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            Location Unavailable
          </h2>
          <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-sm">
            QuickPress laundry services are currently not operating in your selected location.
          </p>
        </div>

        {/* Current Selected Location Card */}
        <div className="mt-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-800/40 p-4 transition-all">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 text-rose-600 shadow-2xs border border-zinc-100 dark:border-zinc-700">
              <Compass className="size-4 text-rose-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Your Selected Location
              </p>
              {hasLocation ? (
                <>
                  <p className="mt-0.5 truncate text-sm font-black text-zinc-900 dark:text-zinc-100">
                    {displayArea}
                  </p>
                  <p className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {[displayCity, displayState].filter(Boolean).join(", ")}
                  </p>
                </>
              ) : (
                <p className="mt-0.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Location details not specified
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => void navigate({ to: "/location-search" })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 dark:bg-white px-5 text-sm font-black text-white dark:text-zinc-950 shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98]"
          >
            <Search className="size-4 stroke-[2.5]" />
            <span>Select Different Location</span>
          </button>

          {onRetry ? (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => void onRetry()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isRetrying ? "animate-spin text-zinc-900" : ""}`} />
              <span>{isRetrying ? "Checking availability…" : "Try Again"}</span>
            </button>
          ) : null}

          {/* Waitlist Lead Capture */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-left mt-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
                <Bell className="size-3" />
              </span>
              <p className="text-[11px] font-black text-foreground">
                Get notified when QuickPress launches here:
              </p>
            </div>

            {waitlistDone ? (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                <span>You're on the list! We will notify you via SMS/WhatsApp.</span>
              </div>
            ) : (
              <form onSubmit={handleNotifyMe} className="mt-2.5 flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-card px-2.5 text-xs font-semibold text-foreground outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[11px] font-black text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Bell className="size-3" />
                  )}
                  <span>Notify Me</span>
                </button>
              </form>
            )}
          </div>

          {/* Switch to Active Kasganj Hub */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleSwitchToKasganj}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-card px-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all hover:bg-emerald-500/10 active:scale-[0.985]"
            >
              <Sparkles className="size-3.5" />
              <span>Switch to Kasganj Hub (Explore Services)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
