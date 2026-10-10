import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Gift,
  Search,
  Download,
  Users,
  CheckCircle2,
  Copy,
  Save,
  Check,
  RefreshCw,
  TrendingUp,
  Share2,
  IndianRupee,
  BadgeCheck,
  ShieldCheck,
  Tag,
  Clock,
  ArrowUpRight,
  Filter,
  Sliders,
  Sparkles,
  ExternalLink,
  Phone,
  UserCheck,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { DataTable, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  fetchReferralSettings,
  fetchReferralStats,
  fetchReferralsList,
  updateReferralSettings,
  type AdminReferralItem,
  type ReferralProgramSettings,
} from "../api/coupons";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/referrals")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Customer Referral & Rewards Engine — Admin",
      "Full admin control over peer referral bonuses, customer acquisition rewards, live invite tracking, and wallet payouts."
    ),
  component: ReferralsPage,
});

export function ReferralsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tracking" | "rules" | "economics">("tracking");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "expired">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const refSettings = useQuery({
    queryKey: ["admin", "referral-settings"],
    queryFn: fetchReferralSettings,
  });

  const refStats = useQuery({
    queryKey: ["admin", "referral-stats"],
    queryFn: fetchReferralStats,
  });

  const refList = useQuery({
    queryKey: ["admin", "referral-list"],
    queryFn: fetchReferralsList,
  });

  const referralsList = refList.data?.items ?? [];
  const stats = refStats.data;
  const settings = refSettings.data;

  // Filtered referrals list for the search & status filter
  const filteredReferrals = useMemo(() => {
    return referralsList.filter((item: AdminReferralItem) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.referrerName?.toLowerCase().includes(q) ||
        item.referrerPhone?.includes(q) ||
        item.refereeName?.toLowerCase().includes(q) ||
        item.refereePhone?.includes(q) ||
        item.code?.toLowerCase().includes(q) ||
        item.referrerId?.toLowerCase().includes(q) ||
        item.refereeId?.toLowerCase().includes(q);

      const statusNorm = String(item.status || "").toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && (statusNorm === "completed" || statusNorm === "converted")) ||
        (statusFilter === "pending" && statusNorm === "pending") ||
        (statusFilter === "expired" && statusNorm === "expired");

      return matchesSearch && matchesStatus;
    });
  }, [referralsList, searchQuery, statusFilter]);

  const copyText = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedCode(val);
    toast.success(`Copied: ${val}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const exportCsv = () => {
    if (referralsList.length === 0) {
      toast.info("No referral records to export.");
      return;
    }
    const headers = [
      "Referral ID",
      "Referrer Name",
      "Referrer Phone",
      "Referee Name",
      "Referee Phone",
      "Referral Code",
      "Status",
      "Reward Amount (INR)",
      "Discount Applied (INR)",
      "1st Order ID",
      "Created At",
      "Completed At",
    ];
    const rows = referralsList.map((r: AdminReferralItem) => [
      r.id,
      r.referrerName,
      r.referrerPhone,
      r.refereeName,
      r.refereePhone,
      r.code,
      r.status,
      r.rewardAmount,
      r.discountApplied,
      r.firstOrderId || "N/A",
      r.createdAt,
      r.completedAt || "Pending",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((s) => `"${s}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quickpress_referrals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Referral records exported to CSV!");
  };

  const reloadData = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "referral-settings"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "referral-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "referral-list"] });
    toast.success("Referral data reloaded from database!");
  };

  const totalRegistered = stats?.totalRegisteredReferrals ?? referralsList.length;
  const totalConverted = stats?.convertedFirstOrders ?? referralsList.filter((r) => r.status === "completed" || (r.status as any) === "converted").length;
  const conversionRate = totalRegistered > 0 ? ((totalConverted / totalRegistered) * 100).toFixed(1) : "0.0";

  return (
    <AdminShell
      title="Referral & Rewards Control Center"
      subtitle="Full control over peer rewards, customer acquisition discounts, live invite tracking, and wallet disbursements."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={reloadData}
            disabled={refList.isFetching}
            className="rounded-xl border-zinc-200 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${refList.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="rounded-xl border-zinc-200 text-xs font-bold gap-1.5"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP KPI METRICS CARDS
        ========================================================================= */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            title="Total Peer Invites"
            value={stats?.totalInvites?.toLocaleString("en-IN") ?? "0"}
            hint="Share actions on WhatsApp/SMS"
            icon={Share2}
          />
          <KpiCard
            title="Registered Friends"
            value={totalRegistered.toLocaleString("en-IN")}
            hint="Signed up with referral code"
            icon={Users}
          />
          <KpiCard
            title="1st Orders Converted"
            value={totalConverted.toLocaleString("en-IN")}
            hint="Completed first laundry order"
            icon={CheckCircle2}
          />
          <KpiCard
            title="Wallet Rewards Paid"
            value={`₹${(stats?.totalRewardsPaid ?? totalConverted * 150).toLocaleString("en-IN")}`}
            hint="Disbursed to inviter wallets"
            icon={IndianRupee}
          />
          <KpiCard
            title="Discounts Given"
            value={`₹${(stats?.totalDiscountGiven ?? 0).toLocaleString("en-IN")}`}
            hint="50% first order discounts"
            icon={Tag}
          />
          <KpiCard
            title="Conversion Rate"
            value={`${conversionRate}%`}
            hint="Registered to first order"
            icon={TrendingUp}
          />
        </div>

        {/* =========================================================================
            2. NAVIGATION TABS
        ========================================================================= */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="bg-zinc-100 p-1 rounded-2xl border border-zinc-200/80">
            <TabsTrigger
              value="tracking"
              className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
            >
              <Users className="size-3.5 mr-1.5 text-emerald-600" />
              Live Referral Tracking ({filteredReferrals.length})
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
            >
              <Sliders className="size-3.5 mr-1.5 text-emerald-600" />
              Program Rules &amp; Control
            </TabsTrigger>
            <TabsTrigger
              value="economics"
              className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs"
            >
              <TrendingUp className="size-3.5 mr-1.5 text-emerald-600" />
              Growth Funnel &amp; Economics
            </TabsTrigger>
          </TabsList>

          {/* =========================================================================
              TAB 1: LIVE REFERRAL TRACKING LOG (FULL USER DATA)
          ========================================================================= */}
          <TabsContent value="tracking" className="mt-4 space-y-4">
            <SectionCard
              title={`Customer Peer Referral Ledger (${filteredReferrals.length} records)`}
              description="Live audit trail showing inviting customers, registered friends, phone numbers, conversion status, and Quick Money wallet credits."
            >
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Search by customer name, phone number, code, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-zinc-50 border-zinc-200"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="size-3.5 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-600">Status:</span>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: "all", label: "All" },
                        { id: "completed", label: "Converted (Paid)" },
                        { id: "pending", label: "Pending 1st Order" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStatusFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          statusFilter === f.id
                            ? "bg-zinc-900 text-white shadow-2xs"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <DataTable
                loading={refList.isLoading}
                rows={filteredReferrals}
                emptyMessage="No referral transactions found matching your criteria."
                columns={[
                  {
                    key: "referrer",
                    label: "Inviting Customer (Referrer)",
                    render: (r: AdminReferralItem) => (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-zinc-900">
                            {r.referrerName || "Customer"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                          <Phone className="size-2.5 text-zinc-400" />
                          <span>{r.referrerPhone || "No Phone"}</span>
                        </div>
                        <span className="inline-block text-[9px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded">
                          ID: {r.referrerId?.slice(0, 10)}...
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "referee",
                    label: "Invited Friend (Referee)",
                    render: (r: AdminReferralItem) => (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-zinc-900">
                            {r.refereeName || "New Friend"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                          <Phone className="size-2.5 text-zinc-400" />
                          <span>{r.refereePhone || "No Phone"}</span>
                        </div>
                        <span className="inline-block text-[9px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded">
                          ID: {r.refereeId?.slice(0, 10)}...
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "code",
                    label: "Referral Code",
                    render: (r: AdminReferralItem) => (
                      <button
                        type="button"
                        onClick={() => copyText(r.code)}
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition cursor-pointer"
                        title="Click to copy code"
                      >
                        <span>{r.code}</span>
                        {copiedCode === r.code ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3 text-emerald-500" />
                        )}
                      </button>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (r: AdminReferralItem) => {
                      const isCompleted =
                        r.status === "completed" || (r.status as any) === "converted" || (r.status as any) === "Converted";
                      return (
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 className="size-3 text-emerald-600" />
                                Converted
                              </>
                            ) : (
                              <>
                                <Clock className="size-3 text-amber-600" />
                                Pending 1st Order
                              </>
                            )}
                          </span>
                          {r.firstOrderId && (
                            <p className="text-[10px] text-zinc-500 font-mono">
                              Order #{r.firstOrderId.slice(0, 8)}
                            </p>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: "reward",
                    label: "Disbursement",
                    render: (r: AdminReferralItem) => {
                      const isCompleted =
                        r.status === "completed" || (r.status as any) === "converted" || (r.status as any) === "Converted";
                      return (
                        <div className="space-y-0.5">
                          <span
                            className={`font-black text-xs block ${
                              isCompleted ? "text-emerald-700" : "text-zinc-400"
                            }`}
                          >
                            +₹{r.rewardAmount || 150} Quick Money
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Friend: {settings?.refereeDiscountPercent || 50}% OFF
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    key: "date",
                    label: "Date",
                    render: (r: AdminReferralItem) => (
                      <div className="space-y-0.5 text-xs text-zinc-600">
                        <p className="font-medium">{r.createdAt?.slice(0, 10) || "Recent"}</p>
                        {r.completedAt && (
                          <p className="text-[10px] text-emerald-600 font-medium">
                            Delivered: {r.completedAt.slice(0, 10)}
                          </p>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </SectionCard>
          </TabsContent>

          {/* =========================================================================
              TAB 2: FULL PROGRAM RULES & ADMIN CONTROL
          ========================================================================= */}
          <TabsContent value="rules" className="mt-4">
            <ReferralSettingsControl initialSettings={settings} />
          </TabsContent>

          {/* =========================================================================
              TAB 3: GROWTH FUNNEL & ECONOMICS
          ========================================================================= */}
          <TabsContent value="economics" className="mt-4">
            <SectionCard
              title="Viral Referral Funnel & Unit Economics"
              description="Measure the customer acquisition cost (CAC) and viral coefficient of the peer referral program."
            >
              <div className="grid gap-6 md:grid-cols-3">
                {/* Stage 1 */}
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-zinc-500">Stage 1</span>
                    <Share2 className="size-4 text-zinc-400" />
                  </div>
                  <h3 className="text-xl font-black text-zinc-900">
                    {stats?.totalInvites?.toLocaleString("en-IN") ?? 0} Invites
                  </h3>
                  <p className="text-xs text-zinc-600">
                    Shared via WhatsApp, SMS, and direct link copies.
                  </p>
                </div>

                {/* Stage 2 */}
                <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-sky-700">Stage 2</span>
                    <Users className="size-4 text-sky-600" />
                  </div>
                  <h3 className="text-xl font-black text-sky-950">
                    {totalRegistered.toLocaleString("en-IN")} Signups
                  </h3>
                  <p className="text-xs text-sky-700">
                    Friends that downloaded the app and applied the inviter's referral code.
                  </p>
                </div>

                {/* Stage 3 */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-700">Stage 3</span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-950">
                    {totalConverted.toLocaleString("en-IN")} Converted Orders
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Orders successfully delivered; ₹150 wallet reward credited to inviter.
                  </p>
                </div>
              </div>

              {/* Economic Summary */}
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
                <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-600" />
                  Referral CAC Economics
                </h4>
                <div className="grid gap-4 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="text-zinc-500 font-medium">Blended Referral CAC:</span>
                    <p className="text-base font-black text-zinc-900">
                      ₹{settings?.referrerRewardAmount || 150} + ~₹{(settings?.refereeMaxDiscount || 150) * 0.75} discount
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-medium">Paid Advertising Benchmark:</span>
                    <p className="text-base font-black text-zinc-900">₹450 - ₹600 / customer</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-medium">CAC Savings vs Paid Ads:</span>
                    <p className="text-base font-black text-emerald-700">~55% Cheaper Organic CAC</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}

/* =========================================================================
   FULL ADMIN CONTROL SETTINGS COMPONENT
========================================================================= */
function ReferralSettingsControl({
  initialSettings,
}: {
  initialSettings?: ReferralProgramSettings | undefined;
}) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(initialSettings?.enabled ?? true);
  const [referrerReward, setReferrerReward] = useState(
    String(initialSettings?.referrerRewardAmount ?? 150)
  );
  const [refereeDiscount, setRefereeDiscount] = useState(
    String(initialSettings?.refereeDiscountPercent ?? 50)
  );
  const [minOrder, setMinOrder] = useState(
    String(initialSettings?.refereeMinOrderValue ?? 199)
  );
  const [maxDiscount, setMaxDiscount] = useState(
    String(initialSettings?.refereeMaxDiscount ?? 150)
  );
  const [headline, setHeadline] = useState(
    initialSettings?.headline ?? "Invite Friends & Earn ₹150 Quick Money"
  );
  const [subheadline, setSubheadline] = useState(
    initialSettings?.subheadline ??
      "Friends get 50% OFF (up to ₹150) on their 1st laundry order. You get ₹150 in Quick Money."
  );

  const updateMutation = useMutation({
    mutationFn: () =>
      updateReferralSettings({
        enabled,
        referrerRewardAmount: Number(referrerReward) || 150,
        refereeDiscountPercent: Number(refereeDiscount) || 50,
        refereeMinOrderValue: Number(minOrder) || 199,
        refereeMaxDiscount: Number(maxDiscount) || 150,
        headline,
        subheadline,
      }),
    onSuccess: () => {
      toast.success("Referral program settings saved & deployed instantly! 🎉");
      void queryClient.invalidateQueries({ queryKey: ["admin", "referral-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "referral-stats"] });
    },
    onError: () => {
      toast.error("Failed to update referral program settings.");
    },
  });

  return (
    <SectionCard
      title="Referral Program Configuration & Incentives Control"
      description="Fine-tune reward amounts, discount limits, eligibility rules, and customer-facing banner copy in real time."
    >
      <div className="space-y-6">
        {/* Master Switch */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 bg-zinc-50">
          <div>
            <h4 className="text-sm font-bold text-zinc-900">Program Master Status</h4>
            <p className="text-xs text-zinc-500">
              When paused, referral codes cannot be applied by new users and rewards are frozen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              enabled
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
            }`}
          >
            {enabled ? "ACTIVE (Running)" : "PAUSED (Disabled)"}
          </button>
        </div>

        {/* 2-Column Incentives Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Referrer Box */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Referrer Reward (Inviter)
              </span>
              <IndianRupee className="size-4 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-emerald-950">
                Wallet Cash Credited (₹)
              </Label>
              <Input
                type="number"
                value={referrerReward}
                onChange={(e) => setReferrerReward(e.target.value)}
                className="h-10 text-sm font-black bg-white"
              />
              <p className="text-[10px] text-emerald-700">
                Directly credited to inviter's Quick Money wallet upon friend's first delivered order.
              </p>
            </div>
          </div>

          {/* Referee Box */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-800">
                Referee Benefit (Invited Friend)
              </span>
              <Tag className="size-4 text-sky-600" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-sky-950">
                First Order Discount (%)
              </Label>
              <Input
                type="number"
                value={refereeDiscount}
                onChange={(e) => setRefereeDiscount(e.target.value)}
                className="h-10 text-sm font-black bg-white"
              />
              <p className="text-[10px] text-sky-700">
                Instant discount deducted automatically at checkout for new users.
              </p>
            </div>
          </div>
        </div>

        {/* Eligibility Limits */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-800">
              Min Order Cart Value for Referral (₹)
            </Label>
            <Input
              type="number"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              className="h-9 text-xs bg-white"
            />
            <p className="text-[10px] text-zinc-500">
              Orders below this value will not trigger referee discount or referrer payout.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-800">
              Max Discount Cap for Referee (₹)
            </Label>
            <Input
              type="number"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              className="h-9 text-xs bg-white"
            />
            <p className="text-[10px] text-zinc-500">
              Cap on referee discount (e.g. 50% discount capped at max ₹150).
            </p>
          </div>
        </div>

        {/* Customer App Copywriting */}
        <div className="space-y-3 pt-3 border-t border-zinc-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Customer App Banners &amp; Headings
          </h4>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-800">App Banner Headline</Label>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="h-9 text-xs bg-white"
              placeholder="e.g. Invite Friends & Earn ₹150 Quick Money"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-800">App Banner Subheadline</Label>
            <Input
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="h-9 text-xs bg-white"
              placeholder="e.g. Friends get 50% OFF (up to ₹150) on 1st order. You get ₹150 in Quick Money."
            />
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white h-10 px-6 gap-2 cursor-pointer shadow-sm shadow-emerald-600/20"
        >
          <Save className="size-4" />
          {updateMutation.isPending ? "Deploying Settings..." : "Save & Deploy Referral Rules"}
        </Button>
      </div>
    </SectionCard>
  );
}
