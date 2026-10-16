import React, { useState, useEffect } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  RotateCw,
  ShieldCheck,
  Wallet,
  X,
  Lock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { withdrawRiderEarnings } from "../../api/rider/rider-wallet-api";
import { fetchRiderProfile, type RiderProfile } from "../../api/rider/rider-profile-api";
import { triggerHaptic, playSuccessChime } from "../../lib/captain-audio";

interface RiderWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance: number;
}

export const RiderWithdrawModal: React.FC<RiderWithdrawModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableBalance,
}) => {
  if (!isOpen) return null;

  const [amount, setAmount] = useState<number>(availableBalance > 0 ? Math.floor(availableBalance) : 100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchRiderProfile()
      .then((p) => {
        if (mounted) setProfile(p);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const registeredBankName = profile?.bankName || "Registered Bank Account";
  const rawAccountNumber = profile?.accountNumber || "";
  const registeredLast4 = profile?.accountLast4 || (rawAccountNumber ? rawAccountNumber.slice(-4) : "4821");
  const registeredIfsc = profile?.ifsc || "HDFC0001234";
  const registeredHolder = profile?.accountHolder || profile?.fullName || "Captain";

  const handleWithdraw = async () => {
    if (amount < 10) {
      toast.error("Minimum withdrawal amount is ₹10");
      return;
    }
    if (amount > availableBalance) {
      toast.error(`Amount exceeds available balance (₹${availableBalance.toFixed(2)})`);
      return;
    }

    setIsSubmitting(true);
    triggerHaptic(30);

    try {
      const res = await withdrawRiderEarnings(amount, {
        accountNumber: rawAccountNumber,
        ifsc: registeredIfsc,
        bankName: registeredBankName,
        accountHolder: registeredHolder,
      });

      if (res.ok) {
        triggerHaptic([40, 80, 120]);
        playSuccessChime();
        toast.success(
          res.message || `Withdrawal request for ₹${amount} to ${registeredBankName} submitted! 💸`
        );
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

  const quickAmounts = [100, 200, 500, 1000];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 animate-in slide-in-from-bottom-6 duration-200"
        role="dialog"
      >
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-white border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Building2 className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-950">Withdraw to Bank Account</h3>
              <p className="text-[11px] font-medium text-zinc-500">
                Direct NEFT / IMPS Transfer (0% Fee)
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
                Available to Withdraw
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
                Max Balance
              </button>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700">Withdrawal Amount (₹)</label>
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

            {/* Quick Amount Pills */}
            <div className="flex items-center gap-1.5 pt-1">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setAmount(amt);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                    amount === amt
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Registered Bank Account Card (From Registration) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                <Building2 className="size-3.5 text-emerald-600" />
                <span>Payout Destination (Registration Bank)</span>
              </label>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <ShieldCheck className="size-3" />
                <span>Verified Account</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-white to-zinc-50/60 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-black text-xs border border-emerald-500/20">
                    🏦
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-zinc-900">{registeredBankName}</h4>
                    <p className="text-[11px] font-mono text-zinc-500">
                      A/C: •••• •••• {registeredLast4}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">IFSC Code</span>
                  <span className="text-xs font-mono font-bold text-zinc-800">{registeredIfsc}</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Account Holder:</span>
                <span className="font-bold text-zinc-800">{registeredHolder}</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed px-1">
              Withdrawal funds will be credited directly to your bank account provided during registration via instant IMPS / NEFT transfer.
            </p>
          </div>

          {/* Zero Fee Guarantee */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
            <span>100% Free Transfer — QuickPress absorbs all gateway & IMPS charges.</span>
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
                <span>Processing Bank Transfer...</span>
              </>
            ) : (
              <>
                <ArrowUpRight className="size-4" />
                <span>Confirm Bank Cashout ₹{amount}</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};
