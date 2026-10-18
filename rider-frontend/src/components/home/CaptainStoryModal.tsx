import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Share2,
  Wallet,
  TrendingUp,
  Zap,
  Trophy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { triggerHaptic } from "../../lib/captain-audio";
import { toast } from "sonner";

export interface StorySlide {
  id: "follow" | "transfer" | "earn2000" | "autoboost" | "performance";
  title: string;
  tagline: string;
  badge: string;
  badgeBg: string;
  gradient: string;
  icon: string;
  points: string[];
  ctaText: string;
  ctaAction: () => void;
}

interface CaptainStoryModalProps {
  isOpen: boolean;
  initialIndex?: number;
  onClose: () => void;
}

const STORY_DURATION_MS = 5000;

export const CaptainStoryModal: React.FC<CaptainStoryModalProps> = ({
  isOpen,
  initialIndex = 0,
  onClose,
}) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), 4));
      setProgress(0);
    }
  }, [isOpen, initialIndex]);

  const stories: StorySlide[] = [
    {
      id: "follow",
      title: "Join QuickPress Captains 🛵",
      tagline: "Uttar Pradesh's Fastest Growing Rider Community",
      badge: "CAPTAIN COMMUNITY",
      badgeBg: "bg-rose-500",
      gradient: "from-amber-600 via-rose-600 to-purple-800",
      icon: "🛵",
      points: [
        "10,000+ active captains across Kasganj, Aligarh & UP",
        "Weekly fuel coupons & motorcycle repair discounts",
        "Watch daily tips & earnings hacks by top riders",
      ],
      ctaText: "Follow on Instagram ➔",
      ctaAction: () => {
        window.open("https://instagram.com", "_blank");
      },
    },
    {
      id: "transfer",
      title: "Instant Bank Transfer ⚡",
      tagline: "Direct IMPS Payouts with Zero Deductions",
      badge: "INSTANT CASHOUT",
      badgeBg: "bg-emerald-500",
      gradient: "from-emerald-700 via-teal-800 to-slate-900",
      icon: "🏦",
      points: [
        "Automatic daily settlements 3 times every day",
        "Instant one-tap withdrawal to your registered bank / UPI",
        "100% of order fare belongs to you — 0% commission",
      ],
      ctaText: "Open Wallet ➔",
      ctaAction: () => {
        onClose();
        navigate({ to: "/wallet" });
      },
    },
    {
      id: "earn2000",
      title: "Refer Friends & Earn ₹2,000 💰",
      tagline: "Exclusive Kasganj & UP Referral Bonanza",
      badge: "REFER & EARN",
      badgeBg: "bg-blue-500",
      gradient: "from-blue-700 via-indigo-900 to-violet-950",
      icon: "💸",
      points: [
        "Share your referral link with biker friends",
        "When they complete 25 orders, you get ₹2,000 cash",
        "No limit on referrals — refer 5 friends, get ₹10,000!",
      ],
      ctaText: "Share Referral Link ➔",
      ctaAction: () => {
        const text = "Join QuickPress as a Delivery Captain in Uttar Pradesh! Earn up to ₹35,000/month with flexible hours and 0% commission: https://quickpress.in/captain";
        if (navigator.share) {
          navigator.share({ title: "QuickPress Captain Referral", text });
        } else {
          navigator.clipboard?.writeText(text);
          toast.success("Referral invitation link copied to clipboard! 📋");
        }
      },
    },
    {
      id: "autoboost",
      title: "Auto Boost 2.0 ⚡",
      tagline: "Extra Fares During Peak Laundry Demand",
      badge: "PEAK SURGE",
      badgeBg: "bg-amber-500",
      gradient: "from-amber-600 via-orange-600 to-red-900",
      icon: "⚡",
      points: [
        "+₹20 to +₹45 extra per order during morning & evening rushes",
        "Rain surge activated automatically during bad weather",
        "Priority order dispatch in Kasganj high-density zones",
      ],
      ctaText: "View Live Boosts ➔",
      ctaAction: () => {
        onClose();
        navigate({ to: "/incentives" });
      },
    },
    {
      id: "performance",
      title: "Captain Performance Score 🏆",
      tagline: "Maintain 4.8★ & Unlock Gold VIP Captain Perks",
      badge: "VIP TIER",
      badgeBg: "bg-purple-500",
      gradient: "from-purple-700 via-fuchsia-900 to-zinc-950",
      icon: "🏅",
      points: [
        "Gold Captain badge shown to store partners & customers",
        "Complimentary accidental medical insurance coverage",
        "Dedicated VIP Captain priority support phone helpline",
      ],
      ctaText: "Check My Score ➔",
      ctaAction: () => {
        onClose();
        navigate({ to: "/profile" });
      },
    },
  ];

  const currentStory = stories[currentIndex];

  // Auto-advance progress
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const stepMs = 50;
    const increment = (stepMs / STORY_DURATION_MS) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(progressIntervalRef.current);
  }, [isOpen, isPaused, currentIndex, stories.length, onClose]);

  const handleNext = () => {
    triggerHaptic(20);
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((c) => c + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    triggerHaptic(20);
    if (currentIndex > 0) {
      setCurrentIndex((c) => c - 1);
      setProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-in fade-in duration-200">
      {/* Story Player Container (Mobile Aspect Ratio) */}
      <div
        className="relative w-full max-w-md h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Animated Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${currentStory.gradient} transition-all duration-500`}
        />

        {/* Ambient Overlay & Particles */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />

        {/* TOP CONTROLS: PROGRESS BARS & HEADER */}
        <div className="relative z-20 pt-4 px-4 pb-2 space-y-3">
          {/* Segmented Progress Bars (Instagram Style) */}
          <div className="flex items-center gap-1.5 w-full">
            {stories.map((s, idx) => (
              <div
                key={s.id}
                className="flex-1 h-1.5 rounded-full bg-white/30 overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx < currentIndex
                        ? "100%"
                        : idx === currentIndex
                        ? `${progress}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Top Bar: Brand, Badge, and Close Button */}
          <div className="flex items-center justify-between text-white pt-1">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-full bg-white/20 flex items-center justify-center text-base backdrop-blur-md">
                {currentStory.icon}
              </span>
              <div>
                <p className="text-xs font-black tracking-wide uppercase">
                  QuickPress Story
                </p>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white ${currentStory.badgeBg}`}
                >
                  {currentStory.badge}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                onClose();
              }}
              className="size-9 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20"
              aria-label="Close Story"
            >
              <X className="size-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* TAP NAVIGATION ZONES (Left / Right halves) */}
        <div className="absolute inset-y-20 inset-x-0 z-10 flex">
          <div
            className="w-1/3 h-full cursor-pointer"
            onClick={handlePrev}
            aria-label="Previous Story"
          />
          <div className="w-1/3 h-full" />
          <div
            className="w-1/3 h-full cursor-pointer"
            onClick={handleNext}
            aria-label="Next Story"
          />
        </div>

        {/* CENTER CONTENT: VIDEO / ANIMATED CARD */}
        <div className="relative z-20 px-6 py-4 flex flex-col items-center text-center space-y-4 my-auto pointer-events-none">
          {/* 3D Animated Hero Icon Box */}
          <div className="relative size-24 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl animate-bounce duration-1000">
            <span className="text-5xl">{currentStory.icon}</span>
            <div className="absolute -top-1 -right-1 size-4 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Title & Tagline */}
          <div className="space-y-1.5 max-w-xs">
            <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
              {currentStory.title}
            </h2>
            <p className="text-xs text-white/80 font-medium">
              {currentStory.tagline}
            </p>
          </div>

          {/* Key Bullet Highlights */}
          <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2 text-left text-xs text-white">
            {currentStory.points.map((pt, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="font-semibold text-white/95">{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM ACTION CTA BUTTON */}
        <div className="relative z-20 p-5 space-y-2 pb-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(40);
              currentStory.ctaAction();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-zinc-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{currentStory.ctaText}</span>
          </button>
          <p className="text-[10px] text-white/60 text-center font-medium">
            Tap left/right to browse · Press & hold to pause
          </p>
        </div>
      </div>
    </div>
  );
};
