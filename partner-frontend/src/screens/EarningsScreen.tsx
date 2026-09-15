import { useNavigate, Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  HelpCircle,
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
  fetchFinanceOverview,
  fetchFinanceTaxInvoices,
  downloadSettlementReport,
  downloadPartnerInvoicePdfBlob,
  downloadCommissionInvoicePdfBlob,
} from "@/api/partner/partner-finance-api";
import { SettlementSummaryModal } from "../components/finance/SettlementSummaryModal";

export function EarningsScreen() {
  const navigate = useNavigate();
  const { data: profile } = usePartnerResource(fetchPartnerProfile);

  const [financeData, setFinanceData] = useState<FinanceOverviewResponse | null>(null);
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [orderInvoices, setOrderInvoices] = useState<TaxInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState<"payouts" | "invoices">("payouts");
  const [selectedPastRange, setSelectedPastRange] = useState<string>("");
  const [selectedCycleForModal, setSelectedCycleForModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleDownloadReport = async () => {
    const cycle = financeData?.pastCycles.find((c) => c.period === selectedPastRange) || financeData?.pastCycles[0];
    if (!cycle) {
      toast.error("No statement available for selected range");
      return;
    }
    toast.success(`Generating settlement statement for ${selectedPastRange}...`);
    try {
      const res = await downloadSettlementReport(cycle.cycleId);
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(res.data, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", res.filename || `QuickPress_Statement_${cycle.cycleId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Statement downloaded successfully!");
    } catch {
      toast.error("Failed to generate report");
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

  return (
    <PartnerLayout
      activeTab="earnings"
      title="Payouts & Finance"
      subtitle="Track 7-day automatic settlements and download GST invoices"
    >
      {/* ========================================================================= */}
      {/* MOBILE VIEW (< md) Matching Exact Reference Screenshots                    */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-[#F4F5F7] pb-28 text-zinc-900 md:hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white px-4 pt-3.5 pb-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base font-black tracking-tight text-zinc-900">
                  {profile?.businessName || profile?.ownerName || "QuickPress Laundry Store"}
                </h1>
                <ChevronDown className="size-4 text-zinc-500 shrink-0" />
              </div>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-500">
                ID: {profile?.partnerId || "22391793"} • {profile?.city ? `${profile.city} Locality, ${profile.city}` : "Kasganj Locality, Kasganj"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={partnerRoutes.notifications}
                className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition-transform active:scale-95"
              >
                <Bell className="size-4" />
              </Link>
              <Link
                to={partnerRoutes.profile}
                className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-800"
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
              className={`rounded-full px-5 py-2 text-xs font-black transition-all active:scale-95 ${
                activeSubTab === "payouts"
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
              }`}
            >
              Payouts
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("invoices")}
              className={`rounded-full px-5 py-2 text-xs font-black transition-all active:scale-95 ${
                activeSubTab === "invoices"
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
              }`}
            >
              Invoices & Taxes
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs font-bold text-zinc-500">Loading settlement cycles...</p>
          </div>
        ) : activeSubTab === "invoices" ? (
          /* ========================================================================= */
          /* INVOICES & TAXES TAB VIEW                                                 */
          /* ========================================================================= */
          <div className="space-y-4 p-4">
            {/* Store Order Tax Invoices */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-zinc-900">Store Order Tax Invoices</h2>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-black text-zinc-700">
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
                    placeholder="Search invoice or customer..."
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-9 pr-3 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
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
                          <p className="text-xs font-black text-zinc-900">{inv.invoiceNumber}</p>
                          {inv.orderNumber && (
                            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">
                              #{inv.orderNumber}
                            </span>
                          )}
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                              inv.status.toLowerCase() === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : inv.status.toLowerCase() === "cancelled"
                                ? "bg-zinc-100 text-zinc-500"
                                : "bg-amber-50 text-amber-700"
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
                          <p className="text-xs font-black text-zinc-900">₹{inv.amount.toFixed(2)}</p>
                          <p className="text-[10px] font-semibold text-zinc-400">
                            GST: ₹{inv.gstAmount.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={downloadingId === inv.invoiceNumber}
                          onClick={() => handleDownloadOrderInvoicePdf(inv)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-black text-zinc-800 hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {downloadingId === inv.invoiceNumber ? (
                            <Loader2 className="size-3 animate-spin text-zinc-600" />
                          ) : (
                            <Download className="size-3 text-zinc-700" />
                          )}
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. GST Commission Invoices (ITC Claimable) */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-zinc-900">GST Commission Invoices (ITC)</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Monthly platform fee tax invoices issued by QuickPress for your Input Tax Credit (ITC) claims.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-black text-blue-700">
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
                          <p className="text-xs font-black text-zinc-900">{inv.invoiceNumber}</p>
                          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                            {inv.status}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                          {inv.period} • Generated on {inv.date} • SAC 998311
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right">
                          <p className="text-xs font-black text-zinc-900">Fee: ₹{inv.amount.toFixed(2)}</p>
                          <p className="text-[10px] font-bold text-blue-600">
                            ITC GST: ₹{inv.gstAmount.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={downloadingId === inv.invoiceNumber}
                          onClick={() => handleDownloadCommissionPdf(inv)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-black text-zinc-800 hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {downloadingId === inv.invoiceNumber ? (
                            <Loader2 className="size-3 animate-spin text-zinc-600" />
                          ) : (
                            <Download className="size-3 text-zinc-700" />
                          )}
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
          /* ========================================================================= */
          /* PAYOUTS TAB VIEW (Matching Reference Screenshot 2)                        */
          /* ========================================================================= */
          <div className="space-y-4 p-4">
            {/* Current Ongoing 7-Day Cycle Card */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-zinc-500">Payout for</p>
                  <p className="mt-0.5 text-xs font-black text-zinc-900">
                    {currentCycle?.period || "Current Cycle"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-zinc-500">Payout date</p>
                  <p className="mt-0.5 text-xs font-black text-zinc-900">
                    {currentCycle?.payoutDate || "Auto 7-Day Cycle"}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-zinc-100 pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedCycleForModal("current")}
                  className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>View details</span>
                  <span>→</span>
                </button>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                  <ShieldCheck className="size-3" />
                  <span>7-Day Auto Settlement</span>
                </div>
              </div>
            </div>

            {/* Past Cycles Section */}
            <div>
              <h2 className="text-base font-black tracking-tight text-zinc-900">Past cycles</h2>
              
              {/* Date Filter Dropdown & Get Report Button */}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedPastRange}
                    onChange={(e) => setSelectedPastRange(e.target.value)}
                    className="h-11 w-full appearance-none rounded-2xl border border-zinc-200 bg-white pl-4 pr-10 text-xs font-black text-zinc-800 shadow-xs focus:border-zinc-400 focus:outline-none"
                  >
                    {financeData?.filterOptions?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    {!financeData?.filterOptions?.length && (
                      <option value="">No past settlement cycles</option>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="flex h-11 items-center gap-1.5 rounded-2xl bg-zinc-950 px-4 text-xs font-black text-white shadow-sm transition-transform active:scale-95"
                >
                  <Download className="size-3.5" />
                  <span>Get report</span>
                </button>
              </div>

              {/* Selected Filter Range Result Card */}
              {pastCycles.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-zinc-200/80 bg-white p-6 text-center shadow-xs">
                  <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <Wallet className="size-5" />
                  </div>
                  <p className="text-xs font-black text-zinc-800">No Past Settlements Yet</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Completed orders will appear in weekly settlement cycles automatically.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-zinc-500">Est. net payout</p>
                        <p className="mt-0.5 text-2xl font-black text-zinc-900">
                          ₹{(selectedCycleObj?.netPayout ?? 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-zinc-500">Orders</p>
                        <p className="mt-0.5 text-xs font-black text-zinc-900">{selectedCycleObj?.orderCount ?? 0}</p>
                      </div>
                    </div>

                    {/* Yellow Info Banner */}
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#FEF6E8] p-3 text-zinc-800">
                      <HelpCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                      <p className="text-[11px] font-medium leading-relaxed text-zinc-700">
                        This is based on transactions for the selected date range ({selectedCycleObj?.period || selectedPastRange}). Details of the involved payout cycles are given below
                      </p>
                    </div>

                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <button
                        type="button"
                        onClick={() => selectedCycleObj && setSelectedCycleForModal(selectedCycleObj.cycleId)}
                        className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>View details</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Settled Past Cycle Cards */}
                  {pastCycles.map((cycle) => (
                    <div key={cycle.cycleId} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-zinc-500">Net payout</p>
                          <p className="mt-0.5 text-xl font-black text-zinc-900">
                            ₹{cycle.netPayout.toFixed(2)}
                          </p>
                          <p className="text-[10px] font-medium text-zinc-400">{cycle.orderCount} orders</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-zinc-500">Status</p>
                          <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-black ${
                            cycle.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : cycle.status === "NO_ORDERS"
                              ? "bg-zinc-100 text-zinc-500"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {cycle.status === "NO_ORDERS" ? "No Orders" : cycle.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-dashed border-zinc-100 pt-2.5 text-xs">
                        <div>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase">Payout for</p>
                          <p className="font-bold text-zinc-800">{cycle.period}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-400 font-bold uppercase">Payout date</p>
                          <p className="font-bold text-zinc-800">{cycle.payoutDate}</p>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-zinc-100 pt-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCycleForModal(cycle.cycleId)}
                          className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>View details</span>
                          <span>→</span>
                        </button>
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
      {/* DESKTOP VIEW (>= md)                                                      */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-7xl px-4 py-4 md:block md:px-8 md:py-6">
        {loading ? (
          <PartnerCardsSkeleton />
        ) : (
          <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-foreground">Partner Finance & Settlements</h1>
                <p className="text-xs text-muted-foreground">
                  7-Day automated settlement cycles, GST tax breakdown, and statutory e-commerce reconciliation.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-100 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("payouts")}
                    className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all ${
                      activeSubTab === "payouts"
                        ? "bg-white text-zinc-900 shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    Payouts & Cycles
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("invoices")}
                    className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all ${
                      activeSubTab === "invoices"
                        ? "bg-white text-zinc-900 shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    Invoices & Taxes
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCycleForModal("current")}
                  className="flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-zinc-800 active:scale-95"
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
                  {/* 2. Store Order Tax Invoices (Col-span 2) */}
                  <div className="col-span-2 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black text-zinc-900">Store Order Tax Invoices</h2>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-black text-zinc-700">
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
                          className="h-9.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-9 pr-3 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none"
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
                                <p className="text-xs font-black text-zinc-900">{inv.invoiceNumber}</p>
                                {inv.orderNumber && (
                                  <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600">
                                    #{inv.orderNumber}
                                  </span>
                                )}
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                                    inv.status.toLowerCase() === "paid"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : inv.status.toLowerCase() === "cancelled"
                                      ? "bg-zinc-100 text-zinc-500"
                                      : "bg-amber-50 text-amber-700"
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
                                <p className="text-sm font-black text-zinc-900">₹{inv.amount.toFixed(2)}</p>
                                <p className="text-[11px] font-semibold text-zinc-400">
                                  GST: ₹{inv.gstAmount.toFixed(2)}
                                </p>
                              </div>
                              <button
                                type="button"
                                disabled={downloadingId === inv.invoiceNumber}
                                onClick={() => handleDownloadOrderInvoicePdf(inv)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3.5 py-1.5 text-xs font-black text-zinc-800 hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50"
                              >
                                {downloadingId === inv.invoiceNumber ? (
                                  <Loader2 className="size-3.5 animate-spin text-zinc-600" />
                                ) : (
                                  <Download className="size-3.5 text-zinc-700" />
                                )}
                                <span>Download PDF</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 3. GST Commission Invoices (Col-span 1) */}
                  <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-black text-zinc-900">GST Commission (ITC)</h2>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
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
                          <div
                            key={inv.invoiceNumber}
                            className="py-3.5"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-black text-zinc-900">{inv.invoiceNumber}</p>
                              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                                {inv.status}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-zinc-500">{inv.period} • {inv.date}</p>
                            
                            <div className="mt-2 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-black text-zinc-900">Fee: ₹{inv.amount.toFixed(2)}</p>
                                <p className="text-[10px] font-bold text-blue-600">ITC GST: ₹{inv.gstAmount.toFixed(2)}</p>
                              </div>
                              <button
                                type="button"
                                disabled={downloadingId === inv.invoiceNumber}
                                onClick={() => handleDownloadCommissionPdf(inv)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-black text-zinc-800 hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50"
                              >
                                {downloadingId === inv.invoiceNumber ? (
                                  <Loader2 className="size-3 animate-spin text-zinc-600" />
                                ) : (
                                  <Download className="size-3 text-zinc-700" />
                                )}
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
              /* ========================================================================= */
              /* DESKTOP PAYOUTS TAB VIEW                                                  */
              /* ========================================================================= */
              <div className="grid grid-cols-3 gap-6">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Current 7-Day Cycle Accrued
                    </p>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-600">
                      Auto-Settling
                    </span>
                  </div>
                  <p className="mt-2 text-3xl font-black text-foreground">
                    ₹{currentCycle?.estPayout ? currentCycle.estPayout.toFixed(2) : "0.00"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{currentCycle?.period}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedCycleForModal("current")}
                    className="mt-4 text-xs font-black text-blue-600 hover:underline"
                  >
                    View itemized breakdown →
                  </button>
                </div>

                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm col-span-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-foreground">Settlement History</h2>
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      className="flex items-center gap-1.5 text-xs font-black text-zinc-900 hover:underline"
                    >
                      <Download className="size-3.5" />
                      <span>Download Selected Statement</span>
                    </button>
                  </div>

                  <div className="mt-4 divide-y divide-border">
                    {pastCycles.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-xs font-medium text-muted-foreground">No past settlement cycles recorded yet.</p>
                      </div>
                    ) : (
                      pastCycles.map((cycle) => (
                        <div key={cycle.cycleId} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-xs font-black text-foreground">{cycle.period}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {cycle.orderCount} orders {cycle.payoutDate !== "-" ? `settled on ${cycle.payoutDate}` : "(no settlements)"}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-black text-foreground">₹{cycle.netPayout.toFixed(2)}</span>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                              cycle.status === "PAID"
                                ? "bg-emerald-500/15 text-emerald-600"
                                : cycle.status === "NO_ORDERS"
                                ? "bg-zinc-100 text-zinc-500"
                                : "bg-amber-500/15 text-amber-600"
                            }`}>
                              {cycle.status === "NO_ORDERS" ? "No Orders" : cycle.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedCycleForModal(cycle.cycleId)}
                              className="text-xs font-black text-blue-600 hover:underline"
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
