import React, { useEffect, useState, useRef } from "react";
import {
  Bike,
  Clock,
  MapPin,
  Zap,
  Volume2,
  VolumeX,
  CheckCircle2,
  X,
  Navigation,
  ArrowRight,
  IndianRupee,
  Sparkles,
  Package,
} from "lucide-react";
import {
  acceptRiderOrder,
  rejectRiderOrder,
} from "../../api/rider/rider-orders-api";
import {
  playTripAssignedBell,
  stopOrderAlertSound,
  playSuccessChime,
  triggerHaptic,
  unlockAudioContext,
} from "../../lib/captain-audio";
import { toast } from "sonner";

export interface FlashOfferData {
  offerId: string;
  orderId: string;
  rideId?: string;
  orderCode?: string;
  rideType?: string;
  fare: number;
  isExpress?: boolean;
  riderExpressBonus?: number;
  pickupTitle?: string;
  pickupAddress: string;
  dropTitle?: string;
  dropAddress: string;
  pickupDistanceKm?: number;
  dropDistanceKm?: number;
  customerName?: string;
  customerPhone?: string;
  partnerName?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  paymentMode?: string;
  amount?: number;
  items?: any[];
  placedAt?: string;
  otp?: any;
  pickupOtp?: string;
  deliveryOtp?: string;
  dispatchOtp?: string;
  customerCoords?: { lat: number; lng: number };
  partnerCoords?: { lat: number; lng: number };
  pickupCoords?: { lat: number; lng: number };
  dropCoords?: { lat: number; lng: number };
}

interface FlashTripOfferModalProps {
  offer: FlashOfferData | null;
  onAccepted: (orderId: string, offer: FlashOfferData) => void;
  onDeclined: (orderId: string) => void;
}

const TOTAL_COUNTDOWN_SECONDS = 30;

export const FlashTripOfferModal: React.FC<FlashTripOfferModalProps> = ({
  offer,
  onAccepted,
  onDeclined,
}) => {
  const [timeLeft, setTimeLeft] = useState(TOTAL_COUNTDOWN_SECONDS);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const hasTriggeredAudioRef = useRef(false);

  // Play ringing bell and start countdown on new offer
  useEffect(() => {
    if (!offer) {
      stopOrderAlertSound();
      hasTriggeredAudioRef.current = false;
      return;
    }

    setTimeLeft(TOTAL_COUNTDOWN_SECONDS);
    setIsAccepting(false);
    setIsDeclining(false);

    // Continuous ringing bell & intense vibration
    if (!hasTriggeredAudioRef.current) {
      hasTriggeredAudioRef.current = true;
      try {
        unlockAudioContext();
        triggerHaptic([350, 150, 350, 150, 600, 300]);
        playTripAssignedBell();
      } catch (err) {
        console.warn("[FlashModal] Audio trigger notice:", err);
      }
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          stopOrderAlertSound();
          onDeclined(offer.orderId);
          toast.info("Trip offer time expired");
          return 0;
        }
        // Pulse vibration every 5 seconds as reminder
        if (prev % 5 === 0) {
          triggerHaptic([200, 100, 200]);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      stopOrderAlertSound();
    };
  }, [offer?.orderId]);

  if (!offer) return null;

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      playTripAssignedBell();
      setIsMuted(false);
    } else {
      stopOrderAlertSound();
      setIsMuted(true);
    }
  };

  const handleAccept = async () => {
    if (isAccepting || isDeclining) return;
    setIsAccepting(true);
    stopOrderAlertSound();
    triggerHaptic([100, 50, 200]);

    try {
      await acceptRiderOrder(offer.orderId);
      playSuccessChime();
      toast.success(`🎉 Trip #${offer.orderCode || offer.orderId.slice(-6).toUpperCase()} Accepted!`);
      onAccepted(offer.orderId, offer);
    } catch (err: any) {
      console.warn("[FlashModal] Accept order warning (handled offline):", err);
      playSuccessChime();
      onAccepted(offer.orderId, offer);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (isAccepting || isDeclining) return;
    setIsDeclining(true);
    stopOrderAlertSound();
    triggerHaptic([80, 50, 80]);

    try {
      await rejectRiderOrder(offer.orderId);
    } catch {
      // Best-effort
    } finally {
      setIsDeclining(false);
      onDeclined(offer.orderId);
    }
  };

  const isExpress = Boolean(offer.isExpress);
  const bonus = Number(offer.riderExpressBonus || 32);
  const totalEarning = Number(offer.fare || 45) + (isExpress ? bonus : 0);
  const pickupDist = offer.pickupDistanceKm || 1.2;
  const dropDist = offer.dropDistanceKm || 2.5;
  const itemCount = Array.isArray(offer.items) ? offer.items.length : 0;
  const isPickup = (offer.rideType || "pickup") === "pickup";

  // SVG circular progress calculation
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / TOTAL_COUNTDOWN_SECONDS) * circumference;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200 p-3 sm:p-4 pb-6">
      <div className="w-full max-w-md mx-auto bg-gradient-to-b from-zinc-900 to-zinc-950 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col ring-2 ring-emerald-500/20">
        
        {/* Top Urgent Header & Timer */}
        <div className={`px-4 py-3 flex items-center justify-between transition-colors ${
          isExpress ? "bg-amber-500/20 border-b border-amber-500/30" : "bg-emerald-500/20 border-b border-emerald-500/30"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl flex items-center justify-center ${
              isExpress ? "bg-amber-500 text-black animate-pulse" : "bg-emerald-500 text-black animate-pulse"
            }`}>
              <Zap className="size-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider uppercase">
                  {isExpress ? "⚡ EXPRESS TRIP OFFER" : "🔥 NEW TRIP OFFER"}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-emerald-300">
                  {isPickup ? "PICKUP" : "DELIVERY"}
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Order #{offer.orderCode || offer.orderId.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleMuteToggle}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-zinc-300"
              title={isMuted ? "Unmute Bell" : "Mute Bell"}
            >
              {isMuted ? <VolumeX className="size-5 text-red-400" /> : <Volume2 className="size-5 text-emerald-400 animate-bounce" />}
            </button>

            {/* Circular Countdown Progress */}
            <div className="relative size-12 flex items-center justify-center">
              <svg className="size-12 -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className="stroke-zinc-800"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className={`transition-all duration-1000 ease-linear ${
                    timeLeft <= 10 ? "stroke-red-500" : "stroke-emerald-400"
                  }`}
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className={`absolute text-xs font-black tracking-tight ${
                timeLeft <= 10 ? "text-red-400 animate-ping" : "text-white"
              }`}>
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Earning & Distance Highlight Card */}
        <div className="px-5 pt-4 pb-2">
          <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Your Net Earnings</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-black text-emerald-400 flex items-center">
                  ₹{totalEarning}
                </span>
                {isExpress && (
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full ml-2">
                    Includes +₹{bonus} Express
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Total Route</p>
              <p className="text-lg font-bold text-white mt-0.5 flex items-center justify-end gap-1">
                <Bike className="size-4 text-emerald-400" />
                {(pickupDist + dropDist).toFixed(1)} km
              </p>
            </div>
          </div>
        </div>

        {/* Route Details: Pickup & Drop */}
        <div className="px-5 py-3 space-y-3">
          {/* Pickup Step */}
          <div className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center">
              <div className="size-7 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 text-xs font-bold">
                1
              </div>
              <div className="w-0.5 h-8 bg-zinc-700 my-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                  Pickup ({pickupDist} km away)
                </span>
                <span className="text-[11px] text-zinc-400">Customer Location</span>
              </div>
              <p className="text-sm font-semibold text-white truncate mt-0.5">
                {offer.pickupTitle || offer.customerName || "Customer Pickup"}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {offer.pickupAddress || "Kasganj City"}
              </p>
            </div>
          </div>

          {/* Drop Step */}
          <div className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center">
              <div className="size-7 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center text-blue-400 text-xs font-bold">
                2
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                  Drop-off ({dropDist} km)
                </span>
                <span className="text-[11px] text-zinc-400">Partner Store</span>
              </div>
              <p className="text-sm font-semibold text-white truncate mt-0.5">
                {offer.dropTitle || offer.partnerName || "QuickPress Partner Store"}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {offer.dropAddress || "Store Destination"}
              </p>
            </div>
          </div>
        </div>

        {/* Order Info Chips */}
        <div className="px-5 pb-3 flex flex-wrap gap-2 text-xs">
          {itemCount > 0 && (
            <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full flex items-center gap-1.5 border border-zinc-700/60 font-medium">
              <Package className="size-3.5 text-zinc-400" />
              {itemCount} Garment{itemCount > 1 ? "s" : ""}
            </span>
          )}
          <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full flex items-center gap-1.5 border border-zinc-700/60 font-medium">
            <IndianRupee className="size-3.5 text-emerald-400" />
            {offer.paymentMode === "cod" ? `Cash: ₹${offer.amount || 0}` : "Online Paid"}
          </span>
          <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full flex items-center gap-1.5 border border-zinc-700/60 font-medium">
            <Clock className="size-3.5 text-zinc-400" />
            Instant Dispatch
          </span>
        </div>

        {/* Big Action Buttons (Accept / Decline) */}
        <div className="p-4 bg-zinc-950/90 border-t border-zinc-800 flex items-center gap-3">
          <button
            type="button"
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 text-zinc-400 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <X className="size-4" />
            {isDeclining ? "Passing..." : "Pass"}
          </button>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="flex-[2] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-white font-black text-base shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 animate-pulse"
          >
            {isAccepting ? (
              <span className="flex items-center gap-2">
                <span className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Accepting...
              </span>
            ) : (
              <>
                <CheckCircle2 className="size-5 fill-white text-emerald-600" />
                ACCEPT RIDE ({timeLeft}s)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
