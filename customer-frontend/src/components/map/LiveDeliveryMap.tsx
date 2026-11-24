import { useEffect, useRef, useState } from "react";
import { Crosshair, Layers, Moon, Sun, ZoomIn, ZoomOut } from "lucide-react";
import { computeRoute, decodePolyline } from "@/api/core/maps-api";

export type MapCoordinate = {
  lat: number;
  lng: number;
  label?: string;
  sublabel?: string;
  heading?: number;
  speed?: number;
};

export type LiveDeliveryMapProps = {
  riderLocation?: MapCoordinate | null;
  destinationLocation?: MapCoordinate | null;
  storeLocation?: MapCoordinate | null;
  targetAddressName?: string;
  phase?: "pickup" | "delivery" | "online" | "idle";
  heightClassName?: string;
  showControls?: boolean;
  onOpenNavigation?: () => void;
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

// Map Tile Themes
type MapTheme = "voyager" | "dark" | "google";

const TILE_CONFIGS: Record<MapTheme, { url: string; subdomains: string[]; maxZoom: number; attribution: string }> = {
  // Blinkit / Zomato Signature Muted Pastel Theme (CartoDB Voyager)
  voyager: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    maxZoom: 20,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
  // Sleek Dark Matter Theme for Night Mode
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: ["a", "b", "c", "d"],
    maxZoom: 20,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
  // Classic High-Res Google Roadmap
  google: {
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 20,
    attribution: "&copy; Google Maps",
  },
};

export function LiveDeliveryMap({
  riderLocation,
  destinationLocation,
  storeLocation,
  phase = "delivery",
  heightClassName = "h-72",
  showControls = true,
}: LiveDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<{ rider?: any; dest?: any; store?: any }>({});
  const polylineRef = useRef<any>(null);
  const glowPolylineRef = useRef<any>(null);
  const hasInitialFitRef = useRef(false);
  const lastRouteFetchKeyRef = useRef<string>("");

  const [mapReady, setMapReady] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMins, setEtaMins] = useState<number | null>(null);
  const [currentTheme, setCurrentTheme] = useState<MapTheme>("voyager");

  // Default coordinate if no rider or destination coordinates are available
  const defaultCenter = { lat: 28.6139, lng: 77.209 };

  // Auto-detect theme based on system / HTML class
  useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
      setCurrentTheme("dark");
    } else {
      setCurrentTheme("voyager");
    }
  }, []);

  // Calculate distance & ETA whenever positions update
  useEffect(() => {
    if (riderLocation && destinationLocation) {
      const dist = getDistanceKm(
        riderLocation.lat,
        riderLocation.lng,
        destinationLocation.lat,
        destinationLocation.lng
      );
      setDistanceKm(dist);
      const eta = Math.max(2, Math.round((dist / 22) * 60));
      setEtaMins(eta);
    } else {
      setDistanceKm(null);
      setEtaMins(null);
    }
  }, [riderLocation, destinationLocation]);

  // Initialize Leaflet map with CartoDB Voyager theme
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const initialCenter = destinationLocation || riderLocation || defaultCenter;

        const map = L.map(mapContainerRef.current, {
          center: [initialCenter.lat, initialCenter.lng],
          zoom: 15,
          zoomControl: false,
          attributionControl: false,
        });

        // Set Blinkit/Zomato Carto Voyager Muted Theme
        const themeConfig = TILE_CONFIGS[currentTheme];
        const tileLayer = L.tileLayer(themeConfig.url, {
          maxZoom: themeConfig.maxZoom,
          subdomains: themeConfig.subdomains,
          attribution: themeConfig.attribution,
        }).addTo(map);

        tileLayerRef.current = tileLayer;
        mapInstanceRef.current = map;
        setMapReady(true);
      }
    }

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Handle tile theme switch
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !tileLayerRef.current) return;

    void (async () => {
      const L = (await import("leaflet")).default;
      const themeConfig = TILE_CONFIGS[currentTheme];

      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(themeConfig.url, {
        maxZoom: themeConfig.maxZoom,
        subdomains: themeConfig.subdomains,
        attribution: themeConfig.attribution,
      }).addTo(mapInstanceRef.current);

      newLayer.bringToBack();
      tileLayerRef.current = newLayer;
    })();
  }, [currentTheme, mapReady]);

  // Update Markers & Snapped Road Polyline when coordinates change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    void (async () => {
      const L = (await import("leaflet")).default;
      const map = mapInstanceRef.current;
      const bounds: any[] = [];

      // -------------------------------------------------------------
      // 1. Rider Marker (Blinkit/Zomato 3D Isometric Delivery Scooter)
      // -------------------------------------------------------------
      if (riderLocation && riderLocation.lat && riderLocation.lng) {
        bounds.push([riderLocation.lat, riderLocation.lng]);

        const heading = (riderLocation as any)?.heading || 0;
        const rotateTransform = heading ? `transform: rotate(${heading}deg);` : "";
        const riderName = riderLocation.label || "Delivery Captain";
        const speedKmph = (riderLocation as any)?.speed;

        const riderIcon = L.divIcon({
          className: "custom-zomato-rider-marker",
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 64px; height: 64px;">
              <!-- Floating Captain Tag Pill -->
              <div class="zomato-floating-pill">
                <span class="zomato-pill-dot"></span>
                <span class="zomato-pill-text">${riderName}</span>
                ${speedKmph ? `<span class="zomato-pill-speed">${Math.round(speedKmph)} km/h</span>` : ""}
              </div>

              <!-- Radar Pulse Waves -->
              <span class="zomato-radar-pulse-outer"></span>
              <span class="zomato-radar-pulse-inner"></span>

              <!-- 3D Delivery Scooter Container with Directional Rotation -->
              <div class="zomato-scooter-disc" style="${rotateTransform}">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Electric Scooter Body -->
                  <circle cx="6" cy="18" r="3.5" fill="#047857" stroke="#ffffff" stroke-width="1.8"/>
                  <circle cx="18" cy="18" r="3.5" fill="#047857" stroke="#ffffff" stroke-width="1.8"/>
                  <path d="M6 18H10L14 8H18" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  <!-- QuickPress Delivery Box -->
                  <rect x="3.5" y="7.5" width="6.5" height="6.5" rx="1.5" fill="#10b981" stroke="#ffffff" stroke-width="1.5"/>
                  <!-- Front Shield & Light -->
                  <path d="M14 8L16 5H18.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="19" cy="6" r="1.2" fill="#fbbf24"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [64, 64],
          iconAnchor: [32, 42],
        });

        if (markersRef.current.rider) {
          markersRef.current.rider.setIcon(riderIcon);
          markersRef.current.rider.setLatLng([riderLocation.lat, riderLocation.lng]);
        } else {
          markersRef.current.rider = L.marker([riderLocation.lat, riderLocation.lng], {
            icon: riderIcon,
            zIndexOffset: 1200,
          }).addTo(map);
          markersRef.current.rider.bindPopup(
            `<b>${riderName}</b><br/>En Route to Doorstep`
          );
        }
      }

      // -------------------------------------------------------------
      // 2. Destination Marker (Blinkit/Zomato Smart Doorstep Pin)
      // -------------------------------------------------------------
      if (destinationLocation && destinationLocation.lat && destinationLocation.lng) {
        bounds.push([destinationLocation.lat, destinationLocation.lng]);

        const destLabel = destinationLocation.label || "Your Doorstep";

        const destIcon = L.divIcon({
          className: "custom-zomato-dest-marker",
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 56px; height: 60px;">
              <!-- Floating Destination Pill -->
              <div class="zomato-dest-pill">
                <span>📍 ${destLabel}</span>
              </div>

              <!-- Base Concentric Target Ring -->
              <span class="zomato-dest-target-pulse"></span>

              <!-- Amber Teardrop Pin with House Silhouette -->
              <div class="zomato-dest-pin-disc">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [56, 60],
          iconAnchor: [28, 52],
        });

        if (markersRef.current.dest) {
          markersRef.current.dest.setLatLng([destinationLocation.lat, destinationLocation.lng]);
        } else {
          markersRef.current.dest = L.marker(
            [destinationLocation.lat, destinationLocation.lng],
            { icon: destIcon, zIndexOffset: 1000 }
          ).addTo(map);
          markersRef.current.dest.bindPopup(
            `<b>${destLabel}</b><br/>${destinationLocation.sublabel || "Delivery Destination"}`
          );
        }
      }

      // -------------------------------------------------------------
      // 3. Store Marker (QuickPress Laundromat Hub Badge)
      // -------------------------------------------------------------
      if (storeLocation && storeLocation.lat && storeLocation.lng) {
        bounds.push([storeLocation.lat, storeLocation.lng]);

        const storeLabel = storeLocation.label || "QuickPress Store Hub";

        const storeIcon = L.divIcon({
          className: "custom-zomato-store-marker",
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 52px; height: 56px;">
              <div class="zomato-store-pill">
                <span>🏪 ${storeLabel}</span>
              </div>
              <div class="zomato-store-disc">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                  <path d="M3 6h18"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [52, 56],
          iconAnchor: [26, 48],
        });

        if (markersRef.current.store) {
          markersRef.current.store.setLatLng([storeLocation.lat, storeLocation.lng]);
        } else {
          markersRef.current.store = L.marker([storeLocation.lat, storeLocation.lng], {
            icon: storeIcon,
            zIndexOffset: 800,
          }).addTo(map);
          markersRef.current.store.bindPopup(
            `<b>${storeLabel}</b><br/>Laundry & Garment Care Hub`
          );
        }
      }

      // -------------------------------------------------------------
      // 4. Road-Snapped Turn-by-Turn Real Polyline Route
      // -------------------------------------------------------------
      if (riderLocation && destinationLocation) {
        let routeCoords: [number, number][] = [
          [riderLocation.lat, riderLocation.lng],
          [destinationLocation.lat, destinationLocation.lng],
        ];

        const fetchKey = `${riderLocation.lat.toFixed(3)},${riderLocation.lng.toFixed(3)}->${destinationLocation.lat.toFixed(3)},${destinationLocation.lng.toFixed(3)}`;

        // Attempt road-snapped turn-by-turn routing via OSRM / Google Directions API
        if (fetchKey !== lastRouteFetchKeyRef.current) {
          lastRouteFetchKeyRef.current = fetchKey;
          try {
            const routeResult = await computeRoute(
              { latitude: riderLocation.lat, longitude: riderLocation.lng },
              { latitude: destinationLocation.lat, longitude: destinationLocation.lng },
              "TWO_WHEELER"
            );
            if (routeResult?.polyline) {
              const decoded = decodePolyline(routeResult.polyline);
              if (decoded && decoded.length > 1) {
                routeCoords = decoded.map((pt) => [pt.latitude, pt.longitude]);
              }
            }
          } catch {
            // Keep straight baseline on network hiccups
          }
        }

        // Layer A: Emerald Outer Glow Casing
        if (glowPolylineRef.current) {
          glowPolylineRef.current.setLatLngs(routeCoords);
        } else {
          glowPolylineRef.current = L.polyline(routeCoords, {
            color: "#10b981",
            weight: 8,
            opacity: 0.28,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
        }

        // Layer B: Vibrant Core Route Line
        if (polylineRef.current) {
          polylineRef.current.setLatLngs(routeCoords);
        } else {
          polylineRef.current = L.polyline(routeCoords, {
            color: "#059669",
            weight: 4.5,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
        }
      }

      // Auto-Fit Bounds on initial load or first valid coordinates only
      if (!hasInitialFitRef.current && bounds.length > 0) {
        if (bounds.length > 1) {
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
        } else if (bounds.length === 1) {
          map.setView(bounds[0], 15);
        }
        hasInitialFitRef.current = true;
      }
    })();
  }, [mapReady, riderLocation, destinationLocation, storeLocation]);

  // Recenter on Full Journey / Rider / Destination
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const bounds: [number, number][] = [];
    if (riderLocation && riderLocation.lat && riderLocation.lng) {
      bounds.push([riderLocation.lat, riderLocation.lng]);
    }
    if (destinationLocation && destinationLocation.lat && destinationLocation.lng) {
      bounds.push([destinationLocation.lat, destinationLocation.lng]);
    }
    if (storeLocation && storeLocation.lat && storeLocation.lng) {
      bounds.push([storeLocation.lat, storeLocation.lng]);
    }
    if (bounds.length > 1) {
      map.flyToBounds(bounds, { padding: [45, 45], maxZoom: 16, duration: 0.8 });
    } else if (bounds.length === 1) {
      map.flyTo(bounds[0], 16, { animate: true, duration: 0.8 });
    } else {
      map.flyTo([defaultCenter.lat, defaultCenter.lng], 15, { animate: true, duration: 0.8 });
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === "voyager" ? "dark" : prev === "dark" ? "google" : "voyager"));
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-sm select-none ${heightClassName}`}>
      <div ref={mapContainerRef} className="absolute inset-0 size-full z-0" />

      {/* Floating Zomato/Blinkit Live Telemetry Badge (Top Left) */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 rounded-full bg-background/90 dark:bg-card/90 backdrop-blur-md px-3.5 py-1.5 shadow-lg border border-border/60 text-xs pointer-events-auto">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-extrabold text-foreground tracking-tight">
            {phase === "pickup" ? "Pickup In Progress" : "Delivery In Transit"}
          </span>
          {distanceKm !== null ? (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="font-black text-brand-green">{distanceKm} km away</span>
            </>
          ) : null}
          {etaMins !== null ? (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="font-bold text-foreground">~{etaMins} mins</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Floating Glassmorphic Controls (Top Right) */}
      {showControls ? (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleRecenter}
            className="flex size-8.5 items-center justify-center rounded-xl bg-background/90 dark:bg-card/90 backdrop-blur-md text-foreground shadow-md border border-border/60 hover:bg-muted active:scale-95 transition-transform cursor-pointer"
            title="Recenter Full Route"
            aria-label="Recenter Full Route"
          >
            <Crosshair className="size-4 text-brand-green" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex size-8.5 items-center justify-center rounded-xl bg-background/90 dark:bg-card/90 backdrop-blur-md text-foreground shadow-md border border-border/60 hover:bg-muted active:scale-95 transition-transform cursor-pointer"
            title={`Map Theme: ${currentTheme.toUpperCase()} (Click to toggle)`}
            aria-label="Toggle Map Theme"
          >
            {currentTheme === "voyager" ? (
              <Layers className="size-4 text-emerald-600" />
            ) : currentTheme === "dark" ? (
              <Moon className="size-4 text-indigo-400" />
            ) : (
              <Sun className="size-4 text-amber-500" />
            )}
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex size-8.5 items-center justify-center rounded-xl bg-background/90 dark:bg-card/90 backdrop-blur-md text-foreground shadow-md border border-border/60 hover:bg-muted active:scale-95 transition-transform cursor-pointer"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex size-8.5 items-center justify-center rounded-xl bg-background/90 dark:bg-card/90 backdrop-blur-md text-foreground shadow-md border border-border/60 hover:bg-muted active:scale-95 transition-transform cursor-pointer"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </button>
        </div>
      ) : null}

      {/* Blinkit / Zomato Signature CSS Cartography Styles */}
      <style>{`
        /* Smooth Marker Transitions */
        .custom-zomato-rider-marker {
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), top 0.6s ease-out, left 0.6s ease-out;
          will-change: transform;
        }

        /* Floating Rider Pill */
        .zomato-floating-pill {
          position: absolute;
          top: -24px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 9999px;
          background: rgba(6, 78, 59, 0.92);
          backdrop-filter: blur(8px);
          color: white;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: -0.01em;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.25);
          white-space: nowrap;
          z-index: 10;
        }
        .zomato-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #34d399;
          animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .zomato-pill-speed {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          padding: 0 4px;
          font-size: 9.5px;
          font-weight: 900;
        }

        /* Radar Pulse Waves */
        .zomato-radar-pulse-outer {
          position: absolute;
          width: 52px;
          height: 52px;
          border-radius: 9999px;
          background-color: #10b981;
          opacity: 0.25;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .zomato-radar-pulse-inner {
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          background-color: #34d399;
          opacity: 0.45;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        /* 3D Scooter Disc */
        .zomato-scooter-disc {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #059669, #047857);
          border: 2.5px solid #ffffff;
          box-shadow: 0 6px 14px rgba(4, 120, 87, 0.45);
          transition: transform 0.4s ease-out;
        }

        /* Destination Doorstep Marker */
        .zomato-dest-pill {
          position: absolute;
          top: -18px;
          padding: 2.5px 7px;
          border-radius: 9999px;
          background: rgba(217, 119, 6, 0.92);
          backdrop-filter: blur(8px);
          color: white;
          font-size: 10px;
          font-weight: 800;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.3);
          white-space: nowrap;
        }
        .zomato-dest-target-pulse {
          position: absolute;
          bottom: 2px;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: rgba(217, 119, 6, 0.3);
          border: 1.5px solid #d97706;
          animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .zomato-dest-pin-disc {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: 2.5px solid #ffffff;
          box-shadow: 0 6px 14px rgba(217, 119, 6, 0.4);
        }

        /* Store Hub Marker */
        .zomato-store-pill {
          position: absolute;
          top: -16px;
          padding: 2px 6px;
          border-radius: 9999px;
          background: rgba(79, 70, 229, 0.9);
          backdrop-filter: blur(8px);
          color: white;
          font-size: 9.5px;
          font-weight: 800;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
          white-space: nowrap;
        }
        .zomato-store-disc {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #6366f1, #4338ca);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 10px rgba(79, 70, 229, 0.35);
        }
      `}</style>
    </div>
  );
}
