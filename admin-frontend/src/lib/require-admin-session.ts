/**
 * Route guard for the QuickPress Admin console.
 *
 * Every admin screen except /auth and /forgot-password is operator-only.
 * Without this guard the whole console (orders, customers, payouts, staff,
 * settings) rendered for anyone who typed the URL directly.
 *
 * This is a UX guard only — the authoritative check lives on the server, where
 * every /api/admin/* route requires the admin role. Never rely on this alone.
 */
import { redirect } from "@tanstack/react-router";
import { readSession, sessionExpiresAt, writeSession } from "@/api/core/session-store";
import { authenticateCloudflareZeroTrust } from "../api/auth";
import { adminRoutes } from "../navigation/admin-routes";

/**
 * Route guard for the QuickPress Admin console.
 * Uses native Cloudflare Zero Trust perimeter authentication.
 *
 * If a valid local session exists, execution proceeds without delay.
 * If no local session is present, it auto-verifies with Cloudflare Access (/api/auth/admin/cf-sso).
 * If the user's email is verified and enrolled in admin_staff, the session is created and the route loads.
 * If the email is not enrolled in the Staff Directory, it redirects to /unauthorized.
 */
export async function requireAdminSession(): Promise<void> {
  // SSR/prerender guard: Session storage lives in browser environment
  if (typeof window === "undefined") return;

  const session = readSession("admin");
  const expiresAt = sessionExpiresAt("admin");
  const expired = typeof expiresAt === "number" && expiresAt <= Date.now();

  // 1. If valid session already cached in localStorage, allow immediately
  if (session?.token && !expired) {
    return;
  }

  // 2. Perform zero-latency Cloudflare Zero Trust perimeter handshake
  try {
    const cfSession = await authenticateCloudflareZeroTrust();
    if (cfSession?.token) {
      writeSession(cfSession, "admin");
      return;
    }
  } catch (err: any) {
    const status = err?.status;
    const msg = String(err?.message || "");

    // 403 Forbidden: Email is authenticated by Cloudflare, but not in admin_staff
    if (status === 403 || msg.includes("Staff Directory") || msg.includes("enrolled") || msg.includes("suspended")) {
      throw redirect({ to: adminRoutes.unauthorized });
    }

    // Localhost / Development fallback (outside Cloudflare perimeter)
    if (
      import.meta.env.DEV ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return;
    }

    // Production outside Cloudflare or network error
    throw redirect({ to: adminRoutes.unauthorized });
  }
}
