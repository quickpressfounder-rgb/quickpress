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
        {/* Main Signature Clean Card */}
        <div className="pointer-events-auto flex items-center justify-between p-2.5 bg-white/95 backdrop-blur-md rounded-2xl border border-zinc-200/90 shadow-md text-xs">
          {/* Duty Status & Radar Wave */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center size-8 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-200">
              <span className="absolute size-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
              <span className="relative size-2 rounded-full bg-emerald-600" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-zinc-950 tracking-wide text-xs uppercase">
                  ON DUTY
                </span>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  Radar Active
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium truncate max-w-[220px] sm:max-w-[280px]">
                {t("dash.searching", "Searching nearby rides in Kasganj...")}
              </p>
            </div>
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

      {/* 2. FLOATING MAP CONTROLS (Screenshot 3 Match) */}
      {/* Left Edge: Surge, Go to, ... Pills */}
      <div className="absolute bottom-[240px] left-3.5 z-20 flex items-center gap-2 pointer-events-auto select-none">
        {/* Surge Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            toast.info("Surge Pricing Active: +₹20 extra bonus on orders in high-demand zones!");
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/98 rounded-full border border-zinc-200 shadow-md text-xs font-bold text-zinc-900 active:scale-95 transition-transform cursor-pointer"
        >
          <div className="flex items-center justify-center size-4 rounded-full bg-red-100 text-red-600">
            <span className="text-[11px] font-black leading-none">↑</span>
          </div>
          <span>Surge</span>
        </button>

        {/* Go to Pill */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            toast.info("Set Preferred Destination: Choose area to receive orders on the way home.");
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/98 rounded-full border border-zinc-200 shadow-md text-xs font-bold text-zinc-900 active:scale-95 transition-transform cursor-pointer"
        >
          <MapPin className="size-3.5 text-red-500 fill-red-500" />
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
      <div className="absolute bottom-[240px] right-3.5 z-20 flex flex-col gap-2.5 pointer-events-auto select-none">
        {/* Blue Crosshair / Recenter Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(40);
            if (onRecenter) onRecenter();
            toast.info("Map centered at live location 📍");
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

      {/* 3. RAPIDO BOTTOM SHEET DRAWER (Screenshot 3 Match) */}
      <div
        className="absolute left-0 right-0 bottom-0 z-30 pointer-events-auto transition-all duration-300 ease-in-out select-none bg-white rounded-t-3xl border-t border-zinc-200/80 shadow-2xl pb-20 pt-2"
      >
        {/* Drag Handle Chevron */}
        <div className="flex justify-center pb-2">
          <ChevronUp className="size-5 text-zinc-400 stroke-[2.5]" />
        </div>

        {/* Circular Story / Highlight Bubbles Row (Horizontal Scroll) */}
        <div className="flex items-start gap-4 px-4 overflow-x-auto no-scrollbar pb-3">
          {/* Bubble 1: Follow */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              window.open("https://instagram.com", "_blank");
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
          >
            <div className="relative size-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-xs">
              <div className="size-full rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                <div className="size-full rounded-full bg-amber-50 flex items-center justify-center text-xl font-black text-amber-600">
                  🛵
                </div>
              </div>
              <span className="absolute -bottom-1 inset-x-1 py-0.2 bg-zinc-900 text-white text-[8px] font-black rounded-full text-center uppercase tracking-tighter">
                Follow
              </span>
            </div>
            <span className="text-[11px] font-bold text-zinc-700">Follow</span>
          </button>

          {/* Bubble 2: Transfer Money */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/wallet" });
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
          >
            <div className="relative size-14 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-xs">
              <div className="size-full rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                <div className="size-full rounded-full bg-emerald-50 flex items-center justify-center text-xl font-black text-emerald-700">
                  🏦
                </div>
              </div>
              <span className="absolute -bottom-1 inset-x-0.5 py-0.2 bg-zinc-900 text-white text-[8px] font-black rounded-full text-center truncate px-1">
                Money Transf...
              </span>
            </div>
            <span className="text-[11px] font-bold text-zinc-700">Transfer Money</span>
          </button>

          {/* Bubble 3: Earn 2000 */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              toast.success("Refer a Captain Friend and earn ₹2,000 bonus after their 25th trip!");
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
          >
            <div className="relative size-14 rounded-full p-0.5 bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-xs">
              <div className="size-full rounded-full bg-blue-950 p-1 flex flex-col items-center justify-center text-center overflow-hidden text-white">
                <span className="text-[7px] font-black text-amber-300 uppercase leading-none">REFER & EARN</span>
                <span className="text-[11px] font-black text-white leading-tight">₹2000</span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-zinc-700">Earn 2000</span>
          </button>

          {/* Bubble 4: Auto Boost */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/incentives" });
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
          >
            <div className="relative size-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-amber-500 shadow-xs">
              <div className="size-full rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                <div className="size-full rounded-full bg-amber-50 flex items-center justify-center text-xl">
                  ⚡
                </div>
              </div>
              <span className="absolute -bottom-1 inset-x-1 py-0.2 bg-zinc-900 text-white text-[8px] font-black rounded-full text-center">
                Auto Boost
              </span>
            </div>
            <span className="text-[11px] font-bold text-zinc-700">Auto Boost</span>
          </button>

          {/* Bubble 5: Performance */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/profile" });
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
          >
            <div className="relative size-14 rounded-full p-0.5 bg-gradient-to-tr from-purple-400 to-pink-500 shadow-xs">
              <div className="size-full rounded-full bg-white p-0.5 flex items-center justify-center overflow-hidden">
                <div className="size-full rounded-full bg-purple-50 flex items-center justify-center text-xl">
                  🏅
                </div>
              </div>
              <span className="absolute -bottom-1 inset-x-1 py-0.2 bg-zinc-900 text-white text-[8px] font-black rounded-full text-center">
                Perfo...
              </span>
            </div>
            <span className="text-[11px] font-bold text-zinc-700">Performance</span>
          </button>
        </div>

        {/* "Only for you" Ornamental Header & Promo Banner */}
        <div className="px-4 pt-1 space-y-2">
          <div className="flex items-center justify-center gap-2 text-zinc-500">
            <span className="text-zinc-300">~</span>
            <span className="text-xs font-bold text-zinc-700 tracking-wide font-serif italic">Only for you</span>
            <span className="text-zinc-300">~</span>
          </div>

          <div
            onClick={() => {
              triggerHaptic(20);
              navigate({ to: "/incentives" });
            }}
            className="w-full p-3.5 bg-gradient-to-r from-zinc-900 via-zinc-950 to-neutral-900 text-white rounded-2xl shadow-md flex items-center justify-between cursor-pointer active:scale-99 transition-all"
          >
            <div className="space-y-0.5">
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFC107] text-black">
                TODAY'S SPECIAL
              </span>
              <p className="text-xs font-bold text-zinc-200 mt-1">Complete 5 orders today for ₹150 extra cash!</p>
            </div>
            <span className="text-xs font-black text-[#FFC107] flex items-center gap-1">
              <span>View</span>
              <span>➔</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. 24/7 SUPPORT & SOS MODAL */}
      <CaptainSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />



      {/* 7. FULL ORDER / TRIP DETAIL VIEW MODAL */}
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
