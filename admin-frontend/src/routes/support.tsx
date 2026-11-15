import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Send,
  LifeBuoy,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Store,
  Bike,
  Sparkles,
  Phone,
  Tag,
  Check,
  RotateCcw,
  Zap,
  ShieldCheck,
  Building2,
  Truck,
  RefreshCw,
  Filter,
  Layers,
  ChevronRight,
  Headphones,
  Sliders,
  Radio,
  FileText,
  Lock,
  PlusCircle,
  IndianRupee,
  Gift,
  ExternalLink,
  Crown,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { AdminShell } from "../components/AdminShell";
import { StatusPill, KpiCard, SectionCard } from "../components/AdminUI";
import {
  closeTicket,
  createSupportTicket,
  fetchChat,
  fetchSupportStats,
  fetchTickets,
  replyToTicket,
  updateTicketStatus,
  assignTicket,
  compensateTicket,
  fetchAdminFraudReports,
  updateAdminFraudReport,
  deleteAdminFraudReport,
  fetchAdminContactInquiries,
  updateAdminContactInquiry,
  deleteAdminContactInquiry,
  fetchAdminJobApplications,
  updateAdminJobApplication,
  deleteAdminJobApplication,
  type Ticket,
  type TicketRole,
  type TicketPriority,
  type TicketStatus,
  type CreateTicketPayload,
  type AdminFraudReport,
  type AdminContactInquiry,
  type AdminJobApplication,
} from "../api/support";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/support")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Omnichannel Helpdesk & Support Engine",
      "Real-time omnichannel support command center combining Customer, Partner Store, and Rider Fleet inquiries."
    ),
  component: SupportPage,
});

const CANNED_RESPONSES = [
  {
    role: "Customer",
    label: "Rider arriving in 10m",
    text: "Hello! Our assigned delivery captain is currently en route to your doorstep and will arrive within 8-10 minutes. Thank you for your patience!",
  },
  {
    role: "Customer",
    label: "Refund / Wallet credit",
    text: "We sincerely apologize for the inconvenience. We have credited compensation balance to your QuickPress Wallet for your next order!",
  },
  {
    role: "Partner",
    label: "Store dispatch update",
    text: "We have updated your processing queue. Incoming steam press items have been balanced with our partner hub network.",
  },
  {
    role: "Rider",
    label: "Customer gate assistance",
    text: "Please hold 2 minutes at the customer's gate. Our support lead is dialing their alternate phone number to facilitate entry.",
  },
  {
    role: "All",
    label: "Weather / Rain notice",
    text: "Due to heavy weather conditions, our captains are operating with weather-proof sealed packs. A 15-minute safety buffer is active.",
  },
];

const RESOLUTION_REASONS = [
  "Customer Query Answered & Resolved",
  "Full Refund Credited to Wallet",
  "Garment Replaced / Re-cleaned",
  "Pickup / Delivery Route Rescheduled",
  "Cloth Count Rectified with Partner",
  "Store Partner Penalized / Warning Issued",
  "Captain Duty Dispatched & Cleared",
  "Address / Phone Updated & Delivered",
  "App / Technical Bug Fixed",
  "False Alarm / Invalid Claim Closed",
  "Other Custom Resolution",
];

export function SupportPage() {
  const queryClient = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompensateModalOpen, setIsCompensateModalOpen] = useState(false);
  const [compensationAmount, setCompensationAmount] = useState("50");
  const [compensationReason, setCompensationReason] = useState("Service delay goodwill gesture");

  // Resolution Dialog State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [targetResolveStatus, setTargetResolveStatus] = useState<"Resolved" | "Closed">("Resolved");
  const [resolutionReason, setResolutionReason] = useState("Customer Query Answered & Resolved");
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Create Ticket Form State
  const [newTicket, setNewTicket] = useState<CreateTicketPayload>({
    subject: "",
    description: "",
    role: "Customer",
    raisedBy: "",
    phone: "",
    priority: "Medium",
    category: "Order Related",
    refOrder: "",
    city: "",
    assignee: "Lead Admin",
  });

  // Anti-Fraud & Vigilance Desk State
  const [fraudReports, setFraudReports] = useState<AdminFraudReport[]>([]);
  const [selectedFraudReport, setSelectedFraudReport] = useState<AdminFraudReport | null>(null);
  const [fraudStatusUpdate, setFraudStatusUpdate] = useState("investigating");
  const [fraudNotesUpdate, setFraudNotesUpdate] = useState("");
  const [isFraudModalOpen, setIsFraudModalOpen] = useState(false);
  const [evidenceZoomUrl, setEvidenceZoomUrl] = useState<string | null>(null);

  // Contact Inquiries & Consultations State
  const [contactInquiries, setContactInquiries] = useState<AdminContactInquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<AdminContactInquiry | null>(null);
  const [inquiryStatusUpdate, setInquiryStatusUpdate] = useState("in_progress");
  const [inquiryNotesUpdate, setInquiryNotesUpdate] = useState("");
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

  // Candidate Job Applications State
  const [jobApplications, setJobApplications] = useState<AdminJobApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<AdminJobApplication | null>(null);
  const [applicationStatusUpdate, setApplicationStatusUpdate] = useState("under_review");
  const [applicationNotesUpdate, setApplicationNotesUpdate] = useState("");
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

  const loadFraudReports = async () => {
    try {
      const data = await fetchAdminFraudReports();
      if (Array.isArray(data)) setFraudReports(data);
    } catch {
      // Ignored
    }
  };

  const loadInquiries = async () => {
    try {
      const data = await fetchAdminContactInquiries();
      if (Array.isArray(data)) setContactInquiries(data);
    } catch {
      // Ignored
    }
  };

  const loadApplications = async () => {
    try {
      const data = await fetchAdminJobApplications();
      if (Array.isArray(data)) setJobApplications(data);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadFraudReports();
    loadInquiries();
    loadApplications();
  }, []);

  const handleOpenFraudReview = (report: AdminFraudReport) => {
    setSelectedFraudReport(report);
    setFraudStatusUpdate(report.status);
    setFraudNotesUpdate(report.adminNotes || "");
    setIsFraudModalOpen(true);
  };

  const handleSaveFraudStatus = async () => {
    if (!selectedFraudReport) return;
    try {
      await updateAdminFraudReport(selectedFraudReport._id || selectedFraudReport.id, {
        status: fraudStatusUpdate,
        adminNotes: fraudNotesUpdate,
      });
      toast.success("Fraud report status updated!");
      setIsFraudModalOpen(false);
      await loadFraudReports();
    } catch {
      toast.error("Failed to update fraud report status.");
    }
  };

  const handleDeleteFraudReport = async (id: string) => {
    if (!confirm("Permanently delete this fraud incident docket?")) return;
    try {
      await deleteAdminFraudReport(id);
      toast.success("Fraud report docket deleted.");
      await loadFraudReports();
    } catch {
      toast.error("Failed to delete fraud report.");
    }
  };

  // Inquiry Handlers
  const handleOpenInquiryReview = (inquiry: AdminContactInquiry) => {
    setSelectedInquiry(inquiry);
    setInquiryStatusUpdate(inquiry.status);
    setInquiryNotesUpdate(inquiry.adminNotes || "");
    setIsInquiryModalOpen(true);
  };

  const handleSaveInquiryStatus = async () => {
    if (!selectedInquiry) return;
    try {
      await updateAdminContactInquiry(selectedInquiry._id || selectedInquiry.id, {
        status: inquiryStatusUpdate,
        adminNotes: inquiryNotesUpdate,
      });
      toast.success("Inquiry status updated!");
      setIsInquiryModalOpen(false);
      await loadInquiries();
    } catch {
      toast.error("Failed to update inquiry status.");
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm("Delete this inquiry docket?")) return;
    try {
      await deleteAdminContactInquiry(id);
      toast.success("Inquiry docket deleted.");
      await loadInquiries();
    } catch {
      toast.error("Failed to delete inquiry.");
    }
  };

  // Job Application Handlers
  const handleOpenApplicationReview = (app: AdminJobApplication) => {
    setSelectedApplication(app);
    setApplicationStatusUpdate(app.status);
    setApplicationNotesUpdate(app.adminNotes || "");
    setIsApplicationModalOpen(true);
  };

  const handleSaveApplicationStatus = async () => {
    if (!selectedApplication) return;
    try {
      await updateAdminJobApplication(selectedApplication._id || selectedApplication.id, {
        status: applicationStatusUpdate,
        adminNotes: applicationNotesUpdate,
      });
      toast.success("Job application status updated!");
      setIsApplicationModalOpen(false);
      await loadApplications();
    } catch {
      toast.error("Failed to update application status.");
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm("Delete this application docket?")) return;
    try {
      await deleteAdminJobApplication(id);
      toast.success("Application docket deleted.");
      await loadApplications();
    } catch {
      toast.error("Failed to delete application.");
    }
  };

  // Queries
  const ticketsQuery = useQuery({
    queryKey: ["admin", "tickets", roleFilter, statusFilter, priorityFilter, categoryFilter, searchQuery],
    queryFn: () =>
      fetchTickets({
        role: roleFilter,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        q: searchQuery,
      }),
  });

  const statsQuery = useQuery({
    queryKey: ["admin", "support", "stats"],
    queryFn: fetchSupportStats,
  });

  const allTickets = ticketsQuery.data ?? [];
  const stats = statsQuery.data;

  // Active Selected Ticket
  const activeTicket = useMemo(() => {
    if (selectedTicketId) {
      const found = allTickets.find((t) => t.id === selectedTicketId);
      if (found) return found;
    }
    return allTickets[0] ?? null;
  }, [allTickets, selectedTicketId]);

  // Live Chat Messages
  const chatQuery = useQuery({
    queryKey: ["admin", "tickets", activeTicket?.id, "chat"],
    queryFn: () => fetchChat(activeTicket!.id),
    enabled: Boolean(activeTicket),
  });

  // Mutations
  const sendMutation = useMutation({
    mutationFn: ({ body, isInternal }: { body: string; isInternal: boolean }) =>
      replyToTicket(activeTicket!.id, body, isInternal),
    onSuccess: (_, vars) => {
      toast.success(vars.isInternal ? "Internal staff note saved!" : "Resolution reply sent!");
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets", activeTicket?.id, "chat"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "stats"] });
    },
    onError: () => {
      toast.error("Failed to send message.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      ticketId,
      status,
      reason,
      notes,
    }: {
      ticketId: string;
      status: string;
      reason?: string;
      notes?: string;
    }) => updateTicketStatus(ticketId, status, reason, notes),
    onSuccess: (_, vars) => {
      toast.success(`Ticket marked as ${vars.status}!`);
      setIsResolveModalOpen(false);
      setResolutionNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets", activeTicket?.id, "chat"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update ticket status.");
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ ticketId, assignee }: { ticketId: string; assignee: string }) =>
      assignTicket(ticketId, assignee),
    onSuccess: () => {
      toast.success("Ticket reassigned!");
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
    },
  });

  const compensateMutation = useMutation({
    mutationFn: ({ ticketId, amount, reason }: { ticketId: string; amount: number; reason: string }) =>
      compensateTicket(ticketId, amount, reason),
    onSuccess: (data) => {
      toast.success(`₹${data.amount} credited to customer wallet!`);
      setIsCompensateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets", activeTicket?.id, "chat"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to disburse wallet compensation.");
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTicketPayload) => createSupportTicket(payload),
    onSuccess: (created) => {
      toast.success(`Support Ticket #${created.ticketNumber} created!`);
      setIsCreateModalOpen(false);
      setSelectedTicketId(created.id);
      queryClient.invalidateQueries({ queryKey: ["admin", "tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "support", "stats"] });
    },
  });

  const handleSendReply = () => {
    if (!replyText.trim() || !activeTicket) return;
    sendMutation.mutate({ body: replyText.trim(), isInternal: isInternalNote });
  };

  const handleOpenResolveDialog = (status: "Resolved" | "Closed" = "Resolved") => {
    setTargetResolveStatus(status);
    setIsResolveModalOpen(true);
  };

  const handleQuickResolve = () => {
    if (!activeTicket) return;
    handleOpenResolveDialog("Resolved");
  };

  return (
    <AdminShell
      title="Omnichannel Helpdesk & Support Engine"
      subtitle="Unified customer care, partner hub operations, rider fleet dispatch, and automated resolution ledger."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              ticketsQuery.refetch();
              statsQuery.refetch();
              if (activeTicket) chatQuery.refetch();
              toast.success("Helpdesk refreshed!");
            }}
            disabled={ticketsQuery.isRefetching}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 shadow-2xs"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${ticketsQuery.isRefetching ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-8 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
          >
            <PlusCircle className="size-3.5 mr-1.5 text-emerald-400" />
            <span>+ Log New Ticket</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. 6 HELPDESK KPI SUMMARY CARDS
        ========================================================================= */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            kpi={{
              id: "total",
              label: "Total Tickets Raised",
              value: `${stats?.totalTickets || allTickets.length} Inquiries`,
              hint: "Omnichannel volume",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "open",
              label: "Open / In-Progress",
              value: `${stats?.openTickets || 0} Active`,
              hint: "Requires resolution",
              positive: false,
            }}
          />
          <KpiCard
            kpi={{
              id: "escalated",
              label: "Urgent Escalations",
              value: `${stats?.escalatedTickets || 0} Priority`,
              hint: "P0 / Urgent SLA",
              positive: (stats?.escalatedTickets || 0) === 0,
            }}
          />
          <KpiCard
            kpi={{
              id: "sla",
              label: "Resolution Success Rate",
              value: stats?.resolutionRate || "96.4%",
              hint: `${stats?.resolvedTickets || 0} closed tickets`,
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "first_resp",
              label: "Average SLA Speed",
              value: stats?.avgResolutionSla || "18 mins",
              hint: "First response speed",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "compensation",
              label: "Wallet Compensation",
              value: stats?.formattedCompensation || "₹0.00",
              hint: "Disbursed resolution credits",
              positive: true,
            }}
          />
        </div>

        {/* =========================================================================
            2. OMNICHANNEL FILTER HEADER BAR
        ========================================================================= */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Role Channel Selector */}
            <div className="flex items-center rounded-xl bg-zinc-100 p-0.5 border border-zinc-200 flex-wrap">
              {[
                { id: "all", label: "All Tickets" },
                { id: "customer", label: `Customer (${stats?.roles.customer ?? 0})` },
                { id: "partner", label: `Partner Store (${stats?.roles.partner ?? 0})` },
                { id: "rider", label: `Rider Fleet (${stats?.roles.rider ?? 0})` },
                { id: "inquiries", label: `Inquiries & Consultations (${contactInquiries.length})` },
                { id: "applications", label: `Job Applications (${jobApplications.length})` },
                { id: "fraud", label: `Fraud & Vigilance Desk (${fraudReports.length})` },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRoleFilter(r.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${roleFilter === r.id ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-900"
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Status & Priority Dropdowns & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter tickets by status"
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 shadow-2xs focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Open">● Open</option>
                <option value="In progress">● In Progress</option>
                <option value="Awaiting customer">● Awaiting Customer</option>
                <option value="Escalated">● Escalated (P0)</option>
                <option value="Resolved">● Resolved</option>
                <option value="Closed">● Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                aria-label="Filter tickets by priority"
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 shadow-2xs focus:outline-none cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">Urgent / P0</option>
                <option value="High">High</option>
                <option value="Medium">● Medium</option>
                <option value="Low">● Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter tickets by category"
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 shadow-2xs focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="order">Order & Delivery</option>
                <option value="payment">Payment & Payout</option>
                <option value="refund">Refund Related</option>
                <option value="wash">Wash & Quality Issue</option>
                <option value="garment">Missing / Wrong Garment</option>
                <option value="delay">Pickup / Delivery Delay</option>
                <option value="store">Store Partner Operations</option>
                <option value="rider">Rider / Fleet Dispatch</option>
                <option value="app">App / Technical Bug</option>
              </select>

              <div className="relative">
                <Search className="absolute left-2.5 top-2 size-3.5 text-zinc-400" />
                <Input
                  type="search"
                  placeholder="Search Ticket #, User, Phone, Order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-60 rounded-xl pl-8 text-xs font-medium"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* =========================================================================
            3. MAIN WORKSPACE: FRAUD DESK OR OMNICHANNEL SPLIT
        ========================================================================= */}
        {roleFilter === "fraud" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-red-100 text-red-700 text-sm">⚠️</span>
                  <span>Public Fraud &amp; Security Reports ({fraudReports.length})</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Incident dockets submitted via Public Website for payment scams, recruitment fraud &amp; impersonation.
                </p>
              </div>
              <button
                type="button"
                onClick={loadFraudReports}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-800 cursor-pointer shadow-2xs"
              >
                Refresh Reports
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fraudReports.map((report) => (
                <div
                  key={report._id || report.id}
                  className="bg-white rounded-3xl border border-zinc-200 p-5 shadow-sm space-y-4 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-zinc-900">
                        #{report.id || report._id}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${report.status === "verified_fraud"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : report.status === "investigating"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : report.status === "resolved"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                          }`}
                      >
                        {report.status.replace("_", " ")}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-red-600 block">
                        Category: {report.scamCategory.replace("_", " ")}
                      </span>
                      <h4 className="text-sm font-black text-zinc-900 mt-0.5">
                        Reporter: {report.reporterName} ({report.reporterPhone})
                      </h4>
                    </div>

                    <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-xs font-mono space-y-1">
                      <div>
                        <strong className="text-zinc-500">Suspect:</strong>{" "}
                        <span className="text-red-700 font-bold">{report.suspectInfo || "N/A"}</span>
                      </div>
                      <div>
                        <strong className="text-zinc-500">Date:</strong> {report.incidentDate || "Recent"}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 line-clamp-3 leading-relaxed">
                      {report.description}
                    </p>

                    {/* Evidence Attachment Preview */}
                    {report.evidenceUrl && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setEvidenceZoomUrl(report.evidenceUrl!)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-mono font-bold cursor-pointer"
                        >
                          <span>🔍 View Attached Evidence Proof</span>
                        </button>
                      </div>
                    )}

                    {report.adminNotes && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900">
                        <strong>Admin Note:</strong> {report.adminNotes}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenFraudReview(report)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer"
                    >
                      Update Status / Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFraudReport(report._id || report.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Delete Report"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {fraudReports.length === 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center space-y-2">
                <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-black text-zinc-900">Zero Pending Fraud Reports</h4>
                <p className="text-xs text-zinc-500">No active cyber fraud or scam dockets reported by customers or riders.</p>
              </div>
            )}
          </div>
        ) : roleFilter === "inquiries" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-blue-100 text-blue-700 text-sm">📩</span>
                  <span>Public Inquiries &amp; Consultations ({contactInquiries.length})</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Submissions from Contact Us, Partner Onboarding &amp; Consultation Booking forms.
                </p>
              </div>
              <button
                type="button"
                onClick={loadInquiries}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-800 cursor-pointer shadow-2xs"
              >
                Refresh Inquiries
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contactInquiries.map((inq) => (
                <div
                  key={inq._id || inq.id}
                  className="bg-white rounded-3xl border border-zinc-200 p-5 shadow-sm space-y-4 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-zinc-900">
                        #{inq.id || inq._id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {inq.isConsultation && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🤝 Consultation
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${inq.status === "new"
                              ? "bg-blue-100 text-blue-800 border border-blue-200 animate-pulse"
                              : inq.status === "in_progress"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : inq.status === "consultation_scheduled"
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : inq.status === "resolved"
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                            }`}
                        >
                          {inq.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 block">
                        Channel: {inq.inquiryType.toUpperCase()}
                      </span>
                      <h4 className="text-sm font-black text-zinc-900 mt-0.5">
                        {inq.fullName}
                      </h4>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">
                        {inq.phone} {inq.email ? `• ${inq.email}` : ""}
                      </div>
                    </div>

                    {inq.city && (
                      <div className="text-xs text-zinc-600 font-mono">
                        📍 <strong>Zone:</strong> {inq.city}
                      </div>
                    )}

                    {inq.orderId && (
                      <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs font-mono">
                        <strong>Order Ref:</strong> {inq.orderId}
                      </div>
                    )}

                    <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-700 leading-relaxed">
                      "{inq.message}"
                    </div>

                    {inq.details && (
                      <div className="text-[11px] text-zinc-500 font-mono">
                        Note: {inq.details}
                      </div>
                    )}

                    {inq.adminNotes && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900">
                        <strong>Admin Note:</strong> {inq.adminNotes}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${inq.phone}`}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs"
                      >
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${inq.phone.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(inq.fullName)},%20this%20is%20QuickPress%20Support%20regarding%20your%20inquiry.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => handleOpenInquiryReview(inq)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer"
                      >
                        Status
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteInquiry(inq._id || inq.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Delete Inquiry"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {contactInquiries.length === 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center space-y-2">
                <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-black text-zinc-900">No Pending Contact Inquiries</h4>
                <p className="text-xs text-zinc-500">All public contact requests and consultations are addressed.</p>
              </div>
            )}
          </div>
        ) : roleFilter === "applications" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-black text-zinc-950 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-purple-100 text-purple-700 text-sm">💼</span>
                  <span>Candidate Job Applications ({jobApplications.length})</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Candidate profiles submitted via the public <code>/careers</code> portal for active roles.
                </p>
              </div>
              <button
                type="button"
                onClick={loadApplications}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-800 cursor-pointer shadow-2xs"
              >
                Refresh Applications
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobApplications.map((app) => (
                <div
                  key={app._id || app.id}
                  className="bg-white rounded-3xl border border-zinc-200 p-5 shadow-sm space-y-4 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-zinc-900">
                        #{app.id || app._id}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${app.status === "received"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : app.status === "shortlisted"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : app.status === "interview_scheduled"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : app.status === "offered"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : app.status === "rejected"
                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                    : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                          }`}
                      >
                        {app.status.replace("_", " ")}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 block">
                        Role: {app.roleTitle}
                      </span>
                      <h4 className="text-sm font-black text-zinc-900 mt-0.5">
                        {app.applicantName}
                      </h4>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">
                        {app.applicantPhone} {app.applicantEmail ? `• ${app.applicantEmail}` : ""}
                      </div>
                    </div>

                    <div className="text-xs text-zinc-600 font-mono">
                      Experience: <strong>{app.experience || "N/A"}</strong>
                    </div>

                    {/* Resume & Portfolio Links */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {app.resumeUrl && (
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-mono font-bold text-[11px]"
                        >
                          <span>📄 Resume / CV</span>
                        </a>
                      )}
                      {app.portfolioLink && (
                        <a
                          href={app.portfolioLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-mono font-bold text-[11px]"
                        >
                          <span>🌐 Portfolio</span>
                        </a>
                      )}
                    </div>

                    {app.applicantNote && (
                      <p className="text-xs text-zinc-600 line-clamp-3 leading-relaxed italic bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                        "{app.applicantNote}"
                      </p>
                    )}

                    {app.adminNotes && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900">
                        <strong>Recruiter Note:</strong> {app.adminNotes}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${app.applicantPhone}`}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs"
                      >
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${app.applicantPhone.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(app.applicantName)},%20this%20is%20QuickPress%20Talent%20Desk%20regarding%20your%20application%20for%20${encodeURIComponent(app.roleTitle)}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => handleOpenApplicationReview(app)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer"
                      >
                        Status
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteApplication(app._id || app.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Delete Application"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {jobApplications.length === 0 && (
              <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center space-y-2">
                <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
                <h4 className="text-base font-black text-zinc-900">No Job Applications Pending</h4>
                <p className="text-xs text-zinc-500">Candidate submissions for open roles will appear here.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* ================= LEFT: TICKETS INBOX LIST (5 COLS) ================= */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-zinc-900">
                  Support Inbox ({allTickets.length} tickets)
                </span>
                <span className="text-[10px] font-semibold text-zinc-400">
                  Sorted by latest activity
                </span>
              </div>

              {allTickets.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center space-y-2">
                  <LifeBuoy className="size-8 text-zinc-400 mx-auto" />
                  <p className="text-sm font-bold text-zinc-900">No support tickets found</p>
                  <p className="text-xs text-zinc-500">All customer, partner, and captain inquiries are resolved!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
                  {allTickets.map((t) => {
                    const isSelected = activeTicket?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all ${isSelected
                            ? "border-emerald-500 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-500"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-black text-zinc-900">
                              #{t.ticketNumber}
                            </span>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${t.priority === "Urgent"
                                  ? "bg-rose-100 text-rose-800 border-rose-200 animate-pulse"
                                  : t.priority === "High"
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : "bg-zinc-100 text-zinc-700 border-zinc-200"
                                }`}
                            >
                              {t.priority}
                            </span>

                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${t.role === "Customer"
                                  ? "bg-blue-50 text-blue-700"
                                  : t.role === "Partner"
                                    ? "bg-purple-50 text-purple-700"
                                    : "bg-sky-50 text-sky-700"
                                }`}
                            >
                              {t.role === "Customer" ? "Customer" : t.role === "Partner" ? "Store" : "Rider"}
                            </span>

                            {t.vipBadge && (
                              <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 text-[9px] font-black uppercase flex items-center gap-0.5">
                                <Crown className="size-2.5 text-amber-600" />
                                {t.vipBadge}
                              </span>
                            )}
                          </div>

                          <StatusPill value={t.status} />
                        </div>

                        <div className="mt-2">
                          <h4 className="font-bold text-zinc-900 text-xs line-clamp-1">{t.subject}</h4>
                          {t.lastMessage && (
                            <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1 font-medium">
                              {t.lastMessage}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-zinc-700">{t.raisedBy}</span>
                            {t.refOrder && t.refOrder !== "—" && (
                              <span className="text-zinc-400 font-mono">{t.refOrder}</span>
                            )}
                            {t.resolvedBy && (
                              <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold">
                                ✓ Solved by {t.resolvedBy}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px]">
                            <span>{t.messagesCount || 0}</span>
                            <span>{t.updated}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ================= RIGHT: TICKET COMMAND CENTER & CHAT (7 COLS) ================= */}
            <div className="lg:col-span-7">
              {activeTicket ? (
                <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden flex flex-col h-[750px]">
                  {/* 1. Command Header */}
                  <div className="p-4 border-b border-zinc-200 bg-zinc-50/60 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-black text-zinc-900">
                            #{activeTicket.ticketNumber}
                          </span>
                          <StatusPill value={activeTicket.status} />
                          <span className="text-xs font-bold text-zinc-500">
                            Category: <strong className="text-zinc-900">{activeTicket.category}</strong>
                          </span>
                          {activeTicket.vipBadge && (
                            <span className="rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs">
                              <Crown className="size-3" /> VIP {activeTicket.vipBadge}
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-zinc-900 text-sm mt-1">{activeTicket.subject}</h3>
                      </div>

                      {/* Quick Resolution Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsCompensateModalOpen(true)}
                          className="h-8 rounded-xl border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 shadow-2xs"
                        >
                          <Gift className="size-3.5 mr-1 text-amber-700" />
                          <span>Compensate Wallet</span>
                        </Button>

                        {activeTicket.status !== "Resolved" && activeTicket.status !== "Closed" ? (
                          <Button
                            size="sm"
                            onClick={handleQuickResolve}
                            disabled={statusMutation.isPending}
                            className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            <span>Mark Resolved</span>
                          </Button>
                        ) : activeTicket.status === "Resolved" ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenResolveDialog("Closed")}
                            disabled={statusMutation.isPending}
                            className="h-8 rounded-xl bg-zinc-900 px-3 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
                          >
                            <Lock className="size-3.5 mr-1 text-zinc-300" />
                            <span>Close Ticket</span>
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {/* Customer Info & Status/Assign Controls Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/70 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-zinc-900 flex items-center gap-1">
                          <User className="size-3 text-zinc-400" /> {activeTicket.raisedBy}
                        </span>
                        <a href={`tel:${activeTicket.phone}`} className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
                          <Phone className="size-3" /> {activeTicket.phone}
                        </a>
                        <span className="text-zinc-400 font-medium">{activeTicket.city || "Kasganj"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Selector */}
                        <select
                          value={activeTicket.status}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Resolved" || val === "Closed") {
                              handleOpenResolveDialog(val as "Resolved" | "Closed");
                            } else {
                              statusMutation.mutate({ ticketId: activeTicket.id, status: val });
                            }
                          }}
                          aria-label="Update ticket status"
                          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Open">Open</option>
                          <option value="In progress">In Progress</option>
                          <option value="Awaiting customer">Awaiting Customer</option>
                          <option value="Escalated">Escalated</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>

                        {/* Assignee Selector */}
                        <select
                          value={activeTicket.assignee}
                          onChange={(e) =>
                            assignMutation.mutate({ ticketId: activeTicket.id, assignee: e.target.value })
                          }
                          aria-label="Assign ticket agent"
                          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer"
                        >
                          <option value="Lead Admin">Lead Admin</option>
                          <option value="Pooja (Fulfillment Ops)">Pooja (Fulfillment)</option>
                          <option value="Rahul (Rider Ops)">Rahul (Riders)</option>
                        </select>
                      </div>
                    </div>

                    {/* Linked Order Snapshot (If any) */}
                    {activeTicket.refOrder && activeTicket.refOrder !== "—" && (
                      <div className="rounded-xl bg-white border border-zinc-200 p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold">
                            <Truck className="size-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 font-mono">Order #{activeTicket.refOrder}</p>
                            <p className="text-[10px] text-zinc-400">
                              {activeTicket.partnerName ? `Hub: ${activeTicket.partnerName}` : "Store Hub"} ·{" "}
                              {activeTicket.riderName ? `Captain: ${activeTicket.riderName}` : "Rider"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          {activeTicket.orderTotal !== undefined && (
                            <span className="font-black text-zinc-900 block">₹{activeTicket.orderTotal}</span>
                          )}
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            {activeTicket.orderStatus || "In Transit"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Resolution & Staff Audit Details Card */}
                    {(activeTicket.status === "Resolved" || activeTicket.status === "Closed" || activeTicket.resolvedBy || activeTicket.resolutionReason) && (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-xs space-y-2.5 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-4 text-emerald-700" />
                            <span className="font-black text-emerald-950 uppercase tracking-wider text-[11px]">
                              Resolution & Staff Audit Details
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-emerald-700 px-2 py-0.5 text-[10px] font-black text-white uppercase tracking-wider">
                              {activeTicket.status}
                            </span>
                            {activeTicket.resolvedAt && (
                              <span className="text-[10px] font-mono font-bold text-emerald-800">
                                {activeTicket.resolvedAt}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 text-xs">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/70">
                              Resolved By Staff:
                            </p>
                            <p className="font-black text-zinc-950 flex items-center gap-1.5">
                              <span>{activeTicket.resolvedBy || "Lead Admin"}</span>
                              {activeTicket.resolvedByRole && (
                                <span className="rounded bg-zinc-900 text-white px-1.5 py-0.2 text-[9px] font-black uppercase">
                                  {activeTicket.resolvedByRole}
                                </span>
                              )}
                            </p>
                            {activeTicket.resolvedByEmail && (
                              <p className="text-[10px] font-mono text-zinc-600">{activeTicket.resolvedByEmail}</p>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/70">
                              Resolution Reason:
                            </p>
                            <span className="inline-block rounded-md bg-white border border-emerald-300 px-2.5 py-1 text-[11px] font-black text-emerald-900 shadow-2xs">
                              {activeTicket.resolutionReason || "Customer Query Solved"}
                            </span>
                          </div>
                        </div>

                        {activeTicket.resolutionNotes && (
                          <div className="pt-2 border-t border-emerald-200/60 space-y-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/70">
                              Staff Resolution Notes / Settlement Explanation:
                            </p>
                            <p className="font-medium text-zinc-900 leading-relaxed bg-white rounded-lg p-2.5 border border-emerald-200 shadow-2xs">
                              {activeTicket.resolutionNotes}
                            </p>
                          </div>
                        )}

                        {activeTicket.compensationAmount !== undefined && activeTicket.compensationAmount > 0 && (
                          <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-[11px] font-bold text-emerald-950">
                            <span>Customer Wallet Compensation Disbursed:</span>
                            <span className="font-mono text-xs font-black text-emerald-800">
                              ₹{activeTicket.compensationAmount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Message History Thread */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/30">
                    {chatQuery.isLoading ? (
                      <div className="text-center py-10 text-xs text-zinc-400">Loading conversation...</div>
                    ) : (chatQuery.data ?? []).length === 0 ? (
                      <div className="text-center py-10 text-xs text-zinc-400">No message history yet.</div>
                    ) : (
                      (chatQuery.data ?? []).map((msg) => {
                        if (msg.role === "System" || msg.author.toLowerCase().includes("system") || msg.author.toLowerCase().includes("bot")) {
                          return (
                            <div key={msg.id} className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center text-xs text-emerald-900 font-medium">
                              <p>{msg.body}</p>
                              <span className="text-[9px] text-emerald-600 block mt-0.5 font-bold">{msg.at}</span>
                            </div>
                          );
                        }

                        if (msg.isInternal) {
                          return (
                            <div key={msg.id} className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-amber-700">
                                <span className="flex items-center gap-1">
                                  <Lock className="size-3 text-amber-600" /> Private Staff Note ({msg.author})
                                </span>
                                <span>{msg.at}</span>
                              </div>
                              <p className="font-medium text-amber-900">{msg.body}</p>
                            </div>
                          );
                        }

                        const isMe = msg.me || msg.role === "Admin";
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                          >
                            <div className="flex items-center gap-1.5 mb-1 px-1">
                              <span className="text-[10px] font-bold text-zinc-500">{msg.author}</span>
                              <span className="text-[9px] text-zinc-400">{msg.at}</span>
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-xs font-medium leading-relaxed ${isMe
                                  ? "bg-zinc-900 text-white rounded-tr-xs shadow-xs"
                                  : "bg-white text-zinc-900 border border-zinc-200 rounded-tl-xs shadow-2xs"
                                }`}
                            >
                              <p>{msg.body}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 3. Canned Responses Bar */}
                  <div className="px-4 py-2 bg-white border-t border-zinc-100 flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-[10px] font-bold text-zinc-400 shrink-0">Fast Reply:</span>
                    {CANNED_RESPONSES.map((cr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyText(cr.text)}
                        className="shrink-0 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 transition-colors"
                      >
                        {cr.label}
                      </button>
                    ))}
                  </div>

                  {/* 4. Reply / Internal Note Input Box */}
                  <div className="p-4 border-t border-zinc-200 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsInternalNote(false)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${!isInternalNote ? "bg-zinc-900 text-white shadow-xs" : "bg-zinc-100 text-zinc-600"
                            }`}
                        >
                          Official Customer Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsInternalNote(true)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${isInternalNote ? "bg-amber-500 text-white shadow-xs" : "bg-zinc-100 text-zinc-600"
                            }`}
                        >
                          Private Staff Note
                        </button>
                      </div>

                      <span className="text-[10px] text-zinc-400">Press Enter or Send button</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Textarea
                        rows={2}
                        placeholder={
                          isInternalNote
                            ? "Write a private internal note for other agents..."
                            : "Type your resolution message to the user..."
                        }
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        className="rounded-xl border-zinc-200 text-xs resize-none"
                      />

                      <Button
                        onClick={handleSendReply}
                        disabled={sendMutation.isPending || !replyText.trim()}
                        className={`h-full min-h-[56px] rounded-xl px-4 font-bold text-xs ${isInternalNote
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                      >
                        <Send className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200 bg-white p-16 text-center space-y-2">
                  <LifeBuoy className="size-10 text-zinc-400 mx-auto" />
                  <h3 className="font-bold text-zinc-900">Select a Support Ticket</h3>
                  <p className="text-xs text-zinc-500">Pick any customer or partner issue from the left list to start resolution.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. MODAL 1: INSTANT WALLET COMPENSATION MODAL
      ========================================================================= */}
      <Dialog open={isCompensateModalOpen} onOpenChange={setIsCompensateModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-zinc-900">
              <Gift className="size-5 text-amber-600" />
              <span>Instant Customer Wallet Compensation</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Disburse goodwill balance directly into customer's QuickPress Wallet for ticket #{activeTicket?.ticketNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">Select / Enter Amount (₹)</label>
              <div className="flex items-center gap-2 mb-2">
                {["50", "100", "150", "250"].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCompensationAmount(amt)}
                    className={`flex-1 py-1.5 rounded-xl border text-xs font-black transition-all ${compensationAmount === amt
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                      }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                value={compensationAmount}
                onChange={(e) => setCompensationAmount(e.target.value)}
                placeholder="Custom amount in ₹"
                className="rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">Reason / Note for Customer</label>
              <Input
                value={compensationReason}
                onChange={(e) => setCompensationReason(e.target.value)}
                placeholder="E.g., Delivery delay compensation"
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCompensateModalOpen(false)} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => {
                const amt = parseFloat(compensationAmount);
                if (isNaN(amt) || amt <= 0 || !activeTicket) {
                  toast.error("Please enter a valid compensation amount.");
                  return;
                }
                compensateMutation.mutate({
                  ticketId: activeTicket.id,
                  amount: amt,
                  reason: compensationReason,
                });
              }}
              disabled={compensateMutation.isPending}
              className="rounded-xl bg-amber-600 font-bold text-xs text-white hover:bg-amber-700 shadow-xs"
            >
              {compensateMutation.isPending ? "Disbursing..." : `Credit ₹${compensationAmount} to Wallet`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          5. MODAL 2: LOG NEW SUPPORT TICKET MODAL
      ========================================================================= */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-zinc-900">
              <PlusCircle className="size-5 text-emerald-600" />
              <span>Log Inbound Support Ticket</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Create a support case for customer, partner store, or rider inquiry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Inquirer Channel</label>
                <select
                  value={newTicket.role}
                  onChange={(e) => setNewTicket({ ...newTicket, role: e.target.value as TicketRole })}
                  aria-label="Select inquirer channel"
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 font-bold text-zinc-800 focus:outline-none"
                >
                  <option value="Customer">Customer</option>
                  <option value="Partner">Partner Store Hub</option>
                  <option value="Rider">Delivery Captain</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Priority SLA</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as TicketPriority })}
                  aria-label="Select ticket priority"
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 font-bold text-zinc-800 focus:outline-none"
                >
                  <option value="Urgent">Urgent / P0</option>
                  <option value="High">High</option>
                  <option value="Medium">● Medium</option>
                  <option value="Low">● Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Issue Subject *</label>
              <Input
                placeholder="E.g., Garment delivery delayed or wrong wash cycle"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                className="rounded-xl text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Contact Name *</label>
                <Input
                  placeholder="E.g., Aman Sharma"
                  value={newTicket.raisedBy}
                  onChange={(e) => setNewTicket({ ...newTicket, raisedBy: e.target.value })}
                  className="rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Phone Number *</label>
                <Input
                  placeholder="+91 98765 43210"
                  value={newTicket.phone}
                  onChange={(e) => setNewTicket({ ...newTicket, phone: e.target.value })}
                  className="rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Category</label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  aria-label="Select ticket category"
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 font-bold text-zinc-800 focus:outline-none"
                >
                  <option value="Order Related">Order & Delivery</option>
                  <option value="Garment Quality">Garment Quality / Wash</option>
                  <option value="Payment & Wallet">Payment & Wallet</option>
                  <option value="VIP Priority Escalation">VIP Priority Escalation</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Linked Order ID (Optional)</label>
                <Input
                  placeholder="E.g., ord-9428"
                  value={newTicket.refOrder}
                  onChange={(e) => setNewTicket({ ...newTicket, refOrder: e.target.value })}
                  className="rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-zinc-700 block mb-1">Issue Details / Inbound Notes</label>
              <Textarea
                rows={3}
                placeholder="Describe the issue reported by the caller..."
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                className="rounded-xl text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newTicket.subject.trim() || !newTicket.raisedBy?.trim()) {
                  toast.error("Please provide a subject and contact name.");
                  return;
                }
                createMutation.mutate(newTicket);
              }}
              disabled={createMutation.isPending}
              className="rounded-xl bg-zinc-900 font-bold text-xs text-white hover:bg-zinc-800 shadow-xs"
            >
              {createMutation.isPending ? "Logging..." : "Create Support Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          6. MODAL 3: RESOLVE / CLOSE SUPPORT TICKET DIALOG (WITH REASON & AUDIT)
      ========================================================================= */}
      <Dialog open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-zinc-900">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span>
                {targetResolveStatus === "Closed" ? "Close Support Ticket" : "Resolve Support Ticket"} #{activeTicket?.ticketNumber}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Record a mandatory resolution reason and investigation notes. This will be permanently recorded in the staff audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Ticket Snapshot */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-zinc-700">Raised By: {activeTicket?.raisedBy} ({activeTicket?.role})</span>
                <span className="font-mono text-zinc-500 font-bold">{activeTicket?.phone}</span>
              </div>
              <p className="font-extrabold text-zinc-900 line-clamp-1">{activeTicket?.subject}</p>
            </div>

            {/* Target Status */}
            <div>
              <label className="font-bold text-zinc-700 block mb-1">Target Lifecycle Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetResolveStatus("Resolved")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${targetResolveStatus === "Resolved"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                    }`}
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>Resolved</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetResolveStatus("Closed")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${targetResolveStatus === "Closed"
                      ? "bg-zinc-900 text-white border-zinc-950 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                    }`}
                >
                  <Lock className="size-3.5" />
                  <span>Closed</span>
                </button>
              </div>
            </div>

            {/* Resolution Reason */}
            <div>
              <label className="font-bold text-zinc-700 block mb-1">Resolution Reason / Category *</label>
              <select
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                aria-label="Select resolution reason"
                className="w-full rounded-xl border border-zinc-200 bg-white p-2 font-bold text-zinc-800 focus:outline-none cursor-pointer"
              >
                {RESOLUTION_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution Notes */}
            <div>
              <label className="font-bold text-zinc-700 block mb-1">
                Staff Settlement Notes & Explanation
              </label>
              <Textarea
                rows={3}
                placeholder="Explain the solution or settlement actions taken (e.g. refunded customer wallet, re-assigned rider, clarified pickup time)..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="rounded-xl text-xs resize-none"
              />
              <p className="text-[10px] text-zinc-400 mt-1">
                Your staff name, email, role, and exact timestamp will be recorded for full audit compliance.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsResolveModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!activeTicket) return;
                statusMutation.mutate({
                  ticketId: activeTicket.id,
                  status: targetResolveStatus,
                  reason: resolutionReason,
                  notes: resolutionNotes.trim() || undefined,
                });
              }}
              disabled={statusMutation.isPending}
              className={`rounded-xl font-bold text-xs text-white shadow-xs ${targetResolveStatus === "Closed"
                  ? "bg-zinc-900 hover:bg-zinc-800"
                  : "bg-emerald-600 hover:bg-emerald-700"
                }`}
            >
              {statusMutation.isPending
                ? "Updating..."
                : targetResolveStatus === "Closed"
                  ? "Confirm & Close Ticket"
                  : "Confirm & Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          FRAUD INCIDENT REVIEW & STATUS UPDATE MODAL
      ========================================================================= */}
      <Dialog open={isFraudModalOpen} onOpenChange={setIsFraudModalOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-zinc-950 flex items-center gap-2">
              <span className="p-1 rounded bg-red-100 text-red-700 text-sm">🛡️</span>
              <span>Review Fraud Incident Docket #{selectedFraudReport?.id || selectedFraudReport?._id}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Update investigative status, verify claims, and store internal legal / police compliance notes.
            </DialogDescription>
          </DialogHeader>

          {selectedFraudReport && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Reporter:</span>
                  <span className="font-bold text-zinc-900">{selectedFraudReport.reporterName} ({selectedFraudReport.reporterPhone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Suspect Handle:</span>
                  <span className="font-bold text-red-600">{selectedFraudReport.suspectInfo || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Scam Type:</span>
                  <span className="font-bold uppercase text-zinc-800">{selectedFraudReport.scamCategory.replace("_", " ")}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Investigative Status</label>
                <select
                  value={fraudStatusUpdate}
                  onChange={(e) => setFraudStatusUpdate(e.target.value)}
                  className="w-full h-9 rounded-xl border border-zinc-200 bg-white px-3 font-semibold text-xs text-zinc-800"
                >
                  <option value="pending">Pending Triage</option>
                  <option value="investigating">Under Vigilance Investigation</option>
                  <option value="verified_fraud">Confirmed / Blacklisted Fraudster</option>
                  <option value="resolved">Resolved / Transferred to Cyber Police</option>
                  <option value="dismissed">Dismissed / Inconclusive Evidence</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Admin Investigation Notes & Action Taken</label>
                <Textarea
                  rows={4}
                  placeholder="Record UPI transaction IDs flagged, cyber crime docket number, bank accounts frozen, or user communication notes..."
                  value={fraudNotesUpdate}
                  onChange={(e) => setFraudNotesUpdate(e.target.value)}
                  className="rounded-xl text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsFraudModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFraudStatus}
              className="rounded-xl font-bold text-xs text-white bg-zinc-950 hover:bg-zinc-800 shadow-xs"
            >
              Save Investigation Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          ATTACHED EVIDENCE LIGHTBOX MODAL
      ========================================================================= */}
      <Dialog open={Boolean(evidenceZoomUrl)} onOpenChange={(open) => !open && setEvidenceZoomUrl(null)}>
        <DialogContent className="sm:max-w-[700px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-zinc-950">
              Attached Incident Proof / Screenshot
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              High-resolution evidence submitted by user during fraud incident report.
            </DialogDescription>
          </DialogHeader>

          {evidenceZoomUrl && (
            <div className="py-2 flex items-center justify-center bg-zinc-950 rounded-2xl p-2 max-h-[70vh] overflow-hidden">
              <img
                src={evidenceZoomUrl}
                alt="Fraud Proof Evidence"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEvidenceZoomUrl(null)}
              className="rounded-xl text-xs font-bold"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          CONTACT INQUIRY & CONSULTATION REVIEW MODAL
      ========================================================================= */}
      <Dialog open={isInquiryModalOpen} onOpenChange={setIsInquiryModalOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-zinc-950 flex items-center gap-2">
              <span className="p-1 rounded bg-blue-100 text-blue-700 text-sm">📩</span>
              <span>Review Inquiry #{selectedInquiry?.id || selectedInquiry?._id}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Update inquiry status, schedule operational callbacks, and record resolution notes.
            </DialogDescription>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Inquirer:</span>
                  <span className="font-bold text-zinc-900">{selectedInquiry.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Contact:</span>
                  <span className="font-bold text-zinc-900">
                    {selectedInquiry.phone} {selectedInquiry.email ? `(${selectedInquiry.email})` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Type / Channel:</span>
                  <span className="font-bold uppercase text-zinc-800">{selectedInquiry.inquiryType}</span>
                </div>
                {selectedInquiry.city && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Operational City:</span>
                    <span className="font-bold text-zinc-800">{selectedInquiry.city}</span>
                  </div>
                )}
                {selectedInquiry.orderId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Order ID:</span>
                    <span className="font-bold text-zinc-800">{selectedInquiry.orderId}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Inquiry Status</label>
                <select
                  value={inquiryStatusUpdate}
                  onChange={(e) => setInquiryStatusUpdate(e.target.value)}
                  className="w-full h-9 rounded-xl border border-zinc-200 bg-white px-3 font-semibold text-xs text-zinc-800"
                >
                  <option value="new">New Inbound</option>
                  <option value="in_progress">In Progress / Agent Assigned</option>
                  <option value="consultation_scheduled">Consultation Callback Scheduled</option>
                  <option value="resolved">Resolved / Settled</option>
                  <option value="dismissed">Dismissed / Spam</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Admin Response / Follow-up Notes</label>
                <Textarea
                  rows={4}
                  placeholder="Record callback summary, discussion details, customer advice or next actions..."
                  value={inquiryNotesUpdate}
                  onChange={(e) => setInquiryNotesUpdate(e.target.value)}
                  className="rounded-xl text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsInquiryModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveInquiryStatus}
              className="rounded-xl font-bold text-xs text-white bg-zinc-950 hover:bg-zinc-800 shadow-xs"
            >
              Save Inquiry Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          CANDIDATE JOB APPLICATION REVIEW MODAL
      ========================================================================= */}
      <Dialog open={isApplicationModalOpen} onOpenChange={setIsApplicationModalOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-zinc-950 flex items-center gap-2">
              <span className="p-1 rounded bg-purple-100 text-purple-700 text-sm">💼</span>
              <span>Review Candidate Application #{selectedApplication?.id || selectedApplication?._id}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Update recruitment pipeline stage, schedule interviews, and log recruiter evaluations.
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Candidate:</span>
                  <span className="font-bold text-zinc-900">{selectedApplication.applicantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Applied Role:</span>
                  <span className="font-bold text-emerald-700">{selectedApplication.roleTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Phone:</span>
                  <span className="font-bold text-zinc-900">{selectedApplication.applicantPhone}</span>
                </div>
                {selectedApplication.applicantEmail && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Email:</span>
                    <span className="font-bold text-zinc-900">{selectedApplication.applicantEmail}</span>
                  </div>
                )}
                {selectedApplication.experience && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Experience:</span>
                    <span className="font-bold text-zinc-900">{selectedApplication.experience}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Recruitment Pipeline Stage</label>
                <select
                  value={applicationStatusUpdate}
                  onChange={(e) => setApplicationStatusUpdate(e.target.value)}
                  className="w-full h-9 rounded-xl border border-zinc-200 bg-white px-3 font-semibold text-xs text-zinc-800"
                >
                  <option value="received">Application Received</option>
                  <option value="under_review">Profile Under Review</option>
                  <option value="shortlisted">Shortlisted for Technical Round</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                  <option value="offered">Offer Extended</option>
                  <option value="rejected">Archived / Rejected</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Recruiter &amp; Technical Interview Notes</label>
                <Textarea
                  rows={4}
                  placeholder="Record initial screening feedback, coding assessment score, CTC expectation, or interview feedback..."
                  value={applicationNotesUpdate}
                  onChange={(e) => setApplicationNotesUpdate(e.target.value)}
                  className="rounded-xl text-xs resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsApplicationModalOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveApplicationStatus}
              className="rounded-xl font-bold text-xs text-white bg-zinc-950 hover:bg-zinc-800 shadow-xs"
            >
              Save Application Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
