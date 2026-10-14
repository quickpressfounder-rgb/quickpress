import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  Compass,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { fetchPlaceGroups, type PlaceGroups } from "@/api/customer/locations-api";
import {
  detectDeviceLocation,
  saveLocation,
  type SavedLocation,
} from "@/api/customer/location";
import {
  autocompletePlaces,
  fetchPlaceDetails,
  type PlaceSuggestion,
} from "@/api/core/maps-api";
import { requestNotificationPermission } from "@/lib/permissions";
import { checkLocationAvailability } from "@/api/customer/services/partner-service";
import { fetchAddresses, type SavedAddress } from "@/api/customer/addresses-api";

type LocationSearchParams = {
  redirect?: string;
  from?: string;
};

export const Route = createFileRoute("/location-search")({
  validateSearch: (search: Record<string, unknown>): LocationSearchParams => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    from: typeof search.from === "string" ? search.from : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Choose Your Location — QuickPress" },
      {
        name: "description",
        content:
          "Search your area, street or landmark to set your QuickPress pickup location, or use your current GPS location.",
      },
      { property: "og:title", content: "Choose Your Location — QuickPress" },
      {
        property: "og:description",
        content: "Search your area, street or landmark to set your QuickPress pickup location.",
      },
    ],
  }),
  component: LocationSearchScreen,
});

type Place = SavedLocation & { id: string };

const EMPTY_GROUPS: PlaceGroups = { recent: [], saved: [], nearby: [], popular: [] };

const KASGANJ_HUB: Place = {
  id: "hub:kasganj-central",
  area: "Kasganj Central",
  city: "Kasganj",
  state: "Uttar Pradesh",
  latitude: 27.8083,
  longitude: 78.6453,
};

function LocationSearchScreen() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const redirectTarget = searchParams.redirect;
  const isFromLogin = searchParams.from === "login";

  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<PlaceGroups>(EMPTY_GROUPS);
  const [userAddresses, setUserAddresses] = useState<SavedAddress[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingLabel, setCheckingLabel] = useState<string | null>(null);
  const [remote, setRemote] = useState<PlaceSuggestion[]>([]);

  // GET /api/locations
  useEffect(() => {
    let alive = true;
    void fetchPlaceGroups().then((next) => {
      if (alive) setGroups(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Fetch logged in customer's saved addresses
  useEffect(() => {
    let alive = true;
    void fetchAddresses()
      .then((addrs) => {
        if (alive && Array.isArray(addrs)) {
          setUserAddresses(addrs);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const { recent, saved, nearby, popular } = groups;
  const allPlaces = useMemo(
    () => [...recent, ...saved, ...nearby, ...popular],
    [recent, saved, nearby, popular],
  );

  const localMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return allPlaces.filter((place) =>
      `${place.area} ${place.city} ${place.state}`.toLowerCase().includes(term),
    );
  }, [query, allPlaces]);

  // Google Places autocomplete via the backend proxy, debounced.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setRemote([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void autocompletePlaces(term, undefined, controller.signal)
        .then(setRemote)
        .catch(() => setRemote([]));
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const suggestions: Place[] = useMemo(() => {
    const fromGoogle = remote.map((item) => ({
      id: `place:${item.placeId}`,
      area: item.primaryText || item.description,
      city: item.secondaryText,
      state: "",
    }));
    const seen = new Set(fromGoogle.map((item) => `${item.area}|${item.city}`));
    return [...fromGoogle, ...localMatches.filter((p) => !seen.has(`${p.area}|${p.city}`))];
  }, [remote, localMatches]);

  /** Google suggestions are resolved to coordinates before being selected. */
  const handleSelect = (place: Place) => {
    setSelected(place);
    if (!place.id.startsWith("place:")) return;
    void fetchPlaceDetails(place.id.slice("place:".length))
      .then((details) =>
        setSelected({
          id: place.id,
          area: details.area || details.name || place.area,
          city: details.city || place.city,
          state: details.state ?? "",
          latitude: details.latitude,
          longitude: details.longitude,
        }),
      )
      .catch(() => undefined);
  };

  /**
   * Process and verify location availability.
   * If available -> redirect to /home (or target).
   * If unavailable -> redirect to /services-unavailable.
   */
  const processLocationSelection = async (location: SavedLocation) => {
    setSaving(true);
    setCheckingLabel(`Checking laundry partners in ${location.area || location.city || "your area"}…`);
    saveLocation(location);

    try {
      const avail = await checkLocationAvailability(location);
      if (avail && avail.available) {
        toast.success(`Services available in ${location.area || location.city || "your area"}!`);
        void navigate({ to: (redirectTarget as any) || "/home" });
      } else {
        void navigate({
          to: "/services-unavailable" as any,
          search: {
            area: location.area || "",
            city: location.city || "",
            state: location.state || "",
            lat: location.latitude ? String(location.latitude) : undefined,
            lng: location.longitude ? String(location.longitude) : undefined,
          } as any,
        });
      }
    } catch {
      // Fallback on network timeout
      void navigate({ to: (redirectTarget as any) || "/home" });
    } finally {
      setSaving(false);
      setCheckingLabel(null);
    }
  };

  const useCurrentLocation = async () => {
    if (locating || saving) return;
    setLocating(true);
    void requestNotificationPermission();
    try {
      const loc = await detectDeviceLocation({ timeoutMs: 3200 });
      setLocating(false);
      await processLocationSelection(loc);
    } catch {
      toast.error("Could not detect device GPS. Please search and select your location above.");
      setLocating(false);
    }
  };

  const confirm = async () => {
    if (!selected || saving) return;
    await processLocationSelection(selected);
  };

  const handleSelectSavedAddress = async (addr: SavedAddress) => {
    const loc: SavedLocation = {
      area: addr.area || addr.street || addr.building,
      city: addr.city,
      state: addr.state,
      latitude: addr.latitude,
      longitude: addr.longitude,
    };
    setSelected({ ...loc, id: `address:${addr.id}` });
    await processLocationSelection(loc);
  };

  const handleSelectKasganjHub = async () => {
    setSelected(KASGANJ_HUB);
    await processLocationSelection(KASGANJ_HUB);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-32 pt-8">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                void navigate({ to: "/home" });
              }
            }}
            className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.95]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-black leading-tight tracking-tight text-foreground">
              Choose Your Location
            </h1>
            {isFromLogin ? (
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Set pickup location to explore active laundry partners
              </p>
            ) : null}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-5">
          <div className="card-soft flex items-center gap-2 border border-border p-1.5 focus-within:ring-2 focus-within:ring-emerald-500/40">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Search className="size-4" />
            </span>
            <input
              type="text"
              autoFocus={!isFromLogin}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your area, colony, street or landmark…"
              className="min-w-0 flex-1 bg-transparent pr-2 text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        {query.trim() ? (
          <Section title="Search results" icon={Search}>
            {suggestions.length ? (
              suggestions.map((place, index) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  index={index}
                  selected={selected?.id === place.id}
                  onSelect={handleSelect}
                />
              ))
            ) : (
              <p className="px-1 py-3 text-sm text-muted-foreground">
                No matching area found. Try a different street or landmark.
              </p>
            )}
          </Section>
        ) : (
          <>
            {/* Primary GPS Auto-detect Button */}
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating || saving}
              className="card-soft mt-5 flex w-full items-center gap-4 border border-emerald-500/30 bg-emerald-500/5 p-4 text-left transition-all duration-300 hover:border-emerald-500 active:scale-[0.985] disabled:opacity-60"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                {locating ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Navigation className="size-5" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-foreground">
                  Use My Current Location
                </span>
                <span className="block text-xs font-medium text-muted-foreground">
                  {locating ? "Locking GPS coordinates…" : "Detect real location for exact laundry pickup"}
                </span>
              </span>
              <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </button>

            {/* QuickPress Active Hubs */}
            <div className="mt-5 rounded-2xl border border-border bg-gradient-to-r from-emerald-500/10 to-teal-500/5 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-600 text-white">
                    <Sparkles className="size-3" />
                  </span>
                  <span className="text-xs font-black text-foreground">
                    Operational Hubs (All Services Active)
                  </span>
                </div>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                  Live
                </span>
              </div>
              <button
                type="button"
                onClick={handleSelectKasganjHub}
                disabled={saving}
                className="mt-2.5 flex w-full items-center justify-between rounded-xl bg-card p-3 border border-border shadow-xs hover:border-emerald-500 transition-all text-left"
              >
                <div>
                  <p className="text-xs font-extrabold text-foreground">Kasganj Central Hub</p>
                  <p className="text-[11px] text-muted-foreground">Wash & Fold · Dry Clean · Steam Iron · Express</p>
                </div>
                <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
                  Select <ArrowRight className="size-3" />
                </span>
              </button>
            </div>

            {/* User Saved Addresses */}
            {userAddresses.length > 0 ? (
              <Section title="My Saved Addresses" icon={Home}>
                {userAddresses.map((addr) => {
                  const isSelected = selected?.id === `address:${addr.id}`;
                  const Icon = addr.type === "work" ? Briefcase : addr.type === "home" ? Home : MapPin;
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectSavedAddress(addr)}
                      disabled={saving}
                      className={`card-soft flex w-full items-center gap-3.5 border p-3.5 text-left transition-all duration-300 active:scale-[0.985] ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                          : "border-border hover:border-emerald-500/50"
                      }`}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground capitalize">
                            {addr.label || addr.type}
                          </span>
                          {addr.isDefault ? (
                            <span className="rounded-full bg-muted px-2 py-0.2 text-[9px] font-bold text-muted-foreground">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[addr.houseNumber, addr.building, addr.street, addr.area, addr.city]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      {isSelected ? (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                          <Check className="size-3.5" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </Section>
            ) : null}

            {recent.length > 0 ? (
              <Section title="Recent locations" icon={Clock}>
                {recent.map((place, index) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    index={index}
                    selected={selected?.id === place.id}
                    onSelect={handleSelect}
                  />
                ))}
              </Section>
            ) : null}

            {saved.length > 0 && userAddresses.length === 0 ? (
              <Section title="Saved areas" icon={Home}>
                {saved.map((place, index) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    index={index}
                    selected={selected?.id === place.id}
                    onSelect={handleSelect}
                  />
                ))}
              </Section>
            ) : null}

            {nearby.length > 0 ? (
              <Section title="Nearby suggestions" icon={Compass}>
                {nearby.map((place, index) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    index={index}
                    selected={selected?.id === place.id}
                    onSelect={handleSelect}
                  />
                ))}
              </Section>
            ) : null}

            {popular.length > 0 ? (
              <Section title="Popular locations" icon={Star}>
                {popular.map((place, index) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    index={index}
                    selected={selected?.id === place.id}
                    onSelect={handleSelect}
                  />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </div>

      {/* Floating Continue CTA */}
      <div className="glass-panel fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto w-full max-w-md px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={confirm}
            disabled={!selected || saving}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-zinc-950 dark:bg-white text-base font-bold text-white dark:text-zinc-950 shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            {saving ? <Loader2 className="size-5 animate-spin" /> : null}
            <span>{checkingLabel || "Confirm Location & View Services"}</span>
            {saving ? null : <ArrowRight className="size-5" />}
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="mt-2.5 space-y-2">{children}</div>
    </section>
  );
}

function PlaceCard({
  place,
  index,
  selected,
  onSelect,
}: {
  place: Place;
  index: number;
  selected: boolean;
  onSelect: (place: Place) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(place)}
      className={`card-soft flex w-full items-center gap-4 border p-3.5 text-left transition-all duration-300 active:scale-[0.985] ${
        selected
          ? "border-emerald-600 bg-emerald-500/10 ring-2 ring-emerald-500/30"
          : "border-border hover:border-emerald-500/60"
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
          selected ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
        }`}
      >
        <MapPin className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-foreground">{place.area}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {place.city}
          {place.state ? `, ${place.state}` : ""}
        </span>
      </span>
      {selected ? (
        <span className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="size-3.5" />
        </span>
      ) : null}
    </button>
  );
}