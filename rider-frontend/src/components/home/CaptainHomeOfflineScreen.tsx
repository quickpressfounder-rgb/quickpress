import React, { useState } from "react";
import { ChevronUp, ChevronDown, Languages, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { triggerHaptic } from "../../lib/captain-audio";
import { CaptainStoryModal } from "./CaptainStoryModal";
import {
  FALLBACK_RIDER_STORIES,
  type RiderStoryItem,
} from "../../api/rider/promotions-api";

interface CaptainHomeOfflineScreenProps {
  todayEarnings: number;
  todayDeliveries: number;
  captainName?: string;
  onGoOnline: () => void;
  onOpenWorkZoneInfo?: () => void;
}

export const CaptainHomeOfflineScreen: React.FC<CaptainHomeOfflineScreenProps> = ({
  captainName = "Captain",
  onGoOnline,
}) => {
  const navigate = useNavigate();
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyModalIndex, setStoryModalIndex] = useState(0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const firstName = captainName.split(" ")[0] || "Captain";

  const stories: RiderStoryItem[] = FALLBACK_RIDER_STORIES;

  // Swipe / Scroll gesture support for bottom sheet drawer
  const drawerTouchStartYRef = React.useRef<number | null>(null);
  const drawerTouchEndYRef = React.useRef<number | null>(null);

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    drawerTouchStartYRef.current = e.touches[0].clientY;
    drawerTouchEndYRef.current = e.touches[0].clientY;
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    drawerTouchEndYRef.current = e.touches[0].clientY;
  };

  const handleDrawerTouchEnd = () => {
    if (drawerTouchStartYRef.current === null || drawerTouchEndYRef.current === null) return;
    const deltaY = drawerTouchEndYRef.current - drawerTouchStartYRef.current;
    if (deltaY < -35 && !isDrawerExpanded) {
      triggerHaptic(20);
      setIsDrawerExpanded(true);
    } else if (deltaY > 35 && isDrawerExpanded) {
      triggerHaptic(20);
      setIsDrawerExpanded(false);
    }
    drawerTouchStartYRef.current = null;
    drawerTouchEndYRef.current = null;
  };

  const handleDrawerWheel = (e: React.WheelEvent) => {
    if (e.deltaY < -15 && !isDrawerExpanded) {
      setIsDrawerExpanded(true);
    } else if (e.deltaY > 15 && isDrawerExpanded) {
      setIsDrawerExpanded(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 w-full h-full bg-white text-zinc-900 select-none overflow-hidden font-sans">
      {/* 1. Center Greeting Area (Video 00:01 - 00:05 Match) */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-16 px-6 text-center">
        {/* Hand Holding Smartphone Graphic with Sparkles */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Ambient Sparkles */}
          <div className="absolute -top-3 left-3 size-2.5 rounded-full bg-amber-400 animate-ping opacity-75" />
          <div className="absolute -top-1 -right-2 size-2 rounded-full bg-amber-400 animate-pulse" />
          <Sparkles className="absolute -top-5 right-1 size-5 text-amber-500 fill-amber-400 animate-bounce duration-1000" />
          <Sparkles className="absolute -top-3 -left-4 size-4 text-amber-400 fill-amber-300" />

          {/* Hand + Phone Vector Illustration */}
          <svg width="100" height="110" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Phone Body */}
            <rect x="25" y="10" width="50" height="85" rx="10" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="3" />
            <rect x="28" y="13" width="44" height="79" rx="8" fill="#F8FAFC" />
            {/* Phone Screen Notch / Speaker */}
            <rect x="42" y="17" width="16" height="3" rx="1.5" fill="#94A3B8" />
            {/* Screen Content Waves / Emojis */}
            <circle cx="50" cy="46" r="14" fill="#FEF3C7" />
            <circle cx="50" cy="46" r="6" fill="#F59E0B" />
            <path d="M38 70 H62" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
            <path d="M42 76 H58" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />

            {/* Hand Fingers Holding Phone from Left & Right */}
            {/* Left Thumb */}
            <path d="M22 56 C20 54, 20 48, 26 48 L28 48 L28 62 L24 62 C22 62, 22 58, 22 56 Z" fill="#FDBA74" stroke="#F97316" strokeWidth="1.5" />
            {/* Right Fingers */}
            <path d="M72 42 L77 42 C81 42, 81 47, 77 47 L72 47 Z" fill="#FDBA74" stroke="#F97316" strokeWidth="1.5" />
            <path d="M72 50 L77 50 C81 50, 81 55, 77 55 L72 55 Z" fill="#FDBA74" stroke="#F97316" strokeWidth="1.5" />
            <path d="M72 58 L76 58 C80 58, 80 63, 76 63 L72 63 Z" fill="#FDBA74" stroke="#F97316" strokeWidth="1.5" />

            {/* Lower Palm / Wrist */}
            <path d="M34 92 C32 98, 38 108, 50 108 C62 108, 68 98, 66 92 Z" fill="#FDBA74" stroke="#F97316" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Text Heading */}
        <h2 className="text-sm font-bold text-zinc-600 tracking-tight">
          Hi {firstName}
        </h2>
        <h1 className="text-2xl font-black text-zinc-950 tracking-tight mt-0.5">
          {greeting}
        </h1>
      </div>

      {/* 2. Bottom Drawer with Stories, Language & Skyline (Supports Swipe / Scroll Gestures) */}
      <div
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
        onWheel={handleDrawerWheel}
        className={`absolute left-0 right-0 bottom-0 z-30 pointer-events-auto transition-all duration-300 ease-in-out select-none bg-white rounded-t-3xl border-t border-zinc-200/90 shadow-2xl flex flex-col ${
          isDrawerExpanded ? "h-[75vh] overflow-y-auto" : "h-[215px] overflow-hidden"
        } pb-20 pt-1.5`}
      >
        {/* Drag Handle Capsule & Chevron */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setIsDrawerExpanded((prev) => !prev);
          }}
          className="w-full flex flex-col items-center justify-center py-1.5 text-zinc-400 hover:text-zinc-700 active:scale-95 transition-all cursor-pointer"
          aria-label="Toggle Drawer"
        >
          <div className="w-10 h-1 rounded-full bg-zinc-300 mb-0.5" />
          {isDrawerExpanded ? (
            <ChevronDown className="size-4.5 stroke-[2.5]" />
          ) : (
            <ChevronUp className="size-4.5 stroke-[2.5]" />
          )}
        </button>

        {/* Dynamic Story / Offer Bubbles Row (Horizontal Scroll) */}
        <div className="flex items-start gap-4 overflow-x-auto no-scrollbar px-4 pt-1 pb-3">
          {stories.map((story, sIdx) => (
            <button
              key={story.id || sIdx}
              type="button"
              onClick={() => {
                triggerHaptic(25);
                setStoryModalIndex(sIdx);
                setIsStoryModalOpen(true);
              }}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer active:scale-95 transition-transform"
            >
              <div className="relative size-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-xs">
                <div className="size-full rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                  {story.imageUrl ? (
                    <img src={story.imageUrl} alt={story.title} className="size-full object-cover" />
                  ) : (
                    <div className="size-full rounded-full bg-amber-50 flex items-center justify-center text-xl font-black text-amber-600">
                      🎁
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-bold text-zinc-800 text-center max-w-[64px] truncate leading-tight">
                {story.title}
              </span>
            </button>
          ))}
        </div>

        {/* Quick Actions & Proudly Made in India Artwork */}
        <div className="px-4 pt-2 space-y-4">
          <p className="text-xs font-bold text-zinc-500">Quick actions</p>

          {/* Change Language Card (Video 00:11 Match) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/language" });
            }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer w-24 text-center shadow-2xs"
          >
            <div className="flex items-center justify-center size-10 rounded-xl bg-blue-50 text-blue-700 font-black text-base mb-1">
              <span>अA</span>
            </div>
            <span className="text-xs font-bold text-zinc-900 leading-tight">Change Language</span>
          </button>

          {/* Proudly Made in India Skyline Artwork (Video 00:11, 00:36 Match) */}
          <div className="pt-4 pb-6 text-center select-none flex flex-col items-center">
            <div className="flex items-center justify-center gap-1 text-xs font-black text-zinc-800 mb-2">
              <span>Proudly made</span>
              <span className="text-amber-500">✨</span>
              <span className="font-extrabold text-sm text-zinc-950">in India</span>
            </div>

            {/* Indian Monuments Outline Skyline Graphic */}
            <svg
              className="w-full max-w-xs h-16 text-zinc-300 stroke-current opacity-80"
              viewBox="0 0 320 60"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* India Gate */}
              <path d="M120 58 V35 H132 V58 M124 35 V24 H128 V35 M118 24 H134 V20 H118 Z" strokeWidth="1.5" />
              {/* Taj Mahal Dome & Minarets */}
              <path d="M145 58 V18 M175 58 V18" strokeWidth="1.2" />
              <path d="M152 58 V38 Q160 22 168 38 V58" strokeWidth="1.5" />
              <path d="M160 22 V15" strokeWidth="1.5" />
              {/* Qutub Minar */}
              <path d="M80 58 L85 15 H89 L94 58" strokeWidth="1.5" />
              <path d="M82 45 H92 M84 32 H90 M85 20 H89" strokeWidth="1" />
              {/* Red Fort / Palace Walls */}
              <path d="M10 58 V42 H30 V46 H45 V42 H65 V58" strokeWidth="1.5" />
              <path d="M220 58 V42 H240 V46 H255 V42 H275 V58" strokeWidth="1.5" />
              {/* Ground Line */}
              <line x1="0" y1="58" x2="320" y2="58" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Story View Modal */}
      <CaptainStoryModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        stories={stories}
        initialIndex={storyModalIndex}
      />
    </div>
  );
};
