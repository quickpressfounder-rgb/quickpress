/** GET/POST /api/admin/partners/* — live partners & Partner 360 from the shared backend. */
import { apiGetJson, apiPostJson, apiPutJson } from "@/api/core/transport";

export type PartnerDashboardStats = {
  totalPartners: number;
  activePartners: number;
  pendingApproval: number;
  suspendedPartners: number;
  permanentlyBlocked: number;
  temporarilyDisabled: number;
  onlinePartners: number;
  offlinePartners: number;
  processingOrders: number;
  delayedOrders: number;
  newPartnersToday: number;
  newPartnersThisMonth: number;
  totalPartnerRevenue: number;
  totalPartnerEarnings: number;
  totalCommission: number;
  pendingPartnerPayout: number;
  completedSettlement: number;
  pendingSettlement: number;
  totalOrdersProcessed: number;
  totalOrdersCompleted: number;
  cancellationRate: number;
  averageProcessingTime: string;
  customerRating: number;
  complaintRate: number;
};

export type BackendPartnerItem = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  zone: string;
  serviceCategories: string[];
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  revenue: number;
  partnerEarnings: number;
  commission: number;
  rating: number;
  status: "ACTIVE" | "PENDING_APPROVAL" | "UNDER_REVIEW" | "TEMPORARILY_SUSPENDED" | "PERMANENTLY_BLOCKED" | "REJECTED" | "INACTIVE";
  kycStatus: "Verified" | "Pending" | "Rejected";
  joinedDate: string;
  lastActive: string;
  tags: string[];
  isOnline: boolean;
  resubmitted?: boolean;
  resubmittedAt?: string;
  resubmissionCount?: number;
  rejectionReason?: string;
};

export type BackendPartnerListPage = {
  items: BackendPartnerItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminPartner = BackendPartnerItem;

export type PartnerActivityItem = {
  id: string;
  category: "orders" | "store_status" | "finance" | "catalog" | "kyc" | "security" | string;
  event: string;
  title: string;
  description: string;
  actor: string;
  time: string;
  timestamp: string;
  tone?: "success" | "warning" | "danger" | "info" | "default";
  orderId?: string;
  orderCode?: string;
  metadata?: Record<string, any>;
};

export type Partner360Data = {
  header: {
    id: string;
    businessName: string;
    ownerName: string;
    phone: string;
    email: string;
    city: string;
    zone: string;
    status: string;
    kycStatus: string;
    rating: number;
    joinedDate: string;
    lastActive: string;
    tags: string[];
    activeOrdersCount: number;
    isOpen?: boolean;
    isLive?: boolean;
    operationalHours?: string;
    turnaroundHours?: number;
    deliveryRadiusKm?: number;
    resubmitted?: boolean;
    resubmittedAt?: string;
    resubmissionCount?: number;
    rejectionReason?: string;
  };
  overview: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    activeOrders: number;
    processingOrders: number;
    delayedOrders: number;
    revenue: number;
    grossRevenue: number;
    earnings: number;
    partnerEarnings: number;
    commission: number;
    commissionEarned: number;
    pendingPayout: number;
    aov: number;
    averageOrderValue: number;
    avgProcessingTime: string;
    rating: number;
    complaintRate: string;
    customerSatisfaction: string;
    lastOrder: string;
    lastActive: string;
  };
  orders: Array<{
    id: string;
    orderId?: string;
    customer: string;
    customerName?: string;
    services: string;
    itemsCount?: number;
    amount: number;
    totalAmount?: number;
    partnerEarnings: number;
    commission: number;
    rider: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  deliveries: {
    totalOrdersReceived: number;
    processedByPartner: number;
    processedCount?: number;
    pickedUpByRider: number;
    riderPickedUpCount?: number;
    deliveredByRider: number;
    deliveredCount?: number;
    readyOrders: number;
    outForDelivery: number;
    cancelled: number;
    delayed: number;
  };
  earnings: {
    grossAmount: number;
    commissionDeducted: number;
    netEarning: number;
    history?: Array<{
      id: string;
      orderCode: string;
      service: string;
      grossAmount: number;
      commission: number;
      partnerEarning: number;
      status: string;
      date: string;
    }>;
  };
  commission: {
    currentRate: number;
    activeRate?: number;
    tier?: string;
    hierarchy: string;
    history: Array<{ rate: string; reason: string; admin: string; date: string }>;
  };
  wallet: {
    balance?: number;
    currentBalance: number;
    pendingEarnings: number;
    availableBalance: number;
    paidAmount: number;
    totalPaidOut?: number;
    transactions: Array<{ id: string; type: string; amount: number; ref: string; date: string }>;
  };
  settlements: Array<{
    id: string;
    utr?: string;
    amount: number;
    ordersCount?: number;
    ordersIncluded: number;
    paymentReference: string;
    date: string;
    createdAt?: string;
    status: string;
  }>;
  incentives: {
    targetOrders?: number;
    currentOrders?: number;
    eligibleBonus?: string;
    status?: string;
    name?: string;
    target?: string;
    progress?: string;
    eligibleAmount?: string;
  };
  penalties: {
    totalPenalty?: number;
    lateRejectionCount?: number;
    slaBreachCount?: number;
    list?: Array<{
      id: string;
      reason: string;
      amount: string;
      status: string;
      date: string;
    }>;
  };
  services: Array<{
    name: string;
    enabled: boolean;
    orders: number;
    price: string;
  }>;
  pricing: Array<{
    service: string;
    defaultPrice: string;
    partnerPrice: string;
    override: string;
  }>;
  kyc: {
    status: string;
    gstin: string;
    pan: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    ownerVerified: boolean;
    resubmitted?: boolean;
    resubmittedAt?: string;
    resubmissionCount?: number;
    rejectionReason?: string;
  };
  documents: Array<{
    name?: string;
    type: string;
    number: string;
    status: string;
    date: string;
  }>;
  ratings: {
    score?: number;
    overall: number;
    totalReviews?: number;
    distribution: Record<string, number>;
    reviews: Array<{ customer: string; rating: number; comment: string; date: string }>;
  };
  complaints: {
    totalCount?: number;
    resolvedCount?: number;
    openCount?: number;
    list?: Array<{
      id: string;
      subject: string;
      priority: string;
      status: string;
      date: string;
    }>;
  };
  customers: {
    uniqueCount?: number;
    uniqueCustomers: number;
    repeatRate: string;
    retentionRate: string;
  };
  notifications: Array<{
    title: string;
    body: string;
    date: string;
    sentAt?: string;
    status: string;
  }>;
  activity: PartnerActivityItem[];
  activityLog?: Array<{
    action: string;
    timestamp: string;
    category?: string;
  }>;
  security: {
    lastLogin: string;
    lastActive?: string;
    deviceInfo?: string;
    ip?: string;
    activeSessions: number;
    device: string;
  };
  auditLogs: Array<{
    actor?: string;
    admin: string;
    action: string;
    details?: string;
    reason: string;
    timestamp?: string;
    at: string;
  }>;
  internalNotes: Array<{
    id: string;
    note: string;
    author: string;
    at: string;
  }>;
};

/** GET /api/admin/partners/stats */
export async function fetchPartnerStats(): Promise<PartnerDashboardStats> {
  return apiGetJson<PartnerDashboardStats>("/api/admin/partners/stats");
}

/** GET /api/admin/partners */
export async function fetchPartners(page = 1, pageSize = 100, q?: string, status?: string, city?: string): Promise<AdminPartner[]> {
  let url = `/api/admin/partners?page=${page}&pageSize=${pageSize}`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  if (status && status !== "all") url += `&status=${encodeURIComponent(status)}`;
  if (city && city !== "all") url += `&city=${encodeURIComponent(city)}`;

  const res = await apiGetJson<BackendPartnerListPage>(url);
  const items = res.items || [];

  return items.map((p) => {
    const rawCity = String(p.city || "Kasganj");
    const cleanCity = rawCity.toLowerCase().includes("bengaluru") || rawCity.toLowerCase().includes("bangalore") ? "Kasganj" : rawCity;
    const rawPhone = String(p.phone || "");
    const cleanPhone = rawPhone.includes("98765 43210") || rawPhone.includes("9876543210") ? "+91 92587 30561" : (rawPhone || "App Registered");
    let name = p.businessName || `Partner Store #${p.id.slice(0, 6).toUpperCase()}`;
    if (name === "QuickPress Partner Store") {
      name = `QuickPress Partner Store (${p.id.replace("PRT-", "")})`;
    }

    return {
      ...p,
      businessName: name,
      city: cleanCity,
      phone: cleanPhone,
      revenue: Number(p.revenue || 0),
      partnerEarnings: Number(p.partnerEarnings || 0),
      commission: Number(p.commission || 0),
      rating: Number(p.rating || 5.0),
    };
  });
}

/** GET /api/admin/partners/{id}/360 */
export async function fetchPartner360(id: string): Promise<Partner360Data> {
  const data = await apiGetJson<Partner360Data>(`/api/admin/partners/${encodeURIComponent(id)}/360`);
  if (!data || !data.header) return data;

  // Clean city from old Bengaluru seeds
  if (data.header.city?.toLowerCase().includes("bengaluru") || data.header.city?.toLowerCase().includes("bangalore")) {
    data.header.city = "Kasganj";
  }
  if (data.overview) {
    data.overview.grossRevenue = Number(data.overview.grossRevenue || data.overview.revenue || 0);
    data.overview.partnerEarnings = Number(data.overview.partnerEarnings || data.overview.earnings || 0);
    data.overview.commission = Number(data.overview.commission || data.overview.commissionEarned || 0);
  }

  // Clean dummy phone numbers
  if (data.header.phone?.includes("98765 43210") || data.header.phone?.includes("9876543210")) {
    data.header.phone = "+91 92587 30561";
  }

  // Filter out fake hardcoded reviews
  if (data.ratings && Array.isArray(data.ratings.reviews)) {
    data.ratings.reviews = data.ratings.reviews.filter((r) => r.customer !== "Ankit V.");
  }

  // Filter out fake hardcoded penalties
  if (data.penalties && Array.isArray(data.penalties.list)) {
    data.penalties.list = data.penalties.list.filter((p) => p.id !== "PEN-101");
  }

  // Filter out fake hardcoded settlements
  if (Array.isArray(data.settlements)) {
    data.settlements = data.settlements.filter((s) => s.id !== "SET-991823" && s.utr !== "BANK-UTR-99812401");
  }

  // Sanitize document numbers
  if (Array.isArray(data.documents)) {
    data.documents = data.documents.map((d) => {
      let num = d.number;
      if (num === "AAACQ1234F" || num === "09AAACQ1234F1Z9" || num === "UIDAI-EKYC-VERIFIED") {
        num = "Pending Verification";
      }
      return { ...d, number: num };
    });
  }

  return data;
}

/** POST /api/admin/partners/{id}/approve */
export async function approvePartner(id: string) {
  return apiPostJson<{ ok: boolean; status: string }>(`/api/admin/partners/${encodeURIComponent(id)}/approve`);
}

/** POST /api/admin/partners/{id}/suspend */
export async function suspendPartner(id: string, payload: { reason: string; startDate?: string; endDate?: string; internalNote?: string }) {
  return apiPostJson<{ ok: boolean; status: string; activeOrdersCount: number }>(`/api/admin/partners/${encodeURIComponent(id)}/suspend`, payload);
}

/** POST /api/admin/partners/{id}/block */
export async function blockPartner(id: string, payload: { reason: string; internalNote?: string }) {
  return apiPostJson<{ ok: boolean; status: string; activeOrdersCount: number }>(`/api/admin/partners/${encodeURIComponent(id)}/block`, payload);
}

/** POST /api/admin/partners/{id}/unblock */
export async function unblockPartner(id: string, reason = "Admin unblocked partner") {
  return apiPostJson<{ ok: boolean; status: string }>(`/api/admin/partners/${encodeURIComponent(id)}/unblock`, { reason });
}

/** POST /api/admin/partners/{id}/kyc */
export async function updatePartnerKyc(id: string, payload: { status: string; reason?: string }) {
  return apiPostJson<{ ok: boolean; kycStatus: string }>(`/api/admin/partners/${encodeURIComponent(id)}/kyc`, payload);
}

/** POST /api/admin/partners/{id}/reject */
export async function rejectPartner(id: string, payload?: { reason: string }) {
  return apiPostJson<{ ok: boolean; status: string }>(`/api/admin/partners/${encodeURIComponent(id)}/reject`, payload || {});
}

/** POST /api/admin/partners/{id}/commission */
export async function updatePartnerCommission(id: string, payload: { commissionRate: number; serviceRates?: Record<string, number> }) {
  return apiPostJson<{ ok: boolean; commissionRate: number }>(`/api/admin/partners/${encodeURIComponent(id)}/commission`, payload);
}

/** POST /api/admin/partners/{id}/wallet/adjust */
export async function adjustPartnerWallet(id: string, payload: { amount: number; type?: "credit" | "debit"; reason: string }) {
  return apiPostJson<{ ok: boolean; newBalance: number }>(`/api/admin/partners/${encodeURIComponent(id)}/wallet/adjust`, payload);
}

/** POST /api/admin/partners/{id}/notes */
export async function addPartnerNote(id: string, note: string) {
  return apiPostJson<{ id: string; note: string; author: string; at: string }>(`/api/admin/partners/${encodeURIComponent(id)}/notes`, { note });
}

/** POST /api/admin/partners/{id}/tags */
export async function updatePartnerTags(id: string, tags: string[]) {
  return apiPostJson<{ ok: boolean; tags: string[] }>(`/api/admin/partners/${encodeURIComponent(id)}/tags`, { tags });
}

/** POST /api/admin/partners/{id}/notify */
export async function sendPartnerNotification(id: string, payload: { title: string; body: string }) {
  return apiPostJson<{ ok: boolean; sent: boolean }>(`/api/admin/partners/${encodeURIComponent(id)}/notify`, payload);
}

export async function setPartnerStatus(id: string, action: "approve" | "reject" | "suspend" | "activate") {
  if (action === "suspend") {
    return suspendPartner(id, { reason: "Admin quick suspension action" });
  }
  if (action === "approve" || action === "activate") {
    return approvePartner(id);
  }
  return blockPartner(id, { reason: "Admin quick rejection action" });
}

/** POST /api/admin/partners */
export async function createPartner(payload: {
  businessName: string;
  ownerName: string;
  phone: string;
  email?: string;
  city: string;
  zone?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  commissionRate?: number;
}) {
  return apiPostJson<AdminPartner>("/api/admin/partners", payload);
}

export async function updatePartner(id: string, payload: Record<string, unknown>) {
  return apiPutJson<Record<string, unknown>>(`/api/admin/partners/${encodeURIComponent(id)}`, payload);
}

export async function fetchPartner(id: string) {
  return fetchPartner360(id);
}

/** GET /api/admin/partners/{id}/activities */
export async function fetchPartnerActivities(id: string, category?: string, limit = 50): Promise<PartnerActivityItem[]> {
  let url = `/api/admin/partners/${encodeURIComponent(id)}/activities?limit=${limit}`;
  if (category && category !== "all") url += `&category=${encodeURIComponent(category)}`;
  return apiGetJson<PartnerActivityItem[]>(url);
}

