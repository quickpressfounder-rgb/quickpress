import { useState } from "react";
import { Star, ThumbsUp, X, Sparkles, Check, Heart, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/api/customer/api/http-client";

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  partnerName?: string;
  riderName?: string;
  onSuccess?: () => void;
}

const STORE_TAGS = [
  "Super Clean Wash",
  "Crisp Steam Iron",
  "Great Fragrance",
  "Neat Packaging",
  "Fast Turnaround",
  "Fabric Care",
];

const RIDER_TAGS = [
  "On Time",
  "Polite Rider",
  "Careful Handling",
  "Fast Pickup",
  "Smooth Delivery",
];

export function OrderReviewModal({
  isOpen,
  onClose,
  orderId,
  partnerName = "Laundry Partner",
  riderName = "Delivery Rider",
  onSuccess,
}: OrderReviewModalProps) {
  const [storeRating, setStoreRating] = useState(5);
  const [storeHover, setStoreHover] = useState(0);
  const [storeFeedback, setStoreFeedback] = useState("");
  const [selectedStoreTags, setSelectedStoreTags] = useState<string[]>([
    "Super Clean Wash",
    "Neat Packaging",
  ]);

  const [riderRating, setRiderRating] = useState(5);
  const [riderHover, setRiderHover] = useState(0);
  const [riderFeedback, setRiderFeedback] = useState("");
  const [selectedRiderTags, setSelectedRiderTags] = useState<string[]>([
    "On Time",
    "Polite Rider",
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleStoreTag = (tag: string) => {
    setSelectedStoreTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleRiderTag = (tag: string) => {
    setSelectedRiderTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost(`/api/orders/${orderId}/review`, {
        storeRating,
        storeFeedback,
        storeTags: selectedStoreTags,
        riderRating,
        riderFeedback,
        riderTags: selectedRiderTags,
      });

      setSubmitted(true);
      toast.success("Thank you for your rating & review!");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                Rate & Review Order
              </h3>
              <p className="text-[11px] font-medium text-zinc-500">Order #{orderId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          >
            <X className="size-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-12 text-center animate-pop">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Check className="size-8 stroke-[3]" />
            </div>
            <h4 className="mt-4 text-lg font-black text-zinc-950 dark:text-white">
              Feedback Submitted!
            </h4>
            <p className="mt-1 text-xs text-zinc-500">
              Your feedback helps {partnerName} and riders maintain 5-star service.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-6">
            {/* Section 1: Store Rating */}
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4.5 dark:border-zinc-800/80 dark:bg-zinc-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    Store Rating
                  </p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {partnerName}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (storeHover || storeRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setStoreRating(star)}
                        onMouseEnter={() => setStoreHover(star)}
                        onMouseLeave={() => setStoreHover(0)}
                        className="p-1 transition-transform active:scale-125"
                      >
                        <Star
                          className={`size-6 transition-colors ${
                            active
                              ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                              : "text-zinc-300 dark:text-zinc-700"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Store tags */}
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {STORE_TAGS.map((tag) => {
                  const isSelected = selectedStoreTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleStoreTag(tag)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                        isSelected
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-zinc-200/80 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Store text comment */}
              <textarea
                value={storeFeedback}
                onChange={(e) => setStoreFeedback(e.target.value)}
                placeholder="Write a comment about garment quality, fold, fragrance..."
                rows={2}
                className="mt-3 w-full rounded-xl border border-zinc-200/80 bg-white p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Section 2: Delivery Rider Rating */}
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4.5 dark:border-zinc-800/80 dark:bg-zinc-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-blue-800 dark:text-blue-400">
                    Delivery Experience
                  </p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {riderName}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (riderHover || riderRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRiderRating(star)}
                        onMouseEnter={() => setRiderHover(star)}
                        onMouseLeave={() => setRiderHover(0)}
                        className="p-1 transition-transform active:scale-125"
                      >
                        <Star
                          className={`size-6 transition-colors ${
                            active
                              ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                              : "text-zinc-300 dark:text-zinc-700"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rider tags */}
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {RIDER_TAGS.map((tag) => {
                  const isSelected = selectedRiderTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleRiderTag(tag)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs"
                          : "border border-zinc-200/80 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Rider text comment */}
              <textarea
                value={riderFeedback}
                onChange={(e) => setRiderFeedback(e.target.value)}
                placeholder="How was the pickup and delivery experience?"
                rows={2}
                className="mt-3 w-full rounded-xl border border-zinc-200/80 bg-white p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-2xl border border-zinc-200 py-3 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Submit Rating & Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
