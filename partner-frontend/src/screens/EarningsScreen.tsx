import { useNavigate, Link } from "@tanstack/react-router";
import {
  BarChart2,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
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

  const [activeSubTab, setActiveSubTab] = useState<"payouts" | "invoices">("payouts");
  const [selectedPastRange, setSelectedPastRange] = useState<string>(cachedOverview?.filterOptions?.[0] || "");
  const [selectedCycleForModal, setSelectedCycleForModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter state for orders table & graph
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
  const selectedCycleObj = pastCycles.find((c) => c.period === selectedPastRange) || pastCycles[0];

  // All-time settled sum calculation
  const allTimeSettled =
    pastCycles.reduce((sum, c) => sum + (c.netPayout || 0), 0) + (currentCycle?.estPayout || 0);

  // Daily trend calculations for graph
  const dailyTrend = financeData?.dailyTrend || [];
  const maxDailyAmount = Math.max(...dailyTrend.map((d) => Math.max(d.grossAmount, d.netPayout, 1)), 100);

  // Filtered orders for table
  const currentOrders: SettlementOrder[] = financeData?.currentOrders || [];
  const filteredOrders = currentOrders.filter((ord) => {
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

  const adminCommRate = financeData?.commissionRatePct ?? 15;

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
      title="Payouts & Finance"
      subtitle="Track 7-day automatic weekly settlements and GST tax breakdown"
    >
      {/* ========================================================================= */}
      {/* MOBILE VIEW (< md) — Pure White & High Contrast Black Layout              */}
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

          {/* Subtabs: Payouts vs Invoices & Taxes */}
          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab("payouts")}
              className={`rounded-full px-5 py-2 text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeSubTab === "payouts"
                  ? "bg-black text-white shadow-xs"
                  : "border border-zinc-200 bg-white text-black hover:bg-zinc-100 shadow-2xs"
              }`}
            >
              Payouts & Weekly Cycle
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("invoices")}
              className={`rounded-full px-5 py-2 text-xs font-black transition-all cursor-pointer active:scale-95 ${
                activeSubTab === "invoices"
                  ? "bg-black text-white shadow-xs"
                  : "border border-zinc-200 bg-white text-black hover:bg-zinc-100 shadow-2xs"
              }`}
            >
              Invoices & Taxes
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
            <p className="text-xs font-bold text-zinc-500">Loading weekly settlement data...</p>
          </div>
        ) : activeSubTab === "invoices" ? (
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
        ) : (
          /* Mobile Payouts Tab */
          <div className="space-y-4 p-4">
            {/* Hero Card: 7-Day Automatic Weekly Cycle */}
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

              {/* Accrued Amount */}
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Accrued Net Payout
                </p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-black tracking-tight">
                    ₹{currentCycle?.estPayout ? currentCycle.estPayout.toFixed(2) : "0.00"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-zinc-500">
                  {currentCycle?.orderCount || 0} delivered orders · Platform Commission: {adminCommRate}%
                </p>
              </div>

              {/* Action Strip: Itemized breakdown link */}
              <div className="mt-4 border-t border-zinc-100 pt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCycleForModal("current")}
                  className="text-xs font-black text-black hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View itemized breakdown</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* 2 Clean KPI Chips */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Cycle</span>
                <p className="mt-1 text-xs font-black text-black">Weekly Cycle</p>
                <p className="text-[9px] font-bold text-emerald-600">Every Monday</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Settled</span>
                <p className="mt-1 text-xs font-black text-black">₹{allTimeSettled.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-zinc-500">Bank Verified</p>
              </div>
            </div>

            {/* Mobile Weekly Revenue & Payout Bar Chart */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    Weekly Payout Trend
                  </h3>
                  <p className="text-[10px] text-zinc-500">7-Day Cycle Revenue Distribution</p>
                </div>
                <span className="rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-800">
                  {currentCycle?.period}
                </span>
              </div>

              {/* Visual Bars (Mon to Sun) */}
              <div className="pt-2 pb-1">
                <div className="flex items-end justify-between gap-1.5 h-28">
                  {dailyTrend.map((d) => {
                    const pct = Math.max(Math.min(Math.round((d.netPayout / maxDailyAmount) * 100), 100), d.netPayout > 0 ? 12 : 4);
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[9px] font-black text-zinc-600">
                          {d.netPayout > 0 ? `₹${Math.round(d.netPayout)}` : "—"}
                        </span>
                        <div className="w-full bg-zinc-100 rounded-t-md h-20 flex items-end">
                          <div
                            style={{ height: `${pct}%` }}
                            className={`w-full rounded-t-md transition-all duration-300 ${
                              d.isToday
                                ? "bg-black"
                                : d.netPayout > 0
                                ? "bg-zinc-800"
                                : "bg-zinc-200"
                            }`}
                          />
                        </div>
                        <span className={`text-[10px] font-bold ${d.isToday ? "text-black underline" : "text-zinc-500"}`}>
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Delivered Orders in Current Cycle */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    Current Cycle Orders ({filteredOrders.length})
                  </h3>
                  <p className="text-[10px] text-zinc-500">Delivered bookings for this 7-day period</p>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="py-6 text-center text-xs font-medium text-zinc-400">
                  No orders delivered in this cycle yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {filteredOrders.map((ord) => (
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
                        <span className="text-xs font-black text-emerald-700">+₹{ord.netEarning.toFixed(2)}</span>
                        <p className="text-[10px] text-zinc-400">Fee: -₹{ord.commission.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (>= md) — Clean Pure White & Comprehensive Financial Hub     */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-7xl px-4 py-4 md:block md:px-8 md:py-6">
        {loading ? (
          <PartnerCardsSkeleton />
        ) : (
          <div className="space-y-6 pb-12">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-black">Partner Finance & Settlements</h1>
                <p className="text-xs text-zinc-500">
                  7-Day automated settlement cycles, GST tax breakdown, and statutory double-entry reconciliation.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-2xl border border-zinc-200 bg-white p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("payouts")}
                    className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all cursor-pointer ${
                      activeSubTab === "payouts"
                        ? "bg-black text-white shadow-xs"
                        : "text-black hover:bg-zinc-100"
                    }`}
                  >
                    Payouts & Cycles
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("invoices")}
                    className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all cursor-pointer ${
                      activeSubTab === "invoices"
                        ? "bg-black text-white shadow-xs"
                        : "text-black hover:bg-zinc-100"
                    }`}
                  >
                    Invoices & Taxes
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

            {activeSubTab === "invoices" ? (
              /* Desktop Invoices & Taxes View */
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
                              <p className="text-[11px] font-semibold text-zinc-400">GST: ₹{inv.gstAmount.toFixed(2)}</p>
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
            ) : (
              /* Desktop Payouts Tab */
              <div className="grid grid-cols-3 gap-6">
                {/* Left Column: Ongoing Cycle & KPI Stats */}
                <div className="space-y-5">
                  {/* Hero Card */}
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
                      ₹{currentCycle?.estPayout ? currentCycle.estPayout.toFixed(2) : "0.00"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600 font-semibold">{currentCycle?.period}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                      Disbursal Date: {currentCycle?.payoutDate !== "-" ? currentCycle?.payoutDate : "Every Monday (Auto Bank Credit)"}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCycleForModal("current")}
                        className="text-xs font-black text-black hover:underline cursor-pointer"
                      >
                        View itemized breakdown →
                      </button>

                      <span className="text-[11px] font-bold text-zinc-400">
                        Auto Weekly IMPS ✓
                      </span>
                    </div>
                  </div>

                  {/* Clean 2-Chip Metric Grid (No Bank Card) */}
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
                      <p className="mt-2 text-base font-black text-black">₹{allTimeSettled.toFixed(2)}</p>
                      <p className="text-[10px] font-semibold text-zinc-400">Bank Reconciled</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                          <Percent className="size-3.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Platform Tier
                        </span>
                      </div>
                      <p className="mt-2 text-base font-black text-black">{adminCommRate}% Commission</p>
                      <p className="text-[10px] font-semibold text-zinc-400">Admin Configured</p>
                    </div>
                  </div>

                  {/* Quick Statement Download Strip */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-black">Official Statements</span>
                      <span className="text-[10px] text-zinc-400">Double-Entry</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadStatementPdf("current")}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                      >
                        <FileText className="size-3.5 text-red-600" />
                        <span>PDF Statement</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadStatementExcel("current")}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        <FileSpreadsheet className="size-3.5 text-emerald-600" />
                        <span>Excel CSV</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column (Col-span 2): Weekly Bar Chart Graph + Filters + Orders */}
                <div className="col-span-2 space-y-5">
                  {/* 1. Interactive 7-Day Revenue & Payout Bar Chart */}
                  <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <BarChart2 className="size-4 text-black" />
                          <h2 className="text-base font-black text-black">Weekly Revenue & Payout Trend</h2>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Daily revenue accrual and net store earnings for cycle: {currentCycle?.period}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-bold text-zinc-800">
                          {currentCycle?.orderCount || 0} Orders Accrued
                        </span>
                      </div>
                    </div>

                    {/* Bar Chart Container */}
                    <div className="pt-2">
                      <div className="flex items-end justify-between gap-3 h-36 border-b border-zinc-100 pb-2">
                        {dailyTrend.map((d) => {
                          const pct = Math.max(Math.min(Math.round((d.netPayout / maxDailyAmount) * 100), 100), d.netPayout > 0 ? 12 : 4);
                          return (
                            <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                              <span className="text-[10px] font-black text-zinc-700">
                                {d.netPayout > 0 ? `₹${d.netPayout.toFixed(0)}` : "—"}
                              </span>
                              <div className="w-full max-w-12 bg-zinc-100 rounded-t-lg h-24 flex items-end">
                                <div
                                  style={{ height: `${pct}%` }}
                                  className={`w-full rounded-t-lg transition-all duration-300 ${
                                    d.isToday
                                      ? "bg-black"
                                      : d.netPayout > 0
                                      ? "bg-zinc-800 hover:bg-black"
                                      : "bg-zinc-200"
                                  }`}
                                />
                              </div>
                              <div className="text-center">
                                <p className={`text-xs font-black ${d.isToday ? "text-black underline" : "text-zinc-600"}`}>
                                  {d.day}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-medium">{d.label}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Chart Legend & Summary */}
                    <div className="grid grid-cols-4 gap-3 pt-1 text-center">
                      <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Gross Subtotal</p>
                        <p className="text-xs font-black text-black">
                          ₹{dailyTrend.reduce((sum, d) => sum + d.grossAmount, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Commission ({adminCommRate}%)</p>
                        <p className="text-xs font-black text-rose-600">
                          -₹{(dailyTrend.reduce((sum, d) => sum + d.grossAmount, 0) * (adminCommRate / 100)).toFixed(2)}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Est. Net Disbursal</p>
                        <p className="text-xs font-black text-emerald-700">
                          ₹{currentCycle?.estPayout ? currentCycle.estPayout.toFixed(2) : "0.00"}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Disbursal Frequency</p>
                        <p className="text-xs font-black text-black">Weekly (7 Days)</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Delivered Orders & Date Filter Table */}
                  <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black text-black">Cycle Settlement Ledger</h2>
                          <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-xs font-bold text-zinc-800">
                            {filteredOrders.length} Orders
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Real completed orders with double-entry commission & tax calculations
                        </p>
                      </div>

                      {/* Filter Controls */}
                      <div className="flex items-center gap-2">
                        {/* Status Filter */}
                        <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50/70 p-0.5">
                          <button
                            type="button"
                            onClick={() => setStatusFilter("all")}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              statusFilter === "all" ? "bg-white text-black shadow-2xs" : "text-zinc-500 hover:text-black"
                            }`}
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter("settled")}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              statusFilter === "settled" ? "bg-white text-black shadow-2xs" : "text-zinc-500 hover:text-black"
                            }`}
                          >
                            Settled
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatusFilter("processing")}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              statusFilter === "processing" ? "bg-white text-black shadow-2xs" : "text-zinc-500 hover:text-black"
                            }`}
                          >
                            Accruing
                          </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-48">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter order #..."
                            className="h-8.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-8 pr-2.5 text-xs font-medium text-black placeholder:text-zinc-400 focus:border-black focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Orders Table */}
                    {filteredOrders.length === 0 ? (
                      <div className="py-12 text-center text-xs font-medium text-zinc-400">
                        {searchQuery ? "No matching orders found for this query." : "No orders delivered in this cycle yet. Real customer bookings appear here automatically."}
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
                              <th className="py-2.5 font-black text-right">Gross</th>
                              <th className="py-2.5 font-black text-right">Fee ({adminCommRate}%)</th>
                              <th className="py-2.5 font-black text-right">Net Payout</th>
                              <th className="py-2.5 font-black text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {filteredOrders.map((ord) => (
                              <tr key={ord.orderId} className="hover:bg-zinc-50/70 transition-colors">
                                <td className="py-3 font-black text-black">#{ord.orderCode}</td>
                                <td className="py-3 text-zinc-500 font-medium">{ord.date}</td>
                                <td className="py-3 font-semibold text-zinc-800">{ord.customerName}</td>
                                <td className="py-3 text-zinc-500 max-w-40 truncate">{ord.itemsSummary}</td>
                                <td className="py-3 text-right font-semibold text-black">₹{ord.grossValue.toFixed(2)}</td>
                                <td className="py-3 text-right font-bold text-rose-600">-₹{ord.commission.toFixed(2)}</td>
                                <td className="py-3 text-right font-black text-emerald-700">₹{ord.netEarning.toFixed(2)}</td>
                                <td className="py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCycleForModal("current")}
                                    className="text-xs font-bold text-black hover:underline cursor-pointer"
                                  >
                                    Breakdown →
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 3. Past Settlement Cycles Section (If any) */}
                  {pastCycles.length > 0 && (
                    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                        <h3 className="text-sm font-black text-black">Past Settlement History</h3>
                        <p className="text-xs text-zinc-500">Completed weekly bank settlements</p>
                      </div>

                      <div className="divide-y divide-zinc-100">
                        {pastCycles.map((cycle) => (
                          <div key={cycle.cycleId} className="flex items-center justify-between py-3">
                            <div>
                              <p className="text-xs font-black text-black">{cycle.period}</p>
                              <p className="text-[11px] text-zinc-500">
                                {cycle.orderCount} orders settled on {cycle.payoutDate}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-black">₹{cycle.netPayout.toFixed(2)}</span>
                              <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-black">
                                {cycle.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedCycleForModal(cycle.cycleId)}
                                className="text-xs font-black text-black hover:underline cursor-pointer"
                              >
                                View Statement →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
