import React, { useState } from "react";
import {
  X,
  QrCode,
  Search,
  Package,
  CheckCircle2,
  Phone,
  User,
  ArrowRight,
  Sparkles,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import type { ManagedOrder } from "../../data/partner-orders-mock";
import { inr } from "../../lib/currency";

interface ScanBagTagModalProps {
  orders: ManagedOrder[];
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
}

export function ScanBagTagModal({ orders, onClose, onSelectOrder }: ScanBagTagModalProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [matchedOrder, setMatchedOrder] = useState<ManagedOrder | null>(null);

  const handleSearch = (query: string) => {
    setTokenInput(query);
    const q = query.trim().toUpperCase();
    if (!q) {
      setMatchedOrder(null);
      return;
    }

    const found = orders.find(
      (o) =>
        (o.bagTagToken && o.bagTagToken.toUpperCase().includes(q)) ||
        o.code.toUpperCase().includes(q) ||
        o.id.toUpperCase().includes(q) ||
        (o.customerPhone && o.customerPhone.includes(q))
    );

    setMatchedOrder(found || null);
  };

  const handleSimulateScan = (tagSample: string) => {
    setTokenInput(tagSample);
    handleSearch(tagSample);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 shadow-2xs">
              <QrCode className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-950">Scan Laundry Bag Tag</h2>
              <p className="text-xs text-slate-500 font-medium">
                Instant order retrieval by Bag QR, Barcode, or Order Code
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

        {/* Input & Scanner visual */}
        <div className="mt-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={tokenInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Scan Barcode or Type Code (e.g. ORD-1029, TAG-891)..."
              className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
            />
          </div>

          {/* Quick chip demo suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400">Recent active bags:</span>
            {orders.slice(0, 3).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => handleSimulateScan(o.bagTagToken || o.code)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-blue-600 hover:bg-blue-50 cursor-pointer"
              >
                {o.bagTagToken || o.code}
              </button>
            ))}
          </div>

          {/* Result Card */}
          {matchedOrder ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block rounded-md border border-black bg-zinc-100 text-black px-2 py-0.5 text-[10px] font-black uppercase">
                    Order #{matchedOrder.code}
                  </span>
                  <h4 className="mt-1 text-sm font-black text-slate-950">
                    {matchedOrder.customerName}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {matchedOrder.itemsSummary}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-950">
                    {inr(matchedOrder.amount)}
                  </p>
                  <span className="text-[10px] font-black uppercase text-black bg-zinc-200 px-2 py-0.5 rounded-full">
                    {matchedOrder.stage}
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Tag className="size-3.5 text-black" />
                  Tag: {matchedOrder.bagTagToken || "Assigned"}
                </span>

                <button
                  type="button"
                  onClick={() => onSelectOrder(matchedOrder.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-black bg-zinc-950 px-3 py-1.5 text-xs font-black text-white hover:bg-zinc-800 cursor-pointer shadow-2xs active:scale-95 transition-all"
                >
                  <span>Open Full Order</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          ) : tokenInput.trim() ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400 text-xs">
              No active order found matching "{tokenInput}". Check tag barcode number.
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-slate-400">
              <QrCode className="size-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="mt-2 text-xs font-bold text-slate-600">
                Scan barcode using handheld USB scanner or webcam
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                Input field receives hardware barcode scan keystrokes automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
