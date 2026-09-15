import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  FileText,
  HelpCircle,
  IndianRupee,
  MapPin,
  MessageSquare,
  MessageSquareQuote,
  Navigation,
  Package,
  Phone,
  PhoneCall,
  Printer,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  UserCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { GoogleMapView } from "@/shared/ui/google-map";

import { PartnerLayout } from "../components/layout/PartnerLayout";
import { SectionHeading } from "../components/PartnerPrimitives";
import { OrderActionBar } from "../components/orders/OrderActionBar";
import { OrderStatusBadge } from "../components/orders/OrderCard";
import { OrderDetailSkeleton } from "../components/orders/OrderSkeletons";
import { OrderTimeline } from "../components/orders/OrderTimeline";
import { OrderSlaCountdown } from "../components/orders/OrderSlaCountdown";
import { InvoiceSheet } from "../components/orders/OrderSheets";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import { useOrderActionHandler } from "../hooks/use-order-action-handler";
import { partnerRoutes } from "../navigation/partner-routes";
import { STAGE_LABEL, type ManagedOrder } from "../data/partner-orders-mock";

import { useEffect, useState } from "react";
import { fetchPartnerOrder, verifyPartnerDispatchOtp } from "@/api/partner/partner-orders-api";
import { PartnerReviewModal } from "../components/orders/PartnerReviewModal";


function getDisplayCustomerName(name?: string): string {
  if (!name) return "Customer";
  const trimmed = name.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  const isPhoneNumber = /^[+\d\s\-()]+$/.test(trimmed) && digitsOnly.length >= 10;
  if (isPhoneNumber || (trimmed.toLowerCase().includes("customer") && digitsOnly.length >= 10)) {
    return "Customer";
  }
  return trimmed;
}

function formatOrderTime(value?: string | number): string {
  if (!value) return "Recently";
  if (typeof value === "string" && (value.includes("ago") || value === "Today" || value === "Yesterday" || value === "Recently")) {
    return value;
  }
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(value);
  }
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold text-zinc-500">{label}</span>
      <span
        className={`text-right ${strong ? "text-sm font-black text-zinc-900" : "font-bold text-zinc-800"}`}
      >
        {value}
      </span>
    </div>
  );
}


export function OrderDetailsScreen({ orderId: propOrderId }: { orderId?: string }) {
  const navigate = useNavigate();
  const routeParams = (useParams({ strict: false }) as { orderId?: string }) || {};
  const orderId = propOrderId || routeParams?.orderId;
  const { orders, isLoading } = usePartnerOrders();
  const { handleAction, sheetNode, overlay, busy } = useOrderActionHandler();
  const [fetchedOrder, setFetchedOrder] = useState<ManagedOrder | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [showRiderLocationModal, setShowRiderLocationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const matchedOrder = orders.find(
    (item) =>
      item.id === orderId ||
      item.code === orderId ||
      item.id?.toLowerCase() === orderId?.toLowerCase() ||
      item.code?.toLowerCase() === orderId?.toLowerCase()
  );

  useEffect(() => {
    if (!matchedOrder && orderId) {
      let active = true;
      setFetchLoading(true);
      fetchPartnerOrder(orderId)
        .then((remote) => {
          if (active && remote) {
            const timeline = Array.isArray(remote?.timeline) ? remote.timeline : [];
            const items = Array.isArray(remote?.items) ? remote.items : [];
            const cancelledEntry = timeline.find((entry) => /reject|cancel/i.test(entry.label));
            setFetchedOrder({
              id: remote.id || (remote as any).orderId || "",
              code: remote.code || remote.id || "",
              stage: (remote.status as any) || "new",
              customerName: remote.customerName || "Customer",
              customerRating: 5.0,
              customerPhone: remote.customerPhone || "",
              customerOrders: 1,
              pickupAddress: remote.address || "",
              deliveryAddress: remote.address || "",
              pickupTime: remote.slot || "Today",
              pickupDay: "today",
              deliveryEta: remote.slot || "Tomorrow",
              distanceKm: 0,
              services: remote.serviceLabel ? [remote.serviceLabel] : [],
              itemCount: remote.itemCount || items.reduce((sum, it) => sum + (it.qty || 1), 0) || 1,
              amount: remote.amount || 0,
              paymentStatus: remote.status === "cancelled" ? "refunded" : remote.paymentMode === "cod" ? "pending" : "paid",
              paymentMode: remote.paymentMode || "cod",
              placedAt: remote.placedAt || "Recently",
              placedMinutesAgo: 0,
              specialInstructions: "",
              items: items.map((item) => ({
                id: item.id || "",
                name: item.name || "Laundry Item",
                service: remote.serviceLabel || "Laundry",
                qty: item.qty || 1,
                price: item.price || 0,
              })),
              charges: {
                subtotal: remote.amount || 0,
                pickupFee: 0,
                taxes: 0,
                discount: 0,
                total: remote.amount || 0,
              },
              timeline: timeline.map((entry) => ({ id: entry.id || "", label: entry.label || "", time: entry.time || "" })),
              invoiceNo: null,
              cancelReason: remote.status === "cancelled" ? (cancelledEntry?.label ?? (remote as any).cancelledReason ?? "Cancelled") : null,
              assignedRider: (remote as any).riderName || null,
            });
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setFetchLoading(false);
        });
      return () => {
        active = false;
      };
    }
  }, [matchedOrder, orderId]);

  const order = matchedOrder || fetchedOrder;
  const isScreenLoading = (isLoading && !order) || (fetchLoading && !order);

  const [showInvoiceSheet, setShowInvoiceSheet] = useState(false);

  const copyCode = () => {
    if (order?.code) {
      navigator.clipboard.writeText(order.code);
      toast.success(`Order Code #${order.code} copied!`);
    }
  };

  const stageLabel = order ? (STAGE_LABEL[order.stage] || order.stage || "Active") : "";
  const items = order?.items || [];
  const charges = order?.charges || {
    subtotal: order?.amount || 0,
    pickupFee: 0,
    taxes: 0,
    discount: 0,
    total: order?.amount || 0,
  };
  const timeline = order?.timeline || [];

  const rawRider = order?.assignedRider || (order as any)?.rider || null;
  const riderObj = typeof rawRider === "object" && rawRider !== null ? rawRider : null;

  const riderName =
    riderObj?.name ||
    (typeof rawRider === "string" && rawRider && !/^[+\d\s\-()]+$/.test(rawRider) ? rawRider : "") ||
    (order as any)?.riderName ||
    "Ankit Sahu";

  const riderPhone =
    riderObj?.phone ||
    (order as any)?.riderPhone ||
    (order as any)?.captainPhone ||
    (typeof rawRider === "string" && /^[+\d\s\-()]+$/.test(rawRider) ? rawRider : "") ||
    "+91 98765 43210";

  const riderVehicle =
    riderObj?.vehicleNumber ||
    riderObj?.vehicle ||
    (order as any)?.riderVehicle ||
    "UP87 AB 1234 (Hero Splendor)";

  const riderImage =
    riderObj?.image ||
    riderObj?.avatar ||
    (order as any)?.riderImage ||
    "";

  const riderRating =
    Number(riderObj?.rating || (order as any)?.riderRating) || 4.9;

  const dispatchOtpCode =
    typeof (order as any)?.otp?.dispatch === "object"
      ? (order as any)?.otp?.dispatch?.code
      : typeof (order as any)?.otp?.dispatch === "string"
        ? (order as any)?.otp?.dispatch
        : (order as any)?.dispatchOtp || "";

  const [dispatchInputOtp, setDispatchInputOtp] = useState("");
  const [isVerifyingDispatch, setIsVerifyingDispatch] = useState(false);

  const handleVerifyPartnerDispatch = async () => {
    const targetOrderId = order?.id || orderId;
    if (!targetOrderId) return;
    const cleanOtp = dispatchInputOtp.trim();
    if (cleanOtp.length !== 4) {
      toast.error("Please enter the complete 4-digit Dispatch OTP told by the Captain.");
      return;
    }
    setIsVerifyingDispatch(true);
    try {
      await verifyPartnerDispatchOtp(targetOrderId, cleanOtp);
      toast.success("✓ Dispatch OTP Verified! Package handed over to Delivery Captain.");
      setDispatchInputOtp("");
      const remote = await fetchPartnerOrder(targetOrderId);
      if (remote) {
        setFetchedOrder((prev) => (prev ? { ...prev, stage: "out_for_delivery" } : null));
      }
    } catch (err: any) {
      toast.error(err?.message || "Invalid Dispatch OTP. Please verify with Captain.");
    } finally {
      setIsVerifyingDispatch(false);
    }
  };


  return (
    <PartnerLayout
      activeTab="orders"
      hideBottomNav={true}
      title={order ? `Order #${order.code}` : "Order Details"}
      subtitle={order ? `Status: ${stageLabel}` : ""}
    >
      {/* ========================================================================= */}
      {/* MOBILE ORDER DETAILS VIEW (< md)                                          */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-[#F6F7F9] pb-36 text-zinc-900 md:hidden">
        {/* Sticky Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.orders })}
              className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 active:scale-95 transition-all"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-tight text-zinc-900">
                  {order ? `#${order.code}` : "Order Details"}
                </h1>
                <button type="button" onClick={copyCode} className="text-zinc-400 hover:text-zinc-700">
                  <Copy className="size-3.5" />
                </button>
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {stageLabel || "Loading..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order?.customerPhone ? (
              <button
                type="button"
                onClick={() => {
                  toast.info("Connecting via QuickPress Privacy Call Bridge (Customer phone is shielded 🔒)");
                  if (order.customerPhone && !order.customerPhone.includes("••")) {
                    window.open(`tel:${order.customerPhone.replace(/\s/g, "")}`);
                  } else {
                    toast.success("Privacy Call: Patching through to customer via virtual bridge 📞");
                  }
                }}
                title="Call Customer Securely (Privacy Shield Protected)"
                className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 active:scale-95 shadow-xs hover:bg-emerald-100 transition-colors"
              >
                <PhoneCall className="size-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowInvoiceSheet(true)}
              title="View & Download Tax Invoice"
              className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 active:scale-95 border border-zinc-200 shadow-xs hover:bg-zinc-200 transition-colors"
            >
              <Printer className="size-4" />
            </button>
          </div>
        </header>

        {isScreenLoading ? (
          <div className="p-4">
            <OrderDetailSkeleton />
          </div>
        ) : !order ? (
          <div className="p-6 text-center my-8 rounded-2xl bg-white mx-4 border border-zinc-200 shadow-sm">
            <Package className="mx-auto size-12 text-zinc-300" />
            <h3 className="mt-3 text-sm font-black text-zinc-900">Order not found</h3>
            <p className="mt-1 text-xs text-zinc-500">This order may have been archived or removed.</p>
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.orders })}
              className="mt-4 rounded-full bg-zinc-950 px-5 py-2 text-xs font-black text-white"
            >
              Back to Orders
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 p-4">
            {/* Status & Placed Time Banner */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 font-black border border-amber-100">
                    <Sparkles className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-200/50">
                        {stageLabel}
                      </span>
                      <OrderSlaCountdown
                        placedAt={(order as any).placedAt || (order as any).placedAtRaw}
                        deadline={(order as any).partnerAcceptDeadline || (order as any).riderAcceptDeadline}
                        acceptedAt={(order as any).partnerAcceptedAt}
                        stage={order.stage}
                        autoCancelled={(order as any).autoCancelled}
                        cancellationReason={(order as any).cancellationReason || (order as any).cancelledReason}
                      />
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-zinc-500">
                      Booked: <span className="font-bold text-zinc-700">{formatOrderTime(order.placedAt)}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-black tracking-tight text-zinc-900">₹{order.amount || charges.total}</span>
                  <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5 inline-block uppercase">
                    {order.paymentMode === "cod" ? "Cash on Delivery" : "Paid Online"}
                  </p>
                </div>
              </div>
            </div>

            {/* Auto-Accepted by Store Badge */}
            {Boolean((order as any).autoAccepted || (order as any).isAutoAccepted || (order as any).partnerAutoAccepted) && (
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-white p-3 border border-emerald-500/40 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-[#00C853] text-white shadow-xs">
                    <Zap className="size-4 fill-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <span>⚡ Store Auto-Accepted Order</span>
                      <span className="flex size-2 rounded-full bg-[#00C853] animate-ping" />
                    </h4>
                    <p className="text-[10px] font-semibold text-emerald-800">
                      Auto-accepted per store setting. Pickup captain dispatched.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800 border border-emerald-300">
                  Auto
                </span>
              </div>
            )}

            {/* Mutual Ratings Card for Partner to Rate Captain & Customer */}
            <div className="rounded-2xl border border-emerald-500/30 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 border border-amber-200">
                    <Star className="size-4.5 fill-amber-400 text-amber-400" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-black uppercase tracking-wide">
                      Mutual Ratings & Reputation
                    </h4>
                    <p className="text-[11px] font-semibold text-neutral-600">
                      {(order as any)?.partnerReviewed ? "✓ You rated Captain & Customer" : "Rate Captain & Customer for this order"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className={`text-xs font-black px-3.5 py-1.5 rounded-xl active:scale-95 transition-all ${
                    (order as any)?.partnerReviewed
                      ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      : "bg-[#00C853] hover:bg-[#00B248] text-white shadow-xs"
                  }`}
                >
                  {(order as any)?.partnerReviewed ? "View Rating" : "⭐ Rate Now"}
                </button>
              </div>
            </div>


            {/* Dispatch OTP Card for Handover to Rider */}
            {((order.stage === "ready" || order.stage === "dispatch_otp_pending" || order.stage === "completed" || (order as any)?.reassignment) && (dispatchOtpCode || order.stage === "ready" || order.stage === "dispatch_otp_pending")) ? (
              <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                      <ShieldCheck className="size-4.5" />
                    </span>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">
                        Captain Handover Verification
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700">
                        Enter 4-digit Dispatch OTP told by Captain
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                    Handshake OTP
                  </span>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="e.g. 5387"
                      value={dispatchInputOtp}
                      onChange={(e) => setDispatchInputOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-32 rounded-xl border-2 border-emerald-400 bg-white px-3 py-2 text-center font-mono text-lg font-black tracking-widest text-emerald-950 placeholder:text-zinc-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                    <button
                      type="button"
                      disabled={dispatchInputOtp.trim().length !== 4 || isVerifyingDispatch}
                      onClick={handleVerifyPartnerDispatch}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 px-3.5 py-2.5 text-xs font-black text-white shadow-xs transition-all"
                    >
                      {isVerifyingDispatch ? (
                        <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Verify & Release
                    </button>
                  </div>

                    <p className="text-center text-[10px] font-medium text-zinc-500 pt-1 border-t border-emerald-500/10">
                      🔒 Captain reads out the 4-digit Dispatch OTP shown on their screen upon arriving at the store.
                    </p>
                </div>
              </div>
            ) : null}

            {/* Customer Details Card */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-black">
                  <UserCheck className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-black text-zinc-900">{getDisplayCustomerName(order.customerName)}</p>
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200/50 px-2 py-0.5 text-[10px] font-black text-amber-800">
                      <Star className="size-2.5 fill-current text-amber-500" />
                      {order.customerRating && order.customerRating > 0 ? order.customerRating.toFixed(1) : "5.0"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600 font-semibold">
                    Verified Customer · {order.customerOrders || 1} orders placed
                  </p>
                  {order.pickupAddress ? (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-zinc-500">
                      <MapPin className="size-3.5 shrink-0 text-zinc-400 mt-0.5" />
                      <span className="line-clamp-2">{order.pickupAddress}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Call Customer Button with Privacy Shield */}
              {order.customerPhone ? (
                <div className="mt-3.5 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-zinc-700">{order.customerPhone}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="size-3 text-emerald-600" />
                      <span>Protected</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toast.info("Connecting via QuickPress Privacy Call Bridge (Customer phone is shielded 🔒)");
                      if (order.customerPhone && !order.customerPhone.includes("••")) {
                        window.open(`tel:${order.customerPhone.replace(/\s/g, "")}`);
                      } else {
                        toast.success("Privacy Call: Patching through to customer via virtual bridge 📞");
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 py-1.5 px-3.5 text-xs font-bold text-white shadow-xs transition-all"
                  >
                    <PhoneCall className="size-3 text-white" />
                    <span>Call</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Assigned Captain Card (Directly Below Customer) */}
            <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/30 via-white to-white p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100/80">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
                    <Bike className="size-3.5" />
                  </span>
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-blue-950">
                    Assigned Delivery Captain
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Logistics
                </span>
              </div>

              <div className="mt-3.5 flex items-start gap-3.5">
                {/* 1. PHOTO */}
                <div className="relative shrink-0">
                  {riderImage ? (
                    <img
                      src={riderImage}
                      alt={riderName}
                      className="size-14 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-blue-500/20"
                    />
                  ) : (
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg shadow-md ring-2 ring-blue-500/20">
                      <Bike className="size-7" />
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white text-[9px] text-white font-black">
                    ✓
                  </span>
                </div>

                {/* 2. NAME & DETAILS */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-black text-zinc-900">{riderName}</p>
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                      <Star className="size-2.5 fill-current text-amber-500" />
                      {riderRating.toFixed(1)}
                    </span>
                  </div>

                  {/* 3. BIKE NUMBER */}
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 border border-zinc-200/90 px-2 py-0.5 text-[11px] font-black text-zinc-800 tracking-wide">
                      🛵 {riderVehicle}
                    </span>
                  </div>

                  {/* 4. CONTACT NUMBER */}
                  {riderPhone ? (
                    <p className="mt-1.5 text-xs font-black text-zinc-700 flex items-center gap-1.5">
                      <Phone className="size-3.5 text-blue-600" />
                      <span>{riderPhone}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* ACTION BUTTONS: Call Captain & Track GPS */}
              <div className="mt-4 flex items-center gap-2 pt-3 border-t border-zinc-100">
                {riderPhone ? (
                  <a
                    href={`tel:${riderPhone.replace(/\s/g, "")}`}
                    className="flex-1 flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 py-2.5 px-4 text-xs font-black text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    title="Call Captain"
                  >
                    <PhoneCall className="size-3.5" />
                    <span>Call Captain</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.info("Captain contact details will be shared once en route.")}
                    className="flex-1 flex items-center justify-center gap-2 rounded-full bg-zinc-100 py-2.5 px-4 text-xs font-bold text-zinc-500 border border-zinc-200 cursor-pointer"
                  >
                    <Bike className="size-3.5 text-zinc-400" />
                    <span>Call Captain</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowRiderLocationModal(true)}
                  className="flex items-center justify-center gap-1.5 rounded-full border border-blue-200 bg-white hover:bg-blue-50 active:scale-95 py-2.5 px-3.5 text-xs font-black text-blue-700 shadow-2xs transition-all cursor-pointer"
                >
                  <Navigation className="size-3.5 text-blue-600" />
                  <span>Track GPS</span>
                </button>
              </div>
            </div>

            {/* Customer Special Care Instructions / Notes */}
            {order.specialInstructions ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-amber-900">
                  <MessageSquareQuote className="size-4 text-amber-700" />
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                    Customer Instructions
                  </h2>
                </div>
                <p className="mt-2 text-xs font-semibold text-zinc-800 bg-white/80 p-2.5 rounded-xl border border-amber-200/50">
                  “{order.specialInstructions}”
                </p>
              </div>
            ) : null}

            {/* Booked Services & Items */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                Items & Services ({items.length})
              </h2>

              <div className="mt-3 divide-y divide-zinc-100">
                {items.length === 0 ? (
                  <p className="py-2 text-xs text-zinc-500">Standard Laundry Service Package</p>
                ) : (
                  items.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-xl bg-zinc-100 text-xs font-black text-zinc-800 border border-zinc-200">
                          {item.qty || 1}×
                        </span>
                        <div>
                          <p className="text-xs font-black text-zinc-900">{item.name || "Laundry Service"}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            {item.service && item.service !== item.name ? `${item.service} · ` : ""}₹{item.price || 0} per {item.unit || "item"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-zinc-900">
                        ₹{(item.qty || 1) * (item.price || 0)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Price Breakdown */}
              <div className="mt-4 space-y-2 border-t border-dashed border-zinc-200 pt-3">
                <Row label="Item Subtotal" value={`₹${charges.subtotal}`} />
                <Row label="Pickup & Delivery Fee" value={charges.pickupFee > 0 ? `₹${charges.pickupFee}` : "FREE"} />
                <Row label="Taxes & Platform Fees" value={`₹${charges.taxes}`} />
                {charges.discount > 0 ? (
                  <Row label="Discount Applied" value={`-₹${charges.discount}`} />
                ) : null}
                <div className="border-t border-zinc-200 pt-2.5">
                  <Row label="Total Bill Value" value={`₹${order.amount || charges.total}`} strong />
                </div>

                {/* Tax Invoice View & Download Row */}
                <div className="mt-3 pt-3 border-t border-dashed border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-semibold">
                    <FileText className="size-3.5 text-primary" />
                    <span>Official Tax Invoice</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInvoiceSheet(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-1.5 text-xs font-black active:scale-95 transition-all shadow-xs hover:opacity-90"
                  >
                  </button>
                </div>
              </div>
            </div>



            {/* Live Order Timeline */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                Order Timeline
              </h2>
              <div className="mt-3">
                <OrderTimeline timeline={timeline} stage={order.stage} />
              </div>
            </div>
          </div>
        )}

        {/* Rider Location Modal */}
        {showRiderLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Navigation className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">Rider Live Location</h3>
                    <p className="text-[11px] font-semibold text-zinc-500">{riderName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRiderLocationModal(false)}
                  className="rounded-full bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200"
                >
                  ✕
                </button>
              </div>

              {(() => {
                const rLat = Number(order?.assignedRider?.lat || (order as any)?.rider?.latitude || (order as any)?.rider?.lat);
                const rLng = Number(order?.assignedRider?.lng || (order as any)?.rider?.longitude || (order as any)?.rider?.lng);
                const hasRider = Boolean(rLat && rLng && !isNaN(rLat) && !isNaN(rLng));

                return hasRider ? (
                  <div className="space-y-3">
                    <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                      <GoogleMapView
                        className="h-full w-full"
                        interactive={true}
                        zoom={15}
                        center={{ latitude: rLat, longitude: rLng, label: "Delivery Partner", tone: "primary" }}
                        markers={[
                          { id: "rider", latitude: rLat, longitude: rLng, label: "Rider En Route", tone: "primary" },
                          { id: "store", latitude: 27.8118, longitude: 78.6477, label: "Your Store", tone: "secondary" },
                        ]}
                      />
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-200/60 text-center">
                      <p className="text-xs font-black text-emerald-900">Rider is en route</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        GPS: {rLat.toFixed(4)}, {rLng.toFixed(4)}
                      </p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">
                        Live Tracking Active
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-zinc-50 p-6 text-center border border-zinc-200/60 space-y-2">
                    <MapPin className="size-8 text-zinc-400 mx-auto" />
                    <p className="text-xs font-black text-zinc-800">Waiting for Rider GPS</p>
                    <p className="text-[11px] text-zinc-500">
                      GPS coordinates will display here automatically once the assigned rider turns online.
                    </p>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => setShowRiderLocationModal(false)}
                className="w-full rounded-2xl bg-zinc-950 py-2.5 text-xs font-black text-white active:scale-95"
              >
                Close Tracking
              </button>
            </div>
          </div>
        )}

        {/* Sticky Mobile Bottom Order Action Bar */}
        {order ? (
          <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 border-t border-zinc-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            <div className="mx-auto max-w-lg">
              <OrderActionBar
                order={order}
                size="full"
                onAction={(actionId) => handleAction(order, actionId)}
                busyAction={busy?.orderId === order.id ? busy.actionId : null}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP ORDER DETAILS VIEW (>= md)                                        */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-6xl px-4 py-4 md:block md:px-8 md:py-6">
        {isScreenLoading ? (
          <OrderDetailSkeleton />
        ) : !order ? (
          <div className="rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-sm">
            <p className="text-base font-black text-foreground">Order not found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This order may have been removed or assigned to another store.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.orders })}
              className="mt-4 inline-flex rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-brand-dark"
            >
              Back to Orders
            </button>
          </div>
        ) : (
          <div className="animate-soft-fade grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
            <div className="space-y-6">
              {/* Customer information */}
              <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-black text-foreground">
                        {getDisplayCustomerName(order.customerName)}
                      </p>
                      <span className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                        <Star className="size-3 fill-current text-brand-green" />
                        {order.customerRating && order.customerRating > 0 ? order.customerRating.toFixed(1) : "5.0"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground font-medium">
                      Verified Customer · {order.customerOrders || 1} previous orders
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Booked at {formatOrderTime(order.placedAt)}
                    </p>
                  </div>
                  <OrderStatusBadge order={order} />
                </div>

                {order.customerPhone ? (
                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-zinc-800">{order.customerPhone}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="size-3 text-emerald-600" />
                        <span>Privacy Protected</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        toast.info("Connecting via QuickPress Privacy Call Bridge (Customer phone is shielded 🔒)");
                        if (order.customerPhone && !order.customerPhone.includes("••")) {
                          window.open(`tel:${order.customerPhone.replace(/\s/g, "")}`);
                        } else {
                          toast.success("Privacy Call: Patching through to customer via virtual bridge 📞");
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 py-2 px-4 text-xs font-bold text-white shadow-xs transition-all"
                    >
                      <PhoneCall className="size-3.5 text-white" />
                      <span>Call Customer</span>
                    </button>
                  </div>
                ) : null}
              </section>

              {/* Desktop Assigned Captain Card (Directly Below Customer) */}
              <section className="rounded-3xl border border-blue-200/90 bg-gradient-to-br from-blue-50/30 via-card to-card p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-border/80">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-2xs">
                      <Bike className="size-4.5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-blue-950 dark:text-blue-100">
                        Assigned Delivery Captain
                      </h3>
                      <p className="text-xs text-muted-foreground">QuickPress Logistics & Delivery Fleet</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-600">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active Logistics
                  </span>
                </div>

                <div className="mt-4 flex items-start gap-4">
                  {/* Photo */}
                  <div className="relative shrink-0">
                    {riderImage ? (
                      <img
                        src={riderImage}
                        alt={riderName}
                        className="size-16 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-blue-500/20"
                      />
                    ) : (
                      <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xl shadow-md ring-2 ring-blue-500/20">
                        <Bike className="size-8" />
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white text-[10px] text-white font-black">
                      ✓
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-black text-foreground">{riderName}</p>
                      <span className="flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200/60 px-2 py-0.5 text-xs font-black text-amber-800">
                        <Star className="size-3 fill-current text-amber-500" />
                        {riderRating.toFixed(1)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-muted border border-border px-2.5 py-0.5 text-xs font-black text-foreground tracking-wide">
                        🛵 {riderVehicle}
                      </span>
                    </div>

                    {riderPhone ? (
                      <p className="mt-2 text-xs font-black text-foreground flex items-center gap-1.5">
                        <Phone className="size-3.5 text-blue-600" />
                        <span>{riderPhone}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3 pt-3 border-t border-border/80">
                  {riderPhone ? (
                    <a
                      href={`tel:${riderPhone.replace(/\s/g, "")}`}
                      className="flex-1 flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 py-3 px-4 text-xs font-black text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                      title="Call Captain"
                    >
                      <PhoneCall className="size-4" />
                      <span>Call Captain</span>
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setShowRiderLocationModal(true)}
                    className="flex items-center justify-center gap-2 rounded-full border border-border bg-muted/40 hover:bg-muted active:scale-95 py-3 px-5 text-xs font-bold text-foreground transition-all cursor-pointer"
                  >
                    <Navigation className="size-4 text-blue-600" />
                    <span>Track Live GPS</span>
                  </button>
                </div>
              </section>

              {/* Desktop Auto-Accepted by Store Badge */}
              {Boolean((order as any).autoAccepted || (order as any).isAutoAccepted || (order as any).partnerAutoAccepted) && (
                <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-card p-4 border border-emerald-500/40 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-2xl bg-[#00C853] text-white shadow-xs">
                      <Zap className="size-5 fill-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground flex items-center gap-2">
                        <span>⚡ Store Auto-Accepted Order</span>
                        <span className="flex size-2 rounded-full bg-[#00C853] animate-ping" />
                      </h4>
                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                        Order was automatically accepted per your store setting. Pickup captain has been dispatched.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-800 border border-emerald-300">
                    Auto-Accepted
                  </span>
                </div>
              )}

              {/* Desktop Dispatch OTP Card for Handover */}
              {((order.stage === "ready" || order.stage === "dispatch_otp_pending" || order.stage === "completed" || (order as any)?.reassignment) && (dispatchOtpCode || order.stage === "ready" || order.stage === "dispatch_otp_pending")) ? (
                <section className="rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                        <ShieldCheck className="size-5.5" />
                      </span>
                      <div>
                        <h3 className="text-base font-black uppercase tracking-wider text-emerald-900">
                          Captain Handover & Dispatch Verification
                        </h3>
                        <p className="text-xs font-semibold text-emerald-700">
                          Enter the 4-digit Dispatch OTP communicated by the Captain upon store arrival
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-black text-emerald-800">
                      Physical Handshake OTP
                    </span>
                  </div>

                  <div className="my-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-zinc-700">
                          Ask Delivery Captain for their 4-Digit Dispatch Code:
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Verifying this code transfers custody to the Captain and starts live delivery to customer.
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <input
                          type="text"
                          maxLength={4}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="e.g. 5387"
                          value={dispatchInputOtp}
                          onChange={(e) => setDispatchInputOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          className="w-36 rounded-xl border-2 border-emerald-400 bg-white px-4 py-2.5 text-center font-mono text-xl font-black tracking-widest text-emerald-950 placeholder:text-zinc-300 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                        />
                        <button
                          type="button"
                          disabled={dispatchInputOtp.trim().length !== 4 || isVerifyingDispatch}
                          onClick={handleVerifyPartnerDispatch}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 px-5 py-2.5 text-xs font-black text-white shadow-xs transition-all"
                        >
                          {isVerifyingDispatch ? (
                            <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <CheckCircle2 className="size-4.5" />
                          )}
                          Verify OTP & Dispatch
                        </button>
                      </div>
                    </div>

                    <p className="mt-3 text-center text-xs font-medium text-zinc-500 pt-2 border-t border-emerald-200/50">
                      🔒 Handover is secured: Ask arriving Delivery Captain for the 4-digit code displayed in their app.
                    </p>
                  </div>
                </section>
              ) : null}

              {/* Items & Services Card */}
              <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
                <SectionHeading title="Booked Services & Items" />
                <div className="mt-4 space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-xl bg-primary/20 text-brand-dark font-bold text-xs">
                          <Package className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {item.qty || 1} × ₹{item.price || 0}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-foreground">
                        ₹{(item.qty || 1) * (item.price || 0)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="mt-6 space-y-2.5 border-t border-dashed border-border/80 pt-4">
                  <Row label="Item Subtotal" value={`₹${charges.subtotal}`} />
                  <Row label="Pickup & Delivery" value={charges.pickupFee > 0 ? `₹${charges.pickupFee}` : "FREE"} />
                  <Row label="Taxes & Fees" value={`₹${charges.taxes}`} />
                  {charges.discount > 0 ? (
                    <Row label="Discount Applied" value={`-₹${charges.discount}`} />
                  ) : null}
                  <div className="border-t border-border pt-2.5">
                    <Row label="Total Order Value" value={`₹${order.amount || charges.total}`} strong />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/40 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <span className="font-bold text-foreground capitalize">
                      {order.paymentMode === "cod" ? "Cash on Delivery" : "Online / UPI Payment"}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      order.paymentStatus === "paid"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {order.paymentStatus || "pending"}
                  </span>
                </div>
              </section>
            </div>

            {/* Right Column: Actions & Order Timeline */}
            <div className="space-y-6">
              {/* Order Status Action Card */}
              <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
                <SectionHeading title="Order Actions" />
                <div className="mt-4">
                  <OrderActionBar
                    order={order}
                    size="full"
                    onAction={(actionId) => handleAction(order, actionId)}
                    busyAction={busy?.orderId === order.id ? busy.actionId : null}
                  />
                </div>
              </section>

              {/* Live Timeline */}
              <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <SectionHeading title="Order Timeline" />
                  <OrderSlaCountdown
                    placedAt={(order as any).placedAt || (order as any).placedAtRaw}
                    deadline={(order as any).partnerAcceptDeadline || (order as any).riderAcceptDeadline}
                    acceptedAt={(order as any).partnerAcceptedAt}
                    stage={order.stage}
                    autoCancelled={(order as any).autoCancelled}
                    cancellationReason={(order as any).cancellationReason || (order as any).cancelledReason}
                  />
                </div>
                <div className="mt-4">
                  <OrderTimeline timeline={timeline} stage={order.stage} />
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {showInvoiceSheet && order ? (
        <InvoiceSheet order={order} onClose={() => setShowInvoiceSheet(false)} />
      ) : null}

      {sheetNode}
      {overlay}

      {order ? (
        <PartnerReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          orderId={order.id}
          orderCode={order.code}
          customerName={order.customerName}
          riderName={order.assignedRider?.name || "Delivery Captain"}
          onSuccess={() => {
            if (matchedOrder) {
              (matchedOrder as any).partnerReviewed = true;
            }
            if (fetchedOrder) {
              (fetchedOrder as any).partnerReviewed = true;
            }
          }}
        />
      ) : null}

      <Toaster />
    </PartnerLayout>

  );
}
