import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Loader2,
  Lock,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Wallet as WalletIcon,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PaymentsSkeleton } from "@/components/account/AccountSkeletons";
import { BottomNav } from "@/components/home/BottomNav";
import { ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import {
  addPaymentMethod,
  fetchPaymentMethods,
  updatePaymentMethod,
  PAYMENT_KIND_LABEL,
  removePaymentMethod,
  setDefaultPaymentMethod,
  type PaymentKind,
  type PaymentMethod,
  type PaymentProvider,
} from "@/api/customer/payments-api";
import { fetchWallet, type Wallet } from "@/api/customer/wallet-api";
import { payWithRazorpay } from "@/api/payments/razorpay-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/payment-methods")({
  head: () => ({
    meta: [
      { title: "Payment Methods — QuickPress Secure Checkout" },
      {
        name: "description",
        content:
          "Manage QuickPress payment methods — UPI, debit and credit cards, wallet and cash on delivery. Set a default, add new options and pay securely.",
      },
      { property: "og:title", content: "Payment Methods — QuickPress" },
      {
        property: "og:description",
        content:
          "Add, remove and set default UPI, card, wallet and cash payment options for your QuickPress laundry orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentMethodsScreen,
});

const KIND_META: Record<PaymentKind, { icon: typeof CreditCard; tone: string; badge: string }> = {
  upi: { icon: Smartphone, tone: "bg-secondary/10 text-brand-green", badge: "Instant UPI" },
  "debit-card": { icon: CreditCard, tone: "bg-primary/15 text-brand-dark", badge: "Debit Card" },
  "credit-card": { icon: CreditCard, tone: "bg-primary/15 text-brand-dark", badge: "Credit Card" },
  wallet: { icon: WalletIcon, tone: "bg-secondary/10 text-brand-green", badge: "1-Click Wallet" },
  cod: { icon: Banknote, tone: "bg-muted text-muted-foreground", badge: "Pay on Delivery" },
  razorpay: { icon: CreditCard, tone: "bg-primary/15 text-brand-dark", badge: "Online Gateway" },
};

const UPI_POPULAR_HANDLES = [
  "@okhdfcbank",
  "@okicici",
  "@oksbi",
  "@okaxis",
  "@paytm",
  "@ybl",
  "@ibl",
  "@axl",
];

const POPULAR_BANKS = [
  { code: "HDFC", name: "HDFC Bank" },
  { code: "SBI", name: "State Bank of India" },
  { code: "ICICI", name: "ICICI Bank" },
  { code: "AXIS", name: "Axis Bank" },
  { code: "KOTAK", name: "Kotak Mahindra Bank" },
  { code: "PNB", name: "Punjab National Bank" },
];

function detectCardBrand(num: string): "visa" | "mastercard" | "rupay" | "amex" | "generic" {
  const clean = num.replace(/\D/g, "");
  if (clean.startsWith("4")) return "visa";
  if (/^5[1-5]|^2[2-7]/.test(clean)) return "mastercard";
  if (/^(508|60|65|81|82|356)/.test(clean)) return "rupay";
  if (/^3[47]/.test(clean)) return "amex";
  return "generic";
}

function formatCardNumber(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 16);
  const parts = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  return parts.join(" ");
}

function formatExpiry(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 4);
  if (clean.length >= 2) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`;
  }
  return clean;
}

function PaymentMethodsScreen() {
  useAuthGuard();
  const navigate = useNavigate();

  // State
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [topupAmount, setTopupAmount] = useState<number>(200);
  const [toppingUp, setToppingUp] = useState(false);

  // Sheet / Modal State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<PaymentKind>("upi");
  const [name, setName] = useState("");
  const [vpaId, setVpaId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [bankCode, setBankCode] = useState("HDFC");
  const [isDefaultCheckbox, setIsDefaultCheckbox] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Load Payment Methods & Wallet
  const loadData = async (force = false) => {
    try {
      const [methodsRes, walletRes] = await Promise.all([
        fetchPaymentMethods(),
        fetchWallet({ forceRefresh: force }).catch(() => null),
      ]);
      setMethods(methodsRes.methods);
      setProviders(methodsRes.providers);
      if (walletRes) setWallet(walletRes);
    } catch {
      setMethods([]);
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Quick Top-up Wallet via Real Razorpay Integration
  const handleQuickTopup = async (amount: number) => {
    setToppingUp(true);
    try {
      const outcome = await payWithRazorpay({
        amount,
        purpose: "QuickPress Wallet Recharge",
        description: `Add ₹${amount} to QuickPress Wallet`,
      });

      if (outcome.status === "paid") {
        toast.success(`🎉 ₹${amount} successfully added to QuickPress Wallet!`);
        void loadData(true);
      } else if (outcome.status === "failed") {
        toast.error(outcome.message || "Top-up payment failed. Please try again.");
      } else {
        toast.info("Top-up cancelled.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process top-up via payment gateway");
    } finally {
      setToppingUp(false);
    }
  };

  // Open Modal Helpers
  const openAdd = (defaultKind: PaymentKind = "upi") => {
    setEditingId(null);
    setKind(defaultKind);
    setName("");
    setVpaId("");
    setCardNumber("");
    setCardExpiry("");
    setCardholderName("");
    setBankCode("HDFC");
    setIsDefaultCheckbox(methods?.length === 0);
    setSheetOpen(true);
  };

  const openEdit = (method: PaymentMethod) => {
    setEditingId(method.id);
    setKind(method.kind);
    setName(method.name);
    if (method.kind === "upi") {
      setVpaId(method.masked);
    } else if (method.kind === "credit-card" || method.kind === "debit-card") {
      setCardNumber(method.masked);
      setCardholderName(method.name);
    }
    setIsDefaultCheckbox(method.isDefault);
    setSheetOpen(true);
  };

  // Save / Update Handler
  const handleSave = async () => {
    let finalName = name.trim();
    let finalMasked = "";

    if (kind === "upi") {
      if (!vpaId.trim()) {
        toast.error("Please enter a valid UPI ID (e.g., username@bank)");
        return;
      }
      if (!vpaId.includes("@") || vpaId.endsWith("@")) {
        toast.error("Invalid UPI format. Must contain '@' (e.g. mobile@paytm or name@oksbi)");
        return;
      }
      finalName = finalName || `UPI (${vpaId.split("@")[0]})`;
      finalMasked = vpaId.trim().toLowerCase();
    } else if (kind === "credit-card" || kind === "debit-card") {
      const cleanNum = cardNumber.replace(/\D/g, "");
      if (cleanNum.length < 12) {
        toast.error("Please enter a valid 16-digit card number");
        return;
      }
      const brand = detectCardBrand(cleanNum).toUpperCase();
      const last4 = cleanNum.slice(-4);
      finalName = finalName || cardholderName.trim() || `${brand} ${PAYMENT_KIND_LABEL[kind]}`;
      finalMasked = `•••• •••• •••• ${last4}`;
    } else if (kind === "cod") {
      finalName = "Cash on Delivery";
      finalMasked = "Pay cash or scan QR at doorstep";
    } else {
      finalName = finalName || PAYMENT_KIND_LABEL[kind];
      finalMasked = bankCode ? `${bankCode} NetBanking` : "Online Banking";
    }

    setSaving(true);
    try {
      if (editingId) {
        await updatePaymentMethod(editingId, {
          kind,
          name: finalName,
          masked: finalMasked,
        });
        setMethods((prev) =>
          prev
            ? prev.map((item) =>
                item.id === editingId
                  ? { ...item, kind, name: finalName, masked: finalMasked }
                  : item
              )
            : prev
        );
        toast.success("Payment method updated");
      } else {
        const created = await addPaymentMethod({
          kind,
          name: finalName,
          masked: finalMasked,
          isDefault: isDefaultCheckbox,
        });
        setMethods((prev) => (prev ? [...prev, created] : [created]));
        toast.success("Payment method saved securely!");
      }
      setSheetOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  // Remove Method
  const handleRemove = async (id: string) => {
    setBusyId(id);
    try {
      await removePaymentMethod(id);
      setMethods((prev) => (prev ? prev.filter((item) => item.id !== id) : prev));
      toast.success("Payment method removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove payment method");
    } finally {
      setBusyId(null);
    }
  };

  // Set Default Method
  const handleDefault = async (id: string) => {
    setBusyId(id);
    try {
      await setDefaultPaymentMethod(id);
      setMethods((prev) =>
        prev ? prev.map((item) => ({ ...item, isDefault: item.id === id })) : prev
      );
      toast.success("Default payment method updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to set default payment method");
    } finally {
      setBusyId(null);
    }
  };


  const cardBrand = detectCardBrand(cardNumber);

  return (
    <main className="relative min-h-screen overflow-x-hidden scroll-smooth bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar
          title="Payment Methods"
          action={
            <button
              type="button"
              aria-label="Add payment method"
              onClick={() => openAdd("upi")}
              className="flex size-10 items-center justify-center rounded-2xl bg-brand-green text-white shadow-cta transition-transform hover:bg-brand-green-dark hover:scale-[1.03] active:scale-[0.94] cursor-pointer"
            >
              <Plus className="size-5" />
            </button>
          }
        />

        {!methods ? (
          <PaymentsSkeleton />
        ) : (
          <div className="px-5 pb-32 pt-4 space-y-6">
            {/* 1. QuickPress Wallet Hero Card */}
            <section className="relative overflow-hidden rounded-[2rem] border border-brand-green/25 bg-gradient-to-br from-brand-green/[0.12] via-card to-card p-5 shadow-soft dark:border-brand-green/20 dark:from-brand-green/[0.15]">
              <div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-brand-green/15 blur-2xl" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-green text-white shadow-xs">
                    <WalletIcon className="size-5" />
                  </span>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-brand-green">
                      QuickPress Wallet
                    </span>
                    <p className="text-xs text-muted-foreground font-medium">
                      Zero fee · Instant 1-click checkout
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate({ to: "/wallet" })}
                  className="flex items-center gap-1 text-[11px] font-black text-brand-green hover:underline cursor-pointer"
                >
                  <span>Ledger</span>
                  <ArrowRight className="size-3" />
                </button>
              </div>

              {/* Balance & Quick Topup */}
              <div className="relative mt-4 flex items-baseline justify-between border-t border-border/70 pt-3.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Available Balance
                  </p>
                  <p className="text-2xl font-black tracking-tight text-foreground">
                    {loadingWallet ? (
                      <Loader2 className="size-6 animate-spin text-brand-green" />
                    ) : (
                      `₹${(wallet?.balances?.currentBalance ?? wallet?.totalBalance ?? 0).toLocaleString("en-IN")}`
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={toppingUp}
                  onClick={() => void handleQuickTopup(topupAmount)}
                  className="ripple flex h-10 items-center gap-1.5 rounded-2xl bg-brand-green px-4 text-xs font-black text-white shadow-cta transition-all hover:bg-brand-green-dark hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {toppingUp ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  <span>Recharge +₹{topupAmount}</span>
                </button>
              </div>

              {/* Top-up Amount Selector Chips */}
              <div className="relative mt-3 grid grid-cols-4 gap-1.5">
                {[100, 200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopupAmount(amt)}
                    className={`h-8 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      topupAmount === amt
                        ? "bg-brand-green text-white shadow-xs font-black"
                        : "bg-muted/80 text-foreground hover:bg-muted"
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </section>

            {/* 2. Saved Payment Methods */}
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black tracking-tight text-foreground">
                  Saved Payment Methods
                </h2>
                <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-[10px] font-black text-brand-green">
                  {methods.length} Active
                </span>
              </div>

              {methods.length === 0 ? (
                <div className="mt-3 card-soft border border-dashed border-border p-6 text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <CreditCard className="size-6" />
                  </span>
                  <p className="mt-3 text-sm font-black text-foreground">No payment method added yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add UPI ID, Debit/Credit Card or set Cash on Delivery as your default method.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAdd("upi")}
                    className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-2xl bg-brand-green px-5 text-xs font-black text-white shadow-cta hover:bg-brand-green-dark cursor-pointer"
                  >
                    <Plus className="size-4" /> Add Payment Method
                  </button>
                </div>
              ) : (
                <div className="stagger-children mt-3 space-y-3">
                  {methods.map((method) => {
                    const meta = KIND_META[method.kind] || KIND_META.upi;
                    const Icon = meta.icon;

                    return (
                      <article
                        key={method.id}
                        className={`relative card-soft overflow-hidden border p-4 transition-all duration-300 ${
                          method.isDefault
                            ? "border-brand-green/40 bg-gradient-to-br from-brand-green/[0.04] via-card to-card shadow-soft"
                            : "border-border hover:border-brand-green/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}
                          >
                            <Icon className="size-5" />
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-black tracking-tight text-foreground">
                                {method.name}
                              </h3>
                              {method.isDefault ? (
                                <span className="animate-pop rounded-full bg-secondary/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-green">
                                  ✓ Default
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 font-mono text-xs font-semibold tracking-wide text-muted-foreground">
                              {method.masked || PAYMENT_KIND_LABEL[method.kind]}
                            </p>

                            <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
                              <span className="rounded-md bg-muted px-1.5 py-0.5">
                                {meta.badge}
                              </span>
                              <span>· 256-bit Secure</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex items-center gap-2 border-t border-dashed border-border/70 pt-3">
                          <button
                            type="button"
                            onClick={() => openEdit(method)}
                            className="ripple flex h-9 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-muted text-[11px] font-bold text-foreground transition-all hover:bg-accent active:scale-[0.96] cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={busyId === method.id || method.isDefault}
                            onClick={() => void handleDefault(method.id)}
                            className={`ripple flex h-9 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[11px] font-bold transition-all active:scale-[0.96] disabled:opacity-60 cursor-pointer ${
                              method.isDefault
                                ? "bg-secondary/15 text-brand-green font-black"
                                : "bg-primary/15 text-foreground hover:bg-primary/25"
                            }`}
                          >
                            {busyId === method.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Star className="size-3.5" />
                            )}
                            {method.isDefault ? "Default Active" : "Set as Default"}
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${method.name}`}
                            disabled={busyId === method.id}
                            onClick={() => void handleRemove(method.id)}
                            className="ripple flex size-9 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive transition-all hover:bg-destructive/20 active:scale-[0.94] disabled:opacity-45 cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. Add New Rails Selector Grid */}
            <section>
              <h2 className="text-sm font-black tracking-tight text-foreground">
                Add &amp; Link Payment Rail
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Link your preferred method for ultra-fast seamless checkout
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => openAdd("upi")}
                  className="card-soft ripple flex items-center gap-3 border border-border p-3.5 text-left transition-all hover:border-brand-green/50 active:scale-[0.97] cursor-pointer"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-brand-green">
                    <Smartphone className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-black text-foreground">
                      UPI / GPay
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      PhonePe / Paytm / BHIM
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openAdd("credit-card")}
                  className="card-soft ripple flex items-center gap-3 border border-border p-3.5 text-left transition-all hover:border-brand-green/50 active:scale-[0.97] cursor-pointer"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                    <CreditCard className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-black text-foreground">
                      Cards
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      Visa / Master / RuPay
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openAdd("cod")}
                  className="card-soft ripple flex items-center gap-3 border border-border p-3.5 text-left transition-all hover:border-brand-green/50 active:scale-[0.97] cursor-pointer"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <Banknote className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-black text-foreground">
                      Pay on Delivery
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      Cash or QR scan
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openAdd("razorpay")}
                  className="card-soft ripple flex items-center gap-3 border border-border p-3.5 text-left transition-all hover:border-brand-green/50 active:scale-[0.97] cursor-pointer"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
                    <Zap className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-black text-foreground">
                      NetBanking
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      50+ Indian Banks
                    </span>
                  </div>
                </button>
              </div>
            </section>


            {/* 5. Security & Trust Guarantee */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-brand-dark to-brand-green p-5 shadow-soft">
              <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-primary/25 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-background/15 text-background">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-black tracking-tight text-background">
                    100% Bank-Grade Security
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-background/75">
                    All cards are tokenised in strict compliance with RBI directives. QuickPress never stores complete card numbers or UPI PINs.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-background/90">
                    <span className="rounded-md bg-white/10 px-2 py-0.5">🔒 256-bit SSL</span>
                    <span className="rounded-md bg-white/10 px-2 py-0.5">🛡️ PCI-DSS Level 1</span>
                    <span className="rounded-md bg-white/10 px-2 py-0.5">⚡ Instant Refunds</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Add / Edit Payment Sheet Modal */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSheetOpen(false)}
            className="animate-overlay-in absolute inset-0 bg-brand-dark/50 backdrop-blur-sm"
          />
          <div className="animate-sheet-up relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-4xl bg-card px-5 pb-10 pt-4 shadow-soft">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-border" />
            
            <div className="mt-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black tracking-tight text-foreground">
                  {editingId ? "Edit Payment Method" : "Add Payment Method"}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Select rail and enter your details
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSheetOpen(false)}
                className="flex size-9 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors hover:bg-accent cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Kind Selector Pills */}
            <div className="mt-4">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Payment Category
              </span>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {(["upi", "credit-card", "debit-card", "cod"] as PaymentKind[]).map((item) => {
                  const meta = KIND_META[item];
                  const Icon = meta.icon;
                  const active = kind === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setKind(item)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center text-[10px] font-bold transition-all active:scale-[0.96] cursor-pointer ${
                        active
                          ? "border-brand-green bg-secondary/15 text-brand-green font-black"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="truncate w-full">{PAYMENT_KIND_LABEL[item].split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Fields by Category */}
            <div className="mt-4 space-y-3.5">
              {kind === "upi" ? (
                <>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      UPI ID / VPA
                    </span>
                    <input
                      value={vpaId}
                      placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                      onChange={(e) => setVpaId(e.target.value)}
                      className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand-green"
                    />
                  </label>

                  {/* Popular UPI Handles */}
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      Quick Handle Suggestions:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {UPI_POPULAR_HANDLES.map((handle) => (
                        <button
                          key={handle}
                          type="button"
                          onClick={() => {
                            const prefix = vpaId.includes("@") ? vpaId.split("@")[0] : vpaId;
                            setVpaId((prefix || "user") + handle);
                          }}
                          className="rounded-xl border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-bold text-foreground hover:border-brand-green hover:bg-secondary/10 hover:text-brand-green transition-colors cursor-pointer"
                        >
                          {handle}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Nickname (Optional)
                    </span>
                    <input
                      value={name}
                      placeholder="My GPay or Primary UPI"
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand-green"
                    />
                  </label>
                </>
              ) : kind === "credit-card" || kind === "debit-card" ? (
                <>
                  <label className="block">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        Card Number
                      </span>
                      {cardBrand !== "generic" ? (
                        <span className="rounded-md bg-secondary/15 px-2 py-0.5 text-[9px] font-black uppercase text-brand-green">
                          {cardBrand}
                        </span>
                      ) : null}
                    </div>
                    <input
                      value={cardNumber}
                      maxLength={19}
                      placeholder="4532 •••• •••• 8821"
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-background px-4 font-mono text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand-green"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        Expiry (MM/YY)
                      </span>
                      <input
                        value={cardExpiry}
                        maxLength={5}
                        placeholder="12/28"
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-background px-4 font-mono text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand-green"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        Card Type
                      </span>
                      <select
                        value={kind}
                        onChange={(e) => setKind(e.target.value as PaymentKind)}
                        className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:border-brand-green"
                      >
                        <option value="credit-card">Credit Card</option>
                        <option value="debit-card">Debit Card</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      Cardholder Name
                    </span>
                    <input
                      value={cardholderName}
                      placeholder="Name printed on card"
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand-green"
                    />
                  </label>
                </>
              ) : (
                <div className="card-soft border border-border p-4 text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary/15 text-brand-green">
                    <Banknote className="size-6" />
                  </span>
                  <p className="mt-2 text-sm font-black text-foreground">Cash on Delivery (Doorstep QR)</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pay our delivery captain at your doorstep using cash or dynamic UPI QR scan.
                  </p>
                </div>
              )}

              {/* Set Default Option */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefaultCheckbox}
                  onChange={(e) => setIsDefaultCheckbox(e.target.checked)}
                  className="size-4 rounded-md text-brand-green focus:ring-brand-green"
                />
                <span className="text-xs font-bold text-foreground">
                  Set as default payment method for 1-click orders
                </span>
              </label>

              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Lock className="size-3 text-brand-green shrink-0" />
                RBI Compliant Tokenisation · End-to-end Encrypted
              </p>
            </div>

            {/* Submit Button */}
            <div className="sticky bottom-0 -mx-5 -mb-10 mt-6 bg-card/95 px-5 pb-8 pt-3 backdrop-blur-md">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="ripple flex h-13 w-full items-center justify-center gap-2 rounded-3xl bg-brand-green py-4 text-sm font-black text-white shadow-cta transition-transform hover:bg-brand-green-dark hover:scale-[1.01] active:scale-[0.97] disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Payment Method
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav active="payments" />
      <Toaster />
    </main>
  );
}
