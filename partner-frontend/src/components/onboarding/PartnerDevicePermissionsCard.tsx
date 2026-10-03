import React, { useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  MapPin,
  Play,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestPushNotificationPermission,
} from "@/api/core/firebase-messaging";
import {
  playPartnerOrderChime,
  startPartnerOrderAlertRing,
  stopPartnerOrderAlertRing,
  testPartnerSoundAndVibration,
} from "../../lib/partner-order-alert-sound";

type GpsState = "idle" | "requesting" | "granted" | "denied";

interface GpsDetails {
  lat: number;
  lng: number;
  accuracy: number;
}

interface PartnerDevicePermissionsCardProps {
  onAllPermissionsReady?: () => void;
  className?: string;
  isCompact?: boolean;
}

const BRAND_GUIDES = [
  {
    id: "xiaomi",
    name: "Xiaomi / Redmi / POCO",
    badge: "MIUI / HyperOS",
    steps: [
      "Open Settings ➔ Apps ➔ Manage Apps ➔ QuickPress Partner",
      "Turn ON 'Autostart' & 'Autostart in background'",
      "Go to Battery Saver ➔ Select 'No Restrictions'",
      "Enable 'Display pop-up windows while running in the background'",
    ],
  },
  {
    id: "samsung",
    name: "Samsung Galaxy",
    badge: "One UI",
    steps: [
      "Open Settings ➔ Battery and Device Care ➔ Battery",
      "Tap 'Background usage limits' ➔ 'Never sleeping apps'",
      "Tap '+' and add 'QuickPress Partner'",
      "Turn OFF 'Put unused apps to sleep'",
    ],
  },
  {
    id: "vivo",
    name: "Vivo / iQOO",
    badge: "Funtouch OS",
    steps: [
      "Open Settings ➔ Battery ➔ High background power consumption",
      "Enable toggle for 'QuickPress Partner'",
      "Go to App Manager ➔ Permissions ➔ Autostart ➔ Allow",
    ],
  },
  {
    id: "oppo",
    name: "Oppo / Realme / OnePlus",
    badge: "ColorOS / OxygenOS",
    steps: [
      "Open Settings ➔ Apps ➔ App Management ➔ QuickPress Partner",
      "Tap 'Battery usage' ➔ Allow background activity & Auto-launch",
      "Tap 'Display over other apps' ➔ Allow",
    ],
  },
  {
    id: "apple",
    name: "Apple iPhone",
    badge: "iOS",
    steps: [
      "Open Settings ➔ QuickPress Partner",
      "Enable 'Notifications' ➔ Turn ON 'Allow Notifications' & 'Banners'",
      "Enable 'Background App Refresh' ➔ ON",
      "Enable 'Location' ➔ 'Always' or 'While Using the App'",
    ],
  },
];

export function PartnerDevicePermissionsCard({
  onAllPermissionsReady,
  className = "",
  isCompact = false,
}: PartnerDevicePermissionsCardProps) {
  // 1. Notification Permission State
  const [notifState, setNotifState] = useState<NotificationPermission>(() => {
    return getNotificationPermission();
  });
  const [requestingNotif, setRequestingNotif] = useState(false);

  // 2. Audio & Siren Ringtone State
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isPlayingSiren, setIsPlayingSiren] = useState(false);
  const [sirenCountdown, setSirenCountdown] = useState<number | null>(null);

  // 3. GPS Geolocation State
  const [gpsState, setGpsState] = useState<GpsState>("idle");
  const [gpsDetails, setGpsDetails] = useState<GpsDetails | null>(null);

  // 4. Background Guidance Accordion
  const [showBrandGuide, setShowBrandGuide] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("xiaomi");

  // 5. Master 1-Click State
  const [grantingAll, setGrantingAll] = useState(false);

  // Check initial permissions
  useEffect(() => {
    setNotifState(getNotificationPermission());
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (result.state === "granted") setGpsState("granted");
          else if (result.state === "denied") setGpsState("denied");
        })
        .catch(() => {});
    }
  }, []);

  // Check if everything is ready
  useEffect(() => {
    if (notifState === "granted" && audioUnlocked && gpsState === "granted") {
      onAllPermissionsReady?.();
    }
  }, [notifState, audioUnlocked, gpsState, onAllPermissionsReady]);

  // Request Notification Permission
  const handleRequestNotification = async () => {
    setRequestingNotif(true);
    try {
      if (!isPushNotificationSupported()) {
        toast.info("Push notifications are not supported in this browser environment.");
        return;
      }
      const token = await requestPushNotificationPermission();
      const current = getNotificationPermission();
      setNotifState(current);

      if (current === "granted") {
        toast.success("🔔 Order Push Notifications Enabled! High-priority alerts active.");
      } else if (current === "denied") {
        toast.error("Notification permission denied. Please allow notifications in browser address bar.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to request notification permission.");
    } finally {
      setRequestingNotif(false);
    }
  };

  // Test Order Siren Sound & Audio Unlock (5-second loop)
  const handleTestSiren = () => {
    if (isPlayingSiren) {
      stopPartnerOrderAlertRing();
      setIsPlayingSiren(false);
      setSirenCountdown(null);
      return;
    }

    // Unlock and start
    setAudioUnlocked(true);
    setIsPlayingSiren(true);
    startPartnerOrderAlertRing();
    toast.success("🔊 Playing Zomato-style High-Priority Order Siren + Vibration!");

    let seconds = 5;
    setSirenCountdown(seconds);

    const timer = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearInterval(timer);
        stopPartnerOrderAlertRing();
        setIsPlayingSiren(false);
        setSirenCountdown(null);
      } else {
        setSirenCountdown(seconds);
      }
    }, 1000);
  };

  // Request GPS Geolocation
  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      toast.error("GPS Geolocation is not supported by your device.");
      return;
    }

    setGpsState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsState("granted");
        setGpsDetails({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        toast.success(`📍 Live GPS Verified! Accuracy: ±${Math.round(pos.coords.accuracy)}m`);
      },
      (err) => {
        setGpsState("denied");
        toast.error(err.message || "GPS location permission was denied.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Master 1-Click "Allow All Critical Permissions"
  const handleGrantAll = async () => {
    setGrantingAll(true);
    try {
      // 1. Notification
      if (isPushNotificationSupported() && notifState !== "granted") {
        await requestPushNotificationPermission();
        setNotifState(getNotificationPermission());
      }

      // 2. Audio Unlock & Test
      setAudioUnlocked(true);
      testPartnerSoundAndVibration();

      // 3. Geolocation
      if (navigator.geolocation && gpsState !== "granted") {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setGpsState("granted");
            setGpsDetails({
              lat: Number(pos.coords.latitude.toFixed(5)),
              lng: Number(pos.coords.longitude.toFixed(5)),
              accuracy: Math.round(pos.coords.accuracy),
            });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }

      toast.success("🎉 All device permissions & High-Priority Order Alerts initialized!");
    } catch {
      // Handled silently
    } finally {
      setGrantingAll(false);
    }
  };

  const isAllGranted = notifState === "granted" && audioUnlocked && gpsState === "granted";

  return (
    <div
      className={`rounded-3xl border border-amber-300/80 bg-gradient-to-br from-amber-50/95 via-orange-50/50 to-amber-100/40 p-5 shadow-xs space-y-4 text-zinc-900 ${className}`}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-xs">
            <Radio className="size-4.5 animate-pulse" />
          </span>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              High-Priority Order Alert &amp; Device Setup
            </h4>
            <p className="text-[11px] font-semibold text-zinc-600">
              Never miss customer orders even when phone is locked or on silent
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
            isAllGranted
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-amber-200 text-amber-900 border border-amber-300"
          }`}
        >
          {isAllGranted ? "✓ 100% Ready" : "Setup Required"}
        </span>
      </div>

      {/* Main 3 Permissions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Permission 1: Push Notifications */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-200/90 bg-white/90 p-3.5 shadow-2xs backdrop-blur-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex size-7 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Bell className="size-3.5" />
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                  notifState === "granted"
                    ? "bg-emerald-100 text-emerald-800"
                    : notifState === "denied"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {notifState === "granted"
                  ? "✓ Allowed"
                  : notifState === "denied"
                  ? "Blocked"
                  : "Tap to Allow"}
              </span>
            </div>
            <h5 className="mt-2 text-xs font-black text-zinc-900">Push Notifications</h5>
            <p className="mt-0.5 text-[10.5px] text-zinc-500 leading-tight">
              FCM High-Priority push dispatch for instant order pop-up
            </p>
          </div>

          <button
            type="button"
            disabled={requestingNotif || notifState === "granted"}
            onClick={() => void handleRequestNotification()}
            className={`mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
              notifState === "granted"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-400 text-black hover:bg-amber-300 shadow-2xs active:scale-[0.97]"
            }`}
          >
            {requestingNotif ? (
              <Loader2 className="size-3 animate-spin" />
            ) : notifState === "granted" ? (
              <Check className="size-3 stroke-[3]" />
            ) : (
              <Bell className="size-3" />
            )}
            <span>{notifState === "granted" ? "Notifications Active" : "Allow Push Alerts"}</span>
          </button>
        </div>

        {/* Permission 2: High-Priority Order Siren */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-200/90 bg-white/90 p-3.5 shadow-2xs backdrop-blur-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex size-7 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <Volume2 className="size-3.5" />
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                  audioUnlocked
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                {audioUnlocked ? "✓ Active" : "Enable Siren"}
              </span>
            </div>
            <h5 className="mt-2 text-xs font-black text-zinc-900">Loud Order Siren</h5>
            <p className="mt-0.5 text-[10.5px] text-zinc-500 leading-tight">
              Repeating merchant chime &amp; haptic vibration loop
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestSiren}
            className={`mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
              isPlayingSiren
                ? "bg-rose-500 text-white animate-pulse"
                : audioUnlocked
                ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                : "bg-orange-400 text-black hover:bg-orange-300 shadow-2xs active:scale-[0.97]"
            }`}
          >
            {isPlayingSiren ? (
              <>
                <Square className="size-3 fill-white" />
                <span>Stop Siren ({sirenCountdown}s)</span>
              </>
            ) : (
              <>
                <Volume2 className="size-3" />
                <span>{audioUnlocked ? "Play Siren Ringtone" : "Enable & Activate Siren"}</span>
              </>
            )}
          </button>
        </div>

        {/* Permission 3: Live GPS Location */}
        <div className="flex flex-col justify-between rounded-2xl border border-amber-200/90 bg-white/90 p-3.5 shadow-2xs backdrop-blur-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Compass className="size-3.5" />
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                  gpsState === "granted"
                    ? "bg-emerald-100 text-emerald-800"
                    : gpsState === "denied"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {gpsState === "granted"
                  ? "✓ Verified"
                  : gpsState === "denied"
                  ? "Denied"
                  : "Allow GPS"}
              </span>
            </div>
            <h5 className="mt-2 text-xs font-black text-zinc-900">Store GPS Geofence</h5>
            <p className="mt-0.5 text-[10.5px] text-zinc-500 leading-tight">
              {gpsDetails
                ? `±${gpsDetails.accuracy}m live accuracy verified`
                : "Pinpoint pickup dispatch & rider route mapping"}
            </p>
          </div>

          <button
            type="button"
            disabled={gpsState === "requesting"}
            onClick={handleRequestGps}
            className={`mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
              gpsState === "granted"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-400 text-black hover:bg-amber-300 shadow-2xs active:scale-[0.97]"
            }`}
          >
            {gpsState === "requesting" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : gpsState === "granted" ? (
              <Check className="size-3 stroke-[3]" />
            ) : (
              <MapPin className="size-3" />
            )}
            <span>{gpsState === "granted" ? "GPS Live Active" : "Allow GPS Location"}</span>
          </button>
        </div>
      </div>

      {/* 1-Click Master Setup Button */}
      {!isAllGranted && (
        <button
          type="button"
          disabled={grantingAll}
          onClick={() => void handleGrantAll()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] text-white text-xs font-black uppercase tracking-wider shadow-sm hover:bg-black active:scale-[0.98] transition-all cursor-pointer"
        >
          {grantingAll ? (
            <Loader2 className="size-4 animate-spin text-amber-400" />
          ) : (
            <Zap className="size-4 text-amber-400 fill-amber-400" />
          )}
          <span>Grant All Required Permissions in 1 Click</span>
        </button>
      )}

      {/* Background & Battery Saver Device Guidance Accordion */}
      <div className="rounded-2xl border border-amber-200/90 bg-white/80 p-3.5">
        <button
          type="button"
          onClick={() => setShowBrandGuide(!showBrandGuide)}
          className="flex w-full items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-amber-700" />
            <div>
              <span className="text-xs font-black text-zinc-900">
                Lock Screen &amp; Battery Saver Setup (By Device)
              </span>
              <p className="text-[10px] text-zinc-500">
                How to keep order siren active on Xiaomi, Samsung, Vivo, Oppo &amp; iPhone
              </p>
            </div>
          </div>
          {showBrandGuide ? (
            <ChevronUp className="size-4 text-zinc-500" />
          ) : (
            <ChevronDown className="size-4 text-zinc-500" />
          )}
        </button>

        {showBrandGuide && (
          <div className="mt-3 pt-3 border-t border-amber-100 space-y-3">
            {/* Device Brand Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {BRAND_GUIDES.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => setSelectedBrand(brand.id)}
                  className={`rounded-xl px-2.5 py-1 text-[10.5px] font-black transition-all cursor-pointer ${
                    selectedBrand === brand.id
                      ? "bg-amber-400 text-black shadow-xs font-black"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {brand.name.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Selected Brand Instruction List */}
            {(() => {
              const guide = BRAND_GUIDES.find((b) => b.id === selectedBrand) || BRAND_GUIDES[0];
              return (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-zinc-900">{guide.name}</span>
                    <span className="rounded-md bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                      {guide.badge}
                    </span>
                  </div>
                  <ol className="space-y-1.5 text-[11px] text-zinc-700 list-decimal pl-4 font-medium">
                    {guide.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Critical SLA Note */}
      <div className="flex items-start gap-2 text-[10.5px] text-zinc-600">
        <Info className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Merchant SLA Guarantee:</strong> High-priority siren ensures your store accepts customer laundry orders within the 5-minute SLA window.
        </span>
      </div>
    </div>
  );
}
