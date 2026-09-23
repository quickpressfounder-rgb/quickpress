import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Eye,
  Reply,
  Sparkles,
  Paperclip,
  Building2,
  Truck,
  User,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Check,
  RefreshCw,
  SendHorizontal,
  ChevronRight,
  Inbox,
  X,
  AtSign,
  Calendar,
  Layers,
  Trash2,
  EyeOff,
  MousePointerClick,
  Palette,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { TemplateStudioTab, CampaignsTab, ThreadViewer } from "./email-studio-campaigns";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { KpiCard } from "../components/AdminUI";
import {
  fetchEmails,
  fetchEmailStats,
  sendCustomEmail,
  replyToEmail,
  resendEmail,
  deleteEmail,
  type EmailLog,
  type EmailStats,
} from "../api/emails";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/emails")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Email Automation & Communication Hub",
      "Monitor automated transactional emails, view live HTML previews, dispatch manual updates, and reply to users."
    ),
  component: EmailHubPage,
});

const QUICK_TEMPLATES = [
  {
    id: "order_resolved",
    label: "📦 Order Update / Resolved",
    subject: "Update Regarding Your QuickPress Laundry Order",
    message: "Thank you for reaching out to QuickPress Support. We have reviewed your order details with our partner laundromat hub and the delivery captain. Your request has been processed and updated. Please let us know if you need any further assistance!",
    audience: "customer",
    category: "order",
  },
  {
    id: "refund_processed",
    label: "💸 Refund / Credit Note",
    subject: "Refund Processed to Your QuickPress Account",
    message: "We have processed a refund for your recent laundry order. The amount has been credited to your QuickPress Wallet and is available for immediate use on any future booking.",
    audience: "customer",
    category: "finance",
  },
  {
    id: "kyc_clarification",
    label: "🏪 Store KYC Clarification",
    subject: "QuickPress Partner Store: KYC Verification Clarification",
    message: "We are currently reviewing your store registration documents. Could you please provide a clear scanned copy of your Bank Passbook / Cancelled Cheque with IFSC code clearly visible?",
    audience: "partner",
    category: "security",
  },
  {
    id: "captain_advisory",
    label: "🛵 Captain Safety & COD Advisory",
    subject: "Advisory: Peak Hours Cash In Hand Deposit",
    message: "Captain, please ensure all collected Cash-on-Delivery funds are deposited via company UPI before 8:00 PM today to maintain continuous order dispatch clearance. Ride safely!",
    audience: "rider",
    category: "security",
  },
];

function EmailHubPage() {
  const queryClient = useQueryClient();

  // Navigation main view tab
  const [activeMainTab, setActiveMainTab] = useState<"logs" | "templates" | "campaigns">("logs");

  // Filters state
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<EmailLog | null>(null);

  // Compose form state with CC
  const [formTo, setFormTo] = useState("");
  const [formName, setFormName] = useState("");
  const [formCc, setFormCc] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formAudience, setFormAudience] = useState("customer");
  const [formCategory, setFormCategory] = useState("manual");

  // Fetch emails
  const emailsQuery = useQuery({
    queryKey: ["admin", "emails", audienceFilter, categoryFilter, statusFilter, searchQuery],
    queryFn: () =>
      fetchEmails({
        audience: audienceFilter,
        category: categoryFilter,
        status: statusFilter,
        search: searchQuery,
      }),
    refetchInterval: 15000,
  });

  // Fetch stats
  const statsQuery = useQuery({
    queryKey: ["admin", "emails", "stats"],
    queryFn: fetchEmailStats,
    refetchInterval: 20000,
  });

  // Mutations
  const sendMutation = useMutation({
    mutationFn: sendCustomEmail,
    onSuccess: (data) => {
      if (data.ok) {
        toast.success("Email successfully dispatched!");
        setComposeOpen(false);
        resetComposeForm();
        queryClient.invalidateQueries({ queryKey: ["admin", "emails"] });
      } else {
        toast.error(`Email send failed: ${data.error || "Unknown error"}`);
      }
    },
    onError: (err: any) => {
      toast.error(`Failed to dispatch email: ${err.message || err}`);
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { message: string; subject?: string | undefined; cc?: string | undefined } }) =>
      replyToEmail(id, payload),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success("Reply dispatched successfully!");
        setReplyTarget(null);
        resetComposeForm();
        queryClient.invalidateQueries({ queryKey: ["admin", "emails"] });
      } else {
        toast.error(`Reply failed: ${data.error || "Unknown error"}`);
      }
    },
    onError: (err: any) => {
      toast.error(`Reply failed: ${err.message || err}`);
    },
  });

  const resendMutation = useMutation({
    mutationFn: resendEmail,
    onSuccess: (data) => {
      if (data.ok) {
        toast.success("Email re-dispatched to recipient!");
        queryClient.invalidateQueries({ queryKey: ["admin", "emails"] });
      } else {
        toast.error(`Resend failed: ${data.error || "Unknown error"}`);
      }
    },
    onError: (err: any) => {
      toast.error(`Resend failed: ${err.message || err}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmail,
    onSuccess: (data) => {
      if (data.ok) {
        toast.success("Email record deleted.");
        queryClient.invalidateQueries({ queryKey: ["admin", "emails"] });
      } else {
        toast.error(data.error || "Failed to delete email record.");
      }
    },
    onError: (err: any) => {
      toast.error(`Delete failed: ${err.message || err}`);
    },
  });

  function resetComposeForm() {
    setFormTo("");
    setFormName("");
    setFormCc("");
    setFormSubject("");
    setFormMessage("");
    setFormAudience("customer");
    setFormCategory("manual");
  }

  function handleOpenReply(item: EmailLog) {
    setReplyTarget(item);
    setFormTo(item.recipient);
    setFormName(item.recipientName);
    const ccList = Array.isArray(item.cc) ? item.cc.join(", ") : (item.cc || "");
    setFormCc(ccList);
    const sub = item.subject || "";
    setFormSubject(sub.startsWith("Re:") ? sub : `Re: ${sub}`);
    setFormMessage("");
  }

  function handleApplyTemplate(tmpl: typeof QUICK_TEMPLATES[0]) {
    setFormSubject(tmpl.subject);
    setFormMessage(tmpl.message);
    setFormAudience(tmpl.audience);
    setFormCategory(tmpl.category);
    toast.info(`Applied template: ${tmpl.label}`);
  }

  const emailsList = emailsQuery.data || [];
  const stats: EmailStats = statsQuery.data || {
    total: 0,
    sent: 0,
    failed: 0,
    todaySent: 0,
    successRate: 100,
    totalOpens: 0,
    openRate: 0,
    totalClicks: 0,
    clickRate: 0,
    senderEmail: "admin@quickpress.in",
    byAudience: { customer: 0, partner: 0, rider: 0, admin: 0 },
    byCategory: { order: 0, finance: 0, onboarding: 0, security: 0, alert: 0, manual: 0 },
  };

  const audienceCounts = stats.byAudience || { customer: 0, partner: 0, rider: 0, admin: 0 };

  return (
    <AdminShell
      title="Email Hub"
      subtitle="Live surveillance of all automated transactional emails, HTML preview inspection, custom dispatches & user replies."
    >
      <div className="space-y-6">
        {/* Top Header Card (Clean White Background & Dark Text) */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900">
                    Email Automation &amp; Communication Hub
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> PostgreSQL Rate Guard
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                  Surveillance audit logs, manual dispatches &amp; distributed rate-limiting powered by real database.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              size="sm"
              onClick={() => {
                resetComposeForm();
                setReplyTarget(null);
                setComposeOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Send New Email
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "emails"] })}
              className="border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
              title="Refresh logs"
            >
              <RefreshCw className={`h-4 w-4 ${emailsQuery.isFetching ? "animate-spin text-emerald-600" : ""}`} />
            </Button>
          </div>
        </div>

        {/* 5 KPI Metrics (Volume + Delivery + Opens + Clicks + Rate Guard) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <KpiCard
            title="Total Dispatched"
            value={stats.total.toLocaleString()}
            hint="Recorded email events in DB"
            icon={<Mail className="h-4 w-4" />}
          />
          <KpiCard
            title="Dispatched Today"
            value={stats.todaySent.toLocaleString()}
            hint="Outbound volume in 24h"
            icon={<Clock className="h-4 w-4" />}
          />
          <KpiCard
            title="Delivery Success"
            value={`${stats.successRate}%`}
            hint={`${stats.sent} sent · ${stats.failed} failed`}
            positive={stats.successRate >= 95}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <KpiCard
            title="Open Rate %"
            value={`${stats.openRate || 0}%`}
            hint={`${stats.totalOpens || 0} unique opens`}
            positive={(stats.openRate || 0) >= 30}
            icon={<Eye className="h-4 w-4 text-emerald-600" />}
          />
          <KpiCard
            title="Click-Through (CTR)"
            value={`${stats.clickRate || 0}%`}
            hint={`${stats.totalClicks || 0} link/CTA clicks`}
            positive={(stats.clickRate || 0) >= 5}
            icon={<MousePointerClick className="h-4 w-4 text-blue-600" />}
          />
        </div>

        {/* Main View Tabs (Surveillance Logs / Template Studio / Marketing Campaigns) */}
        <div className="flex border-b border-zinc-200 gap-8 overflow-x-auto pb-0">
          <button
            onClick={() => setActiveMainTab("logs")}
            className={`pb-3 text-sm font-black flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeMainTab === "logs"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Mail className="h-4 w-4" />
            Surveillance &amp; Audit Logs
          </button>
          <button
            onClick={() => setActiveMainTab("templates")}
            className={`pb-3 text-sm font-black flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeMainTab === "templates"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Palette className="h-4 w-4" />
            Template Studio
          </button>
          <button
            onClick={() => setActiveMainTab("campaigns")}
            className={`pb-3 text-sm font-black flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeMainTab === "campaigns"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Megaphone className="h-4 w-4" />
            Marketing Campaigns
          </button>
        </div>

        {activeMainTab === "templates" && <TemplateStudioTab />}
        {activeMainTab === "campaigns" && <CampaignsTab />}
        {activeMainTab === "logs" && (
          <div className="space-y-6">

        {/* Filter Bar (Clean White Background + Crisp Controls) */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs space-y-3.5">
          {/* Audience Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400 mr-2 flex items-center gap-1 shrink-0">
              <Filter className="h-3 w-3" /> Audience:
            </span>
            {[
              { id: "all", label: "All Audiences", count: stats.total, icon: Inbox },
              { id: "customer", label: "Customers", count: audienceCounts.customer, icon: User },
              { id: "partner", label: "Store Partners", count: audienceCounts.partner, icon: Building2 },
              { id: "rider", label: "Fleet Captains", count: audienceCounts.rider, icon: Truck },
              { id: "admin", label: "Operations & Admin", count: audienceCounts.admin, icon: ShieldAlert },
            ].map((aud) => {
              const Icon = aud.icon;
              const active = audienceFilter === aud.id;
              return (
                <button
                  key={aud.id}
                  onClick={() => setAudienceFilter(aud.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    active
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs"
                      : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70 border border-zinc-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {aud.label}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      active ? "bg-emerald-200 text-emerald-900" : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {aud.count || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Controls: Category, Status, Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Dropdown */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs bg-white border-zinc-300 text-zinc-800 font-medium">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="order">Order Updates</SelectItem>
                  <SelectItem value="finance">Finance &amp; Payouts</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="security">Security &amp; OTP</SelectItem>
                  <SelectItem value="alert">Operations Alerts</SelectItem>
                  <SelectItem value="manual">Manual / Staff</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Dropdown */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-white border-zinc-300 text-zinc-800 font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Delivered / Sent</SelectItem>
                  <SelectItem value="failed">Failed / Bounced</SelectItem>
                </SelectContent>
              </Select>

              {(audienceFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAudienceFilter("all");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                  className="h-8 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                >
                  <X className="h-3 w-3 mr-1" /> Reset Filters
                </Button>
              )}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[260px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search recipient, CC, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Email Surveillance Table (White Background + Dark Crisp Text) */}
        <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/90 text-zinc-600 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 font-bold">Dispatched At</th>
                  <th className="py-3.5 px-4 font-bold">Recipient &amp; CC</th>
                  <th className="py-3.5 px-3 font-bold">Audience</th>
                  <th className="py-3.5 px-3 font-bold">Category</th>
                  <th className="py-3.5 px-4 font-bold">Subject Line</th>
                  <th className="py-3.5 px-3 font-bold text-center">Status &amp; Activity</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {emailsQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-zinc-500">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading email logs...
                    </td>
                  </tr>
                ) : emailsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-zinc-400">
                      <Inbox className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                      No emails match the selected filters.
                    </td>
                  </tr>
                ) : (
                  emailsList.map((item) => {
                    const isSuccess = item.status === "sent";
                    const fullTime = formatFullDateTime(item.createdAt);
                    const relTime = formatRelativeTime(item.createdAt);
                    const ccList = Array.isArray(item.cc) ? item.cc : item.cc ? [item.cc] : [];

                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors group">
                        {/* Dispatched At (Full Date & Time) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-zinc-400" />
                            {fullTime.date}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{fullTime.time}</span>
                            <span className="text-[10px] text-zinc-400">({relTime})</span>
                          </div>
                        </td>

                        {/* Recipient & CC */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                            {item.recipientName || "Valued User"}
                            {item.isReply && (
                              <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-bold border border-blue-200">
                                Reply
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono truncate max-w-[220px]" title={item.recipient}>
                            {item.recipient}
                          </div>
                          {ccList.length > 0 && (
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1 truncate max-w-[220px]" title={`CC: ${ccList.join(", ")}`}>
                              <span className="font-bold text-zinc-400">CC:</span>
                              <span className="text-zinc-600 truncate">{ccList.join(", ")}</span>
                            </div>
                          )}
                        </td>

                        {/* Audience */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${getAudienceBadgeLight(item.audience)}`}>
                            {renderAudienceIcon(item.audience)}
                            {capitalize(item.audience || "customer")}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {capitalize(item.category || "order")}
                          </span>
                        </td>

                        {/* Subject */}
                        <td className="py-3.5 px-4">
                          <div className="text-zinc-900 font-semibold truncate max-w-[280px] sm:max-w-[340px]" title={item.subject}>
                            {item.hasAttachment && (
                              <Paperclip className="inline h-3.5 w-3.5 mr-1 text-emerald-600" />
                            )}
                            {item.subject}
                          </div>
                          {item.errorMessage && (
                            <div className="text-[10px] text-rose-600 font-medium truncate max-w-[280px] mt-0.5">
                              Error: {item.errorMessage}
                            </div>
                          )}
                        </td>

                        {/* Status & Activity */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                isSuccess
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {isSuccess ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                              {item.status}
                            </span>
                            {item.opened ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-200"
                                title={`First opened: ${item.firstOpenedAt || "N/A"}`}
                              >
                                <Eye className="h-2.5 w-2.5" /> Opened{item.openCount && item.openCount > 1 ? ` (${item.openCount}x)` : ""}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                                <EyeOff className="h-2.5 w-2.5" /> Unopened
                              </span>
                            )}
                            {item.clicked && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-200"
                                title={`Total clicks: ${item.clickCount || 1}`}
                              >
                                <MousePointerClick className="h-2.5 w-2.5" /> Clicked{item.clickCount && item.clickCount > 1 ? ` (${item.clickCount}x)` : ""}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview HTML */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewEmail(item)}
                              className="h-7 px-2.5 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border-zinc-200 shadow-2xs"
                              title="Inspect Rendered HTML"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                              Preview
                            </Button>

                            {/* Resend */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => resendMutation.mutate(item.id)}
                              disabled={resendMutation.isPending}
                              className="h-7 w-7 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                              title="Resend to recipient"
                            >
                              <RotateCw className="h-3 w-3" />
                            </Button>

                            {/* Reply */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenReply(item)}
                              className="h-7 w-7 text-zinc-500 hover:text-blue-600 hover:bg-blue-50"
                              title="Reply with CC"
                            >
                              <Reply className="h-3 w-3" />
                            </Button>

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm(`Delete email audit record #${item.id}?`)) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="h-7 w-7 text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete email audit log"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

      {/* =========================================================================
          SLIDE-OVER SHEET: LIVE RENDERED HTML PREVIEW & FULL DISPATCH DETAIL
          ========================================================================= */}
      <Sheet open={Boolean(previewEmail)} onOpenChange={(open) => !open && setPreviewEmail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl bg-white border-zinc-200 text-zinc-900 p-0 flex flex-col z-50 shadow-2xl">
          {previewEmail && (
            <>
              {/* Sheet Top Header (Light White Theme) */}
              <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getAudienceBadgeLight(previewEmail.audience)}`}>
                      {capitalize(previewEmail.audience)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {capitalize(previewEmail.category)}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        previewEmail.status === "sent"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {previewEmail.status}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-zinc-900 leading-snug">
                    {previewEmail.subject}
                  </h3>
                  <div className="text-xs text-zinc-500 mt-1 flex flex-col gap-0.5">
                    <div>
                      To: <strong>{previewEmail.recipientName}</strong> &lt;{previewEmail.recipient}&gt;
                    </div>
                    {previewEmail.cc && (Array.isArray(previewEmail.cc) ? previewEmail.cc.length > 0 : Boolean(previewEmail.cc)) && (
                      <div className="text-[11px] text-zinc-600 font-mono">
                        CC: {Array.isArray(previewEmail.cc) ? previewEmail.cc.join(", ") : previewEmail.cc}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Selector */}
              <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 pt-3 border-b border-zinc-200 bg-zinc-50">
                  <TabsList className="bg-zinc-100 text-zinc-600 border border-zinc-200 h-8">
                    <TabsTrigger value="preview" className="text-xs data-[state=active]:bg-white data-[state=active]:text-emerald-700 font-bold">
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> HTML Preview
                    </TabsTrigger>
                    <TabsTrigger value="details" className="text-xs data-[state=active]:bg-white data-[state=active]:text-emerald-700 font-bold">
                      <FileText className="h-3.5 w-3.5 mr-1.5" /> Timeline
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="text-xs data-[state=active]:bg-white data-[state=active]:text-emerald-700 font-bold">
                      <MousePointerClick className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Opens &amp; Clicks
                    </TabsTrigger>
                    <TabsTrigger value="thread" className="text-xs data-[state=active]:bg-white data-[state=active]:text-emerald-700 font-bold">
                      <Reply className="h-3.5 w-3.5 mr-1.5 text-indigo-600" /> Thread
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab 1: Live Iframe Sandbox Preview */}
                <TabsContent value="preview" className="flex-1 p-4 bg-zinc-100/60 overflow-y-auto m-0">
                  <div className="bg-white rounded-xl shadow-md overflow-hidden border border-zinc-200">
                    <iframe
                      srcDoc={previewEmail.htmlBody || `<p>${previewEmail.plainText}</p>`}
                      title="Email HTML Preview"
                      sandbox="allow-same-origin"
                      className="w-full h-[540px] border-0"
                    />
                  </div>
                </TabsContent>

                {/* Tab 2: Full Dispatch Timeline & Technical Audit */}
                <TabsContent value="details" className="flex-1 p-5 overflow-y-auto m-0 space-y-4 text-xs font-sans">
                  {/* Dispatch Details Card */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2.5">
                    <div className="font-bold text-zinc-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      Full Dispatch Timing
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500">Date:</span>{" "}
                        <strong className="text-zinc-900">{formatFullDateTime(previewEmail.createdAt).date}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500">Time:</span>{" "}
                        <strong className="text-zinc-900">{formatFullDateTime(previewEmail.createdAt).time}</strong>
                      </div>
                      <div>
                        <span className="text-zinc-500">Relative Time:</span>{" "}
                        <span className="text-zinc-700 font-medium">{formatRelativeTime(previewEmail.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Transport:</span>{" "}
                        <strong className="text-emerald-700 font-bold">{previewEmail.method.toUpperCase()} (SSL/TLS)</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-200/80 space-y-1.5 font-mono text-[11px]">
                      <div><span className="text-zinc-400">Email ID:</span> <span className="text-zinc-800">{previewEmail.id}</span></div>
                      <div><span className="text-zinc-400">Sender Gateway:</span> <span className="text-zinc-800">{previewEmail.sender}</span></div>
                      <div><span className="text-zinc-400">Recipient:</span> <span className="text-zinc-800">{previewEmail.recipient}</span></div>
                      {previewEmail.cc && (
                        <div>
                          <span className="text-zinc-400">CC:</span>{" "}
                          <span className="text-zinc-800">
                            {Array.isArray(previewEmail.cc) ? previewEmail.cc.join(", ") : previewEmail.cc}
                          </span>
                        </div>
                      )}
                      {previewEmail.hasAttachment && (
                        <div>
                          <span className="text-zinc-400">Attachment:</span>{" "}
                          <span className="text-emerald-700 font-bold">{previewEmail.attachmentName || "PDF Document"}</span>
                        </div>
                      )}
                      {previewEmail.errorMessage && (
                        <div className="text-rose-600 font-bold">
                          Error Detail: {previewEmail.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata Context */}
                  {previewEmail.metadata && Object.keys(previewEmail.metadata).length > 0 && (
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                      <div className="text-xs font-bold text-zinc-800 mb-2 uppercase tracking-wider">
                        Attached Order &amp; Business Context
                      </div>
                      <pre className="text-[11px] font-mono text-zinc-800 bg-white p-3 rounded-lg border border-zinc-200 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(previewEmail.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Opens & Clicks Real-Time Tracking */}
                <TabsContent value="analytics" className="flex-1 p-5 overflow-y-auto m-0 space-y-4 text-xs font-sans">
                  {/* Tracking Overview Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1">
                      <div className="text-zinc-500 font-medium flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-emerald-600" /> Read Status
                      </div>
                      <div className="text-base font-black text-zinc-900">
                        {previewEmail.opened ? "Opened" : "Unopened"}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {previewEmail.opened ? `${previewEmail.openCount || 1} total opens recorded` : "Waiting for recipient to view email"}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1">
                      <div className="text-zinc-500 font-medium flex items-center gap-1.5">
                        <MousePointerClick className="h-3.5 w-3.5 text-blue-600" /> Click Activity
                      </div>
                      <div className="text-base font-black text-zinc-900">
                        {previewEmail.clicked ? `${previewEmail.clickCount || 1} Clicks` : "No Clicks"}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {previewEmail.clicked ? "Recipient interacted with CTA link" : "No links clicked yet"}
                      </div>
                    </div>
                  </div>

                  {/* Open Timestamps */}
                  {previewEmail.opened && (
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2">
                      <div className="font-bold text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        Open Timestamps
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">First Opened:</span>
                          <strong className="text-zinc-800 font-mono text-[11px]">
                            {previewEmail.firstOpenedAt ? `${formatFullDateTime(previewEmail.firstOpenedAt).date} ${formatFullDateTime(previewEmail.firstOpenedAt).time}` : "Recorded"}
                          </strong>
                        </div>
                        {previewEmail.lastOpenedAt && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Last Opened:</span>
                            <strong className="text-zinc-800 font-mono text-[11px]">
                              {`${formatFullDateTime(previewEmail.lastOpenedAt).date} ${formatFullDateTime(previewEmail.lastOpenedAt).time}`}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Click Events List */}
                  {previewEmail.clicks && previewEmail.clicks.length > 0 && (
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2">
                      <div className="font-bold text-zinc-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                        Recorded Link Clicks ({previewEmail.clicks.length})
                      </div>
                      <div className="space-y-2">
                        {previewEmail.clicks.map((c, i) => (
                          <div key={i} className="bg-white p-2.5 rounded-lg border border-zinc-200 flex items-center justify-between text-[11px]">
                            <span className="font-mono text-blue-600 truncate max-w-[280px]" title={c.url}>
                              {c.url}
                            </span>
                            <span className="text-zinc-400 font-mono shrink-0 ml-2">
                              {(c.clickedAt || c.timestamp || "").slice(11, 19)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tracking Pixel Technical Inspection */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2">
                    <div className="font-bold text-zinc-800 text-xs uppercase tracking-wider">
                      Tracking Pixel Endpoint
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200 font-mono text-[11px] text-zinc-700 break-all">
                      /api/emails/track/open/{previewEmail.id}.png
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Injected automatically as a transparent 1x1 GIF before dispatch. Loaded securely via SSL with zero-cache headers.
                    </p>
                  </div>
                </TabsContent>

                {/* Tab 4: Threaded Conversation View */}
                <TabsContent value="thread" className="flex-1 p-5 overflow-y-auto m-0 space-y-4 text-xs font-sans">
                  <ThreadViewer
                    emailId={previewEmail.id}
                    onReply={(target) => {
                      handleOpenReply(target);
                      setPreviewEmail(null);
                    }}
                  />
                </TabsContent>
              </Tabs>

              {/* Sheet Bottom Actions */}
              <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Permanently delete email audit record #${previewEmail.id}?`)) {
                        deleteMutation.mutate(previewEmail.id);
                        setPreviewEmail(null);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resendMutation.mutate(previewEmail.id)}
                    disabled={resendMutation.isPending}
                    className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 font-bold"
                  >
                    <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                    Resend
                  </Button>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    handleOpenReply(previewEmail);
                    setPreviewEmail(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Reply className="h-3.5 w-3.5 mr-1.5" />
                  Reply with CC
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          MODAL: COMPOSE NEW EMAIL OR REPLY (White Background + Black Text + CC)
          ========================================================================= */}
      <Dialog
        open={composeOpen || Boolean(replyTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setComposeOpen(false);
            setReplyTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl bg-white border-zinc-200 text-zinc-900 shadow-2xl z-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-900 font-black text-lg">
              <Send className="h-5 w-5 text-emerald-600" />
              {replyTarget ? `Reply to ${replyTarget.recipientName}` : "Compose Outbound Email"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              {replyTarget
                ? `Replying to conversation thread for "${replyTarget.subject}"`
                : "Send branded email directly through QuickPress Gmail SMTP gateway with optional CC."}
            </DialogDescription>
          </DialogHeader>

          {/* Quick Presets Picker */}
          {!replyTarget && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-black text-zinc-500 uppercase tracking-wider">Quick Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 font-semibold transition-colors"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3.5 py-2">
            {/* Recipient Email & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-zinc-800">Recipient Email *</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={formTo}
                  onChange={(e) => setFormTo(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-900 text-xs mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-zinc-800">Recipient Name</Label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Verma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-900 text-xs mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* CC (Carbon Copy) Field */}
            <div>
              <Label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                <span>CC (Carbon Copy, optional)</span>
                <span className="text-[10px] text-zinc-400 font-normal">Separate multiple emails with comma</span>
              </Label>
              <Input
                type="text"
                placeholder="ops@quickpress.com, store@laundromat.com"
                value={formCc}
                onChange={(e) => setFormCc(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-900 text-xs mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Audience & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-zinc-800">Target Audience</Label>
                <Select value={formAudience} onValueChange={setFormAudience}>
                  <SelectTrigger className="bg-white border-zinc-300 text-zinc-900 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="partner">Partner Store</SelectItem>
                    <SelectItem value="rider">Delivery Captain</SelectItem>
                    <SelectItem value="admin">Operations / Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-bold text-zinc-800">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="bg-white border-zinc-300 text-zinc-900 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                    <SelectItem value="manual">Manual Message</SelectItem>
                    <SelectItem value="order">Order Update</SelectItem>
                    <SelectItem value="finance">Finance / Refund</SelectItem>
                    <SelectItem value="security">Security / KYC</SelectItem>
                    <SelectItem value="alert">Operational Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label className="text-xs font-bold text-zinc-800">Subject Line *</Label>
              <Input
                type="text"
                placeholder="Important update about your QuickPress order"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-900 text-xs mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Message Body */}
            <div>
              <Label className="text-xs font-bold text-zinc-800">Message Content *</Label>
              <Textarea
                placeholder="Write your email message here..."
                rows={5}
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-900 text-xs mt-1 leading-relaxed focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-zinc-200 pt-3 bg-zinc-50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
            <span className="text-[11px] text-zinc-500 font-mono">
              {stats.senderEmail ? `Via ${stats.senderEmail}` : "Configured via .env"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setComposeOpen(false);
                  setReplyTarget(null);
                }}
                className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!formTo.trim() || !formSubject.trim() || !formMessage.trim()) {
                    toast.error("Please fill in recipient, subject, and message.");
                    return;
                  }
                  if (replyTarget) {
                    replyMutation.mutate({
                      id: replyTarget.id,
                      payload: { message: formMessage, subject: formSubject, cc: formCc.trim() || undefined },
                    });
                  } else {
                    sendMutation.mutate({
                      to: formTo,
                      recipient_name: formName,
                      cc: formCc.trim() || undefined,
                      subject: formSubject,
                      message: formMessage,
                      audience: formAudience,
                      category: formCategory,
                    });
                  }
                }}
                disabled={sendMutation.isPending || replyMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
              >
                <SendHorizontal className="h-3.5 w-3.5 mr-1.5" />
                {replyTarget ? "Send Reply" : "Dispatch Email"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminShell>
  );
}

// Helpers
function formatFullDateTime(ts?: string): { date: string; time: string } {
  if (!ts) return { date: "Just now", time: "" };
  try {
    const d = new Date(ts);
    return {
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
    };
  } catch {
    return { date: "Recently", time: "" };
  }
}

function formatRelativeTime(ts?: string): string {
  if (!ts) return "recently";
  try {
    const diffMs = Date.now() - new Date(ts).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getAudienceBadgeLight(aud?: string) {
  switch ((aud || "").toLowerCase()) {
    case "customer":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "partner":
      return "bg-purple-50 text-purple-800 border-purple-200";
    case "rider":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "admin":
      return "bg-rose-50 text-rose-800 border-rose-200";
    default:
      return "bg-zinc-100 text-zinc-800 border-zinc-200";
  }
}

function renderAudienceIcon(aud?: string) {
  switch ((aud || "").toLowerCase()) {
    case "customer":
      return <User className="h-3 w-3" />;
    case "partner":
      return <Building2 className="h-3 w-3" />;
    case "rider":
      return <Truck className="h-3 w-3" />;
    case "admin":
      return <ShieldAlert className="h-3 w-3" />;
    default:
      return <Inbox className="h-3 w-3" />;
  }
}
