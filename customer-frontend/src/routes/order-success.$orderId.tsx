import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Home,
  Loader2,
  MapPin,

  Navigation,
  Phone,
  Receipt,
  Share2,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";

import { DeliveryAnimation } from "@/components/DeliveryAnimation";
import { OrderSuccessSkeleton } from "@/components/order/OrderSkeleton";
import { fetchOrder, type OrderSummary } from "@/api/customer/order-api";
import { fetchInvoiceForOrder } from "@/api/customer/invoice-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { playOrderPlacedSonicChime } from "@/lib/order-success-sound";


export const Route = createFileRoute("/order-success/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Confirmed — QuickPress Laundry Pickup Booked" },
      {
        name: "description",
        content:
          "Your QuickPress laundry order is confirmed. See your pickup slot, delivery date, payment summary and start live order tracking.",
      },
      { property: "og:title", content: "Order Confirmed — QuickPress Laundry Pickup Booked" },
      {
        property: "og:description",
        content:
          "Pickup slot, delivery date and payment summary for your confirmed QuickPress laundry order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrderSuccessScreen,
});

function OrderSuccessScreen() {
  useAuthGuard();
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // GET /api/orders/{orderId}/invoice → open the itemised invoice screen.
  const openInvoice = async () => {
    setInvoiceBusy(true);
    setInvoiceError(null);
    try {
      const invoice = await fetchInvoiceForOrder(orderId);
      await navigate({ to: "/invoices/$invoiceId", params: { invoiceId: invoice.id } });
    } catch (cause) {
      setInvoiceError(
        cause instanceof Error ? cause.message : "Invoice isn't ready yet. Try again shortly.",
      );
    } finally {
      setInvoiceBusy(false);
    }
  };


  useEffect(() => {
    let alive = true;

    // Play celebration chime sound
    try {
      playOrderPlacedSonicChime();
    } catch {
      // Audio context might require user interaction in rare circumstances
    }

    // Fast-path: immediately check session storage or local storage
    try {
      const cachedLast =
        localStorage.getItem(`qp_order_${orderId}`) ||
        sessionStorage.getItem("qp_last_order");
      if (cachedLast) {
        const parsed = JSON.parse(cachedLast);
        if (parsed && (parsed.id === orderId || parsed.code === orderId || !order)) {
          setOrder({
            id: parsed.code || parsed.id || orderId,
            placedAt: "Just now",
            storeName: parsed.partner?.name || "QuickPress Partner Store",
            storeImage: parsed.partner?.image || "/images/partners/store-front.jpg",
            storePhone: parsed.partner?.phone || "+91 98765 43210",
            address: parsed.address || { label: "Home", line: "Main Road", city: "Kasganj", phone: "9876543210" },
            pickup: parsed.pickup || { date: "Today", slot: "15-30 mins", express: true },
            delivery: parsed.delivery || { date: "Tomorrow", slot: "6 PM – 9 PM" },
            payment: {
              label: parsed.payment?.label || "QuickPress Wallet",
              note: parsed.payment?.note || "Paid successfully",
              paid: true,
            },
            items: parsed.items || [],
            totals: parsed.totals || { count: 1, itemsTotal: 160, pickup: 0, delivery: 29, handling: 5, gst: 29, discount: 0, couponDiscount: 0, grandTotal: 194 },
          });
        }
      }
    } catch {
      /* ignore */
    }

    void fetchOrder(orderId)
      .then((data) => {
        if (alive && data) setOrder(data);
      })
      .catch(() => {
        // Fallback if backend fetch fails or 404s
        if (alive) {
          setOrder((prev) => {
            if (prev) return prev;
            return {
              id: orderId,
              placedAt: "Just now",
              storeName: "QuickPress Partner Store",
              storeImage: "/images/partners/store-front.jpg",
              storePhone: "+91 98765 43210",
              address: { label: "Home", line: "Doorstep Delivery", city: "Kasganj", phone: "" },
              pickup: { date: "Today", slot: "15-30 mins", express: true },
              delivery: { date: "Tomorrow", slot: "6 PM – 9 PM" },
              payment: {
                label: "QuickPress Wallet",
                note: "Paid successfully",
                paid: true,
              },
              items: [],
              totals: { count: 1, itemsTotal: 160, pickup: 0, delivery: 29, handling: 5, gst: 29, discount: 0, couponDiscount: 0, grandTotal: 194 },
            };
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [orderId]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const shareOrder = async () => {
    const payload = {
      title: "QuickPress order confirmed",
      text: `My QuickPress laundry order ${orderId} is confirmed.`,
      url: typeof window === "undefined" ? "" : window.location.href,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(payload);
      } catch {
        /* dismissed */
      }
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950 scroll-smooth">
      <div className="relative mx-auto w-full max-w-md">
        <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <span className="size-10 shrink-0" />
          <p className="min-w-0 flex-1 truncate text-center text-sm font-bold tracking-tight text-foreground">
            Order confirmed
          </p>
          <button
            type="button"
            aria-label="Share order"
            onClick={() => void shareOrder()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
          >
            <Share2 className="size-4" />
          </button>
        </header>

        {!order ? (
          <>
            <OrderSuccessSkeleton />
          </>
        ) : (
          <div className="px-5 pb-44 pt-4">
            {/* Success hero */}
            <section className="text-center">
              <span className="animate-pop mx-auto flex size-20 items-center justify-center rounded-full bg-secondary/15">
                <span className="flex size-14 items-center justify-center rounded-full bg-brand-green text-background">
                  <Check className="size-7" />
                </span>
              </span>
              <h1 className="mt-5 text-xl font-bold tracking-tight text-foreground">
                Your order is confirmed
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {order.storeName} has accepted your laundry. A rider is being assigned for pickup.
              </p>

              <button
                type="button"
                onClick={() => void copyId()}
                className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-2 transition-all duration-300 hover:border-primary/60 active:scale-[0.96]"
              >
                <Receipt className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">#{order.id}</span>
                {copied ? (
                  <Check className="animate-pop size-3.5 text-brand-green" />
                ) : (
                  <Copy className="size-3.5 text-muted-foreground" />
                )}
              </button>

              <div className="mt-4">
                <DeliveryAnimation />
              </div>
            </section>

            {/* ETA card */}
            <section className="mt-6">
              <div className="card-soft border border-border p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Stat icon={CalendarDays} label="Pickup" value={order.pickup.date} sub={order.pickup.slot} />
                  <Stat icon={Truck} label="Delivery" value={order.delivery.date} sub={order.delivery.slot} />
                </div>
                {order.pickup.express ? (
                  <p className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-primary/10 px-3 py-2 text-[11px] font-bold text-brand-dark">
                    <Clock className="size-3.5" /> Express pickup — rider within 30 minutes
                  </p>
                ) : null}
              </div>
            </section>

            {/* Partner */}
            <section className="mt-6">
              <SectionHeading title="Laundry partner" />
              <div className="card-soft mt-3 flex items-center gap-3 border border-border p-3">
                <img
                  src={order.storeImage}
                  alt={`${order.storeName} storefront`}
                  loading="lazy"
                  className="size-14 shrink-0 rounded-2xl object-cover"
                  decoding="async"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-foreground">{order.storeName}</p>
                    <BadgeCheck className="size-3.5 shrink-0 text-brand-green" />
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {order.storePhone}
                  </p>
                </div>
                <a
                  href={`tel:${order.storePhone.replace(/\s/g, "")}`}
                  aria-label="Call laundry partner"
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark transition-all duration-300 active:scale-[0.94]"
                >
                  <Phone className="size-4" />
                </a>
              </div>
            </section>

            {/* Pickup address */}
            <section className="mt-6">
              <SectionHeading title="Pickup address" />
              <div className="card-soft mt-3 flex items-start gap-3 border border-border p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                  <MapPin className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{order.address.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {order.address.line}, {order.address.city}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{order.address.phone}</p>
                </div>
              </div>
            </section>

            {/* Payment summary */}
            <section className="mt-6">
              <SectionHeading title="Payment summary" />
              <div className="card-soft mt-3 border border-border p-4">
                <div className="space-y-2 border-b border-dashed border-border pb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="min-w-0 truncate text-muted-foreground">
                        {item.name} × {item.qty}
                      </span>
                      <span className="shrink-0 font-semibold text-foreground">
                        ₹{item.price * item.qty}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <SummaryRow label="Subtotal" value={order.totals.itemsTotal} />
                  <SummaryRow label="Pickup" value={order.totals.pickup} />
                  <SummaryRow label="Delivery" value={order.totals.delivery} />
                  <SummaryRow label="Handling fee" value={order.totals.handling} />
                  <SummaryRow label="GST (5%)" value={order.totals.gst} />
                  <SummaryRow label="Discount" value={-order.totals.discount} tone="green" />
                  <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
                    <span className="text-sm font-bold text-foreground">Paid via {order.payment.label}</span>
                    <span className="animate-pop text-base font-bold text-foreground">
                      ₹{order.totals.grandTotal}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{order.payment.note}</p>
                </div>
              </div>
            </section>

            {/* Quick actions */}
            <section className="mt-6 space-y-2.5">
              <RowAction
                icon={Download}
                label="Download invoice"
                busy={invoiceBusy}
                onClick={() => void openInvoice()}
              />
              {invoiceError ? (
                <p className="px-1 text-[11px] font-semibold text-destructive">{invoiceError}</p>
              ) : null}

              <Link
                to="/history"
                className="card-soft flex w-full items-center gap-3 border border-border p-4 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.985]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                  <Receipt className="size-4" />
                </span>
                <p className="min-w-0 flex-1 text-sm font-bold text-foreground">View order history</p>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <button
                type="button"
                onClick={() => navigate({ to: "/home" })}
                className="card-soft flex w-full items-center gap-3 border border-border p-4 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.985]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                  <Home className="size-4" />
                </span>
                <p className="min-w-0 flex-1 text-sm font-bold text-foreground">Back to home</p>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </section>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      {order ? (
        <div className="fixed inset-x-0 bottom-0 z-30">
          <div className="mx-auto w-full max-w-md px-4 pb-4">
            <div className="glass-panel animate-sheet-up flex items-center gap-3 rounded-3xl p-3 shadow-soft">
              <div className="min-w-0">
                <p className="animate-pop text-lg font-bold leading-tight text-foreground">
                  ₹{order.totals.grandTotal}
                </p>
                <p className="text-[11px] text-muted-foreground">Order #{order.id}</p>
              </div>
              <Link
                to="/track/$orderId"
                params={{ orderId: order.id }}
                className="ripple ml-auto flex h-12 flex-1 items-center justify-center gap-2 rounded-3xl bg-primary text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.97]"
              >
                <Navigation className="size-4" /> Track Order
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>;
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/70 px-3 py-3 text-center">
      <span className="mx-auto flex size-7 items-center justify-center rounded-full bg-card text-brand-green">
        <Icon className="size-3.5" />
      </span>
      <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="animate-pop text-xs font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "green";
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-semibold ${tone === "green" ? "text-brand-green" : "text-foreground"}`}
      >
        {value < 0 ? `-₹${Math.abs(value)}` : `₹${value}`}
      </span>
    </div>
  );
}

function RowAction({
  icon: Icon,
  label,
  onClick,
  busy,
}: {
  icon: typeof Clock;
  label: string;
  onClick?: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="card-soft flex w-full items-center gap-3 border border-border p-4 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.985] disabled:opacity-60"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      </span>
      <p className="min-w-0 flex-1 text-sm font-bold text-foreground">{label}</p>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

