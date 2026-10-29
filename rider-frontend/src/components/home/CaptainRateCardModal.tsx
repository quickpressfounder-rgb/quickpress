import React, { useEffect } from "react";
import { X, ShieldCheck, Info, IndianRupee } from "lucide-react";
import { triggerHaptic } from "../../lib/captain-audio";

interface CaptainRateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaptainRateCardModal: React.FC<CaptainRateCardModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Safe Native Android Back Button Interception
  useEffect(() => {
    if (!isOpen) return;

    let cleanup: (() => void) | null = null;
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      import("@capacitor/app")
        .then(({ App }) => {
          App.addListener("backButton", () => {
            triggerHaptic(20);
            onClose();
          })
            .then((h) => {
              cleanup = () => h.remove();
            })
            .catch(() => {});
        })
        .catch(() => {});
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col text-slate-900 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#F8F9FA] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-xl bg-slate-100 text-slate-900 font-black">
              <IndianRupee className="size-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950">Captain Rate Card</h2>
              <p className="text-[11px] text-slate-500 font-medium">Kasganj Garment Care & Laundry Fleet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="flex items-center justify-center size-8.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-90 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4.5 stroke-[2.2]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Zero Commission Highlight Banner */}
          <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950">
            <div className="flex items-center justify-center size-9 rounded-xl bg-emerald-600 text-white shrink-0 font-black">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-black">0% Platform Commission Guarantee</p>
              <p className="text-[11px] text-emerald-800 font-medium">
                Keep 100% of your delivery fares and customer tips directly in your wallet.
              </p>
            </div>
          </div>

          {/* Rate Breakdown Table */}
          <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-2xs divide-y divide-slate-100 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-[#F8F9FA] font-bold text-slate-700">
              <span>Fare Component</span>
              <span>Rate</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-slate-950">Base Fare (First 1.5 km)</p>
                <p className="text-[11px] text-slate-500">Pickup and drop initial allocation</p>
              </div>
              <span className="font-black text-slate-950 text-sm">₹25.00</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-slate-950">Distance Fare</p>
                <p className="text-[11px] text-slate-500">Every km beyond 1.5 km</p>
              </div>
              <span className="font-black text-slate-950 text-sm">₹8.00 / km</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-slate-950">Store / Customer Waiting</p>
                <p className="text-[11px] text-slate-500">Free first 3 mins, then per min</p>
              </div>
              <span className="font-black text-slate-950 text-sm">₹1.00 / min</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-slate-950">Surge Multiplier</p>
                <p className="text-[11px] text-slate-500">High-demand laundry peak hours</p>
              </div>
              <span className="font-black text-amber-700 text-sm">Up to 1.5x</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="font-bold text-slate-950">Night Delivery Bonus</p>
                <p className="text-[11px] text-slate-500">11:00 PM to 06:00 AM</p>
              </div>
              <span className="font-black text-slate-950 text-sm">+₹15 / order</span>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700">
            <Info className="size-4 shrink-0 text-slate-600 mt-0.5" />
            <p>
              Tolls and local parking charges (if applicable) are reimbursed 100% on producing valid digital receipts.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t border-slate-100 bg-white shrink-0"
          style={{ paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 16px), 24px)" }}
        >
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-full font-black text-sm active:scale-98 transition cursor-pointer shadow-xs"
          >
            Got it, Captain
          </button>
        </div>
      </div>
    </div>
  );
};
