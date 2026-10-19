import React, { useState } from "react";
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

  // Inline SVG artwork for each of the 5 stories matching the screenshot
  const renderStoryVisual = (story: RiderStoryItem, index: number) => {
    if (story.imageUrl) {
      return <img src={story.imageUrl} alt={story.title} className="size-full object-cover" />;
    }

    // Story 1: Follow (driver photo with cash)
    if (index === 0 || story.id === "story_follow") {
      return (
        <svg className="size-full" viewBox="0 0 60 60" fill="none">
          <rect width="60" height="60" fill="#FEF08A" />
          <rect x="2" y="16" width="30" height="24" rx="3" fill="#EAB308" />
          <rect x="6" y="20" width="10" height="10" rx="1" fill="#FFFFFF" opacity="0.8" />
          <circle cx="9" cy="40" r="4" fill="#18181B" />
          <circle cx="25" cy="40" r="4" fill="#18181B" />
          <circle cx="38" cy="22" r="9" fill="#FDBA74" />
          <path d="M30 18 C30 14 46 14 46 18 Z" fill="#18181B" />
          <circle cx="35" cy="21" r="1" fill="#18181B" />
          <circle cx="41" cy="21" r="1" fill="#18181B" />
          <path d="M35 25 Q38 28 41 25" stroke="#18181B" strokeWidth="1" strokeLinecap="round" />
          <path d="M28 48 C28 35 48 35 48 48 Z" fill="#1E3A8A" />
          <path d="M16 28 L28 34 L25 40 L13 34 Z" fill="#86EFAC" stroke="#15803D" strokeWidth="0.8" />
          <path d="M19 24 L31 30 L28 36 L16 30 Z" fill="#4ADE80" stroke="#15803D" strokeWidth="0.8" />
          <path d="M22 20 L34 26 L31 32 L19 26 Z" fill="#22C55E" stroke="#15803D" strokeWidth="0.8" />
        </svg>
      );
    }

    // Story 2: Transfer Money (bank building + checkmark)
    if (index === 1 || story.id === "story_transfer") {
      return (
        <svg className="size-full" viewBox="0 0 60 60" fill="none">
          <rect width="60" height="60" fill="#FEF3C7" />
          <path d="M0 0 L60 0 L60 30 L0 42 Z" fill="#FDE68A" />
          <path d="M32 30 L48 20 L64 30 Z" fill="#94A3B8" />
          <rect x="35" y="30" width="26" height="3" fill="#64748B" />
          <rect x="38" y="33" width="3" height="12" fill="#CBD5E1" />
          <rect x="44" y="33" width="3" height="12" fill="#CBD5E1" />
          <rect x="50" y="33" width="3" height="12" fill="#CBD5E1" />
          <rect x="56" y="33" width="3" height="12" fill="#CBD5E1" />
          <rect x="34" y="45" width="28" height="3" fill="#64748B" />
          <rect x="6" y="24" width="22" height="15" rx="2" fill="#F59E0B" />
          <rect x="8" y="27" width="6" height="4" rx="1" fill="#FEF3C7" />
          <line x1="6" y1="33" x2="28" y2="33" stroke="#B45309" strokeWidth="2" />
          <circle cx="28" cy="18" r="5" fill="#22C55E" />
          <path d="M26 18 L27.5 19.5 L30.5 16.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    }

    // Story 3: Earn 2000 (megaphone + ₹2000)
    if (index === 2 || story.id === "story_earn2000") {
      return (
        <svg className="size-full" viewBox="0 0 60 60" fill="none">
          <rect width="60" height="60" fill="#1D4ED8" />
          <path d="M8 20 L16 17 L22 26 L14 29 Z" fill="#FBBF24" />
          <ellipse cx="22" cy="21.5" rx="2.5" ry="4.5" fill="#F59E0B" />
          <path d="M12 25 L10 32 L8 31 L10 24 Z" fill="#D97706" />
          <text x="36" y="19" fill="#FDE047" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">REFER</text>
          <text x="36" y="26" fill="#FDE047" fontSize="5.5" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">&amp; EARN</text>
          <text x="30" y="38" fill="#FFFFFF" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">₹2000</text>
          <circle cx="44" cy="45" r="7" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />
          <text x="44" y="48" fill="#78350F" fontSize="8" fontWeight="bold" textAnchor="middle">₹</text>
        </svg>
      );
    }

    // Story 4: Auto Boost (Bajaj Auto + Lightning)
    if (index === 3 || story.id === "story_autoboost") {
      return (
        <svg className="size-full" viewBox="0 0 60 60" fill="none">
          <rect width="60" height="60" fill="#FEF08A" />
          <circle cx="30" cy="30" r="28" fill="#FDE047" />
          <path d="M18 42 L18 30 C18 24 22 22 30 22 C38 22 42 24 42 30 L42 42 Z" fill="#15803D" />
          <path d="M20 28 H40 V35 H20 Z" fill="#FEF08A" />
          <rect x="22" y="24" width="16" height="8" rx="2" fill="#E0F2FE" />
          <circle cx="30" cy="38" r="3.5" fill="#FACC15" />
          <circle cx="21" cy="42" r="3" fill="#18181B" />
          <circle cx="39" cy="42" r="3" fill="#18181B" />
          <path d="M33 4 L25 18 H32 L27 28 L41 14 H34 Z" fill="#EAB308" stroke="#CA8A04" strokeWidth="0.8" />
        </svg>
      );
    }

    // Story 5: Performance (Golden Medal)
    return (
      <svg className="size-full" viewBox="0 0 60 60" fill="none">
        <rect width="60" height="60" fill="#EDE9FE" />
        <path d="M22 28 L17 48 L25 43 L30 48 L28 28 Z" fill="#EF4444" />
        <path d="M38 28 L43 48 L35 43 L30 48 L32 28 Z" fill="#DC2626" />
        <circle cx="30" cy="24" r="14" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
        <circle cx="30" cy="24" r="11" fill="#FDE047" />
        <path d="M30 16 L32.2 21.5 L38 22 L33.5 25.5 L35 31.5 L30 28 L25 31.5 L26.5 25.5 L22 22 L27.8 21.5 Z" fill="#D97706" />
      </svg>
    );
  };

  const getStoryRingGradient = (idx: number) => {
    switch (idx) {
      case 0:
        return "bg-gradient-to-tr from-amber-500 via-rose-500 to-red-600";
      case 1:
        return "bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500";
      case 2:
        return "bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600";
      case 3:
        return "bg-gradient-to-tr from-blue-400 via-indigo-500 to-violet-600";
      default:
        return "bg-gradient-to-tr from-violet-400 via-purple-500 to-indigo-600";
    }
  };

  return (
    <div className="relative flex flex-col flex-1 w-full h-full bg-white text-zinc-900 select-none overflow-hidden font-sans">
      {/* Tiny Left-Edge Orange Tab (Matches Rapido Screenshot) */}
      <div className="absolute left-0 top-3 w-1.5 h-7 bg-amber-500 rounded-r-full shadow-2xs z-10" />

      {/* 1. Center Greeting Area (Matches Screenshot) */}
      <div className="flex-1 flex flex-col items-center justify-center -mt-16 px-6 text-center">
        {/* Hand Holding Smartphone Graphic with Yellow Dots */}
        <div className="relative mb-3 flex items-center justify-center">
          <svg width="120" height="110" viewBox="0 0 120 110" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Floating Yellow Circles */}
            <circle cx="26" cy="38" r="3.2" fill="#FCD34D" />
            <circle cx="48" cy="18" r="3.5" fill="#FCD34D" />
            <circle cx="62" cy="8" r="3.2" fill="#FCD34D" />
            <circle cx="76" cy="18" r="3.5" fill="#FCD34D" />
            <circle cx="98" cy="36" r="3.2" fill="#FCD34D" />

            {/* Soft Light-Blue Background Cloud */}
            <path
              d="M44 48 C38 48 34 52 34 58 C30 59 26 63 26 68 C26 74 31 78 37 78 L85 78 C91 78 96 74 96 68 C96 63 92 59 88 58 C88 50 81 44 73 44 C70 44 67 45 64 47 C60 41 53 37 46 37 C45 37 44.5 37.1 44 37.3 Z"
              fill="#EEF5FF"
            />

            {/* Phone Body */}
            <rect x="42" y="24" width="36" height="66" rx="7" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
            {/* Phone Screen */}
            <rect x="44.5" y="26.5" width="31" height="61" rx="5" fill="#F8FAFC" />
            {/* Speaker Bar & Camera */}
            <rect x="56" y="28.5" width="8" height="1.5" rx="0.75" fill="#CBD5E1" />
            <circle cx="53" cy="29.2" r="0.75" fill="#94A3B8" />

            {/* Screen UI elements */}
            <rect x="50" y="38" width="20" height="9" rx="4.5" fill="#E2E8F0" />
            <circle cx="55" cy="42.5" r="3" fill="#10B981" />
            <rect x="48" y="52" width="24" height="2" rx="1" fill="#E2E8F0" />
            <rect x="50" y="56" width="20" height="2" rx="1" fill="#E2E8F0" />

            {/* Left Hand Holding Phone from Below */}
            {/* Arm & Wrist */}
            <path d="M40 92 L40 102 L52 102 L52 92 Z" fill="#FDBA74" />
            {/* Watch Band & Clasp */}
            <rect x="37" y="85" width="16" height="7" rx="1.5" fill="#18181B" />
            <rect x="42" y="86" width="6" height="5" rx="0.5" fill="#E2E8F0" />
            {/* Left Thumb holding side */}
            <path d="M37 66 C35 62 42 60 43 66 L43 76 C41 81 37 81 37 76 Z" fill="#FDBA74" />

            {/* Right Hand / Arm with Index Finger Tapping Screen */}
            <path
              d="M74 102 L69 88 L63 76 L55 52 C54 48 58 46 60 49 L65 60 L70 70 L77 84 L84 102 Z"
              fill="#FDBA74"
            />
            {/* Curled Fingers on Right Palm */}
            <path d="M64 64 C68 64 70 67 69 71 C68 74 65 74 63 71 Z" fill="#FCA579" />
            <path d="M68 69 C71 69 73 72 72 75 C71 78 68 78 66 75 Z" fill="#FCA579" />

            {/* Tap Ripple Effect on Screen */}
            <circle cx="56" cy="51" r="3" fill="#60A5FA" opacity="0.35" />
            <circle cx="56" cy="51" r="6" stroke="#93C5FD" strokeWidth="1" opacity="0.4" />
          </svg>
        </div>

        {/* Text Heading (Matches Screenshot Fonts & Hierarchy) */}
        <h2 className="text-[15px] font-normal text-zinc-800 tracking-tight">
          Hi {firstName}
        </h2>
        <h1 className="text-[20px] font-bold text-zinc-950 tracking-tight mt-0.5">
          {greeting}
        </h1>
      </div>

      {/* 2. Bottom Drawer with Stories, Divider & Quick Actions */}
      <div
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
        onWheel={handleDrawerWheel}
        className={`absolute left-0 right-0 bottom-0 z-30 pointer-events-auto transition-all duration-300 ease-in-out select-none bg-white rounded-t-[28px] border-t border-zinc-200/80 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-col ${
          isDrawerExpanded ? "h-[76vh] overflow-y-auto pb-24" : "h-[268px] overflow-hidden pb-16"
        } pt-1.5`}
      >
        {/* Double-Chevron Up/Down Drag Handle (Gesture only: Scroll up to open, Scroll down to close) */}
        <div
          className="w-full flex justify-center pt-2 pb-1 text-zinc-400 select-none pointer-events-none"
          aria-label="Drawer Handle"
        >
          {isDrawerExpanded ? (
            <svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 1 11 6 18 1" />
              <polyline points="4 6 11 11 18 6" />
            </svg>
          ) : (
            <svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 6 11 1 18 6" />
              <polyline points="4 11 11 6 18 11" />
            </svg>
          )}
        </div>

        {/* Dynamic Story / Offer Bubbles Row (Horizontal Scroll) */}
        <div className="flex items-start gap-3.5 overflow-x-auto no-scrollbar px-4 pt-1 pb-1">
          {stories.map((story, sIdx) => (
            <button
              key={story.id || sIdx}
              type="button"
              onClick={() => {
                triggerHaptic(25);
                setStoryModalIndex(sIdx);
                setIsStoryModalOpen(true);
              }}
              className="flex flex-col items-center shrink-0 group cursor-pointer active:scale-95 transition-transform"
            >
              {/* Story Circle with Gradient Ring & Bottom Pill Badge */}
              <div className={`relative size-[62px] rounded-full p-[2px] ${getStoryRingGradient(sIdx)} shadow-xs`}>
                <div className="size-full rounded-full bg-white p-[2px] flex items-center justify-center overflow-hidden">
                  <div className="size-full rounded-full overflow-hidden flex items-center justify-center">
                    {renderStoryVisual(story, sIdx)}
                  </div>
                </div>

              </div>
            </button>
          ))}
        </div>

        {/* Thin Divider Line Below Stories */}
        <div className="w-full h-px bg-zinc-150/80 my-2" />

        {/* Quick Actions Header & Card */}
        <div className="px-4 pb-2">
          <p className="text-[13.5px] font-semibold text-zinc-800 mb-2">Quick actions</p>

          {/* Change Language Rounded Card (Matches Screenshot "आ A") */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                navigate({ to: "/language" });
              }}
              className="flex items-center justify-center w-[88px] h-[52px] rounded-[18px] bg-[#F4F6F8] hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer shadow-2xs border border-zinc-200/50"
              aria-label="Change Language"
            >
              <span className="text-[17px] font-bold text-[#38BDF8]">आ</span>
              <span className="text-[19px] font-extrabold text-[#1D4ED8] -ml-0.5">A</span>
            </button>
          </div>

          {/* Expanded Drawer Additional Features (Shown when Swiped Up) */}
          {isDrawerExpanded && (
            <div className="pt-4 space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    navigate({ to: "/rate-card" as any });
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer text-left"
                >
                  <div className="size-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                    ₹
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Rate Card</p>
                    <p className="text-[10px] text-zinc-500">View payout rates</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    navigate({ to: "/support" as any });
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer text-left"
                >
                  <div className="size-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    🎧
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Captain Help</p>
                    <p className="text-[10px] text-zinc-500">24x7 Priority Support</p>
                  </div>
                </button>
              </div>

              {/* Proudly Made in India Skyline Artwork */}
              <div className="pt-4 pb-6 text-center select-none flex flex-col items-center">
                <div className="flex items-center justify-center gap-1 text-xs font-black text-zinc-800 mb-2">
                  <span>Proudly made</span>
                  <span className="text-amber-500">✨</span>
                  <span className="font-extrabold text-sm text-zinc-950">in India</span>
                </div>

                <svg
                  className="w-full max-w-xs h-16 text-zinc-300 stroke-current opacity-80"
                  viewBox="0 0 320 60"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M120 58 V35 H132 V58 M124 35 V24 H128 V35 M118 24 H134 V20 H118 Z" strokeWidth="1.5" />
                  <path d="M145 58 V18 M175 58 V18" strokeWidth="1.2" />
                  <path d="M152 58 V38 Q160 22 168 38 V58" strokeWidth="1.5" />
                  <path d="M160 22 V15" strokeWidth="1.5" />
                  <path d="M80 58 L85 15 H89 L94 58" strokeWidth="1.5" />
                  <path d="M82 45 H92 M84 32 H90 M85 20 H89" strokeWidth="1" />
                  <path d="M10 58 V42 H30 V46 H45 V42 H65 V58" strokeWidth="1.5" />
                  <path d="M220 58 V42 H240 V46 H255 V42 H275 V58" strokeWidth="1.5" />
                  <line x1="0" y1="58" x2="320" y2="58" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          )}
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

