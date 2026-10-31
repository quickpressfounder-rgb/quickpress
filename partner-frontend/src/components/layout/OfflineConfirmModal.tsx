import React, { useState } from "react";
import { Coffee, Moon, PowerOff, ShieldAlert, WashingMachine, X } from "lucide-react";

interface OfflineConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, durationMinutes?: number) => void;
  isLoading?: boolean;
}

const OFFLINE_REASONS = [
  {
    id: "break_30",
    icon: Coffee,
    title: "Taking a short break",
    desc: "Auto-reopen in 30 minutes",
    duration: 30,
  },
  {
    id: "busy_60",
    icon: WashingMachine,
    title: "Laundry machines at capacity",
    desc: "Pause new orders for 1 hour",
    duration: 60,
  },
  {
    id: "closing_today",
    icon: Moon,
    title: "Closing store for today",
    desc: "Reopen tomorrow at 8:00 AM",
    duration: 720,
  },
  {
    id: "manual",
    icon: PowerOff,
    title: "Turn offline manually",
    desc: "Stay offline until I switch back online",
    duration: 0,
  },
];

export function OfflineConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: OfflineConfirmModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("break_30");

  if (!isOpen) return null;

  const currentOption = OFFLINE_REASONS.find((r) => r.id === selectedReason);

  const handleConfirm = () => {
    if (!currentOption) {
      onConfirm("Manual offline");
      return;
    }
    onConfirm(currentOption.title, currentOption.duration > 0 ? currentOption.duration : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-950">Go Offline?</h2>
              <p className="text-[11px] font-medium text-zinc-500">
                You won't receive new laundry orders
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Reason / Duration Selection */}
        <div className="p-5 space-y-2.5">
          <p className="text-xs font-semibold text-zinc-700 mb-2">
            Why are you pausing your store?
          </p>
          {OFFLINE_REASONS.map((reason) => {
            const Icon = reason.icon;
            const isSelected = selectedReason === reason.id;
            return (
              <button
                key={reason.id}
                type="button"
                onClick={() => setSelectedReason(reason.id)}
                className={`flex w-full items-center gap-3.5 rounded-xl p-3 text-left transition-all cursor-pointer border ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  <Icon className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? "text-emerald-950" : "text-zinc-900"
                      }`}
                    >
                      {reason.title}
                    </span>
                    <span
                      className={`size-4 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-600"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {isSelected && <span className="size-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{reason.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 bg-zinc-50 px-5 py-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-200/80 transition-colors"
          >
            Keep Online
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-3 text-xs font-black text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? "Going Offline..." : "Confirm Go Offline"}
          </button>
        </div>
      </div>
    </div>
  );
}
