import React, { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  RotateCw,
  ShieldCheck,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { withdrawRiderEarnings } from "../../api/rider/rider-wallet-api";
import { triggerHaptic, playSuccessChime } from "../../lib/captain-audio";

interface RiderWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance: number;
  defaultUpiId?: string;
}

export const RiderWithdrawModal: React.FC<RiderWithdrawModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableBalance,
  defaultUpiId = "",
}) => {
  if (!isOpen) return null;

  const [amount, setAmount] = useState<number>(availableBalance > 0 ? Math.floor(availableBalance) : 100);
  const [upiId, setUpiId] = useState<string>(defaultUpiId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWithdraw = async () => {
    if (amount < 10) {
      toast.error("Minimum withdrawal amount is ₹10");
      return;
    }
    if (amount > availableBalance) {
      toast.error(`Amount exceeds available balance (₹${availableBalance.toFixed(2)})`);
      return;
    }
    if (!upiId.trim() || !upiId.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g. name@okaxis)");
      return;
    }

    setIsSubmitting(true);
    triggerHaptic(30);

    try {
      const res = await withdrawRiderEarnings(amount, upiId.trim());
      if (res.ok) {
        triggerHaptic([40, 80, 120]);
        playSuccessChime();
        toast.success(res.message || `Payout request for ₹${amount} initiated! 💸`);
        onSuccess();
        onClose();
      } else {
        toast.error("Withdrawal failed. Please check details.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 animate-in slide-in-from-bottom-6 duration-200"
        role="dialog"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-white border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ArrowUpRight className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-950">Withdraw Earnings</h3>
              <p className="text-[11px] font-medium text-zinc-500">
                0% Fee Instant Bank / UPI Cashout
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
          {/* Available Balance Box */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                Available to Cashout
              </p>
              <h3 className="text-2xl font-black text-zinc-950 mt-0.5">
                ₹{availableBalance.toFixed(2)}
              </h3>
            </div>
            {availableBalance > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setAmount(Math.floor(availableBalance));
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
              >
                Max Amount
              </button>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700">Withdraw Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-black text-zinc-400">
                ₹
              </span>
              <input
                type="number"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={10}
                max={availableBalance}
                className="w-full pl-8 pr-4 py-3 rounded-2xl border border-zinc-200 font-black text-lg text-zinc-900 focus:outline-none focus:border-emerald-500"
                placeholder="Enter amount"
              />
            </div>
          </div>

          {/* UPI ID Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700">Target UPI ID / VPA</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full px-3.5 py-3 rounded-2xl border border-zinc-200 font-bold text-sm text-zinc-900 focus:outline-none focus:border-emerald-500"
              placeholder="e.g. mobile@paytm or name@okicici"
            />
            <p className="text-[11px] text-zinc-500 font-medium">
              Funds will be sent directly to your verified bank account via UPI.
            </p>
          </div>

          {/* Zero Fee Guarantee */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span>100% Free Transfer — QuickPress absorbs all gateway charges.</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 z-10 p-4 bg-white border-t border-zinc-100">
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={isSubmitting || amount <= 0 || availableBalance < 10}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RotateCw className="size-4 animate-spin" />
                <span>Processing Transfer...</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="size-4" />
                <span>Confirm Cashout ₹{amount}</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};
