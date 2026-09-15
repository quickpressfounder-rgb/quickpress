import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Wallet,
  ArrowRight,
  CheckCircle2,
  X,
  Loader2,
  Coins,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { redeemLoyaltyPoints } from "@/api/customer/offers-api";

interface RedeemPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPoints: number;
  onRedeemSuccess: (redeemedPoints: number, creditedRupees: number, remainingPoints: number) => void;
}

export function RedeemPointsModal({
  isOpen,
  onClose,
  currentPoints,
  onRedeemSuccess,
}: RedeemPointsModalProps) {
  const navigate = useNavigate();
  const [pointsInput, setPointsInput] = useState<number>(Math.min(100, currentPoints));
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    redeemedPoints: number;
    creditedRupees: number;
    walletBalance: number;
  } | null>(null);

  if (!isOpen) return null;

  const points = Math.max(0, Number(pointsInput) || 0);
  const rupees = (points / 10).toFixed(2);
  const isInvalid = points <= 0 || points > currentPoints;

  const handleRedeem = async () => {
    if (isInvalid || loading) return;
    setLoading(true);
    try {
      const res = await redeemLoyaltyPoints(points);
      if (res.ok) {
        setSuccessResult({
          redeemedPoints: res.redeemedPoints,
          creditedRupees: res.creditedRupees,
          walletBalance: res.walletBalance,
        });
        onRedeemSuccess(res.redeemedPoints, res.creditedRupees, res.remainingPoints);
        toast.success(`₹${res.creditedRupees.toFixed(2)} transferred to your wallet! 🎉`);
      }
    } catch (err: any) {
      console.error("Redeem points failed:", err);
      toast.error(err?.message || "Failed to redeem loyalty points. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccessResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 animate-in slide-in-from-bottom duration-300">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="size-5" />
        </button>

        {successResult ? (
          /* Success Screen */
          <div className="text-center space-y-4 py-3">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shadow-inner">
              <CheckCircle2 className="size-9 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                Cash Transferred to Wallet!
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Successfully converted {successResult.redeemedPoints} Loyalty Points into real cash.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Added to QuickPress Wallet
              </span>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                +₹{successResult.creditedRupees.toFixed(2)}
              </p>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium mt-1">
                Updated Wallet Balance: ₹{successResult.walletBalance.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate({ to: "/wallet" });
                }}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wallet className="size-4" />
                <span>View QuickPress Wallet</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full h-10 rounded-2xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Redemption Form */
          <>
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 shadow-inner shrink-0">
                <Coins className="size-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                  Transfer to Wallet
                  <Sparkles className="size-4 text-amber-500 fill-amber-500" />
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Convert Loyalty Points into real spendable wallet money.
                </p>
              </div>
            </div>

            {/* Current Balance & Rate Callout */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                  Available Points
                </span>
                <p className="text-lg font-black text-zinc-900 dark:text-white mt-0.5">
                  {currentPoints.toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-bold text-amber-600">pts</span>
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
                  Conversion Rate
                </span>
                <p className="text-sm font-black text-amber-900 dark:text-amber-300 mt-0.5">
                  100 pts = ₹10.00
                </p>
              </div>
            </div>

            {/* Quick Slabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Quick Select:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[100, 200, 500].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={currentPoints < amount}
                    onClick={() => setPointsInput(amount)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      pointsInput === amount
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : currentPoints < amount
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 opacity-50 cursor-not-allowed"
                        : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:border-amber-500"
                    }`}
                  >
                    {amount} pts
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPoints <= 0}
                  onClick={() => setPointsInput(currentPoints)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                    pointsInput === currentPoints && currentPoints > 0
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : currentPoints <= 0
                      ? "bg-zinc-100 text-zinc-400 border-zinc-200 opacity-50 cursor-not-allowed"
                      : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700 hover:border-amber-500"
                  }`}
                >
                  All ({currentPoints})
                </button>
              </div>
            </div>

            {/* Points Input & Conversion Preview */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Points to Convert:
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="1"
                    max={currentPoints}
                    value={pointsInput || ""}
                    onChange={(e) => setPointsInput(Number(e.target.value) || 0)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base font-black text-zinc-900 dark:text-white focus:outline-hidden focus:border-amber-500 transition-colors"
                    placeholder="Enter points"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-zinc-400">
                    points
                  </span>
                </div>
                {points > currentPoints && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    You only have {currentPoints} points available.
                  </p>
                )}
              </div>

              {/* Conversion Result Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider">
                    You will receive in wallet
                  </span>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    ₹{rupees}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl">
                  <Wallet className="size-5" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isInvalid || loading}
                onClick={handleRedeem}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Wallet className="size-4" />
                    <span>Transfer ₹{rupees} to Wallet</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full h-9 rounded-2xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
