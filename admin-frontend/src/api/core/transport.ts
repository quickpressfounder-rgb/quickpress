/**
 * The single transport every QuickPress app uses to reach the backend.
 *
 *   UI screen → service module (`@backend/<app>/…`) → apiRequest() → transport
 *
 * Two transports exist behind the same signature:
 *   • mock  — the in-memory dev router, loaded lazily and only in development
 *   • http  — real FastAPI, used as soon as VITE_API_BASE_URL is configured
 *
 * Because the switch happens here, replacing mocks with FastAPI touches no
 * screen, no component and no service signature.
 */

import { apiBaseUrl, apiTimeoutMs, appEnvironment, isApiConfigured } from "../customer/api/config";
import { isOnline } from "../customer/api/network";
import { ApiError } from "./errors";
import { activeSessionRole, readToken } from "./session-store";
import { recordApiCall } from "./api-inspector";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export type RequestOptions = {
  params?: QueryParams | undefined;
  body?: unknown;
  headers?: Record<string, string> | undefined;
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  /** Skip attaching the stored bearer token (used by /api/auth/* calls). */
  anonymous?: boolean | undefined;
};

export type TransportMode = "http";

export function transportMode(): TransportMode {
  return "http";
}



function withQuery(path: string, params?: QueryParams): string {
  const entries = Object.entries(params ?? {}).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (entries.length === 0) return path;
  const search = new URLSearchParams();
  for (const [key, value] of entries) search.set(key, String(value));
  return `${path}?${search.toString()}`;
}

async function httpRequest<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions,
): Promise<T> {
  if (!isOnline()) throw new ApiError("offline", "Device is offline");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? apiTimeoutMs());
  const external = options.signal;
  const forward = () => controller.abort();
  external?.addEventListener("abort", forward);

  const token = options.anonymous ? null : readToken();

  try {
    const response = await fetch(`${apiBaseUrl()}${withQuery(path, options.params)}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorDetail = `${method} ${path} failed with ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && typeof errJson === "object") {
          errorDetail = errJson.detail || errJson.message || errorDetail;
        }
      } catch {
        /* ignore json parse error */
      }

      if (response.status === 401 && !options.anonymous) {
        if (typeof window !== "undefined") {
          clearSession(activeSessionRole());
          clearSession("admin");
          if (!window.location.pathname.startsWith("/auth")) {
            window.location.href = "/auth";
          }
        }
        throw new ApiError("unauthorized", errorDetail || "Session expired", 401);
      }

      if (response.status === 404) {
        throw new ApiError("not-found", errorDetail || `${path} not found`, 404);
      }

      throw new ApiError("http", errorDetail, response.status);
    }
    if (response.status === 204) return undefined as T;

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError("parse", `${method} ${path} returned invalid JSON`);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (!isOnline()) throw new ApiError("offline", "Device went offline");
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("timeout", `${method} ${path} timed out`);
    }
    throw new ApiError("network", `${method} ${path} could not reach the server`);
  } finally {
    clearTimeout(timeout);
    external?.removeEventListener("abort", forward);
  }
}

/**
 * Perform an API call. Identical contract in mock and live mode.
 *
 *   const order = await apiRequest<Order>("POST", "/api/orders", { body: payload });
 */
export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const mode = transportMode();
  const startedAt = Date.now();
  const fullPath = withQuery(path, options.params);
  try {
    const runOnce = () => httpRequest<T>(method, path, options);

    let result: T;
    try {
      result = await runOnce();
    } catch (error) {
      // Token expired → rotate the JWT once with the refresh token, then retry.
      const retryable =
        mode === "http" &&
        !options.anonymous &&
        error instanceof ApiError &&
        error.kind === "unauthorized" &&
        !path.startsWith("/api/auth/");
      if (!retryable) throw error;
      const { refreshSession } = await import("./auth-service");
      const refreshed = await refreshSession();
      if (!refreshed) throw error;
      result = await runOnce();
    }
    recordApiCall({
      method,
      path: fullPath,
      mode,
      role: activeSessionRole(),
      durationMs: Date.now() - startedAt,
      ok: true,
    });
    return result;
  } catch (error) {
    recordApiCall({
      method,
      path: fullPath,
      mode,
      role: activeSessionRole(),
      durationMs: Date.now() - startedAt,
      ok: false,
      status: error instanceof ApiError ? (error.status ?? undefined) : undefined,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export const apiGetJson = <T>(path: string, options?: RequestOptions) =>
  apiRequest<T>("GET", path, options ?? {});
export const apiPostJson = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>("POST", path, { ...(options ?? {}), body });
export const apiPutJson = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>("PUT", path, { ...(options ?? {}), body });
export const apiPatchJson = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>("PATCH", path, { ...(options ?? {}), body });
export const apiDeleteJson = <T>(path: string, options?: RequestOptions) =>
  apiRequest<T>("DELETE", path, options ?? {});