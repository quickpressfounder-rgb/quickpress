/**
 * Payment methods, payments and refunds data layer — Sprint 2.10.
 *
 *   GET    /api/payment-methods       saved methods + provider catalogue
 *   POST   /api/payment-methods       save a method
 *   PUT    /api/payment-methods/{id}  edit / set default
 *   DELETE /api/payment-methods/{id}  remove a method
 *   POST   /api/payments/create       create a payment (wallet / COD today)
 *   GET    /api/payments/{id}         single payment
 *   GET    /api/payments              payment history
 *   GET    /api/refunds               refunds ledger
 *
 * Reads are cache-first with a stale fallback so the screens stay usable
 * offline. Online rails (Razorpay, UPI, cards) are listed but flagged
 * `enabled: false` by the backend until production credentials exist.
 */

import { apiDeleteJson, apiGetJson, apiPostJson, apiRequest } from "../core/transport";
import { ApiError } from "../core/errors";
import { CACHE_KEYS, clearCache, readCache, readStaleCache, writeCache } from "./api/cache";
import { isOnline } from "./api/network";
import { formatWalletDate, invalidateWalletCache, type Wallet } from "./wallet-api";

export const PAYMENTS_API_ENDPOINTS = {
  methods: "/api/payment-methods",
  method: "/api/payment-methods/{id}",
  providers: "/api/payment-providers",
  createPayment: "/api/payments/create",
  payment: "/api/payments/{id}",
  payments: "/api/payments",
  refunds: "/api/refunds",
} as const;

export type PaymentKind = "cod" | "wallet" | "cashfree" | "razorpay" | "upi" | "credit-card" | "debit-card" | "netbanking";

export type PaymentStatus =
  | "created"
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

export type RefundStatus = "requested" | "processing" | "completed" | "rejected";

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  cod: "Cash on Delivery",
  wallet: "Wallet",
  cashfree: "Cashfree",
  razorpay: "Razorpay",
  upi: "UPI",
  "credit-card": "Credit Card",
  "debit-card": "Debit Card",
  netbanking: "Net Banking",
};

export type PaymentMethod = {
  id: string;
  kind: PaymentKind;
  name: string;
  masked: string;
  note: string;
  isDefault: boolean;
  /** False while the rail waits on production credentials. */
  enabled: boolean;
};

export type PaymentProvider = {
  id: string;
  kind: PaymentKind;
  name: string;
  tagline: string;
  initials: string;
  enabled: boolean;
  comingSoon: boolean;
};

export type PaymentMethodsResult = {
  methods: PaymentMethod[];
  providers: PaymentProvider[];
  onlinePaymentsEnabled: boolean;
  fromCache: boolean;
};

export type PaymentRecord = {
  id: string;
  orderId: string | null;
  amount: number;
  method: PaymentKind;
  methodLabel: string;
  status: PaymentStatus;
  transactionId: string;
  purpose: string;
  createdAt: string;
  dateLabel: string;
};

export type RefundRecord = {
  id: string;
  paymentId: string | null;
  orderId: string | null;
  amount: number;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  dateLabel: string;
};

export type PaymentsResult = { items: PaymentRecord[]; fromCache: boolean };
export type RefundsResult = { items: RefundRecord[]; total: number; fromCache: boolean };

/* -------------------------------- mapping -------------------------------- */

const KINDS: PaymentKind[] = ["cod", "wallet", "cashfree", "razorpay", "upi", "credit-card", "debit-card", "netbanking"];

function toKind(value: unknown): PaymentKind {
  return KINDS.includes(value as PaymentKind) ? (value as PaymentKind) : "wallet";
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type RawMethod = Partial<PaymentMethod> & { kind?: string };
type RawProvider = Partial<PaymentProvider> & { kind?: string };
type RawMethods = {
  methods?: RawMethod[];
  /** Alias kept for pre-2.10 payloads. */
  items?: RawMethod[];
  providers?: RawProvider[];
  onlinePaymentsEnabled?: boolean;
};

function toMethod(raw: RawMethod, index: number): PaymentMethod {
  const kind = toKind(raw.kind);
  return {
    id: raw.id ?? `pm-${index}`,
    kind,
    name: raw.name ?? PAYMENT_KIND_LABEL[kind],
    masked: raw.masked ?? "",
    note: raw.note ?? "",
    isDefault: raw.isDefault === true,
    enabled: raw.enabled !== false,
  };
}

function toProvider(raw: RawProvider, index: number): PaymentProvider {
  const kind = toKind(raw.kind);
  const name = raw.name ?? PAYMENT_KIND_LABEL[kind];
  return {
    id: raw.id ?? `provider-${index}`,
    kind,
    name,
    tagline: raw.tagline ?? "",
    initials: raw.initials ?? name.slice(0, 2).toUpperCase(),
    enabled: raw.enabled === true,
    comingSoon: raw.comingSoon === true || raw.enabled !== true,
  };
}

function toMethodsResult(raw: RawMethods, fromCache: boolean): PaymentMethodsResult {
  return {
    methods: (raw.methods ?? raw.items ?? []).map(toMethod),
    providers: (raw.providers ?? []).map(toProvider),
    onlinePaymentsEnabled: raw.onlinePaymentsEnabled === true,
    fromCache,
  };
}

type RawPayment = Partial<Omit<PaymentRecord, "method" | "status">> & {
  method?: string;
  status?: string;
};

function toPayment(raw: RawPayment, index: number): PaymentRecord {
  const kind = toKind(raw.method);
  const createdAt = raw.createdAt ?? new Date().toISOString();
  const statuses: PaymentStatus[] = [
    "created",
    "pending",
    "processing",
    "paid",
    "failed",
    "refunded",
    "cancelled",
  ];
  return {
    id: raw.id ?? `pay-${index}`,
    orderId: raw.orderId ?? null,
    amount: toNumber(raw.amount),
    method: kind,
    methodLabel: raw.methodLabel ?? PAYMENT_KIND_LABEL[kind],
    status: statuses.includes(raw.status as PaymentStatus)
      ? (raw.status as PaymentStatus)
      : "pending",
    transactionId: raw.transactionId ?? "—",
    purpose: raw.purpose ?? "Order payment",
    createdAt,
    dateLabel: formatWalletDate(createdAt),
  };
}

type RawRefund = Partial<Omit<RefundRecord, "status">> & { status?: string };

function toRefund(raw: RawRefund, index: number): RefundRecord {
  const createdAt = raw.createdAt ?? new Date().toISOString();
  const statuses: RefundStatus[] = ["requested", "processing", "completed", "rejected"];
  return {
    id: raw.id ?? `refund-${index}`,
    paymentId: raw.paymentId ?? null,
    orderId: raw.orderId ?? null,
    amount: toNumber(raw.amount),
    reason: raw.reason ?? "Refund",
    status: statuses.includes(raw.status as RefundStatus)
      ? (raw.status as RefundStatus)
      : "requested",
    createdAt,
    dateLabel: formatWalletDate(createdAt),
  };
}

/* --------------------------------- reads --------------------------------- */

function cachedMethods(stale: boolean): PaymentMethodsResult | null {
  const value = stale
    ? readStaleCache<RawMethods>(CACHE_KEYS.paymentMethods)
    : readCache<RawMethods>(CACHE_KEYS.paymentMethods);
  return value ? toMethodsResult(value, true) : null;
}

/** GET /api/payment-methods — cache-first with offline fallback. */
export async function fetchPaymentMethods(
  options: { forceRefresh?: boolean } = {},
): Promise<PaymentMethodsResult> {
  if (!options.forceRefresh) {
    const fresh = cachedMethods(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) {
    const stale = cachedMethods(true);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }
  try {
    const raw = await apiGetJson<RawMethods>(PAYMENTS_API_ENDPOINTS.methods);
    writeCache(CACHE_KEYS.paymentMethods, raw);
    return toMethodsResult(raw, false);
  } catch (error) {
    const stale = cachedMethods(true);
    if (stale) return stale;
    throw error;
  }
}

/** Provider catalogue, derived from the payment-methods payload. */
export async function fetchPaymentProviders(): Promise<PaymentProvider[]> {
  return (await fetchPaymentMethods()).providers;
}

function cachedPayments(stale: boolean): PaymentsResult | null {
  const value = stale
    ? readStaleCache<RawPayment[]>(CACHE_KEYS.payments)
    : readCache<RawPayment[]>(CACHE_KEYS.payments);
  return value ? { items: value.map(toPayment), fromCache: true } : null;
}

/** GET /api/payments — payment history (amount, date, method, status, txn id). */
export async function fetchPayments(
  options: { forceRefresh?: boolean } = {},
): Promise<PaymentsResult> {
  if (!options.forceRefresh) {
    const fresh = cachedPayments(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) {
    const stale = cachedPayments(true);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }
  try {
    const raw = await apiGetJson<RawPayment[]>(PAYMENTS_API_ENDPOINTS.payments);
    writeCache(CACHE_KEYS.payments, raw);
    return { items: raw.map(toPayment), fromCache: false };
  } catch (error) {
    const stale = cachedPayments(true);
    if (stale) return stale;
    throw error;
  }
}

/** GET /api/payments/{id} */
export async function fetchPayment(id: string): Promise<PaymentRecord> {
  const raw = await apiGetJson<RawPayment>(`/api/payments/${encodeURIComponent(id)}`);
  return toPayment(raw, 0);
}

function cachedRefunds(stale: boolean): RefundsResult | null {
  const value = stale
    ? readStaleCache<{ items?: RawRefund[]; total?: number }>(CACHE_KEYS.refunds)
    : readCache<{ items?: RawRefund[]; total?: number }>(CACHE_KEYS.refunds);
  if (!value) return null;
  const items = (value.items ?? []).map(toRefund);
  return { items, total: value.total ?? items.length, fromCache: true };
}

/** GET /api/refunds — amount, reason, status and date per refund. */
export async function fetchRefunds(
  options: { forceRefresh?: boolean } = {},
): Promise<RefundsResult> {
  if (!options.forceRefresh) {
    const fresh = cachedRefunds(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) {
    const stale = cachedRefunds(true);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }
  try {
    const raw = await apiGetJson<{ items?: RawRefund[]; total?: number }>(
      PAYMENTS_API_ENDPOINTS.refunds,
    );
    writeCache(CACHE_KEYS.refunds, raw);
    const items = (raw.items ?? []).map(toRefund);
    return { items, total: raw.total ?? items.length, fromCache: false };
  } catch (error) {
    const stale = cachedRefunds(true);
    if (stale) return stale;
    throw error;
  }
}

/* ------------------------------- mutations ------------------------------- */

export function invalidatePaymentMethodsCache() {
  clearCache(CACHE_KEYS.paymentMethods);
}

function assertOnline() {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to update payment methods.");
}

/** POST /api/payment-methods */
export async function addPaymentMethod(input: {
  kind: PaymentKind;
  name: string;
  masked: string;
  isDefault?: boolean;
}): Promise<PaymentMethod> {
  assertOnline();
  if (!input.name.trim()) throw new ApiError("validation", "Give this payment method a name.");
  const raw = await apiPostJson<RawMethod>(PAYMENTS_API_ENDPOINTS.methods, {
    kind: input.kind,
    name: input.name.trim(),
    masked: input.masked.trim(),
    isDefault: input.isDefault === true,
  });
  invalidatePaymentMethodsCache();
  return toMethod(raw, 0);
}

/** DELETE /api/payment-methods/{id} */
export async function removePaymentMethod(id: string) {
  assertOnline();
  await apiDeleteJson(`/api/payment-methods/${encodeURIComponent(id)}`);
  invalidatePaymentMethodsCache();
  return { ok: true as const, id };
}

/** PUT /api/payment-methods/{id} */
export async function setDefaultPaymentMethod(id: string) {
  assertOnline();
  await apiRequest("PUT", `/api/payment-methods/${encodeURIComponent(id)}`, {
    body: { isDefault: true },
  });
  invalidatePaymentMethodsCache();
  return { ok: true as const, id };
}

/** PUT /api/payment-methods/{id} — edit an existing method. */
export async function updatePaymentMethod(
  id: string,
  patch: { kind: PaymentKind; name: string; masked: string },
): Promise<PaymentMethod> {
  assertOnline();
  const raw = await apiRequest<RawMethod>(
    "PUT",
    `/api/payment-methods/${encodeURIComponent(id)}`,
    { body: patch },
  );
  invalidatePaymentMethodsCache();
  return toMethod(raw, 0);
}

/**
 * POST /api/payments/create.
 *
 * Wallet payments debit the wallet server-side (never below ₹0); COD is
 * recorded as pending. Online rails throw until they are switched on.
 */
export async function createPayment(input: {
  amount: number;
  method: PaymentKind;
  orderId?: string;
  purpose?: string;
  paymentReference?: string;
}): Promise<{ ok: boolean; message: string; payment: PaymentRecord; wallet: Wallet | null }> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new ApiError("validation", "Payment amount must be greater than ₹0.");
  }
  if (!isOnline()) throw new ApiError("offline", "Reconnect to complete this payment.");
  const raw = await apiPostJson<{
    ok?: boolean;
    message?: string;
    payment?: RawPayment;
    wallet?: unknown;
  }>(PAYMENTS_API_ENDPOINTS.createPayment, {
    amount: input.amount,
    method: input.method,
    orderId: input.orderId ?? null,
    purpose: input.purpose ?? "Order payment",
    paymentReference: input.paymentReference ?? null,
  });
  invalidateWalletCache();
  clearCache(CACHE_KEYS.refunds);
  return {
    ok: raw.ok ?? true,
    message: raw.message ?? "Payment recorded.",
    payment: toPayment(raw.payment ?? {}, 0),
    wallet: (raw.wallet as Wallet | null) ?? null,
  };
}
