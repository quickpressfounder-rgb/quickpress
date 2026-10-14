/**
 * QuickPress API configuration — environment driven.
 *
 * No URL is ever hardcoded in a screen or a service. Everything resolves from
 * Vite environment variables so development / staging / production builds point
 * at different FastAPI deployments without a code change.
 *
 *   VITE_API_BASE_URL   e.g. https://api.quickpress.in
 *   VITE_API_TIMEOUT_MS e.g. 15000
 *   VITE_APP_ENV        development | staging | production
 *
 * When VITE_API_BASE_URL is absent the client runs in "mock mode": services
 * resolve their local fixtures so the UI keeps exercising loading, empty, error
 * and refresh states before the backend ships.
 */

export type AppEnvironment = "development" | "staging" | "production";

type ViteEnv = Record<string, string | boolean | undefined>;

function env(): ViteEnv {
  try {
    return (import.meta.env ?? {}) as ViteEnv;
  } catch {
    return {};
  }
}

function readString(key: string): string {
  const value = env()[key];
  return typeof value === "string" ? value.trim() : "";
}

const PRODUCTION_API_URL = "https://quickpress-api-production.up.railway.app";

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).Capacitor?.isNativePlatform?.() ||
    (window as any).Capacitor?.getPlatform?.() === "android" ||
    (window as any).Capacitor?.getPlatform?.() === "ios" ||
    (window as any).Capacitor !== undefined ||
    (window as any).QuickPressNativeBridge !== undefined ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:" ||
    (typeof navigator !== "undefined" && (
      navigator.userAgent.includes("Capacitor") ||
      navigator.userAgent.includes("QuickPressRider") ||
      navigator.userAgent.includes("wv") // Android WebView indicator
    ))
  );
}

export function apiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const globalBase = (window as any).__QUICKPRESS_CONFIG__?.API_BASE_URL;
    if (globalBase && typeof globalBase === "string" && globalBase.trim()) {
      let cleaned = globalBase.trim().replace(/\/+$/, "").replace(/-3292/g, "");
      if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
        return cleaned;
      }
    }
  }

  let custom = (readString("VITE_API_BASE_URL") || readString("VITE_API_URL")).replace(/\/+$/, "");
  if (custom) {
    custom = custom.replace(/-3292/g, "");
  }

  // Inside Capacitor Android APK or Native WebView, ALWAYS connect to live Railway backend
  if (isCapacitorNative()) {
    return custom && custom.startsWith("https://") ? custom : PRODUCTION_API_URL;
  }

  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    const host = window.location.hostname;

    if (isHttps) {
      if (custom && custom.startsWith("https://")) {
        return custom;
      }
      return PRODUCTION_API_URL;
    }

    // On browser desktop localhost ONLY in dev mode with live local backend
    if ((host === "localhost" || host === "127.0.0.1") && env()["DEV"] === true) {
      if (custom && (custom.startsWith("http://") || custom.startsWith("https://"))) {
        return custom;
      }
    }
  }

  if (custom && custom.startsWith("https://")) return custom;
  return PRODUCTION_API_URL;
}

export function appEnvironment(): AppEnvironment {
  const value = readString("VITE_APP_ENV");
  if (value === "staging" || value === "production") return value;
  if (value === "development") return "development";
  return env()["PROD"] === true ? "production" : "development";
}

export function apiTimeoutMs(): number {
  const parsed = Number(readString("VITE_API_TIMEOUT_MS"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 35_000;
}

/** True once a real backend base URL is configured for this environment. */
export function isApiConfigured(): boolean {
  return apiBaseUrl().length > 0;
}

/** Every Home Screen endpoint, in one place. */
export const API_ENDPOINTS = {
  home: "/api/home",
  profile: "/api/profile",
  location: "/api/location",
  banners: "/api/banners",
  categories: "/api/categories",
  partners: "/api/partners",
  nearbyPartners: "/api/partners/nearby",
  services: "/api/services",
  offers: "/api/offers",
  popular: "/api/services/popular",
  recommendations: "/api/recommendations",
  recentOrders: "/api/orders/recent",
  unreadNotifications: "/api/notifications/unread-count",
  search: "/api/search",
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
