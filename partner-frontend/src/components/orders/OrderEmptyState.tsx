import { Inbox, RotateCcw, SearchX, WifiOff } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/90 bg-white p-8 text-center shadow-xs">
        <span className="flex size-14 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 border border-rose-200">
          <WifiOff className="size-6" />
        </span>
        <p className="mt-4 text-sm font-black tracking-tight text-zinc-900">You're Offline</p>
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

  // Determine user-facing messages based on active tab
  let title = "No Orders";
  let description = "New customer orders will appear here automatically.";
  let ctaText = "Refresh Queue";

  if (variant === "no-results" || query.trim().length > 0) {
    title = query ? `No matching orders for "${query}"` : "No matching orders";
    description = "Check the spelling or try searching by 10-digit phone number or order code.";
    ctaText = "Clear Search";
  } else {
    switch (tab) {
      case "active":
        title = "No Active Orders";
        description = "New customer laundry bookings will appear here the moment they are placed.";
        break;
      case "picked":
        title = "No Picked Orders";
        description = "Orders picked up by Captains en route to your laundromat will appear here.";
        break;
      case "process":
        title = "No Orders in Process";
        description = "No garments are currently in washing, drying, or iron processing.";
        break;
      case "out_for_delivery":
        title = "No Out of Delivery Orders";
        description = "Orders packed and dispatched with delivery captains will be tracked here.";
        break;
      case "delivered":
        title = "No Delivered Orders";
        description = "Completed and successfully delivered customer orders will show here.";
        break;
      case "cancelled":
        title = "No Cancelled Orders";
        description = "Zero cancellations! All received orders are being processed smoothly.";
        break;
      default:
        title = "No orders in this stage";
        description = "Incoming laundry orders will appear here in real-time.";
        break;
    }
  }

  return (
    <div className="my-4 flex flex-col items-center justify-center rounded-2xl border border-zinc-200/90 bg-white p-8 sm:p-12 text-center shadow-xs">
      {/* Clean modern icon placeholder */}
      <div className="flex size-16 items-center justify-center rounded-2xl bg-zinc-100/80 border border-zinc-200/80 text-zinc-400">
        {variant === "no-results" || query.trim().length > 0 ? (
          <SearchX className="size-8 text-zinc-400" />
        ) : (
          <Inbox className="size-8 text-zinc-400" />
        )}
      </div>

      <h3 className="mt-4 text-base font-black tracking-tight text-zinc-950">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-xs font-medium text-zinc-600 leading-relaxed">
        {description}
      </p>

      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 px-5 py-2.5 text-xs font-black text-zinc-900 shadow-2xs active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="size-3 text-zinc-500" />
          <span>{ctaText}</span>
        </button>
      ) : null}
    </div>
  );
}
