import React, { useEffect, useState, useCallback } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPermissionsStatus,
  requestBothPermissions,
  requestLocationPermission,
  requestNotificationPermission,
  type PermissionState,
  type SystemPermissionsStatus,
} from "@/lib/permissions";

const STORAGE_KEY_PROMPTED = "qp_permissions_prompted_v2";

export function UnifiedPermissionSheet() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<"idle" | "requesting" | "success">("idle");
  const [status, setStatus] = useState<SystemPermissionsStatus>({
    location: "prompt",
    notification: "prompt",
    allGranted: false,
  });

  // Evaluate current permission state
  const evaluatePermissions = useCallback(async () => {
    try {
      const current = await getPermissionsStatus();
      setStatus(current);
      return current;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkInitialPrompt = async () => {
      const current = await evaluatePermissions();
      if (!current) return;

      // If both already granted, no need to show sheet
      if (current.allGranted) return;

      // Check if user dismissed recently (wait at least 24 hours before gentle re-prompt)
      const lastDismissed = localStorage.getItem(STORAGE_KEY_PROMPTED);
      if (lastDismissed) {
        const timeDiff = Date.now() - parseInt(lastDismissed, 10);
        const hoursPassed = timeDiff / (1000 * 60 * 60);
        if (hoursPassed < 24) {
          return;
        }
      }

      // Gentle delay after page loads so initial render is smooth
      timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
    };

    void checkInitialPrompt();

    // Listen for manual trigger anywhere in the app
    const handleManualOpen = () => {
      void evaluatePermissions().then(() => setIsOpen(true));
    };

    window.addEventListener("qp:open-permissions", handleManualOpen);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("qp:open-permissions", handleManualOpen);
    };
  }, [evaluatePermissions]);

  const handleAllowBoth = async () => {
    if (loading) return;
    setLoading(true);
    setActiveStep("requesting");

    try {
      const result = await requestBothPermissions();

      const updated = await evaluatePermissions();

      if (result.notification || updated?.notification === "granted") {
        toast.success("🔔 Order Notifications Active!");
      }

      if (result.location || updated?.location === "granted") {
        toast.success("📍 Live Location Enabled!");
      }

      setActiveStep("success");
      localStorage.setItem(STORAGE_KEY_PROMPTED, Date.now().toString());

      // Auto close smoothly after success state
      setTimeout(() => {
        setIsOpen(false);
        setActiveStep("idle");
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error("[PermissionSheet] Error granting permissions:", err);
      toast.error("Could not complete permission request. You can enable them anytime from settings.");
      setLoading(false);
      setActiveStep("idle");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY_PROMPTED, Date.now().toString());
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const isLocationGranted = status.location === "granted";
  const isNotificationGranted = status.notification === "granted";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-zinc-100 flex flex-col space-y-5 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle on Mobile */}
        <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto sm:hidden -mt-2 mb-1" />

        {/* Header with dual animated icons */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-12 rounded-2xl bg-gradient-to-tr from-[#0c831f]/20 to-emerald-100 flex items-center justify-center text-[#0c831f] shadow-inner">
                <MapPin className="size-6 text-[#0c831f]" />
              </div>
              <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-amber-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                <Bell className="size-3.5 fill-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0c831f] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  QuickPress Express
                </span>
                <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-0.5">
                  <ShieldCheck className="size-3 text-emerald-600" /> 100% Private
                </span>
              </div>
              <h2 className="text-lg font-black text-zinc-900 leading-tight mt-0.5">
                Location & Order Updates
              </h2>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Close"
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Informative Subtitle */}
        <p className="text-xs text-zinc-600 leading-relaxed">
          Enable permissions to detect your exact address for <strong className="text-zinc-900 font-bold">15-minute express laundry</strong> and receive live rider arrival & washing updates.
        </p>

        {/* Interactive Feature Cards */}
        <div className="space-y-2.5">
          {/* 1. Location Card */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
              isLocationGranted
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-zinc-50/80 border-zinc-200/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-9 rounded-xl flex items-center justify-center ${
                  isLocationGranted ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-700"
                }`}
              >
                <MapPin className="size-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-900">📍 Accurate GPS Location</h3>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  Finds nearest hub & ensures delivery in 15 mins
                </p>
              </div>
            </div>

            <div>
              {isLocationGranted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#0c831f] bg-white px-2 py-1 rounded-full border border-emerald-200 shadow-2xs">
                  <Check className="size-3 stroke-[3]" /> Allowed
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Required
                </span>
              )}
            </div>
          </div>

          {/* 2. Notifications Card */}
          <div
            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
              isNotificationGranted
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-zinc-50/80 border-zinc-200/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`size-9 rounded-xl flex items-center justify-center ${
                  isNotificationGranted ? "bg-amber-500 text-white" : "bg-zinc-200 text-zinc-700"
                }`}
              >
                <Bell className="size-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-900">🔔 Live Order Notifications</h3>
                <p className="text-[11px] text-zinc-500 leading-snug">
                  Pickup confirmation, OTPs & delivery rider alerts
                </p>
              </div>
            </div>

            <div>
              {isNotificationGranted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#0c831f] bg-white px-2 py-1 rounded-full border border-emerald-200 shadow-2xs">
                  <Check className="size-3 stroke-[3]" /> Allowed
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Required
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Benefits Pill Banner */}
        <div className="flex items-center justify-around bg-emerald-50/60 rounded-xl py-2 px-3 border border-emerald-100 text-[10px] font-bold text-emerald-900">
          <span className="flex items-center gap-1">
            <Zap className="size-3 text-[#0c831f] fill-[#0c831f]" /> 15-Min Express Pickup
          </span>
          <span className="text-zinc-300">•</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3 text-amber-600" /> Real-time Tracking
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleAllowBoth}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0c831f] hover:bg-[#096e1a] active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0c831f]/25 transition-all cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin text-white" />
                <span>Enabling Permissions...</span>
              </>
            ) : activeStep === "success" ? (
              <>
                <CheckCircle2 className="size-4 text-white" />
                <span>All Permissions Active! 🎉</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-emerald-200 fill-emerald-200" />
                <span>Enable Location & Notifications</span>
                <ChevronRight className="size-4 text-white/80" />
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            disabled={loading}
            className="w-full py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors text-center"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
