import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  IdCard,
  FileCheck2,
  AlertCircle,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  X,
  FileText,
  Truck,
  Bike,
  Layers,
  ArrowRight,
  RotateCcw,
  Phone,
  MapPin,
  AlertTriangle,
  Calendar,
  Filter,
  CheckCircle,
  ShieldAlert,
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
import { fetchRiders, setRiderStatus, type AdminRider } from "../api/riders";

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

interface RiderRequestsBoxProps {
  onSelectRider?: (riderId: string) => void;
}

export function RiderRequestsBox({ onSelectRider }: RiderRequestsBoxProps) {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "resubmitted" | "flagged">("pending");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRiderId, setExpandedRiderId] = useState<string | null>(null);

  // Reject dialog state
  const [rejectingRider, setRejectingRider] = useState<AdminRider | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedQuickReason, setSelectedQuickReason] = useState<string | null>(null);

  // Document lightbox preview
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  // Fetch all riders
  const ridersQuery = useQuery({
    queryKey: ["admin", "riders"],
    queryFn: fetchRiders,
    refetchInterval: 15000,
  });

  const allRiders = ridersQuery.data ?? [];

  // Metrics summary
  const metrics = useMemo(() => {
    let pending = 0;
    let resubmitted = 0;
    let flagged = 0;

    allRiders.forEach((r) => {
      const isPending = r.status === "Pending" || r.kyc === "Pending";
      const isResub = Boolean(r.resubmitted);
      const isFlagged = r.status === "Suspended" || r.kyc === "Rejected" || Boolean(r.rejectionReason);

      if (isResub) {
        resubmitted++;
      } else if (isPending) {
        pending++;
      }
      if (isFlagged) {
        flagged++;
      }
    });

    const total = pending + resubmitted + flagged;
    return { total, pending, resubmitted, flagged };
  }, [allRiders]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return allRiders.filter((r) => {
      const isPending = r.status === "Pending" || r.kyc === "Pending";
      const isResub = Boolean(r.resubmitted);
      const isFlagged = r.status === "Suspended" || r.kyc === "Rejected" || Boolean(r.rejectionReason);

      // Status filter
      if (statusFilter === "pending") {
        if (!isPending && !isResub) return false;
      } else if (statusFilter === "resubmitted") {
        if (!isResub) return false;
      } else if (statusFilter === "flagged") {
        if (!isFlagged) return false;
      } else if (statusFilter === "all") {
        // In request box, "all" shows pending, resubmitted, and flagged applications
        if (!isPending && !isResub && !isFlagged) return false;
      }

      // Vehicle filter
      if (vehicleFilter !== "all") {
        if (!r.vehicle.toLowerCase().includes(vehicleFilter.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          r.id.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.plate.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.zone.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [allRiders, statusFilter, vehicleFilter, searchQuery]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => setRiderStatus(id, "approve"),
    onSuccess: (_, id) => {
      toast.success("Rider Candidate Approved! Pilot account is now active for order assignments. 🎉");
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", id] });
      if (expandedRiderId === id) setExpandedRiderId(null);
    },
    onError: () => {
      toast.error("Failed to approve rider application.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      setRiderStatus(id, "reject", reason),
    onSuccess: (_, { id }) => {
      toast.success("Rider Application Rejected & Notice Logged. ❌");
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", id] });
      setRejectingRider(null);
      setRejectReason("");
      setSelectedQuickReason(null);
      if (expandedRiderId === id) setExpandedRiderId(null);
    },
    onError: () => {
      toast.error("Failed to reject rider application.");
    },
  });

  const quickReasons = [
    "Driving License (DL) photo is blurry, cropped, or expired. Please re-upload clear photo.",
    "Vehicle RC certificate details do not match plate number. Please re-upload valid RC.",
    "Selfie biometric photo does not match government Aadhaar/PAN photo.",
    "Bank account details / cancelled cheque IFSC is invalid or unreadable.",
    "Candidate does not meet minimum age or document compliance requirements.",
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header Metrics Strip (CRM Pure-White Standard) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter("pending")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "pending"
              ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
              : "bg-white text-zinc-900 border-zinc-200/90 hover:border-zinc-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-black uppercase tracking-wider ${
                statusFilter === "pending" ? "text-zinc-300" : "text-zinc-500"
              }`}
            >
              Pending Review
            </span>
            <Clock className={`size-4 ${statusFilter === "pending" ? "text-amber-400" : "text-amber-500"}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-1 tabular-nums">{metrics.pending}</div>
          <p className={`text-[11px] font-bold mt-0.5 ${statusFilter === "pending" ? "text-zinc-300" : "text-zinc-500"}`}>
            Awaiting verification
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("resubmitted")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "resubmitted"
              ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
              : "bg-white text-zinc-900 border-zinc-200/90 hover:border-zinc-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-black uppercase tracking-wider ${
                statusFilter === "resubmitted" ? "text-zinc-300" : "text-zinc-500"
              }`}
            >
              Re-Submitted
            </span>
            <RotateCcw className={`size-4 ${statusFilter === "resubmitted" ? "text-indigo-400 animate-spin" : "text-indigo-600"}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-1 tabular-nums">{metrics.resubmitted}</div>
          <p className={`text-[11px] font-bold mt-0.5 ${statusFilter === "resubmitted" ? "text-zinc-300" : "text-zinc-500"}`}>
            Updated revised documents
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("flagged")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "flagged"
              ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
              : "bg-white text-zinc-900 border-zinc-200/90 hover:border-zinc-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-black uppercase tracking-wider ${
                statusFilter === "flagged" ? "text-zinc-300" : "text-zinc-500"
              }`}
            >
              KYC Flagged
            </span>
            <AlertCircle className={`size-4 ${statusFilter === "flagged" ? "text-rose-400" : "text-rose-500"}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-1 tabular-nums">{metrics.flagged}</div>
          <p className={`text-[11px] font-bold mt-0.5 ${statusFilter === "flagged" ? "text-zinc-300" : "text-zinc-500"}`}>
            Rejected or suspended
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "all"
              ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
              : "bg-white text-zinc-900 border-zinc-200/90 hover:border-zinc-300 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-black uppercase tracking-wider ${
                statusFilter === "all" ? "text-zinc-300" : "text-zinc-500"
              }`}
            >
              Total In Queue
            </span>
            <FileCheck2 className={`size-4 ${statusFilter === "all" ? "text-emerald-400" : "text-emerald-600"}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-1 tabular-nums">{metrics.total}</div>
          <p className={`text-[11px] font-bold mt-0.5 ${statusFilter === "all" ? "text-zinc-300" : "text-zinc-500"}`}>
            Action items in queue
          </p>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, phone, plate, ID, city..."
              className="pl-9 pr-8 text-xs bg-white border-zinc-200 text-zinc-950 font-medium rounded-xl h-9 shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-950"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 hover:text-zinc-700 flex items-center justify-center"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="h-9 text-xs bg-white border border-zinc-200 rounded-xl px-3 font-bold text-zinc-800 shadow-2xs cursor-pointer focus:outline-none"
            >
              <option value="all">All Vehicles</option>
              <option value="bike">🏍️ Motorbike</option>
              <option value="scooter">🛵 Scooter</option>
              <option value="ev">⚡ Electric (EV)</option>
              <option value="bicycle">🚲 Bicycle</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                ridersQuery.refetch();
                toast.success("Rider requests queue refreshed! 🔄");
              }}
              disabled={ridersQuery.isRefetching}
              className="h-9 gap-1.5 text-xs font-bold rounded-xl border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 shadow-2xs"
            >
              <RefreshCw className={`size-3.5 text-zinc-700 ${ridersQuery.isRefetching ? "animate-spin" : ""}`} />
              <span>Refresh Queue</span>
            </Button>
          </div>
        </div>

        {/* Cohort Pills */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs scrollbar-thin">
          {[
            { id: "pending", label: "Pending Initial Review", count: metrics.pending },
            { id: "resubmitted", label: "🔄 Re-Submitted by Candidate", count: metrics.resubmitted },
            { id: "flagged", label: "KYC Flagged / Blocked", count: metrics.flagged },
            { id: "all", label: "All Queue Requests", count: metrics.total },
          ].map((t) => {
            const isActive = statusFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setStatusFilter(t.id as any)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all shrink-0 ${
                  isActive
                    ? "bg-zinc-950 text-white shadow-sm ring-1 ring-zinc-900"
                    : "bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200/90"
                }`}
              >
                <span>{t.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                    isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Requests List */}
      <div className="space-y-3">
        {ridersQuery.isLoading ? (
          <div className="p-16 text-center text-xs font-bold text-zinc-500 bg-white rounded-2xl border border-zinc-200 shadow-2xs">
            <RefreshCw className="size-6 text-zinc-400 animate-spin mx-auto mb-2" />
            Loading rider requests queue...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-zinc-200 shadow-2xs">
            <CheckCircle className="size-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-black text-sm text-zinc-950">No pending rider requests</h4>
            <p className="text-xs text-zinc-500 mt-1">
              All delivery captain onboarding applications and KYC updates in this cohort have been reviewed.
            </p>
          </div>
        ) : (
          filteredRequests.map((r) => {
            const isExpanded = expandedRiderId === r.id;
            const isResubmitted = Boolean(r.resubmitted);
            const isPending = r.status === "Pending" || r.kyc === "Pending";
            const isFlagged = r.status === "Suspended" || r.kyc === "Rejected";

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-zinc-200/90 hover:border-zinc-300 shadow-2xs transition-all overflow-hidden"
              >
                {/* Main Row / Header */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {/* Captain Avatar */}
                    <div className="relative size-12 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center font-black text-zinc-700 text-sm shrink-0 overflow-hidden shadow-2xs">
                      {r.profilePhoto ? (
                        <img
                          src={r.profilePhoto}
                          alt={r.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span>{r.name.slice(0, 2).toUpperCase()}</span>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${
                          r.live === "Online"
                            ? "bg-emerald-500"
                            : r.live === "On delivery"
                            ? "bg-sky-500 animate-pulse"
                            : "bg-zinc-300"
                        }`}
                      />
                    </div>

                    {/* Details */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-sm text-zinc-950 truncate max-w-[200px]">
                          {r.name}
                        </h4>
                        <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                          #{r.id}
                        </span>

                        {isResubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                            <RotateCcw className="size-2.5 animate-spin text-indigo-600" />
                            <span>Re-Submitted (Attempt #{r.resubmissionCount || 2})</span>
                          </span>
                        ) : isPending ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Review
                          </span>
                        ) : isFlagged ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            Flagged / Rejected
                          </span>
                        ) : null}

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {r.vehicle || "Motorbike"} • {r.plate || "Plate Pending"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 font-medium">
                        <span className="flex items-center gap-1 text-zinc-700">
                          <Phone className="size-3 text-zinc-400" />
                          <a href={`tel:${r.phone}`} className="hover:text-emerald-700 font-mono">
                            {r.phone}
                          </a>
                        </span>
                        <span className="flex items-center gap-1 text-zinc-700">
                          <MapPin className="size-3 text-zinc-400" />
                          <span>{r.city} ({r.zone})</span>
                        </span>
                        <span className="flex items-center gap-1 text-zinc-400 text-[11px]">
                          <Calendar className="size-3" />
                          <span>Applied: {formatTimestamp(r.registrationTimestamp)} ({timeAgo(r.registrationTimestamp)})</span>
                        </span>
                      </div>

                      {/* Rejection / Resubmission reason if any */}
                      {r.rejectionReason && (
                        <div className="text-[11px] text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-lg border border-rose-200 font-medium mt-1 inline-block">
                          <strong>Prior Flag:</strong> {r.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(r.id)}
                      disabled={approveMutation.isPending}
                      className="h-8 gap-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs px-3"
                    >
                      <Check className="size-3.5" />
                      <span>Approve</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectingRider(r)}
                      className="h-8 gap-1.5 text-xs font-bold rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50 shadow-2xs px-3"
                    >
                      <X className="size-3.5" />
                      <span>Reject / Flag</span>
                    </Button>

                    {onSelectRider && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectRider(r.id)}
                        className="h-8 gap-1.5 text-xs font-bold rounded-xl border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 shadow-2xs px-3"
                      >
                        <Eye className="size-3.5 text-zinc-600" />
                        <span>360° Profile</span>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedRiderId(isExpanded ? null : r.id)}
                      className="h-8 w-8 p-0 rounded-xl text-zinc-400 hover:text-zinc-700"
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded View with Full Candidate Telemetry & Document Zoom */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50/60 p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 1. Identity & Contact Specs */}
                      <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs space-y-2 text-xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                          Candidate Identity
                        </span>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Full Name:</span>
                          <span className="font-bold text-zinc-900">{r.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Phone:</span>
                          <span className="font-mono font-bold text-zinc-900">{r.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Email:</span>
                          <span className="font-mono text-zinc-900 truncate max-w-[140px]">{r.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">City / Zone:</span>
                          <span className="font-bold text-zinc-900">{r.city} • {r.zone}</span>
                        </div>
                      </div>

                      {/* 2. Vehicle & Fleet Asset Specs */}
                      <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs space-y-2 text-xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                          Vehicle Asset Specs
                        </span>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Vehicle Type:</span>
                          <span className="font-bold text-zinc-900 capitalize">{r.vehicle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Registration Plate:</span>
                          <span className="font-mono font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {r.plate || "Pending"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">KYC Clearance:</span>
                          <span className="font-bold text-emerald-700">{r.kyc}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Standing:</span>
                          <span className="font-bold text-zinc-900">{r.status}</span>
                        </div>
                      </div>

                      {/* 3. Bank Account & Settlement Details */}
                      <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs space-y-2 text-xs">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                          Settlement &amp; Payouts
                        </span>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Bank Name:</span>
                          <span className="font-bold text-zinc-900">{r.bankName || "Pending"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Account Last 4:</span>
                          <span className="font-mono font-bold text-zinc-900">{r.accountLast4 ? `•••• ${r.accountLast4}` : "Pending"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">IFSC Code:</span>
                          <span className="font-mono font-bold text-zinc-900">{r.ifsc || "Pending"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">UPI ID:</span>
                          <span className="font-mono text-zinc-900 truncate max-w-[130px]">{r.upiId || "Pending"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Document Peek Preview Links */}
                    <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-zinc-700 font-bold">
                        <IdCard className="size-4 text-emerald-600" />
                        <span>Uploaded Registration Documents:</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {r.profilePhoto && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewDoc({ url: r.profilePhoto!, title: `${r.name} — Profile Photo` })}
                            className="h-7 text-xs font-bold rounded-lg border-zinc-200 gap-1 bg-white text-zinc-800 hover:bg-zinc-50"
                          >
                            <Eye className="size-3 text-zinc-500" />
                            <span>Selfie Photo</span>
                          </Button>
                        )}
                        {onSelectRider && (
                          <Button
                            size="sm"
                            onClick={() => onSelectRider(r.id)}
                            className="h-7 text-xs font-bold rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white gap-1 shadow-2xs"
                          >
                            <span>Inspect All Documents in 360° View</span>
                            <ArrowRight className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal Dialog */}
      <Dialog open={Boolean(rejectingRider)} onOpenChange={(open) => !open && setRejectingRider(null)}>
        <DialogContent className="max-w-md bg-white text-zinc-900 border-zinc-200 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <ShieldAlert className="size-4" />
              </div>
              <DialogTitle className="text-base font-black text-zinc-900">
                Reject / Flag Candidate Application
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 mt-1">
              Candidate <strong>{rejectingRider?.name}</strong> will be notified of this rejection on their verification screen with the reason provided below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <label className="text-[11px] font-black uppercase tracking-wider text-zinc-500 block">
              Quick Preset Reasons
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {quickReasons.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => {
                    setSelectedQuickReason(qr);
                    setRejectReason(qr);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedQuickReason === qr
                      ? "bg-rose-50 border-rose-300 text-rose-900 shadow-2xs font-bold"
                      : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {qr}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-500 block">
                Custom Rejection Notice &amp; Instructions
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Specify exact missing documents or instructions for candidate re-upload..."
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRejectingRider(null);
                setRejectReason("");
                setSelectedQuickReason(null);
              }}
              className="rounded-xl border-zinc-200 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (rejectingRider) {
                  rejectMutation.mutate({ id: rejectingRider.id, reason: rejectReason });
                }
              }}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Lightbox Preview Modal */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl bg-zinc-950 text-white border-zinc-800 p-5 rounded-3xl shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
            <DialogTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Eye className="size-4 text-emerald-400" />
              <span>{previewDoc?.title || "Document Preview"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center p-3 bg-black/50 rounded-xl overflow-hidden min-h-[300px] max-h-[75vh]">
            {previewDoc?.url ? (
              <img
                src={previewDoc.url}
                alt={previewDoc.title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />
            ) : null}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between pt-3 border-t border-zinc-800">
            <a
              href={previewDoc?.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold"
            >
              <ExternalLink className="size-3.5" />
              <span>Open Full Resolution in New Tab</span>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewDoc(null)}
              className="rounded-xl border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs font-bold"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
