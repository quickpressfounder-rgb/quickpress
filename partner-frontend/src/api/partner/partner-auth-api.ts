// Partner auth data layer — real Firebase phone OTP + FastAPI JWT session.
import type { AccountRole, AuthSession } from "@/shared/types";
import type { BusinessRegistrationPayload, PartnerSession } from "@/shared/types/partner";

import {
  authMode,
  logout as logoutSession,
  refreshSession,
  restoreSession,
  sendPhoneOtp,
  signInWithGoogle,
  verifyPhoneOtp,
} from "../core/auth-service";
import { delay } from "../core/partner-client";
import { apiGetJson, apiPostJson } from "../core/transport";
import { readSession, setRememberSession, writeSession } from "../core/session-store";
import { startSessionAutoRefresh } from "../core/session-refresh";
import { getCachedPartnerProfile, getCleanPartnerName } from "./partner-profile-api";

const ROLE: AccountRole = "partner";

function toPartnerSession(session: AuthSession): PartnerSession {
  const isVerified = Boolean(
    session.account?.isVerified === true ||
    (session as any).isVerified === true ||
    (session as any).kycStatus === "verified" ||
    (session.account as any)?.kycStatus === "verified" ||
    (session.account as any)?.status === "approved" ||
    (session as any).status === "approved" ||
    (session.account as any)?.status === "active" ||
    session.status === "active"
  );
  const isOnboarded = Boolean(
    session.account?.isOnboarded === true ||
    (session as any).isOnboarded === true ||
    isVerified ||
    session.account?.linkedId ||
    (session as any).partnerId
  );
  const status = isVerified
    ? "active"
    : (isOnboarded ? ((session.account as any)?.status || (session as any).status || "pending_verification") : "not_registered");

  const cached = getCachedPartnerProfile();
  const rawAccountName = session.account?.name ?? "";
  const resolvedName = getCleanPartnerName([
    cached?.businessName,
    cached?.ownerName,
    cached?.name,
    (session.account as any)?.ownerName,
    (session as any)?.ownerName,
    (session as any)?.businessName,
    rawAccountName,
  ], "QuickPress Partner");

  const resolvedOwner = getCleanPartnerName([
    cached?.ownerName,
    (session.account as any)?.ownerName,
    (session as any)?.ownerName,
    cached?.businessName,
    rawAccountName,
  ], "Partner");

  return {
    partnerId: session.account?.linkedId ?? session.account?.id,
    phone: session.account?.phone ?? "",
    email: session.account?.email,
    businessName: resolvedName,
    ownerName: resolvedOwner,
    city: (session.account as any)?.city ?? cached?.city ?? "",
    isVerified,
    isOnboarded,
    status,
    kycStatus: (session.account as any)?.kycStatus || (isVerified ? "verified" : (isOnboarded ? "pending" : "not_registered")),
  };
}

export function getStoredPartnerSession(): PartnerSession | null {
  const session = readSession(ROLE);
  return session ? toPartnerSession(session) : null;
}

function toE164(phone: string): string {
  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (!cleaned.startsWith("+") && digits) return `+${digits}`;
  return cleaned;
}

export async function requestOtp(phone: string) {
  const e164 = toE164(phone);
  const result = await sendPhoneOtp(e164, ROLE);
  return { ok: true as const, phone: e164, expiresInSec: result.expiresInSeconds };
}

export async function verifyOtp(phone: string, code: string): Promise<PartnerSession> {
  const e164 = toE164(phone);
  return toPartnerSession(await verifyPhoneOtp(e164, code, ROLE));
}

export async function loginWithGoogle(): Promise<PartnerSession> {
  return toPartnerSession(await signInWithGoogle(ROLE));
}

export async function restorePartnerSession(): Promise<PartnerSession | null> {
  const session = await restoreSession(ROLE);
  return session ? toPartnerSession(session) : null;
}

export async function refreshPartnerSession(): Promise<PartnerSession | null> {
  const session = await refreshSession(ROLE);
  return session ? toPartnerSession(session) : null;
}

export async function logout(): Promise<void> {
  return logoutSession(ROLE);
}

import { setCachedPartnerProfile } from "./partner-profile-api";

export async function registerBusiness(
  payload: BusinessRegistrationPayload,
): Promise<PartnerSession> {
  const res = await apiPostJson<{
    partnerId: string;
    phone: string;
    businessName: string;
    isVerified: boolean;
    isOnboarded: boolean;
  }>("/api/partner/onboarding", payload, { timeoutMs: 120000 });

  const currentSession = readSession(ROLE);
  const updatedSession: PartnerSession = {
    partnerId: res.partnerId,
    phone: res.phone || currentSession?.account?.phone || payload.phone || "",
    email: currentSession?.account?.email || payload.email,
    businessName: res.businessName || payload.businessName,
    ownerName: payload.ownerName,
    city: payload.city,
    isVerified: res.isVerified,
    isOnboarded: true,
  };

  try {
    setCachedPartnerProfile({
      partnerId: res.partnerId,
      businessName: res.businessName || payload.businessName,
      ownerName: payload.ownerName,
      phone: res.phone || payload.phone || "",
      email: payload.email || "",
      city: payload.city,
      area: payload.area,
      address: payload.address,
      pincode: payload.pincode,
      logo: payload.logo,
      logoUrl: payload.logo,
      image: payload.logo,
      storeImage: payload.logo,
      banner: payload.banner,
      bannerUrl: payload.banner,
      rating: 5.0,
      totalOrders: 0,
      isVerified: res.isVerified,
      status: "active",
      isOnboarded: true,
      category: payload.category,
      gallery: payload.gallery || [],
    } as any);
  } catch {}

  if (currentSession && currentSession.account) {
    writeSession(
      {
        ...currentSession,
        account: {
          ...currentSession.account,
          linkedId: res.partnerId,
          name: res.businessName || payload.businessName,
          ownerName: payload.ownerName,
          city: payload.city,
          isVerified: res.isVerified,
          isOnboarded: true,
        },
      },
      ROLE,
    );
  }

  return updatedSession;
}

export type PartnerVerificationResult = {
  isVerified: boolean;
  isOnboarded?: boolean;
  status: string;
  kycStatus?: string;
  businessName: string;
  ownerName?: string;
  partnerId: string;
  rejectionReason?: string;
  resubmitted?: boolean;
  resubmittedAt?: string;
  resubmissionCount?: number;
  draftData?: any;
};

/** Check if Admin has approved the partner in Supabase backend. */
export async function checkPartnerVerificationStatus(): Promise<PartnerVerificationResult> {
  const currentSession = readSession(ROLE);
  const storedPhone = currentSession?.account?.phone || "";
  const storedPid = currentSession?.account?.linkedId || "";

  try {
    let res: {
      isVerified?: boolean;
      status?: string;
      kycStatus?: string;
      businessName?: string;
      ownerName?: string;
      partnerId?: string;
      isOnboarded?: boolean;
      rejectionReason?: string;
      resubmitted?: boolean;
      resubmittedAt?: string;
      resubmissionCount?: number;
      draftData?: any;
    } | null = null;

    // 1. Try dedicated verification-status endpoint
    try {
      const qParams: Record<string, string> = {};
      if (storedPid) qParams.partner_id = storedPid;
      if (storedPhone) qParams.phone = storedPhone;
      res = await apiGetJson<typeof res>("/api/partner/verification-status", {
        params: qParams,
      });
    } catch {
      // 2. Fallback to /api/partner/profile
      res = await apiGetJson<typeof res>("/api/partner/profile");
    }

    const isVerified = Boolean(
      res?.isVerified === true ||
      res?.status === "active" ||
      res?.status === "approved"
    );
    const isOnboarded = Boolean(
      (res?.isOnboarded === true || isVerified) &&
      res?.status !== "not_registered"
    );

    const cached = getCachedPartnerProfile();
    const bName = getCleanPartnerName([
      res?.businessName,
      res?.ownerName,
      cached?.businessName,
      cached?.ownerName,
      cached?.name,
      currentSession?.account?.name,
    ], "QuickPress Partner");
    const pId = res?.partnerId || currentSession?.account?.linkedId || "";
    const activeStatus = isVerified ? "active" : (res?.status || (isOnboarded ? "pending_verification" : "not_registered"));

    if (currentSession && currentSession.account) {
      const updatedSession: AuthSession = {
        ...currentSession,
        status: activeStatus,
        isVerified,
        isOnboarded,
        account: {
          ...currentSession.account,
          status: activeStatus,
          isVerified,
          isOnboarded,
          linkedId: pId || currentSession.account.linkedId,
          name: bName,
        },
      };
      writeSession(updatedSession, ROLE);
    }

    return {
      isVerified,
      isOnboarded,
      status: activeStatus,
      kycStatus: res?.kycStatus || (isVerified ? "verified" : (activeStatus === "rejected" ? "rejected" : (isOnboarded ? "pending" : "not_registered"))),
      businessName: bName,
      ownerName: res?.ownerName || "",
      partnerId: pId,
      rejectionReason: res?.rejectionReason,
      resubmitted: res?.resubmitted,
      resubmittedAt: res?.resubmittedAt,
      resubmissionCount: res?.resubmissionCount,
      draftData: res?.draftData,
    };
  } catch {
    const isAlreadyVerified = Boolean(
      currentSession?.isVerified === true ||
      currentSession?.account?.isVerified === true ||
      currentSession?.status === "approved" ||
      currentSession?.account?.status === "approved"
    );
    const isAlreadyOnboarded = Boolean(
      (currentSession?.isOnboarded === true || currentSession?.account?.isOnboarded === true || isAlreadyVerified) &&
      currentSession?.status !== "not_registered" &&
      currentSession?.account?.status !== "not_registered"
    );
    return {
      isVerified: isAlreadyVerified,
      isOnboarded: isAlreadyOnboarded,
      status: isAlreadyVerified ? "active" : (isAlreadyOnboarded ? "pending_verification" : "not_registered"),
      kycStatus: isAlreadyVerified ? "verified" : (isAlreadyOnboarded ? "pending" : "not_registered"),
      businessName: currentSession?.account?.name || "",
      partnerId: currentSession?.account?.linkedId || "",
    };
  }
}

/** "Remember me" — keeps the partner signed in across browser restarts. */
export function rememberPartnerLogin(remember: boolean): void {
  setRememberSession(remember, ROLE);
}

/** Keeps the access token ahead of expiry while the app is open. */
export function startPartnerAutoRefresh(): () => void {
  return startSessionAutoRefresh(ROLE);
}

export async function sendPartnerAadhaarOtp(aadhaarNumber: string) {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    clientId: string;
    aadhaar: string;
    maskedAadhaar: string;
    otpSent: boolean;
    source: string;
    message: string;
  }>("/api/partner/verify/aadhaar/send-otp", { aadhaarNumber });
}

export async function verifyPartnerAadhaarOtp(
  aadhaarNumber: string,
  otp: string,
  clientId?: string,
  fullName = ""
) {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    aadhaar: string;
    maskedAadhaar: string;
    fullName?: string;
    gender?: string;
    dob?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    photo?: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/partner/verify/aadhaar/verify-otp", { aadhaarNumber, otp, clientId, fullName });
}

export async function verifyPartnerPan(panNumber: string, ownerName = "") {
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
  }>("/api/partner/verify/pan", { panNumber, ownerName });
}

export async function verifyPartnerGst(gstin: string, shopName = "", ownerName = "") {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    gstin: string;
    tradeName?: string;
    legalName?: string;
    status?: string;
    taxpayerType?: string;
    state?: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/partner/verify/gst", { gstin, shopName, ownerName });
}

export async function verifyPartnerIfsc(ifsc: string) {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    ifsc: string;
    bankName: string;
    branch: string;
    city: string;
    state: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/partner/verify/ifsc", { ifsc });
}

export async function verifyPartnerBankAccount(
  accountNumber: string,
  ifsc: string,
  accountHolder = ""
) {
  return apiPostJson<{
    ok: boolean;
    valid: boolean;
    accountNumber: string;
    ifsc: string;
    registeredName: string;
    pennyDropStatus: string;
    utrNumber?: string;
    verificationStatus: string;
    source?: string;
    message: string;
  }>("/api/partner/verify/bank", { accountNumber, ifsc, accountHolder });
}

export async function uploadPartnerDocument(imageOrDataUrl: string, documentType: string, partnerId?: string) {
  return apiPostJson<{
    ok: boolean;
    url: string;
    documentType: string;
    field: string;
  }>("/api/uploads/partner/document", { image: imageOrDataUrl, documentType, partnerId });
}

export async function sendPartnerEmailOtp(email: string, ownerName = "") {
  return apiPostJson<{ ok: boolean; email: string; otpSent: boolean; message: string }>(
    "/api/partner/verify/email/send-otp",
    { email, ownerName }
  );
}

export async function verifyPartnerEmailOtp(email: string, otp: string) {
  return apiPostJson<{ ok: boolean; verified: boolean; email: string; message: string }>(
    "/api/partner/verify/email/verify-otp",
    { email, otp }
  );
}

export async function sendPartnerAgreementOtp(email: string, ownerName = "", shopName = "") {
  return apiPostJson<{ ok: boolean; email: string; otpSent: boolean; message: string }>(
    "/api/partner/agreement/send-otp",
    { email, ownerName, shopName }
  );
}

export async function verifyPartnerAgreementOtp(email: string, otp: string) {
  return apiPostJson<{ ok: boolean; verified: boolean; email: string; message: string }>(
    "/api/partner/agreement/verify-otp",
    { email, otp }
  );
}

export async function checkPartnerRegistered(phone: string): Promise<{
  ok: boolean;
  phone: string;
  isRegistered: boolean;
  isOnboarded: boolean;
  isVerified: boolean;
  businessName: string;
}> {
  const digits = phone.replace(/\D/g, "").slice(-10);
  try {
    const res = await apiGetJson<{
      ok: boolean;
      phone: string;
      isRegistered: boolean;
      isOnboarded: boolean;
      isVerified: boolean;
      businessName: string;
    }>(`/api/partner/auth/check-registered?phone=${encodeURIComponent(digits)}`, {
      anonymous: true,
      timeoutMs: 8000,
    });
    return res;
  } catch {
    // Fallback to /verification-status
    try {
      const vs = await apiGetJson<any>(`/api/partner/verification-status?phone=${encodeURIComponent(digits)}`, {
        anonymous: true,
        timeoutMs: 8000,
      });
      return {
        ok: true,
        phone: digits,
        isRegistered: Boolean(vs?.isOnboarded || vs?.isVerified || (vs?.status && vs?.status !== "not_registered")),
        isOnboarded: Boolean(vs?.isOnboarded),
        isVerified: Boolean(vs?.isVerified),
        businessName: vs?.businessName || "",
      };
    } catch {
      return {
        ok: true,
        phone: digits,
        isRegistered: true,
        isOnboarded: true,
        isVerified: true,
        businessName: "",
      };
    }
  }
}



