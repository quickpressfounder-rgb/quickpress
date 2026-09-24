import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  PauseCircle,
  PlayCircle,
  Search,
  X,
  Truck,
  Download,
  Phone,
  MapPin,
  FileCheck,
  FileText,
  Building2,
  User,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Bike,
  Activity,
  Navigation,
  Edit3,
  Save,
  Eye,
  RefreshCw,
  Send,
  Lock,
  RotateCcw,
  Award,
  Star,
  IndianRupee,
  Layers,
  BatteryCharging,
  Radio,
  Smartphone,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  Calendar,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { AdminRiderLiveLocation } from "../components/AdminLiveMap";
import { DataTable, DetailRow, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  fetchRider,
  fetchRiders,
  fetchRiderStats,
  fetchRider360,
  setRiderStatus,
  adjustRiderWallet,
  sendRiderNotification,
  logoutRiderSessions,
  updateRider,
  deleteRider,
  type AdminRider,
  type Rider360Data,
} from "../api/riders";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { onRealtimeEvent } from "../api/core/socket-client";

function formatTimestamp(ts?: string): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(ts);
  }
}

function formatRelativeTime(ts?: string): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/riders")({
  beforeLoad: requireAdminSession,
  head: () => adminHead("Riders Fleet 360° Management", "Real-time fleet tracking, KYC verification, shift intelligence, and dispatch operations."),
  component: RidersPage,
});

export function RidersPage() {
  const queryClient = useQueryClient();
  const ridersQuery = useQuery({ queryKey: ["admin", "riders"], queryFn: fetchRiders });
  const statsQuery = useQuery({ queryKey: ["admin", "riders", "stats"], queryFn: fetchRiderStats });

  // Real-time fleet synchronization
  useEffect(() => {
    const unsubStatus = onRealtimeEvent("rider.status_changed", (payload) => {
      console.log("[AdminRiders] Realtime status event:", payload);
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    });
    const unsubOnline = onRealtimeEvent("rider.online_status", () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
    });
    const unsubLoc = onRealtimeEvent("location.updated", () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
    });
    return () => {
      unsubStatus();
      unsubOnline();
      unsubLoc();
    };
  }, [queryClient]);

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [vehicleType, setVehicleType] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "trips" | "rating" | "wallet">("newest");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRider, setSelectedRider] = useState<AdminRider | null>(null);

  const allRiders = ridersQuery.data ?? [];
  const stats = statsQuery.data;

  const decideMutation = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
      rejectedDocuments,
    }: {
      id: string;
      action: "approve" | "reject" | "suspend" | "activate";
      reason?: string;
      rejectedDocuments?: string[];
    }) => setRiderStatus(id, action, reason, rejectedDocuments),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.action === "approve"
          ? "🎉 Rider Approved & Activated!"
          : vars.action === "reject"
          ? "❌ Application Rejected & Notification Dispatched"
          : `Rider ${vars.action}d successfully!`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: () => {
      toast.error("Failed to update rider status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRider(id),
    onSuccess: () => {
      toast.success("Rider deleted successfully!");
      setSelectedRider(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: () => {
      toast.error("Failed to delete rider.");
    },
  });

  const metrics = useMemo(() => {
    const total = stats?.totalFleet ?? allRiders.length;
    const online = stats?.onlineFleet ?? allRiders.filter((r) => r.live === "Online" || r.live === "On delivery").length;
    const busy = stats?.onDelivery ?? allRiders.filter((r) => r.live === "On delivery").length;
    const available = stats?.availableDispatch ?? Math.max(0, online - busy);
    const kycVer = stats?.kycVerified ?? allRiders.filter((r) => r.kyc === "Verified").length;
    const totalPayouts = stats?.totalEarningsPaid ?? allRiders.reduce((acc, r) => acc + (r.walletRaw || 0), 0);
    return { total, online, busy, available, kycVer, totalPayouts };
  }, [allRiders, stats]);

  const cities = useMemo(
    () => Array.from(new Set(allRiders.map((r) => r.city).filter(Boolean))),
    [allRiders],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = allRiders.filter((r) => {
      const matchesQuery =
        !q ||
        [r.id, r.name, r.phone, r.email, r.plate, r.vehicle, r.city, r.zone]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "online" && (r.live === "Online" || r.live === "On delivery")) ||
        (activeTab === "delivery" && r.live === "On delivery") ||
        (activeTab === "offline" && r.live === "Offline") ||
        (activeTab === "pending" && r.status === "Pending") ||
        (activeTab === "suspended" && r.status === "Suspended");

      const matchesCity = city === "all" || r.city.toLowerCase() === city.toLowerCase();
      const matchesVehicle = vehicleType === "all" || r.vehicle.toLowerCase().includes(vehicleType.toLowerCase());
      const matchesKyc = kycFilter === "all" || r.kyc.toLowerCase() === kycFilter.toLowerCase();

      return matchesQuery && matchesTab && matchesCity && matchesVehicle && matchesKyc;
    });

    // Sorting
    if (sortBy === "trips") {
      filtered.sort((a, b) => b.trips - a.trips);
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (sortBy === "wallet") {
      filtered.sort((a, b) => (b.walletRaw || 0) - (a.walletRaw || 0));
    } else {
      // newest
      filtered.sort((a, b) => (b.registrationTimestamp || "").localeCompare(a.registrationTimestamp || ""));
    }

    return filtered;
  }, [allRiders, query, city, vehicleType, kycFilter, activeTab, sortBy]);

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("No rider records to export.");
      return;
    }
    const headers = [
      "Rider ID",
      "Name",
      "Phone",
      "Email",
      "City",
      "Zone",
      "Vehicle",
      "Plate Number",
      "Trips Completed",
      "Rating",
      "Wallet Balance",
      "COD Cash In Hand",
      "Live State",
      "KYC Status",
      "Account Status",
      "First Registered",
      "Last Login",
    ];
    const csvRows = [headers.join(",")];
    for (const r of rows) {
      csvRows.push(
        [
          `"${r.id}"`,
          `"${r.name}"`,
          `"${r.phone}"`,
          `"${r.email}"`,
          `"${r.city}"`,
          `"${r.zone}"`,
          `"${r.vehicle}"`,
          `"${r.plate}"`,
          `"${r.trips}"`,
          `"${r.rating}"`,
          `"${r.wallet}"`,
          `"${r.codCash}"`,
          `"${r.live}"`,
          `"${r.kyc}"`,
          `"${r.status}"`,
          `"${r.registrationTimestamp}"`,
          `"${r.lastLoginTimestamp}"`,
        ].join(","),
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Fleet_Riders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Master Fleet CSV exported successfully! 🚀");
  };

  return (
    <AdminShell
      title="Riders & Delivery Fleet 360°"
      subtitle="Fleet onboarding, real-time GPS telemetry, KYC verification, shift attendance, and dispatch operations."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              ridersQuery.refetch();
              statsQuery.refetch();
              toast.success("Fleet telemetry refreshed!");
            }}
            disabled={ridersQuery.isRefetching}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${ridersQuery.isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="h-8 rounded-xl bg-zinc-900 px-3.5 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
          >
            <Download className="size-3.5 mr-1.5" />
            <span>Export Fleet CSV</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP KPI STATS SUMMARY BAR
        ========================================================================= */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
          <div
            onClick={() => {
              setActiveTab("all");
              setCity("all");
              setVehicleType("all");
              setKycFilter("all");
              setQuery("");
            }}
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
          >
            <KpiCard
              kpi={{
                id: "tot-rdr",
                label: "Total Fleet Strength",
                value: metrics.total.toLocaleString("en-IN"),
                hint: "Registered delivery partners",
                positive: true,
              }}
            />
          </div>
          <div
            onClick={() => setActiveTab("online")}
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
          >
            <KpiCard
              kpi={{
                id: "onl-rdr",
                label: "Online Right Now",
                value: metrics.online.toLocaleString("en-IN"),
                hint: `${metrics.total ? Math.round((metrics.online / metrics.total) * 100) : 0}% fleet logged in`,
                positive: true,
              }}
            />
          </div>
          <div
            onClick={() => setActiveTab("delivery")}
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
          >
            <KpiCard
              kpi={{
                id: "busy-rdr",
                label: "On Active Transit",
                value: metrics.busy.toLocaleString("en-IN"),
                hint: "Orders currently in delivery",
                positive: true,
              }}
            />
          </div>
          <div
            onClick={() => setActiveTab("online")}
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
          >
            <KpiCard
              kpi={{
                id: "avail-rdr",
                label: "Available For Dispatch",
                value: metrics.available.toLocaleString("en-IN"),
                hint: "Idle & ready for orders",
                positive: metrics.available > 0,
              }}
            />
          </div>
          <div
            onClick={() => {
              setActiveTab("all");
              setKycFilter("Verified");
            }}
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
          >
            <KpiCard
              kpi={{
                id: "kyc-rdr",
                label: "KYC Verified Fleet",
                value: metrics.kycVer.toLocaleString("en-IN"),
                hint: "License & RC approved",
                positive: true,
              }}
            />
          </div>
          <div
            onClick={() => window.location.assign("/wallet")}
            className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
          >
            <KpiCard
              kpi={{
                id: "earn-rdr",
                label: "Total Fleet Earnings",
                value: `₹${metrics.totalPayouts.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                hint: "Dispatched partner ledger →",
                positive: true,
              }}
            />
          </div>
        </div>


        {/* =========================================================================
            3. MULTI-DIMENSIONAL FILTERS & TOOLBAR
        ========================================================================= */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger value="all" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  All Fleet ({allRiders.length})
                </TabsTrigger>
                <TabsTrigger value="online" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🟢 Online ({allRiders.filter((r) => r.live === "Online" || r.live === "On delivery").length})
                </TabsTrigger>
                <TabsTrigger value="delivery" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🚴 On Delivery ({allRiders.filter((r) => r.live === "On delivery").length})
                </TabsTrigger>
                <TabsTrigger value="offline" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Offline ({allRiders.filter((r) => r.live === "Offline").length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Pending KYC ({allRiders.filter((r) => r.status === "Pending" || r.kyc === "Pending").length})
                </TabsTrigger>
                <TabsTrigger value="suspended" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Suspended ({allRiders.filter((r) => r.status === "Suspended").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <Truck className="size-4 text-emerald-600" />
              <span>Showing {rows.length} Riders matching criteria</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rider name, phone, plate, rider ID, or DL..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* City Filter */}
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Vehicle Type Filter */}
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                <SelectValue placeholder="All Vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                <SelectItem value="bike">🏍️ Motorbike</SelectItem>
                <SelectItem value="scooter">🛵 Scooter / Scooty</SelectItem>
                <SelectItem value="ev">⚡ Electric Vehicle (EV)</SelectItem>
                <SelectItem value="bicycle">🚲 Bicycle</SelectItem>
              </SelectContent>
            </Select>

            {/* Sorting Options */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">🕒 Newest Registered</SelectItem>
                <SelectItem value="trips">🏆 Most Trips Delivered</SelectItem>
                <SelectItem value="rating">★ Highest Customer Rating</SelectItem>
                <SelectItem value="wallet">💰 Highest Wallet Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SectionCard>

        {/* =========================================================================
            4. MASTER RIDERS DATA TABLE
        ========================================================================= */}
        <SectionCard
          title="Fleet Directory & Intelligence"
          description="Click or tap any rider row to open the complete 360° Profile Drawer with KYC inspection, shift history, and COD wallet ledger."
        >
          <DataTable
            loading={ridersQuery.isLoading}
            rows={rows}
            onRowClick={(rider) => setSelectedRider(rider)}
            emptyMessage="No rider accounts found matching the specified filters."
            columns={[
              {
                key: "name",
                label: "Rider Profile",
                render: (r) => (
                  <div className="flex items-center gap-3">
                    <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-900 font-black text-xs shadow-xs border border-sky-200/60">
                      {r.name.slice(0, 2).toUpperCase()}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${
                          r.live === "Online"
                            ? "bg-emerald-500 ring-2 ring-emerald-200"
                            : r.live === "On delivery"
                            ? "bg-sky-500 ring-2 ring-sky-200"
                            : "bg-zinc-300"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-zinc-900 text-xs">{r.name}</p>
                        {r.trips > 50 && <Star className="size-3 fill-amber-400 text-amber-500" />}
                        {r.resubmitted && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[9px] shadow-2xs">
                            <RotateCcw className="size-2.5 text-indigo-600 animate-spin" />
                            <span>Re-Submitted</span>
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-zinc-400 font-medium">#{r.id.slice(0, 16)}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: "phone",
                label: "Contact",
                render: (r) => (
                  <div className="text-xs">
                    <a
                      href={`tel:${r.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono font-bold text-zinc-800 flex items-center gap-1 hover:text-emerald-600 transition-colors"
                    >
                      <Phone className="size-3 text-emerald-600" />
                      {r.phone}
                    </a>
                    <p className="text-[10px] text-zinc-400 truncate max-w-[120px]">{r.email}</p>
                  </div>
                ),
              },
              {
                key: "city",
                label: "City & Operating PIN",
                render: (r: any) => (
                  <div className="text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-zinc-800">
                      <MapPin className="size-3 text-rose-500" />
                      {r.city}
                    </span>
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      {r.operatingPincodes && r.operatingPincodes.length > 0
                        ? `PIN: ${r.operatingPincodes.join(", ")}`
                        : r.pincode ? `PIN: ${r.pincode}` : (r.zone || "Territory Hub")}
                    </p>
                  </div>
                ),
              },

              {
                key: "live",
                label: "Duty State",
                render: (r) => (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      r.live === "Online"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : r.live === "On delivery"
                        ? "bg-sky-50 text-sky-700 border border-sky-200 animate-pulse"
                        : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        r.live === "Online" ? "bg-emerald-600" : r.live === "On delivery" ? "bg-sky-600" : "bg-zinc-400"
                      }`}
                    />
                    {r.live}
                  </span>
                ),
              },
              {
                key: "kyc",
                label: "KYC Status",
                render: (r) => (
                  <div className="flex flex-col gap-1 items-start">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        r.kyc === "Verified"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : r.kyc === "Rejected"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {r.kyc === "Verified" ? <CheckCircle2 className="size-3 text-emerald-600" /> : <AlertTriangle className="size-3 text-amber-600" />}
                      {r.kyc}
                    </span>
                    {r.resubmitted && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-indigo-700 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        <RotateCcw className="size-2.5 text-indigo-600" />
                        <span>Form Re-Filled</span>
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: "trips",
                label: "Trips & Rating",
                render: (r) => (
                  <div className="text-xs">
                    <span className="font-black text-zinc-900">{r.trips} trips</span>
                    <span className="ml-2 font-bold text-amber-600">★ {r.rating}</span>
                  </div>
                ),
              },
              {
                key: "wallet",
                label: "Earnings & COD",
                render: (r) => (
                  <div className="text-xs">
                    <p className="font-bold text-emerald-700">{r.wallet}</p>
                    <p className="text-[10px] text-amber-700 font-semibold">COD: {r.codCash}</p>
                  </div>
                ),
              },
              {
                key: "status",
                label: "Standing",
                render: (r) => <StatusPill value={r.status} />,
              },
              {
                key: "actions",
                label: "",
                className: "text-right",
                render: (r) => (
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-emerald-700"
                      onClick={() => setSelectedRider(r)}
                    >
                      <Eye className="size-3.5 mr-1" /> 360° Profile
                    </Button>
                    {r.status === "Pending" ? (
                      <Button
                        size="sm"
                        className="h-8 rounded-xl bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                        onClick={() => decideMutation.mutate({ id: r.id, action: "approve" })}
                      >
                        <Check className="mr-1 size-3.5" /> Approve
                      </Button>
                    ) : r.status === "Suspended" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl border-emerald-300 text-emerald-700 px-2.5 text-xs font-bold hover:bg-emerald-50"
                        onClick={() => decideMutation.mutate({ id: r.id, action: "activate" })}
                      >
                        <PlayCircle className="mr-1 size-3.5" /> Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-xl text-zinc-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 text-xs font-bold"
                        onClick={() => decideMutation.mutate({ id: r.id, action: "suspend" })}
                      >
                        <PauseCircle className="mr-1 size-3.5" /> Suspend
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Permanently Delete Rider"
                      onClick={() => {
                        if (window.confirm(`Permanently delete rider ${r.name} (#${r.id})? This cannot be undone.`)) {
                          deleteMutation.mutate(r.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </SectionCard>
      </div>

      {/* =========================================================================
          5. RIDER FULL 360° DRAWER SHEET
      ========================================================================= */}
      <Rider360Sheet
        rider={selectedRider}
        onClose={() => setSelectedRider(null)}
        onAction={(id, action, reason, rejectedDocuments) =>
          decideMutation.mutate({
            id,
            action,
            ...(reason ? { reason } : {}),
            ...(rejectedDocuments ? { rejectedDocuments } : {}),
          })
        }
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </AdminShell>
  );
}

/* =========================================================================
   6. RIDER 360° DRAWER COMPONENT (9 TABS)
========================================================================= */
const REJECTION_REASON_PRESETS = [
  { id: "dl_invalid", label: "Driving License (DL) Invalid, Expired or Unclear", docId: "dl" },
  { id: "rc_invalid", label: "Vehicle RC Details Mismatch or Blurry Document", docId: "rc" },
  { id: "aadhaar_blurry", label: "Aadhaar Card Photo or Details Unreadable", docId: "aadhaar" },
  { id: "pan_invalid", label: "PAN Card Verification Failed", docId: "pan" },
  { id: "bank_mismatch", label: "Bank Account Passbook / Cheque Details Mismatch", docId: "bank" },
  { id: "selfie_mismatch", label: "Live Profile Selfie Does Not Match ID Proof", docId: "selfie" },
  { id: "agreement_missing", label: "Partner Agreement & E-Signature Missing / Incomplete", docId: "agreement" },
  { id: "custom", label: "Other Administrative / Regulatory Reason (Custom Note)", docId: "" },
];

const REJECTABLE_DOCUMENTS = [
  { id: "dl", label: "Driving License (DL)" },
  { id: "rc", label: "Vehicle RC Certificate" },
  { id: "aadhaar", label: "Aadhaar Card" },
  { id: "pan", label: "PAN Card" },
  { id: "bank", label: "Bank Passbook / Cheque" },
  { id: "selfie", label: "Live Profile Selfie Photo" },
  { id: "agreement", label: "Partner Agreement & Signature" },
];

function Rider360Sheet({
  rider,
  onClose,
  onAction,
  onDelete,
}: {
  rider: AdminRider | null;
  onClose: () => void;
  onAction: (id: string, action: "approve" | "reject" | "suspend" | "activate", reason?: string, rejectedDocuments?: string[]) => void;
  onDelete?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  type RiderEditFormState = {
    fullName: string;
    phone: string;
    email: string;
    city: string;
    vehicleType: string;
    vehicleNumber: string;
    bankName: string;
    accountLast4: string;
    ifsc: string;
  };
  const [editForm, setEditForm] = useState<Partial<RiderEditFormState>>({});

  // Rejection Dialog state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("dl_invalid");
  const [rejectReasonNote, setRejectReasonNote] = useState("Driving License (DL) is invalid, expired, or photo is unclear. Please re-upload a valid license.");
  const [rejectedDocsSelected, setRejectedDocsSelected] = useState<string[]>(["dl"]);

  // Approve Confirm Dialog state
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  // Document Lightbox state
  const [docPreviewModal, setDocPreviewModal] = useState<{
    url?: string | undefined;
    title: string;
    type: string;
    status: string;
    rejectionReason?: string | undefined;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Wallet Adjust state
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [isCodSettlement, setIsCodSettlement] = useState(false);

  // Notification state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");

  const rider360Query = useQuery({
    queryKey: ["admin", "riders", "360", rider?.id],
    queryFn: () => fetchRider360(rider!.id),
    enabled: Boolean(rider),
  });

  const data360: Rider360Data | undefined = rider360Query.data;

  useEffect(() => {
    if (rider) {
      setEditForm({
        fullName: rider.name,
        phone: rider.phone,
        email: rider.email,
        city: rider.city,
        vehicleType: rider.vehicle,
        vehicleNumber: rider.plate,
        bankName: rider.bankName,
        accountLast4: rider.accountLast4,
        ifsc: rider.ifsc,
      });
    }
  }, [rider]);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => updateRider(rider!.id, payload),
    onSuccess: () => {
      toast.success("Rider details updated successfully! 🎉");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", rider?.id] });
    },
    onError: () => {
      toast.error("Failed to update rider profile.");
    },
  });

  const walletMutation = useMutation({
    mutationFn: ({ amount, reason, isCod }: { amount: number; reason: string; isCod: boolean }) =>
      adjustRiderWallet(rider!.id, amount, reason, isCod),
    onSuccess: (res) => {
      toast.success(`Wallet adjusted successfully! New Balance: ₹${res.newBalance.toFixed(2)}`);
      setWalletAmount("");
      setWalletReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", rider?.id] });
    },
    onError: () => {
      toast.error("Failed to adjust rider wallet.");
    },
  });

  const notifMutation = useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) => sendRiderNotification(rider!.id, title, body),
    onSuccess: () => {
      toast.success("Push notification dispatched to rider device! 📲");
      setNotifTitle("");
      setNotifBody("");
    },
    onError: () => {
      toast.error("Failed to dispatch push notification.");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutRiderSessions(rider!.id),
    onSuccess: () => {
      toast.success("All active rider app sessions invalidated!");
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", rider?.id] });
    },
    onError: () => {
      toast.error("Failed to invalidate rider sessions.");
    },
  });

  if (!rider) return null;

  return (
    <Sheet open={Boolean(rider)} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto bg-white text-zinc-900 border-zinc-200 p-0 flex flex-col">
        {/* Header Bar */}
        <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-black text-sm shadow-md">
                {rider.name.slice(0, 2).toUpperCase()}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white ${
                    rider.live === "Online"
                      ? "bg-emerald-500"
                      : rider.live === "On delivery"
                      ? "bg-sky-500 animate-ping"
                      : "bg-zinc-400"
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-base font-black text-zinc-900">{rider.name}</SheetTitle>
                  <StatusPill value={rider.status} />
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      rider.live === "Online"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : rider.live === "On delivery"
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    ● {rider.live}
                  </span>
                </div>
                <SheetDescription className="text-xs text-zinc-500 font-medium flex items-center gap-2 mt-0.5">
                  <span>ID: #{rider.id}</span>
                  <span>·</span>
                  <span>{rider.city} ({rider.zone})</span>
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isEditing ? "default" : "outline"}
                className={`h-8 rounded-xl text-xs font-bold ${
                  isEditing ? "bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                }`}
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="size-3 mr-1" />
                {isEditing ? "View 360°" : "Edit Profile"}
              </Button>
            </div>
          </div>

          {/* Quick Action Verification & Approval Bar (Clean Light Theme) */}
          <div
            className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 shadow-xs border transition-all ${
              rider.status === "Active"
                ? "bg-emerald-50/80 border-emerald-200 text-slate-900"
                : rider.status === "Suspended"
                ? "bg-rose-50/80 border-rose-200 text-slate-900"
                : "bg-amber-50/80 border-amber-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl font-bold text-sm shrink-0 border ${
                  rider.status === "Active"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : rider.status === "Suspended"
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                }`}
              >
                {rider.status === "Active" ? (
                  <ShieldCheck className="size-5" />
                ) : rider.status === "Suspended" ? (
                  <ShieldAlert className="size-5" />
                ) : (
                  <AlertTriangle className="size-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black tracking-wider uppercase text-slate-900">
                    {rider.status === "Active"
                      ? "VERIFIED FLEET CAPTAIN"
                      : (rider.resubmitted || (data360?.profile as any)?.resubmitted)
                      ? "APPLICATION RE-SUBMITTED (UPDATED KYC)"
                      : rider.status === "Suspended"
                      ? "APPLICATION REJECTED / SUSPENDED"
                      : "KYC VERIFICATION PENDING"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                      rider.kyc === "Verified"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : rider.kyc === "Rejected"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    KYC: {rider.kyc}
                  </span>
                  {(rider.resubmitted || (data360?.profile as any)?.resubmitted) && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1 shadow-2xs">
                      <RotateCcw className="size-3 text-indigo-700 animate-spin" />
                      <span>Re-Submitted by Candidate</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                  {rider.status === "Active"
                    ? "Rider account is verified and fully active for live dispatch and daily earnings."
                    : (rider.resubmitted || (data360?.profile as any)?.resubmitted)
                    ? `🔄 Captain has re-filled and updated registration details${(rider.resubmittedAt || (data360?.profile as any)?.resubmittedAt) ? ` on ${new Date(rider.resubmittedAt || (data360?.profile as any)?.resubmittedAt).toLocaleString("en-IN")}` : ""}. Previous documents or details were revised. Review documents below and approve.`
                    : data360?.kyc.rejectionReason
                    ? `Admin Reason: ${data360.kyc.rejectionReason}`
                    : "Review all uploaded KYC documents below and approve or reject with a reason note."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {rider.status === "Active" ? (
                <>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 className="size-3.5 text-emerald-700" />
                    <span>Account Active & Approved</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8.5 rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50 active:scale-95 font-bold text-xs transition-all shadow-2xs"
                    onClick={() => {
                      setSelectedPreset("custom");
                      setRejectReasonNote("Account temporarily suspended by fleet operations.");
                      setRejectedDocsSelected([]);
                      setRejectModalOpen(true);
                    }}
                  >
                    <PauseCircle className="size-3.5 mr-1 text-rose-600" />
                    Suspend
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    className="h-8.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-sm transition-all"
                    onClick={() => setApproveConfirmOpen(true)}
                  >
                    <Check className="size-3.5 mr-1" />
                    Approve Rider ✅
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8.5 rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50 active:scale-95 font-bold text-xs transition-all shadow-2xs"
                    onClick={() => {
                      setSelectedPreset("dl_invalid");
                      setRejectReasonNote("Driving License (DL) is invalid, expired, or photo is unclear. Please re-upload a valid license.");
                      setRejectedDocsSelected(["dl"]);
                      setRejectModalOpen(true);
                    }}
                  >
                    <X className="size-3.5 mr-1 text-rose-600" />
                    Reject Application ❌
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Prominent Timestamps Highlight Banner */}
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1">
                <Calendar className="size-3" />
                First Registered / Onboarded
              </span>
              <p className="font-mono text-xs font-black text-sky-950">
                {formatTimestamp(rider.registrationTimestamp)}
              </p>
              <span className="inline-block text-[10px] font-bold text-sky-600 bg-sky-100/70 px-1.5 py-0.5 rounded">
                {formatRelativeTime(rider.registrationTimestamp)}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <Activity className="size-3 text-emerald-600" />
                Last Active / Live Ping
              </span>
              <p className="font-mono text-xs font-black text-emerald-950">
                {formatTimestamp(rider.lastLoginTimestamp)}
              </p>
              <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                {formatRelativeTime(rider.lastLoginTimestamp)}
              </span>
            </div>
          </div>

          {/* Dedicated Vehicle & Registration Plate Card (360 View Exclusive) */}
          <div className="mt-3 rounded-xl border border-zinc-200 bg-gradient-to-r from-amber-500/10 via-zinc-50 to-white p-3 text-xs shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-900 border border-amber-500/30 shadow-xs">
                  <Bike className="size-5 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-900 capitalize flex items-center gap-1.5">
                      {rider.vehicle || "Motorbike (Two-Wheeler)"}
                    </span>
                    <span className="rounded-md bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                      Active Asset
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {data360?.vehicle.vehicleModel && data360.vehicle.vehicleModel !== "—"
                      ? data360.vehicle.vehicleModel
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Authentic Indian Number Plate Badge */}
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                  REGISTRATION PLATE
                </span>
                {rider.plate && rider.plate !== "—" && !rider.plate.toLowerCase().includes("pending") ? (
                  <div className="mt-0.5 flex items-center overflow-hidden rounded-md border-2 border-zinc-900 bg-amber-300 font-mono text-xs font-black tracking-wider text-zinc-950 shadow-xs">
                    <span className="bg-blue-700 px-1.5 py-0.5 text-[9px] font-black text-white">
                      IND
                    </span>
                    <span className="px-2 py-0.5 font-black">
                      {rider.plate}
                    </span>
                  </div>
                ) : (
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Verification Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-zinc-50 p-2.5 border border-zinc-100 text-center">
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Trips Done</p>
              <p className="text-xs font-black text-zinc-900">{rider.trips} Orders</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Rating</p>
              <p className="text-xs font-black text-amber-600">★ {rider.rating}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">Wallet Earnings</p>
              <p className="text-xs font-black text-emerald-600">{rider.wallet}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase">COD Cash In Hand</p>
              <p className="text-xs font-black text-amber-700">{rider.codCash}</p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 space-y-6">
          {isEditing ? (
            /* Admin Edit Form */
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-2">
                <Edit3 className="size-4 text-emerald-600" />
                <span>Edit Rider Profile & Vehicle Specs</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Full Name</label>
                  <Input
                    value={editForm.fullName || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Phone Number</label>
                  <Input
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Email Address</label>
                  <Input
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">City</label>
                  <Input
                    value={editForm.city || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Vehicle Type</label>
                  <Input
                    value={editForm.vehicleType || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, vehicleType: e.target.value }))}
                    className="h-9 text-xs bg-white"
                    placeholder="e.g. Motorbike, Scooter, EV"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Plate Number</label>
                  <Input
                    value={editForm.vehicleNumber || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
                    className="h-9 text-xs bg-white uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">Bank Name</label>
                  <Input
                    value={editForm.bankName || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, bankName: e.target.value }))}
                    className="h-9 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600">IFSC Code</label>
                  <Input
                    value={editForm.ifsc || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                    className="h-9 text-xs bg-white font-mono uppercase"
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
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
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
            /* 9 Comprehensive 360° Tabs */
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger value="overview" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="kyc" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  KYC Docs
                </TabsTrigger>
                <TabsTrigger value="trips" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Trips ({data360?.trips.length || rider.trips})
                </TabsTrigger>
                <TabsTrigger value="wallet" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Wallet & COD
                </TabsTrigger>
                <TabsTrigger value="payouts" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Bank Payouts
                </TabsTrigger>
              </TabsList>

              <div className="pt-2">
                <TabsList className="grid grid-cols-4 w-full bg-zinc-100 p-1 rounded-xl">
                  <TabsTrigger value="shifts" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    Shifts & Duty
                  </TabsTrigger>
                  <TabsTrigger value="location" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    GPS Hub
                  </TabsTrigger>
                  <TabsTrigger value="notify" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    Push Alert
                  </TabsTrigger>
                  <TabsTrigger value="security" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-xs">
                    Security & Log
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: OVERVIEW & A-TO-Z FULL PROFILE */}
              <TabsContent value="overview" className="space-y-4 pt-4">
                {/* Timestamps & Performance Summary */}
                <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                    <Clock className="size-4 text-sky-600" />
                    <span>Exact Rider Registration & Login Timestamps</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[11px] font-medium text-sky-700">First Registered / Created:</p>
                      <p className="font-mono font-bold text-sky-950 mt-0.5">{formatTimestamp(rider.registrationTimestamp)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-sky-700">Last Active / Login Timestamp:</p>
                      <p className="font-mono font-bold text-sky-950 mt-0.5">{formatTimestamp(rider.lastLoginTimestamp)}</p>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">On-Time Rate</p>
                    <p className="text-sm font-black text-emerald-600">{data360?.overview.onTimeDeliveryRate || 98.2}%</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Acceptance</p>
                    <p className="text-sm font-black text-sky-600">{data360?.overview.acceptanceRate || 99.0}%</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Avg Delivery</p>
                    <p className="text-sm font-black text-zinc-900">{data360?.overview.avgDeliveryTimeMins || 22} mins</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Distance</p>
                    <p className="text-sm font-black text-zinc-900">{data360?.overview.totalKmCovered || 48} km</p>
                  </div>
                </div>

                {/* A to Z Dossier 1: Personal & Contact Details */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <User className="size-3.5 text-indigo-600" />
                      <span>1. Personal & Contact Information (A-to-Z)</span>
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-zinc-400">UID: {rider.id}</span>
                  </div>
                  <DetailRow label="Full Name" value={<span className="font-bold text-zinc-900">{data360?.personal?.fullName || rider.name}</span>} />
                  <DetailRow label="Mobile Phone" value={<a href={`tel:${data360?.personal?.phone || rider.phone}`} className="font-mono font-bold text-emerald-700 hover:underline">{data360?.personal?.phone || rider.phone}</a>} />
                  <DetailRow label="Email Address" value={<span className="font-mono">{data360?.personal?.email || rider.email || "—"}</span>} />
                  <DetailRow label="Father / Guardian Name" value={data360?.personal?.fatherName || (rider.raw as any)?.fatherName || "—"} />
                  <DetailRow label="Date of Birth (DOB)" value={data360?.personal?.dob || (rider.raw as any)?.dob || "—"} />
                  <DetailRow label="Gender" value={data360?.personal?.gender || (rider.raw as any)?.gender || "—"} />
                  <DetailRow label="Full Residential Address" value={<span className="font-medium">{data360?.personal?.address || (rider.raw as any)?.address || "—"}</span>} />
                  <DetailRow label="City & Territory Hub" value={`${data360?.personal?.city || rider.city} (${rider.zone})`} />
                  <DetailRow label="Postal PIN Code" value={<span className="font-mono font-bold">{data360?.personal?.pincode || (rider.raw as any)?.pincode || "—"}</span>} />
                  <DetailRow label="Emergency Contact Person" value={data360?.personal?.emergencyContactName || (rider.raw as any)?.emergencyContactName || "—"} />
                  <DetailRow label="Emergency Contact Phone" value={<span className="font-mono">{data360?.personal?.emergencyContactPhone || (rider.raw as any)?.emergencyContactPhone || "—"}</span>} />
                  <DetailRow label="Registration Date" value={formatTimestamp(rider.registrationTimestamp)} />
                </div>

                {/* A to Z Dossier 2: Vehicle & Fleet Specifications */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <Truck className="size-3.5 text-amber-600" />
                      <span>2. Vehicle & Fleet Asset Specifications</span>
                    </h4>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      {data360?.vehicle.vehicleType || rider.vehicle}
                    </span>
                  </div>
                  <DetailRow label="Vehicle Category" value={data360?.vehicle.vehicleType || rider.vehicle} />
                  <DetailRow label="Vehicle Make & Model" value={data360?.vehicle.vehicleModel || "—"} />
                  <DetailRow
                    label="Registration Plate (IND)"
                    value={
                      rider.plate && rider.plate !== "—" ? (
                        <div className="inline-flex items-center overflow-hidden rounded border border-zinc-900 bg-amber-300 font-mono text-[11px] font-black tracking-wider text-zinc-950 px-1 py-0.5">
                          <span className="bg-blue-700 px-1 py-0.2 text-[8px] text-white mr-1 rounded-2xs">IND</span>
                          {rider.plate}
                        </div>
                      ) : (
                        <span className="text-amber-700 font-bold">Plate Verification Pending</span>
                      )
                    }
                  />
                  <DetailRow label="Manufacture Year" value={data360?.vehicle.vehicleYear || "—"} />
                  <DetailRow label="Fuel / Power Type" value={data360?.vehicle.fuelType || "—"} />
                  <DetailRow label="Vehicle Color" value={data360?.vehicle.vehicleColor || "—"} />
                  <DetailRow label="Driving License (DL) Number" value={<span className="font-mono font-bold text-zinc-900">{data360?.vehicle.drivingLicenseNumber || "—"}</span>} />
                  <DetailRow label="Vehicle RC Certificate No." value={<span className="font-mono font-bold text-zinc-900">{data360?.vehicle.rcNumber || "—"}</span>} />
                  <DetailRow label="Insurance Policy Valid Upto" value={data360?.vehicle.insuranceExpiry || "—"} />
                  <DetailRow label="Pollution (PUC) Valid Upto" value={data360?.vehicle.pollutionExpiry || "—"} />
                </div>

                {/* A to Z Dossier 3: Banking & Payout Account */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 mb-2 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-emerald-600" />
                    <span>3. Bank Account & Settlement Payouts</span>
                  </h4>
                  <DetailRow label="Beneficiary / Account Holder" value={<span className="font-bold text-zinc-900">{data360?.payouts.beneficiaryName || data360?.personal?.fullName || rider.name}</span>} />
                  <DetailRow label="Bank Name" value={data360?.payouts.bankName || rider.bankName || "—"} />
                  <DetailRow label="Bank Account Number" value={<span className="font-mono font-bold">{data360?.payouts.accountNumber || (rider.accountLast4 ? `•••• ${rider.accountLast4}` : "—")}</span>} />
                  <DetailRow label="IFSC Code" value={<span className="font-mono font-bold text-zinc-900">{data360?.payouts.ifsc || rider.ifsc || "—"}</span>} />
                  <DetailRow label="Account Type" value={(data360?.payouts as any)?.accountType || "—"} />
                  <DetailRow label="UPI ID / VPA" value={<span className="font-mono text-emerald-700 font-bold">{data360?.payouts.upiId || rider.upiId || "—"}</span>} />
                </div>

                {/* A to Z Dossier 4: Legal Agreement & Digital Signature */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <FileCheck className="size-3.5 text-sky-600" />
                      <span>4. Partner Legal Agreement & Digital Signature</span>
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      data360?.agreement?.isSigned
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-amber-50 text-amber-800 border-amber-300"
                    }`}>
                      {data360?.agreement?.isSigned ? "Accepted & E-Signed ✅" : "Signature Pending ⏳"}
                    </span>
                  </div>
                  <DetailRow label="Agreement Status" value={data360?.agreement?.isSigned ? "Legally Accepted & Active ✅" : "Pending Signature ⏳"} />
                  <DetailRow label="Signer Legal Name" value={data360?.agreement?.signerName || rider.name} />
                  <DetailRow label="Signing Timestamp" value={formatTimestamp(data360?.agreement?.signedAt || rider.registrationTimestamp)} />
                  <DetailRow label="Signer IP Address" value={<span className="font-mono">{data360?.agreement?.ipAddress || "—"}</span>} />
                  <DetailRow label="Device / OS Fingerprint" value={data360?.agreement?.deviceInfo || "—"} />

                  {data360?.agreement?.signatureUrl && (
                    <div className="pt-2 border-t border-zinc-200/80">
                      <p className="text-[11px] font-bold text-zinc-600 mb-1.5">E-Signature Preview:</p>
                      <div
                        onClick={() => {
                          setDocPreviewModal({
                            url: data360?.agreement?.signatureUrl,
                            title: `E-Signature — ${rider.name}`,
                            type: "Partner Legal Agreement Digital Signature",
                            status: "Verified",
                          });
                          setZoomLevel(1);
                          setRotation(0);
                        }}
                        className="cursor-pointer group relative inline-block p-2 bg-white rounded-xl border border-zinc-200 hover:border-sky-500 shadow-2xs transition-all"
                      >
                        <img
                          src={data360?.agreement?.signatureUrl}
                          alt="Digital Signature"
                          className="h-16 w-auto max-w-[200px] object-contain group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 bg-white/95 text-slate-800 border border-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to Zoom
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Governance Buttons */}
                <div className="flex gap-2 pt-2">
                  {rider.status === "Active" ? (
                    <>
                      <div className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        Rider Account Approved & Active
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold h-10 px-4"
                        onClick={() => onAction(rider.id, "suspend")}
                      >
                        <PauseCircle className="size-4 mr-1.5 text-rose-600" /> Suspend
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white h-10 shadow-sm"
                        onClick={() => setApproveConfirmOpen(true)}
                      >
                        <Check className="size-4 mr-1.5" /> Approve Rider
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold h-10"
                        onClick={() => {
                          setSelectedPreset("dl_invalid");
                          setRejectReasonNote("Driving License (DL) is invalid, expired, or photo is unclear. Please re-upload a valid license.");
                          setRejectedDocsSelected(["dl"]);
                          setRejectModalOpen(true);
                        }}
                      >
                        <X className="size-4 mr-1.5 text-rose-600" /> Reject Application
                      </Button>
                      {rider.status === "Suspended" ? (
                        <Button
                          className="rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-bold text-white h-10 px-4"
                          onClick={() => onAction(rider.id, "activate")}
                        >
                          <PlayCircle className="size-4 mr-1.5" /> Reactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="rounded-xl text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-50 h-10 px-4"
                          onClick={() => onAction(rider.id, "suspend")}
                        >
                          <PauseCircle className="size-4 mr-1.5 text-rose-600" /> Suspend
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {onDelete && (
                  <div className="pt-2 border-t border-zinc-100">
                    <Button
                      variant="ghost"
                      className="w-full rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 h-9"
                      onClick={() => {
                        if (window.confirm(`Permanently delete rider ${rider.name} (#${rider.id})? This cannot be undone.`)) {
                          onDelete(rider.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5 mr-1.5" /> Permanently Delete Rider Record
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: KYC DOCUMENTS VERIFICATION CENTER */}
              <TabsContent value="kyc" className="space-y-4 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span>KYC Verification & Inspection Desk</span>
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                      Click any document to inspect full high-resolution image, verify license dates and numbers.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {rider.status === "Active" ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs">
                        <CheckCircle2 className="size-3.5 text-emerald-700" />
                        <span>All Documents Approved</span>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                          onClick={() => setApproveConfirmOpen(true)}
                        >
                          <Check className="size-3.5 mr-1" />
                          Approve All Docs
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                          onClick={() => {
                            setSelectedPreset("dl_invalid");
                            setRejectReasonNote("Driving License (DL) is invalid, expired, or photo is unclear. Please re-upload a valid license.");
                            setRejectedDocsSelected(["dl"]);
                            setRejectModalOpen(true);
                          }}
                        >
                          <X className="size-3.5 mr-1 text-rose-600" />
                          Reject / Flag Docs
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Rejection Alert Banner if Rider is Rejected */}
                {rider.kyc === "Rejected" && (
                  <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-rose-950">
                      <AlertCircle className="size-4 text-rose-600 shrink-0" />
                      <span>Application Currently Flagged / Rejected by Admin</span>
                    </p>
                    <p className="text-rose-800 font-medium">
                      Reason: {data360?.kyc.rejectionReason || "One or more documents uploaded are invalid or unclear."}
                    </p>
                  </div>
                )}

                {(!data360?.kyc.documents || data360.kyc.documents.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center space-y-2">
                    <FileCheck className="size-8 mx-auto text-zinc-300" />
                    <p className="text-xs font-bold text-zinc-700">No KYC Documents Uploaded</p>
                    <p className="text-[11px] text-zinc-400">The delivery partner has not submitted verification documents yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3.5">
                    {data360.kyc.documents.map((doc) => {
                      const isDocRejected = doc.status === "Rejected" || (data360.kyc.rejectedDocuments || []).includes(doc.id) || (doc.id.startsWith("dl") && (data360.kyc.rejectedDocuments || []).includes("dl")) || (doc.id.startsWith("rc") && (data360.kyc.rejectedDocuments || []).includes("rc")) || (doc.id.startsWith("aadhaar") && (data360.kyc.rejectedDocuments || []).includes("aadhaar"));
                      const docStatus = isDocRejected ? "Rejected" : doc.status;

                      return (
                        <div
                          key={doc.id}
                          className={`rounded-2xl border overflow-hidden bg-white shadow-2xs transition-all ${
                            isDocRejected
                              ? "border-rose-300 ring-1 ring-rose-200"
                              : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <div
                            onClick={() => {
                              if (doc.documentUrl) {
                                setDocPreviewModal({
                                  url: doc.documentUrl,
                                  title: doc.name,
                                  type: doc.type,
                                  status: docStatus,
                                  rejectionReason: doc.rejectionReason,
                                });
                                setZoomLevel(1);
                                setRotation(0);
                              }
                            }}
                            className="h-32 bg-zinc-100 relative group overflow-hidden cursor-pointer"
                          >
                            {doc.documentUrl ? (
                              <img
                                src={doc.documentUrl}
                                alt={doc.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                                <FileCheck className="size-8 mb-1" />
                                <span className="text-[10px] font-bold">Image Preview Pending</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <span className="text-slate-900 text-xs font-bold flex items-center gap-1 bg-white/95 border border-slate-200 px-3 py-1.5 rounded-xl shadow-md">
                                <Eye className="size-3.5 text-sky-600" /> Inspect High-Res
                              </span>
                            </div>
                            <span className="absolute top-2 right-2">
                              <StatusPill value={docStatus} />
                            </span>
                          </div>

                          <div className="p-3 space-y-2">
                            <div>
                              <p className="text-xs font-black text-zinc-900">{doc.type}</p>
                              <p className="font-mono text-[10px] text-zinc-500 mt-0.5">{doc.name}</p>
                            </div>

                            {isDocRejected && (
                              <div className="p-2 bg-rose-50 rounded-xl border border-rose-200 text-[10px] text-rose-800">
                                <p className="font-bold text-rose-950 flex items-center gap-1">
                                  <AlertCircle className="size-3 text-rose-600" />
                                  <span>Flagged as Invalid</span>
                                </p>
                                <p className="mt-0.5 leading-snug">
                                  {doc.rejectionReason || data360.kyc.rejectionReason || "Document requires re-upload"}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-100">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 rounded-lg text-[10px] font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                                onClick={() => {
                                  if (doc.documentUrl) {
                                    setDocPreviewModal({
                                      url: doc.documentUrl,
                                      title: doc.name,
                                      type: doc.type,
                                      status: docStatus,
                                      rejectionReason: doc.rejectionReason,
                                    });
                                    setZoomLevel(1);
                                    setRotation(0);
                                  }
                                }}
                              >
                                <Eye className="size-3 mr-1" /> View Full
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 rounded-lg text-[10px] font-bold border-rose-200 text-rose-700 hover:bg-rose-50"
                                onClick={() => {
                                  let docKey = "dl";
                                  if (doc.id.includes("rc")) docKey = "rc";
                                  else if (doc.id.includes("aadhaar")) docKey = "aadhaar";
                                  else if (doc.id.includes("pan")) docKey = "pan";
                                  else if (doc.id.includes("selfie")) docKey = "selfie";
                                  else if (doc.id.includes("bank") || doc.id.includes("cheque") || doc.id.includes("passbook")) docKey = "bank";
                                  else if (doc.id.includes("agreement") || doc.id.includes("signature")) docKey = "agreement";

                                  setSelectedPreset(docKey === "dl" ? "dl_invalid" : docKey === "rc" ? "rc_invalid" : docKey === "aadhaar" ? "aadhaar_blurry" : "custom");
                                  setRejectReasonNote(`${doc.type} is invalid or unclear. Please re-upload a clear and valid document.`);
                                  setRejectedDocsSelected([docKey]);
                                  setRejectModalOpen(true);
                                }}
                              >
                                <X className="size-3 mr-0.5 text-rose-600" /> Flag
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: TRIPS & DELIVERIES */}
              <TabsContent value="trips" className="space-y-3 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">Order Delivery Ledger</h4>
                <div className="rounded-2xl border border-zinc-200 overflow-hidden">
                  <div className="divide-y divide-zinc-100">
                    {(data360?.trips || []).map((trip) => (
                      <div key={trip.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50/80 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900">{trip.orderCode}</span>
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">{trip.service}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Drop: {trip.dropAddress}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">+₹{trip.earning.toFixed(2)}</p>
                          <span className="text-[10px] text-amber-600 font-bold">★ {trip.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                    {(!data360?.trips || data360.trips.length === 0) && (
                      <div className="p-6 text-center text-xs text-zinc-400">No trips recorded yet.</div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: WALLET & COD */}
              <TabsContent value="wallet" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="text-[11px] font-bold text-emerald-800 uppercase">Live Earnings Balance</p>
                    <p className="text-xl font-black text-emerald-950 mt-1">{rider.wallet}</p>
                    <p className="text-[10px] text-emerald-700 mt-1">Available for weekly payout</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-[11px] font-bold text-amber-800 uppercase">COD Cash in Hand</p>
                    <p className="text-xl font-black text-amber-950 mt-1">{rider.codCash}</p>
                    <p className="text-[10px] text-amber-700 mt-1">To be settled by rider</p>
                  </div>
                </div>

                {/* Wallet Adjustment Form */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <IndianRupee className="size-4 text-emerald-600" />
                    <span>Admin Wallet Credit / Debit & COD Settlement</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-600">Adjustment Amount (₹)</label>
                      <Input
                        type="number"
                        placeholder="e.g. 500 or -200"
                        value={walletAmount}
                        onChange={(e) => setWalletAmount(e.target.value)}
                        className="h-9 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-600">Reason</label>
                      <Input
                        placeholder="e.g. Bonus incentive / Penalty / COD Clear"
                        value={walletReason}
                        onChange={(e) => setWalletReason(e.target.value)}
                        className="h-9 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="codCheck"
                      checked={isCodSettlement}
                      onChange={(e) => setIsCodSettlement(e.target.checked)}
                      className="size-4 accent-emerald-600 rounded"
                    />
                    <label htmlFor="codCheck" className="text-xs font-medium text-zinc-700 cursor-pointer">
                      Settle Cash-on-Delivery (COD) cash in hand
                    </label>
                  </div>

                  <Button
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold h-9 text-white"
                    disabled={!walletAmount || walletMutation.isPending}
                    onClick={() =>
                      walletMutation.mutate({
                        amount: parseFloat(walletAmount),
                        reason: walletReason || "Admin Manual Adjustment",
                        isCod: isCodSettlement,
                      })
                    }
                  >
                    {walletMutation.isPending ? "Processing..." : "Execute Adjustment"}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 5: BANK & PAYOUTS */}
              <TabsContent value="payouts" className="space-y-4 pt-4">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">BENEFICIARY BANK ACCOUNT</h4>
                  <DetailRow label="Bank Name" value={rider.bankName} />
                  <DetailRow label="Account Number" value={rider.accountLast4 !== "—" ? `•••• •••• ${rider.accountLast4}` : "—"} />
                  <DetailRow label="IFSC Code" value={<span className="font-mono font-bold">{rider.ifsc}</span>} />
                  <DetailRow label="UPI ID" value={<span className="font-mono font-bold text-sky-700">{rider.upiId}</span>} />
                </div>

                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">Recent Payout Settlements</h4>
                <div className="rounded-2xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                  {(!data360?.payouts.payoutHistory || data360.payouts.payoutHistory.length === 0) ? (
                    <div className="p-6 text-center text-xs text-zinc-400">No bank settlements recorded yet.</div>
                  ) : (
                    data360.payouts.payoutHistory.map((p) => (
                      <div key={p.id} className="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-zinc-900">₹{p.amount.toFixed(2)}</p>
                          <p className="font-mono text-[10px] text-zinc-400">UTR: {p.utrNumber}</p>
                        </div>
                        <StatusPill value={p.status} />
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TAB 6: SHIFTS & ATTENDANCE */}
              <TabsContent value="shifts" className="space-y-4 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">Duty Shift Logs</h4>
                <div className="rounded-2xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                  {(!data360?.shifts || data360.shifts.length === 0) ? (
                    <div className="p-6 text-center text-xs text-zinc-400">No duty shifts recorded yet.</div>
                  ) : (
                    data360.shifts.map((s, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-zinc-900">{s.date}</p>
                          <p className="text-[10px] text-zinc-500">
                            {s.loginAt} — {s.logoutAt} ({s.onlineHours} hrs)
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold border border-emerald-200">
                          {s.ordersCompleted} Orders Completed
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* TAB 7: LIVE LOCATION */}
              <TabsContent value="location" className="space-y-4 pt-4">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2 text-xs">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">Assigned Operational Hub</h4>
                  <p className="font-bold text-zinc-900 flex items-center gap-1.5">
                    <MapPin className="size-4 text-emerald-600" />
                    <span>{data360?.overview.assignedHub || "QuickPress Kasganj Main Hub"}</span>
                  </p>
                  <p className="text-zinc-500">Service Coverage: {data360?.overview.serviceZone || "Kasganj City Center (0-12 km)"}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <Navigation className="size-4 text-sky-600" />
                    <span>Real-Time Live GPS Fix</span>
                  </h4>
                  <AdminRiderLiveLocation riderId={rider.id} />
                </div>
              </TabsContent>

              {/* TAB 8: PUSH NOTIFICATION */}
              <TabsContent value="notify" className="space-y-4 pt-4">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                    <Send className="size-4 text-sky-600" />
                    <span>Send Direct Push Notification to Rider App</span>
                  </h4>

                  <div className="space-y-2">
                    <Input
                      placeholder="Notification Title (e.g. High Demand Surge in Kasganj)"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="h-9 text-xs bg-white"
                    />
                    <textarea
                      placeholder="Notification Message Body..."
                      rows={3}
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-white p-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-sky-600"
                    />
                  </div>

                  <Button
                    className="w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-bold h-9 text-white"
                    disabled={!notifTitle || !notifBody || notifMutation.isPending}
                    onClick={() => notifMutation.mutate({ title: notifTitle, body: notifBody })}
                  >
                    <Send className="size-3.5 mr-1.5" />
                    {notifMutation.isPending ? "Sending..." : "Dispatch Push Alert"}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 9: SECURITY & SESSIONS */}
              <TabsContent value="security" className="space-y-4 pt-4">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">SECURITY & DEVICE AUDIT</h4>
                  <DetailRow label="Registered On" value={rider.registrationTimestamp} />
                  <DetailRow label="Last Active Timestamp" value={rider.lastLoginTimestamp} />
                  <DetailRow label="Device Model" value={data360?.security.deviceInfo || "—"} />
                  <DetailRow label="App Build" value={data360?.security.appVersion || "QuickPress Captain v2.4"} />
                  <DetailRow label="IP Address" value={<span className="font-mono">{data360?.security.ipAddress || "—"}</span>} />
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold h-10"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <Lock className="size-4 mr-1.5" />
                    {logoutMutation.isPending ? "Logging out..." : "Force Logout All Active Devices"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* =========================================================================
            REJECTION MODAL DIALOG WITH REASON & SPECIFIC DOCUMENT SELECTION
        ========================================================================= */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent className="max-w-md rounded-3xl bg-white text-zinc-900 border border-zinc-200 p-6 space-y-4 shadow-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <ShieldAlert className="size-4" />
                </div>
                <DialogTitle className="text-base font-black text-zinc-900">
                  Reject Rider KYC Application
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-zinc-500 font-medium">
                Rejecting will mark the specified documents as invalid, log the reason, and notify Captain <strong>{rider.name}</strong> on their verification screen.
              </DialogDescription>
            </DialogHeader>

            {/* Quick Reason Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-600">
                1. Select Common Rejection Reason:
              </label>
              <Select
                value={selectedPreset}
                onValueChange={(val) => {
                  setSelectedPreset(val);
                  const p = REJECTION_REASON_PRESETS.find((x) => x.id === val);
                  if (p) {
                    if (p.id === "custom") {
                      setRejectReasonNote("");
                    } else {
                      setRejectReasonNote(`${p.label}. Please re-upload a clear and valid document.`);
                    }
                    if (p.docId) {
                      setRejectedDocsSelected((prev) => (prev.includes(p.docId) ? prev : [...prev, p.docId]));
                    }
                  }
                }}
              >
                <SelectTrigger className="h-9 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                  <SelectValue placeholder="Choose rejection reason preset..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASON_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Flag Specific Documents */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-600">
                2. Flag Specific Invalid Document(s) to Re-Upload:
              </label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2.5 rounded-2xl border border-zinc-200">
                {REJECTABLE_DOCUMENTS.map((doc) => {
                  const isChecked = rejectedDocsSelected.includes(doc.id);
                  return (
                    <label
                      key={doc.id}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        isChecked
                          ? "bg-rose-50 border-rose-300 text-rose-900"
                          : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setRejectedDocsSelected((prev) => [...prev, doc.id]);
                          } else {
                            setRejectedDocsSelected((prev) => prev.filter((x) => x !== doc.id));
                          }
                        }}
                      />
                      <span className="truncate">{doc.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Rejection Note Textarea */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-600">
                3. Detailed Note / Instructions for Captain:
              </label>
              <Textarea
                rows={3}
                value={rejectReasonNote}
                onChange={(e) => setRejectReasonNote(e.target.value)}
                placeholder="Explain clearly why this application is rejected and how the rider can correct it..."
                className="text-xs rounded-xl bg-white border-zinc-200 resize-none"
              />
              <p className="text-[10px] text-zinc-400 font-medium">
                This exact note will be highlighted in red on the rider's verification screen.
              </p>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl text-xs font-bold h-10 border-zinc-200"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-xs font-bold h-10 text-white shadow-sm"
                onClick={() => {
                  const finalReason =
                    rejectReasonNote.trim() ||
                    REJECTION_REASON_PRESETS.find((x) => x.id === selectedPreset)?.label ||
                    "KYC verification failed.";
                  onAction(rider.id, "reject", finalReason, rejectedDocsSelected);
                  setRejectModalOpen(false);
                }}
              >
                <X className="size-3.5 mr-1" />
                Submit Rejection ❌
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* =========================================================================
            APPROVE CONFIRMATION DIALOG
        ========================================================================= */}
        <Dialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
          <DialogContent className="max-w-md rounded-3xl bg-white text-zinc-900 border border-zinc-200 p-6 space-y-4 shadow-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="size-4" />
                </div>
                <DialogTitle className="text-base font-black text-zinc-900">
                  Approve & Activate QuickPress Captain
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-zinc-500 font-medium leading-relaxed">
                Are you sure you want to approve <strong>{rider.name}</strong> (#{rider.id})?
                This action will mark all KYC documents as verified, activate the rider profile, and immediately unlock live order dispatch and earnings for the Captain.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                <Sparkles className="size-3.5 text-emerald-600" />
                <span>Instant Real-Time Unlock</span>
              </p>
              <p className="text-[11px] text-emerald-800">
                The rider's verification screen will instantly update via realtime socket to grant access to the Captain Dashboard.
              </p>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl text-xs font-bold h-10 border-zinc-200"
                onClick={() => setApproveConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold h-10 text-white shadow-sm"
                onClick={() => {
                  onAction(rider.id, "approve");
                  setApproveConfirmOpen(false);
                }}
              >
                <Check className="size-3.5 mr-1" />
                Confirm & Approve ✅
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* =========================================================================
            DOCUMENT LIGHTBOX & INSPECTION MODAL
        ========================================================================= */}
        <Dialog
          open={Boolean(docPreviewModal)}
          onOpenChange={(open) => {
            if (!open) {
              setDocPreviewModal(null);
              setZoomLevel(1);
              setRotation(0);
            }
          }}
        >
          <DialogContent className="max-w-3xl rounded-3xl bg-white text-slate-900 border border-slate-200 p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="size-4 text-sky-600" />
                  <span>{docPreviewModal?.title}</span>
                  <StatusPill value={docPreviewModal?.status || "Pending"} />
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  {docPreviewModal?.type} · Captain: {rider.name}
                </DialogDescription>
              </div>

              {/* Zoom & Rotate Controls */}
              <div className="flex items-center gap-1.5 mr-6">
                <Button
                  size="sm"
                  variant="outline"
                  className="size-8 p-0 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs font-bold"
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                  title="Zoom Out"
                >
                  -
                </Button>
                <span className="text-[10px] font-mono text-slate-600 font-bold px-1">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="size-8 p-0 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs font-bold"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                  title="Zoom In"
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="size-8 p-0 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate 90°"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
                {docPreviewModal?.url && (
                  <a
                    href={docPreviewModal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs"
                    title="Open original in new window"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </DialogHeader>

            {/* Document Image Viewer */}
            <div className="flex-1 overflow-auto bg-slate-100/70 p-6 flex items-center justify-center min-h-[350px]">
              {docPreviewModal?.url ? (
                <div
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease-out",
                  }}
                  className="max-w-full max-h-[60vh] flex items-center justify-center"
                >
                  <img
                    src={docPreviewModal.url}
                    alt={docPreviewModal.title}
                    className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
                  />
                </div>
              ) : (
                <div className="text-center text-slate-400 space-y-2">
                  <FileText className="size-12 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Document File Not Uploaded</p>
                </div>
              )}
            </div>

            {/* Rejection Note Footer if Rejected */}
            {docPreviewModal?.rejectionReason && (
              <div className="p-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-900 flex items-center gap-2">
                <AlertCircle className="size-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Rejection Note: </strong>
                  {docPreviewModal.rejectionReason}
                </span>
              </div>
            )}

            <DialogFooter className="p-3 border-t border-slate-200 flex justify-between items-center bg-slate-50">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold shadow-2xs"
                onClick={() => {
                  let docKey = "dl";
                  if (docPreviewModal?.title.toLowerCase().includes("rc")) docKey = "rc";
                  else if (docPreviewModal?.title.toLowerCase().includes("aadhaar")) docKey = "aadhaar";
                  else if (docPreviewModal?.title.toLowerCase().includes("pan")) docKey = "pan";
                  else if (docPreviewModal?.title.toLowerCase().includes("selfie")) docKey = "selfie";
                  else if (docPreviewModal?.title.toLowerCase().includes("bank")) docKey = "bank";
                  else if (docPreviewModal?.title.toLowerCase().includes("agreement") || docPreviewModal?.title.toLowerCase().includes("signature")) docKey = "agreement";

                  setSelectedPreset(docKey === "dl" ? "dl_invalid" : docKey === "rc" ? "rc_invalid" : docKey === "aadhaar" ? "aadhaar_blurry" : "custom");
                  setRejectReasonNote(`${docPreviewModal?.title || "Document"} is invalid or unclear. Please re-upload a clear and valid document.`);
                  setRejectedDocsSelected([docKey]);
                  setDocPreviewModal(null);
                  setRejectModalOpen(true);
                }}
              >
                <X className="size-3 mr-1 text-rose-600" /> Flag / Reject This Document
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                onClick={() => setDocPreviewModal(null)}
              >
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
