import React, { useState } from "react";
import { Phone, User, X } from "lucide-react";

interface CheckoutContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  initialPhone: string;
  onSave: (name: string, phone: string) => void;
}

export function CheckoutContactModal({
  isOpen,
  onClose,
  initialName,
  initialPhone,
  onSave,
}: CheckoutContactModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name.trim(), phone.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 cursor-pointer animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 cursor-default border border-zinc-150">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-[#0c831f]">
              <User className="size-3.5 stroke-[2.2]" />
            </div>
            <h2 className="text-sm font-black text-zinc-900">Delivery Contact Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 size-4 text-zinc-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Receiver's name"
                className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-900 focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-500 mb-1">
              10-Digit Mobile Number
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 flex items-center gap-1 text-zinc-400">
                <Phone className="size-3.5 text-zinc-400" />
                <span className="text-[11px] font-bold text-zinc-600">+91</span>
              </div>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit number"
                className="w-full pl-16 pr-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 text-zinc-900 focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#0c831f] hover:bg-emerald-800 text-white font-black text-xs active:scale-98 transition-all cursor-pointer shadow-xs mt-2"
          >
            Save Contact Details
          </button>
        </form>
      </div>
    </div>
  );
}

