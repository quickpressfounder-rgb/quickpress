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
import { apiGetJson, apiPostJson } from "@/api/core/transport";

export type TicketRole = "Customer" | "Partner" | "Rider";
export type TicketPriority = "Urgent" | "High" | "Medium" | "Low";
export type TicketStatus = "Open" | "In progress" | "Awaiting customer" | "Escalated" | "Resolved" | "Closed";

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

export function updateTicketStatus(ticketId: string, status: string) {
  return apiPostJson<{ ok: boolean; status: string }>(`/api/admin/support/${ticketId}/status`, { status });
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

export function closeTicket(ticketId: string) {
  return apiPostJson<{ ok: boolean }>(`/api/admin/support/${ticketId}/close`, {});
}
