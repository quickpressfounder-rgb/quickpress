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
import {
  type RiderStoryItem,
  FALLBACK_RIDER_STORIES,
  fetchRiderStories,
} from "../../api/rider/promotions-api";

interface CaptainStoryModalProps {
  isOpen: boolean;
  initialIndex?: number;
  stories?: RiderStoryItem[];
  onClose: () => void;
}

const STORY_DURATION_MS = 5000;

export const CaptainStoryModal: React.FC<CaptainStoryModalProps> = ({
  isOpen,
  initialIndex = 0,
  stories: propStories,
  onClose,
}) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [stories, setStories] = useState<RiderStoryItem[]>(
    propStories && propStories.length > 0 ? propStories : FALLBACK_RIDER_STORIES
  );
  const progressIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (propStories && propStories.length > 0) {
      setStories(propStories);
    } else {
      fetchRiderStories()
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) setStories(res);
        })
        .catch(() => {});
    }
  }, [propStories]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, stories.length - 1)));
      setProgress(0);
    }
  }, [isOpen, initialIndex, stories.length]);

  // Handle Mobile Hardware Back Button (Safe native Capacitor listener, no router pushState corruption)
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
            .then((handle) => {
              cleanup = () => handle.remove();
            })
            .catch(() => {});
        })
        .catch(() => {});
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        triggerHaptic(20);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (cleanup) cleanup();
    };
  }, [isOpen, onClose]);

  const currentStory = stories[currentIndex] || stories[0] || FALLBACK_RIDER_STORIES[0];

  // Auto-advance progress
  useEffect(() => {
    if (!isOpen || isPaused || stories.length === 0) return;

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

  const handleActionClick = () => {
    triggerHaptic(35);
    const action = currentStory.ctaAction || "";
    const type = currentStory.actionType;

    if (type === "share") {
      const text = `${currentStory.title} - ${currentStory.tagline}: ${action}`;
      if (navigator.share) {
        navigator.share({ title: currentStory.title, text });
      } else {
        navigator.clipboard?.writeText(text);
      }
      return;
    }

    if (
      action.startsWith("http://") ||
      action.startsWith("https://") ||
      type === "google_form" ||
      type === "external_link"
    ) {
      window.open(action, "_blank");
      return;
    }

    if (action.startsWith("/") || type === "internal_route") {
      onClose();
      navigate({ to: action as any });
      return;
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-in fade-in duration-200">
      {/* Story Player Container (Mobile Aspect Ratio) */}
      <div
        className="relative w-full max-w-md h-full sm:h-[92vh] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Animated Gradient Background */}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${
            currentStory.gradient || "from-blue-700 via-indigo-900 to-black"
          } transition-all duration-500`}
        />

        {/* Ambient Overlay & Particles */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />

        {/* TOP CONTROLS: PROGRESS BARS & HEADER (Safe Area Fixed for Notches & Camera Cutouts) */}
        <div
          className="relative z-20 px-4 pb-2 space-y-3"
          style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 18px), 52px)" }}
        >
          {/* Segmented Progress Bars (Instagram Style - Silky 60fps) */}
          <div className="flex items-center gap-1.5 w-full">
            {stories.map((s, idx) => (
              <div
                key={s.id || idx}
                className="flex-1 h-1.5 rounded-full bg-white/30 overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-[width] duration-75 ease-linear"
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
            <div className="flex items-center gap-2.5">
              <span className="size-8 rounded-full bg-white/20 flex items-center justify-center text-base backdrop-blur-md overflow-hidden">
                {currentStory.imageUrl ? (
                  <img
                    src={currentStory.imageUrl}
                    alt={currentStory.title}
                    className="size-full object-cover"
                  />
                ) : (
                  currentStory.icon || "✨"
                )}
              </span>
              <div>
                <p className="text-xs font-black tracking-wide uppercase">
                  QuickPress Story
                </p>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white ${
                    currentStory.badgeBg || "bg-rose-500"
                  }`}
                >
                  {currentStory.badge || "FEATURED"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                onClose();
              }}
              className="size-9 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md border border-white/20"
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

        {/* CENTER CONTENT: ANIMATED CARD WITH SMOOTH TRANSITION */}
        <div className="relative z-20 px-6 py-4 flex flex-col items-center text-center space-y-4 my-auto pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          {/* 3D Animated Hero Icon / Image Box */}
          <div className="relative size-24 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl animate-bounce duration-1000 overflow-hidden">
            {currentStory.imageUrl ? (
              <img
                src={currentStory.imageUrl}
                alt={currentStory.title}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-5xl">{currentStory.icon || "✨"}</span>
            )}
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
          {currentStory.points && currentStory.points.length > 0 && (
            <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-2 text-left text-xs text-white">
              {currentStory.points.map((pt, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-semibold text-white/95">{pt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BOTTOM ACTION CTA BUTTON (Elevated above navigation bar) */}
        <div
          className="relative z-20 px-5 pt-3 space-y-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent"
          style={{ paddingBottom: "max(calc(env(safe-area-inset-bottom, 0px) + 24px), 36px)" }}
        >
          <button
            type="button"
            onClick={handleActionClick}
            className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{currentStory.ctaText || "Learn More ➔"}</span>
          </button>
          <p className="text-[10px] text-white/60 text-center font-medium">
            Tap left/right to browse · Press & hold to pause
          </p>
        </div>
      </div>
    </div>
  );
};
