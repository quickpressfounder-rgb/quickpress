import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Bike,
  Calendar,
  ChevronRight,
  Clock3,
  CreditCard,
  ExternalLink,
  FileText,
  Gauge,
  KeyRound,
  Laptop,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Power,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Smartphone,
  Timer,
  Trash2,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { testPartnerSoundAndVibration } from "../lib/partner-order-alert-sound";

import { Toaster } from "@/shared/ui/sonner";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PartnerListSkeleton } from "../components/PartnerSkeletons";
import { usePartnerResource } from "../hooks/use-partner-resource";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  fetchBusinessSettings,
  updateBusinessSettings,
  closePartnerAccount,
  fetchPartnerSecuritySessions,
  revokeOtherPartnerSessions,
  type PartnerSessionItem,
} from "@/api/partner/partner-profile-api";
import type { BusinessSettings } from "@/shared/types/partner";
import { usePartnerContext } from "../context/PartnerContext";
import { ShopHoursModal } from "../components/shop/ShopHoursModal";
import { ShopCoverageModal } from "../components/shop/ShopCoverageModal";
import { ShopCapacityModal } from "../components/shop/ShopCapacityModal";

/**
 * High-contrast iOS toggle switch component
 */
function SwitchToggle({
  checked,
  onChange,
  disabled = false,
  onDisabledClick,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  onDisabledClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) {
          onDisabledClick?.();
          return;
        }
        onChange(!checked);
      }}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
        disabled
          ? "cursor-not-allowed bg-zinc-200 opacity-60"
          : checked
            ? "bg-emerald-600"
            : "bg-zinc-300 hover:bg-zinc-400"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block size-6 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function BusinessSettingsScreen() {
  const navigate = useNavigate();
  const { isOnline, setOnline } = usePartnerContext();
  const { data: settings, setData } = usePartnerResource(fetchBusinessSettings);
  const [closeAccountOpen, setCloseAccountOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [panInput, setPanInput] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [closureReason, setClosureReason] = useState("Relocating business / Moving store");
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);

  // All Logged-in Devices & Legal/Privacy Modals
  const [devicesModalOpen, setDevicesModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [sessions, setSessions] = useState<PartnerSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [coverageModalOpen, setCoverageModalOpen] = useState(false);
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);

  // Load active sessions
  useEffect(() => {
    let mounted = true;
    const loadSecurityData = async () => {
      try {
        setSessionsLoading(true);
        const sessResp = await fetchPartnerSecuritySessions().catch(() => null);
        if (!mounted) return;
        if (sessResp?.sessions) {
          setSessions(sessResp.sessions);
        }
      } finally {
        if (mounted) setSessionsLoading(false);
      }
    };
    loadSecurityData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRevokeOtherSessions = async () => {
    setRevokingOthers(true);
    try {
      const res = await revokeOtherPartnerSessions();
      toast.success(res?.message || "All other active device sessions logged out.");
      const refreshed = await fetchPartnerSecuritySessions().catch(() => null);
      if (refreshed?.sessions) setSessions(refreshed.sessions);
    } catch (err: any) {
      toast.error(err?.message || "Failed to log out other devices.");
    } finally {
      setRevokingOthers(false);
    }
  };

  const handleExecuteAccountClosure = async () => {
    setClosureError(null);
    const cleanPan = panInput.replace(/[\s-]/g, "").trim().toUpperCase();
    const cleanDob = dobInput.trim();

    if (cleanPan.length !== 10) {
      setClosureError("Please enter your valid 10-character registered Business PAN number.");
      return;
    }
    if (!cleanDob) {
      setClosureError("Please select/enter your registered Date of Birth (DOB).");
      return;
    }
    if (!confirmCheck) {
      setClosureError("Please check the confirmation box before proceeding.");
      return;
    }

    setClosing(true);
    try {
      const res = await closePartnerAccount({
        pan: cleanPan,
        dob: cleanDob,
        reason: closureReason,
      });
      toast.success(res?.message || "Store account permanently closed.");
      setCloseAccountOpen(false);

      // Clear sessions and redirect to auth
      try {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("qp_token");
        localStorage.removeItem("quickpress_partner_session");
        sessionStorage.clear();
      } catch {
        // ignore
      }

      setTimeout(() => {
        window.location.href = "/auth";
      }, 700);
    } catch (err: any) {
      const msg = err?.message || err?.detail || "Identity verification failed. PAN or Date of Birth does not match registered record.";
      setClosureError(msg);
      toast.error(msg);
    } finally {
      setClosing(false);
    }
  };


  // Synchronize effective store open state with global isOnline
  const isStoreEffectivelyOpen = settings !== null && typeof settings?.isStoreOpen === "boolean"
    ? (settings.isStoreOpen && isOnline)
    : isOnline;

  const patch = async (next: Partial<BusinessSettings>, message: string) => {
    if (!settings) return;
    const nextSettings = { ...settings, ...next };
    if (typeof next.isStoreOpen === "boolean") {
      nextSettings.manualOverride = true;
      nextSettings.manualOverrideAction = next.isStoreOpen ? "online" : "offline";
      if (!next.isStoreOpen) {
        nextSettings.scheduleStatusText = "Manually Paused (Offline)";
      }
    }
    if (next.manualOverride === false) {
      nextSettings.manualOverride = false;
      nextSettings.manualOverrideAction = null;
    }
    setData(nextSettings);

    // If isStoreOpen is being changed, sync with global PartnerContext immediately
    if (typeof next.isStoreOpen === "boolean") {
      await setOnline(next.isStoreOpen);
    } else if (typeof next.acceptingNewOrders === "boolean" && !next.acceptingNewOrders) {
      await setOnline(false);
    }

    try {
      const res = await updateBusinessSettings(next);
      if (res.settings) {
        setData(res.settings);
        if (typeof res.settings.isStoreOpen === "boolean") {
          await setOnline(res.settings.isStoreOpen);
        }
      }
      toast.success(message);
    } catch {
      toast.error("Failed to save setting");
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      void navigate({ to: partnerRoutes.dashboard });
    }
  };

  return (
    <PartnerLayout
      activeTab="profile"
      hideBottomNav={true}
      title="Store Settings"
      subtitle="Operational rules, availability toggles & order limits"
    >
      {/* ========================================================================= */}
      {/* 1. DEDICATED NATIVE MOBILE SETTINGS LAYOUT (< md)                         */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-[#F4F5F7] pb-24 text-zinc-900 md:hidden">
        {/* Sticky Mobile App Bar */}
        <header className="sticky top-0 z-30 flex h-15 items-center justify-between border-b border-zinc-200/80 bg-white/95 px-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              aria-label="Back"
              className="flex size-9.5 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 shadow-2xs active:scale-95 cursor-pointer hover:bg-zinc-200 transition-all"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black tracking-tight text-zinc-900 leading-tight">
                Store Settings
              </h1>
              <p className="text-[11px] font-semibold text-zinc-500">
                Operating rules & capacities
              </p>
            </div>
          </div>

          {/* Live Store Pill */}
          {settings && (
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                isStoreEffectivelyOpen
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-2xs"
                  : "border border-zinc-200 bg-zinc-100 text-zinc-600"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  isStoreEffectivelyOpen ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                }`}
              />
              {isStoreEffectivelyOpen ? "Online" : "Offline"}
            </span>
          )}
        </header>

        {/* Mobile Settings Content */}
        <div className="p-4 space-y-5">
          {!settings ? (
            <div className="space-y-4 pt-2">
              <PartnerListSkeleton />
            </div>
          ) : (
            <>
              {/* Card 1: Master Store Online/Offline Banner */}
              <div
                onClick={() =>
                  void patch(
                    { isStoreOpen: !isStoreEffectivelyOpen },
                    !isStoreEffectivelyOpen ? "Store opened" : "Store closed"
                  )
                }
                className={`flex items-center justify-between rounded-2xl border-2 p-4 transition-all cursor-pointer shadow-xs ${
                  isStoreEffectivelyOpen
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-50/90 via-white to-white"
                    : "border-zinc-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-colors ${
                      isStoreEffectivelyOpen ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    <Power className="size-5.5" strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900 leading-tight">
                      {isStoreEffectivelyOpen ? "Store is ONLINE" : "Store is OFFLINE"}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-zinc-500 leading-snug">
                      {isStoreEffectivelyOpen
                        ? "Accepting customer laundry orders"
                        : "Orders paused. Switch ON to accept orders"}
                    </p>
                  </div>
                </div>

                <SwitchToggle
                  label="Store Open"
                  checked={isStoreEffectivelyOpen}
                  onChange={(next) =>
                    void patch({ isStoreOpen: next }, next ? "Store opened" : "Store closed")
                  }
                />
              </div>

              {/* Manual Override Indicator Banner */}
              {settings.manualOverride && settings.manualOverrideAction === "offline" && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">⏸️</span>
                      <p className="text-xs font-black text-amber-900">Manually Paused (Offline)</p>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                      Store was manually switched offline. Auto-engine will not force you online until tomorrow at {settings.openingTime}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void patch({ manualOverride: false }, "Auto schedule resumed")}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    Resume Auto
                  </button>
                </div>
              )}

              {/* Card 2: Order Controls & Feature Toggles */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
                  Order Controls & Features
                </p>

                <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs divide-y divide-zinc-100">
                  {/* Auto Store Timing Engine Toggle */}
                  <div
                    onClick={() =>
                      void patch(
                        { autoScheduleEnabled: !(settings.autoScheduleEnabled ?? true) },
                        !(settings.autoScheduleEnabled ?? true)
                          ? "Auto store schedule enabled"
                          : "Auto store schedule disabled"
                      )
                    }
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Clock3 className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-zinc-900">Auto Online & Offline</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              (settings.autoScheduleEnabled ?? true)
                                ? "bg-indigo-50 border border-indigo-200 text-indigo-700"
                                : "bg-zinc-100 border border-zinc-200 text-zinc-600"
                            }`}
                          >
                            {(settings.autoScheduleEnabled ?? true) ? "Auto Active" : "Manual Only"}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          {(settings.autoScheduleEnabled ?? true)
                            ? `Auto-opens at ${settings.openingTime} & closes at ${settings.closingTime}`
                            : "Manual mode: Store status is controlled manually"}
                        </p>
                        {settings.scheduleStatusText && (settings.autoScheduleEnabled ?? true) && (
                          <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                            ● {settings.scheduleStatusText} {settings.nextScheduledTransition ? `· ${settings.nextScheduledTransition}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <SwitchToggle
                      label="Auto Online & Offline"
                      checked={settings.autoScheduleEnabled ?? true}
                      onChange={(next) =>
                        void patch(
                          { autoScheduleEnabled: next },
                          next ? "Auto store schedule enabled" : "Auto store schedule disabled"
                        )
                      }
                    />
                  </div>
                  {/* Accepting New Orders */}
                  <div
                    onClick={() =>
                      void patch(
                        { acceptingNewOrders: !settings.acceptingNewOrders },
                        !settings.acceptingNewOrders ? "Accepting orders" : "Orders paused"
                      )
                    }
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Bike className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Accepting New Orders</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          Pause if machine capacity is full
                        </p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Accepting New Orders"
                      checked={settings.acceptingNewOrders}
                      onChange={(next) =>
                        void patch(
                          { acceptingNewOrders: next },
                          next ? "Accepting orders" : "Orders paused"
                        )
                      }
                    />
                  </div>

                  {/* Auto-Accept Orders (Coming Soon) */}
                  <div
                    onClick={() => toast.info("Auto-Accept Orders feature is coming soon!")}
                    className="flex items-center justify-between p-4 gap-3 bg-zinc-50/50 cursor-not-allowed opacity-80"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Zap className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-zinc-900">Auto-Accept Orders</p>
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          Automatically queue incoming bookings
                        </p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Auto-Accept Orders"
                      checked={false}
                      disabled={true}
                      onDisabledClick={() => toast.info("Auto-Accept Orders feature is coming soon!")}
                      onChange={() => {}}
                    />
                  </div>

                  {/* Device Permissions & Background Setup */}
                  <div
                    onClick={() => navigate({ to: partnerRoutes.permissions })}
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Zap className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-zinc-900">Background Alerts & Permissions</p>
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[9px] font-black uppercase text-emerald-700">
                            Configure
                          </span>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          Battery optimization, lockscreen wakeup & order sirens
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-zinc-400" />
                  </div>

                  {/* Test Store Order Ringtone */}
                  <div
                    onClick={() => {
                      testPartnerSoundAndVibration();
                    }}
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Volume2 className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Store Order Alert Ringtone</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          Commercial laundromat chime & counter bell siren
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-black transition-all"
                    >
                      Play Chime 🔊
                    </button>
                  </div>

                  {/* Express Delivery */}
                  <div
                    onClick={() =>
                      void patch(
                        { expressDelivery: !settings.expressDelivery },
                        "Express delivery updated"
                      )
                    }
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        <Timer className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Express Delivery</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          12-hour turnaround for rush bookings
                        </p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Express Delivery"
                      checked={settings.expressDelivery}
                      onChange={(next) =>
                        void patch({ expressDelivery: next }, "Express delivery updated")
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Operational Limits & Hours */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Store Limits & Timings
                  </p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Tap to edit
                  </span>
                </div>

                <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs divide-y divide-zinc-100">
                  {/* Working Hours */}
                  <div
                    onClick={() => setHoursModalOpen(true)}
                    className="flex items-center justify-between p-4 gap-3 cursor-pointer hover:bg-zinc-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Clock3 className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black text-zinc-900">Working Hours</p>
                          <Pencil className="size-3 text-blue-500" />
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">Store daily operating hours</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-1.5 text-xs font-black text-blue-900">
                      {settings.openingTime} – {settings.closingTime}
                    </span>
                  </div>

                  {/* Pickup & Delivery Radius */}
                  <div
                    onClick={() => setCoverageModalOpen(true)}
                    className="flex items-center justify-between p-4 gap-3 cursor-pointer hover:bg-zinc-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Gauge className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black text-zinc-900">Coverage Radius</p>
                          <Pencil className="size-3 text-emerald-500" />
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">Pickup & delivery SLA boundaries</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-1.5 text-xs font-black text-emerald-900">
                      {settings.pickupRadiusKm} km / {settings.deliveryRadiusKm || 10} km
                    </span>
                  </div>

                  {/* Service Pincodes & Sectors */}
                  <div
                    onClick={() => setCoverageModalOpen(true)}
                    className="flex items-center justify-between p-4 gap-3 cursor-pointer hover:bg-zinc-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                        <MapPin className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black text-zinc-900">Service PIN Codes & Areas</p>
                          <Pencil className="size-3 text-teal-500" />
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          {settings.servicePincodes && settings.servicePincodes.length > 0
                            ? `${settings.servicePincodes.join(", ")}`
                            : "Auto-dispatch active within radius"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-teal-200 bg-teal-50/50 px-3 py-1.5 text-xs font-black text-teal-900">
                      {settings.servicePincodes?.length || 0} PINs
                    </span>
                  </div>

                  {/* Daily Order Cap */}
                  <div
                    onClick={() => setCapacityModalOpen(true)}
                    className="flex items-center justify-between p-4 gap-3 cursor-pointer hover:bg-zinc-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        <Sliders className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black text-zinc-900">Daily Order Cap</p>
                          <Pencil className="size-3 text-purple-500" />
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">Maximum daily capacity</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-purple-200 bg-purple-50/50 px-3 py-1.5 text-xs font-black text-purple-900">
                      {settings.dailyOrderCap} orders
                    </span>
                  </div>

                  {/* Weekly Off Day */}
                  <div
                    onClick={() => setHoursModalOpen(true)}
                    className="flex items-center justify-between p-4 gap-3 cursor-pointer hover:bg-zinc-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Clock3 className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black text-zinc-900">Weekly Off Day</p>
                          <Pencil className="size-3 text-amber-500" />
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">Scheduled maintenance day</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs font-black text-amber-900">
                      {settings.weeklyOff || "None (7 Days Open)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Security & Legal Governance */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-400 px-1">
                  Security & Policies
                </p>

                <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs divide-y divide-zinc-100">
                  {/* All Logged-in Devices */}
                  <div
                    onClick={() => setDevicesModalOpen(true)}
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800">
                        <Smartphone className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-zinc-900">All Logged-in Devices</p>
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.2 text-[9px] font-black uppercase text-emerald-700">
                            {sessions.length || 1} Active
                          </span>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          Manage active sessions &amp; remote logout
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4.5 text-zinc-400 shrink-0" />
                  </div>

                  {/* Legal & Privacy */}
                  <div
                    onClick={() => setLegalModalOpen(true)}
                    className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800">
                        <Scale className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900">Legal &amp; Privacy</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          Terms, privacy policy, merchant SLA &amp; grievance desk
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4.5 text-zinc-400 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Card 5: Danger Zone */}
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-red-500 px-1">
                  Account Management
                </p>

                <div className="rounded-2xl border border-red-200 bg-white overflow-hidden shadow-xs">
                  <div
                    onClick={() => setCloseAccountOpen(true)}
                    className="flex items-center justify-between p-4 gap-3 hover:bg-red-50/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                        <Trash2 className="size-5" strokeWidth={2.2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-red-600">Request Store Account Closure</p>
                        <p className="text-xs font-medium text-zinc-500 truncate">
                          De-list your store from QuickPress
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4.5 text-red-400 shrink-0" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP SETTINGS LAYOUT (>= md)                                        */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-5xl px-8 py-6 md:block">
        {!settings ? (
          <PartnerListSkeleton />
        ) : (
          <div className="animate-soft-fade space-y-6 pb-12">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Availability Toggles */}
              <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <Sliders className="size-4" strokeWidth={2.3} />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-zinc-900">
                      Store Availability & Controls
                    </h2>
                    <p className="text-[11px] font-medium text-zinc-500">
                      Real-time switches for accepting orders & operations
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div
                    onClick={() =>
                      void patch(
                        { isStoreOpen: !isStoreEffectivelyOpen },
                        !isStoreEffectivelyOpen ? "Store opened" : "Store closed"
                      )
                    }
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                        isStoreEffectivelyOpen ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                      }`}>
                        <Power className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-zinc-900">Store Open</p>
                        <p className="text-xs text-zinc-500">
                          {isStoreEffectivelyOpen ? "Customers can place orders now" : "Store is closed. Orders paused"}
                        </p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Store Open"
                      checked={isStoreEffectivelyOpen}
                      onChange={(next) =>
                        void patch({ isStoreOpen: next }, next ? "Store opened" : "Store closed")
                      }
                    />
                  </div>

                  {/* Desktop Manual Override Banner */}
                  {settings.manualOverride && settings.manualOverrideAction === "offline" && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">⏸️</span>
                          <p className="text-xs font-black text-amber-900">Manually Paused (Offline)</p>
                        </div>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                          Store was manually paused. The auto-engine will respect this and will not force you online until tomorrow at {settings.openingTime}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void patch({ manualOverride: false }, "Auto schedule resumed")}
                        className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                      >
                        Resume Auto
                      </button>
                    </div>
                  )}

                  {/* Auto Store Timing Engine Toggle */}
                  <div
                    onClick={() =>
                      void patch(
                        { autoScheduleEnabled: !(settings.autoScheduleEnabled ?? true) },
                        !(settings.autoScheduleEnabled ?? true)
                          ? "Auto store schedule enabled"
                          : "Auto store schedule disabled"
                      )
                    }
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                        <Clock3 className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-zinc-900">Auto Online & Offline</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              (settings.autoScheduleEnabled ?? true)
                                ? "bg-indigo-50 border border-indigo-200 text-indigo-700"
                                : "bg-zinc-100 border border-zinc-200 text-zinc-600"
                            }`}
                          >
                            {(settings.autoScheduleEnabled ?? true) ? "Auto Active" : "Manual Only"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          {(settings.autoScheduleEnabled ?? true)
                            ? `Auto-opens at ${settings.openingTime} & closes at ${settings.closingTime}`
                            : "Manual mode: Store status must be changed manually"}
                        </p>
                        {settings.scheduleStatusText && (settings.autoScheduleEnabled ?? true) && (
                          <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                            ● {settings.scheduleStatusText} {settings.nextScheduledTransition ? `· ${settings.nextScheduledTransition}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <SwitchToggle
                      label="Auto Online & Offline"
                      checked={settings.autoScheduleEnabled ?? true}
                      onChange={(next) =>
                        void patch(
                          { autoScheduleEnabled: next },
                          next ? "Auto store schedule enabled" : "Auto store schedule disabled"
                        )
                      }
                    />
                  </div>

                  <div
                    onClick={() =>
                      void patch(
                        { acceptingNewOrders: !settings.acceptingNewOrders },
                        !settings.acceptingNewOrders ? "Accepting orders" : "Orders paused"
                      )
                    }
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Bike className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-zinc-900">Accepting New Orders</p>
                        <p className="text-xs text-zinc-500">Pause when capacity is reached</p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Accepting Orders"
                      checked={settings.acceptingNewOrders}
                      onChange={(next) =>
                        void patch(
                          { acceptingNewOrders: next },
                          next ? "Accepting orders" : "Orders paused"
                        )
                      }
                    />
                  </div>

                  <div
                    onClick={() => toast.info("Auto-Accept Orders feature is coming soon!")}
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 cursor-not-allowed opacity-80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Zap className="size-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-zinc-900">Auto-Accept Orders</p>
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">Queue bookings without manual verification</p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Auto-Accept Orders"
                      checked={false}
                      disabled={true}
                      onDisabledClick={() => toast.info("Auto-Accept Orders feature is coming soon!")}
                      onChange={() => {}}
                    />
                  </div>

                  <div
                    onClick={() =>
                      void patch(
                        { expressDelivery: !settings.expressDelivery },
                        "Express delivery updated"
                      )
                    }
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        <Timer className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-zinc-900">Express Delivery</p>
                        <p className="text-xs text-zinc-500">12-hour turnaround for express bookings</p>
                      </div>
                    </div>
                    <SwitchToggle
                      label="Express Delivery"
                      checked={settings.expressDelivery}
                      onChange={(next) =>
                        void patch({ expressDelivery: next }, "Express delivery updated")
                      }
                    />
                  </div>

                  {/* Order Buzzer / Chime Test (Desktop) */}
                  <div
                    onClick={() => {
                      testPartnerSoundAndVibration();
                      toast.success("Order alert chime ringing!");
                    }}
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Volume2 className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-zinc-900">Store Order Alert Ringtone</p>
                        <p className="text-xs text-zinc-500">Commercial buzzer & counter bell alert</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-black transition-all cursor-pointer shadow-2xs"
                    >
                      Play Chime 🔊
                    </button>
                  </div>
                </div>
              </section>

              {/* Operational Limits */}
              <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600">
                      <Clock3 className="size-4" strokeWidth={2.3} />
                    </span>
                    <div>
                      <h2 className="text-sm font-black text-zinc-900">
                        Operational Limits & Service Coverage
                      </h2>
                      <p className="text-[11px] font-medium text-zinc-500">
                        Configured store schedule, dispatch boundaries & serviceable PIN codes
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Click to edit
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      icon: Clock3,
                      label: "Working Hours",
                      subtitle: "Store daily timing schedule",
                      value: `${settings.openingTime} – ${settings.closingTime}`,
                      color: "text-blue-600 bg-blue-50",
                      badgeColor: "border-blue-200 text-blue-900",
                      action: () => setHoursModalOpen(true),
                    },
                    {
                      icon: Gauge,
                      label: "Pickup & Delivery SLA Radius",
                      subtitle: `Pickup: ${settings.pickupRadiusKm} km · Dropoff SLA: ${settings.deliveryRadiusKm || 10} km`,
                      value: `${settings.pickupRadiusKm} km / ${settings.deliveryRadiusKm || 10} km`,
                      color: "text-emerald-600 bg-emerald-50",
                      badgeColor: "border-emerald-200 text-emerald-900",
                      action: () => setCoverageModalOpen(true),
                    },
                    {
                      icon: MapPin,
                      label: "Serviceable PIN Codes & Sectors",
                      subtitle: settings.servicePincodes && settings.servicePincodes.length > 0
                        ? `${settings.servicePincodes.join(", ")}`
                        : "Auto-dispatch active within coverage radius",
                      value: `${settings.servicePincodes?.length || 0} PINs`,
                      color: "text-teal-600 bg-teal-50",
                      badgeColor: "border-teal-200 text-teal-900",
                      action: () => setCoverageModalOpen(true),
                    },
                    {
                      icon: Sliders,
                      label: "Daily Order Cap",
                      subtitle: "Maximum daily bookings capacity limit",
                      value: `${settings.dailyOrderCap} orders`,
                      color: "text-purple-600 bg-purple-50",
                      badgeColor: "border-purple-200 text-purple-900",
                      action: () => setCapacityModalOpen(true),
                    },
                    {
                      icon: Clock3,
                      label: "Weekly Off Day",
                      subtitle: "Store maintenance off day",
                      value: settings.weeklyOff || "None (Open 7 Days)",
                      color: "text-amber-600 bg-amber-50",
                      badgeColor: "border-amber-200 text-amber-900",
                      action: () => setHoursModalOpen(true),
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      onClick={row.action}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-2xs transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex size-9 items-center justify-center rounded-xl ${row.color}`}>
                          <row.icon className="size-4.5" strokeWidth={2.2} />
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                              {row.label}
                            </p>
                            <Pencil className="size-3 text-zinc-400 group-hover:text-emerald-600 transition-colors" />
                          </div>
                          <p className="text-[10px] text-zinc-500">{row.subtitle}</p>
                        </div>
                      </div>
                      <span className={`rounded-xl border bg-white px-3 py-1.5 text-xs font-black shadow-2xs ${row.badgeColor}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Security, Devices & Compliance on Desktop */}
            <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-100">
                <span className="flex size-8 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                  <ShieldCheck className="size-4" strokeWidth={2.3} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Security, Devices &amp; Compliance</h3>
                  <p className="text-[10px] text-zinc-500">
                    Device sessions, legal agreements, merchant SLA &amp; store account management
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {/* All Logged-in Devices Card */}
                <button
                  type="button"
                  onClick={() => setDevicesModalOpen(true)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200">
                      <Smartphone className="size-4.5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-zinc-900">All Logged-in Devices</p>
                        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-black uppercase text-emerald-700">
                          {sessions.length || 1}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500">Active sessions &amp; logout</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-zinc-400" />
                </button>

                {/* Legal & Privacy Card */}
                <button
                  type="button"
                  onClick={() => setLegalModalOpen(true)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/50 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200">
                      <Scale className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Legal &amp; Privacy</p>
                      <p className="text-[10px] text-zinc-500">Terms, SLA &amp; Grievance</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-zinc-400" />
                </button>

                {/* Account Closure Card */}
                <button
                  type="button"
                  onClick={() => setCloseAccountOpen(true)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-red-200 bg-red-50/50 hover:bg-red-50 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                      <Trash2 className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-xs font-black text-red-700">Account Closure</p>
                      <p className="text-[10px] text-red-500">De-list store request</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-red-400" />
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Account Closure Confirmation Dialog with Strict PAN & DOB Matching */}
      {closeAccountOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200 text-left space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 ring-4 ring-red-50">
                <Trash2 className="size-6" />
              </span>
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-zinc-950">Store Account Deletion &amp; De-listing</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Permanently close and remove your store from the QuickPress merchant network.
                </p>
              </div>
            </div>

            {/* Statutory Compliance Notice */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 leading-relaxed">
              ⚠️ <strong>Mandatory Security Verification:</strong> Under QuickPress Partner Guidelines, account closure requires verifying your registered <strong>Business PAN Card</strong> and <strong>Owner Date of Birth (DOB)</strong> against database records. All active/pending orders must be delivered or settled first.
            </div>

            {/* Error Banner */}
            {closureError ? (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 animate-in fade-in">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">{closureError}</div>
              </div>
            ) : null}

            {/* Form Fields */}
            <div className="space-y-4">
              {/* PAN Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-700">
                  Registered Business PAN Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                  <input
                    type="text"
                    maxLength={10}
                    value={panInput}
                    onChange={(e) => {
                      setPanInput(e.target.value.toUpperCase());
                      if (closureError) setClosureError(null);
                    }}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full h-11 pl-10 pr-3.5 rounded-2xl border border-zinc-200 bg-white text-xs font-mono font-bold tracking-wider text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none uppercase"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">10-character Income Tax PAN registered during store onboarding</p>
              </div>

              {/* DOB Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-700">
                  Registered Owner Date of Birth (DOB) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                  <input
                    type="date"
                    value={dobInput}
                    onChange={(e) => {
                      setDobInput(e.target.value);
                      if (closureError) setClosureError(null);
                    }}
                    className="w-full h-11 pl-10 pr-3.5 rounded-2xl border border-zinc-200 bg-white text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Must match registered merchant Aadhaar / KYC record</p>
              </div>

              {/* Reason Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-700">
                  Reason for Account Closure
                </label>
                <select
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl border border-zinc-200 bg-white text-xs font-bold text-zinc-900 focus:border-zinc-900 focus:outline-none cursor-pointer"
                >
                  <option value="Relocating business / Moving store">Relocating business / Moving store</option>
                  <option value="Operational hiatus / Taking a break">Operational hiatus / Taking a break</option>
                  <option value="Switching business model">Switching business model</option>
                  <option value="Personal reasons">Personal reasons</option>
                  <option value="Other reasons">Other reasons</option>
                </select>
              </div>

              {/* Statutory Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 bg-zinc-50/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmCheck}
                  onChange={(e) => setConfirmCheck(e.target.checked)}
                  className="size-4 mt-0.5 rounded border-zinc-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-zinc-700 leading-relaxed">
                  I verify that I am the registered store owner. I understand that once verified, this store will be permanently de-listed, all login sessions will be purged, and outstanding customer orders must be 0.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCloseAccountOpen(false);
                  setClosureError(null);
                }}
                disabled={closing}
                className="flex-1 h-11 rounded-2xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-100 active:scale-[0.98] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAccountClosure}
                disabled={closing || !panInput || !dobInput || !confirmCheck}
                className="flex-1 h-11 rounded-2xl bg-red-600 text-xs font-black text-white hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {closing ? "Verifying & Closing..." : "Verify & Close Store"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 4. All Logged-in Devices Modal */}
      {devicesModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200 text-left space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800 border border-zinc-200">
                  <Smartphone className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-zinc-950">All Logged-in Devices</h3>
                  <p className="text-xs text-zinc-500">
                    Active sessions across terminals, tablets &amp; mobile devices
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDevicesModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Current Device Card */}
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                This Device (Current Session)
              </p>
              <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 border border-emerald-200 shadow-2xs">
                    <Laptop className="size-5" />
                    <span className="absolute -top-1 -right-1 flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-zinc-900">
                        {sessions[0]?.deviceName || "Main Store Counter Terminal"}
                      </p>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-md">
                        Active Now
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 font-medium">
                      {sessions[0]?.browser || "Chrome / Web"} · IP: {sessions[0]?.ipAddress || "Active"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Active Sessions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  Other Active Devices ({Math.max(0, sessions.length - 1)})
                </p>
              </div>

              {sessions.length > 1 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {sessions.slice(1).map((s, idx) => (
                    <div
                      key={s.id || idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200/90 bg-zinc-50/60"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-700 border border-zinc-200">
                          <Smartphone className="size-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-zinc-900 truncate">
                            {s.deviceName || "Merchant Terminal"}
                          </p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {s.browser || "Web Browser"} · IP: {s.ipAddress || "Active"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-center">
                  <p className="text-xs font-bold text-zinc-700">No other active devices</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Your account is securely logged in only on this current terminal.
                  </p>
                </div>
              )}
            </div>

            {/* Logout Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRevokeOtherSessions}
                disabled={revokingOthers || sessions.length <= 1}
                className="w-full h-11 rounded-2xl border border-red-200 bg-red-50 text-xs font-black text-red-600 hover:bg-red-100/80 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                {revokingOthers ? "Logging out all other devices..." : "Log Out All Other Devices"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 5. Legal & Privacy Modal with Real Vector Icons */}
      {legalModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200 text-left space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800 border border-zinc-200">
                  <Scale className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-zinc-950">Legal &amp; Privacy</h3>
                  <p className="text-xs text-zinc-500">
                    Merchant governance, partner protection &amp; statutory compliance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLegalModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Real Vector Lucide Icon Links (Zero Cartoon Emojis) */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs divide-y divide-zinc-100">
              {/* Privacy Policy */}
              <a
                href="https://withquickpress.com/#privacy"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="size-5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900">Privacy Policy</p>
                    <p className="text-xs font-medium text-zinc-500 truncate">
                      Partner data protection &amp; DPDP compliance
                    </p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-zinc-400 shrink-0" />
              </a>

              {/* Terms & Conditions */}
              <a
                href="https://withquickpress.com/#terms"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <FileText className="size-5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900">Terms &amp; Conditions</p>
                    <p className="text-xs font-medium text-zinc-500 truncate">
                      Merchant SLA &amp; Quality Codes
                    </p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-zinc-400 shrink-0" />
              </a>

              {/* Payment & Settlement */}
              <div className="flex items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <CreditCard className="size-5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900">Payment &amp; Settlement</p>
                    <p className="text-xs font-medium text-zinc-500 truncate">
                      Automated bank payouts &amp; double-entry settlement
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                  Active
                </span>
              </div>

              {/* Grievance Desk */}
              <a
                href="mailto:official.quickpress@gmail.com?subject=Partner%20Grievance%20Redressal"
                className="flex items-center justify-between p-4 gap-3 transition-colors hover:bg-zinc-50/60 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex size-9.5 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Scale className="size-5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900">Grievance Desk</p>
                    <p className="text-xs font-medium text-zinc-500 truncate">
                      Disputes &amp; dedicated merchant support
                    </p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-zinc-400 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      ) : null}


      {/* 1. Operating Hours & Weekly Off Modal */}
      {settings && hoursModalOpen ? (
        <ShopHoursModal
          open={hoursModalOpen}
          onClose={() => setHoursModalOpen(false)}
          openingTime={settings.openingTime}
          closingTime={settings.closingTime}
          weeklyOff={settings.weeklyOff}
          onSave={async (patchData) => {
            await patch(patchData, "Store operating hours updated");
          }}
        />
      ) : null}

      {/* 2. Coverage Radius, Pincodes & Sectors Modal */}
      {settings && coverageModalOpen ? (
        <ShopCoverageModal
          open={coverageModalOpen}
          onClose={() => setCoverageModalOpen(false)}
          pickupRadiusKm={settings.pickupRadiusKm}
          deliveryRadiusKm={settings.deliveryRadiusKm || 10}
          servicePincodes={settings.servicePincodes || []}
          sectors={settings.sectors || []}
          onSave={async (patchData) => {
            await patch(patchData, "Coverage radius and pincodes updated");
          }}
        />
      ) : null}

      {/* 3. Daily Capacity Limit Modal */}
      {settings && capacityModalOpen ? (
        <ShopCapacityModal
          open={capacityModalOpen}
          onClose={() => setCapacityModalOpen(false)}
          dailyOrderCap={settings.dailyOrderCap}
          onSave={async (patchData) => {
            await patch(patchData, "Daily order capacity updated");
          }}
        />
      ) : null}

      <Toaster />
    </PartnerLayout>
  );
}
