import { apiGetJson } from "../core/transport";

export type LeaderboardPeriod = "today" | "weekly" | "all_time";

export type LeaderboardCaptain = {
  id: string;
  name: string;
  riderId: string;
  avatar: string;
  rank?: number;
  trips: number;
  earnings: number;
  rating: number;
  isMe: boolean;
  city: string;
  badge?: string;
  reward?: string;
};

export type MyRankInfo = {
  rank: number;
  trips: number;
  earnings: number;
  rating: number;
  gapToNextRank: number;
  bonusStatus: string;
  nextPrize: string;
};

export type PrizePoolItem = {
  place: string;
  reward: string;
  icon: string;
  color: "amber" | "slate" | "emerald";
};

export type LeaderboardResponse = {
  city: string;
  period: LeaderboardPeriod;
  totalCaptains: number;
  myRank: MyRankInfo;
  topThree: LeaderboardCaptain[];
  leaderboard: LeaderboardCaptain[];
  prizes: PrizePoolItem[];
};

export async function fetchCityLeaderboard(
  period: LeaderboardPeriod = "today",
  city?: string
): Promise<LeaderboardResponse> {
  try {
    const params: Record<string, string> = { period };
    if (city) params.city = city;
    const res = await apiGetJson<LeaderboardResponse>("/api/rider/leaderboard", {
      params,
    });
    return res;
  } catch (error) {
    console.warn("[LeaderboardApi] Network issue fetching leaderboard:", error);
    return {
      city: city || "Kasganj",
      period,
      totalCaptains: 0,
      myRank: {
        rank: 1,
        trips: 0,
        earnings: 0,
        rating: 5.0,
        gapToNextRank: 0,
        bonusStatus: "Complete 5 rides to earn daily bonus",
        nextPrize: "Top 3 Podium (Cash Prize)",
      },
      topThree: [],
      leaderboard: [],
      prizes: [
        { place: "1st Place", reward: "₹500 Cash + Gold Champion Crown", icon: "", color: "amber" },
        { place: "2nd Place", reward: "₹300 Cash + Silver Medal", icon: "", color: "slate" },
        { place: "3rd Place", reward: "₹150 Cash + Bronze Medal", icon: "", color: "amber" },
        { place: "Top 10", reward: "Priority Smart Dispatch & 0 Platform Fee", icon: "", color: "emerald" },
      ],
    };
  }
}
