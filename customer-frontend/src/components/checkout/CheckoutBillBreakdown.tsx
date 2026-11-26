import React from "react";
import { CloudRain, Crown, ShieldCheck, Sparkles, Zap, ChevronRight } from "lucide-react";

interface CheckoutBillBreakdownProps {
  itemsSubtotal: number;
  deliveryFee: number;
  baseDeliveryFee: number;
  isFreeDelivery: boolean;
  handlingFee: number;
  packagingFee: number;
  platformFee: number;
  isSurgeActive: boolean;
  surgeFee: number;
  surgeBaseAmount: number;
  surgeReason: string;
  isSurgeWaived: boolean;
  isExpressActive: boolean;
  expressFee: number;
  memberDiscount: number;
  clubAddon: boolean;
  gst: number;
  couponDiscount: number;
  appliedCoupon: string | null;
  grandTotal: number;
  savings: number;
  onOpenPolicyModal: () => void;
}

export function CheckoutBillBreakdown({
  itemsSubtotal,
  deliveryFee,
  baseDeliveryFee,
  isFreeDelivery,
  handlingFee,
  packagingFee,
  platformFee,
  isSurgeActive,
  surgeFee,
  surgeBaseAmount,
  surgeReason,
  isSurgeWaived,
  isExpressActive,
  expressFee,
  memberDiscount,
  clubAddon,
  gst,
  couponDiscount,
  appliedCoupon,
  grandTotal,
  savings,
  onOpenPolicyModal,
}: CheckoutBillBreakdownProps) {
  return (
    <section aria-label="Bill Breakdown" className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
          Bill Details
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-2xs space-y-3">
        <div className="space-y-2 text-xs font-medium text-zinc-600">
          {/* Items Subtotal */}
          <div className="flex justify-between items-center">
            <span>Items Total</span>
            <span className="font-bold text-zinc-950 tabular-nums font-mono">₹{itemsSubtotal}</span>
          </div>

          {/* Delivery Partner Fee */}
          <div className="flex justify-between items-center">
            <span>Delivery Partner Fee</span>
            <div className="flex items-center gap-1.5 font-mono">
              {isFreeDelivery ? (
                <>
                  <span className="text-[10px] line-through text-zinc-400">₹{baseDeliveryFee}</span>
                  <span className="font-black text-zinc-800 text-[10.5px] uppercase">FREE</span>
                </>
              ) : (
                <span className="font-bold text-zinc-950 tabular-nums">₹{deliveryFee}</span>
              )}
            </div>
          </div>

          {/* Handling Fee */}
          {handlingFee > 0 && (
            <div className="flex justify-between items-center">
              <span>Handling Fee</span>
              <span className="font-bold text-zinc-950 tabular-nums font-mono">₹{handlingFee}</span>
            </div>
          )}

          {/* Packaging Fee */}
          {packagingFee > 0 && (
            <div className="flex justify-between items-center">
              <span>Eco-Packaging &amp; Protection</span>
              <span className="font-bold text-zinc-950 tabular-nums font-mono">₹{packagingFee}</span>
            </div>
          )}

          {/* Platform Convenience Fee */}
          <div className="flex justify-between items-center">
            <span>Platform Convenience Fee</span>
            <span className="font-bold text-zinc-950 tabular-nums font-mono">₹{platformFee}</span>
          </div>

          {/* Rain / High Demand Surge */}
          {isSurgeActive && (
            <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-amber-50/60 border border-amber-100 text-amber-950">
              <span className="flex items-center gap-1.5 font-medium">
                <CloudRain className="size-3.5 text-amber-700" />
                <span>{surgeReason}</span>
                {isSurgeWaived && (
                  <span className="bg-zinc-100 text-zinc-800 border border-zinc-200 text-[9px] px-1.5 py-0.2 rounded font-black tracking-wide">
                    VIP WAIVED
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5 font-bold font-mono">
                {isSurgeWaived ? (
                  <>
                    <span className="text-[10px] line-through text-zinc-400">₹{surgeBaseAmount}</span>
                    <span className="font-black text-zinc-800 text-[10px]">FREE</span>
                  </>
                ) : (
                  <span className="text-amber-800">+₹{surgeFee}</span>
                )}
              </div>
            </div>
          )}

          {/* Express Speed Upgrade */}
          {isExpressActive && (
            <div className="flex justify-between items-center text-xs p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900">
              <span className="flex items-center gap-1.5 font-medium">
                <Zap className="size-3.5 text-zinc-700" />
                <span>15-Min Priority Pickup</span>
              </span>
              <span className="font-black text-zinc-950 font-mono">+₹{expressFee}</span>
            </div>
          )}

          {/* VIP Member Discount */}
          {memberDiscount > 0 && (
            <div className="flex justify-between items-center text-zinc-800 font-semibold">
              <span className="flex items-center gap-1">
                <Crown className="size-3 text-zinc-700" /> QuickPress Club (10% Off)
              </span>
              <span className="font-mono">-₹{memberDiscount}</span>
            </div>
          )}

          {/* Club Pass Subscription */}
          {clubAddon && (
            <div className="flex justify-between items-center text-amber-900 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 text-amber-600" /> QuickPress Club Pass (3 Mo)
              </span>
              <span className="font-mono">₹99</span>
            </div>
          )}

          {/* GST & Taxes */}
          <div className="flex justify-between items-center">
            <span>GST &amp; Government Taxes (5% Laundry + 18% Platform)</span>
            <span className="font-bold text-zinc-950 tabular-nums font-mono">₹{gst}</span>
          </div>

          {/* Coupon Discount */}
          {couponDiscount > 0 && (
            <div className="flex justify-between items-center text-zinc-800 font-bold">
              <span>Coupon Savings ({appliedCoupon || "DISCOUNT"})</span>
              <span className="font-mono">-₹{couponDiscount}</span>
            </div>
          )}

          {/* Grand Total Divider */}
          <div className="border-t border-zinc-150 pt-2.5 mt-2 flex justify-between items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-zinc-900">Grand Total</p>
              <p className="text-[10px] text-zinc-400 font-normal">Inclusive of all taxes &amp; fees</p>
            </div>
            <span className="text-lg font-black text-zinc-950 tabular-nums font-mono">
              ₹{grandTotal}
            </span>
          </div>
        </div>

        {/* Savings Pill */}
        {savings > 0 && (
          <div className="rounded-xl bg-zinc-50 p-2.5 text-center text-xs font-black text-zinc-800 border border-zinc-200 flex items-center justify-center gap-1">
            <span>Total Savings on this order:</span>
            <span className="font-mono">₹{savings}</span>
          </div>
        )}
      </div>

      {/* 100% Safe Care Guarantee Seal (Clean White Card, Neutral Icon Chip) */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-700 border border-zinc-200">
            <ShieldCheck className="size-4 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-zinc-950">100% Garment Care Guarantee</p>
            <p className="text-[11px] text-zinc-500 font-medium truncate">
              RO softened water • Zero toxic perchloroethylene • Doorstep defect tag
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenPolicyModal}
          className="text-xs font-bold text-zinc-800 hover:underline cursor-pointer flex items-center gap-0.5 shrink-0"
        >
          <span>Policy</span>
          <ChevronRight className="size-3 stroke-[2.5]" />
        </button>
      </div>
    </section>
  );
}

