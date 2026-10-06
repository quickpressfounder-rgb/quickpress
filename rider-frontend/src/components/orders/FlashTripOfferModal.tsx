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
  Globe,
  Compass,
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
  speakOrderAlert,
  getAudioLanguage,
  setAudioLanguage,
} from "../../lib/captain-audio";
import { SwipeActionButton } from "../common/SwipeActionButton";
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
  const [lang, setLang] = useState<"hi" | "en">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("qp_captain_audio_lang");
      return stored === "en-IN" ? "en" : "hi";
    }
    return "hi";
  });
  const hasTriggeredAudioRef = useRef(false);

  const isHi = lang === "hi";

  const isExpress = Boolean(offer?.isExpress);
  const bonus = Number(offer?.riderExpressBonus || (isExpress ? 32 : 0));
  const baseFare = Number(offer?.fare || 45);
  const totalEarning = baseFare + bonus;
  const pickupDist = offer?.pickupDistanceKm || 1.2;
  const dropDist = offer?.dropDistanceKm || 2.5;
  const totalDist = Number((pickupDist + dropDist).toFixed(1));
  const itemCount = Array.isArray(offer?.items) ? offer.items.length : 0;
  const isPickup = (offer?.rideType || "pickup") === "pickup";

  // Play ringing bell, trigger haptic, and speak voice announcement on new offer
  useEffect(() => {
    if (!offer) {
      stopOrderAlertSound();
      hasTriggeredAudioRef.current = false;
      return;
    }

    setTimeLeft(TOTAL_COUNTDOWN_SECONDS);
    setIsAccepting(false);
    setIsDeclining(false);

    // Continuous road siren & high-decibel vibration + voice prompt
    if (!hasTriggeredAudioRef.current) {
      hasTriggeredAudioRef.current = true;
      try {
        unlockAudioContext();
        triggerHaptic([350, 150, 350, 150, 600, 300]);
        playTripAssignedBell();

        // High-volume spoken prompt in preferred Indian language
        setTimeout(() => {
          speakOrderAlert(totalEarning, offer.pickupTitle, offer.dropTitle);
        }, 400);
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
          toast.info(isHi ? "ऑर्डर का समय समाप्त हो गया" : "Trip offer time expired");
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

  const handleLanguageToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLang = lang === "hi" ? "en" : "hi";
    setLang(nextLang);
    setAudioLanguage(nextLang === "hi" ? "hi-IN" : "en-IN");
    triggerHaptic(50);
    toast.success(nextLang === "hi" ? "भाषा: हिन्दी सेट की गई 🇮🇳" : "Language: English set 🇬🇧");
  };

  const handleAccept = async () => {
    if (isAccepting || isDeclining) return;
    setIsAccepting(true);
    stopOrderAlertSound();
    triggerHaptic([120, 60, 240]);

    // Offline Resilience: Immediately cache trip in local memory
    try {
      localStorage.setItem("qp_cached_active_order", JSON.stringify(offer));
      localStorage.setItem("qp_active_rider_order", JSON.stringify(offer));
    } catch {}

    try {
      await acceptRiderOrder(offer.orderId);
      playSuccessChime();
      toast.success(
        isHi
          ? `🎉 ट्रिप #${offer.orderCode || offer.orderId.slice(-6).toUpperCase()} स्वीकार कर ली गई!`
          : `🎉 Trip #${offer.orderCode || offer.orderId.slice(-6).toUpperCase()} Accepted!`
      );
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

  // Launch Google Maps Direction Preview in bike navigation mode
  const handleOpenMapPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(40);
    const pCoords = offer.pickupCoords || offer.customerCoords;
    const dest = pCoords ? `${pCoords.lat},${pCoords.lng}` : encodeURIComponent(offer.pickupAddress || "Kasganj");
    const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=two_wheeler&dir_action=navigate`;
    window.open(mapUrl, "_blank", "noopener,noreferrer");
  };

  // SVG circular progress calculation
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / TOTAL_COUNTDOWN_SECONDS) * circumference;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/90 backdrop-blur-md animate-in fade-in duration-200 p-3 sm:p-4 pb-6">
      <div className="w-full max-w-md mx-auto bg-black border-2 border-emerald-500/60 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col ring-4 ring-emerald-500/20">
        
        {/* Top High-Urgency Header */}
        <div className={`px-4 py-3.5 flex items-center justify-between transition-colors ${
          isExpress ? "bg-amber-500/25 border-b border-amber-500/40" : "bg-emerald-500/25 border-b border-emerald-500/40"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl flex items-center justify-center ${
              isExpress ? "bg-amber-400 text-black animate-pulse" : "bg-emerald-400 text-black animate-pulse"
            }`}>
              <Zap className="size-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider uppercase text-white">
                  {isExpress
                    ? (isHi ? "⚡ एक्सप्रेस ऑर्डर" : "⚡ EXPRESS TRIP")
                    : (isHi ? "🔥 नया ट्रिप ऑर्डर" : "🔥 NEW TRIP OFFER")}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-black bg-white/15 text-emerald-300">
                  {isPickup ? (isHi ? "पिकअप" : "PICKUP") : (isHi ? "डिलीवरी" : "DELIVERY")}
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-medium">
                {isHi ? "ऑर्डर" : "Order"} #{offer.orderCode || offer.orderId.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Quick Toggle */}
            <button
              onClick={handleLanguageToggle}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold text-zinc-200 flex items-center gap-1 border border-white/15"
              title="Toggle Language / भाषा बदलें"
            >
              <Globe className="size-3.5 text-emerald-400" />
              {isHi ? "हिन्दी" : "EN"}
            </button>

            {/* Audio Mute/Unmute */}
            <button
              onClick={handleMuteToggle}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-zinc-300"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted ? <VolumeX className="size-5 text-red-400" /> : <Volume2 className="size-5 text-emerald-400 animate-bounce" />}
            </button>

            {/* Circular Countdown Progress */}
            <div className="relative size-11 flex items-center justify-center">
              <svg className="size-11 -rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  className="stroke-zinc-800"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="22"
                  cy="22"
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

        {/* High Sunlight Contrast Earning & Distance Highlight Card */}
        <div className="px-4 pt-3.5 pb-2">
          <div className="bg-zinc-950 border-2 border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                {isHi ? "आपकी कुल कमाई (0% कमीशन)" : "Your Net Earnings (0% Commission)"}
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-4xl font-black text-emerald-400 tracking-tight flex items-center drop-shadow-md">
                  ₹{totalEarning}
                </span>
                {isExpress && (
                  <span className="text-xs font-black text-amber-300 bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 rounded-full ml-1.5">
                    +₹{bonus} {isHi ? "एक्सप्रेस बोनस" : "Express"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isHi
                  ? `किराया: ₹${baseFare}${bonus > 0 ? ` + बोनस: ₹${bonus}` : ""} (100% आपका)`
                  : `Base: ₹${baseFare}${bonus > 0 ? ` + Bonus: ₹${bonus}` : ""} (100% yours)`}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                {isHi ? "कुल दूरी" : "Total Route"}
              </p>
              <p className="text-2xl font-black text-white mt-1 flex items-center justify-end gap-1.5">
                <Bike className="size-5 text-emerald-400" />
                {totalDist} km
              </p>
              <button
                type="button"
                onClick={handleOpenMapPreview}
                className="mt-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 underline flex items-center justify-end gap-1"
              >
                <Compass className="size-3" />
                {isHi ? "नक्शे पर देखें" : "View Map"}
              </button>
            </div>
          </div>
        </div>

        {/* Route Details: Step 1 Pickup & Step 2 Drop */}
        <div className="px-4 py-2.5 space-y-3">
          {/* Pickup Step */}
          <div className="flex items-start gap-3 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
            <div className="mt-0.5 flex flex-col items-center">
              <div className="size-7 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs font-black">
                1
              </div>
              <div className="w-0.5 h-6 bg-zinc-700 my-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                  {isHi ? `पिकअप (${pickupDist} km दूर)` : `Pickup (${pickupDist} km away)`}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">{isHi ? "ग्राहक का पता" : "Customer Location"}</span>
              </div>
              <p className="text-sm font-bold text-white truncate mt-0.5">
                {offer.pickupTitle || offer.customerName || (isHi ? "ग्राहक पिकअप" : "Customer Pickup")}
              </p>
              <p className="text-xs text-zinc-300 truncate">
                {offer.pickupAddress || "Kasganj City"}
              </p>
            </div>
          </div>

          {/* Drop Step */}
          <div className="flex items-start gap-3 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
            <div className="mt-0.5 flex flex-col items-center">
              <div className="size-7 rounded-full bg-blue-500 text-black flex items-center justify-center text-xs font-black">
                2
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-400 uppercase tracking-wide">
                  {isHi ? `स्टोर डिलीवरी (${dropDist} km)` : `Drop-off (${dropDist} km)`}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">{isHi ? "पार्टनर स्टोर" : "Partner Store"}</span>
              </div>
              <p className="text-sm font-bold text-white truncate mt-0.5">
                {offer.dropTitle || offer.partnerName || "QuickPress Partner Store"}
              </p>
              <p className="text-xs text-zinc-300 truncate">
                {offer.dropAddress || "Store Destination"}
              </p>
            </div>
          </div>
        </div>

        {/* Order Info Chips */}
        <div className="px-4 pb-2 flex flex-wrap gap-2 text-xs">
          {itemCount > 0 && (
            <span className="bg-zinc-900 text-zinc-200 px-3 py-1 rounded-full flex items-center gap-1.5 border border-zinc-700 font-bold">
              <Package className="size-3.5 text-zinc-400" />
              {itemCount} {isHi ? "कपड़े" : "Garments"}
            </span>
          )}
          <span className="bg-zinc-900 text-zinc-200 px-3 py-1 rounded-full flex items-center gap-1.5 border border-zinc-700 font-bold">
            <IndianRupee className="size-3.5 text-emerald-400" />
            {offer.paymentMode === "cod"
              ? (isHi ? `कैश डिलीवरी: ₹${offer.amount || 0}` : `Cash: ₹${offer.amount || 0}`)
              : (isHi ? "ऑनलाइन पेड" : "Online Paid")}
          </span>
          <span className="bg-zinc-900 text-zinc-200 px-3 py-1 rounded-full flex items-center gap-1.5 border border-zinc-700 font-bold">
            <Clock className="size-3.5 text-zinc-400" />
            {isHi ? "तत्काल प्रेषण (Instant)" : "Instant Dispatch"}
          </span>
        </div>

        {/* User-Friendly Action Zone: Swipe-to-Accept + One-Touch Controls */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
          {/* 1. Large Ergonomic Swipe-to-Accept Slider (Prevents Accidental Taps while Riding) */}
          <div className="w-full">
            <SwipeActionButton
              label={
                isHi
                  ? `स्वीकार करने के लिए स्वाइप करें (${timeLeft}s)`
                  : `SWIPE TO ACCEPT RIDE (${timeLeft}s)`
              }
              onConfirm={handleAccept}
              loading={isAccepting}
              disabled={isDeclining}
              color="emerald"
              className="w-full text-base font-black shadow-2xl py-1.5"
            />
          </div>

          {/* 2. Secondary Quick Action Row: Pass Button + One-Tap Accept Fallback */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
              className="w-1/3 py-3 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 text-zinc-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <X className="size-4 text-red-400" />
              {isDeclining ? (isHi ? "छोड़ रहे हैं..." : "Passing...") : (isHi ? "छोड़ें (Pass)" : "Pass")}
            </button>

            <button
              type="button"
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              className="w-2/3 py-3 px-4 rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs transition-all flex items-center justify-center gap-2 border border-emerald-400/50 disabled:opacity-50"
            >
              <CheckCircle2 className="size-4 fill-white text-emerald-600" />
              {isAccepting ? (isHi ? "स्वीकार कर रहे हैं..." : "Accepting...") : (isHi ? "तुरंत टैप करके स्वीकारें" : "Or Tap to Accept")}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

