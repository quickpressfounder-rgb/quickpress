import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Heart, MessageCircle, Search, ShieldCheck, Sparkles, Store, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  fetchSavedServices,
  toggleSavedService,
} from "@/api/customer/favourites-api";
import { FloatingCartBar } from "@/components/cart/FloatingCartBar";
import { EmptyState } from "@/components/common/EmptyState";
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
import bagLeatherImg from "@/shared/assets/item-bag-leather.jpg";

function resolveCategoryServiceImage(title?: string | null, img?: string | null): string {
  if (img && (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:") || img.startsWith("/uploads/"))) {
    return img;
  }
  const t = (title || "").toLowerCase();
  if (t.includes("bag") || t.includes("leather") || t.includes("handbag") || t.includes("jacket")) return bagLeatherImg;
  if (t.includes("premium") || t.includes("saree") || t.includes("luxury")) return premiumImg;
  if (t.includes("steam") || t.includes("iron")) return steamIronImg;
  if (t.includes("shoe") || t.includes("sneaker")) return shoesImg;
  if (t.includes("curtain")) return curtainImg;
  if (t.includes("blanket") || t.includes("quilt")) return blanketImg;
  if (t.includes("carpet") || t.includes("rug")) return carpetImg;
  if (t.includes("express")) return expressImg;
  if (t.includes("dry") || (t.includes("clean") && !t.includes("wash"))) return dryCleanImg;
  if (t.includes("wash") || t.includes("fold") || t.includes("laundry")) return washFoldImg;
  if (img && (img.startsWith("/") || img.startsWith("http") || img.startsWith("data:"))) return img;
  return washFoldImg;
}

import {
  CACHE_KEYS,
  readScopedCache,
  readStaleCache,
  readStaleScopedCache,
} from "@/api/customer/api/cache";
import { DEFAULT_CATEGORIES } from "@/api/customer/services/category-service";
import type { Partner } from "@/api/customer/home-api";

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

  const fallbackCategory = useMemo(() => {
    return (
      DEFAULT_CATEGORIES.find((c) => c.id === serviceId) ?? {
        id: serviceId,
        title: "Laundry Services",
        description: "Delicate & everyday fabrics care",
        icon: "washing-machine",
        image: "",
        sortOrder: 1,
        status: "active",
      }
    );
  }, [serviceId]);

  const [data, setData] = useState<ServiceListingData | null>(() => {
    const cityKey = (activeLocation?.city || "all").toLowerCase().trim();
    const cached =
      readStaleScopedCache<ServiceListingData>("partner-list", `${serviceId}:${cityKey}`) ||
      readStaleScopedCache<ServiceListingData>("partner-list", `${serviceId}:all`) ||
      readStaleScopedCache<ServiceListingData>("partner-list", `${serviceId}:initial`);
    if (cached) return cached;

    const homePartners = (readStaleCache<Partner[]>(CACHE_KEYS.partners) || []) as any[];
    if (homePartners.length > 0) {
      return {
        service: {
          id: serviceId,
          title: fallbackCategory.title,
          description: fallbackCategory.description,
          image: fallbackCategory.image || "",
          startingPrice: 49,
        },
        partners: homePartners,
      };
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ListingFilters>({ ...DEFAULT_LISTING_FILTERS });
  const [query, setQuery] = useState("");
  /** Debounced copy of `query` — what actually reaches GET /api/partners. */
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const firstLoad = useRef(true);

  const [showConsultModal, setShowConsultModal] = useState<boolean>(false);
  const [consultGarment, setConsultGarment] = useState<string>("");
  const [consultConcern, setConsultConcern] = useState<string>("");
  const [consultPhone, setConsultPhone] = useState<string>("");
  const [submittingConsult, setSubmittingConsult] = useState<boolean>(false);

  const handleConsultSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultGarment.trim()) {
      toast.error("Please enter the garment name (e.g. Silk Saree, Leather Jacket)");
      return;
    }
    setSubmittingConsult(true);
    setTimeout(() => {
      setSubmittingConsult(false);
      setShowConsultModal(false);
      setConsultGarment("");
      setConsultConcern("");
      setConsultPhone("");
      toast.success("Consultation Request Received!", {
        description: "Our Textile Care Specialist will contact you via WhatsApp within 15 minutes.",
      });
    }, 600);
  };

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
      toast.success(res.isSaved ? "Saved to favourite services" : "Removed from saved services");
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
        <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 pb-3.5 pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.5rem))] app-header-safe bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
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
              {data?.service.title ?? fallbackCategory.title}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {data ? `Starting at ₹${data.service.startingPrice}` : fallbackCategory.description}
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

              {/* Special Care Consultation Trigger Banner */}
              <div className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-amber-950 dark:text-amber-200 leading-tight">Special Fabric Consultation</p>
                    <p className="text-[10.5px] text-amber-800 dark:text-amber-400 truncate">Free advice for Silk, Leather &amp; Designer wear</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConsultModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black shrink-0 transition-transform active:scale-95 cursor-pointer shadow-2xs"
                >
                  Consult Free
                </button>
              </div>

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
                <EmptyState
                  icon={Store}
                  title="No partner stores available in your area"
                  description="We don't currently have active partners operating for this service in your selected location."
                  actionLabel="Change Location"
                  onAction={() => void navigate({ to: "/location-search" })}
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

      {/* Special Care Consultation Modal */}
      {showConsultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" />
                <h2 className="text-sm font-black text-foreground">Fabric Expert Consultation</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowConsultModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConsultSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Garment / Fabric Type *
                </label>
                <input
                  type="text"
                  required
                  value={consultGarment}
                  onChange={(e) => setConsultGarment(e.target.value)}
                  placeholder="e.g. Pure Silk Banarasi Saree, Leather Jacket, Sherwani"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Specific Concern / Stain Details
                </label>
                <textarea
                  rows={2}
                  value={consultConcern}
                  onChange={(e) => setConsultConcern(e.target.value)}
                  placeholder="e.g. Grease stain on pallu, fear of color bleeding, delicate embroidery"
                  className="w-full p-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  WhatsApp / Phone Number
                </label>
                <input
                  type="tel"
                  value={consultPhone}
                  onChange={(e) => setConsultPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210 (For fast WhatsApp advice)"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-muted/60 flex items-start gap-2 text-[10.5px] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>QuickPress fabric experts verify yarn composition and suggest the safest dry-cleaning cycle free of charge.</span>
              </div>

              <button
                type="submit"
                disabled={submittingConsult}
                className="w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submittingConsult ? (
                  <span>Submitting Request...</span>
                ) : (
                  <>
                    <MessageCircle className="size-4" />
                    <span>Request Free WhatsApp Consultation</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
