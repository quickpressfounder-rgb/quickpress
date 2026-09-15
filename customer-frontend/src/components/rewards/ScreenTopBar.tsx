import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shared top app bar for Wallet, Addresses, Payment Methods, Invoices, Help, Referrals, etc.
 * Features a borderless frosted glass header, rounded-b-2xl/3xl bottom edge, and light floating shadow.
 */
export function ScreenTopBar({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      void navigate({ to: "/profile" });
    }
  };

  return (
    <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
      <button
        type="button"
        aria-label="Go back"
        onClick={handleBack}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
      >
        <ArrowLeft className="size-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-center text-sm font-bold tracking-tight text-foreground">
        {title}
      </h1>
      <div className="flex size-10 shrink-0 items-center justify-end">
        {action ? action : <span className="size-10 shrink-0" />}
      </div>
    </header>
  );
}

export function NotificationBellAction({ count = 0 }: { count?: number }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      aria-label="Notifications"
      onClick={() => navigate({ to: "/notifications" })}
      className="relative flex size-10 items-center justify-center rounded-full bg-white text-foreground shadow-xs border border-border/50 transition-all duration-300 hover:bg-accent active:scale-[0.94] dark:bg-zinc-900 dark:border-zinc-800"
    >
      <Bell className="size-5" />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground">
          {count}
        </span>
      ) : null}
    </button>
  );
}

