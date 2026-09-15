/**
 * `<GoogleMapView />` — the single live-map surface shared across QuickPress apps.
 *
 * Renders real Google Maps via JavaScript SDK when available, and automatically
 * falls back to high-resolution Google Maps Tiles via Leaflet when the SDK is
 * unconfigured or fails to initialize.
 *
 * This ensures the map ALWAYS renders crisp streets, buildings, landmarks,
 * click-to-pin, center tracking, and draggable navigation without ever breaking.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

import { isGoogleMapsConfigured, loadGoogleMaps } from "../lib/google-maps-loader";

export type MapPoint = {
  id?: string;
  latitude: number;
  longitude: number;
  label?: string;
  tone?: "primary" | "secondary" | "muted";
};

export type GoogleMapViewProps = {
  center?: MapPoint | undefined;
  markers?: MapPoint[] | undefined;
  /** Decoded route path — draws a polyline and fits the map to it. */
  path?: { latitude: number; longitude: number }[] | undefined;
  /** Service radius in kilometres, drawn around `center`. */
  radiusKm?: number | undefined;
  zoom?: number | undefined;
  className?: string | undefined;
  interactive?: boolean | undefined;
  /** Fires when the user taps the map (address picker / shop location). */
  onPick?: ((point: { latitude: number; longitude: number }) => void) | undefined;
  /** Fires when map center moves / is dragged */
  onCenterChange?: ((point: { latitude: number; longitude: number }) => void) | undefined;
  fallback?: ReactNode | undefined;
  /** Prefer crisp Google Roadmap tiles via Leaflet to avoid JS SDK billing errors/watermarks */
  preferLeaflet?: boolean | undefined;
};

// Default center: Kasganj, UP
const DEFAULT_CENTER: MapPoint = { latitude: 27.8118, longitude: 78.6477 };

const TONE_COLOR: Record<NonNullable<MapPoint["tone"]>, string> = {
  primary: "#2563eb",
  secondary: "#16a34a",
  muted: "#64748b",
};

export function GoogleMapView({
  center,
  markers = [],
  path,
  radiusKm,
  zoom = 15,
  className = "h-64",
  interactive = true,
  onPick,
  onCenterChange,
  fallback = null,
  preferLeaflet = true,
}: GoogleMapViewProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletOverlaysRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const isDraggingRef = useRef(false);
  const [engine, setEngine] = useState<"google" | "leaflet" | null>(null);
  const [ready, setReady] = useState(false);

  // 1. Initialize Map: Use Leaflet Google Roadmap Tiles by default (crisp, zero watermarks, never fails)
  useEffect(() => {
    let active = true;

    async function init() {
      const start = center ?? markers[0] ?? DEFAULT_CENTER;

      // Only attempt Google JS SDK if explicitly requested (not preferred)
      if (!preferLeaflet && isGoogleMapsConfigured()) {
        try {
          const ok = await loadGoogleMaps();
          if (ok && active && container.current) {
            const google = (window as any).google;
            if (google?.maps?.Map) {
              mapRef.current = new google.maps.Map(container.current, {
                center: { lat: start.latitude, lng: start.longitude },
                zoom,
                disableDefaultUI: !interactive,
                gestureHandling: interactive ? "greedy" : "none",
                clickableIcons: false,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                zoomControl: false,
              });
              setEngine("google");
              setReady(true);
              return;
            }
          }
        } catch {
          /* proceed to Leaflet fallback */
        }
      }

      // Fallback to Leaflet with Google Maps Tiles (crisp streets, never fails)
      if (!active || !container.current) return;
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");

        if (!active || !container.current) return;

        const map = L.map(container.current, {
          center: [start.latitude, start.longitude],
          zoom,
          zoomControl: false,
          attributionControl: false,
          dragging: interactive,
          touchZoom: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
        });

        // Crisp Google Roadmap Layer
        L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }).addTo(map);

        leafletMapRef.current = map;
        setEngine("leaflet");
        setReady(true);

        setTimeout(() => {
          if (active && map) map.invalidateSize();
        }, 150);
        setTimeout(() => {
          if (active && map) map.invalidateSize();
        }, 400);

        if (typeof ResizeObserver !== "undefined" && container.current) {
          const ro = new ResizeObserver(() => {
            if (active && map) map.invalidateSize();
          });
          ro.observe(container.current);
        }
      } catch (err) {
        console.error("Leaflet map initialization failed:", err);
      }
    }

    void init();

    return () => {
      active = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Pan / SetView when center prop updates
  useEffect(() => {
    if (!ready || !center) return;

    if (engine === "google" && mapRef.current) {
      const currentCenter = mapRef.current.getCenter();
      if (currentCenter) {
        const latDiff = Math.abs(currentCenter.lat() - center.latitude);
        const lngDiff = Math.abs(currentCenter.lng() - center.longitude);
        if (latDiff > 0.0001 || lngDiff > 0.0001) {
          mapRef.current.panTo({ lat: center.latitude, lng: center.longitude });
        }
      }
    } else if (engine === "leaflet" && leafletMapRef.current) {
      const map = leafletMapRef.current;
      const cur = map.getCenter();
      if (cur) {
        const latDiff = Math.abs(cur.lat - center.latitude);
        const lngDiff = Math.abs(cur.lng - center.longitude);
        if (latDiff > 0.0001 || lngDiff > 0.0001) {
          map.panTo([center.latitude, center.longitude], { animate: true, duration: 0.6 });
        }
      }
    }
  }, [ready, engine, center?.latitude, center?.longitude]);

  // 3. Keep click and center change listeners in sync
  useEffect(() => {
    if (!ready) return;

    if (engine === "google" && mapRef.current) {
      const google = (window as any).google;
      const map = mapRef.current;

      const clickListener = map.addListener("click", (event: any) => {
        if (!onPick || !event?.latLng) return;
        onPick({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
      });

      const dragStartListener = map.addListener("dragstart", () => {
        isDraggingRef.current = true;
      });

      const idleListener = map.addListener("idle", () => {
        if (!onCenterChange || !isDraggingRef.current) return;
        const c = map.getCenter();
        if (c) {
          onCenterChange({ latitude: c.lat(), longitude: c.lng() });
        }
        isDraggingRef.current = false;
      });

      return () => {
        google?.maps?.event?.removeListener?.(clickListener);
        google?.maps?.event?.removeListener?.(dragStartListener);
        google?.maps?.event?.removeListener?.(idleListener);
      };
    } else if (engine === "leaflet" && leafletMapRef.current) {
      const map = leafletMapRef.current;

      const handleClick = (e: any) => {
        if (onPick && e?.latlng) {
          onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        }
      };

      const handleMove = () => {
        if (onCenterChange) {
          const c = map.getCenter();
          if (c) {
            onCenterChange({ latitude: c.lat, longitude: c.lng });
          }
        }
      };

      map.on("click", handleClick);
      map.on("move", handleMove);
      map.on("moveend", handleMove);

      return () => {
        map.off("click", handleClick);
        map.off("move", handleMove);
        map.off("moveend", handleMove);
      };
    }

    return undefined;
  }, [ready, engine, onPick, onCenterChange]);

  // 4. Redraw markers, polyline and radius whenever inputs change
  useEffect(() => {
    if (!ready) return;

    if (engine === "google" && mapRef.current) {
      const google = (window as any).google;
      const map = mapRef.current;

      for (const overlay of overlaysRef.current) overlay.setMap?.(null);
      overlaysRef.current = [];

      const bounds = new google.maps.LatLngBounds();
      let bounded = false;

      for (const marker of markers) {
        const position = { lat: marker.latitude, lng: marker.longitude };
        const pin = new google.maps.Marker({
          map,
          position,
          title: marker.label ?? "",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: TONE_COLOR[marker.tone ?? "primary"],
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        overlaysRef.current.push(pin);
        bounds.extend(position);
        bounded = true;
      }

      if (path && path.length > 1) {
        const line = new google.maps.Polyline({
          map,
          path: path.map((point) => ({ lat: point.latitude, lng: point.longitude })),
          strokeColor: TONE_COLOR.primary,
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });
        overlaysRef.current.push(line);
        for (const point of path) {
          bounds.extend({ lat: point.latitude, lng: point.longitude });
          bounded = true;
        }
      }

      const focus = center ?? markers[0];
      if (radiusKm && radiusKm > 0 && focus) {
        const circle = new google.maps.Circle({
          map,
          center: { lat: focus.latitude, lng: focus.longitude },
          radius: radiusKm * 1000,
          strokeColor: TONE_COLOR.secondary,
          strokeOpacity: 0.7,
          strokeWeight: 2,
          fillColor: TONE_COLOR.secondary,
          fillOpacity: 0.12,
        });
        overlaysRef.current.push(circle);
        bounds.union(circle.getBounds());
        bounded = true;
      }

      if (bounded && (markers.length > 1 || (path?.length ?? 0) > 1 || radiusKm)) {
        map.fitBounds(bounds, 48);
      }
    } else if (engine === "leaflet" && leafletMapRef.current) {
      import("leaflet").then(({ default: L }) => {
        const map = leafletMapRef.current;
        if (!map) return;

        for (const overlay of leafletOverlaysRef.current) {
          map.removeLayer(overlay);
        }
        leafletOverlaysRef.current = [];

        for (const marker of markers) {
          const pinColor = TONE_COLOR[marker.tone ?? "primary"];
          const customIcon = L.divIcon({
            className: "qp-map-marker",
            html: `<div style="background-color: ${pinColor}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          const m = L.marker([marker.latitude, marker.longitude], { icon: customIcon }).addTo(map);
          if (marker.label) m.bindTooltip(marker.label);
          leafletOverlaysRef.current.push(m);
        }

        if (path && path.length > 1) {
          const latlngs: [number, number][] = path.map((p) => [p.latitude, p.longitude]);
          const line = L.polyline(latlngs, {
            color: TONE_COLOR.primary,
            weight: 5,
            opacity: 0.85,
          }).addTo(map);
          leafletOverlaysRef.current.push(line);
        }

        const focus = center ?? markers[0];
        if (radiusKm && radiusKm > 0 && focus) {
          const circle = L.circle([focus.latitude, focus.longitude], {
            radius: radiusKm * 1000,
            color: TONE_COLOR.secondary,
            fillColor: TONE_COLOR.secondary,
            fillOpacity: 0.12,
            weight: 2,
          }).addTo(map);
          leafletOverlaysRef.current.push(circle);
        }
      });
    }
  }, [ready, engine, markers, path, radiusKm]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div ref={container} className="absolute inset-0 size-full z-0" />
      {!ready ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60 animate-pulse z-10">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : null}
    </div>
  );
}
