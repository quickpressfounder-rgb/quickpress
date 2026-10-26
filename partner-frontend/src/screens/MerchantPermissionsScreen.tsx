import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  BellRing,
  Camera,
  Check,
  Layers,
  MapPin,
  Smartphone,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  areNotificationsEnabled,
  canDrawOverlays,
  isBatteryOptimizationIgnored,
  isCameraGranted,
  isLocationGranted,
  openAppSettings,
  openNotificationSettings,
  requestCameraPermission,
  requestIgnoreBatteryOptimization,
  requestLocationPermission,
  requestOverlayPermission,
  hasCompletedPermissionsOnboarding,
  setPermissionsOnboardingCompleted,
} from "../lib/merchant-device-opt";
import {
  startPartnerOrderAlertRing,
  stopPartnerOrderAlertRing,
} from "../lib/partner-order-alert-sound";
import { partnerRoutes } from "../navigation/partner-routes";

const STORAGE_KEYS = {
  battery: "qp_perm_battery",
  notifications: "qp_perm_notifications",
  overlay: "qp_perm_overlay",
  location: "qp_perm_location",
  camera: "qp_perm_camera",
};

export function MerchantPermissionsScreen() {
  const navigate = useNavigate();

  const [batteryIgnored, setBatteryIgnored] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        isBatteryOptimizationIgnored() ||
        localStorage.getItem(STORAGE_KEYS.battery) === "true"
      );
    }
    return false;
  });

  const [notificationsAllowed, setNotificationsAllowed] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        areNotificationsEnabled() ||
        localStorage.getItem(STORAGE_KEYS.notifications) === "true"
      );
    }
    return false;
  });

  const [overlaysAllowed, setOverlaysAllowed] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        canDrawOverlays() ||
        localStorage.getItem(STORAGE_KEYS.overlay) === "true"
      );
    }
    return false;
  });

  const [locationAllowed, setLocationAllowed] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        isLocationGranted() ||
        localStorage.getItem(STORAGE_KEYS.location) === "true"
      );
    }
    return false;
  });

  const [cameraAllowed, setCameraAllowed] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        isCameraGranted() ||
        localStorage.getItem(STORAGE_KEYS.camera) === "true"
      );
    }
    return false;
  });

  const [isTestingSound, setIsTestingSound] = useState(false);

  // Sync actual OS permission state if granted outside the app
  const syncWithDevice = () => {
    if (isBatteryOptimizationIgnored()) {
      setBatteryIgnored(true);
      localStorage.setItem(STORAGE_KEYS.battery, "true");
    }
    if (areNotificationsEnabled()) {
      setNotificationsAllowed(true);
      localStorage.setItem(STORAGE_KEYS.notifications, "true");
    }
    if (canDrawOverlays()) {
      setOverlaysAllowed(true);
      localStorage.setItem(STORAGE_KEYS.overlay, "true");
    }
    if (isLocationGranted()) {
      setLocationAllowed(true);
      localStorage.setItem(STORAGE_KEYS.location, "true");
    }
    if (isCameraGranted()) {
      setCameraAllowed(true);
      localStorage.setItem(STORAGE_KEYS.camera, "true");
    }
  };

  useEffect(() => {
    syncWithDevice();
    const handleFocus = () => syncWithDevice();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  // Auto-redirect to dashboard if all permissions are already allowed
  useEffect(() => {
    const isManualManage =
      typeof window !== "undefined" &&
      window.location.search.includes("manage=true");
    if (!isManualManage) {
      const allGranted =
        batteryIgnored &&
        notificationsAllowed &&
        overlaysAllowed &&
        locationAllowed &&
        cameraAllowed;
      if (allGranted || hasCompletedPermissionsOnboarding()) {
        setPermissionsOnboardingCompleted();
        navigate({ to: partnerRoutes.dashboard, replace: true });
      }
    }
  }, [
    batteryIgnored,
    notificationsAllowed,
    overlaysAllowed,
    locationAllowed,
    cameraAllowed,
    navigate,
  ]);

  // Instant action handlers that update state immediately & trigger native/browser API
  const handleAllowBattery = () => {
    setBatteryIgnored(true);
    localStorage.setItem(STORAGE_KEYS.battery, "true");
    toast.success("Battery optimization disabled for instant order alerts");
    try {
      requestIgnoreBatteryOptimization();
    } catch {}
  };

  const handleAllowNotifications = () => {
    setNotificationsAllowed(true);
    localStorage.setItem(STORAGE_KEYS.notifications, "true");
    toast.success("Order siren & push notifications enabled");
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        Notification.requestPermission();
      }
      openNotificationSettings();
    } catch {}
  };

  const handleAllowOverlay = () => {
    setOverlaysAllowed(true);
    localStorage.setItem(STORAGE_KEYS.overlay, "true");
    toast.success("Order screen popup overlay enabled");
    try {
      requestOverlayPermission();
    } catch {}
  };

  const handleAllowLocation = () => {
    setLocationAllowed(true);
    localStorage.setItem(STORAGE_KEYS.location, "true");
    toast.success("Store GPS location enabled for captains");
    try {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {},
          () => {},
          { timeout: 5000 }
        );
      }
      requestLocationPermission();
    } catch {}
  };

  const handleAllowCamera = () => {
    setCameraAllowed(true);
    localStorage.setItem(STORAGE_KEYS.camera, "true");
    toast.success("Camera enabled for tag scanning");
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true }).catch(() => {});
      }
      requestCameraPermission();
    } catch {}
  };

  const handleToggleSoundTest = () => {
    if (isTestingSound) {
      stopPartnerOrderAlertRing();
      setIsTestingSound(false);
      toast.info("Audio test stopped.");
    } else {
      setIsTestingSound(true);
      startPartnerOrderAlertRing();
      toast.success("Playing store order alert chime...");
      setTimeout(() => {
        stopPartnerOrderAlertRing();
        setIsTestingSound(false);
      }, 5000);
    }
  };

  const handleContinue = () => {
    stopPartnerOrderAlertRing();
    setPermissionsOnboardingCompleted();
    navigate({ to: partnerRoutes.dashboard });
  };

  const permissionItems = [
    {
      id: "battery",
      title: "Background Battery Access",
      description: "Keep app active to receive new orders instantly even when phone screen is off.",
      icon: BatteryCharging,
      isAllowed: batteryIgnored,
      onAllow: handleAllowBattery,
    },
    {
      id: "notifications",
      title: "Order Siren & Notifications",
      description: "Play loud commercial ringtone and show push alerts for instant order dispatch.",
      icon: BellRing,
      isAllowed: notificationsAllowed,
      onAllow: handleAllowNotifications,
    },
    {
      id: "overlay",
      title: "Display Over Other Apps",
      description: "Show instant order popup over WhatsApp or other apps when a new order arrives.",
      icon: Layers,
      isAllowed: overlaysAllowed,
      onAllow: handleAllowOverlay,
    },
    {
      id: "location",
      title: "Store GPS Location",
      description: "Share store location with delivery captains for hassle-free customer pickups.",
      icon: MapPin,
      isAllowed: locationAllowed,
      onAllow: handleAllowLocation,
    },
    {
      id: "camera",
      title: "Camera & Tag Scanning",
      description: "Scan garment QR tags and capture defect photos during intake and dispatch.",
      icon: Camera,
      isAllowed: cameraAllowed,
      onAllow: handleAllowCamera,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-950 pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-200 px-4 py-3.5">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                stopPartnerOrderAlertRing();
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  handleContinue();
                }
              }}
              className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:scale-95 transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-950">
                Device Permissions & Alerts
              </h1>
              <p className="text-xs text-zinc-500">
                Configure background alerts for new incoming orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAppSettings}
              title="Open Device Settings"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 active:scale-95 transition cursor-pointer"
            >
              <Smartphone className="size-3.5" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="text-xs font-bold text-zinc-900 hover:text-black px-2 py-1 cursor-pointer"
            >
              Skip
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-2xl px-4 pt-5 space-y-4">
        {/* Permission Cards List */}
        <div className="space-y-3">
          {permissionItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                      item.isAllowed
                        ? "bg-zinc-100 text-zinc-900 border-zinc-200"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-zinc-950 truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {item.isAllowed ? (
                    <button
                      type="button"
                      onClick={item.onAllow}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 cursor-pointer active:scale-95 transition-all"
                      title="Permission enabled"
                    >
                      <Check className="size-3.5" />
                      <span>Allowed</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={item.onAllow}
                      className="rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-black active:scale-95 transition-all shadow-xs cursor-pointer"
                    >
                      Allow
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ringtone Audio Test Card */}
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900">
              <Volume2 className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">
                Test Order Ringtone
              </h3>
              <p className="text-xs text-zinc-500">
                Check commercial alert sound and vibration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSoundTest}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${
              isTestingSound
                ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                : "bg-zinc-950 text-white hover:bg-black active:scale-95"
            }`}
          >
            {isTestingSound ? (
              <>
                <VolumeX className="size-3.5" />
                <span>Stop Sound</span>
              </>
            ) : (
              <>
                <Volume2 className="size-3.5" />
                <span>Test Chime</span>
              </>
            )}
          </button>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 px-4 py-3.5 shadow-md">
        <div className="mx-auto max-w-2xl flex items-center justify-end">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-black active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
