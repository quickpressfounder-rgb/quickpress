import { apiGetJson } from "../core/transport";

export interface RiderStoryItem {
  id: string;
  title: string;
  tagline: string;
  badge: string;
  badgeBg: string;
  gradient: string;
  icon: string;
  imageUrl?: string;
  points: string[];
  ctaText: string;
  ctaAction: string;
  actionType: "external_link" | "internal_route" | "share" | "google_form";
  audience?: string;
  priority?: number;
  isActive?: boolean;
}

export interface RiderBannerItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  theme: string;
  rewardAmount: number;
  ctaText: string;
  ctaLink: string;
  actionType: "reward_scratch" | "external_link" | "google_form" | "internal_route";
  audience?: string;
  priority?: number;
  isActive?: boolean;
}

export const FALLBACK_RIDER_STORIES: RiderStoryItem[] = [
  {
    id: "story_follow",
    title: "Join QuickPress Captains 🛵",
    tagline: "Uttar Pradesh's Fastest Growing Rider Community",
    badge: "CAPTAIN COMMUNITY",
    badgeBg: "bg-rose-500",
    gradient: "from-amber-600 via-rose-600 to-purple-800",
    icon: "🛵",
    points: [
      "10,000+ active captains across Kasganj, Aligarh & UP",
      "Weekly fuel coupons & motorcycle repair discounts",
      "Watch daily tips & earnings hacks by top riders",
    ],
    ctaText: "Follow on Instagram ➔",
    ctaAction: "https://instagram.com",
    actionType: "external_link",
  },
  {
    id: "story_transfer",
    title: "Instant Bank Transfer ⚡",
    tagline: "Direct IMPS Payouts with Zero Deductions",
    badge: "INSTANT CASHOUT",
    badgeBg: "bg-emerald-500",
    gradient: "from-emerald-700 via-teal-800 to-slate-900",
    icon: "🏦",
    points: [
      "Automatic daily settlements 3 times every day",
      "Instant one-tap withdrawal to your registered bank / UPI",
      "100% of order fare belongs to you — 0% commission",
    ],
    ctaText: "Open Wallet ➔",
    ctaAction: "/wallet",
    actionType: "internal_route",
  },
  {
    id: "story_earn2000",
    title: "Refer Friends & Earn ₹2,000 💰",
    tagline: "Exclusive Kasganj & UP Referral Bonanza",
    badge: "REFER & EARN",
    badgeBg: "bg-blue-500",
    gradient: "from-blue-700 via-indigo-900 to-violet-950",
    icon: "💸",
    points: [
      "Share your referral link with biker friends",
      "When they complete 25 orders, you get ₹2,000 cash",
      "No limit on referrals — refer 5 friends, get ₹10,000!",
    ],
    ctaText: "Share Referral Link ➔",
    ctaAction: "https://quickpress.in/captain",
    actionType: "share",
  },
  {
    id: "story_autoboost",
    title: "Auto Boost 2.0 ⚡",
    tagline: "Extra Fares During Peak Laundry Demand",
    badge: "PEAK SURGE",
    badgeBg: "bg-amber-500",
    gradient: "from-amber-600 via-orange-600 to-red-900",
    icon: "⚡",
    points: [
      "+₹20 to +₹45 extra per order during morning & evening rushes",
      "Rain surge activated automatically during bad weather",
      "Priority order dispatch in Kasganj high-demand zones",
    ],
    ctaText: "View Live Boosts ➔",
    ctaAction: "/incentives",
    actionType: "internal_route",
  },
  {
    id: "story_performance",
    title: "Captain Performance Score 🏆",
    tagline: "Maintain 4.8★ & Unlock Gold VIP Captain Perks",
    badge: "VIP TIER",
    badgeBg: "bg-purple-500",
    gradient: "from-purple-700 via-fuchsia-900 to-zinc-950",
    icon: "🏅",
    points: [
      "Gold Captain badge shown to store partners & customers",
      "Complimentary accidental medical insurance coverage",
      "Dedicated VIP Captain priority support phone helpline",
    ],
    ctaText: "Check My Score ➔",
    ctaAction: "/profile",
    actionType: "internal_route",
  },
];

export const FALLBACK_RIDER_BANNER: RiderBannerItem = {
  id: "banner_mystery_reward",
  title: "Tap to earn",
  subtitle: "Guaranteed instant cash reward for active duty!",
  badge: "CAPTAIN REWARD",
  badgeColor: "#FFC107",
  theme: "blue_mystery",
  rewardAmount: 10,
  ctaText: "Tap to earn",
  ctaLink: "",
  actionType: "reward_scratch",
};

export async function fetchRiderStories(): Promise<RiderStoryItem[]> {
  try {
    const res = await apiGetJson<RiderStoryItem[]>("/api/promotions/stories?audience=riders");
    if (Array.isArray(res) && res.length > 0) {
      return res;
    }
    return FALLBACK_RIDER_STORIES;
  } catch {
    return FALLBACK_RIDER_STORIES;
  }
}

export async function fetchRiderBanners(): Promise<RiderBannerItem[]> {
  try {
    const res = await apiGetJson<RiderBannerItem[]>("/api/promotions/banners?audience=riders");
    if (Array.isArray(res) && res.length > 0) {
      return res;
    }
    return [FALLBACK_RIDER_BANNER];
  } catch {
    return [FALLBACK_RIDER_BANNER];
  }
}
