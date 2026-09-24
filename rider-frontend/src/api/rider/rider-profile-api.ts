// Rider profile data layer — backed by the shared FastAPI backend.
import { apiGetJson, apiPatchJson, apiPostJson, apiPutJson } from "../core/transport";
export interface RiderProfile {
  id: string;
  riderId: string;
  fullName: string;
  name?: string;
  phone: string;
  email: string;
  city: string;
  rating: number;
  totalTrips: number;
  joinedOn: string;
  vehicleType: string;
  vehicleNumber: string;
  dlNumber?: string;
  rcNumber?: string;
  aadhaar?: string;
  pan?: string;
  bankName: string;
  accountNumber?: string;
  accountLast4: string;
  accountHolder?: string;
  ifsc: string;
  upiId?: string;
  photoUrl?: string;
  selfieUrl?: string;
  avatar?: string;
  status: string;
  isVerified: boolean;
  isOnboarded: boolean;
  isOnline: boolean;
  kycStatus: string;
  kycLocked?: boolean;
  verifiedGovernmentName?: string;
  pendingChangeRequest?: any;
  pendingBankChangeRequest?: any;
  documents?: Array<{
    id: string;
    label: string;
    status: string;
  }>;
}

export async function fetchRiderProfile(): Promise<RiderProfile> {
  const res = await apiGetJson<any>("/api/rider/profile");
  const rawName = res.fullName || res.name || "";
  const cleanName =
    rawName === "Delivery Partner" || rawName === "Delivery Captain" ? "" : rawName;
  const photo = res.selfieUrl || res.photoUrl || res.avatar || "";

  if (photo && typeof window !== "undefined") {
    window.localStorage.setItem("qp_rider_profile_photo", photo);
  }

  return {
    id: res.id || res._id || res.riderId || "",
    riderId: res.riderId || res._id || "",
    fullName: cleanName,
    name: cleanName,
    phone: res.phone || res.mobile || "",
    email: res.email && res.email !== "—" ? res.email : "",
    city: res.city && res.city !== "—" ? res.city : "Kasganj",
    rating: typeof res.rating === "number" ? res.rating : 5.0,
    totalTrips: typeof res.totalTrips === "number" ? res.totalTrips : 0,
    joinedOn: res.joinedOn || "",
    vehicleType: res.vehicleType || res.vehicle || "Bike",
    vehicleNumber: res.vehicleNumber && res.vehicleNumber !== "—" ? res.vehicleNumber : "",
    dlNumber: res.dlNumber || res.license || "",
    rcNumber: res.rcNumber || "",
    aadhaar: res.aadhaar ? `•••• •••• ${String(res.aadhaar).slice(-4)}` : "",
    pan: res.pan || "",
    bankName: res.bankName || "",
    accountNumber: res.accountNumber || "",
    accountLast4: res.accountLast4 || (res.accountNumber ? String(res.accountNumber).slice(-4) : ""),
    accountHolder: res.accountHolder || cleanName,
    ifsc: res.ifsc || "",
    upiId: res.upiId || "",
    photoUrl: photo,
    selfieUrl: photo,
    avatar: photo,
    status: res.status || (res.isVerified ? "active" : "pending"),
    isVerified: Boolean(res.isVerified),
    isOnboarded: Boolean(res.isOnboarded ?? true),
    isOnline: Boolean(res.isOnline),
    kycStatus: res.kycStatus || (res.isVerified ? "verified" : "pending"),
    kycLocked: Boolean(res.kycLocked || res.isKycVerified || res.isVerified),
    verifiedGovernmentName: res.verifiedGovernmentName || cleanName,
    pendingChangeRequest: res.pendingChangeRequest || null,
    pendingBankChangeRequest: res.pendingBankChangeRequest || null,
    documents: Array.isArray(res.documents) ? res.documents : [],
  };
}

export async function updateRiderProfile(patch: Record<string, any>) {
  return apiPatchJson<{ ok: boolean; requiresApproval?: boolean; message?: string; pendingChangeRequest?: any }>("/api/rider/profile", patch);
}

export interface RiderBankAccount {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountHolder: string;
  upiId: string;
  isVerified?: boolean;
}

export async function fetchRiderBank(): Promise<RiderBankAccount> {
  return apiGetJson<RiderBankAccount>("/api/rider/bank");
}

export async function updateRiderBank(bank: Partial<RiderBankAccount>) {
  return apiPatchJson<{ ok: boolean; requiresApproval?: boolean; message?: string; bank?: RiderBankAccount; pendingBankChangeRequest?: any }>("/api/rider/bank", bank);
}

export async function fetchWorkSettings() {
  return apiGetJson<any>("/api/rider/work-settings");
}

export async function updateWorkSettings(settings: Record<string, any>) {
  return apiPatchJson<{ ok: boolean }>("/api/rider/work-settings", settings);
}

