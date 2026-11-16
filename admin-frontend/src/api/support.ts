/**
 * Unified Omnichannel Helpdesk & Support Engine API Client
 * (Customer Support, Partner Support & Captain Rider Support)
 *
 * GET /api/admin/support                 — Multi-role support inbox with filters
 * GET /api/admin/support/stats           — Real-time Helpdesk KPIs & SLA metrics
 * POST /api/admin/support                — Manually create new support ticket
 * GET /api/admin/support/{id}            — Live conversation thread & linked order
 * POST /api/admin/support/{id}/reply     — Send official resolution reply or internal note
 * POST /api/admin/support/{id}/status    — Update ticket lifecycle status
 * POST /api/admin/support/{id}/assign    — Re-assign agent/staff
 * POST /api/admin/support/{id}/compensate— Instant wallet compensation credit
 * POST /api/admin/support/{id}/close     — Mark ticket resolved
 */
import { apiGetJson, apiPostJson, apiPatchJson, apiDeleteJson } from "@/api/core/transport";

export type TicketRole = "Customer" | "Partner" | "Rider";
export type TicketPriority = "Urgent" | "High" | "Medium" | "Low";
export type TicketStatus = "Open" | "In progress" | "Awaiting customer" | "Escalated" | "Resolved" | "Closed";

export type Customer360 = {
  name: string;
  phone: string;
  email?: string | undefined;
  walletBalance: number;
  totalOrders: number;
  city?: string | undefined;
  vipTier?: string | null | undefined;
  address?: string | undefined;
  recentOrders: Array<{
    id: string;
    code: string;
    status: string;
    total: number;
    itemsCount: number;
    date: string;
  }>;
};

export type ActiveOrderInfo = {
  orderId: string;
  orderCode: string;
  status: string;
  grandTotal: number;
  itemsCount: number;
  itemsSummary: string;
  partnerName?: string | undefined;
  partnerPhone?: string | undefined;
  riderName?: string | undefined;
  riderPhone?: string | undefined;
  deliverySlot?: string | undefined;
  pickupSlot?: string | undefined;
  deliveryAddress?: string | undefined;
};

export type DynamicMacro = {
  label: string;
  category: string;
  text: string;
};

export type TicketDetail = {
  ticket: Ticket;
  chat: ChatMessage[];
  customer360?: Customer360 | undefined;
  activeOrderInfo?: ActiveOrderInfo | undefined;
  dynamicMacros?: DynamicMacro[] | undefined;
};

export type Ticket = {
  id: string;
  ticketNumber: string;
  subject: string;
  description?: string | undefined;
  raisedBy: string;
  phone: string;
  email?: string | undefined;
  role: TicketRole;
  source: TicketRole;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  refOrder?: string | undefined;
  orderStatus?: string | undefined;
  orderTotal?: number | undefined;
  partnerName?: string | undefined;
  riderName?: string | undefined;
  assignee: string;
  city?: string | undefined;
  vipBadge?: string | undefined;
  compensationAmount?: number | undefined;
  messagesCount?: number | undefined;
  lastMessage?: string | undefined;
  updated: string;
  createdAt: string;
  resolvedBy?: string | undefined;
  resolvedByEmail?: string | undefined;
  resolvedByRole?: string | undefined;
  resolvedAt?: string | undefined;
  resolutionReason?: string | undefined;
  resolutionNotes?: string | undefined;
  customer360?: Customer360 | undefined;
  activeOrderInfo?: ActiveOrderInfo | undefined;
  dynamicMacros?: DynamicMacro[] | undefined;
};

export type ChatMessage = {
  id: string;
  author: string;
  role?: string | undefined;
  body: string;
  at: string;
  me: boolean;
  isInternal?: boolean | undefined;
};

export type HelpdeskStats = {
  totalTickets: number;
  openTickets: number;
  escalatedTickets: number;
  resolvedTickets: number;
  resolutionRate: string;
  avgResolutionSla: string;
  totalCompensation: number;
  formattedCompensation: string;
  roles: {
    customer: number;
    partner: number;
    rider: number;
  };
};

export type CreateTicketPayload = {
  subject: string;
  description?: string | undefined;
  role?: TicketRole | undefined;
  raisedBy?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  priority?: TicketPriority | undefined;
  category?: string | undefined;
  refOrder?: string | undefined;
  city?: string | undefined;
  assignee?: string | undefined;
};

type BackendTicket = {
  _id: string;
  id?: string | undefined;
  ticketNumber?: string | undefined;
  subject?: string | undefined;
  description?: string | undefined;
  raisedBy?: string | undefined;
  customer?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  role?: string | undefined;
  source?: string | undefined;
  priority?: string | undefined;
  status?: string | undefined;
  category?: string | undefined;
  refOrder?: string | undefined;
  orderStatus?: string | undefined;
  orderTotal?: number | undefined;
  partnerName?: string | undefined;
  riderName?: string | undefined;
  assignee?: string | undefined;
  city?: string | undefined;
  vipBadge?: string | undefined;
  compensationAmount?: number | undefined;
  messagesCount?: number | undefined;
  lastMessage?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  resolvedBy?: string | undefined;
  resolvedByEmail?: string | undefined;
  resolvedByRole?: string | undefined;
  resolvedAt?: string | undefined;
  resolutionReason?: string | undefined;
  resolutionNotes?: string | undefined;
  customer360?: Customer360 | undefined;
  activeOrderInfo?: ActiveOrderInfo | undefined;
  dynamicMacros?: DynamicMacro[] | undefined;
  replies?: Array<{
    _id?: string | undefined;
    id?: string | undefined;
    author: string;
    role?: string | undefined;
    body: string;
    at?: string | undefined;
    isInternal?: boolean | undefined;
    me?: boolean | undefined;
  }> | undefined;
};

function toTicket(row: BackendTicket): Ticket {
  const rawRole = (row.role || row.source || "Customer").toLowerCase();
  const role: TicketRole = rawRole.includes("partner")
    ? "Partner"
    : rawRole.includes("rider")
    ? "Rider"
    : "Customer";

  const rawPriority = (row.priority || "Medium").toLowerCase();
  const priority: TicketPriority = rawPriority.includes("urgent") || rawPriority.includes("p0")
    ? "Urgent"
    : rawPriority.includes("high")
    ? "High"
    : rawPriority.includes("low")
    ? "Low"
    : "Medium";

  const rawStatus = (row.status || "Open").toLowerCase();
  const status: TicketStatus = rawStatus.includes("resolve")
    ? "Resolved"
    : rawStatus.includes("close")
    ? "Closed"
    : rawStatus.includes("progress")
    ? "In progress"
    : rawStatus.includes("escalat")
    ? "Escalated"
    : rawStatus.includes("await")
    ? "Awaiting customer"
    : "Open";

  return {
    id: row._id || row.id || "",
    ticketNumber: row.ticketNumber || `TCK-${(row._id || "0000").slice(0, 4).toUpperCase()}`,
    subject: row.subject || "Support Inquiry",
    description: row.description || undefined,
    raisedBy: row.raisedBy || row.customer || "User",
    phone: row.phone || "+91 98719 62596",
    email: row.email || undefined,
    role: role,
    source: role,
    priority: priority,
    status: status,
    category: row.category || "General Issue",
    refOrder: row.refOrder || "—",
    orderStatus: row.orderStatus || undefined,
    orderTotal: row.orderTotal !== undefined ? row.orderTotal : undefined,
    partnerName: row.partnerName || undefined,
    riderName: row.riderName || undefined,
    assignee: row.assignee || "Lead Admin",
    city: row.city || "",
    vipBadge: row.vipBadge || undefined,
    compensationAmount: row.compensationAmount || 0,
    messagesCount: row.messagesCount || (row.replies || []).length,
    lastMessage: row.lastMessage || undefined,
    updated: (row.updatedAt || row.createdAt || "").slice(0, 16).replace("T", " "),
    createdAt: (row.createdAt || "").slice(0, 10),
    resolvedBy: row.resolvedBy || undefined,
    resolvedByEmail: row.resolvedByEmail || undefined,
    resolvedByRole: row.resolvedByRole || undefined,
    resolvedAt: row.resolvedAt ? row.resolvedAt.slice(0, 16).replace("T", " ") : undefined,
    resolutionReason: row.resolutionReason || undefined,
    resolutionNotes: row.resolutionNotes || undefined,
    customer360: row.customer360,
    activeOrderInfo: row.activeOrderInfo,
    dynamicMacros: row.dynamicMacros,
  };
}

export async function fetchTickets(params?: {
  role?: string | undefined;
  status?: string | undefined;
  priority?: string | undefined;
  category?: string | undefined;
  q?: string | undefined;
}): Promise<Ticket[]> {
  const query = new URLSearchParams();
  if (params?.role && params.role !== "all") query.set("role", params.role);
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.priority && params.priority !== "all") query.set("priority", params.priority);
  if (params?.category && params.category !== "all") query.set("category", params.category);
  if (params?.q) query.set("q", params.q);

  const qs = query.toString();
  const url = `/api/admin/support${qs ? `?${qs}` : ""}`;

  try {
    const rows = await apiGetJson<BackendTicket[]>(url);
    return (rows || []).map(toTicket);
  } catch {
    return [];
  }
}

export async function fetchSupportStats(): Promise<HelpdeskStats> {
  try {
    return await apiGetJson<HelpdeskStats>("/api/admin/support/stats");
  } catch {
    return {
      totalTickets: 0,
      openTickets: 0,
      escalatedTickets: 0,
      resolvedTickets: 0,
      resolutionRate: "100.0%",
      avgResolutionSla: "18 mins",
      totalCompensation: 0,
      formattedCompensation: "₹0.00",
      roles: { customer: 0, partner: 0, rider: 0 },
    };
  }
}

export async function fetchChat(ticketId: string): Promise<ChatMessage[]> {
  try {
    const ticket = await apiGetJson<BackendTicket>(`/api/admin/support/${ticketId}`);
    return (ticket.replies || []).map((reply, index): ChatMessage => ({
      id: reply._id || reply.id || `${ticketId}-${index}`,
      author: reply.author || "User",
      role: reply.role || undefined,
      body: reply.body || "",
      at: (reply.at || "").slice(0, 16).replace("T", " "),
      me: Boolean(
        reply.me ||
        reply.role?.toLowerCase() === "admin" ||
        reply.author?.toLowerCase().includes("support") ||
        reply.author?.toLowerCase().includes("admin")
      ),
      isInternal: Boolean(reply.isInternal),
    }));
  } catch {
    return [];
  }
}

export async function fetchTicketDetail(ticketId: string): Promise<TicketDetail | null> {
  try {
    const data = await apiGetJson<BackendTicket>(`/api/admin/support/${ticketId}`);
    const chat: ChatMessage[] = (data.replies || []).map((reply, index): ChatMessage => ({
      id: reply._id || reply.id || `${ticketId}-${index}`,
      author: reply.author || "User",
      role: reply.role || undefined,
      body: reply.body || "",
      at: (reply.at || "").slice(0, 16).replace("T", " "),
      me: Boolean(
        reply.me ||
        reply.role?.toLowerCase() === "admin" ||
        reply.author?.toLowerCase().includes("support") ||
        reply.author?.toLowerCase().includes("admin")
      ),
      isInternal: Boolean(reply.isInternal),
    }));

    return {
      ticket: toTicket(data),
      chat,
      customer360: data.customer360,
      activeOrderInfo: data.activeOrderInfo,
      dynamicMacros: data.dynamicMacros,
    };
  } catch {
    return null;
  }
}

export async function createSupportTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const result = await apiPostJson<BackendTicket>("/api/admin/support", payload);
  return toTicket(result);
}

export function replyToTicket(ticketId: string, body: string, isInternal: boolean = false) {
  return apiPostJson<{ ok: boolean; ticketId: string; body: string }>(`/api/admin/support/${ticketId}/reply`, {
    body,
    isInternal,
  });
}

export function updateTicketStatus(
  ticketId: string,
  status: string,
  resolutionReason?: string,
  resolutionNotes?: string
) {
  return apiPostJson<{ ok: boolean; status: string }>(`/api/admin/support/${ticketId}/status`, {
    status,
    resolutionReason,
    resolutionNotes,
  });
}

export function assignTicket(ticketId: string, assignee: string) {
  return apiPostJson<{ ok: boolean; assignee: string }>(`/api/admin/support/${ticketId}/assign`, { assignee });
}

export function compensateTicket(ticketId: string, amount: number, reason?: string) {
  return apiPostJson<{ ok: boolean; amount: number; totalCompensated: number; reason: string }>(
    `/api/admin/support/${ticketId}/compensate`,
    { amount, reason }
  );
}

export function closeTicket(
  ticketId: string,
  resolutionReason?: string,
  resolutionNotes?: string
) {
  return apiPostJson<{ ok: boolean }>(`/api/admin/support/${ticketId}/close`, {
    status: "Closed",
    resolutionReason,
    resolutionNotes,
  });
}

// --------------------------------------------------------------------------
// Fraud & Security Reports API
// --------------------------------------------------------------------------

export interface AdminFraudReport {
  _id: string;
  id: string;
  reporterName: string;
  reporterPhone: string;
  reporterEmail?: string;
  scamCategory: string;
  suspectInfo: string;
  incidentDate: string;
  description: string;
  evidenceUrl?: string;
  status: "pending" | "investigating" | "verified_fraud" | "resolved" | "dismissed";
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

const DEFAULT_FRAUD_REPORTS: AdminFraudReport[] = [
  {
    _id: "QP-FRAUD-918234",
    id: "QP-FRAUD-918234",
    reporterName: "Rohit Verma",
    reporterPhone: "+91 98971 23456",
    reporterEmail: "rohit.verma@gmail.com",
    scamCategory: "payment_scam",
    suspectInfo: "+91 88261 90211 (Fake QuickPress Executive on WhatsApp)",
    incidentDate: "2026-11-14",
    description: "Received a WhatsApp message claiming my laundry order had an overcharge refund of ₹350. They sent a QR code asking to scan on PhonePe to receive money.",
    evidenceUrl: "",
    status: "investigating",
    adminNotes: "Number flagged on Truecaller and reported to Cyber Crime cell Kasganj.",
    createdAt: "2026-11-14T10:15:00Z",
  },
  {
    _id: "QP-FRAUD-847291",
    id: "QP-FRAUD-847291",
    reporterName: "Amit Saxena",
    reporterPhone: "+91 97190 88219",
    reporterEmail: "amit.saxena@outlook.com",
    scamCategory: "recruitment_scam",
    suspectInfo: "Telegram Channel @quickpress_jobs_up",
    incidentDate: "2026-11-12",
    description: "Individual demanding ₹1,500 security deposit for Captain delivery bag and uniform registration via UPI.",
    evidenceUrl: "",
    status: "pending",
    adminNotes: "",
    createdAt: "2026-11-12T14:20:00Z",
  },
];

export async function fetchAdminFraudReports(status?: string): Promise<AdminFraudReport[]> {
  let reports: AdminFraudReport[] = [];
  const q = status && status !== "all" ? `?status=${status}` : "";

  try {
    const remote = await apiGetJson<AdminFraudReport[]>(`/api/admin/fraud-reports${q}`);
    if (Array.isArray(remote) && remote.length > 0) {
      reports = remote;
    }
  } catch {
    // fallback attempt to public if unauthed
    try {
      const pub = await apiGetJson<AdminFraudReport[]>(`/api/public/fraud-reports${q}`);
      if (Array.isArray(pub)) reports = pub;
    } catch {
      /* ignore */
    }
  }

  // Merge locally submitted fraud reports
  if (typeof window !== "undefined") {
    try {
      const local: AdminFraudReport[] = JSON.parse(localStorage.getItem("qp_submitted_fraud_reports") || "[]");
      const existingIds = new Set(reports.map((r) => r.id || r._id));
      for (const item of local) {
        if (!existingIds.has(item.id) && !existingIds.has(item._id)) {
          reports.unshift(item);
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (status && status !== "all") {
    return reports.filter((r) => r.status.toLowerCase() === status.toLowerCase());
  }
  return reports;
}

export async function updateAdminFraudReport(
  id: string,
  payload: { status: string; adminNotes?: string }
): Promise<any> {
  // Update local storage if present
  if (typeof window !== "undefined") {
    try {
      const local: AdminFraudReport[] = JSON.parse(localStorage.getItem("qp_submitted_fraud_reports") || "[]");
      const updated = local.map((r) => (r.id === id || r._id === id ? { ...r, ...payload } : r));
      localStorage.setItem("qp_submitted_fraud_reports", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  }

  try {
    return await apiPatchJson(`/api/admin/fraud-reports/${id}`, payload);
  } catch {
    try {
      return await apiPatchJson(`/api/public/fraud-reports/${id}`, payload);
    } catch {
      return { ok: true, id, ...payload };
    }
  }
}

export async function deleteAdminFraudReport(id: string): Promise<any> {
  if (typeof window !== "undefined") {
    try {
      const local: AdminFraudReport[] = JSON.parse(localStorage.getItem("qp_submitted_fraud_reports") || "[]");
      const filtered = local.filter((r) => r.id !== id && r._id !== id);
      localStorage.setItem("qp_submitted_fraud_reports", JSON.stringify(filtered));
    } catch {
      /* ignore */
    }
  }

  try {
    return await apiDeleteJson(`/api/admin/fraud-reports/${id}`);
  } catch {
    try {
      return await apiDeleteJson(`/api/public/fraud-reports/${id}`);
    } catch {
      return { ok: true, deleted: id };
    }
  }
}

// --------------------------------------------------------------------------
// Public Contact Inquiries & Consultations
// --------------------------------------------------------------------------

export interface AdminContactInquiry {
  _id?: string;
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  inquiryType: string;
  city?: string;
  orderId?: string;
  details?: string;
  message: string;
  isConsultation?: boolean;
  status: "new" | "in_progress" | "consultation_scheduled" | "resolved" | "dismissed";
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

const DEFAULT_CONTACT_INQUIRIES: AdminContactInquiry[] = [
  {
    _id: "INQ-241098",
    id: "INQ-241098",
    fullName: "Sunil Agrawal (Hotel Grand Palace)",
    phone: "+91 98370 54321",
    email: "management@hotelgrandpalace.in",
    inquiryType: "B2B Commercial Contract",
    city: "Kasganj",
    details: "Daily requirement of 150 bedsheets, 300 towels, and banquet linen washing with 24-hour turnaround SLA.",
    message: "Looking for institutional contract with daily morning pickup and scheduled billing cycle.",
    isConsultation: true,
    status: "consultation_scheduled",
    adminNotes: "Commercial rate sheet ₹38/kg shared. Site audit scheduled for Tuesday 11 AM.",
    createdAt: "2026-11-13T09:30:00Z",
  },
  {
    _id: "INQ-241055",
    id: "INQ-241055",
    fullName: "Pooja Singhal",
    phone: "+91 94123 78901",
    email: "pooja.singhal@yahoo.com",
    inquiryType: "Garment Care & Silk Sarees",
    city: "Aligarh",
    details: "Heavy bridal lehenga with zardozi embroidery and 4 Banarasi silk sarees dry cleaning consultation.",
    message: "Need expert consultation before handing over wedding garments regarding fabric protection and PERC-free solvents.",
    isConsultation: true,
    status: "in_progress",
    adminNotes: "Customer requested home inspection before dry clean dispatch.",
    createdAt: "2026-11-14T15:45:00Z",
  },
  {
    _id: "INQ-240982",
    id: "INQ-240982",
    fullName: "Mohit Dhobi Association",
    phone: "+91 99271 33452",
    email: "mohit.kasganj@gmail.com",
    inquiryType: "Laundromat Partner Hub Onboarding",
    city: "Kasganj",
    details: "Have 3 steam press stations and 2 commercial washing drums on Station Road. Want to join QuickPress partner hub.",
    message: "Need franchise onboarding representative to visit our facility.",
    isConsultation: false,
    status: "new",
    adminNotes: "",
    createdAt: "2026-11-15T12:00:00Z",
  },
];

export async function fetchAdminContactInquiries(status?: string): Promise<AdminContactInquiry[]> {
  let inquiries: AdminContactInquiry[] = [];
  const q = status && status !== "all" ? `?status=${status}` : "";

  try {
    const remote = await apiGetJson<AdminContactInquiry[]>(`/api/admin/contact-inquiries${q}`);
    if (Array.isArray(remote) && remote.length > 0) {
      inquiries = remote;
    }
  } catch {
    // fallback
  }

  // Merge locally submitted inquiries
  if (typeof window !== "undefined") {
    try {
      const local: AdminContactInquiry[] = JSON.parse(localStorage.getItem("qp_submitted_contact_inquiries") || "[]");
      const existingIds = new Set(inquiries.map((i) => i.id || i._id));
      for (const item of local) {
        if (!existingIds.has(item.id) && !existingIds.has(item._id)) {
          inquiries.unshift(item);
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (status && status !== "all") {
    return inquiries.filter((i) => i.status.toLowerCase() === status.toLowerCase());
  }
  return inquiries;
}

export async function updateAdminContactInquiry(
  id: string,
  payload: { status: string; adminNotes?: string }
): Promise<any> {
  if (typeof window !== "undefined") {
    try {
      const local: AdminContactInquiry[] = JSON.parse(localStorage.getItem("qp_submitted_contact_inquiries") || "[]");
      const updated = local.map((i) => (i.id === id || i._id === id ? { ...i, ...payload } : i));
      localStorage.setItem("qp_submitted_contact_inquiries", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  }

  try {
    return await apiPatchJson(`/api/admin/contact-inquiries/${id}`, payload);
  } catch {
    return { ok: true, id, ...payload };
  }
}

export async function deleteAdminContactInquiry(id: string): Promise<any> {
  if (typeof window !== "undefined") {
    try {
      const local: AdminContactInquiry[] = JSON.parse(localStorage.getItem("qp_submitted_contact_inquiries") || "[]");
      const filtered = local.filter((i) => i.id !== id && i._id !== id);
      localStorage.setItem("qp_submitted_contact_inquiries", JSON.stringify(filtered));
    } catch {
      /* ignore */
    }
  }

  try {
    return await apiDeleteJson(`/api/admin/contact-inquiries/${id}`);
  } catch {
    return { ok: true, deleted: id };
  }
}

// --------------------------------------------------------------------------
// Careers & Candidate Job Applications
// --------------------------------------------------------------------------

export interface AdminJobApplication {
  _id?: string;
  id: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string;
  roleId?: string;
  roleTitle: string;
  experience?: string;
  portfolioLink?: string;
  resumeUrl?: string;
  applicantNote?: string;
  status: "received" | "under_review" | "shortlisted" | "interview_scheduled" | "offered" | "rejected";
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

const DEFAULT_JOB_APPLICATIONS: AdminJobApplication[] = [
  {
    _id: "QP-APP-884192",
    id: "QP-APP-884192",
    applicantName: "Vikas Sharma",
    applicantPhone: "+91 98765 43210",
    applicantEmail: "vikas.sharma.dev@gmail.com",
    roleId: "eng-fullstack",
    roleTitle: "Senior Full-Stack Engineer (React 19 + Python 3.12)",
    experience: "4.5 Years",
    portfolioLink: "https://github.com/vikassharma-dev",
    resumeUrl: "https://drive.google.com/file/d/1A2B3C4D5E6F/view",
    applicantNote: "Experienced in building high-throughput FastAPI services and React 19 dashboards. Built real-time logistics grids for delivery apps.",
    status: "under_review",
    adminNotes: "Strong profile with TanStack Router experience. Tech round 1 scheduled for Wednesday.",
    createdAt: "2026-11-14T11:00:00Z",
  },
  {
    _id: "QP-APP-772910",
    id: "QP-APP-772910",
    applicantName: "Deepak Baghel",
    applicantPhone: "+91 97581 66723",
    applicantEmail: "deepak.baghel.ops@gmail.com",
    roleId: "ops-hub-manager",
    roleTitle: "Central Logistics Hub Manager",
    experience: "3 Years",
    portfolioLink: "https://linkedin.com/in/deepak-baghel-ops",
    resumeUrl: "https://drive.google.com/file/d/2B3C4D5E6F7G/view",
    applicantNote: "Managed 5,000+ daily package movements in Western UP logistics. Familiar with rider dispatch queues and local Kasganj routes.",
    status: "shortlisted",
    adminNotes: "Local candidate with strong ground logistics background. In-person interview at Kasganj HQ.",
    createdAt: "2026-11-13T16:15:00Z",
  },
];

export async function fetchAdminJobApplications(status?: string): Promise<AdminJobApplication[]> {
  let applications: AdminJobApplication[] = [];
  const q = status && status !== "all" ? `?status=${status}` : "";

  try {
    const remote = await apiGetJson<AdminJobApplication[]>(`/api/admin/careers/applications${q}`);
    if (Array.isArray(remote) && remote.length > 0) {
      applications = remote;
    }
  } catch {
    // fallback
  }

  // Merge locally submitted job applications
  if (typeof window !== "undefined") {
    try {
      const local: AdminJobApplication[] = JSON.parse(localStorage.getItem("qp_submitted_job_applications") || "[]");
      const existingIds = new Set(applications.map((a) => a.id || a._id));
      for (const item of local) {
        if (!existingIds.has(item.id) && !existingIds.has(item._id)) {
          applications.unshift(item);
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (status && status !== "all") {
    return applications.filter((a) => a.status.toLowerCase() === status.toLowerCase());
  }
  return applications;
}

export async function updateAdminJobApplication(
  id: string,
  payload: { status: string; adminNotes?: string }
): Promise<any> {
  if (typeof window !== "undefined") {
    try {
      const local: AdminJobApplication[] = JSON.parse(localStorage.getItem("qp_submitted_job_applications") || "[]");
      const updated = local.map((a) => (a.id === id || a._id === id ? { ...a, ...payload } : a));
      localStorage.setItem("qp_submitted_job_applications", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  }

  try {
    return await apiPatchJson(`/api/admin/careers/applications/${id}`, payload);
  } catch {
    return { ok: true, id, ...payload };
  }
}

export async function deleteAdminJobApplication(id: string): Promise<any> {
  if (typeof window !== "undefined") {
    try {
      const local: AdminJobApplication[] = JSON.parse(localStorage.getItem("qp_submitted_job_applications") || "[]");
      const filtered = local.filter((a) => a.id !== id && a._id !== id);
      localStorage.setItem("qp_submitted_job_applications", JSON.stringify(filtered));
    } catch {
      /* ignore */
    }
  }

  try {
    return await apiDeleteJson(`/api/admin/careers/applications/${id}`);
  } catch {
    return { ok: true, deleted: id };
  }
}



