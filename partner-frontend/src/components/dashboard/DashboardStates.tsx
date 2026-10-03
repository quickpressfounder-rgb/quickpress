import { Bike, Clock, Inbox, PowerOff, Radio, Sparkles, Wrench } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/shared/ui/skeleton";

/* ---------------------------------------------------------- Empty states */

function EmptyShell({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-soft animate-rise flex flex-col items-center border border-border px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className="mt-4 text-sm font-black tracking-tight text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs font-medium leading-relaxed text-muted-foreground">
        {body}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function NoOrdersEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-emerald-500/30 bg-gradient-to-b from-card via-card to-emerald-50/20 dark:to-emerald-950/10 p-6 md:p-8 text-center shadow-xs">
      {/* Subtle animated radar ring */}
      <div className="mx-auto relative flex size-16 items-center justify-center">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/20" />
        <span className="absolute inline-flex size-12 rounded-full bg-emerald-500/10 border border-emerald-500/30" />
        <span className="relative flex size-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
          <Radio className="size-5 animate-pulse" />
        </span>
      </div>

      <div className="mt-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Store Radar Active · Accepting Live Bookings</span>
        </div>

        <h4 className="mt-2.5 text-base font-black tracking-tight text-foreground">
          Listening for Live Customer Orders
        </h4>
        <p className="mx-auto mt-1 max-w-md text-xs font-medium text-muted-foreground leading-relaxed">
          Customer laundry bookings in your service radius will appear here instantly with live sound and terminal notifications.
        </p>
      </div>
    </div>
  );
}

export function OfflineEmptyState({ onGoOnline }: { onGoOnline: () => void }) {
  return (
    <EmptyShell
      icon={<PowerOff className="size-6" />}
      title="You're offline"
      body="Customers can't book your shop while you're offline. Go online to start receiving orders."
      action={
        <button
          type="button"
          onClick={onGoOnline}
          className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition-all duration-300 active:scale-[0.95] cursor-pointer"
        >
          Go online
        </button>
      }
    />
  );
}

export function MaintenanceEmptyState() {
  return (
    <EmptyShell
      icon={<Wrench className="size-6" />}
      title="Scheduled maintenance"
      body="Order intake is paused for a short QuickPress maintenance window. We'll be back shortly."
    />
  );
}

/* -------------------------------------------------------------- Skeleton */

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 px-4 pb-32 pt-4 md:px-6">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-52 w-full rounded-3xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
