import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Mail } from "lucide-react";
import { toast } from "sonner";

import {
  type SettlementBreakdown,
  downloadSettlementExcelBlob,
  downloadSettlementPdfBlob,
  emailSettlementReport,
  fetchSettlementBreakdown,
} from "@/api/partner/partner-finance-api";
import { inr } from "../../lib/currency";

interface SettlementSummaryModalProps {
  cycleId: string;
  onClose?: () => void;
}

function cleanCycleDateOnly(raw?: string): string {
  if (!raw) return "Current Cycle";
  return raw
    .replace(/^(current|weekly|daily|monthly)\s*(settlement|cycle)?\s*[•·:\-]\s*/i, "")
    .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+/gi, "")
    .trim();
}

/**
 * Clean double-entry Settlement Audit sub-view for a selected payout cycle.
 * Renders without a redundant back button; users navigate via the top sub-navigation tabs.
 */
export function SettlementSummaryModal({ cycleId }: SettlementSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "orders" | "deductions">("summary");
  const [data, setData] = useState<SettlementBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

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

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadSettlementPdfBlob(cycleId);
      toast.success("Settlement statement PDF downloaded");
    } catch {
      toast.error("Failed to download settlement PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      await downloadSettlementExcelBlob(cycleId);
      toast.success("Settlement statement Excel downloaded");
    } catch {
      toast.error("Failed to download settlement Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleEmailReport = async () => {
    setEmailing(true);
    try {
      const res = await emailSettlementReport(cycleId);
      toast.success(res?.message || "Statement emailed to your registered address");
    } catch {
      toast.error("Failed to email settlement statement");
    } finally {
      setEmailing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-20 rounded-2xl border border-zinc-200 bg-white animate-pulse" />
        <div className="h-64 rounded-2xl border border-zinc-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-xs font-medium text-zinc-500">
        Settlement breakdown unavailable for this cycle.
      </div>
    );
  }

  const periodLabel = cleanCycleDateOnly(data.cycle?.period);
  const utrText = data.bankDetails?.utr ? `UTR: ${data.bankDetails.utr}` : "Pending Payout";

  return (
    <div className="space-y-4">
      {/* Cycle Audit Header Card (No Back Button) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-zinc-950 tabular-nums">
            {periodLabel}
          </h2>
          <p className="mt-0.5 text-[11px] font-medium text-zinc-500 tabular-nums">
            {utrText} · {data.totalOrders} orders · {data.bankDetails?.bankName || "Bank"}{" "}
            {data.bankDetails?.accountNumberMasked || ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={emailing}
            onClick={handleEmailReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 cursor-pointer disabled:opacity-50"
          >
            <Mail className="size-3.5" />
            {emailing ? "Sending..." : "Email Report"}
          </button>
          <button
            type="button"
            disabled={downloadingExcel}
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="size-3.5" />
            {downloadingExcel ? "Preparing..." : "Excel"}
          </button>
          <button
            type="button"
            disabled={downloadingPdf}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
          >
            <Download className="size-3.5" />
            {downloadingPdf ? "Preparing..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 gap-1">
        {[
          { id: "summary", label: "A–F Double-Entry Summary" },
          { id: "orders", label: `Orders Audit (${data.orders?.length || data.totalOrders || 0})` },
          { id: "deductions", label: "Taxes & Deductions" },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                active ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panel 1: A-F Summary */}
      {activeTab === "summary" ? (
        <div className="space-y-3">
          <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/80 border-b border-zinc-100 text-xs font-bold text-zinc-950">
              <span>A. Net Order Value</span>
              <span className="tabular-nums">+{inr(data.netOrderValueA?.total)}</span>
            </div>
            <div className="divide-y divide-zinc-100 text-xs">
              <div className="flex justify-between px-4 py-2.5 text-zinc-600">
                <span>Garment Care Subtotals</span>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {inr(data.netOrderValueA?.itemSubtotal)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-zinc-600">
                <span>Customer Taxes Collected</span>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {inr(data.netOrderValueA?.totalGstCollected)}
                </span>
              </div>
              {(data.netOrderValueA?.restaurantDiscountPromos || 0) +
                (data.netOrderValueA?.restaurantDiscountFlat || 0) >
              0 ? (
                <div className="flex justify-between px-4 py-2.5 text-zinc-600">
                  <span>Store Promotional Discounts</span>
                  <span className="font-semibold text-rose-600 tabular-nums">
                    -
                    {inr(
                      (data.netOrderValueA?.restaurantDiscountPromos || 0) +
                        (data.netOrderValueA?.restaurantDiscountFlat || 0)
                    )}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/80 border-b border-zinc-100 text-xs font-bold text-zinc-950">
              <span>B. Additions &amp; Express Incentives</span>
              <span className="text-emerald-700 tabular-nums">+{inr(data.additionsB?.total)}</span>
            </div>
            <div className="divide-y divide-zinc-100 text-xs">
              <div className="flex justify-between px-4 py-2.5 text-zinc-600">
                <span>Incentive &amp; Express Bonus</span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  +
                  {inr(
                    (data.additionsB?.targetIncentiveBonus || 0) +
                      (data.additionsB?.qualityRatingBonus || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-zinc-600">
                <span>TDS Credits (194H / 194C)</span>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  +{inr((data.additionsB?.tds194h || 0) + (data.additionsB?.tds194c || 0))}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/80 border-b border-zinc-100 text-xs font-bold text-zinc-950">
              <span>C &amp; D. Commission &amp; Statutory Taxes</span>
              <span className="text-rose-600 tabular-nums">
                -{inr((data.orderLevelDeductionsC?.total || 0) + (data.taxDeductionsD?.total || 0))}
              </span>
            </div>
            <div className="divide-y divide-zinc-100 text-xs">
              <div className="flex justify-between px-4 py-2.5 text-zinc-600">
                <span>
                  Platform Service Commission ({data.orderLevelDeductionsC?.commissionRatePct || 15}%)
                </span>
                <span className="font-semibold text-rose-600 tabular-nums">
                  -{inr(data.orderLevelDeductionsC?.platformCommission)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-zinc-600">
                <span>GST on Service Fees (18%)</span>
                <span className="font-semibold text-rose-600 tabular-nums">
                  -{inr(data.taxDeductionsD?.gstOnServiceFees18)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-2.5 text-zinc-600">
                <span>Statutory TDS 194O &amp; TCS GST</span>
                <span className="font-semibold text-rose-600 tabular-nums">
                  -{inr((data.taxDeductionsD?.tds194o || 0) + (data.taxDeductionsD?.tcsGst || 0))}
                </span>
              </div>
            </div>
          </section>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-950">Final Net Bank Credit</p>
              <p className="text-[11px] font-medium text-emerald-800 mt-0.5 tabular-nums">
                {data.bankDetails?.transferMode || "IMPS / NEFT"} ·{" "}
                {data.bankDetails?.accountNumberMasked || ""}
              </p>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-emerald-900 tabular-nums">
              {inr(data.estNetPayout)}
            </span>
          </div>
        </div>
      ) : null}

      {/* Panel 2: Orders Audit (ONLY Order ID — Customer & Product names removed) */}
      {activeTab === "orders" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[540px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="py-3 pl-4 pr-3">Order ID</th>
                  <th className="py-3 px-3 text-right">Order Value</th>
                  <th className="py-3 px-3 text-right">Fee &amp; Tax</th>
                  <th className="py-3 pl-3 pr-4 text-right">Net Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(data.orders || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500">
                      No orders recorded in this settlement cycle.
                    </td>
                  </tr>
                ) : (
                  data.orders.map((ord) => {
                    const deductions =
                      (ord.commission || 0) + (ord.gstOnCommission || 0) + (ord.tcsGst || 0);
                    return (
                      <tr key={ord.orderId} className="hover:bg-zinc-50/70">
                        <td className="py-3 pl-4 pr-3 whitespace-nowrap">
                          <div className="font-bold text-zinc-950 tabular-nums">
                            #{ord.orderCode}
                          </div>
                          <div className="text-[11px] text-zinc-500 tabular-nums">{ord.date}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-zinc-800 tabular-nums whitespace-nowrap">
                          {inr(ord.grossValue)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-rose-600 tabular-nums whitespace-nowrap">
                          -{inr(deductions)}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                          {inr(ord.netEarning)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Panel 3: Statutory Deductions & Growth Adjustments */}
      {activeTab === "deductions" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 space-y-3 text-xs">
          <h3 className="font-bold text-zinc-950">Statutory Taxes &amp; Operational Charges</h3>
          <div className="divide-y divide-zinc-100">
            <div className="flex justify-between py-2.5">
              <span className="text-zinc-600">Platform Commission</span>
              <span className="font-semibold text-rose-600 tabular-nums">
                -{inr(data.orderLevelDeductionsC?.platformCommission)}
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-zinc-600">18% GST on Platform Fee (Eligible for ITC)</span>
              <span className="font-semibold text-rose-600 tabular-nums">
                -{inr(data.taxDeductionsD?.gstOnServiceFees18)}
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-zinc-600">TDS 194O + TCS GST</span>
              <span className="font-semibold text-rose-600 tabular-nums">
                -{inr((data.taxDeductionsD?.tds194o || 0) + (data.taxDeductionsD?.tcsGst || 0))}
              </span>
            </div>
            {(data.investmentsInGrowthE?.total || 0) + (data.suppliesSpendF?.total || 0) > 0 ? (
              <div className="flex justify-between py-2.5">
                <span className="text-zinc-600">Ads, Promos &amp; Packaging Supplies</span>
                <span className="font-semibold text-rose-600 tabular-nums">
                  -{inr((data.investmentsInGrowthE?.total || 0) + (data.suppliesSpendF?.total || 0))}
                </span>
              </div>
            ) : null}
            {(data.expenses || []).map((exp, idx) => (
              <div key={idx} className="flex justify-between py-2.5">
                <span className="text-zinc-600">
                  {exp.title} ({exp.date})
                </span>
                <span className="font-semibold text-zinc-900 tabular-nums">{inr(exp.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
