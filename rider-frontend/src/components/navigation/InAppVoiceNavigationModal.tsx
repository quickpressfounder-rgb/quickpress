import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Compass,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  Locate,
  MapPin,
  Mic,
  Navigation,
  Phone,
  Radio,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  voiceNavEngine,
  fetchStreetRoute,
  getDistanceKm,
  calculateBearing,
  ManeuverType,
  NavigationStep,
  VoiceLanguage,
} from "../../lib/voice-navigation-engine";
import { triggerHaptic } from "../../lib/captain-audio";

export type InAppVoiceNavProps = {
  isOpen: boolean;
  onClose: () => void;
  riderCoords?: { lat: number; lng: number } | null;
  targetCoords: { lat: number; lng: number };
  targetName: string;
  targetAddress: string;
  targetPhone?: string;
  orderNumber?: string;
  phaseLabel: string;
  onArrived?: () => void;
};

export function InAppVoiceNavigationModal({
  isOpen,
  onClose,
  riderCoords,
  targetCoords,
  targetName,
  targetAddress,
  targetPhone,
  orderNumber,
  phaseLabel,
  onArrived,
}: InAppVoiceNavProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const casingPolylineRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  const prevRiderPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const [bearing, setBearing] = useState<number>(0);

  const [isMuted, setIsMuted] = useState(voiceNavEngine.getMuted());
  const [language, setLanguage] = useState<VoiceLanguage>(voiceNavEngine.getLanguage());
  const [currentManeuver, setCurrentManeuver] = useState<ManeuverType>("straight");
  const [currentInstruction, setCurrentInstruction] = useState<string>("");
  const [currentStreet, setCurrentStreet] = useState<string>("");
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [etaMinutes, setEtaMinutes] = useState<number>(2);
  const [isArrived, setIsArrived] = useState<boolean>(false);
  const [userSpeedKmh, setUserSpeedKmh] = useState<number>(28);

  const [routeSteps, setRouteSteps] = useState<NavigationStep[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeSource, setRouteSource] = useState<string>("google");

  const currentRiderPos = riderCoords || { lat: 27.8118, lng: 78.6477 };

  // Calculate bearing whenever rider moves
  useEffect(() => {
    if (prevRiderPosRef.current && riderCoords) {
      const b = calculateBearing(
        prevRiderPosRef.current.lat,
        prevRiderPosRef.current.lng,
        riderCoords.lat,
        riderCoords.lng
      );
      if (b !== 0) setBearing(b);
    }
    prevRiderPosRef.current = riderCoords || currentRiderPos;
  }, [riderCoords]);

  // Fetch real street-following route when modal opens or coordinates change
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function loadRoute() {
      try {
        const routeData = await fetchStreetRoute(currentRiderPos, targetCoords, targetName);
        if (isCancelled) return;

        setRouteCoordinates(routeData.coordinates);
        setRouteSteps(routeData.steps);
        setRouteSource(routeData.source);
        setDistanceKm(routeData.totalDistanceKm);
        setDistanceMeters(routeData.totalDistanceMeters);
        setEtaMinutes(routeData.totalDurationMins);

        // Initial voice prompt
        const isHi = language.startsWith("hi");
        const startPrompt = isHi
          ? `नेविगेशन शुरू हुआ। ${targetName} की तरफ चलें। कुल दूरी ${routeData.totalDistanceKm} किलोमीटर।`
          : `Navigation started to ${targetName}. Total distance ${routeData.totalDistanceKm} kilometers. Follow route.`;
        voiceNavEngine.speak(startPrompt, true);

        // Evaluate initial maneuver
        const progress = voiceNavEngine.evaluateProgress(
          currentRiderPos,
          targetCoords,
          targetName,
          routeData.steps
        );
        setCurrentManeuver(progress.currentManeuver);
        setCurrentInstruction(progress.instruction);
        setCurrentStreet(progress.streetName || targetAddress);
        setIsArrived(progress.isArrived);

        // Update / Draw route on map
        drawRouteOnMap(routeData.coordinates);
      } catch (e) {
        console.warn("Failed to load street route:", e);
      }
    }

    void loadRoute();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, targetCoords.lat, targetCoords.lng]);

  // Track rider coordinate changes and update real-time progress
  useEffect(() => {
    if (!isOpen) return;

    const progress = voiceNavEngine.evaluateProgress(
      currentRiderPos,
      targetCoords,
      targetName,
      routeSteps
    );
    setDistanceKm(progress.distanceKm);
    setDistanceMeters(progress.distanceMeters);
    setEtaMinutes(progress.etaMinutes);
    setCurrentManeuver(progress.currentManeuver);
    setCurrentInstruction(progress.instruction);
    setCurrentStreet(progress.streetName || targetAddress);
    setIsArrived(progress.isArrived);

    // Update rider marker position & rotation on Leaflet map
    if (riderMarkerRef.current) {
      riderMarkerRef.current.setLatLng([currentRiderPos.lat, currentRiderPos.lng]);
      const iconEl = riderMarkerRef.current.getElement();
      if (iconEl) {
        const bikeInner = iconEl.querySelector(".nav-captain-bike-inner");
        if (bikeInner) {
          bikeInner.style.transform = `rotate(${bearing}deg)`;
        }
      }
    }
  }, [riderCoords, isOpen, routeSteps, bearing]);

  // Draw or update dual-layer street route on Leaflet Map
  const drawRouteOnMap = async (coords: [number, number][]) => {
    if (!mapInstanceRef.current || coords.length < 2) return;
    try {
      const L = (await import("leaflet")).default;

      // Remove previous lines
      if (casingPolylineRef.current) {
        mapInstanceRef.current.removeLayer(casingPolylineRef.current);
      }
      if (routePolylineRef.current) {
        mapInstanceRef.current.removeLayer(routePolylineRef.current);
      }

      // 1. Route Casing (Dark Slate Navy for high contrast road borders)
      const casing = L.polyline(coords, {
        color: "#0F172A",
        weight: 9,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(mapInstanceRef.current);
      casingPolylineRef.current = casing;

      // 2. Core Route Polyline (Vibrant Rapido Green with crisp rounded joins)
      const routeLine = L.polyline(coords, {
        color: "#00C853",
        weight: 5.5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(mapInstanceRef.current);
      routePolylineRef.current = routeLine;

      // Auto fit bounds with comfortable padding
      const bounds = L.latLngBounds(coords);
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: [40, 140],
        paddingBottomRight: [40, 260],
        maxZoom: 18,
      });
    } catch (err) {
      console.warn("Error drawing route line:", err);
    }
  };

  // Leaflet Map Initialization
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function initNavigationMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [currentRiderPos.lat, currentRiderPos.lng],
          zoom: 17,
          zoomControl: false,
          attributionControl: false,
        });

        // Google Maps High-Resolution Roadmap Navigation Tiles
        L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }).addTo(map);

        // Custom Rapido Captain Scooter Marker (Directional Beam + Compass)
        const riderIcon = L.divIcon({
          className: "custom-rapido-captain-marker",
          html: `
            <div class="relative flex items-center justify-center w-14 h-14">
              <!-- Radar Pulse Ring -->
              <div class="absolute w-14 h-14 rounded-full bg-[#00C853]/25 animate-ping"></div>
              <div class="absolute w-10 h-10 rounded-full bg-emerald-500/30"></div>
              
              <!-- Directional Cone / Scooter Body that rotates -->
              <div class="nav-captain-bike-inner relative w-10 h-10 rounded-full bg-slate-900 border-2 border-white shadow-2xl flex items-center justify-center transition-transform duration-300" style="transform: rotate(${bearing}deg)">
                <!-- Forward Direction Arrow Pip -->
                <div class="absolute -top-1 w-2.5 h-2.5 bg-[#00C853] rotate-45 border border-white shadow-xs"></div>
                <span class="text-white text-base font-black">🛵</span>
              </div>
            </div>
          `,
          iconSize: [56, 56],
          iconAnchor: [28, 28],
        });

        // Custom Target Destination Pin (High Contrast Pin)
        const destIcon = L.divIcon({
          className: "custom-nav-dest-marker",
          html: `
            <div class="relative flex flex-col items-center justify-center">
              <div class="px-2.5 py-1 rounded-lg bg-slate-950 text-white font-black text-[11px] shadow-xl border border-white/40 whitespace-nowrap mb-1">
                📍 ${targetName}
              </div>
              <div class="relative flex items-center justify-center w-10 h-10">
                <div class="absolute w-10 h-10 rounded-full bg-rose-500/30 animate-pulse"></div>
                <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-sm font-black">
                  🎯
                </div>
              </div>
            </div>
          `,
          iconSize: [120, 64],
          iconAnchor: [60, 60],
        });

        const rMarker = L.marker([currentRiderPos.lat, currentRiderPos.lng], { icon: riderIcon }).addTo(map);
        riderMarkerRef.current = rMarker;

        const dMarker = L.marker([targetCoords.lat, targetCoords.lng], { icon: destIcon }).addTo(map);
        destMarkerRef.current = dMarker;

        mapInstanceRef.current = map;

        // If coordinates already loaded, draw immediately
        if (routeCoordinates.length >= 2) {
          drawRouteOnMap(routeCoordinates);
        }

        setTimeout(() => {
          if (isMounted && map) {
            map.invalidateSize();
          }
        }, 150);
        setTimeout(() => {
          if (isMounted && map) {
            map.invalidateSize();
          }
        }, 500);

        if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
          const ro = new ResizeObserver(() => {
            if (isMounted && map) {
              map.invalidateSize();
            }
          });
          ro.observe(mapContainerRef.current);
        }
      }
    }

    void initNavigationMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle Mute / Unmute
  const handleToggleMute = () => {
    triggerHaptic(50);
    const nextMute = voiceNavEngine.toggleMute();
    setIsMuted(nextMute);
  };

  // Toggle Language (Hindi <-> English)
  const handleToggleLanguage = () => {
    triggerHaptic(50);
    const nextLang: VoiceLanguage = language.startsWith("hi") ? "en-IN" : "hi-IN";
    setLanguage(nextLang);
    voiceNavEngine.setLanguage(nextLang);
  };

  // Repeat current voice instruction
  const handleRepeatVoice = () => {
    triggerHaptic(40);
    voiceNavEngine.speak(currentInstruction, true);
  };

  // Re-center Map on Rider GPS
  const handleRecenter = () => {
    triggerHaptic(40);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentRiderPos.lat, currentRiderPos.lng], 18, {
        animate: true,
      });
    }
  };

  // Zoom Controls
  const handleZoomIn = () => {
    triggerHaptic(30);
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    triggerHaptic(30);
    mapInstanceRef.current?.zoomOut();
  };

  // Direct Phone Call
  const handleCall = () => {
    triggerHaptic(50);
    if (targetPhone) {
      const cleanPhone = targetPhone.replace(/\D/g, "");
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  // Render High-Contrast Rapido Maneuver Icon
  const renderManeuverIcon = () => {
    switch (currentManeuver) {
      case "turn-right":
        return <CornerUpRight className="w-11 h-11 text-[#00C853] animate-pulse stroke-[2.75]" />;
      case "turn-left":
        return <CornerUpLeft className="w-11 h-11 text-[#00C853] animate-pulse stroke-[2.75]" />;
      case "slight-right":
        return <CornerDownRight className="w-11 h-11 text-[#00C853] stroke-[2.5]" />;
      case "slight-left":
        return <CornerDownLeft className="w-11 h-11 text-[#00C853] stroke-[2.5]" />;
      case "u-turn":
        return <RotateCcw className="w-11 h-11 text-amber-400 stroke-[2.5]" />;
      case "arrived":
        return <MapPin className="w-11 h-11 text-rose-500 animate-bounce stroke-[2.5]" />;
      case "depart":
      case "straight":
      default:
        return <Navigation className="w-11 h-11 text-[#00C853] -rotate-45 stroke-[2.5]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col overflow-hidden text-zinc-950 font-sans animate-in fade-in duration-200 select-none">
      {/* 1. TOP RAPIDO TURN-BY-TURN HUD HEADER (Deep Navy Slate & Emerald Glow) */}
      <header className="relative z-30 bg-slate-900 border-b border-slate-800 text-white px-4 pt-3 pb-3.5 shadow-2xl">
        {/* Top Control Bar: Phase, Language, Mute, Close */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center text-slate-200 transition-all border border-slate-700"
              title="Exit In-App Navigation"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-emerald-500/15 text-[#00C853] border border-emerald-500/30">
                <Radio className="w-3 h-3 animate-ping" />
                {phaseLabel}
              </span>
            </div>
          </div>

          {/* Quick Voice & Language Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleLanguage}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-emerald-400 border border-slate-700 flex items-center gap-1 active:scale-95 transition-all shadow-xs"
              title="Switch Hindi / English voice guidance"
            >
              <span>{language.startsWith("hi") ? "🇮🇳 हिन्दी" : "🇬🇧 English"}</span>
            </button>

            <button
              onClick={handleToggleMute}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border active:scale-95 ${
                isMuted
                  ? "bg-rose-950/60 border-rose-800 text-rose-400"
                  : "bg-emerald-950/60 border-emerald-600 text-[#00C853]"
              }`}
              title={isMuted ? "Unmute Voice" : "Mute Voice"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Big Turn Instruction Banner (Rapido Style) */}
        <div className="flex items-center gap-3.5 bg-slate-800/90 rounded-2xl p-3 border border-slate-700/80 shadow-inner">
          {/* Turn Maneuver Icon */}
          <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
            {renderManeuverIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                {distanceMeters > 1000 ? `${distanceKm} km` : `${distanceMeters} m`}
              </span>
              <span className="text-[11px] font-black text-[#00C853] uppercase tracking-wider">
                {isArrived ? "Arrived 📍" : "Next Maneuver"}
              </span>
            </div>

            <p className="text-sm font-bold text-slate-100 line-clamp-1 mt-0.5 leading-snug">
              {currentInstruction}
            </p>
            {currentStreet ? (
              <p className="text-xs font-semibold text-slate-400 truncate mt-0.5">
                On: {currentStreet}
              </p>
            ) : null}
          </div>

          {/* Repeat Voice Guidance Button */}
          <button
            onClick={handleRepeatVoice}
            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-700 active:scale-90 flex items-center justify-center text-[#00C853] border border-slate-700 shrink-0 shadow-sm"
            title="Repeat voice prompt"
          >
            <Mic className="w-4 h-4 text-[#00C853]" />
          </button>
        </div>
      </header>

      {/* 2. CENTER MAP CANVAS WITH GOOGLE MAPS TILES & LIVE TELEMETRY */}
      <main className="relative flex-1 w-full bg-slate-900 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Re-center & Map Controls (Right Side) */}
        <div className="absolute right-4 bottom-5 z-[400] flex flex-col gap-2">
          {/* Zoom In/Out */}
          <button
            onClick={handleZoomIn}
            className="w-11 h-11 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-slate-200" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-11 h-11 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-slate-200" />
          </button>

          {/* Re-center GPS on Rider */}
          <button
            onClick={handleRecenter}
            className="w-12 h-12 rounded-2xl bg-white text-slate-950 border border-slate-300 shadow-2xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            title="Recenter GPS Location"
          >
            <Locate className="w-6 h-6 text-[#00C853]" />
          </button>
        </div>

        {/* Live Speedometer & Routing Badge (Bottom Left) */}
        <div className="absolute left-4 bottom-5 z-[400] flex items-center gap-2">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00C853] animate-ping" />
            <div>
              <div className="text-xl font-black text-white leading-none font-mono">{userSpeedKmh}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">km/h</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 backdrop-blur-xs rounded-xl border border-slate-700 text-[10px] font-black text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{routeSource === "google" ? "Google Routes" : routeSource === "osrm" ? "OSRM Street" : "Road Grid"}</span>
          </div>
        </div>
      </main>

      {/* 3. BOTTOM COCKPIT DRAWER (Dark High-Contrast Layout & Rapido Action Controls) */}
      <footer className="relative z-30 bg-white border-t border-zinc-300 px-4 pt-3.5 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] text-zinc-950">
        {/* Destination & Target Summary (Dark Bold Text) */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#00A844] mb-0.5">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{phaseLabel}: {targetName}</span>
            </div>
            <h3 className="text-base font-black text-zinc-950 truncate leading-tight">
              {targetName}
            </h3>
            <p className="text-xs font-bold text-zinc-800 truncate mt-0.5 leading-snug">
              {targetAddress}
            </p>
          </div>

          {/* Quick Direct Call Button */}
          {targetPhone && (
            <button
              onClick={handleCall}
              className="w-12 h-12 rounded-2xl bg-[#00C853] hover:bg-[#00B248] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 border border-emerald-400"
              title="Call Target"
            >
              <Phone className="w-5 h-5 fill-white" />
            </button>
          )}
        </div>

        {/* Trip Stats Matrix (High Contrast Dark Text) */}
        <div className="grid grid-cols-3 gap-2.5 mb-3.5">
          <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-2.5 text-center">
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-wide">Distance</div>
            <div className="text-base font-black text-zinc-950 font-mono mt-0.5">{distanceKm} km</div>
          </div>

          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-center">
            <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wide">Est. Time</div>
            <div className="text-base font-black text-emerald-950 font-mono mt-0.5">{etaMinutes} mins</div>
          </div>

          <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-2.5 text-center">
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-wide">Voice Guide</div>
            <div className="text-xs font-black text-zinc-950 mt-1">
              {isMuted ? "Muted 🔇" : "Active 🔊"}
            </div>
          </div>
        </div>

        {/* Action Button: Arrived at Location / Exit */}
        {onArrived ? (
          <button
            onClick={() => {
              triggerHaptic([100, 50, 100]);
              onArrived();
              onClose();
            }}
            className="w-full py-4 px-4 rounded-2xl bg-[#00C853] hover:bg-[#00B248] active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 border border-emerald-400 transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            Arrived at Destination • Proceed
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            Exit In-App Navigation
          </button>
        )}
      </footer>
    </div>
  );
}
