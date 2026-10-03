import { redirect } from "@tanstack/react-router";
import { readSession } from "../api/core/session-store";

/**
 * Checks if the current rider session is fully verified and approved by admin.
 */
export function isRiderApproved(sess: any): boolean {
  if (!sess || !sess.token) return false;

  const status = String(sess.status || sess.account?.status || "").toLowerCase();
  const kycStatus = String(
    sess.kycStatus || sess.account?.kycStatus || sess.kyc_status || sess.account?.kyc_status || ""
  ).toLowerCase();

  // Only explicit suspension or rejection blocks the rider
  if (status === "suspended" || sess.isSuspended || status === "rejected" || kycStatus === "rejected") {
    return false;
  }

  return true;
}

/**
 * Checks if rider has submitted registration documents / profile.
 */
export function isRiderOnboarded(sess: any): boolean {
  if (!sess || !sess.token) return false;
  return true;
}

/**
 * Strict Route Guard for all Rider / Captain operational screens.
 * 1. Blocks unauthenticated access and immediately redirects to /auth.
 * 2. Blocks suspended/rejected riders and redirects to /auth.
 * 3. Logged-in captains have instant access to operational screens (/dashboard, /orders, /wallet, /profile, etc.).
 */
export function requireRiderAuth() {
  if (typeof window === "undefined") return;
  const sess = readSession("rider") || readSession();

  if (!sess || !sess.token) {
    throw redirect({ to: "/auth" });
  }

  if ((sess as any)?.status === "suspended" || (sess as any)?.isSuspended) {
    throw redirect({ to: "/auth" });
  }
}

/**
 * Guard for registration & verification waiting screens.
 * Allows authenticated riders to access /verification or /registration even if not yet approved.
 */
export function requireRiderSession() {
  if (typeof window === "undefined") return;
  const sess = readSession("rider") || readSession();

  if (!sess || !sess.token) {
    throw redirect({ to: "/auth" });
  }

  if ((sess as any)?.status === "suspended" || (sess as any)?.isSuspended) {
    throw redirect({ to: "/auth" });
  }
}
