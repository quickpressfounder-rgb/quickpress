import React, { useState, useEffect } from "react";
import {
  Package,
  Check,
  CreditCard,
  Truck,
  Loader2,
  ArrowRight,
  Shirt,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { triggerHaptic } from "../../lib/captain-audio";
import {
  fetchDeliveryKitConfig,
  createDeliveryKitOrder,
  verifyDeliveryKitPayment,
  fetchMyKit,
  type DeliveryKitConfig,
  type DeliveryKitPackage,
} from "../../api/rider/rider-auth-api";
import { openRazorpayCheckout } from "../../api/core/razorpay";

interface DeliveryKitSelectionStepProps {
  riderPhone: string;
  riderName: string;
  city: string;
  shippingAddress?: Record<string, any>;
  onPaymentSuccess: (kitOrderData: any) => void;
  isAlreadyPaid?: boolean;
  existingKitOrder?: any;
}

export function DeliveryKitSelectionStep({
  riderPhone,
  riderName,
  city,
  shippingAddress,
  onPaymentSuccess,
  isAlreadyPaid = false,
  existingKitOrder = null,
}: DeliveryKitSelectionStepProps) {
  const [config, setConfig] = useState<DeliveryKitConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);

  // Selected options
  const [selectedPlan, setSelectedPlan] = useState<"FULL_PAYMENT" | "PART_PAYMENT">("PART_PAYMENT");
  const [selectedSize, setSelectedSize] = useState<string>("L");
  const [showKitDetails, setShowKitDetails] = useState<boolean>(true);

  // Customized EMI installment tenure (weeks)
  const [emiWeeks, setEmiWeeks] = useState<number>(3);

  // Delivery Address Fields (Home Delivery via Courier Only)
  const [receiverName, setReceiverName] = useState<string>(riderName || "");
  const [receiverPhone, setReceiverPhone] = useState<string>(riderPhone || "");
  const [addressLine, setAddressLine] = useState<string>(shippingAddress?.addressLine || "");
  const [landmark, setLandmark] = useState<string>(shippingAddress?.landmark || "");
  const [pincode, setPincode] = useState<string>(shippingAddress?.pincode || "");
  const [deliveryCity, setDeliveryCity] = useState<string>(city || shippingAddress?.city || "");

  // Payment process state
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentCompleted, setPaymentCompleted] = useState<boolean>(isAlreadyPaid);
  const [verifiedKitOrder, setVerifiedKitOrder] = useState<any>(existingKitOrder);

  // Load configuration and check existing payment status on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoadingConfig(true);
      try {
        const [cfgRes, myKitRes] = await Promise.allSettled([
          fetchDeliveryKitConfig(),
          riderPhone ? fetchMyKit(riderPhone) : Promise.resolve(null),
        ]);

        if (isMounted && cfgRes.status === "fulfilled" && cfgRes.value) {
          setConfig(cfgRes.value);
        }

        if (
          isMounted &&
          myKitRes.status === "fulfilled" &&
          myKitRes.value &&
          myKitRes.value.hasKitOrder &&
          myKitRes.value.kitOrder
        ) {
          const ko = myKitRes.value.kitOrder;
          const status = ko.payment?.status;
          if (status === "PAID" || status === "PARTIALLY_PAID") {
            setPaymentCompleted(true);
            setVerifiedKitOrder(ko);
            if (ko.tshirtSize) setSelectedSize(ko.tshirtSize);
            if (ko.pricing?.paymentType) setSelectedPlan(ko.pricing.paymentType);
            onPaymentSuccess(ko);
          }
        }
      } catch (err) {
        console.error("Error loading delivery kit data:", err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [riderPhone]);

  // Keep receiver details in sync if parent changes
  useEffect(() => {
    if (riderName && !receiverName) setReceiverName(riderName);
    if (riderPhone && !receiverPhone) setReceiverPhone(riderPhone);
    if (city && !deliveryCity) setDeliveryCity(city);
    if (shippingAddress?.pincode && !pincode) setPincode(shippingAddress.pincode);
    if (shippingAddress?.addressLine && !addressLine) setAddressLine(shippingAddress.addressLine);
  }, [riderName, riderPhone, city, shippingAddress]);

  // Pricing constants fallback
  const standardKit: DeliveryKitPackage = config?.standardKit || {
    id: "kit_standard",
    name: "Standard Captain Starter Kit",
    totalPrice: 999.0,
    allowPartPayment: true,
    partPaymentTotalPrice: 1200.0,
    partPaymentUpfront: 300.0,
    remainingBalance: 900.0,
    deductionWeekly: 300.0,
    deductionWeeks: 3,
    active: true,
  };

  // Customized EMI computation
  const getEmiDetails = () => {
    if (emiWeeks === 2) {
      return {
        upfront: 300.0,
        balance: 900.0,
        weekly: 450.0,
        weeks: 2,
        total: 1200.0,
      };
    }
    if (emiWeeks === 4) {
      return {
        upfront: 300.0,
        balance: 900.0,
        weekly: 225.0,
        weeks: 4,
        total: 1200.0,
      };
    }
    // Default 3 weeks
    return {
      upfront: 300.0,
      balance: 900.0,
      weekly: 300.0,
      weeks: 3,
      total: 1200.0,
    };
  };

  const emiCalc = getEmiDetails();
  const chargeAmount = selectedPlan === "PART_PAYMENT" ? emiCalc.upfront : standardKit.totalPrice;

  const sizes = ["M", "L", "XL", "XXL"];

  const kitContentsList = [
    { title: "2x QuickPress Premium Dry-Fit Captain T-Shirts", subtitle: "Comfortable breathable branded uniforms" },
    { title: "1x High-Visibility Reflective Raincoat", subtitle: "Waterproof all-weather night safety gear" },
    { title: "1x Heavy-Duty Waterproof Delivery Bag", subtitle: "Hot/Cold insulated with reinforced straps" },
    { title: "1x Official RFID / QR Captain ID Card", subtitle: "With QuickPress branded lanyard" },
    { title: "1x Insulated Stainless Steel Water Bottle", subtitle: "750ml durable hydration bottle" },
  ];

  // Handle Razorpay checkout trigger
  const handleProceedToPayment = async () => {
    if (isProcessingPayment || paymentCompleted) return;
    triggerHaptic();

    if (!riderPhone || riderPhone.trim().length < 10) {
      toast.error("Valid 10-digit mobile number is required.");
      return;
    }

    if (!receiverName.trim()) {
      toast.error("Please enter the recipient person's name.");
      return;
    }
    if (!receiverPhone.trim() || receiverPhone.trim().replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit recipient mobile number.");
      return;
    }
    if (!addressLine.trim()) {
      toast.error("Please enter complete delivery address (House/Street/Area).");
      return;
    }
    if (!pincode.trim() || pincode.trim().length < 6) {
      toast.error("Please enter a valid 6-digit delivery PIN code.");
      return;
    }

    const compiledAddress = {
      receiverName: receiverName.trim() || riderName,
      receiverPhone: receiverPhone.trim() || riderPhone,
      addressLine: addressLine.trim(),
      landmark: landmark.trim(),
      city: deliveryCity.trim() || city,
      state: "Uttar Pradesh",
      pincode: pincode.trim(),
      deliveryPreference: "home_delivery",
      emiWeeks: selectedPlan === "PART_PAYMENT" ? emiCalc.weeks : 0,
      emiWeekly: selectedPlan === "PART_PAYMENT" ? emiCalc.weekly : 0,
      emiBalance: selectedPlan === "PART_PAYMENT" ? emiCalc.balance : 0,
    };

    setIsProcessingPayment(true);
    try {
      // 1. Create server-side Razorpay order
      const orderRes = await createDeliveryKitOrder({
        riderPhone,
        riderName: riderName || "Captain",
        city: deliveryCity.trim() || city,
        kitId: standardKit.id,
        paymentType: selectedPlan,
        tshirtSize: selectedSize,
        deliveryPreference: "home_delivery",
        shippingAddress: compiledAddress,
      });

      if (!orderRes.ok || !orderRes.razorpayOrderId) {
        throw new Error("Unable to create order. Please try again.");
      }

      // 2. Open official live Razorpay modal
      const checkoutResult = await openRazorpayCheckout(
        {
          orderId: orderRes.razorpayOrderId,
          amount: chargeAmount,
          currency: "INR",
          keyId: orderRes.keyId || config?.keyId || "rzp_live_TjoBvXbaXHYmxE",
        },
        {
          description:
            selectedPlan === "PART_PAYMENT"
              ? `Delivery Kit Installment Down-Payment (₹${chargeAmount})`
              : `Delivery Kit Full Payment (₹${chargeAmount})`,
          profile: {
            name: riderName || "Captain",
            contact: riderPhone,
          },
          themeColor: "#00C853",
          appName: "QuickPress Captain",
        }
      );

      if (checkoutResult.status === "failed") {
        toast.error(`Payment failed: ${checkoutResult.reason}`);
        setIsProcessingPayment(false);
        return;
      }

      if (checkoutResult.status === "dismissed") {
        toast.info("Payment window was closed. You can retry anytime.");
        setIsProcessingPayment(false);
        return;
      }

      // 3. Cryptographic HMAC signature verification on backend
      const rzpPayload = checkoutResult.payload;
      const verifyRes = await verifyDeliveryKitPayment({
        riderPhone,
        riderName: riderName || "Captain",
        city: deliveryCity.trim() || city,
        razorpayOrderId: rzpPayload.razorpay_order_id,
        razorpayPaymentId: rzpPayload.razorpay_payment_id,
        razorpaySignature: rzpPayload.razorpay_signature,
        paymentType: selectedPlan,
        kitId: standardKit.id,
        tshirtSize: selectedSize,
        deliveryPreference: "home_delivery",
        shippingAddress: compiledAddress,
      });

      if (verifyRes.ok) {
        triggerHaptic();
        setPaymentCompleted(true);
        setVerifiedKitOrder(verifyRes.kitOrder);
        toast.success("Payment confirmed. Redirecting to Agreement...");
        onPaymentSuccess(verifyRes.kitOrder);
      } else {
        toast.error(verifyRes.message || "Payment verification failed.");
      }
    } catch (err: any) {
      console.error("Kit payment flow error:", err);
      toast.error(err?.message || "Payment could not be completed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-neutral-200 rounded-2xl space-y-3">
        <Loader2 className="w-7 h-7 text-[#00C853] animate-spin" />
        <p className="text-xs font-bold text-neutral-600">Loading Delivery Kit options...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* 1. Success Card if Already Paid */}
      {paymentCompleted && (
        <div className="p-4 bg-emerald-50 border border-[#00C853] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#00C853] text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950">Kit Payment Verified</p>
                <p className="text-[11px] text-emerald-700">
                  {verifiedKitOrder?.pricing?.paymentType === "PART_PAYMENT"
                    ? `Part Payment: ₹${verifiedKitOrder?.pricing?.amountPaid || emiCalc.upfront} Paid (Balance: ₹${verifiedKitOrder?.pricing?.remainingBalance || emiCalc.balance})`
                    : `Full Payment Completed: ₹${verifiedKitOrder?.pricing?.amountPaid || standardKit.totalPrice}`}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-[#00C853] text-black">
              Paid
            </span>
          </div>

          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-900">
            <span>Size: <strong>{verifiedKitOrder?.tshirtSize || selectedSize}</strong></span>
            <span>Delivery: <strong>Home Courier</strong></span>
            <span>Order ID: <code className="font-mono text-[10px]">{verifiedKitOrder?.id?.slice(-8) || "VERIFIED"}</code></span>
          </div>
        </div>
      )}

      {/* 2. Official Kit Contents Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs">
        <div
          onClick={() => setShowKitDetails(!showKitDetails)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#00C853]" />
            <h3 className="text-xs font-bold text-neutral-900">Official Captain Delivery Kit</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              5 Items Included
            </span>
            {showKitDetails ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </div>
        </div>

        {showKitDetails && (
          <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
            {kitContentsList.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded-xl bg-neutral-50/80 border border-neutral-100"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-800 leading-snug">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. T-Shirt Size Selector */}
      {!paymentCompleted && (
        <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-[#00C853]" />
              <label className="text-xs font-bold text-neutral-900">T-Shirt Size *</label>
            </div>
            <span className="text-[10px] text-neutral-500 font-medium">Standard Fit</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {sizes.map((s) => {
              const isSelected = selectedSize === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setSelectedSize(s);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                      : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Recipient Details & Delivery Address Form (Courier Home Delivery Only) */}
      {!paymentCompleted && (
        <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100">
            <Truck className="w-4 h-4 text-[#00C853]" />
            <h3 className="text-xs font-bold text-neutral-900">Shipping Address (Courier Delivery)</h3>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Recipient Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Recipient Person Name"
                    className="w-full h-10 px-3 pl-8 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#00C853]"
                  />
                  <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Recipient Phone *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile"
                    className="w-full h-10 px-3 pl-8 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#00C853]"
                  />
                  <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                House / Flat / Street / Area Address *
              </label>
              <input
                type="text"
                required
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="House/Flat No., Building, Street, Colony"
                className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#00C853]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="PIN Code"
                  className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  placeholder="Delivery City"
                  className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Landmark
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near landmark"
                  className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#00C853]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Payment Plan Selection */}
      {!paymentCompleted && (
        <div className="space-y-2.5">
          <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide px-1">
            Payment Option *
          </label>

          {/* Option 1: Part Payment / Installments */}
          <div
            onClick={() => {
              triggerHaptic();
              setSelectedPlan("PART_PAYMENT");
            }}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedPlan === "PART_PAYMENT"
                ? "bg-white border-[#00C853] shadow-xs ring-1 ring-emerald-300"
                : "bg-white border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedPlan === "PART_PAYMENT"
                    ? "border-[#00C853] bg-[#00C853]"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {selectedPlan === "PART_PAYMENT" && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-900">Part Payment (Easy Installments)</h4>
                  <span className="text-[10px] font-semibold text-neutral-500">
                    Total: ₹{emiCalc.total.toFixed(0)}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-neutral-900">
                    ₹{emiCalc.upfront.toFixed(0)}
                  </span>
                  <span className="text-[11px] text-neutral-600 font-medium">due today</span>
                </div>

                <div className="mt-2 text-[11px] text-neutral-600">
                  Remaining balance of ₹{emiCalc.balance.toFixed(0)} deducted from weekly payouts (₹{emiCalc.weekly.toFixed(0)}/week for {emiCalc.weeks} weeks).
                </div>

                {/* Customized EMI Tenure Selector */}
                {selectedPlan === "PART_PAYMENT" && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-neutral-600">Installment Duration:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { weeks: 2, label: "2 Weeks" },
                        { weeks: 3, label: "3 Weeks" },
                        { weeks: 4, label: "4 Weeks" },
                      ].map((p) => (
                        <button
                          key={p.weeks}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic();
                            setEmiWeeks(p.weeks);
                          }}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                            emiWeeks === p.weeks
                              ? "bg-neutral-900 text-white border-neutral-900"
                              : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Option 2: Full Payment */}
          <div
            onClick={() => {
              triggerHaptic();
              setSelectedPlan("FULL_PAYMENT");
            }}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedPlan === "FULL_PAYMENT"
                ? "bg-white border-[#00C853] shadow-xs ring-1 ring-emerald-300"
                : "bg-white border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedPlan === "FULL_PAYMENT"
                    ? "border-[#00C853] bg-[#00C853]"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {selectedPlan === "FULL_PAYMENT" && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-900">Full Payment (One-Time)</h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Save ₹{(standardKit.partPaymentTotalPrice - standardKit.totalPrice).toFixed(0)}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-neutral-900">
                    ₹{standardKit.totalPrice.toFixed(0)}
                  </span>
                  <span className="text-[11px] text-neutral-400 line-through">
                    ₹{standardKit.partPaymentTotalPrice.toFixed(0)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  One-time complete payment. No weekly payout deductions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Primary Action Button: Proceed to Payment */}
      {!paymentCompleted ? (
        <button
          type="button"
          disabled={isProcessingPayment}
          onClick={handleProceedToPayment}
          className="w-full h-12 bg-[#00C853] hover:bg-[#00B548] active:scale-[0.99] text-black font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isProcessingPayment ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Processing Payment...</span>
            </>
          ) : (
            <>
              <span>Proceed to Payment (₹{chargeAmount.toFixed(0)})</span>
              <ArrowRight className="w-4 h-4 text-black ml-1" />
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (onPaymentSuccess) {
              onPaymentSuccess(verifiedKitOrder || existingKitOrder || { pricing: { paymentType: selectedPlan } });
            }
          }}
          className="w-full h-12 bg-[#00C853] hover:bg-[#00B548] active:scale-[0.99] text-black font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Continue to Step 7 (Partner Agreement)</span>
          <ArrowRight className="w-4 h-4 text-black ml-1" />
        </button>
      )}
    </div>
  );
}
