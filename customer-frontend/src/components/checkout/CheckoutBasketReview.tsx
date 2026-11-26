import React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartLine } from "@/api/customer/cart-store";

interface CheckoutBasketReviewProps {
  items: CartLine[];
  onStepItem: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onAddMore: () => void;
  getServiceImage: (item: CartLine) => string;
}

export function CheckoutBasketReview({
  items,
  onStepItem,
  onRemoveItem,
  onAddMore,
  getServiceImage,
}: CheckoutBasketReviewProps) {
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <section aria-label="Laundry Basket" className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
          Selected Garments &amp; Services ({totalQty})
        </h2>
        <button
          type="button"
          onClick={onAddMore}
          className="text-xs font-black text-zinc-800 hover:text-zinc-950 transition-colors cursor-pointer"
        >
          + Add Items
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs divide-y divide-zinc-100 overflow-hidden">
        {items.map((item) => {
          const photoUrl = getServiceImage(item);

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-white hover:bg-zinc-50/50 transition-colors"
            >
              {/* Service Photo (Clean, Crisp, Flat Border) */}
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-zinc-200/80 bg-zinc-50">
                <img
                  src={photoUrl}
                  alt={item.name}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Title & Price Per Unit */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-zinc-900">{item.name}</p>
                <p className="text-[11px] font-medium text-zinc-500">
                  ₹{item.price} / {item.unit || "item"}
                </p>
              </div>

              {/* Stepper & Line Total */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex h-7 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-1 shadow-2xs">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => (item.qty === 1 ? onRemoveItem(item.id) : onStepItem(item.id, -1))}
                    className="size-5 flex items-center justify-center text-zinc-600 hover:text-zinc-950 active:scale-90 cursor-pointer"
                  >
                    {item.qty === 1 ? (
                      <Trash2 className="size-3 text-red-500" />
                    ) : (
                      <Minus className="size-3 stroke-[2.5]" />
                    )}
                  </button>
                  <span className="w-5 text-center text-xs font-black text-zinc-900 tabular-nums">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => onStepItem(item.id, 1)}
                    className="size-5 flex items-center justify-center rounded bg-[#0c831f] text-white active:scale-90 cursor-pointer hover:bg-emerald-800"
                  >
                    <Plus className="size-3 stroke-[2.5]" />
                  </button>
                </div>

                <span className="text-xs font-black text-zinc-950 min-w-12 text-right tabular-nums">
                  ₹{item.price * item.qty}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

