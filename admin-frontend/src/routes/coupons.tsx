import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Tag,
  Percent,
  Gift,
  Search,
  Download,
  Calendar,
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  Sliders,
  Save,
  Check,
  RefreshCw,
  TrendingUp,
  Share2,
  DollarSign,
  IndianRupee,
  BadgeCheck,
  ShieldCheck,
  Eye,
  SlidersHorizontal,
  MapPin,
  Building2,
  Flame,
  Zap,
  Clock,
  ArrowUpRight,
  Filter,
  CheckCheck,
  PauseCircle,
  PlayCircle,
  ShoppingBag,
  Layers,
  X,
  FileText,
  ArrowUpDown,
  History,
  User,
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
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  fetchCouponStats,
  fetchCouponRedemptions,
  fetchAllCouponRedemptions,
  toggleCouponStatus,
  fetchReferralSettings,
  fetchReferralStats,
  fetchReferralsList,
  updateCoupon,
  updateReferralSettings,
  type Coupon,
  type CouponRedemption,
  type ReferralProgramSettings,
} from "../api/coupons";
import { fetchCities } from "../api/cities";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/coupons")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Advanced Coupons & Referral Engine",
      "City-wise promo targeting, redemption audit trail, discount limits, and customer growth referral mechanics."
    ),
  component: CouponsPage,
});

export function CouponsPage() {
  const queryClient = useQueryClient();
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [activeTab, setActiveTab] = useState<"coupons" | "redemptions_ledger" | "city_performance" | "referral_program" | "referral_history">("coupons");
  
  // Coupon Directory Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "active_today" | "expiring_7d" | "expiring_30d" | "expired">("all");
  const [sortBy, setSortBy] = useState<"used_desc" | "savings_desc" | "value_desc" | "expiry_asc" | "newest">("used_desc");

  // Redemptions Ledger Filters
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerCouponFilter, setLedgerCouponFilter] = useState("all");
  const [ledgerCityFilter, setLedgerCityFilter] = useState("all");
  const [ledgerDateFilter, setLedgerDateFilter] = useState<"all" | "today" | "yesterday" | "7d" | "30d">("all");

  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [inspectCoupon, setInspectCoupon] = useState<Coupon | null>(null);
  const [deleteCouponTarget, setDeleteCouponTarget] = useState<Coupon | null>(null);

  const citiesQuery = useQuery({ queryKey: ["admin", "cities", "list"], queryFn: fetchCities });
  const couponsQuery = useQuery({
    queryKey: ["admin", "coupons", selectedCity],
    queryFn: () => fetchCoupons(selectedCity),
  });
  const allRedemptionsQuery = useQuery({
    queryKey: ["admin", "coupons", "all-redemptions"],
    queryFn: fetchAllCouponRedemptions,
  });
  const statsQuery = useQuery({ queryKey: ["admin", "coupons", "stats"], queryFn: fetchCouponStats });
  const refSettings = useQuery({ queryKey: ["admin", "referral-settings"], queryFn: fetchReferralSettings });
  const refStats = useQuery({ queryKey: ["admin", "referral-stats"], queryFn: fetchReferralStats });
  const refList = useQuery({ queryKey: ["admin", "referral-list"], queryFn: fetchReferralsList });

  const allCoupons = couponsQuery.data ?? [];
  const allRedemptions = allRedemptionsQuery.data ?? [];
  const couponStats = statsQuery.data;
  const availableCities = citiesQuery.data ?? [];
  const referralsList = refList.data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      toast.success("Coupon deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons", "stats"] });
    },
    onError: () => {
      toast.error("Failed to delete coupon.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "Active" | "Paused" | "Expired" }) =>
      toggleCouponStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(`Coupon status updated to ${variables.status}!`);
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons", "stats"] });
    },
    onError: () => {
      toast.error("Failed to update status.");
    },
  });

  // Calculate live aggregate KPI metrics across coupons & redemptions
  const metrics = useMemo(() => {
    const total = allCoupons.length;
    const active = allCoupons.filter((c) => c.status === "Active").length;
    const totalRedemptions = allRedemptions.length > 0 ? allRedemptions.length : allCoupons.reduce((sum, c) => sum + (c.used || 0), 0);
    const totalSavings = allRedemptions.length > 0 ? allRedemptions.reduce((sum, r) => sum + (r.discountAmount || 0), 0) : allCoupons.reduce((sum, c) => sum + (c.totalDiscountGiven || 0), 0);
    const totalGmv = allRedemptions.length > 0 ? allRedemptions.reduce((sum, r) => sum + (r.orderAmount || 0), 0) : allCoupons.reduce((sum, c) => sum + (c.totalOrderRevenue || 0), 0);

    // Distinct unique customers who redeemed coupons
    const usersSet = new Set<string>();
    allRedemptions.forEach((r) => {
      if (r.userId) usersSet.add(r.userId);
      else if (r.userPhone) usersSet.add(r.userPhone);
    });
    const uniqueUsers = usersSet.size > 0 ? usersSet.size : allCoupons.reduce((sum, c) => sum + (c.uniqueUsers || 0), 0);
    const avgDiscount = totalRedemptions > 0 ? totalSavings / totalRedemptions : 0;

    return {
      total,
      active,
      totalRedemptions,
      totalSavings,
      totalGmv,
      uniqueUsers,
      avgDiscount,
    };
  }, [allCoupons, allRedemptions]);

  // Date filter evaluator for coupons
  const matchesDateFilter = (validTillStr?: string, filter: string = "all") => {
    if (filter === "all" || !validTillStr) return true;
    try {
      const expiry = new Date(validTillStr);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (isNaN(expiry.getTime())) return true;

      if (filter === "expired") {
        return expiry.getTime() < now.getTime();
      }
      if (filter === "active_today") {
        return expiry.getTime() >= now.getTime();
      }
      if (filter === "expiring_7d") {
        const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      if (filter === "expiring_30d") {
        const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
    } catch {
      return true;
    }
    return true;
  };

  // Date filter evaluator for redemption ledger
  const matchesLedgerDateFilter = (isoStr?: string, filter: string = "all") => {
    if (filter === "all" || !isoStr) return true;
    try {
      const d = new Date(isoStr);
      const now = new Date();
      if (isNaN(d.getTime())) return true;
      if (filter === "today") {
        return d.toDateString() === now.toDateString();
      }
      if (filter === "yesterday") {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return d.toDateString() === y.toDateString();
      }
      if (filter === "7d") {
        const diff = now.getTime() - d.getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
      }
      if (filter === "30d") {
        const diff = now.getTime() - d.getTime();
        return diff <= 30 * 24 * 60 * 60 * 1000;
      }
    } catch {
      return true;
    }
    return true;
  };

  // Filtered and sorted coupons
  const filteredCoupons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = allCoupons.filter((c) => {
      const matchSearch =
        !q ||
        [c.code, c.value, c.audience, c.description || "", ...(c.cities || []), ...(c.pincodes || [])]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchStatus = statusFilter === "all" || c.status.toLowerCase() === statusFilter.toLowerCase();
      const matchType = typeFilter === "all" || c.type.toLowerCase() === typeFilter.toLowerCase();
      const matchCity =
        selectedCity === "All Cities" ||
        !c.cities ||
        c.cities.length === 0 ||
        c.cities.includes(selectedCity);
      const matchDate = matchesDateFilter(c.validTill, dateFilter);
      return matchSearch && matchStatus && matchType && matchCity && matchDate;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "used_desc") return (b.used || 0) - (a.used || 0);
      if (sortBy === "savings_desc") return (b.totalDiscountGiven || 0) - (a.totalDiscountGiven || 0);
      if (sortBy === "value_desc") {
        const valA = parseFloat(a.value) || a.discountPct || a.flatDiscount || 0;
        const valB = parseFloat(b.value) || b.discountPct || b.flatDiscount || 0;
        return valB - valA;
      }
      if (sortBy === "expiry_asc") return new Date(a.validTill).getTime() - new Date(b.validTill).getTime();
      if (sortBy === "newest") return new Date(b.startDate || "").getTime() - new Date(a.startDate || "").getTime();
      return 0;
    });
  }, [allCoupons, searchQuery, statusFilter, typeFilter, selectedCity, dateFilter, sortBy]);

  // Filtered redemptions ledger
  const filteredRedemptions = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return allRedemptions.filter((r) => {
      const matchSearch =
        !q ||
        [r.userName, r.userPhone, r.orderId, r.couponCode, r.city, r.pincode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchCoupon =
        ledgerCouponFilter === "all" || r.couponCode.toUpperCase() === ledgerCouponFilter.toUpperCase();
      const matchCity =
        ledgerCityFilter === "all" || (r.city && r.city.toLowerCase() === ledgerCityFilter.toLowerCase());
      const matchDate = matchesLedgerDateFilter(r.redeemedAt, ledgerDateFilter);
      return matchSearch && matchCoupon && matchCity && matchDate;
    });
  }, [allRedemptions, ledgerSearch, ledgerCouponFilter, ledgerCityFilter, ledgerDateFilter]);

  // Aggregate stats for filtered redemptions ledger
  const ledgerSummary = useMemo(() => {
    let totalDiscount = 0;
    let totalGmv = 0;
    const usersSet = new Set<string>();

    filteredRedemptions.forEach((r) => {
      totalDiscount += r.discountAmount || 0;
      totalGmv += r.orderAmount || 0;
      if (r.userId) usersSet.add(r.userId);
      else if (r.userPhone) usersSet.add(r.userPhone);
    });

    return {
      totalDiscount,
      totalGmv,
      uniqueUsers: usersSet.size,
      totalRedemptions: filteredRedemptions.length,
    };
  }, [filteredRedemptions]);

  // Distinct coupon codes in redemptions for dropdown
  const distinctCouponCodes = useMemo(() => {
    const set = new Set<string>();
    allRedemptions.forEach((r) => {
      if (r.couponCode) set.add(r.couponCode.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [allRedemptions]);

  // Distinct cities in redemptions
  const distinctRedemptionCities = useMemo(() => {
    const set = new Set<string>();
    allRedemptions.forEach((r) => {
      if (r.city && r.city.trim()) set.add(r.city.trim());
    });
    return Array.from(set).sort();
  }, [allRedemptions]);

  const isCouponFiltered =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    selectedCity !== "All Cities" ||
    dateFilter !== "all" ||
    sortBy !== "used_desc";

  const resetCouponFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSelectedCity("All Cities");
    setDateFilter("all");
    setSortBy("used_desc");
  };

  const isLedgerFiltered =
    ledgerSearch.trim() !== "" ||
    ledgerCouponFilter !== "all" ||
    ledgerCityFilter !== "all" ||
    ledgerDateFilter !== "all";

  const resetLedgerFilters = () => {
    setLedgerSearch("");
    ledgerCouponFilter !== "all" && setLedgerCouponFilter("all");
    ledgerCityFilter !== "all" && setLedgerCityFilter("all");
    setLedgerDateFilter("all");
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code ${code} copied to clipboard! 📋`);
  };

  const handleExportCSV = () => {
    if (filteredCoupons.length === 0) {
      toast.error("No coupons to export.");
      return;
    }
    const headers = [
      "Coupon Code",
      "Discount Value",
      "Discount Type",
      "Min Order (INR)",
      "Max Discount (INR)",
      "Target Cities",
      "Target Pincodes",
      "Per-User Limit",
      "Redemptions Used",
      "Usage Limit",
      "Unique Users",
      "Total Savings Given (INR)",
      "Valid Till",
      "Target Audience",
      "Status",
    ];
    const csvRows = [headers.join(",")];
    for (const c of filteredCoupons) {
      csvRows.push(
        [
          `"${c.code}"`,
          `"${c.value}"`,
          `"${c.type}"`,
          `"${c.minOrder}"`,
          `"${c.maxDiscount || 0}"`,
          `"${(c.cities || []).join("; ") || "All Cities"}"`,
          `"${(c.pincodes || []).join("; ") || "All PINs"}"`,
          `"${c.perUserLimit || 1}"`,
          `"${c.used}"`,
          `"${c.limit}"`,
          `"${c.uniqueUsers || 0}"`,
          `"${c.totalDiscountGiven || 0}"`,
          `"${c.validTill}"`,
          `"${c.audience}"`,
          `"${c.status}"`,
        ].join(",")
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Advanced_Coupons_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Coupons directory exported as CSV! 🚀");
  };

  const handleExportLedgerCSV = () => {
    if (filteredRedemptions.length === 0) {
      toast.error("No redemption records to export.");
      return;
    }
    const headers = [
      "Customer Name",
      "Customer Phone",
      "Order ID",
      "Coupon Code Applied",
      "City",
      "Pincode",
      "Gross Order Value (INR)",
      "Discount Disbursed (INR)",
      "Net Amount Paid (INR)",
      "Redemption Date & Time",
    ];
    const rows = filteredRedemptions.map((r) => [
      `"${r.userName}"`,
      `"${r.userPhone}"`,
      `"${r.orderId}"`,
      `"${r.couponCode}"`,
      `"${r.city || "N/A"}"`,
      `"${r.pincode || "N/A"}"`,
      `"${r.orderAmount.toFixed(2)}"`,
      `"${r.discountAmount.toFixed(2)}"`,
      `"${(r.orderAmount - r.discountAmount).toFixed(2)}"`,
      `"${r.redeemedAt}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Coupon_Redemptions_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Full redemptions history exported as CSV! 🚀");
  };

  return (
    <AdminShell
      title="Advanced Coupons & Customer Referral Engine"
      subtitle="Configure territory-targeted promo codes, track customer redemptions, inspect usage velocity, and audit platform-wide discount subsidies."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* City Selector */}
          <Select value={selectedCity} onValueChange={(val) => setSelectedCity(val)}>
            <SelectTrigger className="h-8 w-44 rounded-xl border-zinc-200 bg-white text-xs font-bold text-zinc-800 shadow-2xs">
              <MapPin className="size-3.5 mr-1.5 text-emerald-600" />
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Cities">🌐 All Operating Cities</SelectItem>
              {availableCities.map((c) => (
                <SelectItem key={c.id} value={c.city}>
                  📍 {c.city} ({c.state})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              couponsQuery.refetch();
              allRedemptionsQuery.refetch();
              statsQuery.refetch();
              citiesQuery.refetch();
              refSettings.refetch();
              refList.refetch();
              toast.success("Coupons, Redemptions & Territory data refreshed!");
            }}
            disabled={couponsQuery.isRefetching || allRedemptionsQuery.isRefetching}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${couponsQuery.isRefetching || allRedemptionsQuery.isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={activeTab === "redemptions_ledger" ? handleExportLedgerCSV : handleExportCSV}
            className="h-8 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
          >
            <Download className="size-3.5 mr-1.5" />
            <span>{activeTab === "redemptions_ledger" ? "Export Redemptions CSV" : "Export Coupons CSV"}</span>
          </Button>

          <CreateCouponDialog availableCities={availableCities} defaultCity={selectedCity !== "All Cities" ? selectedCity : undefined} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP KPI SUMMARY METRICS (6 ADVANCED CARDS)
        ========================================================================= */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            kpi={{
              id: "tot-coupons",
              label: "Active Campaigns",
              value: `${metrics.active} / ${metrics.total} Active`,
              hint: selectedCity !== "All Cities" ? `In ${selectedCity}` : "Across all territories",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "tot-redemptions",
              label: "Total Redemptions",
              value: `${metrics.totalRedemptions} Orders`,
              hint: "Promo applied on checkout",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "tot-savings",
              label: "Customer Savings",
              value: `₹${metrics.totalSavings.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              hint: "Total discount disbursed",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "uniq-users",
              label: "Unique Customers",
              value: `${metrics.uniqueUsers} Users`,
              hint: "Benefitted from promos",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "driven-gmv",
              label: "Generated Order GMV",
              value: `₹${metrics.totalGmv.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              hint: "Gross coupon sales",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "avg-saving",
              label: "Avg Order Discount",
              value: `₹${metrics.avgDiscount.toFixed(2)} / Order`,
              hint: "Budget & margin subsidy",
              positive: true,
            }}
          />
        </div>

        {/* =========================================================================
            2. MAIN TABS & ADVANCED TOOLBAR
        ========================================================================= */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger
                  value="coupons"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
                >
                  🏷️ Active Promo Codes & Campaigns ({allCoupons.length})
                </TabsTrigger>
                <TabsTrigger
                  value="redemptions_ledger"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
                >
                  📜 All Redemptions & User History ({allRedemptions.length})
                </TabsTrigger>
                <TabsTrigger
                  value="city_performance"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
                >
                  🏙️ City-Wise Campaign Performance
                </TabsTrigger>
                <TabsTrigger
                  value="referral_program"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
                >
                  🎁 Referral Program Rules & Rewards
                </TabsTrigger>
                <TabsTrigger
                  value="referral_history"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs"
                >
                  👥 Customer Referral Log ({referralsList.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <Sparkles className="size-4 text-emerald-600" />
              <span>Smart Territory & Pincode Targeting Active</span>
            </div>
          </div>

          {/* Tab 1: Coupons Directory Filter Bar */}
          {activeTab === "coupons" && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
                {/* Search */}
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search code, discount, city or audience..."
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-zinc-200 bg-white">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🛡️ All Status</SelectItem>
                    <SelectItem value="active">🟢 Active & Live</SelectItem>
                    <SelectItem value="paused">⏸️ Paused</SelectItem>
                    <SelectItem value="expired">⏳ Expired</SelectItem>
                  </SelectContent>
                </Select>

                {/* Discount Type Filter */}
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-zinc-200 bg-white">
                    <SelectValue placeholder="All Discount Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🏷️ All Types</SelectItem>
                    <SelectItem value="percentage">% Percentage</SelectItem>
                    <SelectItem value="flat">₹ Flat Discount</SelectItem>
                    <SelectItem value="free_delivery">🚚 Free Delivery</SelectItem>
                  </SelectContent>
                </Select>

                {/* City Filter Shortcut */}
                <Select value={selectedCity} onValueChange={(v) => setSelectedCity(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-zinc-200 bg-white">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Cities">🌐 All Cities</SelectItem>
                    {availableCities.map((c) => (
                      <SelectItem key={c.id} value={c.city}>
                        📍 {c.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date / Validity Activity Filter */}
                <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-zinc-200 bg-white">
                    <SelectValue placeholder="Validity Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📅 All Dates</SelectItem>
                    <SelectItem value="active_today">⚡ Valid Today</SelectItem>
                    <SelectItem value="expiring_7d">⚠️ Expiring in 7 Days</SelectItem>
                    <SelectItem value="expiring_30d">🗓️ Expiring in 30 Days</SelectItem>
                    <SelectItem value="expired">❌ Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Strip & Sorting */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-zinc-900">
                    Showing {filteredCoupons.length} of {allCoupons.length} campaigns
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-600">
                    Redemptions: <strong className="text-zinc-950 font-black">{filteredCoupons.reduce((s, c) => s + (c.used || 0), 0)}</strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-600">
                    Savings Disbursed: <strong className="text-emerald-700 font-black">₹{filteredCoupons.reduce((s, c) => s + (c.totalDiscountGiven || 0), 0).toFixed(0)}</strong>
                  </span>
                  {isCouponFiltered && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={resetCouponFilters}
                      className="h-6 px-2 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                    >
                      <X className="size-3 mr-1" /> Reset All Filters
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-zinc-500 font-bold">Sort:</span>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="h-7 w-44 rounded-lg bg-zinc-50 text-[11px] font-bold border-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="used_desc">🔥 Most Redemptions</SelectItem>
                      <SelectItem value="savings_desc">💰 Most Savings Disbursed</SelectItem>
                      <SelectItem value="value_desc">🏷️ Highest Discount Value</SelectItem>
                      <SelectItem value="expiry_asc">⏳ Expiring Soonest</SelectItem>
                      <SelectItem value="newest">✨ Recently Created</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* =========================================================================
            3. TAB 1: PROMO CODES & ADVANCED DISCOUNT DIRECTORY
        ========================================================================= */}
        {activeTab === "coupons" && (
          <SectionCard
            title={`Promo Discount Codes Directory ${selectedCity !== "All Cities" ? `(Filtered: ${selectedCity})` : ""}`}
            description="Manage discount coupons, city-wise territory targeting, per-user limits, usage velocity, and real-time customer redemption history."
            actions={
              <CreateCouponDialog availableCities={availableCities} defaultCity={selectedCity !== "All Cities" ? selectedCity : undefined} />
            }
          >
            <DataTable
              loading={couponsQuery.isLoading}
              rows={filteredCoupons}
              emptyMessage="No promo discount codes found in database. Click '+ Create Smart Coupon' to create your first discount campaign."
              columns={[
                {
                  key: "code",
                  label: "Coupon Code & Details",
                  render: (c) => (
                    <div className="flex items-start gap-2.5">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold shadow-2xs shrink-0 mt-0.5">
                        <Tag className="size-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-black text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                            {c.code}
                          </span>
                          {c.badge && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.2 text-[9px] font-black text-rose-700 border border-rose-200">
                              <Flame className="size-2.5" /> {c.badge}
                            </span>
                          )}
                          <button
                            onClick={() => handleCopyCode(c.code)}
                            className="text-zinc-400 hover:text-emerald-700 transition-colors p-0.5"
                            title="Copy Code"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-600 font-medium line-clamp-1 max-w-[220px]">
                          {c.description || `${c.value} for ${c.audience}`}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          Audience: <strong className="text-zinc-700">{c.audience}</strong> · Limit:{" "}
                          <strong className="text-zinc-700">{c.perUserLimit || 1}x/user</strong>
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "value",
                  label: "Discount Value",
                  render: (c) => (
                    <div className="text-xs space-y-1">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800 border border-emerald-200 shadow-2xs">
                        {c.value}
                      </span>
                      {c.maxDiscount ? (
                        <p className="text-[10px] text-zinc-500 font-medium">Max cap: ₹{c.maxDiscount}</p>
                      ) : null}
                      <p className="text-[10px] text-zinc-400">Min Order: <strong className="text-zinc-700">₹{c.minOrder}</strong></p>
                    </div>
                  ),
                },
                {
                  key: "territory",
                  label: "Target Territory",
                  render: (c) => {
                    const cities = c.cities || [];
                    const pins = c.pincodes || [];
                    return (
                      <div className="text-xs space-y-1">
                        {cities.length === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 border border-blue-200">
                            🌐 All Operating Cities
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {cities.map((ct: string) => (
                              <span
                                key={ct}
                                className="inline-flex items-center gap-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[10px] font-bold px-1.5 py-0.5 border border-zinc-200"
                              >
                                <MapPin className="size-2.5 text-emerald-600" /> {ct}
                              </span>
                            ))}
                          </div>
                        )}
                        {pins.length > 0 && (
                          <p className="text-[10px] text-zinc-500 font-medium">
                            {pins.length} specific PIN(s) targeted
                          </p>
                        )}
                      </div>
                    );
                  },
                },
                {
                  key: "usage",
                  label: "Usage & Redemptions",
                  render: (c) => {
                    const pct = Math.min(100, Math.round((c.used / (c.limit || 500)) * 100));
                    return (
                      <div className="w-36 text-xs space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-zinc-600">
                          <span>{c.used} / {c.limit} Used</span>
                          <span className="text-emerald-700">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              pct >= 90 ? "bg-rose-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span>{c.uniqueUsers || 0} customers</span>
                          <span className="font-bold text-emerald-700">₹{(c.totalDiscountGiven || 0).toFixed(0)} saved</span>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  key: "validTill",
                  label: "Validity",
                  render: (c) => (
                    <div className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1 font-bold text-zinc-800 text-[11px]">
                        <Calendar className="size-3 text-zinc-400" />
                        <span>{c.validTill}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        {new Date(c.validTill).getTime() < Date.now() ? (
                          <span className="text-rose-600 font-bold">Campaign Ended</span>
                        ) : (
                          "Active campaign"
                        )}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (c) => {
                    const isActive = c.status === "Active";
                    return (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: c.id,
                              status: isActive ? "Paused" : "Active",
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                              : c.status === "Paused"
                              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200"
                          }`}
                          title="Click to toggle status"
                        >
                          <span className={`size-1.5 rounded-full ${isActive ? "bg-emerald-600 animate-pulse" : "bg-amber-600"}`} />
                          <span>{c.status}</span>
                        </button>
                      </div>
                    );
                  },
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (c) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectCoupon(c)}
                        className="h-7 px-2 text-[11px] font-bold rounded-lg border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        title="View detailed customer redemption audit log"
                      >
                        <Users className="size-3 mr-1" />
                        <span>Redemptions ({c.used})</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditCoupon(c)}
                        className="h-7 px-2 text-[11px] font-bold rounded-lg border-zinc-200 hover:bg-zinc-100"
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteCouponTarget(c)}
                        disabled={deleteMutation.isPending}
                        className="h-7 px-2 text-[11px] font-bold rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50"
                        title="Delete coupon permanently"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </SectionCard>
        )}

        {/* =========================================================================
            3.5 TAB 2: FULL CUSTOMER REDEMPTIONS & PROMOTION HISTORY LEDGER
        ========================================================================= */}
        {activeTab === "redemptions_ledger" && (
          <SectionCard
            title="Full Customer Redemptions & Promotion History Ledger"
            description="Audit-grade ledger tracking every discount claimed by customers across orders, territory hubs, and campaign codes."
            actions={
              <Button
                size="sm"
                onClick={handleExportLedgerCSV}
                className="h-8 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
              >
                <Download className="size-3.5 mr-1.5" />
                <span>Export Ledger CSV</span>
              </Button>
            }
          >
            {/* Top 4 Mini Telemetry Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total Redemptions</span>
                <p className="text-xl font-black text-zinc-950 tabular-nums">{ledgerSummary.totalRedemptions} Orders</p>
                <p className="text-[10px] text-zinc-400">Total checkout applications</p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Discount Disbursed</span>
                <p className="text-xl font-black text-emerald-800 tabular-nums">₹{ledgerSummary.totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-emerald-600">Platform promotional subsidy</p>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Generated Order GMV</span>
                <p className="text-xl font-black text-sky-900 tabular-nums">₹{ledgerSummary.totalGmv.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-sky-600">Gross order revenue transacted</p>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Unique Customers</span>
                <p className="text-xl font-black text-purple-900 tabular-nums">{ledgerSummary.uniqueUsers} Users</p>
                <p className="text-[10px] text-purple-600">Distinct customer accounts</p>
              </div>
            </div>

            {/* Redemptions Filter Controls */}
            <div className="space-y-3 pb-4 border-b border-zinc-100">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search customer, phone, order, or code..."
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-8 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  {ledgerSearch && (
                    <button
                      onClick={() => setLedgerSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Promo Code Filter */}
                <Select value={ledgerCouponFilter} onValueChange={setLedgerCouponFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-zinc-200 bg-white">
                    <SelectValue placeholder="All Promo Codes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🏷️ All Promo Codes</SelectItem>
                    {distinctCouponCodes.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* City Filter */}
                <Select value={ledgerCityFilter} onValueChange={setLedgerCityFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-zinc-200 bg-white">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📍 All Operating Cities</SelectItem>
                    {distinctRedemptionCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Filter */}
                <Select value={ledgerDateFilter} onValueChange={(v: any) => setLedgerDateFilter(v)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl border-zinc-200 bg-white">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📅 All Time Activity</SelectItem>
                    <SelectItem value="today">⚡ Today</SelectItem>
                    <SelectItem value="yesterday">⏳ Yesterday</SelectItem>
                    <SelectItem value="7d">🗓️ Last 7 Days</SelectItem>
                    <SelectItem value="30d">📆 Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-zinc-900">
                    Showing {filteredRedemptions.length} of {allRedemptions.length} Redemptions
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-600">
                    Combined Discount: <strong className="text-emerald-700 font-black">₹{ledgerSummary.totalDiscount.toFixed(2)}</strong>
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-600">
                    Generated GMV: <strong className="text-zinc-950 font-black">₹{ledgerSummary.totalGmv.toFixed(2)}</strong>
                  </span>
                </div>

                {isLedgerFiltered && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetLedgerFilters}
                    className="h-6 px-2 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                  >
                    <X className="size-3 mr-1" /> Reset Redemption Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Redemptions Ledger DataTable */}
            <DataTable
              loading={allRedemptionsQuery.isLoading}
              rows={filteredRedemptions}
              emptyMessage="No customer redemptions match the current filters."
              columns={[
                {
                  key: "customer",
                  label: "Customer & Hub",
                  render: (r: CouponRedemption) => (
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold text-xs border border-purple-100">
                        <User className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-950 text-xs truncate">{r.userName || "Customer"}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {r.userPhone} · <span className="font-sans">{r.city || "Kasganj Hub"}</span>
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "couponCode",
                  label: "Promo Code Applied",
                  render: (r: CouponRedemption) => (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {r.couponCode}
                      </span>
                      <button
                        onClick={() => handleCopyCode(r.couponCode)}
                        className="text-zinc-400 hover:text-emerald-700 transition-colors p-0.5"
                        title="Copy Code"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  ),
                },
                {
                  key: "orderId",
                  label: "Order Reference",
                  render: (r: CouponRedemption) => (
                    <div>
                      <span className="font-mono text-xs font-bold text-zinc-900 block">#{r.orderId}</span>
                      {r.pincode && (
                        <span className="text-[10px] text-zinc-400 font-mono">PIN: {r.pincode}</span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "orderAmount",
                  label: "Gross Order GMV",
                  render: (r: CouponRedemption) => (
                    <span className="font-bold text-xs text-zinc-800 tabular-nums">
                      ₹{r.orderAmount.toFixed(2)}
                    </span>
                  ),
                },
                {
                  key: "discountAmount",
                  label: "Discount Saved",
                  render: (r: CouponRedemption) => (
                    <span className="inline-flex items-center gap-0.5 font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 tabular-nums">
                      -₹{r.discountAmount.toFixed(2)}
                    </span>
                  ),
                },
                {
                  key: "netAmount",
                  label: "Net Paid",
                  render: (r: CouponRedemption) => (
                    <span className="font-black text-xs text-zinc-950 tabular-nums">
                      ₹{Math.max(0, r.orderAmount - r.discountAmount).toFixed(2)}
                    </span>
                  ),
                },
                {
                  key: "redeemedAt",
                  label: "Redeemed Timestamp",
                  render: (r: CouponRedemption) => (
                    <div className="text-xs space-y-0.5 text-zinc-500 font-mono text-[11px]">
                      <p className="font-medium text-zinc-700">{r.redeemedAt}</p>
                    </div>
                  ),
                },
              ]}
            />
          </SectionCard>
        )}

        {/* =========================================================================
            4. TAB 3: CITY-WISE CAMPAIGN PERFORMANCE
        ========================================================================= */}
        {activeTab === "city_performance" && (
          <div className="space-y-6">
            <SectionCard
              title="City-Wise Coupon Penetration & Discount Analytics"
              description="Visual performance breakdown of promo usage, redemptions velocity, and discount subsidies across active operational hubs."
            >
              {availableCities.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-zinc-500">No operational cities configured. Add cities in the Territory Engine first.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {availableCities.map((cityObj) => {
                    const cityCoupons = allCoupons.filter(
                      (c) => !c.cities || c.cities.length === 0 || c.cities.includes(cityObj.city)
                    );
                    const cityUsed = cityCoupons.reduce((sum, c) => sum + (c.used || 0), 0);
                    const cityDiscount = cityCoupons.reduce((sum, c) => sum + (c.totalDiscountGiven || 0), 0);
                    const activeCount = cityCoupons.filter((c) => c.status === "Active").length;

                    return (
                      <div
                        key={cityObj.id}
                        className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs space-y-4 hover:border-emerald-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                              {cityObj.city.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-zinc-900">{cityObj.city}</h4>
                              <p className="text-[10px] text-zinc-400 font-medium">{cityObj.state} · {cityObj.tier}</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 border border-emerald-200">
                            {activeCount} Active Offers
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-zinc-50 p-2.5 border border-zinc-100">
                            <span className="text-[10px] text-zinc-400 font-medium block">Total Redemptions</span>
                            <span className="font-black text-sm text-zinc-900">{cityUsed} Used</span>
                          </div>
                          <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-100">
                            <span className="text-[10px] text-emerald-700 font-medium block">Discount Given</span>
                            <span className="font-black text-sm text-emerald-800">₹{cityDiscount.toFixed(0)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-bold text-zinc-500">
                            {cityObj.pincodes?.length || 0} Pincode Zones
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCity(cityObj.city);
                              setActiveTab("coupons");
                            }}
                            className="h-7 rounded-lg text-[11px] font-bold border-zinc-200 hover:bg-zinc-100"
                          >
                            <span>Explore Offers</span>
                            <ArrowUpRight className="size-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* =========================================================================
            5. TAB 3: REFERRAL PROGRAM CONFIGURATION
        ========================================================================= */}
        {activeTab === "referral_program" && (
          <ReferralSettingsForm initialSettings={refSettings.data} />
        )}

        {/* =========================================================================
            6. TAB 4: CUSTOMER REFERRAL AUDIT LOG
        ========================================================================= */}
        {activeTab === "referral_history" && (
          <SectionCard
            title={`Customer Referral & Growth Log (${referralsList.length})`}
            description="Real-time log of customer peer invites, successful registration signups, and first-order reward payouts."
          >
            <DataTable
              loading={refList.isLoading}
              rows={referralsList}
              emptyMessage="No customer referral transactions found in database."
              columns={[
                {
                  key: "referrer",
                  label: "Inviting Customer (Referrer)",
                  render: (r: any) => (
                    <div>
                      <span className="font-bold text-xs text-zinc-900 block">{r.referrer || r.referrerName || "Customer"}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{r.referrerPhone || ""}</span>
                    </div>
                  ),
                },
                {
                  key: "referee",
                  label: "Invited Friend (Referee)",
                  render: (r: any) => (
                    <div>
                      <span className="font-bold text-xs text-zinc-900 block">{r.referee || r.refereeName || "Friend"}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{r.refereePhone || ""}</span>
                    </div>
                  ),
                },
                {
                  key: "reward",
                  label: "Reward Disbursed",
                  render: (r: any) => (
                    <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ₹{r.rewardAmount || 100} Wallet Cash
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (r: any) => (
                    <StatusPill status={r.status || "Converted"} />
                  ),
                },
                {
                  key: "date",
                  label: "Conversion Date",
                  render: (r: any) => <span className="text-xs text-zinc-500 font-medium">{r.date || r.createdAt || "Recent"}</span>,
                },
              ]}
            />
          </SectionCard>
        )}
      </div>

      {/* =========================================================================
          7. MODALS
      ========================================================================= */}
      {/* Edit Coupon Modal */}
      {editCoupon && (
        <EditCouponDialog
          coupon={editCoupon}
          availableCities={availableCities}
          onClose={() => setEditCoupon(null)}
        />
      )}

      {/* Redemptions Detail & Customer Audit Log Modal */}
      {inspectCoupon && (
        <RedemptionsAuditModal
          coupon={inspectCoupon}
          onClose={() => setInspectCoupon(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteCouponTarget && (
        <Dialog open={Boolean(deleteCouponTarget)} onOpenChange={(open) => (!open && setDeleteCouponTarget(null))}>
          <DialogContent className="sm:max-w-md bg-white text-zinc-900 border-zinc-200">
            <DialogHeader>
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-2">
                <Trash2 className="size-6" />
              </div>
              <DialogTitle className="text-center text-base font-black text-zinc-900">
                Delete Coupon Campaign?
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-zinc-500">
                Are you sure you want to permanently delete <span className="font-bold text-zinc-900 font-mono">{deleteCouponTarget.code}</span>? This coupon will be removed permanently and customers can no longer claim it.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs space-y-1.5 my-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Coupon Code:</span>
                <span className="font-black text-emerald-800 font-mono">{deleteCouponTarget.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Discount Offer:</span>
                <span className="font-bold text-zinc-800">{deleteCouponTarget.value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Times Redeemed:</span>
                <span className="font-bold text-zinc-800">{deleteCouponTarget.used} times</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Target Cities:</span>
                <span className="font-bold text-zinc-800">
                  {deleteCouponTarget.cities && deleteCouponTarget.cities.length > 0
                    ? deleteCouponTarget.cities.join(", ")
                    : "All Operating Cities"}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between sm:space-x-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteCouponTarget(null)}
                className="rounded-xl text-xs font-bold border-zinc-200 hover:bg-zinc-100"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const targetId = deleteCouponTarget.id || (deleteCouponTarget as any)._id;
                  deleteMutation.mutate(targetId);
                  setDeleteCouponTarget(null);
                }}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs"
              >
                {deleteMutation.isPending ? "Deleting..." : "Yes, Delete Coupon"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminShell>
  );
}

/* =========================================================================
   8. CREATE SMART COUPON DIALOG (ADVANCED)
========================================================================= */
function CreateCouponDialog({
  availableCities,
  defaultCity,
}: {
  availableCities: any[];
  defaultCity?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentage" | "flat" | "free_delivery">("percentage");
  const [discountPct, setDiscountPct] = useState("20");
  const [maxDiscount, setMaxDiscount] = useState("100");
  const [flatDiscount, setFlatDiscount] = useState("100");
  const [minOrder, setMinOrder] = useState("199");
  const [audience, setAudience] = useState("All Users");
  const [selectedCities, setSelectedCities] = useState<string[]>(defaultCity ? [defaultCity] : []);
  const [pincodesInput, setPincodesInput] = useState("");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [limit, setLimit] = useState("500");
  const [validTill, setValidTill] = useState("2026-12-31");
  const [badge, setBadge] = useState("HOT");
  const [description, setDescription] = useState("");

  const handleGenerateCode = () => {
    const prefixes = ["PROMO", "SAVE", "OFF", "SUPER", "DISCOUNT", "EXPRESS", "DEAL"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}${num}`);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const pins = pincodesInput
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length === 6 && /^\d+$/.test(p));

      let valStr = `${discountPct}% OFF`;
      if (type === "flat") valStr = `₹${flatDiscount} OFF`;
      if (type === "free_delivery") valStr = "FREE DELIVERY";

      return createCoupon({
        code: (code || "NEWPROMO").toUpperCase().trim(),
        type,
        value: valStr,
        discountPct: type === "percentage" ? parseFloat(discountPct) || 20 : 0,
        maxDiscount: type === "percentage" ? parseFloat(maxDiscount) || 100 : parseFloat(flatDiscount) || 0,
        flatDiscount: parseFloat(flatDiscount) || 0,
        minOrder: parseFloat(minOrder) || 0,
        audience,
        cities: selectedCities,
        pincodes: pins,
        perUserLimit: parseInt(perUserLimit) || 1,
        limit: parseInt(limit) || 500,
        validTill,
        badge,
        description: description || `${valStr} on orders above ₹${minOrder}`,
        status: "Active",
      });
    },
    onSuccess: () => {
      toast.success("New promo campaign created successfully! 🎉");
      setOpen(false);
      setCode("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons", "stats"] });
    },
    onError: () => {
      toast.error("Failed to create coupon code.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
        >
          <Plus className="size-3.5 mr-1" />
          <span>Create Smart Coupon</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white text-zinc-900 border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-600" />
            <span>Launch New Promo Discount Campaign</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Define promotional discount value, territory city targeting, cart thresholds, and customer usage caps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* 1. Code & Randomizer */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold">Coupon Code *</Label>
              <button
                type="button"
                onClick={handleGenerateCode}
                className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                ⚡ Auto-Generate Code
              </button>
            </div>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FESTIVE50, KASGANJ100, FIRSTFREE"
              className="font-mono text-sm font-black uppercase h-10 tracking-wider"
            />
          </div>

          {/* 2. Discount Type & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Discount Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">% Percentage Discount</SelectItem>
                  <SelectItem value="flat">₹ Flat Discount</SelectItem>
                  <SelectItem value="free_delivery">🚚 100% Free Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "percentage" ? (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Discount Percent (%)</Label>
                <Input
                  type="number"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  placeholder="e.g. 50"
                  className="h-9 text-xs font-black"
                />
              </div>
            ) : type === "flat" ? (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Flat Discount (₹)</Label>
                <Input
                  type="number"
                  value={flatDiscount}
                  onChange={(e) => setFlatDiscount(e.target.value)}
                  placeholder="e.g. 100"
                  className="h-9 text-xs font-black"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Max Delivery Fee Waived (₹)</Label>
                <Input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="e.g. 40"
                  className="h-9 text-xs font-black"
                />
              </div>
            )}
          </div>

          {/* 3. Caps & Cart Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Minimum Cart Value (₹)</Label>
              <Input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="e.g. 199"
                className="h-9 text-xs"
              />
            </div>

            {type === "percentage" && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Max Discount Cap (₹)</Label>
                <Input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder="e.g. 150"
                  className="h-9 text-xs"
                />
              </div>
            )}
          </div>

          {/* 4. Territory & City Targeting */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
            <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <MapPin className="size-3.5 text-emerald-700" />
              <span>City Territory Targeting</span>
            </Label>
            <p className="text-[10px] text-emerald-800">
              Leave unselected to make this coupon valid across <strong>all operational cities</strong>. Select specific cities to restrict visibility.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {availableCities.map((c) => {
                const isSelected = selectedCities.includes(c.city);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCities((prev) =>
                        isSelected ? prev.filter((item) => item !== c.city) : [...prev, c.city]
                      );
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-zinc-700 border border-zinc-200 hover:border-emerald-300"
                    }`}
                  >
                    <Check className={`size-3 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    <span>{c.city}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Optional Specific Pincodes */}
          <div className="space-y-1">
            <Label className="text-xs font-bold">Specific Pincode Restriction (Optional)</Label>
            <Input
              value={pincodesInput}
              onChange={(e) => setPincodesInput(e.target.value)}
              placeholder="e.g. 207123, 207124 (Leave blank for all pincodes)"
              className="h-9 text-xs font-mono"
            />
          </div>

          {/* 6. Audience & Usage Limits */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Target Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Users">All Customers</SelectItem>
                  <SelectItem value="New Customers">New Customers Only</SelectItem>
                  <SelectItem value="Returning Customers">Returning Customers</SelectItem>
                  <SelectItem value="VIP Members">VIP Members Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Usage Per User</Label>
              <Select value={perUserLimit} onValueChange={(v) => setPerUserLimit(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Time / User</SelectItem>
                  <SelectItem value="2">2 Times / User</SelectItem>
                  <SelectItem value="5">5 Times / User</SelectItem>
                  <SelectItem value="999">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Total Campaign Cap</Label>
              <Input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="500"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* 7. Validity & Badge */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Valid Till Date</Label>
              <Input
                type="date"
                value={validTill}
                onChange={(e) => setValidTill(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Campaign Badge Tag</Label>
              <Input
                value={badge}
                onChange={(e) => setBadge(e.target.value.toUpperCase())}
                placeholder="e.g. HOT, FESTIVE, NEW"
                className="h-9 text-xs uppercase"
              />
            </div>
          </div>

          {/* 8. Description */}
          <div className="space-y-1">
            <Label className="text-xs font-bold">Campaign Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 50% instant discount on laundry & dry cleaning pickup."
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !code}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
          >
            {createMutation.isPending ? "Creating..." : "Launch Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   9. EDIT COUPON DIALOG (ADVANCED)
========================================================================= */
function EditCouponDialog({
  coupon,
  availableCities,
  onClose,
}: {
  coupon: Coupon;
  availableCities: any[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [minOrder, setMinOrder] = useState(String(coupon.minOrder));
  const [maxDiscount, setMaxDiscount] = useState(String(coupon.maxDiscount || 100));
  const [limit, setLimit] = useState(String(coupon.limit || 500));
  const [perUserLimit, setPerUserLimit] = useState(String(coupon.perUserLimit || 1));
  const [validTill, setValidTill] = useState(coupon.validTill || "2026-12-31");
  const [status, setStatus] = useState(coupon.status);
  const [selectedCities, setSelectedCities] = useState<string[]>(coupon.cities || []);
  const [description, setDescription] = useState(coupon.description || "");

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCoupon(coupon.id, {
        minOrder: parseFloat(minOrder) || 0,
        maxDiscount: parseFloat(maxDiscount) || 100,
        limit: parseInt(limit) || 500,
        perUserLimit: parseInt(perUserLimit) || 1,
        validTill,
        status,
        cities: selectedCities,
        description,
      }),
    onSuccess: () => {
      toast.success("Coupon updated successfully! 🎉");
      onClose();
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons", "stats"] });
    },
    onError: () => {
      toast.error("Failed to update coupon.");
    },
  });

  return (
    <Dialog open={Boolean(coupon)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white text-zinc-900 border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <span>Edit Campaign:</span>
            <span className="font-mono bg-zinc-100 text-emerald-800 px-2 py-0.5 rounded-md border border-zinc-200">
              {coupon.code}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Update discount caps, city territory targeting, validity, and operational status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Min Order Value (₹)</Label>
              <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Max Discount Cap (₹)</Label>
              <Input type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Total Redemption Cap</Label>
              <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className="h-9 text-xs" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Operational Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">● Active & Live</SelectItem>
                  <SelectItem value="Paused">⏸️ Paused</SelectItem>
                  <SelectItem value="Expired">⏳ Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Territory Targeting */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
            <Label className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
              <MapPin className="size-3.5 text-emerald-600" />
              <span>Target Cities</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {availableCities.map((c) => {
                const isSelected = selectedCities.includes(c.city);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCities((prev) =>
                        isSelected ? prev.filter((item) => item !== c.city) : [...prev, c.city]
                      );
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-zinc-700 border border-zinc-200"
                    }`}
                  >
                    <Check className={`size-3 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    <span>{c.city}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Valid Till Date</Label>
            <Input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} className="h-9 text-xs" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await deleteCoupon(coupon.id || (coupon as any)._id);
                toast.success(`Coupon ${coupon.code} deleted successfully!`);
                onClose();
                queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
                queryClient.invalidateQueries({ queryKey: ["admin", "coupons", "stats"] });
              } catch {
                toast.error("Failed to delete coupon.");
              }
            }}
            className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
          >
            <Trash2 className="size-3 mr-1" />
            <span>Delete Campaign</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   10. REDEMPTIONS AUDIT MODAL (DEEP CUSTOMER USAGE INSPECTOR)
========================================================================= */
function RedemptionsAuditModal({
  coupon,
  onClose,
}: {
  coupon: Coupon;
  onClose: () => void;
}) {
  const [modalSearch, setModalSearch] = useState("");

  const redemptionsQuery = useQuery({
    queryKey: ["admin", "coupons", coupon.id, "redemptions"],
    queryFn: () => fetchCouponRedemptions(coupon.id),
  });

  const redemptions = redemptionsQuery.data ?? [];
  const uniqueUsersCount = new Set(
    redemptions.map((r) => r.userPhone || r.userName || r.orderId).filter(Boolean)
  ).size;
  const totalSavings = redemptions.reduce((sum, r) => sum + (r.discountAmount || 0), 0);
  const totalOrderGmv = redemptions.reduce((sum, r) => sum + (r.orderAmount || 0), 0);

  const filteredRedemptions = useMemo(() => {
    if (!modalSearch.trim()) return redemptions;
    const q = modalSearch.toLowerCase().trim();
    return redemptions.filter(
      (r) =>
        r.userName?.toLowerCase().includes(q) ||
        r.userPhone?.toLowerCase().includes(q) ||
        r.orderId?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        r.pincode?.toLowerCase().includes(q)
    );
  }, [redemptions, modalSearch]);

  const handleExportRedemptions = () => {
    if (filteredRedemptions.length === 0) {
      toast.error("No redemptions to export.");
      return;
    }
    const headers = ["Customer Name", "Phone", "Order ID", "City", "Pincode", "Order Amount (INR)", "Discount Saved (INR)", "Redeemed Timestamp"];
    const rows = filteredRedemptions.map((r) =>
      [`"${r.userName}"`, `"${r.userPhone}"`, `"${r.orderId}"`, `"${r.city}"`, `"${r.pincode}"`, `"${r.orderAmount}"`, `"${r.discountAmount}"`, `"${r.redeemedAt}"`].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Coupon_${coupon.code}_Redemptions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Redemptions audit log exported! 🚀");
  };

  return (
    <Dialog open={Boolean(coupon)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto bg-white text-zinc-900 border-zinc-200">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Users className="size-4 text-emerald-600" />
              <span>Redemption Audit Trail:</span>
              <span className="font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 font-black">
                {coupon.code}
              </span>
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportRedemptions}
              className="h-8 text-xs font-bold rounded-xl border-zinc-200 hover:bg-zinc-100"
            >
              <Download className="size-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          <DialogDescription className="text-xs text-zinc-500">
            Real-time customer-level verification log for promo code <strong>{coupon.code}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-1">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center">
            <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Total Redemptions</span>
            <span className="text-lg font-black text-zinc-950 tabular-nums">{redemptions.length} Orders</span>
          </div>
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 text-center">
            <span className="text-[10px] text-purple-700 font-bold block uppercase tracking-wider">Unique Customers</span>
            <span className="text-lg font-black text-purple-950 tabular-nums">{uniqueUsersCount} Users</span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
            <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">Total Discount Disbursed</span>
            <span className="text-lg font-black text-emerald-800 tabular-nums">₹{totalSavings.toFixed(0)}</span>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 text-center">
            <span className="text-[10px] text-sky-700 font-bold block uppercase tracking-wider">Generated Order GMV</span>
            <span className="text-lg font-black text-sky-950 tabular-nums">₹{totalOrderGmv.toFixed(0)}</span>
          </div>
        </div>

        {/* Search bar inside modal */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
            <Input
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="Search by customer name, phone, order ID, city or PIN..."
              className="pl-8 h-8 text-xs bg-zinc-50/80 border-zinc-200 rounded-lg focus-visible:ring-zinc-900"
            />
          </div>
          {modalSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalSearch("")}
              className="h-8 px-2 text-xs text-zinc-500 hover:text-zinc-900"
            >
              <X className="size-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Detailed Redemptions Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-zinc-900">
              Customer Redemptions History ({filteredRedemptions.length} of {redemptions.length})
            </h4>
          </div>
          <DataTable
            loading={redemptionsQuery.isLoading}
            rows={filteredRedemptions}
            emptyMessage={modalSearch ? "No redemptions match your search criteria." : "No customer has redeemed this promo code yet."}
            columns={[
              {
                key: "customer",
                label: "Customer",
                render: (r: CouponRedemption) => (
                  <div>
                    <span className="font-bold text-xs text-zinc-900 block">{r.userName || "Customer"}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{r.userPhone || ""}</span>
                  </div>
                ),
              },
              {
                key: "orderId",
                label: "Order ID",
                render: (r: CouponRedemption) => (
                  <span className="font-mono text-xs text-zinc-900 font-bold">#{r.orderId}</span>
                ),
              },
              {
                key: "location",
                label: "City / PIN",
                render: (r: CouponRedemption) => (
                  <span className="text-xs text-zinc-600 font-medium">
                    {r.city} {r.pincode ? `(${r.pincode})` : ""}
                  </span>
                ),
              },
              {
                key: "amount",
                label: "Order Value",
                render: (r: CouponRedemption) => <span className="font-bold text-xs text-zinc-900 tabular-nums">₹{r.orderAmount}</span>,
              },
              {
                key: "discount",
                label: "Discount Saved",
                render: (r: CouponRedemption) => (
                  <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 tabular-nums">
                    -₹{r.discountAmount}
                  </span>
                ),
              },
              {
                key: "date",
                label: "Redeemed At",
                render: (r: CouponRedemption) => (
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {r.redeemedAt.slice(0, 16).replace("T", " ")}
                  </span>
                ),
              },
            ]}
          />
        </div>

        <DialogFooter className="pt-2">
          <Button size="sm" onClick={onClose} className="rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white">
            Close Audit Log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   11. REFERRAL SETTINGS COMPONENT
========================================================================= */
function ReferralSettingsForm({ initialSettings }: { initialSettings?: ReferralProgramSettings | undefined }) {
  const queryClient = useQueryClient();
  const [referrerReward, setReferrerReward] = useState(String(initialSettings?.referrerRewardAmount || 100));
  const [refereeDiscount, setRefereeDiscount] = useState(String(initialSettings?.refereeDiscountPercent || 20));
  const [minOrder, setMinOrder] = useState(String(initialSettings?.refereeMinOrderValue || 199));
  const [maxDiscount, setMaxDiscount] = useState(String(initialSettings?.refereeMaxDiscount || 100));
  const [headline, setHeadline] = useState(initialSettings?.headline || "Invite Friends, Earn ₹100");

  const updateMutation = useMutation({
    mutationFn: () =>
      updateReferralSettings({
        referrerRewardAmount: parseInt(referrerReward) || 100,
        refereeDiscountPercent: parseInt(refereeDiscount) || 20,
        refereeMinOrderValue: parseInt(minOrder) || 199,
        refereeMaxDiscount: parseInt(maxDiscount) || 100,
        headline,
      }),
    onSuccess: () => {
      toast.success("Customer referral program rules updated! 🎉");
      queryClient.invalidateQueries({ queryKey: ["admin", "referral-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "referral-stats"] });
    },
    onError: () => {
      toast.error("Failed to update referral rules.");
    },
  });

  return (
    <SectionCard
      title="Customer Referral & Growth Program Configuration"
      description="Define the wallet reward given to the inviter and the discount percentage granted to the new customer on their first booking."
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Referrer Incentive (Inviter)</span>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-emerald-950">Wallet Cash Reward (₹)</Label>
              <Input
                type="number"
                value={referrerReward}
                onChange={(e) => setReferrerReward(e.target.value)}
                className="h-10 text-sm font-black bg-white"
              />
              <p className="text-[10px] text-emerald-700">Credited directly to customer's wallet upon friend's first delivered order.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-800">Referee Discount (Invited Friend)</span>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-sky-950">First Order Discount (%)</Label>
              <Input
                type="number"
                value={refereeDiscount}
                onChange={(e) => setRefereeDiscount(e.target.value)}
                className="h-10 text-sm font-black bg-white"
              />
              <p className="text-[10px] text-sky-700">Instant discount applied on their first booking checkout.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Min Order Cart Value for Referral (₹)</Label>
            <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className="h-9 text-xs" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Max Discount Cap for Referee (₹)</Label>
            <Input type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-bold">Customer App Banner Headline</Label>
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="h-9 text-xs" />
        </div>

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white h-10 px-4"
        >
          <Save className="size-3.5 mr-1.5" />
          {updateMutation.isPending ? "Saving Rules..." : "Save Referral Program Rules"}
        </Button>
      </div>
    </SectionCard>
  );
}
