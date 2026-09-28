import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Home,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/hooks/useCart";
import {
  fetchAddresses,
  fetchPaymentMethods,
  getCartState,
  postOrder,
  type Address,
  type PaymentMethod,
} from "@/api/customer/cart-api";
import { fetchWallet } from "@/api/customer/wallet-api";
import { fetchProfile } from "@/api/customer/services/profile-service";
import { updateProfile } from "@/api/customer/profile-api";
import type { CartLine } from "@/api/customer/cart-store";
import {
  fetchFinanceRules,
  type FinancialRules,
  DEFAULT_FINANCIAL_RULES,
} from "@/api/customer/finance-api";
import { payWithCashfree } from "@/api/payments/cashfree-api";
import { getCashfreeInstance } from "@/api/core/cashfree";
import { playOrderPlacedSonicChime } from "@/lib/order-success-sound";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Checkout — QuickPress" }],
  }),
  component: CheckoutPage,
});

export function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useCart();

  // State management
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pickupAddressId, setPickupAddressId] = useState<string>("");
  const [deliveryAddressId, setDeliveryAddressId] = useState<string>("");
  const [sameAsPickup, setSameAsPickup] = useState<boolean>(true);
  const [isExpress, setIsExpress] = useState<boolean>(false);

  // Address picker modals
  const [showPickupPicker, setShowPickupPicker] = useState<boolean>(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState<boolean>(false);

  // Customer contact info
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  // Payment mode: Online (Cashfree) vs Cash on Delivery with Blinkit methods
  const [selectedPayment, setSelectedPayment] = useState<
    "phonepe" | "supermoney" | "famapp" | "upi_custom" | "card" | "wallet" | "cod"
  >("phonepe");
  const [paymentMode, setPaymentMode] = useState<"online" | "cod">("online");
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Status
  const [loading, setLoading] = useState<boolean>(true);
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);

  // Coupon
  const couponDiscount = getCartState().couponDiscount || 0;
  const couponCode = getCartState().couponCode || null;

  const [financeRules, setFinanceRules] = useState<FinancialRules>(DEFAULT_FINANCIAL_RULES);

  // Load backend data and preload Cashfree on mount
  useEffect(() => {
    let alive = true;

    // Preload Cashfree Checkout SDK silently for instant modal display
    void getCashfreeInstance().catch(() => {});

    async function loadData() {
      try {
        const [addrList, walletData, profileData, rulesData] = await Promise.all([
          fetchAddresses().catch(() => []),
          fetchWallet().catch(() => null),
          fetchProfile().catch(() => null),
          fetchFinanceRules().catch(() => DEFAULT_FINANCIAL_RULES),
        ]);

        if (!alive) return;

        if (rulesData) {
          setFinanceRules(rulesData);
        }

        // Populate addresses
        if (addrList.length > 0 && addrList[0]) {
          setAddresses(addrList);
          setPickupAddressId(addrList[0].id);
          setDeliveryAddressId(addrList[0].id);
        }

        // Populate wallet
        if (walletData) {
          setWalletBalance(walletData.balances?.currentBalance ?? walletData.totalBalance ?? 0);
        }

        // Populate profile
        const prof = (profileData && typeof profileData === "object" && "data" in profileData
          ? (profileData as { data: { name?: string; phone?: string } }).data
          : profileData) as { name?: string; phone?: string } | null;
        if (prof?.name && prof.name !== "Customer" && prof.name !== "Guest User") {
          setCustomerName(prof.name);
        } else {
          setCustomerName("");
        }
        if (prof?.phone) {
          setCustomerPhone(prof.phone);
        } else if (addrList[0]?.phone) {
          setCustomerPhone(addrList[0].phone);
        }
      } catch (err) {
        console.warn("Checkout initialization error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadData();
    return () => {
      alive = false;
    };
  }, []);

  // Synchronize delivery address if sameAsPickup is active
  useEffect(() => {
    if (sameAsPickup) {
      setDeliveryAddressId(pickupAddressId);
    }
  }, [pickupAddressId, sameAsPickup]);

  // Pricing calculations driven dynamically by Unified Finance Engine
  const itemsSubtotal = cart.lines.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalMRP = cart.lines.reduce((sum, item) => sum + Math.round(item.price * 1.25) * item.qty, 0);

  const freeDeliveryThreshold = financeRules?.delivery?.freeDeliveryThreshold ?? 499;
  const isFreeDelivery = itemsSubtotal >= freeDeliveryThreshold;
  const baseDeliveryFee = financeRules?.delivery?.slabs?.[0]?.fee ?? (financeRules?.delivery?.baseFee ?? 30);
  const deliveryFee = itemsSubtotal > 0 ? (isFreeDelivery ? 0 : baseDeliveryFee) : 0;
  const handlingFee = itemsSubtotal > 0 ? (financeRules?.pricing?.handlingFee ?? 15) : 0;
  const platformFee = itemsSubtotal > 0 ? (financeRules?.pricing?.platformFee ?? 10) : 0;

  const expressFee = financeRules?.expressPickup?.fee ?? 40;
  const isExpressEnabled = financeRules?.expressPickup?.enabled !== false;
  const isExpressActive = isExpress && isExpressEnabled;
  const currentExpressFee = isExpressActive ? expressFee : 0;

  // 5% fabric laundry GST + 18% services GST
  const laundryGst = Math.round(Math.max(0, itemsSubtotal - couponDiscount) * (financeRules?.gst?.laundryGstRate ?? 0.05));
  const serviceGst = Math.round((deliveryFee + handlingFee + platformFee + currentExpressFee) * (financeRules?.gst?.platformGstRate ?? 0.18));
  const gst = laundryGst + serviceGst;

  const grandTotal = Math.max(0, itemsSubtotal + deliveryFee + handlingFee + platformFee + currentExpressFee + gst - couponDiscount);
  const savings = Math.max(0, totalMRP - itemsSubtotal) + couponDiscount + (isFreeDelivery && itemsSubtotal > 0 ? baseDeliveryFee : 0);

  const selectedPickup = addresses.find((a) => a.id === pickupAddressId) || addresses[0];
  const selectedDelivery = sameAsPickup
    ? selectedPickup
    : addresses.find((a) => a.id === deliveryAddressId) || addresses[0];

  // Direct Action: Triggers Cashfree Checkout directly for Online, or places COD
  const handleProceedToPayOrOrder = async () => {
    if (cart.lines.length === 0) {
      toast.error("Your cart is empty.");
      navigate({ to: "/home" });
      return;
    }

    const minOrderVal = financeRules?.pricing?.minimumOrderValue ?? 0;
    if (minOrderVal > 0 && itemsSubtotal < minOrderVal) {
      toast.error(
        `Minimum order amount is ₹${minOrderVal}. Your current items total is ₹${itemsSubtotal}. Please add more items.`
      );
      return;
    }

    if (!customerName.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!selectedPickup || !selectedPickup.line || !selectedPickup.line.trim() || addresses.length === 0) {
      toast.error("Please add a delivery address to place your order.");
      setShowPickupPicker(true);
      return;
    }

    // 1. CASH ON DELIVERY FLOW
    if (paymentMode === "cod") {
      if (grandTotal < 50) {
        toast.error("Cash on delivery is not available for orders below ₹50.");
        return;
      }
      await handleSelectCod();
      return;
    }

    // 2. DIRECT ONLINE PAYMENT VIA CASHFREE
    if (placingOrder) return;
    setPlacingOrder(true);

    try {
      toast.info("Opening Cashfree Secure Gateway...");
      const outcome = await payWithCashfree({
        amount: grandTotal,
        purpose: "QuickPress Laundry Order",
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
      });

      if (outcome.status === "success") {
        toast.success("Payment Successful! 💳 Placing your order...");
        await handlePaymentSuccess("cashfree", outcome.paymentId);
      } else if (outcome.status === "user_dropped") {
        toast.error("Payment cancelled. Order has NOT been placed.");
      } else {
        toast.error(outcome.reason || "Payment rejected. Order has NOT been placed.");
      }
    } catch (err: any) {
      console.error("[Checkout] Cashfree error:", err);
      toast.error(err?.message || "Payment could not be processed. Order has NOT been placed.");
    } finally {
      setPlacingOrder(false);
    }
  };

  // Called ONLY when Online Payment (UPI / Card / Netbanking / Wallet) is 100% verified
  const handlePaymentSuccess = async (method: string, paymentId: string) => {
    if (!selectedPickup) {
      toast.error("Please select a pickup address.");
      return;
    }
    setPlacingOrder(true);
    try {
      const cleanPhone = customerPhone.replace(/\D/g, "");
      const result = await postOrder({
        items: cart.lines.map((l) => ({
          id: l.id,
          name: l.name,
          price: l.price,
          unit: l.unit,
          qty: l.qty,
          image: l.image || "",
          description: l.description || "",
        })),
        addressId: selectedPickup.id,
        address: selectedPickup,
        deliveryAddress: selectedDelivery,
        pickup: {
          day: "Today",
          slot: isExpressActive ? "⚡ 15-Min Express Pickup" : "15-30 mins",
          express: isExpressActive,
        },
        isExpress: isExpressActive,
        expressFee: currentExpressFee,
        paymentId,
        paymentMethod: method,
        total: grandTotal,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
      });

      // Play Rapido-style ascending celebration sound + tactile haptics
      playOrderPlacedSonicChime();

      toast.success("Order Placed Successfully! 🎉");
      cart.clear();

      // Persist customer name and phone into profile
      void updateProfile({ name: customerName.trim(), phone: cleanPhone }).catch(() => {});

      void navigate({
        to: "/order-success/$orderId",
        params: { orderId: result.orderId || `ord-${Date.now()}` },
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  // Called when Customer explicitly selects Pay on Delivery (COD)
  const handleSelectCod = async () => {
    if (!selectedPickup) {
      toast.error("Please select a pickup address.");
      return;
    }
    setPlacingOrder(true);
    try {
      const cleanPhone = customerPhone.replace(/\D/g, "");
      const result = await postOrder({
        items: cart.lines.map((l) => ({
          id: l.id,
          name: l.name,
          price: l.price,
          unit: l.unit,
          qty: l.qty,
          image: l.image || "",
          description: l.description || "",
        })),
        addressId: selectedPickup.id,
        address: selectedPickup,
        deliveryAddress: selectedDelivery,
        pickup: {
          day: "Today",
          slot: isExpressActive ? "⚡ 15-Min Express Pickup" : "15-30 mins",
          express: isExpressActive,
        },
        isExpress: isExpressActive,
        expressFee: currentExpressFee,
        paymentId: "cod",
        paymentMethod: "cod",
        total: grandTotal,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
      });

      // Play Rapido-style ascending celebration sound + tactile haptics
      playOrderPlacedSonicChime();

      toast.success("Order Placed with Pay on Delivery! 📦");
      cart.clear();

      // Persist customer name and phone into profile
      void updateProfile({ name: customerName.trim(), phone: cleanPhone }).catch(() => {});

      void navigate({
        to: "/order-success/$orderId",
        params: { orderId: result.orderId || `ord-${Date.now()}` },
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to place COD order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#0c831f]" />
          <p className="text-xs font-bold text-zinc-500">Preparing Checkout...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-zinc-950 font-sans pb-36">
      {/* Top Header — Clean Blinkit Minimalist White */}
      <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back to cart"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/cart" });
              }
            }}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 transition-colors hover:bg-zinc-200 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="size-4.5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-zinc-950 tracking-tight">Checkout</h1>
            <p className="text-[11px] font-bold text-[#0c831f] flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[#0c831f]" />
              QuickPress • Express Delivery
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pt-3 space-y-4">

        {/* SECTION 1: PICKUP ADDRESS */}
        <div>
          <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
            Delivery Location
          </h2>
          <section aria-label="Pickup Address" className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#0c831f] tracking-wide">
                <MapPin className="size-3" />
                Pickup Location
              </span>
              <button
                type="button"
                onClick={() => setShowPickupPicker(true)}
                className="text-xs font-black text-[#0c831f] hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {selectedPickup && selectedPickup.line?.trim() ? (
              <div className="flex items-start gap-2.5 pt-1">
                <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-[#0c831f] shrink-0 mt-0.5">
                  <Home className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-zinc-950">{selectedPickup.label}</p>
                  <p className="text-xs text-zinc-600 leading-relaxed truncate">{selectedPickup.line}</p>
                  <p className="text-[11px] text-zinc-400">
                    {selectedPickup.city} {selectedPickup.pincode ? `• PIN ${selectedPickup.pincode}` : ""}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                    <span className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Zap className="size-3 text-emerald-600" />
                      Express Fast Dispatch Available
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3.5 text-center space-y-2">
                <p className="text-xs font-bold text-zinc-900">No delivery address selected</p>
                <p className="text-[11px] text-zinc-500">Please add your address so our rider can pick up your clothes.</p>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/addresses" })}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0c831f] hover:bg-emerald-800 px-4 py-2 text-xs font-black text-white active:scale-95 transition-transform cursor-pointer shadow-xs"
                >
                  <Plus className="size-3.5 stroke-[3]" />
                  <span>Add Delivery Address</span>
                </button>
              </div>
            )}

            {/* Same address toggle */}
            <div className="pt-2 border-t border-zinc-100">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sameAsPickup}
                  onChange={(e) => setSameAsPickup(e.target.checked)}
                  className="size-4 rounded text-[#0c831f] focus:ring-[#0c831f] accent-[#0c831f] cursor-pointer"
                />
                <span className="text-xs font-bold text-zinc-800">
                  Return to same location
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* Separate delivery address if chosen */}
        {!sameAsPickup ? (
          <div>
            <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Return Dropoff Address
            </h2>
            <section aria-label="Dropoff Address" className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 tracking-wide">
                  <MapPin className="size-3" />
                  Dropoff Location
                </span>
                <button
                  type="button"
                  onClick={() => setShowDeliveryPicker(true)}
                  className="text-xs font-black text-blue-700 hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {selectedDelivery ? (
                <div className="flex items-start gap-2.5 pt-1">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                    <Home className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-zinc-950">{selectedDelivery.label}</p>
                    <p className="text-xs text-zinc-600 leading-relaxed truncate">{selectedDelivery.line}</p>
                    <p className="text-[11px] text-zinc-400">{selectedDelivery.city}</p>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {/* SECTION 2: PICKUP SPEED & TURNAROUND */}
        <div>
          <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
            Pickup Speed & Turnaround
          </h2>
          <section aria-label="Pickup Speed" className="bg-white rounded-2xl shadow-2xs border border-zinc-200/90 divide-y divide-zinc-100 overflow-hidden">
            {/* Standard Pickup */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsExpress(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setIsExpress(false); }}
              className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                !isExpressActive ? "bg-emerald-50/30" : "hover:bg-zinc-50/80 bg-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-[#0c831f] border border-emerald-100">
                  <Clock className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-black text-zinc-950">Standard Pickup</p>
                    <span className="bg-emerald-100 text-[#0c831f] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      FREE
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                    Captain assigned in 30–60 mins • Regular laundry queue
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {!isExpressActive ? (
                  <Check className="size-5 text-[#0c831f] stroke-[3]" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-zinc-300" />
                )}
              </div>
            </div>

            {/* Express Priority */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!isExpressEnabled) {
                  toast.info("Express pickup is temporarily disabled by operations.");
                  return;
                }
                setIsExpress(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (isExpressEnabled) setIsExpress(true);
                }
              }}
              className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                isExpressActive ? "bg-emerald-50/30" : "hover:bg-zinc-50/80 bg-white"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-[#0c831f] border border-emerald-100">
                  <Zap className="size-5 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-black text-zinc-950">Express Priority Pickup</p>
                    <span className="bg-[#0c831f] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                      +₹{expressFee}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                    Nearest Captain dispatched in 15 mins • Priority fast wash
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {isExpressActive ? (
                  <Check className="size-5 text-[#0c831f] stroke-[3]" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-zinc-300" />
                )}
              </div>
            </div>
          </section>
        </div>

        {/* SECTION 3: CONTACT DETAILS */}
        <div>
          <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
            Contact Details
          </h2>
          <section aria-label="Customer Details" className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <User className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-900 placeholder:font-normal focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] focus:outline-hidden"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                <input
                  type="tel"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit Phone"
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-900 placeholder:font-normal focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] focus:outline-hidden"
                />
              </div>
            </div>
          </section>
        </div>

        {/* SECTION 4: ITEMS SELECTED */}
        <div>
          <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>Items Selected ({cart.count})</span>
            <span className="text-[#0c831f] font-bold">₹{itemsSubtotal}</span>
          </h2>
          <section aria-label="Items Review" className="bg-white rounded-2xl shadow-2xs border border-zinc-200/90 divide-y divide-zinc-100 overflow-hidden">
            {cart.lines.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-white hover:bg-zinc-50/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-zinc-900">{item.name}</p>
                  <p className="text-[11px] font-semibold text-zinc-500">
                    ₹{item.price} / {item.unit || "item"}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-1 shadow-2xs">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => (item.qty === 1 ? cart.remove(item.id) : cart.step(item.id, -1))}
                      className="size-5 flex items-center justify-center text-zinc-700 active:scale-90 cursor-pointer"
                    >
                      {item.qty === 1 ? <Trash2 className="size-3 text-red-500" /> : <Minus className="size-3 stroke-[2.5]" />}
                    </button>
                    <span className="w-5 text-center text-xs font-black text-zinc-900 tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => cart.step(item.id, 1)}
                      className="size-5 flex items-center justify-center rounded bg-[#0c831f] text-white active:scale-90 cursor-pointer"
                    >
                      <Plus className="size-3 stroke-[2.5]" />
                    </button>
                  </div>

                  <span className="text-xs font-black text-zinc-900 min-w-12 text-right tabular-nums">
                    ₹{item.price * item.qty}
                  </span>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* SECTION 5: PAYMENT METHOD (Blinkit Inset Grouped Theme Matching Screenshot) */}
        <section aria-label="Payment Method" className="space-y-3.5">
          {/* CARDS */}
          <div>
            <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Cards
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-zinc-200/90 divide-y divide-zinc-100">
              {/* Add credit or debit cards */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment("card");
                  setPaymentMode("online");
                }}
                className={`flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer ${
                  selectedPayment === "card" ? "bg-emerald-50/30" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-2xs">
                    <CreditCard className="size-5 text-zinc-700" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900">
                    Add credit or debit cards
                  </span>
                </div>
                {selectedPayment === "card" ? (
                  <Check className="size-5 text-[#0c831f] stroke-[3]" />
                ) : (
                  <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
                )}
              </button>

              {/* Add Pluxee */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment("card");
                  setPaymentMode("online");
                }}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer bg-white"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-2xs px-1">
                    <span className="font-black text-[10.5px] tracking-tight text-[#1a1c3d]">
                      plux<span className="text-[#f7c800]">e</span>e
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900">
                    Add Pluxee
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>
            </div>
          </div>

          {/* UPI */}
          <div>
            <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              UPI
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-zinc-200/90 divide-y divide-zinc-100">
              {/* PhonePe UPI */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment("phonepe");
                  setPaymentMode("online");
                }}
                className={`flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer ${
                  selectedPayment === "phonepe" ? "bg-emerald-50/30" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-2xs">
                    <div className="size-6 rounded-full bg-[#5f259f] flex items-center justify-center text-white font-black text-xs shadow-2xs">
                      पे
                    </div>
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 block">
                      PhonePe UPI
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">Instant UPI Auto-Pay / QR</span>
                  </div>
                </div>
                {selectedPayment === "phonepe" ? (
                  <Check className="size-5 text-[#0c831f] stroke-[3]" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-zinc-300" />
                )}
              </button>

              {/* Supermoney UPI */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment("supermoney");
                  setPaymentMode("online");
                }}
                className={`flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer ${
                  selectedPayment === "supermoney" ? "bg-emerald-50/30" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-2xs px-1 gap-1">
                    <div className="size-4 shrink-0 rounded-[3.5px] bg-[#3237d6] flex items-center justify-center shadow-2xs">
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="flex flex-col text-left font-black text-[8px] leading-[8px] tracking-tight text-[#16173d]">
                      <span>super.</span>
                      <span>money</span>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900">
                    Supermoney UPI
                  </span>
                </div>
                {selectedPayment === "supermoney" ? (
                  <Check className="size-5 text-[#0c831f] stroke-[3]" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-zinc-300" />
                )}
              </button>

              {/* FamApp UPI */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment("famapp");
                  setPaymentMode("online");
                }}
                className={`flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer ${
                  selectedPayment === "famapp" ? "bg-emerald-50/30" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#ea7a1e] to-[#f49322] shadow-2xs p-1">
                    <Zap className="w-5 h-5 text-white fill-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900">
                    FamApp UPI
                  </span>
                </div>
                {selectedPayment === "famapp" ? (
                  <Check className="size-5 text-[#0c831f] stroke-[3]" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-zinc-300" />
                )}
              </button>

              {/* Add new UPI ID */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment("upi_custom");
                  setPaymentMode("online");
                }}
                className={`flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer ${
                  selectedPayment === "upi_custom" ? "bg-emerald-50/30" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-2xs">
                    <span className="text-base font-bold">@</span>
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 block">
                      Add new UPI ID / Google Pay / Paytm
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">GPay, Paytm, BHIM & more</span>
                  </div>
                </div>
                {selectedPayment === "upi_custom" ? (
                  <Check className="size-5 text-[#0c831f] stroke-[3]" />
                ) : (
                  <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
                )}
              </button>
            </div>
          </div>

          {/* WALLETS */}
          <div>
            <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Wallets
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-zinc-200/90 divide-y divide-zinc-100">
              {/* QuickPress Wallet */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment("wallet");
                  setPaymentMode("online");
                }}
                className={`flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer ${
                  selectedPayment === "wallet" ? "bg-emerald-50/30" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-emerald-50 text-[#0c831f] shadow-2xs">
                    <Wallet className="size-4.5" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 block">
                      QuickPress Wallet
                    </span>
                    <span className="text-[10px] text-[#0c831f] font-bold">
                      Balance: ₹{walletBalance}
                    </span>
                  </div>
                </div>
                {selectedPayment === "wallet" ? (
                  <Check className="size-5 text-[#0c831f] stroke-[3]" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-zinc-300" />
                )}
              </button>

              {/* Amazon Pay Balance */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment("wallet");
                  setPaymentMode("online");
                }}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer bg-white"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-950 text-white shadow-2xs px-1">
                    <span className="font-black text-[10px] tracking-tight">pay</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900">
                    Amazon Pay Balance
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>

              {/* Mobikwik */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment("wallet");
                  setPaymentMode("online");
                }}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer bg-white"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-[#0089e0] text-white shadow-2xs px-1">
                    <span className="font-black text-[10px] tracking-tight">M!</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900">
                    Mobikwik
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>
            </div>
          </div>

          {/* PAY ON DELIVERY */}
          <div>
            <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Pay on Delivery
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-zinc-200/90">
              <button
                type="button"
                onClick={() => {
                  if (grandTotal < 50) {
                    toast.error("Cash on delivery is not available for orders below ₹50.");
                    return;
                  }
                  setSelectedPayment("cod");
                  setPaymentMode("cod");
                }}
                className={`flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer ${
                  grandTotal < 50 ? "opacity-50 cursor-not-allowed bg-zinc-50" : selectedPayment === "cod" ? "bg-emerald-50/30" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-2xs">
                    <Banknote className="size-5 text-[#0c831f]" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 block">
                      Cash on Delivery / Scan on Pickup
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Pay cash or scan QR when rider arrives
                    </span>
                  </div>
                </div>
                {selectedPayment === "cod" ? (
                  <Check className="size-5 text-[#0c831f] stroke-[3]" />
                ) : (
                  <div className="size-5 rounded-full border-2 border-zinc-300" />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 6: BILL DETAILS */}
        <div>
          <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
            Bill Details
          </h2>
          <section aria-label="Bill Breakdown" className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs space-y-2.5">
            <div className="space-y-1.5 text-xs font-medium text-zinc-600">
              <div className="flex justify-between">
                <span>Items Total</span>
                <span className="font-bold text-zinc-900">₹{itemsSubtotal}</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Delivery Partner Fee</span>
                <div className="flex items-center gap-1.5">
                  {isFreeDelivery ? (
                    <>
                      <span className="text-[10px] line-through text-zinc-400">₹{baseDeliveryFee}</span>
                      <span className="font-black text-[#0c831f] text-[10px] uppercase">FREE</span>
                    </>
                  ) : (
                    <span className="font-bold text-zinc-900">₹{deliveryFee}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <span>Handling &amp; Packaging</span>
                <span className="font-bold text-zinc-900">₹{handlingFee}</span>
              </div>

              <div className="flex justify-between">
                <span>Platform Convenience Fee</span>
                <span className="font-bold text-zinc-900">₹{platformFee}</span>
              </div>

              {isExpressActive ? (
                <div className="flex justify-between items-center text-emerald-900 font-bold bg-emerald-50/80 px-2 py-1.5 rounded-lg border border-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-[#0c831f] fill-[#0c831f]" />
                    ⚡ Express 15-Min Priority Pickup
                  </span>
                  <span className="font-black text-[#0c831f]">+₹{expressFee}</span>
                </div>
              ) : null}

              <div className="flex justify-between">
                <span>GST &amp; Taxes (5% Laundry + 18% Fees)</span>
                <span className="font-bold text-zinc-900">₹{gst}</span>
              </div>

              {couponDiscount > 0 ? (
                <div className="flex justify-between text-[#0c831f] font-bold">
                  <span>Coupon ({couponCode})</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              ) : null}

              <div className="border-t border-zinc-200 pt-2.5 flex justify-between items-center text-sm font-black text-zinc-900">
                <span>Grand Total</span>
                <span className="text-base text-zinc-950 font-black">₹{grandTotal}</span>
              </div>
            </div>

            {savings > 0 ? (
              <div className="rounded-xl bg-emerald-50 p-2 text-center text-xs font-black text-[#0c831f] border border-emerald-200">
                🎉 Total Savings: ₹{savings}
              </div>
            ) : null}
          </section>
        </div>

        {/* SECTION 7: TRUST & CANCELLATION */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-3.5 shadow-2xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
            <ShieldCheck className="size-4 text-[#0c831f] shrink-0" />
            <span>100% Safe &amp; Secure Payments • Cashfree Certified</span>
          </div>
          <p className="text-[10.5px] text-zinc-500 leading-relaxed">
            Cancellation Policy: Orders can be cancelled anytime before rider pickup dispatch for an instant 100% refund.
          </p>
        </div>
      </div>

      {/* SECTION 8: STICKY BOTTOM ACTION BAR */}
      <aside className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-zinc-200/90 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {/* Pre-order Legal Disclosure */}
        <p className="pb-2.5 text-center text-[10.5px] leading-relaxed text-zinc-500">
          By placing this order, you agree to the QuickPress{" "}
          <Link
            to="/legal/$docSlug"
            params={{ docSlug: "terms-of-service" }}
            className="font-bold text-zinc-800 underline hover:text-[#0c831f]"
          >
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link
            to="/legal/$docSlug"
            params={{ docSlug: "privacy-policy" }}
            className="font-bold text-zinc-800 underline hover:text-[#0c831f]"
          >
            Privacy Policy
          </Link>.
        </p>

        <div className="mx-auto max-w-md flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">To Pay</p>
            <p className="text-xl font-black text-zinc-950 leading-tight tabular-nums">₹{grandTotal}</p>
          </div>

          <button
            type="button"
            disabled={placingOrder}
            onClick={handleProceedToPayOrOrder}
            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0c831f] hover:bg-[#0a701a] disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md active:scale-98 transition-all cursor-pointer"
          >
            {placingOrder ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : selectedPayment === "cod" ? (
              <>
                <span>PAY ON DELIVERY • ₹{grandTotal}</span>
                <ChevronRight className="size-4.5 stroke-[3]" />
              </>
            ) : selectedPayment === "phonepe" ? (
              <>
                <span>PAY VIA PHONEPE • ₹{grandTotal}</span>
                <ChevronRight className="size-4.5 stroke-[3]" />
              </>
            ) : selectedPayment === "supermoney" ? (
              <>
                <span>PAY VIA SUPERMONEY • ₹{grandTotal}</span>
                <ChevronRight className="size-4.5 stroke-[3]" />
              </>
            ) : selectedPayment === "famapp" ? (
              <>
                <span>PAY VIA FAMAPP • ₹{grandTotal}</span>
                <ChevronRight className="size-4.5 stroke-[3]" />
              </>
            ) : selectedPayment === "card" ? (
              <>
                <span>PAY VIA CARD • ₹{grandTotal}</span>
                <ChevronRight className="size-4.5 stroke-[3]" />
              </>
            ) : selectedPayment === "wallet" ? (
              <>
                <span>PAY VIA WALLET • ₹{grandTotal}</span>
                <ChevronRight className="size-4.5 stroke-[3]" />
              </>
            ) : (
              <>
                <span>PROCEED TO PAY • ₹{grandTotal}</span>
                <ChevronRight className="size-4.5 stroke-[3]" />
              </>
            )}
          </button>
        </div>
      </aside>


      {/* Address Picker Modal (Pickup) */}
      {showPickupPicker ? (
        <AddressPickerModal
          title="Select Pickup Address"
          addresses={addresses}
          selectedId={pickupAddressId}
          onSelect={(id) => {
            setPickupAddressId(id);
            setShowPickupPicker(false);
          }}
          onAddNew={() => {
            setShowPickupPicker(false);
            navigate({ to: "/addresses" });
          }}
          onClose={() => setShowPickupPicker(false)}
        />
      ) : null}

      {/* Address Picker Modal (Delivery) */}
      {showDeliveryPicker ? (
        <AddressPickerModal
          title="Select Delivery Address"
          addresses={addresses}
          selectedId={deliveryAddressId}
          onSelect={(id) => {
            setDeliveryAddressId(id);
            setShowDeliveryPicker(false);
          }}
          onAddNew={() => {
            setShowDeliveryPicker(false);
            navigate({ to: "/addresses" });
          }}
          onClose={() => setShowDeliveryPicker(false)}
        />
      ) : null}
    </main>
  );
}

function AddressPickerModal({
  title,
  addresses,
  selectedId,
  onSelect,
  onClose,
  onAddNew,
}: {
  title: string;
  addresses: Address[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onAddNew?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h2 className="text-sm font-black text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            Close
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-xs font-bold text-zinc-600">No saved addresses found.</p>
            {onAddNew ? (
              <button
                type="button"
                onClick={onAddNew}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0c831f] hover:bg-emerald-800 px-4 py-2 text-xs font-black text-white active:scale-95 cursor-pointer shadow-xs"
              >
                <Plus className="size-3.5 stroke-[3]" />
                <span>Add New Address</span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                onClick={() => onSelect(addr.id)}
                className={`p-3 rounded-xl border flex items-start justify-between cursor-pointer transition-colors ${
                  addr.id === selectedId
                    ? "border-[#0c831f] bg-emerald-50/50"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-zinc-900">{addr.label}</p>
                  <p className="text-xs text-zinc-600 truncate">{addr.line}</p>
                  <p className="text-[11px] text-zinc-400">{addr.city}</p>
                </div>
                {addr.id === selectedId ? (
                  <CheckCircle2 className="size-4 text-[#0c831f] shrink-0 mt-0.5" />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {addresses.length > 0 && onAddNew ? (
          <div className="pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onAddNew}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-zinc-300 text-xs font-bold text-[#0c831f] hover:bg-emerald-50 active:scale-98 transition-colors cursor-pointer"
            >
              <Plus className="size-3.5 stroke-[3]" />
              <span>Add Another Address</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
