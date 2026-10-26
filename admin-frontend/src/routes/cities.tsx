import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Building2,
  Truck,
  Users,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Layers,
  Store,
  Globe2,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Bike,
  RefreshCw,
  Eye,
  Save,
  Phone,
  Radio,
  Check,
  Zap,
  Edit2,
  Trash2,
  Crosshair,
  UserCheck,
  CircleDollarSign,
  Hash,
  Activity,
  SlidersHorizontal,
  ChevronRight,
  Sliders,
  Star,
  ExternalLink,
  Navigation,
  Clock,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { DataTable, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  addCityPincode,
  updateCityPincode,
  deleteCityPincode,
  assignPartnerPincodes,
  assignRiderPincodes,
  fetchCitiesIntelligence,
  fetchCityPincodesIntelligence,
  fetchCityStats,
  fetchStates,
  saveCity,
  saveState,
  fetchDispatchConfig,
  updateDispatchConfig,
  fetchLiveWaves,
  type AdminState,
  type CityIntelligence,
  type CityPincodesIntelligence,
  type PincodeDetail,
  type PincodePartner,
  type PincodeCaptain,
  type CityPartner,
  type CityCaptain,
  type ZomatoDispatchConfig,
  type LiveWaveItem,
} from "../api/cities";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/cities")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Cities & Regional Operations Console",
      "End-to-end city operations surveillance, postal code geofencing, partner laundromat coverage, stationed rider fleet, and concentric wave dispatch engine.",
    ),
  component: CitiesPage,
});

/* =========================================================================
   HELPER: Compute Rich Pincode Details from Live Database Intelligence
========================================================================= */
function getEnrichedPincodes(
  city: CityIntelligence,
  apiData?: CityPincodesIntelligence | null
): PincodeDetail[] {
  if (apiData?.pincodes && apiData.pincodes.length > 0) {
    return apiData.pincodes;
  }

  const configuredPincodes = city?.pincodes && city.pincodes.length > 0 ? city.pincodes : [];
  if (configuredPincodes.length === 0) {
    return [];
  }

  const gmvTotal = city?.financials?.grossRevenue || 0.0;
  const ordersTotal = city?.financials?.totalOrders || 0;
  const totalPins = configuredPincodes.length;

  return configuredPincodes.map((pin, idx) => {
    const pinPartners = (city.partnerList || []).filter(
      (p) => !p.servicePincodes || p.servicePincodes.length === 0 || p.servicePincodes.includes(pin)
    );
    const pinRiders = (city.riderList || []).filter(
      (r) => !r.pincodes || r.pincodes.length === 0 || r.pincodes.includes(pin)
    );

    const pinGmv = totalPins > 0 ? Math.round((gmvTotal / totalPins) * 100) / 100 : 0;
    const pinOrders = totalPins > 0 ? Math.round(ordersTotal / totalPins) : 0;

    const topPart = pinPartners[0] || null;
    const topRid = pinRiders[0] || null;

    return {
      pincode: pin,
      areaName: `${city.city} Sector ${idx + 1}`,
      city: city.city,
      state: city.state,
      status: "Active",
      baseFee: city.baseDeliveryFee || 20.0,
      surgeMultiplier: city.surgeMultiplier || 1.0,
      totalOrders: pinOrders,
      deliveredOrders: pinOrders,
      grossRevenue: pinGmv,
      platformCommission: Math.round(pinGmv * 0.18 * 100) / 100,
      partnerEarnings: Math.round(pinGmv * 0.7 * 100) / 100,
      riderEarnings: Math.round(pinGmv * 0.12 * 100) / 100,
      aov: pinOrders > 0 ? Math.round((pinGmv / pinOrders) * 100) / 100 : 0.0,
      partnersCount: pinPartners.length,
      partners: pinPartners as any,
      topPartner: topPart as any,
      ridersCount: pinRiders.length,
      onlineRidersCount: pinRiders.filter((r) => r.liveState === "Online").length,
      riders: pinRiders as any,
      topRider: topRid as any,
      customersCount: 0,
      recentOrders: [],
    };
  });
}

export function CitiesPage() {
  const queryClient = useQueryClient();
  const citiesQuery = useQuery({ queryKey: ["admin", "cities", "intelligence"], queryFn: fetchCitiesIntelligence });
  const statsQuery = useQuery({ queryKey: ["admin", "cities", "stats"], queryFn: fetchCityStats });
  const statesQuery = useQuery({ queryKey: ["admin", "states"], queryFn: fetchStates });
  const dispatchConfigQuery = useQuery({ queryKey: ["admin", "dispatch", "config"], queryFn: fetchDispatchConfig, refetchInterval: 10000 });
  const liveWavesQuery = useQuery({ queryKey: ["admin", "dispatch", "liveWaves"], queryFn: fetchLiveWaves, refetchInterval: 3000 });

  // Navigation & Sub-View State
  const [activeCityTab, setActiveCityTab] = useState<"pincodes" | "partners" | "riders" | "dispatch" | "all_cities">("pincodes");
  const [selectedState, setSelectedState] = useState<string>("All States");
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [selectedPincode, setSelectedPincode] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const [waveConfigState, setWaveConfigState] = useState<Partial<ZomatoDispatchConfig>>({
    wave1RadiusKm: 1.8,
    wave2RadiusKm: 4.0,
    wave3RadiusKm: 8.0,
    wave1TimeoutSec: 15,
    wave2TimeoutSec: 15,
  });

  useEffect(() => {
    if (dispatchConfigQuery.data) {
      setWaveConfigState({
        wave1RadiusKm: dispatchConfigQuery.data.wave1RadiusKm ?? 1.8,
        wave2RadiusKm: dispatchConfigQuery.data.wave2RadiusKm ?? 4.0,
        wave3RadiusKm: dispatchConfigQuery.data.wave3RadiusKm ?? 8.0,
        wave1TimeoutSec: dispatchConfigQuery.data.wave1TimeoutSec ?? 15,
        wave2TimeoutSec: dispatchConfigQuery.data.wave2TimeoutSec ?? 15,
      });
    }
  }, [dispatchConfigQuery.data]);

  const updateDispatchMutation = useMutation({
    mutationFn: updateDispatchConfig,
    onSuccess: (data) => {
      toast.success("Pod & Wave dispatch parameters saved.");
      queryClient.setQueryData(["admin", "dispatch", "config"], data);
    },
    onError: (err: any) => {
      toast.error(`Failed to update dispatch parameters: ${err.message || err}`);
    },
  });

  // Modal Dialogs state
  const [editingPincode, setEditingPincode] = useState<{ cityId: string; pincode: string; detail: PincodeDetail } | null>(null);
  const [assigningPartner, setAssigningPartner] = useState<{ partner: CityPartner | PincodePartner; cityId: string; cityName: string } | null>(null);
  const [assigningRider, setAssigningRider] = useState<{ rider: CityCaptain | PincodeCaptain; cityId: string; cityName: string } | null>(null);
  const [addingPincodeCityId, setAddingPincodeCityId] = useState<string | null>(null);
  const [addingSectorPincode, setAddingSectorPincode] = useState<{ cityId: string; pincode: string; currentArea: string } | null>(null);

  const allCities: CityIntelligence[] = useMemo(() => {
    return citiesQuery.data ?? [];
  }, [citiesQuery.data]);

  // Derive unique states dynamically from database collections
  const stateList = useMemo(() => {
    const map = new Map<string, AdminState>();

    for (const c of allCities) {
      const sName = c.state || "Uttar Pradesh";
      const existing = map.get(sName) || {
        state: sName,
        citiesCount: 0,
        liveCities: 0,
        partners: 0,
        riders: 0,
        customers: 0,
        orders: 0,
        sales: 0,
      };
      existing.citiesCount += 1;
      if (c.status === "Active" || c.status === "Live") existing.liveCities += 1;
      existing.partners += c.totalPartners || 0;
      existing.riders += c.totalRiders || 0;
      existing.customers += c.totalCustomers || 0;
      existing.orders += c.financials?.totalOrders || 0;
      existing.sales += c.financials?.grossRevenue || 0.0;
      map.set(sName, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.citiesCount - a.citiesCount);
  }, [allCities]);

  // Filter cities by state and optional text search
  const filteredCities = useMemo(() => {
    let list = allCities;
    if (selectedState !== "All States") {
      list = list.filter((c) => c.state.toLowerCase() === selectedState.toLowerCase());
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.city.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          (c.pincodes || []).some((pin) => pin.includes(q))
      );
    }
    return list;
  }, [allCities, selectedState, searchFilter]);

  // Active Selected City (City-First Navigation)
  const currentCity = useMemo(() => {
    if (selectedCityId) {
      const found = allCities.find((c) => c.id === selectedCityId);
      if (found) return found;
    }
    return filteredCities[0] || allCities[0] || null;
  }, [allCities, selectedCityId, filteredCities]);

  // Sync selectedCityId when list loads
  useEffect(() => {
    if (!selectedCityId && currentCity?.id) {
      setSelectedCityId(currentCity.id);
    }
  }, [currentCity, selectedCityId]);

  // Query individual city pincodes intelligence
  const pincodesIntelligenceQuery = useQuery({
    queryKey: ["admin", "cities", "pincodes", currentCity?.id],
    queryFn: () => (currentCity ? fetchCityPincodesIntelligence(currentCity.id) : null),
    enabled: Boolean(currentCity?.id),
    staleTime: 1000 * 30,
  });

  const pincodeList: PincodeDetail[] = useMemo(() => {
    if (!currentCity) return [];
    return getEnrichedPincodes(currentCity, pincodesIntelligenceQuery.data);
  }, [currentCity, pincodesIntelligenceQuery.data]);

  // Selected Pincode Detail
  const activePincodeDetail = useMemo(() => {
    if (!pincodeList || pincodeList.length === 0) return null;
    if (selectedPincode) {
      const found = pincodeList.find((p) => p.pincode === selectedPincode);
      if (found) return found;
    }
    return pincodeList[0];
  }, [pincodeList, selectedPincode]);

  // Pan-India Network metrics calculated from live database
  const metrics = useMemo(() => {
    const totalCities = allCities.length;
    const totalPincodes = allCities.reduce((sum, c) => sum + (c.pincodes?.length || 0), 0);
    const totalRevenue = allCities.reduce((sum, c) => sum + (c.financials?.grossRevenue || 0), 0);
    const totalOrders = allCities.reduce((sum, c) => sum + (c.financials?.totalOrders || 0), 0);
    const totalCaptains = allCities.reduce((sum, c) => sum + (c.totalRiders || 0), 0);
    const totalHubs = allCities.reduce((sum, c) => sum + (c.totalPartners || 0), 0);
    const totalCustomers = allCities.reduce((sum, c) => sum + (c.totalCustomers || 0), 0);

    return {
      totalCities,
      totalPincodes,
      totalRevenue,
      totalOrders,
      totalCaptains,
      totalHubs,
      totalCustomers,
    };
  }, [allCities]);

  // City-specific Partner Stores and Riders
  const cityPartners = useMemo(() => {
    if (!currentCity) return [];
    return currentCity.partnerList || [];
  }, [currentCity]);

  const cityRiders = useMemo(() => {
    if (!currentCity) return [];
    return currentCity.riderList || [];
  }, [currentCity]);

  // City-specific financial metrics
  const currentCityGMV = currentCity?.financials?.grossRevenue || 0.0;
  const currentCityOrders = currentCity?.financials?.totalOrders || 0;
  const cityDailySales = currentCityGMV > 0 ? currentCityGMV / 30 : 0.0;
  const cityOrderVelocity = currentCityOrders > 0 ? Math.ceil(currentCityOrders / 30) : 0;

  // Mutations
  const deleteCityMutation = useMutation({
    mutationFn: async (cityId: string) => {
      const res = await fetch(`/api/admin/cities/${cityId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete city");
      return res.json();
    },
    onSuccess: () => {
      toast.success("City hub removed from database.");
      queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
    },
    onError: () => toast.error("Could not delete city."),
  });

  const deletePincodeMutation = useMutation({
    mutationFn: async ({ cityId, pincode }: { cityId: string; pincode: string }) => {
      return deleteCityPincode(cityId, pincode);
    },
    onSuccess: () => {
      toast.success("Pincode removed from operational serviceability.");
      queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
    },
    onError: () => toast.error("Failed to remove pincode."),
  });

  return (
    <AdminShell
      title="Cities & Regional Operations Console"
      subtitle="City-wise end-to-end operational surveillance: Pincodes geofencing, partner laundromats, stationed rider fleet, and pod dispatch waves."
      actions={
        <div className="flex items-center gap-2">
          <AddStateDialog />
          <AddCityDialog defaultState={selectedState !== "All States" ? selectedState : "Uttar Pradesh"} />
          {currentCity && (
            <Button
              size="sm"
              onClick={() => setAddingPincodeCityId(currentCity.id)}
              className="h-8.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-semibold px-3.5 shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Add Pincode</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 bg-white min-h-screen text-zinc-950 pb-16">
        {/* =========================================================================
            1. PAN-INDIA NETWORK EXECUTIVE STRIP (TASTEFUL ENTERPRISE ACCENT COLORS)
        ========================================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* Active Cities */}
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Operating Cities</span>
              <div className="size-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center">
                <Building2 className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{metrics.totalCities}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 font-medium">Pan-India regional hub network</p>
          </div>

          {/* Active Pincodes */}
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Serviceable Pincodes</span>
              <div className="size-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center">
                <MapPin className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{metrics.totalPincodes}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 font-medium">100% full territory coverage</p>
          </div>

          {/* Partner Stores */}
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Partner Laundromats</span>
              <div className="size-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
                <Store className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{metrics.totalHubs}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 font-medium">Processing store facilities</p>
          </div>

          {/* Delivery Fleet */}
          <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Delivery Captains</span>
              <div className="size-7 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/60 flex items-center justify-center">
                <Bike className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{metrics.totalCaptains}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 font-medium">On-duty stationed fleet</p>
          </div>

          {/* Delivered GMV */}
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Delivered GMV</span>
              <div className="size-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
                <IndianRupee className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950">
              ₹{metrics.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-700 font-semibold">
              Platform Fee (18%): ₹{(metrics.totalRevenue * 0.18).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* =========================================================================
            2. CITY-FIRST SELECTOR BAR & TERRITORY FILTERS (END-TO-END CITY CAROUSEL)
        ========================================================================= */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3.5">
          {/* Top State Filter & Live City Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe2 className="size-4 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-800">Operational Territory Selector</span>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search city, state, area, or 6-digit pincode..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-8.5 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600/30 focus:outline-none"
              />
            </div>
          </div>

          {/* State Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setSelectedState("All States")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedState === "All States"
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-xs font-bold"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
              }`}
            >
              <Layers className="size-3" />
              <span>All States ({allCities.length})</span>
            </button>

            {stateList.map((st) => {
              const isSelected = selectedState.toLowerCase() === st.state.toLowerCase();
              return (
                <button
                  key={st.state}
                  type="button"
                  onClick={() => {
                    setSelectedState(st.state);
                    const firstInState = allCities.find((c) => c.state.toLowerCase() === st.state.toLowerCase());
                    if (firstInState) setSelectedCityId(firstInState.id);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? "border-purple-600 bg-purple-50 text-purple-900 font-bold border-2 shadow-xs"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300"
                  }`}
                >
                  <Landmark className="size-3 text-zinc-500" />
                  <span>{st.state}</span>
                  <span
                    className={`ml-1 rounded px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected ? "bg-purple-200/80 text-purple-900" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {st.citiesCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* City Selection Cards Strip (Click any City to see End-to-End City Data) */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Building2 className="size-3.5 text-purple-600" />
                <span>Select Operational City Hub ({filteredCities.length})</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">Click city card to switch active workspace</span>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {filteredCities.map((c) => {
                const isSelected = currentCity && (c.id === currentCity.id || c.city.toLowerCase() === currentCity.city.toLowerCase());
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCityId(c.id);
                      if (c.pincodes && c.pincodes.length > 0 && c.pincodes[0]) {
                        setSelectedPincode(c.pincodes[0]);
                      }
                    }}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-zinc-950 bg-purple-50/30 ring-2 ring-zinc-950/20 shadow-sm"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        <span className="font-bold text-sm text-zinc-950">{c.city}</span>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-1.5 py-0.2 rounded border border-purple-200">
                        {c.tier}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">{c.state}</p>

                    <div className="mt-2.5 w-full border-t border-zinc-100 pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-600 font-medium">{c.pincodes?.length || 0} Pincodes</span>
                      <span className="font-bold text-emerald-700">₹{(c.financials?.grossRevenue || 0).toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. CITY HERO OPERATIONS COMMAND CONSOLE (END-TO-END DATA VIEW)
        ========================================================================= */}
        {!currentCity ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-xs">
            <Building2 className="mx-auto size-10 text-zinc-400" />
            <h3 className="mt-3 text-sm font-bold text-zinc-950">No Operational Cities Configured</h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
              Register an operational city to manage postal geofencing, partner laundromats, and delivery fleet.
            </p>
            <div className="mt-4 flex justify-center">
              <AddCityDialog defaultState={selectedState !== "All States" ? selectedState : "Uttar Pradesh"} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* City Master Command Banner */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-black tracking-tight text-zinc-950">
                      {currentCity.city} Operations Command
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live City Hub
                    </span>
                    <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-xs font-semibold">
                      {currentCity.tier} Metro
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-medium mt-1.5">
                    <span>State: <strong className="text-zinc-900">{currentCity.state}</strong></span>
                    <span>·</span>
                    <span>Service Radius: <strong className="text-zinc-900">{currentCity.deliveryRadiusKm || 15} km</strong></span>
                    <span>·</span>
                    <span>Base Logistics Fee: <strong className="text-zinc-900">₹{currentCity.baseDeliveryFee || 25}</strong></span>
                    <span>·</span>
                    <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.2 rounded border border-amber-200">
                      Surge: {currentCity.surgeMultiplier || 1.0}x Normal
                    </span>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setAddingPincodeCityId(currentCity.id)}
                    className="h-8.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-semibold px-3.5 shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Pincode</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${currentCity.city}? This will remove it from all regional portals.`)) {
                        deleteCityMutation.mutate(currentCity.id);
                      }
                    }}
                    disabled={deleteCityMutation.isPending}
                    className="h-8.5 rounded-lg border-zinc-200 bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete City</span>
                  </Button>
                </div>
              </div>

              {/* End-to-End Operational Stats for Selected City */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-4">
                {/* 1. Postal Codes */}
                <div className="rounded-lg border border-zinc-200/90 bg-white p-3.5">
                  <div className="flex items-center justify-between text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <span>Postal Codes</span>
                    <MapPin className="size-3.5 text-blue-600" />
                  </div>
                  <p className="mt-1 text-xl font-bold text-zinc-950">{pincodeList.length} Pincodes</p>
                  <p className="text-[11px] text-zinc-500 font-medium">100% full territory coverage</p>
                </div>

                {/* 2. Partner Laundromats */}
                <div className="rounded-lg border border-zinc-200/90 bg-white p-3.5">
                  <div className="flex items-center justify-between text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <span>Partner Stores</span>
                    <Store className="size-3.5 text-purple-600" />
                  </div>
                  <p className="mt-1 text-xl font-bold text-zinc-950">{currentCity.totalPartners || 0} Facilities</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    {currentCity.activePartners || currentCity.totalPartners || 0} Open & Active
                  </p>
                </div>

                {/* 3. Delivery Fleet */}
                <div className="rounded-lg border border-zinc-200/90 bg-white p-3.5">
                  <div className="flex items-center justify-between text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <span>Stationed Captains</span>
                    <Bike className="size-3.5 text-sky-600" />
                  </div>
                  <p className="mt-1 text-xl font-bold text-zinc-950">{currentCity.totalRiders || 0} Riders</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    {currentCity.onlineRiders || 0} On-Duty Captains Active
                  </p>
                </div>

                {/* 4. Delivered GMV */}
                <div className="rounded-lg border border-zinc-200/90 bg-white p-3.5">
                  <div className="flex items-center justify-between text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <span>Delivered GMV</span>
                    <IndianRupee className="size-3.5 text-emerald-600" />
                  </div>
                  <p className="mt-1 text-xl font-bold text-zinc-950">₹{currentCityGMV.toLocaleString()}</p>
                  <p className="text-[11px] text-zinc-500 font-medium">Platform 18%: ₹{(currentCityGMV * 0.18).toFixed(0)}</p>
                </div>

                {/* 5. Daily Order Velocity */}
                <div className="rounded-lg border border-zinc-200/90 bg-white p-3.5">
                  <div className="flex items-center justify-between text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <span>Order Velocity</span>
                    <Activity className="size-3.5 text-amber-600" />
                  </div>
                  <p className="mt-1 text-xl font-bold text-zinc-950">{cityOrderVelocity} Orders / Day</p>
                  <p className="text-[11px] text-zinc-500 font-medium">Daily Revenue: ₹{cityDailySales.toFixed(0)}</p>
                </div>
              </div>
            </div>

            {/* =========================================================================
                4. CITY-WISE COMMAND TABS (END-TO-END DATA EXPLORER)
            ========================================================================= */}
            <div className="border-b border-zinc-200">
              <Tabs value={activeCityTab} onValueChange={(v: any) => setActiveCityTab(v)}>
                <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2">
                  <TabsTrigger
                    value="pincodes"
                    className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-purple-600 data-[state=active]:text-purple-900 data-[state=active]:font-bold data-[state=active]:bg-white"
                  >
                    <MapPin className="size-3.5 text-purple-600" />
                    <span>Postal Codes & Coverage Matrix ({pincodeList.length})</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="partners"
                    className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-900 data-[state=active]:font-bold data-[state=active]:bg-white"
                  >
                    <Store className="size-3.5 text-emerald-600" />
                    <span>Laundromat Facilities ({cityPartners.length})</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="riders"
                    className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-sky-600 data-[state=active]:text-sky-900 data-[state=active]:font-bold data-[state=active]:bg-white"
                  >
                    <Bike className="size-3.5 text-sky-600" />
                    <span>Delivery Fleet Roster ({cityRiders.length})</span>
                  </TabsTrigger>

                  <TabsTrigger
                    value="dispatch"
                    className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-amber-600 data-[state=active]:text-amber-900 data-[state=active]:font-bold data-[state=active]:bg-white"
                  >
                    <Zap className="size-3.5 text-amber-600" />
                    <span>Pod Dispatch & Concentric Waves</span>
                    {Boolean(liveWavesQuery.data?.activeCount) && (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2">
                        {liveWavesQuery.data?.activeCount} Active
                      </span>
                    )}
                  </TabsTrigger>

                  <TabsTrigger
                    value="all_cities"
                    className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-zinc-900 data-[state=active]:text-zinc-950 data-[state=active]:font-bold data-[state=active]:bg-white"
                  >
                    <Globe2 className="size-3.5 text-zinc-600" />
                    <span>Pan-India Cities Directory ({allCities.length})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* =========================================================================
                VIEW 1: CITY PINCODES & DEEP COVERAGE MATRIX (END-TO-END)
            ========================================================================= */}
            {activeCityTab === "pincodes" && (
              <div className="space-y-4">
                {/* Full-Width Pincodes Master Matrix Table */}
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                        <MapPin className="size-4 text-purple-600" />
                        <span>Postal Codes in {currentCity.city} ({pincodeList.length})</span>
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        End-to-end geofencing: Click any pincode row below to open deep operational breakdown.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setAddingPincodeCityId(currentCity.id)}
                      className="h-8 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-semibold px-3 shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Pincode</span>
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                          <th className="py-3 px-3">Postal Code</th>
                          <th className="py-3 px-3">Covered Sectors / Localities</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Assigned Stores</th>
                          <th className="py-3 px-3">Stationed Fleet</th>
                          <th className="py-3 px-3">Gross GMV</th>
                          <th className="py-3 px-3">Total Orders</th>
                          <th className="py-3 px-3">Base Logistics</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {pincodeList.map((p) => {
                          const isSelected = p.pincode === activePincodeDetail?.pincode;
                          return (
                            <tr
                              key={p.pincode}
                              onClick={() => setSelectedPincode(p.pincode)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-purple-50/40 font-medium" : "hover:bg-zinc-50/80"
                              }`}
                            >
                              {/* Pincode */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-zinc-950 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                    {p.pincode}
                                  </span>
                                  {isSelected && (
                                    <span className="size-2 rounded-full bg-purple-600" />
                                  )}
                                </div>
                              </td>

                              {/* Sectors */}
                              <td className="py-3 px-3">
                                <div className="max-w-xs">
                                  <p className="font-medium text-zinc-900 truncate">{p.areaName}</p>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                                  <span className="size-1 rounded-full bg-emerald-500" />
                                  {p.status}
                                </span>
                              </td>

                              {/* Assigned Stores */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs">
                                    {p.partnersCount} Stores
                                  </span>
                                </div>
                              </td>

                              {/* Stationed Fleet */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-xs">
                                    {p.ridersCount} Fleet ({p.onlineRidersCount} Online)
                                  </span>
                                </div>
                              </td>

                              {/* Gross GMV */}
                              <td className="py-3 px-3 font-bold text-emerald-700">
                                ₹{p.grossRevenue.toFixed(0)}
                              </td>

                              {/* Orders */}
                              <td className="py-3 px-3 text-zinc-800 font-semibold">
                                {p.totalOrders} Orders
                              </td>

                              {/* Base Fee & Surge */}
                              <td className="py-3 px-3 text-zinc-600">
                                ₹{p.baseFee} · {p.surgeMultiplier}x
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setAddingSectorPincode({
                                        cityId: currentCity.id,
                                        pincode: p.pincode,
                                        currentArea: p.areaName,
                                      })
                                    }
                                    className="h-7 px-2 text-[11px] rounded-md border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                    title="Add Sector"
                                  >
                                    <Plus className="size-3 mr-0.5 text-purple-600" /> Sector
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setEditingPincode({
                                        cityId: currentCity.id,
                                        pincode: p.pincode,
                                        detail: p,
                                      })
                                    }
                                    className="h-7 px-2 text-[11px] rounded-md border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                    title="Edit Rates"
                                  >
                                    <Edit2 className="size-3 mr-0.5 text-zinc-600" /> Edit
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (confirm(`Remove postal code ${p.pincode} from ${currentCity.city}?`)) {
                                        deletePincodeMutation.mutate({ cityId: currentCity.id, pincode: p.pincode });
                                      }
                                    }}
                                    className="h-7 w-7 p-0 rounded-md border-zinc-200 text-rose-600 hover:bg-rose-50"
                                    title="Delete Pincode"
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* =========================================================================
                    PINCODE DRILLDOWN DRAWER / CARD (SURVEILLANCE BREAKDOWN)
                ========================================================================= */}
                {activePincodeDetail && (
                  <div className="space-y-4">
                    {/* Header Strip for Highlighted Pincode */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-zinc-950 flex items-center gap-1.5">
                              <MapPin className="size-4 text-purple-600" />
                              <span>Deep Operations Breakdown: Postal Code {activePincodeDetail.pincode}</span>
                            </h3>
                            <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                              Active Service Zone
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            Locality: <strong className="text-zinc-900">{activePincodeDetail.areaName}</strong> · City: <strong className="text-zinc-900">{currentCity.city}</strong> · Base Logistics Fee: ₹{activePincodeDetail.baseFee}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setAddingSectorPincode({
                                cityId: currentCity.id,
                                pincode: activePincodeDetail.pincode,
                                currentArea: activePincodeDetail.areaName,
                              })
                            }
                            className="h-8 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                          >
                            <Plus className="size-3 mr-1 text-purple-600" /> Add Sector
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditingPincode({
                                cityId: currentCity.id,
                                pincode: activePincodeDetail.pincode,
                                detail: activePincodeDetail,
                              })
                            }
                            className="h-8 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                          >
                            <Edit2 className="size-3 mr-1 text-zinc-600" /> Edit Rates
                          </Button>
                        </div>
                      </div>

                      {/* 4 Financial Tiles */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-3 text-center">
                        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/60">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Delivered GMV</p>
                          <p className="text-lg font-black text-emerald-700">₹{activePincodeDetail.grossRevenue.toFixed(2)}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/60">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Delivered Orders</p>
                          <p className="text-lg font-black text-zinc-950">{activePincodeDetail.totalOrders} Orders</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/60">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Store Payout (70%)</p>
                          <p className="text-lg font-black text-purple-700">₹{activePincodeDetail.partnerEarnings.toFixed(2)}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/60">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Rider Payout (12%)</p>
                          <p className="text-lg font-black text-sky-700">₹{activePincodeDetail.riderEarnings.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stores in this specific pincode */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                        <h4 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                          <Store className="size-4 text-emerald-600" />
                          <span>Partner Laundromats Serving {activePincodeDetail.pincode} ({activePincodeDetail.partners.length})</span>
                        </h4>
                      </div>

                      <DataTable
                        loading={pincodesIntelligenceQuery.isLoading}
                        rows={activePincodeDetail.partners}
                        emptyMessage="No partner stores currently mapped to this postal code."
                        columns={[
                          {
                            key: "store",
                            label: "Laundromat Facility",
                            render: (p) => (
                              <div>
                                <p className="font-bold text-zinc-950 text-xs">{p.name || p.storeName}</p>
                                <p className="text-[11px] text-zinc-500 font-medium">{p.address}</p>
                              </div>
                            ),
                          },
                          {
                            key: "pincodes",
                            label: "Service Pincodes",
                            render: (p) => (
                              <span className="font-mono text-xs font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {(p.servicePincodes || [activePincodeDetail.pincode]).join(", ")}
                              </span>
                            ),
                          },
                          {
                            key: "status",
                            label: "Facility Status",
                            render: (p) => (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                                <span className="size-1 rounded-full bg-emerald-500" />
                                {p.status || "Active"}
                              </span>
                            ),
                          },
                          {
                            key: "actions",
                            label: "",
                            className: "text-right",
                            render: (p) => (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                                onClick={() =>
                                  setAssigningPartner({
                                    partner: p,
                                    cityId: currentCity.id,
                                    cityName: currentCity.city,
                                  })
                                }
                              >
                                <Crosshair className="size-3 mr-1 text-purple-600" /> Map Pincodes
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </div>

                    {/* Delivery Captains stationed in this specific pincode */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                        <h4 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                          <Bike className="size-4 text-sky-600" />
                          <span>Delivery Fleet Stationed in {activePincodeDetail.pincode} ({activePincodeDetail.riders.length})</span>
                        </h4>
                      </div>

                      <DataTable
                        loading={pincodesIntelligenceQuery.isLoading}
                        rows={activePincodeDetail.riders}
                        emptyMessage="No delivery captains stationed in this postal code."
                        columns={[
                          {
                            key: "rider",
                            label: "Captain Name & Vehicle",
                            render: (r) => (
                              <div>
                                <p className="font-bold text-zinc-950 text-xs">{r.name}</p>
                                <p className="text-[11px] text-zinc-500 font-medium">
                                  {r.vehicle || "Motorcycle"} · {r.plate || "Verified"}
                                </p>
                              </div>
                            ),
                          },
                          {
                            key: "duty",
                            label: "Duty State",
                            render: (r) => (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  r.liveState === "Online"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : r.liveState === "On delivery"
                                    ? "bg-blue-50 text-blue-800 border-blue-200"
                                    : "bg-zinc-100 text-zinc-600 border-zinc-200"
                                }`}
                              >
                                <span
                                  className={`size-1.5 rounded-full ${
                                    r.liveState === "Online"
                                      ? "bg-emerald-500 animate-pulse"
                                      : r.liveState === "On delivery"
                                      ? "bg-blue-500"
                                      : "bg-zinc-400"
                                  }`}
                                />
                                {r.liveState || "Offline"}
                              </span>
                            ),
                          },
                          {
                            key: "phone",
                            label: "Contact",
                            render: (r) => (
                              <span className="font-mono text-xs text-zinc-600 flex items-center gap-1">
                                <Phone className="size-3 text-zinc-400" />
                                {r.phone}
                              </span>
                            ),
                          },
                          {
                            key: "trips",
                            label: "Deliveries",
                            render: (r) => (
                              <span className="font-bold text-zinc-900 text-xs">{r.trips || 0} Trips</span>
                            ),
                          },
                          {
                            key: "actions",
                            label: "",
                            className: "text-right",
                            render: (r) => (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                                onClick={() =>
                                  setAssigningRider({
                                    rider: r,
                                    cityId: currentCity.id,
                                    cityName: currentCity.city,
                                  })
                                }
                              >
                                <Crosshair className="size-3 mr-1 text-sky-600" /> Stationing
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                VIEW 2: PARTNER LAUNDROMAT STORES IN [CITY] (FULL-WIDTH MATRIX)
            ========================================================================= */}
            {activeCityTab === "partners" && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                      <Store className="size-4 text-emerald-600" />
                      <span>Laundromat Store Facilities in {currentCity.city} ({cityPartners.length})</span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                      Partner facilities processing laundry, dry cleaning, and garment care in this hub.
                    </p>
                  </div>
                </div>

                <DataTable
                  rows={cityPartners}
                  emptyMessage={`No partner stores registered in ${currentCity.city} yet.`}
                  columns={[
                    {
                      key: "partner",
                      label: "Laundromat Store",
                      render: (p) => (
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                            <Store className="size-4" />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-950 text-xs">{p.name || p.storeName}</p>
                            <p className="text-[11px] text-zinc-500 font-medium">{p.address || `${currentCity.city}, ${currentCity.state}`}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "phone",
                      label: "Phone Contact",
                      render: (p) => (
                        <span className="font-mono text-xs text-zinc-700 flex items-center gap-1">
                          <Phone className="size-3 text-zinc-400" />
                          {p.phone || "Not specified"}
                        </span>
                      ),
                    },
                    {
                      key: "coverage",
                      label: "Assigned Service Pincodes",
                      render: (p) => (
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {(p.servicePincodes && p.servicePincodes.length > 0
                            ? p.servicePincodes
                            : currentCity.pincodes || []
                          ).map((pin) => (
                            <span
                              key={pin}
                              className="font-mono text-[10px] font-semibold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200"
                            >
                              {pin}
                            </span>
                          ))}
                        </div>
                      ),
                    },
                    {
                      key: "rating",
                      label: "Rating",
                      render: (p) => (
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Star className="size-3 fill-amber-500 text-amber-500" />
                          {p.rating || 4.9}
                        </span>
                      ),
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (p) => (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          {p.status || "Open / Active"}
                        </span>
                      ),
                    },
                    {
                      key: "actions",
                      label: "",
                      className: "text-right",
                      render: (p) => (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setAssigningPartner({
                              partner: p,
                              cityId: currentCity.id,
                              cityName: currentCity.city,
                            })
                          }
                          className="h-8 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        >
                          <Crosshair className="size-3.5 mr-1 text-purple-600" /> Map Pincodes
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* =========================================================================
                VIEW 3: DELIVERY FLEET IN [CITY] (FULL-WIDTH MATRIX)
            ========================================================================= */}
            {activeCityTab === "riders" && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                      <Bike className="size-4 text-sky-600" />
                      <span>Delivery Captains in {currentCity.city} ({cityRiders.length})</span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                      On-duty logistics delivery captains assigned to {currentCity.city} service pods.
                    </p>
                  </div>
                </div>

                <DataTable
                  rows={cityRiders}
                  emptyMessage={`No delivery captains registered in ${currentCity.city} yet.`}
                  columns={[
                    {
                      key: "rider",
                      label: "Captain Name",
                      render: (r) => (
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-xs shrink-0">
                            <Bike className="size-4" />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-950 text-xs">{r.name}</p>
                            <p className="text-[11px] text-zinc-500 font-medium">ID: #{r.riderId || "CAP-001"}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "vehicle",
                      label: "Vehicle & Plate",
                      render: (r) => (
                        <div>
                          <p className="font-semibold text-xs text-zinc-900">{r.vehicle || "EV Scooter"}</p>
                          <p className="font-mono text-[11px] text-zinc-500">{r.plate || "UP-16-QP-01"}</p>
                        </div>
                      ),
                    },
                    {
                      key: "duty",
                      label: "Live Duty State",
                      render: (r) => (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            r.liveState === "Online"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : r.liveState === "On delivery"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              r.liveState === "Online"
                                ? "bg-emerald-500 animate-pulse"
                                : r.liveState === "On delivery"
                                ? "bg-blue-500"
                                : "bg-zinc-400"
                            }`}
                          />
                          {r.liveState || "Offline"}
                        </span>
                      ),
                    },
                    {
                      key: "pincodes",
                      label: "Stationing Postal Codes",
                      render: (r) => (
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {(r.pincodes && r.pincodes.length > 0 ? r.pincodes : currentCity.pincodes || []).map((pin) => (
                            <span
                              key={pin}
                              className="font-mono text-[10px] font-semibold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200"
                            >
                              {pin}
                            </span>
                          ))}
                        </div>
                      ),
                    },
                    {
                      key: "trips",
                      label: "Trips Completed",
                      render: (r) => (
                        <span className="font-bold text-zinc-950 text-xs">{r.trips || 0} Orders</span>
                      ),
                    },
                    {
                      key: "actions",
                      label: "",
                      className: "text-right",
                      render: (r) => (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setAssigningRider({
                              rider: r,
                              cityId: currentCity.id,
                              cityName: currentCity.city,
                            })
                          }
                          className="h-8 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        >
                          <Crosshair className="size-3.5 mr-1 text-sky-600" /> Stationing
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* =========================================================================
                VIEW 4: POD DISPATCH & CONCENTRIC WAVES (CITY-WIDE DISPATCH)
            ========================================================================= */}
            {activeCityTab === "dispatch" && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                      <Zap className="size-4 text-amber-600" />
                      <span>Concentric Wave Dispatch Engine — {currentCity.city}</span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                      Automated cascading broadcast to on-duty captains stationed across concentric radii in {currentCity.city}.
                    </p>
                  </div>

                  <Button
                    onClick={() => updateDispatchMutation.mutate(waveConfigState)}
                    disabled={updateDispatchMutation.isPending}
                    className="bg-zinc-900 hover:bg-black text-white font-semibold text-xs h-8.5 px-3.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Save className="size-3.5" />
                    <span>{updateDispatchMutation.isPending ? "Saving..." : "Save Parameters"}</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Wave 1 Settings */}
                  <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        Wave 1 (Local Store Radius)
                      </span>
                      <Radio className="size-3.5 text-purple-600" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-700">Radius (km)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={waveConfigState.wave1RadiusKm}
                        onChange={(e) =>
                          setWaveConfigState((prev) => ({ ...prev, wave1RadiusKm: parseFloat(e.target.value) || 1.8 }))
                        }
                        className="h-8.5 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-700">Timeout (Seconds)</Label>
                      <Input
                        type="number"
                        value={waveConfigState.wave1TimeoutSec}
                        onChange={(e) =>
                          setWaveConfigState((prev) => ({ ...prev, wave1TimeoutSec: parseInt(e.target.value) || 15 }))
                        }
                        className="h-8.5 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Wave 2 Settings */}
                  <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Wave 2 (Sector Cluster)
                      </span>
                      <Radio className="size-3.5 text-blue-600" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-700">Radius (km)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={waveConfigState.wave2RadiusKm}
                        onChange={(e) =>
                          setWaveConfigState((prev) => ({ ...prev, wave2RadiusKm: parseFloat(e.target.value) || 4.0 }))
                        }
                        className="h-8.5 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-700">Timeout (Seconds)</Label>
                      <Input
                        type="number"
                        value={waveConfigState.wave2TimeoutSec}
                        onChange={(e) =>
                          setWaveConfigState((prev) => ({ ...prev, wave2TimeoutSec: parseInt(e.target.value) || 15 }))
                        }
                        className="h-8.5 text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Wave 3 Settings */}
                  <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Wave 3 (City-Wide Surge Broadcast)
                      </span>
                      <Radio className="size-3.5 text-amber-600" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-700">Radius (km)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={waveConfigState.wave3RadiusKm}
                        onChange={(e) =>
                          setWaveConfigState((prev) => ({ ...prev, wave3RadiusKm: parseFloat(e.target.value) || 8.0 }))
                        }
                        className="h-8.5 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-zinc-700">Surge Escalation</Label>
                      <p className="text-xs text-zinc-500 font-medium pt-1">
                        Auto-triggers {currentCity.surgeMultiplier || 1.0}x surge if unaccepted after Wave 2.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live In-Flight Waves */}
                <div className="pt-2 border-t border-zinc-100">
                  <h4 className="text-sm font-bold text-zinc-950 mb-2">Live In-Flight Waves ({liveWavesQuery.data?.activeCount || 0})</h4>
                  <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 text-center text-xs text-zinc-500 font-medium">
                    {liveWavesQuery.data?.activeCount ? (
                      <p className="text-emerald-700 font-bold">{liveWavesQuery.data.activeCount} order waves currently broadcasting in real-time.</p>
                    ) : (
                      <p>All current dispatch queues are fulfilled. 0 active wave broadcasts in flight.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                VIEW 5: ALL CITIES PAN-INDIA MASTER MATRIX
            ========================================================================= */}
            {activeCityTab === "all_cities" && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                      <Globe2 className="size-4 text-purple-600" />
                      <span>Pan-India Master Cities Directory ({allCities.length})</span>
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                      Cross-city operational comparison across all regional states and tiers.
                    </p>
                  </div>

                  <AddCityDialog defaultState={selectedState !== "All States" ? selectedState : "Uttar Pradesh"} />
                </div>

                <DataTable
                  rows={allCities}
                  emptyMessage="No operational cities found."
                  columns={[
                    {
                      key: "city",
                      label: "Operating City Hub",
                      render: (c) => (
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-purple-600 shrink-0" />
                          <div>
                            <p className="font-bold text-zinc-950 text-xs">{c.city}</p>
                            <p className="text-[11px] text-zinc-500 font-medium">{c.state}</p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "tier",
                      label: "Territory Tier",
                      render: (c) => (
                        <span className="font-bold text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {c.tier}
                        </span>
                      ),
                    },
                    {
                      key: "pincodes",
                      label: "Postal Codes",
                      render: (c) => (
                        <span className="font-bold text-xs text-zinc-800">{c.pincodes?.length || 0} Pincodes</span>
                      ),
                    },
                    {
                      key: "stores",
                      label: "Laundromats",
                      render: (c) => (
                        <span className="font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {c.totalPartners || 0} Stores
                        </span>
                      ),
                    },
                    {
                      key: "fleet",
                      label: "Fleet",
                      render: (c) => (
                        <span className="font-bold text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {c.totalRiders || 0} Riders
                        </span>
                      ),
                    },
                    {
                      key: "revenue",
                      label: "Gross GMV",
                      render: (c) => (
                        <span className="font-bold text-xs text-emerald-700">
                          ₹{(c.financials?.grossRevenue || 0).toLocaleString()}
                        </span>
                      ),
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (c) => (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                          <span className="size-1 rounded-full bg-emerald-500" />
                          {c.status || "Active"}
                        </span>
                      ),
                    },
                    {
                      key: "actions",
                      label: "",
                      className: "text-right",
                      render: (c) => (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCityId(c.id);
                            setActiveCityTab("pincodes");
                          }}
                          className="h-8 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        >
                          <span>Manage City</span>
                          <ChevronRight className="size-3.5 ml-1 text-zinc-500" />
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          DIALOGS (PURE WHITE WITH REFINED COLOR ACCENTS)
      ========================================================================= */}
      {addingPincodeCityId && (
        <AddPincodeDialog
          cityId={addingPincodeCityId}
          onClose={() => setAddingPincodeCityId(null)}
        />
      )}

      {addingSectorPincode && (
        <AddSectorDialog
          cityId={addingSectorPincode.cityId}
          pincode={addingSectorPincode.pincode}
          currentArea={addingSectorPincode.currentArea}
          onClose={() => setAddingSectorPincode(null)}
        />
      )}

      {editingPincode && (
        <EditPincodeDialog
          cityId={editingPincode.cityId}
          pincode={editingPincode.pincode}
          detail={editingPincode.detail}
          onClose={() => setEditingPincode(null)}
        />
      )}

      {assigningPartner && (
        <AssignPartnerPincodesDialog
          partner={assigningPartner.partner}
          cityId={assigningPartner.cityId}
          cityName={assigningPartner.cityName}
          cities={allCities}
          onClose={() => setAssigningPartner(null)}
        />
      )}

      {assigningRider && (
        <AssignRiderPincodesDialog
          rider={assigningRider.rider}
          cityId={assigningRider.cityId}
          cityName={assigningRider.cityName}
          cities={allCities}
          onClose={() => setAssigningRider(null)}
        />
      )}
    </AdminShell>
  );
}

/* =========================================================================
   DIALOG 1: ADD STATE TERRITORY DIALOG
========================================================================= */
function AddStateDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [stateName, setStateName] = useState("");
  const [capitalCity, setCapitalCity] = useState("");
  const [tier, setTier] = useState("Tier-2");

  const createMutation = useMutation({
    mutationFn: () =>
      saveState({
        state: stateName.trim(),
        capitalCity: capitalCity.trim(),
        tier,
      }),
    onSuccess: () => {
      toast.success(`State territory ${stateName} created.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "states"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
      setOpen(false);
      setStateName("");
      setCapitalCity("");
    },
    onError: () => toast.error("Failed to add state territory."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8.5 rounded-lg border-zinc-200 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <Landmark className="size-3.5 text-zinc-700" />
          <span>Add State</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
            <Landmark className="size-4 text-purple-600" />
            <span>Add State Territory</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Register a state territory for regional hubs, city rollout, and pincode clustering.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">State Name</Label>
            <Input
              placeholder="e.g. Maharashtra, Rajasthan, Karnataka"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              className="h-9 text-xs font-medium bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">Operating City / Capital</Label>
              <Input
                placeholder="e.g. Mumbai, Jaipur, Bengaluru"
                value={capitalCity}
                onChange={(e) => setCapitalCity(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">Territory Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-zinc-950">
                  <SelectItem value="Tier-1">Tier-1 Metro State</SelectItem>
                  <SelectItem value="Tier-2">Tier-2 Growth State</SelectItem>
                  <SelectItem value="Tier-3">Tier-3 Emerging State</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-lg text-xs font-semibold border-zinc-200 text-zinc-700">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!stateName.trim() || createMutation.isPending}
            className="rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
          >
            {createMutation.isPending ? "Adding..." : "Add State"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   DIALOG 2: ADD CITY DIALOG
========================================================================= */
function AddCityDialog({ defaultState }: { defaultState?: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("");
  const [state, setState] = useState(defaultState || "Uttar Pradesh");
  const [baseFee, setBaseFee] = useState("25");
  const [tier, setTier] = useState("Tier-2");
  const [pincodesInput, setPincodesInput] = useState("");

  useEffect(() => {
    if (defaultState) setState(defaultState);
  }, [defaultState]);

  const createMutation = useMutation({
    mutationFn: () =>
      saveCity({
        city: city.trim(),
        name: city.trim(),
        state: state.trim(),
        baseDeliveryFee: parseFloat(baseFee) || 25,
        tier,
        pincodes: pincodesInput
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length === 6 && /^\d{6}$/.test(p)),
      }),
    onSuccess: () => {
      toast.success(`Operational city ${city} added successfully.`);
      setOpen(false);
      setCity("");
      setPincodesInput("");
      queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
    },
    onError: () => toast.error("Failed to add operational city."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8.5 rounded-lg border-zinc-200 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <Building2 className="size-3.5 text-zinc-700" />
          <span>Add City</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
            <Building2 className="size-4 text-purple-600" />
            <span>Launch Operational City Hub</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Launch a city hub with delivery geofencing, partner stores, and rider fleet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">City Name</Label>
              <Input
                placeholder="e.g. Noida, Gurgaon, Pune"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-9 text-xs bg-white font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">State</Label>
              <Input
                placeholder="e.g. Uttar Pradesh, Haryana"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-9 text-xs bg-white font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">Territory Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-zinc-950">
                  <SelectItem value="Tier-1">Tier-1 Metro City</SelectItem>
                  <SelectItem value="Tier-2">Tier-2 Growth City</SelectItem>
                  <SelectItem value="Tier-3">Tier-3 Emerging Town</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">Base Delivery Fee (₹)</Label>
              <Input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Initial Pincodes (Comma separated)</Label>
            <Input
              placeholder="e.g. 201301, 201303, 201304"
              value={pincodesInput}
              onChange={(e) => setPincodesInput(e.target.value)}
              className="h-9 text-xs bg-white font-mono"
            />
            <p className="text-[11px] text-zinc-400">Enter 6-digit postal codes separated by commas.</p>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-lg text-xs font-semibold border-zinc-200 text-zinc-700">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!city.trim() || createMutation.isPending}
            className="rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
          >
            {createMutation.isPending ? "Adding..." : "Launch City Hub"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   DIALOG 3: ADD PINCODE TO ACTIVE CITY
========================================================================= */
function AddPincodeDialog({ cityId, onClose }: { cityId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [pincode, setPincode] = useState("");
  const [areaName, setAreaName] = useState("");
  const [baseFee, setBaseFee] = useState("25");

  const addMutation = useMutation({
    mutationFn: () =>
      addCityPincode(cityId, {
        pincode: pincode.trim(),
        areaName: areaName.trim() || undefined,
        baseFee: parseFloat(baseFee) || 25,
      }),
    onSuccess: () => {
      toast.success(`Postal code ${pincode} activated.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "cities", "pincodes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "cities", "intelligence"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.message || "Failed to add pincode."),
  });

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
            <MapPin className="size-4 text-purple-600" />
            <span>Add Serviceable Pincode</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Define a 6-digit postal code and primary neighborhood sectors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">6-Digit Postal Code</Label>
            <Input
              placeholder="e.g. 201301"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              className="h-9 text-xs font-mono font-bold bg-white"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Locality / Sectors</Label>
            <Input
              placeholder="e.g. Sector 18, Atta Market, Sector 15"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              className="h-9 text-xs bg-white"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Base Delivery Fee (₹)</Label>
            <Input
              type="number"
              value={baseFee}
              onChange={(e) => setBaseFee(e.target.value)}
              className="h-9 text-xs bg-white"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg text-xs font-semibold border-zinc-200 text-zinc-700">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => addMutation.mutate()}
            disabled={!pincode.trim() || pincode.length !== 6 || addMutation.isPending}
            className="rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
          >
            {addMutation.isPending ? "Adding..." : "Add Pincode"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   DIALOG 4: ADD SECTOR / LOCALITY TO PINCODE
========================================================================= */
function AddSectorDialog({
  cityId,
  pincode,
  currentArea,
  onClose,
}: {
  cityId: string;
  pincode: string;
  currentArea: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [newSector, setNewSector] = useState("");

  const updateMutation = useMutation({
    mutationFn: () => {
      const updatedArea = currentArea ? `${currentArea}, ${newSector.trim()}` : newSector.trim();
      return updateCityPincode(cityId, pincode, { areaName: updatedArea });
    },
    onSuccess: () => {
      toast.success(`Sector added to Pincode ${pincode}.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "cities", "pincodes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "cities", "intelligence"] });
      onClose();
    },
    onError: () => toast.error("Failed to add sector."),
  });

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
            <Plus className="size-4 text-purple-600" />
            <span>Add Sector to Pincode {pincode}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Add a new sector, neighborhood, or landmark inside this postal code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Current Covered Sectors</Label>
            <p className="text-xs font-medium text-zinc-600 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
              {currentArea || "No sectors specified."}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">New Sector / Area Name</Label>
            <Input
              placeholder="e.g. Sector 62 Block B, Electronic City"
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              className="h-9 text-xs bg-white font-medium"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg text-xs font-semibold border-zinc-200 text-zinc-700">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate()}
            disabled={!newSector.trim() || updateMutation.isPending}
            className="rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
          >
            {updateMutation.isPending ? "Adding..." : "Add Sector"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   DIALOG 5: EDIT PINCODE SETTINGS
========================================================================= */
function EditPincodeDialog({
  cityId,
  pincode,
  detail,
  onClose,
}: {
  cityId: string;
  pincode: string;
  detail: PincodeDetail;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [areaName, setAreaName] = useState(detail.areaName || "");
  const [baseFee, setBaseFee] = useState(String(detail.baseFee || 25));
  const [surge, setSurge] = useState(String(detail.surgeMultiplier || 1.0));
  const [status, setStatus] = useState(detail.status || "Active");

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCityPincode(cityId, pincode, {
        areaName: areaName.trim(),
        baseFee: parseFloat(baseFee) || 25,
        surgeMultiplier: parseFloat(surge) || 1.0,
        status,
      }),
    onSuccess: () => {
      toast.success(`Pincode ${pincode} settings updated.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "cities", "pincodes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "cities", "intelligence"] });
      onClose();
    },
    onError: () => toast.error("Failed to update pincode."),
  });

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
            <Edit2 className="size-4 text-purple-600" />
            <span>Edit Pincode {pincode}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Configure delivery fee, surge multiplier, and serviceability status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Covered Localities / Sectors</Label>
            <Input
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              className="h-9 text-xs bg-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">Base Fee (₹)</Label>
              <Input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">Surge Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                value={surge}
                onChange={(e) => setSurge(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Operational Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white text-zinc-950">
                <SelectItem value="Active">Active Service Zone</SelectItem>
                <SelectItem value="High Demand">High Demand Surge</SelectItem>
                <SelectItem value="Paused">Temporarily Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg text-xs font-semibold border-zinc-200 text-zinc-700">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   DIALOG 6: ASSIGN PARTNER STORE PINCODES
========================================================================= */
function AssignPartnerPincodesDialog({
  partner,
  cityId,
  cityName,
  cities,
  onClose,
}: {
  partner: CityPartner | PincodePartner;
  cityId: string;
  cityName: string;
  cities: CityIntelligence[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const currentCityObj = cities.find((c) => c.id === cityId);
  const availablePincodes = currentCityObj?.pincodes || [];

  const [selectedPins, setSelectedPins] = useState<string[]>(
    partner.servicePincodes && partner.servicePincodes.length > 0
      ? partner.servicePincodes
      : availablePincodes.length > 0
      ? [availablePincodes[0]]
      : []
  );

  const assignMutation = useMutation({
    mutationFn: () => assignPartnerPincodes(partner.id, selectedPins),
    onSuccess: () => {
      toast.success(`Service pincodes updated for ${partner.name || partner.storeName}.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
      onClose();
    },
    onError: () => toast.error("Failed to map pincodes."),
  });

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
            <Store className="size-4 text-emerald-600" />
            <span>Map Service Pincodes: {partner.name || partner.storeName}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Assign the delivery postal codes this partner facility is authorized to service in {cityName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <Label className="text-xs font-semibold text-zinc-800">Select Operating Pincodes</Label>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
            {availablePincodes.map((pin) => {
              const checked = selectedPins.includes(pin);
              return (
                <button
                  key={pin}
                  type="button"
                  onClick={() => {
                    setSelectedPins((prev) =>
                      prev.includes(pin) ? prev.filter((p) => p !== pin) : [...prev, pin]
                    );
                  }}
                  className={`p-2 rounded-lg border text-center font-mono text-xs font-semibold transition-all cursor-pointer ${
                    checked
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold border-2 shadow-xs"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {pin}
                </button>
              );
            })}
          </div>
          {availablePincodes.length === 0 && (
            <p className="text-xs text-zinc-500 py-2">No postal codes registered in this city yet.</p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg text-xs font-semibold border-zinc-200 text-zinc-700">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending}
            className="rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
          >
            {assignMutation.isPending ? "Saving..." : "Save Coverage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   DIALOG 7: ASSIGN RIDER FLEET PINCODES
========================================================================= */
function AssignRiderPincodesDialog({
  rider,
  cityId,
  cityName,
  cities,
  onClose,
}: {
  rider: CityCaptain | PincodeCaptain;
  cityId: string;
  cityName: string;
  cities: CityIntelligence[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const currentCityObj = cities.find((c) => c.id === cityId);
  const availablePincodes = currentCityObj?.pincodes || [];

  const [selectedPins, setSelectedPins] = useState<string[]>(
    rider.pincodes && rider.pincodes.length > 0
      ? rider.pincodes
      : availablePincodes.length > 0
      ? [availablePincodes[0]]
      : []
  );

  const assignMutation = useMutation({
    mutationFn: () => assignRiderPincodes(rider.riderId || (rider as any).id, selectedPins),
    onSuccess: () => {
      toast.success(`Stationing pincodes updated for captain ${rider.name}.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
      onClose();
    },
    onError: () => toast.error("Failed to update rider stationing."),
  });

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
            <Bike className="size-4 text-sky-600" />
            <span>Stationing Geofence: Captain {rider.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Define the postal zones in {cityName} where this captain receives dispatch priority.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <Label className="text-xs font-semibold text-zinc-800">Stationing Postal Codes</Label>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
            {availablePincodes.map((pin) => {
              const checked = selectedPins.includes(pin);
              return (
                <button
                  key={pin}
                  type="button"
                  onClick={() => {
                    setSelectedPins((prev) =>
                      prev.includes(pin) ? prev.filter((p) => p !== pin) : [...prev, pin]
                    );
                  }}
                  className={`p-2 rounded-lg border text-center font-mono text-xs font-semibold transition-all cursor-pointer ${
                    checked
                      ? "border-sky-600 bg-sky-50 text-sky-900 font-bold border-2 shadow-xs"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {pin}
                </button>
              );
            })}
          </div>
          {availablePincodes.length === 0 && (
            <p className="text-xs text-zinc-500 py-2">No postal codes registered in this city yet.</p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-lg text-xs font-semibold border-zinc-200 text-zinc-700">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending}
            className="rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
          >
            {assignMutation.isPending ? "Saving..." : "Save Stationing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
