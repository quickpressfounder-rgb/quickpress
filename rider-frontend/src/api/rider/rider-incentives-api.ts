import { apiGetJson, apiPostJson } from "../core/transport";

export interface CandyCrushLevel {
  level: number;
  title: string;
  target: number;
  reward: number;
  badge: string;
  flavor: string;
  description: string;
  color: string;
  gradient: string;
  status: "claimed" | "claimable" | "in_progress" | "locked";
  isClaimed: boolean;
  isClaimable: boolean;
  progress: number;
  progressPercent: number;
  ridesRemaining: number;
  extraPerRide: number;
  claimedAt?: string | null;
}

export interface IncentiveMilestone {
  id: string;
  tierName?: string;
  title: string;
  target: number;
  completed: number;
  reward: number;
  status: "completed" | "active" | "locked";
  unlocked: boolean;
  progressPercent?: number;
  extraPerRide?: number;
}

export interface SpecialQuest {
  id: string;
  title: string;
  desc: string;
  reward: number;
  target: number;
  progress: number;
  expiresIn: string;
  completed: boolean;
  tag?: string;
}

export interface SurgeZone {
  id: string;
  name: string;
  multiplier: string;
  bonusPerTrip: number;
  activeTiming: string;
  isActive: boolean;
  demandLevel: string;
}

export interface WeeklyStreakDay {
  day: string;
  trips: number;
  met: boolean;
  isToday?: boolean;
  isFuture?: boolean;
}

export interface WeeklyStreakData {
  completedDays: number;
  targetDays: number;
  bonusAmount: number;
  days: WeeklyStreakDay[];
}

export interface RiderIncentivesResponse {
  riderId: string;
  completedToday: number;
  totalIncentivesEarnedToday: number;
  totalClaimableIncentives?: number;
  totalClaimedIncentives?: number;
  weeklyStreakDays: number;
  targetStreakDays: number;
  streakReward: number;
  candyCrushLevels?: CandyCrushLevel[];
  milestones: IncentiveMilestone[];
  nextMilestone?: {
    title: string;
    target: number;
    ridesRemaining: number;
    rewardDifference: number;
    totalReward: number;
    level?: number;
    badge?: string;
  } | null;
  specialQuests: SpecialQuest[];
  surgeZones: SurgeZone[];
  weeklyStreak: WeeklyStreakData;
  settlementInfo: {
    cycle: string;
    cycleNote: string;
  };
}

export interface ClaimIncentiveResult {
  ok: boolean;
  level: number;
  reward: number;
  title: string;
  badge: string;
  newBalance: number;
  claimedAt: string;
  message: string;
}

/** GET /api/rider/incentives — Fetch live targets, milestone slabs, special quests & streak data. */
export async function fetchRiderIncentives(): Promise<RiderIncentivesResponse> {
  return await apiGetJson<RiderIncentivesResponse>("/api/rider/incentives");
}

/** POST /api/rider/incentives/claim — Claim earned Candy Crush level milestone reward. */
export async function claimRiderIncentive(level: number): Promise<ClaimIncentiveResult> {
  return await apiPostJson<ClaimIncentiveResult>("/api/rider/incentives/claim", { level });
}

