/**
 * QuickPress authentication service — Native Backend Auth & OneSignal Sync.
 *
 *   Screen → auth-api (@backend/<app>/…) → auth-service → FastAPI Backend JWT
 *
 * Direct Phone OTP and JWT session management without 3rd party auth lock-in.
 * Upon login, automatically syncs external user ID with OneSignal push engine.
 */

import type { AccountRole, AuthSession, RequestOtpResult } from "@/shared/types";
import { ApiError } from "./errors";
import { activeSessionRole, clearSession, readSession, writeSession } from "./session-store";
import { apiGetJson, apiPostJson } from "./transport";
import { onesignalLogin, onesignalLogout } from "./onesignal";
import { clearCache } from "../customer/api/cache";
import { signInWithGoogleIdToken } from "./firebase-auth";

export const AUTH_ENDPOINTS = {
  sendOtp: "/api/auth/phone/send-otp",
  verifyOtp: "/api/auth/phone/verify",
  google: "/api/auth/google",
  apple: "/api/auth/apple",
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
  const previous = readSession(session.account.role);
  if (!previous || previous.account?.id !== session.account.id) {
    clearCache();
  }
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
    { anonymous: true },
  );
  return {
    ok: true,
    devOtp: "",
    expiresInSeconds: audit.expiresInSeconds ?? 300,
    isNewAccount: audit.isNewAccount ?? false,
  };
}

/** POST /api/auth/phone/verify — verifies SMS OTP and returns JWT AuthSession. */
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
    { anonymous: true },
  );
  return persist(session);
}

/* --------------------------------------------------------------- social */

export async function signInWithGoogle(
  explicitRole?: AccountRole,
  referralCode?: string,
): Promise<AuthSession> {
  const idToken = await signInWithGoogleIdToken();
  const session = await apiPostJson<AuthSession>(
    AUTH_ENDPOINTS.google,
    {
      id_token: idToken,
      role: role(explicitRole),
      referral_code: referralCode ? referralCode.trim().toUpperCase() : undefined,
    },
    { anonymous: true },
  );
  return persist(session);
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
  return apiGetJson<AuthSession["account"]>(AUTH_ENDPOINTS.me);
}

/** POST /api/auth/refresh — rotates the access token using the refresh token. */
export async function refreshSession(explicitRole?: AccountRole): Promise<AuthSession | null> {
  const current = readSession(role(explicitRole));
  if (!current?.refreshToken) return null;
  try {
    const next = await apiPostJson<AuthSession>(
      AUTH_ENDPOINTS.refresh,
      { refresh_token: current.refreshToken },
      { anonymous: true },
    );
    return persist(next);
  } catch {
    clearSession(role(explicitRole));
    return null;
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
    return persist({ ...stored, account });
  } catch (error) {
    if (error instanceof ApiError && error.kind === "unauthorized") {
      return refreshSession(target);
    }
    return stored; // offline fallback
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
  clearCache();
  clearSession(target);
}
