import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  HeartPulse,
  Home,
  Info,
  Loader2,
  MapPin,
  ShieldAlert,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { reportUnableToDeliver } from "@/api/rider/rider-orders-api";
import { triggerHaptic } from "@/lib/captain-audio";

interface RiderUnableToDeliverModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderCode?: string;
  currentCoords?: { lat: number; lng: number } | null;
  onSuccess: (data: {
    handoverOtp: string;
    pickupLegPayout: number;
    deliveryLegPayout: number;
  }) => void;
}

const REASONS = [
  {
    id: "vehicle_breakdown",
    icon: Wrench,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    title: "Vehicle Problem",
    desc: "Tire puncture, engine breakdown, battery or mechanical issue",
  },
  {
    id: "accident_health",
    icon: ShieldAlert,
    color: "text-rose-600 bg-rose-50 border-rose-200",
    title: "Accident / Collision",
    desc: "Involved in a minor road accident or vehicle collision",
  },
  {
    id: "medical_emergency",
    icon: HeartPulse,
    color: "text-red-600 bg-red-50 border-red-200",
    title: "Medical / Health Emergency",
    desc: "Sudden illness, severe pain, injury, or feeling unwell to ride",
  },
  {
    id: "personal_emergency",
    icon: Home,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    title: "Urgent Personal Emergency",
    desc: "Family emergency or urgent personal situation requiring departure",
  },
  {
    id: "other",
    icon: AlertTriangle,
    color: "text-slate-600 bg-slate-50 border-slate-200",
    title: "Other Operational Issue",
    desc: "Severe weather, road closure, or impassable route",
  },
];

export const RiderUnableToDeliverModal: React.FC<RiderUnableToDeliverModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderCode,
  currentCoords,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("vehicle_breakdown");
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [addressPreview, setAddressPreview] = useState<string>("Detecting current GPS location...");
  const [latLng, setLatLng] = useState<{ lat: number; lng: number }>({
    lat: currentCoords?.lat || 0,
    lng: currentCoords?.lng || 0,
  });

  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLatLng({ lat, lng });
          setAddressPreview(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
          // Try reverse geocoding via OpenStreetMap nominatim
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then((r) => r.json())
            .then((d) => {
              if (d && d.display_name) {
                setAddressPreview(d.display_name);
              }
            })
            .catch(() => {
              setAddressPreview(`Near Current GPS Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            });
        },
        () => {
          if (currentCoords) {
            setLatLng(currentCoords);
            setAddressPreview(`GPS Location: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`);
          } else {
            setAddressPreview("Kasganj Operational Zone");
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen, currentCoords]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      triggerHaptic();

      const res = await reportUnableToDeliver(orderId, {
        reason: selectedReason,
        remarks: remarks.trim(),
        location: {
          lat: latLng.lat,
          lng: latLng.lng,
          address: addressPreview,
        },
      });

      if (res && res.ok) {
        toast.success("Reassignment offer dispatched to nearby Captains!");
        triggerHaptic();
        onSuccess({
          handoverOtp: res.handoverOtp,
          pickupLegPayout: res.pickupLegPayout,
          deliveryLegPayout: res.deliveryLegPayout,
        });
        onClose();
      } else {
        toast.error(res?.message || "Failed to initiate handover. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit request. Please check internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Unable to Complete Delivery</h2>
              <p className="text-xs text-red-100 font-medium">
                Order #{orderCode || orderId.slice(-6)} · Emergency Handover
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Payout & Handover Policy Info */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 leading-relaxed space-y-1">
              <p>
                <span className="font-bold text-amber-900">Pickup Pay & 25% Service Fee:</span> You will receive{" "}
                <span className="font-bold text-emerald-800">75% net pickup earnings</span> credited to your wallet.
                A standard <span className="font-bold text-rose-700">25% opt-out fee</span> is deducted for releasing the delivery leg.
              </p>
              <p className="text-[11px] text-amber-800 font-medium">
                Clothes remain safely at Partner Store. The replacement delivery Captain will be assigned with a{" "}
                <span className="font-bold text-blue-700">+20% extra bonus</span>.
              </p>
            </div>
          </div>

          {/* Select Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Reason for Inability to Deliver
            </label>
            <div className="space-y-2">
              {REASONS.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setSelectedReason(r.id);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                      isSelected
                        ? "border-red-500 bg-red-50/60 shadow-sm"
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${r.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isSelected ? "text-red-950" : "text-slate-800"}`}>
                          {r.title}
                        </span>
                        {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Handover GPS Location */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
              <MapPin className="w-4 h-4 text-red-600" />
              Handover Meeting Location (Your Current GPS)
            </div>
            <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 line-clamp-2">
              {addressPreview}
            </p>
            <p className="text-[11px] text-slate-500 italic">
              ⚠️ Please stay safely at this exact spot. The replacement Captain will navigate directly to these
              coordinates.
            </p>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Near Bharat Petrol Pump, wearing black jacket with red helmet"
              className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-3"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 16px, 16px)" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 active:scale-98 transition-all"
          >
            Cancel & Continue Trip
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-500/25 hover:from-red-700 hover:to-rose-700 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Dispatching Offer...
              </>
            ) : (
              <>
                <Bike className="w-4 h-4" />
                Request Captain Handover
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
