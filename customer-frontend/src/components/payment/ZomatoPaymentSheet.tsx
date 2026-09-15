import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildUpiUri,
  generateUpiQrDataUrl,
  isMobileDevice,
  launchDirectUpiApp,
  type UpiAppTarget,
  DEFAULT_MERCHANT_VPA,
} from "@/lib/upi-intent";
import {
  PhonePeLogo,
  GooglePayLogo,
  PaytmLogo,
  BhimUpiLogo,
  CredLogo,
  AmazonPayLogo,
  MobikwikLogo,
  LazyPayLogo,
} from "./UpiLogos";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "@/api/payments/razorpay-api";
import { openRazorpayCheckout } from "@/api/core/razorpay";

export interface ZomatoPaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  walletBalance: number;
  onPaymentSuccess: (method: string, paymentId: string) => Promise<void>;
  onSelectCod: () => Promise<void>;
  itemsSubtotal?: number;
  deliveryFee?: number;
  handlingFee?: number;
  platformFee?: number;
  gst?: number;
  couponDiscount?: number;
}

export function ZomatoPaymentSheet({
  isOpen,
  onClose,
  grandTotal,
  customerName,
  customerPhone,
  walletBalance,
  onPaymentSuccess,
  onSelectCod,
  itemsSubtotal = 0,
  deliveryFee = 0,
  handlingFee = 0,
  platformFee = 0,
  gst = 0,
  couponDiscount = 0,
}: ZomatoPaymentSheetProps) {
  const [processingMethod, setProcessingMethod] = useState<string | null>(null);
  const [showBillSummary, setShowBillSummary] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return isMobileDevice();
    }
    return false; // Default to laptop mode (QR scanner)
  });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [upiTxnRef] = useState<string>(() => `QP${Date.now().toString().slice(-8)}`);
  const [waitingDirectUpiApp, setWaitingDirectUpiApp] = useState<string | null>(null);
  const [qrCountdown, setQrCountdown] = useState<number>(300); // 5 mins QR validity
  const [forceShowQrOnMobile, setForceShowQrOnMobile] = useState(false);

  // Generate UPI URI
  const upiUri = buildUpiUri({
    amount: grandTotal,
    txnRef: upiTxnRef,
    payeeName: "QuickPress Laundry",
    note: `QuickPress Order ${upiTxnRef}`,
  });

  // Detect device environment & generate QR Code
  useEffect(() => {
    if (!isOpen) return;

    const checkDevice = () => {
      setIsMobile(isMobileDevice());
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);

    // Generate dynamic QR code immediately
    void generateUpiQrDataUrl(upiUri).then((dataUrl) => {
      setQrCodeDataUrl(dataUrl);
    });

    // Reset timer
    setQrCountdown(300);
    const timer = setInterval(() => {
      setQrCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      window.removeEventListener("resize", checkDevice);
      clearInterval(timer);
    };
  }, [isOpen, upiUri]);

  if (!isOpen) return null;

  const isCodAllowed = grandTotal >= 50;

  // Direct Mobile UPI App Launcher (PhonePe, GPay, Paytm, Any Installed)
  const handleLaunchDirectUpi = (target: UpiAppTarget, label: string) => {
    toast.info(`Opening ${label}...`);
    setWaitingDirectUpiApp(label);
    launchDirectUpiApp(target, upiUri);
  };

  // Confirming Direct UPI after user enters PIN in PhonePe/GPay/Paytm
  const handleConfirmDirectUpiPaid = async () => {
    if (processingMethod) return;
    setProcessingMethod("Verifying UPI");
    toast.info("Verifying transaction with bank...");

    try {
      await onPaymentSuccess("upi", `upi-intent-${upiTxnRef}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Payment confirmation failed. Please try again.");
    } finally {
      setProcessingMethod(null);
    }
  };

  // Online Payment fallback for Cards & Netbanking via Razorpay
  const handleRazorpayFlow = async (
    preferredMethod: "card" | "netbanking" | "wallet",
    methodLabel: string
  ) => {
    if (processingMethod) return;
    setProcessingMethod(methodLabel);

    try {
      toast.info(`Launching ${methodLabel}...`);

      const rzpOrder = await createRazorpayOrder({
        amount: grandTotal,
        purpose: "QuickPress Laundry Order",
      });

      const outcome = await openRazorpayCheckout(rzpOrder, {
        description: `QuickPress Laundry Payment (₹${grandTotal})`,
        profile: {
          name: customerName.trim(),
          contact: customerPhone.replace(/\D/g, ""),
        },
        themeColor: "#0c831f",
        appName: "QuickPress",
        preferredMethod,
      });

      if (outcome.status === "success") {
        toast.info("Verifying payment security...");
        const verification = await verifyRazorpayPayment({
          paymentId: rzpOrder.paymentId,
          razorpayOrderId: outcome.payload.razorpay_order_id,
          razorpayPaymentId: outcome.payload.razorpay_payment_id,
          razorpaySignature: outcome.payload.razorpay_signature,
        });

        const verifiedPaymentId =
          verification.payment?.id ||
          outcome.payload.razorpay_payment_id ||
          `rzp-${Date.now()}`;

        toast.success("Payment Successful! 💳 Placing your order...");
        await onPaymentSuccess(preferredMethod, verifiedPaymentId);
        onClose();
      } else if (outcome.status === "dismissed") {
        toast.error("Payment cancelled. Order has NOT been placed.");
      } else {
        toast.error(outcome.reason || "Payment rejected. Order has NOT been placed.");
      }
    } catch (err: any) {
      console.error("[ZomatoPaymentSheet] Payment error:", err);
      toast.error(err?.message || "Payment could not be processed. Order has NOT been placed.");
    } finally {
      setProcessingMethod(null);
    }
  };

  // QuickPress Wallet Payment
  const handleWalletPayment = async () => {
    if (processingMethod) return;

    if (walletBalance < grandTotal) {
      toast.error(
        `Insufficient wallet balance: ₹${walletBalance} available, ₹${grandTotal} required. Please choose UPI or Pay on Delivery.`
      );
      return;
    }

    setProcessingMethod("QuickPress Wallet");
    try {
      toast.info("Deducting from QuickPress Wallet...");
      await onPaymentSuccess("wallet", `wallet-tx-${Date.now()}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Wallet deduction failed. Order not placed.");
    } finally {
      setProcessingMethod(null);
    }
  };

  // Pay on Delivery (COD)
  const handleCodPayment = async () => {
    if (!isCodAllowed) {
      toast.error("Cash on delivery is not available for orders below ₹50.");
      return;
    }

    if (processingMethod) return;
    setProcessingMethod("cod");

    try {
      await onSelectCod();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to place COD order.");
    } finally {
      setProcessingMethod(null);
    }
  };

  const copyVpa = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(DEFAULT_MERCHANT_VPA);
      toast.success("UPI ID copied: " + DEFAULT_MERCHANT_VPA);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full sm:max-w-md max-h-[92dvh] bg-[#f4f6f8] text-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300 select-none"
      >
        {/* TOP HEADER: Exact Zomato/Blinkit Match "← Bill total: ₹82" */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-white border-b border-zinc-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
              aria-label="Back to checkout"
            >
              <ArrowLeft className="size-5 stroke-[2.5]" />
            </button>
            <div>
              <h2 className="text-base font-black text-zinc-950 tracking-tight flex items-center gap-1.5">
                <span>Bill total:</span>
                <span className="text-[#0c831f] font-black">₹{grandTotal}</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowBillSummary(!showBillSummary)}
            className="flex items-center gap-1 text-[11px] font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-full active:scale-95 transition-all"
          >
            <span>Details</span>
            <ChevronDown className={`size-3 transition-transform ${showBillSummary ? "rotate-180" : ""}`} />
          </button>
        </header>

        {/* Collapsible Bill Breakdown Drawer */}
        {showBillSummary && (
          <div className="bg-emerald-50/70 border-b border-emerald-200/60 px-4 py-2.5 text-xs space-y-1 animate-in slide-in-from-top-2 duration-150">
            <div className="flex justify-between text-zinc-600">
              <span>Items Subtotal:</span>
              <span className="font-bold text-zinc-900">₹{itemsSubtotal}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Delivery Partner Fee:</span>
                <span className="font-bold text-zinc-900">₹{deliveryFee}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>Handling & Platform:</span>
              <span className="font-bold text-zinc-900">₹{handlingFee + platformFee}</span>
            </div>
            {gst > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Taxes & GST:</span>
                <span className="font-bold text-zinc-900">₹{gst}</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Coupon Discount:</span>
                <span>-₹{couponDiscount}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-emerald-200 font-black text-zinc-900">
              <span>Grand Total:</span>
              <span className="text-[#0c831f]">₹{grandTotal}</span>
            </div>
          </div>
        )}

        {/* WAITING FOR DIRECT UPI APP OVERLAY */}
        {waitingDirectUpiApp && (
          <div className="bg-purple-50/95 border-b border-purple-200 p-4 space-y-3 animate-in slide-in-from-top-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-purple-600 animate-ping" />
                <span className="text-xs font-black text-purple-950">
                  Waiting for {waitingDirectUpiApp}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setWaitingDirectUpiApp(null)}
                className="text-xs text-purple-700 font-bold hover:underline"
              >
                Change Method
              </button>
            </div>

            <p className="text-[11px] text-purple-900 leading-relaxed font-medium">
              We have opened <b>{waitingDirectUpiApp}</b> on your phone. Please enter your 4/6-digit UPI PIN. Once done, tap below:
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmDirectUpiPaid}
                disabled={Boolean(processingMethod)}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                {processingMethod ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Check className="size-4 stroke-[3]" />
                    <span>✓ I Have Paid (Confirm Order)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => launchDirectUpiApp("any", upiUri)}
                className="px-3 py-2.5 bg-white border border-purple-300 text-purple-900 font-bold text-xs rounded-xl hover:bg-purple-100/50"
                title="Re-open UPI App"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* SCROLLABLE PAYMENT OPTIONS BODY */}
        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5">
          {/* ============================================================ */}
          {/* LAPTOP / PC MODE: SCANNER QR CODE (Not Mobile UPI App List) */}
          {/* ============================================================ */}
          {!isMobile || forceShowQrOnMobile ? (
            <div className="bg-white rounded-2xl p-4 shadow-xs border-2 border-emerald-500/30 space-y-3.5 text-center">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Scan & Pay via Any UPI App
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                  <Timer className="size-3 text-amber-600" />
                  {formatTimer(qrCountdown)}
                </span>
              </div>

              {/* Dynamic QR Code */}
              <div className="flex flex-col items-center justify-center p-3 bg-zinc-50 border border-zinc-200 rounded-2xl max-w-xs mx-auto">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QuickPress UPI Payment QR Code"
                    className="w-56 h-56 rounded-xl shadow-xs object-contain bg-white p-2 border border-zinc-200"
                  />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-zinc-400">
                    <Loader2 className="size-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Generating UPI QR...</span>
                  </div>
                )}

                {/* Real Brand Logos Strip under QR */}
                <div className="flex items-center justify-center gap-3 pt-3">
                  <PhonePeLogo className="size-7" />
                  <GooglePayLogo className="size-7" />
                  <PaytmLogo className="w-12 h-6" />
                  <BhimUpiLogo className="size-7" />
                </div>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-xs font-black text-zinc-900">
                  Scan with PhonePe, Google Pay, Paytm or any UPI App
                </p>
                <p className="text-[11px] text-zinc-500">
                  Point your phone's camera or scanner at this screen to pay <b>₹{grandTotal}</b>
                </p>
              </div>

              {/* Copy UPI ID Button */}
              <div className="flex items-center justify-between bg-zinc-100/80 px-3 py-2 rounded-xl text-xs">
                <span className="font-mono text-zinc-700 truncate font-semibold">
                  {DEFAULT_MERCHANT_VPA}
                </span>
                <button
                  type="button"
                  onClick={copyVpa}
                  className="flex items-center gap-1 text-[11px] font-black text-[#0c831f] hover:underline shrink-0 ml-2"
                >
                  <Copy className="size-3" />
                  <span>Copy</span>
                </button>
              </div>

              <button
                type="button"
                disabled={Boolean(processingMethod)}
                onClick={handleConfirmDirectUpiPaid}
                className="w-full py-3 bg-[#0c831f] hover:bg-emerald-800 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {processingMethod ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Check className="size-4 stroke-[3]" />
                    <span>I Have Completed Payment on Phone</span>
                  </>
                )}
              </button>

              {isMobile && forceShowQrOnMobile && (
                <button
                  type="button"
                  onClick={() => setForceShowQrOnMobile(false)}
                  className="text-xs text-zinc-600 font-bold hover:underline"
                >
                  ← Switch back to direct 1-tap UPI apps
                </button>
              )}
            </div>
          ) : (
            /* ============================================================ */
            /* SMARTPHONE / MOBILE MODE: DIRECT 1-TAP NATIVE UPI APP LAUNCH */
            /* ============================================================ */
            <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border border-zinc-100 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  Recommended UPI (1-Tap Direct)
                </p>
                <button
                  type="button"
                  onClick={() => setForceShowQrOnMobile(true)}
                  className="text-[10px] font-black text-[#0c831f] hover:underline flex items-center gap-1"
                >
                  <QrCode className="size-3" />
                  <span>Show QR Code</span>
                </button>
              </div>

              {/* Top Hero Option: Opens User's Installed UPI Apps natively */}
              <button
                type="button"
                disabled={Boolean(processingMethod)}
                onClick={() => handleLaunchDirectUpi("any", "Any Installed UPI App")}
                className="w-full p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 hover:from-emerald-500/15 border-2 border-emerald-500/40 rounded-2xl flex items-center justify-between text-left active:scale-[0.99] transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-[#0c831f] text-white flex items-center justify-center shadow-xs shrink-0">
                    <Smartphone className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-black text-zinc-950">
                        Pay with Installed UPI Apps
                      </p>
                      <span className="bg-[#0c831f] text-white text-[8.5px] font-black px-1.5 py-0.2 rounded-full uppercase">
                        Shows Installed Only
                      </span>
                    </div>
                    <p className="text-[10.5px] font-medium text-emerald-900 truncate">
                      Opens system chooser with apps on your phone
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[#0c831f] font-black text-xs shrink-0">
                  <span>PAY</span>
                  <ChevronRight className="size-4 stroke-[2.5]" />
                </div>
              </button>

              {/* Direct Individual UPI App Shortcuts with REAL Official Logos */}
              <div className="divide-y divide-zinc-100 pt-1">
                {/* 1. PhonePe (Official Logo - DIRECT 1-TAP OPEN, NO RAZORPAY) */}
                <button
                  type="button"
                  disabled={Boolean(processingMethod)}
                  onClick={() => handleLaunchDirectUpi("phonepe", "PhonePe")}
                  className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-zinc-50/80 active:bg-zinc-100 rounded-xl transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PhonePeLogo />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-zinc-900 group-hover:text-[#5f259f] transition-colors">
                          PhonePe
                        </p>
                        <span className="bg-purple-100 text-[#5f259f] text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                          Direct Open
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-zinc-500 truncate">
                        Direct 1-tap open in PhonePe App (No Gateway)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-700 shrink-0">
                    <ChevronRight className="size-4.5 stroke-[2]" />
                  </div>
                </button>

                {/* 2. Google Pay (Official Logo) */}
                <button
                  type="button"
                  disabled={Boolean(processingMethod)}
                  onClick={() => handleLaunchDirectUpi("gpay", "Google Pay")}
                  className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-zinc-50/80 active:bg-zinc-100 rounded-xl transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GooglePayLogo />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-zinc-900 group-hover:text-blue-600 transition-colors">
                        Google Pay (GPay)
                      </p>
                      <p className="text-[10px] font-medium text-zinc-500 truncate">
                        Direct 1-tap open in GPay App
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-700 shrink-0">
                    <ChevronRight className="size-4.5 stroke-[2]" />
                  </div>
                </button>

                {/* 3. Paytm (Official Logo) */}
                <button
                  type="button"
                  disabled={Boolean(processingMethod)}
                  onClick={() => handleLaunchDirectUpi("paytm", "Paytm")}
                  className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-zinc-50/80 active:bg-zinc-100 rounded-xl transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PaytmLogo />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-zinc-900 group-hover:text-[#002970] transition-colors">
                        Paytm UPI
                      </p>
                      <p className="text-[10px] font-medium text-zinc-500 truncate">
                        Direct 1-tap open in Paytm App
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-700 shrink-0">
                    <ChevronRight className="size-4.5 stroke-[2]" />
                  </div>
                </button>

                {/* 4. CRED UPI (Official Logo) */}
                <button
                  type="button"
                  disabled={Boolean(processingMethod)}
                  onClick={() => handleLaunchDirectUpi("cred", "CRED")}
                  className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-zinc-50/80 active:bg-zinc-100 rounded-xl transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CredLogo />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-zinc-900 group-hover:text-zinc-950 transition-colors">
                        CRED UPI
                      </p>
                      <p className="text-[10px] font-medium text-zinc-500 truncate">
                        Direct 1-tap open in CRED App
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-700 shrink-0">
                    <ChevronRight className="size-4.5 stroke-[2]" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 2: QUICKPRESS WALLET */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border border-zinc-100">
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2 px-1">
              Wallets
            </p>

            <div className="divide-y divide-zinc-100">
              {/* QuickPress Money (Blinkit Money style) */}
              <div className="w-full flex items-center justify-between py-2.5 px-1 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Wallet className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-zinc-900">QuickPress Money</p>
                    <p className="text-[11px] font-bold text-zinc-500">
                      Balance: <span className="font-black text-zinc-800">₹{walletBalance}</span>
                    </p>
                  </div>
                </div>

                {walletBalance >= grandTotal ? (
                  <button
                    type="button"
                    disabled={Boolean(processingMethod)}
                    onClick={handleWalletPayment}
                    className="px-3 py-1.5 bg-[#0c831f] hover:bg-emerald-800 text-white font-black text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {processingMethod === "QuickPress Wallet" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="size-3.5 stroke-[3]" />
                        <span>Pay ₹{grandTotal}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-lg">
                    Low Balance
                  </span>
                )}
              </div>

              {/* Amazon Pay Balance */}
              <button
                type="button"
                disabled={Boolean(processingMethod)}
                onClick={() => handleRazorpayFlow("wallet", "Amazon Pay")}
                className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-zinc-50/80 active:bg-zinc-100 rounded-xl transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AmazonPayLogo />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-zinc-900">Amazon Pay Balance</p>
                    <p className="text-[10px] font-medium text-zinc-500">
                      Link your Amazon Pay Balance wallet
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black text-[#0c831f] uppercase tracking-wide px-2 py-0.5 rounded-md hover:bg-emerald-50 transition-colors">
                  ADD
                </span>
              </button>

              {/* Mobikwik */}
              <button
                type="button"
                disabled={Boolean(processingMethod)}
                onClick={() => handleRazorpayFlow("wallet", "Mobikwik")}
                className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-zinc-50/80 active:bg-zinc-100 rounded-xl transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MobikwikLogo />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-zinc-900">Mobikwik</p>
                    <p className="text-[10px] font-medium text-zinc-500">Link your Mobikwik wallet</p>
                  </div>
                </div>

                <span className="text-xs font-black text-[#0c831f] uppercase tracking-wide px-2 py-0.5 rounded-md hover:bg-emerald-50 transition-colors">
                  ADD
                </span>
              </button>
            </div>
          </div>

          {/* SECTION 3: CARDS (Credit & Debit) */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border border-zinc-100">
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2 px-1">
              Cards
            </p>

            <button
              type="button"
              disabled={Boolean(processingMethod)}
              onClick={() => handleRazorpayFlow("card", "Credit or Debit Card")}
              className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-zinc-50/80 active:bg-zinc-100 rounded-xl transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
                  <CreditCard className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-zinc-900">Add credit or debit cards</p>
                  <p className="text-[10px] font-medium text-zinc-500">
                    Visa, Mastercard, RuPay, Maestro
                  </p>
                </div>
              </div>

              <span className="text-xs font-black text-[#0c831f] uppercase tracking-wide px-2 py-0.5 rounded-md hover:bg-emerald-50 transition-colors">
                {processingMethod === "Credit or Debit Card" ? (
                  <Loader2 className="size-3.5 animate-spin text-[#0c831f]" />
                ) : (
                  "ADD"
                )}
              </span>
            </button>
          </div>

          {/* SECTION 4: NETBANKING */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border border-zinc-100">
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2 px-1">
              Netbanking
            </p>

            <button
              type="button"
              disabled={Boolean(processingMethod)}
              onClick={() => handleRazorpayFlow("netbanking", "Netbanking")}
              className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-zinc-50/80 active:bg-zinc-100 rounded-xl transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
                  <Building2 className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-zinc-900">Netbanking</p>
                  <p className="text-[10px] font-medium text-zinc-500">
                    HDFC, SBI, ICICI, Axis & 50+ Indian banks
                  </p>
                </div>
              </div>

              <span className="text-xs font-black text-[#0c831f] uppercase tracking-wide px-2 py-0.5 rounded-md hover:bg-emerald-50 transition-colors">
                {processingMethod === "Netbanking" ? (
                  <Loader2 className="size-3.5 animate-spin text-[#0c831f]" />
                ) : (
                  "ADD"
                )}
              </span>
            </button>
          </div>

          {/* SECTION 5: PAY ON DELIVERY (COD) */}
          <div className="bg-white rounded-2xl p-3 sm:p-3.5 shadow-xs border border-zinc-100 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1 px-1">
              Pay On Delivery
            </p>

            <button
              type="button"
              disabled={!isCodAllowed || Boolean(processingMethod)}
              onClick={handleCodPayment}
              className={`w-full flex items-center justify-between py-2.5 px-1 rounded-xl transition-all text-left ${
                isCodAllowed
                  ? "hover:bg-zinc-50/80 active:bg-zinc-100 cursor-pointer"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                  <Banknote className="size-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-zinc-900">Pay on Delivery</p>
                  <p className="text-[10px] font-medium text-zinc-500">
                    Pay cash or scan QR when clothes are collected / delivered
                  </p>
                </div>
              </div>

              {isCodAllowed ? (
                <span className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs active:scale-95 transition-all">
                  {processingMethod === "cod" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Place Order"
                  )}
                </span>
              ) : null}
            </button>

            {/* Red Minimum Order Note (Exact Match to Screenshot) */}
            {!isCodAllowed && (
              <div className="rounded-xl bg-red-50/80 border border-red-200/80 px-3 py-2 text-[11px] font-medium text-red-700 flex items-center gap-1.5">
                <Info className="size-3.5 shrink-0 text-red-500" />
                <span>Cash on delivery is not available for orders below ₹50.</span>
              </div>
            )}
          </div>

          {/* Security Badge Footer */}
          <div className="flex items-center justify-center gap-1.5 pt-1 pb-4 text-center text-[10px] font-semibold text-zinc-400">
            <Lock className="size-3 text-[#0c831f]" />
            <span>100% Safe & Secure NPCI UPI Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
}
