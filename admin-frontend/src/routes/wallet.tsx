import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Truck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Download,
  Plus,
  RefreshCw,
  Sliders,
  Check,
  X,
  Store,
  Bike,
  User,
  IndianRupee,
  ShieldCheck,
  Banknote,
  Send,
  Eye,
  Filter,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  RefreshCwOff,
  Lock,
  Unlock,
  History,
  FileText,
  SlidersHorizontal,
  MapPin,
  Calendar,
  ArrowUpDown,
  PlusCircle,
  MinusCircle,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";


import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
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
import { RevenueAreaChart } from "../components/AdminCharts";
import {
  adjustWalletBalance,
  toggleWalletBlock,
  fetchAccountWalletHistory,
  approveAdminRefund,
  approveWithdrawal,
  fetchAdminRefunds,
  fetchAdminRefundsStats,
  fetchAllWallets,
  fetchFinanceKpis,
  fetchPartnerEarnings,
  fetchRevenueSplit,
  fetchRiderEarnings,
  fetchTransactions,
  fetchWithdrawRequests,
  initiateAdminRefund,
  rejectAdminRefund,
  rejectWithdrawal,
  fetchSettlementsOverview,
  batchDisburseSettlements,
  approveSettlementRecord,
  type AccountWallet,
  type AccountHistoryItem,
  type Payout,
  type RefundRecord,
  type SettlementsOverview,
  type SettlementRecordItem,
} from "../api/wallet";

import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/wallet")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Wallet, Payouts, Settlement & Refund Center",
      "Commissions, partner payouts, rider fleet earnings, customer refunds, and double-entry ledger."
    ),
  component: WalletPage,
});

export function WalletPage() {
  const queryClient = useQueryClient();
  const kpisQuery = useQuery({ queryKey: ["admin", "finance", "kpis"], queryFn: fetchFinanceKpis });
  const walletsQuery = useQuery({ queryKey: ["admin", "finance", "all-wallets"], queryFn: fetchAllWallets });
  const splitQuery = useQuery({ queryKey: ["admin", "finance", "split"], queryFn: fetchRevenueSplit });
  const partnerEarnings = useQuery({ queryKey: ["admin", "finance", "partners"], queryFn: fetchPartnerEarnings });
  const riderEarnings = useQuery({ queryKey: ["admin", "finance", "riders"], queryFn: fetchRiderEarnings });
  const withdrawalsQuery = useQuery({ queryKey: ["admin", "finance", "withdrawals"], queryFn: fetchWithdrawRequests });
  const transactionsQuery = useQuery({ queryKey: ["admin", "finance", "transactions"], queryFn: fetchTransactions });
  const refundsQuery = useQuery({ queryKey: ["admin", "finance", "refunds"], queryFn: fetchAdminRefunds });
  const refundStatsQuery = useQuery({ queryKey: ["admin", "finance", "refund-stats"], queryFn: fetchAdminRefundsStats });
  const settlementsQuery = useQuery({ queryKey: ["admin", "finance", "settlements-overview"], queryFn: fetchSettlementsOverview });

  const [activeTab, setActiveTab] = useState<"wallets" | "settlements" | "refunds" | "withdrawals" | "split" | "ledger" | "cod">("wallets");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "7d" | "30d" | "this_month">("all");
  const [sortBy, setSortBy] = useState<"balance_desc" | "balance_asc" | "earned_desc" | "spent_desc" | "name_asc">("balance_desc");
  const [settlementRoleFilter, setSettlementRoleFilter] = useState<"all" | "partner" | "rider">("all");
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<"all" | "settled" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<AccountWallet | null>(null);
  const [statementTarget, setStatementTarget] = useState<AccountWallet | null>(null);
  const [blockTarget, setBlockTarget] = useState<AccountWallet | null>(null);
  const [globalAdjustOpen, setGlobalAdjustOpen] = useState(false);

  const allWallets = walletsQuery.data ?? [];
  const allWithdrawals = withdrawalsQuery.data ?? [];
  const allTxns = transactionsQuery.data ?? [];
  const allRefunds = refundsQuery.data ?? [];
  const refundStats = refundStatsQuery.data;
  const settlementsOverview = settlementsQuery.data;

  // Refund Actions Mutations
  const approveRefundMutation = useMutation({
    mutationFn: (refundId: string) => approveAdminRefund(refundId),
    onSuccess: () => {
      toast.success("Refund approved & executed successfully! 🎉");
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "refunds"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "refund-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "all-wallets"] });
    },
    onError: () => toast.error("Failed to approve refund."),
  });

  const rejectRefundMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectAdminRefund(id, reason),
    onSuccess: () => {
      toast.success("Refund claim rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "refunds"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "refund-stats"] });
    },
    onError: () => toast.error("Failed to reject refund."),
  });

  const decideWithdrawalMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      action === "approve" ? approveWithdrawal(id) : rejectWithdrawal(id),
    onSuccess: (_d, vars) => {
      toast.success(`Withdrawal payout ${vars.action}d successfully!`);
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "kpis"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "all-wallets"] });
    },
    onError: () => toast.error("Failed to update withdrawal status."),
  });

  const batchDisburseMutation = useMutation({
    mutationFn: () => batchDisburseSettlements(),
    onSuccess: (res) => {
      toast.success(`Batch settlement executed! Disbursed ${res.disbursedCount} payouts (₹${res.totalAmount}). 🎉`);
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "settlements-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "kpis"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "all-wallets"] });
    },
    onError: () => toast.error("Failed to execute batch settlement."),
  });

  const approveSettlementMutation = useMutation({
    mutationFn: (settlementId: string) => approveSettlementRecord(settlementId),
    onSuccess: () => {
      toast.success("Settlement payout marked as completed with bank UTR!");
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "settlements-overview"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "withdrawals"] });
    },
    onError: () => toast.error("Failed to approve settlement."),
  });

  // Unique available cities from active accounts
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    allWallets.forEach((w) => {
      if (w.city && w.city.trim()) set.add(w.city.trim());
    });
    return Array.from(set).sort();
  }, [allWallets]);

  // Date filter evaluator
  const matchesDateFilter = (isoStr?: string, filter: string = "all") => {
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
      if (filter === "this_month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
    } catch {
      return true;
    }
    return true;
  };

  // Filtered and sorted wallets
  const filteredWallets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = allWallets.filter((w) => {
      const matchSearch =
        !q ||
        [w.name, w.phone, w.city, w.role, w.id, w.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchRole = roleFilter === "all" || w.role.toLowerCase() === roleFilter.toLowerCase();
      const isBlocked = w.status === "Blocked" || (w as any).isBlocked === true;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "blocked" ? isBlocked : !isBlocked);
      const matchCity =
        cityFilter === "all" || (w.city && w.city.toLowerCase() === cityFilter.toLowerCase());
      const matchDate = matchesDateFilter(w.updatedAt || w.createdAt, dateFilter);
      return matchSearch && matchRole && matchStatus && matchCity && matchDate;
    });

    return [...result].sort((a, b) => {
      if (sortBy === "balance_desc") return b.balance - a.balance;
      if (sortBy === "balance_asc") return a.balance - b.balance;
      if (sortBy === "earned_desc") return b.totalEarned - a.totalEarned;
      if (sortBy === "spent_desc") return (b.totalSpent ?? 0) - (a.totalSpent ?? 0);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [allWallets, searchQuery, roleFilter, statusFilter, cityFilter, dateFilter, sortBy]);

  // Aggregate metrics summary for KPIs
  const walletSummary = useMemo(() => {
    let totalBalance = 0;
    let customerBalance = 0;
    let partnerBalance = 0;
    let riderBalance = 0;
    let codFloat = 0;
    let blockedCount = 0;

    allWallets.forEach((w) => {
      totalBalance += w.balance || 0;
      if (w.role === "customer") customerBalance += w.balance || 0;
      if (w.role === "partner") partnerBalance += w.balance || 0;
      if (w.role === "rider") {
        riderBalance += w.balance || 0;
        if (w.codBalance) codFloat += w.codBalance;
      }
      if (w.status === "Blocked" || (w as any).isBlocked) {
        blockedCount += 1;
      }
    });

    let filteredTotal = 0;
    filteredWallets.forEach((w) => {
      filteredTotal += w.balance || 0;
    });

    return {
      totalBalance,
      customerBalance,
      partnerBalance,
      riderBalance,
      codFloat,
      blockedCount,
      filteredTotal,
    };
  }, [allWallets, filteredWallets]);

  const isWalletFiltered =
    searchQuery.trim() !== "" ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    cityFilter !== "all" ||
    dateFilter !== "all" ||
    sortBy !== "balance_desc";

  const resetWalletFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setCityFilter("all");
    setDateFilter("all");
    setSortBy("balance_desc");
  };

  const handleExportWalletsCsv = () => {
    const headers = [
      "Account ID",
      "Name",
      "Role",
      "Phone",
      "City",
      "Available Balance (INR)",
      "Total Earned (INR)",
      "Total Spent (INR)",
      "COD Float (INR)",
      "Status",
      "Last Activity",
    ];
    const rows = filteredWallets.map((w) => [
      w.id,
      w.name,
      w.role,
      w.phone,
      w.city || "N/A",
      w.balance.toFixed(2),
      w.totalEarned.toFixed(2),
      (w.totalSpent ?? 0).toFixed(2),
      (w.codBalance ?? 0).toFixed(2),
      w.status,
      w.updatedAt || w.createdAt || "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quickpress_wallets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Wallets directory exported as CSV! 📊");
  };

  const filteredRefunds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRefunds.filter((r) => {
      return !q || [r.refundNumber, r.orderNumber, r.customerName, r.customerPhone, r.reason, r.status].join(" ").toLowerCase().includes(q);
    });
  }, [allRefunds, searchQuery]);

  const filteredSettlements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const items = settlementsOverview?.settlements || [];
    return items.filter((s) => {
      const matchSearch =
        !q || [s.accountName, s.orderCode, s.utr, s.role, s.id].join(" ").toLowerCase().includes(q);
      const matchRole = settlementRoleFilter === "all" || s.role.toLowerCase() === settlementRoleFilter.toLowerCase();
      const matchStatus =
        settlementStatusFilter === "all" || s.status.toLowerCase() === settlementStatusFilter.toLowerCase();
      return matchSearch && matchRole && matchStatus;
    });
  }, [settlementsOverview, searchQuery, settlementRoleFilter, settlementStatusFilter]);

  return (
    <AdminShell
      title="Wallet, Payouts, Settlement & Refund Center"
      subtitle="Comprehensive financial clearing house: Customer instant refunds, 3-way GMV escrow splits, partner payouts, and double-entry audit ledgers."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setGlobalAdjustOpen(true)}
            className="h-8 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-xs"
          >
            <PlusCircle className="size-3.5 mr-1.5 text-emerald-400" />
            <span>Manual Recharge / Deduct</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportWalletsCsv}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <Download className="size-3.5 mr-1.5 text-zinc-500" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              walletsQuery.refetch();
              refundsQuery.refetch();
              refundStatsQuery.refetch();
              withdrawalsQuery.refetch();
              transactionsQuery.refetch();
              toast.success("Financial records refreshed!");
            }}
            disabled={walletsQuery.isRefetching}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${walletsQuery.isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <IssueRefundDialog />
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP FINANCIAL METRIC CARDS (6 METRICS)
        ========================================================================= */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            kpi={{
              id: "tot-escrow",
              label: "Platform Escrow Pool",
              value: `₹${walletSummary.totalBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              hint: `${allWallets.length} registered wallets`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "cust-pool",
              label: "Customer Float Pool",
              value: `₹${walletSummary.customerBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              hint: `${allWallets.filter((w) => w.role === "customer").length} Customer Accounts`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "partner-escrow",
              label: "Partner Store Balances",
              value: `₹${walletSummary.partnerBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              hint: `${allWallets.filter((w) => w.role === "partner").length} Partner Stores`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "rider-escrow",
              label: "Delivery Fleet Balances",
              value: `₹${walletSummary.riderBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              hint: `${allWallets.filter((w) => w.role === "rider").length} Active Captains`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "fleet-cod",
              label: "Fleet COD Float in Hand",
              value: `₹${walletSummary.codFloat.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              hint: walletSummary.codFloat > 0 ? "Pending rider cash deposit" : "All cash cleared",
              positive: walletSummary.codFloat === 0,
            }}
          />
          <KpiCard
            kpi={{
              id: "blocked-wallets",
              label: "Frozen / Blocked Wallets",
              value: `${walletSummary.blockedCount} Accounts`,
              hint: walletSummary.blockedCount > 0 ? "Under security freeze" : "Zero frozen accounts",
              positive: walletSummary.blockedCount === 0,
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
                <TabsTrigger value="settlements" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  ⚖️ Auto Settlement Engine ({settlementsOverview?.settlements?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="wallets" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  💳 All Accounts ({allWallets.length})
                </TabsTrigger>
                <TabsTrigger value="refunds" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🔄 Customer Refunds Engine ({allRefunds.length})
                </TabsTrigger>
                <TabsTrigger value="withdrawals" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🏦 Payout Requests ({allWithdrawals.length})
                </TabsTrigger>
                <TabsTrigger value="split" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  📊 3-Way Revenue Split
                </TabsTrigger>
                <TabsTrigger value="ledger" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  📜 Double-Entry Ledger ({allTxns.length})
                </TabsTrigger>
                <TabsTrigger value="cod" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🛵 Fleet COD Settlement
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Double-Entry Reconciled</span>
            </div>
          </div>
        </SectionCard>

        {/* =========================================================================
            AUTO SETTLEMENT & PROFIT MARGIN ENGINE TAB
        ========================================================================= */}
        {activeTab === "settlements" && (
          <SectionCard
            title="Auto Settlement & Profit Margin Engine"
            description="Autonomous double-entry clearing house: Partner store net payouts, Captain delivery earnings, and QuickPress platform commission margin."
            action={
              <Button
                size="sm"
                onClick={() => {
                  if (confirm("Execute automated payout settlement for all pending partner and captain balances?")) {
                    batchDisburseMutation.mutate();
                  }
                }}
                disabled={batchDisburseMutation.isPending}
                className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                <Banknote className={`size-3.5 ${batchDisburseMutation.isPending ? "animate-spin" : ""}`} />
                <span>{batchDisburseMutation.isPending ? "Disbursing..." : "Batch Settle All Payouts"}</span>
              </Button>
            }
          >
            <div className="space-y-6">
              {/* Settlement Metrics Cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-100 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>Partner Store Payouts</span>
                    <Store className="size-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-950">
                    ₹{settlementsOverview?.summary.totalPartnerSettled?.toLocaleString("en-IN") || "0.00"}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                    Net 85% item earnings settled to stores
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-100 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                    <span>Captain Delivery Payouts</span>
                    <Bike className="size-4 text-amber-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-950">
                    ₹{settlementsOverview?.summary.totalRiderSettled?.toLocaleString("en-IN") || "0.00"}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-amber-700">
                    Pickup & doorstep delivery trip earnings
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50/40 border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-800">
                    <span>Platform Commission (Revenue)</span>
                    <TrendingUp className="size-4 text-indigo-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-indigo-950">
                    ₹{settlementsOverview?.summary.totalPlatformCommission?.toLocaleString("en-IN") || "0.00"}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-indigo-700">
                    12% - 18% realized commission on orders
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50/40 border border-purple-100 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-800">
                    <span>Platform Net Margin (Profit)</span>
                    <ShieldCheck className="size-4 text-purple-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-purple-950">
                    ₹{settlementsOverview?.summary.totalPlatformNetMargin?.toLocaleString("en-IN") || "0.00"}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-purple-700">
                    Pure platform net margin after all payouts
                  </div>
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by order, partner, captain, or UTR..."
                    className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={settlementRoleFilter} onValueChange={(v: any) => setSettlementRoleFilter(v)}>
                    <SelectTrigger className="h-9 w-44 rounded-xl bg-white text-xs border-zinc-200">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌐 All Accounts</SelectItem>
                      <SelectItem value="partner">🏪 Partner Stores Only</SelectItem>
                      <SelectItem value="rider">🛵 Delivery Captains Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={settlementStatusFilter} onValueChange={(v: any) => setSettlementStatusFilter(v)}>
                    <SelectTrigger className="h-9 w-36 rounded-xl bg-white text-xs border-zinc-200">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">⚡ All Status</SelectItem>
                      <SelectItem value="settled">✅ Settled</SelectItem>
                      <SelectItem value="pending">⏳ Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Settlements Table */}
              <DataTable
                headers={[
                  "Recipient Account",
                  "Account Type",
                  "Order / Period",
                  "Gross Value",
                  "Commission / Deductions",
                  "Net Payout",
                  "Status",
                  "Bank UTR Ref",
                  "Date",
                  "Action",
                ]}
                rows={filteredSettlements.map((s) => [
                  <div key="acc" className="flex items-center gap-2">
                    <div className={`size-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      s.role === "partner" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {s.role === "partner" ? <Store className="size-3.5" /> : <Bike className="size-3.5" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-zinc-900">{s.accountName}</div>
                      <div className="text-[10px] text-zinc-400">ID: {s.id.slice(0, 14)}</div>
                    </div>
                  </div>,
                  <span key="role" className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    s.role === "partner" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {s.role === "partner" ? "Partner Store" : "Captain Fleet"}
                  </span>,
                  <span key="ord" className="font-mono text-xs font-bold text-zinc-800">{s.orderCode}</span>,
                  <span key="gross" className="text-xs font-semibold text-zinc-600">₹{s.grossAmount.toFixed(2)}</span>,
                  <span key="comm" className="text-xs font-semibold text-rose-600">-₹{s.commission.toFixed(2)}</span>,
                  <span key="net" className="font-mono text-xs font-black text-emerald-950">₹{s.netPayout.toFixed(2)}</span>,
                  <StatusPill
                    key="status"
                    status={s.status.toLowerCase() === "settled" ? "completed" : "pending"}
                    label={s.status}
                  />,
                  <span key="utr" className="font-mono text-[11px] text-zinc-500">{s.utr}</span>,
                  <span key="date" className="text-[11px] text-zinc-500">{s.date}</span>,
                  <div key="act">
                    {s.status.toLowerCase() === "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveSettlementMutation.mutate(s.id)}
                        disabled={approveSettlementMutation.isPending}
                        className="h-7 text-[10px] font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                      >
                        Settle Now
                      </Button>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600" /> Settled
                      </span>
                    )}
                  </div>,
                ])}
              />
            </div>
          </SectionCard>
        )}

        {/* =========================================================================
            3. TAB 1: ALL WALLETS DIRECTORY
        ========================================================================= */}
        {activeTab === "wallets" && (
          <SectionCard
            title="Unified Accounts & Wallets Directory"
            description="Manage and audit customer, partner hub, and rider fleet balances with instant recharge, deduction, statement ledger, and wallet freeze controls."
          >
            {/* Multi-Dimensional Filter Controls */}
            <div className="space-y-3 pb-4 border-b border-zinc-100">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
                {/* Search */}
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, phone, city, or ID..."
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

                {/* Role Filter */}
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 rounded-xl bg-white text-xs border-zinc-200">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🌐 All Roles ({allWallets.length})</SelectItem>
                    <SelectItem value="customer">👤 Customers ({allWallets.filter((w) => w.role === "customer").length})</SelectItem>
                    <SelectItem value="partner">🏪 Partner Stores ({allWallets.filter((w) => w.role === "partner").length})</SelectItem>
                    <SelectItem value="rider">🚴 Captains ({allWallets.filter((w) => w.role === "rider").length})</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="h-9 rounded-xl bg-white text-xs border-zinc-200">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🛡️ All Status</SelectItem>
                    <SelectItem value="active">🟢 Active Accounts</SelectItem>
                    <SelectItem value="blocked">🔴 Blocked / Frozen</SelectItem>
                  </SelectContent>
                </Select>

                {/* City / Hub Filter */}
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="h-9 rounded-xl bg-white text-xs border-zinc-200">
                    <SelectValue placeholder="All Hubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📍 All Operating Hubs</SelectItem>
                    {availableCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Activity Filter */}
                <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
                  <SelectTrigger className="h-9 rounded-xl bg-white text-xs border-zinc-200">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📅 All Time</SelectItem>
                    <SelectItem value="today">⚡ Today</SelectItem>
                    <SelectItem value="yesterday">⏳ Yesterday</SelectItem>
                    <SelectItem value="7d">🗓️ Last 7 Days</SelectItem>
                    <SelectItem value="30d">🗓️ Last 30 Days</SelectItem>
                    <SelectItem value="this_month">📆 This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By & Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-zinc-900">
                    Showing {filteredWallets.length} of {allWallets.length} accounts
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-zinc-600">
                    Combined Float Pool: <strong className="text-zinc-950 font-black">₹{walletSummary.filteredTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                  </span>
                  {isWalletFiltered && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={resetWalletFilters}
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
                      <SelectItem value="balance_desc">💰 Balance (High to Low)</SelectItem>
                      <SelectItem value="balance_asc">🪙 Balance (Low to High)</SelectItem>
                      <SelectItem value="earned_desc">📈 Total Earned</SelectItem>
                      <SelectItem value="spent_desc">🛍️ Total Spent</SelectItem>
                      <SelectItem value="name_asc">🔤 Name (A - Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DataTable
              loading={walletsQuery.isLoading}
              rows={filteredWallets}
              emptyMessage="No wallets match the specified filters. Try resetting filters."
              columns={[
                {
                  key: "name",
                  label: "Account Identity & Hub",
                  render: (w) => (
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                          w.role === "customer"
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : w.role === "partner"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-sky-50 text-sky-700 border border-sky-100"
                        }`}
                      >
                        {w.role === "customer" ? <User className="size-4" /> : w.role === "partner" ? <Store className="size-4" /> : <Bike className="size-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-950 text-xs truncate">{w.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {w.phone} · <span className="font-sans">{w.city || "Kasganj Hub"}</span>
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "role",
                  label: "Account Role",
                  render: (w) => (
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        w.role === "customer"
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : w.role === "partner"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-sky-50 text-sky-800 border border-sky-200"
                      }`}
                    >
                      {w.role === "customer" ? "Customer" : w.role === "partner" ? "Partner Store" : "Captain Fleet"}
                    </span>
                  ),
                },
                {
                  key: "balance",
                  label: "Available Balance",
                  render: (w) => (
                    <span className="font-black text-xs text-zinc-950 tabular-nums">
                      ₹{w.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ),
                },
                {
                  key: "totalEarned",
                  label: "Inflow / Volume",
                  render: (w) => (
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-emerald-600 text-[11px] tabular-nums">
                        +₹{w.totalEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-zinc-400 tabular-nums">
                        Spent: ₹{(w.totalSpent ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "cod",
                  label: "COD Float",
                  render: (w) =>
                    w.role === "rider" && (w.codBalance ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                        <Banknote className="size-3 text-amber-700" />
                        ₹{(w.codBalance ?? 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">-</span>
                    ),
                },
                {
                  key: "status",
                  label: "Security Status",
                  render: (w) => {
                    const isBlocked = w.status === "Blocked" || (w as any).isBlocked;
                    return isBlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-700 border border-rose-200">
                        <Lock className="size-2.5" /> Frozen
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="size-2.5" /> Active
                      </span>
                    );
                  },
                },
                {
                  key: "actions",
                  label: "Wallet Actions",
                  render: (w) => {
                    const isBlocked = w.status === "Blocked" || (w as any).isBlocked;
                    return (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                          onClick={() => setAdjustTarget(w)}
                          title="Recharge or Deduct Wallet Balance"
                        >
                          <Sliders className="size-3 mr-1" /> Recharge / Deduct
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-lg text-xs font-bold text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                          onClick={() => setStatementTarget(w)}
                          title="View Complete Payment History & Statement"
                        >
                          <History className="size-3 mr-1 text-zinc-500" /> Statement
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 px-2 rounded-lg text-xs font-bold ${
                            isBlocked
                              ? "text-amber-700 border-amber-300 hover:bg-amber-50"
                              : "text-rose-600 border-rose-200 hover:bg-rose-50"
                          }`}
                          onClick={() => setBlockTarget(w)}
                          title={isBlocked ? "Unfreeze Wallet Access" : "Freeze / Lock Wallet Access"}
                        >
                          {isBlocked ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                        </Button>
                      </div>
                    );
                  },
                },
              ]}
            />
          </SectionCard>
        )}

        {/* =========================================================================
            4. TAB 2: CUSTOMER REFUNDS & REVERSALS ENGINE
        ========================================================================= */}
        {activeTab === "refunds" && (
          <div className="space-y-6">
            <SectionCard
              title="Customer Refund & Reversals Management"
              description="Process instant wallet credits or Razorpay payment gateway chargeback reversals."
            >
              <DataTable
                loading={refundsQuery.isLoading}
                rows={filteredRefunds}
                emptyMessage="No refund records found."
                columns={[
                  {
                    key: "refundNumber",
                    label: "Refund ID & Order",
                    render: (r) => (
                      <div className="space-y-0.5 font-mono text-xs">
                        <p className="font-bold text-zinc-900">{r.refundNumber}</p>
                        <p className="text-[10px] text-zinc-400">Order: #{r.orderNumber}</p>
                      </div>
                    ),
                  },
                  {
                    key: "customerName",
                    label: "Customer Details",
                    render: (r) => (
                      <div>
                        <p className="font-bold text-xs text-zinc-900">{r.customerName}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{r.customerPhone}</p>
                      </div>
                    ),
                  },
                  {
                    key: "amount",
                    label: "Refund Amount",
                    render: (r) => (
                      <span className="inline-flex items-center gap-0.5 rounded-lg bg-red-50 px-2 py-0.5 text-xs font-black text-red-700 border border-red-200">
                        ₹{r.amount.toFixed(2)}
                      </span>
                    ),
                  },
                  {
                    key: "method",
                    label: "Refund Destination",
                    render: (r) => (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-700">
                        {r.method === "wallet" ? (
                          <Wallet className="size-3.5 text-emerald-600" />
                        ) : (
                          <CreditCard className="size-3.5 text-sky-600" />
                        )}
                        {r.methodLabel}
                      </span>
                    ),
                  },
                  {
                    key: "reason",
                    label: "Dispute Reason / Notes",
                    render: (r) => (
                      <div className="text-xs text-zinc-600 max-w-xs">
                        <p className="font-bold text-zinc-800">{r.reason}</p>
                        {r.notes && <p className="text-[10px] text-zinc-400 line-clamp-1">{r.notes}</p>}
                      </div>
                    ),
                  },
                  {
                    key: "createdAt",
                    label: "Date & Staff",
                    render: (r) => (
                      <div className="text-xs text-zinc-500">
                        <p className="font-medium text-zinc-700">{r.createdAt}</p>
                        <p className="text-[10px] text-zinc-400">By {r.processedBy}</p>
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
                    render: (r) => {
                      if (r.status === "Pending") {
                        return (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 shadow-xs"
                              onClick={() => approveRefundMutation.mutate(r.id)}
                            >
                              <Check className="size-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-200 text-[11px] font-bold px-2"
                              onClick={() => {
                                const reason = prompt("Enter rejection reason:");
                                if (reason) rejectRefundMutation.mutate({ id: r.id, reason });
                              }}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        );
                      }
                      return <span className="text-[11px] text-zinc-400 font-bold">✓ Executed</span>;
                    },
                  },
                ]}
              />
            </SectionCard>
          </div>
        )}

        {/* =========================================================================
            5. TAB 3: PAYOUT REQUESTS
        ========================================================================= */}
        {activeTab === "withdrawals" && (
          <SectionCard
            title="Partner & Delivery Captain Payout Requests"
            description="Approve and execute bank transfers for laundry stores and fleet riders."
          >
            <DataTable
              loading={withdrawalsQuery.isLoading}
              rows={allWithdrawals}
              emptyMessage="No pending payout withdrawal requests."
              columns={[
                {
                  key: "account",
                  label: "Account Name",
                  render: (p) => (
                    <div>
                      <p className="font-bold text-zinc-900 text-xs">{p.account}</p>
                      <span className="text-[10px] text-zinc-400 font-medium uppercase">{p.type}</span>
                    </div>
                  ),
                },
                {
                  key: "amount",
                  label: "Withdrawal Amount",
                  render: (p) => <span className="font-black text-xs text-zinc-900">{p.amount}</span>,
                },
                {
                  key: "method",
                  label: "Settlement Destination",
                  render: (p) => <span className="text-xs text-zinc-700 font-mono">{p.method}</span>,
                },
                {
                  key: "requested",
                  label: "Requested Date",
                  render: (p) => <span className="text-xs text-zinc-500">{p.requested}</span>,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (p) => <StatusPill value={p.status} />,
                },
                {
                  key: "actions",
                  label: "Actions",
                  render: (p) => {
                    if (p.status === "Pending") {
                      return (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 shadow-xs"
                            onClick={() => decideWithdrawalMutation.mutate({ id: p.id, action: "approve" })}
                          >
                            <Check className="size-3 mr-1" /> Approve Payout
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg text-red-600 hover:bg-red-50 text-[11px] font-bold px-2"
                            onClick={() => decideWithdrawalMutation.mutate({ id: p.id, action: "reject" })}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      );
                    }
                    return <span className="text-[11px] text-zinc-400 font-bold">✓ Settled</span>;
                  },
                },
              ]}
            />
          </SectionCard>
        )}

        {/* =========================================================================
            6. TAB 4: 3-WAY REVENUE SPLIT
        ========================================================================= */}
        {activeTab === "split" && (
          <SectionCard
            title="3-Way Financial GMV Distribution Formula"
            description="Real-time split of gross booking volume: 18% Platform Commission, 70% Partner Store Hubs, 12% Delivery Captain Fleet."
          >
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Platform Take Rate</span>
                <p className="text-2xl font-black text-zinc-900">18.0%</p>
                <p className="text-[11px] text-zinc-500">Platform software, support & payment gateway fee</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Partner Store Escrow</span>
                <p className="text-2xl font-black text-emerald-800">70.0%</p>
                <p className="text-[11px] text-zinc-500">Directly allocated to washing & dry cleaning hubs</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Delivery Captain Share</span>
                <p className="text-2xl font-black text-sky-800">12.0%</p>
                <p className="text-[11px] text-zinc-500">Logistics delivery fee + surge incentives</p>
              </div>
            </div>

            <RevenueAreaChart data={splitQuery.data} loading={splitQuery.isLoading} />
          </SectionCard>
        )}

        {/* =========================================================================
            7. TAB 5: DOUBLE-ENTRY LEDGER
        ========================================================================= */}
        {activeTab === "ledger" && (
          <SectionCard
            title="Unified Double-Entry Transaction Ledger"
            description="Complete audit log of credits, debits, refunds, and settlement payouts."
          >
            <DataTable
              loading={transactionsQuery.isLoading}
              rows={allTxns}
              emptyMessage="No ledger transactions recorded."
              columns={[
                {
                  key: "id",
                  label: "Transaction ID",
                  render: (t) => <span className="font-mono text-xs font-bold text-zinc-900">{t.id}</span>,
                },
                {
                  key: "account",
                  label: "Account Name",
                  render: (t) => (
                    <div>
                      <p className="font-bold text-xs text-zinc-900">{t.account}</p>
                      <span className="text-[10px] text-zinc-400 capitalize">{t.role}</span>
                    </div>
                  ),
                },
                {
                  key: "kind",
                  label: "Transaction Description",
                  render: (t) => <span className="text-xs font-medium text-zinc-700">{t.kind}</span>,
                },
                {
                  key: "amount",
                  label: "Amount (INR)",
                  render: (t) => (
                    <span className="font-black text-xs text-zinc-900">
                      ₹{t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  ),
                },
                {
                  key: "date",
                  label: "Date & Time",
                  render: (t) => <span className="text-xs text-zinc-500">{t.date}</span>,
                },
                {
                  key: "status",
                  label: "Status",
                  render: (t) => <StatusPill value={t.status} />,
                },
              ]}
            />
          </SectionCard>
        )}

        {/* =========================================================================
            8. TAB 6: FLEET COD CASH SETTLEMENT
        ========================================================================= */}
        {activeTab === "cod" && (
          <SectionCard
            title="Cash on Delivery (COD) Fleet Settlement"
            description="Track cash collected by delivery riders at customer doorsteps and reconcile daily deposits."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-800">Total COD Cash in Hand</span>
                <p className="text-2xl font-black text-amber-950">₹120.00</p>
                <p className="text-[10px] text-amber-800">Rahul Express Rider (Kasganj)</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-800">Reconciled Deposits</span>
                <p className="text-2xl font-black text-emerald-950">₹0.00</p>
                <p className="text-[10px] text-emerald-800">Zero outstanding discrepancies</p>
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Manual Balance Adjust Dialog */}
      {adjustTarget && (
        <AdjustBalanceDialog target={adjustTarget} onClose={() => setAdjustTarget(null)} />
      )}

      {/* User Statement & Payment History Dialog */}
      {statementTarget && (
        <UserWalletStatementDialog target={statementTarget} onClose={() => setStatementTarget(null)} />
      )}

      {/* Wallet Security Lock / Unlock Dialog */}
      {blockTarget && (
        <BlockWalletDialog target={blockTarget} onClose={() => setBlockTarget(null)} />
      )}

      {/* Global Quick Recharge / Deduct Dialog */}
      <GlobalAdjustWalletDialog
        open={globalAdjustOpen}
        onClose={() => setGlobalAdjustOpen(false)}
        wallets={allWallets}
      />
    </AdminShell>
  );
}

// -----------------------------------------------------------------------------
// ISSUE NEW CUSTOMER REFUND DIALOG
// -----------------------------------------------------------------------------
function IssueRefundDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("QP1041");
  const [customerName, setCustomerName] = useState("Amit Kumar Sharma");
  const [customerPhone, setCustomerPhone] = useState("+91 98719 62596");
  const [amount, setAmount] = useState("126");
  const [method, setMethod] = useState<"wallet" | "gateway">("wallet");
  const [reason, setReason] = useState("Pickup Slot Delay Cancellation");
  const [notes, setNotes] = useState("Order cancelled due to rain delay. Instant refund requested.");

  const mutation = useMutation({
    mutationFn: () =>
      initiateAdminRefund({
        orderId: `ord-${orderNumber}`,
        customerName,
        customerPhone,
        amount: parseFloat(amount) || 0,
        method,
        reason,
        notes,
      }),
    onSuccess: (data) => {
      toast.success(`Refund of ₹${data.amount} issued successfully via ${data.methodLabel}! 🎉`);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "refunds"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "refund-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "all-wallets"] });
    },
    onError: () => toast.error("Failed to process refund."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs">
          <Plus className="size-3.5 mr-1" />
          <span>Issue Customer Refund</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black">Issue Customer Refund & Reversal</DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Credit the customer's QuickPress wallet instantly or trigger a payment gateway chargeback reversal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Order Number / Code</Label>
              <Input
                placeholder="e.g. QP1041"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="h-9 text-xs font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Refund Amount (₹)</Label>
              <Input
                type="number"
                placeholder="126"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 text-xs font-mono font-bold text-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Customer Name</Label>
              <Input
                placeholder="Amit Kumar Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Customer Phone</Label>
              <Input
                placeholder="+91 98719 62596"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Refund Destination Method</Label>
            <Select value={method} onValueChange={(v: any) => setMethod(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wallet">⚡ QuickPress Wallet (Instant 0-Sec Credit)</SelectItem>
                <SelectItem value="gateway">💳 Original Payment Gateway (Razorpay UPI 3-5 Days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Dispute / Refund Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pickup Slot Delay Cancellation">⏰ Pickup Slot Delay Cancellation</SelectItem>
                <SelectItem value="Promotional Voucher Adjustment">🏷️ Promotional Voucher Adjustment</SelectItem>
                <SelectItem value="Garment Stain Rework Claim">🧺 Garment Stain Rework / Quality Grievance</SelectItem>
                <SelectItem value="Customer Initiated Order Cancel">❌ Customer Initiated Order Cancel</SelectItem>
                <SelectItem value="Store Hub Capacity Rejection">🏪 Store Hub Capacity Rejection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Internal Audit Notes</Label>
            <Textarea
              rows={2}
              placeholder="Add explanation for admin audit record..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-9 rounded-xl text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!amount || mutation.isPending}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
          >
            {mutation.isPending ? "Processing..." : `Execute ₹${amount} Refund`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// ADJUST BALANCE DIALOG (RECHARGE & DEDUCT WITH PRESETS & PREVIEW)
// -----------------------------------------------------------------------------
function AdjustBalanceDialog({ target, onClose }: { target: AccountWallet; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("100");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [presetCategory, setPresetCategory] = useState("Goodwill / Courtesy Credit");
  const [remarks, setRemarks] = useState("");

  const numAmount = parseFloat(amount) || 0;
  const newBalance = type === "credit" ? target.balance + numAmount : target.balance - numAmount;

  const mutation = useMutation({
    mutationFn: () =>
      adjustWalletBalance({
        accountId: target.id,
        role: target.role,
        amount: numAmount,
        type,
        reason: remarks.trim() ? `${presetCategory} - ${remarks.trim()}` : presetCategory,
      }),
    onSuccess: (data) => {
      toast.success(
        `Wallet ${type === "credit" ? "recharged" : "debited"} successfully! New Balance: ₹${data.newBalance.toFixed(2)}`
      );
      onClose();
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "all-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "kpis"] });
    },
    onError: () => toast.error("Failed to adjust wallet balance."),
  });

  const amountPresets = [50, 100, 250, 500, 1000, 2000, 5000];

  return (
    <Dialog open={Boolean(target)} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md rounded-2xl bg-white border border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-sm font-black text-zinc-950 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <IndianRupee className="size-4" />
            </span>
            Manual Wallet Balance Management
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Recharge or debit funds for <strong>{target.name}</strong> ({target.role.toUpperCase()})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2 text-xs">
          {/* Target Profile Card */}
          <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/80 flex items-center justify-between">
            <div>
              <p className="font-black text-xs text-zinc-900">{target.name}</p>
              <p className="text-[10px] text-zinc-500 font-mono">{target.phone} · {target.city || "Kasganj Hub"}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Current Balance</span>
              <p className="font-black text-sm text-zinc-950 tabular-nums">₹{target.balance.toFixed(2)}</p>
            </div>
          </div>

          {/* Action Toggle (Credit vs Debit) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType("credit");
                setPresetCategory("Goodwill / Courtesy Credit");
              }}
              className={`flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all ${
                type === "credit"
                  ? "bg-emerald-600 text-white shadow-xs font-black"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70"
              }`}
            >
              <PlusCircle className="size-3.5" />
              <span>➕ Recharge (Credit)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType("debit");
                setPresetCategory("Administrative Penalty / Surcharge");
              }}
              className={`flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-all ${
                type === "debit"
                  ? "bg-rose-600 text-white shadow-xs font-black"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70"
              }`}
            >
              <MinusCircle className="size-3.5" />
              <span>➖ Deduct (Debit)</span>
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-900">Adjustment Amount (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-xs">₹</span>
              <Input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 pl-7 text-xs font-mono font-black border-zinc-200"
                placeholder="100"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quick Presets</span>
            <div className="flex flex-wrap gap-1.5">
              {amountPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  className={`h-6 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                    amount === preset.toString()
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  +₹{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Real-Time Calculation Preview */}
          <div
            className={`rounded-xl p-3 border text-xs space-y-1 ${
              type === "credit"
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                : newBalance < 0
                ? "bg-rose-50/80 border-rose-300 text-rose-950"
                : "bg-amber-50/60 border-amber-200 text-amber-950"
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>{type === "credit" ? "Recharge Calculation:" : "Debit Calculation:"}</span>
              <span className="font-mono tabular-nums">
                ₹{target.balance.toFixed(2)} {type === "credit" ? "+" : "-"} ₹{numAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-black/10">
              <span className="font-black">New Calculated Balance:</span>
              <span className="font-black text-sm font-mono tabular-nums">
                ₹{newBalance.toFixed(2)}
              </span>
            </div>
            {type === "debit" && newBalance < 0 && (
              <p className="text-[10px] text-rose-700 font-semibold pt-1">
                ⚠️ Warning: Balance will become negative (-₹{Math.abs(newBalance).toFixed(2)}).
              </p>
            )}
          </div>

          {/* Reason Category Select */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-900">Reason Category</Label>
            <Select value={presetCategory} onValueChange={setPresetCategory}>
              <SelectTrigger className="h-9 text-xs border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {type === "credit" ? (
                  <>
                    <SelectItem value="Goodwill / Courtesy Credit">🎁 Goodwill / Courtesy Credit</SelectItem>
                    <SelectItem value="Promotional Loyalty Bonus">🏷️ Promotional Loyalty Bonus</SelectItem>
                    <SelectItem value="Offline Cash Direct Deposit">💵 Offline Cash Direct Deposit</SelectItem>
                    <SelectItem value="Dispute Resolution Compensation">⚖️ Dispute Resolution Compensation</SelectItem>
                    <SelectItem value="System Balance Correction">🔧 System Balance Correction</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="Administrative Penalty / Surcharge">⚠️ Administrative Penalty / Surcharge</SelectItem>
                    <SelectItem value="Dispute Rework / Damage Deduction">🧺 Dispute Rework / Damage Deduction</SelectItem>
                    <SelectItem value="Duplicate Credit Reversal">🔄 Duplicate Credit Reversal</SelectItem>
                    <SelectItem value="Order Cancellation Charge">❌ Order Cancellation Charge</SelectItem>
                    <SelectItem value="Manual Float Recovery">💼 Manual Float Recovery</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Remarks */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-900">Internal Audit Remarks (Optional)</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved per ticket QP-892"
              className="h-9 text-xs border-zinc-200"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={numAmount <= 0 || mutation.isPending}
            className={`h-9 rounded-xl text-white font-black text-xs shadow-xs ${
              type === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {mutation.isPending
              ? "Executing..."
              : `Confirm ₹${numAmount.toFixed(2)} ${type === "credit" ? "Recharge" : "Deduction"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// USER STATEMENT & PAYMENT HISTORY DIALOG
// -----------------------------------------------------------------------------
function UserWalletStatementDialog({ target, onClose }: { target: AccountWallet; onClose: () => void }) {
  const historyQuery = useQuery({
    queryKey: ["admin", "finance", "user-history", target.id],
    queryFn: () => fetchAccountWalletHistory(target.id),
  });

  const historyItems = historyQuery.data ?? [];

  const { totalInflow, totalOutflow } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    historyItems.forEach((item) => {
      if (item.type === "credit") inflow += item.amount;
      else outflow += item.amount;
    });
    return { totalInflow: inflow, totalOutflow: outflow };
  }, [historyItems]);

  const handleExportStatementCsv = () => {
    const headers = ["Timestamp", "Transaction ID", "Order Reference", "Type", "Amount (INR)", "Description", "Status"];
    const rows = historyItems.map((h) => [
      h.createdAt,
      h.id,
      h.orderCode || "N/A",
      h.type.toUpperCase(),
      h.amount.toFixed(2),
      h.description,
      h.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `statement_${target.name.replace(/\s+/g, "_")}_${target.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Statement CSV exported successfully! 📄");
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl rounded-2xl bg-white border border-zinc-200">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-sm font-black text-zinc-950 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                <FileText className="size-4" />
              </span>
              Account Ledger & Payment Statement
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportStatementCsv}
              disabled={historyItems.length === 0}
              className="h-7 text-xs font-bold text-zinc-700 border-zinc-200 hover:bg-zinc-100 rounded-lg"
            >
              <Download className="size-3 mr-1 text-zinc-500" /> Export CSV
            </Button>
          </div>
          <DialogDescription className="text-xs text-zinc-500">
            Audit-grade double-entry statement for <strong>{target.name}</strong> ({target.role.toUpperCase()})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* User Profile Card */}
          <div className="rounded-xl bg-zinc-50 p-3.5 border border-zinc-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-10 items-center justify-center rounded-xl font-bold text-sm ${
                  target.role === "customer"
                    ? "bg-purple-100 text-purple-700"
                    : target.role === "partner"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-100 text-sky-700"
                }`}
              >
                {target.role === "customer" ? <User className="size-5" /> : target.role === "partner" ? <Store className="size-5" /> : <Bike className="size-5" />}
              </div>
              <div>
                <p className="font-black text-sm text-zinc-950">{target.name}</p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  {target.phone} · <span className="font-sans">{target.city || "Kasganj Hub"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  target.role === "customer"
                    ? "bg-purple-50 text-purple-800 border border-purple-200"
                    : target.role === "partner"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-sky-50 text-sky-800 border border-sky-200"
                }`}
              >
                {target.role}
              </span>
              {target.status === "Blocked" || (target as any).isBlocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-700 border border-rose-200">
                  <Lock className="size-2.5" /> Frozen
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="size-2.5" /> Active
                </span>
              )}
            </div>
          </div>

          {/* 3 Mini KPI Tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Current Balance</span>
              <p className="text-lg font-black text-zinc-950 tabular-nums">₹{target.balance.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Inflow (Credits)</span>
              <p className="text-lg font-black text-emerald-800 tabular-nums">+₹{totalInflow.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-1">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Total Outflow (Debits)</span>
              <p className="text-lg font-black text-rose-800 tabular-nums">-₹{totalOutflow.toFixed(2)}</p>
            </div>
          </div>

          {/* Statement Ledger Table */}
          <div className="rounded-xl border border-zinc-200 overflow-hidden max-h-80 overflow-y-auto">
            {historyQuery.isLoading ? (
              <div className="py-8 text-center text-xs text-zinc-400">Loading payment history...</div>
            ) : historyItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">No payment transaction records found for this account.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Txn Ref / Order</th>
                    <th className="py-2.5 px-3">Type & Amount</th>
                    <th className="py-2.5 px-3">Description / Remarks</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-sans">
                  {historyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-600 whitespace-nowrap">
                        {item.createdAt}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-bold text-zinc-900 block">{item.id}</span>
                        {item.orderCode && (
                          <span className="text-[10px] text-zinc-400 font-mono">Order: #{item.orderCode}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-black tabular-nums ${
                            item.type === "credit"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {item.type === "credit" ? "+" : "-"}₹{item.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-700 max-w-xs truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="size-3" /> {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 rounded-xl text-xs font-bold">
            Close Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// BLOCK / UNBLOCK WALLET SECURITY DIALOG
// -----------------------------------------------------------------------------
function BlockWalletDialog({ target, onClose }: { target: AccountWallet; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isBlocked = target.status === "Blocked" || (target as any).isBlocked;
  const [reason, setReason] = useState(
    isBlocked ? "Administrative Restriction Lifted" : "Suspicious Order Fraud Activity"
  );

  const mutation = useMutation({
    mutationFn: () =>
      toggleWalletBlock({
        accountId: target.id,
        role: target.role,
        block: !isBlocked,
        reason,
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      onClose();
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "all-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "finance", "kpis"] });
    },
    onError: () => toast.error("Failed to update wallet security status."),
  });

  return (
    <Dialog open={Boolean(target)} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md rounded-2xl bg-white border border-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-sm font-black text-zinc-950 flex items-center gap-2">
            <span
              className={`flex size-7 items-center justify-center rounded-lg ${
                isBlocked ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {isBlocked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            </span>
            {isBlocked ? "Unfreeze & Restore Account Wallet" : "Freeze & Lock Account Wallet"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            {isBlocked
              ? `Re-enable wallet access for ${target.name} (${target.role.toUpperCase()}).`
              : `Freeze wallet access for ${target.name} (${target.role.toUpperCase()}) to prevent fraud.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200 flex items-center justify-between">
            <div>
              <p className="font-bold text-xs text-zinc-900">{target.name}</p>
              <p className="text-[10px] text-zinc-400 font-mono">{target.phone} · {target.city || "Kasganj Hub"}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Balance</span>
              <p className="font-black text-xs text-zinc-900">₹{target.balance.toFixed(2)}</p>
            </div>
          </div>

          <div
            className={`rounded-xl p-3 border text-xs ${
              isBlocked ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" : "bg-rose-50/70 border-rose-200 text-rose-950"
            }`}
          >
            {isBlocked ? (
              <p className="font-medium">
                ✅ Unfreezing will immediately restore this user's ability to place laundry orders, receive wallet recharges, and withdraw payout earnings.
              </p>
            ) : (
              <p className="font-medium">
                ⚠️ Freezing locks this wallet. The user will not be able to use wallet balance for orders, receive credits, or disburse bank payouts until restored.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-zinc-900">Reason for {isBlocked ? "Restoration" : "Freeze"}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-9 text-xs border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isBlocked ? (
                  <>
                    <SelectItem value="Administrative Restriction Lifted">🟢 Administrative Restriction Lifted</SelectItem>
                    <SelectItem value="KYC Verification Completed">🛡️ KYC Verification Completed</SelectItem>
                    <SelectItem value="Dispute Resolved Favorably">⚖️ Dispute Resolved Favorably</SelectItem>
                    <SelectItem value="User Identity Re-verified">👤 User Identity Re-verified</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="Suspicious Order Fraud Activity">🚨 Suspicious Order Fraud Activity</SelectItem>
                    <SelectItem value="Negative Cash Balance Default">💸 Negative Cash Balance Default</SelectItem>
                    <SelectItem value="KYC Verification Non-Compliance">📋 KYC Verification Non-Compliance</SelectItem>
                    <SelectItem value="Administrative Investigation">🔍 Administrative Investigation</SelectItem>
                    <SelectItem value="Customer Requested Lock">🔒 Customer Requested Lock</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 rounded-xl text-xs font-bold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={`h-9 rounded-xl text-white font-black text-xs shadow-xs ${
              isBlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {mutation.isPending ? "Processing..." : isBlocked ? "Restore Wallet" : "Confirm Freeze"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// GLOBAL QUICK RECHARGE / DEDUCT DIALOG (ANY USER PICKER)
// -----------------------------------------------------------------------------
function GlobalAdjustWalletDialog({
  open,
  onClose,
  wallets,
}: {
  open: boolean;
  onClose: () => void;
  wallets: AccountWallet[];
}) {
  const [selectedWallet, setSelectedWallet] = useState<AccountWallet | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const matchingWallets = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return wallets.slice(0, 8);
    return wallets
      .filter((w) => [w.name, w.phone, w.city, w.role, w.id].filter(Boolean).join(" ").toLowerCase().includes(q))
      .slice(0, 10);
  }, [wallets, pickerSearch]);

  const handleClose = () => {
    setSelectedWallet(null);
    setPickerSearch("");
    onClose();
  };

  return (
    <>
      <Dialog open={open && !selectedWallet} onOpenChange={handleClose}>
        <DialogContent className="max-w-md rounded-2xl bg-white border border-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-zinc-950 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <PlusCircle className="size-4 text-emerald-400" />
              </span>
              Manual User Wallet Recharge / Deduct
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Select any Customer, Partner Hub, or Delivery Captain to adjust balance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
              <Input
                placeholder="Search user by name, phone, city, or ID..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="h-9 pl-9 text-xs border-zinc-200"
                autoFocus
              />
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {matchingWallets.map((w) => (
                <div
                  key={w.id}
                  onClick={() => setSelectedWallet(w)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-emerald-300 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                        w.role === "customer"
                          ? "bg-purple-50 text-purple-700"
                          : w.role === "partner"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {w.role === "customer" ? <User className="size-4" /> : w.role === "partner" ? <Store className="size-4" /> : <Bike className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-zinc-900 truncate">{w.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {w.phone} · <span className="uppercase">{w.role}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-zinc-400">Balance</span>
                    <p className="font-black text-xs text-zinc-950 tabular-nums">₹{w.balance.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={handleClose} className="h-9 rounded-xl text-xs font-bold">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* When a user is selected, open the adjust dialog for them */}
      {selectedWallet && (
        <AdjustBalanceDialog
          target={selectedWallet}
          onClose={() => {
            setSelectedWallet(null);
            handleClose();
          }}
        />
      )}
    </>
  );
}
