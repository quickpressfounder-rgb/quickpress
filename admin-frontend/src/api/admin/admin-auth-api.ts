/**
 * Admin auth data layer — real Firebase identity + FastAPI JWT session.
 *
 * The admin console keeps its existing email/password screen (see
 * `admin-frontend/src/api/auth.ts`, still backed by the shared backend), and
 * gains the same Firebase paths the other three apps use:
 * Google Sign In, phone OTP, session restore, refresh and logout.
 */
import type { AccountRole, AuthSession } from "@/shared/types";

import {
  authMode,
  logout as logoutSession,
  refreshSession,
  restoreSession,
  sendPhoneOtp,
  signInWithGoogle,
  verifyPhoneOtp,
} from "../core/auth-service";
import { setRememberSession } from "../core/session-store";
import { startSessionAutoRefresh } from "../core/session-refresh";

const ROLE: AccountRole = "admin";

export type AdminAuthSession = {
  token: string;
  email: string;
  name: string;
  role: string;
  twoFactorRequired: boolean;
};

function toAdminSession(session: AuthSession): AdminAuthSession {
  return {
    token: session.token,
    email: session.account?.email || "admin@quickpress.online",
    name: session.account?.name || "Super Admin",
    role: session.account?.departmentRole || session.account?.role || "Super Administrator",
    twoFactorRequired: false,
  };
}

/** "Remember this device" toggle for the admin console. */
export function rememberAdminLogin(remember: boolean): void {
  setRememberSession(remember, ROLE);
}

/** POST /api/auth/google — Firebase Google Sign In for staff accounts. */
export async function adminLoginWithGoogle(): Promise<AdminAuthSession> {
  return toAdminSession(await signInWithGoogle(ROLE));
}

/** POST /api/auth/phone/send-otp */
export async function requestAdminOtp(phone: string) {
  return sendPhoneOtp(phone, ROLE);
}

/** POST /api/auth/phone/verify */
export async function verifyAdminOtp(phone: string, code: string): Promise<AdminAuthSession> {
  return toAdminSession(await verifyPhoneOtp(phone, code, ROLE));
}

/** Console boot → stored JWT + live Firebase user → dashboard or sign in. */
export async function restoreAdminSession(): Promise<AdminAuthSession | null> {
  const session = await restoreSession(ROLE);
  return session ? toAdminSession(session) : null;
}

/** POST /api/auth/refresh */
export async function refreshAdminSession(): Promise<AdminAuthSession | null> {
  const session = await refreshSession(ROLE);
  return session ? toAdminSession(session) : null;
}

/** POST /api/auth/logout — revokes the refresh token and Firebase session. */
export async function adminSignOut(): Promise<void> {
  return logoutSession(ROLE);
}

export { authMode };

/** Keeps the admin access token ahead of expiry while the console is open. */
export function startAdminAutoRefresh(): () => void {
  return startSessionAutoRefresh(ROLE);
}
