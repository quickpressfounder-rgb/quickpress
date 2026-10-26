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
      "Cities & Regional Hubs Engine",
      "Enterprise city territory hierarchy, pincode serviceability, partner store coverage, rider fleet stationing, and pod dispatch intelligence.",
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

  const [activeTab, setActiveTab] = useState<"pincodes" | "cities" | "partners" | "riders" | "states" | "dispatch">("pincodes");
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
      toast.success("Zomato Pod & Wave dispatch parameters saved.");
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

  const stats = statsQuery.data;

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
      if (c.status === "Active") existing.liveCities += 1;
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

  // Active City
  const currentCity = useMemo(() => {
    if (selectedCityId) {
      const found = allCities.find((c) => c.id === selectedCityId);
      if (found) return found;
    }
    return filteredCities[0] || allCities[0] || null;
  }, [allCities, selectedCityId, filteredCities]);

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

  // Network metrics calculated from live database
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

  // Flat Partners & Riders for tabs
  const allPartnersList = useMemo(() => {
    const arr: { partner: CityPartner; city: CityIntelligence }[] = [];
    filteredCities.forEach((c) => {
      (c.partnerList || []).forEach((p) => {
        arr.push({ partner: p, city: c });
      });
    });
    return arr;
  }, [filteredCities]);

  const allRidersList = useMemo(() => {
    const arr: { rider: CityCaptain; city: CityIntelligence }[] = [];
    filteredCities.forEach((c) => {
      (c.riderList || []).forEach((r) => {
        arr.push({ rider: r, city: c });
      });
    });
    return arr;
  }, [filteredCities]);

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

  const currentCityGMV = currentCity?.financials?.grossRevenue || 0.0;
  const currentCityOrders = currentCity?.financials?.totalOrders || 0;
  const cityDailySales = currentCityGMV > 0 ? currentCityGMV / 30 : 0.0;
  const cityOrderVelocity = currentCityOrders > 0 ? Math.ceil(currentCityOrders / 30) : 0;

  return (
    <AdminShell
      title="Cities & Regional Operations"
      subtitle="Pan-India territory hierarchy, pincode serviceability, partner store coverage & pod dispatch"
      actions={
        <div className="flex items-center gap-2">
          <AddStateDialog />
          <AddCityDialog defaultState={selectedState !== "All States" ? selectedState : "Uttar Pradesh"} />
          {currentCity && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddingPincodeCityId(currentCity.id)}
              className="h-9 rounded-lg border-zinc-200 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5 mr-1 text-zinc-700" />
              <span>Add Pincode</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 bg-white min-h-screen text-zinc-950 pb-12">
        {/* =========================================================================
            1. EXECUTIVE METRICS STRIP (PURE WHITE BACKGROUND, CRISP BLACK TYPOGRAPHY)
        ========================================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Cities</span>
              <Building2 className="size-4 text-zinc-700" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">{metrics.totalCities}</p>
            <p className="mt-0.5 text-xs text-zinc-500 font-medium">Multi-state operating hubs</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Pincodes</span>
              <MapPin className="size-4 text-zinc-700" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">{metrics.totalPincodes}</p>
            <p className="mt-0.5 text-xs text-zinc-500 font-medium">100% full territory coverage</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Partner Stores</span>
              <Store className="size-4 text-zinc-700" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">{metrics.totalHubs}</p>
            <p className="mt-0.5 text-xs text-zinc-500 font-medium">Laundromat service centers</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Delivery Fleet</span>
              <Bike className="size-4 text-zinc-700" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">{metrics.totalCaptains}</p>
            <p className="mt-0.5 text-xs text-zinc-500 font-medium">On-duty stationed captains</p>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Delivered GMV</span>
              <IndianRupee className="size-4 text-zinc-700" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">
              ₹{metrics.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 font-medium">Total live platform orders</p>
          </div>
        </div>

        {/* =========================================================================
            2. TERRITORY COMMAND & FILTER BAR
        ========================================================================= */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe2 className="size-4 text-zinc-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">State Territory Filter</span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search city, state, or 6-digit pincode..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-8.5 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          {/* State Selector Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setSelectedState("All States")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedState === "All States"
                  ? "border-2 border-zinc-950 bg-white text-zinc-950 font-bold shadow-xs"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              <Layers className="size-3.5" />
              <span>All Territories ({allCities.length})</span>
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? "border-2 border-zinc-950 bg-white text-zinc-950 font-bold shadow-xs"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                >
                  <Landmark className="size-3.5" />
                  <span>{st.state}</span>
                  <span
                    className={`ml-1 rounded px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected ? "bg-zinc-100 text-zinc-950 border border-zinc-300" : "bg-zinc-50 text-zinc-600 border border-zinc-200"
                    }`}
                  >
                    {st.citiesCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            3. ZOMATO / SWIGGY COMMAND TABS NAVIGATION
        ========================================================================= */}
        <div className="border-b border-zinc-200">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2">
              <TabsTrigger
                value="pincodes"
                className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950 data-[state=active]:font-bold data-[state=active]:bg-white"
              >
                <MapPin className="size-3.5" />
                <span>Coverage & Pincodes</span>
              </TabsTrigger>

              <TabsTrigger
                value="cities"
                className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950 data-[state=active]:font-bold data-[state=active]:bg-white"
              >
                <Building2 className="size-3.5" />
                <span>Cities & Hubs ({allCities.length})</span>
              </TabsTrigger>

              <TabsTrigger
                value="partners"
                className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950 data-[state=active]:font-bold data-[state=active]:bg-white"
              >
                <Store className="size-3.5" />
                <span>Partner Stores ({allPartnersList.length})</span>
              </TabsTrigger>

              <TabsTrigger
                value="riders"
                className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950 data-[state=active]:font-bold data-[state=active]:bg-white"
              >
                <Bike className="size-3.5" />
                <span>Rider Fleet ({allRidersList.length})</span>
              </TabsTrigger>

              <TabsTrigger
                value="states"
                className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950 data-[state=active]:font-bold data-[state=active]:bg-white"
              >
                <Layers className="size-3.5" />
                <span>States Directory ({stateList.length})</span>
              </TabsTrigger>

              <TabsTrigger
                value="dispatch"
                className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-zinc-600 transition-all data-[state=active]:border-zinc-950 data-[state=active]:text-zinc-950 data-[state=active]:font-bold data-[state=active]:bg-white"
              >
                <Zap className="size-3.5" />
                <span>Pod Dispatch & Waves</span>
                {Boolean(liveWavesQuery.data?.activeCount) && (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2">
                    {liveWavesQuery.data?.activeCount} Active
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* =========================================================================
            TAB 1: CITY PINCODE & DEEP COVERAGE INTELLIGENCE
        ========================================================================= */}
        {activeTab === "pincodes" && (
          <div className="space-y-6">
            {!currentCity ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-xs">
                <Building2 className="mx-auto size-10 text-zinc-400" />
                <h3 className="mt-3 text-sm font-bold text-zinc-950">No Operational Cities Configured</h3>
                <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                  Click below to launch your first city and define postal code serviceability.
                </p>
                <div className="mt-4 flex justify-center">
                  <AddCityDialog defaultState={selectedState !== "All States" ? selectedState : "Uttar Pradesh"} />
                </div>
              </div>
            ) : (
              <>
                {/* City Selection Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Select Operational City ({filteredCities.length})
                    </span>
                    <AddCityDialog defaultState={selectedState !== "All States" ? selectedState : "Uttar Pradesh"} />
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {filteredCities.map((c) => {
                      const isSelected = c.id === currentCity.id || c.city.toLowerCase() === currentCity.city.toLowerCase();
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
                          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-white ${
                            isSelected
                              ? "border-zinc-950 ring-1 ring-zinc-950 shadow-xs"
                              : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="font-bold text-sm text-zinc-950">{c.city}</span>
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase px-1.5 py-0.2 rounded bg-zinc-100">
                              {c.tier}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 font-medium">{c.state}</p>

                          <div className="mt-3 w-full border-t border-zinc-100 pt-2 flex items-center justify-between text-xs">
                            <span className="text-zinc-600 font-medium">{c.pincodes?.length || 0} Pincodes</span>
                            <span className="font-bold text-zinc-950">₹{(c.financials?.grossRevenue || 0).toFixed(0)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected City Overview Card */}
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold tracking-tight text-zinc-950">{currentCity.city} Operations</h2>
                        <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                          {currentCity.status} Hub
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        State: <strong className="text-zinc-900">{currentCity.state}</strong> · Tier:{" "}
                        <strong className="text-zinc-900">{currentCity.tier}</strong> · Delivery Radius:{" "}
                        <strong className="text-zinc-900">{currentCity.deliveryRadiusKm || 15} km</strong> · Base Fee:{" "}
                        <strong className="text-zinc-900">₹{currentCity.baseDeliveryFee || 25}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddingPincodeCityId(currentCity.id)}
                        className="h-8 rounded-lg border-zinc-200 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 shadow-xs cursor-pointer"
                      >
                        <Plus className="size-3.5 mr-1 text-zinc-700" /> Add Pincode to {currentCity.city}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${currentCity.city}? This will remove it from all portals.`)) {
                            deleteCityMutation.mutate(currentCity.id);
                          }
                        }}
                        disabled={deleteCityMutation.isPending}
                        className="h-8 rounded-lg border-zinc-200 bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 shadow-xs cursor-pointer"
                      >
                        <Trash2 className="size-3.5 mr-1" /> Delete City
                      </Button>
                    </div>
                  </div>

                  {/* Real Data KPI Cards for Active City */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Serviceable Pincodes</p>
                      <p className="mt-1 text-xl font-bold text-zinc-950">{pincodeList.length} Postal Codes</p>
                      <p className="text-[11px] text-zinc-500 font-medium">100% full territory coverage</p>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Delivered GMV</p>
                      <p className="mt-1 text-xl font-bold text-zinc-950">₹{currentCityGMV.toFixed(2)}</p>
                      <p className="text-[11px] text-zinc-500 font-medium">Platform Share (18%): ₹{(currentCityGMV * 0.18).toFixed(2)}</p>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Order Velocity</p>
                      <p className="mt-1 text-xl font-bold text-zinc-950">{cityOrderVelocity} Orders / Day</p>
                      <p className="text-[11px] text-zinc-500 font-medium">Daily Revenue: ₹{cityDailySales.toFixed(2)}</p>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Stores & Captains</p>
                      <p className="mt-1 text-xl font-bold text-zinc-950">
                        {currentCity.totalPartners || 0} Stores · {currentCity.totalRiders || 0} Riders
                      </p>
                      <p className="text-[11px] text-zinc-500 font-medium">
                        {currentCity.onlineRiders || 0} On-Duty Captains Active
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pincodes in Active City */}
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950">
                        Postal Codes in {currentCity.city} ({pincodeList.length})
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        Select any pincode below to view assigned partner stores, stationed captains, and dispatch health.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setAddingPincodeCityId(currentCity.id)}
                      className="h-8 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-900 text-zinc-950 text-xs font-bold px-3 cursor-pointer shadow-xs"
                    >
                      <Plus className="size-3.5 mr-1" /> Add Pincode
                    </Button>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {pincodeList.map((p) => {
                      const isSelected = p.pincode === activePincodeDetail?.pincode;
                      return (
                        <button
                          key={p.pincode}
                          type="button"
                          onClick={() => setSelectedPincode(p.pincode)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer bg-white ${
                            isSelected
                              ? "border-zinc-950 ring-1 ring-zinc-950 shadow-xs"
                              : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-bold text-zinc-950">{p.pincode}</span>
                            <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.2 text-[10px] font-bold">
                              {p.status}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-600 font-medium truncate mt-1">{p.areaName}</p>

                          <div className="mt-3 border-t border-zinc-100 pt-2 text-[11px] space-y-0.5">
                            <div className="flex justify-between text-zinc-500">
                              <span>Stores:</span>
                              <span className="font-semibold text-zinc-900">{p.partnersCount} Hubs</span>
                            </div>
                            <div className="flex justify-between text-zinc-500">
                              <span>Captains:</span>
                              <span className="font-semibold text-zinc-900">
                                {p.ridersCount} Fleet ({p.onlineRidersCount} Online)
                              </span>
                            </div>
                            <div className="flex justify-between text-zinc-500">
                              <span>GMV:</span>
                              <span className="font-bold text-zinc-950">₹{p.grossRevenue.toFixed(2)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pincode Drilldown Card */}
                {activePincodeDetail && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-zinc-950">
                              Pincode {activePincodeDetail.pincode} — {activePincodeDetail.areaName}
                            </h3>
                            <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                              Active Service Zone
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            {currentCity.city}, {currentCity.state} · Base Delivery Fee: ₹{activePincodeDetail.baseFee} · Surge Multiplier: {activePincodeDetail.surgeMultiplier}x
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
                            <Plus className="size-3 mr-1" /> Add Sector
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
                            <Edit2 className="size-3 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Remove pincode ${activePincodeDetail.pincode} from ${currentCity.city}?`)) {
                                deletePincodeMutation.mutate({ cityId: currentCity.id, pincode: activePincodeDetail.pincode });
                              }
                            }}
                            className="h-8 rounded-lg border-zinc-200 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Financial Metrics Strip */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-3 text-center">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Delivered Volume</p>
                          <p className="text-base font-bold text-zinc-950">₹{activePincodeDetail.grossRevenue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Delivered Orders</p>
                          <p className="text-base font-bold text-zinc-950">{activePincodeDetail.totalOrders} Orders</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Stores Earnings (70%)</p>
                          <p className="text-base font-bold text-zinc-950">₹{activePincodeDetail.partnerEarnings.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Riders Payout (12%)</p>
                          <p className="text-base font-bold text-zinc-950">₹{activePincodeDetail.riderEarnings.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stores in Pincode Table */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                        <h4 className="text-sm font-bold text-zinc-950">
                          Partner Stores Serving {activePincodeDetail.pincode} ({activePincodeDetail.partners.length})
                        </h4>
                      </div>

                      <DataTable
                        loading={pincodesIntelligenceQuery.isLoading}
                        rows={activePincodeDetail.partners}
                        emptyMessage="No partner stores mapped to this pincode."
                        columns={[
                          {
                            key: "store",
                            label: "Partner Store Name",
                            render: (p) => (
                              <div>
                                <p className="font-bold text-zinc-950 text-xs">{p.name || p.storeName}</p>
                                <p className="text-[11px] text-zinc-500 font-medium">{p.address}</p>
                              </div>
                            ),
                          },
                          {
                            key: "pincodes",
                            label: "Covered Pincodes",
                            render: (p) => (
                              <span className="font-mono text-xs font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                {(p.servicePincodes || [activePincodeDetail.pincode]).join(", ")}
                              </span>
                            ),
                          },
                          {
                            key: "status",
                            label: "Status",
                            render: (p) => (
                              <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
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
                                <Crosshair className="size-3 mr-1 text-zinc-600" /> Map Pincodes
                              </Button>
                            ),
                          },
                        ]}
                      />
                    </div>

                    {/* Delivery Captains in Pincode Table */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                        <h4 className="text-sm font-bold text-zinc-950">
                          Delivery Fleet Stationed in {activePincodeDetail.pincode} ({activePincodeDetail.riders.length})
                        </h4>
                      </div>

                      <DataTable
                        loading={pincodesIntelligenceQuery.isLoading}
                        rows={activePincodeDetail.riders}
                        emptyMessage="No delivery captains stationed in this pincode."
                        columns={[
                          {
                            key: "rider",
                            label: "Captain & Vehicle",
                            render: (r) => (
                              <div>
                                <p className="font-bold text-zinc-950 text-xs">{r.name}</p>
                                <p className="text-[11px] text-zinc-500 font-medium">
                                  {r.vehicle || "Motorbike"} · {r.plate || "—"}
                                </p>
                              </div>
                            ),
                          },
                          {
                            key: "liveState",
                            label: "Status",
                            render: (r) => (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                  r.liveState === "Online"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-zinc-100 text-zinc-600 border-zinc-200"
                                }`}
                              >
                                {r.liveState || "Offline"}
                              </span>
                            ),
                          },
                          {
                            key: "phone",
                            label: "Contact",
                            render: (r) => <span className="font-mono text-xs text-zinc-800 font-medium">{r.phone}</span>,
                          },
                          {
                            key: "actions",
                            label: "",
                            className: "text-right",
                            render: (r) => (
                              <div className="flex items-center justify-end gap-1.5">
                                <a
                                  href={`tel:${r.phone}`}
                                  className="flex size-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                >
                                  <Phone className="size-3" />
                                </a>
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
                                  <UserCheck className="size-3 mr-1 text-zinc-600" /> Reassign
                                </Button>
                              </div>
                            ),
                          },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: MASTER CITIES DIRECTORY
        ========================================================================= */}
        {activeTab === "cities" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950">Master Cities Directory ({filteredCities.length})</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Rollout status, base delivery fees, postal coverage, and operating partner density.
                </p>
              </div>
              <AddCityDialog defaultState={selectedState !== "All States" ? selectedState : "Uttar Pradesh"} />
            </div>

            <DataTable
              loading={citiesQuery.isLoading}
              rows={filteredCities}
              columns={[
                {
                  key: "city",
                  label: "City & State",
                  render: (c) => (
                    <div>
                      <p className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
                        {c.city}
                        <span className="rounded bg-zinc-100 text-zinc-600 text-[10px] px-1.5 py-0.2 font-semibold">
                          {c.tier}
                        </span>
                      </p>
                      <p className="text-[11px] text-zinc-500 font-medium">
                        {c.state}, India · {c.pincodes?.length || 1} Pincodes
                      </p>
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (c) => <StatusPill value={c.status} />,
                },
                {
                  key: "pincodes",
                  label: "Pincodes Covered",
                  render: (c) => (
                    <span className="font-mono text-xs font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      {(c.pincodes || []).join(", ") || "—"}
                    </span>
                  ),
                },
                {
                  key: "partners",
                  label: "Partner Stores",
                  render: (c) => (
                    <span className="text-xs font-semibold text-zinc-900">{c.totalPartners ?? 0} Hubs</span>
                  ),
                },
                {
                  key: "captains",
                  label: "Fleet",
                  render: (c) => (
                    <span className="text-xs font-semibold text-zinc-900">
                      {c.totalRiders ?? 0} Riders ({c.onlineRiders ?? 0} Online)
                    </span>
                  ),
                },
                {
                  key: "revenue",
                  label: "Delivered GMV",
                  render: (c) => (
                    <span className="text-xs font-bold text-zinc-950 font-mono">
                      ₹{(c.financials?.grossRevenue || 0).toFixed(2)}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: (c) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        onClick={() => {
                          setSelectedCityId(c.id);
                          setActiveTab("pincodes");
                        }}
                      >
                        <Eye className="size-3 mr-1" /> View Pincodes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg border-zinc-200 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        disabled={deleteCityMutation.isPending}
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${c.city}?`)) {
                            deleteCityMutation.mutate(c.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* =========================================================================
            TAB 3: PARTNER STORES MATRIX
        ========================================================================= */}
        {activeTab === "partners" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-950">Partner Stores Matrix ({allPartnersList.length})</h3>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Laundromat facilities mapped to postal service codes for pickup and delivery routing.
              </p>
            </div>

            <DataTable
              loading={citiesQuery.isLoading}
              rows={allPartnersList}
              columns={[
                {
                  key: "store",
                  label: "Partner Store",
                  render: ({ partner, city }) => (
                    <div>
                      <p className="font-bold text-zinc-950 text-xs">{partner.name || partner.storeName}</p>
                      <p className="text-[11px] text-zinc-500 font-medium">{partner.address || `${city.city}, ${city.state}`}</p>
                    </div>
                  ),
                },
                {
                  key: "city",
                  label: "City Territory",
                  render: ({ city }) => (
                    <div className="text-xs">
                      <p className="font-bold text-zinc-950">{city.city}</p>
                      <p className="text-[11px] text-zinc-500">{city.state}</p>
                    </div>
                  ),
                },
                {
                  key: "pincodes",
                  label: "Covered Pincodes",
                  render: ({ partner, city }) => (
                    <span className="font-mono text-xs font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      {(partner.servicePincodes || (city.pincodes || [])).join(", ")}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: ({ partner }) => (
                    <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      {partner.status || "Active"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: ({ partner, city }) => (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                      onClick={() => setAssigningPartner({ partner, cityId: city.id, cityName: city.city })}
                    >
                      <Crosshair className="size-3 mr-1 text-zinc-600" /> Assign Pincodes
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* =========================================================================
            TAB 4: RIDER FLEET STATIONING
        ========================================================================= */}
        {activeTab === "riders" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-950">Rider Fleet Stationing ({allRidersList.length})</h3>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Captains stationed across specific postal sectors for rapid dispatch assignment.
              </p>
            </div>

            <DataTable
              loading={citiesQuery.isLoading}
              rows={allRidersList}
              columns={[
                {
                  key: "rider",
                  label: "Captain Name & Vehicle",
                  render: ({ rider }) => (
                    <div>
                      <p className="font-bold text-zinc-950 text-xs">{rider.name}</p>
                      <p className="text-[11px] text-zinc-500 font-medium">
                        {rider.vehicle || "Motorbike"} · {rider.plate || "—"}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "city",
                  label: "City",
                  render: ({ city }) => (
                    <div className="text-xs">
                      <p className="font-bold text-zinc-950">{city.city}</p>
                      <p className="text-[11px] text-zinc-500">{city.state}</p>
                    </div>
                  ),
                },
                {
                  key: "pincodes",
                  label: "Stationed Pincodes",
                  render: ({ rider, city }) => (
                    <span className="font-mono text-xs font-semibold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      {(rider.pincodes || (city.pincodes || [])).join(", ")}
                    </span>
                  ),
                },
                {
                  key: "liveState",
                  label: "State",
                  render: ({ rider }) => (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                        rider.liveState === "Online"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}
                    >
                      {rider.liveState || "Offline"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: ({ rider, city }) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <a
                        href={`tel:${rider.phone}`}
                        className="flex size-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                      >
                        <Phone className="size-3" />
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg border-zinc-200 text-xs font-semibold text-zinc-900 hover:bg-zinc-50"
                        onClick={() => setAssigningRider({ rider, cityId: city.id, cityName: city.city })}
                      >
                        <UserCheck className="size-3 mr-1 text-zinc-600" /> Station Pincode
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* =========================================================================
            TAB 5: STATE DIRECTORY
        ========================================================================= */}
        {activeTab === "states" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950">State Territory Hierarchy ({stateList.length})</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  State-level network rollup, operational hubs, and gross territory sales.
                </p>
              </div>
              <AddStateDialog />
            </div>

            <DataTable
              loading={statesQuery.isLoading}
              rows={stateList}
              columns={[
                {
                  key: "state",
                  label: "State Territory",
                  render: (s) => (
                    <div className="flex items-center gap-2">
                      <Landmark className="size-4 text-zinc-600" />
                      <span className="font-bold text-xs text-zinc-950">{s.state}</span>
                    </div>
                  ),
                },
                {
                  key: "cities",
                  label: "Operating Cities",
                  render: (s) => (
                    <span className="font-semibold text-xs text-zinc-900">
                      {s.citiesCount} Cities ({s.liveCities} Live)
                    </span>
                  ),
                },
                {
                  key: "partners",
                  label: "Partner Stores",
                  render: (s) => <span className="font-semibold text-xs text-zinc-900">{s.partners} Stores</span>,
                },
                {
                  key: "riders",
                  label: "Delivery Fleet",
                  render: (s) => <span className="font-semibold text-xs text-zinc-900">{s.riders} Captains</span>,
                },
                {
                  key: "customers",
                  label: "Customer Base",
                  render: (s) => <span className="font-semibold text-xs text-zinc-900">{s.customers} Users</span>,
                },
                {
                  key: "sales",
                  label: "Delivered GMV",
                  render: (s) => (
                    <span className="font-bold text-xs text-zinc-950 font-mono">
                      ₹{(s.sales || 0).toFixed(2)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* =========================================================================
            TAB 6: POD DISPATCH & CONCENTRIC WAVES (ZOMATO-STYLE)
        ========================================================================= */}
        {activeTab === "dispatch" && (
          <div className="space-y-6">
            {/* Wave Parameters Editor */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Concentric Wave Dispatch Engine</h3>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    Configure micro-zone radii and escalation timeouts for automated rider assignment.
                  </p>
                </div>

                <Button
                  onClick={() => updateDispatchMutation.mutate(waveConfigState)}
                  disabled={updateDispatchMutation.isPending}
                  className="bg-white hover:bg-zinc-100 border-2 border-zinc-900 text-zinc-950 font-bold text-xs h-8.5 px-3.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Save className="size-3.5" />
                  <span>{updateDispatchMutation.isPending ? "Saving..." : "Save Parameters"}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Wave 1 Settings */}
                <div className="p-4 rounded-lg border border-zinc-200 bg-white space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-600" />
                    <h4 className="font-bold text-xs text-zinc-950 uppercase tracking-wider">
                      Wave 1: Ultra-Local Pod
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Priority window for captains closest to store. Rings first for rapid fulfillment.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zinc-700">Radius Limit (km)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="5.0"
                      value={waveConfigState.wave1RadiusKm ?? 1.8}
                      onChange={(e) => setWaveConfigState((prev) => ({ ...prev, wave1RadiusKm: parseFloat(e.target.value) || 1.8 }))}
                      className="bg-white text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zinc-700">Priority Timeout (seconds)</Label>
                    <Input
                      type="number"
                      step="1"
                      min="5"
                      max="60"
                      value={waveConfigState.wave1TimeoutSec ?? 15}
                      onChange={(e) => setWaveConfigState((prev) => ({ ...prev, wave1TimeoutSec: parseInt(e.target.value, 10) || 15 }))}
                      className="bg-white text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Wave 2 Settings */}
                <div className="p-4 rounded-lg border border-zinc-200 bg-white space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-zinc-600" />
                    <h4 className="font-bold text-xs text-zinc-950 uppercase tracking-wider">
                      Wave 2: Neighboring Pods
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Cascades outwards to adjacent sectors if no captain in Wave 1 accepts within timeout.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zinc-700">Radius Limit (km)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="10.0"
                      value={waveConfigState.wave2RadiusKm ?? 4.0}
                      onChange={(e) => setWaveConfigState((prev) => ({ ...prev, wave2RadiusKm: parseFloat(e.target.value) || 4.0 }))}
                      className="bg-white text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zinc-700">Escalation Timeout (seconds)</Label>
                    <Input
                      type="number"
                      step="1"
                      min="5"
                      max="60"
                      value={waveConfigState.wave2TimeoutSec ?? 15}
                      onChange={(e) => setWaveConfigState((prev) => ({ ...prev, wave2TimeoutSec: parseInt(e.target.value, 10) || 15 }))}
                      className="bg-white text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Wave 3 Settings */}
                <div className="p-4 rounded-lg border border-zinc-200 bg-white space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-zinc-400" />
                    <h4 className="font-bold text-xs text-zinc-950 uppercase tracking-wider">
                      Wave 3: Citywide Fleet
                    </h4>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    Full city perimeter fallback. Broadcasts to all active fleet captains for guaranteed pickup.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-zinc-700">Radius Limit (km)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="3.0"
                      max="25.0"
                      value={waveConfigState.wave3RadiusKm ?? 8.0}
                      onChange={(e) => setWaveConfigState((prev) => ({ ...prev, wave3RadiusKm: parseFloat(e.target.value) || 8.0 }))}
                      className="bg-white text-xs font-semibold"
                    />
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 font-medium mt-3">
                    Smart Fallback: If 0 captains are online in Wave 1, engine immediately promotes to Wave 2.
                  </div>
                </div>
              </div>
            </div>

            {/* Live Wave Escalation Surveillance */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Active Wave Surveillance</h3>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    Real-time monitoring of in-flight orders escalating across spatial pods.
                  </p>
                </div>

                <Button
                  onClick={() => liveWavesQuery.refetch()}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold h-8 rounded-lg border-zinc-200 text-zinc-900 flex items-center gap-1.5"
                >
                  <RefreshCw className={`size-3.5 ${liveWavesQuery.isFetching ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </Button>
              </div>

              {liveWavesQuery.data?.liveWaves && liveWavesQuery.data.liveWaves.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px] bg-zinc-50/50">
                        <th className="py-2.5 px-3">Order Code</th>
                        <th className="py-2.5 px-3">Active Wave</th>
                        <th className="py-2.5 px-3">Zone Tier</th>
                        <th className="py-2.5 px-3">Notified Captains</th>
                        <th className="py-2.5 px-3">Dispatched At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {liveWavesQuery.data.liveWaves.map((wave) => (
                        <tr key={wave.rideId} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-zinc-950">
                            #{wave.orderCode || wave.rideId.slice(-6).toUpperCase()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 font-semibold text-[10px] border border-zinc-200">
                              Wave {wave.currentWave}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-zinc-700 capitalize">
                            {wave.tierLabel.replace("_", " ")}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-zinc-950">
                            {wave.waveCaptainsCount} Captains
                          </td>
                          <td className="py-2.5 px-3 text-zinc-500 font-mono">
                            {new Date(wave.dispatchedAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-1.5">
                  <CheckCircle2 className="size-8 text-zinc-400" />
                  <h4 className="font-bold text-sm text-zinc-950">All Orders Dispatched & Claimed</h4>
                  <p className="text-xs text-zinc-500 max-w-sm">
                    No active concentric wave timers currently escalating. Orders are claimed by nearby captains.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODALS & DIALOGS (PURE WHITE, CLEAN BORDERS, CRISP TYPOGRAPHY)
      ========================================================================= */}
      {editingPincode && (
        <EditPincodeDialog
          cityId={editingPincode.cityId}
          pincode={editingPincode.pincode}
          detail={editingPincode.detail}
          onClose={() => setEditingPincode(null)}
        />
      )}

      {addingPincodeCityId && (
        <AddPincodeDialog
          cityId={addingPincodeCityId}
          cityName={currentCity?.city || ""}
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
   DIALOG 1: ADD STATE DIALOG
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
        capital: capitalCity.trim() || `${stateName.trim()} Central`,
        tier,
      }),
    onSuccess: () => {
      toast.success(`State ${stateName} added successfully.`);
      setOpen(false);
      setStateName("");
      setCapitalCity("");
      queryClient.invalidateQueries({ queryKey: ["admin", "states"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
    },
    onError: () => toast.error("Failed to add state territory."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 rounded-lg border-zinc-200 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 shadow-xs cursor-pointer">
          <Landmark className="size-3.5 mr-1 text-zinc-700" />
          <span>Add State</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950">Add State Territory</DialogTitle>
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
            className="rounded-lg bg-white hover:bg-zinc-100 border border-zinc-900 text-zinc-950 text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
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
      queryClient.invalidateQueries({ queryKey: ["admin", "states"] });
    },
    onError: () => toast.error("Failed to add city."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-9 rounded-lg border-zinc-200 bg-white text-xs font-semibold text-zinc-900 hover:bg-zinc-50 shadow-xs cursor-pointer">
          <Building2 className="size-3.5 mr-1 text-zinc-700" />
          <span>Add City Hub</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950">Add Operating City</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Register a new city under a state territory in the QuickPress network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">City Name</Label>
            <Input
              placeholder="e.g. Noida, Delhi, Lucknow, Mathura"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 text-xs font-semibold bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">State Territory</Label>
              <Input
                placeholder="Uttar Pradesh"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-9 text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">City Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white text-zinc-950">
                  <SelectItem value="Tier-1">Tier-1 Metro</SelectItem>
                  <SelectItem value="Tier-2">Tier-2 Hub</SelectItem>
                  <SelectItem value="Tier-3">Tier-3 City</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Operational Pincodes (comma separated)</Label>
            <Input
              placeholder="e.g. 201301, 201302, 201303"
              value={pincodesInput}
              onChange={(e) => setPincodesInput(e.target.value)}
              className="h-9 text-xs bg-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Base Delivery Fee (₹)</Label>
            <Input
              type="number"
              placeholder="25"
              value={baseFee}
              onChange={(e) => setBaseFee(e.target.value)}
              className="h-9 text-xs bg-white font-mono"
            />
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
            className="rounded-lg bg-white hover:bg-zinc-100 border border-zinc-900 text-zinc-950 text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
          >
            {createMutation.isPending ? "Adding..." : "Launch City Hub"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   DIALOG 3: ADD PINCODE TO CITY
========================================================================= */
function AddPincodeDialog({
  cityId,
  cityName,
  onClose,
}: {
  cityId: string;
  cityName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [pincode, setPincode] = useState("");
  const [areaName, setAreaName] = useState("");
  const [baseFee, setBaseFee] = useState("25");

  const addMutation = useMutation({
    mutationFn: () =>
      addCityPincode(cityId, {
        pincode: pincode.trim(),
        areaName: areaName.trim() || `${cityName} Sector & Central Area`,
        baseFee: parseFloat(baseFee) || 25,
        status: "Active",
      }),
    onSuccess: () => {
      toast.success(`Pincode ${pincode} added to ${cityName}.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "cities", "pincodes"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "cities", "intelligence"] });
      onClose();
    },
    onError: () => toast.error("Failed to add pincode."),
  });

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950">Add Serviceable Pincode to {cityName}</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Register a 6-digit postal code for delivery coverage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">6-Digit Postal Code</Label>
            <Input
              placeholder="e.g. 201301"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="h-9 text-xs font-mono font-bold bg-white"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Sectors / Area Clusters</Label>
            <Input
              placeholder="e.g. Sector 18, Atta Market & Central Hub"
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
              className="h-9 text-xs font-mono bg-white"
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
            disabled={!pincode.trim() || addMutation.isPending}
            className="rounded-lg bg-white hover:bg-zinc-100 border border-zinc-900 text-zinc-950 text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
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
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950">Add Sector to Pincode {pincode}</DialogTitle>
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
            onClick={() => updateMutation.mutate()}
            disabled={!newSector.trim() || updateMutation.isPending}
            className="rounded-lg bg-white hover:bg-zinc-100 border border-zinc-900 text-zinc-950 text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
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
  const [areaName, setAreaName] = useState(detail.areaName);
  const [baseFee, setBaseFee] = useState(String(detail.baseFee || 20.0));
  const [surgeMultiplier, setSurgeMultiplier] = useState(String(detail.surgeMultiplier || 1.0));
  const [status, setStatus] = useState(detail.status || "Active");

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCityPincode(cityId, pincode, {
        areaName,
        baseFee: parseFloat(baseFee) || 20.0,
        surgeMultiplier: parseFloat(surgeMultiplier) || 1.0,
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
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950">Edit Pincode {pincode} Parameters</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Update base delivery fees, surge multiplier, and serviceability status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Covered Area / Sector Names</Label>
            <Input value={areaName} onChange={(e) => setAreaName(e.target.value)} className="h-9 text-xs bg-white" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">Base Delivery Fee (₹)</Label>
              <Input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(e.target.value)}
                className="h-9 text-xs font-mono bg-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-zinc-800">Surge Multiplier</Label>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                max="3.0"
                value={surgeMultiplier}
                onChange={(e) => setSurgeMultiplier(e.target.value)}
                className="h-9 text-xs font-mono bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-zinc-800">Service Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white text-zinc-950">
                <SelectItem value="Active">Active (Serving Orders)</SelectItem>
                <SelectItem value="Paused">Paused (Temporary Inactive)</SelectItem>
                <SelectItem value="High Demand">High Demand / Surge Active</SelectItem>
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
            className="rounded-lg bg-white hover:bg-zinc-100 border border-zinc-900 text-zinc-950 text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
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
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950">
            Map Pincodes for {partner.name || partner.storeName}
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
                      ? "border-2 border-zinc-950 bg-white text-zinc-950 font-bold shadow-xs ring-1 ring-zinc-950"
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
            className="rounded-lg bg-white hover:bg-zinc-100 border border-zinc-900 text-zinc-950 text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
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
    mutationFn: () => assignRiderPincodes(rider.id, selectedPins),
    onSuccess: () => {
      toast.success(`Stationing pincodes updated for Captain ${rider.name}.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "cities"] });
      onClose();
    },
    onError: () => toast.error("Failed to assign rider pincodes."),
  });

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-950 border-zinc-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-950">
            Station Captain {rider.name} ({rider.phone})
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Select the operating sectors where this captain will receive pickup dispatch calls in {cityName}.
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
                      ? "border-2 border-zinc-950 bg-white text-zinc-950 font-bold shadow-xs ring-1 ring-zinc-950"
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
            className="rounded-lg bg-white hover:bg-zinc-100 border border-zinc-900 text-zinc-950 text-xs font-bold px-4 py-2 cursor-pointer shadow-xs"
          >
            {assignMutation.isPending ? "Saving..." : "Save Stationing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
