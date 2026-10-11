import { Check, ChevronRight, Clock3, Flame, IndianRupee, MapPin, Timer, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { playUrgentSlaBuzzer } from "../../lib/partner-order-alert-sound";
import {
  GarmentSummaryChips,
  DirectContactActions,
  PrintBagTagButton,
} from "../orders/OrderQuickTools";

export type LiveOrder = {
  id: string;
  code: string;
  customerName: string;
  customerPhone?: string;
  pickupTime: string;
  services: string[];
  amount: number;
  status: "pending" | "accepted" | "pickup" | "washing" | "ironing" | "ready" | "delivered" | "cancelled";
};

const STATUS_STYLE: Record<LiveOrder["status"], string> = {
  pending: "bg-amber-50 text-black border border-amber-300 font-bold",
  accepted: "bg-blue-50 text-black border border-blue-300 font-bold",
  pickup: "bg-purple-50 text-black border border-purple-300 font-bold",
  washing: "bg-indigo-50 text-black border border-indigo-300 font-bold",
  ironing: "bg-cyan-50 text-black border border-cyan-300 font-bold",
  ready: "bg-emerald-50 text-black border border-emerald-300 font-bold",
  delivered: "bg-zinc-100 text-black border border-zinc-200 font-bold",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200 font-bold",
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
 * - 2-minute (120s) live countdown with intensifying urgent alert buzzer.
 * - Accept / Reject actions in 'pending' stage.
 * - 1-tap Call & WhatsApp actions.
 * - Visual Garment Summary with emoji icons.
 * - 1-Click Thermal Receipt & Bag Tag Print.
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
  const [countdown, setCountdown] = useState(120);
  const lastBuzzerRef = useRef<number>(0);

  useEffect(() => {
    if (!isPending) return;

    setCountdown(120);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject(order);
          return 0;
        }
        const next = prev - 1;
        if (next > 0 && next <= 45) {
          const now = Date.now();
          if (now - lastBuzzerRef.current > 7000) {
            lastBuzzerRef.current = now;
            playUrgentSlaBuzzer();
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPending, order.id]);

  const percent = (countdown / 120) * 100;
  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const formattedTime = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isUrgent = countdown <= 45;

  return (
    <article
      className="card-soft animate-rise border border-zinc-200 bg-white p-4 shadow-xs transition-all duration-300 hover:border-zinc-300 hover:shadow-md rounded-2xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* 2-Minute Acceptance Alert Banner (Only for pending) */}
      {isPending && (
        <div className={`mb-3 overflow-hidden rounded-xl border p-2.5 ${
          isUrgent ? "bg-rose-50 border-rose-300 animate-pulse" : "bg-amber-50 border-amber-300"
        }`}>
          <div className="flex items-center justify-between text-xs font-black">
            <span className="flex items-center gap-1.5 text-black">
              {isUrgent ? <Flame className="size-3.5 text-rose-600 animate-bounce" /> : <Timer className="size-3.5 text-black" />}
              <span>{isUrgent ? "URGENT SLA ACCEPTANCE" : "Acceptance Window (2m SLA)"}</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                isUrgent
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-amber-200 text-black"
              }`}
            >
              {formattedTime} remaining
            </span>
          </div>
          {/* Progress countdown bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className={`h-full transition-all duration-1000 ${
                isUrgent ? "bg-rose-600" : countdown <= 60 ? "bg-amber-500" : "bg-blue-600"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight text-black">
            {order.customerName}
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <p className="truncate text-[0.75rem] font-black text-black">#{order.code}</p>
            <PrintBagTagButton order={order} />
          </div>
          <DirectContactActions
            customerName={order.customerName}
            customerPhone={order.customerPhone}
            orderCode={order.code}
          />
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider ${STATUS_STYLE[order.status]}`}
        >
          {STATUS_LABEL_MAP[order.status] || order.status}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-black">
        <Clock3 className="size-3.5 shrink-0 text-black" />
        <span className="truncate">{order.pickupTime}</span>
      </div>

      {/* Garments Visual Summary Chips */}
      <div className="mt-2.5">
        <GarmentSummaryChips services={order.services} />
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
