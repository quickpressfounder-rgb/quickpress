import { SearchX, Sparkles, WifiOff, Radio } from "lucide-react";

export type EmptyVariant = "no-orders" | "no-results" | "offline";

interface OrderEmptyStateProps {
  variant?: EmptyVariant;
  tab?: string;
  query?: string;
  onAction?: () => void;
}

export function OrderEmptyState({
  variant = "no-orders",
  tab = "active",
  query = "",
  onAction,
}: OrderEmptyStateProps) {
  if (variant === "offline") {
    return (
      <div className="my-6 flex flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50/30 p-8 text-center shadow-xs">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 shadow-2xs">
          <WifiOff className="size-6" />
        </span>
        <p className="mt-4 text-sm font-black tracking-tight text-zinc-950">You're Offline</p>
        <p className="mt-1 max-w-xs text-xs font-medium text-zinc-500">
          We can't sync orders right now. Check your internet connection and retry.
        </p>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 rounded-xl border border-zinc-200 bg-white px-5 py-2 text-xs font-bold text-zinc-800 transition-all hover:bg-zinc-50 active:scale-95 cursor-pointer shadow-2xs"
          >
            Retry Connection
          </button>
        ) : null}
      </div>
    );
  }

  if (variant === "no-results" || query.trim().length > 0) {
    return (
      <div className="my-6 flex flex-col items-center justify-center rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-8 text-center shadow-xs">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-white border border-zinc-200 text-zinc-400 shadow-2xs">
          <SearchX className="size-7 text-zinc-400" />
        </div>
        <h3 className="mt-4 text-sm font-black text-zinc-950">
          No matching orders for "{query}"
        </h3>
        <p className="mt-1 max-w-xs text-xs font-medium text-zinc-500">
          Check the spelling or try searching by 10-digit phone number or order code.
        </p>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
          >
            Clear Search
          </button>
        ) : null}
      </div>
    );
  }

  // Active / Stage Empty State: Premium Live Radar Waiting Screen (No Refresh Button)
  let stageDescription = "New customer laundry bookings will appear here the moment they are placed.";
  if (tab === "picked") {
    stageDescription = "Orders picked up by Captains en route to your laundromat will appear here.";
  } else if (tab === "process") {
    stageDescription = "No garments are currently in washing, drying, or iron processing.";
  } else if (tab === "out_for_delivery") {
    stageDescription = "Orders packed and dispatched with delivery captains will be tracked here.";
  } else if (tab === "delivered") {
    stageDescription = "Completed and successfully delivered customer orders will show here.";
  } else if (tab === "cancelled") {
    stageDescription = "Zero cancellations! All received orders are being processed smoothly.";
  }

  return (
    <div className="relative my-6 overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-b from-white via-emerald-50/20 to-zinc-50/60 p-8 sm:p-12 text-center shadow-xs">
      {/* Background Animated Concentric Radar Pulse Rings */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="size-72 rounded-full border border-emerald-400/15 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute size-52 rounded-full border border-emerald-400/20 animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute size-36 rounded-full border border-emerald-400/25" />
      </div>

      {/* Central Visual Badge */}
      <div className="relative mx-auto flex size-18 items-center justify-center rounded-3xl bg-white border border-emerald-200/90 shadow-[0_8px_25px_rgba(16,185,129,0.15)]">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Radio className="size-6 text-emerald-600 animate-pulse" />
        </div>
        <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
          <Sparkles className="size-3" />
        </span>
      </div>

      {/* Content */}
      <div className="relative mt-5 space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
          <span className="size-1.5 rounded-full bg-emerald-600 animate-ping" />
          <span>Live Order Radar Active</span>
        </div>
        <h3 className="text-base font-black tracking-tight text-zinc-950 sm:text-lg">
          Waiting for New Orders
        </h3>
        <p className="mx-auto max-w-xs text-xs font-medium text-zinc-500 leading-relaxed">
          {stageDescription}
        </p>
      </div>

      {/* Micro Status Hint */}
      <div className="relative mt-4 flex items-center justify-center gap-1 text-[11px] font-semibold text-zinc-400">
        <span>● Realtime Socket Connected · Instant Chime Alert</span>
      </div>
    </div>
  );
}
