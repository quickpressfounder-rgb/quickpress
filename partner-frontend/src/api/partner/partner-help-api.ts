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

const STORAGE_KEY = "qp_partner_support_tickets_v1";

const DEFAULT_TICKETS: SupportTicket[] = [
  {
    id: "TKT-8412",
    category: "order_issue",
    categoryLabel: "Order Issue",
    orderId: "ord-4040",
    orderCode: "PRT-4040",
    subject: "Customer requested evening delivery slot rescheduling",
    description: "Customer Himanshu Pal requested delivery between 6-7 PM instead of afternoon slot.",
    status: "resolved",
    priority: "normal",
    createdAt: "2026-10-23T15:10:00Z",
    updatedAt: "2026-10-23T15:35:00Z",
    supportReply: "Updated delivery slot window in Captain routing. Captain will deliver at 06:15 PM.",
    supportRepliedAt: "2026-10-23T15:35:00Z",
  },
  {
    id: "TKT-8290",
    category: "payout_finance",
    categoryLabel: "Payout & Finance",
    orderCode: "PRT-3788",
    subject: "Bank IFSC verification for daily auto-settlement",
    description: "Updated HDFC current account details for automated daily morning payouts.",
    status: "resolved",
    priority: "normal",
    createdAt: "2026-10-20T11:00:00Z",
    updatedAt: "2026-10-20T13:20:00Z",
    supportReply: "Bank penny-drop verification succeeded. Tomorrow's auto-payout is routed to new account.",
    supportRepliedAt: "2026-10-20T13:20:00Z",
  },
];

function loadLocalTickets(): SupportTicket[] {
  if (typeof window === "undefined") return DEFAULT_TICKETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TICKETS));
      return DEFAULT_TICKETS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TICKETS;
  } catch {
    return DEFAULT_TICKETS;
  }
}

function saveLocalTickets(tickets: SupportTicket[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.error("Failed to save local support tickets", err);
  }
}

export async function fetchPartnerTickets(): Promise<SupportTicket[]> {
  try {
    const remote = await apiGetJson<SupportTicket[]>("/api/partner/tickets");
    if (Array.isArray(remote) && remote.length > 0) {
      saveLocalTickets(remote);
      return remote;
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

  const newTicket: SupportTicket = {
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
    supportReply: "Ticket received. Fleet Ops & Merchant Support team will contact you within 5 minutes.",
    supportRepliedAt: now,
  };

  const nextList = [newTicket, ...current];
  saveLocalTickets(nextList);

  try {
    await apiPostJson("/api/partner/tickets", newTicket);
  } catch {
    // Local ticket is active
  }

  return newTicket;
}
