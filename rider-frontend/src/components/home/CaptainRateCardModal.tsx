import React from "react";
import { X, CheckCircle2, ShieldCheck, Zap, Info, IndianRupee } from "lucide-react";
import { triggerHaptic } from "../../lib/captain-audio";

interface CaptainRateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaptainRateCardModal: React.FC<CaptainRateCardModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-150 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-xl bg-blue-100 text-blue-700 font-black">
              <IndianRupee className="size-4.5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900">Captain Rate Card</h2>
              <p className="text-[11px] text-zinc-500 font-medium">Kasganj Garment Care & Laundry Fleet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="flex items-center justify-center size-8.5 rounded-full bg-zinc-150 text-zinc-600 hover:text-zinc-900 active:scale-90 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-zinc-900">
          {/* Zero Commission Highlight Banner */}
          <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900">
            <div className="flex items-center justify-center size-9 rounded-xl bg-emerald-500 text-white shrink-0 font-black">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-black">0% Platform Commission Guarantee</p>
              <p className="text-[11px] text-emerald-700 font-medium">Keep 100% of your delivery earnings & customer tips directly in your wallet.</p>
            </div>
          </div>

          {/* Rate Breakdown Table */}
          <div className="rounded-2xl border border-zinc-200 overflow-hidden bg-white shadow-2xs divide-y divide-zinc-150 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 font-bold text-zinc-700">
              <span>Fare Component</span>
              <span>Rate</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-zinc-900">Base Fare (First 1.5 km)</p>
                <p className="text-[11px] text-zinc-500">Pickup & drop initial allocation</p>
              </div>
              <span className="font-black text-zinc-900 text-sm">₹25.00</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-zinc-900">Distance Fare</p>
                <p className="text-[11px] text-zinc-500">Every km beyond 1.5 km</p>
              </div>
              <span className="font-black text-zinc-900 text-sm">₹8.00 / km</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-zinc-900">Store / Customer Waiting</p>
                <p className="text-[11px] text-zinc-500">Free first 3 mins, then per min</p>
              </div>
              <span className="font-black text-zinc-900 text-sm">₹1.00 / min</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-zinc-900">Surge Multiplier</p>
                <p className="text-[11px] text-zinc-500">High-demand laundry peak hours</p>
              </div>
              <span className="font-black text-amber-600 text-sm">Up to 1.5x</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-zinc-900">Night Delivery Bonus</p>
                <p className="text-[11px] text-zinc-500">11:00 PM to 06:00 AM</p>
              </div>
              <span className="font-black text-blue-600 text-sm">+₹15 / order</span>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-150 text-[11px] text-blue-900">
            <Info className="size-4 shrink-0 text-blue-600 mt-0.5" />
            <p>
              Tolls and local parking charges (if applicable) are reimbursed 100% on producing valid digital receipts.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 bg-white">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl font-black text-xs active:scale-98 transition-all cursor-pointer shadow-md"
          >
            Got it, Captain
          </button>
        </div>
      </div>
    </div>
  );
};
