import { useEffect, useState, useRef } from "react";
import { pushRiderLocation } from "../api/rider/rider-dashboard-api";

export interface RiderLocationState {
  lat: number | null;
  lng: number | null;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  isTracking: boolean;
  error: string | null;
  lastUpdated: string | null;
}

/**
 * 📍 Real-time GPS Location Ping & Tracking for Delivery Partner.
 * Automatically tracks GPS coordinates and pings the backend every 15s when Online.
 */
export function useRiderLocation(isOnline: boolean): RiderLocationState {
  const [state, setState] = useState<RiderLocationState>({
    lat: null,
    lng: null,
    speed: null,
    heading: null,
    accuracy: null,
    isTracking: false,
    error: null,
    lastUpdated: null,
  });

  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOnline || typeof window === "undefined" || !("geolocation" in navigator)) {
      setState((prev) => ({ ...prev, isTracking: false }));
      return;
    }

    let isSubscribed = true;

    const handleSuccess = async (pos: GeolocationPosition) => {
      if (!isSubscribed) return;
      const { latitude, longitude, speed, heading, accuracy } = pos.coords;

      lastCoordsRef.current = { lat: latitude, lng: longitude };
      setState({
        lat: latitude,
        lng: longitude,
        speed,
        heading,
        accuracy,
        isTracking: true,
        error: null,
        lastUpdated: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });

      // Push real GPS ping to Supabase
      try {
        const isMock = Boolean(
          (pos.coords as any).isMock ||
          (pos as any).isMock ||
          (pos.coords as any).isFromMockProvider ||
          (pos.coords as any).mocked
        );
        await pushRiderLocation(latitude, longitude, {
          isMock,
          heading,
          speed,
          accuracy,
        });
      } catch {
        /* ignore network jitter */
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      if (!isSubscribed) return;
      setState((prev) => ({
        ...prev,
        isTracking: false,
        error: err.message || "GPS location unavailable",
      }));
    };

    // 1. Initial immediate location check
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    // 2. Continuous position watching
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 20000,
    });

    // 3. Fallback 15-second heartbeat ping
    const intervalId = setInterval(() => {
      if (lastCoordsRef.current) {
        void pushRiderLocation(lastCoordsRef.current.lat, lastCoordsRef.current.lng).catch(
          () => undefined
        );
      }
    }, 15000);

    return () => {
      isSubscribed = false;
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, [isOnline]);

  return state;
}
