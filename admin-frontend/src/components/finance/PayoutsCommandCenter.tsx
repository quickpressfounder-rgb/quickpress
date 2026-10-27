import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  Building2,
  Bike,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Download,
  Check,
  X,
  CreditCard,
  Banknote,
  Send,
  Calendar,
  Layers,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Gift,
  RotateCcw,
  Scale,
  Printer,
  Copy,
  UserCheck,
  FileSpreadsheet,
  AlertTriangle,
  FileText,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchPayoutsOverview,
  disburseEntityPayout,
  bulkDisbursePayouts,
  addBonusIncentive,
  issueCustomerCompensation,
  type PayoutsOverviewResponse,
  type PartnerPayoutRecord,
  type RiderPayoutRecord,
  type CustomerCompensationRecord,
} from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { StatusPill } from "../AdminUI";

type ActiveSubTab = "partners" | "riders" | "compensations" | "batches";

export function PayoutsCommandCenter() {
  const queryClient = useQueryClient();

  // Sub-navigation
  const [activeTab, setActiveTab] = useState<ActiveSubTab>("partners");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDueTodayOnly, setShowDueTodayOnly] = useState(false);

  // Selected row for single-pay with UTR
  const [payTarget, setPayTarget] = useState<{
    entityId: string;
    entityType: "partner" | "rider";
    name: string;
    amount: number;
    bankName: string;
    accountMasked: string;
    ifsc: string;
    upiId?: string;
  } | null>(null);
  const [utrInput, setUtrInput] = useState("");
  const [paymentMode, setPaymentMode] = useState("IMPS");
  const [payoutNotes, setPayoutNotes] = useState("");

  // Bonus / Incentive modal state
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [bonusTargetType, setBonusTargetType] = useState<"partner" | "rider" | "bulk_city">("rider");
  const [bonusTargetId, setBonusTargetId] = useState("");
  const [bonusTargetCity, setBonusTargetCity] = useState("Kasganj");
  const [bonusAmount, setBonusAmount] = useState<number>(250);
  const [bonusTitle, setBonusTitle] = useState("Weekend Peak Milestone");
  const [bonusReason, setBonusReason] = useState("Target order delivery achievement");

  // Bulk Disbursal modal state
  const [isBulkPayOpen, setIsBulkPayOpen] = useState(false);
  const [bulkUtrInput, setBulkUtrInput] = useState("");
  const [bulkMode, setBulkMode] = useState("NEFT_BULK");

  // Customer Compensation modal state
  const [isCompensationOpen, setIsCompensationOpen] = useState(false);
  const [compCustomerId, setCompCustomerId] = useState("");
  const [compCustomerName, setCompCustomerName] = useState("");
  const [compCustomerPhone, setCompCustomerPhone] = useState("");
  const [compOrderId, setCompOrderId] = useState("");
  const [compAmount, setCompAmount] = useState<number>(150);
  const [compReason, setCompReason] = useState("Delivery delay compensation");
  const [compMode, setCompMode] = useState<"WALLET_CREDIT" | "BANK_TRANSFER">("WALLET_CREDIT");
  const [compUtr, setCompUtr] = useState("");

  // Full Weekly Statement modal state
  const [statementRecord, setStatementRecord] = useState<{
    entityType: "partner" | "rider";
    name: string;
    phone: string;
    city: string;
    bankDetails: any;
    orderCount: number;
    gross: number;
    deductions: number;
    bonus: number;
    net: number;
    status: string;
    utr?: string | null;
    paidAt?: string | null;
  } | null>(null);

  // --------------------------------------------------------------------------
  // Data Query
  // --------------------------------------------------------------------------
  const payoutsQuery = useQuery({
    queryKey: ["payouts", "overview"],
    queryFn: fetchPayoutsOverview,
    staleTime: 15000,
  });

  const data = payoutsQuery.data;
  const kpis = data?.kpis || {
    totalDisbursedCycle: 0,
    pendingPartnerPayables: 0,
    pendingRiderPayables: 0,
    dueTodayAmount: 0,
    dueTodayCount: 0,
    totalBonusDisbursed: 0,
    totalCompensations: 0,
  };
  const cycle = data?.cycle || {
    cycleId: "CYCLE-WEEKLY",
    startDate: "2026-10-20",
    endDate: "2026-10-26",
    payoutDay: "Wednesday",
    isPayoutDay: true,
    dueTodayPartnersCount: 0,
    dueTodayRidersCount: 0,
  };

  // --------------------------------------------------------------------------
  // Mutations
  // --------------------------------------------------------------------------
  const disburseMutation = useMutation({
    mutationFn: disburseEntityPayout,
    onSuccess: (res) => {
      toast.success(`Payout successfully disbursed! Bank UTR: ${res.utr}`);
      setPayTarget(null);
      setUtrInput("");
      setPayoutNotes("");
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (err: any) => {
      toast.error(`Disbursal failed: ${err?.message || "Unknown error"}`);
    },
  });

  const bulkDisburseMutation = useMutation({
    mutationFn: bulkDisbursePayouts,
    onSuccess: (res) => {
      toast.success(`Bulk payout complete! ${res.disbursedCount} disbursements processed with UTR ${res.utr}`);
      setIsBulkPayOpen(false);
      setBulkUtrInput("");
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (err: any) => {
      toast.error(`Bulk disbursal failed: ${err?.message || "Unknown error"}`);
    },
  });

  const bonusMutation = useMutation({
    mutationFn: addBonusIncentive,
    onSuccess: () => {
      toast.success(`Bonus incentive credited successfully!`);
      setIsBonusModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
    onError: (err: any) => {
      toast.error(`Failed to add bonus: ${err?.message || "Unknown error"}`);
    },
  });

  const compensationMutation = useMutation({
    mutationFn: issueCustomerCompensation,
    onSuccess: () => {
      toast.success(`Customer compensation of ₹${compAmount} issued!`);
      setIsCompensationOpen(false);
      setCompCustomerId("");
      setCompCustomerName("");
      setCompCustomerPhone("");
      setCompOrderId("");
      setCompUtr("");
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
    onError: (err: any) => {
      toast.error(`Compensation failed: ${err?.message || "Unknown error"}`);
    },
  });

  // --------------------------------------------------------------------------
  // Filtered Partners
  // --------------------------------------------------------------------------
  const filteredPartners = useMemo(() => {
    const list = data?.partners || [];
    return list.filter((p) => {
      if (selectedCity !== "all" && p.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "settled" && p.status !== "SETTLED") return false;
        if (statusFilter === "due_today" && p.status !== "DUE_TODAY") return false;
        if (statusFilter === "pending" && p.status === "SETTLED") return false;
      }
      if (showDueTodayOnly && !p.cycleDueToday) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.businessName.toLowerCase().includes(q) || p.ownerName.toLowerCase().includes(q);
        const matchPhone = p.phone.toLowerCase().includes(q);
        const matchUtr = (p.utr || "").toLowerCase().includes(q);
        const matchBank = p.bankDetails.bankName.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchUtr && !matchBank) return false;
      }
      return true;
    });
  }, [data?.partners, selectedCity, statusFilter, showDueTodayOnly, searchQuery]);

  // --------------------------------------------------------------------------
  // Filtered Riders
  // --------------------------------------------------------------------------
  const filteredRiders = useMemo(() => {
    const list = data?.riders || [];
    return list.filter((r) => {
      if (selectedCity !== "all" && r.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "settled" && r.status !== "SETTLED") return false;
        if (statusFilter === "due_today" && r.status !== "DUE_TODAY") return false;
        if (statusFilter === "pending" && r.status === "SETTLED") return false;
      }
      if (showDueTodayOnly && !r.cycleDueToday) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.riderName.toLowerCase().includes(q);
        const matchPhone = r.phone.toLowerCase().includes(q);
        const matchUtr = (r.utr || "").toLowerCase().includes(q);
        const matchVehicle = r.vehicle.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchUtr && !matchVehicle) return false;
      }
      return true;
    });
  }, [data?.riders, selectedCity, statusFilter, showDueTodayOnly, searchQuery]);

  // City options
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    (data?.partners || []).forEach((p) => p.city && set.add(p.city));
    (data?.riders || []).forEach((r) => r.city && set.add(r.city));
    return Array.from(set);
  }, [data]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. WEEKLY SETTLEMENT CYCLE ALERT BANNER
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                <Clock className="size-3.5 text-emerald-400" />
                <span>Weekly Settlement Cycle</span>
              </span>
              <span className="text-xs font-black text-zinc-900">
                {cycle.startDate} to {cycle.endDate}
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 border border-emerald-200">
                Payout Day: {cycle.payoutDay}
              </span>
            </div>
            <p className="text-xs text-zinc-600 font-medium">
              Weekly merchant and captain settlement audit window. Orders delivered within this cycle are reconciled for bank disbursement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                Disbursals Due Today
              </div>
              <div className="text-base font-black text-amber-950 tabular-nums">
                ₹{kpis.dueTodayAmount.toLocaleString("en-IN")}
                <span className="ml-1.5 text-xs font-bold text-amber-700">
                  ({kpis.dueTodayCount} Accounts)
                </span>
              </div>
            </div>

            <Button
              variant={showDueTodayOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDueTodayOnly(!showDueTodayOnly)}
              className="h-10 text-xs font-black gap-1.5 rounded-xl"
            >
              <AlertCircle className="size-3.5" />
              <span>{showDueTodayOnly ? "Show All Cycles" : "Filter Due Today"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. EXECUTIVE PAYOUT KPIS
         ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Total Disbursed (Cycle)
          </div>
          <div className="mt-1 text-lg font-black text-zinc-950 tabular-nums">
            ₹{kpis.totalDisbursedCycle.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            <span>Bank Settled & Verified</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Pending Partners
          </div>
          <div className="mt-1 text-lg font-black text-zinc-950 tabular-nums">
            ₹{kpis.pendingPartnerPayables.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] font-bold text-amber-600 flex items-center gap-1">
            <Building2 className="size-3" />
            <span>{(data?.partners || []).filter((p) => p.status !== "SETTLED").length} Store Partners</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Pending Captains
          </div>
          <div className="mt-1 text-lg font-black text-zinc-950 tabular-nums">
            ₹{kpis.pendingRiderPayables.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] font-bold text-blue-600 flex items-center gap-1">
            <Bike className="size-3" />
            <span>{(data?.riders || []).filter((r) => r.status !== "SETTLED").length} Delivery Fleet</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Due Today Disbursal
          </div>
          <div className="mt-1 text-lg font-black text-amber-700 tabular-nums">
            ₹{kpis.dueTodayAmount.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] font-bold text-zinc-500">
            {kpis.dueTodayCount} Ready for Bank NEFT
          </div>
        </div>

        {/* KPI 5 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Bonuses & Incentives
          </div>
          <div className="mt-1 text-lg font-black text-purple-700 tabular-nums">
            ₹{kpis.totalBonusDisbursed.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] font-bold text-purple-600 flex items-center gap-1">
            <Gift className="size-3" />
            <span>Milestones & Surges</span>
          </div>
        </div>

        {/* KPI 6 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Customer Refunds / Comp
          </div>
          <div className="mt-1 text-lg font-black text-rose-700 tabular-nums">
            ₹{kpis.totalCompensations.toLocaleString("en-IN")}
          </div>
          <div className="mt-1 text-[10px] font-bold text-rose-600 flex items-center gap-1">
            <Scale className="size-3" />
            <span>Direct Wallet / UPI</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. MASTER ACTION TOOLBAR & CONTROLS
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-xs">
        {/* Sub-Tab Navigation Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("partners")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
              activeTab === "partners"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Building2 className="size-3.5 text-emerald-600" />
            <span>Laundry Partners ({data?.partners?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("riders")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
              activeTab === "riders"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Bike className="size-3.5 text-blue-600" />
            <span>Delivery Captains ({data?.riders?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("compensations")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
              activeTab === "compensations"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Scale className="size-3.5 text-rose-600" />
            <span>Customer Compensations ({data?.compensations?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("batches")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
              activeTab === "batches"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Layers className="size-3.5 text-zinc-700" />
            <span>Settlement Batches ({data?.batches?.length || 0})</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsBulkPayOpen(true)}
            className="h-9 text-xs font-black bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5 rounded-xl shadow-xs"
          >
            <Send className="size-3.5 text-emerald-400" />
            <span>Bulk Disburse Approved</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBonusModalOpen(true)}
            className="h-9 text-xs font-black border-zinc-200 text-zinc-900 gap-1.5 rounded-xl hover:bg-zinc-50"
          >
            <Gift className="size-3.5 text-purple-600" />
            <span>Add Bonus / Incentive</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCompensationOpen(true)}
            className="h-9 text-xs font-black border-zinc-200 text-zinc-900 gap-1.5 rounded-xl hover:bg-zinc-50"
          >
            <Scale className="size-3.5 text-rose-600" />
            <span>Customer Compensation</span>
          </Button>
        </div>
      </div>

      {/* =========================================================================
          4. FILTER STRIP (Search, City, Status)
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-white p-3 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by store name, captain name, phone, bank name, or UTR reference..."
            className="h-9 pl-9 text-xs font-medium border-zinc-200 rounded-xl focus:border-zinc-950"
          />
        </div>

        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-900 focus:border-zinc-950 focus:outline-none"
        >
          <option value="all">All Cities</option>
          {availableCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-900 focus:border-zinc-950 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="due_today">Due Today</option>
          <option value="pending">Pending Payout</option>
          <option value="settled">Settled with UTR</option>
        </select>

        {(searchQuery || selectedCity !== "all" || statusFilter !== "all" || showDueTodayOnly) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              setSelectedCity("all");
              setStatusFilter("all");
              setShowDueTodayOnly(false);
            }}
            className="h-9 text-xs font-bold text-zinc-600 hover:text-zinc-950 gap-1 rounded-xl"
          >
            <RotateCcw className="size-3" />
            <span>Reset</span>
          </Button>
        )}
      </div>

      {/* =========================================================================
          5. SUB-TAB 1: LAUNDRY PARTNER PAYOUTS
         ========================================================================= */}
      {activeTab === "partners" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/75 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-3 px-4">Partner Store & Contact</th>
                  <th className="py-3 px-4">City / Area</th>
                  <th className="py-3 px-4">Verified Bank Details</th>
                  <th className="py-3 px-4 text-right">Delivered Orders</th>
                  <th className="py-3 px-4 text-right">Gross Sales (₹)</th>
                  <th className="py-3 px-4 text-right">Commission (18%)</th>
                  <th className="py-3 px-4 text-right">Bonus (+)</th>
                  <th className="py-3 px-4 text-right">Net Payable (₹)</th>
                  <th className="py-3 px-4 text-center">Status / Cycle</th>
                  <th className="py-3 px-4">Bank UTR Reference</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-medium">
                {filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-zinc-500 font-medium">
                      No partner payout records match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map((partner) => (
                    <tr key={partner.partnerId} className="hover:bg-zinc-50/60 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-950">{partner.businessName}</div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                          <span>{partner.ownerName}</span>
                          <span>•</span>
                          <span>{partner.phone}</span>
                        </div>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-4 text-zinc-700">
                        <div className="font-bold">{partner.city}</div>
                        <div className="text-[11px] text-zinc-400">{partner.area}</div>
                      </td>

                      {/* Bank Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                          <span>{partner.bankDetails.bankName}</span>
                          {partner.bankDetails.verified && (
                            <span className="rounded-full bg-emerald-100 p-0.5 text-emerald-700" title="Bank Verified">
                              <Check className="size-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                          <span>{partner.bankDetails.accountNumberMasked}</span>
                          <span>({partner.bankDetails.ifsc})</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(partner.bankDetails.ifsc, "IFSC")}
                            className="text-zinc-400 hover:text-zinc-700"
                          >
                            <Copy className="size-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* Orders */}
                      <td className="py-3.5 px-4 text-right font-bold tabular-nums text-zinc-900">
                        {partner.orderCount}
                      </td>

                      {/* Gross */}
                      <td className="py-3.5 px-4 text-right font-bold tabular-nums text-zinc-900">
                        ₹{partner.grossRevenue.toLocaleString("en-IN")}
                      </td>

                      {/* Commission */}
                      <td className="py-3.5 px-4 text-right tabular-nums text-rose-600 font-bold">
                        -₹{partner.commissionDeducted.toLocaleString("en-IN")}
                      </td>

                      {/* Bonus */}
                      <td className="py-3.5 px-4 text-right tabular-nums text-purple-600 font-bold">
                        {partner.bonusAmount > 0 ? `+₹${partner.bonusAmount.toLocaleString("en-IN")}` : "—"}
                      </td>

                      {/* Net Payable */}
                      <td className="py-3.5 px-4 text-right tabular-nums font-black text-emerald-700 text-sm">
                        ₹{partner.netPayable.toLocaleString("en-IN")}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {partner.status === "SETTLED" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="size-3" />
                            <span>Settled</span>
                          </span>
                        ) : partner.cycleDueToday ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 border border-amber-200 animate-pulse">
                            <Clock className="size-3" />
                            <span>Due Today</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-700">
                            <span>Cycle Active</span>
                          </span>
                        )}
                      </td>

                      {/* UTR */}
                      <td className="py-3.5 px-4">
                        {partner.utr ? (
                          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-zinc-900">
                            <span>{partner.utr}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(partner.utr!, "Bank UTR")}
                              className="text-zinc-400 hover:text-zinc-700"
                              title="Copy UTR"
                            >
                              <Copy className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 font-medium italic">Pending Disbursal</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {partner.status !== "SETTLED" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPayTarget({
                                  entityId: partner.partnerId,
                                  entityType: "partner",
                                  name: partner.businessName,
                                  amount: partner.netPayable,
                                  bankName: partner.bankDetails.bankName,
                                  accountMasked: partner.bankDetails.accountNumberMasked,
                                  ifsc: partner.bankDetails.ifsc,
                                  upiId: partner.bankDetails.upiId,
                                });
                                setUtrInput("");
                              }}
                              className="h-7 text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 shadow-xs"
                            >
                              <CreditCard className="size-3 mr-1" />
                              <span>Pay with UTR</span>
                            </Button>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400">Paid</span>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setStatementRecord({
                                entityType: "partner",
                                name: partner.businessName,
                                phone: partner.phone,
                                city: partner.city,
                                bankDetails: partner.bankDetails,
                                orderCount: partner.orderCount,
                                gross: partner.grossRevenue,
                                deductions: partner.commissionDeducted + partner.tdsDeducted,
                                bonus: partner.bonusAmount,
                                net: partner.netPayable,
                                status: partner.status,
                                utr: partner.utr,
                                paidAt: partner.paidAt,
                              });
                            }}
                            className="h-7 text-[11px] font-bold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg px-2"
                            title="View Full Cycle Statement"
                          >
                            <FileText className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. SUB-TAB 2: DELIVERY CAPTAIN PAYOUTS
         ========================================================================= */}
      {activeTab === "riders" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/75 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-3 px-4">Delivery Captain & Vehicle</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Verified Bank & UPI</th>
                  <th className="py-3 px-4 text-right">Trips Done</th>
                  <th className="py-3 px-4 text-right">Base Fare (₹)</th>
                  <th className="py-3 px-4 text-right">Surge & Tips (₹)</th>
                  <th className="py-3 px-4 text-right">Bonus (+)</th>
                  <th className="py-3 px-4 text-right">Net Payout (₹)</th>
                  <th className="py-3 px-4 text-center">Status / Cycle</th>
                  <th className="py-3 px-4">Bank UTR Reference</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-medium">
                {filteredRiders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-zinc-500 font-medium">
                      No delivery captain payout records match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredRiders.map((rider) => (
                    <tr key={rider.riderId} className="hover:bg-zinc-50/60 transition-colors">
                      {/* Name & Vehicle */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-950">{rider.riderName}</div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                          <span>{rider.phone}</span>
                          <span>•</span>
                          <span className="text-zinc-600 font-medium">{rider.vehicle}</span>
                        </div>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-4 font-bold text-zinc-700">{rider.city}</td>

                      {/* Bank Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                          <span>{rider.bankDetails.bankName}</span>
                          {rider.bankDetails.verified && (
                            <span className="rounded-full bg-emerald-100 p-0.5 text-emerald-700" title="Bank Verified">
                              <Check className="size-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                          <span>{rider.bankDetails.accountNumberMasked}</span>
                          <span>({rider.bankDetails.ifsc})</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(rider.bankDetails.ifsc, "IFSC")}
                            className="text-zinc-400 hover:text-zinc-700"
                          >
                            <Copy className="size-2.5" />
                          </button>
                        </div>
                      </td>

                      {/* Trips */}
                      <td className="py-3.5 px-4 text-right font-bold tabular-nums text-zinc-900">
                        {rider.tripCount}
                      </td>

                      {/* Base Fare */}
                      <td className="py-3.5 px-4 text-right font-bold tabular-nums text-zinc-900">
                        ₹{rider.baseFare.toLocaleString("en-IN")}
                      </td>

                      {/* Surge & Tips */}
                      <td className="py-3.5 px-4 text-right tabular-nums text-sky-600 font-bold">
                        ₹{(rider.distanceSurge + rider.tips).toLocaleString("en-IN")}
                      </td>

                      {/* Bonus */}
                      <td className="py-3.5 px-4 text-right tabular-nums text-purple-600 font-bold">
                        {rider.bonusAmount > 0 ? `+₹${rider.bonusAmount.toLocaleString("en-IN")}` : "—"}
                      </td>

                      {/* Net Payout */}
                      <td className="py-3.5 px-4 text-right tabular-nums font-black text-emerald-700 text-sm">
                        ₹{rider.netPayable.toLocaleString("en-IN")}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {rider.status === "SETTLED" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="size-3" />
                            <span>Settled</span>
                          </span>
                        ) : rider.cycleDueToday ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800 border border-amber-200 animate-pulse">
                            <Clock className="size-3" />
                            <span>Due Today</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-700">
                            <span>Cycle Active</span>
                          </span>
                        )}
                      </td>

                      {/* UTR */}
                      <td className="py-3.5 px-4">
                        {rider.utr ? (
                          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-zinc-900">
                            <span>{rider.utr}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(rider.utr!, "Bank UTR")}
                              className="text-zinc-400 hover:text-zinc-700"
                              title="Copy UTR"
                            >
                              <Copy className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-400 font-medium italic">Pending Disbursal</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {rider.status !== "SETTLED" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPayTarget({
                                  entityId: rider.riderId,
                                  entityType: "rider",
                                  name: rider.riderName,
                                  amount: rider.netPayable,
                                  bankName: rider.bankDetails.bankName,
                                  accountMasked: rider.bankDetails.accountNumberMasked,
                                  ifsc: rider.bankDetails.ifsc,
                                  upiId: rider.bankDetails.upiId,
                                });
                                setUtrInput("");
                              }}
                              className="h-7 text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 shadow-xs"
                            >
                              <CreditCard className="size-3 mr-1" />
                              <span>Pay with UTR</span>
                            </Button>
                          ) : (
                            <span className="text-[10px] font-bold text-zinc-400">Paid</span>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setStatementRecord({
                                entityType: "rider",
                                name: rider.riderName,
                                phone: rider.phone,
                                city: rider.city,
                                bankDetails: rider.bankDetails,
                                orderCount: rider.tripCount,
                                gross: rider.baseFare + rider.distanceSurge + rider.tips,
                                deductions: 0,
                                bonus: rider.bonusAmount,
                                net: rider.netPayable,
                                status: rider.status,
                                utr: rider.utr,
                                paidAt: rider.paidAt,
                              });
                            }}
                            className="h-7 text-[11px] font-bold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg px-2"
                            title="View Full Cycle Statement"
                          >
                            <FileText className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. SUB-TAB 3: CUSTOMER COMPENSATIONS
         ========================================================================= */}
      {activeTab === "compensations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-zinc-950">Customer Direct Compensations & Refunds</h3>
              <p className="text-xs text-zinc-500 font-medium">
                Track customer issue resolution payouts, wallet refunds, and direct bank transfers.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCompensationOpen(true)}
              className="h-9 text-xs font-black bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5 rounded-xl shadow-xs"
            >
              <Scale className="size-3.5 text-rose-400" />
              <span>Issue New Compensation</span>
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50/75 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-center">Payout Mode</th>
                    <th className="py-3 px-4">Bank UTR / Transaction ID</th>
                    <th className="py-3 px-4">Processed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-medium">
                  {(data?.compensations || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500 font-medium">
                        No customer compensations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    (data?.compensations || []).map((comp, idx) => (
                      <tr key={comp._id || idx} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-zinc-950">
                          <div>{comp.customerName}</div>
                          <div className="text-[11px] text-zinc-500">{comp.customerPhone}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-700">
                          {comp.orderId ? `#${comp.orderId}` : "Direct Grant"}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700 font-medium">{comp.reason}</td>
                        <td className="py-3.5 px-4 text-right font-black tabular-nums text-rose-700 text-sm">
                          ₹{comp.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-800">
                            {comp.mode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-900 font-bold">
                          {comp.utr || "WALLET-CREDIT-TX"}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                          {new Date(comp.createdAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. SUB-TAB 4: SETTLEMENT BATCHES
         ========================================================================= */}
      {activeTab === "batches" && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/75 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-3 px-4">Batch ID / Cycle</th>
                  <th className="py-3 px-4">Date Range</th>
                  <th className="py-3 px-4 text-right">Partners</th>
                  <th className="py-3 px-4 text-right">Captains</th>
                  <th className="py-3 px-4 text-right">Total Net Payout (₹)</th>
                  <th className="py-3 px-4 text-center">Approval Status</th>
                  <th className="py-3 px-4">Batch UTR</th>
                  <th className="py-3 px-4 text-center">Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-medium">
                {(data?.batches || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500 font-medium">
                      No weekly settlement batches generated yet.
                    </td>
                  </tr>
                ) : (
                  (data?.batches || []).map((batch) => (
                    <tr key={batch._id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-950">
                        {batch.cycleId || batch._id}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600 font-medium">
                        {batch.startDate} to {batch.endDate}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold tabular-nums text-zinc-900">
                        {batch.summary?.totalPartners || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold tabular-nums text-zinc-900">
                        {batch.summary?.totalRiders || 0}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black tabular-nums text-emerald-700 text-sm">
                        ₹{(batch.summary?.netPayableTotal || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                            batch.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : batch.status === "APPROVED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-900 font-bold">
                        {batch.payoutReference || "Pending"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] font-bold text-zinc-700 hover:text-zinc-950 rounded-lg px-2"
                        >
                          <Download className="size-3 mr-1" />
                          <span>CSV</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: PAY SINGLE WITH BANK UTR
         ========================================================================= */}
      {payTarget && (
        <Dialog open={!!payTarget} onOpenChange={(open) => !open && setPayTarget(null)}>
          <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl bg-white border-zinc-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-zinc-950 flex items-center gap-2">
                <CreditCard className="size-4 text-emerald-600" />
                <span>Record Bank Disbursal with UTR</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Confirm fund transfer details and paste the official Bank UTR / Reference number.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Recipient Card */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-600">Beneficiary:</span>
                  <span className="text-xs font-black text-zinc-950">{payTarget.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-600">Bank & Account:</span>
                  <span className="text-xs font-mono font-bold text-zinc-900">
                    {payTarget.bankName} • {payTarget.accountMasked}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-600">IFSC Code:</span>
                  <span className="text-xs font-mono font-bold text-zinc-900">{payTarget.ifsc}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200">
                  <span className="text-xs font-black text-zinc-900">Net Payable Amount:</span>
                  <span className="text-base font-black text-emerald-700 tabular-nums">
                    ₹{payTarget.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Bank UTR Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                  <span>Bank UTR / Transaction Reference</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  placeholder="e.g. UTR192837482910, NPCI9283749"
                  className="font-mono text-xs uppercase border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                />
                <p className="text-[10px] text-zinc-500">
                  This UTR will appear on the partner/rider statement and confirm settlement.
                </p>
              </div>

              {/* Payment Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Payment Mode</Label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-900 focus:border-zinc-950 focus:outline-none"
                  >
                    <option value="IMPS">IMPS Direct</option>
                    <option value="NEFT">NEFT National</option>
                    <option value="RTGS">RTGS High-Value</option>
                    <option value="UPI">UPI Transfer</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Disbursal Notes</Label>
                  <Input
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    placeholder="Weekly Cycle Payout"
                    className="text-xs border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPayTarget(null)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!utrInput.trim() || disburseMutation.isPending}
                onClick={() => {
                  disburseMutation.mutate({
                    entityId: payTarget.entityId,
                    entityType: payTarget.entityType,
                    amount: payTarget.amount,
                    utr: utrInput.trim(),
                    mode: paymentMode,
                    notes: payoutNotes,
                  });
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black gap-1.5"
              >
                <Check className="size-3.5" />
                <span>Confirm & Mark Settled</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL 2: BULK DISBURSAL
         ========================================================================= */}
      {isBulkPayOpen && (
        <Dialog open={isBulkPayOpen} onOpenChange={setIsBulkPayOpen}>
          <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl bg-white border-zinc-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-zinc-950 flex items-center gap-2">
                <Send className="size-4 text-emerald-600" />
                <span>Bulk Disburse All Approved Accounts</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Disburse all pending approved partners and captains with a common Bank Batch UTR reference.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-600">Pending Partners:</span>
                  <span className="font-black text-zinc-900">
                    {(data?.partners || []).filter((p) => p.status !== "SETTLED").length} Stores (₹{kpis.pendingPartnerPayables.toLocaleString("en-IN")})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-600">Pending Captains:</span>
                  <span className="font-black text-zinc-900">
                    {(data?.riders || []).filter((r) => r.status !== "SETTLED").length} Captains (₹{kpis.pendingRiderPayables.toLocaleString("en-IN")})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-200 font-black">
                  <span>Total Batch Disbursal:</span>
                  <span className="text-emerald-700 text-sm">
                    ₹{(kpis.pendingPartnerPayables + kpis.pendingRiderPayables).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                  <span>Batch Bank UTR / Corporate Transfer ID</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={bulkUtrInput}
                  onChange={(e) => setBulkUtrInput(e.target.value)}
                  placeholder="e.g. CORP-HDFC-BATCH-20261027"
                  className="font-mono text-xs uppercase border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-900">Transfer Channel</Label>
                <select
                  value={bulkMode}
                  onChange={(e) => setBulkMode(e.target.value)}
                  className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-900 focus:border-zinc-950 focus:outline-none"
                >
                  <option value="NEFT_BULK">Corporate NEFT File Upload</option>
                  <option value="RTGS_BULK">RTGS Corporate Host-to-Host</option>
                  <option value="RAZORPAYX_PAYOUTS">RazorpayX Automated Payouts</option>
                  <option value="CASHFREE_PAYOUTS">Cashfree Payouts Gateway</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkPayOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!bulkUtrInput.trim() || bulkDisburseMutation.isPending}
                onClick={() => {
                  const pendingPartners = (data?.partners || []).filter((p) => p.status !== "SETTLED");
                  const pendingRiders = (data?.riders || []).filter((r) => r.status !== "SETTLED");
                  const items = [
                    ...pendingPartners.map((p) => ({
                      entityId: p.partnerId,
                      entityType: "partner",
                      amount: p.netPayable,
                    })),
                    ...pendingRiders.map((r) => ({
                      entityId: r.riderId,
                      entityType: "rider",
                      amount: r.netPayable,
                    })),
                  ];

                  bulkDisburseMutation.mutate({
                    items,
                    utr: bulkUtrInput.trim(),
                    mode: bulkMode,
                  });
                }}
                className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black gap-1.5"
              >
                <Check className="size-3.5 text-emerald-400" />
                <span>Disburse Batch</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL 3: ADD BONUS / INCENTIVE
         ========================================================================= */}
      {isBonusModalOpen && (
        <Dialog open={isBonusModalOpen} onOpenChange={setIsBonusModalOpen}>
          <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl bg-white border-zinc-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-zinc-950 flex items-center gap-2">
                <Gift className="size-4 text-purple-600" />
                <span>Credit Bonus / Incentive</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Award performance milestone incentives, rainy-day surge bonuses, or festival grants.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-900">Target Recipient Type</Label>
                <select
                  value={bonusTargetType}
                  onChange={(e) => setBonusTargetType(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-900 focus:border-zinc-950 focus:outline-none"
                >
                  <option value="rider">Individual Delivery Captain</option>
                  <option value="partner">Individual Laundry Partner Store</option>
                  <option value="bulk_city">All Fleet in a City (Bulk Grant)</option>
                </select>
              </div>

              {bonusTargetType === "rider" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Select Captain</Label>
                  <select
                    value={bonusTargetId}
                    onChange={(e) => setBonusTargetId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-900 focus:border-zinc-950 focus:outline-none"
                  >
                    <option value="">Select Delivery Captain...</option>
                    {(data?.riders || []).map((r) => (
                      <option key={r.riderId} value={r.riderId}>
                        {r.riderName} ({r.phone}) - {r.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {bonusTargetType === "partner" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Select Partner Store</Label>
                  <select
                    value={bonusTargetId}
                    onChange={(e) => setBonusTargetId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-900 focus:border-zinc-950 focus:outline-none"
                  >
                    <option value="">Select Partner Store...</option>
                    {(data?.partners || []).map((p) => (
                      <option key={p.partnerId} value={p.partnerId}>
                        {p.businessName} ({p.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {bonusTargetType === "bulk_city" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Select City</Label>
                  <select
                    value={bonusTargetCity}
                    onChange={(e) => setBonusTargetCity(e.target.value)}
                    className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-900 focus:border-zinc-950 focus:outline-none"
                  >
                    {availableCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Incentive Title</Label>
                  <Input
                    value={bonusTitle}
                    onChange={(e) => setBonusTitle(e.target.value)}
                    placeholder="e.g. Festival Grant"
                    className="text-xs border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Amount (₹)</Label>
                  <Input
                    type="number"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                    placeholder="250"
                    className="text-xs font-mono font-bold border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-900">Reason / Milestone Description</Label>
                <Input
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  placeholder="e.g. Achieved 50 completed deliveries with 4.9 rating"
                  className="text-xs border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBonusModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={bonusAmount <= 0 || bonusMutation.isPending}
                onClick={() => {
                  bonusMutation.mutate({
                    targetType: bonusTargetType,
                    targetId: bonusTargetId || undefined,
                    city: bonusTargetType === "bulk_city" ? bonusTargetCity : undefined,
                    amount: bonusAmount,
                    title: bonusTitle,
                    reason: bonusReason,
                  });
                }}
                className="bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black gap-1.5"
              >
                <Gift className="size-3.5" />
                <span>Credit Bonus</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL 4: ISSUE CUSTOMER COMPENSATION
         ========================================================================= */}
      {isCompensationOpen && (
        <Dialog open={isCompensationOpen} onOpenChange={setIsCompensationOpen}>
          <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl bg-white border-zinc-200">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-zinc-950 flex items-center gap-2">
                <Scale className="size-4 text-rose-600" />
                <span>Issue Customer Compensation / Refund</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Search customer and issue direct wallet credit or bank compensation for service delays or defects.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-900">Customer Name</Label>
                <Input
                  value={compCustomerName}
                  onChange={(e) => setCompCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="text-xs border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Customer Phone</Label>
                  <Input
                    value={compCustomerPhone}
                    onChange={(e) => setCompCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="text-xs border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Order Ref (Optional)</Label>
                  <Input
                    value={compOrderId}
                    onChange={(e) => setCompOrderId(e.target.value)}
                    placeholder="e.g. QP-2026-9821"
                    className="text-xs border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Compensation Amount (₹)</Label>
                  <Input
                    type="number"
                    value={compAmount}
                    onChange={(e) => setCompAmount(parseFloat(e.target.value) || 0)}
                    placeholder="150"
                    className="text-xs font-mono font-bold border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Credit Mode</Label>
                  <select
                    value={compMode}
                    onChange={(e) => setCompMode(e.target.value as any)}
                    className="w-full h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-900 focus:border-zinc-950 focus:outline-none"
                  >
                    <option value="WALLET_CREDIT">QuickPress Wallet Credit</option>
                    <option value="BANK_TRANSFER">Direct Bank UPI Refund</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-900">Reason</Label>
                <Input
                  value={compReason}
                  onChange={(e) => setCompReason(e.target.value)}
                  placeholder="e.g. Garment delivery delay compensation"
                  className="text-xs border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                />
              </div>

              {compMode === "BANK_TRANSFER" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-900">Bank UTR Number</Label>
                  <Input
                    value={compUtr}
                    onChange={(e) => setCompUtr(e.target.value)}
                    placeholder="e.g. UPI/128394829392"
                    className="text-xs font-mono border-zinc-200 focus:border-zinc-950 rounded-xl h-10"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompensationOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={compAmount <= 0 || compensationMutation.isPending}
                onClick={() => {
                  compensationMutation.mutate({
                    customerId: compCustomerId || "cust_direct",
                    customerName: compCustomerName || "Customer",
                    customerPhone: compCustomerPhone,
                    orderId: compOrderId || undefined,
                    amount: compAmount,
                    reason: compReason,
                    mode: compMode,
                    utr: compUtr || undefined,
                  });
                }}
                className="bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black gap-1.5"
              >
                <Check className="size-3.5" />
                <span>Issue Compensation</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL 5: FULL WEEKLY CYCLE STATEMENT BREAKDOWN SUMMARY
         ========================================================================= */}
      {statementRecord && (
        <Dialog open={!!statementRecord} onOpenChange={(open) => !open && setStatementRecord(null)}>
          <DialogContent className="sm:max-w-[620px] p-6 rounded-2xl bg-white border-zinc-200">
            <DialogHeader className="border-b border-zinc-200 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-black text-zinc-950">
                    Official Weekly Settlement Statement
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500">
                    Cycle: {cycle.startDate} to {cycle.endDate} • TRD 1.0 Double-Entry Reconciled
                  </DialogDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintStatement}
                  className="h-8 text-xs font-bold gap-1 rounded-xl"
                >
                  <Printer className="size-3.5" />
                  <span>Print</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Entity Profile Header */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-950">{statementRecord.name}</span>
                  <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    {statementRecord.entityType}
                  </span>
                </div>
                <div className="text-xs text-zinc-600">
                  Phone: {statementRecord.phone} • City: {statementRecord.city}
                </div>
                <div className="text-xs text-zinc-600 font-mono">
                  Bank: {statementRecord.bankDetails?.bankName} • {statementRecord.bankDetails?.accountNumberMasked} (
                  {statementRecord.bankDetails?.ifsc})
                </div>
              </div>

              {/* Granular Breakdown Ledger */}
              <div className="rounded-xl border border-zinc-200 overflow-hidden text-xs">
                <div className="bg-zinc-100/80 px-3.5 py-2 font-black uppercase text-[10px] text-zinc-600 tracking-wider">
                  Weekly Ledger Calculations
                </div>
                <div className="divide-y divide-zinc-200">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-zinc-600 font-medium">Delivered Volume / Orders:</span>
                    <span className="font-bold text-zinc-950">{statementRecord.orderCount}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-zinc-600 font-medium">Gross Services Total:</span>
                    <span className="font-bold text-zinc-950 tabular-nums">
                      ₹{statementRecord.gross.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-zinc-600 font-medium">Platform Fee & TDS Deductions:</span>
                    <span className="font-bold text-rose-600 tabular-nums">
                      -₹{statementRecord.deductions.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-zinc-600 font-medium">Milestone Bonus & Incentive:</span>
                    <span className="font-bold text-purple-600 tabular-nums">
                      {statementRecord.bonus > 0 ? `+₹${statementRecord.bonus.toLocaleString("en-IN")}` : "₹0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-3 bg-emerald-50/70 border-t border-emerald-200">
                    <span className="text-xs font-black text-emerald-950">Net Disbursed Settlement:</span>
                    <span className="text-base font-black text-emerald-700 tabular-nums">
                      ₹{statementRecord.net.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Settlement UTR Verification */}
              <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Bank UTR / Transaction Reference
                </div>
                <div className="font-mono text-sm font-black text-zinc-900 flex items-center justify-between">
                  <span>{statementRecord.utr || "Pending Disbursal"}</span>
                  {statementRecord.utr && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(statementRecord.utr!, "Bank UTR")}
                      className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-sans font-bold"
                    >
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </button>
                  )}
                </div>
                {statementRecord.paidAt && (
                  <div className="text-[10px] text-zinc-400 font-medium">
                    Settled at: {new Date(statementRecord.paidAt).toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatementRecord(null)}
                className="rounded-xl text-xs font-bold w-full"
              >
                Close Statement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
