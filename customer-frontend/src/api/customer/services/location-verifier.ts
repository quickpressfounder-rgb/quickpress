import { detectDeviceLocation, saveLocation, type SavedLocation, GeoError } from "../location";
import { checkLocationAvailability } from "./partner-service";

export type LocationDetectionState = {
  active: boolean;
  label: string;
  sublabel: string;
  statusBadge: string;
};

/**
 * Detects real-time device GPS coordinates and verifies with the Admin Panel live cities.
 * Displays smooth radar concentric wave animation without any lag or crash.
 */
export async function detectAndVerifyLiveLocation(options: {
  onProgress?: (state: { label: string; sublabel: string; statusBadge: string }) => void;
  timeoutMs?: number;
} = {}): Promise<{
  success: boolean;
  available: boolean;
  location: SavedLocation | null;
  error?: string;
}> {
  const notify = (label: string, sublabel: string, statusBadge: string) => {
    options.onProgress?.({ label, sublabel, statusBadge });
  };

  notify(
    "Fetching your location…",
    "Pinpointing your address",
    ""
  );

  const startTime = Date.now();
  let location: SavedLocation | null = null;

  try {
    location = await detectDeviceLocation({
      timeoutMs: options.timeoutMs ?? 9000,
      allowFallback: true,
    });
  } catch (err: any) {
    const errorMsg =
      err instanceof GeoError
        ? err.message
        : "Unable to detect your device GPS. Please check location permissions.";
    return { success: false, available: false, location: null, error: errorMsg };
  }

  // Ensure smooth visual duration for radar wave animation
  const elapsedGps = Date.now() - startTime;
  if (elapsedGps < 650) {
    await new Promise((r) => setTimeout(r, 650 - elapsedGps));
  }

  const cityName = location.city || location.area || "your area";
  notify(
    `Locating ${cityName}…`,
    "Confirming service coverage",
    ""
  );

  saveLocation(location);

  let isAvailable = false;
  try {
    const availResult = await checkLocationAvailability(location);
    isAvailable = Boolean(availResult && availResult.available);
  } catch {
    isAvailable = false;
  }

  if (isAvailable) {
    notify(
      `${cityName}`,
      "Location confirmed",
      ""
    );
  } else {
    notify(
      `${cityName}`,
      "Location confirmed",
      ""
    );
  }

  await new Promise((r) => setTimeout(r, 550));

  return {
    success: true,
    available: isAvailable,
    location,
  };
}

/**
 * Verifies any explicitly selected address or place against Admin Panel live cities.
 */
export async function verifySelectedLocation(
  location: SavedLocation,
  options: {
    onProgress?: (state: { label: string; sublabel: string; statusBadge: string }) => void;
  } = {}
): Promise<{
  available: boolean;
  location: SavedLocation;
}> {
  const cityName = location.city || location.area || "selected location";
  options.onProgress?.({
    label: `Fetching ${cityName}…`,
    sublabel: "Confirming your delivery spot",
    statusBadge: "",
  });

  saveLocation(location);

  const startTime = Date.now();
  let isAvailable = false;
  try {
    const availResult = await checkLocationAvailability(location);
    isAvailable = Boolean(availResult && availResult.available);
  } catch {
    isAvailable = false;
  }

  const elapsed = Date.now() - startTime;
  if (elapsed < 500) {
    await new Promise((r) => setTimeout(r, 500 - elapsed));
  }

  if (isAvailable) {
    options.onProgress?.({
      label: `${cityName}`,
      sublabel: "Location confirmed",
      statusBadge: "",
    });
  } else {
    options.onProgress?.({
      label: `${cityName}`,
      sublabel: "Location confirmed",
      statusBadge: "",
    });
  }

  await new Promise((r) => setTimeout(r, 500));

  return {
    available: isAvailable,
    location,
  };
}

