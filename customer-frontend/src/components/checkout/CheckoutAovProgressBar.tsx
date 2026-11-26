import React from "react";
import { CheckCircle2, Truck } from "lucide-react";

interface CheckoutAovProgressBarProps {
  itemsSubtotal: number;
  freeDeliveryThreshold: number;
  baseDeliveryFee: number;
  isFreeDelivery: boolean;
  onAddMore: () => void;
}

export function CheckoutAovProgressBar({
  itemsSubtotal,
  freeDeliveryThreshold,
  baseDeliveryFee,
  isFreeDelivery,
  onAddMore,
}: CheckoutAovProgressBarProps) {
  if (itemsSubtotal <= 0) return null;

  const percent = Math.min(100, Math.round((itemsSubtotal / freeDeliveryThreshold) * 100));
  const shortfall = Math.max(0, freeDeliveryThreshold - itemsSubtotal);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/80 p-3.5 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg border bg-zinc-50 text-zinc-700 border-zinc-200">
            <Truck className="size-3.5 stroke-[2.2]" />
          </div>
          <div>
            {isFreeDelivery ? (
              <p className="font-black text-zinc-950 text-xs flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-zinc-700" />
                FREE Delivery Unlocked!
              </p>
            ) : (
              <p className="font-black text-zinc-950 text-xs">
                Add <span className="text-zinc-950 underline">₹{shortfall}</span> more for FREE Delivery
              </p>
            )}
          </div>
        </div>

        {!isFreeDelivery && (
          <button
            type="button"
            onClick={onAddMore}
            className="text-[11px] font-black text-zinc-800 hover:bg-zinc-100 px-2.5 py-1 bg-zinc-50 rounded-lg border border-zinc-200 cursor-pointer"
          >
            + Add Items
          </button>
        )}
      </div>

      {/* Progress Track */}
      <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-zinc-800"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[10.5px] text-zinc-500 font-medium">
        <span>₹{itemsSubtotal}</span>
        <span>
          {isFreeDelivery ? (
            <span className="text-zinc-800 font-bold">Saved ₹{baseDeliveryFee} on delivery</span>
          ) : (
            `Free at ₹${freeDeliveryThreshold}`
          )}
        </span>
      </div>
    </div>
  );
}

