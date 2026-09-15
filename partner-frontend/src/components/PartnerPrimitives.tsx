import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Compact metric tile used on Dashboard / Earnings / Wallet. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "green" | "muted";
  delay?: number;
}) {
  const toneClass =
    tone === "green"
      ? "bg-secondary/10 text-brand-green"
      : tone === "muted"
        ? "bg-muted text-muted-foreground"
        : "bg-primary/15 text-brand-dark";

  return (
    <div className="card-soft border border-border p-4 transition-all duration-300 hover:border-primary/60"
    >
      <span className={`flex size-9 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <p className="mt-3 text-lg font-black tracking-tight text-foreground">{value}</p>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {hint ? <p className="mt-1 text-[0.68rem] font-medium text-brand-green">{hint}</p> : null}
    </div>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-black tracking-tight text-foreground">{title}</h2>
      {action}
    </div>
  );
}

export function PartnerEmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="card-soft mt-4 flex flex-col items-center border border-border px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm font-bold tracking-tight text-foreground">{title}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{body}</p>
    </div>
  );
}

export function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  delay = 0,
  badge,
  disabled = false,
  onDisabledClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  delay?: number;
  badge?: string;
  disabled?: boolean;
  onDisabledClick?: () => void;
}) {
  return (
    <div
      onClick={() => {
        if (disabled) {
          onDisabledClick?.();
          return;
        }
        onChange(!checked);
      }}
      className={`group flex items-center justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 transition-all ${
        disabled
          ? "cursor-not-allowed border-zinc-200/80 bg-zinc-50/70 opacity-75"
          : checked
            ? "cursor-pointer border-emerald-500/40 bg-emerald-50/20 hover:border-emerald-500/60 shadow-2xs"
            : "cursor-pointer border-zinc-200/90 bg-white hover:border-zinc-300 shadow-2xs"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={`flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl transition-all ${
            disabled
              ? "bg-zinc-200/80 text-zinc-400"
              : checked
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200"
          }`}
        >
          <Icon className="size-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <p className="text-xs sm:text-sm font-black tracking-tight text-zinc-900">{label}</p>
            {badge && (
              <span className="shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-zinc-500 leading-snug line-clamp-2 sm:line-clamp-1">
            {description}
          </p>
        </div>
      </div>

      {/* High-Contrast iOS Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) {
            onDisabledClick?.();
            return;
          }
          onChange(!checked);
        }}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
          disabled
            ? "cursor-not-allowed bg-zinc-200"
            : checked
              ? "bg-emerald-600"
              : "bg-zinc-300 hover:bg-zinc-400"
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block size-6 rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
