import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Gift,
  Search,
  Download,
  Users,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Share2,
  IndianRupee,
  Sliders,
  Plus,
  Store,
  Bike,
  UserCheck,
  Building2,
  Check,
  X,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Trash2,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  fetchMultiRoleReferralOverview,
  upsertMultiRoleReferralRule,
  deleteMultiRoleReferralRule,
  type MultiRoleReferralRule,
  type MultiRoleReferralLedgerItem,
  type MultiRoleType,
} from "../api/coupons";
import { fetchCities, type CityIntelligence } from "../api/cities";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/referrals")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Multi-Role Referral System — Admin Console",
      "Unified management of Partner, Rider, and Customer referral rules, order milestone targets, and weekly settlement cycle credits."
    ),
  component: ReferralsPage,
});

export function ReferralsPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<MultiRoleType | "all">("partner");
  const [selectedCity, setSelectedCity] = useState<string>("All Cities");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Form state for creating/editing a referral rule
  const [ruleForm, setRuleForm] = useState<{
    id?: string;
    role: MultiRoleType;
    city: string;
    referrerReward: number;
    targetOrdersCount: number;
    minOrderValue: number;
    headline: string;
    subheadline: string;
    enabled: boolean;
  }>({
    role: "partner",
    city: "All Cities",
    referrerReward: 500,
    targetOrdersCount: 10,
    minOrderValue: 199,
    headline: "Refer a Partner & Earn ₹500",
    subheadline: "Unlocked after referred partner completes 10 orders",
    enabled: true,
  });

  // Query cities for city-specific referral rules
  const { data: citiesList = [] } = useQuery<CityIntelligence[]>({
    queryKey: ["admin", "cities-list"],
    queryFn: fetchCities,
    staleTime: 5 * 60 * 1000,
  });

  const availableCities = useMemo(() => {
    const list = ["All Cities"];
    citiesList.forEach((c) => {
      if (c.name && !list.includes(c.name)) list.push(c.name);
    });
    // Default major metro fallback
    const defaults = ["Delhi NCR", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Kolkata", "Jaipur", "Ahmedabad", "Chandigarh"];
    defaults.forEach((c) => {
      if (!list.includes(c)) list.push(c);
    });
    return list;
  }, [citiesList]);

  // Master Query: Multi-role referral rules, live ledger, and KPIs
  const {
    data: overview,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin", "multi-role-referral-overview", selectedRole, selectedCity, selectedStatus],
    queryFn: () =>
      fetchMultiRoleReferralOverview({
        role: selectedRole === "all" ? undefined : selectedRole,
        city: selectedCity === "All Cities" ? undefined : selectedCity,
        status: selectedStatus === "all" ? undefined : selectedStatus,
      }),
  });

  const rules = overview?.rules ?? [];
  const ledger = overview?.ledger ?? [];
  const stats = overview?.stats;

  // Mutation: Upsert referral rule
  const upsertRuleMutation = useMutation({
    mutationFn: (payload: Partial<MultiRoleReferralRule>) => upsertMultiRoleReferralRule(payload),
    onSuccess: (saved) => {
      toast.success(`Referral rule saved for ${saved.role.toUpperCase()} (${saved.city})`);
      setIsRuleModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "multi-role-referral-overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save referral rule");
    },
  });

  // Mutation: Delete referral rule
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteMultiRoleReferralRule(ruleId),
    onSuccess: () => {
      toast.success("Referral rule deleted");
      void queryClient.invalidateQueries({ queryKey: ["admin", "multi-role-referral-overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete referral rule");
    },
  });

  // Filter ledger locally with instant search bar
  const filteredLedger = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ledger;
    return ledger.filter(
      (item) =>
        item.referrerName.toLowerCase().includes(q) ||
        item.referrerPhone.includes(q) ||
        item.refereeName.toLowerCase().includes(q) ||
        item.refereePhone.includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q)
    );
  }, [ledger, searchQuery]);

  // Find active rule for selected role and city
  const activeRuleForCurrentTab = useMemo(() => {
    if (selectedRole === "all") return null;
    // Prefer exact city rule, fallback to "All Cities"
    const exact = rules.find((r) => r.role === selectedRole && r.city.toLowerCase() === selectedCity.toLowerCase());
    if (exact) return exact;
    return rules.find((r) => r.role === selectedRole && (r.city === "All Cities" || !r.city));
  }, [rules, selectedRole, selectedCity]);

  const openCreateRuleModal = (rolePreset?: MultiRoleType) => {
    const targetRole = rolePreset || (selectedRole === "all" ? "partner" : selectedRole);
    setRuleForm({
      id: undefined,
      role: targetRole,
      city: selectedCity === "All Cities" ? "All Cities" : selectedCity,
      referrerReward: targetRole === "partner" ? 500 : targetRole === "rider" ? 300 : 100,
      targetOrdersCount: targetRole === "partner" ? 10 : targetRole === "rider" ? 20 : 1,
      minOrderValue: 199,
      headline:
        targetRole === "partner"
          ? "Refer a Partner & Earn ₹500"
          : targetRole === "rider"
          ? "Refer a Captain & Earn ₹300"
          : "Invite Friends, Earn ₹100",
      subheadline:
        targetRole === "partner"
          ? "Reward unlocks after your referred partner completes 10 orders."
          : targetRole === "rider"
          ? "Reward unlocks after your referred rider completes 20 delivery trips."
          : "Reward unlocks after your friend completes their first laundry order.",
      enabled: true,
    });
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: MultiRoleReferralRule) => {
    setRuleForm({
      id: rule.id,
      role: rule.role,
      city: rule.city,
      referrerReward: rule.referrerReward,
      targetOrdersCount: rule.targetOrdersCount,
      minOrderValue: rule.minOrderValue,
      headline: rule.headline || "",
      subheadline: rule.subheadline || "",
      enabled: rule.enabled,
    });
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    upsertRuleMutation.mutate({
      role: ruleForm.role,
      city: ruleForm.city,
      referrerReward: Number(ruleForm.referrerReward),
      targetOrdersCount: Number(ruleForm.targetOrdersCount),
      minOrderValue: Number(ruleForm.minOrderValue),
      headline: ruleForm.headline,
      subheadline: ruleForm.subheadline,
      enabled: ruleForm.enabled,
    });
  };

  const exportCsv = () => {
    if (filteredLedger.length === 0) {
      toast.info("No referral records to export.");
      return;
    }
    const headers = [
      "Referral ID",
      "Role",
      "City",
      "Referral Code",
      "Referrer Name",
      "Referrer Phone",
      "Referee Name",
      "Referee Phone",
      "Completed Orders",
      "Target Orders",
      "Reward Amount (INR)",
      "Status",
      "Created At",
      "Unlocked At",
      "Settlement Cycle ID",
    ];
    const rows = filteredLedger.map((r) => [
      r.id,
      r.refereeRole,
      r.city,
      r.code,
      r.referrerName,
      r.referrerPhone,
      r.refereeName,
      r.refereePhone,
      r.completedOrders,
      r.targetOrders,
      r.rewardAmount,
      r.status,
      r.createdAt,
      r.unlockedAt || "—",
      r.settlementCycleId || "—",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((s) => `"${s}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quickpress_multi_role_referrals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Multi-role referral ledger exported to CSV!");
  };

  return (
    <AdminShell
      title="Referral System"
      subtitle="City-wise referral incentive rules, order milestone tracking, and weekly bank settlement credits."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl border-slate-200 text-xs font-medium gap-1.5 bg-white text-slate-800 hover:bg-slate-50 shadow-xs"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="rounded-xl border-slate-200 text-xs font-medium gap-1.5 bg-white text-slate-800 hover:bg-slate-50 shadow-xs"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => openCreateRuleModal()}
            className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium gap-1.5 shadow-xs"
          >
            <Plus className="size-3.5" />
            Set Referral Rule
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP KPI METRICS CARDS (CLEAN & SIMPLE THEME)
        ========================================================================= */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Partner Referrals</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Store className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {stats?.totalPartnerInvites ?? 0} Stores
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">{stats?.unlockedPartnerRewards ?? 0}</span> milestone completed
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rider Referrals</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Bike className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {stats?.totalRiderInvites ?? 0} Captains
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">{stats?.unlockedRiderRewards ?? 0}</span> milestone completed
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Customer Referrals</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {stats?.totalCustomerInvites ?? 0} Users
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">{stats?.unlockedCustomerRewards ?? 0}</span> 1st orders completed
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Settlement Disbursed</span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <IndianRupee className="size-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              ₹{(stats?.totalDisbursedToSettlements ?? 0).toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Credited directly to weekly bank payout cycles
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. ROLE NAVIGATION TABS & CITY / STATUS FILTER BAR
        ========================================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
            {/* Role Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedRole("partner")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedRole === "partner"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Store className="size-3.5" />
                Partner Referrals
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("rider")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedRole === "rider"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Bike className="size-3.5" />
                Rider Referrals
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("customer")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedRole === "customer"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="size-3.5" />
                Customer Referrals
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("all")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedRole === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Roles
              </button>
            </div>

            {/* City & Status Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="size-3.5 text-slate-400" />
                <span className="font-medium">City:</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs focus:border-slate-900 focus:outline-none"
                >
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Sliders className="size-3.5 text-slate-400" />
                <span className="font-medium">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs focus:border-slate-900 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending_milestone">Pending Milestone</option>
                  <option value="unlocked">Unlocked (Claimable)</option>
                  <option value="claimed_to_cycle">In Settlement Cycle</option>
                  <option value="settled">Settled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Rule Details Card for Selected Role & City */}
          {selectedRole !== "all" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white uppercase">
                    {selectedRole} Rule
                  </span>
                  <span className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    City: {activeRuleForCurrentTab?.city || selectedCity}
                  </span>
                  {activeRuleForCurrentTab?.enabled === false && (
                    <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {activeRuleForCurrentTab?.headline || `Refer a ${selectedRole} & Earn ₹${activeRuleForCurrentTab?.referrerReward ?? 500}`}
                </div>
                <div className="text-xs text-slate-600">
                  Referrer receives{" "}
                  <strong className="text-slate-900">₹{activeRuleForCurrentTab?.referrerReward ?? 500}</strong> directly in their weekly bank settlement after referee completes{" "}
                  <strong className="text-slate-900">{activeRuleForCurrentTab?.targetOrdersCount ?? 10} delivered orders</strong>.
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {activeRuleForCurrentTab ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditRuleModal(activeRuleForCurrentTab)}
                    className="rounded-lg border-slate-300 bg-white text-xs font-medium text-slate-800 hover:bg-slate-100 gap-1.5"
                  >
                    <Edit2 className="size-3.5" />
                    Edit Rule
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => openCreateRuleModal(selectedRole as MultiRoleType)}
                    className="rounded-lg bg-slate-900 text-xs font-medium text-white hover:bg-slate-800 gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    Configure for {selectedCity}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Search toolbar */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search referrer name, referee store/rider, phone, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200 focus:border-slate-900"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-900">{filteredLedger.length}</span> referral records
            </div>
          </div>

          {/* =========================================================================
              3. LIVE REFERRAL MILESTONE LEDGER TABLE (CLEAN MONOCHROME)
          ========================================================================= */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Referrer</th>
                  <th className="py-3 px-4">Referee (Referred)</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Referral Code</th>
                  <th className="py-3 px-4">Milestone Progress</th>
                  <th className="py-3 px-4">Reward</th>
                  <th className="py-3 px-4">Settlement Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-slate-500" />
                      Loading live referral records...
                    </td>
                  </tr>
                ) : filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
                        <Gift className="size-5" />
                      </div>
                      <div className="text-sm font-semibold text-slate-700">No referral records found</div>
                      <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        No partners, riders, or customers match your current filter ({selectedCity}, {selectedRole}).
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((item) => {
                    const pct = Math.min(100, Math.round((item.completedOrders / (item.targetOrders || 1)) * 100));
                    const isUnlocked = item.status === "unlocked" || item.status === "claimed_to_cycle" || item.status === "settled";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        {/* Referrer */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.referrerName}</div>
                          <div className="text-[11px] text-slate-500">{item.referrerPhone}</div>
                          <span className="inline-block mt-0.5 text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {item.referrerRole}
                          </span>
                        </td>

                        {/* Referee */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.refereeName}</div>
                          <div className="text-[11px] text-slate-500">{item.refereePhone}</div>
                          <span className="inline-block mt-0.5 text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {item.refereeRole}
                          </span>
                        </td>

                        {/* City */}
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700">{item.city || "All Cities"}</span>
                        </td>

                        {/* Code */}
                        <td className="py-3 px-4">
                          <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-900 border border-slate-200">
                            {item.code}
                          </code>
                        </td>

                        {/* Milestone Progress */}
                        <td className="py-3 px-4 min-w-[170px]">
                          <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1">
                            <span>{item.completedOrders} of {item.targetOrders} orders</span>
                            <span className={pct === 100 ? "text-emerald-700 font-bold" : "text-slate-500"}>{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                            <div
                              className={`h-full transition-all duration-300 ${
                                pct === 100 ? "bg-slate-900" : "bg-slate-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>

                        {/* Reward Amount */}
                        <td className="py-3 px-4">
                          <span className="text-sm font-bold text-slate-900">₹{item.rewardAmount.toLocaleString("en-IN")}</span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {item.status === "claimed_to_cycle" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                              <Check className="size-3" /> In Weekly Cycle
                            </span>
                          ) : item.status === "unlocked" ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-900 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900">
                              <Sparkles className="size-3 text-slate-900" /> Unlocked (Ready)
                            </span>
                          ) : item.status === "settled" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800">
                              <CheckCircle2 className="size-3 text-slate-700" /> Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              <Clock className="size-3 text-slate-400" /> Pending Orders
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================================
            4. ALL ACTIVE CITY RULES OVERVIEW TABLE
        ========================================================================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configured City Referral Rules</h3>
              <p className="text-xs text-slate-500">List of all active referral reward amounts and milestones per role &amp; city.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openCreateRuleModal()}
              className="rounded-lg border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50 gap-1.5"
            >
              <Plus className="size-3.5" />
              Add City Override
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">City</th>
                  <th className="py-2.5 px-4">Referrer Reward</th>
                  <th className="py-2.5 px-4">Target Orders Milestone</th>
                  <th className="py-2.5 px-4">Min Order Value</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-bold text-slate-900 uppercase">{r.role}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-700">{r.city}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">₹{r.referrerReward}</td>
                    <td className="py-2.5 px-4 text-slate-700 font-medium">{r.targetOrdersCount} orders</td>
                    <td className="py-2.5 px-4 text-slate-600">₹{r.minOrderValue}</td>
                    <td className="py-2.5 px-4">
                      {r.enabled ? (
                        <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditRuleModal(r)}
                        className="size-7 p-0 text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete referral rule for ${r.role} (${r.city})?`)) {
                            deleteRuleMutation.mutate(r.id);
                          }
                        }}
                        className="size-7 p-0 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. RULE CONFIGURATION MODAL / DRAWER (SIMPLE & HIGH CONTRAST)
      ========================================================================= */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {ruleForm.id ? "Edit Referral Rule" : "Create City Referral Rule"}
                </h3>
                <p className="text-xs text-slate-500">Configure reward amount and completion milestone targets.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="size-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Target Role</Label>
                  <select
                    value={ruleForm.role}
                    onChange={(e) => setRuleForm({ ...ruleForm, role: e.target.value as MultiRoleType })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  >
                    <option value="partner">Partner (Laundromat)</option>
                    <option value="rider">Rider (Captain)</option>
                    <option value="customer">Customer (User)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">City Scope</Label>
                  <select
                    value={ruleForm.city}
                    onChange={(e) => setRuleForm({ ...ruleForm, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-none"
                  >
                    {availableCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Referrer Reward (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={ruleForm.referrerReward}
                    onChange={(e) => setRuleForm({ ...ruleForm, referrerReward: Number(e.target.value) })}
                    className="text-xs font-semibold rounded-xl border-slate-200"
                    required
                  />
                  <p className="text-[10px] text-slate-500">Credited to referrer weekly payout</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Target Orders Milestone</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={ruleForm.targetOrdersCount}
                    onChange={(e) => setRuleForm({ ...ruleForm, targetOrdersCount: Number(e.target.value) })}
                    className="text-xs font-semibold rounded-xl border-slate-200"
                    required
                  />
                  <p className="text-[10px] text-slate-500">Orders referee must complete to unlock</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Minimum Order Value (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={ruleForm.minOrderValue}
                  onChange={(e) => setRuleForm({ ...ruleForm, minOrderValue: Number(e.target.value) })}
                  className="text-xs rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Headline</Label>
                <Input
                  type="text"
                  value={ruleForm.headline}
                  onChange={(e) => setRuleForm({ ...ruleForm, headline: e.target.value })}
                  placeholder="e.g. Refer a Partner & Earn ₹500"
                  className="text-xs rounded-xl border-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Subheadline &amp; Conditions</Label>
                <Input
                  type="text"
                  value={ruleForm.subheadline}
                  onChange={(e) => setRuleForm({ ...ruleForm, subheadline: e.target.value })}
                  placeholder="e.g. Reward unlocks after your referred partner completes 10 orders."
                  className="text-xs rounded-xl border-slate-200"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rule_enabled"
                  checked={ruleForm.enabled}
                  onChange={(e) => setRuleForm({ ...ruleForm, enabled: e.target.checked })}
                  className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <Label htmlFor="rule_enabled" className="text-xs font-medium text-slate-800 cursor-pointer">
                  Rule is active and enabled for this city
                </Label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="rounded-xl border-slate-200 text-xs font-medium text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={upsertRuleMutation.isPending}
                  className="rounded-xl bg-slate-900 text-xs font-medium text-white hover:bg-slate-800"
                >
                  {upsertRuleMutation.isPending ? "Saving..." : "Save Rule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
