/**
 * Wallet data layer — Sprint 2.10.
 *
 * Maps 1:1 to FastAPI endpoints served by `backend-python`:
 *
 *   GET  /api/wallet             balances + the five most recent entries
 *   GET  /api/wallet/history     full wallet transaction ledger
 *   POST /api/wallet/add-funds   quick (₹100/₹200/₹500/₹1000) or custom top-up
 *
 * Reads are cache-first so the screen paints instantly on a warm start and
 * still renders (flagged `fromCache`) while the device is offline. Mutations
 * invalidate the cache so the next read is authoritative.
 */

import { apiGetJson, apiPostJson } from "../core/transport";
import { ApiError } from "../core/errors";
import { CACHE_KEYS, clearCache, readCache, readStaleCache, writeCache } from "./api/cache";
import { isOnline } from "./api/network";

export type WalletTransactionKind =
  | "add-funds"
  | "order-payment"
  | "refund"
  | "order-cashback"
  | "referral-bonus"
  | "reward-credit"
  | "membership-credit"
  | "recharge";

export type TransactionKind = WalletTransactionKind;
export type TransactionStatus = "success" | "pending" | "failed";
export type TransactionDirection = "credit" | "debit";

/** Quick amounts offered on the Add Funds sheet. */
export const QUICK_AMOUNTS = [100, 200, 500, 1000] as const;

export type WalletBalances = {
  currentBalance: number;
  pendingBalance: number;
  rewardBalance: number;
  membershipCredits: number;
  currency: string;
};

export type WalletTransaction = {
  id: string;
  kind: WalletTransactionKind;
  title: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  status: TransactionStatus;
  balanceAfter: number;
  method: string | null;
  reference: string | null;
  createdAt: string;
  /** Pre-formatted for the UI — "5 Aug 2026". */
  dateLabel: string;
};

export type Wallet = {
  balances: WalletBalances;
  totalBalance: number;
  recentTransactions: WalletTransaction[];
  updatedAt: string | null;
  /** Mirrored from the referral service so the refer-and-earn block renders. */
  referralCode: string;
  referralEarned: number;
  fromCache: boolean;
};

export type WalletHistory = {
  items: WalletTransaction[];
  total: number;
  fromCache: boolean;
};

/* ------------------------------ raw payloads ----------------------------- */

type RawBalances = Partial<WalletBalances> & { currency?: string };

type RawTransaction = {
  id?: string;
  kind?: string;
  title?: string;
  description?: string;
  amount?: number;
  direction?: string;
  status?: string;
  balanceAfter?: number;
  method?: string | null;
  reference?: string | null;
  createdAt?: string;
  /** Legacy mock field. */
  date?: string;
};

type RawWallet = {
  balances?: RawBalances;
  totalBalance?: number;
  recentTransactions?: RawTransaction[];
  updatedAt?: string | null;
  referralCode?: string;
  referralEarned?: number;
  /** Legacy flat mock shape. */
  balance?: number;
  cashbackBalance?: number;
  rewardPoints?: number;
};

type RawHistory = { items?: RawTransaction[]; total?: number };

/* -------------------------------- mapping -------------------------------- */

const KINDS: WalletTransactionKind[] = [
  "add-funds",
  "order-payment",
  "refund",
  "order-cashback",
  "referral-bonus",
  "reward-credit",
  "membership-credit",
  "recharge",
];

export function formatWalletDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatAmount(amount: number): string {
  return `₹${Number(amount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toTransaction(raw: RawTransaction, index: number): WalletTransaction {
  const createdAt = raw.createdAt ?? raw.date ?? new Date().toISOString();
  const status: TransactionStatus = (["success", "pending", "failed"] as const).includes(
    raw.status as TransactionStatus,
  )
    ? (raw.status as TransactionStatus)
    : "success";
  return {
    id: raw.id ?? `wtx-${index}`,
    kind: KINDS.includes(raw.kind as WalletTransactionKind)
      ? (raw.kind as WalletTransactionKind)
      : "add-funds",
    title: raw.title ?? "Wallet activity",
    description: raw.description ?? "",
    amount: toNumber(raw.amount),
    direction: raw.direction === "debit" ? "debit" : "credit",
    status,
    balanceAfter: toNumber(raw.balanceAfter),
    method: raw.method ?? null,
    reference: raw.reference ?? null,
    createdAt,
    dateLabel: formatWalletDate(createdAt),
  };
}

function toBalances(raw: RawWallet): WalletBalances {
  const balances = raw.balances ?? {};
  return {
    currentBalance: toNumber(balances.currentBalance ?? raw.balance),
    pendingBalance: toNumber(balances.pendingBalance),
    rewardBalance: toNumber(balances.rewardBalance ?? raw.cashbackBalance),
    membershipCredits: toNumber(balances.membershipCredits),
    currency: balances.currency ?? "INR",
  };
}

function toWallet(raw: RawWallet, fromCache = false): Wallet {
  const balances = toBalances(raw);
  return {
    balances,
    totalBalance: toNumber(
      raw.totalBalance ??
        balances.currentBalance + balances.rewardBalance + balances.membershipCredits,
    ),
    recentTransactions: (raw.recentTransactions ?? []).map(toTransaction),
    updatedAt: raw.updatedAt ?? null,
    referralCode: raw.referralCode ?? "",
    referralEarned: toNumber(raw.referralEarned),
    fromCache,
  };
}

/* --------------------------------- reads --------------------------------- */

function cachedWallet(stale: boolean): Wallet | null {
  const value = stale
    ? readStaleCache<RawWallet>(CACHE_KEYS.wallet)
    : readCache<RawWallet>(CACHE_KEYS.wallet);
  return value ? toWallet(value, true) : null;
}

/** Read the cached wallet without touching the network (offline start). */
export function readCachedWallet(): Wallet | null {
  return cachedWallet(true);
}

/** Cache-first wallet read; pass `forceRefresh` for pull-to-refresh. */
export async function fetchWallet(
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<Wallet> {
  if (!options.forceRefresh) {
    const fresh = cachedWallet(false);
    if (fresh) return fresh;
  }
  if (!isOnline()) {
    const stale = cachedWallet(true);
    if (stale) return stale;
    throw new ApiError("offline", "Device is offline");
  }
  try {
    const raw = await apiGetJson<RawWallet>("/api/wallet", {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    writeCache(CACHE_KEYS.wallet, raw);
    return toWallet(raw);
  } catch (error) {
    const stale = cachedWallet(true);
    if (stale) return stale;
    throw error;
  }
}

function cachedHistory(stale: boolean): WalletHistory | null {
  const value = stale
    ? readStaleCache<RawHistory>(CACHE_KEYS.walletHistory)
    : readCache<RawHistory>(CACHE_KEYS.walletHistory);
  if (!value) return null;
  const items = (value.items ?? []).map(toTransaction);
  return { items, total: value.total ?? items.length, fromCache: true };
}

/** Cache-first wallet ledger — GET /api/wallet/history. */
export async function fetchWalletHistory(
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<WalletHistory> {
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
    const raw = await apiGetJson<RawHistory>("/api/wallet/history", {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    writeCache(CACHE_KEYS.walletHistory, raw);
    const items = (raw.items ?? []).map(toTransaction);
    return { items, total: raw.total ?? items.length, fromCache: false };
  } catch (error) {
    const stale = cachedHistory(true);
    if (stale) return stale;
    throw error;
  }
}

/* ------------------------------- mutations ------------------------------- */

export function invalidateWalletCache() {
  clearCache(CACHE_KEYS.wallet);
  clearCache(CACHE_KEYS.walletHistory);
  clearCache(CACHE_KEYS.payments);
}

export type AddFundsResult = {
  ok: boolean;
  message: string;
  wallet: Wallet;
  transaction: WalletTransaction | null;
};

/**
 * POST /api/wallet/add-funds.
 *
 * `method` defaults to the internal wallet rail; online rails (razorpay / upi /
 * cards) are validated server-side and rejected until production credentials
 * are configured.
 */
export async function addFunds(
  amount: number,
  method: string = "wallet",
  paymentId?: string,
  idempotencyKey?: string,
): Promise<AddFundsResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError("validation", "Enter an amount greater than ₹0.");
  }
  if (amount > 100000) {
    throw new ApiError("validation", "Amount can't exceed ₹1,00,000.");
  }
  if (!isOnline()) throw new ApiError("offline", "Reconnect to add money to your wallet.");
  const payload = {
    amount,
    method,
    ...(paymentId ? { paymentId, paymentReference: paymentId } : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
  };
  const headers: Record<string, string> = {};
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
    headers["X-Idempotency-Key"] = idempotencyKey;
  }
  const raw = await apiPostJson<{
    ok?: boolean;
    message?: string;
    wallet?: RawWallet;
    transaction?: RawTransaction | null;
  }>("/api/wallet/add-funds", payload, { headers });
  invalidateWalletCache();
  return {
    ok: raw.ok ?? true,
    message: raw.message ?? "Money added to your wallet.",
    wallet: toWallet(raw.wallet ?? {}),
    transaction: raw.transaction ? toTransaction(raw.transaction, 0) : null,
  };
}

