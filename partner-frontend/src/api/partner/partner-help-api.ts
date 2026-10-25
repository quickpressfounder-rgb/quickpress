import { apiGetJson, apiPostJson } from "../core/transport";

export type TicketCategory =
  | "order_issue"
  | "payout_finance"
  | "delivery_captain"
  | "garment_damage"
  | "store_operations"
  | "other";

export type TicketStatus = "open" | "in_review" | "resolved";

export type TicketPriority = "normal" | "high" | "urgent";

export interface SupportTicket {
  id: string; // e.g. "TKT-8412"
  partnerId?: string;
  category: TicketCategory;
  categoryLabel: string;
  orderId?: string;
  orderCode?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  supportReply?: string;
  supportRepliedAt?: string;
}

export interface OrderHelpTopic {
  id: string;
  title: string;
  shortDesc: string;
  suggestedAction: string;
  defaultPriority: TicketPriority;
}

export const ORDER_HELP_TOPICS: OrderHelpTopic[] = [
  {
    id: "customer_unreachable",
    title: "Customer Not Reachable at Doorstep",
    shortDesc: "Delivery captain or store is unable to contact the customer for pickup/delivery handoff.",
    suggestedAction: "Wait 10 minutes at location. Attempt call via secure relay. If unanswered, Captain returns items safely to store.",
    defaultPriority: "high",
  },
  {
    id: "captain_delayed",
    title: "Delivery Captain Delayed / Did Not Arrive",
    shortDesc: "Pickup or delivery captain breached SLA or vehicle broke down en route.",
    suggestedAction: "Logistics auto-reassigns to nearest secondary captain. Check live GPS or request priority reassignment.",
    defaultPriority: "urgent",
  },
  {
    id: "item_discrepancy",
    title: "Garment Count / Item Discrepancy",
    shortDesc: "Actual clothes in bag mismatch with booked item checklist or customer claimed missing piece.",
    suggestedAction: "Pause washing immediately. Photograph bag contents and upload count verification for dispute mediation.",
    defaultPriority: "high",
  },
  {
    id: "damage_stain",
    title: "Pre-existing Stain / Fragile Fabric Warning",
    shortDesc: "Garment has pre-existing tear, color bleed risk, or tough chemical stain before cleaning.",
    suggestedAction: "Flag garment with customer before washing to avoid damage claim. Requires customer consent via chat/call.",
    defaultPriority: "normal",
  },
  {
    id: "payout_query",
    title: "Order Settlement or Payout Discrepancy",
    shortDesc: "Net payment credit differs from order calculation or COD cash collected discrepancy.",
    suggestedAction: "Verify net payout ledger. Finance team audits reconciliation within 24 hours.",
    defaultPriority: "normal",
  },
];

const STORAGE_KEY = "qp_partner_support_tickets_v2";

function loadLocalTickets(): SupportTicket[] {
  if (typeof window === "undefined") return [];
  try {
    // Purge legacy mock data
    localStorage.removeItem("qp_partner_support_tickets_v1");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t) => t.id !== "TKT-8412" && t.id !== "TKT-8290");
    }
    return [];
  } catch {
    return [];
  }
}

function saveLocalTickets(tickets: SupportTicket[]): void {
  if (typeof window === "undefined") return;
  try {
    const clean = (tickets || []).filter((t) => t.id !== "TKT-8412" && t.id !== "TKT-8290");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (err) {
    console.error("Failed to save local support tickets", err);
  }
}

export async function fetchPartnerTickets(): Promise<SupportTicket[]> {
  try {
    const remote = await apiGetJson<SupportTicket[]>("/api/partner/tickets");
    if (Array.isArray(remote)) {
      const clean = remote.filter((t) => t.id !== "TKT-8412" && t.id !== "TKT-8290");
      saveLocalTickets(clean);
      return clean;
    }
  } catch {
    // Fallback to local tickets
  }
  return loadLocalTickets();
}

export async function createPartnerTicket(payload: {
  category: TicketCategory;
  categoryLabel: string;
  orderCode?: string;
  orderId?: string;
  subject: string;
  description: string;
  priority: TicketPriority;
}): Promise<SupportTicket> {
  const current = loadLocalTickets();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  let ticketToSave: SupportTicket = {
    id: `TKT-${randomSuffix}`,
    category: payload.category,
    categoryLabel: payload.categoryLabel,
    orderCode: payload.orderCode || undefined,
    orderId: payload.orderId || undefined,
    subject: payload.subject.trim(),
    description: payload.description.trim(),
    status: "open",
    priority: payload.priority,
    createdAt: now,
    updatedAt: now,
    supportReply: "Ticket registered. QuickPress Partner Support team is reviewing your query.",
    supportRepliedAt: now,
  };

  try {
    const res = await apiPostJson<{ ok: boolean; ticket: SupportTicket }>("/api/partner/tickets", ticketToSave);
    if (res?.ticket && res.ticket.id) {
      ticketToSave = res.ticket;
    }
  } catch (err) {
    console.warn("Backend ticket sync warning (saved locally):", err);
  }

  const nextList = [ticketToSave, ...current.filter((t) => t.id !== ticketToSave.id)];
  saveLocalTickets(nextList);

  return ticketToSave;
}
