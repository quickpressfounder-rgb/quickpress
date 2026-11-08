import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronRight,
  CloudRain,
  Minus,
  Percent,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/hooks/useCart";
import { getCartState, setCartState } from "@/api/customer/cart-api";
import type { CartLine } from "@/api/customer/cart-store";
import {
  fetchFinanceRules,
  type FinancialRules,
  DEFAULT_FINANCIAL_RULES,
} from "@/api/customer/finance-api";

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

function resolveCategoryServiceImage(title?: string | null, img?: string | null): string {
  const t = (title || "").toLowerCase();
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
  if (img && (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:") || img.startsWith("/uploads/"))) {
    return img;
  }
  return washFoldImg;
}

export const Route = createFileRoute("/cart")({
  beforeLoad: () => {
    throw redirect({
      to: "/checkout",
      replace: true,
    });
  },
  head: () => ({
    meta: [{ title: "Checkout — QuickPress" }],
  }),
  component: CartPage,
});

// Fallback add-on suggestions
const SUGGESTED_ADDONS = [
  {
    id: "s-iron-shirt",
    name: "Shirt Steam Iron",
    price: 15,
    unit: "piece",
    image: "/images/services/steam-iron.jpg",
    description: "Crisp wrinkle-free hanger finish",
  },
  {
    id: "s-wash-fold",
    name: "Express Wash & Fold",
    price: 49,
    unit: "kg",
    image: "/images/services/wash-fold.jpg",
    description: "Anti-bacterial everyday wash and neat folding",
  },
  {
    id: "addon-shoes",
    name: "Sneakers Deep Clean",
    price: 149,
    unit: "pair",
    image: "/images/services/shoe-cleaning.jpg",
    description: "Antibacterial steam cleaning & sole scrub",
  },
  {
    id: "addon-blanket",
    name: "Heavy Blanket Wash",
    price: 199,
    unit: "piece",
    image: "/images/services/blanket-cleaning.jpg",
    description: "Deep anti-mite wash and odor neutralizer",
  },
];

function CartPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const [instructions, setInstructions] = useState<string>(getCartState().instructions || "");
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(getCartState().couponCode || null);
  const [couponDiscount, setCouponDiscount] = useState<number>(getCartState().couponDiscount || 0);
  const [dynamicAddons, setDynamicAddons] = useState<any[]>([]);

  const primaryPartnerId = cart.lines[0]?.partnerId;
  const primaryPartnerName =
    cart.lines[0]?.partnerName ||
    cart.store?.name ||
    (getCartState().data?.store?.name !== "QuickPress Express Hub" ? getCartState().data?.store?.name : null);

  useEffect(() => {
    let alive = true;
    async function loadRealServices() {
      if (primaryPartnerId) {
        try {
          const { fetchPartnerDetail } = await import("@/api/customer/partner-api");
          const res = await fetchPartnerDetail(primaryPartnerId);
          if (alive && res?.data?.services && res.data.services.length > 0) {
            setDynamicAddons(res.data.services);
            return;
          }
        } catch {
          // fallback
        }
      }
      try {
        const { fetchPopularServices } = await import("@/api/customer/services/recommendation-service");
        const res = await fetchPopularServices();
        if (alive && Array.isArray(res) && res.length > 0) {
          setDynamicAddons(res);
        }
      } catch {
        // fallback
      }
    }
    void loadRealServices();
    return () => {
      alive = false;
    };
  }, [primaryPartnerId]);

  // Sync instructions to store
  const handleInstructionChange = (text: string) => {
    setInstructions(text);
    setCartState({ instructions: text });
  };

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

  const [financeRules, setFinanceRules] = useState<FinancialRules>(DEFAULT_FINANCIAL_RULES);

  useEffect(() => {
    fetchFinanceRules().then(setFinanceRules);
  }, []);

  // Pricing calculations driven dynamically by Unified Finance Engine
  const universalBase = financeRules?.pricing?.universalBasePrice ?? 69;
  const itemsSubtotal = cart.lines.reduce((sum, item) => sum + (item.price || universalBase) * item.qty, 0);
  const totalMRP = cart.lines.reduce((sum, item) => sum + Math.round((item.price || universalBase) * 1.25) * item.qty, 0);

  const freeDeliveryThreshold = financeRules?.delivery?.freeDeliveryThreshold ?? 149;
  const isFreeDelivery = itemsSubtotal >= freeDeliveryThreshold;
  const baseDeliveryFee = financeRules?.delivery?.slabs?.[0]?.fee ?? (financeRules?.delivery?.baseFee ?? 30);
  const deliveryFee = itemsSubtotal > 0 ? (isFreeDelivery ? 0 : baseDeliveryFee) : 0;
  const isHandlingFeeEnabled = financeRules?.fees?.handlingFeeEnabled ?? true;
  const handlingFee = itemsSubtotal > 0 && isHandlingFeeEnabled ? (financeRules?.pricing?.handlingFee ?? 15) : 0;
  const isPackagingFeeEnabled = financeRules?.fees?.packagingFeeEnabled ?? false;
  const packagingFee = itemsSubtotal > 0 && isPackagingFeeEnabled ? (financeRules?.pricing?.packagingFee ?? 10) : 0;
  const platformFee = itemsSubtotal > 0 ? (financeRules?.pricing?.platformFee ?? 10) : 0;

  // Surge fee calculation
  const isSurgeActive = Boolean(
    financeRules?.surge?.enabled ||
    (financeRules?.delivery?.rainSurge && financeRules.delivery.rainSurge > 0)
  );
  const surgeBaseAmount = Number(
    financeRules?.surge?.rainSurgeFee ?? financeRules?.delivery?.rainSurge ?? 20
  );
  const surgeReason = financeRules?.surge?.surgeReason || "Weather & High Demand Surge";
  const surgeFee = itemsSubtotal > 0 && isSurgeActive ? surgeBaseAmount : 0;

  // 5% fabric laundry GST + 18% services GST (handling + packaging + platform + customer delivery fee + surge fee)
  const laundryGst = Math.round(Math.max(0, itemsSubtotal - couponDiscount) * (financeRules?.gst?.laundryGstRate ?? 0.05));
  const serviceGst = Math.round((deliveryFee + handlingFee + packagingFee + platformFee + surgeFee) * (financeRules?.gst?.platformGstRate ?? 0.18));
  const gst = laundryGst + serviceGst;

  const grandTotal = Math.max(0, itemsSubtotal + deliveryFee + handlingFee + packagingFee + platformFee + surgeFee + gst - couponDiscount);
  const savings = Math.max(0, totalMRP - itemsSubtotal) + couponDiscount + (isFreeDelivery && itemsSubtotal > 0 ? baseDeliveryFee : 0);

  const displayedAddons = (dynamicAddons.length > 0 ? dynamicAddons : SUGGESTED_ADDONS)
    .filter((a) => !cart.lines.some((l) => l.id === (a.id || a._id || a.serviceId)))
    .slice(0, 4)
    .map((addon) => ({
      id: addon.id || addon._id || addon.serviceId || `srv-${addon.name?.toLowerCase().replace(/\s+/g, "-")}`,
      name: addon.name || addon.title || "Quick Service",
      price: Number(addon.price || addon.basePrice || 49),
      unit: addon.unit || "piece",
      image: addon.image || "/images/services/steam-iron.jpg",
      description: addon.description || "",
      partnerId: primaryPartnerId || addon.partnerId || "partner-express-hub",
      partnerName: primaryPartnerName || addon.partnerName || "QuickPress Partner",
    }));

  const addonsToShow =
    displayedAddons.length > 0
      ? displayedAddons
      : SUGGESTED_ADDONS.map((a) => ({
          ...a,
          partnerId: primaryPartnerId || "partner-express-hub",
          partnerName: primaryPartnerName || "QuickPress Partner",
        }));

  if (cart.lines.length === 0) {
    return (
      <main className="min-h-screen bg-white text-zinc-900 font-sans pb-12">
        <div className="mx-auto max-w-md">
          <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 pb-3.5 pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.5rem))] app-header-safe bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
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
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="min-w-0 flex-1 truncate text-center text-sm font-bold tracking-tight text-foreground">Your Cart</h1>
            <span className="size-10 shrink-0" />
          </header>

          <div className="flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-emerald-50 text-[#0c831f] shadow-sm mb-4">
              <ShoppingBag className="size-10 stroke-[1.75]" />
            </div>
            <h2 className="text-lg font-black text-zinc-900">Your cart is empty</h2>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              Looks like you haven't added any laundry or dry cleaning services yet.
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
    <main className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-32">
      {/* Top Header */}
      <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 pb-3.5 pt-[max(0.875rem,calc(env(safe-area-inset-top,0px)+0.5rem))] app-header-safe bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
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
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-zinc-900 tracking-tight">Review Cart</h1>
            <p className="text-[11px] font-semibold text-[#0c831f] flex items-center gap-1">
              <Zap className="size-3 fill-[#0c831f]" />
              <span>Pickup in 15-30 mins</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Clear all items from cart"
          onClick={() => {
            cart.clear();
            setCartState({ instructions: "", couponCode: null, couponDiscount: 0 });
            toast.info("Cart cleared");
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all cursor-pointer border border-red-100/80 shadow-2xs"
          title="Clear Cart"
        >
          <Trash2 className="size-4.5 stroke-[2.2]" />
        </button>
      </header>

      <div className="mx-auto max-w-md px-4 pt-3 space-y-3">

        {/* Selected Items Card */}
        <section aria-label="Cart Items" className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs space-y-3">
          <div className="flex items-start justify-between border-b border-zinc-100 pb-2.5">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
                Selected Items ({cart.count})
              </span>
              {primaryPartnerName ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/80">
                  <Store className="size-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Fulfilled by: <strong className="text-zinc-900 font-extrabold">{primaryPartnerName}</strong>
                  </span>
                </div>
              ) : null}
            </div>
            <span className="text-xs font-black text-[#0c831f] pt-0.5">
              ₹{itemsSubtotal}
            </span>
          </div>

          <div className="space-y-2.5">
            {cart.lines.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onStep={(delta) => cart.step(item.id, delta)}
                onRemove={() => cart.remove(item.id)}
              />
            ))}
          </div>
        </section>

        {/* Coupons Strip */}
        <section aria-label="Coupons" className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Tag className="size-4 text-[#0c831f]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Apply Coupon
            </h2>
          </div>

          {appliedCoupon ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2">
                <Percent className="size-4 text-[#0c831f]" />
                <div>
                  <p className="text-xs font-black text-emerald-900">{appliedCoupon} Applied</p>
                  <p className="text-[10px] font-semibold text-emerald-700">₹{couponDiscount} discount saved</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-xs font-bold text-red-600 hover:text-red-700 active:scale-95 cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Enter promo code (e.g. WELCOME50)"
                className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold uppercase placeholder:normal-case placeholder:font-normal text-zinc-900 focus:border-[#0c831f] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleApplyCoupon(couponInput)}
                className="rounded-xl bg-[#0c831f] hover:bg-emerald-800 px-4 py-2 text-xs font-black text-white active:scale-95 transition-transform cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </section>

        {/* Bill Summary */}
        <section aria-label="Bill Summary" className="bg-white rounded-2xl p-4 border border-zinc-200/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
              Bill Details
            </h2>
          </div>

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
                    <span className="font-black text-[#0c831f] uppercase text-[10px]">FREE</span>
                  </>
                ) : (
                  <span className="font-bold text-zinc-900">₹{deliveryFee}</span>
                )}
              </div>
            </div>

            {isHandlingFeeEnabled && handlingFee > 0 ? (
              <div className="flex justify-between">
                <span>Handling Fee</span>
                <span className="font-bold text-zinc-900">₹{handlingFee}</span>
              </div>
            ) : null}

            {isPackagingFeeEnabled && packagingFee > 0 ? (
              <div className="flex justify-between">
                <span>Packing & Packaging</span>
                <span className="font-bold text-zinc-900">₹{packagingFee}</span>
              </div>
            ) : null}

            <div className="flex justify-between">
              <span>Platform Convenience Fee</span>
              <span className="font-bold text-zinc-900">₹{platformFee}</span>
            </div>

            {isSurgeActive ? (
              <div className="flex justify-between items-center px-2 py-1.5 rounded-lg border text-xs bg-amber-50 text-amber-900 border-amber-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <CloudRain className="size-3.5 text-amber-600" />
                  <span>{surgeReason}</span>
                </span>
                <span className="font-black text-amber-700">+₹{surgeFee}</span>
              </div>
            ) : null}

            <div className="flex justify-between">
              <span>GST & Taxes (5% Laundry + 18% Fees)</span>
              <span className="font-bold text-zinc-900">₹{gst}</span>
            </div>

            {couponDiscount > 0 ? (
              <div className="flex justify-between text-[#0c831f] font-bold">
                <span>Coupon Discount</span>
                <span>-₹{couponDiscount}</span>
              </div>
            ) : null}

            <div className="border-t border-zinc-200 pt-2.5 flex justify-between items-center text-sm font-black text-zinc-900">
              <span>To Pay</span>
              <span className="text-base text-zinc-900 font-black">₹{grandTotal}</span>
            </div>
          </div>

          {savings > 0 ? (
            <div className="rounded-xl bg-emerald-50 p-2 text-center text-xs font-black text-[#0c831f] border border-emerald-100">
              🎉 You will save ₹{savings} on this order!
            </div>
          ) : null}
        </section>
      </div>

      {/* Sticky Bottom Bar */}
      <aside className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-zinc-200 p-4 shadow-xl">
        <div className="mx-auto max-w-md flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Grand Total</p>
            <p className="text-xl font-black text-zinc-900 leading-tight">₹{grandTotal}</p>
          </div>

          <button
            type="button"
            onClick={() => navigate({ to: "/checkout" })}
            className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0c831f] hover:bg-emerald-800 text-white font-black text-sm shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <span>Proceed to Checkout</span>
            <ChevronRight className="size-4 stroke-[2.5]" />
          </button>
        </div>
      </aside>
    </main>
  );
}

function CartItemRow({
  item,
  onStep,
  onRemove,
}: {
  item: CartLine;
  onStep: (delta: number) => void;
  onRemove: () => void;
}) {
  const photoUrl = resolveCategoryServiceImage(item.name, item.image);

  return (
    <div className="flex items-center justify-between gap-3 border border-zinc-100 p-3 rounded-xl bg-zinc-50/50">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <img
          src={photoUrl}
          alt={item.name}
          className="size-11 rounded-xl object-cover border border-zinc-200 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-zinc-900">{item.name}</p>
          <p className="text-[11px] font-semibold text-zinc-500">
            ₹{item.price} <span className="text-[10px] font-normal">/ {item.unit || "item"}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quantity Stepper */}
        <div className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-1.5 shadow-2xs">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => (item.qty === 1 ? onRemove() : onStep(-1))}
            className="flex size-6 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 transition-transform active:scale-90 cursor-pointer"
          >
            {item.qty === 1 ? <Trash2 className="size-3 text-red-500" /> : <Minus className="size-3 stroke-[2.5]" />}
          </button>
          <span className="w-5 text-center text-xs font-black text-zinc-900 tabular-nums">
            {item.qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => onStep(1)}
            className="flex size-6 items-center justify-center rounded-md bg-[#0c831f] text-white transition-transform active:scale-90 cursor-pointer"
          >
            <Plus className="size-3 stroke-[2.5]" />
          </button>
        </div>

        <span className="text-xs font-black text-zinc-900 min-w-12 text-right">
          ₹{item.price * item.qty}
        </span>
      </div>
    </div>
  );
}
