import { useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart2,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  Loader2,
  Menu,
  Percent,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";

import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PartnerCardsSkeleton } from "../components/PartnerSkeletons";
import { usePartnerResource } from "../hooks/use-partner-resource";
import { partnerRoutes } from "../navigation/partner-routes";
import { fetchPartnerProfile } from "@/api/partner/partner-profile-api";
import {
  type FinanceOverviewResponse,
  type TaxInvoice,
  type SettlementOrder,
  type PassbookEntry,
  fetchFinanceOverview,
  fetchFinanceTaxInvoices,
  getCachedFinanceOverview,
  getCachedFinanceInvoices,
  downloadSettlementPdfBlob,
  downloadSettlementExcelBlob,
  downloadPartnerInvoicePdfBlob,
  downloadCommissionInvoicePdfBlob,
  downloadCommissionInvoiceExcelBlob,
} from "@/api/partner/partner-finance-api";
import { SettlementSummaryModal } from "../components/finance/SettlementSummaryModal";
import { formatPartnerId } from "../lib/format-ids";

export function EarningsScreen() {
  const navigate = useNavigate();
  const { data: profile } = usePartnerResource(fetchPartnerProfile);

  const cachedOverview = getCachedFinanceOverview();
  const cachedInvoices = getCachedFinanceInvoices();

  const [financeData, setFinanceData] = useState<FinanceOverviewResponse | null>(cachedOverview);
  const [invoices, setInvoices] = useState<TaxInvoice[]>(cachedInvoices?.invoices || []);
  const [orderInvoices, setOrderInvoices] = useState<TaxInvoice[]>(cachedInvoices?.orderInvoices || []);
  const [loading, setLoading] = useState(!cachedOverview);

  // Subtabs: Passbook (Default) vs Weekly Trends vs Invoices
  const [activeSubTab, setActiveSubTab] = useState<"passbook" | "trends" | "invoices">("passbook");

  // Passbook view mode: By Settlement Cycle or By Individual Orders
  const [passbookViewMode, setPassbookViewMode] = useState<"cycles" | "orders">("cycles");

  const [selectedPastRange, setSelectedPastRange] = useState<string>(cachedOverview?.filterOptions?.[0] || "");
  const [selectedCycleForModal, setSelectedCycleForModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Filter state for orders & cycles
  const [statusFilter, setStatusFilter] = useState<"all" | "settled" | "processing">("all");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchFinanceOverview().catch(() => null),
      fetchFinanceTaxInvoices().catch(() => ({ invoices: [], orderInvoices: [] })),
    ]).then(([overview, invRes]) => {
      if (!alive) return;
      if (overview) {
        setFinanceData(overview);
        if (overview.filterOptions?.length && !selectedPastRange) {
          setSelectedPastRange(overview.filterOptions[0]);
        }
      }
      if (invRes?.invoices) {
        setInvoices(invRes.invoices);
      }
      if (invRes?.orderInvoices) {
        const validOrders = invRes.orderInvoices.filter((inv) => {
          if (!inv || inv.amount <= 0) return false;
          if (inv.orderNumber === "QP-8BD3") return false;
          if (inv.type?.toLowerCase().includes("test customer")) return false;
          return true;
        });
        setOrderInvoices(validOrders);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const copyToClipboard = (text: string, label: string = "UTR") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUtr(text);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => {
      setCopiedUtr(null);
    }, 2000);
  };

  const handleDownloadStatementPdf = async (customCycleId?: string) => {
    const cycle = customCycleId
      ? { cycleId: customCycleId, period: customCycleId }
      : (financeData?.pastCycles.find((c) => c.period === selectedPastRange) || financeData?.pastCycles[0] || { cycleId: "current", period: "Current" });
    if (!cycle?.cycleId) {
      toast.error("No settlement cycle available for download");
      return;
    }
    toast.info(`Preparing official Settlement Statement PDF (${cycle.period})...`);
    try {
      await downloadSettlementPdfBlob(cycle.cycleId);
      toast.success(`Settlement Statement PDF downloaded!`);
    } catch (err: any) {
      console.error("Statement PDF download error:", err);
      toast.error(err.message || "Failed to download settlement statement PDF");
    }
  };

  const handleDownloadStatementExcel = async (customCycleId?: string) => {
    const cycle = customCycleId
      ? { cycleId: customCycleId, period: customCycleId }
      : (financeData?.pastCycles.find((c) => c.period === selectedPastRange) || financeData?.pastCycles[0] || { cycleId: "current", period: "Current" });
    if (!cycle?.cycleId) {
      toast.error("No settlement cycle available for download");
      return;
    }
    toast.info(`Generating Excel / CSV Settlement Statement (${cycle.period})...`);
    try {
      await downloadSettlementExcelBlob(cycle.cycleId);
      toast.success(`Settlement Statement Excel / CSV downloaded!`);
    } catch (err: any) {
      console.error("Statement Excel download error:", err);
      toast.error(err.message || "Failed to download settlement statement Excel");
    }
  };

  const handleDownloadCommissionExcel = async (inv: TaxInvoice) => {
    const urlParts = inv.downloadUrl ? inv.downloadUrl.split("/") : [];
    const periodKey = urlParts[urlParts.length - 2] || "2026-09";
    setDownloadingId(`${inv.invoiceNumber}-excel`);
    toast.info(`Generating Monthly GST Commission Invoice Excel for ${inv.period}...`);
    try {
      await downloadCommissionInvoiceExcelBlob(
        periodKey,
        `QuickPress-Commission-${inv.invoiceNumber}.csv`
      );
      toast.success(`Commission Invoice Excel (${inv.invoiceNumber}) downloaded!`);
    } catch (err: any) {
      console.error("Commission invoice excel download error:", err);
      toast.error(err.message || "Failed to download commission invoice Excel");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadOrderInvoicePdf = async (inv: TaxInvoice) => {
    const targetId = inv.orderNumber || inv.invoiceNumber;
    setDownloadingId(inv.invoiceNumber);
    toast.info(`Preparing official 3-page Tax Invoice ${inv.invoiceNumber}...`);
    try {
      await downloadPartnerInvoicePdfBlob(
        targetId,
        `QuickPress-Invoice-${inv.invoiceNumber.replace(/\//g, "-")}.pdf`
      );
      toast.success(`Tax Invoice ${inv.invoiceNumber} downloaded!`);
    } catch (err: any) {
      console.error("Order invoice download error:", err);
      toast.error(err.message || "Failed to download tax invoice PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCommissionPdf = async (inv: TaxInvoice) => {
    const urlParts = inv.downloadUrl ? inv.downloadUrl.split("/") : [];
    const periodKey = urlParts[urlParts.length - 2] || "2026-09";
    setDownloadingId(inv.invoiceNumber);
    toast.info(`Generating Monthly GST Commission Invoice for ${inv.period}...`);
    try {
      await downloadCommissionInvoicePdfBlob(
        periodKey,
        `QuickPress-Commission-${inv.invoiceNumber}.pdf`
      );
      toast.success(`Commission Invoice ${inv.invoiceNumber} downloaded!`);
    } catch (err: any) {
      console.error("Commission invoice download error:", err);
      toast.error(err.message || "Failed to download commission invoice PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredOrderInvoices = orderInvoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.orderNumber && inv.orderNumber.toLowerCase().includes(q)) ||
      inv.type.toLowerCase().includes(q)
    );
  });

  const currentCycle = financeData?.currentCycle;
  const pastCycles = financeData?.pastCycles || [];
  const adminCommRate = financeData?.commissionRatePct ?? 15;

  const bankDetails = financeData?.bankDetails || {
    accountHolder: profile?.businessName || profile?.ownerName || "Merchant Partner",
    bankName: "HDFC Bank",
    accountNumberMasked: "•••• •••• 4545",
    ifsc: "HDFC0000240",
    utr: null,
    transferMode: "NPCI IMPS / NEFT Auto-Credit",
  };

  // Passbook Cycle Entries
  const passbookCycles: PassbookEntry[] = financeData?.passbook || [
    ...pastCycles.map((c) => ({
      id: c.cycleId,
      type: "cycle_settlement" as const,
      title: `Weekly Settlement • ${c.period}`,
      period: c.period,
      date: c.payoutDate,
      utr: c.utr || null,
      status: (c.status === "PAID" ? "SETTLED" : c.status) as any,
      orderCount: c.orderCount,
      grossAmount: c.grossAmount || 0,
      commissionAmount: c.commissionAmount || 0,
      tcsAmount: c.tcsAmount || 0,
      taxTotal: c.taxTotal || 0,
      netCredit: c.netPayout,
      bankName: c.bankName || bankDetails.bankName,
      accountNumberMasked: c.accountNumberMasked || bankDetails.accountNumberMasked,
      cycleId: c.cycleId,
    })),
    ...(currentCycle
      ? [
          {
            id: "current",
            type: "current_cycle" as const,
            title: `Current Accruing Cycle • ${currentCycle.period}`,
            period: currentCycle.period,
            date: currentCycle.payoutDate,
            utr: null,
            status: "ACCRUING" as const,
            orderCount: currentCycle.orderCount,
            grossAmount: currentCycle.grossAmount || 0,
            commissionAmount: currentCycle.commissionAmount || 0,
            tcsAmount: currentCycle.tcsAmount || 0,
            taxTotal: (currentCycle.commissionAmount || 0) * 0.18 + (currentCycle.tcsAmount || 0),
            netCredit: currentCycle.estPayout,
            bankName: bankDetails.bankName,
            accountNumberMasked: bankDetails.accountNumberMasked,
            cycleId: "current",
          },
        ]
      : []),
  ];

  // All settled orders for order-level passbook
  const allOrders: SettlementOrder[] = financeData?.allSettledOrders?.length
    ? financeData.allSettledOrders
    : financeData?.currentOrders || [];

  // Filtered passbook cycles
  const filteredCycles = passbookCycles.filter((c) => {
    if (statusFilter === "settled" && c.status !== "SETTLED" && c.status !== "PAID") return false;
    if (statusFilter === "processing" && c.status !== "ACCRUING" && c.status !== "PROCESSING") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        c.period.toLowerCase().includes(q) ||
        (c.utr && c.utr.toLowerCase().includes(q)) ||
        c.title.toLowerCase().includes(q) ||
        c.date.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered passbook orders
  const filteredPassbookOrders = allOrders.filter((ord) => {
    if (
      statusFilter === "settled" &&
      !ord.isSettled &&
      ord.settlementStatus !== "PAID" &&
      ord.settlementStatus !== "SETTLED"
    )
      return false;
    if (
      statusFilter === "processing" &&
      (ord.isSettled || ord.settlementStatus === "PAID" || ord.settlementStatus === "SETTLED")
    )
      return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        ord.orderCode.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.itemsSummary.toLowerCase().includes(q) ||
        (ord.utr && ord.utr.toLowerCase().includes(q)) ||
        (ord.cyclePeriod && ord.cyclePeriod.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Total Settled directly to bank (completed disbursements)
  const totalBankSettled = passbookCycles
    .filter((c) => c.status === "SETTLED" || c.status === "PAID")
    .reduce((sum, c) => sum + (c.netCredit || 0), 0);

  // Current Accruing Balance
  const currentAccruingBalance = currentCycle?.estPayout || 0;

  // Daily trend calculations for graph
  const dailyTrend = financeData?.dailyTrend || [];
  const maxDailyAmount = Math.max(
    ...dailyTrend.map((d) => Math.max(d.grossAmount, d.netPayout, 1)),
    100
  );

  // Filtered orders for weekly trend tab
  const currentOrders: SettlementOrder[] = financeData?.currentOrders || [];
  const filteredTrendOrders = currentOrders.filter((ord) => {
    if (statusFilter === "settled" && !ord.isSettled) return false;
    if (statusFilter === "processing" && ord.isSettled) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        ord.orderCode.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.itemsSummary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // If viewing settlement detail, render full in-page view without modal cutoff!
  if (selectedCycleForModal) {
    return (
      <PartnerLayout
        activeTab="earnings"
        title="Settlement Breakdown"
        subtitle="Complete double-entry accounting reconciliation"
      >
        <SettlementSummaryModal
          cycleId={selectedCycleForModal}
          onClose={() => setSelectedCycleForModal(null)}
        />
        <Toaster />
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout
      activeTab="earnings"
      title="Settlement Passbook & Finance"
      subtitle="Complete bank settlement passbook, double-entry ledger, and GST reconciliation"
    >
      {/* ========================================================================= */}
      {/* MOBILE VIEW (< md) — Pure White & High Contrast Banking Layout            */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-white pb-28 text-black md:hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white px-4 pt-3.5 pb-3 border-b border-zinc-200">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black tracking-tight text-black">
                {profile?.businessName || profile?.ownerName || "Merchant Store"}
              </h1>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-500">
                ID: {formatPartnerId(profile?.partnerId)} •{" "}
                {profile?.city ? `${profile.city} Operations Hub` : "Store Operations Hub"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={partnerRoutes.notifications}
                className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-black hover:bg-zinc-200 active:scale-95 transition"
                title="Notifications"
              >
                <Bell className="size-4" />
              </Link>
              <Link
                to={partnerRoutes.profile}
                className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-black hover:bg-zinc-200 active:scale-95 transition"
                title="Store Settings"
              >
                <Menu className="size-5" />
              </Link>
            </div>
          </div>

          {/* Subtabs: Passbook vs Weekly Cycles vs Invoices */}
          <div className="mt-3.5 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSubTab("passbook")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeSubTab === "passbook"
                  ? "bg-black text-white shadow-xs"
                  : "border border-zinc-200 bg-white text-black hover:bg-zinc-100 shadow-2xs"
              }`}
            >
              <Wallet className="size-3.5" />
              <span>Payouts</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("trends")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeSubTab === "trends"
                  ? "bg-black text-white shadow-xs"
                  : "border border-zinc-200 bg-white text-black hover:bg-zinc-100 shadow-2xs"
              }`}
            >
              <BarChart2 className="size-3.5" />
              <span>Weekly Trends</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("invoices")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                activeSubTab === "invoices"
                  ? "bg-black text-white shadow-xs"
                  : "border border-zinc-200 bg-white text-black hover:bg-zinc-100 shadow-2xs"
              }`}
            >
              <FileText className="size-3.5" />
              <span>Invoices & taxes</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
            <p className="text-xs font-bold text-zinc-500">Loading settlement passbook...</p>
          </div>
        ) : activeSubTab === "passbook" ? (
          /* Mobile Settlement Passbook Tab */
          <div className="space-y-4 p-4">
            {/* 1. CURRENT CYCLE HERO CARD (Zomato Style) */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    Current Cycle
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <h3 className="text-3xl font-black tracking-tight text-black">
                      ₹{currentAccruingBalance.toFixed(2)}
                    </h3>
                    <span className="text-xs font-semibold text-zinc-500">Est. payout</span>
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-black text-amber-800">
                  In Progress ⏳
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="text-zinc-600 font-medium">
                  <span className="font-bold text-black">{currentCycle?.period || "Current Week"}</span>
                  <span className="text-zinc-400 mx-1.5">•</span>
                  <span>{currentCycle?.orders?.length || 0} orders</span>
                </div>
                <p className="text-[11px] font-bold text-zinc-500">Bank credit on Monday</p>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedCycleForModal("current")}
                  className="text-xs font-black text-black hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View details</span>
                  <span>→</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-zinc-500">Total Settled:</span>
                  <span className="text-xs font-black text-emerald-700">₹{totalBankSettled.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 2. LINKED BANK ACCOUNT DISBURSAL CARD */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-black shrink-0">
                  <Building2 className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-black truncate">
                    {bankDetails.bankName} • {bankDetails.accountNumberMasked}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-semibold">IFSC: {bankDetails.ifsc}</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-black text-emerald-800 shrink-0">
                IMPS Disbursal ✓
              </span>
            </div>

            {/* Mode Switcher: By Cycle vs By Orders */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-1 rounded-xl border border-zinc-200 bg-zinc-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setPassbookViewMode("cycles")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-black transition cursor-pointer ${
                    passbookViewMode === "cycles"
                      ? "bg-white text-black shadow-2xs"
                      : "text-zinc-500 hover:text-black"
                  }`}
                >
                  Weekly Cycles ({filteredCycles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPassbookViewMode("orders")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-black transition cursor-pointer ${
                    passbookViewMode === "orders"
                      ? "bg-white text-black shadow-2xs"
                      : "text-zinc-500 hover:text-black"
                  }`}
                >
                  Itemized Orders ({filteredPassbookOrders.length})
                </button>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by UTR, Order #, or Date..."
                  className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-8.5 pr-3 text-xs font-medium text-black placeholder:text-zinc-400 focus:border-black focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-black text-white"
                      : "border border-zinc-200 bg-white text-zinc-600"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("settled")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition cursor-pointer ${
                    statusFilter === "settled"
                      ? "bg-black text-white"
                      : "border border-zinc-200 bg-white text-zinc-600"
                  }`}
                >
                  Settled
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("processing")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition cursor-pointer ${
                    statusFilter === "processing"
                      ? "bg-black text-white"
                      : "border border-zinc-200 bg-white text-zinc-600"
                  }`}
                >
                  Processing
                </button>
              </div>
            </div>

            {/* Passbook Content: Cycles or Orders */}
            {passbookViewMode === "cycles" ? (
              <div className="space-y-3">
                {filteredCycles.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-xs font-medium text-zinc-400">
                    No settlement cycles found matching this filter.
                  </div>
                ) : (
                  filteredCycles.map((entry) => {
                    const isAccruing = entry.status === "ACCRUING";
                    return (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3"
                      >
                        {/* Header: Date, Period, Status */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-black">{entry.period}</span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-black ${
                                  isAccruing
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                              >
                                {isAccruing ? "ACCRUING ⏳" : "SETTLED ✓"}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              Payout Date: {entry.date} · {entry.orderCount} Orders
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black text-black">
                              ₹{entry.grossAmount.toFixed(2)}
                            </span>
                            <p className="text-[10px] font-semibold text-zinc-400">Total Order Value</p>
                          </div>
                        </div>

                        {/* UTR Chip with 1-click copy */}
                        {entry.utr && (
                          <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-150 px-3 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="size-3 text-zinc-500" />
                              <span className="text-[11px] font-mono font-bold text-zinc-800">
                                UTR: {entry.utr}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(entry.utr!, "Bank UTR")}
                              className="text-[11px] font-bold text-black flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              {copiedUtr === entry.utr ? (
                                <Check className="size-3 text-emerald-600" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                              <span>{copiedUtr === entry.utr ? "Copied" : "Copy"}</span>
                            </button>
                          </div>
                        )}

                        {/* Order Summary Strip */}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-center border-t border-zinc-100">
                          <div className="p-2 rounded-xl bg-zinc-50">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase">Cycle Orders</p>
                            <p className="text-xs font-black text-black">
                              {entry.orderCount} Orders
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-zinc-50">
                            <p className="text-[9px] font-bold text-zinc-400 uppercase">Total Order Price</p>
                            <p className="text-xs font-black text-black">
                              ₹{entry.grossAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                          <button
                            type="button"
                            onClick={() => setSelectedCycleForModal(entry.cycleId)}
                            className="text-xs font-black text-black hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>सेटलमेंट विवरण (Breakdown)</span>
                            <span>→</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadStatementPdf(entry.cycleId)}
                              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold text-black hover:bg-zinc-100"
                            >
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadStatementExcel(entry.cycleId)}
                              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-bold text-black hover:bg-zinc-100"
                            >
                              CSV
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Order-by-order Passbook List */
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    Itemized Order Credits ({filteredPassbookOrders.length})
                  </h3>
                  <span className="text-[10px] text-zinc-400">Double-entry accounting</span>
                </div>

                {filteredPassbookOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs font-medium text-zinc-400">
                    No orders match your search or filter.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {filteredPassbookOrders.map((ord) => (
                      <div
                        key={ord.orderId}
                        onClick={() => setSelectedCycleForModal(ord.cycleId || "current")}
                        className="py-3 cursor-pointer active:bg-zinc-50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-black">#{ord.orderCode}</span>
                              <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[9px] font-bold">
                                {ord.settlementStatus || (ord.isSettled ? "SETTLED" : "ACCRUING")}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{ord.itemsSummary}</p>
                            <p className="text-[10px] text-zinc-400 font-medium">
                              Customer: {ord.customerName} · {ord.date}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-black">
                              ₹{ord.grossValue.toFixed(2)}
                            </span>
                            <p className="text-[10px] text-zinc-500 font-semibold">Order Price</p>
                          </div>
                        </div>

                        {ord.utr && (
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500 bg-zinc-50 rounded px-2 py-0.5">
                            <span>UTR: {ord.utr}</span>
                            <span className="font-bold text-black">Cycle: {ord.cyclePeriod || "Weekly"}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeSubTab === "trends" ? (
          /* Mobile Weekly Trend Tab */
          <div className="space-y-4 p-4">
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-950" />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-black" />
                    <p className="text-[11px] font-black uppercase tracking-wider text-black">
                      Ongoing Weekly Cycle
                    </p>
                  </div>
                  <p className="mt-0.5 text-sm font-black text-black">
                    {currentCycle?.period || "Weekly Accrual"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-zinc-500">Scheduled Payout</p>
                  <p className="mt-0.5 text-xs font-black text-black">
                    {currentCycle?.payoutDate !== "-" ? currentCycle?.payoutDate : "Every Monday"}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Current Cycle Orders Total
                </p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-black tracking-tight">
                    ₹{(currentCycle?.grossSales ?? currentCycle?.estPayout ?? 0).toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-zinc-500">
                  {currentCycle?.orderCount || 0} delivered orders · Automated Weekly Settlement
                </p>
              </div>
            </div>

            {/* Weekly Revenue & Orders Bar Chart */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    Weekly Orders Trend
                  </h3>
                  <p className="text-[10px] text-zinc-500">7-Day Daily Orders Distribution</p>
                </div>
                <span className="rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-800">
                  {currentCycle?.period}
                </span>
              </div>
              <div className="pt-2 pb-1">
                <div className="flex items-end justify-between gap-1.5 h-28">
                  {dailyTrend.map((d) => {
                    const displayAmt = d.grossAmount || d.netPayout || 0;
                    const pct = Math.max(
                      Math.min(Math.round((displayAmt / maxDailyAmount) * 100), 100),
                      displayAmt > 0 ? 12 : 4
                    );
                    return (
                      <div
                        key={d.day}
                        className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                      >
                        <span className="text-[9px] font-black text-zinc-600">
                          {displayAmt > 0 ? `₹${Math.round(displayAmt)}` : "—"}
                        </span>
                        <div className="w-full bg-zinc-100 rounded-t-md h-20 flex items-end">
                          <div
                            style={{ height: `${pct}%` }}
                            className={`w-full rounded-t-md transition-all duration-300 ${
                              d.isToday
                                ? "bg-black"
                                : displayAmt > 0
                                ? "bg-zinc-800"
                                : "bg-zinc-200"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-bold ${
                            d.isToday ? "text-black underline" : "text-zinc-500"
                          }`}
                        >
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Current Cycle Orders */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-black">
                  Current Cycle Orders ({filteredTrendOrders.length})
                </h3>
              </div>
              {filteredTrendOrders.length === 0 ? (
                <div className="py-6 text-center text-xs font-medium text-zinc-400">
                  No orders delivered in this cycle yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {filteredTrendOrders.map((ord) => (
                    <div
                      key={ord.orderId}
                      onClick={() => setSelectedCycleForModal("current")}
                      className="py-2.5 flex items-center justify-between cursor-pointer active:bg-zinc-50"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-black">#{ord.orderCode}</span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{ord.itemsSummary}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-black">
                          ₹{ord.grossValue.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-zinc-500 font-semibold">Order Price</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Mobile Invoices & Taxes Tab */
          <div className="space-y-4 p-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <h2 className="text-sm font-black text-black">Store Order Tax Invoices</h2>
                <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[11px] font-black text-black">
                  {orderInvoices.length} Invoices
                </span>
              </div>
              <div className="mt-3 divide-y divide-zinc-100">
                {filteredOrderInvoices.length === 0 ? (
                  <p className="py-6 text-center text-xs font-bold text-zinc-400">
                    No order tax invoices generated yet.
                  </p>
                ) : (
                  filteredOrderInvoices.map((inv) => (
                    <div key={inv.invoiceNumber} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-black">{inv.invoiceNumber}</p>
                        <p className="text-[11px] text-zinc-500">{inv.type} · {inv.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-black">₹{inv.amount.toFixed(2)}</p>
                        <button
                          type="button"
                          disabled={downloadingId === inv.invoiceNumber}
                          onClick={() => handleDownloadOrderInvoicePdf(inv)}
                          className="mt-1 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-black"
                        >
                          <Download className="size-3" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (>= md) — Comprehensive Banking Settlement Passbook Hub      */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-7xl px-4 py-4 md:block md:px-8 md:py-6">
        {loading ? (
          <PartnerCardsSkeleton />
        ) : (
          <div className="space-y-6 pb-12">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-black">
                  Settlement Passbook & Partner Finance
                </h1>
                <p className="text-xs text-zinc-500">
                  सेटलमेंट पासबुक: Track automatic weekly bank credits, UTR references, commission & TCS deductions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Desktop Subtabs Switcher */}
                <div className="flex items-center rounded-2xl border border-zinc-200 bg-white p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("passbook")}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black transition-all cursor-pointer ${
                      activeSubTab === "passbook"
                        ? "bg-black text-white shadow-xs"
                        : "text-black hover:bg-zinc-100"
                    }`}
                  >
                    <BookOpen className="size-3.5" />
                    <span>Settlement Passbook (पासबुक)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("trends")}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black transition-all cursor-pointer ${
                      activeSubTab === "trends"
                        ? "bg-black text-white shadow-xs"
                        : "text-black hover:bg-zinc-100"
                    }`}
                  >
                    <BarChart2 className="size-3.5" />
                    <span>Weekly Cycles & Trends</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("invoices")}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black transition-all cursor-pointer ${
                      activeSubTab === "invoices"
                        ? "bg-black text-white shadow-xs"
                        : "text-black hover:bg-zinc-100"
                    }`}
                  >
                    <FileText className="size-3.5" />
                    <span>Invoices & Taxes</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCycleForModal("current")}
                  className="flex items-center gap-2 rounded-2xl bg-black px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-zinc-800 active:scale-95 cursor-pointer"
                >
                  <FileText className="size-4" />
                  <span>Current Cycle Statement</span>
                </button>
              </div>
            </div>

            {/* SubTab 1: Settlement Passbook (Main Feature) */}
            {activeSubTab === "passbook" ? (
              <div className="space-y-6">
                {/* 3 Top Banking Summary Cards */}
                <div className="grid grid-cols-3 gap-5">
                  {/* Card 1: Total Bank Settled */}
                  <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <CheckCircle2 className="size-4" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                          All-Time Settled (कुल सेटलमेंट)
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                        Bank Verified ✓
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-black text-emerald-700 tracking-tight">
                      ₹{totalBankSettled.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 font-medium">
                      Direct IMPS / NEFT transfer into verified merchant bank account
                    </p>
                  </div>

                  {/* Card 2: Current Cycle Accruing */}
                  <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-950" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800">
                          <Clock3 className="size-4" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                          Current Cycle Accrual
                        </span>
                      </div>
                      <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[10px] font-black text-zinc-800">
                        {currentCycle?.period || "Ongoing Cycle"}
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-black text-black tracking-tight">
                      ₹{currentAccruingBalance.toFixed(2)}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-zinc-500 font-medium">
                        Disbursal: Every Monday Auto-Credit
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedCycleForModal("current")}
                        className="text-xs font-bold text-black hover:underline cursor-pointer"
                      >
                        Itemized Breakdown →
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Registered Bank Details */}
                  <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800">
                          <Building2 className="size-4" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                          Registered Bank Account
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                        Active Payouts ✓
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-lg font-black text-black">
                        {bankDetails.bankName} • {bankDetails.accountNumberMasked}
                      </p>
                      <p className="text-xs font-medium text-zinc-500 mt-0.5">
                        IFSC: {bankDetails.ifsc} · {bankDetails.transferMode}
                      </p>
                    </div>
                    <p className="mt-2 text-[10px] font-semibold text-zinc-400">
                      Verified Direct IMPS Settlement · Automated Weekly Transfers
                    </p>
                  </div>
                </div>

                {/* Passbook Controls & Ledger Table */}
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
                  {/* Top Bar: View Mode Switcher, Search, Filter & Exports */}
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-zinc-100 pb-4">
                    <div className="flex items-center gap-3">
                      {/* View Mode Switcher */}
                      <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-100 p-1">
                        <button
                          type="button"
                          onClick={() => setPassbookViewMode("cycles")}
                          className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all cursor-pointer ${
                            passbookViewMode === "cycles"
                              ? "bg-white text-black shadow-xs"
                              : "text-zinc-600 hover:text-black"
                          }`}
                        >
                          साप्ताहिक सेटलमेंट चक्र ({filteredCycles.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPassbookViewMode("orders")}
                          className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all cursor-pointer ${
                            passbookViewMode === "orders"
                              ? "bg-white text-black shadow-xs"
                              : "text-zinc-600 hover:text-black"
                          }`}
                        >
                          ऑर्डर अनुसार पासबुक ({filteredPassbookOrders.length})
                        </button>
                      </div>

                      {/* Status Filter */}
                      <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50/70 p-0.5">
                        <button
                          type="button"
                          onClick={() => setStatusFilter("all")}
                          className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                            statusFilter === "all"
                              ? "bg-white text-black shadow-2xs"
                              : "text-zinc-500 hover:text-black"
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter("settled")}
                          className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                            statusFilter === "settled"
                              ? "bg-white text-black shadow-2xs"
                              : "text-zinc-500 hover:text-black"
                          }`}
                        >
                          Settled to Bank ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter("processing")}
                          className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                            statusFilter === "processing"
                              ? "bg-white text-black shadow-2xs"
                              : "text-zinc-500 hover:text-black"
                          }`}
                        >
                          Accruing ⏳
                        </button>
                      </div>
                    </div>

                    {/* Search & Export Buttons */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search UTR, Order #, date..."
                          className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-8.5 pr-3 text-xs font-medium text-black placeholder:text-zinc-400 focus:border-black focus:bg-white focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadStatementPdf()}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                        title="Download Statement PDF"
                      >
                        <FileText className="size-3.5 text-red-600" />
                        <span>PDF Statement</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadStatementExcel()}
                        className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        title="Download Statement Excel"
                      >
                        <FileSpreadsheet className="size-3.5 text-emerald-600" />
                        <span>Excel CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Passbook Table View: By Settlement Cycle */}
                  {passbookViewMode === "cycles" ? (
                    <div>
                      {filteredCycles.length === 0 ? (
                        <div className="py-16 text-center text-xs font-medium text-zinc-400">
                          No settlement cycles found matching your criteria.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-zinc-150 text-zinc-400 uppercase text-[10px] font-black tracking-wider">
                                <th className="py-3 font-black">Settlement Period & Date</th>
                                <th className="py-3 font-black">Reference / Bank UTR</th>
                                <th className="py-3 font-black text-center">Orders</th>
                                <th className="py-3 font-black text-right">Total Order Value (₹)</th>
                                <th className="py-3 font-black text-center">Status</th>
                                <th className="py-3 font-black text-right">Settlement Breakdown</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {filteredCycles.map((entry) => {
                                const isAccruing = entry.status === "ACCRUING";
                                return (
                                  <tr
                                    key={entry.id}
                                    className="hover:bg-zinc-50/80 transition-colors"
                                  >
                                    {/* Period & Date */}
                                    <td className="py-3.5">
                                      <p className="font-black text-black">{entry.period}</p>
                                      <p className="text-[11px] text-zinc-500 font-medium">
                                        Payout: {entry.date}
                                      </p>
                                    </td>

                                    {/* UTR / Reference */}
                                    <td className="py-3.5">
                                      {entry.utr ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono text-xs font-bold text-zinc-800">
                                            {entry.utr}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => copyToClipboard(entry.utr!, "Bank UTR")}
                                            className="p-1 hover:bg-zinc-200 rounded cursor-pointer transition text-zinc-500 hover:text-black"
                                            title="Copy UTR"
                                          >
                                            {copiedUtr === entry.utr ? (
                                              <Check className="size-3 text-emerald-600" />
                                            ) : (
                                              <Copy className="size-3" />
                                            )}
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-zinc-400 italic">
                                          Accruing (Transfer on Monday)
                                        </span>
                                      )}
                                      <p className="text-[10px] text-zinc-400">
                                        {entry.bankName || bankDetails.bankName} •{" "}
                                        {entry.accountNumberMasked || bankDetails.accountNumberMasked}
                                      </p>
                                    </td>

                                    {/* Orders Count */}
                                    <td className="py-3.5 text-center">
                                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-black text-zinc-800">
                                        {entry.orderCount}
                                      </span>
                                    </td>

                                    {/* Total Order Value */}
                                    <td className="py-3.5 text-right font-black text-black">
                                      ₹{entry.grossAmount.toFixed(2)}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="py-3.5 text-center">
                                      <span
                                        className={`rounded-md px-2.5 py-1 text-[10px] font-black ${
                                          isAccruing
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        }`}
                                      >
                                        {isAccruing ? "ACCRUING ⏳" : "SETTLED ✓"}
                                      </span>
                                    </td>

                                    {/* Action Buttons */}
                                    <td className="py-3.5 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedCycleForModal(entry.cycleId)}
                                          className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-black text-black hover:bg-zinc-100 transition shadow-2xs cursor-pointer"
                                        >
                                          सेटलमेंट विवरण (Breakdown) →
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadStatementPdf(entry.cycleId)}
                                          className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-black hover:bg-zinc-100 transition cursor-pointer"
                                          title="Download PDF"
                                        >
                                          <FileText className="size-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Order-by-Order Passbook Table */
                    <div>
                      {filteredPassbookOrders.length === 0 ? (
                        <div className="py-16 text-center text-xs font-medium text-zinc-400">
                          No order transactions found matching your criteria.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-zinc-150 text-zinc-400 uppercase text-[10px] font-black tracking-wider">
                                <th className="py-3 font-black">Order #</th>
                                <th className="py-3 font-black">Delivery Date & Time</th>
                                <th className="py-3 font-black">Customer & Items</th>
                                <th className="py-3 font-black text-right">Order Price (₹)</th>
                                <th className="py-3 font-black">Cycle / UTR</th>
                                <th className="py-3 font-black text-center">Status</th>
                                <th className="py-3 font-black text-right">Settlement Breakdown</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {filteredPassbookOrders.map((ord) => {
                                const isSettled =
                                  ord.isSettled ||
                                  ord.settlementStatus === "PAID" ||
                                  ord.settlementStatus === "SETTLED";
                                return (
                                  <tr
                                    key={ord.orderId}
                                    className="hover:bg-zinc-50/80 transition-colors"
                                  >
                                    <td className="py-3 font-black text-black">#{ord.orderCode}</td>
                                    <td className="py-3 text-zinc-500 font-medium">{ord.date}</td>
                                    <td className="py-3">
                                      <p className="font-semibold text-zinc-900">{ord.customerName}</p>
                                      <p className="text-[11px] text-zinc-500 max-w-44 truncate">
                                        {ord.itemsSummary}
                                      </p>
                                    </td>
                                    <td className="py-3 text-right font-black text-black">
                                      ₹{ord.grossValue.toFixed(2)}
                                    </td>
                                    <td className="py-3">
                                      <p className="text-[11px] font-bold text-black">
                                        {ord.cyclePeriod || "Weekly Cycle"}
                                      </p>
                                      {ord.utr && (
                                        <p className="text-[10px] font-mono text-zinc-500">
                                          UTR: {ord.utr}
                                        </p>
                                      )}
                                    </td>
                                    <td className="py-3 text-center">
                                      <span
                                        className={`rounded-md px-2 py-0.5 text-[9px] font-black ${
                                          isSettled
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                        }`}
                                      >
                                        {isSettled ? "SETTLED ✓" : "ACCRUING ⏳"}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedCycleForModal(ord.cycleId || "current")
                                        }
                                        className="text-xs font-black text-black hover:underline cursor-pointer"
                                      >
                                        सेटलमेंट विवरण (Breakdown) →
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : activeSubTab === "trends" ? (
              /* SubTab 2: Weekly Cycles & Trends */
              <div className="grid grid-cols-3 gap-6">
                {/* Left Column: Ongoing Cycle & KPI Stats */}
                <div className="space-y-5">
                  <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-950" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-4 text-black" />
                        <p className="text-xs font-black uppercase tracking-wider text-black">
                          Current 7-Day Cycle
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        Accruing
                      </span>
                    </div>

                    <p className="mt-3 text-3xl font-black text-black tracking-tight">
                      ₹{(currentCycle?.grossSales ?? currentCycle?.estPayout ?? 0).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 font-semibold">{currentCycle?.period}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                      Disbursal Date:{" "}
                      {currentCycle?.payoutDate !== "-"
                        ? currentCycle?.payoutDate
                        : "Every Monday (Auto Bank Credit)"}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCycleForModal("current")}
                        className="text-xs font-black text-black hover:underline cursor-pointer"
                      >
                        सेटलमेंट विवरण (Breakdown) →
                      </button>

                      <span className="text-[11px] font-bold text-zinc-400">
                        Auto Weekly IMPS ✓
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <TrendingUp className="size-3.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          All-Time Settled
                        </span>
                      </div>
                      <p className="mt-2 text-base font-black text-black">
                        ₹{totalBankSettled.toFixed(2)}
                      </p>
                      <p className="text-[10px] font-semibold text-zinc-400">Bank Reconciled</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                          <Clock className="size-3.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Settlement Cycle
                        </span>
                      </div>
                      <p className="mt-2 text-base font-black text-black">
                        Weekly Disbursal
                      </p>
                      <p className="text-[10px] font-semibold text-zinc-400">Every Monday Direct IMPS</p>
                    </div>
                  </div>
                </div>

                {/* Right Column (Col-span 2): Weekly Bar Chart Graph + Filters + Orders */}
                <div className="col-span-2 space-y-5">
                  <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <BarChart2 className="size-4 text-black" />
                          <h2 className="text-base font-black text-black">
                            Weekly Sales & Orders Trend
                          </h2>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Daily order volume and gross sales for cycle: {currentCycle?.period}
                        </p>
                      </div>
                      <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-bold text-zinc-800">
                        {currentCycle?.orderCount || 0} Orders Accrued
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-end justify-between gap-3 h-36 border-b border-zinc-100 pb-2">
                        {dailyTrend.map((d) => {
                          const displayAmt = d.grossAmount || d.netPayout || 0;
                          const pct = Math.max(
                            Math.min(Math.round((displayAmt / maxDailyAmount) * 100), 100),
                            displayAmt > 0 ? 12 : 4
                          );
                          return (
                            <div
                              key={d.day}
                              className="flex-1 flex flex-col items-center gap-1 h-full justify-end group"
                            >
                              <span className="text-[10px] font-black text-zinc-700">
                                {displayAmt > 0 ? `₹${displayAmt.toFixed(0)}` : "—"}
                              </span>
                              <div className="w-full max-w-12 bg-zinc-100 rounded-t-lg h-24 flex items-end">
                                <div
                                  style={{ height: `${pct}%` }}
                                  className={`w-full rounded-t-lg transition-all duration-300 ${
                                    d.isToday
                                      ? "bg-black"
                                      : displayAmt > 0
                                      ? "bg-zinc-800 hover:bg-black"
                                      : "bg-zinc-200"
                                  }`}
                                />
                              </div>
                              <div className="text-center">
                                <p
                                  className={`text-xs font-black ${
                                    d.isToday ? "text-black underline" : "text-zinc-600"
                                  }`}
                                >
                                  {d.day}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-medium">{d.label}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Current Cycle Delivered Orders Table */}
                  <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <h2 className="text-base font-black text-black">
                        Current Cycle Orders ({filteredTrendOrders.length})
                      </h2>
                      <span className="text-xs text-zinc-500">
                        Completed orders for cycle: {currentCycle?.period}
                      </span>
                    </div>

                    {filteredTrendOrders.length === 0 ? (
                      <div className="py-10 text-center text-xs font-medium text-zinc-400">
                        No orders delivered in this cycle yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-zinc-100 text-zinc-400 uppercase text-[10px] font-black">
                              <th className="py-2.5 font-black">Order #</th>
                              <th className="py-2.5 font-black">Date & Time</th>
                              <th className="py-2.5 font-black">Customer</th>
                              <th className="py-2.5 font-black">Items</th>
                              <th className="py-2.5 font-black text-right">Order Price (₹)</th>
                              <th className="py-2.5 font-black text-right">Settlement Breakdown</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {filteredTrendOrders.map((ord) => (
                              <tr key={ord.orderId} className="hover:bg-zinc-50/70 transition-colors">
                                <td className="py-3 font-black text-black">#{ord.orderCode}</td>
                                <td className="py-3 text-zinc-500 font-medium">{ord.date}</td>
                                <td className="py-3 font-semibold text-zinc-800">{ord.customerName}</td>
                                <td className="py-3 text-zinc-500 max-w-40 truncate">{ord.itemsSummary}</td>
                                <td className="py-3 text-right font-black text-black">
                                  ₹{ord.grossValue.toFixed(2)}
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCycleForModal(ord.cycleId || "current")}
                                    className="text-xs font-black text-black hover:underline cursor-pointer"
                                  >
                                    सेटलमेंट विवरण (Breakdown) →
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* SubTab 3: Invoices & Taxes View */
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                    <div>
                      <h2 className="text-base font-black text-black">Store Order Tax Invoices</h2>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Official 3-page Tax Invoices with GST breakdown & QR code for every customer order.
                      </p>
                    </div>
                    <div className="relative w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search invoice or order #..."
                        className="h-9.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-9 pr-3 text-xs font-medium text-black placeholder:text-zinc-400 focus:border-black focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-zinc-100 max-h-[520px] overflow-y-auto pr-1">
                    {filteredOrderInvoices.length === 0 ? (
                      <div className="py-12 text-center text-xs font-bold text-zinc-400">
                        No order tax invoices generated yet.
                      </div>
                    ) : (
                      filteredOrderInvoices.map((inv) => (
                        <div key={inv.invoiceNumber} className="flex items-center justify-between py-3.5">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <p className="text-xs font-black text-black">{inv.invoiceNumber}</p>
                              {inv.orderNumber && (
                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700">
                                  #{inv.orderNumber}
                                </span>
                              )}
                              <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-black">
                                {inv.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-medium text-zinc-500">{inv.type} · {inv.date}</p>
                          </div>
                          <div className="flex items-center gap-5">
                            <div className="text-right">
                              <p className="text-sm font-black text-black">₹{inv.amount.toFixed(2)}</p>
                              <p className="text-[11px] font-semibold text-zinc-400">
                                GST: ₹{inv.gstAmount.toFixed(2)}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={downloadingId === inv.invoiceNumber}
                              onClick={() => handleDownloadOrderInvoicePdf(inv)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-black text-black hover:bg-zinc-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                            >
                              <Download className="size-3.5 text-black" />
                              <span>Download PDF</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-black">GST Commission (ITC)</h2>
                    <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-black">
                      SAC 998311
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Monthly platform fee invoices for your Input Tax Credit claims.
                  </p>
                  <div className="mt-4 divide-y divide-zinc-100 max-h-[520px] overflow-y-auto">
                    {invoices.length === 0 ? (
                      <p className="py-8 text-center text-xs font-medium text-zinc-400">
                        No monthly commission invoices generated yet.
                      </p>
                    ) : (
                      invoices.map((inv) => (
                        <div key={inv.invoiceNumber} className="py-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-black">{inv.invoiceNumber}</p>
                            <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                              {inv.status}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-500">{inv.period} • {inv.date}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs font-black text-black">Fee: ₹{inv.amount.toFixed(2)}</p>
                            <button
                              type="button"
                              onClick={() => handleDownloadCommissionPdf(inv)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black text-red-700"
                            >
                              <FileText className="size-3 text-red-600" />
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Toaster />
    </PartnerLayout>
  );
}
