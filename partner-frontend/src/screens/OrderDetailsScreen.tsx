import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
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
  MoreVertical,
  Navigation,
  Package,
  Phone,
  PhoneCall,
  Printer,
  Share2,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  User,
  UserCheck,
  Zap,
  Camera,
  X,
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
import { OrderFlowCard } from "../components/orders/OrderFlowCard";
import { OrderSlaCountdown } from "../components/orders/OrderSlaCountdown";
import { InvoiceSheet } from "../components/orders/OrderSheets";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import { useOrderActionHandler } from "../hooks/use-order-action-handler";
import { partnerRoutes } from "../navigation/partner-routes";
import { STAGE_LABEL, formatOrderPlacedTime, type ManagedOrder } from "../data/partner-orders-mock";

import { useEffect, useRef, useState } from "react";
import { fetchPartnerOrder, verifyPartnerDispatchOtp } from "@/api/partner/partner-orders-api";
import { subscribePartnerOrders } from "@/lib/partner-socket";
import { PartnerReviewModal } from "../components/orders/PartnerReviewModal";
import { PrewashDefectModal } from "../components/orders/PrewashDefectModal";
import type { GarmentDefect } from "@/shared/types/partner";


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

function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length >= 10) {
    const last2 = digits.slice(-2);
    const first2 = digits.slice(0, 2);
    return `+91 ${first2}••• ••${last2}`;
  }
  return "+91 ••••• •••••";
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

function Row({
  label,
  value,
  strong = false,
  strikeThrough = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  strikeThrough?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-semibold text-zinc-500">{label}</span>
      <span
        className={`text-right ${
          strikeThrough
            ? "line-through text-zinc-400 font-bold"
            : strong
            ? "text-sm font-black text-zinc-900"
            : "font-bold text-zinc-800"
        }`}
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
  const { orders, isLoading, confirmHandover, confirmedHandoverIds } = usePartnerOrders();
  const { handleAction, sheetNode, overlay, busy } = useOrderActionHandler();
  const [fetchedOrder, setFetchedOrder] = useState<ManagedOrder | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [showRiderLocationModal, setShowRiderLocationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState(1200);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatPrepTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? "0" : ""}${remSecs}`;
  };

  const matchedOrder = orders.find(
    (item) =>
      item.id === orderId ||
      item.code === orderId ||
      item.id?.toLowerCase() === orderId?.toLowerCase() ||
      item.code?.toLowerCase() === orderId?.toLowerCase()
  );

  useEffect(() => {
    if (!orderId) return;
    let active = true;

    const fetchOrder = () => {
      fetchPartnerOrder(orderId)
        .then((remote) => {
          if (active && remote) {
            const timeline = Array.isArray(remote?.timeline) ? remote.timeline : [];
            const items = Array.isArray(remote?.items) ? remote.items : [];
            const cancelledEntry = timeline.find((entry) => /reject|cancel/i.test(entry.label));
            const rawStatus = String(remote.status || (remote as any).canonicalStatus || "").toLowerCase();
            const normalizedStage =
              rawStatus === "at_store" ||
              rawStatus === "at_partner" ||
              rawStatus === "at-store" ||
              rawStatus === "at-partner" ||
              rawStatus === "store_received" ||
              rawStatus === "store_drop_confirmed"
                ? "at_partner"
                : rawStatus === "processing_started" || rawStatus === "processing" || rawStatus === "washing" || rawStatus === "sorting" || rawStatus === "dry_cleaning" || rawStatus === "ironing" || rawStatus === "drying"
                ? "processing"
                : rawStatus === "ready_for_delivery" || rawStatus === "ready" || rawStatus === "packed" || rawStatus === "processing_completed"
                ? "ready"
                : rawStatus === "out_for_delivery" || rawStatus === "delivery_otp_pending" || rawStatus === "dispatch_otp_verified"
                ? "out_for_delivery"
                : rawStatus === "delivered"
                ? "delivered"
                : rawStatus === "completed"
                ? "completed"
                : rawStatus === "cancelled" || rawStatus === "store_rejected" || rawStatus === "payment_failed"
                ? "cancelled"
                : rawStatus === "refund_pending" || rawStatus === "refunded"
                ? "refunded"
                : (remote.status as any) || "new";

            setFetchedOrder({
              id: remote.id || (remote as any).orderId || "",
              code: remote.code || remote.id || "",
              stage: normalizedStage,
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
              cancelReason: (remote.status === "cancelled" || (remote as any).canonicalStatus === "cancelled" || (remote as any).canonicalStatus === "refunded") ? (cancelledEntry?.label ?? (remote as any).cancelledReason ?? "Cancelled") : null,
              assignedRider: (remote as any).riderName || null,
              garmentDefects: Array.isArray((remote as any).garmentDefects)
                ? (remote as any).garmentDefects
                : Array.isArray((remote as any).garment_defects)
                ? (remote as any).garment_defects
                : [],
              hasDefectsReported: Boolean(
                (remote as any).hasDefectsReported ||
                ((remote as any).garmentDefects && (remote as any).garmentDefects.length > 0) ||
                ((remote as any).garment_defects && (remote as any).garment_defects.length > 0)
              ),
            });
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (active) setFetchLoading(false);
        });
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 3500);

    const unsub = subscribePartnerOrders((data) => {
      const changedId = data?.orderId || data?.id || data?._id || data?.code;
      if (!changedId || changedId === orderId) {
        fetchOrder();
      }
    });

    return () => {
      active = false;
      clearInterval(interval);
      unsub();
    };
  }, [orderId]);

  const order = fetchedOrder || matchedOrder;
  const isScreenLoading = (isLoading && !order) || (fetchLoading && !order);

  const [showInvoiceSheet, setShowInvoiceSheet] = useState(false);

  const copyCode = () => {
    if (order?.code) {
      navigator.clipboard.writeText(order.code);
    }
  };

  const stageLabel = order ? (STAGE_LABEL[order.stage] || order.stage || "Active") : "";
  const placedInfo = formatOrderPlacedTime((order as any)?.placedAt || (order as any)?.placedAtRaw || order?.placedAt);
  const items = order?.items || [];
  const totalGarmentPieces = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const charges = order?.charges || {
    subtotal: order?.amount || 0,
    pickupFee: 0,
    taxes: 0,
    discount: 0,
    total: order?.amount || 0,
  };
  const timeline = order?.timeline || [];

  const rawRider = order?.assignedRider || (order as any)?.rider || (order as any)?.assigned_rider || null;
  const riderObj = typeof rawRider === "object" && rawRider !== null ? rawRider : null;

  const hasAssignedRider = Boolean(
    (riderObj && (riderObj.name || riderObj.id || riderObj.phone)) ||
    (typeof rawRider === "string" && rawRider.trim().length > 0 && !["pending", "unassigned", "none", "null"].includes(rawRider.trim().toLowerCase())) ||
    ((order as any)?.riderName && String((order as any).riderName).trim().length > 0)
  );

  const isOrderCancelled = Boolean(
    order?.stage === "cancelled" ||
    order?.stage === "rejected" ||
    (order as any)?.status === "cancelled" ||
    (order as any)?.status === "rejected" ||
    Boolean(order?.cancelReason)
  );

  const riderName =
    riderObj?.name ||
    (typeof rawRider === "string" ? rawRider : "") ||
    (order as any)?.riderName ||
    "Delivery Captain";

  const riderPhone =
    riderObj?.phone ||
    (order as any)?.riderPhone ||
    (order as any)?.captainPhone ||
    (typeof rawRider === "string" && /^[+\d\s\-()]+$/.test(rawRider) ? rawRider : "") ||
    "";

  const riderVehicle =
    riderObj?.vehicleNumber ||
    riderObj?.vehicle ||
    (order as any)?.riderVehicle ||
    "";

  const riderImage =
    riderObj?.image ||
    riderObj?.avatar ||
    (order as any)?.riderImage ||
    "";

  const rawStatus = String((order as any)?.status || (order as any)?.canonicalStatus || "").toLowerCase().trim();
  const isRiderHandedOver = Boolean(
    order?.stage === "at_partner" ||
    rawStatus === "at_partner" ||
    rawStatus === "at_store" ||
    rawStatus === "store_received" ||
    rawStatus === "store_drop_confirmed" ||
    (order as any)?.riderHandoverInitiated === true ||
    Boolean((order as any)?.droppedAtPartnerAt || (order as any)?.droppedAtStoreAt) ||
    (order as any)?.custody === "partner" ||
    (order as any)?.custody === "partner_store"
  );

  const isPartnerHandoverConfirmed = Boolean(
    (order as any)?.partnerHandoverConfirmed ||
    (order && confirmedHandoverIds?.has(order.id)) ||
    rawStatus === "store_received"
  );

  const isAwaitingCaptainDrop = Boolean(order && (order.stage === "accepted" || order.stage === "pickup_pending") && !isRiderHandedOver);
  const isReadyToConfirmHandover = Boolean(order && isRiderHandedOver && !isPartnerHandoverConfirmed);
  const isReadyToStartProcessing = Boolean(order && ((isRiderHandedOver && isPartnerHandoverConfirmed) || (order.stage === "at_partner" && isPartnerHandoverConfirmed)));

  const riderRating =
    riderObj?.rating ? Number(riderObj.rating) : null;

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
      <div className="min-h-screen bg-zinc-50/50 pb-28 text-zinc-900 md:hidden">
        {/* Sticky Mobile Header matching Zomato Merchant Detail */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white px-4 border-b border-zinc-200/90 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.orders })}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-800 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Back to Orders Queue"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tight text-zinc-950 truncate">
                ID: {order ? (order.code || order.id.slice(-4)) : (orderId ? orderId.slice(-4) : "4002")}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-zinc-600">
              {placedInfo.time || "8:03 PM"}
            </span>

            {/* Kebab 3-Dots Action Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex size-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors cursor-pointer"
                title="More Actions"
              >
                <MoreVertical className="size-4.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl z-50 text-xs animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowInvoiceSheet(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-bold text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <FileText className="size-3.5 text-zinc-500" />
                    <span>View Tax Invoice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      if (order?.customerPhone) {
                        window.open(`tel:${order.customerPhone.replace(/\s/g, "")}`);
                      }
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-bold text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <Phone className="size-3.5 text-emerald-600" />
                    <span>Call Customer</span>
                  </button>
                  {riderPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        window.open(`tel:${riderPhone.replace(/\s/g, "")}`);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-bold text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      <Bike className="size-3.5 text-blue-600" />
                      <span>Call Captain ({riderName})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setIsDefectModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-bold text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <Camera className="size-3.5 text-amber-600" />
                    <span>Tag Pre-Wash Defect</span>
                  </button>
                  <div className="my-1 border-t border-zinc-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate({ to: partnerRoutes.help, search: { orderCode: order?.code, orderId: order?.id } as any });
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <HelpCircle className="size-3.5 text-rose-600" />
                    <span>Report Issue / Support</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {isScreenLoading ? (
          <div className="p-4">
            <OrderDetailSkeleton />
          </div>
        ) : !order ? (
          <div className="p-6 text-center my-8 rounded-2xl bg-white mx-4 border border-zinc-200 shadow-2xs">
            <Package className="mx-auto size-12 text-zinc-300" />
            <h3 className="mt-3 text-sm font-black text-zinc-950">Order not found</h3>
            <p className="mt-1 text-xs text-zinc-500">This order may have been archived or removed.</p>
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.orders })}
              className="mt-4 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-black text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            >
              Back to Orders
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 p-4">
            {/* ================================================================= */}
            {/* EXACT ZOMATO MERCHANT ORDER TICKET CARD                           */}
            {/* ================================================================= */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm">
              {/* Row 1: ID, Placed Time, Kebab 3-dots */}
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-zinc-950 tracking-tight">
                  ID: {order.code || order.id.slice(-4) || "4002"}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-600">
                    {placedInfo.time || "8:03 PM"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="flex size-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                </div>
              </div>

              {/* Row 2: Status Pill & Customer Loyalty Info */}
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="rounded bg-[#5B63D3] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  {order.stage === "processing" || order.stage === "washing"
                    ? "PREPARING"
                    : order.stage === "ready"
                    ? "READY"
                    : order.stage === "out_for_delivery"
                    ? "OUT FOR DELIVERY"
                    : order.stage === "delivered"
                    ? "DELIVERED"
                    : order.stage === "cancelled"
                    ? "CANCELLED"
                    : "ACTIVE"}
                </span>
                <span className="text-xs font-bold text-[#0284c7]">
                  {order.customerOrders || 4}th order by {getDisplayCustomerName(order.customerName)}
                </span>
              </div>

              {/* Row 3: Special Care Tag (Rose Border Pill) */}
              <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50/25 px-3 py-2 flex items-center gap-2 text-xs text-rose-700">
                <span className="text-sm shrink-0">🧺</span>
                <span className="font-medium truncate">
                  {order.specialInstructions || "Handle with care · Fold neatly & pack in eco-friendly laundry bag"}
                </span>
              </div>

              {/* Row 4: Itemized Garments List with Iconic Green Square Indicator */}
              <div className="mt-3.5 space-y-2 border-t border-zinc-100 pt-3">
                {items.length === 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex size-3.5 items-center justify-center rounded-[2px] border border-emerald-600 p-[1.5px] shrink-0">
                        <span className="size-1.5 rounded-full bg-emerald-600" />
                      </span>
                      <span className="font-bold text-zinc-900">
                        1 x Premium Laundry Package
                      </span>
                    </div>
                    <span className="font-mono font-bold text-zinc-900 tabular-nums">
                      ₹{Number(order.amount || 200).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  items.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="flex size-3.5 items-center justify-center rounded-[2px] border border-emerald-600 p-[1.5px] shrink-0">
                          <span className="size-1.5 rounded-full bg-emerald-600" />
                        </span>
                        <span className="font-bold text-zinc-900 truncate">
                          {item.qty || 1} x {item.name || "Men's Formal Shirt (Wash & Iron)"}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-zinc-900 tabular-nums shrink-0">
                        ₹{((item.qty || 1) * (item.price || 50)).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Row 5: Total Bill & Payment Badge */}
              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowInvoiceSheet(true)}
                    className="text-xs font-semibold text-zinc-700 underline decoration-dashed underline-offset-4 cursor-pointer hover:text-black"
                  >
                    Total bill
                  </button>
                  <span className="rounded border border-teal-500/80 bg-teal-50/50 px-1.5 py-0.2 text-[10px] font-black uppercase text-teal-700">
                    {order.paymentMode === "cod" ? "COD" : "PAID"}
                  </span>
                </div>
                <span className="font-mono text-base font-black text-zinc-950 tabular-nums">
                  ₹{Number(order.amount || charges.total || 0).toFixed(2)}
                </span>
              </div>

              {/* Row 6: Live Delivery Fleet Captain Strip */}
              <div className="mt-3.5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">🛵</span>
                  <span className="font-medium truncate">
                    {hasAssignedRider
                      ? `Captain ${riderName} assigned · En route`
                      : "5 riders nearby, assigning one soon"}
                  </span>
                </div>
                {hasAssignedRider && riderPhone && (
                  <a
                    href={`tel:${riderPhone.replace(/\s/g, "")}`}
                    className="shrink-0 text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Phone className="size-3" />
                    <span>Call</span>
                  </a>
                )}
              </div>

              {/* Row 7: Prominent Primary Action Button */}
              {!isOrderCancelled && (
                <div className="mt-3.5">
                  <button
                    type="button"
                    disabled={Boolean(busy) || isAwaitingCaptainDrop}
                    onClick={() => {
                      if (order.stage === "new") handleAction(order, "accept");
                      else if (isAwaitingCaptainDrop) {
                        toast.info(riderName ? `🛵 Clothes are with Captain ${riderName}. Awaiting store drop.` : "🛵 Captain is picking up clothes. Awaiting drop.");
                      } else if (isReadyToConfirmHandover) {
                        void confirmHandover(order.id);
                      } else if (isReadyToStartProcessing || order.stage === "accepted" || order.stage === "at_partner") {
                        handleAction(order, "start_wash");
                      } else if (order.stage === "processing" || order.stage === "washing") {
                        handleAction(order, "mark_ready");
                      } else if (order.stage === "ready") {
                        const input = document.getElementById("mobile-dispatch-otp-input");
                        if (input) input.focus();
                        else toast.info("Enter Captain's 4-digit Dispatch OTP to handover");
                      }
                    }}
                    className={`w-full rounded-xl py-3 text-center text-sm font-black text-white shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                      isAwaitingCaptainDrop
                        ? "bg-amber-600/90 border border-amber-500 cursor-not-allowed shadow-none"
                        : isReadyToConfirmHandover
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30 animate-pulse cursor-pointer"
                        : "bg-[#1D4ED8] hover:bg-[#1E40AF] cursor-pointer"
                    }`}
                  >
                    {busy?.orderId === order.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Updating...</span>
                      </span>
                    ) : order.stage === "new" ? (
                      <span>Accept Order</span>
                    ) : isAwaitingCaptainDrop ? (
                      <span className="flex items-center justify-center gap-1.5 text-xs font-bold truncate px-1">
                        <span className="shrink-0 text-sm">🛵</span>
                        <span className="truncate">{riderName ? `Captain ${riderName} En Route · Awaiting Store Drop` : "Assigning Captain · Awaiting Store Drop 📦"}</span>
                      </span>
                    ) : isReadyToConfirmHandover ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span>📦</span>
                        <span>Confirm Handover from Captain</span>
                      </span>
                    ) : isReadyToStartProcessing || order.stage === "accepted" || order.stage === "at_partner" ? (
                      <span>Start Processing 🧺</span>
                    ) : order.stage === "processing" || order.stage === "washing" ? (
                      <span>Order ready ({formatPrepTime(countdown)})</span>
                    ) : order.stage === "ready" ? (
                      <span>Handover to Captain 🛵</span>
                    ) : (
                      <span>View Order Status</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Pre-Wash Defect Inspection Proofs (if reported) */}
            {order.garmentDefects && order.garmentDefects.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-amber-600" />
                    Pre-Wash Inspection Proofs ({order.garmentDefects.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDefectModalOpen(true)}
                    className="text-[10px] font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer"
                  >
                    + Add Photo
                  </button>
                </div>
                <div className="space-y-2">
                  {order.garmentDefects.map((def) => {
                    const isApproved = def.customer_status === "proceed_wash";
                    const isReturn = def.customer_status === "return_unwashed";
                    return (
                      <div
                        key={def.defect_id}
                        className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/40 p-2.5 shadow-2xs"
                      >
                        <img
                          src={def.photo_url}
                          alt={def.item_name}
                          onClick={() => setViewingPhotoUrl(def.photo_url)}
                          className="size-14 rounded-lg object-cover border border-zinc-200 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-zinc-950 truncate">{def.item_name}</p>
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
                              {def.defect_type.replace(/_/g, " ")}
                            </span>
                          </div>
                          {def.description && (
                            <p className="text-[10px] text-zinc-600 mt-0.5 line-clamp-2">
                              Note: {def.description}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="size-2.5" /> Wash Approved
                              </span>
                            ) : isReturn ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                <AlertCircle className="size-2.5" /> Return Item As-Is
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300/80">
                                <Clock className="size-2.5" /> Awaiting Customer
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions (if any) */}
            {order.specialInstructions && (
              <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 text-zinc-900">
                  <MessageSquareQuote className="size-4 text-zinc-700" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-zinc-950">
                    Customer Care Notes
                  </h2>
                </div>
                <p className="mt-2 text-xs font-semibold text-zinc-800 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  “{order.specialInstructions}”
                </p>
              </div>
            )}

            {/* 2. CUSTOMER DETAILS CARD (PURE WHITE) */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
                    <UserCheck className="size-4" />
                  </span>
                  <h2 className="text-xs font-black uppercase tracking-wider text-zinc-950">
                    Customer Information
                  </h2>
                </div>
                <span className="flex items-center gap-0.5 rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-800">
                  <Star className="size-2.5 fill-amber-400 text-amber-500" />
                  {order.customerRating && order.customerRating > 0 ? order.customerRating.toFixed(1) : "5.0"}
                </span>
              </div>

              <div className="mt-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-zinc-950 truncate">
                    {getDisplayCustomerName(order.customerName)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 font-medium">
                    Verified Customer · {order.customerOrders || 1} orders placed
                  </p>
                </div>
                {order.customerPhone ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (order.customerPhone && !order.customerPhone.includes("••")) {
                        window.open(`tel:${order.customerPhone.replace(/\s/g, "")}`);
                      }
                    }}
                    title="Call Customer"
                    aria-label="Call Customer"
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 active:scale-95 shadow-2xs transition-all cursor-pointer"
                  >
                    <PhoneCall className="size-4 text-emerald-700" />
                  </button>
                ) : null}
              </div>

              {/* Pickup Address Box */}
              <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-zinc-50 border border-zinc-200 p-2.5">
                <MapPin className="size-4 shrink-0 text-zinc-600 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Doorstep Pickup Address</p>
                    {((order as any)?.isAddressMasked || order.stage === "delivered" || (order as any)?.status === "delivered") ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200/80 px-1.5 py-0.2 text-[9px] font-bold text-zinc-700">
                        🔒 DPDP Protected
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-bold text-zinc-900 leading-snug mt-0.5">
                    {order.pickupAddress || order.address || "Customer Doorstep Address"}
                  </p>
                  {order.pickupTime ? (
                    <p className="text-[10px] font-medium text-zinc-500 mt-0.5">
                      Slot: <strong className="text-zinc-800">{order.pickupTime}</strong>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 4. DELIVERY FLEET CAPTAIN CARD (PURE WHITE) */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200">
                    <Bike className="size-4" />
                  </span>
                  <h2 className="text-xs font-black uppercase tracking-wider text-zinc-950">
                    Delivery Fleet Captain
                  </h2>
                </div>
                {hasAssignedRider ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Assigned
                  </span>
                ) : isOrderCancelled ? (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-600">
                    Not Assigned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-800">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Assigning...
                  </span>
                )}
              </div>

              {hasAssignedRider ? (
                <div className="mt-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      {riderImage ? (
                        <img
                          src={riderImage}
                          alt={riderName}
                          className="size-11 rounded-xl object-cover border border-zinc-200"
                        />
                      ) : (
                        <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 font-black text-sm border border-zinc-200">
                          {riderName ? riderName.charAt(0).toUpperCase() : <Bike className="size-5" />}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-black text-zinc-950 truncate">{riderName}</p>
                        {riderRating ? (
                          <span className="flex items-center gap-0.5 rounded-full bg-zinc-100 border border-zinc-200 px-1.5 py-0.2 text-[10px] font-black text-zinc-800">
                            <Star className="size-2.5 fill-amber-400 text-amber-500" />
                            {riderRating.toFixed(1)}
                          </span>
                        ) : null}
                      </div>

                      {riderVehicle ? (
                        <p className="text-[10px] font-bold text-zinc-600 mt-0.5">
                          🛵 {riderVehicle}
                        </p>
                      ) : null}

                      <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-800">
                        <ShieldCheck className="size-3 text-emerald-600 shrink-0" />
                        <span>Verified QuickPress Captain</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Call & GPS Track */}
                  <div className="flex items-center gap-2 shrink-0">
                    {riderPhone ? (
                      <a
                        href={`tel:${riderPhone.replace(/\s/g, "")}`}
                        className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 active:scale-95 shadow-2xs transition-all cursor-pointer"
                        title="Call Captain"
                      >
                        <PhoneCall className="size-4 text-emerald-700" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setShowRiderLocationModal(true)}
                      className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 active:scale-95 text-zinc-800 shadow-2xs transition-all cursor-pointer"
                      title="Track Live GPS"
                    >
                      <Navigation className="size-4 text-zinc-700" />
                    </button>
                  </div>
                </div>
              ) : isOrderCancelled ? (
                <div className="py-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-500 shrink-0">
                    <Bike className="size-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-950">Rider Not Assigned</p>
                    <p className="text-[11px] text-zinc-500">
                      Order was closed before a delivery captain was dispatched to store.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-800 shrink-0">
                    <Bike className="size-5 text-zinc-600 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-950">Locating Nearest Captain...</p>
                    <p className="text-[11px] text-zinc-500">
                      Auto-assigning closest delivery captain in your store zone.
                    </p>
                  </div>
                </div>
              )}

              {/* Handover OTP Verification (if ready/dispatch pending) */}
              {((order.stage === "ready" || order.stage === "dispatch_otp_pending" || order.stage === "completed") && (dispatchOtpCode || order.stage === "ready" || order.stage === "dispatch_otp_pending")) ? (
                <div className="mt-3.5 pt-3 border-t border-zinc-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600">
                      Captain Handover Verification
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold text-zinc-800 border border-zinc-200">
                      Dispatch OTP
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="e.g. 5387"
                      value={dispatchInputOtp}
                      onChange={(e) => setDispatchInputOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-28 rounded-xl border-2 border-zinc-950 bg-white px-3 py-2 text-center font-mono text-base font-black tracking-widest text-zinc-950 placeholder:text-zinc-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={dispatchInputOtp.trim().length !== 4 || isVerifyingDispatch}
                      onClick={handleVerifyPartnerDispatch}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 px-3.5 py-2.5 text-xs font-black text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      {isVerifyingDispatch ? (
                        <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Verify & Release
                    </button>
                  </div>

                  {/* Point 4: GPS Proximity Custody Indicator */}
                  {((order as any)?.custodyAudit?.proximityVerified || (order as any)?.custodyAudit?.proximityMeters) ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                      <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Captain Proximity Verified: Inside Store Zone (~{Math.round((order as any)?.custodyAudit?.proximityMeters || 120)}m)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
                      <MapPin className="size-3 text-zinc-400 shrink-0" />
                      <span>GPS Geofence Proximity &amp; Dispatch OTP Handshake Protected</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* 4. ORDER HELP & REVIEWS STRIP (PURE WHITE) */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.help, search: { orderCode: order.code, orderId: order.id } as any })}
                className="flex items-center gap-2.5 rounded-2xl border border-zinc-200/90 bg-white p-3 text-left shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
                  <HelpCircle className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-zinc-950 leading-tight">Order Help</p>
                  <p className="text-[10px] text-zinc-500 font-medium">Issue or dispute</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowReviewModal(true)}
                className="flex items-center gap-2.5 rounded-2xl border border-zinc-200/90 bg-white p-3 text-left shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
                  <Star className="size-4.5 fill-amber-400 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-zinc-950 leading-tight">
                    {(order as any)?.partnerReviewed ? "View Rating" : "Rate Order"}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-medium">Captain & Customer</p>
                </div>
              </button>
            </div>

            {/* 5. ORDER PROGRESSION TIMELINE */}
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-950 pb-3 border-b border-zinc-100">
                Order Timeline
              </h2>
              <div className="mt-3">
                <OrderTimeline order={order} timeline={timeline} stage={order.stage} />
              </div>
            </div>
          </div>
        )}

        {/* Sticky Mobile Bottom Order Action Bar (Only for Active Orders) */}
        {order && !isOrderCancelled ? (
          <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 border-t border-zinc-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <div className="mx-auto max-w-lg">
              <OrderActionBar
                order={order}
                size="compact"
                onAction={(actionId) => handleAction(order, actionId)}
                busyAction={busy?.orderId === order.id ? busy.actionId : null}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP ORDER DETAILS VIEW (>= md) - CLEAN HIGH-DENSITY ZOMATO TICKET     */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-7xl px-4 py-5 md:block md:px-8 md:py-6">
        {isScreenLoading ? (
          <OrderDetailSkeleton />
        ) : !order ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-2xs">
            <Package className="mx-auto size-12 text-zinc-300" />
            <h3 className="mt-3 text-base font-black text-zinc-900">Order not found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              This order may have been removed or assigned to another store.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.orders })}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Orders Queue</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. TOP ORDER HEADER STRIP */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-3.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigate({ to: partnerRoutes.orders })}
                  className="flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  title="Back to Orders"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl font-black text-zinc-950 tracking-tight">
                      Order #{order.code}
                    </h1>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
                      title="Copy Order ID"
                    >
                      <Copy className="size-3.5" />
                      <span>Copy</span>
                    </button>
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                        isOrderCancelled
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : order.stage === "delivered" || order.stage === "completed"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : order.stage === "ready"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : order.stage === "new"
                          ? "bg-amber-50 text-amber-900 border border-amber-300"
                          : "bg-zinc-100 text-zinc-900 border border-zinc-200"
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full ${
                          isOrderCancelled
                            ? "bg-rose-500"
                            : order.stage === "delivered" || order.stage === "completed"
                            ? "bg-emerald-600"
                            : order.stage === "ready"
                            ? "bg-blue-600 animate-pulse"
                            : order.stage === "new"
                            ? "bg-amber-600 animate-pulse"
                            : "bg-zinc-700"
                        }`}
                      />
                      {stageLabel}
                    </span>
                    {order.services && order.services.length > 0 && (
                      <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-700 border border-zinc-200/80">
                        {order.services.join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 font-medium flex-wrap">
                    <span>
                      Order Placed: <strong className="text-zinc-900">{placedInfo.time}</strong>, {placedInfo.date}
                    </span>
                    <span className="text-zinc-300">•</span>
                    <span className="font-semibold text-zinc-700">{placedInfo.relative}</span>
                    <span className="text-zinc-300">•</span>
                    <span>
                      Total Bill: <strong className="text-zinc-950 font-black">₹{order.amount || charges.total}</strong>
                    </span>
                    <span className="text-zinc-300">•</span>
                    <span className="capitalize font-semibold text-zinc-700">
                      {order.paymentMode === "cod" ? "Cash on Delivery" : "Paid Online"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                {order.customerPhone ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (order.customerPhone && !order.customerPhone.includes("••")) {
                        window.open(`tel:${order.customerPhone.replace(/\s/g, "")}`);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    title="Call Customer"
                  >
                    <PhoneCall className="size-4 text-emerald-700" />
                    <span>Call Customer</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowInvoiceSheet(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  title="Print Slip / Tax Invoice"
                >
                  <Printer className="size-4 text-zinc-600" />
                  <span>Print Slip / Bill</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: partnerRoutes.help, search: { orderCode: order.code, orderId: order.id } as any })}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  title="Need Help with this Order?"
                >
                  <HelpCircle className="size-4 text-zinc-600" />
                  <span>Need Help?</span>
                </button>
              </div>
            </div>

            {/* 2. TWO-COLUMN MAIN CONTENT (62% LEFT / 38% RIGHT) */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
              {/* LEFT COLUMN: CRITICAL BUSINESS DATA */}
              <div className="space-y-6">

                {/* A. BOOKED SERVICES & ITEMS (TOP PRIORITY - DATA LOADED TABLE) */}
                <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                        <Package className="size-4.5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                          Booked Services &amp; Items
                        </h2>
                        <p className="text-xs text-zinc-500 font-medium">
                          {items.reduce((acc, it) => acc + (it.qty || 1), 0)} items in customer package
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDefectModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-1.5 text-xs font-black text-white hover:bg-zinc-800 transition-colors shadow-2xs"
                      >
                        <Camera className="size-3.5" />
                        <span>Tag Defect / Stain</span>
                      </button>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-800 border border-zinc-200">
                        {items.length} {items.length === 1 ? "Item" : "Items"} Listed
                      </span>
                    </div>
                  </div>

                  {/* High Density Table */}
                  <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-600 uppercase tracking-wider border-b border-zinc-200/80">
                        <tr>
                          <th className="py-2.5 px-4">Garment / Item</th>
                          <th className="py-2.5 px-3">Service</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Rate</th>
                          <th className="py-2.5 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 bg-white">
                        {items.length > 0 ? (
                          items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-zinc-50/70 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 font-bold shrink-0">
                                    <Shirt className="size-3.5" />
                                  </span>
                                  <div>
                                    <p className="font-bold text-zinc-950">{item.name}</p>
                                    <p className="text-[10px] text-zinc-400">Garment #{idx + 1}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-800 border border-zinc-200/60">
                                  {item.service || (order.services && order.services[0]) || "Laundry"}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-zinc-900">
                                {item.qty || 1}
                              </td>
                              <td className="py-3 px-3 text-right text-zinc-600 font-semibold">
                                ₹{item.price || 0}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-zinc-950">
                                ₹{(item.qty || 1) * (item.price || 0)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-zinc-400">
                              No individual item split recorded. Order booking value: ₹{order.amount}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pre-Wash Defect Inspection Proofs (Desktop View) */}
                  {order.garmentDefects && order.garmentDefects.length > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                          <AlertCircle className="size-4 text-amber-600" />
                          Pre-Wash Inspection & Defect Proofs ({order.garmentDefects.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsDefectModalOpen(true)}
                          className="text-xs font-bold text-amber-900 underline hover:text-amber-950"
                        >
                          + Tag Another Garment
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {order.garmentDefects.map((def) => {
                          const isApproved = def.customer_status === "proceed_wash";
                          const isReturn = def.customer_status === "return_unwashed";
                          return (
                            <div
                              key={def.defect_id}
                              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white p-3 shadow-2xs"
                            >
                              <img
                                src={def.photo_url}
                                alt={def.item_name}
                                onClick={() => setViewingPhotoUrl(def.photo_url)}
                                className="size-16 rounded-lg object-cover border border-zinc-200 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-xs font-bold text-zinc-950 truncate">{def.item_name}</p>
                                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-800 border border-zinc-200">
                                    {def.defect_type.replace(/_/g, " ")}
                                  </span>
                                </div>
                                {def.description && (
                                  <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-2">
                                    {def.description}
                                  </p>
                                )}
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  {isApproved ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      <CheckCircle2 className="size-3" /> Customer Approved Wash With Care
                                    </span>
                                  ) : isReturn ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                      <AlertCircle className="size-3" /> Return Item As-Is (Do Not Wash)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded border border-amber-300/80">
                                      <Clock className="size-3" /> Awaiting Customer Decision
                                    </span>
                                  )}
                                  {def.customer_note && (
                                    <span className="text-[10px] text-zinc-500 italic">
                                      "{def.customer_note}"
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Customer Special Instructions if any */}
                  {order.specialInstructions && (
                    <div className="mt-3.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                        <MessageSquare className="size-3.5 text-zinc-600" />
                        <span>Customer Instructions:</span>
                      </div>
                      <p className="mt-1 text-zinc-700 italic">
                        "{order.specialInstructions}"
                      </p>
                    </div>
                  )}

                  {/* Financial Bill Calculation (Zomato Merchant Slip) */}
                  <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800 pb-2 border-b border-zinc-200/80 mb-3">
                      Payment &amp; Financial Settlement
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-zinc-600">
                        <span>Items Subtotal:</span>
                        <span className="font-semibold text-zinc-900">₹{charges.subtotal}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>Pickup &amp; Delivery Logistics:</span>
                        <span className="font-semibold text-zinc-900">
                          {charges.pickupFee > 0 ? `₹${charges.pickupFee}` : "FREE"}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>GST &amp; Taxes:</span>
                        <span className="font-semibold text-zinc-900">₹{charges.taxes}</span>
                      </div>
                      {charges.discount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Store Discount Applied:</span>
                          <span>-₹{charges.discount}</span>
                        </div>
                      )}
                      <div className="border-t border-zinc-200 pt-2 flex justify-between text-sm font-black text-zinc-950">
                        <span>Total Customer Bill:</span>
                        <span className={isOrderCancelled ? "line-through text-zinc-400" : ""}>
                          ₹{order.amount || charges.total}
                        </span>
                      </div>

                      {/* Payment Status Bar */}
                      <div className="mt-2 flex items-center justify-between pt-2 border-t border-zinc-200 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                          <CreditCard className="size-4 text-zinc-500" />
                          <span className="capitalize">
                            {order.paymentMode === "cod" ? "Cash on Delivery (COD)" : "Paid Online via Razorpay"}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            order.paymentStatus === "paid"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {order.paymentStatus === "paid" ? "Payment Received" : "Payment Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* B. CUSTOMER & DOORSTEP ADDRESS CARD */}
                <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                        <User className="size-4.5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                          Customer &amp; Delivery Details
                        </h2>
                        <p className="text-xs text-zinc-500 font-medium">Customer contact and address information</p>
                      </div>
                    </div>
                    {order.customerPhone ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (order.customerPhone && !order.customerPhone.includes("••")) {
                            window.open(`tel:${order.customerPhone.replace(/\s/g, "")}`);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
                      >
                        <PhoneCall className="size-3.5" />
                        <span>Call Customer</span>
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {/* Customer Info */}
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase">Customer</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-800">
                          <Star className="size-3 fill-amber-400 text-amber-500" />
                          {order.customerRating && order.customerRating > 0 ? order.customerRating.toFixed(1) : "5.0"}
                        </span>
                      </div>
                      <p className="text-base font-black text-zinc-950">
                        {getDisplayCustomerName(order.customerName)}
                      </p>
                      <p className="text-xs font-semibold text-zinc-600">
                        Phone: {order.customerPhone ? maskPhone(order.customerPhone) : "Protected"}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Verified Customer · {order.customerOrders || 1} previous orders
                      </p>
                    </div>

                    {/* Pickup & Slot Info */}
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase">Doorstep Pickup Address</span>
                        {((order as any)?.isAddressMasked || order.stage === "delivered" || (order as any)?.status === "delivered") ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200/80 px-1.5 py-0.2 text-[9px] font-bold text-zinc-700">
                            🔒 DPDP Protected
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-zinc-900 leading-snug">
                          {order.pickupAddress || order.address || "House 42, Civil Lines, Kasganj"}
                        </p>
                      </div>
                      <div className="text-[11px] text-zinc-600 font-medium">
                        Slot: <strong className="text-zinc-900">{order.pickupTime || "04:00 PM - 06:00 PM"}</strong>
                      </div>
                    </div>
                  </div>
                </section>

                {/* C. LOGISTICS & DELIVERY CAPTAIN (CLEAN & PROFESSIONAL) */}
                <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                        <Bike className="size-4.5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                          Delivery Logistics Captain
                        </h2>
                        <p className="text-xs text-zinc-500 font-medium">QuickPress Delivery &amp; Logistics Fleet</p>
                      </div>
                    </div>
                    {hasAssignedRider ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                        <span className="size-2 rounded-full bg-emerald-600" />
                        Captain Assigned
                      </span>
                    ) : isOrderCancelled ? (
                      <span className="rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1 text-xs font-bold text-zinc-600">
                        Order Cancelled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1 text-xs font-bold text-zinc-700">
                        <span className="size-2 rounded-full bg-zinc-400 animate-pulse" />
                        Locating Captain...
                      </span>
                    )}
                  </div>

                  {hasAssignedRider ? (
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                      <div className="flex items-center gap-3.5">
                        {riderImage ? (
                          <img
                            src={riderImage}
                            alt={riderName}
                            className="size-12 rounded-xl object-cover border border-zinc-200 shadow-2xs"
                          />
                        ) : (
                          <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-900 text-white font-black text-base shadow-2xs">
                            {riderName ? riderName.charAt(0).toUpperCase() : "C"}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-zinc-950">{riderName}</p>
                            {riderRating ? (
                              <span className="flex items-center gap-0.5 rounded-full bg-white border border-zinc-200 px-2 py-0.2 text-[10px] font-bold text-zinc-800">
                                <Star className="size-2.5 fill-amber-400 text-amber-500" />
                                {riderRating.toFixed(1)}
                              </span>
                            ) : null}
                          </div>
                          {riderVehicle && (
                            <p className="text-xs font-bold text-zinc-700 mt-0.5">
                              🛵 {riderVehicle}
                            </p>
                          )}
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Verified QuickPress Logistics Captain
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {riderPhone ? (
                          <a
                            href={`tel:${riderPhone.replace(/\s/g, "")}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            <PhoneCall className="size-3.5" />
                            <span>Call Captain</span>
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setShowRiderLocationModal(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        >
                          <Navigation className="size-3.5 text-blue-600" />
                          <span>Track Live GPS</span>
                        </button>
                      </div>
                    </div>
                  ) : isOrderCancelled ? (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
                      Order was cancelled before a delivery captain was dispatched.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex items-center gap-3">
                      <div className="size-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-zinc-900">Locating Nearest Fleet Captain...</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Searching closest available delivery captain in your area. Captain details and GPS will appear here upon acceptance.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Physical Handshake Dispatch OTP Verification */}
                  {((order.stage === "ready" || order.stage === "dispatch_otp_pending" || order.stage === "completed" || (order as any)?.reassignment) && (dispatchOtpCode || order.stage === "ready" || order.stage === "dispatch_otp_pending")) ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-emerald-700" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                              Captain Handover &amp; Dispatch Verification
                            </h4>
                          </div>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Ask arriving Delivery Captain for their 4-digit code displayed on their app:
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="e.g. 5387"
                            value={dispatchInputOtp}
                            onChange={(e) => setDispatchInputOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                            className="w-28 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-center font-mono text-base font-black tracking-widest text-zinc-900 placeholder:text-zinc-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                          />
                          <button
                            type="button"
                            disabled={dispatchInputOtp.trim().length !== 4 || isVerifyingDispatch}
                            onClick={handleVerifyPartnerDispatch}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-zinc-200 disabled:text-zinc-400 px-4 py-2 text-xs font-bold text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            {isVerifyingDispatch ? (
                              <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <CheckCircle2 className="size-3.5" />
                            )}
                            <span>Verify Handover</span>
                          </button>
                        </div>
                      </div>

                      {/* Point 4: GPS Proximity Custody Indicator */}
                      <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                        {((order as any)?.custodyAudit?.proximityVerified || (order as any)?.custodyAudit?.proximityMeters) ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900 bg-white/90 border border-emerald-300 rounded-lg px-2.5 py-1">
                            <ShieldCheck className="size-3.5 text-emerald-600" />
                            Captain Proximity Verified: Inside Store Zone (~{Math.round((order as any)?.custodyAudit?.proximityMeters || 120)}m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium">
                            <MapPin className="size-3 text-emerald-600" />
                            GPS Geofence Proximity &amp; Dispatch OTP Double-Handshake Protected
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-700 font-bold">Physical Custody Transfer</span>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>

              {/* RIGHT COLUMN: ACTION PANEL & TIMELINE */}
              <div className="space-y-6">

                {/* A. ORDER ACTION PANEL (CLEAN & DIRECT) */}
                <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
                  <div className="pb-3.5 border-b border-zinc-100 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                      Order Action
                    </h2>
                    <OrderSlaCountdown
                      placedAt={(order as any).placedAt || (order as any).placedAtRaw}
                      deadline={(order as any).partnerAcceptDeadline || (order as any).riderAcceptDeadline}
                      acceptedAt={(order as any).partnerAcceptedAt}
                      stage={order.stage}
                      autoCancelled={(order as any).autoCancelled}
                      cancellationReason={(order as any).cancellationReason || (order as any).cancelledReason}
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    {/* Stage descriptions */}
                    {order.stage === "new" && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                        <p className="font-bold">⚠️ New incoming laundry order!</p>
                        <p className="mt-0.5 text-amber-800">
                          Please accept the order to initiate captain dispatch for doorstep customer pickup.
                        </p>
                      </div>
                    )}

                    {order.stage === "accepted" && (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-700">
                        <p className="font-bold text-zinc-900">🛵 Awaiting Laundry Arrival</p>
                        <p className="mt-0.5 text-zinc-600">
                          Order accepted. Delivery Captain has been dispatched to collect dirty garments from the customer.
                        </p>
                      </div>
                    )}

                    {(order.stage === "at_partner" || order.stage === "processing" || order.stage === "washing") && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950">
                        <p className="font-bold">🧺 Processing at Store</p>
                        <p className="mt-0.5 text-blue-800">
                          Garments arrived at your store. Once cleaned and packed, click "Mark Process Complete" below.
                        </p>
                      </div>
                    )}

                    {order.stage === "ready" && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
                        <p className="font-bold">✨ Clothes Packed &amp; Ready</p>
                        <p className="mt-0.5 text-emerald-800">
                          Delivery Captain is en route to collect the packed laundry bag. Verify the Dispatch OTP upon handover.
                        </p>
                      </div>
                    )}

                    {(order.stage === "delivered" || order.stage === "completed") && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
                        <p className="font-bold">✓ Order Delivered &amp; Settled</p>
                        <p className="mt-0.5 text-emerald-800">
                          Customer received clean clothes. Order payout has been credited to your store wallet ledger.
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2">
                      <OrderActionBar
                        order={order}
                        size="compact"
                        onAction={(actionId) => handleAction(order, actionId)}
                        busyAction={busy?.orderId === order.id ? busy.actionId : null}
                      />
                    </div>

                    {/* Common Utility Buttons */}
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowInvoiceSheet(true)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 py-2.5 text-xs font-bold text-zinc-800 active:scale-95 transition-all shadow-2xs cursor-pointer"
                      >
                        <Printer className="size-4 text-zinc-600" />
                        <span>View / Print Customer Bill</span>
                      </button>

                      {(order.stage === "delivered" || order.stage === "completed") && (
                        <button
                          type="button"
                          onClick={() => setShowReviewModal(true)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 py-2.5 text-xs font-bold text-amber-900 active:scale-95 transition-all shadow-2xs cursor-pointer"
                        >
                          <Star className="size-4 fill-amber-500 text-amber-600" />
                          <span>Review Customer Experience</span>
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* B. ORDER PROGRESSION & TIMELINE (CLEAN VERTICAL STEPPER) */}
                <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs">
                  <div className="pb-3.5 border-b border-zinc-100 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-wider text-zinc-950">
                      Order Timeline
                    </h2>
                    <span className="text-[11px] font-bold text-zinc-500">
                      Live Audit Trail
                    </span>
                  </div>

                  <div className="mt-4">
                    <OrderTimeline order={order} timeline={timeline} stage={order.stage} />
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rider Location Modal (Accessible from both desktop and mobile) */}
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
                className="rounded-full bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200 cursor-pointer"
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
                        { id: "store", latitude: Number((order as any)?.partnerLat || (order as any)?.pickupLat || rLat), longitude: Number((order as any)?.partnerLng || (order as any)?.pickupLng || rLng), label: "Your Store", tone: "secondary" },
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
              className="w-full rounded-2xl bg-zinc-950 py-2.5 text-xs font-black text-white hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            >
              Close Tracking
            </button>
          </div>
        </div>
      )}

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

      {order && isDefectModalOpen && (
        <PrewashDefectModal
          isOpen={isDefectModalOpen}
          onClose={() => setIsDefectModalOpen(false)}
          orderId={order.id}
          orderCode={order.code}
          availableItems={items.map((it) => ({ id: it.id, name: it.name }))}
          onDefectReported={(newDefect) => {
            setFetchedOrder((prev) => {
              if (!prev) return prev;
              const existing = prev.garmentDefects || [];
              return {
                ...prev,
                hasDefectsReported: true,
                garmentDefects: [...existing, newDefect],
              };
            });
          }}
        />
      )}

      {/* Full Screen Photo Zoom Modal */}
      {viewingPhotoUrl && (
        <div
          onClick={() => setViewingPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-2"
          >
            <button
              onClick={() => setViewingPhotoUrl(null)}
              className="absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="size-5" />
            </button>
            <img
              src={viewingPhotoUrl}
              alt="Defect Full View"
              className="max-h-[82vh] w-auto object-contain mx-auto rounded-xl"
            />
          </div>
        </div>
      )}

      <Toaster />
    </PartnerLayout>

  );
}
