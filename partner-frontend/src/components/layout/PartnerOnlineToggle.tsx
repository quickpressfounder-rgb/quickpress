import React, { useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePartnerContext } from "../../context/PartnerContext";
import { StoreStatusControlModal } from "./OfflineConfirmModal";

const AUTO_RESUME_STORAGE_KEY = "qp_store_auto_resume_at";

interface PartnerOnlineToggleProps {
  className?: string;
  showScheduleHint?: boolean;
}

function formatRemainingCountdown(targetIso: string | null): string | null {
  if (!targetIso) return null;
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return null;
  const mins = Math.ceil(diffMs / 60000);
  return `${mins}m`;
}

/**
 * Unified store online/offline header pill backed by the portal-rendered
 * StoreStatusControlModal in both directions (Online <-> Offline) plus optional timed auto-resume.
 */
export function PartnerOnlineToggle({
  className = "",
  showScheduleHint = false,
}: PartnerOnlineToggleProps) {
  const { isOnline, setOnline } = usePartnerContext();
  const [modalMode, setModalMode] = useState<"offline" | "online" | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [autoResumeAt, setAutoResumeAt] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(AUTO_RESUME_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [countdownLabel, setCountdownLabel] = useState<string | null>(() =>
    formatRemainingCountdown(autoResumeAt)
  );

  // Sync & auto-resume when a timed pause expires
  useEffect(() => {
    if (isOnline) {
      if (autoResumeAt) {
        setAutoResumeAt(null);
        setCountdownLabel(null);
        try {
          window.localStorage.removeItem(AUTO_RESUME_STORAGE_KEY);
        } catch {}
      }
      return;
    }

    if (!autoResumeAt) {
      setCountdownLabel(null);
      return;
    }

    const tick = () => {
      const nextLabel = formatRemainingCountdown(autoResumeAt);
      if (!nextLabel) {
        setAutoResumeAt(null);
        setCountdownLabel(null);
        try {
          window.localStorage.removeItem(AUTO_RESUME_STORAGE_KEY);
        } catch {}
        void setOnline(true);
        toast.success("Scheduled break ended — Store is back LIVE");
        return;
      }
      setCountdownLabel(nextLabel);
    };

    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [isOnline, autoResumeAt, setOnline]);

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isToggling) return;
    setModalMode(isOnline ? "offline" : "online");
  };

  const handleConfirmOffline = (reason: string, durationMinutes?: number) => {
    setIsToggling(true);
    void setOnline(false);

    if (durationMinutes && durationMinutes > 0) {
      const resumeIso = new Date(Date.now() + durationMinutes * 60000).toISOString();
      setAutoResumeAt(resumeIso);
      setCountdownLabel(`${durationMinutes}m`);
      try {
        window.localStorage.setItem(AUTO_RESUME_STORAGE_KEY, resumeIso);
      } catch {}
    } else {
      setAutoResumeAt(null);
      setCountdownLabel(null);
      try {
        window.localStorage.removeItem(AUTO_RESUME_STORAGE_KEY);
      } catch {}
    }

    setModalMode(null);
    toast.warning(`Store paused: ${reason}`, {
      description: durationMinutes
        ? `Auto-resumes in ${durationMinutes} minutes.`
        : "Switch back to Live anytime to accept orders.",
    });
    window.setTimeout(() => setIsToggling(false), 250);
  };

  const handleConfirmOnline = () => {
    setIsToggling(true);
    void setOnline(true);
    setAutoResumeAt(null);
    setCountdownLabel(null);
    try {
      window.localStorage.removeItem(AUTO_RESUME_STORAGE_KEY);
    } catch {}
    setModalMode(null);
    toast.success("Store is now LIVE — ready to receive laundry orders");
    window.setTimeout(() => setIsToggling(false), 250);
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={isToggling}
        onClick={handleToggleClick}
        aria-pressed={isOnline}
        title={isOnline ? "Click to pause new orders" : "Click to go live"}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer select-none ${
          isOnline
            ? "border-emerald-200 bg-emerald-50/75 text-emerald-800 hover:bg-emerald-100/80"
            : "border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100/80"
        }`}
      >
        {isToggling ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <span
            className={`size-2 rounded-full ${
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            }`}
          />
        )}
        <span className="tracking-tight">
          {isOnline ? "Live" : "Offline"}
        </span>
        {showScheduleHint && !isOnline && countdownLabel ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200/70 tabular-nums">
            <Clock className="size-2.5" />
            {countdownLabel}
          </span>
        ) : null}
      </button>

      <StoreStatusControlModal
        isOpen={modalMode !== null}
        mode={modalMode || (isOnline ? "offline" : "online")}
        isLoading={isToggling}
        onClose={() => setModalMode(null)}
        onConfirmOffline={handleConfirmOffline}
        onConfirmOnline={handleConfirmOnline}
      />
    </div>
  );
}
