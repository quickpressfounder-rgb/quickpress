import { useState, useEffect, useRef, useCallback } from "react";
import {
  Compass,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  Locate,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
  List,
  Sun,
  Moon,
  ExternalLink,
} from "lucide-react";
import {
  voiceNavEngine,
  fetchStreetRoute,
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
  const tileLayerRef = useRef<any>(null);

  const prevRiderPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const [bearing, setBearing] = useState<number>(0);
  const [mapTheme, setMapTheme] = useState<"dark" | "light">("dark");

  const [isMuted, setIsMuted] = useState(voiceNavEngine.getMuted());
  const [language, setLanguage] = useState<VoiceLanguage>(voiceNavEngine.getLanguage());
  const [currentManeuver, setCurrentManeuver] = useState<ManeuverType>("straight");
  const [currentInstruction, setCurrentInstruction] = useState<string>("");
  const [currentStreet, setCurrentStreet] = useState<string>("");
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [etaMinutes, setEtaMinutes] = useState<number>(2);
  const [isArrived, setIsArrived] = useState<boolean>(false);
  const [userSpeedKmh, setUserSpeedKmh] = useState<number>(32);

  const [routeSteps, setRouteSteps] = useState<NavigationStep[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  const currentRiderPos = riderCoords || { lat: 28.6139, lng: 77.2090 };

  // Smooth 60FPS marker position & heading interpolation
  const animatedPosRef = useRef<{ lat: number; lng: number }>(currentRiderPos);
  const animatedHeadingRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  const smoothlyMoveMarker = useCallback(
    (targetPos: { lat: number; lng: number }, targetHeading: number, durationMs = 850) => {
      if (!riderMarkerRef.current) return;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      const startPos = { ...animatedPosRef.current };
      const startHeading = animatedHeadingRef.current;
      const startTime = performance.now();

      // Shortest angular difference
      let diffAngle = (targetHeading - startHeading) % 360;
      if (diffAngle > 180) diffAngle -= 360;
      if (diffAngle < -180) diffAngle += 360;

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic

        const lat = startPos.lat + (targetPos.lat - startPos.lat) * ease;
        const lng = startPos.lng + (targetPos.lng - startPos.lng) * ease;
        const heading = startHeading + diffAngle * ease;

        animatedPosRef.current = { lat, lng };
        animatedHeadingRef.current = heading;

        if (riderMarkerRef.current) {
          riderMarkerRef.current.setLatLng([lat, lng]);
          const iconEl = riderMarkerRef.current.getElement();
          if (iconEl) {
            const bikeInner = iconEl.querySelector(".nav-captain-bike-inner");
            if (bikeInner) {
              bikeInner.style.transform = `rotate(${heading}deg)`;
            }
          }
        }

        if (progress < 1) {
          animFrameIdRef.current = requestAnimationFrame(step);
        } else {
          animFrameIdRef.current = null;
        }
      };
      animFrameIdRef.current = requestAnimationFrame(step);
    },
    []
  );

  // Calculate bearing whenever rider moves
  useEffect(() => {
    if (prevRiderPosRef.current && riderCoords) {
      const b = calculateBearing(
        prevRiderPosRef.current.lat,
        prevRiderPosRef.current.lng,
        riderCoords.lat,
        riderCoords.lng
      );
      if (b !== 0) {
        setBearing(b);
        smoothlyMoveMarker(riderCoords, b);
      } else {
        smoothlyMoveMarker(riderCoords, bearing);
      }
    }
    prevRiderPosRef.current = riderCoords || currentRiderPos;
  }, [riderCoords, smoothlyMoveMarker, bearing, currentRiderPos]);

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
  }, [riderCoords, isOpen, routeSteps, currentRiderPos, targetCoords, targetName, targetAddress]);

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

      // 1. Route Casing (Deep Midnight for maximum contrast)
      const casing = L.polyline(coords, {
        color: "#031e24",
        weight: 9,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(mapInstanceRef.current);
      casingPolylineRef.current = casing;

      // 2. Core Route Polyline (Rapido Neon Cyan line with high visibility)
      const routeLine = L.polyline(coords, {
        color: "#00e5ff",
        weight: 5.5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(mapInstanceRef.current);
      routePolylineRef.current = routeLine;

      // Auto fit bounds with comfortable top and bottom padding
      const bounds = L.latLngBounds(coords);
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: [30, 160],
        paddingBottomRight: [30, 220],
        maxZoom: 18,
      });
    } catch (err) {
      console.warn("Error drawing route line:", err);
    }
  };

  // Toggle Map Theme (Dark / Clean Light)
  const toggleMapTheme = async () => {
    triggerHaptic(30);
    const nextTheme = mapTheme === "dark" ? "light" : "dark";
    setMapTheme(nextTheme);

    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const L = (await import("leaflet")).default;
      const url =
        nextTheme === "dark"
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      const newTile = L.tileLayer(url, {
        maxZoom: 20,
        subdomains: "abcd",
      }).addTo(mapInstanceRef.current);
      newTile.bringToBack();
      tileLayerRef.current = newTile;
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

        // Clean Rapido Dark/Light Map Tiles (CartoDB zero clutter)
        const tileUrl =
          mapTheme === "dark"
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

        const tiles = L.tileLayer(tileUrl, {
          maxZoom: 20,
          subdomains: "abcd",
        }).addTo(map);
        tileLayerRef.current = tiles;

        // Custom Rapido Scooter Marker (Directional Beam + Yellow/Emerald Navigation Pod)
        const riderIcon = L.divIcon({
          className: "custom-rapido-captain-marker",
          html: `
            <div class="relative flex items-center justify-center w-14 h-14">
              <!-- Radar Pulse Wave -->
              <div class="absolute w-14 h-14 rounded-full bg-cyan-400/20 animate-ping"></div>
              <div class="absolute w-10 h-10 rounded-full bg-cyan-400/30"></div>
              
              <!-- Directional Scooter Pod with Heading Rotation -->
              <div class="nav-captain-bike-inner relative w-10 h-10 rounded-full bg-zinc-950 border-2 border-cyan-400 shadow-2xl flex items-center justify-center transition-transform duration-75" style="transform: rotate(${bearing}deg)">
                <!-- Forward Direction Pip -->
                <div class="absolute -top-1 w-2.5 h-2.5 bg-cyan-400 rotate-45 border border-zinc-950 shadow-xs"></div>
                <span class="text-base">🛵</span>
              </div>
            </div>
          `,
          iconSize: [56, 56],
          iconAnchor: [28, 28],
        });

        // Destination Marker (Clean Floating Pin)
        const destIcon = L.divIcon({
          className: "custom-nav-dest-marker",
          html: `
            <div class="relative flex flex-col items-center justify-center">
              <div class="px-2.5 py-1 rounded-xl bg-zinc-900 text-white font-black text-[11px] shadow-2xl border border-zinc-700 whitespace-nowrap mb-1 flex items-center gap-1.5">
                <span class="text-rose-400 font-bold">📍</span> ${targetName}
              </div>
              <div class="relative flex items-center justify-center w-10 h-10">
                <div class="absolute w-10 h-10 rounded-full bg-rose-500/30 animate-pulse"></div>
                <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-black">
                  🎯
                </div>
              </div>
            </div>
          `,
          iconSize: [140, 64],
          iconAnchor: [70, 60],
        });

        const rMarker = L.marker([currentRiderPos.lat, currentRiderPos.lng], { icon: riderIcon }).addTo(map);
        riderMarkerRef.current = rMarker;

        const dMarker = L.marker([targetCoords.lat, targetCoords.lng], { icon: destIcon }).addTo(map);
        destMarkerRef.current = dMarker;

        mapInstanceRef.current = map;

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

  // Launch external Google Maps as optional fallback
  const handleLaunchExternalGoogleMaps = () => {
    triggerHaptic(40);
    const origin = currentRiderPos ? `${currentRiderPos.lat},${currentRiderPos.lng}` : "";
    const destination = `${targetCoords.lat},${targetCoords.lng}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=two-wheeler`;
    window.open(url, "_blank");
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
    className = "size-7 text-cyan-400"
  ) => {
    switch (maneuver) {
      case "turn-right":
        return <CornerUpRight className={`${className} animate-pulse stroke-[3]`} />;
      case "turn-left":
        return <CornerUpLeft className={`${className} animate-pulse stroke-[3]`} />;
      case "slight-right":
        return <CornerDownRight className={`${className} stroke-[2.75]`} />;
      case "slight-left":
        return <CornerDownLeft className={`${className} stroke-[2.75]`} />;
      case "u-turn":
        return <RotateCcw className={`${className} text-amber-400 stroke-[2.75]`} />;
      case "arrived":
        return <MapPin className={`${className} text-rose-500 animate-bounce stroke-[3]`} />;
      case "depart":
      case "straight":
      default:
        return <Navigation className={`${className} -rotate-45 stroke-[3]`} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden text-white font-sans select-none animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. FULL BLEED MAP CANVAS (Zero Border Clutter)                             */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING TOP RAPIDO-STYLE MANEUVER HUD CAPSULE                         */}
      {/* ========================================================================= */}
      <div className="relative z-30 pt-3 px-3 pointer-events-none">
        <div className="pointer-events-auto rounded-3xl bg-zinc-950/92 backdrop-blur-xl border border-zinc-800 shadow-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Glowing Maneuver Icon Container */}
            <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 shrink-0 shadow-inner">
              {renderManeuverIcon(currentManeuver, "size-6.5 text-cyan-400 stroke-[3]")}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <span>{distanceMeters > 1000 ? `${distanceKm} km` : `${distanceMeters} m`}</span>
                <span className="text-[10px] text-zinc-500 font-normal">•</span>
                <span className="text-[10px] text-zinc-400 font-semibold truncate">{phaseLabel}</span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                {currentInstruction || `Head towards ${currentStreet || targetName}`}
              </h2>
            </div>
          </div>

          {/* Quick HUD Controls */}
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleMute}
              className="size-9 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 active:scale-90 transition-all flex items-center justify-center text-white cursor-pointer"
              title={isMuted ? "Unmute Voice" : "Mute Voice"}
            >
              {isMuted ? <VolumeX className="size-4 text-rose-400" /> : <Volume2 className="size-4 text-cyan-400 animate-pulse" />}
            </button>

            {/* Language Switcher */}
            <button
              onClick={handleToggleLanguage}
              className="px-2.5 h-9 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 active:scale-90 transition-all text-[11px] font-black text-white flex items-center justify-center cursor-pointer"
              title="Toggle Voice Language"
            >
              {language.startsWith("hi") ? "हिन्दी" : "EN"}
            </button>

            {/* Map Theme Toggle */}
            <button
              onClick={toggleMapTheme}
              className="size-9 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 active:scale-90 transition-all flex items-center justify-center text-amber-300 cursor-pointer"
              title="Toggle Dark/Light Map"
            >
              {mapTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4 text-cyan-400" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="size-9 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
              title="Exit Navigation"
            >
              <X className="size-4.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FLOATING SPEEDOMETER (Left) & MAP CONTROLS (Right)                      */}
      {/* ========================================================================= */}
      <div className="relative flex-1 pointer-events-none">
        {/* Speedometer Badge (Bottom-Left) */}
        <div className="absolute left-3.5 bottom-6 pointer-events-auto z-20">
          <div className="size-14 rounded-full bg-zinc-950/90 backdrop-blur-md border-2 border-amber-400 shadow-2xl flex flex-col items-center justify-center text-amber-400 font-black">
            <span className="text-base leading-none tracking-tight">{userSpeedKmh}</span>
            <span className="text-[8px] tracking-tight uppercase leading-none mt-0.5 text-zinc-400">km/h</span>
          </div>
        </div>

        {/* Floating Right Controls (Overview & Recenter) */}
        <div className="absolute right-3.5 bottom-6 pointer-events-auto z-20 flex flex-col gap-2.5">
          {/* Fit Route Overview */}
          <button
            onClick={handleFitRouteOverview}
            className="size-11 rounded-2xl bg-zinc-950/90 backdrop-blur-md border border-zinc-800 text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            title="Overview Entire Route"
          >
            <Compass className="size-5 text-zinc-300" />
          </button>

          {/* Recenter on Rider GPS */}
          <button
            onClick={handleRecenter}
            className="size-12 rounded-2xl bg-zinc-950 border-2 border-cyan-400 text-cyan-400 shadow-2xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
            title="Recenter Camera on Rider"
          >
            <Locate className="size-5.5 animate-pulse" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FLOATING BOTTOM RAPIDO-STYLE DESTINATION & ARRIVAL CARD                */}
      {/* ========================================================================= */}
      <div className="relative z-30 pb-4 px-3 pointer-events-none">
        <div className="pointer-events-auto rounded-3xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-2xl p-4 flex flex-col gap-3">
          {/* Top Row: Destination, ETA, and Call Button */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tight">
                  {etaMinutes} min
                </span>
                <span className="text-xs font-bold text-zinc-400">
                  ({distanceKm} km)
                </span>
                <span className="size-1.5 rounded-full bg-cyan-400"></span>
                <span className="text-xs font-semibold text-emerald-400">
                  Fastest Route
                </span>
              </div>
              <p className="text-xs font-bold text-zinc-300 truncate mt-0.5">
                📍 {targetName} — {targetAddress}
              </p>
            </div>

            {/* Direct Phone Call Button */}
            {targetPhone && (
              <button
                onClick={handleCall}
                className="ml-3 size-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform cursor-pointer shrink-0"
                title="Call Customer/Store"
              >
                <Phone className="size-5" />
              </button>
            )}
          </div>

          {/* Action Button: I Have Arrived (Rapido Style) */}
          <div className="flex items-center gap-2">
            {onArrived ? (
              <button
                onClick={() => {
                  triggerHaptic([100, 50, 100]);
                  onArrived();
                  onClose();
                }}
                className="flex-1 h-12 rounded-2xl bg-cyan-400 hover:bg-cyan-300 active:scale-98 text-zinc-950 font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MapPin className="size-4.5 text-zinc-950 stroke-[3]" />
                <span>I HAVE ARRIVED AT LOCATION</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 h-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-white font-bold text-sm tracking-wide shadow-md flex items-center justify-center transition-all cursor-pointer"
              >
                CLOSE NAVIGATION
              </button>
            )}
          </div>

          {/* Secondary fallback link to external Google Maps */}
          <div className="flex items-center justify-center pt-1 border-t border-zinc-900">
            <button
              onClick={handleLaunchExternalGoogleMaps}
              className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 active:scale-95 transition-transform cursor-pointer"
            >
              <span>Need satellite preview? Open in Google Maps</span>
              <ExternalLink className="size-3 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
