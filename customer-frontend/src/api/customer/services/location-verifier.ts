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
    "Acquiring Real Device GPS…",
    "Connecting to satellite and cellular triangulation…",
    "Live GPS Triangulation"
  );

  const startTime = Date.now();
  let location: SavedLocation | null = null;

  try {
    location = await detectDeviceLocation({
      timeoutMs: options.timeoutMs ?? 3500,
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
    `Checking QuickPress in ${cityName}…`,
    "Verifying operational cities and active partner network in Admin Panel…",
    "Admin Network Verification"
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
      `QuickPress is Live in ${cityName}!`,
      "Loading verified laundry care partners…",
      "City Operational"
    );
  } else {
    notify(
      `Service Not Yet in ${cityName}`,
      "Redirecting to coverage and waitlist updates…",
      "Coverage Pending"
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
    label: `Verifying ${cityName}…`,
    sublabel: "Checking operating partner hubs and live delivery coverage in Admin Panel…",
    statusBadge: "Admin City Check",
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
      label: `QuickPress is Live in ${cityName}!`,
      sublabel: "Opening services…",
      statusBadge: "Operational",
    });
  } else {
    options.onProgress?.({
      label: `Not Operating in ${cityName}`,
      sublabel: "Redirecting to coverage details…",
      statusBadge: "Coverage Pending",
    });
  }

  await new Promise((r) => setTimeout(r, 500));

  return {
    available: isAvailable,
    location,
  };
}

