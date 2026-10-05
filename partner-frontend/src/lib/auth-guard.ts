import { redirect } from "@tanstack/react-router";
import { readSession } from "../api/core/session-store";
import { partnerRoutes } from "../navigation/partner-routes";

/**
 * Strict Route Guard for all partner operational screens.
 * 1. Blocks unauthenticated access and immediately redirects to /auth.
 * 2. If partner hasn't completed onboarding -> redirects to /registration.
 * 3. If partner is pending Admin verification -> redirects to /registration-submitted.
 * 4. Only allows full dashboard access when BOTH isOnboarded & isVerified are true.
 */
export function requirePartnerAuth() {
  if (typeof window === "undefined") return;
  const sess = readSession("partner");
  if (!sess || !sess.token) {
    throw redirect({ to: partnerRoutes.auth });
  }
  if (sess.status === "suspended" || (sess as any).isSuspended) {
    throw redirect({ to: partnerRoutes.suspended });
  }
  const isOnboarded = sess.isOnboarded ?? sess.account?.isOnboarded;
  if (isOnboarded === false) {
    throw redirect({ to: partnerRoutes.registration });
  }
  const isVerified = Boolean(
    sess.isVerified === true ||
    sess.account?.isVerified === true ||
    sess.status === "approved" ||
    sess.account?.status === "approved"
  );
  if (!isVerified) {
    throw redirect({ to: partnerRoutes.registrationSubmitted });
  }
  // Active partner with store access
}

export function requirePartnerSession() {
  if (typeof window === "undefined") return;
  const sess = readSession("partner");
  if (!sess || !sess.token) {
    throw redirect({ to: partnerRoutes.auth });
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

