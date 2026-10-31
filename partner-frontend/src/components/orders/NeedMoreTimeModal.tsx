import React, { useState } from "react";
import { Clock, X } from "lucide-react";

interface NeedMoreTimeModalProps {
  isOpen: boolean;
  orderId: string;
  orderCode?: string;
  onClose: () => void;
  onAddTime: (additionalMinutes: number) => Promise<void> | void;
}

const TIME_OPTIONS = [5, 10, 15, 30];

export function NeedMoreTimeModal({
  isOpen,
  orderId,
  orderCode,
  onClose,
  onAddTime,
}: NeedMoreTimeModalProps) {
  const [submitting, setSubmitting] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSelectTime = async (minutes: number) => {
    setSubmitting(minutes);
    try {
      await onAddTime(minutes);
      onClose();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900">
              Need more time {orderCode ? `· #${orderCode}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-center">
          {/* Vector Illustration */}
          <div className="relative mx-auto mb-4 w-44 h-32 sm:w-52 sm:h-36 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-inner flex items-center justify-center">
            <img
              src="/images/modals/need-more-time.jpg"
              alt="Need more laundry preparation time"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback icon if image cannot load
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Clock className="size-10 text-blue-500/30" />
            </div>
          </div>

          {/* Headline and Subtext */}
          <h3 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
            How much more time do you need to prepare laundry?
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-xs mx-auto">
            The same will be shown to the customer and delivery captain.
          </p>

          {/* Time Selector Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {TIME_OPTIONS.map((mins) => (
              <button
                key={mins}
                type="button"
                disabled={submitting !== null}
                onClick={() => handleSelectTime(mins)}
                className="flex items-center justify-center px-4 py-2.5 rounded-full border border-zinc-300 bg-white text-xs font-black text-zinc-800 shadow-2xs hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting === mins ? (
                  <span className="size-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mr-1.5" />
                ) : null}
                <span>{mins} mins</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
