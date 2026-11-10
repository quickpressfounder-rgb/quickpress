/**
 * Mock data for the Rider Analytics, Achievements & Gamification module
 * (Sprint 4.8). UI-only: no backend, no Firebase, no analytics SDK.
 */

export type AnalyticsRangeId = "today" | "week" | "month" | "custom";

export const ANALYTICS_RANGES: { id: AnalyticsRangeId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "custom", label: "Custom" },
];

export type AnalyticsMetricId =
  | "earnings-today"
  | "earnings-week"
  | "earnings-month"
  | "earnings-lifetime"
  | "deliveries-today"
  | "deliveries-total"
  | "distance"
  | "online-hours"
  | "acceptance-rate"
  | "completion-rate"
  | "rating";

export type AnalyticsMetric = {
  id: AnalyticsMetricId;
  label: string;
  value: number;
  decimals: number;
  prefix?: string;
  suffix?: string;
  hint: string;
  trend: number;
  group: "earnings" | "delivery" | "quality";
};

export type TrendPoint = { label: string; value: number };

export type TrendSeries = {
  id: string;
  title: string;
  subtitle: string;
  unit: string;
  kind: "line" | "bar";
  points: TrendPoint[];
};

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export type RiderAchievement = {
  id: string;
  emoji: string;
  title: string;
  body: string;
  tier: AchievementTier;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedOn?: string;
};

export type RiderGoal = {
  id: string;
  label: string;
  caption: string;
  current: number;
  target: number;
  unit: "count" | "currency";
  reward: string;
};

export type IncentiveId =
  | "daily"
  | "weekly"
  | "festival"
  | "referral"
  | "peak"
  | "quest";

export type RiderIncentive = {
  id: IncentiveId;
  title: string;
  body: string;
  amount: number;
  progress: number;
  target: number;
  status: "active" | "locked" | "claimed";
  window: string;
};

export type LeaderboardScope = "city" | "area" | "weekly" | "monthly";

export type LeaderboardRow = {
  id: string;
  rank: number;
  name: string;
  zone: string;
  deliveries: number;
  score: number;
  isMe?: boolean;
};

export type LeaderboardRankCard = {
  id: LeaderboardScope;
  label: string;
  rank: number;
  total: number;
  movement: number;
};

export type InsightCard = {
  id: string;
  title: string;
  value: string;
  body: string;
  tone: "good" | "info" | "warn";
};

/* -------------------------------------------------------------------------- */
/* KPI metrics                                                                */
/* -------------------------------------------------------------------------- */

export const ANALYTICS_METRICS: AnalyticsMetric[] = [
  {
    id: "earnings-today",
    label: "Today's Earnings",
    value: 0,
    decimals: 0,
    prefix: "₹",
    hint: "Live today",
    trend: 0,
    group: "earnings",
  },
  {
    id: "earnings-week",
    label: "Weekly Earnings",
    value: 0,
    decimals: 0,
    prefix: "₹",
    hint: "This week",
    trend: 0,
    group: "earnings",
  },
  {
    id: "earnings-month",
    label: "Monthly Earnings",
    value: 0,
    decimals: 0,
    prefix: "₹",
    hint: "This month",
    trend: 0,
    group: "earnings",
  },
  {
    id: "earnings-lifetime",
    label: "Lifetime Earnings",
    value: 0,
    decimals: 0,
    prefix: "₹",
    hint: "Total earned",
    trend: 0,
    group: "earnings",
  },
  {
    id: "deliveries-today",
    label: "Deliveries Today",
    value: 0,
    decimals: 0,
    hint: "Today's trips",
    trend: 0,
    group: "delivery",
  },
  {
    id: "deliveries-total",
    label: "Total Deliveries",
    value: 0,
    decimals: 0,
    hint: "Lifetime completed trips",
    trend: 0,
    group: "delivery",
  },
  {
    id: "distance",
    label: "Distance Covered",
    value: 0,
    decimals: 1,
    suffix: " km",
    hint: "Distance travelled",
    trend: 0,
    group: "delivery",
  },
  {
    id: "online-hours",
    label: "Online Hours",
    value: 0,
    decimals: 1,
    suffix: " h",
    hint: "Active on fleet",
    trend: 0,
    group: "delivery",
  },
  {
    id: "acceptance-rate",
    label: "Acceptance Rate",
    value: 100,
    decimals: 0,
    suffix: "%",
    hint: "Order response",
    trend: 0,
    group: "quality",
  },
  {
    id: "completion-rate",
    label: "Completion Rate",
    value: 100,
    decimals: 1,
    suffix: "%",
    hint: "Delivered successfully",
    trend: 0,
    group: "quality",
  },
  {
    id: "rating",
    label: "Customer Rating",
    value: 5.0,
    decimals: 1,
    suffix: " ",
    hint: "Average rating",
    trend: 0,
    group: "quality",
  },
];

/* -------------------------------------------------------------------------- */
/* Trends (chart UI only)                                                     */
/* -------------------------------------------------------------------------- */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKS = ["W1", "W2", "W3", "W4"];
const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

export const ANALYTICS_TRENDS: TrendSeries[] = [
  {
    id: "earnings-trend",
    title: "Earnings Trend",
    subtitle: "Last 7 days",
    unit: "₹",
    kind: "line",
    points: [980, 1120, 860, 1340, 1180, 1620, 1264].map((value, i) => ({
      label: DAYS[i] ?? "",
      value,
    })),
  },
  {
    id: "delivery-trend",
    title: "Delivery Trend",
    subtitle: "Trips per day",
    unit: "",
    kind: "bar",
    points: [14, 16, 11, 19, 17, 23, 18].map((value, i) => ({
      label: DAYS[i] ?? "",
      value,
    })),
  },
  {
    id: "distance-trend",
    title: "Distance Trend",
    subtitle: "Kilometres per day",
    unit: " km",
    kind: "line",
    points: [48.2, 54.6, 39.8, 66.1, 58.4, 71.2, 62.4].map((value, i) => ({
      label: DAYS[i] ?? "",
      value,
    })),
  },
  {
    id: "online-hours-trend",
    title: "Online Hours",
    subtitle: "Hours logged per day",
    unit: " h",
    kind: "bar",
    points: [7.2, 8.1, 6.4, 9.2, 8.4, 10.1, 8.6].map((value, i) => ({
      label: DAYS[i] ?? "",
      value,
    })),
  },
  {
    id: "weekly-performance",
    title: "Weekly Performance",
    subtitle: "Score out of 100",
    unit: "",
    kind: "line",
    points: [82, 88, 91, 94].map((value, i) => ({ label: WEEKS[i] ?? "", value })),
  },
  {
    id: "monthly-performance",
    title: "Monthly Performance",
    subtitle: "Earnings per month",
    unit: "₹",
    kind: "bar",
    points: [21400, 23800, 25100, 26700, 27900, 28450].map((value, i) => ({
      label: MONTHS[i] ?? "",
      value,
    })),
  },
];

/* -------------------------------------------------------------------------- */
/* Achievements                                                               */
/* -------------------------------------------------------------------------- */

export const RIDER_ACHIEVEMENTS: RiderAchievement[] = [
  {
    id: "first-delivery",
    emoji: "Badge",
    title: "First Delivery",
    body: "Completed your very first QuickPress trip.",
    tier: "bronze",
    progress: 1,
    target: 1,
    unlocked: true,
    unlockedOn: "14 Mar 2024",
  },
  {
    id: "100-deliveries",
    emoji: "Badge",
    title: "100 Deliveries",
    body: "A hundred happy customers served.",
    tier: "bronze",
    progress: 100,
    target: 100,
    unlocked: true,
    unlockedOn: "02 Jun 2024",
  },
  {
    id: "500-deliveries",
    emoji: "Badge",
    title: "500 Deliveries",
    body: "Half a thousand trips completed.",
    tier: "silver",
    progress: 500,
    target: 500,
    unlocked: true,
    unlockedOn: "19 Jan 2025",
  },
  {
    id: "1000-deliveries",
    emoji: "Badge",
    title: "1000 Deliveries",
    body: "Elite delivery milestone unlocked.",
    tier: "gold",
    progress: 1000,
    target: 1000,
    unlocked: true,
    unlockedOn: "07 Sep 2025",
  },
  {
    id: "fast-rider",
    emoji: "Badge",
    title: "Fast Rider",
    body: "50 deliveries under 20 minutes.",
    tier: "silver",
    progress: 41,
    target: 50,
    unlocked: false,
  },
  {
    id: "top-performer",
    emoji: "Badge",
    title: "Top Performer",
    body: "Finish a month inside the city top 10.",
    tier: "gold",
    progress: 7,
    target: 10,
    unlocked: false,
  },
  {
    id: "rating-49",
    emoji: "Badge",
    title: "4.9 Rating",
    body: "Hold a 4.9 average across 200 ratings.",
    tier: "gold",
    progress: 186,
    target: 200,
    unlocked: false,
  },
  {
    id: "perfect-week",
    emoji: "Badge",
    title: "Perfect Week",
    body: "7 days, zero cancellations, 100% completion.",
    tier: "platinum",
    progress: 6,
    target: 7,
    unlocked: false,
  },
  {
    id: "weekend-hero",
    emoji: "Badge",
    title: "Weekend Hero",
    body: "40 weekend deliveries in a single month.",
    tier: "silver",
    progress: 40,
    target: 40,
    unlocked: true,
    unlockedOn: "27 Jul 2026",
  },
  {
    id: "night-champion",
    emoji: "Badge",
    title: "Night Champion",
    body: "100 deliveries after 9 PM.",
    tier: "platinum",
    progress: 72,
    target: 100,
    unlocked: false,
  },
];

/* -------------------------------------------------------------------------- */
/* Goals                                                                      */
/* -------------------------------------------------------------------------- */

export const RIDER_GOALS: RiderGoal[] = [
  {
    id: "deliveries-today",
    label: "Today's Deliveries",
    caption: "18 of 22 trips completed",
    current: 18,
    target: 22,
    unit: "count",
    reward: "₹120 streak bonus",
  },
  {
    id: "earnings-today",
    label: "Today's Earnings Goal",
    caption: "₹1,264 of ₹1,600",
    current: 1264,
    target: 1600,
    unit: "currency",
    reward: "₹80 daily top-up",
  },
  {
    id: "weekly-goal",
    label: "Weekly Goal",
    caption: "₹7,840 of ₹10,000",
    current: 7840,
    target: 10000,
    unit: "currency",
    reward: "₹500 weekly bonus",
  },
  {
    id: "monthly-goal",
    label: "Monthly Goal",
    caption: "₹28,450 of ₹35,000",
    current: 28450,
    target: 35000,
    unit: "currency",
    reward: "₹1,500 milestone bonus",
  },
];

/* -------------------------------------------------------------------------- */
/* Incentives                                                                 */
/* -------------------------------------------------------------------------- */

export const RIDER_INCENTIVES: RiderIncentive[] = [
  {
    id: "daily",
    title: "Daily Bonus",
    body: "Complete 20 deliveries today to unlock the daily top-up.",
    amount: 150,
    progress: 18,
    target: 20,
    status: "active",
    window: "Resets at midnight",
  },
  {
    id: "weekly",
    title: "Weekly Bonus",
    body: "120 deliveries this week keeps the weekly bonus alive.",
    amount: 500,
    progress: 96,
    target: 120,
    status: "active",
    window: "Mon – Sun",
  },
  {
    id: "festival",
    title: "Festival Bonus",
    body: "Independence week special payout on every 10th trip.",
    amount: 750,
    progress: 4,
    target: 10,
    status: "active",
    window: "12 Aug – 18 Aug",
  },
  {
    id: "referral",
    title: "Referral Bonus",
    body: "2 of 3 referred riders completed their first 10 trips.",
    amount: 900,
    progress: 2,
    target: 3,
    status: "active",
    window: "No expiry",
  },
  {
    id: "peak",
    title: "Peak Hour Bonus",
    body: "Stay online 6 PM – 9 PM for a 1.4x surge multiplier.",
    amount: 220,
    progress: 3,
    target: 3,
    status: "claimed",
    window: "Today 6–9 PM",
  },
  {
    id: "quest",
    title: "Quest Rewards",
    body: "Finish the 5-day Koramangala quest chain.",
    amount: 1200,
    progress: 2,
    target: 5,
    status: "locked",
    window: "Unlocks at 500 weekly points",
  },
];

/* -------------------------------------------------------------------------- */
/* Leaderboard                                                                */
/* -------------------------------------------------------------------------- */

export const LEADERBOARD_RANKS: LeaderboardRankCard[] = [];

export const LEADERBOARD_ROWS: Record<LeaderboardScope, LeaderboardRow[]> = {
  city: [],
  area: [],
  weekly: [],
  monthly: [],
};

export const LEADERBOARD_SCOPES: { id: LeaderboardScope; label: string }[] = [
  { id: "city", label: "City" },
  { id: "area", label: "Area" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

/* -------------------------------------------------------------------------- */
/* Insights                                                                   */
/* -------------------------------------------------------------------------- */

export const PERFORMANCE_INSIGHTS: InsightCard[] = [
  {
    id: "best-hours",
    title: "Best Working Hours",
    value: "6 PM – 9 PM",
    body: "You earn 38% more per hour in the evening peak than mid-day.",
    tone: "good",
  },
  {
    id: "best-area",
    title: "Best Area",
    value: "Koramangala 6th Block",
    body: "Shortest pickup distances and the highest tip rate this month.",
    tone: "good",
  },
  {
    id: "highest-day",
    title: "Highest Earnings Day",
    value: "Saturday · ₹1,620",
    body: "Weekend surge plus 4 long-distance trips drove the spike.",
    tone: "info",
  },
  {
    id: "avg-time",
    title: "Average Delivery Time",
    value: "24 min",
    body: "3 minutes faster than the Bengaluru South rider average.",
    tone: "good",
  },
  {
    id: "profitable-zone",
    title: "Most Profitable Zone",
    value: "Indiranagar ↔ HSR",
    body: "₹31 per km against a ₹24 city average on this corridor.",
    tone: "info",
  },
  {
    id: "improvement",
    title: "Improvement Suggestions",
    value: "Cut idle time by 22 min",
    body: "Start your break before 4 PM and stay online through the 7 PM rush.",
    tone: "warn",
  },
];

/* -------------------------------------------------------------------------- */
/* Loaders (mock async, mirrors the other rider modules)                      */
/* -------------------------------------------------------------------------- */

export type AnalyticsPayload = {
  metrics: AnalyticsMetric[];
  trends: TrendSeries[];
  goals: RiderGoal[];
  incentives: RiderIncentive[];
  insights: InsightCard[];
};

export function loadAnalytics(range: AnalyticsRangeId = "today") {
  const factor = range === "week" ? 1 : range === "month" ? 1 : 1;
  return new Promise<AnalyticsPayload>((resolve) => {
    setTimeout(
      () =>
        resolve({
          metrics: ANALYTICS_METRICS.map((metric) => ({
            ...metric,
            value: Number((metric.value * factor).toFixed(metric.decimals)),
          })),
          trends: ANALYTICS_TRENDS,
          goals: RIDER_GOALS,
          incentives: RIDER_INCENTIVES,
          insights: PERFORMANCE_INSIGHTS,
        }),
      560,
    );
  });
}

export function loadAchievements() {
  return new Promise<{ achievements: RiderAchievement[]; goals: RiderGoal[] }>((resolve) => {
    setTimeout(() => resolve({ achievements: RIDER_ACHIEVEMENTS, goals: RIDER_GOALS }), 520);
  });
}

export function loadLeaderboard() {
  return new Promise<{ ranks: LeaderboardRankCard[]; rows: typeof LEADERBOARD_ROWS }>((resolve) => {
    setTimeout(() => resolve({ ranks: LEADERBOARD_RANKS, rows: LEADERBOARD_ROWS }), 520);
  });
}

export function loadInsights() {
  return new Promise<{ insights: InsightCard[]; incentives: RiderIncentive[] }>((resolve) => {
    setTimeout(() => resolve({ insights: PERFORMANCE_INSIGHTS, incentives: RIDER_INCENTIVES }), 480);
  });
}

export function formatMetric(metric: AnalyticsMetric, value: number) {
  const body =
    metric.decimals > 0
      ? value.toFixed(metric.decimals)
      : Math.round(value).toLocaleString("en-IN");
  return `${metric.prefix ?? ""}${body}${metric.suffix ?? ""}`;
}
