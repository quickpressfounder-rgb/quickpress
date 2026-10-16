import { AlertCircle, Minus, Plus, Sliders } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ShopSheet } from "./ShopSheet";

export interface ShopCapacityModalProps {
  open: boolean;
  onClose: () => void;
  dailyOrderCap: number;
  onSave: (patch: { dailyOrderCap: number }) => Promise<void> | void;
}

const CAP_PRESETS = [25, 50, 75, 100, 150, 200];

export function ShopCapacityModal({
  open,
  onClose,
  dailyOrderCap: initialCap,
  onSave,
}: ShopCapacityModalProps) {
  const [dailyOrderCap, setDailyOrderCap] = useState<number>(initialCap || 50);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (dailyOrderCap < 5) {
      toast.error("Daily order cap must be at least 5 orders");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ dailyOrderCap: Number(dailyOrderCap) });
      toast.success("Daily order cap capacity updated successfully!");
      onClose();
    } catch {
      toast.error("Failed to update daily capacity");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ShopSheet
      open={open}
      onClose={onClose}
      title="Daily Store Order Capacity"
      subtitle="Protect your store workflow and machinery from order surges"
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-2xl border border-zinc-200 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-purple-600 py-3 text-xs font-black text-white shadow-xs hover:bg-purple-700 active:scale-95 transition-all"
          >
            {isSaving ? "Saving..." : "Save Daily Capacity"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Cap Stepper Card */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Sliders className="size-4" strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-xs font-black text-zinc-900">Maximum Daily Orders</p>
                <p className="text-[10px] text-zinc-500">Total bookings your shop can process per day</p>
              </div>
            </div>
            <span className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
              {dailyOrderCap} orders/day
            </span>
          </div>

          {/* Stepper with Large Counter */}
          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              onClick={() => setDailyOrderCap(Math.max(5, dailyOrderCap - 5))}
              className="flex size-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 active:scale-90 transition-all shadow-2xs"
            >
              <Minus className="size-5" />
            </button>

            <div className="w-28 text-center">
              <input
                type="number"
                min={5}
                max={1000}
                value={dailyOrderCap}
                onChange={(e) => setDailyOrderCap(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center text-3xl font-black text-zinc-900 outline-none"
              />
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">orders cap</p>
            </div>

            <button
              type="button"
              onClick={() => setDailyOrderCap(Math.min(1000, dailyOrderCap + 5))}
              className="flex size-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 active:scale-90 transition-all shadow-2xs"
            >
              <Plus className="size-5" />
            </button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {CAP_PRESETS.map((cap) => (
              <button
                key={cap}
                type="button"
                onClick={() => setDailyOrderCap(cap)}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                  dailyOrderCap === cap
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {cap}
              </button>
            ))}
          </div>
        </div>

        {/* Protection Explanation */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5 flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white">
            <AlertCircle className="size-4" />
          </div>
          <div className="text-xs font-medium text-purple-950">
            <p className="font-black text-purple-900 mb-0.5">Surge & Quality Guard</p>
            <p className="text-[11px] text-purple-800 leading-snug">
              When your store receives {dailyOrderCap} orders in a single day, QuickPress automatically shifts additional customer bookings to the next morning's slot. This avoids machine overload and ensures your 24h delivery SLA is never breached.
            </p>
          </div>
        </div>
      </div>
    </ShopSheet>
  );
}
