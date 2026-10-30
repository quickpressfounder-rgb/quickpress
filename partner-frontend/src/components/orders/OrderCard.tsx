import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  Clock,
  FileText,
  IndianRupee,
  MapPin,
  MoreVertical,
  Package,
  Phone,
  Printer,
  Star,
  Timer,
  Wallet,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  STAGE_LABEL,
  STAGE_TONE,
  formatOrderPlacedTime,
  type ManagedOrder,
  type PaymentStatus,
} from "../../data/partner-orders-mock";
import { partnerRoutes } from "../../navigation/partner-routes";
import { usePartnerOrders } from "../../context/PartnerOrdersContext";
import {
  GarmentSummaryChips,
  OrderSlaAcceptanceTimer,
  DirectContactActions,
  CardHandoverOtpInput,
  PrintBagTagButton,
} from "./OrderQuickTools";
import { OrderActionBar } from "./OrderActionBar";
import type { OrderActionId } from "./order-actions";

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  paid: "bg-secondary/10 text-brand-green-dark",
  pending: "bg-primary/15 text-brand-dark",
  refunded: "bg-muted text-muted-foreground",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Payment pending",
  refunded: "Refunded",
};

export const OrderStatusBadge = React.memo(function OrderStatusBadge({ order }: { order: ManagedOrder }) {
  const stage = order?.stage || "new";
  const tone = STAGE_TONE[stage] || "bg-primary/15 text-brand-dark";
  const label = STAGE_LABEL[stage] || stage || "Active";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider transition-colors duration-500 ${tone}`}
    >
      {label}
    </span>
  );
});

/** Expandable order card with 120 FPS React.memo and CSS containment */
export const OrderCard = React.memo(function OrderCard({
  order,
  index = 0,
  onAction,
  busyAction,
}: {
  order: ManagedOrder;
  index?: number;
  onAction: (order: ManagedOrder, actionId: OrderActionId) => void;
  busyAction?: OrderActionId | null;
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState(1200); // 20:00 prep timer
  const menuRef = useRef<HTMLDivElement>(null);
  const { verifyDispatchOtp } = usePartnerOrders();

  const isNew = order.stage === "new";
  const isAccepted = order.stage === "accepted";
  const isProcessing = order.stage === "processing" || order.stage === "washing" || order.stage === "ironing" || order.stage === "dry_cleaning";
  const isReady = order.stage === "ready" || order.stage === "ready_for_delivery";
  const isOutForDelivery = order.stage === "out_for_delivery" || order.stage === "dispatched";
  const isDelivered = order.stage === "delivered";

  // Close kebab dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Live Prep Countdown
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const formatPrepTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? "0" : ""}${remSecs}`;
  };

  const placedInfo = formatOrderPlacedTime((order as any).placedAt || (order as any).placedAtRaw || order.placedAt);
  const repeatCount = ((order as any).customerRepeatCount || (order.customerRating > 4.5 ? 4 : 2));

  // Rider info
  const rawRider = order.assignedRider || (order as any).rider;
  const riderName = typeof rawRider === "object" ? rawRider?.name : typeof rawRider === "string" ? rawRider : null;

  // Primary Action Button Handler
  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNew) {
      onAction(order, "accept");
    } else if (isAccepted) {
      onAction(order, "process");
    } else if (isProcessing) {
      onAction(order, "ready");
    } else if (isReady) {
      navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } });
    } else {
      navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } });
    }
  };

  return (
    <article
      onClick={() => navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } })}
      className="contain-render relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:shadow-sm cursor-pointer select-none"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: ID: 4002 · 8:03 PM · ⋮                                      */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black tracking-tight text-zinc-950">
          ID: {order.code || order.id.slice(-4)}
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600">
            {placedInfo.time || "8:03 PM"}
          </span>

          {/* Kebab 3-Dots Action Dropdown */}
          <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex size-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer"
              title="More Actions"
            >
              <MoreVertical className="size-4.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl z-30 text-xs animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate({ to: partnerRoutes.orderDetails, params: { orderId: order.id } });
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-bold text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <FileText className="size-3.5 text-zinc-500" />
                  <span>View Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (order.customerPhone) {
                      window.open(`tel:${order.customerPhone.replace(/\s/g, "")}`);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-bold text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <Phone className="size-3.5 text-emerald-600" />
                  <span>Call Customer</span>
                </button>
                <div className="my-1 border-t border-zinc-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    toast.info(`Bag tag printed for Order #${order.code}`);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-bold text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <Printer className="size-3.5 text-zinc-500" />
                  <span>Print Bag Tag</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-ROW: [PREPARING] pill · 4th order by Raj                           */}
      {/* ========================================================================= */}
      <div className="mt-1 flex items-center gap-2.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white ${
            isNew
              ? "bg-amber-500"
              : isProcessing
              ? "bg-[#5B63D3]"
              : isReady
              ? "bg-emerald-600"
              : isOutForDelivery
              ? "bg-blue-600"
              : isDelivered
              ? "bg-emerald-700"
              : "bg-[#5B63D3]"
          }`}
        >
          {isNew
            ? "INCOMING"
            : isAccepted
            ? "CONFIRMED"
            : isProcessing
            ? "PREPARING"
            : isReady
            ? "READY"
            : isOutForDelivery
            ? "DISPATCHED"
            : isDelivered
            ? "DELIVERED"
            : STAGE_LABEL[order.stage]?.toUpperCase() || "ACTIVE"}
        </span>

        <span className="text-xs font-bold text-[#0284c7]">
          {repeatCount}th order by {order.customerName}
        </span>
      </div>

      <div className="my-3 border-t border-zinc-100" />

      {/* ========================================================================= */}
      {/* 3. SPECIAL INSTRUCTIONS: (🧺) Don't send cutlery, tissues and straws      */}
      {/* ========================================================================= */}
      <div className="rounded-lg border border-rose-300 bg-rose-50/25 px-2.5 py-1.5 flex items-center gap-2 text-xs font-medium text-rose-700">
        <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-[11px] font-bold">
          🧺
        </span>
        <span className="truncate">
          {order.specialInstructions || "Handle with care · Fold neatly & pack in eco-friendly laundry bag"}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 4. ITEMIZED ITEMS LIST: ⊡ 1 x Dal Makhani  ₹200.00                       */}
      {/* ========================================================================= */}
      <div className="mt-3.5 space-y-2.5">
        {order.items && order.items.length > 0 ? (
          order.items.slice(0, 4).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {/* Green Veg-food style pristine care square icon */}
                <div className="flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border border-emerald-600 p-[1.5px]">
                  <div className="size-1.5 rounded-full bg-emerald-600" />
                </div>
                <span className="font-bold text-zinc-900 truncate">
                  {item.qty || 1} x {item.name}
                </span>
              </div>
              <span className="shrink-0 font-bold text-zinc-900 font-mono">
                ₹{((item.price || 50) * (item.qty || 1)).toFixed(2)}
              </span>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border border-emerald-600 p-[1.5px]">
                <div className="size-1.5 rounded-full bg-emerald-600" />
              </div>
              <span className="font-bold text-zinc-900">
                {order.itemCount || 3} x Garments (Wash & Fold)
              </span>
            </div>
            <span className="shrink-0 font-bold text-zinc-900 font-mono">
              ₹{order.amount.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="my-3 border-t border-zinc-100" />

      {/* ========================================================================= */}
      {/* 5. BILL & PAYMENT ROW: Total bill [PAID]  ₹400.50                         */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-700 border-b border-dashed border-zinc-400 pb-0.5">
            Total bill
          </span>
          <span className="rounded border border-teal-500 bg-teal-50/50 px-1.5 py-0.2 text-[10px] font-black uppercase tracking-wider text-teal-700">
            {order.paymentMode === "cod" ? "COD" : "PAID"}
          </span>
        </div>

        <span className="text-base font-black text-zinc-950 font-mono tracking-tight">
          ₹{order.amount.toFixed(2)}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 6. RIDER / CAPTAIN STRIP: 🛵 5 riders nearby, assigning one soon          */}
      {/* ========================================================================= */}
      <div className="mt-3.5 flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-700 font-medium">
        <span className="text-base shrink-0 select-none">🛵</span>
        <span className="truncate font-semibold text-zinc-800">
          {riderName
            ? `Captain ${riderName} assigned · En route`
            : "5 riders nearby, assigning one soon"}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 7. FULL-WIDTH PRIMARY ACTION BUTTON: Order ready (20:00)                  */}
      {/* ========================================================================= */}
      <div className="mt-3.5">
        <button
          type="button"
          onClick={handlePrimaryClick}
          disabled={busyAction !== null}
          className={`w-full py-3 rounded-xl text-center text-sm font-black text-white shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${
            isNew
              ? "bg-amber-600 hover:bg-amber-700"
              : isAccepted
              ? "bg-[#1D4ED8] hover:bg-[#1E40AF]"
              : isProcessing
              ? "bg-[#1D4ED8] hover:bg-[#1E40AF]"
              : isReady
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-[#1D4ED8] hover:bg-[#1E40AF]"
          }`}
        >
          {busyAction ? (
            <span>Updating order...</span>
          ) : isNew ? (
            <span>Accept Order (01:45)</span>
          ) : isAccepted ? (
            <span>Start Processing 🧺</span>
          ) : isProcessing ? (
            <span>Order ready ({formatPrepTime(countdown)})</span>
          ) : isReady ? (
            <span>Handover to Captain · Verify OTP 🛵</span>
          ) : isOutForDelivery ? (
            <span>Out for Delivery 🛵</span>
          ) : (
            <span>Order Completed ✓</span>
          )}
        </button>
      </div>
    </article>
  );
});
