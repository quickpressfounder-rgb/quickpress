import { useEffect, useState } from "react";
import {
  BellRing,
  Clock,
  MapPin,
  Package,
  Phone,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import {
  playPartnerOrderAcceptedTone,
  startPartnerOrderAlertRing,
  stopPartnerOrderAlertRing,
} from "../../lib/partner-order-alert-sound";

export interface PartnerIncomingOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  pickupAddress: string;
  pickupSlot?: string;
  estimatedEarnings: number;
  itemsCount: number;
  items: Array<{ name: string; quantity: number; unit?: string }>;
  expressDelivery?: boolean;
  isExpress?: boolean;
  expressFee?: number;
  partnerExpressBonus?: number;
  expressPartnerSharePercent?: number;
  notes?: string;
}

interface PartnerIncomingOrderAlertModalProps {
  order: PartnerIncomingOrder | null;
  onAccept: (orderId: string) => Promise<void> | void;
  onReject: (orderId: string, reason?: string) => Promise<void> | void;
  onClose?: () => void;
}

const PARTNER_SLA_SECONDS = 300; // 5 minutes SLA

export function PartnerIncomingOrderAlertModal({
  order,
  onAccept,
  onReject,
  onClose,
}: PartnerIncomingOrderAlertModalProps) {
  const computeInitialCountdown = () => {
    if (!order) return PARTNER_SLA_SECONDS;
    const now = Date.now();
    const rawDeadline = (order as any).partnerAcceptDeadline;
    if (rawDeadline) {
      const diff = Math.floor((new Date(rawDeadline).getTime() - now) / 1000);
      return Math.max(0, diff > 0 ? diff : PARTNER_SLA_SECONDS);
    }
    const rawPlaced = (order as any).placedAt || (order as any).placedAtRaw;
    if (rawPlaced) {
      const placed = new Date(rawPlaced).getTime();
      const diff = Math.floor((placed + PARTNER_SLA_SECONDS * 1000 - now) / 1000);
      return Math.max(0, diff > 0 ? diff : PARTNER_SLA_SECONDS);
    }
    return PARTNER_SLA_SECONDS;
  };

  const [countdown, setCountdown] = useState<number>(computeInitialCountdown);
  const [isMuted, setIsMuted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);

  useEffect(() => {
    if (!order) {
      stopPartnerOrderAlertRing();
      return;
    }

    setCountdown(computeInitialCountdown());
    setIsAccepting(false);
    setIsRejecting(false);
    setShowRejectBox(false);

    if (!isMuted) {
      startPartnerOrderAlertRing();
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          stopPartnerOrderAlertRing();
          void onReject(order.id, "Auto-rejected: Store acceptance window expired (5 min SLA)");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      stopPartnerOrderAlertRing();
    };
  }, [order, isMuted]);

  if (!order) return null;

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      startPartnerOrderAlertRing();
    } else {
      setIsMuted(true);
      stopPartnerOrderAlertRing();
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    stopPartnerOrderAlertRing();
    playPartnerOrderAcceptedTone();
    try {
      await onAccept(order.id);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    stopPartnerOrderAlertRing();
    try {
      await onReject(order.id, rejectReason || "Store capacity full");
    } finally {
      setIsRejecting(false);
      if (onClose) onClose();
    }
  };

  const handleBack = () => {
    stopPartnerOrderAlertRing();
    if (onClose) onClose();
  };

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const formattedCountdown = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const progressPercent = Math.min(100, Math.max(0, (countdown / PARTNER_SLA_SECONDS) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-card text-foreground shadow-2xl border-2 border-emerald-500/30 animate-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 text-white border-b border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex size-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-80" />
                <span className="relative inline-flex rounded-full size-3.5 bg-amber-400" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                New Incoming Laundry Order
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white hover:bg-white/30 transition-all cursor-pointer backdrop-blur-xs"
                title={isMuted ? "Unmute siren" : "Mute siren"}
              >
                {isMuted ? <VolumeX className="size-3.5 text-rose-200" /> : <Volume2 className="size-3.5 text-amber-300 animate-pulse" />}
                <span>{isMuted ? "Muted" : "Ringing"}</span>
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center size-8 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all cursor-pointer"
                title="Back to Dashboard / Dismiss Alert"
                aria-label="Back to Dashboard"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Countdown Progress Bar */}
          <div className="mt-3.5">
            <div className="flex justify-between text-[11px] font-bold text-emerald-100 mb-1.5">
              <span>5-Minute SLA Guarantee:</span>
              <span className="text-amber-300 font-mono font-black">{formattedCountdown} remaining</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${
                  countdown < 60 ? "bg-rose-400" : countdown < 120 ? "bg-amber-300" : "bg-gradient-to-r from-emerald-300 to-amber-300"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Highlight Earnings & Items Card */}
          <div className="flex items-center justify-between rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 p-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Estimated Net Store Earnings
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                ₹{order.estimatedEarnings}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow-xs">
                <Package className="size-3.5" />
                <span>{order.itemsCount || order.items.length} Items</span>
              </span>
              {order.expressDelivery && (
                <div className="mt-1 text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  ⚡ Express Order
                </div>
              )}
            </div>
          </div>

          {/* ⚡ Express Priority Alert Banner */}
          {(order.isExpress || order.expressDelivery) && (
            <div className="rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-50 to-amber-100/70 dark:from-amber-950/30 dark:to-amber-900/20 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="size-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Zap className="size-5 fill-current" />
                  </span>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200 tracking-wide block uppercase">
                      ⚡ EXPRESS + EXPRESS CHARGES KA {order.expressPartnerSharePercent || 50}% BONUS
                    </span>
                    <span className="text-xs font-medium text-amber-800/90 dark:text-amber-300/80">
                      Priority express order! Surcharge bonus credited directly to your store payout.
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 block uppercase">Bonus</span>
                  <span className="text-xl font-black text-amber-700 dark:text-amber-400">
                    +₹{order.partnerExpressBonus || Math.round((order.expressFee || 40) * 0.2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Customer & Location */}
          <div className="rounded-2xl bg-slate-50 dark:bg-muted/40 border border-slate-200 dark:border-border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 mt-0.5">
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Customer Pickup Address:
                </div>
                <div className="text-sm font-bold text-foreground leading-snug mt-0.5">
                  {order.pickupAddress}
                </div>
                <div className="mt-1 text-xs font-semibold text-muted-foreground">
                  Customer: <span className="font-bold text-foreground">{order.customerName}</span>
                </div>
              </div>
            </div>

            {order.pickupSlot && (
              <div className="flex items-center gap-2 pt-2.5 border-t border-border/60 text-xs text-muted-foreground">
                <Clock className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Pickup Slot: <strong className="text-foreground">{order.pickupSlot}</strong></span>
              </div>
            )}
          </div>

          {/* Laundry Services Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Service Items ({order.items.length})
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-white dark:bg-card px-3.5 py-2.5 text-xs font-bold border border-slate-200/80 dark:border-border shadow-2xs"
                >
                  <span className="font-bold text-foreground">{item.name}</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    x{item.quantity} {item.unit || "pcs"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reject Reason Form (if open) */}
          {showRejectBox && (
            <div className="space-y-2 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3.5 animate-in fade-in">
              <label className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                Select or Enter Reason for Rejection:
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Store at max capacity / Steam press boiler maintenance"
                className="w-full rounded-xl bg-white dark:bg-card border border-rose-300 dark:border-rose-700 px-3 py-2 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={isAccepting || countdown === 0}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-600 hover:from-emerald-700 hover:to-emerald-800 font-black text-sm uppercase tracking-wider text-white shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="size-5 stroke-[2.5]" />
              <span>{isAccepting ? "Accepting Order..." : "ACCEPT ORDER NOW"}</span>
            </button>

            {!showRejectBox ? (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-300 dark:border-border bg-white dark:bg-card text-xs font-bold text-slate-700 dark:text-foreground hover:bg-slate-50 dark:hover:bg-muted active:scale-[0.98] transition-all cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectBox(true)}
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Reject Order
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isRejecting}
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-rose-600 font-bold text-xs text-white hover:bg-rose-500 active:scale-95 transition-all cursor-pointer"
                >
                  {isRejecting ? "Rejecting..." : "Confirm Reject"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="flex h-11 px-4 items-center justify-center rounded-2xl border border-slate-300 dark:border-border text-xs font-bold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
