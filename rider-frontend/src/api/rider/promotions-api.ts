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
    title: "Follow",
    tagline: "Uttar Pradesh's Fastest Growing Rider Community",
    badge: "Follow",
    badgeBg: "bg-[#2A1E5C]",
    gradient: "from-amber-500 via-rose-500 to-red-500",
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
    title: "Transfer Money",
    tagline: "Direct IMPS Payouts with Zero Deductions",
    badge: "Money Transf...",
    badgeBg: "bg-[#1E293B]",
    gradient: "from-amber-400 via-amber-500 to-yellow-500",
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
    title: "Earn 2000",
    tagline: "Exclusive Kasganj & UP Referral Bonanza",
    badge: "REFER & EARN",
    badgeBg: "bg-blue-600",
    gradient: "from-indigo-600 via-blue-600 to-violet-800",
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
    title: "Auto Boost",
    tagline: "Extra Fares During Peak Laundry Demand",
    badge: "Auto Boost",
    badgeBg: "bg-amber-600",
    gradient: "from-blue-400 via-sky-500 to-cyan-600",
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
    title: "Performance",
    tagline: "Maintain 4.8★ & Unlock Gold VIP Captain Perks",
    badge: "Top Captain",
    badgeBg: "bg-purple-600",
    gradient: "from-purple-600 via-fuchsia-700 to-indigo-800",
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
