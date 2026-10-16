import { CalendarOff, Check, Clock3, Sunrise, Sunset } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { WEEKLY_OFF_OPTIONS, formatTimeLabel } from "../../data/partner-shop-mock";
import { ShopSheet } from "./ShopSheet";

export interface ShopHoursModalProps {
  open: boolean;
  onClose: () => void;
  openingTime: string;
  closingTime: string;
  weeklyOff: string;
  onSave: (patch: { openingTime: string; closingTime: string; weeklyOff: string }) => Promise<void> | void;
}

const PRESETS = [
  { label: "Standard Store", open: "08:00", close: "21:00", desc: "8:00 AM – 9:00 PM" },
  { label: "Extended Hours", open: "07:00", close: "22:00", desc: "7:00 AM – 10:00 PM" },
  { label: "Commercial Hub", open: "09:00", close: "20:00", desc: "9:00 AM – 8:00 PM" },
  { label: "Superhub Express", open: "06:00", close: "23:00", desc: "6:00 AM – 11:00 PM" },
];

export function ShopHoursModal({
  open,
  onClose,
  openingTime: initialOpeningTime,
  closingTime: initialClosingTime,
  weeklyOff: initialWeeklyOff,
  onSave,
}: ShopHoursModalProps) {
  const [openingTime, setOpeningTime] = useState(initialOpeningTime || "08:00");
  const [closingTime, setClosingTime] = useState(initialClosingTime || "21:00");
  const [weeklyOff, setWeeklyOff] = useState(initialWeeklyOff || "None");
  const [isSaving, setIsSaving] = useState(false);

  const handleApplyPreset = (openT: string, closeT: string) => {
    setOpeningTime(openT);
    setClosingTime(closeT);
    toast.info(`Applied ${openT} – ${closeT} preset`);
  };

  const handleSave = async () => {
    if (!openingTime || !closingTime) {
      toast.error("Please provide both opening and closing times");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ openingTime, closingTime, weeklyOff });
      toast.success("Store operating hours updated successfully!");
      onClose();
    } catch {
      toast.error("Failed to update store operating hours");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ShopSheet
      open={open}
      onClose={onClose}
      title="Store Operating Hours & Off Day"
      subtitle="Define daily store schedule when riders can pickup & dropoff laundry"
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
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
          >
            {isSaving ? "Saving..." : "Save Operating Hours"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Presets */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2">
            Quick Timing Presets
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => {
              const active = openingTime === p.open && closingTime === p.close;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p.open, p.close)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                  }`}
                >
                  <span className="text-xs font-black">{p.label}</span>
                  <span className="text-[10px] text-zinc-500 font-medium">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Timers */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Morning Opening Time */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Morning Opening Time
            </label>
            <div className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 focus-within:border-emerald-600 focus-within:bg-white transition-all">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-2xs border border-zinc-100">
                <Sunrise className="size-4 stroke-[2.3]" />
              </span>
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-900 outline-none"
              />
              <span className="text-xs font-semibold text-zinc-500">
                {formatTimeLabel(openingTime)}
              </span>
            </div>
          </div>

          {/* Evening Closing Time */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
              Evening Closing Time
            </label>
            <div className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 focus-within:border-emerald-600 focus-within:bg-white transition-all">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-2xs border border-zinc-100">
                <Sunset className="size-4 stroke-[2.3]" />
              </span>
              <input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-900 outline-none"
              />
              <span className="text-xs font-semibold text-zinc-500">
                {formatTimeLabel(closingTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Off Day */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
            Weekly Holiday / Maintenance Rest Day
          </label>
          <div className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 focus-within:border-emerald-600 focus-within:bg-white transition-all">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-2xs border border-zinc-100">
              <CalendarOff className="size-4 stroke-[2.3]" />
            </span>
            <select
              value={weeklyOff}
              onChange={(e) => setWeeklyOff(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-900 outline-none cursor-pointer"
            >
              {WEEKLY_OFF_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "None" ? "None (Open All 7 Days)" : `${opt} (Weekly Off)`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Card */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Clock3 className="size-4" />
          </div>
          <div className="text-xs font-medium text-emerald-950">
            <p className="font-black text-emerald-900">
              {formatTimeLabel(openingTime)} to {formatTimeLabel(closingTime)}
            </p>
            <p className="text-[11px] text-emerald-800">
              {weeklyOff === "None"
                ? "Your shop will accept orders 7 days a week."
                : `Your shop will be marked closed on ${weeklyOff}s automatically.`}
            </p>
          </div>
        </div>
      </div>
    </ShopSheet>
  );
}
