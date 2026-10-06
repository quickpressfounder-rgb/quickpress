import React from "react";
import {
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Phone,
  ShieldCheck,
  Bike,
  Store,
  Sparkles,
  PackageCheck,
  Truck,
  KeyRound,
  Navigation,
  Award,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { OrderTimeline } from "./OrderTimeline";
import type { ManagedOrder } from "../../data/partner-orders-mock";

interface OrderTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ManagedOrder;
}

export const OrderTimelineModal: React.FC<OrderTimelineModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!isOpen) return null;

  const orderCode = order.code || (order.id ? order.id.slice(-6).toUpperCase() : "LIVE");
  const isCancelled = order.stage === "cancelled";
  const cancelReason =
    (order as any).cancellationReason ||
    (order as any).cancelledReason ||
    (order as any).rejectReason ||
    "";

  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(orderCode);
      toast.success(`Order code #${orderCode} copied! 📋`);
    } catch {}
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200 p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
              <Clock className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-zinc-950 dark:text-zinc-50 tracking-tight">
                  Live Order Lifecycle
                </h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                    isCancelled
                      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400"
                  }`}
                >
                  {isCancelled ? "Cancelled" : "Active Flow"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-[11px] font-mono font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 flex items-center gap-1 mt-0.5 cursor-pointer"
              >
                <span>Order #{orderCode}</span>
                <Copy className="size-2.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Quick Order Info Banner */}
        <div className="px-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-800/50 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
            <span>Customer:</span>
            <span className="font-black text-zinc-950 dark:text-white">
              {order.customerName || "Customer"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
            <span>Amount:</span>
            <span className="font-mono font-black text-emerald-700 dark:text-emerald-400">
              ₹{Number(order.total || order.amount || 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-zinc-500 font-normal">
              ({order.paymentMode === "cod" ? "COD" : "Prepaid"})
            </span>
          </div>
        </div>

        {/* Scrollable Timeline Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 overscroll-contain">
          <OrderTimeline order={order} />
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-500">
            SLA Monitored in Real-Time ⚡
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-black text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
