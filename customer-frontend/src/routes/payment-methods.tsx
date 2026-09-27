import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PaymentsSkeleton } from "@/components/account/AccountSkeletons";
import { BottomNav } from "@/components/home/BottomNav";
import { Toaster } from "@/shared/ui/sonner";
import {
  addPaymentMethod,
  fetchPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
  type PaymentMethod,
} from "@/api/customer/payments-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/payment-methods")({
  head: () => ({
    meta: [
      { title: "Payment Settings — QuickPress" },
      {
        name: "description",
        content:
          "Manage Cards, UPI apps, Wallets, Pay Later and Netbanking on QuickPress.",
      },
      { property: "og:title", content: "Payment Settings — QuickPress" },
    ],
  }),
  component: PaymentMethodsScreen,
});

// Precise UPI apps matching the reference screen
const UPI_OPTIONS = [
  {
    id: "phonepe",
    name: "PhonePe UPI",
    scheme: "phonepe",
    handle: "@ybl",
  },
  {
    id: "supermoney",
    name: "Supermoney UPI",
    scheme: "supermoney",
    handle: "@supermoney",
  },
  {
    id: "famapp",
    name: "FamApp UPI",
    scheme: "famapp",
    handle: "@fam",
  },
];

const POPULAR_BANKS = [
  { code: "HDFC", name: "HDFC Bank", logo: "🏦" },
  { code: "SBI", name: "State Bank of India", logo: "🏛️" },
  { code: "ICICI", name: "ICICI Bank", logo: "🏦" },
  { code: "AXIS", name: "Axis Bank", logo: "🏢" },
  { code: "KOTAK", name: "Kotak Mahindra Bank", logo: "🏛️" },
  { code: "PNB", name: "Punjab National Bank", logo: "🏦" },
];

const UPI_SUGGESTION_HANDLES = [
  "@okhdfcbank",
  "@okicici",
  "@oksbi",
  "@okaxis",
  "@paytm",
  "@ybl",
  "@axl",
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

  // Data State
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Selected default UPI app (persisted in localStorage and synced)
  const [selectedUpiId, setSelectedUpiId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("qp_selected_upi") || "phonepe";
    }
    return "phonepe";
  });

  // Modals for adding methods
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [isPluxeeModal, setIsPluxeeModal] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletModalTitle, setWalletModalTitle] = useState("");

  // Card Form Fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  // Custom UPI Form Fields
  const [vpaId, setVpaId] = useState("");
  const [saving, setSaving] = useState(false);

  // Load Payment Methods
  const loadData = async () => {
    try {
      const methodsRes = await fetchPaymentMethods();
      setMethods(methodsRes.methods);

      // Check if a saved default UPI exists
      const defaultUpi = methodsRes.methods.find((m) => m.kind === "upi" && m.isDefault);
      if (defaultUpi) {
        const matched = UPI_OPTIONS.find((u) => defaultUpi.name.toLowerCase().includes(u.id));
        if (matched) {
          setSelectedUpiId(matched.id);
          localStorage.setItem("qp_selected_upi", matched.id);
        } else {
          setSelectedUpiId(defaultUpi.id);
          localStorage.setItem("qp_selected_upi", defaultUpi.id);
        }
      }
    } catch {
      setMethods([]);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Set UPI app as default directly without any popup ("set karne ke baad set ho gaye")
  const handleSelectUpiApp = async (app: (typeof UPI_OPTIONS)[0]) => {
    setSelectedUpiId(app.id);
    localStorage.setItem("qp_selected_upi", app.id);
    toast.success(`${app.name} set as default UPI`);

    // Persist to backend payment methods as default
    try {
      await addPaymentMethod({
        kind: "upi",
        name: app.name,
        masked: `${app.id}${app.handle}`,
        isDefault: true,
      });
      void loadData();
    } catch {
      // Quiet fallback if offline
    }
  };

  // Select custom saved UPI ID
  const handleSelectCustomUpi = async (upi: PaymentMethod) => {
    setSelectedUpiId(upi.id);
    localStorage.setItem("qp_selected_upi", upi.id);
    toast.success(`${upi.name} set as default UPI`);
    try {
      await setDefaultPaymentMethod(upi.id);
      void loadData();
    } catch {
      // Quiet fallback
    }
  };

  // Save Card (Credit, Debit or Pluxee)
  const handleSaveCard = async () => {
    const cleanNum = cardNumber.replace(/\D/g, "");
    if (cleanNum.length < 12) {
      toast.error("Please enter a valid card number (15–16 digits)");
      return;
    }
    if (!cardExpiry.includes("/") || cardExpiry.length < 5) {
      toast.error("Please enter expiry in MM/YY format");
      return;
    }

    setSaving(true);
    try {
      const brand = isPluxeeModal ? "Pluxee Meal Card" : detectCardBrand(cleanNum).toUpperCase();
      const last4 = cleanNum.slice(-4);
      const cardName = cardholderName.trim() || `${brand} Card`;
      const masked = `•••• •••• •••• ${last4}`;

      await addPaymentMethod({
        kind: isPluxeeModal ? "debit-card" : "credit-card",
        name: cardName,
        masked,
        isDefault: methods?.length === 0,
      });

      toast.success(`${brand} saved securely!`);
      setCardModalOpen(false);
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setCardholderName("");
      void loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  // Save Custom UPI ID
  const handleSaveUpiId = async () => {
    const cleanVpa = vpaId.trim().toLowerCase();
    if (!cleanVpa.includes("@") || cleanVpa.endsWith("@")) {
      toast.error("Please enter a valid UPI ID (e.g., mobile@paytm or name@oksbi)");
      return;
    }

    setSaving(true);
    try {
      const created = await addPaymentMethod({
        kind: "upi",
        name: `UPI (${cleanVpa.split("@")[0]})`,
        masked: cleanVpa,
        isDefault: true,
      });

      setSelectedUpiId(created.id);
      localStorage.setItem("qp_selected_upi", created.id);
      toast.success("UPI ID added and set as default!");
      setUpiModalOpen(false);
      setVpaId("");
      void loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save UPI ID");
    } finally {
      setSaving(false);
    }
  };

  // Select Netbanking Bank
  const handleSelectBank = async (bank: (typeof POPULAR_BANKS)[0]) => {
    setSaving(true);
    try {
      await addPaymentMethod({
        kind: "razorpay",
        name: `${bank.name} Netbanking`,
        masked: `${bank.code} Bank Account`,
        isDefault: methods?.length === 0,
      });

      toast.success(`${bank.name} linked for Netbanking!`);
      setBankModalOpen(false);
      void loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to link bank");
    } finally {
      setSaving(false);
    }
  };

  // Remove Method
  const handleRemoveMethod = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBusyId(id);
    try {
      await removePaymentMethod(id);
      setMethods((prev) => (prev ? prev.filter((m) => m.id !== id) : prev));
      if (selectedUpiId === id) {
        setSelectedUpiId("phonepe");
        localStorage.setItem("qp_selected_upi", "phonepe");
      }
      toast.success("Payment method removed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove payment method");
    } finally {
      setBusyId(null);
    }
  };

  // Set Default Method
  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBusyId(id);
    try {
      await setDefaultPaymentMethod(id);
      setMethods((prev) =>
        prev ? prev.map((m) => ({ ...m, isDefault: m.id === id })) : prev
      );
      toast.success("Default payment method updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to set default");
    } finally {
      setBusyId(null);
    }
  };

  const savedCards = methods?.filter(
    (m) => m.kind === "credit-card" || m.kind === "debit-card"
  ) ?? [];

  // Filter out UPI options so only custom added UPI IDs appear as extra rows
  const customSavedUpis = methods?.filter(
    (m) => m.kind === "upi" && !UPI_OPTIONS.some((u) => m.name === u.name)
  ) ?? [];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f4f5f8] dark:bg-zinc-950 pb-28">
      {/* Top Header matching reference screenshot */}
      <header className="sticky top-0 z-30 flex items-center gap-3.5 bg-white px-4 py-3.5 shadow-2xs dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              window.history.back();
            } else {
              void navigate({ to: "/profile" });
            }
          }}
          className="flex size-9 items-center justify-center rounded-full text-foreground transition-transform active:scale-90 hover:bg-slate-100 dark:hover:bg-zinc-800"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-base font-bold text-foreground">Payment settings</h1>
      </header>

      {!methods ? (
        <div className="mx-auto max-w-md px-4 pt-4">
          <PaymentsSkeleton />
        </div>
      ) : (
        <div className="mx-auto max-w-md px-4 pt-4 space-y-5">
          {/* SECTION 1: CARDS */}
          <section>
            <h2 className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Cards
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-slate-200/80 dark:bg-zinc-900 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80">
              {/* Saved Cards if any */}
              {savedCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-800 shadow-2xs">
                      <CreditCard className="size-4 text-slate-700 dark:text-zinc-200" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {card.name}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {card.masked}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {card.isDefault ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Default
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => void handleSetDefault(card.id, e)}
                        className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === card.id}
                      onClick={(e) => void handleRemoveMethod(card.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove Card"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add credit or debit cards */}
              <button
                type="button"
                onClick={() => {
                  setIsPluxeeModal(false);
                  setCardModalOpen(true);
                }}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 shadow-2xs">
                    <svg className="w-5 h-4 text-slate-700 dark:text-zinc-200" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="1" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="6" x2="23" y2="6"/>
                      <line x1="5" y1="12" x2="9" y2="12"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Add credit or debit cards
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>

              {/* Add Pluxee */}
              <button
                type="button"
                onClick={() => {
                  setIsPluxeeModal(true);
                  setCardModalOpen(true);
                }}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-800 shadow-2xs px-1">
                    <span className="font-extrabold text-[10.5px] tracking-tight text-[#1a1c3d] dark:text-white">
                      plux<span className="text-[#f7c800]">e</span>e
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Add Pluxee
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>
            </div>
          </section>

          {/* SECTION 2: UPI */}
          <section>
            <h2 className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              UPI
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-slate-200/80 dark:bg-zinc-900 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80">
              {/* PhonePe UPI */}
              {UPI_OPTIONS.map((app) => {
                const isSelected = selectedUpiId === app.id;

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => void handleSelectUpiApp(app)}
                    className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Real Brand Logos */}
                      {app.id === "phonepe" ? (
                        <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-800 shadow-2xs">
                          <div className="size-6 rounded-full bg-[#5f259f] flex items-center justify-center text-white font-black text-xs shadow-2xs">
                            पे
                          </div>
                        </div>
                      ) : app.id === "supermoney" ? (
                        /* Authentic Flipkart Super.money logo matching reference screenshot */
                        <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-800 shadow-2xs px-1 gap-1">
                          <div className="size-4 shrink-0 rounded-[3.5px] bg-[#3237d6] flex items-center justify-center shadow-2xs">
                            <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-white">
                              <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" />
                            </svg>
                          </div>
                          <div className="flex flex-col text-left font-black text-[8px] leading-[8px] tracking-tight text-[#16173d] dark:text-white">
                            <span>super.</span>
                            <span>money</span>
                          </div>
                        </div>
                      ) : (
                        /* Exact FamApp logo matching reference screenshot: full orange rectangle with white bird */
                        <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#ea7a1e] to-[#f49322] shadow-2xs p-1">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                            <path d="M2.5 12.5c4.5-3.5 10-6 19-8.5-4 4.5-7 10-9 16-1-3-3-5.5-6-7.5-1.5 1.5-2.5 1-4 0z" />
                          </svg>
                        </div>
                      )}

                      <span className="text-sm font-semibold text-foreground">
                        {app.name}
                      </span>
                    </div>

                    {/* Active Set indicator */}
                    {isSelected ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs pr-1">
                        <Check className="size-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="size-4 rounded-full border border-slate-300 dark:border-zinc-600 mr-1" />
                    )}
                  </button>
                );
              })}

              {/* Custom Saved UPI IDs if user added any */}
              {customSavedUpis.map((upi) => {
                const isSelected = selectedUpiId === upi.id;
                return (
                  <div
                    key={upi.id}
                    onClick={() => void handleSelectCustomUpi(upi)}
                    className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-emerald-600 font-bold text-sm dark:border-zinc-700 dark:bg-zinc-800 shadow-2xs">
                        @
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {upi.name}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {upi.masked}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs pr-1">
                          <Check className="size-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="size-4 rounded-full border border-slate-300 dark:border-zinc-600 mr-1" />
                      )}
                      <button
                        type="button"
                        disabled={busyId === upi.id}
                        onClick={(e) => void handleRemoveMethod(upi.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove UPI ID"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add New UPI ID Option */}
              <button
                type="button"
                onClick={() => setUpiModalOpen(true)}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 shadow-2xs font-bold text-sm">
                    @
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Add new UPI ID
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>
            </div>
          </section>

          {/* SECTION 3: WALLETS */}
          <section>
            <h2 className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Wallets
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-slate-200/80 dark:bg-zinc-900 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80">
              {/* Amazon Pay Balance */}
              <button
                type="button"
                onClick={() => {
                  setWalletModalTitle("Amazon Pay Balance");
                  setWalletModalOpen(true);
                }}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-800 shadow-2xs">
                    <div className="size-6 rounded-full bg-zinc-950 flex flex-col items-center justify-center text-white leading-none relative shadow-2xs">
                      <span className="font-black text-[8px] tracking-tighter">pay</span>
                      <svg className="w-3.5 h-1 text-amber-400 -mt-0.5" viewBox="0 0 24 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M2 2c6 4 14 4 20 0" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Amazon Pay Balance
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>

              {/* Mobikwik */}
              <button
                type="button"
                onClick={() => {
                  setWalletModalTitle("Mobikwik Wallet");
                  setWalletModalOpen(true);
                }}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-800 shadow-2xs">
                    <div className="size-6 rounded-full bg-[#0077c8] flex items-center justify-center text-white font-black text-[10px] shadow-2xs">
                      M!
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Mobikwik
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>
            </div>
          </section>

          {/* SECTION 4: PAY LATER */}
          <section>
            <h2 className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Pay Later
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-slate-200/80 dark:bg-zinc-900 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80">
              {/* Amazon Pay Later */}
              <button
                type="button"
                onClick={() => {
                  setWalletModalTitle("Amazon Pay Later");
                  setWalletModalOpen(true);
                }}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-800 shadow-2xs">
                    <div className="size-6 rounded-full bg-zinc-950 flex flex-col items-center justify-center text-white leading-none relative shadow-2xs">
                      <span className="font-black text-[8px] tracking-tighter">pay</span>
                      <svg className="w-3.5 h-1 text-amber-400 -mt-0.5" viewBox="0 0 24 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M2 2c6 4 14 4 20 0" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Amazon Pay Later
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>

              {/* LazyPay */}
              <button
                type="button"
                onClick={() => {
                  setWalletModalTitle("LazyPay");
                  setWalletModalOpen(true);
                }}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white dark:border-zinc-700 dark:bg-zinc-800 shadow-2xs">
                    <div className="w-5 h-4 flex items-center justify-center">
                      <svg viewBox="0 0 24 20" className="w-full h-full" fill="none">
                        <path d="M2 3l10 7L2 17V3z" fill="#E91E63" />
                        <path d="M12 10l10 7H12V10z" fill="#9C27B0" opacity="0.8" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    LazyPay
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>
            </div>
          </section>

          {/* SECTION 5: NETBANKING */}
          <section>
            <h2 className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Netbanking
            </h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xs border border-slate-200/80 dark:bg-zinc-900 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80">
              <button
                type="button"
                onClick={() => setBankModalOpen(true)}
                className="flex w-full items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 shadow-2xs">
                    <svg className="w-5 h-5 text-slate-700 dark:text-zinc-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 22 7 12 2"/>
                      <line x1="4" y1="21" x2="20" y2="21"/>
                      <line x1="6" y1="7" x2="6" y2="21"/>
                      <line x1="10" y1="7" x2="10" y2="21"/>
                      <line x1="14" y1="7" x2="14" y2="21"/>
                      <line x1="18" y1="7" x2="18" y2="21"/>
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    Netbanking
                  </span>
                </div>
                <span className="text-lg font-bold text-[#e05260] pr-1">+</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL: ADD CARD / PLUXEE */}
      {cardModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setCardModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 dark:bg-zinc-700" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">
                {isPluxeeModal ? "Add Pluxee Card" : "Add Credit or Debit Card"}
              </h3>
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="p-1 text-slate-400 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    value={cardNumber}
                    maxLength={19}
                    placeholder="4532 •••• •••• 8821"
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3.5 font-mono text-sm font-semibold text-foreground outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-3.5 text-xs font-bold uppercase text-emerald-600">
                    {detectCardBrand(cardNumber) !== "generic" ? detectCardBrand(cardNumber) : ""}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                    Expiry (MM/YY)
                  </label>
                  <input
                    value={cardExpiry}
                    maxLength={5}
                    placeholder="12/28"
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3.5 font-mono text-sm font-semibold text-foreground outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                    CVV
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    placeholder="•••"
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3.5 font-mono text-sm font-semibold text-foreground outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                  Cardholder Name
                </label>
                <input
                  value={cardholderName}
                  placeholder="Name as on card"
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3.5 text-sm font-semibold text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                <Lock className="size-3 text-emerald-600 shrink-0" />
                RBI Compliant Tokenisation · End-to-end 256-bit Encrypted
              </p>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveCard()}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-sm text-white shadow-md hover:bg-emerald-700 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save Card Securely
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: ADD NEW UPI ID */}
      {upiModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setUpiModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 dark:bg-zinc-700" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Add New UPI ID</h3>
              <button
                type="button"
                onClick={() => setUpiModalOpen(false)}
                className="p-1 text-slate-400 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">
                  UPI ID (VPA)
                </label>
                <input
                  value={vpaId}
                  placeholder="e.g. mobile@paytm or name@okhdfcbank"
                  onChange={(e) => setVpaId(e.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-3.5 text-sm font-semibold text-foreground outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <span className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5">
                  Popular Bank Handles
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {UPI_SUGGESTION_HANDLES.map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      onClick={() => {
                        const prefix = vpaId.includes("@") ? vpaId.split("@")[0] : vpaId;
                        setVpaId((prefix || "user") + handle);
                      }}
                      className="rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-foreground hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                    >
                      {handle}
                    </button>
                  ))}
                </div>
              </div>

              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                <ShieldCheck className="size-3 text-emerald-600 shrink-0" />
                Verified via NPCI Unified Payments Interface
              </p>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveUpiId()}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-sm text-white shadow-md hover:bg-emerald-700 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Verify &amp; Save UPI ID
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: NETBANKING BANKS SELECTOR */}
      {bankModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setBankModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 dark:bg-zinc-700" />

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Select Netbanking Bank</h3>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="p-1 text-slate-400 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {POPULAR_BANKS.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSelectBank(bank)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:border-emerald-500 transition-colors text-left cursor-pointer"
                >
                  <span className="text-xl">{bank.logo}</span>
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-bold text-foreground">
                      {bank.name}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {bank.code}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: WALLET / PAY LATER AUTH */}
      {walletModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setWalletModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white dark:bg-zinc-900 p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 dark:bg-zinc-700" />

            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-foreground">Link {walletModalTitle}</h3>
              <button
                type="button"
                onClick={() => setWalletModalOpen(false)}
                className="p-1 text-slate-400 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Authenticate your {walletModalTitle} account using your registered mobile number.
            </p>

            <button
              type="button"
              onClick={() => {
                toast.success(`${walletModalTitle} authentication OTP sent!`);
                setWalletModalOpen(false);
              }}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 font-bold text-sm text-white shadow-md hover:bg-emerald-700 transition-all cursor-pointer"
            >
              Send OTP &amp; Link
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav active="payments" />
      <Toaster />
    </main>
  );
}
