import { useQuery } from "@tanstack/react-query";
import {
  Receipt,
  FileCheck2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Building2,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { fetchTaxCenter, TaxCenterResponse } from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

export function TaxComplianceCenterView() {
  const { data, isLoading, isError, refetch } = useQuery<TaxCenterResponse>({
    queryKey: ["tax-center"],
    queryFn: () => fetchTaxCenter(),
    staleTime: 30000,
  });

  const summary = data?.taxSummary;
  const calendar = data?.complianceCalendar || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Receipt className="size-5" />
            </span>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">GST & Statutory Tax Center</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time indirect tax accounting, Section 194-O TCS, Section 194-C TDS, and statutory filing deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-zinc-100 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-700">
            GSTIN: <span className="font-bold text-zinc-900">{data?.gstin || "09AAECQ1234F1Z5"}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 text-xs rounded-xl"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center shadow-xs">
          <RefreshCw className="size-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700">Calculating Statutory Tax Liabilities...</p>
        </div>
      )}

      {isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
          <AlertCircle className="size-6 mx-auto mb-2 text-rose-600" />
          <h4 className="text-sm font-bold">Failed to load tax center</h4>
          <p className="text-xs text-rose-600 mt-1">Please retry or verify database connectivity.</p>
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-6">
          {/* Statutory Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">Gross Taxable Revenue</span>
              <div className="text-2xl font-black text-zinc-900 mt-2">
                ₹{((summary?.grossTaxableSales ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Direct platform taxable base</div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">GST Collected (CGST + SGST + IGST)</span>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                ₹{((summary?.totalGstCollected ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                <span>CGST: ₹{(summary?.cgstCollected ?? 0).toFixed(0)}</span>
                <span>•</span>
                <span>SGST: ₹{(summary?.sgstCollected ?? 0).toFixed(0)}</span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">Section 194-O TCS (1%)</span>
              <div className="text-2xl font-black text-blue-700 mt-2">
                ₹{((summary?.tcs194O ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Withheld from partner sales</div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Total Statutory Payable</span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Govt Remittance
                </Badge>
              </div>
              <div className="text-2xl font-black text-zinc-900 mt-2">
                ₹{((summary?.netTaxPayable ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">GST + TCS + TDS due this cycle</div>
            </div>
          </div>

          {/* Statutory Filing Calendar */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-zinc-900">Statutory Tax Filing Calendar</h3>
              </div>
              <span className="text-xs text-zinc-500 font-medium">Jurisdiction: {data?.jurisdiction || "Uttar Pradesh"}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                    <th className="pb-3 text-left">Statutory Return / Form</th>
                    <th className="pb-3 text-left">Period</th>
                    <th className="pb-3 text-left">Filing Due Date</th>
                    <th className="pb-3 text-left">Description</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {calendar.map((c, i) => (
                    <tr key={i} className="hover:bg-zinc-50/70">
                      <td className="py-3 font-bold text-zinc-900 font-mono">{c.statutoryForm}</td>
                      <td className="py-3 text-zinc-700 font-medium">{c.period}</td>
                      <td className="py-3 text-zinc-900 font-bold flex items-center gap-1.5">
                        <Clock className="size-3 text-amber-500" />
                        {c.dueDate}
                      </td>
                      <td className="py-3 text-zinc-600">{c.description}</td>
                      <td className="py-3 text-right">
                        <Badge
                          className={
                            c.status === "COMPLETED" || c.status === "FILED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
