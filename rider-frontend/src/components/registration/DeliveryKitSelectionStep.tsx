import React, { useState, useEffect } from "react";
import {
  Package,
  CheckCircle2,
  Check,
  CreditCard,
  Truck,
  Building2,
  Loader2,
  Calendar,
  ArrowRight,
  Shirt,
  MapPin,
  Phone,
  User,
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
  const [deliveryPreference, setDeliveryPreference] = useState<"home_delivery" | "hub_pickup">("home_delivery");

  // Customized EMI installment tenure (weeks)
  const [emiWeeks, setEmiWeeks] = useState<number>(3);

  // Delivery Address Fields (when home delivery is selected)
  const [receiverName, setReceiverName] = useState<string>(riderName || "");
  const [receiverPhone, setReceiverPhone] = useState<string>(riderPhone || "");
  const [addressLine, setAddressLine] = useState<string>(shippingAddress?.addressLine || "");
  const [landmark, setLandmark] = useState<string>(shippingAddress?.landmark || "");
  const [pincode, setPincode] = useState<string>(shippingAddress?.pincode || "");
  const [deliveryCity, setDeliveryCity] = useState<string>(city || shippingAddress?.city || "Kasganj");

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
            if (ko.deliveryPreference) setDeliveryPreference(ko.deliveryPreference);
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
  }, [riderName, riderPhone, city]);

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
        upfront: 600.0,
        balance: 600.0,
        weekly: 300.0,
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

  // Handle Razorpay checkout trigger
  const handleProceedToPayment = async () => {
    if (isProcessingPayment || paymentCompleted) return;
    triggerHaptic();

    if (!riderPhone || riderPhone.trim().length < 10) {
      toast.error("Valid 10-digit mobile number is required.");
      return;
    }

    // Validate Home Delivery address if selected
    if (deliveryPreference === "home_delivery") {
      if (!receiverName.trim()) {
        toast.error("Please enter the recipient person's name.");
        return;
      }
      if (!receiverPhone.trim() || receiverPhone.trim().replace(/\D/g, "").length < 10) {
        toast.error("Please enter a valid 10-digit recipient mobile number.");
        return;
      }
      if (!addressLine.trim()) {
        toast.error("Please enter complete delivery address (House/Street/Colony).");
        return;
      }
      if (!pincode.trim() || pincode.trim().length < 6) {
        toast.error("Please enter a valid 6-digit delivery PIN code.");
        return;
      }
    }

    const compiledAddress =
      deliveryPreference === "home_delivery"
        ? {
            receiverName: receiverName.trim() || riderName,
            receiverPhone: receiverPhone.trim() || riderPhone,
            addressLine: addressLine.trim(),
            landmark: landmark.trim(),
            city: deliveryCity.trim() || city,
            state: "Uttar Pradesh",
            pincode: pincode.trim(),
            deliveryPreference: "home_delivery",
          }
        : {
            receiverName: riderName,
            receiverPhone: riderPhone,
            city: city || "Kasganj",
            deliveryPreference: "hub_pickup",
          };

    setIsProcessingPayment(true);
    try {
      // 1. Create server-side Razorpay order
      const orderRes = await createDeliveryKitOrder({
        riderPhone,
        riderName: riderName || "Captain",
        city: city || "Kasganj",
        kitId: standardKit.id,
        paymentType: selectedPlan,
        tshirtSize: selectedSize,
        deliveryPreference,
        shippingAddress: {
          ...compiledAddress,
          emiWeeks: selectedPlan === "PART_PAYMENT" ? emiCalc.weeks : 0,
          emiWeekly: selectedPlan === "PART_PAYMENT" ? emiCalc.weekly : 0,
          emiBalance: selectedPlan === "PART_PAYMENT" ? emiCalc.balance : 0,
        },
      });

      if (!orderRes.ok || !orderRes.razorpayOrderId) {
        throw new Error("Unable to create order. Please try again.");
      }

      // 2. Open official Razorpay modal
      const checkoutResult = await openRazorpayCheckout(
        {
          orderId: orderRes.razorpayOrderId,
          amount: chargeAmount,
          currency: "INR",
          keyId: orderRes.keyId || config?.keyId,
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
        city: city || "Kasganj",
        razorpayOrderId: rzpPayload.razorpay_order_id,
        razorpayPaymentId: rzpPayload.razorpay_payment_id,
        razorpaySignature: rzpPayload.razorpay_signature,
        paymentType: selectedPlan,
        kitId: standardKit.id,
        tshirtSize: selectedSize,
        deliveryPreference,
        shippingAddress: {
          ...compiledAddress,
          emiWeeks: selectedPlan === "PART_PAYMENT" ? emiCalc.weeks : 0,
          emiWeekly: selectedPlan === "PART_PAYMENT" ? emiCalc.weekly : 0,
          emiBalance: selectedPlan === "PART_PAYMENT" ? emiCalc.balance : 0,
        },
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
    <div className="space-y-4">
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
            <span>Delivery: <strong>{verifiedKitOrder?.deliveryPreference === "hub_pickup" ? "Hub Pickup" : "Home Delivery"}</strong></span>
            <span>Order ID: <code className="font-mono text-[10px]">{verifiedKitOrder?.id?.slice(-8) || "VERIFIED"}</code></span>
          </div>
        </div>
      )}

      {/* 2. T-Shirt Size Selector */}
      {!paymentCompleted && (
        <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-[#00C853]" />
              <label className="text-xs font-bold text-neutral-900">Select T-Shirt Size *</label>
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
                  className={`py-2 text-xs font-bold rounded-xl border transition-all text-center ${
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

      {/* 3. Delivery Method Selection */}
      {!paymentCompleted && (
        <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#00C853]" />
            <label className="text-xs font-bold text-neutral-900">Delivery Method *</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setDeliveryPreference("home_delivery");
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                deliveryPreference === "home_delivery"
                  ? "bg-emerald-50/60 border-[#00C853] ring-1 ring-emerald-300"
                  : "bg-white border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <Truck className={`w-4 h-4 ${deliveryPreference === "home_delivery" ? "text-[#00C853]" : "text-neutral-500"}`} />
                {deliveryPreference === "home_delivery" && (
                  <CheckCircle2 className="w-4 h-4 text-[#00C853]" />
                )}
              </div>
              <div className="mt-2">
                <p className="text-xs font-bold text-neutral-900">Home Delivery</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">3–5 Days by Courier</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setDeliveryPreference("hub_pickup");
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                deliveryPreference === "hub_pickup"
                  ? "bg-emerald-50/60 border-[#00C853] ring-1 ring-emerald-300"
                  : "bg-white border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <Building2 className={`w-4 h-4 ${deliveryPreference === "hub_pickup" ? "text-[#00C853]" : "text-neutral-500"}`} />
                {deliveryPreference === "hub_pickup" && (
                  <CheckCircle2 className="w-4 h-4 text-[#00C853]" />
                )}
              </div>
              <div className="mt-2">
                <p className="text-xs font-bold text-neutral-900">City Hub Pickup</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Direct pickup from hub</p>
              </div>
            </button>
          </div>

          {/* Recipient Details & Delivery Address Form (when Home Delivery is selected) */}
          {deliveryPreference === "home_delivery" && (
            <div className="pt-3 border-t border-neutral-100 space-y-2.5">
              <p className="text-[11px] font-bold text-neutral-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#00C853]" />
                <span>Recipient & Shipping Address</span>
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-600 mb-1">
                    Receiver Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full h-9 px-2.5 pl-7 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#00C853]"
                    />
                    <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-600 mb-1">
                    Receiver Phone *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={10}
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="10-digit mobile"
                      className="w-full h-9 px-2.5 pl-7 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#00C853]"
                    />
                    <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-600 mb-1">
                  House / Flat / Street Address *
                </label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="House/Flat No., Street, Colony"
                  className="w-full h-9 px-2.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-semibold text-neutral-600 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    placeholder="207123"
                    className="w-full h-9 px-2.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-semibold text-neutral-600 mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near temple/bank"
                    className="w-full h-9 px-2.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-[10px] font-semibold text-neutral-600 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    placeholder="Kasganj"
                    className="w-full h-9 px-2.5 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#00C853]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Payment Plan Selection */}
      {!paymentCompleted && (
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-neutral-900 px-1">
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
                  <h4 className="text-xs font-bold text-neutral-900">Part Payment (Installments)</h4>
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
                  Remaining balance: ₹{emiCalc.balance.toFixed(0)} deducted from weekly payouts (₹{emiCalc.weekly.toFixed(0)}/week for {emiCalc.weeks} weeks).
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
                          className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
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
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
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

      {/* 5. Primary Action Button: Proceed to Payment */}
      {!paymentCompleted ? (
        <button
          type="button"
          disabled={isProcessingPayment}
          onClick={handleProceedToPayment}
          className="w-full h-12 bg-[#00C853] hover:bg-[#00B548] active:scale-[0.99] text-black font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
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
              onPaymentSuccess(existingKitOrder || { pricing: { paymentType: selectedPlan } });
            }
          }}
          className="w-full h-12 bg-[#00C853] hover:bg-[#00B548] active:scale-[0.99] text-black font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
        >
          <span>Continue to Partner Agreement</span>
          <ArrowRight className="w-4 h-4 text-black ml-1" />
        </button>
      )}
    </div>
  );
}
