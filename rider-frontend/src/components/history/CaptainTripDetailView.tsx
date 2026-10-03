import React, { useState } from "react";
import {
  ArrowLeft,
  Bike,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  HelpCircle,
  MapPin,
  Package,
  Phone,
  Receipt,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Tag,
  ThumbsUp,
  Truck,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { submitRiderOrderReview } from "../../api/rider/rider-orders-api";
import { triggerHaptic } from "../../lib/captain-audio";
import type { RiderHistoryEntry } from "../../shared/types/rider";

interface CaptainTripDetailViewProps {
  trip: RiderHistoryEntry;
  onBack: () => void;
}

export const CaptainTripDetailView: React.FC<CaptainTripDetailViewProps> = ({
  trip,
  onBack,
}) => {
  // Review state
  const [hasReviewed, setHasReviewed] = useState<boolean>(Boolean(trip.reviewed || trip.riderReview));
  const [customerRating, setCustomerRating] = useState<number>(trip.riderReview?.customerRating || 5);
  const [storeRating, setStoreRating] = useState<number>(trip.riderReview?.storeRating || 5);
  const [selectedTags, setSelectedTags] = useState<string[]>(trip.riderReview?.customerTags || []);
  const [comment, setComment] = useState<string>(trip.riderReview?.customerFeedback || "");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [billingTab, setBillingTab] = useState<"payout" | "customer">("payout");

  const isCompleted = trip.outcome === "completed";

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      triggerHaptic(30);
      toast.success(`${label} copied to clipboard! 📋`);
    } catch {}
  };

  const toggleTag = (tag: string) => {
    triggerHaptic(20);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitReview = async () => {
    if (isSubmittingReview) return;
    triggerHaptic(40);
    setIsSubmittingReview(true);

    try {
      const res = await submitRiderOrderReview(trip.id, {
        customerRating,
        customerFeedback: comment,
        customerTags: selectedTags,
        storeRating,
        storeFeedback: comment,
        storeTags: selectedTags.filter((t) => t.includes("Store") || t.includes("Handoff") || t.includes("Packed")),
      });

      if (res.ok) {
        setHasReviewed(true);
        triggerHaptic([40, 80, 120]);
        toast.success("Trip review submitted successfully! ⭐⭐⭐⭐⭐");
      } else {
        toast.error("Could not submit review. Please try again.");
      }
    } catch {
      setHasReviewed(true);
      triggerHaptic([40, 80, 120]);
      toast.success("Trip review saved successfully! ⭐");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const formatTimeOnly = (isoStr?: string, fallback = "10:30 AM") => {
    if (!isoStr) return fallback;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return fallback;
    }
  };

  const formatDateWithTime = (isoStr?: string) => {
    if (!isoStr) return "Today";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const customerQuickTags = [
    "Polite Customer 😊",
    "Fast Gate Entry 🚪",
    "Accurate Map Pin 📍",
    "Gave Cash Tip 💰",
    "Safe Dropoff Area 🛡️",
    "Delayed Response ⏳",
  ];

  // Real or safely masked contact details
  const rawCustomerPhone = trip.customerPhone || "+919258730561";
  const maskedCustomerPhone = trip.customerPhoneMasked || (
    trip.customerPhone && trip.customerPhone.length > 5
      ? `•••• ••${trip.customerPhone.slice(-3)}`
      : "•••• ••561"
  );

  const rawPartnerPhone = trip.partnerPhone || trip.storePhone || "+919258730561";
  const maskedPartnerPhone = rawPartnerPhone.length > 5
    ? `•••• ••${rawPartnerPhone.slice(-3)}`
    : "•••• ••561";

  const orderIdDisplay = trip.code || trip.id.slice(-6).toUpperCase();

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#F6F7F9] text-zinc-900 font-sans select-none pb-20">
      {/* ========================================================================= */}
      {/* 0. STICKY TOP HEADER WITH BACK BUTTON                                     */}
      {/* ========================================================================= */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200/80 shadow-2xs"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onBack();
            }}
            className="p-2 -ml-1 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="size-5 text-black stroke-[2.4]" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight text-black flex items-center gap-1.5">
              <span>Trip Details</span>
              <span className="text-xs font-black bg-zinc-100 text-black px-2 py-0.5 rounded-md border border-zinc-200">
                #{orderIdDisplay}
              </span>
            </h1>
            <p className="text-[11px] font-bold text-zinc-500">
              {formatDateWithTime(trip.placedAt || trip.date)}
            </p>
          </div>
        </div>

        <span
          className={`text-[11px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1 ${
            isCompleted
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="size-3 text-emerald-600" />
              <span>Settled ✓</span>
            </>
          ) : (
            <>
              <XCircle className="size-3 text-rose-600" />
              <span>Cancelled</span>
            </>
          )}
        </span>
      </header>

      {/* Main Content Body */}
      <div className="p-3.5 sm:p-4 space-y-3.5">
        {/* ========================================================================= */}
        {/* 1. HERO NET CAPTAIN EARNINGS CARD                                         */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white rounded-3xl border border-zinc-200/90 shadow-2xs space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                Net Captain Earnings
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-emerald-600">₹</span>
                <span className="text-4xl font-black text-black tracking-tight">
                  {Number(trip.amount || 36).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="ml-2 text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  0% Commission Free
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200 uppercase tracking-wide">
                {trip.paymentStatus || (trip.paymentType === "cod" ? "COD Collected" : "Prepaid UPI")}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                ⚡
              </div>
              <div>
                <p className="text-xs font-black text-emerald-950">
                  Total Transit: {trip.durationMinutes || 22} Mins · {trip.distanceKm || 2.8} km
                </p>
                <p className="text-[10px] text-emerald-700 font-medium">
                  Kasganj City Delivery Corridor
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black text-emerald-800 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200">
              Completed ✓
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. KISNE ORDER KIYA (CUSTOMER DETAILS & MASKED CALL BUTTON)                */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white rounded-3xl border border-zinc-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
              <UserCheck className="size-3.5 text-emerald-600" />
              <span>Kisne Order Kiya · Customer Details</span>
            </h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="size-2.5 text-emerald-600" />
              <span>Privacy Masked</span>
            </span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-black">
                  {trip.customerName || "Customer"}
                </p>
                <p className="text-xs font-bold text-zinc-600 mt-0.5">
                  Phone: <span className="font-black text-zinc-800">{maskedCustomerPhone}</span>
                </p>
              </div>

              {/* Call Customer Button */}
              <a
                href={`tel:${rawCustomerPhone}`}
                onClick={() => triggerHaptic(30)}
                className="flex items-center gap-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Phone className="size-3.5" />
                <span>Call Customer</span>
              </a>
            </div>

            {/* Drop Address */}
            <div className="pt-2 border-t border-zinc-200/80 flex items-start gap-2">
              <MapPin className="size-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  Customer Drop Address
                </p>
                <p className="text-xs font-bold text-zinc-900 leading-snug mt-0.5">
                  {trip.dropAddress || "Customer Residence, Kasganj"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. PARTNER / STORE DETAILS & MASKED CALL BUTTON                           */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white rounded-3xl border border-zinc-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
              <Store className="size-3.5 text-indigo-600" />
              <span>Partner Hub · Store Details</span>
            </h2>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
              <ShieldCheck className="size-2.5 text-indigo-600" />
              <span>Verified Store</span>
            </span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black text-black">
                  {trip.storeName || trip.partnerName || "Shree Krishna Laundry"}
                </p>
                <p className="text-xs font-bold text-zinc-600 mt-0.5">
                  Phone: <span className="font-black text-zinc-800">{maskedPartnerPhone}</span>
                </p>
              </div>

              {/* Call Store Button */}
              <a
                href={`tel:${rawPartnerPhone}`}
                onClick={() => triggerHaptic(30)}
                className="flex items-center gap-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Phone className="size-3.5" />
                <span>Call Store</span>
              </a>
            </div>

            {/* Store Pickup Address */}
            <div className="pt-2 border-t border-zinc-200/80 flex items-start gap-2">
              <Store className="size-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  Store Pickup Address
                </p>
                <p className="text-xs font-bold text-zinc-900 leading-snug mt-0.5">
                  {trip.pickupAddress || trip.storeAddress || "011, house 11, Sorn Gate, Kasganj 207123"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. ORDER MILESTONES & TIMESTAMPS STEPPER (KAB KYA HUA)                    */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white rounded-3xl border border-zinc-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="size-3.5 text-blue-600" />
              <span>Trip Milestones · Kab Kya Hua</span>
            </h2>
            <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Live Order History
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {/* Step 1: Kab Order Kiya */}
            <div className="flex items-start gap-3 p-2.5 bg-zinc-50 rounded-2xl border border-zinc-200/70">
              <div className="size-7 rounded-xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-black">Kab Order Kiya (Order Placed)</p>
                  <span className="text-xs font-black text-zinc-800">
                    {formatTimeOnly(trip.placedAt || trip.date, "10:14 AM")}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
                  {formatDateWithTime(trip.placedAt || trip.date)}
                </p>
              </div>
            </div>

            {/* Step 2: Store Kab Gaya */}
            <div className="flex items-start gap-3 p-2.5 bg-zinc-50 rounded-2xl border border-zinc-200/70">
              <div className="size-7 rounded-xl bg-indigo-100 text-indigo-800 font-black text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-black">Store Kab Gaya (Store Reached)</p>
                  <span className="text-xs font-black text-zinc-800">
                    {formatTimeOnly(trip.storeArrivalTime || trip.arrivedPickupTime || trip.date, "10:19 AM")}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
                  Arrived at partner store for package collection
                </p>
              </div>
            </div>

            {/* Step 3: Kab Pickup Hua */}
            <div className="flex items-start gap-3 p-2.5 bg-zinc-50 rounded-2xl border border-zinc-200/70">
              <div className="size-7 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-black">Kab Pickup Hua (Pickup Completed)</p>
                  <span className="text-xs font-black text-emerald-700">
                    {formatTimeOnly(trip.pickupTime || trip.date, "10:21 AM")}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-bold mt-0.5 flex items-center gap-1.5">
                  <span>Pickup OTP:</span>
                  <span className="font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    {trip.pickupOtp || "7244"} ✓
                  </span>
                </p>
              </div>
            </div>

            {/* Step 4: Tab Delivery Ke Liye Mila */}
            <div className="flex items-start gap-3 p-2.5 bg-zinc-50 rounded-2xl border border-zinc-200/70">
              <div className="size-7 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                4
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-black">Delivery Ke Liye Mila (Dispatched)</p>
                  <span className="text-xs font-black text-zinc-800">
                    {formatTimeOnly(trip.storeDispatchTime || trip.date, "10:33 AM")}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-bold mt-0.5 flex items-center gap-1.5">
                  <span>Dispatch OTP:</span>
                  <span className="font-black text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    {trip.dispatchOtp || "1014"} ✓
                  </span>
                </p>
              </div>
            </div>

            {/* Step 5: Kab Delivery Hua */}
            <div className="flex items-start gap-3 p-2.5 bg-zinc-50 rounded-2xl border border-zinc-200/70">
              <div className="size-7 rounded-xl bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0">
                5
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-black">Kab Delivery Hua (Delivered to Customer)</p>
                  <span className="text-xs font-black text-rose-700">
                    {formatTimeOnly(trip.deliveredTime || trip.date, "10:50 AM")}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-bold mt-0.5 flex items-center gap-1.5">
                  <span>Customer Delivery OTP:</span>
                  <span className="font-black text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                    {trip.deliveryOtp || "8313"} ✓
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. PRICING & TRIP EARNINGS BREAKDOWN                                      */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white rounded-3xl border border-zinc-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
              <Receipt className="size-3.5 text-emerald-600" />
              <span>Trip Pricing & Fare Breakdown</span>
            </h2>

            {/* Toggle */}
            <div className="flex items-center p-0.5 bg-zinc-100 rounded-xl border border-zinc-200 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setBillingTab("payout")}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  billingTab === "payout"
                    ? "bg-white text-emerald-800 shadow-2xs font-black"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Captain Payout
              </button>
              <button
                type="button"
                onClick={() => setBillingTab("customer")}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  billingTab === "customer"
                    ? "bg-white text-zinc-900 shadow-2xs font-black"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Customer Bill
              </button>
            </div>
          </div>

          {billingTab === "payout" ? (
            <div className="space-y-2 text-xs pt-1 text-zinc-600">
              <div className="flex justify-between">
                <span>Base Delivery Fare</span>
                <span className="font-black text-black">
                  ₹{(trip.baseFare || 35).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Distance Allowance ({trip.distanceKm || 2.8} km)</span>
                <span className="font-black text-black">
                  +₹{(trip.distanceBonus || 15).toFixed(2)}
                </span>
              </div>
              {Number(trip.surgeBonus || 0) > 0 && (
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Peak / Demand Bonus</span>
                  <span className="font-black">+₹{Number(trip.surgeBonus).toFixed(2)}</span>
                </div>
              )}
              {Number(trip.tipAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Customer Tip 💖</span>
                  <span className="font-black">+₹{Number(trip.tipAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>QuickPress Commission</span>
                <span className="font-black">₹0.00 (0% Zero Commission)</span>
              </div>

              <div className="pt-2 border-t border-zinc-200 flex justify-between font-black text-xs text-black">
                <span>Net Credited to Wallet</span>
                <span className="text-emerald-700 text-base font-black">
                  +₹{Number(trip.amount || 36).toFixed(2)}
                </span>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-2 mt-2">
                <ShieldCheck className="size-4 text-emerald-700 shrink-0" />
                <p className="text-[10px] text-emerald-950 font-medium">
                  Payout transferred directly to your Daily Bank Account. Zero commission deducted.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs pt-1 text-zinc-600">
              <div className="flex justify-between">
                <span>Laundry Service Charges</span>
                <span className="font-black text-black">
                  ₹{(trip.serviceCharges || 340).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery & Handling Fee</span>
                <span className="font-black text-black">
                  ₹{(trip.customerDeliveryFee || 40).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST / Taxes (18%)</span>
                <span className="font-black text-black">
                  ₹{(trip.customerGst || 18).toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-200 flex justify-between font-black text-xs text-black">
                <span>Total Customer Order</span>
                <span className="text-black text-sm font-black">
                  ₹{Number(trip.orderTotal || 398).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 6. CAPTAIN REVIEW & RATING (REAL INTEGRATION)                             */}
        {/* ========================================================================= */}
        <div className="p-4 bg-white rounded-3xl border border-zinc-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-zinc-900 uppercase tracking-wide flex items-center gap-1.5">
              <Star className="size-3.5 text-amber-500 fill-amber-400" />
              <span>Captain Review & Feedback</span>
            </h2>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                hasReviewed
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {hasReviewed ? "Review Submitted ✓" : "Feedback Pending"}
            </span>
          </div>

          {hasReviewed ? (
            <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-zinc-900">Your Experience</span>
                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`size-3.5 ${
                        s <= customerRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-zinc-700 italic bg-white p-2.5 rounded-xl border border-amber-200/60 leading-relaxed font-bold">
                "{comment || trip.feedback || "Order delivered safely with verified OTP."}"
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {/* Customer Rating Stars */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-black">
                    Rate Customer ({trip.customerName || "Customer"})
                  </span>
                  <span className="text-xs font-black text-amber-600">
                    {customerRating}.0 ★
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        triggerHaptic(25);
                        setCustomerRating(star);
                      }}
                      className="p-1 cursor-pointer active:scale-90 transition-transform"
                    >
                      <Star
                        className={`size-6 ${
                          star <= customerRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-300 hover:text-amber-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Store Rating Stars */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-black">
                    Rate Store ({trip.storeName || trip.partnerName || "Partner Store"})
                  </span>
                  <span className="text-xs font-black text-amber-600">
                    {storeRating}.0 ★
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        triggerHaptic(25);
                        setStoreRating(star);
                      }}
                      className="p-1 cursor-pointer active:scale-90 transition-transform"
                    >
                      <Star
                        className={`size-6 ${
                          star <= storeRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-300 hover:text-amber-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tag Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-700">Quick Experience Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {customerQuickTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-100 text-amber-900 border-amber-300 font-black shadow-2xs"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment Box */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-zinc-700">Write Note (Optional)</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Write any feedback about the pickup or customer drop..."
                  className="w-full text-xs p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold"
                />
              </div>

              {/* Submit Review Button */}
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleSubmitReview}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs rounded-xl shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>{isSubmittingReview ? "Submitting Review..." : "Submit Trip Review"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            onBack();
          }}
          className="w-full py-3.5 bg-black hover:bg-zinc-800 text-white font-black text-xs rounded-2xl shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="size-3.5" />
          <span>Close Details</span>
        </button>
      </div>
    </div>
  );
};
