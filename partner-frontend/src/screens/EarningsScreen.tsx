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
  IndianRupee,
  Layers,
  Loader2,
  Menu,
  Percent,
  RotateCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
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

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export function EarningsScreen() {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { data: profile } = usePartnerResource(fetchPartnerProfile);

  const cachedOverview = getCachedFinanceOverview();
  const cachedInvoices = getCachedFinanceInvoices();

  const [financeData, setFinanceData] = useState<FinanceOverviewResponse | null>(cachedOverview);
  const [invoices, setInvoices] = useState<TaxInvoice[]>(cachedInvoices?.invoices || []);
  const [orderInvoices, setOrderInvoices] = useState<TaxInvoice[]>(cachedInvoices?.orderInvoices || []);
  const [loading, setLoading] = useState(!cachedOverview);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    setMounted(true);
  }, []);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [overview, invRes] = await Promise.all([
        fetchFinanceOverview().catch(() => null),
        fetchFinanceTaxInvoices().catch(() => ({ invoices: [], orderInvoices: [] })),
      ]);
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
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
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

  const handleDownloadOrderInvoicePdf = async (inv: TaxInvoice) => {
    const targetId = inv.orderNumber || inv.invoiceNumber;
    setDownloadingId(inv.invoiceNumber);
    toast.info(`Preparing official Tax Invoice ${inv.invoiceNumber}...`);
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

  const currentCycle = financeData?.currentCycle;
  const pastCycles = financeData?.pastCycles || [];

  const bankDetails = financeData?.bankDetails || {
    accountHolder: profile?.businessName || profile?.ownerName || "Merchant Partner",
    bankName: "HDFC Bank",
    accountNumberMasked: "•••• •••• 4545",
    ifsc: "HDFC0000240",
    utr: null,
    transferMode: "NPCI IMPS / NEFT Auto-Credit",
  };

  // Passbook Cycle Entries
  const passbookCycles: PassbookEntry[] = useMemo(() => {
    return financeData?.passbook || [
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
  }, [financeData?.passbook, pastCycles, currentCycle, bankDetails]);

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

  const filteredOrderInvoices = orderInvoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.orderNumber && inv.orderNumber.toLowerCase().includes(q)) ||
      inv.type.toLowerCase().includes(q)
    );
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
      title="Wallet & Payouts"
      subtitle="Complete bank settlement passbook, double-entry ledger, and GST reconciliation"
    >
      <div className="mx-auto w-full max-w-7xl px-3.5 sm:px-6 py-4 sm:py-6 space-y-4">

        {/* ========================================================================= */}
        {/* HEADER BAR: STORE TITLE, LIVE IMPS DISBURSAL BADGE & ACTION TOOLS         */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pb-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
                Partner Wallet &amp; Payouts
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-black text-emerald-800 shadow-2xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>NPCI IMPS Auto-Credit</span>
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-zinc-500">
              Double-entry settlement ledger, verified bank transfers, and platform fee breakdown
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleDownloadStatementPdf()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-black text-zinc-800 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="size-3.5 text-zinc-700" />
              <span>Statement PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void loadData();
                toast.success("Wallet & Payouts refreshed with live database");
              }}
              disabled={isRefreshing}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
              title="Refresh Wallet"
            >
              <RotateCw className={`size-3.5 text-zinc-700 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* HERO PAYOUT & BANK ACCOUNT RECONCILIATION CARD                            */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            {/* Left: Total Lifetime Settled to Bank */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-black">
                  ₹
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
                  Total Bank Settled · Lifetime
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                  <CheckCircle2 className="size-3" /> 100% Reconciled
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
                  {inr(totalBankSettled)}
                </p>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Directly credited to verified partner bank account with zero loss
              </p>
            </div>

            {/* Right: Accruing Balance & Verified Bank Account */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-zinc-100 lg:pl-6">
              {/* Accruing Cycle Box */}
              <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5 min-w-[200px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                    Current Cycle Payout
                  </span>
                  <span className="rounded-full bg-amber-200/60 px-2 py-0.5 text-[10px] font-black text-amber-900">
                    Accruing ⏳
                  </span>
                </div>
                <p className="text-2xl font-black text-amber-950 mt-1">
                  {inr(currentAccruingBalance)}
                </p>
                <div className="flex items-center justify-between text-[10.5px] font-bold text-amber-800 mt-1">
                  <span>{currentCycle?.period || "Current Cycle"}</span>
                  <span>Credit: Mon 10:00 AM</span>
                </div>
              </div>

              {/* Verified Bank Account Box */}
              <div className="rounded-xl bg-zinc-50 border border-zinc-200/80 p-3.5 min-w-[220px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-4 text-zinc-700" />
                    <span className="text-xs font-black text-zinc-900">
                      {bankDetails.bankName}
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                    Verified ✓
                  </span>
                </div>
                <p className="text-sm font-black text-zinc-950 mt-1.5 font-mono">
                  {bankDetails.accountNumberMasked}
                </p>
                <div className="flex items-center justify-between text-[10.5px] font-semibold text-zinc-500 mt-1">
                  <span>IFSC: {bankDetails.ifsc}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bankDetails.ifsc, "IFSC Code")}
                    className="text-[10px] font-black text-[#5B63D3] hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUBTABS BAR: CYCLES (PASSBOOK), ORDERS, TRENDS, INVOICES                  */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Subtabs Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-zinc-100 border border-zinc-200/70">
              <button
                type="button"
                onClick={() => setActiveSubTab("passbook")}
                className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  activeSubTab === "passbook"
                    ? "bg-zinc-950 text-white shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60"
                }`}
              >
                <Wallet className="size-3.5" />
                <span>Settlement Passbook</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("trends")}
                className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  activeSubTab === "trends"
                    ? "bg-zinc-950 text-white shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60"
                }`}
              >
                <BarChart2 className="size-3.5" />
                <span>Weekly Trends</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("invoices")}
                className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  activeSubTab === "invoices"
                    ? "bg-zinc-950 text-white shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60"
                }`}
              >
                <FileText className="size-3.5" />
                <span>GST Tax Invoices</span>
              </button>
            </div>

            {/* In Passbook tab: Cycles vs Individual Orders toggle */}
            {activeSubTab === "passbook" && (
              <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 border border-zinc-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPassbookViewMode("cycles")}
                  className={`rounded-lg px-3 py-1 font-black transition-all cursor-pointer ${
                    passbookViewMode === "cycles"
                      ? "bg-white text-zinc-950 shadow-2xs font-black"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  Weekly Cycles ({filteredCycles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPassbookViewMode("orders")}
                  className={`rounded-lg px-3 py-1 font-black transition-all cursor-pointer ${
                    passbookViewMode === "orders"
                      ? "bg-white text-zinc-950 shadow-2xs font-black"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  Itemized Orders ({filteredPassbookOrders.length})
                </button>
              </div>
            )}
          </div>

          {/* Search Bar & Status Filter Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-zinc-100">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by UTR reference, Order ID, or period..."
                className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-8.5 pr-3 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-zinc-950 text-white font-black shadow-2xs"
                    : "bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-950"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("settled")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "settled"
                    ? "bg-zinc-950 text-white font-black shadow-2xs"
                    : "bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Settled ✓
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("processing")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "processing"
                    ? "bg-zinc-950 text-white font-black shadow-2xs"
                    : "bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Accruing ⏳
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUBTAB 1: SETTLEMENT CYCLES & PASSBOOK LIST                               */}
        {/* ========================================================================= */}
        {activeSubTab === "passbook" && (
          <div>
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
                        className="rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3 transition-transform hover:-translate-y-0.5"
                      >
                        {/* Top Row: Period, Status, Gross Sales */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-zinc-950">{entry.period}</span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                                isAccruing
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {isAccruing ? "ACCRUING ⏳" : "SETTLED TO BANK ✓"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-black text-zinc-500">Gross Billed: </span>
                              <span className="text-sm font-black text-zinc-950">{inr(entry.grossAmount)}</span>
                            </div>
                            <span className="text-zinc-300">|</span>
                            <div className="text-right">
                              <span className="text-xs font-black text-emerald-700">Net Credit: </span>
                              <span className="text-base font-black text-emerald-700 font-mono">{inr(entry.netCredit)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Financial Double-Entry Summary Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="rounded-xl bg-zinc-50 p-2.5 border border-zinc-200/60">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Gross Sales</span>
                            <p className="text-sm font-black text-zinc-900 mt-0.5">{inr(entry.grossAmount)}</p>
                            <span className="text-[10px] text-zinc-500">{entry.orderCount} bookings</span>
                          </div>
                          <div className="rounded-xl bg-rose-50/50 p-2.5 border border-rose-100">
                            <span className="text-[10px] font-bold text-rose-800 uppercase">Platform Fee (15%)</span>
                            <p className="text-sm font-black text-rose-900 mt-0.5">-{inr(entry.commissionAmount)}</p>
                            <span className="text-[10px] text-rose-600">QuickPress Fee</span>
                          </div>
                          <div className="rounded-xl bg-zinc-50 p-2.5 border border-zinc-200/60">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Taxes (GST &amp; TCS)</span>
                            <p className="text-sm font-black text-zinc-900 mt-0.5">-{inr(entry.taxTotal)}</p>
                            <span className="text-[10px] text-zinc-500">18% GST + 1% TCS</span>
                          </div>
                          <div className="rounded-xl bg-emerald-50/70 p-2.5 border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase">Net Disbursed</span>
                            <p className="text-sm font-black text-emerald-900 mt-0.5">{inr(entry.netCredit)}</p>
                            <span className="text-[10px] text-emerald-700 font-bold">100% In Account</span>
                          </div>
                        </div>

                        {/* UTR Chip with 1-click copy */}
                        {entry.utr && (
                          <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <CreditCard className="size-3.5 text-zinc-500" />
                              <span className="text-xs font-mono font-bold text-zinc-800">
                                Bank UTR: {entry.utr}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(entry.utr!, "Bank UTR")}
                              className="text-xs font-black text-[#5B63D3] flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              {copiedUtr === entry.utr ? (
                                <Check className="size-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                              <span>{copiedUtr === entry.utr ? "Copied" : "Copy"}</span>
                            </button>
                          </div>
                        )}

                        {/* Bottom Actions: View Breakdown & Statement Downloads */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                          <button
                            type="button"
                            onClick={() => setSelectedCycleForModal(entry.cycleId)}
                            className="text-xs font-black text-[#5B63D3] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>सेटलमेंट विवरण (Full Double-Entry Breakdown)</span>
                            <span>→</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadStatementPdf(entry.cycleId)}
                              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 hover:bg-zinc-100 cursor-pointer shadow-2xs"
                            >
                              PDF Statement
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadStatementExcel(entry.cycleId)}
                              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-800 hover:bg-zinc-100 cursor-pointer shadow-2xs"
                            >
                              CSV / Excel
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Itemized Individual Orders Double-Entry List */
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-950">
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
                        className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 cursor-pointer hover:bg-zinc-50/60 rounded-xl px-2 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-zinc-950 font-mono">#{ord.orderCode}</span>
                            <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.2 text-[9px] font-bold">
                              {ord.settlementStatus || (ord.isSettled ? "SETTLED" : "ACCRUING")}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 mt-0.5">{ord.itemsSummary}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            Customer: {ord.customerName} · {ord.date} {ord.cyclePeriod ? `· ${ord.cyclePeriod}` : ""}
                          </p>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-xs font-black text-zinc-950">
                            {inr(ord.grossValue)}
                          </span>
                          <p className="text-[10px] text-emerald-700 font-bold">
                            Net: {inr(ord.netPayout || ord.grossValue * 0.84)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 2: WEEKLY TRENDS & DAILY BAR CHART                                 */}
        {/* ========================================================================= */}
        {activeSubTab === "trends" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-3 gap-2">
                <div>
                  <h3 className="text-base font-black tracking-tight text-zinc-950">
                    Weekly Settlement &amp; Orders Trend
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Daily order value distribution for current cycle ({currentCycle?.period || "Weekly"})
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-black text-zinc-800 self-start sm:self-auto">
                  Scheduled Credit: Every Monday 10:00 AM
                </span>
              </div>

              {/* 7-Day Bar Chart */}
              <div className="pt-2 pb-2">
                <div className="flex items-end justify-between gap-2 h-40">
                  {dailyTrend.map((d) => {
                    const displayAmt = d.grossAmount || d.netPayout || 0;
                    const pct = Math.max(
                      Math.min(Math.round((displayAmt / maxDailyAmount) * 100), 100),
                      displayAmt > 0 ? 14 : 4
                    );
                    return (
                      <div
                        key={d.day}
                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group select-none cursor-pointer"
                      >
                        <span className="text-[10px] font-black text-zinc-500 group-hover:text-zinc-950">
                          {displayAmt > 0 ? inr(displayAmt) : "—"}
                        </span>
                        <div className="w-full max-w-[42px] bg-zinc-100 rounded-t-xl h-28 flex items-end">
                          <div
                            style={{ height: `${pct}%` }}
                            className={`w-full rounded-t-xl transition-all duration-300 ${
                              d.isToday
                                ? "bg-[#5B63D3] shadow-md shadow-indigo-500/30"
                                : displayAmt > 0
                                ? "bg-zinc-800 hover:bg-[#5B63D3]"
                                : "bg-zinc-200"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            d.isToday ? "text-[#5B63D3] font-black" : "text-zinc-700"
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 3: GST TAX INVOICES & COMMISSION STATEMENTS                        */}
        {/* ========================================================================= */}
        {activeSubTab === "invoices" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div>
                  <h3 className="text-base font-black text-zinc-950">Store Order Tax Invoices</h3>
                  <p className="text-xs text-zinc-500">Official 3-page Tax Invoices with B2C GST compliance</p>
                </div>
                <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-black text-zinc-800">
                  {orderInvoices.length} Invoices
                </span>
              </div>

              <div className="divide-y divide-zinc-100">
                {filteredOrderInvoices.length === 0 ? (
                  <p className="py-8 text-center text-xs font-bold text-zinc-400">
                    No order tax invoices generated yet.
                  </p>
                ) : (
                  filteredOrderInvoices.map((inv) => (
                    <div key={inv.invoiceNumber} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-zinc-950 font-mono">{inv.invoiceNumber}</p>
                        <p className="text-[11px] text-zinc-500">{inv.type} · {inv.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-zinc-950">{inr(inv.amount)}</p>
                        <button
                          type="button"
                          disabled={downloadingId === inv.invoiceNumber}
                          onClick={() => handleDownloadOrderInvoicePdf(inv)}
                          className="mt-1 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-800 hover:bg-zinc-100 cursor-pointer shadow-2xs"
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
      <Toaster />
    </PartnerLayout>
  );
}
