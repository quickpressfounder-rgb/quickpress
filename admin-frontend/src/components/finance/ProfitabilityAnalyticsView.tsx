import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  MapPin,
  Sparkles,
  RefreshCw,
  Truck,
  Layers,
  IndianRupee,
  Building,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Percent,
} from "lucide-react";
import { fetchProfitabilityAnalytics, ProfitabilityAnalyticsResponse } from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export function ProfitabilityAnalyticsView() {
  const [period, setPeriod] = useState<string>("ALL_TIME");

  const { data, isLoading, isError, refetch } = useQuery<ProfitabilityAnalyticsResponse>({
    queryKey: ["profitability-analytics", period],
    queryFn: () => fetchProfitabilityAnalytics(period),
    staleTime: 30000,
  });

  const cityList = data?.cityProfitability || [];
  const serviceList = data?.serviceProfitability || [];
  const riderCosts = data?.riderCostAnalysis;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <TrendingUp className="size-5" />
            </span>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Multi-Dimensional Profitability</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Real performance breakdown across Cities, Service categories, and Rider delivery unit economics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v)}>
            <SelectTrigger className="w-40 text-xs h-9 rounded-xl">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_TIME">All-Time Cumulative</SelectItem>
              <SelectItem value="CURRENT_MONTH">Current Month</SelectItem>
              <SelectItem value="PREVIOUS_MONTH">Previous Month</SelectItem>
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
          <RefreshCw className="size-8 text-amber-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700">Computing Profitability Dimensions...</p>
        </div>
      )}

      {isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
          <AlertCircle className="size-6 mx-auto mb-2 text-rose-600" />
          <h4 className="text-sm font-bold">Failed to load profitability metrics</h4>
          <p className="text-xs text-rose-600 mt-1">Please retry or check system logs.</p>
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-6">
          {/* Rider Logistics Delivery Economics Cards */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="size-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Rider Logistics & Delivery Economics
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <span className="text-xs text-zinc-300">Customer Delivery Fees</span>
                <div className="text-xl font-bold text-white mt-1">
                  ₹{((riderCosts?.totalDeliveryFeesCollected ?? 0)).toFixed(2)}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Collected at checkout</div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <span className="text-xs text-zinc-300">Rider Fleet Payouts</span>
                <div className="text-xl font-bold text-amber-300 mt-1">
                  ₹{((riderCosts?.totalRiderPayouts ?? 0)).toFixed(2)}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Direct compensation</div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <span className="text-xs text-zinc-300">Platform Delivery Subsidy Burn</span>
                <div className="text-xl font-bold text-rose-400 mt-1">
                  ₹{((riderCosts?.deliverySubsidyBurn ?? 0)).toFixed(2)}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">QuickPress funded logistics</div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <span className="text-xs text-zinc-300">Avg Cost per Delivery</span>
                <div className="text-xl font-bold text-emerald-300 mt-1">
                  ₹{((riderCosts?.avgCostPerDelivery ?? 0)).toFixed(2)}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Blended per order</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* City Profitability League Table */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-zinc-900">City-Wise Profitability Ranking</h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {cityList.length} Operating Cities
                </Badge>
              </div>

              {cityList.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">No city data available for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                        <th className="pb-2 text-left">City</th>
                        <th className="pb-2 text-right">Orders</th>
                        <th className="pb-2 text-right">GMV (₹)</th>
                        <th className="pb-2 text-right">Net Profit (₹)</th>
                        <th className="pb-2 text-right">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {cityList.map((c, i) => (
                        <tr key={i} className="hover:bg-zinc-50/70">
                          <td className="py-2.5 font-bold text-zinc-900">{c.city}</td>
                          <td className="py-2.5 text-right text-zinc-600 font-mono">{c.orderCount}</td>
                          <td className="py-2.5 text-right font-mono text-zinc-700">₹{(c.gmv ?? 0).toFixed(2)}</td>
                          <td
                            className={`py-2.5 text-right font-mono font-bold ${
                              (c.netProfit ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            ₹{(c.netProfit ?? 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right">
                            <Badge
                              className={
                                (c.marginPct ?? 0) >= 15
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : (c.marginPct ?? 0) >= 0
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }
                            >
                              {(c.marginPct ?? 0).toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Service Category Margin Analysis */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-zinc-900">Service Category Margins</h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {serviceList.length} Categories
                </Badge>
              </div>

              {serviceList.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">No service data recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                        <th className="pb-2 text-left">Category</th>
                        <th className="pb-2 text-right">Orders</th>
                        <th className="pb-2 text-right">GMV (₹)</th>
                        <th className="pb-2 text-right">Gross Margin</th>
                        <th className="pb-2 text-right">Net Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {serviceList.map((s, i) => (
                        <tr key={i} className="hover:bg-zinc-50/70">
                          <td className="py-2.5 font-bold text-zinc-900">{s.serviceCategory}</td>
                          <td className="py-2.5 text-right text-zinc-600 font-mono">{s.orderCount}</td>
                          <td className="py-2.5 text-right font-mono text-zinc-700">₹{(s.gmv ?? 0).toFixed(2)}</td>
                          <td className="py-2.5 text-right font-mono font-bold text-indigo-700">
                            ₹{(s.grossMargin ?? 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-emerald-600">
                            {(s.netMarginPct ?? 0).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
