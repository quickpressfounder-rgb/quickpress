import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  Percent,
  Sliders,
  DollarSign,
  TrendingUp,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Bike,
  ShieldCheck,
  RefreshCw,
  Plus,
  ArrowRight,
  FileText,
  AlertTriangle,
  Receipt,
  Gift,
  Zap,
  Edit2,
  Trash2,
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
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchFinancialRules,
  updateFinancialRules,
  fetchPartnerCommissionsList,
  updatePartnerCustomCommission,
  removePartnerCustomCommission,
  fetchSettlementBatches,
  generateSettlementBatch,
  approveSettlementBatch,
  payoutSettlementBatch,
  fetchSettlementBatchStatement,
  type FinancialRules,
  type PartnerCommissionSummary,
  type SettlementBatch,
  type SettlementBatchStatement,
} from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Switch } from "@/shared/ui/switch";

export function SettlementEngineControlHub() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<string>("partners");

  // Partner filter state
  const [partnerSearch, setPartnerSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");

  // Partner commission edit modal
  const [selectedPartner, setSelectedPartner] = useState<PartnerCommissionSummary | null>(null);
  const [editRatePct, setEditRatePct] = useState<number>(18);
  const [editReason, setEditReason] = useState<string>("");
  const [isEditPartnerOpen, setIsEditPartnerOpen] = useState(false);

  // Settlement batch generation modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genStartDate, setGenStartDate] = useState("");
  const [genEndDate, setGenEndDate] = useState("");
  const [genCycleType, setGenCycleType] = useState("WEEKLY");
  const [genPartnerId, setGenPartnerId] = useState("");

  // Disbursal modal
  const [selectedBatchForPayout, setSelectedBatchForPayout] = useState<SettlementBatch | null>(null);
  const [payoutUtrRef, setPayoutUtrRef] = useState("");
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // Statement drawer modal
  const [selectedBatchIdForStatement, setSelectedBatchIdForStatement] = useState<string | null>(null);

  // Queries
  const rulesQuery = useQuery({
    queryKey: ["financial-rules"],
    queryFn: fetchFinancialRules,
    staleTime: 30000,
  });

  const partnersQuery = useQuery({
    queryKey: ["partner-commissions"],
    queryFn: fetchPartnerCommissionsList,
    staleTime: 20000,
  });

  const batchesQuery = useQuery({
    queryKey: ["settlement-batches"],
    queryFn: fetchSettlementBatches,
    staleTime: 15000,
  });

  const statementQuery = useQuery({
    queryKey: ["settlement-batch-statement", selectedBatchIdForStatement],
    queryFn: () => (selectedBatchIdForStatement ? fetchSettlementBatchStatement(selectedBatchIdForStatement) : null),
    enabled: !!selectedBatchIdForStatement,
  });

  // Local state for Rider Commission & Incentive editing
  const [riderCommissionRate, setRiderCommissionRate] = useState<number>(0);
  const [riderFixedFee, setRiderFixedFee] = useState<number>(0);
  const [riderBaseFee, setRiderBaseFee] = useState<number>(35);
  const [riderPerKmRate, setRiderPerKmRate] = useState<number>(12);
  const [peakRushSurge, setPeakRushSurge] = useState<number>(20);
  const [rainSurge, setRainSurge] = useState<number>(25);
  const [nightSurge, setNightSurge] = useState<number>(30);
  const [expressBonus, setExpressBonus] = useState<number>(30);
  const [candyLevels, setCandyLevels] = useState<Array<{ level: number; title: string; target: number; reward: number }>>([
    { level: 1, title: "Bronze Starter", target: 15, reward: 150 },
    { level: 2, title: "Silver Runner", target: 30, reward: 350 },
    { level: 3, title: "Gold Pro", target: 50, reward: 700 },
    { level: 4, title: "Platinum Master", target: 75, reward: 1200 },
    { level: 5, title: "Diamond Legend", target: 100, reward: 2000 },
  ]);

  // Synchronize rules when fetched
  React.useEffect(() => {
    if (rulesQuery.data) {
      const r = rulesQuery.data;
      if (r.commission) {
        setRiderCommissionRate(r.commission.riderCommissionRate ?? 0);
        setRiderFixedFee(r.commission.riderFixedFeePerTrip ?? 0);
      }
      if (r.delivery) {
        setRiderBaseFee(r.delivery.baseFee ?? 35);
        setRiderPerKmRate(r.delivery.perKmRate ?? 12);
        setRainSurge(r.delivery.rainSurge ?? 25);
        setNightSurge(r.delivery.nightSurge ?? 30);
        setPeakRushSurge(r.delivery.rushHourSurge ?? 20);
      }
      if (r.incentives) {
        setExpressBonus(r.incentives.expressBonus ?? 30);
        if (r.incentives.candyCrushLevels && r.incentives.candyCrushLevels.length > 0) {
          setCandyLevels(
            r.incentives.candyCrushLevels.map((l: any, i: number) => ({
              level: l.level ?? i + 1,
              title: l.title ?? `Level ${i + 1}`,
              target: l.target ?? 15 * (i + 1),
              reward: l.reward ?? 150 * (i + 1),
            }))
          );
        }
      }
    }
  }, [rulesQuery.data]);

  // Mutations
  const updatePartnerRateMutation = useMutation({
    mutationFn: async ({ partnerId, ratePct, reason }: { partnerId: string; ratePct: number; reason: string }) => {
      return await updatePartnerCustomCommission(partnerId, ratePct, reason);
    },
    onSuccess: () => {
      toast.success("Partner custom commission updated successfully");
      setIsEditPartnerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["partner-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-rules"] });
    },
    onError: (err: any) => {
      toast.error(`Failed to update partner commission: ${err?.message || "Unknown error"}`);
    },
  });

  const removePartnerRateMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      return await removePartnerCustomCommission(partnerId);
    },
    onSuccess: () => {
      toast.success("Partner custom override removed. Reset to tier rate.");
      setIsEditPartnerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["partner-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-rules"] });
    },
    onError: (err: any) => {
      toast.error(`Failed to remove override: ${err?.message || "Unknown error"}`);
    },
  });

  const saveRiderAndIncentiveRulesMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!rulesQuery.data) return;
      const current = rulesQuery.data;
      const updatedRules: Partial<FinancialRules> = {
        commission: {
          ...current.commission,
          riderCommissionRate: Number(riderCommissionRate),
          riderFixedFeePerTrip: Number(riderFixedFee),
        },
        delivery: {
          ...current.delivery,
          baseFee: Number(riderBaseFee),
          perKmRate: Number(riderPerKmRate),
          rainSurge: Number(rainSurge),
          nightSurge: Number(nightSurge),
          rushHourSurge: Number(peakRushSurge),
        },
        incentives: {
          ...current.incentives,
          expressBonus: Number(expressBonus),
          rainBonus: Number(rainSurge),
          peakBonus: Number(peakRushSurge),
          candyCrushLevels: candyLevels,
        },
      };
      return await updateFinancialRules(updatedRules, reason);
    },
    onSuccess: () => {
      toast.success("Rider commission & incentive rules saved and audited");
      queryClient.invalidateQueries({ queryKey: ["financial-rules"] });
    },
    onError: (err: any) => {
      toast.error(`Failed to save rules: ${err?.message || "Unknown error"}`);
    },
  });

  const generateBatchMutation = useMutation({
    mutationFn: async (params: { startDate?: string; endDate?: string; partnerId?: string; cycleType?: string }) => {
      return await generateSettlementBatch(params);
    },
    onSuccess: (batch) => {
      toast.success(`Settlement Batch ${batch.cycleId} generated successfully!`);
      setIsGenerateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["settlement-batches"] });
    },
    onError: (err: any) => {
      toast.error(`Failed to generate batch: ${err?.message || "Calculation error"}`);
    },
  });

  const approveBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return await approveSettlementBatch(batchId);
    },
    onSuccess: () => {
      toast.success("Batch approved successfully (Maker-Checker Verified)");
      queryClient.invalidateQueries({ queryKey: ["settlement-batches"] });
    },
    onError: (err: any) => {
      toast.error(`Failed to approve batch: ${err?.message || "Unknown error"}`);
    },
  });

  const payoutBatchMutation = useMutation({
    mutationFn: async ({ batchId, payoutRef }: { batchId: string; payoutRef: string }) => {
      return await payoutSettlementBatch(batchId, payoutRef);
    },
    onSuccess: (data) => {
      toast.success(`Batch disbursed! GL Journal entries posted: ${data.postedJournalEntries ?? 2}`);
      setIsPayoutModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["settlement-batches"] });
    },
    onError: (err: any) => {
      toast.error(`Disbursal failed: ${err?.message || "Payout error"}`);
    },
  });

  // Filtered partners list
  const filteredPartners = useMemo(() => {
    let list = partnersQuery.data || [];
    if (tierFilter !== "ALL") {
      if (tierFilter === "CUSTOM") {
        list = list.filter((p) => p.customCommissionPct !== null);
      } else {
        list = list.filter((p) => p.currentTier === tierFilter);
      }
    }
    if (partnerSearch.trim()) {
      const q = partnerSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.businessName?.toLowerCase().includes(q) ||
          p.ownerName?.toLowerCase().includes(q) ||
          p.phone?.includes(q) ||
          p.partnerId?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [partnersQuery.data, tierFilter, partnerSearch]);

  const handleOpenEditPartner = (p: PartnerCommissionSummary) => {
    setSelectedPartner(p);
    setEditRatePct(p.effectiveCommissionPct);
    setEditReason(p.overrideReason || "");
    setIsEditPartnerOpen(true);
  };

  const handleOpenPayoutModal = (batch: SettlementBatch) => {
    setSelectedBatchForPayout(batch);
    setPayoutUtrRef(`UTR-HDFC-${Date.now().toString().slice(-8)}`);
    setIsPayoutModalOpen(true);
  };

  const handleRefreshAll = () => {
    rulesQuery.refetch();
    partnersQuery.refetch();
    batchesQuery.refetch();
    toast.info("Refreshed Settlement & Commission Engine data");
  };

  // Batches summary metrics
  const batchMetrics = useMemo(() => {
    const list = batchesQuery.data || [];
    const totalBatches = list.length;
    const paidBatches = list.filter((b) => b.status === "PAID");
    const totalDisbursed = paidBatches.reduce(
      (sum, b) => sum + (b.totalPartnerPayable || 0) + (b.totalRiderPayable || 0),
      0
    );
    const pendingBatches = list.filter((b) => b.status === "GENERATED" || b.status === "APPROVED");
    const totalPending = pendingBatches.reduce(
      (sum, b) => sum + (b.totalPartnerPayable || 0) + (b.totalRiderPayable || 0),
      0
    );
    return { totalBatches, totalDisbursed, totalPending };
  }, [batchesQuery.data]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
              <Landmark className="size-3.5" />
              <span>Unified Automated Settlement & Commission Control Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Settlement & Commission Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time partner tiered & custom overrides, Captain 0% guarantee or platform take-rate, Candy Crush incentive ladder, and Maker-Checker automated General Ledger payouts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={partnersQuery.isLoading || batchesQuery.isLoading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs h-9"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${partnersQuery.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => {
                const now = new Date();
                const past7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
                setGenStartDate(past7.toISOString().slice(0, 10));
                setGenEndDate(now.toISOString().slice(0, 10));
                setIsGenerateModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs h-9 shadow-md shadow-indigo-600/30"
            >
              <Plus className="size-3.5 mr-1.5" />
              Run Settlement Batch
            </Button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div>
            <div className="text-slate-400 font-medium">Registered Partners</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {partnersQuery.data?.length ?? 0} Laundromats
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Rider Commission Guarantee</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {riderCommissionRate === 0 ? "0% Platform Take (100% to Rider)" : `${riderCommissionRate}% Platform Rate`}
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Total Batches Disbursed</div>
            <div className="text-lg font-bold text-sky-400 mt-0.5">
              ₹{batchMetrics.totalDisbursed.toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Pending Payout Pipeline</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              ₹{batchMetrics.totalPending.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-1">
          <TabsTrigger
            value="partners"
            className="rounded-xl text-xs font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs flex items-center justify-center gap-2"
          >
            <Building2 className="size-3.5" />
            <span>Partner Commissions</span>
          </TabsTrigger>

          <TabsTrigger
            value="riders"
            className="rounded-xl text-xs font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs flex items-center justify-center gap-2"
          >
            <Bike className="size-3.5" />
            <span>Rider Pay & Commission</span>
          </TabsTrigger>

          <TabsTrigger
            value="incentives"
            className="rounded-xl text-xs font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs flex items-center justify-center gap-2"
          >
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Bonuses & Surge Ladder</span>
          </TabsTrigger>

          <TabsTrigger
            value="batches"
            className="rounded-xl text-xs font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-xs flex items-center justify-center gap-2"
          >
            <Receipt className="size-3.5" />
            <span>Settlement Batches & GL</span>
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            SUBTAB 1: PARTNER COMMISSION CONTROLS
           ========================================================================= */}
        <TabsContent value="partners" className="space-y-6">
          {/* Tier Rules Summary Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Percent className="size-4 text-indigo-600" />
                  Default Partner Commission Slabs (Automated Volume Ladder)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard tiered take-rate automatically applied based on monthly completed order volume.
                </p>
              </div>
              <Badge variant="outline" className="text-indigo-700 bg-indigo-50 border-indigo-200 font-mono text-[11px] px-2.5 py-1">
                Standard: 18% | Silver: 15% (&gt;50 orders) | Gold: 12% (&gt;150 orders)
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Standard Tier</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[11px] font-bold">18% Rate</span>
                </div>
                <div className="text-slate-500 text-[11px] mt-1">For new partners or volume &lt; 50 orders/month</div>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">Silver Tier</span>
                  <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded text-[11px] font-bold">15% Rate</span>
                </div>
                <div className="text-blue-700/80 text-[11px] mt-1">Threshold: ≥ 50 verified monthly orders</div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900">Gold Partner Tier</span>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-[11px] font-bold">12% Rate</span>
                </div>
                <div className="text-amber-800/80 text-[11px] mt-1">Threshold: ≥ 150 verified monthly orders</div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search partner by name, phone or ID..."
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Filter:</span>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="h-9 text-xs w-44 rounded-xl border-slate-200">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Partners</SelectItem>
                  <SelectItem value="CUSTOM">Custom Overrides Only</SelectItem>
                  <SelectItem value="STANDARD">Standard Tier (18%)</SelectItem>
                  <SelectItem value="SILVER">Silver Tier (15%)</SelectItem>
                  <SelectItem value="GOLD">Gold Tier (12%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Partners Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Laundromat Partner</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Live Orders</th>
                    <th className="p-3.5">Auto Tier</th>
                    <th className="p-3.5">Standard Rate</th>
                    <th className="p-3.5">Custom Override</th>
                    <th className="p-3.5">Effective Rate</th>
                    <th className="p-3.5">Bank Account / UPI</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partnersQuery.isLoading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading partner commission roster...
                      </td>
                    </tr>
                  ) : filteredPartners.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        No partners matched current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPartners.map((partner) => (
                      <tr key={partner.partnerId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{partner.businessName}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">{partner.partnerId}</div>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          <div>{partner.ownerName || "—"}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{partner.phone || "—"}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          {partner.orderCount}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold ${
                              partner.currentTier === "GOLD"
                                ? "bg-amber-100 text-amber-800"
                                : partner.currentTier === "SILVER"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {partner.currentTier}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {partner.standardRatePct}%
                        </td>
                        <td className="p-3.5">
                          {partner.customCommissionPct !== null ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold text-[10px]">
                              {partner.customCommissionPct}% Override
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">None (Auto)</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-indigo-700 text-sm">
                            {partner.effectiveCommissionPct}%
                          </span>
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-600 font-mono">
                          {partner.bankDetails?.accountNumber ? (
                            <div>
                              <span>{partner.bankDetails.bankName || "Bank"}</span>
                              <div className="text-slate-400">A/C: ••••{partner.bankDetails.accountNumber.slice(-4)}</div>
                            </div>
                          ) : partner.bankDetails?.upiId ? (
                            <div className="text-indigo-600">{partner.bankDetails.upiId}</div>
                          ) : (
                            <span className="text-slate-400 italic">Not Added</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenEditPartner(partner)}
                            className="rounded-lg h-7 px-2.5 text-[11px] font-semibold border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                          >
                            <Edit2 className="size-3 mr-1" />
                            Edit Rate
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            SUBTAB 2: RIDER COMMISSION & EARNINGS CONTROLS
           ========================================================================= */}
        <TabsContent value="riders" className="space-y-6">
          {/* Zero Take-rate Guarantee Banner */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold">
                <ShieldCheck className="size-3.5" />
                QuickPress Captain Financial Charter
              </div>
              <h3 className="text-base font-bold">0% Delivery Commission Take-Rate Standard</h3>
              <p className="text-xs text-emerald-100 max-w-xl">
                By default, delivery captains keep 100% of delivery fee + 100% customer tips. You can configure a platform share or fixed fee if contractual platform policies change.
              </p>
            </div>
            <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/20 text-center">
              <div className="text-[10px] text-emerald-100 uppercase tracking-wider font-semibold">Active Deduct Rate</div>
              <div className="text-xl font-black font-mono mt-0.5">{riderCommissionRate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rider Platform Commission Settings */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Percent className="size-4 text-emerald-600" />
                  Rider Platform Commission Take-Rate
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Percentage or fixed fee QuickPress deducts from rider trip earnings.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Platform Commission Rate (%)
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={riderCommissionRate}
                      onChange={(e) => setRiderCommissionRate(parseFloat(e.target.value) || 0)}
                      className="pr-8 h-9 text-xs rounded-xl"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Set to 0% to keep 100% earnings with Captains.
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Fixed Platform Convenience Fee Per Trip (₹)
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={riderFixedFee}
                      onChange={(e) => setRiderFixedFee(parseFloat(e.target.value) || 0)}
                      className="pl-8 h-9 text-xs rounded-xl"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">₹</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Optional fixed deduction per completed trip.
                  </p>
                </div>
              </div>
            </div>

            {/* Rider Base Pay & Distance Formula */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bike className="size-4 text-indigo-600" />
                  Trip Base Fare & Distance Payout
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Core algorithm that calculates rider earnings on each order delivery.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Base Fare Payout (First 2.0 km)
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="1"
                      min="10"
                      value={riderBaseFee}
                      onChange={(e) => setRiderBaseFee(parseFloat(e.target.value) || 0)}
                      className="pl-8 h-9 text-xs rounded-xl"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">₹</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Per-Km Additional Rate (Beyond 2.0 km)
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      step="0.5"
                      min="5"
                      value={riderPerKmRate}
                      onChange={(e) => setRiderPerKmRate(parseFloat(e.target.value) || 0)}
                      className="pl-8 h-9 text-xs rounded-xl"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">₹</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveRiderAndIncentiveRulesMutation.mutate("Admin Rider Commission & Trip Pay update")}
              disabled={saveRiderAndIncentiveRulesMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 rounded-xl shadow-md"
            >
              <Check className="size-3.5 mr-1.5" />
              Save Rider Commission & Pay Policy
            </Button>
          </div>
        </TabsContent>

        {/* =========================================================================
            SUBTAB 3: BONUSES, SURGE & CANDY CRUSH LADDER
           ========================================================================= */}
        <TabsContent value="incentives" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Zap className="size-4" />
                <span className="text-xs font-bold text-slate-900">Peak Rush Surge</span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={peakRushSurge}
                  onChange={(e) => setPeakRushSurge(parseFloat(e.target.value) || 0)}
                  className="pl-7 h-9 text-xs rounded-xl"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">₹</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Added during 8-11 AM & 6-9 PM</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Sparkles className="size-4" />
                <span className="text-xs font-bold text-slate-900">Rain / Weather Surge</span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={rainSurge}
                  onChange={(e) => setRainSurge(parseFloat(e.target.value) || 0)}
                  className="pl-7 h-9 text-xs rounded-xl"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">₹</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Automatic bad weather stipend</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Clock className="size-4" />
                <span className="text-xs font-bold text-slate-900">Late Night Surge</span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={nightSurge}
                  onChange={(e) => setNightSurge(parseFloat(e.target.value) || 0)}
                  className="pl-7 h-9 text-xs rounded-xl"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">₹</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Active between 10 PM - 6 AM</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-rose-600 mb-2">
                <Gift className="size-4" />
                <span className="text-xs font-bold text-slate-900">Express Delivery Bonus</span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={expressBonus}
                  onChange={(e) => setExpressBonus(parseFloat(e.target.value) || 0)}
                  className="pl-7 h-9 text-xs rounded-xl"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">₹</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Direct bonus for priority orders</div>
            </div>
          </div>

          {/* Candy Crush Milestone Gamified Ladder */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" />
                  Candy Crush Gamified Milestone Ladder (Rider App Incentives)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Milestone targets rendered directly inside Captain app to gamify weekly deliveries.
                </p>
              </div>

              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  const nextLvl = candyLevels.length + 1;
                  setCandyLevels([
                    ...candyLevels,
                    { level: nextLvl, title: `Level ${nextLvl}`, target: nextLvl * 25, reward: nextLvl * 450 },
                  ]);
                }}
                className="text-xs rounded-xl h-8"
              >
                <Plus className="size-3 mr-1" />
                Add Milestone Level
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {candyLevels.map((lvl, idx) => (
                <div
                  key={lvl.level}
                  className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/30 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-xs">Level {lvl.level}</span>
                    <button
                      onClick={() => setCandyLevels(candyLevels.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Title</span>
                      <Input
                        value={lvl.title}
                        onChange={(e) => {
                          const updated = [...candyLevels];
                          updated[idx].title = e.target.value;
                          setCandyLevels(updated);
                        }}
                        className="h-7 text-xs bg-white mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Target Trips</span>
                      <Input
                        type="number"
                        value={lvl.target}
                        onChange={(e) => {
                          const updated = [...candyLevels];
                          updated[idx].target = parseInt(e.target.value) || 0;
                          setCandyLevels(updated);
                        }}
                        className="h-7 text-xs bg-white mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium">Cash Reward (₹)</span>
                      <Input
                        type="number"
                        value={lvl.reward}
                        onChange={(e) => {
                          const updated = [...candyLevels];
                          updated[idx].reward = parseFloat(e.target.value) || 0;
                          setCandyLevels(updated);
                        }}
                        className="h-7 text-xs bg-white mt-0.5 font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => saveRiderAndIncentiveRulesMutation.mutate("Admin Incentive & Milestone Ladder update")}
                disabled={saveRiderAndIncentiveRulesMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 rounded-xl shadow-md"
              >
                <Check className="size-3.5 mr-1.5" />
                Save Incentive Policy & Ladder
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            SUBTAB 4: SETTLEMENT BATCHES & GENERAL LEDGER
           ========================================================================= */}
        <TabsContent value="batches" className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="size-4 text-indigo-600" />
                  Settlement Batches & Disbursals
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Maker-Checker disbursement cycles with automated General Ledger double-entry posting.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  onClick={() => {
                    const now = new Date();
                    const past7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
                    setGenStartDate(past7.toISOString().slice(0, 10));
                    setGenEndDate(now.toISOString().slice(0, 10));
                    setIsGenerateModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs h-8 shadow-sm"
                >
                  <Plus className="size-3 mr-1" />
                  Run New Batch
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Cycle ID</th>
                    <th className="p-3.5">Period</th>
                    <th className="p-3.5">Orders</th>
                    <th className="p-3.5">Partners (₹)</th>
                    <th className="p-3.5">Captains (₹)</th>
                    <th className="p-3.5">Total Payable</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchesQuery.isLoading ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading settlement batches...
                      </td>
                    </tr>
                  ) : (batchesQuery.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        No settlement batches found. Click &quot;Run New Batch&quot; to calculate partner and captain payouts.
                      </td>
                    </tr>
                  ) : (
                    (batchesQuery.data || []).map((batch) => {
                      const totalPayable = (batch.totalPartnerPayable || 0) + (batch.totalRiderPayable || 0);
                      return (
                        <tr key={batch._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-slate-900">{batch.cycleId}</span>
                            <div className="text-[10px] text-slate-400 font-mono">{batch._id.slice(-8)}</div>
                          </td>
                          <td className="p-3.5 text-slate-600 text-[11px]">
                            {batch.startDate} to {batch.endDate}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-900">
                            {batch.totalOrders}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-sky-700">
                            ₹{batch.totalPartnerPayable.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-emerald-700">
                            ₹{batch.totalRiderPayable.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3.5 font-mono font-black text-indigo-900 text-sm">
                            ₹{totalPayable.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3.5">
                            <Badge
                              className={`text-[10px] font-bold ${
                                batch.status === "PAID"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : batch.status === "APPROVED"
                                  ? "bg-blue-100 text-blue-800 border-blue-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                            >
                              {batch.status}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setSelectedBatchIdForStatement(batch._id)}
                              className="h-7 px-2.5 text-[11px] rounded-lg border-slate-300"
                            >
                              <FileText className="size-3 mr-1" />
                              Statement
                            </Button>

                            {batch.status === "GENERATED" && (
                              <Button
                                size="xs"
                                onClick={() => approveBatchMutation.mutate(batch._id)}
                                disabled={approveBatchMutation.isPending}
                                className="h-7 px-2.5 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                              >
                                Approve
                              </Button>
                            )}

                            {batch.status === "APPROVED" && (
                              <Button
                                size="xs"
                                onClick={() => handleOpenPayoutModal(batch)}
                                className="h-7 px-2.5 text-[11px] rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                              >
                                Disburse
                              </Button>
                            )}

                            {batch.status === "PAID" && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Ref: {batch.payoutReference?.slice(0, 14) || "Disbursed"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* =========================================================================
          MODAL 1: EDIT PARTNER COMMISSION OVERRIDE
         ========================================================================= */}
      <Dialog open={isEditPartnerOpen} onOpenChange={setIsEditPartnerOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Percent className="size-4 text-indigo-600" />
              Custom Commission Rate Override
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set a contractually agreed platform take-rate for this partner.
            </DialogDescription>
          </DialogHeader>

          {selectedPartner && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-sm">{selectedPartner.businessName}</div>
                <div className="text-slate-500 font-mono mt-0.5">ID: {selectedPartner.partnerId}</div>
                <div className="flex items-center gap-3 mt-2 text-[11px]">
                  <span>Tier: <strong>{selectedPartner.currentTier}</strong></span>
                  <span>Standard Rate: <strong>{selectedPartner.standardRatePct}%</strong></span>
                  <span>Completed: <strong>{selectedPartner.orderCount} Orders</strong></span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Custom Platform Commission Rate (%)
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={editRatePct}
                    onChange={(e) => setEditRatePct(parseFloat(e.target.value) || 0)}
                    className="pr-8 text-xs rounded-xl font-bold font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Standard tier rate is {selectedPartner.standardRatePct}%. Set a lower rate for high-volume or exclusive partners.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Audit Reason / Contract Note
                </Label>
                <Textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g., Special Anchor Laundromat Agreement Q4 signed"
                  className="text-xs rounded-xl mt-1 h-20"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t border-slate-100">
            {selectedPartner?.customCommissionPct !== null ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => selectedPartner && removePartnerRateMutation.mutate(selectedPartner.partnerId)}
                disabled={removePartnerRateMutation.isPending}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
              >
                Reset to Tier Default
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditPartnerOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  selectedPartner &&
                  updatePartnerRateMutation.mutate({
                    partnerId: selectedPartner.partnerId,
                    ratePct: editRatePct,
                    reason: editReason || "Admin custom rate update",
                  })
                }
                disabled={updatePartnerRateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
              >
                Apply Override
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: GENERATE SETTLEMENT BATCH
         ========================================================================= */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="size-4 text-indigo-600" />
              Generate Settlement Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Executes the commission settlement engine across completed orders, applying tiered commissions, TDS Section 194-O, and Captain earnings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Start Date</Label>
                <Input
                  type="date"
                  value={genStartDate}
                  onChange={(e) => setGenStartDate(e.target.value)}
                  className="text-xs rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">End Date</Label>
                <Input
                  type="date"
                  value={genEndDate}
                  onChange={(e) => setGenEndDate(e.target.value)}
                  className="text-xs rounded-xl mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Cycle Type</Label>
              <Select value={genCycleType} onValueChange={setGenCycleType}>
                <SelectTrigger className="text-xs rounded-xl mt-1">
                  <SelectValue placeholder="Cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly Payout (Default)</SelectItem>
                  <SelectItem value="BIWEEKLY">Bi-Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly Close</SelectItem>
                  <SelectItem value="ADHOC">Ad-hoc Immediate Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Partner Filter (Optional)
              </Label>
              <Select value={genPartnerId || "ALL"} onValueChange={(v) => setGenPartnerId(v === "ALL" ? "" : v)}>
                <SelectTrigger className="text-xs rounded-xl mt-1">
                  <SelectValue placeholder="All Partners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Registered Partners</SelectItem>
                  {(partnersQuery.data || []).map((p) => (
                    <SelectItem key={p.partnerId} value={p.partnerId}>
                      {p.businessName} ({p.partnerId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400 mt-1">
                Leave as All Partners to process universal batch for all laundromats & captains.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsGenerateModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                generateBatchMutation.mutate({
                  startDate: genStartDate || undefined,
                  endDate: genEndDate || undefined,
                  cycleType: genCycleType,
                  partnerId: genPartnerId || undefined,
                })
              }
              disabled={generateBatchMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
            >
              <Sparkles className="size-3 mr-1" />
              Calculate & Generate Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 3: DISBURSE PAYOUT (MAKER-CHECKER + GENERAL LEDGER POST)
         ========================================================================= */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="size-4 text-emerald-600" />
              Disburse Settlement Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Confirm bank/UPI payout reference. This automatically marks the batch as PAID and posts balanced double-entry transactions in the General Ledger.
            </DialogDescription>
          </DialogHeader>

          {selectedBatchForPayout && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="font-bold text-emerald-950 font-mono text-sm">
                  {selectedBatchForPayout.cycleId}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Merchant Payout:</span>
                    <div className="font-bold text-slate-900 font-mono">
                      ₹{selectedBatchForPayout.totalPartnerPayable.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Captain Payout:</span>
                    <div className="font-bold text-slate-900 font-mono">
                      ₹{selectedBatchForPayout.totalRiderPayable.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Bank / Payment Gateway UTR Reference
                </Label>
                <Input
                  value={payoutUtrRef}
                  onChange={(e) => setPayoutUtrRef(e.target.value)}
                  placeholder="e.g. UTR-HDFC-98472918"
                  className="text-xs rounded-xl mt-1 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Stored as immutable audit reference for financial reconciliation.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-indigo-600" />
                  Automated Double-Entry Accounting Posting:
                </div>
                <div className="text-slate-600">
                  • Debit 2010 (Partner Payable) / Credit 1010 (Bank Operating)
                </div>
                <div className="text-slate-600">
                  • Debit 2020 (Rider Payable) / Credit 1010 (Bank Operating)
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPayoutModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                selectedBatchForPayout &&
                payoutBatchMutation.mutate({
                  batchId: selectedBatchForPayout._id,
                  payoutRef: payoutUtrRef || `BANK-SETTLE-${Date.now()}`,
                })
              }
              disabled={payoutBatchMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
            >
              Confirm Disbursal & Post GL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 4: ITEMIZED STATEMENT BREAKDOWN DRAWER/DIALOG
         ========================================================================= */}
      <Dialog
        open={!!selectedBatchIdForStatement}
        onOpenChange={(open) => !open && setSelectedBatchIdForStatement(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="size-4 text-indigo-600" />
              Itemized Settlement Statement Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Audit-grade breakdown of gross revenue, platform commission, GST on commission, statutory TDS/TCS, and net payable.
            </DialogDescription>
          </DialogHeader>

          {statementQuery.isLoading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Generating itemized statement...
            </div>
          ) : statementQuery.data ? (
            <div className="space-y-5 text-xs">
              {/* Statement Summary Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 font-mono">
                    {statementQuery.data.cycleId}
                  </span>
                  <Badge
                    className={
                      statementQuery.data.status === "PAID"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  >
                    {statementQuery.data.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400">Merchants Gross:</span>
                    <div className="font-bold text-slate-800 font-mono">
                      ₹{statementQuery.data.summary.totalPartnerGross.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Platform Commission:</span>
                    <div className="font-bold text-indigo-600 font-mono">
                      ₹{statementQuery.data.summary.totalPartnerCommission.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Statutory Deductions (TDS/TCS):</span>
                    <div className="font-bold text-rose-600 font-mono">
                      ₹{(statementQuery.data.summary.totalPartnerTds + statementQuery.data.summary.totalPartnerTcs).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Net Merchant Payable:</span>
                    <div className="font-bold text-emerald-700 font-mono">
                      ₹{statementQuery.data.summary.totalPartnerPayable.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Partners Breakdown Table */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-indigo-600" />
                  Laundromat Partner Payouts ({statementQuery.data.partners?.length ?? 0})
                </h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                      <tr>
                        <th className="p-2">Partner ID</th>
                        <th className="p-2">Orders</th>
                        <th className="p-2">Gross (₹)</th>
                        <th className="p-2">Comm. %</th>
                        <th className="p-2">Comm. Amt (₹)</th>
                        <th className="p-2">TDS/TCS (₹)</th>
                        <th className="p-2 text-right">Net Payable (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(statementQuery.data.partners || []).map((p: any) => (
                        <tr key={p.partnerId} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-900">{p.name || p.partnerId}</td>
                          <td className="p-2 font-mono">{p.orderCount}</td>
                          <td className="p-2 font-mono">₹{p.grossOrderAmount?.toLocaleString("en-IN")}</td>
                          <td className="p-2 font-mono">{p.commissionRate}%</td>
                          <td className="p-2 font-mono text-indigo-600">₹{p.commissionAmount?.toLocaleString("en-IN")}</td>
                          <td className="p-2 font-mono text-rose-600">₹{((p.tdsAmount || 0) + (p.tcsAmount || 0)).toLocaleString("en-IN")}</td>
                          <td className="p-2 font-mono font-bold text-emerald-700 text-right">
                            ₹{p.netPayable?.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                      {(statementQuery.data.partners || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400">
                            No partner payouts in this batch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Riders Breakdown Table */}
              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Bike className="size-3.5 text-emerald-600" />
                  Captain Payouts ({statementQuery.data.riders?.length ?? 0})
                </h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                      <tr>
                        <th className="p-2">Captain ID</th>
                        <th className="p-2">Trips</th>
                        <th className="p-2">Gross Trips (₹)</th>
                        <th className="p-2">Bonuses (₹)</th>
                        <th className="p-2">Commission Deducted (₹)</th>
                        <th className="p-2 text-right">Net Payable (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(statementQuery.data.riders || []).map((r: any) => (
                        <tr key={r.riderId} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-900">{r.name || r.riderId}</td>
                          <td className="p-2 font-mono">{r.tripCount}</td>
                          <td className="p-2 font-mono">₹{r.grossEarnings?.toLocaleString("en-IN")}</td>
                          <td className="p-2 font-mono text-amber-600">₹{r.bonusAmount?.toLocaleString("en-IN")}</td>
                          <td className="p-2 font-mono text-slate-600">₹{r.commissionDeduction?.toLocaleString("en-IN")}</td>
                          <td className="p-2 font-mono font-bold text-emerald-700 text-right">
                            ₹{r.netPayable?.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                      {(statementQuery.data.riders || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            No rider payouts in this batch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedBatchIdForStatement(null)}
              className="text-xs rounded-xl"
            >
              Close Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
