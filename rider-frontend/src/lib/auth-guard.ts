import { redirect } from "@tanstack/react-router";
import { readSession } from "../api/core/session-store";

/**
 * Checks if rider has submitted registration documents / profile (Step 1-6 KYC completed).
 */
export function isRiderOnboarded(sess: any): boolean {
  if (!sess || !sess.token) return false;

  const acc = sess.account || sess;

  // Explicit false flags always mean not onboarded
  if (acc.isOnboarded === false || acc.is_onboarded === false || sess.isOnboarded === false) {
    return false;
  }

  // Explicit true flags mean onboarded
  if (acc.isOnboarded === true || acc.is_onboarded === true || sess.isOnboarded === true) {
    return true;
  }

  // Linked to an established rider document ID
  const linkedId = acc.linkedId || sess.riderId;
  if (linkedId && typeof linkedId === "string" && linkedId.trim().length > 3) {
    return true;
  }

  return false;
}

/**
 * Checks if the current rider session is fully verified and approved by admin.
 */
export function isRiderApproved(sess: any): boolean {
  if (!sess || !sess.token) return false;

  // Rider MUST be onboarded before they can ever be considered approved
  if (!isRiderOnboarded(sess)) return false;

  const acc = sess.account || sess;
  const status = String(sess.status || acc.status || "").toLowerCase();
  const kycStatus = String(
    sess.kycStatus || acc.kycStatus || sess.kyc_status || acc.kyc_status || ""
  ).toLowerCase();

  // Suspension or rejection blocks access
  if (
    status === "suspended" ||
    sess.isSuspended ||
    status === "rejected" ||
    kycStatus === "rejected" ||
    status === "not_registered"
  ) {
    return false;
  }

  // Must be verified or approved status
  if (
    acc.isVerified === true ||
    acc.is_verified === true ||
    sess.isVerified === true ||
    sess.isApproved === true ||
    status === "approved" ||
    (status === "active" && (kycStatus === "verified" || kycStatus === "approved"))
  ) {
    return true;
  }

  // Pending verification is NOT approved yet
  return false;
}

/**
 * Strict Route Guard for all Rider / Captain operational screens (/dashboard, /orders, /wallet, etc.).
 * 1. Blocks unauthenticated access and immediately redirects to /auth.
 * 2. If rider is NOT registered/onboarded, redirects to /registration.
 * 3. If rider is registered but NOT yet approved by admin, redirects to /verification.
 * 4. Blocks suspended/rejected riders and redirects to /auth.
 */
export function requireRiderAuth() {
  if (typeof window === "undefined") return;
  const sess = readSession("rider") || readSession();

  if (!sess || !sess.token) {
    throw redirect({ to: "/auth" });
  }

  const acc = (sess as any).account || sess;
  const status = String((sess as any).status || acc.status || "").toLowerCase();
  if (status === "suspended" || (sess as any)?.isSuspended || status === "rejected") {
    throw redirect({ to: "/auth" });
  }

  // Unregistered rider must complete registration first
  if (!isRiderOnboarded(sess)) {
    throw redirect({ to: "/registration" });
  }

  // Unapproved rider must wait on verification screen
  if (!isRiderApproved(sess)) {
    throw redirect({ to: "/verification" });
  }
}

/**
 * Guard for registration & verification waiting screens.
 * Ensures the rider has an active authenticated session.
 */
export function requireRiderSession() {
  if (typeof window === "undefined") return;
  const sess = readSession("rider") || readSession();

  if (!sess || !sess.token) {
    throw redirect({ to: "/auth" });
  }

  const acc = (sess as any).account || sess;
  const status = String((sess as any).status || acc.status || "").toLowerCase();
  if (status === "suspended" || (sess as any)?.isSuspended) {
    throw redirect({ to: "/auth" });
  }
}
