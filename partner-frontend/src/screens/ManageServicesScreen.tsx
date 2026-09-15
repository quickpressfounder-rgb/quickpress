import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  Edit2,
  Layers,
  Menu,
  Percent,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Shirt,
  Sparkles,
  Tag,
  ToggleLeft,
  ToggleRight,
  UtensilsCrossed,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";

import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PullToRefresh } from "../components/dashboard/PullToRefresh";
import { SectionHeading } from "../components/PartnerPrimitives";
import { ServiceCard } from "../components/services/ServiceCard";
import { ServiceDetailsSheet } from "../components/services/ServiceDetailsSheet";
import { ServiceEmptyState } from "../components/services/ServiceEmptyState";
import { ServiceGridSkeleton } from "../components/services/ServiceSkeletons";
import { ServiceSuccessOverlay } from "../components/services/ServiceSuccessOverlay";
import { ServiceToolbar } from "../components/services/ServiceToolbar";
import { OfferSheet } from "../components/services/OfferSheet";
import { QuickAddCatalogModal } from "../components/services/QuickAddCatalogModal";
import {
  matchesServiceFilter,
  matchesServiceQuery,
  sortServices,
  usePartnerServices,
  type ServiceFilterId,
  type ServiceSortId,
} from "../context/PartnerServicesContext";
import { partnerRoutes } from "../navigation/partner-routes";
import { fetchPartnerProfile, toggleStoreStatus } from "@/api/partner/partner-profile-api";
import { usePartnerResource } from "../hooks/use-partner-resource";

function getServiceIcon(name: string, category?: string) {
  const text = (name + " " + (category || "")).toLowerCase();
  if (text.includes("iron") || text.includes("press")) return "⚡";
  if (text.includes("dry")) return "👔";
  if (text.includes("shoe") || text.includes("sneaker")) return "👟";
  if (text.includes("curtain") || text.includes("blanket") || text.includes("duvet")) return "🪟";
  if (text.includes("premium") || text.includes("delicate")) return "✨";
  return "🧺";
}

export function ManageServicesScreen() {
  const navigate = useNavigate();
  const { data: profile } = usePartnerResource(fetchPartnerProfile);
  const {
    services,
    offers,
    isLoading,
    isOffline,
    activeCount,
    refresh,
    toggleOffline,
    toggleService,
    offersFor,
    addOffer,
  } = usePartnerServices();

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ServiceFilterId[]>([]);
  const [sort, setSort] = useState<ServiceSortId>("popularity");
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [offerSheetOpen, setOfferSheetOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isStoreOnline, setIsStoreOnline] = useState(true);

  const handleToggleStore = async () => {
    try {
      const next = !isStoreOnline;
      setIsStoreOnline(next);
      await toggleStoreStatus(next);
    } catch {
      setIsStoreOnline(!isStoreOnline);
      toast.error("Failed to update store status");
    }
  };

  const pendingCount = useMemo(
    () => services.filter((s) => s.pendingApproval || s.approvalStatus === "pending").length,
    [services]
  );
  const rejectedCount = useMemo(
    () => services.filter((s) => s.approvalStatus === "rejected").length,
    [services]
  );
  const trueLiveCount = useMemo(
    () => services.filter((s) => s.enabled && !s.pendingApproval && s.approvalStatus !== "pending" && s.approvalStatus !== "rejected").length,
    [services]
  );

  const CATEGORY_TABS = [
    { id: "all", label: `All (${services.length})` },
    ...(pendingCount > 0 ? [{ id: "pending", label: `⏳ Pending (${pendingCount})` }] : []),
    { id: "wash", label: "Wash & Fold" },
    { id: "iron", label: "Steam Iron" },
    { id: "dry", label: "Dry Clean" },
    { id: "shoe", label: "Shoe Clean" },
    { id: "offers", label: `Offers (${offers.length})` },
    { id: "paused", label: `Paused (${services.length - trueLiveCount - pendingCount - rejectedCount})` },
    ...(rejectedCount > 0 ? [{ id: "rejected", label: `❌ Rejected (${rejectedCount})` }] : []),
  ];

  const visible = useMemo(() => {
    let list = services;
    if (categoryFilter === "active") {
      list = list.filter((s) => s.enabled && !s.pendingApproval && s.approvalStatus !== "pending");
    } else if (categoryFilter === "paused") {
      list = list.filter((s) => !s.enabled && !s.pendingApproval && s.approvalStatus !== "pending" && s.approvalStatus !== "rejected");
    } else if (categoryFilter === "pending") {
      list = list.filter((s) => s.pendingApproval || s.approvalStatus === "pending");
    } else if (categoryFilter === "rejected") {
      list = list.filter((s) => s.approvalStatus === "rejected");
    } else if (categoryFilter === "offers") {
      list = list.filter((s) => offersFor(s.id).length > 0);
    } else if (categoryFilter === "wash") {
      list = list.filter((s) => s.name.toLowerCase().includes("wash") || s.category?.toLowerCase().includes("wash"));
    } else if (categoryFilter === "iron") {
      list = list.filter((s) => s.name.toLowerCase().includes("iron") || s.name.toLowerCase().includes("press") || s.category?.toLowerCase().includes("iron"));
    } else if (categoryFilter === "dry") {
      list = list.filter((s) => s.name.toLowerCase().includes("dry") || s.category?.toLowerCase().includes("dry"));
    } else if (categoryFilter === "shoe") {
      list = list.filter((s) => s.name.toLowerCase().includes("shoe") || s.name.toLowerCase().includes("sneaker"));
    }

    const filtered = list.filter(
      (service) =>
        matchesServiceQuery(service, query) &&
        filters.every((filter) => matchesServiceFilter(service, filter)),
    );
    return sortServices(filtered, sort);
  }, [services, categoryFilter, query, filters, sort, offersFor]);

  const detailsService = services.find((service) => service.id === detailsId) ?? null;
  const isSearching = query.trim().length > 0 || filters.length > 0;

  const resetSearch = () => {
    setQuery("");
    setFilters([]);
    setCategoryFilter("all");
  };

  return (
    <PartnerLayout
      activeTab="services"
      title="Services & Rate Card"
      subtitle={`${trueLiveCount} of ${services.length} services live in customer catalog`}
      searchQuery={query}
      onSearchChange={setQuery}
    >
      {/* ========================================================================= */}
      {/* MOBILE ZOMATO MENU & SERVICES VIEW (< md)                                 */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-[#F4F5F7] pb-28 text-zinc-900 md:hidden">
        {/* Top Header with Store name, Status & Action buttons */}
        <header className="sticky top-0 z-20 bg-white px-4 pt-3.5 pb-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black tracking-tight text-zinc-900">
                {profile?.businessName || profile?.ownerName || "QuickPress Partner"}
              </h1>
              <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-500">
                {profile?.city ? `${profile.city}` : "Catalog & Pricing"} · {activeCount} Live Services
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleStore}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-black text-zinc-700 active:scale-95"
              >
                <span className={`size-2 rounded-full ${isStoreOnline ? "bg-emerald-500 animate-ping" : "bg-zinc-400"}`} />
                <span>{isStoreOnline ? "Online" : "Offline"}</span>
                <span className="text-[10px] text-zinc-400">›</span>
              </button>

              <Link
                to={partnerRoutes.profile}
                className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-800"
              >
                <Menu className="size-5" />
              </Link>
            </div>
          </div>

          {/* Action Row: Add Service & Create Offer */}
          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => setCatalogModalOpen(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-amber-400 py-2.5 text-xs font-black text-zinc-950 shadow-sm transition-transform active:scale-95 hover:bg-amber-300"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              <span>+ Add Service</span>
            </button>

            <button
              type="button"
              onClick={() => setOfferSheetOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs font-black text-zinc-800 shadow-xs transition-transform active:scale-95 hover:bg-zinc-50"
            >
              <Percent className="size-3.5 text-amber-600" />
              <span>Add Offer</span>
            </button>
          </div>

          {/* Category Horizontal Filter Carousel */}
          <div className="no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            {CATEGORY_TABS.map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-black transition-all active:scale-95 ${
                    isActive
                      ? "bg-zinc-950 text-white shadow-sm"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Input Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search service name, type, or price..."
              className="h-10 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-xs font-bold text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        </header>

        {/* Mobile Services Card List */}
        <div className="space-y-3 p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-200/70" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
              <Layers className="mx-auto size-10 text-zinc-400" />
              <h3 className="mt-3 text-sm font-black text-zinc-900">
                {isSearching ? "No matching services" : "No services in this category"}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {isSearching ? "Try adjusting your search query." : "Add your first laundry service rate."}
              </p>
              <button
                type="button"
                onClick={isSearching ? resetSearch : () => navigate({ to: partnerRoutes.serviceNew })}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-4 py-2 text-xs font-black text-white active:scale-95"
              >
                {isSearching ? "Reset filters" : "+ Add Service"}
              </button>
            </div>
          ) : (
            visible.map((svc) => {
              const svcOffers = offersFor(svc.id);
              const icon = getServiceIcon(svc.name, svc.category);
              return (
                <div
                  key={svc.id}
                  className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800 text-xs font-black">
                          {icon}
                        </span>
                        <h3 className="truncate text-sm font-black text-zinc-900">{svc.name}</h3>
                        {(svc.pendingApproval || svc.approvalStatus === "pending") && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800 shrink-0 border border-amber-300">
                            ⏳ Pending Approval
                          </span>
                        )}
                        {svc.approvalStatus === "rejected" && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-800 shrink-0 border border-rose-300" title={svc.rejectionReason}>
                            ❌ Rejected
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-base font-black text-zinc-900">
                          ₹{svc.price} <span className="text-[10px] text-zinc-500 font-semibold">/{svc.unit}</span>
                        </span>
                        <span className="flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">
                          <Clock className="size-3" /> {svc.turnaroundHours}h turnaround
                        </span>
                      </div>

                      {svc.rejectionReason && svc.approvalStatus === "rejected" ? (
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-rose-600 bg-rose-50 rounded-lg px-2 py-1">
                          Reason: {svc.rejectionReason}
                        </p>
                      ) : svc.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500 font-medium">
                          {svc.description}
                        </p>
                      ) : null}

                      {svcOffers.length > 0 ? (
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-flex">
                          <Percent className="size-3" /> {svcOffers[0].title}
                        </div>
                      ) : null}
                    </div>

                    {/* Live Toggle Switch & Edit */}
                    <div className="flex flex-col items-end gap-2.5 shrink-0">
                      <button
                        type="button"
                        disabled={Boolean(svc.pendingApproval || svc.approvalStatus === "pending" || svc.approvalStatus === "rejected")}
                        onClick={() => {
                          if (svc.pendingApproval || svc.approvalStatus === "pending") {
                            toast.error("Yeh service Admin verification ke liye pending hai. Admin approval ke baad hi live hogi!");
                            return;
                          }
                          if (svc.approvalStatus === "rejected") {
                            toast.error(`Service Admin ne reject kar di: ${svc.rejectionReason || "Please edit and resubmit."}`);
                            return;
                          }
                          const wasEnabled = svc.enabled;
                          void toggleService(svc.id)
                            .then(() => {
                              toast.success(`${svc.name} ${wasEnabled ? "paused" : "is now live"}`);
                            })
                            .catch((err) => toast.error(err?.message || "Failed to update status"));
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black transition-all ${
                          svc.pendingApproval || svc.approvalStatus === "pending"
                            ? "bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed opacity-90"
                            : svc.approvalStatus === "rejected"
                            ? "bg-rose-100 text-rose-800 border border-rose-300 cursor-not-allowed opacity-90"
                            : svc.enabled
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "bg-zinc-200 text-zinc-600"
                        }`}
                      >
                        <span className={`size-2 rounded-full ${
                          svc.pendingApproval || svc.approvalStatus === "pending"
                            ? "bg-amber-500 animate-pulse"
                            : svc.approvalStatus === "rejected"
                            ? "bg-rose-500"
                            : "bg-white"
                        }`} />
                        <span>
                          {svc.pendingApproval || svc.approvalStatus === "pending"
                            ? "PENDING"
                            : svc.approvalStatus === "rejected"
                            ? "REJECTED"
                            : svc.enabled
                            ? "LIVE"
                            : "PAUSED"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            to: partnerRoutes.serviceEdit,
                            params: { serviceId: svc.id },
                          })
                        }
                        className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 active:scale-95"
                      >
                        <Edit2 className="size-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP MENU & SERVICES VIEW (>= md)                                      */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-7xl px-4 py-4 md:block md:px-8 md:py-6">
        <PullToRefresh onRefresh={refresh}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ServiceToolbar
              query={query}
              onQueryChange={setQuery}
              filters={filters}
              onFilterToggle={(f) =>
                setFilters((prev) =>
                  prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f],
                )
              }
              sort={sort}
              onSortChange={setSort}
              totalCount={services.length}
              visibleCount={visible.length}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOfferSheetOpen(true)}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold tracking-tight text-foreground transition-all hover:border-primary/60 active:scale-95"
              >
                <Tag className="size-4 text-brand-green-dark" />
                Add Offer ({offers.length})
              </button>
              <button
                type="button"
                onClick={() => setCatalogModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-black tracking-tight text-amber-950 shadow-xs transition-all hover:bg-amber-100 active:scale-95"
              >
                <Sparkles className="size-4 text-amber-600" />
                Quick Add Catalog
              </button>
              <Link
                to={partnerRoutes.serviceNew}
                className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-black tracking-tight text-primary-foreground shadow-sm transition-all hover:brightness-105 active:scale-95"
              >
                <Plus className="size-4" />
                + Custom Service
              </Link>
            </div>
          </div>

          <div className="mt-6 pb-12">
            {isLoading ? (
              <ServiceGridSkeleton />
            ) : isOffline ? (
              <ServiceEmptyState variant="offline" onAction={() => void refresh()} />
            ) : visible.length === 0 ? (
              <ServiceEmptyState
                variant={isSearching ? "no-results" : "no-services"}
                onAction={isSearching ? resetSearch : () => setCatalogModalOpen(true)}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((service, index) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    offers={offersFor(service.id)}
                    index={index}
                    onToggleEnabled={toggleService}
                    onOpenDetails={(s) => setDetailsId(s.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </PullToRefresh>
      </div>

      {offerSheetOpen ? (
        <OfferSheet
          services={services}
          onClose={() => setOfferSheetOpen(false)}
          onCreate={(offer) => {
            addOffer(offer);
            setOfferSheetOpen(false);
            setSuccess(`Offer "${offer.title}" added to service`);
          }}
        />
      ) : null}

      <ServiceDetailsSheet
        service={detailsService}
        open={Boolean(detailsService)}
        offers={detailsService ? offersFor(detailsService.id) : []}
        onClose={() => setDetailsId(null)}
        onEdit={() => {
          if (detailsService) {
            const id = detailsService.id;
            setDetailsId(null);
            navigate({
              to: partnerRoutes.serviceEdit,
              params: { serviceId: id },
            });
          }
        }}
      />

      <QuickAddCatalogModal
        open={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
      />

      <ServiceSuccessOverlay message={success} onDismiss={() => setSuccess(null)} />
      <Toaster />
    </PartnerLayout>
  );
}
