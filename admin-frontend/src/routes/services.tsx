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
  const [sortBy, setSortBy] = useState<"revenue" | "orders" | "price" | "name">("revenue");
  const [selectedService, setSelectedService] = useState<ServiceIntelligence | null>(null);

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
    const totalRevenue = stats?.totalServiceRevenue ?? allIntelligence.reduce((acc, s) => acc + s.financials.grossRevenue, 0);
    const totalOrders = stats?.totalOrdersDelivered ?? allIntelligence.reduce((acc, s) => acc + s.financials.totalOrders, 0);
    const topService = stats?.topGrossingService ?? (allIntelligence[0]?.name || "Wash & Iron");
    const topRevenue = stats?.topGrossingRevenue ?? (allIntelligence[0]?.financials.grossRevenue || 0);
    const activeRiders = stats?.activeRidersDispatching ?? 5;
    const activeStores = stats?.activePartnerStores ?? allPartners.length;

    return { totalServices, totalRevenue, totalOrders, topService, topRevenue, activeRiders, activeStores };
  }, [allIntelligence, stats, allPartners]);

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
      return matchSearch && matchCat && matchUnit && matchStatus;
    });

    if (sortBy === "revenue") {
      filtered.sort((a, b) => b.financials.grossRevenue - a.financials.grossRevenue);
    } else if (sortBy === "orders") {
      filtered.sort((a, b) => b.financials.totalOrders - a.financials.totalOrders);
    } else if (sortBy === "price") {
      filtered.sort((a, b) => b.basePrice - a.basePrice);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered;
  }, [allIntelligence, searchQuery, categoryFilter, unitFilter, statusFilter, sortBy]);

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
      csvRows.push(
        [
          `"${s.id}"`,
          `"${s.name}"`,
          `"${s.category}"`,
          `"${s.basePrice}"`,
          `"${s.unit}"`,
          `"${s.sla}"`,
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
              hint: "Active catalog offerings",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "tot-rev",
              label: "Total Service GMV",
              value: `₹${metrics.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
              hint: "Gross revenue generated",
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
              hint: `₹${metrics.topRevenue.toLocaleString("en-IN")} generated`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "rdr-srv",
              label: "Riders Dispatching",
              value: `${metrics.activeRiders} Riders`,
              hint: "Allocated fleet partners",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "prt-srv",
              label: "Partner Store Hubs",
              value: `${metrics.activeStores} Stores`,
              hint: "Kasganj rate cards active",
              positive: true,
            }}
          />
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Unit Filter */}
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                  <SelectValue placeholder="Pricing Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Billing Units</SelectItem>
                  <SelectItem value="kg">⚖️ Per KG</SelectItem>
                  <SelectItem value="piece">👔 Per Piece</SelectItem>
                  <SelectItem value="pair">👟 Per Pair</SelectItem>
                  <SelectItem value="sqft">📐 Per Sq. Ft</SelectItem>
                  <SelectItem value="fixed">🏷️ Flat / Fixed</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                  <SelectValue placeholder="Sort Catalog" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">💰 Top Revenue (Gross)</SelectItem>
                  <SelectItem value="orders">📦 Most Orders Volume</SelectItem>
                  <SelectItem value="price">🏷️ Base Unit Price</SelectItem>
                  <SelectItem value="name">🔤 Service Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
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
                          {s.financials.grossRevenue > 0 && <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 font-black">Top Selling</span>}
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
                        className="h-8 rounded-xl border-emerald-200 bg-emerald-50/50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        onClick={() => {
                          setSyncingServiceId(s.id);
                          syncToPartnersMutation.mutate({ serviceId: s.id, overridePrice: false });
                        }}
                        disabled={syncToPartnersMutation.isPending && syncingServiceId === s.id}
                      >
                        <Zap className="size-3 mr-1 text-emerald-600" />
                        <span>{syncToPartnersMutation.isPending && syncingServiceId === s.id ? "Syncing..." : "Sync Stores"}</span>
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
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-sm shadow-md">
                {service.name.slice(0, 2).toUpperCase()}
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
   7. CREATE SERVICE & CREATE CATEGORY DIALOGS
========================================================================= */
function CreateServiceDialog({ categories }: { categories: ServiceCategory[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.id || "");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("per kg");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createService({
        name,
        category: category || categories[0]?.id || "cat-1",
        price: parseFloat(price) || 0,
        unit,
        description,
      }),
    onSuccess: () => {
      toast.success("New master service added to catalog! 🎉");
      setOpen(false);
      setName("");
      setPrice("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "intelligence"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "services", "stats"] });
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
          <DialogTitle className="text-base font-black">Add Master Service</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Create a new platform-wide laundry service with default base pricing.
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
                    <SelectItem key={c.id} value={c.id}>
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

          <div className="space-y-1">
            <Label className="text-xs font-bold">Pricing Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per kg">per kg (Weight)</SelectItem>
                <SelectItem value="per item">per item (Piece)</SelectItem>
                <SelectItem value="per pair">per pair (Shoes)</SelectItem>
                <SelectItem value="per meter">per meter (Curtains)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Description</Label>
            <Input placeholder="Short summary of the process..." value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-xs" />
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
            {createMutation.isPending ? "Adding..." : "Add to Catalog"}
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
