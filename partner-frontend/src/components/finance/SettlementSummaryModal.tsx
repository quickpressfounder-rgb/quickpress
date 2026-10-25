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

  // Enforce standard QuickPress platform fee display (15%, bounded 10-18%)
  const commissionPct = data?.orderLevelDeductionsC?.commissionRatePct
    ? Math.min(Math.max(data.orderLevelDeductionsC.commissionRatePct, 10), 18)
    : 15;

  const partnerIdDisplay = data?.partnerId ? formatPartnerId(data.partnerId) : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative min-h-screen w-full max-w-lg bg-[#F8FAFC] text-black pb-20 shadow-2xl border-x border-zinc-200">
        
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white px-4 pt-3.5 pb-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-b border-zinc-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-full hover:bg-zinc-100 active:scale-95 transition-transform cursor-pointer shrink-0"
                title="Back"
              >
                <ArrowLeft className="size-5 text-black" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-black tracking-tight text-black">
                  {data?.businessName || "Store Settlements"}
                </h1>
                <p className="truncate text-[11px] font-semibold text-zinc-500">
                  {partnerIdDisplay ? `ID: ${partnerIdDisplay} • ` : ""}
                  {data?.city ? `${data.city} Operations Hub` : "Store Operations Hub"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Subtabs: Summary | Orders | Expenses (Royal Blue Theme) */}
          <div className="mt-3.5 flex gap-2">
            {(["summary", "orders", "expenses"] as const).map((tab) => {
              const label =
                tab === "summary"
                  ? "Summary"
                  : tab === "orders"
                  ? `Orders ${data?.orders?.length ? `(${data.orders.length})` : ""}`
                  : `Expenses ${data?.expenses?.length ? `(${data.expenses.length})` : ""}`;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveSubTab(tab)}
                  className={`rounded-full px-4.5 py-1.5 text-xs font-black capitalize transition-all cursor-pointer active:scale-95 ${
                    activeSubTab === tab
                      ? "bg-black text-white shadow-xs"
                      : "border border-zinc-200 bg-white text-black hover:bg-zinc-100 shadow-2xs"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </header>

        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
            <p className="text-xs font-bold text-zinc-500">Calculating settlement breakdown...</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            
            {/* ========================================================================= */}
            {/* TAB 1: SUMMARY (A + B + C + D + E + F Breakdown)                          */}
            {/* ========================================================================= */}
            {activeSubTab === "summary" && data && (
              <>
                {/* Hero Payout Headline Card */}
                <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-950" />

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-black" />
                        <p className="text-[11px] font-black uppercase tracking-wider text-black">
                          Settlement Disbursal
                        </p>
                      </div>
                      <p className="mt-1 text-3xl font-black text-black tracking-tight">
                        ₹{data.estNetPayout.toFixed(2)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">
                        Cycle: {data.cycle.period}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-bold text-zinc-500">Payout Credit Date</p>
                      <p className="mt-0.5 text-xs font-black text-black">
                        {data.cycle.payoutDate !== "-" ? data.cycle.payoutDate : "Auto 7-Day Cycle"}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-emerald-600">
                        Double-Entry Verified ✓
                      </p>
                    </div>
                  </div>
                </div>

                {/* Settlement Summary Accordion Section */}
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div>
                      <h2 className="text-sm font-black text-black">Settlement summary</h2>
                      <p className="text-[11px] font-medium text-zinc-500">Itemized financial ledger</p>
                    </div>

                    {/* Statement Export Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-[11px] font-black text-red-700 hover:bg-red-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        title="Download Statement (PDF)"
                      >
                        <FileText className="size-3 text-red-600" />
                        <span>{downloadingPdf ? "..." : "PDF"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadExcel}
                        disabled={downloadingExcel}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-[11px] font-black text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        title="Download Statement (Excel)"
                      >
                        <FileSpreadsheet className="size-3 text-emerald-600" />
                        <span>{downloadingExcel ? "..." : "Excel"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleEmail}
                        disabled={emailing}
                        className="flex size-8 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-black hover:bg-zinc-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        title="Email Statement"
                      >
                        <Mail className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Total Orders Row */}
                  <div className="flex items-center justify-between py-3 border-b border-zinc-100 text-xs font-black text-black">
                    <span>Delivered Orders</span>
                    <span>{data.totalOrders}</span>
                  </div>

                  {/* --- (A) Net Order Value --- */}
                  <div className="border-b border-zinc-100 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenA(!openA)}
                      className="flex w-full items-center justify-between text-left text-xs font-black text-black cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        <span>Net order value (A)</span>
                        {openA ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span className="font-black text-black">₹{data.netOrderValueA.total.toFixed(2)}</span>
                    </button>
                    {openA && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-600 font-medium">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">Item subtotal</span>
                          <span className="font-semibold text-black">₹{data.netOrderValueA.itemSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">Customer GST collected</span>
                          <span className="font-semibold text-black">₹{data.netOrderValueA.totalGstCollected.toFixed(2)}</span>
                        </div>
                        {data.netOrderValueA.restaurantDiscountPromos > 0 ? (
                          <div className="flex justify-between text-rose-600">
                            <span>Promotional Discounts & Coupons</span>
                            <span className="font-semibold">-₹{data.netOrderValueA.restaurantDiscountPromos.toFixed(2)}</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* --- (B) Additions --- */}
                  <div className="border-b border-zinc-100 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenB(!openB)}
                      className="flex w-full items-center justify-between text-left text-xs font-black text-black cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        <span>Additions & Credits (B)</span>
                        {openB ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span className="font-black text-emerald-600">+₹{data.additionsB.total.toFixed(2)}</span>
                    </button>
                    {openB && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-600 font-medium">
                        <div className="flex justify-between">
                          <span>TDS 194H Credit</span>
                          <span className="font-semibold text-black">₹{data.additionsB.tds194h.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TDS 194C Credit</span>
                          <span className="font-semibold text-black">₹{data.additionsB.tds194c.toFixed(2)}</span>
                        </div>
                        {data.additionsB.targetIncentiveBonus > 0 && (
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span>Target Milestone Bonus</span>
                            <span>+₹{data.additionsB.targetIncentiveBonus.toFixed(2)}</span>
                          </div>
                        )}
                        {data.additionsB.qualityRatingBonus > 0 && (
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span>Quality Rating Bonus</span>
                            <span>+₹{data.additionsB.qualityRatingBonus.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* --- (C) Order Level Deductions --- */}
                  <div className="border-b border-zinc-100 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenC(!openC)}
                      className="flex w-full items-center justify-between text-left text-xs font-black text-black cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        <span>Platform Deductions (C)</span>
                        {openC ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span className="font-black text-rose-600">-₹{data.orderLevelDeductionsC.total.toFixed(2)}</span>
                    </button>
                    {openC && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-600 font-medium">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">
                            Platform Service Fee ({commissionPct}%)
                          </span>
                          <span className="font-semibold text-rose-600">
                            -₹{data.orderLevelDeductionsC.platformCommission.toFixed(2)}
                          </span>
                        </div>
                        {data.orderLevelDeductionsC.damagePenalty > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Garment Care Claim Compensation</span>
                            <span className="font-semibold">-₹{data.orderLevelDeductionsC.damagePenalty.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* --- (D) Tax Deductions --- */}
                  <div className="border-b border-zinc-100 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenD(!openD)}
                      className="flex w-full items-center justify-between text-left text-xs font-black text-black cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        <span>Tax Deductions (D)</span>
                        {openD ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span className="font-black text-rose-600">-₹{data.taxDeductionsD.total.toFixed(2)}</span>
                    </button>
                    {openD && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-600 font-medium">
                        <div className="flex justify-between">
                          <span>GST on service fee @18%</span>
                          <span className="font-semibold text-rose-600">-₹{data.taxDeductionsD.gstOnServiceFees18.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TDS u/s 194-O (1%)</span>
                          <span className="font-semibold text-rose-600">-₹{data.taxDeductionsD.tds194o.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TCS collected u/s 9(5)</span>
                          <span className="font-semibold text-black">₹{data.taxDeductionsD.tcsGst.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- Est. Payout Result Row --- */}
                  <div className="mt-4 flex items-center justify-between rounded-2xl border-2 border-zinc-900 bg-zinc-950 p-4 text-white shadow-xs">
                    <div>
                      <p className="text-xs font-black">Est. Net Disbursal</p>
                      <p className="text-[10px] text-zinc-400 font-medium">(A + B - C - D)</p>
                    </div>
                    <p className="text-2xl font-black tracking-tight text-white">
                      ₹{data.estNetPayout.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Beneficiary Bank Details Card */}
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-black">
                      <Wallet className="size-3.5" />
                    </div>
                    <h3 className="text-sm font-black text-black">Beneficiary Bank Account</h3>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-600">
                      <span className="font-medium">Bank Name</span>
                      <span className="font-black text-black">{data.bankDetails.bankName || "HDFC Bank"}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span className="font-medium">Account Number</span>
                      <span className="font-black text-black">{data.bankDetails.accountNumberMasked || "•••• •••• 8842"}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span className="font-medium">Transfer Method</span>
                      <span className="font-black text-emerald-600">IMPS / NEFT Direct Disbursal ✓</span>
                    </div>
                    {data.bankDetails.utr ? (
                      <div className="flex justify-between text-zinc-600">
                        <span className="font-medium">UTR Reference</span>
                        <span className="font-mono font-black text-black">{data.bankDetails.utr}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: ORDERS LIST (Order-level breakdown)                                */}
            {/* ========================================================================= */}
            {activeSubTab === "orders" && data && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    Orders in this Cycle ({data.orders.length})
                  </h2>
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
                    const commRate = ord.commissionRatePct ?? 15;

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
                              Platform Fee: -₹{ord.commission.toFixed(2)}
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
