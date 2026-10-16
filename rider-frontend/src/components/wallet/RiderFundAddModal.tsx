import React, { useState } from "react";
import {
  CreditCard,
  DollarSign,
  RotateCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
  Zap,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { triggerHaptic, playSuccessChime } from "../../lib/captain-audio";
import { createRiderDepositOrder, verifyRiderDeposit } from "../../api/rider/rider-wallet-api";
import { openRazorpayCheckout } from "../../api/core/razorpay";
import { fetchRiderProfile } from "../../api/rider/rider-profile-api";

interface RiderFundAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  floatingCash?: number;
  maxCodLimit?: number;
  initialTab?: "settle_cod" | "add_wallet";
}

export const RiderFundAddModal: React.FC<RiderFundAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  floatingCash = 0,
  maxCodLimit = 3000,
  initialTab = "settle_cod",
}) => {
  if (!isOpen) return null;

  const [amount, setAmount] = useState<number>(floatingCash > 0 ? floatingCash : 200);
  const [isProcessing, setIsProcessing] = useState(false);

  const quickAmounts = [
    ...(floatingCash > 0 ? [Math.ceil(floatingCash)] : []),
    100,
    200,
    500,
    1000,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const handleRazorpayPayment = async () => {
    if (amount <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }

    setIsProcessing(true);
    triggerHaptic(30);

    try {
      // 1. Fetch captain profile for prefill
      const profile = await fetchRiderProfile().catch(() => null);

      // 2. Create Razorpay order on backend
      const orderRes = await createRiderDepositOrder(amount);
      if (!orderRes.ok || !orderRes.order) {
        throw new Error("Could not create Razorpay payment order. Please retry.");
      }

      // 3. Open Razorpay Checkout modal
      const outcome = await openRazorpayCheckout(
        {
          keyId: orderRes.keyId || orderRes.order.keyId,
          amountInPaise: orderRes.order.amountInPaise,
          currency: orderRes.order.currency || "INR",
          gatewayOrderId: orderRes.order.gatewayOrderId,
          notes: orderRes.order.notes || {},
        },
        {
          appName: "QuickPress Captain",
          description: `COD Cash Settlement (₹${amount})`,
          themeColor: "#059669",
          profile: {
            name: profile?.fullName || profile?.name || "Delivery Captain",
            contact: profile?.phone || "",
            email: profile?.email || "",
          },
        }
      );

      if (outcome.status === "success") {
        triggerHaptic([40, 80, 120]);
        playSuccessChime();

        // 4. Verify payment server-side and update floating cash / wallet
        const verifyRes = await verifyRiderDeposit({
          amount,
          orderId: outcome.payload.razorpay_order_id,
          paymentId: outcome.payload.razorpay_payment_id,
          signature: outcome.payload.razorpay_signature,
        });

        toast.success(
          verifyRes.message || `Payment of ₹${amount} successful via Razorpay! Float settled.`
        );
        onSuccess();
        onClose();
      } else if (outcome.status === "failed") {
        toast.error(`Payment failed: ${outcome.reason}`);
      } else {
        toast.info("Payment cancelled.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process payment with Razorpay");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 animate-in slide-in-from-bottom-6 duration-200"
        role="dialog"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-white border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Zap className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-950">Deposit / Settle Cash Float</h3>
              <p className="text-[11px] font-medium text-zinc-500">
                Razorpay Payment Gateway (Instant UPI / Cards)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-full hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </header>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Floating Cash Alert Box */}
          {floatingCash > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Current Floating COD Cash
                </span>
                <span className="text-xl font-black text-amber-950 font-mono mt-0.5 block">
                  ₹{floatingCash.toFixed(2)}
                </span>
                <span className="text-[11px] text-amber-700 font-medium">
                  Max allowed COD limit: ₹{maxCodLimit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setAmount(Math.ceil(floatingCash));
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-200/80 hover:bg-amber-200 text-amber-900 text-xs font-black transition-all cursor-pointer"
              >
                Clear Full Float
              </button>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700">Deposit Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-zinc-400">
                ₹
              </span>
              <input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={10}
                className="w-full pl-8 pr-4 py-3 rounded-2xl border border-zinc-200 font-black text-lg text-zinc-900 focus:outline-none focus:border-indigo-500"
                placeholder="Enter deposit amount"
              />
            </div>

            {/* Quick Pills */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setAmount(amt);
                  }}
                  className={`flex-1 min-w-[70px] py-1.5 text-xs font-bold rounded-xl border transition-all ${
                    amount === amt
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Razorpay Gateway Trust Card */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Lock className="size-3.5 text-indigo-600" />
                  <span>Razorpay Official Gateway</span>
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Instant Auto-Credit
              </span>
            </div>

            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Pay securely via UPI (Google Pay, PhonePe, Paytm, BHIM), NetBanking, or Debit/Credit cards. Your float clears automatically upon successful payment.
            </p>

            <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold text-zinc-500">
              <span className="px-2 py-1 bg-white rounded-lg border border-zinc-200">GPay</span>
              <span className="px-2 py-1 bg-white rounded-lg border border-zinc-200">PhonePe</span>
              <span className="px-2 py-1 bg-white rounded-lg border border-zinc-200">Paytm</span>
              <span className="px-2 py-1 bg-white rounded-lg border border-zinc-200">UPI Apps</span>
              <span className="px-2 py-1 bg-white rounded-lg border border-zinc-200">Cards</span>
            </div>
          </div>

          {/* Security note */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span>256-bit encrypted bank checkout. No manual UTR typing required.</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 z-10 p-4 bg-white border-t border-zinc-100">
          <button
            type="button"
            onClick={handleRazorpayPayment}
            disabled={isProcessing || amount <= 0}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RotateCw className="size-4 animate-spin" />
                <span>Opening Razorpay Gateway...</span>
              </>
            ) : (
              <>
                <Zap className="size-4" />
                <span>Pay ₹{amount} with Razorpay</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};
