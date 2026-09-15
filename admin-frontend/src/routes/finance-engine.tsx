import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  DollarSign,
  Percent,
  Truck,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Save,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  HelpCircle,
  Eye,
  Calendar,
  Sparkles,
  Building2,
  Bike,
  User,
  IndianRupee,
  Sliders,
  Check,
  X,
  Plus,
  Receipt,
  Scale,
  CreditCard,
  Ban,
  Activity,
  History,
  TrendingUp,
  Gift,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { DataTable, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import {
  fetchFinancialRules,
  updateFinancialRules,
  fetchFinancialSummary,
  fetchOrderFinancials,
  fetchSettlementBatches,
  generateSettlementBatch,
  approveSettlementBatch,
  payoutSettlementBatch,
  fetchAuditLogs,
  processRefund,
  applyPenalty,
  fetchLoyaltyCampaignConfig,
  updateLoyaltyCampaignConfig,
  type FinancialRules,
  type FinancialSummaryMetrics,
  type OrderFinancialObject,
  type FinancialLedgerEntry,
  type SettlementBatch,
  type LoyaltyCampaignConfig,
} from "../api/finance-api";

export const DEFAULT_FINANCIAL_RULES: any = {
  pricing: {
    platformFee: "10",
    handlingFee: "15",
    minimumOrderValue: "99",
    expressMultiplier: "1.35",
    surgeMultiplier: "1.0",
  },
  gst: {
    laundryGstPercent: "5",
    platformGstPercent: "18",
    deliveryGstPercent: "18",
    tcsPercent: "1",
    quickpressGstin: "09AAECQ1234F1Z5",
    defaultState: "Uttar Pradesh",
  },
  commission: {
    standardPercent: "18",
    silverPercent: "15",
    goldPercent: "12",
    silverThreshold: "100",
    goldThreshold: "300",
    captainCommissionRate: 0.0,
  },
  delivery: {
    baseFee: "30",
    baseDistanceKm: "2.0",
    perKmRate: "8.0",
    slabs: [
      { minKm: 0.0, maxKm: 2.0, fee: "30" },
      { minKm: 2.0, maxKm: 5.0, fee: "40" },
      { minKm: 5.0, maxKm: 8.0, fee: "60" },
      { minKm: 8.0, maxKm: 12.0, fee: "90" },
      { minKm: 12.0, maxKm: 999.0, fee: "120" },
    ],
    freeDeliveryThreshold: "499",
    subsidyFundingSource: "QUICKPRESS_FUNDED",
    nightSurge: "25",
    rainSurge: "20",
  },
  cancellation: {
    ORDER_PLACED: { cancellationFee: "0", refundPct: "100", allowCancel: true },
    PARTNER_ACCEPTED: { cancellationFee: "0", refundPct: "100", allowCancel: true },
    PICKUP_ASSIGNED: { cancellationFee: "20", refundPct: "90", allowCancel: true },
    PICKUP_ARRIVED: { cancellationFee: "40", refundPct: "80", allowCancel: true },
    PICKED_UP: { cancellationFee: "60", refundPct: "50", allowCancel: true },
    AT_STORE: { cancellationFee: "75", refundPct: "40", allowCancel: true },
    PROCESSING: { cancellationFee: "100", refundPct: "25", allowCancel: true },
    READY: { cancellationFee: "150", refundPct: "10", allowCancel: false },
    OUT_FOR_DELIVERY: { cancellationFee: "200", refundPct: "0", allowCancel: false },
    DELIVERED: { cancellationFee: "0", refundPct: "0", allowCancel: false },
  },
  incentives: {
    candyCrushLevels: [
      { level: 1, title: "Rookie Kickoff", target: "1", reward: "25", badge: "🍬", flavor: "Strawberry Jelly" },
      { level: 2, title: "Sugar Street Cruiser", target: "3", reward: "60", badge: "🍭", flavor: "Citrus Swirl" },
      { level: 3, title: "Speedster Star", target: "5", reward: "120", badge: "⭐", flavor: "Golden Honey" },
      { level: 4, title: "Rush Hour Hero", target: "7", reward: "180", badge: "⚡", flavor: "Mint Sparkle" },
      { level: 5, title: "Super Captain", target: "10", reward: "280", badge: "🚀", flavor: "Blueberry Blast" },
      { level: 6, title: "Thunder Rider", target: "12", reward: "360", badge: "🔥", flavor: "Grape Punch" },
      { level: 7, title: "Fleet Master", target: "15", reward: "480", badge: "💎", flavor: "Cotton Candy" },
      { level: 8, title: "Grand Champion", target: "18", reward: "620", badge: "🏆", flavor: "Cherry Pop" },
      { level: 9, title: "Legendary Streak", target: "22", reward: "820", badge: "👑", flavor: "Royal Velvet" },
      { level: 10, title: "Kasganj Supreme King", target: "25", reward: "1100", badge: "✨", flavor: "Golden Jackpot" },
    ],
    riderDaily: [
      { trips: "5", reward: "100" },
      { trips: "10", reward: "250" },
      { trips: "15", reward: "450" },
    ],
    riderWeeklyStreak: { trips: "50", reward: "800" },
    partnerVolume: [
      { orders: "20", reward: "300" },
      { orders: "50", reward: "1000" },
      { orders: "100", reward: "2500" },
    ],
  },
  lateFee: {
    gracePeriodMinutes: "15",
    slabs: [
      { minDelayMin: 16, maxDelayMin: 30, fee: "20" },
      { minDelayMin: 31, maxDelayMin: 60, fee: "50" },
      { minDelayMin: 61, maxDelayMin: 9999, fee: "100" },
    ],
    classification: "CUSTOMER_COMPENSATION",
  },
  penalties: {
    orderRejection: "50",
    latePickup: "30",
    lateDelivery: "50",
    orderMishandling: "150",
    customerComplaint: "100",
    missingItem: "250",
    damagedItem: "300",
    falseStatusUpdate: "100",
  },
  settlement: {
    cycle: "WEEKLY",
    payoutDay: "WEDNESDAY",
    autoApproveMaxAmount: "50000",
    requirePanTcs: true,
    tcsRate: 0.01,
    minSettlementPayout: "100",
  },
  expressPickup: {
    enabled: true,
    fee: "40",
    partnerSharePercent: "20",
    riderSharePercent: "80",
  },
};

function mapServerRulesToForm(data: FinancialRules): any {
  return {
    pricing: {
      platformFee: String(data.pricing?.platformFee ?? 10),
      handlingFee: String(data.pricing?.handlingFee ?? 15),
      minimumOrderValue: String(data.pricing?.minimumOrderValue ?? 99),
      expressMultiplier: String(data.pricing?.expressMultiplier ?? 1.35),
      surgeMultiplier: String(data.pricing?.surgeMultiplier ?? 1.0),
    },
    gst: {
      laundryGstPercent: String(Math.round((data.gst?.laundryGstRate ?? 0.05) * 10000) / 100),
      platformGstPercent: String(Math.round((data.gst?.platformGstRate ?? 0.18) * 10000) / 100),
      deliveryGstPercent: String(Math.round((data.gst?.deliveryGstRate ?? 0.18) * 10000) / 100),
      tcsPercent: String(Math.round((data.gst?.tcsRate ?? 0.01) * 10000) / 100),
      quickpressGstin: String(data.gst?.quickpressGstin ?? "09AAECQ1234F1Z5"),
      defaultState: String(data.gst?.defaultState ?? "Uttar Pradesh"),
    },
    commission: {
      standardPercent: String(Math.round((data.commission?.standardRate ?? 0.18) * 10000) / 100),
      silverPercent: String(Math.round((data.commission?.silverRate ?? 0.15) * 10000) / 100),
      goldPercent: String(Math.round((data.commission?.goldRate ?? 0.12) * 10000) / 100),
      silverThreshold: String(data.commission?.silverThreshold ?? 100),
      goldThreshold: String(data.commission?.goldThreshold ?? 300),
      captainCommissionRate: data.commission?.captainCommissionRate ?? 0.0,
    },
    delivery: {
      baseFee: String(data.delivery?.baseFee ?? 30),
      baseDistanceKm: String(data.delivery?.baseDistanceKm ?? 2.0),
      perKmRate: String(data.delivery?.perKmRate ?? 8.0),
      slabs: (data.delivery?.slabs || DEFAULT_FINANCIAL_RULES.delivery.slabs).map((s: any) => ({
        minKm: s.minKm,
        maxKm: s.maxKm,
        fee: String(s.fee ?? 30),
      })),
      freeDeliveryThreshold: String(data.delivery?.freeDeliveryThreshold ?? 499),
      subsidyFundingSource: data.delivery?.subsidyFundingSource ?? "QUICKPRESS_FUNDED",
      nightSurge: String(data.delivery?.nightSurge ?? 25),
      rainSurge: String(data.delivery?.rainSurge ?? 20),
    },
    cancellation: Object.fromEntries(
      Object.entries(data.cancellation || DEFAULT_FINANCIAL_RULES.cancellation).map(([stage, val]: [string, any]) => [
        stage,
        {
          cancellationFee: String(val.cancellationFee ?? 0),
          refundPct: String(val.refundPct ?? 100),
          allowCancel: Boolean(val.allowCancel),
        },
      ])
    ),
    incentives: {
      candyCrushLevels: (data.incentives?.candyCrushLevels && data.incentives.candyCrushLevels.length > 0
        ? data.incentives.candyCrushLevels
        : DEFAULT_FINANCIAL_RULES.incentives.candyCrushLevels
      ).map((l: any, idx: number) => ({
        level: Number(l.level ?? idx + 1),
        title: String(l.title ?? `Level ${idx + 1}`),
        target: String(l.target ?? (idx + 1) * 2),
        reward: String(l.reward ?? (idx + 1) * 30),
        badge: String(l.badge ?? "🍬"),
        flavor: String(l.flavor ?? ""),
        description: String(l.description ?? ""),
      })),
      riderDaily: (data.incentives?.riderDaily || DEFAULT_FINANCIAL_RULES.incentives.riderDaily).map((t: any) => ({
        trips: String(t.trips ?? 5),
        reward: String(t.reward ?? 100),
      })),
      riderWeeklyStreak: {
        trips: String(data.incentives?.riderWeeklyStreak?.trips ?? 50),
        reward: String(data.incentives?.riderWeeklyStreak?.reward ?? 800),
      },
      partnerVolume: (data.incentives?.partnerVolume || DEFAULT_FINANCIAL_RULES.incentives.partnerVolume).map((t: any) => ({
        orders: String(t.orders ?? 20),
        reward: String(t.reward ?? 300),
      })),
    },
    lateFee: {
      gracePeriodMinutes: String(data.lateFee?.gracePeriodMinutes ?? 15),
      slabs: (data.lateFee?.slabs || DEFAULT_FINANCIAL_RULES.lateFee.slabs).map((s: any) => ({
        minDelayMin: s.minDelayMin,
        maxDelayMin: s.maxDelayMin,
        fee: String(s.fee ?? 20),
      })),
      classification: data.lateFee?.classification ?? "CUSTOMER_COMPENSATION",
    },
    penalties: Object.fromEntries(
      Object.entries(data.penalties || DEFAULT_FINANCIAL_RULES.penalties).map(([type, amount]) => [
        type,
        String(amount ?? 0),
      ])
    ),
    settlement: {
      cycle: data.settlement?.cycle ?? "WEEKLY",
      payoutDay: data.settlement?.payoutDay ?? "WEDNESDAY",
      autoApproveMaxAmount: String(data.settlement?.autoApproveMaxAmount ?? 50000),
      requirePanTcs: Boolean(data.settlement?.requirePanTcs ?? true),
      tcsRate: data.settlement?.tcsRate ?? 0.01,
      minSettlementPayout: String(data.settlement?.minSettlementPayout ?? 100),
    },
    expressPickup: {
      enabled: Boolean(data.expressPickup?.enabled ?? true),
      fee: String(data.expressPickup?.fee ?? 40),
      partnerSharePercent: String(data.expressPickup?.partnerSharePercent ?? 20),
      riderSharePercent: String(data.expressPickup?.riderSharePercent ?? 80),
    },
  };
}

function prepareRulesForSave(raw: any): FinancialRules {
  return {
    pricing: {
      platformFee: Number(raw?.pricing?.platformFee) || 0,
      handlingFee: Number(raw?.pricing?.handlingFee) || 0,
      minimumOrderValue: Number(raw?.pricing?.minimumOrderValue) || 0,
      expressMultiplier: Number(raw?.pricing?.expressMultiplier) || 1.0,
      surgeMultiplier: Number(raw?.pricing?.surgeMultiplier) || 1.0,
    },
    gst: {
      laundryGstRate: (parseFloat(raw?.gst?.laundryGstPercent) || 0) / 100,
      platformGstRate: (parseFloat(raw?.gst?.platformGstPercent) || 0) / 100,
      deliveryGstRate: (parseFloat(raw?.gst?.deliveryGstPercent) || 0) / 100,
      tcsRate: (parseFloat(raw?.gst?.tcsPercent) || 0) / 100,
      tdsRate: 0.01,
      quickpressGstin: String(raw?.gst?.quickpressGstin || "").trim().toUpperCase(),
      defaultState: String(raw?.gst?.defaultState || "Uttar Pradesh").trim(),
    },
    commission: {
      standardRate: (parseFloat(raw?.commission?.standardPercent) || 0) / 100,
      silverRate: (parseFloat(raw?.commission?.silverPercent) || 0) / 100,
      goldRate: (parseFloat(raw?.commission?.goldPercent) || 0) / 100,
      silverThreshold: Number(raw?.commission?.silverThreshold) || 100,
      goldThreshold: Number(raw?.commission?.goldThreshold) || 300,
      captainCommissionRate: 0.0,
    },
    delivery: {
      baseFee: Number(raw?.delivery?.baseFee) || 0,
      baseDistanceKm: Number(raw?.delivery?.baseDistanceKm) || 2.0,
      perKmRate: Number(raw?.delivery?.perKmRate) || 8.0,
      slabs: (raw?.delivery?.slabs || []).map((s: any) => ({
        minKm: Number(s.minKm) || 0,
        maxKm: Number(s.maxKm) || 0,
        fee: Number(s.fee) || 0,
      })),
      freeDeliveryThreshold: Number(raw?.delivery?.freeDeliveryThreshold) || 0,
      subsidyFundingSource: raw?.delivery?.subsidyFundingSource || "QUICKPRESS_FUNDED",
      nightSurge: Number(raw?.delivery?.nightSurge) || 0,
      rainSurge: Number(raw?.delivery?.rainSurge) || 0,
    },
    cancellation: Object.fromEntries(
      Object.entries(raw?.cancellation || {}).map(([stage, val]: [string, any]) => [
        stage,
        {
          cancellationFee: Number(val.cancellationFee) || 0,
          refundPct: Number(val.refundPct) || 0,
          allowCancel: Boolean(val.allowCancel),
        },
      ])
    ),
    incentives: {
      candyCrushLevels: (raw?.incentives?.candyCrushLevels || DEFAULT_FINANCIAL_RULES.incentives.candyCrushLevels).map((l: any, idx: number) => ({
        level: Number(l.level) || idx + 1,
        title: String(l.title || `Level ${idx + 1}`),
        target: Number(l.target) || 1,
        reward: Number(l.reward) || 0,
        badge: String(l.badge || "🍬"),
        flavor: String(l.flavor || ""),
        description: String(l.description || ""),
      })),
      riderDaily: (raw?.incentives?.riderDaily || []).map((t: any) => ({
        trips: Number(t.trips) || 0,
        reward: Number(t.reward) || 0,
      })),
      riderWeeklyStreak: {
        trips: Number(raw?.incentives?.riderWeeklyStreak?.trips) || 50,
        reward: Number(raw?.incentives?.riderWeeklyStreak?.reward) || 800,
      },
      partnerVolume: (raw?.incentives?.partnerVolume || []).map((t: any) => ({
        orders: Number(t.orders) || 0,
        reward: Number(t.reward) || 0,
      })),
    },
    lateFee: {
      gracePeriodMinutes: Number(raw?.lateFee?.gracePeriodMinutes) || 15,
      slabs: (raw?.lateFee?.slabs || []).map((s: any) => ({
        minDelayMin: Number(s.minDelayMin) || 0,
        maxDelayMin: Number(s.maxDelayMin) || 0,
        fee: Number(s.fee) || 0,
      })),
      classification: raw?.lateFee?.classification || "CUSTOMER_COMPENSATION",
    },
    penalties: Object.fromEntries(
      Object.entries(raw?.penalties || {}).map(([type, amount]) => [
        type,
        Number(amount) || 0,
      ])
    ),
    settlement: {
      cycle: raw?.settlement?.cycle || "WEEKLY",
      payoutDay: raw?.settlement?.payoutDay || "WEDNESDAY",
      autoApproveMaxAmount: Number(raw?.settlement?.autoApproveMaxAmount) || 50000,
      requirePanTcs: Boolean(raw?.settlement?.requirePanTcs ?? true),
      tcsRate: 0.01,
      minSettlementPayout: Number(raw?.settlement?.minSettlementPayout) || 100,
    },
    expressPickup: {
      enabled: Boolean(raw?.expressPickup?.enabled ?? true),
      fee: Number(raw?.expressPickup?.fee) || 40,
      partnerSharePercent: Number(raw?.expressPickup?.partnerSharePercent) ?? 20,
      riderSharePercent: Number(raw?.expressPickup?.riderSharePercent) ?? 80,
    },
  };
}

export const Route = createFileRoute("/finance-engine")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "QuickPress Finance Engine — Unified Pricing, GST, Commission & Settlement",
      "Centralized financial governance across Customer, Laundry Partner, and Delivery Captain frontends."
    ),
  component: FinanceEnginePage,
});

export function FinanceEnginePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "rules" | "loyalty" | "ledger" | "settlements" | "audit"
  >("overview");

  // Sub-tab under rules
  const [rulesSubTab, setRulesSubTab] = useState<
    "pricing" | "gst" | "commission" | "delivery" | "cancellation" | "incentives" | "penalties" | "settlement"
  >("pricing");

  // Queries
  const summaryQuery = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: fetchFinancialSummary,
  });

  const rulesQuery = useQuery({
    queryKey: ["finance", "rules"],
    queryFn: fetchFinancialRules,
  });

  const settlementsQuery = useQuery({
    queryKey: ["finance", "settlements"],
    queryFn: fetchSettlementBatches,
  });

  const auditLogsQuery = useQuery({
    queryKey: ["finance", "audit-logs"],
    queryFn: () => fetchAuditLogs(50),
  });

  // Loyalty Campaign Query & State
  const loyaltyQuery = useQuery({
    queryKey: ["finance", "loyalty"],
    queryFn: fetchLoyaltyCampaignConfig,
  });

  const [loyaltyForm, setLoyaltyForm] = useState<Partial<LoyaltyCampaignConfig>>({
    isActive: true,
    title: "Order Loyalty Delight",
    description: "Earn scratch cards on every delivered order and convert points to real wallet cash!",
    totalBudgetRupees: 50000,
    targetOrdersCount: 5000,
    pointsPerRupee: 10,
    minPointsPerCard: 10,
    maxPointsPerCard: 200,
  });

  useEffect(() => {
    if (loyaltyQuery.data) {
      setLoyaltyForm(loyaltyQuery.data);
    }
  }, [loyaltyQuery.data]);

  const updateLoyaltyMutation = useMutation({
    mutationFn: (data: Partial<LoyaltyCampaignConfig>) => updateLoyaltyCampaignConfig(data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["finance", "loyalty"] });
      setLoyaltyForm(updated);
      toast.success("Loyalty campaign rules & budget successfully updated! 🎉");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update loyalty campaign configuration");
    },
  });

  // Local editable rules copy initialized immediately so inputs are NEVER null/locked
  const [editableRules, setEditableRules] = useState<any>(DEFAULT_FINANCIAL_RULES);
  const [isDirty, setIsDirty] = useState(false);
  const [saveReason, setSaveReason] = useState("");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Sync loaded rules into editable copy on fetch
  useEffect(() => {
    if (rulesQuery.data && !isDirty) {
      setEditableRules(mapServerRulesToForm(rulesQuery.data));
    }
  }, [rulesQuery.data, isDirty]);

  // Robust field updater that safely updates nested state without blocking keystrokes
  const updateField = (path: string, val: any) => {
    setIsDirty(true);
    setEditableRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
      const parts = path.split(".");
      let curr = next;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!curr[parts[i]]) curr[parts[i]] = {};
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = val;
      return next;
    });
  };

  // Order Ledger Search
  const [searchOrderId, setSearchOrderId] = useState("");
  const [inspectedOrder, setInspectedOrder] = useState<{
    financials: OrderFinancialObject;
    ledger: FinancialLedgerEntry[];
    totalLedgerEntries: number;
  } | null>(null);
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);

  const handleSearchOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchOrderId.trim()) {
      toast.error("Please enter an Order ID");
      return;
    }
    setIsSearchingOrder(true);
    try {
      const res = await fetchOrderFinancials(searchOrderId.trim());
      setInspectedOrder(res);
      toast.success(`Loaded financial object for ${searchOrderId.trim()}`);
    } catch (err: any) {
      toast.error(err?.message || `Order ${searchOrderId} not found`);
      setInspectedOrder(null);
    } finally {
      setIsSearchingOrder(false);
    }
  };

  // Rule Save Mutation
  const saveRulesMutation = useMutation({
    mutationFn: async () => {
      const sanitized = prepareRulesForSave(editableRules);
      return await updateFinancialRules(sanitized, saveReason || "Admin Rule Update");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "rules"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "audit-logs"] });
      setIsSaveModalOpen(false);
      setSaveReason("");
      setIsDirty(false);
      toast.success("Financial rules updated & live across full project! 🚀");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update rules");
    },
  });

  // Settlement Batch Generation
  const generateSettlementMutation = useMutation({
    mutationFn: async () => await generateSettlementBatch(),
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ["finance", "settlements"] });
      toast.success(`Settlement Batch ${batch.cycleId} generated! 💰`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to generate settlement batch");
    },
  });

  const approveBatchMutation = useMutation({
    mutationFn: async (batchId: string) => await approveSettlementBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "settlements"] });
      toast.success("Settlement batch approved for disbursement! ✅");
    },
  });

  const payoutBatchMutation = useMutation({
    mutationFn: async ({ batchId, payoutRef }: { batchId: string; payoutRef: string }) =>
      await payoutSettlementBatch(batchId, payoutRef),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "settlements"] });
      toast.success("Settlement batch marked as PAID! 💸");
    },
  });

  const metrics = summaryQuery.data || {
    totalOrders: 0,
    grossMerchandiseValue: 0,
    customerCollections: 0,
    quickpressCommission: 0,
    totalGstCollected: 0,
    deliverySubsidies: 0,
    partnerPayables: 0,
    riderPayables: 0,
    refundsDisbursed: 0,
    quickpressNetRevenue: 0,
    currency: "INR",
  };

  return (
    <AdminShell
      title="QuickPress Finance Engine"
      subtitle="Unified Financial, Pricing, GST, Commission & Settlement Control Center"
    >
      <div className="space-y-6">
        {/* Top Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
              <Landmark className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                Finance Engine
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  Live v1.0
                </span>
              </h1>
              <p className="text-xs text-zinc-500 font-medium">
                Governing Customer Pricing, Laundry Merchant Payouts & Captain Delivery Fares
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                summaryQuery.refetch();
                rulesQuery.refetch();
                settlementsQuery.refetch();
                auditLogsQuery.refetch();
                toast.success("Financial metrics refreshed from Supabase!");
              }}
              className="gap-1.5 font-bold"
            >
              <RefreshCw className="size-3.5" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => generateSettlementMutation.mutate()}
              disabled={generateSettlementMutation.isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <DollarSign className="size-3.5" />
              <span>Run Weekly Settlement</span>
            </Button>
          </div>
        </div>

        {/* Primary Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-6 w-full bg-zinc-100 p-1 rounded-xl h-auto">
            <TabsTrigger value="overview" className="font-bold text-xs py-2.5 flex items-center gap-1.5">
              <Activity className="size-3.5" />
              <span>Overview & P&L</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="font-bold text-xs py-2.5 flex items-center gap-1.5">
              <Sliders className="size-3.5" />
              <span>Rules & Engine Control</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="font-bold text-xs py-2.5 flex items-center gap-1.5 text-amber-800 data-[state=active]:text-amber-900">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Loyalty Rewards</span>
            </TabsTrigger>
            <TabsTrigger value="ledger" className="font-bold text-xs py-2.5 flex items-center gap-1.5">
              <FileText className="size-3.5" />
              <span>Single Order Ledger</span>
            </TabsTrigger>
            <TabsTrigger value="settlements" className="font-bold text-xs py-2.5 flex items-center gap-1.5">
              <Landmark className="size-3.5" />
              <span>Settlements & Payouts</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="font-bold text-xs py-2.5 flex items-center gap-1.5">
              <History className="size-3.5" />
              <span>Audit Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* =========================================================================
              TAB 1: FINANCIAL OVERVIEW & LIVE METRICS
             ========================================================================= */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Gross Merchandise Value (GMV)"
                value={`₹${metrics.grossMerchandiseValue.toLocaleString("en-IN")}`}
                subtitle={`Across ${metrics.totalOrders} total orders`}
                icon={<TrendingUp className="size-4" />}
              />
              <KpiCard
                title="Customer Collections"
                value={`₹${metrics.customerCollections.toLocaleString("en-IN")}`}
                subtitle="Net paid via Razorpay/UPI/Cards"
                icon={<CheckCircle2 className="size-4" />}
              />
              <KpiCard
                title="QuickPress Commission"
                value={`₹${metrics.quickpressCommission.toLocaleString("en-IN")}`}
                subtitle="Platform take rate (12% - 18%)"
                icon={<Percent className="size-4" />}
              />
              <KpiCard
                title="Net Platform Revenue"
                value={`₹${metrics.quickpressNetRevenue.toLocaleString("en-IN")}`}
                subtitle="Commission + fees - subsidies"
                icon={<DollarSign className="size-4" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Total GST Collected"
                value={`₹${metrics.totalGstCollected.toLocaleString("en-IN")}`}
                subtitle="5% Fabric + 18% Platform & Delivery"
                icon={<Scale className="size-4" />}
              />
              <KpiCard
                title="Delivery Subsidies"
                value={`₹${metrics.deliverySubsidies.toLocaleString("en-IN")}`}
                subtitle="QuickPress-funded free delivery"
                icon={<Truck className="size-4" />}
              />
              <KpiCard
                title="Laundry Partner Payables"
                value={`₹${metrics.partnerPayables.toLocaleString("en-IN")}`}
                subtitle="Net processing revenue to merchants"
                icon={<Building2 className="size-4" />}
              />
              <KpiCard
                title="Delivery Captain Payables"
                value={`₹${metrics.riderPayables.toLocaleString("en-IN")}`}
                subtitle="100% net delivery trip fares"
                icon={<Bike className="size-4" />}
              />
            </div>

            {/* Architecture Explainer Card */}
            <SectionCard title="QuickPress Unified Financial Architecture">
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3 font-mono text-xs leading-relaxed border border-slate-800">
                <div className="text-emerald-400 font-bold flex items-center gap-2">
                  <ShieldCheck className="size-4" />
                  <span>TRD 1.0 PRINCIPLE: ONE ORDER → ONE FINANCIAL LEDGER → COMPLETE IMMUTABILITY</span>
                </div>
                <p className="text-slate-300">
                  QuickPress acts as a pure technology marketplace. Laundry processing is fulfilled by store partners;
                  pickup & delivery is handled by captains. The Finance Engine governs live pricing at checkout,
                  splits GST by service type, applies tiered commission slabs, tracks free-delivery funding sources,
                  and maintains double-entry immutable ledgers for audit compliance.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px]">
                  <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-emerald-400 font-bold block mb-1">CUSTOMER FACING</span>
                    Service Subtotal + Distance Delivery Fee + Platform Fee + Taxes - Promo = Final Payable
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-sky-400 font-bold block mb-1">MERCHANT SETTLEMENT</span>
                    Gross Service Amount - Platform Commission (18%/15%/12%) - TCS (1%) ± Penalties/Incentives
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                    <span className="text-amber-400 font-bold block mb-1">CAPTAIN SETTLEMENT</span>
                    Base Fare (₹30) + Distance (₹8/km) + Surge (Rain/Night) + 100% Tips (0% Platform Cut)
                  </div>
                </div>
              </div>
            </SectionCard>
          </TabsContent>

          {/* =========================================================================
              TAB 2: ENGINE RULES & CONTROL CENTER (THE 8 SUB-ENGINES)
             ========================================================================= */}
          <TabsContent value="rules" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-emerald-600" />
                <span className="text-xs font-bold text-zinc-800">
                  Select Sub-Engine to Configure:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsSaveModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
                >
                  <Save className="size-3.5" />
                  <span>Save Rule Changes</span>
                </Button>
              </div>
            </div>

            {/* Sub Tabs */}
            <Tabs value={rulesSubTab} onValueChange={(v) => setRulesSubTab(v as any)}>
              <TabsList className="flex flex-wrap gap-1 bg-transparent p-0 h-auto">
                <TabsTrigger value="pricing" className="border font-bold text-xs">Pricing & Fees</TabsTrigger>
                <TabsTrigger value="gst" className="border font-bold text-xs">GST Engine</TabsTrigger>
                <TabsTrigger value="commission" className="border font-bold text-xs">Commission Slabs</TabsTrigger>
                <TabsTrigger value="delivery" className="border font-bold text-xs">Delivery & Distance</TabsTrigger>
                <TabsTrigger value="cancellation" className="border font-bold text-xs">Cancellation & Refunds</TabsTrigger>
                <TabsTrigger value="incentives" className="border font-bold text-xs">Incentives</TabsTrigger>
                <TabsTrigger value="penalties" className="border font-bold text-xs">Late Fees & Penalties</TabsTrigger>
                <TabsTrigger value="settlement" className="border font-bold text-xs">Settlement Cycle</TabsTrigger>
              </TabsList>

              {/* 1. PRICING SUB-TAB */}
              <TabsContent value="pricing" className="mt-4">
                <SectionCard title="Pricing Engine & Platform Fees">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Platform Convenience Fee (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.pricing?.platformFee ?? ""}
                        onChange={(e) => updateField("pricing.platformFee", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Handling & Packaging Fee (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.pricing?.handlingFee ?? ""}
                        onChange={(e) => updateField("pricing.handlingFee", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Minimum Order Value (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.pricing?.minimumOrderValue ?? ""}
                        onChange={(e) => updateField("pricing.minimumOrderValue", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Express 24-Hr Turnaround Multiplier</Label>
                      <Input
                        type="number"
                        step="0.05"
                        value={editableRules?.pricing?.expressMultiplier ?? ""}
                        onChange={(e) => updateField("pricing.expressMultiplier", e.target.value)}
                        className="mt-1 font-bold"
                      />
                      <span className="text-[10px] text-zinc-500">1.35 = +35% on standard laundry price</span>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Demand Surge Multiplier</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editableRules?.pricing?.surgeMultiplier ?? ""}
                        onChange={(e) => updateField("pricing.surgeMultiplier", e.target.value)}
                        className="mt-1 font-bold"
                      />
                      <span className="text-[10px] text-zinc-500">1.0 = normal, 1.2 = +20% peak demand</span>
                    </div>
                  </div>
                </SectionCard>

                {/* Express Pickup & Split Configuration */}
                <SectionCard
                  title="⚡ Express Pickup & Revenue Sharing (Customer → Partner 20% / Rider 80%)"
                >
                  <div className="p-4 rounded-xl border bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                          <Zap className="w-5 h-5 fill-amber-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                            Express 15-Minute Priority Pickup Engine
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black">
                              {editableRules?.expressPickup?.enabled !== false ? "ACTIVE" : "DISABLED"}
                            </span>
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Customer checkout feature for priority pickup. Charged fee is dynamically routed to Partner (bonus) and Rider (earnings boost).
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label htmlFor="express-enabled-toggle" className="text-xs font-bold cursor-pointer">
                          Enable Express
                        </Label>
                        <Switch
                          id="express-enabled-toggle"
                          checked={editableRules?.expressPickup?.enabled !== false}
                          onCheckedChange={(checked) => updateField("expressPickup.enabled", checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-amber-500" />
                        Customer Express Fee (₹)
                      </Label>
                      <Input
                        type="number"
                        value={editableRules?.expressPickup?.fee ?? "40"}
                        onChange={(e) => updateField("expressPickup.fee", e.target.value)}
                        className="mt-1 font-bold text-amber-600 dark:text-amber-400"
                        placeholder="40"
                      />
                      <span className="text-[10px] text-zinc-500">Charged to customer at checkout bill</span>
                    </div>

                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        Partner (Store) Share (%)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editableRules?.expressPickup?.partnerSharePercent ?? "20"}
                        onChange={(e) => updateField("expressPickup.partnerSharePercent", e.target.value)}
                        className="mt-1 font-bold text-blue-600 dark:text-blue-400"
                        placeholder="20"
                      />
                      <span className="text-[10px] text-zinc-500">Credited directly to Partner order payout</span>
                    </div>

                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5 text-emerald-500" />
                        Rider (Captain) Share (%)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editableRules?.expressPickup?.riderSharePercent ?? "80"}
                        onChange={(e) => updateField("expressPickup.riderSharePercent", e.target.value)}
                        className="mt-1 font-bold text-emerald-600 dark:text-emerald-400"
                        placeholder="80"
                      />
                      <span className="text-[10px] text-zinc-500">Added as instant surge bonus to Captain trip fare</span>
                    </div>
                  </div>

                  {/* Live Revenue Split Breakdown Preview */}
                  {(() => {
                    const fee = Number(editableRules?.expressPickup?.fee) || 40;
                    const partnerPct = Number(editableRules?.expressPickup?.partnerSharePercent) ?? 20;
                    const riderPct = Number(editableRules?.expressPickup?.riderSharePercent) ?? 80;
                    const partnerAmount = Math.round((fee * (partnerPct / 100)) * 100) / 100;
                    const riderAmount = Math.round((fee * (riderPct / 100)) * 100) / 100;
                    const totalPct = partnerPct + riderPct;
                    const isRatioMismatched = totalPct !== 100;

                    return (
                      <div className="mt-4 p-4 rounded-xl border bg-muted/40 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1.5 text-foreground">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            Live Revenue Split Preview (Per Express Order)
                          </span>
                          {isRatioMismatched ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Total is {totalPct}% (Expected 100%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              100% Balanced Split
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div className="p-3 rounded-lg border bg-background/60">
                            <div className="text-[11px] text-muted-foreground font-medium">Customer Express Charge</div>
                            <div className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                              ₹{fee.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-zinc-500">Collected at checkout</div>
                          </div>

                          <div className="p-3 rounded-lg border bg-background/60">
                            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-blue-500" />
                              Partner Bonus ({partnerPct}%)
                            </div>
                            <div className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                              +₹{partnerAmount.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-zinc-500">Partner Alert: EXPRESS + {partnerPct}% BONUS</div>
                          </div>

                          <div className="p-3 rounded-lg border bg-background/60">
                            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Bike className="w-3 h-3 text-emerald-500" />
                              Captain Bonus ({riderPct}%)
                            </div>
                            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                              +₹{riderAmount.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-zinc-500">Captain Alert: EXPRESS PICKUP + {riderPct}% BONUS</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </SectionCard>
              </TabsContent>

              {/* 2. GST SUB-TAB */}
              <TabsContent value="gst" className="mt-4">
                <SectionCard title="GST Taxation Engine & Compliance">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Laundry Fabric GST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editableRules?.gst?.laundryGstPercent ?? ""}
                        onChange={(e) => updateField("gst.laundryGstPercent", e.target.value)}
                        className="mt-1 font-bold"
                      />
                      <span className="text-[10px] text-zinc-500">Standard 5% under GST Council fabric cleaning codes</span>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Platform / Service Fee GST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editableRules?.gst?.platformGstPercent ?? ""}
                        onChange={(e) => updateField("gst.platformGstPercent", e.target.value)}
                        className="mt-1 font-bold"
                      />
                      <span className="text-[10px] text-zinc-500">Standard 18% on IT and marketplace platform service</span>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Delivery Fee GST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editableRules?.gst?.deliveryGstPercent ?? ""}
                        onChange={(e) => updateField("gst.deliveryGstPercent", e.target.value)}
                        className="mt-1 font-bold"
                      />
                      <span className="text-[10px] text-zinc-500">18% GST on customer logistics and delivery</span>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Section 194-O TCS Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={editableRules?.gst?.tcsPercent ?? ""}
                        onChange={(e) => updateField("gst.tcsPercent", e.target.value)}
                        className="mt-1 font-bold"
                      />
                      <span className="text-[10px] text-zinc-500">1% Tax Collected at Source on e-commerce participants</span>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">QuickPress Registered GSTIN</Label>
                      <Input
                        value={editableRules?.gst?.quickpressGstin ?? ""}
                        onChange={(e) => updateField("gst.quickpressGstin", e.target.value)}
                        className="mt-1 font-mono uppercase font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Home Operating State (Intra-state CGST/SGST)</Label>
                      <Input
                        value={editableRules?.gst?.defaultState ?? ""}
                        onChange={(e) => updateField("gst.defaultState", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* 3. COMMISSION SLABS SUB-TAB */}
              <TabsContent value="commission" className="mt-4">
                <SectionCard title="Commission Slabs & Partner Tiers">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-emerald-800 uppercase">Standard Tier</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">&lt; {editableRules?.commission?.silverThreshold ?? 100} orders</span>
                      </div>
                      <Label className="text-xs font-bold">Commission Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editableRules?.commission?.standardPercent ?? ""}
                        onChange={(e) => updateField("commission.standardPercent", e.target.value)}
                        className="mt-1 font-mono text-lg font-black"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-800 uppercase">Silver Tier</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-900 font-bold">{editableRules?.commission?.silverThreshold ?? 100} - {(Number(editableRules?.commission?.goldThreshold) || 300) - 1} orders</span>
                      </div>
                      <Label className="text-xs font-bold">Commission Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editableRules?.commission?.silverPercent ?? ""}
                        onChange={(e) => updateField("commission.silverPercent", e.target.value)}
                        className="mt-1 font-mono text-lg font-black"
                      />
                      <div className="mt-2">
                        <Label className="text-[11px] font-bold text-zinc-600">Order Threshold (Min)</Label>
                        <Input
                          type="number"
                          value={editableRules?.commission?.silverThreshold ?? ""}
                          onChange={(e) => updateField("commission.silverThreshold", e.target.value)}
                          className="mt-1 font-mono text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-amber-800 uppercase">Gold Tier</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">{editableRules?.commission?.goldThreshold ?? 300}+ orders</span>
                      </div>
                      <Label className="text-xs font-bold">Commission Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editableRules?.commission?.goldPercent ?? ""}
                        onChange={(e) => updateField("commission.goldPercent", e.target.value)}
                        className="mt-1 font-mono text-lg font-black"
                      />
                      <div className="mt-2">
                        <Label className="text-[11px] font-bold text-zinc-600">Order Threshold (Min)</Label>
                        <Input
                          type="number"
                          value={editableRules?.commission?.goldThreshold ?? ""}
                          onChange={(e) => updateField("commission.goldThreshold", e.target.value)}
                          className="mt-1 font-mono text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                    <ShieldCheck className="size-4 shrink-0 text-blue-600" />
                    <span>
                      <strong>Captain Commission Guarantee:</strong> Delivery Captains are charged <strong>0% commission</strong>.
                      100% of the customer logistics fare and customer tips are settled directly into the rider&apos;s wallet.
                    </span>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* 4. DELIVERY & DISTANCE SUB-TAB */}
              <TabsContent value="delivery" className="mt-4 space-y-4">
                <SectionCard title="Dynamic Delivery & Distance Engine">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Base Delivery Fee (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.delivery?.baseFee ?? ""}
                        onChange={(e) => updateField("delivery.baseFee", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Free Delivery Minimum Order (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.delivery?.freeDeliveryThreshold ?? ""}
                        onChange={(e) => updateField("delivery.freeDeliveryThreshold", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Free Delivery Subsidy Funding Source</Label>
                      <Select
                        value={editableRules?.delivery?.subsidyFundingSource ?? "QUICKPRESS_FUNDED"}
                        onValueChange={(v: any) => updateField("delivery.subsidyFundingSource", v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="QUICKPRESS_FUNDED">QuickPress Funded (Platform absorbs 100%)</SelectItem>
                          <SelectItem value="PARTNER_FUNDED">Partner Funded (Store absorbs 100%)</SelectItem>
                          <SelectItem value="SHARED_FUNDED">Shared 50/50 (Platform 50% / Store 50%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Rain Surge (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.delivery?.rainSurge ?? ""}
                        onChange={(e) => updateField("delivery.rainSurge", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Night Surge (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.delivery?.nightSurge ?? ""}
                        onChange={(e) => updateField("delivery.nightSurge", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                  </div>

                  <div className="border rounded-xl p-3 bg-zinc-50">
                    <h4 className="text-xs font-black text-zinc-900 uppercase mb-2">Distance Tier Slabs</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {(editableRules?.delivery?.slabs || []).map((slab: any, idx: number) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-zinc-200">
                          <span className="text-[11px] font-bold text-zinc-600 block mb-1">
                            {slab.minKm} - {slab.maxKm >= 999 ? "12+ KM" : `${slab.maxKm} KM`}
                          </span>
                          <Input
                            type="number"
                            value={slab.fee ?? ""}
                            onChange={(e) => {
                              setIsDirty(true);
                              setEditableRules((prev: any) => {
                                const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                if (!next.delivery.slabs[idx]) next.delivery.slabs[idx] = {};
                                next.delivery.slabs[idx].fee = e.target.value;
                                return next;
                              });
                            }}
                            className="font-mono font-bold"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* 5. CANCELLATION SUB-TAB */}
              <TabsContent value="cancellation" className="mt-4">
                <SectionCard title="Stage-Based Order Cancellation & Refund Matrix">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-100 font-black text-zinc-700 uppercase">
                        <tr>
                          <th className="p-2.5">Order Stage</th>
                          <th className="p-2.5">Cancellation Fee (₹)</th>
                          <th className="p-2.5">Customer Refund (%)</th>
                          <th className="p-2.5">Allow Customer Cancel?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {Object.entries(editableRules?.cancellation || {}).map(([stage, policy]: [string, any]) => (
                          <tr key={stage} className="hover:bg-zinc-50">
                            <td className="p-2.5 font-bold font-mono text-zinc-900">{stage}</td>
                            <td className="p-2.5">
                              <Input
                                type="number"
                                value={policy.cancellationFee ?? ""}
                                onChange={(e) => {
                                  setIsDirty(true);
                                  setEditableRules((prev: any) => {
                                    const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                    if (!next.cancellation[stage]) next.cancellation[stage] = {};
                                    next.cancellation[stage].cancellationFee = e.target.value;
                                    return next;
                                  });
                                }}
                                className="w-24 font-mono font-bold h-8"
                              />
                            </td>
                            <td className="p-2.5">
                              <Input
                                type="number"
                                value={policy.refundPct ?? ""}
                                onChange={(e) => {
                                  setIsDirty(true);
                                  setEditableRules((prev: any) => {
                                    const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                    if (!next.cancellation[stage]) next.cancellation[stage] = {};
                                    next.cancellation[stage].refundPct = e.target.value;
                                    return next;
                                  });
                                }}
                                className="w-24 font-mono font-bold h-8"
                              />
                            </td>
                            <td className="p-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDirty(true);
                                  setEditableRules((prev: any) => {
                                    const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                    if (!next.cancellation[stage]) next.cancellation[stage] = {};
                                    next.cancellation[stage].allowCancel = !next.cancellation[stage].allowCancel;
                                    return next;
                                  });
                                }}
                                className={`px-2.5 py-1 rounded text-xs font-bold ${
                                  policy.allowCancel
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {policy.allowCancel ? "Allowed" : "Blocked"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* 6. INCENTIVES SUB-TAB: CANDY CRUSH 10-LEVEL LADDER + VOLUME BONUSES */}
              <TabsContent value="incentives" className="mt-4 space-y-6">
                <SectionCard
                  title="Candy Crush 10-Level Captain Milestone Ladder"
                  badge={`${(editableRules?.incentives?.candyCrushLevels || []).length} Levels Active`}
                >
                  <div className="space-y-4">
                    {/* Hero Info & Quick Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-50 via-pink-50 to-emerald-50 rounded-2xl border border-amber-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🍬</span>
                          <h4 className="text-sm font-black text-zinc-900 leading-tight">
                            Live Level-Wise Bonus & Target Control
                          </h4>
                        </div>
                        <p className="text-xs text-zinc-600 mt-1 max-w-xl">
                          Admin can configure exact daily delivery targets, milestone names, and cash rewards for each level (1 to 10).
                          When you save, these rates sync live directly to every Captain's App in Kasganj!
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsDirty(true);
                            setEditableRules((prev: any) => {
                              const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                              next.incentives.candyCrushLevels = JSON.parse(
                                JSON.stringify(DEFAULT_FINANCIAL_RULES.incentives.candyCrushLevels)
                              );
                              return next;
                            });
                            toast.info("Reset to default 10-level ladder. Click 'Save Financial Rules' to apply.");
                          }}
                          className="text-xs font-bold bg-white hover:bg-zinc-100"
                        >
                          <RefreshCw className="size-3.5 mr-1" />
                          Reset Defaults
                        </Button>
                      </div>
                    </div>

                    {/* Total Bonus Pool Summary Badge */}
                    <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 rounded-xl text-xs font-bold text-zinc-700">
                      <span>Total Cumulative Bonus Pool (Lvl 1 - 10):</span>
                      <span className="font-mono text-emerald-700 font-black text-sm">
                        ₹
                        {(editableRules?.incentives?.candyCrushLevels || []).reduce(
                          (sum: number, l: any) => sum + (Number(l.reward) || 0),
                          0
                        ).toFixed(0)}
                      </span>
                    </div>

                    {/* 10-Level Matrix Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {(editableRules?.incentives?.candyCrushLevels || []).map((l: any, idx: number) => {
                        const targetTrips = Number(l.target) || 1;
                        const cashReward = Number(l.reward) || 0;
                        const extraPerRide = (cashReward / targetTrips).toFixed(1);

                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs hover:border-zinc-300 transition-all space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl drop-shadow-xs">{l.badge || "🍬"}</span>
                                <div>
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-zinc-900 text-white font-mono">
                                    LEVEL {l.level || idx + 1}
                                  </span>
                                  <span className="text-[11px] font-medium text-zinc-500 ml-2">
                                    {l.flavor || "Milestone"}
                                  </span>
                                </div>
                              </div>

                              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                                +₹{extraPerRide}/ride
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                              {/* Title Input */}
                              <div className="sm:col-span-1">
                                <Label className="text-[10px] font-bold text-zinc-500">Milestone Title</Label>
                                <Input
                                  value={l.title ?? ""}
                                  onChange={(e) => {
                                    setIsDirty(true);
                                    setEditableRules((prev: any) => {
                                      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                      if (!next.incentives.candyCrushLevels[idx]) next.incentives.candyCrushLevels[idx] = {};
                                      next.incentives.candyCrushLevels[idx].title = e.target.value;
                                      return next;
                                    });
                                  }}
                                  placeholder="Level Title"
                                  className="h-8 text-xs font-bold mt-1"
                                />
                              </div>

                              {/* Target Deliveries Input */}
                              <div>
                                <Label className="text-[10px] font-bold text-zinc-500">Target Rides</Label>
                                <div className="relative mt-1">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={l.target ?? ""}
                                    onChange={(e) => {
                                      setIsDirty(true);
                                      setEditableRules((prev: any) => {
                                        const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                        if (!next.incentives.candyCrushLevels[idx]) next.incentives.candyCrushLevels[idx] = {};
                                        next.incentives.candyCrushLevels[idx].target = e.target.value;
                                        return next;
                                      });
                                    }}
                                    className="h-8 text-xs font-mono font-bold pr-11"
                                  />
                                  <span className="absolute right-2 top-2 text-[10px] text-zinc-400 font-bold pointer-events-none">
                                    rides
                                  </span>
                                </div>
                              </div>

                              {/* Cash Reward Input */}
                              <div>
                                <Label className="text-[10px] font-bold text-zinc-500">Cash Bonus (₹)</Label>
                                <div className="relative mt-1">
                                  <span className="absolute left-2 top-2 text-[10px] text-zinc-400 font-bold pointer-events-none">
                                    ₹
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={l.reward ?? ""}
                                    onChange={(e) => {
                                      setIsDirty(true);
                                      setEditableRules((prev: any) => {
                                        const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                        if (!next.incentives.candyCrushLevels[idx]) next.incentives.candyCrushLevels[idx] = {};
                                        next.incentives.candyCrushLevels[idx].reward = e.target.value;
                                        return next;
                                      });
                                    }}
                                    className="h-8 text-xs font-mono font-bold pl-5"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </SectionCard>

                {/* Merchant Laundry Volume Bonus & Weekly Streak */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weekly Duty Streak Bonus */}
                  <SectionCard title="Captain Weekly 6-Day Duty Streak Bonus">
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-500">
                        Rewarded when captain completes minimum daily deliveries across consecutive duty days in a calendar week.
                      </p>
                      <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                        <div>
                          <Label className="text-xs font-bold text-zinc-600">Weekly Target Trips</Label>
                          <Input
                            type="number"
                            value={editableRules?.incentives?.riderWeeklyStreak?.trips ?? "50"}
                            onChange={(e) => {
                              setIsDirty(true);
                              setEditableRules((prev: any) => {
                                const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                if (!next.incentives.riderWeeklyStreak) next.incentives.riderWeeklyStreak = {};
                                next.incentives.riderWeeklyStreak.trips = e.target.value;
                                return next;
                              });
                            }}
                            className="h-8 font-mono font-bold mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-zinc-600">Mega Reward (₹)</Label>
                          <Input
                            type="number"
                            value={editableRules?.incentives?.riderWeeklyStreak?.reward ?? "800"}
                            onChange={(e) => {
                              setIsDirty(true);
                              setEditableRules((prev: any) => {
                                const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                if (!next.incentives.riderWeeklyStreak) next.incentives.riderWeeklyStreak = {};
                                next.incentives.riderWeeklyStreak.reward = e.target.value;
                                return next;
                              });
                            }}
                            className="h-8 font-mono font-bold mt-1 text-emerald-700"
                          />
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Merchant Volume Bonus */}
                  <SectionCard title="Laundry Merchant Volume Bonuses">
                    <div className="space-y-2">
                      {(editableRules?.incentives?.partnerVolume || []).map((t: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border">
                          <span className="text-xs font-bold">{t.orders} Orders Processed:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-zinc-500">₹</span>
                            <Input
                              type="number"
                              value={t.reward ?? ""}
                              onChange={(e) => {
                                setIsDirty(true);
                                setEditableRules((prev: any) => {
                                  const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                  if (!next.incentives.partnerVolume[idx]) next.incentives.partnerVolume[idx] = {};
                                  next.incentives.partnerVolume[idx].reward = e.target.value;
                                  return next;
                                });
                              }}
                              className="w-24 h-8 font-mono font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </div>
              </TabsContent>

              {/* 7. PENALTIES SUB-TAB */}
              <TabsContent value="penalties" className="mt-4">
                <SectionCard title="Delay Late Fees & Quality Penalties">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(editableRules?.penalties || {}).map(([type, amount]: [string, any]) => (
                      <div key={type} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                        <Label className="text-xs font-bold capitalize">{type.replace(/([A-Z])/g, " $1")}</Label>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-bold text-zinc-500">₹</span>
                          <Input
                            type="number"
                            value={amount ?? ""}
                            onChange={(e) => {
                              setIsDirty(true);
                              setEditableRules((prev: any) => {
                                const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                if (!next.penalties) next.penalties = {};
                                next.penalties[type] = e.target.value;
                                return next;
                              });
                            }}
                            className="font-mono font-bold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </TabsContent>

              {/* 8. SETTLEMENT SUB-TAB */}
              <TabsContent value="settlement" className="mt-4">
                <SectionCard title="Settlement Cycle & Automated Approval Rules">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Settlement Cycle</Label>
                      <Input
                        value={editableRules?.settlement?.cycle ?? "WEEKLY"}
                        readOnly
                        className="mt-1 bg-zinc-100 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Disbursement Payout Day</Label>
                      <Input
                        value={editableRules?.settlement?.payoutDay ?? "WEDNESDAY"}
                        onChange={(e) => updateField("settlement.payoutDay", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Auto-Approve Batch Ceiling (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.settlement?.autoApproveMaxAmount ?? ""}
                        onChange={(e) => updateField("settlement.autoApproveMaxAmount", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* =========================================================================
              TAB 3: SINGLE ORDER FINANCIAL LEDGER INSPECTOR
             ========================================================================= */}
          <TabsContent value="ledger" className="mt-6 space-y-6">
            <SectionCard title="Single Order Financial Ledger Inspector">
              <form onSubmit={handleSearchOrder} className="flex gap-2 max-w-lg mb-6">
                <Input
                  placeholder="Enter Order ID (e.g. ord-12345)"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className="font-mono"
                />
                <Button type="submit" disabled={isSearchingOrder} className="gap-1.5 font-bold">
                  <Search className="size-4" />
                  <span>{isSearchingOrder ? "Searching..." : "Inspect"}</span>
                </Button>
              </form>

              {inspectedOrder ? (
                <div className="space-y-6">
                  {/* Dual-Layer Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Layer 1: Customer Facing */}
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                        <span className="text-xs font-black text-emerald-900 uppercase">1. Customer Bill Breakdown</span>
                        <StatusPill status={inspectedOrder.financials.paymentStatus} />
                      </div>
                      <div className="text-xs space-y-1.5 text-zinc-700">
                        <div className="flex justify-between">
                          <span>Laundry Service:</span>
                          <span className="font-mono font-bold">₹{inspectedOrder.financials.laundryServiceAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Customer Delivery Fee:</span>
                          <span className="font-mono font-bold">₹{inspectedOrder.financials.customerDeliveryFee}</span>
                        </div>
                        {inspectedOrder.financials.deliverySubsidy > 0 && (
                          <div className="flex justify-between text-emerald-700 text-[11px]">
                            <span>Delivery Subsidy ({inspectedOrder.financials.deliverySubsidySource}):</span>
                            <span className="font-mono font-bold">-₹{inspectedOrder.financials.deliverySubsidy}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Platform & Handling Fee:</span>
                          <span className="font-mono font-bold">₹{inspectedOrder.financials.platformFee + inspectedOrder.financials.handlingFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST (CGST ₹{inspectedOrder.financials.cgst} + SGST ₹{inspectedOrder.financials.sgst}):</span>
                          <span className="font-mono font-bold">₹{inspectedOrder.financials.totalGst}</span>
                        </div>
                        <div className="flex justify-between border-t border-emerald-200 pt-1.5 text-sm font-black text-emerald-950">
                          <span>Customer Grand Total:</span>
                          <span className="font-mono">₹{inspectedOrder.financials.customerPayable}</span>
                        </div>
                      </div>
                    </div>

                    {/* Layer 2: Accounting P&L Breakdown */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-black text-slate-900 uppercase">2. Accounting Settlement P&L</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 font-bold">Tier: {inspectedOrder.financials.partnerTier || "Standard"}</span>
                      </div>
                      <div className="text-xs space-y-1.5 text-zinc-700">
                        <div className="flex justify-between">
                          <span>QuickPress Commission:</span>
                          <span className="font-mono font-bold text-emerald-700">₹{inspectedOrder.financials.quickpressCommission}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Merchant Net Settlement:</span>
                          <span className="font-mono font-bold text-sky-700">₹{inspectedOrder.financials.partnerSettlement}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Captain Trip Settlement:</span>
                          <span className="font-mono font-bold text-indigo-700">₹{inspectedOrder.financials.deliverySettlement}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TCS Section 194-O (1%):</span>
                          <span className="font-mono">₹{inspectedOrder.financials.tcsAmount}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-black text-slate-900">
                          <span>QuickPress Net Revenue:</span>
                          <span className="font-mono text-emerald-600">₹{inspectedOrder.financials.quickpressNetRevenue}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Immutable Event Ledger Stream */}
                  <div>
                    <h4 className="text-xs font-black text-zinc-900 uppercase mb-3 flex items-center gap-1.5">
                      <Layers className="size-4 text-emerald-600" />
                      <span>Immutable Event Ledger Stream ({inspectedOrder.totalLedgerEntries} Events)</span>
                    </h4>
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 font-black text-zinc-700 uppercase">
                          <tr>
                            <th className="p-2.5">TXN ID</th>
                            <th className="p-2.5">Event Type</th>
                            <th className="p-2.5">Credit (₹)</th>
                            <th className="p-2.5">Debit (₹)</th>
                            <th className="p-2.5">Reference</th>
                            <th className="p-2.5">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {inspectedOrder.ledger.map((tx) => (
                            <tr key={tx._id} className="hover:bg-zinc-50 font-mono">
                              <td className="p-2.5 font-bold text-zinc-900">{tx.transactionId}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-zinc-200 text-zinc-900">
                                  {tx.transactionType}
                                </span>
                              </td>
                              <td className="p-2.5 text-emerald-600 font-bold">{tx.credit > 0 ? `+₹${tx.credit}` : "-"}</td>
                              <td className="p-2.5 text-rose-600 font-bold">{tx.debit > 0 ? `-₹${tx.debit}` : "-"}</td>
                              <td className="p-2.5 text-zinc-600 font-sans">{tx.reference}</td>
                              <td className="p-2.5 text-zinc-500 font-sans">{new Date(tx.timestamp).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400">
                  <FileText className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Search an Order ID above to inspect its live financial ledger</p>
                </div>
              )}
            </SectionCard>
          </TabsContent>

          {/* =========================================================================
              TAB 4: SETTLEMENTS & PAYOUTS
             ========================================================================= */}
          <TabsContent value="settlements" className="mt-6 space-y-6">
            <SectionCard title="Weekly Settlement Batches & Payouts">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-100 font-black text-zinc-700 uppercase">
                    <tr>
                      <th className="p-2.5">Batch Cycle ID</th>
                      <th className="p-2.5">Period</th>
                      <th className="p-2.5">Orders</th>
                      <th className="p-2.5">Merchants (₹)</th>
                      <th className="p-2.5">Captains (₹)</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(settlementsQuery.data || []).map((batch) => (
                      <tr key={batch._id} className="hover:bg-zinc-50">
                        <td className="p-2.5 font-bold font-mono text-zinc-900">{batch.cycleId}</td>
                        <td className="p-2.5 text-zinc-600">{batch.startDate} to {batch.endDate}</td>
                        <td className="p-2.5 font-mono">{batch.totalOrders}</td>
                        <td className="p-2.5 font-mono font-bold text-sky-700">₹{batch.totalPartnerPayable}</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700">₹{batch.totalRiderPayable}</td>
                        <td className="p-2.5">
                          <StatusPill status={batch.status} />
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            {batch.status === "GENERATED" && (
                              <Button
                                size="xs"
                                onClick={() => approveBatchMutation.mutate(batch._id)}
                                className="bg-emerald-600 text-white font-bold"
                              >
                                Approve
                              </Button>
                            )}
                            {batch.status === "APPROVED" && (
                              <Button
                                size="xs"
                                onClick={() =>
                                  payoutBatchMutation.mutate({
                                    batchId: batch._id,
                                    payoutRef: `BANK-SETTLE-${Date.now()}`,
                                  })
                                }
                                className="bg-blue-600 text-white font-bold"
                              >
                                Disburse
                              </Button>
                            )}
                            {batch.status === "PAID" && (
                              <span className="text-[11px] text-zinc-500 font-mono">
                                Ref: {batch.payoutReference || "Paid"}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(settlementsQuery.data || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-400">
                          No settlement batches yet. Click &quot;Run Weekly Settlement&quot; to generate.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </TabsContent>

          {/* =========================================================================
              TAB 5: AUDIT LOGS & EFFECTIVE DATES
             ========================================================================= */}
          <TabsContent value="audit" className="mt-6 space-y-6">
            <SectionCard title="Financial Rule Audit Trail & Governance">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-100 font-black text-zinc-700 uppercase">
                    <tr>
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">Admin Author</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Reason</th>
                      <th className="p-2.5">Effective Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono text-[11px]">
                    {(auditLogsQuery.data || []).map((log) => (
                      <tr key={log._id} className="hover:bg-zinc-50">
                        <td className="p-2.5 text-zinc-500 font-sans">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-2.5 font-bold text-zinc-900">{log.adminId}</td>
                        <td className="p-2.5 text-emerald-700 font-bold">{log.action}</td>
                        <td className="p-2.5 text-zinc-700 font-sans">{log.reason}</td>
                        <td className="p-2.5 text-zinc-500 font-sans">
                          {log.effectiveFrom ? log.effectiveFrom.slice(0, 10) : "Immediate"} to{" "}
                          {log.effectiveUntil ? log.effectiveUntil.slice(0, 10) : "Open"}
                        </td>
                      </tr>
                    ))}
                    {(auditLogsQuery.data || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-400 font-sans">
                          No audit logs recorded yet. Rule updates will automatically appear here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </TabsContent>

          {/* =========================================================================
              TAB: LOYALTY PROGRAM & ORDER SCRATCH CARDS
             ========================================================================= */}
          <TabsContent value="loyalty" className="mt-6 space-y-6">
            {/* Header Control Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/50 p-5 rounded-2xl border border-amber-200/80 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-amber-950">
                      Customer Post-Delivery Loyalty Program
                    </h2>
                    <span
                      className={
                        loyaltyForm.isActive
                          ? "text-[11px] px-2.5 py-0.5 rounded-full font-black border bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "text-[11px] px-2.5 py-0.5 rounded-full font-black border bg-zinc-100 text-zinc-600 border-zinc-300"
                      }
                    >
                      {loyaltyForm.isActive ? "CAMPAIGN LIVE" : "CAMPAIGN PAUSED"}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 font-medium mt-0.5">
                    Orders trigger scratch cards for customers upon delivery. Points convert into real QuickPress wallet cash at <strong>100 Points = ₹10</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-amber-200">
                  <Label htmlFor="loyalty-active-switch" className="text-xs font-bold text-amber-950 cursor-pointer">
                    {loyaltyForm.isActive ? "Program Active" : "Program Paused"}
                  </Label>
                  <Switch
                    id="loyalty-active-switch"
                    checked={!!loyaltyForm.isActive}
                    onCheckedChange={(checked) => setLoyaltyForm((p) => ({ ...p, isActive: checked }))}
                  />
                </div>
                <Button
                  onClick={() => updateLoyaltyMutation.mutate(loyaltyForm)}
                  disabled={updateLoyaltyMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-sm"
                >
                  <Save className="size-4" />
                  <span>{updateLoyaltyMutation.isPending ? "Saving..." : "Save Campaign"}</span>
                </Button>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Allocated Budget"
                value={`₹${(loyaltyQuery.data?.totalBudgetRupees ?? loyaltyForm.totalBudgetRupees ?? 0).toLocaleString("en-IN")}`}
                hint="Total campaign budget allocated by Finance"
                icon={<IndianRupee className="size-4 text-amber-600" />}
              />
              <KpiCard
                title="Target Order Pool"
                value={`${(loyaltyQuery.data?.targetOrdersCount ?? loyaltyForm.targetOrdersCount ?? 0).toLocaleString("en-IN")} orders`}
                hint="Target order / customer count for budget distribution"
                icon={<User className="size-4 text-blue-600" />}
              />
              <KpiCard
                title="Calculated Avg / Card"
                value={`~${loyaltyQuery.data?.avgPointsPerCard ?? Math.round(((loyaltyForm.totalBudgetRupees || 1) / (loyaltyForm.targetOrdersCount || 1)) * 10)} pts`}
                hint={`Worth ₹${(((loyaltyQuery.data?.avgPointsPerCard ?? Math.round(((loyaltyForm.totalBudgetRupees || 1) / (loyaltyForm.targetOrdersCount || 1)) * 10))) / 10).toFixed(2)} real wallet cash`}
                icon={<Sparkles className="size-4 text-emerald-600" />}
              />
              <KpiCard
                title="Remaining Budget"
                value={`₹${(loyaltyQuery.data?.remainingBudgetRupees ?? (loyaltyForm.totalBudgetRupees || 0)).toLocaleString("en-IN")}`}
                hint={`₹${(loyaltyQuery.data?.spentBudgetRupees ?? 0).toLocaleString("en-IN")} claimed & scratched`}
                icon={<Scale className="size-4 text-purple-600" />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                title="Cards Issued"
                value={`${loyaltyQuery.data?.totalCardsIssued ?? 0}`}
                hint="Scratch cards auto-issued on completed orders"
                icon={<Layers className="size-4 text-indigo-600" />}
              />
              <KpiCard
                title="Cards Scratched"
                value={`${loyaltyQuery.data?.totalCardsScratched ?? 0}`}
                hint="Customer reveals & claimed rewards"
                icon={<Eye className="size-4 text-teal-600" />}
              />
              <KpiCard
                title="Real Cash Redeemed"
                value={`₹${(((loyaltyQuery.data?.totalPointsRedeemed ?? 0) / 10)).toLocaleString("en-IN")}`}
                hint={`From ${(loyaltyQuery.data?.totalPointsRedeemed ?? 0).toLocaleString("en-IN")} points converted to wallet`}
                icon={<CreditCard className="size-4 text-emerald-600" />}
              />
            </div>

            {/* Campaign Configuration Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Budget & Order Distribution Controls */}
              <div className="lg:col-span-2 space-y-6">
                <SectionCard
                  title="Campaign Budget & Distribution Engine"
                  description="Specify the total marketing budget and target order volume. The engine computes point allocation per card automatically."
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold text-zinc-700">Total Campaign Budget (₹)</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-xs">₹</span>
                          <Input
                            type="number"
                            min="100"
                            step="100"
                            value={loyaltyForm.totalBudgetRupees ?? ""}
                            onChange={(e) =>
                              setLoyaltyForm((p) => ({
                                ...p,
                                totalBudgetRupees: Number(e.target.value) || 0,
                              }))
                            }
                            className="pl-7 font-black text-sm"
                            placeholder="e.g. 50000"
                          />
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                          Total money pool authorized for customer rewards.
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-zinc-700">Target Order / Customer Pool</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={loyaltyForm.targetOrdersCount ?? ""}
                          onChange={(e) =>
                            setLoyaltyForm((p) => ({
                              ...p,
                              targetOrdersCount: Number(e.target.value) || 0,
                            }))
                          }
                          className="mt-1 font-black text-sm"
                          placeholder="e.g. 5000"
                        />
                        <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                          Target number of eligible orders to receive scratch cards.
                        </p>
                      </div>
                    </div>

                    {/* Live Calculation Preview Banner */}
                    {(() => {
                      const budget = loyaltyForm.totalBudgetRupees || 0;
                      const orders = loyaltyForm.targetOrdersCount || 1;
                      const avgRupees = orders > 0 ? budget / orders : 0;
                      const avgPts = Math.round(avgRupees * (loyaltyForm.pointsPerRupee || 10));
                      return (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200">
                          <div className="flex items-start gap-3">
                            <Sparkles className="size-5 text-amber-600 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                                Automated Point Generation Calculation
                              </p>
                              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                                With a budget of <strong>₹{budget.toLocaleString("en-IN")}</strong> distributed across{" "}
                                <strong>{orders.toLocaleString("en-IN")}</strong> orders, each customer card averages:
                              </p>
                              <div className="flex items-center gap-3 pt-1">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 text-white rounded-lg text-sm font-black shadow-xs">
                                  ~{avgPts} Loyalty Points
                                </span>
                                <span className="text-xs font-bold text-amber-900">
                                  = ₹{avgRupees.toFixed(2)} Real Cash Value per Card
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Min & Max Points Randomization Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                      <div>
                        <Label className="text-xs font-bold text-zinc-700">Minimum Points per Card</Label>
                        <Input
                          type="number"
                          min="1"
                          value={loyaltyForm.minPointsPerCard ?? ""}
                          onChange={(e) =>
                            setLoyaltyForm((p) => ({
                              ...p,
                              minPointsPerCard: Number(e.target.value) || 0,
                            }))
                          }
                          className="mt-1 font-bold"
                          placeholder="10"
                        />
                        <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                          Guaranteed minimum points on any scratch card.
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs font-bold text-zinc-700">Maximum Points per Card</Label>
                        <Input
                          type="number"
                          min="1"
                          value={loyaltyForm.maxPointsPerCard ?? ""}
                          onChange={(e) =>
                            setLoyaltyForm((p) => ({
                              ...p,
                              maxPointsPerCard: Number(e.target.value) || 0,
                            }))
                          }
                          className="mt-1 font-bold"
                          placeholder="200"
                        />
                        <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                          Upper ceiling for jackpot / lucky scratch cards.
                        </p>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Campaign Presentation Details */}
                <SectionCard
                  title="Customer Frontend Display"
                  description="Headline and text visible to customers in their Offers & Scratch Card section."
                >
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-bold text-zinc-700">Campaign Title</Label>
                      <Input
                        value={loyaltyForm.title || ""}
                        onChange={(e) => setLoyaltyForm((p) => ({ ...p, title: e.target.value }))}
                        className="mt-1 font-bold"
                        placeholder="e.g. Post-Delivery Delights"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-zinc-700">Campaign Subtitle & Description</Label>
                      <Textarea
                        value={loyaltyForm.description || ""}
                        onChange={(e) => setLoyaltyForm((p) => ({ ...p, description: e.target.value }))}
                        className="mt-1 text-xs"
                        rows={2}
                        placeholder="e.g. Scratch & win real wallet money on every delivered order!"
                      />
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Right Col: Redemption Rules & Guidelines */}
              <div className="space-y-6">
                <SectionCard title="Wallet Conversion Rule">
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                        <CheckCircle2 className="size-4" />
                        <span>Fixed Currency Rate</span>
                      </div>
                      <p className="mt-1.5 text-xs text-emerald-900 font-bold">
                        100 Loyalty Points = ₹10.00 Real Wallet Cash
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        (Exact rate: 1 point = ₹0.10)
                      </p>
                    </div>

                    <div className="space-y-2 text-zinc-600 font-medium">
                      <div className="flex items-start gap-2">
                        <div className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <p>Delivered orders instantly receive a scratch card in their Offers section.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <p>Customer scratches to reveal points within the budget distribution curve.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <p>Customer can click &ldquo;Redeem to Wallet&rdquo; anytime to transfer points into spendable balance.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <p>Points debited, and funds are credited directly to QuickPress Wallet balance.</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100">
                      <Button
                        onClick={() => updateLoyaltyMutation.mutate(loyaltyForm)}
                        disabled={updateLoyaltyMutation.isPending}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 py-2.5 h-auto shadow-sm"
                      >
                        <Save className="size-4" />
                        <span>{updateLoyaltyMutation.isPending ? "Saving..." : "Save Campaign Settings"}</span>
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Rules Confirmation Modal */}
        <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="size-5 text-emerald-600" />
                <span>Confirm Rule Update & Audit Log</span>
              </DialogTitle>
              <DialogDescription>
                Changes will be saved to Supabase and become immediately active for upcoming customer orders.
                Past completed orders will remain locked under their original calculations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label className="text-xs font-bold">Reason for Change (Optional)</Label>
              <Textarea
                placeholder="e.g. Revised monsoon delivery surge & Q4 Gold tier incentive updates..."
                value={saveReason}
                onChange={(e) => setSaveReason(e.target.value)}
                rows={3}
                className="text-xs"
              />
              <span className="text-[11px] text-zinc-500 block">
                Leave blank to automatically tag audit log as &quot;Admin Configuration Update&quot;.
              </span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => saveRulesMutation.mutate()}
                disabled={saveRulesMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {saveRulesMutation.isPending ? "Saving..." : "Commit Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Floating Unsaved Changes Notification Banner */}
        {isDirty && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-zinc-700 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-xs font-bold text-zinc-200">You have unsaved financial changes</span>
            </div>
            <Button
              size="sm"
              onClick={() => setIsSaveModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs h-8 px-3.5 shadow-md"
            >
              <Save className="size-3.5" />
              <span>Save Changes</span>
            </Button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
