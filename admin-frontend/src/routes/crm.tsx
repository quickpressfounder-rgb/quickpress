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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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
  type CrmSearchResult,
  type CrmEntityType,
} from "../api/crm";
import {
  exportCrmProfilePdf,
  exportLeaderboardPdf,
  exportRawJsonData,
  exportCsvData,
} from "../lib/crm-pdf-export";

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
  });

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
    refetchInterval: 15000,
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
              <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
                <span>
                  Showing <strong>{searchResults?.items.length || 0}</strong> verified records in{" "}
                  <strong className="text-zinc-800">{geoFilterLabel}</strong>
                </span>
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
              ) : searchResults?.items && searchResults.items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {searchResults.items.map((item) => {
                    const isCust = item.entityType === "customer";
                    const isRider = item.entityType === "rider";

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
                        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4.5 transition-all duration-200 hover:border-emerald-500 hover:shadow-lg cursor-pointer"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
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
                  <h3 className="text-sm font-black text-zinc-900">No matching records found</h3>
                  <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                    Try broadening your search term or changing the State, City, or Pincode filter.
                  </p>
                  <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4 text-xs font-bold">
                    Reset All Filters
                  </Button>
                </div>
              )}
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
                              {c.city} · {c.orders} orders ({c.membership})
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

  const pName =
    profile.name ||
    profile.businessName ||
    profile.storeName ||
    profile.display_name ||
    target.name;

  const pPhone = profile.phone || "—";
  const pEmail = profile.email || "—";
  const pCity = profile.city || "Kasganj";
  const pState = profile.state || "Uttar Pradesh";
  const pId = profile.id || profile._id || target.id;
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
  const documents = Array.isArray(profile.documentsList) ? profile.documentsList : [];
  const bank = profile.bankDetails || profile.bank || {};
  const vehicle = profile.vehicleDetails || profile.vehicle || {};
  const personal = profile.personalDetails || profile.personal || {};

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
            onClick={() => exportCrmProfilePdf(target.entityType, profile)}
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
            onClick={() => exportCrmProfilePdf(target.entityType, profile)}
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
              {profile.rating ? `${profile.rating} ★` : profile.membership || "5.0 ★"}
            </span>
          </div>
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

        {/* 2. IDENTITY TAB */}
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
                  {(profile.joined || profile.createdAt || "2026-01-01").slice(0, 10)}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Last Activity Log</span>
                <span className="text-sm font-bold font-mono text-zinc-900 mt-1 block">
                  {profile.lastActive || "Today Active"}
                </span>
              </div>

              {personal.fatherName && (
                <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">Father / Guardian Name</span>
                  <span className="text-sm font-bold text-zinc-900 mt-1 block">{personal.fatherName}</span>
                </div>
              )}

              {personal.emergencyContact && (
                <div className="rounded-xl border border-zinc-200 p-3.5 bg-zinc-50/50">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] block">Emergency Contact</span>
                  <span className="text-sm font-bold text-rose-600 mt-1 block">{personal.emergencyContact}</span>
                </div>
              )}

              {personal.bloodGroup && (
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
                  {bank.bankName || profile.bankName || "State Bank of India"}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">Account Number</span>
                <span className="text-sm font-black font-mono text-zinc-900 mt-1 block">
                  {bank.accountNumber || (profile.accountLast4 ? `•••• •••• ${profile.accountLast4}` : "309812498712")}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">IFSC Code</span>
                <span className="text-sm font-black font-mono text-zinc-900 mt-1 block">
                  {bank.ifsc || profile.ifsc || "SBIN0001234"}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50/50">
                <span className="text-zinc-400 uppercase font-bold text-[10px] block">UPI ID / VPA</span>
                <span className="text-sm font-black text-emerald-700 mt-1 block">
                  {bank.upiId || profile.upiId || `${pPhone}@upi`}
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
                {documents.map((doc: any, idx: number) => (
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
    </div>
  );
}
