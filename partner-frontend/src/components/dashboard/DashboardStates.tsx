import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bike, Clock, Inbox, MapPin, PowerOff, Radio, Sparkles, Wrench, Zap } from "lucide-react";
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
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-white via-slate-50/50 to-blue-50/20 p-6 md:p-8 text-center shadow-xs">
      {/* Background Decorative Rings */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-blue-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 size-64 rounded-full bg-emerald-500/5 blur-3xl" />

      {/* Modern Radar Animation Hub */}
      <div className="mx-auto relative flex size-20 items-center justify-center">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-500/20 duration-1000" />
        <span className="absolute inline-flex size-14 rounded-full bg-blue-500/10 border border-blue-400/40" />
        <span className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-blue-500/30">
          <Radio className="size-5.5 animate-pulse" />
        </span>
      </div>

      <div className="mt-4 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs">
          <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
          <span>Store Radar Active · Accepting Live Laundry Bookings</span>
        </div>

        <h4 className="mt-3 text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Listening for Live Customer Orders in Real-Time
        </h4>
        <p className="mx-auto mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
          Customer laundry bookings placed within your service radius will appear here instantly with live incoming order sound and push notifications.
        </p>

        {/* 3 Telemetry Feature Chips for Desktop */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <MapPin className="size-4 text-blue-600 shrink-0" />
              <span className="text-[11px] font-bold">Geofence Radius</span>
            </div>
            <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">Hyper-Local Coverage</p>
            <p className="text-[10px] text-slate-400">Store Hub Active</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Bike className="size-4 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-bold">Delivery Fleet</span>
            </div>
            <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">Captains on Duty</p>
            <p className="text-[10px] text-slate-400">Nearest rider auto-dispatch</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Zap className="size-4 text-amber-500 shrink-0" />
              <span className="text-[11px] font-bold">Live Stream</span>
            </div>
            <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">Supabase Realtime</p>
            <p className="text-[10px] text-slate-400">Instant WebSocket ping</p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/orders" })}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 text-xs font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
          >
            <span>View Full Orders Queue</span>
            <ArrowRight className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/services" })}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="size-3.5 text-blue-600" />
            <span>Manage Price List & Services</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function OfflineEmptyState({ onGoOnline }: { onGoOnline: () => void }) {
  return (
    <EmptyShell
      icon={<PowerOff className="size-6 text-slate-600" />}
      title="You're offline"
      body="Customers can't book your shop while you're offline. Go online to start receiving orders."
      action={
        <button
          type="button"
          onClick={onGoOnline}
          className="rounded-full bg-gradient-to-r from-[#00c6ff] via-[#0099ff] to-[#0072ff] px-5 py-2.5 text-xs font-black text-white shadow-[0_0_16px_rgba(0,198,255,0.4)] hover:opacity-95 transition-all duration-300 active:scale-[0.95] cursor-pointer"
        >
          Go online ⚡
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
