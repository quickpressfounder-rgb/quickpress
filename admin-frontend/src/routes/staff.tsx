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

export const Route = createFileRoute("/staff")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Staff & RBAC Governance Engine",
      "Manage Operations Admins, configure granular RBAC permission boundaries, and review real-time security audit trails."
    ),
  component: StaffPage,
});

const ALL_PERMISSIONS = [
  { key: "orders", label: "Orders & Live Dispatch", module: "Dispatch" },
  { key: "customers", label: "Customer 360 & Profiles", module: "Users" },
  { key: "partners", label: "Approve & Manage Partner Stores", module: "Stores" },
  { key: "riders", label: "Fleet Governance & Rider KYC", module: "Captains" },
  { key: "services", label: "Master Service Catalog & Pricing", module: "Catalog" },
  { key: "finance", label: "Wallet Adjustments & Settlements", module: "Finance" },
  { key: "cities", label: "Operating Cities & Geo-Zones", module: "Geo-Engine" },
  { key: "coupons", label: "Coupons & Marketing Campaigns", module: "Marketing" },
  { key: "memberships", label: "VIP Membership Tiers & MRR", module: "Growth" },
  { key: "analytics", label: "Analytics & Executive KPI Trends", module: "Intelligence" },
  { key: "notifications", label: "System Alerts & Push Broadcasts", module: "Engagement" },
  { key: "support", label: "Omnichannel Helpdesk & Tickets", module: "Support" },
  { key: "staff", label: "Staff Onboarding & RBAC Grants", module: "Administration" },
  { key: "settings", label: "Platform & Security Settings", module: "Governance" },
];

export function StaffPage() {
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["admin", "staff"], queryFn: fetchStaff });
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: fetchRoles });
  const logs = useQuery({ queryKey: ["admin", "activity-logs"], queryFn: () => fetchActivityLogs() });

  const [activeTab, setActiveTab] = useState<"staff" | "logs" | "rbac" | "territory">("staff");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStaffLogsActor, setSelectedStaffLogsActor] = useState<string>("all");
  const [selectedStaffLogsAction, setSelectedStaffLogsAction] = useState<string>("all");

  // Permission Modal State
  const [permStaff, setPermStaff] = useState<StaffMember | null>(null);
  const [editedPerms, setEditedPerms] = useState<string[]>([]);

  const allStaff = staff.data ?? [];
  const allRoles = roles.data ?? [];
  const allLogs = logs.data ?? [];

  const metrics = useMemo(() => {
    const total = allStaff.length;
    const active = allStaff.filter((s) => s.status === "Active").length;
    const pending = allStaff.filter((s) => s.status.includes("Pending")).length;
    const totalRoles = allRoles.length || 5;
    const totalLogs = allLogs.length || 1;
    return { total, active, pending, totalRoles, totalLogs };
  }, [allStaff, allRoles, allLogs]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allStaff.filter((s) => {
      const matchQuery = !q || [s.name, s.email, s.phone, s.role, s.scope].join(" ").toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || s.role.toLowerCase() === roleFilter.toLowerCase();
      const matchStatus = statusFilter === "all" || s.status.toLowerCase() === statusFilter.toLowerCase();
      return matchQuery && matchRole && matchStatus;
    });
  }, [allStaff, searchQuery, roleFilter, statusFilter]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((l) => {
      const matchActor = selectedStaffLogsActor === "all" || l.actor.toLowerCase().includes(selectedStaffLogsActor.toLowerCase());
      const matchAction = selectedStaffLogsAction === "all" || l.action.toLowerCase().includes(selectedStaffLogsAction.toLowerCase());
      return matchActor && matchAction;
    });
  }, [allLogs, selectedStaffLogsActor, selectedStaffLogsAction]);

  // Mutations
  const permissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      updateStaffPermissions(id, permissions),
    onSuccess: () => {
      toast.success("Granular permissions updated successfully! 🛡️");
      setPermStaff(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update permissions"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateStaffStatus(id, status),
    onSuccess: (_, vars) => {
      toast.success(`Staff status changed to "${vars.status}"!`);
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => {
      toast.success("Staff access revoked & removed.");
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete staff member"),
  });

  const handleOpenPermModal = (member: StaffMember) => {
    setPermStaff(member);
    setEditedPerms(member.permissions || ["orders", "partners", "riders", "support"]);
  };

  const togglePermissionItem = (key: string) => {
    setEditedPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleInspectStaffLogs = (actorName: string) => {
    setSelectedStaffLogsActor(actorName);
    setActiveTab("logs");
    toast.info(`Filtering audit trail for "${actorName}"`);
  };

  return (
    <AdminShell
      title="Staff & Operations Admin RBAC Engine"
      subtitle="Onboard Operations Admins, configure granular security role matrices, and inspect full real-time activity audit trails."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              staff.refetch();
              roles.refetch();
              logs.refetch();
              toast.success("Staff directory & audit logs refreshed!");
            }}
            disabled={staff.isRefetching}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${staff.isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <OnboardStaffDialog />
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP METRIC CARDS (6 METRICS)
        ========================================================================= */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            kpi={{
              id: "tot-staff",
              label: "Team Operators",
              value: `${metrics.total} Members`,
              hint: `${metrics.active} active platform admins`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "act-admins",
              label: "Active Staff",
              value: `${metrics.active} Active`,
              hint: `${metrics.pending} pending approvals`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "roles-count",
              label: "Security Roles",
              value: `${metrics.totalRoles} RBAC Tiers`,
              hint: "Granular access matrices",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "audit-records",
              label: "Audit Trail Records",
              value: `${metrics.totalLogs} Logged Events`,
              hint: "Immutable system ledger",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "two-factor",
              label: "2FA Verification",
              value: "100% Enforced",
              hint: "Business email + OTP",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "territory-scope",
              label: "Corporate Scope",
              value: "Enterprise Hubs",
              hint: "Domain protected access",
              positive: true,
            }}
          />
        </div>

        {/* =========================================================================
            2. MAIN TABS NAVIGATION
        ========================================================================= */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger value="staff" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  👥 Team Directory & Staff ({allStaff.length})
                </TabsTrigger>
                <TabsTrigger value="logs" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  📜 Real-Time Security & Action Audit Trail ({allLogs.length})
                </TabsTrigger>
                <TabsTrigger value="rbac" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🛡️ RBAC Permissions Matrix ({allRoles.length || 5})
                </TabsTrigger>
                <TabsTrigger value="territory" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🏢 Territory Distribution
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Full Audit Transparency</span>
            </div>
          </div>
        </SectionCard>

        {/* =========================================================================
            3. TAB 1: TEAM DIRECTORY & ACTIVE ADMINS
        ========================================================================= */}
        {activeTab === "staff" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff by name, business email, role..."
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 w-44 rounded-xl bg-white text-xs border-zinc-200">
                    <SelectValue placeholder="Filter Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super admin">👑 Super Admin</SelectItem>
                    <SelectItem value="operations admin">⚙️ Operations Admin</SelectItem>
                    <SelectItem value="fleet dispatch manager">🚴 Fleet Dispatch</SelectItem>
                    <SelectItem value="support lead">🎧 Support Lead</SelectItem>
                    <SelectItem value="finance & settlements lead">💳 Finance Lead</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36 rounded-xl bg-white text-xs border-zinc-200">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending verification">Pending OTP</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-2xl bg-zinc-900 text-white font-black text-sm shadow-xs">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                            {m.name}
                            {m.role === "Super Admin" && <span className="text-amber-500 text-xs">👑</span>}
                          </h4>
                          <span
                            className={`inline-block rounded-full px-2 py-0.2 text-[9px] font-black uppercase mt-0.5 ${
                              m.role === "Super Admin"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : m.role === "Operations Admin"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-sky-50 text-sky-800 border border-sky-200"
                            }`}
                          >
                            {m.role}
                          </span>
                        </div>
                      </div>

                      <StatusPill value={m.status} />
                    </div>

                    <div className="space-y-1.5 text-xs text-zinc-600 pt-2 border-t border-zinc-100">
                      <p className="flex items-center gap-2">
                        <Mail className="size-3 text-zinc-400 shrink-0" />
                        <span className="font-medium text-zinc-800 truncate">{m.email}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="size-3 text-zinc-400 shrink-0" />
                        <span className="font-medium text-zinc-700">{m.phone}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Building className="size-3 text-zinc-400 shrink-0" />
                        <span className="font-medium text-zinc-700">{m.scope}</span>
                      </p>
                      <p className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <Clock className="size-3 shrink-0" />
                        <span>Last Active: {m.lastActive}</span>
                      </p>
                    </div>

                    {/* Permissions list */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Granted Modules ({m.permissions?.length || 0}):
                        </Label>
                        {m.role !== "Super Admin" && (
                          <button
                            type="button"
                            onClick={() => handleOpenPermModal(m)}
                            className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                          >
                            <Sliders className="size-2.5" />
                            <span>Edit RBAC</span>
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {(m.permissions || ["orders", "partners"]).map((perm) => (
                          <span
                            key={perm}
                            className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-700 uppercase"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 rounded-xl text-xs font-bold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                      onClick={() => handleInspectStaffLogs(m.name)}
                    >
                      <Activity className="size-3 mr-1 text-emerald-600" /> View Logs
                    </Button>

                    {m.role !== "Super Admin" && (
                      <>
                        {m.status === "Active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 rounded-xl text-xs font-semibold text-amber-700 border-amber-200 hover:bg-amber-50"
                            onClick={() => statusMutation.mutate({ id: m.id, status: "Suspended" })}
                            title="Suspend Staff"
                          >
                            <UserX className="size-3.5 mr-1" />
                            <span>Suspend</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 rounded-xl text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => statusMutation.mutate({ id: m.id, status: "Active" })}
                            title="Activate Staff"
                          >
                            <UserCheck className="size-3.5 mr-1" />
                            <span>Activate</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                          onClick={() => {
                            if (confirm(`Revoke all platform access for "${m.name}"?`)) {
                              deleteMutation.mutate(m.id);
                            }
                          }}
                          title="Delete Staff"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            4. TAB 2: REAL-TIME SECURITY & ACTION AUDIT TRAIL
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
                    <SelectTrigger className="h-8 w-52 rounded-xl bg-zinc-50 text-xs border-zinc-200">
                      <SelectValue placeholder="All Operators" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌐 All Operators ({allLogs.length} Events)</SelectItem>
                      <SelectItem value="Super Admin">👑 Super Admin</SelectItem>
                      <SelectItem value="admin@quickpress.online">👑 admin@quickpress.online</SelectItem>
                      <SelectItem value="Rajesh Sharma">⚙️ Rajesh Sharma (Ops)</SelectItem>
                      <SelectItem value="Vikram Singh">🚴 Vikram Singh (Fleet)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500">Action:</span>
                  <Select value={selectedStaffLogsAction} onValueChange={setSelectedStaffLogsAction}>
                    <SelectTrigger className="h-8 w-44 rounded-xl bg-zinc-50 text-xs border-zinc-200">
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="auth">🔐 Authentication & 2FA</SelectItem>
                      <SelectItem value="staff">👥 Staff RBAC & Grants</SelectItem>
                      <SelectItem value="order">📦 Order Dispatch</SelectItem>
                      <SelectItem value="wallet">💰 Wallet & Finance</SelectItem>
                      <SelectItem value="partner">🏪 Partner Approvals</SelectItem>
                      <SelectItem value="support">🎧 Support & Helpdesk</SelectItem>
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
                    const isDanger = action.includes("suspend") || action.includes("delete") || action.includes("reject");
                    const isSuccess = action.includes("approve") || action.includes("create") || action.includes("login") || action.includes("verified");

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
            5. TAB 3: RBAC PERMISSIONS MATRIX
        ========================================================================= */}
        {activeTab === "rbac" && (
          <SectionCard
            title="Granular Role-Based Access Control (RBAC) Matrix"
            description="Comparative security permissions boundary across platform operator roles."
          >
            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-700">
                  <tr>
                    <th className="py-3 px-4 font-bold">Platform Capability & Module</th>
                    <th className="py-3 px-4 font-bold text-center">👑 Super Admin</th>
                    <th className="py-3 px-4 font-bold text-center">⚙️ Operations Admin</th>
                    <th className="py-3 px-4 font-bold text-center">🚴 Fleet Dispatch</th>
                    <th className="py-3 px-4 font-bold text-center">🎧 Support Lead</th>
                    <th className="py-3 px-4 font-bold text-center">💳 Finance Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {ALL_PERMISSIONS.map((p) => (
                    <tr key={p.key} className="hover:bg-zinc-50/60">
                      <td className="py-3 px-4">
                        <p className="font-bold text-zinc-900">{p.label}</p>
                        <span className="text-[10px] text-zinc-400 font-medium uppercase">{p.module}</span>
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
                          {["orders", "customers", "partners", "riders", "support", "cities"].includes(p.key) ? (
                            <Check className="size-4 text-emerald-600 stroke-[3]" />
                          ) : (
                            <X className="size-4 text-zinc-300" />
                          )}
                        </div>
                      </td>

                      {/* Fleet Dispatch */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          {["riders", "orders", "cities"].includes(p.key) ? (
                            <Check className="size-4 text-emerald-600 stroke-[3]" />
                          ) : (
                            <X className="size-4 text-zinc-300" />
                          )}
                        </div>
                      </td>

                      {/* Support Lead */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          {["support", "orders", "customers", "coupons"].includes(p.key) ? (
                            <Check className="size-4 text-emerald-600 stroke-[3]" />
                          ) : (
                            <X className="size-4 text-zinc-300" />
                          )}
                        </div>
                      </td>

                      {/* Finance Lead */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          {["finance", "orders", "memberships"].includes(p.key) ? (
                            <Check className="size-4 text-emerald-600 stroke-[3]" />
                          ) : (
                            <X className="size-4 text-zinc-300" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* =========================================================================
            6. TAB 4: TERRITORY DISTRIBUTION
        ========================================================================= */}
        {activeTab === "territory" && (
          <SectionCard title="Territory & Regional Scope Assignment" description="Operator jurisdiction across city market hubs.">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <Building className="size-5 text-emerald-600" />
                  <span className="text-xl font-black text-zinc-900">Kasganj Hub</span>
                </div>
                <h4 className="font-bold text-xs text-zinc-900">Lead Ops: Rajesh Sharma</h4>
                <p className="text-[11px] text-zinc-400">Main market laundry hub, Bilram Gate, Soron Gate, Nadrai Gate.</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <MapPin className="size-5 text-sky-600" />
                  <span className="text-xl font-black text-zinc-900">Aligarh Division</span>
                </div>
                <h4 className="font-bold text-xs text-zinc-900">Dispatch Lead: Vikram Singh</h4>
                <p className="text-[11px] text-zinc-400">Civil Lines, Ramghat Road, Centre Point express clusters.</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <ShieldCheck className="size-5 text-purple-600" />
                  <span className="text-xl font-black text-zinc-900">All India & HQ</span>
                </div>
                <h4 className="font-bold text-xs text-zinc-900">Super Admin: {session?.email || "admin@quickpress.online"}</h4>
                <p className="text-[11px] text-zinc-400">Nationwide governance, platform commissions, global catalog.</p>
              </div>
            </div>
          </SectionCard>
        )}

        {/* =========================================================================
            7. GRANULAR PERMISSION MODAL EDITOR
        ========================================================================= */}
        {permStaff && (
          <Dialog open={Boolean(permStaff)} onOpenChange={(o) => !o && setPermStaff(null)}>
            <DialogContent className="max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-sm font-black flex items-center gap-2">
                  <Sliders className="size-4 text-emerald-600" />
                  <span>Configure Granular Permissions for {permStaff.name}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500">
                  Select which platform modules this staff administrator has authority to access and manage.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  <span className="font-bold text-zinc-700">Quick Presets:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditedPerms(ALL_PERMISSIONS.map((p) => p.key))}
                      className="text-[10px] font-bold text-emerald-700 hover:underline px-2 py-0.5 rounded bg-emerald-50"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditedPerms(["orders", "partners", "riders", "support"])}
                      className="text-[10px] font-bold text-zinc-700 hover:underline px-2 py-0.5 rounded bg-zinc-200"
                    >
                      Ops Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditedPerms([])}
                      className="text-[10px] font-bold text-red-700 hover:underline px-2 py-0.5 rounded bg-red-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map((p) => {
                    const isChecked = editedPerms.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => togglePermissionItem(p.key)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                          isChecked
                            ? "border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-xs"
                            : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        <div>
                          <p className="font-bold">{p.label}</p>
                          <span className="text-[9px] uppercase text-zinc-400 font-bold">{p.module}</span>
                        </div>
                        {isChecked ? (
                          <CheckSquare className="size-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="size-4 text-zinc-300 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setPermStaff(null)} className="h-9 rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    permissionsMutation.mutate({
                      id: permStaff.id,
                      permissions: editedPerms,
                    })
                  }
                  disabled={permissionsMutation.isPending}
                  className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
                >
                  {permissionsMutation.isPending ? "Saving..." : "Save Permission Grants"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AdminShell>
  );
}

function OnboardStaffDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("Staff@2026");
  const [role, setRole] = useState("Operations Admin");
  const [scope, setScope] = useState("Kasganj Market Hub");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([
    "orders",
    "customers",
    "partners",
    "riders",
    "support",
  ]);

  const mutation = useMutation({
    mutationFn: () =>
      inviteStaff({
        name,
        email,
        phone,
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
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "activity-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to onboard staff member."),
  });

  const togglePermission = (key: string) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs">
          <UserPlus className="size-3.5 mr-1.5" />
          <span>Onboard Staff Admin</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black">Onboard Operations Admin / Team Member</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Create an administrative account with role-specific access boundaries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Full Name</Label>
            <Input
              placeholder="e.g. Rajesh Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Corporate Business Email</Label>
              <Input
                placeholder="rajesh.ops@quickpress.online"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Phone Number</Label>
              <Input
                placeholder="+91 98112 34567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Initial Password</Label>
              <Input
                type="text"
                placeholder="Staff@2026"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Security Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operations Admin">⚙️ Operations Admin</SelectItem>
                  <SelectItem value="Fleet Dispatch Manager">🚴 Fleet Dispatch Manager</SelectItem>
                  <SelectItem value="Support Lead">🎧 Support Lead</SelectItem>
                  <SelectItem value="Finance & Settlements Lead">💳 Finance & Settlements Lead</SelectItem>
                  <SelectItem value="Super Admin">👑 Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Territory Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Kasganj Market Hub">Kasganj Market Hub</SelectItem>
                <SelectItem value="Aligarh Division">Aligarh Division</SelectItem>
                <SelectItem value="Delhi NCR">Delhi NCR</SelectItem>
                <SelectItem value="All India Hubs">All India Hubs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-bold">Assigned Permissions</Label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              {ALL_PERMISSIONS.map((p) => {
                const checked = selectedPerms.includes(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePermission(p.key)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left text-[11px] font-medium transition-colors ${
                      checked
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    <span>{p.label}</span>
                    {checked && <Check className="size-3 text-emerald-600 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-9 rounded-xl text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!name || !email || mutation.isPending}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
          >
            {mutation.isPending ? "Onboarding..." : "Onboard Staff Admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
