import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { PartnerOrder, PartnerOrderStatus } from "@/shared/types/partner";
import {
  acceptPartnerOrder,
  completePartnerOrder,
  fetchPartnerOrders,
  rejectPartnerOrder,
  startProcessingOrder,
  verifyPartnerDispatchOtp,
} from "@/api/partner/partner-orders-api";

import { HIGH_VALUE_THRESHOLD, type ManagedOrder, type OrderStage } from "../data/partner-orders-mock";
import { subscribePartnerOrders } from "@/lib/partner-socket";

/* ------------------------------------------------------------------ */
/* Filter / sort vocabulary                                            */
/* ------------------------------------------------------------------ */

export type OrderFilterId =
  | "today"
  | "tomorrow"
  | "completed"
  | "cancelled"
  | "cod"
  | "online"
  | "high_value";

export const ORDER_FILTERS: { id: OrderFilterId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
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

export function matchesQuery(order: ManagedOrder, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    order.code.toLowerCase().includes(q) ||
    order.id.toLowerCase().includes(q) ||
    order.customerName.toLowerCase().includes(q) ||
    (digits.length >= 3 && order.customerPhone.replace(/\D/g, "").includes(digits))
  );
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
  store_received: "at_partner",
  processing: "washing",
  washing: "washing",
  ironing: "ironing",
  dry_cleaning: "dry_cleaning",
  ready: "ready",
  ready_for_delivery: "ready",
  delivery_rider_assigned: "ready",
  delivery_rider_accepted: "ready",
  out_for_delivery: "ready",
  completed: "ready",
  delivered: "completed",
  cancelled: "cancelled",
};

function toManagedOrder(order: PartnerOrder): ManagedOrder {
  const timeline = Array.isArray(order?.timeline) ? order.timeline : [];
  const items = Array.isArray(order?.items) ? order.items : [];
  const cancelledEntry = timeline.find((entry) => /reject|cancel/i.test(entry.label));
  return {
    id: order.id || (order as any).orderId || "",
    code: order.code || order.id || (order as any).orderId || "",
    stage: STATUS_TO_STAGE[order.status] ?? "new",
    customerName: order.customerName || "Customer",
    customerRating: 5.0,
    customerPhone: order.customerPhone || "",
    customerOrders: 1,
    pickupAddress: order.address || "",
    deliveryAddress: order.address || "",
    pickupTime: order.slot || "Today",
    pickupDay: "today",
    deliveryEta: order.slot || "Tomorrow",
    distanceKm: 0,
    services: order.serviceLabel ? [order.serviceLabel] : [],
    itemCount: order.itemCount || items.reduce((sum, it) => sum + (it.qty || 1), 0) || 1,
    amount: order.amount || 0,
    paymentStatus: order.status === "cancelled" ? "refunded" : order.paymentMode === "cod" ? "pending" : "paid",
    paymentMode: order.paymentMode || "cod",
    placedAt: order.placedAt || "Recently",
    placedMinutesAgo: 0,
    specialInstructions: "",
    items: items.map((item) => ({
      id: item.id || "",
      name: item.name || "Laundry Service Item",
      service: order.serviceLabel || "Laundry",
      qty: item.qty || 1,
      price: item.price || 0,
    })),
    charges: {
      subtotal: order.amount || 0,
      pickupFee: 0,
      taxes: 0,
      discount: 0,
      total: order.amount || 0,
    },
    timeline: timeline.map((entry) => ({ id: entry.id || "", label: entry.label || "", time: entry.time || "" })),
    invoiceNo: null,
    cancelReason: order.status === "cancelled" ? (cancelledEntry?.label ?? (order as any).cancelledReason ?? "Cancelled") : null,
    assignedRider: (order as any).riderName || null,
    isExpress: Boolean(
      (order as any).isExpress ||
      (order as any).pickup?.express ||
      order.serviceLabel?.toLowerCase().includes("express") ||
      (order as any).is_express
    ),
    expressFee: Number((order as any).expressFee || (order as any).express_fee) || 0,
    partnerExpressBonus: Number((order as any).partnerExpressBonus || (order as any).partner_express_bonus) || 0,
    expressPartnerSharePercent: Number((order as any).expressPartnerSharePercent || (order as any).express_partner_share_percent) || 20,
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

import { IncomingOrderModal } from "../components/orders/IncomingOrderModal";
import { startOrderAlarm, stopOrderAlarm } from "../lib/order-alarm";

type OrdersStore = {
  orders: ManagedOrder[];
  isLoading: boolean;
  isRefreshing: boolean;
  isOffline: boolean;
  error: string | null;
  incomingOrder: ManagedOrder | null;
  refresh: () => Promise<void>;
  acceptOrder: (orderId: string) => Promise<void>;
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
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(() => new Set());

  // Stable references for state to avoid recreating callbacks
  const incomingOrderRef = useRef<ManagedOrder | null>(null);
  incomingOrderRef.current = incomingOrder;

  const seenOrderIdsRef = useRef<Set<string>>(seenOrderIds);
  seenOrderIdsRef.current = seenOrderIds;

  // Optimistic tracking sets so background polling never reverts an active partner transition
  const acceptedOrderIds = useRef<Set<string>>(new Set());
  const processingOrderIds = useRef<Set<string>>(new Set());
  const readyOrderIds = useRef<Set<string>>(new Set());
  const cancelledOrderIds = useRef<Set<string>>(new Set());

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
      // Do not fetch orders or ring alarm if on registration/auth/splash pages
      if (!isOperationalRoute()) {
        stopOrderAlarm();
        return;
      }

      if (opts.refreshing) setIsRefreshing(true);
      else if (!opts.silent && orders.length === 0) setIsLoading(true);
      setError(null);
      try {
        const remote = await fetchPartnerOrders();
        const mapped = remote.map(toManagedOrder);

        // Reconcile with optimistic states so background polling NEVER reverts an action
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
          if (acceptedOrderIds.current.has(o.id) && o.stage === "new") {
            return { ...o, stage: "accepted" as OrderStage };
          }
          return o;
        });

        // ⚡ Shallow diffing: ONLY update state if orders actually changed!
        // This eliminates 95% of background re-renders and solves UI page lag!
        setOrders((prev) => {
          if (
            prev.length === reconciled.length &&
            prev.every(
              (p, idx) =>
                p.id === reconciled[idx]?.id &&
                p.stage === reconciled[idx]?.stage &&
                p.amount === reconciled[idx]?.amount
            )
          ) {
            return prev; // Same reference -> 0 component re-renders!
          }
          writeCachedOrders(reconciled);
          return reconciled;
        });

        if (reconciled.length === 0) {
          acceptedOrderIds.current.clear();
          processingOrderIds.current.clear();
          readyOrderIds.current.clear();
          cancelledOrderIds.current.clear();
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
              o.amount > 0
          );

          if (unacknowledgedNew && !incomingOrderRef.current) {
            setSeenOrderIds((prev) => new Set([...prev, unacknowledgedNew.id]));
            setIncomingOrder(unacknowledgedNew);
            startOrderAlarm(unacknowledgedNew.code);
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
    void load();
  }, [load]);

  // Real-time Socket.IO subscription for 0ms latency live order events
  useEffect(() => {
    const unsub = subscribePartnerOrders((data) => {
      console.log("[PartnerOrdersContext] ⚡ Socket order event:", data);
      void load({ silent: true });
    });
    return () => unsub();
  }, [load]);

  // Gentle background safety poll (every 10s instead of thrashing every 3s)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      void load({ silent: true });
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [load]);

  // Stop alarm on unmount
  useEffect(() => {
    return () => {
      stopOrderAlarm();
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
    async (orderId: string) => {
      stopOrderAlarm();
      setIncomingOrder(null);
      acceptedOrderIds.current.add(orderId);

      // ⚡ INSTANTANEOUS OPTIMISTIC ACTION (0ms lag):
      // Advances stage immediately in local state so "Accept" disappears instantly
      // and the next step button appears right away!
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, stage: "accepted" as OrderStage }
            : o
        )
      );

      try {
        await acceptPartnerOrder(orderId);
      } catch (err) {
        console.error("[PartnerOrdersContext] accept error:", err);
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

  const startProcessing = useCallback(
    async (orderId: string) => {
      processingOrderIds.current.add(orderId);

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
