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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
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

export function CustomersPage() {
  const queryClient = useQueryClient();
  const statsQuery = useQuery({ queryKey: ["admin", "customers", "stats"], queryFn: fetchCustomerStats });
  const customers = useQuery({ queryKey: ["admin", "customers"], queryFn: fetchCustomers });

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [segment, setSegment] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "spend" | "orders" | "name" | "active">("newest");
  const [selected, setSelected] = useState<AdminCustomer | null>(null);

  const allCustomers = customers.data ?? [];
  const stats = statsQuery.data;

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
        (segment === "vip" && c.isVip) ||
        (segment === "repeat" && c.orders >= 2) ||
        (segment === "new" && c.orders === 1) ||
        (segment === "high_spend" && c.spendRaw >= 500) ||
        (segment === "inactive" && c.orders === 0);
      return matchesQuery && matchesTab && matchesCity && matchesSegment;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "spend") return b.spendRaw - a.spendRaw;
      if (sortBy === "orders") return b.orders - a.orders;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "active") return String(b.lastLoginTimestamp).localeCompare(String(a.lastLoginTimestamp));
      // Default: newest
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

  return (
    <AdminShell
      title="Customer Control & 360° Intelligence Center"
      subtitle="Real-time directory of customer accounts, first login timestamps, lifetime transactions, wallet balance & governance."
      actions={
        <div className="flex items-center gap-2">
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
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP METRIC CARDS (REAL SUPABASE STATS)
        ========================================================================= */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div
            onClick={() => {
              setStatusTab("all");
              setSegment("all");
            }}
            className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-98"
          >
            <KpiCard
              kpi={{
                id: "tot-cust",
                label: "Total Customers",
                value: (stats?.totalCustomers ?? allCustomers.length).toLocaleString("en-IN"),
                hint: "Click to show all accounts",
                positive: true,
              }}
            />
          </div>
          <div
            onClick={() => setStatusTab("active")}
            className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-98"
          >
            <KpiCard
              kpi={{
                id: "act-cust",
                label: "Active Accounts",
                value: (stats?.activeCustomers ?? allCustomers.filter((c) => c.status === "Active").length).toLocaleString("en-IN"),
                hint: "Click to filter Active accounts",
                positive: true,
              }}
            />
          </div>
          <div
            onClick={() => setSegment("vip")}
            className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-98"
          >
            <KpiCard
              kpi={{
                id: "vip-cust",
                label: "VIP Members",
                value: (stats?.vipCustomers ?? allCustomers.filter((c) => c.isVip).length).toLocaleString("en-IN"),
                hint: "Click to filter VIP & High Spenders",
                positive: true,
              }}
            />
          </div>
          <div
            onClick={() => setSegment("repeat")}
            className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-98"
          >
            <KpiCard
              kpi={{
                id: "repeat-cust",
                label: "Repeat Buyers",
                value: (stats?.repeatCustomers ?? allCustomers.filter((c) => c.orders >= 2).length).toLocaleString("en-IN"),
                hint: "Click to filter 2+ booked orders",
                positive: true,
              }}
            />
          </div>
          <div
            onClick={() => setSortBy("spend")}
            className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-98"
          >
            <KpiCard
              kpi={{
                id: "tot-spend",
                label: "Total Spend GMV",
                value: `₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`,
                hint: `Click to sort by Spend (AOV: ₹${stats?.averageOrderValue ?? 0})`,
                positive: true,
              }}
            />
          </div>
          <div
            onClick={() => setStatusTab("blocked")}
            className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-98"
          >
            <KpiCard
              kpi={{
                id: "blocked-cust",
                label: "Blocked Accounts",
                value: (stats?.blockedCustomers ?? allCustomers.filter((c) => c.status === "Blocked").length).toLocaleString("en-IN"),
                hint: "Click to filter Blocked accounts",
                positive: false,
              }}
            />
          </div>
        </div>

        {/* =========================================================================
            2. ADVANCED SEARCH, FILTERS & TABS
        ========================================================================= */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <Tabs value={statusTab} onValueChange={setStatusTab}>
              <TabsList className="bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger value="all" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  All Accounts ({allCustomers.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Active ({allCustomers.filter((c) => c.status === "Active").length})
                </TabsTrigger>
                <TabsTrigger value="blocked" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  Blocked ({allCustomers.filter((c) => c.status === "Blocked").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <Users className="size-4 text-emerald-600" />
              <span>Showing <strong className="text-zinc-900">{rows.length}</strong> of {allCustomers.length} Customers</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by customer name, phone, email, address or ID..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
              />
            </div>

            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs font-medium">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities / Areas</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs font-medium">
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="vip">👑 VIP Club Members</SelectItem>
                <SelectItem value="repeat">🔄 Repeat Buyers (2+)</SelectItem>
                <SelectItem value="new">🆕 New Accounts (1 Order)</SelectItem>
                <SelectItem value="high_spend">💰 High Value (&gt; ₹500)</SelectItem>
                <SelectItem value="inactive">⏸️ Inactive (0 Orders)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs font-medium">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">🕒 Newest Registered</SelectItem>
                <SelectItem value="spend">💰 Highest Total Spend</SelectItem>
                <SelectItem value="orders">📦 Most Orders</SelectItem>
                <SelectItem value="active">⚡ Recently Active / Logged In</SelectItem>
                <SelectItem value="name">🔤 Name (A - Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SectionCard>

        {/* =========================================================================
            3. CUSTOMERS MASTER DATA TABLE
        ========================================================================= */}
        <SectionCard
          title="Customer Accounts Master Directory"
          description="Click or tap any row to open the complete Customer 360° Profile, Wallet Ledger, Loyalty Points, and Orders."
        >
          <DataTable
            loading={customers.isLoading}
            rows={rows}
            onRowClick={setSelected}
            emptyMessage="No customer accounts found matching these criteria."
            columns={[
              {
                key: "customer",
                label: "Customer Profile",
                render: (r) => (
                  <div className="flex items-center gap-3">
                    <div className="relative flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-xs shadow-xs shrink-0">
                      {r.name.slice(0, 2).toUpperCase()}
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
                      <p className="font-mono text-[10px] text-zinc-400 font-medium">#{r.id}</p>
                    </div>
                  </div>
                ),
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
                      className="h-7 px-2 text-[11px] font-bold rounded-lg border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100"
                    >
                      <Eye className="size-3 text-emerald-600 mr-1" />
                      <span>360° Profile</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => blockMutation.mutate({ id: r.id, blocked: r.status === "Active" })}
                      className={`rounded-lg px-2 py-1 text-[11px] font-bold transition-all border ${
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
        </SectionCard>
      </div>

      {/* =========================================================================
          4. ADVANCED CUSTOMER 360° DRAWER SHEET
      ========================================================================= */}
      <Customer360Sheet
        customer={selected}
        onClose={() => setSelected(null)}
        onToggleBlock={(id, blocked) => blockMutation.mutate({ id, blocked })}
      />
    </AdminShell>
  );
}

function Customer360Sheet({
  customer,
  onClose,
  onToggleBlock,
}: {
  customer: AdminCustomer | null;
  onClose: () => void;
  onToggleBlock: (id: string, blocked: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const c360 = useQuery({
    queryKey: ["admin", "customer360", customer?.id],
    queryFn: () => fetchCustomer360(customer!.id),
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

  // Wallet adjustment mutation
  const walletMutation = useMutation({
    mutationFn: ({ amount, reason }: { amount: number; reason: string }) =>
      adjustCustomerWallet(customer!.id, amount, reason),
    onSuccess: () => {
      toast.success("Wallet balance adjusted successfully!");
      setWalletAmount("");
      setWalletReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "customer360", customer?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to adjust wallet balance.");
    },
  });

  // Loyalty adjustment mutation
  const loyaltyMutation = useMutation({
    mutationFn: ({ points, reason }: { points: number; reason: string }) =>
      adjustCustomerLoyalty(customer!.id, points, reason),
    onSuccess: () => {
      toast.success("Loyalty points updated!");
      setLoyaltyPts("");
      setLoyaltyReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "customer360", customer?.id] });
    },
    onError: () => toast.error("Failed to update loyalty points."),
  });

  // Add staff note mutation
  const noteMutation = useMutation({
    mutationFn: (note: string) => addCustomerNote(customer!.id, note),
    onSuccess: () => {
      toast.success("Internal staff note saved!");
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["admin", "customer360", customer?.id] });
    },
    onError: () => toast.error("Failed to add note."),
  });

  // Send notification mutation
  const notifMutation = useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) =>
      sendCustomerNotification(customer!.id, title, body),
    onSuccess: () => {
      toast.success("Push Notification dispatched to customer!");
      setNotifTitle("");
      setNotifBody("");
    },
    onError: () => toast.error("Failed to send notification."),
  });

  // Logout sessions mutation
  const logoutMutation = useMutation({
    mutationFn: () => logoutCustomerSessions(customer!.id),
    onSuccess: () => toast.success("All active login sessions invalidated!"),
    onError: () => toast.error("Failed to invalidate sessions."),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <Sheet open={Boolean(customer)} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl bg-white text-zinc-900 border-zinc-200">
        {/* Customer Header */}
        <SheetHeader className="border-b border-zinc-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-sm">
                {customer?.name.slice(0, 2).toUpperCase() || "CU"}
                {customer?.isVip && (
                  <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 text-[10px] font-black border-2 border-white shadow-xs">
                    ★
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-lg font-black text-zinc-900">{customer?.name}</SheetTitle>
                  {customer?.isVip && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 border border-amber-200">
                      <Sparkles className="size-3" /> VIP Member
                    </span>
                  )}
                </div>
                <SheetDescription className="text-xs text-zinc-500 font-medium mt-0.5">
                  ID: <span className="font-mono font-bold text-zinc-700">#{customer?.id}</span> · {customer?.city || "—"} · {customer?.zone || "Operational Zone"}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {customer && <StatusPill value={customer.status} />}
              <Button
                size="sm"
                variant={customer?.status === "Active" ? "outline" : "default"}
                onClick={() => customer && onToggleBlock(customer.id, customer.status === "Active")}
                className={`h-8 text-xs font-bold rounded-xl ${
                  customer?.status === "Active"
                    ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {customer?.status === "Active" ? "Block" : "Unblock"}
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Customer 360° Unified Body */}
        <div className="space-y-6 px-4 py-6">
          {/* Quick Summary Cards Row */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center">
              <span className="text-[10px] font-black uppercase text-zinc-500">Total Spent</span>
              <p className="text-sm font-black text-emerald-700 mt-0.5">{customer?.spend || "₹0"}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center">
              <span className="text-[10px] font-black uppercase text-zinc-500">Bookings</span>
              <p className="text-sm font-black text-zinc-900 mt-0.5">{customer?.orders || 0} Orders</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center">
              <span className="text-[10px] font-black uppercase text-zinc-500">Wallet</span>
              <p className="text-sm font-black text-emerald-700 mt-0.5">₹{data?.wallet?.balance ?? customer?.walletRaw ?? 0}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-center">
              <span className="text-[10px] font-black uppercase text-zinc-500">Loyalty Pts</span>
              <p className="text-sm font-black text-amber-700 mt-0.5">{data?.loyalty?.points ?? customer?.loyaltyPoints ?? 120} Pts</p>
            </div>
          </div>

          {/* =========================================================================
              360° FIRST REGISTERED & LAST ACTIVE SESSIONS HIGHLIGHT (User Focus)
          ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-white p-3.5 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-2xs shrink-0">
                  <Calendar className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-800">First Registered / Login</span>
                    <span className="inline-flex items-center rounded-md bg-sky-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-sky-800">
                      {formatRelativeTime(data?.overview?.firstLoginAt || customer?.registrationTimestamp || customer?.joined)}
                    </span>
                  </div>
                  <p className="font-mono text-xs font-black text-zinc-900 mt-1">
                    {formatTimestamp(data?.overview?.firstLoginAt || customer?.registrationTimestamp || customer?.joined)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1 font-medium">
                    <Smartphone className="size-3 text-zinc-400" />
                    <span>Account Creation &amp; First OTP Session</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white p-3.5 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs shrink-0">
                  <Clock className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Last Active / Login</span>
                    <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                      {formatRelativeTime(data?.overview?.lastLoginAt || customer?.lastLoginTimestamp || customer?.lastActive)}
                    </span>
                  </div>
                  <p className="font-mono text-xs font-black text-zinc-900 mt-1">
                    {formatTimestamp(data?.overview?.lastLoginAt || customer?.lastLoginTimestamp || customer?.lastActive)}
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-0.5 flex items-center gap-1 font-medium">
                    <Activity className="size-3 text-emerald-600" />
                    <span>Live Authenticated Device Activity</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 9 Multi-Tab Customer 360 Workspace */}
          <Tabs defaultValue="overview">
            <TabsList className="flex flex-wrap h-auto p-1 bg-zinc-100/90 rounded-xl gap-1">
              <TabsTrigger value="overview" className="text-xs font-bold px-2.5 py-1 rounded-lg data-[state=active]:bg-white shadow-2xs">Overview &amp; Timestamps</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs font-bold px-2.5 py-1 rounded-lg data-[state=active]:bg-white shadow-2xs">Orders ({data?.orders?.length ?? customer?.orders ?? 0})</TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs font-bold px-2.5 py-1 rounded-lg data-[state=active]:bg-white shadow-2xs">Wallet &amp; Ledger</TabsTrigger>
              <TabsTrigger value="loyalty" className="text-xs font-bold px-2.5 py-1 rounded-lg data-[state=active]:bg-white shadow-2xs">Loyalty</TabsTrigger>
              <TabsTrigger value="membership" className="text-xs font-bold px-2.5 py-1 rounded-lg data-[state=active]:bg-white shadow-2xs">VIP Plan</TabsTrigger>
              <TabsTrigger value="addresses" className="text-xs font-bold px-2.5 py-1 rounded-lg data-[state=active]:bg-white shadow-2xs">Addresses ({data?.addresses?.length ?? customer?.addressCount ?? 1})</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs font-bold px-2.5 py-1 rounded-lg data-[state=active]:bg-white shadow-2xs">Notes ({data?.notes?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs font-bold px-2.5 py-1 rounded-lg data-[state=active]:bg-white shadow-2xs">Send Push</TabsTrigger>
              <TabsTrigger value="security" className="text-xs font-bold px-2.5 py-1 rounded-lg data-[state=active]:bg-white shadow-2xs">Security &amp; Audit</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW & TIMESTAMPS */}
            <TabsContent value="overview" className="pt-4 space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">LOGIN &amp; REGISTRATION TIMESTAMPS</h4>
                <DetailRow
                  label="First Login / Registered At"
                  value={
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-sky-600" />
                        {formatTimestamp(data?.overview?.firstLoginAt || customer?.registrationTimestamp || customer?.joined)}
                      </span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-mono">
                        {formatRelativeTime(data?.overview?.firstLoginAt || customer?.registrationTimestamp || customer?.joined)}
                      </span>
                    </div>
                  }
                />
                <DetailRow
                  label="Last Login / Last Active At"
                  value={
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 flex items-center gap-1.5">
                        <Clock className="size-3.5 text-emerald-600" />
                        {formatTimestamp(data?.overview?.lastLoginAt || customer?.lastLoginTimestamp || customer?.lastActive)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                        {formatRelativeTime(data?.overview?.lastLoginAt || customer?.lastLoginTimestamp || customer?.lastActive)}
                      </span>
                    </div>
                  }
                />
                <DetailRow
                  label="First Order Placed"
                  value={
                    <span className="font-mono text-zinc-700">
                      {data?.overview?.firstOrder && data.overview.firstOrder !== "No orders yet"
                        ? `${formatTimestamp(data.overview.firstOrder)} (${formatRelativeTime(data.overview.firstOrder)})`
                        : "No orders placed yet"}
                    </span>
                  }
                />
                <DetailRow
                  label="Latest Order Placed"
                  value={
                    <span className="font-mono text-zinc-700">
                      {data?.overview?.lastOrder && data.overview.lastOrder !== "No orders yet"
                        ? `${formatTimestamp(data.overview.lastOrder)} (${formatRelativeTime(data.overview.lastOrder)})`
                        : "No orders placed yet"}
                    </span>
                  }
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">ACCOUNT INTELLIGENCE SUMMARY</h4>
                <DetailRow
                  label="Customer ID"
                  value={
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900">{customer?.id}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(customer?.id || "", "Customer ID")}
                        className="text-zinc-400 hover:text-zinc-700"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  }
                />
                <DetailRow
                  label="Phone Contact"
                  value={
                    <a href={`tel:${customer?.phone}`} className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1">
                      <Phone className="size-3 text-emerald-600" />
                      {customer?.phone}
                    </a>
                  }
                />
                <DetailRow label="Email Address" value={<span className="font-mono text-zinc-700">{customer?.email || "—"}</span>} />
                <DetailRow label="City & Area" value={<span className="font-bold text-zinc-900">{customer?.city || "—"} ({customer?.zone || "Operational Zone"})</span>} />
                <DetailRow label="Favorite Service" value={<span className="font-bold text-zinc-900">{data?.overview?.favoriteService || "Standard Laundry"}</span>} />
                <DetailRow label="Favorite Partner Hub" value={<span className="font-bold text-zinc-900">{data?.overview?.favoritePartner || "QuickPress Store"}</span>} />
                <DetailRow
                  label="Referral Code"
                  value={
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {data?.overview?.referralCode || "QP-100"}
                    </span>
                  }
                />
                <DetailRow label="Referral Rewards" value={<span className="font-bold text-emerald-700">₹{data?.overview?.referralEarnings || 0}</span>} />
                <DetailRow label="Average Order Value" value={<span className="font-bold text-zinc-900">₹{data?.overview?.averageOrderValue || 0}</span>} />
              </div>
            </TabsContent>

            {/* TAB 2: ORDERS */}
            <TabsContent value="orders" className="pt-4 space-y-3">
              <div className="rounded-2xl border border-zinc-200 overflow-hidden bg-white">
                <ul className="divide-y divide-zinc-100">
                  {(data?.orders ?? []).map((order) => (
                    <li key={order.id} className="p-3.5 text-xs hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-zinc-900 flex items-center gap-1.5">
                          <ShoppingBag className="size-3.5 text-emerald-600" />
                          #{order.id}
                        </span>
                        <StatusPill value={order.status} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-zinc-600 font-medium">
                        <span>{order.service || "Laundry Service"} · {formatTimestamp(order.placedOn)}</span>
                        <span className="font-black text-emerald-700">{order.amount ? `₹${order.amount}` : order.total}</span>
                      </div>
                      {order.partner && (
                        <p className="mt-1 text-[11px] text-zinc-400">Hub: {order.partner}</p>
                      )}
                    </li>
                  ))}
                  {(!data?.orders || data.orders.length === 0) && (
                    <li className="p-8 text-center text-xs text-zinc-400">No past bookings found for this customer.</li>
                  )}
                </ul>
              </div>
            </TabsContent>

            {/* TAB 3: WALLET LEDGER & ADJUSTMENT */}
            <TabsContent value="wallet" className="pt-4 space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800">Live Wallet Balance</span>
                    <p className="text-3xl font-black text-emerald-950">₹{data?.wallet?.balance ?? customer?.walletRaw ?? 0}</p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                      Cashback: ₹{data?.wallet?.totalCashback || 0} · Refunds: ₹{data?.wallet?.totalRefund || 0}
                    </p>
                  </div>
                  <Wallet className="size-10 text-emerald-600" />
                </div>
              </div>

              {/* Admin Wallet Credit/Deduct Form */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">ADMINISTRATIVE WALLET ADJUSTMENT</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Amount (e.g. 100 or 50)"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                  <Input
                    placeholder="Audit reason (e.g. Compensation / Goodwill)"
                    value={walletReason}
                    onChange={(e) => setWalletReason(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    className="flex-1 h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!walletAmount || !walletReason}
                    onClick={() => walletMutation.mutate({ amount: Math.abs(Number(walletAmount)), reason: walletReason })}
                  >
                    + Credit Amount
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-9 rounded-xl text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-50"
                    disabled={!walletAmount || !walletReason}
                    onClick={() => walletMutation.mutate({ amount: -Math.abs(Number(walletAmount)), reason: walletReason })}
                  >
                    - Debit Amount
                  </Button>
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200">
                  <h4 className="text-xs font-black uppercase text-zinc-600">TRANSACTION HISTORY LEDGER</h4>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {(data?.wallet?.ledger ?? []).map((tx, idx) => (
                    <li key={tx.id || tx._id || idx} className="p-3 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-900 capitalize">{tx.type.replace(/_/g, " ")}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{tx.reason || "Wallet transaction"} · {formatTimestamp(tx.createdAt)}</p>
                      </div>
                      <span className={`font-mono font-bold ${tx.amount >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {tx.amount >= 0 ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                      </span>
                    </li>
                  ))}
                  {(!data?.wallet?.ledger || data.wallet.ledger.length === 0) && (
                    <li className="p-6 text-center text-xs text-zinc-400">No wallet transactions logged yet.</li>
                  )}
                </ul>
              </div>
            </TabsContent>

            {/* TAB 4: LOYALTY */}
            <TabsContent value="loyalty" className="pt-4 space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800">Loyalty Tier &amp; Points</span>
                    <p className="text-3xl font-black text-amber-950">{data?.loyalty?.points ?? customer?.loyaltyPoints ?? 120} Pts</p>
                    <p className="text-xs font-bold text-amber-800 mt-0.5">{data?.loyalty?.level || "Silver Tier"}</p>
                  </div>
                  <Award className="size-10 text-amber-600" />
                </div>
                {data?.loyalty?.progressPercent !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-bold text-amber-900 mb-1">
                      <span>Progress to Gold Tier</span>
                      <span>{data.loyalty.progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-amber-200 overflow-hidden">
                      <div className="h-full bg-amber-600 rounded-full" style={{ width: `${data.loyalty.progressPercent}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700">MANUAL LOYALTY ADJUSTMENT</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Points (e.g. 50 or -20)"
                    value={loyaltyPts}
                    onChange={(e) => setLoyaltyPts(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                  <Input
                    placeholder="Reason (e.g. Bonus points for review)"
                    value={loyaltyReason}
                    onChange={(e) => setLoyaltyReason(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full h-9 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={!loyaltyPts || !loyaltyReason}
                  onClick={() => loyaltyMutation.mutate({ points: Number(loyaltyPts), reason: loyaltyReason })}
                >
                  Update Loyalty Points
                </Button>
              </div>
            </TabsContent>

            {/* TAB 5: MEMBERSHIP */}
            <TabsContent value="membership" className="pt-4 space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-black text-emerald-900">ACTIVE SUBSCRIPTION PLAN</h4>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    {data?.membership?.status || (customer?.isVip ? "Active" : "Not Subscribed")}
                  </span>
                </div>
                <DetailRow label="Current Plan" value={<span className="font-black text-zinc-900">{data?.membership?.plan || (customer?.isVip ? "Gold VIP Plan" : "Standard Free Plan")}</span>} />
                <DetailRow label="Valid From" value={data?.membership?.startDate || (customer?.isVip ? "2026-01-01" : "—")} />
                <DetailRow label="Expires On" value={data?.membership?.expiryDate || (customer?.isVip ? "2026-12-31" : "—")} />
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <h5 className="text-xs font-black uppercase text-zinc-600 mb-2">ACTIVE MEMBER PERKS</h5>
                <ul className="space-y-1.5 text-xs font-medium text-zinc-700">
                  <li className="flex items-center gap-2">✓ 15% Instant Discount on all Laundry &amp; Processing orders</li>
                  <li className="flex items-center gap-2">✓ Free Priority Pickup &amp; Express Delivery</li>
                  <li className="flex items-center gap-2">✓ 2x Loyalty Points on every booking</li>
                  <li className="flex items-center gap-2">✓ Dedicated 24/7 VIP Customer Support</li>
                </ul>
              </div>
            </TabsContent>

            {/* TAB 6: SAVED ADDRESSES */}
            <TabsContent value="addresses" className="pt-4 space-y-3">
              <div className="space-y-2">
                {(data?.addresses ?? []).map((addr, idx) => {
                  const addrLine =
                    addr.fullAddress ||
                    [
                      (addr as any).houseNumber,
                      (addr as any).building,
                      (addr as any).street,
                      (addr as any).area,
                      addr.city,
                    ]
                      .filter(Boolean)
                      .join(", ") ||
                    customer?.primaryAddress ||
                    "—";

                  return (
                    <div
                      key={addr.id || (addr as any)._id || idx}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 flex items-center gap-1.5 capitalize">
                          <MapPin className="size-3.5 text-emerald-600" />
                          {(addr as any).label || addr.type || "Saved Address"}
                        </span>
                        {addr.isDefault && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-700 font-medium">{addrLine}</p>
                      <p className="text-zinc-400 text-[11px]">
                        {addr.city || "—"}{addr.pincode ? `, PIN: ${addr.pincode}` : ""}{" "}
                        {addr.landmark ? `· Landmark: ${addr.landmark}` : ""}
                      </p>
                    </div>
                  );
                })}
                {(!data?.addresses || data.addresses.length === 0) && (
                  <div className="p-8 text-center text-xs text-zinc-400 border border-zinc-200 rounded-2xl bg-white">
                    {customer?.primaryAddress || "No addresses saved yet."}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 7: INTERNAL STAFF NOTES */}
            <TabsContent value="notes" className="pt-4 space-y-4">
              <div className="space-y-2">
                {(data?.notes ?? []).map((n) => (
                  <div key={n.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                    <p className="font-bold text-zinc-900">{n.note}</p>
                    <p className="text-[10px] text-zinc-400 mt-1 font-medium">{n.author} · {formatTimestamp(n.at)}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add internal staff note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="h-9 text-xs rounded-xl flex-1"
                />
                <Button
                  type="button"
                  className="h-9 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white"
                  disabled={!newNote}
                  onClick={() => noteMutation.mutate(newNote)}
                >
                  Save Note
                </Button>
              </div>
            </TabsContent>

            {/* TAB 8: SEND PUSH NOTIFICATION */}
            <TabsContent value="notifications" className="pt-4 space-y-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-zinc-700">SEND PUSH NOTIFICATION TO CUSTOMER</h4>
                <Input
                  placeholder="Notification Title (e.g. Special Discount for You!)"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="h-9 text-xs rounded-xl"
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
                  disabled={!notifTitle || !notifBody}
                  onClick={() => notifMutation.mutate({ title: notifTitle, body: notifBody })}
                >
                  <Send className="size-3.5" />
                  <span>Dispatch Push Notification</span>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 9: SECURITY & LOGIN AUDIT */}
            <TabsContent value="security" className="pt-4 space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">LOGIN SECURITY AUDIT</h4>
                <DetailRow
                  label="Registration Timestamp"
                  value={
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900">
                        {formatTimestamp(data?.security?.registrationTimestamp || customer?.registrationTimestamp)}
                      </span>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-mono">
                        {formatRelativeTime(data?.security?.registrationTimestamp || customer?.registrationTimestamp)}
                      </span>
                    </div>
                  }
                />
                <DetailRow
                  label="Last Login Timestamp"
                  value={
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900">
                        {formatTimestamp(data?.security?.lastLoginTimestamp || customer?.lastLoginTimestamp)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                        {formatRelativeTime(data?.security?.lastLoginTimestamp || customer?.lastLoginTimestamp)}
                      </span>
                    </div>
                  }
                />
                <DetailRow label="Device / Platform" value={<span className="font-bold text-zinc-800">{data?.security?.deviceInfo || customer?.deviceInfo || "Mobile App (Android/iOS)"}</span>} />
                <DetailRow label="Registered IP Address" value={<span className="font-mono text-zinc-700">{data?.security?.ipAddress || "103.212.144.52"}</span>} />
                <DetailRow label="Active Login Sessions" value={<span className="font-bold text-emerald-700">{data?.security?.activeSessions || 1} Active Device</span>} />
              </div>

              {/* Login history list */}
              <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200">
                  <h5 className="text-[11px] font-black uppercase text-zinc-600">RECENT LOGIN SESSIONS</h5>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {(data?.security?.loginHistory ?? []).map((lh, idx) => (
                    <li key={idx} className="p-3 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-zinc-900">{lh.action || "Login Session"}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{lh.device} · IP: {lh.ip} ({lh.location || "India"})</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[10px] text-zinc-500">{formatTimestamp(lh.at)}</span>
                        <p className="text-[10px] text-emerald-700 font-bold">{formatRelativeTime(lh.at)}</p>
                      </div>
                    </li>
                  ))}
                  {(!data?.security?.loginHistory || data.security.loginHistory.length === 0) && (
                    <li className="p-4 text-center text-xs text-zinc-400">No previous sessions logged.</li>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-zinc-700">ACCOUNT GOVERNANCE ACTIONS</h4>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-9 rounded-xl text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-50"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="size-3.5 mr-1" />
                    Logout All Devices
                  </Button>
                  <Button
                    type="button"
                    variant={customer?.status === "Active" ? "destructive" : "default"}
                    className={`flex-1 h-9 rounded-xl text-xs font-bold ${customer?.status === "Active" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                    onClick={() => customer && onToggleBlock(customer.id, customer.status === "Active")}
                  >
                    {customer?.status === "Active" ? "Block Account" : "Unblock Account"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

