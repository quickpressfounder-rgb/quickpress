import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

import { useCart } from "@/hooks/useCart";
import { BlinkitPaymentDrawer } from "@/components/payment/BlinkitPaymentDrawer";
import {
  fetchAddresses,
  getCartState,
  postOrder,
  readCachedAddresses,
  setCartState,
  type Address,
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
import { loadRazorpayCheckout } from "@/api/core/razorpay";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { readSession } from "@/api/core/session-store";
import { CACHE_KEYS, readStaleCache, writeCache } from "@/api/customer/api/cache";
import { fetchMembership, subscribeMembership, type Membership } from "@/api/customer/membership-api";
import { readSavedLocation } from "@/api/customer/services/location-service";
import { triggerMobileOsNotification, requestDeviceNotificationPermission } from "@/lib/notifications";

import { CheckoutAddressCard } from "@/components/checkout/CheckoutAddressCard";
import { CheckoutSlotPicker } from "@/components/checkout/CheckoutSlotPicker";
import { CheckoutBasketReview } from "@/components/checkout/CheckoutBasketReview";
import { CheckoutAovProgressBar } from "@/components/checkout/CheckoutAovProgressBar";
import { CheckoutCouponsSection } from "@/components/checkout/CheckoutCouponsSection";
import { CheckoutBillBreakdown } from "@/components/checkout/CheckoutBillBreakdown";
import { CheckoutStickyBottomBar } from "@/components/checkout/CheckoutStickyBottomBar";
import { CheckoutContactModal } from "@/components/checkout/CheckoutContactModal";

import washFoldImg from "@/shared/assets/item-wash-fold.jpg";
import dryCleanImg from "@/shared/assets/item-dry-clean.jpg";
import steamIronImg from "@/shared/assets/item-steam-iron.jpg";
import premiumImg from "@/shared/assets/item-premium.jpg";
import shoesImg from "@/shared/assets/item-shoes.jpg";
import curtainImg from "@/shared/assets/item-curtain.jpg";
import blanketImg from "@/shared/assets/item-blanket.jpg";
import carpetImg from "@/shared/assets/item-carpet.jpg";
import expressImg from "@/shared/assets/item-express.jpg";
import bagLeatherImg from "@/shared/assets/item-bag-leather.jpg";

function normalizeIndianPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function getServiceImage(item: CartLine): string {
  const t = (item.name || "").toLowerCase();
  if (t.includes("bag") || t.includes("leather") || t.includes("handbag") || t.includes("jacket")) return bagLeatherImg;
  if (t.includes("premium") || t.includes("saree") || t.includes("luxury")) return premiumImg;
  if (t.includes("steam") || t.includes("iron")) return steamIronImg;
  if (t.includes("shoe") || t.includes("sneaker")) return shoesImg;
  if (t.includes("curtain")) return curtainImg;
  if (t.includes("blanket") || t.includes("quilt")) return blanketImg;
  if (t.includes("carpet") || t.includes("rug")) return carpetImg;
  if (t.includes("express")) return expressImg;
  if (t.includes("dry") || (t.includes("clean") && !t.includes("wash"))) return dryCleanImg;
  if (t.includes("wash") || t.includes("fold") || t.includes("laundry")) return washFoldImg;
  if (item.image && (item.image.startsWith("http://") || item.image.startsWith("https://") || item.image.startsWith("data:") || item.image.startsWith("/uploads/"))) {
    return item.image;
  }
  return washFoldImg;
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

  // Instant cache-first initialization (0ms paint) with location fallback
  const cachedAddrs = readCachedAddresses();
  const savedLoc = readSavedLocation();
  const defaultAddr: Address = savedLoc?.city
    ? {
        id: "loc-active",
        label: savedLoc.area || "Home",
        line: savedLoc.fullAddress || savedLoc.area || "Main Road",
        city: savedLoc.city,
        state: savedLoc.state || "Uttar Pradesh",
        pincode: savedLoc.pincode || "207123",
        isDefault: true,
      }
    : {
        id: "loc-default",
        label: "Home",
        line: "B-203, Kisroli Road",
        city: "Kasganj",
        state: "Uttar Pradesh",
        pincode: "207123",
        isDefault: true,
      };

  const initialAddrs = cachedAddrs.length > 0 ? cachedAddrs : [defaultAddr];
  const [addresses, setAddresses] = useState<Address[]>(() => initialAddrs);
  const [pickupAddressId, setPickupAddressId] = useState<string>(() => initialAddrs[0]?.id || defaultAddr.id);
  const [deliveryAddressId, setDeliveryAddressId] = useState<string>(() => initialAddrs[0]?.id || defaultAddr.id);
  const [sameAsPickup, setSameAsPickup] = useState<boolean>(true);
  const [isExpress, setIsExpress] = useState<boolean>(false);

  // Address picker modals
  const [showPickupPicker, setShowPickupPicker] = useState<boolean>(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);

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

  useEffect(() => {
    void requestDeviceNotificationPermission();
  }, []);

  // Coupon state (from cart state, with interactive input + apply/remove)
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
  const [showFabricPolicyModal, setShowFabricPolicyModal] = useState<boolean>(false);
  const isPlacingOrderRef = useRef<boolean>(false);
  const checkoutIdempotencyKeyRef = useRef<string>(`idem-cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  // Membership & 1-Click Upsell Hook
  const [membership, setMembership] = useState<Membership | null>(() => readStaleCache<Membership>(CACHE_KEYS.membership) || null);
  const [clubAddon, setClubAddon] = useState<boolean>(false);

  useEffect(() => {
    fetchMembership()
      .then((m) => {
        if (m) setMembership(m);
      })
      .catch(() => {});
  }, []);

  const cachedRules = readStaleCache<FinancialRules>("finance_rules");
  const [financeRules, setFinanceRules] = useState<FinancialRules>(() => cachedRules || DEFAULT_FINANCIAL_RULES);

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

  // Membership evaluation
  const isMember = Boolean(membership?.active && membership.planId !== "free");
  const isEffectiveMember = isMember || clubAddon;

  // Unified Finance Engine calculations
  const universalBase = financeRules?.pricing?.universalBasePrice ?? 69;
  const itemsSubtotal = cart.lines.reduce((sum, item) => sum + (item.price || universalBase) * item.qty, 0);
  const totalMRP = cart.lines.reduce((sum, item) => sum + Math.round((item.price || universalBase) * 1.25) * item.qty, 0);

  // 10% Extra Member Discount on items
  const memberDiscount = isEffectiveMember ? Math.round(itemsSubtotal * 0.1) : 0;
  const clubPlanPrice = (!isMember && clubAddon) ? 99 : 0;

  const freeDeliveryThreshold = financeRules?.delivery?.freeDeliveryThreshold ?? 499;
  const isEligibleForFree = itemsSubtotal >= freeDeliveryThreshold || isEffectiveMember;
  const baseDeliveryFee = financeRules?.delivery?.slabs?.[0]?.fee ?? (financeRules?.delivery?.baseFee ?? 30);
  
  // Margin Protection
  const marginProtectionEnabled = (financeRules as any)?.delivery?.marginProtectionEnabled !== false;
  const targetProfit = Number((financeRules as any)?.delivery?.targetPlatformProfit ?? 50);
  const commRate = Number(financeRules?.commission?.platformCommissionPercent ?? 15) / 100;
  const estPlatformInflow = (itemsSubtotal * commRate) + 25;
  const availableSubsidy = marginProtectionEnabled ? Math.max(0, estPlatformInflow - targetProfit) : baseDeliveryFee;
  
  const isFreeDelivery = isEligibleForFree && (availableSubsidy >= baseDeliveryFee || !marginProtectionEnabled);
  const customerDelCharge = isFreeDelivery
    ? 0
    : isEligibleForFree && marginProtectionEnabled
    ? Math.max(0, Math.round(baseDeliveryFee - availableSubsidy))
    : baseDeliveryFee;
  const deliveryFee = itemsSubtotal > 0 ? customerDelCharge : 0;
  
  // Handling fee
  const isHandlingFeeEnabled = (financeRules as any)?.fees?.handlingFeeEnabled !== false;
  const handlingFee = (itemsSubtotal > 0 && isHandlingFeeEnabled)
    ? (financeRules?.fees?.handlingFee ?? financeRules?.pricing?.handlingFee ?? 15)
    : 0;

  // Packaging fee
  const isPackagingFeeEnabled = Boolean((financeRules as any)?.fees?.packagingFeeEnabled);
  const packagingFeeAmount = Number((financeRules as any)?.fees?.packagingFee ?? (financeRules?.pricing as any)?.packagingFee ?? 0);
  const packagingFee = (itemsSubtotal > 0 && isPackagingFeeEnabled && packagingFeeAmount > 0) ? packagingFeeAmount : 0;

  const platformFee = itemsSubtotal > 0 ? (financeRules?.pricing?.platformFee ?? 10) : 0;

  const expressFee = financeRules?.pricing?.universalExpressPrice ?? financeRules?.expressPickup?.fee ?? 49;
  const isExpressEnabled = financeRules?.expressPickup?.enabled !== false;
  const isExpressActive = isExpress && isExpressEnabled;
  const currentExpressFee = isExpressActive ? expressFee : 0;

  // Surge Fee calculation
  const isSurgeActive = Boolean(
    financeRules?.surge?.enabled ||
    (financeRules?.delivery?.rainSurge && financeRules.delivery.rainSurge > 0)
  );
  const surgeBaseAmount = Number(
    financeRules?.surge?.rainSurgeFee ?? financeRules?.delivery?.rainSurge ?? 20
  );
  const surgeReason = financeRules?.surge?.surgeReason || "Weather & High Demand Surge";
  const isSurgeWaived = Boolean(isEffectiveMember && isSurgeActive);
  const surgeFee = itemsSubtotal > 0 && isSurgeActive ? (isSurgeWaived ? 0 : surgeBaseAmount) : 0;

  // GST
  const laundryGst = Math.round(Math.max(0, itemsSubtotal - couponDiscount - memberDiscount) * (financeRules?.gst?.laundryGstRate ?? 0.05));
  const serviceGst = Math.round((deliveryFee + handlingFee + packagingFee + platformFee + currentExpressFee + surgeFee) * (financeRules?.gst?.platformGstRate ?? 0.18));
  const gst = laundryGst + serviceGst;

  const grandTotal = Math.round(
    Math.max(0, itemsSubtotal + deliveryFee + handlingFee + packagingFee + platformFee + currentExpressFee + surgeFee + gst + clubPlanPrice - couponDiscount - memberDiscount)
  );
  const savings =
    Math.max(0, totalMRP - itemsSubtotal) +
    couponDiscount +
    memberDiscount +
    ((isFreeDelivery || isEffectiveMember) && itemsSubtotal > 0 ? baseDeliveryFee : 0) +
    (isSurgeWaived && itemsSubtotal > 0 ? surgeBaseAmount : 0);

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
      setShowContactModal(true);
      toast.info("Please confirm your delivery name and contact number.");
      return;
    }

    const clean = normalizeIndianPhone(customerPhone);
    if (!clean || clean.length !== 10) {
      setShowContactModal(true);
      toast.info("Please enter a valid 10-digit mobile number for order delivery updates.");
      return;
    }

    if (!selectedPickup || !selectedPickup.line || !selectedPickup.line.trim() || addresses.length === 0) {
      setAddresses([defaultAddr]);
      setPickupAddressId(defaultAddr.id);
      setDeliveryAddressId(defaultAddr.id);
    }

    setShowPaymentDrawer(true);
  };

  // Online Payment Verified
  const handlePaymentSuccess = async (method: string, paymentId: string) => {
    if (isPlacingOrderRef.current || placingOrder) return;
    if (!selectedPickup) {
      toast.error("Please select a pickup address.");
      return;
    }
    isPlacingOrderRef.current = true;
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
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        addressId: selectedPickup.id,
        address: selectedPickup,
        deliveryAddress: selectedDelivery,
        pickup: {
          day: "Today",
          slot: isExpressActive ? "15-Min Express Pickup" : "Doorstep Pickup (45–60 mins)",
          express: isExpressActive,
        },
        isExpress: isExpressActive,
        expressFee: currentExpressFee,
        surgeFee,
        isSurgeWaived,
        paymentId,
        paymentMethod: method,
        couponCode: appliedCoupon || undefined,
        total: grandTotal,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
      });

      toast.success("Order Placed Successfully!");

      void triggerMobileOsNotification({
        title: "Order Placed Successfully!",
        body: `Order #${(result.orderId || "").slice(-6).toUpperCase()} is confirmed! Nearest captain arriving shortly.`,
        orderId: result.orderId,
      });

      if (clubAddon) {
        subscribeMembership("silver", "quarterly").catch(() => {});
      }

      void updateProfile({ name: customerName.trim(), phone: cleanPhone }).catch(() => {});

      cart.clear();
      setCartState({ instructions: "", couponCode: null, couponDiscount: 0 });

      await navigate({
        to: "/order-success/$orderId",
        params: { orderId: result.orderId || `ord-${Date.now()}` },
      });
    } catch (err: any) {
      checkoutIdempotencyKeyRef.current = `idem-cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      toast.error(err?.message || "Failed to place order. Please try again.");
    } finally {
      isPlacingOrderRef.current = false;
      setPlacingOrder(false);
    }
  };

  // Cash on Delivery
  const handleSelectCod = async () => {
    if (isPlacingOrderRef.current || placingOrder) return;
    if (!customerName.trim()) {
      setShowContactModal(true);
      toast.info("Please enter your name for delivery contact.");
      return;
    }
    const cleanPhone = normalizeIndianPhone(customerPhone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setShowContactModal(true);
      toast.info("Please enter a valid 10-digit mobile number for order delivery updates.");
      return;
    }
    if (!selectedPickup) {
      toast.error("Please select a pickup address.");
      return;
    }
    isPlacingOrderRef.current = true;
    setPlacingOrder(true);
    try {
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
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        addressId: selectedPickup.id,
        address: selectedPickup,
        deliveryAddress: selectedDelivery,
        pickup: {
          day: "Today",
          slot: isExpressActive ? "15-Min Express Pickup" : "Doorstep Pickup (45–60 mins)",
          express: isExpressActive,
        },
        isExpress: isExpressActive,
        expressFee: currentExpressFee,
        surgeFee,
        isSurgeWaived,
        paymentId: "cod",
        paymentMethod: "cod",
        couponCode: appliedCoupon || undefined,
        total: grandTotal,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
      });

      toast.success("Order Placed Successfully!");

      void triggerMobileOsNotification({
        title: "Order Placed Successfully!",
        body: `Order #${(result.orderId || "").slice(-6).toUpperCase()} is confirmed! Nearest captain arriving shortly.`,
        orderId: result.orderId,
      });

      if (clubAddon) {
        subscribeMembership("silver", "quarterly").catch(() => {});
      }

      void updateProfile({ name: customerName.trim(), phone: cleanPhone }).catch(() => {});

      cart.clear();
      setCartState({ instructions: "", couponCode: null, couponDiscount: 0 });

      await navigate({
        to: "/order-success/$orderId",
        params: { orderId: result.orderId || `ord-${Date.now()}` },
      });
    } catch (err: any) {
      checkoutIdempotencyKeyRef.current = `idem-cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      toast.error(err?.message || "Failed to place COD order. Please try again.");
    } finally {
      isPlacingOrderRef.current = false;
      setPlacingOrder(false);
    }
  };

  // Empty Cart State
  if (cart.lines.length === 0) {
    if (placingOrder || isPlacingOrderRef.current) {
      return (
        <main className="min-h-screen bg-white text-zinc-900 font-sans flex items-center justify-center p-4">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#0c831f] border border-emerald-100">
              <CheckCircle2 className="size-8 text-[#0c831f]" />
            </div>
            <h2 className="text-base font-black text-zinc-900">Order Confirmed!</h2>
            <p className="text-xs font-semibold text-zinc-500">Redirecting to order confirmation screen...</p>
            <Loader2 className="size-5 animate-spin text-[#0c831f] mt-1" />
          </div>
        </main>
      );
    }
    return (
      <main className="min-h-screen bg-white text-zinc-950 font-sans pb-12">
        <div className="mx-auto max-w-md">
          <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] bg-white border-b border-zinc-200/80 shadow-2xs">
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
            <h1 className="min-w-0 flex-1 truncate text-center text-sm font-black tracking-tight text-zinc-950">Checkout</h1>
            <span className="size-9 shrink-0" />
          </header>

          <div className="flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center">
            <div className="flex size-18 items-center justify-center rounded-3xl bg-emerald-50 text-[#0c831f] border border-emerald-150 mb-4">
              <ShoppingBag className="size-9 stroke-[1.8]" />
            </div>
            <h2 className="text-lg font-black text-zinc-950">Your laundry cart is empty</h2>
            <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">
              Explore our laundry and garment care services to place a doorstep pickup order.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/home" })}
              className="mt-6 flex h-11 items-center justify-center rounded-xl bg-[#0c831f] hover:bg-emerald-800 px-6 text-xs font-black text-white shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              Explore Services
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans pb-36">
      {/* Sticky Clean Header — Senior Designer Minimalist Polish */}
      <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-2xs">
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
            <ArrowLeft className="size-4.5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-sm font-black text-zinc-950 tracking-tight">Checkout</h1>
            <p className="text-[10px] text-zinc-500 font-medium">QuickPress Doorstep Service</p>
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <div className="mx-auto max-w-md px-4 pt-3.5 space-y-4">
        {/* 1. Address & Contact Pill */}
        <CheckoutAddressCard
          selectedPickup={selectedPickup}
          selectedDelivery={selectedDelivery}
          sameAsPickup={sameAsPickup}
          setSameAsPickup={setSameAsPickup}
          onOpenPickupPicker={() => setShowPickupPicker(true)}
          onOpenDeliveryPicker={() => setShowDeliveryPicker(true)}
          customerName={customerName}
          customerPhone={customerPhone}
          onOpenContactModal={() => setShowContactModal(true)}
          isRefreshing={isRefreshing}
        />

        {/* 2. Pickup Speed & Express Upgrade */}
        <CheckoutSlotPicker
          isExpressActive={isExpressActive}
          onToggleExpress={(val) => setIsExpress(val)}
          expressFee={expressFee}
          isExpressEnabled={isExpressEnabled}
        />

        {/* 3. Items Basket Review & Steppers */}
        <CheckoutBasketReview
          items={cart.lines}
          onStepItem={(id, delta) => cart.step(id, delta)}
          onRemoveItem={(id) => cart.remove(id)}
          onAddMore={() => navigate({ to: "/home" })}
          getServiceImage={getServiceImage}
        />

        {/* 4. Free Delivery AOV Progress Bar */}
        <CheckoutAovProgressBar
          itemsSubtotal={itemsSubtotal}
          freeDeliveryThreshold={freeDeliveryThreshold}
          baseDeliveryFee={baseDeliveryFee}
          isFreeDelivery={isFreeDelivery}
          onAddMore={() => navigate({ to: "/home" })}
        />

        {/* 5. Coupons & QuickPress Club VIP Pass */}
        <CheckoutCouponsSection
          appliedCoupon={appliedCoupon}
          couponDiscount={couponDiscount}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={handleRemoveCoupon}
          clubAddon={clubAddon}
          onToggleClubAddon={setClubAddon}
          isMember={isMember}
        />

        {/* 7. Transparent Bill Details & Garment Care Guarantee Seal */}
        <CheckoutBillBreakdown
          itemsSubtotal={itemsSubtotal}
          deliveryFee={deliveryFee}
          baseDeliveryFee={baseDeliveryFee}
          isFreeDelivery={isFreeDelivery}
          handlingFee={handlingFee}
          packagingFee={packagingFee}
          platformFee={platformFee}
          isSurgeActive={isSurgeActive}
          surgeFee={surgeFee}
          surgeBaseAmount={surgeBaseAmount}
          surgeReason={surgeReason}
          isSurgeWaived={isSurgeWaived}
          isExpressActive={isExpressActive}
          expressFee={currentExpressFee}
          memberDiscount={memberDiscount}
          clubAddon={clubAddon}
          gst={gst}
          couponDiscount={couponDiscount}
          appliedCoupon={appliedCoupon}
          grandTotal={grandTotal}
          savings={savings}
          onOpenPolicyModal={() => setShowFabricPolicyModal(true)}
        />
      </div>

      {/* 8. Sticky Bottom Action Bar */}
      <CheckoutStickyBottomBar
        grandTotal={grandTotal}
        placingOrder={placingOrder}
        onProceed={handleProceedToPayment}
        onOpenPaymentDrawer={() => setShowPaymentDrawer(true)}
        onOpenPolicyModal={() => setShowFabricPolicyModal(true)}
      />

      {/* Pickup Address Picker Modal */}
      {showPickupPicker && (
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
      )}

      {/* Delivery Address Picker Modal */}
      {showDeliveryPicker && (
        <AddressPickerModal
          title="Select Dropoff Address"
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
      )}

      {/* Contact Details Edit Modal */}
      <CheckoutContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        initialName={customerName}
        initialPhone={customerPhone}
        onSave={(name, phone) => {
          setCustomerName(name);
          setCustomerPhone(phone);
          void updateProfile({ name, phone }).catch(() => {});
          toast.success("Contact details updated!");
        }}
      />

      {/* Payment Options Drawer */}
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

      {/* Fabric Care & Loss Liability Policy Modal */}
      {showFabricPolicyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFabricPolicyModal(false);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 cursor-default border border-zinc-150">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-[#0c831f]" />
                <h2 className="text-sm font-black text-zinc-900">Garment Care &amp; Loss Policy</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowFabricPolicyModal(false)}
                className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 max-h-80 overflow-y-auto pr-1">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-1">
                <p className="font-black text-emerald-950 text-xs">1. 100% Eco-Safe Cleaning Protocol</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  All garments are processed using European hydrocarbon dry-cleaning solvents and RO-softened water with zero harmful perchloroethylene.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 space-y-1">
                <p className="font-black text-amber-950 text-xs">2. Pre-Existing Defects &amp; Stains</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Pre-existing tears, holes, frayed stitching, or deep chemical stains cannot be reversed. Our delivery captain captures photos at doorstep intake for mutual transparency.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
                <p className="font-black text-zinc-900 text-xs">3. Antique Zari &amp; Color Fastness</p>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Hand-dyed artisanal silks or antique metallic embroideries without manufacturer wash-care tags are treated with maximum delicacy but carry inherent natural bleed risks.
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1">
                <p className="font-black text-zinc-900 text-xs">4. Maximum Liability Protection</p>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  In the rare event of verified physical loss or terminal damage caused solely during processing, reimbursement is capped up to 10x the processing charge or actual garment depreciated value as per platform terms.
                </p>
              </div>
            </div>

            <div className="pt-1 pb-1 text-center">
              <Link
                to="/legal/$docSlug"
                params={{ docSlug: "garment-care-policy" }}
                className="text-[11px] font-bold text-[#0c831f] hover:underline inline-block"
              >
                Read Official Garment Care &amp; Loss Liability Policy &rarr;
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setShowFabricPolicyModal(false)}
              className="w-full py-3 rounded-2xl bg-[#0c831f] hover:bg-[#0a701a] text-white font-black text-xs shadow-md active:scale-98 transition-all cursor-pointer"
            >
              I Understand &amp; Agree
            </button>
          </div>
        </div>
      )}
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4 cursor-pointer animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200 cursor-default border border-zinc-150">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h2 className="text-sm font-black text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            <X className="size-4" />
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
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                role="radio"
                aria-checked={addr.id === selectedId}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(addr.id);
                  }
                }}
                onClick={() => onSelect(addr.id)}
                className={`p-3 rounded-2xl border flex items-start justify-between cursor-pointer transition-colors outline-none ${
                  addr.id === selectedId
                    ? "border-[#0c831f] bg-emerald-50/40 shadow-2xs"
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
