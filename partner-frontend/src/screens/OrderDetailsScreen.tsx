import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Bike,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  HelpCircle,
  MapPin,
  MoreVertical,
  Package,
  PackageCheck,
  Phone,
  Printer,
  ShieldCheck,
  Sparkles,
  Star,
  WashingMachine,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { GoogleMapView } from "@/shared/ui/google-map";
import {
  fetchPartnerOrder,
  verifyPartnerDispatchOtp,
} from "@/api/partner/partner-orders-api";
import { subscribePartnerOrders } from "@/lib/partner-socket";
import type { GarmentDefect } from "@/shared/types/partner";

import { PartnerLayout } from "../components/layout/PartnerLayout";
import { OrderActionBar } from "../components/orders/OrderActionBar";
import { InvoiceSheet } from "../components/orders/OrderSheets";
import { OrderDetailSkeleton } from "../components/orders/OrderSkeletons";
import { OrderSlaCountdown } from "../components/orders/OrderSlaCountdown";
import { OrderTimeline } from "../components/orders/OrderTimeline";
import { PartnerReviewModal } from "../components/orders/PartnerReviewModal";
import { PrewashDefectModal } from "../components/orders/PrewashDefectModal";
import {
  STAGE_LABEL,
  formatOrderPlacedTime,
  type ManagedOrder,
} from "../data/partner-orders-mock";
import { usePartnerOrders } from "../context/PartnerOrdersContext";
import { useOrderActionHandler } from "../hooks/use-order-action-handler";
import { partnerRoutes } from "../navigation/partner-routes";
import { printThermalOrderTag } from "../lib/thermal-printer";
import { inr } from "../lib/currency";

function getDisplayCustomerName(name?: string): string {
  if (!name) return "QuickPress Customer";
  const trimmed = name.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  const isPhone = /^[+\d\s\-()]+$/.test(trimmed) && digitsOnly.length >= 10;
  if (isPhone || (trimmed.toLowerCase().includes("customer") && digitsOnly.length >= 10)) {
    return "QuickPress Customer";
  }
  return trimmed;
}

function maskPhone(phone?: string | null): string {
  if (!phone) return "+91 ••••• •••••";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return `+91 ${digits.slice(-10, -8)}••• ••${digits.slice(-2)}`;
  }
  return "+91 ••••• •••••";
}

function normalizeRemoteOrder(remote: any): ManagedOrder {
  const timeline = Array.isArray(remote?.timeline) ? remote.timeline : [];
  const items = Array.isArray(remote?.items) ? remote.items : [];
  const cancelledEntry = timeline.find((entry: any) => /reject|cancel/i.test(entry?.label || ""));
  const rawStatus = String(remote?.status || remote?.canonicalStatus || "").toLowerCase();

  const normalizedStage =
    rawStatus === "at_store" ||
    rawStatus === "at_partner" ||
    rawStatus === "at-store" ||
    rawStatus === "at-partner" ||
    rawStatus === "store_received" ||
    rawStatus === "store_drop_confirmed"
      ? "at_partner"
      : rawStatus === "processing_started" ||
          rawStatus === "processing" ||
          rawStatus === "washing" ||
          rawStatus === "sorting" ||
          rawStatus === "dry_cleaning" ||
          rawStatus === "ironing" ||
          rawStatus === "drying"
        ? "processing"
        : rawStatus === "ready_for_delivery" ||
            rawStatus === "ready" ||
            rawStatus === "packed" ||
            rawStatus === "processing_completed"
          ? "ready"
          : rawStatus === "out_for_delivery" ||
              rawStatus === "delivery_otp_pending" ||
              rawStatus === "dispatch_otp_verified"
            ? "out_for_delivery"
            : rawStatus === "delivered"
              ? "delivered"
              : rawStatus === "completed"
                ? "completed"
                : rawStatus === "cancelled" ||
                    rawStatus === "store_rejected" ||
                    rawStatus === "payment_failed"
                  ? "cancelled"
                  : rawStatus === "refund_pending" || rawStatus === "refunded"
                    ? "refunded"
                    : remote?.status || "new";

  const defects = Array.isArray(remote?.garmentDefects)
    ? remote.garmentDefects
    : Array.isArray(remote?.garment_defects)
      ? remote.garment_defects
      : [];

  return {
    id: remote?.id || remote?.orderId || "",
    code: remote?.code || remote?.id || "",
    stage: normalizedStage as any,
    customerName: remote?.customerName || "QuickPress Customer",
    customerRating: Number(remote?.customerRating || 5.0),
    customerPhone: remote?.customerPhone || "",
    customerOrders: Number(remote?.customerOrders || 1),
    pickupAddress: remote?.address || remote?.pickupAddress || "",
    deliveryAddress: remote?.address || remote?.deliveryAddress || "",
    pickupTime: remote?.slot || remote?.pickupTime || "Today",
    pickupDay: "today",
    deliveryEta: remote?.slot || remote?.deliveryEta || "Tomorrow",
    distanceKm: Number(remote?.distanceKm || 0),
    services: remote?.serviceLabel ? [remote.serviceLabel] : Array.isArray(remote?.services) ? remote.services : [],
    itemCount: remote?.itemCount || items.reduce((sum: number, it: any) => sum + (Number(it?.qty) || 1), 0) || 1,
    amount: Number(remote?.amount || 0),
    paymentStatus:
      remote?.status === "cancelled"
        ? "refunded"
        : remote?.paymentMode === "cod"
          ? "pending"
          : "paid",
    paymentMode: remote?.paymentMode || "cod",
    placedAt: remote?.placedAt || "Recently",
    placedMinutesAgo: 0,
    specialInstructions: remote?.specialInstructions || "",
    items: items.map((item: any) => ({
      id: item?.id || "",
      name: item?.name || "Laundry Item",
      service: item?.service || remote?.serviceLabel || "Laundry",
      qty: Number(item?.qty || 1),
      price: Number(item?.price || 0),
    })),
    charges: remote?.charges || {
      subtotal: Number(remote?.amount || 0),
      pickupFee: 0,
      taxes: 0,
      discount: 0,
      total: Number(remote?.amount || 0),
    },
    timeline: timeline.map((entry: any) => ({
      id: entry?.id || "",
      label: entry?.label || "",
      time: entry?.time || "",
    })),
    invoiceNo: remote?.invoiceNo || null,
    cancelReason:
      remote?.status === "cancelled" ||
      remote?.canonicalStatus === "cancelled" ||
      remote?.canonicalStatus === "refunded"
        ? cancelledEntry?.label ?? remote?.cancelledReason ?? "Cancelled"
        : null,
    assignedRider: remote?.assignedRider || remote?.rider || remote?.riderName || null,
    isExpress: Boolean(remote?.isExpress),
    partnerExpressBonus: Number(remote?.partnerExpressBonus || 0),
    garmentDefects: defects,
    hasDefectsReported: Boolean(remote?.hasDefectsReported || defects.length > 0),
  };
}

const PIPELINE_STEPS = [
  { id: "accepted", label: "Accepted" },
  { id: "captain", label: "Captain" },
  { id: "washing", label: "Washing" },
  { id: "ready", label: "Ready" },
] as const;

function getPipelineIndex(stage: string, isPartnerHandoverConfirmed: boolean): number {
  const norm = (stage || "").toLowerCase();
  if (norm === "completed" || norm === "delivered") return 4;
  if (norm === "ready" || norm === "out_for_delivery") return 3;
  if (
    isPartnerHandoverConfirmed ||
    norm === "at_partner" ||
    norm === "processing" ||
    norm === "washing" ||
    norm === "dry_cleaning" ||
    norm === "ironing"
  ) {
    return 2;
  }
  if (norm === "accepted" || norm === "pickup_pending") return 1;
  return 0;
}

export function OrderDetailsScreen({ orderId: propOrderId }: { orderId?: string }) {
  const navigate = useNavigate();
  const routeParams = (useParams({ strict: false }) as { orderId?: string }) || {};
  const orderId = propOrderId || routeParams?.orderId;

  const {
    orders,
    isLoading,
    confirmHandover,
    confirmedHandoverIds,
    extendOrderTime,
  } = usePartnerOrders();
  const { handleAction, sheetNode, overlay, busy } = useOrderActionHandler();

  const [fetchedOrder, setFetchedOrder] = useState<ManagedOrder | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [showInvoiceSheet, setShowInvoiceSheet] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [showRiderLocationModal, setShowRiderLocationModal] = useState(false);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dispatchInputOtp, setDispatchInputOtp] = useState("");
  const [isVerifyingDispatch, setIsVerifyingDispatch] = useState(false);
  const [handoverBusy, setHandoverBusy] = useState(false);
  const [extendingEta, setExtendingEta] = useState(false);

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

  const matchedOrder = useMemo(
    () =>
      orders.find(
        (item) =>
          item.id === orderId ||
          item.code === orderId ||
          item.id?.toLowerCase() === orderId?.toLowerCase() ||
          item.code?.toLowerCase() === orderId?.toLowerCase()
      ) || null,
    [orders, orderId]
  );

  const loadRemoteOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const remote = await fetchPartnerOrder(orderId);
      if (remote) {
        setFetchedOrder(normalizeRemoteOrder(remote));
      }
    } catch {
      // Fallback safely to live context order
    } finally {
      setFetchLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    setFetchLoading(true);
    void loadRemoteOrder();
    const interval = window.setInterval(() => void loadRemoteOrder(), 4000);
    const unsub = subscribePartnerOrders((data) => {
      const changedId = data?.orderId || data?.id || data?._id || data?.code;
      if (!changedId || changedId === orderId) {
        void loadRemoteOrder();
      }
    });
    return () => {
      window.clearInterval(interval);
      unsub();
    };
  }, [orderId, loadRemoteOrder]);

  const order = fetchedOrder || matchedOrder;
  const isScreenLoading = (isLoading && !order) || (fetchLoading && !order);

  const stageLabel = order ? STAGE_LABEL[order.stage] || order.stage || "Active" : "";
  const placedInfo = formatOrderPlacedTime(
    (order as any)?.placedAt || (order as any)?.placedAtRaw || order?.placedAt
  );
  const items = order?.items || [];
  const totalPieces =
    items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0) || order?.itemCount || 1;
  const charges = order?.charges || {
    subtotal: order?.amount || 0,
    pickupFee: 0,
    taxes: 0,
    discount: 0,
    total: order?.amount || 0,
  };
  const timeline = order?.timeline || [];

  const isOrderCancelled = Boolean(
    order?.stage === "cancelled" ||
      (order?.stage as string) === "rejected" ||
      (order as any)?.status === "cancelled" ||
      order?.cancelReason
  );

  const rawRider =
    order?.assignedRider || (order as any)?.rider || (order as any)?.assigned_rider || null;
  const riderObj = typeof rawRider === "object" && rawRider !== null ? rawRider : null;

  const riderName =
    riderObj?.name ||
    (typeof rawRider === "string" ? rawRider : "") ||
    (order as any)?.riderName ||
    "";
  const riderPhone =
    riderObj?.phone ||
    (order as any)?.riderPhone ||
    (order as any)?.captainPhone ||
    (typeof rawRider === "string" && /^[+\d\s\-()]+$/.test(rawRider) ? rawRider : "") ||
    "";
  const riderVehicle =
    riderObj?.vehicleNumber || riderObj?.vehicle || (order as any)?.riderVehicle || "";

  const hasAssignedRider = Boolean(
    (riderObj && (riderObj.name || riderObj.id || riderObj.phone)) ||
      (riderName && !["pending", "unassigned", "none", "null"].includes(riderName.toLowerCase()))
  );

  const rawStatus = String((order as any)?.status || (order as any)?.canonicalStatus || "")
    .toLowerCase()
    .trim();

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

  const isReadyToConfirmHandover = Boolean(
    order && isRiderHandedOver && !isPartnerHandoverConfirmed
  );
  const isReadyToStartProcessing = Boolean(
    order &&
      ((isRiderHandedOver && isPartnerHandoverConfirmed) ||
        (order.stage === "at_partner" && isPartnerHandoverConfirmed))
  );

  const isProcessingStage = Boolean(
    order &&
      (order.stage === "processing" ||
        order.stage === "washing" ||
        order.stage === "dry_cleaning" ||
        order.stage === "ironing")
  );

  const isReadyStage = Boolean(
    order && (order.stage === "ready" || (order.stage as string) === "out_for_delivery")
  );
  const isCompletedStage = Boolean(
    order && (order.stage === "completed" || (order.stage as string) === "delivered")
  );

  const rLat = Number(
    riderObj?.lat || (order as any)?.rider?.latitude || (order as any)?.rider?.lat
  );
  const rLng = Number(
    riderObj?.lng || (order as any)?.rider?.longitude || (order as any)?.rider?.lng
  );
  const hasRiderCoords = Boolean(rLat && rLng && !Number.isNaN(rLat) && !Number.isNaN(rLng));

  const copyCode = () => {
    if (!order?.code) return;
    void navigator.clipboard?.writeText(order.code);
    toast.success(`Copied #${order.code}`);
  };

  const handlePrintTag = () => {
    if (!order) return;
    printThermalOrderTag({
      id: order.id,
      code: order.code,
      customerName: getDisplayCustomerName(order.customerName),
      customerPhone: order.customerPhone,
      placedAt: order.placedAt,
      amount: order.amount,
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      items: order.items,
      itemCount: order.itemCount,
      services: order.services,
      pickupAddress: order.pickupAddress,
      specialInstructions: order.specialInstructions,
    });
    toast.success(`Printing 58mm Bag Tag & Receipt for #${order.code}`);
  };

  const handleInitiateCall = (name: string, phone: string, role: string) => {
    const clean = phone.replace(/\s/g, "");
    if (!clean || clean.includes("••")) {
      toast.error("Phone number is not available for this order");
      return;
    }
    if (window.confirm(`Call ${name} (${role}) at ${phone}?`)) {
      window.open(`tel:${clean}`);
    }
  };

  const handleConfirmShopHandover = async () => {
    if (!order || handoverBusy) return;
    setHandoverBusy(true);
    try {
      await confirmHandover(order.id);
      toast.success("Shop handover verified — ready to start washing");
      await loadRemoteOrder();
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm shop handover");
    } finally {
      setHandoverBusy(false);
    }
  };

  const handleExtendEta = async (mins: number) => {
    if (!order || extendingEta) return;
    setExtendingEta(true);
    try {
      await extendOrderTime(order.id, mins, "Stain care / extra drying time");
      toast.success(`Prep ETA extended by +${mins} mins`);
      await loadRemoteOrder();
    } catch {
      toast.error("Could not update prep ETA");
    } finally {
      setExtendingEta(false);
    }
  };

  const handleVerifyDispatch = async () => {
    const targetId = order?.id || orderId;
    if (!targetId) return;
    const cleanOtp = dispatchInputOtp.trim();
    if (cleanOtp.length !== 4) {
      toast.error("Enter the 4-digit Dispatch OTP shown on the Captain's app");
      return;
    }
    setIsVerifyingDispatch(true);
    try {
      await verifyPartnerDispatchOtp(targetId, cleanOtp);
      toast.success("Dispatch OTP verified — handed over to Delivery Captain");
      setDispatchInputOtp("");
      setFetchedOrder((prev) => (prev ? { ...prev, stage: "out_for_delivery" as any } : prev));
      await loadRemoteOrder();
    } catch (err: any) {
      toast.error(err?.message || "Invalid Dispatch OTP. Check with Captain.");
    } finally {
      setIsVerifyingDispatch(false);
    }
  };

  const pipelineIndex = order
    ? getPipelineIndex(order.stage, isPartnerHandoverConfirmed)
    : 0;
  const defects = (order?.garmentDefects || []) as GarmentDefect[];
  const expressBonus = Number(order?.partnerExpressBonus || 0);

  return (
    <PartnerLayout
      activeTab="orders"
      hideBottomNav={true}
      title={order ? `Order #${order.code}` : "Order Details"}
      subtitle={order ? stageLabel : ""}
    >
      <div className="min-h-full bg-[#FAFAFA] pb-28 text-zinc-950">
        {/* Clean Minimalist Sticky Top Header */}
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
          <div className="app-header-safe mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 md:px-6 md:pt-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.orders })}
                aria-label="Back to orders queue"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowLeft className="size-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm md:text-base font-bold tracking-tight text-zinc-950 tabular-nums">
                    #{order ? order.code || order.id.slice(-6) : orderId?.slice(-6) || "Order"}
                  </h1>
                  {order ? (
                    <>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 cursor-pointer"
                      >
                        <Copy className="size-2.5" />
                        Copy
                      </button>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          isOrderCancelled
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : isCompletedStage
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : isReadyStage
                                ? "border-blue-200 bg-blue-50 text-blue-800"
                                : order.stage === "new"
                                  ? "border-amber-200 bg-amber-50 text-amber-800"
                                  : "border-zinc-200 bg-zinc-100 text-zinc-900"
                        }`}
                      >
                        {stageLabel}
                      </span>
                      {order.isExpress ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Zap className="size-2.5" />
                          Express
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>

                {order ? (
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500 tabular-nums truncate">
                    {placedInfo.date}, {placedInfo.time} ·{" "}
                    {order.paymentMode === "online" || order.paymentStatus === "paid"
                      ? "Online Paid"
                      : "Cash on Delivery"}{" "}
                    · {totalPieces} pcs
                  </p>
                ) : null}
              </div>
            </div>

            {order ? (
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:block">
                  <OrderSlaCountdown
                    placedAt={(order as any).placedAt || (order as any).placedAtRaw}
                    deadline={
                      (order as any).partnerAcceptDeadline || (order as any).riderAcceptDeadline
                    }
                    acceptedAt={(order as any).partnerAcceptedAt}
                    stage={order.stage}
                    autoCancelled={(order as any).autoCancelled}
                    cancellationReason={
                      (order as any).cancellationReason || (order as any).cancelledReason
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePrintTag}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 cursor-pointer"
                >
                  <Printer className="size-3.5" />
                  Print Bag QR
                </button>

                {/* Kebab Overflow Menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    aria-label="More order actions"
                    className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    <MoreVertical className="size-4" />
                  </button>

                  {menuOpen ? (
                    <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl z-50 text-xs animate-in fade-in duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setShowInvoiceSheet(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                      >
                        <FileText className="size-3.5 text-zinc-500" />
                        View Tax Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setIsDefectModalOpen(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                      >
                        <Camera className="size-3.5 text-amber-600" />
                        Log Pre-Wash Defect
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          handlePrintTag();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                      >
                        <Printer className="size-3.5 text-zinc-500" />
                        Print 58mm Bag Tag QR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setShowReviewModal(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                      >
                        <Star className="size-3.5 text-amber-500" />
                        Rate Customer / Captain
                      </button>
                      <div className="my-1 border-t border-zinc-100" />
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          void navigate({
                            to: partnerRoutes.help,
                            search: { orderCode: order.code, orderId: order.id } as any,
                          });
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <HelpCircle className="size-3.5" />
                        Report Order Issue
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {/* Main Content */}
        <div className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-5">
          {isScreenLoading ? (
            <OrderDetailSkeleton />
          ) : !order ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center">
              <Package className="mx-auto size-11 text-zinc-300" />
              <h2 className="mt-3 text-sm font-bold text-zinc-950">Order not found</h2>
              <p className="mt-1 text-xs text-zinc-500">
                This order may have been archived or reassigned.
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.orders })}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                Back to Orders Queue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* LEFT PRIMARY COLUMN (8 COLS) */}
              <div className="lg:col-span-8 space-y-4">
                {/* 1. Workflow Pipeline + Live Stage Action Box */}
                <section className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Order Workflow Pipeline
                    </span>
                    <span className="text-xs font-semibold text-zinc-700">{stageLabel}</span>
                  </div>

                  {/* 4-Step Segmented Progress */}
                  <div className="grid grid-cols-4 gap-2">
                    {PIPELINE_STEPS.map((step, idx) => {
                      const done = idx < pipelineIndex || pipelineIndex >= 4;
                      const active = idx === pipelineIndex && pipelineIndex < 4;
                      return (
                        <div key={step.id} className="space-y-1.5">
                          <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                done
                                  ? "w-full bg-emerald-600"
                                  : active
                                    ? "w-2/3 bg-zinc-900 animate-pulse"
                                    : "w-0 bg-zinc-200"
                              }`}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            {done ? (
                              <Check className="size-3 text-emerald-600 shrink-0" />
                            ) : null}
                            <span
                              className={`text-[11px] font-semibold truncate ${
                                done
                                  ? "text-emerald-700"
                                  : active
                                    ? "text-zinc-950 font-bold"
                                    : "text-zinc-400"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contextual Live Action Box */}
                  {isOrderCancelled ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 flex items-start gap-2.5">
                      <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-rose-950">Order Cancelled</p>
                        <p className="text-[11px] font-medium text-rose-800 mt-0.5">
                          {order.cancelReason || "This order has been closed or refunded."}
                        </p>
                      </div>
                    </div>
                  ) : order.stage === "new" ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-zinc-950">
                          Incoming request waiting for store acceptance
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Accept promptly to dispatch pickup Captain within SLA.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => handleAction(order, "reject")}
                          className="rounded-xl border border-rose-200 bg-white hover:bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-600 cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => handleAction(order, "accept")}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                        >
                          Accept Order
                        </button>
                      </div>
                    </div>
                  ) : isReadyStage ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-950">
                          <ShieldCheck className="size-4 text-emerald-600" />
                          Enter 4-Digit Captain Dispatch OTP
                        </span>
                        <span className="text-[11px] font-medium text-zinc-500">
                          Ask Delivery Captain before handover
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="tel"
                          maxLength={4}
                          value={dispatchInputOtp}
                          onChange={(e) =>
                            setDispatchInputOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                          placeholder="• • • •"
                          className="h-10 w-32 rounded-xl border border-zinc-300 bg-white text-center text-sm font-bold tracking-[0.25em] text-zinc-950 focus:border-zinc-900 focus:outline-none tabular-nums"
                        />
                        <button
                          type="button"
                          disabled={dispatchInputOtp.length !== 4 || isVerifyingDispatch}
                          onClick={handleVerifyDispatch}
                          className="flex-1 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-xs font-bold text-white cursor-pointer transition-colors"
                        >
                          {isVerifyingDispatch ? "Verifying..." : "Verify OTP & Dispatch"}
                        </button>
                      </div>
                    </div>
                  ) : isCompletedStage ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-emerald-950">
                            Order Delivered & Settled ({inr(charges.total)})
                          </p>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Settlement synced with Wallet & Payouts.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInvoiceSheet(true)}
                        className="rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-zinc-900 cursor-pointer"
                      >
                        View Tax Invoice
                      </button>
                    </div>
                  ) : isProcessingStage ? (
                    <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-zinc-950">
                          Garments actively in washing & finishing cycle
                        </p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Need extra time for tough stains? Extend prep ETA or mark ready.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={extendingEta}
                          onClick={() => handleExtendEta(15)}
                          className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 cursor-pointer"
                        >
                          <Clock className="size-3.5" />
                          +15m ETA
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => handleAction(order, "mark_ready")}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                        >
                          Mark Ready
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-zinc-950">
                          {isReadyToStartProcessing
                            ? "Garments checked in — ready to start wash"
                            : isReadyToConfirmHandover
                              ? "Captain dropped garments — confirm store intake"
                              : "Captain assigned & picking up garments"}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Verify {totalPieces} pieces, tag any defects, and attach Bag Tag QR.
                        </p>
                      </div>

                      {isReadyToStartProcessing ? (
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => handleAction(order, "start_washing")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shrink-0 cursor-pointer"
                        >
                          <WashingMachine className="size-3.5" />
                          Start Washing
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={handoverBusy}
                          onClick={handleConfirmShopHandover}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-white shrink-0 cursor-pointer"
                        >
                          <PackageCheck className="size-3.5" />
                          {handoverBusy ? "Confirming..." : "Confirm Shop Handover"}
                        </button>
                      )}
                    </div>
                  )}
                </section>

                {/* 2. Garments & Pre-Wash Defect Inspection Card */}
                <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-zinc-100">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                        Garments & Inspection
                      </h2>
                      <p className="text-[11px] font-medium text-zinc-500 mt-0.5 tabular-nums">
                        {totalPieces} total pieces ·{" "}
                        {order.services?.join(", ") || "Standard Laundry"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDefectModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 cursor-pointer"
                    >
                      <Camera className="size-3.5 text-amber-600" />
                      Log Defect
                    </button>
                  </div>

                  {items.length > 0 ? (
                    <div className="divide-y divide-zinc-100 text-xs">
                      {items.map((item, idx) => (
                        <div
                          key={item.id || `${item.name}-${idx}`}
                          className="flex items-center justify-between gap-3 px-4 md:px-5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-950 truncate">
                              {item.qty || 1} × {item.name}
                            </p>
                            {item.service ? (
                              <p className="text-[11px] text-zinc-500 capitalize mt-0.5">
                                {item.service}
                              </p>
                            ) : null}
                          </div>
                          {item.price > 0 ? (
                            <span className="font-bold text-zinc-900 tabular-nums shrink-0">
                              {inr(item.price * (item.qty || 1))}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 md:px-5 py-4 text-xs font-medium text-zinc-600">
                      {totalPieces} garment pieces queued under{" "}
                      {order.services?.join(", ") || "Laundry Care"}.
                    </div>
                  )}

                  {/* Pre-Wash Defects Logged */}
                  {defects.length > 0 ? (
                    <div className="border-t border-amber-200/80 bg-amber-50/70 px-4 md:px-5 py-3 space-y-2">
                      <p className="text-[11px] font-bold text-amber-900">
                        Pre-Wash Defect Log ({defects.length})
                      </p>
                      <div className="space-y-1.5">
                        {defects.map((defect, idx) => (
                          <div
                            key={defect.defect_id || idx}
                            className="flex items-center justify-between gap-2 text-[11px] text-amber-900"
                          >
                            <span className="font-medium truncate">
                              {defect.item_name || "Garment"}: {defect.description || defect.defect_type}
                            </span>
                            {defect.photo_url ? (
                              <button
                                type="button"
                                onClick={() => setViewingPhotoUrl(defect.photo_url || null)}
                                className="shrink-0 font-bold text-amber-800 underline cursor-pointer"
                              >
                                View Photo
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Customer Special Instructions */}
                  {order.specialInstructions ? (
                    <div className="border-t border-zinc-100 bg-zinc-50/70 px-4 md:px-5 py-3 flex items-start gap-2 text-xs text-zinc-800">
                      <Sparkles className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-zinc-500">Customer Note: </span>
                        <span className="font-medium text-zinc-950">
                          {order.specialInstructions}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </section>

                {/* 3. Payout & Billing Breakdown Card */}
                <section className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Payout & Billing Summary
                    </h2>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                        order.paymentMode === "online" || order.paymentStatus === "paid"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {order.paymentMode === "online" || order.paymentStatus === "paid"
                        ? "Online Paid"
                        : "Cash Collect"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-medium">Garment Subtotal</span>
                      <span className="font-semibold text-zinc-900 tabular-nums">
                        {inr(charges.subtotal)}
                      </span>
                    </div>
                    {expressBonus > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Express Partner Bonus</span>
                        <span className="font-bold text-emerald-700 tabular-nums">
                          +{inr(expressBonus)}
                        </span>
                      </div>
                    ) : null}
                    {charges.pickupFee > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Pickup & Delivery Fee</span>
                        <span className="font-semibold text-zinc-900 tabular-nums">
                          {inr(charges.pickupFee)}
                        </span>
                      </div>
                    ) : null}
                    {charges.taxes > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Taxes & GST</span>
                        <span className="font-semibold text-zinc-900 tabular-nums">
                          {inr(charges.taxes)}
                        </span>
                      </div>
                    ) : null}
                    {charges.discount > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Discount Applied</span>
                        <span className="font-semibold text-emerald-700 tabular-nums">
                          -{inr(charges.discount)}
                        </span>
                      </div>
                    ) : null}

                    <div className="border-t border-zinc-100 pt-2.5 flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-950">Net Order Value</span>
                      <span className="text-base font-bold text-zinc-950 tabular-nums">
                        {inr(charges.total || order.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowInvoiceSheet(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 py-2.5 px-3 text-xs font-semibold text-zinc-800 cursor-pointer"
                    >
                      <FileText className="size-3.5" />
                      Tax Invoice
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintTag}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 py-2.5 px-3 text-xs font-semibold text-zinc-800 cursor-pointer"
                    >
                      <Printer className="size-3.5" />
                      Print 58mm Slip
                    </button>
                  </div>
                </section>
              </div>

              {/* RIGHT CONTEXT COLUMN (4 COLS) */}
              <div className="lg:col-span-4 space-y-4">
                {/* 4. Customer & Captain Card */}
                <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Customer & Captain
                  </h2>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-950 truncate">
                          {getDisplayCustomerName(order.customerName)}
                        </p>
                        <p className="text-[11px] font-medium text-zinc-500 mt-0.5 tabular-nums">
                          {maskPhone(order.customerPhone)}
                        </p>
                      </div>
                      {order.customerPhone ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleInitiateCall(
                              getDisplayCustomerName(order.customerName),
                              order.customerPhone,
                              "Customer"
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-900 shrink-0 cursor-pointer"
                        >
                          <Phone className="size-3 text-emerald-600" />
                          Call
                        </button>
                      ) : null}
                    </div>
                    {order.pickupAddress ? (
                      <div className="border-t border-zinc-200/70 pt-2 flex items-start gap-1.5 text-[11px] font-medium text-zinc-600">
                        <MapPin className="size-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <span>{order.pickupAddress}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Assigned Captain Box */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Assigned Captain
                      </p>
                      <p className="text-xs font-bold text-zinc-950 truncate mt-0.5">
                        {hasAssignedRider ? riderName : "Searching nearby Captain..."}
                      </p>
                      {riderVehicle ? (
                        <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                          {riderVehicle}
                        </p>
                      ) : null}
                    </div>
                    {riderPhone ? (
                      <button
                        type="button"
                        onClick={() => handleInitiateCall(riderName || "Captain", riderPhone, "Captain")}
                        className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1.5 text-[11px] font-semibold text-white shrink-0 cursor-pointer"
                      >
                        <Bike className="size-3" />
                        Call
                      </button>
                    ) : null}
                  </div>
                </section>

                {/* 5. Pickup & Drop Route Map Card */}
                <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                      Pickup & Drop Route
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowRiderLocationModal(true)}
                      className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-950 cursor-pointer"
                    >
                      Expand GPS
                    </button>
                  </div>

                  {hasRiderCoords ? (
                    <div className="h-44 w-full">
                      <GoogleMapView
                        className="h-full w-full"
                        interactive={true}
                        zoom={14}
                        center={{
                          latitude: rLat,
                          longitude: rLng,
                          label: "Delivery Captain",
                          tone: "primary",
                        }}
                        markers={[
                          {
                            id: "rider",
                            latitude: rLat,
                            longitude: rLng,
                            label: riderName || "Captain",
                            tone: "primary",
                          },
                          {
                            id: "store",
                            latitude: Number(
                              (order as any)?.partnerLat || (order as any)?.pickupLat || rLat
                            ),
                            longitude: Number(
                              (order as any)?.partnerLng || (order as any)?.pickupLng || rLng
                            ),
                            label: "Your Store",
                            tone: "secondary",
                          },
                        ]}
                      />
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center bg-zinc-50/70">
                      <MapPin className="size-6 text-zinc-400 mx-auto" />
                      <p className="mt-2 text-xs font-semibold text-zinc-800">
                        {hasAssignedRider ? "Captain GPS syncing" : "Route loads after Captain assigns"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {order.distanceKm ? `${order.distanceKm.toFixed(1)} km from store` : "Live store tracking"}
                      </p>
                    </div>
                  )}
                </section>

                {/* 6. Live Timeline + Rate / Help */}
                <section className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900 pb-2 border-b border-zinc-100">
                    Live Timeline
                  </h2>

                  <OrderTimeline order={order} timeline={timeline} stage={order.stage} />

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowReviewModal(true)}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 py-2 px-2.5 text-xs font-semibold text-zinc-800 cursor-pointer"
                    >
                      <Star className="size-3.5 text-amber-500" />
                      {(order as any)?.partnerReviewed ? "Rated" : "Rate Order"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void navigate({
                          to: partnerRoutes.help,
                          search: { orderCode: order.code, orderId: order.id } as any,
                        })
                      }
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 py-2 px-2.5 text-xs font-semibold text-rose-600 cursor-pointer"
                    >
                      <HelpCircle className="size-3.5" />
                      Order Help
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sticky Action Bar for Active Orders */}
        {order && !isOrderCancelled && !isCompletedStage ? (
          <div className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-sm">
            <div className="mx-auto max-w-6xl">
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

      {/* Expanded Live Rider Tracking Modal */}
      {showRiderLocationModal && order ? (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRiderLocationModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Captain GPS Tracking</h3>
                <p className="text-[11px] text-zinc-500">Order #{order.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRiderLocationModal(false)}
                className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {hasRiderCoords ? (
              <div className="h-56 w-full overflow-hidden rounded-xl border border-zinc-200">
                <GoogleMapView
                  className="h-full w-full"
                  interactive={true}
                  zoom={15}
                  center={{ latitude: rLat, longitude: rLng, label: "Captain", tone: "primary" }}
                  markers={[{ id: "rider", latitude: rLat, longitude: rLng, label: riderName || "Captain", tone: "primary" }]}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center space-y-1.5">
                <MapPin className="size-6 text-zinc-400 mx-auto" />
                <p className="text-xs font-bold text-zinc-800">Waiting for Captain GPS signal</p>
                <p className="text-[11px] text-zinc-500">
                  Live coordinates appear automatically once the Captain starts navigation.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowRiderLocationModal(false)}
              className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-800 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

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
          customerName={getDisplayCustomerName(order.customerName)}
          riderName={riderName || "Delivery Captain"}
          onSuccess={() => {
            if (matchedOrder) (matchedOrder as any).partnerReviewed = true;
            if (fetchedOrder) (fetchedOrder as any).partnerReviewed = true;
          }}
        />
      ) : null}

      {order && isDefectModalOpen ? (
        <PrewashDefectModal
          isOpen={isDefectModalOpen}
          onClose={() => setIsDefectModalOpen(false)}
          orderId={order.id}
          orderCode={order.code}
          availableItems={items.map((it) => ({ id: it.id, name: it.name }))}
          onDefectReported={(newDefect) => {
            setFetchedOrder((prev) =>
              prev
                ? {
                    ...prev,
                    hasDefectsReported: true,
                    garmentDefects: [...(prev.garmentDefects || []), newDefect],
                  }
                : prev
            );
          }}
        />
      ) : null}

      {viewingPhotoUrl ? (
        <div
          onClick={() => setViewingPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-700 p-2"
          >
            <button
              type="button"
              onClick={() => setViewingPhotoUrl(null)}
              aria-label="Close photo"
              className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black cursor-pointer"
            >
              <X className="size-4" />
            </button>
            <img
              src={viewingPhotoUrl}
              alt="Pre-wash defect evidence"
              className="max-h-[82vh] w-auto object-contain mx-auto rounded-xl"
            />
          </div>
        </div>
      ) : null}

      <Toaster />
    </PartnerLayout>
  );
}
