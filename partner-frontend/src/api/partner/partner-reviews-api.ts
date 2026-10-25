import { apiGetJson, apiPostJson } from "../core/transport";

export interface PartnerReview {
  id: string;
  partnerId?: string;
  customerName: string;
  customerPhone?: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
  orderId?: string;
  orderCode?: string;
  serviceName?: string;
  tags?: string[];
  reply?: string;
  repliedAt?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  responseRate: number; // 0 - 100%
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  highlights: { tag: string; count: number }[];
}

const STORAGE_KEY = "qp_partner_reviews_live_v2";

function loadLocalReviews(): PartnerReview[] {
  if (typeof window === "undefined") return [];
  try {
    // Purge legacy mock data
    localStorage.removeItem("qp_partner_reviews_data_v1");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any mock rev-10x IDs
      return parsed.filter((r) => !String(r.id || "").startsWith("rev-10"));
    }
    return [];
  } catch {
    return [];
  }
}

function saveLocalReviews(reviews: PartnerReview[]): void {
  if (typeof window === "undefined") return;
  try {
    const clean = (reviews || []).filter((r) => !String(r.id || "").startsWith("rev-10"));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (err) {
    console.error("Failed to save local reviews", err);
  }
}

export async function fetchPartnerReviews(): Promise<PartnerReview[]> {
  try {
    const remote = await apiGetJson<PartnerReview[]>("/api/partner/reviews");
    if (Array.isArray(remote)) {
      const clean = remote.filter((r) => !String(r.id || "").startsWith("rev-10"));
      saveLocalReviews(clean);
      return clean;
    }
  } catch {
    // Graceful fallback to local reviews
  }
  return loadLocalReviews();
}

export async function submitPartnerReviewReply(
  reviewId: string,
  replyText: string
): Promise<PartnerReview> {
  const cleanReply = replyText.trim();
  const now = new Date().toISOString();

  // Update local storage first for instant optimistic response
  const current = loadLocalReviews();
  let updatedReview: PartnerReview | null = null;
  const nextList = current.map((r) => {
    if (r.id === reviewId) {
      updatedReview = {
        ...r,
        reply: cleanReply,
        repliedAt: now,
      };
      return updatedReview;
    }
    return r;
  });
  saveLocalReviews(nextList);

  // Sync to backend API asynchronously
  try {
    await apiPostJson(`/api/partner/reviews/${encodeURIComponent(reviewId)}/reply`, {
      reply: cleanReply,
    });
  } catch {
    // Local persisted copy is valid
  }

  return (
    updatedReview || {
      id: reviewId,
      customerName: "Customer",
      rating: 5,
      comment: "",
      date: now,
      reply: cleanReply,
      repliedAt: now,
    }
  );
}

export function computeReviewStats(reviews: PartnerReview[]): ReviewStats {
  if (!reviews.length) {
    return {
      averageRating: 5.0,
      totalReviews: 0,
      responseRate: 100,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      highlights: [],
    };
  }

  const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let repliedCount = 0;
  const tagCountMap: Record<string, number> = {};

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    breakdown[star] = (breakdown[star] || 0) + 1;
    sum += r.rating || 5;
    if (r.reply && r.reply.trim().length > 0) {
      repliedCount++;
    }
    if (Array.isArray(r.tags)) {
      for (const t of r.tags) {
        tagCountMap[t] = (tagCountMap[t] || 0) + 1;
      }
    }
  }

  const averageRating = Number((sum / reviews.length).toFixed(1));
  const responseRate = Math.round((repliedCount / reviews.length) * 100);

  const highlights = Object.entries(tagCountMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    averageRating,
    totalReviews: reviews.length,
    responseRate,
    breakdown: breakdown as any,
    highlights,
  };
}
