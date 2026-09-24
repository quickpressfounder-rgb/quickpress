import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  PauseCircle,
  PlayCircle,
  Search,
  X,
  Building2,
  Calendar,
  Download,
  Phone,
  MapPin,
  FileCheck,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Store,
  Edit3,
  Save,
  Send,
  Star,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Activity,
  History,
  Lock,
  Percent,
  Truck,
  PackageCheck,
  Ban,
  RefreshCw,
  Eye,
  PlusCircle,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { AdminShell } from "../components/AdminShell";
import { DataTable, DetailRow, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  fetchPartner360,
  fetchPartners,
  fetchPartnerStats,
  approvePartner,
  suspendPartner,
  blockPartner,
  unblockPartner,
  updatePartnerKyc,
  updatePartnerCommission,
  adjustPartnerWallet,
  addPartnerNote,
  updatePartnerTags,
  sendPartnerNotification,
  rejectPartner,
  createPartner,
  type AdminPartner,
  type Partner360Data,
  type PartnerDashboardStats,
} from "../api/partners";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { onRealtimeEvent } from "../api/core/socket-client";

export const Route = createFileRoute("/partners")({
  beforeLoad: requireAdminSession,
  head: () => adminHead("Partner Management & 360° System", "Approve, monitor, audit, and manage QuickPress laundry partner stores across Supabase."),
  component: PartnersPage,
  errorComponent: ({ error }) => (
    <AdminShell title="Partner Control Center">
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-2xl border border-rose-200 m-6">
        <h3 className="text-lg font-bold">Partner Management Loaded</h3>
        <p className="text-xs text-rose-500 mt-1">{String((error as Error)?.message || error)}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-rose-600 text-white font-bold text-xs">Reload Page</Button>
      </div>
    </AdminShell>
  ),
});

const PARTNER_REJECTION_PRESETS = [
  "Clear Storefront Logo / Facade Banner photo is missing or blurry. Please upload clear photos.",
  "GSTIN number is unverified or trade name does not match business documents.",
  "PAN card name or number mismatch with owner profile.",
  "Bank account details / Cancelled cheque unreadable or incorrect IFSC code.",
  "Trade / Shop & Establishment license expired or illegible.",
  "Store address or pin code is outside currently serviceable areas.",
  "Catalog pricing / service categories incomplete or require adjustment.",
];

function PartnersPage() {
  const queryClient = useQueryClient();
  const partnersQuery = useQuery({ queryKey: ["admin", "partners"], queryFn: () => fetchPartners(1, 100) });
  const statsQuery = useQuery({ queryKey: ["admin", "partners", "stats"], queryFn: fetchPartnerStats });

  // Real-time partner store status listener
  useEffect(() => {
    const unsubStatus = onRealtimeEvent("partner.status_changed", (payload) => {
      console.log("[AdminPartners] Realtime partner status event:", payload);
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partners", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    });
    const unsubOnline = onRealtimeEvent("partner.online_status", () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "partners", "stats"] });
    });
    return () => {
      unsubStatus();
      unsubOnline();
    };
  }, [queryClient]);

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState("all");

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newBizName, setNewBizName] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCity, setNewCity] = useState("Kasganj");
  const [newAddress, setNewAddress] = useState("");

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendNote, setSuspendNote] = useState("");

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockNote, setBlockNote] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(PARTNER_REJECTION_PRESETS[0]);
  const [customRejectNote, setCustomRejectNote] = useState("");

  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycStatusVal, setKycStatusVal] = useState("Verified");
  const [kycReasonVal, setKycReasonVal] = useState("");

  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [commissionRateVal, setCommissionRateVal] = useState("18.0");

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletType, setWalletType] = useState<"credit" | "debit">("credit");
  const [walletReason, setWalletReason] = useState("");

  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");

  const [newNoteText, setNewNoteText] = useState("");

  const allPartners = partnersQuery.data ?? [];
  const stats = statsQuery.data;

  // Selected 360 query
  const profile360Query = useQuery({
    queryKey: ["admin", "partners", "360", selectedId],
    queryFn: () => fetchPartner360(selectedId!),
    enabled: Boolean(selectedId),
  });
  const profile = profile360Query.data;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: { businessName: string; ownerName: string; phone: string; email?: string; city: string; address?: string }) =>
      createPartner(payload),
    onSuccess: (data) => {
      toast.success(`Partner Store created successfully!`);
      setAddModalOpen(false);
      setNewBizName("");
      setNewOwnerName("");
      setNewPhone("");
      setNewEmail("");
      setNewAddress("");
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
    },
    onError: () => toast.error("Failed to create partner store."),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvePartner(id),
    onSuccess: () => {
      toast.success("Partner store approved & activated!");
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360", selectedId] });
    },
    onError: () => toast.error("Failed to approve partner."),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason, internalNote }: { id: string; reason: string; internalNote?: string }) =>
      suspendPartner(id, { reason, internalNote }),
    onSuccess: (data) => {
      toast.success(`Partner temporarily suspended! (${data.activeOrdersCount || 0} active orders protected)`);
      setSuspendModalOpen(false);
      setSuspendReason("");
      setSuspendNote("");
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360", selectedId] });
    },
    onError: () => toast.error("Failed to suspend partner."),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, reason, internalNote }: { id: string; reason: string; internalNote?: string }) =>
      blockPartner(id, { reason, internalNote }),
    onSuccess: () => {
      toast.success(`Partner permanently blocked! Historical data preserved.`);
      setBlockModalOpen(false);
      setBlockReason("");
      setBlockNote("");
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360", selectedId] });
    },
    onError: () => toast.error("Failed to block partner."),
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => unblockPartner(id),
    onSuccess: () => {
      toast.success("Partner store unblocked & reactivated!");
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360", selectedId] });
    },
    onError: () => toast.error("Failed to unblock partner."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectPartner(id, reason ? { reason } : undefined),
    onSuccess: () => {
      toast.success("Partner store registration rejected and feedback sent for re-submission.");
      setRejectModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360", selectedId] });
    },
    onError: () => toast.error("Failed to reject partner."),
  });

  const kycMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      updatePartnerKyc(id, { status, reason }),
    onSuccess: () => {
      toast.success("Partner KYC status updated!");
      setKycModalOpen(false);
      setKycReasonVal("");
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360", selectedId] });
    },
    onError: () => toast.error("Failed to update KYC status."),
  });

  const commissionMutation = useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) =>
      updatePartnerCommission(id, { commissionRate: rate }),
    onSuccess: () => {
      toast.success("Commission rate updated!");
      setCommissionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360", selectedId] });
    },
    onError: () => toast.error("Failed to update commission rate."),
  });

  const walletMutation = useMutation({
    mutationFn: ({ id, amount, type, reason }: { id: string; amount: number; type: "credit" | "debit"; reason: string }) =>
      adjustPartnerWallet(id, { amount, type, reason }),
    onSuccess: () => {
      toast.success("Partner wallet balance adjusted!");
      setWalletModalOpen(false);
      setWalletAmount("");
      setWalletReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "partners"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360", selectedId] });
    },
    onError: () => toast.error("Failed to adjust wallet."),
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => addPartnerNote(id, note),
    onSuccess: () => {
      toast.success("Internal note logged!");
      setNewNoteText("");
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "partners", "360", selectedId] });
    },
    onError: () => toast.error("Failed to add note."),
  });

  const notifyMutation = useMutation({
    mutationFn: ({ id, title, body }: { id: string; title: string; body: string }) =>
      sendPartnerNotification(id, { title, body }),
    onSuccess: () => {
      toast.success("Push notification dispatched to partner!");
      setNotifyModalOpen(false);
      setNotifyTitle("");
      setNotifyBody("");
    },
    onError: () => toast.error("Failed to send notification."),
  });

  const cities = useMemo(
    () => Array.from(new Set(allPartners.map((p) => p?.city).filter(Boolean))),
    [allPartners]
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPartners.filter((p) => {
      if (!p) return false;
      const matchesQuery = !q || [p.id, p.businessName, p.ownerName, p.phone, p.email, p.city].filter(Boolean).join(" ").toLowerCase().includes(q);
      const matchesStatus =
        statusTab === "all" ||
        (statusTab === "RESUBMITTED" && Boolean(p.resubmitted)) ||
        (statusTab === "ONLINE" && Boolean(p.isOnline || (p as any).isOpen)) ||
        (statusTab === "ACTIVE" && p.status === "ACTIVE") ||
        (statusTab === "PENDING_APPROVAL" && p.status === "PENDING_APPROVAL") ||
        (statusTab === "TEMPORARILY_SUSPENDED" && p.status === "TEMPORARILY_SUSPENDED") ||
        (statusTab === "PERMANENTLY_BLOCKED" && p.status === "PERMANENTLY_BLOCKED");
      const matchesCity = city === "all" || String(p.city || "").toLowerCase() === city.toLowerCase();
      const matchesKyc =
        kycFilter === "all" ||
        (kycFilter === "resubmitted" && Boolean(p.resubmitted)) ||
        String(p.kycStatus || "").toLowerCase() === kycFilter.toLowerCase();
      return matchesQuery && matchesStatus && matchesCity && matchesKyc;
    });
  }, [allPartners, query, statusTab, city, kycFilter]);

  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      toast.error("No partner data to export.");
      return;
    }
    const headers = ["Partner ID", "Business Name", "Owner", "Phone", "Email", "City", "Orders", "Revenue (INR)", "Earnings (INR)", "Commission (INR)", "Rating", "Status", "KYC Status"];
    const csvContent = [
      headers.join(","),
      ...filteredRows.map((r) =>
        [r.id, `"${r.businessName}"`, `"${r.ownerName}"`, r.phone, r.email, r.city, r.totalOrders, r.revenue, r.partnerEarnings, r.commission, r.rating, r.status, r.kycStatus].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QuickPress_Partners_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success(`Exported ${filteredRows.length} partners to CSV.`);
  };

  const realGrossRevenue = useMemo(() => {
    if (stats?.totalPartnerRevenue !== undefined && stats?.totalPartnerRevenue !== null) {
      return stats.totalPartnerRevenue;
    }
    return allPartners.reduce((acc, p) => acc + (p.revenue || 0), 0);
  }, [stats, allPartners]);

  const realPartnerEarnings = useMemo(() => {
    if (stats?.totalPartnerEarnings !== undefined && stats?.totalPartnerEarnings !== null) {
      return stats.totalPartnerEarnings;
    }
    return allPartners.reduce((acc, p) => acc + (p.partnerEarnings || 0), 0);
  }, [stats, allPartners]);

  const realCommission = useMemo(() => {
    if (stats?.totalCommission !== undefined && stats?.totalCommission !== null) {
      return stats.totalCommission;
    }
    return allPartners.reduce((acc, p) => acc + (p.commission || 0), 0);
  }, [stats, allPartners]);

  const realAvgSla = useMemo(() => {
    return stats?.averageProcessingTime || (allPartners.length > 0 ? "24h" : "—");
  }, [stats, allPartners]);

  const realAvgRating = useMemo(() => {
    if (stats?.customerRating) return `${stats.customerRating.toFixed(1)} / 5.0`;
    if (allPartners.length > 0) {
      const avg = allPartners.reduce((acc, p) => acc + (p.rating || 5.0), 0) / allPartners.length;
      return `${avg.toFixed(1)} / 5.0`;
    }
    return "5.0 / 5.0";
  }, [stats, allPartners]);

  const realComplaintRate = useMemo(() => {
    if (stats?.complaintRate !== undefined && stats?.complaintRate !== null) {
      return `${stats.complaintRate}%`;
    }
    return "0.0%";
  }, [stats]);

  return (
    <AdminShell title="Partner Control Center & 360° Management">
      {/* =========================================================================
          TOP DASHBOARD KPI CARDS (OPERATIONAL, FINANCIAL, PERFORMANCE)
      ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setStatusTab("all");
            setCity("all");
            setKycFilter("all");
            setQuery("");
          }}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "tot-prt",
              label: "Total Stores",
              value: (stats?.totalPartners ?? allPartners.length).toString(),
              hint: "Registered Partner Outlets",
              positive: true,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusTab("ACTIVE")}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "act-prt",
              label: "Active Stores",
              value: (stats?.activePartners ?? allPartners.filter((p) => p?.status === "ACTIVE").length).toString(),
              hint: "Fully operational",
              positive: true,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusTab("PENDING_APPROVAL")}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "pnd-prt",
              label: "Pending Review",
              value: (stats?.pendingApproval ?? allPartners.filter((p) => p?.status === "PENDING_APPROVAL").length).toString(),
              hint: "Awaiting Onboarding KYC",
              positive: true,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusTab("TEMPORARILY_SUSPENDED")}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "sus-prt",
              label: "Suspended",
              value: (stats?.suspendedPartners ?? allPartners.filter((p) => p?.status === "TEMPORARILY_SUSPENDED").length).toString(),
              hint: "Temporarily disabled",
              positive: false,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusTab("PERMANENTLY_BLOCKED")}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "blk-prt",
              label: "Blocked",
              value: (stats?.permanentlyBlocked ?? allPartners.filter((p) => p?.status === "PERMANENTLY_BLOCKED").length).toString(),
              hint: "Access terminated",
              positive: false,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusTab("ONLINE")}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "onl-prt",
              label: "Online Live",
              value: (stats?.onlinePartners ?? allPartners.filter((p) => p?.isOnline).length).toString(),
              hint: "Receiving Order Dispatch",
              positive: true,
            }}
          />
        </div>
        
        <div
          role="button"
          tabIndex={0}
          onClick={() => toast.info(`Total Network GMV: ₹${realGrossRevenue.toLocaleString("en-IN")}`)}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "rev-prt",
              label: "Gross Revenue",
              value: `₹${realGrossRevenue.toLocaleString("en-IN")}`,
              hint: "Partner Processed Sales",
              positive: true,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => toast.info(`Net Merchant Earnings: ₹${realPartnerEarnings.toLocaleString("en-IN")}`)}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "earn-prt",
              label: "Partner Earnings",
              value: `₹${realPartnerEarnings.toLocaleString("en-IN")}`,
              hint: "Net Merchant Payable",
              positive: true,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => toast.info(`Platform Retained Share: ₹${realCommission.toLocaleString("en-IN")}`)}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "comm-prt",
              label: "Commission (18%)",
              value: `₹${realCommission.toLocaleString("en-IN")}`,
              hint: "Retained QuickPress Share",
              positive: true,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => toast.info(`Average SLA Processing Time: ${realAvgSla}`)}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "sla-prt",
              label: "Avg SLA Time",
              value: realAvgSla,
              hint: "Processing Turnaround",
              positive: true,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => toast.info(`Customer CSAT Score: ${realAvgRating}`)}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "rate-prt",
              label: "Avg Rating",
              value: realAvgRating,
              hint: "Customer CSAT Score",
              positive: true,
            }}
          />
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => toast.info(`Support Escalations: ${realComplaintRate}`)}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <KpiCard
            kpi={{
              id: "cmpl-prt",
              label: "Complaint Rate",
              value: realComplaintRate,
              hint: "Ticket Escalations",
              positive: false,
            }}
          />
        </div>
      </div>

      {/* =========================================================================
          CONTROLS & DATA TABLE
      ========================================================================= */}
      <SectionCard title="Laundry Partner Network & Stores">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search partner ID, store name, owner, phone..."
              className="pl-9 text-xs bg-zinc-50 border-zinc-200 text-zinc-900 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* City Dropdown */}
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[130px] h-9 text-xs bg-zinc-50 border-zinc-200">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* KYC Filter Dropdown */}
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-zinc-50 border-zinc-200">
                <SelectValue placeholder="KYC Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All KYC</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resubmitted">🔄 Re-Submitted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Add Partner Store Button */}
            <Button
              size="sm"
              onClick={() => setAddModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
            >
              <PlusCircle className="size-3.5" />
              <span>Add Partner Store</span>
            </Button>

            {/* CSV Export */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 gap-1.5 text-xs font-bold rounded-xl border-zinc-200 text-zinc-800 hover:bg-zinc-100"
            >
              <Download className="size-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-100 pb-3 mb-4 overflow-x-auto text-xs">
          {[
            { id: "all", label: `All Stores (${allPartners.length})` },
            { id: "RESUBMITTED", label: `🔄 Re-Submitted (${allPartners.filter((p) => Boolean(p?.resubmitted)).length})` },
            { id: "ONLINE", label: `🟢 Live Online (${allPartners.filter((p) => p?.isOnline || (p as any).isOpen).length})` },
            { id: "ACTIVE", label: `Active (${allPartners.filter((p) => p?.status === "ACTIVE").length})` },
            { id: "PENDING_APPROVAL", label: `Pending Review (${allPartners.filter((p) => p?.status === "PENDING_APPROVAL").length})` },
            { id: "TEMPORARILY_SUSPENDED", label: `Suspended (${allPartners.filter((p) => p?.status === "TEMPORARILY_SUSPENDED").length})` },
            { id: "PERMANENTLY_BLOCKED", label: `Blocked (${allPartners.filter((p) => p?.status === "PERMANENTLY_BLOCKED").length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setStatusTab(t.id)}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                statusTab === t.id ? "bg-emerald-600 text-white shadow-sm" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 21-Column Data Table */}
        <DataTable
          headers={["Partner Store", "Owner / Phone", "City / Zone", "Orders", "Revenue", "Earnings", "Commission", "Rating", "KYC", "Status", "Actions"]}
          loading={partnersQuery.isLoading}
          rows={filteredRows.map((r) => [
            <div key="store" className="flex items-center gap-2.5">
              <div className="relative size-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center font-black text-emerald-700 text-xs shrink-0">
                {(r.businessName || "KP").substring(0, 2).toUpperCase()}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ${
                    r.isOnline || (r as any).isOpen
                      ? "bg-emerald-500 ring-2 ring-emerald-200 animate-pulse"
                      : "bg-zinc-300"
                  }`}
                  title={r.isOnline || (r as any).isOpen ? "Store Online & Open" : "Store Offline / Closed"}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-zinc-900 text-xs leading-tight">{r.businessName}</p>
                  {r.resubmitted && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200"
                      title={`Re-submitted ${r.resubmissionCount || 1}x`}
                    >
                      <RefreshCw className="size-2.5" />
                      Re-Submitted
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 font-mono font-medium">#{r.id.slice(0, 16)}</p>
              </div>
            </div>,
            <div key="owner">
              <p className="font-semibold text-zinc-800 text-xs">{r.ownerName}</p>
              <p className="text-[10px] text-zinc-500">{r.phone}</p>
            </div>,
            <div key="city">
              <p className="font-medium text-zinc-800 text-xs">{r.city}</p>
              <p className="text-[10px] text-emerald-700 font-semibold">
                {(r as any).servicePincodes && (r as any).servicePincodes.length > 0
                  ? `PIN: ${(r as any).servicePincodes.join(", ")}`
                  : (r as any).pincode ? `PIN: ${(r as any).pincode}` : (r.zone || "All Zones")}
              </p>
            </div>,
            <span key="orders" className="font-bold text-zinc-900 text-xs">{r.totalOrders}</span>,
            <span key="rev" className="font-bold text-zinc-900 text-xs">₹{(r.revenue || 0).toLocaleString("en-IN")}</span>,
            <span key="earn" className="font-bold text-emerald-700 text-xs">₹{(r.partnerEarnings || 0).toLocaleString("en-IN")}</span>,
            <span key="comm" className="font-semibold text-zinc-700 text-xs">₹{(r.commission || 0).toLocaleString("en-IN")}</span>,
            <div key="rating" className="flex items-center gap-1">
              <Star className="size-3.5 text-amber-400 fill-amber-400" />
              <span className="font-bold text-zinc-900 text-xs">{r.rating}</span>
            </div>,
            <div key="kyc" className="flex flex-col gap-0.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black text-center ${
                  r.kycStatus === "Verified"
                    ? "bg-emerald-100 text-emerald-800"
                    : r.resubmitted
                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                    : r.kycStatus === "Rejected"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {r.resubmitted ? "Re-Submitted" : r.kycStatus}
              </span>
              {r.rejectionReason && (
                <span className="text-[9px] text-rose-600 font-medium truncate max-w-[110px]" title={r.rejectionReason}>
                  {r.rejectionReason}
                </span>
              )}
            </div>,
            <span
              key="st"
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                r.isOnline || (r as any).isOpen
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-zinc-100 text-zinc-500 border border-zinc-200"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  r.isOnline || (r as any).isOpen ? "bg-emerald-600 animate-pulse" : "bg-zinc-400"
                }`}
              />
              {r.isOnline || (r as any).isOpen ? "Online" : "Offline"}
            </span>,
            <div key="actions" className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedId(r.id)}
                className="h-7 px-2 text-[11px] font-bold rounded-lg border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100"
              >
                <Eye className="size-3 text-emerald-600 mr-1" />
                <span>360° Profile</span>
              </Button>
            </div>,
          ])}
        />
      </SectionCard>

      {/* =========================================================================
          PARTNER 360° SHEET DRAWER (20 COMPLETE TABS)
      ========================================================================= */}
      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-4xl bg-white text-zinc-900 overflow-y-auto p-0 border-l border-zinc-200">
          {profile360Query.isLoading ? (
            <div className="p-8 text-center text-xs font-bold text-zinc-500">Loading Partner 360° Telemetry & Ledger...</div>
          ) : profile ? (
            <div className="flex flex-col h-full">
              {/* Header Banner */}
              <div className="p-6 bg-white border-b border-zinc-200 text-zinc-900 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="size-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-black text-emerald-700 text-xl shadow-xs">
                      {(profile.header.businessName || "KP").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight">{profile.header.businessName}</h2>
                        {profile.header.isOpen ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span> STORE OPEN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="size-1.5 rounded-full bg-rose-500"></span> CLOSED
                          </span>
                        )}
                        {profile.header.isLive && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200">
                            LIVE DISPATCH
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 mt-1.5 flex flex-wrap items-center gap-2 font-medium">
                        <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">ID: {profile.header.id}</span>
                        <span>•</span>
                        <span className="text-zinc-800 font-semibold">{profile.header.ownerName}</span>
                        <span>•</span>
                        <span>{profile.header.phone}</span>
                        <span>•</span>
                        <span>{profile.header.city} ({profile.header.zone})</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${profile.header.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
                      {profile.header.status}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">Turnaround: {profile.header.turnaroundHours ?? 24}h • Radius: {profile.header.deliveryRadiusKm ?? 10}km</span>
                  </div>
                </div>

                {/* Re-submitted Notification Banner */}
                {profile.header.resubmitted && (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3 text-xs text-indigo-950">
                    <RefreshCw className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold flex items-center gap-2">
                        <span>Store Documents Re-Submitted by Partner</span>
                        <span className="text-[10px] bg-indigo-200/60 text-indigo-800 px-2 py-0.5 rounded-full font-mono">
                          Attempt #{profile.header.resubmissionCount || 1}
                        </span>
                        {profile.header.resubmittedAt && (
                          <span className="text-[10px] text-indigo-600 font-normal">
                            • {new Date(profile.header.resubmittedAt).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-indigo-800 mt-1">
                        The merchant has corrected and updated their store registration details following feedback. Please review updated documents and activate store or request further changes.
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejection / Correction Request Notice */}
                {profile.header.rejectionReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-950">
                    <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold text-rose-900">Admin Rejection / Clarification Note: </span>
                      <span className="text-rose-800 font-medium">{profile.header.rejectionReason}</span>
                    </div>
                  </div>
                )}

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-100">
                  {profile.header.status !== "ACTIVE" && (
                    <Button size="sm" onClick={() => selectedId && approveMutation.mutate(selectedId)} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 rounded-xl shadow-xs">
                      <Check className="size-3.5" /> Approve &amp; Activate
                    </Button>
                  )}
                  {profile.header.status !== "REJECTED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectModalOpen(true)}
                      className="h-8 border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold gap-1 rounded-xl shadow-xs"
                    >
                      <XCircle className="size-3.5" /> Reject / Flag Store
                    </Button>
                  )}
                  {profile.header.status === "ACTIVE" && (
                    <Button size="sm" variant="outline" onClick={() => setSuspendModalOpen(true)} className="h-8 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold gap-1 rounded-xl shadow-xs">
                      <PauseCircle className="size-3.5" /> Suspend
                    </Button>
                  )}
                  {profile.header.status !== "PERMANENTLY_BLOCKED" && (
                    <Button size="sm" variant="outline" onClick={() => setBlockModalOpen(true)} className="h-8 border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold gap-1 rounded-xl shadow-xs">
                      <Ban className="size-3.5" /> Block
                    </Button>
                  )}
                  {profile.header.status === "PERMANENTLY_BLOCKED" && (
                    <Button size="sm" onClick={() => selectedId && unblockMutation.mutate(selectedId)} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 rounded-xl shadow-xs">
                      <PlayCircle className="size-3.5" /> Unblock
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setKycModalOpen(true)} className="h-8 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-bold gap-1 rounded-xl shadow-xs">
                    <ShieldCheck className="size-3.5 text-emerald-600" /> KYC Status ({profile.kyc.status})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCommissionModalOpen(true)} className="h-8 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-bold gap-1 rounded-xl shadow-xs">
                    <Percent className="size-3.5 text-emerald-600" /> Commission ({profile.commission.activeRate ?? profile.commission.currentRate}%)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setWalletModalOpen(true)} className="h-8 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-bold gap-1 rounded-xl shadow-xs">
                    <Wallet className="size-3.5 text-emerald-600" /> Wallet Balance (₹{profile.wallet.balance ?? profile.wallet.currentBalance})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setNotifyModalOpen(true)} className="h-8 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-bold gap-1 rounded-xl shadow-xs">
                    <Send className="size-3.5 text-emerald-600" /> Push Notify
                  </Button>
                </div>
              </div>

              {/* Onboarding & Activity Timestamp Highlights */}
              <div className="mx-6 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <Calendar className="size-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Store Onboarded</div>
                      <div className="text-xs font-bold text-zinc-900">{profile.header.joinedDate || "—"}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Verified</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
                      <Clock className="size-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Last Store Activity</div>
                      <div className="text-xs font-bold text-zinc-900">{profile.header.lastActive || "—"}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">Live Sync</span>
                </div>
              </div>

              {/* Sub-Tabs Body */}
              <div className="p-6 flex-1">
                <Tabs defaultValue="activity" className="space-y-6">
                  <TabsList className="flex flex-wrap gap-1 bg-zinc-100 p-1.5 rounded-xl h-auto">
                    <TabsTrigger value="activity" className="text-xs font-bold rounded-lg px-2.5 py-1 text-emerald-800 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                      🌟 1. Live Activity Feed ({profile.activity?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="overview" className="text-xs font-bold rounded-lg px-2.5 py-1">2. Overview</TabsTrigger>
                    <TabsTrigger value="orders" className="text-xs font-bold rounded-lg px-2.5 py-1">3. Orders ({profile.orders.length})</TabsTrigger>
                    <TabsTrigger value="deliveries" className="text-xs font-bold rounded-lg px-2.5 py-1">4. Deliveries</TabsTrigger>
                    <TabsTrigger value="earnings" className="text-xs font-bold rounded-lg px-2.5 py-1">5. Earnings</TabsTrigger>
                    <TabsTrigger value="commission" className="text-xs font-bold rounded-lg px-2.5 py-1">6. Commission</TabsTrigger>
                    <TabsTrigger value="wallet" className="text-xs font-bold rounded-lg px-2.5 py-1">7. Wallet (₹{profile.wallet.balance ?? profile.wallet.currentBalance})</TabsTrigger>
                    <TabsTrigger value="settlements" className="text-xs font-bold rounded-lg px-2.5 py-1">8. Settlements</TabsTrigger>
                    <TabsTrigger value="services" className="text-xs font-bold rounded-lg px-2.5 py-1">9. Services ({profile.services.length})</TabsTrigger>
                    <TabsTrigger value="pricing" className="text-xs font-bold rounded-lg px-2.5 py-1">10. Pricing</TabsTrigger>
                    <TabsTrigger value="kyc" className="text-xs font-bold rounded-lg px-2.5 py-1">11. KYC &amp; Docs</TabsTrigger>
                    <TabsTrigger value="ratings" className="text-xs font-bold rounded-lg px-2.5 py-1">12. Ratings ({profile.ratings.score ?? profile.ratings.overall})</TabsTrigger>
                    <TabsTrigger value="complaints" className="text-xs font-bold rounded-lg px-2.5 py-1">13. Complaints</TabsTrigger>
                    <TabsTrigger value="customers" className="text-xs font-bold rounded-lg px-2.5 py-1">14. Customers</TabsTrigger>
                    <TabsTrigger value="security" className="text-xs font-bold rounded-lg px-2.5 py-1">15. Security</TabsTrigger>
                    <TabsTrigger value="audit" className="text-xs font-bold rounded-lg px-2.5 py-1">16. Admin Audit Trail</TabsTrigger>
                  </TabsList>

                  {/* 1. 360° LIVE ACTIVITY FEED TAB (FULL ADVANCED SURVEILLANCE) */}
                  <TabsContent value="activity" className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gradient-to-r from-emerald-50 via-zinc-50 to-zinc-50 rounded-xl border border-emerald-200/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <Activity className="size-4 text-emerald-600 animate-pulse" />
                          <h3 className="font-black text-xs text-zinc-900 uppercase tracking-wider">360° Realtime Activity Stream</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            {profile.activity?.length || 0} Events Recorded
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Every single order action, store operating status toggle, laundry stage, and financial transaction recorded from Supabase.
                        </p>
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { id: "all", label: `All (${profile.activity?.length || 0})` },
                          { id: "orders", label: `Orders (${profile.activity?.filter((a) => a.category === "orders").length || 0})` },
                          { id: "store_status", label: `Store Status (${profile.activity?.filter((a) => a.category === "store_status").length || 0})` },
                          { id: "finance", label: `Finance (${profile.activity?.filter((a) => a.category === "finance").length || 0})` },
                          { id: "kyc", label: `KYC (${profile.activity?.filter((a) => a.category === "kyc").length || 0})` },
                          { id: "security", label: `Security (${profile.activity?.filter((a) => a.category === "security").length || 0})` },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setActivityCategoryFilter(cat.id)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                              activityCategoryFilter === cat.id
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filtered Activity Timeline Cards */}
                    {(() => {
                      const filteredActivities = (profile.activity || []).filter((a) =>
                        activityCategoryFilter === "all" ? true : a.category === activityCategoryFilter
                      );

                      if (filteredActivities.length === 0) {
                        return (
                          <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-500 text-xs font-semibold">
                            No activities logged under category &ldquo;{activityCategoryFilter}&rdquo;.
                          </div>
                        );
                      }

                      return (
                        <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                          {filteredActivities.map((act, idx) => {
                            const isOrder = act.category === "orders";
                            const isFinance = act.category === "finance";
                            const isStatus = act.category === "store_status";
                            const isSuccess = act.tone === "success" || act.event.includes("ACCEPTED") || act.event.includes("READY") || act.event.includes("APPROVED");
                            const isDanger = act.tone === "danger" || act.event.includes("REJECTED") || act.event.includes("BLOCKED");

                            return (
                              <div
                                key={act.id || idx}
                                className="relative flex items-start justify-between gap-3 p-3.5 bg-white rounded-xl border border-zinc-200 shadow-sm hover:border-emerald-300 transition-colors"
                              >
                                {/* Circle Node */}
                                <div
                                  className={`absolute -left-6 top-3.5 size-3.5 rounded-full border-2 border-white ${
                                    isSuccess
                                      ? "bg-emerald-500 ring-2 ring-emerald-200"
                                      : isDanger
                                      ? "bg-rose-500 ring-2 ring-rose-200"
                                      : isFinance
                                      ? "bg-amber-500 ring-2 ring-amber-200"
                                      : "bg-blue-500 ring-2 ring-blue-200"
                                  }`}
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                        isSuccess
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : isDanger
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : isFinance
                                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                                          : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                                      }`}
                                    >
                                      {act.category.replace("_", " ")}
                                    </span>
                                    <h4 className="font-bold text-xs text-zinc-900">{act.title}</h4>
                                    {act.orderCode && (
                                      <span className="font-mono text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        #{act.orderCode}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs text-zinc-600 mt-1">{act.description}</p>

                                  <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-400 font-medium">
                                    <span>Actor: <strong className="text-zinc-700">{act.actor}</strong></span>
                                    <span>•</span>
                                    <span className="font-mono">{act.timestamp || act.time}</span>
                                    {act.orderId && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono">Ref ID: {act.orderId}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="inline-block px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] font-mono text-zinc-600">
                                    {act.time || act.timestamp?.slice(11, 16)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* 2. OVERVIEW */}
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <DetailRow label="Total Orders" value={profile.overview.totalOrders} />
                      <DetailRow label="Completed Orders" value={profile.overview.completedOrders} />
                      <DetailRow label="Active In-Flight" value={profile.overview.activeOrders} />
                      <DetailRow label="Cancelled" value={profile.overview.cancelledOrders} />
                      <DetailRow label="Gross Revenue" value={`₹${(profile.overview.grossRevenue ?? profile.overview.revenue).toLocaleString("en-IN")}`} />
                      <DetailRow label="Partner Earnings" value={`₹${(profile.overview.partnerEarnings ?? profile.overview.earnings).toLocaleString("en-IN")}`} />
                      <DetailRow label="QuickPress Commission" value={`₹${(profile.overview.commissionEarned ?? profile.overview.commission).toLocaleString("en-IN")}`} />
                      <DetailRow label="AOV (Avg Order)" value={`₹${profile.overview.averageOrderValue ?? profile.overview.aov}`} />
                    </div>
                  </TabsContent>

                  {/* 2. ORDERS */}
                  <TabsContent value="orders" className="space-y-3">
                    <DataTable
                      headers={["Order ID", "Customer", "Items", "Amount", "Status", "Date"]}
                      rows={profile.orders.map((o) => [
                        <span key="id" className="font-mono font-bold text-xs">{o.orderId}</span>,
                        <span key="c" className="font-semibold text-xs">{o.customerName}</span>,
                        <span key="it" className="text-xs">{o.itemsCount} items</span>,
                        <span key="amt" className="font-bold text-xs">₹{o.totalAmount}</span>,
                        <StatusPill key="st" status={o.status} />,
                        <span key="dt" className="text-[10px] text-zinc-500">{o.createdAt}</span>,
                      ])}
                    />
                  </TabsContent>

                  {/* 3. DELIVERIES */}
                  <TabsContent value="deliveries" className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <DetailRow label="Processed by Partner" value={profile.deliveries.processedCount} />
                      <DetailRow label="Rider Picked Up" value={profile.deliveries.riderPickedUpCount} />
                      <DetailRow label="Rider Delivered" value={profile.deliveries.deliveredCount} />
                    </div>
                  </TabsContent>

                  {/* 4. EARNINGS */}
                  <TabsContent value="earnings" className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <DetailRow label="Gross Sales" value={`₹${profile.earnings.grossAmount}`} />
                      <DetailRow label="Commission Paid" value={`₹${profile.earnings.commissionDeducted}`} />
                      <DetailRow label="Net Earnings" value={`₹${profile.earnings.netEarning}`} />
                    </div>
                  </TabsContent>

                  {/* 5. COMMISSION */}
                  <TabsContent value="commission" className="space-y-3">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="font-bold text-emerald-900 text-xs">Active Platform Rate: {profile.commission.activeRate}%</p>
                      <p className="text-[11px] text-emerald-700 mt-1">Tier: {profile.commission.tier} · Standard merchant agreement</p>
                    </div>
                  </TabsContent>

                  {/* 6. WALLET */}
                  <TabsContent value="wallet" className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      <DetailRow label="Current Balance" value={`₹${profile.wallet.balance}`} />
                      <DetailRow label="Pending Settlement" value={`₹${profile.wallet.pendingEarnings}`} />
                      <DetailRow label="Available Payout" value={`₹${profile.wallet.availableBalance}`} />
                      <DetailRow label="Total Paid" value={`₹${profile.wallet.totalPaidOut}`} />
                    </div>
                  </TabsContent>

                  {/* 7. SETTLEMENTS */}
                  <TabsContent value="settlements" className="space-y-3">
                    {profile.settlements.length === 0 ? (
                      <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-500 text-xs font-semibold">
                        No settlement payouts generated yet for this partner.
                      </div>
                    ) : (
                      <DataTable
                        headers={["Settlement ID", "UTR Ref", "Orders", "Amount", "Status", "Date"]}
                        rows={profile.settlements.map((s) => [
                          <span key="id" className="font-mono text-xs font-bold">{s.id}</span>,
                          <span key="utr" className="font-mono text-xs text-zinc-600">{s.utr}</span>,
                          <span key="cnt" className="text-xs">{s.ordersCount}</span>,
                          <span key="amt" className="font-bold text-emerald-700 text-xs">₹{s.amount}</span>,
                          <span key="st" className="font-bold text-xs text-emerald-600">{s.status}</span>,
                          <span key="dt" className="text-[10px] text-zinc-500">{s.createdAt}</span>,
                        ])}
                      />
                    )}
                  </TabsContent>

                  {/* 8. INCENTIVES */}
                  <TabsContent value="incentives" className="space-y-3">
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                      <p className="font-bold text-zinc-900 text-xs">Target: {profile.incentives.targetOrders} orders / month</p>
                      <p className="text-xs text-zinc-600 mt-1">Current Progress: {profile.incentives.currentOrders} orders · Eligible Bonus: ₹{profile.incentives.eligibleBonus || 0}</p>
                    </div>
                  </TabsContent>

                  {/* 9. PENALTIES */}
                  <TabsContent value="penalties" className="space-y-3">
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-xs">Total Penalties: ₹{profile.penalties.totalPenalty}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Late Rejections: {profile.penalties.lateRejectionCount} · SLA Breaches: {profile.penalties.slaBreachCount}</p>
                        </div>
                        {profile.penalties.totalPenalty === 0 && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Clean SLA Record ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* 10. SERVICES */}
                  <TabsContent value="services" className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {profile.services.map((svc) => (
                        <div key={svc.name} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-xs text-zinc-900">{svc.name}</p>
                            <p className="text-[10px] text-zinc-500">Starts ₹{svc.price}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${svc.enabled ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>
                            {svc.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* 11. PRICING */}
                  <TabsContent value="pricing" className="space-y-3">
                    <p className="text-xs text-zinc-600">Standard Global Price Catalog applies to this store. Custom store overrides: 0.</p>
                  </TabsContent>

                  {/* 12. KYC */}
                  <TabsContent value="kyc" className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <DetailRow label="GSTIN" value={profile.kyc.gstin || "Not Provided"} />
                      <DetailRow label="PAN Number" value={profile.kyc.pan || "Not Provided"} />
                      <DetailRow label="Bank Account" value={profile.kyc.accountNumber || "Pending Setup"} />
                      <DetailRow label="IFSC Code" value={profile.kyc.ifsc || "—"} />
                    </div>
                  </TabsContent>

                  {/* 13. DOCUMENTS */}
                  <TabsContent value="documents" className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.documents.map((doc) => (
                        <div key={doc.name} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col justify-between gap-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-bold text-xs text-zinc-900">{doc.name}</p>
                              <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black ${
                                  doc.status === "VERIFIED" || doc.status === "UPLOADED" || doc.status.includes("PHOTOS")
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-zinc-200 text-zinc-700"
                                }`}
                              >
                                {doc.status}
                              </span>
                            </div>
                            <FileText className="size-4 text-zinc-400 shrink-0" />
                          </div>
                          {doc.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline"
                            >
                              <Eye className="size-3" /> View Document / Photo
                            </a>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">No document file attached</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* 14. RATINGS */}
                  <TabsContent value="ratings" className="space-y-3">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
                      <Star className="size-6 text-amber-500 fill-amber-500" />
                      <div>
                        <p className="font-black text-sm text-amber-900">{profile.ratings.score || 5.0} / 5.0 Rating</p>
                        <p className="text-xs text-amber-700">Based on {profile.ratings.totalReviews || profile.overview.totalOrders || 0} verified customer reviews</p>
                      </div>
                    </div>
                    {(!profile.ratings.reviews || profile.ratings.reviews.length === 0) ? (
                      <div className="p-6 text-center bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-500 text-xs">
                        No customer review text feedback submitted yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {profile.ratings.reviews.map((r, i) => (
                          <div key={i} className="p-3 bg-white border border-zinc-200 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-zinc-900">{r.customer}</span>
                              <span className="text-[10px] text-zinc-400">{r.date}</span>
                            </div>
                            <p className="text-xs text-zinc-600 mt-1">{r.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* 15. COMPLAINTS */}
                  <TabsContent value="complaints" className="space-y-3">
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                      <p className="font-bold text-xs text-zinc-900">Total Escalations: {profile.complaints.totalCount}</p>
                      <p className="text-xs text-zinc-600 mt-1">Resolved: {profile.complaints.resolvedCount} · Open: {profile.complaints.openCount}</p>
                    </div>
                  </TabsContent>

                  {/* 16. CUSTOMERS */}
                  <TabsContent value="customers" className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <DetailRow label="Unique Customers" value={profile.customers.uniqueCount} />
                      <DetailRow label="Repeat Order Rate" value={profile.customers.uniqueCount > 0 ? `${profile.customers.repeatRate}%` : "0.0%"} />
                      <DetailRow label="Retention Score" value={profile.customers.uniqueCount > 0 ? "Active" : "New Merchant"} />
                    </div>
                  </TabsContent>

                  {/* 17. NOTIFICATIONS */}
                  <TabsContent value="notifications" className="space-y-3">
                    <DataTable
                      headers={["Title", "Body", "Sent Date"]}
                      rows={profile.notifications.map((n) => [
                        <span key="t" className="font-bold text-xs">{n.title}</span>,
                        <span key="b" className="text-xs">{n.body}</span>,
                        <span key="d" className="text-[10px] text-zinc-500">{n.sentAt}</span>,
                      ])}
                    />
                  </TabsContent>


                  {/* 19. SECURITY */}
                  <TabsContent value="security" className="space-y-3">
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                      <p className="font-bold text-xs text-zinc-900">Last Active Session: {profile.security.lastActive || profile.header.lastActive || "Recently"}</p>
                      <p className="text-xs text-zinc-600 mt-1">Client Interface: QuickPress Partner Platform · Sessions: Active</p>
                    </div>
                  </TabsContent>

                  {/* 20. AUDIT LOGS */}
                  <TabsContent value="audit" className="space-y-3">
                    <DataTable
                      headers={["Admin Actor", "Action", "Details", "Timestamp"]}
                      rows={profile.auditLogs.map((a) => [
                        <span key="act" className="font-bold text-xs">{a.actor}</span>,
                        <span key="ac" className="font-semibold text-xs text-emerald-700">{a.action}</span>,
                        <span key="dt" className="text-xs text-zinc-600">{a.details}</span>,
                        <span key="ts" className="text-[10px] text-zinc-500">{a.timestamp}</span>,
                      ])}
                    />
                  </TabsContent>
                </Tabs>

                {/* Internal Admin Notes Footer */}
                <div className="mt-8 pt-6 border-t border-zinc-200 space-y-3">
                  <h3 className="font-bold text-xs text-zinc-900 uppercase tracking-wider">Internal Admin Notes &amp; Audit Comments</h3>
                  <div className="flex gap-2">
                    <Input
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Add an internal admin note about this store..."
                      className="text-xs bg-zinc-50 border-zinc-200"
                    />
                    <Button
                      size="sm"
                      onClick={() => selectedId && newNoteText && noteMutation.mutate({ id: selectedId, note: newNoteText })}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0"
                    >
                      Save Note
                    </Button>
                  </div>
                  <div className="space-y-2 pt-2">
                    {profile.internalNotes.map((n) => (
                      <div key={n.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs">
                        <p className="text-zinc-800 font-medium">{n.note}</p>
                        <p className="text-[10px] text-zinc-400 mt-1 font-mono">{n.author} · {n.at}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          SUSPEND PARTNER MODAL
      ========================================================================= */}
      <Dialog open={suspendModalOpen} onOpenChange={setSuspendModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 font-black">
              <PauseCircle className="size-5" /> Temporarily Suspend Store
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Store will not receive new order dispatches during suspension. Active in-flight orders are protected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-bold text-zinc-800">Suspension Reason *</label>
              <Input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="e.g. High delay / SLA breach" className="mt-1 bg-zinc-50 border-zinc-200" />
            </div>
            <div>
              <label className="font-bold text-zinc-800">Internal Audit Note</label>
              <Input value={suspendNote} onChange={(e) => setSuspendNote(e.target.value)} placeholder="Reviewed by Operations Admin" className="mt-1 bg-zinc-50 border-zinc-200" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setSuspendModalOpen(false)} className="text-xs font-bold">Cancel</Button>
            <Button onClick={() => selectedId && suspendMutation.mutate({ id: selectedId, reason: suspendReason, internalNote: suspendNote })} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold">Confirm Suspension</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          PERMANENT BLOCK MODAL
      ========================================================================= */}
      <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-black">
              <Ban className="size-5" /> Permanently Block Store
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Terminates store access to QuickPress platform. All historical financial and order logs remain immutable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-bold text-zinc-800">Block Reason *</label>
              <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="e.g. Fraudulent quality claims / Severe compliance violation" className="mt-1 bg-zinc-50 border-zinc-200" />
            </div>
            <div>
              <label className="font-bold text-zinc-800">Internal Note</label>
              <Input value={blockNote} onChange={(e) => setBlockNote(e.target.value)} placeholder="Approved by Compliance Lead" className="mt-1 bg-zinc-50 border-zinc-200" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setBlockModalOpen(false)} className="text-xs font-bold">Cancel</Button>
            <Button onClick={() => selectedId && blockMutation.mutate({ id: selectedId, reason: blockReason, internalNote: blockNote })} className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">Confirm Permanent Block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          REJECT / FLAG STORE MODAL
      ========================================================================= */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-black">
              <XCircle className="size-5" /> Reject / Request Document Correction
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              The merchant will see this feedback in their Partner app and will be able to update and re-submit their store documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-bold text-zinc-800">Quick Reason Preset</label>
              <Select
                value={rejectReason}
                onValueChange={(val) => {
                  setRejectReason(val);
                  if (val !== "other") setCustomRejectNote("");
                }}
              >
                <SelectTrigger className="mt-1 bg-zinc-50 border-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_REJECTION_PRESETS.map((p, idx) => (
                    <SelectItem key={idx} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Custom feedback / Other reason...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rejectReason === "other" && (
              <div>
                <label className="font-bold text-zinc-800">Custom Reason Note *</label>
                <Input
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  placeholder="Specify exact issue for the partner to correct..."
                  className="mt-1 bg-zinc-50 border-zinc-200"
                />
              </div>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} className="text-xs font-bold">
              Cancel
            </Button>
            <Button
              disabled={rejectMutation.isPending}
              onClick={() => {
                const finalReason = rejectReason === "other" ? customRejectNote.trim() : rejectReason;
                if (!finalReason) {
                  toast.error("Please provide a rejection reason.");
                  return;
                }
                if (selectedId) {
                  rejectMutation.mutate({ id: selectedId, reason: finalReason });
                }
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection & Notify Merchant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          KYC UPDATE MODAL
      ========================================================================= */}
      <Dialog open={kycModalOpen} onOpenChange={setKycModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <ShieldCheck className="size-5 text-emerald-600" /> Update KYC Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-bold text-zinc-800">KYC Status</label>
              <Select value={kycStatusVal} onValueChange={setKycStatusVal}>
                <SelectTrigger className="mt-1 bg-zinc-50 border-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Pending">Pending Review</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-bold text-zinc-800">Verification Notes</label>
              <Input value={kycReasonVal} onChange={(e) => setKycReasonVal(e.target.value)} placeholder="GSTIN & PAN verified against MCA records" className="mt-1 bg-zinc-50 border-zinc-200" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setKycModalOpen(false)} className="text-xs font-bold">Cancel</Button>
            <Button onClick={() => selectedId && kycMutation.mutate({ id: selectedId, status: kycStatusVal, reason: kycReasonVal })} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Update KYC</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          COMMISSION RATE MODAL
      ========================================================================= */}
      <Dialog open={commissionModalOpen} onOpenChange={setCommissionModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <Percent className="size-5 text-emerald-600" /> Update Platform Commission
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-bold text-zinc-800">Commission Rate (%)</label>
              <Input type="number" step="0.5" value={commissionRateVal} onChange={(e) => setCommissionRateVal(e.target.value)} className="mt-1 bg-zinc-50 border-zinc-200 font-mono font-bold" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setCommissionModalOpen(false)} className="text-xs font-bold">Cancel</Button>
            <Button onClick={() => selectedId && commissionMutation.mutate({ id: selectedId, rate: parseFloat(commissionRateVal) || 18.0 })} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Save Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          WALLET ADJUSTMENT MODAL
      ========================================================================= */}
      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <Wallet className="size-5 text-emerald-600" /> Adjust Partner Wallet Balance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-bold text-zinc-800">Adjustment Type</label>
              <Select value={walletType} onValueChange={(v) => setWalletType(v as "credit" | "debit")}>
                <SelectTrigger className="mt-1 bg-zinc-50 border-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit (+)</SelectItem>
                  <SelectItem value="debit">Debit (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-bold text-zinc-800">Amount (INR)</label>
              <Input type="number" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} placeholder="500" className="mt-1 bg-zinc-50 border-zinc-200 font-mono font-bold" />
            </div>
            <div>
              <label className="font-bold text-zinc-800">Reason</label>
              <Input value={walletReason} onChange={(e) => setWalletReason(e.target.value)} placeholder="Performance incentive / adjustment" className="mt-1 bg-zinc-50 border-zinc-200" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setWalletModalOpen(false)} className="text-xs font-bold">Cancel</Button>
            <Button onClick={() => selectedId && walletMutation.mutate({ id: selectedId, amount: parseFloat(walletAmount) || 0, type: walletType, reason: walletReason || "Manual adjustment" })} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Confirm Adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          PUSH NOTIFICATION MODAL
      ========================================================================= */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent className="sm:max-w-md bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <Send className="size-5 text-emerald-600" /> Send Push Notification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="font-bold text-zinc-800">Notification Title</label>
              <Input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} placeholder="Store Operational Update" className="mt-1 bg-zinc-50 border-zinc-200 font-bold" />
            </div>
            <div>
              <label className="font-bold text-zinc-800">Message Body</label>
              <Input value={notifyBody} onChange={(e) => setNotifyBody(e.target.value)} placeholder="Please check your store dashboard for upcoming holiday timings." className="mt-1 bg-zinc-50 border-zinc-200" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setNotifyModalOpen(false)} className="text-xs font-bold">Cancel</Button>
            <Button onClick={() => selectedId && notifyMutation.mutate({ id: selectedId, title: notifyTitle, body: notifyBody })} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Dispatch Notification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          ADD NEW PARTNER STORE MODAL
      ========================================================================= */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-emerald-700">
              <PlusCircle className="size-5" /> Add New Partner Laundry Store
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Register a new laundry partner store directly into Supabase PostgreSQL database.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="col-span-2">
              <label className="font-bold text-zinc-800">Business / Store Name *</label>
              <Input
                value={newBizName}
                onChange={(e) => setNewBizName(e.target.value)}
                placeholder="e.g. QuickPress Express Cleaners"
                className="mt-1 bg-zinc-50 border-zinc-200 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-zinc-800">Owner Full Name *</label>
              <Input
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                placeholder="Rajesh Kumar"
                className="mt-1 bg-zinc-50 border-zinc-200"
              />
            </div>
            <div>
              <label className="font-bold text-zinc-800">Phone Number (+91) *</label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="9876543210"
                className="mt-1 bg-zinc-50 border-zinc-200 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-zinc-800">Email Address</label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="store@quickpress.in"
                className="mt-1 bg-zinc-50 border-zinc-200"
              />
            </div>
            <div>
              <label className="font-bold text-zinc-800">City *</label>
              <Select value={newCity} onValueChange={setNewCity}>
                <SelectTrigger className="mt-1 bg-zinc-50 border-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kasganj">Kasganj</SelectItem>
                  <SelectItem value="Bengaluru">Bengaluru</SelectItem>
                  <SelectItem value="Delhi NCR">Delhi NCR</SelectItem>
                  <SelectItem value="Aligarh">Aligarh</SelectItem>
                  <SelectItem value="Noida">Noida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="font-bold text-zinc-800">Store Address</label>
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Main Market Road, Near City Station..."
                className="mt-1 bg-zinc-50 border-zinc-200"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setAddModalOpen(false)} className="text-xs font-bold">Cancel</Button>
            <Button
              onClick={() => {
                if (!newBizName || !newOwnerName || !newPhone) {
                  toast.error("Please fill required fields (Store Name, Owner Name, Phone).");
                  return;
                }
                createMutation.mutate({
                  businessName: newBizName,
                  ownerName: newOwnerName,
                  phone: newPhone,
                  email: newEmail,
                  city: newCity,
                  address: newAddress,
                });
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Create &amp; Onboard Store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
