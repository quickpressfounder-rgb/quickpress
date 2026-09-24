import { redirect } from "@tanstack/react-router";
import { readSession } from "../api/core/session-store";

/**
 * Checks if the current rider session is fully verified and approved by admin.
 */
export function isRiderApproved(sess: any): boolean {
  if (!sess) return false;

  const status = String(sess.status || sess.account?.status || "").toLowerCase();
  const kycStatus = String(
    sess.kycStatus || sess.account?.kycStatus || sess.kyc_status || sess.account?.kyc_status || ""
  ).toLowerCase();

  // Explicit rejection or suspension
  if (status === "suspended" || sess.isSuspended || status === "rejected" || kycStatus === "rejected") {
    return false;
  }

  // Pending / under verification states are strictly NOT approved
  if (
    status === "pending" ||
    status === "pending_approval" ||
    status === "under_verification" ||
    status === "not_registered" ||
    kycStatus === "pending"
  ) {
    return false;
  }

  // Must have an explicit verification flag
  const isVer = Boolean(
    sess.isVerified === true ||
    sess.is_verified === true ||
    sess.isApproved === true ||
    sess.account?.isVerified === true ||
    sess.account?.is_verified === true
  );

  return isVer && (status === "active" || status === "approved" || kycStatus === "verified");
}

/**
 * Checks if rider has submitted registration documents / profile.
 */
export function isRiderOnboarded(sess: any): boolean {
  if (!sess) return false;

  // 1. If already approved, definitely onboarded
  if (isRiderApproved(sess)) return true;

  // 2. Explicit submitted status set post-registration
  const status = String(sess.status || sess.account?.status || "").toLowerCase();
  if (status === "pending_approval" || status === "under_verification") {
    return true;
  }

  // 3. Direct boolean flags
  if (
    sess.isOnboarded === true ||
    sess.is_onboarded === true ||
    sess.account?.isOnboarded === true ||
    sess.account?.is_onboarded === true
  ) {
    return true;
  }

  return false;
}

/**
 * Strict Route Guard for all Rider / Captain operational screens.
 * 1. Blocks unauthenticated access and immediately redirects to /auth.
 * 2. If rider hasn't registered at all, redirects to /registration.
 * 3. Blocks unapproved riders (under verification / pending admin approval) and redirects to /verification.
 * 4. Only allows verified & approved riders to access operational screens (/dashboard, /orders, /wallet, etc.).
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

  // 1. If rider has NOT completed registration form at all, redirect to /registration
  if (!isRiderOnboarded(sess)) {
    throw redirect({ to: "/registration" });
  }

  // 2. If rider completed registration but is NOT yet approved by admin, redirect to /verification
  if (!isRiderApproved(sess)) {
    throw redirect({ to: "/verification" });
  }

  // 3. Approved & onboarded -> Allow access to operational screens!
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
