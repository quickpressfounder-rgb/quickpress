import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bike,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Flame,
  Headphones,
  Layers,
  MapPin,
  Moon,
  Navigation,
  Radio,
  ShieldAlert,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Wallet,
  X,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { LiveDeliveryMap, type GoogleMapLayerType } from "./LiveDeliveryMap";
import { fetchRiderHistory } from "../../api/rider/rider-orders-api";
import { CaptainTripDetailView } from "../history/CaptainTripDetailView";
import type { RiderHistoryEntry } from "../../shared/types/rider";
import { useLanguage } from "../../lib/i18n";
import { triggerHaptic } from "../../lib/captain-audio";
import { toast } from "sonner";
import { CaptainSupportModal } from "../support/CaptainSupportModal";
import { CaptainStoryModal } from "../home/CaptainStoryModal";
import { CaptainSurgeAreaModal } from "./CaptainSurgeAreaModal";
import { CaptainGoToAreaModal } from "./CaptainGoToAreaModal";
import {
  fetchRiderStories,
  fetchRiderBanners,
  FALLBACK_RIDER_STORIES,
  FALLBACK_RIDER_BANNER,
  type RiderStoryItem,
  type RiderBannerItem,
} from "../../api/rider/promotions-api";

interface CaptainOnlineMapViewProps {
  currentCoords: { lat: number; lng: number } | null;
  todayEarnings?: number;
  todayDeliveries?: number;
  captainName?: string;
  pendingOrdersCount?: number;
  onRecenter?: () => void;
  onOpenWorkZoneInfo?: () => void;
  onOpenOrders?: () => void;
}

const EMPTY_SURGE_HOTSPOTS: SurgeHotspot[] = [];

export const CaptainOnlineMapView: React.FC<CaptainOnlineMapViewProps> = ({
  currentCoords,
  todayEarnings = 0,
  todayDeliveries = 0,
  captainName = "Captain",
  pendingOrdersCount = 0,
  onRecenter,
  onOpenWorkZoneInfo,
  onOpenOrders,
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [mapLayer, setMapLayer] = useState<GoogleMapLayerType>("roadmap");
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyModalIndex, setStoryModalIndex] = useState(0);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardScratched, setRewardScratched] = useState(false);

  // Reference Video Features: Surge & Go to Modals
  const [isSurgeModalOpen, setIsSurgeModalOpen] = useState(false);
  const [isGoToModalOpen, setIsGoToModalOpen] = useState(false);
  const [isGoToActive, setIsGoToActive] = useState(false);
  const [onlineMinutesElapsed, setOnlineMinutesElapsed] = useState(1);

  // Swipe / Scroll gesture support for bottom sheet drawer (open / close on swipe)
  const drawerTouchStartYRef = useRef<number | null>(null);
  const drawerTouchEndYRef = useRef<number | null>(null);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setOnlineMinutesElapsed((m) => m + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [stories, setStories] = useState<RiderStoryItem[]>(FALLBACK_RIDER_STORIES);
  const [banners, setBanners] = useState<RiderBannerItem[]>([FALLBACK_RIDER_BANNER]);

  // Last completed trip & detail modal state (Real orders only)
  const [lastTrip, setLastTrip] = useState<RiderHistoryEntry | null>(null);
  const [selectedTripForDetail, setSelectedTripForDetail] = useState<RiderHistoryEntry | null>(null);

  useEffect(() => {
    let active = true;
    fetchRiderHistory()
      .then((history) => {
        if (!active) return;
        if (Array.isArray(history) && history.length > 0) {
          const completed =
            history.find((t) => t.outcome === "completed" || t.status === "completed") || history[0];
          setLastTrip(completed || null);
        } else {
          setLastTrip(null);
        }
      })
      .catch(() => {
        if (active) setLastTrip(null);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch dynamic stories & offer banners from Promotions Hub
  useEffect(() => {
    let active = true;
    fetchRiderStories()
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res) && res.length > 0) setStories(res);
      })
      .catch(() => {});

    fetchRiderBanners()
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res) && res.length > 0) setBanners(res);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);



  // Toggle map layer (Day Roadmap -> Night Dark -> Satellite)
  const handleToggleLayer = () => {
    triggerHaptic(40);
    setMapLayer((prev) => {
      if (prev === "roadmap") return "night";
      if (prev === "night") return "satellite";
      return "roadmap";
    });
  };

  const memoizedRiderLocation = useMemo(() => {
    if (!currentCoords?.lat || !currentCoords?.lng) return null;
    return { lat: currentCoords.lat, lng: currentCoords.lng, label: "You (Captain)" };
  }, [currentCoords?.lat, currentCoords?.lng]);

  return (
    <div className="relative flex flex-col flex-1 w-full h-full bg-white text-zinc-900 select-none overflow-hidden font-sans">
      {/* 1. FULL-BLEED WHITE & EMERALD GREEN MAP CANVAS */}
      <div className="absolute inset-0 size-full z-0">
        <LiveDeliveryMap
          riderLocation={memoizedRiderLocation}
          phase="online"
          heightClassName="h-full w-full"
          showControls={false}
          showSurgePins={false}
          surgeHotspots={EMPTY_SURGE_HOTSPOTS}
          isRapidoTheme={true}
          activeLayerOverride={mapLayer}
          onLayerChange={setMapLayer}
        />
      </div>

      {/* 2. FLOATING TOP HUD BAR */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
        {/* Main Signature Clean Card (Video 00:07, 00:23 Match) */}
        <div className="pointer-events-auto flex items-center justify-between p-2.5 bg-white/95 backdrop-blur-md rounded-2xl border border-zinc-200/90 shadow-md text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center size-8 rounded-xl bg-amber-400 text-zinc-950 font-black text-[10px] shadow-2xs border border-amber-500/20 shrink-0">
              <span>QP</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-zinc-950 tracking-wide text-xs">
                  QuickPress Service
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[11px] text-zinc-500 font-medium truncate max-w-[200px] sm:max-w-[260px]">
                  Waiting for orders...
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 pl-2 shrink-0">
            <span>{onlineMinutesElapsed} min ago</span>
            <ChevronDown className="size-3.5 stroke-[2.5]" />
          </div>
        </div>

        {/* Floating Pending Orders Alert Banner (if pending orders exist) */}
        {pendingOrdersCount > 0 && (
          <div
            onClick={onOpenOrders}
            className="pointer-events-auto cursor-pointer animate-in slide-in-from-top-2 duration-200 flex items-center justify-between px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-600/30 font-bold text-xs active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-white animate-ping" />
              <span className="font-black">
                {pendingOrdersCount} New Dispatch Offer{pendingOrdersCount > 1 ? "s" : ""} Available!
              </span>
            </div>
            <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-lg text-[11px] font-black">
              <span>View</span>
              <span>➔</span>
            </span>
          </div>
        )}
      </div>

      {/* 2. FLOATING MAP CONTROLS (Video 00:07, 00:23, 00:34 Match) */}
      {/* Left Edge: Surge, Go to, ... Pills */}
      <div
        className={`absolute bottom-[225px] left-3.5 z-20 flex items-center gap-2 pointer-events-auto select-none transition-all duration-300 ${
          isDrawerExpanded ? "opacity-0 pointer-events-none translate-y-3" : "opacity-100 pointer-events-auto translate-y-0"
        }`}
      >
        {/* Surge Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setIsSurgeModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/98 rounded-full border border-zinc-200 shadow-md text-xs font-bold text-zinc-900 active:scale-95 transition-transform cursor-pointer"
        >
          <div className="flex items-center justify-center size-4 rounded-full bg-red-100 text-red-600">
            <span className="text-[11px] font-black leading-none">↑</span>
          </div>
          <span>Surge</span>
        </button>

        {/* Go to Pill (Turns Solid Blue when destination active - Video 00:34 Match) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setIsGoToModalOpen(true);
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full border shadow-md text-xs font-bold active:scale-95 transition-all cursor-pointer ${
            isGoToActive
              ? "bg-[#1E40AF] text-white border-blue-700 shadow-blue-500/30 ring-2 ring-blue-400/40"
              : "bg-white/98 text-zinc-900 border-zinc-200"
          }`}
        >
          <MapPin className={`size-3.5 ${isGoToActive ? "text-white fill-white" : "text-red-500 fill-red-500"}`} />
          <span>Go to</span>
        </button>

        {/* More Actions (...) Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setIsSupportModalOpen(true);
          }}
          className="flex items-center justify-center size-8.5 bg-white/98 rounded-full border border-zinc-200 shadow-md text-zinc-800 font-black text-sm active:scale-95 transition-transform cursor-pointer"
        >
          <span>•••</span>
        </button>
      </div>

      {/* Right Edge: Recenter & SOS Siren Buttons */}
      <div
        className={`absolute bottom-[225px] right-3.5 z-20 flex flex-col gap-2.5 pointer-events-auto select-none transition-all duration-300 ${
          isDrawerExpanded ? "opacity-0 pointer-events-none translate-y-3" : "opacity-100 pointer-events-auto translate-y-0"
        }`}
      >
        {/* Blue Crosshair / Recenter Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(40);
            if (onRecenter) onRecenter();
          }}
          className="flex size-11 items-center justify-center rounded-full bg-white shadow-lg border border-zinc-200 text-blue-600 active:scale-90 transition-transform cursor-pointer"
          title="Recenter on Captain"
        >
          <Crosshair className="size-5 text-blue-600 stroke-[2.4]" />
        </button>

        {/* Red SOS / Emergency Siren Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(40);
            setIsSupportModalOpen(true);
          }}
          className="flex size-11 items-center justify-center rounded-full bg-white shadow-lg border border-red-200 text-red-600 active:scale-90 transition-transform cursor-pointer"
          title="24/7 SOS Helpline"
        >
          <div className="flex items-center justify-center size-7 rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="size-4.5 stroke-[2.4]" />
          </div>
        </button>
      </div>

      {/* 3. RAPIDO BOTTOM SHEET DRAWER (Video 00:07, 00:23 Match - Supports Swipe/Scroll Gestures) */}
      <div
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
        onWheel={handleDrawerWheel}
        className={`absolute left-0 right-0 bottom-0 z-30 pointer-events-auto transition-all duration-300 ease-in-out select-none bg-white rounded-t-3xl border-t border-zinc-200/90 shadow-2xl flex flex-col ${
          isDrawerExpanded ? "h-[82vh] overflow-y-auto" : "h-[215px] overflow-hidden"
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

        {/* Scrollable Drawer Content */}
        <div className={`flex-1 ${isDrawerExpanded ? "overflow-y-auto" : "overflow-hidden"} no-scrollbar space-y-4 px-4 pb-6`}>
          {/* Dynamic Story / Highlight Bubbles Row (Horizontal Scroll) */}
          <div className="flex items-start gap-4 overflow-x-auto no-scrollbar pt-1 pb-1">
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
                        {story.icon || "🛵"}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 inset-x-1 py-0.2 bg-zinc-900 text-white text-[8px] font-black rounded-full text-center uppercase tracking-tighter truncate px-0.5">
                    {story.badge || "Story"}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-zinc-700 max-w-[68px] truncate text-center">
                  {story.title.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>

          {/* DYNAMIC BLUE OFFER BANNER (Managed via Admin Console) */}
          {banners.length > 0 && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0B2579] via-[#0E359E] to-[#08184C] p-5 text-white shadow-xl border border-blue-400/20">
              {/* Ambient Background Glow & Confetti */}
              <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-300 via-transparent to-transparent" />
              <div className="absolute top-2 left-6 text-amber-300 text-sm animate-pulse">✨</div>
              <div className="absolute top-4 right-8 text-amber-300 text-sm animate-bounce">🎊</div>
              <div className="absolute bottom-16 right-5 text-amber-400 text-xs">🎉</div>

              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                {/* Graphic: 3 Purple Cards with ₹ and ₹10 + Stacked Gold Coins */}
                <div className="relative flex items-center justify-center w-full pt-1 pb-2">
                  {/* Left Card */}
                  <div className="relative -mr-3 transform -rotate-12 size-16 sm:size-18 rounded-2xl bg-gradient-to-b from-indigo-500 to-purple-800 border-2 border-indigo-300/40 p-2 shadow-lg flex flex-col items-center justify-center">
                    <span className="text-white/80 font-serif font-black text-xl leading-none">₹</span>
                  </div>

                  {/* Center Main Card */}
                  <div className="relative z-10 size-20 sm:size-22 rounded-2xl bg-gradient-to-b from-violet-600 to-indigo-900 border-2 border-amber-300/60 p-2 shadow-2xl flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center size-7 rounded-full bg-white/10 mb-1 border border-white/20">
                      <span className="text-amber-300 font-serif font-black text-sm">👑</span>
                    </div>
                    <span className="text-white font-serif font-black text-2xl leading-none">
                      ₹{banners[0].rewardAmount || 10}
                    </span>
                  </div>

                  {/* Right Card */}
                  <div className="relative -ml-3 transform rotate-12 size-16 sm:size-18 rounded-2xl bg-gradient-to-b from-indigo-500 to-purple-800 border-2 border-indigo-300/40 p-2 shadow-lg flex flex-col items-center justify-center">
                    <span className="text-white/80 font-serif font-black text-xl leading-none">₹</span>
                  </div>

                  {/* Gold Coins Stack (Foreground overlapping left) */}
                  <div className="absolute -bottom-1 left-12 flex flex-col items-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                    <div className="size-11 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-2 border-amber-100 flex items-center justify-center text-amber-950 font-black text-base shadow-md">
                      ₹
                    </div>
                  </div>
                </div>

                {/* Yellow Pill Button (Supports Scratch or Google Form Redirect) */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(40);
                    const b = banners[0];
                    if (b.actionType === "google_form" || b.ctaLink?.startsWith("http")) {
                      window.open(b.ctaLink, "_blank");
                    } else if (b.actionType === "internal_route" && b.ctaLink) {
                      navigate({ to: b.ctaLink as any });
                    } else {
                      setShowRewardModal(true);
                    }
                  }}
                  className="w-full max-w-xs py-3 px-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 active:scale-95 text-zinc-950 font-black text-base shadow-lg transition-all cursor-pointer tracking-wide"
                >
                  {banners[0].ctaText || "Tap to earn"}
                </button>
              </div>
            </div>
          )}

          {/* QUICK ACTIONS SECTION (Matching Uploaded Screenshot: "Change Language" card) */}
          <div className="space-y-2.5 pt-1">
            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
              Quick actions
            </h3>

            <div className="flex items-center gap-3">
              {/* Change Language Card */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(25);
                  navigate({ to: "/language" });
                }}
                className="flex flex-col items-center justify-center gap-2 p-4 w-32 h-28 bg-white hover:bg-zinc-50 active:scale-95 rounded-2xl border border-zinc-200/90 shadow-2xs transition-all cursor-pointer text-center"
              >
                <div className="flex items-center justify-center size-10 rounded-xl bg-blue-50 text-blue-600 font-black text-lg">
                  आ A
                </div>
                <span className="text-xs font-bold text-zinc-800 leading-tight">
                  Change Language
                </span>
              </button>
            </div>
          </div>

          {/* FOOTER: PROUDLY MADE IN INDIA & CRAFTED IN UTTAR PRADESH WITH SKYLINE (Matching Screenshot) */}
          <div className="pt-6 pb-2 text-center space-y-3">
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                Proudly made
              </p>
              <h4 className="text-xl font-black text-zinc-900 tracking-tight flex items-center justify-center gap-1.5">
                <span>in India</span>
                <span>💛</span>
              </h4>
              <p className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block mt-1">
                Crafted in Uttar Pradesh 🇮🇳
              </p>
            </div>

            {/* Indian & Uttar Pradesh Heritage Monuments Line-Art Skyline Illustration */}
            <div className="w-full flex justify-center opacity-85 px-4 pt-1">
              <svg
                viewBox="0 0 500 130"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full max-w-sm text-zinc-300 stroke-current stroke-[1.2]"
              >
                {/* Left: Temple / Monument Towers */}
                <path d="M20 120V80L35 60L50 80V120" strokeLinecap="round" />
                <path d="M35 60V40L35 30" strokeLinecap="round" />
                <path d="M28 85H42" strokeLinecap="round" />
                <path d="M28 98H42" strokeLinecap="round" />

                {/* Left Skyscraper / Highrise */}
                <rect x="60" y="45" width="30" height="75" rx="1" />
                <line x1="68" y1="55" x2="82" y2="55" />
                <line x1="68" y1="65" x2="82" y2="65" />
                <line x1="68" y1="75" x2="82" y2="75" />
                <line x1="68" y1="85" x2="82" y2="85" />
                <line x1="68" y1="95" x2="82" y2="95" />

                {/* Clocktower */}
                <rect x="100" y="30" width="22" height="90" rx="1" />
                <circle cx="111" cy="45" r="5" />
                <path d="M100 30L111 15L122 30" strokeLinecap="round" />

                {/* Center: Vidhan Sabha / Lucknow Dome & Colonnades */}
                <path d="M170 120V75H330V120" />
                {/* Grand Dome */}
                <path d="M220 75C220 50 235 35 250 35C265 35 280 50 280 75" />
                <path d="M250 35V20" strokeLinecap="round" strokeWidth="1.5" />
                {/* Smaller Side Domes */}
                <path d="M185 75C185 62 193 55 202 55C211 55 219 62 219 75" />
                <path d="M281 75C281 62 289 55 298 55C307 55 315 62 315 75" />
                {/* Colonnade Pillars */}
                <line x1="190" y1="85" x2="190" y2="120" />
                <line x1="210" y1="85" x2="210" y2="120" />
                <line x1="230" y1="85" x2="230" y2="120" />
                <line x1="250" y1="85" x2="250" y2="120" />
                <line x1="270" y1="85" x2="270" y2="120" />
                <line x1="290" y1="85" x2="290" y2="120" />
                <line x1="310" y1="85" x2="310" y2="120" />

                {/* Right: Rumi Darwaza / Arches & Minarets */}
                <rect x="345" y="40" width="28" height="80" rx="1" />
                <path d="M345 40L359 25L373 40" strokeLinecap="round" />
                <line x1="352" y1="52" x2="366" y2="52" />
                <line x1="352" y1="64" x2="366" y2="64" />
                <line x1="352" y1="76" x2="366" y2="76" />

                {/* Right Skyscraper & Trees */}
                <rect x="385" y="55" width="35" height="65" rx="1" />
                <line x1="393" y1="68" x2="412" y2="68" />
                <line x1="393" y1="80" x2="412" y2="80" />
                <line x1="393" y1="92" x2="412" y2="92" />

                {/* Right Monument */}
                <path d="M435 120V75L455 55L475 75V120" strokeLinecap="round" />
                <line x1="445" y1="88" x2="465" y2="88" />
                <line x1="445" y1="102" x2="465" y2="102" />

                {/* Ground Base Line */}
                <line x1="10" y1="120" x2="490" y2="120" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 4. INSTAGRAM/RAPIDO STYLE FULL-SCREEN STORY PLAYER MODAL */}
      <CaptainStoryModal
        isOpen={isStoryModalOpen}
        initialIndex={storyModalIndex}
        stories={stories}
        onClose={() => setIsStoryModalOpen(false)}
      />

      {/* 5. "TAP TO EARN" REWARD SCRATCH CARD MODAL */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200 border border-zinc-200">
            <div className="flex justify-between items-center pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Captain Mystery Reward
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowRewardModal(false);
                  setRewardScratched(false);
                }}
                className="size-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div
              onClick={() => {
                triggerHaptic([40, 80, 120]);
                setRewardScratched(true);
                toast.success("🎉 ₹10 Captain Bonus added to your wallet!");
              }}
              className={`p-6 rounded-2xl cursor-pointer transition-all border-2 ${
                rewardScratched
                  ? "bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-400 shadow-inner"
                  : "bg-gradient-to-br from-indigo-700 to-purple-900 border-indigo-400 text-white shadow-xl hover:scale-102 active:scale-98"
              }`}
            >
              {!rewardScratched ? (
                <div className="space-y-2">
                  <div className="text-4xl">🎁</div>
                  <p className="text-sm font-black text-amber-300 uppercase">
                    Tap to Scratch & Reveal
                  </p>
                  <p className="text-[10px] text-white/70">
                    Guaranteed instant cash reward for active duty!
                  </p>
                </div>
              ) : (
                <div className="space-y-1 animate-in zoom-in-75 duration-200">
                  <div className="text-4xl">💰</div>
                  <p className="text-xs font-bold text-amber-800">You Won!</p>
                  <p className="text-3xl font-black text-zinc-950">₹10 Cash</p>
                  <p className="text-[10px] text-emerald-700 font-bold">
                    ✓ Credited to QuickPress Wallet
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowRewardModal(false);
                setRewardScratched(false);
                navigate({ to: "/wallet" });
              }}
              className="w-full py-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs transition-all cursor-pointer shadow-md"
            >
              Go to Wallet ➔
            </button>
          </div>
        </div>
      )}

      {/* 6. 24/7 SUPPORT & SOS MODAL */}
      <CaptainSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      {/* 7. SURGE FARE AREA MODAL (Video 00:26 Match) */}
      <CaptainSurgeAreaModal
        isOpen={isSurgeModalOpen}
        onClose={() => setIsSurgeModalOpen(false)}
        currentCoords={currentCoords}
      />

      {/* 8. GO TO AREA MODAL (Video 00:31 Match) */}
      <CaptainGoToAreaModal
        isOpen={isGoToModalOpen}
        onClose={() => setIsGoToModalOpen(false)}
        isActive={isGoToActive}
        onToggleActive={setIsGoToActive}
      />

      {/* 9. FULL ORDER / TRIP DETAIL VIEW MODAL */}
      {selectedTripForDetail && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <CaptainTripDetailView
            trip={selectedTripForDetail}
            onBack={() => setSelectedTripForDetail(null)}
          />
        </div>
      )}
    </div>
  );
};
