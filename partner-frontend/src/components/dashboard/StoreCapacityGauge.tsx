import React, { useState } from "react";
import { Gauge, Sparkles, AlertTriangle, ShieldCheck, Flame } from "lucide-react";
import { toast } from "sonner";
import type { ManagedOrder } from "../../data/partner-orders-mock";

interface StoreCapacityGaugeProps {
  orders: ManagedOrder[];
  maxCapacity?: number;
}

export function StoreCapacityGauge({ orders, maxCapacity = 50 }: StoreCapacityGaugeProps) {
  const [busyMode, setBusyMode] = useState(() => {
    return localStorage.getItem("qp_partner_busy_mode") === "true";
  });

  const activeOrders = orders.filter(
    (o) => o.stage !== "completed" && o.stage !== "delivered" && o.stage !== "cancelled"
  );

  const activeCount = activeOrders.length;
  const loadPercentage = Math.min(100, Math.round((activeCount / maxCapacity) * 100));

  const isHighLoad = loadPercentage >= 80;
  const isMediumLoad = loadPercentage >= 50 && loadPercentage < 80;

  const toggleBusyMode = () => {
    const next = !busyMode;
    setBusyMode(next);
    localStorage.setItem("qp_partner_busy_mode", String(next));
    if (next) {
      toast.warning("⚡ Store High Surge / Busy Mode Enabled", {
        description: "Customer app indicates longer turnaround ETA to balance workload.",
      });
    } else {
      toast.success("✅ Standard Capacity Restored", {
        description: "Normal delivery turnaround and auto-acceptance limits restored.",
      });
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Metric info */}
        <div className="flex items-center gap-3">
          <span
            className={`flex size-10 items-center justify-center rounded-2xl border shadow-2xs ${
              isHighLoad
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "bg-blue-50 text-blue-600 border-blue-200"
            }`}
          >
            <Gauge className="size-5" />
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Store Washing & Rack Capacity
              </h4>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${
                  busyMode
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : isHighLoad
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : isMediumLoad
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                {busyMode ? "⚡ Busy Surge" : isHighLoad ? "Near Max" : "Optimal Load"}
              </span>
            </div>

            <p className="text-[11px] font-medium text-slate-500">
              <span className="font-black text-slate-900">{activeCount}</span> of{" "}
              <span className="font-bold text-slate-700">{maxCapacity} orders</span> in processing pipeline ({loadPercentage}% used)
            </p>
          </div>
        </div>

        {/* Progress bar & busy toggle */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isHighLoad
                    ? "bg-amber-500"
                    : isMediumLoad
                    ? "bg-blue-600"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${loadPercentage}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={toggleBusyMode}
            className={`shrink-0 rounded-2xl border px-3 py-1.5 text-[11px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs ${
              busyMode
                ? "bg-amber-600 text-white border-amber-600"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {busyMode ? "Busy Mode ON" : "Set Store Busy"}
          </button>
        </div>
      </div>
    </div>
  );
}
