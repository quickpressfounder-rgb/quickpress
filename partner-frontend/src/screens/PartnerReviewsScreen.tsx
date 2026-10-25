import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Heart,
  MessageSquare,
  Package,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Star,
  Store,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PartnerLayout } from "../components/layout/PartnerLayout";
import { partnerRoutes } from "../navigation/partner-routes";
import {
  computeReviewStats,
  fetchPartnerReviews,
  submitPartnerReviewReply,
  type PartnerReview,
  type ReviewStats,
} from "../api/partner/partner-reviews-api";

function formatReviewDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

const SMART_REPLY_TEMPLATES = [
  "Thank you so much for trusting QuickPress with your garments! We are thrilled you loved the quality and packaging.",
  "Thanks for the wonderful review! Our master ironers take extra pride in crisp formal folds. Looking forward to serving you again!",
  "Thank you for your valuable feedback! We appreciate your support and strive to deliver pure freshness every time.",
  "We sincerely apologize for any delay. We coordinate closely with logistics to ensure faster delivery on your next booking.",
];

export function PartnerReviewsScreen() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedRating, setSelectedRating] = useState<number | "all">("all");
  const [replyFilter, setReplyFilter] = useState<"all" | "pending" | "replied">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Reply Composer State
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPartnerReviews();
      setReviews(data);
    } catch {
      toast.error("Failed to load customer reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats: ReviewStats = useMemo(() => computeReviewStats(reviews), [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Rating filter
      if (selectedRating !== "all" && Math.round(r.rating) !== selectedRating) {
        return false;
      }
      // Reply filter
      const hasReply = Boolean(r.reply && r.reply.trim().length > 0);
      if (replyFilter === "pending" && hasReply) return false;
      if (replyFilter === "replied" && !hasReply) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.customerName.toLowerCase().includes(q);
        const matchesComment = r.comment.toLowerCase().includes(q);
        const matchesOrder = r.orderCode?.toLowerCase().includes(q);
        if (!matchesName && !matchesComment && !matchesOrder) return false;
      }
      return true;
    });
  }, [reviews, selectedRating, replyFilter, searchQuery]);

  const pendingReplyCount = useMemo(() => {
    return reviews.filter((r) => !r.reply || r.reply.trim().length === 0).length;
  }, [reviews]);

  const handleStartReply = (review: PartnerReview) => {
    setActiveReplyId(review.id);
    setReplyText(review.reply || "");
  };

  const handleCancelReply = () => {
    setActiveReplyId(null);
    setReplyText("");
  };

  const handleSubmitReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply message before posting.");
      return;
    }
    setSubmittingReply(true);
    try {
      const updated = await submitPartnerReviewReply(reviewId, replyText);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply: updated.reply, repliedAt: updated.repliedAt } : r))
      );
      toast.success("✓ Reply posted successfully! It will now be visible on your customer store profile.");
      setActiveReplyId(null);
      setReplyText("");
    } catch {
      toast.error("Failed to post reply. Please try again.");
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <PartnerLayout
      activeTab="profile"
      title="Customer Reviews & Ratings"
      subtitle="Public feedback, star ratings, and store responses"
    >
      {/* Mobile Top App Bar (< md) */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate({ to: partnerRoutes.shop })}
            className="flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-800 active:scale-95 transition"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-base font-black text-black">Reviews &amp; Ratings</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            <Star className="size-3 fill-emerald-600 text-emerald-600" />
            <span>{stats.averageRating}</span>
          </span>
          <button
            type="button"
            onClick={loadData}
            className="flex size-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 active:scale-95 transition"
            title="Refresh"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-3.5 md:px-8 md:py-6 space-y-4 md:space-y-6">
        {/* Desktop Header Card (>= md) */}
        <div className="hidden md:flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.shop })}
              className="flex size-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 active:scale-95 transition-all shadow-2xs cursor-pointer"
              title="Back to Outlet info"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-zinc-950 tracking-tight">
                  Customer Reviews &amp; Feedback
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <Star className="size-3 fill-emerald-600 text-emerald-600" />
                  {stats.averageRating} Rating
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Reviews posted by verified customers after completing laundry orders. Replies reflect on your public profile.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <RotateCcw className="size-3.5 text-zinc-500" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 1. Mobile Compact Combined Scorecard (< md) */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3 md:hidden">
          <div className="flex items-center justify-between gap-4">
            {/* Score & Stars */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Store Rating
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-black">{stats.averageRating}</span>
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`size-3.5 ${
                        s <= Math.round(stats.averageRating)
                          ? "fill-amber-400 text-amber-500"
                          : "fill-zinc-100 text-zinc-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[11px] font-semibold text-zinc-500">
                {stats.totalReviews} verified reviews · <span className="text-emerald-700 font-bold">{stats.responseRate}% replied</span>
              </p>
            </div>

            {/* Compact Distribution Bars */}
            <div className="w-36 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = (stats.breakdown as any)[star] || 0;
                const percent = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-3 font-bold text-zinc-600">{star}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-5 text-right font-medium text-zinc-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {stats.highlights.length > 0 && (
            <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {stats.highlights.map((h) => (
                <span
                  key={h.tag}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-800"
                >
                  <Sparkles className="size-2.5 text-amber-500" />
                  <span>{h.tag}</span>
                  <span className="text-zinc-400 text-[9px]">({h.count})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 1. Desktop Rating Analytics Summary (>= md) */}
        <div className="hidden md:grid gap-5 md:grid-cols-3">
          {/* Average Rating Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Overall Store Rating
              </span>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-4xl font-black text-zinc-950">{stats.averageRating}</span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`size-4 ${
                          s <= Math.round(stats.averageRating)
                            ? "fill-amber-400 text-amber-500"
                            : "fill-zinc-100 text-zinc-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-bold text-zinc-500">
                    Based on {stats.totalReviews} verified reviews
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="text-zinc-600 font-medium">Store Response Rate:</span>
              <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                {stats.responseRate}% Responded
              </span>
            </div>
          </div>

          {/* Star Breakdown Progress Bars */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Rating Distribution
            </span>
            <div className="space-y-1.5 pt-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = (stats.breakdown as any)[star] || 0;
                const percent = stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2.5 text-xs">
                    <span className="w-6 font-bold text-zinc-700 flex items-center gap-0.5">
                      {star} <Star className="size-2.5 fill-amber-400 text-amber-500" />
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-zinc-500 text-[11px] font-semibold">
                      {count} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Sentiment Highlights */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Customer Sentiments &amp; Badges
              </span>
              <p className="text-xs text-zinc-500 mt-0.5">Top garment care attributes praised by customers</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {stats.highlights.length === 0 ? (
                  <p className="text-xs text-zinc-400 font-medium py-1">No customer tags earned yet.</p>
                ) : (
                  stats.highlights.map((h) => (
                    <span
                      key={h.tag}
                      className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-800"
                    >
                      <Sparkles className="size-3 text-amber-500" />
                      <span>{h.tag}</span>
                      <span className="text-zinc-400 text-[10px]">({h.count})</span>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500">
              💡 Replying to reviews boosts repeat customer bookings by 24%.
            </div>
          </div>
        </div>

        {/* 2. Filter Bar (Responsive Ribbon & Search) */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {/* Status Tabs */}
            <button
              type="button"
              onClick={() => setReplyFilter("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition-all cursor-pointer shrink-0 ${
                replyFilter === "all"
                  ? "bg-black text-white shadow-xs"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              All ({reviews.length})
            </button>
            <button
              type="button"
              onClick={() => setReplyFilter("pending")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black transition-all cursor-pointer shrink-0 ${
                replyFilter === "pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <span>Needs Reply</span>
              {pendingReplyCount > 0 && (
                <span className="rounded-full bg-white px-1.5 py-0.2 text-[10px] font-black text-amber-900">
                  {pendingReplyCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setReplyFilter("replied")}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition-all cursor-pointer shrink-0 ${
                replyFilter === "replied"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Replied ({reviews.length - pendingReplyCount})
            </button>

            <span className="text-zinc-200">|</span>

            {/* Star Filters */}
            <button
              type="button"
              onClick={() => setSelectedRating("all")}
              className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedRating === "all" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              All Stars
            </button>
            {[5, 4, 3, 2, 1].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedRating(st)}
                className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedRating === st
                    ? "bg-amber-500 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                }`}
              >
                <span>{st}</span>
                <Star className="size-2.5 fill-current" />
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search reviews by customer name, order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-black focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* 3. Reviews Feed */}
        {loading ? (
          <div className="py-16 text-center rounded-2xl bg-white border border-zinc-200 shadow-2xs">
            <div className="size-6 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent mx-auto" />
            <p className="mt-3 text-xs font-bold text-zinc-500">Loading customer reviews...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-2xs space-y-2">
            <MessageSquare className="size-10 text-zinc-300 mx-auto" />
            <h3 className="text-sm font-black text-zinc-900">
              {reviews.length === 0 ? "No Customer Reviews Yet" : "No matching reviews found"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {reviews.length === 0
                ? "Ratings, tags, and feedback posted by verified customers for completed orders will appear here automatically."
                : "Try adjusting your rating or status filter to see other customer reviews."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => {
              const isReplying = activeReplyId === review.id;
              const hasReplied = Boolean(review.reply && review.reply.trim().length > 0);

              return (
                <article
                  key={review.id}
                  className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs transition-all hover:border-zinc-300"
                >
                  {/* Top Row: Customer info + Star Rating + Order link */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white font-black text-sm shadow-2xs">
                        {review.customerName ? review.customerName.charAt(0).toUpperCase() : "C"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-zinc-950">{review.customerName}</h3>
                          <span className="rounded-full bg-zinc-100 px-2 py-0.2 text-[10px] font-bold text-zinc-600 border border-zinc-200/60">
                            Verified Customer
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium mt-0.5 flex-wrap">
                          <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`size-3.5 ${
                                  s <= review.rating
                                    ? "fill-amber-400 text-amber-500"
                                    : "fill-zinc-100 text-zinc-300"
                                }`}
                              />
                            ))}
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span>{formatReviewDate(review.date)}</span>
                          {review.serviceName && (
                            <>
                              <span className="text-zinc-300">•</span>
                              <span className="rounded-md bg-zinc-100 px-2 py-0.2 text-[10px] font-bold text-zinc-700">
                                {review.serviceName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order Code pill link */}
                    {review.orderCode && (
                      <Link
                        to={partnerRoutes.orderDetails}
                        params={{ orderId: review.orderId || review.orderCode }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100 hover:border-zinc-300 transition-all cursor-pointer self-start"
                        title="View Full Order Details"
                      >
                        <Package className="size-3.5 text-zinc-500" />
                        <span>Order #{review.orderCode}</span>
                      </Link>
                    )}
                  </div>

                  {/* Customer Review Comment */}
                  <p className="mt-3.5 text-xs font-medium text-zinc-800 leading-relaxed">
                    "{review.comment}"
                  </p>

                  {/* Customer Badges/Tags */}
                  {review.tags && review.tags.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                      {review.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
                        >
                          <ThumbsUp className="size-2.5" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Store Reply Block */}
                  {hasReplied && !isReplying && (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-950">
                          <Store className="size-3.5 text-emerald-600" />
                          <span>Store Response (Your Outlet):</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartReply(review)}
                          className="text-[11px] font-bold text-zinc-600 hover:text-zinc-950 underline cursor-pointer"
                        >
                          Edit Reply
                        </button>
                      </div>
                      <p className="mt-1.5 text-zinc-700 leading-relaxed font-normal">
                        {review.reply}
                      </p>
                      {review.repliedAt && (
                        <p className="mt-1.5 text-[10px] font-medium text-zinc-400">
                          Replied {formatReviewDate(review.repliedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reply Button when no reply exists */}
                  {!hasReplied && !isReplying && (
                    <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[11px] text-amber-800 font-bold bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                        ⚡ Customer is waiting for store response
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartReply(review)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-900 hover:bg-zinc-50 active:scale-95 shadow-2xs transition-all cursor-pointer"
                      >
                        <MessageSquare className="size-3.5 text-zinc-600" />
                        <span>Reply to Customer</span>
                      </button>
                    </div>
                  )}

                  {/* Inline Reply Composer */}
                  {isReplying && (
                    <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-zinc-950 flex items-center gap-1.5">
                          <Store className="size-4 text-emerald-600" />
                          <span>Compose Public Response to {review.customerName}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelReply}
                          className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {/* Quick Smart Templates */}
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                          Quick Templates (Click to fill):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {SMART_REPLY_TEMPLATES.map((tmpl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setReplyText(tmpl)}
                              className="text-[11px] text-zinc-700 bg-white border border-zinc-200 rounded-lg px-2.5 py-1 hover:bg-zinc-100 active:scale-95 transition-all text-left cursor-pointer"
                            >
                              "{tmpl.slice(0, 48)}..."
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a polite, professional reply to the customer..."
                        className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />

                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-zinc-500">
                          🔒 This response will be shown publicly to customers viewing your store.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCancelReply}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={submittingReply || !replyText.trim()}
                            onClick={() => handleSubmitReply(review.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 active:scale-95 transition-all shadow-2xs cursor-pointer"
                          >
                            {submittingReply ? (
                              <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                              <Send className="size-3.5" />
                            )}
                            <span>Post Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
