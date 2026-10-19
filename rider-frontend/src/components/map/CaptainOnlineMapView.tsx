import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { LiveDeliveryMap, type GoogleMapLayerType, type SurgeHotspot } from "./LiveDeliveryMap";
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
  fetchSurgeZones,
  type SurgeHotspotData,
} from "../../api/rider/rider-surge-api";
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

  // Real Dynamic Surge & Go to Modals
  const [isSurgeModalOpen, setIsSurgeModalOpen] = useState(false);
  const [isGoToModalOpen, setIsGoToModalOpen] = useState(false);
  const [isGoToActive, setIsGoToActive] = useState(false);
  const [onlineMinutesElapsed, setOnlineMinutesElapsed] = useState(1);
  const [surgeHotspots, setSurgeHotspots] = useState<SurgeHotspot[]>([]);
  const [maxSurgeBonus, setMaxSurgeBonus] = useState<number>(0);

  // Swipe / Scroll gesture support for bottom sheet drawer (scroll up to open, scroll down to close)
  const drawerTouchStartYRef = useRef<number | null>(null);
  const drawerScrollRef = useRef<HTMLDivElement | null>(null);

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    drawerTouchStartYRef.current = e.touches[0].clientY;
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (drawerTouchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - drawerTouchStartYRef.current;

    // Swipe up on collapsed drawer -> open
    if (!isDrawerExpanded && deltaY < -20) {
      triggerHaptic(20);
      setIsDrawerExpanded(true);
      drawerTouchStartYRef.current = null;
    }
    // Swipe down on expanded drawer -> close (only when scroll position is at the top)
    else if (isDrawerExpanded && deltaY > 30) {
      if (!drawerScrollRef.current || drawerScrollRef.current.scrollTop <= 5) {
        triggerHaptic(20);
        setIsDrawerExpanded(false);
        drawerTouchStartYRef.current = null;
      }
    }
  };

  const handleDrawerTouchEnd = () => {
    drawerTouchStartYRef.current = null;
  };

  const handleDrawerWheel = (e: React.WheelEvent) => {
    if (!isDrawerExpanded && e.deltaY > 5) {
      setIsDrawerExpanded(true);
    } else if (isDrawerExpanded && e.deltaY < -10) {
      if (!drawerScrollRef.current || drawerScrollRef.current.scrollTop <= 0) {
        setIsDrawerExpanded(false);
      }
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



  // Periodic & location-based real-time surge updates
  useEffect(() => {
    let active = true;
    const loadSurge = () => {
      fetchSurgeZones(currentCoords?.lat, currentCoords?.lng)
        .then((res) => {
          if (!active) return;
          if (res && Array.isArray(res.zones) && res.zones.length > 0) {
            setSurgeHotspots(res.zones);
            const highest = Math.max(...res.zones.map((z) => z.bonus || 0));
            setMaxSurgeBonus(highest > 0 ? highest : 25);
          }
        })
        .catch(() => {});
    };

    loadSurge();
    const interval = setInterval(loadSurge, 25000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentCoords?.lat, currentCoords?.lng]);

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

  // Inline SVG artwork for each of the 5 stories matching the screenshot
  const renderStoryVisual = (story: RiderStoryItem, index: number) => {
    if (story.imageUrl) {
      return <img src={story.imageUrl} alt={story.title} className="size-full object-cover" />;
    }

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
      {/* 1. FULL-BLEED WHITE & EMERALD GREEN MAP CANVAS WITH LIVE SURGE */}
      <div className="absolute inset-0 size-full z-0">
        <LiveDeliveryMap
          riderLocation={memoizedRiderLocation}
          phase="online"
          heightClassName="h-full w-full"
          showControls={false}
          showSurgePins={true}
          surgeHotspots={surgeHotspots}
          isRapidoTheme={true}
          activeLayerOverride={mapLayer}
          onLayerChange={setMapLayer}
          onSurgeClick={() => {
            triggerHaptic(30);
            setIsSurgeModalOpen(true);
          }}
        />
      </div>

      {/* 2. FLOATING TOP ALERT (Only if Pending Dispatches Exist) */}
      {pendingOrdersCount > 0 && (
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-2 pointer-events-none">
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
        </div>
      )}

      {/* 3. FLOATING MAP CONTROLS (Exact Screenshot Match: Left Surge/Go To/..., Right Recenter & SOS) */}
      {/* Left Edge: Surge, Go to, ... Pills */}
      <div
        className={`absolute bottom-[220px] left-3.5 z-20 flex items-center gap-2 pointer-events-auto select-none transition-all duration-300 ${
          isDrawerExpanded ? "opacity-0 pointer-events-none translate-y-3" : "opacity-100 pointer-events-auto translate-y-0"
        }`}
      >
        {/* Surge Pill with Red Upward Icon */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setIsSurgeModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-full border border-zinc-200/80 shadow-md text-xs font-semibold text-zinc-900 active:scale-95 transition-transform cursor-pointer"
        >
          <div className="flex items-center justify-center size-5 rounded-full bg-red-600 text-white shadow-2xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
          <span>Surge</span>
        </button>

        {/* Go to Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setIsGoToModalOpen(true);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border shadow-md text-xs font-semibold active:scale-95 transition-all cursor-pointer ${
            isGoToActive
              ? "bg-[#1E40AF] text-white border-blue-700 shadow-blue-500/30"
              : "bg-white text-zinc-900 border-zinc-200/80"
          }`}
        >
          <div className="flex items-center justify-center size-5 rounded-full bg-rose-50 text-rose-600">
            <MapPin className="size-3.5 text-rose-500 fill-rose-500" />
          </div>
          <span>Go to</span>
        </button>

        {/* More Actions (...) Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setIsSupportModalOpen(true);
          }}
          className="flex items-center justify-center size-9 bg-white rounded-full border border-zinc-200/80 shadow-md text-zinc-800 font-black text-sm active:scale-95 transition-transform cursor-pointer"
        >
          <span>•••</span>
        </button>
      </div>

      {/* Right Edge: Recenter & SOS Siren Buttons */}
      <div
        className={`absolute bottom-[218px] right-3.5 z-20 flex flex-col gap-2.5 pointer-events-auto select-none transition-all duration-300 ${
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
          className="flex size-11 items-center justify-center rounded-full bg-white shadow-md border border-zinc-200/80 text-blue-600 active:scale-90 transition-transform cursor-pointer"
          title="Recenter on Captain"
        >
          <Crosshair className="size-5 text-blue-600 stroke-[2.4]" />
        </button>

        {/* Red SOS / Emergency Siren Button with Radiating Rays */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(40);
            setIsSupportModalOpen(true);
          }}
          className="flex size-11 items-center justify-center rounded-full bg-white shadow-md border border-zinc-200/80 text-red-600 active:scale-90 transition-transform cursor-pointer"
          title="24/7 SOS Helpline"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 18V11C7 8.24 9.24 6 12 6C14.76 6 17 8.24 17 11V18" />
            <path d="M5 18H19V20H5Z" />
            <path d="M12 2V4" />
            <path d="M4 8L5.5 9.5" />
            <path d="M20 8L18.5 9.5" />
            <path d="M2 13H4" />
            <path d="M20 13H22" />
          </svg>
        </button>
      </div>

      {/* 4. RAPIDO BOTTOM SHEET DRAWER (Scroll/Swipe Up to Open, Scroll Down to Close - No Tap Toggle) */}
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

        {/* Dynamic Story / Highlight Bubbles Row (Horizontal Scroll) */}
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

                {/* Overlapping Pill Badge (Follow / Money Transf...) */}
                {story.badge && (sIdx === 0 || sIdx === 1) && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded-full text-[8.5px] font-bold text-white bg-[#1F2430] border border-white/80 shadow-xs">
                    {story.badge}
                  </div>
                )}
              </div>

              {/* Title Label Below Circle */}
              <span className="text-[11.5px] font-normal text-zinc-900 text-center max-w-[70px] truncate leading-tight mt-1.5">
                {story.title}
              </span>
            </button>
          ))}
        </div>

        {/* Thin Divider Line Below Stories */}
        <div className="w-full h-px bg-zinc-150/80 my-2" />

        {/* Quick Actions Header & Card */}
        <div className="px-4 pb-2">
          <p className="text-[13.5px] font-semibold text-zinc-800 mb-2">Quick actions</p>

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

          {/* Expanded Drawer Content (Shown when scrolled up) */}
          {isDrawerExpanded && (
            <div className="space-y-4 pt-3 animate-in fade-in duration-200">
              {/* DYNAMIC BLUE OFFER BANNER */}
              {banners.length > 0 && (
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0B2579] via-[#0E359E] to-[#08184C] p-5 text-white shadow-xl border border-blue-400/20">
                  <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-300 via-transparent to-transparent" />
                  <div className="absolute top-2 left-6 text-amber-300 text-sm animate-pulse">✨</div>
                  <div className="absolute top-4 right-8 text-amber-300 text-sm animate-bounce">🎊</div>
                  <div className="absolute bottom-16 right-5 text-amber-400 text-xs">🎉</div>

                  <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                    <div className="relative flex items-center justify-center w-full pt-1 pb-2">
                      <div className="relative -mr-3 transform -rotate-12 size-16 sm:size-18 rounded-2xl bg-gradient-to-b from-indigo-500 to-purple-800 border-2 border-indigo-300/40 p-2 shadow-lg flex flex-col items-center justify-center">
                        <span className="text-white/80 font-serif font-black text-xl leading-none">₹</span>
                      </div>
                      <div className="relative z-10 size-20 sm:size-22 rounded-2xl bg-gradient-to-b from-violet-600 to-indigo-900 border-2 border-amber-300/60 p-2 shadow-2xl flex flex-col items-center justify-center">
                        <div className="flex items-center justify-center size-7 rounded-full bg-white/10 mb-1 border border-white/20">
                          <span className="text-amber-300 font-serif font-black text-sm">👑</span>
                        </div>
                        <span className="text-white font-serif font-black text-2xl leading-none">
                          ₹{banners[0].rewardAmount || 10}
                        </span>
                      </div>
                      <div className="relative -ml-3 transform rotate-12 size-16 sm:size-18 rounded-2xl bg-gradient-to-b from-indigo-500 to-purple-800 border-2 border-indigo-300/40 p-2 shadow-lg flex flex-col items-center justify-center">
                        <span className="text-white/80 font-serif font-black text-xl leading-none">₹</span>
                      </div>
                      <div className="absolute -bottom-1 left-12 flex flex-col items-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                        <div className="size-11 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-2 border-amber-100 flex items-center justify-center text-amber-950 font-black text-base shadow-md">
                          ₹
                        </div>
                      </div>
                    </div>

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

              {/* ADDITIONAL QUICK ACTION BUTTONS */}
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
                    setIsSupportModalOpen(true);
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

              {/* FOOTER: PROUDLY MADE IN INDIA & CRAFTED IN UTTAR PRADESH */}
              <div className="pt-4 pb-4 text-center select-none flex flex-col items-center">
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
