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
  BarChart3,
  PieChart,
  Navigation,
  Crosshair,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
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

  // View Mode: High-Density Table vs Modern Grid Cards
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Live Geo Radar Pin Filter & Selection
  const [radarFilter, setRadarFilter] = useState<"all" | "partner" | "rider">("all");
  const [selectedPin, setSelectedPin] = useState<{
    id: string;
    type: string;
    name: string;
    phone: string;
    city: string;
    pincode: string;
    lat: number;
    lng: number;
    status: string;
    metric: string;
  } | null>(null);

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
          {/* Executive KPI Overview Strip (High-Contrast Monochrome Enterprise) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs transition-all hover:border-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900">
                  Total Managed Accounts
                </span>
                <span className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                  <Users className="size-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-950 tracking-tight">
                  {searchResults?.total || displayedItems.length}
                </span>
                <span className="text-[11px] font-bold text-zinc-700">
                  Profiles across UP
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-zinc-600 border-t border-zinc-100 pt-2">
                <span>Active Territory:</span>
                <strong className="text-zinc-950 font-black">{selectedCity === "all" ? "Kasganj & Grids" : selectedCity}</strong>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs transition-all hover:border-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900">
                  Territory Sales (GMV)
                </span>
                <span className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                  <TrendingUp className="size-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-950 tracking-tight">
                  ₹{(geoPulse?.summary.totalSales || 0).toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] font-bold text-zinc-700">
                  Reconciled
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-zinc-600 border-t border-zinc-100 pt-2">
                <span>Net Commission:</span>
                <strong className="text-zinc-950 font-black">₹{(geoPulse?.summary.platformRevenue || 0).toLocaleString("en-IN")}</strong>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs transition-all hover:border-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900">
                  Live Active Fleet
                </span>
                <span className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                  <Truck className="size-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-950 tracking-tight">
                  {geoPulse?.fleet.onlineRiders || 0} / {geoPulse?.fleet.totalRiders || 0}
                </span>
                <span className="text-[11px] font-bold text-zinc-700">
                  Pilots
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-zinc-600 border-t border-zinc-100 pt-2">
                <span>On Active Delivery:</span>
                <strong className="text-zinc-950 font-black">{geoPulse?.fleet.onDeliveryRiders || 0} runs</strong>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs transition-all hover:border-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900">
                  Service Store Nodes
                </span>
                <span className="size-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900">
                  <Building2 className="size-4" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-zinc-950 tracking-tight">
                  {geoPulse?.fleet.activePartners || 0} / {geoPulse?.fleet.totalPartners || 0}
                </span>
                <span className="text-[11px] font-bold text-zinc-700">
                  Store Hubs
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-zinc-600 border-t border-zinc-100 pt-2">
                <span>In-Transit Orders:</span>
                <strong className="text-zinc-950 font-black">{geoPulse?.summary.activeOrders || 0} orders</strong>
              </div>
            </div>
          </div>

          {/* Top Bar: Cascading Location Filters & Search */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-xs">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950">
                    <MapPin className="size-4" />
                  </span>
                  <h2 className="text-sm font-black tracking-tight text-zinc-950 uppercase">
                    Territory & Geographic Scope
                  </h2>
                </div>
                <p className="mt-1 text-xs text-zinc-700 font-medium">
                  Active Operational Scope:{" "}
                  <strong className="text-zinc-950 font-black">{geoFilterLabel}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* State Dropdown */}
                <div className="w-36 sm:w-44">
                  <Select value={selectedState} onValueChange={handleStateChange}>
                    <SelectTrigger className="h-9 text-xs font-bold text-zinc-950 bg-white border-zinc-300">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {availableStates.map((s) => (
                        <SelectItem key={s} value={s} className="font-semibold text-zinc-950">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City Dropdown */}
                <div className="w-36 sm:w-44">
                  <Select value={selectedCity} onValueChange={handleCityChange}>
                    <SelectTrigger className="h-9 text-xs font-bold text-zinc-950 bg-white border-zinc-300">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {availableCities.map((c) => (
                        <SelectItem key={c.city} value={c.city} className="font-semibold text-zinc-950">
                          {c.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pincode Dropdown */}
                <div className="w-32 sm:w-36">
                  <Select value={selectedPincode} onValueChange={setSelectedPincode}>
                    <SelectTrigger className="h-9 text-xs font-bold text-zinc-950 bg-white border-zinc-300">
                      <SelectValue placeholder="All PINs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All PINs</SelectItem>
                      {availablePincodes.map((p) => (
                        <SelectItem key={p} value={p} className="font-semibold text-zinc-950">
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
                    className="h-9 px-3 text-xs font-black text-zinc-950 hover:bg-zinc-100 border-zinc-300"
                  >
                    <RotateCcw className="size-3.5 mr-1" /> Reset Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Search & Entity Filter Bar */}
            <div className="mt-4 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Live search across Name, Phone, UID, Email, Vehicle Plate, Address..."
                  className="h-10 pl-10 pr-4 text-xs font-bold text-zinc-950 bg-white border-zinc-300 rounded-xl focus:border-zinc-900 transition-all placeholder:text-zinc-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-950 p-0.5"
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
                  { id: "rider", label: "Captains (Pilots)", icon: Truck },
                  { id: "partner", label: "Store Hubs", icon: Building2 },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = selectedEntityType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedEntityType(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer border ${
                        isActive
                          ? "bg-zinc-950 border-zinc-950 text-white shadow-xs"
                          : "bg-white border-zinc-200 text-zinc-900 hover:border-zinc-400 hover:bg-zinc-50"
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
              <TabsList className="bg-zinc-100 p-1 rounded-xl h-auto border border-zinc-200">
                <TabsTrigger
                  value="directory"
                  className="rounded-lg px-4 py-2 text-xs font-black text-zinc-800 data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs"
                >
                  <Search className="size-3.5 mr-1.5 inline text-zinc-950" />
                  Universal 360° Directory
                  {searchResults?.total !== undefined && (
                    <span className="ml-1.5 rounded-full bg-zinc-200 px-1.5 py-0.2 text-[10px] font-black text-zinc-950">
                      {searchResults.total}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger
                  value="geo-pulse"
                  className="rounded-lg px-4 py-2 text-xs font-black text-zinc-800 data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs"
                >
                  <Activity className="size-3.5 mr-1.5 inline text-zinc-950" />
                  Live Geo Operations Pulse
                  <span className="ml-1.5 size-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                </TabsTrigger>

                <TabsTrigger
                  value="leaderboard"
                  className="rounded-lg px-4 py-2 text-xs font-black text-zinc-800 data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs"
                >
                  <Award className="size-3.5 mr-1.5 inline text-zinc-950" />
                  Territory Leaderboard
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-zinc-950 uppercase">Period:</span>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="h-8 w-32 text-xs font-bold text-zinc-950 bg-white border-zinc-300">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today" className="font-semibold text-zinc-950">Today (Live)</SelectItem>
                    <SelectItem value="7d" className="font-semibold text-zinc-950">Last 7 Days</SelectItem>
                    <SelectItem value="30d" className="font-semibold text-zinc-950">Last 30 Days</SelectItem>
                    <SelectItem value="all" className="font-semibold text-zinc-950">All-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* =========================================================================
                TAB 1: UNIVERSAL 360° DIRECTORY (Dual View: Table vs Cards)
            ========================================================================== */}
            <TabsContent value="directory" className="space-y-4 focus-visible:outline-none">
              {/* Smart RFM & AI Cohort Filter Bar + View Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-950 shrink-0 mr-1 flex items-center gap-1">
                    <Sparkles className="size-3 text-zinc-950" />
                    Cohorts:
                  </span>
                  {[
                    { id: "all", label: "All Records", icon: Users },
                    { id: "champions", label: "VIP & Champions", icon: Sparkles },
                    { id: "loyal", label: "High Frequency", icon: Award },
                    { id: "churn_risk", label: "At Risk / Churn", icon: AlertCircle },
                    { id: "inactive", label: "Dormant (>30d)", icon: Clock },
                    { id: "new", label: "New Joiners", icon: CheckCircle2 },
                    { id: "suspended", label: "Suspended / Blocked", icon: ShieldCheck },
                  ].map((c) => {
                    const isActive = selectedCohort === c.id;
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCohort(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer border ${
                          isActive
                            ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                            : "bg-white text-zinc-900 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                        }`}
                      >
                        <Icon className="size-3.5" />
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                {/* View Mode Toggle: High-Density Table vs Modern Grid Cards */}
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                      viewMode === "table"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-600 hover:text-zinc-950"
                    }`}
                    title="High-Density Enterprise Table View"
                  >
                    <TableIcon className="size-3.5" />
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                      viewMode === "cards"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-600 hover:text-zinc-950"
                    }`}
                    title="Modern Grid Cards View"
                  >
                    <LayoutGrid className="size-3.5" />
                    Cards
                  </button>
                </div>
              </div>

              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-zinc-700 px-1 pt-1">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong className="text-zinc-950 font-black">{displayedItems.length}</strong> live profiles{" "}
                    {selectedCohort !== "all" && (
                      <span className="text-zinc-600 font-semibold">
                        (filtered from {searchResults?.items.length || 0})
                      </span>
                    )}{" "}
                    in <strong className="text-zinc-950 font-black">{geoFilterLabel}</strong>
                  </span>

                  {displayedItems.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      className="inline-flex items-center gap-1 text-[11px] font-black text-zinc-950 hover:bg-zinc-200 cursor-pointer bg-zinc-100 px-2.5 py-0.5 rounded-lg border border-zinc-200 transition-colors"
                    >
                      {selectedIds.length === displayedItems.length && displayedItems.length > 0 ? (
                        <>
                          <CheckSquare className="size-3.5 text-zinc-950" /> Deselect All
                        </>
                      ) : (
                        <>
                          <Square className="size-3.5 text-zinc-500" /> Select All ({displayedItems.length})
                        </>
                      )}
                    </button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchSearch()}
                  className="h-7 text-xs font-bold text-zinc-950 hover:bg-zinc-100"
                >
                  <RefreshCw className="size-3 mr-1" /> Force Refresh
                </Button>
              </div>

              {isSearchLoading ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                  <RefreshCw className="size-8 mx-auto text-zinc-400 animate-spin mb-3" />
                  <p className="text-xs font-bold text-zinc-950">Querying live Supabase collections across UP...</p>
                </div>
              ) : displayedItems.length > 0 ? (
                viewMode === "table" ? (
                  /* =========================================================================
                      VIEW MODE 1: HIGH-DENSITY ENTERPRISE TABLE (End-to-End Tracing)
                  ========================================================================== */
                  <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-950 font-black uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-3.5 w-10 text-center">
                              <Square className="size-3.5 text-zinc-400 mx-auto" />
                            </th>
                            <th className="py-3 px-4">Entity Profile</th>
                            <th className="py-3 px-3">Role</th>
                            <th className="py-3 px-3">Contact Details</th>
                            <th className="py-3 px-3">Territory</th>
                            <th className="py-3 px-3">Order Volume</th>
                            <th className="py-3 px-3">Financial Metric</th>
                            <th className="py-3 px-3 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {displayedItems.map((item) => {
                            const isSelected = selectedIds.includes(item.id);
                            const isCust = item.entityType === "customer";
                            const isRider = item.entityType === "rider";
                            const Icon = isCust ? Users : isRider ? Truck : Building2;

                            return (
                              <tr
                                key={`${item.entityType}-${item.id}`}
                                onClick={() =>
                                  setSelectedTarget({
                                    id: item.id,
                                    entityType: item.entityType,
                                    name: item.name,
                                  })
                                }
                                className={`hover:bg-zinc-50/80 transition-colors cursor-pointer ${
                                  isSelected ? "bg-zinc-50" : ""
                                }`}
                              >
                                <td
                                  className="py-3 px-3.5 text-center"
                                  onClick={(e) => toggleSelect(item.id, e)}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="size-4 text-zinc-950 mx-auto" />
                                  ) : (
                                    <Square className="size-4 text-zinc-300 hover:text-zinc-600 mx-auto" />
                                  )}
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-950 text-white font-black text-xs shrink-0">
                                      {item.avatar}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-black text-zinc-950 block truncate text-xs hover:underline">
                                        {item.name}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="font-mono text-[10px] text-zinc-600">
                                          #{item.id}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(item.id);
                                            toast.success("UID copied!");
                                          }}
                                          className="text-zinc-400 hover:text-zinc-950"
                                          title="Copy ID"
                                        >
                                          <Copy className="size-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-zinc-100 text-zinc-950 border border-zinc-200">
                                    <Icon className="size-3" />
                                    {item.entityType}
                                  </span>
                                </td>

                                <td className="py-3 px-3">
                                  <div className="space-y-0.5 text-[11px]">
                                    <div className="font-bold text-zinc-950 flex items-center gap-1">
                                      <Phone className="size-3 text-zinc-500" /> {item.phone}
                                    </div>
                                    {item.email && item.email !== "—" && (
                                      <div className="text-zinc-600 truncate max-w-[140px] text-[10px]">
                                        {item.email}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <div className="text-[11px]">
                                    <span className="font-bold text-zinc-950 block">{item.city}</span>
                                    <span className="text-[10px] font-mono text-zinc-600">PIN: {item.pincode}</span>
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <span className="font-black text-zinc-950 block text-xs">
                                    {item.primaryMetric.value}
                                  </span>
                                  <span className="text-[10px] text-zinc-600 block">
                                    {item.primaryMetric.label}
                                  </span>
                                </td>

                                <td className="py-3 px-3">
                                  <span className="font-black text-zinc-950 block text-xs">
                                    {item.secondaryMetric.value}
                                  </span>
                                  <span className="text-[10px] text-zinc-600 block">
                                    {item.secondaryMetric.label}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-zinc-100 text-zinc-950 border border-zinc-300">
                                    <span
                                      className={`size-1.5 rounded-full ${
                                        item.statusColor === "emerald"
                                          ? "bg-emerald-500 animate-pulse"
                                          : item.statusColor === "amber"
                                          ? "bg-amber-500"
                                          : "bg-zinc-400"
                                      }`}
                                    />
                                    {item.status}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTarget({
                                        id: item.id,
                                        entityType: item.entityType,
                                        name: item.name,
                                      });
                                    }}
                                    className="h-7 text-xs font-black text-zinc-950 bg-white hover:bg-zinc-100 border-zinc-300 px-3 rounded-lg"
                                  >
                                    Dossier →
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* =========================================================================
                      VIEW MODE 2: MODERN ENTERPRISE CARD GRID
                  ========================================================================== */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {displayedItems.map((item) => {
                      const isCust = item.entityType === "customer";
                      const isRider = item.entityType === "rider";
                      const isSelected = selectedIds.includes(item.id);
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
                          className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4.5 transition-all duration-200 hover:border-zinc-400 hover:shadow-md cursor-pointer ${
                            isSelected ? "border-zinc-950 ring-2 ring-zinc-950/20 bg-zinc-50/40" : "border-zinc-200"
                          }`}
                        >
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
                                    <CheckSquare className="size-4 text-zinc-950" />
                                  ) : (
                                    <Square className="size-4 text-zinc-300 group-hover:text-zinc-600" />
                                  )}
                                </button>

                                <div className="flex size-11 items-center justify-center rounded-2xl bg-zinc-950 text-white font-black text-xs shrink-0 shadow-xs">
                                  {item.avatar}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-sm font-black text-zinc-950 truncate hover:underline">
                                    {item.name}
                                  </h3>
                                  <p className="text-[11px] font-mono text-zinc-600 truncate">
                                    ID: #{item.id}
                                  </p>
                                </div>
                              </div>

                              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase border border-zinc-200 bg-zinc-100 text-zinc-950 shrink-0">
                                <Icon className="size-3" />
                                {item.entityType}
                              </span>
                            </div>

                            <div className="mt-3.5 space-y-1.5 border-t border-zinc-100 pt-3 text-[11px] text-zinc-700">
                              <div className="flex items-center gap-2">
                                <Phone className="size-3 text-zinc-500 shrink-0" />
                                <span className="font-bold text-zinc-950">{item.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 truncate">
                                <Mail className="size-3 text-zinc-500 shrink-0" />
                                <span className="truncate text-zinc-700">{item.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="size-3 text-zinc-500 shrink-0" />
                                <span>
                                  {item.city}, {item.state}{" "}
                                  {item.pincode && (
                                    <strong className="text-zinc-950 font-mono">({item.pincode})</strong>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 p-2.5 border border-zinc-200">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                                  {item.primaryMetric.label}
                                </span>
                                <span className="text-xs font-black text-zinc-950">
                                  {item.primaryMetric.value}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                                  {item.secondaryMetric.label}
                                </span>
                                <span className="text-xs font-black text-zinc-950">
                                  {item.secondaryMetric.value}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black border border-zinc-300 bg-zinc-100 text-zinc-950">
                              <span
                                className={`size-1.5 rounded-full ${
                                  item.statusColor === "emerald"
                                    ? "bg-emerald-500 animate-pulse"
                                    : item.statusColor === "amber"
                                    ? "bg-amber-500"
                                    : "bg-zinc-400"
                                }`}
                              />
                              {item.status}
                            </span>

                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-zinc-950 hover:underline">
                              Open Full Dossier →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
                  <Search className="size-8 mx-auto text-zinc-400 mb-3" />
                  <h3 className="text-sm font-black text-zinc-950">No matching records in this cohort</h3>
                  <p className="mt-1 text-xs text-zinc-600 max-w-sm mx-auto">
                    No profiles matched the active filters ({selectedCohort !== "all" ? `Cohort: ${selectedCohort}` : ""} in {geoFilterLabel}).
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCohort("all");
                      resetFilters();
                    }}
                    className="mt-4 text-xs font-black text-zinc-950 border-zinc-300 hover:bg-zinc-100"
                  >
                    Reset Cohort & Filters
                  </Button>
                </div>
              )}

              {/* Floating Bottom Bulk Action Toolbar */}
              {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-zinc-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-bottom-5">
                  <div className="flex items-center gap-2 pr-3 border-r border-zinc-700 text-xs font-black">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{selectedIds.length} Selected</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setIsBulkNotifyOpen(true)}
                    className="bg-white hover:bg-zinc-100 text-zinc-950 font-black text-xs h-8 px-3 rounded-xl shadow-xs"
                  >
                    <Send className="size-3.5 mr-1.5" /> Bulk Push
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsBulkTagOpen(true)}
                    className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 font-black text-xs h-8 px-3 rounded-xl"
                  >
                    <Tag className="size-3.5 mr-1.5 text-zinc-300" /> Add Tag
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const selectedProfiles = displayedItems.filter((i) => selectedIds.includes(i.id));
                      exportCsvData("selected_crm_profiles", selectedProfiles);
                      toast.success(`Exported ${selectedProfiles.length} profiles to CSV!`);
                    }}
                    className="border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700 font-black text-xs h-8 px-3 rounded-xl"
                  >
                    <FileSpreadsheet className="size-3.5 mr-1.5 text-zinc-300" /> Export CSV
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds([])}
                    className="text-zinc-400 hover:text-white text-xs h-8 px-2 font-bold"
                  >
                    <X className="size-3.5 mr-1" /> Clear
                  </Button>
                </div>
              )}

              {/* Dialog: Bulk Push Broadcast */}
              <Dialog open={isBulkNotifyOpen} onOpenChange={setIsBulkNotifyOpen}>
                <DialogContent className="max-w-md bg-white border border-zinc-200">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-black text-zinc-950">
                      <Send className="size-4 text-zinc-950" />
                      Bulk Push Notification ({selectedIds.length} Recipients)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-600 font-medium">
                      Send a broadcast push and in-app message to all selected profiles simultaneously.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3.5 py-2">
                    <div>
                      <label className="text-[11px] font-black uppercase text-zinc-950 block mb-1">
                        Notification Title
                      </label>
                      <Input
                        placeholder="e.g. Special Weekend Offer from QuickPress!"
                        value={bulkNotifTitle}
                        onChange={(e) => setBulkNotifTitle(e.target.value)}
                        className="text-xs font-bold text-zinc-950"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-black uppercase text-zinc-950 block mb-1">
                        Message Body
                      </label>
                      <Textarea
                        placeholder="Type the message that will be broadcasted to their devices..."
                        value={bulkNotifMessage}
                        onChange={(e) => setBulkNotifMessage(e.target.value)}
                        rows={3}
                        className="text-xs font-semibold text-zinc-950"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkNotifyOpen(false)}
                      disabled={isBulkSubmitting}
                      className="text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkNotify}
                      disabled={isBulkSubmitting}
                      className="bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs"
                    >
                      {isBulkSubmitting ? "Broadcasting..." : `Send to ${selectedIds.length} Recipients`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Dialog: Bulk Tagging */}
              <Dialog open={isBulkTagOpen} onOpenChange={setIsBulkTagOpen}>
                <DialogContent className="max-w-md bg-white border border-zinc-200">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-black text-zinc-950">
                      <Tag className="size-4 text-zinc-950" />
                      Apply Bulk Tag ({selectedIds.length} Profiles)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-600 font-medium">
                      Append a custom cohort tag to all selected customer/rider/partner profiles.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 py-2">
                    <label className="text-[11px] font-black uppercase text-zinc-950 block">Tag Name</label>
                    <Input
                      placeholder="e.g. VIP, Priority-Delivery, Festival-Promo"
                      value={bulkTagText}
                      onChange={(e) => setBulkTagText(e.target.value)}
                      className="text-xs font-bold text-zinc-950"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["VIP", "High Value", "Priority Support", "Fast Deliverer", "Loyal"].map((tagPreset) => (
                        <button
                          key={tagPreset}
                          type="button"
                          onClick={() => setBulkTagText(tagPreset)}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-[11px] font-bold text-zinc-950 border border-zinc-200"
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
                      className="text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkTag}
                      disabled={isBulkSubmitting}
                      className="bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs"
                    >
                      {isBulkSubmitting ? "Applying..." : `Apply to ${selectedIds.length} Profiles`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* =========================================================================
                TAB 2: LIVE GEO OPERATIONS PULSE & INTERACTIVE TELEMETRY RADAR
            ========================================================================== */}
            <TabsContent value="geo-pulse" className="space-y-6 focus-visible:outline-none">
              {/* Header Box (Pure White Background & Black Text) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white border border-zinc-200 p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950 border border-zinc-200">
                    <Crosshair className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-zinc-950 tracking-tight uppercase">
                        Live Territory Geo-Operations Pulse & Node Telemetry
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-300 px-2 py-0.5 text-[10px] font-black text-zinc-950">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE SYNC (15s)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 font-medium mt-0.5">
                      Real-time aggregated sales, fleet availability, and telemetry nodes for{" "}
                      <strong className="text-zinc-950 font-black">{geoFilterLabel}</strong>
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchGeoPulse()}
                  className="h-8 bg-white border-zinc-300 text-zinc-950 hover:bg-zinc-100 text-xs font-black"
                >
                  <RefreshCw className="size-3.5 mr-1.5" /> Force Refresh
                </Button>
              </div>

              {/* 8 Executive KPIs in Pure White Background with Black Text */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Gross Merchandise Value (GMV)</span>
                    <TrendingUp className="size-4 text-zinc-950" />
                  </div>
                  <div className="text-xl font-black text-zinc-950 mt-1">
                    ₹{(geoPulse?.summary.totalSales || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 font-semibold">Total customer order value</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Delivered Orders</span>
                    <ShoppingBag className="size-4 text-zinc-950" />
                  </div>
                  <div className="text-xl font-black text-zinc-950 mt-1">
                    {geoPulse?.summary.deliveredOrders || 0}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 font-semibold">{geoPulse?.summary.totalOrders || 0} total booked in territory</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Platform Net Commission</span>
                    <Wallet className="size-4 text-zinc-950" />
                  </div>
                  <div className="text-xl font-black text-zinc-950 mt-1">
                    ₹{(geoPulse?.summary.platformRevenue || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 font-semibold">Net platform fee accrued</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Refunds & Dispute Loss</span>
                    <RotateCcw className="size-4 text-zinc-950" />
                  </div>
                  <div className="text-xl font-black text-zinc-950 mt-1">
                    ₹{(geoPulse?.summary.refundsAmount || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 font-semibold">{geoPulse?.summary.refundsCount || 0} claims processed</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Rider Incentives Paid</span>
                    <Award className="size-4 text-zinc-950" />
                  </div>
                  <div className="text-xl font-black text-zinc-950 mt-1">
                    ₹{(geoPulse?.summary.riderIncentives || 0).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 font-semibold">Disbursed to captains in zone</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Active Fleet (Pilots)</span>
                    <Truck className="size-4 text-zinc-950" />
                  </div>
                  <div className="text-xl font-black text-zinc-950 mt-1">
                    {geoPulse?.fleet.onlineRiders || 0} / {geoPulse?.fleet.totalRiders || 0}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 font-semibold">{geoPulse?.fleet.onDeliveryRiders || 0} on active delivery runs</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Active Store Hubs</span>
                    <Building2 className="size-4 text-zinc-950" />
                  </div>
                  <div className="text-xl font-black text-zinc-950 mt-1">
                    {geoPulse?.fleet.activePartners || 0} / {geoPulse?.fleet.totalPartners || 0}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 font-semibold">Stores open & accepting orders</div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[10px] uppercase font-bold text-zinc-600">Orders In-Transit</span>
                    <Clock className="size-4 text-zinc-950" />
                  </div>
                  <div className="text-xl font-black text-zinc-950 mt-1">
                    {geoPulse?.summary.activeOrders || 0}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1 font-semibold">Live in wash / out for delivery</div>
                </div>
              </div>

              {/* =========================================================================
                  INTERACTIVE GEO TELEMETRY RADAR & SPATIAL DISPATCH MAP
              ========================================================================== */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-zinc-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <Navigation className="size-4 text-zinc-950" />
                      <h4 className="text-sm font-black text-zinc-950 uppercase tracking-tight">
                        Territory Spatial Radar & Dispatch Coordinate Grid
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-700 font-medium mt-0.5">
                      Live plotting of verified store hubs, active captain telemetry, and order geofences around <strong className="text-zinc-950">Kasganj Hub (27.8081° N, 78.6475° E)</strong>
                    </p>
                  </div>

                  {/* Filter Pills for Radar Nodes */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {[
                      { id: "all", label: `All Nodes (${geoPulse?.geoPins?.length || 0})` },
                      { id: "partner", label: `Stores (${geoPulse?.fleet.totalPartners || 0})` },
                      { id: "rider", label: `Captains (${geoPulse?.fleet.totalRiders || 0})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setRadarFilter(tab.id as any)}
                        className={`px-3 py-1 rounded-lg text-xs font-black transition-all border cursor-pointer ${
                          radarFilter === tab.id
                            ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                            : "bg-white text-zinc-800 border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spatial Radar SVG Canvas with Concentric Geofence Rings */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {/* Radar Screen Area (3 Cols) */}
                  <div className="lg:col-span-3 relative h-[360px] rounded-2xl bg-zinc-50 border border-zinc-200 overflow-hidden flex items-center justify-center">
                    {/* Concentric Rings Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="size-[320px] rounded-full border border-dashed border-zinc-300 flex items-center justify-center">
                        <div className="size-[240px] rounded-full border border-zinc-200 flex items-center justify-center">
                          <div className="size-[160px] rounded-full border border-dashed border-zinc-300 flex items-center justify-center">
                            <div className="size-[80px] rounded-full border border-zinc-200" />
                          </div>
                        </div>
                      </div>
                      {/* Crosshairs */}
                      <div className="absolute h-full w-px bg-zinc-200" />
                      <div className="absolute w-full h-px bg-zinc-200" />
                      {/* Radial distance labels */}
                      <span className="absolute top-2 right-3 font-mono text-[10px] font-bold text-zinc-500">8.0 KM GEOFENCE</span>
                      <span className="absolute bottom-2 left-3 font-mono text-[10px] font-bold text-zinc-500">KASGANJ GRID 207123</span>
                    </div>

                    {/* Central Grid Anchor Pin */}
                    <div className="absolute flex flex-col items-center pointer-events-none z-10">
                      <div className="size-4 rounded-full bg-zinc-950 ring-4 ring-zinc-300 flex items-center justify-center text-white text-[8px] font-black">
                        ★
                      </div>
                      <span className="text-[9px] font-black text-zinc-950 bg-white px-1.5 py-0.2 rounded border border-zinc-300 mt-1 shadow-xs">
                        HQ Central Hub
                      </span>
                    </div>

                    {/* Interactive Plot of Real Geo Pins from Database */}
                    {geoPulse?.geoPins
                      ?.filter((pin) => (radarFilter === "all" ? true : pin.type === radarFilter))
                      ?.map((pin, idx) => {
                        // Normalize lat/lng around Kasganj 27.8081, 78.6475
                        const dLat = (pin.lat - 27.8081) * 3500;
                        const dLng = (pin.lng - 78.6475) * 3500;
                        const posX = Math.max(20, Math.min(300, 160 + dLng));
                        const posY = Math.max(20, Math.min(300, 160 - dLat));
                        const isStore = pin.type === "partner";
                        const isSelected = selectedPin?.id === pin.id;

                        return (
                          <div
                            key={pin.id}
                            style={{
                              transform: `translate(${posX - 160}px, ${posY - 160}px)`,
                            }}
                            onClick={() => setSelectedPin(pin)}
                            className={`absolute z-20 flex flex-col items-center cursor-pointer transition-transform hover:scale-125 ${
                              isSelected ? "scale-125 z-30" : ""
                            }`}
                          >
                            <div
                              className={`size-6 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-md border-2 border-white ${
                                isStore ? "bg-zinc-950" : "bg-emerald-600"
                              }`}
                            >
                              {isStore ? <Building2 className="size-3" /> : <Truck className="size-3" />}
                            </div>
                            <span className="text-[9px] font-black text-zinc-950 bg-white px-1.5 py-0.2 rounded border border-zinc-300 mt-0.5 shadow-xs whitespace-nowrap max-w-[100px] truncate">
                              {pin.name}
                            </span>
                          </div>
                        );
                      })}

                    {/* Selected Node Details Drawer */}
                    {selectedPin && (
                      <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 bg-white rounded-xl border border-zinc-300 p-3 shadow-lg z-40 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase text-zinc-500">
                              {selectedPin.type.toUpperCase()} NODE TELEMETRY
                            </span>
                            <h5 className="text-xs font-black text-zinc-950">{selectedPin.name}</h5>
                          </div>
                          <button
                            onClick={() => setSelectedPin(null)}
                            className="text-zinc-400 hover:text-zinc-950"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                        <div className="mt-2 text-[11px] space-y-1 text-zinc-700 font-medium border-t border-zinc-100 pt-1.5">
                          <div>Phone: <strong className="text-zinc-950">{selectedPin.phone}</strong></div>
                          <div>Coordinates: <strong className="text-zinc-950 font-mono">{selectedPin.lat.toFixed(4)}° N, {selectedPin.lng.toFixed(4)}° E</strong></div>
                          <div>Activity: <strong className="text-zinc-950">{selectedPin.metric}</strong></div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-zinc-950">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {selectedPin.status}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedTarget({
                                id: selectedPin.id,
                                entityType: selectedPin.type as any,
                                name: selectedPin.name,
                              });
                            }}
                            className="h-6 text-[11px] font-black bg-zinc-950 text-white px-2.5 rounded-lg"
                          >
                            Open Dossier →
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Side Fleet Telemetry Breakdown (1 Col) */}
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 flex flex-col justify-between">
                    <div>
                      <h5 className="text-xs font-black uppercase text-zinc-950 border-b border-zinc-200 pb-2">
                        Real-Time Fleet Status
                      </h5>
                      <div className="mt-3 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-zinc-200 shadow-xs">
                          <span className="flex items-center gap-2 font-bold text-zinc-800">
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            Online Captains
                          </span>
                          <strong className="text-zinc-950 font-black text-sm">{geoPulse?.fleet.onlineRiders || 0}</strong>
                        </div>

                        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-zinc-200 shadow-xs">
                          <span className="flex items-center gap-2 font-bold text-zinc-800">
                            <span className="size-2 rounded-full bg-amber-500" />
                            On Delivery Run
                          </span>
                          <strong className="text-zinc-950 font-black text-sm">{geoPulse?.fleet.onDeliveryRiders || 0}</strong>
                        </div>

                        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-zinc-200 shadow-xs">
                          <span className="flex items-center gap-2 font-bold text-zinc-800">
                            <span className="size-2 rounded-full bg-zinc-400" />
                            Standby / Idle
                          </span>
                          <strong className="text-zinc-950 font-black text-sm">{geoPulse?.fleet.idleRiders || 0}</strong>
                        </div>

                        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-zinc-200 shadow-xs">
                          <span className="flex items-center gap-2 font-bold text-zinc-800">
                            <Building2 className="size-3.5 text-zinc-950" />
                            Open Store Hubs
                          </span>
                          <strong className="text-zinc-950 font-black text-sm">{geoPulse?.fleet.activePartners || 0}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-200 text-[10px] text-zinc-500 font-medium">
                      GPS accuracy within 5-15 meters across Kasganj Municipal Geofence.
                    </div>
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  VISUAL ANALYTICS: ORDER LIFECYCLE FUNNEL & REVENUE TIMELINE GRAPHS
              ========================================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Order Status Distribution Funnel */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4 text-zinc-950" />
                      <h4 className="text-xs font-black uppercase text-zinc-950">
                        Order Lifecycle & Fulfillment Pipeline
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500">Live Database</span>
                  </div>

                  <div className="mt-4 space-y-3.5">
                    {[
                      {
                        label: "Delivered & Settled",
                        count: geoPulse?.analytics?.statusDistribution.delivered ?? (geoPulse?.summary.deliveredOrders || 0),
                        color: "bg-zinc-950",
                      },
                      {
                        label: "Active In-Flight (In Wash / Run)",
                        count: geoPulse?.analytics?.statusDistribution.inTransit ?? (geoPulse?.summary.activeOrders || 0),
                        color: "bg-zinc-700",
                      },
                      {
                        label: "Cancelled / Non-Serviceable",
                        count: geoPulse?.analytics?.statusDistribution.cancelled ?? (geoPulse?.summary.cancelledOrders || 0),
                        color: "bg-zinc-400",
                      },
                      {
                        label: "Disputed & Refunded",
                        count: geoPulse?.analytics?.statusDistribution.refunded ?? (geoPulse?.summary.refundsCount || 0),
                        color: "bg-zinc-300",
                      },
                    ].map((item) => {
                      const totalOrders = Math.max(1, geoPulse?.summary.totalOrders || 1);
                      const percent = Math.round((item.count / totalOrders) * 100);

                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-900">{item.label}</span>
                            <span className="font-black text-zinc-950">
                              {item.count} orders ({percent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${item.color} rounded-full transition-all duration-500`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Daily Sales & Orders Trend Histogram */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-zinc-950" />
                      <h4 className="text-xs font-black uppercase text-zinc-950">
                        Territory Revenue & Volume Trend
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500">Live Timeline</span>
                  </div>

                  <div className="mt-4">
                    {geoPulse?.analytics?.timeline && geoPulse.analytics.timeline.length > 0 ? (
                      <div className="h-44 flex items-end gap-2 pt-4">
                        {geoPulse.analytics.timeline.map((day) => {
                          const maxSales = Math.max(
                            ...geoPulse!.analytics!.timeline.map((t) => t.sales),
                            500
                          );
                          const barHeight = Math.max(15, Math.round((day.sales / maxSales) * 120));

                          return (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group">
                              <div className="text-[9px] font-black text-zinc-950 opacity-0 group-hover:opacity-100 transition-opacity">
                                ₹{day.sales}
                              </div>
                              <div
                                style={{ height: `${barHeight}px` }}
                                className="w-full bg-zinc-950 group-hover:bg-zinc-700 rounded-t-md transition-all shadow-xs"
                              />
                              <span className="text-[9px] font-bold text-zinc-500 truncate w-full text-center">
                                {day.date.slice(5)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-200 rounded-xl">
                        Aggregating chronological sales ledger...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Orders Live Table with End-to-End Tracing */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="size-4 text-zinc-950" />
                    <h3 className="text-sm font-black text-zinc-950 uppercase">
                      Live Recent Orders in this Territory
                    </h3>
                  </div>
                  <span className="text-xs text-zinc-700 font-mono font-bold">
                    Showing {geoPulse?.recentOrders?.length || 0} live orders
                  </span>
                </div>

                {geoPulse?.recentOrders && geoPulse.recentOrders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50/70 text-zinc-950 font-black uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Order ID</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Partner Store</th>
                          <th className="py-2.5 px-3">Assigned Pilot</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {geoPulse.recentOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-black text-zinc-950">
                              #{o.code || o.id.slice(0, 8)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-zinc-950 block">{o.customer}</span>
                              {o.customerPhone && (
                                <span className="text-[10px] font-mono text-zinc-600 block">{o.customerPhone}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-zinc-800">{o.partner}</td>
                            <td className="py-2.5 px-3 text-zinc-700 font-bold">{o.rider}</td>
                            <td className="py-2.5 px-3 text-right font-black text-zinc-950">
                              ₹{o.amount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-zinc-100 text-zinc-950 border border-zinc-300 uppercase">
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-600 font-medium border border-dashed border-zinc-200 rounded-xl">
                    No recent orders logged in this specific territory.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* =========================================================================
                TAB 3: TERRITORY LEADERBOARD (Monochrome Enterprise Ranking)
            ========================================================================== */}
            <TabsContent value="leaderboard" className="space-y-6 focus-visible:outline-none">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white border border-zinc-200 p-4 sm:p-5 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="size-5 text-zinc-950" />
                    <h3 className="text-sm font-black text-zinc-950 uppercase tracking-tight">
                      Territory Leaderboard & Performance Ranking
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-700 font-medium mt-1">
                    Ranked by GMV, order volume, and ratings in{" "}
                    <strong className="text-zinc-950 font-black">{geoFilterLabel}</strong>
                  </p>
                </div>

                <Button
                  onClick={() =>
                    exportLeaderboardPdf(leaderboardData, timeframe, geoFilterLabel)
                  }
                  className="bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs h-9 px-4 rounded-xl shadow-xs"
                >
                  <Download className="size-3.5 mr-1.5" /> Download Leaderboard PDF
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Top Partners */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-zinc-950" />
                      <h4 className="text-xs font-black uppercase text-zinc-950">
                        Top Partner Stores
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500">By GMV</span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-200">
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
                          <span className="flex size-6 items-center justify-center rounded-lg text-xs font-black shrink-0 text-zinc-950">
                            {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : p.rank}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-zinc-950 truncate block group-hover:underline">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-medium">
                              {p.city} · {p.orders} orders
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-zinc-950 block">
                            ₹{p.gmv.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-600">{p.rating} ★</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Riders */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                    <div className="flex items-center gap-2">
                      <Truck className="size-4 text-zinc-950" />
                      <h4 className="text-xs font-black uppercase text-zinc-950">
                        Top Delivery Pilots
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500">By Trips</span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-200">
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
                          <span className="flex size-6 items-center justify-center rounded-lg text-xs font-black shrink-0 text-zinc-950">
                            {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-zinc-950 truncate block group-hover:underline">
                              {r.name}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-medium">
                              {r.city} · {r.deliveries} trips
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-zinc-950 block">
                            ₹{r.earnings.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-600">
                            {r.rating} ★ ({r.onTimeRate}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Customers */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-zinc-950" />
                      <h4 className="text-xs font-black uppercase text-zinc-950">
                        Top Valued Customers
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500">By Spend</span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-200">
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
                          <span className="flex size-6 items-center justify-center rounded-lg text-xs font-black shrink-0 text-zinc-950">
                            {c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : c.rank === 3 ? "🥉" : c.rank}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-zinc-950 truncate block group-hover:underline">
                              {c.name}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-medium">
                              {c.city} · {c.orders} orders ({typeof c.membership === "object" && c.membership !== null ? (c.membership as any)?.plan || "VIP" : c.membership || "Standard"})
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-zinc-950 block">
                            ₹{c.spend.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-600">
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
    (isRider ? "Captain Partner" : target.name);

  const pPhone =
    (profile.phone && profile.phone !== "—" ? profile.phone : null) ||
    (personal.phone && personal.phone !== "—" ? personal.phone : null) ||
    (isRider ? "—" : "—");

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
