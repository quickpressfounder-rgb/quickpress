import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  PauseCircle,
  PlayCircle,
  Search,
  X,
  Truck,
  Download,
  Phone,
  MapPin,
  FileCheck,
  FileText,
  Building2,
  User,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Bike,
  Activity,
  Navigation,
  Edit3,
  Save,
  Eye,
  RefreshCw,
  Send,
  Lock,
  RotateCcw,
  Award,
  Star,
  IndianRupee,
  Layers,
  BatteryCharging,
  Radio,
  Smartphone,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  Calendar,
  Trash2,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  PackageCheck,
  Users,
  MessageSquare,
  PlusCircle,
  CheckCircle,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { AdminRiderLiveLocation } from "../components/AdminLiveMap";
import { DataTable, DetailRow, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  fetchRider,
  fetchRiders,
  fetchRiderStats,
  fetchRider360,
  setRiderStatus,
  adjustRiderWallet,
  sendRiderNotification,
  logoutRiderSessions,
  updateRider,
  deleteRider,
  addRiderNote,
  type AdminRider,
  type Rider360Data,
} from "../api/riders";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { onRealtimeEvent } from "../api/core/socket-client";

function formatTimestamp(ts?: string): string {
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

function formatRelativeTime(ts?: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/riders")({
  beforeLoad: requireAdminSession,
  ssr: false,
  head: () => adminHead("Riders Fleet 360° Management", "Real-time fleet tracking, KYC verification, shift intelligence, and dispatch operations."),
  component: RidersPage,
  errorComponent: ({ error }) => (
    <AdminShell title="Rider Control Center">
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-2xl border border-rose-200 m-6">
        <h3 className="text-lg font-bold">Rider Management Loaded</h3>
        <p className="text-xs text-rose-500 mt-1">{String((error as Error)?.message || error)}</p>
        <Button onClick={() => window.location.reload()} className="mt-4 bg-rose-600 text-white font-bold text-xs">
          Reload Page
        </Button>
      </div>
    </AdminShell>
  ),
});

const REJECTION_REASON_PRESETS = [
  { id: "dl_invalid", label: "Driving License (DL) Invalid, Expired or Unclear", docId: "dl" },
  { id: "rc_invalid", label: "Vehicle RC Details Mismatch or Blurry Document", docId: "rc" },
  { id: "aadhaar_blurry", label: "Aadhaar Card Photo or Details Unreadable", docId: "aadhaar" },
  { id: "pan_invalid", label: "PAN Card Verification Failed", docId: "pan" },
  { id: "bank_mismatch", label: "Bank Account Passbook / Cheque Details Mismatch", docId: "bank" },
  { id: "selfie_mismatch", label: "Live Profile Selfie Does Not Match ID Proof", docId: "selfie" },
  { id: "agreement_missing", label: "Partner Agreement & E-Signature Missing / Incomplete", docId: "agreement" },
  { id: "custom", label: "Other Administrative / Regulatory Reason (Custom Note)", docId: "" },
];

const REJECTABLE_DOCUMENTS = [
  { id: "dl", label: "Driving License (DL)" },
  { id: "rc", label: "Vehicle RC Certificate" },
  { id: "aadhaar", label: "Aadhaar Card" },
  { id: "pan", label: "PAN Card" },
  { id: "bank", label: "Bank Passbook / Cheque" },
  { id: "selfie", label: "Live Profile Selfie Photo" },
  { id: "agreement", label: "Partner Agreement & Signature" },
];

export function RidersPage() {
  const queryClient = useQueryClient();
  const ridersQuery = useQuery({ queryKey: ["admin", "riders"], queryFn: fetchRiders, staleTime: 30 * 1000 });
  const statsQuery = useQuery({ queryKey: ["admin", "riders", "stats"], queryFn: fetchRiderStats, staleTime: 30 * 1000 });

  // URL query parameter synchronization (?id=...)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("id");
      return p || null;
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (selectedId) {
        url.searchParams.set("id", selectedId);
      } else {
        url.searchParams.delete("id");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [selectedId]);

  // Real-time fleet synchronization
  useEffect(() => {
    const unsubStatus = onRealtimeEvent("rider.status_changed", (payload) => {
      console.log("[AdminRiders] Realtime status event:", payload);
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    });
    const unsubOnline = onRealtimeEvent("rider.online_status", () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", selectedId] });
    });
    const unsubLoc = onRealtimeEvent("location.updated", () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
    });
    return () => {
      unsubStatus();
      unsubOnline();
      unsubLoc();
    };
  }, [queryClient, selectedId]);

  // Filtering & Search state for Directory
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [area, setArea] = useState("all");
  const [actionQueue, setActionQueue] = useState<"all" | "new" | "resubmitted" | "blocked" | "flagged">("all");
  const [dateRange, setDateRange] = useState("today");
  const [showDayWiseReport, setShowDayWiseReport] = useState(false);
  const [vehicleType, setVehicleType] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "trips" | "rating" | "wallet">("newest");
  const [activeTab, setActiveTab] = useState("all");

  const allRiders = ridersQuery.data ?? [];
  const stats = statsQuery.data;

  // Selected Rider 360 Query
  const rider360Query = useQuery({
    queryKey: ["admin", "riders", "360", selectedId],
    queryFn: () => (selectedId ? fetchRider360(selectedId) : null),
    enabled: Boolean(selectedId),
    staleTime: 60 * 1000,
  });

  const data360 = rider360Query.data;

  const selectedRider: AdminRider | null = useMemo(() => {
    if (!selectedId) return null;
    const found = allRiders.find((r) => r.id === selectedId);
    if (found) return found;
    if (data360?.profile) return data360.profile;
    return null;
  }, [selectedId, allRiders, data360]);

  // Dedicated 360 Full-Page States
  const [detailTab, setDetailTab] = useState("kyc");
  const [isEditing, setIsEditing] = useState(false);
  type RiderEditFormState = {
    fullName: string;
    phone: string;
    email: string;
    city: string;
    vehicleType: string;
    vehicleNumber: string;
    bankName: string;
    accountLast4: string;
    ifsc: string;
  };
  const [editForm, setEditForm] = useState<RiderEditFormState>({
    fullName: "",
    phone: "",
    email: "",
    city: "",
    vehicleType: "",
    vehicleNumber: "",
    bankName: "",
    accountLast4: "",
    ifsc: "",
  });

  // Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string; subtitle?: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Dialog states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("dl_invalid");
  const [rejectReasonNote, setRejectReasonNote] = useState("Driving License (DL) is invalid, expired, or photo is unclear. Please re-upload a valid license.");
  const [rejectedDocsSelected, setRejectedDocsSelected] = useState<string[]>(["dl"]);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  // Wallet Adjust state
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [isCodSettlement, setIsCodSettlement] = useState(false);

  // Notification state
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");

  // Notes state
  const [newNoteText, setNewNoteText] = useState("");

  // Populate edit form when selectedRider loads
  useEffect(() => {
    if (selectedRider) {
      setEditForm({
        fullName: selectedRider.name || "",
        phone: selectedRider.phone || "",
        email: selectedRider.email || "",
        city: selectedRider.city || "",
        vehicleType: selectedRider.vehicle || "",
        vehicleNumber: selectedRider.plate || "",
        bankName: selectedRider.bankName || "",
        accountLast4: selectedRider.accountLast4 || "",
        ifsc: selectedRider.ifsc || "",
      });
    }
  }, [selectedRider]);

  // Mutations
  const decideMutation = useMutation({
    mutationFn: ({
      id,
      action,
      reason,
      rejectedDocuments,
    }: {
      id: string;
      action: "approve" | "reject" | "suspend" | "activate";
      reason?: string;
      rejectedDocuments?: string[];
    }) => setRiderStatus(id, action, reason, rejectedDocuments),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.action === "approve"
          ? "🎉 Rider Approved & Activated!"
          : vars.action === "reject"
          ? "❌ Application Rejected & Notification Dispatched"
          : `Rider ${vars.action}d successfully!`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: () => toast.error("Failed to update rider status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRider(id),
    onSuccess: () => {
      toast.success("Rider deleted successfully!");
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "riders", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: () => toast.error("Failed to delete rider."),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => updateRider(selectedId!, payload),
    onSuccess: () => {
      toast.success("Rider profile details updated successfully! 🎉");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", selectedId] });
    },
    onError: () => toast.error("Failed to update rider profile."),
  });

  const walletMutation = useMutation({
    mutationFn: ({ amount, reason, isCod }: { amount: number; reason: string; isCod: boolean }) =>
      adjustRiderWallet(selectedId!, amount, reason, isCod),
    onSuccess: (res) => {
      toast.success(`Wallet adjusted successfully! New Balance: ₹${res.newBalance.toFixed(2)}`);
      setWalletModalOpen(false);
      setWalletAmount("");
      setWalletReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "riders"] });
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", selectedId] });
    },
    onError: () => toast.error("Failed to adjust rider wallet."),
  });

  const notifMutation = useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) => sendRiderNotification(selectedId!, title, body),
    onSuccess: () => {
      toast.success("Push notification dispatched to Captain's device! 📲");
      setNotifyModalOpen(false);
      setNotifTitle("");
      setNotifBody("");
    },
    onError: () => toast.error("Failed to dispatch push notification."),
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutRiderSessions(selectedId!),
    onSuccess: () => {
      toast.success("All active rider app sessions invalidated!");
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", selectedId] });
    },
    onError: () => toast.error("Failed to invalidate rider sessions."),
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => addRiderNote(id, note),
    onSuccess: () => {
      toast.success("Admin note appended to immutable ledger!");
      setNewNoteText("");
      if (selectedId) queryClient.invalidateQueries({ queryKey: ["admin", "riders", "360", selectedId] });
    },
    onError: () => toast.error("Failed to save admin note."),
  });

  // KPIs
  const metrics = useMemo(() => {
    const total = stats?.totalFleet ?? allRiders.length;
    const online = stats?.onlineFleet ?? allRiders.filter((r) => r.live === "Online" || r.live === "On delivery").length;
    const busy = stats?.onDelivery ?? allRiders.filter((r) => r.live === "On delivery").length;
    const available = stats?.availableDispatch ?? Math.max(0, online - busy);
    const kycVer = stats?.kycVerified ?? allRiders.filter((r) => r.kyc === "Verified").length;
    const totalPayouts = stats?.totalEarningsPaid ?? allRiders.reduce((acc, r) => acc + (r.walletRaw || 0), 0);
    return { total, online, busy, available, kycVer, totalPayouts };
  }, [allRiders, stats]);

  const cities = useMemo(
    () => Array.from(new Set(allRiders.map((r) => r.city).filter(Boolean))),
    [allRiders],
  );

  // Zones / areas filter based on selected city
  const availableZones = useMemo(() => {
    const set = new Set<string>();
    allRiders.forEach((r) => {
      if (city === "all" || r.city.toLowerCase() === city.toLowerCase()) {
        if (r.zone) set.add(r.zone);
      }
    });
    return Array.from(set).filter(Boolean);
  }, [allRiders, city]);

  // Priority Action Queue counts
  const actionCounts = useMemo(() => {
    let newReq = 0;
    let resub = 0;
    let blocked = 0;
    let flagged = 0;

    allRiders.forEach((r) => {
      const s = (r.status as string) || "";
      const k = (r.kyc as string) || "";
      if (s === "Pending" || k === "Pending") {
        newReq++;
      }
      if (r.resubmitted) {
        resub++;
      }
      if (s === "Suspended") {
        blocked++;
      }
      if (
        k === "Rejected" ||
        Boolean(r.rejectionReason) ||
        (parseFloat(r.rating) > 0 && parseFloat(r.rating) < 3.5) ||
        (r.codCashRaw || 0) > 5000
      ) {
        flagged++;
      }
    });

    return { newReq, resub, blocked, flagged };
  }, [allRiders]);

  interface RiderQueueReadState {
    new?: boolean;
    resubmitted?: boolean;
    blocked?: boolean;
    flagged?: boolean;
  }

  const [readQueues, setReadQueues] = useState<RiderQueueReadState>(() => {
    try {
      const saved = localStorage.getItem("qp_riders_read_queues");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleQueueRead = (queueKey: keyof RiderQueueReadState, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReadQueues((prev) => {
      const next: RiderQueueReadState = { ...prev, [queueKey]: !prev[queueKey] };
      try {
        localStorage.setItem("qp_riders_read_queues", JSON.stringify(next));
      } catch {}
      if (next[queueKey]) {
        toast.success("Rider queue marked as read & acknowledged");
      } else {
        toast.info("Rider queue marked as unread");
      }
      return next;
    });
  };

  const markAllQueuesRead = () => {
    const allRead: RiderQueueReadState = {
      new: true,
      resubmitted: true,
      blocked: true,
      flagged: true,
    };
    setReadQueues(allRead);
    try {
      localStorage.setItem("qp_riders_read_queues", JSON.stringify(allRead));
    } catch {}
    toast.success("All rider fleet queues marked as read & acknowledged");
  };

  const resetAllQueuesRead = () => {
    setReadQueues({});
    try {
      localStorage.removeItem("qp_riders_read_queues");
    } catch {}
    toast.info("Rider queues reset to unread");
  };

  const unreadQueuesCount = useMemo(() => {
    let cnt = 0;
    if (!readQueues.new && actionCounts.newReq > 0) cnt++;
    if (!readQueues.resubmitted && actionCounts.resub > 0) cnt++;
    if (!readQueues.blocked && actionCounts.blocked > 0) cnt++;
    if (!readQueues.flagged && actionCounts.flagged > 0) cnt++;
    return cnt;
  }, [readQueues, actionCounts]);

  // Filtered riders strictly by City & Area (Zone)
  const cityAreaRiders = useMemo(() => {
    return allRiders.filter((r) => {
      if (city !== "all" && r.city.toLowerCase() !== city.toLowerCase()) return false;
      if (area !== "all" && r.zone.toLowerCase() !== area.toLowerCase()) return false;
      return true;
    });
  }, [allRiders, city, area]);

  // Performance and telemetry metrics for selected City & Area
  const cityAreaMetrics = useMemo(() => {
    const totalFleet = cityAreaRiders.length;
    const onlineToday = cityAreaRiders.filter((r) => r.live === "Online" || r.live === "On delivery").length;
    const onDelivery = cityAreaRiders.filter((r) => r.live === "On delivery").length;
    const availableDispatch = Math.max(0, onlineToday - onDelivery);
    const totalTrips = cityAreaRiders.reduce((acc, r) => acc + (r.trips || 0), 0);
    const totalEarnings = cityAreaRiders.reduce((acc, r) => acc + (r.walletRaw || 0), 0);
    const totalCodHeld = cityAreaRiders.reduce((acc, r) => acc + (r.codCashRaw || 0), 0);
    const newSignups = cityAreaRiders.filter((r) => {
      const reg = r.registrationTimestamp || r.joinedOn || "";
      return reg.includes(new Date().toISOString().slice(0, 10)) || r.status === "Pending";
    }).length;
    const flaggedCount = cityAreaRiders.filter((r) => {
      const s = (r.status as string) || "";
      const k = (r.kyc as string) || "";
      return (
        s === "Suspended" ||
        k === "Rejected" ||
        Boolean(r.rejectionReason) ||
        (r.codCashRaw || 0) > 5000
      );
    }).length;

    return {
      totalFleet,
      onlineToday,
      onDelivery,
      availableDispatch,
      totalTrips,
      totalEarnings,
      totalCodHeld,
      newSignups,
      flaggedCount,
    };
  }, [cityAreaRiders]);

  // Day-wise report breakdown generation for Riders
  const dayWiseReportData = useMemo(() => {
    const days = [
      { label: "Today (Live)", offset: 0, mult: 1.0 },
      { label: "Yesterday", offset: 1, mult: 0.86 },
      { label: "23 Sep 2026", offset: 2, mult: 0.92 },
      { label: "22 Sep 2026", offset: 3, mult: 0.80 },
      { label: "21 Sep 2026", offset: 4, mult: 0.95 },
      { label: "20 Sep 2026", offset: 5, mult: 0.76 },
      { label: "19 Sep 2026", offset: 6, mult: 0.88 },
    ];

    const baseEarnings = cityAreaMetrics.totalEarnings > 0 ? cityAreaMetrics.totalEarnings : 24000;
    const baseTrips = cityAreaMetrics.totalTrips > 0 ? cityAreaMetrics.totalTrips : 180;
    const baseActive =
      cityAreaMetrics.onlineToday > 0
        ? cityAreaMetrics.onlineToday
        : Math.max(1, Math.round(cityAreaMetrics.totalFleet * 0.6));

    return days.map((d) => {
      const dayEarnings = Math.round((baseEarnings / 7) * d.mult);
      const dayCod = Math.round(dayEarnings * 0.7);
      const dayTrips = Math.max(1, Math.round((baseTrips / 7) * d.mult));
      const activePilots = Math.max(1, Math.round(baseActive * (0.85 + d.mult * 0.15)));
      const newPilots = d.offset === 0 ? cityAreaMetrics.newSignups : d.offset === 1 ? 2 : 1;

      return {
        date: d.label,
        territory: `${city === "all" ? "All Fleet" : city}${area !== "all" ? ` • ${area}` : ""}`,
        activePilots,
        dayTrips,
        dayEarnings,
        dayCod,
        newPilots,
        flagged: d.offset === 0 ? cityAreaMetrics.flaggedCount : 0,
      };
    });
  }, [city, area, cityAreaMetrics]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = allRiders.filter((r) => {
      const matchesQuery =
        !q ||
        [r.id, r.name, r.phone, r.email, r.plate, r.vehicle, r.city, r.zone]
          .join(" ")
          .toLowerCase()
          .includes(q);

      // Priority Action Queue Filter
      const s = (r.status as string) || "";
      const k = (r.kyc as string) || "";
      if (actionQueue === "new") {
        if (!(s === "Pending" || k === "Pending")) return false;
      } else if (actionQueue === "resubmitted") {
        if (!r.resubmitted) return false;
      } else if (actionQueue === "blocked") {
        if (s !== "Suspended") return false;
      } else if (actionQueue === "flagged") {
        if (
          !(
            k === "Rejected" ||
            Boolean(r.rejectionReason) ||
            (parseFloat(r.rating) > 0 && parseFloat(r.rating) < 3.5) ||
            (r.codCashRaw || 0) > 5000
          )
        )
          return false;
      }

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "online" && (r.live === "Online" || r.live === "On delivery")) ||
        (activeTab === "delivery" && r.live === "On delivery") ||
        (activeTab === "offline" && r.live === "Offline") ||
        (activeTab === "pending" && r.status === "Pending") ||
        (activeTab === "suspended" && r.status === "Suspended");

      const matchesCity = city === "all" || r.city.toLowerCase() === city.toLowerCase();
      const matchesArea = area === "all" || r.zone.toLowerCase() === area.toLowerCase();
      const matchesVehicle = vehicleType === "all" || r.vehicle.toLowerCase().includes(vehicleType.toLowerCase());
      const matchesKyc = kycFilter === "all" || r.kyc.toLowerCase() === kycFilter.toLowerCase();

      return matchesQuery && matchesTab && matchesCity && matchesArea && matchesVehicle && matchesKyc;
    });

    if (sortBy === "trips") {
      filtered.sort((a, b) => b.trips - a.trips);
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (sortBy === "wallet") {
      filtered.sort((a, b) => (b.walletRaw || 0) - (a.walletRaw || 0));
    } else {
      filtered.sort((a, b) => (b.registrationTimestamp || "").localeCompare(a.registrationTimestamp || ""));
    }

    return filtered;
  }, [allRiders, query, city, area, actionQueue, vehicleType, kycFilter, activeTab, sortBy]);

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error("No rider records to export.");
      return;
    }
    const headers = [
      "Rider ID",
      "Name",
      "Phone",
      "Email",
      "City",
      "Zone",
      "Vehicle",
      "Plate Number",
      "Trips Completed",
      "Rating",
      "Wallet Balance",
      "COD Cash In Hand",
      "Live State",
      "KYC Status",
      "Account Status",
      "First Registered",
      "Last Login",
    ];
    const csvRows = [headers.join(",")];
    for (const r of rows) {
      csvRows.push(
        [
          `"${r.id}"`,
          `"${r.name}"`,
          `"${r.phone}"`,
          `"${r.email}"`,
          `"${r.city}"`,
          `"${r.zone}"`,
          `"${r.vehicle}"`,
          `"${r.plate}"`,
          `"${r.trips}"`,
          `"${r.rating}"`,
          `"${r.wallet}"`,
          `"${r.codCash}"`,
          `"${r.live}"`,
          `"${r.kyc}"`,
          `"${r.status}"`,
          `"${r.registrationTimestamp}"`,
          `"${r.lastLoginTimestamp}"`,
        ].join(","),
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Fleet_Riders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Master Fleet CSV exported successfully! 🚀");
  };

  return (
    <AdminShell
      title={
        selectedId
          ? selectedRider
            ? `${selectedRider.name} — Captain 360° Profile`
            : "Rider Fleet 360° Profile"
          : "Riders & Delivery Fleet 360° Management"
      }
      {...(!selectedId
        ? {
            subtitle: "Fleet onboarding, real-time GPS telemetry, KYC verification, shift attendance, and dispatch operations.",
            actions: (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    ridersQuery.refetch();
                    statsQuery.refetch();
                    toast.success("Fleet telemetry refreshed!");
                  }}
                  disabled={ridersQuery.isRefetching}
                  className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                >
                  <RefreshCw className={`size-3.5 mr-1.5 ${ridersQuery.isRefetching ? "animate-spin" : ""}`} />
                  <span>Refresh Data</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-8 rounded-xl bg-zinc-900 px-3.5 text-xs font-bold text-white hover:bg-zinc-800 shadow-xs"
                >
                  <Download className="size-3.5 mr-1.5" />
                  <span>Export Fleet CSV</span>
                </Button>
              </div>
            ),
          }
        : {})}
    >
      {/* =========================================================================
          VIEW A: DEDICATED FULL-PAGE RIDER 360 PROFILE (SAME PARTNER FULL-PAGE ARCHITECTURE)
      ========================================================================= */}
      {selectedId ? (
        <div className="space-y-4 pb-12 animate-in fade-in duration-150">
          {/* Top Bar with Back Button & Breadcrumbs */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedId(null)}
                className="gap-2 font-bold text-xs rounded-xl border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 h-8 shadow-xs"
              >
                <ArrowLeft className="size-4 text-emerald-600" />
                <span>Back to Riders Directory</span>
              </Button>
              <div className="h-4 w-px bg-zinc-200 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                <span>Riders</span>
                <ChevronRight className="size-3 text-zinc-400" />
                <span className="font-bold text-zinc-900">{selectedRider?.name || selectedId}</span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-zinc-400">
              Live Fleet Telemetry: <span className="text-emerald-600 font-bold">Active</span>
            </div>
          </div>

          {rider360Query.isLoading ? (
            <div className="p-20 text-center text-xs font-bold text-zinc-500 bg-white rounded-2xl border border-zinc-200 shadow-xs">
              <RefreshCw className="size-7 text-emerald-600 animate-spin mx-auto mb-3" />
              Loading Complete Rider 360° Profile &amp; KYC Verification Telemetry...
            </div>
          ) : selectedRider ? (
            <div className="space-y-4">
              {/* 1. Header Card (Clean, Compact, Avatar with Click-to-Zoom Lightbox) */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Avatar + Title & Meta */}
                  <div className="flex items-center gap-3.5">
                    <div
                      className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-black text-sm shadow-md overflow-hidden shrink-0 group cursor-pointer"
                      onClick={() => {
                        const src =
                          selectedRider.profilePhoto ||
                          data360?.kyc?.documents?.find((d) => d.id === "selfie")?.documentUrl;
                        if (src) setLightboxImage({ src, title: `${selectedRider.name} — Captain Profile Photo` });
                      }}
                    >
                      {selectedRider.profilePhoto ||
                      data360?.kyc?.documents?.find((d) => d.id === "selfie")?.documentUrl ? (
                        <img
                          src={
                            selectedRider.profilePhoto ||
                            data360?.kyc?.documents?.find((d) => d.id === "selfie")?.documentUrl
                          }
                          alt={selectedRider.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <span>{selectedRider.name.slice(0, 2).toUpperCase()}</span>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white ${
                          selectedRider.live === "Online"
                            ? "bg-emerald-500 ring-2 ring-emerald-200 animate-pulse"
                            : selectedRider.live === "On delivery"
                            ? "bg-sky-500 ring-2 ring-sky-200 animate-ping"
                            : "bg-zinc-400"
                        }`}
                        title={selectedRider.live}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-zinc-900 tracking-tight">{selectedRider.name}</h2>
                        <StatusPill value={selectedRider.status} />
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            selectedRider.live === "Online"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : selectedRider.live === "On delivery"
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              selectedRider.live === "Online"
                                ? "bg-emerald-600"
                                : selectedRider.live === "On delivery"
                                ? "bg-sky-600"
                                : "bg-zinc-400"
                            }`}
                          />
                          {selectedRider.live}
                        </span>
                        {selectedRider.resubmitted && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <RotateCcw className="size-2.5 text-indigo-600 animate-spin" />
                            <span>Re-Submitted</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap mt-1">
                        <span className="font-mono text-zinc-400">UID: #{selectedRider.id}</span>
                        <span>·</span>
                        <a
                          href={`tel:${selectedRider.phone}`}
                          className="font-mono text-zinc-700 font-bold hover:text-emerald-600 transition-colors flex items-center gap-1"
                        >
                          <Phone className="size-3 text-emerald-600" />
                          {selectedRider.phone}
                        </a>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-rose-500" />
                          {selectedRider.city} ({selectedRider.zone})
                        </span>
                        <span>·</span>
                        <span className="font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md">
                          🏍️ {selectedRider.vehicle || "Motorbike"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={isEditing ? "default" : "outline"}
                      onClick={() => setIsEditing(!isEditing)}
                      className={`h-8 rounded-xl text-xs font-bold ${
                        isEditing ? "bg-zinc-900 text-white" : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      <Edit3 className="size-3.5 mr-1.5" />
                      <span>{isEditing ? "View 360°" : "Edit Profile"}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setWalletModalOpen(true)}
                      className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                    >
                      <IndianRupee className="size-3.5 mr-1 text-emerald-600" />
                      <span>Adjust Wallet</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setNotifyModalOpen(true)}
                      className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                    >
                      <Send className="size-3.5 mr-1 text-sky-600" />
                      <span>Push Alert</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm("Invalidate all active mobile sessions for this Captain?")) {
                          logoutMutation.mutate();
                        }
                      }}
                      disabled={logoutMutation.isPending}
                      className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                      title="Force logout all mobile devices"
                    >
                      <Lock className="size-3.5 mr-1 text-amber-600" />
                      <span>Logout Sessions</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Permanently delete rider ${selectedRider.name} (#${selectedRider.id})? This cannot be undone.`)) {
                          deleteMutation.mutate(selectedRider.id);
                        }
                      }}
                      className="h-8 w-8 p-0 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Permanently Delete Rider"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 2. Verification & Approval Banner */}
              <div
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-xs border transition-all ${
                  selectedRider.status === "Active"
                    ? "bg-emerald-50/80 border-emerald-200 text-slate-900"
                    : selectedRider.status === "Suspended"
                    ? "bg-rose-50/80 border-rose-200 text-slate-900"
                    : "bg-amber-50/80 border-amber-200 text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl font-bold text-sm shrink-0 border ${
                      selectedRider.status === "Active"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : selectedRider.status === "Suspended"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    {selectedRider.status === "Active" ? (
                      <ShieldCheck className="size-5" />
                    ) : selectedRider.status === "Suspended" ? (
                      <ShieldAlert className="size-5" />
                    ) : (
                      <AlertTriangle className="size-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black tracking-wider uppercase text-slate-900">
                        {selectedRider.status === "Active"
                          ? "VERIFIED FLEET CAPTAIN"
                          : selectedRider.resubmitted
                          ? "APPLICATION RE-SUBMITTED (UPDATED KYC)"
                          : selectedRider.status === "Suspended"
                          ? "APPLICATION REJECTED / SUSPENDED"
                          : "KYC VERIFICATION PENDING"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                          selectedRider.kyc === "Verified"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : selectedRider.kyc === "Rejected"
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}
                      >
                        KYC: {selectedRider.kyc}
                      </span>
                      {selectedRider.resubmitted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1 shadow-2xs">
                          <RotateCcw className="size-3 text-indigo-700 animate-spin" />
                          <span>Re-Submitted by Candidate</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium mt-0.5">
                      {selectedRider.status === "Active"
                        ? "Captain account is verified and fully active for live dispatch and daily earnings."
                        : selectedRider.resubmitted
                        ? `🔄 Captain has re-filled and updated registration details${selectedRider.resubmittedAt ? ` on ${new Date(selectedRider.resubmittedAt).toLocaleString("en-IN")}` : ""}. Review revised documents below and approve.`
                        : data360?.kyc.rejectionReason
                        ? `Admin Reason: ${data360.kyc.rejectionReason}`
                        : "Review all uploaded KYC documents below and approve or reject with a reason note."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {selectedRider.status === "Active" ? (
                    <>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs">
                        <CheckCircle2 className="size-3.5 text-emerald-700" />
                        <span>Account Active & Approved</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8.5 rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50 active:scale-95 font-bold text-xs transition-all shadow-2xs"
                        onClick={() => {
                          setSelectedPreset("custom");
                          setRejectReasonNote("Account temporarily suspended by fleet operations.");
                          setRejectedDocsSelected([]);
                          setRejectModalOpen(true);
                        }}
                      >
                        <PauseCircle className="size-3.5 mr-1 text-rose-600" />
                        Suspend
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="h-8.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-sm transition-all"
                        onClick={() => setApproveConfirmOpen(true)}
                      >
                        <Check className="size-3.5 mr-1" />
                        Approve Rider ✅
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8.5 rounded-xl border-rose-300 bg-white text-rose-700 hover:bg-rose-50 active:scale-95 font-bold text-xs transition-all shadow-2xs"
                        onClick={() => {
                          setSelectedPreset("dl_invalid");
                          setRejectReasonNote("Driving License (DL) is invalid, expired, or photo is unclear. Please re-upload a valid license.");
                          setRejectedDocsSelected(["dl"]);
                          setRejectModalOpen(true);
                        }}
                      >
                        <X className="size-3.5 mr-1 text-rose-600" />
                        Reject Application ❌
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Prominent Timestamps Highlight Banner (Same Partner Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1">
                    <Calendar className="size-3" />
                    First Registered / Onboarded
                  </span>
                  <p className="font-mono text-xs font-black text-sky-950">
                    {formatTimestamp(selectedRider.registrationTimestamp)}
                  </p>
                  <span className="inline-block text-[10px] font-bold text-sky-600 bg-sky-100/70 px-1.5 py-0.5 rounded">
                    {formatRelativeTime(selectedRider.registrationTimestamp)}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1">
                    <ShieldCheck className="size-3 text-teal-600" />
                    Account Approved Timestamp
                  </span>
                  <p className="font-mono text-xs font-black text-teal-950">
                    {formatTimestamp(selectedRider.approvedAt || (selectedRider.status === "Active" ? selectedRider.registrationTimestamp : undefined))}
                  </p>
                  <span className="inline-block text-[10px] font-bold text-teal-700 bg-teal-100/70 px-1.5 py-0.5 rounded">
                    {selectedRider.status === "Active" ? `Approved by: ${selectedRider.approvedBy || "Operations Team"}` : "Pending Verification"}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <Activity className="size-3 text-emerald-600" />
                    Last Active / Live Ping
                  </span>
                  <p className="font-mono text-xs font-black text-emerald-950">
                    {formatTimestamp(selectedRider.lastLoginTimestamp)}
                  </p>
                  <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                    {formatRelativeTime(selectedRider.lastLoginTimestamp)}
                  </span>
                </div>
              </div>

              {/* 4. Dedicated Vehicle & Registration Plate Card (360 View Highlight) */}
              <div className="rounded-2xl border border-zinc-200 bg-gradient-to-r from-amber-500/10 via-zinc-50 to-white p-4 text-xs shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-900 border border-amber-500/30 shadow-xs">
                      <Bike className="size-6 text-amber-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-zinc-900 capitalize flex items-center gap-1.5">
                          {selectedRider.vehicle || "Motorbike (Two-Wheeler)"}
                        </span>
                        <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                          Active Dispatch Asset
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {data360?.vehicle.vehicleModel && data360.vehicle.vehicleModel !== "—"
                          ? data360.vehicle.vehicleModel
                          : ((data360?.vehicle as any)?.vehicleBrand || "Two-Wheeler Fleet Asset")}
                      </p>
                    </div>
                  </div>

                  {/* Authentic Indian Number Plate Badge */}
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                      REGISTRATION NUMBER PLATE
                    </span>
                    {selectedRider.plate && selectedRider.plate !== "—" && !selectedRider.plate.toLowerCase().includes("pending") ? (
                      <div className="mt-1 flex items-center overflow-hidden rounded-md border-2 border-zinc-900 bg-amber-300 font-mono text-sm font-black tracking-wider text-zinc-950 shadow-xs">
                        <span className="bg-blue-700 px-2 py-0.5 text-[10px] font-black text-white">
                          IND
                        </span>
                        <span className="px-2.5 py-0.5 font-black">
                          {selectedRider.plate}
                        </span>
                      </div>
                    ) : (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                        Verification Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 5. Quick Metrics Counter */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Orders Delivered</p>
                  <p className="text-xl font-black text-zinc-900 mt-1">{selectedRider.trips}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Lifetime completed trips</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Customer Rating</p>
                  <p className="text-xl font-black text-amber-600 mt-1">★ {selectedRider.rating}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Average customer score</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Earnings Balance</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">{selectedRider.wallet}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Available for payout</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">COD Cash In Hand</p>
                  <p className="text-xl font-black text-amber-700 mt-1">{selectedRider.codCash}</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">To be settled by rider</p>
                </div>
              </div>

              {/* 6. Admin Edit Form OR 6 Structured Tabs */}
              {isEditing ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4 shadow-xs">
                  <h4 className="text-sm font-black uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                    <Edit3 className="size-4 text-emerald-600" />
                    <span>Edit Rider Profile &amp; Vehicle Specs</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Full Name</label>
                      <Input
                        value={editForm.fullName || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                        className="h-10 text-xs bg-zinc-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Phone Number</label>
                      <Input
                        value={editForm.phone || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                        className="h-10 text-xs bg-zinc-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Email Address</label>
                      <Input
                        value={editForm.email || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                        className="h-10 text-xs bg-zinc-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Operating City</label>
                      <Input
                        value={editForm.city || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                        className="h-10 text-xs bg-zinc-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Vehicle Category</label>
                      <Input
                        value={editForm.vehicleType || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, vehicleType: e.target.value }))}
                        className="h-10 text-xs bg-zinc-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Vehicle Number Plate</label>
                      <Input
                        value={editForm.vehicleNumber || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, vehicleNumber: e.target.value.toUpperCase() }))}
                        className="h-10 text-xs bg-zinc-50 font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Beneficiary Bank Name</label>
                      <Input
                        value={editForm.bankName || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, bankName: e.target.value }))}
                        className="h-10 text-xs bg-zinc-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Account Last 4 Digits</label>
                      <Input
                        value={editForm.accountLast4 || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, accountLast4: e.target.value }))}
                        className="h-10 text-xs bg-zinc-50 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700">Bank IFSC Code</label>
                      <Input
                        value={editForm.ifsc || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                        className="h-10 text-xs bg-zinc-50 font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <Button
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold h-10 px-6 text-white shadow-xs"
                      onClick={() => updateMutation.mutate(editForm)}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="size-4 mr-2" />
                      {updateMutation.isPending ? "Saving Profile..." : "Save Profile Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl border-zinc-200 text-zinc-700 text-xs font-bold h-10 px-6"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* The 6 Comprehensive 360° Tabs (Identical to Partner Page Architecture) */
                <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-zinc-200 p-1.5 shadow-xs overflow-x-auto">
                    <TabsList className="bg-zinc-100/80 p-1 rounded-xl w-full flex justify-start gap-1">
                      <TabsTrigger
                        value="kyc"
                        className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs rounded-lg py-2"
                      >
                        <ShieldCheck className="size-3.5" />
                        <span>KYC &amp; Photos ({data360?.kyc?.documents?.length || 0})</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="orders"
                        className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs rounded-lg py-2"
                      >
                        <Truck className="size-3.5" />
                        <span>Total Orders ({data360?.trips?.length || selectedRider.trips})</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="earnings"
                        className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs rounded-lg py-2"
                      >
                        <IndianRupee className="size-3.5" />
                        <span>Earnings, Wallet &amp; Payouts</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="tracking"
                        className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs rounded-lg py-2"
                      >
                        <Navigation className="size-3.5" />
                        <span>Live GPS &amp; Shift Logs</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="vehicle"
                        className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs rounded-lg py-2"
                      >
                        <Bike className="size-3.5" />
                        <span>Vehicle &amp; Fleet Specs</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="audit"
                        className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs rounded-lg py-2"
                      >
                        <Lock className="size-3.5" />
                        <span>Admin Audit &amp; Notes</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* =========================================================================
                      TAB 1: KYC DOCUMENTS & PHOTO VERIFICATION CENTER
                  ========================================================================= */}
                  <TabsContent value="kyc" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-zinc-200 shadow-xs">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                          <ShieldCheck className="size-4 text-emerald-600" />
                          <span>KYC Verification &amp; Document Photo Inspection Desk</span>
                        </h4>
                        <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                          Click any photo card to preview in full-screen high-resolution lightbox with zoom and rotate controls.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedRider.status === "Active" ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs">
                            <CheckCircle2 className="size-3.5 text-emerald-700" />
                            <span>All Documents Verified</span>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                              onClick={() => setApproveConfirmOpen(true)}
                            >
                              <Check className="size-3.5 mr-1" />
                              Approve All Docs
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                              onClick={() => {
                                setSelectedPreset("dl_invalid");
                                setRejectReasonNote("Driving License (DL) is invalid, expired, or photo is unclear. Please re-upload a valid license.");
                                setRejectedDocsSelected(["dl"]);
                                setRejectModalOpen(true);
                              }}
                            >
                              <X className="size-3.5 mr-1 text-rose-600" />
                              Reject / Flag Docs
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {selectedRider.kyc === "Rejected" && (
                      <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-rose-950">
                          <AlertCircle className="size-4 text-rose-600 shrink-0" />
                          <span>Application Currently Flagged / Rejected by Admin</span>
                        </p>
                        <p className="text-rose-800 font-medium">
                          Reason: {data360?.kyc.rejectionReason || "One or more documents uploaded are invalid or unclear."}
                        </p>
                      </div>
                    )}

                    {/* Grid of Documents */}
                    {(!data360?.kyc.documents || data360.kyc.documents.length === 0) ? (
                      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center space-y-2">
                        <FileCheck className="size-10 mx-auto text-zinc-300" />
                        <p className="text-xs font-bold text-zinc-700">No KYC Documents Uploaded</p>
                        <p className="text-[11px] text-zinc-400">The delivery captain has not submitted verification documents yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data360.kyc.documents.map((doc) => {
                          const isDocRejected =
                            doc.status === "Rejected" ||
                            (data360.kyc.rejectedDocuments || []).includes(doc.id) ||
                            (doc.id.startsWith("dl") && (data360.kyc.rejectedDocuments || []).includes("dl")) ||
                            (doc.id.startsWith("rc") && (data360.kyc.rejectedDocuments || []).includes("rc")) ||
                            (doc.id.startsWith("aadhaar") && (data360.kyc.rejectedDocuments || []).includes("aadhaar"));
                          const docStatus = isDocRejected ? "Rejected" : doc.status;

                          return (
                            <div
                              key={doc.id}
                              className={`rounded-2xl border overflow-hidden bg-white shadow-2xs transition-all ${
                                isDocRejected
                                  ? "border-rose-300 ring-1 ring-rose-200"
                                  : "border-zinc-200 hover:border-zinc-300 hover:shadow-md"
                              }`}
                            >
                              <div
                                onClick={() => {
                                  if (doc.documentUrl) {
                                    setLightboxImage({
                                      src: doc.documentUrl,
                                      title: doc.name,
                                      subtitle: `${doc.type} · Captain: ${selectedRider.name}`,
                                    });
                                    setZoomLevel(1);
                                    setRotation(0);
                                  }
                                }}
                                className="h-44 bg-zinc-100 relative group overflow-hidden cursor-pointer"
                              >
                                {doc.documentUrl ? (
                                  <img
                                    src={doc.documentUrl}
                                    alt={doc.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                                    <FileCheck className="size-10 mb-1" />
                                    <span className="text-[11px] font-bold">Image Preview Pending</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <span className="text-slate-900 text-xs font-bold flex items-center gap-1.5 bg-white/95 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-md">
                                    <Eye className="size-4 text-emerald-600" /> Click to Inspect High-Res
                                  </span>
                                </div>
                                <span className="absolute top-2.5 right-2.5">
                                  <StatusPill value={docStatus} />
                                </span>
                              </div>

                              <div className="p-3.5 space-y-2.5">
                                <div>
                                  <p className="text-xs font-black text-zinc-900">{doc.type}</p>
                                  <p className="font-mono text-[10px] text-zinc-500 mt-0.5">{doc.name}</p>
                                  {(doc as any).documentNumber && (doc as any).documentNumber !== "—" && (
                                    <p className="font-mono text-[11px] font-bold text-emerald-700 mt-0.5">
                                      {(doc as any).documentNumber}
                                    </p>
                                  )}
                                </div>

                                {isDocRejected && (
                                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-[10px] text-rose-800">
                                    <p className="font-bold text-rose-950 flex items-center gap-1">
                                      <AlertCircle className="size-3 text-rose-600" />
                                      <span>Flagged as Invalid</span>
                                    </p>
                                    <p className="mt-0.5 leading-snug">
                                      {doc.rejectionReason || data360.kyc.rejectionReason || "Document requires re-upload"}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-7.5 rounded-lg text-xs font-bold border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                                    onClick={() => {
                                      if (doc.documentUrl) {
                                        setLightboxImage({
                                          src: doc.documentUrl,
                                          title: doc.name,
                                          subtitle: `${doc.type} · Captain: ${selectedRider.name}`,
                                        });
                                        setZoomLevel(1);
                                        setRotation(0);
                                      }
                                    }}
                                  >
                                    <Eye className="size-3 mr-1" /> View Full
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7.5 px-2.5 rounded-lg text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50"
                                    onClick={() => {
                                      let docKey = "dl";
                                      if (doc.id.includes("rc")) docKey = "rc";
                                      else if (doc.id.includes("aadhaar")) docKey = "aadhaar";
                                      else if (doc.id.includes("pan")) docKey = "pan";
                                      else if (doc.id.includes("selfie")) docKey = "selfie";
                                      else if (doc.id.includes("bank") || doc.id.includes("cheque") || doc.id.includes("passbook")) docKey = "bank";
                                      else if (doc.id.includes("agreement") || doc.id.includes("signature")) docKey = "agreement";

                                      setSelectedPreset(docKey === "dl" ? "dl_invalid" : docKey === "rc" ? "rc_invalid" : docKey === "aadhaar" ? "aadhaar_blurry" : "custom");
                                      setRejectReasonNote(`${doc.type} is invalid or unclear. Please re-upload a clear and valid document.`);
                                      setRejectedDocsSelected([docKey]);
                                      setRejectModalOpen(true);
                                    }}
                                  >
                                    <X className="size-3 mr-1 text-rose-600" /> Flag
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* A-to-Z Dossier: Personal & Identity Information */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                          <User className="size-4 text-indigo-600" />
                          <span>Candidate Identity &amp; Contact Dossier (A-to-Z)</span>
                        </h4>
                        <span className="text-[10px] font-mono font-bold text-zinc-400">UID: #{selectedRider.id}</span>
                      </div>
                      <DetailRow label="Full Legal Name" value={<span className="font-bold text-zinc-900">{data360?.personal?.fullName || selectedRider.name}</span>} />
                      <DetailRow label="Mobile Phone" value={<a href={`tel:${data360?.personal?.phone || selectedRider.phone}`} className="font-mono font-bold text-emerald-700 hover:underline">{data360?.personal?.phone || selectedRider.phone}</a>} />
                      <DetailRow label="Email Address" value={<span className="font-mono">{data360?.personal?.email || selectedRider.email || "—"}</span>} />
                      <DetailRow label="Father / Guardian Name" value={data360?.personal?.fatherName || (selectedRider.raw as any)?.fatherName || "—"} />
                      <DetailRow label="Date of Birth (DOB)" value={data360?.personal?.dob || (selectedRider.raw as any)?.dob || "—"} />
                      <DetailRow label="Gender" value={data360?.personal?.gender || (selectedRider.raw as any)?.gender || "—"} />
                      <DetailRow label="Residential Address" value={<span className="font-medium">{data360?.personal?.address || (selectedRider.raw as any)?.address || "—"}</span>} />
                      <DetailRow label="Operating City & Zone" value={`${data360?.personal?.city || selectedRider.city} (${selectedRider.zone})`} />
                      <DetailRow label="Postal PIN Code" value={<span className="font-mono font-bold">{data360?.personal?.pincode || (selectedRider.raw as any)?.pincode || "—"}</span>} />
                      <DetailRow label="Emergency Contact Person" value={data360?.personal?.emergencyContactName || (selectedRider.raw as any)?.emergencyContactName || "—"} />
                      <DetailRow label="Emergency Contact Phone" value={<span className="font-mono">{data360?.personal?.emergencyContactPhone || (selectedRider.raw as any)?.emergencyContactPhone || "—"}</span>} />
                      <DetailRow label="Registration Date" value={formatTimestamp(selectedRider.registrationTimestamp)} />
                    </div>
                  </TabsContent>

                  {/* =========================================================================
                      TAB 2: TOTAL ORDERS & DELIVERIES (ORDER LEDGER)
                  ========================================================================= */}
                  <TabsContent value="orders" className="space-y-4">
                    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                            <Truck className="size-4 text-emerald-600" />
                            <span>Complete Order Delivery Ledger ({data360?.trips?.length || 0})</span>
                          </h4>
                          <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                            Real historical record of all customer pickup and drop deliveries dispatched to this Captain.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-200 overflow-hidden">
                        <div className="divide-y divide-zinc-100">
                          {(!data360?.trips || data360.trips.length === 0) ? (
                            <div className="p-8 text-center text-xs text-zinc-400">No delivery trips recorded yet.</div>
                          ) : (
                            data360.trips.map((trip) => (
                              <div key={trip.id} className="p-4 flex items-center justify-between text-xs hover:bg-zinc-50 transition-colors">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-zinc-900 font-mono text-sm">{trip.orderCode}</span>
                                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                                      {trip.service}
                                    </span>
                                    <StatusPill value={trip.status} />
                                  </div>
                                  <p className="text-xs text-zinc-700 font-medium">Customer: <strong>{trip.customer}</strong> · Store: <strong>{trip.partner}</strong></p>
                                  <p className="text-[11px] text-zinc-500">Drop: {trip.dropAddress} ({trip.distanceKm} km)</p>
                                  <p className="text-[10px] text-zinc-400 font-mono">Delivered: {formatTimestamp(trip.deliveredAt)}</p>
                                </div>
                                <div className="text-right space-y-1">
                                  <p className="font-mono text-base font-black text-emerald-600">+₹{trip.earning.toFixed(2)}</p>
                                  {trip.tip > 0 && <p className="text-[10px] font-bold text-amber-700">Tip: +₹{trip.tip.toFixed(2)}</p>}
                                  <span className="text-xs text-amber-600 font-black">★ {trip.rating.toFixed(1)}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* =========================================================================
                      TAB 3: EARNINGS, WALLET & PAYOUTS
                  ========================================================================= */}
                  <TabsContent value="earnings" className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Live Earnings Balance</p>
                        <p className="text-3xl font-black text-emerald-950 mt-1">{selectedRider.wallet}</p>
                        <p className="text-xs text-emerald-700 mt-1 font-medium">Accumulated delivery earnings eligible for weekly bank payout.</p>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">COD Cash In Hand</p>
                        <p className="text-3xl font-black text-amber-950 mt-1">{selectedRider.codCash}</p>
                        <p className="text-xs text-amber-700 mt-1 font-medium">Cash collected from customers to be settled by Captain.</p>
                      </div>
                    </div>

                    {/* Beneficiary Bank Account */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-700 mb-2 flex items-center gap-1.5">
                        <Building2 className="size-4 text-emerald-600" />
                        <span>Registered Beneficiary Bank Account</span>
                      </h4>
                      <DetailRow label="Bank Name" value={selectedRider.bankName} />
                      <DetailRow label="Account Number" value={selectedRider.accountLast4 !== "—" ? `•••• •••• ${selectedRider.accountLast4}` : "—"} />
                      <DetailRow label="IFSC Code" value={<span className="font-mono font-bold text-zinc-900">{selectedRider.ifsc}</span>} />
                      <DetailRow label="UPI ID / VPA" value={<span className="font-mono font-bold text-sky-700">{selectedRider.upiId}</span>} />
                    </div>

                    {/* Recent Bank Payout Settlements */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800">Bank Payout Transfers Ledger</h4>
                      <div className="rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                        {(!data360?.payouts.payoutHistory || data360.payouts.payoutHistory.length === 0) ? (
                          <div className="p-8 text-center text-xs text-zinc-400">No bank settlements recorded yet.</div>
                        ) : (
                          data360.payouts.payoutHistory.map((p) => (
                            <div key={p.id} className="p-3.5 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-zinc-900 text-sm">₹{p.amount.toFixed(2)}</p>
                                <p className="font-mono text-[10px] text-zinc-400 mt-0.5">UTR / Ref: {p.utrNumber}</p>
                                <p className="text-[10px] text-zinc-500">{formatTimestamp(p.processedAt)}</p>
                              </div>
                              <StatusPill value={p.status} />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* =========================================================================
                      TAB 4: LIVE GPS TRACKING & SHIFT LOGS
                  ========================================================================= */}
                  <TabsContent value="tracking" className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                            <Navigation className="size-4 text-sky-600" />
                            <span>Real-Time Live GPS Telemetry Fix</span>
                          </h4>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Assigned Hub: <strong>{data360?.overview.assignedHub || "QuickPress Kasganj Main Hub"}</strong> · Zone: <strong>{data360?.overview.serviceZone || selectedRider.zone}</strong>
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                            selectedRider.live === "Online"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : selectedRider.live === "On delivery"
                              ? "bg-sky-50 text-sky-700 border border-sky-200 animate-pulse"
                              : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                          }`}
                        >
                          <span
                            className={`size-2 rounded-full ${
                              selectedRider.live === "Online" ? "bg-emerald-600" : selectedRider.live === "On delivery" ? "bg-sky-600" : "bg-zinc-400"
                            }`}
                          />
                          Duty State: {selectedRider.live}
                        </span>
                      </div>

                      <div className="rounded-xl overflow-hidden border border-zinc-200">
                        <AdminRiderLiveLocation riderId={selectedRider.id} />
                      </div>
                    </div>

                    {/* Duty Shift Logs */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800">Shift Attendance Logs</h4>
                      <div className="rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
                        {(!data360?.shifts || data360.shifts.length === 0) ? (
                          <div className="p-8 text-center text-xs text-zinc-400">No duty shifts recorded yet.</div>
                        ) : (
                          data360.shifts.map((s, idx) => (
                            <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-zinc-900">{s.date}</p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                  {s.loginAt} — {s.logoutAt} ({s.onlineHours} hrs on duty)
                                </p>
                              </div>
                              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-bold border border-emerald-200">
                                {s.ordersCompleted} Orders Completed
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* =========================================================================
                      TAB 5: VEHICLE & FLEET ASSET SPECS
                  ========================================================================= */}
                  <TabsContent value="vehicle" className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                          <Truck className="size-4 text-amber-600" />
                          <span>Vehicle &amp; Fleet Asset Specifications</span>
                        </h4>
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                          {data360?.vehicle.vehicleType || selectedRider.vehicle}
                        </span>
                      </div>
                      <DetailRow label="Vehicle Category" value={data360?.vehicle.vehicleType || selectedRider.vehicle} />
                      <DetailRow label="Vehicle Make &amp; Model" value={data360?.vehicle.vehicleModel || "—"} />
                      <DetailRow
                        label="Registration Plate (IND)"
                        value={
                          selectedRider.plate && selectedRider.plate !== "—" ? (
                            <div className="inline-flex items-center overflow-hidden rounded border border-zinc-900 bg-amber-300 font-mono text-xs font-black tracking-wider text-zinc-950 px-2 py-0.5">
                              <span className="bg-blue-700 px-1 py-0.2 text-[9px] text-white mr-1 rounded-2xs">IND</span>
                              {selectedRider.plate}
                            </div>
                          ) : (
                            <span className="text-amber-700 font-bold">Plate Verification Pending</span>
                          )
                        }
                      />
                      <DetailRow label="Manufacture Year" value={data360?.vehicle.vehicleYear || "—"} />
                      <DetailRow label="Fuel / Power Type" value={data360?.vehicle.fuelType || "Petrol"} />
                      <DetailRow label="Vehicle Color" value={data360?.vehicle.vehicleColor || "—"} />
                      <DetailRow label="Driving License (DL) Number" value={<span className="font-mono font-bold text-zinc-900">{data360?.vehicle.drivingLicenseNumber || "—"}</span>} />
                      <DetailRow label="Vehicle RC Certificate No." value={<span className="font-mono font-bold text-zinc-900">{data360?.vehicle.rcNumber || "—"}</span>} />
                      <DetailRow label="Insurance Policy Valid Upto" value={data360?.vehicle.insuranceExpiry || "—"} />
                      <DetailRow label="Pollution (PUC) Valid Upto" value={data360?.vehicle.pollutionExpiry || "—"} />
                    </div>
                  </TabsContent>

                  {/* =========================================================================
                      TAB 6: SECURITY, SESSIONS & ADMIN AUDIT NOTES
                  ========================================================================= */}
                  <TabsContent value="audit" className="space-y-4">
                    {/* Add Admin Note Form */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                        <MessageSquare className="size-4 text-emerald-600" />
                        <span>Append Internal Admin Note</span>
                      </h4>
                      <Textarea
                        rows={3}
                        placeholder="Log internal notes regarding document verification, phone interview, background check, or disciplinary actions..."
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="text-xs bg-zinc-50 border-zinc-200 resize-none rounded-xl"
                      />
                      <Button
                        size="sm"
                        disabled={!newNoteText.trim() || noteMutation.isPending}
                        onClick={() => noteMutation.mutate({ id: selectedId!, note: newNoteText })}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-9 px-4"
                      >
                        <PlusCircle className="size-3.5 mr-1.5" />
                        {noteMutation.isPending ? "Saving Note..." : "Save Admin Note"}
                      </Button>
                    </div>

                    {/* Immutable Admin Notes History */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800">Internal Admin Notes Ledger</h4>
                      <div className="space-y-2">
                        {((data360?.profile as any)?.internalNotes || []).length === 0 ? (
                          <div className="p-6 text-center text-xs text-zinc-400">No internal admin notes recorded yet.</div>
                        ) : (
                          ((data360?.profile as any)?.internalNotes || []).map((note: any, idx: number) => (
                            <div key={idx} className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs space-y-1">
                              <p className="text-zinc-800 font-medium">{note.note}</p>
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-1 border-t border-zinc-200/50">
                                <span>Author: {note.author || "Admin"}</span>
                                <span>{formatTimestamp(note.at)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Device & Session Security Audit */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-800 mb-2">Device &amp; Session Telemetry</h4>
                      <DetailRow label="Device Model" value={data360?.security.deviceInfo || "—"} />
                      <DetailRow label="App Build Version" value={data360?.security.appVersion || "QuickPress Captain v2.4"} />
                      <DetailRow label="IP Address" value={<span className="font-mono">{data360?.security.ipAddress || "—"}</span>} />
                      <DetailRow label="Registered On" value={formatTimestamp(selectedRider.registrationTimestamp)} />
                      <DetailRow label="Last Active Ping" value={formatTimestamp(selectedRider.lastLoginTimestamp)} />

                      <div className="pt-3">
                        <Button
                          variant="outline"
                          className="w-full rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold h-10"
                          onClick={() => logoutMutation.mutate()}
                          disabled={logoutMutation.isPending}
                        >
                          <Lock className="size-4 mr-1.5" />
                          {logoutMutation.isPending ? "Logging out..." : "Force Logout All Active Devices"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        /* =========================================================================
            VIEW B: RIDERS MASTER FLEET DIRECTORY
        ========================================================================= */
        <div className="space-y-6">
          {/* 1. TOP KPI STATS SUMMARY BAR */}
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
            <div
              onClick={() => {
                setActiveTab("all");
                setCity("all");
                setVehicleType("all");
                setKycFilter("all");
                setQuery("");
              }}
              className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <KpiCard
                kpi={{
                  id: "tot-rdr",
                  label: "Total Fleet Strength",
                  value: metrics.total.toLocaleString("en-IN"),
                  hint: "Registered delivery partners",
                  positive: true,
                }}
              />
            </div>
            <div
              onClick={() => setActiveTab("online")}
              className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <KpiCard
                kpi={{
                  id: "onl-rdr",
                  label: "Online Right Now",
                  value: metrics.online.toLocaleString("en-IN"),
                  hint: `${metrics.total ? Math.round((metrics.online / metrics.total) * 100) : 0}% fleet logged in`,
                  positive: true,
                }}
              />
            </div>
            <div
              onClick={() => setActiveTab("delivery")}
              className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <KpiCard
                kpi={{
                  id: "busy-rdr",
                  label: "On Active Delivery",
                  value: metrics.busy.toLocaleString("en-IN"),
                  hint: "Orders in transit",
                  positive: true,
                }}
              />
            </div>
            <div
              onClick={() => setActiveTab("online")}
              className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <KpiCard
                kpi={{
                  id: "avail-rdr",
                  label: "Available Dispatch",
                  value: metrics.available.toLocaleString("en-IN"),
                  hint: "Ready for auto-assignment",
                  positive: true,
                }}
              />
            </div>
            <div
              onClick={() => setKycFilter("pending")}
              className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <KpiCard
                kpi={{
                  id: "kyc-rdr",
                  label: "KYC Verified",
                  value: metrics.kycVer.toLocaleString("en-IN"),
                  hint: `${metrics.total ? Math.round((metrics.kycVer / metrics.total) * 100) : 0}% compliance verified`,
                  positive: true,
                }}
              />
            </div>
            <div className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <KpiCard
                kpi={{
                  id: "pay-rdr",
                  label: "Total Fleet Earnings",
                  value: `₹${metrics.totalPayouts.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                  hint: "Cumulative disbursements",
                  positive: true,
                }}
              />
            </div>
          </div>

          {/* =========================================================================
              PRIORITY ACTION CENTER (ACTION AREA: NEW, RESUBMITTED, BLOCKED, FRAUD)
          ========================================================================= */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="relative flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Sparkles className="size-4.5" />
                  {unreadQueuesCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-2.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black tracking-tight text-zinc-900">
                      Priority Action Center
                    </h3>
                    <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      Rider Queues
                    </span>
                    {unreadQueuesCount === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                        <Check className="size-3 text-emerald-600" /> All Queues Read
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-900 px-2.5 py-0.5 text-[10px] font-bold text-white font-mono">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {unreadQueuesCount} Queues Need Review
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 font-medium">
                    Immediate fleet onboarding, DL/RC approvals, cash holds, and safety intervention items
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {unreadQueuesCount > 0 ? (
                  <button
                    type="button"
                    onClick={markAllQueuesRead}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-2xs transition-all hover:border-emerald-300 hover:bg-emerald-50/80 hover:text-emerald-800 active:scale-95 cursor-pointer"
                    title="Mark all rider queues as read"
                  >
                    <CheckCheck className="size-3.5 text-emerald-600" />
                    <span>Mark All as Read</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resetAllQueuesRead}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-100 active:scale-95 cursor-pointer"
                    title="Reset read status"
                  >
                    <Check className="size-3.5" />
                    <span>All Read · Reset</span>
                  </button>
                )}

                {actionQueue !== "all" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActionQueue("all")}
                    className="h-8 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 active:scale-95"
                  >
                    <RotateCcw className="size-3.5 mr-1" />
                    Reset Queue Filter
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. New Requests */}
              <div
                onClick={() => setActionQueue(actionQueue === "new" ? "all" : "new")}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                  actionQueue === "new"
                    ? "bg-emerald-50/20 border-emerald-500 shadow-xs ring-1.5 ring-emerald-500/25"
                    : "bg-white hover:bg-zinc-50/50 border-zinc-200/80 hover:border-emerald-400 hover:shadow-xs"
                } ${readQueues.new ? "opacity-75 bg-zinc-50/60" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-black shadow-2xs">
                        📥
                      </div>
                      <div>
                        <span className="text-xs font-black text-zinc-900 block">New Requests</span>
                        <span className="text-[10px] text-zinc-400 font-medium">Onboarding Queue</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {readQueues.new ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Check className="size-2.5" /> Read
                        </span>
                      ) : actionCounts.newReq > 0 ? (
                        <span className="flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-black font-mono text-white shadow-2xs">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {actionCounts.newReq}
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold font-mono text-zinc-500">
                          0
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Awaiting driver's license, RC, background check &amp; initial onboarding audit.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-zinc-100">
                  <span className={`text-[11px] font-bold ${actionQueue === "new" ? "text-emerald-700 underline" : "text-emerald-600 group-hover:text-emerald-700 group-hover:underline"}`}>
                    {actionQueue === "new" ? "✓ Filter Active" : "Review pending pilots →"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => toggleQueueRead("new", e)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all border ${
                      readQueues.new
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                    title={readQueues.new ? "Mark as unread" : "Mark as read"}
                  >
                    {readQueues.new ? "✓ Read" : "Mark Read"}
                  </button>
                </div>
              </div>

              {/* 2. Re-Submitted */}
              <div
                onClick={() => setActionQueue(actionQueue === "resubmitted" ? "all" : "resubmitted")}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                  actionQueue === "resubmitted"
                    ? "bg-emerald-50/20 border-emerald-500 shadow-xs ring-1.5 ring-emerald-500/25"
                    : "bg-white hover:bg-zinc-50/50 border-zinc-200/80 hover:border-emerald-400 hover:shadow-xs"
                } ${readQueues.resubmitted ? "opacity-75 bg-zinc-50/60" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-black shadow-2xs">
                        🔄
                      </div>
                      <div>
                        <span className="text-xs font-black text-zinc-900 block">Re-Submitted</span>
                        <span className="text-[10px] text-zinc-400 font-medium">Re-audit Queue</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {readQueues.resubmitted ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Check className="size-2.5" /> Read
                        </span>
                      ) : actionCounts.resub > 0 ? (
                        <span className="flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-black font-mono text-white shadow-2xs">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {actionCounts.resub}
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold font-mono text-zinc-500">
                          0
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Corrected identity or vehicle proof re-uploaded by pilot after rejection note.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-zinc-100">
                  <span className={`text-[11px] font-bold ${actionQueue === "resubmitted" ? "text-emerald-700 underline" : "text-emerald-600 group-hover:text-emerald-700 group-hover:underline"}`}>
                    {actionQueue === "resubmitted" ? "✓ Filter Active" : "Review re-submissions →"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => toggleQueueRead("resubmitted", e)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all border ${
                      readQueues.resubmitted
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                    title={readQueues.resubmitted ? "Mark as unread" : "Mark as read"}
                  >
                    {readQueues.resubmitted ? "✓ Read" : "Mark Read"}
                  </button>
                </div>
              </div>

              {/* 3. Blocked / Suspended */}
              <div
                onClick={() => setActionQueue(actionQueue === "blocked" ? "all" : "blocked")}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                  actionQueue === "blocked"
                    ? "bg-emerald-50/20 border-emerald-500 shadow-xs ring-1.5 ring-emerald-500/25"
                    : "bg-white hover:bg-zinc-50/50 border-zinc-200/80 hover:border-emerald-400 hover:shadow-xs"
                } ${readQueues.blocked ? "opacity-75 bg-zinc-50/60" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-black shadow-2xs">
                        🚫
                      </div>
                      <div>
                        <span className="text-xs font-black text-zinc-900 block">Blocked / Suspended</span>
                        <span className="text-[10px] text-zinc-400 font-medium">Compliance Queue</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {readQueues.blocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Check className="size-2.5" /> Read
                        </span>
                      ) : actionCounts.blocked > 0 ? (
                        <span className="flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-black font-mono text-white shadow-2xs">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {actionCounts.blocked}
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold font-mono text-zinc-500">
                          0
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Pilots on disciplinary suspension, zero-tolerance infractions or permanent ban.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-zinc-100">
                  <span className={`text-[11px] font-bold ${actionQueue === "blocked" ? "text-emerald-700 underline" : "text-emerald-600 group-hover:text-emerald-700 group-hover:underline"}`}>
                    {actionQueue === "blocked" ? "✓ Filter Active" : "Manage suspended pilots →"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => toggleQueueRead("blocked", e)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all border ${
                      readQueues.blocked
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                    title={readQueues.blocked ? "Mark as unread" : "Mark as read"}
                  >
                    {readQueues.blocked ? "✓ Read" : "Mark Read"}
                  </button>
                </div>
              </div>

              {/* 4. Fraud / Flagged */}
              <div
                onClick={() => setActionQueue(actionQueue === "flagged" ? "all" : "flagged")}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                  actionQueue === "flagged"
                    ? "bg-emerald-50/20 border-emerald-500 shadow-xs ring-1.5 ring-emerald-500/25"
                    : "bg-white hover:bg-zinc-50/50 border-zinc-200/80 hover:border-emerald-400 hover:shadow-xs"
                } ${readQueues.flagged ? "opacity-75 bg-zinc-50/60" : ""}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-black shadow-2xs">
                        ⚠️
                      </div>
                      <div>
                        <span className="text-xs font-black text-zinc-900 block">Fraud / Flagged</span>
                        <span className="text-[10px] text-zinc-400 font-medium">Risk Queue</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {readQueues.flagged ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <Check className="size-2.5" /> Read
                        </span>
                      ) : actionCounts.flagged > 0 ? (
                        <span className="flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-black font-mono text-white shadow-2xs">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {actionCounts.flagged}
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold font-mono text-zinc-500">
                          0
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Excessive COD cash held (&gt; ₹5,000), rejected KYC, or critical safety alerts.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between pt-2.5 border-t border-zinc-100">
                  <span className={`text-[11px] font-bold ${actionQueue === "flagged" ? "text-emerald-700 underline" : "text-emerald-600 group-hover:text-emerald-700 group-hover:underline"}`}>
                    {actionQueue === "flagged" ? "✓ Filter Active" : "Audit flagged accounts →"}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => toggleQueueRead("flagged", e)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all border ${
                      readQueues.flagged
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                    title={readQueues.flagged ? "Mark as unread" : "Mark as read"}
                  >
                    {readQueues.flagged ? "✓ Read" : "Mark Read"}
                  </button>
                </div>
              </div>
            </div>

            {/* Active Queue Filter Banner */}
            {actionQueue !== "all" && (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    Active Queue: Showing{" "}
                    <strong className="text-emerald-300">
                      {rows.length}{" "}
                      {actionQueue === "new"
                        ? "New Pilot Registration Requests"
                        : actionQueue === "resubmitted"
                        ? "Re-submitted Pilot Documents"
                        : actionQueue === "blocked"
                        ? "Suspended Pilots"
                        : "Flagged / High Risk Pilots"}
                    </strong>{" "}
                    matching criteria.
                  </span>
                </div>
                <button
                  onClick={() => setActionQueue("all")}
                  className="text-[11px] text-zinc-300 hover:text-white underline cursor-pointer"
                >
                  Clear Queue Filter
                </button>
              </div>
            )}
          </div>

          {/* =========================================================================
              CITY & AREA WISE PERFORMANCE & DAY-WISE REPORT ENGINE (FILE KE UPAR)
          ========================================================================= */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            {/* Selector Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <MapPin className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    Fleet Territory Telemetry &amp; Day-Wise Operations
                    <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      City &amp; Area Engine
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Realtime pilot capacity, earnings, and day-by-day operations for selected zones
                  </p>
                </div>
              </div>

              {/* Location & Time Selector Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* City Selector */}
                <div className="w-36">
                  <Select
                    value={city}
                    onValueChange={(val) => {
                      setCity(val);
                      setArea("all");
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-zinc-50 border-zinc-200 font-medium">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🏙️ All Cities ({allRiders.length})</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c} ({allRiders.filter((r) => r.city.toLowerCase() === c.toLowerCase()).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Area / Zone Selector */}
                <div className="w-40">
                  <Select value={area} onValueChange={(val) => setArea(val)}>
                    <SelectTrigger className="h-9 text-xs bg-zinc-50 border-zinc-200 font-medium">
                      <SelectValue placeholder="All Areas / Zones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📍 All Zones ({availableZones.length})</SelectItem>
                      {availableZones.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Period Filter */}
                <div className="w-36">
                  <Select value={dateRange} onValueChange={(val) => setDateRange(val)}>
                    <SelectTrigger className="h-9 text-xs bg-zinc-50 border-zinc-200 font-medium">
                      <SelectValue placeholder="Timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">⚡ Today (Live)</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="7days">Last 7 Days</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Toggle Day-Wise Breakdown Table */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDayWiseReport(!showDayWiseReport)}
                  className={`h-9 text-xs font-semibold gap-1.5 transition-all ${
                    showDayWiseReport
                      ? "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800"
                      : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <Calendar className="size-3.5" />
                  {showDayWiseReport ? "Hide Day Breakdown ▲" : "View Day-Wise Report ▼"}
                </Button>
              </div>
            </div>

            {/* Live Metrics Strip for selected Territory */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Fleet Earnings & COD */}
              <div className="bg-white border border-zinc-200/80 hover:border-emerald-400 transition-colors rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Fleet Earnings</span>
                  <DollarSign className="size-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-zinc-900">
                  ₹{cityAreaMetrics.totalEarnings.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center justify-between">
                  <span>COD Held: ₹{cityAreaMetrics.totalCodHeld.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Live Active Today */}
              <div className="bg-white border border-zinc-200/80 hover:border-emerald-400 transition-colors rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Today's Active Fleet</span>
                  <span className="flex size-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="text-xl font-black text-zinc-900">
                  {cityAreaMetrics.onlineToday}{" "}
                  <span className="text-xs font-normal text-zinc-500">/ {cityAreaMetrics.totalFleet} pilots</span>
                </div>
                <div className="text-[11px] text-zinc-600 font-medium mt-1">
                  {cityAreaMetrics.availableDispatch} available • {cityAreaMetrics.onDelivery} on delivery
                </div>
              </div>

              {/* Delivered Trips */}
              <div className="bg-white border border-zinc-200/80 hover:border-emerald-400 transition-colors rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Completed Trips</span>
                  <PackageCheck className="size-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-zinc-900">
                  {cityAreaMetrics.totalTrips.toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-1">
                  Total pickups &amp; dropoffs fulfilled
                </div>
              </div>

              {/* Today's New Pilot Registrations */}
              <div className="bg-white border border-zinc-200/80 hover:border-emerald-400 transition-colors rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">New Pilot Signups</span>
                  <Users className="size-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-zinc-900">
                  {cityAreaMetrics.newSignups}
                </div>
                <div className="text-[11px] text-zinc-600 font-medium mt-1">
                  Onboarding in {city === "all" ? "network" : city}
                </div>
              </div>

              {/* Flagged / Risk */}
              <div className="bg-white border border-zinc-200/80 hover:border-emerald-400 transition-colors rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">COD / SLA Alerts</span>
                  <AlertTriangle className="size-3.5 text-zinc-500" />
                </div>
                <div className="text-xl font-black text-zinc-900">
                  {cityAreaMetrics.flaggedCount}
                </div>
                <div className="text-[11px] text-zinc-500 font-medium mt-1">
                  {cityAreaMetrics.flaggedCount === 0 ? "Fleet cash held compliant" : "COD deposit or KYC action needed"}
                </div>
              </div>
            </div>

            {/* Expandable Day-Wise Report Breakdown Table */}
            {showDayWiseReport && (
              <div className="mt-4 border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs animate-in fade-in duration-200">
                <div className="bg-zinc-50/80 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-zinc-600" />
                    <span className="text-xs font-bold text-zinc-900">
                      Fleet Day-Wise Activity &amp; Earnings Audit — {city === "all" ? "All Territories" : city}{" "}
                      {area !== "all" ? `(${area})` : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Last 7 Days Operating Log
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100/75 text-zinc-600 font-semibold border-b border-zinc-200">
                      <tr>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-3">Territory</th>
                        <th className="py-2.5 px-3">Active Pilots on Duty</th>
                        <th className="py-2.5 px-3">Trips Fulfilled</th>
                        <th className="py-2.5 px-3">Fleet Earnings</th>
                        <th className="py-2.5 px-3">COD Cash Collected</th>
                        <th className="py-2.5 px-3">New Signups</th>
                        <th className="py-2.5 px-4">Alerts / Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {dayWiseReportData.map((row, idx) => (
                        <tr
                          key={idx}
                          className={idx === 0 ? "bg-emerald-50/30 font-medium" : "hover:bg-zinc-50/60"}
                        >
                          <td className="py-2.5 px-4 font-semibold text-zinc-900 flex items-center gap-1.5">
                            {idx === 0 && (
                              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                            {row.date}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-600">{row.territory}</td>
                          <td className="py-2.5 px-3 text-zinc-900 font-semibold">
                            {row.activePilots} pilots
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-zinc-900">{row.dayTrips} trips</td>
                          <td className="py-2.5 px-3 font-bold text-zinc-900">
                            ₹{row.dayEarnings.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-700 font-semibold">
                            ₹{row.dayCod.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-[11px] border border-purple-200">
                              +{row.newPilots}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            {row.flagged > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                                ⚠️ {row.flagged} flagged
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">Compliant</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 2. FLEET FILTERS BAR */}
          <SectionCard title="Filter & Search Fleet">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-zinc-400" />
                <Input
                  placeholder="Search by name, phone, plate, ID..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-10 text-xs bg-zinc-50 border-zinc-200"
                />
              </div>

              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                  <SelectValue placeholder="Duty Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Duty States</SelectItem>
                  <SelectItem value="online">Online / Active</SelectItem>
                  <SelectItem value="delivery">On Active Delivery</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="suspended">Suspended / Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                  <SelectValue placeholder="All Cities" />
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

              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  <SelectItem value="bike">🏍️ Motorbike</SelectItem>
                  <SelectItem value="scooter">🛵 Scooter / Scooty</SelectItem>
                  <SelectItem value="ev">⚡ Electric Vehicle (EV)</SelectItem>
                  <SelectItem value="bicycle">🚲 Bicycle</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">🕒 Newest Registered</SelectItem>
                  <SelectItem value="trips">🏆 Most Trips Delivered</SelectItem>
                  <SelectItem value="rating">★ Highest Customer Rating</SelectItem>
                  <SelectItem value="wallet">💰 Highest Wallet Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SectionCard>

          {/* 3. MASTER RIDERS DATA TABLE */}
          <SectionCard
            title="Fleet Directory & Intelligence"
            description="Click or tap any rider row to open the complete 360° Profile View with KYC inspection, shift history, and COD wallet ledger."
          >
            <DataTable
              loading={ridersQuery.isLoading}
              rows={rows}
              onRowClick={(rider) => setSelectedId(rider.id)}
              emptyMessage="No rider accounts found matching the specified filters."
              columns={[
                {
                  key: "name",
                  label: "Rider Profile",
                  render: (r) => (
                    <div className="flex items-center gap-3">
                      <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-900 font-black text-xs shadow-xs border border-sky-200/60 overflow-hidden shrink-0">
                        {r.profilePhoto ? (
                          <img src={r.profilePhoto} alt={r.name} className="w-full h-full object-cover" />
                        ) : (
                          r.name.slice(0, 2).toUpperCase()
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${
                            r.live === "Online"
                              ? "bg-emerald-500 ring-2 ring-emerald-200"
                              : r.live === "On delivery"
                              ? "bg-sky-500 ring-2 ring-sky-200 animate-ping"
                              : "bg-zinc-300"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-zinc-900 text-xs">{r.name}</p>
                          {r.trips > 50 && <Star className="size-3 fill-amber-400 text-amber-500" />}
                          {r.resubmitted && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[9px] shadow-2xs">
                              <RotateCcw className="size-2.5 text-indigo-600 animate-spin" />
                              <span>Re-Submitted</span>
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[10px] text-zinc-400 font-medium">#{r.id.slice(0, 16)}</p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "phone",
                  label: "Contact",
                  render: (r) => (
                    <div className="text-xs">
                      <a
                        href={`tel:${r.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono font-bold text-zinc-800 flex items-center gap-1 hover:text-emerald-600 transition-colors"
                      >
                        <Phone className="size-3 text-emerald-600" />
                        {r.phone}
                      </a>
                      <p className="text-[10px] text-zinc-400 truncate max-w-[120px]">{r.email}</p>
                    </div>
                  ),
                },
                {
                  key: "city",
                  label: "City & Operating PIN",
                  render: (r: any) => (
                    <div className="text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-zinc-800">
                        <MapPin className="size-3 text-rose-500" />
                        {r.city}
                      </span>
                      <p className="text-[10px] text-emerald-700 font-semibold">
                        {r.operatingPincodes && r.operatingPincodes.length > 0
                          ? `PIN: ${r.operatingPincodes.join(", ")}`
                          : r.pincode ? `PIN: ${r.pincode}` : (r.zone || "Territory Hub")}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "live",
                  label: "Duty State",
                  render: (r) => (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        r.live === "Online"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : r.live === "On delivery"
                          ? "bg-sky-50 text-sky-700 border border-sky-200 animate-pulse"
                          : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          r.live === "Online" ? "bg-emerald-600" : r.live === "On delivery" ? "bg-sky-600" : "bg-zinc-400"
                        }`}
                      />
                      {r.live}
                    </span>
                  ),
                },
                {
                  key: "kyc",
                  label: "KYC Status",
                  render: (r) => (
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          r.kyc === "Verified"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : r.kyc === "Rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {r.kyc === "Verified" ? <CheckCircle2 className="size-3 text-emerald-600" /> : <AlertTriangle className="size-3 text-amber-600" />}
                        {r.kyc}
                      </span>
                      {r.resubmitted && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-indigo-700 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          <RotateCcw className="size-2.5 text-indigo-600" />
                          <span>Form Re-Filled</span>
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: "trips",
                  label: "Trips & Rating",
                  render: (r) => (
                    <div className="text-xs">
                      <span className="font-black text-zinc-900">{r.trips} trips</span>
                      <span className="ml-2 font-bold text-amber-600">★ {r.rating}</span>
                    </div>
                  ),
                },
                {
                  key: "wallet",
                  label: "Earnings & COD",
                  render: (r) => (
                    <div className="text-xs">
                      <p className="font-bold text-emerald-700">{r.wallet}</p>
                      <p className="text-[10px] text-amber-700 font-semibold">COD: {r.codCash}</p>
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Standing",
                  render: (r) => <StatusPill value={r.status} />,
                },
                {
                  key: "actions",
                  label: "",
                  className: "text-right",
                  render: (r) => (
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-emerald-700"
                        onClick={() => setSelectedId(r.id)}
                      >
                        <Eye className="size-3.5 mr-1" /> 360° Profile
                      </Button>
                      {r.status === "Pending" ? (
                        <Button
                          size="sm"
                          className="h-8 rounded-xl bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                          onClick={() => decideMutation.mutate({ id: r.id, action: "approve" })}
                        >
                          <Check className="mr-1 size-3.5" /> Approve
                        </Button>
                      ) : r.status === "Suspended" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-xl border-emerald-300 text-emerald-700 px-2.5 text-xs font-bold hover:bg-emerald-50"
                          onClick={() => decideMutation.mutate({ id: r.id, action: "activate" })}
                        >
                          <PlayCircle className="mr-1 size-3.5" /> Activate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-xl text-zinc-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 text-xs font-bold"
                          onClick={() => decideMutation.mutate({ id: r.id, action: "suspend" })}
                        >
                          <PauseCircle className="mr-1 size-3.5" /> Suspend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Permanently Delete Rider"
                        onClick={() => {
                          if (window.confirm(`Permanently delete rider ${r.name} (#${r.id})? This cannot be undone.`)) {
                            deleteMutation.mutate(r.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </SectionCard>
        </div>
      )}

      {/* =========================================================================
          REJECTION MODAL DIALOG WITH PRESETS & SPECIFIC DOCUMENT SELECTION
      ========================================================================= */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white text-zinc-900 border border-zinc-200 p-6 space-y-4 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <ShieldAlert className="size-4" />
              </div>
              <DialogTitle className="text-base font-black text-zinc-900">
                Reject Rider KYC Application
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 font-medium">
              Rejecting will mark the specified documents as invalid, log the reason, and notify Captain <strong>{selectedRider?.name}</strong> on their verification screen.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Reason Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-zinc-600">
              1. Select Common Rejection Reason:
            </label>
            <Select
              value={selectedPreset}
              onValueChange={(val) => {
                setSelectedPreset(val);
                const p = REJECTION_REASON_PRESETS.find((x) => x.id === val);
                if (p) {
                  if (p.id === "custom") {
                    setRejectReasonNote("");
                  } else {
                    setRejectReasonNote(`${p.label}. Please re-upload a clear and valid document.`);
                  }
                  if (p.docId) {
                    setRejectedDocsSelected((prev) => (prev.includes(p.docId) ? prev : [...prev, p.docId]));
                  }
                }
              }}
            >
              <SelectTrigger className="h-9 rounded-xl bg-zinc-50 border-zinc-200 text-xs">
                <SelectValue placeholder="Choose rejection reason preset..." />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASON_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Flag Specific Documents */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-zinc-600">
              2. Flag Specific Invalid Document(s) to Re-Upload:
            </label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2.5 rounded-2xl border border-zinc-200">
              {REJECTABLE_DOCUMENTS.map((doc) => {
                const isChecked = rejectedDocsSelected.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      isChecked
                        ? "bg-rose-50 border-rose-300 text-rose-900"
                        : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRejectedDocsSelected((prev) => [...prev, doc.id]);
                        } else {
                          setRejectedDocsSelected((prev) => prev.filter((x) => x !== doc.id));
                        }
                      }}
                    />
                    <span className="truncate">{doc.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Rejection Note Textarea */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-zinc-600">
              3. Detailed Note / Instructions for Captain:
            </label>
            <Textarea
              rows={3}
              value={rejectReasonNote}
              onChange={(e) => setRejectReasonNote(e.target.value)}
              placeholder="Explain clearly why this application is rejected and how the rider can correct it..."
              className="text-xs rounded-xl bg-white border-zinc-200 resize-none"
            />
            <p className="text-[10px] text-zinc-400 font-medium">
              This exact note will be highlighted in red on the rider's verification screen.
            </p>
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl text-xs font-bold h-10 border-zinc-200"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-xs font-bold h-10 text-white shadow-sm"
              onClick={() => {
                const finalReason =
                  rejectReasonNote.trim() ||
                  REJECTION_REASON_PRESETS.find((x) => x.id === selectedPreset)?.label ||
                  "KYC verification failed.";
                if (selectedId) {
                  decideMutation.mutate({
                    id: selectedId,
                    action: "reject",
                    reason: finalReason,
                    rejectedDocuments: rejectedDocsSelected,
                  });
                }
                setRejectModalOpen(false);
              }}
            >
              <X className="size-3.5 mr-1" />
              Submit Rejection ❌
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          APPROVE CONFIRMATION DIALOG
      ========================================================================= */}
      <Dialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white text-zinc-900 border border-zinc-200 p-6 space-y-4 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-4" />
              </div>
              <DialogTitle className="text-base font-black text-zinc-900">
                Approve &amp; Activate QuickPress Captain
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 font-medium leading-relaxed">
              Are you sure you want to approve <strong>{selectedRider?.name}</strong> (#{selectedId})?
              This action will mark all KYC documents as verified, activate the rider profile, and immediately unlock live order dispatch and earnings for the Captain.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-emerald-950">
              <Sparkles className="size-3.5 text-emerald-600" />
              <span>Instant Real-Time Unlock</span>
            </p>
            <p className="text-[11px] text-emerald-800">
              The rider's verification screen will instantly update via realtime socket to grant access to the Captain Dashboard.
            </p>
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl text-xs font-bold h-10 border-zinc-200"
              onClick={() => setApproveConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs font-bold h-10 text-white shadow-sm"
              onClick={() => {
                if (selectedId) {
                  decideMutation.mutate({ id: selectedId, action: "approve" });
                }
                setApproveConfirmOpen(false);
              }}
            >
              <Check className="size-3.5 mr-1" />
              Confirm &amp; Approve ✅
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          WALLET ADJUSTMENT DIALOG
      ========================================================================= */}
      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white text-zinc-900 border border-zinc-200 p-6 space-y-4 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <IndianRupee className="size-4" />
              </div>
              <DialogTitle className="text-base font-black text-zinc-900">
                Adjust Captain Wallet Balance
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 font-medium">
              Credit or debit funds to <strong>{selectedRider?.name}</strong> or settle Cash-on-Delivery collections.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">Adjustment Amount (₹)</label>
              <Input
                type="number"
                placeholder="e.g. 500 or -200"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                className="h-10 text-xs bg-zinc-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">Reason / Description</label>
              <Input
                placeholder="e.g. Surge Bonus / Disciplinary Penalty / Weekly Settlement"
                value={walletReason}
                onChange={(e) => setWalletReason(e.target.value)}
                className="h-10 text-xs bg-zinc-50"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="codCheckModal"
                checked={isCodSettlement}
                onChange={(e) => setIsCodSettlement(e.target.checked)}
                className="size-4 accent-emerald-600 rounded"
              />
              <label htmlFor="codCheckModal" className="text-xs font-medium text-zinc-700 cursor-pointer">
                Settle Cash-on-Delivery (COD) cash in hand
              </label>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl text-xs font-bold h-10 border-zinc-200"
              onClick={() => setWalletModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold h-10 text-white shadow-sm"
              disabled={!walletAmount || walletMutation.isPending}
              onClick={() =>
                walletMutation.mutate({
                  amount: parseFloat(walletAmount),
                  reason: walletReason || "Admin Manual Adjustment",
                  isCod: isCodSettlement,
                })
              }
            >
              {walletMutation.isPending ? "Executing..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          PUSH NOTIFICATION DIALOG
      ========================================================================= */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white text-zinc-900 border border-zinc-200 p-6 space-y-4 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <Send className="size-4" />
              </div>
              <DialogTitle className="text-base font-black text-zinc-900">
                Dispatch Push Notification to Captain
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-500 font-medium">
              Deliver an instant high-priority popup alert directly to <strong>{selectedRider?.name}</strong>'s mobile device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">Notification Title</label>
              <Input
                placeholder="e.g. High Demand Surge in Kasganj City Hub!"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                className="h-10 text-xs bg-zinc-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">Alert Message Body</label>
              <Textarea
                rows={3}
                placeholder="Enter alert message content..."
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                className="text-xs bg-zinc-50 border-zinc-200 resize-none rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl text-xs font-bold h-10 border-zinc-200"
              onClick={() => setNotifyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-bold h-10 text-white shadow-sm"
              disabled={!notifTitle || !notifBody || notifMutation.isPending}
              onClick={() => notifMutation.mutate({ title: notifTitle, body: notifBody })}
            >
              {notifMutation.isPending ? "Dispatching..." : "Send Push Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          FULL-SCREEN DOCUMENT LIGHTBOX & INSPECTION MODAL
      ========================================================================= */}
      <Dialog
        open={Boolean(lightboxImage)}
        onOpenChange={(open) => {
          if (!open) {
            setLightboxImage(null);
            setZoomLevel(1);
            setRotation(0);
          }
        }}
      >
        <DialogContent className="max-w-3xl rounded-3xl bg-white text-slate-900 border border-slate-200 p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="size-4 text-emerald-600" />
                <span>{lightboxImage?.title}</span>
              </DialogTitle>
              {lightboxImage?.subtitle && (
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  {lightboxImage.subtitle}
                </DialogDescription>
              )}
            </div>

            {/* Zoom & Rotate Controls */}
            <div className="flex items-center gap-1.5 mr-6">
              <Button
                size="sm"
                variant="outline"
                className="size-8 p-0 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs font-bold"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                title="Zoom Out"
              >
                -
              </Button>
              <span className="text-[10px] font-mono text-slate-600 font-bold px-1">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                size="sm"
                variant="outline"
                className="size-8 p-0 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs font-bold"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                title="Zoom In"
              >
                +
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="size-8 p-0 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90°"
              >
                <RotateCcw className="size-3.5" />
              </Button>
              {lightboxImage?.src && (
                <a
                  href={lightboxImage.src}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs"
                  title="Open original in new window"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </DialogHeader>

          {/* Document Image Viewer */}
          <div className="flex-1 overflow-auto bg-slate-100/70 p-6 flex items-center justify-center min-h-[350px]">
            {lightboxImage?.src ? (
              <div
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
                className="max-w-full max-h-[60vh] flex items-center justify-center"
              >
                <img
                  src={lightboxImage.src}
                  alt={lightboxImage.title}
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-slate-200 bg-white"
                />
              </div>
            ) : (
              <div className="text-center text-slate-400 space-y-2">
                <FileText className="size-12 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">Document File Not Uploaded</p>
              </div>
            )}
          </div>

          <DialogFooter className="p-3 border-t border-slate-200 flex justify-end items-center bg-slate-50">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold"
              onClick={() => setLightboxImage(null)}
            >
              Close Lightbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
