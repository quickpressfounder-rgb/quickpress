import {
  apiGetJson,
  apiPostJson,
  apiPatchJson,
  apiDeleteJson,
} from "../core/transport";

export interface PartnerOperationsConfig {
  rushHour: boolean;
  soundAlerts: boolean;
  autoAccept: boolean;
  pickupRadiusKm: number;
  openingTime: string;
  closingTime: string;
  weeklyOff: string;
  slotCapacity: number;
}

export interface PartnerStaffMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface PartnerBankAccount {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  upiId: string;
  isVerified: boolean;
}

export interface PartnerGstReport {
  period: string;
  partnerId?: string;
  storeName?: string;
  gstin?: string;
  sacCode?: string;
  orderCount: number;
  deliveredCount?: number;
  grossSales: number;
  deliveredSales?: number;
  taxableValue: number;
  gstRate?: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  platformCommission: number;
  gstOnCommission?: number;
  itcClaimable?: number;
  tcsGst?: number;
  tds194o?: number;
  netPartnerPayout: number;
  generatedAt: string;
}

export interface PartnerOffer {
  id: string;
  code: string;
  discountPercent: number;
  minOrderAmount: number;
  validTill: string;
  isActive: boolean;
}

// 1. Operations
export async function fetchOperationsConfig(): Promise<PartnerOperationsConfig> {
  const res = await apiGetJson<PartnerOperationsConfig>("/api/partner/operations");
  return (
    res || {
      rushHour: false,
      soundAlerts: true,
      autoAccept: true,
      pickupRadiusKm: 8.0,
      openingTime: "08:00",
      closingTime: "21:00",
      weeklyOff: "None",
      slotCapacity: 25,
    }
  );
}

export async function updateOperationsConfig(
  updates: Partial<PartnerOperationsConfig>
): Promise<PartnerOperationsConfig> {
  return await apiPatchJson<PartnerOperationsConfig>(
    "/api/partner/operations",
    updates
  );
}

// 2. Staff
export async function fetchStaffList(): Promise<PartnerStaffMember[]> {
  const res = await apiGetJson<{ staff: PartnerStaffMember[] }>("/api/partner/staff");
  return res?.staff || [];
}

export async function addStaffMember(payload: {
  name: string;
  phone: string;
  role: string;
}): Promise<PartnerStaffMember> {
  return await apiPostJson<PartnerStaffMember>("/api/partner/staff", payload);
}

export async function removeStaffMember(staffId: string): Promise<void> {
  await apiDeleteJson(`/api/partner/staff/${staffId}`);
}

// 3. Bank Account
export async function fetchBankDetails(): Promise<PartnerBankAccount> {
  const res = await apiGetJson<PartnerBankAccount>("/api/partner/bank");
  return (
    res || {
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      accountHolderName: "",
      upiId: "",
      isVerified: false,
    }
  );
}

export async function updateBankDetails(
  payload: Partial<PartnerBankAccount>
): Promise<PartnerBankAccount> {
  return await apiPatchJson<PartnerBankAccount>("/api/partner/bank", payload);
}

// 4. GST Report
export async function fetchGstReport(month?: string): Promise<PartnerGstReport> {
  const res = await apiGetJson<PartnerGstReport>("/api/partner/reports/gst", {
    params: { month },
  });
  return (
    res || {
      period: "Current Period",
      orderCount: 0,
      grossSales: 0,
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      totalGst: 0,
      platformCommission: 0,
      netPartnerPayout: 0,
      generatedAt: new Date().toISOString(),
    }
  );
}

// 5. Offers & Coupons
export async function fetchOffersList(): Promise<PartnerOffer[]> {
  const res = await apiGetJson<{ offers: PartnerOffer[] }>("/api/partner/offers");
  return res?.offers || [];
}

export async function createOffer(payload: {
  code: string;
  discountPercent: number;
  minOrderAmount: number;
  validTill: string;
}): Promise<PartnerOffer> {
  return await apiPostJson<PartnerOffer>("/api/partner/offers", payload);
}

export async function deleteOffer(offerId: string): Promise<void> {
  await apiDeleteJson(`/api/partner/offers/${offerId}`);
}

// 6. Approval & Verification Requests
export type PartnerApprovalRequest = {
  requestId: string;
  requestType: "profile_update" | "bank_update" | "pan_update" | "service_create" | "service_update";
  businessName: string;
  status: "pending" | "approved" | "rejected";
  requestedChanges: Record<string, any>;
  reason?: string;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
};

export async function fetchPartnerApprovalRequests(): Promise<PartnerApprovalRequest[]> {
  const res = await apiGetJson<{ ok: boolean; requests: PartnerApprovalRequest[] }>("/api/partner/approval-requests");
  return res?.requests || [];
}
