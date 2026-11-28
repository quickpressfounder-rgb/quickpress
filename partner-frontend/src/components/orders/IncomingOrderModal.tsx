import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Check,
  Clock,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import type { ManagedOrder } from "../../data/partner-orders-mock";
import { inr } from "../../lib/currency";

const PARTNER_SLA_SECONDS = 120;

const REJECT_REASONS = [
  "Machines at full capacity",
  "Closing shop shortly",
  "Garment service unavailable",
  "Staff / Captain shortage",
];

const PREP_PRESETS = [15, 20, 30, 45];

export type IncomingOrderModalProps = {
  order: ManagedOrder | null;
  onAccept: (orderId: string, prepTimeMinutes: number) => Promise<void>;
  onReject: (orderId: string, reason: string) => Promise<void>;
  onDismiss?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

function sanitizeCustomerName(name?: string): string {
  if (!name) return "QuickPress Customer";
  const trimmed = name.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  const looksLikePhone = /^[+\d\s\-()]+$/.test(trimmed) && digitsOnly.length >= 10;
  if (looksLikePhone || (trimmed.toLowerCase().includes("customer") && digitsOnly.length >= 10)) {
    return "QuickPress Customer";
  }
  return trimmed;
}

/**
 * Clean, high-focus incoming order alert overlay ("Order Aate Time").
 * Portal-rendered to document.body with live SLA bar, mute toggle,
 * net store payout breakdown, garment items, prep time selector,
 * decline reason sheet, and instant 1-tap acceptance.
 */
export function IncomingOrderModal({
  order,
  onAccept,
  onReject,
  onDismiss,
  isMuted = false,
  onToggleMute,
}: IncomingOrderModalProps) {
  const [mounted, setMounted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PARTNER_SLA_SECONDS);
  const [prepMinutes, setPrepMinutes] = useState(20);
  const [showRejectStep, setShowRejectStep] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>(REJECT_REASONS[0] ?? "Machines at full capacity");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!order) return;
    setSecondsLeft(PARTNER_SLA_SECONDS);
    setPrepMinutes(20);
    setShowRejectStep(false);
    setSelectedReason(REJECT_REASONS[0] ?? "Machines at full capacity");
    setSubmitting(false);

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [order?.id]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  if (!order || !mounted || typeof document === "undefined") return null;

  const progressPct = Math.max(0, Math.min(100, (secondsLeft / PARTNER_SLA_SECONDS) * 100));
  const isUrgent = secondsLeft <= 30;
  const totalAmount = Number(order.amount || order.charges?.total || 0);
  const expressBonus = Number(order.partnerExpressBonus || 0);
  const customerName = sanitizeCustomerName(order.customerName);

  const handleConfirmAccept = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onAccept(order.id, prepMinutes);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onReject(order.id, selectedReason);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-order-title"
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-zinc-950/65 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full sm:max-w-lg overflow-hidden rounded-t-3xl sm:rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
        {/* Live SLA Countdown Strip */}
        <div className="h-1.5 w-full bg-zinc-100">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isUrgent ? "bg-rose-600" : "bg-emerald-600"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`size-2.5 shrink-0 rounded-full ${
                isUrgent ? "bg-rose-500 animate-ping" : "bg-emerald-500 animate-pulse"
              }`}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="incoming-order-title"
                  className="text-sm font-bold tracking-tight text-zinc-950 truncate"
                >
                  New Order Request
                </h2>
                <span className="rounded-md bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 text-[11px] font-bold text-zinc-800 tabular-nums">
                  #{order.code}
                </span>
              </div>
              <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                Accept within SLA to dispatch pickup Captain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums ${
                isUrgent
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-800"
              }`}
            >
              <Clock className="size-3.5" />
              {formattedTimer}
            </span>

            {onToggleMute ? (
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? "Unmute alert alarm" : "Mute alert alarm"}
                title={isMuted ? "Unmute alarm" : "Mute alarm"}
                className={`flex size-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                  isMuted
                    ? "border-zinc-300 bg-zinc-100 text-zinc-700"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            ) : null}

            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                disabled={submitting}
                aria-label="Minimize to queue"
                title="Minimize to queue"
                className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Body */}
        {showRejectStep ? (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3">
              <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-rose-900 leading-relaxed">
                Select why you cannot fulfill order #{order.code}. Repeated declines may lower search ranking.
              </p>
            </div>

            <div className="space-y-2">
              {REJECT_REASONS.map((reason) => {
                const active = selectedReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "border-zinc-900 bg-zinc-50 text-zinc-950"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span>{reason}</span>
                    {active ? <Check className="size-3.5 text-zinc-950" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowRejectStep(false)}
                className="flex-1 h-11 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 cursor-pointer"
              >
                Back to Order
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReject}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Declining..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Net Payout + Payment Mode Card */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Estimated Payout
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold tracking-tight text-zinc-950 tabular-nums">
                    {inr(totalAmount)}
                  </span>
                  {expressBonus > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      <Zap className="size-2.5 fill-amber-600 text-amber-600" />
                      +{inr(expressBonus)} Express
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="text-right space-y-1">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                    order.paymentMode === "online" || order.paymentStatus === "paid"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {order.paymentMode === "online" || order.paymentStatus === "paid"
                    ? "Online Paid"
                    : "Cash Collect"}
                </span>
                {order.isExpress ? (
                  <p className="text-[11px] font-semibold text-amber-700">Priority Express</p>
                ) : (
                  <p className="text-[11px] font-medium text-zinc-500">
                    {order.pickupTime || "Instant Pickup"}
                  </p>
                )}
              </div>
            </div>

            {/* Customer & Pickup Address */}
            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-950">{customerName}</span>
                {order.distanceKm ? (
                  <span className="text-[11px] font-semibold text-zinc-500 tabular-nums">
                    {Number(order.distanceKm).toFixed(1)} km away
                  </span>
                ) : null}
              </div>
              {order.pickupAddress ? (
                <div className="flex items-start gap-2 text-xs text-zinc-600">
                  <MapPin className="size-3.5 text-zinc-400 shrink-0 mt-0.5" />
                  <span className="font-medium leading-snug line-clamp-2">
                    {order.pickupAddress}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Garments List */}
            <div className="rounded-xl border border-zinc-200 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <ShoppingBag className="size-3.5" />
                  Garment Breakdown
                </span>
                <span className="text-xs font-bold text-zinc-900 tabular-nums">
                  {order.itemCount || order.items?.reduce((s, i) => s + (i.qty || 1), 0) || 1} pcs
                </span>
              </div>

              {order.items && order.items.length > 0 ? (
                <div className="divide-y divide-zinc-100">
                  {order.items.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.id || `${item.name}-${idx}`}
                      className="flex items-center justify-between py-1.5 text-xs"
                    >
                      <span className="font-semibold text-zinc-900">
                        {item.qty || 1}× {item.name}
                        {item.service ? (
                          <span className="ml-1.5 font-medium text-zinc-500 capitalize">
                            ({item.service})
                          </span>
                        ) : null}
                      </span>
                      {item.price > 0 ? (
                        <span className="font-semibold text-zinc-700 tabular-nums">
                          {inr(item.price * (item.qty || 1))}
                        </span>
                      ) : null}
                    </div>
                  ))}
                  {order.items.length > 5 ? (
                    <p className="pt-1.5 text-[11px] font-semibold text-zinc-500">
                      +{order.items.length - 5} more garment items
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs font-medium text-zinc-700">
                  {order.services?.length
                    ? order.services.join(", ")
                    : "Standard Laundry & Care"}
                </p>
              )}

              {order.specialInstructions ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] font-medium text-amber-900 flex items-start gap-2">
                  <Sparkles className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>Note: {order.specialInstructions}</span>
                </div>
              ) : null}
            </div>

            {/* Readiness / Prep Time Control */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold text-zinc-950">Intake & Sorting Buffer</p>
                <p className="text-[11px] font-medium text-zinc-500">
                  Captain arrival & processing ETA
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPrepMinutes((m) => Math.max(10, m - 5))}
                  aria-label="Decrease minutes"
                  className="flex size-7 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 cursor-pointer"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-12 text-center text-xs font-bold text-zinc-950 tabular-nums">
                  {prepMinutes}m
                </span>
                <button
                  type="button"
                  onClick={() => setPrepMinutes((m) => Math.min(120, m + 5))}
                  aria-label="Increase minutes"
                  className="flex size-7 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {PREP_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPrepMinutes(preset)}
                  className={`flex-1 rounded-lg border py-1.5 text-[11px] font-semibold transition-colors cursor-pointer tabular-nums ${
                    prepMinutes === preset
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {preset} min
                </button>
              ))}
            </div>

            {/* Footer Accept / Decline CTA */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowRejectStep(true)}
                className="h-11 px-4 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmAccept}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                <Check className="size-4" />
                {submitting ? "Accepting Order..." : `Accept Order · ${inr(totalAmount)}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
