import React from "react";
import { ChevronRight, CreditCard, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface CheckoutStickyBottomBarProps {
  grandTotal: number;
  placingOrder: boolean;
  onProceed: () => void;
  onOpenPaymentDrawer: () => void;
  onOpenPolicyModal: () => void;
}

export function CheckoutStickyBottomBar({
  grandTotal,
  placingOrder,
  onProceed,
  onOpenPaymentDrawer,
  onOpenPolicyModal,
}: CheckoutStickyBottomBarProps) {
  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 px-4 pt-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      {/* Legal & Policy Micro-Disclosure */}
      <p className="pb-2 text-center text-[10px] leading-relaxed text-zinc-400">
        By placing this order, you agree to QuickPress{" "}
        <Link
          to="/legal/$docSlug"
          params={{ docSlug: "terms-of-service" }}
          className="font-bold text-zinc-600 underline hover:text-[#0c831f] cursor-pointer"
        >
          Terms
        </Link>
        ,{" "}
        <button
          type="button"
          onClick={onOpenPolicyModal}
          className="font-bold text-zinc-600 underline hover:text-[#0c831f] cursor-pointer inline"
        >
          Fabric Care Policy
        </button>
        {" "}and{" "}
        <Link
          to="/legal/$docSlug"
          params={{ docSlug: "privacy-policy" }}
          className="font-bold text-zinc-600 underline hover:text-[#0c831f] cursor-pointer"
        >
          Privacy Policy
        </Link>.
      </p>

      <div className="mx-auto max-w-md flex items-center justify-between gap-3.5">
        {/* Left: Total & Payment Mode Preview */}
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">To Pay</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-zinc-950 leading-tight tabular-nums font-mono">
              ₹{grandTotal}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenPaymentDrawer}
            className="flex items-center gap-1 text-[11px] font-bold text-zinc-700 hover:underline cursor-pointer"
          >
            <span>Pay via UPI / COD</span>
            <ChevronRight className="size-3" />
          </button>
        </div>

        {/* Right: Giant, Pristine Emerald CTA */}
        <button
          type="button"
          disabled={placingOrder}
          onClick={onProceed}
          className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0c831f] hover:bg-[#0a701a] disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md active:scale-98 transition-all cursor-pointer"
        >
          {placingOrder ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Processing Order...</span>
            </>
          ) : (
            <>
              <span>PROCEED TO PAY • ₹{grandTotal}</span>
              <ChevronRight className="size-4 stroke-[3]" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

