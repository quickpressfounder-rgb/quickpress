import React, { useEffect, useState } from "react";
import { Bike, X, Package, Shirt } from "lucide-react";
import { useLanguage } from "../../lib/i18n";
import { stopOrderAlertSound } from "../../lib/captain-audio";

export interface OfferItem {
  id: string;
  orderId?: string;
  type?: "bike" | "laundry" | "parcel";
  pickupTitle?: string;
  pickupAddress: string;
  dropTitle?: string;
  dropAddress: string;
  pickupDistanceKm?: number;
  dropDistanceKm?: number;
  fare?: number;
  customerName?: string;
  expiresInSeconds?: number;
}

interface MultiOrderDispatchQueueProps {
  offers: OfferItem[];
  onAccept: (offer: OfferItem) => void;
  onReject: (offer: OfferItem) => void;
}

export const MultiOrderDispatchQueue: React.FC<MultiOrderDispatchQueueProps> = ({
  offers,
  onAccept,
  onReject,
}) => {
  const { t } = useLanguage();

  if (!offers || offers.length === 0) return null;

  const [countdown, setCountdown] = useState(offers[0].expiresInSeconds || 10);

  // Live 10s countdown timer for the active top offer
  useEffect(() => {
    setCountdown(offers[0].expiresInSeconds || 10);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onReject(offers[0]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [offers[0]?.id]);

  const totalOrders = offers.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-neutral-900 select-none overflow-y-auto animate-in fade-in duration-200">
      {/* 1. Header (Exact Match to Screenshot: "2 Orders") */}
      <div className="sticky top-0 z-20 px-5 pt-4 pb-3 bg-white border-b border-neutral-100 flex items-center justify-between">
        <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
          {totalOrders} {totalOrders > 1 ? "Orders" : "Order"}
        </h2>
        <span className="text-xs font-black text-[#00C853] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Live Offers
        </span>
      </div>

      {/* 2. Main Layout: Left Queue Rail + Stacked Order Cards (Exact Match to Screenshot) */}
      <div className="flex flex-1 px-3.5 py-3 gap-3">
        {/* Left Vertical Rail with Circular Countdown Ring (Screenshot) */}
        <div className="flex flex-col items-center py-3 w-10 space-y-12 shrink-0">
          {offers.map((_, idx) => (
            <div key={idx} className="flex flex-col items-center gap-6">
              {idx === 0 ? (
                // Active Countdown Ring (Top order)
                <div className="relative flex items-center justify-center w-8 h-8">
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-neutral-200"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#00C853] transition-all duration-1000 ease-linear"
                      strokeDasharray={`${(countdown / 10) * 100}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
              ) : (
                // Inactive Stacked Order Marker
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-emerald-300 bg-white shadow-xs">
                  <Bike className="w-4 h-4 text-neutral-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stacked Order Cards (Exact Match to Screenshot) */}
        <div className="flex-1 space-y-4 pb-12">
          {offers.map((offer, idx) => {
            const isTop = idx === 0;
            const pickupKm = (offer.pickupDistanceKm ?? (idx === 0 ? 0.3 : 0.8)).toFixed(1);
            const dropKm = (offer.dropDistanceKm ?? (idx === 0 ? 3.6 : 8.2)).toFixed(1);

            return (
              <div
                key={offer.id}
                className={`p-4 bg-white rounded-3xl border shadow-md space-y-3.5 transition-all ${
                  isTop ? "border-neutral-300 shadow-lg" : "border-neutral-200"
                }`}
              >
                {/* Header: Vehicle Type Badge (Dark Circle + "Bike") */}
                <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-100">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-800 text-white shadow-xs">
                    {offer.type === "laundry" ? (
                      <Shirt className="w-4 h-4" />
                    ) : offer.type === "parcel" ? (
                      <Package className="w-4 h-4" />
                    ) : (
                      <Bike className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-sm font-black text-neutral-900">
                    {offer.type === "laundry" ? "Laundry" : offer.type === "parcel" ? "Parcel" : "Bike"}
                  </span>
                  {offer.fare && (
                    <span className="ml-auto text-sm font-black text-neutral-950">
                      ₹{offer.fare.toFixed(0)}
                    </span>
                  )}
                </div>

                {/* Pickup Route Row (Green Dot) */}
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center justify-center w-3.5 h-3.5 mt-1 rounded-full border-2 border-[#00C853] bg-white shrink-0" />
                  <div>
                    <h4 className="text-sm font-black text-neutral-950 leading-snug">
                      {offer.pickupTitle || "Pickup Hub"}
                    </h4>
                    <p className="text-xs text-neutral-500 font-medium line-clamp-2 mt-0.5 leading-relaxed">
                      {offer.pickupAddress || "Pickup Location"}
                    </p>
                  </div>
                </div>

                {/* Drop Route Row (Red Dot) */}
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center justify-center w-3.5 h-3.5 mt-1 rounded-full border-2 border-rose-500 bg-white shrink-0" />
                  <div>
                    <h4 className="text-sm font-black text-neutral-950 leading-snug">
                      {offer.dropTitle || "Drop Destination"}
                    </h4>
                    <p className="text-xs text-neutral-500 font-medium line-clamp-2 mt-0.5 leading-relaxed">
                      {offer.dropAddress || "Delivery Address"}
                    </p>
                  </div>
                </div>

                {/* 2-Column Distances (Pickup 0.3 Km | Drop 3.6 Km) */}
                <div className="grid grid-cols-2 pt-2 border-t border-neutral-100 gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-neutral-500 block">Pickup</span>
                    <span className="text-sm font-black text-neutral-950">{pickupKm} Km</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-neutral-500 block">Drop</span>
                    <span className="text-sm font-black text-neutral-950">{dropKm} Km</span>
                  </div>
                </div>

                {/* Action Buttons: [ ✕ ] Reject and Yellow [ Accept (10) ] */}
                <div className="flex items-center gap-2.5 pt-2">
                  {/* Square Reject Button [ ✕ ] */}
                  <button
                    type="button"
                    onClick={() => {
                      stopOrderAlertSound();
                      onReject(offer);
                    }}
                    className="flex items-center justify-center w-14 h-12.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-2xl border border-neutral-200 active:scale-95 transition-all"
                    aria-label="Reject Order"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Attention Yellow Accept Button */}
                  <button
                    type="button"
                    onClick={() => {
                      stopOrderAlertSound();
                      onAccept(offer);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-12.5 bg-[#FFC400] hover:bg-[#FBBF24] active:bg-[#F59E0B] text-neutral-950 font-black text-base rounded-2xl shadow-md active:scale-98 transition-all"
                  >
                    <span>Accept</span>
                    {isTop && (
                      <span className="flex items-center justify-center min-w-[28px] h-6.5 px-1.5 bg-white text-neutral-950 text-xs font-black rounded-full border border-neutral-300 shadow-xs">
                        {countdown}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
