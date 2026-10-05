import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Percent,
  MapPin,
  Sparkles,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  fetchUnitEconomicsSummary,
  fetchCityProfitabilityHeatmap,
  fetchServiceProfitabilityComparison,
} from "@/api/finance-api";
import { Badge } from "@/shared/ui/badge";

export function UnitEconomicsView() {
  const { data: summaryData } = useQuery({
    queryKey: ["finance", "unit-economics", "summary"],
    queryFn: fetchUnitEconomicsSummary,
  });

  const { data: cityData } = useQuery({
    queryKey: ["finance", "unit-economics", "cities"],
    queryFn: fetchCityProfitabilityHeatmap,
  });

  const { data: serviceData } = useQuery({
    queryKey: ["finance", "unit-economics", "services"],
    queryFn: fetchServiceProfitabilityComparison,
  });

  const margins = summaryData?.margins;

  return (
    <div className="space-y-6">
      {/* Top Margin Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-zinc-500 uppercase">Gross Platform GMV</span>
          <div className="text-2xl font-black text-zinc-900">
            ₹{margins?.total_gross_gmv?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[11px] text-zinc-400">
            Across {margins?.total_orders ?? 0} analyzed orders
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Contribution Margin 1 (CM1)</span>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px]">
              {margins?.blended_cm1_pct ?? 0}%
            </Badge>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₹{margins?.total_cm1?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[11px] text-zinc-400">
            GMV minus Partner cost & Rider pay
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Contribution Margin 2 (CM2)</span>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px]">
              {margins?.blended_cm2_pct ?? 0}%
            </Badge>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            ₹{margins?.total_cm2?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[11px] text-zinc-400">
            Net of gateway, coupons & packaging
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-xs font-black text-emerald-900 uppercase">Profitable Orders Ratio</span>
          <div className="text-2xl font-black text-emerald-700">
            {margins?.profitable_orders_pct ?? 0}%
          </div>
          <span className="text-[11px] text-emerald-800 font-semibold">
            {margins?.profitable_orders_count ?? 0} positive-margin orders
          </span>
        </div>
      </div>

      {/* Two Columns: City Heatmap & Service Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Profitability Heatmap */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-amber-500" />
              <h3 className="text-sm font-black text-zinc-900">City & Micro-Market Profitability</h3>
            </div>
            <span className="text-[11px] text-zinc-400">Live Territory Slicing</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-y border-zinc-100 text-zinc-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">City</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Net GMV</th>
                <th className="py-2.5 px-3 text-right">CM1 %</th>
                <th className="py-2.5 px-3 text-right">Net CM2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {cityData?.cityHeatmap && cityData.cityHeatmap.length > 0 ? (
                cityData.cityHeatmap.map((c) => (
                  <tr key={c.city} className="hover:bg-zinc-50/70">
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{c.city}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-600">{c.orders_count}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">₹{c.net_gmv.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{c.cm1_margin_pct}%</td>
                    <td className="py-2.5 px-3 text-right font-black">
                      {c.is_cash_flow_positive ? (
                        <span className="text-emerald-700">₹{c.total_cm2.toFixed(2)}</span>
                      ) : (
                        <span className="text-rose-600">₹{c.total_cm2.toFixed(2)}</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                    No city unit economics recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Service Category Margin Comparison */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              <h3 className="text-sm font-black text-zinc-900">Service Category Margins</h3>
            </div>
            <span className="text-[11px] text-zinc-400">Dry Clean vs Wash & Fold</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-y border-zinc-100 text-zinc-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Net GMV</th>
                <th className="py-2.5 px-3 text-right">CM2 Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {serviceData?.serviceComparison && serviceData.serviceComparison.length > 0 ? (
                serviceData.serviceComparison.map((s) => (
                  <tr key={s.service_category} className="hover:bg-zinc-50/70">
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{s.service_category}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-600">{s.orders_count}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">₹{s.net_gmv.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-black">
                      <span className={s.cm2_margin_pct >= 0 ? "text-emerald-700" : "text-rose-600"}>
                        {s.cm2_margin_pct}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-400 text-xs">
                    No service margin data recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
