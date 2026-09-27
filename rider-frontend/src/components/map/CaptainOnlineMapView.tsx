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
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { LiveDeliveryMap, type GoogleMapLayerType } from "./LiveDeliveryMap";
import { fetchRouteBookingState, type RouteBookingState } from "../../api/rider/rider-route-booking-api";
import { fetchRiderHistory } from "../../api/rider/rider-orders-api";
import { CaptainTripDetailView } from "../history/CaptainTripDetailView";
import type { RiderHistoryEntry } from "../../shared/types/rider";
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
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [routeBooking, setRouteBooking] = useState<RouteBookingState | null>(null);

  // Last completed trip & detail modal state
  const [lastTrip, setLastTrip] = useState<RiderHistoryEntry | null>(null);
  const [selectedTripForDetail, setSelectedTripForDetail] = useState<RiderHistoryEntry | null>(null);

  const sampleDefaultTrip: RiderHistoryEntry = useMemo(
    () => ({
      id: "trip-sample-1052",
      code: "QP1052",
      status: "completed",
      outcome: "completed",
      customerName: "Priya Saxena",
      customerPhone: "+91 98370 12345",
      customerAddress: "Station Road, Near Gandhi Murti, Kasganj",
      partnerName: "CleanWash Express - Soron Gate Hub",
      partnerPhone: "+91 92587 30561",
      storeAddress: "Shop 12, Main Soron Gate Market, Kasganj",
      pickupAddress: "Shop 12, Main Soron Gate Market, Kasganj",
      dropAddress: "Station Road, Near Gandhi Murti, Kasganj",
      distanceKm: 2.8,
      amount: 36.0,
      baseFare: 30.0,
      distanceFare: 6.0,
      surgeBonus: 0.0,
      tipAmount: 0.0,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      pickupOtp: "4821",
      deliveryOtp: "7914",
      items: [
        { name: "Premium Dry Clean (Blazer)", quantity: 2, price: 240 },
        { name: "Steam Ironing (Shirts)", quantity: 5, price: 150 },
      ],
    }),
    []
  );

  useEffect(() => {
    let active = true;
    fetchRiderHistory()
      .then((history) => {
        if (active && Array.isArray(history) && history.length > 0) {
          setLastTrip(history[0]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
          surgeHotspots={[]}
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

              {/* Last Trip & Trip Payment Card (Upgraded with tap-to-view order details) */}
              <div
                onClick={() => {
                  triggerHaptic(35);
                  setSelectedTripForDetail(lastTrip || sampleDefaultTrip);
                }}
                className="p-3.5 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500 shadow-xs cursor-pointer transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-2xs shrink-0">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                    <span className="text-[11px] font-black text-black uppercase tracking-wider truncate">
                      Last Completed Trip
                    </span>
                    <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                      #{lastTrip?.code || "QP1052"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className="text-[10px] font-bold text-zinc-500">Trip Payment:</span>
                    <span className="font-mono text-sm font-black text-emerald-700">
                      +₹{Number(lastTrip?.amount || 36).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-black truncate">
                      {lastTrip?.partnerName || "CleanWash Express - Soron Gate Hub"} → {lastTrip?.customerName || "Priya Saxena"}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-semibold truncate mt-0.5">
                      {lastTrip?.dropAddress || lastTrip?.customerAddress || "Station Road, Gandhi Murti"} · {lastTrip?.distanceKm || 2.8} km
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-white border border-emerald-300 px-2 py-1 rounded-xl shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-2xs">
                    <span>View Details</span>
                    <ChevronRight className="size-3" />
                  </div>
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
