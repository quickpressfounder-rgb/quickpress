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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-white shadow-2xl border border-amber-500/40">
        {/* Top Header Bar */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-r from-amber-600/30 via-orange-600/20 to-amber-500/30 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex size-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-3.5 bg-amber-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                New Incoming Laundry Order
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-zinc-300 hover:bg-white/20 transition-all cursor-pointer"
                title={isMuted ? "Unmute siren" : "Mute siren"}
              >
                {isMuted ? <VolumeX className="size-3.5 text-rose-400" /> : <Volume2 className="size-3.5 text-amber-400 animate-pulse" />}
                <span>{isMuted ? "Muted" : "Ringing"}</span>
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="flex items-center justify-center size-7 rounded-full bg-white/15 text-zinc-300 hover:bg-white/25 hover:text-white transition-all cursor-pointer"
                title="Back to Dashboard / Dismiss Alert"
                aria-label="Back to Dashboard"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Countdown Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-bold text-zinc-400 mb-1">
              <span>5-Minute SLA Guarantee:</span>
              <span className="text-amber-400 font-mono font-black">{formattedCountdown} remaining</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${
                  countdown < 60 ? "bg-rose-500" : countdown < 120 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Highlight Earnings & Items Card */}
          <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 p-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Estimated Net Store Earnings
              </span>
              <div className="text-3xl font-black text-amber-400 tracking-tight">
                ₹{order.estimatedEarnings}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-400 border border-emerald-500/30">
                <Package className="size-3.5" />
                <span>{order.itemsCount || order.items.length} Items</span>
              </span>
              {order.expressDelivery && (
                <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
                  ⚡ Express 12-Hr
                </div>
              )}
            </div>
          </div>

          {/* ⚡ Express Priority Alert Banner */}
          {(order.isExpress || order.expressDelivery) && (
            <div className="rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/30 via-orange-500/25 to-amber-500/20 p-4 shadow-xl animate-pulse">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="size-10 rounded-2xl bg-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 border border-amber-400/50">
                    <Zap className="size-6 fill-amber-400" />
                  </span>
                  <div>
                    <span className="text-sm font-black text-amber-300 tracking-wide block uppercase">
                      ⚡ EXPRESS + EXPRESS CHARGES KA {order.expressPartnerSharePercent || 20}% BONUS
                    </span>
                    <span className="text-xs text-zinc-200">
                      Priority express order! Surcharge bonus credited directly to your store payout.
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-zinc-300 block uppercase">Bonus</span>
                  <span className="text-xl font-black text-amber-300">
                    +₹{order.partnerExpressBonus || Math.round((order.expressFee || 40) * 0.2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Customer & Location */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="size-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-zinc-400">Customer Pickup Address:</div>
                <div className="text-sm font-semibold text-zinc-100 leading-snug">
                  {order.pickupAddress}
                </div>
                <div className="mt-1 text-xs font-bold text-zinc-300">
                  Customer: <span className="text-white font-black">{order.customerName}</span>
                </div>
              </div>
            </div>

            {order.pickupSlot && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-xs text-zinc-400">
                <Clock className="size-4 text-zinc-400" />
                <span>Pickup Slot: <strong className="text-zinc-200">{order.pickupSlot}</strong></span>
              </div>
            )}
          </div>

          {/* Laundry Services Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Service Items ({order.items.length})
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs border border-white/5"
                >
                  <span className="font-semibold text-zinc-200">{item.name}</span>
                  <span className="font-mono font-bold text-amber-400">
                    x{item.quantity} {item.unit || "pcs"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reject Reason Form (if open) */}
          {showRejectBox && (
            <div className="space-y-2 rounded-2xl bg-rose-950/40 border border-rose-500/30 p-3 animate-in fade-in">
              <label className="text-[11px] font-bold text-rose-300">
                Select or Enter Reason for Rejection:
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Store at max capacity / Steam press boiler maintenance"
                className="w-full rounded-xl bg-black/50 border border-rose-500/40 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-rose-400"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleAccept}
              disabled={isAccepting || countdown === 0}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 font-black text-sm uppercase tracking-wider text-black shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="size-5 stroke-[2.5]" />
              <span>{isAccepting ? "Accepting Order..." : "ACCEPT ORDER NOW"}</span>
            </button>

            {!showRejectBox ? (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white active:scale-[0.98] transition-all cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Back to Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectBox(true)}
                  className="flex h-11 flex-1 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-xs font-bold text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 active:scale-[0.98] transition-all cursor-pointer"
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
                  className="flex h-11 px-4 items-center justify-center rounded-2xl border border-white/10 text-xs font-bold text-zinc-400 hover:bg-white/10 cursor-pointer"
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
