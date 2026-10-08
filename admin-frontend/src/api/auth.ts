/** Authentication API client for QuickPress Admin & Staff Console. */
import type { AuthSession } from "@/shared/types";
import { apiPostJson } from "@/api/core/transport";
import { clearSession, writeSession } from "@/api/core/session-store";

import {
  adminLoginWithGoogle,
  adminSignOut,
  rememberAdminLogin,
  refreshAdminSession,
  restoreAdminSession,
  startAdminAutoRefresh,
} from "@/api/admin/admin-auth-api";

export type AdminSession = {
  token: string;
  email: string;
  name: string;
  role: string;
  twoFactorRequired: boolean;
};

export type TwoFactorChallenge = {
  twoFactorRequired: boolean;
  challengeId: string;
  emailMasked: string;
  expiresInSeconds: number;
  message: string;
  debugOtp?: string;
};

export type StaffRegisterResponse = {
  ok: boolean;
  email: string;
  message: string;
  debugOtp?: string;
};

export type StaffVerifyResponse = {
  ok: boolean;
  verified: boolean;
  message: string;
};

/**
 * Step 1: Login with Business Email & Password.
 * Returns a 2FA OTP Challenge.
 */
export async function adminEmailPasswordLogin(input: {
  email: string;
  password: string;
}): Promise<TwoFactorChallenge> {
  return apiPostJson<TwoFactorChallenge>(
    "/api/auth/admin/login",
    { email: input.email.trim().toLowerCase(), password: input.password },
    { anonymous: true },
  );
}

/**
 * Step 2: Verify 2FA OTP Challenge and establish session.
 */
export async function verifyAdminTwoFactor(input: {
  challengeId: string;
  otp: string;
}): Promise<AdminSession> {
  const session = await apiPostJson<AuthSession>(
    "/api/auth/admin/2fa",
    { challengeId: input.challengeId, otp: input.otp.trim() },
    { anonymous: true },
  );
  writeSession(session, "admin");
  return {
    token: session.token,
    email: session.account?.email || "admin@quickpress.online",
    name: session.account?.name || "Super Admin",
    role: session.account?.departmentRole || session.account?.role || "Super Administrator",
    twoFactorRequired: false,
  };
}

/**
 * Onboard/Register a new Staff member with Corporate Business Email.
 */
export async function registerStaff(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
  scope?: string;
}): Promise<StaffRegisterResponse> {
  return apiPostJson<StaffRegisterResponse>(
    "/api/auth/staff/register",
    input,
    { anonymous: true },
  );
}

/**
 * Verify Staff Corporate Email with OTP code.
 */
export async function verifyStaffEmailOtp(input: {
  email: string;
  otp: string;
}): Promise<StaffVerifyResponse> {
  return apiPostJson<StaffVerifyResponse>(
    "/api/auth/staff/verify-email",
    input,
    { anonymous: true },
  );
}

/** POST /api/auth/logout — clears stored JWT session and Firebase context. */
export async function adminLogout(): Promise<{ ok: boolean }> {
  await adminSignOut().catch(async () => {
    await apiPostJson("/api/auth/logout").catch(() => null);
    clearSession("admin");
  });
  return { ok: true };
}

/** Request password recovery link/OTP */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean; email: string }> {
  try {
    return await apiPostJson<{ ok: boolean; email: string }>(
      "/api/auth/forgot-password",
      { email: email.trim().toLowerCase() },
      { anonymous: true },
    );
  } catch {
    return { ok: true, email };
  }
}

export {
  adminLoginWithGoogle,
  rememberAdminLogin,
  refreshAdminSession,
  restoreAdminSession,
  startAdminAutoRefresh,
};
