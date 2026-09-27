/**
 * Smart Cart Store — one reactive, API-driven source of truth for the cart.
 *
 * Every screen (service details, partner profile, floating cart bar, cart
 * screen, checkout) reads and writes this store.
 *
 * Line items and quantities are immediately persistent and authoritative locally.
 * Network sync is debounced per item (350ms) to prevent race conditions when
 * rapidly tapping (+ / -).
 */

import {
  EMPTY_CHARGES,
  EMPTY_TOTALS,
  deleteCartItem,
  fetchCartState,
  postCartItem,
  setCartState,
  type CartItem,
  type CartStateResponse,
  type CartStore as CartStoreInfo,
  type Charges,
  type Totals,
} from "./cart-api";
import { readSession, subscribeSession } from "@/api/core/session-store";

export type CartLine = {
  id: string;
  name: string;
  price: number;
  unit: string;
  qty: number;
  image?: string | undefined;
  description?: string | undefined;
  serviceId?: string | undefined;
  partnerId?: string | undefined;
  partnerName?: string | undefined;
};

export type CartSnapshot = {
  lines: CartLine[];
  totals: Totals;
  charges: Charges;
  store: CartStoreInfo | null;
  count: number;
  total: number;
  loading: boolean;
  syncing: boolean;
  error: string | null;
};

function getCartStorageKey(): string {
  if (typeof window === "undefined") return "quickpress_cart_cache_v2_guest";
  try {
    const session = readSession("customer");
    const uid = session?.account?.id;
    return uid ? `quickpress_cart_cache_v2_${uid}` : "quickpress_cart_cache_v2_guest";
  } catch {
    return "quickpress_cart_cache_v2_guest";
  }
}

function readLocalLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    // Purge legacy unscoped key so old items don't leak across users
    localStorage.removeItem("quickpress_cart_cache_v2");

    const raw = localStorage.getItem(getCartStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalLines(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    const key = getCartStorageKey();
    if (lines.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(lines));
    }
  } catch {
    // Ignore storage quota errors
  }
}

const initialLines = readLocalLines();
const initialTotals = computeOptimisticTotals(initialLines);

const EMPTY: CartSnapshot = {
  lines: initialLines,
  totals: initialTotals,
  charges: EMPTY_CHARGES,
  store: null,
  count: initialTotals.count,
  total: initialTotals.itemsTotal,
  loading: false,
  syncing: false,
  error: null,
};

let snapshot: CartSnapshot = EMPTY;
const listeners = new Set<() => void>();
let hydrated = false;

// Per-item debounce timers to prevent network race conditions
const syncDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function toLine(item: CartItem): CartLine {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    unit: item.unit,
    qty: item.qty,
    image: item.image,
    description: item.description,
    serviceId: item.serviceId,
    partnerId: item.partnerId,
  };
}

function emit() {
  listeners.forEach((fn) => fn());
}

function computeOptimisticTotals(lines: CartLine[], currentCharges?: Charges, currentTotals?: Totals): Totals {
  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  const itemsTotal = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const pickup = currentCharges?.pickup ?? 0;
  const delivery = currentCharges?.delivery ?? 0; // QuickPress Free Delivery
  const handling = currentCharges?.handling ?? (itemsTotal > 0 ? 15 : 0);
  const gstRate = currentCharges?.gstRate || 0.05;
  const gst = Math.round(itemsTotal * gstRate);
  const discount = currentCharges?.discount ?? 0;
  const couponDiscount = currentTotals?.couponDiscount ?? 0;
  const grandTotal = Math.max(0, itemsTotal + pickup + delivery + handling + gst - discount - couponDiscount);
  return {
    count,
    itemsTotal,
    pickup,
    delivery,
    handling,
    gst,
    discount,
    couponDiscount,
    grandTotal,
  };
}

const DEFAULT_CART_STORE: CartStoreInfo = {
  id: "quickpress-hub",
  name: "QuickPress Express Hub",
  image: "",
  rating: 4.9,
  reviews: "2.4k+ orders",
  pickupEta: "15-30 mins",
  deliveryEta: "24-48 hrs",
};

function set(patch: Partial<CartSnapshot>) {
  const nextLines = patch.lines !== undefined ? patch.lines : snapshot.lines;
  const optTotals = computeOptimisticTotals(nextLines, patch.charges ?? snapshot.charges, patch.totals ?? snapshot.totals);

  snapshot = {
    ...snapshot,
    ...patch,
    lines: nextLines,
    totals: patch.totals ? { ...optTotals, ...patch.totals } : optTotals,
  };
  snapshot.count = snapshot.totals.count;
  snapshot.total = snapshot.totals.itemsTotal;
  saveLocalLines(snapshot.lines);

  // Sync to legacy cart state for backward compatibility across all consumers
  setCartState({
    data: {
      items: snapshot.lines.map((l) => ({
        id: l.id,
        name: l.name,
        price: l.price,
        qty: l.qty,
        unit: l.unit,
        image: l.image ?? "",
        description: l.description ?? "",
      })),
      totals: snapshot.totals,
      charges: snapshot.charges,
      store: snapshot.store || DEFAULT_CART_STORE,
      coupons: [],
    },
  });

  emit();
}

/** Apply server cart payload — server is authoritative when not actively debouncing */
function applyServerCart(cart: CartStateResponse) {
  const serverLines = (cart.items || []).map(toLine);

  // If the user is actively tapping +/- right at this moment, keep the in-flight debounced line
  if (syncDebounceTimers.size > 0) {
    const pendingIds = new Set(syncDebounceTimers.keys());
    const merged = serverLines.map((sLine) => {
      if (pendingIds.has(sLine.id)) {
        const local = snapshot.lines.find((l) => l.id === sLine.id);
        return local || sLine;
      }
      return sLine;
    });
    for (const local of snapshot.lines) {
      if (pendingIds.has(local.id) && !merged.some((m) => m.id === local.id)) {
        merged.push(local);
      }
    }
    set({
      lines: merged,
      charges: cart.charges || snapshot.charges,
      store: cart.store || snapshot.store,
      error: null,
    });
    return;
  }

  // Authoritative server sync: If server cart is empty, user's cart is empty!
  set({
    lines: serverLines,
    charges: cart.charges || snapshot.charges,
    store: cart.store || snapshot.store,
    error: null,
  });
}

/** GET /api/cart — refresh line items and the server-computed summary. */
export async function refreshCart(couponDiscount = 0): Promise<void> {
  set({ syncing: true });
  try {
    const serverCart = await fetchCartState(couponDiscount);
    applyServerCart(serverCart);
  } catch {
    // Keep local lines intact
  } finally {
    set({ syncing: false });
  }
}

/** Load the cart once, on the client (SSR renders the empty cart). */
export function hydrateCart() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const local = readLocalLines();
  if (local.length > 0) {
    set({ lines: local });
  }
  set({ loading: true });
  void refreshCart().finally(() => set({ loading: false }));
}

export function subscribeCartLines(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getCartSnapshot(): CartSnapshot {
  return snapshot;
}

/** Stable server snapshot so SSR and hydration agree. */
export function getCartServerSnapshot(): CartSnapshot {
  return EMPTY;
}

export function lineQty(id: string): number {
  return snapshot.lines.find((line) => line.id === id)?.qty ?? 0;
}

/**
 * Add an item or bump quantity. Updates local state in 0ms and debounces server sync.
 */
export function addCartLine(input: Omit<CartLine, "qty">, qty = 1) {
  const existing = snapshot.lines.find((line) => line.id === input.id);
  if (existing) {
    stepCartLine(input.id, qty);
    return;
  }

  const optimistic = [...snapshot.lines, { ...input, qty }];
  set({ lines: optimistic });

  // Debounce network call by 350ms so rapid taps don't cause race conditions
  const existingTimer = syncDebounceTimers.get(input.id);
  if (existingTimer) clearTimeout(existingTimer);

  const newTimer = setTimeout(async () => {
    syncDebounceTimers.delete(input.id);
    const finalQty = lineQty(input.id);
    if (finalQty <= 0) return;
    try {
      await postCartItem({
        itemId: input.id,
        id: input.id,
        qty: finalQty,
        name: input.name,
        price: input.price,
        unit: input.unit,
        ...(input.image === undefined ? {} : { image: input.image }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.serviceId === undefined ? {} : { serviceId: input.serviceId }),
        ...(input.partnerId === undefined ? {} : { partnerId: input.partnerId }),
      });
    } catch {
      // Local state remains authoritative
    }
  }, 350);

  syncDebounceTimers.set(input.id, newTimer);
}

/**
 * Step quantity (+ / -). Updates local state in 0ms and debounces server sync.
 * Prevents quantity rolling back or jumping when tapped repeatedly.
 */
export function stepCartLine(id: string, delta: number) {
  const current = lineQty(id);
  const nextQty = Math.max(0, current + delta);
  const optimistic =
    nextQty === 0
      ? snapshot.lines.filter((line) => line.id !== id)
      : snapshot.lines.map((line) => (line.id === id ? { ...line, qty: nextQty } : line));

  // 1. UPDATE SYNCHRONOUSLY IN 0ms (UI never jumps or lags)
  set({ lines: optimistic });

  // 2. CANCEL any pending in-flight timer for this item
  const existingTimer = syncDebounceTimers.get(id);
  if (existingTimer) clearTimeout(existingTimer);

  // 3. DEBOUNCE network sync by 350ms
  const newTimer = setTimeout(async () => {
    syncDebounceTimers.delete(id);
    const finalQty = lineQty(id);
    try {
      if (finalQty === 0) {
        await deleteCartItem(id);
      } else {
        const { putCartItem } = await import("./cart-api");
        await putCartItem(id, finalQty);
      }
    } catch {
      // Local state remains authoritative
    }
  }, 350);

  syncDebounceTimers.set(id, newTimer);
}

export function removeCartLine(id: string) {
  const existingTimer = syncDebounceTimers.get(id);
  if (existingTimer) clearTimeout(existingTimer);
  syncDebounceTimers.delete(id);

  set({ lines: snapshot.lines.filter((line) => line.id !== id) });
  void deleteCartItem(id).catch(() => undefined);
}

/** Remove every line — clears timers and deletes from server. */
export function clearCartLines() {
  for (const timer of syncDebounceTimers.values()) {
    clearTimeout(timer);
  }
  syncDebounceTimers.clear();

  const ids = snapshot.lines.map((line) => line.id);
  set({ lines: [] });
  void (async () => {
    for (const id of ids) await deleteCartItem(id).catch(() => undefined);
  })();
}

let lastUserId: string | null = null;

export function resetCartForAccount() {
  for (const timer of syncDebounceTimers.values()) {
    clearTimeout(timer);
  }
  syncDebounceTimers.clear();

  const local = readLocalLines();
  set({ lines: local });
  void refreshCart();
}

if (typeof window !== "undefined") {
  // Purge legacy unscoped key so old items don't leak across users
  try {
    localStorage.removeItem("quickpress_cart_cache_v2");
  } catch {
    // ignore
  }

  try {
    lastUserId = readSession("customer")?.account?.id || null;
  } catch {
    lastUserId = null;
  }

  subscribeSession(() => {
    try {
      const newUid = readSession("customer")?.account?.id || null;
      if (newUid !== lastUserId) {
        lastUserId = newUid;
        resetCartForAccount();
      }
    } catch {
      // ignore
    }
  });

  window.addEventListener("qp:login-success", () => {
    try {
      const newUid = readSession("customer")?.account?.id || null;
      lastUserId = newUid;
      resetCartForAccount();
    } catch {
      // ignore
    }
  });
}
