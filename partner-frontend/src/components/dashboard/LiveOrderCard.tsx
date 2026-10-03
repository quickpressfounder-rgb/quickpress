import { Check, ChevronRight, Clock3, IndianRupee, MapPin, Timer, X } from "lucide-react";
import { useEffect, useState } from "react";

export type LiveOrder = {
  id: string;
  code: string;
  customerName: string;
  pickupTime: string;
  services: string[];
  amount: number;
  status: "pending" | "accepted" | "pickup" | "washing" | "ironing" | "ready" | "delivered" | "cancelled";
};

const STATUS_STYLE: Record<LiveOrder["status"], string> = {
  pending: "bg-amber-50 text-amber-800 border border-amber-300",
  accepted: "bg-blue-50 text-blue-800 border border-blue-300",
  pickup: "bg-purple-50 text-purple-800 border border-purple-300",
  washing: "bg-indigo-50 text-indigo-800 border border-indigo-300",
  ironing: "bg-cyan-50 text-cyan-800 border border-cyan-300",
  ready: "bg-emerald-50 text-emerald-800 border border-emerald-300",
  delivered: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
};

const STATUS_LABEL_MAP: Record<LiveOrder["status"], string> = {
  pending: "New Order",
  accepted: "Accepted",
  pickup: "Pickup Pending",
  washing: "Processing",
  ironing: "Ironing",
  ready: "Ready for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Live Order Card for Dashboard (Mobile & Desktop)
 * Features:
 * - 60s live countdown with automatic rejection if time expires.
 * - Accept / Reject actions only in 'pending' stage.
 * - Forward-only progress once accepted (no status revert/back).
 * - Direct "View Details" to see full order breakdown.
 */
export function LiveOrderCard({
  order,
  delay = 0,
  onAccept,
  onReject,
  onView,
  onTrackMap,
}: {
  order: LiveOrder;
  delay?: number;
  onAccept: (order: LiveOrder) => void;
  onReject: (order: LiveOrder) => void;
  onView: (order: LiveOrder) => void;
  onTrackMap?: (order: LiveOrder) => void;
}) {
  const isPending = order.status === "pending";
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!isPending) return;

    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-reject when 1 minute expires
          onReject(order);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPending, order.id]);

  const percent = (countdown / 60) * 100;

  return (
    <article
      className="card-soft animate-rise border border-zinc-200 bg-white p-4 shadow-xs transition-all duration-300 hover:border-zinc-300 hover:shadow-md rounded-2xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* 60-Second Acceptance Alert Banner (Only for pending) */}
      {isPending && (
        <div className="mb-3 overflow-hidden rounded-xl bg-amber-50/90 border border-amber-200 p-2.5">
          <div className="flex items-center justify-between text-xs font-black text-amber-900">
            <span className="flex items-center gap-1.5">
              <Timer
                className={`size-3.5 ${countdown <= 15 ? "text-red-600 animate-spin" : "text-amber-700"}`}
              />
              <span>Acceptance Window</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                countdown <= 15
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-amber-200/80 text-amber-900"
              }`}
            >
              {countdown}s remaining
            </span>
          </div>
          {/* Progress countdown bar */}
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-amber-200/50">
            <div
              className={`h-full transition-all duration-1000 ${
                countdown <= 15 ? "bg-red-500" : countdown <= 30 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight text-zinc-900">
            {order.customerName}
          </p>
          <p className="mt-0.5 truncate text-[0.75rem] font-bold text-zinc-500">#{order.code}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider ${STATUS_STYLE[order.status]}`}
        >
          {STATUS_LABEL_MAP[order.status] || order.status}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
        <Clock3 className="size-3.5 shrink-0 text-zinc-400" />
        <span className="truncate">{order.pickupTime}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {order.services.map((service) => (
          <span
            key={service}
            className="rounded-lg bg-zinc-100 px-2 py-1 text-[0.68rem] font-bold tracking-tight text-zinc-700"
          >
            {service}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-zinc-100 pt-3">
        <span className="flex items-center gap-0.5 text-base font-black tracking-tight text-zinc-900">
          <IndianRupee className="size-4 text-zinc-700" />
          {order.amount.toLocaleString("en-IN")}
        </span>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => onReject(order)}
                className="flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-black text-rose-700 transition-all hover:bg-rose-100 active:scale-95"
              >
                <X className="size-3.5" /> Reject
              </button>
              <button
                type="button"
                onClick={() => onAccept(order)}
                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95"
              >
                <Check className="size-3.5" /> Accept
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-black text-emerald-800">
                <Check className="size-3.5" /> Accepted
              </span>
              <button
                type="button"
                onClick={() => onTrackMap?.(order)}
                className="flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-2 text-xs font-black transition-all hover:bg-emerald-100 active:scale-95 cursor-pointer"
              >
                <MapPin className="size-3.5 text-emerald-700" />
                <span>Live Map</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onView(order)}
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95 cursor-pointer"
          >
            View Details <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
