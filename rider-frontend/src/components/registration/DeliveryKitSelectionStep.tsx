import React, { useState, useEffect } from "react";
import {
  Package,
  CheckCircle2,
  Check,
  ShieldCheck,
  Sparkles,
  CreditCard,
  Truck,
  Building2,
  Info,
  AlertCircle,
  Loader2,
  Calendar,
  Lock,
  ArrowRight,
  Shirt,
  BadgeCheck,
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

  const kitItems = config?.items || [
    "QuickPress Heavy-Duty Insulated Waterproof Delivery Bag",
    "2x Official QuickPress Dry-Fit Captain T-Shirts",
    "Official RFID / QR Captain ID Card with Lanyard",
    "High-Visibility Reflective Rain Jacket",
  ];

  const sizes = ["M", "L", "XL", "XXL"];

  // Handle Razorpay checkout trigger
  const handleProceedToPayment = async () => {
    if (isProcessingPayment || paymentCompleted) return;
    triggerHaptic();

    if (!riderPhone || riderPhone.trim().length < 10) {
      toast.error("Valid 10-digit mobile number is required.");
      return;
    }

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
        shippingAddress,
      });

      if (!orderRes.ok || !orderRes.razorpayOrderId) {
        throw new Error("Unable to create order. Please try again.");
      }

      const chargeAmount = selectedPlan === "PART_PAYMENT" ? standardKit.partPaymentUpfront : standardKit.totalPrice;

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
              ? `Delivery Kit Down-Payment (₹${chargeAmount})`
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
        shippingAddress,
      });

      if (verifyRes.ok) {
        triggerHaptic();
        setPaymentCompleted(true);
        setVerifiedKitOrder(verifyRes.kitOrder);
        toast.success("✓ Delivery Kit payment confirmed! Partner agreement unlocked.");
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
      {/* 1. Official Gear Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 text-white rounded-2xl p-5 shadow-sm border border-neutral-800">
        <div className="absolute -right-4 -bottom-6 w-32 h-32 bg-[#00C853]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00C853] text-black">
              <Sparkles className="w-3 h-3 fill-black" />
              Official Captain Gear
            </span>
            <h3 className="text-lg font-black tracking-tight text-white mt-1">
              QuickPress Starter Kit
            </h3>
            <p className="text-xs text-neutral-300 max-w-[260px] leading-relaxed">
              Orders delivery karne ke liye branded bag, T-shirt aur official ID card anivarya hai.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
            <Package className="w-7 h-7 text-[#00C853]" />
          </div>
        </div>

        {/* What's Inside Included Items */}
        <div className="mt-4 pt-3.5 border-t border-neutral-800/80">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
            Kit Includes (Kit me kya milega):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {kitItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs text-neutral-200"
              >
                <BadgeCheck className="w-4 h-4 text-[#00C853] shrink-0" />
                <span className="text-[11px] font-medium leading-tight truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Success Banner if Already Paid */}
      {paymentCompleted && (
        <div className="p-4 bg-emerald-50 border-2 border-[#00C853] rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#00C853] text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-950">Kit Payment Verified ✓</p>
                <p className="text-[10px] text-emerald-700 font-bold">
                  {verifiedKitOrder?.pricing?.paymentType === "PART_PAYMENT"
                    ? `Part Payment Done: ₹${verifiedKitOrder?.pricing?.amountPaid || 300} Paid (Balance ₹${verifiedKitOrder?.pricing?.remainingBalance || 900})`
                    : `Full Payment Completed: ₹${verifiedKitOrder?.pricing?.amountPaid || 999}`}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#00C853] text-black">
              PAID
            </span>
          </div>

          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-900">
            <span>Size: <strong>{verifiedKitOrder?.tshirtSize || selectedSize}</strong></span>
            <span>Delivery: <strong>{verifiedKitOrder?.deliveryPreference === "hub_pickup" ? "Hub Pickup" : "Home Delivery"}</strong></span>
            <span>Order ID: <code className="font-mono text-[10px]">{verifiedKitOrder?.id?.slice(-8) || "VERIFIED"}</code></span>
          </div>
        </div>
      )}

      {/* 3. T-Shirt Size Selector */}
      {!paymentCompleted && (
        <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shirt className="w-4 h-4 text-[#00C853]" />
              <label className="text-xs font-black text-neutral-900">T-Shirt Size Chunein *</label>
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
                  className={`py-2 text-xs font-black rounded-xl border transition-all text-center ${
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

      {/* 4. Delivery Preference Selector */}
      {!paymentCompleted && (
        <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#00C853]" />
            <label className="text-xs font-black text-neutral-900">Delivery Kaise Prapt Karein? *</label>
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
                  ? "bg-emerald-50/60 border-[#00C853] ring-2 ring-emerald-100"
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
                <p className="text-xs font-black text-neutral-900">Ghar Par Delivery</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">3-5 Din me Courier dwara</p>
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
                  ? "bg-emerald-50/60 border-[#00C853] ring-2 ring-emerald-100"
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
                <p className="text-xs font-black text-neutral-900">City Hub Pickup</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Kasganj Hub se turant</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 5. Payment Options (Full Payment vs Part Payment) */}
      {!paymentCompleted && (
        <div className="space-y-2.5">
          <label className="text-xs font-black text-neutral-900 px-1">
            Payment Ka Tarika Chunein (Choose Payment Mode) *
          </label>

          {/* Option 1: Part Payment (Popular / Recommended) */}
          <div
            onClick={() => {
              triggerHaptic();
              setSelectedPlan("PART_PAYMENT");
            }}
            className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              selectedPlan === "PART_PAYMENT"
                ? "bg-white border-[#00C853] shadow-md ring-2 ring-emerald-100"
                : "bg-white border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#00C853] text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
              <Sparkles className="w-3 h-3 fill-black" />
              Aasan Kist (Easy EMI)
            </div>

            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedPlan === "PART_PAYMENT"
                    ? "border-[#00C853] bg-[#00C853]"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {selectedPlan === "PART_PAYMENT" && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </div>

              <div className="flex-1 pr-14">
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-black text-neutral-900">Part Payment (Kiston me)</h4>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-neutral-900">
                    ₹{standardKit.partPaymentUpfront.toFixed(0)}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">aaj pay karein</span>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    (Kul Price: ₹{standardKit.partPaymentTotalPrice.toFixed(0)})
                  </span>
                </div>

                <div className="mt-2.5 p-2.5 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700">
                    <Calendar className="w-3.5 h-3.5 text-[#00C853] shrink-0" />
                    <span>
                      Baki ₹{standardKit.remainingBalance.toFixed(0)} aapke weekly payout se katega
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 pl-5">
                    ₹{standardKit.deductionWeekly.toFixed(0)}/hafte agle {standardKit.deductionWeeks} hafton tak (No interest, automatic deduction).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Full Payment */}
          <div
            onClick={() => {
              triggerHaptic();
              setSelectedPlan("FULL_PAYMENT");
            }}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
              selectedPlan === "FULL_PAYMENT"
                ? "bg-white border-[#00C853] shadow-md ring-2 ring-emerald-100"
                : "bg-white border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedPlan === "FULL_PAYMENT"
                    ? "border-[#00C853] bg-[#00C853]"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {selectedPlan === "FULL_PAYMENT" && <Check className="w-3 h-3 text-white stroke-[3]" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-neutral-900">Full Payment (Ek Baar Me)</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Save ₹{(standardKit.partPaymentTotalPrice - standardKit.totalPrice).toFixed(0)}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-neutral-900">
                    ₹{standardKit.totalPrice.toFixed(0)}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">One-time flat price</span>
                  <span className="text-[11px] text-neutral-400 line-through">
                    ₹{standardKit.partPaymentTotalPrice.toFixed(0)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Poora payment abhi karein aur aage koi bhi deduction nahi hoga.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Legal / Regulatory Note */}
      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2 text-[11px] text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-tight">
          <p className="font-bold">Anivarya Niyam (Mandatory Policy):</p>
          <p className="text-amber-800 text-[10px] mt-0.5">
            QuickPress safety guidelines ke mutabiq kit order hone ke baad hi agla Partner Agreement sign kiya ja sakta hai.
            {selectedPlan === "PART_PAYMENT" &&
              " Part payment chunne par baki ₹900 ki katauti ka legal clause agreement me shamil hoga."}
          </p>
        </div>
      </div>

      {/* 7. Action Button: Pay via Razorpay */}
      {!paymentCompleted ? (
        <button
          type="button"
          disabled={isProcessingPayment}
          onClick={handleProceedToPayment}
          className="w-full py-3.5 px-4 bg-[#00C853] hover:bg-[#00B548] active:scale-[0.99] text-black font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isProcessingPayment ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-black" />
              <span>Razorpay Surakshit Payment Khul Raha Hai...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-black" />
              <span>
                Pay ₹
                {selectedPlan === "PART_PAYMENT"
                  ? standardKit.partPaymentUpfront.toFixed(0)
                  : standardKit.totalPrice.toFixed(0)}{" "}
                via Razorpay & Unlock Agreement
              </span>
              <ArrowRight className="w-4 h-4 text-black" />
            </>
          )}
        </button>
      ) : (
        <div className="p-3 bg-neutral-100 rounded-xl text-center">
          <p className="text-xs font-bold text-neutral-700">
            ✓ Kit Payment verified. Neeche "Aage Badhein" button dabakar Agreement sign karein.
          </p>
        </div>
      )}
    </div>
  );
}
