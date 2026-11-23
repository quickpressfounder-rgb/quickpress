import { SearchX, WifiOff, ShoppingBag } from "lucide-react";

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

  // Active / Stage Empty State: Clean, minimalist, professional
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
    <div className="my-6 rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-8 sm:p-10 text-center shadow-xs">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white border border-zinc-200/90 text-zinc-500 shadow-2xs">
        <ShoppingBag className="size-6 text-zinc-500" />
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="text-base font-bold tracking-tight text-zinc-900">
          No Active Orders
        </h3>
        <p className="mx-auto max-w-xs text-xs font-medium text-zinc-500 leading-relaxed">
          {stageDescription}
        </p>
      </div>
    </div>
  );
}
