import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  ShieldCheck,
  Users,
  Key,
  History,
  Search,
  Sparkles,
  Lock,
  Mail,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  Filter,
  Check,
  X,
  Building,
  Phone,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  Edit3,
  RefreshCw,
  Layers,
  ChevronRight,
  Shield,
  Activity,
  AlertCircle,
  Briefcase,
  Calendar,
  Settings,
  Sliders,
  CheckSquare,
  Square,
  UserX,
  Cloud,
  Copy,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  Crown,
  KeyRound,
  Info,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
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
  deleteStaff,
  fetchActivityLogs,
  fetchRoles,
  fetchStaff,
  inviteStaff,
  updateStaff,
  updateStaffPermissions,
  updateStaffStatus,
  type ActivityLog,
  type StaffMember,
  type StaffRole,
} from "../api/staff";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { readSession } from "@/api/core/session-store";

export const Route = createFileRoute("/staff")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Staff & RBAC Governance Engine",
      "Manage Operations Admins, configure granular RBAC permission boundaries, and review real-time security audit trails."
    ),
  component: StaffPage,
});

/* -------------------------------------------------------------------------
   RBAC Permission Modules & Category Groupings
------------------------------------------------------------------------- */
export type PermissionDef = {
  key: string;
  label: string;
  category: "Dispatch" | "Fleet & Stores" | "Customer & Support" | "Finance & Growth" | "Governance";
  description: string;
};

export const ALL_PERMISSIONS: PermissionDef[] = [
  { key: "orders", label: "Orders & Live Dispatch", category: "Dispatch", description: "View live orders, assign partner stores, manual rider dispatch" },
  { key: "cities", label: "Operating Cities & Geo-Zones", category: "Dispatch", description: "Manage serviceable zones, polygon geofences, hub boundaries" },
  { key: "partners", label: "Partner Laundromat Stores", category: "Fleet & Stores", description: "Store KYC approvals, wash machine audits, operational status" },
  { key: "riders", label: "Rider Fleet & Captain KYC", category: "Fleet & Stores", description: "Onboard delivery partners, license verification, cash float limit" },
  { key: "customers", label: "Customer 360 & Profiles", category: "Customer & Support", description: "Customer ledger, delivery addresses, order history, phone masking" },
  { key: "support", label: "Helpdesk & Resolution Desk", category: "Customer & Support", description: "Omnichannel ticket management for Customers, Partners & Riders" },
  { key: "finance", label: "Settlements & Treasury Ledgers", category: "Finance & Growth", description: "Double-entry accounting, partner payouts, wallet credit/debit" },
  { key: "coupons", label: "Coupons & Promotional Codes", category: "Finance & Growth", description: "Discount vouchers, minimum order thresholds, cashback rules" },
  { key: "memberships", label: "VIP Memberships & Subscriptions", category: "Finance & Growth", description: "VIP subscription plans, benefits management, recurring MRR" },
  { key: "services", label: "Master Service Catalog", category: "Governance", description: "Garment categories, unit pricing, express surcharges, GST slabs" },
  { key: "analytics", label: "Executive Analytics & KPIs", category: "Governance", description: "Platform GMV, cohort retention, SLA compliance, unit economics" },
  { key: "notifications", label: "Alerts & Broadcast Engine", category: "Governance", description: "Transactional SMS, push announcements, template builder" },
  { key: "staff", label: "Staff & RBAC Administration", category: "Governance", description: "Add administrators, assign roles, configure access boundaries" },
  { key: "settings", label: "Platform & Security Governance", category: "Governance", description: "Payment gateway configs, Cloudflare SSO, operational toggles" },
];

export const ROLE_PRESETS: Record<string, { role: string; desc: string; permissions: string[] }> = {
  "Super Admin": {
    role: "Super Admin",
    desc: "Unrestricted platform master access across all 14 modules, financial ledgers, and staff governance.",
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  "Operations Admin": {
    role: "Operations Admin",
    desc: "Operational authority over orders, store partners, rider fleet, master catalog, cities, and support.",
    permissions: ["orders", "customers", "partners", "riders", "services", "cities", "support"],
  },
  "Fleet Dispatch Manager": {
    role: "Fleet Dispatch Manager",
    desc: "Dedicated rider fleet supervision, live order dispatch routing, territory zones, and rider escalations.",
    permissions: ["orders", "riders", "cities", "support"],
  },
  "Support Lead": {
    role: "Support Lead",
    desc: "Frontline customer and partner escalation resolution, ticket management, and coupon issuance.",
    permissions: ["customers", "orders", "support", "coupons"],
  },
  "Finance & Settlements Lead": {
    role: "Finance & Settlements Lead",
    desc: "Accounting audits, payout ledger settlements, VIP subscriptions, and revenue analytics.",
    permissions: ["finance", "orders", "memberships", "analytics"],
  },
  "Store Partner Lead": {
    role: "Store Partner Lead",
    desc: "Laundromat onboarding, quality audits, service rates, and partner support tickets.",
    permissions: ["partners", "orders", "services", "support"],
  },
};

const CATEGORIES = [
  "Dispatch",
  "Fleet & Stores",
  "Customer & Support",
  "Finance & Growth",
  "Governance",
] as const;

export function StaffPage() {
  const queryClient = useQueryClient();
  const session = typeof window !== "undefined" ? readSession("admin") : null;
  const staff = useQuery({ queryKey: ["admin", "staff"], queryFn: fetchStaff });
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: fetchRoles });
  const logs = useQuery({ queryKey: ["admin", "activity-logs"], queryFn: () => fetchActivityLogs() });

  const [activeTab, setActiveTab] = useState<"staff" | "matrix" | "logs" | "territory" | "cloudflare">("staff");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [selectedStaffLogsActor, setSelectedStaffLogsActor] = useState<string>("all");
  const [selectedStaffLogsAction, setSelectedStaffLogsAction] = useState<string>("all");

  // Modals state
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [permStaff, setPermStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);

  const allStaff = staff.data ?? [];
  const allRoles = roles.data ?? [];
  const allLogs = logs.data ?? [];

  // Metrics
  const metrics = useMemo(() => {
    const total = allStaff.length;
    const active = allStaff.filter((s) => s.status === "Active").length;
    const suspended = allStaff.filter((s) => s.status === "Suspended").length;
    const pending = allStaff.filter((s) => s.status.includes("Pending")).length;
    const totalRoles = allRoles.length || 6;
    const totalLogs = allLogs.length || 0;
    return { total, active, suspended, pending, totalRoles, totalLogs };
  }, [allStaff, allRoles, allLogs]);

  // Unique territory scopes from staff
  const availableScopes = useMemo(() => {
    const set = new Set<string>();
    allStaff.forEach((s) => {
      if (s.scope) set.add(s.scope);
    });
    return Array.from(set);
  }, [allStaff]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allStaff.filter((s) => {
      const matchQuery =
        !q ||
        [s.name, s.email, s.phone, s.role, s.scope, ...(s.permissions || [])]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchRole = roleFilter === "all" || s.role.toLowerCase() === roleFilter.toLowerCase();
      const matchStatus = statusFilter === "all" || s.status.toLowerCase() === statusFilter.toLowerCase();
      const matchScope = scopeFilter === "all" || s.scope.toLowerCase() === scopeFilter.toLowerCase();
      return matchQuery && matchRole && matchStatus && matchScope;
    });
  }, [allStaff, searchQuery, roleFilter, statusFilter, scopeFilter]);

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return allLogs.filter((l) => {
      const matchActor =
        selectedStaffLogsActor === "all" || l.actor.toLowerCase().includes(selectedStaffLogsActor.toLowerCase());
      const matchAction =
        selectedStaffLogsAction === "all" || l.action.toLowerCase().includes(selectedStaffLogsAction.toLowerCase());
      return matchActor && matchAction;
    });
  }, [allLogs, selectedStaffLogsActor, selectedStaffLogsAction]);

  // Status toggle mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateStaffStatus(id, status),
    onSuccess: (_, vars) => {
      toast.success(`Staff account status updated to "${vars.status}"!`);
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update staff status"),
  });

  // Delete staff mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => {
      toast.success("Staff access revoked and removed from directory.");
      setDeletingStaff(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to revoke staff access"),
  });

  const handleInspectStaffLogs = (actorName: string) => {
    setSelectedStaffLogsActor(actorName);
    setActiveTab("logs");
    toast.info(`Filtering audit ledger for "${actorName}"`);
  };

  return (
    <AdminShell
      title="Staff Directory & RBAC Governance"
      subtitle="Onboard Operations Admins, configure granular access boundaries, and inspect zero-trust audit trails."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              staff.refetch();
              roles.refetch();
              logs.refetch();
              toast.success("Staff directory and audit logs synchronized!");
            }}
            disabled={staff.isRefetching}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${staff.isRefetching ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <AddStaffDialog />
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. EXECUTIVE KPI METRIC CARDS
        ========================================================================= */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            title="Total Operators"
            value={`${metrics.total}`}
            hint={`${metrics.active} active platform admins`}
            positive={true}
            icon={<Users className="size-4" />}
          />
          <KpiCard
            title="Active Admins"
            value={`${metrics.active}`}
            hint={metrics.suspended > 0 ? `${metrics.suspended} suspended` : "All accounts verified"}
            positive={metrics.suspended === 0}
            icon={<UserCheck className="size-4" />}
          />
          <KpiCard
            title="RBAC Roles"
            value={`${metrics.totalRoles} Tiers`}
            hint="Granular privilege matrices"
            positive={true}
            icon={<Shield className="size-4" />}
          />
          <KpiCard
            title="Edge SSO & 2FA"
            value="100% Enforced"
            hint="Cloudflare Zero Trust OTP"
            positive={true}
            icon={<ShieldCheck className="size-4" />}
          />
          <KpiCard
            title="Audit Ledger"
            value={`${metrics.totalLogs} Events`}
            hint="Immutable action trail"
            positive={true}
            icon={<Activity className="size-4" />}
          />
          <KpiCard
            title="Regional Coverage"
            value={`${availableScopes.length || 3} Hubs`}
            hint="Kasganj, Aligarh, Delhi"
            positive={true}
            icon={<MapPin className="size-4" />}
          />
        </div>

        {/* =========================================================================
            2. NAVIGATION TABS
        ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-2">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="bg-zinc-100 p-1 rounded-xl">
              <TabsTrigger
                value="staff"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-1.5"
              >
                <Users className="size-3.5 text-zinc-600" />
                <span>Staff Directory ({allStaff.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="matrix"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-1.5"
              >
                <SlidersHorizontal className="size-3.5 text-zinc-600" />
                <span>RBAC Permissions Matrix</span>
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-1.5"
              >
                <Activity className="size-3.5 text-zinc-600" />
                <span>Audit Trail ({allLogs.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="territory"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-1.5"
              >
                <Building className="size-3.5 text-zinc-600" />
                <span>Territory Hubs</span>
              </TabsTrigger>
              <TabsTrigger
                value="cloudflare"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs flex items-center gap-1.5"
              >
                <Cloud className="size-3.5 text-amber-600" />
                <span>Zero Trust SSO</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-zinc-500">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live DB RBAC Enforcement</span>
          </div>
        </div>

        {/* =========================================================================
            3. TAB 1: TEAM DIRECTORY & STAFF MANAGEMENT
        ========================================================================= */}
        {activeTab === "staff" && (
          <div className="space-y-4">
            {/* Filter and View Controls Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200/90 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff by name, email, role, phone, or permission..."
                  className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-all font-medium"
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

              <div className="flex flex-wrap items-center gap-2">
                {/* Role filter */}
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 w-44 rounded-xl bg-white text-xs border-zinc-200 font-semibold text-zinc-700">
                    <SelectValue placeholder="Filter Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super admin">Super Admin</SelectItem>
                    <SelectItem value="operations admin">Operations Admin</SelectItem>
                    <SelectItem value="fleet dispatch manager">Fleet Dispatch Manager</SelectItem>
                    <SelectItem value="support lead">Support Lead</SelectItem>
                    <SelectItem value="finance & settlements lead">Finance Lead</SelectItem>
                    <SelectItem value="store partner lead">Store Partner Lead</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36 rounded-xl bg-white text-xs border-zinc-200 font-semibold text-zinc-700">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending verification">Pending OTP</SelectItem>
                  </SelectContent>
                </Select>

                {/* Scope filter */}
                {availableScopes.length > 0 && (
                  <Select value={scopeFilter} onValueChange={setScopeFilter}>
                    <SelectTrigger className="h-9 w-40 rounded-xl bg-white text-xs border-zinc-200 font-semibold text-zinc-700">
                      <SelectValue placeholder="Territory Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Hubs</SelectItem>
                      {availableScopes.map((scope) => (
                        <SelectItem key={scope} value={scope.toLowerCase()}>
                          {scope}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === "table" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                    }`}
                    title="Table View"
                  >
                    <TableIcon className="size-3.5" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === "grid" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
                    }`}
                    title="Grid Cards View"
                  >
                    <LayoutGrid className="size-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count Summary */}
            <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
              <span>
                Showing <strong className="text-zinc-900">{filteredStaff.length}</strong> of{" "}
                <strong className="text-zinc-900">{allStaff.length}</strong> staff members
              </span>
              {(roleFilter !== "all" || statusFilter !== "all" || scopeFilter !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setScopeFilter("all");
                    setSearchQuery("");
                  }}
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <X className="size-3" /> Clear All Filters
                </button>
              )}
            </div>

            {/* Empty State */}
            {filteredStaff.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
                <div className="size-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                  <Users className="size-6" />
                </div>
                <h3 className="text-sm font-black text-zinc-900">No staff members match the selected criteria</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Try adjusting your search terms, role filters, or territory selections.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setScopeFilter("all");
                    setSearchQuery("");
                  }}
                  className="mt-4 rounded-xl text-xs font-bold"
                >
                  Reset Filters
                </Button>
              </div>
            )}

            {/* VIEW 1: TABLE VIEW */}
            {viewMode === "table" && filteredStaff.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50/90 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">Operator Member</th>
                        <th className="py-3.5 px-4">Security Role</th>
                        <th className="py-3.5 px-4">Territory Hub</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Granted Access Modules</th>
                        <th className="py-3.5 px-4">Last Activity</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredStaff.map((m) => {
                        const isSuperAdmin = m.role === "Super Admin";
                        const isSuspended = m.status === "Suspended";
                        const grantedCount = m.permissions?.length || (isSuperAdmin ? 14 : 0);

                        return (
                          <tr key={m.id} className="hover:bg-zinc-50/60 transition-colors">
                            {/* Member info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex size-9 items-center justify-center rounded-xl text-xs font-black shrink-0 ${
                                    isSuperAdmin
                                      ? "bg-amber-500 text-white shadow-xs"
                                      : "bg-zinc-900 text-white"
                                  }`}
                                >
                                  {m.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-zinc-900 text-xs truncate">{m.name}</span>
                                    {isSuperAdmin && (
                                      <Crown className="size-3.5 text-amber-500 shrink-0" title="Super Admin" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                                    <Mail className="size-3 text-zinc-400 shrink-0" />
                                    <span className="truncate max-w-[170px]">{m.email}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                                    <Phone className="size-2.5 text-zinc-400 shrink-0" />
                                    <span>{m.phone}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                  isSuperAdmin
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : m.role.includes("Operations")
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : m.role.includes("Fleet")
                                    ? "bg-sky-50 text-sky-800 border border-sky-200"
                                    : m.role.includes("Support")
                                    ? "bg-purple-50 text-purple-800 border border-purple-200"
                                    : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                                }`}
                              >
                                {m.role}
                              </span>
                            </td>

                            {/* Territory Hub */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-semibold">
                                <Building className="size-3.5 text-zinc-400 shrink-0" />
                                <span className="truncate max-w-[130px]">{m.scope || "All India Hubs"}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <StatusPill value={m.status} />
                            </td>

                            {/* Permissions Summary */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold ${
                                      grantedCount >= 10
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : grantedCount >= 5
                                        ? "bg-sky-50 text-sky-800 border-sky-200"
                                        : "bg-zinc-100 text-zinc-700 border-zinc-200"
                                    }`}
                                  >
                                    {isSuperAdmin ? "14 / 14 All Modules" : `${grantedCount} / 14 Modules`}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {(m.permissions || []).slice(0, 3).map((p) => (
                                    <span
                                      key={p}
                                      className="rounded bg-zinc-100 px-1 py-0.2 text-[9px] font-bold text-zinc-600 uppercase"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                  {(m.permissions || []).length > 3 && (
                                    <span className="text-[9px] font-bold text-zinc-400">
                                      +{(m.permissions || []).length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Last Activity */}
                            <td className="py-3.5 px-4 text-xs text-zinc-500 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Clock className="size-3 text-zinc-400 shrink-0" />
                                <span>{m.lastActive || "Recently"}</span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border-zinc-200"
                                  onClick={() => setEditingStaff(m)}
                                  title="Edit Staff & Permissions"
                                >
                                  <Edit3 className="size-3.5 mr-1 text-emerald-600" />
                                  <span>Edit</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                                  onClick={() => handleInspectStaffLogs(m.name)}
                                  title="Inspect Audit Logs"
                                >
                                  <Activity className="size-3.5 text-zinc-500" />
                                </Button>

                                {!isSuperAdmin && (
                                  <>
                                    {isSuspended ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2 rounded-xl text-xs font-bold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                                        onClick={() => statusMutation.mutate({ id: m.id, status: "Active" })}
                                        title="Reactivate Staff Account"
                                      >
                                        <UserCheck className="size-3.5" />
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2 rounded-xl text-xs font-bold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
                                        onClick={() => statusMutation.mutate({ id: m.id, status: "Suspended" })}
                                        title="Suspend Staff Account"
                                      >
                                        <UserX className="size-3.5" />
                                      </Button>
                                    )}

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => setDeletingStaff(m)}
                                      title="Revoke All Access"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 2: GRID CARDS VIEW */}
            {viewMode === "grid" && filteredStaff.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStaff.map((m) => {
                  const isSuperAdmin = m.role === "Super Admin";
                  const isSuspended = m.status === "Suspended";
                  const grantedCount = m.permissions?.length || (isSuperAdmin ? 14 : 0);

                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-zinc-200/90 bg-white p-5 space-y-4 shadow-xs hover:border-zinc-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Header: Avatar, Name, Role badge, Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-11 items-center justify-center rounded-2xl font-black text-sm shadow-xs shrink-0 ${
                                isSuperAdmin ? "bg-amber-500 text-white" : "bg-zinc-900 text-white"
                              }`}
                            >
                              {m.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5 truncate">
                                <span>{m.name}</span>
                                {isSuperAdmin && <Crown className="size-3.5 text-amber-500 shrink-0" />}
                              </h4>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase mt-1 tracking-wider ${
                                  isSuperAdmin
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : m.role.includes("Operations")
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : m.role.includes("Fleet")
                                    ? "bg-sky-50 text-sky-800 border border-sky-200"
                                    : m.role.includes("Support")
                                    ? "bg-purple-50 text-purple-800 border border-purple-200"
                                    : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                                }`}
                              >
                                {m.role}
                              </span>
                            </div>
                          </div>

                          <StatusPill value={m.status} />
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1.5 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                          <p className="flex items-center gap-2">
                            <Mail className="size-3 text-zinc-400 shrink-0" />
                            <span className="font-semibold text-zinc-800 truncate">{m.email}</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="size-3 text-zinc-400 shrink-0" />
                            <span className="font-medium text-zinc-700">{m.phone}</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <Building className="size-3 text-zinc-400 shrink-0" />
                            <span className="font-medium text-zinc-700">{m.scope || "All India Hubs"}</span>
                          </p>
                          <p className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <Clock className="size-3 shrink-0" />
                            <span>Last Active: {m.lastActive || "Recently"}</span>
                          </p>
                        </div>

                        {/* Permissions pills */}
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              Granted Modules ({grantedCount}):
                            </Label>
                            <button
                              type="button"
                              onClick={() => setEditingStaff(m)}
                              className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                            >
                              <Sliders className="size-2.5" />
                              <span>Configure</span>
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {(m.permissions || []).map((perm) => (
                              <span
                                key={perm}
                                className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-700 uppercase"
                              >
                                {perm}
                              </span>
                            ))}
                            {(!m.permissions || m.permissions.length === 0) && (
                              <span className="text-[10px] text-zinc-400 italic">No modules granted</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 flex-1 rounded-xl text-xs font-bold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                          onClick={() => setEditingStaff(m)}
                        >
                          <Edit3 className="size-3 mr-1 text-emerald-600" />
                          <span>Edit & Access</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                          onClick={() => handleInspectStaffLogs(m.name)}
                          title="View Audit Trail"
                        >
                          <Activity className="size-3 text-zinc-500" />
                        </Button>

                        {!isSuperAdmin && (
                          <>
                            {isSuspended ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 rounded-xl text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => statusMutation.mutate({ id: m.id, status: "Active" })}
                                title="Reactivate Staff Account"
                              >
                                <UserCheck className="size-3.5" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 rounded-xl text-xs font-semibold text-amber-700 border-amber-200 hover:bg-amber-50"
                                onClick={() => statusMutation.mutate({ id: m.id, status: "Suspended" })}
                                title="Suspend Staff Account"
                              >
                                <UserX className="size-3.5" />
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                              onClick={() => setDeletingStaff(m)}
                              title="Revoke Staff Access"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            4. TAB 2: RBAC PERMISSIONS MATRIX
        ========================================================================= */}
        {activeTab === "matrix" && (
          <SectionCard
            title="Granular Role-Based Access Control (RBAC) Matrix"
            description="Complete comparative permission boundary across QuickPress operator tiers."
          >
            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-700">
                  <tr>
                    <th className="py-3 px-4 font-bold">Platform Capability & Module</th>
                    <th className="py-3 px-4 font-bold text-center">Super Admin</th>
                    <th className="py-3 px-4 font-bold text-center">Operations Admin</th>
                    <th className="py-3 px-4 font-bold text-center">Fleet Dispatch</th>
                    <th className="py-3 px-4 font-bold text-center">Support Lead</th>
                    <th className="py-3 px-4 font-bold text-center">Finance Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {CATEGORIES.map((cat) => (
                    <div key={cat} className="contents">
                      <tr className="bg-zinc-100/70">
                        <td colSpan={6} className="py-2 px-4 font-black text-[10px] uppercase text-zinc-500 tracking-wider">
                          {cat}
                        </td>
                      </tr>
                      {ALL_PERMISSIONS.filter((p) => p.category === cat).map((p) => {
                        const opsHas = ROLE_PRESETS["Operations Admin"].permissions.includes(p.key);
                        const fleetHas = ROLE_PRESETS["Fleet Dispatch Manager"].permissions.includes(p.key);
                        const supportHas = ROLE_PRESETS["Support Lead"].permissions.includes(p.key);
                        const finHas = ROLE_PRESETS["Finance & Settlements Lead"].permissions.includes(p.key);

                        return (
                          <tr key={p.key} className="hover:bg-zinc-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-bold text-zinc-900">{p.label}</p>
                              <p className="text-[11px] text-zinc-400">{p.description}</p>
                            </td>

                            {/* Super Admin */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center">
                                <Check className="size-4 text-emerald-600 stroke-[3]" />
                              </div>
                            </td>

                            {/* Operations Admin */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center">
                                {opsHas ? (
                                  <Check className="size-4 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <X className="size-4 text-zinc-300" />
                                )}
                              </div>
                            </td>

                            {/* Fleet Dispatch */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center">
                                {fleetHas ? (
                                  <Check className="size-4 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <X className="size-4 text-zinc-300" />
                                )}
                              </div>
                            </td>

                            {/* Support Lead */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center">
                                {supportHas ? (
                                  <Check className="size-4 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <X className="size-4 text-zinc-300" />
                                )}
                              </div>
                            </td>

                            {/* Finance Lead */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center">
                                {finHas ? (
                                  <Check className="size-4 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <X className="size-4 text-zinc-300" />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </div>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* =========================================================================
            5. TAB 3: REAL-TIME SECURITY AUDIT TRAIL
        ========================================================================= */}
        {activeTab === "logs" && (
          <SectionCard
            title="Complete System Action & Audit Timeline"
            description="Track every administrative intervention, status change, wallet adjustment, and dispatch assignment."
          >
            <div className="pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500">Operator:</span>
                  <Select value={selectedStaffLogsActor} onValueChange={setSelectedStaffLogsActor}>
                    <SelectTrigger className="h-8 w-52 rounded-xl bg-zinc-50 text-xs border-zinc-200 font-semibold">
                      <SelectValue placeholder="All Operators" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Operators ({allLogs.length} Events)</SelectItem>
                      {allStaff.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name} ({s.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500">Action:</span>
                  <Select value={selectedStaffLogsAction} onValueChange={setSelectedStaffLogsAction}>
                    <SelectTrigger className="h-8 w-44 rounded-xl bg-zinc-50 text-xs border-zinc-200 font-semibold">
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="auth">Authentication & 2FA</SelectItem>
                      <SelectItem value="staff">Staff RBAC & Grants</SelectItem>
                      <SelectItem value="order">Order Dispatch</SelectItem>
                      <SelectItem value="wallet">Wallet & Finance</SelectItem>
                      <SelectItem value="partner">Partner Approvals</SelectItem>
                      <SelectItem value="support">Support & Helpdesk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(selectedStaffLogsActor !== "all" || selectedStaffLogsAction !== "all") && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedStaffLogsActor("all");
                    setSelectedStaffLogsAction("all");
                  }}
                  className="h-8 text-xs font-bold text-zinc-600 hover:text-zinc-900"
                >
                  <X className="size-3.5 mr-1" /> Clear Filter
                </Button>
              )}
            </div>

            <DataTable
              loading={logs.isLoading}
              rows={filteredLogs}
              emptyMessage="No audit logs match the current filter."
              columns={[
                {
                  key: "at",
                  label: "Timestamp",
                  render: (l) => (
                    <div className="text-xs text-zinc-500">
                      <p className="font-bold text-zinc-700">{l.at?.slice(0, 10)}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{l.at?.slice(11, 19)} UTC</p>
                    </div>
                  ),
                },
                {
                  key: "actor",
                  label: "Admin Operator",
                  render: (l) => (
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-[10px]">
                        {l.actor?.slice(0, 2).toUpperCase() || "OP"}
                      </div>
                      <span className="font-bold text-xs text-zinc-900 truncate max-w-[150px]">{l.actor}</span>
                    </div>
                  ),
                },
                {
                  key: "action",
                  label: "Action Performed",
                  render: (l) => {
                    const action = l.action || "action";
                    const isDanger =
                      action.includes("suspend") || action.includes("delete") || action.includes("reject");
                    const isSuccess =
                      action.includes("approve") ||
                      action.includes("create") ||
                      action.includes("login") ||
                      action.includes("verified");

                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono font-bold ${
                          isDanger
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : isSuccess
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-sky-50 text-sky-700 border border-sky-200"
                        }`}
                      >
                        {action}
                      </span>
                    );
                  },
                },
                {
                  key: "target",
                  label: "Target Entity ID",
                  render: (l) => (
                    <span className="font-mono text-xs font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded">
                      {l.target || "—"}
                    </span>
                  ),
                },
                {
                  key: "meta",
                  label: "Audit Metadata / Context",
                  render: (l) => {
                    const meta = l.meta || {};
                    const entries = Object.entries(meta);
                    if (entries.length === 0) return <span className="text-[10px] text-zinc-400">—</span>;
                    return (
                      <div className="text-[10px] text-zinc-600 font-mono">
                        {entries.map(([k, v]) => (
                          <span key={k} className="mr-2">
                            <strong>{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    );
                  },
                },
              ]}
            />
          </SectionCard>
        )}

        {/* =========================================================================
            6. TAB 4: TERRITORY DISTRIBUTION
        ========================================================================= */}
        {activeTab === "territory" && (
          <SectionCard
            title="Territory & Regional Scope Assignment"
            description="Operator jurisdiction and cluster assignments across active laundry market hubs."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Building className="size-5" />
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    Primary Operational Hub
                  </Badge>
                </div>
                <div>
                  <h4 className="text-base font-black text-zinc-900">Kasganj Market Hub</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Main laundry facility cluster covering Bilram Gate, Soron Gate, Nadrai Gate, and Railway Road.
                  </p>
                </div>
                <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-600">
                  <span className="font-bold text-zinc-900">
                    {allStaff.filter((s) => s.scope?.includes("Kasganj")).length} Assigned Operators
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                    <MapPin className="size-5" />
                  </div>
                  <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px] font-bold">
                    Express Expansion Division
                  </Badge>
                </div>
                <div>
                  <h4 className="text-base font-black text-zinc-900">Aligarh Division</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Civil Lines, Ramghat Road, Centre Point, and university campus pickup clusters.
                  </p>
                </div>
                <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-600">
                  <span className="font-bold text-zinc-900">
                    {allStaff.filter((s) => s.scope?.includes("Aligarh")).length} Assigned Operators
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <ShieldCheck className="size-5" />
                  </div>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">
                    Headquarters
                  </Badge>
                </div>
                <div>
                  <h4 className="text-base font-black text-zinc-900">All India & HQ</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Nationwide governance, platform commissions, payment gateways, and global catalog.
                  </p>
                </div>
                <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-600">
                  <span className="font-bold text-zinc-900">
                    {allStaff.filter((s) => !s.scope || s.scope.includes("All India")).length} Assigned Operators
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* =========================================================================
            7. TAB 5: CLOUDFLARE ZERO TRUST SSO
        ========================================================================= */}
        {activeTab === "cloudflare" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                    <Cloud className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-zinc-900">
                        Cloudflare Zero Trust (Access Groups & SSO) Active
                      </h3>
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold">100% Shielded</Badge>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1 max-w-2xl leading-relaxed font-medium">
                      Administrative traffic to <span className="font-mono font-bold text-zinc-900">ops.withquickpress.com</span> is inspected at Cloudflare's perimeter.
                      Corporate team members authenticate via Cloudflare Email OTP and are automatically bound to live database RBAC roles without storing passwords.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const emails = allStaff.filter((s) => s.status === "Active").map((s) => s.email).join(", ");
                      navigator.clipboard.writeText(emails);
                      toast.success(
                        `Copied ${allStaff.filter((s) => s.status === "Active").length} active staff emails to clipboard!`
                      );
                    }}
                    className="h-9 rounded-xl border-amber-300 bg-white text-xs font-bold text-amber-900 hover:bg-amber-50"
                  >
                    <Copy className="size-3.5 mr-1.5" />
                    <span>Copy Emails for Access Group</span>
                  </Button>

                  <a
                    href="https://one.dash.cloudflare.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-bold text-white hover:bg-black transition-all"
                  >
                    <span>Cloudflare Zero Trust Dash</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <SectionCard
              title="Cloudflare Access Group Members (Live Database Directory)"
              description="These corporate accounts have authorized perimeter clearance and real-time database RBAC role mapping."
            >
              <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
                {allStaff.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-50/50 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                        {member.name.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-zinc-900">{member.name}</h4>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              member.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {member.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-0.5">
                          <Mail className="size-3" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-xs font-bold text-zinc-800 block">{member.role}</span>
                        <span className="text-[10px] text-zinc-400 block">{member.scope || "All India Hubs"}</span>
                      </div>
                      <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1">
                        <Cloud className="size-3 text-amber-600" />
                        <span>SSO Protected</span>
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* =========================================================================
            8. EDIT STAFF & ACCESS-WISE MODAL ("edit bhi acces wise")
        ========================================================================= */}
        {editingStaff && (
          <EditStaffDialog
            staff={editingStaff}
            onClose={() => setEditingStaff(null)}
          />
        )}

        {/* =========================================================================
            9. REVOKE / DELETE CONFIRMATION DIALOG
        ========================================================================= */}
        {deletingStaff && (
          <Dialog open={Boolean(deletingStaff)} onOpenChange={(o) => !o && setDeletingStaff(null)}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-sm font-black flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="size-4" />
                  <span>Revoke Staff Access</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Are you sure you want to permanently revoke all console access for{" "}
                  <strong className="text-zinc-900">{deletingStaff.name}</strong> ({deletingStaff.email})?
                </DialogDescription>
              </DialogHeader>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
                <p className="font-bold">Security Consequences:</p>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 text-rose-700">
                  <li>Active sessions will be immediately invalidated.</li>
                  <li>FastAPI and Supabase RBAC role bindings will be deleted.</li>
                  <li>Audit trail history will remain permanently in the immutable ledger.</li>
                </ul>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingStaff(null)}
                  className="h-9 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => deleteMutation.mutate(deletingStaff.id)}
                  disabled={deleteMutation.isPending}
                  className="h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs"
                >
                  {deleteMutation.isPending ? "Revoking..." : "Confirm & Revoke Access"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------
   ADD STAFF DIALOG COMPONENT ("staff add kar sake")
------------------------------------------------------------------------- */
function AddStaffDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("Staff@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("Operations Admin");
  const [scope, setScope] = useState("Kasganj Market Hub");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([
    "orders",
    "customers",
    "partners",
    "riders",
    "services",
    "cities",
    "support",
  ]);

  const mutation = useMutation({
    mutationFn: () =>
      inviteStaff({
        name,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role,
        scope,
        permissions: selectedPerms,
        status: "Active",
      }),
    onSuccess: () => {
      toast.success(`Staff Administrator "${name}" onboarded successfully! 🎉`);
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("Staff@2026");
      setRole("Operations Admin");
      setSelectedPerms(ROLE_PRESETS["Operations Admin"].permissions);
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to onboard staff member."),
  });

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    if (ROLE_PRESETS[newRole]) {
      setSelectedPerms(ROLE_PRESETS[newRole].permissions);
      toast.info(`Loaded standard permissions for ${newRole}`);
    }
  };

  const togglePermission = (key: string) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "QP_";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    navigator.clipboard.writeText(pwd);
    toast.success("Strong password generated and copied to clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs">
          <UserPlus className="size-3.5 mr-1.5" />
          <span>Onboard Staff Admin</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <UserPlus className="size-5 text-emerald-600" />
            <span>Onboard New Staff Administrator</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Create an administrative account, assign operational role, and configure granular module permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Section 1: Personal & Corporate Info */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-3">
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="size-3.5 text-zinc-500" />
              <span>1. Operator Identity</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Full Name *</Label>
                <Input
                  placeholder="e.g. Rajesh Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs font-semibold bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Official Business Email *</Label>
                <Input
                  type="email"
                  placeholder="rajesh.ops@quickpress.online"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Contact Phone Number</Label>
                <Input
                  placeholder="+91 98719 62596"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs bg-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Initial Password</Label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <KeyRound className="size-2.5" /> Generate Strong
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Staff@2026"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 text-xs bg-white pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Role & Jurisdiction */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-3">
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="size-3.5 text-zinc-500" />
              <span>2. Security Role & Territory Jurisdiction</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Assigned Security Role</Label>
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="h-9 text-xs bg-white font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Super Admin">Super Admin (All Modules)</SelectItem>
                    <SelectItem value="Operations Admin">Operations Admin</SelectItem>
                    <SelectItem value="Fleet Dispatch Manager">Fleet Dispatch Manager</SelectItem>
                    <SelectItem value="Support Lead">Support Lead</SelectItem>
                    <SelectItem value="Finance & Settlements Lead">Finance & Settlements Lead</SelectItem>
                    <SelectItem value="Store Partner Lead">Store Partner Lead</SelectItem>
                  </SelectContent>
                </Select>
                {ROLE_PRESETS[role] && (
                  <p className="text-[11px] text-zinc-500 mt-1">{ROLE_PRESETS[role].desc}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Territory Jurisdiction</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger className="h-9 text-xs bg-white font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All India Hubs">All India Hubs (HQ / Nationwide)</SelectItem>
                    <SelectItem value="Kasganj Market Hub">Kasganj Market Hub (Central)</SelectItem>
                    <SelectItem value="Aligarh Division">Aligarh Division (Express)</SelectItem>
                    <SelectItem value="Delhi NCR">Delhi NCR</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-zinc-500 mt-1">Defines operator visibility scope.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Granular Permissions Checklist ("acces wise") */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="size-3.5 text-emerald-600" />
                  <span>3. Granular Access Modules ({selectedPerms.length} of {ALL_PERMISSIONS.length})</span>
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Toggle individual access boundaries or select quick presets.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPerms(ALL_PERMISSIONS.map((p) => p.key))}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg hover:bg-emerald-100"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPerms([])}
                  className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg hover:bg-rose-100"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Grouped Permission Tiles */}
            <div className="space-y-3">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                    {cat}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.filter((p) => p.category === cat).map((p) => {
                      const checked = selectedPerms.includes(p.key);
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => togglePermission(p.key)}
                          className={`flex items-start justify-between p-2.5 rounded-xl border text-left transition-all ${
                            checked
                              ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          <div className="pr-2">
                            <p className="font-bold text-xs">{p.label}</p>
                            <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">{p.description}</p>
                          </div>
                          {checked ? (
                            <CheckSquare className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="size-4 text-zinc-300 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-9 rounded-xl text-xs font-semibold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || !email.trim() || mutation.isPending}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
          >
            {mutation.isPending ? "Onboarding Staff..." : "Onboard Staff Administrator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------
   EDIT STAFF DIALOG COMPONENT ("edit bhi acces wise")
------------------------------------------------------------------------- */
function EditStaffDialog({ staff, onClose }: { staff: StaffMember; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(staff.name || "");
  const [phone, setPhone] = useState(staff.phone || "");
  const [role, setRole] = useState(staff.role || "Operations Admin");
  const [scope, setScope] = useState(staff.scope || "Kasganj Market Hub");
  const [status, setStatus] = useState<StaffMember["status"]>(staff.status || "Active");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [perms, setPerms] = useState<string[]>(
    staff.permissions && staff.permissions.length > 0
      ? staff.permissions
      : ROLE_PRESETS[staff.role]?.permissions || ["orders", "partners", "riders", "support"]
  );

  const [roleChanged, setRoleChanged] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      // 1. Update staff details
      await updateStaff(staff.id, {
        name,
        phone,
        role,
        scope,
        status,
        permissions: perms,
        password: password.trim() ? password.trim() : undefined,
      });
      // 2. Explicitly update permissions endpoint for safety
      await updateStaffPermissions(staff.id, perms);
    },
    onSuccess: () => {
      toast.success(`Staff Administrator "${name}" and access boundaries updated! 🛡️`);
      onClose();
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update staff member."),
  });

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setRoleChanged(true);
  };

  const applyRolePreset = (presetRole: string) => {
    if (ROLE_PRESETS[presetRole]) {
      setPerms(ROLE_PRESETS[presetRole].permissions);
      toast.info(`Applied standard permission matrix for ${presetRole}`);
      setRoleChanged(false);
    }
  };

  const togglePermission = (key: string) => {
    setPerms((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "QP_";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    navigator.clipboard.writeText(pwd);
    toast.success("New password generated and copied to clipboard!");
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-white font-black text-sm">
              {staff.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <span>Edit Staff Member & Access Controls</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                <span className="font-mono text-zinc-700">{staff.email}</span>
                <span className="text-zinc-300">•</span>
                <StatusPill value={staff.status} />
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Section 1: Basic Info */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-3">
            <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="size-3.5 text-zinc-500" />
              <span>Operator Profile & Status</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs font-semibold bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Corporate Email (Identity Locked)</Label>
                <div className="relative">
                  <Input
                    value={staff.email}
                    disabled
                    className="h-9 text-xs bg-zinc-100 font-mono text-zinc-500 pr-8"
                  />
                  <Lock className="size-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-9 text-xs bg-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Account Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger className="h-9 text-xs bg-white font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active (Permitted)</SelectItem>
                    <SelectItem value="Suspended">Suspended (Blocked)</SelectItem>
                    <SelectItem value="Pending Verification">Pending OTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Territory Scope</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger className="h-9 text-xs bg-white font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All India Hubs">All India Hubs</SelectItem>
                    <SelectItem value="Kasganj Market Hub">Kasganj Market Hub</SelectItem>
                    <SelectItem value="Aligarh Division">Aligarh Division</SelectItem>
                    <SelectItem value="Delhi NCR">Delhi NCR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional Password Reset */}
            <div className="pt-2 border-t border-zinc-200">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-bold text-zinc-700">
                  Reset Password <span className="font-normal text-zinc-400">(leave blank to keep existing)</span>
                </Label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <KeyRound className="size-2.5" /> Generate New
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password to reset..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 text-xs bg-white pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Role & Access Boundaries ("edit bhi acces wise") */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="size-3.5 text-emerald-600" />
                  <span>Security Role & Granular RBAC Grants</span>
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Assigned permissions directly govern which modules this operator can view and edit.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select value={role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="h-8 w-48 text-xs bg-white font-bold border-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                    <SelectItem value="Operations Admin">Operations Admin</SelectItem>
                    <SelectItem value="Fleet Dispatch Manager">Fleet Dispatch Manager</SelectItem>
                    <SelectItem value="Support Lead">Support Lead</SelectItem>
                    <SelectItem value="Finance & Settlements Lead">Finance & Settlements Lead</SelectItem>
                    <SelectItem value="Store Partner Lead">Store Partner Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Role Change Banner Alert */}
            {roleChanged && ROLE_PRESETS[role] && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-900">
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle className="size-4 text-amber-600 shrink-0" />
                  <span>
                    Role changed to <strong>{role}</strong>. Would you like to sync default permissions?
                  </span>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => applyRolePreset(role)}
                  className="h-7 text-xs font-bold border-amber-300 bg-white hover:bg-amber-100 text-amber-900"
                >
                  Apply Role Defaults
                </Button>
              </div>
            )}

            {/* Quick Action Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-xl border border-zinc-200">
              <span className="text-[11px] font-bold text-zinc-600">
                Granted Modules: <strong className="text-emerald-700">{perms.length} of {ALL_PERMISSIONS.length}</strong>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPerms(ALL_PERMISSIONS.map((p) => p.key))}
                  className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => applyRolePreset(role)}
                  className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded hover:bg-zinc-200"
                >
                  Reset to Role Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setPerms([])}
                  className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded hover:bg-rose-100"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Interactive Module Checklist */}
            <div className="space-y-3 pt-1">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                    {cat}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.filter((p) => p.category === cat).map((p) => {
                      const isChecked = perms.includes(p.key);
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => togglePermission(p.key)}
                          className={`flex items-start justify-between p-2.5 rounded-xl border text-left transition-all ${
                            isChecked
                              ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs"
                              : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                          }`}
                        >
                          <div className="pr-2">
                            <p className="font-bold text-xs">{p.label}</p>
                            <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">{p.description}</p>
                          </div>
                          {isChecked ? (
                            <CheckSquare className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="size-4 text-zinc-300 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 rounded-xl text-xs font-semibold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
          >
            {mutation.isPending ? "Saving Changes..." : "Save Staff & Access Updates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
