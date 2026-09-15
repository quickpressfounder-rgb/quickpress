/**
 * Invoice data layer — Sprint 2.11.
 *
 * Maps 1:1 to the FastAPI endpoints served by `backend-python`:
 *
 *   GET  /api/invoices                        invoice history (searchable)
 *   GET  /api/invoices/{invoiceId}            one invoice
 *   GET  /api/orders/{orderId}/invoice        the invoice of an order
 *   POST /api/invoices/{invoiceId}/share      whatsapp / email / sms / link
 *   POST /api/invoices/{invoiceId}/download   resolve a downloadable document
 *
 * Reads are cache-first so Invoice History paints instantly on a warm start
 * and still renders (flagged `fromCache`) while the device is offline.
 * Mutations refresh the affected cache entries.
 */

import { apiGetJson, apiPostJson } from "../core/transport";
import { readToken } from "../core/session-store";
import { apiBaseUrl } from "./api/config";
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

export type InvoiceStatus = "paid" | "unpaid" | "refunded" | "cancelled";
export type InvoicePaymentStatus = "paid" | "pending" | "failed" | "refunded" | "cod-pending";
export type InvoiceShareChannel = "whatsapp" | "email" | "sms" | "link" | "copy";

export type InvoiceParty = {
  name: string;
  phone: string;
  email: string;
  addressLine: string;
  city: string;
};

export type InvoiceGst = {
  gstin: string;
  placeOfSupply: string;
  hsnCode: string;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
};

export type InvoiceItem = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoiceTotals = {
  itemsTotal: number;
  discount: number;
  deliveryCharge: number;
  pickupCharge: number;
  handlingFee: number;
  taxableValue: number;
  taxes: number;
  grandTotal: number;
  currency: string;
};

export type InvoicePayment = {
  method: string;
  methodLabel: string;
  status: InvoicePaymentStatus;
  paidAt: string | null;
  transactionId: string | null;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  status: InvoiceStatus;
  invoiceDate: string;
  invoiceDateLabel: string;
  dueDate: string | null;
  serviceLabel: string;
  customer: InvoiceParty;
  partner: InvoiceParty;
  gst: InvoiceGst;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  payment: InvoicePayment;
  notes: string;
  downloadCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type InvoiceList = {
  items: Invoice[];
  total: number;
  totalAmount: number;
  fromCache: boolean;
};

export type InvoiceShareResult = {
  ok: boolean;
  message: string;
  shareUrl: string;
  channel: string;
  invoice: Invoice | null;
};

export type InvoiceDownloadResult = {
  ok: boolean;
  message: string;
  downloadUrl: string;
  fileName: string;
  format: string;
  invoice: Invoice | null;
};

/* ------------------------------ raw payloads ----------------------------- */

type RawParty = Partial<InvoiceParty>;
type RawGst = Partial<InvoiceGst>;
type RawItem = Partial<InvoiceItem> & { id?: string };
type RawTotals = Partial<InvoiceTotals>;
type RawPayment = Partial<InvoicePayment>;

type RawInvoice = {
  id?: string;
  invoiceNumber?: string;
  orderId?: string;
  orderNumber?: string;
  status?: string;
  invoiceDate?: string;
  dueDate?: string | null;
  serviceLabel?: string;
  customer?: RawParty;
  partner?: RawParty;
  gst?: RawGst;
  items?: RawItem[];
  totals?: RawTotals;
  payment?: RawPayment;
  notes?: string;
  downloadCount?: number;
  shareCount?: number;
  createdAt?: string;
  updatedAt?: string | null;
};

type RawInvoiceList = { items?: RawInvoice[]; total?: number; totalAmount?: number };

/* -------------------------------- mapping -------------------------------- */

const STATUSES: InvoiceStatus[] = ["paid", "unpaid", "refunded", "cancelled"];
const PAYMENT_STATUSES: InvoicePaymentStatus[] = [
  "paid",
  "pending",
  "failed",
  "refunded",
  "cod-pending",
];

export function formatInvoiceDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatInvoiceAmount(amount: number): string {
  return `₹${Number(amount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toParty(raw: RawParty | undefined): InvoiceParty {
  return {
    name: raw?.name ?? "",
    phone: raw?.phone ?? "",
    email: raw?.email ?? "",
    addressLine: raw?.addressLine ?? "",
    city: raw?.city ?? "",
  };
}

function toGst(raw: RawGst | undefined): InvoiceGst {
  return {
    gstin: raw?.gstin ?? "",
    placeOfSupply: raw?.placeOfSupply ?? "",
    hsnCode: raw?.hsnCode ?? "9997",
    taxRate: toNumber(raw?.taxRate),
    cgst: toNumber(raw?.cgst),
    sgst: toNumber(raw?.sgst),
    igst: toNumber(raw?.igst),
    totalTax: toNumber(raw?.totalTax),
  };
}

function toItem(raw: RawItem, index: number): InvoiceItem {
  const quantity = Math.max(1, Math.round(toNumber(raw.quantity ?? 1)));
  const unitPrice = toNumber(raw.unitPrice);
  return {
    id: raw.id ?? `inv-item-${index}`,
    name: raw.name ?? "Service",
    description: raw.description ?? "",
    quantity,
    unitPrice,
    total: toNumber(raw.total ?? unitPrice * quantity),
  };
}

function toTotals(raw: RawTotals | undefined): InvoiceTotals {
  return {
    itemsTotal: toNumber(raw?.itemsTotal),
    discount: toNumber(raw?.discount),
    deliveryCharge: toNumber(raw?.deliveryCharge),
    pickupCharge: toNumber(raw?.pickupCharge),
    handlingFee: toNumber(raw?.handlingFee),
    taxableValue: toNumber(raw?.taxableValue),
    taxes: toNumber(raw?.taxes),
    grandTotal: toNumber(raw?.grandTotal),
    currency: raw?.currency ?? "INR",
  };
}

function toPayment(raw: RawPayment | undefined): InvoicePayment {
  const status = PAYMENT_STATUSES.includes(raw?.status as InvoicePaymentStatus)
    ? (raw?.status as InvoicePaymentStatus)
    : "cod-pending";
  return {
    method: raw?.method ?? "cod",
    methodLabel: raw?.methodLabel ?? "Cash on Delivery",
    status,
    paidAt: raw?.paidAt ?? null,
    transactionId: raw?.transactionId ?? null,
  };
}

function toInvoice(raw: RawInvoice, index = 0): Invoice {
  const invoiceDate = raw.invoiceDate ?? raw.createdAt ?? new Date().toISOString();
  return {
    id: raw.id ?? `inv-${index}`,
    invoiceNumber: raw.invoiceNumber ?? "—",
    orderId: raw.orderId ?? "",
    orderNumber: raw.orderNumber ?? "—",
    status: STATUSES.includes(raw.status as InvoiceStatus)
      ? (raw.status as InvoiceStatus)
      : "unpaid",
    invoiceDate,
    invoiceDateLabel: formatInvoiceDate(invoiceDate),
    dueDate: raw.dueDate ?? null,
    serviceLabel: raw.serviceLabel ?? "Laundry",
    customer: toParty(raw.customer),
    partner: toParty(raw.partner),
    gst: toGst(raw.gst),
    items: (raw.items ?? []).map(toItem),
    totals: toTotals(raw.totals),
    payment: toPayment(raw.payment),
    notes: raw.notes ?? "",
    downloadCount: toNumber(raw.downloadCount),
    shareCount: toNumber(raw.shareCount),
    createdAt: raw.createdAt ?? invoiceDate,
    updatedAt: raw.updatedAt ?? null,
  };
}

/* --------------------------------- reads --------------------------------- */

function cachedList(stale: boolean): InvoiceList | null {
  const value = stale
    ? readStaleCache<RawInvoiceList>(CACHE_KEYS.invoices)
    : readCache<RawInvoiceList>(CACHE_KEYS.invoices);
  if (!value) return null;
  const items = (value.items ?? [])
    .filter((raw) => String(raw.status ?? "").toLowerCase() !== "cancelled")
    .map(toInvoice);
  return {
    items,
    total: items.length,
    totalAmount: items.reduce((sum, item) => sum + (item.totals?.grandTotal || 0), 0),
    fromCache: true,
  };
}

/** Cached invoice history without touching the network (offline start). */
export function readCachedInvoices(): InvoiceList | null {
  return cachedList(true);
}

/**
 * Cache-first invoice history — GET /api/invoices.
 *
 * Only the unfiltered list is cached; a search query always goes to the API
 * (and falls back to a local filter over the cache while offline).
 */
export async function fetchInvoices(
  options: {
    q?: string | undefined;
    limit?: number | undefined;
    forceRefresh?: boolean | undefined;
    signal?: AbortSignal | undefined;
  } = {},
): Promise<InvoiceList> {
  const query = (options.q ?? "").trim();
  const cacheable = query.length === 0;

  if (cacheable && !options.forceRefresh) {
    const fresh = cachedList(false);
    if (fresh) return fresh;
  }

  if (!isOnline()) {
    const stale = filterCachedList(query);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }

  try {
    const raw = await apiGetJson<RawInvoiceList>("/api/invoices", {
      params: {
        ...(query ? { q: query } : {}),
        ...(options.limit ? { limit: options.limit } : {}),
      },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (cacheable) writeCache(CACHE_KEYS.invoices, raw);
    const items = (raw.items ?? [])
      .filter((rawItem) => String(rawItem.status ?? "").toLowerCase() !== "cancelled")
      .map(toInvoice);
    const totalAmount = items.reduce((sum, item) => sum + (item.totals?.grandTotal || 0), 0);
    return {
      items,
      total: items.length,
      totalAmount,
      fromCache: false,
    };
  } catch (error) {
    const stale = filterCachedList(query);
    if (stale) return stale;
    throw error;
  }
}

function filterCachedList(query: string): InvoiceList | null {
  const stale = cachedList(true);
  if (!stale) return null;
  if (!query) return stale;
  const needle = query.toLowerCase();
  const items = stale.items.filter(
    (invoice) =>
      invoice.status !== "cancelled" &&
      (invoice.invoiceNumber.toLowerCase().includes(needle) ||
        invoice.orderNumber.toLowerCase().includes(needle) ||
        invoice.partner.name.toLowerCase().includes(needle)),
  );
  const totalAmount = items.reduce((sum, item) => sum + (item.totals?.grandTotal || 0), 0);
  return { items, total: items.length, totalAmount, fromCache: true };
}

/** Cache-first single invoice — GET /api/invoices/{invoiceId}. */
export async function fetchInvoice(
  invoiceId: string,
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<Invoice> {
  const cached = (stale: boolean) => {
    const raw = stale
      ? readStaleScopedCache<RawInvoice>("invoice-detail", invoiceId)
      : readScopedCache<RawInvoice>("invoice-detail", invoiceId);
    if (!raw || String(raw.status ?? "").toLowerCase() === "cancelled") return null;
    return toInvoice(raw);
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
    const raw = await apiGetJson<RawInvoice>(`/api/invoices/${encodeURIComponent(invoiceId)}`, {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    const invoice = toInvoice(raw);
    if (invoice.status === "cancelled") {
      throw new ApiError("cancelled", "Invoice is not available for cancelled orders");
    }
    writeScopedCache("invoice-detail", invoiceId, raw);
    return invoice;
  } catch (error) {
    const stale = cached(true);
    if (stale) return stale;
    throw error;
  }
}

/** The invoice of an order — GET /api/orders/{orderId}/invoice. */
export async function fetchInvoiceForOrder(
  orderId: string,
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<Invoice> {
  const cached = (stale: boolean) => {
    const raw = stale
      ? readStaleScopedCache<RawInvoice>("order-invoice", orderId)
      : readScopedCache<RawInvoice>("order-invoice", orderId);
    if (!raw || String(raw.status ?? "").toLowerCase() === "cancelled") return null;
    return toInvoice(raw);
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
    const raw = await apiGetJson<RawInvoice>(
      `/api/orders/${encodeURIComponent(orderId)}/invoice`,
      { ...(options.signal ? { signal: options.signal } : {}) },
    );
    const invoice = toInvoice(raw);
    if (invoice.status === "cancelled") {
      throw new ApiError("cancelled", "Invoice is not available for cancelled orders");
    }
    writeScopedCache("order-invoice", orderId, raw);
    if (raw.id) writeScopedCache("invoice-detail", raw.id, raw);
    return invoice;
  } catch (error) {
    const stale = cached(true);
    if (stale) return stale;
    throw error;
  }
}

/* ------------------------------- mutations ------------------------------- */

export function invalidateInvoiceCache(invoiceId?: string) {
  clearCache(CACHE_KEYS.invoices);
  if (invoiceId) clearScopedCache("invoice-detail", invoiceId);
}

/** POST /api/invoices/{invoiceId}/share. */
export async function shareInvoice(
  invoiceId: string,
  channel: InvoiceShareChannel = "link",
  target?: string,
): Promise<InvoiceShareResult> {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to share this invoice.");
  const raw = await apiPostJson<{
    ok?: boolean;
    message?: string;
    shareUrl?: string;
    channel?: string;
    invoice?: RawInvoice;
  }>(`/api/invoices/${encodeURIComponent(invoiceId)}/share`, {
    channel,
    ...(target ? { target } : {}),
  });
  if (raw.invoice) writeScopedCache("invoice-detail", invoiceId, raw.invoice);
  clearCache(CACHE_KEYS.invoices);
  return {
    ok: raw.ok !== false,
    message: raw.message ?? "Invoice shared",
    shareUrl: raw.shareUrl ?? "",
    channel: raw.channel ?? channel,
    invoice: raw.invoice ? toInvoice(raw.invoice) : null,
  };
}

/** Get direct authenticated URL to stream or view invoice PDF. */
export function getInvoicePdfUrl(invoiceId: string): string {
  const token = readToken();
  const base = apiBaseUrl();
  const cleanId = encodeURIComponent(invoiceId);
  return `${base}/api/invoices/${cleanId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

/** Get direct authenticated URL to stream or view order invoice PDF. */
export function getOrderInvoicePdfUrl(orderId: string): string {
  const token = readToken();
  const base = apiBaseUrl();
  const cleanId = encodeURIComponent(orderId);
  return `${base}/api/orders/${cleanId}/invoice/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

/** Directly trigger a native client-side PDF file download via Blob. */
export async function downloadInvoicePdfBlob(invoiceId: string, customFileName?: string): Promise<string> {
  const token = readToken();
  const base = apiBaseUrl();
  const cleanId = encodeURIComponent(invoiceId);
  const url = `${base}/api/invoices/${cleanId}/pdf${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Failed to download invoice (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const fileName = customFileName || `QuickPress-Invoice-${invoiceId.replace(/\//g, "-")}.pdf`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  return fileName;
}

/** POST /api/invoices/{invoiceId}/download. */
export async function downloadInvoice(invoiceId: string): Promise<InvoiceDownloadResult> {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to download this invoice.");
  const raw = await apiPostJson<{
    ok?: boolean;
    message?: string;
    downloadUrl?: string;
    fileName?: string;
    format?: string;
    invoice?: RawInvoice;
  }>(`/api/invoices/${encodeURIComponent(invoiceId)}/download`, {});
  if (raw.invoice) writeScopedCache("invoice-detail", invoiceId, raw.invoice);
  clearCache(CACHE_KEYS.invoices);
  return {
    ok: raw.ok !== false,
    message: raw.message ?? "Invoice ready",
    downloadUrl: getInvoicePdfUrl(invoiceId),
    fileName: raw.fileName ?? `${invoiceId}.pdf`,
    format: raw.format ?? "pdf",
    invoice: raw.invoice ? toInvoice(raw.invoice) : null,
  };
}
