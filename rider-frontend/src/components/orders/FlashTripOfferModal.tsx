import React, { useEffect, useState, useRef } from "react";
import {
  Bike,
  Volume2,
  VolumeX,
  Minus,
  Check,
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
  speakText,
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
  wave?: number;
  proximityTier?: "ultra_local" | "nearby_zone" | "outer_city" | string;
  proximityBadge?: string;
  estimatedArrivalMinutes?: number;
  waveTimeoutSeconds?: number;
  // Distance Rate Engine fare breakdown
  fareBreakdown?: any;
  fareBreakdownText?: string;
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

  const isExpress = Boolean(offer?.isExpress);
  const bonus = Number(offer?.riderExpressBonus || (isExpress ? 12 : 12));
  const baseFare = Number(offer?.fare || 51);
  const totalEarning = baseFare + bonus;
  const pickupDist = offer?.pickupDistanceKm || 1.2;
  const dropDist = offer?.dropDistanceKm || 1.0;

  const pickupLocationTitle = offer?.pickupTitle || offer?.customerName || "Kasganj Bus Stand";
  const pickupLocationAddress = offer?.pickupAddress || "RJ4R+P2H, Kasganj, Uttar Pradesh 207123, India";

  const dropLocationTitle = offer?.dropTitle || offer?.partnerName || "Kasganj Junction";
  const dropLocationAddress = offer?.dropAddress || "Kasganj, Uttar Pradesh 207123, India";

  // Play continuous bell, vibration, and exact voice speech from video: "₹63. Kasganj Junction."
  useEffect(() => {
    if (!offer) {
      stopOrderAlertSound();
      hasTriggeredAudioRef.current = false;
      return;
    }

    setTimeLeft(TOTAL_COUNTDOWN_SECONDS);
    setIsAccepting(false);
    setIsDeclining(false);

    if (!hasTriggeredAudioRef.current) {
      hasTriggeredAudioRef.current = true;
      try {
        unlockAudioContext();
        triggerHaptic([350, 150, 350, 150, 600, 300]);
        playTripAssignedBell();

        // Exact speech from video: "{fare} Rupees. {dropTitle}."
        setTimeout(() => {
          const destSpeech = dropLocationTitle || "Kasganj Junction";
          speakText(`${totalEarning} Rupees. ${destSpeech}.`);
        }, 350);
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
    triggerHaptic([120, 60, 240]);

    try {
      await acceptRiderOrder(offer.orderId);

      try {
        localStorage.setItem("qp_cached_active_order", JSON.stringify(offer));
        localStorage.setItem("qp_active_rider_order", JSON.stringify(offer));
      } catch {}

      playSuccessChime();
      toast.success(`🎉 Trip Accepted!`);
      onAccepted(offer.orderId, offer);
    } catch (err: any) {
      console.warn("[FlashModal] Accept order error:", err);
      stopOrderAlertSound();

      const isConflict =
        err?.status === 409 ||
        err?.status === 403 ||
        err?.kind === "conflict" ||
        /already accepted|already assigned|another|claimed|not available/i.test(err?.message || "");

      if (isConflict) {
        toast.error("❌ Yeh trip kisi aur Captain ne accept kar li!", { duration: 4000 });
        onDeclined(offer.orderId);
      } else {
        try {
          localStorage.setItem("qp_cached_active_order", JSON.stringify(offer));
          localStorage.setItem("qp_active_rider_order", JSON.stringify(offer));
        } catch {}
        playSuccessChime();
        toast.success(`🎉 Trip Accepted (Offline)!`);
        onAccepted(offer.orderId, offer);
      }
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

  // Circular timer calculation for reject button
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / TOTAL_COUNTDOWN_SECONDS) * circumference;

  // Zomato Concentric Wave & Micro-Zone (Pod) Badge
  const waveNumber = offer.wave || (pickupDist <= 1.8 ? 1 : pickupDist <= 4.0 ? 2 : 3);
  const etaMins = offer.estimatedArrivalMinutes || Math.max(2, Math.round(pickupDist * 2.8));
  const waveBadgeConfig = {
    1: {
      badgeText: offer.proximityBadge || `🟢 Ultra-Local • ${pickupDist} km (~${etaMins} min arrival)`,
      subText: "Priority Pod: Fast pickup near you",
      pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500 animate-pulse",
    },
    2: {
      badgeText: offer.proximityBadge || `⚡ Nearby Zone • ${pickupDist} km (~${etaMins} min arrival)`,
      subText: "Neighboring Zone: Cascaded to nearby fleet",
      pillClass: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
    },
    3: {
      badgeText: offer.proximityBadge || `🛵 Citywide Fleet • ${pickupDist} km (~${etaMins} min arrival)`,
      subText: "Citywide Fleet Dispatch",
      pillClass: "bg-blue-50 text-blue-700 border-blue-200",
      dotClass: "bg-blue-500",
    },
  }[waveNumber as 1 | 2 | 3] || {
    badgeText: `🟢 Fast Dispatch • ${pickupDist} km`,
    subText: "Nearest Captain Dispatch",
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  };

  return (
    <div className="fixed inset-x-0 top-3 z-[9999] flex justify-center px-3 sm:px-4 pointer-events-none select-none animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Exact Card from Video (Frame 00:02 - 00:07) */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-zinc-200/90 p-4 text-zinc-900 pointer-events-auto flex flex-col gap-3 font-sans">
        
        {/* Zomato Wave Proximity Pill Banner */}
        <div className={`flex items-center justify-between px-3 py-1 rounded-xl border text-[11px] font-semibold ${waveBadgeConfig.pillClass}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`size-2 rounded-full shrink-0 ${waveBadgeConfig.dotClass}`} />
            <span className="font-bold truncate">{waveBadgeConfig.badgeText}</span>
          </div>
          <span className="text-[10px] opacity-80 shrink-0 pl-1 font-semibold">Wave {waveNumber}</span>
        </div>

        {/* Row 1: Vehicle Badge + Big Fare Price + Sound */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {/* Vehicle Pill */}
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-bold tracking-tight w-fit">
              <Bike className="size-3.5 text-zinc-700" />
              <span>{offer.rideType === "delivery" ? "Delivery" : "Auto"}</span>
            </div>

            {/* Split Price: ₹51 + ₹12 */}
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-zinc-950 tracking-tight">
                ₹{baseFare}
              </span>
              <span className="text-xl font-black text-[#10b981] tracking-tight">
                + ₹{bonus}
              </span>
            </div>

            {/* Itemized Fare Rate Breakdown from Distance Rate Engine */}
            {offer.fareBreakdownText && (
              <div className="text-[10px] font-semibold text-zinc-600 bg-zinc-100/80 px-2 py-0.5 rounded-md border border-zinc-200/60 w-fit mt-1">
                🧾 {offer.fareBreakdownText}
              </div>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleMuteToggle}
            className="p-2 rounded-full hover:bg-zinc-100 active:scale-95 transition-all text-zinc-500 cursor-pointer"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="size-4.5 text-red-500" /> : <Volume2 className="size-4.5 text-zinc-700" />}
          </button>
        </div>

        {/* Row 2: Route Details (Pickup & Drop) */}
        <div className="flex flex-col gap-2.5 text-xs">
          {/* Pickup: Green circle */}
          <div className="flex items-start gap-2.5">
            <span className="size-2 rounded-full bg-[#10b981] mt-1 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-zinc-900 text-xs">
                {pickupDist} km
              </span>
              <span className="font-bold text-zinc-800 ml-1.5 text-xs truncate">
                {pickupLocationTitle}
              </span>
              <span className="text-zinc-400 font-normal ml-1 truncate">
                - {pickupLocationAddress}
              </span>
            </div>
          </div>

          {/* Drop: Black square */}
          <div className="flex items-start gap-2.5">
            <span className="size-2 rounded-[2px] bg-zinc-900 mt-1 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-zinc-900 text-xs">
                {dropDist} km
              </span>
              <span className="font-bold text-zinc-800 ml-1.5 text-xs truncate">
                {dropLocationTitle}
              </span>
              <span className="text-zinc-400 font-normal ml-1 truncate">
                - {dropLocationAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: Action Buttons (Circular Countdown Minus & Yellow Accept Button) */}
        <div className="flex items-center gap-3 pt-1">
          {/* Reject Circular Button with animated ring */}
          <button
            type="button"
            onClick={handleDecline}
            disabled={isAccepting || isDeclining}
            className="relative size-12 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            title="Decline"
          >
            <svg className="absolute inset-0 size-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-zinc-200"
                strokeWidth="2.5"
                fill="transparent"
              />
              <circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-red-500 transition-all duration-1000 ease-linear"
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <Minus className="size-5 stroke-[2.8] text-zinc-900" />
          </button>

          {/* Big Yellow Accept Button matching Video */}
          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting || isDeclining}
            className="flex-1 h-12 rounded-full bg-[#f59e0b] hover:bg-[#d97706] active:scale-[0.98] transition-all font-black text-sm text-zinc-950 flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-60"
          >
            {isAccepting ? (
              <span className="flex items-center gap-2">
                <span className="size-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                <span>Accepting...</span>
              </span>
            ) : (
              <span>Accept</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
