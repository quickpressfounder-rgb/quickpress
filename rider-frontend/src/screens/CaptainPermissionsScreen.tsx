import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  BellRing,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Navigation,
  Play,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Zap,
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
  requestAllCaptainPermissions,
  requestBackgroundLocationPermission,
  requestCameraPermission,
  requestIgnoreBatteryOptimization,
  requestOverlayPermission,
  setCaptainPermissionsCompleted,
  startBackgroundOrderRing,
  stopBackgroundOrderRing,
} from "../lib/captain-device-opt";
import {
  playOrderAlertSound,
  stopOrderAlertSound,
  triggerHaptic,
} from "../lib/captain-audio";

const BRAND_GUIDES = [
  {
    id: "xiaomi",
    name: "Xiaomi / Redmi / POCO",
    badge: "MIUI / HyperOS",
    steps: [
      "Open Settings ➔ Apps ➔ Manage Apps ➔ QuickPress Captain",
      "Turn ON 'Autostart' & 'Autostart in background'",
      "Go to Battery Saver ➔ Select 'No Restrictions'",
      "Enable 'Display pop-up windows while running in background'",
    ],
  },
  {
    id: "samsung",
    name: "Samsung Galaxy",
    badge: "One UI",
    steps: [
      "Open Settings ➔ Battery and Device Care ➔ Battery",
      "Tap 'Background usage limits' ➔ 'Never sleeping apps'",
      "Tap '+' and add 'QuickPress Captain'",
      "Turn OFF 'Put unused apps to sleep'",
    ],
  },
  {
    id: "vivo",
    name: "Vivo / iQOO",
    badge: "Funtouch OS",
    steps: [
      "Open Settings ➔ Battery ➔ High background power consumption ➔ Turn ON",
      "Go to App Manager ➔ Permissions ➔ Autostart ➔ Allow",
    ],
  },
  {
    id: "oppo",
    name: "Oppo / Realme / OnePlus",
    badge: "ColorOS / OxygenOS",
    steps: [
      "Open Settings ➔ Apps ➔ App Management ➔ QuickPress Captain",
      "Tap 'Battery usage' ➔ Allow background activity & Auto-launch",
      "Tap 'Display over other apps' ➔ Allow",
    ],
  },
];

export function CaptainPermissionsScreen() {
  const navigate = useNavigate();
  const isNative = isNativeAndroidApp();

  const [bgLocationGranted, setBgLocationGranted] = useState(false);
  const [batteryIgnored, setBatteryIgnored] = useState(false);
  const [overlaysAllowed, setOverlaysAllowed] = useState(false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

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

  const toggleSoundTest = () => {
    if (isTestingSound) {
      stopOrderAlertSound();
      stopBackgroundOrderRing();
      setIsTestingSound(false);
      toast.info("Order siren stopped");
    } else {
      triggerHaptic([100, 50, 100]);
      playOrderAlertSound();
      startBackgroundOrderRing("TEST-001", "₹75", "Kasganj Customer", "Kasganj Market Hub");
      setIsTestingSound(true);
      toast.success("⚡ Playing High-Priority Order Alarm Ringtone & Vibration", {
        description: "Testing emergency sound channels & lockscreen alert",
      });
    }
  };

  const handleGrantAll = () => {
    triggerHaptic(40);
    requestAllCaptainPermissions();
    requestIgnoreBatteryOptimization();
    requestOverlayPermission();
    openNotificationSettings();
    requestBackgroundLocationPermission();
    setTimeout(refreshPermissions, 1000);
  };

  // Clean up any test siren on unmount
  useEffect(() => {
    return () => {
      stopOrderAlertSound();
      stopBackgroundOrderRing();
    };
  }, []);

  const handleContinue = () => {
    stopOrderAlertSound();
    stopBackgroundOrderRing();
    setIsTestingSound(false);

    triggerHaptic([50, 50, 100]);
    setCaptainPermissionsCompleted();

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
        {/* Urgent Dispatch Sound & Vibration Test Banner */}
        <div className="rounded-2xl border-2 border-amber-300 bg-linear-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-colors ${
                  isTestingSound
                    ? "bg-amber-500 text-white animate-pulse"
                    : "bg-white text-amber-600 border border-amber-200"
                }`}
              >
                {isTestingSound ? (
                  <Volume2 className="size-6 animate-bounce" />
                ) : (
                  <BellRing className="size-5.5 text-amber-600" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
                  High-Priority Order Siren Test
                </h3>
                <p className="text-[11px] text-amber-800 font-semibold mt-0.5 leading-snug">
                  {isTestingSound
                    ? "Loud siren & vibration active. Tap stop to finish."
                    : "Test loud order alarm & background vibration"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleSoundTest}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer ${
                isTestingSound
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
              }`}
            >
              {isTestingSound ? (
                <>
                  <Square className="size-3.5 fill-current" />
                  <span>Stop Alarm</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5 fill-current" />
                  <span>Test Sound</span>
                </>
              )}
            </button>
          </div>
        </div>

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

        {/* 1-Click Grant All Critical Permissions */}
        <button
          type="button"
          onClick={handleGrantAll}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-3.5 shadow-sm active:scale-98 transition cursor-pointer"
        >
          <Zap className="size-4 stroke-[2.5]" />
          <span>Grant All Critical Permissions in 1 Click</span>
        </button>

        {/* Manufacturer Phone Battery Guides (MIUI, Samsung, Vivo, Oppo) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-slate-700" />
            <h4 className="text-xs font-black text-slate-900">
              Phone Battery Optimization Setup (Keep App Running in Background)
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Chinese Android phones (MIUI, Vivo, Oppo) background apps band kar dete hain. Apne phone model par tap karke settings follow karein:
          </p>

          <div className="space-y-1.5">
            {BRAND_GUIDES.map((brand) => {
              const isOpen = selectedBrand === brand.id;
              return (
                <div
                  key={brand.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 overflow-hidden transition"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedBrand(isOpen ? null : brand.id)}
                    className="w-full flex items-center justify-between p-2.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-100/80 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>{brand.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                        {brand.badge}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="size-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="size-4 text-slate-500" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 text-[11px] text-slate-600 space-y-1.5 border-t border-slate-100 bg-white">
                      {brand.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold text-amber-600">Step {idx + 1}:</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
