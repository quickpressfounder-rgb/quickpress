import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Shared empty state so every data-driven section fails gracefully. */
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <div className="card-soft animate-pop flex flex-col items-center border border-border px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-3xl bg-primary/12 text-brand-dark">
        <Icon className="size-6" />
      </span>
      <p className="mt-4 text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-[15rem] text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="ripple mt-5 h-10 rounded-2xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.96]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
