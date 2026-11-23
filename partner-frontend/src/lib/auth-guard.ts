import { redirect } from "@tanstack/react-router";
import { readSession } from "../api/core/session-store";
import { partnerRoutes } from "../navigation/partner-routes";

/**
 * Checks if the partner session is suspended.
 */
export function isPartnerSuspended(sess: any): boolean {
  if (!sess) return false;
  const acc = sess.account || sess;
  const status = String(sess.status || acc.status || "").toLowerCase();
  return status === "suspended" || sess.isSuspended === true || acc.isSuspended === true;
}

/**
 * Checks if partner has completed onboarding / registration profile submission.
 */
export function isPartnerOnboarded(sess: any): boolean {
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

  // Linked to an established partner store document ID (must not be the auth user ID)
  const linkedId = acc.linkedId || sess.partnerId;
  const authUserId = acc.id || sess.id;
  if (
    linkedId &&
    typeof linkedId === "string" &&
    linkedId.trim().length > 3 &&
    linkedId !== authUserId &&
    sess.status !== "not_registered" &&
    acc.status !== "not_registered"
  ) {
    return true;
  }

  // If approved/verified, partner is definitely onboarded
  if (
    sess.isVerified === true ||
    acc.isVerified === true ||
    sess.isApproved === true ||
    acc.isApproved === true ||
    String(sess.status).toLowerCase() === "approved" ||
    String(acc.status).toLowerCase() === "approved"
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if the current partner session is fully verified and approved by admin.
 */
export function isPartnerApproved(sess: any): boolean {
  if (!sess || !sess.token) return false;

  const acc = sess.account || sess;
  const status = String(sess.status || acc.status || "").toLowerCase();
  const kycStatus = String(
    sess.kycStatus || acc.kycStatus || sess.kyc_status || acc.kyc_status || ""
  ).toLowerCase();

  // Suspension, rejection, or not_registered blocks approval
  if (
    isPartnerSuspended(sess) ||
    status === "rejected" ||
    kycStatus === "rejected" ||
    status === "not_registered"
  ) {
    return false;
  }

  // Must have completed onboarding before they can be considered approved
  if (!isPartnerOnboarded(sess)) {
    return false;
  }

  // Explicit approval / verification flags
  if (
    sess.isVerified === true ||
    acc.isVerified === true ||
    sess.isApproved === true ||
    acc.isApproved === true ||
    status === "approved" ||
    kycStatus === "verified" ||
    kycStatus === "approved" ||
    (status === "active" && (sess.isVerified === true || acc.isVerified === true || kycStatus === "verified" || kycStatus === "approved"))
  ) {
    return true;
  }

  return false;
}

/**
 * Strict Route Guard for all partner operational screens (/orders, /earnings, /settings, etc.).
 * 1. Blocks unauthenticated access and immediately redirects to /auth.
 * 2. If partner is suspended -> redirects to /suspended.
 * 3. If partner has NOT completed onboarding -> redirects to /registration.
 * 4. If partner is onboarded but NOT approved -> redirects to /registration-submitted.
 * 5. Only allows access when partner is both onboarded & approved.
 */
export function requirePartnerAuth() {
  if (typeof window === "undefined") return;
  const sess = readSession("partner");
  if (!sess || !sess.token) {
    throw redirect({ to: partnerRoutes.auth });
  }
  if (isPartnerSuspended(sess)) {
    throw redirect({ to: partnerRoutes.suspended });
  }
  if (!isPartnerOnboarded(sess)) {
    throw redirect({ to: partnerRoutes.registration });
  }
  if (!isPartnerApproved(sess)) {
    throw redirect({ to: partnerRoutes.registrationSubmitted });
  }
}

/**
 * Requires an active authenticated session for non-guest screens.
 */
export function requirePartnerSession() {
  if (typeof window === "undefined") return;
  const sess = readSession("partner");
  if (!sess || !sess.token) {
    throw redirect({ to: partnerRoutes.auth });
  }
  if (isPartnerSuspended(sess)) {
    throw redirect({ to: partnerRoutes.suspended });
  }
}

/**
 * Route Guard for /registration-submitted.
 * If partner is ALREADY verified or possesses an active approved store,
 * immediately redirects to /orders so they NEVER see the approval flash screen.
 */
export function requirePendingVerification() {
  if (typeof window === "undefined") return;
  const sess = readSession("partner");
  if (!sess || !sess.token) {
    throw redirect({ to: partnerRoutes.auth });
  }
  if (isPartnerSuspended(sess)) {
    throw redirect({ to: partnerRoutes.suspended });
  }
  if (!isPartnerOnboarded(sess)) {
    throw redirect({ to: partnerRoutes.registration });
  }
  if (isPartnerApproved(sess)) {
    throw redirect({ to: partnerRoutes.orders });
  }
}

/**
 * Returns true only when the app is on an operational authenticated screen.
 * Disables background polling, socket alerts, and API fetches on /auth, /otp, /registration, etc.
 */
export function isOperationalRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  if (
    path === "/auth" ||
    path.startsWith("/auth") ||
    path.startsWith("/otp") ||
    path.startsWith("/registration") ||
    path.startsWith("/suspended")
  ) {
    return false;
  }
  return true;
}
