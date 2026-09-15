import { useEffect, useRef, useState } from "react";
import { Crosshair, ExternalLink, Flame, Layers, Moon, Navigation, Sun, Zap, ZoomIn, ZoomOut } from "lucide-react";
import { triggerHaptic } from "../../lib/captain-audio";
import { fetchStreetRoute } from "../../lib/voice-navigation-engine";

export type MapCoordinate = {
  lat: number;
  lng: number;
  label?: string;
  sublabel?: string;
};

export type SurgeHotspot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bonus: number;
  multiplier: string;
  label: string;
  radiusMeters?: number;
  color?: string;
  demandLevel?: string;
  tag?: string;
  description?: string;
  ordersWaiting?: number;
  ridersOnline?: number;
  distanceKm?: number;
  distanceMeters?: number;
  etaMinutes?: number;
  isCurrentRiderInside?: boolean;
};

export const KASGANJ_SURGE_HOTSPOTS: SurgeHotspot[] = [
  {
    id: "ksj-station",
    name: "Kasganj Junction Station",
    lat: 27.8105,
    lng: 78.6410,
    bonus: 25,
    multiplier: "1.6x",
    label: "+₹25 Surge 🔥",
  },
  {
    id: "ksj-market",
    name: "Main Bazaar & Gandhi Murti",
    lat: 27.8145,
    lng: 78.6495,
    bonus: 20,
    multiplier: "1.5x",
    label: "+₹20 Surge ⚡",
  },
  {
    id: "ksj-soron",
    name: "Soron Gate Commercial Hub",
    lat: 27.8182,
    lng: 78.6442,
    bonus: 15,
    multiplier: "1.3x",
    label: "+₹15 Surge 📍",
  },
  {
    id: "ksj-bilram",
    name: "Bilram Gate Express Zone",
    lat: 27.8080,
    lng: 78.6525,
    bonus: 20,
    multiplier: "1.4x",
    label: "+₹20 Surge 🚀",
  },
];

export type LiveDeliveryMapProps = {
  riderLocation?: MapCoordinate | null;
  destinationLocation?: MapCoordinate | null;
  storeLocation?: MapCoordinate | null;
  targetAddressName?: string;
  phase?: "pickup" | "delivery" | "online" | "idle";
  heightClassName?: string;
  showControls?: boolean;
  showSurgePins?: boolean;
  surgeHotspots?: SurgeHotspot[];
  isRapidoTheme?: boolean;
  onOpenNavigation?: () => void;
  onSurgeClick?: (surge: SurgeHotspot) => void;
  activeLayerOverride?: GoogleMapLayerType;
  onLayerChange?: (layer: GoogleMapLayerType) => void;
};

export type GoogleMapLayerType = "roadmap" | "satellite" | "traffic" | "night";

const MAP_TILE_CONFIGS: Record<GoogleMapLayerType, { url: string; subdomains: string[] }> = {
  roadmap: {
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
  },
  night: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
  },
  satellite: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
  },
  traffic: {
    url: "https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
  },
};

// Calculate Haversine distance in Kilometres
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export function LiveDeliveryMap({
  riderLocation,
  destinationLocation,
  storeLocation,
  targetAddressName,
  phase = "pickup",
  heightClassName = "h-72",
  showControls = true,
  showSurgePins = true,
  surgeHotspots,
  isRapidoTheme = true,
  onOpenNavigation,
  onSurgeClick,
  activeLayerOverride,
  onLayerChange,
}: LiveDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const surgeMarkersRef = useRef<{ [key: string]: any }>({});
  const surgeCirclesRef = useRef<{ [key: string]: any }>({});
  const polylineRef = useRef<any>(null);
  const lastRouteCoordsRef = useRef<{ rLat: number; rLng: number; tLat: number; tLng: number } | null>(null);
  const lastFittedPhaseRef = useRef<string | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMins, setEtaMins] = useState<number | null>(null);
  const [internalLayer, setInternalLayer] = useState<GoogleMapLayerType>("roadmap");

  const activeLayer = activeLayerOverride || internalLayer;

  // Default coordinate (Center of Kasganj, UP if no coordinates available)
  const defaultCenter = { lat: 27.8118, lng: 78.6477 };

  // Calculate distance & ETA whenever positions update
  useEffect(() => {
    const dest = destinationLocation || storeLocation;
    if (riderLocation && dest) {
      const dist = getDistanceKm(
        riderLocation.lat,
        riderLocation.lng,
        dest.lat,
        dest.lng
      );
      setDistanceKm(dist);
      const eta = Math.max(1, Math.round((dist / 22) * 60));
      setEtaMins(eta);
    } else {
      setDistanceKm(null);
      setEtaMins(null);
    }
  }, [riderLocation, destinationLocation, storeLocation]);

  // Initialize Leaflet map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const initialCenter = riderLocation || destinationLocation || defaultCenter;

        const map = L.map(mapContainerRef.current, {
          center: [initialCenter.lat, initialCenter.lng],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
        });

        const cfg = MAP_TILE_CONFIGS[activeLayer];
        const tile = L.tileLayer(cfg.url, {
          maxZoom: 20,
          subdomains: cfg.subdomains,
        }).addTo(map);

        tileLayerRef.current = tile;
        mapInstanceRef.current = map;
        setMapReady(true);

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

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when layer type toggles
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }
      const cfg = MAP_TILE_CONFIGS[activeLayer];
      const newTile = L.tileLayer(cfg.url, {
        maxZoom: 20,
        subdomains: cfg.subdomains,
      }).addTo(mapInstanceRef.current);
      tileLayerRef.current = newTile;
    })();
  }, [activeLayer]);

  // Update Markers, Polyline, and Rapido Surge Pins
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    void (async () => {
      try {
        const L = (await import("leaflet")).default;
        const map = mapInstanceRef.current;
        if (!map) return;
        const bounds: [number, number][] = [];

        // 1. Rider Marker (Rapido Captain Scooter with Radar Ripple Waves)
        if (riderLocation && riderLocation.lat && riderLocation.lng) {
          bounds.push([riderLocation.lat, riderLocation.lng]);

          const riderHtml = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 64px; height: 64px;">
              <!-- Radar Ripple Wave 1 (Emerald Green) -->
              <span style="position: absolute; width: 60px; height: 60px; border-radius: 9999px; background-color: rgba(0, 200, 83, 0.22); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <!-- Radar Ripple Wave 2 (Emerald Green) -->
              <span style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background-color: rgba(0, 200, 83, 0.4); animation: pulse 1.6s ease-in-out infinite;"></span>
              <!-- Signature White & Emerald Green 3D Scooter Avatar -->
              <div style="position: relative; display: flex; width: 38px; height: 38px; align-items: center; justify-content: center; border-radius: 9999px; background: #FFFFFF; color: #00C853; box-shadow: 0 4px 14px rgba(0, 200, 83, 0.45), 0 2px 4px rgba(0,0,0,0.1); border: 2.5px solid #00C853; font-size: 19px; line-height: 1;">
                🛵
              </div>
              <!-- Live Online Duty Dot -->
              <span style="position: absolute; bottom: 8px; right: 10px; width: 12px; height: 12px; border-radius: 9999px; background: #00C853; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
            </div>
          `;

          const riderIcon = L.divIcon({
            className: "rapido-rider-marker",
            html: riderHtml,
            iconSize: [64, 64],
            iconAnchor: [32, 32],
          });

          if (markersRef.current["rider"]) {
            markersRef.current["rider"].setLatLng([riderLocation.lat, riderLocation.lng]);
          } else {
            const riderIcon = L.divIcon({
              className: "rapido-rider-marker",
              html: riderHtml,
              iconSize: [64, 64],
              iconAnchor: [32, 32],
            });
            markersRef.current["rider"] = L.marker([riderLocation.lat, riderLocation.lng], {
              icon: riderIcon,
              zIndexOffset: 1000,
            }).addTo(map);
            markersRef.current["rider"].bindPopup(
              `<b>${riderLocation.label || "QuickPress Captain"}</b><br/>Rapido Telemetry Active 🟢`
            );
          }
        }

        // 2. Destination Marker (Customer Home / Drop)
        if (destinationLocation && destinationLocation.lat && destinationLocation.lng) {
          bounds.push([destinationLocation.lat, destinationLocation.lng]);

          const destIcon = L.divIcon({
            className: "custom-dest-icon",
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
                <div style="position: relative; display: flex; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 9999px; background-color: #d97706; color: white; box-shadow: 0 4px 10px rgba(217, 119, 6, 0.4); border: 2.5px solid white; font-size: 16px;">
                  🏠
                </div>
              </div>
            `,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          });

          if (markersRef.current["dest"]) {
            markersRef.current["dest"].setLatLng([destinationLocation.lat, destinationLocation.lng]);
          } else {
            markersRef.current["dest"] = L.marker([destinationLocation.lat, destinationLocation.lng], {
              icon: destIcon,
            }).addTo(map);
            markersRef.current["dest"].bindPopup(
              `<b>${destinationLocation.label || "Customer Destination"}</b><br/>${destinationLocation.sublabel || targetAddressName || ""}`
            );
          }
        }

        // 3. Store / Pickup Location Marker
        if (storeLocation && storeLocation.lat && storeLocation.lng) {
          bounds.push([storeLocation.lat, storeLocation.lng]);

          const storeIcon = L.divIcon({
            className: "custom-store-icon",
            html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
                <div style="position: relative; display: flex; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 9999px; background-color: #2563eb; color: white; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4); border: 2.5px solid white; font-size: 16px;">
                  🧺
                </div>
              </div>
            `,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          });

          if (markersRef.current["store"]) {
            markersRef.current["store"].setLatLng([storeLocation.lat, storeLocation.lng]);
          } else {
            markersRef.current["store"] = L.marker([storeLocation.lat, storeLocation.lng], {
              icon: storeIcon,
            }).addTo(map);
            markersRef.current["store"].bindPopup(
              `<b>${storeLocation.label || "Pickup Partner Store"}</b><br/>${storeLocation.sublabel || ""}`
            );
          }
        }

        // 4. Interactive Dynamic Surge Heat Circles & Hotspot Badges
        const activeSurgeList =
          surgeHotspots && surgeHotspots.length > 0 ? surgeHotspots : KASGANJ_SURGE_HOTSPOTS;

        // Clean up stale markers/circles when hotspots update
        const currentActiveIds = new Set(activeSurgeList.map((s) => s.id));
        Object.keys(surgeMarkersRef.current).forEach((k) => {
          if (!currentActiveIds.has(k)) {
            try {
              map.removeLayer(surgeMarkersRef.current[k]);
            } catch {}
            delete surgeMarkersRef.current[k];
          }
        });
        // Clean up any surge circles completely (removes big radius circles)
        Object.keys(surgeCirclesRef.current).forEach((k) => {
          try {
            map.removeLayer(surgeCirclesRef.current[k]);
          } catch {}
          delete surgeCirclesRef.current[k];
        });

        if (showSurgePins && phase === "online") {
          activeSurgeList.forEach((surge) => {
            const circleColor =
              surge.color ||
              (surge.bonus >= 25 ? "#EF4444" : surge.bonus >= 20 ? "#F59E0B" : "#10B981");

            // Dynamic Surge Pin Badge with Pulse (Clean hotspot badge without big radius circle)
            if (!surgeMarkersRef.current[surge.id]) {
              const surgeIcon = L.divIcon({
                className: "rapido-surge-badge",
                html: `
                  <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 9999px; background: #FFFFFF; color: ${circleColor}; font-weight: 900; font-size: 11px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16); border: 2px solid ${circleColor}; white-space: nowrap;">
                      <span>${surge.label}</span>
                    </div>
                    <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${circleColor};"></div>
                    <span style="position: absolute; bottom: -4px; width: 10px; height: 10px; border-radius: 9999px; background: ${circleColor}; opacity: 0.55; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
                  </div>
                `,
                iconSize: [110, 36],
                iconAnchor: [55, 36],
              });

              const marker = L.marker([surge.lat, surge.lng], { icon: surgeIcon }).addTo(map);
              marker.on("click", () => {
                triggerHaptic(40);
                if (onSurgeClick) onSurgeClick(surge);
                map.flyTo([surge.lat, surge.lng], 16, { animate: true, duration: 0.8 });
              });
              marker.bindPopup(`
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 190px; padding: 2px;">
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom: 4px;">
                    <strong style="font-size:12px; color:#09090b;">${surge.name}</strong>
                    <span style="background:${circleColor}; color:#ffffff; font-size:9px; font-weight:800; padding:1px 6px; border-radius:9999px;">${surge.demandLevel || "HOT 🔥"}</span>
                  </div>
                  <div style="font-size:11px; color:#00873D; font-weight:700; margin-bottom:4px;">
                    ${surge.multiplier} Surge Active · +₹${surge.bonus} Extra per Ride
                  </div>
                  <div style="font-size:10px; color:#71717a; border-top:1px solid #f4f4f5; padding-top:4px; display:flex; justify-content:space-between;">
                    <span>${surge.ordersWaiting !== undefined ? `📦 ${surge.ordersWaiting} Orders` : "High Orders"}</span>
                    <span>${surge.distanceKm !== undefined ? `📍 ${surge.distanceKm} km away` : ""}</span>
                  </div>
                </div>
              `);
              surgeMarkersRef.current[surge.id] = marker;
            } else {
              surgeMarkersRef.current[surge.id].setLatLng([surge.lat, surge.lng]);
            }
          });
        }

        // 5. Draw Polyline Route with Real Street Geometry (Throttled & Cached)
        const targetPoint = destinationLocation || storeLocation;
        if (riderLocation && targetPoint) {
          const lastR = lastRouteCoordsRef.current;
          const shouldRefetchRoute =
            !lastR ||
            !polylineRef.current ||
            Math.abs(lastR.rLat - riderLocation.lat) > 0.0008 ||
            Math.abs(lastR.rLng - riderLocation.lng) > 0.0008 ||
            Math.abs(lastR.tLat - targetPoint.lat) > 0.0001 ||
            Math.abs(lastR.tLng - targetPoint.lng) > 0.0001;

          if (shouldRefetchRoute) {
            lastRouteCoordsRef.current = {
              rLat: riderLocation.lat,
              rLng: riderLocation.lng,
              tLat: targetPoint.lat,
              tLng: targetPoint.lng,
            };
            const routeData = await fetchStreetRoute(
              { lat: riderLocation.lat, lng: riderLocation.lng },
              { lat: targetPoint.lat, lng: targetPoint.lng },
              targetAddressName || "Target"
            );
            const polylineCoords: [number, number][] =
              routeData.coordinates.length >= 2
                ? routeData.coordinates
                : [
                    [riderLocation.lat, riderLocation.lng],
                    [targetPoint.lat, targetPoint.lng],
                  ];

            if (polylineRef.current) {
              polylineRef.current.setLatLngs(polylineCoords);
            } else {
              polylineRef.current = L.polyline(polylineCoords, {
                color: "#00C853",
                weight: 5.5,
                opacity: 1,
                lineJoin: "round",
                lineCap: "round",
              }).addTo(map);
            }
          }
        } else if (polylineRef.current) {
          map.removeLayer(polylineRef.current);
          polylineRef.current = null;
          lastRouteCoordsRef.current = null;
        }

        // Auto-Fit Bounds ONLY on phase change or initial load (Zero camera jitter while driving!)
        if (lastFittedPhaseRef.current !== (phase || "default")) {
          lastFittedPhaseRef.current = phase || "default";
          if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
          } else if (bounds.length === 1 && !markersRef.current["hasCentered"]) {
            map.setView(bounds[0], 15);
            markersRef.current["hasCentered"] = true;
          }
        }
      } catch (err) {
        // Suppress unmounted map transitions
      }
    })();
  }, [mapReady, riderLocation?.lat, riderLocation?.lng, destinationLocation?.lat, destinationLocation?.lng, storeLocation?.lat, storeLocation?.lng, isRapidoTheme, showSurgePins, surgeHotspots, phase]);

  // Recenter on Rider
  const handleRecenter = () => {
    triggerHaptic(40);
    if (!mapInstanceRef.current) return;
    const focus = riderLocation || destinationLocation || storeLocation || defaultCenter;
    mapInstanceRef.current.flyTo([focus.lat, focus.lng], 16, { animate: true, duration: 1 });
  };

  // Toggle Layer (Roadmap -> Night -> Satellite -> Traffic -> Roadmap)
  const handleToggleLayer = () => {
    triggerHaptic(40);
    const order: GoogleMapLayerType[] = ["roadmap", "night", "satellite", "traffic"];
    const currIdx = order.indexOf(activeLayer);
    const nextLayer = order[(currIdx + 1) % order.length];
    setInternalLayer(nextLayer);
    if (onLayerChange) onLayerChange(nextLayer);
  };

  // Zoom In / Out
  const handleZoomIn = () => {
    triggerHaptic(30);
    mapInstanceRef.current?.zoomIn();
  };
  const handleZoomOut = () => {
    triggerHaptic(30);
    mapInstanceRef.current?.zoomOut();
  };

  // Trigger In-App GPS Navigation Mode (100% In-App, Zero External App Redirect)
  // Open Turn-by-Turn Road Navigation in Google Maps (Bike/Two-Wheeler Mode)
  const handleOpenGoogleMaps = () => {
    triggerHaptic(40);
    const target = destinationLocation || storeLocation;
    if (!target) return;
    const origin = riderLocation ? `${riderLocation.lat},${riderLocation.lng}` : "";
    const dest = `${target.lat},${target.lng}`;
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=two_wheeler`
      : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=two_wheeler`;
    window.open(url, "_blank");
  };

  const handleStartNavigation = () => {
    triggerHaptic(50);
    if (onOpenNavigation) {
      onOpenNavigation();
    } else {
      handleRecenter();
    }
  };

  return (
    <div className={`relative w-full overflow-hidden bg-slate-100 select-none ${heightClassName}`}>
      {/* Actual Leaflet Container */}
      <div ref={mapContainerRef} className="absolute inset-0 size-full z-0" />

      {/* Floating Telemetry Badge (Top Left - In Trip Phase) */}
      {(phase === "pickup" || phase === "delivery") && (
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-lg border border-emerald-200 text-xs text-zinc-900">
            <span className="flex size-2 rounded-full bg-[#00C853] animate-pulse" />
            <span className="font-black text-black">
              {phase === "pickup" ? "To Pickup" : "To Customer"}
            </span>
            {distanceKm !== null ? (
              <>
                <span className="text-zinc-400">·</span>
                <span className="font-mono font-black text-black">{distanceKm} km</span>
              </>
            ) : null}
            {etaMins !== null ? (
              <>
                <span className="text-zinc-400">·</span>
                <span className="font-bold text-black">~{etaMins} mins</span>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Floating Map Controls (Right Side - White & Emerald Green) */}
      {showControls ? (
        <div className="absolute top-16 right-3 z-20 flex flex-col gap-2">
          {/* Recenter on Captain */}
          <button
            type="button"
            onClick={handleRecenter}
            className="flex size-10 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-[#00C853] shadow-md border border-emerald-200 hover:bg-emerald-50 active:scale-95 transition-transform cursor-pointer"
            title="Recenter on Captain (GPS)"
          >
            <Crosshair className="size-5" />
          </button>

          {/* Layer Switcher (Roadmap / Night / Satellite / Traffic) */}
          <button
            type="button"
            onClick={handleToggleLayer}
            className="flex size-10 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-zinc-700 shadow-md border border-zinc-200 hover:bg-zinc-50 active:scale-95 transition-transform cursor-pointer"
            title={`Map View: ${activeLayer} (Tap to switch)`}
          >
            {activeLayer === "night" ? (
              <Moon className="size-4.5 text-indigo-500" />
            ) : activeLayer === "satellite" ? (
              <Layers className="size-4.5 text-[#00C853]" />
            ) : (
              <Sun className="size-4.5 text-amber-500" />
            )}
          </button>

          {/* Zoom controls */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex size-10 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-zinc-700 shadow-md border border-zinc-200 hover:bg-zinc-50 active:scale-95 transition-transform cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex size-10 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-zinc-700 shadow-md border border-zinc-200 hover:bg-zinc-50 active:scale-95 transition-transform cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="size-4.5" />
          </button>
        </div>
      ) : null}

      {/* Action Buttons: Direct Google Maps & In-App Navigation */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
        {destinationLocation || storeLocation ? (
          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="flex items-center gap-1.5 rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-2.5 text-xs font-black text-zinc-900 shadow-xl border border-zinc-300 hover:bg-zinc-50 active:scale-95 transition-transform cursor-pointer"
            title="Open Turn-by-Turn Road Navigation in Google Maps"
          >
            <ExternalLink className="size-4 text-blue-600" />
            <span>Google Maps 🗺️</span>
          </button>
        ) : null}

        {onOpenNavigation ? (
          <button
            type="button"
            onClick={handleStartNavigation}
            className="flex items-center gap-2 rounded-2xl bg-[#00C853] px-4 py-2.5 text-xs font-black text-white shadow-xl shadow-emerald-500/25 hover:bg-[#00B248] active:scale-95 transition-transform cursor-pointer border border-emerald-400"
            title="Start In-App Voice Turn-by-Turn GPS Navigation"
          >
            <Navigation className="size-4 fill-white stroke-none" />
            <span>Turn-by-Turn GPS 🧭</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
