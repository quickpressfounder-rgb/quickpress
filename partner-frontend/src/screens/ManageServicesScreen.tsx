import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
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
import { useEffect, useMemo, useState } from "react";
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
import { usePartnerContext } from "../context/PartnerContext";

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
  const [mounted, setMounted] = useState(false);
  const { isOnline, toggleOnline } = usePartnerContext();
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleStore = async () => {
    try {
      await toggleOnline();
      toast.success(isOnline ? "Store is now OFFLINE" : "Store is now ONLINE");
    } catch {
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

  const CATEGORY_TABS = useMemo(() => [
    { id: "all", label: `All (${services.length})` },
    ...(pendingCount > 0 ? [{ id: "pending", label: `⏳ Pending (${pendingCount})` }] : []),
    { id: "wash", label: "🧺 Wash & Fold" },
    { id: "iron", label: "⚡ Steam Iron" },
    { id: "dry", label: "👔 Dry Clean" },
    { id: "shoe", label: "👟 Shoe Clean" },
    { id: "offers", label: `🎁 Offers (${offers.length})` },
    { id: "paused", label: `⏸ Paused (${services.length - trueLiveCount - pendingCount - rejectedCount})` },
    ...(rejectedCount > 0 ? [{ id: "rejected", label: `❌ Rejected (${rejectedCount})` }] : []),
  ], [services.length, pendingCount, rejectedCount, trueLiveCount, offers.length]);

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
      {/* MOBILE ZOMATO MERCHANT MENU & SERVICES VIEW (< md)                        */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-zinc-50/50 pb-28 text-zinc-900 md:hidden">
        {/* Sticky Top Header matching Zomato Merchant Detail */}
        <header className="sticky top-0 z-30 bg-white px-4 pt-3.5 pb-3 border-b border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black tracking-tight text-zinc-950">
                {mounted ? (profile?.businessName || profile?.ownerName || "QuickPress Partner") : "QuickPress Partner"}
              </h1>
              <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
                <span>{mounted && profile?.city ? `${profile.city}` : "Catalog & Rates"}</span>
                <span>•</span>
                <span className="font-bold text-emerald-700">{mounted ? activeCount : services.length} Live Services</span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Modern Online / Offline Toggle Pill */}
              <button
                type="button"
                onClick={handleToggleStore}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black transition-all active:scale-95 cursor-pointer shadow-2xs ${
                  isOnline
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-zinc-100 border-zinc-200 text-zinc-700"
                }`}
              >
                <span className={`size-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                <span>{isOnline ? "Online" : "Offline"}</span>
                <span className="text-[10px] text-zinc-400">›</span>
              </button>

              <Link
                to={partnerRoutes.profile}
                className="flex size-8 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-800 active:scale-95 shadow-2xs cursor-pointer"
                title="Store Settings"
              >
                <Menu className="size-4.5" />
              </Link>
            </div>
          </div>

          {/* Quick Action Toolbar: Custom Service + Catalog Presets + Offer */}
          <div className="mt-3 grid grid-cols-12 gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.serviceNew })}
              className="col-span-5 flex items-center justify-center gap-1.5 rounded-xl bg-[#5B63D3] hover:bg-[#4d54bc] py-2.5 px-2 text-xs font-black text-white shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
              <span>+ Add Service</span>
            </button>

            <button
              type="button"
              onClick={() => setCatalogModalOpen(true)}
              className="col-span-4 flex items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white py-2.5 px-2 text-xs font-bold text-zinc-800 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Catalog</span>
            </button>

            <button
              type="button"
              onClick={() => setOfferSheetOpen(true)}
              className="col-span-3 flex items-center justify-center gap-1 rounded-xl border border-amber-200/80 bg-amber-50 py-2.5 px-2 text-xs font-black text-amber-950 shadow-2xs hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
            >
              <Percent className="size-3.5 text-amber-600" />
              <span>Offer</span>
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search laundry service, category, or garment..."
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-8 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Category Horizontal Filter Carousel */}
          <div className="no-scrollbar -mx-4 mt-3 flex items-center gap-1.5 overflow-x-auto px-4 pb-0.5">
            {CATEGORY_TABS.map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? "bg-zinc-950 text-white font-black shadow-2xs"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Mobile Services Card List (Exact Zomato Menu Aesthetic) */}
        <div className="space-y-3 p-4">
          {!mounted || isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-white border border-zinc-200 p-4" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-2xs">
              <Layers className="mx-auto size-10 text-zinc-300" />
              <h3 className="mt-3 text-sm font-black text-zinc-900">
                {isSearching ? "No matching services" : "No services in this category"}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {isSearching ? "Try adjusting your search query." : "Add your first laundry service rate."}
              </p>
              <button
                type="button"
                onClick={isSearching ? resetSearch : () => setCatalogModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-black text-white active:scale-95 cursor-pointer shadow-2xs"
              >
                {isSearching ? "Reset filters" : "+ Add from Catalog"}
              </button>
            </div>
          ) : (
            visible.map((svc) => {
              const svcOffers = offersFor(svc.id);
              return (
                <div
                  key={svc.id}
                  className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs hover:shadow-xs transition-all"
                >
                  {/* Top Row: Quality Indicator, Title & Live Toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {/* Iconic Veg / Quality Laundry Dot Indicator */}
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-emerald-600 bg-white p-0.5">
                          <span className="size-2 rounded-full bg-emerald-600" />
                        </span>

                        <h3 className="truncate text-sm font-black text-zinc-950 tracking-tight">
                          {svc.name}
                        </h3>

                        {(svc.pendingApproval || svc.approvalStatus === "pending") && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800 shrink-0 border border-amber-300">
                            ⏳ Under Review
                          </span>
                        )}
                        {svc.approvalStatus === "rejected" && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-800 shrink-0 border border-rose-300" title={svc.rejectionReason}>
                            ❌ Rejected
                          </span>
                        )}
                      </div>

                      {/* Pricing & Turnaround Pill */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-zinc-950 tracking-tight">
                          ₹{svc.price} <span className="text-xs font-semibold text-zinc-500">/{svc.unit}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 border border-zinc-200/60">
                          <Clock className="size-3 text-zinc-500" />
                          <span>{svc.turnaroundHours ? `${svc.turnaroundHours}h SLA` : "24h turnaround"}</span>
                        </span>
                      </div>

                      {/* Rejection / Note / Description */}
                      {svc.rejectionReason && svc.approvalStatus === "rejected" ? (
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-rose-600 bg-rose-50 rounded-lg px-2 py-1 border border-rose-200">
                          Reason: {svc.rejectionReason}
                        </p>
                      ) : svc.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-500 font-medium">
                          {svc.description}
                        </p>
                      ) : null}

                      {/* Active Offer Pill */}
                      {svcOffers.length > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700 border border-indigo-200">
                          <Percent className="size-3 text-indigo-600" />
                          <span>{svcOffers[0].title}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Instant In-Stock / Live Switch */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <button
                        type="button"
                        disabled={Boolean(svc.pendingApproval || svc.approvalStatus === "pending" || svc.approvalStatus === "rejected")}
                        onClick={() => {
                          if (svc.pendingApproval || svc.approvalStatus === "pending") {
                            toast.error("Yeh service Admin verification ke liye pending hai. Approval ke baad hi live hogi!");
                            return;
                          }
                          if (svc.approvalStatus === "rejected") {
                            toast.error(`Service Admin ne reject kar di: ${svc.rejectionReason || "Please edit and resubmit."}`);
                            return;
                          }
                          const wasEnabled = svc.enabled;
                          void toggleService(svc.id)
                            .then(() => {
                              toast.success(`${svc.name} ${wasEnabled ? "paused" : "is now LIVE"}`);
                            })
                            .catch((err) => toast.error(err?.message || "Failed to update status"));
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black shadow-2xs transition-all active:scale-95 cursor-pointer ${
                          svc.pendingApproval || svc.approvalStatus === "pending"
                            ? "bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed opacity-90"
                            : svc.approvalStatus === "rejected"
                            ? "bg-rose-100 text-rose-800 border border-rose-300 cursor-not-allowed opacity-90"
                            : svc.enabled
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            svc.enabled ? "bg-white animate-pulse" : "bg-zinc-400"
                          }`}
                        />
                        <span>{svc.enabled ? "LIVE" : "PAUSED"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom Row: Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            to: partnerRoutes.serviceEdit,
                            params: { serviceId: svc.id },
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
                      >
                        <Edit2 className="size-3 text-zinc-600" />
                        <span>Edit Rate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOfferSheetOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
                      >
                        <Tag className="size-3 text-emerald-600" />
                        <span>Discount</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailsId(svc.id)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-900 px-2 py-1 cursor-pointer"
                    >
                      Details ›
                    </button>
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
      <div className="hidden mx-auto w-full max-w-7xl px-4 py-4 md:block md:px-8 md:py-6 select-none">
        <PullToRefresh onRefresh={refresh}>
          {/* Zomato-style Category Tabs Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-zinc-100">
            {CATEGORY_TABS.map((tab) => {
              const isActive = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 ${
                    isActive
                      ? "border-2 border-zinc-950 bg-zinc-950 text-white font-black shadow-xs"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-950"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="relative w-72 lg:w-96">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search service name, category, or garment..."
                className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/70 pl-10 pr-4 text-xs font-medium text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none shadow-2xs"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOfferSheetOpen(true)}
                className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold tracking-tight text-zinc-800 transition-all hover:bg-zinc-50 active:scale-95 shadow-2xs cursor-pointer"
              >
                <Tag className="size-4 text-emerald-600" />
                <span>Add Offer ({offers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setCatalogModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-black tracking-tight text-amber-950 shadow-xs transition-all hover:bg-amber-100 active:scale-95 cursor-pointer"
              >
                <Sparkles className="size-4 text-amber-600" />
                <span>Quick Add Catalog</span>
              </button>
              <Link
                to={partnerRoutes.serviceNew}
                className="flex items-center gap-2 rounded-2xl bg-[#5B63D3] hover:bg-[#4d54bc] px-4.5 py-2.5 text-xs font-black tracking-tight text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>+ Custom Service</span>
              </Link>
            </div>
          </div>

          <div className="mt-6 pb-12">
            {!mounted || isLoading ? (
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
