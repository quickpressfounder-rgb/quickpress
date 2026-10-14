import React, { useMemo, useState } from "react";
import { RiderOrderTimelineModal } from "./RiderOrderTimelineModal";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Layers,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { triggerHaptic } from "../../lib/captain-audio";

export interface TripDetailData {
  orderId: string;
  orderCode?: string;
  customerName?: string;
  customerPhone?: string;
  customerPhoneMasked?: string;
  pickupAddress: string;
  pickupTitle?: string;
  dropAddress: string;
  dropTitle?: string;
  partnerName?: string;
  partnerAddress?: string;
  partnerPhone?: string;
  distanceKm?: number;
  durationMinutes?: number;
  fare: number;
  baseFare?: number;
  distanceBonus?: number;
  surgeBonus?: number;
  expressBonus?: number;
  tipAmount?: number;
  paymentMode?: string;
  amount?: number;
  pickupOtp?: string;
  dispatchOtp?: string;
  deliveryOtp?: string;
  items?: any[];
  bagCount?: number;
  rideType?: string;
  status?: string;
}

interface RiderTripDetailModalProps {
  trip: TripDetailData;
  isOpen: boolean;
  onClose: () => void;
}

export const RiderTripDetailModal: React.FC<RiderTripDetailModalProps> = ({
  trip,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<"route" | "fare" | "garments">("route");
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Financial calculations
  const baseFare = Number(trip.baseFare ?? 35);
  const distanceKm = Number(trip.distanceKm ?? 2.8);
  const distanceBonus = Number(
    trip.distanceBonus ?? (distanceKm > 2 ? Math.round((distanceKm - 2) * 12) : 0)
  );
  const surgeBonus = Number(trip.surgeBonus ?? 0);
  const expressBonus = Number(trip.expressBonus ?? 0);
  const tipAmount = Number(trip.tipAmount ?? 0);
  const netEarnings = Number(
    trip.fare || baseFare + distanceBonus + surgeBonus + expressBonus + tipAmount
  );

  const isCod =
    (trip.paymentMode || "").toLowerCase().includes("cod") ||
    (trip.paymentMode || "").toLowerCase().includes("cash");
  const codAmount = Number(trip.amount || netEarnings);

  // Canonical status mapping
  const CANONICAL_STATUS_LABELS: Record<string, string> = {
    placed: "Placed",
    pending_partner_acceptance: "Order Placed",
    partner_accepted: "Store Accepted",
    rider_searching: "Searching Captain",
    rider_pickup_assigning: "Searching Captain",
    pickup_rider_assigned: "Pickup Assigned",
    rider_assigned: "Pickup Assigned",
    rider_going_to_pickup: "Heading to Pickup",
    pickup_rider_accepted: "Heading to Pickup",
    rider_accepted: "Heading to Pickup",
    pickup_otp_pending: "Pickup OTP Pending",
    pickup_otp_verified: "Picked Up",
    picked_up: "Picked Up",
    in_transit_to_store: "Heading to Store",
    at_store: "At Store",
    at_partner: "At Store",
    "at-partner": "At Store",
    store_drop_confirmed: "Store Processing",
    processing_started: "In Cleaning",
    processing: "In Cleaning",
    washing: "Washing",
    ironing: "Ironing",
    dry_cleaning: "Dry Cleaning",
    ready: "Ready for Dispatch",
    ready_for_delivery: "Ready for Dispatch",
    completed: "Ready for Dispatch",
    delivery_rider_assigned: "Delivery Assigned",
    delivery_rider_accepted: "Delivery Accepted",
    dispatch_otp_pending: "Store Handover OTP",
    dispatch_otp_verified: "Out for Delivery",
    out_for_delivery: "Out for Delivery",
    delivery_otp_pending: "Delivery OTP Pending",
    delivery_otp_verified: "Delivered",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refund_pending: "Refund Pending",
    refunded: "Refunded",
  };

  const statusKey = String((trip as any).canonicalStatus || trip.status || "").toLowerCase().trim();
  const statusDisplay = CANONICAL_STATUS_LABELS[statusKey] || trip.status || "Active Trip";
  const isDelivered = statusKey === "delivered" || statusKey === "completed";
  const isCancelled = statusKey === "cancelled" || statusKey === "refunded" || statusKey === "rejected";

  // Determine current active stop based on order state
  const isPickupLeg =
    !isDelivered &&
    !isCancelled &&
    !statusKey.includes("delivery") &&
    !statusKey.includes("dispatch") &&
    !statusKey.includes("out_for_delivery") &&
    !statusKey.includes("processing") &&
    !statusKey.includes("washing") &&
    !statusKey.includes("ironing") &&
    !statusKey.includes("ready");

  const isStoreHandoff =
    statusKey.includes("transit_to_store") ||
    statusKey.includes("at_store") ||
    statusKey.includes("picked_up");

  const currentStopTitle = isPickupLeg
    ? "Stop 1: Customer Pickup"
    : isStoreHandoff
    ? "Stop 2: Partner Store Drop"
    : "Stop 3: Customer Delivery";

  const currentStopAddress = isPickupLeg
    ? trip.pickupAddress
    : isStoreHandoff
    ? trip.partnerAddress || "QuickPress Partner Laundromat Store"
    : trip.dropAddress;

  const currentContactPhone = isPickupLeg || !isStoreHandoff
    ? trip.customerPhone || trip.customerPhoneMasked
    : trip.partnerPhone;

  const currentContactName = isPickupLeg
    ? trip.customerName || "Customer"
    : isStoreHandoff
    ? trip.partnerName || "Partner Laundromat"
    : trip.customerName || "Customer";

  // Action handlers
  const handleOpenMaps = (addr: string) => {
    triggerHaptic(25);
    const destination = encodeURIComponent(addr);
    // Universal Google Maps navigation URL with directions mode
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=two-wheeler`;
    window.open(url, "_blank");
  };

  const handleCall = (phone?: string) => {
    if (!phone) {
      toast.error("Contact number not available");
      return;
    }
    triggerHaptic(30);
    window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
  };

  const handleWhatsApp = (phone?: string, name?: string) => {
    if (!phone) {
      toast.error("Contact number not available");
      return;
    }
    triggerHaptic(20);
    const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+?91/, "91");
    const code = trip.orderCode || trip.orderId.slice(-6).toUpperCase();
    const msg = encodeURIComponent(
      `Namaste ${name || ""}! Main QuickPress Captain hoon aapke Order #${code} ke liye. Main aapki location ke pass hoon.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleCopyText = (text: string, key: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      triggerHaptic(20);
      setCopiedKey(key);
      toast.success(`${label} copied! 📋`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Unable to copy to clipboard");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 animate-in slide-in-from-bottom-8 duration-200"
        role="dialog"
      >
        {/* Top Drag Handle for Touch Ergonomics */}
        <div className="flex justify-center pt-2.5 pb-1 bg-white cursor-pointer" onClick={onClose}>
          <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
        </div>

        {/* Clean Sticky Header */}
        <header className="px-5 py-3 bg-white border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center size-9 rounded-2xl bg-emerald-500 text-white shadow-xs font-black">
              <Bike className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-zinc-950 tracking-tight">
                  #{trip.orderCode || trip.orderId.slice(-6).toUpperCase()}
                </h3>
                <span
                  className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    isDelivered
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : isCancelled
                      ? "bg-rose-100 text-rose-800 border-rose-300"
                      : "bg-blue-100 text-blue-900 border-blue-300"
                  }`}
                >
                  {statusDisplay}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-zinc-500 truncate">
                {trip.rideType === "delivery" ? "Delivery Leg" : "Pickup & Drop Leg"} • {distanceKm.toFixed(1)} km total
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            aria-label="Close"
            className="size-9 flex items-center justify-center text-zinc-500 hover:text-zinc-950 rounded-full hover:bg-zinc-100 active:scale-90 transition-all cursor-pointer border border-zinc-200/60"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* CURRENT ACTIVE TARGET / HERO ACTION CARD */}
        {!isDelivered && !isCancelled && (
          <div className="mx-4 mt-3 p-4 rounded-2xl bg-slate-950 text-white shadow-lg space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Next Stop: {currentStopTitle}</span>
              </span>
              <span className="text-xs font-bold text-zinc-400">
                ~{trip.durationMinutes || 18} mins away
              </span>
            </div>

            <div>
              <p className="text-sm font-black text-white flex items-center gap-1.5">
                <User className="size-4 text-emerald-400" />
                <span>{currentContactName}</span>
              </p>
              <p className="text-xs text-zinc-300 font-medium line-clamp-2 mt-0.5">
                {currentStopAddress}
              </p>
            </div>

            {/* High-Contrast Quick Action Buttons (Thumb Sized 48px-52px) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {currentContactPhone ? (
                <button
                  type="button"
                  onClick={() => handleCall(currentContactPhone)}
                  className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  <Phone className="size-4" />
                  <span>Call</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="py-2.5 px-2 rounded-xl bg-zinc-800 text-zinc-500 font-bold text-xs flex items-center justify-center gap-1 opacity-60"
                >
                  <Phone className="size-4" />
                  <span>No Phone</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenMaps(currentStopAddress)}
                className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <Navigation className="size-4" />
                <span>Navigate</span>
              </button>

              {currentContactPhone ? (
                <button
                  type="button"
                  onClick={() => handleWhatsApp(currentContactPhone, currentContactName)}
                  className="py-2.5 px-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <MessageSquare className="size-4 text-emerald-400" />
                  <span>WhatsApp</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCopyText(currentStopAddress, "addr", "Address")}
                  className="py-2.5 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Copy className="size-4" />
                  <span>Copy</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* PAYMENT / CASH WARNING BANNER (High Visibility) */}
        <div className="mx-4 mt-3">
          {isCod ? (
            <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md flex items-center justify-between border-2 border-amber-600 animate-pulse">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-white text-amber-900 flex items-center justify-center shadow-xs">
                  <DollarSign className="size-6 stroke-[3]" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/10 px-2 py-0.5 rounded">
                    CASH ON DELIVERY (COD)
                  </span>
                  <h4 className="text-base font-black leading-tight mt-0.5">
                    COLLECT ₹{codAmount.toFixed(0)} CASH
                  </h4>
                  <p className="text-[11px] font-bold text-amber-950/80">
                    Take cash from customer before handing over clothes!
                  </p>
                </div>
              </div>
              <span className="text-xl font-black bg-white px-2.5 py-1 rounded-xl text-slate-950 shadow-xs">
                ₹{codAmount.toFixed(0)}
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Prepaid Online
                  </span>
                  <h4 className="text-xs font-black text-emerald-950 mt-0.5">
                    ZERO CASH TO COLLECT ✓
                  </h4>
                  <p className="text-[11px] font-medium text-emerald-700">
                    Payment settled online. Do not charge the customer.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg">
                PAID
              </span>
            </div>
          )}
        </div>

        {/* OTP DISPLAY CARD (If Available) */}
        {(trip.pickupOtp || trip.dispatchOtp || trip.deliveryOtp) && (
          <div className="mx-4 mt-2.5 p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                #
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-500 uppercase">
                  {trip.pickupOtp
                    ? "Pickup Verification OTP"
                    : trip.dispatchOtp
                    ? "Store Handover OTP"
                    : "Delivery OTP"}
                </p>
                <p className="text-lg font-black font-mono tracking-widest text-zinc-950">
                  {trip.pickupOtp || trip.dispatchOtp || trip.deliveryOtp}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleCopyText(
                  trip.pickupOtp || trip.dispatchOtp || trip.deliveryOtp || "",
                  "otp",
                  "OTP"
                )
              }
              className="px-3 py-1.5 rounded-xl bg-white border border-zinc-300 text-zinc-800 font-bold text-xs flex items-center gap-1 active:scale-95 shadow-2xs hover:bg-zinc-50"
            >
              {copiedKey === "otp" ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 3-SEGMENT QUICK TABS */}
        <div className="px-4 pt-3 pb-1 border-b border-zinc-100">
          <div className="grid grid-cols-3 p-1 rounded-xl bg-zinc-100 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setActiveTab("route");
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "route"
                  ? "bg-white text-zinc-950 shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Navigation className="size-3.5" />
              <span>Route</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setActiveTab("fare");
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "fare"
                  ? "bg-white text-zinc-950 shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Wallet className="size-3.5 text-emerald-600" />
              <span>Earnings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setActiveTab("garments");
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "garments"
                  ? "bg-white text-zinc-950 shadow-xs font-black"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Package className="size-3.5 text-purple-600" />
              <span>Clothes</span>
            </button>
          </div>
        </div>

        {/* TAB 1: FULL ROUTE & STOPS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "route" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Waypoint 1: Customer Pickup */}
              <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    <span className="text-xs font-black text-zinc-900">
                      Customer Pickup
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenMaps(trip.pickupAddress)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span>Open Maps</span>
                    <ExternalLink className="size-3" />
                  </button>
                </div>

                <div className="pl-8">
                  <p className="text-xs font-bold text-zinc-900">
                    {trip.customerName || "Customer"}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">{trip.pickupAddress}</p>

                  <div className="flex items-center gap-2 mt-2">
                    {trip.customerPhone && (
                      <button
                        type="button"
                        onClick={() => handleCall(trip.customerPhone)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[11px] flex items-center gap-1 border border-emerald-200"
                      >
                        <Phone className="size-3" />
                        <span>Call</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(trip.pickupAddress, "pickup_addr", "Address")
                      }
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-bold text-[11px] flex items-center gap-1"
                    >
                      <Copy className="size-3" />
                      <span>Copy Address</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Waypoint 2: Laundromat Store */}
              <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    <span className="text-xs font-black text-zinc-900">
                      Partner Laundromat Hub
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenMaps(trip.partnerAddress || trip.pickupAddress)
                    }
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <span>Open Maps</span>
                    <ExternalLink className="size-3" />
                  </button>
                </div>

                <div className="pl-8">
                  <p className="text-xs font-bold text-zinc-900">
                    {trip.partnerName || "QuickPress Laundromat Hub"}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {trip.partnerAddress || "Main Laundromat Branch"}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    {trip.partnerPhone && (
                      <button
                        type="button"
                        onClick={() => handleCall(trip.partnerPhone)}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-bold text-[11px] flex items-center gap-1 border border-purple-200"
                      >
                        <Phone className="size-3" />
                        <span>Call Store</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          trip.partnerAddress || "QuickPress Laundromat Hub",
                          "store_addr",
                          "Store Address"
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-bold text-[11px] flex items-center gap-1"
                    >
                      <Copy className="size-3" />
                      <span>Copy Address</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Waypoint 3: Customer Drop */}
              <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                      3
                    </span>
                    <span className="text-xs font-black text-zinc-900">
                      Final Customer Delivery
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenMaps(trip.dropAddress)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>Open Maps</span>
                    <ExternalLink className="size-3" />
                  </button>
                </div>

                <div className="pl-8">
                  <p className="text-xs font-bold text-zinc-900">
                    {trip.customerName || "Customer"}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">{trip.dropAddress}</p>
                </div>
              </div>

              {/* Interactive Timeline Stepper Opener */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setShowTimelineModal(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Clock className="size-4 text-emerald-600" />
                <span>View Full Stage-by-Stage Timeline Sheet ↗</span>
              </button>
            </div>
          )}

          {/* TAB 2: FARE SLIP & CAPTAIN EARNINGS */}
          {activeTab === "fare" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                    <Wallet className="size-4" />
                    <span>Total Captain Earnings</span>
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    <span>0% Commission</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">
                      ₹{netEarnings.toFixed(2)}
                    </h2>
                    <p className="text-[11px] text-emerald-100 font-medium">
                      Direct Wallet & UPI Payout
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-white flex items-center gap-1 justify-end">
                      <Clock className="size-3.5" />
                      <span>~{trip.durationMinutes || 18} mins</span>
                    </p>
                    <p className="text-[11px] text-emerald-100">
                      {distanceKm.toFixed(1)} km total
                    </p>
                  </div>
                </div>
              </div>

              {/* Itemized Fare Slip */}
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2.5 text-xs">
                <h4 className="font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-emerald-600" />
                  <span>Itemized Fare Breakdown</span>
                </h4>

                <div className="divide-y divide-zinc-200 space-y-2 pt-1">
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-600 font-medium">Base Pickup Fare</span>
                    <span className="font-bold text-zinc-900">₹{baseFare.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-zinc-600 font-medium">
                      Distance Pay ({distanceKm.toFixed(1)} km)
                    </span>
                    <span className="font-bold text-zinc-900">₹{distanceBonus.toFixed(2)}</span>
                  </div>

                  {surgeBonus > 0 && (
                    <div className="flex items-center justify-between pt-2 text-purple-700 font-semibold">
                      <span className="flex items-center gap-1">
                        <Zap className="size-3 text-purple-600" />
                        <span>Peak Rush Surge Bonus</span>
                      </span>
                      <span className="font-black">+₹{surgeBonus.toFixed(2)}</span>
                    </div>
                  )}

                  {expressBonus > 0 && (
                    <div className="flex items-center justify-between pt-2 text-amber-700 font-semibold">
                      <span className="flex items-center gap-1">
                        <Zap className="size-3 text-amber-600" />
                        <span>Express Same-Day Bonus</span>
                      </span>
                      <span className="font-black">+₹{expressBonus.toFixed(2)}</span>
                    </div>
                  )}

                  {tipAmount > 0 && (
                    <div className="flex items-center justify-between pt-2 text-emerald-700 font-semibold">
                      <span>Customer Cash Tip</span>
                      <span className="font-black">+₹{tipAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 text-emerald-700 font-semibold">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-emerald-600" />
                      <span>QuickPress Platform Deduction</span>
                    </span>
                    <span className="font-black">₹0.00 (Free)</span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 text-sm font-black text-zinc-950 border-t border-zinc-300">
                    <span>Net Take-Home Pay</span>
                    <span className="text-emerald-700">₹{netEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GARMENTS & BAG INFO */}
          {activeTab === "garments" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Package className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-zinc-900">
                      {trip.bagCount || trip.items?.length || 2} Garment Bags
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Wash & Iron / Premium Garment Care
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
                  Verified Barcode ✓
                </span>
              </div>

              {/* Garment Damage Shield AI Badge */}
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                  <ShieldCheck className="size-4 text-emerald-700" />
                  <span>Pre-Wash AI Liability Shield Active</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Pre-existing stains, tears, and missing buttons are cryptographically stamped before washing to protect you and the laundromat against false claims.
                </p>
              </div>

              {trip.items && trip.items.length > 0 && (
                <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white space-y-2">
                  <h5 className="text-xs font-black text-zinc-700 uppercase tracking-wider">
                    Itemized Garments List
                  </h5>
                  <div className="divide-y divide-zinc-100">
                    {trip.items.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-800">
                          {item.name || item.title || "Garment Item"}
                        </span>
                        <span className="font-bold text-zinc-900">
                          {item.quantity ? `x${item.quantity}` : "1 pc"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM FIXED 54PX ACTION BAR */}
        <footer className="sticky bottom-0 z-10 px-4 py-3 bg-white border-t border-zinc-100 flex items-center gap-2">
          {currentContactPhone && (
            <button
              type="button"
              onClick={() => handleCall(currentContactPhone)}
              className="py-3 px-4 rounded-2xl border-2 border-emerald-600 text-emerald-700 font-black text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <Phone className="size-4" />
              <span>Call</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenMaps(currentStopAddress)}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <Navigation className="size-4" />
            <span>Start Google Maps Navigation</span>
          </button>
        </footer>

        {/* Full Timeline Modal Sheet */}
        <RiderOrderTimelineModal
          isOpen={showTimelineModal}
          onClose={() => setShowTimelineModal(false)}
          trip={trip}
        />
      </div>
    </div>
  );
};
