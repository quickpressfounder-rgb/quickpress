import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BedDouble,
  Blinds,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Footprints,
  Gift,
  LayoutGrid,
  Loader2,
  MapPin,
  Percent,
  RefreshCw,
  Search,
  WifiOff,
  Shirt,
  Sparkles,
  Star,
  Truck,
  WashingMachine,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { onNotificationsChanged } from "@/api/customer/notifications-api";
import { reorder } from "@/api/customer/history-api";

import { FloatingCartBar } from "@/components/cart/FloatingCartBar";
import { BottomNav } from "@/components/home/BottomNav";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { ServicesUnavailableView } from "@/components/common/ServicesUnavailableView";
import { useHomeData } from "@/hooks/useHomeData";
import { checkLocationAvailability } from "@/api/customer/services/partner-service";
import type { SavedLocation } from "@/api/customer/services/location-service";
import {
  DEFAULT_CATEGORIES,
  fetchCategories,
  fetchHomeSections,
  fetchPartners,
  fetchPopularServices,
  fetchRecentOrders,
  refreshHomeSections,
} from "@/api/customer/services/home-service";
import { toast } from "sonner";
import {
  readRecentSearches,
  SEARCH_SCOPES as SEARCH_SCOPE_OPTIONS,
} from "@/api/customer/services/search-service";
import { fetchMembership, type Membership } from "@/api/customer/membership-api";


import defaultAvatar from "@/shared/assets/default-avatar.png";
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

function resolvePartnerImage(img?: string | null): string {
  if (!img) return store1;
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:") || img.startsWith("/uploads/")) return img;
  if (img === "store-1" || img.includes("store-1")) return store1;
  if (img === "store-2" || img.includes("store-2")) return store2;
  if (img === "store-3" || img.includes("store-3")) return store3;
  if (img.startsWith("/")) return img;
  return store1;
}
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "QuickPress Home — Book Laundry Pickup Near You" },
      {
        name: "description",
        content:
          "Book laundry pickup, dry cleaning and express delivery from premium partners near you. Track orders, claim offers and repeat past orders on QuickPress.",
      },
      { property: "og:title", content: "QuickPress Home — Book Laundry Pickup Near You" },
      {
        property: "og:description",
        content:
          "Book laundry pickup, dry cleaning and express delivery from premium partners near you.",
      },
    ],
  }),
  component: HomeScreen,
});

const ICONS: Record<string, LucideIcon> = {
  "washing-machine": WashingMachine,
  shirt: Shirt,
  flame: Flame,
  sparkles: Sparkles,
  footprints: Footprints,
  blinds: Blinds,
  "bed-double": BedDouble,
  "layout-grid": LayoutGrid,
  zap: Zap,
  "calendar-check": CalendarCheck,
};



function HomeScreen() {
  useAuthGuard();
  const navigate = useNavigate();
  const {
    sections,
    initialLoading,
    refreshing,
    online,
    failed,
    refresh,
    retry,
    setLocation,
  } = useHomeData();
  const [pull, setPull] = useState(0);
  const pullStart = useRef<number | null>(null);
  const [availability, setAvailability] = useState<{
    available: boolean;
    nearbyAreas: string[];
  } | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [reordering, setReordering] = useState<string | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);

  const handleReorder = async (orderId: string) => {
    setReordering(orderId);
    try {
      await reorder(orderId);
      toast.success("Items added! Proceeding to checkout...");
      navigate({ to: "/checkout" });
    } catch {
      toast.error("Could not reorder. Please try again.");
    } finally {
      setReordering(null);
    }
  };

  useEffect(() => {
    setRecentSearches(readRecentSearches());
    void fetchMembership().then(setMembership).catch(() => { });
  }, []);

  const profile = sections.profile.data;
  const location = sections.location.data;
  const categories = (sections.categories.data && sections.categories.data.length > 0)
    ? sections.categories.data
    : DEFAULT_CATEGORIES;
  const popular = sections.popular.data ?? [];
  const recentOrders = sections.recentOrders.data ?? [];
  const rawPartners = sections.partners.data ?? [];
  const partners = useMemo(() => {
    return rawPartners.filter((partner: any) => {
      const isInactive =
        partner.status === "inactive" ||
        partner.status === "suspended" ||
        partner.status === "pending" ||
        partner.isActive === false;
      if (isInactive) return false;
      const isOpen =
        partner.open === true ||
        partner.isOpen === true ||
        partner.status === "open" ||
        partner.status === "active";
      const isAccepting = partner.acceptingNewOrders !== false;
      return isOpen && isAccepting;
    });
  }, [rawPartners]);

  useEffect(() => {
    if (!location) {
      setIsCheckingAvailability(false);
      return;
    }
    let alive = true;
    setIsCheckingAvailability(true);
    checkLocationAvailability(location)
      .then((res) => {
        if (alive) {
          setAvailability({
            available: Boolean(res.available),
            nearbyAreas: res.nearbyAreas || [],
          });
        }
      })
      .catch(() => {
        if (alive) setAvailability(null);
      })
      .finally(() => {
        if (alive) setIsCheckingAvailability(false);
      });
    return () => {
      alive = false;
    };
  }, [location?.city, location?.area, location?.latitude, location?.longitude]);

  const nearbyAreas = availability?.nearbyAreas ?? [];
  const isServicesUnavailable = availability ? availability.available === false : false;

  // Header badge stays live: the notifications screen broadcasts every
  // read/delete so the count updates without a home refetch.
  const [unreadOverride, setUnreadOverride] = useState<number | null>(null);
  useEffect(() => onNotificationsChanged(setUnreadOverride), []);
  const unreadNotifications = unreadOverride ?? sections.notifications.data ?? 0;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refresh(),
      fetchMembership({ forceRefresh: true }).then(setMembership).catch(() => { }),
    ]);
    setPull(0);
  }, [refresh]);



  const onTouchStart = (event: React.TouchEvent) => {
    if (window.scrollY > 0) return;
    const touch = event.touches[0];
    if (!touch) return;
    pullStart.current = touch.clientY;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (pullStart.current === null || !touch) return;
    const delta = touch.clientY - pullStart.current;
    if (delta > 0) setPull(Math.min(delta * 0.4, 80));
  };

  const onTouchEnd = () => {
    if (pull > 55) void handleRefresh();
    else setPull(0);
    pullStart.current = null;
  };

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center transition-all duration-300"
        style={{ height: pull || (refreshing ? 56 : 0), opacity: pull || refreshing ? 1 : 0 }}
      >
        <span className="mt-3 flex size-9 items-center justify-center rounded-full bg-card text-brand-green shadow-soft">
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" style={{ transform: `rotate(${pull * 4}deg)` }} />
          )}
        </span>
      </div>

      <div
        className="relative mx-auto w-full max-w-md transition-transform duration-300"
        style={{ transform: `translateY(${pull}px)` }}
      >
        {initialLoading ? (
          <>
            <HomeSkeleton />
          </>
        ) : failed ? (
          <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <RefreshCw className="size-5" />
            </span>
            <p className="text-sm font-bold text-foreground">
              {online ? "We couldn't load your home screen" : "You're offline"}
            </p>
            <p className="text-xs text-muted-foreground">
              {online
                ? "Something went wrong on our side. Please try again."
                : "Check your internet connection and try again."}
            </p>
            <button
              type="button"
              onClick={() => void retry()}
              className="flex h-11 items-center justify-center rounded-3xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.97]"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="px-5 pb-32 pt-8">
            {!online ? (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                <WifiOff className="size-3.5" />
                You're offline — showing your last saved home screen.
              </div>
            ) : null}

            {/* Header — GET /api/profile, GET /api/location */}
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/location-search" })}
                  className="flex max-w-full items-center gap-2 rounded-full bg-transparent py-1.5 pl-2 pr-3 text-left transition-all duration-300 active:scale-[0.97] active:opacity-80"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
                    <MapPin className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Current Location
                    </span>
                    <span className="block truncate text-xs font-bold text-foreground">
                      {location
                        ? `${location.area}${location.city ? `, ${location.city}` : ""}`
                        : "Select your location"}
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Wallet"
                  onClick={() => navigate({ to: "/wallet" })}
                  className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
                >
                  <Wallet className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Notifications"
                  onClick={() => navigate({ to: "/notifications" })}
                  className="relative flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
                >
                  <Bell className="size-5" />
                  {unreadNotifications > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground">
                      {unreadNotifications}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label="Profile"
                  onClick={() => navigate({ to: "/profile" })}
                  className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-border/80 text-foreground shadow-2xs transition-all duration-300 hover:border-primary/60 active:scale-[0.94] bg-muted/20"
                >
                  <img
                    src={defaultAvatar}
                    alt="Profile"
                    width={80}
                    height={80}
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              </div>
            </header>

            {isServicesUnavailable ? (
              <ServicesUnavailableView
                location={location}
                nearbyAreas={nearbyAreas}
                onRetry={handleRefresh}
                isRetrying={refreshing}
                onSelectArea={(area) => {
                  const chosen: SavedLocation = {
                    area,
                    city: area.includes("Kasganj") ? "Kasganj" : area,
                    state: "Uttar Pradesh",
                  };
                  setLocation(chosen);
                }}
              />
            ) : (
              <>
                {/* Search */}
                <section className="mt-6">
                  <button
                    type="button"
                    onClick={() => void navigate({ to: "/search", search: { q: "", scope: "all" } })}
                    className="card-soft flex w-full items-center gap-3 border border-border p-1.5 text-left transition-all duration-300 hover:border-zinc-950 dark:hover:border-zinc-100 active:scale-[0.99]"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <Search className="size-4" />
                    </span>
                    <span className="truncate pr-3 text-sm text-muted-foreground/80">
                      What would you like to clean today?
                    </span>
                  </button>

                  <div className="stagger-children no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                    {SEARCH_SCOPE_OPTIONS.map((scope) => (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() =>
                          void navigate({ to: "/search", search: { q: "", scope: scope.id } })
                        }
                        className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-all duration-300 hover:border-zinc-950 dark:hover:border-zinc-100 hover:text-zinc-950 dark:hover:text-zinc-100 active:scale-[0.95]"
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>

                  <div
                    className="no-scrollbar mt-2 flex items-center gap-2 overflow-x-auto"
                    hidden={recentSearches.length === 0}
                  >
                    <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Clock className="size-3" /> Recent
                    </span>
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() =>
                          void navigate({ to: "/search", search: { q: term, scope: "all" } })
                        }
                        className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>





                {/* Categories — GET /api/categories */}
                <section id="services" className="mt-8 scroll-mt-24">
                  <SectionHeading title="Services" action="View all" />
                  {categories.length === 0 && (
                    <SectionStatus
                      error={sections.categories.error}
                      empty={!sections.categories.loading && (sections.categories.data?.length ?? 0) === 0}
                      emptyLabel="No services available in your area yet."
                      onRetry={() => void retry()}
                    />
                  )}
                  <div className="stagger-children mt-4 grid grid-cols-3 gap-3">
                    {categories.map((category, index) => {
                      const Icon = ICONS[category.icon] ?? Sparkles;
                      return (
                        <button
                          key={`${category.id}-${index}`}
                          type="button"
                          onClick={() =>
                            navigate({ to: "/services/$serviceId", params: { serviceId: category.id } })
                          }
                          className="group card-soft flex flex-col items-center gap-2 border border-border/80 bg-card p-3 text-center transition-all duration-300 hover:border-zinc-950 dark:hover:border-zinc-100 hover:shadow-md active:scale-[0.94]"
                        >
                          <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-muted/40 shadow-sm transition-transform duration-300 group-hover:scale-105">
                            <img
                              src={resolveCategoryServiceImage(category.title, category.image)}
                              alt={category.title}
                              loading="lazy"
                              width={512}
                              height={512}
                              className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                              decoding="async"
                            />
                          </div>
                          <span className="text-[12px] font-black leading-tight tracking-tight text-foreground group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors">
                            {category.title}
                          </span>
                          <span className="text-[10px] font-medium leading-tight text-muted-foreground">
                            {category.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Popular services — GET /api/services (popular) */}
                <section className="mt-8">
                  <SectionHeading title="Popular services" action="View all" />
                  <SectionStatus
                    error={sections.popular.error}
                    empty={!sections.popular.loading && (sections.popular.data?.length ?? 0) === 0}
                    emptyLabel="No services available right now."
                    onRetry={() => void retry()}
                  />
                  <div className="stagger-children no-scrollbar -mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pb-1">
                    {popular.map((service, index) => {
                      const Icon = ICONS[service.icon] ?? Sparkles;
                      return (
                        <button
                          key={`${service.id}-${index}`}
                          type="button"
                          onClick={() => {
                            const targetPartnerId = (service as any).partnerId || (partners && partners.length > 0 && partners[0] ? partners[0].id : null);
                            if (targetPartnerId) {
                              void navigate({
                                to: "/partner/$partnerId",
                                params: { partnerId: targetPartnerId },
                                search: { highlightService: service.id || service.title },
                              });
                            } else {
                              void navigate({
                                to: "/services/$serviceId",
                                params: { serviceId: service.categoryId ?? service.id },
                              });
                            }
                          }}
                          className="group card-soft w-64 shrink-0 border border-border/80 bg-card p-4 text-left transition-all duration-300 hover:border-zinc-950 dark:hover:border-zinc-100 hover:shadow-md active:scale-[0.97]"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-muted/40 shadow-sm transition-transform duration-300 group-hover:scale-105">
                              <img
                                src={resolveCategoryServiceImage(service.title, service.image)}
                                alt={service.title}
                                width={256}
                                height={256}
                                loading="lazy"
                                decoding="async"
                                className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-foreground group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors">
                                {service.title}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                                {service.description ?? service.unit}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              ₹{service.finalPrice ?? service.basePrice ?? service.price}
                            </span>
                            {service.discountLabel ? (
                              <>
                                <span className="text-[11px] text-muted-foreground line-through">
                                  ₹{service.basePrice ?? service.price}
                                </span>
                                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                                  {service.discountLabel}
                                </span>
                              </>
                            ) : null}
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3.5" /> {service.processingTime ?? "24 hrs"}
                            </span>
                            <span className="size-1 rounded-full bg-border" />
                            <span>{service.partnerCount ?? 0} partners</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Nearby partners — GET /api/partners/nearby */}
                <section className="mt-8">
                  <SectionHeading
                    title="Laundry partners near you"
                    action="See all"
                    onAction={() =>
                      void navigate({ to: "/search", search: { q: "", scope: "partners" } })
                    }
                  />
                  <SectionStatus
                    error={sections.partners.error}
                    empty={!sections.partners.loading && partners.length === 0}
                    emptyLabel="No active laundry partners available near this location right now."
                    onRetry={() => void retry()}
                  />
                  <div className="stagger-children mt-4 space-y-4">
                    {partners.map((partner, index) => (
                      <button
                        key={`${partner.id}-${index}`}
                        type="button"
                        onClick={() =>
                          void navigate({
                            to: "/partner/$partnerId",
                            params: { partnerId: partner.id },
                            search: { highlightService: undefined },
                          })
                        }
                        className="card-soft w-full overflow-hidden border border-border/80 bg-card p-4 text-left transition-all duration-300 hover:border-primary/50 hover:shadow-md active:scale-[0.985]"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="relative shrink-0">
                            <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-muted/40 shadow-2xs">
                              <img
                                src={resolvePartnerImage(partner.logo ?? partner.image)}
                                alt={`${partner.name} logo`}
                                width={128}
                                height={128}
                                loading="lazy"
                                className="size-full object-cover"
                                decoding="async"
                              />
                            </div>
                            <span
                              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-[#0c831f] text-white shadow-xs flex items-center gap-1"
                            >
                              <span className="size-1.5 rounded-full bg-white animate-pulse" />
                              Active
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-black tracking-tight text-foreground">
                                {partner.name}
                              </p>
                              <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-brand-dark">
                                <Star className="size-3 fill-current" />
                                {partner.rating}
                                {partner.reviews && partner.reviews !== "0" ? (
                                  <span className="text-[10px] font-medium text-muted-foreground">
                                    ({partner.reviews})
                                  </span>
                                ) : null}
                              </span>
                            </div>

                            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                              {partner.services && partner.services.length > 0
                                ? partner.services.slice(0, 3).join(" · ")
                                : `${partner.distanceKm} km away`}
                            </p>

                            <div className="mt-2.5 flex items-center gap-3 text-xs font-medium text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3.5 text-primary" />{" "}
                                {partner.pickupTime ?? partner.eta ?? "30 min"}
                              </span>
                              <span className="size-1 rounded-full bg-border" />
                              <span className="font-bold text-foreground">
                                Starts ₹{partner.minPrice}
                              </span>
                              <ArrowRight className="ml-auto size-4 text-muted-foreground group-hover:text-primary" />
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Active Member Status Banner (Only visible if user has an active membership plan) */}
                {membership?.active && membership.planId !== "free" ? (
                  <section className="mt-8">
                    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-950 shadow-xs transition-shadow hover:shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
                            <Crown className="size-4.5" />
                          </span>
                          <div>
                            <p className="text-sm font-black tracking-tight text-zinc-950 flex items-center gap-1.5">
                              {membership.planName} VIP Member
                            </p>
                            <p className="text-[11px] font-medium text-zinc-500">
                              {membership.remainingDays} days remaining · Expires {membership.expiresLabel}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          Active VIP
                        </span>
                      </div>

                      <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-xs">
                        <div className="flex items-center gap-2.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 p-3">
                          <span className="size-2 rounded-full bg-emerald-600" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Orders Balance</p>
                            <p className="truncate text-xs font-black text-zinc-950">
                              {membership.quota.remainingOrders > 0
                                ? `${membership.quota.remainingOrders} / ${membership.quota.totalOrders} left`
                                : "Unlimited Free"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 p-3">
                          <span className="size-2 rounded-full bg-emerald-600" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Weight Quota</p>
                            <p className="truncate text-xs font-black text-zinc-950">
                              {membership.quota.remainingWeightKg > 0
                                ? `${membership.quota.remainingWeightKg} kg left`
                                : "100% Covered"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {membership.quota.totalSavings > 0 ? (
                        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200/80 px-3.5 py-2 text-xs">
                          <span className="text-[11px] font-bold text-zinc-700">
                            Total Member Savings:
                          </span>
                          <span className="font-black text-zinc-950">
                            ₹{membership.quota.totalSavings.toLocaleString("en-IN")} saved
                          </span>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void navigate({ to: "/membership" })}
                        className="group mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-xs font-black text-white shadow-xs transition-all active:scale-[0.985] cursor-pointer"
                      >
                        <span>Manage Plan &amp; View Orders</span>
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                      </button>
                    </div>
                  </section>
                ) : null}

                {/* Recent orders — GET /api/orders/recent */}
                <section className="mt-8" suppressHydrationWarning>
                  <SectionHeading
                    title="Recent orders"
                    action="View all"
                    onAction={() => void navigate({ to: "/history" })}
                  />
                  <SectionStatus
                    error={sections.recentOrders.error}
                    empty={!sections.recentOrders.loading && (sections.recentOrders.data?.length ?? 0) === 0}
                    emptyLabel="You have no orders yet."
                    onRetry={() => void retry()}
                  />
                  <div className="stagger-children mt-4 space-y-3" suppressHydrationWarning>
                    {recentOrders.slice(0, 3).map((order, index) => {
                      const targetId = order.id || order.reference;
                      return (
                        <div key={`${order.id}-${index}`} className="card-soft border border-border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-foreground">{order.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {order.reference} · {order.items}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{order.placed}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                String(order.status).toLowerCase().includes("delivered") || String(order.status).toLowerCase().includes("completed")
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                  : String(order.status).toLowerCase().includes("cancel") || String(order.status).toLowerCase().includes("fail")
                                    ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                                    : String(order.status).toLowerCase().includes("out for delivery")
                                      ? "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800"
                                      : String(order.status).toLowerCase().includes("wash") || String(order.status).toLowerCase().includes("clean") || String(order.status).toLowerCase().includes("press")
                                        ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                                        : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center gap-2">
                            <span className="mr-auto text-sm font-bold text-foreground">
                              ₹{order.total}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleReorder(targetId)}
                              disabled={reordering === targetId}
                              className="rounded-2xl border border-border/80 bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-xs transition-all duration-300 hover:bg-zinc-50 hover:shadow-sm active:scale-[0.95] disabled:opacity-50"
                            >
                              {reordering === targetId ? "Reordering..." : "Repeat order"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void navigate({
                                  to: "/track/$orderId",
                                  params: { orderId: targetId },
                                })
                              }
                              className="rounded-2xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.95]"
                            >
                              Track order
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {recentOrders.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => void navigate({ to: "/history" })}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card py-3 text-xs font-bold text-foreground shadow-2xs transition-all hover:bg-muted active:scale-[0.98]"
                      >
                        <span>View all orders</span>
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      </button>
                    ) : null}
                  </div>
                </section>

                {/* Brand watermark footer (Pure White Background) */}
                <section className="mt-12 -mx-4 select-none bg-white dark:bg-zinc-950 px-5 pb-10 pt-12">
                  <h2 className="text-[2.6rem] font-black leading-[0.95] tracking-tight text-muted-foreground/35">
                    India&rsquo;s freshest
                    <br />
                    laundry app <span className="text-primary/35">🧺</span>
                  </h2>
                  <div className="mt-8 h-px w-full bg-border/40" />
                  <p className="mt-6 text-3xl font-black tracking-tight text-muted-foreground/25">
                    QuickPress
                  </p>
                  <p className="mt-6 text-[11px] font-medium tracking-wide text-muted-foreground/70">
                    Made In India · Crafted by Uttar Pradesh 🚩
                  </p>
                </section>
              </>
            )}
          </div>
        )}
      </div>

      <FloatingCartBar />
      <BottomNav active="home" />
    </main>
  );
}

/**
 * Inline status line for a single Home section: renders the section's error
 * with a retry affordance, or an empty-state message. Never blanks the screen.
 */
function SectionStatus({
  error,
  empty,
  emptyLabel,
  onRetry,
}: {
  error?: string | null;
  empty?: boolean;
  emptyLabel?: string;
  onRetry?: () => void;
}) {
  if (error) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2.5 text-[11px] text-muted-foreground">
        <span className="truncate">{error}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="ml-auto shrink-0 font-bold text-brand-green active:opacity-70"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }
  if (empty) {
    return (
      <p className="mt-3 rounded-2xl bg-muted px-3 py-2.5 text-[11px] text-muted-foreground">
        {emptyLabel ?? "Nothing here yet."}
      </p>
    );
  }
  return null;
}

function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-semibold text-brand-green transition-opacity hover:underline active:opacity-70"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

