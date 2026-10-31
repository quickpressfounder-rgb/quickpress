import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building2,
  Landmark,
  IdCard,
  FileCheck2,
  AlertCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  UserCheck,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  FileText,
  Store,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  fetchPartnerApprovalRequests,
  approvePartnerRequest,
  rejectPartnerRequest,
  type PartnerApprovalRequest,
} from "../api/services";

function formatTimestamp(ts?: string | null): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(ts);
  }
}

function timeAgo(ts?: string | null): string {
  if (!ts) return "";
  try {
    const diffMs = Date.now() - new Date(ts).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

function getRequestTypeMeta(type: string): { label: string; icon: any; color: string; bg: string } {
  switch (type) {
    case "bank_update":
      return {
        label: "Bank Account & Payouts",
        icon: Landmark,
        color: "text-blue-700",
        bg: "bg-blue-50 border-blue-200",
      };
    case "pan_update":
      return {
        label: "PAN Card & Tax KYC",
        icon: CreditCard,
        color: "text-purple-700",
        bg: "bg-purple-50 border-purple-200",
      };
    case "kyc_update":
      return {
        label: "Comprehensive KYC & Documents",
        icon: FileCheck2,
        color: "text-emerald-700",
        bg: "bg-emerald-50 border-emerald-200",
      };
    case "profile_update":
    case "name_update":
      return {
        label: "Store Profile & Contact",
        icon: Store,
        color: "text-indigo-700",
        bg: "bg-indigo-50 border-indigo-200",
      };
    case "service_create":
      return {
        label: "New Service Launch",
        icon: Layers,
        color: "text-amber-700",
        bg: "bg-amber-50 border-amber-200",
      };
    case "service_update":
      return {
        label: "Service Price / Spec Change",
        icon: Layers,
        color: "text-amber-700",
        bg: "bg-amber-50 border-amber-200",
      };
    default:
      return {
        label: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        icon: FileText,
        color: "text-zinc-700",
        bg: "bg-zinc-100 border-zinc-200",
      };
  }
}

interface PartnerRequestsBoxProps {
  onSelectPartner?: (partnerId: string) => void;
}

export function PartnerRequestsBox({ onSelectPartner }: PartnerRequestsBoxProps) {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Reject dialog state
  const [rejectingRequest, setRejectingRequest] = useState<PartnerApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedQuickReason, setSelectedQuickReason] = useState<string | null>(null);

  // Document lightbox preview
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  // Fetch all partner approval requests
  const requestsQuery = useQuery({
    queryKey: ["admin", "partner-approvals", "all"],
    queryFn: () => fetchPartnerApprovalRequests("all"),
    refetchInterval: 15000,
  });

  const allRequests = requestsQuery.data ?? [];

  // Metrics summary
  const metrics = useMemo(() => {
    const total = allRequests.length;
    const pending = allRequests.filter((r) => r.status === "pending").length;
    const approved = allRequests.filter((r) => r.status === "approved").length;
    const rejected = allRequests.filter((r) => r.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [allRequests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return allRequests.filter((r) => {
      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== "all") {
        if (typeFilter === "bank" && r.requestType !== "bank_update") return false;
        if (typeFilter === "kyc" && r.requestType !== "kyc_update") return false;
        if (typeFilter === "pan" && r.requestType !== "pan_update") return false;
        if (typeFilter === "profile" && r.requestType !== "profile_update" && r.requestType !== "name_update") return false;
        if (typeFilter === "service" && r.requestType !== "service_create" && r.requestType !== "service_update") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const bName = (r.businessName || "").toLowerCase();
        const pId = (r.partnerId || "").toLowerCase();
        const rId = (r.requestId || r.id || (r as any)._id || "").toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        const changesStr = JSON.stringify(r.requestedChanges || {}).toLowerCase();
        return bName.includes(q) || pId.includes(q) || rId.includes(q) || reason.includes(q) || changesStr.includes(q);
      }

      return true;
    });
  }, [allRequests, statusFilter, typeFilter, searchQuery]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (requestId: string) => approvePartnerRequest(requestId),
    onSuccess: (_, requestId) => {
      toast.success("Request Approved! Live partner profile & records updated successfully. ✅");
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-services"] });
      if (expandedRequestId === requestId) setExpandedRequestId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to approve partner request.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      rejectPartnerRequest(requestId, reason),
    onSuccess: () => {
      toast.success("Request rejected. Feedback dispatched to partner client. ❌");
      setRejectingRequest(null);
      setRejectReason("");
      setSelectedQuickReason(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reject partner request.");
    },
  });

  const handleApprove = (req: PartnerApprovalRequest) => {
    const id = req.requestId || (req as any)._id || req.id;
    if (!id) {
      toast.error("Invalid request ID");
      return;
    }
    approveMutation.mutate(id);
  };

  const handleOpenReject = (req: PartnerApprovalRequest) => {
    setRejectingRequest(req);
    setRejectReason("");
    setSelectedQuickReason(null);
  };

  const handleConfirmReject = () => {
    if (!rejectingRequest) return;
    const finalReason = (rejectReason || selectedQuickReason || "").trim();
    if (!finalReason) {
      toast.error("Please provide or select a rejection reason.");
      return;
    }
    const id = rejectingRequest.requestId || (rejectingRequest as any)._id || rejectingRequest.id;
    rejectMutation.mutate({ requestId: id, reason: finalReason });
  };

  const quickReasons = [
    "IFSC code does not match the beneficiary bank branch.",
    "Uploaded Cancelled Cheque image is blurry or unreadable.",
    "Account Holder Name does not match registered Business/Owner name.",
    "PAN card photo is cropped or numbers are illegible.",
    "Aadhaar document front or back page is missing.",
    "Provided GSTIN is inactive or invalid on the GST portal.",
  ];

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER & KPI CARDS
      ========================================================================= */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xs">
              <FileCheck2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                  Partner Requests &amp; Approvals Box
                </h2>
                {metrics.pending > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                    <span className="size-2 rounded-full bg-amber-500" />
                    {metrics.pending} Action Required
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Review and approve sensitive profile, bank account, IFSC, PAN, and KYC updates submitted from the Partner mobile app. Approved requests update live collections instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => requestsQuery.refetch()}
              disabled={requestsQuery.isFetching}
              className="text-xs font-bold rounded-xl border-zinc-200 bg-white hover:bg-zinc-50 gap-2 h-9"
            >
              <RefreshCw className={`size-3.5 text-zinc-600 ${requestsQuery.isFetching ? "animate-spin" : ""}`} />
              <span>Refresh Box</span>
            </Button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div
            onClick={() => setStatusFilter("pending")}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              statusFilter === "pending"
                ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20 shadow-xs"
                : "bg-zinc-50/70 border-zinc-200/80 hover:bg-amber-50/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="size-3.5 text-amber-600" />
                Pending Review
              </span>
              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">
              {metrics.pending}
            </div>
            <p className="text-[10px] text-amber-700/80 mt-0.5 font-medium">Awaiting Admin Verification</p>
          </div>

          <div
            onClick={() => setStatusFilter("approved")}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              statusFilter === "approved"
                ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/20 shadow-xs"
                : "bg-zinc-50/70 border-zinc-200/80 hover:bg-emerald-50/40"
            }`}
          >
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Approved &amp; Live
            </span>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {metrics.approved}
            </div>
            <p className="text-[10px] text-emerald-700/80 mt-0.5 font-medium">Synced with Live DB</p>
          </div>

          <div
            onClick={() => setStatusFilter("rejected")}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              statusFilter === "rejected"
                ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/20 shadow-xs"
                : "bg-zinc-50/70 border-zinc-200/80 hover:bg-rose-50/40"
            }`}
          >
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="size-3.5 text-rose-600" />
              Rejected / Invalid
            </span>
            <div className="text-2xl font-black text-rose-950 mt-1">
              {metrics.rejected}
            </div>
            <p className="text-[10px] text-rose-700/80 mt-0.5 font-medium">Returned with Feedback</p>
          </div>

          <div
            onClick={() => setStatusFilter("all")}
            className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
              statusFilter === "all"
                ? "bg-zinc-100 border-zinc-300 ring-2 ring-zinc-400/20 shadow-xs"
                : "bg-zinc-50/70 border-zinc-200/80 hover:bg-zinc-100"
            }`}
          >
            <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="size-3.5 text-zinc-500" />
              Total Logged
            </span>
            <div className="text-2xl font-black text-zinc-900 mt-1">
              {metrics.total}
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">All Lifetime Submissions</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. FILTERS & SEARCH CONTROLS
      ========================================================================= */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="size-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by store name, partner ID, request ID, bank, IFSC, or details..."
              className="pl-9 text-xs rounded-xl border-zinc-200 h-9.5 bg-zinc-50/60 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All Types" },
              { id: "bank", label: "🏦 Bank & Payouts" },
              { id: "kyc", label: "📋 Full KYC" },
              { id: "pan", label: "💳 PAN Card" },
              { id: "profile", label: "🏪 Store Profile" },
              { id: "service", label: "🧺 Services" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  typeFilter === t.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Status:</span>
          {[
            { id: "pending", label: "⏳ Pending Review", count: metrics.pending },
            { id: "all", label: "All Requests", count: metrics.total },
            { id: "approved", label: "✅ Approved", count: metrics.approved },
            { id: "rejected", label: "❌ Rejected", count: metrics.rejected },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                statusFilter === s.id
                  ? "bg-zinc-900 text-white font-bold"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusFilter === s.id ? "bg-zinc-800 text-zinc-200" : "bg-white text-zinc-700 border border-zinc-200"
                }`}
              >
                {s.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          3. REQUESTS LISTING CARDS
      ========================================================================= */}
      {requestsQuery.isLoading ? (
        <div className="p-16 text-center text-xs font-bold text-zinc-500 bg-white rounded-2xl border border-zinc-200 shadow-xs">
          <RefreshCw className="size-6 text-emerald-600 animate-spin mx-auto mb-2.5" />
          Loading partner change requests from database...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-zinc-200 shadow-xs">
          <div className="size-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-3">
            <CheckCircle2 className="size-7 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">No Requests Found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
            {statusFilter === "pending"
              ? "All partner change requests have been verified and processed! New requests submitted by partners will appear here."
              : "No approval requests match your active filters or search criteria."}
          </p>
          {(statusFilter !== "all" || searchQuery || typeFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setTypeFilter("all");
                setSearchQuery("");
              }}
              className="mt-4 text-xs font-bold rounded-xl"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRequests.map((req) => {
            const reqId = req.requestId || (req as any)._id || req.id;
            const meta = getRequestTypeMeta(req.requestType);
            const changes = req.requestedChanges || {};
            const isPending = req.status === "pending";
            const isExpanded = expandedRequestId === reqId || isPending;

            return (
              <div
                key={reqId}
                className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isPending
                    ? "border-amber-300 ring-1 ring-amber-200/70"
                    : req.status === "approved"
                    ? "border-zinc-200"
                    : "border-rose-200"
                }`}
              >
                {/* Main Card Header */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5">
                    <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg}`}>
                      <meta.icon className={`size-5.5 ${meta.color}`} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900">{req.businessName || "Partner Store"}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>

                        {isPending && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-amber-600 animate-pulse" />
                            Pending Review
                          </span>
                        )}
                        {req.status === "approved" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <Check className="size-3 text-emerald-700" />
                            Approved &amp; Live
                          </span>
                        )}
                        {req.status === "rejected" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <X className="size-3 text-rose-700" />
                            Rejected
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 font-medium">
                        <span className="font-mono text-zinc-600 font-bold">REQ: {reqId}</span>
                        <span>•</span>
                        <span className="font-mono text-zinc-500">ID: {req.partnerId}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-600">
                          <Clock className="size-3 text-zinc-400" />
                          {timeAgo(req.submittedAt || req.createdAt)} ({formatTimestamp(req.submittedAt || req.createdAt)})
                        </span>
                      </div>

                      {req.reason && (
                        <p className="text-xs text-zinc-600 italic bg-zinc-50 px-2.5 py-1 rounded-lg border border-zinc-100 inline-block mt-1">
                          Partner Note: &ldquo;{req.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                    {onSelectPartner && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectPartner(req.partnerId)}
                        className="text-xs font-bold rounded-xl border-zinc-200 hover:bg-zinc-100 h-9 gap-1.5"
                      >
                        <Building2 className="size-3.5 text-zinc-500" />
                        <span>View Store 360°</span>
                      </Button>
                    )}

                    {isPending ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReject(req)}
                          disabled={rejectMutation.isPending || approveMutation.isPending}
                          className="text-xs font-bold rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 h-9 gap-1.5"
                        >
                          <XCircle className="size-3.5" />
                          <span>Reject</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleApprove(req)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-xs h-9 gap-1.5"
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Approve &amp; Update Live</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedRequestId(isExpanded ? null : reqId)}
                        className="text-xs font-bold text-zinc-600 rounded-xl hover:bg-zinc-100 h-9 gap-1"
                      >
                        <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                        <ChevronDown className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Changes Inspector */}
                {isExpanded && (
                  <div className="bg-zinc-50/80 border-t border-zinc-100 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="size-3.5 text-zinc-400" />
                        Requested Change Payload (Direct Live Database Merge)
                      </span>

                      {req.reviewedBy && (
                        <span className="text-[11px] text-zinc-500">
                          Reviewed by <strong className="text-zinc-800">{req.reviewedBy}</strong> at{" "}
                          {formatTimestamp(req.reviewedAt)}
                        </span>
                      )}
                    </div>

                    {/* Rejection notice if rejected */}
                    {req.status === "rejected" && req.rejectionReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                        <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Rejection Reason:</strong> {req.rejectionReason}
                        </div>
                      </div>
                    )}

                    {/* Specific Data Grids based on type */}
                    {req.requestType === "bank_update" || req.requestType === "kyc_update" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Bank Name</span>
                            <span className="text-xs font-bold text-zinc-900 mt-0.5 block">
                              {changes.bankName || "—"}
                            </span>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Account Holder</span>
                            <span className="text-xs font-bold text-zinc-900 mt-0.5 block">
                              {changes.accountHolder || changes.accountHolderName || "—"}
                            </span>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Account Number</span>
                            <span className="text-xs font-mono font-bold text-zinc-900 mt-0.5 block">
                              {changes.accountNumber || "—"}
                            </span>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">IFSC Code</span>
                            <span className="text-xs font-mono font-bold text-emerald-700 mt-0.5 block">
                              {changes.ifsc || changes.ifscCode || "—"}
                            </span>
                          </div>
                        </div>

                        {/* KYC / PAN / Aadhaar fields if in kyc_update */}
                        {(changes.pan || changes.panNumber || changes.aadhaar || changes.gstin) && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(changes.pan || changes.panNumber) && (
                              <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">PAN Number</span>
                                <span className="text-xs font-mono font-bold text-zinc-900 mt-0.5 block">
                                  {changes.pan || changes.panNumber}
                                </span>
                              </div>
                            )}

                            {changes.aadhaar && (
                              <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Aadhaar UID</span>
                                <span className="text-xs font-mono font-bold text-zinc-900 mt-0.5 block">
                                  {changes.aadhaar}
                                </span>
                              </div>
                            )}

                            {changes.gstin && (
                              <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">GSTIN</span>
                                <span className="text-xs font-mono font-bold text-zinc-900 mt-0.5 block">
                                  {changes.gstin}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Attached Photos / Documents (Cheque, PAN, Aadhaar) */}
                        {(changes.chequePhoto || changes.panCard || changes.aadhaarFront || changes.aadhaarBack) && (
                          <div className="bg-white p-3.5 rounded-xl border border-zinc-200 space-y-2">
                            <span className="text-[11px] font-bold text-zinc-600 block">
                              Attached Document Verifications
                            </span>
                            <div className="flex flex-wrap gap-3">
                              {changes.chequePhoto && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({ url: changes.chequePhoto, title: "Cancelled Cheque / Passbook" })}
                                  className="group flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-left"
                                >
                                  <img
                                    src={changes.chequePhoto}
                                    alt="Cancelled Cheque"
                                    className="size-12 rounded-lg object-cover border border-zinc-200 bg-zinc-100"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-zinc-800 block group-hover:text-emerald-700">
                                      Cancelled Cheque
                                    </span>
                                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                      <Eye className="size-3" /> Click to inspect
                                    </span>
                                  </div>
                                </button>
                              )}

                              {changes.panCard && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({ url: changes.panCard, title: "Income Tax PAN Card" })}
                                  className="group flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-left"
                                >
                                  <img
                                    src={changes.panCard}
                                    alt="PAN Card"
                                    className="size-12 rounded-lg object-cover border border-zinc-200 bg-zinc-100"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-zinc-800 block group-hover:text-emerald-700">
                                      PAN Card Photo
                                    </span>
                                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                      <Eye className="size-3" /> Click to inspect
                                    </span>
                                  </div>
                                </button>
                              )}

                              {changes.aadhaarFront && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({ url: changes.aadhaarFront, title: "Aadhaar Card Front" })}
                                  className="group flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-left"
                                >
                                  <img
                                    src={changes.aadhaarFront}
                                    alt="Aadhaar Front"
                                    className="size-12 rounded-lg object-cover border border-zinc-200 bg-zinc-100"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-zinc-800 block group-hover:text-emerald-700">
                                      Aadhaar Front
                                    </span>
                                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                      <Eye className="size-3" /> Click to inspect
                                    </span>
                                  </div>
                                </button>
                              )}

                              {changes.aadhaarBack && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({ url: changes.aadhaarBack, title: "Aadhaar Card Back" })}
                                  className="group flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all text-left"
                                >
                                  <img
                                    src={changes.aadhaarBack}
                                    alt="Aadhaar Back"
                                    className="size-12 rounded-lg object-cover border border-zinc-200 bg-zinc-100"
                                  />
                                  <div>
                                    <span className="text-xs font-bold text-zinc-800 block group-hover:text-emerald-700">
                                      Aadhaar Back
                                    </span>
                                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                      <Eye className="size-3" /> Click to inspect
                                    </span>
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : req.requestType === "pan_update" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-zinc-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Updated PAN Number</span>
                          <span className="text-sm font-mono font-bold text-zinc-900 mt-1 block">
                            {changes.pan || changes.panNumber || "—"}
                          </span>
                        </div>
                        {changes.panCard && (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ url: changes.panCard, title: "PAN Card Document" })}
                            className="bg-white p-3 rounded-xl border border-zinc-200/80 flex items-center gap-3 text-left hover:border-emerald-300 transition-all"
                          >
                            <img src={changes.panCard} alt="PAN" className="size-10 rounded-lg object-cover" />
                            <div>
                              <span className="text-xs font-bold text-zinc-800 block">PAN Document Attached</span>
                              <span className="text-[10px] text-emerald-600 font-medium">Click to inspect</span>
                            </div>
                          </button>
                        )}
                      </div>
                    ) : req.requestType === "service_create" || req.requestType === "service_update" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Service Name</span>
                            <span className="text-sm font-black text-zinc-950 mt-1 block">
                              {changes.serviceName || changes.name || "—"}
                            </span>
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Category & Unit</span>
                            <span className="text-xs font-bold text-zinc-800 mt-1 block capitalize">
                              {changes.category || "Laundry"} · per {changes.unit || "kg"}
                            </span>
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                              {req.requestType === "service_update" && changes.currentPrice !== undefined ? "Price Change" : "Requested Price"}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {req.requestType === "service_update" && changes.currentPrice !== undefined && (
                                <>
                                  <span className="text-xs font-bold text-zinc-400 line-through">₹{changes.currentPrice}</span>
                                  <span className="text-xs font-bold text-zinc-400">→</span>
                                </>
                              )}
                              <span className="text-sm font-black text-emerald-700">
                                ₹{changes.newPrice ?? changes.price ?? "—"}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Turnaround Time</span>
                            <span className="text-xs font-bold text-zinc-800 mt-1 block">
                              {changes.newTurnaround ?? changes.turnaroundHours ?? 24} Hours
                            </span>
                          </div>
                        </div>

                        {changes.description && (
                          <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 text-xs text-zinc-600">
                            <strong className="text-zinc-900 block font-bold mb-1">Service Description:</strong>
                            {changes.description}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* General Raw Changes Grid */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {Object.entries(changes).map(([k, v]) => (
                          <div key={k} className="bg-white p-3 rounded-xl border border-zinc-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                              {k.replace(/([A-Z])/g, " $1")}
                            </span>
                            <span className="text-xs font-semibold text-zinc-900 mt-0.5 block truncate">
                              {typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          4. REJECT CONFIRMATION MODAL
      ========================================================================= */}
      <Dialog open={Boolean(rejectingRequest)} onOpenChange={(open) => !open && setRejectingRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <XCircle className="size-5 text-rose-600" />
              <span>Reject Partner Change Request</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Provide specific feedback so the merchant understands why this update was declined and can re-submit valid documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1.5">
                Quick Select Common Reasons:
              </label>
              <div className="space-y-1.5">
                {quickReasons.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() => {
                      setSelectedQuickReason(qr);
                      setRejectReason(qr);
                    }}
                    className={`w-full text-left text-xs p-2 rounded-lg border transition-all ${
                      selectedQuickReason === qr
                        ? "bg-rose-50 border-rose-300 text-rose-900 font-medium"
                        : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    • {qr}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                Custom Feedback Note:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter detailed reason to be shown to the partner..."
                rows={3}
                className="w-full text-xs rounded-xl border border-zinc-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectingRequest(null)}
              className="text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
            >
              <XCircle className="size-3.5" />
              <span>{rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          5. DOCUMENT LIGHTBOX MODAL
      ========================================================================= */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-zinc-900 flex items-center justify-between">
              <span>{previewDoc?.title || "Document Preview"}</span>
              {previewDoc?.url && (
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="size-3" />
                  <span>Open Full Size</span>
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 flex items-center justify-center bg-zinc-950/90 rounded-2xl p-4 overflow-hidden max-h-[75vh]">
            {previewDoc?.url ? (
              <img
                src={previewDoc.url}
                alt={previewDoc.title}
                className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewDoc(null)}
              className="text-xs font-bold rounded-xl"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
