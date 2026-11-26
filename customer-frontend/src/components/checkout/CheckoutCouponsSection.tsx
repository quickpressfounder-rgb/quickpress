import React, { useState } from "react";
import { Check, Sparkles, Tag } from "lucide-react";

interface CheckoutCouponsSectionProps {
  appliedCoupon: string | null;
  couponDiscount: number;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
  clubAddon: boolean;
  onToggleClubAddon: (val: boolean) => void;
  isMember: boolean;
}

const AVAILABLE_PROMOS = [
  { code: "WELCOME50", discount: "₹50 OFF", desc: "First order welcoming treat" },
  { code: "FIRSTFREE", discount: "FREE DEL", desc: "Free delivery subsidy (Save ₹75)" },
];

export function CheckoutCouponsSection({
  appliedCoupon,
  couponDiscount,
  onApplyCoupon,
  onRemoveCoupon,
  clubAddon,
  onToggleClubAddon,
  isMember,
}: CheckoutCouponsSectionProps) {
  const [customCode, setCustomCode] = useState("");

  return (
    <section aria-label="Coupons and Club" className="space-y-3">
      {/* 1-Tap Coupon Selection */}
      <div className="space-y-2">
        <h2 className="px-1 text-[11px] font-black uppercase tracking-wider text-zinc-500">
          Offers &amp; Coupons
        </h2>

        <div className="bg-white rounded-2xl border border-zinc-200/80 p-3.5 shadow-2xs space-y-3">
          {appliedCoupon ? (
            <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white">
                  <Tag className="size-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-zinc-950 tracking-wider">
                      {appliedCoupon}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-700 bg-white px-1.5 py-0.2 rounded border border-zinc-200">
                      Applied
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-600">
                    You saved ₹{couponDiscount} on this order!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRemoveCoupon}
                className="text-xs font-black text-red-600 hover:text-red-700 cursor-pointer px-2 py-1"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Quick Available Promo Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_PROMOS.map((promo) => (
                  <div
                    key={promo.code}
                    className="p-2.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-xs font-black text-zinc-950 tracking-wider">
                        {promo.code}
                      </span>
                      <p className="text-[10px] text-zinc-500 font-medium">{promo.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyCoupon(promo.code)}
                      className="text-xs font-black text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-lg cursor-pointer active:scale-95 transition-transform shadow-2xs"
                    >
                      APPLY
                    </button>
                  </div>
                ))}
              </div>

              {/* Manual Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="Enter Promo Code..."
                  className="flex-1 text-xs font-bold uppercase py-2 px-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 placeholder:normal-case placeholder:font-normal focus:bg-white focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customCode.trim()) {
                      onApplyCoupon(customCode.trim());
                      setCustomCode("");
                    }
                  }}
                  className="rounded-xl bg-[#0c831f] hover:bg-emerald-800 text-white px-4 text-xs font-black active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QuickPress Club VIP Pass (Senior Designer Polish: Clean White Card, subtle gold border, NO black banner!) */}
      {!isMember && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggleClubAddon(!clubAddon)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onToggleClubAddon(!clubAddon);
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs ${
            clubAddon
              ? "bg-amber-50/50 border-amber-300 ring-1 ring-amber-300"
              : "bg-white border-zinc-200/80 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex size-8 items-center justify-center rounded-xl border shrink-0 ${
                clubAddon
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-zinc-50 text-amber-700 border-zinc-200"
              }`}
            >
              <Sparkles className="size-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-zinc-950">QuickPress Club Pass</p>
                <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded">
                  3 Months
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium truncate">
                Zero delivery fee on all orders + 10% off + Zero weather surge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-black text-zinc-900">+₹99</span>
            <div
              className={`size-4.5 rounded-full flex items-center justify-center border transition-colors ${
                clubAddon
                  ? "bg-amber-600 border-amber-600 text-white"
                  : "border-zinc-300 bg-white"
              }`}
            >
              {clubAddon && <Check className="size-2.5 stroke-[3]" />}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

