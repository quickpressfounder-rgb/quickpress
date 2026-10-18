import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  BellRing,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Headphones,
  HelpCircle,
  Layers,
  MapPin,
  MessageSquare,
  Navigation,
  Power,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  areNotificationsEnabled,
  canDrawOverlays,
  isBackgroundLocationGranted,
  isBatteryOptimizationIgnored,
  isCameraGranted,
  isFloatingBubbleRunning,
  isLocationGranted,
  isNativeAndroidApp,
  openAppSettings,
  openNotificationSettings,
  requestBackgroundLocationPermission,
  requestCameraPermission,
  requestIgnoreBatteryOptimization,
  requestOverlayPermission,
  startFloatingBubble,
  stopFloatingBubble,
} from "../lib/captain-device-opt";
import {
  playOrderAlertSound,
  stopOrderAlertSound,
  triggerHaptic,
  unlockAudioContext,
} from "../lib/captain-audio";

export function CaptainPermissionsScreen() {
  const navigate = useNavigate();
  const isNative = isNativeAndroidApp();

  const [bgLocationGranted, setBgLocationGranted] = useState(false);
  const [batteryIgnored, setBatteryIgnored] = useState(false);
  const [overlaysAllowed, setOverlaysAllowed] = useState(false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [isBubbleActive, setIsBubbleActive] = useState(false);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const refreshPermissions = () => {
    setBgLocationGranted(isBackgroundLocationGranted());
    setBatteryIgnored(isBatteryOptimizationIgnored());
    setOverlaysAllowed(canDrawOverlays());
    setNotificationsAllowed(areNotificationsEnabled());
    setCameraAllowed(isCameraGranted());
    setIsBubbleActive(isFloatingBubbleRunning());
  };

  useEffect(() => {
    refreshPermissions();

    const handleFocus = () => {
      refreshPermissions();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const totalSteps = 5;
  const grantedCount = [
    bgLocationGranted,
    batteryIgnored,
    overlaysAllowed,
    notificationsAllowed,
    cameraAllowed,
  ].filter(Boolean).length;

  const allGranted = grantedCount === totalSteps;
  const progressPercent = Math.round((grantedCount / totalSteps) * 100);

  const handleToggleSoundTest = () => {
    unlockAudioContext();
    if (isTestingSound) {
      stopOrderAlertSound();
      setIsTestingSound(false);
      toast.info("Audio test stopped.");
    } else {
      setIsTestingSound(true);
      playOrderAlertSound();
      triggerHaptic([300, 100, 300, 100, 500]);
      toast.success("Playing high-decibel captain dispatch siren...");
      setTimeout(() => {
        stopOrderAlertSound();
        setIsTestingSound(false);
      }, 5000);
    }
  };

  const handleTestFloatingBubble = () => {
    if (!overlaysAllowed) {
      toast.error("Please allow 'Display Over Google Maps' permission first!");
      requestOverlayPermission();
      return;
    }
    if (isBubbleActive) {
      stopFloatingBubble();
      setIsBubbleActive(false);
      toast.info("Floating Bubble hidden.");
    } else {
      startFloatingBubble();
      setIsBubbleActive(true);
      toast.success("⚡ Rapido-style Floating Bubble is now active! Tap it anytime to return to app.");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-36 text-slate-950 select-none font-sans">
      {/* 1. Top Navigation Bar (White, Left Arrow + Right Help Pill) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            stopOrderAlertSound();
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate({ to: "/dashboard" });
            }
          }}
          className="flex size-9 items-center justify-center rounded-full text-slate-900 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 stroke-[2.5]" />
        </button>

        {/* Right Help Pill Button (Matching Screenshot 3) */}
        <button
          type="button"
          onClick={openAppSettings}
          className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-50 active:scale-95 transition shadow-2xs cursor-pointer"
        >
          <Headphones className="size-3.5 text-slate-800 stroke-[2.2]" />
          <span>Help</span>
        </button>
      </header>

      {/* 2. Blue Header Banner (Matching Screenshot 3) */}
      <div className="bg-[#1E56B3] text-white px-5 py-4 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
            Give all permissions to proceed
          </h1>
          <p className="text-xs text-blue-100 mt-0.5 font-medium">
            Zomato Rider & Rapido Captain style live GPS, bubble & ringtone
          </p>
        </div>
        <div className="size-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0">
          <Zap className="size-5 fill-amber-300 text-amber-300" />
        </div>
      </div>

      {/* 3. Duty Readiness Progress Bar with Yellow Visual Accent */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Duty Readiness:</span>
          <span className="font-black text-slate-950">
            {grantedCount} of {totalSteps} Allowed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 sm:w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-mono font-black text-amber-600 text-[11px]">
            {progressPercent}%
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-lg px-4 pt-3 space-y-3">
        {/* Permission Item 1: Battery Usage */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 transition-all shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-200/80 shadow-2xs">
              <BatteryCharging className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Battery Usage
              </h3>
              <p className="text-xs text-slate-600 font-semibold leading-snug mt-0.5">
                Helps app run in background
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {batteryIgnored ? (
              <div className="flex size-7 items-center justify-center rounded-full bg-[#1E56B3] text-white shadow-xs">
                <Check className="size-4 stroke-[3]" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  requestIgnoreBatteryOptimization();
                  setTimeout(refreshPermissions, 1500);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Permission Item 2: Display Over Other Apps */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 transition-all shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-200/80 shadow-2xs">
              <Layers className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Display over other apps
              </h3>
              <p className="text-xs text-slate-600 font-semibold leading-snug mt-0.5">
                Permit app to display on top of other apps to get rides alerts
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {overlaysAllowed ? (
              <div className="flex size-7 items-center justify-center rounded-full bg-[#1E56B3] text-white shadow-xs">
                <Check className="size-4 stroke-[3]" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  requestOverlayPermission();
                  setTimeout(refreshPermissions, 1500);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Permission Item 3: Background Location */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 transition-all shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-200/80 shadow-2xs">
              <Navigation className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Background Location
              </h3>
              <p className="text-xs text-slate-600 font-semibold leading-snug mt-0.5">
                Helps dispatch server track live GPS for active orders
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {bgLocationGranted ? (
              <div className="flex size-7 items-center justify-center rounded-full bg-[#1E56B3] text-white shadow-xs">
                <Check className="size-4 stroke-[3]" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  requestBackgroundLocationPermission();
                  setTimeout(refreshPermissions, 1500);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Permission Item 4: Loud Order Alerts (Notifications) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 transition-all shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-200/80 shadow-2xs">
              <BellRing className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Order Alerts & Loud Ringtone
              </h3>
              <p className="text-xs text-slate-600 font-semibold leading-snug mt-0.5">
                Plays loud audio siren & bike vibration on new trip offers
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {notificationsAllowed ? (
              <div className="flex size-7 items-center justify-center rounded-full bg-[#1E56B3] text-white shadow-xs">
                <Check className="size-4 stroke-[3]" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  openNotificationSettings();
                  setTimeout(refreshPermissions, 1500);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Permission Item 5: Camera Access */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 transition-all shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 border border-amber-200/80 shadow-2xs">
              <Camera className="size-5.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-950 truncate">
                Camera Access
              </h3>
              <p className="text-xs text-slate-600 font-semibold leading-snug mt-0.5">
                Doorstep intake photos & customer drop proof verification
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {cameraAllowed ? (
              <div className="flex size-7 items-center justify-center rounded-full bg-[#1E56B3] text-white shadow-xs">
                <Check className="size-4 stroke-[3]" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  requestCameraPermission();
                  setTimeout(refreshPermissions, 1500);
                }}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-4 py-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>

        {/* Interactive Features: Siren Tester & Floating Bubble */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleToggleSoundTest}
            className={`p-3 rounded-2xl border text-center transition-all active:scale-95 shadow-2xs cursor-pointer flex flex-col items-center justify-center gap-1 ${
              isTestingSound
                ? "bg-red-50 border-red-300 text-red-700 animate-pulse"
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <div className="size-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              {isTestingSound ? <VolumeX className="size-4 text-red-600" /> : <Volume2 className="size-4" />}
            </div>
            <span className="text-xs font-black">
              {isTestingSound ? "Stop Siren" : "Test Loud Siren"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Check audio alert</span>
          </button>

          <button
            type="button"
            onClick={handleTestFloatingBubble}
            className={`p-3 rounded-2xl border text-center transition-all active:scale-95 shadow-2xs cursor-pointer flex flex-col items-center justify-center gap-1 ${
              isBubbleActive
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <div className="size-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <span className="text-xs font-black">
              {isBubbleActive ? "Hide Bubble" : "Test Floating Bubble"}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Rapido Captain icon</span>
          </button>
        </div>

        {/* OEM Background Autostart Help Footnote */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center space-y-1">
          <p className="text-xs font-bold text-amber-950">
            Using Xiaomi, Vivo, Oppo or Realme?
          </p>
          <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
            Phone Settings ➔ Apps ➔ QuickPress Captain ➔ Turn ON "Autostart" & "Allow background activity".
          </p>
          <button
            type="button"
            onClick={openAppSettings}
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 pt-0.5 cursor-pointer"
          >
            <span>Open Android App Settings</span>
            <ExternalLink className="size-3" />
          </button>
        </div>
      </main>

      {/* 4. Sticky Bottom Action Bar (Pure White Background, Black Text, Yellow Button) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-3 shadow-xl">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-950 truncate">
              {allGranted ? "✓ 5 of 5 permissions allowed" : `${grantedCount} of ${totalSteps} permissions allowed`}
            </p>
            <p className="text-[10px] text-slate-500 font-semibold">
              {allGranted ? "Phone is 100% road-ready" : "Remaining can be enabled anytime"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              stopOrderAlertSound();
              try {
                localStorage.setItem("qp_captain_permissions_allowed", "1");
              } catch {}
              if (allGranted) {
                setShowSuccessModal(true);
                setTimeout(() => navigate({ to: "/dashboard" }), 1400);
              } else {
                navigate({ to: "/dashboard" });
              }
            }}
            className="flex items-center gap-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>Continue to Duty</span>
            <ArrowRight className="size-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 5. "App Permissions Given" Popup Modal (Matching Screenshot 3) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl text-center space-y-3 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="size-20 rounded-full bg-[#107C41] text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
              <Check className="size-10 stroke-[3.5]" />
            </div>
            <h3 className="text-base font-black text-slate-950">
              App Permissions Given
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Captain phone is ready to receive orders!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
