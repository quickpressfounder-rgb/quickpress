import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  BellRing,
  Camera,
  Check,
  CheckCircle2,
  ExternalLink,
  Layers,
  Navigation,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";

import {
  areNotificationsEnabled,
  canDrawOverlays,
  isBackgroundLocationGranted,
  isBatteryOptimizationIgnored,
  isCameraGranted,
  isLocationGranted,
  isNativeAndroidApp,
  openAppSettings,
  openNotificationSettings,
  requestBackgroundLocationPermission,
  requestCameraPermission,
  requestIgnoreBatteryOptimization,
  requestOverlayPermission,
} from "../lib/captain-device-opt";
import { triggerHaptic } from "../lib/captain-audio";

export function CaptainPermissionsScreen() {
  const navigate = useNavigate();
  const isNative = isNativeAndroidApp();

  const [bgLocationGranted, setBgLocationGranted] = useState(false);
  const [batteryIgnored, setBatteryIgnored] = useState(false);
  const [overlaysAllowed, setOverlaysAllowed] = useState(false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const refreshPermissions = useCallback(() => {
    // 1. Native bridge / Sync checks
    const bgLoc = isBackgroundLocationGranted() || isLocationGranted();
    const battery = isBatteryOptimizationIgnored();
    const overlays = canDrawOverlays();
    const notifs = areNotificationsEnabled();
    const cam = isCameraGranted();

    setBgLocationGranted(bgLoc);
    setBatteryIgnored(battery);
    setOverlaysAllowed(overlays);
    setNotificationsAllowed(notifs);
    setCameraAllowed(cam);

    // 2. Web Permissions API fallback checks (browser/PWA environment)
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      if (!bgLoc) {
        navigator.permissions
          .query({ name: "geolocation" as any })
          .then((res) => {
            if (res.state === "granted") setBgLocationGranted(true);
          })
          .catch(() => {});
      }
      if (!notifs) {
        navigator.permissions
          .query({ name: "notifications" as any })
          .then((res) => {
            if (res.state === "granted") setNotificationsAllowed(true);
          })
          .catch(() => {});
      }
      if (!cam) {
        navigator.permissions
          .query({ name: "camera" as any })
          .then((res) => {
            if (res.state === "granted") setCameraAllowed(true);
          })
          .catch(() => {});
      }
    }
  }, []);

  // Live polling every 800ms + focus/visibility/resume listeners
  useEffect(() => {
    refreshPermissions();

    const handleActive = () => {
      refreshPermissions();
    };

    window.addEventListener("focus", handleActive);
    document.addEventListener("visibilitychange", handleActive);
    document.addEventListener("resume", handleActive);

    const interval = setInterval(refreshPermissions, 800);

    return () => {
      window.removeEventListener("focus", handleActive);
      document.removeEventListener("visibilitychange", handleActive);
      document.removeEventListener("resume", handleActive);
      clearInterval(interval);
    };
  }, [refreshPermissions]);

  const totalSteps = 5;
  const grantedCount = [
    batteryIgnored,
    overlaysAllowed,
    bgLocationGranted,
    notificationsAllowed,
    cameraAllowed,
  ].filter(Boolean).length;

  const allGranted = grantedCount === totalSteps;
  const progressPercent = Math.round((grantedCount / totalSteps) * 100);

  // Trigger next ungranted permission
  const handleTriggerFirstUngranted = () => {
    triggerHaptic(30);
    if (!batteryIgnored) {
      requestIgnoreBatteryOptimization();
      toast.info("Allow 'Ignore Battery Optimization' so app can run in background.");
    } else if (!overlaysAllowed) {
      requestOverlayPermission();
      toast.info("Turn ON 'Display over other apps' to receive instant ride alerts.");
    } else if (!bgLocationGranted) {
      requestBackgroundLocationPermission();
      toast.info("Allow 'Precise Location' for live order dispatch.");
    } else if (!notificationsAllowed) {
      openNotificationSettings();
      toast.info("Enable notifications for loud incoming order sirens.");
    } else if (!cameraAllowed) {
      requestCameraPermission();
      toast.info("Allow camera access for doorstep intake & delivery proof.");
    }
    setTimeout(refreshPermissions, 1000);
  };

  const handleContinue = () => {
    if (!allGranted) {
      toast.error("आगे बढ़ने के लिए कृपया सभी 5 परमिशन्स Allow करें!");
      handleTriggerFirstUngranted();
      return;
    }

    triggerHaptic([50, 50, 100]);
    try {
      localStorage.setItem("qp_captain_permissions_allowed", "1");
    } catch {}

    setShowSuccessModal(true);
    setTimeout(() => {
      navigate({ to: "/dashboard", replace: true });
    }, 1200);
  };

  return (
    <div
      className="min-h-screen bg-[#F6F7F9] pb-32 text-slate-900 select-none font-sans"
      style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 8px), 44px)" }}
    >
      {/* 1. Clean Top App Header (Notch Safe, Single Header) */}
      <header className="sticky top-0 z-30 bg-[#F6F7F9] border-b border-slate-200/80 px-4 pb-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (allGranted) {
                  navigate({ to: "/dashboard" });
                } else {
                  toast.info("Duty shuru karne ke liye sari permissions allow karein");
                }
              }}
              className="flex size-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5 stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-950 leading-tight">
                Duty Permissions
              </h1>
              <p className="text-[11px] font-semibold text-slate-500">
                QuickPress Captain Device Setup
              </p>
            </div>
          </div>

          {/* Direct System App Settings Shortcut */}
          <button
            type="button"
            onClick={openAppSettings}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition shadow-2xs cursor-pointer"
            title="Open Phone Settings"
          >
            <Settings className="size-3.5 text-slate-600" />
            <span>Settings</span>
          </button>
        </div>

        {/* 2. Duty Readiness Card */}
        <div className="mx-auto max-w-lg mt-3 bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Duty Readiness:</span>
              <span className="font-black text-slate-950 font-mono">
                {grantedCount} of {totalSteps} Allowed
              </span>
            </div>
            {allGranted ? (
              <span className="flex items-center gap-1 font-bold text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Check className="size-3 stroke-[3]" />
                <span>Road Ready</span>
              </span>
            ) : (
              <span className="font-mono font-black text-amber-600 text-[11px]">
                {progressPercent}%
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allGranted ? "bg-emerald-500" : "bg-amber-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* 3. Clean Permissions List (Direct Redirects on Click) */}
      <main className="mx-auto max-w-lg px-4 pt-3 space-y-2.5">
        {/* Permission 1: Battery Usage */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs transition-colors ${
              batteryIgnored ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              <BatteryCharging className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Battery Usage (No Sleep)
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">
                App background me bina freeze hue chalta rahe
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {batteryIgnored ? (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                <Check className="size-3.5 stroke-[3]" />
                <span>Allowed</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  requestIgnoreBatteryOptimization();
                  setTimeout(refreshPermissions, 1000);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Permission 2: Display Over Other Apps */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs transition-colors ${
              overlaysAllowed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              <Layers className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Display Over Other Apps
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">
                Google Maps ke upar order alert aur popup dikhane ke liye
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {overlaysAllowed ? (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                <Check className="size-3.5 stroke-[3]" />
                <span>Allowed</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  requestOverlayPermission();
                  setTimeout(refreshPermissions, 1000);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Permission 3: Background Location (GPS) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs transition-colors ${
              bgLocationGranted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              <Navigation className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Location Access (GPS)
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">
                Nearest orders assign karne aur live tracking ke liye
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {bgLocationGranted ? (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                <Check className="size-3.5 stroke-[3]" />
                <span>Allowed</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  requestBackgroundLocationPermission();
                  setTimeout(refreshPermissions, 1000);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Permission 4: Order Alerts & Siren (Notifications) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs transition-colors ${
              notificationsAllowed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              <BellRing className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Order Alerts & Loud Ringtone
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">
                Naye trip offers par loud siren ringtone aur vibration ke liye
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {notificationsAllowed ? (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                <Check className="size-3.5 stroke-[3]" />
                <span>Allowed</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  openNotificationSettings();
                  setTimeout(refreshPermissions, 1000);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Permission 5: Camera Access */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-2xs transition-colors ${
              cameraAllowed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
            }`}>
              <Camera className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Camera Access
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">
                Pickup par kapdo ki photo aur delivery proof verification ke liye
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {cameraAllowed ? (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                <Check className="size-3.5 stroke-[3]" />
                <span>Allowed</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  requestCameraPermission();
                  setTimeout(refreshPermissions, 1000);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>
      </main>

      {/* 4. Sticky Bottom Action Bar (Strict Permission Gate) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3.5 shadow-xl">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-950 truncate">
              {allGranted ? "✓ Sabhi 5 permissions allowed hain" : `${grantedCount} of ${totalSteps} permissions allowed`}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {allGranted ? "Phone duty ke liye ready hai" : "Bina allow kiye aage nahi badh sakte"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className={`flex items-center gap-1.5 rounded-2xl px-5 py-3 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer ${
              allGranted
                ? "bg-amber-400 hover:bg-amber-300 text-slate-950"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
            }`}
          >
            <span>{allGranted ? "Continue to Duty" : `Allow All (${grantedCount}/5)`}</span>
            <ArrowRight className="size-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 5. App Permissions Given Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl text-center space-y-3 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="size-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
              <Check className="size-8 stroke-[3.5]" />
            </div>
            <h3 className="text-base font-black text-slate-950">
              Permissions Granted!
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Captain phone is now 100% ready for orders!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
