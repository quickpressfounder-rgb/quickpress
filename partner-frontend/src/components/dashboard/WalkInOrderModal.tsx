import React, { useState } from "react";
import {
  X,
  Plus,
  Minus,
  Sparkles,
  ShoppingBag,
  IndianRupee,
  Phone,
  User,
  Printer,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import type { ManagedOrder } from "../../data/partner-orders-mock";
import { inr } from "../../lib/currency";

interface WalkInOrderModalProps {
  onClose: () => void;
  onOrderCreated: (order: ManagedOrder) => void;
}

const COMMON_GARMENTS = [
  { id: "shirt", name: "Shirt / T-Shirt", price: 30, icon: "👕" },
  { id: "trouser", name: "Trouser / Jeans", price: 40, icon: "👖" },
  { id: "suit", name: "Blazer / 2pc Suit", price: 250, icon: "🧥" },
  { id: "saree", name: "Silk Saree / Lehenga", price: 180, icon: "🥻" },
  { id: "kurta", name: "Kurta / Pyjama", price: 50, icon: "👔" },
  { id: "bedsheet", name: "Bedsheet / Blanket", price: 120, icon: "🛏️" },
];

const SERVICE_TIERS = [
  { id: "wash_iron", label: "Wash & Steam Iron", mult: 1.0 },
  { id: "dry_clean", label: "Premium Dry Clean", mult: 1.8 },
  { id: "steam_iron", label: "Only Steam Press", mult: 0.6 },
  { id: "wash_fold", label: "Wash & Fold (Daily)", mult: 0.8 },
];

export function WalkInOrderModal({ onClose, onOrderCreated }: WalkInOrderModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedService, setSelectedService] = useState("wash_iron");
  const [quantities, setQuantities] = useState<Record<string, number>>({
    shirt: 2,
    trouser: 1,
  });
  const [paymentMode, setPaymentMode] = useState<"cash" | "upi" | "unpaid">("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQtyChange = (id: string, delta: number) => {
    setQuantities((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  const currentMult = SERVICE_TIERS.find((s) => s.id === selectedService)?.mult || 1.0;

  const totalGarments = Object.values(quantities).reduce((a, b) => a + b, 0);

  const computedTotal = Math.round(
    COMMON_GARMENTS.reduce((sum, item) => {
      const qty = quantities[item.id] || 0;
      return sum + qty * item.price * currentMult;
    }, 0)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    if (customerPhone.trim().length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (totalGarments === 0) {
      toast.error("Please add at least 1 garment to the order");
      return;
    }

    setIsSubmitting(true);
    const orderCode = `WALK-${Math.floor(1000 + Math.random() * 9000)}`;
    const tagCode = `TAG-${Math.floor(100 + Math.random() * 900)}`;

    const itemsSummary = COMMON_GARMENTS.filter((g) => (quantities[g.id] || 0) > 0)
      .map((g) => `${quantities[g.id]}x ${g.name}`)
      .join(", ");

    const newOrder: ManagedOrder = {
      id: `walkin_${Date.now()}`,
      code: orderCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: "Counter Walk-In (Store Self Pickup)",
      itemsSummary: itemsSummary || `${totalGarments} Garments`,
      stage: "accepted",
      paymentStatus: paymentMode === "unpaid" ? "pending" : "completed",
      paymentMode: paymentMode.toUpperCase(),
      amount: computedTotal,
      placedAt: "Just now",
      placedAtRaw: new Date().toISOString(),
      eta: "Tomorrow 6:00 PM",
      pickupAddress: "Store Walk-in Desk",
      deliveryAddress: "Store Walk-in Collection",
      bagTagToken: tagCode,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(`🎉 Walk-In Order #${orderCode} Created!`, {
        description: `Thermal Tag: ${tagCode} • Total: ${inr(computedTotal)} (${paymentMode.toUpperCase()})`,
      });
      onOrderCreated(newOrder);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 shadow-2xs">
              <ShoppingBag className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950">
                New Counter Walk-In Order
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Offline customer intake & instant thermal bag tagging
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                Customer Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="98XXXXXXXX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Service Tier Selection */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Service Selected
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_TIERS.map((tier) => (
                <button
                  type="button"
                  key={tier.id}
                  onClick={() => setSelectedService(tier.id)}
                  className={`rounded-2xl border p-2.5 text-left transition-all ${
                    selectedService === tier.id
                      ? "border-blue-600 bg-blue-50/70 text-blue-700 font-black shadow-2xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold"
                  }`}
                >
                  <p className="text-xs leading-none">{tier.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Garment Quick Counter */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Garments & Quantities ({totalGarments} items)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_GARMENTS.map((item) => {
                const qty = quantities[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-2 text-xs"
                  >
                    <div className="min-w-0 pr-1">
                      <p className="font-bold text-slate-900 truncate">
                        <span className="mr-1">{item.icon}</span>
                        {item.name.split("/")[0]}
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        ₹{Math.round(item.price * currentMult)}/pc
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, -1)}
                        className="flex size-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-black active:scale-95"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-4 text-center font-black text-slate-900 text-xs">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(item.id, 1)}
                        className="flex size-6 items-center justify-center rounded-lg bg-blue-600 text-white font-black hover:bg-blue-700 active:scale-95"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
              Payment Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "cash", label: "💵 Cash Paid" },
                { id: "upi", label: "📱 UPI / QR Paid" },
                { id: "unpaid", label: "⏳ Pay on Pickup" },
              ].map((pm) => (
                <button
                  type="button"
                  key={pm.id}
                  onClick={() => setPaymentMode(pm.id as any)}
                  className={`rounded-2xl border py-2 px-3 text-xs font-black transition-all ${
                    paymentMode === pm.id
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing & Tag Preview */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Tag className="size-4" />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-blue-900">
                  Total Payable Amount
                </p>
                <p className="text-lg font-black text-blue-950">
                  {inr(computedTotal)}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white border border-blue-200 px-3 py-1 text-xs font-black text-blue-700 shadow-2xs">
              {totalGarments} Garments
            </span>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-xs font-black text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="size-4" />
              <span>{isSubmitting ? "Creating..." : "Confirm & Create Order"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
