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
import { openRazorpayCheckout } from "../core/razorpay";
import type { RazorpayOrderResult } from "@/shared/types/payment";

export type MembershipPlanId = "silver" | "gold" | "platinum" | "elite" | string;
export type BillingCycle = "monthly" | "quarterly" | "yearly";
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
  quarterlyPrice?: number;
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
  if (!value) return "free";
  return String(value).toLowerCase().trim();
}

export const DEFAULT_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "silver",
    name: "Silver VIP",
    tagline: "5 Free deliveries/mo + 10% discount on laundry",
    monthlyPrice: 99,
    yearlyPrice: 999,
    yearlySavings: 189,
    savingsLabel: "Save ₹189 a year",
    validityDays: 30,
    yearlyValidityDays: 365,
    validityLabel: "Valid for 30 days",
    popular: false,
    order: 1,
    monthlyOrderLimit: 5,
    monthlyWeightLimitKg: 20,
    freeExpressCount: 1,
    benefits: [
      { id: "free-pickup", title: "Free Doorstep Pickup", description: "Doorstep pickup at ₹0 on every order", icon: "package", plans: ["silver", "gold", "platinum", "elite"] },
      { id: "free-delivery", title: "5 Free Deliveries / mo", description: "Free doorstep delivery on orders above ₹149", icon: "truck", plans: ["silver", "gold", "platinum", "elite"] },
      { id: "extra-discount", title: "10% Laundry Discount", description: "Flat 10% discount on all washing & ironing", icon: "percent", plans: ["silver", "gold", "platinum", "elite"] },
      { id: "free-express", title: "1 Free Express Pickup", description: "Priority 24h wash & press", icon: "clock", plans: ["silver", "gold", "platinum", "elite"] },
    ],
  },
  {
    id: "gold",
    name: "Gold VIP",
    tagline: "15 Free deliveries/mo + 15% discount & priority queue",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    yearlySavings: 398,
    savingsLabel: "Save ₹398 a year",
    validityDays: 30,
    yearlyValidityDays: 365,
    validityLabel: "Valid for 30 days",
    popular: true,
    order: 2,
    monthlyOrderLimit: 15,
    monthlyWeightLimitKg: 50,
    freeExpressCount: 3,
    benefits: [
      { id: "free-pickup", title: "Free Doorstep Pickup", description: "Doorstep pickup at ₹0 on every order", icon: "package", plans: ["silver", "gold", "platinum", "elite"] },
      { id: "free-delivery", title: "15 Free Deliveries / mo", description: "Free delivery with zero surge fees", icon: "truck", plans: ["silver", "gold", "platinum", "elite"] },
      { id: "extra-discount", title: "15% Laundry Discount", description: "Extra 15% discount on all services", icon: "percent", plans: ["gold", "platinum", "elite"] },
      { id: "priority-processing", title: "Priority Wash Queue", description: "Jump the queue with prioritized machine cycles", icon: "zap", plans: ["gold", "platinum", "elite"] },
      { id: "free-express", title: "3 Free Express Pickups", description: "24-hour turnaround guaranteed", icon: "clock", plans: ["gold", "platinum", "elite"] },
    ],
  },
  {
    id: "platinum",
    name: "Platinum VIP",
    tagline: "30 Free deliveries/mo + 20% discount & Free Surge waiver",
    monthlyPrice: 349,
    yearlyPrice: 3490,
    yearlySavings: 698,
    savingsLabel: "Save ₹698 a year",
    validityDays: 30,
    yearlyValidityDays: 365,
    validityLabel: "Valid for 30 days",
    popular: false,
    order: 3,
    monthlyOrderLimit: 30,
    monthlyWeightLimitKg: 100,
    freeExpressCount: 10,
    benefits: [
      { id: "free-pickup", title: "Free Doorstep Pickup", description: "Doorstep pickup at ₹0 on every order", icon: "package", plans: ["silver", "gold", "platinum", "elite"] },
      { id: "free-delivery", title: "30 Free Deliveries / mo", description: "Unlimited doorstep delivery waiver", icon: "truck", plans: ["platinum", "elite"] },
      { id: "extra-discount", title: "20% Laundry Discount", description: "20% off all laundry, steam press & shoe care", icon: "percent", plans: ["platinum", "elite"] },
      { id: "free-express", title: "10 Free Express Deliveries", description: "Fastest express delivery at zero surcharge", icon: "clock", plans: ["platinum", "elite"] },
      { id: "surge-waiver", title: "Surge & Rain Protection", description: "Never pay surge during monsoons or peak hours", icon: "sparkles", plans: ["platinum", "elite"] },
    ],
  },
  {
    id: "elite",
    name: "Elite VIP",
    tagline: "Unlimited Free Deliveries + 25% Off + Personal Concierge",
    monthlyPrice: 599,
    yearlyPrice: 5990,
    yearlySavings: 1198,
    savingsLabel: "Save ₹1,198 a year",
    validityDays: 30,
    yearlyValidityDays: 365,
    validityLabel: "Valid for 30 days",
    popular: false,
    order: 4,
    monthlyOrderLimit: 999,
    monthlyWeightLimitKg: 999,
    freeExpressCount: 999,
    benefits: [
      { id: "free-pickup", title: "Free Doorstep Pickup", description: "Doorstep pickup at ₹0 on every order", icon: "package", plans: ["elite"] },
      { id: "free-delivery", title: "Unlimited Free Deliveries", description: "No minimum order requirement", icon: "truck", plans: ["elite"] },
      { id: "extra-discount", title: "25% Laundry Discount", description: "Maximum platform discount across all categories", icon: "percent", plans: ["elite"] },
      { id: "concierge-support", title: "Personal Concierge", description: "Dedicated relationship manager for all orders", icon: "headphones", plans: ["elite"] },
    ],
  },
];

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
  const planId = toPlanId(raw.id);
  const monthly = Number(raw.monthlyPrice ?? 0);
  const yearly = Number(raw.yearlyPrice ?? 0);
  const savings = Number(raw.yearlySavings ?? Math.max(monthly * 12 - yearly, 0));
  const validityDays = Number(raw.validityDays ?? 30);
  return {
    id: planId,
    name: raw.name ?? (planId ? planId.charAt(0).toUpperCase() + planId.slice(1) : "Plan"),
    tagline: raw.tagline ?? "",
    monthlyPrice: monthly,
    quarterlyPrice: Number((raw as any).quarterlyPrice ?? (raw as any).quarterly_price ?? 0),
    yearlyPrice: yearly,
    yearlySavings: savings,
    savingsLabel: raw.savingsLabel ?? (savings > 0 ? `Save ₹${savings} a year` : "Always free"),
    validityDays,
    yearlyValidityDays: Number(raw.yearlyValidityDays ?? 365),
    validityLabel: `Valid for ${validityDays} days`,
    popular: raw.popular ?? false,
    order: Number(raw.order ?? index + 1),
    monthlyOrderLimit: Number((raw as any).monthlyOrderLimit ?? (raw as any).monthly_order_limit ?? 0),
    monthlyWeightLimitKg: Number((raw as any).monthlyWeightLimitKg ?? (raw as any).monthly_weight_limit_kg ?? 0),
    freeExpressCount: Number((raw as any).freeExpressCount ?? (raw as any).free_express_count ?? 0),
    benefits: (raw.benefits ?? []).map(toBenefit),
  };
}

function toMembership(raw: RawMembership): Membership {
  const status = (["active", "expired", "cancelled", "none"] as const).includes(
    raw.status as MembershipStatus,
  )
    ? (raw.status as MembershipStatus)
    : "none";
  const cycle = raw.billingCycle === "monthly" || raw.billingCycle === "quarterly" || raw.billingCycle === "yearly" ? raw.billingCycle : null;
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
    billingCycle: (["monthly", "quarterly", "yearly"] as const).includes(raw.billingCycle as BillingCycle)
      ? (raw.billingCycle as BillingCycle)
      : "monthly",
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
  const list = filtered.length > 0 ? filtered : DEFAULT_MEMBERSHIP_PLANS;
  return {
    plans: list,
    currentPlanId: toPlanId(value.currentPlanId),
    fromCache: true,
  };
}

export async function fetchMembershipPlans(
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<MembershipPlans> {
  if (!options.forceRefresh) {
    const fresh = cachedPlans(false);
    if (fresh && fresh.plans.length > 0) return fresh;
  }
  try {
    const raw = await apiGetJson<RawPlans>("/api/membership/plans", {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    writeCache(CACHE_KEYS.membershipPlans, raw);
    const mapped = (raw.plans ?? [])
      .map(toPlan)
      .filter((p) => p.id !== "free" && p.monthlyPrice > 0);
    const list = mapped.length > 0 ? mapped : DEFAULT_MEMBERSHIP_PLANS;
    return {
      plans: list,
      currentPlanId: toPlanId(raw.currentPlanId),
      fromCache: false,
    };
  } catch (error) {
    console.warn("Could not fetch live membership plans from server, using default active catalogue:", error);
    const stale = cachedPlans(true);
    if (stale && stale.plans.length > 0) return stale;
    return {
      plans: DEFAULT_MEMBERSHIP_PLANS,
      currentPlanId: "free",
      fromCache: true,
    };
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

export type MembershipRazorpayOrder = {
  ok: boolean;
  keyId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  billingCycle: string;
};

export async function createMembershipRazorpayOrder(
  planId: MembershipPlanId,
  billingCycle: BillingCycle = "monthly",
): Promise<MembershipRazorpayOrder> {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to create your membership order.");
  return await apiPostJson<MembershipRazorpayOrder>("/api/membership/razorpay/create-order", {
    planId,
    billingCycle,
  });
}

export async function verifyMembershipRazorpayPayment(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  planId: string;
  billingCycle: BillingCycle;
}): Promise<SubscribeResult> {
  if (!isOnline()) throw new ApiError("offline", "Reconnect to verify your membership payment.");
  const raw = await apiPostJson<{
    ok?: boolean;
    message?: string;
    membership?: RawMembership;
    transaction?: RawTransaction | null;
  }>("/api/membership/razorpay/verify-payment", payload);
  invalidateMembershipCache();
  return {
    ok: raw.ok ?? true,
    message: raw.message ?? "Membership activated successfully!",
    membership: toMembership(raw.membership ?? {}),
    transaction: raw.transaction ? toTransaction(raw.transaction, 0) : null,
  };
}

export async function payMembershipWithRazorpay(input: {
  planId: MembershipPlanId;
  billingCycle: BillingCycle;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  planName?: string;
  amount?: number;
}): Promise<{
  status: "success" | "user_dropped" | "failed";
  message?: string;
  membership?: Membership;
}> {
  const order = await createMembershipRazorpayOrder(input.planId, input.billingCycle);

  const checkoutOrder: RazorpayOrderResult = {
    ok: true,
    paymentId: order.gatewayOrderId,
    gatewayOrderId: order.gatewayOrderId,
    keyId: order.keyId,
    currency: order.currency || "INR",
    amount: order.amount,
    walletApplied: 0,
    payableAmount: order.amount,
    amountInPaise: Math.round(order.amount * 100),
    fullyPaidByWallet: false,
    receipt: `rcpt_${order.gatewayOrderId}`,
    notes: {
      planId: input.planId,
      billingCycle: input.billingCycle,
      purpose: `QuickPress Membership: ${input.planName || "VIP"}`,
    },
  };

  const outcome = await openRazorpayCheckout(checkoutOrder, {
    description: `QuickPress ${input.planName || "VIP"} (${input.billingCycle})`,
    profile: {
      name: input.customerName || "Customer",
      contact: input.customerPhone ? input.customerPhone.replace(/\D/g, "") : "",
      email: input.customerEmail || "",
    },
    appName: "QuickPress",
    themeColor: "#059669",
  });

  if (outcome.status === "dismissed") {
    return { status: "user_dropped", message: outcome.reason || "Payment cancelled." };
  }
  if (outcome.status === "failed") {
    return { status: "failed", message: outcome.reason || "Payment failed." };
  }

  const result = await verifyMembershipRazorpayPayment({
    razorpayOrderId: outcome.razorpayOrderId || order.gatewayOrderId,
    razorpayPaymentId: outcome.razorpayPaymentId,
    razorpaySignature: outcome.razorpaySignature || "",
    planId: input.planId,
    billingCycle: input.billingCycle,
  });

  return {
    status: "success",
    message: result.message,
    membership: result.membership,
  };
}
