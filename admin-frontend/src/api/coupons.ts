/**
 * Master Coupons & Referral Engine API Client
 *
 * GET /api/admin/coupons/stats          — Overall coupon and referral KPIs
 * GET /api/admin/coupons                — List of active/scheduled promo codes
 * POST /api/admin/coupons               — Create new discount code
 * PUT /api/admin/coupons/{id}           — Update promo code
 * DELETE /api/admin/coupons/{id}        — Delete promo code
 * GET /api/admin/referrals/settings     — Referral program rules
 * PUT /api/admin/referrals/settings     — Update referral reward
 * GET /api/admin/referrals/stats        — Referral KPIs
 * GET /api/admin/referrals/list         — Referred users list
 */
import { apiDeleteJson, apiGetJson, apiPatchJson, apiPostJson, apiPutJson } from "@/api/core/transport";

export type Coupon = {
  id: string;
  code: string;
  type: "percentage" | "flat" | "free_delivery" | string;
  value: string;
  discountPct?: number;
  maxDiscount?: number;
  flatDiscount?: number;
  minOrder: number;
  minOrderLabel?: string;
  audience: string;
  cities?: string[];
  pincodes?: string[];
  perUserLimit?: number;
  used: number;
  limit: number;
  uniqueUsers?: number;
  totalDiscountGiven?: number;
  totalOrderRevenue?: number;
  startDate?: string;
  validTill: string;
  status: "Active" | "Scheduled" | "Expired" | "Paused";
  badge?: string;
  description?: string;
};

export type CouponRedemption = {
  id: string;
  couponId: string;
  couponCode: string;
  orderId: string;
  userId: string;
  userName: string;
  userPhone: string;
  city: string;
  pincode: string;
  orderAmount: number;
  discountAmount: number;
  redeemedAt: string;
};

export type CityCouponStat = {
  city: string;
  totalCoupons: number;
  activeCoupons: number;
  redemptions: number;
  discountDisbursed: number;
};

export type CouponStats = {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountDisbursed: number;
  cityBreakdown?: CityCouponStat[];
  referralConversions: number;
  referralRevenue: number;
};

export type ReferralProgramSettings = {
  id: string;
  enabled: boolean;
  refereeDiscountPercent: number;
  refereeMaxDiscount: number;
  refereeMinOrderValue: number;
  referrerRewardAmount: number;
  referrerRewardType: string;
  headline: string;
  subheadline: string;
  terms: string[];
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type AdminReferralItem = {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerPhone: string;
  refereeId: string;
  refereeName: string;
  refereePhone: string;
  code: string;
  status: "pending" | "completed" | "expired" | "Converted";
  rewardAmount: number;
  discountApplied: number;
  firstOrderId?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

export type AdminReferralStats = {
  totalInvites: number;
  totalRegisteredReferrals: number;
  convertedFirstOrders: number;
  totalDiscountGiven: number;
  totalRewardsPaid: number;
  activeSettings: ReferralProgramSettings;
};

export type AdminReferralListResponse = {
  items: AdminReferralItem[];
  total: number;
  stats?: AdminReferralStats;
};

export async function fetchCouponStats(): Promise<CouponStats> {
  try {
    return await apiGetJson<CouponStats>("/api/admin/coupons/stats");
  } catch {
    return {
      totalCoupons: 0,
      activeCoupons: 0,
      totalRedemptions: 0,
      totalDiscountDisbursed: 0,
      cityBreakdown: [],
      referralConversions: 0,
      referralRevenue: 0,
    };
  }
}

export async function fetchCoupons(city?: string): Promise<Coupon[]> {
  try {
    const rows = await apiGetJson<any[]>("/api/admin/coupons", {
      params: city && city !== "All Cities" ? { city } : undefined,
    });
    return (rows || []).map((r) => ({
      id: r._id || r.id,
      code: r.code || "PROMO",
      type: r.type || (r.discountPct ? "percentage" : "flat"),
      value: r.value || r.discount || "20% OFF",
      discountPct: r.discountPct ? Number(r.discountPct) : undefined,
      maxDiscount: r.maxDiscount ? Number(r.maxDiscount) : undefined,
      flatDiscount: r.flatDiscount ? Number(r.flatDiscount) : undefined,
      minOrder: Number(r.minOrder ?? 0),
      minOrderLabel: `₹${Number(r.minOrder ?? 0).toLocaleString("en-IN")}`,
      audience: r.audience || "All Users",
      cities: Array.isArray(r.cities) ? r.cities : [],
      pincodes: Array.isArray(r.pincodes) ? r.pincodes : [],
      perUserLimit: Number(r.perUserLimit ?? 1),
      used: Number(r.used ?? 0),
      limit: Number(r.limit ?? 500),
      uniqueUsers: Number(r.uniqueUsers ?? 0),
      totalDiscountGiven: Number(r.totalDiscountGiven ?? 0),
      totalOrderRevenue: Number(r.totalOrderRevenue ?? 0),
      startDate: (r.startDate || "").slice(0, 10),
      validTill: (r.validTill || r.expiry || "2026-12-31").slice(0, 10),
      status: (r.status as any) || "Active",
      badge: r.badge || "",
      description: r.description || "",
    }));
  } catch {
    return [];
  }
}

export async function fetchCouponRedemptions(couponId: string): Promise<CouponRedemption[]> {
  try {
    const res = await apiGetJson<CouponRedemption[]>(`/api/admin/coupons/${couponId}/redemptions`);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export async function toggleCouponStatus(couponId: string, status: "Active" | "Paused" | "Expired") {
  return await apiPatchJson<any>(`/api/admin/coupons/${couponId}/status`, { status });
}

export async function createCoupon(payload: {
  code: string;
  type?: string;
  value?: string;
  discount?: string;
  discountPct?: number;
  maxDiscount?: number;
  flatDiscount?: number;
  minOrder?: number;
  cities?: string[];
  pincodes?: string[];
  audience?: string;
  perUserLimit?: number;
  limit?: number;
  startDate?: string;
  expiry?: string;
  validTill?: string;
  description?: string;
  status?: string;
  badge?: string;
}) {
  return await apiPostJson<any>("/api/admin/coupons", payload);
}

export async function updateCoupon(couponId: string, payload: any) {
  return await apiPutJson<any>(`/api/admin/coupons/${couponId}`, payload);
}

export async function deleteCoupon(couponId: string) {
  return await apiDeleteJson<{ ok: boolean }>(`/api/admin/coupons/${couponId}`);
}

export async function fetchReferralSettings(): Promise<ReferralProgramSettings> {
  try {
    return await apiGetJson<ReferralProgramSettings>("/api/admin/referrals/settings");
  } catch {
    return {
      id: "referrals",
      enabled: true,
      refereeDiscountPercent: 20,
      refereeMaxDiscount: 100,
      refereeMinOrderValue: 199,
      referrerRewardAmount: 100,
      referrerRewardType: "Wallet Cash",
      headline: "Invite Friends, Earn ₹100",
      subheadline: "Your friends get 20% off their first order, and you get ₹100 wallet credit!",
      terms: ["Valid on first order only", "Minimum cart value ₹199"],
    };
  }
}

export async function updateReferralSettings(
  payload: Partial<ReferralProgramSettings>
): Promise<ReferralProgramSettings> {
  return apiPutJson<ReferralProgramSettings>("/api/admin/referrals/settings", payload);
}

export async function fetchReferralStats(): Promise<AdminReferralStats> {
  try {
    return await apiGetJson<AdminReferralStats>("/api/admin/referrals/stats");
  } catch {
    return {
      totalInvites: 0,
      totalRegisteredReferrals: 0,
      convertedFirstOrders: 0,
      totalDiscountGiven: 0,
      totalRewardsPaid: 0,
      activeSettings: {
        id: "referrals",
        enabled: true,
        refereeDiscountPercent: 20,
        refereeMaxDiscount: 100,
        refereeMinOrderValue: 199,
        referrerRewardAmount: 100,
        referrerRewardType: "Wallet Cash",
        headline: "Invite Friends, Earn ₹100",
        subheadline: "Your friends get 20% off their first order, and you get ₹100 wallet credit!",
        terms: ["Valid on first order only", "Minimum cart value ₹199"],
      },
    };
  }
}

export async function fetchReferralsList(): Promise<AdminReferralListResponse> {
  try {
    const res = await apiGetJson<AdminReferralListResponse>("/api/admin/coupons/referral-list");
    if (res && Array.isArray(res.items)) return res;
    const directRes = await apiGetJson<any>("/api/admin/referrals/list");
    return directRes && Array.isArray(directRes.items) ? directRes : { items: [], total: 0 };
  } catch {
    return {
      items: [],
      total: 0,
    };
  }
}

// ==============================================================================
// Multi-Role Referral Engine (Partner, Rider & Customer) — Unified Types & API
// ==============================================================================

export type MultiRoleType = "partner" | "rider" | "customer";
export type MultiRoleMilestoneStatus = "pending_milestone" | "unlocked" | "claimed_to_cycle" | "settled";

export interface MultiRoleReferralRule {
  id: string;
  role: MultiRoleType;
  city: string;
  referrerReward: number;
  targetOrdersCount: number;
  minOrderValue: number;
  refereeJoiningBonus?: number;
  refereeDiscountPercent?: number;
  refereeMaxDiscount?: number;
  headline?: string;
  subheadline?: string;
  terms?: string[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MultiRoleReferralLedgerItem {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerPhone: string;
  referrerRole: MultiRoleType;
  refereeId: string;
  refereeName: string;
  refereePhone: string;
  refereeRole: MultiRoleType;
  city: string;
  code: string;
  targetOrders: number;
  completedOrders: number;
  rewardAmount: number;
  status: MultiRoleMilestoneStatus;
  createdAt: string;
  unlockedAt?: string | null;
  claimedAt?: string | null;
  settlementCycleId?: string | null;
}

export interface MultiRoleReferralStats {
  totalPartnerInvites: number;
  unlockedPartnerRewards: number;
  totalRiderInvites: number;
  unlockedRiderRewards: number;
  totalCustomerInvites: number;
  unlockedCustomerRewards: number;
  totalDisbursedToSettlements: number;
  activeRulesCount: number;
}

export interface MultiRoleReferralOverview {
  stats: MultiRoleReferralStats;
  rules: MultiRoleReferralRule[];
  ledger: MultiRoleReferralLedgerItem[];
}

export async function fetchMultiRoleReferralOverview(filters?: {
  role?: string;
  city?: string;
  status?: string;
}): Promise<MultiRoleReferralOverview> {
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.city) params.set("city", filters.city);
  if (filters?.status) params.set("status", filters.status);
  const q = params.toString() ? `?${params.toString()}` : "";
  return apiGetJson<MultiRoleReferralOverview>(`/api/admin/referrals/multi-role/overview${q}`);
}

export async function upsertMultiRoleReferralRule(
  payload: Partial<MultiRoleReferralRule>
): Promise<MultiRoleReferralRule> {
  return apiPostJson<MultiRoleReferralRule>("/api/admin/referrals/multi-role/rules", payload);
}

export async function deleteMultiRoleReferralRule(
  ruleId: string
): Promise<{ ok: boolean; deletedId: string }> {
  return apiDeleteJson<{ ok: boolean; deletedId: string }>(`/api/admin/referrals/multi-role/rules/${ruleId}`);
}

export async function performReferralLedgerAction(
  ledgerId: string,
  action: "unlock" | "credit" | "cancel"
): Promise<{ ok: boolean; status: string; message: string }> {
  return apiPostJson<{ ok: boolean; status: string; message: string }>(
    `/api/admin/referrals/multi-role/ledger/${encodeURIComponent(ledgerId)}/action`,
    { action }
  );
}

