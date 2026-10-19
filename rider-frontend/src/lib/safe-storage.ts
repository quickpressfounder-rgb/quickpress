/**
 * Safe Storage Engine for QuickPress Captain App
 * Guarantees zero runtime crashes from corrupted localStorage data or unexpected JSON schemas.
 */

export const safeStorage = {
  getArray<T>(key: string, fallback: T[] = []): T[] {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
      if (parsed && typeof parsed === "object") {
        if (Array.isArray((parsed as any).items)) return (parsed as any).items as T[];
        if (Array.isArray((parsed as any).data)) return (parsed as any).data as T[];
        if (Array.isArray((parsed as any).transactions)) return (parsed as any).transactions as T[];
        if (Array.isArray((parsed as any).orders)) return (parsed as any).orders as T[];
        if (Array.isArray((parsed as any).tickets)) return (parsed as any).tickets as T[];
      }
      return fallback;
    } catch {
      return fallback;
    }
  },

  getObject<T>(key: string, fallback: T | null = null): T | null {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as T;
      }
      return fallback;
    } catch {
      return fallback;
    }
  },

  getString(key: string, fallback: string = ""): string {
    if (typeof window === "undefined") return fallback;
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },

  setItem(key: string, value: unknown): void {
    if (typeof window === "undefined") return;
    try {
      if (typeof value === "string") {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn(`[SafeStorage] Failed to set item for key "${key}":`, e);
    }
  },

  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {}
  },

  clearCorruptedCache(): void {
    if (typeof window === "undefined") return;
    const knownKeys = [
      "qp_captain_tickets",
      "qp_captain_chat_history",
      "qp_captain_wallet_txns_cache",
      "qp_captain_wallet_history_cache",
      "qp_cached_rider_wallet_v2",
      "qp_rider_orders_cache",
      "qp_active_rider_order",
    ];
    for (const key of knownKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            JSON.parse(raw);
          } catch {
            localStorage.removeItem(key);
          }
        }
      } catch {}
    }
  },
};
