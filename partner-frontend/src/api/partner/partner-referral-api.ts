import { apiGetJson, apiPostJson } from "../core/transport";

export interface PartnerReferralRule {
  id: string;
  role: "partner";
  city: string;
  referrerReward: number;
  targetOrdersCount: number;
  minOrderValue: number;
  headline: string;
  subheadline: string;
  terms: string[];
  enabled: boolean;
}

export interface PartnerReferralLedgerItem {
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

export interface PartnerReferralHubResponse {
  role: "partner";
  code: string;
  shareLink: string;
  qrCodeUrl: string;
  shareMessage: string;
  activeRule: PartnerReferralRule;
  totalReferred: number;
  pendingMilestoneCount: number;
  unlockedMilestoneCount: number;
  claimableBalance: number;
  totalClaimedBalance: number;
  ledger: PartnerReferralLedgerItem[];
}

export interface ClaimReferralRewardResponse {
  ok: boolean;
  claimedAmount: number;
  cycleId: string;
  message: string;
}

export async function fetchPartnerReferralHub(): Promise<PartnerReferralHubResponse> {
  return apiGetJson<PartnerReferralHubResponse>("/api/referral/hub?role=partner");
}

export async function claimPartnerReferralReward(rewardId?: string): Promise<ClaimReferralRewardResponse> {
  return apiPostJson<ClaimReferralRewardResponse>("/api/referral/claim?role=partner", { rewardId });
}
