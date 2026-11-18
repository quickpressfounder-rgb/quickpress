import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Star,
  Search,
  RefreshCw,
  Filter,
  User,
  Building2,
  Truck,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Heart,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "../components/AdminShell";
import { SectionCard, KpiCard } from "../components/AdminUI";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/dialog";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { fetchAdminReviews, fetchOrder360Reviews, type ReviewItem, type Reviews360Data } from "../api/reviews";

export const Route = createFileRoute("/reviews")({
  beforeLoad: requireAdminSession,
  ssr: false,
  head: () =>
    adminHead(
      "360° Mutual Reviews & Quality Audit",
      "Monitor, audit, and inspect mutual ratings exchanged between Customers, Partners, and Captains."
    ),
  component: AdminReviewsScreen,
});

function RatingStars({ rating = 0 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`size-4 ${
            s <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-zinc-200 dark:text-zinc-700"
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-black text-zinc-900 dark:text-zinc-100">{rating}.0</span>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case "customer":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950/60 px-2.5 py-0.5 text-[11px] font-black text-blue-700 dark:text-blue-300">
          <User className="size-3" /> Customer
        </span>
      );
    case "partner":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
          <Building2 className="size-3" /> Partner Store
        </span>
      );
    case "rider":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-[11px] font-black text-amber-800 dark:text-amber-300">
          <Truck className="size-3" /> Delivery Captain
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-black text-zinc-700">
          {role}
        </span>
      );
  }
}

export function AdminReviewsScreen() {
  const [activeTab, setActiveTab] = useState<"all" | "customer" | "partner" | "rider">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectOrderId, setInspectOrderId] = useState<string | null>(null);

  const { data: reviews = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => fetchAdminReviews(200),
  });

  const { data: reviews360, isLoading: isLoading360 } = useQuery({
    queryKey: ["admin", "reviews-360", inspectOrderId],
    queryFn: () => (inspectOrderId ? fetchOrder360Reviews(inspectOrderId) : null),
    enabled: Boolean(inspectOrderId),
  });

  const stats = useMemo(() => {
    let totalReviews = reviews.length;
    let storeSum = 0;
    let storeCount = 0;
    let riderSum = 0;
    let riderCount = 0;
    let customerSum = 0;
    let customerCount = 0;

    for (const r of reviews) {
      if (r.storeRating) {
        storeSum += r.storeRating;
        storeCount += 1;
      }
      if (r.riderRating) {
        riderSum += r.riderRating;
        riderCount += 1;
      }
      if (r.customerRating) {
        customerSum += r.customerRating;
        customerCount += 1;
      }
    }

    return {
      total: totalReviews,
      avgStore: storeCount > 0 ? (storeSum / storeCount).toFixed(1) : "5.0",
      avgRider: riderCount > 0 ? (riderSum / riderCount).toFixed(1) : "5.0",
      avgCustomer: customerCount > 0 ? (customerSum / customerCount).toFixed(1) : "5.0",
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    let list = reviews;
    if (activeTab !== "all") {
      list = list.filter((r) => r.sourceRole === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.orderId?.toLowerCase().includes(q) ||
          r.orderCode?.toLowerCase().includes(q) ||
          r.customerName?.toLowerCase().includes(q) ||
          r.storeName?.toLowerCase().includes(q) ||
          r.riderName?.toLowerCase().includes(q) ||
          (r.storeFeedback && r.storeFeedback.toLowerCase().includes(q)) ||
          (r.riderFeedback && r.riderFeedback.toLowerCase().includes(q)) ||
          (r.customerFeedback && r.customerFeedback.toLowerCase().includes(q))
      );
    }
    return list;
  }, [reviews, activeTab, searchQuery]);

  return (
    <AdminShell
      title="360° Mutual Reviews & Quality Audit"
      description="Inspect mutual ratings exchanged between Customers, Laundromat Stores, and Delivery Captains."
    >
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Reviews Exchanged"
            value={String(stats.total)}
            hint="Audited 360-degree feedback documents"
          />
          <KpiCard
            label="Store Quality Rating"
            value={`${stats.avgStore} ⭐`}
            hint="Average Laundromat partner rating"
          />
          <KpiCard
            label="Captain Fleet Rating"
            value={`${stats.avgRider} ⭐`}
            hint="Average Delivery captain rating"
          />
          <KpiCard
            label="Customer Courtesy Rating"
            value={`${stats.avgCustomer} ⭐`}
            hint="Average customer etiquette rating"
          />
        </div>

        {/* Toolbar & Filters */}
        <SectionCard
          title="Mutual Review Stream"
          subtitle="Real-time audit log of mutual feedback across all parties"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                toast.success("Reviews refreshed");
              }}
              disabled={isFetching}
              className="gap-2 text-xs font-bold"
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Source Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === "all"
                      ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  All ({reviews.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("customer")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === "customer"
                      ? "bg-white dark:bg-zinc-900 text-blue-600 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  Customer Reviews
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("partner")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === "partner"
                      ? "bg-white dark:bg-zinc-900 text-emerald-600 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  Partner Reviews
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("rider")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === "rider"
                      ? "bg-white dark:bg-zinc-900 text-amber-600 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  Captain Reviews
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  placeholder="Search by order ID, author, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs rounded-2xl h-10"
                />
              </div>
            </div>

            {/* Reviews Feed List */}
            {isLoading ? (
              <div className="flex items-center justify-center p-12 text-sm text-zinc-500 font-bold">
                Loading mutual ratings feed...
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Star className="size-10 text-zinc-300 mb-2" />
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No mutual reviews found</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Once orders complete, feedback submitted by Customers, Stores, or Captains will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center gap-2">
                          <RoleBadge role={r.sourceRole} />
                          <span className="font-mono text-xs font-black text-zinc-900 dark:text-zinc-200">
                            #{r.orderCode || r.orderId}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-zinc-400">
                          {new Date(r.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Author Line */}
                      <div className="pt-3">
                        <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                          Submitted by:{" "}
                          <span className="text-zinc-950 dark:text-zinc-100 font-black">
                            {r.sourceRole === "customer"
                              ? r.customerName || "Customer"
                              : r.sourceRole === "partner"
                              ? r.storeName || "Partner Store"
                              : r.riderName || "Delivery Captain"}
                          </span>
                        </p>
                      </div>

                      {/* Ratings Breakdown */}
                      <div className="mt-3 space-y-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 p-3.5 border border-zinc-100 dark:border-zinc-800">
                        {r.storeRating ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                              <Building2 className="size-3.5 text-emerald-600" />
                              Store Rating:
                            </span>
                            <RatingStars rating={r.storeRating} />
                          </div>
                        ) : null}

                        {r.riderRating ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                              <Truck className="size-3.5 text-amber-600" />
                              Captain Rating:
                            </span>
                            <RatingStars rating={r.riderRating} />
                          </div>
                        ) : null}

                        {r.customerRating ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                              <User className="size-3.5 text-blue-600" />
                              Customer Courtesy:
                            </span>
                            <RatingStars rating={r.customerRating} />
                          </div>
                        ) : null}
                      </div>

                      {/* Feedback Comment */}
                      {(r.storeFeedback || r.riderFeedback || r.customerFeedback) ? (
                        <div className="mt-3 text-xs text-zinc-700 dark:text-zinc-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                          <p className="font-medium italic">
                            "{r.storeFeedback || r.riderFeedback || r.customerFeedback}"
                          </p>
                        </div>
                      ) : null}

                      {/* Tag Chips */}
                      {((r.storeTags?.length || 0) + (r.riderTags?.length || 0) + (r.customerTags?.length || 0)) > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {[...(r.storeTags || []), ...(r.riderTags || []), ...(r.customerTags || [])].map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Bottom Action: Inspect 360 */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[150px]">
                        ID: {r.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => setInspectOrderId(r.orderId)}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline cursor-pointer"
                      >
                        <Layers className="size-3.5" />
                        Inspect 360° Loop
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* 360° Mutual Review Inspection Modal */}
      <Dialog open={Boolean(inspectOrderId)} onOpenChange={(open) => !open && setInspectOrderId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Sparkles className="size-5 text-amber-500" />
              360° Mutual Ratings & Quality Loop
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete mutual rating exchange between all 3 counterparties for Order #{inspectOrderId}
            </DialogDescription>
          </DialogHeader>

          {isLoading360 ? (
            <div className="py-12 text-center text-sm font-bold text-zinc-500">
              Retrieving 360-degree review tree...
            </div>
          ) : !reviews360 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No 360 feedback records available for this order.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Mutual Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Customer Gave */}
                <div className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                  <span className="text-xs font-black text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <User className="size-3.5 text-blue-600" /> Customer Gave
                  </span>
                  <div className="text-xs space-y-1 pt-1 font-bold text-zinc-700 dark:text-zinc-300">
                    <p>To Store: <span className="font-black text-amber-600">{reviews360.mutualRatings?.customerGaveStore ?? "—"} ⭐</span></p>
                    <p>To Captain: <span className="font-black text-amber-600">{reviews360.mutualRatings?.customerGaveRider ?? "—"} ⭐</span></p>
                  </div>
                </div>

                {/* 2. Partner Gave */}
                <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                  <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-emerald-600" /> Partner Store Gave
                  </span>
                  <div className="text-xs space-y-1 pt-1 font-bold text-zinc-700 dark:text-zinc-300">
                    <p>To Captain: <span className="font-black text-amber-600">{reviews360.mutualRatings?.partnerGaveRider ?? "—"} ⭐</span></p>
                    <p>To Customer: <span className="font-black text-amber-600">{reviews360.mutualRatings?.partnerGaveCustomer ?? "—"} ⭐</span></p>
                  </div>
                </div>

                {/* 3. Captain Gave */}
                <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                  <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Truck className="size-3.5 text-amber-600" /> Captain Gave
                  </span>
                  <div className="text-xs space-y-1 pt-1 font-bold text-zinc-700 dark:text-zinc-300">
                    <p>To Customer: <span className="font-black text-amber-600">{reviews360.mutualRatings?.riderGaveCustomer ?? "—"} ⭐</span></p>
                    <p>To Store: <span className="font-black text-amber-600">{reviews360.mutualRatings?.riderGaveStore ?? "—"} ⭐</span></p>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold flex items-center justify-between">
                <span>All 3 Parties Participation:</span>
                <span className={`inline-flex items-center gap-1 ${
                  reviews360.hasCustomerReview && reviews360.hasPartnerReview && reviews360.hasRiderReview
                    ? "text-emerald-600 font-black"
                    : "text-amber-600 font-black"
                }`}>
                  <ShieldCheck className="size-4" />
                  {reviews360.hasCustomerReview && reviews360.hasPartnerReview && reviews360.hasRiderReview
                    ? "100% Complete 360° Loop"
                    : "Partially Exchanged"}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
