import React, { useState } from "react";
import {
  AlertTriangle,
  Bike,
  CloudRain,
  HeartPulse,
  Loader2,
  MapPin,
  PhoneOff,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cancelTripByRider } from "@/api/rider/rider-orders-api";
import { triggerHaptic } from "@/lib/captain-audio";

interface RiderCancelTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderCode?: string;
  onSuccess: () => void;
}

const CANCEL_REASONS = [
  {
    id: "vehicle_issue",
    label: "Vehicle Puncture / Breakdown",
    desc: "Tire puncture, engine trouble, mechanical defect",
    icon: Wrench,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    id: "customer_unreachable",
    label: "Customer Phone Switched Off",
    desc: "Called multiple times, no response or disconnected",
    icon: PhoneOff,
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "location_inaccessible",
    label: "Location Inaccessible / Wrong GPS",
    desc: "Road closed, barricaded, or address far outside zone",
    icon: MapPin,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "weather_waterlogging",
    label: "Heavy Rain / Waterlogging",
    desc: "Severe weather, flooding, impassable roads",
    icon: CloudRain,
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    id: "personal_emergency",
    label: "Personal / Medical Emergency",
    desc: "Sudden illness or critical family situation",
    icon: HeartPulse,
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    id: "other",
    label: "Other Issue",
    desc: "Specify reason in notes below",
    icon: AlertTriangle,
    badgeColor: "bg-zinc-100 text-zinc-700 border-zinc-200",
  },
];

export const RiderCancelTripModal: React.FC<RiderCancelTripModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderCode,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0].label);
  const [customNotes, setCustomNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirmCancel = async () => {
    triggerHaptic("heavy");
    setSubmitting(true);
    const finalReason =
      selectedReason === "Other Issue" && customNotes.trim()
        ? `Other: ${customNotes.trim()}`
        : selectedReason;

    try {
      await cancelTripByRider(orderId, finalReason);
      toast.success("Trip unassigned. Re-dispatching to nearby fleet.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel trip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
              <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" />
              <span>Cancel Pickup Trip</span>
            </div>
            <h3 className="text-base font-black text-zinc-950 mt-1">
              Order #{orderCode || orderId.slice(0, 8)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="size-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="bg-amber-50/70 border-b border-amber-200/50 p-3.5 flex items-start gap-2.5">
          <Bike className="size-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed font-medium">
            This trip will be instantly unassigned from you and forwarded to the next nearest
            Captain via Zomato Concentric Wave radar.
          </p>
        </div>

        {/* Reason Selection */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Select Reason for Cancellation:
          </p>
          <div className="space-y-2">
            {CANCEL_REASONS.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedReason === r.label;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setSelectedReason(r.label);
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                    isSelected
                      ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-500"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  }`}
                >
                  <div
                    className={`size-9 rounded-xl flex items-center justify-center shrink-0 border ${r.badgeColor}`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-900 leading-snug">{r.label}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{r.desc}</p>
                  </div>
                  <div
                    className={`size-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? "border-rose-600 bg-rose-600"
                        : "border-zinc-300 bg-white"
                    }`}
                  >
                    {isSelected && <span className="size-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedReason === "Other Issue" && (
            <div className="pt-2 animate-in fade-in duration-200">
              <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                Describe the problem:
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="E.g., Major traffic jam due to rally..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-zinc-900"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-2xl border border-zinc-300 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-100 active:scale-98 transition-all"
          >
            Keep This Trip
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={submitting}
            className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 text-white text-xs font-black shadow-md shadow-rose-600/20 hover:bg-rose-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Unassigning...</span>
              </>
            ) : (
              <span>Confirm & Unassign</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
