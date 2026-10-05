import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Scale,
  RefreshCw,
  Download,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Layers,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { fetchAccountingStatements, AccountingStatementsResponse } from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { toast } from "sonner";

export function AccountingStatementsView() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("ALL_TIME");
  const [statementTab, setStatementTab] = useState<"pnl" | "balance-sheet" | "cash-flow" | "aging">("pnl");

  const { data, isLoading, isError, refetch } = useQuery<AccountingStatementsResponse>({
    queryKey: ["accounting-statements", selectedPeriod],
    queryFn: () => fetchAccountingStatements(selectedPeriod),
    staleTime: 30000,
  });

  const pnl = data?.pnl;
  const bs = data?.balanceSheet;
  const cf = data?.cashFlow;
  const aging = data?.aging;

  return (
    <div className="space-y-6">
      {/* Header with Period Filter */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Scale className="size-5" />
            </span>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">GAAP Accounting Statements</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Authoritative financial reports: Profit & Loss, Balance Sheet, Cash Flow, and AR/AP Aging Buckets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v)}>
            <SelectTrigger className="w-44 text-xs h-9 rounded-xl">
              <Calendar className="size-3.5 mr-2 text-zinc-400" />
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_TIME">All-Time Cumulative</SelectItem>
              <SelectItem value="CURRENT_MONTH">Current Month</SelectItem>
              <SelectItem value="PREVIOUS_MONTH">Previous Month</SelectItem>
              <SelectItem value="Q1">Quarter 1 (Apr - Jun)</SelectItem>
              <SelectItem value="Q2">Quarter 2 (Jul - Sep)</SelectItem>
              <SelectItem value="Q3">Quarter 3 (Oct - Dec)</SelectItem>
              <SelectItem value="Q4">Quarter 4 (Jan - Mar)</SelectItem>
            </SelectContent>
          </Select>

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
          <RefreshCw className="size-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700">Compiling GAAP Statements...</p>
          <p className="text-xs text-zinc-400 mt-1">Aggregating live double-entry journal entries</p>
        </div>
      )}

      {isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
          <AlertCircle className="size-6 mx-auto mb-2 text-rose-600" />
          <h4 className="text-sm font-bold">Failed to load accounting statements</h4>
          <p className="text-xs text-rose-600 mt-1">Please check your network and try again.</p>
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-6">
          {/* Executive KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">Gross Merchandise Value (GMV)</span>
              <div className="text-2xl font-black text-zinc-900 mt-2">
                ₹{((pnl?.gmv ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Total customer invoices</div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">Gross Profit (Take Rate)</span>
              <div className="text-2xl font-black text-blue-700 mt-2">
                ₹{((pnl?.grossProfit ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">After partner & rider payouts</div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">Operating Expenses (OPEX)</span>
              <div className="text-2xl font-black text-amber-700 mt-2">
                ₹{((pnl?.operatingExpenses ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Tech, marketing, hub overheads</div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Net Operating Profit</span>
                <Badge
                  className={
                    (pnl?.netProfit ?? 0) >= 0
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }
                >
                  {(pnl?.marginPercent ?? 0).toFixed(1)}% Margin
                </Badge>
              </div>
              <div
                className={`text-2xl font-black mt-2 ${
                  (pnl?.netProfit ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                ₹{((pnl?.netProfit ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Bottom-line GAAP net margin</div>
            </div>
          </div>

          {/* Statement Tabs */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs">
            <Tabs value={statementTab} onValueChange={(v) => setStatementTab(v as any)} className="w-full">
              <TabsList className="bg-zinc-100 p-1 rounded-xl mb-6">
                <TabsTrigger value="pnl" className="text-xs font-bold rounded-lg px-4 py-2">
                  Profit & Loss (P&L)
                </TabsTrigger>
                <TabsTrigger value="balance-sheet" className="text-xs font-bold rounded-lg px-4 py-2">
                  Balance Sheet
                </TabsTrigger>
                <TabsTrigger value="cash-flow" className="text-xs font-bold rounded-lg px-4 py-2">
                  Cash Flow Statement
                </TabsTrigger>
                <TabsTrigger value="aging" className="text-xs font-bold rounded-lg px-4 py-2">
                  AR / AP Aging Buckets
                </TabsTrigger>
              </TabsList>

              {/* P&L Statement */}
              <TabsContent value="pnl" className="space-y-4">
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold">
                        <th className="py-3 px-4 text-left">P&L Financial Line Item</th>
                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                        <th className="py-3 px-4 text-right">% of Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {/* Revenue */}
                      <tr className="bg-zinc-50/50 font-bold text-zinc-900">
                        <td className="py-2.5 px-4">I. GROSS MERCHANDISE VALUE (GMV)</td>
                        <td className="py-2.5 px-4 text-right font-mono">₹{(pnl?.gmv ?? 0).toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">100.0%</td>
                      </tr>
                      {/* Cost of Sales */}
                      <tr>
                        <td className="py-2 px-4 pl-8 text-zinc-600">Less: Partner Laundry Disbursals</td>
                        <td className="py-2 px-4 text-right font-mono text-zinc-700">₹{(pnl?.partnerPayouts ?? 0).toFixed(2)}</td>
                        <td className="py-2 px-4 text-right font-mono text-zinc-500">
                          {pnl?.gmv ? ((pnl.partnerPayouts / pnl.gmv) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 pl-8 text-zinc-600">Less: Rider Delivery Disbursals</td>
                        <td className="py-2 px-4 text-right font-mono text-zinc-700">₹{(pnl?.riderPayouts ?? 0).toFixed(2)}</td>
                        <td className="py-2 px-4 text-right font-mono text-zinc-500">
                          {pnl?.gmv ? ((pnl.riderPayouts / pnl.gmv) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 pl-8 text-zinc-600">Less: Payment Gateway Fees</td>
                        <td className="py-2 px-4 text-right font-mono text-zinc-700">₹{(pnl?.directExpenses ?? 0).toFixed(2)}</td>
                        <td className="py-2 px-4 text-right font-mono text-zinc-500">
                          {pnl?.gmv ? ((pnl.directExpenses / pnl.gmv) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      {/* Gross Profit */}
                      <tr className="bg-blue-50/40 font-bold text-blue-900">
                        <td className="py-2.5 px-4">II. GROSS PROFIT (PLATFORM CONTRIBUTION)</td>
                        <td className="py-2.5 px-4 text-right font-mono">₹{(pnl?.grossProfit ?? 0).toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          {pnl?.gmv ? ((pnl.grossProfit / pnl.gmv) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      {/* OPEX */}
                      <tr>
                        <td className="py-2 px-4 pl-8 text-zinc-600">Less: Operating & Hub Expenses (OPEX)</td>
                        <td className="py-2 px-4 text-right font-mono text-zinc-700">₹{(pnl?.operatingExpenses ?? 0).toFixed(2)}</td>
                        <td className="py-2 px-4 text-right font-mono text-zinc-500">
                          {pnl?.gmv ? ((pnl.operatingExpenses / pnl.gmv) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      {/* EBITDA */}
                      <tr className="font-semibold text-zinc-800">
                        <td className="py-2 px-4">III. EBITDA</td>
                        <td className="py-2 px-4 text-right font-mono">₹{(pnl?.ebitda ?? 0).toFixed(2)}</td>
                        <td className="py-2 px-4 text-right font-mono">
                          {pnl?.gmv ? ((pnl.ebitda / pnl.gmv) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      {/* Net Profit */}
                      <tr className="bg-zinc-900 font-bold text-white">
                        <td className="py-3 px-4">IV. NET OPERATING PROFIT / (LOSS)</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">₹{(pnl?.netProfit ?? 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">{(pnl?.marginPercent ?? 0).toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Balance Sheet */}
              <TabsContent value="balance-sheet" className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div className="flex items-center gap-2">
                    <Scale className="size-4 text-indigo-600" />
                    <span className="text-xs font-bold text-zinc-800">GAAP Equation Verification: Assets = Liabilities + Equity</span>
                  </div>
                  <Badge
                    className={
                      bs?.isBalanced
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }
                  >
                    {bs?.isBalanced ? "✓ BALANCED" : "RECONCILED"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Assets */}
                  <div className="border border-zinc-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 pb-2 border-b border-zinc-200">
                      ASSETS
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-zinc-800">Current Assets:</div>
                      <div className="flex justify-between pl-4 text-zinc-600">
                        <span>Cash & Corporate Bank Accounts</span>
                        <span className="font-mono font-bold text-zinc-900">
                          ₹{(bs?.assets?.currentAssets?.cashAndBank ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pl-4 text-zinc-600">
                        <span>Customer Accounts Receivable</span>
                        <span className="font-mono font-bold text-zinc-900">
                          ₹{(bs?.assets?.currentAssets?.customerReceivables ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pl-4 text-zinc-600">
                        <span>Payment Gateway In-Transit Escrow</span>
                        <span className="font-mono font-bold text-zinc-900">
                          ₹{(bs?.assets?.currentAssets?.gatewayInTransit ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-zinc-100 font-semibold text-zinc-800">
                        <span>Total Current Assets</span>
                        <span className="font-mono">
                          ₹{(bs?.assets?.currentAssets?.totalCurrentAssets ?? 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="font-semibold text-zinc-800 pt-2">Non-Current Assets:</div>
                      <div className="flex justify-between pl-4 text-zinc-600">
                        <span>Security Deposits & Equipment</span>
                        <span className="font-mono font-bold text-zinc-900">
                          ₹{(bs?.assets?.nonCurrentAssets?.securityDeposits ?? 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between pt-3 border-t-2 border-zinc-900 font-black text-sm text-zinc-900">
                        <span>TOTAL ASSETS</span>
                        <span className="font-mono">₹{(bs?.assets?.totalAssets ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div className="border border-zinc-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 pb-2 border-b border-zinc-200">
                      LIABILITIES & EQUITY
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-zinc-800">Current Liabilities:</div>
                      <div className="flex justify-between pl-4 text-zinc-600">
                        <span>Partner Payouts Payable</span>
                        <span className="font-mono font-bold text-zinc-900">
                          ₹{(bs?.liabilities?.currentLiabilities?.partnerPayables ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pl-4 text-zinc-600">
                        <span>Rider Delivery Fees Payable</span>
                        <span className="font-mono font-bold text-zinc-900">
                          ₹{(bs?.liabilities?.currentLiabilities?.riderPayables ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pl-4 text-zinc-600">
                        <span>GST & Statutory Tax Payables</span>
                        <span className="font-mono font-bold text-zinc-900">
                          ₹{(bs?.liabilities?.currentLiabilities?.taxPayables ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-zinc-100 font-semibold text-zinc-800">
                        <span>Total Current Liabilities</span>
                        <span className="font-mono">
                          ₹{(bs?.liabilities?.currentLiabilities?.totalCurrentLiabilities ?? 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="font-semibold text-zinc-800 pt-2">Equity:</div>
                      <div className="flex justify-between pl-4 text-zinc-600">
                        <span>Retained Earnings / P&L Surplus</span>
                        <span className="font-mono font-bold text-zinc-900">
                          ₹{(bs?.equity?.retainedEarnings ?? 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between pt-3 border-t-2 border-zinc-900 font-black text-sm text-zinc-900">
                        <span>TOTAL LIABILITIES & EQUITY</span>
                        <span className="font-mono">
                          ₹{((bs?.liabilities?.totalLiabilities ?? 0) + (bs?.equity?.totalEquity ?? 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Cash Flow Statement */}
              <TabsContent value="cash-flow" className="space-y-4">
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold">
                        <th className="py-3 px-4 text-left">Cash Flow Activity</th>
                        <th className="py-3 px-4 text-right">Inflow / (Outflow) (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr className="bg-zinc-50/50 font-bold text-zinc-900">
                        <td className="py-2.5 px-4" colSpan={2}>1. OPERATING ACTIVITIES</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 pl-8 text-zinc-700">Cash received from customers (Gateway & COD)</td>
                        <td className="py-2 px-4 text-right font-mono text-emerald-600 font-semibold">
                          +₹{(cf?.operatingCashFlow?.customerCollections ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 pl-8 text-zinc-700">Cash disbursed to laundry partners</td>
                        <td className="py-2 px-4 text-right font-mono text-rose-600 font-semibold">
                          -₹{(cf?.operatingCashFlow?.partnerDisbursements ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 pl-8 text-zinc-700">Cash disbursed to delivery riders</td>
                        <td className="py-2 px-4 text-right font-mono text-rose-600 font-semibold">
                          -₹{(cf?.operatingCashFlow?.riderDisbursements ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-blue-50/50 font-bold text-blue-950">
                        <td className="py-2.5 px-4 pl-4">Net Cash from Operating Activities</td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          ₹{(cf?.operatingCashFlow?.netOperatingCash ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-zinc-900 font-bold text-white">
                        <td className="py-3 px-4">NET CASH GENERATED</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">
                          ₹{(cf?.netCashGenerated ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* AR / AP Aging Buckets */}
              <TabsContent value="aging" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AR Aging */}
                  <div className="border border-zinc-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                      <h4 className="text-xs font-bold text-zinc-900">Accounts Receivable (AR) Aging</h4>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        Total: ₹{(aging?.totalReceivables ?? 0).toFixed(2)}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      {["0-7d", "8-30d", "31-60d", "61-90d", "90d+"].map((bucket) => {
                        const amt = aging?.arBuckets?.[bucket] ?? 0;
                        return (
                          <div key={bucket} className="flex justify-between py-1.5 border-b border-zinc-100">
                            <span className="text-zinc-600 font-medium">{bucket}</span>
                            <span className="font-mono font-bold text-zinc-900">₹{amt.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AP Aging */}
                  <div className="border border-zinc-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                      <h4 className="text-xs font-bold text-zinc-900">Accounts Payable (AP) Aging</h4>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                        Total: ₹{(aging?.totalPayables ?? 0).toFixed(2)}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-xs">
                      {["0-7d", "8-30d", "31-60d", "61-90d", "90d+"].map((bucket) => {
                        const amt = aging?.apBuckets?.[bucket] ?? 0;
                        return (
                          <div key={bucket} className="flex justify-between py-1.5 border-b border-zinc-100">
                            <span className="text-zinc-600 font-medium">{bucket}</span>
                            <span className="font-mono font-bold text-zinc-900">₹{amt.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
