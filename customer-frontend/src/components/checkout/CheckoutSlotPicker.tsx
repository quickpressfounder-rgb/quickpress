import React from "react";
import { Zap, Check } from "lucide-react";

interface CheckoutSlotPickerProps {
  isExpressActive: boolean;
  onToggleExpress: (val: boolean) => void;
  expressFee: number;
  isExpressEnabled?: boolean;
}

export function CheckoutSlotPicker({
  isExpressActive,
  onToggleExpress,
  expressFee,
  isExpressEnabled = true,
}: CheckoutSlotPickerProps) {
  if (!isExpressEnabled) {
    return null;
  }

  return (
    <section aria-label="Express Pickup Upgrade" className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
          Pickup Speed
        </h2>
        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          Doorstep Pickup
        </span>
      </div>

      {/* Express 15-Minute Pickup Toggle Card */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isExpressActive}
        onClick={() => onToggleExpress(!isExpressActive)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpress(!isExpressActive);
          }
        }}
        className={`relative rounded-2xl p-3.5 border transition-all cursor-pointer select-none text-left ${
          isExpressActive
            ? "bg-white border-[#0c831f] shadow-xs ring-1 ring-[#0c831f]"
            : "bg-white border-zinc-200/80 hover:border-zinc-300"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                isExpressActive
                  ? "bg-[#0c831f] text-white border-[#0c831f]"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}
            >
              <Zap className="size-4 fill-current stroke-[1.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-zinc-950">15-Min Express</p>
                <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded">
                  Fastest
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium truncate">
                {isExpressActive
                  ? "Priority Captain Dispatch selected"
                  : "Tap to upgrade for Priority Captain Dispatch"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-black text-zinc-900 font-mono">+₹{expressFee}</span>
            <div
              className={`size-4.5 rounded-full flex items-center justify-center border transition-colors ${
                isExpressActive
                  ? "bg-[#0c831f] border-[#0c831f] text-white"
                  : "border-zinc-300 bg-white"
              }`}
            >
              {isExpressActive && <Check className="size-2.5 stroke-[3]" />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
