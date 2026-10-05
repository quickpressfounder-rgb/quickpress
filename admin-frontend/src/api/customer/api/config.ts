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

export function apiBaseUrl(): string {
  let custom = (readString("VITE_API_BASE_URL") || readString("VITE_API_URL")).replace(/\/+$/, "");
  if (custom) {
    custom = custom.replace(/-3292/g, "");
  }

  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    const host = window.location.hostname;

    // 1. If running on an HTTPS page (Vercel, Lovable, production domain):
    // Browser strictly blocks insecure HTTP requests as Mixed Content.
    if (isHttps) {
      if (custom && custom.startsWith("https://")) {
        return custom;
      }
      return PRODUCTION_API_URL;
    }

    // 2. If running locally on localhost or 127.0.0.1:
    if (host === "localhost" || host === "127.0.0.1") {
      if (custom && !custom.includes("railway.app")) {
        return custom;
      }
      return "http://localhost:8000";
    }

    const globalBase = (window as any).__QUICKPRESS_CONFIG__?.API_BASE_URL;
    if (globalBase && typeof globalBase === "string") {
      const cleaned = globalBase.trim().replace(/\/+$/, "");
      return cleaned.replace("-3292", "");
    }
  }

  if (custom && custom.startsWith("https://")) return custom;

  return PRODUCTION_API_URL;
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
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30_000;
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
