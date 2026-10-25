import { apiGetJson, apiPostJson } from "../core/transport";

export interface RiderReferralRule {
  id: string;
  role: "rider";
  city: string;
  referrerReward: number;
  targetOrdersCount: number;
  minOrderValue: number;
  headline: string;
  subheadline: string;
  terms: string[];
  enabled: boolean;
}

export interface RiderReferralLedgerItem {
  id: string;
  referrerId: string;
  referrerName: string;
  refereeId: string;
  refereeName: string;
  refereePhone: string;
  city: string;
  code: string;
  targetOrders: number;
  completedOrders: number;
  rewardAmount: number;
  status: "pending_milestone" | "unlocked" | "claimed_to_cycle" | "settled";
  createdAt: string;
  unlockedAt?: string | null;
  claimedAt?: string | null;
  settlementCycleId?: string | null;
}

export interface RiderReferralHubResponse {
  role: "rider";
  code: string;
  shareLink: string;
  qrCodeUrl: string;
  shareMessage: string;
  activeRule: RiderReferralRule;
  totalReferred: number;
  pendingMilestoneCount: number;
  unlockedMilestoneCount: number;
  claimableBalance: number;
  totalClaimedBalance: number;
  ledger: RiderReferralLedgerItem[];
}

export interface ClaimReferralRewardResponse {
  ok: boolean;
  claimedAmount: number;
  cycleId: string;
  message: string;
}

export async function fetchRiderReferralHub(): Promise<RiderReferralHubResponse> {
  return apiGetJson<RiderReferralHubResponse>("/api/referral/hub?role=rider");
}

export async function claimRiderReferralReward(rewardId?: string): Promise<ClaimReferralRewardResponse> {
  return apiPostJson<ClaimReferralRewardResponse>("/api/referral/claim?role=rider", { rewardId });
}
