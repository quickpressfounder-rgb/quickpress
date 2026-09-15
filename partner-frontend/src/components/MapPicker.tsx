/**
 * `<MapPicker />` — Google Maps Shop Location Picker for Partner Onboarding.
 *
 * Real-time map picker with:
 *   • Google Roadmap tiles with movable center marker & click-to-pin
 *   • Interactive lifting pin animation while dragging
 *   • Real-time Places autocomplete search (area, street, locality, landmark, pincode)
 *   • Browser GPS "Current Location" button with permission handling
 *   • Zoom In / Zoom Out controls
 *   • Real-time reverse geocoding to extract shop address, city, area, and pincode
 *   • Elevated, unblocked Confirm Location CTA button
 *   • Portaled directly to document.body with z-[99999] so nothing overlaps it
 */

import {
  ArrowLeft,
  Check,
  Compass,
  Crosshair,
  Loader2,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { GoogleMapView } from "@/shared/ui/google-map";
import {
  autocompletePlaces,
  fetchPlaceDetails,
  geocodeAddress,
  reverseGeocodeCoords,
  type GeocodeResult,
  type PlaceSuggestion,
} from "@/api/core/maps-api";
import { getCurrentDeviceLocation, GeoError } from "@/api/partner/location";

export type PickedLocation = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
};

const DEFAULT_COORDS = { latitude: 27.8118, longitude: 78.6477 }; // Kasganj / UP center fallback

export function MapPicker({
  initial,
  title = "Select Shop Location",
  onConfirm,
  onClose,
}: {
  initial?: { latitude: number; longitude: number } | undefined;
  title?: string;
  onConfirm: (picked: PickedLocation) => void;
  onClose: () => void;
}) {
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(
    initial ?? null,
  );
  const [zoomLevel, setZoomLevel] = useState(16);
  const [details, setDetails] = useState<GeocodeResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Debounced reverse geocoding whenever the selected point changes
  useEffect(() => {
    if (!point) return;
    let alive = true;

    if (reverseTimeoutRef.current) clearTimeout(reverseTimeoutRef.current);

    setResolving(true);
    setError(null);

    reverseTimeoutRef.current = setTimeout(() => {
      void reverseGeocodeCoords(point.latitude, point.longitude)
        .then((result) => {
          if (alive) {
            setDetails(result);
          }
        })
        .catch(() => {
          if (alive) {
            setDetails({
              formattedAddress: `Shop Location (${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)})`,
              placeId: `pin_${point.latitude}_${point.longitude}`,
              latitude: point.latitude,
              longitude: point.longitude,
              area: "Selected Shop Location",
              city: "",
              state: "",
              pincode: "",
              country: "India",
            });
          }
        })
        .finally(() => {
          if (alive) setResolving(false);
        });
    }, 250);

    return () => {
      alive = false;
      if (reverseTimeoutRef.current) clearTimeout(reverseTimeoutRef.current);
    };
  }, [point?.latitude, point?.longitude]);

  // Current GPS device detection
  const useCurrentLocation = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    setError(null);
    try {
      const fix = await getCurrentDeviceLocation({ timeoutMs: 10000, enableHighAccuracy: true });
      setPoint({ latitude: fix.latitude, longitude: fix.longitude });
      setZoomLevel(17);
    } catch (cause) {
      setError(
        cause instanceof GeoError
          ? cause.message
          : "Unable to detect GPS position. You can search or tap on the map.",
      );
      if (!point) {
        setPoint(DEFAULT_COORDS);
      }
    } finally {
      setLocating(false);
    }
  }, [locating, point]);

  // Initial load: GPS detection if no starting coordinates
  useEffect(() => {
    if (!initial) {
      void useCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time debounced places search
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val.trim() || val.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await autocompletePlaces(val.trim(), point ?? undefined);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setIsSearchFocused(false);
    setSearchQuery(suggestion.primaryText || suggestion.description);
    setSuggestions([]);
    setResolving(true);
    setError(null);

    try {
      if (suggestion.placeId) {
        const place = await fetchPlaceDetails(suggestion.placeId);
        if (place.latitude && place.longitude) {
          setPoint({ latitude: place.latitude, longitude: place.longitude });
          setZoomLevel(17);
          setDetails({
            formattedAddress: place.formattedAddress,
            placeId: place.placeId,
            latitude: place.latitude,
            longitude: place.longitude,
            area: place.area || place.city,
            city: place.city,
            state: place.state,
            pincode: place.pincode,
            country: "India",
          });
          return;
        }
      }

      const geo = await geocodeAddress(suggestion.description || suggestion.primaryText);
      if (geo.latitude && geo.longitude) {
        setPoint({ latitude: geo.latitude, longitude: geo.longitude });
        setZoomLevel(17);
        setDetails(geo);
      }
    } catch {
      setError("Couldn't jump to this place. You can drop a pin on the map.");
    } finally {
      setResolving(false);
    }
  };

  const handleCenterChange = (next: { latitude: number; longitude: number }) => {
    setPoint(next);
    setIsDragging(true);
    if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragging(false);
    }, 350);
  };

  const handleConfirm = () => {
    if (!point) return;
    const formatted =
      details?.formattedAddress ||
      [details?.area, details?.city, details?.state, details?.pincode].filter(Boolean).join(", ") ||
      `Selected Location (${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)})`;

    onConfirm({
      latitude: point.latitude,
      longitude: point.longitude,
      formattedAddress: formatted,
      area: details?.area || details?.city || "Selected Area",
      city: details?.city || "",
      state: details?.state || "",
      pincode: details?.pincode || "",
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-background select-none overflow-hidden animate-fade-in">
      {/* 1. Header Bar */}
      <header className="relative z-30 flex items-center justify-between border-b border-border/80 bg-card/95 px-4 py-3 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-2xl bg-muted/80 text-foreground transition-all active:scale-90 hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-base font-black tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-[11px] font-medium text-muted-foreground">
              Drag map or search to place pin accurately
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground transition-all active:scale-90 hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>

      {/* 2. Floating Search Bar & Dropdown */}
      <div className="relative z-30 px-4 pt-3 pb-2">
        <div className="relative">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3.5 flex items-center text-muted-foreground">
              {searching ? (
                <Loader2 className="size-4 animate-spin text-emerald-600" />
              ) : (
                <Search className="size-4" />
              )}
            </span>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search area, landmark, market, street..."
              className="h-12 w-full rounded-2xl border border-border bg-card/95 pl-10 pr-10 text-sm font-semibold text-foreground shadow-md outline-none transition-all placeholder:text-muted-foreground/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 backdrop-blur-md"
            />

            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                }}
                className="absolute right-3.5 flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Autocomplete suggestions dropdown */}
          {suggestions.length > 0 && isSearchFocused ? (
            <div className="absolute left-0 right-0 top-14 z-40 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-2xl animate-pop">
              {suggestions.map((item) => (
                <button
                  key={item.placeId}
                  type="button"
                  onClick={() => void handleSelectSuggestion(item)}
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-accent active:bg-accent/80"
                >
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600">
                    <MapPin className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">
                      {item.primaryText || item.description}
                    </p>
                    {item.secondaryText ? (
                      <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                        {item.secondaryText}
                      </p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* 3. Map Viewport */}
      <div className="relative flex-1 overflow-hidden">
        <GoogleMapView
          className="size-full h-full"
          center={point ?? DEFAULT_COORDS}
          zoom={zoomLevel}
          interactive={true}
          preferLeaflet={true}
          onPick={(next) => setPoint(next)}
          onCenterChange={handleCenterChange}
          fallback={
            <div className="flex size-full flex-col items-center justify-center gap-3 bg-muted/40 px-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-3xl bg-emerald-600/10 text-emerald-600 animate-pulse">
                <Compass className="size-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Interactive Map Ready</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Tap anywhere on the map or use your current location to pin your shop.
                </p>
              </div>
            </div>
          }
        />

        {/* Center Animated Delivery Pin */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
          <div
            className={`flex flex-col items-center transition-all duration-200 ease-out ${
              isDragging ? "-translate-y-9 scale-110" : "-translate-y-5 scale-100"
            }`}
          >
            {/* Pin Head */}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-white shadow-2xl border-2 border-white ring-4 ring-emerald-600/20">
              <MapPin className="size-4 fill-white" />
              <span className="text-[11px] font-black tracking-tight uppercase">
                {isDragging ? "Moving..." : "Shop Location"}
              </span>
            </div>
            {/* Pointer Stem */}
            <div className="h-2 w-0.5 bg-emerald-600" />
            {/* Ground Target Dot & Shadow */}
            <div
              className={`rounded-full transition-all duration-200 ${
                isDragging
                  ? "size-2.5 bg-black/20 blur-[2px] mt-2 scale-75"
                  : "size-3 bg-black/40 blur-[1px] mt-0.5 scale-100"
              }`}
            />
          </div>
        </div>

        {/* Floating Controls (GPS & Zoom) */}
        <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-2.5">
          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 1, 19))}
            aria-label="Zoom In"
            className="flex size-11 items-center justify-center rounded-2xl bg-card text-foreground shadow-lg border border-border/80 transition-all hover:bg-accent active:scale-90"
          >
            <Plus className="size-5" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 1, 10))}
            aria-label="Zoom Out"
            className="flex size-11 items-center justify-center rounded-2xl bg-card text-foreground shadow-lg border border-border/80 transition-all hover:bg-accent active:scale-90"
          >
            <Minus className="size-5" />
          </button>

          {/* GPS Current Location */}
          <button
            type="button"
            onClick={() => void useCurrentLocation()}
            disabled={locating}
            aria-label="Use Current Location"
            className="flex size-12 items-center justify-center rounded-2xl bg-card text-emerald-600 shadow-xl border border-border/80 transition-all hover:bg-accent active:scale-90 disabled:opacity-75"
          >
            {locating ? (
              <Loader2 className="size-5 animate-spin text-emerald-600" />
            ) : (
              <Crosshair className="size-5 text-emerald-600" />
            )}
          </button>
        </div>
      </div>

      {/* 4. Bottom Location Card & Confirm Button */}
      <footer className="relative z-30 rounded-t-[28px] border-t border-border bg-card/98 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom)+0.5rem)] shadow-2xl backdrop-blur-2xl">
        {/* Drag handle decoration */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />

        {error ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            <X className="size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-600 mt-0.5">
            <Navigation className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Selected Shop Location
              </span>
              {resolving ? (
                <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Loader2 className="size-2.5 animate-spin" /> Detecting address…
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                  <Check className="size-2.5 stroke-[3]" /> PINNED
                </span>
              )}
            </div>

            <h3 className="truncate text-base font-black text-foreground mt-0.5">
              {resolving
                ? "Locating address details…"
                : details?.area || details?.city || details?.formattedAddress || "Selected Shop Location"}
            </h3>

            <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {details
                ? [details.area, details.city, details.state, details.pincode].filter(Boolean).join(", ") ||
                  details.formattedAddress
                : point
                  ? `Lat: ${point.latitude.toFixed(5)}, Lng: ${point.longitude.toFixed(5)}`
                  : "Tap map or search to choose"}
            </p>
          </div>
        </div>

        {/* Confirm Location CTA Button */}
        <button
          type="button"
          disabled={!point || resolving}
          onClick={handleConfirm}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 text-base font-extrabold text-white shadow-lg shadow-emerald-600/30 transition-all duration-200 active:scale-[0.98] hover:bg-emerald-500 disabled:opacity-50 disabled:shadow-none cursor-pointer"
        >
          {resolving ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Check className="size-5 stroke-[2.5]" />
          )}
          <span>{resolving ? "Locating Address…" : "Confirm Shop Location"}</span>
        </button>
      </footer>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
