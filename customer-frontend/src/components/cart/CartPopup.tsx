import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useCart } from "@/hooks/useCart";
import type { CartLine } from "@/api/customer/cart-store";

interface CartPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartPopup({ isOpen, onClose }: CartPopupProps) {
  const router = useRouter();
  const navigate = useNavigate();
  const cart = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void router.preloadRoute({ to: "/checkout" }).catch(() => undefined);
    }
  }, [isOpen, router]);

  if (!isOpen || !mounted) return null;

  const itemsSubtotal = cart.lines.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleGoToCheckout = () => {
    onClose();
    void navigate({ to: "/checkout" });
  };

  const content = (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Popup / Bottom Sheet Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cart Sheet"
        className="relative z-10 w-full max-w-md max-h-[85vh] overflow-hidden rounded-t-[2rem] bg-white border-t border-zinc-200/90 shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 text-zinc-900 font-sans"
      >
        {/* Drag handle / pill indicator */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-200" />
        </div>

        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-emerald-50 text-[#0c831f] shadow-xs">
              <ShoppingBag className="size-4.5 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-zinc-900 tracking-tight">Your Cart</h2>
                <span className="rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-black text-[#0c831f]">
                  {cart.count} {cart.count === 1 ? "item" : "items"}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-[#0c831f] flex items-center gap-1 mt-0.5">
                <Zap className="size-3 fill-[#0c831f] text-[#0c831f]" />
                <span>Pickup in 15-30 mins</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close cart popup"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-2.5">
          {cart.lines.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400">
                <ShoppingBag className="size-6 stroke-[1.5]" />
              </div>
              <p className="mt-3.5 text-sm font-black text-zinc-900">Your cart is empty</p>
              <p className="mt-1 text-xs text-zinc-500">Add services from our laundry store to continue.</p>
            </div>
          ) : (
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
          )}
        </div>

        {/* Footer: View Full Cart CTA */}
        {cart.lines.length > 0 ? (
          <div className="border-t border-zinc-200/90 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Subtotal</p>
                <p className="text-xl font-black text-zinc-900 leading-tight">
                  ₹{cart.totals.grandTotal || itemsSubtotal}
                </p>
              </div>

              <Link
                to="/checkout"
                onClick={onClose}
                className="flex h-12 flex-1 items-center justify-between rounded-2xl bg-[#006045] hover:bg-[#004e38] px-5 text-sm font-black text-white shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold opacity-90">{cart.count} items</span>
                  <ChevronRight className="size-4 stroke-[2.5]" />
                </div>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(content, document.body);
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
  return (
    <div className="flex items-center justify-between gap-3 border border-zinc-200/80 p-3 rounded-2xl bg-white shadow-2xs hover:border-emerald-500/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="size-11 rounded-xl object-cover border border-zinc-100 shrink-0"
          />
        ) : (
          <div className="size-11 rounded-xl bg-emerald-50 text-[#0c831f] font-black text-xs flex items-center justify-center shrink-0 border border-emerald-100">
            {item.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-zinc-900">{item.name}</p>
          <p className="text-[11px] font-semibold text-zinc-500 mt-0.5">
            ₹{item.price} <span className="text-[10px] font-normal">/ {item.unit || "item"}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quantity Stepper */}
        <div className="flex h-8 items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-1.5">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => (item.qty === 1 ? onRemove() : onStep(-1))}
            className="flex size-6 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-200 active:scale-90 transition-transform cursor-pointer"
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
            className="flex size-6 items-center justify-center rounded-lg bg-[#0c831f] text-white active:scale-90 transition-transform cursor-pointer shadow-xs"
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
