import { useEffect, useMemo, useState } from "react";
import { Download, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PartnerCardsSkeleton } from "../components/PartnerSkeletons";
import { usePartnerResource } from "../hooks/use-partner-resource";
import { fetchPartnerProfile } from "@/api/partner/partner-profile-api";
import {
  type FinanceOverviewResponse,
  type PassbookEntry,
  type SettlementOrder,
  type TaxInvoice,
  downloadCommissionInvoiceExcelBlob,
  downloadCommissionInvoicePdfBlob,
  downloadPartnerInvoicePdfBlob,
  downloadSettlementExcelBlob,
  downloadSettlementPdfBlob,
  fetchFinanceOverview,
  fetchFinanceTaxInvoices,
  getCachedFinanceInvoices,
  getCachedFinanceOverview,
} from "@/api/partner/partner-finance-api";
import { SettlementSummaryModal } from "../components/finance/SettlementSummaryModal";
import { inr } from "../lib/currency";

/** Format cycle/payout dates cleanly as Date & Month only (strips prefixes & weekday names). */
function formatDateMonthOnly(raw?: string | null): string {
  if (!raw) return "—";
  return raw
    .replace(/^(current|weekly|daily|monthly)\s*(settlement|cycle)?\s*[•·:\-]\s*/i, "")
    .replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+/gi, "")
    .trim();
}

export function EarningsScreen() {
  const { data: profile } = usePartnerResource(fetchPartnerProfile);

  const cachedOverview = getCachedFinanceOverview();
  const cachedInvoices = getCachedFinanceInvoices();

  const [financeData, setFinanceData] = useState<FinanceOverviewResponse | null>(cachedOverview);
  const [invoices, setInvoices] = useState<TaxInvoice[]>(cachedInvoices?.invoices || []);
  const [orderInvoices, setOrderInvoices] = useState<TaxInvoice[]>(
    cachedInvoices?.orderInvoices || []
  );
  const [loading, setLoading] = useState(!cachedOverview);

  const [activeSubTab, setActiveSubTab] = useState<"passbook" | "trends" | "invoices">("passbook");
  const [passbookViewMode, setPassbookViewMode] = useState<"cycles" | "orders">("cycles");
  const [statusFilter, setStatusFilter] = useState<"all" | "settled" | "processing">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCycleForAudit, setSelectedCycleForAudit] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const loadData = async () => {
      try {
        const [overview, invRes] = await Promise.all([
          fetchFinanceOverview().catch(() => null),
          fetchFinanceTaxInvoices().catch(() => ({ invoices: [], orderInvoices: [] })),
        ]);
        if (!alive) return;
        if (overview) setFinanceData(overview);
        if (invRes?.invoices) setInvoices(invRes.invoices);
        if (invRes?.orderInvoices) {
          setOrderInvoices(
            invRes.orderInvoices.filter((inv) => Boolean(inv && inv.amount > 0))
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    void loadData();
    return () => {
      alive = false;
    };
  }, []);

  const copyToClipboard = (text: string, label = "UTR") => {
    if (!text) return;
    void navigator.clipboard?.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleDownloadCyclePdf = async (cycleId: string) => {
    setDownloadingId(`pdf-${cycleId}`);
    try {
      await downloadSettlementPdfBlob(cycleId);
      toast.success("Settlement PDF downloaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCycleExcel = async (cycleId: string) => {
    setDownloadingId(`csv-${cycleId}`);
    try {
      await downloadSettlementExcelBlob(cycleId);
      toast.success("Settlement CSV downloaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download CSV");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadOrderInvoicePdf = async (inv: TaxInvoice) => {
    const targetId = inv.orderNumber || inv.invoiceNumber;
    setDownloadingId(inv.invoiceNumber);
    try {
      await downloadPartnerInvoicePdfBlob(
        targetId,
        `QuickPress-Invoice-${inv.invoiceNumber.replace(/\//g, "-")}.pdf`
      );
      toast.success(`Invoice ${inv.invoiceNumber} downloaded`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download order invoice");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCommissionPdf = async (inv: TaxInvoice) => {
    const urlParts = inv.downloadUrl ? inv.downloadUrl.split("/") : [];
    const periodKey = urlParts[urlParts.length - 2] || "current";
    setDownloadingId(`comm-pdf-${inv.invoiceNumber}`);
    try {
      await downloadCommissionInvoicePdfBlob(
        periodKey,
        `QuickPress-Commission-${inv.invoiceNumber}.pdf`
      );
      toast.success(`Commission invoice ${inv.invoiceNumber} downloaded`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download commission PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCommissionExcel = async (inv: TaxInvoice) => {
    const urlParts = inv.downloadUrl ? inv.downloadUrl.split("/") : [];
    const periodKey = urlParts[urlParts.length - 2] || "current";
    setDownloadingId(`comm-xls-${inv.invoiceNumber}`);
    try {
      await downloadCommissionInvoiceExcelBlob(
        periodKey,
        `QuickPress-Commission-${inv.invoiceNumber}.xlsx`
      );
      toast.success(`Commission Excel ${inv.invoiceNumber} downloaded`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download commission Excel");
    } finally {
      setDownloadingId(null);
    }
  };

  const currentCycle = financeData?.currentCycle;
  const pastCycles = financeData?.pastCycles || [];

  const bankDetails = financeData?.bankDetails || {
    accountHolder: profile?.businessName || profile?.ownerName || "Merchant Partner",
    bankName: "Bank Account",
    accountNumberMasked: "•••• ••••",
    ifsc: "",
    utr: null,
    transferMode: "IMPS / NEFT Auto",
  };

  const passbookCycles: PassbookEntry[] = useMemo(() => {
    if (financeData?.passbook && financeData.passbook.length > 0) {
      return financeData.passbook;
    }
    const list: PassbookEntry[] = pastCycles.map((c) => ({
      id: c.cycleId,
      type: "cycle_settlement" as const,
      title: c.period,
      period: c.period,
      date: c.payoutDate,
      utr: c.utr || null,
      status: c.status === "PAID" ? "SETTLED" : c.status,
      orderCount: c.orderCount,
      grossAmount: c.grossAmount || 0,
      commissionAmount: c.commissionAmount || 0,
      tcsAmount: c.tcsAmount || 0,
      taxTotal: c.taxTotal || 0,
      netCredit: c.netPayout,
      bankName: c.bankName || bankDetails.bankName,
      accountNumberMasked: c.accountNumberMasked || bankDetails.accountNumberMasked,
      cycleId: c.cycleId,
    }));
    if (currentCycle) {
      list.unshift({
        id: "current",
        type: "current_cycle" as const,
        title: currentCycle.period,
        period: currentCycle.period,
        date: currentCycle.payoutDate,
        utr: null,
        status: "ACCRUING",
        orderCount: currentCycle.orderCount,
        grossAmount: currentCycle.grossAmount || 0,
        commissionAmount: currentCycle.commissionAmount || 0,
        tcsAmount: currentCycle.tcsAmount || 0,
        taxTotal: (currentCycle.commissionAmount || 0) * 0.18 + (currentCycle.tcsAmount || 0),
        netCredit: currentCycle.estPayout,
        bankName: bankDetails.bankName,
        accountNumberMasked: bankDetails.accountNumberMasked,
        cycleId: currentCycle.cycleId || "current",
      });
    }
    return list;
  }, [financeData?.passbook, pastCycles, currentCycle, bankDetails]);

  const allOrders: SettlementOrder[] = useMemo(
    () =>
      financeData?.allSettledOrders?.length
        ? financeData.allSettledOrders
        : financeData?.currentOrders || [],
    [financeData]
  );

  const filteredCycles = useMemo(
    () =>
      passbookCycles.filter((c) => {
        const normStatus = (c.status || "").toUpperCase();
        if (statusFilter === "settled" && normStatus !== "SETTLED" && normStatus !== "PAID") {
          return false;
        }
        if (
          statusFilter === "processing" &&
          normStatus !== "ACCRUING" &&
          normStatus !== "PROCESSING"
        ) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            c.period.toLowerCase().includes(q) ||
            (c.utr ? c.utr.toLowerCase().includes(q) : false) ||
            c.date.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [passbookCycles, statusFilter, searchQuery]
  );

  const filteredOrders = useMemo(
    () =>
      allOrders.filter((ord) => {
        const settled =
          ord.isSettled || ord.settlementStatus === "PAID" || ord.settlementStatus === "SETTLED";
        if (statusFilter === "settled" && !settled) return false;
        if (statusFilter === "processing" && settled) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            ord.orderCode.toLowerCase().includes(q) ||
            (ord.utr ? ord.utr.toLowerCase().includes(q) : false) ||
            (ord.cyclePeriod ? ord.cyclePeriod.toLowerCase().includes(q) : false)
          );
        }
        return true;
      }),
    [allOrders, statusFilter, searchQuery]
  );

  const filteredOrderInvoices = useMemo(
    () =>
      orderInvoices.filter((inv) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.orderNumber ? inv.orderNumber.toLowerCase().includes(q) : false)
        );
      }),
    [orderInvoices, searchQuery]
  );

  const totalSettledLifetime = useMemo(
    () =>
      passbookCycles
        .filter((c) => c.status === "SETTLED" || c.status === "PAID")
        .reduce((sum, c) => sum + (c.netCredit || 0), 0),
    [passbookCycles]
  );

  const latestSettledCycle = useMemo(
    () =>
      passbookCycles.find((c) => (c.status === "SETTLED" || c.status === "PAID") && c.utr) ||
      null,
    [passbookCycles]
  );

  const currentAccruingBalance = currentCycle?.estPayout || 0;
  const currentCycleGross = currentCycle?.grossAmount || 0;
  const currentCycleDeduct = Math.max(0, currentCycleGross - currentAccruingBalance);

  // Daily trend chart geometry
  const dailyTrend = financeData?.dailyTrend || [];
  const chartPoints = useMemo(() => {
    if (dailyTrend.length === 0) return [];
    const maxVal = Math.max(...dailyTrend.map((d) => Math.max(d.netPayout, 1)), 500);
    const width = 620;
    const height = 165;
    const padX = 20;
    const padTop = 18;
    const padBottom = 22;
    const usableW = width - padX * 2;
    const usableH = height - padTop - padBottom;

    return dailyTrend.map((d, i) => {
      const x = padX + (i / Math.max(1, dailyTrend.length - 1)) * usableW;
      const y = padTop + (1 - d.netPayout / maxVal) * usableH;
      return { x, y, item: d };
    });
  }, [dailyTrend]);

  const { linePath, areaPath } = useMemo(() => {
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    if (!first || !last || chartPoints.length < 2) return { linePath: "", areaPath: "" };
    let d = `M ${first.x} ${first.y}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i]!;
      const p1 = chartPoints[i + 1]!;
      const mx = (p0.x + p1.x) / 2;
      d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    const baseY = 165 - 22;
    return {
      linePath: d,
      areaPath: `${d} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`,
    };
  }, [chartPoints]);

  const commissionPct = financeData?.commissionRatePct || 15;
  const tcsPct = 1;
  const takeHomePct = Math.max(0, 100 - commissionPct - tcsPct);

  return (
    <PartnerLayout activeTab="earnings" title="Settlements & Payouts">
      <div className="min-h-full bg-[#FAFAFA] pb-20 text-zinc-950">
        {/* Ultra-Clean Sticky Header (ONLY "Settlements & Payouts" — nothing else) */}
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
          <div className="app-header-safe mx-auto max-w-6xl px-4 pb-3.5 md:px-6 md:pt-4">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950">
              Settlements &amp; Payouts
            </h1>
          </div>
        </header>

        {/* Sub-Navigation Bar */}
        <nav className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto no-scrollbar px-4 md:px-6">
            <button
              type="button"
              onClick={() => {
                setSelectedCycleForAudit(null);
                setActiveSubTab("passbook");
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === "passbook" && !selectedCycleForAudit
                  ? "border-zinc-950 text-zinc-950 font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span>Settlement Passbook</span>
              {passbookCycles.length > 0 ? (
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 tabular-nums">
                  {passbookCycles.length}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCycleForAudit(null);
                setActiveSubTab("trends");
              }}
              className={`shrink-0 border-b-2 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === "trends" && !selectedCycleForAudit
                  ? "border-zinc-950 text-zinc-950 font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Cashflow &amp; Margin
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCycleForAudit(null);
                setActiveSubTab("invoices");
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === "invoices" && !selectedCycleForAudit
                  ? "border-zinc-950 text-zinc-950 font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <span>GST &amp; Tax Invoices</span>
              {invoices.length + orderInvoices.length > 0 ? (
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 tabular-nums">
                  {invoices.length + orderInvoices.length}
                </span>
              ) : null}
            </button>
          </div>
        </nav>

        {/* Main Content Workspace */}
        <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6 space-y-5">
          {loading ? (
            <PartnerCardsSkeleton />
          ) : selectedCycleForAudit ? (
            <SettlementSummaryModal
              cycleId={selectedCycleForAudit}
              onClose={() => setSelectedCycleForAudit(null)}
            />
          ) : (
            <>
              {/* Hero Settlement Rail (Automated Bank Settlement — No Withdraw Option) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Next Scheduled Bank Settlement */}
                <section className="lg:col-span-7 rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Next Automated Bank Settlement
                      </p>
                      <p className="mt-1.5 text-3xl font-bold tracking-tight text-zinc-950 tabular-nums">
                        {inr(currentAccruingBalance)}
                      </p>
                    </div>
                    {currentCycle?.payoutDate ? (
                      <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-800 tabular-nums">
                        Scheduled {formatDateMonthOnly(currentCycle.payoutDate)}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-100">
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500">Cycle Gross</p>
                      <p className="mt-0.5 text-sm font-bold text-zinc-950 tabular-nums">
                        {inr(currentCycleGross)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500">Fee &amp; Statutory</p>
                      <p className="mt-0.5 text-sm font-bold text-rose-600 tabular-nums">
                        -{inr(currentCycleDeduct)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500">Settled Lifetime</p>
                      <p className="mt-0.5 text-sm font-bold text-emerald-700 tabular-nums">
                        {inr(totalSettledLifetime)}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Right: Verified Destination Bank & Latest UTR */}
                <section className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Payout Destination Rail
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Verified
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm font-bold text-zinc-950">
                      {bankDetails.bankName} · {bankDetails.accountNumberMasked}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-zinc-500 tabular-nums">
                      {bankDetails.ifsc ? `IFSC ${bankDetails.ifsc} · ` : ""}
                      {bankDetails.transferMode}
                    </p>
                  </div>

                  <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Last Settled UTR
                      </p>
                      <p className="text-xs font-bold text-zinc-950 truncate tabular-nums">
                        {latestSettledCycle?.utr || bankDetails.utr || "Awaiting first bank run"}
                      </p>
                    </div>
                    {latestSettledCycle?.utr || bankDetails.utr ? (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            String(latestSettledCycle?.utr || bankDetails.utr),
                            "UTR"
                          )
                        }
                        className="shrink-0 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 cursor-pointer"
                      >
                        Copy
                      </button>
                    ) : null}
                  </div>
                </section>
              </div>

              {/* VIEW 1: SETTLEMENT PASSBOOK */}
              {activeSubTab === "passbook" ? (
                <div className="space-y-3">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => setPassbookViewMode("cycles")}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                            passbookViewMode === "cycles"
                              ? "bg-white text-zinc-950 shadow-2xs"
                              : "text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          By Settlement Cycle
                        </button>
                        <button
                          type="button"
                          onClick={() => setPassbookViewMode("orders")}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                            passbookViewMode === "orders"
                              ? "bg-white text-zinc-950 shadow-2xs"
                              : "text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          By Individual Order
                        </button>
                      </div>

                      <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 gap-1">
                        {[
                          { id: "all", label: "All" },
                          { id: "settled", label: "Settled" },
                          { id: "processing", label: "Accruing" },
                        ].map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setStatusFilter(s.id as any)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                              statusFilter === s.id
                                ? "bg-white text-zinc-950 shadow-2xs"
                                : "text-zinc-600 hover:text-zinc-950"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Blank Search Input */}
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder=""
                        aria-label="Search settlements or orders"
                        className="h-9 w-full rounded-xl border border-zinc-200 bg-white pl-8.5 pr-8 text-xs font-semibold text-zinc-950 focus:border-zinc-900 focus:outline-hidden"
                      />
                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800 cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Cycles Table (Horizontally Scrollable on Mobile) */}
                  {passbookViewMode === "cycles" ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                      <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50/90 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              <th className="py-3 pl-4 pr-3">Period &amp; UTR</th>
                              <th className="py-3 px-3">Payout Date</th>
                              <th className="py-3 px-3 text-right">Gross / Deduct</th>
                              <th className="py-3 px-3 text-right">Net Credited</th>
                              <th className="py-3 pl-3 pr-4 text-right">Statements &amp; Audit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {filteredCycles.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-10 text-center text-zinc-500">
                                  No settlement cycles found.
                                </td>
                              </tr>
                            ) : (
                              filteredCycles.map((cycle) => {
                                const isSettled =
                                  cycle.status === "SETTLED" || cycle.status === "PAID";
                                const dedTotal = Math.max(
                                  0,
                                  (cycle.grossAmount || 0) - (cycle.netCredit || 0)
                                );
                                return (
                                  <tr
                                    key={cycle.id}
                                    onClick={() => setSelectedCycleForAudit(cycle.cycleId)}
                                    className="hover:bg-zinc-50/80 transition-colors cursor-pointer"
                                  >
                                    <td className="py-3.5 pl-4 pr-3 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                            isSettled
                                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                              : "border-amber-200 bg-amber-50 text-amber-800"
                                          }`}
                                        >
                                          {isSettled ? "Settled" : "Accruing"}
                                        </span>
                                        <span className="font-bold text-zinc-950 tabular-nums">
                                          {formatDateMonthOnly(cycle.period)}
                                        </span>
                                      </div>
                                      <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 tabular-nums">
                                        <span>
                                          {cycle.utr
                                            ? `UTR: ${cycle.utr}`
                                            : `${cycle.orderCount} orders · Pending payout`}
                                        </span>
                                        {cycle.utr ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              copyToClipboard(cycle.utr || "", "UTR");
                                            }}
                                            className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.2 text-[9.5px] font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                                          >
                                            Copy
                                          </button>
                                        ) : null}
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-3 font-semibold text-zinc-800 tabular-nums whitespace-nowrap">
                                      {formatDateMonthOnly(cycle.date)}
                                    </td>

                                    <td className="py-3.5 px-3 text-right tabular-nums whitespace-nowrap">
                                      <div className="font-semibold text-zinc-900">
                                        {inr(cycle.grossAmount)}
                                      </div>
                                      <div className="text-[10.5px] font-medium text-rose-600">
                                        -{inr(dedTotal)}
                                      </div>
                                    </td>

                                    <td
                                      className={`py-3.5 px-3 text-right font-bold tabular-nums whitespace-nowrap ${
                                        isSettled ? "text-emerald-700" : "text-zinc-950"
                                      }`}
                                    >
                                      {inr(cycle.netCredit)}
                                    </td>

                                    <td
                                      className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="inline-flex items-center gap-1.5">
                                        {isSettled ? (
                                          <>
                                            <button
                                              type="button"
                                              disabled={downloadingId === `pdf-${cycle.cycleId}`}
                                              onClick={() => handleDownloadCyclePdf(cycle.cycleId)}
                                              className="rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 cursor-pointer"
                                            >
                                              PDF
                                            </button>
                                            <button
                                              type="button"
                                              disabled={downloadingId === `csv-${cycle.cycleId}`}
                                              onClick={() => handleDownloadCycleExcel(cycle.cycleId)}
                                              className="rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 cursor-pointer"
                                            >
                                              CSV
                                            </button>
                                          </>
                                        ) : null}
                                        <button
                                          type="button"
                                          onClick={() => setSelectedCycleForAudit(cycle.cycleId)}
                                          className="rounded-lg bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
                                        >
                                          {isSettled ? "Audit →" : "Inspect →"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Individual Orders Ledger (ONLY Order ID — Customer & Product names removed) */
                    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                      <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[580px] text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50/90 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                              <th className="py-3 pl-4 pr-3">Order ID</th>
                              <th className="py-3 px-3">Cycle / UTR</th>
                              <th className="py-3 px-3 text-right">Order Value</th>
                              <th className="py-3 px-3 text-right">Fee &amp; Tax</th>
                              <th className="py-3 px-3 text-right">Net Earned</th>
                              <th className="py-3 pl-3 pr-4 text-right">State</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {filteredOrders.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-10 text-center text-zinc-500">
                                  No order settlements found.
                                </td>
                              </tr>
                            ) : (
                              filteredOrders.map((ord) => {
                                const settled =
                                  ord.isSettled ||
                                  ord.settlementStatus === "PAID" ||
                                  ord.settlementStatus === "SETTLED";
                                const feeTotal =
                                  (ord.commission || 0) +
                                  (ord.gstOnCommission || 0) +
                                  (ord.tcsGst || 0);
                                return (
                                  <tr key={ord.orderId} className="hover:bg-zinc-50/70">
                                    <td className="py-3.5 pl-4 pr-3 whitespace-nowrap">
                                      <div className="font-bold text-zinc-950 tabular-nums">
                                        #{ord.orderCode}
                                      </div>
                                      <div className="text-[11px] text-zinc-500 tabular-nums">
                                        {ord.date}
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-3 text-[11px] font-medium text-zinc-500 whitespace-nowrap tabular-nums">
                                      {ord.utr
                                        ? `UTR ${ord.utr}`
                                        : formatDateMonthOnly(ord.cyclePeriod || "Current")}
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-medium text-zinc-800 tabular-nums whitespace-nowrap">
                                      {inr(ord.grossValue)}
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-medium text-rose-600 tabular-nums whitespace-nowrap">
                                      -{inr(feeTotal)}
                                    </td>
                                    <td
                                      className={`py-3.5 px-3 text-right font-bold tabular-nums whitespace-nowrap ${
                                        settled ? "text-emerald-700" : "text-zinc-950"
                                      }`}
                                    >
                                      {inr(ord.netEarning)}
                                    </td>
                                    <td className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap">
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                          settled
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-amber-200 bg-amber-50 text-amber-800"
                                        }`}
                                      >
                                        {settled ? "Settled" : "Accruing"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* VIEW 2: CASHFLOW & MARGIN TRENDS */}
              {activeSubTab === "trends" ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <section className="lg:col-span-8 rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-zinc-950">Daily Payout Trajectory</h2>
                        <p className="text-[11px] font-medium text-zinc-500 mt-0.5 tabular-nums">
                          {hoveredDayIdx !== null && chartPoints[hoveredDayIdx]
                            ? `${chartPoints[hoveredDayIdx]!.item.label}: Net ${inr(
                                chartPoints[hoveredDayIdx]!.item.netPayout
                              )} (${chartPoints[hoveredDayIdx]!.item.orderCount} orders)`
                            : "Net store credits across recent settlement days"}
                        </p>
                      </div>
                    </div>

                    {chartPoints.length > 0 ? (
                      <>
                        <svg
                          viewBox="0 0 620 165"
                          className="w-full h-44 overflow-visible"
                          onMouseLeave={() => setHoveredDayIdx(null)}
                        >
                          <defs>
                            <linearGradient id="payoutAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#059669" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {[20, 82, 143].map((yPos) => (
                            <line
                              key={yPos}
                              x1="20"
                              y1={yPos}
                              x2="600"
                              y2={yPos}
                              stroke="#E4E4E7"
                              strokeDasharray="3 4"
                            />
                          ))}
                          {areaPath ? <path d={areaPath} fill="url(#payoutAreaGrad)" /> : null}
                          {linePath ? (
                            <path
                              d={linePath}
                              fill="none"
                              stroke="#059669"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                            />
                          ) : null}
                          {chartPoints.map((pt, idx) => (
                            <g key={idx}>
                              <rect
                                x={pt.x - 16}
                                y={0}
                                width={32}
                                height={165}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredDayIdx(idx)}
                              />
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={hoveredDayIdx === idx ? 5 : 3}
                                fill="#059669"
                                stroke="#fff"
                                strokeWidth="1.5"
                              />
                            </g>
                          ))}
                        </svg>
                        <div className="flex justify-between px-2 text-[10px] font-semibold text-zinc-400 tabular-nums">
                          {dailyTrend.map((d, i) => (
                            <span key={i}>{d.label}</span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="py-12 text-center text-xs text-zinc-500">
                        Daily trend curve will populate once order payouts record.
                      </div>
                    )}
                  </section>

                  <section className="lg:col-span-4 rounded-2xl border border-zinc-200 bg-white p-5 space-y-5">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-950">Take-Home Margin Split</h2>
                      <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                        Net store retention per ₹100 billed
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span>Net Store Payout</span>
                        <span className="text-emerald-700 tabular-nums">{takeHomePct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${takeHomePct}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Platform Commission</span>
                        <span className="tabular-nums">{commissionPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-zinc-900"
                          style={{ width: `${commissionPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Statutory TCS / TDS 194O</span>
                        <span className="tabular-nums">{tcsPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-zinc-400"
                          style={{ width: `${tcsPct}%` }}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              ) : null}

              {/* VIEW 3: GST & TAX INVOICES */}
              {activeSubTab === "invoices" ? (
                <div className="space-y-4">
                  {/* Monthly Platform Commission GST Invoices */}
                  <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-100">
                      <h2 className="text-sm font-bold text-zinc-950">
                        Monthly Commission GST Invoices
                      </h2>
                      <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                        Platform commission &amp; 18% GST input credit statements
                      </p>
                    </div>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-50/80 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            <th className="py-3 pl-4 pr-3">Invoice No.</th>
                            <th className="py-3 px-3">Month</th>
                            <th className="py-3 px-3 text-right">Fee Amount</th>
                            <th className="py-3 px-3 text-right">GST</th>
                            <th className="py-3 pl-3 pr-4 text-right">Download</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {invoices.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-zinc-500">
                                Monthly GST commission invoices will appear here.
                              </td>
                            </tr>
                          ) : (
                            invoices.map((inv) => (
                              <tr key={inv.invoiceNumber} className="hover:bg-zinc-50/70">
                                <td className="py-3 pl-4 pr-3 font-bold text-zinc-950 tabular-nums whitespace-nowrap">
                                  {inv.invoiceNumber}
                                </td>
                                <td className="py-3 px-3 text-zinc-700 whitespace-nowrap">
                                  {inv.period}
                                </td>
                                <td className="py-3 px-3 text-right font-medium text-zinc-900 tabular-nums whitespace-nowrap">
                                  {inr(inv.amount)}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                                  {inr(inv.gstAmount)}
                                </td>
                                <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={downloadingId === `comm-pdf-${inv.invoiceNumber}`}
                                      onClick={() => handleDownloadCommissionPdf(inv)}
                                      className="rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 cursor-pointer"
                                    >
                                      PDF
                                    </button>
                                    <button
                                      type="button"
                                      disabled={downloadingId === `comm-xls-${inv.invoiceNumber}`}
                                      onClick={() => handleDownloadCommissionExcel(inv)}
                                      className="rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 cursor-pointer"
                                    >
                                      Excel
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Order-Wise Tax Invoices (ONLY Invoice No & Order ID — Customer/Product removed) */}
                  <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 sm:px-5 py-3.5 border-b border-zinc-100">
                      <h2 className="text-sm font-bold text-zinc-950">Order-Wise Tax Invoices</h2>
                      <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder=""
                          aria-label="Search order invoices"
                          className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 focus:bg-white pl-8.5 pr-8 text-xs font-semibold text-zinc-950 focus:border-zinc-900 focus:outline-hidden"
                        />
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-800 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left border-collapse text-xs">
                        <tbody className="divide-y divide-zinc-100">
                          {filteredOrderInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-8 text-center text-zinc-500">
                                No order invoices matched.
                              </td>
                            </tr>
                          ) : (
                            filteredOrderInvoices.map((inv) => (
                              <tr key={inv.invoiceNumber} className="hover:bg-zinc-50/70">
                                <td className="py-3 pl-4 pr-3 whitespace-nowrap">
                                  <div className="font-bold text-zinc-950 tabular-nums">
                                    {inv.invoiceNumber}
                                  </div>
                                  {inv.orderNumber ? (
                                    <div className="text-[11px] text-zinc-500 tabular-nums">
                                      Order #{inv.orderNumber}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-zinc-950 tabular-nums whitespace-nowrap">
                                  {inr(inv.amount)}
                                </td>
                                <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    disabled={downloadingId === inv.invoiceNumber}
                                    onClick={() => handleDownloadOrderInvoicePdf(inv)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                                  >
                                    <Download className="size-3" />
                                    {downloadingId === inv.invoiceNumber ? "Loading..." : "PDF"}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
      <Toaster />
    </PartnerLayout>
  );
}
