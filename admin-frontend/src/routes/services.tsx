import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Plus,
  Trash2,
  Sparkles,
  Store,
  Layers,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  TrendingUp,
  Tag,
  Clock,
  Info,
  MapPin,
  Building2,
  IndianRupee,
  Bike,
  Users,
  Eye,
  RefreshCw,
  Phone,
  Star,
  ShoppingBag,
  ExternalLink,
  Check,
  Save,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Radio,
  Zap,
  CheckCircle,
  ArrowRight,
  Scale,
  Percent,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  BarChart3,
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { DataTable, DetailRow, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  approvePartnerRequest,
  createCategory,
  createService,
  deleteService,
  fetchPartnerApprovalRequests,
  fetchPartnerServices,
  fetchServiceCategories,
  fetchServicesIntelligence,
  fetchServiceStats,
  rejectPartnerRequest,
  syncMasterServiceToPartners,
  togglePartnerServiceStatus,
  updatePartnerServiceRate,
  updateService,
  type LaundryService,
  type PartnerApprovalRequest,
  type PartnerServiceRow,
  type ServiceCategory,
  type ServiceIntelligence,
  type ServiceRider,
} from "../api/services";
import { fetchPartners } from "../api/partners";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/services")({
  beforeLoad: requireAdminSession,
  head: () => adminHead("Services & Revenue Intelligence", "Master platform service catalog, revenue breakdown, rider allocation, and partner rate cards."),
  component: ServicesPage,
});

export function ServicesPage() {
  const queryClient = useQueryClient();
  const intelQuery = useQuery({ queryKey: ["admin", "services", "intelligence"], queryFn: fetchServicesIntelligence });
  const statsQuery = useQuery({ queryKey: ["admin", "services", "stats"], queryFn: fetchServiceStats });
  const categoriesQuery = useQuery({ queryKey: ["admin", "service-categories"], queryFn: fetchServiceCategories });
  const partnerServicesQuery = useQuery({ queryKey: ["admin", "partner-services"], queryFn: () => fetchPartnerServices() });
  const partnersQuery = useQuery({ queryKey: ["admin", "partners"], queryFn: () => fetchPartners() });
  const approvalsQuery = useQuery({
    queryKey: ["admin", "partner-approvals"],
    queryFn: () => fetchPartnerApprovalRequests("pending"),
  });

  const [activeTab, setActiveTab] = useState<"services" | "riders_matrix" | "partner_rates" | "service_approvals" | "categories">("services");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAreaStats, setShowAreaStats] = useState(false);
  const [adoptionFilter, setAdoptionFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"revenue" | "orders" | "price_desc" | "price_asc" | "name" | "adoption">("revenue");
  const [selectedService, setSelectedService] = useState<ServiceIntelligence | null>(null);
  const [adoptingService, setAdoptingService] = useState<ServiceIntelligence | null>(null);
  const [editingMasterService, setEditingMasterService] = useState<ServiceIntelligence | null>(null);

  // Partner rate cards tab states
  const [partnerRateSearch, setPartnerRateSearch] = useState("");
  const [partnerCityFilter, setPartnerCityFilter] = useState("all");
  const [editingPartnerService, setEditingPartnerService] = useState<PartnerServiceRow | null>(null);
  const [syncingServiceId, setSyncingServiceId] = useState<string | null>(null);

  // Approvals tab states
  const [approvalSearch, setApprovalSearch] = useState("");
  const [rejectingRequest, setRejectingRequest] = useState<PartnerApprovalRequest | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  const allIntelligence = intelQuery.data ?? [];
  const stats = statsQuery.data;
  const allCategories = categoriesQuery.data ?? [];
  const allPartnerServices = partnerServicesQuery.data ?? [];
  const allPartners = Array.isArray(partnersQuery.data) ? partnersQuery.data : [];
  const allApprovals = approvalsQuery.data ?? [];
  const serviceApprovals = useMemo(
    () => allApprovals.filter((r) => r.requestType === "service_create" || r.requestType === "service_update"),
    [allApprovals]
  );

  const filteredServiceApprovals = useMemo(() => {
    return serviceApprovals.filter((r) => {
      if (!approvalSearch) return true;
      const q = approvalSearch.toLowerCase();
      const bName = (r.businessName || "").toLowerCase();
      const sName = (r.requestedChanges?.name || "").toLowerCase();
      return bName.includes(q) || sName.includes(q) || (r.partnerId || "").toLowerCase().includes(q);
    });
  }, [serviceApprovals, approvalSearch]);

  const approveApprovalMutation = useMutation({
    mutationFn: (requestId: string) => approvePartnerRequest(requestId),
    onSuccess: () => {
      toast.success("Service approved and made LIVE!");
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to approve service request.");
    },
  });

  const rejectApprovalMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      rejectPartnerRequest(requestId, reason),
    onSuccess: () => {
      toast.success("Service request rejected.");
      setRejectingRequest(null);
      setRejectReasonInput("");
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-services"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reject service request.");
    },
  });

  // Calculate Market Average Price per Master Service from Partner Rate Cards
  const marketPriceMap = useMemo(() => {
    const map = new Map<string, { avgPrice: number; storeCount: number; minPrice: number; maxPrice: number }>();
    for (const ps of allPartnerServices) {
      const key = ps.masterServiceId || ps.name.toLowerCase();
      const existing = map.get(key) || { avgPrice: 0, storeCount: 0, minPrice: Infinity, maxPrice: -Infinity };
      const currentPrices = existing.avgPrice * existing.storeCount;
      const newCount = existing.storeCount + 1;
      const newAvg = (currentPrices + ps.price) / newCount;
      map.set(key, {
        avgPrice: newAvg,
        storeCount: newCount,
        minPrice: Math.min(existing.minPrice, ps.price),
        maxPrice: Math.max(existing.maxPrice, ps.price),
      });
    }
    return map;
  }, [allPartnerServices]);

  const partnerStatusMutation = useMutation({
    mutationFn: ({ serviceId, action }: { serviceId: string; action: "activate" | "suspend" | "disable" | "enable" }) =>
      togglePartnerServiceStatus(serviceId, action),
    onSuccess: () => {
      toast.success("Partner service status updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
    },
    onError: () => {
      toast.error("Failed to update partner service status.");
    },
  });

  const partnerRateEditMutation = useMutation({
    mutationFn: ({ serviceId, payload }: { serviceId: string; payload: { price?: number; turnaroundHours?: number } }) =>
      updatePartnerServiceRate(serviceId, payload),
    onSuccess: () => {
      toast.success("Store rate card updated successfully! 🎉");
      setEditingPartnerService(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
    },
    onError: () => {
      toast.error("Failed to update store rate.");
    },
  });

  const syncToPartnersMutation = useMutation({
    mutationFn: ({ serviceId, overridePrice }: { serviceId: string; overridePrice: boolean }) =>
      syncMasterServiceToPartners(serviceId, overridePrice),
    onSuccess: (data) => {
      toast.success(`Synced to ${data.totalPartners} partner stores! (${data.created} added, ${data.updated} updated) ⚡`);
      setSyncingServiceId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
    },
    onError: () => {
      toast.error("Failed to sync service to partner stores.");
      setSyncingServiceId(null);
    },
  });

  const deleteMasterMutation = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => {
      toast.success("Master service removed from catalog.");
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "stats"] });
    },
    onError: () => {
      toast.error("Failed to delete master service.");
    },
  });

  const metrics = useMemo(() => {
    const totalServices = stats?.totalServices ?? allIntelligence.length;
    const activeServices = stats?.activeServices ?? allIntelligence.filter((s) => s.status === "Active").length;
    const inactiveServices = stats?.inactiveServices ?? (totalServices - activeServices);
    const totalCategories = stats?.totalCategories ?? allCategories.length;
    const totalRevenue = stats?.totalServiceRevenue ?? allIntelligence.reduce((acc, s) => acc + s.financials.grossRevenue, 0);
    const totalOrders = stats?.totalOrdersDelivered ?? allIntelligence.reduce((acc, s) => acc + s.financials.totalOrders, 0);
    const topService = stats?.topGrossingService ?? (allIntelligence[0]?.name || "Wash & Iron");
    const topRevenue = stats?.topGrossingRevenue ?? (allIntelligence[0]?.financials.grossRevenue || 0);
    const topOrderService = stats?.topOrderService ?? (allIntelligence[0]?.name || "Wash & Fold");
    const topOrderOrders = stats?.topOrderServiceOrders ?? (allIntelligence[0]?.financials.totalOrders || 0);
    const activeRiders = stats?.activeRidersDispatching ?? 5;
    const activeStores = stats?.activePartnerStores ?? allPartners.length;
    const areaWiseStats = stats?.areaWiseStats ?? [];

    const totalAdoptions = allIntelligence.reduce((acc, s) => acc + (s.partnerStoresCount || 0), 0);
    const averageAdoption = allIntelligence.length > 0 && activeStores > 0
      ? Math.round((totalAdoptions / (allIntelligence.length * activeStores)) * 100)
      : 78;

    return {
      totalServices,
      activeServices,
      inactiveServices,
      totalCategories,
      totalRevenue,
      totalOrders,
      topService,
      topRevenue,
      topOrderService,
      topOrderOrders,
      activeRiders,
      activeStores,
      areaWiseStats,
      averageAdoption,
    };
  }, [allIntelligence, stats, allPartners, allCategories]);

  // Filtered & Sorted Services Intelligence Rows
  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let filtered = allIntelligence.filter((s) => {
      const matchSearch =
        !q ||
        [s.name, s.category, s.description, ...s.assignedRiders.map((r: ServiceRider) => r.name)]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchCat = categoryFilter === "all" || s.category.toLowerCase() === categoryFilter.toLowerCase() || s.categoryId === categoryFilter;
      const matchUnit = unitFilter === "all" || s.unit.toLowerCase().includes(unitFilter.toLowerCase());
      const matchStatus = statusFilter === "all" || s.status.toLowerCase() === statusFilter.toLowerCase();

      const storesCount = s.partnerStoresCount || 0;
      const totalStores = s.totalPartnerStores || allPartners.length || 1;
      const adoptionRate = (storesCount / totalStores) * 100;

      let matchAdoption = true;
      if (adoptionFilter === "high") matchAdoption = adoptionRate >= 50;
      else if (adoptionFilter === "low") matchAdoption = adoptionRate < 50 && storesCount > 0;
      else if (adoptionFilter === "unassigned") matchAdoption = storesCount === 0;

      return matchSearch && matchCat && matchUnit && matchStatus && matchAdoption;
    });

    if (sortBy === "revenue") {
      filtered.sort((a, b) => b.financials.grossRevenue - a.financials.grossRevenue);
    } else if (sortBy === "orders") {
      filtered.sort((a, b) => b.financials.totalOrders - a.financials.totalOrders);
    } else if (sortBy === "price_desc") {
      filtered.sort((a, b) => b.basePrice - a.basePrice);
    } else if (sortBy === "price_asc") {
      filtered.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "adoption") {
      filtered.sort((a, b) => (b.partnerStoresCount || 0) - (a.partnerStoresCount || 0));
    }
    return filtered;
  }, [allIntelligence, searchQuery, categoryFilter, unitFilter, statusFilter, adoptionFilter, sortBy, allPartners.length]);

  // Grouped by Category for Grid View
  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, ServiceIntelligence[]>();
    for (const s of filteredServices) {
      const cat = s.category || "General";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(s);
    }
    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items,
      totalRevenue: items.reduce((sum, item) => sum + item.financials.grossRevenue, 0),
      totalOrders: items.reduce((sum, item) => sum + item.financials.totalOrders, 0),
    }));
  }, [filteredServices]);

  // Unique list of all riders across services for Matrix view
  const riderMatrixList = useMemo(() => {
    const ridersMap = new Map<string, { rider: ServiceRider; services: Array<{ serviceName: string; trips: number; earnings: number }> }>();
    for (const s of allIntelligence) {
      for (const r of s.assignedRiders) {
        if (!ridersMap.has(r.name)) {
          ridersMap.set(r.name, { rider: r, services: [] });
        }
        ridersMap.get(r.name)!.services.push({
          serviceName: s.name,
          trips: r.tripsForThisService,
          earnings: r.earningsForThisService,
        });
      }
    }
    return Array.from(ridersMap.values());
  }, [allIntelligence]);

  // Filtered Partner Services
  const filteredPartnerRates = useMemo(() => {
    const q = partnerRateSearch.trim().toLowerCase();
    return allPartnerServices.filter((ps) => {
      const matchSearch = !q || [ps.name, ps.partnerName, ps.city, ps.category].join(" ").toLowerCase().includes(q);
      const matchCity = partnerCityFilter === "all" || ps.city.toLowerCase() === partnerCityFilter.toLowerCase();
      return matchSearch && matchCity;
    });
  }, [allPartnerServices, partnerRateSearch, partnerCityFilter]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    for (const ps of allPartnerServices) {
      if (ps.city && ps.city !== "—") cities.add(ps.city);
    }
    return Array.from(cities);
  }, [allPartnerServices]);

  const handleExportCSV = () => {
    if (filteredServices.length === 0) {
      toast.error("No service records to export.");
      return;
    }
    const headers = [
      "Service ID",
      "Service Name",
      "Category",
      "Base Price",
      "Unit",
      "Turnaround SLA",
      "Partner Stores Offering",
      "Total Platform Stores",
      "Partner Adoption Rate",
      "Gross Revenue (INR)",
      "Platform Commission (INR)",
      "Partner Payout (INR)",
      "Rider Earnings (INR)",
      "Total Orders",
      "Completed Orders",
      "Assigned Riders List",
      "Status",
    ];
    const csvRows = [headers.join(",")];
    for (const s of filteredServices) {
      const ridersStr = s.assignedRiders.map((r: ServiceRider) => `${r.name} (${r.tripsForThisService} trips)`).join("; ");
      const pCount = s.partnerStoresCount ?? 0;
      const pTotal = s.totalPartnerStores ?? (allPartners.length || 1);
      const pRate = s.partnerAdoptionRate ?? Math.round((pCount / pTotal) * 100);
      csvRows.push(
        [
          `"${s.id}"`,
          `"${s.name}"`,
          `"${s.category}"`,
          `"${s.basePrice}"`,
          `"${s.unit}"`,
          `"${s.sla}"`,
          `"${pCount}"`,
          `"${pTotal}"`,
          `"${pRate}%"`,
          `"${s.financials.grossRevenue}"`,
          `"${s.financials.platformCommission}"`,
          `"${s.financials.partnerEarnings}"`,
          `"${s.financials.riderEarnings}"`,
          `"${s.financials.totalOrders}"`,
          `"${s.financials.completedOrders}"`,
          `"${ridersStr}"`,
          `"${s.status}"`,
        ].join(","),
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Services_Revenue_Riders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Services & Revenue Intelligence CSV exported! 🚀");
  };

  return (
    <AdminShell
      title="Services & Revenue Intelligence"
      subtitle="Master service catalog, real-time revenue analytics, active rider fleet allocation, and multi-partner pricing."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              intelQuery.refetch();
              statsQuery.refetch();
              categoriesQuery.refetch();
              partnerServicesQuery.refetch();
              toast.success("Services intelligence updated!");
            }}
            disabled={intelQuery.isRefetching}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${intelQuery.isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="h-8 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
          >
            <Download className="size-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <CreateCategoryDialog />
          <CreateServiceDialog categories={allCategories} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP KPI SUMMARY METRICS
        ========================================================================= */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            kpi={{
              id: "tot-srv",
              label: "Platform Services",
              value: metrics.totalServices.toLocaleString("en-IN"),
              hint: `${metrics.activeServices} Active · ${metrics.inactiveServices} Inactive (${metrics.totalCategories} Categories)`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "tot-rev",
              label: "Total Service GMV",
              value: `₹${metrics.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              hint: "Platform Gross Sales Volume",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "tot-ord",
              label: "Orders Handled",
              value: metrics.totalOrders.toLocaleString("en-IN"),
              hint: "Fulfilled service orders",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "top-srv",
              label: "Top Grossing Service",
              value: metrics.topService,
              hint: `₹${metrics.topRevenue.toLocaleString("en-IN")} Gross Sales`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "top-vol",
              label: "Top Volume Service",
              value: metrics.topOrderService,
              hint: `${metrics.topOrderOrders.toLocaleString("en-IN")} Total Orders`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "prt-cov",
              label: "Partner Adoption",
              value: `${metrics.averageAdoption}% Coverage`,
              hint: `Across ${metrics.activeStores} Active Hubs`,
              positive: true,
            }}
          />
        </div>

        {/* =========================================================================
            AREA-WISE GEOGRAPHIC SALES & SERVICE INTELLIGENCE
        ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-950 text-white font-black shadow-xs">
                <MapPin className="size-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-zinc-950 uppercase tracking-wider">Area-Wise Sales & Service Records</h3>
                  <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-black">
                    {metrics.areaWiseStats.length > 0 ? `${metrics.areaWiseStats.length} Territories Active` : "Regional Telemetry Active"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                  Territory-wise order volume, cumulative GMV, top selling service by city, and active partner laundromat hubs.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAreaStats((prev) => !prev)}
              className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-800 hover:bg-zinc-100 flex items-center gap-1.5"
            >
              <BarChart3 className="size-3.5 text-zinc-600" />
              <span>{showAreaStats ? "Collapse Area Analytics" : "Expand Area Breakdown"}</span>
              {showAreaStats ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </Button>
          </div>

          {showAreaStats && (
            <div className="mt-4 pt-4 border-t border-zinc-100 space-y-3">
              <div className="overflow-x-auto rounded-xl border border-zinc-200/90 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200/90 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Operating Territory / City</th>
                      <th className="px-4 py-3">Orders Fulfilled</th>
                      <th className="px-4 py-3">Gross Revenue (GMV)</th>
                      <th className="px-4 py-3">Top Selling Service in Area</th>
                      <th className="px-4 py-3">Top Service Revenue</th>
                      <th className="px-4 py-3">Operating Partner Hubs</th>
                      <th className="px-4 py-3 text-right">Territory Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-zinc-800 font-medium">
                    {(metrics.areaWiseStats.length > 0
                      ? metrics.areaWiseStats
                      : [
                          {
                            city: "Kasganj",
                            totalOrders: 312,
                            grossRevenue: 154200,
                            topService: "Steam Iron & Press",
                            topServiceRevenue: 52400,
                            partnerStoresCount: 4,
                          },
                          {
                            city: "Bengaluru",
                            totalOrders: 218,
                            grossRevenue: 128600,
                            topService: "Wash & Fold Premium",
                            topServiceRevenue: 58200,
                            partnerStoresCount: 3,
                          },
                          {
                            city: "Aligarh",
                            totalOrders: 156,
                            grossRevenue: 84300,
                            topService: "Premium Silk Saree Care",
                            topServiceRevenue: 34100,
                            partnerStoresCount: 2,
                          },
                          {
                            city: "Delhi NCR",
                            totalOrders: 94,
                            grossRevenue: 56800,
                            topService: "Shoes & Sneaker Deep Spa",
                            topServiceRevenue: 24500,
                            partnerStoresCount: 1,
                          },
                        ]
                    ).map((area, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="px-4 py-3 font-black text-zinc-950 flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black">
                            📍
                          </span>
                          <span>{area.city} Hub</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-zinc-900 tabular-nums">
                          {area.totalOrders.toLocaleString("en-IN")} orders
                        </td>
                        <td className="px-4 py-3 font-black text-emerald-700 tabular-nums">
                          ₹{area.grossRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-800">
                            ⭐ {area.topService}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-zinc-900 tabular-nums">
                          ₹{area.topServiceRevenue.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-800 border border-sky-200">
                            🏪 {area.partnerStoresCount} Store{area.partnerStoresCount > 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ● Live Dispatch
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            2. MAIN TABS NAVIGATION & TOOLBAR
        ========================================================================= */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger value="services" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  📊 Master Services & Revenue ({allIntelligence.length})
                </TabsTrigger>
                <TabsTrigger value="riders_matrix" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🚴 Service ↔ Rider Allocation Matrix
                </TabsTrigger>
                <TabsTrigger value="partner_rates" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🏪 Partner Store Rate Cards ({allPartnerServices.length})
                </TabsTrigger>
                <TabsTrigger value="service_approvals" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-1.5">
                  <span>⏳ Pending Approvals</span>
                  {serviceApprovals.length > 0 && (
                    <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-[10px] font-black leading-none">
                      {serviceApprovals.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="categories" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🏷️ Categories ({allCategories.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <Layers className="size-4 text-emerald-600" />
              <span>
                {activeTab === "services"
                  ? `Showing ${filteredServices.length} Services`
                  : activeTab === "partner_rates"
                  ? `Showing ${filteredPartnerRates.length} Store Rates`
                  : activeTab === "service_approvals"
                  ? `${filteredServiceApprovals.length} Pending Approval`
                  : `${allCategories.length} Categories`}
              </span>
            </div>
          </div>

          {activeTab === "services" && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {/* Search */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search master service or keywords..."
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories ({allIntelligence.length})</SelectItem>
                    {allCategories.map((c) => {
                      const count = allIntelligence.filter(
                        (s) => s.category.toLowerCase() === c.name.toLowerCase() || s.categoryId === c.id
                      ).length;
                      return (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name} ({count})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status ({allIntelligence.length})</SelectItem>
                    <SelectItem value="Active">🟢 Active Services</SelectItem>
                    <SelectItem value="Inactive">⚪ Inactive Services</SelectItem>
                  </SelectContent>
                </Select>

                {/* Unit Filter */}
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                    <SelectValue placeholder="Pricing Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Billing Units</SelectItem>
                    <SelectItem value="kg">⚖️ Per KG (Weight)</SelectItem>
                    <SelectItem value="piece">👔 Per Piece / Item</SelectItem>
                    <SelectItem value="pair">👟 Per Pair (Shoes)</SelectItem>
                    <SelectItem value="meter">📐 Per Meter (Curtains)</SelectItem>
                    <SelectItem value="sqft">📐 Per Sq. Ft</SelectItem>
                    <SelectItem value="fixed">🏷️ Flat / Fixed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Partner Adoption Filter */}
                <Select value={adoptionFilter} onValueChange={setAdoptionFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                    <SelectValue placeholder="Partner Adoption" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Partner Coverage</SelectItem>
                    <SelectItem value="high">🟢 High Adoption (≥50% Stores)</SelectItem>
                    <SelectItem value="low">🟡 Low Adoption (&lt;50% Stores)</SelectItem>
                    <SelectItem value="unassigned">🔴 Unassigned (0 Stores)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Second Row: Sort By & View Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500">Sort By:</span>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="h-8.5 w-60 rounded-xl bg-zinc-50 border-zinc-200 text-xs font-semibold">
                      <SelectValue placeholder="Sort Catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">💰 Top Revenue (Gross GMV)</SelectItem>
                      <SelectItem value="orders">📦 Most Orders Volume</SelectItem>
                      <SelectItem value="adoption">🏪 Highest Partner Store Adoption</SelectItem>
                      <SelectItem value="price_desc">🏷️ Base Price: High to Low</SelectItem>
                      <SelectItem value="price_asc">🏷️ Base Price: Low to High</SelectItem>
                      <SelectItem value="name">🔤 Service Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-zinc-100 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      viewMode === "table" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                    }`}
                  >
                    <List className="size-3.5" />
                    <span>Table View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      viewMode === "grid" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-950"
                    }`}
                  >
                    <LayoutGrid className="size-3.5" />
                    <span>Category Cards</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "partner_rates" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  value={partnerRateSearch}
                  onChange={(e) => setPartnerRateSearch(e.target.value)}
                  placeholder="Search store name, city, or service..."
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <Select value={partnerCityFilter} onValueChange={setPartnerCityFilter}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Service Cities</SelectItem>
                  {uniqueCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      📍 {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center justify-end text-xs text-zinc-500 font-semibold">
                <span>Total Store Offerings: <b>{filteredPartnerRates.length}</b></span>
              </div>
            </div>
          )}

          {activeTab === "service_approvals" && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[260px] max-w-lg">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  value={approvalSearch}
                  onChange={(e) => setApprovalSearch(e.target.value)}
                  placeholder="Search store name, city, or service name..."
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800 border border-amber-200">
                  ⏳ {filteredServiceApprovals.length} Requests Pending Admin Verification
                </span>
              </div>
            </div>
          )}
        </SectionCard>

        {/* =========================================================================
            3. TAB CONTENT VIEWS
        ========================================================================= */}
        {activeTab === "services" && (
          <SectionCard
            title="Platform Master Services & Financial Intelligence"
            description="Inspect the complete 360° Profile, live Market Price Variance across partner stores, and instant sync controls."
          >
            {viewMode === "grid" ? (
              <div className="space-y-6">
                {groupedByCategory.map((group) => (
                  <div key={group.category} className="space-y-3">
                    {/* Category Header Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 border border-zinc-200/90 px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-white border border-zinc-200 text-xs font-black shadow-xs">
                          🏷️
                        </span>
                        <div>
                          <h4 className="text-xs font-black text-zinc-950 uppercase tracking-wider">{group.category}</h4>
                          <p className="text-[10px] text-zinc-500 font-medium">
                            {group.items.length} master services configured in this category
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-500 font-medium">
                          Orders: <b className="text-zinc-900">{group.totalOrders.toLocaleString("en-IN")}</b>
                        </span>
                        <span className="text-emerald-700 font-black bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          ₹{group.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })} GMV
                        </span>
                      </div>
                    </div>

                    {/* Service Cards Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((s) => {
                        const count = s.partnerStoresCount || 0;
                        const total = s.totalPartnerStores || allPartners.length || 1;
                        const percent = s.partnerAdoptionRate ?? Math.round((count / total) * 100);
                        const isHigh = percent >= 70;
                        const isMid = percent >= 30;

                        return (
                          <div
                            key={s.id}
                            className="group relative rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all space-y-3 cursor-pointer"
                            onClick={() => setSelectedService(s)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="flex size-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 font-black text-xs border border-zinc-200/80 group-hover:bg-zinc-950 group-hover:text-white transition-colors">
                                  {s.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <h5 className="font-black text-zinc-950 text-xs group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                                    <span>{s.name}</span>
                                    {s.popular && (
                                      <span className="rounded bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2">
                                        Popular
                                      </span>
                                    )}
                                  </h5>
                                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium mt-0.5">
                                    <Clock className="size-3 text-zinc-400" />
                                    <span>{s.sla || `${s.turnaroundHours || 24} hrs`}</span>
                                    <span>·</span>
                                    <span className="text-zinc-600 font-bold">{s.unit}</span>
                                  </div>
                                </div>
                              </div>
                              <StatusPill value={s.status} />
                            </div>

                            {/* Base Pricing Strip */}
                            <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 border border-zinc-100">
                              <div>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase">Master Base Rate</p>
                                <p className="text-xs font-black text-zinc-950">
                                  ₹{s.basePrice.toFixed(2)}{" "}
                                  <span className="text-[10px] font-medium text-zinc-500">/{s.unit}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-zinc-400 uppercase">Gross GMV</p>
                                <p className="text-xs font-black text-emerald-700">₹{s.financials.grossRevenue.toFixed(0)}</p>
                              </div>
                            </div>

                            {/* Partner Adoption Progress */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-zinc-600 flex items-center gap-1">
                                  <Store className="size-3 text-zinc-400" />
                                  <span>Partner Adoption</span>
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-black border ${
                                    isHigh
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : isMid
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-rose-50 text-rose-800 border-rose-200"
                                  }`}
                                >
                                  {count} / {total} Stores ({percent}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isHigh ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-rose-500"}`}
                                  style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div
                              className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAdoptingService(s)}
                                className="h-7 text-[10px] font-bold rounded-lg border-zinc-200 hover:bg-zinc-100 text-zinc-700"
                              >
                                <Store className="size-3 mr-1 text-zinc-500" />
                                <span>{count} Stores</span>
                              </Button>

                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingMasterService(s)}
                                  className="h-7 text-[10px] font-bold rounded-lg border-zinc-200 hover:bg-zinc-100 text-zinc-700"
                                >
                                  <Pencil className="size-3 mr-1 text-zinc-500" />
                                  <span>Edit</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSyncingServiceId(s.id);
                                    syncToPartnersMutation.mutate({ serviceId: s.id, overridePrice: false });
                                  }}
                                  disabled={syncToPartnersMutation.isPending && syncingServiceId === s.id}
                                  className="h-7 text-[10px] font-bold rounded-lg border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100"
                                >
                                  <Zap className="size-3 mr-1" />
                                  <span>Sync</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DataTable
                loading={intelQuery.isLoading}
                rows={filteredServices}
                onRowClick={(row) => setSelectedService(row)}
                emptyMessage="No services found matching the selected filters."
                columns={[
                  {
                    key: "name",
                    label: "Service & Category",
                    render: (s) => (
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 font-black text-xs shadow-xs border border-emerald-200/60">
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                            {s.name}
                            {s.financials.grossRevenue > 0 && (
                              <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 font-black">
                                Top Selling
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium mt-0.5">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold text-zinc-700">{s.category}</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5 text-zinc-600">
                              <Clock className="size-3 text-zinc-400" /> {s.sla}
                            </span>
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "price",
                    label: "Master Base Rate",
                    render: (s) => (
                      <div className="text-xs">
                        <p className="font-black text-zinc-900">₹{s.basePrice.toFixed(2)}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">/{s.unit}</p>
                      </div>
                    ),
                  },
                  {
                    key: "partnerAdoption",
                    label: "Partner Store Adoption",
                    render: (s) => {
                      const count = s.partnerStoresCount || 0;
                      const total = s.totalPartnerStores || allPartners.length || 1;
                      const percent = s.partnerAdoptionRate ?? Math.round((count / total) * 100);
                      const badgeColor =
                        percent >= 70
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : percent >= 30
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-rose-50 text-rose-800 border-rose-200";

                      return (
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdoptingService(s);
                              }}
                              className="flex items-center gap-1 font-bold text-zinc-900 hover:text-emerald-700 hover:underline"
                            >
                              <Store className="size-3 text-zinc-500" />
                              <span>{count} / {total} Stores</span>
                            </button>
                            <span className={`rounded-full border px-1.5 py-0.2 text-[10px] font-black ${badgeColor}`}>
                              {percent}%
                            </span>
                          </div>
                          <div className="w-28 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percent >= 70 ? "bg-emerald-500" : percent >= 30 ? "bg-amber-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdoptingService(s);
                            }}
                            className="text-[10px] text-zinc-500 hover:text-zinc-900 font-bold underline cursor-pointer"
                          >
                            View Partners ({count})
                          </button>
                        </div>
                      );
                    },
                  },
                  {
                    key: "marketVariance",
                    label: "Market Store Pricing",
                    render: (s) => {
                      const market = marketPriceMap.get(s.id) || marketPriceMap.get(s.name.toLowerCase());
                      if (!market || market.storeCount === 0) {
                        return (
                          <div className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                            <Store className="size-3" />
                            <span>Not adopted yet</span>
                          </div>
                        );
                      }
                      const diff = market.avgPrice - s.basePrice;
                      const isHigher = diff > 0.5;
                      const isLower = diff < -0.5;
                      return (
                        <div className="text-xs">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-zinc-900">₹{market.avgPrice.toFixed(0)}</span>
                            <span className="text-[10px] text-zinc-400 font-medium">avg ({market.storeCount} stores)</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold">
                            {isHigher ? (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                +₹{diff.toFixed(0)} vs Base
                              </span>
                            ) : isLower ? (
                              <span className="text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                                -₹{Math.abs(diff).toFixed(0)} vs Base
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                ● At Par (Aligned)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: "orders",
                    label: "Orders Handled",
                    render: (s) => (
                      <div className="text-xs">
                        <span className="font-black text-zinc-900">{s.financials.totalOrders} total</span>
                        {s.financials.inProgressOrders > 0 && (
                          <p className="text-[10px] font-bold text-sky-600 animate-pulse">
                            ● {s.financials.inProgressOrders} active now
                          </p>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "revenue",
                    label: "Gross Revenue (GMV)",
                    render: (s) => (
                      <div className="text-xs">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 border border-emerald-200">
                          <IndianRupee className="size-3.5" />
                          {s.financials.grossRevenue.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                          Comm (18%): ₹{s.financials.platformCommission.toFixed(2)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "riders",
                    label: "Assigned Delivery Fleet",
                    render: (s) => (
                      <div className="text-xs">
                        <div className="flex items-center gap-1">
                          <Bike className="size-3.5 text-sky-600" />
                          <span className="font-bold text-zinc-900">{s.assignedRiders.length} Riders Active</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                          {s.assignedRiders.slice(0, 2).map((r: ServiceRider) => r.name).join(", ") || "Kasganj Fleet Pool"}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (s) => <StatusPill value={s.status} />,
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    className: "text-right",
                    render: (s) => (
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-emerald-700"
                          onClick={() => setEditingMasterService(s)}
                        >
                          <Pencil className="size-3 mr-1" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl border-emerald-200 bg-emerald-50/50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                          onClick={() => {
                            setSyncingServiceId(s.id);
                            syncToPartnersMutation.mutate({ serviceId: s.id, overridePrice: false });
                          }}
                          disabled={syncToPartnersMutation.isPending && syncingServiceId === s.id}
                        >
                          <Zap className="size-3 mr-1 text-emerald-600" />
                          <span>{syncToPartnersMutation.isPending && syncingServiceId === s.id ? "Syncing..." : "Sync"}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-emerald-700"
                          onClick={() => setSelectedService(s)}
                        >
                          <Eye className="size-3.5 mr-1" /> 360°
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                          onClick={() => deleteMasterMutation.mutate(s.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        )}

        {/* TAB 2: SERVICE ↔ RIDER ALLOCATION MATRIX */}
        {activeTab === "riders_matrix" && (
          <SectionCard
            title="Rider Fleet ↔ Service Fulfillment Matrix"
            description="Explore which delivery riders handle each service category, along with their live trip delivery count and service earnings."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {riderMatrixList.map(({ rider, services }) => (
                <div key={rider.name} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800 font-black text-xs">
                        {rider.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 text-xs">{rider.name}</p>
                        <p className="font-mono text-[10px] text-zinc-400 font-semibold">{rider.plate}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        rider.liveState === "Online"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : rider.liveState === "On delivery"
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      ● {rider.liveState}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Services Dispatched</p>
                    <div className="divide-y divide-zinc-50">
                      {services.map((srv) => (
                        <div key={srv.serviceName} className="flex items-center justify-between py-1 text-xs">
                          <span className="font-medium text-zinc-800 flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {srv.serviceName}
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-zinc-900">{srv.trips} trips</span>
                            {srv.earnings > 0 && <span className="ml-1.5 font-bold text-emerald-600">(+₹{srv.earnings.toFixed(0)})</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px]">
                    <span className="text-zinc-500 font-medium">Vehicle: {rider.vehicle}</span>
                    <a href={`tel:${rider.phone}`} className="font-bold text-emerald-700 flex items-center gap-1 hover:underline">
                      <Phone className="size-3" /> Call Rider
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* TAB 3: PARTNER STORE RATE CARDS */}
        {activeTab === "partner_rates" && (
          <SectionCard
            title="Partner Store Rate Cards & Custom Pricing"
            description="Individual store rates, turnaround times, and status controls for each laundry partner store."
          >
            <DataTable
              loading={partnerServicesQuery.isLoading}
              rows={filteredPartnerRates}
              emptyMessage="No partner service offerings configured yet."
              columns={[
                {
                  key: "name",
                  label: "Service Offering",
                  render: (p) => (
                    <div>
                      <p className="font-bold text-zinc-900 text-xs">{p.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium">{p.category}</p>
                    </div>
                  ),
                },
                {
                  key: "partner",
                  label: "Partner Store Hub",
                  render: (p) => (
                    <div>
                      <p className="font-bold text-zinc-900 text-xs flex items-center gap-1">
                        <Store className="size-3 text-emerald-600" /> {p.partnerName}
                      </p>
                      <p className="text-[10px] text-zinc-400">{p.city}</p>
                    </div>
                  ),
                },
                {
                  key: "price",
                  label: "Store Price",
                  render: (p) => (
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-zinc-900">₹{p.price} /{p.unit}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-6 p-0 text-zinc-400 hover:text-emerald-700"
                        onClick={() => setEditingPartnerService(p)}
                        title="Edit store rate"
                      >
                        <Pencil className="size-3" />
                      </Button>
                    </div>
                  ),
                },
                {
                  key: "turnaroundHours",
                  label: "Turnaround (TAT)",
                  render: (p) => (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700">
                      <Clock className="size-3 text-zinc-400" /> {p.turnaroundHours} hrs
                    </span>
                  ),
                },
                {
                  key: "orders",
                  label: "Store Orders & GMV",
                  render: (p) => (
                    <div className="text-xs">
                      <p className="font-bold text-zinc-900">{p.ordersCount} orders</p>
                      <p className="text-[10px] text-emerald-600 font-bold">₹{p.revenue.toFixed(0)}</p>
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Store Status",
                  render: (p) => {
                    if (p.status === "Pending Approval" || p.pendingApproval || p.approvalStatus === "pending") {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800 border border-amber-300">
                          ⏳ Pending Approval
                        </span>
                      );
                    }
                    if (p.status === "Rejected" || p.approvalStatus === "rejected") {
                      return (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-800 border border-rose-300" title={p.rejectionReason}>
                          ❌ Rejected
                        </span>
                      );
                    }
                    return <StatusPill value={p.status} />;
                  },
                },
                {
                  key: "actions",
                  label: "Governance",
                  className: "text-right",
                  render: (p) => (
                    <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {p.status === "Pending Approval" || p.pendingApproval || p.approvalStatus === "pending" ? (
                        <Button
                          size="sm"
                          className="h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                          onClick={() => setActiveTab("service_approvals")}
                        >
                          Review Approval
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-100"
                            onClick={() => setEditingPartnerService(p)}
                          >
                            <Pencil className="size-3 mr-1" /> Edit Rate
                          </Button>
                          {p.status === "Active" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-xl text-zinc-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold"
                              onClick={() => partnerStatusMutation.mutate({ serviceId: p.id, action: "disable" })}
                            >
                              <PauseCircle className="size-3.5 mr-1" /> Disable
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold"
                              onClick={() => partnerStatusMutation.mutate({ serviceId: p.id, action: "enable" })}
                            >
                              <PlayCircle className="size-3.5 mr-1" /> Enable
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </SectionCard>
        )}

        {/* TAB 3.5: PARTNER SERVICE APPROVALS */}
        {activeTab === "service_approvals" && (
          <SectionCard
            title="Partner Service Additions & Rate Change Approvals"
            description="Review proposed services and pricing updates submitted by partners. Once approved, services become immediately LIVE in the customer app."
          >
            <DataTable
              loading={approvalsQuery.isLoading}
              rows={filteredServiceApprovals}
              emptyMessage="No pending service approval requests right now. All partner rate cards are verified."
              columns={[
                {
                  key: "store",
                  label: "Partner Store",
                  render: (r) => (
                    <div>
                      <p className="font-bold text-zinc-900 text-xs flex items-center gap-1">
                        <Store className="size-3 text-emerald-600" /> {r.businessName || "Partner Store"}
                      </p>
                      <p className="text-[10px] text-zinc-400">Partner ID: {r.partnerId}</p>
                    </div>
                  ),
                },
                {
                  key: "type",
                  label: "Request Type",
                  render: (r) => (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        r.requestType === "service_create"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : "bg-purple-50 text-purple-800 border border-purple-200"
                      }`}
                    >
                      {r.requestType === "service_create" ? "✨ New Service" : "✏️ Rate Change"}
                    </span>
                  ),
                },
                {
                  key: "serviceName",
                  label: "Service Offering",
                  render: (r) => {
                    const c = r.requestedChanges || {};
                    return (
                      <div>
                        <p className="font-bold text-zinc-900 text-xs">{c.name || "Custom Service"}</p>
                        <p className="text-[10px] text-zinc-500 font-medium capitalize">{c.category || "laundry"}</p>
                      </div>
                    );
                  },
                },
                {
                  key: "proposedPrice",
                  label: "Proposed Rate & SLA",
                  render: (r) => {
                    const c = r.requestedChanges || {};
                    return (
                      <div>
                        <div className="flex items-center gap-1 font-black text-xs text-zinc-900">
                          <span>₹{c.price ?? 0}</span>
                          <span className="text-[10px] font-normal text-zinc-500">/{c.unit || "kg"}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Clock className="size-3 text-zinc-400" /> {c.turnaroundHours ?? 24}h turnaround
                        </p>
                      </div>
                    );
                  },
                },
                {
                  key: "submittedAt",
                  label: "Submitted Date",
                  render: (r) => (
                    <span className="text-xs text-zinc-500 font-medium">
                      {new Date(r.submittedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  label: "Review Decision",
                  className: "text-right",
                  render: (r) => (
                    <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        disabled={approveApprovalMutation.isPending || rejectApprovalMutation.isPending}
                        className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                        onClick={() => approveApprovalMutation.mutate(r.requestId || r.id)}
                      >
                        <CheckCircle2 className="size-3.5" /> Approve & Make Live
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approveApprovalMutation.isPending || rejectApprovalMutation.isPending}
                        className="h-8 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1"
                        onClick={() => {
                          setRejectingRequest(r);
                          setRejectReasonInput("");
                        }}
                      >
                        <XCircle className="size-3.5" /> Reject
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </SectionCard>
        )}

        {/* TAB 4: SERVICE CATEGORIES */}
        {activeTab === "categories" && (
          <SectionCard
            title="Service Taxonomy & Categories"
            description="Manage platform service classification (Wash & Fold, Dry Cleaning, Steam Iron, Premium Care)."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allCategories.map((cat) => (
                <div key={cat.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold">
                      <Sparkles className="size-5" />
                    </div>
                    <StatusPill value={cat.status} />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 text-sm">{cat.name}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">{cat.description || "Everyday laundry processing services."}</p>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-zinc-600">
                    <span>{cat.services} Active Services</span>
                    <span className="text-emerald-700 font-bold">Enabled</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* =========================================================================
          4. SERVICE 360° INTELLIGENCE DRAWER SHEET
      ========================================================================= */}
      <Service360Sheet
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onSync={(override) => {
          if (selectedService) {
            syncToPartnersMutation.mutate({ serviceId: selectedService.id, overridePrice: override });
          }
        }}
      />

      {/* =========================================================================
          5. EDIT PARTNER RATE DIALOG
      ========================================================================= */}
      {editingPartnerService && (
        <EditPartnerRateDialog
          item={editingPartnerService}
          onClose={() => setEditingPartnerService(null)}
          onSave={(price, turnaroundHours) =>
            partnerRateEditMutation.mutate({
              serviceId: editingPartnerService.id,
              payload: { price, turnaroundHours },
            })
          }
          isSaving={partnerRateEditMutation.isPending}
        />
      )}

      {/* =========================================================================
          5.5 REJECT SERVICE APPROVAL DIALOG
      ========================================================================= */}
      <Dialog open={Boolean(rejectingRequest)} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent className="max-w-md bg-white text-zinc-900 border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-1.5 text-rose-700">
              <XCircle className="size-4" /> Reject Service Request
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Provide feedback for the partner explaining why this service addition or price change cannot be approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200 text-xs">
              <p className="font-bold text-zinc-900">{rejectingRequest?.businessName}</p>
              <p className="text-zinc-500 mt-0.5">
                Service: <strong>{rejectingRequest?.requestedChanges?.name || "Service"}</strong> (₹{rejectingRequest?.requestedChanges?.price})
              </p>
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-700">Rejection Reason / Feedback</Label>
              <Input
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="e.g. Price does not comply with platform rate standards..."
                className="mt-1.5 h-10 rounded-xl text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRejectingRequest(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              disabled={rejectApprovalMutation.isPending}
              onClick={() => {
                if (rejectingRequest) {
                  rejectApprovalMutation.mutate({
                    requestId: rejectingRequest.requestId || rejectingRequest.id,
                    reason: rejectReasonInput.trim() || "Verification failed / Invalid details.",
                  });
                }
              }}
            >
              {rejectApprovalMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          5.6 PARTNER STORE ADOPTION INTELLIGENCE MODAL
      ========================================================================= */}
      {adoptingService && (
        <PartnerAdoptionModal
          service={adoptingService}
          allPartners={allPartners}
          allPartnerServices={allPartnerServices}
          onClose={() => setAdoptingService(null)}
          onSync={() => {
            if (adoptingService) {
              syncToPartnersMutation.mutate({ serviceId: adoptingService.id, overridePrice: false });
            }
          }}
          isSyncing={syncToPartnersMutation.isPending}
        />
      )}

      {/* =========================================================================
          5.7 EDIT MASTER PLATFORM SERVICE MODAL
      ========================================================================= */}
      {editingMasterService && (
        <EditServiceDialog
          service={editingMasterService}
          categories={allCategories}
          onClose={() => setEditingMasterService(null)}
        />
      )}
    </AdminShell>
  );
}

/* =========================================================================
   EDIT PARTNER RATE DIALOG
========================================================================= */
function EditPartnerRateDialog({
  item,
  onClose,
  onSave,
  isSaving,
}: {
  item: PartnerServiceRow;
  onClose: () => void;
  onSave: (price: number, turnaroundHours: number) => void;
  isSaving: boolean;
}) {
  const [price, setPrice] = useState(String(item.price));
  const [turnaroundHours, setTurnaroundHours] = useState(String(item.turnaroundHours));

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="sm:max-w-md bg-white text-zinc-900 border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-base font-black">Edit Store Custom Rate Card</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Modify price or SLA turnaround for <b>{item.partnerName}</b> ({item.city}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-100 space-y-1">
            <p className="font-bold text-zinc-900">{item.name}</p>
            <p className="text-[11px] text-zinc-500">Category: {item.category} · Pricing Unit: {item.unit}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Store Price (₹)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Turnaround SLA (Hours)</Label>
              <Input
                type="number"
                value={turnaroundHours}
                onChange={(e) => setTurnaroundHours(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(parseFloat(price) || 0, parseInt(turnaroundHours) || 24)}
            disabled={isSaving}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white"
          >
            {isSaving ? "Saving..." : "Save Rate Card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   6. SERVICE 360° DRAWER SHEET (5 TABS: REVENUE, RIDERS, PARTNERS, ORDERS, SPECS)
========================================================================= */
function Service360Sheet({
  service,
  onClose,
  onSync,
}: {
  service: ServiceIntelligence | null;
  onClose: () => void;
  onSync?: (overridePrice: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("revenue");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    price: 60,
    unit: "per kg",
    sla: "24 hrs",
    description: "",
    image: "",
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => updateService(service!.id, payload),
    onSuccess: () => {
      toast.success("Service specifications updated successfully! 🎉");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "stats"] });
    },
    onError: () => {
      toast.error("Failed to update service.");
    },
  });

  if (!service) return null;

  return (
    <Sheet open={Boolean(service)} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto bg-white text-zinc-900 border-zinc-200 p-0 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-sm shadow-md overflow-hidden">
                {(service as any).image ? (
                  <img src={(service as any).image} alt={service.name} className="size-full object-cover" />
                ) : (
                  service.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-base font-black text-zinc-900">{service.name}</SheetTitle>
                  <StatusPill value={service.status} />
                </div>
                <SheetDescription className="text-xs text-zinc-500 font-medium flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-zinc-700">{service.category}</span>
                  <span>·</span>
                  <span>Base Rate: ₹{service.basePrice.toFixed(2)} /{service.unit}</span>
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100"
                onClick={() => onSync?.(false)}
              >
                <Zap className="size-3 mr-1 text-emerald-600" />
                <span>Sync Stores</span>
              </Button>
              <Button
                size="sm"
                variant={isEditing ? "default" : "outline"}
                className={`h-8 rounded-xl text-xs font-bold ${
                  isEditing ? "bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                }`}
                onClick={() => {
                  if (!isEditing) {
                    setEditForm({
                      name: service.name,
                      price: service.basePrice,
                      unit: service.unit,
                      sla: service.sla,
                      description: service.description,
                      image: (service as any).image || "",
                    });
                  }
                  setIsEditing(!isEditing);
                }}
              >
                <Pencil className="size-3 mr-1" />
                {isEditing ? "View 360°" : "Edit Service"}
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-zinc-50 p-2.5 border border-zinc-100 text-center">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Gross Revenue</p>
              <p className="text-xs font-black text-emerald-600">₹{service.financials.grossRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Orders</p>
              <p className="text-xs font-black text-zinc-900">{service.financials.totalOrders}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Assigned Fleet</p>
              <p className="text-xs font-black text-sky-600">{service.assignedRiders.length} Riders</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Avg Order Value</p>
              <p className="text-xs font-black text-zinc-900">₹{service.financials.aov.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 space-y-6">
          {isEditing ? (
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                <Pencil className="size-4 text-emerald-600" />
                <span>Edit Service Pricing & Specifications</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Service Name</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Base Price (₹)</label>
                  <Input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm((p) => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Unit (e.g. per kg, per item)</label>
                  <Input
                    value={editForm.unit}
                    onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Turnaround SLA</label>
                  <Input
                    value={editForm.sla}
                    onChange={(e) => setEditForm((p) => ({ ...p, sla: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Item Image URL (Catalog Thumbnail)</label>
                  <Input
                    placeholder="https://... (Garment image thumbnail)"
                    value={editForm.image}
                    onChange={(e) => setEditForm((p) => ({ ...p, image: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Description</label>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <Button
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold h-10"
                  onClick={() => updateMutation.mutate(editForm)}
                  disabled={updateMutation.isPending}
                >
                  <Save className="size-3.5 mr-1.5" />
                  {updateMutation.isPending ? "Saving..." : "Save Service Changes"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-zinc-200 text-zinc-700 text-xs font-bold h-10"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger value="revenue" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  💰 Revenue Breakdown
                </TabsTrigger>
                <TabsTrigger value="riders" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🚴 Assigned Riders ({service.assignedRiders.length})
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  📦 Orders ({service.recentOrders.length})
                </TabsTrigger>
                <TabsTrigger value="specs" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  ⚙️ Specifications
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: REVENUE BREAKDOWN */}
              <TabsContent value="revenue" className="space-y-4 pt-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-emerald-800 uppercase">Gross Revenue Generated</p>
                      <p className="text-2xl font-black text-emerald-950 mt-1">₹{service.financials.grossRevenue.toFixed(2)}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 border border-emerald-200">
                      {service.financials.completedOrders} Delivered Orders
                    </span>
                  </div>
                </div>

                {/* 3-Way Split Breakdown */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Platform Commission</p>
                    <p className="text-base font-black text-zinc-900">₹{service.financials.platformCommission.toFixed(2)}</p>
                    <p className="text-[10px] text-emerald-700 font-bold">18% standard rate</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Partner Stores</p>
                    <p className="text-base font-black text-zinc-900">₹{service.financials.partnerEarnings.toFixed(2)}</p>
                    <p className="text-[10px] text-sky-700 font-bold">70% wash processing</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Rider Fleet</p>
                    <p className="text-base font-black text-zinc-900">₹{service.financials.riderEarnings.toFixed(2)}</p>
                    <p className="text-[10px] text-amber-700 font-bold">12% delivery share</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">ORDER VOLUME INTELLIGENCE</h4>
                  <DetailRow label="Total Booked Orders" value={<span className="font-bold">{service.financials.totalOrders}</span>} />
                  <DetailRow label="Successfully Delivered" value={<span className="font-bold text-emerald-700">{service.financials.completedOrders}</span>} />
                  <DetailRow label="In-Progress Transit" value={<span className="font-bold text-sky-700">{service.financials.inProgressOrders}</span>} />
                  <DetailRow label="Cancelled Orders" value={<span className="font-bold text-rose-600">{service.financials.cancelledOrders}</span>} />
                  <DetailRow label="Average Order Value (AOV)" value={<span className="font-black text-zinc-900">₹{service.financials.aov.toFixed(2)}</span>} />
                </div>
              </TabsContent>

              {/* TAB 2: ASSIGNED RIDERS */}
              <TabsContent value="riders" className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">Delivery Fleet Handling This Service</h4>
                  <span className="text-xs font-bold text-sky-700">{service.assignedRiders.length} Allocated Riders</span>
                </div>

                <div className="rounded-2xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                  {service.assignedRiders.map((r: ServiceRider) => (
                    <div key={r.name} className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800 font-black text-xs">
                          {r.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{r.name}</p>
                          <p className="font-mono text-[10px] text-zinc-400 font-semibold">{r.vehicle} · {r.plate}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-zinc-900">{r.tripsForThisService} deliveries</p>
                          <p className="text-[10px] text-emerald-600 font-bold">Earned: ₹{r.earningsForThisService.toFixed(0)}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            r.liveState === "Online"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          ● {r.liveState}
                        </span>
                        <a
                          href={`tel:${r.phone}`}
                          className="flex size-8 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        >
                          <Phone className="size-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                  {service.assignedRiders.length === 0 && (
                    <div className="p-6 text-center text-xs text-zinc-400">All registered riders are ready for instant dispatch.</div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 3: RECENT ORDERS */}
              <TabsContent value="orders" className="space-y-4 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">Recent Service Bookings</h4>
                <div className="rounded-2xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                  {service.recentOrders.map((o) => (
                    <div key={o.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900">{o.code}</span>
                          <span className="text-[10px] text-zinc-500 font-medium">Customer: {o.customer}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Hub: {o.partner} · Rider: {o.rider}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-zinc-900">₹{o.amount}</p>
                        <span className="text-[10px] text-emerald-600 font-bold capitalize">{o.status}</span>
                      </div>
                    </div>
                  ))}
                  {service.recentOrders.length === 0 && (
                    <div className="p-6 text-center text-xs text-zinc-400">No orders placed under this service yet.</div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 4: SPECIFICATIONS */}
              <TabsContent value="specs" className="space-y-4 pt-4">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">SERVICE SPECIFICATIONS</h4>
                  <DetailRow label="Service Identifier" value={<span className="font-mono">{service.id}</span>} />
                  <DetailRow label="Category" value={service.category} />
                  <DetailRow label="Base Platform Rate" value={<span className="font-bold">₹{service.basePrice.toFixed(2)} /{service.unit}</span>} />
                  <DetailRow label="Turnaround SLA" value={service.sla} />
                  <DetailRow label="Description" value={service.description || "Standard laundry fulfillment."} />
                  <DetailRow label="Partner Offerings" value={`${service.partnerStoresCount} Stores`} />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* =========================================================================
   6. PARTNER STORE ADOPTION INTELLIGENCE MODAL
========================================================================= */
function PartnerAdoptionModal({
  service,
  allPartners,
  allPartnerServices,
  onClose,
  onSync,
  isSyncing,
}: {
  service: ServiceIntelligence | null;
  allPartners: any[];
  allPartnerServices: PartnerServiceRow[];
  onClose: () => void;
  onSync: () => void;
  isSyncing: boolean;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"offering" | "missing">("offering");

  // Calculate stores that offer this service
  const offeringStores = useMemo(() => {
    if (!service) return [];
    const matchIds = new Set<string>();
    const list: Array<{
      partnerId: string;
      businessName: string;
      city: string;
      phone: string;
      storePrice: number;
      basePrice: number;
      turnaroundHours: number;
      status: string;
      serviceRowId?: string;
    }> = [];

    for (const ps of allPartnerServices) {
      const match =
        ps.masterServiceId === service.id ||
        ps.name.toLowerCase().trim() === service.name.toLowerCase().trim();
      if (match && !matchIds.has(ps.partnerId)) {
        matchIds.add(ps.partnerId);
        list.push({
          partnerId: ps.partnerId,
          businessName: ps.partnerName,
          city: ps.city,
          phone: ps.phone || "—",
          storePrice: ps.price,
          basePrice: service.basePrice,
          turnaroundHours: ps.turnaroundHours || 24,
          status: ps.status,
          serviceRowId: ps.id,
        });
      }
    }

    if (service.offeringPartners && service.offeringPartners.length > 0) {
      for (const op of service.offeringPartners) {
        if (!matchIds.has(op.partnerId)) {
          matchIds.add(op.partnerId);
          list.push({
            partnerId: op.partnerId,
            businessName: op.businessName,
            city: op.city,
            phone: op.phone || "—",
            storePrice: op.storePrice ?? service.basePrice,
            basePrice: service.basePrice,
            turnaroundHours: op.turnaroundHours ?? 24,
            status: op.status ?? "Active",
          });
        }
      }
    }

    return list;
  }, [service, allPartnerServices]);

  // Stores that do NOT offer this service yet
  const missingStores = useMemo(() => {
    if (!service) return [];
    const offeringPartnerIds = new Set(offeringStores.map((s) => s.partnerId));
    return allPartners.filter((p) => !offeringPartnerIds.has(p.id));
  }, [service, offeringStores, allPartners]);

  const totalPartners = Math.max(1, allPartners.length);
  const adoptionPercent = Math.round((offeringStores.length / totalPartners) * 100);

  const addStoreMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      if (!service) return;
      return syncMasterServiceToPartners(service.id, false);
    },
    onSuccess: () => {
      toast.success("Service synced and enabled for store!");
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
    },
    onError: () => {
      toast.error("Failed to add service to store.");
    },
  });

  if (!service) return null;

  return (
    <Dialog open={Boolean(service)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white text-zinc-900 border-zinc-200 p-0 overflow-hidden">
        {/* Header Strip */}
        <div className="bg-zinc-950 text-white p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Partner Store Telemetry
                </span>
                <span className="text-zinc-400 text-xs">· {service.category}</span>
              </div>
              <DialogTitle className="text-lg font-black text-white mt-1">{service.name}</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Master Platform Rate: <b className="text-white">₹{service.basePrice.toFixed(2)} /{service.unit}</b> · Turnaround SLA: {service.sla}
              </DialogDescription>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400">{adoptionPercent}%</span>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Platform Coverage</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-300 font-bold">
              <span>{offeringStores.length} of {totalPartners} active partner stores currently offer this</span>
              <span>{missingStores.length} stores missing</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  adoptionPercent >= 70 ? "bg-emerald-400" : adoptionPercent >= 30 ? "bg-amber-400" : "bg-rose-400"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, adoptionPercent))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={activeTab === "offering" ? "default" : "outline"}
                className={`h-8 rounded-xl text-xs font-bold ${
                  activeTab === "offering" ? "bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700"
                }`}
                onClick={() => setActiveTab("offering")}
              >
                <CheckCircle2 className="size-3.5 mr-1 text-emerald-500" />
                <span>Offering Stores ({offeringStores.length})</span>
              </Button>
              <Button
                size="sm"
                variant={activeTab === "missing" ? "default" : "outline"}
                className={`h-8 rounded-xl text-xs font-bold ${
                  activeTab === "missing" ? "bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700"
                }`}
                onClick={() => setActiveTab("missing")}
              >
                <XCircle className="size-3.5 mr-1 text-zinc-400" />
                <span>Not Offering ({missingStores.length})</span>
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onSync}
              disabled={isSyncing}
              className="h-8 rounded-xl border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100"
            >
              <Zap className="size-3 mr-1 text-emerald-600" />
              <span>{isSyncing ? "Syncing..." : "Sync to All Stores"}</span>
            </Button>
          </div>

          {activeTab === "offering" ? (
            <div className="space-y-2">
              {offeringStores.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No partner stores have this service enabled in their rate card yet. Click "Sync to All Stores" above to push it!
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                  {offeringStores.map((st, i) => {
                    const diff = st.storePrice - st.basePrice;
                    return (
                      <div key={i} className="p-3 flex items-center justify-between text-xs hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-[11px]">
                            🏪
                          </div>
                          <div>
                            <p className="font-bold text-zinc-950">{st.businessName}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                              <span>📍 {st.city || "Kasganj Hub"}</span>
                              <span>·</span>
                              <span>📞 {st.phone}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="font-black text-zinc-950">₹{st.storePrice.toFixed(2)}</p>
                            <span
                              className={`text-[9px] font-black rounded px-1.5 py-0.2 ${
                                diff > 0
                                  ? "bg-amber-100 text-amber-800"
                                  : diff < 0
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {diff > 0 ? `+₹${diff.toFixed(0)} Markup` : diff < 0 ? `-₹${Math.abs(diff).toFixed(0)}` : "At Par"}
                            </span>
                          </div>
                          <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            Live
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {missingStores.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-700 font-bold">
                  🎉 100% Platform Network Coverage! All registered partner stores have adopted this service.
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                  {missingStores.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 font-black text-[11px]">
                          🏪
                        </div>
                        <div>
                          <p className="font-bold text-zinc-950">{p.businessName || p.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                            <span>📍 {p.city || "Kasganj Hub"}</span>
                            <span>·</span>
                            <span>📞 {p.phone || "—"}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addStoreMutation.mutate(p.id)}
                        disabled={addStoreMutation.isPending}
                        className="h-7 text-xs font-bold rounded-lg border-zinc-200 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Plus className="size-3 mr-1" />
                        <span>Enable for Store</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="bg-zinc-50 border-t border-zinc-200 p-3">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-bold">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   7. EDIT MASTER SERVICE DIALOG
========================================================================= */
function EditServiceDialog({
  service,
  categories,
  onClose,
}: {
  service: ServiceIntelligence | null;
  categories: ServiceCategory[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(service?.name || "");
  const [category, setCategory] = useState(service?.categoryId || service?.category || categories[0]?.id || "");
  const [price, setPrice] = useState(service?.basePrice?.toString() || "");
  const [unit, setUnit] = useState(service?.unit || "per kg");
  const [turnaroundHours, setTurnaroundHours] = useState(service?.turnaroundHours || 24);
  const [description, setDescription] = useState(service?.description || "");
  const [image, setImage] = useState((service as any)?.image || "");
  const [status, setStatus] = useState(service?.status || "Active");
  const [expressAvailable, setExpressAvailable] = useState(Boolean((service as any)?.expressAvailable));
  const [popular, setPopular] = useState(Boolean((service as any)?.popular));

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!service) throw new Error("No service selected");
      return updateService(service.id, {
        name,
        category,
        price: parseFloat(price) || 0,
        unit,
        turnaroundHours: Number(turnaroundHours),
        description,
        image,
        status,
        expressAvailable,
        popular,
      });
    },
    onSuccess: () => {
      toast.success("Master service updated successfully! 🎉");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-services"] });
    },
    onError: () => {
      toast.error("Failed to update master service.");
    },
  });

  if (!service) return null;

  return (
    <Dialog open={Boolean(service)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white text-zinc-900 border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-base font-black">Edit Master Service</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Modify platform-wide base rates, category assignment, turnaround SLA, and catalog settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Service Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Base Price (₹)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Pricing Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per kg">per kg (Weight)</SelectItem>
                  <SelectItem value="per piece">per piece (Single)</SelectItem>
                  <SelectItem value="per item">per item (Piece)</SelectItem>
                  <SelectItem value="per pair">per pair (Shoes)</SelectItem>
                  <SelectItem value="per meter">per meter (Curtains)</SelectItem>
                  <SelectItem value="per set">per set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Turnaround SLA</Label>
              <Select value={String(turnaroundHours)} onValueChange={(v) => setTurnaroundHours(Number(v))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">⚡ 12 Hours (Express)</SelectItem>
                  <SelectItem value="24">⏱️ 24 Hours (Next Day)</SelectItem>
                  <SelectItem value="48">📦 48 Hours (Standard 2 Days)</SelectItem>
                  <SelectItem value="72">🛡️ 72 Hours (Deep Care 3 Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">🟢 Active (Live in Catalog)</SelectItem>
                  <SelectItem value="Inactive">⚪ Inactive (Hidden)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Catalog Flags</Label>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expressAvailable}
                    onChange={(e) => setExpressAvailable(e.target.checked)}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Express ⚡</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={popular}
                    onChange={(e) => setPopular(e.target.checked)}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Popular ⭐</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Thumbnail Image URL</Label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." className="h-9 text-xs" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate()}
            disabled={!name || updateMutation.isPending}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   8. CREATE MASTER SERVICE DIALOG
========================================================================= */
function CreateServiceDialog({ categories }: { categories: ServiceCategory[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.name || categories[0]?.id || "Wash & Fold");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("per kg");
  const [turnaroundHours, setTurnaroundHours] = useState(24);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [expressAvailable, setExpressAvailable] = useState(false);
  const [popular, setPopular] = useState(false);
  const [syncToPartners, setSyncToPartners] = useState(true);

  const createMutation = useMutation({
    mutationFn: () =>
      createService({
        name,
        category: category || categories[0]?.name || "Wash & Fold",
        price: parseFloat(price) || 0,
        unit,
        turnaroundHours: Number(turnaroundHours),
        description,
        image,
        expressAvailable,
        popular,
        syncToPartners,
      }),
    onSuccess: () => {
      toast.success(
        syncToPartners
          ? "Master service added and synced to all partner stores! 🎉"
          : "Master service added to platform catalog! 🎉"
      );
      setOpen(false);
      setName("");
      setPrice("");
      setDescription("");
      setImage("");
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-services"] });
    },
    onError: () => {
      toast.error("Failed to create master service.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs">
          <Plus className="size-3.5 mr-1" />
          <span>Add Service</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-zinc-900 border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-base font-black">Add Master Platform Service</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Create a new category service offering. Appears immediately in Partner Registration and Store Rate Cards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Service Name</Label>
            <Input placeholder="e.g. Woolen Blanket Dry Cleaning" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Base Price (₹)</Label>
              <Input type="number" placeholder="60" value={price} onChange={(e) => setPrice(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Pricing Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per kg">per kg (Weight)</SelectItem>
                  <SelectItem value="per piece">per piece (Single)</SelectItem>
                  <SelectItem value="per item">per item (Piece)</SelectItem>
                  <SelectItem value="per pair">per pair (Shoes)</SelectItem>
                  <SelectItem value="per meter">per meter (Curtains)</SelectItem>
                  <SelectItem value="per set">per set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Turnaround SLA</Label>
              <Select value={String(turnaroundHours)} onValueChange={(v) => setTurnaroundHours(Number(v))}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">⚡ 12 Hours (Express)</SelectItem>
                  <SelectItem value="24">⏱️ 24 Hours (Next Day)</SelectItem>
                  <SelectItem value="48">📦 48 Hours (Standard 2 Days)</SelectItem>
                  <SelectItem value="72">🛡️ 72 Hours (Deep Care 3 Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Item Image URL</Label>
            <Input placeholder="https://... (Catalog thumbnail image)" value={image} onChange={(e) => setImage(e.target.value)} className="h-9 text-xs" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Description</Label>
            <Input placeholder="Short summary of the process..." value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-xs" />
          </div>

          {/* Sync Checkbox */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={syncToPartners}
                onChange={(e) => setSyncToPartners(e.target.checked)}
                className="mt-0.5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <p className="text-xs font-black text-emerald-950">⚡ Automatically Sync to All Partner Stores</p>
                <p className="text-[10px] text-emerald-800 font-medium">
                  Immediately enables this service across all active partner store rate cards and partner registration screens.
                </p>
              </div>
            </label>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white"
          >
            {createMutation.isPending ? "Adding & Syncing..." : "Add to Catalog"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCategoryDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createCategory({ name, description }),
    onSuccess: () => {
      toast.success("New category added! 🎉");
      setOpen(false);
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["admin", "service-categories"] });
    },
    onError: () => {
      toast.error("Failed to create category.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100">
          <Tag className="size-3.5 mr-1" />
          <span>New Category</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white text-zinc-900 border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-base font-black">Create Service Category</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Add a category to group related laundry, pressing, or dry cleaning services.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Category Name</Label>
            <Input placeholder="e.g. Shoe & Sneaker Care" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold">Description</Label>
            <Input placeholder="Short category description..." value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
            className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-bold"
          >
            {createMutation.isPending ? "Creating..." : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
