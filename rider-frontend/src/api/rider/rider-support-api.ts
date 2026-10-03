import { apiGetJson, apiPostJson } from "../core/transport";

export const CAPTAIN_HELPLINE_PHONE = "1800 012 3456";
export const CAPTAIN_SUPPORT_EMAIL = "support@quickpress.app";
export const CAPTAIN_SUPPORT_EMAIL_OFFICIAL = "official.quickpress@gmail.com";
export const CAPTAIN_EMERGENCY_SOS = "112";

export interface CaptainSlideItem {
  id: number;
  badge: string;
  title: string;
  subtitle: string;
  highlight: string;
  color: string;
}

export interface CaptainGuidelineItem {
  title: string;
  desc: string;
}

export interface CaptainGuidelinesResponse {
  ok: boolean;
  platformName: string;
  slides: CaptainSlideItem[];
  guidelines: CaptainGuidelineItem[];
}

export interface CaptainSupportResponse {
  ok: boolean;
  helplinePhone: string;
  supportEmail: string;
  whatsappUrl: string;
  emergencySosNumber: string;
  workingHours: string;
  hubAddress: string;
}

export interface PublicLegalDoc {
  slug: string;
  title: string;
  currentVersion: string;
  effectiveDate: string;
  summary: string;
  content: string;
  publishedAt?: string;
  publishedBy?: string;
}

export type TicketCategory =
  | "order"
  | "trip"
  | "payment"
  | "wallet"
  | "store-partner"
  | "customer-issue"
  | "vehicle-kyc"
  | "app-glitch"
  | "general";

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  author: "customer" | "support" | "system" | "rider";
  authorName: string;
  body: string;
  attachmentName?: string | null;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  category: TicketCategory | string;
  categoryLabel?: string;
  subject: string;
  description: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status: "open" | "in-progress" | "awaiting-customer" | "resolved" | "closed";
  orderId?: string | null;
  orderNumber?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  messageCount?: number;
  createdAt: string;
  updatedAt?: string | null;
  messages?: SupportTicketMessage[];
}

export interface CreateTicketPayload {
  category: string;
  subject: string;
  description: string;
  orderId?: string | null;
  attachmentName?: string | null;
  priority?: string;
}

/** GET /api/rider/guidelines — Dynamic guidelines and SOP from Admin Settings */
export async function fetchCaptainGuidelines(): Promise<CaptainGuidelinesResponse> {
  try {
    return await apiGetJson<CaptainGuidelinesResponse>("/api/rider/guidelines");
  } catch (e) {
    return {
      ok: true,
      platformName: "QuickPress Logistics",
      slides: [
        {
          id: 1,
          badge: "0% COMMISSION",
          title: "Zero Commission, 100% Earnings",
          subtitle:
            "All trip fares and customer tips go straight to your wallet. Zero platform commission deductions!",
          highlight: "Daily Direct Bank Payouts 💰",
          color: "emerald",
        },
        {
          id: 2,
          badge: "SMART DISPATCH",
          title: "Live Ride & Delivery Dispatches",
          subtitle:
            "Receive instant orders on your mobile with live GPS tracking directly in your work zone.",
          highlight: "High Demand Work Zones 📍",
          color: "amber",
        },
        {
          id: 3,
          badge: "FULL FLEXIBILITY",
          title: "Flexible Working Hours",
          subtitle:
            "Work whenever you want. Turn ON DUTY and start earning on your own schedule.",
          highlight: "Be Your Own Boss 🛵",
          color: "blue",
        },
      ],
      guidelines: [
        {
          title: "1. Customer Doorstep Pickup 🧺",
          desc: "Reach customer doorstep on time. Count garments and enter 6-digit Customer Pickup OTP.",
        },
        {
          title: "2. Store Drop & Washing Handover 🏪",
          desc: "Safely drop garments at partner store. Swipe 'Arrival to Store & Handover'.",
        },
        {
          title: "3. Store Drop Opt-Out Choice 🔄",
          desc: "If leaving trip after drop, select opt-out to collect 75% net pickup payout.",
        },
        {
          title: "4. Partner Dispatch OTP & Ready Delivery 📦",
          desc: "Pick ready garments from partner store using Partner Dispatch OTP.",
        },
        {
          title: "5. Customer Delivery OTP & Instant Payout 🚀",
          desc: "Deliver clean garments, enter Customer Delivery OTP, and receive instant 100% payout.",
        },
      ],
    };
  }
}

/** GET /api/rider/support — 24/7 Support helpline & emergency channels from Admin Settings */
export async function fetchCaptainSupport(): Promise<CaptainSupportResponse> {
  try {
    return await apiGetJson<CaptainSupportResponse>("/api/rider/support");
  } catch (e) {
    return {
      ok: true,
      helplinePhone: CAPTAIN_HELPLINE_PHONE,
      supportEmail: CAPTAIN_SUPPORT_EMAIL,
      whatsappUrl: "",
      emergencySosNumber: CAPTAIN_EMERGENCY_SOS,
      workingHours: "24 Hours · 7 Days a Week (24/7)",
      hubAddress: "QuickPress Express Hub, Kasganj, Uttar Pradesh 207123",
    };
  }
}

/** GET /api/public/legal/{slug} — Official legal compliance doc */
export async function fetchPublicLegalDoc(slug: string): Promise<PublicLegalDoc> {
  return await apiGetJson<PublicLegalDoc>(`/api/public/legal/${slug}`, {
    anonymous: true,
  });
}

/** POST /api/help/tickets — Raise official support ticket */
export async function createCaptainSupportTicket(
  payload: CreateTicketPayload
): Promise<SupportTicket> {
  return await apiPostJson<SupportTicket>("/api/help/tickets", payload);
}

/** GET /api/help/tickets — Fetch tickets */
export async function fetchCaptainSupportTickets(): Promise<{
  items: SupportTicket[];
  total: number;
}> {
  return await apiGetJson<{ items: SupportTicket[]; total: number }>(
    "/api/help/tickets"
  );
}
