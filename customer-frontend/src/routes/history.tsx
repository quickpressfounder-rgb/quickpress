import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Receipt,
  Repeat2,
  Search,
  Star,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BottomNav } from "@/components/home/BottomNav";
import { FloatingCartBar } from "@/components/cart/FloatingCartBar";
import { OrderReviewModal } from "@/components/orders/OrderReviewModal";
import {
  fetchOrderHistory,
  readCachedOrderHistory,
  reorder,
  type OrderRecord,
  type OrderStatus,
} from "@/api/customer/history-api";
import { fetchInvoiceForOrder } from "@/api/customer/invoice-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Order History — QuickPress Laundry Orders" },
      {
        name: "description",
        content:
          "View your past QuickPress laundry orders, track in-progress pickups and reorder your favourite wash, dry clean or steam iron services in one tap.",
      },
      { property: "og:title", content: "Order History — QuickPress Laundry Orders" },
      {
        property: "og:description",
        content:
          "Past laundry orders, live pickups and one-tap reorder for wash, dry clean and steam iron services.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryScreen,
});

const FILTERS: { id: "all" | OrderStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in-progress", label: "In Progress" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const STATUS_META: Record<OrderStatus, { label: string; icon: typeof Clock; tone: string }> = {
  delivered: { label: "Delivered", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  "in-progress": { label: "In Progress", icon: Clock, tone: "bg-emerald-50 text-emerald-800 border border-emerald-200" },
  cancelled: { label: "Cancelled", icon: XCircle, tone: "bg-rose-50 text-rose-700 border border-rose-200" },
};

function HistoryScreen() {
  useAuthGuard();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[] | null>(() => readCachedOrderHistory());
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [reordering, setReordering] = useState<string | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<OrderRecord | null>(null);

  // Debounce the search box so every keystroke doesn't hit the API.
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  // GET /api/orders/history?q=&status=
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void fetchOrderHistory(
      { q: term || undefined, status: filter },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!active) return;
        setOrders(data);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setOrders((prev) => prev ?? []);
        setError("We couldn't load your orders. Check your connection and try again.");
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [term, filter, reloadKey]);

  const visible = orders ?? [];
  const activeOrder = useMemo(
    () => visible.find((order) => order.status === "in-progress") ?? null,
    [visible],
  );
  const hasSearch = term.length > 0 || filter !== "all";

  // GET /api/orders/{orderId}/invoice → open the itemised invoice screen.
  const openInvoice = async (order: OrderRecord) => {
    setInvoiceBusy(order.id);
    try {
      const invoice = await fetchInvoiceForOrder(order.orderId);
      await navigate({ to: "/invoices/$invoiceId", params: { invoiceId: invoice.id } });
    } catch {
      setError("Invoice isn't ready yet. Please try again shortly.");
    } finally {
      setInvoiceBusy(null);
    }
  };

  const handleReorder = async (order: OrderRecord) => {
    setReordering(order.id);
    try {
      await reorder(order.orderId);
      navigate({ to: "/cart" });
    } catch {
      setError("Reorder failed. Please try again.");
    } finally {
      setReordering(null);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                void navigate({ to: "/profile" });
              }
            }}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-center text-sm font-bold tracking-tight text-foreground">
            Order History
          </h1>
          <span className="size-10 shrink-0" />
        </header>

        <div className="px-5 pb-32 pt-4">
          {/* Search — GET /api/orders/history?q= */}
          <div className="card-soft flex items-center gap-3 border border-border px-4 py-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order ID, service or store"
              aria-label="Search orders"
              className="w-full bg-transparent text-sm font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="stagger-children mt-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => {
              const isActive = item.id === filter;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={isActive}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold tracking-tight transition-all duration-300 active:scale-[0.94] ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {activeOrder ? (
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/track/$orderId", params: { orderId: activeOrder.orderId } })
              }
              className="card-soft mt-4 flex w-full items-center gap-3 border border-emerald-200 bg-white p-4 text-left transition-all duration-300 active:scale-[0.985]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Truck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold tracking-tight text-foreground">
                  Active order · {activeOrder.id}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {activeOrder.service} · {activeOrder.store}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                Track
              </span>
            </button>
          ) : null}

          {error ? (
            <div className="card-soft mt-4 flex items-center gap-3 border border-destructive/40 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <XCircle className="size-4" />
              </span>
              <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="shrink-0 rounded-full bg-primary/15 px-3 py-2 text-[11px] font-bold text-brand-dark active:scale-[0.95]"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!orders ? (
            <div className="stagger-children mt-5 space-y-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="card-soft h-36 animate-pulse border border-border bg-muted/60"
                />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="card-soft mt-6 border border-border px-5 py-10 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                <Clock className="size-6" />
              </span>
              <p className="mt-4 text-sm font-bold text-foreground">
                {hasSearch ? "No matching orders" : "No orders yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasSearch
                  ? "Try a different search term or filter."
                  : "Your laundry orders will appear here once you book a pickup."}
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/home" })}
                className="mt-5 rounded-full bg-gradient-to-r from-brand-green to-primary px-6 py-3 text-sm font-black tracking-tight text-background shadow-cta transition-transform duration-300 active:scale-[0.96]"
              >
                Book a pickup
              </button>
            </div>
          ) : (
            <div className="stagger-children mt-5 space-y-3">
              {visible.map((order, index) => {
                const meta = STATUS_META[order.status];
                const StatusIcon = meta.icon;
                return (
                  <article
                    key={order.id}
                    onClick={() =>
                      navigate({ to: "/track/$orderId", params: { orderId: order.orderId } })
                    }
                    className="card-soft cursor-pointer border border-border p-4 transition-all duration-300 hover:border-primary/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold tracking-tight text-foreground">
                          {order.service}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {order.store} · {order.id}
                        </p>
                      </div>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[0.68rem] font-bold tracking-tight ${meta.tone}`}
                      >
                        <StatusIcon className="size-3.5" />
                        {meta.label}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      {order.items.map((item) => `${item.name} ×${item.qty}`).join(" · ")}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                      <div>
                        <p className="text-[0.68rem] font-semibold text-muted-foreground">
                          {order.placedOn}
                        </p>
                        <p className="text-sm font-black tracking-tight text-foreground">
                          ₹{order.total}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.status === "delivered" ? (
                          <>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setReviewTarget(order);
                              }}
                              className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/80 px-3.5 py-2.5 text-xs font-bold tracking-tight text-amber-800 shadow-xs transition-all duration-300 hover:bg-amber-100 hover:shadow-sm active:scale-[0.95]"
                            >
                              <Star className="size-3.5 fill-amber-500 text-amber-500" />
                              Rate
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openInvoice(order);
                              }}
                              disabled={invoiceBusy === order.id}
                              className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-4 py-2.5 text-xs font-bold tracking-tight text-foreground shadow-xs transition-all duration-300 hover:bg-zinc-50 hover:shadow-sm active:scale-[0.95] disabled:opacity-70"
                            >
                              {invoiceBusy === order.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Receipt className="size-4" />
                              )}
                              Invoice
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleReorder(order);
                          }}
                          disabled={reordering === order.id}
                          className="flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-4 py-2.5 text-xs font-bold tracking-tight text-foreground shadow-xs transition-all duration-300 hover:bg-zinc-50 hover:shadow-sm active:scale-[0.95] disabled:opacity-70"
                        >
                          {reordering === order.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Repeat2 className="size-4" />
                          )}
                          Reorder
                        </button>
                      </div>

                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {reviewTarget ? (
        <OrderReviewModal
          isOpen={Boolean(reviewTarget)}
          onClose={() => setReviewTarget(null)}
          orderId={reviewTarget.orderId || reviewTarget.id}
          partnerName={reviewTarget.store}
          onSuccess={() => setReloadKey((k) => k + 1)}
        />
      ) : null}

      <FloatingCartBar />
      <BottomNav active="history" />
    </main>
  );
}
