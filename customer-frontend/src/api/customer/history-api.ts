/**
 * Order history data layer — Sprint 2.5.
 *
 *   GET  /api/orders/history          search + status / date / partner filters
 *   GET  /api/orders                  fallback list (older backends)
 *   GET  /api/services                resolves the service a row deep-links to
 *   POST /api/orders/{id}/reorder     one tap reorder into the smart cart
 *   POST /api/orders/{id}/cancel      cancel before pickup
 *
 * Recent orders are cached locally so History paints instantly on a warm start
 * and still renders (from the stale cache) when the device is offline.
 */

import type { Order, OrderLifecycleStatus, ServiceEntity } from "@/shared/types";

import { formatOrderDate, formatOrderTime } from "@/shared/utils/order-mappers";
import { apiGetJson, apiPostJson } from "../core/transport";
import { CACHE_KEYS, readCache, readStaleCache, writeCache } from "./api/cache";
import { hydrateCart, setCartLines, type CartLine } from "./cart-store";
import { postCartItem } from "./cart-api";

export const HISTORY_API_ENDPOINTS = {
  orders: "/api/orders",
  history: "/api/orders/history",
  services: "/api/services",
  reorder: "/api/orders/{id}/reorder",
  cancel: "/api/orders/{id}/cancel",
} as const;

export type OrderStatus = "delivered" | "in-progress" | "cancelled" | "refunded";

export type OrderItem = {
  name: string;
  qty: number;
  price?: number;
};

export type OrderRecord = {
  /** Order number (QP…) — what the customer sees and searches by. */
  id: string;
  /** Internal order id used by every /api/orders/{id} call. */
  orderId: string;
  serviceId: string;
  service: string;
  store: string;
  partnerId: string;
  placedOn: string;
  /** Raw ISO timestamp, used by the date filter. */
  placedAt: string;
  status: OrderStatus;
  lifecycleStatus: OrderLifecycleStatus;
  cancelledReason: string | null;
  total: number;
  items: OrderItem[];
};

export type HistoryFilters = {
  q?: string | undefined;
  /** Customer bucket, not a lifecycle status. */
  status?: "all" | OrderStatus | undefined;
  from?: string | undefined;
  to?: string | undefined;
  partnerId?: string | undefined;
};

export type PartnerOption = { id: string; name: string };

/** Customer buckets map onto the backend's `status` query value. */
const STATUS_QUERY: Record<OrderStatus, string> = {
  delivered: "completed",
  cancelled: "cancelled",
  "in-progress": "active",
  refunded: "refunded",
};

function toStatus(order: Order): OrderStatus {
  if (
    order.status === "refunded" ||
    (order as any).refund_status ||
    (order as any).paymentStatus === "refunded" ||
    (order as any).payment?.status === "refunded" ||
    Boolean((order as any).refundAmount && (order as any).refundAmount > 0)
  ) {
    return "refunded";
  }
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "delivered") return "delivered";
  return "in-progress";
}

function resolveServiceId(order: Order, services: ServiceEntity[]): string {
  const label = order.serviceLabel.toLowerCase();
  const match =
    services.find((service) => service.name.toLowerCase() === label) ??
    services.find((service) => label.includes(service.name.toLowerCase())) ??
    services.find((service) => service.name.toLowerCase().includes(label));
  return match?.id ?? services[0]?.id ?? "s1";
}

function toRecord(order: Order, services: ServiceEntity[]): OrderRecord {
  return {
    id: order.code,
    orderId: order.id,
    serviceId: resolveServiceId(order, services),
    service: order.serviceLabel,
    store: order.partner.name,
    partnerId: order.partner.id,
    placedOn: `${formatOrderDate(order.createdAt)}, ${formatOrderTime(order.createdAt)}`,
    placedAt: order.createdAt,
    status: toStatus(order),
    lifecycleStatus: order.status,
    cancelledReason: order.cancelledReason ?? null,
    total: order.totals.grandTotal,
    items: order.items.map((item) => ({ name: item.name, qty: item.qty, price: item.price })),
  };
}

function hasFilters(filters: HistoryFilters): boolean {
  return Boolean(
    (filters.q ?? "").trim() ||
      (filters.status && filters.status !== "all") ||
      filters.from ||
      filters.to ||
      filters.partnerId,
  );
}

async function fetchOrders(
  filters: HistoryFilters,
  signal?: AbortSignal | undefined,
): Promise<Order[]> {
  const params = {
    q: (filters.q ?? "").trim() || undefined,
    status:
      filters.status && filters.status !== "all" ? STATUS_QUERY[filters.status] : undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    partnerId: filters.partnerId || undefined,
  };
  try {
    return await apiGetJson<Order[]>(HISTORY_API_ENDPOINTS.history, { params, signal });
  } catch {
    // Older backends only expose GET /api/orders — filter on the client.
    return apiGetJson<Order[]>(HISTORY_API_ENDPOINTS.orders, { signal });
  }
}

async function fetchServices(signal?: AbortSignal | undefined): Promise<ServiceEntity[]> {
  try {
    return await apiGetJson<ServiceEntity[]>(HISTORY_API_ENDPOINTS.services, { signal });
  } catch {
    return [];
  }
}

/** Local filtering — the safety net when the backend ignored a query param. */
function applyFilters(records: OrderRecord[], filters: HistoryFilters): OrderRecord[] {
  const term = (filters.q ?? "").trim().toLowerCase();
  return records.filter((record) => {
    if (filters.status && filters.status !== "all" && record.status !== filters.status) {
      return false;
    }
    if (filters.partnerId && record.partnerId !== filters.partnerId) return false;
    const day = (record.placedAt ?? "").slice(0, 10);
    if (filters.from && day < filters.from) return false;
    if (filters.to && day > filters.to) return false;
    if (term) {
      const haystack = [record.id, record.service, record.store, ...record.items.map((i) => i.name)]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

/** GET /api/orders/history — cache-first, with an offline fallback. */
export async function fetchOrderHistory(
  filters: HistoryFilters = {},
  options: { signal?: AbortSignal | undefined; forceRefresh?: boolean } = {},
): Promise<OrderRecord[]> {
  const cacheable = !hasFilters(filters);

  if (cacheable && !options.forceRefresh) {
    const cached = readCache<OrderRecord[]>(CACHE_KEYS.orderHistory);
    if (cached) return cached;
  }

  try {
    const [orders, services] = await Promise.all([
      fetchOrders(filters, options.signal),
      fetchServices(options.signal),
    ]);
    const records = applyFilters(
      orders.map((order) => toRecord(order, services)),
      filters,
    );
    if (cacheable) writeCache(CACHE_KEYS.orderHistory, records);
    return records;
  } catch (error) {
    const stale = readStaleCache<OrderRecord[]>(CACHE_KEYS.orderHistory);
    if (stale) return applyFilters(stale, filters);
    throw error;
  }
}

/** Cached history, if any — used to paint before the network settles. */
export function readCachedOrderHistory(): OrderRecord[] | null {
  return readStaleCache<OrderRecord[]>(CACHE_KEYS.orderHistory);
}

export function invalidateOrderHistoryCache() {
  writeCache(CACHE_KEYS.orderHistory, [] as OrderRecord[]);
}

/** The partners a customer has ordered from — feeds the partner filter. */
export function partnerOptions(records: OrderRecord[]): PartnerOption[] {
  const seen = new Map<string, string>();
  for (const record of records) {
    if (record.partnerId && !seen.has(record.partnerId)) seen.set(record.partnerId, record.store);
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}

/**
 * POST /api/orders/{id}/reorder — every line of a past order goes back into
 * the cart. Replaces cart lines immediately in local store so checkout page
 * gets the same items instantly.
 */
export async function reorder(
  orderId: string,
  fallbackOrder?: {
    items?: Array<{ id?: string; name: string; price?: number; qty: number; unit?: string; image?: string }>;
    partnerId?: string;
    partnerName?: string;
  },
) {
  let linesToSet: CartLine[] = [];

  // Try 1: Call backend reorder endpoint
  try {
    const res = await apiPostJson<{
      ok?: boolean;
      items?: Array<{
        serviceId?: string;
        id?: string;
        name: string;
        currentPrice?: number;
        price?: number;
        qty: number;
        unit?: string;
      }>;
      partnerId?: string;
      partnerName?: string;
    }>(HISTORY_API_ENDPOINTS.reorder.replace("{id}", orderId), {});

    if (res && Array.isArray(res.items) && res.items.length > 0) {
      linesToSet = res.items.map((it) => ({
        id: it.serviceId || it.id || `srv-${it.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: it.name,
        price: it.currentPrice ?? it.price ?? 50,
        qty: it.qty || 1,
        unit: it.unit || "per piece",
        partnerId: res.partnerId,
        partnerName: res.partnerName,
      }));
    }
  } catch (err) {
    console.warn("Backend reorder endpoint call failed or not found, falling back to order lookup:", err);
  }

  // Fallback 1: if backend reorder didn't return lines, check if fallbackOrder was provided
  if (linesToSet.length === 0 && fallbackOrder?.items && fallbackOrder.items.length > 0) {
    linesToSet = fallbackOrder.items.map((it) => ({
      id: it.id || `srv-${it.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: it.name,
      price: it.price ?? 50,
      qty: it.qty || 1,
      unit: it.unit || "per piece",
      image: it.image || "",
      partnerId: fallbackOrder.partnerId,
      partnerName: fallbackOrder.partnerName,
    }));
  }

  // Fallback 2: if still empty, find the order in GET /api/orders
  if (linesToSet.length === 0) {
    try {
      const orders = await apiGetJson<Order[]>(HISTORY_API_ENDPOINTS.orders);
      const match = orders.find((entry) => entry.code === orderId || entry.id === orderId);
      if (match && Array.isArray(match.items) && match.items.length > 0) {
        linesToSet = match.items.map((line) => ({
          id: line.id || `srv-${line.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: line.name,
          price: line.price,
          qty: line.qty,
          unit: "per piece",
          image: match.partner?.image || "",
          partnerId: match.partner?.id,
          partnerName: match.partner?.name,
        }));
      }
    } catch (e) {
      console.warn("Order lookup fallback failed:", e);
    }
  }

  if (linesToSet.length > 0) {
    // 1. Immediately populate local store & localStorage so /checkout has items in 0ms!
    setCartLines(linesToSet);

    // 2. Sync each item with the server in the background
    for (const line of linesToSet) {
      void postCartItem({
        id: line.id,
        itemId: line.id,
        serviceId: line.id,
        partnerId: line.partnerId,
        name: line.name,
        price: line.price,
        unit: line.unit,
        qty: line.qty,
        image: line.image,
      }).catch(() => undefined);
    }
  }

  return { ok: linesToSet.length > 0, orderId };
}

/** POST /api/orders/{id}/cancel */
export async function cancelHistoryOrder(orderId: string, reason: string) {
  await apiPostJson<Order>(HISTORY_API_ENDPOINTS.cancel.replace("{id}", orderId), { reason });
  return { ok: true as const, orderId };
}
