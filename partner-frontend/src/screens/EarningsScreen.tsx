import { useNavigate, Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Loader2,
  Menu,
  Percent,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Zap,
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
  fetchFinanceOverview,
  fetchFinanceTaxInvoices,
  getCachedFinanceOverview,
  getCachedFinanceInvoices,
  downloadSettlementReport,
  downloadSettlementPdfBlob,
  downloadSettlementExcelBlob,
  downloadPartnerInvoicePdfBlob,
  downloadCommissionInvoicePdfBlob,
  downloadCommissionInvoiceExcelBlob,
  requestPartnerInstantPayout,
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
  const [isProcessingInstantPayout, setIsProcessingInstantPayout] = useState(false);

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

  const handleInstantPayoutClick = async () => {
    if (!currentCycle?.estPayout || currentCycle.estPayout <= 0) {
      toast.info("No unsettled earnings available for instant disbursal in current cycle.");
      return;
    }
    const confirmed = window.confirm(
      `Initiate instant IMPS settlement of ₹${currentCycle.estPayout.toFixed(2)} to your verified store bank account?`
    );
    if (!confirmed) return;
    setIsProcessingInstantPayout(true);
    toast.info("Processing instant bank payout via Settlement Engine...");
    try {
      const res = await requestPartnerInstantPayout(currentCycle.estPayout);
      toast.success(res.message || "Instant payout transferred successfully via IMPS!");
      const ov = await fetchFinanceOverview();
      if (ov) setFinanceData(ov);
    } catch (err: any) {
      toast.error(err?.message || "Failed to process instant payout");
    } finally {
      setIsProcessingInstantPayout(false);
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

  const bankNameDisplay = profile?.bankName || "HDFC Bank";
  const bankAccDisplay = profile?.accountNumber
    ? `••••${profile.accountNumber.slice(-4)}`
    : "••••8842";

  return (
    <PartnerLayout
      activeTab="earnings"
      title="Payouts & Finance"
      subtitle="Track 7-day automatic settlements and download GST invoices"
    >
      {/* ========================================================================= */}
      {/* MOBILE VIEW (< md) — Royal Blue Fintech Design Standard                   */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-[#F8FAFC] pb-28 text-black md:hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white px-4 pt-3.5 pb-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-b border-zinc-100">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base font-black tracking-tight text-black">
                  {profile?.businessName || profile?.ownerName || "Merchant Store"}
                </h1>
                <ChevronDown className="size-4 text-zinc-500 shrink-0" />
              </div>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-500">
                ID: {formatPartnerId(profile?.partnerId)} •{" "}
                {profile?.city ? `${profile.city} Operations Hub` : "Local Service Hub"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={partnerRoutes.notifications}
                className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-black hover:bg-zinc-200 transition-transform active:scale-95"
                title="Notifications"
              >
                <Bell className="size-4" />
              </Link>
              <Link
                to={partnerRoutes.profile}
                className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-black hover:bg-zinc-200 transition-transform active:scale-95"
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
              Payouts
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
            <p className="text-xs font-bold text-zinc-500">Loading settlement cycles...</p>
          </div>
        ) : activeSubTab === "invoices" ? (
          /* ========================================================================= */
          /* INVOICES & TAXES TAB VIEW                                                 */
          /* ========================================================================= */
          <div className="space-y-4 p-4">
            {/* Store Order Tax Invoices */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-black">Store Order Tax Invoices</h2>
                    <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[11px] font-black text-black">
                      {orderInvoices.length} Invoices
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Official 3-page Tax Invoices with GST breakdown & QR code for every store order.
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search invoice or order #..."
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-9 pr-3 text-xs font-medium text-black placeholder:text-zinc-400 focus:border-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 divide-y divide-zinc-100">
                {filteredOrderInvoices.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs font-bold text-zinc-400">
                      {searchQuery ? "No matching order invoices found." : "No order tax invoices generated yet."}
                    </p>
                  </div>
                ) : (
                  filteredOrderInvoices.map((inv) => (
                    <div
                      key={inv.invoiceNumber}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-black text-black">{inv.invoiceNumber}</p>
                          {inv.orderNumber && (
                            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700">
                              #{inv.orderNumber}
                            </span>
                          )}
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                              inv.status.toLowerCase() === "paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : inv.status.toLowerCase() === "cancelled"
                                ? "bg-zinc-100 text-zinc-500"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-500">
                          {inv.type} · {inv.date}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right">
                          <p className="text-xs font-black text-black">₹{inv.amount.toFixed(2)}</p>
                          <p className="text-[10px] font-semibold text-zinc-400">
                            GST: ₹{inv.gstAmount.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={downloadingId === inv.invoiceNumber}
                          onClick={() => handleDownloadOrderInvoicePdf(inv)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-black text-black hover:bg-zinc-100 active:scale-95 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                        >
                          {downloadingId === inv.invoiceNumber ? (
                            <Loader2 className="size-3 animate-spin text-zinc-600" />
                          ) : (
                            <Download className="size-3 text-black" />
                          )}
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* GST Commission Invoices (ITC Claimable) */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-black">GST Commission Invoices (ITC)</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Monthly platform fee tax invoices issued by QuickPress for your Input Tax Credit (ITC) claims.
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[10px] font-black text-black">
                  SAC 998311
                </span>
              </div>

              <div className="mt-4 divide-y divide-zinc-100">
                {invoices.length === 0 ? (
                  <p className="py-3 text-xs font-medium text-zinc-400">
                    No monthly commission invoices generated yet.
                  </p>
                ) : (
                  invoices.map((inv) => (
                    <div
                      key={inv.invoiceNumber}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-black">{inv.invoiceNumber}</p>
                          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                            {inv.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                          {inv.period} • Generated on {inv.date} • SAC 998311
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right">
                          <p className="text-xs font-black text-black">Fee: ₹{inv.amount.toFixed(2)}</p>
                          <p className="text-[10px] font-bold text-zinc-900">
                            ITC GST: ₹{inv.gstAmount.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={downloadingId === inv.invoiceNumber}
                            onClick={() => handleDownloadCommissionPdf(inv)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-700 hover:bg-red-100 active:scale-95 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                            title="Download GST Commission Invoice PDF"
                          >
                            {downloadingId === inv.invoiceNumber ? (
                              <Loader2 className="size-3 animate-spin text-red-600" />
                            ) : (
                              <FileText className="size-3 text-red-600" />
                            )}
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            disabled={downloadingId === `${inv.invoiceNumber}-excel`}
                            onClick={() => handleDownloadCommissionExcel(inv)}
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                            title="Download GST Commission Invoice Excel"
                          >
                            {downloadingId === `${inv.invoiceNumber}-excel` ? (
                              <Loader2 className="size-3 animate-spin text-emerald-600" />
                            ) : (
                              <FileSpreadsheet className="size-3 text-emerald-600" />
                            )}
                            <span>Excel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* PAYOUTS TAB VIEW                                                          */
          /* ========================================================================= */
          <div className="space-y-4 p-4">
            {/* HERO CARD: Scheduled 7-Day Cycle Bank Disbursal Card */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-950" />

              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-black" />
                    <p className="text-[11px] font-black uppercase tracking-wider text-black">
                      Ongoing Payout Cycle
                    </p>
                  </div>
                  <p className="mt-0.5 text-sm font-black text-black">
                    {currentCycle?.period || "05 Oct - 11 Oct'26"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-bold text-zinc-500">Scheduled Payout</p>
                  <p className="mt-0.5 text-xs font-black text-black">
                    {currentCycle?.payoutDate || "Monday, 10:00 AM"}
                  </p>
                </div>
              </div>

              {/* Big Earnings Amount */}
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
                  {currentCycle?.orderCount || 0} delivered orders · 85% net partner share (15% platform commission)
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-4 border-t border-zinc-100 pt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCycleForModal("current")}
                  className="text-xs font-black text-black hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View itemized breakdown</span>
                  <span>→</span>
                </button>

                {(currentCycle?.estPayout || 0) > 0 ? (
                  <button
                    type="button"
                    disabled={isProcessingInstantPayout}
                    onClick={handleInstantPayoutClick}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="size-3.5" />
                    <span>Instant Payout ⚡</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-zinc-400">
                    IMPS Disbursal Ready
                  </span>
                )}
              </div>
            </div>

            {/* 4 Fintech Metric Chips */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Chip 1: Payout Cycle */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-black">
                    <Clock3 className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Cycle Schedule
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-black text-black truncate">
                  {currentCycle?.payoutDate || "Every Monday"}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600">7-Day Auto Bank Credit</p>
              </div>

              {/* Chip 2: All-Time Settled */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <TrendingUp className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    All-Time Settled
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-black text-black">
                  ₹{allTimeSettled.toFixed(2)}
                </p>
                <p className="text-[10px] font-semibold text-zinc-500">Bank Reconciled</p>
              </div>

              {/* Chip 3: Statutory Tax (1% TCS) */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <ShieldCheck className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Tax Withheld
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-black text-black">
                  1% TCS Compliant
                </p>
                <p className="text-[10px] font-semibold text-purple-700">Sec 194-O ITC</p>
              </div>

              {/* Chip 4: Beneficiary Bank Account */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Wallet className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Settlement Bank
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-black text-black truncate">
                  {bankNameDisplay} {bankAccDisplay}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600">Direct Credit Verified ✓</p>
              </div>
            </div>

            {/* Past Cycles Section */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black tracking-tight text-black">Past cycles</h2>
                  <p className="text-[11px] font-medium text-zinc-500">
                    Filter weekly settlement statements & download reports
                  </p>
                </div>
              </div>
              
              {/* Date Filter Dropdown & Statement PDF/Excel Download Buttons */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <select
                    value={selectedPastRange}
                    onChange={(e) => setSelectedPastRange(e.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-zinc-200 bg-white pl-3.5 pr-9 text-xs font-black text-black shadow-2xs focus:border-black focus:outline-none"
                  >
                    {financeData?.months && financeData.months.length > 0 && (
                      <optgroup label="Monthly Consolidated Statements">
                        {financeData.months.map((m) => (
                          <option key={m.cycleId} value={m.cycleId}>{m.period} (Full Month)</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Weekly Settlement Cycles">
                      {financeData?.filterOptions?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </optgroup>
                    {!financeData?.filterOptions?.length && !financeData?.months?.length && (
                      <option value="">No past settlement cycles</option>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-black" />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadStatementPdf(selectedPastRange)}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 text-xs font-black text-red-700 shadow-2xs transition-transform active:scale-95 hover:bg-red-100 cursor-pointer"
                    title="Download Statement (PDF)"
                  >
                    <FileText className="size-3.5 text-red-600" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadStatementExcel(selectedPastRange)}
                    className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-black text-emerald-700 shadow-2xs transition-transform active:scale-95 hover:bg-emerald-100 cursor-pointer"
                    title="Download Statement (Excel)"
                  >
                    <FileSpreadsheet className="size-3.5 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Selected Filter Range Result Card */}
              {pastCycles.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-xs">
                  <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <Wallet className="size-5" />
                  </div>
                  <p className="text-xs font-black text-black">No Past Settlements Yet</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Completed orders will appear in weekly settlement cycles automatically.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-zinc-500">Est. net payout</p>
                        <p className="mt-0.5 text-2xl font-black text-black">
                          ₹{(selectedCycleObj?.netPayout ?? 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-zinc-500">Orders</p>
                        <p className="mt-0.5 text-xs font-black text-black">{selectedCycleObj?.orderCount ?? 0}</p>
                      </div>
                    </div>

                    {/* Clean Neutral Info Banner */}
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-zinc-800">
                      <HelpCircle className="size-4 shrink-0 text-zinc-500 mt-0.5" />
                      <p className="text-[11px] font-medium leading-relaxed text-zinc-600">
                        Based on transactions for {selectedCycleObj?.period || selectedPastRange}. Detailed breakdown is verifiable below:
                      </p>
                    </div>

                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <button
                        type="button"
                        onClick={() => selectedCycleObj && setSelectedCycleForModal(selectedCycleObj.cycleId)}
                        className="text-xs font-black text-black hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View details</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Settled Past Cycle Cards */}
                  {pastCycles.map((cycle) => (
                    <div key={cycle.cycleId} className="rounded-2xl border border-zinc-200 bg-white p-4.5 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-zinc-500">Net payout</p>
                          <p className="mt-0.5 text-xl font-black text-black">
                            ₹{cycle.netPayout.toFixed(2)}
                          </p>
                          <p className="text-[10px] font-medium text-zinc-400">{cycle.orderCount} orders</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-zinc-500">Status</p>
                          <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-black ${
                            cycle.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : cycle.status === "NO_ORDERS"
                              ? "bg-zinc-100 text-zinc-500"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {cycle.status === "NO_ORDERS" ? "No Orders" : cycle.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-dashed border-zinc-100 pt-2.5 text-xs">
                        <div>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase">Payout for</p>
                          <p className="font-bold text-black">{cycle.period}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-400 font-bold uppercase">Payout date</p>
                          <p className="font-bold text-black">{cycle.payoutDate}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCycleForModal(cycle.cycleId)}
                          className="text-xs font-black text-black hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>View details</span>
                          <span>→</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadStatementPdf(cycle.cycleId)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700 hover:bg-red-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                            title="Download PDF Statement"
                          >
                            <FileText className="size-3 text-red-600" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadStatementExcel(cycle.cycleId)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                            title="Download Excel / CSV Statement"
                          >
                            <FileSpreadsheet className="size-3 text-emerald-600" />
                            <span>Excel</span>
                          </button>
                        </div>
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
      {/* DESKTOP VIEW (>= md) — Matching Royal Blue Fintech Standards              */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-7xl px-4 py-4 md:block md:px-8 md:py-6">
        {loading ? (
          <PartnerCardsSkeleton />
        ) : (
          <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-black">Partner Finance & Settlements</h1>
                <p className="text-xs text-zinc-500">
                  7-Day automated settlement cycles, GST tax breakdown, and statutory e-commerce reconciliation.
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
              /* ========================================================================= */
              /* DESKTOP INVOICES & TAXES TAB VIEW                                         */
              /* ========================================================================= */
              <div className="grid grid-cols-3 gap-6">
                {/* Store Order Tax Invoices (Col-span 2) */}
                <div className="col-span-2 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-black">Store Order Tax Invoices</h2>
                        <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-black text-black">
                          {orderInvoices.length} Invoices
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Official 3-page Tax Invoices with GST breakdown & QR code for every customer order.
                      </p>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search invoice or customer..."
                        className="h-9.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-9 pr-3 text-xs font-medium text-black placeholder:text-zinc-400 focus:border-black focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-zinc-100 max-h-[520px] overflow-y-auto pr-1">
                    {filteredOrderInvoices.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-xs font-bold text-zinc-400">
                          {searchQuery ? "No matching order invoices found." : "No order tax invoices generated yet."}
                        </p>
                      </div>
                    ) : (
                      filteredOrderInvoices.map((inv) => (
                        <div
                          key={inv.invoiceNumber}
                          className="flex items-center justify-between py-3.5"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                              <p className="text-xs font-black text-black">{inv.invoiceNumber}</p>
                              {inv.orderNumber && (
                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700">
                                  #{inv.orderNumber}
                                </span>
                              )}
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                                  inv.status.toLowerCase() === "paid"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : inv.status.toLowerCase() === "cancelled"
                                    ? "bg-zinc-100 text-zinc-500"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {inv.status}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-medium text-zinc-500">
                              {inv.type} · {inv.date}
                            </p>
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
                              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-black text-black hover:bg-zinc-100 active:scale-95 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                            >
                              {downloadingId === inv.invoiceNumber ? (
                                <Loader2 className="size-3.5 animate-spin text-zinc-600" />
                              ) : (
                                <Download className="size-3.5 text-black" />
                              )}
                              <span>Download PDF</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* GST Commission Invoices (Col-span 1) */}
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
                            <div>
                              <p className="text-xs font-black text-black">Fee: ₹{inv.amount.toFixed(2)}</p>
                              <p className="text-[10px] font-bold text-zinc-900">ITC GST: ₹{inv.gstAmount.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={downloadingId === inv.invoiceNumber}
                                onClick={() => handleDownloadCommissionPdf(inv)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-700 hover:bg-red-100 active:scale-95 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                                title="Download GST Commission Invoice PDF"
                              >
                                {downloadingId === inv.invoiceNumber ? (
                                  <Loader2 className="size-3 animate-spin text-red-600" />
                                ) : (
                                  <FileText className="size-3 text-red-600" />
                                )}
                                <span>PDF</span>
                              </button>
                              <button
                                type="button"
                                disabled={downloadingId === `${inv.invoiceNumber}-excel`}
                                onClick={() => handleDownloadCommissionExcel(inv)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                                title="Download GST Commission Invoice Excel"
                              >
                                {downloadingId === `${inv.invoiceNumber}-excel` ? (
                                  <Loader2 className="size-3 animate-spin text-emerald-600" />
                                ) : (
                                  <FileSpreadsheet className="size-3 text-emerald-600" />
                                )}
                                <span>Excel</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* DESKTOP PAYOUTS TAB VIEW                                                  */
              /* ========================================================================= */
              <div className="grid grid-cols-3 gap-6">
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
                    </div>

                    <p className="mt-3 text-3xl font-black text-black">
                      ₹{currentCycle?.estPayout ? currentCycle.estPayout.toFixed(2) : "0.00"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{currentCycle?.period}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
                      Disbursal Date: {currentCycle?.payoutDate || "Every Monday"}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCycleForModal("current")}
                        className="text-xs font-black text-black hover:underline cursor-pointer"
                      >
                        View itemized breakdown →
                      </button>

                      {(currentCycle?.estPayout || 0) > 0 ? (
                        <button
                          type="button"
                          disabled={isProcessingInstantPayout}
                          onClick={handleInstantPayoutClick}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Zap className="size-3.5" />
                          <span>Instant Payout ⚡</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-zinc-400">
                          IMPS Disbursal Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop KPI Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-2xs">
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

                    <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                          <Wallet className="size-3.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          Verified Bank
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-black text-black truncate">{bankNameDisplay}</p>
                      <p className="text-[10px] font-semibold text-emerald-600">{bankAccDisplay} Verified ✓</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Settlement History & Statements */}
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm col-span-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4">
                    <div>
                      <h2 className="text-base font-black text-black">Settlement History & Statements</h2>
                      <p className="text-xs text-zinc-500">Download bank-reconciled statements in PDF or Excel / CSV format.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={selectedPastRange}
                          onChange={(e) => setSelectedPastRange(e.target.value)}
                          className="h-9 appearance-none rounded-xl border border-zinc-200 bg-white pl-3 pr-8 text-xs font-black text-black shadow-2xs focus:border-black focus:outline-none"
                        >
                          {financeData?.months && financeData.months.length > 0 && (
                            <optgroup label="Monthly Statements">
                              {financeData.months.map((m) => (
                                <option key={m.cycleId} value={m.cycleId}>{m.period} (Full Month)</option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="Weekly Settlement Cycles">
                            {financeData?.filterOptions?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </optgroup>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-black" />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadStatementPdf(selectedPastRange)}
                        className="flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        title="Download Statement (PDF)"
                      >
                        <FileText className="size-3.5 text-red-600" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadStatementExcel(selectedPastRange)}
                        className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        title="Download Statement (Excel)"
                      >
                        <FileSpreadsheet className="size-3.5 text-emerald-600" />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-zinc-100">
                    {pastCycles.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-xs font-medium text-zinc-400">No past settlement cycles recorded yet.</p>
                      </div>
                    ) : (
                      pastCycles.map((cycle) => (
                        <div key={cycle.cycleId} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-xs font-black text-black">{cycle.period}</p>
                            <p className="text-[11px] text-zinc-500">
                              {cycle.orderCount} orders {cycle.payoutDate !== "-" ? `settled on ${cycle.payoutDate}` : "(no settlements)"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-black">₹{cycle.netPayout.toFixed(2)}</span>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                              cycle.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : cycle.status === "NO_ORDERS"
                                ? "bg-zinc-100 text-zinc-500"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {cycle.status === "NO_ORDERS" ? "No Orders" : cycle.status}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDownloadStatementPdf(cycle.cycleId)}
                                className="flex size-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:scale-95 transition-all shadow-2xs"
                                title="Download PDF Statement"
                              >
                                <FileText className="size-3 text-red-600" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadStatementExcel(cycle.cycleId)}
                                className="flex size-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs"
                                title="Download Excel Statement"
                              >
                                <FileSpreadsheet className="size-3 text-emerald-600" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedCycleForModal(cycle.cycleId)}
                              className="text-xs font-black text-black hover:underline cursor-pointer"
                            >
                              Details →
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

      {/* ========================================================================= */}
      {/* SETTLEMENT SUMMARY MODAL (DRILLDOWN VIEW)                                 */}
      {/* ========================================================================= */}
      {selectedCycleForModal && (
        <SettlementSummaryModal
          cycleId={selectedCycleForModal}
          onClose={() => setSelectedCycleForModal(null)}
        />
      )}

      <Toaster />
    </PartnerLayout>
  );
}
