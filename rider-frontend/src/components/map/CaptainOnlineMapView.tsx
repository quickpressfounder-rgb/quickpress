import React, { useState, useEffect, useMemo } from "react";
import {
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
  Route,
} from "lucide-react";
import { LiveDeliveryMap, type GoogleMapLayerType, type SurgeHotspot, KASGANJ_SURGE_HOTSPOTS } from "./LiveDeliveryMap";
import { fetchSurgeZones, type SurgeZonesResponse, type SurgeHotspotData } from "../../api/rider/rider-surge-api";
import { fetchRouteBookingState, type RouteBookingState } from "../../api/rider/rider-route-booking-api";
import { useLanguage } from "../../lib/i18n";
import { triggerHaptic } from "../../lib/captain-audio";
import { toast } from "sonner";
import { CaptainSupportModal } from "../support/CaptainSupportModal";
import { CaptainRouteBookingModal } from "../navigation/CaptainRouteBookingModal";

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
  const { t } = useLanguage();
  const [mapLayer, setMapLayer] = useState<GoogleMapLayerType>("roadmap");
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [selectedSurge, setSelectedSurge] = useState<SurgeHotspot | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [surgeData, setSurgeData] = useState<SurgeZonesResponse | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [routeBooking, setRouteBooking] = useState<RouteBookingState | null>(null);

  const loadRouteBooking = async () => {
    try {
      const res = await fetchRouteBookingState();
      if (res && res.riderId) {
        setRouteBooking(res);
      }
    } catch {
      /* Keep existing state */
    }
  };

  useEffect(() => {
    loadRouteBooking();
    const interval = setInterval(loadRouteBooking, 20000);
    return () => clearInterval(interval);
  }, []);

  // Poll live dynamic surge engine
  useEffect(() => {
    let isMounted = true;
    const loadSurge = async () => {
      try {
        const res = await fetchSurgeZones(currentCoords?.lat, currentCoords?.lng);
        if (isMounted) {
          setSurgeData(res);
        }
      } catch {
        /* Keep existing state */
      }
    };

    loadSurge();
    const interval = setInterval(loadSurge, 25000);
    return () => {
      isMounted = false;
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

  const handleSurgeClick = (surge: SurgeHotspot) => {
    setSelectedSurge(surge);
    triggerHaptic(50);
    toast.info(`${surge.name}: ${surge.multiplier} Surge (+₹${surge.bonus}/ride) 🔥`);
  };

  const memoizedRiderLocation = useMemo(() => {
    if (!currentCoords?.lat || !currentCoords?.lng) return null;
    return { lat: currentCoords.lat, lng: currentCoords.lng, label: "You (Captain)" };
  }, [currentCoords?.lat, currentCoords?.lng]);

  const memoizedSurgeHotspots = useMemo(() => surgeData?.zones || [], [surgeData?.zones]);

  return (
    <div className="relative flex flex-col flex-1 w-full h-full bg-white text-zinc-900 select-none overflow-hidden font-sans">
      {/* 1. FULL-BLEED WHITE & EMERALD GREEN MAP CANVAS */}
      <div className="absolute inset-0 size-full z-0">
        <LiveDeliveryMap
          riderLocation={memoizedRiderLocation}
          phase="online"
          heightClassName="h-full w-full"
          showControls={false}
          showSurgePins={true}
          surgeHotspots={memoizedSurgeHotspots}
          isRapidoTheme={true}
          activeLayerOverride={mapLayer}
          onLayerChange={setMapLayer}
          onSurgeClick={handleSurgeClick}
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
              <p className="text-[11px] text-zinc-500 font-medium truncate max-w-[170px] sm:max-w-[220px]">
                {surgeData?.isRiderInSurgeZone
                  ? `⚡ In ${surgeData.currentZone?.name.split(" ")[0]} Surge Zone`
                  : t("dash.searching", "Searching nearby rides in Kasganj...")}
              </p>
            </div>
          </div>

          {/* Today's Quick Earnings Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/wallet";
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs rounded-xl shadow-xs active:scale-95 transition-all"
            >
              <Wallet className="size-3.5 text-zinc-300" />
              <span>₹{todayEarnings.toFixed(0)}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Surge Banner: Rider is INSIDE a surge zone */}
        {surgeData?.isRiderInSurgeZone && surgeData?.currentZone && (
          <div className="pointer-events-auto animate-in slide-in-from-top-2 duration-200 flex items-center justify-between px-3 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white rounded-2xl shadow-lg shadow-red-600/25 font-bold text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex size-2.5 shrink-0">
                <span className="absolute inline-flex size-full rounded-full bg-white opacity-75 animate-ping" />
                <span className="relative inline-flex size-2.5 rounded-full bg-white" />
              </span>
              <span className="truncate">
                🔥 <strong className="font-black">SURGE ACTIVE: +₹{surgeData.activeSurgeBonus}/ride</strong> ({surgeData.activeMultiplier} bonus on every trip)
              </span>
            </div>
            <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-md font-black shrink-0 ml-2">
              {surgeData.currentZone.name.split(" ")[0]}
            </span>
          </div>
        )}

        {/* Dynamic Surge Banner: Rider is OUTSIDE, show nearest hotspot recommendation */}
        {surgeData?.nearestZone && !surgeData.isRiderInSurgeZone && (
          <div
            onClick={() => handleSurgeClick(surgeData.nearestZone as any)}
            className="pointer-events-auto cursor-pointer animate-in slide-in-from-top-2 duration-200 flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-zinc-900 rounded-2xl shadow-sm text-xs font-bold active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Flame className="size-4 text-amber-600 shrink-0 animate-pulse" />
              <span className="truncate">
                ⚡ Hotspot: <strong className="text-zinc-950 font-black">{surgeData.nearestZone.name}</strong> (+₹{surgeData.nearestZone.bonus} Surge)
              </span>
            </div>
            <span className="text-[11px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300 shrink-0 ml-2">
              {surgeData.nearestZone.distanceKm > 0 ? `${surgeData.nearestZone.distanceKm} km` : "Nearby"} ➔
            </span>
          </div>
        )}

        {/* Dynamic Route Booking Active Banner */}
        {routeBooking?.isActive && (
          <div
            onClick={() => {
              triggerHaptic(40);
              setIsRouteModalOpen(true);
            }}
            className="pointer-events-auto cursor-pointer animate-in slide-in-from-top-2 duration-200 flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-lg shadow-emerald-600/30 font-bold text-xs active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/25">
                <Route className="size-4 text-white animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white truncate">
                    My Route: {routeBooking.destinationName || "Active Destination"}
                  </span>
                  <span className="text-[10px] bg-white/25 text-white px-1.5 py-0.5 rounded font-black">
                    ±{routeBooking.maxDetourKm}km
                  </span>
                </div>
                <p className="text-[10px] text-emerald-100 font-medium truncate">
                  Targeted orders on route · {routeBooking.remainingPassesToday ?? 3} passes left
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-white text-emerald-800 px-2.5 py-1 rounded-lg font-black shrink-0 ml-2 shadow-xs">
              Manage ➔
            </span>
          </div>
        )}

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

        {/* Selected Surge Micro-Banner / Detail Preview */}
        {selectedSurge && (
          <div className="pointer-events-auto animate-in slide-in-from-top-2 duration-200 flex items-center justify-between px-3 py-2.5 bg-white/95 backdrop-blur-md border border-amber-300 text-zinc-900 rounded-2xl shadow-lg font-bold text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-7 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-300">
                <Flame className="size-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-zinc-950 truncate">{selectedSurge.name}</span>
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-black">
                    +{selectedSurge.multiplier}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-medium">
                  +₹{selectedSurge.bonus} Extra per Trip
                  {selectedSurge.ordersWaiting !== undefined && ` · ${selectedSurge.ordersWaiting} orders waiting`}
                  {selectedSurge.distanceKm !== undefined && ` · ${selectedSurge.distanceKm} km away`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSurge(null)}
              className="p-1 hover:bg-zinc-100 rounded-full active:scale-90 text-zinc-500 ml-2"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. FLOATING MAP CONTROLS (Right Edge - White & Emerald Green) */}
      <div className="absolute top-20 right-3 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Recenter on Captain */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(40);
            if (onRecenter) onRecenter();
            toast.info("Map centered at Captain GPS 📍");
          }}
          className="flex size-11 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-[#00C853] shadow-lg border border-emerald-200 hover:bg-emerald-50 active:scale-90 transition-transform cursor-pointer"
          title="Recenter on Captain"
        >
          <Crosshair className="size-5.5" />
        </button>

        {/* My Route Booking Engine Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(40);
            setIsRouteModalOpen(true);
          }}
          className={`relative flex size-11 items-center justify-center rounded-2xl backdrop-blur-md shadow-lg border active:scale-90 transition-transform cursor-pointer ${
            routeBooking?.isActive
              ? "bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/30 ring-2 ring-emerald-400/50"
              : "bg-white/95 text-zinc-700 border-zinc-200 hover:bg-zinc-50"
          }`}
          title={routeBooking?.isActive ? `Route Mode: ${routeBooking.destinationName}` : "My Route Booking"}
        >
          <Route className="size-5" />
          {routeBooking?.isActive && (
            <span className="absolute -top-1 -right-1 flex size-3">
              <span className="absolute inline-flex size-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-400 border-2 border-white" />
            </span>
          )}
        </button>

        {/* Day / Night / Satellite Mode Switcher */}
        <button
          type="button"
          onClick={handleToggleLayer}
          className="flex size-11 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-zinc-700 shadow-lg border border-zinc-200 hover:bg-zinc-50 active:scale-90 transition-transform cursor-pointer"
          title={`Map View: ${mapLayer}`}
        >
          {mapLayer === "night" ? (
            <Moon className="size-5 text-indigo-500" />
          ) : mapLayer === "satellite" ? (
            <Layers className="size-5 text-[#00C853]" />
          ) : (
            <Sun className="size-5 text-amber-500" />
          )}
        </button>

        {/* 24/7 SOS / Support Action */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(40);
            setIsSupportModalOpen(true);
          }}
          className="flex size-11 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-red-600 shadow-lg border border-red-200 hover:bg-red-50 active:scale-90 transition-transform cursor-pointer"
          title="24/7 SOS Helpline"
        >
          <ShieldAlert className="size-5 text-red-600" />
        </button>
      </div>

      {/* 4. SLIDING BOTTOM SHEET DRAWER (White & Emerald Green) */}
      <div
        className="absolute left-0 right-0 z-30 pointer-events-auto transition-all duration-300 ease-in-out"
        style={{
          bottom: "max(env(safe-area-inset-bottom, 0px) + 70px, 80px)",
        }}
      >
        <div className="mx-3 rounded-3xl bg-white/98 backdrop-blur-xl border border-emerald-100 shadow-2xl text-zinc-900 overflow-hidden">
          {/* Drawer Pull-Handle & Header Strip */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(30);
              setIsDrawerExpanded(!isDrawerExpanded);
            }}
            className="w-full flex flex-col items-center pt-2 pb-1.5 px-4 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
          >
            <div className="w-10 h-1 rounded-full bg-zinc-300 mb-2" />
            <div className="w-full flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-black text-sm">
                  ₹{todayEarnings.toFixed(0)}
                </span>
                <span className="text-[11px] text-black font-semibold">
                  · {todayDeliveries} {todayDeliveries === 1 ? "Trip" : "Trips"} Today
                </span>
                <span className="text-[10px] font-black text-[#00C853] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  0% Commission
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-black text-black">
                <span>{isDrawerExpanded ? "Collapse" : "Live Details"}</span>
                {isDrawerExpanded ? (
                  <ChevronDown className="size-3.5 text-black" />
                ) : (
                  <ChevronUp className="size-3.5 text-black" />
                )}
              </div>
            </div>
          </button>

          {/* Expanded Drawer Details (Metrics + Hotspot Advisory) */}
          {isDrawerExpanded && (
            <div className="px-4 pb-4 space-y-3 text-xs border-t border-zinc-100 pt-3 animate-in fade-in duration-200 text-black">
              {/* Daily Target Progress Bar */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-black">
                  <span className="flex items-center gap-1 text-black">
                    <Target className="size-3.5 text-[#00C853]" />
                    <span>Daily Target: 5 Rides for ₹100 Bonus</span>
                  </span>
                  <span className="font-mono text-black font-black">
                    {Math.min(5, todayDeliveries)}/5 Done
                  </span>
                </div>
                <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00C853] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (todayDeliveries / 5) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Dynamic Hotspot Advisory */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-2.5">
                <Flame className="size-4 text-[#00C853] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-black">
                    {surgeData?.isRiderInSurgeZone
                      ? `🟢 You are inside +₹${surgeData.activeSurgeBonus} Surge Zone!`
                      : "Live Surge Hotspots Active Near You"}
                  </p>
                  <p className="text-[10px] text-black font-medium mt-0.5 leading-relaxed">
                    {surgeData?.zones && surgeData.zones.length >= 2
                      ? `${surgeData.zones[0].name} (+₹${surgeData.zones[0].bonus}) & ${surgeData.zones[1].name} (+₹${surgeData.zones[1].bonus}) are experiencing high order demand. Stay within zone for instant matching!`
                      : "Kasganj Junction Station & Gandhi Murti are experiencing surge demand. Stay within 3 km for instant ride matching!"}
                  </p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/wallet";
                  }}
                  className="p-2.5 bg-white hover:bg-emerald-50 rounded-xl text-center font-black text-[11px] text-black border border-emerald-200 shadow-xs active:scale-95 transition-all"
                >
                  💰 View Full Passbook
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/incentives";
                  }}
                  className="p-2.5 bg-white hover:bg-emerald-50 rounded-xl text-center font-black text-[11px] text-black border border-emerald-200 shadow-xs active:scale-95 transition-all"
                >
                  🎯 View All Slabs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. 24/7 SUPPORT & SOS MODAL */}
      <CaptainSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      {/* 6. MY ROUTE BOOKING ENGINE MODAL */}
      <CaptainRouteBookingModal
        isOpen={isRouteModalOpen}
        onClose={() => {
          setIsRouteModalOpen(false);
          loadRouteBooking();
        }}
        onUpdated={(updated) => setRouteBooking(updated)}
      />
    </div>
  );
};
