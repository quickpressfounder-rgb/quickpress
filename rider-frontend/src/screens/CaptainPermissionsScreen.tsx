import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  BellRing,
  Camera,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
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
    <div className="min-h-screen bg-neutral-900 pb-36 text-white select-none">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/95 px-4 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
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
            className="flex size-9.5 items-center justify-center rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 active:scale-95 transition cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">
                Captain Duty Permissions
              </h1>
              <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                Pro Rider
              </span>
            </div>
            <p className="text-[11px] font-medium text-neutral-400">
              Live background GPS, floating bubble & trip ringtone
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAppSettings}
          title="Open Android Settings"
          className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-bold text-neutral-200 hover:bg-neutral-700 active:scale-95 transition cursor-pointer"
        >
          <Smartphone className="size-3.5 text-amber-400" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* Readiness Hero Card (Rapido/Zomato High-Contrast Styling) */}
        <div
          className={`rounded-2xl p-5 border transition-all ${
            allGranted
              ? "bg-gradient-to-br from-emerald-950/80 via-neutral-900 to-neutral-900 border-emerald-500/50 shadow-lg"
              : "bg-gradient-to-br from-neutral-800 via-neutral-850 to-neutral-900 border-amber-500/40 shadow-lg"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-black/60 border border-neutral-700">
                {allGranted ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-400" />
                    <span className="text-emerald-400">Ready to Ride (5/5)</span>
                  </>
                ) : (
                  <>
                    <Zap className="size-3 text-amber-400 fill-amber-400" />
                    <span className="text-amber-400">
                      Duty Setup Required ({grantedCount} of {totalSteps})
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">
                {allGranted
                  ? "Captain phone is 100% road-ready!"
                  : "Ek-ek karke sabhi permissions allow karein"}
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-xs">
                {allGranted
                  ? "Google Maps navigation aur phone screen off hone par bhi trip offers automatic samne aayenge."
                  : "Zomato Rider & Rapido Captain ki tarah continuous live GPS aur floating bubble zaroori hai."}
              </p>
            </div>

            <div
              className={`flex size-13 shrink-0 items-center justify-center rounded-2xl shadow-md ${
                allGranted ? "bg-emerald-500 text-black font-black" : "bg-amber-400 text-black"
              }`}
            >
              {allGranted ? (
                <ShieldCheck className="size-7 stroke-[2.5]" />
              ) : (
                <Navigation className="size-7 stroke-[2.5] animate-pulse" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-neutral-300">Duty Readiness</span>
              <span className={`font-black ${allGranted ? "text-emerald-400" : "text-amber-400"}`}>
                {grantedCount}/{totalSteps} Completed ({progressPercent}%)
              </span>
            </div>
            <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  allGranted ? "bg-emerald-500" : "bg-amber-400"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
            Captain Road Permissions (5 Steps)
          </p>
          <button
            type="button"
            onClick={refreshPermissions}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="size-3" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Step 1: Background Location ("Allow all the time") */}
        <div
          className={`rounded-2xl border bg-neutral-850 p-4 transition-all shadow-md ${
            bgLocationGranted ? "border-neutral-800" : "border-amber-500/60 ring-2 ring-amber-500/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10.5 shrink-0 items-center justify-center rounded-xl font-bold ${
                  bgLocationGranted
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}
              >
                <Navigation className="size-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-black uppercase text-neutral-300">
                    Step 1
                  </span>
                  <h3 className="text-sm font-black text-white">
                    Live GPS ("Allow All The Time")
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      bgLocationGranted
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        : "bg-amber-950 text-amber-300 border border-amber-700"
                    }`}
                  >
                    {bgLocationGranted ? "Allowed ✓" : "Allow Required"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 leading-snug">
                  Bike chalate waqt aur phone pocket me band hone par bhi dispatch server ko aapki live location milti rahegi.
                </p>
                {!bgLocationGranted && (
                  <p className="text-[10px] text-amber-400 mt-1 font-semibold">
                    💡 Permission dialog me "Allow all the time" select karein.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                requestBackgroundLocationPermission();
                setTimeout(refreshPermissions, 1500);
              }}
              disabled={bgLocationGranted}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer ${
                bgLocationGranted
                  ? "bg-neutral-800 text-neutral-500 cursor-default"
                  : "bg-amber-400 text-black hover:bg-amber-300 active:scale-95 shadow-md"
              }`}
            >
              {bgLocationGranted ? "Allowed ✓" : "Allow"}
            </button>
          </div>
        </div>

        {/* Step 2: Unrestricted Battery (Doze Mode Bypass) */}
        <div
          className={`rounded-2xl border bg-neutral-850 p-4 transition-all shadow-md ${
            batteryIgnored ? "border-neutral-800" : "border-amber-500/60 ring-2 ring-amber-500/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10.5 shrink-0 items-center justify-center rounded-xl font-bold ${
                  batteryIgnored
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}
              >
                <BatteryCharging className="size-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-black uppercase text-neutral-300">
                    Step 2
                  </span>
                  <h3 className="text-sm font-black text-white">
                    Unrestricted Battery (No Restrictions)
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      batteryIgnored
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        : "bg-amber-950 text-amber-300 border border-amber-700"
                    }`}
                  >
                    {batteryIgnored ? "Allowed ✓" : "Allow Required"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 leading-snug">
                  Android phone ko app kill karne se rokta hai, taaki pocket me phone hone par bhi trip offer turant baje.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                requestIgnoreBatteryOptimization();
                setTimeout(refreshPermissions, 1500);
              }}
              disabled={batteryIgnored}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer ${
                batteryIgnored
                  ? "bg-neutral-800 text-neutral-500 cursor-default"
                  : "bg-amber-400 text-black hover:bg-amber-300 active:scale-95 shadow-md"
              }`}
            >
              {batteryIgnored ? "Allowed ✓" : "Allow"}
            </button>
          </div>
        </div>

        {/* Step 3: Display Over Google Maps (Rapido Floating Bubble) */}
        <div
          className={`rounded-2xl border bg-neutral-850 p-4 transition-all shadow-md ${
            overlaysAllowed ? "border-neutral-800" : "border-amber-500/60 ring-2 ring-amber-500/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10.5 shrink-0 items-center justify-center rounded-xl font-bold ${
                  overlaysAllowed
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}
              >
                <Layers className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-black uppercase text-neutral-300">
                    Step 3
                  </span>
                  <h3 className="text-sm font-black text-white">
                    Display Over Other Apps (Floating Bubble)
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      overlaysAllowed
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        : "bg-amber-950 text-amber-300 border border-amber-700"
                    }`}
                  >
                    {overlaysAllowed ? "Allowed ✓" : "Allow"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-snug">
                  Rapido Captain style circular floating bubble screen par rahega. Google Maps use karte waqt bhi trip offer seedha samne aayega.
                </p>

                {/* Live Bubble Tester Pill Button */}
                {overlaysAllowed && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleTestFloatingBubble}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-950/60 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/60 active:scale-95 transition cursor-pointer"
                    >
                      <Sparkles className="size-3.5 text-amber-400" />
                      <span>{isBubbleActive ? "Hide Floating Bubble" : "Test Rapido Floating Bubble 🛵"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                requestOverlayPermission();
                setTimeout(refreshPermissions, 1500);
              }}
              disabled={overlaysAllowed}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer ${
                overlaysAllowed
                  ? "bg-neutral-800 text-neutral-500 cursor-default"
                  : "bg-amber-400 text-black hover:bg-amber-300 active:scale-95 shadow-md"
              }`}
            >
              {overlaysAllowed ? "Allowed ✓" : "Allow"}
            </button>
          </div>
        </div>

        {/* Step 4: High-Decibel Traffic Siren & Notifications */}
        <div
          className={`rounded-2xl border bg-neutral-850 p-4 transition-all shadow-md ${
            notificationsAllowed ? "border-neutral-800" : "border-amber-500/60 ring-2 ring-amber-500/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10.5 shrink-0 items-center justify-center rounded-xl font-bold ${
                  notificationsAllowed
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}
              >
                <BellRing className="size-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-black uppercase text-neutral-300">
                    Step 4
                  </span>
                  <h3 className="text-sm font-black text-white">
                    Trip Siren & Heavy Vibration
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      notificationsAllowed
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        : "bg-red-950 text-red-300 border border-red-700"
                    }`}
                  >
                    {notificationsAllowed ? "Allowed ✓" : "Allow Required"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 leading-snug">
                  Traffic noise aur phone DND hone par bhi loud audio siren aur vibration bajegi taaki trip offer na chhoote.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                openNotificationSettings();
                setTimeout(refreshPermissions, 1500);
              }}
              disabled={notificationsAllowed}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer ${
                notificationsAllowed
                  ? "bg-neutral-800 text-neutral-500 cursor-default"
                  : "bg-amber-400 text-black hover:bg-amber-300 active:scale-95 shadow-md"
              }`}
            >
              {notificationsAllowed ? "Allowed ✓" : "Allow"}
            </button>
          </div>
        </div>

        {/* Step 5: Camera & Proof of Delivery (POD) */}
        <div
          className={`rounded-2xl border bg-neutral-850 p-4 transition-all shadow-md ${
            cameraAllowed ? "border-neutral-800" : "border-amber-500/60 ring-2 ring-amber-500/20"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10.5 shrink-0 items-center justify-center rounded-xl font-bold ${
                  cameraAllowed
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}
              >
                <Camera className="size-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-black uppercase text-neutral-300">
                    Step 5
                  </span>
                  <h3 className="text-sm font-black text-white">
                    Camera & Delivery Proof (POD)
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      cameraAllowed
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                        : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                    }`}
                  >
                    {cameraAllowed ? "Allowed ✓" : "Allow"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 leading-snug">
                  Customer doorstep par laundry packet delivery photo lene aur hub par barcode tags scan karne ke liye.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                requestCameraPermission();
                setTimeout(refreshPermissions, 1500);
              }}
              disabled={cameraAllowed}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer ${
                cameraAllowed
                  ? "bg-neutral-800 text-neutral-500 cursor-default"
                  : "bg-amber-400 text-black hover:bg-amber-300 active:scale-95 shadow-md"
              }`}
            >
              {cameraAllowed ? "Allowed ✓" : "Allow"}
            </button>
          </div>
        </div>

        {/* Live Trip Siren & Vibration Audio Tester Card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-850 p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-black">
                <Volume2 className="size-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Test Captain Trip Siren
                </h3>
                <p className="text-xs text-neutral-400">
                  Listen to the high-pitch dispatch radar siren & feel bike vibration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSoundTest}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer shadow-md ${
                isTestingSound
                  ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                  : "bg-amber-400 text-black hover:bg-amber-300 active:scale-95"
              }`}
            >
              {isTestingSound ? (
                <>
                  <VolumeX className="size-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="size-4" />
                  <span>Test Siren</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* OEM Background Autostart Help Footnote */}
        <div className="p-4 rounded-xl bg-neutral-800/80 border border-neutral-700/80 text-center space-y-1.5">
          <p className="text-xs font-bold text-neutral-300">
            Using Xiaomi, Vivo, Oppo or Realme?
          </p>
          <p className="text-[11px] text-neutral-400">
            Open Phone Settings ➔ Apps ➔ QuickPress Captain ➔ Turn ON "Autostart" & "Allow background activity".
          </p>
          <button
            type="button"
            onClick={openAppSettings}
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 pt-1 cursor-pointer"
          >
            <span>Open Android App Info</span>
            <ExternalLink className="size-3" />
          </button>
        </div>
      </main>

      {/* Sticky Bottom Action Bar: Continue to Duty Dashboard */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 px-4 py-3 shadow-2xl">
        <div className="mx-auto max-w-lg flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">
              {allGranted ? "✓ Ready for Duty" : `${grantedCount} of ${totalSteps} permissions allowed`}
            </p>
            <p className="text-[11px] text-neutral-400">
              {allGranted ? "Phone is optimized for trips" : "Remaining can be enabled anytime"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              stopOrderAlertSound();
              navigate({ to: "/dashboard" });
            }}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black transition-all cursor-pointer shadow-lg active:scale-95 ${
              allGranted
                ? "bg-emerald-500 text-black hover:bg-emerald-400 ring-2 ring-emerald-500/20"
                : "bg-amber-400 text-black hover:bg-amber-300"
            }`}
          >
            <span>Continue to Duty</span>
            <ArrowRight className="size-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
