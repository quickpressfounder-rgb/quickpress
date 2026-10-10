import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  Compass,
  MapPin,
  MapPinOff,
  RefreshCw,
  Search,
} from "lucide-react";

import type { SavedLocation } from "@/api/customer/location";
import { changeLocation } from "@/api/customer/services/location-service";

export type ServicesUnavailableViewProps = {
  location?: SavedLocation | null;
  nearbyAreas?: string[];
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  onSelectArea?: (area: string) => void;
};

export function ServicesUnavailableView({
  location,
  nearbyAreas = [],
  onRetry,
  isRetrying = false,
  onSelectArea,
}: ServicesUnavailableViewProps) {
  const navigate = useNavigate();

  const hasLocation = Boolean(location?.city || location?.area);
  const displayArea = location?.area || "Current Location";
  const displayCity = location?.city || "";
  const displayState = location?.state || "";

  // Filter only valid non-empty live cities
  const liveAdminCities = Array.from(
    new Set((nearbyAreas || []).filter((c) => c && c.trim().length > 0)),
  );

  const handleChooseLiveCity = (cityName: string) => {
    if (onSelectArea) {
      onSelectArea(cityName);
    } else {
      const updated: SavedLocation = {
        area: cityName,
        city: cityName,
        state: "",
      };
      changeLocation(updated);
      if (onRetry) void onRetry();
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 md:max-w-lg md:py-12 animate-in fade-in duration-300">
      {/* Premium Error Card */}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        {/* Prominent Error / Alert Icon Badge */}
        <div className="flex items-center justify-center">
          <div className="relative flex size-18 items-center justify-center rounded-3xl bg-rose-50 border border-rose-200/80 text-rose-600 shadow-inner">
            <AlertCircle className="size-9 stroke-[2.3]" />
            <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs">
              <MapPinOff className="size-3.5 stroke-[2.5]" />
            </span>
          </div>
        </div>

        {/* Headings */}
        <div className="mt-5 text-center">
          <h2 className="text-xl font-black tracking-tight text-zinc-900 sm:text-2xl">
            Location Unavailable
          </h2>
          <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-500 sm:text-sm">
            QuickPress laundry services are currently not operating in your selected location.
          </p>
        </div>

        {/* Current Selected Location Card */}
        <div className="mt-6 rounded-2xl border border-zinc-200/80 bg-zinc-50/90 p-4 transition-all">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-2xs border border-zinc-100">
              <Compass className="size-4 text-rose-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Your Selected Location
              </p>
              {hasLocation ? (
                <>
                  <p className="mt-0.5 truncate text-sm font-black text-zinc-900">
                    {displayArea}
                  </p>
                  <p className="truncate text-xs font-medium text-zinc-500">
                    {[displayCity, displayState].filter(Boolean).join(", ")}
                  </p>
                </>
              ) : (
                <p className="mt-0.5 text-xs font-bold text-zinc-700">
                  Location details not specified
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Live Admin Operational Cities Only */}
        {liveAdminCities.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
                <Building2 className="size-3.5 stroke-[2.2]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                  Live Operational Cities
                </p>
                <p className="text-[11px] font-medium text-emerald-700">
                  Services are currently live in:
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {liveAdminCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleChooseLiveCity(city)}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-black text-emerald-900 shadow-2xs transition-all hover:bg-emerald-600 hover:text-white active:scale-95"
                >
                  <MapPin className="size-3 text-emerald-600" />
                  <span>{city}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Primary Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => void navigate({ to: "/location-search" })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-black text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98]"
          >
            <Search className="size-4 stroke-[2.5]" />
            <span>Select Different Location</span>
          </button>

          {onRetry ? (
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => void onRetry()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-xs font-bold text-zinc-800 transition-all hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isRetrying ? "animate-spin text-zinc-900" : ""}`} />
              <span>{isRetrying ? "Checking availability…" : "Try Again"}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
