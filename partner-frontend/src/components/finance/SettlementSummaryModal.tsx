import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  type SettlementBreakdown,
  downloadSettlementPdfBlob,
  downloadSettlementExcelBlob,
  emailSettlementReport,
  fetchSettlementBreakdown,
} from "@/api/partner/partner-finance-api";
import { formatPartnerId } from "@/lib/format-ids";

interface SettlementSummaryModalProps {
  cycleId: string;
  onClose: () => void;
}

export function SettlementSummaryModal({ cycleId, onClose }: SettlementSummaryModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"summary" | "orders" | "expenses">("summary");
  const [data, setData] = useState<SettlementBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Accordion open/close states
  const [openA, setOpenA] = useState(true);
  const [openB, setOpenB] = useState(false);
  const [openC, setOpenC] = useState(true);
  const [openD, setOpenD] = useState(true);
  const [openE, setOpenE] = useState(false);
  const [openF, setOpenF] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchSettlementBreakdown(cycleId)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        toast.error("Failed to load settlement details");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cycleId]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadSettlementPdfBlob(cycleId);
      toast.success("Settlement statement PDF downloaded successfully!");
    } catch {
      toast.error("Failed to download settlement statement PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      await downloadSettlementExcelBlob(cycleId);
      toast.success("Settlement statement Excel/CSV downloaded successfully!");
    } catch {
      toast.error("Failed to download settlement statement Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleEmail = async () => {
    setEmailing(true);
    try {
      const res = await emailSettlementReport(cycleId);
      toast.success(res.message || "Statement sent to registered email!");
    } catch {
      toast.error("Failed to email settlement statement");
    } finally {
      setEmailing(false);
    }
  };

  const commissionPct = data?.orderLevelDeductionsC?.commissionRatePct
    ? Math.min(Math.max(data.orderLevelDeductionsC.commissionRatePct, 5), 50)
    : 15;

  const partnerIdDisplay = data?.partnerId ? formatPartnerId(data.partnerId) : "";

  return (
    <div className="w-full bg-white text-zinc-950 pb-28">
      <div className="mx-auto max-w-4xl px-4 py-4 md:py-6 space-y-6">
        
        {/* Top Navigation & Breadcrumb Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 hover:bg-zinc-200 active:scale-95 transition-transform cursor-pointer shrink-0"
              title="Back to Overview"
            >
              <ArrowLeft className="size-4 text-black" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-black truncate">
                  Settlement Breakdown — {data?.cycle.period || "Weekly Cycle"}
                </h1>
                <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-800">
                  {data?.cycle.status || "PROCESSING"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                {partnerIdDisplay ? `ID: ${partnerIdDisplay} • ` : ""}
                {data?.businessName || "Store Partner"} • Double-Entry Ledger Reconciled
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Download PDF Statement"
            >
              <FileText className="size-3.5 text-red-600" />
              <span>{downloadingPdf ? "Exporting..." : "PDF"}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Download Excel Statement"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>{downloadingExcel ? "Exporting..." : "Excel"}</span>
            </button>
            <button
              type="button"
              onClick={handleEmail}
              disabled={emailing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Email Statement"
            >
              <Mail className="size-3.5 text-zinc-600" />
              <span>{emailing ? "Sending..." : "Email"}</span>
            </button>
          </div>
        </header>

        {/* Subtabs: Summary | Orders | Expenses */}
        <div className="flex gap-2">
          {(["summary", "orders", "expenses"] as const).map((tab) => {
            const label =
              tab === "summary"
                ? "Financial Summary"
                : tab === "orders"
                ? `Delivered Orders ${data?.orders?.length ? `(${data.orders.length})` : ""}`
                : `Deductions & Expenses ${data?.expenses?.length ? `(${data.expenses.length})` : ""}`;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSubTab(tab)}
                className={`rounded-full px-5 py-2 text-xs font-black capitalize transition-all cursor-pointer active:scale-95 ${
                  activeSubTab === tab
                    ? "bg-black text-white shadow-xs"
                    : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 shadow-2xs"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
            <p className="text-xs font-bold text-zinc-500">Calculating settlement breakdown from live database...</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* ========================================================================= */}
            {/* TAB 1: SUMMARY (A + B + C + D + E + F Breakdown)                          */}
            {/* ========================================================================= */}
            {activeSubTab === "summary" && data && (
              <div className="space-y-4">
                {/* Hero Payout Headline Card */}
                <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 md:p-6 shadow-xs">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-950" />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-4 text-black" />
                        <p className="text-xs font-black uppercase tracking-wider text-black">
                          Settlement Net Disbursal
                        </p>
                      </div>
                      <p className="mt-1 text-3xl md:text-4xl font-black text-black tracking-tight">
                        ₹{data.estNetPayout.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">
                        Cycle Period: {data.cycle.period} • {data.totalOrders} Delivered Orders
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xs font-bold text-zinc-500">Scheduled Payout Date</p>
                      <p className="mt-0.5 text-sm font-black text-black">
                        {data.cycle.payoutDate !== "-" ? data.cycle.payoutDate : "Automatic 7-Day Cycle"}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-emerald-600">
                        Direct Bank Disbursal ✓
                      </p>
                    </div>
                  </div>
                </div>

                {/* Settlement Summary Accordion Section */}
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 md:p-6 shadow-xs">
                  <div className="pb-3 border-b border-zinc-100">
                    <h2 className="text-sm md:text-base font-black text-black">Settlement Ledger & Tax Breakdown</h2>
                    <p className="text-xs font-medium text-zinc-500">
                      Standard double-entry accounting reconciliation for GST and e-commerce compliance
                    </p>
                  </div>

                  <div className="mt-4 divide-y divide-zinc-100">
                    {/* (A) Net Order Value */}
                    <div className="py-3.5">
                      <div
                        onClick={() => setOpenA(!openA)}
                        className="flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-black">Net order value (A)</span>
                          {openA ? (
                            <ChevronUp className="size-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="size-4 text-zinc-400" />
                          )}
                        </div>
                        <span className="text-sm font-black text-black">
                          ₹{data.netOrderValueA.total.toFixed(2)}
                        </span>
                      </div>
                      {openA && (
                        <div className="mt-3 pl-4 space-y-2 text-xs border-l-2 border-zinc-200">
                          <div className="flex justify-between text-zinc-600">
                            <span>Item subtotal (Gross customer booking)</span>
                            <span className="font-bold text-black">
                              ₹{data.netOrderValueA.itemSubtotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>Customer GST collected (Laundry 5%)</span>
                            <span className="font-bold text-black">
                              ₹{data.netOrderValueA.totalGstCollected.toFixed(2)}
                            </span>
                          </div>
                          {data.netOrderValueA.restaurantDiscountPromos > 0 && (
                            <div className="flex justify-between text-zinc-600">
                              <span>Partner discounts / promos absorbed</span>
                              <span className="font-bold text-rose-600">
                                -₹{data.netOrderValueA.restaurantDiscountPromos.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* (B) Additions & Credits */}
                    <div className="py-3.5">
                      <div
                        onClick={() => setOpenB(!openB)}
                        className="flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-black">Additions & Credits (B)</span>
                          {openB ? (
                            <ChevronUp className="size-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="size-4 text-zinc-400" />
                          )}
                        </div>
                        <span className="text-sm font-black text-emerald-600">
                          +₹{data.additionsB.total.toFixed(2)}
                        </span>
                      </div>
                      {openB && (
                        <div className="mt-3 pl-4 space-y-2 text-xs border-l-2 border-emerald-200">
                          <div className="flex justify-between text-zinc-600">
                            <span>Volume target milestone incentive</span>
                            <span className="font-bold text-black">
                              ₹{data.additionsB.targetIncentiveBonus.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>Store 5-star quality rating bonus</span>
                            <span className="font-bold text-black">
                              ₹{data.additionsB.qualityRatingBonus.toFixed(2)}
                            </span>
                          </div>
                          {Boolean((data.additionsB as any)?.referralBonus) && (
                            <div className="flex justify-between text-zinc-600">
                              <span>Referral milestone reward (Partner Invites)</span>
                              <span className="font-bold text-emerald-700">
                                +₹{Number((data.additionsB as any).referralBonus || 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* (C) Platform Deductions */}
                    <div className="py-3.5">
                      <div
                        onClick={() => setOpenC(!openC)}
                        className="flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-black">Platform Deductions (C)</span>
                          {openC ? (
                            <ChevronUp className="size-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="size-4 text-zinc-400" />
                          )}
                        </div>
                        <span className="text-sm font-black text-rose-600">
                          -₹{data.orderLevelDeductionsC.total.toFixed(2)}
                        </span>
                      </div>
                      {openC && (
                        <div className="mt-3 pl-4 space-y-2 text-xs border-l-2 border-rose-200">
                          <div className="flex justify-between text-zinc-600">
                            <span>Platform Service Fee ({commissionPct}%)</span>
                            <span className="font-bold text-rose-600">
                              -₹{data.orderLevelDeductionsC.platformCommission.toFixed(2)}
                            </span>
                          </div>
                          {data.orderLevelDeductionsC.damagePenalty > 0 && (
                            <div className="flex justify-between text-zinc-600">
                              <span>Customer damage claim settlement</span>
                              <span className="font-bold text-rose-600">
                                -₹{data.orderLevelDeductionsC.damagePenalty.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {data.orderLevelDeductionsC.cancellationFee > 0 && (
                            <div className="flex justify-between text-zinc-600">
                              <span>Order cancellation fee</span>
                              <span className="font-bold text-rose-600">
                                -₹{data.orderLevelDeductionsC.cancellationFee.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* (D) Tax Deductions */}
                    <div className="py-3.5">
                      <div
                        onClick={() => setOpenD(!openD)}
                        className="flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-black">Tax Deductions (D)</span>
                          {openD ? (
                            <ChevronUp className="size-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="size-4 text-zinc-400" />
                          )}
                        </div>
                        <span className="text-sm font-black text-rose-600">
                          -₹{data.taxDeductionsD.total.toFixed(2)}
                        </span>
                      </div>
                      {openD && (
                        <div className="mt-3 pl-4 space-y-2 text-xs border-l-2 border-zinc-300">
                          <div className="flex justify-between text-zinc-600">
                            <span>GST on service fee @18% (ITC Claimable)</span>
                            <span className="font-bold text-rose-600">
                              -₹{data.taxDeductionsD.gstOnServiceFees18.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>TDS u/s 194-O (1% Income Tax Credit)</span>
                            <span className="font-bold text-rose-600">
                              -₹{data.taxDeductionsD.tds194o.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-600">
                            <span>TCS collected u/s 9(5) (1% GST TCS Credit)</span>
                            <span className="font-bold text-black">
                              ₹{data.taxDeductionsD.tcsGst.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Net Disbursal Footer Box */}
                  <div className="mt-5 rounded-2xl bg-black p-4.5 text-white flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-zinc-300">
                        Total Net Disbursal
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium">(A + B - C - D)</p>
                    </div>
                    <p className="text-2xl font-black tracking-tight text-white">
                      ₹{data.estNetPayout.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: ORDERS LIST (Order-level breakdown)                                */}
            {/* ========================================================================= */}
            {activeSubTab === "orders" && data && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    Delivered Orders in this Cycle ({data.orders.length})
                  </h2>
                  <p className="text-[11px] text-zinc-400">Click any order for full ledger breakdown</p>
                </div>

                {data.orders.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-xs font-bold text-zinc-400">
                    No delivered orders settled in this cycle yet.
                  </div>
                ) : (
                  data.orders.map((ord) => {
                    const isExpanded = expandedOrderId === ord.orderId;
                    const gstOnComm = ord.gstOnCommission ?? Math.round(ord.commission * 0.18 * 100) / 100;
                    const tcsTax = ord.tcsGst ?? Math.round(ord.grossValue * 0.01 * 100) / 100;
                    const commRate = ord.commissionRatePct ?? commissionPct;

                    return (
                      <div
                        key={ord.orderId}
                        className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-2xs transition-all"
                      >
                        {/* Order Header Row (Clickable Accordion) */}
                        <div
                          onClick={() => setExpandedOrderId(isExpanded ? null : ord.orderId)}
                          className="flex items-start justify-between p-4 cursor-pointer hover:bg-zinc-50/70 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-black">#{ord.orderCode}</span>
                              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                                {ord.status}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-semibold">
                                {isExpanded ? "Tap to collapse" : "Tap for full detail"}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] font-medium text-zinc-500">
                              {ord.customerName} • {ord.date}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs font-black text-emerald-700">
                                +₹{ord.netEarning.toFixed(2)}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-semibold">
                                Gross: ₹{ord.grossValue.toFixed(2)}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="size-4 text-zinc-600 shrink-0" />
                            ) : (
                              <ChevronDown className="size-4 text-zinc-400 shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* Summary Pill */}
                        <div className="px-4 pb-3">
                          <div className="rounded-xl bg-zinc-50 p-2.5 text-[11px] text-zinc-600 flex justify-between items-center border border-zinc-100">
                            <span className="truncate pr-2 font-medium">{ord.itemsSummary}</span>
                            <span className="text-rose-600 font-bold shrink-0">
                              Platform Fee ({commRate}%): -₹{ord.commission.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Itemized Financial Breakdown */}
                        {isExpanded && (
                          <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 space-y-3 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                              <p className="text-[11px] font-black uppercase tracking-wider text-zinc-900">
                                Order Payout Breakdown (Double-Entry Ledger)
                              </p>
                              <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[9px] font-black text-zinc-700">
                                Exact Reconciliation
                              </span>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              {/* 1. Gross Order Amount */}
                              <div className="flex justify-between items-center text-zinc-700">
                                <span className="font-semibold">Gross Order Subtotal (Items)</span>
                                <span className="font-black text-zinc-950">₹{ord.grossValue.toFixed(2)}</span>
                              </div>

                              {/* 2. Platform Commission */}
                              <div className="flex justify-between items-center text-zinc-700">
                                <span className="font-semibold">
                                  QuickPress Commission ({commRate}%)
                                </span>
                                <span className="font-black text-rose-600">-₹{ord.commission.toFixed(2)}</span>
                              </div>

                              {/* 3. 18% GST on Commission */}
                              <div className="flex justify-between items-center text-zinc-700">
                                <div>
                                  <span className="font-semibold">18% GST on Commission</span>
                                  <p className="text-[10px] text-zinc-400">100% Input Tax Credit (ITC) claimable</p>
                                </div>
                                <span className="font-black text-rose-600">-₹{gstOnComm.toFixed(2)}</span>
                              </div>

                              {/* 4. Statutory 1% TCS / TDS */}
                              <div className="flex justify-between items-center text-zinc-700">
                                <div>
                                  <span className="font-semibold">1% TCS / TDS (Sec 194-O)</span>
                                  <p className="text-[10px] text-zinc-400">Govt tax credit against Store PAN</p>
                                </div>
                                <span className="font-black text-rose-600">-₹{tcsTax.toFixed(2)}</span>
                              </div>

                              {/* Net Store Payout */}
                              <div className="flex justify-between items-center pt-2 border-t border-zinc-200 text-sm">
                                <div>
                                  <span className="font-black text-emerald-800">Net Store Payout</span>
                                  <p className="text-[10px] font-semibold text-emerald-600">
                                    Directly Credited to Store Bank A/C
                                  </p>
                                </div>
                                <span className="text-base font-black text-emerald-700">
                                  ₹{ord.netEarning.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Settlement Transfer Metadata */}
                            <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-1.5 text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-zinc-500 font-medium">Disbursal Schedule:</span>
                                <span className="font-black text-zinc-900">Automatic 7-Day Weekly Cycle</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500 font-medium">Transfer Method:</span>
                                <span className="font-black text-emerald-600">IMPS / NEFT Direct Disbursal ✓</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-500 font-medium">Settlement Status:</span>
                                <span className="font-black text-zinc-900">
                                  {ord.isSettled ? "Settled to Bank A/C ✓" : "Cycle Accruing · Bank Transfer Scheduled"}
                                </span>
                              </div>
                              {ord.utr && (
                                <div className="flex justify-between">
                                  <span className="text-zinc-500 font-medium">UTR Reference:</span>
                                  <span className="font-mono font-black text-zinc-900">{ord.utr}</span>
                                </div>
                              )}
                            </div>

                            {/* Link to Order Slip */}
                            <div className="pt-1 flex justify-end">
                              <a
                                href={`/orders/${ord.orderId}`}
                                className="inline-flex items-center gap-1 text-xs font-black text-black hover:underline"
                              >
                                <span>Open Full Order Slip</span>
                                <ExternalLink className="size-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: EXPENSES LIST                                                      */}
            {/* ========================================================================= */}
            {activeSubTab === "expenses" && data && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    Cycle Deductions & Expenses ({data.expenses.length})
                  </h2>
                </div>

                {data.expenses.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-xs font-bold text-zinc-400">
                    No packaging or additional fee deductions recorded in this cycle.
                  </div>
                ) : (
                  data.expenses.map((exp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs"
                    >
                      <div>
                        <p className="text-xs font-black text-black">{exp.title}</p>
                        <p className="text-[10px] text-zinc-500">{exp.category} • {exp.date}</p>
                      </div>
                      <p className="text-xs font-black text-rose-600">-₹{exp.amount.toFixed(2)}</p>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
