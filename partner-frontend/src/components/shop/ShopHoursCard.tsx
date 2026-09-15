import { CalendarOff, Clock, DoorClosed, Plane, Sunrise, Sunset } from "lucide-react";
import { formatTimeLabel, WEEKLY_OFF_OPTIONS, type BusinessHours } from "../../data/partner-shop-mock";
import { toast } from "sonner";

function TimeField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
}: {
  id: string;
  label: string;
  icon: typeof Sunrise;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-black uppercase tracking-wider text-zinc-500"
      >
        {label}
      </label>
      <div className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 transition-all focus-within:border-emerald-600 focus-within:bg-white focus-within:shadow-xs">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-2xs border border-zinc-100">
          <Icon className="size-4 stroke-[2.3]" />
        </span>
        <input
          id={id}
          type="time"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-900 outline-none"
        />
        <span className="text-xs font-semibold text-zinc-400">
          {formatTimeLabel(value)}
        </span>
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out ${
        checked ? "bg-emerald-600" : "bg-zinc-300"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/** Business hours — opening, closing, weekly off, holiday & temporary closure. */
export function ShopHoursCard({
  hours,
  onSave,
}: {
  hours: BusinessHours;
  onSave: (patch: Partial<BusinessHours>) => void;
}) {
  const handleTimeChange = (patch: Partial<BusinessHours>) => {
    onSave(patch);
    toast.success("Store timings updated!");
  };

  return (
    <div className="space-y-4">
      {/* Timings row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <TimeField
          id="opening-time"
          label="Morning Opening Time"
          icon={Sunrise}
          value={hours.openingTime}
          onChange={(value) => handleTimeChange({ openingTime: value })}
        />
        <TimeField
          id="closing-time"
          label="Evening Closing Time"
          icon={Sunset}
          value={hours.closingTime}
          onChange={(value) => handleTimeChange({ closingTime: value })}
        />
      </div>

      {/* Weekly Off Selector */}
      <div className="space-y-1.5">
        <label
          htmlFor="weekly-off"
          className="text-[11px] font-black uppercase tracking-wider text-zinc-500"
        >
          Weekly Holiday / Rest Day
        </label>
        <div className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 transition-all focus-within:border-emerald-600 focus-within:bg-white">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-2xs border border-zinc-100">
            <CalendarOff className="size-4 stroke-[2.3]" />
          </span>
          <select
            id="weekly-off"
            value={hours.weeklyOff}
            onChange={(event) => {
              onSave({ weeklyOff: event.target.value });
              toast.success(`Weekly off set to ${event.target.value}`);
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-zinc-900 outline-none"
          >
            {WEEKLY_OFF_OPTIONS.map((day) => (
              <option key={day} value={day}>
                {day === "None" ? "None (Open 7 Days a Week)" : `${day} Closed`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Switches */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Plane className="size-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900">Planned Vacation Mode</p>
              <p className="text-[11px] font-medium text-zinc-500">
                Pause incoming orders while away on holiday
              </p>
            </div>
          </div>
          <Switch
            checked={hours.holidayMode}
            onChange={(next) => {
              onSave({ holidayMode: next });
              toast.success(next ? "Vacation mode activated" : "Vacation mode turned off");
            }}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <DoorClosed className="size-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900">Temporarily Closed</p>
              <p className="text-[11px] font-medium text-zinc-500">
                Stop orders for a short break today
              </p>
            </div>
          </div>
          <Switch
            checked={hours.temporarilyClosed}
            onChange={(next) => {
              onSave({ temporarilyClosed: next });
              toast.success(next ? "Store closed temporarily" : "Store open again");
            }}
          />
        </div>
      </div>
    </div>
  );
}

