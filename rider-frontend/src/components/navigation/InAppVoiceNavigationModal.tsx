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
  List,
  ExternalLink,
  CheckCircle2,
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
  const [showStepsSheet, setShowStepsSheet] = useState<boolean>(false);

  const currentRiderPos = riderCoords || destinationCoords || { lat: 28.6139, lng: 77.2090 };

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

        // Custom Rapido Captain Scooter Marker (Directional Beam + White Navigation Pod)
        const riderIcon = L.divIcon({
          className: "custom-rapido-captain-marker",
          html: `
            <div class="relative flex items-center justify-center w-14 h-14">
              <!-- Radar Pulse Ring -->
              <div class="absolute w-14 h-14 rounded-full bg-emerald-500/20 animate-ping"></div>
              <div class="absolute w-10 h-10 rounded-full bg-emerald-500/25"></div>
              
              <!-- Directional Cone / Scooter Body that rotates -->
              <div class="nav-captain-bike-inner relative w-10 h-10 rounded-full bg-white border-2 border-emerald-600 shadow-xl flex items-center justify-center transition-transform duration-300" style="transform: rotate(${bearing}deg)">
                <!-- Forward Direction Arrow Pip -->
                <div class="absolute -top-1 w-2.5 h-2.5 bg-emerald-600 rotate-45 border border-white shadow-xs"></div>
                <span class="text-base">🛵</span>
              </div>
            </div>
          `,
          iconSize: [56, 56],
          iconAnchor: [28, 28],
        });

        // Custom Target Destination Pin (White Theme Pin)
        const destIcon = L.divIcon({
          className: "custom-nav-dest-marker",
          html: `
            <div class="relative flex flex-col items-center justify-center">
              <div class="px-2.5 py-1 rounded-xl bg-white text-neutral-900 font-black text-[11px] shadow-xl border border-neutral-300 whitespace-nowrap mb-1 flex items-center gap-1">
                <span class="text-rose-500 font-bold">📍</span> ${targetName}
              </div>
              <div class="relative flex items-center justify-center w-10 h-10">
                <div class="absolute w-10 h-10 rounded-full bg-rose-500/25 animate-pulse"></div>
                <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-black">
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

  // Zoom to fit entire route overview
  const handleFitRouteOverview = () => {
    triggerHaptic(30);
    if (mapInstanceRef.current && routeCoordinates.length >= 2) {
      import("leaflet").then(({ default: L }) => {
        const bounds = L.latLngBounds(routeCoordinates);
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 17,
        });
      });
    }
  };

  // Launch native/external Google Maps app
  const handleLaunchExternalGoogleMaps = () => {
    triggerHaptic(40);
    const origin = currentRiderPos ? `${currentRiderPos.lat},${currentRiderPos.lng}` : "";
    const destination = `${targetCoords.lat},${targetCoords.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=two-wheeler`;
    window.open(url, "_blank");
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

  // Render Maneuver Icon
  const renderManeuverIcon = (
    maneuver: ManeuverType = currentManeuver,
    className = "w-8 h-8 text-emerald-600"
  ) => {
    switch (maneuver) {
      case "turn-right":
        return <CornerUpRight className={`${className} animate-pulse stroke-[2.75]`} />;
      case "turn-left":
        return <CornerUpLeft className={`${className} animate-pulse stroke-[2.75]`} />;
      case "slight-right":
        return <CornerDownRight className={`${className} stroke-[2.5]`} />;
      case "slight-left":
        return <CornerDownLeft className={`${className} stroke-[2.5]`} />;
      case "u-turn":
        return <RotateCcw className={`${className} text-amber-500 stroke-[2.5]`} />;
      case "arrived":
        return <MapPin className={`${className} text-rose-500 animate-bounce stroke-[2.5]`} />;
      case "depart":
      case "straight":
      default:
        return <Navigation className={`${className} -rotate-45 stroke-[2.5]`} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col overflow-hidden text-neutral-900 font-sans select-none animate-in fade-in duration-200">
      {/* 1. TOP WHITE THEME TURN-BY-TURN HUD HEADER */}
      <header className="relative z-30 bg-white border-b border-neutral-200 text-neutral-900 px-3.5 pt-3 pb-3 shadow-xs">
        {/* Top Control Bar: Back, Phase Pill, Language, Audio, External Google Maps */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-800 transition-all border border-neutral-200 shrink-0 cursor-pointer"
              title="Exit In-App Navigation"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 truncate">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span className="truncate">{phaseLabel}</span>
              </span>
            </div>
          </div>

          {/* Quick Voice, Language & External Navigation Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleToggleLanguage}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 border border-neutral-200 flex items-center gap-1 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Switch Hindi / English voice guidance"
            >
              <span>{language.startsWith("hi") ? "🇮🇳 हिन्दी" : "🇬🇧 English"}</span>
            </button>

            <button
              onClick={handleToggleMute}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border active:scale-95 cursor-pointer shadow-2xs ${
                isMuted
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
              title={isMuted ? "Unmute Voice" : "Mute Voice"}
            >
              {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5 text-emerald-600" />}
            </button>

            <button
              onClick={handleLaunchExternalGoogleMaps}
              className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#4285F4] flex items-center justify-center active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Open External Google Maps"
            >
              <ExternalLink className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>

        {/* Clean White Turn Instruction Banner */}
        <div className="flex items-center gap-3 bg-neutral-50 rounded-2xl p-3 border border-neutral-200/90 shadow-xs">
          {/* Turn Maneuver Icon */}
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-xs">
            {renderManeuverIcon(currentManeuver, "w-8 h-8 text-emerald-600")}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-neutral-950">
                {distanceMeters > 1000 ? `${distanceKm} km` : `${distanceMeters} m`}
              </span>
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {isArrived ? "Arrived 📍" : "Next Turn"}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-1 mt-0.5 leading-snug">
              {currentInstruction}
            </p>
            {currentStreet && (
              <p className="text-[11px] font-semibold text-neutral-500 truncate mt-0.5">
                On: {currentStreet}
              </p>
            )}
          </div>

          {/* Repeat Voice Guidance Button */}
          <button
            onClick={handleRepeatVoice}
            className="w-10 h-10 rounded-xl bg-white hover:bg-neutral-100 active:scale-90 flex items-center justify-center text-emerald-600 border border-neutral-200 shrink-0 shadow-2xs cursor-pointer"
            title="Repeat voice prompt"
          >
            <Mic className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </header>

      {/* 2. CENTER MAP CANVAS WITH WHITE/LIGHT THEME CONTROLS */}
      <main className="relative flex-1 w-full bg-neutral-100 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Map Controls (Right Side) */}
        <div className="absolute right-3.5 bottom-4 z-[400] flex flex-col gap-2">
          {/* Fit Route Overview */}
          <button
            onClick={handleFitRouteOverview}
            className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-neutral-200 text-neutral-800 shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            title="Fit Route Overview"
          >
            <Compass className="w-4.5 h-4.5 text-neutral-700" />
          </button>

          {/* Route Steps List Toggle */}
          <button
            onClick={() => setShowStepsSheet((prev) => !prev)}
            className="w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-neutral-200 text-neutral-800 shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer relative"
            title="View Turn-by-Turn Steps"
          >
            <List className="w-4.5 h-4.5 text-blue-600" />
            {routeSteps.length > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                {routeSteps.length}
              </span>
            )}
          </button>

          {/* Zoom In / Out */}
          <div className="flex flex-col bg-white/95 backdrop-blur-md border border-neutral-200 rounded-xl shadow-md overflow-hidden">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 flex items-center justify-center text-neutral-800 hover:bg-neutral-100 active:scale-90 transition-transform border-b border-neutral-150 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 flex items-center justify-center text-neutral-800 hover:bg-neutral-100 active:scale-90 transition-transform cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Re-center GPS on Rider */}
          <button
            onClick={handleRecenter}
            className="w-11 h-11 rounded-2xl bg-white text-neutral-900 border-2 border-emerald-500 shadow-xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            title="Recenter GPS Location"
          >
            <Locate className="w-5 h-5 text-emerald-600" />
          </button>
        </div>

        {/* Live Speedometer (Bottom Left) */}
        <div className="absolute left-3.5 bottom-4 z-[400] flex items-center gap-2">
          <div className="bg-white/95 backdrop-blur-md border border-neutral-200 rounded-2xl px-3 py-1.5 shadow-md flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#00C853] animate-ping" />
            <div>
              <div className="text-lg font-black text-neutral-950 leading-none font-sans">{userSpeedKmh}</div>
              <div className="text-[9px] font-black text-neutral-500 uppercase tracking-wider">km/h</div>
            </div>
          </div>

          {routeSteps.length > 0 && (
            <button
              onClick={() => setShowStepsSheet(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-xs rounded-xl border border-neutral-200 text-[11px] font-bold text-neutral-800 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <List className="w-3.5 h-3.5 text-blue-600" />
              <span>{routeSteps.length} Steps</span>
            </button>
          )}
        </div>

        {/* Full Turn-by-Turn Route Steps Sheet (Slide Up Drawer) */}
        {showStepsSheet && (
          <div className="absolute inset-0 z-[500] bg-black/40 backdrop-blur-2xs flex flex-col justify-end animate-in fade-in duration-200">
            <div className="w-full max-h-[70vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
              {/* Sheet Header */}
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <List className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 leading-tight">
                      Route Directions ({routeSteps.length} Steps)
                    </h3>
                    <p className="text-[11px] font-semibold text-neutral-500">
                      Total: {distanceKm} km · Est. {etaMinutes} mins
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStepsSheet(false)}
                  className="size-8 rounded-full bg-neutral-200/80 hover:bg-neutral-300 flex items-center justify-center text-neutral-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Steps Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-150 space-y-1">
                {routeSteps.map((step, idx) => (
                  <div key={step.id || idx} className="py-2.5 flex items-start gap-3">
                    <div className="size-8 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
                      {renderManeuverIcon(step.maneuver, "w-4.5 h-4.5 text-neutral-700")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-neutral-900 leading-snug">
                        {language.startsWith("hi") ? step.instructionHi : step.instructionEn}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                          {step.distanceMeters > 1000 ? `${(step.distanceMeters / 1000).toFixed(1)} km` : `${step.distanceMeters} m`}
                        </span>
                        {step.streetName && (
                          <span className="text-[10px] text-neutral-500 truncate">
                            {step.streetName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. BOTTOM COCKPIT DRAWER (Pure White Theme & Full Controls) */}
      <footer className="relative z-30 bg-white border-t border-neutral-200 px-4 pt-3.5 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] text-neutral-900">
        {/* Destination & Target Summary */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 mb-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{phaseLabel}: {targetName}</span>
            </div>
            <h3 className="text-base font-black text-neutral-950 truncate leading-tight">
              {targetName}
            </h3>
            <p className="text-xs font-medium text-neutral-600 truncate mt-0.5 leading-snug">
              {targetAddress}
            </p>
          </div>

          {/* Quick Direct Call Button */}
          {targetPhone && (
            <button
              onClick={handleCall}
              className="size-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-md shrink-0 cursor-pointer"
              title="Call Target"
            >
              <Phone className="w-5 h-5 fill-white" />
            </button>
          )}
        </div>

        {/* Trip Stats Matrix */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2 text-center">
            <div className="text-[9px] font-black text-neutral-500 uppercase tracking-wide">Distance</div>
            <div className="text-sm font-black text-neutral-950 font-mono mt-0.5">{distanceKm} km</div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
            <div className="text-[9px] font-black text-emerald-700 uppercase tracking-wide">Est. Time</div>
            <div className="text-sm font-black text-emerald-950 font-mono mt-0.5">{etaMinutes} mins</div>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2 text-center">
            <div className="text-[9px] font-black text-neutral-500 uppercase tracking-wide">Voice Guide</div>
            <div className="text-xs font-bold text-neutral-900 mt-0.5">
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
            className="w-full py-3.5 px-4 rounded-2xl bg-[#00C853] hover:bg-[#00B248] active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 border border-emerald-400 transition-all cursor-pointer"
          >
            <Sparkles className="w-4.5 h-4.5" />
            <span>Arrived at Destination • Proceed</span>
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            Exit In-App Navigation
          </button>
        )}
      </footer>
    </div>
  );
}
