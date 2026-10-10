/**
 * Help Center data layer — Sprint 2.11.
 *
 *   GET  /api/help/faqs?category=&q=            FAQs (filter + search)
 *   GET  /api/help/categories                   FAQ categories
 *   GET  /api/help/tickets?status=              the customer's tickets
 *   GET  /api/help/tickets/{ticketId}           one ticket + conversation
 *   POST /api/help/tickets                      raise a ticket
 *   POST /api/help/tickets/{ticketId}/reply     add a customer reply
 *
 * FAQs and categories are long-lived public content, so they are cached
 * aggressively; tickets use a short TTL and are invalidated on every write.
 */

import { apiGetJson, apiPostJson } from "../core/transport";
import { ApiError } from "../core/errors";
import {
  CACHE_KEYS,
  clearCache,
  clearScopedCache,
  readCache,
  readScopedCache,
  readStaleCache,
  readStaleScopedCache,
  writeCache,
  writeScopedCache,
} from "./api/cache";
import { isOnline } from "./api/network";

export type TicketCategory =
  | "order"
  | "payment"
  | "refund"
  | "partner-complaint"
  | "general"
  | "wash-quality"
  | "missing-garment"
  | "delay";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in-progress" | "awaiting-customer" | "resolved" | "closed";
export type MessageAuthor = "customer" | "support" | "system";

export type FaqCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  faqCount: number;
};

export type Faq = {
  id: string;
  categoryId: string;
  categoryName: string;
  question: string;
  answer: string;
  tags: string[];
  order: number;
  helpfulCount: number;
};

export type FaqList = {
  items: Faq[];
  total: number;
  categories: FaqCategory[];
  fromCache: boolean;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  author: MessageAuthor;
  authorName: string;
  body: string;
  attachmentName: string | null;
  attachmentUrl?: string | null;
  photos?: string[];
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  category: TicketCategory;
  categoryLabel: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  orderId: string | null;
  orderNumber: string | null;
  attachmentName: string | null;
  attachmentUrl?: string | null;
  photos?: string[];
  messageCount: number;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  messages: TicketMessage[];
};

export type TicketList = {
  items: SupportTicket[];
  total: number;
  openCount: number;
  resolvedCount: number;
  fromCache: boolean;
};

export type CreateTicketPayload = {
  category?: TicketCategory;
  subject: string;
  description: string;
  priority?: TicketPriority;
  orderId?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  photos?: string[];
};

/* --------------------- static presentation-only content -------------------- */

/**
 * Popular topics and the support contact card are presentation content, not
 * backend records — the API exposes no endpoint for them.
 */
export type HelpTopic = { id: string; label: string; note: string };

export type SupportContact = {
  phone: string;
  phoneLabel: string;
  whatsapp: string;
  email: string;
  appVersion: string;
  responseTime: string;
};

export const HELP_TOPICS: HelpTopic[] = [
  { id: "track", label: "Track My Order", note: "Live pickup & delivery status" },
  { id: "cancel", label: "Cancel Order", note: "Cancellation window & rules" },
  { id: "refund", label: "Refund Status", note: "Timelines and wallet credits" },
  { id: "payment", label: "Payment Issue", note: "Failed or double payments" },
  { id: "pickup-delay", label: "Pickup Delayed", note: "Agent running late" },
  { id: "delivery-delay", label: "Delivery Delayed", note: "Order not delivered yet" },
  { id: "coupons", label: "Coupons & Offers", note: "Applying promo codes" },
  { id: "account", label: "Account & Profile", note: "Login, address, settings" },
];

export const SUPPORT_CONTACT: SupportContact = {
  phone: "+918000123456",
  phoneLabel: "1800 012 3456",
  whatsapp: "918000123456",
  email: "support@quickpress.in",
  appVersion: "2.11.0",
  responseTime: "under 5 minutes",
};

export function fetchHelpTopics(): HelpTopic[] {
  return HELP_TOPICS;
}

export function fetchSupportContact(): SupportContact {
  return SUPPORT_CONTACT;
}

/* -------------------------------- mapping --------------------------------- */

const TICKET_STATUSES: TicketStatus[] = [
  "open",
  "in-progress",
  "awaiting-customer",
  "resolved",
  "closed",
];

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  "in-progress": "In Progress",
  "awaiting-customer": "Awaiting You",
  resolved: "Resolved",
  closed: "Closed",
};

export const TICKET_CATEGORY_OPTIONS: { id: TicketCategory; label: string; icon?: string }[] = [
  { id: "wash-quality", label: "Wash / Quality Issue" },
  { id: "missing-garment", label: "Missing / Wrong Cloth" },
  { id: "delay", label: "Pickup / Delivery Delay" },
  { id: "payment", label: "Payment & Refund" },
  { id: "general", label: "General Inquiry" },
];

type RawFaq = Partial<Faq>;
type RawCategory = Partial<FaqCategory>;
type RawMessage = Partial<TicketMessage>;
type RawTicket = Partial<Omit<SupportTicket, "messages">> & { messages?: RawMessage[] };
type RawFaqList = { items?: RawFaq[]; total?: number; categories?: RawCategory[] };
type RawTicketList = {
  items?: RawTicket[];
  total?: number;
  openCount?: number;
  resolvedCount?: number;
};

function toFaq(raw: RawFaq, index: number): Faq {
  return {
    id: raw.id ?? `faq-${index}`,
    categoryId: raw.categoryId ?? "general",
    categoryName: raw.categoryName ?? "",
    question: raw.question ?? "",
    answer: raw.answer ?? "",
    tags: raw.tags ?? [],
    order: Number(raw.order ?? index),
    helpfulCount: Number(raw.helpfulCount ?? 0),
  };
}

function toCategory(raw: RawCategory, index: number): FaqCategory {
  return {
    id: raw.id ?? `cat-${index}`,
    name: raw.name ?? "General",
    description: raw.description ?? "",
    icon: raw.icon ?? "life-buoy",
    order: Number(raw.order ?? index),
    faqCount: Number(raw.faqCount ?? 0),
  };
}

function toMessage(raw: RawMessage, index: number, ticketId: string): TicketMessage {
  const photoList = Array.isArray(raw.photos)
    ? raw.photos
    : raw.attachmentUrl
      ? [raw.attachmentUrl]
      : [];
  return {
    id: raw.id ?? `msg-${index}`,
    ticketId: raw.ticketId ?? ticketId,
    author: (raw.author as MessageAuthor) ?? "customer",
    authorName: raw.authorName ?? "",
    body: raw.body ?? "",
    attachmentName: raw.attachmentName ?? null,
    attachmentUrl: raw.attachmentUrl ?? (photoList[0] || null),
    photos: photoList,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

function toTicket(raw: RawTicket, index = 0): SupportTicket {
  const id = raw.id ?? `tkt-${index}`;
  const photoList = Array.isArray(raw.photos)
    ? raw.photos
    : raw.attachmentUrl
      ? [raw.attachmentUrl]
      : [];
  return {
    id,
    ticketNumber: raw.ticketNumber ?? "—",
    category: (raw.category as TicketCategory) ?? "general",
    categoryLabel: raw.categoryLabel ?? "General Issue",
    subject: raw.subject ?? "",
    description: raw.description ?? "",
    priority: (raw.priority as TicketPriority) ?? "medium",
    status: TICKET_STATUSES.includes(raw.status as TicketStatus)
      ? (raw.status as TicketStatus)
      : "open",
    orderId: raw.orderId ?? null,
    orderNumber: raw.orderNumber ?? null,
    attachmentName: raw.attachmentName ?? null,
    attachmentUrl: raw.attachmentUrl ?? (photoList[0] || null),
    photos: photoList,
    messageCount: Number(raw.messageCount ?? 0),
    unreadCount: Number(raw.unreadCount ?? 0),
    lastMessageAt: raw.lastMessageAt ?? null,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? null,
    messages: (raw.messages ?? []).map((message, messageIndex) =>
      toMessage(message, messageIndex, id),
    ),
  };
}

/* ---------------------------------- FAQs ---------------------------------- */

function cachedFaqs(stale: boolean): FaqList | null {
  const raw = stale
    ? readStaleCache<RawFaqList>(CACHE_KEYS.faqs)
    : readCache<RawFaqList>(CACHE_KEYS.faqs);
  if (!raw) return null;
  const items = (raw.items ?? []).map(toFaq);
  return {
    items,
    total: raw.total ?? items.length,
    categories: (raw.categories ?? []).map(toCategory),
    fromCache: true,
  };
}

/** Cached FAQ payload without a network round trip. */
export function readCachedFaqs(): FaqList | null {
  return cachedFaqs(true);
}

/** Cache-first FAQs — GET /api/help/faqs. Filtered reads bypass the cache. */
export async function fetchFaqList(
  options: {
    category?: string | undefined;
    q?: string | undefined;
    forceRefresh?: boolean | undefined;
    signal?: AbortSignal | undefined;
  } = {},
): Promise<FaqList> {
  const category = options.category && options.category !== "all" ? options.category : undefined;
  const query = (options.q ?? "").trim();
  const cacheable = !category && query.length === 0;

  if (cacheable && !options.forceRefresh) {
    const fresh = cachedFaqs(false);
    if (fresh) return fresh;
  }

  if (!isOnline()) {
    const offline = filterCachedFaqs(category, query);
    if (offline) return offline;
    throw new ApiError("offline", "Device is offline");
  }

  try {
    const raw = await apiGetJson<RawFaqList>("/api/help/faqs", {
      params: { ...(category ? { category } : {}), ...(query ? { q: query } : {}) },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (cacheable) writeCache(CACHE_KEYS.faqs, raw);
    if (raw.categories?.length) writeCache(CACHE_KEYS.faqCategories, { items: raw.categories });
    const items = (raw.items ?? []).map(toFaq);
    return {
      items,
      total: raw.total ?? items.length,
      categories: (raw.categories ?? []).map(toCategory),
      fromCache: false,
    };
  } catch (error) {
    const offline = filterCachedFaqs(category, query);
    if (offline) return offline;
    throw error;
  }
}

function filterCachedFaqs(category: string | undefined, query: string): FaqList | null {
  const stale = cachedFaqs(true);
  if (!stale) return null;
  const needle = query.toLowerCase();
  const items = stale.items.filter((faq) => {
    const matchesCategory = !category || faq.categoryId === category;
    const matchesQuery =
      !needle ||
      faq.question.toLowerCase().includes(needle) ||
      faq.answer.toLowerCase().includes(needle) ||
      faq.tags.some((tag) => tag.toLowerCase().includes(needle));
    return matchesCategory && matchesQuery;
  });
  return { items, total: items.length, categories: stale.categories, fromCache: true };
}

/** Cache-first FAQ categories — GET /api/help/categories. */
export async function fetchFaqCategories(
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<FaqCategory[]> {
  const cached = (stale: boolean) => {
    const raw = stale
      ? readStaleCache<{ items?: RawCategory[] }>(CACHE_KEYS.faqCategories)
      : readCache<{ items?: RawCategory[] }>(CACHE_KEYS.faqCategories);
    return raw ? (raw.items ?? []).map(toCategory) : null;
  };

  if (!options.forceRefresh) {
    const fresh = cached(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) return cached(true) ?? [];
  try {
    const raw = await apiGetJson<{ items?: RawCategory[]; total?: number }>(
      "/api/help/categories",
      { ...(options.signal ? { signal: options.signal } : {}) },
    );
    writeCache(CACHE_KEYS.faqCategories, raw);
    return (raw.items ?? []).map(toCategory);
  } catch (error) {
    const stale = cached(true);
    if (stale) return stale;
    throw error;
  }
}

/** Legacy helper kept for existing callers — returns just the FAQ rows. */
export async function fetchFaqs(): Promise<Faq[]> {
  return (await fetchFaqList()).items;
}

/* -------------------------------- tickets --------------------------------- */

function cachedTickets(stale: boolean): TicketList | null {
  const raw = stale
    ? readStaleCache<RawTicketList>(CACHE_KEYS.supportTickets)
    : readCache<RawTicketList>(CACHE_KEYS.supportTickets);
  if (!raw) return null;
  const items = (raw.items ?? []).map(toTicket);
  return {
    items,
    total: raw.total ?? items.length,
    openCount: Number(raw.openCount ?? 0),
    resolvedCount: Number(raw.resolvedCount ?? 0),
    fromCache: true,
  };
}

export function readCachedTickets(): TicketList | null {
  return cachedTickets(true);
}

/** Cache-first ticket list — GET /api/help/tickets. */
export async function fetchTickets(
  options: {
    status?: TicketStatus | "all" | undefined;
    forceRefresh?: boolean | undefined;
    signal?: AbortSignal | undefined;
  } = {},
): Promise<TicketList> {
  const status = options.status && options.status !== "all" ? options.status : undefined;
  const cacheable = !status;

  if (cacheable && !options.forceRefresh) {
    const fresh = cachedTickets(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) {
    const stale = filterCachedTickets(status);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }
  try {
    const raw = await apiGetJson<RawTicketList>("/api/help/tickets", {
      params: status ? { status } : {},
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (cacheable) writeCache(CACHE_KEYS.supportTickets, raw);
    const items = (raw.items ?? []).map(toTicket);
    return {
      items,
      total: raw.total ?? items.length,
      openCount: Number(raw.openCount ?? 0),
      resolvedCount: Number(raw.resolvedCount ?? 0),
      fromCache: false,
    };
  } catch (error) {
    const stale = filterCachedTickets(status);
    if (stale) return stale;
    throw error;
  }
}

function filterCachedTickets(status: TicketStatus | undefined): TicketList | null {
  const stale = cachedTickets(true);
  if (!stale) return null;
  if (!status) return stale;
  const items = stale.items.filter((ticket) => ticket.status === status);
  return { ...stale, items, total: items.length };
}

/** Cache-first ticket thread — GET /api/help/tickets/{ticketId}. */
export async function fetchTicket(
  ticketId: string,
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<SupportTicket> {
  const cached = (stale: boolean) => {
    const raw = stale
      ? readStaleScopedCache<RawTicket>("ticket-detail", ticketId)
      : readScopedCache<RawTicket>("ticket-detail", ticketId);
    return raw ? toTicket(raw) : null;
  };

  if (!options.forceRefresh) {
    const fresh = cached(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) {
    const stale = cached(true);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }
  try {
    const raw = await apiGetJson<RawTicket>(`/api/help/tickets/${encodeURIComponent(ticketId)}`, {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    writeScopedCache("ticket-detail", ticketId, raw);
    return toTicket(raw);
  } catch (error) {
    const stale = cached(true);
    if (stale) return stale;
    throw error;
  }
}

/** Upload a support photo to Cloudinary CDN. */
export async function uploadSupportPhoto(dataUrlOrHttpUrl: string): Promise<string> {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to upload image.");
  const res = await apiPostJson<{ url: string; field?: string }>("/api/help/upload", {
    image: dataUrlOrHttpUrl,
  });
  return res.url;
}

/** POST /api/help/tickets. */
export async function createSupportTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to raise a support ticket.");
  const raw = await apiPostJson<RawTicket>("/api/help/tickets", {
    category: payload.category ?? "general",
    subject: payload.subject,
    description: payload.description,
    priority: payload.priority ?? "medium",
    ...(payload.orderId ? { orderId: payload.orderId } : {}),
    ...(payload.attachmentName ? { attachmentName: payload.attachmentName } : {}),
    ...(payload.attachmentUrl ? { attachmentUrl: payload.attachmentUrl } : {}),
    ...(payload.photos && payload.photos.length > 0 ? { photos: payload.photos } : {}),
  });
  clearCache(CACHE_KEYS.supportTickets);
  const ticket = toTicket(raw);
  writeScopedCache("ticket-detail", ticket.id, raw);
  return ticket;
}

/** POST /api/help/tickets/{ticketId}/reply. */
export async function replyToTicket(
  ticketId: string,
  body: string,
  attachmentName?: string,
  attachmentUrl?: string,
  photos?: string[],
): Promise<SupportTicket> {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to send this reply.");
  const raw = await apiPostJson<RawTicket>(
    `/api/help/tickets/${encodeURIComponent(ticketId)}/reply`,
    {
      body,
      ...(attachmentName ? { attachmentName } : {}),
      ...(attachmentUrl ? { attachmentUrl } : {}),
      ...(photos && photos.length > 0 ? { photos } : {}),
    },
  );
  clearCache(CACHE_KEYS.supportTickets);
  writeScopedCache("ticket-detail", ticketId, raw);
  return toTicket(raw);
}

export function invalidateHelpCache(ticketId?: string) {
  clearCache(CACHE_KEYS.supportTickets);
  clearCache(CACHE_KEYS.faqs);
  if (ticketId) clearScopedCache("ticket-detail", ticketId);
}
