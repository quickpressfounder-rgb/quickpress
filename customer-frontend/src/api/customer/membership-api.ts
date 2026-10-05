/**
 * Membership data layer — Sprint 2.9.
 *
 * Every call maps 1:1 to a FastAPI endpoint served by `backend-python`:
 *
 *   GET  /api/membership            current plan, expiry, remaining days
 *   GET  /api/membership/plans      Free / Silver / Gold / Premium catalogue
 *   POST /api/membership/subscribe  subscribe, renew or upgrade
 *   POST /api/membership/cancel     cancel the active membership
 *   GET  /api/membership/history    subscription / renewal / payment ledger
 *   GET  /api/membership/benefits   benefit catalogue + active benefits
 *
 * Reads are cache-first so the screen paints instantly on a warm start and
 * still renders (flagged as cached) when the device is offline. Mutations
 * invalidate the cache so the next read is authoritative.
 */

import { apiGetJson, apiPostJson } from "../core/transport";
import { ApiError } from "../core/errors";
import { CACHE_KEYS, readCache, readStaleCache, writeCache } from "./api/cache";
import { isOnline } from "./api/network";
import { readToken } from "../core/session-store";

export type MembershipPlanId = "silver" | "gold" | "platinum" | "elite" | string;
export type BillingCycle = "monthly" | "yearly";
export type MembershipStatus = "active" | "expired" | "cancelled" | "none";
export type MembershipPaymentStatus = "paid" | "pending" | "failed" | "free" | "refunded";
export type MembershipTransactionType = "subscribe" | "renew" | "upgrade" | "cancel" | "expire";

export type MembershipBenefit = {
  id: string;
  title: string;
  description: string;
  icon: string;
  plans: MembershipPlanId[];
};

export type MembershipPlan = {
  id: MembershipPlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlySavings: number;
  savingsLabel: string;
  validityDays: number;
  yearlyValidityDays: number;
  validityLabel: string;
  popular: boolean;
  order: number;
  monthlyOrderLimit?: number;
  monthlyWeightLimitKg?: number;
  freeExpressCount?: number;
  benefits: MembershipBenefit[];
};

export type MembershipQuota = {
  totalOrders: number;
  usedOrders: number;
  remainingOrders: number;
  totalWeightKg: number;
  usedWeightKg: number;
  remainingWeightKg: number;
  freeExpressTotal: number;
  freeExpressUsed: number;
  freeExpressRemaining: number;
  totalSavings: number;
};

export type MembershipOrderLog = {
  orderId: string;
  orderCode: string;
  placedAt: string;
  services: string[];
  itemCount: number;
  totalAmount: number;
  discountSaved: number;
  deliverySaved: number;
  totalSaved: number;
  status: string;
};

export type Membership = {
  planId: MembershipPlanId;
  planName: string;
  status: MembershipStatus;
  active: boolean;
  billingCycle: BillingCycle | null;
  amountPaid: number;
  startedAt: string | null;
  startedLabel: string;
  expiresAt: string | null;
  expiresLabel: string;
  cancelledAt: string | null;
  autoRenew: boolean;
  remainingDays: number;
  canRenew: boolean;
  canCancel: boolean;
  plan: MembershipPlan | null;
  benefits: MembershipBenefit[];
  quota: MembershipQuota;
  membershipOrders: MembershipOrderLog[];
  /** True when the payload came from the local cache (offline / stale read). */
  fromCache: boolean;
};


export type MembershipTransaction = {
  id: string;
  planId: MembershipPlanId;
  planName: string;
  type: MembershipTransactionType;
  billingCycle: BillingCycle;
  amount: number;
  paymentStatus: MembershipPaymentStatus;
  paymentReference: string | null;
  subscribedAt: string;
  subscribedLabel: string;
  renewalAt: string | null;
  renewalLabel: string;
  expiresAt: string | null;
  expiresLabel: string;
};

export type MembershipPlans = {
  plans: MembershipPlan[];
  currentPlanId: MembershipPlanId;
  fromCache: boolean;
};

export type MembershipHistory = {
  items: MembershipTransaction[];
  total: number;
  fromCache: boolean;
};

export type MembershipBenefits = {
  items: MembershipBenefit[];
  activeBenefits: MembershipBenefit[];
  planId: MembershipPlanId;
};

/* ------------------------------ raw payloads ----------------------------- */

type RawBenefit = {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  plans?: string[];
};

type RawPlan = {
  id?: string;
  name?: string;
  tagline?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  yearlySavings?: number;
  savingsLabel?: string;
  validityDays?: number;
  yearlyValidityDays?: number;
  popular?: boolean;
  order?: number;
  benefits?: RawBenefit[];
};

type RawMembership = {
  planId?: string;
  planName?: string;
  status?: string;
  active?: boolean;
  billingCycle?: string | null;
  amountPaid?: number;
  startedAt?: string | null;
  expiresAt?: string | null;
  cancelledAt?: string | null;
  autoRenew?: boolean;
  remainingDays?: number;
  canRenew?: boolean;
  canCancel?: boolean;
  plan?: RawPlan | null;
  benefits?: RawBenefit[];
};

type RawTransaction = {
  id?: string;
  planId?: string;
  planName?: string;
  type?: string;
  billingCycle?: string;
  amount?: number;
  paymentStatus?: string;
  paymentReference?: string | null;
  subscribedAt?: string;
  renewalAt?: string | null;
  expiresAt?: string | null;
};

type RawPlans = { plans?: RawPlan[]; currentPlanId?: string };
type RawHistory = { items?: RawTransaction[]; total?: number };
type RawBenefits = { items?: RawBenefit[]; activeBenefits?: RawBenefit[]; planId?: string };

/* -------------------------------- mapping -------------------------------- */

const PLAN_IDS: MembershipPlanId[] = ["free", "silver", "gold", "premium"];

export function formatMembershipDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMembershipPrice(amount: number): string {
  return amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : "Free";
}

function toPlanId(value: string | undefined | null): MembershipPlanId {
  return PLAN_IDS.includes(value as MembershipPlanId) ? (value as MembershipPlanId) : "free";
}

function toBenefit(raw: RawBenefit, index: number): MembershipBenefit {
  return {
    id: raw.id ?? `benefit-${index}`,
    title: raw.title ?? "Member benefit",
    description: raw.description ?? "",
    icon: raw.icon ?? "sparkles",
    plans: (raw.plans ?? []).map(toPlanId),
  };
}

function toPlan(raw: RawPlan, index: number): MembershipPlan {
  const monthly = Number(raw.monthlyPrice ?? 0);
  const yearly = Number(raw.yearlyPrice ?? 0);
  const savings = Number(raw.yearlySavings ?? Math.max(monthly * 12 - yearly, 0));
  const validityDays = Number(raw.validityDays ?? 30);
  return {
    id: toPlanId(raw.id),
    name: raw.name ?? "Plan",
    tagline: raw.tagline ?? "",
    monthlyPrice: monthly,
    yearlyPrice: yearly,
    yearlySavings: savings,
    savingsLabel: raw.savingsLabel ?? (savings > 0 ? `Save ₹${savings} a year` : "Always free"),
    validityDays,
    yearlyValidityDays: Number(raw.yearlyValidityDays ?? 365),
    validityLabel: `Valid for ${validityDays} days`,
    popular: raw.popular ?? false,
    order: Number(raw.order ?? index + 1),
    benefits: (raw.benefits ?? []).map(toBenefit),
  };
}

function toMembership(raw: RawMembership): Membership {
  const status = (["active", "expired", "cancelled", "none"] as const).includes(
    raw.status as MembershipStatus,
  )
    ? (raw.status as MembershipStatus)
    : "none";
  const cycle = raw.billingCycle === "monthly" || raw.billingCycle === "yearly" ? raw.billingCycle : null;
  const planId = toPlanId(raw.planId);

  const rawQuota = (raw as any).quota || {};
  const quota: MembershipQuota = {
    totalOrders: Number(rawQuota.totalOrders ?? 0),
    usedOrders: Number(rawQuota.usedOrders ?? 0),
    remainingOrders: Number(rawQuota.remainingOrders ?? 0),
    totalWeightKg: Number(rawQuota.totalWeightKg ?? 0),
    usedWeightKg: Number(rawQuota.usedWeightKg ?? 0),
    remainingWeightKg: Number(rawQuota.remainingWeightKg ?? 0),
    freeExpressTotal: Number(rawQuota.freeExpressTotal ?? 0),
    freeExpressUsed: Number(rawQuota.freeExpressUsed ?? 0),
    freeExpressRemaining: Number(rawQuota.freeExpressRemaining ?? 0),
    totalSavings: Number(rawQuota.totalSavings ?? 0),
  };

  const rawOrders = (raw as any).membershipOrders || [];
  const membershipOrders: MembershipOrderLog[] = rawOrders.map((o: any) => ({
    orderId: String(o.orderId ?? ""),
    orderCode: String(o.orderCode ?? ""),
    placedAt: String(o.placedAt ?? ""),
    services: Array.isArray(o.services) ? o.services.map(String) : [],
    itemCount: Number(o.itemCount ?? 1),
    totalAmount: Number(o.totalAmount ?? 0),
    discountSaved: Number(o.discountSaved ?? 0),
    deliverySaved: Number(o.deliverySaved ?? 0),
    totalSaved: Number(o.totalSaved ?? 0),
    status: String(o.status ?? "placed"),
  }));

  return {
    planId,
    planName: raw.planName ?? "Free",
    status,
    active: raw.active ?? status === "active",
    billingCycle: cycle,
    amountPaid: Number(raw.amountPaid ?? 0),
    startedAt: raw.startedAt ?? null,
    startedLabel: formatMembershipDate(raw.startedAt),
    expiresAt: raw.expiresAt ?? null,
    expiresLabel: formatMembershipDate(raw.expiresAt),
    cancelledAt: raw.cancelledAt ?? null,
    autoRenew: raw.autoRenew ?? false,
    remainingDays: Math.max(Number(raw.remainingDays ?? 0), 0),
    canRenew: raw.canRenew ?? true,
    canCancel: raw.canCancel ?? false,
    plan: raw.plan ? toPlan(raw.plan, 0) : null,
    benefits: (raw.benefits ?? []).map(toBenefit),
    quota,
    membershipOrders,
    fromCache: false,
  };
}


function toTransaction(raw: RawTransaction, index: number): MembershipTransaction {
  const subscribedAt = raw.subscribedAt ?? new Date().toISOString();
  const paymentStatus = (["paid", "pending", "failed", "free", "refunded"] as const).includes(
    raw.paymentStatus as MembershipPaymentStatus,
  )
    ? (raw.paymentStatus as MembershipPaymentStatus)
    : "paid";
  const type = (["subscribe", "renew", "upgrade", "cancel", "expire"] as const).includes(
    raw.type as MembershipTransactionType,
  )
    ? (raw.type as MembershipTransactionType)
    : "subscribe";
  return {
    id: raw.id ?? `membership-txn-${index}`,
    planId: toPlanId(raw.planId),
    planName: raw.planName ?? "Membership",
    type,
    billingCycle: raw.billingCycle === "yearly" ? "yearly" : "monthly",
    amount: Number(raw.amount ?? 0),
    paymentStatus,
    paymentReference: raw.paymentReference ?? null,
    subscribedAt,
    subscribedLabel: formatMembershipDate(subscribedAt),
    renewalAt: raw.renewalAt ?? null,
    renewalLabel: formatMembershipDate(raw.renewalAt),
    expiresAt: raw.expiresAt ?? null,
    expiresLabel: formatMembershipDate(raw.expiresAt),
  };
}

/* --------------------------------- reads --------------------------------- */

function cachedMembership(stale: boolean): Membership | null {
  const value = stale
    ? readStaleCache<RawMembership>(CACHE_KEYS.membership)
    : readCache<RawMembership>(CACHE_KEYS.membership);
  if (!value) return null;
  return { ...toMembership(value), fromCache: true };
}

/** Cache-first membership read; pass `forceRefresh` for pull-to-refresh. */
export async function fetchMembership(
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<Membership> {
  const token = readToken();
  if (!token) {
    return { ...toMembership({ status: "none", planId: "free" }), fromCache: false };
  }
  if (!options.forceRefresh) {
    const fresh = cachedMembership(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) {
    const stale = cachedMembership(true);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }
  try {
    const raw = await apiGetJson<RawMembership>("/api/membership", {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    writeCache(CACHE_KEYS.membership, raw);
    return toMembership(raw);
  } catch (error) {
    const stale = cachedMembership(true);
    if (stale) return stale;
    throw error;
  }
}

/** Read the cached membership without touching the network. */
export function readCachedMembership(): Membership | null {
  return cachedMembership(true);
}

function cachedPlans(stale: boolean): MembershipPlans | null {
  const value = stale
    ? readStaleCache<RawPlans>(CACHE_KEYS.membershipPlans)
    : readCache<RawPlans>(CACHE_KEYS.membershipPlans);
  if (!value) return null;
  const filtered = (value.plans ?? [])
    .map(toPlan)
    .filter((p) => p.id !== "free" && p.monthlyPrice > 0);
  return {
    plans: filtered,
    currentPlanId: toPlanId(value.currentPlanId),
    fromCache: true,
  };
}

export async function fetchMembershipPlans(
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<MembershipPlans> {
  if (!options.forceRefresh) {
    const fresh = cachedPlans(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) {
    const stale = cachedPlans(true);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }
  try {
    const raw = await apiGetJson<RawPlans>("/api/membership/plans", {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    writeCache(CACHE_KEYS.membershipPlans, raw);
    const filtered = (raw.plans ?? [])
      .map(toPlan)
      .filter((p) => p.id !== "free" && p.monthlyPrice > 0);
    return {
      plans: filtered,
      currentPlanId: toPlanId(raw.currentPlanId),
      fromCache: false,
    };
  } catch (error) {
    const stale = cachedPlans(true);
    if (stale) return stale;
    throw error;
  }
}


function cachedHistory(stale: boolean): MembershipHistory | null {
  const value = stale
    ? readStaleCache<RawHistory>(CACHE_KEYS.membershipHistory)
    : readCache<RawHistory>(CACHE_KEYS.membershipHistory);
  if (!value) return null;
  const items = (value.items ?? []).map(toTransaction);
  return { items, total: value.total ?? items.length, fromCache: true };
}

export async function fetchMembershipHistory(
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<MembershipHistory> {
  if (!options.forceRefresh) {
    const fresh = cachedHistory(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) {
    const stale = cachedHistory(true);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }
  try {
    const raw = await apiGetJson<RawHistory>("/api/membership/history", {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    writeCache(CACHE_KEYS.membershipHistory, raw);
    const items = (raw.items ?? []).map(toTransaction);
    return { items, total: raw.total ?? items.length, fromCache: false };
  } catch (error) {
    const stale = cachedHistory(true);
    if (stale) return stale;
    throw error;
  }
}

export async function fetchMembershipBenefits(): Promise<MembershipBenefits> {
  if (!isOnline()) {
    const stale = cachedMembership(true);
    const benefits = stale?.benefits ?? [];
    return { items: benefits, activeBenefits: benefits, planId: stale?.planId ?? "free" };
  }
  const raw = await apiGetJson<RawBenefits>("/api/membership/benefits");
  return {
    items: (raw.items ?? []).map(toBenefit),
    activeBenefits: (raw.activeBenefits ?? []).map(toBenefit),
    planId: toPlanId(raw.planId),
  };
}

/* ------------------------------- mutations ------------------------------- */

function invalidateMembershipCache() {
  writeCache(CACHE_KEYS.membership, null as unknown as RawMembership);
  writeCache(CACHE_KEYS.membershipPlans, null as unknown as RawPlans);
  writeCache(CACHE_KEYS.membershipHistory, null as unknown as RawHistory);
}

export type SubscribeResult = {
  ok: boolean;
  message: string;
  membership: Membership;
  transaction: MembershipTransaction | null;
};

/**
 * Subscribe / renew / upgrade. `paymentReference` is accepted today and stored
 * on the transaction so a real gateway can be plugged in without an API change.
 */
export async function subscribeMembership(
  planId: MembershipPlanId,
  billingCycle: BillingCycle = "monthly",
  paymentReference?: string,
): Promise<SubscribeResult> {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to update your membership.");
  const raw = await apiPostJson<{
    ok?: boolean;
    message?: string;
    membership?: RawMembership;
    transaction?: RawTransaction | null;
  }>("/api/membership/subscribe", {
    planId,
    billingCycle,
    ...(paymentReference ? { paymentReference } : {}),
  });
  invalidateMembershipCache();
  return {
    ok: raw.ok ?? true,
    message: raw.message ?? "Membership updated.",
    membership: toMembership(raw.membership ?? {}),
    transaction: raw.transaction ? toTransaction(raw.transaction, 0) : null,
  };
}

export async function cancelMembership(reason?: string): Promise<{
  ok: boolean;
  message: string;
  membership: Membership;
}> {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to cancel your membership.");
  const raw = await apiPostJson<{
    ok?: boolean;
    message?: string;
    membership?: RawMembership;
  }>("/api/membership/cancel", reason ? { reason } : {});
  invalidateMembershipCache();
  return {
    ok: raw.ok ?? true,
    message: raw.message ?? "Membership cancelled.",
    membership: toMembership(raw.membership ?? {}),
  };
}
