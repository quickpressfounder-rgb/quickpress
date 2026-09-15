/**
 * Master Services Catalog + Revenue & Rider Intelligence API Client
 *
 * GET /api/admin/services/intelligence   -> Master services with Revenue & Assigned Riders
 * GET /api/admin/services/stats          -> Top service KPI metrics
 * GET /api/admin/services/{id}/360       -> Full 360 service intelligence
 * GET /api/admin/services                -> Master platform catalog
 * GET /api/admin/services/categories     -> Service categories
 * GET /api/admin/partner-services        -> Partner-specific rate cards
 * PATCH /api/admin/partner-services/{id}/status -> Partner service governance
 * POST/PUT/DELETE /api/admin/services    -> Master service management
 */
import { apiGetJson, apiPostJson, apiPutJson, apiPatchJson, apiDeleteJson } from "@/api/core/transport";

export type ServiceRider = {
  riderId: string;
  name: string;
  phone: string;
  vehicle: string;
  plate: string;
  rating: number;
  liveState: "Online" | "On delivery" | "Offline";
  tripsForThisService: number;
  earningsForThisService: number;
};

export type ServiceFinancials = {
  grossRevenue: number;
  platformCommission: number;
  partnerEarnings: number;
  riderEarnings: number;
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  cancelledOrders: number;
  aov: number;
};

export type ServiceIntelligence = {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  unit: string;
  basePrice: number;
  description: string;
  sla: string;
  status: "Active" | "Inactive" | "Archived";
  financials: ServiceFinancials;
  assignedRiders: ServiceRider[];
  partnerStoresCount: number;
  recentOrders: Array<{
    id: string;
    code: string;
    customer: string;
    partner: string;
    rider: string;
    amount: number;
    status: string;
    placedAt: string;
  }>;
};

export type ServiceStats = {
  totalServices: number;
  totalServiceRevenue: number;
  totalOrdersDelivered: number;
  topGrossingService: string;
  topGrossingRevenue: number;
  activeRidersDispatching: number;
  activePartnerStores: number;
};

export type LaundryService = {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  unit: string;
  price: number;
  description: string;
  image: string;
  sla: string;
  cities: number;
  ordersPerWeek: number;
  status: "Active" | "Inactive" | "Archived";
};

export type ServiceCategory = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  services: number;
  status: "Active" | "Inactive";
};

export type PartnerServiceRow = {
  id: string;
  partnerId: string;
  partnerName: string;
  city: string;
  masterServiceId: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  turnaroundHours: number;
  expressAvailable: boolean;
  minQuantity: number;
  status: "Active" | "Disabled" | "Suspended" | "Pending Approval" | "Rejected";
  enabled: boolean;
  ordersCount: number;
  revenue: number;
  updatedAt: string;
  pendingApproval?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
};

export type PartnerApprovalRequest = {
  id: string;
  requestId: string;
  partnerId: string;
  businessName: string;
  requestType: "profile_update" | "bank_update" | "pan_update" | "service_create" | "service_update";
  targetId: string;
  requestedChanges: Record<string, any>;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
};

type BackendService = {
  _id: string;
  name: string;
  categoryId: string;
  unit?: string;
  price?: number;
  image?: string;
  description?: string;
  status?: string;
  turnaroundHours?: number;
};

type BackendCategory = {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  status?: string;
};

/** GET /api/admin/services/intelligence — returns services with real revenue & rider allocations */
export async function fetchServicesIntelligence(): Promise<ServiceIntelligence[]> {
  try {
    const res = await apiGetJson<ServiceIntelligence[]>("/api/admin/services/intelligence");
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.error("fetchServicesIntelligence error:", err);
    return [];
  }
}

/** GET /api/admin/services/stats */
export async function fetchServiceStats(): Promise<ServiceStats> {
  try {
    return await apiGetJson<ServiceStats>("/api/admin/services/stats");
  } catch {
    return {
      totalServices: 0,
      totalServiceRevenue: 0,
      totalOrdersDelivered: 0,
      topGrossingService: "Wash & Iron",
      topGrossingRevenue: 0,
      activeRidersDispatching: 0,
      activePartnerStores: 0,
    };
  }
}

/** GET /api/admin/services/{id}/360 */
export async function fetchService360(id: string): Promise<ServiceIntelligence> {
  return await apiGetJson<ServiceIntelligence>(`/api/admin/services/${encodeURIComponent(id)}/360`);
}

export async function fetchServices(): Promise<LaundryService[]> {
  try {
    const [services, categories] = await Promise.all([
      apiGetJson<BackendService[]>("/api/admin/services"),
      apiGetJson<BackendCategory[]>("/api/admin/services/categories"),
    ]);
    const categoryName = new Map((categories || []).map((c) => [c._id, c.name]));
    return (services || []).map((s) => ({
      id: s._id,
      name: s.name,
      category: categoryName.get(s.categoryId) ?? "Laundry",
      categoryId: s.categoryId,
      unit: s.unit || "kg",
      price: s.price || 0,
      description: s.description || "",
      image: s.image || "",
      sla: s.turnaroundHours ? `${s.turnaroundHours} hrs` : "24-48 hrs",
      cities: 1,
      ordersPerWeek: 0,
      status: (s.status as any) || "Active",
    }));
  } catch {
    return [];
  }
}

export async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  try {
    const [services, categories] = await Promise.all([
      apiGetJson<BackendService[]>("/api/admin/services"),
      apiGetJson<BackendCategory[]>("/api/admin/services/categories"),
    ]);
    const countByCategory = new Map<string, number>();
    for (const s of services || []) {
      countByCategory.set(s.categoryId, (countByCategory.get(s.categoryId) ?? 0) + 1);
    }
    return (categories || []).map((c) => ({
      id: c._id,
      name: c.name,
      description: c.description || "",
      icon: c.icon || "Sparkles",
      services: countByCategory.get(c._id) ?? 0,
      status: (c.status as any) || "Active",
    }));
  } catch {
    return [];
  }
}

export async function fetchPartnerServices(params?: { partnerId?: string; city?: string }): Promise<PartnerServiceRow[]> {
  try {
    const q = new URLSearchParams();
    if (params?.partnerId) q.set("partnerId", params.partnerId);
    if (params?.city && params.city !== "all") q.set("city", params.city);
    const endpoint = `/api/admin/partner-services${q.toString() ? `?${q.toString()}` : ""}`;
    const res = await apiGetJson<PartnerServiceRow[]>(endpoint);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function togglePartnerServiceStatus(serviceId: string, action: "activate" | "suspend" | "disable" | "enable") {
  return await apiPatchJson<any>(`/api/admin/partner-services/${serviceId}/status`, { action });
}

export async function updatePartnerServiceRate(
  serviceId: string,
  payload: {
    price?: number;
    turnaroundHours?: number;
    minQuantity?: number;
    expressAvailable?: boolean;
    enabled?: boolean;
  },
) {
  return await apiPutJson<any>(`/api/admin/partner-services/${encodeURIComponent(serviceId)}`, payload);
}

export async function syncMasterServiceToPartners(
  serviceId: string,
  overridePrice: boolean = false,
): Promise<{ ok: boolean; masterServiceId: string; serviceName: string; totalPartners: number; created: number; updated: number }> {
  return await apiPostJson<{ ok: boolean; masterServiceId: string; serviceName: string; totalPartners: number; created: number; updated: number }>(
    `/api/admin/services/${encodeURIComponent(serviceId)}/sync-to-partners`,
    { overridePrice },
  );
}

export async function createService(payload: {
  name: string;
  category: string;
  price?: number;
  unit?: string;
  description?: string;
  image?: string;
}) {
  return await apiPostJson<BackendService>("/api/admin/services", {
    name: payload.name,
    categoryId: payload.category,
    price: payload.price || 0,
    unit: payload.unit || "kg",
    description: payload.description || "",
    image: payload.image || "",
    status: "Active",
  });
}

export async function updateService(
  id: string,
  payload: Partial<{ name: string; categoryId: string; price: number; unit: string; description: string; status: string; sla?: string }>,
) {
  return await apiPutJson<BackendService>(`/api/admin/services/${encodeURIComponent(id)}`, payload);
}

export async function deleteService(id: string): Promise<{ ok: boolean }> {
  return await apiDeleteJson<{ ok: boolean }>(`/api/admin/services/${encodeURIComponent(id)}`);
}

export async function createCategory(payload: { name: string; description?: string }) {
  return await apiPostJson<BackendCategory>("/api/admin/services/categories", payload);
}

export async function fetchPartnerApprovalRequests(status: string = "pending"): Promise<PartnerApprovalRequest[]> {
  const res = await apiGetJson<{ ok: boolean; count: number; requests: PartnerApprovalRequest[] }>(
    `/api/admin/partner-approvals?status=${encodeURIComponent(status)}`
  );
  return res?.requests || [];
}

export async function approvePartnerRequest(requestId: string): Promise<{ ok: boolean; message: string }> {
  return await apiPostJson<{ ok: boolean; message: string }>(
    `/api/admin/partner-approvals/${encodeURIComponent(requestId)}/approve`,
    {}
  );
}

export async function rejectPartnerRequest(requestId: string, reason: string): Promise<{ ok: boolean; message: string }> {
  return await apiPostJson<{ ok: boolean; message: string }>(
    `/api/admin/partner-approvals/${encodeURIComponent(requestId)}/reject`,
    { reason }
  );
}
