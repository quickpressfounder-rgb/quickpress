import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
  Navigation,
  Package,
  PackageCheck,
  CloudRain,
  Moon,
  Timer,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchFareEngineConfig,
  updateFareEngineConfig,
  simulateFareCalculation,
  resetFareEngineConfig,
  type DistanceRateConfig,
  type FareBreakdownResult,
} from "@/api/fare-engine";

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
import { FinanceOverviewCommandCenter } from "../components/finance/FinanceOverviewCommandCenter";
import { PayoutsCommandCenter } from "../components/finance/PayoutsCommandCenter";
import { AnomalyAlertBanner } from "../components/finance/AnomalyAlertBanner";
import { QuickViewDrawer } from "../components/finance/QuickViewDrawer";
import { DoubleEntryLedgerView } from "../components/finance/DoubleEntryLedgerView";
import { CodManagementView } from "../components/finance/CodManagementView";
import { ReconciliationView } from "../components/finance/ReconciliationView";
import { UnitEconomicsView } from "../components/finance/UnitEconomicsView";
import { MembershipFinanceView } from "../components/finance/MembershipFinanceView";
import { ExpenseTrackerNetProfitView } from "../components/finance/ExpenseTrackerNetProfitView";
import { CustomerFinance360View } from "../components/finance/CustomerFinance360View";
import { TaxComplianceCenterView } from "../components/finance/TaxComplianceCenterView";
import { TreasuryCenterView } from "../components/finance/TreasuryCenterView";
import { SettlementEngineControlHub } from "../components/finance/SettlementEngineControlHub";
import { QueueTelemetryPill } from "../components/finance/QueueTelemetryPill";
import { OfficialReportsView } from "../components/finance/OfficialReportsView";
import { UnifiedStakeholderRulesEngine } from "../components/finance/UnifiedStakeholderRulesEngine";
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
    handlingFeeEnabled: true,
    convenienceFee: "0",
    convenienceFeeType: "fixed",
    packagingFee: "0",
    packagingFeeType: "fixed",
    packagingFeeEnabled: false,
    serviceCharge: "0",
    serviceChargeType: "fixed",
  },
  surge: {
    enabled: false,
    rainSurgeFee: "20",
    peakSurgeFee: "15",
    surgeFee: "20",
    etaDelayMinutes: 15,
    surgeReason: "Monsoon / High Demand Surge",
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
    quickpressGstin: "",
    defaultState: "Uttar Pradesh",
    categoryTaxOverrides: [
      { id: "tax-dryclean", category: "Dry Cleaning", gstRatePercent: "12", active: true },
    ],
  },
  commission: {
    partnerCommissionType: "percentage",
    partnerPayoutPercent: "85",
    platformCommissionPercent: "15",
    standardPercent: "15",
    fixedAmountPerOrder: "0",
    captainCommissionRate: 0.0,
    categoryOverrides: [],
    cityAreaOverrides: [],
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
    freeDeliveryThreshold: "149",
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
    perKmRate: "8.0",
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
      { level: 1, title: "Rookie Kickoff", target: "1", reward: "25", badge: "Tier 1", flavor: "Starter Tier" },
      { level: 2, title: "Street Cruiser", target: "3", reward: "60", badge: "Tier 2", flavor: "Bronze Tier" },
      { level: 3, title: "Speedster Star", target: "5", reward: "120", badge: "Tier 3", flavor: "Silver Tier" },
      { level: 4, title: "Rush Hour Hero", target: "7", reward: "180", badge: "Tier 4", flavor: "Gold Tier" },
      { level: 5, title: "Super Captain", target: "10", reward: "280", badge: "Tier 5", flavor: "Platinum Tier" },
      { level: 6, title: "Thunder Rider", target: "12", reward: "360", badge: "Tier 6", flavor: "Diamond Tier" },
      { level: 7, title: "Fleet Master", target: "15", reward: "480", badge: "Tier 7", flavor: "Master Tier" },
      { level: 8, title: "Grand Champion", target: "18", reward: "620", badge: "Tier 8", flavor: "Champion Tier" },
      { level: 9, title: "Legendary Streak", target: "22", reward: "820", badge: "Tier 9", flavor: "Legend Tier" },
      { level: 10, title: "Platform Elite", target: "25", reward: "1100", badge: "Tier 10", flavor: "Apex Tier" },
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
    servicePricing: (data.servicePricing || DEFAULT_FINANCIAL_RULES.servicePricing || []).map((s: any) => ({
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
      handlingFeeEnabled: Boolean(data.fees?.handlingFeeEnabled !== false),
      convenienceFee: String(data.fees?.convenienceFee ?? 0),
      convenienceFeeType: String(data.fees?.convenienceFeeType ?? "fixed"),
      packagingFee: String(data.fees?.packagingFee ?? 0),
      packagingFeeType: String(data.fees?.packagingFeeType ?? "fixed"),
      packagingFeeEnabled: Boolean(data.fees?.packagingFeeEnabled),
      serviceCharge: String(data.fees?.serviceCharge ?? 0),
      serviceChargeType: String(data.fees?.serviceChargeType ?? "fixed"),
    },
    surge: {
      enabled: Boolean(data.surge?.enabled),
      rainSurgeFee: String(data.surge?.rainSurgeFee ?? data.delivery?.rainSurge ?? 20),
      peakSurgeFee: String(data.surge?.peakSurgeFee ?? 15),
      surgeFee: String(data.surge?.surgeFee ?? data.surge?.rainSurgeFee ?? 20),
      etaDelayMinutes: Number(data.surge?.etaDelayMinutes ?? 15),
      surgeReason: String(data.surge?.surgeReason ?? "High Demand / Weather Surge"),
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
      quickpressGstin: String(data.gst?.quickpressGstin ?? ""),
      defaultState: String(data.gst?.defaultState ?? "Uttar Pradesh"),
      categoryTaxOverrides: (data.gst?.categoryTaxOverrides || DEFAULT_FINANCIAL_RULES.gst?.categoryTaxOverrides || []).map((t: any) => ({
        id: String(t.id ?? ""),
        category: String(t.category ?? ""),
        gstRatePercent: String(Math.round((t.gstRate ?? 0.12) * 10000) / 100),
        active: Boolean(t.active !== false),
      })),
    },
    commission: {
      partnerCommissionType: String(data.commission?.partnerCommissionType ?? "tier"),
      partnerPayoutPercent: String(data.commission?.partnerPayoutPercent ?? (data.commission?.platformCommissionPercent ? 100 - Number(data.commission.platformCommissionPercent) : (data.commission?.standardRate ? Math.round((1 - data.commission.standardRate) * 100) : 85))),
      platformCommissionPercent: String(data.commission?.platformCommissionPercent ?? (data.commission?.platformCommissionRate ? Math.round(data.commission.platformCommissionRate * 100) : 15)),
      standardPercent: String(Math.round((data.commission?.standardRate ?? 0.18) * 10000) / 100),
      silverPercent: String(Math.round((data.commission?.silverRate ?? 0.15) * 10000) / 100),
      goldPercent: String(Math.round((data.commission?.goldRate ?? 0.12) * 10000) / 100),
      silverThreshold: String(data.commission?.silverThreshold ?? 100),
      goldThreshold: String(data.commission?.goldThreshold ?? 300),
      fixedAmountPerOrder: String(data.commission?.fixedAmountPerOrder ?? 0),
      captainCommissionRate: data.commission?.captainCommissionRate ?? 0.0,
      categoryOverrides: (data.commission?.categoryOverrides || DEFAULT_FINANCIAL_RULES.commission?.categoryOverrides || []).map((c: any) => ({
        id: String(c.id ?? ""),
        category: String(c.category ?? ""),
        ratePercent: String(Math.round((c.rate ?? 0.18) * 10000) / 100),
        active: Boolean(c.active !== false),
      })),
      cityAreaOverrides: (data.commission?.cityAreaOverrides || DEFAULT_FINANCIAL_RULES.commission?.cityAreaOverrides || []).map((c: any) => ({
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
      slabs: (data.delivery?.slabs || DEFAULT_FINANCIAL_RULES.delivery?.slabs || []).map((s: any) => ({
        minKm: s.minKm,
        maxKm: s.maxKm,
        fee: String(s.fee ?? 30),
      })),
      freeDeliveryThreshold: String(data.delivery?.freeDeliveryThreshold ?? 149),
      subsidyFundingSource: data.delivery?.subsidyFundingSource ?? "QUICKPRESS_FUNDED",
      nightSurge: String(data.delivery?.nightSurge ?? 25),
      rainSurge: String(data.delivery?.rainSurge ?? 20),
      cityAreaPricing: (data.delivery?.cityAreaPricing || DEFAULT_FINANCIAL_RULES.delivery?.cityAreaPricing || []).map((c: any) => ({
        id: String(c.id ?? ""),
        city: String(c.city ?? ""),
        area: String(c.area ?? ""),
        baseFee: String(c.baseFee ?? 30),
        perKmRate: String(c.perKmRate ?? 8.0),
        minFee: String(c.minFee ?? 25),
        freeDeliveryThreshold: c.freeDeliveryThreshold !== undefined ? String(c.freeDeliveryThreshold) : undefined,
        expressDeliveryFee: c.expressDeliveryFee !== undefined ? String(c.expressDeliveryFee) : undefined,
        rainSurge: c.rainSurge !== undefined ? String(c.rainSurge) : undefined,
        nightSurge: c.nightSurge !== undefined ? String(c.nightSurge) : undefined,
        partnerCommissionPercent: c.partnerCommissionPercent !== undefined ? String(c.partnerCommissionPercent) : undefined,
        riderBasePay: c.riderBasePay !== undefined ? String(c.riderBasePay) : undefined,
        riderPerKmRate: c.riderPerKmRate !== undefined ? String(c.riderPerKmRate) : undefined,
        minimumFloor: c.minimumFloor !== undefined ? String(c.minimumFloor) : undefined,
        active: Boolean(c.active !== false),
      })),
    },
    discount: {
      minOrderValue: String(data.discount?.minOrderValue ?? 99),
      firstOrderDiscountPercent: String(data.discount?.firstOrderDiscountPercent ?? 20),
      firstOrderMaxDiscount: String(data.discount?.firstOrderMaxDiscount ?? 100),
      coupons: (data.discount?.coupons || DEFAULT_FINANCIAL_RULES.discount?.coupons || []).map((c: any) => ({
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
      Object.entries(data.cancellation || DEFAULT_FINANCIAL_RULES.cancellation || {}).map(([stage, val]: [string, any]) => [
        stage,
        {
          cancellationFee: String(val?.cancellationFee ?? 0),
          refundPct: String(val?.refundPct ?? 100),
          allowCancel: Boolean(val?.allowCancel),
          notes: String(val?.notes ?? ""),
        },
      ])
    ),
    riderPayout: {
      basePay: String(data.riderPayout?.basePay ?? 25),
      baseDistanceKm: String(data.riderPayout?.baseDistanceKm ?? 2.0),
      perKmRate: String(data.riderPayout?.perKmRate ?? 8.0),
      pickupEarning: String(data.riderPayout?.pickupEarning ?? 10),
      deliveryEarning: String(data.riderPayout?.deliveryEarning ?? 15),
      peakIncentive: String(data.riderPayout?.peakIncentive ?? 15),
      expressBonus: String(data.riderPayout?.expressBonus ?? 20),
      nightSurge: String(data.riderPayout?.nightSurge ?? 25),
      rainSurge: String(data.riderPayout?.rainSurge ?? 20),
      captainCommissionRate: data.riderPayout?.captainCommissionRate ?? 0.0,
      dailyTargets: (data.riderPayout?.dailyTargets || DEFAULT_FINANCIAL_RULES.riderPayout?.dailyTargets || []).map((t: any) => ({
        targetTrips: String(t.targetTrips ?? 10),
        bonus: String(t.bonus ?? 300),
      })),
      bonusRules: String(data.riderPayout?.bonusRules ?? DEFAULT_FINANCIAL_RULES.riderPayout?.bonusRules ?? ""),
    },
    incentives: {
      candyCrushLevels: (data.incentives?.candyCrushLevels && data.incentives.candyCrushLevels.length > 0
        ? data.incentives.candyCrushLevels
        : DEFAULT_FINANCIAL_RULES.incentives?.candyCrushLevels || []
      ).map((l: any, idx: number) => ({
        level: Number(l.level ?? idx + 1),
        title: String(l.title ?? `Level ${idx + 1}`),
        target: String(l.target ?? (idx + 1) * 2),
        reward: String(l.reward ?? (idx + 1) * 30),
        badge: String(l.badge ?? "Tier"),
        flavor: String(l.flavor ?? ""),
        description: String(l.description ?? ""),
      })),
      riderDaily: (data.incentives?.riderDaily || DEFAULT_FINANCIAL_RULES.incentives?.riderDaily || []).map((t: any) => ({
        trips: String(t.trips ?? 5),
        reward: String(t.reward ?? 100),
      })),
      riderWeeklyStreak: {
        trips: String(data.incentives?.riderWeeklyStreak?.trips ?? 50),
        reward: String(data.incentives?.riderWeeklyStreak?.reward ?? 800),
      },
      partnerVolume: (data.incentives?.partnerVolume || DEFAULT_FINANCIAL_RULES.incentives?.partnerVolume || []).map((t: any) => ({
        orders: String(t.orders ?? 20),
        reward: String(t.reward ?? 300),
      })),
    },
    lateFee: {
      gracePeriodMinutes: String(data.lateFee?.gracePeriodMinutes ?? 15),
      slabs: (data.lateFee?.slabs || DEFAULT_FINANCIAL_RULES.lateFee?.slabs || []).map((s: any) => ({
        minDelayMin: s.minDelayMin,
        maxDelayMin: s.maxDelayMin,
        fee: String(s.fee ?? 20),
      })),
      classification: data.lateFee?.classification ?? "CUSTOMER_COMPENSATION",
    },
    penalties: Object.fromEntries(
      Object.entries(data.penalties || DEFAULT_FINANCIAL_RULES.penalties || {}).map(([type, amount]) => [
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
      handlingFeeEnabled: Boolean(raw?.fees?.handlingFeeEnabled !== false),
      convenienceFee: Number(raw?.fees?.convenienceFee) || 0,
      convenienceFeeType: String(raw?.fees?.convenienceFeeType || "fixed"),
      packagingFee: Number(raw?.fees?.packagingFee) || 0,
      packagingFeeType: String(raw?.fees?.packagingFeeType || "fixed"),
      packagingFeeEnabled: Boolean(raw?.fees?.packagingFeeEnabled),
      serviceCharge: Number(raw?.fees?.serviceCharge) || 0,
      serviceChargeType: String(raw?.fees?.serviceChargeType || "fixed"),
    },
    surge: {
      enabled: Boolean(raw?.surge?.enabled),
      rainSurgeFee: Number(raw?.surge?.rainSurgeFee ?? raw?.surge?.surgeFee) || 0,
      peakSurgeFee: Number(raw?.surge?.peakSurgeFee) || 0,
      surgeFee: Number(raw?.surge?.surgeFee ?? raw?.surge?.rainSurgeFee) || 0,
      etaDelayMinutes: Number(raw?.surge?.etaDelayMinutes) || 15,
      surgeReason: String(raw?.surge?.surgeReason || "High Demand / Weather Surge"),
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
      partnerPayoutPercent: Number(raw?.commission?.partnerPayoutPercent) || 85,
      platformCommissionPercent: Number(raw?.commission?.platformCommissionPercent) || (100 - (Number(raw?.commission?.partnerPayoutPercent) || 85)),
      standardRate: raw?.commission?.partnerPayoutPercent ? (100 - Number(raw?.commission?.partnerPayoutPercent)) / 100 : ((parseFloat(raw?.commission?.standardPercent) || 18) / 100),
      silverRate: (parseFloat(raw?.commission?.silverPercent) || 0) / 100,
      goldRate: (parseFloat(raw?.commission?.goldPercent) || 0) / 100,
      silverThreshold: Number(raw?.commission?.silverThreshold) || 100,
      goldThreshold: Number(raw?.commission?.goldThreshold) || 300,
      fixedAmountPerOrder: Number(raw?.commission?.fixedAmountPerOrder) || 0,
      captainCommissionRate: 0.0,
      platformCommissionRate: (parseFloat(raw?.commission?.platformCommissionPercent) || 15) / 100,
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
      freeDeliveryThreshold: Number(raw?.delivery?.freeDeliveryThreshold) || 149,
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
        freeDeliveryThreshold: c.freeDeliveryThreshold !== undefined && c.freeDeliveryThreshold !== "" ? Number(c.freeDeliveryThreshold) : undefined,
        expressDeliveryFee: c.expressDeliveryFee !== undefined && c.expressDeliveryFee !== "" ? Number(c.expressDeliveryFee) : undefined,
        rainSurge: c.rainSurge !== undefined && c.rainSurge !== "" ? Number(c.rainSurge) : undefined,
        nightSurge: c.nightSurge !== undefined && c.nightSurge !== "" ? Number(c.nightSurge) : undefined,
        partnerCommissionPercent: c.partnerCommissionPercent !== undefined && c.partnerCommissionPercent !== "" ? Number(c.partnerCommissionPercent) : undefined,
        riderBasePay: c.riderBasePay !== undefined && c.riderBasePay !== "" ? Number(c.riderBasePay) : undefined,
        riderPerKmRate: c.riderPerKmRate !== undefined && c.riderPerKmRate !== "" ? Number(c.riderPerKmRate) : undefined,
        minimumFloor: c.minimumFloor !== undefined && c.minimumFloor !== "" ? Number(c.minimumFloor) : undefined,
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
      perKmRate: Number(raw?.riderPayout?.perKmRate) || 8.0,
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
        badge: String(l.badge || "Tier"),
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

type FinanceSearchParams = {
  tab?: string;
};

export const Route = createFileRoute("/finance-engine")({
  beforeLoad: requireAdminSession,
  validateSearch: (search: Record<string, unknown>): FinanceSearchParams => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  head: () =>
    adminHead(
      "QuickPress Finance Engine — Unified Pricing, GST, Commission & Settlement",
      "Centralized financial governance across Customer, Laundry Partner, and Delivery Captain frontends."
    ),
  component: FinanceEnginePage,
});

export function FinanceEnginePage() {
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const resolveFinanceTab = (raw?: string) => {
    if (!raw) return "overview";
    if (raw === "reports" || raw === "statements" || raw === "financial-reports" || raw === "accounting") return "reports";
    if (raw === "payouts") return "settlements";
    if (raw === "tax") return "tax-center";
    if (raw === "membership") return "memberships";
    if (raw === "finance-rules") return "rules";
    return raw;
  };

  const [activeTab, setActiveTab] = useState<string>(resolveFinanceTab(search?.tab));

  useEffect(() => {
    if (search?.tab) {
      const target = resolveFinanceTab(search.tab);
      if (target !== activeTab) {
        setActiveTab(target);
      }
    }
  }, [search?.tab]);

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab);
    navigate({
      to: "/finance-engine",
      search: { tab: nextTab },
      replace: true,
    });
  };

  const allFinanceModules = useMemo(
    () => [
      { id: "overview", label: "Overview & Analytics", icon: Activity, color: "text-zinc-900" },
      { id: "reports", label: "Official Reports", icon: FileText, color: "text-emerald-700" },
      { id: "settlements", label: "Payouts Command Center", icon: Landmark, color: "text-emerald-700" },
      { id: "rules", label: "Rules & Fare Engine", icon: Sliders, color: "text-blue-700" },
      { id: "cod", label: "COD & Fleet Vault", icon: Wallet, color: "text-amber-700" },
      { id: "tax-center", label: "Tax Center (GST/TDS)", icon: Receipt, color: "text-purple-700" },
      { id: "general-ledger", label: "Double-Entry Ledger", icon: Scale, color: "text-indigo-700" },
      { id: "recon", label: "3-Way Recon", icon: RotateCcw, color: "text-sky-700" },
      { id: "unit-economics", label: "Unit Economics", icon: TrendingUp, color: "text-teal-700" },
      { id: "expenses", label: "Operating Expenses", icon: IndianRupee, color: "text-rose-700" },
      { id: "treasury", label: "Treasury & Escrow", icon: Building2, color: "text-blue-700" },
      { id: "memberships", label: "Membership Plans", icon: Award, color: "text-amber-700" },
      { id: "loyalty", label: "Loyalty & Rewards", icon: Gift, color: "text-pink-700" },
      { id: "customer-360", label: "Customer 360", icon: User, color: "text-zinc-700" },
      { id: "audit", label: "Audit Logs", icon: History, color: "text-zinc-700" },
      { id: "ledger", label: "Order Inspector", icon: Search, color: "text-zinc-700" },
    ],
    []
  );

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
    | "distance-fare"
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
      toast.success("Loyalty campaign rules & budget successfully updated! ");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update loyalty campaign configuration");
    },
  });

  // Master Distance Rate & Dynamic Fare Engine State
  const fareEngineQuery = useQuery({
    queryKey: ["finance", "fareEngineConfig"],
    queryFn: fetchFareEngineConfig,
  });

  const [fareEngineForm, setFareEngineForm] = useState<Partial<DistanceRateConfig>>({
    baseFare: 35,
    baseDistanceKm: 2.0,
    extraKmRate: 8.0,
    minimumFare: 30,
    maximumFareCap: 600,
    surgeEnabled: true,
    surgeMultiplier: 1.0,
    rainSurgeFee: 20,
    peakHourSurgeFee: 15,
    lateNightEnabled: true,
    lateNightFee: 25,
    lateNightStartTime: "22:00",
    lateNightEndTime: "06:00",
    waitingEnabled: true,
    freeWaitingMinutes: 5,
    waitingFeePerMinute: 2.0,
    expressBonus: 25.0,
    vehicleTypeMultipliers: {
      bike: 1.0,
      electric_bike: 1.0,
      bicycle: 0.85,
      auto: 1.25,
      cargo: 1.5,
    },
  });

  useEffect(() => {
    if (fareEngineQuery.data) {
      setFareEngineForm(fareEngineQuery.data);
    }
  }, [fareEngineQuery.data]);

  const updateFareEngineMutation = useMutation({
    mutationFn: updateFareEngineConfig,
    onSuccess: (data) => {
      toast.success("Master Distance Rate & Dynamic Fare Engine updated successfully!");
      setFareEngineForm(data);
      queryClient.setQueryData(["finance", "fareEngineConfig"], data);
    },
    onError: (err: any) => {
      toast.error(`Failed to update fare engine: ${err.message || err}`);
    },
  });

  const resetFareEngineMutation = useMutation({
    mutationFn: resetFareEngineConfig,
    onSuccess: (data) => {
      toast.info("Factory default fare rates restored.");
      setFareEngineForm(data);
      queryClient.setQueryData(["finance", "fareEngineConfig"], data);
    },
  });

  // Interactive Live Trip Fare Simulator State
  const [simDistance, setSimDistance] = useState<number>(3.5);
  const [simIsNight, setSimIsNight] = useState<boolean>(false);
  const [simIsRain, setSimIsRain] = useState<boolean>(false);
  const [simIsExpress, setSimIsExpress] = useState<boolean>(false);
  const [simWaitingMinutes, setSimWaitingMinutes] = useState<number>(0);
  const [simVehicle, setSimVehicle] = useState<string>("bike");
  const [simResult, setSimResult] = useState<FareBreakdownResult | null>(null);

  const simulateFareMutation = useMutation({
    mutationFn: simulateFareCalculation,
    onSuccess: (data) => {
      setSimResult(data);
    },
  });

  // Trigger live simulation when inputs change
  useEffect(() => {
    simulateFareMutation.mutate({
      distanceKm: simDistance,
      timeOfDay: simIsNight ? "23:30" : "14:00",
      isRain: simIsRain,
      isExpress: simIsExpress,
      waitingMinutes: simWaitingMinutes,
      vehicleType: simVehicle,
    });
  }, [simDistance, simIsNight, simIsRain, simIsExpress, simWaitingMinutes, simVehicle, fareEngineForm]);

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

    // Keep distance fare simulator in sync with master rider rate inputs
    if (path === "riderPayout.basePay") {
      const num = parseFloat(val);
      if (!isNaN(num)) setFareEngineForm((f) => ({ ...f, baseFare: num }));
    } else if (path === "riderPayout.perKmRate") {
      const num = parseFloat(val);
      if (!isNaN(num)) setFareEngineForm((f) => ({ ...f, extraKmRate: num }));
    }
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
      toast.success("Financial rules updated & live across full project!");
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
      toast.success(`Settlement Batch ${batch.cycleId} generated!`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to generate settlement batch");
    },
  });

  const approveBatchMutation = useMutation({
    mutationFn: async (batchId: string) => await approveSettlementBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "settlements"] });
      toast.success("Settlement batch approved for disbursement!");
    },
  });

  const payoutBatchMutation = useMutation({
    mutationFn: async ({ batchId, payoutRef }: { batchId: string; payoutRef: string }) =>
      await payoutSettlementBatch(batchId, payoutRef),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "settlements"] });
      toast.success("Settlement batch marked as PAID! ");
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
            <QueueTelemetryPill />

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
        <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as any)} className="w-full space-y-3">
          {/* Module Tabs Strip */}
          <div className="bg-zinc-100/90 p-1.5 rounded-2xl border border-zinc-200 shadow-2xs overflow-x-auto">
            <TabsList className="flex items-center gap-1 bg-transparent p-0 h-auto w-max min-w-full">
              {allFinanceModules.map((m) => {
                  const Icon = m.icon;
                  const isActive = activeTab === m.id;
                  return (
                    <TabsTrigger
                      key={m.id}
                      value={m.id}
                      className={`font-black text-xs py-2 px-3.5 flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "bg-white text-zinc-950 shadow-xs border border-zinc-200/80"
                          : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                      }`}
                    >
                      <Icon
                        className={`size-3.5 ${
                          isActive ? m.color || "text-zinc-900" : "text-zinc-400"
                        }`}
                      />
                      <span>{m.label}</span>
                    </TabsTrigger>
                  );
                })}
            </TabsList>
          </div>

          {/* =========================================================================
              TAB 1: FINANCIAL OVERVIEW & COMMAND CENTER
             ========================================================================= */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <FinanceOverviewCommandCenter onNavigateTab={handleTabChange} />
          </TabsContent>

          {/* =========================================================================
              TAB: OFFICIAL STATUTORY FINANCIAL REPORTS
             ========================================================================= */}
          <TabsContent value="reports" className="mt-6 space-y-6">
            <OfficialReportsView />
          </TabsContent>

          {/* =========================================================================
              TAB: UNIFIED STAKEHOLDER RULES ENGINE (CUSTOMER | PARTNER | RIDER)
             ========================================================================= */}
          <TabsContent value="rules" className="mt-6 space-y-6">
            <UnifiedStakeholderRulesEngine
              editableRules={editableRules}
              updateField={updateField}
              isDirty={isDirty}
              onSave={() => setIsSaveModalOpen(true)}
              isSaving={saveRulesMutation.isPending}
              auditLogs={auditLogsQuery.data || []}
            />
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
                          {(inspectedOrder.ledger || []).map((tx) => (
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
            <PayoutsCommandCenter />
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
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white/95 text-zinc-900 px-4 py-3 rounded-2xl shadow-xl border border-zinc-200 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-xs font-bold text-zinc-800">You have unsaved financial changes</span>
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
