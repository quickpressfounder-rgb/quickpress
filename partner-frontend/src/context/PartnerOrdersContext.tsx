import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { PartnerOrder, PartnerOrderStatus } from "@/shared/types/partner";
import {
  acceptPartnerOrder,
  completePartnerOrder,
  extendOrderPrepTime,
  fetchPartnerOrders,
  rejectPartnerOrder,
  startProcessingOrder,
  verifyPartnerDispatchOtp,
} from "@/api/partner/partner-orders-api";

import { HIGH_VALUE_THRESHOLD, type ManagedOrder, type OrderStage } from "../data/partner-orders-mock";
import { rebindPartnerSocket, subscribePartnerOrders } from "@/lib/partner-socket";
import { hasActiveSessionToken } from "@/api/core/session-store";

/* ------------------------------------------------------------------ */
/* Filter / sort vocabulary                                            */
/* ------------------------------------------------------------------ */

export type OrderFilterId =
  | "today"
  | "tomorrow"
  | "completed"
  | "cancelled"
  | "refunded"
  | "cod"
  | "online"
  | "high_value";

export const ORDER_FILTERS: { id: OrderFilterId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "refunded", label: "Refunded" },
  { id: "cod", label: "COD" },
  { id: "online", label: "Online Payment" },
  { id: "high_value", label: "High Value" },
];

export type OrderSortId = "latest" | "oldest" | "amount" | "nearest";

export const ORDER_SORTS: { id: OrderSortId; label: string }[] = [
  { id: "latest", label: "Latest" },
  { id: "oldest", label: "Oldest" },
  { id: "amount", label: "Highest Amount" },
  { id: "nearest", label: "Nearest Pickup" },
];

export function matchesFilter(order: ManagedOrder, filter: OrderFilterId) {
  switch (filter) {
    case "today":
      return order.pickupDay === "today";
    case "tomorrow":
      return order.pickupDay === "tomorrow";
    case "completed":
      return order.stage === "completed";
    case "cancelled":
      return order.stage === "cancelled";
    case "refunded":
      return (
        order.stage === "refunded" ||
        order.paymentStatus === "refunded" ||
        (order as any).refund_status === "completed" ||
        (order as any).refund_status === "processed" ||
        (order as any).refund_status === "refunded" ||
        Boolean((order as any).refund_id) ||
        Boolean((order as any).refundAmount && (order as any).refundAmount > 0) ||
        Boolean(order.refundStatus && order.refundStatus !== "none")
      );
    case "cod":
      return order.paymentMode === "cod";
    case "online":
      return order.paymentMode === "online";
    case "high_value":
      return order.amount >= HIGH_VALUE_THRESHOLD;
    default:
      return true;
  }
}

export function matchesQuery(order: ManagedOrder, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  // Clean alphanumeric and digits
  const qClean = q.replace(/^[#\s]+/, "");
  const digits = q.replace(/\D/g, "");

  // Match order code or ID (with or without #)
  const code = (order.code || "").toLowerCase();
  const id = (order.id || "").toLowerCase();
  if (code.includes(q) || code.includes(qClean) || id.includes(q) || id.includes(qClean)) {
    return true;
  }

  // Match customer name
  const custName = (order.customerName || "").toLowerCase();
  if (custName.includes(q) || custName.includes(qClean)) {
    return true;
  }

  // Match customer phone (3+ digits)
  const custPhone = (order.customerPhone || "").replace(/\D/g, "");
  if (digits.length >= 3 && custPhone.includes(digits)) {
    return true;
  }

  // Match item names or services
  if (Array.isArray(order.items)) {
    const hasMatchingItem = order.items.some((it) => {
      const itName = (it.name || "").toLowerCase();
      const itService = (it.service || "").toLowerCase();
      return itName.includes(q) || itService.includes(q);
    });
    if (hasMatchingItem) return true;
  }

  if (Array.isArray(order.services)) {
    const hasMatchingService = order.services.some((s) => (s || "").toLowerCase().includes(q));
    if (hasMatchingService) return true;
  }

  // Match pickup/delivery address
  const pickupAddr = (order.pickupAddress || "").toLowerCase();
  const deliveryAddr = (order.deliveryAddress || "").toLowerCase();
  if (pickupAddr.includes(q) || deliveryAddr.includes(q)) {
    return true;
  }

  // Match rider name
  const riderName = String(order.assignedRider || (order as any).rider?.name || "").toLowerCase();
  if (riderName && riderName.includes(q)) {
    return true;
  }

  return false;
}

export function sortOrders(list: ManagedOrder[], sort: OrderSortId) {
  const copy = [...list];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => b.placedMinutesAgo - a.placedMinutesAgo);
    case "amount":
      return copy.sort((a, b) => b.amount - a.amount);
    case "nearest":
      return copy.sort((a, b) => a.distanceKm - b.distanceKm);
    case "latest":
    default:
      return copy.sort((a, b) => a.placedMinutesAgo - b.placedMinutesAgo);
  }
}

/* ------------------------------------------------------------------ */
/* Backend → view-model adapter                                        */
/* ------------------------------------------------------------------ */

const STATUS_TO_STAGE: Record<string, OrderStage> = {
  placed: "new",
  pending_partner_acceptance: "new",
  new: "new",
  accepted: "accepted",
  partner_accepted: "accepted",
  pickup_rider_assigned: "accepted",
  rider_assigned: "accepted",
  pickup_rider_accepted: "accepted",
  rider_accepted: "accepted",
  arrived_pickup: "pickup_pending",
  picked: "pickup_pending",
  picked_up: "pickup_pending",
  in_transit_to_store: "pickup_pending",
  at_partner: "at_partner",
  "at-partner": "at_partner",
  at_store: "at_partner",
  "at-store": "at_partner",
  store_received: "at_partner",
  store_drop_confirmed: "at_partner",
  processing_started: "washing",
  processing: "washing",
  washing: "washing",
  ironing: "ironing",
  dry_cleaning: "dry_cleaning",
  ready: "ready",
  ready_for_delivery: "ready",
  delivery_rider_assigned: "ready",
  delivery_rider_accepted: "ready",
  out_for_delivery: "ready",
  completed: "completed",
  delivered: "completed",
  cancelled: "cancelled",
  rejected: "cancelled",
  store_rejected: "cancelled",
  cancelled_by_customer: "cancelled",
  cancelled_by_partner: "cancelled",
  cancelled_by_admin: "cancelled",
  refunded: "refunded",
  refund_completed: "refunded",
  refund_processed: "refunded",
};

function toManagedOrder(order: PartnerOrder | any): ManagedOrder {
  const timeline = Array.isArray(order?.timeline) ? order.timeline : [];
  const items = Array.isArray(order?.items) ? order.items : [];
  const cancelledEntry = timeline.find((entry: any) => /reject|cancel/i.test(entry.label));
  const rawStatus = String(order?.status || order?.stage || "new").toLowerCase().trim();
  const isCancelledByMeta = Boolean(
    order?.autoCancelled ||
    order?.cancelledBy ||
    order?.cancelledAt ||
    order?.cancelledReason ||
    order?.cancellationReason ||
    order?.payment?.status === "refunded" ||
    order?.paymentStatus === "refunded"
  );
  const effectiveStatus = (rawStatus === "cancelled" || isCancelledByMeta) ? "cancelled" : rawStatus;

  const isAcceptedByMeta = Boolean(
    order?.partnerAccepted ||
    order?.partnerAcceptedAt ||
    order?.partner_accepted_at ||
    (order?.partner && (order?.partner?.id || order?.partner?.name)) ||
    order?.partnerId ||
    order?.partner_id ||
    order?.assignedRider ||
    order?.rider ||
    order?.riderName
  );

  let stage: OrderStage = STATUS_TO_STAGE[effectiveStatus] ?? "new";
  if (stage === "new" && isAcceptedByMeta) {
    stage = "accepted";
  }

  const rawAmount = Number(
    order?.amount ??
    order?.payableAmount ??
    order?.grandTotal ??
    order?.total ??
    order?.charges?.total ??
    0
  );
  const custName =
    order?.customerName ||
    order?.customer?.name ||
    order?.user?.name ||
    "QuickPress Customer";
  const custPhone =
    order?.customerPhone ||
    order?.customer?.phone ||
    order?.address?.phone ||
    "";
  const addressStr =
    order?.address ||
    order?.pickupAddress ||
    order?.deliveryAddress ||
    (typeof order?.address === "object" ? order?.address?.formatted || order?.address?.line || "" : "") ||
    "Customer Doorstep";
  const slotStr = order?.slot || order?.pickupTime || order?.pickup?.slot || "Today";
  const codeStr = String(order?.code || order?.order_code || order?.id || order?.orderId || "").trim();
  const idStr = String(order?.id || order?.orderId || order?._id || codeStr).trim();

  return {
    id: idStr,
    code: codeStr,
    stage,
    customerName: custName,
    customerRating: 5.0,
    customerPhone: custPhone,
    customerOrders: 1,
    pickupAddress: addressStr,
    deliveryAddress: addressStr,
    pickupTime: slotStr,
    pickupDay: "today",
    deliveryEta: slotStr,
    distanceKm: 0,
    services: order?.serviceLabel ? [order.serviceLabel] : (Array.isArray(order?.services) ? order.services : ["Laundry Service"]),
    itemCount: order?.itemCount || items.reduce((sum: number, it: any) => sum + (it.qty || 1), 0) || 1,
    amount: rawAmount,
    paymentStatus: (effectiveStatus === "cancelled" || isCancelledByMeta) ? "refunded" : (order?.paymentMode === "cod" ? "pending" : "paid"),
    paymentMode: order?.paymentMode || order?.payment?.mode || "cod",
    placedAt: order?.placedAt || order?.createdAt || "Recently",
    placedMinutesAgo: 0,
    specialInstructions: order?.specialInstructions || order?.instructions || "",
    items: items.map((item: any) => ({
      id: item.id || item._id || "",
      name: item.name || "Laundry Service Item",
      service: order?.serviceLabel || "Laundry",
      qty: item.qty || 1,
      price: item.price || 0,
    })),
    charges: {
      subtotal: rawAmount,
      pickupFee: 0,
      taxes: 0,
      discount: 0,
      total: rawAmount,
    },
    timeline: timeline.map((entry: any) => ({ id: entry.id || "", label: entry.label || "", time: entry.time || "" })),
    invoiceNo: null,
    cancelReason: (effectiveStatus === "cancelled" || isCancelledByMeta)
      ? (order?.cancelledReason || order?.cancellationReason || cancelledEntry?.label || "Cancelled")
      : null,
    assignedRider: order?.riderName || order?.rider?.name || null,
    partnerAcceptedAt: order?.partnerAcceptedAt || order?.partner_accepted_at || null,
    cancelledBy: order?.cancelledBy || null,
    slaBreached: order?.slaBreached || null,
    autoCancelled: Boolean(order?.autoCancelled),
    isExpress: Boolean(
      order?.isExpress ||
      order?.pickup?.express ||
      order?.serviceLabel?.toLowerCase().includes("express") ||
      order?.is_express
    ),
    expressFee: Number(order?.expressFee || order?.express_fee) || 0,
    partnerExpressBonus: Number(order?.partnerExpressBonus || order?.partner_express_bonus) || 0,
    expressPartnerSharePercent: Number(order?.expressPartnerSharePercent || order?.express_partner_share_percent) || 20,
    expectedReadyAt: order?.expectedReadyAt || (order?.processingTimeline || {})?.expectedReadyAt || null,
    processingStartedAt: order?.processingStartedAt || (order?.processingTimeline || {})?.processingStartedAt || null,
    processingEstimateMinutes: Number(order?.processingEstimateMinutes) || 120,
    riderHandoverInitiated: Boolean(order?.riderHandoverInitiated || effectiveStatus === "at_partner" || effectiveStatus === "at_store" || effectiveStatus === "store_received"),
    partnerAccepted: Boolean(order?.partnerAccepted || isAcceptedByMeta),
    status: effectiveStatus,
  } as any;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

import { IncomingOrderModal } from "../components/orders/IncomingOrderModal";
import { startOrderAlarm, stopOrderAlarm } from "../lib/order-alarm";
import {
  acquirePartnerWakeLock,
  releasePartnerWakeLock,
  preWarmPartnerAudio,
} from "../lib/partner-order-alert-sound";

type OrdersStore = {
  orders: ManagedOrder[];
  isLoading: boolean;
  isRefreshing: boolean;
  isOffline: boolean;
  error: string | null;
  incomingOrder: ManagedOrder | null;
  refresh: () => Promise<void>;
  acceptOrder: (orderId: string, prepTimeMinutes?: number) => Promise<void>;
  extendOrderTime: (orderId: string, additionalMinutes?: number, reason?: string) => Promise<void>;
  rejectOrder: (orderId: string, reason: string) => Promise<void>;
  startProcessing: (orderId: string) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  verifyDispatchOtp: (orderId: string, otp: string) => Promise<void>;
  counts: Record<OrderStage, number>;
  testIncomingOrderAlarm: () => void;
};

const PartnerOrdersContext = createContext<OrdersStore | null>(null);

let cachedPartnerOrders: ManagedOrder[] | null = null;

const CACHE_KEY = "qp.partner.cachedOrders";

function getCachedOrders(): ManagedOrder[] {
  return [];
}

const CACHED_ORDERS_KEY = "quickpress:partner:cached_orders";
const ACCEPTED_ORDERS_KEY = "qp_partner_accepted_orders_v2";
const SEEN_ORDERS_KEY = "qp_partner_seen_orders_v2";
const CANCELLED_ORDERS_KEY = "qp_partner_cancelled_orders_v2";
const PROCESSING_ORDERS_KEY = "qp_partner_processing_orders_v2";
const READY_ORDERS_KEY = "qp_partner_ready_orders_v2";

function readPersistedSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function writePersistedSet(key: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}

function readCachedOrders(): ManagedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CACHED_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCachedOrders(list: ManagedOrder[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHED_ORDERS_KEY, JSON.stringify(list));
  } catch {}
}

export function PartnerOrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<ManagedOrder[]>(() => readCachedOrders());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<ManagedOrder | null>(null);
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(() => readPersistedSet(SEEN_ORDERS_KEY));

  // Stable references for state to avoid recreating callbacks
  const incomingOrderRef = useRef<ManagedOrder | null>(null);
  incomingOrderRef.current = incomingOrder;

  const seenOrderIdsRef = useRef<Set<string>>(seenOrderIds);
  seenOrderIdsRef.current = seenOrderIds;

  // Persisted tracking sets so page reloads and background polling NEVER revert an active partner transition or re-ring alarms
  const acceptedOrderIds = useRef<Set<string>>(readPersistedSet(ACCEPTED_ORDERS_KEY));
  const processingOrderIds = useRef<Set<string>>(readPersistedSet(PROCESSING_ORDERS_KEY));
  const readyOrderIds = useRef<Set<string>>(readPersistedSet(READY_ORDERS_KEY));
  const cancelledOrderIds = useRef<Set<string>>(readPersistedSet(CANCELLED_ORDERS_KEY));

  const isOperationalRoute = useCallback(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname;
    // Strictly disable on onboarding, auth, registration submitted, or suspended screens
    if (
      path.includes("/registration") ||
      path.includes("/auth") ||
      path.includes("/otp") ||
      path.includes("/suspended") ||
      path.includes("/registration-submitted")
    ) {
      return false;
    }
    return true;
  }, []);

  const load = useCallback(
    async (opts: { refreshing?: boolean; silent?: boolean } = {}) => {
      // Do not fetch orders or ring alarm if on registration/auth/splash pages or unauthenticated
      if (!isOperationalRoute() || !hasActiveSessionToken("partner")) {
        stopOrderAlarm();
        setIsLoading(false);
        return;
      }

      if (opts.refreshing) setIsRefreshing(true);
      else if (!opts.silent && orders.length === 0) setIsLoading(true);
      setError(null);
      try {
        const remote = await fetchPartnerOrders();
        const mapped = remote.map(toManagedOrder);

        // Reconcile with persisted sets so background polling NEVER reverts an action
        const reconciled = mapped.map((o) => {
          if (cancelledOrderIds.current.has(o.id)) {
            return { ...o, stage: "cancelled" as OrderStage };
          }
          if (readyOrderIds.current.has(o.id)) {
            return { ...o, stage: "ready" as OrderStage };
          }
          if (processingOrderIds.current.has(o.id)) {
            return { ...o, stage: "washing" as OrderStage };
          }
          if ((acceptedOrderIds.current.has(o.id) || (o as any).partnerAccepted) && o.stage === "new") {
            return { ...o, stage: "accepted" as OrderStage };
          }
          return o;
        });

        // ⚡ Deduplicate orders strictly by id (Requirement 4: No duplicate orders)
        const dedupMap = new Map<string, ManagedOrder>();
        for (const o of reconciled) {
          if (!dedupMap.has(o.id)) {
            dedupMap.set(o.id, o);
          }
        }
        const deduped = Array.from(dedupMap.values());

        // Monotonic progression rule: Never step back an order that was already accepted/washing/ready
        setOrders((prev) => {
          const prevMap = new Map(prev.map((p) => [p.id, p]));
          const next = deduped.map((item) => {
            const prevItem = prevMap.get(item.id);
            if (prevItem && prevItem.stage !== "new" && item.stage === "new") {
              return { ...item, stage: prevItem.stage };
            }
            return item;
          });
          writeCachedOrders(next);
          return next;
        });

        if (reconciled.length === 0) {
          stopOrderAlarm();
          setIncomingOrder(null);
        }

        // Check for real new unacknowledged orders only if on operational route
        if (isOperationalRoute()) {
          const unacknowledgedNew = reconciled.find(
            (o) =>
              o.stage === "new" &&
              !seenOrderIdsRef.current.has(o.id) &&
              !acceptedOrderIds.current.has(o.id) &&
              !cancelledOrderIds.current.has(o.id) &&
              !(o as any).partnerAccepted &&
              !(o as any).partnerAcceptedAt &&
              o.amount > 0
          );

          if (unacknowledgedNew && !incomingOrderRef.current) {
            seenOrderIdsRef.current.add(unacknowledgedNew.id);
            writePersistedSet(SEEN_ORDERS_KEY, seenOrderIdsRef.current);
            setSeenOrderIds((prev) => new Set([...prev, unacknowledgedNew.id]));
            setIncomingOrder(unacknowledgedNew);
            startOrderAlarm(unacknowledgedNew.code, unacknowledgedNew.amount, unacknowledgedNew.customerName);
          }
        }
      } catch (err: any) {
        // If unauthorized, forbidden (no partner profile), or 404, purge local orders & cache
        if (err?.status === 401 || err?.status === 403 || err?.status === 404 || err?.kind === "unauthorized") {
          setOrders([]);
          writeCachedOrders([]);
          acceptedOrderIds.current.clear();
          processingOrderIds.current.clear();
          readyOrderIds.current.clear();
          cancelledOrderIds.current.clear();
          stopOrderAlarm();
          setIncomingOrder(null);
        }
        if (orders.length === 0) {
          setError(err instanceof Error ? err.message : "Failed to load orders");
        }
      } finally {
        if (opts.refreshing) setIsRefreshing(false);
        setIsLoading(false);
      }
    },
    [isOperationalRoute],
  );

  // Initial load
  useEffect(() => {
    if (hasActiveSessionToken("partner") && isOperationalRoute()) {
      void load();
    }
  }, [load, isOperationalRoute]);

  // Pre-warm audio and unlock audio context immediately on mount
  useEffect(() => {
    preWarmPartnerAudio();
  }, []);

  // Screen WakeLock: Keep merchant console screen active and prevent sleep
  useEffect(() => {
    if (hasActiveSessionToken("partner") && isOperationalRoute()) {
      void acquirePartnerWakeLock();
    }
    return () => {
      void releasePartnerWakeLock();
    };
  }, [isOperationalRoute]);

  // Real-time Socket.IO subscription for 0ms latency live order events
  useEffect(() => {
    if (!hasActiveSessionToken("partner")) return;
    rebindPartnerSocket();

    const unsub = subscribePartnerOrders((data) => {
      console.log("[PartnerOrdersContext] ⚡ Fast Socket order event received:", data);

      const rawOrder = data?.order || data;
      const orderId = String(rawOrder?.id || rawOrder?._id || data?.orderId || "").trim();
      const code = String(rawOrder?.code || data?.code || orderId).trim();
      const status = String(rawOrder?.status || data?.status || "new").toLowerCase().trim();

      // Check if this is an incoming order event requiring store acceptance
      const isNewOrder =
        status === "pending_partner_acceptance" ||
        status === "created" ||
        status === "new" ||
        status === "placed" ||
        !status;

      if (isOperationalRoute() && isNewOrder && (orderId || code)) {
        if (
          (!orderId || !seenOrderIdsRef.current.has(orderId)) &&
          (!orderId || !acceptedOrderIds.current.has(orderId)) &&
          (!orderId || !cancelledOrderIds.current.has(orderId))
        ) {
          console.log("[PartnerOrdersContext] 🚀 INSTANT ZERO-LAG ORDER DISPLAY for:", code);
          if (orderId) seenOrderIdsRef.current.add(orderId);
          setSeenOrderIds((prev) => new Set([...prev, orderId || code]));

          // Build ManagedOrder from payload immediately so modal and list update with 0ms delay
          const managed = toManagedOrder(rawOrder);
          if (orderId) managed.id = orderId;
          if (code) managed.code = code;
          const payloadAmount = Number(data?.amount || rawOrder?.amount || (rawOrder?.totals?.grandTotal) || 0);
          if (payloadAmount > 0) managed.amount = payloadAmount;
          managed.stage = "new";

          // ⚡ TRIGGER ORDER ALARM BELL INSTANTANEOUSLY (<0.010s) + Native Android Background Siren
          startOrderAlarm(managed.code, managed.amount, managed.customerName);

          setIncomingOrder(managed);
          setOrders((prev) => {
            const existingIdx = prev.findIndex((o) => o.id === managed.id || o.code === managed.code);
            let next: ManagedOrder[];
            if (existingIdx >= 0) {
              next = [...prev];
              next[existingIdx] = { ...next[existingIdx], ...managed };
            } else {
              next = [managed, ...prev];
            }
            writeCachedOrders(next);
            return next;
          });

          // Dispatch DOM custom event so dashboard KPI cards and other screens update instantly
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("qp:partner:new_order", { detail: managed }));
          }

          // Background silent sync to populate any server-computed fields
          void load({ silent: true });
        }
      } else if (orderId) {
        // Lifecycle event (accepted, in transit, ready, delivered, cancelled)
        if (status === "cancelled") {
          cancelledOrderIds.current.add(orderId);
          if (incomingOrderRef.current?.id === orderId || incomingOrderRef.current?.code === code) {
            stopOrderAlarm();
            setIncomingOrder(null);
          }
        }
        const newStage = STATUS_TO_STAGE[status];
        if (newStage) {
          setOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === orderId || o.code === code);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...next[idx], stage: newStage, status: status as any };
            writeCachedOrders(next);
            return next;
          });
        }
      }

      // Reconcile complete database records in parallel
      void load({ silent: true });
    });
    return () => unsub();
  }, [load, isOperationalRoute]);

  // Active fast polling when screen is active + tab visibility and Capacitor appStateChange listener for instant refresh on focus/resume
  useEffect(() => {
    if (!hasActiveSessionToken("partner")) return;

    // Refresh immediately on tab focus or screen wake
    const handleVisibilityChange = () => {
      if ((document.visibilityState === "visible" || typeof document === "undefined") && hasActiveSessionToken("partner") && isOperationalRoute()) {
        rebindPartnerSocket();
        void load({ silent: false });
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    let removeCapacitorListener: (() => void) | undefined;
    if (typeof window !== "undefined") {
      import("@capacitor/app")
        .then(({ App }) => {
          const handle = App.addListener("appStateChange", ({ isActive }) => {
            if (isActive && hasActiveSessionToken("partner") && isOperationalRoute()) {
              rebindPartnerSocket();
              void load({ silent: false });
            }
          });
          removeCapacitorListener = () => {
            handle.then((h) => h.remove()).catch(() => {});
          };
        })
        .catch(() => {});
    }

    // Fast 2.0s fallback interval when tab is focused, 6s when in background
    const pollInterval = setInterval(() => {
      if (hasActiveSessionToken("partner") && isOperationalRoute()) {
        void load({ silent: true });
      }
    }, typeof document !== "undefined" && document.visibilityState === "visible" ? 2000 : 6000);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      removeCapacitorListener?.();
    };
  }, [load, isOperationalRoute]);

  // Stop alarm on unmount
  useEffect(() => {
    return () => {
      stopOrderAlarm();
      void releasePartnerWakeLock();
    };
  }, []);

  useEffect(() => {
    const sync = () => setIsOffline(!window.navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const refresh = useCallback(() => load({ refreshing: true }), [load]);

  const acceptOrder = useCallback(
    async (orderId: string, prepTimeMinutes: number = 20) => {
      stopOrderAlarm();
      setIncomingOrder(null);
      acceptedOrderIds.current.add(orderId);
      writePersistedSet(ACCEPTED_ORDERS_KEY, acceptedOrderIds.current);

      // ⚡ INSTANTANEOUS OPTIMISTIC ACTION (0ms lag):
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                stage: "accepted" as OrderStage,
                partnerAccepted: true,
                prepTimeMinutes,
                estimatedReadyAt: new Date(Date.now() + prepTimeMinutes * 60000).toISOString(),
              }
            : o
        )
      );

      try {
        await acceptPartnerOrder(orderId, prepTimeMinutes);
      } catch (err) {
        console.error("[PartnerOrdersContext] accept error:", err);
      }
      void load({ refreshing: true });
    },
    [load],
  );

  const extendOrderTime = useCallback(
    async (orderId: string, additionalMinutes: number = 10, reason: string = "") => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const currentPrep = Number(o.prepTimeMinutes || 20);
          const newPrep = currentPrep + additionalMinutes;
          const prevReady = o.estimatedReadyAt ? new Date(o.estimatedReadyAt).getTime() : Date.now();
          const newReadyTime = Math.max(prevReady, Date.now()) + additionalMinutes * 60000;
          return {
            ...o,
            prepTimeMinutes: newPrep,
            estimatedReadyAt: new Date(newReadyTime).toISOString(),
          };
        })
      );

      try {
        await extendOrderPrepTime(orderId, additionalMinutes, reason);
      } catch (err) {
        console.error("[PartnerOrdersContext] extend prep time error:", err);
      }
      void load({ refreshing: true });
    },
    [load],
  );

  const rejectOrder = useCallback(
    async (orderId: string, reason: string) => {
      stopOrderAlarm();
      setIncomingOrder(null);
      cancelledOrderIds.current.add(orderId);
      writePersistedSet(CANCELLED_ORDERS_KEY, cancelledOrderIds.current);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, stage: "cancelled" as OrderStage }
            : o
        )
      );

      try {
        await rejectPartnerOrder(orderId, reason);
      } catch (err) {
        console.error("[PartnerOrdersContext] reject error:", err);
      }
      void load({ refreshing: true });
    },
    [load],
  );

  // Listen to system notification action buttons: "ACCEPT ORDER" and "VIEW"
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAcceptFromNotification = (e: any) => {
      const targetCode = String(e?.detail?.code || "").trim();
      if (!targetCode) return;
      console.log("[PartnerOrdersContext] 🔔 Received qp:partner:accept_order from system notification:", targetCode);
      stopOrderAlarm();

      setOrders((prev) => {
        const found = prev.find((o) => o.code === targetCode || o.id === targetCode);
        if (found) {
          void acceptOrder(found.id);
        }
        return prev;
      });
    };

    const handleViewFromNotification = (e: any) => {
      const targetCode = String(e?.detail?.code || "").trim();
      if (!targetCode) return;
      console.log("[PartnerOrdersContext] 🔔 Received qp:partner:view_order from system notification:", targetCode);

      setOrders((prev) => {
        const found = prev.find((o) => o.code === targetCode || o.id === targetCode);
        if (found) {
          setIncomingOrder(found);
        }
        return prev;
      });
    };

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "QP_ACCEPT_ORDER" && event.data?.orderId) {
        console.log("[PartnerOrdersContext] 🔔 Received QP_ACCEPT_ORDER from ServiceWorker:", event.data.orderId);
        stopOrderAlarm();
        void acceptOrder(event.data.orderId);
      }
    };
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    window.addEventListener("qp:partner:accept_order", handleAcceptFromNotification);
    window.addEventListener("qp:partner:view_order", handleViewFromNotification);

    return () => {
      window.removeEventListener("qp:partner:accept_order", handleAcceptFromNotification);
      window.removeEventListener("qp:partner:view_order", handleViewFromNotification);
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, [acceptOrder]);

  const startProcessing = useCallback(
    async (orderId: string) => {
      processingOrderIds.current.add(orderId);
      writePersistedSet(PROCESSING_ORDERS_KEY, processingOrderIds.current);

      // ⚡ INSTANTANEOUS OPTIMISTIC ACTION (0ms lag):
      // Immediately advances to "washing" so the next step button ("Mark Ready for Delivery") appears!
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, stage: "washing" as OrderStage }
            : o
        )
      );

      try {
        await startProcessingOrder(orderId);
      } catch (err) {
        console.error("[PartnerOrdersContext] startProcessing error:", err);
      }
      void load({ refreshing: true });
    },
    [load],
  );

  const completeOrder = useCallback(
    async (orderId: string) => {
      readyOrderIds.current.add(orderId);
      writePersistedSet(READY_ORDERS_KEY, readyOrderIds.current);

      // ⚡ INSTANTANEOUS OPTIMISTIC ACTION (0ms lag):
      // Immediately advances to "ready"
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, stage: "ready" as OrderStage }
            : o
        )
      );

      try {
        await completePartnerOrder(orderId);
      } catch (err) {
        console.error("[PartnerOrdersContext] completeOrder error:", err);
      }
      void load({ refreshing: true });
    },
    [load],
  );

  const verifyDispatchOtp = useCallback(
    async (orderId: string, otp: string) => {
      const cleanOtp = otp.trim();
      await verifyPartnerDispatchOtp(orderId, cleanOtp);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, stage: "out_for_delivery" as any, canonicalStatus: "out_for_delivery" }
            : o
        )
      );
      void load({ refreshing: true });
    },
    [load],
  );

  const testIncomingOrderAlarm = useCallback(() => {
    // Disabled in production/live integration: order alarm only triggers on real API orders
  }, []);

  const counts = useMemo(() => {
    const base: Record<OrderStage, number> = {
      new: 0,
      accepted: 0,
      pickup_pending: 0,
      washing: 0,
      dry_cleaning: 0,
      ironing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const order of orders) {
      if (order && order.stage) {
        base[order.stage] = (base[order.stage] || 0) + 1;
      }
    }
    return base;
  }, [orders]);

  const value = useMemo(
    () => ({
      orders,
      isLoading,
      isRefreshing,
      isOffline,
      error,
      incomingOrder,
      refresh,
      acceptOrder,
      rejectOrder,
      startProcessing,
      completeOrder,
      verifyDispatchOtp,
      counts,
      testIncomingOrderAlarm,
    }),
    [
      orders,
      isLoading,
      isRefreshing,
      isOffline,
      error,
      incomingOrder,
      refresh,
      acceptOrder,
      extendOrderTime,
      rejectOrder,
      startProcessing,
      completeOrder,
      verifyDispatchOtp,
      counts,
      testIncomingOrderAlarm,
    ],
  );

  return (
    <PartnerOrdersContext.Provider value={value}>
      {children}
      {incomingOrder ? (
        <IncomingOrderModal
          order={incomingOrder}
          onAccept={acceptOrder}
          onReject={rejectOrder}
          onDismiss={() => {
            stopOrderAlarm();
            setIncomingOrder(null);
          }}
        />
      ) : null}
    </PartnerOrdersContext.Provider>
  );
}

export function usePartnerOrders() {
  const ctx = useContext(PartnerOrdersContext);
  if (!ctx) throw new Error("usePartnerOrders must be used inside <PartnerOrdersProvider>");
  return ctx;
}
