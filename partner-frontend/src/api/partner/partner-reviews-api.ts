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

const STORAGE_KEY = "qp_partner_reviews_data_v1";

const DEFAULT_REVIEWS: PartnerReview[] = [
  {
    id: "rev-101",
    customerName: "Himanshu Pal",
    customerPhone: "+91 98••• ••21",
    rating: 5,
    comment:
      "Formal shirts and double bedsheets were steam ironed with crisp creases. No chemical odor, packaging was sealed with care. Very impressed with the quick turnaround!",
    date: "2026-10-23T14:30:00Z",
    orderId: "ord-4040",
    orderCode: "PRT-4040",
    serviceName: "Wash & Steam Iron",
    tags: ["Crisp Creases", "Sealed Packaging", "On-Time Delivery"],
    reply:
      "Thank you for trusting QuickPress with your garments, Himanshu! We take special care with temperature settings for formal fabrics. Looking forward to serving you again!",
    repliedAt: "2026-10-23T16:00:00Z",
  },
  {
    id: "rev-102",
    customerName: "Pooja Verma",
    customerPhone: "+91 94••• ••88",
    rating: 5,
    comment:
      "Sent 3 heavy silk sarees and winter woolens for dry cleaning. Stains on the pallu are completely gone without any color fading. Superb craftsmanship!",
    date: "2026-10-22T11:15:00Z",
    orderId: "ord-3921",
    orderCode: "PRT-3921",
    serviceName: "Premium Dry Cleaning",
    tags: ["Stain Removal", "Fabric Safe", "Hanger Packed"],
    reply: undefined,
  },
  {
    id: "rev-103",
    customerName: "Amitabh Singhal",
    customerPhone: "+91 97••• ••40",
    rating: 4,
    comment:
      "Washing quality is solid and clothes smell fresh. Delivery captain was slightly delayed by 10 minutes due to rain, but courteous and polite.",
    date: "2026-10-21T18:45:00Z",
    orderId: "ord-3890",
    orderCode: "PRT-3890",
    serviceName: "Wash & Fold",
    tags: ["Fresh Fragrance", "Polite Captain"],
    reply:
      "Thank you for the valuable feedback, Amitabh! We coordinate closely with our fleet ops during monsoon spells to minimize any transit delays. Appreciate your support!",
    repliedAt: "2026-10-22T09:30:00Z",
  },
  {
    id: "rev-104",
    customerName: "Neha Sharma",
    customerPhone: "+91 91••• ••12",
    rating: 5,
    comment:
      "Ordered curtain cleaning and sofa covers. Packed neatly in eco-friendly laundry bags. Saved me entire weekend hassle!",
    date: "2026-10-20T10:00:00Z",
    orderId: "ord-3811",
    orderCode: "PRT-3811",
    serviceName: "Heavy Fabric Care",
    tags: ["Clean Packaging", "Time Saver"],
    reply: undefined,
  },
  {
    id: "rev-105",
    customerName: "Rakesh Agarwal",
    customerPhone: "+91 88••• ••65",
    rating: 5,
    comment:
      "Stain removal on my cotton sherwani was flawless. Transparent pricing with zero hidden charges. Best laundry partner in Kasganj.",
    date: "2026-10-19T16:20:00Z",
    orderId: "ord-3788",
    orderCode: "PRT-3788",
    serviceName: "Steam Ironing & Stain Care",
    tags: ["Stain Removal", "Transparent Pricing"],
    reply:
      "Delighted to hear that, Rakesh ji! Delicates and festive wear get hand-inspected by our master pressers. Thank you!",
    repliedAt: "2026-10-20T08:15:00Z",
  },
  {
    id: "rev-106",
    customerName: "Sunil Mehra",
    customerPhone: "+91 99••• ••09",
    rating: 4,
    comment:
      "Regular everyday laundry done nicely. Folding is uniform and fits straight into the wardrobe.",
    date: "2026-10-18T13:00:00Z",
    orderId: "ord-3712",
    orderCode: "PRT-3712",
    serviceName: "Daily Wash & Fold",
    tags: ["Neat Folding"],
    reply: undefined,
  },
];

function loadLocalReviews(): PartnerReview[] {
  if (typeof window === "undefined") return DEFAULT_REVIEWS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REVIEWS));
      return DEFAULT_REVIEWS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_REVIEWS;
  } catch {
    return DEFAULT_REVIEWS;
  }
}

function saveLocalReviews(reviews: PartnerReview[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch (err) {
    console.error("Failed to save local reviews", err);
  }
}

export async function fetchPartnerReviews(): Promise<PartnerReview[]> {
  try {
    const remote = await apiGetJson<PartnerReview[]>("/api/partner/reviews");
    if (Array.isArray(remote) && remote.length > 0) {
      saveLocalReviews(remote);
      return remote;
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
