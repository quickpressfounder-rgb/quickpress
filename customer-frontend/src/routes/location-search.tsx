import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Compass,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fetchPlaceGroups, type PlaceGroups } from "@/api/customer/locations-api";
import { reverseGeocode, saveLocation, type SavedLocation } from "@/api/customer/location";
import {
  autocompletePlaces,
  fetchPlaceDetails,
  type PlaceSuggestion,
} from "@/api/core/maps-api";

export const Route = createFileRoute("/location-search")({
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

function LocationSearchScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<PlaceGroups>(EMPTY_GROUPS);
  const [selected, setSelected] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
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



  const useCurrentLocation = () => {
    if (locating) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        saveLocation(
          await reverseGeocode(position.coords.latitude, position.coords.longitude),
        );
        setLocating(false);
        navigate({ to: "/home" });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const confirm = () => {
    if (!selected || saving) return;
    setSaving(true);
    saveLocation(selected);
    window.setTimeout(() => navigate({ to: "/home" }), 600);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-32 pt-12">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/home" });
              }
            }}
            className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.95]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">
            Choose Your Location
          </h1>
        </div>

        <div className="mt-6">
          <div className="card-soft flex items-center gap-2 border border-border p-1.5 focus-within:ring-2 focus-within:ring-ring/60">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Search className="size-4" />
            </span>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your area, street or landmark..."
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
            <button
              type="button"
              onClick={useCurrentLocation}
              className="card-soft mt-5 flex w-full items-center gap-4 border border-border p-4 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.985]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                {locating ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Navigation className="size-5" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-brand-green">
                  Use My Current Location
                </span>
                <span className="block text-xs text-muted-foreground">
                  {locating ? "Detecting your position…" : "Using GPS for precise pickup"}
                </span>
              </span>
              <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </button>

            {recent.length > 0 ? (
              <Section title="Recent locations" icon={Clock}>
                {recent.map((place, index) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    index={index}
                    selected={selected?.id === place.id}
                    onSelect={setSelected}
                  />
                ))}
              </Section>
            ) : null}

            {saved.length > 0 ? (
              <Section title="Saved address" icon={Home}>
                {saved.map((place, index) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    index={index}
                    selected={selected?.id === place.id}
                    onSelect={setSelected}
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
                    onSelect={setSelected}
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
                    onSelect={setSelected}
                  />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </div>

      <div className="glass-panel fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto w-full max-w-md px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={confirm}
            disabled={!selected || saving}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-primary text-base font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            {saving ? <Loader2 className="size-5 animate-spin" /> : null}
            Continue
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
    <section className="mt-7">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
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
      onClick={() => onSelect(place)} className={`card-soft flex w-full items-center gap-4 border p-4 text-left transition-all duration-300 active:scale-[0.985] ${
        selected
          ? "border-secondary bg-secondary/8 ring-2 ring-secondary/35"
          : "border-border hover:border-primary/60"
      }`}
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
          selected ? "bg-secondary/15 text-brand-green" : "bg-primary/15 text-brand-dark"
        }`}
      >
        <MapPin className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{place.area}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {place.city}
          {place.state ? `, ${place.state}` : ""}
        </span>
      </span>
      {selected ? (
        <span className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Check className="size-3.5" />
        </span>
      ) : null}
    </button>
  );
}