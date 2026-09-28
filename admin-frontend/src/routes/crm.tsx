import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
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
  BadgePercent,
  ChevronRight,
  Star,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { KpiCard, SectionCard, StatusPill, DataTable } from "../components/AdminUI";
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
import { exportCrmProfilePdf, exportLeaderboardPdf } from "../lib/crm-pdf-export";

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
  // Cascading Filter States
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedPincode, setSelectedPincode] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("all");

  // Search States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("all");
  const [activeMainTab, setActiveMainTab] = useState<string>("directory");

  // Deep 360 Dossier Modal State
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

  // Handle State change -> Reset City & Pincode
  const handleStateChange = (val: string) => {
    setSelectedState(val);
    setSelectedCity("all");
    setSelectedPincode("all");
  };

  // Handle City change -> Reset Pincode
  const handleCityChange = (val: string) => {
    setSelectedCity(val);
    setSelectedPincode("all");
  };

  // Reset all filters
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
        limit: 50,
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
    refetchInterval: 15000, // Live poll every 15s
  });

  // 4. Fetch Leaderboard
  const {
    data: leaderboardData,
    isLoading: isLeaderboardLoading,
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

  // 5. Fetch Deep 360 Dossier
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
      title="Enterprise CRM & Geo Intelligence"
      description="Unified 360° directory across Customers, Riders, and Partners with Live Territory Geo-Pulse and Leaderboards."
    >
      <div className="space-y-6 pb-12">
        {/* =========================================================================
            TOP BAR: CASCADING LOCATION FILTERS & UNIVERSAL SEARCH
        ========================================================================== */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Territory Scope & Active Filter Pill */}
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
                Filtered Zone:{" "}
                <strong className="text-emerald-700 font-bold">{geoFilterLabel}</strong>
              </p>
            </div>

            {/* Right: Cascading Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* State */}
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

              {/* City */}
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

              {/* Pincode */}
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

            {/* Entity Filter Pills */}
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

        {/* =========================================================================
            MAIN WORKSPACE TABS: DIRECTORY | GEO-PULSE | LEADERBOARD
        ========================================================================== */}
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

            {/* Timeframe Dropdown (Active for Geo-Pulse & Leaderboard) */}
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

          {/* =========================================================================
              TAB 1: UNIVERSAL 360° SEARCH & DIRECTORY
          ========================================================================== */}
          <TabsContent value="directory" className="space-y-4 focus-visible:outline-none">
            <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
              <span>
                Showing <strong>{searchResults?.items.length || 0}</strong> records matching criteria in{" "}
                <strong className="text-zinc-800">{geoFilterLabel}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchSearch()}
                className="h-7 text-xs text-zinc-600 hover:text-zinc-900"
              >
                <RefreshCw className="size-3 mr-1" /> Refresh
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
                  const isPrt = item.entityType === "partner";

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
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4.5 transition-all duration-200 hover:border-emerald-500 hover:shadow-md cursor-pointer"
                    >
                      {/* Top Accent line on hover */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div>
                        {/* Header: Avatar, Name & Entity Badge */}
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
                                ID: #{item.id.slice(0, 10)}
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

                        {/* Contact & Location Strip */}
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

                        {/* Metric Highlights */}
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

                      {/* Footer: Status Pill & Action Link */}
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
                                : item.statusColor === "amber"
                                ? "bg-amber-500"
                                : item.statusColor === "rose"
                                ? "bg-rose-500"
                                : "bg-zinc-400"
                            }`}
                          />
                          {item.status}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all">
                          Deep 360° Dossier <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 mb-3">
                  <Search className="size-6" />
                </div>
                <h3 className="text-sm font-black text-zinc-900">No matching records found</h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                  Try broadening your search term or changing the State, City, or Pincode filter.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="mt-4 text-xs font-bold"
                >
                  Reset All Filters
                </Button>
              </div>
            )}
          </TabsContent>

          {/* =========================================================================
              TAB 2: LIVE GEO OPERATIONS PULSE (SALES, ORDERS, FLEET, REFUNDS)
          ========================================================================== */}
          <TabsContent value="geo-pulse" className="space-y-6 focus-visible:outline-none">
            {/* Live Indicator Banner */}
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
                    Real-time aggregated sales, fleet availability, and order throughput for{" "}
                    <strong className="text-emerald-300 font-bold">{geoFilterLabel}</strong>
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchGeoPulse()}
                className="h-8 bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700 text-xs font-bold self-start sm:self-center"
              >
                <RefreshCw className="size-3.5 mr-1.5" /> Force Refresh
              </Button>
            </div>

            {/* KPI Cards Grid */}
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
                hint="Platform earnings & service fees"
              />
              <KpiCard
                title="Refunds & Dispute Loss"
                value={`₹${(geoPulse?.summary.refundsAmount || 0).toLocaleString("en-IN")}`}
                delta={`${geoPulse?.summary.refundsCount || 0} claims`}
                positive={false}
                icon={<RotateCcw className="size-4 text-rose-600" />}
                hint="Wallet refunds & dispute settlements"
              />
            </div>

            {/* Fleet & Partner Health KPIs */}
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
                hint="Currently being picked or delivered"
              />
            </div>

            {/* Recent Live Orders Table */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-4 text-emerald-600" />
                  <h3 className="text-sm font-black text-zinc-900 uppercase">
                    Recent Orders Stream in this Geo
                  </h3>
                </div>
                <span className="text-xs text-zinc-500 font-mono">
                  Showing latest {geoPulse?.recentOrders?.length || 0} orders
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

          {/* =========================================================================
              TAB 3: GEO LEADERBOARD (TOP PARTNERS, RIDERS, CUSTOMERS)
          ========================================================================== */}
          <TabsContent value="leaderboard" className="space-y-6 focus-visible:outline-none">
            {/* Header with PDF Download Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white border border-zinc-200/90 p-4 sm:p-5 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="size-5 text-amber-500" />
                  <h3 className="text-sm font-black text-zinc-900 uppercase">
                    Territory Leaderboard & Performance Ranking
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Ranked by GMV, order completion velocity, and customer ratings in{" "}
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

            {/* 3 Leaderboard Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* 1. TOP PARTNERS */}
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-purple-600" />
                      <h4 className="text-xs font-black uppercase text-zinc-900">
                        Top Partner Stores
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">By GMV & Volume</span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-100">
                    {leaderboardData?.partners && leaderboardData.partners.length > 0 ? (
                      leaderboardData.partners.map((p) => (
                        <div
                          key={p.id}
                          onClick={() =>
                            setSelectedTarget({
                              id: p.id,
                              entityType: "partner",
                              name: p.name,
                            })
                          }
                          className="py-2.5 flex items-center justify-between hover:bg-zinc-50/70 p-1.5 rounded-lg transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`flex size-6 items-center justify-center rounded-lg text-xs font-black shrink-0 ${
                                p.rank === 1
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : p.rank === 2
                                  ? "bg-zinc-200 text-zinc-800"
                                  : p.rank === 3
                                  ? "bg-amber-50 text-amber-700"
                                  : "text-zinc-400"
                              }`}
                            >
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
                            <span className="text-[10px] font-bold text-zinc-500">
                              {p.rating} ★
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-zinc-400">
                        No partner rankings available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. TOP RIDERS */}
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Truck className="size-4 text-emerald-600" />
                      <h4 className="text-xs font-black uppercase text-zinc-900">
                        Top Delivery Pilots
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">By Completed Runs</span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-100">
                    {leaderboardData?.riders && leaderboardData.riders.length > 0 ? (
                      leaderboardData.riders.map((r) => (
                        <div
                          key={r.id}
                          onClick={() =>
                            setSelectedTarget({
                              id: r.id,
                              entityType: "rider",
                              name: r.name,
                            })
                          }
                          className="py-2.5 flex items-center justify-between hover:bg-zinc-50/70 p-1.5 rounded-lg transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`flex size-6 items-center justify-center rounded-lg text-xs font-black shrink-0 ${
                                r.rank === 1
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : r.rank === 2
                                  ? "bg-zinc-200 text-zinc-800"
                                  : r.rank === 3
                                  ? "bg-amber-50 text-amber-700"
                                  : "text-zinc-400"
                              }`}
                            >
                              {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-zinc-900 truncate block group-hover:text-emerald-700">
                                {r.name}
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                {r.city} · {r.deliveries} deliveries
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-emerald-700 block">
                              ₹{r.earnings.toLocaleString("en-IN")}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-500">
                              {r.rating} ★ ({r.onTimeRate}% OT)
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-zinc-400">
                        No rider rankings available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. TOP CUSTOMERS */}
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-blue-600" />
                      <h4 className="text-xs font-black uppercase text-zinc-900">
                        Top Valued Customers
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400">By Lifetime Spend</span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-100">
                    {leaderboardData?.customers && leaderboardData.customers.length > 0 ? (
                      leaderboardData.customers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() =>
                            setSelectedTarget({
                              id: c.id,
                              entityType: "customer",
                              name: c.name,
                            })
                          }
                          className="py-2.5 flex items-center justify-between hover:bg-zinc-50/70 p-1.5 rounded-lg transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`flex size-6 items-center justify-center rounded-lg text-xs font-black shrink-0 ${
                                c.rank === 1
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : c.rank === 2
                                  ? "bg-zinc-200 text-zinc-800"
                                  : c.rank === 3
                                  ? "bg-amber-50 text-amber-700"
                                  : "text-zinc-400"
                              }`}
                            >
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
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-zinc-400">
                        No customer rankings available.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* =========================================================================
            DEEP 360° PROFILE DOSSIER SHEET (DRAWER)
        ========================================================================== */}
        <Sheet
          open={Boolean(selectedTarget)}
          onOpenChange={(open) => (!open ? setSelectedTarget(null) : null)}
        >
          <SheetContent
            side="right"
            className="w-full sm:max-w-2xl overflow-y-auto bg-white text-zinc-900 border-zinc-200 p-6"
          >
            {isProfileLoading ? (
              <div className="space-y-4 pt-12 text-center">
                <RefreshCw className="size-8 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs text-zinc-500 font-bold">
                  Compiling 360° Deep Profile Dossier...
                </p>
              </div>
            ) : deepProfileResponse?.profile ? (
              <DeepProfileView
                entityType={deepProfileResponse.entityType}
                profile={deepProfileResponse.profile}
                onClose={() => setSelectedTarget(null)}
              />
            ) : (
              <div className="pt-12 text-center text-zinc-500">
                <p>Profile record could not be loaded.</p>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminShell>
  );
}

// Subcomponent: Deep 360° Profile View
function DeepProfileView({
  entityType,
  profile,
  onClose,
}: {
  entityType: CrmEntityType;
  profile: any;
  onClose: () => void;
}) {
  const isCustomer = entityType === "customer";
  const isRider = entityType === "rider";
  const isPartner = entityType === "partner";

  const pName =
    profile.name ||
    profile.storeName ||
    profile.display_name ||
    (isCustomer ? "QuickPress Customer" : isRider ? "Captain Pilot" : "Merchant Hub");

  const pId = profile.id || profile._id || "—";
  const pCity = profile.city || "Kasganj";
  const pPhone = profile.phone || "—";
  const pEmail = profile.email || "—";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const orders = Array.isArray(profile.ordersList)
    ? profile.ordersList
    : Array.isArray(profile.orders)
    ? profile.orders
    : Array.isArray(profile.recentOrders)
    ? profile.recentOrders
    : [];

  const addresses = Array.isArray(profile.addresses) ? profile.addresses : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-100 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-900 text-white font-black text-sm shadow-xs">
              {pName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-zinc-900">{pName}</h2>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 border border-emerald-200">
                  {entityType}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                ID: #{pId} · {pCity}
              </p>
            </div>
          </div>

          {/* PDF Download Button */}
          <Button
            size="sm"
            onClick={() => exportCrmProfilePdf(entityType, profile)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-xs"
          >
            <Download className="size-3.5 mr-1.5" /> PDF Dossier
          </Button>
        </div>

        {/* Quick Contact Chips */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => copyToClipboard(pPhone, "Phone")}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-1 font-semibold text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
          >
            <Phone className="size-3 text-zinc-400" /> {pPhone}
            <Copy className="size-2.5 text-zinc-400" />
          </button>
          <button
            onClick={() => copyToClipboard(pEmail, "Email")}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-1 font-semibold text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
          >
            <Mail className="size-3 text-zinc-400" /> {pEmail}
            <Copy className="size-2.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
            {isCustomer ? "Total Orders" : isRider ? "Deliveries" : "Orders Fulfilled"}
          </span>
          <span className="text-base font-black text-zinc-900 mt-1 block">
            {profile.ordersCount || profile.totalOrders || profile.completedOrders || orders.length || 0}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
            {isCustomer ? "Total Spend" : isRider ? "Earnings" : "Total GMV"}
          </span>
          <span className="text-base font-black text-emerald-700 mt-1 block">
            ₹
            {Number(
              profile.spend || profile.totalEarnings || profile.gmv || profile.totalRevenue || 0
            ).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
            {isRider ? "COD Cash Held" : "Wallet Balance"}
          </span>
          <span className="text-base font-black text-zinc-900 mt-1 block">
            ₹
            {Number(
              profile.codCash || profile.walletBalance || profile.wallet || 0
            ).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
          <span className="text-[10px] uppercase font-bold text-zinc-400 block">
            Rating / Status
          </span>
          <span className="text-base font-black text-amber-600 mt-1 block">
            {profile.rating ? `${profile.rating} ★` : profile.status || "Active"}
          </span>
        </div>
      </div>

      {/* Tabs Inside Dossier: Orders, Addresses, KYC & History */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="bg-zinc-100 p-1 rounded-xl h-auto w-full grid grid-cols-3">
          <TabsTrigger
            value="orders"
            className="text-xs font-bold py-1.5 data-[state=active]:bg-white"
          >
            Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger
            value="details"
            className="text-xs font-bold py-1.5 data-[state=active]:bg-white"
          >
            Identity & KYC
          </TabsTrigger>
          <TabsTrigger
            value="addresses"
            className="text-xs font-bold py-1.5 data-[state=active]:bg-white"
          >
            Addresses ({addresses.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Orders History */}
        <TabsContent value="orders" className="space-y-2">
          {orders.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {orders.map((o: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-200 p-3 flex items-center justify-between text-xs hover:border-zinc-300"
                >
                  <div>
                    <span className="font-mono font-bold text-zinc-900 block">
                      #{o.code || o.id || `ORD-${idx + 1}`}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {o.serviceLabel || o.service?.name || "Laundry Order"} ·{" "}
                      {(o.date || o.createdAt || "—").slice(0, 10)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 block">
                      ₹{Number(o.amount || o.totals?.grandTotal || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">
                      {o.status || "Completed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
              No orders found for this profile.
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Identity & KYC Details */}
        <TabsContent value="details" className="space-y-3 text-xs">
          <div className="rounded-xl border border-zinc-200 p-3.5 space-y-2">
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Full Legal Name:</span>
              <span className="font-bold text-zinc-900">{pName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Registered City:</span>
              <span className="font-semibold text-zinc-800">{pCity}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Registration Date:</span>
              <span className="font-mono text-zinc-700">
                {(profile.joined || profile.createdAt || "—").slice(0, 10)}
              </span>
            </div>
            {isRider && (
              <>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-500">Vehicle Type & Plate:</span>
                  <span className="font-bold text-zinc-900">
                    {profile.vehicleType || "Bike"} ({profile.vehicleNumber || "UP-87-AB-1234"})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-500">Driving License:</span>
                  <span className="font-mono text-zinc-700">
                    {profile.dlNumber || "VERIFIED"}
                  </span>
                </div>
              </>
            )}
            {isPartner && (
              <>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-500">Store Category:</span>
                  <span className="font-bold text-zinc-900">
                    {profile.category || "Laundry Service Hub"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100">
                  <span className="text-zinc-500">Commission Rate:</span>
                  <span className="font-bold text-emerald-700">
                    {profile.commission || 15}%
                  </span>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Saved Addresses */}
        <TabsContent value="addresses" className="space-y-2">
          {addresses.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {addresses.map((a: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-200 p-3 text-xs hover:border-zinc-300"
                >
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                    <MapPin className="size-3.5 text-emerald-600" />
                    <span>{a.type || `Address #${idx + 1}`}</span>
                  </div>
                  <p className="mt-1 text-zinc-600">
                    {a.fullAddress || a.addressLine || "Address on file"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-400 font-mono">
                    City: {a.city || pCity} · PIN: {a.pincode || "—"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl">
              No additional addresses registered.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
