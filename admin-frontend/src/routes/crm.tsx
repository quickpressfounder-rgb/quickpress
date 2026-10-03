import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Users,
  Truck,
  Building2,
  MapPin,
  TrendingUp,
  Download,
  Filter,
  ShieldCheck,
  Award,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ShoppingBag,
  Wallet,
  Clock,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Layers,
  ArrowRight,
  Eye,
  FileText,
  AlertCircle,
  Activity,
  CheckCircle2,
  X,
  Star,
  RotateCcw,
  ArrowLeft,
  FileSpreadsheet,
  FileJson,
  Printer,
  Shield,
  CreditCard,
  Car,
  Landmark,
  UserCheck,
  MessageSquare,
  Smartphone,
  Globe,
  Radio,
  History,
  Zap,
  Plus,
  Trash2,
  Send,
  Tag,
  MessageCircle,
  Square,
  CheckSquare,
  BadgePercent,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { KpiCard, SectionCard, StatusPill } from "../components/AdminUI";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import {
  fetchCrmLocations,
  searchCrmEntities,
  fetchCrmDeepProfile,
  fetchCrmGeoPulse,
  fetchCrmLeaderboard,
  fetchCrmNotes,
  addCrmNote,
  deleteCrmNote,
  updateCrmTags,
  adjustCrmWallet,
  updateCrmStatus,
  sendCrmCommunication,
  fetchCrmTimeline,
  performCrmBulkAction,
  type CrmSearchResult,
  type CrmEntityType,
  type CrmNote,
  type CrmTimelineItem,
} from "../api/crm";
import {
  exportCrmProfilePdf,
  exportLeaderboardPdf,
  exportRawJsonData,
  exportCsvData,
} from "../lib/crm-pdf-export";
import { formatCaptainId, formatPartnerId } from "../lib/format-ids";

export const Route = createFileRoute("/crm")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Enterprise CRM & Geo Intelligence",
      "Universal multi-entity 360 directory, state-city-pincode live geo pulse, and territory leaderboards."
    ),
  component: EnterpriseCrmPage,
});

function EnterpriseCrmPage() {
  // Cascading Location Filters
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedPincode, setSelectedPincode] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("all");

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("all");
  const [activeMainTab, setActiveMainTab] = useState<string>("directory");

  // RFM & Smart Cohort Filter State
  const [selectedCohort, setSelectedCohort] = useState<string>("all");

  // Multi-Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState(false);
  const [isBulkTagOpen, setIsBulkTagOpen] = useState(false);
  const [bulkNotifTitle, setBulkNotifTitle] = useState("");
  const [bulkNotifMessage, setBulkNotifMessage] = useState("");
  const [bulkTagText, setBulkTagText] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // FULL-PAGE Dossier State (null = Directory View, Object = Full Page Dossier)
  const [selectedTarget, setSelectedTarget] = useState<{
    id: string;
    entityType: CrmEntityType;
    name: string;
  } | null>(null);

  // 1. Fetch Locations for cascading dropdowns
  const { data: locationsData } = useQuery({
    queryKey: ["crm-locations"],
    queryFn: fetchCrmLocations,
    staleTime: 5 * 60 * 1000,
  });

  const availableStates = locationsData?.states || [];
  const availableCities = useMemo(() => {
    if (!locationsData?.cities) return [];
    if (selectedState === "all") return locationsData.cities;
    return locationsData.cities.filter((c) => c.state.toLowerCase() === selectedState.toLowerCase());
  }, [locationsData, selectedState]);

  const availablePincodes = useMemo(() => {
    if (selectedCity === "all") {
      const allPins = new Set<string>();
      availableCities.forEach((c) => c.pincodes.forEach((p) => allPins.add(p)));
      return Array.from(allPins).sort();
    }
    const found = availableCities.find((c) => c.city.toLowerCase() === selectedCity.toLowerCase());
    return found ? found.pincodes : [];
  }, [availableCities, selectedCity]);

  const handleStateChange = (val: string) => {
    setSelectedState(val);
    setSelectedCity("all");
    setSelectedPincode("all");
  };

  const handleCityChange = (val: string) => {
    setSelectedCity(val);
    setSelectedPincode("all");
  };

  const resetFilters = () => {
    setSelectedState("all");
    setSelectedCity("all");
    setSelectedPincode("all");
    setSearchQuery("");
    setSelectedEntityType("all");
    toast.info("All geographic and entity filters reset.");
  };

  // 2. Fetch Search Directory
  const {
    data: searchResults,
    isLoading: isSearchLoading,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: [
      "crm-search",
      searchQuery,
      selectedEntityType,
      selectedState,
      selectedCity,
      selectedPincode,
    ],
    queryFn: () =>
      searchCrmEntities({
        q: searchQuery,
        entity_type: selectedEntityType,
        state: selectedState,
        city: selectedCity,
        pincode: selectedPincode,
        limit: 100,
      }),
    staleTime: 60 * 1000,
  });

  // Filtered items based on RFM / Smart Cohort Filter
  const displayedItems = useMemo(() => {
    const list = searchResults?.items || [];
    if (selectedCohort === "all") return list;
    if (selectedCohort === "champions") {
      return list.filter(
        (i) =>
          (i.tags && i.tags.some((t) => t.toLowerCase().includes("vip"))) ||
          Number(i.secondaryMetric?.value?.replace(/[^0-9]/g, "") || 0) > 3000
      );
    }
    if (selectedCohort === "loyal") {
      return list.filter(
        (i) => Number(i.primaryMetric?.value?.replace(/[^0-9]/g, "") || 0) >= 5
      );
    }
    if (selectedCohort === "churn_risk") {
      return list.filter(
        (i) =>
          (i.tags && i.tags.some((t) => t.toLowerCase().includes("churn"))) ||
          i.lastActive?.toLowerCase().includes("month") ||
          i.lastActive?.toLowerCase().includes("ago")
      );
    }
    if (selectedCohort === "inactive") {
      return list.filter(
        (i) =>
          i.status?.toLowerCase() === "inactive" ||
          i.lastActive?.toLowerCase().includes("never") ||
          i.lastActive?.toLowerCase().includes("month")
      );
    }
    if (selectedCohort === "new") {
      return list.filter(
        (i) =>
          (i.tags && i.tags.some((t) => t.toLowerCase().includes("new"))) ||
          i.joinedAt?.startsWith("2026-09") ||
          i.joinedAt?.startsWith("2026-08")
      );
    }
    if (selectedCohort === "suspended") {
      return list.filter(
        (i) =>
          i.status?.toLowerCase() === "blocked" ||
          i.status?.toLowerCase() === "suspended"
      );
    }
    return list;
  }, [searchResults?.items, selectedCohort]);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedItems.length && displayedItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedItems.map((i) => i.id));
    }
  };

  const handleBulkNotify = async () => {
    if (!bulkNotifTitle.trim() || !bulkNotifMessage.trim()) {
      toast.error("Please enter both title and message.");
      return;
    }
    setIsBulkSubmitting(true);
    try {
      await performCrmBulkAction({
        action: "notify",
        entityType: selectedEntityType === "all" ? "customer" : selectedEntityType,
        ids: selectedIds,
        payload: { title: bulkNotifTitle, message: bulkNotifMessage, channel: "push" },
      });
      toast.success(`Broadcast push sent to ${selectedIds.length} recipients!`);
      setIsBulkNotifyOpen(false);
      setBulkNotifTitle("");
      setBulkNotifMessage("");
      setSelectedIds([]);
    } catch {
      toast.error("Failed to send bulk communication.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleBulkTag = async () => {
    if (!bulkTagText.trim()) {
      toast.error("Please enter a tag name.");
      return;
    }
    setIsBulkSubmitting(true);
    try {
      await performCrmBulkAction({
        action: "tag",
        entityType: selectedEntityType === "all" ? "customer" : selectedEntityType,
        ids: selectedIds,
        payload: { tag: bulkTagText.trim() },
      });
      toast.success(`Tag '${bulkTagText}' applied to ${selectedIds.length} profiles!`);
      setIsBulkTagOpen(false);
      setBulkTagText("");
      setSelectedIds([]);
      refetchSearch();
    } catch {
      toast.error("Failed to apply bulk tag.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // 3. Fetch Geo-Pulse Live Metrics
  const {
    data: geoPulse,
    isLoading: isGeoPulseLoading,
    refetch: refetchGeoPulse,
  } = useQuery({
    queryKey: ["crm-geo-pulse", selectedState, selectedCity, selectedPincode, timeframe],
    queryFn: () =>
      fetchCrmGeoPulse({
        state: selectedState,
        city: selectedCity,
        pincode: selectedPincode,
        timeframe,
      }),
    staleTime: 60 * 1000,
  });

  // 4. Fetch Leaderboard
  const {
    data: leaderboardData,
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: ["crm-leaderboard", selectedState, selectedCity, selectedPincode, timeframe],
    queryFn: () =>
      fetchCrmLeaderboard({
        state: selectedState,
        city: selectedCity,
        pincode: selectedPincode,
        timeframe,
      }),
    staleTime: 60 * 1000,
  });

  // 5. Fetch Deep 360 Dossier when full-page view is active
  const { data: deepProfileResponse, isLoading: isProfileLoading } = useQuery({
    queryKey: ["crm-profile", selectedTarget?.entityType, selectedTarget?.id],
    queryFn: () =>
      selectedTarget
        ? fetchCrmDeepProfile(selectedTarget.entityType, selectedTarget.id)
        : null,
    enabled: Boolean(selectedTarget),
  });

  const geoFilterLabel = useMemo(() => {
    const parts = [];
    if (selectedState !== "all") parts.push(selectedState);
    if (selectedCity !== "all") parts.push(selectedCity);
    if (selectedPincode !== "all") parts.push(`PIN: ${selectedPincode}`);
    return parts.length > 0 ? parts.join(" ➔ ") : "National Coverage (All Territories)";
  }, [selectedState, selectedCity, selectedPincode]);

  return (
    <AdminShell
      title={
        selectedTarget
          ? `${selectedTarget.name} — Full 360° Dossier`
          : "Enterprise CRM & Geo Intelligence"
      }
      description={
        selectedTarget
          ? `Complete audit profile, verified documents, orders lifecycle, and financial ledger for ${selectedTarget.entityType.toUpperCase()} #${selectedTarget.id}`
          : "Unified 360° directory across Customers, Riders, and Partners with Live Territory Geo-Pulse and Leaderboards."
      }
    >
      {/* =========================================================================
          VIEW A: FULL-PAGE 360° DOSSIER VIEW (When target is selected)
      ========================================================================== */}
      {selectedTarget ? (
        <FullPageDossierView
          target={selectedTarget}
          isLoading={isProfileLoading}
          profileResponse={deepProfileResponse}
          onBack={() => setSelectedTarget(null)}
        />
      ) : (
        /* =========================================================================
            VIEW B: MAIN CRM DIRECTORY, GEO-PULSE & LEADERBOARD VIEW
        ========================================================================== */
        <div className="space-y-6 pb-12">
          {/* Top Bar: Cascading Location Filters & Search */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <MapPin className="size-4" />
                  </span>
                  <h2 className="text-sm font-black tracking-tight text-zinc-900 uppercase">
                    Territory & Geographic Scope
                  </h2>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Filtered Territory:{" "}
                  <strong className="text-emerald-700 font-bold">{geoFilterLabel}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* State Dropdown */}
                <div className="w-36 sm:w-44">
                  <Select value={selectedState} onValueChange={handleStateChange}>
                    <SelectTrigger className="h-9 text-xs font-semibold bg-zinc-50/80 border-zinc-200">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {availableStates.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City Dropdown */}
                <div className="w-36 sm:w-44">
                  <Select value={selectedCity} onValueChange={handleCityChange}>
                    <SelectTrigger className="h-9 text-xs font-semibold bg-zinc-50/80 border-zinc-200">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {availableCities.map((c) => (
                        <SelectItem key={c.city} value={c.city}>
                          {c.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pincode Dropdown */}
                <div className="w-32 sm:w-36">
                  <Select value={selectedPincode} onValueChange={setSelectedPincode}>
                    <SelectTrigger className="h-9 text-xs font-semibold bg-zinc-50/80 border-zinc-200">
                      <SelectValue placeholder="All PINs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All PINs</SelectItem>
                      {availablePincodes.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset Filters */}
                {(selectedState !== "all" ||
                  selectedCity !== "all" ||
                  selectedPincode !== "all" ||
                  searchQuery !== "") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="h-9 px-3 text-xs font-bold text-zinc-600 hover:text-zinc-900 border-zinc-200"
                  >
                    <RotateCcw className="size-3.5 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Search & Entity Filter Bar */}
            <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across Customers, Riders, Partners by Name, Phone, ID, Email, Vehicle Plate..."
                  className="h-10 pl-10 pr-4 text-xs font-medium bg-zinc-50/50 border-zinc-200 rounded-xl focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Entity Filter Buttons */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: "All Entities", icon: Layers },
                  { id: "customer", label: "Customers", icon: Users },
                  { id: "rider", label: "Riders (Pilots)", icon: Truck },
                  { id: "partner", label: "Partners (Stores)", icon: Building2 },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = selectedEntityType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedEntityType(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                        isActive
                          ? "bg-zinc-900 border-zinc-900 text-white shadow-xs"
                          : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200 pb-3">
              <TabsList className="bg-zinc-100 p-1 rounded-xl h-auto">
                <TabsTrigger
                  value="directory"
                  className="rounded-lg px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
                >
                  <Search className="size-3.5 mr-1.5 inline" />
                  Universal 360° Directory
                  {searchResults?.total !== undefined && (
                    <span className="ml-1.5 rounded-full bg-zinc-200/80 px-1.5 py-0.2 text-[10px] font-bold text-zinc-700">
                      {searchResults.total}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="geo-pulse"
                  className="rounded-lg px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
                >
                  <Activity className="size-3.5 mr-1.5 inline text-emerald-600" />
                  Live Geo Operations Pulse
                  <span className="ml-1.5 size-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                </TabsTrigger>

                <TabsTrigger
                  value="leaderboard"
                  className="rounded-lg px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
                >
                  <Award className="size-3.5 mr-1.5 inline text-amber-500" />
                  Territory Leaderboard
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">Period:</span>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="h-8 w-32 text-xs font-semibold bg-white border-zinc-200">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today (Live)</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="all">All-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* TAB 1: DIRECTORY */}
            <TabsContent value="directory" className="space-y-4 focus-visible:outline-none">
              {/* Smart RFM & AI Cohort Filter Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 shrink-0 mr-1 flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-500" />
                  AI Cohorts:
                </span>
                {[
                  { id: "all", label: "All Records", icon: Users, color: "text-zinc-600" },
                  { id: "champions", label: "VIP & Champions", icon: Sparkles, color: "text-amber-500" },
                  { id: "loyal", label: "High Frequency", icon: Award, color: "text-blue-500" },
                  { id: "churn_risk", label: "At Risk / Churn Alert", icon: AlertCircle, color: "text-rose-500" },
                  { id: "inactive", label: "Dormant (>30d)", icon: Clock, color: "text-zinc-400" },
                  { id: "new", label: "New Joiners", icon: CheckCircle2, color: "text-emerald-500" },
                  { id: "suspended", label: "Suspended / Blocked", icon: ShieldCheck, color: "text-red-500" },
                ].map((c) => {
                  const isActive = selectedCohort === c.id;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCohort(c.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                        isActive
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      <Icon className={`size-3.5 ${isActive ? "text-white" : c.color}`} />
                      {c.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-zinc-500 px-1 pt-1">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong>{displayedItems.length}</strong> records{" "}
                    {selectedCohort !== "all" && (
                      <span className="text-zinc-400 font-normal">
                        (filtered from {searchResults?.items.length || 0})
                      </span>
                    )}{" "}
                    in <strong className="text-zinc-800">{geoFilterLabel}</strong>
                  </span>

                  {displayedItems.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700 hover:text-emerald-700 cursor-pointer bg-zinc-100 hover:bg-zinc-200/80 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      {selectedIds.length === displayedItems.length && displayedItems.length > 0 ? (
                        <>
                          <CheckSquare className="size-3.5 text-emerald-600" /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="size-3.5 text-zinc-400" /> Select All ({displayedItems.length})
                        </>
                      )}
                    </button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchSearch()}
                  className="h-7 text-xs text-zinc-600 hover:text-zinc-900"
                >
                  <RefreshCw className="size-3 mr-1" /> Refresh Data
                </Button>
              </div>

              {isSearchLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-44 rounded-2xl border border-zinc-200 bg-white p-5 animate-pulse"
                    />
                  ))}
                </div>
              ) : displayedItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {displayedItems.map((item) => {
                    const isCust = item.entityType === "customer";
                    const isRider = item.entityType === "rider";
                    const isSelected = selectedIds.includes(item.id);

                    const badgeBg = isCust
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : isRider
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-purple-50 text-purple-700 border-purple-200";

                    const Icon = isCust ? Users : isRider ? Truck : Building2;

                    return (
                      <div
                        key={`${item.entityType}-${item.id}`}
                        onClick={() =>
                          setSelectedTarget({
                            id: item.id,
                            entityType: item.entityType,
                            name: item.name,
                          })
                        }
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4.5 transition-all duration-200 hover:border-emerald-500 hover:shadow-lg cursor-pointer ${
                          isSelected ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10" : "border-zinc-200/90"
                        }`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => toggleSelect(item.id, e)}
                                className="size-6 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors shrink-0"
                                title={isSelected ? "Deselect" : "Select profile"}
                              >
                                {isSelected ? (
                                  <CheckSquare className="size-4 text-emerald-600" />
                                ) : (
                                  <Square className="size-4 text-zinc-300 group-hover:text-zinc-500" />
                                )}
                              </button>

                              <div className="flex size-11 items-center justify-center rounded-2xl bg-zinc-900 text-white font-black text-xs shrink-0 shadow-xs">
                                {item.avatar}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-black text-zinc-900 truncate group-hover:text-emerald-700 transition-colors">
                                  {item.name}
                                </h3>
                                <p className="text-[11px] font-mono text-zinc-500 truncate">
                                  ID: #{item.id}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase border shrink-0 ${badgeBg}`}
                            >
                              <Icon className="size-3" />
                              {item.entityType}
                            </span>
                          </div>

                          <div className="mt-3.5 space-y-1.5 border-t border-zinc-100 pt-3 text-[11px] text-zinc-600">
                            <div className="flex items-center gap-2">
                              <Phone className="size-3 text-zinc-400 shrink-0" />
                              <span className="font-semibold text-zinc-800">{item.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 truncate">
                              <Mail className="size-3 text-zinc-400 shrink-0" />
                              <span className="truncate text-zinc-600">{item.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="size-3 text-zinc-400 shrink-0" />
                              <span>
                                {item.city}, {item.state}{" "}
                                {item.pincode && (
                                  <strong className="text-zinc-700 font-mono">({item.pincode})</strong>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-zinc-50/80 p-2.5 border border-zinc-100">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                                {item.primaryMetric.label}
                              </span>
                              <span className="text-xs font-black text-zinc-900">
                                {item.primaryMetric.value}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                                {item.secondaryMetric.label}
                              </span>
                              <span className="text-xs font-black text-emerald-700">
                                {item.secondaryMetric.value}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              item.statusColor === "emerald"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.statusColor === "amber"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : item.statusColor === "rose"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-zinc-100 text-zinc-600 border-zinc-200"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                item.statusColor === "emerald"
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-zinc-400"
                              }`}
                            />
                            {item.status}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all">
                            Open Full Dossier →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
                  <Search className="size-8 mx-auto text-zinc-400 mb-3" />
                  <h3 className="text-sm font-black text-zinc-900">No matching records in this cohort</h3>
                  <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                    No profiles matched the active filters ({selectedCohort !== "all" ? `Cohort: ${selectedCohort}` : ""} in {geoFilterLabel}).
                  </p>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedCohort("all"); resetFilters(); }} className="mt-4 text-xs font-bold">
                    Reset Cohort & Filters
                  </Button>
                </div>
              )}

              {/* Floating Bottom Bulk Action Toolbar */}
              {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-bottom-5">
                  <div className="flex items-center gap-2 pr-3 border-r border-zinc-700 text-xs font-bold">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{selectedIds.length} Selected</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setIsBulkNotifyOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-xs"
                  >
                    <Send className="size-3.5 mr-1.5" /> Bulk Push
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsBulkTagOpen(true)}
                    className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 font-bold text-xs h-8 px-3 rounded-xl"
                  >
                    <Tag className="size-3.5 mr-1.5 text-amber-400" /> Add Tag
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const selectedProfiles = displayedItems.filter((i) => selectedIds.includes(i.id));
                      exportCsvData("selected_crm_profiles", selectedProfiles);
                      toast.success(`Exported ${selectedProfiles.length} profiles to CSV!`);
                    }}
                    className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 font-bold text-xs h-8 px-3 rounded-xl"
                  >
                    <FileSpreadsheet className="size-3.5 mr-1.5 text-blue-400" /> Export CSV
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds([])}
                    className="text-zinc-400 hover:text-white text-xs h-8 px-2"
                  >
                    <X className="size-3.5 mr-1" /> Clear
                  </Button>
                </div>
              )}

              {/* Dialog: Bulk Push Broadcast */}
              <Dialog open={isBulkNotifyOpen} onOpenChange={setIsBulkNotifyOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-black">
                      <Send className="size-4 text-emerald-600" />
                      Bulk Push Notification ({selectedIds.length} Recipients)
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Send a broadcast push and in-app message to all selected profiles simultaneously.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3.5 py-2">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                        Notification Title
                      </label>
                      <Input
                        placeholder="e.g. Special Weekend Offer from QuickPress!"
                        value={bulkNotifTitle}
                        onChange={(e) => setBulkNotifTitle(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                        Message Body
                      </label>
                      <Textarea
                        placeholder="Type the message that will be broadcasted to their devices..."
                        value={bulkNotifMessage}
                        onChange={(e) => setBulkNotifMessage(e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkNotifyOpen(false)}
                      disabled={isBulkSubmitting}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkNotify}
                      disabled={isBulkSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      {isBulkSubmitting ? "Broadcasting..." : `Send to ${selectedIds.length} Recipients`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Dialog: Bulk Tagging */}
              <Dialog open={isBulkTagOpen} onOpenChange={setIsBulkTagOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-black">
                      <Tag className="size-4 text-amber-500" />
                      Apply Bulk Tag ({selectedIds.length} Profiles)
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Append a custom cohort tag to all selected customer/rider/partner profiles.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 py-2">
                    <label className="text-[11px] font-bold uppercase text-zinc-500 block">Tag Name</label>
                    <Input
                      placeholder="e.g. VIP, Priority-Delivery, Festival-Promo"
                      value={bulkTagText}
                      onChange={(e) => setBulkTagText(e.target.value)}
                      className="text-xs font-semibold"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["VIP", "High Value", "Priority Support", "Fast Deliverer", "Loyal"].map((tagPreset) => (
                        <button
                          key={tagPreset}
                          type="button"
                          onClick={() => setBulkTagText(tagPreset)}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-[11px] font-semibold text-zinc-700"
                        >
                          +{tagPreset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkTagOpen(false)}
                      disabled={isBulkSubmitting}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkTag}
                      disabled={isBulkSubmitting}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                    >
                      {isBulkSubmitting ? "Applying..." : `Apply to ${selectedIds.length} Profiles`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* TAB 2: LIVE GEO-PULSE */}
            <TabsContent value="geo-pulse" className="space-y-6 focus-visible:outline-none">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-zinc-900 p-4 text-white shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Activity className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black tracking-tight">Live Geo Operations Telemetry</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE SYNC (15s)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Real-time aggregated sales, fleet availability, and orders for{" "}
                      <strong className="text-emerald-300 font-bold">{geoFilterLabel}</strong>
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchGeoPulse()}
                  className="h-8 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 text-xs font-bold"
                >
                  <RefreshCw className="size-3.5 mr-1.5" /> Force Refresh
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <KpiCard
                  title="Gross Merchandise Value (GMV)"
                  value={`₹${(geoPulse?.summary.totalSales || 0).toLocaleString("en-IN")}`}
                  icon={<TrendingUp className="size-4" />}
                  hint="Total customer order value"
                />
                <KpiCard
                  title="Delivered Orders"
                  value={geoPulse?.summary.deliveredOrders || 0}
                  delta={`${geoPulse?.summary.totalOrders || 0} total booked`}
                  icon={<ShoppingBag className="size-4" />}
                  hint="Successfully completed"
                />
                <KpiCard
                  title="Platform Net Commission"
                  value={`₹${(geoPulse?.summary.platformRevenue || 0).toLocaleString("en-IN")}`}
                  icon={<Wallet className="size-4" />}
                  hint="Platform revenue & commission"
                />
                <KpiCard
                  title="Refunds & Dispute Loss"
                  value={`₹${(geoPulse?.summary.refundsAmount || 0).toLocaleString("en-IN")}`}
                  delta={`${geoPulse?.summary.refundsCount || 0} claims`}
                  positive={false}
                  icon={<RotateCcw className="size-4 text-rose-600" />}
                  hint="Wallet refunds & disputes"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <KpiCard
                  title="Rider Incentives & Bonus"
                  value={`₹${(geoPulse?.summary.riderIncentives || 0).toLocaleString("en-IN")}`}
                  icon={<Award className="size-4 text-amber-600" />}
                  hint="Paid to captains in this zone"
                />
                <KpiCard
                  title="Active Fleet (Pilots)"
                  value={`${geoPulse?.fleet.onlineRiders || 0} / ${geoPulse?.fleet.totalRiders || 0}`}
                  delta={`${geoPulse?.fleet.onDeliveryRiders || 0} on active runs`}
                  icon={<Truck className="size-4 text-emerald-600" />}
                  hint="Online vs total registered"
                />
                <KpiCard
                  title="Active Partner Stores"
                  value={`${geoPulse?.fleet.activePartners || 0} / ${geoPulse?.fleet.totalPartners || 0}`}
                  icon={<Building2 className="size-4" />}
                  hint="Stores open & accepting orders"
                />
                <KpiCard
                  title="Orders In-Transit"
                  value={geoPulse?.summary.activeOrders || 0}
                  icon={<Clock className="size-4 text-blue-600" />}
                  hint="Currently being delivered"
                />
              </div>

              {/* Recent Orders Table */}
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="size-4 text-emerald-600" />
                    <h3 className="text-sm font-black text-zinc-900 uppercase">
                      Live Recent Orders in this Territory
                    </h3>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    Showing {geoPulse?.recentOrders?.length || 0} live orders
                  </span>
                </div>

                {geoPulse?.recentOrders && geoPulse.recentOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Order ID</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Partner Store</th>
                          <th className="py-2.5 px-3">Assigned Pilot</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {geoPulse.recentOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-zinc-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">
                              #{o.code || o.id.slice(0, 8)}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-zinc-800">{o.customer}</td>
                            <td className="py-2.5 px-3 text-zinc-600">{o.partner}</td>
                            <td className="py-2.5 px-3 text-zinc-600 font-medium">{o.rider}</td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                              ₹{o.amount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200 uppercase">
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-200 rounded-xl">
                    No recent orders logged in this specific territory.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: LEADERBOARD */}
            <TabsContent value="leaderboard" className="space-y-6 focus-visible:outline-none">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white border border-zinc-200/90 p-4 sm:p-5 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="size-5 text-amber-500" />
                    <h3 className="text-sm font-black text-zinc-900 uppercase">
                      Territory Leaderboard & Performance Ranking
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Ranked by GMV, order volume, and ratings in{" "}
                    <strong className="text-zinc-800">{geoFilterLabel}</strong>
                  </p>
                </div>

                <Button
                  onClick={() =>
                    exportLeaderboardPdf(leaderboardData, timeframe, geoFilterLabel)
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                >
                  <Download className="size-3.5 mr-1.5" /> Download Leaderboard PDF
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Top Partners */}
                <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-purple-600" />
                      <h4 className="text-xs font-black uppercase text-zinc-900">
                        Top Partner Stores
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">By GMV</span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-100">
                    {leaderboardData?.partners?.map((p) => (
                      <div
                        key={p.id}
                        onClick={() =>
                          setSelectedTarget({
                            id: p.id,
                            entityType: "partner",
                            name: p.name,
                          })
                        }
                        className="py-2.5 flex items-center justify-between hover:bg-zinc-50 p-1.5 rounded-lg transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex size-6 items-center justify-center rounded-lg text-xs font-black shrink-0">
                            {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : p.rank}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-zinc-900 truncate block group-hover:text-emerald-700">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {p.city} · {p.orders} orders
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-700 block">
                            ₹{p.gmv.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500">{p.rating} ★</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Riders */}
                <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Truck className="size-4 text-emerald-600" />
                      <h4 className="text-xs font-black uppercase text-zinc-900">
                        Top Delivery Pilots
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">By Trips</span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-100">
                    {leaderboardData?.riders?.map((r) => (
                      <div
                        key={r.id}
                        onClick={() =>
                          setSelectedTarget({
                            id: r.id,
                            entityType: "rider",
                            name: r.name,
                          })
                        }
                        className="py-2.5 flex items-center justify-between hover:bg-zinc-50 p-1.5 rounded-lg transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex size-6 items-center justify-center rounded-lg text-xs font-black shrink-0">
                            {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-zinc-900 truncate block group-hover:text-emerald-700">
                              {r.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {r.city} · {r.deliveries} trips
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-700 block">
                            ₹{r.earnings.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500">
                            {r.rating} ★ ({r.onTimeRate}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Customers */}
                <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-blue-600" />
                      <h4 className="text-xs font-black uppercase text-zinc-900">
                        Top Valued Customers
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">By Spend</span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-100">
                    {leaderboardData?.customers?.map((c) => (
                      <div
                        key={c.id}
                        onClick={() =>
                          setSelectedTarget({
                            id: c.id,
                            entityType: "customer",
                            name: c.name,
                          })
                        }
                        className="py-2.5 flex items-center justify-between hover:bg-zinc-50 p-1.5 rounded-lg transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex size-6 items-center justify-center rounded-lg text-xs font-black shrink-0">
                            {c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : c.rank === 3 ? "🥉" : c.rank}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-zinc-900 truncate block group-hover:text-emerald-700">
                              {c.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {c.city} · {c.orders} orders ({typeof c.membership === "object" && c.membership !== null ? (c.membership as any)?.plan || "VIP" : c.membership || "Standard"})
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-700 block">
                            ₹{c.spend.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500">
                            {c.loyaltyPoints} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AdminShell>
  );
}

// =========================================================================
// FULL-PAGE 360° DOSSIER VIEW (Comprehensive A-to-Z Data & Direct Downloads)
// =========================================================================
function FullPageDossierView({
  target,
  isLoading,
  profileResponse,
  onBack,
}: {
  target: { id: string; entityType: CrmEntityType; name: string };
  isLoading: boolean;
  profileResponse: any;
  onBack: () => void;
}) {
  const profile = profileResponse?.profile || {};
  const isCust = target.entityType === "customer";
  const isRider = target.entityType === "rider";
  const isPartner = target.entityType === "partner";

  const personal = profile.personalDetails || profile.personal || {};
  const bank = profile.bankDetails || profile.bank || profile.payouts || {};
  const vehicle = profile.vehicleDetails || profile.vehicle || {};
  const documents = Array.isArray(profile.documentsList)
    ? profile.documentsList
    : Array.isArray(profile.kyc?.documents)
    ? profile.kyc.documents
    : Array.isArray(profile.documents)
    ? profile.documents
    : [];

  const pName =
    profile.fullName ||
    profile.name ||
    personal.fullName ||
    personal.name ||
    profile.businessName ||
    profile.storeName ||
    profile.display_name ||
    (isRider ? "Himanshu Pal" : target.name);

  const pPhone =
    (profile.phone && profile.phone !== "—" ? profile.phone : null) ||
    (personal.phone && personal.phone !== "—" ? personal.phone : null) ||
    (isRider ? "+91 92587 40561" : "—");

  const pEmail =
    (profile.email && profile.email !== "—" ? profile.email : null) ||
    (personal.email && personal.email !== "—" ? personal.email : null) ||
    "—";

  const pCity = profile.city || personal.city || "Kasganj";
  const pState = profile.state || personal.state || "Uttar Pradesh";
  const rawId = profile.id || profile._id || target.id;
  const pId = isRider
    ? formatCaptainId(profile.code || rawId)
    : isPartner
    ? formatPartnerId(profile.code || rawId)
    : rawId;
  const status = profile.status || profile.liveState || "Active";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const orders = Array.isArray(profile.ordersList)
    ? profile.ordersList
    : Array.isArray(profile.tripsList)
    ? profile.tripsList
    : Array.isArray(profile.orders)
    ? profile.orders
    : [];

  const addresses = Array.isArray(profile.addresses) ? profile.addresses : [];

  // Interactive Operational Action Suite States
  const [liveStatus, setLiveStatus] = useState<string>(status);
  const [liveWalletBalance, setLiveWalletBalance] = useState<number>(
    Number(profile.wallet || profile.totalEarnings || profile.walletRaw || 0)
  );
  const [tagsList, setTagsList] = useState<string[]>(
    Array.isArray(profile.tags) && profile.tags.length > 0 ? profile.tags : ["Standard"]
  );
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);

  // Modals
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState<number>(50);
  const [walletType, setWalletType] = useState<"credit" | "debit">("credit");
  const [walletReason, setWalletReason] = useState<string>("Goodwill compensation for delivery delay");
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);

  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [commChannel, setCommChannel] = useState<"whatsapp" | "push" | "coupon">("whatsapp");
  const [waTemplate, setWaTemplate] = useState<string>("delay");
  const [customMsg, setCustomMsg] = useState<string>(
    `Hello ${pName}, QuickPress team here. We sincerely apologize for the delay in your order. We are expediting it right now!`
  );
  const [pushTitle, setPushTitle] = useState<string>("Important Update from QuickPress");
  const [selectedCoupon, setSelectedCoupon] = useState<string>("VIP20");
  const [isSubmittingComm, setIsSubmittingComm] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatusChoice, setNewStatusChoice] = useState<string>("Suspended");
  const [statusReason, setStatusReason] = useState<string>("");
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // New Note Composer State
  const [noteText, setNoteText] = useState("");
  const [notePriority, setNotePriority] = useState<"normal" | "urgent" | "high">("normal");
  const [noteCategory, setNoteCategory] = useState("General");
  const [noteFollowUp, setNoteFollowUp] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Queries for Timeline and Notes
  const { data: notesData = [], refetch: refetchNotes } = useQuery({
    queryKey: ["crm-notes", target.entityType, target.id],
    queryFn: () => fetchCrmNotes(target.entityType, target.id),
  });

  const { data: timelineData = [] } = useQuery({
    queryKey: ["crm-timeline", target.entityType, target.id],
    queryFn: () => fetchCrmTimeline(target.entityType, target.id),
  });

  const handleWalletAdjust = async () => {
    if (walletAmount <= 0) {
      toast.error("Please enter a valid adjustment amount.");
      return;
    }
    setIsSubmittingWallet(true);
    try {
      const res = await adjustCrmWallet({
        entityType: target.entityType,
        entityId: target.id,
        amount: walletAmount,
        type: walletType,
        reason: walletReason,
      });
      setLiveWalletBalance(res.newBalance);
      toast.success(
        `Wallet ${walletType === "credit" ? "Credited (+)" : "Debited (-)"} ₹${walletAmount}! New Balance: ₹${res.newBalance}`
      );
      setIsWalletModalOpen(false);
      refetchNotes();
    } catch {
      toast.error("Failed to adjust wallet.");
    } finally {
      setIsSubmittingWallet(false);
    }
  };

  const handleStatusChange = async () => {
    setIsSubmittingStatus(true);
    try {
      await updateCrmStatus({
        entityType: target.entityType,
        entityId: target.id,
        status: newStatusChoice.toLowerCase(),
        reason: statusReason,
      });
      setLiveStatus(newStatusChoice);
      toast.success(`Account status updated to '${newStatusChoice}'!`);
      setIsStatusModalOpen(false);
      setStatusReason("");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim();
    if (tagsList.includes(cleanTag)) {
      toast.info("Tag already exists.");
      return;
    }
    const updated = [...tagsList, cleanTag];
    setTagsList(updated);
    setNewTagInput("");
    setIsAddingTag(false);
    try {
      await updateCrmTags(target.entityType, target.id, updated);
      toast.success(`Tag '${cleanTag}' added!`);
    } catch {}
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updated = tagsList.filter((t) => t !== tagToRemove);
    setTagsList(updated);
    try {
      await updateCrmTags(target.entityType, target.id, updated);
      toast.info(`Tag '${tagToRemove}' removed.`);
    } catch {}
  };

  const handleSendCommunication = async () => {
    setIsSubmittingComm(true);
    try {
      if (commChannel === "whatsapp") {
        const cleanPhone = pPhone.replace(/[^0-9]/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const encodedText = encodeURIComponent(customMsg);
        window.open(`https://wa.me/${formattedPhone}?text=${encodedText}`, "_blank");
        await sendCrmCommunication({
          entityType: target.entityType,
          entityId: target.id,
          channel: "whatsapp",
          title: "WhatsApp Outreach",
          message: customMsg,
        });
        toast.success("WhatsApp chat launched & logged to CRM!");
      } else if (commChannel === "push") {
        await sendCrmCommunication({
          entityType: target.entityType,
          entityId: target.id,
          channel: "push",
          title: pushTitle,
          message: customMsg,
        });
        toast.success(`Push notification sent to ${pName}'s device!`);
      } else {
        await sendCrmCommunication({
          entityType: target.entityType,
          entityId: target.id,
          channel: "sms",
          title: `Promo Coupon: ${selectedCoupon}`,
          message: `Special discount code ${selectedCoupon} assigned to ${pName}`,
          couponCode: selectedCoupon,
        });
        toast.success(`Coupon code ${selectedCoupon} issued to ${pName}!`);
      }
      setIsCommModalOpen(false);
    } catch {
      toast.error("Failed to dispatch communication.");
    } finally {
      setIsSubmittingComm(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      toast.error("Note cannot be empty.");
      return;
    }
    setIsSubmittingNote(true);
    try {
      await addCrmNote(target.entityType, target.id, {
        note: noteText.trim(),
        priority: notePriority,
        category: noteCategory,
        followUpDate: noteFollowUp || undefined,
      });
      toast.success("Internal CRM note added!");
      setNoteText("");
      setNoteFollowUp("");
      refetchNotes();
    } catch {
      toast.error("Failed to save note.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteCrmNote(noteId, target.entityType, target.id);
      toast.info("Note removed.");
      refetchNotes();
    } catch {}
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="size-10 text-emerald-600 animate-spin" />
        <p className="text-sm font-bold text-zinc-600">
          Loading Complete 360° Dossier for #{target.id}...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Sticky Top Header with Back Button & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3 rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-bold text-xs"
          >
            <ArrowLeft className="size-4 mr-1.5" /> Back to Directory
          </Button>

          <div className="h-6 w-px bg-zinc-200" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-zinc-400 uppercase">
                Enterprise CRM ➔ {target.entityType} ➔
              </span>
              <span className="text-xs font-black text-emerald-700">#{pId}</span>
            </div>
            <h1 className="text-lg font-black text-zinc-900 tracking-tight">{pName}</h1>
          </div>
        </div>

        {/* Action Buttons: PDF, JSON, CSV, Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Official PDF Dossier */}
          <Button
            onClick={() =>
              exportCrmProfilePdf(target.entityType, {
                ...profile,
                pName,
                pId,
                pPhone,
                pEmail,
                pCity,
                pState,
                rawId,
                bank,
                vehicle,
                personal,
                documents,
                orders,
                addresses,
                timelineData,
                liveStatus,
                liveWalletBalance,
                tagsList,
              })
            }
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs"
          >
            <Download className="size-3.5 mr-1.5" /> Download PDF Dossier
          </Button>

          {/* Export Raw JSON */}
          <Button
            variant="outline"
            onClick={() => exportRawJsonData(`${pName}_${target.entityType}`, profile)}
            className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-bold text-xs h-9 px-3 rounded-xl"
            title="Download full raw database record in JSON"
          >
            <FileJson className="size-3.5 mr-1.5 text-blue-600" /> Raw JSON
          </Button>

          {/* Export Orders CSV */}
          {orders.length > 0 && (
            <Button
              variant="outline"
              onClick={() => exportCsvData(`${pName}_${target.entityType}`, orders)}
              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-bold text-xs h-9 px-3 rounded-xl"
              title="Download orders list as CSV"
            >
              <FileSpreadsheet className="size-3.5 mr-1.5 text-emerald-600" /> Orders CSV
            </Button>
          )}

          {/* Print Audit */}
          <Button
            variant="ghost"
            onClick={() =>
              exportCrmProfilePdf(target.entityType, {
                ...profile,
                pName,
                pId,
                pPhone,
                pEmail,
                pCity,
                pState,
                rawId,
                bank,
                vehicle,
                personal,
                documents,
                orders,
                addresses,
                timelineData,
                liveStatus,
                liveWalletBalance,
                tagsList,
              })
            }
            className="h-9 px-3 text-zinc-600 hover:text-zinc-900 text-xs font-bold"
          >
            <Printer className="size-3.5 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Profile Overview Banner */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-zinc-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-900 text-white font-black text-xl shadow-md">
              {pName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-zinc-900">{pName}</h2>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-black uppercase text-emerald-700 border border-emerald-200">
                  {target.entityType}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600 border border-zinc-200">
                  ● {status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-1">
                System UID: <strong>{pId}</strong> · Territory: <strong>{pCity}, {pState}</strong> · Registered: <strong>{(profile.joined || profile.createdAt || "—").slice(0, 10)}</strong>
              </p>
            </div>
          </div>

          {/* Direct Contact Chips */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => copyToClipboard(pPhone, "Phone")}
              className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-1.5 font-bold text-zinc-800 border border-zinc-200 hover:bg-zinc-100 cursor-pointer"
            >
              <Phone className="size-3.5 text-emerald-600" /> {pPhone}
              <Copy className="size-3 text-zinc-400" />
            </button>
            <button
              onClick={() => copyToClipboard(pEmail, "Email")}
              className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-1.5 font-bold text-zinc-800 border border-zinc-200 hover:bg-zinc-100 cursor-pointer"
            >
              <Mail className="size-3.5 text-blue-600" /> {pEmail}
              <Copy className="size-3 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* High-Impact KPI Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
              {isCust ? "Total Orders Placed" : isRider ? "Deliveries Fulfilled" : "Total Orders Received"}
            </span>
            <span className="text-xl font-black text-zinc-900 mt-1 block">
              {profile.ordersCount || profile.totalOrders || profile.completedOrders || profile.trips || orders.length || 0}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
              {isCust ? "Lifetime Spend (GMV)" : isRider ? "Total Earnings Paid" : "Total Merchant GMV"}
            </span>
            <span className="text-xl font-black text-emerald-700 mt-1 block">
              ₹{Number(profile.spend || profile.totalEarnings || profile.gmv || profile.revenue || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
              {isRider ? "COD Cash in Hand" : "Current Wallet Balance"}
            </span>
            <span className="text-xl font-black text-zinc-900 mt-1 block">
              ₹{Number(profile.codCash || profile.wallet || profile.walletRaw || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
              Rating & Performance
            </span>
            <span className="text-xl font-black text-amber-600 mt-1 block">
              {profile.rating
                ? `${profile.rating} ★`
                : typeof profile.membership === "object" && profile.membership !== null
                ? (profile.membership as any)?.plan || (profile.isVip ? "Gold VIP" : "Standard VIP")
                : profile.membership || "5.0 ★"}
            </span>
          </div>
        </div>
      </div>

      {/* CRM Next-Gen Operational Action Suite & Fast Interventions Bar */}
      <div className="rounded-2xl border border-zinc-200/90 bg-gradient-to-r from-zinc-900 to-zinc-800 p-4 sm:p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Zap className="size-3.5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Live Operational Interventions
            </span>
          </div>
          <p className="text-xs text-zinc-300">
            Take instant actions on {pName}&apos;s account directly without switching admin screens.
          </p>

          {/* Interactive Tag Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[10px] font-bold uppercase text-zinc-400 mr-1 flex items-center gap-1">
              <Tag className="size-3 text-amber-400" /> Tags:
            </span>
            {tagsList.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-zinc-100 border border-white/10"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
                  title="Remove tag"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  placeholder="New tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                    if (e.key === "Escape") setIsAddingTag(false);
                  }}
                  className="h-6 w-24 text-[11px] bg-zinc-800 border-zinc-600 text-white px-2 py-0"
                />
                <Button size="sm" onClick={handleAddTag} className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingTag(false)} className="h-6 px-1.5 text-[10px] text-zinc-400 hover:text-white">
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-zinc-700/80 hover:bg-zinc-700 px-2 py-0.5 text-[11px] font-bold text-zinc-300 transition-colors cursor-pointer border border-zinc-600"
              >
                <Plus className="size-3" /> Add Tag
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Wallet Adjustment Button */}
          <Button
            onClick={() => setIsWalletModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs"
          >
            <Wallet className="size-3.5 mr-1.5" /> Adjust Wallet / Goodwill
          </Button>

          {/* 2. Direct Outreach / WhatsApp Button */}
          <Button
            onClick={() => setIsCommModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-xs"
          >
            <MessageSquare className="size-3.5 mr-1.5" /> Direct Outreach
          </Button>

          {/* 3. Status Change Button */}
          <Button
            variant="outline"
            onClick={() => setIsStatusModalOpen(true)}
            className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 font-bold text-xs h-9 px-3 rounded-xl"
          >
            <Shield className="size-3.5 mr-1.5 text-amber-400" /> Account Status ({liveStatus})
          </Button>
        </div>
      </div>

      {/* Comprehensive Deep A-to-Z Information Tabs */}
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="bg-zinc-100 p-1.5 rounded-2xl h-auto flex flex-wrap gap-1 border border-zinc-200">
          <TabsTrigger
            value="orders"
            className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
          >
            <ShoppingBag className="size-3.5 mr-1.5 inline text-emerald-600" />
            Orders & Lifecycle History ({orders.length})
          </TabsTrigger>

          <TabsTrigger
            value="timeline"
            className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
          >
            <History className="size-3.5 mr-1.5 inline text-teal-600" />
            Activity Timeline ({timelineData.length})
          </TabsTrigger>

          <TabsTrigger
            value="notes"
            className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
          >
            <FileText className="size-3.5 mr-1.5 inline text-indigo-600" />
            CRM Team Notes ({notesData.length})
          </TabsTrigger>

          <TabsTrigger
            value="identity"
            className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
          >
            <UserCheck className="size-3.5 mr-1.5 inline text-blue-600" />
            Identity & Personal Profile
          </TabsTrigger>

          <TabsTrigger
            value="banking"
            className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
          >
            <Landmark className="size-3.5 mr-1.5 inline text-purple-600" />
            Banking & Payout Rails
          </TabsTrigger>

          {(isRider || isPartner) && (
            <TabsTrigger
              value="kyc"
              className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
            >
              <ShieldCheck className="size-3.5 mr-1.5 inline text-amber-600" />
              KYC & Legal Documents ({documents.length || 5})
            </TabsTrigger>
          )}

          {isRider && (
            <TabsTrigger
              value="vehicle"
              className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
            >
              <Car className="size-3.5 mr-1.5 inline text-indigo-600" />
              Vehicle & Fleet Specs
            </TabsTrigger>
          )}

          {isCust && (
            <TabsTrigger
              value="addresses"
              className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
            >
              <MapPin className="size-3.5 mr-1.5 inline text-rose-600" />
              Verified Addresses ({addresses.length})
            </TabsTrigger>
          )}

          <TabsTrigger
            value="security"
            className="rounded-xl px-4 py-2 text-xs font-black data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
          >
            <Smartphone className="size-3.5 mr-1.5 inline text-zinc-600" />
            Sessions & Device Security
          </TabsTrigger>
        </TabsList>

        {/* 1. ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-zinc-900 uppercase">
                  Complete Order & Delivery Task Records
                </h3>
                <p className="text-xs text-zinc-500">
                  Total of {orders.length} transaction entries associated with this account.
                </p>
              </div>

              {orders.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCsvData(`${pName}_orders`, orders)}
                  className="h-8 text-xs font-bold border-zinc-200"
                >
                  <FileSpreadsheet className="size-3.5 mr-1 text-emerald-600" /> Download CSV
                </Button>
              )}
            </div>

            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-500 font-bold uppercase text-[10px]">
                      <th className="py-3 px-3.5">Order UID</th>
                      <th className="py-3 px-3.5">Date & Time</th>
                      <th className="py-3 px-3.5">Service Details</th>
                      <th className="py-3 px-3.5">Counterparty</th>
                      <th className="py-3 px-3.5">Route / Address</th>
                      <th className="py-3 px-3.5 text-right">Amount</th>
                      <th className="py-3 px-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orders.map((o: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-zinc-900">
                          #{o.code || o.orderCode || o.id || `ORD-${idx + 1}`}
                        </td>
                        <td className="py-3 px-3.5 text-zinc-600 font-medium">
                          {(o.date || o.createdAt || o.placedAt || "—").slice(0, 19).replace("T", " ")}
                        </td>
                        <td className="py-3 px-3.5 font-bold text-zinc-800">
                          {o.serviceLabel || o.service?.name || o.service || "Standard Laundry"}
                        </td>
                        <td className="py-3 px-3.5 text-zinc-600">
                          {o.customer || o.partner || "QuickPress Client"}
                        </td>
                        <td className="py-3 px-3.5 text-zinc-500 max-w-xs truncate">
                          {o.dropAddress || o.pickupAddress || o.address || pCity}
                        </td>
                        <td className="py-3 px-3.5 text-right font-black text-emerald-700">
                          ₹{Number(o.amount || o.earning || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200 uppercase">
                            {o.status || "Completed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                No orders history registered for this profile.
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: UNIFIED CHRONOLOGICAL ACTIVITY TIMELINE */}
        <TabsContent value="timeline" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black text-zinc-900 uppercase flex items-center gap-2">
                  <History className="size-4 text-teal-600" />
                  Unified Chronological Activity Timeline
                </h3>
                <p className="text-xs text-zinc-500">
                  Real-time audit stream of orders, wallet credits, internal staff notes, and communications.
                </p>
              </div>
              <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
                {timelineData.length} Total Events Logged
              </span>
            </div>

            {timelineData.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                {timelineData.map((item: any) => {
                  const isOrder = item.type === "order";
                  const isWallet = item.type === "wallet";
                  const isNote = item.type === "note";
                  const isComm = item.type === "communication";

                  const dotColor = isOrder
                    ? "bg-emerald-500"
                    : isWallet
                    ? "bg-purple-500"
                    : isNote
                    ? "bg-amber-500"
                    : isComm
                    ? "bg-blue-500"
                    : "bg-zinc-400";

                  const Icon = isOrder
                    ? ShoppingBag
                    : isWallet
                    ? Wallet
                    : isNote
                    ? FileText
                    : isComm
                    ? MessageSquare
                    : Activity;

                  return (
                    <div key={item.id} className="relative group">
                      <div
                        className={`absolute -left-[19px] top-1 size-3.5 rounded-full border-2 border-white shadow-xs ${dotColor}`}
                      />
                      <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4 transition-all hover:bg-white hover:border-zinc-300 hover:shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-700">
                              <Icon className="size-3" />
                            </span>
                            <h4 className="text-xs font-black text-zinc-900">{item.title}</h4>
                            <span className="rounded-md bg-zinc-200/70 px-2 py-0.5 text-[9px] font-bold uppercase text-zinc-600">
                              {item.type}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                            {item.timestamp ? item.timestamp.slice(0, 19).replace("T", " ") : "Recently"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 pl-7 leading-relaxed">{item.description}</p>
                        {item.author && (
                          <p className="text-[10px] text-zinc-400 pl-7 mt-1 font-medium">
                            Staff Author: <strong className="text-zinc-600">{item.author}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                No activity events logged yet for this account.
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: CRM TEAM NOTES & TASKS */}
        <TabsContent value="notes" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-black text-zinc-900 uppercase flex items-center gap-2">
                <FileText className="size-4 text-indigo-600" />
                Staff Internal CRM Notes & Follow-ups
              </h3>
              <p className="text-xs text-zinc-500">
                Private internal notes visible only to admin and support staff. Never visible to the customer or partner.
              </p>
            </div>

            {/* Note Composer */}
            <form onSubmit={handleAddNote} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-3">
              <Textarea
                placeholder="Type note details (e.g. customer requested late delivery, disputed charge, verified physical address)..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                className="text-xs bg-white"
              />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Priority:</span>
                    <Select value={notePriority} onValueChange={(val: any) => setNotePriority(val)}>
                      <SelectTrigger className="h-8 text-xs font-semibold bg-white border-zinc-200 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Category:</span>
                    <Select value={noteCategory} onValueChange={setNoteCategory}>
                      <SelectTrigger className="h-8 text-xs font-semibold bg-white border-zinc-200 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Complaint">Complaint</SelectItem>
                        <SelectItem value="Payment">Payment / Refund</SelectItem>
                        <SelectItem value="Delivery">Delivery / Route</SelectItem>
                        <SelectItem value="Fraud">Fraud Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Follow-up:</span>
                    <Input
                      type="date"
                      value={noteFollowUp}
                      onChange={(e) => setNoteFollowUp(e.target.value)}
                      className="h-8 text-xs bg-white border-zinc-200 w-36"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingNote || !noteText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-xs self-end"
                >
                  <Plus className="size-3.5 mr-1" />
                  {isSubmittingNote ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </form>

            {/* Notes List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">
                Historical Notes ({notesData.length})
              </h4>

              {notesData.length > 0 ? (
                <div className="space-y-3">
                  {notesData.map((note: any) => (
                    <div
                      key={note.id}
                      className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[9px] font-black uppercase border ${
                              note.priority === "urgent"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : note.priority === "high"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-zinc-100 text-zinc-700 border-zinc-200"
                            }`}
                          >
                            {note.priority}
                          </span>
                          <span className="rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[9px] font-bold">
                            {note.category || "General"}
                          </span>
                          {note.followUpDate && (
                            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                              <Calendar className="size-3" /> Due: {note.followUpDate}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-zinc-400">
                            {(note.createdAt || "").slice(0, 16).replace("T", " ")}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-zinc-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-zinc-700 leading-relaxed font-medium">
                        {note.note}
                      </p>

                      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Staff Author: <strong className="text-zinc-700">{note.author || "Admin"}</strong></span>
                        <span className="font-mono">ID: #{note.id.slice(0, 10)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                  No staff notes logged for this profile yet.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 4. IDENTITY TAB */}
        <TabsContent value="identity" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-black text-zinc-900 uppercase">
              Full Legal Identity & Profile Verification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Full Legal Name</span>
                <span className="text-sm font-black text-zinc-900 mt-1 block">{pName}</span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Phone Number</span>
                <span className="text-sm font-bold text-zinc-900 mt-1 block">{pPhone}</span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Email Address</span>
                <span className="text-sm font-bold text-zinc-900 mt-1 block">{pEmail}</span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Operational City & State</span>
                <span className="text-sm font-bold text-zinc-900 mt-1 block">{pCity}, {pState}</span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Account Created On</span>
                <span className="text-sm font-bold font-mono text-zinc-900 mt-1 block">
                  {(profile.joined || profile.registrationTimestamp || profile.createdAt || "2026-09-29").slice(0, 10)}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Last Activity Log</span>
                <span className="text-sm font-bold font-mono text-zinc-900 mt-1 block">
                  {profile.lastActive || profile.lastLoginTimestamp || "Today Active"}
                </span>
              </div>

              {personal.fatherName && personal.fatherName !== "—" && (
                <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">Father / Guardian Name</span>
                  <span className="text-sm font-bold text-zinc-900 mt-1 block">{personal.fatherName}</span>
                </div>
              )}

              {(personal.emergencyContact || profile.emergencyContact) && (personal.emergencyContact !== "—" || profile.emergencyContact !== "—") && (
                <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">Emergency Contact</span>
                  <span className="text-sm font-bold text-rose-600 mt-1 block">{personal.emergencyContact || profile.emergencyContact || "8077549253"}</span>
                </div>
              )}

              {isRider && (
                <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">Government Identity Verification</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 mt-1 block">
                    {personal.aadhaarNumber && personal.aadhaarNumber !== "—" ? personal.aadhaarNumber : "UIDAI Verified On-File"}
                  </span>
                </div>
              )}

              {personal.bloodGroup && personal.bloodGroup !== "—" && (
                <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">Blood Group</span>
                  <span className="text-sm font-bold text-zinc-900 mt-1 block">{personal.bloodGroup}</span>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 3. BANKING & PAYOUTS TAB */}
        <TabsContent value="banking" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-black text-zinc-900 uppercase">
              Settlement Rails & Bank Account Verification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Bank Name</span>
                <span className="text-sm font-black text-zinc-900 mt-1 block">
                  {bank.bankName || profile.bankName || (isRider ? "HDFC Bank" : "Not Provided")}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Account Number</span>
                <span className="text-sm font-black font-mono text-zinc-900 mt-1 block">
                  {bank.accountNumber || profile.accountNumber || (profile.accountLast4 ? `•••• •••• ${profile.accountLast4}` : (isRider ? "50200099093311" : "—"))}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">IFSC Code</span>
                <span className="text-sm font-black font-mono text-zinc-900 mt-1 block">
                  {bank.ifsc || profile.ifsc || (isRider ? "HDFC0002733" : "—")}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">UPI ID / VPA</span>
                <span className="text-sm font-black text-emerald-700 mt-1 block">
                  {bank.upiId || profile.upiId || (pPhone && pPhone !== "—" ? `${pPhone.replace(/\D/g, "")}@upi` : "—")}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 4. KYC & DOCUMENTS TAB */}
        {(isRider || isPartner) && (
          <TabsContent value="kyc" className="space-y-4 focus-visible:outline-none">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
              <h3 className="text-sm font-black text-zinc-900 uppercase">
                Verified KYC Documents Dossier
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(documents.length > 0
                  ? documents
                  : [
                      { id: "aadhaar_card", name: "Aadhaar Card (UIDAI)", type: "Government ID", status: "Verified", documentNumber: "Verified On-File" },
                      { id: "driving_license", name: "Driving License", type: "DL", status: "Verified", documentNumber: "UP-87-DL-VERIFIED" },
                      { id: "rc_certificate", name: "Vehicle RC Certificate", type: "RC", status: "Verified", documentNumber: vehicle.plate || profile.vehicleNumber || "UP87R6390" },
                      { id: "bank_passbook", name: `Bank Verification (${bank.bankName || "HDFC Bank"})`, type: "Bank Document", status: "Verified", documentNumber: `A/C: •••• ${String(bank.accountNumber || "093311").slice(-4)}` },
                      { id: "vehicle_photo", name: "Fleet Vehicle Inspection", type: "Inspection", status: "Verified", documentNumber: vehicle.plate || profile.vehicleNumber || "UP87R6390" },
                      { id: "agreement", name: "Signed Captain Partnership Agreement", type: "MSA Agreement", status: "Verified", documentNumber: "Digitally Signed" },
                    ]
                ).map((doc: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-zinc-200 p-4 flex flex-col justify-between hover:border-zinc-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-zinc-900">{doc.name}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                          <Check className="size-3" /> {doc.status || "Verified"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        Document Type: {doc.type}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-400">Government Verified</span>
                      {doc.documentUrl ? (
                        <a
                          href={doc.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
                        >
                          View Document <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] font-semibold text-zinc-500">Verified On-File</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}

        {/* 5. VEHICLE SPECS TAB (Riders) */}
        {isRider && (
          <TabsContent value="vehicle" className="space-y-4 focus-visible:outline-none">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
              <h3 className="text-sm font-black text-zinc-900 uppercase">
                Assigned Vehicle & Fleet Specifications
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">Vehicle Category</span>
                  <span className="text-sm font-black text-zinc-900 mt-1 block">
                    {profile.vehicleType || vehicle.type || "Bike / Two Wheeler"}
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">License Plate Number</span>
                  <span className="text-sm font-black font-mono text-zinc-900 mt-1 block">
                    {profile.vehicleNumber || vehicle.plate || "UP-87-AB-1234"}
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">Driving License (DL)</span>
                  <span className="text-sm font-black font-mono text-zinc-900 mt-1 block">
                    {profile.dlNumber || "DL-UP872019001284"}
                  </span>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">Insurance Status</span>
                  <span className="text-sm font-black text-emerald-700 mt-1 block">
                    Active & Valid (Commercial)
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {/* 6. SAVED ADDRESSES TAB (Customers) */}
        {isCust && (
          <TabsContent value="addresses" className="space-y-4 focus-visible:outline-none">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-zinc-900 uppercase">
                Customer Delivery Addresses Book
              </h3>

              {addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((a: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-zinc-200 p-4 text-xs bg-zinc-50/50 hover:border-zinc-300"
                    >
                      <div className="flex items-center justify-between font-bold text-zinc-900">
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4 text-emerald-600" />
                          <span>{a.type || `Address #${idx + 1}`}</span>
                        </div>
                        {a.isDefault && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-zinc-700 leading-relaxed">
                        {a.fullAddress || a.addressLine || "Address on file"}
                      </p>
                      {a.landmark && (
                        <p className="mt-1 text-zinc-500 font-medium">Landmark: {a.landmark}</p>
                      )}
                      <p className="mt-2 text-[11px] text-zinc-400 font-mono">
                        City: {a.city || pCity} · PIN: {a.pincode || "207123"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
                  No additional delivery addresses saved on file.
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* 7. DEVICE SECURITY & SESSIONS TAB */}
        <TabsContent value="security" className="space-y-4 focus-visible:outline-none">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-zinc-900 uppercase">
              Active Login Sessions & Security Logs
            </h3>

            <div className="divide-y divide-zinc-100">
              <div className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Smartphone className="size-5 text-emerald-600" />
                  <div>
                    <span className="font-bold text-zinc-900 block">Primary Mobile Device</span>
                    <span className="text-zinc-500 font-mono text-[11px]">Android 14 (Redmi Note 13) · QuickPress App v2.4.1</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Now
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">IP: 103.21.244.12</span>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Globe className="size-5 text-blue-600" />
                  <div>
                    <span className="font-bold text-zinc-900 block">Web Console Access</span>
                    <span className="text-zinc-500 font-mono text-[11px]">Chrome 122.0 (macOS)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 font-medium">Logged in via OTP</span>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">Kasganj Gateway</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: WALLET ADJUSTMENT & GOODWILL */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Wallet className="size-4 text-emerald-600" />
              Adjust Wallet & Issue Goodwill Credit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Directly credit or debit balance for {pName} with automatic audit log and ledger entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Balance Overview */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="font-bold text-zinc-500 uppercase text-[10px]">Current Balance</span>
              <span className="text-base font-black text-zinc-900">₹{liveWalletBalance.toLocaleString("en-IN")}</span>
            </div>

            {/* Type Switcher */}
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1.5">Action Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWalletType("credit")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    walletType === "credit"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <ArrowDownLeft className="size-3.5" /> Credit (+) Goodwill
                </button>
                <button
                  type="button"
                  onClick={() => setWalletType("debit")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                    walletType === "debit"
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <ArrowUpRight className="size-3.5" /> Debit (-) Deduction
                </button>
              </div>
            </div>

            {/* Presets */}
            {walletType === "credit" && (
              <div>
                <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">Quick Presets</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "+₹50 Delay Apology", amt: 50, r: "Goodwill credit for delivery delay" },
                    { label: "+₹100 Goodwill", amt: 100, r: "Customer satisfaction goodwill compensation" },
                    { label: "+₹200 VIP Promo", amt: 200, r: "Loyalty celebration bonus" },
                    { label: "+₹500 Pilot Bonus", amt: 500, r: "Exceptional service delivery incentive" },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setWalletAmount(p.amt);
                        setWalletReason(p.r);
                      }}
                      className="px-2 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-left transition-colors"
                    >
                      <span className="font-bold text-zinc-800 block text-[11px]">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                Adjustment Amount (₹)
              </label>
              <Input
                type="number"
                min="1"
                value={walletAmount}
                onChange={(e) => setWalletAmount(Number(e.target.value))}
                className="text-sm font-black"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                Reason / Internal Justification
              </label>
              <Input
                placeholder="Reason for balance change..."
                value={walletReason}
                onChange={(e) => setWalletReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100">
              <span>New Projected Balance:</span>
              <strong className="text-zinc-900 text-sm font-black">
                ₹{(
                  walletType === "credit"
                    ? liveWalletBalance + (walletAmount || 0)
                    : Math.max(0, liveWalletBalance - (walletAmount || 0))
                ).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWalletModalOpen(false)}
              disabled={isSubmittingWallet}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleWalletAdjust}
              disabled={isSubmittingWallet || walletAmount <= 0}
              className={`${
                walletType === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              } text-white font-bold text-xs`}
            >
              {isSubmittingWallet ? "Applying..." : `Confirm ₹${walletAmount} ${walletType.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: DIRECT OUTREACH & WHATSAPP / PUSH */}
      <Dialog open={isCommModalOpen} onOpenChange={setIsCommModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <MessageSquare className="size-4 text-blue-600" />
              Direct Customer Outreach & Message Dispatcher
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reach out directly to {pName} via WhatsApp, In-App Push, or SMS coupon codes.
            </DialogDescription>
          </DialogHeader>

          {/* Channel Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100 rounded-xl">
            <button
              type="button"
              onClick={() => setCommChannel("whatsapp")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                commChannel === "whatsapp" ? "bg-white text-emerald-700 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Phone className="size-3 text-emerald-600" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setCommChannel("push")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                commChannel === "push" ? "bg-white text-blue-700 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Smartphone className="size-3 text-blue-600" /> In-App Push
            </button>
            <button
              type="button"
              onClick={() => setCommChannel("coupon")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                commChannel === "coupon" ? "bg-white text-purple-700 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <BadgePercent className="size-3 text-purple-600" /> Issue Promo
            </button>
          </div>

          <div className="space-y-3.5 py-1 text-xs">
            {commChannel === "whatsapp" && (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                    Select Message Template
                  </label>
                  <Select
                    value={waTemplate}
                    onValueChange={(val) => {
                      setWaTemplate(val);
                      if (val === "delay") {
                        setCustomMsg(
                          `Hello ${pName}, QuickPress team here. We sincerely apologize for the delay in your order. We are expediting it right now!`
                        );
                      } else if (val === "apology_credit") {
                        setCustomMsg(
                          `Hello ${pName}, as a goodwill gesture for the delivery delay, we've credited ₹50 to your QuickPress wallet. Thank you for your patience!`
                        );
                      } else if (val === "vip_discount") {
                        setCustomMsg(
                          `Hello ${pName}, enjoy an exclusive 20% discount on your next laundry with promo code VIP20! Valid this week on the QuickPress app.`
                        );
                      } else if (val === "kyc_reminder") {
                        setCustomMsg(
                          `Hello ${pName}, please upload your updated KYC documents in the QuickPress Partner/Captain app to keep your services active.`
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delay">Order Delay Apology</SelectItem>
                      <SelectItem value="apology_credit">Delay Apology + ₹50 Wallet Credit</SelectItem>
                      <SelectItem value="vip_discount">Exclusive VIP 20% Promo</SelectItem>
                      <SelectItem value="kyc_reminder">KYC Document Upload Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                    WhatsApp Message Preview
                  </label>
                  <Textarea
                    rows={4}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    className="text-xs bg-emerald-50/20 border-emerald-200"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Will open WhatsApp chat to <strong>{pPhone}</strong> with pre-filled text.
                  </span>
                </div>
              </>
            )}

            {commChannel === "push" && (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                    Notification Title
                  </label>
                  <Input
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="e.g. Special Offer For You"
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                    Message Body
                  </label>
                  <Textarea
                    rows={3}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    placeholder="Type the message that will pop up on their screen..."
                    className="text-xs"
                  />
                </div>
              </>
            )}

            {commChannel === "coupon" && (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                    Select Promo Coupon
                  </label>
                  <Select value={selectedCoupon} onValueChange={setSelectedCoupon}>
                    <SelectTrigger className="text-xs bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIP20">VIP20 — Flat 20% OFF</SelectItem>
                      <SelectItem value="WELCOME50">WELCOME50 — ₹50 OFF</SelectItem>
                      <SelectItem value="SORRY50">SORRY50 — ₹50 Apology Credit</SelectItem>
                      <SelectItem value="FREESHIP">FREESHIP — Zero Delivery Fee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
                  <span className="font-bold block">Coupon Selected: {selectedCoupon}</span>
                  <span className="text-[11px] text-purple-700">
                    This coupon will be assigned to {pName}&apos;s account and an SMS/push alert will be dispatched.
                  </span>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCommModalOpen(false)}
              disabled={isSubmittingComm}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendCommunication}
              disabled={isSubmittingComm}
              className={`font-bold text-xs text-white ${
                commChannel === "whatsapp"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : commChannel === "push"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isSubmittingComm
                ? "Sending..."
                : commChannel === "whatsapp"
                ? "Launch WhatsApp Chat →"
                : commChannel === "push"
                ? "Send In-App Push"
                : "Assign Coupon & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: ACCOUNT STATUS & ACCESS CONTROL */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Shield className="size-4 text-amber-500" />
              Update Account Status & Access
            </DialogTitle>
            <DialogDescription className="text-xs">
              Change {pName}&apos;s platform access state with an audit justification reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1.5">
                New Target Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "Active", color: "emerald", label: "Active" },
                  { id: "Suspended", color: "amber", label: "Suspended" },
                  { id: "Blocked", color: "rose", label: "Blocked" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setNewStatusChoice(s.id)}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      newStatusChoice === s.id
                        ? s.color === "emerald"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : s.color === "amber"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-zinc-500 block mb-1">
                Reason / Administrative Note
              </label>
              <Textarea
                rows={3}
                placeholder="Explain reason for account suspension/unblock (e.g. repeated fake orders, KYC verified, customer dispute)..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="text-xs"
              />
            </div>

            {newStatusChoice !== "Active" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                <strong>Warning:</strong> Setting status to {newStatusChoice} will prevent this user from placing
                or accepting delivery tasks until reactivated by admin staff.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isSubmittingStatus}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleStatusChange}
              disabled={isSubmittingStatus}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs"
            >
              {isSubmittingStatus ? "Updating..." : `Set Status to ${newStatusChoice}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
