import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  History,
  MapPin,
  Phone,
  RotateCw,
  ShieldCheck,
  Star,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchRiderHistory } from "../../api/rider/rider-orders-api";
import type { RiderHistoryEntry } from "../../shared/types/rider";
import { triggerHaptic } from "../../lib/captain-audio";
import { CaptainTripDetailView } from "./CaptainTripDetailView";

interface CaptainOrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateOrders?: () => void;
}

export const CaptainOrderHistoryModal: React.FC<CaptainOrderHistoryModalProps> = ({
  isOpen,
  onClose,
  onNavigateOrders,
}) => {
  const [orders, setOrders] = useState<RiderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [selectedTrip, setSelectedTrip] = useState<RiderHistoryEntry | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchRiderHistory();
      setOrders(res || []);
    } catch {
      toast.error("Could not fetch trip history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      setSelectedTrip(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredOrders = orders.filter((o) => {
    if (filter === "completed") return o.outcome === "completed";
    if (filter === "cancelled") return o.outcome === "cancelled";
    return true;
  });

  const completedCount = orders.filter((o) => o.outcome === "completed").length;
  const cancelledCount = orders.filter((o) => o.outcome === "cancelled").length;
  const totalEarnings = orders
    .filter((o) => o.outcome === "completed")
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "Recent Trip";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      triggerHaptic(30);
      toast.success(`${label} copied to clipboard! 📋`);
    } catch {}
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-[90dvh] max-h-[720px] bg-[#F8F9FA] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-zinc-900 border border-zinc-200"
      >
        {/* ========================================================================= */}
        {/* VIEW A: FULL TRIP DETAILS (When a trip is tapped)                         */}
        {/* ========================================================================= */}
        {selectedTrip ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#F4F5F7]">
            {/* Top Detail Header */}
            <div className="px-4 py-3 border-b border-zinc-200/80 bg-white flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setSelectedTrip(null);
                }}
                className="flex items-center gap-1.5 text-xs font-black text-zinc-800 hover:text-zinc-950 p-1.5 -ml-1.5 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowLeft className="size-4" />
                <span>Back to Trips</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="size-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 active:scale-90 transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <CaptainTripDetailView
              trip={selectedTrip}
              onBack={() => {
                triggerHaptic(20);
                setSelectedTrip(null);
              }}
            />
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW B: LIST OF PAST ORDERS / DELIVERIES                                  */
          /* ========================================================================= */
          <>
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-white border-b border-zinc-200/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <History className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950">Order & Trip History</h3>
                  <p className="text-[11px] font-semibold text-emerald-700 font-mono">
                    {orders.length} Recorded Trips · ₹{totalEarnings.toFixed(0)} Payout
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(30);
                    loadHistory();
                  }}
                  disabled={loading}
                  className="size-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 active:scale-90 transition-all cursor-pointer"
                  title="Refresh Trips"
                >
                  <RotateCw className={`size-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="size-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 active:scale-90 transition-all cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="p-3 bg-white border-b border-zinc-200/70 shrink-0">
              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setFilter("all");
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    filter === "all"
                      ? "bg-white text-zinc-950 font-black shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setFilter("completed");
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    filter === "completed"
                      ? "bg-emerald-600 text-white font-black shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Delivered ({completedCount})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setFilter("cancelled");
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    filter === "cancelled"
                      ? "bg-rose-600 text-white font-black shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Cancelled ({cancelledCount})
                </button>
              </div>
            </div>

            {/* Scrollable Order List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {filteredOrders.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-zinc-200 text-center space-y-3 my-auto shadow-2xs">
                  <div className="size-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-500">
                    <Bike className="size-6 text-zinc-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-zinc-900">
                      {filter === "all" ? "No Past Trips Yet" : `No ${filter} trips found`}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-medium max-w-xs mx-auto leading-relaxed">
                      Deliveries accepted from your queue will automatically be logged here with OTP receipts and wallet credits.
                    </p>
                  </div>
                  {onNavigateOrders && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateOrders();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <span>Go to Live Orders</span>
                      <span>➔</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isCompleted = order.outcome === "completed";

                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        triggerHaptic(30);
                        setSelectedTrip(order);
                      }}
                      className="p-3.5 rounded-2xl border border-zinc-200/90 bg-white shadow-2xs hover:border-emerald-300 active:scale-98 transition-all cursor-pointer space-y-2"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-200">
                            #{order.code || order.id.slice(-6).toUpperCase()}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 className="size-3 text-emerald-600" />
                                <span>Delivered</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="size-3 text-rose-600" />
                                <span>Cancelled</span>
                              </>
                            )}
                          </span>
                        </div>

                        <span className="text-xs font-black font-mono text-emerald-700">
                          +₹{Number(order.amount || 0).toFixed(0)}
                        </span>
                      </div>

                      {/* Route Path (Pickup -> Drop) */}
                      <div className="text-xs space-y-1.5 py-1">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                          <p className="text-[11px] font-bold text-zinc-900 truncate">
                            {order.pickupAddress || order.partnerName || "Kasganj Hub"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                          <p className="text-[11px] font-bold text-zinc-900 truncate">
                            {order.dropAddress || order.customerName || "Customer Destination"}
                          </p>
                        </div>
                      </div>

                      {/* Footer Row */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-zinc-400" />
                          <span>{formatDate(order.date)}</span>
                          <span>•</span>
                          <span>{order.distanceKm || 2.5} km</span>
                        </div>

                        <div className="flex items-center gap-1 text-emerald-700 font-black">
                          <span>View Full Details</span>
                          <ChevronRight className="size-3" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
