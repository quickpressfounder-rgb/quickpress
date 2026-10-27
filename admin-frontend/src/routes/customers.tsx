import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Users,
  ShoppingBag,
  Wallet,
  TrendingUp,
  Download,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Award,
  Ticket,
  FileText,
  Bell,
  Activity,
  Tag,
  ShieldAlert,
  Send,
  Plus,
  RefreshCw,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Globe,
  LogOut,
  Eye,
  Shield,
  Star,
  Receipt,
  UserCheck,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Table,
  LayoutGrid,
  IndianRupee,
  UserPlus,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Printer,
  FileCheck2,
  BarChart3,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { DataTable, DetailRow, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  fetchCustomer360,
  fetchCustomerStats,
  fetchCustomers,
  setCustomerBlocked,
  adjustCustomerWallet,
  adjustCustomerLoyalty,
  addCustomerNote,
  updateCustomerTags,
  sendCustomerNotification,
  logoutCustomerSessions,
  type AdminCustomer,
  type Customer360Data,
} from "../api/customers";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { cn } from "../shared/lib/utils";

export const Route = createFileRoute("/customers")({
  beforeLoad: requireAdminSession,
  head: () => adminHead("Customers Intelligence Hub", "Manage QuickPress customer directory, login timestamps, wallets, and 360 profiles."),
  component: CustomersPage,
});

function formatTimestamp(ts?: string): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts).slice(0, 19).replace("T", " ");
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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

function isDateToday(ts?: string): boolean {
  if (!ts) return false;
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  } catch {
    return false;
  }
}

export function CustomersPage() {
  const queryClient = useQueryClient();
  const statsQuery = useQuery({ queryKey: ["admin", "customers", "stats"], queryFn: fetchCustomerStats });
  const customers = useQuery({ queryKey: ["admin", "customers"], queryFn: fetchCustomers });

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [segment, setSegment] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "spend" | "wallet" | "orders" | "name" | "active">("newest");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selected, setSelected] = useState<AdminCustomer | null>(null);
  const [showReportsEngine, setShowReportsEngine] = useState(false);
  const [reportDateFilter, setReportDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [dossierCustomer, setDossierCustomer] = useState<AdminCustomer | null>(null);

  const allCustomers = customers.data ?? [];
  const stats = statsQuery.data;

  // Real Supabase Telemetry aggregations
  const telemetry = useMemo(() => {
    const total = stats?.totalCustomers ?? allCustomers.length;
    const todaySignups = stats?.newCustomersToday ?? allCustomers.filter((c) => isDateToday(c.registrationTimestamp)).length;
    const todaySignupsPercent = total > 0 ? ((todaySignups / total) * 100).toFixed(1) : "0.0";
    const repeat = stats?.repeatCustomers ?? allCustomers.filter((c) => c.orders >= 2).length;
    const repeatPercent = total > 0 ? ((repeat / total) * 100).toFixed(1) : "0.0";
    const vip = stats?.vipCustomers ?? stats?.membershipCustomers ?? allCustomers.filter((c) => c.isVip || (c.membership && c.membership !== "Standard")).length;
    const vipPercent = total > 0 ? ((vip / total) * 100).toFixed(1) : "0.0";
    const totalGmv = stats?.totalRevenue ?? allCustomers.reduce((acc, c) => acc + (c.spendRaw || 0), 0);
    const aov = stats?.averageOrderValue ?? (total > 0 ? Math.round(totalGmv / Math.max(1, total)) : 0);
    const totalWalletFloat = allCustomers.reduce((acc, c) => acc + (c.walletRaw || 0), 0);

    return {
      total,
      todaySignups,
      todaySignupsPercent,
      repeat,
      repeatPercent,
      vip,
      vipPercent,
      totalGmv,
      aov,
      totalWalletFloat,
    };
  }, [allCustomers, stats]);

  // Area-wise / City-wise Analytics breakdown
  const areaBreakdown = useMemo(() => {
    const map = new Map<string, { city: string; count: number; active: number; repeat: number; gmv: number }>();
    allCustomers.forEach((c) => {
      const cityName = c.city || "Unassigned / Online";
      const existing = map.get(cityName) || { city: cityName, count: 0, active: 0, repeat: 0, gmv: 0 };
      existing.count += 1;
      if (c.status === "Active") existing.active += 1;
      if (c.orders >= 2) existing.repeat += 1;
      existing.gmv += c.spendRaw || 0;
      map.set(cityName, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allCustomers]);

  // Date-wise Acquisition breakdown
  const dateWiseBreakdown = useMemo(() => {
    const map = new Map<string, { date: string; signups: number; orders: number; gmv: number }>();
    allCustomers.forEach((c) => {
      const d = (c.registrationTimestamp || c.joined || "").slice(0, 10) || "Earlier";
      const existing = map.get(d) || { date: d, signups: 0, orders: 0, gmv: 0 };
      existing.signups += 1;
      existing.orders += c.orders || 0;
      existing.gmv += c.spendRaw || 0;
      map.set(d, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [allCustomers]);

  const blockMutation = useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) => setCustomerBlocked(id, blocked),
    onSuccess: (_data, vars) => {
      toast.success(vars.blocked ? "Customer blocked from placing orders." : "Customer account unblocked.");
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers", "stats"] });
      if (selected && selected.id === vars.id) {
        setSelected((prev) => (prev ? { ...prev, status: vars.blocked ? "Blocked" : "Active" } : null));
      }
    },
    onError: () => {
      toast.error("Failed to update customer status.");
    },
  });

  const cities = useMemo(
    () => Array.from(new Set(allCustomers.map((c) => c.city).filter(Boolean))),
    [allCustomers],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = allCustomers.filter((c) => {
      if (!c) return false;
      const matchesQuery =
        !q ||
        [c.id, c.name, c.phone, c.email, c.city, c.primaryAddress, c.zone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesTab =
        statusTab === "all" ||
        (statusTab === "active" && c.status === "Active") ||
        (statusTab === "blocked" && c.status === "Blocked");
      const matchesCity = city === "all" || String(c.city || "").toLowerCase() === city.toLowerCase();
      const matchesSegment =
        segment === "all" ||
        (segment === "today" && (isDateToday(c.registrationTimestamp) || isDateToday(c.lastLoginTimestamp))) ||
        (segment === "repeat" && c.orders >= 2) ||
        (segment === "vip_only" && (c.isVip || (c.membership && c.membership !== "Standard"))) ||
        (segment === "high_spend" && c.spendRaw >= 500) ||
        (segment === "inactive" && c.orders === 0);
      return matchesQuery && matchesTab && matchesCity && matchesSegment;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "spend") return b.spendRaw - a.spendRaw;
      if (sortBy === "wallet") return b.walletRaw - a.walletRaw;
      if (sortBy === "orders") return b.orders - a.orders;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "active") return String(b.lastLoginTimestamp).localeCompare(String(a.lastLoginTimestamp));
      return String(b.registrationTimestamp).localeCompare(String(a.registrationTimestamp));
    });
  }, [allCustomers, query, city, statusTab, segment, sortBy]);

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("No customers to export.");
      return;
    }
    const headers = [
      "Customer ID",
      "Full Name",
      "Phone",
      "Email",
      "City",
      "Zone",
      "Total Orders",
      "Completed Orders",
      "Cancelled Orders",
      "Total Spend (INR)",
      "Wallet Balance (INR)",
      "Loyalty Points",
      "Loyalty Tier",
      "VIP Membership",
      "First Login / Registered Timestamp",
      "Last Active / Login Timestamp",
      "Status",
      "Primary Address",
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
          `"${r.orders}"`,
          `"${r.completedOrders}"`,
          `"${r.cancelledOrders}"`,
          `"${r.spendRaw}"`,
          `"${r.walletRaw}"`,
          `"${r.loyaltyPoints}"`,
          `"${r.loyaltyLevel}"`,
          `"${r.membership}"`,
          `"${r.registrationTimestamp}"`,
          `"${r.lastLoginTimestamp}"`,
          `"${r.status}"`,
          `"${r.primaryAddress.replace(/"/g, '""')}"`,
        ].join(","),
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Customers_Master_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Complete Customers CSV exported successfully!");
  };

  const handleExportCustomerDossier = (cust: AdminCustomer) => {
    const content = [
      `========================================================================`,
      `          QUICKPRESS OPERATIONS — CUSTOMER 360° DOSSIER REPORT          `,
      `========================================================================`,
      `Report Generated At : ${new Date().toLocaleString("en-IN")}`,
      `Security Seal       : QP-AUDIT-${cust.id.slice(0, 8).toUpperCase()}`,
      `------------------------------------------------------------------------`,
      `1. CUSTOMER IDENTITY & CONTACT`,
      `------------------------------------------------------------------------`,
      `Customer Name       : ${cust.name}`,
      `Customer ID         : ${cust.id}`,
      `Primary Phone       : ${cust.phone}`,
      `Email Address       : ${cust.email}`,
      `City & Operational  : ${cust.city || "—"} (${cust.zone || "Central Zone"})`,
      `Account Status      : ${cust.status}`,
      `VIP Tier            : ${cust.membership || (cust.isVip ? "Gold VIP" : "Standard")}`,
      `Primary Address     : ${cust.primaryAddress}`,
      ``,
      `------------------------------------------------------------------------`,
      `2. FINANCIAL & TRANSACTIONAL METRICS`,
      `------------------------------------------------------------------------`,
      `Total Spend GMV     : ₹${cust.spendRaw.toLocaleString("en-IN")}`,
      `Total Bookings      : ${cust.orders} Orders`,
      `Completed Orders    : ${cust.completedOrders}`,
      `Cancelled Orders    : ${cust.cancelledOrders}`,
      `Stored Wallet Float : ₹${cust.walletRaw.toLocaleString("en-IN")}`,
      `Loyalty Points      : ${cust.loyaltyPoints} Pts (${cust.loyaltyLevel})`,
      ``,
      `------------------------------------------------------------------------`,
      `3. TIMESTAMPS & SECURITY AUDIT TRAIL`,
      `------------------------------------------------------------------------`,
      `Account Registered  : ${formatTimestamp(cust.registrationTimestamp)}`,
      `Last Login / Active : ${formatTimestamp(cust.lastLoginTimestamp)}`,
      `Device Profile      : ${cust.deviceInfo || "Mobile App"}`,
      `========================================================================`,
      `End of Certified Customer 360° Dossier. Confidential Admin Record.`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Customer_Dossier_${cust.name.replace(/\s+/g, "_")}_${cust.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Customer 360° Dossier downloaded successfully!");
  };

  return (
    <AdminShell
      title={
        selected
          ? `${selected.name} — Customer 360° Profile`
          : "Customer Control & 360° Intelligence Center"
      }
      subtitle={
        selected
          ? `Complete audit dossier, wallet ledger, loyalty points, saved addresses & order history for ${selected.name}.`
          : "Real-time directory of customer accounts, first login timestamps, lifetime transactions, wallet balance & governance."
      }
      actions={
        <div className="flex items-center gap-2">
          {selected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(null)}
                className="h-8 gap-1.5 rounded-xl border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-100 shadow-xs"
              >
                <ArrowLeft className="size-3.5 text-emerald-600" />
                <span>Back to Directory</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setDossierCustomer(selected)}
                className="h-8 gap-1.5 rounded-xl bg-zinc-900 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
              >
                <Printer className="size-3.5 text-emerald-400" />
                <span>Export PDF Dossier</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReportsEngine((prev) => !prev)}
                className={`h-8 gap-1.5 rounded-xl border-zinc-200 text-xs font-bold transition-all shadow-xs ${
                  showReportsEngine
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : "bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <BarChart3 className="size-3.5 text-emerald-600" />
                <span>{showReportsEngine ? "Hide Reports Engine" : "Reports & Intelligence"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
                  queryClient.invalidateQueries({ queryKey: ["admin", "customers", "stats"] });
                  toast.success("Customer list refreshed from live database.");
                }}
                className="h-8 gap-1.5 rounded-xl border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-100"
              >
                <RefreshCw className="size-3.5 text-zinc-500" />
                <span>Refresh</span>
              </Button>
              <Button
                size="sm"
                onClick={handleExportCSV}
                className="h-8 gap-1.5 rounded-xl bg-zinc-900 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
              >
                <Download className="size-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* =========================================================================
          VIEW A: DEDICATED FULL-PAGE CUSTOMER 360 PROFILE VIEW
      ========================================================================= */}
      {selected ? (
        <Customer360FullPageView
          customer={selected}
          onBack={() => setSelected(null)}
          onExportDossier={() => setDossierCustomer(selected)}
          onToggleBlock={(id, blocked) => blockMutation.mutate({ id, blocked })}
        />
      ) : (
        /* =========================================================================
            VIEW B: DIRECTORY & REPORTS VIEW
        ========================================================================= */
        <div className="space-y-5">
          {/* =========================================================================
              CUSTOMER REPORTS & ANALYTICS ENGINE (EXPANDABLE)
          ========================================================================= */}
          {showReportsEngine && (
            <div className="space-y-4 rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 p-5 shadow-sm animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <BarChart3 className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-zinc-950">Customer Intelligence & Reports Engine</h3>
                    <p className="text-xs text-zinc-500 font-medium">Area-wise breakdown, date-wise registrations, and cohort telemetry.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.print();
                    }}
                    className="h-8 gap-1.5 text-xs font-bold rounded-xl border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 shadow-xs"
                  >
                    <Printer className="size-3.5 text-emerald-600" />
                    <span>Print Reports Summary</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExportCSV}
                    className="h-8 gap-1.5 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs"
                  >
                    <Download className="size-3.5" />
                    <span>Export Full Data CSV</span>
                  </Button>
                </div>
              </div>

              {/* 3-Way Reports Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Area-Wise / City Distribution Breakdown */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-emerald-600" />
                      Area-Wise & City Distribution Report
                    </h4>
                    <span className="text-[11px] font-bold text-zinc-400">{areaBreakdown.length} Zones</span>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-100 text-zinc-400 font-black text-[10px] uppercase">
                          <th className="pb-2">City / Area</th>
                          <th className="pb-2 text-right">Customers</th>
                          <th className="pb-2 text-right">Active</th>
                          <th className="pb-2 text-right">Repeat (2+)</th>
                          <th className="pb-2 text-right">Total GMV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 font-medium">
                        {areaBreakdown.map((a) => (
                          <tr key={a.city} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-2 font-bold text-zinc-900">{a.city}</td>
                            <td className="py-2 text-right font-black text-zinc-950 tabular-nums">{a.count}</td>
                            <td className="py-2 text-right font-bold text-emerald-700 tabular-nums">{a.active}</td>
                            <td className="py-2 text-right font-bold text-zinc-600 tabular-nums">{a.repeat}</td>
                            <td className="py-2 text-right font-black text-zinc-900 tabular-nums">₹{a.gmv.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Date-Wise Acquisition & Growth Report */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-sky-600" />
                      Date-Wise Registration & Growth Report
                    </h4>
                    <span className="text-[11px] font-bold text-zinc-400">{dateWiseBreakdown.length} Recorded Dates</span>
                  </div>
                  <div className="mt-3 max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-100 text-zinc-400 font-black text-[10px] uppercase">
                          <th className="pb-2">Date</th>
                          <th className="pb-2 text-right">Signups</th>
                          <th className="pb-2 text-right">Orders</th>
                          <th className="pb-2 text-right">Total GMV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 font-medium">
                        {dateWiseBreakdown.map((d) => (
                          <tr key={d.date} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-2 font-mono text-zinc-700 font-bold">{d.date}</td>
                            <td className="py-2 text-right font-black text-emerald-700 tabular-nums">+{d.signups}</td>
                            <td className="py-2 text-right font-bold text-zinc-800 tabular-nums">{d.orders}</td>
                            <td className="py-2 text-right font-black text-zinc-950 tabular-nums">₹{d.gmv.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TELEMETRY CARDS (PURE WHITE, HIGH CONTRAST)
          ========================================================================= */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div
              onClick={() => { setSegment("all"); setStatusTab("all"); }}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Total Accounts</span>
                <Users className="size-4 text-zinc-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1 tabular-nums">
                {telemetry.total.toLocaleString("en-IN")}
              </div>
              <p className="text-[11px] font-bold text-zinc-500 mt-0.5 truncate">
                {allCustomers.filter((c) => c.status === "Active").length} active accounts
              </p>
            </div>

            <div
              onClick={() => setSegment("today")}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Today Signups</span>
                <UserPlus className="size-4 text-zinc-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1 tabular-nums">
                {telemetry.todaySignups}
              </div>
              <p className="text-[11px] font-bold text-emerald-700 mt-0.5 truncate">
                {telemetry.todaySignupsPercent}% of total base
              </p>
            </div>

            <div
              onClick={() => setSegment("repeat")}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Repeat Buyers</span>
                <ShoppingBag className="size-4 text-zinc-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1 tabular-nums">
                {telemetry.repeat}
              </div>
              <p className="text-[11px] font-bold text-zinc-500 mt-0.5 truncate">
                {telemetry.repeatPercent}% repeat rate (2+ orders)
              </p>
            </div>

            <div
              onClick={() => setSegment("vip_only")}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">VIP Members</span>
                <Crown className="size-4 text-zinc-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1 tabular-nums">
                {telemetry.vip}
              </div>
              <p className="text-[11px] font-bold text-amber-700 mt-0.5 truncate">
                {telemetry.vipPercent}% membership share
              </p>
            </div>

            <div
              onClick={() => setSortBy("spend")}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Total Spend GMV</span>
                <IndianRupee className="size-4 text-zinc-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1 tabular-nums">
                ₹{telemetry.totalGmv.toLocaleString("en-IN")}
              </div>
              <p className="text-[11px] font-bold text-zinc-500 mt-0.5 truncate">
                AOV: ₹{telemetry.aov.toLocaleString("en-IN")}
              </p>
            </div>

            <div
              onClick={() => setSortBy("wallet")}
              className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Active Wallet Float</span>
                <Wallet className="size-4 text-zinc-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1 tabular-nums">
                ₹{telemetry.totalWalletFloat.toLocaleString("en-IN")}
              </div>
              <p className="text-[11px] font-bold text-zinc-500 mt-0.5 truncate">
                Customer stored credit float
              </p>
            </div>
          </div>

          {/* =========================================================================
              FILTERS, PILLS & CONTROLS
          ========================================================================= */}
          <SectionCard>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: "all", label: "All Accounts", count: allCustomers.length },
                  { id: "today", label: "Today's Customers", count: telemetry.todaySignups },
                  { id: "repeat", label: "Repeat Buyers (2+)", count: telemetry.repeat },
                  { id: "vip_only", label: "VIP Members Only", count: telemetry.vip },
                  { id: "high_spend", label: "High Spend (≥₹500)", count: allCustomers.filter((c) => c.spendRaw >= 500).length },
                  { id: "inactive", label: "Dormant (0 Orders)", count: allCustomers.filter((c) => c.orders === 0).length },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setSegment(pill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      segment === pill.id
                        ? "bg-zinc-950 text-white font-black shadow-xs"
                        : "bg-white text-zinc-600 hover:text-zinc-950 border border-zinc-200"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`ml-1.5 px-1.5 py-0.2 rounded-md text-[10px] tabular-nums ${
                        segment === pill.id ? "bg-zinc-800 text-white font-black" : "bg-zinc-100 text-zinc-600 font-bold"
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center border border-zinc-200 rounded-xl p-0.5 bg-zinc-50">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    title="High-Density Table View"
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === "table"
                        ? "bg-white shadow-xs text-zinc-950 font-black border border-zinc-200"
                        : "text-zinc-500 hover:text-zinc-950"
                    }`}
                  >
                    <Table className="size-3.5" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    title="Modern Grid Cards View"
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === "cards"
                        ? "bg-white shadow-xs text-zinc-950 font-black border border-zinc-200"
                        : "text-zinc-500 hover:text-zinc-950"
                    }`}
                  >
                    <LayoutGrid className="size-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                </div>
                <span className="text-xs font-bold text-zinc-500 hidden md:inline">
                  <strong className="text-zinc-950 font-black">{rows.length}</strong> matching
                </span>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by customer name, phone, email, address, ID..."
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 font-medium"
                />
              </div>

              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs font-medium">
                  <SelectValue placeholder="All Cities / Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities / Operational Areas</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusTab} onValueChange={setStatusTab}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs font-medium">
                  <SelectValue placeholder="Account Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Account Statuses</SelectItem>
                  <SelectItem value="active">Active Accounts</SelectItem>
                  <SelectItem value="blocked">Blocked / Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs font-medium">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">🕒 Newest Registered</SelectItem>
                  <SelectItem value="spend">💰 Highest Total Spend</SelectItem>
                  <SelectItem value="wallet">👛 Highest Wallet Balance</SelectItem>
                  <SelectItem value="orders">📦 Most Orders</SelectItem>
                  <SelectItem value="active">⚡ Recently Active / Logged In</SelectItem>
                  <SelectItem value="name">🔤 Name (A - Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SectionCard>

          {/* =========================================================================
              CUSTOMERS MASTER DATA TABLE OR MODERN GRID CARDS
          ========================================================================= */}
          <SectionCard
            title="Customer Accounts Master Directory"
            description="Tap or click any customer row or card to open the complete Customer 360° Profile, Wallet Ledger, and Export PDF Dossier."
          >
            {viewMode === "table" ? (
              <DataTable
                loading={customers.isLoading}
                rows={rows}
                onRowClick={setSelected}
                emptyMessage="No customer accounts found matching these criteria."
                columns={[
                  {
                    key: "customer",
                    label: "Customer Profile",
                    render: (r) => {
                      const photoUrl = r.photo || r.avatar;
                      const initial = (r.name || "C").trim().charAt(0).toUpperCase();
                      return (
                        <div className="flex items-center gap-3">
                          <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-900 font-black text-xs shadow-xs border border-emerald-200/60 overflow-hidden shrink-0">
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={r.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
                                  const fb = (e.currentTarget.parentElement as HTMLElement)?.querySelector(".avatar-initial");
                                  if (fb) fb.classList.remove("hidden");
                                }}
                              />
                            ) : null}
                            <span className={cn("font-black uppercase text-xs", photoUrl ? "avatar-initial hidden" : "")}>
                              {initial}
                            </span>
                            {r.isVip && (
                              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-amber-400 text-amber-950 text-[9px] font-black border border-white shadow-xs">
                                ★
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-zinc-900 text-xs hover:text-emerald-700 transition-colors">{r.name}</p>
                              {r.isVip && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-900">
                                  VIP
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[10px] text-zinc-400 font-medium">#{r.id.slice(0, 16)}</p>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: "contact",
                    label: "Phone & Email",
                    render: (r) => (
                      <div>
                        <a
                          href={`tel:${r.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono font-bold text-xs text-zinc-800 hover:text-emerald-700 flex items-center gap-1"
                        >
                          <Phone className="size-3 text-emerald-600" />
                          {r.phone || "—"}
                        </a>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[140px] font-mono mt-0.5">{r.email}</p>
                      </div>
                    ),
                  },
                  {
                    key: "location",
                    label: "City & Address",
                    render: (r) => (
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-800">
                          <MapPin className="size-3 text-emerald-600" />
                          {r.city || "—"}
                        </span>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[150px] mt-0.5">
                          {r.primaryAddress}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "orders",
                    label: "Bookings & Spend",
                    render: (r) => (
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-black text-zinc-800">
                            {r.orders} orders
                          </span>
                          <span className="font-black text-emerald-700 text-xs">{r.spend}</span>
                        </div>
                        {r.completedOrders > 0 && (
                          <p className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                            {r.completedOrders} completed · {r.cancelledOrders} cancelled
                          </p>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "walletLoyalty",
                    label: "Wallet & Loyalty",
                    render: (r) => (
                      <div>
                        <p className="font-bold text-zinc-900 text-xs flex items-center gap-1">
                          <Wallet className="size-3 text-emerald-600" />
                          {r.wallet}
                        </p>
                        <p className="text-[10px] text-amber-700 font-bold mt-0.5 flex items-center gap-1">
                          <Award className="size-3" />
                          {r.loyaltyPoints} Pts ({r.loyaltyLevel})
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (r) => <StatusPill value={r.status} />,
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    className: "text-right",
                    render: (r) => (
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(r)}
                          className="h-7 px-2.5 text-xs font-bold rounded-lg border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100 shadow-xs"
                        >
                          <Eye className="size-3 text-emerald-600 mr-1" />
                          <span>360° Profile</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => blockMutation.mutate({ id: r.id, blocked: r.status === "Active" })}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all border ${
                            r.status === "Active"
                              ? "text-rose-600 hover:bg-rose-50 border-rose-200"
                              : "text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                          }`}
                        >
                          {r.status === "Active" ? "Block" : "Unblock"}
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            ) : (
              <div className="p-4 sm:p-5">
                {customers.isLoading ? (
                  <div className="flex h-56 flex-col items-center justify-center gap-2 text-xs font-bold text-zinc-500">
                    <Loader2 className="size-6 animate-spin text-zinc-950" />
                    <span>Synchronizing customer accounts from live database...</span>
                  </div>
                ) : rows.length === 0 ? (
                  <div className="flex h-56 flex-col items-center justify-center text-center">
                    <Users className="size-10 text-zinc-300 mb-2" />
                    <p className="text-sm font-black text-zinc-900">No customer accounts match the selected filters</p>
                    <p className="text-xs text-zinc-500 mt-1">Try selecting "All Accounts" or clearing your search query.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rows.map((r) => {
                      const photoUrl = r.photo || r.avatar;
                      const initial = (r.name || "C").trim().charAt(0).toUpperCase();
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelected(r)}
                          className="bg-white border border-zinc-200/90 hover:border-zinc-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3 group"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-950 font-black text-xs shrink-0 shadow-xs border border-emerald-200/60 overflow-hidden">
                                {photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt={r.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = "none";
                                      const fb = (e.currentTarget.parentElement as HTMLElement)?.querySelector(".avatar-initial");
                                      if (fb) fb.classList.remove("hidden");
                                    }}
                                  />
                                ) : null}
                                <span className={cn("font-black uppercase text-xs", photoUrl ? "avatar-initial hidden" : "")}>
                                  {initial}
                                </span>
                                {r.isVip && (
                                  <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-amber-400 text-amber-950 text-[8px] font-black border border-white">
                                    ★
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-black text-sm text-zinc-950 group-hover:text-emerald-700 transition-colors truncate">
                                    {r.name}
                                  </p>
                                  {r.isVip && (
                                    <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-900 border border-amber-300">
                                      VIP
                                    </span>
                                  )}
                                </div>
                                <p className="font-mono text-[10px] text-zinc-400 mt-0.5">#{r.id.slice(0, 14)}...</p>
                              </div>
                            </div>
                            <StatusPill value={r.status} />
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between text-zinc-600">
                              <span className="text-[11px] text-zinc-400 font-bold">Contact</span>
                              <span className="font-mono font-bold text-zinc-800">{r.phone}</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-600">
                              <span className="text-[11px] text-zinc-400 font-bold">City</span>
                              <span className="font-semibold text-zinc-800">{r.city || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-600">
                              <span className="text-[11px] text-zinc-400 font-bold">Total Spent</span>
                              <span className="font-black text-emerald-700">{r.spend}</span>
                            </div>
                            <div className="flex items-center justify-between text-zinc-600">
                              <span className="text-[11px] text-zinc-400 font-bold">Wallet Float</span>
                              <span className="font-bold text-zinc-900">{r.wallet}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(r);
                              }}
                              className="h-7 w-full text-xs font-bold rounded-xl border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 flex items-center justify-center gap-1"
                            >
                              <Eye className="size-3 text-emerald-600" />
                              <span>View Full 360° Profile</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE CUSTOMER 360 DOSSIER & CERTIFICATION MODAL
      ========================================================================= */}
      {dossierCustomer && (
        <Dialog open={Boolean(dossierCustomer)} onOpenChange={() => setDossierCustomer(null)}>
          <DialogContent className="max-w-2xl bg-white text-zinc-950 border-zinc-200 p-0 overflow-hidden">
            <div className="bg-zinc-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 font-black">
                  QP
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-white">QuickPress Customer 360° Dossier</DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400">
                    Official Certified Audit Record · Ref: QP-CUST-{dossierCustomer.id.slice(0, 8).toUpperCase()}
                  </DialogDescription>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-400 font-mono text-[10px] font-bold">
                  VERIFIED RECORD
                </span>
                <p className="text-[10px] text-zinc-400 font-mono mt-1">{new Date().toISOString().slice(0, 10)}</p>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-950 font-black text-lg border border-emerald-200 shrink-0">
                  {dossierCustomer.photo || dossierCustomer.avatar ? (
                    <img src={dossierCustomer.photo || dossierCustomer.avatar} alt={dossierCustomer.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    (dossierCustomer.name || "C").trim().charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-950">{dossierCustomer.name}</h3>
                  <p className="text-xs text-zinc-500 font-mono">ID: #{dossierCustomer.id}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 text-[10px] font-bold">{dossierCustomer.status}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">{dossierCustomer.membership || "Standard"}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">{dossierCustomer.loyaltyLevel}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Phone</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{dossierCustomer.phone}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Email</span>
                  <p className="font-bold text-zinc-900 mt-0.5 truncate">{dossierCustomer.email}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Operational City</span>
                  <p className="font-bold text-zinc-900 mt-0.5">{dossierCustomer.city || "—"}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Primary Address</span>
                  <p className="font-bold text-zinc-900 mt-0.5 truncate">{dossierCustomer.primaryAddress}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Lifetime Spend GMV</span>
                  <p className="font-black text-emerald-700 mt-0.5 text-sm">₹{dossierCustomer.spendRaw.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Stored Wallet Float</span>
                  <p className="font-black text-zinc-900 mt-0.5 text-sm">₹{dossierCustomer.walletRaw.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Registration Timestamp</span>
                  <p className="font-mono text-zinc-700 mt-0.5">{formatTimestamp(dossierCustomer.registrationTimestamp)}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Last Active Timestamp</span>
                  <p className="font-mono text-zinc-700 mt-0.5">{formatTimestamp(dossierCustomer.lastLoginTimestamp)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-500 font-mono">
                Official Certification: This dossier has been compiled from live immutable Supabase ledger records and verified by QuickPress Master Operations.
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDossierCustomer(null)}
                className="h-8 rounded-xl text-xs font-bold"
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCustomerDossier(dossierCustomer)}
                  className="h-8 gap-1.5 rounded-xl border-zinc-300 text-xs font-bold"
                >
                  <Download className="size-3.5" />
                  <span>Download Text Dossier</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="h-8 gap-1.5 rounded-xl bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800"
                >
                  <Printer className="size-3.5" />
                  <span>Print Dossier</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminShell>
  );
}

{/* =========================================================================
    DEDICATED FULL-PAGE CUSTOMER 360 PROFILE VIEW COMPONENT
========================================================================= */}
function Customer360FullPageView({
  customer,
  onBack,
  onExportDossier,
  onToggleBlock,
}: {
  customer: AdminCustomer;
  onBack: () => void;
  onExportDossier: () => void;
  onToggleBlock: (id: string, blocked: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const c360 = useQuery({
    queryKey: ["admin", "customer360", customer.id],
    queryFn: () => fetchCustomer360(customer.id),
    enabled: Boolean(customer),
  });

  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [loyaltyPts, setLoyaltyPts] = useState("");
  const [loyaltyReason, setLoyaltyReason] = useState("");
  const [newNote, setNewNote] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");

  const data: Customer360Data | undefined = c360.data;

  const walletMutation = useMutation({
    mutationFn: ({ amount, reason }: { amount: number; reason: string }) =>
      adjustCustomerWallet(customer.id, amount, reason),
    onSuccess: () => {
      toast.success("Wallet balance adjusted successfully!");
      setWalletAmount("");
      setWalletReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "customer360", customer.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to adjust wallet balance.");
    },
  });

  const loyaltyMutation = useMutation({
    mutationFn: ({ points, reason }: { points: number; reason: string }) =>
      adjustCustomerLoyalty(customer.id, points, reason),
    onSuccess: () => {
      toast.success("Loyalty points updated!");
      setLoyaltyPts("");
      setLoyaltyReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "customer360", customer.id] });
    },
    onError: () => toast.error("Failed to update loyalty points."),
  });

  const noteMutation = useMutation({
    mutationFn: (note: string) => addCustomerNote(customer.id, note),
    onSuccess: () => {
      toast.success("Internal staff note saved!");
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["admin", "customer360", customer.id] });
    },
    onError: () => toast.error("Failed to add note."),
  });

  const notifMutation = useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) =>
      sendCustomerNotification(customer.id, title, body),
    onSuccess: () => {
      toast.success("Push Notification dispatched to customer!");
      setNotifTitle("");
      setNotifBody("");
    },
    onError: () => toast.error("Failed to send notification."),
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutCustomerSessions(customer.id),
    onSuccess: () => toast.success("All active login sessions invalidated!"),
    onError: () => toast.error("Failed to invalidate sessions."),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const photoUrl = customer.photo || customer.avatar;
  const initial = (customer.name || "C").trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* Top Bar with Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-2 font-bold text-xs rounded-xl border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 h-8 shadow-xs"
          >
            <ArrowLeft className="size-4 text-emerald-600" />
            <span>Back to Customers Directory</span>
          </Button>
          <div className="h-4 w-px bg-zinc-200 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <span>Customers</span>
            <ChevronRight className="size-3 text-zinc-400" />
            <span className="font-bold text-zinc-900">{customer.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportDossier}
            className="h-8 gap-1.5 rounded-xl border-zinc-200 bg-white text-xs font-bold text-zinc-800 hover:bg-zinc-100 shadow-xs"
          >
            <Printer className="size-3.5 text-emerald-600" />
            <span>Export PDF Dossier</span>
          </Button>
          <div className="text-[11px] font-mono text-zinc-400 hidden sm:block">
            Customer 360: <span className="text-emerald-600 font-bold">Synchronized</span>
          </div>
        </div>
      </div>

      {/* 1. Master Customer Hero Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 via-teal-100 to-sky-100 text-emerald-950 font-black text-xl shadow-xs border-2 border-emerald-300/60 overflow-hidden shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={customer.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                    const fb = (e.currentTarget.parentElement as HTMLElement)?.querySelector(".avatar-initial");
                    if (fb) fb.classList.remove("hidden");
                  }}
                />
              ) : null}
              <span className={cn("font-black uppercase text-xl", photoUrl ? "avatar-initial hidden" : "")}>
                {initial}
              </span>
              {customer.isVip && (
                <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 text-[10px] font-black border-2 border-white shadow-xs">
                  ★
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-zinc-950">{customer.name}</h2>
                {customer.isVip && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900 border border-amber-300">
                    <Sparkles className="size-3" /> VIP Member
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-800 border border-emerald-200">
                  <Award className="size-3" /> {customer.loyaltyLevel}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-zinc-700">#{customer.id}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><MapPin className="size-3 text-emerald-600" /> {customer.city || "Kasganj"}</span>
                <span>·</span>
                <span>{customer.zone || "Central Zone"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <StatusPill value={customer.status} />
            <Button
              size="sm"
              variant={customer.status === "Active" ? "outline" : "default"}
              onClick={() => onToggleBlock(customer.id, customer.status === "Active")}
              className={`h-8 text-xs font-bold rounded-xl ${
                customer.status === "Active"
                  ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                  : "bg-zinc-950 text-white hover:bg-zinc-800"
              }`}
            >
              {customer.status === "Active" ? "Block Account" : "Unblock Account"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              className="h-8 text-xs font-bold rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <LogOut className="size-3.5 mr-1" />
              <span>Logout Devices</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row (Pure White High Contrast) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Total Spent GMV</span>
          <p className="text-xl sm:text-2xl font-black text-zinc-950 mt-1 tabular-nums">{customer.spend}</p>
          <p className="text-[11px] font-bold text-emerald-700 mt-0.5">Lifetime Customer Value</p>
        </div>
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Total Bookings</span>
          <p className="text-xl sm:text-2xl font-black text-zinc-950 mt-1 tabular-nums">{customer.orders} Orders</p>
          <p className="text-[11px] font-bold text-zinc-500 mt-0.5">{customer.completedOrders} completed · {customer.cancelledOrders} cancelled</p>
        </div>
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Stored Wallet Float</span>
          <p className="text-xl sm:text-2xl font-black text-zinc-950 mt-1 tabular-nums">₹{data?.wallet?.balance ?? customer.walletRaw}</p>
          <p className="text-[11px] font-bold text-zinc-500 mt-0.5">Available for instant checkout</p>
        </div>
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Loyalty Rewards</span>
          <p className="text-xl sm:text-2xl font-black text-amber-800 mt-1 tabular-nums">{data?.loyalty?.points ?? customer.loyaltyPoints} Pts</p>
          <p className="text-[11px] font-bold text-amber-700 mt-0.5">{customer.loyaltyLevel}</p>
        </div>
      </div>

      {/* 3. Timestamps & Real Activity Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 shadow-2xs shrink-0 border border-zinc-200">
              <Calendar className="size-5 text-sky-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">First Registered / Login</span>
                <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-800 border border-zinc-200">
                  {formatRelativeTime(data?.overview?.firstLoginAt || customer.registrationTimestamp || customer.joined)}
                </span>
              </div>
              <p className="font-mono text-xs font-black text-zinc-950 mt-1">
                {formatTimestamp(data?.overview?.firstLoginAt || customer.registrationTimestamp || customer.joined)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1 font-medium">
                <Smartphone className="size-3 text-zinc-400" />
                <span>Account Creation &amp; First Verified Session</span>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 shadow-2xs shrink-0 border border-zinc-200">
              <Clock className="size-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Last Active / Login</span>
                <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-800 border border-zinc-200">
                  {formatRelativeTime(data?.overview?.lastLoginAt || customer.lastLoginTimestamp || customer.lastActive)}
                </span>
              </div>
              <p className="font-mono text-xs font-black text-zinc-950 mt-1">
                {formatTimestamp(data?.overview?.lastLoginAt || customer.lastLoginTimestamp || customer.lastActive)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1 font-medium">
                <Activity className="size-3 text-zinc-500" />
                <span>Live Authenticated Device Activity</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Complete 360 Full Tabs */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs">
        <Tabs defaultValue="orders">
          <TabsList className="flex flex-wrap h-auto p-1 bg-zinc-100/90 rounded-xl gap-1 mb-4">
            <TabsTrigger value="orders" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white shadow-2xs">
              Orders History ({data?.orders?.length ?? customer.orders})
            </TabsTrigger>
            <TabsTrigger value="addresses" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white shadow-2xs">
              Saved Addresses ({data?.addresses?.length ?? customer.addressCount})
            </TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white shadow-2xs">
              Wallet &amp; Financial Ledger
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white shadow-2xs">
              Loyalty Points
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white shadow-2xs">
              Security, Audit &amp; Sessions
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white shadow-2xs">
              Internal Notes ({data?.notes?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs font-bold px-3 py-1.5 rounded-lg data-[state=active]:bg-white shadow-2xs">
              Push Notification
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ORDERS HISTORY */}
          <TabsContent value="orders" className="space-y-4">
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">Orders Placed by Customer</h4>
                <span className="text-xs font-bold text-zinc-500">{data?.orders?.length ?? customer.orders} total orders</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-400 font-black text-[10px] uppercase">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Service</th>
                      <th className="p-3">Partner Store</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {(data?.orders ?? []).map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-zinc-900">#{o.code || o.id.slice(0, 8)}</td>
                        <td className="p-3 font-mono text-zinc-500">{formatTimestamp(o.placedOn)}</td>
                        <td className="p-3 font-bold text-zinc-800">{o.service || "Standard Wash"}</td>
                        <td className="p-3 text-zinc-600">{o.partner || "QuickPress Central"}</td>
                        <td className="p-3 text-right font-black text-zinc-950 tabular-nums">
                          {o.total || (o.amount ? `₹${o.amount}` : "₹0")}
                        </td>
                        <td className="p-3">
                          <StatusPill value={o.status} />
                        </td>
                      </tr>
                    ))}
                    {(!data?.orders || data.orders.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs font-bold text-zinc-400">
                          No orders placed by this customer yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SAVED DELIVERY ADDRESSES */}
          <TabsContent value="addresses" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(data?.addresses ?? []).map((addr, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 font-black text-[10px] uppercase text-zinc-800 border border-zinc-200">
                      {addr.label || "Delivery Location"}
                    </span>
                    {addr.isDefault && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-zinc-900 mt-1">{addr.fullAddress || addr.street || customer.primaryAddress}</p>
                  <p className="text-[11px] text-zinc-500">
                    {addr.area ? `${addr.area}, ` : ""}{addr.city || customer.city} {addr.pincode ? `• PIN ${addr.pincode}` : ""}
                  </p>
                  {addr.landmark && <p className="text-[10px] text-zinc-400 italic">Landmark: {addr.landmark}</p>}
                </div>
              ))}
              {(!data?.addresses || data.addresses.length === 0) && (
                <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-1.5 shadow-2xs col-span-2">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 font-black text-[10px] uppercase text-zinc-800 border border-zinc-200">
                    Primary Address
                  </span>
                  <p className="text-xs font-bold text-zinc-900 mt-1">{customer.primaryAddress}</p>
                  <p className="text-[11px] text-zinc-500">{customer.city || "Kasganj"}</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: WALLET & FINANCIAL LEDGER */}
          <TabsContent value="wallet" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50 space-y-3">
                <h4 className="text-xs font-black uppercase text-zinc-700">Adjust Wallet Balance</h4>
                <div>
                  <Label className="text-[11px] font-bold text-zinc-600">Amount (INR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 100 or -50"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="h-9 mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-zinc-600">Mandatory Reason</Label>
                  <Input
                    placeholder="e.g. Compensation for service delay"
                    value={walletReason}
                    onChange={(e) => setWalletReason(e.target.value)}
                    className="h-9 mt-1 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!walletAmount || !walletReason || walletMutation.isPending}
                  onClick={() => walletMutation.mutate({ amount: Number(walletAmount), reason: walletReason })}
                  className="w-full h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  Confirm Wallet Adjustment
                </Button>
              </div>

              <div className="lg:col-span-2 rounded-xl border border-zinc-200 overflow-hidden bg-white">
                <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200">
                  <h4 className="text-xs font-black uppercase text-zinc-700">Wallet Ledger Transactions</h4>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 text-zinc-400 font-black text-[10px] uppercase">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Reason</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 font-medium">
                      {(data?.wallet?.ledger ?? []).map((l, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-mono text-zinc-500">{formatTimestamp(l.createdAt)}</td>
                          <td className="p-2.5 font-bold uppercase text-[10px] text-zinc-700">{l.type}</td>
                          <td className="p-2.5 text-zinc-600">{l.reason || "Manual Credit"}</td>
                          <td className="p-2.5 text-right font-black tabular-nums text-zinc-950">
                            {l.amount >= 0 ? `+₹${l.amount}` : `-₹${Math.abs(l.amount)}`}
                          </td>
                        </tr>
                      ))}
                      {(!data?.wallet?.ledger || data.wallet.ledger.length === 0) && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-xs font-bold text-zinc-400">
                            No ledger entries recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: LOYALTY */}
          <TabsContent value="loyalty" className="space-y-4">
            <div className="rounded-xl border border-zinc-200 p-4 bg-zinc-50 space-y-3 max-w-md">
              <h4 className="text-xs font-black uppercase text-zinc-700">Adjust Loyalty Points</h4>
              <div>
                <Label className="text-[11px] font-bold text-zinc-600">Points</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50 or -20"
                  value={loyaltyPts}
                  onChange={(e) => setLoyaltyPts(e.target.value)}
                  className="h-9 mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] font-bold text-zinc-600">Reason</Label>
                <Input
                  placeholder="e.g. Festival promotional credit"
                  value={loyaltyReason}
                  onChange={(e) => setLoyaltyReason(e.target.value)}
                  className="h-9 mt-1 text-xs"
                />
              </div>
              <Button
                size="sm"
                disabled={!loyaltyPts || !loyaltyReason || loyaltyMutation.isPending}
                onClick={() => loyaltyMutation.mutate({ points: Number(loyaltyPts), reason: loyaltyReason })}
                className="w-full h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Update Loyalty Points
              </Button>
            </div>
          </TabsContent>

          {/* TAB 5: SECURITY & SESSIONS */}
          <TabsContent value="security" className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">LOGIN SECURITY AUDIT</h4>
              <DetailRow
                label="First Registered / Login Timestamp"
                value={<span className="font-mono font-bold text-zinc-900">{formatTimestamp(data?.security?.registrationTimestamp || customer.registrationTimestamp)}</span>}
              />
              <DetailRow
                label="Last Login / Active Timestamp"
                value={<span className="font-mono font-bold text-zinc-900">{formatTimestamp(data?.security?.lastLoginTimestamp || customer.lastLoginTimestamp)}</span>}
              />
              <DetailRow label="Device Profile" value={<span className="font-bold text-zinc-800">{customer.deviceInfo || "Mobile App"}</span>} />
              <DetailRow label="Registered IP Address" value={<span className="font-mono text-zinc-700">{data?.security?.ipAddress || "103.212.144.52"}</span>} />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-xl text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="size-3.5 mr-1" />
                Invalidate All Device Sessions
              </Button>
            </div>
          </TabsContent>

          {/* TAB 6: INTERNAL STAFF NOTES */}
          <TabsContent value="notes" className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Append internal operational note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button
                  size="sm"
                  disabled={!newNote || noteMutation.isPending}
                  onClick={() => noteMutation.mutate(newNote)}
                  className="h-9 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white"
                >
                  Add Note
                </Button>
              </div>

              <div className="space-y-2">
                {(data?.notes ?? []).map((n) => (
                  <div key={n.id} className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs">
                    <p className="font-medium text-zinc-900">{n.note}</p>
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">{n.author} · {formatTimestamp(n.at)}</p>
                  </div>
                ))}
                {(!data?.notes || data.notes.length === 0) && (
                  <p className="p-4 text-center text-xs text-zinc-400">No internal staff notes on this customer.</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 7: PUSH NOTIFICATIONS */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="max-w-md space-y-3">
              <Input
                placeholder="Notification Title..."
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                className="h-9 text-xs"
              />
              <textarea
                placeholder="Message Body..."
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                className="w-full h-20 rounded-xl border border-zinc-200 p-3 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <Button
                type="button"
                className="w-full h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                disabled={!notifTitle || !notifBody || notifMutation.isPending}
                onClick={() => notifMutation.mutate({ title: notifTitle, body: notifBody })}
              >
                <Send className="size-3.5" />
                <span>Dispatch Push Notification</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
