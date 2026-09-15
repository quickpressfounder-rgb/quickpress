import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  Clock,
  Heart,
  Leaf,
  MapPin,
  Minus,
  Package,
  Plus,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  User,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { PartnerDetailSkeleton } from "@/components/partner/PartnerDetailSkeleton";
import { FloatingCartBar } from "@/components/cart/FloatingCartBar";
import { CartPopup } from "@/components/cart/CartPopup";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import {
  fetchFavouritePartners,
  toggleFavouritePartner,
} from "@/api/customer/favourites-api";
import {
  fetchPartnerDetail,
  invalidatePartnerDetail,
  postPartnerCart,
  type GalleryImage,
  type PartnerDetailData,
  type PartnerService,
} from "@/api/customer/partner-api";
import { readStaleScopedCache } from "@/api/customer/api/cache";
import { onRealtimeEvent } from "@/api/core/socket-client";

import store1 from "@/shared/assets/store-1.jpg";
import store2 from "@/shared/assets/store-2.jpg";
import store3 from "@/shared/assets/store-3.jpg";
import washFoldImg from "@/shared/assets/item-wash-fold.jpg";
import dryCleanImg from "@/shared/assets/item-dry-clean.jpg";
import steamIronImg from "@/shared/assets/item-steam-iron.jpg";
import premiumImg from "@/shared/assets/item-premium.jpg";
import shoesImg from "@/shared/assets/item-shoes.jpg";
import curtainImg from "@/shared/assets/item-curtain.jpg";
import blanketImg from "@/shared/assets/item-blanket.jpg";
import carpetImg from "@/shared/assets/item-carpet.jpg";
import expressImg from "@/shared/assets/item-express.jpg";

function resolvePartnerCover(cover?: string | null): string {
  if (!cover) return store1;
  if (cover.startsWith("http://") || cover.startsWith("https://") || cover.startsWith("data:") || cover.startsWith("/uploads/")) return cover;
  if (cover === "store-1" || cover.includes("store-1")) return store1;
  if (cover === "store-2" || cover.includes("store-2")) return store2;
  if (cover === "store-3" || cover.includes("store-3")) return store3;
  if (cover.startsWith("/")) return cover;
  return store1;
}

function resolvePartnerLogo(logo?: string | null): string {
  if (!logo) return store1;
  if (logo.startsWith("http://") || logo.startsWith("https://") || logo.startsWith("data:") || logo.startsWith("/uploads/")) return logo;
  if (logo === "store-1" || logo.includes("store-1")) return store1;
  if (logo === "store-2" || logo.includes("store-2")) return store2;
  if (logo === "store-3" || logo.includes("store-3")) return store3;
  if (logo.startsWith("/")) return logo;
  return store1;
}

function resolveServiceImage(title?: string | null, img?: string | null): string {
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

function getAvatarGradient(name?: string): string {
  const gradients = [
    "from-emerald-500 to-teal-600 text-white shadow-emerald-500/20",
    "from-blue-500 to-indigo-600 text-white shadow-blue-500/20",
    "from-purple-500 to-pink-600 text-white shadow-purple-500/20",
    "from-amber-500 to-orange-600 text-white shadow-amber-500/20",
    "from-rose-500 to-red-600 text-white shadow-rose-500/20",
    "from-cyan-500 to-blue-600 text-white shadow-cyan-500/20",
    "from-teal-500 to-emerald-600 text-white shadow-teal-500/20",
    "from-violet-500 to-indigo-600 text-white shadow-violet-500/20",
  ];
  let hash = 0;
  const str = (name || "Customer").trim();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length] || gradients[0]!;
}

function formatReviewTimeAgo(dateInput?: string | null): string {
  if (!dateInput) return "Just now";
  const trimmed = String(dateInput).trim();
  if (!trimmed || trimmed === "Recently") return "Just now";
  if (trimmed.toLowerCase().includes("ago") || trimmed.toLowerCase() === "just now") {
    return trimmed;
  }

  // Parse ISO date or YYYY-MM-DD
  const parsed = new Date(trimmed.includes("T") ? trimmed : `${trimmed}T12:00:00Z`);
  if (isNaN(parsed.getTime())) {
    return trimmed;
  }

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();

  if (diffMs < 45 * 1000) {
    return "Just now";
  }

  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 60) {
    return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

export const Route = createFileRoute("/partner/$partnerId")({
  validateSearch: (search: Record<string, unknown>): { highlightService?: string | undefined } => ({
    highlightService: typeof search["highlightService"] === "string" ? String(search["highlightService"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Partner Store — QuickPress Laundry Services & Pricing" },
      {
        name: "description",
        content:
          "Browse services, pricing, reviews and photos of your nearby QuickPress laundry partner. Add wash & fold, dry cleaning or bag & leather cleaning straight to your cart.",
      },
      { property: "og:title", content: "Partner Store — QuickPress Laundry Services" },
      {
        property: "og:description",
        content:
          "Services, pricing, reviews and photos of your nearby QuickPress laundry partner with doorstep pickup.",
      },
    ],
  }),
  component: PartnerDetailScreen,
});

const FEATURE_ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  clock: Clock,
  zap: Zap,
  leaf: Leaf,
  package: Package,
  "map-pin": MapPin,
};

const SERVICE_PROCESS = [
  {
    title: "Schedule pickup",
    detail: "Pick a slot — our partner rider collects your clothes from your doorstep.",
  },
  {
    title: "Sorting & inspection",
    detail: "Items are counted, tagged and checked for stains or delicate fabrics.",
  },
  {
    title: "Cleaning & finishing",
    detail: "Fabric-safe wash or dry clean, followed by drying, pressing and folding.",
  },
  {
    title: "Quality check & packing",
    detail: "Every item is re-checked and packed in a sealed, hygienic cover.",
  },
  {
    title: "Doorstep delivery",
    detail: "Fresh laundry delivered back to you within the promised time slot.",
  },
];

function PartnerDetailScreen() {
  const navigate = useNavigate();
  const { partnerId } = Route.useParams();
  const search = Route.useSearch();
  const highlightService = search.highlightService;
  const cart = useCart();
  const [data, setData] = useState<PartnerDetailData | null>(() => {
    return readStaleScopedCache<PartnerDetailData>("partner-detail", partnerId);
  });
  const [favorite, setFavorite] = useState(false);
  const [shared, setShared] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [detailService, setDetailService] = useState<PartnerService | null>(null);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartPopupOpen, setCartPopupOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Real-time store status listener
  useEffect(() => {
    const unsub = onRealtimeEvent("partner.status_changed", (payload: any) => {
      const pid = payload?.partnerId || payload?.id;
      if (pid === partnerId && typeof payload.isOnline === "boolean") {
        setData((prev) => {
          if (!prev) return prev;
          const open = Boolean(payload.isOnline && (payload.isStoreOpen ?? true));
          return {
            ...prev,
            partner: {
              ...prev.partner,
              open,
              status: open ? "open" : "closed",
            },
          };
        });
      }
    });
    return unsub;
  }, [partnerId]);

  // Auto-scroll to highlighted service when opened from home screen popular services
  useEffect(() => {
    if (!data?.services || !highlightService) return;
    const needle = highlightService.toLowerCase().trim();
    const matched = data.services.find(
      (s) => s.id === highlightService || s.name.toLowerCase().includes(needle) || needle.includes(s.name.toLowerCase())
    );
    if (matched) {
      window.setTimeout(() => {
        const el = document.getElementById(`service-card-${matched.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
    }
  }, [data?.services, highlightService]);

  // Initialize quantities from active cart state
  useEffect(() => {
    if (cart.lines.length > 0) {
      const initial: Record<string, number> = {};
      cart.lines.forEach((line) => {
        initial[line.id] = line.qty;
      });
      setQuantities((prev) => ({ ...initial, ...prev }));
    }
  }, [cart.lines]);

  const load = useCallback(
    (forceRefresh = false) => {
      setError(null);
      // GET /api/partners/{id} · /services · /reviews (cached per partner)
      return fetchPartnerDetail(partnerId, { forceRefresh })
        .then((result) => {
          setData(result.data);
          setOffline(result.fromCache);
        })
        .catch(() => setError("We couldn't load this partner right now."));
    },
    [partnerId],
  );

  useEffect(() => {
    let alive = true;
    void load().then(() => {
      if (!alive) return;
    });
    return () => {
      alive = false;
    };
  }, [load]);

  const step = useCallback(
    (id: string, delta: number) => {
      setQuantities((prev) => {
        const nextQty = Math.max(0, (prev[id] ?? 0) + delta);
        const updated = { ...prev, [id]: nextQty };
        
        // Sync with global cart store
        const svc = data?.services.find((s) => s.id === id);
        if (svc) {
          if (nextQty === 0) {
            cart.remove(id);
          } else {
            cart.add(
              {
                id: svc.id,
                name: svc.name,
                price: svc.startingPrice,
                unit: svc.unit,
                image: svc.image,
                description: svc.description,
                partnerId,
                partnerName: data?.partner.name,
              },
              delta,
            );
          }
        }
        return updated;
      });
    },
    [data, partnerId, cart],
  );

  const summary = useMemo(() => {
    if (!data) return { count: 0, total: 0 };
    return data.services.reduce(
      (acc, service) => {
        const qty = quantities[service.id] ?? 0;
        return { count: acc.count + qty, total: acc.total + qty * service.startingPrice };
      },
      { count: 0, total: 0 },
    );
  }, [data, quantities]);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: data?.partner.name ?? "QuickPress", url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const viewCart = async () => {
    if (summary.count === 0) return;
    // POST /api/cart
    await postPartnerCart({ partnerId, quantities });
    setAdded(true);
    window.setTimeout(() => {
      setAdded(false);
      void navigate({ to: "/cart" });
    }, 400);
  };

  useEffect(() => {
    fetchFavouritePartners()
      .then((list) => {
        const found = list.some((p) => p.partnerId === partnerId || p.id === partnerId);
        setFavorite(found);
      })
      .catch(() => undefined);
  }, [partnerId]);

  const toggleFavorite = async () => {
    const next = !favorite;
    setFavorite(next);
    try {
      const res = await toggleFavouritePartner(partnerId);
      setFavorite(res.isFavourite);
      toast.success(res.isFavourite ? "Added store to favourites ❤️" : "Removed store from favourites");
    } catch {
      setFavorite(!next);
      toast.error("Couldn't update favourite store");
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950 scroll-smooth">
      <div className="relative mx-auto w-full max-w-md">
        {/* Top app bar */}
        <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-2 px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
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
          <p className="min-w-0 flex-1 truncate text-center text-sm font-bold tracking-tight text-foreground">
            {data?.partner.name ?? "Laundry partner"}
          </p>
          <button
            type="button"
            aria-label={favorite ? "Remove partner from favourites" : "Add partner to favourites"}
            aria-pressed={favorite}
            onClick={() => void toggleFavorite()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted transition-all duration-300 hover:bg-accent active:scale-[0.9]"
          >
            <Heart
              className={`size-5 transition-all duration-300 ${
                favorite ? "scale-110 fill-current text-destructive" : "text-foreground"
              }`}
            />
          </button>
          <button
            type="button"
            aria-label="Share partner"
            onClick={() => void share()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.9]"
          >
            {shared ? <Check className="size-5 text-brand-green" /> : <Share2 className="size-5" />}
          </button>
        </header>

        {error && !data ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-bold text-foreground">Couldn&apos;t load this partner</p>
            <p className="mt-2 text-xs text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => void load(true)}
              className="ripple mt-5 h-11 rounded-3xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-cta active:scale-[0.97]"
            >
              Try again
            </button>
          </div>
        ) : !data ? (
          <>
            <PartnerDetailSkeleton />
          </>
        ) : (
          <div className="pb-44">
            {/* Cover + partner header — GET /api/partners/{id} */}
            {offline ? (
              <p className="mx-5 mt-4 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-[11px] text-muted-foreground">
                Showing a saved copy of this store — reconnect to refresh.
              </p>
            ) : null}

            {/* Shop identity — logo + short intro */}
            <section className="px-5 pt-3">
              <div className="card-soft border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={resolvePartnerLogo(data.partner.logo)}
                      alt={`${data.partner.name} logo`}
                      width={256}
                      height={256}
                      className="size-20 rounded-3xl border border-border object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <span
                      className={`absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        data.partner.open
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-brand-dark text-secondary-foreground"
                      }`}
                    >
                      {data.partner.open ? "Open now" : "Closed"}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h1 className="truncate text-[18px] font-bold leading-tight tracking-tight text-foreground">
                        {data.partner.name}
                      </h1>
                      {data.partner.verified ? (
                        <BadgeCheck className="size-4 shrink-0 text-brand-green" />
                      ) : null}
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-brand-dark">
                        <Star className="size-3 fill-current" />
                        {data.partner.rating}
                      </span>
                      <span>{data.partner.reviewCount} reviews</span>
                      {data.partner.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/12 px-2 py-0.5 text-[10px] font-bold text-brand-green">
                          Verified
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                      {data.partner.tagline}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <HeroStat label="Pickup" value={data.partner.pickupEta} icon={Truck} />
                  <HeroStat label="Delivery" value={data.partner.deliveryEta} icon={Clock} />
                  <HeroStat label="Distance" value={`${data.partner.distanceKm} km`} icon={MapPin} />
                </div>
              </div>
            </section>

            <div className="px-5">
              {/* Available services — GET /api/partners/{id}/services */}
              <section className="mt-8">
                <SectionHeading title="Available services" />

                <div className="stagger-children mt-4 space-y-3">
                  {data.services.map((service, index) => {
                    const qty = quantities[service.id] ?? 0;
                    const isHighlighted =
                      highlightService &&
                      (service.id === highlightService ||
                        service.name.toLowerCase().includes(highlightService.toLowerCase().trim()) ||
                        highlightService.toLowerCase().trim().includes(service.name.toLowerCase()));
                    return (
                      <div
                        id={`service-card-${service.id}`}
                        key={service.id}
                        className={`card-soft flex gap-3 border p-3 transition-all duration-500 ${
                          isHighlighted
                            ? "border-primary ring-4 ring-primary/25 bg-primary/5 shadow-lg scale-[1.015]"
                            : "border-border hover:border-primary/60"
                        }`}
                      >
                        <img
                          src={resolveServiceImage(service.name, service.image)}
                          alt={service.name}
                          width={640}
                          height={640}
                          loading="lazy"
                          className="size-24 shrink-0 rounded-2xl object-cover"
                          decoding="async"
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold leading-tight text-foreground">
                              {service.name}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                service.available
                                  ? "bg-secondary/12 text-brand-green"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {service.available ? "Available" : "Unavailable"}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                            {service.description}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-bold text-foreground">
                              ₹{service.startingPrice}
                            </span>
                            <span>{service.unit}</span>
                            <span className="size-1 rounded-full bg-border" />
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" /> {service.deliveryEta}
                            </span>
                          </div>

                          <div className="mt-auto flex items-center gap-2 pt-2.5">
                            <button
                              type="button"
                              onClick={() => setDetailService(service)}
                              className="ripple h-9 rounded-2xl border border-border px-3 text-[11px] font-bold text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.96]"
                            >
                              View details
                            </button>
                            {qty > 0 ? (
                              <div className="ml-auto w-28">
                                <Stepper qty={qty} onStep={(delta) => step(service.id, delta)} />
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={!service.available}
                                onClick={() => step(service.id, 1)}
                                className="ripple ml-auto flex h-9 items-center gap-1 rounded-2xl bg-primary px-4 text-[11px] font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.96] disabled:opacity-50"
                              >
                                <Plus className="size-3.5" /> Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Shop information */}
              <section className="mt-8">
                <SectionHeading title="Shop information" />
                <div className="card-soft mt-4 divide-y divide-border border border-border">
                  <InfoRow icon={User} label="Owner" value={data.partner.ownerName} />
                  <InfoRow icon={MapPin} label="Address" value={data.partner.address} />
                  <InfoRow icon={Truck} label="Pickup radius" value={data.partner.pickupRadius} />
                  <InfoRow icon={Clock} label="Working hours" value={data.partner.workingHours} />
                  <InfoRow
                    icon={Store}
                    label="Experience"
                    value={`${data.partner.yearsInBusiness} years in business`}
                  />
                  <InfoRow
                    icon={Truck}
                    label="Delivery radius"
                    value={`${data.partner.deliveryRadiusKm} km from ${data.partner.area}`}
                  />
                </div>

                {/* Map placeholder — coordinates come from GET /api/partners/{id} */}
                <div className="card-soft mt-3 flex h-32 flex-col items-center justify-center gap-1.5 border border-dashed border-border">
                  <MapPin className="size-5 text-muted-foreground" />
                  <p className="text-[11px] font-bold text-foreground">{data.partner.address || "Store Address"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(data.partner.latitude != null ? data.partner.latitude : 28.5355).toFixed(4)}, {(data.partner.longitude != null ? data.partner.longitude : 77.3910).toFixed(4)}
                  </p>
                </div>

                {data.partner.hours && data.partner.hours.length > 0 ? (
                  <div className="card-soft mt-3 divide-y divide-border border border-border">
                    {data.partner.hours.map((slot) => (
                      <div
                        key={slot.day}
                        className="flex items-center justify-between px-4 py-2.5 text-[11px]"
                      >
                        <span className="font-semibold text-foreground">{slot.day}</span>
                        <span className="text-muted-foreground">
                          {slot.closed ? "Closed" : `${slot.opensAt} – ${slot.closesAt}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {data.partner.about || "Professional laundry & dry cleaning partner store."}
                </p>
              </section>


              {/* Shop features */}
              <section className="mt-8">
                <SectionHeading title="Shop features" />
                <div className="stagger-children mt-4 grid grid-cols-2 gap-3">
                  {data.features.map((feature, index) => {
                    const Icon = FEATURE_ICONS[feature.icon] ?? Sparkles;
                    return (
                      <div
                        key={feature.id} className="card-soft flex items-center gap-2.5 border border-border p-3"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                          <Icon className="size-4" />
                        </span>
                        <span className="text-[11px] font-semibold leading-tight text-foreground">
                          {feature.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Gallery */}
              <section className="mt-8">
                <SectionHeading title="Shop gallery" />
                <div className="stagger-children no-scrollbar -mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pb-1">
                  {data.gallery.map((shot) => (
                    <button
                      key={shot.id}
                      type="button"
                      onClick={() => setLightbox(shot)}
                      className="card-soft w-44 shrink-0 overflow-hidden border border-border text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.96]"
                    >
                      <img
                        src={shot.image}
                        alt={`${shot.caption} at ${data.partner.name}`}
                        width={800}
                        height={600}
                        loading="lazy"
                        className="h-28 w-full object-cover"
                        decoding="async"
                      />
                      <p className="px-3 py-2.5 text-[11px] font-bold text-foreground">
                        {shot.caption}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Reviews — GET /api/partners/{id}/reviews */}
              <section className="mt-8">
                <SectionHeading title="Customer reviews" />
                <div className="card-soft mt-4 flex items-center gap-4 border border-border p-4">
                  <div className="shrink-0 text-center">
                    <p className="text-2xl font-bold leading-none text-foreground">
                      {data.reviewSummary.average}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {data.reviewSummary.total} reviews
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    {(Array.isArray(data.reviewSummary?.breakdown) ? data.reviewSummary.breakdown : []).map((row) => {
                      const width = data.reviewSummary.total
                        ? Math.round((row.count / data.reviewSummary.total) * 100)
                        : 0;
                      return (
                        <div key={row.star} className="flex items-center gap-2 text-[10px]">
                          <span className="w-3 text-muted-foreground">{row.star}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${width}%` }}
                            />
                          </span>
                          <span className="w-5 text-right text-muted-foreground">{row.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="stagger-children mt-4 space-y-3">
                  {(data.reviews || []).map((review) => {
                    const firstLetter = (review.name || "Customer").trim().charAt(0).toUpperCase();
                    return (
                      <div key={review.id} className="card-soft border border-border p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-black text-sm shadow-xs uppercase select-none ${getAvatarGradient(
                              review.name,
                            )}`}
                            aria-label={review.name}
                          >
                            {firstLetter}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground">{review.name}</p>
                            <p className="text-[11px] font-medium text-muted-foreground">
                              {formatReviewTimeAgo(review.date)}
                            </p>
                          </div>
                          <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-bold text-brand-dark">
                            <Star className="size-3 fill-current" />
                            {review.rating}
                          </span>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          {review.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Store policies */}
              <section className="mt-8">
                <SectionHeading title="Store policies" />
                <div className="card-soft mt-4 space-y-2.5 border border-border p-4">
                  {(data.partner.policies || []).map((policy) => (
                    <p key={policy} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-brand-green" />
                      {policy}
                    </p>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom bar matching Navbar dimensions & styling */}
      <FloatingCartBar hasBottomNav={false} />

      {/* Service details sheet */}
      {detailService ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close service details"
            onClick={() => setDetailService(null)}
            className="animate-overlay-in absolute inset-0 bg-brand-dark/40 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-0 bottom-0">
            <div className="animate-sheet-up mx-auto w-full max-w-md rounded-t-[2rem] bg-card p-5 pb-8 shadow-soft">
              <span className="mx-auto block h-1.5 w-12 rounded-full bg-border" />
              <div className="mt-5 flex items-center gap-4">
                <img
                  src={detailService.image}
                  alt={detailService.name}
                  width={640}
                  height={640}
                  loading="lazy"
                  className="size-16 rounded-2xl object-cover"
                  decoding="async"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{detailService.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ₹{detailService.startingPrice} {detailService.unit}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="size-3" /> {detailService.deliveryEta}
                  </p>
                </div>
              </div>
              <div className="max-h-[45vh] overflow-y-auto pr-1">
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {detailService.description}
                </p>

                <p className="mt-5 text-sm font-bold text-foreground">How it works</p>
                <ol className="mt-3 space-y-3">
                  {SERVICE_PROCESS.map((stepItem, i) => (
                    <li key={stepItem.title} className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-[11px] font-bold text-brand-dark">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground">{stepItem.title}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {stepItem.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="card-soft mt-5 flex items-center justify-between border border-border p-3">
                  <span className="text-[11px] text-muted-foreground">Delivery time</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-foreground">
                    <Clock className="size-3.5" /> {detailService.deliveryEta}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <Stepper
                  large
                  qty={quantities[detailService.id] ?? 0}
                  onStep={(delta) => step(detailService.id, delta)}
                />
              </div>

              <button
                type="button"
                disabled={!detailService.available}
                onClick={() => {
                  if ((quantities[detailService.id] ?? 0) === 0) step(detailService.id, 1);
                  setDetailService(null);
                }}
                className="ripple mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-3xl bg-primary text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.985] disabled:opacity-50"
              >
                <Plus className="size-4" />
                Add to cart · ₹
                {detailService.startingPrice * Math.max(1, quantities[detailService.id] ?? 0)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Gallery lightbox */}
      {lightbox ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-5">
          <button
            type="button"
            aria-label="Close gallery"
            onClick={() => setLightbox(null)}
            className="animate-overlay-in absolute inset-0 bg-brand-dark/70 backdrop-blur-[2px]"
          />
          <div className="card-soft animate-pop relative w-full max-w-md overflow-hidden border border-border">
            <img
              src={lightbox.image}
              alt={lightbox.caption}
              width={1280}
              height={960}
              className="h-64 w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="flex items-center justify-between p-4">
              <p className="text-sm font-bold text-foreground">{lightbox.caption}</p>
              <button
                type="button"
                aria-label="Close gallery"
                onClick={() => setLightbox(null)}
                className="flex size-9 items-center justify-center rounded-2xl bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.9]"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>;
}

function HeroStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl bg-muted/70 px-3 py-2.5 text-center">
      <span className="mx-auto flex size-7 items-center justify-center rounded-full bg-card text-brand-green">
        <Icon className="size-3.5" />
      </span>
      <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-xs font-semibold leading-relaxed text-foreground">{value}</p>
      </div>
      <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}

function Stepper({
  qty,
  onStep,
  large = false,
}: {
  qty: number;
  onStep: (delta: number) => void;
  large?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border transition-all duration-300 ${
        qty > 0 ? "border-primary bg-primary/10" : "border-border bg-muted/60"
      } ${large ? "px-4 py-2.5" : "px-2 py-1.5"}`}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={qty === 0}
        onClick={() => onStep(-1)}
        className={`flex items-center justify-center rounded-xl bg-card text-foreground shadow-soft transition-all duration-300 active:scale-[0.88] disabled:opacity-40 ${
          large ? "size-10" : "size-7"
        }`}
      >
        <Minus className={large ? "size-4" : "size-3.5"} />
      </button>
      <span
        key={qty}
        className={`animate-pop font-bold tabular-nums text-foreground ${
          large ? "text-xl" : "text-sm"
        }`}
      >
        {qty}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onStep(1)}
        className={`flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.88] ${
          large ? "size-10" : "size-7"
        }`}
      >
        <Plus className={large ? "size-4" : "size-3.5"} />
      </button>
    </div>
  );
}
