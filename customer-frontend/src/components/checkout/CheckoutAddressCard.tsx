import React, { useState } from "react";
import { CheckCircle2, ChevronRight, Home, MapPin, Phone, User, Edit2 } from "lucide-react";
import type { Address } from "@/api/customer/cart-api";

interface CheckoutAddressCardProps {
  selectedPickup?: Address | null;
  selectedDelivery?: Address | null;
  sameAsPickup: boolean;
  setSameAsPickup: (val: boolean) => void;
  onOpenPickupPicker: () => void;
  onOpenDeliveryPicker: () => void;
  customerName: string;
  customerPhone: string;
  onOpenContactModal: () => void;
  isRefreshing?: boolean;
}

export function CheckoutAddressCard({
  selectedPickup,
  selectedDelivery,
  sameAsPickup,
  setSameAsPickup,
  onOpenPickupPicker,
  onOpenDeliveryPicker,
  customerName,
  customerPhone,
  onOpenContactModal,
  isRefreshing = false,
}: CheckoutAddressCardProps) {
  return (
    <section aria-label="Delivery Address & Contact" className="space-y-3">
      {/* Pickup Address Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 shadow-2xs transition-all hover:border-zinc-300">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-[#0c831f] border border-emerald-100/80">
              <MapPin className="size-3.5 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                Pickup &amp; Delivery Location
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPickupPicker}
            className="text-xs font-black text-[#0c831f] hover:text-emerald-800 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-emerald-50/60"
          >
            Change
          </button>
        </div>

        {isRefreshing && !selectedPickup ? (
          <div className="pt-3 animate-pulse space-y-2">
            <div className="h-3.5 w-24 bg-zinc-200 rounded" />
            <div className="h-3 w-48 bg-zinc-100 rounded" />
          </div>
        ) : selectedPickup ? (
          <div className="pt-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black text-zinc-950">{selectedPickup.label || "Home"}</span>
                {selectedPickup.isDefault && (
                  <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed truncate">{selectedPickup.line}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {selectedPickup.city} {selectedPickup.pincode ? `• ${selectedPickup.pincode}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="pt-3 text-center py-2">
            <p className="text-xs text-zinc-500 font-medium">No address selected</p>
            <button
              type="button"
              onClick={onOpenPickupPicker}
              className="mt-1 text-xs font-black text-[#0c831f] underline cursor-pointer"
            >
              Select Delivery Address
            </button>
          </div>
        )}

        {/* Receiver Contact Dossier Pill (Senior Designer Polish: Clean, Minimal, Non-intrusive) */}
        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 border border-zinc-200 shadow-2xs">
              <User className="size-3 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-zinc-800">
                {customerName ? customerName : "Add Contact Name"}
                {customerPhone ? (
                  <span className="font-normal text-zinc-500"> • +91 {customerPhone}</span>
                ) : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenContactModal}
            className="flex items-center gap-1 text-[11px] font-black text-[#0c831f] hover:underline cursor-pointer shrink-0 ml-2"
          >
            <Edit2 className="size-3 stroke-[2.2]" />
            <span>Edit</span>
          </button>
        </div>

        {/* Dropoff to same address toggle */}
        <div className="mt-2.5 pt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sameAsPickup}
              onChange={(e) => setSameAsPickup(e.target.checked)}
              className="size-4 rounded text-[#0c831f] focus:ring-[#0c831f] accent-[#0c831f] cursor-pointer"
            />
            <span className="text-xs font-semibold text-zinc-700">
              Return garments to same location
            </span>
          </label>
        </div>
      </div>

      {/* Dropoff Address (if different from pickup) */}
      {!sameAsPickup && (
        <div className="bg-white rounded-2xl border border-blue-200/80 p-4 shadow-2xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-blue-50 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <MapPin className="size-3" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                Return Dropoff Location
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenDeliveryPicker}
              className="text-xs font-black text-blue-700 hover:underline cursor-pointer"
            >
              Change
            </button>
          </div>

          {selectedDelivery ? (
            <div className="pt-1">
              <p className="text-xs font-black text-zinc-950">{selectedDelivery.label}</p>
              <p className="text-xs text-zinc-600 truncate">{selectedDelivery.line}</p>
              <p className="text-[11px] text-zinc-400">{selectedDelivery.city}</p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

