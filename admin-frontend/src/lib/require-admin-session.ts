/**
 * Route guard for the QuickPress Admin console.
 * Uses native Cloudflare Zero Trust perimeter authentication.
 *
 * If a valid local session exists, execution proceeds without delay.
 * If no local session is present, it auto-verifies with Cloudflare Access (/api/auth/admin/cf-sso).
 * If the user's email is verified in admin_staff, the session is created and the role console loads directly.
 */
import { readSession, sessionExpiresAt, writeSession } from "@/api/core/session-store";
import { authenticateCloudflareZeroTrust } from "../api/auth";

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

  // 2. Perform seamless zero-latency Cloudflare Zero Trust perimeter handshake
  try {
    const cfSession = await authenticateCloudflareZeroTrust();
    if (cfSession?.token) {
      writeSession(cfSession, "admin");
      return;
    }
  } catch (err: any) {
    // Localhost / Development fallback (outside Cloudflare perimeter)
    if (
      import.meta.env.DEV ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return;
    }

    // In production, if Cloudflare SSO returned an error (e.g. not in staff directory):
    const msg = String(err?.message || "");
    if (err?.status === 403 || msg.includes("Staff Directory") || msg.includes("enrolled")) {
      throw new Error(msg || "Your email is authenticated by Cloudflare Zero Trust, but is not enrolled in the QuickPress Staff Directory.");
    }

    // If Cloudflare perimeter headers are missing or session expired:
    // Prompt Cloudflare Access login challenge rather than leaving operator stranded on error screen
    if (
      err?.status === 401 ||
      msg.includes("perimeter authentication") ||
      msg.includes("headers not found")
    ) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/cdn-cgi/access")) {
        window.location.href = "/cdn-cgi/access/login";
        return;
      }
    }

    throw new Error(msg || "Cloudflare Zero Trust perimeter authentication failed. Please refresh or verify your access.");
  }
}
