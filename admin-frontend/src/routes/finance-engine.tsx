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
  Trash2,
  Tag,
  CalendarCheck,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
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
import { GlobalFinanceSearch } from "../components/finance/GlobalFinanceSearch";
import { AnomalyAlertBanner } from "../components/finance/AnomalyAlertBanner";
import { QuickViewDrawer } from "../components/finance/QuickViewDrawer";
import { DoubleEntryLedgerView } from "../components/finance/DoubleEntryLedgerView";
import { CodManagementView } from "../components/finance/CodManagementView";
import { ReconciliationView } from "../components/finance/ReconciliationView";
import { UnitEconomicsView } from "../components/finance/UnitEconomicsView";
import { MembershipFinanceView } from "../components/finance/MembershipFinanceView";
import { ExpenseTrackerNetProfitView } from "../components/finance/ExpenseTrackerNetProfitView";
import { CustomerFinance360View } from "../components/finance/CustomerFinance360View";
import { AccountingStatementsView } from "../components/finance/AccountingStatementsView";
import { ProfitabilityAnalyticsView } from "../components/finance/ProfitabilityAnalyticsView";
import { TaxComplianceCenterView } from "../components/finance/TaxComplianceCenterView";
import { TreasuryCenterView } from "../components/finance/TreasuryCenterView";
import { ApprovalCenterView } from "../components/finance/ApprovalCenterView";
import { AiFinanceAssistantView } from "../components/finance/AiFinanceAssistantView";
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
  versioning: {
    version: "v2.5.0",
    status: "active",
    effectiveFrom: "2026-01-01T00:00:00Z",
    effectiveUntil: "2099-12-31T23:59:59Z",
    scheduledAt: "",
  },
  servicePricing: [
    {
      id: "svc-wash-fold",
      serviceName: "Wash & Fold",
      category: "Laundry",
      city: "All Cities",
      area: "All Areas",
      basePrice: "69",
      unit: "kg",
      additionalUnitPrice: "69",
      minQuantity: "1",
      expressPrice: "99",
      effectiveFrom: "2026-01-01",
      effectiveUntil: "2099-12-31",
      status: "active",
      active: true,
    },
    {
      id: "svc-wash-iron",
      serviceName: "Wash & Steam Iron",
      category: "Laundry",
      city: "All Cities",
      area: "All Areas",
      basePrice: "99",
      unit: "kg",
      additionalUnitPrice: "99",
      minQuantity: "1",
      expressPrice: "139",
      effectiveFrom: "2026-01-01",
      effectiveUntil: "2099-12-31",
      status: "active",
      active: true,
    },
    {
      id: "svc-steam-press",
      serviceName: "Steam Press",
      category: "Ironing",
      city: "All Cities",
      area: "All Areas",
      basePrice: "19",
      unit: "piece",
      additionalUnitPrice: "19",
      minQuantity: "3",
      expressPrice: "29",
      effectiveFrom: "2026-01-01",
      effectiveUntil: "2099-12-31",
      status: "active",
      active: true,
    },
    {
      id: "svc-dry-clean",
      serviceName: "Premium Dry Clean",
      category: "Dry Cleaning",
      city: "All Cities",
      area: "All Areas",
      basePrice: "149",
      unit: "piece",
      additionalUnitPrice: "149",
      minQuantity: "1",
      expressPrice: "219",
      effectiveFrom: "2026-01-01",
      effectiveUntil: "2099-12-31",
      status: "active",
      active: true,
    },
    {
      id: "svc-shoe-care",
      serviceName: "Shoe Spa & Restoration",
      category: "Shoe Care",
      city: "All Cities",
      area: "All Areas",
      basePrice: "299",
      unit: "pair",
      additionalUnitPrice: "299",
      minQuantity: "1",
      expressPrice: "399",
      effectiveFrom: "2026-01-01",
      effectiveUntil: "2099-12-31",
      status: "active",
      active: true,
    },
  ],
  pricing: {
    universalBasePrice: "69",
    universalExpressPrice: "99",
    platformFee: "10",
    handlingFee: "15",
    minimumOrderValue: "99",
    expressMultiplier: "1.35",
    surgeMultiplier: "1.0",
  },
  fees: {
    platformFee: "10",
    platformFeeType: "fixed",
    handlingFee: "15",
    handlingFeeType: "fixed",
    convenienceFee: "0",
    convenienceFeeType: "fixed",
    packagingFee: "0",
    packagingFeeType: "fixed",
    serviceCharge: "0",
    serviceChargeType: "fixed",
  },
  gst: {
    enabled: true,
    pricingMode: "exclusive",
    laundryGstPercent: "5",
    platformGstPercent: "18",
    deliveryGstPercent: "18",
    cgstPercent: "2.5",
    sgstPercent: "2.5",
    igstPercent: "5.0",
    tcsPercent: "1",
    tdsPercent: "1",
    quickpressGstin: "09AAECQ1234F1Z5",
    defaultState: "Uttar Pradesh",
    categoryTaxOverrides: [
      { id: "tax-dryclean", category: "Dry Cleaning", gstRatePercent: "12", active: true },
    ],
  },
  commission: {
    partnerCommissionType: "percentage",
    platformCommissionPercent: "18",
    standardPercent: "18",
    fixedAmountPerOrder: "0",
    captainCommissionRate: 0.0,
  },
  delivery: {
    baseFee: "30",
    baseDistanceKm: "2.0",
    perKmRate: "8.0",
    minimumDeliveryFee: "25",
    expressDeliveryFee: "40",
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
    cityAreaPricing: [
      { id: "del-kasganj-central", city: "Kasganj", area: "Soron Gate", baseFee: "25", perKmRate: "7.0", minFee: "20", active: true },
      { id: "del-kasganj-outer", city: "Kasganj", area: "Outer Bypass", baseFee: "35", perKmRate: "9.0", minFee: "30", active: true },
    ],
  },
  discount: {
    minOrderValue: "99",
    firstOrderDiscountPercent: "20",
    firstOrderMaxDiscount: "100",
    coupons: [
      {
        id: "cpn-qp50",
        code: "QUICK50",
        title: "₹50 Flat Off",
        type: "flat",
        discount: "50",
        maxDiscount: "50",
        minOrderValue: "299",
        firstOrderOnly: false,
        citySpecific: "All",
        usageLimit: "5000",
        usedCount: "342",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        active: true,
      },
      {
        id: "cpn-fresh20",
        code: "FRESH20",
        title: "20% Off on Laundry",
        type: "percent",
        discount: "20",
        maxDiscount: "120",
        minOrderValue: "399",
        firstOrderOnly: true,
        citySpecific: "All",
        usageLimit: "2000",
        usedCount: "189",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        active: true,
      },
    ],
  },
  cancellation: {
    processingFee: "0",
    refundEligibility: "Automated refund to original payment source or instant wallet credit",
    ORDER_PLACED: { cancellationFee: "0", refundPct: "100", allowCancel: true, notes: "Full instant refund before store acceptance" },
    PARTNER_ACCEPTED: { cancellationFee: "0", refundPct: "100", allowCancel: true, notes: "Full refund if cancelled before rider dispatch" },
    PICKUP_ASSIGNED: { cancellationFee: "20", refundPct: "90", allowCancel: true, notes: "₹20 rider dispatch compensation" },
    PICKUP_ARRIVED: { cancellationFee: "40", refundPct: "80", allowCancel: true, notes: "₹40 rider fuel & door arrival fee" },
    PICKED_UP: { cancellationFee: "60", refundPct: "50", allowCancel: true, notes: "₹60 transit handling charge" },
    AT_STORE: { cancellationFee: "75", refundPct: "40", allowCancel: true, notes: "Garment sorting and pre-treatment fee" },
    PROCESSING: { cancellationFee: "100", refundPct: "25", allowCancel: true, notes: "Detergent & cycle wash expense consumed" },
    READY: { cancellationFee: "150", refundPct: "10", allowCancel: false, notes: "Laundry finished and packed" },
    OUT_FOR_DELIVERY: { cancellationFee: "200", refundPct: "0", allowCancel: false, notes: "Non-refundable once in transit" },
    DELIVERED: { cancellationFee: "0", refundPct: "0", allowCancel: false, notes: "Order completed" },
  },
  riderPayout: {
    basePay: "25",
    baseDistanceKm: "2.0",
    perKmRate: "6.0",
    pickupEarning: "10",
    deliveryEarning: "15",
    peakIncentive: "15",
    expressBonus: "20",
    nightSurge: "25",
    rainSurge: "20",
    captainCommissionRate: 0.0,
    dailyTargets: [
      { targetTrips: "10", bonus: "300" },
      { targetTrips: "20", bonus: "750" },
    ],
    bonusRules: "Peak hour orders (18:00 - 22:00) grant +₹15 bonus. 100% completion unlocks daily target bonus.",
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
    tdsRate: 0.01,
    minSettlementPayout: "100",
    minWithdrawal: "100",
    partnerSharePercent: "82",
    platformSharePercent: "18",
    adjustmentRules: "Late pickup penalties and damage claims are automatically deducted from the weekly cycle payout.",
  },
  partnerSettlement: {
    cycle: "WEEKLY",
    payoutDay: "WEDNESDAY",
    autoApproveMaxAmount: "50000",
    minSettlementPayout: "100",
    minWithdrawal: "100",
    partnerSharePercent: "82",
    platformSharePercent: "18",
    tcsRate: 0.01,
    tdsRate: 0.01,
    adjustmentRules: "Late pickup penalties and damage claims are automatically deducted from the weekly cycle payout.",
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
    versioning: {
      version: String(data.versioning?.version ?? "v2.5.0"),
      status: String(data.versioning?.status ?? "active"),
      effectiveFrom: String(data.versioning?.effectiveFrom ?? "2026-01-01T00:00:00Z"),
      effectiveUntil: String(data.versioning?.effectiveUntil ?? "2099-12-31T23:59:59Z"),
      scheduledAt: String(data.versioning?.scheduledAt ?? ""),
    },
    servicePricing: (data.servicePricing || DEFAULT_FINANCIAL_RULES.servicePricing).map((s: any) => ({
      id: String(s.id ?? `svc-${Date.now()}`),
      serviceName: String(s.serviceName ?? ""),
      category: String(s.category ?? "Laundry"),
      city: String(s.city ?? "All Cities"),
      area: String(s.area ?? "All Areas"),
      basePrice: String(s.basePrice ?? "0"),
      unit: String(s.unit ?? "piece"),
      additionalUnitPrice: String(s.additionalUnitPrice ?? s.basePrice ?? "0"),
      minQuantity: String(s.minQuantity ?? "1"),
      expressPrice: String(s.expressPrice ?? "0"),
      effectiveFrom: String(s.effectiveFrom ?? "2026-01-01"),
      effectiveUntil: String(s.effectiveUntil ?? "2099-12-31"),
      status: String(s.status ?? "active"),
      active: Boolean(s.active !== false),
    })),
    pricing: {
      platformFee: String(data.pricing?.platformFee ?? 10),
      handlingFee: String(data.pricing?.handlingFee ?? 15),
      minimumOrderValue: String(data.pricing?.minimumOrderValue ?? 99),
      expressMultiplier: String(data.pricing?.expressMultiplier ?? 1.35),
      surgeMultiplier: String(data.pricing?.surgeMultiplier ?? 1.0),
    },
    fees: {
      platformFee: String(data.fees?.platformFee ?? data.pricing?.platformFee ?? 10),
      platformFeeType: String(data.fees?.platformFeeType ?? "fixed"),
      handlingFee: String(data.fees?.handlingFee ?? data.pricing?.handlingFee ?? 15),
      handlingFeeType: String(data.fees?.handlingFeeType ?? "fixed"),
      convenienceFee: String(data.fees?.convenienceFee ?? 0),
      convenienceFeeType: String(data.fees?.convenienceFeeType ?? "fixed"),
      packagingFee: String(data.fees?.packagingFee ?? 0),
      packagingFeeType: String(data.fees?.packagingFeeType ?? "fixed"),
      serviceCharge: String(data.fees?.serviceCharge ?? 0),
      serviceChargeType: String(data.fees?.serviceChargeType ?? "fixed"),
    },
    gst: {
      enabled: Boolean(data.gst?.enabled !== false),
      pricingMode: String(data.gst?.pricingMode ?? "exclusive"),
      laundryGstPercent: String(Math.round((data.gst?.laundryGstRate ?? 0.05) * 10000) / 100),
      platformGstPercent: String(Math.round((data.gst?.platformGstRate ?? 0.18) * 10000) / 100),
      deliveryGstPercent: String(Math.round((data.gst?.deliveryGstRate ?? 0.18) * 10000) / 100),
      cgstPercent: String(Math.round((data.gst?.cgstRate ?? 0.025) * 10000) / 100),
      sgstPercent: String(Math.round((data.gst?.sgstRate ?? 0.025) * 10000) / 100),
      igstPercent: String(Math.round((data.gst?.igstRate ?? 0.05) * 10000) / 100),
      tcsPercent: String(Math.round((data.gst?.tcsRate ?? 0.01) * 10000) / 100),
      tdsPercent: String(Math.round((data.gst?.tdsRate ?? 0.01) * 10000) / 100),
      quickpressGstin: String(data.gst?.quickpressGstin ?? "09AAECQ1234F1Z5"),
      defaultState: String(data.gst?.defaultState ?? "Uttar Pradesh"),
      categoryTaxOverrides: (data.gst?.categoryTaxOverrides || DEFAULT_FINANCIAL_RULES.gst.categoryTaxOverrides).map((t: any) => ({
        id: String(t.id ?? ""),
        category: String(t.category ?? ""),
        gstRatePercent: String(Math.round((t.gstRate ?? 0.12) * 10000) / 100),
        active: Boolean(t.active !== false),
      })),
    },
    commission: {
      partnerCommissionType: String(data.commission?.partnerCommissionType ?? "tier"),
      standardPercent: String(Math.round((data.commission?.standardRate ?? 0.18) * 10000) / 100),
      silverPercent: String(Math.round((data.commission?.silverRate ?? 0.15) * 10000) / 100),
      goldPercent: String(Math.round((data.commission?.goldRate ?? 0.12) * 10000) / 100),
      silverThreshold: String(data.commission?.silverThreshold ?? 100),
      goldThreshold: String(data.commission?.goldThreshold ?? 300),
      fixedAmountPerOrder: String(data.commission?.fixedAmountPerOrder ?? 0),
      captainCommissionRate: data.commission?.captainCommissionRate ?? 0.0,
      platformCommissionPercent: String(Math.round((data.commission?.platformCommissionRate ?? 0.18) * 10000) / 100),
      categoryOverrides: (data.commission?.categoryOverrides || DEFAULT_FINANCIAL_RULES.commission.categoryOverrides).map((c: any) => ({
        id: String(c.id ?? ""),
        category: String(c.category ?? ""),
        ratePercent: String(Math.round((c.rate ?? 0.18) * 10000) / 100),
        active: Boolean(c.active !== false),
      })),
      cityAreaOverrides: (data.commission?.cityAreaOverrides || DEFAULT_FINANCIAL_RULES.commission.cityAreaOverrides).map((c: any) => ({
        id: String(c.id ?? ""),
        city: String(c.city ?? "Kasganj"),
        area: String(c.area ?? "All Areas"),
        ratePercent: String(Math.round((c.rate ?? 0.15) * 10000) / 100),
        active: Boolean(c.active !== false),
      })),
    },
    delivery: {
      baseFee: String(data.delivery?.baseFee ?? 30),
      baseDistanceKm: String(data.delivery?.baseDistanceKm ?? 2.0),
      perKmRate: String(data.delivery?.perKmRate ?? 8.0),
      minimumDeliveryFee: String(data.delivery?.minimumDeliveryFee ?? 25),
      expressDeliveryFee: String(data.delivery?.expressDeliveryFee ?? 40),
      slabs: (data.delivery?.slabs || DEFAULT_FINANCIAL_RULES.delivery.slabs).map((s: any) => ({
        minKm: s.minKm,
        maxKm: s.maxKm,
        fee: String(s.fee ?? 30),
      })),
      freeDeliveryThreshold: String(data.delivery?.freeDeliveryThreshold ?? 499),
      subsidyFundingSource: data.delivery?.subsidyFundingSource ?? "QUICKPRESS_FUNDED",
      nightSurge: String(data.delivery?.nightSurge ?? 25),
      rainSurge: String(data.delivery?.rainSurge ?? 20),
      cityAreaPricing: (data.delivery?.cityAreaPricing || DEFAULT_FINANCIAL_RULES.delivery.cityAreaPricing).map((c: any) => ({
        id: String(c.id ?? ""),
        city: String(c.city ?? ""),
        area: String(c.area ?? ""),
        baseFee: String(c.baseFee ?? 30),
        perKmRate: String(c.perKmRate ?? 8.0),
        minFee: String(c.minFee ?? 25),
        active: Boolean(c.active !== false),
      })),
    },
    discount: {
      minOrderValue: String(data.discount?.minOrderValue ?? 99),
      firstOrderDiscountPercent: String(data.discount?.firstOrderDiscountPercent ?? 20),
      firstOrderMaxDiscount: String(data.discount?.firstOrderMaxDiscount ?? 100),
      coupons: (data.discount?.coupons || DEFAULT_FINANCIAL_RULES.discount.coupons).map((c: any) => ({
        id: String(c.id ?? `cpn-${Date.now()}`),
        code: String(c.code ?? ""),
        title: String(c.title ?? ""),
        type: String(c.type ?? "flat"),
        discount: String(c.discount ?? 0),
        maxDiscount: String(c.maxDiscount ?? 0),
        minOrderValue: String(c.minOrderValue ?? 0),
        firstOrderOnly: Boolean(c.firstOrderOnly),
        citySpecific: String(c.citySpecific ?? "All"),
        usageLimit: Number(c.usageLimit ?? 1000),
        usedCount: Number(c.usedCount ?? 0),
        startDate: String(c.startDate ?? "2026-01-01"),
        endDate: String(c.endDate ?? "2026-12-31"),
        active: Boolean(c.active !== false),
      })),
    },
    cancellation: Object.fromEntries(
      Object.entries(data.cancellation || DEFAULT_FINANCIAL_RULES.cancellation).map(([stage, val]: [string, any]) => [
        stage,
        {
          cancellationFee: String(val.cancellationFee ?? 0),
          refundPct: String(val.refundPct ?? 100),
          allowCancel: Boolean(val.allowCancel),
          notes: String(val.notes ?? ""),
        },
      ])
    ),
    riderPayout: {
      basePay: String(data.riderPayout?.basePay ?? 25),
      baseDistanceKm: String(data.riderPayout?.baseDistanceKm ?? 2.0),
      perKmRate: String(data.riderPayout?.perKmRate ?? 6.0),
      pickupEarning: String(data.riderPayout?.pickupEarning ?? 10),
      deliveryEarning: String(data.riderPayout?.deliveryEarning ?? 15),
      peakIncentive: String(data.riderPayout?.peakIncentive ?? 15),
      expressBonus: String(data.riderPayout?.expressBonus ?? 20),
      nightSurge: String(data.riderPayout?.nightSurge ?? 25),
      rainSurge: String(data.riderPayout?.rainSurge ?? 20),
      captainCommissionRate: data.riderPayout?.captainCommissionRate ?? 0.0,
      dailyTargets: (data.riderPayout?.dailyTargets || DEFAULT_FINANCIAL_RULES.riderPayout.dailyTargets).map((t: any) => ({
        targetTrips: String(t.targetTrips ?? 10),
        bonus: String(t.bonus ?? 300),
      })),
      bonusRules: String(data.riderPayout?.bonusRules ?? DEFAULT_FINANCIAL_RULES.riderPayout.bonusRules),
    },
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
      minWithdrawal: String(data.partnerSettlement?.minWithdrawal ?? 100),
      partnerSharePercent: String(data.settlement?.partnerSharePercent ?? 82),
      platformSharePercent: String(data.settlement?.platformSharePercent ?? 18),
      adjustmentRules: String(data.settlement?.adjustmentRules ?? DEFAULT_FINANCIAL_RULES.settlement.adjustmentRules),
    },
    partnerSettlement: {
      cycle: data.partnerSettlement?.cycle ?? data.settlement?.cycle ?? "WEEKLY",
      payoutDay: data.partnerSettlement?.payoutDay ?? data.settlement?.payoutDay ?? "WEDNESDAY",
      autoApproveMaxAmount: String(data.partnerSettlement?.autoApproveMaxAmount ?? 50000),
      minSettlementPayout: String(data.partnerSettlement?.minSettlementPayout ?? 100),
      minWithdrawal: String(data.partnerSettlement?.minWithdrawal ?? 100),
      partnerSharePercent: String(data.partnerSettlement?.partnerSharePercent ?? 82),
      platformSharePercent: String(data.partnerSettlement?.platformSharePercent ?? 18),
      tcsRate: data.partnerSettlement?.tcsRate ?? 0.01,
      tdsRate: data.partnerSettlement?.tdsRate ?? 0.01,
      adjustmentRules: String(data.partnerSettlement?.adjustmentRules ?? DEFAULT_FINANCIAL_RULES.partnerSettlement.adjustmentRules),
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
    versioning: {
      version: String(raw?.versioning?.version || "v2.5.0"),
      status: String(raw?.versioning?.status || "active"),
      effectiveFrom: String(raw?.versioning?.effectiveFrom || "2026-01-01T00:00:00Z"),
      effectiveUntil: String(raw?.versioning?.effectiveUntil || "2099-12-31T23:59:59Z"),
      scheduledAt: raw?.versioning?.scheduledAt || null,
    },
    servicePricing: (raw?.servicePricing || []).map((s: any) => ({
      id: String(s.id),
      serviceName: String(s.serviceName),
      category: String(s.category),
      city: String(s.city || "All Cities"),
      area: String(s.area || "All Areas"),
      basePrice: Number(s.basePrice) || 0,
      unit: String(s.unit || "piece"),
      additionalUnitPrice: Number(s.additionalUnitPrice || s.basePrice) || 0,
      minQuantity: Number(s.minQuantity) || 1,
      expressPrice: Number(s.expressPrice) || 0,
      effectiveFrom: String(s.effectiveFrom || "2026-01-01"),
      effectiveUntil: String(s.effectiveUntil || "2099-12-31"),
      status: String(s.status || "active"),
      active: Boolean(s.active !== false),
    })),
    pricing: {
      platformFee: Number(raw?.pricing?.platformFee) || 0,
      handlingFee: Number(raw?.pricing?.handlingFee) || 0,
      minimumOrderValue: Number(raw?.pricing?.minimumOrderValue) || 0,
      expressMultiplier: Number(raw?.pricing?.expressMultiplier) || 1.0,
      surgeMultiplier: Number(raw?.pricing?.surgeMultiplier) || 1.0,
    },
    fees: {
      platformFee: Number(raw?.fees?.platformFee ?? raw?.pricing?.platformFee) || 0,
      platformFeeType: String(raw?.fees?.platformFeeType || "fixed"),
      handlingFee: Number(raw?.fees?.handlingFee ?? raw?.pricing?.handlingFee) || 0,
      handlingFeeType: String(raw?.fees?.handlingFeeType || "fixed"),
      convenienceFee: Number(raw?.fees?.convenienceFee) || 0,
      convenienceFeeType: String(raw?.fees?.convenienceFeeType || "fixed"),
      packagingFee: Number(raw?.fees?.packagingFee) || 0,
      packagingFeeType: String(raw?.fees?.packagingFeeType || "fixed"),
      serviceCharge: Number(raw?.fees?.serviceCharge) || 0,
      serviceChargeType: String(raw?.fees?.serviceChargeType || "fixed"),
    },
    gst: {
      enabled: Boolean(raw?.gst?.enabled !== false),
      pricingMode: String(raw?.gst?.pricingMode || "exclusive"),
      laundryGstRate: (parseFloat(raw?.gst?.laundryGstPercent) || 0) / 100,
      platformGstRate: (parseFloat(raw?.gst?.platformGstPercent) || 0) / 100,
      deliveryGstRate: (parseFloat(raw?.gst?.deliveryGstPercent) || 0) / 100,
      cgstRate: (parseFloat(raw?.gst?.cgstPercent) || 0) / 100,
      sgstRate: (parseFloat(raw?.gst?.sgstPercent) || 0) / 100,
      igstRate: (parseFloat(raw?.gst?.igstPercent) || 0) / 100,
      tcsRate: (parseFloat(raw?.gst?.tcsPercent) || 0) / 100,
      tdsRate: (parseFloat(raw?.gst?.tdsPercent) || 0) / 100,
      quickpressGstin: String(raw?.gst?.quickpressGstin || "").trim().toUpperCase(),
      defaultState: String(raw?.gst?.defaultState || "Uttar Pradesh").trim(),
      categoryTaxOverrides: (raw?.gst?.categoryTaxOverrides || []).map((t: any) => ({
        id: String(t.id),
        category: String(t.category),
        gstRate: (parseFloat(t.gstRatePercent) || 0) / 100,
        active: Boolean(t.active !== false),
      })),
    },
    commission: {
      partnerCommissionType: String(raw?.commission?.partnerCommissionType || "tier"),
      standardRate: (parseFloat(raw?.commission?.standardPercent) || 0) / 100,
      silverRate: (parseFloat(raw?.commission?.silverPercent) || 0) / 100,
      goldRate: (parseFloat(raw?.commission?.goldPercent) || 0) / 100,
      silverThreshold: Number(raw?.commission?.silverThreshold) || 100,
      goldThreshold: Number(raw?.commission?.goldThreshold) || 300,
      fixedAmountPerOrder: Number(raw?.commission?.fixedAmountPerOrder) || 0,
      captainCommissionRate: 0.0,
      platformCommissionRate: (parseFloat(raw?.commission?.platformCommissionPercent) || 18) / 100,
      categoryOverrides: (raw?.commission?.categoryOverrides || []).map((c: any) => ({
        id: String(c.id),
        category: String(c.category),
        rate: (parseFloat(c.ratePercent) || 0) / 100,
        active: Boolean(c.active !== false),
      })),
      cityAreaOverrides: (raw?.commission?.cityAreaOverrides || []).map((c: any) => ({
        id: String(c.id),
        city: String(c.city),
        area: String(c.area),
        rate: (parseFloat(c.ratePercent) || 0) / 100,
        active: Boolean(c.active !== false),
      })),
    },
    delivery: {
      baseFee: Number(raw?.delivery?.baseFee) || 0,
      baseDistanceKm: Number(raw?.delivery?.baseDistanceKm) || 2.0,
      perKmRate: Number(raw?.delivery?.perKmRate) || 8.0,
      minimumDeliveryFee: Number(raw?.delivery?.minimumDeliveryFee) || 25,
      expressDeliveryFee: Number(raw?.delivery?.expressDeliveryFee) || 40,
      slabs: (raw?.delivery?.slabs || []).map((s: any) => ({
        minKm: Number(s.minKm) || 0,
        maxKm: Number(s.maxKm) || 0,
        fee: Number(s.fee) || 0,
      })),
      freeDeliveryThreshold: Number(raw?.delivery?.freeDeliveryThreshold) || 0,
      subsidyFundingSource: raw?.delivery?.subsidyFundingSource || "QUICKPRESS_FUNDED",
      nightSurge: Number(raw?.delivery?.nightSurge) || 0,
      rainSurge: Number(raw?.delivery?.rainSurge) || 0,
      cityAreaPricing: (raw?.delivery?.cityAreaPricing || []).map((c: any) => ({
        id: String(c.id),
        city: String(c.city),
        area: String(c.area),
        baseFee: Number(c.baseFee) || 0,
        perKmRate: Number(c.perKmRate) || 0,
        minFee: Number(c.minFee) || 0,
        active: Boolean(c.active !== false),
      })),
    },
    discount: {
      minOrderValue: Number(raw?.discount?.minOrderValue) || 99,
      firstOrderDiscountPercent: Number(raw?.discount?.firstOrderDiscountPercent) || 20,
      firstOrderMaxDiscount: Number(raw?.discount?.firstOrderMaxDiscount) || 100,
      coupons: (raw?.discount?.coupons || []).map((c: any) => ({
        id: String(c.id),
        code: String(c.code).trim().toUpperCase(),
        title: String(c.title),
        type: String(c.type) as "flat" | "percent",
        discount: Number(c.discount) || 0,
        maxDiscount: Number(c.maxDiscount) || 0,
        minOrderValue: Number(c.minOrderValue) || 0,
        firstOrderOnly: Boolean(c.firstOrderOnly),
        citySpecific: String(c.citySpecific || "All"),
        usageLimit: Number(c.usageLimit) || 1000,
        usedCount: Number(c.usedCount) || 0,
        startDate: String(c.startDate || "2026-01-01"),
        endDate: String(c.endDate || "2026-12-31"),
        active: Boolean(c.active !== false),
      })),
    },
    cancellation: Object.fromEntries(
      Object.entries(raw?.cancellation || {}).map(([stage, val]: [string, any]) => [
        stage,
        {
          cancellationFee: Number(val.cancellationFee) || 0,
          refundPct: Number(val.refundPct) || 0,
          allowCancel: Boolean(val.allowCancel),
          notes: String(val.notes || ""),
        },
      ])
    ),
    riderPayout: {
      basePay: Number(raw?.riderPayout?.basePay) || 25,
      baseDistanceKm: Number(raw?.riderPayout?.baseDistanceKm) || 2.0,
      perKmRate: Number(raw?.riderPayout?.perKmRate) || 6.0,
      pickupEarning: Number(raw?.riderPayout?.pickupEarning) || 10,
      deliveryEarning: Number(raw?.riderPayout?.deliveryEarning) || 15,
      peakIncentive: Number(raw?.riderPayout?.peakIncentive) || 15,
      expressBonus: Number(raw?.riderPayout?.expressBonus) || 20,
      nightSurge: Number(raw?.riderPayout?.nightSurge) || 25,
      rainSurge: Number(raw?.riderPayout?.rainSurge) || 20,
      captainCommissionRate: 0.0,
      dailyTargets: (raw?.riderPayout?.dailyTargets || []).map((t: any) => ({
        targetTrips: Number(t.targetTrips) || 0,
        bonus: Number(t.bonus) || 0,
      })),
      bonusRules: String(raw?.riderPayout?.bonusRules || ""),
    },
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
      partnerSharePercent: Number(raw?.settlement?.partnerSharePercent) || 82,
      platformSharePercent: Number(raw?.settlement?.platformSharePercent) || 18,
      adjustmentRules: String(raw?.settlement?.adjustmentRules || ""),
    },
    partnerSettlement: {
      cycle: raw?.partnerSettlement?.cycle || raw?.settlement?.cycle || "WEEKLY",
      payoutDay: raw?.partnerSettlement?.payoutDay || raw?.settlement?.payoutDay || "WEDNESDAY",
      autoApproveMaxAmount: Number(raw?.partnerSettlement?.autoApproveMaxAmount) || 50000,
      minSettlementPayout: Number(raw?.partnerSettlement?.minSettlementPayout) || 100,
      minWithdrawal: Number(raw?.partnerSettlement?.minWithdrawal) || 100,
      partnerSharePercent: Number(raw?.partnerSettlement?.partnerSharePercent) || 82,
      platformSharePercent: Number(raw?.partnerSettlement?.platformSharePercent) || 18,
      tcsRate: 0.01,
      tdsRate: 0.01,
      adjustmentRules: String(raw?.partnerSettlement?.adjustmentRules || ""),
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
    | "overview"
    | "customer-360"
    | "accounting-statements"
    | "profitability"
    | "tax-center"
    | "treasury"
    | "approvals"
    | "ai-assistant"
    | "expenses"
    | "general-ledger"
    | "cod"
    | "recon"
    | "unit-economics"
    | "memberships"
    | "rules"
    | "loyalty"
    | "ledger"
    | "settlements"
    | "audit"
  >("overview");

  // Quick View Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerEntity, setDrawerEntity] = useState<{ type: string; id: string } | null>(null);

  const handleInspectEntity = (type: string, id: string) => {
    setDrawerEntity({ type, id });
    setDrawerOpen(true);
  };

  // Sub-tab under rules (9 Dedicated Modules + Versioning & Legacy Aliases)
  const [rulesSubTab, setRulesSubTab] = useState<
    | "service-pricing"
    | "delivery"
    | "commission"
    | "gst"
    | "fees"
    | "discount"
    | "cancellation"
    | "rider-incentives"
    | "settlement"
    | "versioning"
    | "pricing"
    | "incentives"
    | "penalties"
  >("service-pricing");

  // Dialog & Inline Form States for Dedicated Commercial Modules

  const [newAreaPricing, setNewAreaPricing] = useState({
    city: "Kasganj",
    area: "",
    baseFee: "25",
    perKmRate: "7.0",
    minFee: "20",
  });

  const [newTaxOverride, setNewTaxOverride] = useState({
    category: "",
    gstRatePercent: "12",
  });

  const [newCommOverride, setNewCommOverride] = useState({
    category: "",
    ratePercent: "15",
  });

  const [newCityCommOverride, setNewCityCommOverride] = useState({
    city: "Kasganj",
    area: "All Areas",
    ratePercent: "15",
  });

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

  // Area Delivery Pricing Handlers
  const handleAddAreaPricing = () => {
    if (!newAreaPricing.area.trim()) {
      toast.error("Please enter an area name");
      return;
    }
    setIsDirty(true);
    setEditableRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
      if (!next.delivery) next.delivery = {};
      if (!next.delivery.cityAreaPricing) next.delivery.cityAreaPricing = [];
      next.delivery.cityAreaPricing.push({
        id: `del-${Date.now()}`,
        city: newAreaPricing.city,
        area: newAreaPricing.area.trim(),
        baseFee: newAreaPricing.baseFee,
        perKmRate: newAreaPricing.perKmRate,
        minFee: newAreaPricing.minFee,
        active: true,
      });
      return next;
    });
    setNewAreaPricing({ city: "Kasganj", area: "", baseFee: "25", perKmRate: "7.0", minFee: "20" });
    toast.success("Area delivery rule added.");
  };

  const handleDeleteAreaPricing = (id: string) => {
    setIsDirty(true);
    setEditableRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
      if (next.delivery?.cityAreaPricing) {
        next.delivery.cityAreaPricing = next.delivery.cityAreaPricing.filter((c: any) => c.id !== id);
      }
      return next;
    });
    toast.info("Area delivery rule removed.");
  };

  // Category Tax Override Handlers
  const handleAddTaxOverride = () => {
    if (!newTaxOverride.category.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    setIsDirty(true);
    setEditableRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
      if (!next.gst) next.gst = {};
      if (!next.gst.categoryTaxOverrides) next.gst.categoryTaxOverrides = [];
      next.gst.categoryTaxOverrides.push({
        id: `tax-${Date.now()}`,
        category: newTaxOverride.category.trim(),
        gstRatePercent: newTaxOverride.gstRatePercent,
        active: true,
      });
      return next;
    });
    setNewTaxOverride({ category: "", gstRatePercent: "12" });
    toast.success("Category tax override added.");
  };

  const handleDeleteTaxOverride = (id: string) => {
    setIsDirty(true);
    setEditableRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
      if (next.gst?.categoryTaxOverrides) {
        next.gst.categoryTaxOverrides = next.gst.categoryTaxOverrides.filter((t: any) => t.id !== id);
      }
      return next;
    });
    toast.info("Category tax override removed.");
  };

  // Commission Overrides Handlers
  const handleAddCommOverride = () => {
    if (!newCommOverride.category.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    setIsDirty(true);
    setEditableRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
      if (!next.commission) next.commission = {};
      if (!next.commission.categoryOverrides) next.commission.categoryOverrides = [];
      next.commission.categoryOverrides.push({
        id: `comm-${Date.now()}`,
        category: newCommOverride.category.trim(),
        ratePercent: newCommOverride.ratePercent,
        active: true,
      });
      return next;
    });
    setNewCommOverride({ category: "", ratePercent: "15" });
    toast.success("Category commission override added.");
  };

  const handleDeleteCommOverride = (id: string) => {
    setIsDirty(true);
    setEditableRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
      if (next.commission?.categoryOverrides) {
        next.commission.categoryOverrides = next.commission.categoryOverrides.filter((c: any) => c.id !== id);
      }
      return next;
    });
    toast.info("Category commission override removed.");
  };

  const handleAddCityCommOverride = () => {
    if (!newCityCommOverride.city.trim()) {
      toast.error("Please enter city name");
      return;
    }
    setIsDirty(true);
    setEditableRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
      if (!next.commission) next.commission = {};
      if (!next.commission.cityAreaOverrides) next.commission.cityAreaOverrides = [];
      next.commission.cityAreaOverrides.push({
        id: `comm-${Date.now()}`,
        city: newCityCommOverride.city.trim(),
        area: newCityCommOverride.area.trim() || "All Areas",
        ratePercent: newCityCommOverride.ratePercent,
        active: true,
      });
      return next;
    });
    setNewCityCommOverride({ city: "Kasganj", area: "All Areas", ratePercent: "15" });
    toast.success("City/Area commission override added.");
  };

  const handleDeleteCityCommOverride = (id: string) => {
    setIsDirty(true);
    setEditableRules((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
      if (next.commission?.cityAreaOverrides) {
        next.commission.cityAreaOverrides = next.commission.cityAreaOverrides.filter((c: any) => c.id !== id);
      }
      return next;
    });
    toast.info("City/Area commission override removed.");
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

        {/* Global Instant Multi-Entity Search Bar (Auto-Detect Regex) */}
        <GlobalFinanceSearch
          onSelectResult={(result) => handleInspectEntity(result.type, result.id)}
        />

        {/* Real-Time Institutional Anomaly Warning Widget (8 Threat Checks) */}
        <AnomalyAlertBanner
          onSelectAnomaly={(anomaly) => {
            if (anomaly.action_url?.includes("cod")) {
              setActiveTab("cod");
            } else if (anomaly.action_url?.includes("recon")) {
              setActiveTab("recon");
            } else if (anomaly.action_url?.includes("ledger")) {
              setActiveTab("general-ledger");
            } else if (anomaly.action_url?.includes("settlement")) {
              setActiveTab("settlements");
            }
          }}
        />

        {/* Primary Enterprise Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="flex flex-wrap gap-1 bg-zinc-100 p-1.5 rounded-2xl h-auto border border-zinc-200 shadow-2xs">
            <TabsTrigger
              value="overview"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs rounded-xl"
            >
              <Activity className="size-3.5" />
              <span>Overview & P&L</span>
            </TabsTrigger>

            <TabsTrigger
              value="customer-360"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <User className="size-3.5 text-indigo-600" />
              <span>Customer 360</span>
              <Badge className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0 h-4 font-black">
                PHASE 1
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="expenses"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <Wallet className="size-3.5 text-emerald-600" />
              <span>Expense & Net Profit</span>
              <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0 h-4 font-black">
                REAL P&L
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="accounting-statements"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <Scale className="size-3.5 text-blue-600" />
              <span>GAAP Statements</span>
              <Badge className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0 h-4 font-black">
                PHASE 2
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="profitability"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <TrendingUp className="size-3.5 text-amber-600" />
              <span>Profitability Heatmap</span>
              <Badge className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0 h-4 font-black">
                PHASE 2
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="treasury"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <Landmark className="size-3.5 text-emerald-600" />
              <span>Treasury & Banks</span>
              <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0 h-4 font-black">
                PHASE 4
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="tax-center"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <Receipt className="size-3.5 text-purple-600" />
              <span>GST & Tax Center</span>
              <Badge className="bg-purple-100 text-purple-800 text-[9px] px-1.5 py-0 h-4 font-black">
                PHASE 2/4
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="approvals"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-rose-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <ShieldCheck className="size-3.5 text-rose-600" />
              <span>Maker-Checker</span>
              <Badge className="bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0 h-4 font-black">
                PHASE 1/3
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="ai-assistant"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <Sparkles className="size-3.5 text-cyan-600" />
              <span>AI Simulator</span>
              <Badge className="bg-cyan-100 text-cyan-800 text-[9px] px-1.5 py-0 h-4 font-black">
                PHASE 3
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="general-ledger"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <Scale className="size-3.5 text-blue-600" />
              <span>General Ledger (Double-Entry)</span>
            </TabsTrigger>

            <TabsTrigger
              value="cod"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <Truck className="size-3.5 text-emerald-600" />
              <span>COD & Fleet Vault</span>
            </TabsTrigger>

            <TabsTrigger
              value="recon"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <ShieldCheck className="size-3.5 text-purple-600" />
              <span>3-Way Recon</span>
            </TabsTrigger>

            <TabsTrigger
              value="unit-economics"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <TrendingUp className="size-3.5 text-amber-600" />
              <span>Unit Economics (CM1/CM2)</span>
            </TabsTrigger>

            <TabsTrigger
              value="memberships"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs rounded-xl"
            >
              <Tag className="size-3.5 text-indigo-600" />
              <span>Membership Plans</span>
            </TabsTrigger>

            <TabsTrigger
              value="settlements"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs rounded-xl"
            >
              <Landmark className="size-3.5" />
              <span>Settlements</span>
            </TabsTrigger>

            <TabsTrigger
              value="rules"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs rounded-xl"
            >
              <Sliders className="size-3.5" />
              <span>Rules Engine</span>
            </TabsTrigger>

            <TabsTrigger
              value="loyalty"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-800 data-[state=active]:shadow-xs rounded-xl"
            >
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Loyalty</span>
            </TabsTrigger>

            <TabsTrigger
              value="ledger"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs rounded-xl"
            >
              <FileText className="size-3.5" />
              <span>Order Inspector</span>
            </TabsTrigger>

            <TabsTrigger
              value="audit"
              className="font-bold text-xs py-2 px-3 flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs rounded-xl"
            >
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
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1 bg-zinc-100 p-1.5 rounded-xl h-auto border border-zinc-200/80">
                <TabsTrigger value="service-pricing" className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs">
                  <Sparkles className="size-3.5 mr-1 text-emerald-600" />
                  1. Base Pricing & Fees
                </TabsTrigger>
                <TabsTrigger value="delivery" className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-xs">
                  <Truck className="size-3.5 mr-1 text-sky-600" />
                  2. Delivery
                </TabsTrigger>
                <TabsTrigger value="commission" className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-xs">
                  <Percent className="size-3.5 mr-1 text-amber-600" />
                  3. Commission
                </TabsTrigger>
                <TabsTrigger value="gst" className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-xs">
                  <Receipt className="size-3.5 mr-1 text-purple-600" />
                  4. Tax / GST
                </TabsTrigger>
                <TabsTrigger value="cancellation" className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-xs">
                  <RotateCcw className="size-3.5 mr-1 text-orange-600" />
                  5. Refunds
                </TabsTrigger>
                <TabsTrigger value="rider-incentives" className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-xs">
                  <Bike className="size-3.5 mr-1 text-teal-600" />
                  6. Riders
                </TabsTrigger>
                <TabsTrigger value="settlement" className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs">
                  <Building2 className="size-3.5 mr-1 text-indigo-600" />
                  7. Settlement
                </TabsTrigger>
                <TabsTrigger value="versioning" className="text-xs font-bold py-2 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-xs">
                  <Clock className="size-3.5 mr-1 text-zinc-600" />
                  8. Versioning
                </TabsTrigger>
              </TabsList>

              {/* =========================================================================
                  MODULE A: UNIVERSAL BASE PRICING & CORE FEES
                 ========================================================================= */}
              <TabsContent value="service-pricing" className="mt-4 space-y-4">
                <SectionCard
                  title="A. Universal Base Pricing & Core Fees"
                  description="Centralized base price, express turnaround surcharge, handling fee, and checkout charges applied uniformly across all standard orders."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. Universal Base Price */}
                    <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                          Universal Base Price
                        </Label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold">
                          All Orders
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-sm">₹</span>
                        <Input
                          type="number"
                          value={editableRules?.pricing?.universalBasePrice ?? "69"}
                          onChange={(e) => {
                            updateField("pricing.universalBasePrice", e.target.value);
                          }}
                          className="pl-7 text-xl font-black font-mono h-11 bg-white border-emerald-300 text-emerald-900"
                          placeholder="69"
                        />
                      </div>
                      <p className="text-[11px] text-emerald-800/80 font-medium">
                        Standard base service amount applied across all customer orders.
                      </p>
                    </div>

                    {/* 2. Universal Express Turnaround Price */}
                    <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black text-amber-900 uppercase tracking-wide">
                          Universal Express Price
                        </Label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold">
                          24h Priority
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-sm">₹</span>
                        <Input
                          type="number"
                          value={editableRules?.pricing?.universalExpressPrice ?? "99"}
                          onChange={(e) => {
                            updateField("pricing.universalExpressPrice", e.target.value);
                          }}
                          className="pl-7 text-xl font-black font-mono h-11 bg-white border-amber-300 text-amber-900"
                          placeholder="99"
                        />
                      </div>
                      <p className="text-[11px] text-amber-800/80 font-medium">
                        Flat express turnaround priority price for quick 24-hour turnaround orders.
                      </p>
                    </div>

                    {/* 3. Handling & Packaging Fee */}
                    <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black text-blue-900 uppercase tracking-wide">
                          Order Handling Fee
                        </Label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 font-bold">
                          Packaging & Care
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-sm">
                            {editableRules?.fees?.handlingFeeType === "percentage" ? "%" : "₹"}
                          </span>
                          <Input
                            type="number"
                            value={editableRules?.fees?.handlingFee ?? editableRules?.pricing?.handlingFee ?? "15"}
                            onChange={(e) => {
                              updateField("fees.handlingFee", e.target.value);
                              updateField("pricing.handlingFee", e.target.value);
                            }}
                            className="pl-7 text-xl font-black font-mono h-11 bg-white border-blue-300 text-blue-900"
                            placeholder="15"
                          />
                        </div>
                        <Select
                          value={editableRules?.fees?.handlingFeeType ?? "fixed"}
                          onValueChange={(v) => {
                            updateField("fees.handlingFeeType", v);
                          }}
                        >
                          <SelectTrigger className="w-24 h-11 bg-white font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed ₹</SelectItem>
                            <SelectItem value="percentage">% Subtotal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[11px] text-blue-800/80 font-medium">
                        Sorting, sanitization & packaging fee charged at checkout.
                      </p>
                    </div>

                    {/* 4. Platform Convenience Fee */}
                    <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black text-purple-900 uppercase tracking-wide">
                          Platform Convenience Fee
                        </Label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-900 font-bold">
                          Cloud & App
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-zinc-400 font-bold text-sm">
                            {editableRules?.fees?.platformFeeType === "percentage" ? "%" : "₹"}
                          </span>
                          <Input
                            type="number"
                            value={editableRules?.fees?.platformFee ?? editableRules?.pricing?.platformFee ?? "10"}
                            onChange={(e) => {
                              updateField("fees.platformFee", e.target.value);
                              updateField("pricing.platformFee", e.target.value);
                            }}
                            className="pl-7 text-xl font-black font-mono h-11 bg-white border-purple-300 text-purple-900"
                            placeholder="10"
                          />
                        </div>
                        <Select
                          value={editableRules?.fees?.platformFeeType ?? "fixed"}
                          onValueChange={(v) => {
                            updateField("fees.platformFeeType", v);
                          }}
                        >
                          <SelectTrigger className="w-24 h-11 bg-white font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed ₹</SelectItem>
                            <SelectItem value="percentage">% Subtotal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[11px] text-purple-800/80 font-medium">
                        Platform technology infrastructure fee.
                      </p>
                    </div>
                  </div>

                  {/* Secondary Parameters: Minimum Order Value & Express Turnaround Multiplier */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                      <Label className="text-xs font-bold text-zinc-800">Minimum Order Value (MOV) (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.pricing?.minimumOrderValue ?? "99"}
                        onChange={(e) => updateField("pricing.minimumOrderValue", e.target.value)}
                        className="font-bold font-mono h-9 bg-white"
                        placeholder="99"
                      />
                      <span className="text-[10px] text-zinc-500">Minimum order subtotal required to checkout</span>
                    </div>

                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                      <Label className="text-xs font-bold text-zinc-800">Express Multiplier Fallback (x)</Label>
                      <Input
                        type="number"
                        step="0.05"
                        value={editableRules?.pricing?.expressMultiplier ?? "1.35"}
                        onChange={(e) => updateField("pricing.expressMultiplier", e.target.value)}
                        className="font-bold font-mono h-9 bg-white"
                        placeholder="1.35"
                      />
                      <span className="text-[10px] text-zinc-500">Multiplier (+35%) applied if express fee is percentage-based</span>
                    </div>
                  </div>

                  {/* Helpful Guidance Notice */}
                  <div className="p-3.5 bg-zinc-100 rounded-xl border border-zinc-200/80 flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-zinc-900">Unified Pricing Architecture</div>
                      <div className="text-zinc-600">
                        Individual item-level categories and garment items are managed in the <span className="font-bold text-zinc-800">Services Catalog (/services)</span>. 
                        The single base price, express turnaround rate, and handling fees configured above are universally computed at checkout for all standard orders.
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* =========================================================================
                  MODULE B: DELIVERY & DISTANCE PRICING ENGINE
                 ========================================================================= */}
              <TabsContent value="delivery" className="mt-4 space-y-4">
                <SectionCard title="B. Delivery & Logistics Pricing Engine">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                      <Label className="text-xs font-bold">Base Distance Included (km)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editableRules?.delivery?.baseDistanceKm ?? "2.0"}
                        onChange={(e) => updateField("delivery.baseDistanceKm", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Per-Km Rate after Base (₹)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editableRules?.delivery?.perKmRate ?? "8.0"}
                        onChange={(e) => updateField("delivery.perKmRate", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Minimum Delivery Floor (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.delivery?.minimumDeliveryFee ?? "25"}
                        onChange={(e) => updateField("delivery.minimumDeliveryFee", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
                    <div>
                      <Label className="text-xs font-bold">Express Delivery Fee (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.delivery?.expressDeliveryFee ?? "40"}
                        onChange={(e) => updateField("delivery.expressDeliveryFee", e.target.value)}
                        className="mt-1 font-bold text-amber-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Rain Weather Surge (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.delivery?.rainSurge ?? ""}
                        onChange={(e) => updateField("delivery.rainSurge", e.target.value)}
                        className="mt-1 font-bold text-sky-600"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Night Late Surge (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.delivery?.nightSurge ?? ""}
                        onChange={(e) => updateField("delivery.nightSurge", e.target.value)}
                        className="mt-1 font-bold text-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Distance Tier Slabs */}
                  <div className="border rounded-xl p-3 bg-zinc-50 mb-4">
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

                  {/* City & Area Specific Delivery Overrides */}
                  <div className="border rounded-xl p-3 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-zinc-900 uppercase">
                        Area-Wise Delivery Pricing ({editableRules?.delivery?.cityAreaPricing?.length || 0} Areas)
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 font-black text-zinc-700 uppercase">
                          <tr>
                            <th className="p-2">City</th>
                            <th className="p-2">Area</th>
                            <th className="p-2">Base Fee (₹)</th>
                            <th className="p-2">Per-Km (₹)</th>
                            <th className="p-2">Min Fee (₹)</th>
                            <th className="p-2">Active</th>
                            <th className="p-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                          {(editableRules?.delivery?.cityAreaPricing || []).map((c: any, idx: number) => (
                            <tr key={c.id || idx}>
                              <td className="p-2 font-sans font-bold">{c.city}</td>
                              <td className="p-2 font-sans">{c.area}</td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={c.baseFee ?? ""}
                                  onChange={(e) => {
                                    setIsDirty(true);
                                    setEditableRules((prev: any) => {
                                      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                      if (next.delivery.cityAreaPricing[idx]) next.delivery.cityAreaPricing[idx].baseFee = e.target.value;
                                      return next;
                                    });
                                  }}
                                  className="w-20 font-bold h-7"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.5"
                                  value={c.perKmRate ?? ""}
                                  onChange={(e) => {
                                    setIsDirty(true);
                                    setEditableRules((prev: any) => {
                                      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                      if (next.delivery.cityAreaPricing[idx]) next.delivery.cityAreaPricing[idx].perKmRate = e.target.value;
                                      return next;
                                    });
                                  }}
                                  className="w-20 font-bold h-7"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  value={c.minFee ?? ""}
                                  onChange={(e) => {
                                    setIsDirty(true);
                                    setEditableRules((prev: any) => {
                                      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                      if (next.delivery.cityAreaPricing[idx]) next.delivery.cityAreaPricing[idx].minFee = e.target.value;
                                      return next;
                                    });
                                  }}
                                  className="w-20 font-bold h-7"
                                />
                              </td>
                              <td className="p-2">
                                <Switch
                                  checked={c.active !== false}
                                  onCheckedChange={(checked) => {
                                    setIsDirty(true);
                                    setEditableRules((prev: any) => {
                                      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                      if (next.delivery.cityAreaPricing[idx]) next.delivery.cityAreaPricing[idx].active = checked;
                                      return next;
                                    });
                                  }}
                                />
                              </td>
                              <td className="p-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleDeleteAreaPricing(c.id)}
                                  className="h-6 px-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Quick Add Area Form */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
                      <Input
                        placeholder="City (e.g. Kasganj)"
                        value={newAreaPricing.city}
                        onChange={(e) => setNewAreaPricing((p) => ({ ...p, city: e.target.value }))}
                        className="w-28 text-xs font-bold h-8"
                      />
                      <Input
                        placeholder="Area (e.g. Soron Gate)"
                        value={newAreaPricing.area}
                        onChange={(e) => setNewAreaPricing((p) => ({ ...p, area: e.target.value }))}
                        className="w-36 text-xs h-8"
                      />
                      <Input
                        type="number"
                        placeholder="Base (₹)"
                        value={newAreaPricing.baseFee}
                        onChange={(e) => setNewAreaPricing((p) => ({ ...p, baseFee: e.target.value }))}
                        className="w-20 text-xs font-bold h-8"
                      />
                      <Input
                        type="number"
                        placeholder="Per Km"
                        value={newAreaPricing.perKmRate}
                        onChange={(e) => setNewAreaPricing((p) => ({ ...p, perKmRate: e.target.value }))}
                        className="w-20 text-xs font-bold h-8"
                      />
                      <Input
                        type="number"
                        placeholder="Min Fee"
                        value={newAreaPricing.minFee}
                        onChange={(e) => setNewAreaPricing((p) => ({ ...p, minFee: e.target.value }))}
                        className="w-20 text-xs font-bold h-8"
                      />
                      <Button
                        size="xs"
                        onClick={handleAddAreaPricing}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 px-3"
                      >
                        <Plus className="size-3.5 mr-1" />
                        Add Area Rule
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* =========================================================================
                  MODULE C: UNIVERSAL MARKETPLACE COMMISSION
                 ========================================================================= */}
              <TabsContent value="commission" className="mt-4 space-y-4">
                <SectionCard
                  title="C. Universal Marketplace Commission Engine"
                  description="Single standard commission rate retained by QuickPress on all laundry partner earnings uniformly across all orders."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Primary Universal Commission Rate */}
                    <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-2xl border border-amber-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black text-amber-900 uppercase tracking-wide">
                          Platform Retained Commission
                        </Label>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                          All Partners & Orders
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          value={
                            editableRules?.commission?.platformCommissionPercent ??
                            editableRules?.commission?.standardPercent ??
                            "18"
                          }
                          onChange={(e) => {
                            updateField("commission.platformCommissionPercent", e.target.value);
                            updateField("commission.standardPercent", e.target.value);
                          }}
                          className="pr-12 text-3xl font-black font-mono h-14 bg-white border-amber-300 text-amber-900"
                          placeholder="18"
                        />
                        <span className="absolute right-4 top-3.5 text-amber-700 font-black text-xl">%</span>
                      </div>
                      <p className="text-xs text-amber-900/80 font-medium">
                        Unified commission rate deducted from the laundry service subtotal before merchant payout settlement.
                      </p>
                    </div>

                    {/* Fixed Per-Order Fee (Optional) */}
                    <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black text-zinc-900 uppercase tracking-wide">
                          Fixed Fee Per Order (Optional)
                        </Label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 font-bold">
                          Flat Surcharge
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-3.5 text-zinc-400 font-bold text-lg">₹</span>
                        <Input
                          type="number"
                          value={editableRules?.commission?.fixedAmountPerOrder ?? "0"}
                          onChange={(e) => updateField("commission.fixedAmountPerOrder", e.target.value)}
                          className="pl-8 text-2xl font-black font-mono h-14 bg-white text-zinc-900"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-zinc-500 font-medium">
                        Optional additional fixed rupee fee per order. Defaults to ₹0 for standard marketplace operations.
                      </p>
                    </div>
                  </div>

                  {/* Delivery Captain Commission Guarantee Card */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-black text-emerald-950 uppercase tracking-wide">
                        Captain Commission Guarantee: 0.0% Commission
                      </div>
                      <div className="text-emerald-900 leading-relaxed font-medium">
                        Delivery Captains are never charged commission. 100% of the customer logistics delivery fee, distance fares, express bonuses, and customer tips are disbursed directly into the captain&apos;s settlement balance.
                      </div>
                    </div>
                  </div>

                  {/* Statutory Tax Deductions Notice */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                      <Receipt className="size-5" />
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-zinc-900">
                        Statutory Merchant Deductions (TCS & TDS)
                      </div>
                      <div className="text-zinc-600 leading-relaxed">
                        In accordance with Indian tax statutes, <span className="font-bold text-zinc-800">1.0% Section 194-O TCS</span> and <span className="font-bold text-zinc-800">1.0% Section 194-C TDS</span> are automatically computed and reported in the settlement batch audit trail.
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* =========================================================================
                  MODULE D: TAX / GST ENGINE
                 ========================================================================= */}
              <TabsContent value="gst" className="mt-4 space-y-4">
                <SectionCard title="D. Statutory Tax & GST Engine (SAC Codes)">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex flex-col justify-center p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">GST Engine Status</Label>
                        <Switch
                          checked={editableRules?.gst?.enabled !== false}
                          onCheckedChange={(checked) => updateField("gst.enabled", checked)}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1">
                        {editableRules?.gst?.enabled !== false ? "Active tax calculation" : "Tax disabled"}
                      </span>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Tax Pricing Display Mode</Label>
                      <Select
                        value={editableRules?.gst?.pricingMode ?? "exclusive"}
                        onValueChange={(v) => updateField("gst.pricingMode", v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exclusive">Exclusive (GST added on bill)</SelectItem>
                          <SelectItem value="inclusive">Inclusive (GST included in prices)</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-zinc-500">Government compliant invoicing</span>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Laundry Fabric GST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editableRules?.gst?.laundryGstPercent ?? "5"}
                        onChange={(e) => updateField("gst.laundryGstPercent", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                      <span className="text-[10px] text-zinc-500">5% standard under fabric cleaning</span>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Platform / Service Fee GST (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editableRules?.gst?.platformGstPercent ?? "18"}
                        onChange={(e) => updateField("gst.platformGstPercent", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                      <span className="text-[10px] text-zinc-500">18% IT / marketplace service</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Delivery Fee GST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editableRules?.gst?.deliveryGstPercent ?? "18"}
                        onChange={(e) => updateField("gst.deliveryGstPercent", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Intra-State CGST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editableRules?.gst?.cgstPercent ?? "2.5"}
                        onChange={(e) => updateField("gst.cgstPercent", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Intra-State SGST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editableRules?.gst?.sgstPercent ?? "2.5"}
                        onChange={(e) => updateField("gst.sgstPercent", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Inter-State IGST Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editableRules?.gst?.igstPercent ?? "5.0"}
                        onChange={(e) => updateField("gst.igstPercent", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Section 194-O TCS Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={editableRules?.gst?.tcsPercent ?? "1"}
                        onChange={(e) => updateField("gst.tcsPercent", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                      <span className="text-[10px] text-zinc-500">1% TCS on e-commerce merchants</span>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Section 194C TDS Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={editableRules?.gst?.tdsPercent ?? "1"}
                        onChange={(e) => updateField("gst.tdsPercent", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                      <span className="text-[10px] text-zinc-500">1% TDS contractor deduction</span>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Registered QuickPress GSTIN</Label>
                      <Input
                        value={editableRules?.gst?.quickpressGstin ?? ""}
                        onChange={(e) => updateField("gst.quickpressGstin", e.target.value)}
                        className="mt-1 font-mono uppercase font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Home Operating State</Label>
                      <Input
                        value={editableRules?.gst?.defaultState ?? "Uttar Pradesh"}
                        onChange={(e) => updateField("gst.defaultState", e.target.value)}
                        className="mt-1 font-bold"
                      />
                    </div>
                  </div>

                  {/* Category Tax Overrides */}
                  <div className="border rounded-xl p-3 bg-white space-y-3">
                    <h4 className="text-xs font-black text-zinc-900 uppercase">
                      Category Tax Overrides ({editableRules?.gst?.categoryTaxOverrides?.length || 0})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-100 font-black text-zinc-700 uppercase">
                          <tr>
                            <th className="p-2">Category</th>
                            <th className="p-2">GST Rate (%)</th>
                            <th className="p-2">Active</th>
                            <th className="p-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                          {(editableRules?.gst?.categoryTaxOverrides || []).map((t: any, idx: number) => (
                            <tr key={t.id || idx}>
                              <td className="p-2 font-sans font-bold">{t.category}</td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={t.gstRatePercent ?? ""}
                                  onChange={(e) => {
                                    setIsDirty(true);
                                    setEditableRules((prev: any) => {
                                      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                      if (next.gst.categoryTaxOverrides[idx]) next.gst.categoryTaxOverrides[idx].gstRatePercent = e.target.value;
                                      return next;
                                    });
                                  }}
                                  className="w-24 font-bold h-7"
                                />
                              </td>
                              <td className="p-2">
                                <Switch
                                  checked={t.active !== false}
                                  onCheckedChange={(checked) => {
                                    setIsDirty(true);
                                    setEditableRules((prev: any) => {
                                      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                      if (next.gst.categoryTaxOverrides[idx]) next.gst.categoryTaxOverrides[idx].active = checked;
                                      return next;
                                    });
                                  }}
                                />
                              </td>
                              <td className="p-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleDeleteTaxOverride(t.id)}
                                  className="h-6 px-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
                      <Input
                        placeholder="Category (e.g. Dry Cleaning)"
                        value={newTaxOverride.category}
                        onChange={(e) => setNewTaxOverride((p) => ({ ...p, category: e.target.value }))}
                        className="w-48 text-xs h-8"
                      />
                      <Input
                        type="number"
                        placeholder="GST Rate %"
                        value={newTaxOverride.gstRatePercent}
                        onChange={(e) => setNewTaxOverride((p) => ({ ...p, gstRatePercent: e.target.value }))}
                        className="w-28 text-xs font-bold h-8"
                      />
                      <Button
                        size="xs"
                        onClick={handleAddTaxOverride}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 px-3"
                      >
                        <Plus className="size-3.5 mr-1" />
                        Add Tax Override
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* =========================================================================
                  MODULE E: PLATFORM & HANDLING FEES (and alias "pricing")
                 ========================================================================= */}
              <TabsContent value="fees" className="mt-4 space-y-4">
                <SectionCard title="E. Platform, Handling & Packaging Fees">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                      <Label className="text-xs font-bold">Platform Convenience Fee</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editableRules?.fees?.platformFee ?? editableRules?.pricing?.platformFee ?? "10"}
                          onChange={(e) => {
                            updateField("fees.platformFee", e.target.value);
                            updateField("pricing.platformFee", e.target.value);
                          }}
                          className="font-bold font-mono"
                        />
                        <Select
                          value={editableRules?.fees?.platformFeeType ?? "fixed"}
                          onValueChange={(v) => updateField("fees.platformFeeType", v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed ₹</SelectItem>
                            <SelectItem value="percentage">% of Subtotal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-[10px] text-zinc-500">Platform software & cloud access</span>
                    </div>

                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                      <Label className="text-xs font-bold">Handling & Packaging Fee</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editableRules?.fees?.handlingFee ?? editableRules?.pricing?.handlingFee ?? "15"}
                          onChange={(e) => {
                            updateField("fees.handlingFee", e.target.value);
                            updateField("pricing.handlingFee", e.target.value);
                          }}
                          className="font-bold font-mono"
                        />
                        <Select
                          value={editableRules?.fees?.handlingFeeType ?? "fixed"}
                          onValueChange={(v) => updateField("fees.handlingFeeType", v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed ₹</SelectItem>
                            <SelectItem value="percentage">% of Subtotal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-[10px] text-zinc-500">Order sorting & dispatch handling</span>
                    </div>

                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                      <Label className="text-xs font-bold">Customer Convenience Fee</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editableRules?.fees?.convenienceFee ?? "0"}
                          onChange={(e) => updateField("fees.convenienceFee", e.target.value)}
                          className="font-bold font-mono"
                        />
                        <Select
                          value={editableRules?.fees?.convenienceFeeType ?? "fixed"}
                          onValueChange={(v) => updateField("fees.convenienceFeeType", v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed ₹</SelectItem>
                            <SelectItem value="percentage">% of Subtotal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-[10px] text-zinc-500">Online payment processing fee</span>
                    </div>

                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                      <Label className="text-xs font-bold">Packaging Material Charge</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editableRules?.fees?.packagingFee ?? "0"}
                          onChange={(e) => updateField("fees.packagingFee", e.target.value)}
                          className="font-bold font-mono"
                        />
                        <Select
                          value={editableRules?.fees?.packagingFeeType ?? "fixed"}
                          onValueChange={(v) => updateField("fees.packagingFeeType", v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed ₹</SelectItem>
                            <SelectItem value="percentage">% of Subtotal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-[10px] text-zinc-500">Cloth garment bags & hanger cost</span>
                    </div>

                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                      <Label className="text-xs font-bold">Operational Service Charge</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editableRules?.fees?.serviceCharge ?? "0"}
                          onChange={(e) => updateField("fees.serviceCharge", e.target.value)}
                          className="font-bold font-mono"
                        />
                        <Select
                          value={editableRules?.fees?.serviceChargeType ?? "fixed"}
                          onValueChange={(v) => updateField("fees.serviceChargeType", v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed ₹</SelectItem>
                            <SelectItem value="percentage">% of Subtotal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-[10px] text-zinc-500">Specialized laundry inspection charge</span>
                    </div>

                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                      <Label className="text-xs font-bold">Minimum Order Value (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.pricing?.minimumOrderValue ?? "99"}
                        onChange={(e) => {
                          updateField("pricing.minimumOrderValue", e.target.value);
                          updateField("discount.minOrderValue", e.target.value);
                        }}
                        className="font-bold font-mono"
                      />
                      <span className="text-[10px] text-zinc-500">Cart checkout floor required</span>
                    </div>
                  </div>

                  {/* Multipliers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Express Turnaround Multiplier</Label>
                      <Input
                        type="number"
                        step="0.05"
                        value={editableRules?.pricing?.expressMultiplier ?? "1.35"}
                        onChange={(e) => updateField("pricing.expressMultiplier", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                      <span className="text-[10px] text-zinc-500">1.35 = +35% on standard laundry price for 24-hr priority</span>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Demand Surge Multiplier</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editableRules?.pricing?.surgeMultiplier ?? "1.0"}
                        onChange={(e) => updateField("pricing.surgeMultiplier", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                      <span className="text-[10px] text-zinc-500">1.0 = normal, 1.2 = +20% during peak festival volume</span>
                    </div>
                  </div>

                  {/* Express Priority Pickup & Revenue Sharing */}
                  <div className="p-4 rounded-xl border bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
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
                        />
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
                        />
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
                        />
                      </div>
                    </div>

                    {/* Live Revenue Split Breakdown */}
                    {(() => {
                      const fee = Number(editableRules?.expressPickup?.fee) || 40;
                      const partnerPct = Number(editableRules?.expressPickup?.partnerSharePercent) ?? 20;
                      const riderPct = Number(editableRules?.expressPickup?.riderSharePercent) ?? 80;
                      const partnerAmount = Math.round((fee * (partnerPct / 100)) * 100) / 100;
                      const riderAmount = Math.round((fee * (riderPct / 100)) * 100) / 100;
                      const totalPct = partnerPct + riderPct;
                      const isRatioMismatched = totalPct !== 100;

                      return (
                        <div className="mt-4 p-3 rounded-xl border bg-white/70 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold flex items-center gap-1.5 text-foreground">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Live Express Split Preview
                            </span>
                            {isRatioMismatched ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 font-bold text-[11px] flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Total is {totalPct}% (Expected 100%)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced Split
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2 rounded bg-zinc-50 border">
                              <span className="text-zinc-500 text-[10px] block">Customer Pays</span>
                              <strong className="text-amber-600 text-sm">₹{fee.toFixed(2)}</strong>
                            </div>
                            <div className="p-2 rounded bg-zinc-50 border">
                              <span className="text-zinc-500 text-[10px] block">Partner Bonus (+{partnerPct}%)</span>
                              <strong className="text-blue-600 text-sm">+₹{partnerAmount.toFixed(2)}</strong>
                            </div>
                            <div className="p-2 rounded bg-zinc-50 border">
                              <span className="text-zinc-500 text-[10px] block">Rider Bonus (+{riderPct}%)</span>
                              <strong className="text-emerald-600 text-sm">+₹{riderAmount.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </SectionCard>
              </TabsContent>

              {/* Legacy Pricing Alias */}
              <TabsContent value="pricing" className="mt-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 mb-3 flex items-center justify-between">
                  <span>Redirected to Fees & Charges engine. Configure platform convenience, handling, and express fees here.</span>
                  <Button size="xs" onClick={() => setRulesSubTab("fees")} className="bg-amber-600 text-white font-bold">
                    Go to Fees Tab
                  </Button>
                </div>
              </TabsContent>



              {/* =========================================================================
                  MODULE G: CANCELLATION & REFUND RULES
                 ========================================================================= */}
              <TabsContent value="cancellation" className="mt-4 space-y-4">
                <SectionCard title="G. Stage-Based Order Cancellation & Refund Matrix">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Standard Cancellation Processing Fee (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.cancellation?.processingFee ?? "0"}
                        onChange={(e) => updateField("cancellation.processingFee", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Automated Refund Policy & SLA</Label>
                      <Input
                        value={editableRules?.cancellation?.refundEligibility ?? "Instant wallet credit or 2-4 day bank reversal"}
                        onChange={(e) => updateField("cancellation.refundEligibility", e.target.value)}
                        className="mt-1 font-medium text-xs"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border rounded-xl bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-100 font-black text-zinc-700 uppercase">
                        <tr>
                          <th className="p-2.5">Order Stage</th>
                          <th className="p-2.5">Cancellation Fee (₹)</th>
                          <th className="p-2.5">Customer Refund (%)</th>
                          <th className="p-2.5">Allow Customer Cancel?</th>
                          <th className="p-2.5">Policy Rationale / Cost Consumption Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {Object.entries(editableRules?.cancellation || {})
                          .filter(([key]) => key !== "processingFee" && key !== "refundEligibility")
                          .map(([stage, policy]: [string, any]) => (
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
                                  className="w-24 font-mono font-bold h-8 text-emerald-700"
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
                              <td className="p-2.5">
                                <Input
                                  value={policy.notes ?? ""}
                                  onChange={(e) => {
                                    setIsDirty(true);
                                    setEditableRules((prev: any) => {
                                      const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                      if (!next.cancellation[stage]) next.cancellation[stage] = {};
                                      next.cancellation[stage].notes = e.target.value;
                                      return next;
                                    });
                                  }}
                                  placeholder="Rationale"
                                  className="text-xs h-8 text-zinc-600 font-sans"
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* =========================================================================
                  MODULE H: RIDER EARNINGS & INCENTIVES (and alias "incentives")
                 ========================================================================= */}
              <TabsContent value="rider-incentives" className="mt-4 space-y-6">
                <SectionCard title="H. Delivery Captain Base Pay & Distance Earnings">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Base Trip Pay (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.riderPayout?.basePay ?? "25"}
                        onChange={(e) => updateField("riderPayout.basePay", e.target.value)}
                        className="mt-1 font-bold font-mono text-emerald-700"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Base Distance Included (km)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editableRules?.riderPayout?.baseDistanceKm ?? "2.0"}
                        onChange={(e) => updateField("riderPayout.baseDistanceKm", e.target.value)}
                        className="mt-1 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Per-Km Travel Pay (₹)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editableRules?.riderPayout?.perKmRate ?? "6.0"}
                        onChange={(e) => updateField("riderPayout.perKmRate", e.target.value)}
                        className="mt-1 font-bold font-mono text-emerald-700"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Pickup Stop Earning (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.riderPayout?.pickupEarning ?? "10"}
                        onChange={(e) => updateField("riderPayout.pickupEarning", e.target.value)}
                        className="mt-1 font-bold font-mono text-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Delivery Drop Earning (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.riderPayout?.deliveryEarning ?? "15"}
                        onChange={(e) => updateField("riderPayout.deliveryEarning", e.target.value)}
                        className="mt-1 font-bold font-mono text-emerald-700"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Peak Rush Hour Incentive (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.riderPayout?.peakIncentive ?? "15"}
                        onChange={(e) => updateField("riderPayout.peakIncentive", e.target.value)}
                        className="mt-1 font-bold font-mono text-amber-600"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Rain Weather Bonus Pass-Through (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.riderPayout?.rainSurge ?? "20"}
                        onChange={(e) => updateField("riderPayout.rainSurge", e.target.value)}
                        className="mt-1 font-bold font-mono text-sky-600"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Night Late Surge Pass-Through (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.riderPayout?.nightSurge ?? "25"}
                        onChange={(e) => updateField("riderPayout.nightSurge", e.target.value)}
                        className="mt-1 font-bold font-mono text-indigo-600"
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Candy Crush Ladder */}
                <SectionCard
                  title="Candy Crush 10-Level Captain Milestone Ladder"
                  badge={`${(editableRules?.incentives?.candyCrushLevels || []).length} Levels Active`}
                >
                  <div className="space-y-4">
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
                          When you save, these rates sync live directly to every Captain&apos;s App!
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
                            toast.info("Reset to default 10-level ladder. Click 'Save Rule Changes' to apply.");
                          }}
                          className="text-xs font-bold bg-white hover:bg-zinc-100"
                        >
                          <RefreshCw className="size-3.5 mr-1" />
                          Reset Defaults
                        </Button>
                      </div>
                    </div>

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
                              <div>
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
                                  className="h-8 text-xs font-bold mt-1"
                                />
                              </div>

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

                {/* Duty Streak Bonus */}
                <SectionCard title="Captain Weekly 6-Day Duty Streak Bonus">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                    <div>
                      <Label className="text-xs font-bold text-zinc-700">Weekly Target Trips</Label>
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
                        className="font-mono font-bold mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-zinc-700">Mega Reward (₹)</Label>
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
                        className="font-mono font-bold mt-1 text-emerald-700"
                      />
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* Legacy Incentives Alias */}
              <TabsContent value="incentives" className="mt-4">
                <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-900 mb-3 flex items-center justify-between">
                  <span>Redirected to Rider Earnings & Incentives engine.</span>
                  <Button size="xs" onClick={() => setRulesSubTab("rider-incentives")} className="bg-teal-600 text-white font-bold">
                    Go to Rider Earnings Tab
                  </Button>
                </div>
              </TabsContent>

              {/* =========================================================================
                  MODULE I: PARTNER SETTLEMENT & QUALITY PENALTIES (and alias "penalties")
                 ========================================================================= */}
              <TabsContent value="settlement" className="mt-4 space-y-4">
                <SectionCard title="I. Partner Settlement Escrow & Weekly Disbursals">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Partner Net Processing Share (%)</Label>
                      <Input
                        type="number"
                        value={editableRules?.partnerSettlement?.partnerSharePercent ?? editableRules?.settlement?.partnerSharePercent ?? "82"}
                        onChange={(e) => {
                          updateField("partnerSettlement.partnerSharePercent", e.target.value);
                          updateField("settlement.partnerSharePercent", e.target.value);
                        }}
                        className="mt-1 font-bold text-sky-700 font-mono"
                      />
                      <span className="text-[10px] text-zinc-500">Credited to merchant store escrow</span>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Settlement Cycle Frequency</Label>
                      <Select
                        value={editableRules?.partnerSettlement?.cycle ?? editableRules?.settlement?.cycle ?? "WEEKLY"}
                        onValueChange={(v) => {
                          updateField("partnerSettlement.cycle", v);
                          updateField("settlement.cycle", v);
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEKLY">Weekly Automated Cycle</SelectItem>
                          <SelectItem value="BIWEEKLY">Bi-Weekly (1st & 16th)</SelectItem>
                          <SelectItem value="DAILY">Daily Fast Payout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Disbursement Payout Day</Label>
                      <Input
                        value={editableRules?.partnerSettlement?.payoutDay ?? editableRules?.settlement?.payoutDay ?? "WEDNESDAY"}
                        onChange={(e) => {
                          updateField("partnerSettlement.payoutDay", e.target.value);
                          updateField("settlement.payoutDay", e.target.value);
                        }}
                        className="mt-1 font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Auto-Approve Batch Ceiling (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.partnerSettlement?.autoApproveMaxAmount ?? editableRules?.settlement?.autoApproveMaxAmount ?? "50000"}
                        onChange={(e) => {
                          updateField("partnerSettlement.autoApproveMaxAmount", e.target.value);
                          updateField("settlement.autoApproveMaxAmount", e.target.value);
                        }}
                        className="mt-1 font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Minimum Settlement Withdrawal (₹)</Label>
                      <Input
                        type="number"
                        value={editableRules?.partnerSettlement?.minWithdrawal ?? "100"}
                        onChange={(e) => {
                          updateField("partnerSettlement.minWithdrawal", e.target.value);
                          updateField("partnerSettlement.minSettlementPayout", e.target.value);
                          updateField("settlement.minSettlementPayout", e.target.value);
                        }}
                        className="mt-1 font-bold font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-xs font-bold">Settlement Adjustment & Reconciliation Policy</Label>
                      <Input
                        value={editableRules?.partnerSettlement?.adjustmentRules ?? "Late pickup penalties and damage claims are automatically deducted from the weekly cycle payout."}
                        onChange={(e) => {
                          updateField("partnerSettlement.adjustmentRules", e.target.value);
                          updateField("settlement.adjustmentRules", e.target.value);
                        }}
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>

                  {/* Delay Late Fees & Grace Period */}
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 mb-4 space-y-2">
                    <h4 className="text-xs font-black text-zinc-900 uppercase">Operational Delay Late Fees</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-[11px] font-bold text-zinc-600">Grace Period (min)</Label>
                        <Input
                          type="number"
                          value={editableRules?.lateFee?.gracePeriodMinutes ?? "15"}
                          onChange={(e) => updateField("lateFee.gracePeriodMinutes", e.target.value)}
                          className="h-8 font-mono font-bold mt-1"
                        />
                      </div>
                      {(editableRules?.lateFee?.slabs || []).map((slab: any, idx: number) => (
                        <div key={idx}>
                          <Label className="text-[11px] font-bold text-zinc-600">
                            {slab.minDelayMin}-{slab.maxDelayMin >= 9999 ? "60+ min" : `${slab.maxDelayMin} min`} Delay
                          </Label>
                          <Input
                            type="number"
                            value={slab.fee ?? ""}
                            onChange={(e) => {
                              setIsDirty(true);
                              setEditableRules((prev: any) => {
                                const next = JSON.parse(JSON.stringify(prev || DEFAULT_FINANCIAL_RULES));
                                if (!next.lateFee.slabs[idx]) next.lateFee.slabs[idx] = {};
                                next.lateFee.slabs[idx].fee = e.target.value;
                                return next;
                              });
                            }}
                            className="h-8 font-mono font-bold mt-1 text-rose-600"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quality Penalties Matrix */}
                  <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-2">
                    <h4 className="text-xs font-black text-zinc-900 uppercase">Quality Incident Penalties Matrix</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(editableRules?.penalties || {}).map(([type, amount]: [string, any]) => (
                        <div key={type} className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200">
                          <Label className="text-[11px] font-bold capitalize text-zinc-700">
                            {type.replace(/([A-Z])/g, " $1")}
                          </Label>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs font-bold text-zinc-400">₹</span>
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
                              className="font-mono font-bold h-8 text-rose-600"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </TabsContent>

              {/* Legacy Penalties Alias */}
              <TabsContent value="penalties" className="mt-4">
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 mb-3 flex items-center justify-between">
                  <span>Redirected to Partner Settlement & Quality Penalties module.</span>
                  <Button size="xs" onClick={() => setRulesSubTab("settlement")} className="bg-indigo-600 text-white font-bold">
                    Go to Settlement Tab
                  </Button>
                </div>
              </TabsContent>

              {/* =========================================================================
                  MODULE J: VERSIONING & SCHEDULED EFFECTIVE DATES
                 ========================================================================= */}
              <TabsContent value="versioning" className="mt-4 space-y-4">
                <SectionCard
                  title="J. Commercial Rule Versioning & Scheduled Rollouts"
                  description="Governance controls for release version tagging, immutable timestamps, and future scheduled activations."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs font-bold">Current Rule Version</Label>
                      <Input
                        value={editableRules?.versioning?.version ?? "v2.5.0"}
                        onChange={(e) => updateField("versioning.version", e.target.value)}
                        className="mt-1 font-mono font-bold text-emerald-700"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Rule Lifecycle Status</Label>
                      <Select
                        value={editableRules?.versioning?.status ?? "active"}
                        onValueChange={(v) => updateField("versioning.status", v)}
                      >
                        <SelectTrigger className="mt-1 font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active (Serving Live Orders)</SelectItem>
                          <SelectItem value="draft">Draft (Staged in Admin)</SelectItem>
                          <SelectItem value="scheduled">Scheduled (Timed Rollout)</SelectItem>
                          <SelectItem value="expired">Archived / Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Effective From</Label>
                      <Input
                        value={editableRules?.versioning?.effectiveFrom ?? "2026-01-01T00:00:00Z"}
                        onChange={(e) => updateField("versioning.effectiveFrom", e.target.value)}
                        className="mt-1 font-mono text-xs font-bold"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Effective Until</Label>
                      <Input
                        value={editableRules?.versioning?.effectiveUntil ?? "2099-12-31T23:59:59Z"}
                        onChange={(e) => updateField("versioning.effectiveUntil", e.target.value)}
                        className="mt-1 font-mono text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Scheduled Rollout Configuration */}
                  <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 space-y-3">
                    <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                      <CalendarCheck className="size-4 text-teal-700" />
                      <span>Scheduled Future Activation Date & Time (Optional)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs font-bold text-zinc-700">Scheduled ISO Timestamp</Label>
                        <Input
                          placeholder="e.g. 2026-10-01T00:00:00Z"
                          value={editableRules?.versioning?.scheduledAt ?? ""}
                          onChange={(e) => updateField("versioning.scheduledAt", e.target.value)}
                          className="mt-1 font-mono text-xs font-bold bg-white"
                        />
                        <span className="text-[10px] text-zinc-500">
                          If specified, the engine activates these pricing rules at the scheduled timestamp.
                        </span>
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const nextVer = `v2.${Date.now().toString().slice(-4)}`;
                            updateField("versioning.version", nextVer);
                            updateField("versioning.status", "scheduled");
                            toast.info(`Created new scheduled version draft: ${nextVer}`);
                          }}
                          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                        >
                          Stage New Release Version
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Audit Notice */}
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
                    <span>
                      Every update automatically writes an entry to the <strong>financial_audit_logs</strong> collection with admin identity, version hash, and timestamp.
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setActiveTab("audit")}
                      className="font-bold text-xs"
                    >
                      View Audit Log History
                    </Button>
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

          {/* =========================================================================
              PHASE 1: DOUBLE-ENTRY GENERAL LEDGER (CHART OF ACCOUNTS & TRIAL BALANCE)
             ========================================================================= */}
          <TabsContent value="general-ledger" className="mt-6 space-y-6">
            <DoubleEntryLedgerView />
          </TabsContent>

          {/* =========================================================================
              PHASE 2: COD MANAGEMENT & RIDER RISK CONTROLS
             ========================================================================= */}
          <TabsContent value="cod" className="mt-6 space-y-6">
            <CodManagementView />
          </TabsContent>

          {/* =========================================================================
              PHASE 3: 3-WAY AUTOMATED RECONCILIATION ENGINE
             ========================================================================= */}
          <TabsContent value="recon" className="mt-6 space-y-6">
            <ReconciliationView onInspectEntity={handleInspectEntity} />
          </TabsContent>

          {/* =========================================================================
              PHASE 4: PER-ORDER UNIT ECONOMICS & PROFITABILITY HEATMAPS
             ========================================================================= */}
          <TabsContent value="unit-economics" className="mt-6 space-y-6">
            <UnitEconomicsView />
          </TabsContent>

          {/* =========================================================================
              PHASE 4: DYNAMIC MEMBERSHIP PLANS & DEFERRED REVENUE
             ========================================================================= */}
          <TabsContent value="memberships" className="mt-6 space-y-6">
            <MembershipFinanceView />
          </TabsContent>

          {/* =========================================================================
              PHASE 6: OPERATING EXPENSES & REAL NET IN-HAND PROFIT (PAT)
             ========================================================================= */}
          <TabsContent value="expenses" className="mt-6 space-y-6">
            <ExpenseTrackerNetProfitView />
          </TabsContent>

          {/* =========================================================================
              PHASE 1: CUSTOMER FINANCE 360 (ALL-IN-ONE CUSTOMER PROFILE)
             ========================================================================= */}
          <TabsContent value="customer-360" className="mt-6 space-y-6">
            <CustomerFinance360View onInspectOrder={(id) => handleInspectEntity("order", id)} />
          </TabsContent>

          {/* =========================================================================
              PHASE 2: GAAP STATEMENTS (P&L, BALANCE SHEET, CASH FLOW, AGING)
             ========================================================================= */}
          <TabsContent value="accounting-statements" className="mt-6 space-y-6">
            <AccountingStatementsView />
          </TabsContent>

          {/* =========================================================================
              PHASE 2: MULTI-DIMENSIONAL PROFITABILITY ANALYTICS (CITY, SERVICE, RIDER)
             ========================================================================= */}
          <TabsContent value="profitability" className="mt-6 space-y-6">
            <ProfitabilityAnalyticsView />
          </TabsContent>

          {/* =========================================================================
              PHASE 2 & 4: GST & STATUTORY TAX COMPLIANCE CENTER
             ========================================================================= */}
          <TabsContent value="tax-center" className="mt-6 space-y-6">
            <TaxComplianceCenterView />
          </TabsContent>

          {/* =========================================================================
              PHASE 4: CORPORATE TREASURY, MULTI-BANK POSITIONING & LIQUIDITY
             ========================================================================= */}
          <TabsContent value="treasury" className="mt-6 space-y-6">
            <TreasuryCenterView />
          </TabsContent>

          {/* =========================================================================
              PHASE 1 & 3: MAKER-CHECKER APPROVALS & FINANCIAL PERIOD CLOSING
             ========================================================================= */}
          <TabsContent value="approvals" className="mt-6 space-y-6">
            <ApprovalCenterView />
          </TabsContent>

          {/* =========================================================================
              PHASE 3: AI FINANCE ASSISTANT & COMMERCIAL SCENARIO SIMULATOR
             ========================================================================= */}
          <TabsContent value="ai-assistant" className="mt-6 space-y-6">
            <AiFinanceAssistantView />
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

        {/* QuickView Sliding Drawer for 2-Click Financial Drilldown */}
        <QuickViewDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          entityType={drawerEntity?.type || ""}
          entityId={drawerEntity?.id || ""}
        />
      </div>
    </AdminShell>
  );
}
