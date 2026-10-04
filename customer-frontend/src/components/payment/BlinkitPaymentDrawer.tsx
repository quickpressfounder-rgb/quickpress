import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Check,
  ChevronRight,
  CreditCard,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildUpiUri,
  isMobileDevice,
  launchDirectUpiApp,
  type UpiAppTarget,
} from "@/lib/upi-intent";
import { payWithRazorpay } from "@/api/payments/razorpay-api";

export interface BlinkitPaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  walletBalance: number;
  onPaymentSuccess: (method: string, paymentId: string) => Promise<void>;
  onSelectCod: () => Promise<void>;
}

export function BlinkitPaymentDrawer({
  isOpen,
  onClose,
  grandTotal,
  customerName,
  customerPhone,
  walletBalance,
  onPaymentSuccess,
  onSelectCod,
}: BlinkitPaymentDrawerProps) {
  const [busyMethod, setBusyMethod] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [upiTxnRef] = useState<string>(() => `QP${Date.now().toString().slice(-8)}`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(isMobileDevice());
    }
  }, []);

  if (!isOpen) return null;

  const cleanPhone = customerPhone.replace(/\D/g, "");
  const upiUri = buildUpiUri({
    amount: grandTotal,
    txnRef: upiTxnRef,
    payeeName: "QuickPress Laundry",
    note: `QuickPress Order ${upiTxnRef}`,
  });

  // Generic Online Payment Dispatcher (Cashfree PG + Native UPI App Intent)
  const executeOnlinePayment = async (
    methodLabel: string,
    appTarget?: UpiAppTarget
  ) => {
    if (busyMethod) return;
    setBusyMethod(methodLabel);

    try {
      // 1. If on mobile device and tapping a direct UPI app (PhonePe, Supermoney, FamApp, GPay):
      // Launch the direct UPI app immediately so user experiences instant redirection!
      if (isMobile && appTarget) {
        toast.info(`Launching ${methodLabel}...`);
        launchDirectUpiApp(appTarget, upiUri);
      } else {
        toast.info(`Connecting to ${methodLabel} via Razorpay...`);
      }

      // 2. Launch Razorpay verified session
      const outcome = await payWithRazorpay({
        amount: grandTotal,
        purpose: `QuickPress Laundry (${methodLabel})`,
        customerName: customerName.trim() || "QuickPress Customer",
        customerPhone: cleanPhone || "9999999999",
      });

      if (outcome.status === "success") {
        toast.success(`Payment via ${methodLabel} Confirmed! 🎉`);
        await onPaymentSuccess(appTarget || "online", outcome.paymentId);
        onClose();
      } else if (outcome.status === "user_dropped") {
        toast.error("Payment was cancelled. Order has not been placed.");
      } else {
        toast.error(outcome.reason || "Payment attempt failed. Please try again.");
      }
    } catch (err: any) {
      console.error("[BlinkitPaymentDrawer] Payment error:", err);
      toast.error(err?.message || "Payment could not be completed.");
    } finally {
      setBusyMethod(null);
    }
  };

  // QuickPress Wallet deduction
  const handleWalletPay = async () => {
    if (busyMethod) return;

    if (walletBalance < grandTotal) {
      toast.error(
        `Insufficient wallet balance: ₹${walletBalance} available, ₹${grandTotal} required. Please choose UPI or Pay on Delivery.`
      );
      return;
    }

    setBusyMethod("QuickPress Wallet");
    try {
      toast.info("Deducting from QuickPress Wallet...");
      const outcome = await payWithCashfree({
        amount: grandTotal,
        walletAmount: grandTotal,
        purpose: "QuickPress Laundry Order (Wallet)",
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
      });

      if (outcome.status === "success") {
        toast.success("Paid via QuickPress Wallet! Placing your order...");
        await onPaymentSuccess("wallet", outcome.paymentId);
        onClose();
      } else {
        toast.error(outcome.reason || "Wallet deduction failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Wallet payment failed.");
    } finally {
      setBusyMethod(null);
    }
  };

  // Cash on Delivery
  const handleCodPay = async () => {
    if (busyMethod) return;
    if (grandTotal < 50) {
      toast.error("Cash on delivery is not available for orders below ₹50.");
      return;
    }

    setBusyMethod("cod");
    try {
      await onSelectCod();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to place COD order.");
    } finally {
      setBusyMethod(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      {/* Drawer Container */}
      <div className="w-full sm:max-w-md max-h-[92dvh] bg-[#f4f6fb] text-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 select-none">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-white border-b border-zinc-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5 stroke-[2.5]" />
            </button>
            <div>
              <h2 className="text-sm font-black text-zinc-950 tracking-tight leading-tight">
                Select Payment Method
              </h2>
              <p className="text-[11px] font-bold text-zinc-500">
                Amount to pay: <strong className="text-zinc-900">₹{grandTotal}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
            <Lock className="size-3 text-[#0c831f]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0c831f]">100% Secure</span>
          </div>
        </header>

        {/* Scrollable Grouped Inset Cards Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* GROUP 1: CARDS */}
          <div>
            <h3 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Cards
            </h3>
            <div className="overflow-hidden rounded-2xl bg-white border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100">
              {/* Add credit or debit cards */}
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void executeOnlinePayment("Credit/Debit Card")}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-200/80">
                    <CreditCard className="size-5 text-zinc-700" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                      Add credit or debit cards
                    </p>
                    <p className="text-[10.5px] font-medium text-zinc-400">Visa, Mastercard, RuPay</p>
                  </div>
                </div>

                {busyMethod === "Credit/Debit Card" ? (
                  <Loader2 className="size-4 animate-spin text-[#0c831f]" />
                ) : (
                  <Plus className="size-4 stroke-[3] text-rose-500" />
                )}
              </button>

              {/* Add Pluxee */}
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void executeOnlinePayment("Pluxee Card")}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                    <span className="font-black text-[10px] tracking-tight text-[#1a1446]">pluxee</span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                    Add Pluxee
                  </p>
                </div>

                {busyMethod === "Pluxee Card" ? (
                  <Loader2 className="size-4 animate-spin text-[#0c831f]" />
                ) : (
                  <Plus className="size-4 stroke-[3] text-rose-500" />
                )}
              </button>
            </div>
          </div>

          {/* GROUP 2: UPI */}
          <div>
            <h3 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              UPI
            </h3>
            <div className="overflow-hidden rounded-2xl bg-white border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100">
              {/* PhonePe UPI */}
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void executeOnlinePayment("PhonePe UPI", "phonepe")}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#5f259f] text-white shadow-2xs">
                    <span className="font-black text-sm">पे</span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                      PhonePe UPI
                    </p>
                    <p className="text-[10.5px] font-medium text-zinc-400">Instant UPI Auto-Pay / Direct App</p>
                  </div>
                </div>

                {busyMethod === "PhonePe UPI" ? (
                  <Loader2 className="size-4.5 animate-spin text-[#0c831f]" />
                ) : (
                  <ChevronRight className="size-4 stroke-[2.5] text-zinc-400" />
                )}
              </button>

              {/* Supermoney UPI */}
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void executeOnlinePayment("Supermoney UPI", "supermoney")}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200/80 shadow-2xs px-1 gap-1">
                    <div className="size-4 shrink-0 rounded-[3.5px] bg-[#3237d6] flex items-center justify-center shadow-2xs">
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white">
                        <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" />
                      </svg>
                    </div>
                    <div className="flex flex-col text-left font-black text-[7.5px] leading-[7.5px] tracking-tight text-[#16173d]">
                      <span>super.</span>
                      <span>money</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                      Supermoney UPI
                    </p>
                    <p className="text-[10.5px] font-medium text-zinc-400">Flipkart UPI App</p>
                  </div>
                </div>

                {busyMethod === "Supermoney UPI" ? (
                  <Loader2 className="size-4.5 animate-spin text-[#0c831f]" />
                ) : (
                  <ChevronRight className="size-4 stroke-[2.5] text-zinc-400" />
                )}
              </button>

              {/* FamApp UPI */}
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void executeOnlinePayment("FamApp UPI", "famapp")}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#ea7a1e] to-[#f49322] shadow-2xs p-1">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                      <path d="M2.5 12.5c4.5-3.5 10-6 19-8.5-4 4.5-7 10-9 16-1-3-3-5.5-6-7.5-1.5 1.5-2.5 1-4 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                      FamApp UPI
                    </p>
                    <p className="text-[10.5px] font-medium text-zinc-400">Instant UPI for Gen-Z</p>
                  </div>
                </div>

                {busyMethod === "FamApp UPI" ? (
                  <Loader2 className="size-4.5 animate-spin text-[#0c831f]" />
                ) : (
                  <ChevronRight className="size-4 stroke-[2.5] text-zinc-400" />
                )}
              </button>

              {/* Add new UPI ID / Google Pay / Paytm */}
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void executeOnlinePayment("UPI Universal", "any")}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-200/80">
                    <span className="font-black text-sm text-zinc-700">@</span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                      Add new UPI ID / Google Pay / Paytm
                    </p>
                    <p className="text-[10.5px] font-medium text-zinc-400">GPay, Paytm, BHIM &amp; more</p>
                  </div>
                </div>

                {busyMethod === "UPI Universal" ? (
                  <Loader2 className="size-4 animate-spin text-[#0c831f]" />
                ) : (
                  <Plus className="size-4 stroke-[3] text-rose-500" />
                )}
              </button>
            </div>
          </div>

          {/* GROUP 3: WALLETS */}
          <div>
            <h3 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Wallets
            </h3>
            <div className="overflow-hidden rounded-2xl bg-white border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100">
              {/* QuickPress Wallet */}
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void handleWalletPay()}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/80">
                    <Wallet className="size-5 text-[#0c831f]" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                      QuickPress Wallet
                    </p>
                    <p className={`text-[11px] font-bold ${walletBalance >= grandTotal ? "text-[#0c831f]" : "text-amber-600"}`}>
                      Balance: ₹{walletBalance}
                    </p>
                  </div>
                </div>

                {busyMethod === "QuickPress Wallet" ? (
                  <Loader2 className="size-4 animate-spin text-[#0c831f]" />
                ) : (
                  <ChevronRight className="size-4 stroke-[2.5] text-zinc-400" />
                )}
              </button>

              {/* Amazon Pay Balance */}
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void executeOnlinePayment("Amazon Pay Balance")}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black text-white shadow-2xs">
                    <span className="font-black text-[11px]">pay</span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                    Amazon Pay Balance
                  </p>
                </div>

                {busyMethod === "Amazon Pay Balance" ? (
                  <Loader2 className="size-4 animate-spin text-[#0c831f]" />
                ) : (
                  <Plus className="size-4 stroke-[3] text-rose-500" />
                )}
              </button>

              {/* Mobikwik */}
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void executeOnlinePayment("Mobikwik")}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0070e0] text-white shadow-2xs">
                    <span className="font-black text-xs">M!</span>
                  </div>
                  <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                    Mobikwik
                  </p>
                </div>

                {busyMethod === "Mobikwik" ? (
                  <Loader2 className="size-4 animate-spin text-[#0c831f]" />
                ) : (
                  <Plus className="size-4 stroke-[3] text-rose-500" />
                )}
              </button>
            </div>
          </div>

          {/* GROUP 4: PAY ON DELIVERY */}
          <div>
            <h3 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Pay on Delivery
            </h3>
            <div className="overflow-hidden rounded-2xl bg-white border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100">
              <button
                type="button"
                disabled={Boolean(busyMethod)}
                onClick={() => void handleCodPay()}
                className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/80">
                    <Banknote className="size-5 text-[#0c831f]" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                      Cash on Delivery / Scan on Pickup
                    </p>
                    <p className="text-[10.5px] font-medium text-zinc-400">
                      Pay cash or scan QR when rider arrives
                    </p>
                  </div>
                </div>

                {busyMethod === "cod" ? (
                  <Loader2 className="size-4 animate-spin text-[#0c831f]" />
                ) : (
                  <div className="size-6 rounded-full bg-[#0c831f] flex items-center justify-center text-white">
                    <Check className="size-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Security Notice */}
        <footer className="p-3 bg-white border-t border-zinc-100 text-center">
          <p className="text-[10.5px] font-medium text-zinc-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5 text-[#0c831f]" />
            <span>Razorpay Secured 256-bit Bank Grade Encryption</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
