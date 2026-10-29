import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock,
  Headphones,
  PhoneCall,
  RotateCw,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { fetchRiderHistory } from "../api/rider/rider-orders-api";
import type { RiderHistoryEntry } from "../shared/types/rider";
import { triggerHaptic } from "../lib/captain-audio";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { CaptainTripDetailView } from "../components/history/CaptainTripDetailView";
import { useLanguage } from "../lib/i18n";

export function RiderHistoryScreen() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<RiderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<RiderHistoryEntry | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Rapido Screenshot 4 Controls
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [statusFilter, setStatusFilter] = useState<"completed" | "processing" | "cancelled" | "missed">("completed");

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

  // Generate 7 days for the Date Carousel (matching Screenshot 4)
  const carouselDates = useMemo(() => {
    const list: { dayName: string; dayNum: number; iso: string }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
      const dayNum = d.getDate();
      const iso = d.toISOString().split("T")[0];
      list.push({ dayName, dayNum, iso });
    }
    return list;
  }, []);

  // Filter orders according to selected period, date, and status
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Status matching
      if (statusFilter === "completed" && o.outcome !== "completed") return false;
      if (statusFilter === "processing" && o.outcome !== "processing") return false;
      if (statusFilter === "cancelled" && o.outcome !== "cancelled") return false;
      if (statusFilter === "missed" && o.outcome !== "missed" && o.outcome !== "rejected") return false;

      // 2. Date / Period matching
      if (period === "day") {
        if (!o.date) return true;
        const oIso = o.date.split("T")[0];
        return oIso === selectedDate;
      }
      if (period === "week") {
        if (!o.date) return true;
        const oTime = new Date(o.date).getTime();
        const diffDays = (Date.now() - oTime) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }
      if (period === "month") {
        if (!o.date) return true;
        const oTime = new Date(o.date).getTime();
        const diffDays = (Date.now() - oTime) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      }

      return true;
    });
  }, [orders, period, selectedDate, statusFilter]);

  // Aggregate metrics for 2-column card (Screenshot 4)
  const completedOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      if (o.outcome !== "completed") return false;
      if (period === "day") {
        return !o.date || o.date.split("T")[0] === selectedDate;
      }
      return true;
    }).length;
  }, [orders, period, selectedDate]);

  const orderEarnings = useMemo(() => {
    return orders
      .filter((o) => {
        if (o.outcome !== "completed") return false;
        if (period === "day") {
          return !o.date || o.date.split("T")[0] === selectedDate;
        }
        return true;
      })
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  }, [orders, period, selectedDate]);

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

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-[#F8F9FA] shadow-xl overflow-hidden text-zinc-900 select-none font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Matches Rapido Screenshot 4: [ ← All Orders ]  [ 🎧 Help ] )  */}
      {/* ========================================================================= */}
      <header
        className="sticky top-0 z-30 bg-white border-b border-zinc-200/70 shadow-2xs shrink-0 select-none"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 48px)" }}
      >
        <div className="flex items-center justify-between px-4 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (selectedTrip) {
                  triggerHaptic(20);
                  setSelectedTrip(null);
                } else {
                  navigate({ to: "/wallet" });
                }
              }}
              className="p-1.5 -ml-1 text-zinc-900 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-6 text-zinc-950 stroke-[2.2]" />
            </button>
            <h1 className="text-xl font-black tracking-tight text-zinc-950">
              {selectedTrip ? "Trip Receipt" : "All Orders"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setIsHelpOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-95 transition-all text-xs font-bold text-zinc-900 shadow-2xs cursor-pointer"
            >
              <Headphones className="size-3.5 text-zinc-700" />
              <span>Help</span>
            </button>

            {!selectedTrip && (
              <button
                type="button"
                onClick={() => loadHistory(true)}
                disabled={refreshing || loading}
                className="p-2 text-zinc-800 hover:bg-zinc-100 rounded-xl active:scale-90 transition-all cursor-pointer"
                title="Refresh"
              >
                <RotateCw
                  className={`size-4 ${refreshing || loading ? "animate-spin text-emerald-600" : ""}`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Granularity Sub-Tabs: Day, Week, Month (Screenshot 4) */}
        {!selectedTrip && (
          <div className="grid grid-cols-3 text-center text-sm font-bold border-t border-zinc-100">
            {(["day", "week", "month"] as const).map((p) => {
              const active = period === p;
              const label = p === "day" ? "Day" : p === "week" ? "Week" : "Month";
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setPeriod(p);
                  }}
                  className={`py-3 relative cursor-pointer transition-colors capitalize ${
                    active ? "text-zinc-950 font-black" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <span>{label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#FFC700] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
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
        <div
          className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#F8F9FA]"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
        >
          {/* 2.1 Date Carousel Strip (Screenshot 4) */}
          {period === "day" && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {carouselDates.map((item) => {
                const isSelected = item.iso === selectedDate;
                return (
                  <button
                    key={item.iso}
                    type="button"
                    onClick={() => {
                      triggerHaptic(20);
                      setSelectedDate(item.iso);
                    }}
                    className={`flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#104423] text-white px-3.5 py-1.5 rounded-full font-black text-xs shadow-xs"
                        : "text-zinc-600 hover:text-zinc-950 font-bold text-xs px-2.5 py-1.5"
                    }`}
                  >
                    <span>{item.dayName} {item.dayNum}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2.2 2-Column Summary Card (Screenshot 4: Completed Orders | Order Earnings) */}
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-4 grid grid-cols-2 divide-x divide-zinc-100 text-center">
            <div className="px-2 space-y-1">
              <h3 className="text-3xl font-black text-zinc-950 tracking-tight">
                {completedOrdersCount}
              </h3>
              <p className="text-xs font-semibold text-zinc-500">Completed Orders</p>
            </div>
            <div className="px-2 space-y-1">
              <h3 className="text-3xl font-black text-zinc-950 tracking-tight">
                ₹{orderEarnings.toFixed(0)}
              </h3>
              <p className="text-xs font-semibold text-zinc-500">Order Earnings</p>
            </div>
          </div>

          {/* 2.3 Status Filter Chips (Screenshot 4: Completed, Cancelled, Missed) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "completed", label: "Completed" },
              { id: "processing", label: "In Process" },
              { id: "cancelled", label: "Cancelled" },
              { id: "missed", label: "Missed" },
            ].map((chip) => {
              const active = statusFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setStatusFilter(chip.id as any);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs transition-all cursor-pointer font-bold ${
                    active
                      ? "bg-zinc-950 text-white font-black shadow-xs"
                      : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* 2.4 List of Orders or Empty State */}
          {filteredOrders.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-zinc-200/90 text-center space-y-3 shadow-2xs my-4">
              <div className="size-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-500">
                <Bike className="size-8 text-zinc-700" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-zinc-900">
                  No {statusFilter} orders on this day
                </p>
                <p className="text-xs text-zinc-500 font-medium max-w-xs mx-auto leading-relaxed">
                  Orders completed in your Kasganj service zone will appear here with fare receipts.
                </p>
              </div>
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
                        <span className="text-xs font-black bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-200 tracking-wide">
                          #{order.code || order.id.slice(-6).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            order.outcome === "completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : order.outcome === "processing"
                              ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                              : order.outcome === "missed"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {order.outcome === "completed" ? (
                            <>
                              <CheckCircle2 className="size-3 text-emerald-600" />
                              <span>Completed</span>
                            </>
                          ) : order.outcome === "processing" ? (
                            <>
                              <RotateCw className="size-3 text-blue-600 animate-spin" />
                              <span>In Process</span>
                            </>
                          ) : order.outcome === "missed" ? (
                            <>
                              <Clock className="size-3 text-amber-600" />
                              <span>Missed</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="size-3 text-rose-600" />
                              <span>Cancelled</span>
                            </>
                          )}
                        </span>
                      </div>

                      <span className="text-sm font-black text-emerald-700 tracking-tight">
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
                        <span>Receipt</span>
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
      {/* 3. BOTTOM NAVIGATION                                                      */}
      {/* ========================================================================= */}
      <RiderBottomNav active="orders" />

      {/* ========================================================================= */}
      {/* 4. HELP & SUPPORT MODAL (Screenshot 4)                                     */}
      {/* ========================================================================= */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-zinc-200 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 font-bold">
                  <Headphones className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-950">Captain Support Desk</h3>
                  <p className="text-[11px] text-zinc-500 font-medium">Order History & Fare Discrepancy Assistance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-full hover:bg-zinc-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <a
                href="tel:1800-QUICKPRESS"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <PhoneCall className="size-5 text-emerald-600" />
                  <div>
                    <p className="text-xs font-black text-zinc-900">Call Toll-Free Helpline</p>
                    <p className="text-[10px] text-zinc-500 font-medium">Direct line to Fleet Support Executive</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-zinc-400" />
              </a>

              <a
                href="https://wa.me/917906998218?text=Hello%20QuickPress%20Support,%20I%20have%20a%20query%20about%20my%20order%20history"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💬</span>
                  <div>
                    <p className="text-xs font-black text-zinc-900">WhatsApp Captain Desk</p>
                    <p className="text-[10px] text-zinc-500 font-medium">Chat instantly with dispatch team</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-zinc-400" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs active:scale-95 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
