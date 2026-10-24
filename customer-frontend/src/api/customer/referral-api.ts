/**
 * Referral & rewards data layer — Sprint 2.8.
 *
 * Every call maps 1:1 to a FastAPI endpoint served by `backend-python`:
 *
 *   GET  /api/referral            dashboard: code, QR, stats, history, rewards
 *   GET  /api/referral/history    referred friends
 *   GET  /api/referral/rewards    pending / completed rewards
 *   GET  /api/referral/stats      counters
 *   POST /api/referral/apply      apply a friend's code
 *   POST /api/referral/invite     record an invite (copy / whatsapp / sms / share)
 *
 * The dashboard payload is cached locally, so the screen paints instantly on a
 * warm start and still renders (flagged as cached) when the device is offline.
 */

import { apiGetJson, apiPostJson } from "../core/transport";
import { ApiError } from "../core/errors";
import { CACHE_KEYS, readCache, readStaleCache, writeCache } from "./api/cache";
import { isOnline } from "./api/network";

export type ReferralStatus = "pending" | "completed" | "expired";
export type RewardStatus = "pending" | "completed";
export type InviteChannel = "copy" | "link" | "whatsapp" | "sms" | "share" | "email";

export type ReferralFriend = {
  id: string;
  friendName: string;
  joinedAt: string;
  joinedLabel: string;
  status: ReferralStatus;
  rewardEarned: number;
  completedAt: string | null;
};

export type ReferralReward = {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: RewardStatus;
  createdAt: string;
  dateLabel: string;
  creditedAt: string | null;
  referralId: string | null;
  friendName: string | null;
};

export type ReferralStats = {
  totalInvites: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewardsEarned: number;
  pendingRewards: number;
  walletRewards: number;
  referrerReward: number;
  refereeReward: number;
};

export type ReferralDashboard = {
  code: string;
  link: string;
  qrCodeUrl: string;
  active: boolean;
  appliedCode: string | null;
  canApply: boolean;
  shareMessage: string;
  stats: ReferralStats;
  history: ReferralFriend[];
  rewards: ReferralReward[];
  /** True when the payload came from the local cache (offline / stale read). */
  fromCache: boolean;
};

export type ApplyReferralResult = {
  ok: boolean;
  message: string;
  code: string;
  rewardAmount: number;
  appliedCode: string | null;
};

export type InviteResult = {
  ok: boolean;
  channel: InviteChannel;
  totalInvites: number;
  link: string;
  shareMessage: string;
};

/* ------------------------------ raw payloads ----------------------------- */

type RawStats = Partial<ReferralStats>;

type RawFriend = {
  id?: string;
  friendName?: string;
  joinedAt?: string;
  status?: string;
  rewardEarned?: number;
  completedAt?: string | null;
};

type RawReward = {
  id?: string;
  title?: string;
  description?: string;
  amount?: number;
  status?: string;
  createdAt?: string;
  creditedAt?: string | null;
  referralId?: string | null;
  friendName?: string | null;
};

type RawDashboard = {
  code?: string;
  link?: string;
  qrCodeUrl?: string;
  active?: boolean;
  appliedCode?: string | null;
  canApply?: boolean;
  shareMessage?: string;
  stats?: RawStats;
  history?: RawFriend[];
  rewards?: RawReward[];
};

/* -------------------------------- mapping -------------------------------- */

const DEFAULT_REFERRER_REWARD = 150;
const DEFAULT_REFEREE_REWARD = 150;

export function formatReferralDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function linkFor(code: string): string {
  return `https://withquickpress.com/invite/${code}`;
}

function qrFor(code: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(
    linkFor(code),
  )}`;
}

export function referralShareMessage(code: string, reward: number = 150, discount: number = 50): string {
  return `I use QuickPress for premium laundry & dry cleaning! Use my code ${code} to get ${discount}% OFF on your 1st order. ${linkFor(
    code,
  )}`;
}

function toStatus(value: string | undefined): ReferralStatus {
  return value === "completed" || value === "expired" ? value : "pending";
}

function toFriend(raw: RawFriend, index: number): ReferralFriend {
  const joinedAt = raw.joinedAt ?? new Date().toISOString();
  return {
    id: raw.id ?? `referral-${index}`,
    friendName: raw.friendName ?? "QuickPress friend",
    joinedAt,
    joinedLabel: formatReferralDate(joinedAt),
    status: toStatus(raw.status),
    rewardEarned: Number(raw.rewardEarned ?? 0),
    completedAt: raw.completedAt ?? null,
  };
}

function toReward(raw: RawReward, index: number): ReferralReward {
  const createdAt = raw.createdAt ?? new Date().toISOString();
  return {
    id: raw.id ?? `reward-${index}`,
    title: raw.title ?? "Referral reward",
    description: raw.description ?? "",
    amount: Number(raw.amount ?? 0),
    status: raw.status === "completed" ? "completed" : "pending",
    createdAt,
    dateLabel: formatReferralDate(raw.creditedAt ?? createdAt),
    creditedAt: raw.creditedAt ?? null,
    referralId: raw.referralId ?? null,
    friendName: raw.friendName ?? null,
  };
}

function toStats(raw: RawStats | undefined, rewards: ReferralReward[], history: ReferralFriend[]): ReferralStats {
  const earned =
    raw?.totalRewardsEarned ??
    rewards.filter((item) => item.status === "completed").reduce((sum, item) => sum + item.amount, 0);
  const pending =
    raw?.pendingRewards ??
    rewards.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  return {
    totalInvites: raw?.totalInvites ?? history.length,
    successfulReferrals:
      raw?.successfulReferrals ?? history.filter((item) => item.status === "completed").length,
    pendingReferrals:
      raw?.pendingReferrals ?? history.filter((item) => item.status === "pending").length,
    totalRewardsEarned: earned,
    pendingRewards: pending,
    walletRewards: raw?.walletRewards ?? earned,
    referrerReward: raw?.referrerReward ?? DEFAULT_REFERRER_REWARD,
    refereeReward: raw?.refereeReward ?? DEFAULT_REFEREE_REWARD,
  };
}

function toDashboard(raw: RawDashboard): ReferralDashboard {
  const code = (raw.code ?? "").toUpperCase();
  const history = (raw.history ?? []).map(toFriend);
  const rewards = (raw.rewards ?? []).map(toReward);
  return {
    code,
    link: raw.link ?? linkFor(code),
    qrCodeUrl: raw.qrCodeUrl ?? qrFor(code),
    active: raw.active ?? true,
    appliedCode: raw.appliedCode ?? null,
    canApply: raw.canApply ?? raw.appliedCode == null,
    shareMessage: raw.shareMessage ?? referralShareMessage(code),
    stats: toStats(raw.stats, rewards, history),
    history,
    rewards,
    fromCache: false,
  };
}

/* --------------------------------- reads --------------------------------- */

function cached(stale: boolean): ReferralDashboard | null {
  const value = stale
    ? readStaleCache<RawDashboard>(CACHE_KEYS.referral)
    : readCache<RawDashboard>(CACHE_KEYS.referral);
  if (!value) return null;
  return { ...toDashboard(value), fromCache: true };
}

/** Cache-first dashboard read; pass `forceRefresh` for pull-to-refresh. */
export async function fetchReferralDashboard(
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<ReferralDashboard> {
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
    const raw = await apiGetJson<RawDashboard>("/api/referral", {
      ...(options.signal ? { signal: options.signal } : {}),
    });
    writeCache(CACHE_KEYS.referral, raw);
    return toDashboard(raw);
  } catch (error) {
    const stale = cached(true);
    if (stale) return stale;
    throw error;
  }
}

/** Read the cached dashboard without touching the network. */
export function readCachedReferralDashboard(): ReferralDashboard | null {
  return cached(true);
}

export async function fetchReferralHistory(): Promise<ReferralFriend[]> {
  if (!isOnline()) return cached(true)?.history ?? [];
  const raw = await apiGetJson<{ items?: RawFriend[] } | RawFriend[]>("/api/referral/history");
  const items = Array.isArray(raw) ? raw : (raw.items ?? []);
  return items.map(toFriend);
}

export async function fetchReferralRewards(): Promise<{
  items: ReferralReward[];
  pendingRewards: number;
  completedRewards: number;
  walletRewards: number;
}> {
  if (!isOnline()) {
    const list = cached(true)?.rewards ?? [];
    return {
      items: list,
      pendingRewards: list
        .filter((item) => item.status === "pending")
        .reduce((sum, item) => sum + item.amount, 0),
      completedRewards: list
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + item.amount, 0),
      walletRewards: list
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + item.amount, 0),
    };
  }
  const raw = await apiGetJson<{
    items?: RawReward[];
    pendingRewards?: number;
    completedRewards?: number;
    walletRewards?: number;
  }>("/api/referral/rewards");
  const items = (raw.items ?? []).map(toReward);
  const completed = items
    .filter((item) => item.status === "completed")
    .reduce((sum, item) => sum + item.amount, 0);
  return {
    items,
    pendingRewards:
      raw.pendingRewards ??
      items.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0),
    completedRewards: raw.completedRewards ?? completed,
    walletRewards: raw.walletRewards ?? completed,
  };
}

export async function fetchReferralStats(): Promise<ReferralStats> {
  if (!isOnline()) {
    const stale = cached(true);
    if (stale) return stale.stats;
    throw new ApiError("offline", "Device is offline");
  }
  const raw = await apiGetJson<RawStats>("/api/referral/stats");
  return toStats(raw, [], []);
}

/* ------------------------------- mutations ------------------------------- */

export async function applyReferralCode(code: string): Promise<ApplyReferralResult> {
  const normalised = code.trim().toUpperCase();
  if (normalised.length < 3) {
    throw new ApiError("validation", "Enter a valid referral code.", 422);
  }
  if (!isOnline()) throw new ApiError("offline", "Reconnect to apply a referral code.");

  const raw = await apiPostJson<{
    ok?: boolean;
    message?: string;
    code?: string;
    rewardAmount?: number;
    appliedCode?: string | null;
    detail?: string;
  }>("/api/referral/apply", { code: normalised });

  // The dashboard changed — drop the cache so the next read is authoritative.
  writeCache(CACHE_KEYS.referral, null as unknown as RawDashboard);
  return {
    ok: raw.ok ?? true,
    message: raw.message ?? raw.detail ?? "Referral code applied.",
    code: raw.code ?? normalised,
    rewardAmount: Number(raw.rewardAmount ?? DEFAULT_REFEREE_REWARD),
    appliedCode: raw.appliedCode ?? normalised,
  };
}

export async function recordReferralInvite(
  channel: InviteChannel,
  contact?: string,
): Promise<InviteResult | null> {
  if (!isOnline()) return null;
  try {
    const raw = await apiPostJson<Partial<InviteResult>>("/api/referral/invite", {
      channel,
      ...(contact ? { contact } : {}),
    });
    return {
      ok: raw.ok ?? true,
      channel: raw.channel ?? channel,
      totalInvites: Number(raw.totalInvites ?? 0),
      link: raw.link ?? "",
      shareMessage: raw.shareMessage ?? "",
    };
  } catch {
    // Invite tracking is best effort — never block the share sheet on it.
    return null;
  }
}

/* -------------------------------- sharing -------------------------------- */

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function smsShareUrl(message: string): string {
  return `sms:?&body=${encodeURIComponent(message)}`;
}

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function nativeShareReferral(message: string, link: string): Promise<boolean> {
  if (!canNativeShare()) return false;
  try {
    await navigator.share({ title: "QuickPress referral", text: message, url: link });
    return true;
  } catch {
    return false;
  }
}

export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "true");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
