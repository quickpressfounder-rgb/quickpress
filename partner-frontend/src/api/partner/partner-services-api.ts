// Partner services (rate card) data layer — backed by the shared mock/live backend.
import { apiGetJson, apiPostJson, apiRequest } from "../core/transport";
import type { BusinessCategory, PartnerServiceRate } from "@/shared/types/partner";

export type RawService = {
  id: string;
  name: string;
  unit: string;
  price: number;
  enabled?: boolean;
  isActive?: boolean;
  turnaroundHours?: number;
  category?: string;
  description?: string;
  image?: string;
  minQuantity?: number;
  expressAvailable?: boolean;
  pendingApproval?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  pendingChanges?: Record<string, any>;
};

export type ServiceWritePayload = {
  name: string;
  unit: string;
  price: number;
  turnaroundHours?: number;
  enabled?: boolean;
  category?: string;
  description?: string;
  image?: string;
  minQuantity?: number;
  expressAvailable?: boolean;
};

function toServiceRate(raw: RawService): PartnerServiceRate {
  const isEnabled = raw.enabled !== undefined ? raw.enabled : (raw.isActive !== undefined ? raw.isActive : true);
  return {
    id: String(raw.id),
    name: raw.name || "Laundry Service",
    unit: raw.unit || "kg",
    price: Number(raw.price || 0),
    enabled: Boolean(isEnabled),
    turnaroundHours: Number(raw.turnaroundHours || 24),
    category: (raw.category as BusinessCategory) || "laundry",
    description: raw.description || "",
    image: raw.image || "",
    pendingApproval: Boolean(raw.pendingApproval),
    approvalStatus: raw.approvalStatus || (raw.pendingApproval ? "pending" : "approved"),
    rejectionReason: raw.rejectionReason,
    pendingChanges: raw.pendingChanges,
  };
}

export async function fetchPartnerServices(): Promise<PartnerServiceRate[]> {
  const services = await apiGetJson<RawService[]>("/api/partner/services");
  return (services || []).map(toServiceRate);
}

export async function createPartnerService(payload: ServiceWritePayload): Promise<PartnerServiceRate> {
  const raw = await apiPostJson<RawService>("/api/partner/services", payload);
  return toServiceRate(raw);
}

export async function updatePartnerService(
  serviceId: string,
  payload: Partial<ServiceWritePayload>,
): Promise<PartnerServiceRate> {
  const raw = await apiRequest<RawService>("PUT", `/api/partner/services/${encodeURIComponent(serviceId)}`, { body: payload });
  return toServiceRate(raw);
}

export async function deletePartnerService(serviceId: string): Promise<void> {
  await apiRequest<void>("DELETE", `/api/partner/services/${encodeURIComponent(serviceId)}`);
}

export async function toggleService(serviceId: string, enabled: boolean) {
  const raw = await apiRequest<RawService>("PUT", `/api/partner/services/${encodeURIComponent(serviceId)}/toggle`, {
    params: { enabled },
  });
  return { ok: true as const, serviceId, enabled: raw?.enabled ?? enabled };
}

export async function updateServicePrice(serviceId: string, price: number) {
  await apiRequest("PUT", `/api/partner/services/${encodeURIComponent(serviceId)}`, { body: { price } });
  return { ok: true as const, serviceId, price };
}

export type MasterCatalogItem = {
  id: string;
  name: string;
  price: number;
  unit: string;
  desc: string;
  defaultHours: number;
  icon?: string;
  image?: string;
};

export async function fetchMasterCatalogServices(): Promise<MasterCatalogItem[]> {
  try {
    const data = await apiGetJson<any[]>("/api/public/services");
    if (Array.isArray(data) && data.length > 0) {
      return data.map((s) => {
        let turnaroundHours = 24;
        const rawTurnaround = String(s.turnaround || s.sla || s.processingTime || "");
        if (rawTurnaround.includes("12")) turnaroundHours = 12;
        else if (rawTurnaround.includes("48")) turnaroundHours = 48;
        else if (rawTurnaround.includes("36")) turnaroundHours = 36;

        return {
          id: s.name || s.title || s.id,
          name: s.name || s.title || s.id,
          price: Number(s.price ?? s.basePrice ?? s.finalPrice ?? 79),
          unit: s.unit || (s.name?.toLowerCase().includes("kg") ? "kg" : "pc"),
          desc: s.description || s.tagline || "Professional laundry & care finish.",
          defaultHours: turnaroundHours,
          icon: s.icon || "sparkles",
          image: s.image || s.imageUrl,
        };
      });
    }
  } catch (err) {
    console.warn("Could not fetch master catalog services from API, using defaults:", err);
  }
  return [];
}

export type ApprovedCityItem = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  areas: string[];
  pickupRadius?: string;
  deliveryRadiusKm?: number;
};

export async function fetchApprovedOperatingCities(): Promise<ApprovedCityItem[]> {
  try {
    const data = await apiGetJson<ApprovedCityItem[]>("/api/cities");
    if (Array.isArray(data)) {
      return data;
    }
  } catch (err) {
    console.warn("Could not fetch approved cities from API:", err);
  }
  return [];
}

