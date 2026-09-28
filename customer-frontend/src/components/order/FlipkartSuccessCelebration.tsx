import React, { useEffect, useState } from "react";
import { Check, ChevronRight, Navigation, Sparkles, Truck } from "lucide-react";
import { playOrderPlacedSonicChime } from "@/lib/order-success-sound";

export interface FlipkartSuccessCelebrationProps {
  grandTotal: number;
  orderId: string;
  pickupSlot?: string;
  storeName?: string;
  onViewDetails?: () => void;
  onTrackOrder?: () => void;
  autoDismissMs?: number;
}

// Confetti particles generator
interface ConfettiParticle {
  id: number;
  left: number;
  top: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  shape: "circle" | "rect" | "strip";
}

const CONFETTI_COLORS = [
  "#ffffff",
  "#ffd700",
  "#52c41a",
  "#a0d911",
  "#fadb14",
  "#ff4d4f",
  "#40a9ff",
  "#9254de",
];

export function FlipkartSuccessCelebration({
  grandTotal,
  orderId,
  pickupSlot = "15-30 mins",
  storeName = "QuickPress Partner Store",
  onViewDetails,
  onTrackOrder,
  autoDismissMs,
}: FlipkartSuccessCelebrationProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(() => {
      onViewDetails?.();
    }, 280);
  };

  const handleTrack = () => {
    if (isExiting) return;
    setIsExiting(true);
    window.setTimeout(() => {
      onTrackOrder?.();
    }, 180);
  };

  useEffect(() => {
    // 1. Play Flipkart-style audio chime
    try {
      playOrderPlacedSonicChime();
    } catch {
      /* AudioContext fallback */
    }

    // 2. Trigger mobile haptic celebration vibration
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([60, 40, 100, 60, 180]);
      } catch {
        /* ignore */
      }
    }

    // 3. Generate vibrant celebratory confetti particles
    const generated: ConfettiParticle[] = [];
    for (let i = 0; i < 45; i++) {
      generated.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * -20,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        size: Math.floor(Math.random() * 8) + 6,
        delay: Math.random() * 1.5,
        duration: Math.random() * 2 + 2,
        shape: i % 3 === 0 ? "circle" : i % 3 === 1 ? "rect" : "strip",
      });
    }
    setParticles(generated);

    const timer = setTimeout(() => {
      setShowContent(true);
    }, 200);

    let dismissTimer: NodeJS.Timeout | null = null;
    if (autoDismissMs && onViewDetails) {
      dismissTimer = setTimeout(() => {
        setIsExiting(true);
        window.setTimeout(() => {
          onViewDetails();
        }, 280);
      }, autoDismissMs);
    }

    return () => {
      clearTimeout(timer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [autoDismissMs, onViewDetails]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#0c831f] via-[#09781d] to-[#065b16] text-white select-none overflow-hidden transition-all duration-300 ${
        isExiting ? "opacity-0 scale-95 pointer-events-none" : "animate-in fade-in opacity-100 scale-100"
      }`}
    >
      {/* CSS Floating Confetti Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.left}%`,
              top: `${p.top}%`,
              backgroundColor: p.color,
              width: p.shape === "strip" ? `${p.size * 2}px` : `${p.size}px`,
              height: p.shape === "strip" ? "4px" : `${p.size}px`,
              borderRadius: p.shape === "circle" ? "9999px" : "2px",
              animation: `confettiFall ${p.duration}s ease-out ${p.delay}s infinite`,
              transform: `rotate(${p.id * 37}deg)`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes pulseRing {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.6);
            opacity: 0.25;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        @keyframes checkBounce {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.15);
            opacity: 1;
          }
          80% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>

      {/* Top Header info */}
      <div className="w-full max-w-sm flex items-center justify-between pt-4 opacity-90 z-10">
        <div className="flex items-center gap-1.5 text-xs font-black tracking-widest uppercase text-emerald-100">
          <Sparkles className="size-3.5 fill-emerald-100" />
          <span>QuickPress Instant</span>
        </div>
        <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full text-white backdrop-blur-xs">
          Order #{orderId.slice(-6).toUpperCase()}
        </span>
      </div>

      {/* Central Iconic Flipkart-style Animated Success Disc */}
      <div className="flex flex-col items-center justify-center my-auto text-center z-10 max-w-sm px-2">
        <div className="relative flex items-center justify-center mb-8">
          {/* Animated Concentric Green/White Expanding Waves */}
          <div
            className="absolute size-32 rounded-full border-4 border-white/30"
            style={{ animation: "pulseRing 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite" }}
          />
          <div
            className="absolute size-32 rounded-full border-2 border-white/20"
            style={{ animation: "pulseRing 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) 0.6s infinite" }}
          />

          {/* Large Pure White Bouncing Checkmark Disc */}
          <div
            className="size-28 sm:size-32 rounded-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.35)] flex items-center justify-center"
            style={{ animation: "checkBounce 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
          >
            <Check className="size-16 sm:size-18 text-[#0c831f] stroke-[3.5]" />
          </div>
        </div>

        {/* Headline & Badges */}
        <h1
          className={`text-2xl sm:text-3xl font-black tracking-tight text-white transition-all duration-500 ${
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          Order Placed Successfully!
        </h1>

        <div
          className={`mt-3 inline-flex items-center gap-2 bg-black/25 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 transition-all duration-500 delay-100 ${
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <span className="text-sm font-black text-white">₹{grandTotal}</span>
          <span className="text-white/60">•</span>
          <span className="text-xs font-bold text-emerald-200">Payment Received</span>
        </div>

        <p
          className={`mt-4 text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium transition-all duration-500 delay-200 ${
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          {storeName} has accepted your laundry request. Rider assigned for pickup in{" "}
          <strong className="text-white font-black">{pickupSlot}</strong>.
        </p>

        {/* Quick ETA Card */}
        <div
          className={`mt-6 w-full rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/20 flex items-center justify-between text-left transition-all duration-500 delay-300 ${
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white text-[#0c831f] flex items-center justify-center shadow-md">
              <Truck className="size-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-200">Estimated Pickup</p>
              <p className="text-xs font-black text-white">{pickupSlot}</p>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-[#0c831f] px-2.5 py-1 rounded-lg border border-emerald-400/30">
            Confirmed
          </span>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div
        className={`w-full max-w-sm space-y-3 pb-4 z-10 transition-all duration-500 delay-400 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        {onTrackOrder ? (
          <button
            type="button"
            onClick={handleTrack}
            className="w-full h-13 rounded-2xl bg-white hover:bg-emerald-50 text-[#0c831f] font-black text-sm shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
          >
            <Navigation className="size-4.5 stroke-[2.5]" />
            <span>TRACK LIVE ORDER STATUS</span>
            <ChevronRight className="size-4 stroke-[3]" />
          </button>
        ) : null}

        {onViewDetails ? (
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
          >
            <span>View Complete Order Summary &amp; Bill</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
