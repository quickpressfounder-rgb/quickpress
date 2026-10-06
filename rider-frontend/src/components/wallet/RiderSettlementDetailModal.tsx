import React, { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderCycleBreakdown,
  type RiderCycleBreakdown,
} from "../../api/rider/rider-settlements-api";
import { triggerHaptic } from "../../lib/captain-audio";

interface RiderSettlementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleId: string;
}

export const RiderSettlementDetailModal: React.FC<RiderSettlementDetailModalProps> = ({
  isOpen,
  onClose,
  cycleId,
}) => {
  const [data, setData] = useState<RiderCycleBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUtr, setCopiedUtr] = useState(false);

  useEffect(() => {
    if (!isOpen || !cycleId) return;
    let alive = true;
    setLoading(true);

    fetchRiderCycleBreakdown(cycleId)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch((err) => {
        console.error("Error loading settlement cycle:", err);
        toast.error("Could not load settlement details");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [isOpen, cycleId]);

  if (!isOpen) return null;

  const handleCopyUtr = () => {
    if (!data?.bankDetails?.utr) return;
    triggerHaptic(20);
    navigator.clipboard?.writeText(data.bankDetails.utr);
    setCopiedUtr(true);
    toast.success("UTR Reference copied to clipboard!");
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  const isCurrent = data?.cycle?.isCurrent;
  const isPaid = data?.cycle?.status === "PAID";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 animate-in slide-in-from-bottom-6 duration-200"
        role="dialog"
      >
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Building2 className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-950">
                Settlement Statement
              </h3>
              <p className="text-[11px] font-bold text-zinc-500">
                {data?.cycle?.period || "Weekly Payout Cycle"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-full hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Modal Scrollable Body */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="size-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-zinc-500">
                Calculating trip settlements & bank ledger...
              </p>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-xs font-bold text-zinc-500">
              No settlement data available for this cycle.
            </div>
          ) : (
            <>
              {/* Primary Net Credit Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-zinc-900 text-white shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-200">
                      {isCurrent ? "Current Accruing Payout" : "Net Bank Disbursed"}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      isPaid
                        ? "bg-emerald-400/20 text-emerald-200 border-emerald-400/30"
                        : "bg-amber-400/20 text-amber-200 border-amber-400/30"
                    }`}
                  >
                    {data.cycle.status}
                  </span>
                </div>

                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black tracking-tight">
                    ₹{data.netPayout.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-emerald-200/80">
                    ({data.totalTrips} completed trips)
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-100/90 font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-emerald-300" />
                    <span>Cycle: {data.cycle.period}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock3 className="size-3.5 text-emerald-300" />
                    <span>
                      {isPaid ? `Paid: ${data.cycle.payoutDate}` : `Est. Payout: ${data.cycle.payoutDate}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Bank Account & NPCI UTR Card */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-zinc-600" />
                    <span className="text-xs font-black text-zinc-900">
                      {data.bankDetails.bankName}
                    </span>
                  </div>
                  {data.bankDetails.isVerified && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Verified Account
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-500 block">
                      Account / UPI
                    </span>
                    <span className="font-bold text-zinc-900 font-mono">
                      {data.bankDetails.upiId || data.bankDetails.accountNumberMasked}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-500 block">
                      Transfer Mode
                    </span>
                    <span className="font-bold text-zinc-900 truncate block">
                      {data.bankDetails.transferMode}
                    </span>
                  </div>
                </div>

                {data.bankDetails.utr && (
                  <div className="p-2 bg-white rounded-xl border border-zinc-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
                        Bank UTR / Transaction Ref
                      </span>
                      <span className="text-xs font-mono font-black text-zinc-800">
                        {data.bankDetails.utr}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUtr}
                      className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 active:scale-95 transition-all cursor-pointer"
                      title="Copy UTR"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Itemized Financial Breakdown */}
              <div className="p-4 bg-white rounded-2xl border border-zinc-200 space-y-2.5 shadow-2xs">
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-100">
                  <TrendingUp className="size-3.5 text-emerald-600" />
                  <span>Itemized Settlement Earnings</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 font-medium">Trip Base Delivery Fares</span>
                    <span className="font-black text-zinc-900">
                      +₹{data.breakdown.tripFares.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 font-medium">Distance & Waiting Pay</span>
                    <span className="font-black text-zinc-900">
                      +₹{data.breakdown.distancePay.toFixed(2)}
                    </span>
                  </div>

                  {data.breakdown.surgePay > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600 font-medium">Peak Hour & Weather Surge</span>
                      <span className="font-black text-emerald-700">
                        +₹{data.breakdown.surgePay.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {data.breakdown.questBonuses > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600 font-medium">Milestone Quest Bonuses 🎯</span>
                      <span className="font-black text-amber-700">
                        +₹{data.breakdown.questBonuses.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {data.breakdown.customerTips > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600 font-medium">Customer Doorstep Tips 💝</span>
                      <span className="font-black text-emerald-700">
                        +₹{data.breakdown.customerTips.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-emerald-700">
                    <span className="font-bold flex items-center gap-1">
                      <ShieldCheck className="size-3.5" />
                      Platform Commission (0% Rider Free)
                    </span>
                    <span className="font-black">₹0.00</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-sm">
                    <span className="font-black text-zinc-950">Net Bank Settlement</span>
                    <span className="font-black text-emerald-700">
                      ₹{data.breakdown.netBankCredit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trip-by-Trip List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                    Trips in this Cycle ({data.trips.length})
                  </h4>
                </div>

                {data.trips.length === 0 ? (
                  <div className="p-4 bg-zinc-50 rounded-2xl text-center text-xs text-zinc-400 font-medium">
                    No rides recorded in this weekly settlement cycle.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.trips.map((t, idx) => (
                      <div
                        key={t.tripId || idx}
                        className="p-3 bg-white rounded-xl border border-zinc-200/80 shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-[11px] bg-zinc-100 text-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 font-mono">
                              #{t.orderCode}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-500">
                              {t.rideType} • {t.distanceKm} km
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-700">
                            +₹{t.fare.toFixed(2)}
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-600 truncate font-medium">
                          📍 {t.pickupAddress} ➔ {t.dropAddress}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {t.date}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 z-10 p-3 bg-white border-t border-zinc-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              toast.success("Settlement statement ready to share!");
            }}
            className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
          >
            <FileText className="size-3.5" />
            <span>Download Slip</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 active:scale-98 transition-all cursor-pointer"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
