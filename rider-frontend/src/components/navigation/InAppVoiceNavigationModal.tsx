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

      // 1. Route Casing (Dark Navy for contrast)
      const casing = L.polyline(coords, {
        color: "#032b30",
        weight: 10,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(mapInstanceRef.current);
      casingPolylineRef.current = casing;

      // 2. Core Route Polyline (Luminous Cyan Google Navigation line matching video)
      const routeLine = L.polyline(coords, {
        color: "#00e5ff",
        weight: 6,
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

        // Dark Google Navigation Map Tiles matching video Frame 00:32
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 20,
          subdomains: "abcd",
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
    <div className="fixed inset-0 z-[9999] bg-[#0A0D10] flex flex-col overflow-hidden text-white font-sans select-none animate-in fade-in duration-200">
      {/* 1. TOP DARK GREEN GOOGLE NAVIGATION HUD HEADER matching Video Frame 00:32 */}
      <header className="relative z-30 bg-[#054E3B] text-white px-4 pt-3 pb-3.5 shadow-lg border-b border-[#065F46]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-white shrink-0">
              {renderManeuverIcon(currentManeuver, "size-6 text-white stroke-[3]")}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black text-emerald-200 uppercase tracking-wider">
                {distanceMeters > 1000 ? `${distanceKm} km` : `${distanceMeters} m`}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight truncate">
                towards {currentStreet || targetName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleMute}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer"
              title={isMuted ? "Unmute Voice" : "Mute Voice"}
            >
              {isMuted ? <VolumeX className="size-4.5 text-red-400" /> : <Volume2 className="size-4.5 text-white" />}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer"
              title="Close Navigation"
            >
              <X className="size-4.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. CENTER MAP CANVAS WITH WHITE/LIGHT THEME CONTROLS */}
      <main className="relative flex-1 w-full bg-neutral-100 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Top-left Speedometer Badge matching video Frame 00:33 & 01:03 */}
        <div className="absolute left-3.5 top-3.5 z-[400] flex items-center gap-2">
          <div className="size-13 rounded-full bg-[#facc15] border-2 border-white shadow-xl flex flex-col items-center justify-center text-zinc-950 font-black">
            <span className="text-sm leading-none">{userSpeedKmh}</span>
            <span className="text-[8px] tracking-tight uppercase leading-none mt-0.5">km/h</span>
          </div>
        </div>

        {/* Floating Map Controls (Right Side) */}
        <div className="absolute right-3.5 bottom-4 z-[400] flex flex-col gap-2">
          {/* Fit Route Overview */}
          <button
            onClick={handleFitRouteOverview}
            className="size-10 rounded-xl bg-zinc-900/90 backdrop-blur-md border border-zinc-700 text-white shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            title="Fit Route Overview"
          >
            <Compass className="size-4.5 text-zinc-300" />
          </button>

          {/* Zoom In / Out */}
          <div className="flex flex-col bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-xl shadow-md overflow-hidden">
            <button
              onClick={handleZoomIn}
              className="size-10 flex items-center justify-center text-white hover:bg-zinc-800 active:scale-90 transition-transform border-b border-zinc-800 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="size-4.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="size-10 flex items-center justify-center text-white hover:bg-zinc-800 active:scale-90 transition-transform cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="size-4.5" />
            </button>
          </div>

          {/* Re-center GPS on Rider */}
          <button
            onClick={handleRecenter}
            className="size-11 rounded-2xl bg-zinc-900 text-white border-2 border-cyan-400 shadow-xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            title="Recenter GPS Location"
          >
            <Locate className="size-5 text-cyan-400" />
          </button>
        </div>

        {/* Steps Sheet */}
        {showStepsSheet && (
          <div className="absolute inset-0 z-[500] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
            <div className="w-full max-h-[70vh] bg-zinc-900 border-t border-zinc-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in slide-in-from-bottom duration-300">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800">
                    <List className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight">
                      Route Directions ({routeSteps.length} Steps)
                    </h3>
                    <p className="text-[11px] font-semibold text-zinc-400">
                      Total: {distanceKm} km · Est. {etaMinutes} mins
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStepsSheet(false)}
                  className="size-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 divide-y divide-zinc-800 space-y-1">
                {routeSteps.map((step, idx) => (
                  <div key={step.id || idx} className="py-2.5 flex items-start gap-3">
                    <div className="size-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                      {renderManeuverIcon(step.maneuver, "size-4.5 text-zinc-300")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white leading-snug">
                        {language.startsWith("hi") ? step.instructionHi : step.instructionEn}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800 font-mono">
                          {step.distanceMeters > 1000 ? `${(step.distanceMeters / 1000).toFixed(1)} km` : `${step.distanceMeters} m`}
                        </span>
                        {step.streetName && (
                          <span className="text-[10px] text-zinc-400 truncate">
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

      {/* 3. BOTTOM DARK BAR matching Video Frame 00:33 */}
      <footer className="relative z-30 bg-[#12161A] border-t border-zinc-800 px-4 py-3 text-white flex items-center justify-between shadow-2xl">
        <div>
          <div className="text-xl font-black text-white leading-none">
            {etaMinutes || 6} min
          </div>
          <div className="text-xs text-zinc-400 font-bold mt-1">
            {distanceKm} km • {new Date(Date.now() + (etaMinutes || 6) * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRecenter}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-bold text-white flex items-center gap-1.5 border border-zinc-700 shadow-sm cursor-pointer"
          >
            <Locate className="size-3.5 text-cyan-400" />
            <span>Re-centre</span>
          </button>

          {onArrived ? (
            <button
              onClick={() => {
                triggerHaptic([100, 50, 100]);
                onArrived();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-cyan-400 active:scale-95 text-zinc-950 font-black text-xs shadow-md transition-all cursor-pointer"
            >
              Arrived
            </button>
          ) : (
            <button
              onClick={onClose}
              className="size-9 rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white flex items-center justify-center border border-zinc-700 cursor-pointer"
              title="Close"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
