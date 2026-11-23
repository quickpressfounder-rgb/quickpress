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
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-auto bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border-t sm:border border-zinc-200 overflow-hidden flex flex-col max-h-[82vh] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Indicator */}
        <div className="mx-auto mt-2.5 mb-1 h-1 w-10 rounded-full bg-zinc-300 sm:hidden shrink-0" />

        {/* Top Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-zinc-100 shrink-0">
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
            className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Reason / Duration Selection */}
        <div className="p-5 space-y-2.5 overflow-y-auto">
          <p className="text-xs font-semibold text-zinc-700 mb-1">
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
                className={`flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all cursor-pointer border ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    isSelected ? "bg-emerald-600 text-white shadow-2xs" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  <Icon className="size-5" />
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
                      className={`size-4.5 rounded-full border flex items-center justify-center transition-colors ${
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

        {/* Footer Actions - Elevated safely above bottom nav with ample padding */}
        <div className="flex items-center gap-3 bg-zinc-50 px-5 pt-3.5 pb-8 sm:pb-4 border-t border-zinc-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl py-3 text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 transition-colors shadow-2xs active:scale-98 cursor-pointer"
          >
            Keep Online
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className="flex-1 rounded-2xl bg-rose-600 hover:bg-rose-700 py-3 text-xs font-black text-white shadow-md shadow-rose-600/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? "Going Offline..." : "Confirm Go Offline"}
          </button>
        </div>
      </div>
    </div>
  );
}
