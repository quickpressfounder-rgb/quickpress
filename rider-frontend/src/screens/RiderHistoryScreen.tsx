import { useNavigate } from "@tanstack/react-router";
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
import { fetchRiderHistory } from "../api/rider/rider-orders-api";
import type { RiderHistoryEntry } from "../shared/types/rider";
import { triggerHaptic } from "../lib/captain-audio";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { CaptainTripDetailView } from "../components/history/CaptainTripDetailView";

export function RiderHistoryScreen() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<RiderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [selectedTrip, setSelectedTrip] = useState<RiderHistoryEntry | null>(null);

  const loadHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetchRiderHistory();
      setOrders(res || []);
      if (isRefresh) {
        triggerHaptic(30);
        toast.success("Order history updated! 🔄");
      }
    } catch {
      toast.error("Could not load trip history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

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
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] shadow-xl overflow-hidden text-zinc-800 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Sticky)                                                    */}
      {/* ========================================================================= */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200/80 shadow-2xs shrink-0"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectedTrip) {
                triggerHaptic(20);
                setSelectedTrip(null);
              } else {
                navigate({ to: "/dashboard" });
              }
            }}
            className="p-2 -ml-1 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-base font-black text-zinc-900 tracking-tight leading-tight flex items-center gap-1.5">
              <span>{selectedTrip ? "Trip Details & Receipt" : "Order & Trip History"}</span>
              <span className="flex size-2 rounded-full bg-emerald-500" />
            </h1>
            <p className="text-[11px] font-semibold text-zinc-500">
              {selectedTrip
                ? `Order #${selectedTrip.code || selectedTrip.id.slice(-6).toUpperCase()}`
                : `${orders.length} Completed Trips · Verified Payouts`}
            </p>
          </div>
        </div>

        {!selectedTrip && (
          <button
            type="button"
            onClick={() => loadHistory(true)}
            disabled={refreshing || loading}
            className="size-8.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 active:scale-90 transition-all cursor-pointer"
            title="Refresh History"
          >
            <RotateCw
              className={`size-4 ${refreshing || loading ? "animate-spin text-emerald-600" : ""}`}
            />
          </button>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN BODY                                                              */}
      {/* ========================================================================= */}
      {selectedTrip ? (
        <CaptainTripDetailView
          trip={selectedTrip}
          onBack={() => {
            triggerHaptic(20);
            setSelectedTrip(null);
          }}
        />
      ) : (

        /* ======================================================================= */
        /* VIEW B: ORDER & TRIP HISTORY LIST PAGE                                  */
        /* ======================================================================= */
        <div
          className="flex-1 overflow-y-auto space-y-3.5 p-3.5 bg-[#F4F5F7]"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
        >
          {/* Payout Hero Summary Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl shadow-lg shadow-emerald-600/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wide flex items-center gap-1.5">
                <History className="size-3.5" />
                <span>Completed Delivery Summary</span>
              </span>
              <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-md">
                {orders.length} Total Trips
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div>
                <p className="text-[11px] text-emerald-100">Total Lifetime Payout</p>
                <h2 className="text-2xl font-black font-mono">
                  ₹{totalEarnings.toFixed(0)}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-black text-white bg-white/20 px-2.5 py-1 rounded-lg">
                  {completedCount} Delivered
                </span>
              </div>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white border border-zinc-200/80 rounded-2xl shadow-2xs text-xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setFilter("all");
              }}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                filter === "all"
                  ? "bg-zinc-950 text-white font-black shadow-xs"
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
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
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
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                filter === "cancelled"
                  ? "bg-rose-600 text-white font-black shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
          </div>

          {/* List of Orders */}
          {filteredOrders.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-zinc-200 text-center space-y-3 shadow-2xs">
              <div className="size-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-500">
                <Bike className="size-7 text-zinc-700" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-zinc-900">
                  {filter === "all" ? "No Delivery Records Found" : `No ${filter} trips found`}
                </p>
                <p className="text-xs text-zinc-500 font-medium max-w-xs mx-auto leading-relaxed">
                  Your accepted trips from the dispatch queue will automatically be recorded here with complete OTP logs and payout receipts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/orders" })}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Go to Live Orders</span>
                <span>➔</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => {
                const isCompleted = order.outcome === "completed";

                return (
                  <div
                    key={order.id}
                    onClick={() => {
                      triggerHaptic(30);
                      setSelectedTrip(order);
                    }}
                    className="p-3.5 rounded-2xl border border-zinc-200/90 bg-white shadow-2xs hover:border-emerald-400 active:scale-98 transition-all cursor-pointer space-y-2.5"
                  >
                    {/* Header: Code + Status + Amount */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
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

                    {/* Timeline Path (Pickup -> Drop) */}
                    <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-2.5 space-y-2 text-xs">
                      {/* Pickup Hub */}
                      <div className="flex items-start gap-2">
                        <span className="flex size-3.5 rounded-full bg-emerald-500 text-white font-bold text-[8px] items-center justify-center shrink-0 mt-0.5">
                          P
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-zinc-900 truncate text-[11px]">
                            {order.partnerName || "Kasganj Hub"}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            {order.pickupAddress || "Kasganj Main Store"}
                          </p>
                        </div>
                      </div>

                      {/* Distance connector */}
                      <div className="ml-1.5 pl-3 border-l-2 border-dashed border-zinc-200 text-[10px] text-zinc-400 font-semibold py-0.5">
                        {order.distanceKm || 2.5} km ride
                      </div>

                      {/* Drop Destination */}
                      <div className="flex items-start gap-2">
                        <span className="flex size-3.5 rounded-full bg-rose-500 text-white font-bold text-[8px] items-center justify-center shrink-0 mt-0.5">
                          D
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-zinc-900 truncate text-[11px]">
                            {order.customerName || "Customer"}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            {order.dropAddress || "Customer Address"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-100 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3 text-zinc-400" />
                        <span>{formatDate(order.date)}</span>
                        <span>•</span>
                        <span className="font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">
                          {order.paymentType || "Online"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-black text-emerald-700">
                        <span>Tap for Full Details</span>
                        <ChevronRight className="size-3.5 text-emerald-700" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 2-TAB BOTTOM NAVIGATION                                                */}
      {/* ========================================================================= */}
      <RiderBottomNav active="dashboard" />
    </div>

  );
}
