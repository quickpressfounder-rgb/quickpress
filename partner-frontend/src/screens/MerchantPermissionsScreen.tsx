import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BatteryCharging,
  BellRing,
  Camera,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  MapPin,
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
  isBatteryOptimizationIgnored,
  isCameraGranted,
  isLocationGranted,
  isNativeAndroidApp,
  openAppSettings,
  openNotificationSettings,
  requestAllPermissions,
  requestCameraPermission,
  requestIgnoreBatteryOptimization,
  requestLocationPermission,
  requestOverlayPermission,
} from "../lib/merchant-device-opt";
import {
  playPartnerOrderChime,
  startPartnerOrderAlertRing,
  stopPartnerOrderAlertRing,
  testPartnerSoundAndVibration,
} from "../lib/partner-order-alert-sound";
import { partnerRoutes } from "../navigation/partner-routes";

export function MerchantPermissionsScreen() {
  const navigate = useNavigate();
  const isNative = isNativeAndroidApp();

  const [batteryIgnored, setBatteryIgnored] = useState(true);
  const [notificationsAllowed, setNotificationsAllowed] = useState(true);
  const [overlaysAllowed, setOverlaysAllowed] = useState(true);
  const [locationAllowed, setLocationAllowed] = useState(true);
  const [cameraAllowed, setCameraAllowed] = useState(true);
  const [isTestingSound, setIsTestingSound] = useState(false);

  const refreshPermissionsState = () => {
    setBatteryIgnored(isBatteryOptimizationIgnored());
    setNotificationsAllowed(areNotificationsEnabled());
    setOverlaysAllowed(canDrawOverlays());
    setLocationAllowed(isLocationGranted());
    setCameraAllowed(isCameraGranted());
  };

  useEffect(() => {
    refreshPermissionsState();

    const handleFocus = () => {
      refreshPermissionsState();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const allGranted =
    batteryIgnored &&
    notificationsAllowed &&
    overlaysAllowed &&
    locationAllowed &&
    cameraAllowed;

  const handleGrantAll = () => {
    requestAllPermissions();
    toast.success("Requesting permissions... Follow on-screen prompts to allow.");
    setTimeout(refreshPermissionsState, 1500);
  };

  const handleToggleSoundTest = () => {
    if (isTestingSound) {
      stopPartnerOrderAlertRing();
      setIsTestingSound(false);
      toast.info("Audio test stopped.");
    } else {
      setIsTestingSound(true);
      startPartnerOrderAlertRing();
      toast.success("Playing commercial merchant alert siren...");
      setTimeout(() => {
        stopPartnerOrderAlertRing();
        setIsTestingSound(false);
      }, 6000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 text-zinc-900">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-200 px-4 py-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                stopPartnerOrderAlertRing();
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: partnerRoutes.dashboard });
                }
              }}
              className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:scale-95 transition cursor-pointer"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-zinc-950">
                Device Permissions & Alerts
              </h1>
              <p className="text-[11px] font-medium text-zinc-500">
                Setup 24/7 background ringtone & screen wakeup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAppSettings}
            title="Open Android Settings"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 active:scale-95 transition cursor-pointer"
          >
            <Smartphone className="size-3.5 text-blue-600" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-4 space-y-4">
        {/* Status Hero Card */}
        <div
          className={`rounded-2xl p-5 border transition-all ${
            allGranted
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
              : "bg-gradient-to-br from-blue-50 to-indigo-50/80 border-blue-200 text-blue-950"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-white shadow-2xs">
                {allGranted ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    <span className="text-emerald-700">All Systems Ready</span>
                  </>
                ) : (
                  <>
                    <Zap className="size-3 text-blue-600 fill-blue-600" />
                    <span className="text-blue-700">Setup Recommended</span>
                  </>
                )}
              </div>
              <h2 className="text-lg font-black tracking-tight">
                {allGranted
                  ? "Store alerts are fully optimized!"
                  : "Allow background alerts so you never miss an order"}
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-md">
                {allGranted
                  ? "Orders will ring out loud even if your phone screen is locked or another app is open."
                  : "Zomato & Swiggy-style merchants require background permission so order sirens ring immediately."}
              </p>
            </div>

            <div
              className={`flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
                allGranted ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
              }`}
            >
              {allGranted ? (
                <ShieldCheck className="size-6" />
              ) : (
                <BellRing className="size-6 animate-bounce" />
              )}
            </div>
          </div>

          {/* Master One-Tap Button */}
          {!allGranted && (
            <div className="mt-4 pt-4 border-t border-blue-200/60 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-blue-900">
                One-tap configuration for all settings
              </p>
              <button
                type="button"
                onClick={handleGrantAll}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="size-3.5 fill-white" />
                <span>Allow All</span>
              </button>
            </div>
          )}
        </div>

        {/* Permission Cards List */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500 px-1">
            Required Permissions & Features
          </p>

          {/* 1. Battery Optimization */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs hover:border-zinc-300 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                    batteryIgnored
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  <BatteryCharging className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-950">
                      Unrestricted Battery (Doze Mode Bypass)
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        batteryIgnored
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {batteryIgnored ? "Active" : "Recommended"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                    Prevents Android from putting the app to sleep. Guarantees 0-latency incoming order alerts when phone is idle.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  requestIgnoreBatteryOptimization();
                  setTimeout(refreshPermissionsState, 1500);
                }}
                disabled={batteryIgnored}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  batteryIgnored
                    ? "bg-zinc-100 text-zinc-400 cursor-default"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-2xs"
                }`}
              >
                {batteryIgnored ? "Allowed ✓" : "Allow"}
              </button>
            </div>
          </div>

          {/* 2. Order Notifications & Alarm Channel */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs hover:border-zinc-300 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                    notificationsAllowed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <BellRing className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-950">
                      High-Priority Order Siren & Push
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        notificationsAllowed
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {notificationsAllowed ? "Active" : "Required"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                    Bypasses silent mode and rings loud counter chimes even if phone is on DND.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  openNotificationSettings();
                  setTimeout(refreshPermissionsState, 1500);
                }}
                disabled={notificationsAllowed}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  notificationsAllowed
                    ? "bg-zinc-100 text-zinc-400 cursor-default"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-2xs"
                }`}
              >
                {notificationsAllowed ? "Allowed ✓" : "Allow"}
              </button>
            </div>
          </div>

          {/* 3. Display Over Other Apps */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs hover:border-zinc-300 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                    overlaysAllowed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <Layers className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-950">
                      Display Over Other Apps (Overlay Popups)
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        overlaysAllowed
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      }`}
                    >
                      {overlaysAllowed ? "Active" : "Optional"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                    Shows incoming order cards with Accept/Reject buttons even while using WhatsApp, Maps or other apps.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  requestOverlayPermission();
                  setTimeout(refreshPermissionsState, 1500);
                }}
                disabled={overlaysAllowed}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  overlaysAllowed
                    ? "bg-zinc-100 text-zinc-400 cursor-default"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-2xs"
                }`}
              >
                {overlaysAllowed ? "Allowed ✓" : "Allow"}
              </button>
            </div>
          </div>

          {/* 4. Location Access */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs hover:border-zinc-300 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                    locationAllowed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  <MapPin className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-950">
                      Store GPS Location
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        locationAllowed
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {locationAllowed ? "Active" : "Required"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                    Ensures precise geofencing so delivery captains are automatically dispatched from nearby radius.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  requestLocationPermission();
                  setTimeout(refreshPermissionsState, 1500);
                }}
                disabled={locationAllowed}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  locationAllowed
                    ? "bg-zinc-100 text-zinc-400 cursor-default"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-2xs"
                }`}
              >
                {locationAllowed ? "Allowed ✓" : "Allow"}
              </button>
            </div>
          </div>

          {/* 5. Camera Access */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs hover:border-zinc-300 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                    cameraAllowed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  <Camera className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-950">
                      Camera (Garment Photos & Barcodes)
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        cameraAllowed
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      }`}
                    >
                      {cameraAllowed ? "Active" : "Optional"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
                    Take photos of pre-existing garment stains/defects upon captain delivery at your counter.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  requestCameraPermission();
                  setTimeout(refreshPermissionsState, 1500);
                }}
                disabled={cameraAllowed}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  cameraAllowed
                    ? "bg-zinc-100 text-zinc-400 cursor-default"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-2xs"
                }`}
              >
                {cameraAllowed ? "Allowed ✓" : "Allow"}
              </button>
            </div>
          </div>
        </div>

        {/* Live Audio & Haptic Test Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Volume2 className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-950">
                  Test Store Order Ringtone
                </h3>
                <p className="text-xs text-zinc-500">
                  Listen to the loud counter service chime and feel vibration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSoundTest}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer shadow-xs ${
                isTestingSound
                  ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                  : "bg-zinc-900 text-white hover:bg-black active:scale-95"
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
        </div>

        {/* Troubleshooting footnote */}
        <div className="p-4 rounded-xl bg-zinc-100 border border-zinc-200 text-center space-y-1.5">
          <p className="text-xs font-bold text-zinc-700">
            Having trouble receiving orders in background?
          </p>
          <p className="text-[11px] text-zinc-500">
            Some phones (Xiaomi, Vivo, Oppo) have aggressive battery managers. Open system app info and enable "Autostart".
          </p>
          <button
            type="button"
            onClick={openAppSettings}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 pt-1"
          >
            <span>Open Android App Settings</span>
            <ExternalLink className="size-3" />
          </button>
        </div>
      </main>
    </div>
  );
}
