import { useEffect, useRef, useState } from "react";
import { Crosshair, ExternalLink, Navigation, ZoomIn, ZoomOut } from "lucide-react";

export type MapCoordinate = {
  lat: number;
  lng: number;
  label?: string;
  sublabel?: string;
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

export function LiveDeliveryMap({
  riderLocation,
  destinationLocation,
  storeLocation,
  phase = "delivery",
  heightClassName = "h-72",
  showControls = true,
  onOpenNavigation,
}: LiveDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ rider?: any; dest?: any; store?: any }>({});
  const polylineRef = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [etaMins, setEtaMins] = useState<number | null>(null);

  // Default coordinate (Center of Kasganj, UP if no coordinates available)
  const defaultCenter = { lat: 27.8118, lng: 78.6477 };

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
      const eta = Math.max(2, Math.round((dist / 20) * 60));
      setEtaMins(eta);
    } else {
      setDistanceKm(null);
      setEtaMins(null);
    }
  }, [riderLocation, destinationLocation]);

  // Initialize Leaflet map safely on client
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

        // Add CartoDB Voyager Retina Tiles
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 19,
            subdomains: "abcd",
          }
        ).addTo(map);

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
      }
    };
  }, []);

  // Update Markers & Polyline when coordinates change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    void (async () => {
      const L = (await import("leaflet")).default;
      const map = mapInstanceRef.current;
      const bounds: any[] = [];

      // 1. Rider Marker (Pulsing Emerald Bike)
      if (riderLocation && riderLocation.lat && riderLocation.lng) {
        bounds.push([riderLocation.lat, riderLocation.lng]);

        const heading = (riderLocation as any)?.heading;
        const rotateTransform = heading ? `transform: rotate(${heading}deg);` : "";

        const riderIcon = L.divIcon({
          className: "custom-rider-icon",
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
              <span style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background-color: #34d399; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
              <div class="custom-rider-icon-inner" style="position: relative; display: flex; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 9999px; background-color: #065f46; color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); border: 2.5px solid white; ${rotateTransform}">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/>
                  <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        if (markersRef.current.rider) {
          markersRef.current.rider.setIcon(riderIcon);
          markersRef.current.rider.setLatLng([riderLocation.lat, riderLocation.lng]);
        } else {
          markersRef.current.rider = L.marker([riderLocation.lat, riderLocation.lng], {
            icon: riderIcon,
            zIndexOffset: 1000,
          }).addTo(map);
          markersRef.current.rider.bindPopup(
            `<b>${riderLocation.label || "Delivery Captain"}</b><br/>En Route`
          );
        }
      }

      // 2. Destination Marker (Customer Home / Drop)
      if (destinationLocation && destinationLocation.lat && destinationLocation.lng) {
        bounds.push([destinationLocation.lat, destinationLocation.lng]);

        const destIcon = L.divIcon({
          className: "custom-dest-icon",
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
              <div style="position: relative; display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 9999px; background-color: #d97706; color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); border: 2.5px solid white;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        if (markersRef.current.dest) {
          markersRef.current.dest.setLatLng([destinationLocation.lat, destinationLocation.lng]);
        } else {
          markersRef.current.dest = L.marker(
            [destinationLocation.lat, destinationLocation.lng],
            { icon: destIcon }
          ).addTo(map);
          markersRef.current.dest.bindPopup(
            `<b>${destinationLocation.label || "Your Location"}</b><br/>${destinationLocation.sublabel || ""}`
          );
        }
      }

      // 3. Store Marker (Partner Laundry Store)
      if (storeLocation && storeLocation.lat && storeLocation.lng) {
        bounds.push([storeLocation.lat, storeLocation.lng]);

        const storeIcon = L.divIcon({
          className: "custom-store-icon",
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
              <div style="position: relative; display: flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 9999px; background-color: #4f46e5; color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); border: 2.5px solid white;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        if (markersRef.current.store) {
          markersRef.current.store.setLatLng([storeLocation.lat, storeLocation.lng]);
        } else {
          markersRef.current.store = L.marker([storeLocation.lat, storeLocation.lng], {
            icon: storeIcon,
          }).addTo(map);
          markersRef.current.store.bindPopup(
            `<b>${storeLocation.label || "QuickPress Store"}</b><br/>${storeLocation.sublabel || ""}`
          );
        }
      }

      // 4. Live Route Polyline
      if (riderLocation && destinationLocation) {
        const routePoints: [number, number][] = [
          [riderLocation.lat, riderLocation.lng],
          [destinationLocation.lat, destinationLocation.lng],
        ];

        if (polylineRef.current) {
          polylineRef.current.setLatLngs(routePoints);
        } else {
          polylineRef.current = L.polyline(routePoints, {
            color: "#059669",
            weight: 4,
            opacity: 0.85,
            dashArray: "8, 8",
            lineCap: "round",
          }).addTo(map);
        }
      }

      // Auto-Fit Bounds
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      }
    })();
  }, [mapReady, riderLocation, destinationLocation, storeLocation]);

  // Recenter on Rider / Destination
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const focus = riderLocation || destinationLocation || storeLocation || defaultCenter;
    mapInstanceRef.current.flyTo([focus.lat, focus.lng], 16, { animate: true, duration: 1 });
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-sm select-none ${heightClassName}`}>
      <div ref={mapContainerRef} className="absolute inset-0 size-full z-0" />

      {/* Floating Telemetry Badge (Top Left) */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-2 rounded-xl bg-card/95 backdrop-blur-md px-3 py-1.5 shadow-md border border-border text-xs">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-foreground">
            {phase === "pickup" ? "Pickup Rider" : "Delivery Captain"}
          </span>
          {distanceKm !== null ? (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-black text-brand-green">{distanceKm} km</span>
            </>
          ) : null}
          {etaMins !== null ? (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="font-bold text-foreground">~{etaMins} mins</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Floating Controls (Top Right) */}
      {showControls ? (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleRecenter}
            className="flex size-8 items-center justify-center rounded-xl bg-card/95 backdrop-blur-md text-foreground shadow-md border border-border hover:bg-muted active:scale-95 transition-transform cursor-pointer"
            title="Recenter"
          >
            <Crosshair className="size-4 text-brand-green" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex size-8 items-center justify-center rounded-xl bg-card/95 backdrop-blur-md text-foreground shadow-md border border-border hover:bg-muted active:scale-95 transition-transform cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex size-8 items-center justify-center rounded-xl bg-card/95 backdrop-blur-md text-foreground shadow-md border border-border hover:bg-muted active:scale-95 transition-transform cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
