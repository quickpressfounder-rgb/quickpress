import React from "react";
import {
  Bike,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { triggerHaptic } from "../../lib/captain-audio";

export interface TripDetailData {
  orderId: string;
  orderCode?: string;
  customerName?: string;
  customerPhone?: string;
  customerPhoneMasked?: string;
  pickupAddress: string;
  pickupTitle?: string;
  dropAddress: string;
  dropTitle?: string;
  partnerName?: string;
  partnerAddress?: string;
  partnerPhone?: string;
  distanceKm?: number;
  durationMinutes?: number;
  fare: number;
  baseFare?: number;
  distanceBonus?: number;
  surgeBonus?: number;
  expressBonus?: number;
  tipAmount?: number;
  paymentMode?: string;
  amount?: number;
  pickupOtp?: string;
  dispatchOtp?: string;
  deliveryOtp?: string;
  items?: any[];
  bagCount?: number;
  rideType?: string;
  status?: string;
}

interface RiderTripDetailModalProps {
  trip: TripDetailData;
  isOpen: boolean;
  onClose: () => void;
}

export const RiderTripDetailModal: React.FC<RiderTripDetailModalProps> = ({
  trip,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const baseFare = Number(trip.baseFare ?? 35);
  const distanceKm = Number(trip.distanceKm ?? 2.8);
  const distanceBonus = Number(
    trip.distanceBonus ?? (distanceKm > 2 ? Math.round((distanceKm - 2) * 12) : 0)
  );
  const surgeBonus = Number(trip.surgeBonus ?? 0);
  const expressBonus = Number(trip.expressBonus ?? 0);
  const tipAmount = Number(trip.tipAmount ?? 0);
  const netEarnings = Number(trip.fare || baseFare + distanceBonus + surgeBonus + expressBonus + tipAmount);

  const isCod = (trip.paymentMode || "").toLowerCase().includes("cod") || (trip.paymentMode || "").toLowerCase().includes("cash");
  const codAmount = Number(trip.amount || netEarnings);

  const handleOpenMaps = (addr: string) => {
    triggerHaptic(20);
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    window.open(url, "_blank");
  };

  const handleCall = (phone?: string) => {
    if (!phone) return;
    triggerHaptic(20);
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 animate-in slide-in-from-bottom-6 duration-200"
        role="dialog"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-white border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Bike className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-zinc-950">
                  Trip #{trip.orderCode || trip.orderId.slice(-6).toUpperCase()}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {trip.status || "Active Trip"}
                </span>
              </div>
              <p className="text-[11px] font-medium text-zinc-500">
                Detailed Route & Fare Breakdown
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-full hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Net Earnings Highlight Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                <Wallet className="size-3.5" />
                <span>Net Captain Earning</span>
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs flex items-center gap-1">
                <ShieldCheck className="size-3" />
                <span>0% Commission</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <h2 className="text-3xl font-black tracking-tight">₹{netEarnings.toFixed(2)}</h2>
                <p className="text-[11px] text-emerald-100 font-medium">Direct Bank / UPI Settlement</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-white flex items-center gap-1 justify-end">
                  <Clock className="size-3.5" />
                  <span>~{trip.durationMinutes || 18} mins</span>
                </p>
                <p className="text-[11px] text-emerald-100">{distanceKm.toFixed(1)} km total</p>
              </div>
            </div>
          </div>

          {/* Itemized Fare Breakdown Card */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-emerald-600" />
              <span>Earnings Fare Slip</span>
            </h4>

            <div className="space-y-2 text-xs divide-y divide-zinc-200/60">
              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-600 font-medium">Base Delivery Fare</span>
                <span className="font-bold text-zinc-900">₹{baseFare.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1 text-zinc-600 font-medium">
                  <span>Distance Pay ({distanceKm.toFixed(1)} km)</span>
                </div>
                <span className="font-bold text-zinc-900">₹{distanceBonus.toFixed(2)}</span>
              </div>
              {surgeBonus > 0 && (
                <div className="flex items-center justify-between pt-2 text-purple-700">
                  <div className="flex items-center gap-1 font-semibold">
                    <Zap className="size-3 text-purple-600" />
                    <span>Peak Time Surge</span>
                  </div>
                  <span className="font-black">+₹{surgeBonus.toFixed(2)}</span>
                </div>
              )}
              {expressBonus > 0 && (
                <div className="flex items-center justify-between pt-2 text-amber-700">
                  <div className="flex items-center gap-1 font-semibold">
                    <Zap className="size-3 text-amber-600" />
                    <span>Express Priority Bonus</span>
                  </div>
                  <span className="font-black">+₹{expressBonus.toFixed(2)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex items-center justify-between pt-2 text-emerald-700">
                  <span className="font-semibold">Customer Cash Tip</span>
                  <span className="font-black">+₹{tipAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 text-emerald-700 font-semibold">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  <span>Platform Fee (Commission Free)</span>
                </div>
                <span className="font-black">₹0.00</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-sm font-black text-zinc-950 border-t border-zinc-300">
                <span>Total Payout</span>
                <span className="text-emerald-700">₹{netEarnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment & Cash Collection Card */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              isCod
                ? "bg-amber-50/80 border-amber-200 text-amber-950"
                : "bg-blue-50/80 border-blue-200 text-blue-950"
            }`}
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-current">
                {isCod ? "Cash on Delivery (COD)" : "Online Prepaid UPI"}
              </span>
              <p className="text-xs font-bold mt-1">
                {isCod
                  ? `Collect ₹${codAmount.toFixed(2)} from customer at delivery`
                  : "No cash to collect! Order paid online ✓"}
              </p>
            </div>
            {isCod && (
              <span className="text-base font-black text-amber-900">
                ₹{codAmount.toFixed(0)}
              </span>
            )}
          </div>

          {/* Route & Waypoints */}
          <div className="p-4 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <Navigation className="size-3.5 text-blue-600" />
              <span>Full Route & Landmarks</span>
            </h4>

            {/* Waypoint 1: Pickup */}
            <div className="flex items-start gap-3 relative pb-4">
              <div className="flex flex-col items-center">
                <div className="size-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                  A
                </div>
                <div className="w-0.5 h-10 bg-zinc-200 mt-1" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-900">
                    {trip.pickupTitle || "Customer Pickup"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenMaps(trip.pickupAddress)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Maps</span>
                    <ExternalLink className="size-2.5" />
                  </button>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">{trip.pickupAddress}</p>
                {trip.pickupOtp && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-[10px] font-black text-zinc-700 mt-1">
                    <span>Pickup OTP:</span>
                    <span className="font-mono text-emerald-700">{trip.pickupOtp}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Waypoint 2: Partner Store */}
            <div className="flex items-start gap-3 relative pb-4">
              <div className="flex flex-col items-center">
                <div className="size-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs shrink-0">
                  <Building2 className="size-3.5" />
                </div>
                <div className="w-0.5 h-10 bg-zinc-200 mt-1" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-900">
                    {trip.partnerName || "QuickPress Partner Store"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenMaps(trip.partnerAddress || trip.pickupAddress)}
                    className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Maps</span>
                    <ExternalLink className="size-2.5" />
                  </button>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {trip.partnerAddress || "QuickPress Partner Store Hub, Soron Gate, Kasganj"}
                </p>
                {trip.dispatchOtp && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-[10px] font-black text-zinc-700 mt-1">
                    <span>Store Handover OTP:</span>
                    <span className="font-mono text-purple-700">{trip.dispatchOtp}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Waypoint 3: Customer Drop */}
            <div className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                B
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-900">
                    {trip.customerName || trip.dropTitle || "Customer Drop Location"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenMaps(trip.dropAddress)}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Maps</span>
                    <ExternalLink className="size-2.5" />
                  </button>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">{trip.dropAddress}</p>
                {trip.deliveryOtp && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-[10px] font-black text-zinc-700 mt-1">
                    <span>Delivery OTP:</span>
                    <span className="font-mono text-emerald-700">{trip.deliveryOtp}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Garments & Bag Summary */}
          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-white text-zinc-700 flex items-center justify-center border border-zinc-200">
                <Package className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-900">
                  {trip.bagCount || trip.items?.length || 2} Garment Bags
                </p>
                <p className="text-[11px] text-zinc-500 font-medium">Wash, Fold & Steam Ironing</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Barcoded ✓
            </span>
          </div>
        </div>

        {/* Footer with Actions */}
        <footer className="sticky bottom-0 z-10 px-4 py-3 bg-white border-t border-zinc-100 flex items-center gap-2">
          {trip.customerPhone && (
            <button
              type="button"
              onClick={() => handleCall(trip.customerPhone)}
              className="flex-1 py-2.5 px-3 rounded-xl border border-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
            >
              <Phone className="size-3.5 text-emerald-600" />
              <span>Call Customer</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleOpenMaps(trip.dropAddress || trip.pickupAddress)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Navigation className="size-3.5" />
            <span>Open GPS Map</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
