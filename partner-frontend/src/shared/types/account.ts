/**
 * Shared account / authentication contracts.
 *
 * The mock backend issues the same shape a real FastAPI `/api/auth/*` endpoint
 * would, so swapping the transport requires no UI change.
 */

export type AccountRole = "customer" | "partner" | "rider" | "admin";

export type Account = {
  id: string;
  role: AccountRole;
  name: string;
  phone: string;
  email: string;
  city: string;
  avatarInitials: string;
  /** Partner/rider onboarding state; always true for customers and admins. */
  isOnboarded: boolean;
  isVerified: boolean;
  status?: string;
  /** Partner store id / rider profile id this login owns (partner & rider roles). */
  linkedId?: string;
  [key: string]: any;
};

export type AuthSession = {
  token: string;
  refreshToken: string;
  expiresAt: string;
  account: Account;
  status?: string;
  isVerified?: boolean;
  isOnboarded?: boolean;
  [key: string]: any;
};

export type RequestOtpPayload = { phone: string; role: AccountRole };

export type RequestOtpResult = {
  ok: true;
  /** Mock backend echoes the OTP so testers can log in without SMS. */
  devOtp: string;
  expiresInSeconds: number;
  isNewAccount: boolean;
};

export type VerifyOtpPayload = { phone: string; otp: string; role: AccountRole };

export type LoginPayload = { email: string; password: string; role: AccountRole };