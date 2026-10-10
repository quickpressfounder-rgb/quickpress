import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Building2,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildUpiUri,
  detectInstalledUpiApps,
  generateUpiQrDataUrl,
  isMobileDevice,
  launchDirectUpiApp,
  type InstalledUpiApp,
  type UpiAppTarget,
} from "@/lib/upi-intent";
import { payWithRazorpay } from "@/api/payments/razorpay-api";

type UpiAppMeta = {
  name: string;
  subtext: string;
  badge?: string;
  renderIcon: () => React.ReactNode;
};

const KNOWN_UPI_META: Record<string, UpiAppMeta> = {
  "com.google.android.apps.nbu.paisa.user": {
    name: "Google Pay (GPay)",
    subtext: "Fast UPI Instant Verification",
    badge: "Popular",
    renderIcon: () => (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
        <span className="font-black text-xs tracking-tighter">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#EA4335]">P</span>
          <span className="text-[#FBBC05]">a</span>
          <span className="text-[#34A853]">y</span>
        </span>
      </div>
    ),
  },
  "com.phonepe.app": {
    name: "PhonePe UPI",
    subtext: "Fast UPI Instant Verification",
    badge: "Fastest",
    renderIcon: () => (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#5f259f] text-white shadow-2xs">
        <span className="font-black text-sm">पे</span>
      </div>
    ),
  },
  "net.one97.paytm": {
    name: "Paytm UPI",
    subtext: "Fast UPI Instant Verification",
    renderIcon: () => (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#00b9f5] text-white shadow-2xs font-black text-xs">
        Paytm
      </div>
    ),
  },
  "in.supermoney.android": {
    name: "Supermoney UPI",
    subtext: "Instant UPI Cashback",
    renderIcon: () => (
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
    ),
  },
  "com.famorganizer": {
    name: "FamApp UPI",
    subtext: "Gen-Z Fast UPI",
    renderIcon: () => (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#ea7a1e] to-[#f49322] shadow-2xs p-1">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
          <path d="M2.5 12.5c4.5-3.5 10-6 19-8.5-4 4.5-7 10-9 16-1-3-3-5.5-6-7.5-1.5 1.5-2.5 1-4 0z" />
        </svg>
      </div>
    ),
  },
  "com.dreamplug.androidapp": {
    name: "CRED UPI",
    subtext: "Members Only Rewards",
    renderIcon: () => (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black text-white shadow-2xs font-black text-xs">
        CRED
      </div>
    ),
  },
  "in.amazon.mShop.android.shopping": {
    name: "Amazon Pay UPI",
    subtext: "Amazon Pay UPI",
    renderIcon: () => (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#232f3e] text-[#ff9900] shadow-2xs font-black text-sm">
        a
      </div>
    ),
  },
  "in.org.npci.upiapp": {
    name: "BHIM UPI",
    subtext: "NPCI Govt Verified",
    renderIcon: () => (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#00897b] text-white shadow-2xs font-black text-xs">
        BHIM
      </div>
    ),
  },
  "com.whatsapp": {
    name: "WhatsApp Pay",
    subtext: "WhatsApp In-Chat UPI",
    renderIcon: () => (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#25d366] text-white shadow-2xs font-black text-xs">
        WA
      </div>
    ),
  },
  "com.naviapp": {
    name: "Navi UPI",
    subtext: "Navi Zero Fee UPI",
    renderIcon: () => (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0047cc] text-white shadow-2xs font-black text-xs">
        Navi
      </div>
    ),
  },
};

export type PaymentView = "main" | "card" | "upi_id" | "netbanking";

export const POPULAR_BANKS = [
  { name: "HDFC Bank", code: "HDFC", color: "bg-[#004c8f]", text: "HDFC" },
  { name: "ICICI Bank", code: "ICICI", color: "bg-[#f37021]", text: "ICICI" },
  { name: "State Bank of India", code: "SBI", color: "bg-[#002f6c]", text: "SBI" },
  { name: "Axis Bank", code: "AXIS", color: "bg-[#861f41]", text: "AXIS" },
  { name: "Kotak Mahindra Bank", code: "KOTAK", color: "bg-[#ed1c24]", text: "KOTAK" },
  { name: "Punjab National Bank", code: "PNB", color: "bg-[#a20032]", text: "PNB" },
];

export const ALL_OTHER_BANKS = [
  "Bank of Baroda",
  "Bank of India",
  "Canara Bank",
  "Central Bank of India",
  "City Union Bank",
  "Federal Bank",
  "IDFC FIRST Bank",
  "Indian Bank",
  "Indian Overseas Bank",
  "IndusInd Bank",
  "Jammu & Kashmir Bank",
  "Karur Vysya Bank",
  "RBL Bank",
  "South Indian Bank",
  "UCO Bank",
  "Union Bank of India",
  "Yes Bank",
];

export const BANK_CODE_MAP: Record<string, string> = {
  "HDFC Bank": "HDFC",
  "ICICI Bank": "ICIC",
  "State Bank of India": "SBIN",
  "Axis Bank": "UTIB",
  "Kotak Mahindra Bank": "KKBK",
  "Punjab National Bank": "PUNB_R",
  "Bank of Baroda": "BARB_R",
  "Bank of India": "BKID",
  "Canara Bank": "CNRB",
  "Central Bank of India": "CBIN",
  "City Union Bank": "CIUB",
  "Federal Bank": "FDRL",
  "IDFC FIRST Bank": "IDFB",
  "Indian Bank": "IDIB",
  "Indian Overseas Bank": "IOBA",
  "IndusInd Bank": "INDB",
  "Jammu & Kashmir Bank": "JAKA",
  "Karur Vysya Bank": "KVBL",
  "RBL Bank": "RATN",
  "South Indian Bank": "SIBL",
  "UCO Bank": "UCBA",
  "Union Bank of India": "UBIN",
  "Yes Bank": "YESB",
};

export const getCardBrandMeta = (num: string) => {
  const clean = num.replace(/\D/g, "");
  if (/^4/.test(clean)) return { brand: "visa", label: "VISA", bg: "from-blue-700 via-blue-900 to-slate-950" };
  if (/^(5[1-5]|2[2-7])/.test(clean)) return { brand: "mastercard", label: "Mastercard", bg: "from-amber-600 via-red-700 to-rose-950" };
  if (/^(60|65|81|82|508)/.test(clean)) return { brand: "rupay", label: "RuPay", bg: "from-emerald-700 via-teal-800 to-cyan-950" };
  if (/^3[47]/.test(clean)) return { brand: "amex", label: "AMEX", bg: "from-cyan-800 via-blue-900 to-indigo-950" };
  return { brand: "generic", label: "CARD", bg: "from-zinc-800 via-zinc-900 to-black" };
};

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
  const [currentView, setCurrentView] = useState<PaymentView>("main");
  const [busyMethod, setBusyMethod] = useState<string | null>(null);
  const [installedUpiApps, setInstalledUpiApps] = useState<InstalledUpiApp[]>([]);
  const [hasNativeBridge, setHasNativeBridge] = useState<boolean>(false);
  const [paymentFailure, setPaymentFailure] = useState<{
    failedMethod: string;
    preferredMethod: "upi" | "card" | "netbanking" | "wallet";
    reason: string;
    isUserCancelled?: boolean;
  } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [upiTxnRef] = useState<string>(() => `QP${Date.now().toString().slice(-8)}`);

  // Sub-screen states: Card
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");
  const [cardHolder, setCardHolder] = useState<string>(customerName || "");
  const [saveCard, setSaveCard] = useState<boolean>(true);
  const [showCvv, setShowCvv] = useState<boolean>(false);

  // Sub-screen states: UPI ID & QR
  const [upiTab, setUpiTab] = useState<"id" | "qr">("id");
  const [customVpa, setCustomVpa] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

  // Sub-screen states: Net Banking
  const [selectedBank, setSelectedBank] = useState<string>("HDFC Bank");
  const [searchBankQuery, setSearchBankQuery] = useState<string>("");

  // Card helpers
  const cardBrandMeta = getCardBrandMeta(cardNumber);

  const handleCardNumberChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) {
      setCardExpiry(digits);
    } else {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    }
  };

  // Official Real Razorpay Live SDK Payment Runner (Direct 1-Click Intent)
  const executeOnlinePayment = async (
    methodLabel: string,
    preferredMethod: "upi" | "card" | "netbanking" | "wallet" = "upi",
    vpa?: string,
    bank?: string,
    card?: { number: string; expiryMonth: string; expiryYear: string; cvv: string; name?: string },
    upiAppPackage?: string,
    wallet?: string
  ) => {
    if (busyMethod) return;

    if (grandTotal <= 0) {
      toast.success("100% Promo discount applied! Placing your free order... 🎉");
      await onPaymentSuccess("free_promo", `promo_free_${Date.now()}`);
      onClose();
      return;
    }

    setBusyMethod(methodLabel);
    setPaymentFailure(null);

    try {
      toast.info(`Connecting to ${methodLabel}...`);

      const outcome = await payWithRazorpay({
        amount: grandTotal,
        purpose: `QuickPress Laundry (${methodLabel})`,
        customerName: (card?.name || cardHolder).trim() || customerName.trim() || "QuickPress Customer",
        customerPhone: cleanPhone || "9999999999",
        preferredMethod,
        upiAppPackage,
        vpa,
        bank,
        wallet,
        card,
      });

      if (outcome.status === "success") {
        toast.success(`Payment via ${methodLabel} Confirmed! 🎉`);
        await onPaymentSuccess(preferredMethod, outcome.paymentId);
        onClose();
      } else if (outcome.status === "user_dropped") {
        toast.info("Payment window was cancelled.");
        setPaymentFailure({
          failedMethod: methodLabel,
          preferredMethod,
          reason: outcome.reason || "Payment was cancelled. You can retry or choose another payment method below.",
          isUserCancelled: true,
        });
      } else {
        toast.error(outcome.reason || "Payment attempt failed. Please try again.");
        setPaymentFailure({
          failedMethod: methodLabel,
          preferredMethod,
          reason: outcome.reason || "Transaction failed at gateway. Please try again or switch to another method.",
          isUserCancelled: false,
        });
      }
    } catch (err: any) {
      console.error("[BlinkitPaymentDrawer] Payment error:", err);
      toast.error(err?.message || "Payment could not be completed.");
      setPaymentFailure({
        failedMethod: methodLabel,
        preferredMethod,
        reason: err?.message || "Could not reach payment gateway. Please check your connection and retry.",
        isUserCancelled: false,
      });
    } finally {
      setBusyMethod(null);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawNumber = cardNumber.replace(/\s/g, "");
    if (rawNumber.length < 15) {
      toast.error("Please enter a valid 16-digit card number");
      return;
    }
    if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      toast.error("Please enter a valid expiry date (MM/YY)");
      return;
    }
    const [mmStr, yyStr] = cardExpiry.split("/");
    const mm = parseInt(mmStr, 10);
    if (mm < 1 || mm > 12) {
      toast.error("Expiry month must be between 01 and 12");
      return;
    }
    if (cardCvv.length < 3) {
      toast.error("Please enter a valid 3 or 4 digit CVV");
      return;
    }
    if (!cardHolder.trim()) {
      toast.error("Please enter name on card");
      return;
    }

    // Launch Real Razorpay 3D Secure Card Gateway directly
    await executeOnlinePayment(
      "Credit / Debit Card",
      "card",
      undefined,
      undefined,
      {
        number: rawNumber,
        expiryMonth: mmStr,
        expiryYear: yyStr || "",
        cvv: cardCvv,
        name: cardHolder.trim(),
      }
    );
  };

  const handleUpiIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vpa = customVpa.trim();
    if (!vpa || !vpa.includes("@") || vpa.length < 4) {
      toast.error("Please enter a valid UPI ID (e.g. yourname@okhdfcbank)");
      return;
    }

    // Launch Real Razorpay UPI Collect to VPA
    await executeOnlinePayment(`UPI ID (${vpa})`, "upi", vpa);
  };

  const handleNetBankingSubmit = async () => {
    if (!selectedBank) {
      toast.error("Please select a bank to proceed");
      return;
    }

    const bankCode = BANK_CODE_MAP[selectedBank] || "HDFC";
    // Launch Real Razorpay Net Banking for selected bank directly
    await executeOnlinePayment(`Net Banking (${selectedBank})`, "netbanking", undefined, bankCode);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsMobile(isMobileDevice());
    if (isOpen) {
      setCurrentView("main");
    }

    const syncInstalledApps = () => {
      const isBridge = Boolean(window.AndroidUpiLauncher || window.NativeRazorpay);
      setHasNativeBridge(isBridge);
      const apps = detectInstalledUpiApps();
      if (apps.length > 0) {
        setInstalledUpiApps(apps);
      }
    };

    syncInstalledApps();
    const timer = setTimeout(syncInstalledApps, 350);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const rawDigits = (customerPhone || "").replace(/\D/g, "");
  const cleanPhone = rawDigits.length === 12 && rawDigits.startsWith("91")
    ? rawDigits.slice(2)
    : (rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits);

  const upiUri = buildUpiUri({
    amount: grandTotal,
    txnRef: upiTxnRef,
    payeeName: "QuickPress Laundry",
    note: `QuickPress Order ${upiTxnRef}`,
  });

  useEffect(() => {
    if (currentView === "upi_id" && upiTab === "qr" && !qrDataUrl) {
      setIsGeneratingQr(true);
      generateUpiQrDataUrl(upiUri)
        .then((url) => setQrDataUrl(url))
        .catch(() => {})
        .finally(() => setIsGeneratingQr(false));
    }
  }, [currentView, upiTab, upiUri, qrDataUrl]);

  if (!isOpen) return null;

  // QuickPress Wallet deduction
  const handleWalletPay = async () => {
    if (busyMethod) return;

    if (grandTotal <= 0) {
      toast.success("100% Promo discount applied! Placing your free order... 🎉");
      await onPaymentSuccess("free_promo", `promo_free_${Date.now()}`);
      onClose();
      return;
    }

    if (walletBalance < grandTotal) {
      toast.error(
        `Insufficient wallet balance: ₹${walletBalance} available, ₹${grandTotal} required. Please choose UPI or Pay on Delivery.`
      );
      setPaymentFailure({
        failedMethod: "QuickPress Wallet",
        preferredMethod: "wallet",
        reason: `Insufficient balance (₹${walletBalance} available, ₹${grandTotal} needed). Please select UPI or COD.`,
        isUserCancelled: false,
      });
      return;
    }

    setBusyMethod("QuickPress Wallet");
    setPaymentFailure(null);
    try {
      toast.info("Deducting from QuickPress Wallet...");
      await onPaymentSuccess("wallet", `wallet_${Date.now()}`);
      toast.success("Paid via QuickPress Wallet! Placing your order...");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Wallet payment failed.");
      setPaymentFailure({
        failedMethod: "QuickPress Wallet",
        preferredMethod: "wallet",
        reason: err?.message || "Wallet deduction failed. Please select another method.",
        isUserCancelled: false,
      });
    } finally {
      setBusyMethod(null);
    }
  };

  // Cash on Delivery
  const handleCodPay = async () => {
    if (busyMethod) return;

    if (grandTotal <= 0) {
      toast.success("100% Promo discount applied! Placing your free order... 🎉");
      await onPaymentSuccess("free_promo", `promo_free_${Date.now()}`);
      onClose();
      return;
    }

    if (grandTotal < 50) {
      toast.error("Cash on delivery is not available for orders below ₹50.");
      return;
    }

    setBusyMethod("cod");
    setPaymentFailure(null);
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !busyMethod) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      {/* Drawer Container */}
      <div className="w-full sm:max-w-md max-h-[92dvh] bg-[#f4f6fb] text-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 select-none">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-white border-b border-zinc-200/90 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={Boolean(busyMethod)}
              onClick={() => {
                if (busyMethod) return;
                if (currentView !== "main") {
                  setCurrentView("main");
                } else {
                  onClose();
                }
              }}
              className="p-1.5 -ml-1 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none rounded-full active:scale-95 transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-5 stroke-[2.5]" />
            </button>
            <div>
              <h2 className="text-sm font-black text-zinc-950 tracking-tight leading-tight">
                {currentView === "main" && "Select Payment Method"}
                {currentView === "card" && "Add Credit or Debit Card"}
                {currentView === "upi_id" && "Pay via UPI ID / QR"}
                {currentView === "netbanking" && "Net Banking"}
              </h2>
              <p className="text-[11px] font-bold text-zinc-500">
                {currentView === "main" && (
                  <>
                    Amount to pay: <strong className="text-zinc-900">₹{grandTotal}</strong>
                  </>
                )}
                {currentView === "card" && "Visa, Mastercard, RuPay & Amex"}
                {currentView === "upi_id" && "Any UPI App or Bank Handle"}
                {currentView === "netbanking" && "Select from 50+ Indian Banks"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
            <Lock className="size-3 text-[#0c831f]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0c831f]">100% Secure</span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* SUB-SCREEN 1: CREDIT / DEBIT CARD UI */}
          {currentView === "card" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
              {/* Virtual Gradient Card Preview */}
              <div
                className={`relative w-full rounded-2xl p-5 text-white shadow-xl overflow-hidden bg-gradient-to-tr ${cardBrandMeta.bg} transition-all duration-300`}
              >
                <div className="absolute -top-12 -right-12 size-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-black/25 blur-lg pointer-events-none" />

                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-400 border border-amber-400/80 shadow-inner flex items-center justify-center">
                      <div className="w-8 h-5 border border-amber-600/40 rounded-xs grid grid-cols-2 gap-0.5 opacity-60">
                        <div className="border-r border-amber-600/40" />
                        <div />
                      </div>
                    </div>
                    <span className="text-[10px] tracking-wider text-white/80 font-bold uppercase">
                      QuickPress
                    </span>
                  </div>

                  <span className="text-xs font-black tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-md backdrop-blur-xs">
                    {cardBrandMeta.label}
                  </span>
                </div>

                <p className="font-mono text-lg sm:text-xl font-bold tracking-widest text-white mb-4 drop-shadow-xs">
                  {cardNumber || "•••• •••• •••• ••••"}
                </p>

                <div className="flex items-end justify-between text-xs tracking-wider">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/60 leading-none mb-1">Card Holder</p>
                    <p className="font-bold uppercase tracking-wider text-white truncate max-w-[170px]">
                      {cardHolder || "CARDHOLDER NAME"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-white/60 leading-none mb-1">Expires</p>
                    <p className="font-mono font-bold text-white tracking-widest">
                      {cardExpiry || "MM/YY"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Details Form */}
              <form onSubmit={handleCardSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-3 size-4.5 text-zinc-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="w-full pl-10 pr-16 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] outline-hidden shadow-2xs font-mono"
                    />
                    <div className="absolute right-3 top-2.5">
                      <span className="text-[10px] font-black uppercase text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                        {cardBrandMeta.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Valid Thru (MM/YY)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] outline-hidden shadow-2xs font-mono text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                      <span>CVV / CVC</span>
                      <span className="text-[9.5px] font-medium text-zinc-400">3-4 digits</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCvv ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="•••"
                        className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] outline-hidden shadow-2xs font-mono text-center tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvv(!showCvv)}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        {showCvv ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Enter name printed on card"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] outline-hidden shadow-2xs uppercase"
                  />
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="size-4 rounded text-[#0c831f] focus:ring-[#0c831f] mt-0.5 accent-[#0c831f]"
                  />
                  <span className="text-[11px] font-medium text-zinc-600 leading-tight">
                    Securely save this card for future faster checkout as per RBI tokenization guidelines.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={Boolean(busyMethod)}
                  className="w-full py-3.5 rounded-2xl bg-[#0c831f] hover:bg-[#09731b] active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-60"
                >
                  {busyMethod ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Lock className="size-4 stroke-[2.5]" />
                      <span>Pay ₹{grandTotal} Securely</span>
                    </>
                  )}
                </button>
              </form>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-center gap-2 text-zinc-500 text-[10.5px]">
                <ShieldCheck className="size-4 text-[#0c831f] shrink-0" />
                <span>PCI-DSS Level 1 Certified • 256-bit Bank Grade SSL Encryption</span>
              </div>
            </div>
          )}

          {/* SUB-SCREEN 2: UPI ID & DYNAMIC QR CODE UI */}
          {currentView === "upi_id" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="flex p-1 bg-zinc-200/70 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setUpiTab("id")}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    upiTab === "id" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>@</span>
                  <span>Enter UPI ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUpiTab("qr")}
                  className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    upiTab === "qr" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <QrCode className="size-3.5" />
                  <span>Scan QR Code</span>
                </button>
              </div>

              {upiTab === "id" ? (
                <form onSubmit={handleUpiIdSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Virtual Payment Address (UPI ID)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-zinc-400 font-black text-sm">@</span>
                      <input
                        type="text"
                        value={customVpa}
                        onChange={(e) => setCustomVpa(e.target.value.toLowerCase().trim())}
                        placeholder="yourname@okhdfcbank or 9876543210@paytm"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] outline-hidden shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Popular Handles (Tap to add):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["@okaxis", "@okhdfcbank", "@paytm", "@ybl", "@ibl", "@sbi"].map((suffix) => (
                        <button
                          key={suffix}
                          type="button"
                          onClick={() => {
                            const base = customVpa.split("@")[0] || "";
                            setCustomVpa(base ? `${base}${suffix}` : suffix);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-emerald-50 hover:text-[#0c831f] hover:border-emerald-300 border border-zinc-200 text-[11px] font-bold text-zinc-700 transition cursor-pointer"
                        >
                          {suffix}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900 leading-snug">
                    A payment request of <strong>₹{grandTotal}</strong> will be sent to your UPI app. Open PhonePe, Google Pay, or Paytm to authorize.
                  </div>

                  <button
                    type="submit"
                    disabled={Boolean(busyMethod) || !customVpa.trim()}
                    className="w-full py-3.5 rounded-2xl bg-[#0c831f] hover:bg-[#09731b] active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {busyMethod ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="size-4 stroke-[3]" />
                        <span>Verify &amp; Pay ₹{grandTotal}</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm inline-block mx-auto max-w-[280px]">
                    {isGeneratingQr ? (
                      <div className="size-56 flex items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-[#0c831f]" />
                      </div>
                    ) : qrDataUrl ? (
                      <div className="relative">
                        <img
                          src={qrDataUrl}
                          alt="QuickPress UPI QR Code"
                          className="size-56 mx-auto rounded-lg"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="size-11 rounded-xl bg-white shadow-md border border-zinc-200 flex items-center justify-center p-1">
                            <span className="text-[10px] font-black text-[#0c831f]">QP</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <p className="text-xs font-black text-zinc-900 mt-2">Scan &amp; Pay ₹{grandTotal}</p>
                    <p className="text-[10px] text-zinc-500">Scan with Google Pay, PhonePe, Paytm, CRED</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={Boolean(busyMethod)}
                      onClick={() => void executeOnlinePayment("Live UPI QR", "upi")}
                      className="w-full py-3.5 rounded-2xl bg-[#0c831f] hover:bg-[#09731b] active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-60"
                    >
                      {busyMethod ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <>
                          <QrCode className="size-4 stroke-[2.5]" />
                          <span>Pay ₹{grandTotal} via Live Razorpay QR</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-SCREEN 3: NET BANKING UI */}
          {currentView === "netbanking" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-200">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Popular Banks
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {POPULAR_BANKS.map((b) => {
                    const isSelected = selectedBank === b.name;
                    return (
                      <button
                        key={b.code}
                        type="button"
                        onClick={() => setSelectedBank(b.name)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer relative flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-50/70 border-[#0c831f] shadow-xs"
                            : "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-[#0c831f] text-white flex items-center justify-center">
                            <Check className="size-2.5 stroke-[3]" />
                          </div>
                        )}
                        <div
                          className={`size-8 rounded-xl ${b.color} text-white font-black text-[10px] flex items-center justify-center shadow-2xs`}
                        >
                          {b.text}
                        </div>
                        <span className="text-[11px] font-bold text-zinc-900 leading-tight">
                          {b.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  All Other Banks (50+ Supported)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchBankQuery}
                    onChange={(e) => setSearchBankQuery(e.target.value)}
                    placeholder="Search your bank (e.g. Canara, Baroda, Union)..."
                    className="w-full pl-9 pr-3.5 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] outline-hidden shadow-2xs"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl bg-white border border-zinc-200 divide-y divide-zinc-100 shadow-2xs">
                  {ALL_OTHER_BANKS.filter((b) =>
                    b.toLowerCase().includes(searchBankQuery.toLowerCase())
                  ).map((b) => {
                    const isSelected = selectedBank === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBank(b)}
                        className={`w-full p-2.5 px-3.5 text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          isSelected ? "bg-emerald-50 text-[#0c831f]" : "text-zinc-800 hover:bg-zinc-50"
                        }`}
                      >
                        <span>{b}</span>
                        {isSelected && <Check className="size-4 text-[#0c831f] stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedBank && (
                <div className="p-3 bg-zinc-100/90 rounded-xl border border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-[#0c831f]" />
                    <span className="text-xs font-bold text-zinc-800">Selected: <strong>{selectedBank}</strong></span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Instant NetBanking
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={Boolean(busyMethod) || !selectedBank}
                onClick={handleNetBankingSubmit}
                className="w-full py-3.5 rounded-2xl bg-[#0c831f] hover:bg-[#09731b] active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {busyMethod ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <Building2 className="size-4 stroke-[2.5]" />
                    <span>Pay ₹{grandTotal} via {selectedBank || "Net Banking"}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* MAIN CATEGORIZED DRAWER VIEW */}
          {currentView === "main" && (
            <>
              {/* FREE PROMO BANNER IF ₹0 */}
              {grandTotal <= 0 && (
                <div className="rounded-2xl bg-[#0c831f] text-white p-4 shadow-sm text-center space-y-2">
                  <p className="text-sm font-black">🎉 100% Discount Applied — Order is FREE!</p>
                  <p className="text-xs text-emerald-100">No payment is required to place this order.</p>
                  <button
                    type="button"
                    disabled={Boolean(busyMethod)}
                    onClick={async () => {
                      setBusyMethod("free_promo");
                      try {
                        await onPaymentSuccess("free_promo", `promo_free_${Date.now()}`);
                        onClose();
                      } finally {
                        setBusyMethod(null);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-white text-[#0c831f] font-black text-xs hover:bg-emerald-50 active:scale-95 transition cursor-pointer shadow-xs"
                  >
                    {busyMethod === "free_promo" ? (
                      <Loader2 className="size-4 animate-spin mx-auto text-[#0c831f]" />
                    ) : (
                      "Confirm & Place Free Order"
                    )}
                  </button>
                </div>
              )}

              {/* PAYMENT FAILED / RETRY BANNER */}
              {paymentFailure && (
                <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/95 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white mt-0.5 shadow-2xs">
                        <AlertCircle className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-rose-950">
                          {paymentFailure.isUserCancelled ? "Payment Cancelled / Incomplete" : "Payment Failed"}
                        </h4>
                        <p className="text-[11px] font-medium text-rose-800 leading-snug mt-0.5">
                          {paymentFailure.reason}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentFailure(null)}
                      className="text-rose-400 hover:text-rose-700 p-1 -mr-1 rounded-full cursor-pointer transition-colors"
                      aria-label="Dismiss message"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-rose-200/80">
                    <button
                      type="button"
                      disabled={Boolean(busyMethod)}
                      onClick={() => {
                        const pref = paymentFailure.preferredMethod;
                        const method = paymentFailure.failedMethod;
                        setPaymentFailure(null);
                        if (pref === "card") {
                          setCurrentView("card");
                        } else if (pref === "netbanking") {
                          setCurrentView("netbanking");
                        } else if (pref === "upi") {
                          setCurrentView("upi_id");
                        } else {
                          void executeOnlinePayment(method, pref);
                        }
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <RotateCcw className="size-3.5 stroke-[2.5]" />
                      <span>Retry {paymentFailure.failedMethod}</span>
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(busyMethod)}
                      onClick={() => {
                        setPaymentFailure(null);
                        void handleCodPay();
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-100/60 active:scale-95 text-rose-900 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <Banknote className="size-3.5 text-emerald-600" />
                      <span>Pay via COD</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-center font-bold text-zinc-500">
                    Or select another payment method from the list below:
                  </p>
                </div>
              )}

              {/* GROUP 1: CARDS */}
              <div>
                <h3 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  Cards
                </h3>
                <div className="overflow-hidden rounded-2xl bg-white border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100">
                  <button
                    type="button"
                    disabled={Boolean(busyMethod)}
                    onClick={() => setCurrentView("card")}
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
                        <p className="text-[10.5px] font-medium text-zinc-400">Visa, Mastercard, RuPay &amp; Amex</p>
                      </div>
                    </div>

                    <Plus className="size-4 stroke-[3] text-rose-500" />
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(busyMethod)}
                    onClick={() => setCurrentView("card")}
                    className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                        <span className="font-black text-[10px] tracking-tight text-[#1a1446]">pluxee</span>
                      </div>
                      <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                        Add Pluxee Card
                      </p>
                    </div>

                    <Plus className="size-4 stroke-[3] text-rose-500" />
                  </button>
                </div>
              </div>

              {/* GROUP 2: UPI */}
              <div>
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                    UPI {hasNativeBridge && installedUpiApps.length > 0 ? "• Installed On Device" : ""}
                  </h3>
                  {hasNativeBridge && installedUpiApps.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Device Detected ({installedUpiApps.length})
                    </span>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl bg-white border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100">
                  {hasNativeBridge ? (
                    installedUpiApps.length > 0 ? (
                      installedUpiApps.map((app) => {
                        const meta = KNOWN_UPI_META[app.packageName] || {
                          name: app.appName || "UPI App",
                          subtext: "Installed UPI App",
                          badge: undefined,
                          renderIcon: () => (
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 shadow-2xs font-black text-xs border border-zinc-200">
                              UPI
                            </div>
                          ),
                        };

                        const isBusy = busyMethod === meta.name;

                        return (
                          <button
                            key={app.packageName}
                            type="button"
                            disabled={Boolean(busyMethod)}
                            onClick={() => void executeOnlinePayment(meta.name, "upi", undefined, undefined, undefined, app.packageName)}
                            className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
                          >
                            <div className="flex items-center gap-3">
                              {meta.renderIcon()}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                                    {meta.name}
                                  </p>
                                  {meta.badge && (
                                    <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 text-[9px] font-black text-emerald-700 uppercase">
                                      {meta.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10.5px] font-medium text-zinc-400">
                                  {meta.subtext}
                                </p>
                              </div>
                            </div>

                            {isBusy ? (
                              <Loader2 className="size-4.5 animate-spin text-[#0c831f]" />
                            ) : (
                              <ChevronRight className="size-4 stroke-[2.5] text-zinc-400" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3.5 text-center text-xs text-zinc-500 bg-zinc-50/50">
                        <p className="font-semibold text-zinc-700">No UPI apps detected on this device</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Use UPI ID below, or pay via Card or COD</p>
                      </div>
                    )
                  ) : (
                    <>
                      {/* Fallback Google Pay */}
                      <button
                        type="button"
                        disabled={Boolean(busyMethod)}
                        onClick={() => void executeOnlinePayment("Google Pay", "upi", undefined, undefined, undefined, "com.google.android.apps.nbu.paisa.user")}
                        className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                            <span className="font-black text-xs tracking-tighter">
                              <span className="text-[#4285F4]">G</span>
                              <span className="text-[#EA4335]">P</span>
                              <span className="text-[#FBBC05]">a</span>
                              <span className="text-[#34A853]">y</span>
                            </span>
                          </div>
                          <div>
                            <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                              Google Pay (GPay)
                            </p>
                            <p className="text-[10.5px] font-medium text-zinc-400">Real Razorpay UPI</p>
                          </div>
                        </div>

                        {busyMethod === "Google Pay" ? (
                          <Loader2 className="size-4.5 animate-spin text-[#0c831f]" />
                        ) : (
                          <ChevronRight className="size-4 stroke-[2.5] text-zinc-400" />
                        )}
                      </button>

                      {/* Fallback PhonePe */}
                      <button
                        type="button"
                        disabled={Boolean(busyMethod)}
                        onClick={() => void executeOnlinePayment("PhonePe UPI", "upi", undefined, undefined, undefined, "com.phonepe.app")}
                        className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#5f259f] text-white shadow-2xs">
                            <span className="font-black text-sm">पे</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                                PhonePe UPI
                              </p>
                              <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 text-[9px] font-black text-emerald-700 uppercase">
                                Fastest
                              </span>
                            </div>
                            <p className="text-[10.5px] font-medium text-zinc-400">Real Razorpay UPI</p>
                          </div>
                        </div>

                        {busyMethod === "PhonePe UPI" ? (
                          <Loader2 className="size-4.5 animate-spin text-[#0c831f]" />
                        ) : (
                          <ChevronRight className="size-4 stroke-[2.5] text-zinc-400" />
                        )}
                      </button>

                      {/* Fallback Paytm */}
                      <button
                        type="button"
                        disabled={Boolean(busyMethod)}
                        onClick={() => void executeOnlinePayment("Paytm UPI", "upi", undefined, undefined, undefined, "net.one97.paytm")}
                        className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#00b9f5] text-white shadow-2xs font-black text-xs">
                            Paytm
                          </div>
                          <div>
                            <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                              Paytm UPI
                            </p>
                            <p className="text-[10.5px] font-medium text-zinc-400">Real Razorpay UPI</p>
                          </div>
                        </div>

                        {busyMethod === "Paytm UPI" ? (
                          <Loader2 className="size-4.5 animate-spin text-[#0c831f]" />
                        ) : (
                          <ChevronRight className="size-4 stroke-[2.5] text-zinc-400" />
                        )}
                      </button>
                    </>
                  )}

                  {/* Add new UPI ID / Google Pay / Paytm */}
                  <button
                    type="button"
                    disabled={Boolean(busyMethod)}
                    onClick={() => setCurrentView("upi_id")}
                    className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-200/80">
                        <span className="font-black text-sm text-zinc-700">@</span>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                          Add new UPI ID or Scan QR Code
                        </p>
                        <p className="text-[10.5px] font-medium text-zinc-400">Enter VPA handle or scan with secondary device</p>
                      </div>
                    </div>

                    <Plus className="size-4 stroke-[3] text-rose-500" />
                  </button>
                </div>
              </div>

              {/* GROUP 3: NET BANKING */}
              <div>
                <h3 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  Net Banking
                </h3>
                <div className="overflow-hidden rounded-2xl bg-white border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100">
                  <button
                    type="button"
                    disabled={Boolean(busyMethod)}
                    onClick={() => setCurrentView("netbanking")}
                    className="flex w-full items-center justify-between p-3.5 hover:bg-zinc-50 transition-colors text-left cursor-pointer active:bg-zinc-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-200/80">
                        <Building2 className="size-5 text-[#004c8f]" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] font-black text-zinc-900 leading-tight">
                          Net Banking (All Indian Banks)
                        </p>
                        <p className="text-[10.5px] font-medium text-zinc-400">
                          HDFC, ICICI, SBI, Axis, Kotak &amp; 50+ Banks
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="size-4 stroke-[2.5] text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* GROUP 4: WALLETS */}
              <div>
                <h3 className="px-1 mb-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  Wallets
                </h3>
                <div className="overflow-hidden rounded-2xl bg-white border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100">
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

                  <button
                    type="button"
                    disabled={Boolean(busyMethod)}
                    onClick={() => void executeOnlinePayment("Amazon Pay", "wallet", undefined, undefined, undefined, undefined, "amazonpay")}
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

                    {busyMethod === "Amazon Pay" ? (
                      <Loader2 className="size-4 animate-spin text-[#0c831f]" />
                    ) : (
                      <Plus className="size-4 stroke-[3] text-rose-500" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(busyMethod)}
                    onClick={() => void executeOnlinePayment("Mobikwik", "wallet", undefined, undefined, undefined, undefined, "mobikwik")}
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

              {/* GROUP 5: PAY ON DELIVERY */}
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
            </>
          )}
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
