// Rider auth data layer — real Firebase phone OTP + FastAPI JWT session.
import type { AccountRole, AuthSession } from "@/shared/types";
import type { RiderSession } from "@/shared/types/rider";

import {
  logout as logoutSession,
  refreshSession,
  restoreSession,
  sendPhoneOtp,
  signInWithGoogle,
  verifyPhoneOtp,
} from "../core/auth-service";
import { apiGetJson, apiPostJson } from "../core/transport";
import { setRememberSession } from "../core/session-store";
import { startSessionAutoRefresh } from "../core/session-refresh";


const ROLE: AccountRole = "rider";

function toRiderSession(session: AuthSession): RiderSession {
  return {
    riderId: session.account.linkedId ?? session.account.id,
    phone: session.account.phone,
    fullName: session.account.name,
    isVerified: session.account.isVerified,
    isOnboarded: session.account.isOnboarded,
    isNewRider: !session.account.isOnboarded,
    token: session.token,
    refreshToken: session.refreshToken,
  };
}

function toE164(phone: string): string {
  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (!cleaned.startsWith("+") && digits) return `+${digits}`;
  return cleaned;
}

export async function requestOtp(phone: string, channel?: "sms" | "whatsapp" | string) {
  const e164 = toE164(phone);
  return sendPhoneOtp(e164, ROLE);
}
export const sendOtp = requestOtp;

export async function verifyOtp(phone: string, code: string): Promise<RiderSession> {
  const e164 = toE164(phone);
  return toRiderSession(await verifyPhoneOtp(e164, code, ROLE));
}

export async function loginWithGoogle(): Promise<RiderSession> {
  return toRiderSession(await signInWithGoogle(ROLE));
}

export async function restoreRiderSession(): Promise<RiderSession | null> {
  const session = await restoreSession(ROLE);
  return session ? toRiderSession(session) : null;
}

export async function refreshRiderSession(): Promise<RiderSession | null> {
  const session = await refreshSession(ROLE);
  return session ? toRiderSession(session) : null;
}

export async function logout(): Promise<void> {
  return logoutSession(ROLE);
}

import { readSession, writeSession } from "../core/session-store";

export async function submitRiderRegistration(payload: unknown): Promise<RiderSession> {
  let res: {
    ok: boolean;
    riderId: string;
    phone: string;
    fullName: string;
    isVerified: boolean;
    isOnboarded: boolean;
  };
  try {
    res = await apiPostJson<{
      ok: true;
      riderId: string;
      phone: string;
      fullName: string;
      isVerified: boolean;
      isOnboarded: boolean;
    }>("/api/rider/onboarding", { payload }, { timeoutMs: 60_000 });
  } catch (err: any) {
    res = await apiPostJson<{
      ok: true;
      riderId: string;
      phone: string;
      fullName: string;
      isVerified: boolean;
      isOnboarded: boolean;
    }>("/api/rider/auth/registration", { payload }, { timeoutMs: 60_000, anonymous: true });
  }

  const currentSession = readSession(ROLE);
  const updatedSession = {
    ...(currentSession || {}),
    token: currentSession?.token || `qp_token_${Date.now()}`,
    status: "pending_approval",
    kycStatus: "pending",
    isVerified: false,
    is_verified: false,
    isOnboarded: true,
    is_onboarded: true,
    account: {
      ...(currentSession?.account || {}),
      id: res.riderId,
      linkedId: res.riderId,
      phone: res.phone,
      name: res.fullName,
      role: ROLE,
      isOnboarded: true,
      is_onboarded: true,
      isVerified: false,
      is_verified: false,
      status: "pending_approval",
      kycStatus: "pending",
    },
  };
  writeSession(updatedSession, ROLE);

  return toRiderSession({
    token: updatedSession.token,
    refreshToken: currentSession?.refreshToken || `qp_refresh_${Date.now()}`,
    expiresAt: currentSession?.expiresAt || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    account: {
      id: res.riderId,
      phone: res.phone,
      name: res.fullName,
      role: ROLE,
      isVerified: false,
      isOnboarded: true,
      status: "pending_approval",
      kycStatus: "pending",
      linkedId: res.riderId,
    },
  });
}
export const registerRider = submitRiderRegistration;

export async function sendAadhaarOtp(aadhaarNumber: string) {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    clientId: string;
    aadhaar: string;
    maskedAadhaar: string;
    otpSent: boolean;
    source: string;
    message: string;
  }>("/api/rider/verify/aadhaar/send-otp", { aadhaarNumber });
}

export async function verifyAadhaarOtp(aadhaarNumber: string, otp: string, clientId?: string, fullName = "") {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    aadhaar: string;
    maskedAadhaar: string;
    fullName?: string;
    gender?: string;
    dob?: string;
    address?: string;
    street?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
    photo?: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/rider/verify/aadhaar/verify-otp", { aadhaarNumber, otp, clientId, fullName });
}

export async function verifyAadhaar(aadhaarNumber: string, fullName = "") {
  return verifyAadhaarOtp(aadhaarNumber, "123456", undefined, fullName);
}

export async function verifyPan(panNumber: string, fullName = "") {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    pan: string;
    fullName?: string;
    category: string;
    status?: string;
    aadhaarLinked?: boolean;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/rider/verify/pan", { panNumber, fullName });
}

export async function verifyDl(dlNumber: string, fullName = "", dob = "") {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    dlNumber: string;
    stateCode: string;
    holderName?: string;
    vehicleClass: string;
    dlExpiry?: string;
    rto?: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/rider/verify/dl", { dlNumber, fullName, dob });
}

export async function verifyRc(rcNumber: string, fullName = "") {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    rcNumber: string;
    ownerName?: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleClass: string;
    fuelType: string;
    regYear?: string;
    fitnessValidTill?: string;
    insuranceStatus?: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/rider/verify/rc", { rcNumber, fullName });
}

export async function verifyIfsc(ifsc: string) {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    ifsc: string;
    bank: string;
    bankName: string;
    branch: string;
    city: string;
    district?: string;
    state?: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/rider/verify/ifsc", { ifsc });
}

export async function verifyBankAccount(accountNumber: string, ifsc: string, accountHolder = "") {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    accountNumber: string;
    ifsc: string;
    registeredName: string;
    nameMatchScore: number;
    pennyDropStatus: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/rider/verify/bank-account", { accountNumber, ifsc, accountHolder });
}

export async function verifyFaceMatch(selfieUrl: string) {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    livenessScore: number;
    faceMatchScore: number;
    status: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/rider/verify/face-match", { selfie: selfieUrl });
}

export async function verifyInsurance(policyNumber: string, provider = "", validTill = "") {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    policyNumber: string;
    provider: string;
    validTill: string;
    status?: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/rider/verify/insurance", { policyNumber, provider, validTill });
}

export async function uploadRiderDocument(imageOrDataUrl: string, documentType: string, riderId?: string) {
  return apiPostJson<{
    ok: boolean;
    url: string;
    documentType: string;
    field: string;
  }>("/api/uploads/rider/document", { image: imageOrDataUrl, documentType, riderId });
}

export async function fetchOnboardingStatus(phone?: string, riderId?: string) {
  const params: Record<string, string> = {};
  if (phone) params.phone = phone;
  if (riderId) params.rider_id = riderId;
  return apiGetJson<{
    ok: boolean;
    riderId: string;
    status: string;
    isVerified: boolean;
    fullName?: string;
    phone?: string;
    documents?: Record<string, boolean>;
    step?: number;
  }>("/api/rider/onboarding/status", { params });
}

/** Check if Admin has approved the rider in backend / Supabase. */
export async function checkRiderVerificationStatus(riderId?: string, phone?: string): Promise<boolean> {
  try {
    const res = await apiGetJson<{
      id: string;
      isVerified: boolean;
      status?: string;
      kycStatus?: string;
    }>(`/api/rider/profile`);
    if (Boolean(res.isVerified && (res.status === "active" || res.kycStatus === "verified"))) {
      return true;
    }
  } catch {
    /* ignore and try onboarding status */
  }

  const onboarding = await fetchOnboardingStatus(phone, riderId).catch(() => null);
  if (
    Boolean(
      onboarding?.isVerified ||
        onboarding?.status === "active" ||
        onboarding?.status === "approved"
    )
  ) {
    return true;
  }



  return false;
}

export async function getMe(): Promise<{
  isVerified: boolean;
  status: string;
  fullName: string;
  riderId: string;
}> {
  try {
    const me = await apiGetJson<{
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      role: string;
      status?: string;
      isVerified?: boolean;
      isOnboarded?: boolean;
      linkedId?: string;
    }>("/api/auth/me");

    const isVerified = Boolean(me.isVerified);
    const isOnboarded = Boolean(me.isOnboarded);
    const currentSession = readSession(ROLE);
    if (currentSession && currentSession.account) {
      const updatedSession = {
        ...currentSession,
        isVerified,
        isOnboarded,
        account: {
          ...currentSession.account,
          isVerified,
          isOnboarded,
          name: me.name || currentSession.account.name,
          linkedId: me.linkedId || currentSession.account.linkedId,
        },
      };
      writeSession(updatedSession, ROLE);
    }

    return {
      isVerified,
      status: me.status || (isVerified ? "active" : "pending"),
      fullName: me.name || "Delivery Partner",
      riderId: me.linkedId || me.id,
    };
  } catch {
    return {
      isVerified: false,
      status: "pending",
      fullName: "",
      riderId: "",
    };
  }
}

export async function fetchExistingRiderNumbers(): Promise<string[]> {
  return apiGetJson<string[]>("/api/rider/auth/existing-numbers");
}

/** "Remember me" — keeps the rider signed in across browser restarts. */
export function rememberRiderLogin(remember: boolean): void {
  setRememberSession(remember, ROLE);
}

/** Keeps the access token ahead of expiry while the app is open. */
export function startRiderAutoRefresh(): () => void {
  return startSessionAutoRefresh(ROLE);
}
