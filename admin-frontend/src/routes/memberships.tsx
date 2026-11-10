import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Crown,
  Download,
  Edit2,
  Gift,
  Headphones,
  Package,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  Zap,
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
  createMembershipPlan,
  deleteMembershipPlan,
  fetchAdminMembershipPlans,
  fetchMembershipStats,
  fetchMembershipSubscribers,
  fetchMembershipTransactions,
  grantCustomerMembership,
  revokeCustomerMembership,
  updateMembershipPlan,
  type AdminGrantPayload,
  type AdminPlanPayload,
  type MembershipBenefit,
  type MembershipPlan,
  type MembershipSubscriberItem,
} from "../api/memberships";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/memberships")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "VIP Memberships & Subscriptions Engine",
      "Manage Silver, Gold, Platinum, and Elite VIP membership tiers, custom offers, subscriber tracking, and billing ledger."
    ),
  component: MembershipsScreen,
});

const COLOR_OPTIONS = [
  { value: "slate", label: "Silver Slate", border: "border-slate-300", badge: "bg-slate-100 text-slate-800" },
  { value: "amber", label: "Gold Amber", border: "border-amber-400", badge: "bg-amber-100 text-amber-900" },
  { value: "indigo", label: "Platinum Indigo", border: "border-indigo-400", badge: "bg-indigo-100 text-indigo-900" },
  { value: "purple", label: "Elite Purple", border: "border-purple-400", badge: "bg-purple-100 text-purple-900" },
  { value: "emerald", label: "Emerald Green", border: "border-emerald-400", badge: "bg-emerald-100 text-emerald-900" },
  { value: "rose", label: "Rose Crimson", border: "border-rose-400", badge: "bg-rose-100 text-rose-900" },
];

const BENEFIT_TEMPLATES: { id: string; title: string; description: string; icon: string }[] = [
  { id: "free-delivery", title: "Free Delivery Quota", description: "Zero delivery fee on qualifying orders", icon: "truck" },
  { id: "free-pickup", title: "Free Doorstep Pickup", description: "Doorstep pickup at ₹0 on all orders", icon: "package" },
  { id: "extra-discount", title: "Extra Member Discount", description: "Flat % off on all laundry & dry clean orders", icon: "percent" },
  { id: "free-express", title: "Express Turnaround Pass", description: "Complimentary 4-8 hr priority processing", icon: "zap" },
  { id: "priority-processing", title: "Priority Queue Processing", description: "Fast-track processing at laundry hub", icon: "sparkles" },
  { id: "surge-waiver", title: "100% Surge & Rain Waiver", description: "Zero peak surge or rainy day charges", icon: "shield-check" },
  { id: "priority-support", title: "24x7 Dedicated VIP Support", description: "Direct VIP hotline and priority chat", icon: "headphones" },
  { id: "concierge-support", title: "Personal Concierge Manager", description: "Dedicated relationship manager for custom care", icon: "crown" },
  { id: "exclusive-rewards", title: "Private Elite Flash Drops", description: "Early access to secret discounts and vouchers", icon: "gift" },
];

function MembershipsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"plans" | "subscribers" | "transactions">("plans");

  // Plan Modal state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<AdminPlanPayload>({
    name: "",
    tagline: "",
    monthlyPrice: 199,
    quarterlyPrice: 549,
    yearlyPrice: 1990,
    validityDays: 30,
    yearlyValidityDays: 365,
    popular: false,
    status: "Active",
    badge: "",
    color: "amber",
    order: 1,
    discountPercent: 15,
    cashbackPercent: 5,
    freeDeliveryMinOrder: 99,
    freePickup: true,
    priorityProcessing: true,
    surgeWaiver: false,
    supportTier: "Priority Chat & Phone",
    monthlyOrderLimit: 15,
    freeExpressCount: 3,
    description: "",
    benefits: [],
  });

  // Grant Modal state
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantForm, setGrantForm] = useState<{ userId: string; planId: string; cycle: "monthly" | "yearly"; days: number; reason: string }>({
    userId: "",
    planId: "gold",
    cycle: "monthly",
    days: 30,
    reason: "Promotional VIP Membership Grant",
  });

  // Subscribers filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  // Queries
  const statsQuery = useQuery({
    queryKey: ["admin", "memberships", "stats"],
    queryFn: fetchMembershipStats,
  });

  const plansQuery = useQuery({
    queryKey: ["admin", "memberships", "plans"],
    queryFn: () => fetchAdminMembershipPlans(true),
  });

  const subscribersQuery = useQuery({
    queryKey: ["admin", "memberships", "subscribers", searchQuery, statusFilter, tierFilter],
    queryFn: () =>
      fetchMembershipSubscribers({
        q: searchQuery || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        planId: tierFilter !== "all" ? tierFilter : undefined,
      }),
  });

  const transactionsQuery = useQuery({
    queryKey: ["admin", "memberships", "transactions"],
    queryFn: () => fetchMembershipTransactions({ limit: 100 }),
  });

  const stats = statsQuery.data;
  const plans = (plansQuery.data || []).filter((p) => p.id !== "free");
  const subscribers = subscribersQuery.data?.items || [];
  const transactions = transactionsQuery.data?.items || [];

  // Mutations
  const savePlanMutation = useMutation({
    mutationFn: (payload: AdminPlanPayload) => {
      if (editingPlanId) {
        return updateMembershipPlan(editingPlanId, payload);
      }
      return createMembershipPlan(payload);
    },
    onSuccess: () => {
      toast.success(editingPlanId ? "Membership plan updated!" : "New membership tier created!");
      setPlanModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "memberships"] });
    },
    onError: () => {
      toast.error("Failed to save membership plan.");
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => deleteMembershipPlan(planId),
    onSuccess: () => {
      toast.success("Membership plan removed / archived.");
      queryClient.invalidateQueries({ queryKey: ["admin", "memberships"] });
    },
    onError: () => {
      toast.error("Failed to archive plan.");
    },
  });

  const grantMutation = useMutation({
    mutationFn: (data: { userId: string; payload: AdminGrantPayload }) =>
      grantCustomerMembership(data.userId, data.payload),
    onSuccess: () => {
      toast.success("VIP Membership granted to customer successfully!");
      setGrantModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "memberships"] });
    },
    onError: () => {
      toast.error("Failed to grant membership. Verify User ID.");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (data: { userId: string; reason: string }) =>
      revokeCustomerMembership(data.userId, data.reason),
    onSuccess: () => {
      toast.success("Membership cancelled / revoked.");
      queryClient.invalidateQueries({ queryKey: ["admin", "memberships"] });
    },
    onError: () => {
      toast.error("Failed to revoke membership.");
    },
  });

  const handleOpenCreate = () => {
    setEditingPlanId(null);
    setPlanForm({
      name: "",
      tagline: "",
      monthlyPrice: 199,
      quarterlyPrice: 549,
      yearlyPrice: 1990,
      validityDays: 30,
      yearlyValidityDays: 365,
      popular: false,
      status: "Active",
      badge: "NEW",
      color: "emerald",
      order: plans.length + 1,
      discountPercent: 15,
      cashbackPercent: 5,
      freeDeliveryMinOrder: 99,
      freePickup: true,
      priorityProcessing: true,
      surgeWaiver: false,
      supportTier: "Priority Support",
      monthlyOrderLimit: 15,
      freeExpressCount: 3,
      description: "",
      benefits: BENEFIT_TEMPLATES.slice(0, 4),
    });
    setPlanModalOpen(true);
  };

  const handleOpenEdit = (plan: MembershipPlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      tagline: plan.tagline,
      monthlyPrice: plan.monthlyPrice,
      quarterlyPrice: plan.quarterlyPrice || roundNum(plan.monthlyPrice * 2.8),
      yearlyPrice: plan.yearlyPrice,
      validityDays: plan.validityDays,
      yearlyValidityDays: plan.yearlyValidityDays,
      popular: plan.popular,
      status: plan.status as any,
      badge: plan.badge,
      color: plan.color,
      order: plan.order,
      discountPercent: plan.discountPercent,
      cashbackPercent: plan.cashbackPercent || 0,
      freeDeliveryMinOrder: plan.freeDeliveryMinOrder,
      freePickup: plan.freePickup,
      priorityProcessing: plan.priorityProcessing,
      surgeWaiver: Boolean(plan.surgeWaiver),
      supportTier: plan.supportTier,
      monthlyOrderLimit: plan.monthlyOrderLimit || 0,
      freeExpressCount: plan.freeExpressCount || 0,
      description: plan.description || "",
      benefits: plan.benefits || [],
    });
    setPlanModalOpen(true);
  };

  const toggleBenefit = (template: { id: string; title: string; description: string; icon: string }) => {
    const exists = planForm.benefits.some((b) => b.id === template.id || b.title === template.title);
    if (exists) {
      setPlanForm((prev) => ({
        ...prev,
        benefits: prev.benefits.filter((b) => b.id !== template.id && b.title !== template.title),
      }));
    } else {
      setPlanForm((prev) => ({
        ...prev,
        benefits: [
          ...prev.benefits,
          { id: template.id, title: template.title, description: template.description, icon: template.icon },
        ],
      }));
    }
  };

  const handleExportTransactionsCSV = () => {
    if (transactions.length === 0) {
      toast.error("No transactions available to export.");
      return;
    }
    const headers = ["Transaction ID", "Customer User ID", "Tier Plan", "Event Type", "Billing Cycle", "Amount (INR)", "Payment Status", "Reference", "Date"];
    const rows = transactions.map((t) => [
      t.id,
      (t as any).userId || "N/A",
      t.planName,
      t.type,
      t.billingCycle,
      t.amount,
      t.paymentStatus,
      t.paymentReference || "",
      t.subscribedAt || "",
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `membership_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Transactions CSV exported successfully!");
  };

  return (
    <AdminShell
      title="VIP Memberships & Subscription Engine"
      subtitle="Exclusive Silver, Gold, Platinum, and Elite VIP tiers with custom discounts, free delivery quotas, and real-time subscriber tracking."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGrantModalOpen(true)}
            className="h-8 rounded-xl border-zinc-300 px-3 text-xs font-bold text-zinc-800 hover:bg-zinc-100"
          >
            <UserPlus className="mr-1.5 size-3.5 text-emerald-600" />
            <span>Grant VIP Access</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
          >
            <Plus className="mr-1.5 size-3.5" />
            <span>+ Create Custom Tier</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP KPI SUMMARY (6 ADVANCED METRICS)
        ========================================================================= */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            kpi={{
              id: "kpi-active-subs",
              label: "Active VIP Members",
              value: statsQuery.isLoading ? "..." : String(stats?.activeMembers || 0),
              hint: `${stats?.totalSubscribers || 0} Total Lifetime`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "kpi-mrr",
              label: "Monthly Recurring (MRR)",
              value: statsQuery.isLoading ? "..." : `₹${(stats?.monthlyRecurringRevenue || 0).toLocaleString("en-IN")}`,
              hint: "Recurring revenue stream",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "kpi-arr",
              label: "Annual Run Rate (ARR)",
              value: statsQuery.isLoading ? "..." : `₹${(stats?.annualRunRate || 0).toLocaleString("en-IN")}`,
              hint: "12-month projection",
            }}
          />
          <KpiCard
            kpi={{
              id: "kpi-savings",
              label: "Total Member Savings",
              value: statsQuery.isLoading ? "..." : `₹${(stats?.totalSavingsGiven || 0).toLocaleString("en-IN")}`,
              hint: "Subsidies & perks given",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "kpi-orders",
              label: "VIP Orders Placed",
              value: statsQuery.isLoading ? "..." : String(stats?.memberOrdersCount || 0),
              hint: "Orders via VIP status",
            }}
          />
          <KpiCard
            kpi={{
              id: "kpi-top-tier",
              label: "Top VIP Tier",
              value: statsQuery.isLoading ? "..." : stats?.topPlanName || "Gold",
              hint: `${stats?.expiringSoonCount || 0} renewals this week`,
            }}
          />
        </div>

        {/* =========================================================================
            2. TABS NAVIGATION
        ========================================================================= */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
            <TabsList className="bg-zinc-100 p-1 rounded-xl">
              <TabsTrigger value="plans" className="gap-2 font-bold text-xs">
                <Crown className="size-3.5 text-amber-500" />
                <span>Membership Tiers ({plans.length})</span>
              </TabsTrigger>
              <TabsTrigger value="subscribers" className="gap-2 font-bold text-xs">
                <Users className="size-3.5 text-emerald-600" />
                <span>Subscribers Directory ({subscribersQuery.data?.total || subscribers.length})</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2 font-bold text-xs">
                <Coins className="size-3.5 text-indigo-600" />
                <span>Billing Ledger ({transactionsQuery.data?.total || transactions.length})</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {activeTab === "transactions" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTransactionsCSV}
                  className="h-8 rounded-xl border-zinc-200 text-xs font-bold hover:bg-zinc-100"
                >
                  <Download className="mr-1.5 size-3.5" />
                  <span>Export CSV</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "memberships"] })}
                className="h-8 rounded-xl border-zinc-200 text-xs font-bold hover:bg-zinc-100"
              >
                <RefreshCw className={`mr-1.5 size-3.5 ${plansQuery.isRefetching ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* =========================================================================
              3. TAB 1: MEMBERSHIP TIERS (SILVER, GOLD, PLATINUM, ELITE)
          ========================================================================= */}
          <TabsContent value="plans" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => {
                const isActive = plan.status === "Active";
                const tierStyle = getTierTheme(plan.id, plan.color);

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md ${
                      plan.popular ? "border-amber-400 ring-2 ring-amber-400/20" : "border-zinc-200"
                    }`}
                  >
                    {/* Top Badges & Actions */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-zinc-100 text-zinc-600 border-zinc-200"
                            }`}
                          >
                            <span className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                            {plan.status}
                          </span>

                          {plan.badge && (
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase border ${tierStyle.badge}`}>
                              {plan.badge}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(plan)}
                            className="size-7 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                            title="Edit Tier & Perks"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Archive membership plan '${plan.name}'?`)) {
                                deletePlanMutation.mutate(plan.id);
                              }
                            }}
                            className="size-7 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Archive Plan"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Tier Title */}
                      <div className="mt-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`flex size-8 items-center justify-center rounded-xl shadow-2xs ${tierStyle.iconBox}`}>
                            <Crown className="size-4.5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-zinc-900">{plan.name}</h3>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase">Tier ID: {plan.id}</span>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-zinc-600 min-h-[34px] leading-snug">{plan.tagline || "Exclusive membership perks and savings"}</p>
                      </div>

                      {/* Pricing Card */}
                      <div className="mt-3.5 rounded-xl bg-zinc-50 p-3.5 border border-zinc-100">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-2xl font-black text-zinc-900">₹{plan.monthlyPrice}</span>
                            <span className="text-xs font-bold text-zinc-500"> / mo</span>
                          </div>
                          {plan.yearlyPrice > 0 && (
                            <div className="text-right">
                              <span className="text-xs font-black text-zinc-800">₹{plan.yearlyPrice}</span>
                              <span className="text-[10px] text-zinc-400"> / yr</span>
                            </div>
                          )}
                        </div>

                        {plan.yearlySavings > 0 && (
                          <div className="mt-2 flex items-center gap-1 rounded-md bg-emerald-100/70 px-2 py-0.5 text-[10px] font-black text-emerald-900 border border-emerald-200">
                            <Sparkles className="size-2.5 text-emerald-700" />
                            <span>Save ₹{plan.yearlySavings} on Annual Billing</span>
                          </div>
                        )}
                      </div>

                      {/* Custom Offers & Engine Perks */}
                      <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Custom Offers & Rules</p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                            <Percent className="size-3 text-emerald-600 shrink-0" />
                            <span>{plan.discountPercent}% Extra Off</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                            <Truck className="size-3 text-emerald-600 shrink-0" />
                            <span>{plan.freeDeliveryMinOrder === 0 ? "Free Delivery" : `Free > ₹${plan.freeDeliveryMinOrder}`}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                            <Package className="size-3 text-emerald-600 shrink-0" />
                            <span>{plan.freePickup ? "Free Pickup" : "Standard Pickup"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                            <Zap className="size-3 text-amber-500 shrink-0" />
                            <span>{plan.freeExpressCount ? `${plan.freeExpressCount} Express` : "Standard Speed"}</span>
                          </div>
                          {plan.surgeWaiver && (
                            <div className="flex items-center gap-1.5 font-bold text-indigo-700 col-span-2">
                              <ShieldCheck className="size-3 text-indigo-600 shrink-0" />
                              <span>100% Surge & Rain Fee Waiver</span>
                            </div>
                          )}
                        </div>

                        {/* Checklist */}
                        {plan.benefits && plan.benefits.length > 0 && (
                          <div className="mt-3 space-y-1 pt-2 border-t border-zinc-100">
                            {plan.benefits.slice(0, 4).map((b) => (
                              <div key={b.id} className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                                <Check className="size-3 text-emerald-600 font-bold shrink-0" />
                                <span className="truncate">{b.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500">
                        {stats?.tierBreakdown?.[plan.name] || 0} active members
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(plan)}
                        className="h-7 text-xs font-bold rounded-lg border-zinc-200 hover:bg-zinc-100"
                      >
                        Customize Offer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* =========================================================================
              4. TAB 2: LIVE SUBSCRIBERS DIRECTORY
          ========================================================================= */}
          <TabsContent value="subscribers" className="mt-6 space-y-4">
            <SectionCard
              title={`Active VIP Subscribers (${subscribersQuery.data?.total || subscribers.length})`}
              description="Live audit trail of registered customers with active or past membership plans, member order counts, and total savings."
              actions={
                <Button
                  size="sm"
                  onClick={() => setGrantModalOpen(true)}
                  className="h-8 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                >
                  <UserPlus className="size-3.5 mr-1.5" />
                  <span>Grant VIP Membership</span>
                </Button>
              }
            >
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                  <Input
                    placeholder="Search by customer name, phone, email, or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] text-xs font-bold h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-[140px] text-xs font-bold h-9">
                      <SelectValue placeholder="VIP Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All VIP Tiers</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subscribers Table */}
              <DataTable
                loading={subscribersQuery.isLoading}
                rows={subscribers}
                emptyMessage="No VIP subscribers found. Click 'Grant VIP Access' to assign a tier to any customer."
                columns={[
                  {
                    key: "customer",
                    label: "Customer & Contact",
                    render: (row: MembershipSubscriberItem) => (
                      <div>
                        <p className="font-extrabold text-xs text-zinc-900">{row.userName}</p>
                        <p className="text-[11px] text-zinc-500 font-mono">{row.userPhone || row.userEmail || row.userId}</p>
                        {row.city && (
                          <span className="inline-block mt-0.5 text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 rounded border border-emerald-200">
                            {row.city}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "plan",
                    label: "VIP Tier",
                    render: (row: MembershipSubscriberItem) => {
                      const tierStyle = getTierTheme(row.planId);
                      return (
                        <div className="flex items-center gap-1.5">
                          <Crown className="size-4 text-amber-500" />
                          <div>
                            <span className="font-black text-xs text-zinc-900">{row.planName}</span>
                            <p className="text-[10px] uppercase font-bold text-zinc-400">{row.billingCycle} cycle</p>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: "validity",
                    label: "Validity & Remaining",
                    render: (row: MembershipSubscriberItem) => (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-zinc-800">
                          {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Lifetime"}
                        </p>
                        {row.status === "active" ? (
                          <span className="inline-block text-[10px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {row.remainingDays} days left
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            Expired
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "orders",
                    label: "Orders & Savings",
                    render: (row: MembershipSubscriberItem) => (
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-zinc-800">{row.totalOrders || 0} Orders placed</p>
                        <p className="text-[11px] font-black text-emerald-700">₹{(row.totalSaved || 0).toFixed(0)} saved</p>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (row: MembershipSubscriberItem) => {
                      const isActive = row.status === "active";
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                          {row.status.toUpperCase()}
                        </span>
                      );
                    },
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    render: (row: MembershipSubscriberItem) => (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setGrantForm({
                              userId: row.userId,
                              planId: row.planId !== "free" ? row.planId : "gold",
                              cycle: (row.billingCycle as any) || "monthly",
                              days: 30,
                              reason: "Admin Plan Extension",
                            });
                            setGrantModalOpen(true);
                          }}
                          className="h-7 text-[11px] font-bold rounded-lg border-zinc-200 hover:bg-zinc-100"
                        >
                          Extend / Upgrade
                        </Button>
                        {row.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const reason = prompt("Enter reason for revoking membership:");
                              if (reason !== null) {
                                revokeMutation.mutate({ userId: row.userId, reason });
                              }
                            }}
                            className="h-7 text-[11px] font-bold rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </SectionCard>
          </TabsContent>

          {/* =========================================================================
              5. TAB 3: BILLING & TRANSACTIONS REVENUE LEDGER
          ========================================================================= */}
          <TabsContent value="transactions" className="mt-6 space-y-4">
            <SectionCard
              title={`Membership Revenue & Billing Ledger (${transactionsQuery.data?.total || transactions.length})`}
              description="Append-only immutable audit trail of subscription activations, renewals, upgrades, admin grants, and refunds."
              actions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTransactionsCSV}
                  className="h-8 rounded-xl border-zinc-200 text-xs font-bold hover:bg-zinc-100"
                >
                  <Download className="mr-1.5 size-3.5" />
                  <span>Export CSV</span>
                </Button>
              }
            >
              <DataTable
                loading={transactionsQuery.isLoading}
                rows={transactions}
                emptyMessage="No subscription billing transactions recorded yet."
                columns={[
                  {
                    key: "id",
                    label: "Transaction ID & Ref",
                    render: (row: any) => (
                      <div>
                        <span className="font-mono text-xs font-bold text-zinc-900">{row.id}</span>
                        {row.paymentReference && (
                          <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">{row.paymentReference}</p>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "plan",
                    label: "Tier & Event",
                    render: (row: any) => (
                      <div>
                        <p className="font-extrabold text-xs text-zinc-900">{row.planName}</p>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {row.type}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "billingCycle",
                    label: "Cycle",
                    render: (row: any) => (
                      <span className="text-xs font-bold capitalize text-zinc-700">{row.billingCycle}</span>
                    ),
                  },
                  {
                    key: "amount",
                    label: "Amount Paid",
                    render: (row: any) => (
                      <span className="text-xs font-black text-zinc-900">
                        {row.amount === 0 ? "Free / Promo Grant" : `₹${row.amount}`}
                      </span>
                    ),
                  },
                  {
                    key: "paymentStatus",
                    label: "Payment Status",
                    render: (row: any) => {
                      const isSuccess = row.paymentStatus === "paid" || row.paymentStatus === "free";
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            isSuccess
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {row.paymentStatus.toUpperCase()}
                        </span>
                      );
                    },
                  },
                  {
                    key: "date",
                    label: "Date & Time",
                    render: (row: any) => (
                      <span className="text-xs font-medium text-zinc-500">
                        {row.subscribedAt ? new Date(row.subscribedAt).toLocaleString("en-IN") : "—"}
                      </span>
                    ),
                  },
                ]}
              />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* =========================================================================
          6. MODAL: CREATE / EDIT CUSTOM MEMBERSHIP TIER
      ========================================================================= */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-zinc-900 border-zinc-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-zinc-900">
              <Crown className="size-5 text-amber-500" />
              <span>{editingPlanId ? `Configure Tier: ${planForm.name}` : "Create New VIP Membership Tier"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Configure custom discounts, free delivery thresholds, express turnarounds, and pricing perks for this membership tier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Name, Tagline & Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-bold">Tier Plan Name *</Label>
                <Input
                  placeholder="e.g. Silver, Gold, Platinum, Elite VIP"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="h-9 text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Badge Tag</Label>
                <Input
                  placeholder="e.g. POPULAR, 50% OFF"
                  value={planForm.badge}
                  onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                  className="h-9 text-xs uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Tagline (Shown in App)</Label>
              <Input
                placeholder="e.g. 15 Free deliveries/mo + 15% discount & priority queue"
                value={planForm.tagline}
                onChange={(e) => setPlanForm({ ...planForm, tagline: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            {/* Pricing Matrix */}
            <div className="grid grid-cols-3 gap-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Monthly Price (₹) *</Label>
                <Input
                  type="number"
                  value={planForm.monthlyPrice}
                  onChange={(e) => setPlanForm({ ...planForm, monthlyPrice: Number(e.target.value) })}
                  className="h-9 text-xs font-black bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Quarterly Price (₹)</Label>
                <Input
                  type="number"
                  value={planForm.quarterlyPrice || 0}
                  onChange={(e) => setPlanForm({ ...planForm, quarterlyPrice: Number(e.target.value) })}
                  className="h-9 text-xs font-black bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Yearly Price (₹) *</Label>
                <Input
                  type="number"
                  value={planForm.yearlyPrice}
                  onChange={(e) => setPlanForm({ ...planForm, yearlyPrice: Number(e.target.value) })}
                  className="h-9 text-xs font-black bg-white"
                />
              </div>
            </div>

            {/* Core Offer Mechanics */}
            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 space-y-3">
              <Label className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                <Percent className="size-3.5 text-emerald-600" />
                <span>Custom Offer Discounts & Quotas</span>
              </Label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Extra Discount (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={planForm.discountPercent}
                    onChange={(e) => setPlanForm({ ...planForm, discountPercent: Number(e.target.value) })}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Free Deliveries / Mo</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="999 = Unlimited"
                    value={planForm.monthlyOrderLimit || 0}
                    onChange={(e) => setPlanForm({ ...planForm, monthlyOrderLimit: Number(e.target.value) })}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Free Express Passes</Label>
                  <Input
                    type="number"
                    min="0"
                    value={planForm.freeExpressCount || 0}
                    onChange={(e) => setPlanForm({ ...planForm, freeExpressCount: Number(e.target.value) })}
                    className="h-9 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Min Order for Free Del (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0 = No Min"
                    value={planForm.freeDeliveryMinOrder}
                    onChange={(e) => setPlanForm({ ...planForm, freeDeliveryMinOrder: Number(e.target.value) })}
                    className="h-9 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Checkbox Perks */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={planForm.freePickup}
                    onChange={(e) => setPlanForm({ ...planForm, freePickup: e.target.checked })}
                    className="size-4 accent-emerald-600 rounded"
                  />
                  <span className="text-xs font-bold text-zinc-800">Free Pickup (₹0)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={planForm.priorityProcessing}
                    onChange={(e) => setPlanForm({ ...planForm, priorityProcessing: e.target.checked })}
                    className="size-4 accent-amber-500 rounded"
                  />
                  <span className="text-xs font-bold text-zinc-800">Priority Processing</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={planForm.surgeWaiver || false}
                    onChange={(e) => setPlanForm({ ...planForm, surgeWaiver: e.target.checked })}
                    className="size-4 accent-indigo-600 rounded"
                  />
                  <span className="text-xs font-bold text-zinc-800">100% Surge Waiver</span>
                </label>
              </div>
            </div>

            {/* Benefits Selection */}
            <div className="space-y-2 border-t border-zinc-100 pt-3">
              <Label className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Customer Benefits Comparison Badges
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {BENEFIT_TEMPLATES.map((tpl) => {
                  const isSelected = planForm.benefits.some((b) => b.id === tpl.id || b.title === tpl.title);
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => toggleBenefit(tpl)}
                      className={`flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/60 shadow-2xs"
                          : "border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <div
                        className={`flex size-5 items-center justify-center rounded-md border mt-0.5 shrink-0 ${
                          isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-zinc-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{tpl.title}</p>
                        <p className="text-[10px] text-zinc-500 leading-tight">{tpl.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlanModalOpen(false)}
              className="rounded-xl text-xs font-bold border-zinc-200 hover:bg-zinc-100"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => savePlanMutation.mutate(planForm)}
              disabled={savePlanMutation.isPending}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
            >
              {savePlanMutation.isPending ? "Saving Tier..." : "Save Membership Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          7. MODAL: GRANT VIP MEMBERSHIP MANUALLY
      ========================================================================= */}
      <Dialog open={grantModalOpen} onOpenChange={setGrantModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900 border-zinc-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-zinc-900">
              <UserPlus className="size-5 text-emerald-600" />
              <span>Grant VIP Membership to Customer</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Directly assign or gift a Silver, Gold, Platinum, or Elite membership to any customer account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Customer User ID or Phone *</Label>
              <Input
                placeholder="Enter customer user ID (e.g. usr-...) or phone number"
                value={grantForm.userId}
                onChange={(e) => setGrantForm({ ...grantForm, userId: e.target.value })}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Choose VIP Tier *</Label>
              <Select value={grantForm.planId} onValueChange={(v) => setGrantForm({ ...grantForm, planId: v })}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.discountPercent}% Off, {p.freeDeliveryMinOrder === 0 ? "Free Delivery" : `Free > ₹${p.freeDeliveryMinOrder}`})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Billing Cycle</Label>
                <Select
                  value={grantForm.cycle}
                  onValueChange={(v: any) => setGrantForm({ ...grantForm, cycle: v })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly (30 Days)</SelectItem>
                    <SelectItem value="yearly">Annual (365 Days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Custom Validity (Days)</Label>
                <Input
                  type="number"
                  value={grantForm.days}
                  onChange={(e) => setGrantForm({ ...grantForm, days: Number(e.target.value) })}
                  className="h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Reason / Internal Note</Label>
              <Input
                placeholder="e.g. VIP Customer Reward, Founder Gift"
                value={grantForm.reason}
                onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGrantModalOpen(false)}
              className="rounded-xl text-xs font-bold border-zinc-200 hover:bg-zinc-100"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!grantForm.userId.trim()) {
                  toast.error("Please enter a valid Customer ID or Phone.");
                  return;
                }
                grantMutation.mutate({
                  userId: grantForm.userId.trim(),
                  payload: {
                    planId: grantForm.planId,
                    billingCycle: grantForm.cycle,
                    validityDays: grantForm.days,
                    reason: grantForm.reason,
                  },
                });
              }}
              disabled={grantMutation.isPending}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
            >
              {grantMutation.isPending ? "Granting..." : "Confirm & Grant VIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function roundNum(n: number) {
  return Math.round(n);
}

function getTierTheme(planId: string, color?: string) {
  const id = planId.toLowerCase();
  if (id.includes("silver") || color === "slate") {
    return {
      border: "border-slate-300",
      badge: "bg-slate-100 text-slate-800 border-slate-300",
      iconBox: "bg-slate-100 text-slate-700",
    };
  }
  if (id.includes("gold") || color === "amber") {
    return {
      border: "border-amber-400",
      badge: "bg-amber-100 text-amber-900 border-amber-300",
      iconBox: "bg-amber-100 text-amber-800",
    };
  }
  if (id.includes("platinum") || color === "indigo") {
    return {
      border: "border-indigo-400",
      badge: "bg-indigo-100 text-indigo-900 border-indigo-300",
      iconBox: "bg-indigo-100 text-indigo-800",
    };
  }
  if (id.includes("elite") || color === "purple") {
    return {
      border: "border-purple-400",
      badge: "bg-purple-100 text-purple-900 border-purple-300",
      iconBox: "bg-purple-100 text-purple-800",
    };
  }
  return {
    border: "border-emerald-400",
    badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    iconBox: "bg-emerald-100 text-emerald-800",
  };
}
