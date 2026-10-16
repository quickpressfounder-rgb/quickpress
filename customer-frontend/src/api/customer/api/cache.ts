/**
 * Local cache for Home Screen data.
 *
 * Cache-first reads let Home paint instantly on a warm start, then refresh in
 * the background. Every entry carries a TTL so stale data is never rendered as
 * if it were fresh.
 */

const PREFIX = "quickpress:cache:";

type Entry<T> = { value: T; storedAt: number };

export const CACHE_KEYS = {
  profile: "profile",
  location: "location",
  banners: "banners",
  categories: "categories",
  partners: "partners",
  offers: "offers",
  popular: "popular",
  recommendations: "recommendations",
  recentOrders: "recent-orders",
  orders: "orders",
  orderHistory: "order-history",
  unreadNotifications: "unread-notifications",
  notifications: "notifications",
  settings: "settings",
  addresses: "addresses",
  profileScreen: "profile-screen",
  referral: "referral",
  membership: "membership",
  membershipPlans: "membership-plans",
  membershipHistory: "membership-history",
  // Sprint 2.10 — wallet, payments and refunds.
  wallet: "wallet",
  walletHistory: "wallet-history",
  paymentMethods: "payment-methods",
  payments: "payments",
  refunds: "refunds",
  // Sprint 2.11 — invoices and help center.
  invoices: "invoices",
  faqs: "help-faqs",
  faqCategories: "help-categories",
  supportTickets: "help-tickets",
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS] | (string & {});

/** Default freshness window per cache key, in milliseconds. */
export const CACHE_TTL: Record<string, number> = {
  profile: 10 * 60_000,
  location: 30 * 60_000,
  banners: 5 * 60_000,
  categories: 60 * 60_000,
  partners: 5_000,
  offers: 10 * 60_000,
  popular: 30 * 60_000,
  recommendations: 10 * 60_000,
  "recent-orders": 60_000,
  orders: 45_000,
  "order-history": 60_000,
  "unread-notifications": 30_000,
  notifications: 2 * 60_000,
  settings: 10 * 60_000,
  addresses: 5 * 60_000,
  "profile-screen": 5 * 60_000,
  referral: 3 * 60_000,
  membership: 2 * 60_000,
  "membership-plans": 30 * 60_000,
  "membership-history": 3 * 60_000,
  wallet: 60_000,
  "wallet-history": 2 * 60_000,
  "payment-methods": 10 * 60_000,
  payments: 2 * 60_000,
  refunds: 5 * 60_000,
  invoices: 3 * 60_000,
  "help-faqs": 30 * 60_000,
  "help-categories": 60 * 60_000,
  "help-tickets": 60_000,
};

export function readCache<T>(key: CacheKey, ttlMs = CACHE_TTL[key] ?? 5 * 60_000): T | null {
  return readCacheEntry<T>(key, ttlMs);
}

/** Read a cached value ignoring its TTL — used as an offline fallback. */
export function readStaleCache<T>(key: CacheKey): T | null {
  return readCache<T>(key, Number.MAX_SAFE_INTEGER);
}

export function writeCache<T>(key: CacheKey, value: T) {
  writeCacheEntry(key, value);
}

/* ---------------------------------------------------------------------- *
 * Scoped cache — per-entity entries such as `partner-detail:prt-2001`.
 * Used by the Partner Details screen so each partner is cached separately
 * and refreshed in the background when its payload changes.
 * ---------------------------------------------------------------------- */

export const SCOPED_CACHE_TTL = {
  "partner-detail": 3 * 60_000,
  "partner-list": 60_000,
  "partner-reviews": 5 * 60_000,
  "filter-options": 30 * 60_000,
  "order-detail": 45_000,
  "order-tracking": 20_000,
  // Sprint 2.11
  "invoice-detail": 5 * 60_000,
  "order-invoice": 5 * 60_000,
  "ticket-detail": 45_000,
} as const;

export type ScopedCacheNamespace = keyof typeof SCOPED_CACHE_TTL;

export function scopedCacheKey(namespace: ScopedCacheNamespace, id: string): string {
  return `${namespace}:${id}`;
}

export function readScopedCache<T>(
  namespace: ScopedCacheNamespace,
  id: string,
  ttlMs = SCOPED_CACHE_TTL[namespace],
): T | null {
  return readCacheEntry<T>(scopedCacheKey(namespace, id), ttlMs);
}

export function readStaleScopedCache<T>(namespace: ScopedCacheNamespace, id: string): T | null {
  return readScopedCache<T>(namespace, id, Number.MAX_SAFE_INTEGER);
}

export function writeScopedCache<T>(namespace: ScopedCacheNamespace, id: string, value: T) {
  writeCacheEntry(scopedCacheKey(namespace, id), value);
}

export function clearScopedCache(namespace: ScopedCacheNamespace, id?: string) {
  if (typeof window === "undefined") return;
  try {
    if (id) {
      window.localStorage.removeItem(PREFIX + scopedCacheKey(namespace, id));
      return;
    }
    const prefix = `${PREFIX}${namespace}:`;
    const doomed: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(prefix)) doomed.push(key);
    }
    for (const key of doomed) window.localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

function readCacheEntry<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (!entry || typeof entry.storedAt !== "number") return null;
    if (Date.now() - entry.storedAt > ttlMs) return null;
    return entry.value;
  } catch {
    return null;
  }
}

function writeCacheEntry<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    const entry: Entry<T> = { value, storedAt: Date.now() };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    /* storage unavailable or full — cache is best effort */
  }
}


export function clearCache(key?: CacheKey) {
  if (typeof window === "undefined") return;
  try {
    if (key) {
      window.localStorage.removeItem(PREFIX + key);
      return;
    }
    for (const cacheKey of Object.values(CACHE_KEYS)) {
      window.localStorage.removeItem(PREFIX + cacheKey);
    }
  } catch {
    /* ignore */
  }
}
