import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Mail,
  Package,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
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

  // Accordion open/close states
  const [openA, setOpenA] = useState(true);
  const [openB, setOpenB] = useState(true);
  const [openC, setOpenC] = useState(true);
  const [openD, setOpenD] = useState(true);
  const [openE, setOpenE] = useState(true);
  const [openF, setOpenF] = useState(true);

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

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative min-h-screen w-full max-w-lg bg-[#F4F5F7] text-zinc-900 pb-20 shadow-2xl">
        
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white px-4 pt-3.5 pb-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full hover:bg-zinc-100 active:scale-95 transition-transform"
            >
              <ArrowLeft className="size-5 text-zinc-800" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black tracking-tight text-zinc-900">
                {data?.businessName || "QuickPress Laundry Store"}
              </h1>
              <p className="truncate text-[11px] font-semibold text-zinc-500">
                ID: {formatPartnerId(data?.partnerId)} • {data?.city || "Kasganj Locality"}, {data?.city || "Kasganj"}
              </p>
            </div>
          </div>

          {/* Subtabs: Summary | Orders | Expenses */}
          <div className="mt-3.5 flex gap-2">
            {(["summary", "orders", "expenses"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSubTab(tab)}
                className={`rounded-full px-5 py-1.5 text-xs font-black capitalize transition-all active:scale-95 ${
                  activeSubTab === tab
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="flex h-96 flex-col items-center justify-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs font-bold text-zinc-500">Calculating financial settlement...</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            
            {/* ========================================================================= */}
            {/* TAB 1: SUMMARY (A + B + C + D + E + F Breakdown)                          */}
            {/* ========================================================================= */}
            {activeSubTab === "summary" && data && (
              <>
                {/* Top Payout Headline Card */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-zinc-500">Est. Payout</p>
                      <p className="mt-0.5 text-2xl font-black text-zinc-900">
                        ₹{data.estNetPayout.toFixed(2)}
                      </p>
                      <p className="text-[10px] font-medium text-zinc-400">
                        from {data.cycle.period}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-zinc-500">Payout for</p>
                      <p className="mt-0.5 text-xs font-black text-zinc-900">{data.cycle.period}</p>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-dashed border-zinc-200 pt-2.5">
                    <p className="text-[11px] font-semibold text-zinc-500">
                      Payout date: <span className="font-black text-zinc-800">{data.cycle.payoutDate}</span>
                    </p>
                  </div>
                </div>

                {/* Settlement Summary Accordion Section */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <h2 className="text-sm font-black text-zinc-900">Settlement summary</h2>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-[11px] font-bold text-red-700 hover:bg-red-100 active:scale-95 transition-all"
                        title="Download PDF Statement"
                      >
                        <FileText className="size-3 text-red-600" />
                        <span>{downloadingPdf ? "..." : "PDF"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadExcel}
                        disabled={downloadingExcel}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all"
                        title="Download Excel / CSV Statement"
                      >
                        <FileSpreadsheet className="size-3 text-emerald-600" />
                        <span>{downloadingExcel ? "..." : "Excel"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleEmail}
                        disabled={emailing}
                        className="flex size-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-transform"
                        title="Email Statement"
                      >
                        <Mail className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Total Orders Row */}
                  <div className="flex items-center justify-between py-3 border-b border-zinc-100 text-xs font-black text-zinc-900">
                    <span>Total orders</span>
                    <span>{data.totalOrders}</span>
                  </div>

                  {/* --- (A) Net Order Value --- */}
                  <div className="border-b border-zinc-100 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenA(!openA)}
                      className="flex w-full items-center justify-between text-left text-xs font-black text-zinc-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Net order value (A)</span>
                        {openA ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span>₹{data.netOrderValueA.total.toFixed(2)}</span>
                    </button>
                    {openA && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-500 font-medium">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">Item subtotal <HelpCircle className="size-2.5 text-zinc-400" /></span>
                          <span className="font-semibold text-zinc-700">₹{data.netOrderValueA.itemSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">Total GST collected from customers <HelpCircle className="size-2.5 text-zinc-400" /></span>
                          <span className="font-semibold text-zinc-700">₹{data.netOrderValueA.totalGstCollected.toFixed(2)}</span>
                        </div>
                        {data.netOrderValueA.restaurantDiscountPromos > 0 ? (
                          <div className="flex justify-between text-rose-600">
                            <span className="flex items-center gap-1">Promotional Discounts & Coupons <HelpCircle className="size-2.5 text-zinc-400" /></span>
                            <span className="font-semibold">-₹{data.netOrderValueA.restaurantDiscountPromos.toFixed(2)}</span>
                          </div>
                        ) : null}
                        {data.netOrderValueA.restaurantDiscountFlat > 0 ? (
                          <div className="flex justify-between text-rose-600">
                            <span className="flex items-center gap-1">Store Direct Offers & Credits <HelpCircle className="size-2.5 text-zinc-400" /></span>
                            <span className="font-semibold">-₹{data.netOrderValueA.restaurantDiscountFlat.toFixed(2)}</span>
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
                      className="flex w-full items-center justify-between text-left text-xs font-black text-zinc-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Additions (B)</span>
                        {openB ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span className="text-emerald-600">₹{data.additionsB.total.toFixed(2)}</span>
                    </button>
                    {openB && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-500 font-medium">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">TDS 194H <HelpCircle className="size-2.5 text-zinc-400" /></span>
                          <span className="font-semibold text-zinc-700">₹{data.additionsB.tds194h.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">TDS 194C <HelpCircle className="size-2.5 text-zinc-400" /></span>
                          <span className="font-semibold text-zinc-700">₹{data.additionsB.tds194c.toFixed(2)}</span>
                        </div>
                        {data.additionsB.targetIncentiveBonus > 0 && (
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span className="flex items-center gap-1">Target Incentive Milestone Bonus</span>
                            <span>+₹{data.additionsB.targetIncentiveBonus.toFixed(2)}</span>
                          </div>
                        )}
                        {data.additionsB.qualityRatingBonus > 0 && (
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span className="flex items-center gap-1">Quality Rating (≥4.5) Bonus</span>
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
                      className="flex w-full items-center justify-between text-left text-xs font-black text-zinc-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Order level deductions (C)</span>
                        {openC ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span className="text-rose-600">-₹{data.orderLevelDeductionsC.total.toFixed(2)}</span>
                    </button>
                    {openC && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-500 font-medium">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">
                            Platform Service Fee ({data.orderLevelDeductionsC.commissionRatePct || 15}%) <HelpCircle className="size-2.5 text-zinc-400" />
                          </span>
                          <span className="font-semibold text-rose-600">-₹{data.orderLevelDeductionsC.platformCommission.toFixed(2)}</span>
                        </div>
                        {data.orderLevelDeductionsC.damagePenalty > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span className="flex items-center gap-1">Garment Care Claim Compensation</span>
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
                      className="flex w-full items-center justify-between text-left text-xs font-black text-zinc-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Tax deductions (D)</span>
                        {openD ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span className="text-rose-600">-₹{data.taxDeductionsD.total.toFixed(2)}</span>
                    </button>
                    {openD && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-500 font-medium">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">GST on service fee @18% <HelpCircle className="size-2.5 text-zinc-400" /></span>
                          <span className="font-semibold text-rose-600">-₹{data.taxDeductionsD.gstOnServiceFees18.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">TDS u/s 194-O (1%) <HelpCircle className="size-2.5 text-zinc-400" /></span>
                          <span className="font-semibold text-rose-600">-₹{data.taxDeductionsD.tds194o.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">TCS collected by QuickPress u/s 9(5) <HelpCircle className="size-2.5 text-zinc-400" /></span>
                          <span className="font-semibold text-zinc-700">₹{data.taxDeductionsD.tcsGst.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- (E) Investments in Growth --- */}
                  <div className="border-b border-zinc-100 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenE(!openE)}
                      className="flex w-full items-center justify-between text-left text-xs font-black text-zinc-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Featured Store & Growth (E)</span>
                        {openE ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span>₹{data.investmentsInGrowthE.total.toFixed(2)}</span>
                    </button>
                    {openE && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-500 font-medium">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">QuickPress Local Store Visibility & Spotlight <HelpCircle className="size-2.5 text-zinc-400" /></span>
                          <span className="font-semibold text-zinc-700">₹{data.investmentsInGrowthE.onlineOrderingAds.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- (F) Supplies Spend --- */}
                  <div className="border-b border-zinc-100 py-3">
                    <button
                      type="button"
                      onClick={() => setOpenF(!openF)}
                      className="flex w-full items-center justify-between text-left text-xs font-black text-zinc-900"
                    >
                      <div className="flex items-center gap-1">
                        <span>Laundry Supplies & Packaging (F)</span>
                        {openF ? <ChevronUp className="size-3.5 text-zinc-400" /> : <ChevronDown className="size-3.5 text-zinc-400" />}
                      </div>
                      <span>₹{data.suppliesSpendF.total.toFixed(2)}</span>
                    </button>
                    {openF && (
                      <div className="mt-2.5 space-y-2 pl-2 text-[11px] text-zinc-500 font-medium">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">Garment Care Covers, Eco Bags & Tag Rolls <HelpCircle className="size-2.5 text-zinc-400" /></span>
                          <span className="font-semibold text-zinc-700">₹{data.suppliesSpendF.packagingAndTags.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- Est. Payout Result Row --- */}
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-950 p-3.5 text-white shadow-xs">
                    <div>
                      <p className="text-xs font-black">Est. payout</p>
                      <p className="text-[10px] text-zinc-400">(A + B - C - D - E - F)</p>
                    </div>
                    <p className="text-lg font-black tracking-tight text-emerald-400">
                      ₹{data.estNetPayout.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Transaction Details Card */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs">
                  <h3 className="text-sm font-black text-zinc-900">Transaction details</h3>
                  {data.bankDetails.utr ? (
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex justify-between text-zinc-600">
                        <span className="font-semibold">Bank Account</span>
                        <span className="font-bold text-zinc-900">{data.bankDetails.accountNumberMasked}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span className="font-semibold">Bank Name</span>
                        <span className="font-bold text-zinc-900">{data.bankDetails.bankName}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span className="font-semibold">UTR Reference</span>
                        <span className="font-bold font-mono text-zinc-900">{data.bankDetails.utr}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span className="font-semibold">Credited On</span>
                        <span className="font-bold text-emerald-600">{data.bankDetails.creditedAt}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-zinc-500">
                      UTR and account details will be available once your payout is credited to registered bank account.
                    </p>
                  )}
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
                  <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-xs font-bold text-zinc-400">
                    No orders settled in this cycle yet.
                  </div>
                ) : (
                  data.orders.map((ord) => (
                    <div
                      key={ord.orderId}
                      className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-zinc-900">#{ord.orderCode}</span>
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                              {ord.status}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-zinc-500">{ord.customerName} • {ord.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-emerald-700">+₹{ord.netEarning.toFixed(2)}</p>
                          <p className="text-[10px] text-zinc-400">Gross: ₹{ord.grossValue.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="mt-2.5 rounded-lg bg-zinc-50 p-2 text-[11px] text-zinc-600 flex justify-between">
                        <span className="truncate pr-2">{ord.itemsSummary}</span>
                        <span className="text-rose-600 shrink-0">Fee: -₹{ord.commission.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
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
                    Cycle Expenses ({data.expenses.length})
                  </h2>
                </div>

                {data.expenses.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-xs font-bold text-zinc-400">
                    No packaging or ad expenses in this cycle.
                  </div>
                ) : (
                  data.expenses.map((exp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs"
                    >
                      <div>
                        <p className="text-xs font-black text-zinc-900">{exp.title}</p>
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
