import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  HelpCircle,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OrderReviewModal } from "@/components/orders/OrderReviewModal";
import { useCustomerOrderRealtime } from "@/shared/hooks/use-customer-realtime";
import { GoogleMapView, type MapPoint } from "@/shared/ui/google-map";
import { LiveDeliveryMap } from "@/components/map/LiveDeliveryMap";
import { playOrderBellNotificationSound } from "@/lib/order-success-sound";

import { TrackingSkeleton } from "@/components/order/OrderSkeleton";
import {
  CANCEL_REASONS,
  cancelOrderWithReason,
  fetchActiveOrders,
  fetchMyOrders,
  fetchOrderDetail,
  fetchTracking,
  toTracking,
  type OrderDetail,
  type TrackingData,
} from "@/api/customer/order-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/track/$orderId")({
  head: () => ({
    meta: [
      { title: "Live Order Tracking — Follow Your QuickPress Laundry" },
      {
        name: "description",
        content:
          "Track your QuickPress laundry live: rider location, pickup status, cleaning progress, quality check and delivery ETA in real time.",
      },
      { property: "og:title", content: "Live Order Tracking — Follow Your QuickPress Laundry" },
      {
        property: "og:description",
        content:
          "Live rider ETA, pickup, cleaning and delivery milestones for your QuickPress laundry order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackOrderScreen,
});

function LiveOrderSlaTracker({ detail }: { detail: any }) {
  const status = (detail?.status || "").toLowerCase();
  const isPartnerPending = ["placed", "pending_partner_acceptance", "new", "order_created"].includes(status);
  const isRiderPending =
    ["partner_accepted", "rider_searching", "pickup_rider_assigned", "rider_assigned"].includes(status) &&
    (!detail?.rider?.name ||
      detail?.rider?.name === "Rider not assigned yet" ||
      detail?.rider?.name === "Assigning rider" ||
      !detail?.rider?.assigned);
  const isCancelled = status === "cancelled";

  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!isPartnerPending && !isRiderPending) return;

    const computeDiff = () => {
      const now = Date.now();
      if (isPartnerPending) {
        const base = detail?.placedAt || detail?.createdAt ? new Date(detail.placedAt || detail.createdAt).getTime() : now;
        const target = detail?.partnerAcceptDeadline ? new Date(detail.partnerAcceptDeadline).getTime() : base + 5 * 60 * 1000;
        return Math.max(0, Math.floor((target - now) / 1000));
      }
      if (isRiderPending) {
        const base =
          detail?.partnerAcceptedAt || detail?.riderDispatchStartedAt || detail?.updatedAt
            ? new Date(detail.partnerAcceptedAt || detail.riderDispatchStartedAt || detail.updatedAt).getTime()
            : now;
        const target = detail?.riderAcceptDeadline ? new Date(detail.riderAcceptDeadline).getTime() : base + 2 * 60 * 1000;
        return Math.max(0, Math.floor((target - now) / 1000));
      }
      return 0;
    };

    setRemaining(computeDiff());
    const interval = setInterval(() => {
      setRemaining(computeDiff());
    }, 1000);

    return () => clearInterval(interval);
  }, [detail, isPartnerPending, isRiderPending]);

  if (isCancelled) {
    const reason = detail?.cancellationReason || detail?.cancelledReason || "";
    const isSlaBreach =
      reason.toLowerCase().includes("sla") ||
      reason.toLowerCase().includes("auto-cancelled") ||
      detail?.autoCancelled;
    if (isSlaBreach) {
      return (
        <div className="mt-4 rounded-3xl border-2 border-rose-500/40 bg-rose-500/10 p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-rose-600 text-white font-black text-xs shrink-0">
              ✕
            </span>
            <p className="text-xs font-black text-rose-950 dark:text-rose-200">
              Order Auto-Cancelled (SLA Guarantee)
            </p>
          </div>
          <p className="mt-2 text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
            {reason || "The response SLA window for this order expired, so it was automatically cancelled."}
          </p>
          <div className="mt-3.5 rounded-2xl bg-white/90 dark:bg-zinc-900/90 p-3 text-[11.5px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 flex items-center gap-2">
            <span className="text-sm">💳</span>
            <span>Full refund has been credited back to your QuickPress Wallet / Payment method.</span>
          </div>
        </div>
      );
    }
    return null;
  }

  if (isPartnerPending) {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const isUrgent = remaining <= 60;

    return (
      <div
        className={`mt-4 rounded-3xl border p-4.5 transition-all shadow-xs ${
          isUrgent
            ? "border-rose-400/90 bg-rose-500/10 ring-1 ring-rose-400"
            : "border-amber-400/80 bg-amber-500/10"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={`size-4.5 ${isUrgent ? "text-rose-600 animate-spin" : "text-amber-600"}`} />
            <span className="text-xs font-black tracking-wide text-amber-950 dark:text-amber-100">
              Store Acceptance Guarantee
            </span>
          </div>
          <span
            className={`font-mono text-xs font-black rounded-xl px-2.5 py-1 ${
              isUrgent ? "bg-rose-600 text-white animate-pulse" : "bg-amber-600 text-white"
            }`}
          >
            ⏱️ {formatted}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] font-medium text-amber-900/85 dark:text-amber-200/85 leading-relaxed">
          Store is reviewing your laundry items. If not accepted within 5 minutes, it will be automatically cancelled and refunded immediately.
        </p>
      </div>
    );
  }

  if (isRiderPending) {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const isUrgent = remaining <= 30;

    return (
      <div
        className={`mt-4 rounded-3xl border p-4.5 transition-all shadow-xs ${
          isUrgent
            ? "border-rose-400/90 bg-rose-500/10 ring-1 ring-rose-400"
            : "border-sky-400/80 bg-sky-500/10"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className={`size-4.5 ${isUrgent ? "text-rose-600 animate-spin" : "text-sky-600"}`} />
            <span className="text-xs font-black tracking-wide text-sky-950 dark:text-sky-100">
              Delivery Captain Dispatch Window
            </span>
          </div>
          <span
            className={`font-mono text-xs font-black rounded-xl px-2.5 py-1 ${
              isUrgent ? "bg-rose-600 text-white animate-pulse" : "bg-sky-600 text-white"
            }`}
          >
            ⏱️ {formatted}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] font-medium text-sky-900/85 dark:text-sky-200/85 leading-relaxed">
          Store accepted! Finding the nearest available delivery captain. If not confirmed within 2 minutes, order is automatically cancelled & refunded.
        </p>
      </div>
    );
  }

  return null;
}

function TrackOrderScreen() {
  useAuthGuard();
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [eta, setEta] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0]);
  const [cancelling, setCancelling] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeOrders, setActiveOrders] = useState<OrderDetail[]>([]);

  const [loading, setLoading] = useState(true);

  /* GET /api/orders/{id} + /tracking — polled every 20s until the order is
     delivered or cancelled, so the timeline advances from real backend data. */
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const load = async (initial: boolean) => {
      if (initial) setLoading(true);
      try {
        const next = await fetchOrderDetail(orderId, { signal: controller.signal, forceRefresh: !initial });
        if (!alive) return;
        setDetail(next);
        const live = toTracking(next as any);
        setTracking(live);
        setEta(live.etaMinutes);
        setError(null);
      } catch (err: any) {
        if (alive) {
          // If we already have detail loaded, do not flash error on background poll failure
          if (initial || !detail) {
            setError(err?.message || "Order not found in database. Check your order number or place a new order.");
            // Attempt to fetch active orders as fallback suggestion
            fetchActiveOrders({ signal: controller.signal })
              .then((actives) => {
                if (alive && actives.length > 0) setActiveOrders(actives);
              })
              .catch(() => {});
          }
        }
      } finally {
        if (alive && initial) {
          setLoading(false);
        }
      }
    };

    void load(true);
    const timer = window.setInterval(() => void load(false), 20_000);
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [orderId, reloadKey]);

  /* Sprint 5.5 — Socket.IO push. Order lifecycle events refresh the timeline
     instantly; the 20s poll above stays as an offline/fallback safety net. */
  const live = useCustomerOrderRealtime(orderId);
  useEffect(() => {
    if (!live.lastEvent) return;
    if (live.etaMinutes !== null) setEta(live.etaMinutes);
    playOrderBellNotificationSound();
    setReloadKey((key) => key + 1);
  }, [live.lastEvent]);

  const steps = detail?.timeline ?? tracking?.steps ?? [];
  const stageIndex = detail?.stageIndex ?? tracking?.stageIndex ?? 0;
  const cancelled = detail?.cancelled ?? false;
  const cancellable = detail?.cancellable ?? false;

  const progress = useMemo(
    () => (steps.length ? ((stageIndex + 1) / steps.length) * 100 : 0),
    [steps.length, stageIndex],
  );

  const current = steps[Math.min(stageIndex, Math.max(steps.length - 1, 0))];

  /** POST /api/orders/{id}/cancel — reason is mandatory. */
  const doCancel = async () => {
    setCancelling(true);
    try {
      const next = await cancelOrderWithReason(orderId, cancelReason);
      setDetail(next);
      setCancelOpen(false);
    } catch {
      setError("Cancellation failed. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-white dark:bg-zinc-950 scroll-smooth">
      <div className="relative mx-auto w-full max-w-md">
        <header className="sticky top-0 z-30 mx-auto w-full max-w-md flex items-center justify-between gap-3 px-4 py-3.5 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl border-none shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_3px_12px_-2px_rgba(0,0,0,0.35)]">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/home" });
              }
            }}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 hover:bg-accent active:scale-[0.94]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold tracking-tight text-foreground">
              Live tracking
            </p>
            <p className="truncate text-[10px] text-muted-foreground">Order #{orderId}</p>
          </div>
          <span className="size-10 shrink-0" />
        </header>

        {error || (!loading && !detail) ? (
          <div className="px-5 pt-6">
            <div className="card-soft border border-border px-5 py-10 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <XCircle className="size-6" />
              </span>
              <p className="mt-4 text-base font-black text-foreground">Order #{orderId} Not Found</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Database me is order number ka koi record nahi mila. Kripya naya order place karein ya number check karein.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                {activeOrders.length > 0 && activeOrders[0] ? (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left">
                    <p className="text-[11px] font-black uppercase tracking-wider text-primary">
                      Active Order Found
                    </p>
                    <p className="mt-1 text-xs text-foreground">
                      Aapka ek active order chal raha hai: <strong>#{activeOrders[0]?.code || activeOrders[0]?.id}</strong> ({activeOrders[0]?.statusLabel})
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = activeOrders[0]?.id || activeOrders[0]?.code;
                        if (targetId) {
                          navigate({
                            to: "/track/$orderId",
                            params: { orderId: targetId },
                          });
                        }
                      }}
                      className="mt-3 w-full rounded-xl bg-primary py-2.5 text-center text-xs font-bold text-primary-foreground shadow-sm hover:brightness-105 active:scale-[0.98]"
                    >
                      Track Order #{activeOrders[0]?.code || activeOrders[0]?.id} ➔
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  className="rounded-2xl border border-border bg-card px-6 py-3 text-xs font-bold text-foreground transition-all hover:bg-accent active:scale-[0.97]"
                >
                  Retry Search ↻
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/home" })}
                  className="rounded-full bg-gradient-to-r from-brand-green to-primary px-6 py-3.5 text-sm font-black tracking-tight text-background shadow-cta transition-transform duration-300 active:scale-[0.96]"
                >
                  Go to Home & Place Order ➔
                </button>
              </div>
            </div>
          </div>
        ) : loading && !detail ? (
          <>
            <TrackingSkeleton />
          </>
        ) : tracking ? (
          <div className="px-5 pb-44 pt-3">
            {/* Live Interactive Map */}
            <section className="">
              <div className="card-soft relative overflow-hidden border border-border">
                <div className="relative min-h-[260px] bg-muted">
                  {(() => {
                    const riderLat = live?.riderLocation?.lat ?? Number((detail?.rider as any)?.location?.latitude ?? (detail?.rider as any)?.latitude);
                    const riderLng = live?.riderLocation?.lng ?? Number((detail?.rider as any)?.location?.longitude ?? (detail?.rider as any)?.longitude);
                    const hasRiderLocation = Boolean(riderLat && riderLng && !isNaN(riderLat) && !isNaN(riderLng));

                    const partnerLat = Number((detail?.partner as any)?.latitude ?? (detail?.partner as any)?.location?.latitude);
                    const partnerLng = Number((detail?.partner as any)?.longitude ?? (detail?.partner as any)?.location?.longitude);
                    const hasPartnerLocation = Boolean(partnerLat && partnerLng && !isNaN(partnerLat) && !isNaN(partnerLng));

                    const custLat = Number((detail?.address as any)?.latitude);
                    const custLng = Number((detail?.address as any)?.longitude);
                    const hasCustLocation = Boolean(custLat && custLng && !isNaN(custLat) && !isNaN(custLng));

                    const riderCoord = hasRiderLocation
                      ? { lat: riderLat, lng: riderLng, label: "Delivery Captain (Live)" }
                      : null;

                    const partnerCoord = hasPartnerLocation
                      ? { lat: partnerLat, lng: partnerLng, label: (detail?.partner as any)?.name || "QuickPress Store" }
                      : null;

                    const custCoord = hasCustLocation
                      ? { lat: custLat, lng: custLng, label: "Your Location", sublabel: (detail?.address as any)?.street || "" }
                      : null;

                    return (
                      <LiveDeliveryMap
                        riderLocation={riderCoord}
                        destinationLocation={custCoord || partnerCoord}
                        storeLocation={partnerCoord}
                        phase={stageIndex <= 1 ? "pickup" : "delivery"}
                        heightClassName="h-64 sm:h-72"
                        showControls={true}
                      />
                    );
                  })()}
                </div>

                <div className="flex items-center gap-3 border-t border-border p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {tracking.etaLabel}
                    </p>
                    <p key={eta} className="animate-pop text-xl font-bold text-foreground">
                      {eta} min
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-brand-green">
                    <span className="size-1.5 animate-ping rounded-full bg-brand-green" /> Live
                  </span>
                </div>

                {/* Location Privacy Disclosure Link */}
                <div className="flex flex-wrap items-center justify-between border-t border-border/60 bg-muted/30 px-4 py-2 text-[10.5px] text-muted-foreground">
                  <span>Location is used to provide delivery tracking and operational updates.</span>
                  <Link
                    to="/legal/$docSlug"
                    params={{ docSlug: "privacy-policy" }}
                    className="font-bold text-primary hover:underline shrink-0 ml-1"
                  >
                    Privacy information →
                  </Link>
                </div>
              </div>
            </section>

            {/* Current status */}
            <section className="mt-6">
              <div className="card-soft border border-border p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                    <Navigation className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p key={current?.id || "status"} className="animate-pop text-sm font-bold text-foreground">
                      {current?.label || "Processing"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{tracking.liveNote}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Step {stageIndex + 1} of {steps.length}
                </p>
              </div>
            </section>

            {/* Live Order SLA Guarantee Tracker */}
            <LiveOrderSlaTracker detail={detail} />

            {/* Delivery Reassignment Notification Card */}
            {["delivery_reassignment_required", "handover_rider_assigned"].includes(
              (detail?.status || "").toLowerCase()
            ) && (
              <section className="mt-4">
                <div className="rounded-3xl border-2 border-amber-400 bg-amber-50/90 p-4.5 shadow-sm dark:bg-amber-950/40 dark:border-amber-500">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                      <Truck className="size-5 animate-pulse" />
                    </span>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
                        Delivery Partner Reassigned
                      </h4>
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        Emergency Handover in Progress
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                    Your previous delivery partner encountered a vehicle or emergency issue. A nearby QuickPress Captain has been prioritized to take over custody of your laundry to ensure safe and timely doorstep delivery.
                  </p>
                </div>
              </section>
            )}

            {/* Real OTP Display Card */}
            {(() => {
              const currentStatus = (detail?.status || "").toLowerCase();
              const isPickupPending =
                [
                  "pending_partner_acceptance",
                  "placed",
                  "partner_accepted",
                  "rider_searching",
                  "pickup_rider_assigned",
                  "rider_assigned",
                  "pickup_rider_accepted",
                  "rider_accepted",
                  "pickup_otp_pending",
                ].includes(currentStatus) && Boolean(detail?.otp?.pickup);
              const isDeliveryPending =
                ["out_for_delivery", "delivery_otp_pending"].includes(currentStatus) &&
                Boolean(detail?.otp?.delivery);

              if (isPickupPending && detail?.otp?.pickup) {
                return (
                  <section className="mt-6">
                    <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                            <ShieldCheck className="size-4.5" />
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                            Pickup Verification OTP
                          </span>
                        </div>
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                          Share at Doorstep
                        </span>
                      </div>

                      <div className="my-4 flex items-center justify-center gap-3">
                        {detail.otp.pickup.split("").map((digit, idx) => (
                          <span
                            key={idx}
                            className="flex size-12 items-center justify-center rounded-2xl border border-emerald-300/80 bg-white font-mono text-2xl font-black text-emerald-950 shadow-sm dark:bg-zinc-900 dark:text-white"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>

                      <p className="text-center text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Share this 4-digit code with the rider when they arrive to verify laundry handover.
                      </p>
                    </div>
                  </section>
                );
              }

              if (isDeliveryPending && detail?.otp?.delivery) {
                return (
                  <section className="mt-6">
                    <div className="relative overflow-hidden rounded-3xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-xl bg-blue-500 text-white shadow-xs">
                            <ShieldCheck className="size-4.5" />
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400">
                            Delivery Confirmation OTP
                          </span>
                        </div>
                        <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-black text-blue-700 dark:text-blue-300">
                          Confirm Delivery
                        </span>
                      </div>

                      <div className="my-4 flex items-center justify-center gap-3">
                        {detail.otp.delivery.split("").map((digit, idx) => (
                          <span
                            key={idx}
                            className="flex size-12 items-center justify-center rounded-2xl border border-blue-300/80 bg-white font-mono text-2xl font-black text-blue-950 shadow-sm dark:bg-zinc-900 dark:text-white"
                          >
                            {digit}
                          </span>
                        ))}
                      </div>

                      <p className="text-center text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Share this 4-digit code with your delivery partner to confirm receipt of your fresh laundry.
                      </p>
                    </div>
                  </section>
                );
              }

              return null;
            })()}

            {/* Rider card */}
            <section className="mt-6">
              <SectionHeading title="Your rider" />
              {(() => {
                const rName = detail?.rider?.name || tracking?.rider?.name;
                const isAssigned = Boolean(
                  detail?.rider?.assigned ||
                  (rName &&
                    rName !== "Rider not assigned yet" &&
                    rName !== "Assigning rider" &&
                    rName !== "Assigning" &&
                    !rName.toLowerCase().includes("not assigned") &&
                    !rName.toLowerCase().includes("assigning"))
                );

                if (!isAssigned) {
                  return (
                    <div className="relative mt-3 overflow-hidden rounded-3xl border border-brand-green/20 bg-gradient-to-br from-brand-green/[0.08] via-card to-card p-5 shadow-soft dark:border-brand-green/20 dark:from-brand-green/[0.10]">
                      {/* Ambient radar glow */}
                      <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-brand-green/10 blur-2xl" />

                      <div className="relative flex items-center gap-3.5">
                        {/* Radar pulse animation */}
                        <div className="relative flex size-13 shrink-0 items-center justify-center">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-green/25 opacity-75" />
                          <span className="absolute inline-flex size-9 animate-pulse rounded-full bg-brand-green/30" />
                          <span className="relative flex size-11 items-center justify-center rounded-2xl bg-brand-green text-white shadow-cta">
                            <Navigation className="size-5 animate-pulse" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-green">
                              <span className="size-1.5 animate-ping rounded-full bg-brand-green" />
                              Searching Nearby Captain
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-black text-foreground">
                            Finding nearest delivery partner...
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            Locating available QuickPress riders near your location
                          </p>
                        </div>
                      </div>

                      {/* Animated radar scanning bar */}
                      <div className="relative mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-green via-emerald-400 to-brand-green animate-pulse" />
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-brand-green" />
                          Usually assigned in 1-3 mins
                        </span>
                        <span className="font-bold text-brand-green">Live Radar Active</span>
                      </div>
                    </div>
                  );
                }

                const assignedRider = {
                  name: rName || "Delivery Captain",
                  vehicle: detail?.rider?.vehicle || tracking?.rider?.vehicle || "QuickPress Fleet",
                  plate: detail?.rider?.plate || tracking?.rider?.plate || "—",
                  rating: Number(detail?.rider?.rating || tracking?.rider?.rating || 4.9),
                  trips: String(detail?.rider?.trips || tracking?.rider?.trips || "100+ deliveries"),
                  phone: String(detail?.rider?.phone || tracking?.rider?.phone || ""),
                };

                return (
                  <div className="card-soft mt-3 border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-base font-bold text-brand-dark">
                        {assignedRider.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-foreground">
                            {assignedRider.name}
                          </p>
                          <BadgeCheck className="size-3.5 shrink-0 text-brand-green" />
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {assignedRider.vehicle} · {assignedRider.plate}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Star className="size-3 fill-primary text-primary" />
                          {assignedRider.rating} · {assignedRider.trips}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <a
                        href={assignedRider.phone ? `tel:${assignedRider.phone.replace(/\s/g, "")}` : "#"}
                        className="flex h-11 items-center justify-center gap-2 rounded-3xl bg-primary text-xs font-bold text-primary-foreground shadow-cta transition-all duration-300 active:scale-[0.97]"
                      >
                        <Phone className="size-4" /> Call rider
                      </a>
                      <a
                        href={
                          assignedRider.phone
                            ? `https://wa.me/${assignedRider.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Hi ${assignedRider.name}, I am reaching out regarding my QuickPress Order #${orderId}.`
                              )}`
                            : "#"
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-11 items-center justify-center gap-2 rounded-3xl border border-border bg-muted/60 text-xs font-bold text-foreground transition-all duration-300 hover:border-primary/60 active:scale-[0.97]"
                      >
                        <MessageCircle className="size-4 text-emerald-500" /> WhatsApp Chat
                      </a>
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* Timeline */}
            <section className="mt-8">
              <SectionHeading title="Order journey" />
              <div className="mt-4">
                {steps.map((step, index) => {
                  const done = index < stageIndex;
                  const active = index === stageIndex && !cancelled;
                  const last = index === steps.length - 1;
                  return (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                            done
                              ? "bg-brand-green text-background"
                              : active
                                ? "animate-pop bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {done ? (
                            <Check className="size-4" />
                          ) : active ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Clock className="size-3.5" />
                          )}
                        </span>
                        {!last ? (
                          <span
                            className={`w-0.5 flex-1 rounded-full transition-colors duration-500 ${
                              done ? "bg-brand-green/50" : "bg-border"
                            }`}
                          />
                        ) : null}
                      </div>
                      <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-6"}`}>
                        <p
                          className={`text-sm font-bold ${
                            done || active ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {step.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {cancelled && (
                  <div className="mt-4 flex gap-3 rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 p-3.5">
                    <div className="flex flex-col items-center">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">
                        ✕
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-rose-950 dark:text-rose-200">
                        Order Cancelled
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-rose-800 dark:text-rose-300">
                        {(detail as any)?.cancellationReason || detail?.cancelledReason || "Order was cancelled per platform SLA response guarantee."}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        💳 Refund status: Complete / Credited to QuickPress Wallet
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Rate & Review Card for Delivered Orders */}
            {stageIndex >= 3 || detail?.status === "delivered" ? (
              <section className="mt-6">
                <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                        <Star className="size-5 fill-white text-white" />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                          How was your experience?
                        </p>
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Rate {tracking.storeName} & your delivery rider
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(true)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-xs font-black text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 active:scale-[0.98]"
                  >
                    <Sparkles className="size-4" />
                    Leave Rating & Review
                  </button>
                </div>
              </section>
            ) : null}

            {/* Real Order Details: Items & Laundry Breakdown */}
            {detail?.items && detail.items.length > 0 ? (
              <section className="mt-8">
                <SectionHeading
                  title={`Order items (${detail.items.reduce((s, it) => s + (it.qty || 1), 0)})`}
                />
                <div className="card-soft mt-3 divide-y divide-border border border-border">
                  {detail.items.map((item, idx) => (
                    <div
                      key={item.id ? `${item.id}-${idx}` : `item-${idx}`}
                      className="flex items-center justify-between p-3.5 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-bold text-foreground truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Qty: {item.qty} × ₹{item.price}
                        </p>
                      </div>
                      <span className="shrink-0 font-bold text-foreground">
                        ₹{(item.qty || 1) * (item.price || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Real Bill Summary */}
            {detail?.totals ? (
              <section className="mt-6">
                <SectionHeading title="Bill summary" />
                <div className="card-soft mt-3 border border-border p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Items total</span>
                    <span className="font-semibold text-foreground">₹{detail.totals.itemsTotal ?? 0}</span>
                  </div>
                  {(detail.totals.pickup ?? 0) > 0 ? (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Pickup fee</span>
                      <span className="font-semibold text-foreground">₹{detail.totals.pickup}</span>
                    </div>
                  ) : null}
                  {(detail.totals.delivery ?? 0) > 0 ? (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Delivery fee</span>
                      <span className="font-semibold text-foreground">₹{detail.totals.delivery}</span>
                    </div>
                  ) : null}
                  {(detail.totals.handling ?? 0) > 0 ? (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Handling fee</span>
                      <span className="font-semibold text-foreground">₹{detail.totals.handling}</span>
                    </div>
                  ) : null}
                  {(detail.totals.gst ?? 0) > 0 ? (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Taxes & GST</span>
                      <span className="font-semibold text-foreground">₹{detail.totals.gst}</span>
                    </div>
                  ) : null}
                  {(detail.totals.discount ?? 0) > 0 ? (
                    <div className="flex items-center justify-between text-brand-green font-medium">
                      <span>Discount</span>
                      <span>-₹{detail.totals.discount}</span>
                    </div>
                  ) : null}
                  {(detail.totals as any).couponDiscount && (detail.totals as any).couponDiscount > 0 ? (
                    <div className="flex items-center justify-between text-brand-green font-medium">
                      <span>Coupon discount</span>
                      <span>-₹{(detail.totals as any).couponDiscount}</span>
                    </div>
                  ) : null}

                  <div className="border-t border-border pt-2.5 mt-2 flex items-center justify-between font-black text-sm text-foreground">
                    <span>Total Amount</span>
                    <span className="text-brand-green font-black text-base">₹{detail.totals.grandTotal ?? 0}</span>
                  </div>

                  {detail.payment ? (
                    <div className="mt-2.5 pt-2.5 border-t border-dashed border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Payment:</span>
                        <span className="text-xs font-bold text-foreground">{detail.payment.label || "QuickPress"}</span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          detail.payment.paid
                            ? "bg-brand-green/10 text-brand-green border border-brand-green/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}
                      >
                        {detail.payment.paid ? "Paid" : "Pay on delivery"}
                      </span>
                    </div>
                  ) : null}

                  {/* Tax Invoice View & Download — not available for cancelled orders */}
                  {detail.status !== "cancelled" ? (
                    <div className="mt-3 pt-2.5 border-t border-dashed border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="size-3.5 text-brand-green" />
                        <span>Official GST Bill</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const invKey = detail.code || orderId;
                          void navigate({
                            to: "/invoices/$invoiceId",
                            params: { invoiceId: invKey },
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green/10 px-3 py-1.5 text-xs font-black text-brand-green hover:bg-brand-green/20 active:scale-95 transition-all shadow-xs"
                      >
                        <Download className="size-3.5" />
                        <span>Download Tax Invoice</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* Transparent Rupee Split & Ethical Commission Breakdown */}
            <section className="mt-4">
              <div className="rounded-2xl border border-brand-green/25 bg-gradient-to-br from-brand-green/5 via-background to-background p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-xl bg-brand-green text-background font-black text-xs shadow-xs">
                      ₹
                    </div>
                    <div>
                      <h3 className="text-xs font-black tracking-tight text-foreground">
                        Where Does Your Payment Go?
                      </h3>
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        100% Ethical & Fair Payout Transparency
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[9px] font-black text-brand-green border border-brand-green/20">
                    Verified Split
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-500" />
                      <span>Local Store Partner (Care & Washing)</span>
                    </span>
                    <span className="font-bold text-foreground">
                      ₹{Math.max(1, Math.round(((detail?.totals?.itemsTotal || 149) * 0.84) * 100) / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span>Delivery Captain (100% Fare Payout)</span>
                    </span>
                    <span className="font-bold text-foreground">
                      ₹{Math.max(35, Number((detail?.totals?.delivery || 45) + (detail?.totals?.pickup || 0))).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500" />
                      <span>Govt GST & Statutory Taxes</span>
                    </span>
                    <span className="font-bold text-foreground">
                      ₹{Number(detail?.totals?.gst || 12.5).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-purple-500" />
                      <span>QuickPress Platform & Safety</span>
                    </span>
                    <span className="font-bold text-foreground">
                      ₹{Math.max(15, Number((detail?.totals?.handling || 15) + Math.round(((detail?.totals?.itemsTotal || 149) * 0.15) * 100) / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Pickup & Delivery Schedule */}
            {detail?.pickup || detail?.delivery ? (
              <section className="mt-6">
                <SectionHeading title="Scheduled time slots" />
                <div className="card-soft mt-3 grid grid-cols-2 gap-2.5 border border-border p-3.5">
                  <div className="rounded-2xl bg-muted/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Pickup Slot
                    </p>
                    <p className="mt-1 text-xs font-black text-foreground">
                      {detail.pickup?.date || "Today"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {detail.pickup?.slot || "Standard Slot"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Delivery Est.
                    </p>
                    <p className="mt-1 text-xs font-black text-foreground">
                      {detail.delivery?.date || "Scheduled"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {detail.delivery?.slot || "Standard Slot"}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Delivery address */}
            <section className="mt-6">
              <SectionHeading title="Delivery address" />
              <div className="card-soft mt-3 flex items-start gap-3 border border-border p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                  <MapPin className="size-4" />
                </span>
                <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground">
                  {tracking.address}
                </p>
              </div>
            </section>

            {/* Partner + support */}
            <section className="mt-6 space-y-2.5">
              <div className="card-soft flex items-center gap-3 border border-border p-3">
                <img
                  src={tracking.storeImage}
                  alt={`${tracking.storeName} storefront`}
                  loading="lazy"
                  className="size-12 shrink-0 rounded-2xl object-cover"
                  decoding="async"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{tracking.storeName}</p>
                  <p className="text-[11px] text-muted-foreground">Handling your order</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>

              <button
                type="button"
                className="card-soft flex w-full items-center gap-3 border border-border p-4 text-left transition-all duration-300 hover:border-primary/60 active:scale-[0.985]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                  <Headphones className="size-4" />
                </span>
                <p className="min-w-0 flex-1 text-sm font-bold text-foreground">Need help?</p>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>

              {cancelled ? (
                <div className="card-soft flex items-center gap-3 border border-border p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <XCircle className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-destructive">Order cancelled</p>
                    {detail?.cancelledReason ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {detail.cancelledReason}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : cancellable ? (
                <div className="card-soft border border-border p-4">
                  <button
                    type="button"
                    onClick={() => setCancelOpen((open) => !open)}
                    className="flex w-full items-center gap-3 text-left transition-all duration-300 active:scale-[0.985]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                      <XCircle className="size-4" />
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-bold text-destructive">
                      Cancel order
                    </p>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>

                  {cancelOpen ? (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Why are you cancelling?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {CANCEL_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setCancelReason(reason)}
                            aria-pressed={cancelReason === reason}
                            className={`rounded-full px-3 py-2 text-[11px] font-bold tracking-tight transition-all duration-300 active:scale-[0.95] ${
                              cancelReason === reason
                                ? "bg-primary/15 text-brand-dark"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => void doCancel()}
                        disabled={cancelling}
                        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-3xl bg-destructive text-xs font-bold text-background transition-all duration-300 active:scale-[0.97] disabled:opacity-60"
                      >
                        {cancelling ? <Loader2 className="size-4 animate-spin" /> : null}
                        Confirm cancellation
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="card-soft flex items-start gap-3 border border-border p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <XCircle className="size-4" />
                  </span>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    This order can no longer be cancelled — your laundry is already with the
                    partner. Contact support for help.
                  </p>
                </div>
              )}

              <div className="card-soft flex items-start gap-3 border border-border p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                  <ShieldCheck className="size-4" />
                </span>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Every QuickPress order is insured under our fabric care guarantee.
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {/* Sticky bottom bar */}
      {tracking && current ? (
        <div className="fixed inset-x-0 bottom-0 z-30">
          <div className="mx-auto w-full max-w-md px-4 pb-4">
            <div className="glass-panel animate-sheet-up flex items-center gap-3 rounded-3xl p-3 shadow-soft">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-tight text-foreground">
                  {current.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{eta} min away</p>
              </div>
              <Link
                to="/history"
                className="ripple ml-auto flex h-12 flex-1 items-center justify-center gap-2 rounded-3xl bg-primary text-sm font-bold text-primary-foreground shadow-cta transition-all duration-300 hover:brightness-[1.03] active:scale-[0.97]"
              >
                <Truck className="size-4" /> My Orders
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {reviewModalOpen && tracking ? (
        <OrderReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          orderId={orderId}
          partnerName={tracking.storeName}
          riderName={tracking.rider?.name}
          onSuccess={() => {
            setReloadKey((k) => k + 1);
            toast.success("Thank you for your rating!");
          }}
        />
      ) : null}
    </main>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>;
}
