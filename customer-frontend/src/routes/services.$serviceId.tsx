import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart, Search, Store, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  fetchSavedServices,
  toggleSavedService,
} from "@/api/customer/favourites-api";
import { FloatingCartBar } from "@/components/cart/FloatingCartBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ServicesUnavailableView } from "@/components/common/ServicesUnavailableView";
import { PartnerCard } from "@/components/service/PartnerCard";
import { ServiceFilters } from "@/components/service/ServiceFilters";
import { ServiceListingSkeleton } from "@/components/service/ServiceListingSkeleton";
import {
  DEFAULT_LISTING_FILTERS,
  applyListingFilters,
  fetchServiceListing,
  toListingQuery,
  type ListingFilters,
  type ServiceListingData,
} from "@/api/customer/service-listing-api";
import { readSavedLocation } from "@/api/customer/services/location-service";

import washFoldImg from "@/shared/assets/item-wash-fold.jpg";
import dryCleanImg from "@/shared/assets/item-dry-clean.jpg";
import steamIronImg from "@/shared/assets/item-steam-iron.jpg";
import premiumImg from "@/shared/assets/item-premium.jpg";
import shoesImg from "@/shared/assets/item-shoes.jpg";
import curtainImg from "@/shared/assets/item-curtain.jpg";
import blanketImg from "@/shared/assets/item-blanket.jpg";
import carpetImg from "@/shared/assets/item-carpet.jpg";
import expressImg from "@/shared/assets/item-express.jpg";

function resolveCategoryServiceImage(title?: string | null, img?: string | null): string {
  if (img && (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:") || img.startsWith("/uploads/"))) {
    return img;
  }
  const t = (title || "").toLowerCase();
  if (t.includes("wash") || t.includes("fold") || t.includes("laundry") && !t.includes("premium") && !t.includes("express")) {
    if (!t.includes("express") && !t.includes("premium")) return washFoldImg;
  }
  if (t.includes("dry") || t.includes("clean") && !t.includes("shoe") && !t.includes("curtain") && !t.includes("carpet") && !t.includes("blanket")) {
    if (!t.includes("shoe") && !t.includes("curtain") && !t.includes("carpet") && !t.includes("blanket")) return dryCleanImg;
  }
  if (t.includes("steam") || t.includes("iron")) return steamIronImg;
  if (t.includes("premium") || t.includes("saree")) return premiumImg;
  if (t.includes("shoe") || t.includes("sneaker")) return shoesImg;
  if (t.includes("curtain")) return curtainImg;
  if (t.includes("blanket") || t.includes("quilt")) return blanketImg;
  if (t.includes("carpet") || t.includes("rug")) return carpetImg;
  if (t.includes("express")) return expressImg;
  if (img && (img.startsWith("/") || img.startsWith("http") || img.startsWith("data:"))) return img;
  return washFoldImg;
}

import {
  readScopedCache,
  readStaleScopedCache,
} from "@/api/customer/api/cache";

export const Route = createFileRoute("/services/$serviceId")({
  head: () => ({
    meta: [
      { title: "Nearby Laundry Partners — QuickPress Service Listing" },
      {
        name: "description",
        content:
          "Compare nearby QuickPress laundry partners for this service — ratings, pickup and delivery times, offers and starting prices, with sorting and filters.",
      },
      { property: "og:title", content: "Nearby Laundry Partners — QuickPress" },
      {
        property: "og:description",
        content:
          "Sort and filter nearby QuickPress laundry partners by rating, price, distance and delivery speed.",
      },
    ],
  }),
  component: ServiceListingScreen,
});

function ServiceListingScreen() {
  const navigate = useNavigate();
  const { serviceId } = Route.useParams();
  const activeLocation = readSavedLocation();
  const [data, setData] = useState<ServiceListingData | null>(() => {
    return readStaleScopedCache<ServiceListingData>("partner-list", `${serviceId}:initial`);
  });
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ListingFilters>({ ...DEFAULT_LISTING_FILTERS });
  const [query, setQuery] = useState("");
  /** Debounced copy of `query` — what actually reaches GET /api/partners. */
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const firstLoad = useRef(true);

  // Live search debounce: 300 ms after the user stops typing.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const listingQuery = useMemo(
    () => toListingQuery(filters, debouncedQuery, activeLocation?.city),
    [filters, debouncedQuery, activeLocation?.city],
  );

  const load = useCallback(
    (signal?: AbortSignal) => {
      setError(null);
      if (!data && firstLoad.current) setData(null);
      else setRefreshing(true);

      // GET /api/services/{id} + GET /api/partners?<filters>
      return fetchServiceListing(serviceId, listingQuery, { signal })
        .then((result) => {
          if (signal?.aborted) return;
          setData(result.data);
          setOffline(result.fromCache);
        })
        .catch(() => {
          if (signal?.aborted) return;
          setError("We couldn't load partners for this service.");
        })
        .finally(() => {
          if (signal?.aborted) return;
          firstLoad.current = false;
          setRefreshing(false);
        });
    },
    [serviceId, listingQuery],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * The backend already filtered and sorted the response; re-running the pure
   * pipeline keeps the list correct while a request is still in flight.
   */
  const partners = useMemo(
    () => (data ? applyListingFilters(data.partners, filters) : []),
    [data, filters],
  );


  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSavedServices()
      .then((list) => {
        const found = list.some((s) => s.serviceId === serviceId || s.id === serviceId);
        setSaved(found);
      })
      .catch(() => undefined);
  }, [serviceId]);

  const handleToggleSaved = async () => {
    const next = !saved;
    setSaved(next);
    try {
      const res = await toggleSavedService(serviceId);
      setSaved(res.isSaved);
      toast.success(res.isSaved ? "Saved to favourite services ❤️" : "Removed from saved services");
    } catch {
      setSaved(!next);
      toast.error("Couldn't update saved service");
    }
  };

  const openPartner = useCallback(
    (partnerId: string) => navigate({ to: "/partner/$partnerId", params: { partnerId }, search: { highlightService: undefined } }),
    [navigate],
  );

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950 pb-32">
      <div className="relative mx-auto w-full max-w-md">
        <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
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
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-bold leading-tight tracking-tight text-foreground">
              {data?.service.title ?? "Laundry partners"}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {data ? `Starting at ₹${data.service.startingPrice}` : "Loading nearby stores…"}
            </p>
          </div>
          <button
            type="button"
            aria-label={saved ? "Remove from saved services" : "Save service to favourites"}
            aria-pressed={saved}
            onClick={() => void handleToggleSaved()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted transition-all duration-300 hover:bg-accent active:scale-[0.9]"
          >
            <Heart
              className={`size-5 transition-all duration-300 ${
                saved ? "scale-110 fill-current text-destructive" : "text-foreground"
              }`}
            />
          </button>
        </header>

        <div className="px-5">
          {offline ? (
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-[11px] text-muted-foreground">
              <WifiOff className="size-3.5 shrink-0" />
              You&apos;re offline — showing the last saved partner list.
            </div>
          ) : null}

          {!data && !error ? (
            <ServiceListingSkeleton />
          ) : error ? (
            <EmptyState
              icon={Store}
              title="Couldn't load partners"
              description={error}
              actionLabel="Try again"
              onAction={() => void load()}
            />
          ) : data ? (
            <>
              <section className="card-soft animate-pop overflow-hidden border border-border">
                <div className="flex gap-3 p-3.5">
                  <img
                    src={resolveCategoryServiceImage(data.service.title, data.service.image)}
                    alt={data.service.title}
                    width={320}
                    height={320}
                    className="size-20 shrink-0 rounded-2xl object-cover bg-muted"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{data.service.title}</p>
                    <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                      {data.service.description}
                    </p>
                  </div>
                </div>
              </section>

              <label className="mt-4 flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-3.5">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search stores, services or city"
                  className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                />
              </label>

              <ServiceFilters filters={filters} onChange={setFilters} resultCount={partners.length} />

              {refreshing ? (
                <p className="pb-2 text-[11px] text-muted-foreground">Updating results…</p>
              ) : null}

              {data.partners.length === 0 ? (
                <ServicesUnavailableView
                  location={activeLocation}
                  onRetry={() => void load()}
                  isRetrying={refreshing}
                />
              ) : partners.length === 0 ? (
                <EmptyState
                  icon={Store}
                  title="No partners match these filters"
                  description="Try clearing a filter or widening the distance to see more nearby stores."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setFilters({ ...DEFAULT_LISTING_FILTERS });
                    setQuery("");
                  }}
                />
              ) : (
                <div className="stagger-children space-y-4 pb-4">
                  {partners.map((partner) => (
                    <PartnerCard key={partner.id} partner={partner} onOpen={openPartner} />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      <FloatingCartBar />
    </main>
  );
}
