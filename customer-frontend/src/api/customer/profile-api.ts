/**
 * QuickPress Profile Screen — data layer.
 *
 *   GET  /api/profile
 *   PUT  /api/profile
 *   GET  /api/orders
 *   GET  /api/wallet
 *   GET  /api/wallet/transactions
 *   GET  /api/addresses
 *   GET  /api/membership
 *   GET  /api/app-meta
 *   GET  /api/notifications/unread-count
 *   POST /api/auth/logout
 */

import type {
  Account,
  AddressEntity,
  Order,
  TransactionEntity,
  WalletEntity,
} from "@/shared/types";

import { clearSession, readToken } from "../core/session-store";
import { apiGetJson, apiPostJson, apiRequest } from "../core/transport";
import { CACHE_KEYS, readCache, readStaleCache, writeCache } from "./api/cache";

export const PROFILE_API_ENDPOINTS = {
  profile: "/api/profile",
  updateProfile: "/api/profile",
  profilePhoto: "/api/profile/photo",
  orders: "/api/orders",
  wallet: "/api/wallet",
  transactions: "/api/wallet/transactions",
  addresses: "/api/addresses",
  membership: "/api/membership",
  appMeta: "/api/app-meta",
  unreadCount: "/api/notifications/unread-count",
  logout: "/api/auth/logout",
} as const;

export type ProfileUser = {
  name: string;
  initials: string;
  avatarUrl: string | null;
  verified: boolean;
  phone: string;
  email: string;
  city: string;
  memberSince: string;
  unreadNotifications: number;
};

export type ProfileStats = {
  totalOrders: number;
  rewardPoints: number;
  walletBalance: number;
  savedAddresses: number;
};

export type WalletTransaction = {
  id: string;
  title: string;
  note: string;
  amount: number;
  kind: "credit" | "debit";
};

export type Wallet = {
  balance: number;
  cashbackEarned: number;
  transactions: WalletTransaction[];
};

export type Membership = {
  plan: string;
  active: boolean;
  renewsOn: string;
  daysLeft: number;
  totalDays: number;
  savedThisYear: number;
};

export type ProfileData = {
  user: ProfileUser;
  stats: ProfileStats;
  wallet: Wallet;
  membership: Membership;
  appVersion: string;
};

type ProfileAccount = Account & {
  city?: string;
  photoUrl?: string | null;
  avatarUrl?: string | null;
  memberSince?: string;
};

/** A secondary panel failing must never blank the whole Profile screen. */
async function optional<T>(request: Promise<T>, fallback: T): Promise<T> {
  try {
    return await request;
  } catch {
    return fallback;
  }
}

const EMPTY_MEMBERSHIP: Membership = {
  plan: "QuickPress Free",
  active: false,
  renewsOn: "",
  daysLeft: 0,
  totalDays: 0,
  savedThisYear: 0,
};

const DEFAULT_GUEST_PROFILE: ProfileData = {
  user: {
    name: "",
    initials: "QP",
    avatarUrl: null,
    verified: false,
    phone: "",
    email: "",
    city: "Kasganj, Uttar Pradesh",
    memberSince: "August 2026",
    unreadNotifications: 0,
  },
  stats: {
    totalOrders: 0,
    rewardPoints: 0,
    walletBalance: 0,
    savedAddresses: 0,
  },
  wallet: {
    balance: 0,
    cashbackEarned: 0,
    transactions: [],
  },
  membership: EMPTY_MEMBERSHIP,
  appVersion: "1.0.0",
};

function composeProfile(input: {
  account: ProfileAccount;
  wallet: WalletEntity | null;
  transactions: TransactionEntity[];
  addresses: AddressEntity[];
  orders: Order[];
  membership: Membership;
  meta: { appVersion: string; memberSince: string };
  unread: number;
}): ProfileData {
  const account = input.account || ({} as ProfileAccount);
  const wallet = input.wallet;
  const name = (account.name && account.name !== "Customer" && account.name !== "Guest User") ? account.name : (account.phone || "");
  const initials = account.avatarInitials || (name && name.length >= 2 ? name.slice(0, 2).toUpperCase() : "QP");
  const phone = account.phone ? (account.phone.startsWith("+") ? account.phone : `+91 ${account.phone}`) : "";
  const orders = Array.isArray(input.orders) ? input.orders : [];
  const addresses = Array.isArray(input.addresses) ? input.addresses : [];
  const transactions = Array.isArray(input.transactions) ? input.transactions : [];

  const rawMem = (input.membership || {}) as any;
  let planTitle = "QuickPress Free";
  if (typeof rawMem.plan === "string") {
    planTitle = rawMem.plan;
  } else if (rawMem.plan && typeof rawMem.plan.name === "string") {
    planTitle = rawMem.plan.name;
  } else if (typeof rawMem.planName === "string") {
    planTitle = rawMem.planName;
  }

  const membership: Membership = {
    plan: planTitle || "QuickPress Free",
    active: Boolean(rawMem.active),
    renewsOn: rawMem.renewsOn || rawMem.expiresAt || (rawMem.active ? "Next month" : "Not active"),
    daysLeft: typeof rawMem.daysLeft === "number" ? rawMem.daysLeft : (rawMem.remainingDays ?? 0),
    totalDays: typeof rawMem.totalDays === "number" ? rawMem.totalDays : (rawMem.plan?.validityDays ?? 30),
    savedThisYear: typeof rawMem.savedThisYear === "number" ? rawMem.savedThisYear : (rawMem.totalSavings ?? 0),
  };

    const rawWallet = wallet as any;
    const realWalletBalance = Number(
      rawWallet?.balances?.currentBalance ??
      rawWallet?.totalBalance ??
      rawWallet?.balance ??
      0
    );
    const realCashback = Number(
      rawWallet?.balances?.rewardBalance ??
      rawWallet?.cashbackBalance ??
      0
    );
    const realRewardPoints = Number(
      rawWallet?.balances?.membershipCredits ??
      rawWallet?.rewardPoints ??
      0
    );

    return {
      user: {
        name,
        initials,
        avatarUrl: account.photoUrl ?? account.avatarUrl ?? null,
        verified: Boolean(account.isVerified),
        phone,
        email: account.email || "",
        city: account.city ?? "",
        memberSince: account.memberSince || input.meta?.memberSince || "Aug 2026",
        unreadNotifications: input.unread || 0,
      },
      stats: {
        totalOrders: orders.length,
        rewardPoints: realRewardPoints,
        walletBalance: realWalletBalance,
        savedAddresses: addresses.length,
      },
      wallet: {
        balance: realWalletBalance,
        cashbackEarned: realCashback,
        transactions: transactions.slice(0, 3).map((txn) => ({
          id: txn.id,
          title: txn.title,
          note: txn.date,
          amount: txn.amount,
          kind: txn.direction,
        })),
      },
      membership,
      appVersion: input.meta?.appVersion || "1.0.0",
    };
  }



/**
 * GET /api/profile — plus wallet, membership, orders and addresses in parallel.
 *
 * Cache-first: a warm start paints from the last successful read while the
 * live request refreshes in the background. Only the identity call is
 * required; every other panel degrades to a neutral value.
 */
export async function fetchProfileData(
  options: { forceRefresh?: boolean } = {},
): Promise<ProfileData> {
  const token = readToken();
  if (!token) {
    return DEFAULT_GUEST_PROFILE;
  }

  if (!options.forceRefresh) {
    const cached = readCache<ProfileData>(CACHE_KEYS.profileScreen);
    if (cached) return cached;
  }

  try {
    const [account, wallet, transactions, addresses, orders, membership, meta, unread] =
      await Promise.all([
        optional<ProfileAccount | null>(apiGetJson<ProfileAccount>(PROFILE_API_ENDPOINTS.profile), null),
        optional(apiGetJson<WalletEntity>(PROFILE_API_ENDPOINTS.wallet), null),
        optional(apiGetJson<TransactionEntity[]>(PROFILE_API_ENDPOINTS.transactions), []),
        optional(apiGetJson<AddressEntity[]>(PROFILE_API_ENDPOINTS.addresses), []),
        optional(apiGetJson<Order[]>(PROFILE_API_ENDPOINTS.orders), []),
        optional(apiGetJson<Membership>(PROFILE_API_ENDPOINTS.membership), EMPTY_MEMBERSHIP),
        optional(
          apiGetJson<{ appVersion: string; memberSince: string }>(PROFILE_API_ENDPOINTS.appMeta),
          { appVersion: "", memberSince: "" },
        ),
        optional(apiGetJson<{ count: number }>(PROFILE_API_ENDPOINTS.unreadCount), { count: 0 }),
      ]);

    if (!account) {
      clearSession();
      return DEFAULT_GUEST_PROFILE;
    }

    const data = composeProfile({
      account,
      wallet,
      transactions,
      addresses,
      orders,
      membership,
      meta,
      unread: unread.count,
    });
    writeCache(CACHE_KEYS.profileScreen, data);
    return data;
  } catch {
    const stale = readStaleCache<ProfileData>(CACHE_KEYS.profileScreen);
    if (stale) return stale;
    return DEFAULT_GUEST_PROFILE;
  }
}

export type ProfileEdit = {
  name: string;
  email?: string | undefined;
  city?: string | undefined;
  phone?: string | undefined;
};

/** PUT /api/profile — name, email, city and phone. */
export async function updateProfile(payload: ProfileEdit): Promise<ProfileEdit> {
  const account = await apiRequest<ProfileAccount>("PUT", PROFILE_API_ENDPOINTS.updateProfile, {
    body: payload,
  });
  const saved: ProfileEdit = {
    name: account.name,
    email: account.email || "",
    city: account.city ?? "",
    phone: account.phone || payload.phone || "",
  };
  patchCachedProfile((data) => ({
    ...data,
    user: {
      ...data.user,
      name: saved.name || data.user.name,
      email: saved.email || data.user.email,
      city: saved.city || data.user.city,
      phone: account.phone
        ? account.phone.startsWith("+")
          ? account.phone
          : `+91 ${account.phone}`
        : payload.phone
          ? payload.phone.startsWith("+")
            ? payload.phone
            : `+91 ${payload.phone.replace(/\D/g, "").slice(-10)}`
          : data.user.phone,
    },
  }));
  return saved;
}

/** POST /api/profile/photo — accepts a hosted URL or a base64 data URL. */
export async function updateProfilePhoto(photo: string): Promise<string | null> {
  const account = await apiPostJson<ProfileAccount>(PROFILE_API_ENDPOINTS.profilePhoto, { photo });
  const avatarUrl = account.photoUrl ?? account.avatarUrl ?? photo;
  patchCachedProfile((data) => ({ ...data, user: { ...data.user, avatarUrl } }));
  return avatarUrl;
}

/** Client-side mirror of the FastAPI profile validator. */
export function validateProfile(edit: ProfileEdit): Partial<Record<keyof ProfileEdit, string>> {
  const errors: Partial<Record<keyof ProfileEdit, string>> = {};
  const name = edit.name.trim();
  if (name.length < 2 || name.length > 60) errors.name = "Name must be 2–60 characters";
  const email = (edit.email ?? "").trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email)) {
    errors.email = "Enter a valid email address";
  }
  if ((edit.city ?? "").trim().length > 60) errors.city = "City must be 60 characters or less";
  if (edit.phone !== undefined && edit.phone.trim()) {
    const rawDigits = edit.phone.replace(/\D/g, "");
    const digits = rawDigits.length === 12 && rawDigits.startsWith("91") ? rawDigits.slice(2) : rawDigits;
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
      errors.phone = "Enter a valid 10-digit mobile number";
    }
  }
  return errors;
}

function patchCachedProfile(update: (data: ProfileData) => ProfileData) {
  const cached = readStaleCache<ProfileData>(CACHE_KEYS.profileScreen);
  if (cached) writeCache(CACHE_KEYS.profileScreen, update(cached));
}

/** POST /api/auth/logout */
export async function logout(): Promise<{ ok: true }> {
  try {
    await apiPostJson<{ ok: true }>(PROFILE_API_ENDPOINTS.logout, {});
  } finally {
    clearSession();
  }
  return { ok: true };
}

/** DELETE /api/profile — permanently wipes the customer account. */
export async function deleteCustomerAccount(): Promise<{ ok: true; message?: string }> {
  try {
    const res = await apiRequest<{ ok: true; message?: string }>("DELETE", PROFILE_API_ENDPOINTS.profile);
    return res;
  } finally {
    clearSession();
  }
}

