import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Landmark,
  RotateCcw,
  Receipt,
  Scale,
} from "lucide-react";
import { fetchAttentionRequiredAnomalies, type AnomalyItem } from "@/api/finance-api";
import { Badge } from "@/shared/ui/badge";

interface AnomalyAlertBannerProps {
  onSelectAnomaly?: (type: string, item: AnomalyItem) => void;
}

export function AnomalyAlertBanner({ onSelectAnomaly }: AnomalyAlertBannerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["finance", "anomalies", "attention-required"],
    queryFn: fetchAttentionRequiredAnomalies,
    refetchInterval: 30000, // 30s auto-refresh for realtime exception detection
  });

  if (isLoading || !data || data.totalActiveExceptions === 0) {
    return null;
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "COD_OVERDUE":
        return <Clock className="size-4 text-rose-600" />;
      case "PAYMENT_MISMATCH":
        return <Scale className="size-4 text-amber-600" />;
      case "FAILED_SETTLEMENT":
        return <Landmark className="size-4 text-rose-600" />;
      case "UNUSUAL_REFUND":
        return <RotateCcw className="size-4 text-amber-600" />;
      case "NEGATIVE_WALLET":
        return <Wallet className="size-4 text-rose-600" />;
      case "HIGH_EXPENSE":
        return <Receipt className="size-4 text-blue-600" />;
      default:
        return <AlertTriangle className="size-4 text-amber-600" />;
    }
  };

  return (
    <div className="bg-gradient-to-r from-rose-50/80 via-amber-50/60 to-white border border-rose-200/80 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-900">
                Attention Required
              </span>
              <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-extrabold text-[10px] px-2">
                {data.totalActiveExceptions} Exception(s)
              </Badge>
              {data.criticalCount > 0 && (
                <Badge className="bg-red-600 text-white font-extrabold text-[10px] px-2 animate-pulse">
                  🔴 {data.criticalCount} Critical
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">
              Real-time financial risk alerts requiring operational verification or approval
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold text-zinc-400">
          Updated {new Date(data.generatedAt).toLocaleTimeString("en-IN")}
        </span>
      </div>

      {/* Grid of Exception Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {data.anomalies.map((anom) => {
          const isCritical = anom.severity === "CRITICAL_RED";
          return (
            <div
              key={anom.id}
              onClick={() => onSelectAnomaly?.(anom.type, anom)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isCritical
                  ? "bg-rose-50/60 hover:bg-rose-100/70 border-rose-200 hover:border-rose-300 shadow-sm"
                  : "bg-amber-50/50 hover:bg-amber-100/60 border-amber-200 hover:border-amber-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white shadow-xs">
                    {getIconForType(anom.type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 leading-snug">
                      {anom.title}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-semibold">
                      ₹{anom.total_impact_amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-zinc-200/60 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-600">
                  {anom.action_label}
                </span>
                <ArrowRight className="size-3 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
