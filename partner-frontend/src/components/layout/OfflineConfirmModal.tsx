import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CalendarOff,
  CheckCircle2,
  Clock,
  Layers,
  PowerOff,
  Radio,
  ShieldCheck,
  X,
} from "lucide-react";

export type PauseReasonOption = {
  id: string;
  label: string;
  subtitle: string;
  durationMinutes?: number;
  icon: "clock" | "capacity" | "closing" | "manual";
};

const OFFLINE_REASONS: PauseReasonOption[] = [
  {
    id: "break_30",
    label: "Short Break (30 min)",
    subtitle: "Pause new pickup requests temporarily",
    durationMinutes: 30,
    icon: "clock",
  },
  {
    id: "busy_60",
    label: "Machines at Capacity (1 hr)",
    subtitle: "Clear active wash & press loads first",
    durationMinutes: 60,
    icon: "capacity",
  },
  {
    id: "closing_today",
    label: "Closing for Today",
    subtitle: "Stay offline until next opening hours",
    icon: "closing",
  },
  {
    id: "manual",
    label: "Manual Hold",
    subtitle: "Remain paused until you switch Live",
    icon: "manual",
  },
];

function ReasonIcon({ icon, selected }: { icon: PauseReasonOption["icon"]; selected: boolean }) {
  const cls = `size-4 ${selected ? "text-zinc-900" : "text-zinc-500"}`;
  switch (icon) {
    case "clock":
      return <Clock className={cls} />;
    case "capacity":
      return <Layers className={cls} />;
    case "closing":
      return <CalendarOff className={cls} />;
    case "manual":
      return <PowerOff className={cls} />;
  }
}

export interface StoreStatusControlModalProps {
  isOpen: boolean;
  mode?: "offline" | "online";
  isLoading?: boolean;
  onClose: () => void;
  onConfirmOffline: (reason: string, durationMinutes?: number) => void;
  onConfirmOnline?: () => void;
}

/**
 * Portal-rendered store online/offline confirmation sheet.
 * Portaling to document.body guarantees the dialog never clips inside
 * sticky/backdrop-blur headers on mobile WebViews or desktop browsers.
 */
export function StoreStatusControlModal({
  isOpen,
  mode = "offline",
  isLoading = false,
  onClose,
  onConfirmOffline,
  onConfirmOnline,
}: StoreStatusControlModalProps) {
  const [selectedReasonId, setSelectedReasonId] = useState<string>("break_30");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedReasonId("break_30");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const isGoingOffline = mode === "offline";
  const selectedOption =
    OFFLINE_REASONS.find((item) => item.id === selectedReasonId) ?? OFFLINE_REASONS[0]!;

  const handleConfirm = () => {
    if (isLoading) return;
    if (isGoingOffline) {
      onConfirmOffline(selectedOption.label, selectedOption.durationMinutes);
    } else if (onConfirmOnline) {
      onConfirmOnline();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-status-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-zinc-950/55 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                isGoingOffline
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600"
              }`}
            >
              {isGoingOffline ? <PowerOff className="size-4.5" /> : <Radio className="size-4.5" />}
            </div>
            <div>
              <h2
                id="store-status-modal-title"
                className="text-base font-bold tracking-tight text-zinc-950"
              >
                {isGoingOffline ? "Pause New Orders?" : "Go Live & Accept Orders?"}
              </h2>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">
                {isGoingOffline
                  ? "Temporarily hide storefront from new customer searches"
                  : "Make storefront visible for instant pickup requests"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        {isGoingOffline ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-900">Active queue stays safe.</span> Accepted and washing orders continue normally while new orders pause.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Select pause duration or reason
              </p>
              <div className="grid grid-cols-1 gap-2">
                {OFFLINE_REASONS.map((option) => {
                  const selected = selectedReasonId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedReasonId(option.id)}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-all cursor-pointer ${
                        selected
                          ? "border-zinc-900 bg-zinc-50/90 ring-1 ring-zinc-900/10"
                          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
                            selected
                              ? "border-zinc-300 bg-white"
                              : "border-zinc-200 bg-zinc-50"
                          }`}
                        >
                          <ReasonIcon icon={option.icon} selected={selected} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-950 truncate">
                            {option.label}
                          </p>
                          <p className="text-[11px] font-medium text-zinc-500 truncate mt-0.5">
                            {option.subtitle}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                          selected ? "border-zinc-900 bg-zinc-900" : "border-zinc-300 bg-white"
                        }`}
                      >
                        {selected ? <span className="size-1.5 rounded-full bg-white" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>Ready to accept orders</span>
              </div>
              <p className="text-xs font-medium text-zinc-600 leading-relaxed pl-6">
                Nearby customers can immediately place pickup and express laundry orders with your store.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-medium text-zinc-600">
              <AlertCircle className="size-3.5 text-zinc-500 shrink-0" />
              <span>Keep order sound notifications unmuted for 2-minute SLA alerts.</span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-5 flex items-center gap-2.5 pt-4 border-t border-zinc-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isGoingOffline ? "Stay Live" : "Keep Offline"}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={`flex-1 h-10 rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5 ${
              isGoingOffline
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isLoading
              ? "Updating..."
              : isGoingOffline
                ? "Confirm Go Offline"
                : "Go Live Now"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface OfflineConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOffline: (reason: string, durationMinutes?: number) => void;
}

/** Backward-compatible export wrapping StoreStatusControlModal in offline mode. */
export function OfflineConfirmModal({
  isOpen,
  onClose,
  onConfirmOffline,
}: OfflineConfirmModalProps) {
  return (
    <StoreStatusControlModal
      isOpen={isOpen}
      mode="offline"
      onClose={onClose}
      onConfirmOffline={onConfirmOffline}
    />
  );
}
