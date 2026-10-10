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

const DEFAULT_FALLBACK_URL = "https://quickpress-api-production.up.railway.app";

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).Capacitor?.isNativePlatform?.() ||
    (window as any).Capacitor?.getPlatform?.() === "android" ||
    (window as any).Capacitor?.getPlatform?.() === "ios" ||
    (window as any).Capacitor !== undefined ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:"
  );
}

export function apiBaseUrl(): string {
  // 1. If window.__QUICKPRESS_CONFIG__.API_BASE_URL is set (injected by WebView or SSR script)
  if (typeof window !== "undefined") {
    const globalBase = (window as any).__QUICKPRESS_CONFIG__?.API_BASE_URL;
    if (globalBase && typeof globalBase === "string" && globalBase.trim()) {
      return globalBase.trim().replace(/\/+$/, "");
    }
  }

  // 2. Read explicit environment variable (VITE_API_BASE_URL or VITE_API_URL)
  let custom = (readString("VITE_API_BASE_URL") || readString("VITE_API_URL")).replace(/\/+$/, "");
  if (custom.includes("quickpress-api-production-3292.up.railway.app")) {
    custom = custom.replace("-3292", "");
  }

  // 3. Inside Capacitor Android/iOS native container
  if (isCapacitorNative()) {
    return custom || DEFAULT_FALLBACK_URL;
  }

  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    const host = window.location.hostname;

    // Localhost development
    if (host === "localhost" || host === "127.0.0.1") {
      if (custom && (custom.startsWith("http://") || custom.startsWith("https://"))) {
        return custom;
      }
      return "http://localhost:8000";
    }

    // Access via private LAN IP (e.g. mobile device testing on Wi-Fi)
    const isPrivateIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
    if (isPrivateIp) {
      if (custom && custom.includes("localhost")) {
        return custom.replace("localhost", host);
      }
      if (custom && custom.includes("127.0.0.1")) {
        return custom.replace("127.0.0.1", host);
      }
      return `http://${host}:8000`;
    }

    // Explicit custom URL from environment takes priority
    if (custom) {
      return custom;
    }

    // Fallback on HTTPS or other public domain
    return DEFAULT_FALLBACK_URL;
  }

  return custom || DEFAULT_FALLBACK_URL;
}

export function appEnvironment(): AppEnvironment {
  const value = readString("VITE_APP_ENV");
  if (value === "staging" || value === "production") return value;
  if (value === "development") return "development";
  // No explicit VITE_APP_ENV: a production bundle (`vite build`) is production.
  // This closes the "forgot to set VITE_APP_ENV" hole that would otherwise let
  // a shipped build silently serve mock fixtures.
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
  checkLocationAvailability: "/api/customer/availability/check-location",
  customerWaitlist: "/api/customer/waitlist",
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
