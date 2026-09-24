import { apiGetJson, apiPostJson } from "../core/transport";
import { readSession } from "../core/session-store";

export interface VerificationStep {
  id: string;
  title: string;
  status: "completed" | "in_progress" | "pending" | "rejected";
  desc: string;
}

export interface VerificationDocument {
  id: string;
  name: string;
  status: "submitted" | "verified" | "rejected" | "pending";
  required: boolean;
  rejectionReason?: string | null;
}

export interface RiderVerificationStatusResponse {
  riderId: string;
  name: string;
  phone: string;
  city: string;
  vehicleType: string;
  vehicleNumber: string;
  status: "pending" | "under_verification" | "active" | "approved" | "rejected" | "offline";
  kycStatus: "pending" | "verified" | "rejected";
  isVerified: boolean;
  isApproved: boolean;
  isOnboarded: boolean;
  submittedAt: string;
  estimatedTime: string;
  rejectionReason?: string | null;
  resubmitted?: boolean;
  resubmittedAt?: string;
  resubmissionCount?: number;
  draftData?: Record<string, any>;
  steps: VerificationStep[];
  documents: VerificationDocument[];
  support: {
    helpline: string;
    whatsapp: string;
    hub: string;
  };
}

/** GET /api/rider/verification-status — Fetch real-time verification and admin approval status. */
export async function fetchRiderVerificationStatus(): Promise<RiderVerificationStatusResponse> {
  const sess = readSession("rider") || readSession();
  const riderId = (sess as any)?.account?.linkedId ?? (sess as any)?.account?.id ?? (sess as any)?.riderId ?? (sess as any)?.id ?? "";
  const phone = (sess as any)?.account?.phone ?? (sess as any)?.phone ?? "";
  const params = new URLSearchParams();
  if (riderId) params.set("rider_id", riderId);
  if (phone) params.set("phone", phone);
  const qStr = params.toString();
  return await apiGetJson<RiderVerificationStatusResponse>(
    `/api/rider/verification-status${qStr ? `?${qStr}` : ""}`
  );
}

/** POST /api/rider/verification/simulate-admin-approve — Instant approval for testing/demo. */
export async function simulateAdminApprove(riderId?: string) {
  return await apiPostJson<{ ok: boolean; status: string; kycStatus: string; isVerified: boolean }>(
    "/api/rider/verification/simulate-admin-approve",
    { riderId }
  );
}

/** POST /api/rider/verification/simulate-admin-reject — Instant rejection for testing/demo. */
export async function simulateAdminReject(reason?: string, riderId?: string) {
  return await apiPostJson<{ ok: boolean; status: string; kycStatus: string; rejectionReason: string }>(
    "/api/rider/verification/simulate-admin-reject",
    { reason, riderId }
  );
}
