/**
 * QuickPress Rider Captain Authentication Service — Native Backend Auth & OneSignal.
 *
 * Direct Phone OTP and JWT session management without 3rd party auth lock-in.
 * Upon login, automatically syncs external rider ID with OneSignal push engine.
 */

import type { AccountRole, AuthSession, RequestOtpResult } from "@/shared/types";
import { ApiError } from "./errors";
import { activeSessionRole, clearSession, readSession, writeSession } from "./session-store";
import { apiGetJson, apiPostJson } from "./transport";
import { onesignalLogin, onesignalLogout } from "./onesignal";

export const AUTH_ENDPOINTS = {
  sendOtp: "/api/auth/phone/send-otp",
  verifyOtp: "/api/auth/phone/verify",
  me: "/api/auth/me",
  logout: "/api/auth/logout",
  refresh: "/api/auth/refresh",
} as const;

export type AuthMode = "native";

export function authMode(): AuthMode {
  return "native";
}

function role(explicit?: AccountRole): AccountRole {
  return (explicit ?? (activeSessionRole() as AccountRole)) satisfies AccountRole;
}

function persist(session: AuthSession): AuthSession {
  writeSession(session, session.account.role);
  if (session.account?.id) {
    void onesignalLogin(session.account.id);
  }
  return session;
}

/* ------------------------------------------------------------------ phone */

/** POST /api/auth/phone/send-otp — Backend sends SMS OTP directly. */
export async function sendPhoneOtp(
  phone: string,
  explicitRole?: AccountRole,
): Promise<RequestOtpResult> {
  const audit = await apiPostJson<{ ok: true; expiresInSeconds: number; isNewAccount: boolean }>(
    AUTH_ENDPOINTS.sendOtp,
    { phone, role: role(explicitRole) },
    { anonymous: true, timeoutMs: 35000 },
  );
  return {
    ok: true,
    devOtp: "",
    expiresInSeconds: audit?.expiresInSeconds ?? 60,
    isNewAccount: audit?.isNewAccount ?? false,
  };
}

/** POST /api/auth/phone/verify — verifies SMS OTP and returns Rider JWT AuthSession. */
export async function verifyPhoneOtp(
  phone: string,
  code: string,
  explicitRole?: AccountRole,
  referralCode?: string,
): Promise<AuthSession> {
  const session = await apiPostJson<AuthSession>(
    AUTH_ENDPOINTS.verifyOtp,
    {
      phone,
      code,
      role: role(explicitRole),
      referral_code: referralCode ? referralCode.trim().toUpperCase() : undefined,
    },
    { anonymous: true, timeoutMs: 35000 },
  );
  return persist(session);
}

/* --------------------------------------------------------------- social */

export async function signInWithGoogle(
  explicitRole?: AccountRole,
  referralCode?: string,
): Promise<AuthSession> {
  throw new ApiError("unconfigured", "Please use Phone OTP authentication");
}

export async function signInWithApple(
  explicitRole?: AccountRole,
  referralCode?: string,
): Promise<AuthSession> {
  throw new ApiError("unconfigured", "Please use Phone OTP authentication");
}

/* ------------------------------------------------------------- session */

/** GET /api/auth/me */
export async function fetchCurrentUser(): Promise<AuthSession["account"]> {
  return apiGetJson<AuthSession["account"]>(AUTH_ENDPOINTS.me, { timeoutMs: 35000 });
}

/** POST /api/auth/refresh — rotates the access token using the refresh token. */
export async function refreshSession(explicitRole?: AccountRole): Promise<AuthSession | null> {
  const target = role(explicitRole);
  const current = readSession(target);
  if (!current?.refreshToken) return current || null;
  try {
    const next = await apiPostJson<AuthSession>(
      AUTH_ENDPOINTS.refresh,
      { refresh_token: current.refreshToken },
      { anonymous: true, timeoutMs: 35000 },
    );
    return persist(next);
  } catch (err: any) {
    if (err instanceof ApiError && (err.status === 401 || err.kind === "unauthorized")) {
      clearSession(target);
      return null;
    }
    // Network timeout / restart: preserve current session
    return current;
  }
}

function isExpired(session: AuthSession, skewMs = 60_000): boolean {
  const at = Date.parse(session.expiresAt);
  return Number.isFinite(at) ? at - skewMs <= Date.now() : false;
}

/**
 * Splash → Stored JWT Session → Fast API /api/auth/me → Home | Auth.
 */
export async function restoreSession(explicitRole?: AccountRole): Promise<AuthSession | null> {
  const target = role(explicitRole);
  const stored = readSession(target);
  if (!stored) return null;

  if (isExpired(stored)) return refreshSession(target);

  try {
    const account = await fetchCurrentUser();
    if (!account || !account.id) {
      return stored;
    }
    return persist({ ...stored, account });
  } catch (error: any) {
    if (error instanceof ApiError && (error.status === 401 || error.kind === "unauthorized")) {
      const refreshed = await refreshSession(target);
      if (refreshed) return refreshed;
      clearSession(target);
      return null;
    }
    // Keep user logged in across restarts and network glitches
    return stored;
  }
}

/** POST /api/auth/logout — revokes the refresh token and clears session. */
export async function logout(explicitRole?: AccountRole): Promise<void> {
  const target = role(explicitRole);
  const current = readSession(target);
  if (current?.refreshToken) {
    try {
      await apiPostJson(AUTH_ENDPOINTS.logout, { refresh_token: current.refreshToken });
    } catch {
      /* ignore */
    }
  }
  await onesignalLogout();
  clearSession(target);
}
