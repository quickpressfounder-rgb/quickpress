import React from "react";
import {
  X,
  Clock,
  CheckCircle2,
  Bike,
  Store,
  MapPin,
  KeyRound,
  ShieldCheck,
  Phone,
  Copy,
  Sparkles,
  PackageCheck,
  Check,
  AlertCircle,
  Banknote,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { triggerHaptic } from "../../lib/captain-audio";

export interface RiderTimelineItem {
  id: string;
  label: string;
  description?: string;
  time?: string;
  done?: boolean;
  current?: boolean;
  otp?: string;
  phone?: string;
  address?: string;
}

interface RiderOrderTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: {
    id?: string;
    orderId?: string;
    orderCode?: string;
    code?: string;
    stage?: string;
    status?: string;
    customerName?: string;
    customerPhone?: string;
    customerPhoneMasked?: string;
    pickupAddress?: string;
    pickupTitle?: string;
    storeName?: string;
    partnerName?: string;
    partnerPhone?: string;
    partnerAddress?: string;
    dropAddress?: string;
    dropTitle?: string;
    fare?: number;
    amount?: number;
    estimatedEarning?: number;
    paymentMode?: string;
    paymentType?: string;
    startOtp?: string;
    pickupOtp?: string;
    dispatchOtp?: string;
    deliveryOtp?: string;
    placedAt?: string;
    acceptedAt?: string;
    date?: string;
    timeline?: any[];
  };
}

export const RiderOrderTimelineModal: React.FC<RiderOrderTimelineModalProps> = ({
  isOpen,
  onClose,
  trip,
}) => {
  if (!isOpen) return null;

  const orderCode =
    trip.orderCode ||
    trip.code ||
    (trip.orderId ? trip.orderId.slice(-6).toUpperCase() : (trip.id ? trip.id.slice(-6).toUpperCase() : "LIVE"));

  const rawFare =
    Number(trip.estimatedEarning || trip.fare || trip.amount || 45);
  const isCod =
    trip.paymentMode === "cod" ||
    trip.paymentType === "cod" ||
    String(trip.paymentMode || "").toLowerCase().includes("cash");

  const currentStage = (trip.stage || trip.status || (trip as any).canonicalStatus || "en_route_pickup").toLowerCase();
  const isCompleted =
    currentStage === "completed" ||
    currentStage === "delivered" ||
    currentStage === "delivery_otp_verified" ||
    currentStage === "dropped";
  const isCancelled =
    currentStage === "cancelled" || currentStage === "rejected" || currentStage === "refunded";

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      triggerHaptic(30);
      toast.success(`${label} copied! 📋`);
    } catch {}
  };

  // Canonical 6-stage lifecycle tailored specifically for rider operations
  const steps = [
    {
      id: "accepted",
      title: "Order Offer Accepted",
      sub: "Captain confirmed trip acceptance & started GPS dispatch",
      icon: Bike,
      time: trip.placedAt || trip.date || "Just now",
      isDone: true,
      isCurrent: false,
    },
    {
      id: "arrived_pickup",
      title: "Arrive at Customer Pickup",
      sub: trip.pickupAddress || trip.pickupTitle || "Customer Residence, Kasganj",
      icon: MapPin,
      phone: trip.customerPhone || trip.customerPhoneMasked,
      phoneLabel: "Call Customer",
      isDone:
        currentStage !== "en_route_pickup" &&
        currentStage !== "assigned" &&
        currentStage !== "placed" &&
        currentStage !== "pending" &&
        currentStage !== "partner_accepted" &&
        currentStage !== "rider_searching" &&
        currentStage !== "pickup_rider_assigned" &&
        !isCancelled,
      isCurrent:
        currentStage === "en_route_pickup" ||
        currentStage === "rider_going_to_pickup" ||
        currentStage === "pickup_rider_accepted" ||
        currentStage === "accepted",
    },
    {
      id: "pickup_verified",
      title: "Pickup & Garment Verification (OTP)",
      sub: "Verified secure OTP and loaded bagged garments onto bike",
      icon: KeyRound,
      otp: trip.startOtp || trip.pickupOtp || "Verified at pickup",
      otpLabel: "Pickup OTP",
      isDone:
        [
          "in_trip",
          "picked",
          "picked_up",
          "pickup_otp_verified",
          "in_transit_to_store",
          "at_store",
          "at_partner",
          "at-partner",
          "store_drop_confirmed",
          "store_processing",
          "processing",
          "washing",
          "ironing",
          "ready",
          "ready_pickup_store",
          "ready_for_delivery",
          "out_for_delivery",
          "delivery_otp_pending",
          "completed",
          "delivered",
        ].includes(currentStage) && !isCancelled,
      isCurrent: currentStage === "arrived_pickup" || currentStage === "pickup_otp_pending",
    },
    {
      id: "hub_intake",
      title: "Handover at Laundry Partner Store",
      sub:
        trip.partnerName ||
        trip.storeName ||
        "QuickPress Laundry Hub, Kasganj",
      icon: Store,
      phone: trip.partnerPhone,
      phoneLabel: "Call Store",
      address: trip.partnerAddress,
      isDone:
        [
          "store_drop_confirmed",
          "store_processing",
          "processing",
          "washing",
          "ironing",
          "ready",
          "ready_pickup_store",
          "ready_for_delivery",
          "out_for_delivery",
          "delivery_otp_pending",
          "completed",
          "delivered",
        ].includes(currentStage) && !isCancelled,
      isCurrent:
        currentStage === "in_trip" ||
        currentStage === "picked" ||
        currentStage === "picked_up" ||
        currentStage === "in_transit_to_store" ||
        currentStage === "at_store" ||
        currentStage === "at_partner" ||
        currentStage === "at-partner",
    },
    {
      id: "dispatch_handoff",
      title: "Ready for Delivery & Dispatch Handover",
      sub: "Clean clothes packaged and handed over with dispatch OTP",
      icon: PackageCheck,
      otp: trip.dispatchOtp,
      otpLabel: "Dispatch OTP",
      isDone:
        [
          "dispatch_otp_verified",
          "out_for_delivery",
          "delivery_otp_pending",
          "completed",
          "delivered",
        ].includes(currentStage) && !isCancelled,
      isCurrent:
        currentStage === "ready_pickup_store" ||
        currentStage === "store_processing" ||
        currentStage === "processing" ||
        currentStage === "ready" ||
        currentStage === "ready_for_delivery" ||
        currentStage === "dispatch_otp_pending",
    },
    {
      id: "delivered",
      title: "Customer Doorstep Delivery & Settlement",
      sub: trip.dropAddress || trip.dropTitle || "Customer Destination",
      icon: CheckCircle2,
      otp: trip.deliveryOtp,
      otpLabel: "Delivery OTP",
      isDone: isCompleted,
      isCurrent: currentStage === "out_for_delivery" || currentStage === "delivery_otp_pending",
    },
  ];

  const totalSteps = steps.length;
  const doneCount = isCompleted
    ? totalSteps
    : isCancelled
    ? 0
    : steps.filter((s) => s.isDone).length;
  const progressPercent = isCancelled
    ? 0
    : Math.round((doneCount / totalSteps) * 100);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300 text-zinc-900 font-sans"
      >
        {/* 1. Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
              <Clock className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-zinc-950 tracking-tight">
                  Trip Order Timeline
                </h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                    isCompleted
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : isCancelled
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  {isCompleted
                    ? "Delivered ✓"
                    : isCancelled
                    ? "Cancelled"
                    : "Live Active"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(orderCode, "Order ID")}
                className="text-[11px] font-mono font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 mt-0.5 cursor-pointer"
              >
                <span>Order #{orderCode}</span>
                <Copy className="size-2.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="flex items-center justify-center size-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4.5 stroke-[2.5]" />
          </button>
        </div>

        {/* 2. Quick Payout & COD Float Status Pill */}
        <div className="px-4 py-2.5 bg-zinc-100 border-b border-zinc-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-500">Trip Earning:</span>
            <span className="text-sm font-black text-emerald-700 font-mono">
              ₹{rawFare.toFixed(2)}
            </span>
            <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              0% Commission
            </span>
          </div>

          <div className="flex items-center gap-1 font-bold">
            {isCod ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                <Banknote className="size-3 text-amber-600" />
                <span>COD Order</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                <ShieldCheck className="size-3 text-emerald-600" />
                <span>Prepaid Online</span>
              </span>
            )}
          </div>
        </div>

        {/* 3. Progress Track */}
        {!isCancelled && (
          <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-zinc-600">
              Journey Progress ({doneCount}/{totalSteps} Milestones)
            </span>
            <span className="text-[11px] font-mono font-black text-emerald-700">
              {progressPercent}%
            </span>
          </div>
        )}

        {/* 4. Vertical Stepper Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            const Icon = step.icon;

            return (
              <div key={step.id} className="relative flex gap-3.5 items-start">
                {/* Node Icon & Vertical Connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center size-7 rounded-full shrink-0 shadow-xs transition-all duration-300 ${
                      step.isDone
                        ? "bg-[#00C853] text-white"
                        : step.isCurrent
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse"
                        : "bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    {step.isDone ? (
                      <Check className="size-4 stroke-[3]" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 h-14 transition-colors duration-500 ${
                        step.isDone
                          ? "bg-[#00C853]"
                          : step.isCurrent
                          ? "bg-blue-300"
                          : "bg-zinc-200"
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <h4
                      className={`text-xs font-black ${
                        step.isDone
                          ? "text-zinc-950"
                          : step.isCurrent
                          ? "text-blue-700"
                          : "text-zinc-500"
                      }`}
                    >
                      {step.title}
                    </h4>
                    {step.time && (
                      <span className="text-[10px] font-bold text-zinc-500 shrink-0">
                        {step.time}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-600 font-medium mt-0.5 leading-snug">
                    {step.sub}
                  </p>

                  {/* Active Step Indicator */}
                  {step.isCurrent && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      <span className="size-1.5 rounded-full bg-blue-600 animate-ping" />
                      <span>In Progress Now</span>
                    </div>
                  )}

                  {/* Action row (Phone / OTP) */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {step.phone && (
                      <a
                        href={`tel:${step.phone}`}
                        onClick={() => triggerHaptic(30)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <Phone className="size-3 text-emerald-600" />
                        <span>{step.phoneLabel || "Call"}</span>
                      </a>
                    )}

                    {step.otp && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl shadow-2xs">
                        <KeyRound className="size-3 text-amber-600" />
                        <span>
                          {step.otpLabel}: <span className="font-black">{step.otp}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. Footer */}
        <div className="p-3.5 border-t border-zinc-100 bg-white flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-500">
            QuickPress Real-Time GPS Tracking 🛵
          </span>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="px-5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
};
