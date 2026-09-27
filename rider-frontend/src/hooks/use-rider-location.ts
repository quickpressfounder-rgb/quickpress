import { useEffect, useState } from "react";
import { riderLocationEngine, type RiderLocationData } from "@/lib/rider-location-service";

export type RiderLocationState = RiderLocationData;

/**
 * 📍 High-Performance 120 FPS GPS Location Hook for Delivery Partner.
 * Powered by singleton RiderLocationEngine with hardware RAF scheduling,
 * stationary drift suppression, and throttled bridge dispatches.
 */
export function useRiderLocation(isOnline: boolean): RiderLocationState {
  const [state, setState] = useState<RiderLocationState>(() =>
    riderLocationEngine.getCurrentLocation()
  );

  useEffect(() => {
    riderLocationEngine.setOnline(isOnline);
    const unsubscribe = riderLocationEngine.subscribe((data) => {
      setState(data);
    });

    return () => {
      unsubscribe();
    };
  }, [isOnline]);

  return state;
}
