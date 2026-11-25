import React from "react";
import { MessageSquare } from "lucide-react";

interface CheckoutDeliveryNotesProps {
  instructions: string;
  onInstructionChange: (text: string) => void;
}

const QUICK_CHIPS = [
  "🔔 Don't ring bell",
  "🚪 Leave at doorstep",
  "📞 Call upon arrival",
  "👔 Separate delicate silks",
];

export function CheckoutDeliveryNotes({
  instructions,
  onInstructionChange,
}: CheckoutDeliveryNotesProps) {
  const toggleChip = (chip: string) => {
    const current = instructions.trim();
    if (current.includes(chip)) {
      const updated = current
        .replace(chip, "")
        .replace(/\s{2,}/g, " ")
        .replace(/,\s*,/g, ",")
        .trim();
      onInstructionChange(updated);
    } else {
      const updated = current ? `${current}, ${chip}` : chip;
      onInstructionChange(updated);
    }
  };

  return (
    <section aria-label="Care & Delivery Notes" className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
          Delivery &amp; Garment Care Notes
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 p-3.5 shadow-2xs space-y-2.5">
        {/* 1-Tap Quick Chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => {
            const active = instructions.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggleChip(chip)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-50 border-[#0c831f] text-[#0c831f] shadow-2xs"
                    : "bg-zinc-50/80 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {/* Custom Note Input */}
        <div className="relative">
          <input
            type="text"
            value={instructions}
            onChange={(e) => onInstructionChange(e.target.value)}
            placeholder="Add specific instructions (e.g., starch on collars, gate code)..."
            className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-zinc-200 bg-zinc-50/50 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] focus:outline-hidden"
          />
        </div>
      </div>
    </section>
  );
}

