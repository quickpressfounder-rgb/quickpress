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
  Percent,
  Phone,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/hooks/useCart";
import { BlinkitPaymentDrawer } from "@/components/payment/BlinkitPaymentDrawer";
import {
  fetchAddresses,
  fetchPaymentMethods,
  getCartState,
  postOrder,
  readCachedAddresses,
  setCartState,
  type Address,
  type PaymentMethod,
} from "@/api/customer/cart-api";
import { fetchWallet } from "@/api/customer/wallet-api";
import { fetchProfile, type Profile } from "@/api/customer/services/profile-service";
import { updateProfile } from "@/api/customer/profile-api";
import type { CartLine } from "@/api/customer/cart-store";
import {
  fetchFinanceRules,
  type FinancialRules,
  DEFAULT_FINANCIAL_RULES,
} from "@/api/customer/finance-api";
import { payWithRazorpay } from "@/api/payments/razorpay-api";
import { loadRazorpayCheckout } from "@/api/core/razorpay";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { readSession } from "@/api/core/session-store";
import { CACHE_KEYS, readStaleCache, writeCache } from "@/api/customer/api/cache";

function normalizeIndianPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Checkout — QuickPress" }],
  }),
  component: CheckoutPage,
});

export function CheckoutPage() {
  const { isAuthenticated } = useAuthGuard();
  const navigate = useNavigate();
  const cart = useCart();

  // Instant cache-first initialization (0ms paint)
  const cachedAddrs = readCachedAddresses();
  const [addresses, setAddresses] = useState<Address[]>(() => cachedAddrs);
  const [pickupAddressId, setPickupAddressId] = useState<string>(() => cachedAddrs[0]?.id || "");
  const [deliveryAddressId, setDeliveryAddressId] = useState<string>(() => cachedAddrs[0]?.id || "");
  const [sameAsPickup, setSameAsPickup] = useState<boolean>(true);
  const [isExpress, setIsExpress] = useState<boolean>(false);

  // Address picker modals
  const [showPickupPicker, setShowPickupPicker] = useState<boolean>(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState<boolean>(false);

  // Customer contact info (synced from session / cache instantly)
  const session = readSession("customer");
  const cachedProfile = readStaleCache<Profile>(CACHE_KEYS.profile);
  const initialName =
    cachedProfile?.name && cachedProfile.name !== "Customer" && cachedProfile.name !== "Guest User"
      ? cachedProfile.name
      : session?.account?.name && session.account.name !== "Customer" && session.account.name !== "Guest User"
      ? session.account.name
      : "";
  const initialPhone = normalizeIndianPhone(
    cachedProfile?.phone || session?.account?.phone || cachedAddrs[0]?.phone || ""
  );

  const [customerName, setCustomerName] = useState<string>(() => initialName);
  const [customerPhone, setCustomerPhone] = useState<string>(() => initialPhone);

  // Special care instructions (from cart state)
  const [instructions, setInstructions] = useState<string>(() => getCartState().instructions || "");

  // Coupon state (from cart state, with interactive input + apply/remove)
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(() => getCartState().couponCode || null);
  const [couponDiscount, setCouponDiscount] = useState<number>(() => getCartState().couponDiscount || 0);

  // Payment mode & drawer
  const [showPaymentDrawer, setShowPaymentDrawer] = useState<boolean>(false);
  const cachedWallet = readStaleCache<any>(CACHE_KEYS.wallet);
  const initialWallet = cachedWallet?.balances?.currentBalance ?? cachedWallet?.totalBalance ?? 0;
  const [walletBalance, setWalletBalance] = useState<number>(() => initialWallet);

  // Background refresh status (does NOT block initial screen paint)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(() => cachedAddrs.length === 0);
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);

  const cachedRules = readStaleCache<FinancialRules>("finance_rules");
  const [financeRules, setFinanceRules] = useState<FinancialRules>(() => cachedRules || DEFAULT_FINANCIAL_RULES);

  // Sync instructions to store
  const handleInstructionChange = (text: string) => {
    setInstructions(text);
    setCartState({ instructions: text });
  };

  // Coupon handlers
  const handleApplyCoupon = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    if (clean === "WELCOME50" || clean === "QUICK50") {
      setAppliedCoupon(clean);
      setCouponDiscount(50);
      setCartState({ couponCode: clean, couponDiscount: 50 });
      toast.success(`${clean} applied! ₹50 saved.`);
    } else if (clean === "FIRSTFREE") {
      setAppliedCoupon(clean);
      setCouponDiscount(75);
      setCartState({ couponCode: clean, couponDiscount: 75 });
      toast.success(`${clean} applied! ₹75 saved.`);
    } else {
      toast.error("Invalid coupon code. Try WELCOME50");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCartState({ couponCode: null, couponDiscount: 0 });
    toast.info("Coupon removed.");
  };

  // Load backend data in the background silently (stale-while-revalidate)
  useEffect(() => {
    let alive = true;

    // Preload Razorpay Checkout SDK silently for instant modal display
    void loadRazorpayCheckout().catch(() => {});

    if (!isAuthenticated) return;

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
          writeCache("finance_rules", rulesData);
        }

        // Populate addresses
        if (addrList.length > 0 && addrList[0]) {
          setAddresses(addrList);
          setPickupAddressId((prev) => (prev && addrList.some((a) => a.id === prev) ? prev : addrList[0].id));
          setDeliveryAddressId((prev) => (prev && addrList.some((a) => a.id === prev) ? prev : addrList[0].id));
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
          setCustomerName((prev) => prev || prof.name || "");
        }
        if (prof?.phone) {
          setCustomerPhone((prev) => prev || normalizeIndianPhone(prof.phone || ""));
        } else if (addrList[0]?.phone) {
          setCustomerPhone((prev) => prev || normalizeIndianPhone(addrList[0].phone));
        }
      } catch (err) {
        console.warn("Checkout background refresh error:", err);
      } finally {
        if (alive) setIsRefreshing(false);
      }
    }

    void loadData();
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  // Synchronize delivery address if sameAsPickup is active
  useEffect(() => {
    if (sameAsPickup) {
      setDeliveryAddressId(pickupAddressId);
    }
  }, [pickupAddressId, sameAsPickup]);

  // Pricing calculations driven dynamically by Unified Finance Engine
  const universalBase = financeRules?.pricing?.universalBasePrice ?? 69;
  const itemsSubtotal = cart.lines.reduce((sum, item) => sum + (item.price || universalBase) * item.qty, 0);
  const totalMRP = cart.lines.reduce((sum, item) => sum + Math.round((item.price || universalBase) * 1.25) * item.qty, 0);

  const freeDeliveryThreshold = financeRules?.delivery?.freeDeliveryThreshold ?? 499;
  const isFreeDelivery = itemsSubtotal >= freeDeliveryThreshold;
  const baseDeliveryFee = financeRules?.delivery?.slabs?.[0]?.fee ?? (financeRules?.delivery?.baseFee ?? 30);
  const deliveryFee = itemsSubtotal > 0 ? (isFreeDelivery ? 0 : baseDeliveryFee) : 0;
  const handlingFee = itemsSubtotal > 0 ? (financeRules?.pricing?.handlingFee ?? 15) : 0;
  const platformFee = itemsSubtotal > 0 ? (financeRules?.pricing?.platformFee ?? 10) : 0;

  const expressFee = financeRules?.pricing?.universalExpressPrice ?? financeRules?.expressPickup?.fee ?? 99;
  const isExpressEnabled = financeRules?.expressPickup?.enabled !== false;
  const isExpressActive = isExpress && isExpressEnabled;
  const currentExpressFee = isExpressActive ? expressFee : 0;

  // 5% fabric laundry GST + 18% services GST
  const laundryGst = Math.round(Math.max(0, itemsSubtotal - couponDiscount) * (financeRules?.gst?.laundryGstRate ?? 0.05));
  const serviceGst = Math.round((deliveryFee + handlingFee + platformFee + currentExpressFee) * (financeRules?.gst?.platformGstRate ?? 0.18));
  const gst = laundryGst + serviceGst;

  const grandTotal = Math.round(
    Math.max(0, itemsSubtotal + deliveryFee + handlingFee + platformFee + currentExpressFee + gst - couponDiscount)
  );
  const savings = Math.max(0, totalMRP - itemsSubtotal) + couponDiscount + (isFreeDelivery && itemsSubtotal > 0 ? baseDeliveryFee : 0);

  const selectedPickup = addresses.find((a) => a.id === pickupAddressId) || addresses[0];
  const selectedDelivery = sameAsPickup
    ? selectedPickup
    : addresses.find((a) => a.id === deliveryAddressId) || addresses[0];

  // Validate details and open Payment Selection Drawer
  const handleProceedToPayment = () => {
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

    const cleanPhone = normalizeIndianPhone(customerPhone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!selectedPickup || !selectedPickup.line || !selectedPickup.line.trim() || addresses.length === 0) {
      toast.error("Please add a delivery address to place your order.");
      setShowPickupPicker(true);
      return;
    }

    // Open Blinkit Grouped Payment Options Drawer
    setShowPaymentDrawer(true);
  };

  // Called ONLY when Online Payment (UPI / Card / Netbanking / Wallet) is 100% verified
  const handlePaymentSuccess = async (method: string, paymentId: string) => {
    if (!selectedPickup) {
      toast.error("Please select a pickup address.");
      return;
    }
    setPlacingOrder(true);
    try {
      const cleanPhone = normalizeIndianPhone(customerPhone);
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
        instructions: instructions.trim() || undefined,
        couponCode: appliedCoupon || undefined,
        total: grandTotal,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
      });

      toast.success("Success");
      cart.clear();
      setCartState({ instructions: "", couponCode: null, couponDiscount: 0 });

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
      const cleanPhone = normalizeIndianPhone(customerPhone);
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
        instructions: instructions.trim() || undefined,
        couponCode: appliedCoupon || undefined,
        total: grandTotal,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
      });

      toast.success("Success");
      cart.clear();
      setCartState({ instructions: "", couponCode: null, couponDiscount: 0 });

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

  // When cart has no items, show friendly empty cart state
  if (cart.lines.length === 0) {
    return (
      <main className="min-h-screen bg-white text-zinc-900 font-sans pb-12">
        <div className="mx-auto max-w-md">
          <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-zinc-100 shadow-2xs">
            <button
              type="button"
              aria-label="Go to Home"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/home" });
                }
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 transition-colors hover:bg-zinc-200 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="size-4.5" />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-center text-sm font-bold tracking-tight text-zinc-900">Checkout</h1>
            <span className="size-9 shrink-0" />
          </header>

          <div className="flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-emerald-50 text-[#0c831f] shadow-sm mb-4">
              <ShoppingBag className="size-10 stroke-[1.75]" />
            </div>
            <h2 className="text-lg font-black text-zinc-900">Your cart is empty</h2>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              Add services from our laundry store to proceed with checkout.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/home" })}
              className="mt-6 flex h-11 items-center justify-center rounded-xl bg-[#0c831f] hover:bg-emerald-800 px-6 text-sm font-black text-white shadow-md active:scale-98 transition-all cursor-pointer"
            >
              Explore Services
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-zinc-950 font-sans pb-36">
      {/* Top Header — Clean Blinkit Minimalist White */}
      <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/home" });
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

            {addresses.length === 0 && isRefreshing ? (
              <div className="flex items-start gap-2.5 pt-1 animate-pulse">
                <div className="size-8 rounded-xl bg-emerald-50 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
                  <div className="h-3.5 w-24 bg-zinc-200 rounded" />
                  <div className="h-3 w-48 bg-zinc-100 rounded" />
                  <div className="h-2.5 w-32 bg-zinc-100 rounded" />
                </div>
              </div>
            ) : selectedPickup && selectedPickup.line?.trim() ? (
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
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setCustomerPhone(digits.slice(0, 10));
                  }}
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

        {/* SECTION 5: SPECIAL CARE INSTRUCTIONS */}
        <div>
          <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
            Special Care Instructions (Optional)
          </h2>
          <section aria-label="Care Instructions" className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs">
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => handleInstructionChange(e.target.value)}
              placeholder="e.g. Do not bleach, starch shirts, handle silk gently..."
              className="w-full resize-none text-xs rounded-xl border border-zinc-200 p-3 text-zinc-900 placeholder:text-zinc-400 focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] focus:outline-hidden leading-relaxed"
            />
          </section>
        </div>

        {/* SECTION 6: APPLY COUPON */}
        <div>
          <h2 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
            Apply Coupon
          </h2>
          <section aria-label="Coupon" className="bg-white rounded-2xl p-3.5 border border-zinc-200/90 shadow-2xs">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#0c831f] text-white">
                    <Tag className="size-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-900 tracking-wide">
                      {appliedCoupon}
                    </span>
                    <p className="text-[10px] font-semibold text-[#0c831f]">
                      ₹{couponDiscount} coupon savings applied
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs font-black text-red-600 hover:text-red-700 cursor-pointer px-2 py-1 active:scale-95 transition-transform"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter promo code (e.g. WELCOME50)"
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold uppercase rounded-xl border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon(couponInput)}
                  className="rounded-xl bg-[#0c831f] hover:bg-emerald-800 px-4 py-2 text-xs font-black text-white active:scale-95 transition-transform cursor-pointer shadow-xs"
                >
                  Apply
                </button>
              </div>
            )}
          </section>
        </div>

        {/* SECTION 7: BILL DETAILS */}
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
                  <span>Coupon ({appliedCoupon || "DISCOUNT"})</span>
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
            <span>100% Safe &amp; Secure Payments • Razorpay Verified</span>
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
            onClick={handleProceedToPayment}
            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0c831f] hover:bg-[#0a701a] disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md active:scale-98 transition-all cursor-pointer"
          >
            {placingOrder ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <span>PROCEED TO PAYMENT • ₹{grandTotal}</span>
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

      {/* Blinkit Grouped Payment Drawer */}
      <BlinkitPaymentDrawer
        isOpen={showPaymentDrawer}
        onClose={() => setShowPaymentDrawer(false)}
        grandTotal={grandTotal}
        customerName={customerName}
        customerPhone={normalizeIndianPhone(customerPhone)}
        walletBalance={walletBalance}
        onPaymentSuccess={handlePaymentSuccess}
        onSelectCod={handleSelectCod}
      />
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
