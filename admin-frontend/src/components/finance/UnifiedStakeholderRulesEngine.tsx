import React, { useState } from "react";
import {
  Sliders,
  Save,
  RotateCcw,
  Sparkles,
  Truck,
  Building2,
  Bike,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  ShieldCheck,
  Percent,
  Receipt,
  Wallet,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  Scale,
  Plus,
  Trash2,
  Award,
  Zap,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { toast } from "sonner";

interface UnifiedStakeholderRulesEngineProps {
  editableRules: any;
  updateField: (path: string, val: any) => void;
  isDirty: boolean;
  onSave: () => void;
  isSaving?: boolean;
  auditLogs?: any[];
}

export function UnifiedStakeholderRulesEngine({
  editableRules,
  updateField,
  isDirty,
  onSave,
  isSaving = false,
  auditLogs = [],
}: UnifiedStakeholderRulesEngineProps) {
  const [activeRoleTab, setActiveRoleTab] = useState<
    "customer" | "partner" | "rider" | "gst" | "penalties" | "history"
  >("customer");

  // Customer Cart Simulator State
  const [simCartValue, setSimCartValue] = useState<number>(180);
  const [simCustomerIsExpress, setSimCustomerIsExpress] = useState<boolean>(false);
  const [simCustomerIsRain, setSimCustomerIsRain] = useState<boolean>(false);

  // Partner Calculator State
  const [simPartnerGmv, setSimPartnerGmv] = useState<number>(1000);

  // Rider Fare Simulator State
  const [simRiderDistance, setSimRiderDistance] = useState<number>(3.5);
  const [simRiderWaitingMins, setSimRiderWaitingMins] = useState<number>(5);
  const [simRiderIsExpress, setSimRiderIsExpress] = useState<boolean>(false);
  const [simRiderIsRain, setSimRiderIsRain] = useState<boolean>(false);

  // Helper values
  const freeDeliveryThreshold = Number(editableRules?.delivery?.freeDeliveryThreshold) || 199;
  const belowThresholdFee = Number(editableRules?.delivery?.baseFee) || 29;
  const handlingFee =
    editableRules?.fees?.handlingFeeEnabled !== false
      ? Number(editableRules?.fees?.handlingFee || 5)
      : 0;
  const packagingFee = editableRules?.fees?.packagingFeeEnabled
    ? Number(editableRules?.fees?.packagingFee || 10)
    : 0;
  const expressCustomerFee = Number(
    editableRules?.pricing?.universalExpressPrice ||
      editableRules?.delivery?.expressDeliveryFee ||
      40
  );
  const rainSurgeFee = editableRules?.surge?.enabled
    ? Number(editableRules?.surge?.rainSurgeFee || editableRules?.surge?.surgeFee || 20)
    : 0;

  // Customer Cart Calculations
  const isFreeDelivery = simCartValue >= freeDeliveryThreshold;
  const effectiveDeliveryFee = isFreeDelivery ? 0 : belowThresholdFee;
  const effectiveSurgeFee = simCustomerIsRain ? rainSurgeFee : 0;
  const effectiveExpressFee = simCustomerIsExpress ? expressCustomerFee : 0;
  const totalCustomerPay =
    simCartValue +
    effectiveDeliveryFee +
    handlingFee +
    packagingFee +
    effectiveSurgeFee +
    effectiveExpressFee;

  // Partner Calculations
  const partnerSharePercent = Number(editableRules?.commission?.partnerPayoutPercent) || 85;
  const platformCommPercent = Math.max(0, 100 - partnerSharePercent);
  const partnerGrossShare = (simPartnerGmv * partnerSharePercent) / 100;
  const partnerTds194o = (simPartnerGmv * 1.0) / 100; // 1% Section 194-O TDS
  const partnerNetDisbursal = partnerGrossShare - partnerTds194o;
  const platformCommissionAmount = (simPartnerGmv * platformCommPercent) / 100;
  const platformGstAmount = (platformCommissionAmount * 18) / 100;

  // Rider Calculations
  const riderBasePay = Number(editableRules?.riderPayout?.basePay) || 35;
  const riderBaseDistance = 2.0;
  const riderPerKmRate = Number(editableRules?.riderPayout?.perKmRate) || 8.0;
  const riderWaitingRate = Number(editableRules?.riderPayout?.waitingRatePerMin) || 2.0;
  const riderExpressBonus = Number(editableRules?.delivery?.expressDeliveryFee || 25);

  const extraDistanceKm = Math.max(0, simRiderDistance - riderBaseDistance);
  const extraDistancePay = extraDistanceKm * riderPerKmRate;
  const chargeableWaitingMins = Math.max(0, simRiderWaitingMins - 5); // 5 mins free
  const waitingPay = chargeableWaitingMins * riderWaitingRate;
  const expressBonusPay = simRiderIsExpress ? riderExpressBonus : 0;
  const rainBonusPay = simRiderIsRain ? rainSurgeFee : 0;
  const totalRiderPay = Math.max(
    Number(editableRules?.riderPayout?.minimumFloor || 30),
    Math.min(
      Number(editableRules?.riderPayout?.maximumCap || 600),
      riderBasePay + extraDistancePay + waitingPay + expressBonusPay + rainBonusPay
    )
  );

  // Level Incentive Handlers
  const handleUpdateIncentiveLevel = (index: number, key: string, val: any) => {
    const list = [...(editableRules?.incentives?.candyCrushLevels || [])];
    if (list[index]) {
      list[index] = { ...list[index], [key]: val };
      updateField("incentives.candyCrushLevels", list);
    }
  };

  const handleAddIncentiveLevel = () => {
    const list = [...(editableRules?.incentives?.candyCrushLevels || [])];
    const newLevel = list.length + 1;
    list.push({
      level: newLevel,
      title: `Tier ${newLevel} Fleet Pro`,
      target: String(newLevel * 3),
      reward: String(newLevel * 75),
      badge: `Level ${newLevel}`,
      flavor: "Performance Incentive",
    });
    updateField("incentives.candyCrushLevels", list);
    toast.success(`Level ${newLevel} incentive tier added.`);
  };

  const handleDeleteIncentiveLevel = (index: number) => {
    const list = [...(editableRules?.incentives?.candyCrushLevels || [])];
    list.splice(index, 1);
    updateField("incentives.candyCrushLevels", list);
    toast.info("Incentive tier removed.");
  };

  // Tax Override Handlers
  const [newTaxCategory, setNewTaxCategory] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("12");

  const handleAddTaxOverride = () => {
    if (!newTaxCategory.trim()) {
      toast.error("Please enter a service category name");
      return;
    }
    const list = [...(editableRules?.gst?.categoryTaxOverrides || [])];
    list.push({
      id: `tax-${Date.now()}`,
      category: newTaxCategory.trim(),
      gstRatePercent: newTaxRate,
      active: true,
    });
    updateField("gst.categoryTaxOverrides", list);
    setNewTaxCategory("");
    setNewTaxRate("12");
    toast.success("GST rate override added.");
  };

  const handleDeleteTaxOverride = (id: string) => {
    const list = (editableRules?.gst?.categoryTaxOverrides || []).filter((t: any) => t.id !== id);
    updateField("gst.categoryTaxOverrides", list);
    toast.info("GST rate override removed.");
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP COMMAND HEADER WITH ONE-CLICK SAVE CONTROLLER
         ========================================================================= */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <Sliders className="size-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black tracking-tight text-zinc-950">
                  QuickPress Unified Rules &amp; Fare Engine
                </h2>
                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-black text-[10px] uppercase tracking-wider">
                  Live Engine
                </Badge>
                {isDirty && (
                  <Badge className="bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px]">
                    Unsaved Changes
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Central configuration for <strong>Customers</strong>, <strong>Partners</strong>, <strong>Riders</strong>, <strong>GST/Taxes</strong>, and <strong>Penalties</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs px-5 py-2.5 rounded-xl gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Save className="size-4" />
              <span>{isSaving ? "Saving Live Rules..." : "Save Live Rules"}</span>
            </Button>
          </div>
        </div>

        {/* Stakeholder Role Selector Switcher (6 Focused Tabs) */}
        <div className="bg-zinc-100/90 p-1.5 rounded-2xl border border-zinc-200 shadow-2xs overflow-x-auto">
          <Tabs value={activeRoleTab} onValueChange={(v) => setActiveRoleTab(v as any)}>
            <TabsList className="flex items-center gap-1 bg-transparent p-0 h-auto w-max min-w-full">
              <TabsTrigger
                value="customer"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-sky-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>🛒</span>
                <span>1. Customer Pricing</span>
              </TabsTrigger>

              <TabsTrigger
                value="partner"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>🏪</span>
                <span>2. Partner Commercials</span>
              </TabsTrigger>

              <TabsTrigger
                value="rider"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-teal-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>🛵</span>
                <span>3. Rider Pay &amp; Incentives</span>
              </TabsTrigger>

              <TabsTrigger
                value="gst"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-purple-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Receipt className="size-3.5 text-purple-700" />
                <span>4. GST &amp; Tax Engine</span>
              </TabsTrigger>

              <TabsTrigger
                value="penalties"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-rose-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Scale className="size-3.5 text-rose-700" />
                <span>5. Penalties &amp; Fines</span>
              </TabsTrigger>

              <TabsTrigger
                value="history"
                className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Clock className="size-3.5 text-zinc-500" />
                <span>6. Audit History</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* =========================================================================
          ROLE 1: CUSTOMER RULES & CHECKOUT PRICING
         ========================================================================= */}
      {activeRoleTab === "customer" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm">
                      📦
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Free Delivery &amp; Cart Limits</h3>
                      <p className="text-[11px] text-zinc-500">Thresholds to incentivize basket size and order completion</p>
                    </div>
                  </div>
                  <Badge className="bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                    Checkout Inflow
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Free Delivery Min (₹)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Free</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="10"
                        value={editableRules?.delivery?.freeDeliveryThreshold ?? "199"}
                        onChange={(e) => updateField("delivery.freeDeliveryThreshold", e.target.value)}
                        className="bg-white border-zinc-300 text-emerald-800 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Orders $\ge$ this get 100% free delivery.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Delivery Fee Below Min (₹)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">Surcharge</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        value={editableRules?.delivery?.baseFee ?? "29"}
                        onChange={(e) => updateField("delivery.baseFee", e.target.value)}
                        className="bg-white border-zinc-300 text-rose-800 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Charged if cart is below threshold.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Minimum Order Value (MOV ₹)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-bold">MOV</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="10"
                        value={editableRules?.pricing?.minimumOrderValue ?? "99"}
                        onChange={(e) => updateField("pricing.minimumOrderValue", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Minimum subtotal required to checkout.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                      ✨
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Platform Fees &amp; Turnaround Priority</h3>
                      <p className="text-[11px] text-zinc-500">Handling infrastructure charge and express surcharges</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                    Platform Revenue
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Platform Handling Fee (₹)</Label>
                      <Switch
                        checked={editableRules?.fees?.handlingFeeEnabled !== false}
                        onCheckedChange={(checked) => updateField("fees.handlingFeeEnabled", checked)}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={editableRules?.fees?.handlingFee ?? "5"}
                        onChange={(e) => updateField("fees.handlingFee", e.target.value)}
                        disabled={editableRules?.fees?.handlingFeeEnabled === false}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pl-7 shadow-2xs disabled:bg-zinc-100"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Cloud &amp; technology service fee per order.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Express Priority Fee (₹)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">24h Priority</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        value={editableRules?.pricing?.universalExpressPrice ?? editableRules?.delivery?.expressDeliveryFee ?? "40"}
                        onChange={(e) => {
                          updateField("pricing.universalExpressPrice", e.target.value);
                          updateField("delivery.expressDeliveryFee", e.target.value);
                        }}
                        className="bg-white border-zinc-300 text-amber-900 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Premium turnaround priority surcharge.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Protective Packaging (₹)</Label>
                      <Switch
                        checked={Boolean(editableRules?.fees?.packagingFeeEnabled)}
                        onCheckedChange={(checked) => updateField("fees.packagingFeeEnabled", checked)}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={editableRules?.fees?.packagingFee ?? "0"}
                        onChange={(e) => updateField("fees.packagingFee", e.target.value)}
                        disabled={!editableRules?.fees?.packagingFeeEnabled}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pl-7 shadow-2xs disabled:bg-zinc-100"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Eco garment cover &amp; hanger care fee.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                      ⚡
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Dynamic Surge Controls</h3>
                      <p className="text-[11px] text-zinc-500">Weather/monsoon and rush hour surcharges passed to delivery fleet</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                    Surge Multiplier
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Rain / Monsoon Surge Fee (₹)</Label>
                      <Switch
                        checked={Boolean(editableRules?.surge?.enabled)}
                        onCheckedChange={(checked) => updateField("surge.enabled", checked)}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        value={editableRules?.surge?.rainSurgeFee ?? editableRules?.surge?.surgeFee ?? "20"}
                        onChange={(e) => {
                          updateField("surge.rainSurgeFee", e.target.value);
                          updateField("surge.surgeFee", e.target.value);
                        }}
                        disabled={!editableRules?.surge?.enabled}
                        className="bg-white border-zinc-300 text-amber-900 font-black text-sm pl-7 shadow-2xs disabled:bg-zinc-100"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Active during adverse weather conditions.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Customer Notice Reason</Label>
                    <Input
                      type="text"
                      value={editableRules?.surge?.surgeReason ?? "Monsoon / High Demand Surge"}
                      onChange={(e) => updateField("surge.surgeReason", e.target.value)}
                      disabled={!editableRules?.surge?.enabled}
                      className="bg-white border-zinc-300 text-zinc-900 text-xs shadow-2xs disabled:bg-zinc-100"
                    />
                    <p className="text-[10px] text-zinc-500">Displayed in customer bill breakdown.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Live Customer Checkout Simulator */}
            <div className="space-y-4">
              <div className="bg-sky-50/70 rounded-3xl border-2 border-sky-300 p-6 space-y-5 shadow-sm sticky top-6">
                <div className="flex items-center justify-between border-b border-sky-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    <h3 className="text-sm font-black text-sky-950">Live Customer Cart Simulator</h3>
                  </div>
                  <Badge className="bg-sky-200 text-sky-900 font-bold text-[10px]">
                    Instant Preview
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-sky-950 mb-1">
                      <span>Test Basket Items Total:</span>
                      <span className="font-mono text-sm font-black text-sky-900">₹{simCartValue}</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="600"
                      step="10"
                      value={simCartValue}
                      onChange={(e) => setSimCartValue(Number(e.target.value))}
                      className="w-full accent-sky-700 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-sky-700">
                      <span>₹50 (Below MOV)</span>
                      <span>₹{freeDeliveryThreshold} (Free Delivery)</span>
                      <span>₹600</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sky-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-sky-900 font-medium">Test Express 24h Order:</span>
                      <Switch
                        checked={simCustomerIsExpress}
                        onCheckedChange={setSimCustomerIsExpress}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-sky-900 font-medium">Test Monsoon Rain Surge:</span>
                      <Switch
                        checked={simCustomerIsRain}
                        onCheckedChange={setSimCustomerIsRain}
                        disabled={!editableRules?.surge?.enabled}
                      />
                    </div>
                  </div>
                </div>

                {/* Simulated Customer App Bill Receipt */}
                <div className="bg-white rounded-2xl border border-sky-200 p-4 space-y-2.5 shadow-2xs text-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">
                    Customer App Bill Summary
                  </div>

                  <div className="flex justify-between items-center text-zinc-700">
                    <span>Garments Subtotal:</span>
                    <span className="font-mono font-bold text-zinc-950">₹{simCartValue.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-700">Delivery Charge:</span>
                    {isFreeDelivery ? (
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        FREE Delivery
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-rose-700">₹{effectiveDeliveryFee.toFixed(2)}</span>
                    )}
                  </div>

                  {handlingFee > 0 && (
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>Platform Handling Fee:</span>
                      <span className="font-mono font-bold text-zinc-950">₹{handlingFee.toFixed(2)}</span>
                    </div>
                  )}

                  {packagingFee > 0 && (
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>Garment Packaging Protection:</span>
                      <span className="font-mono font-bold text-zinc-950">₹{packagingFee.toFixed(2)}</span>
                    </div>
                  )}

                  {effectiveExpressFee > 0 && (
                    <div className="flex justify-between items-center text-amber-800">
                      <span>Express Priority Turnaround:</span>
                      <span className="font-mono font-bold">₹{effectiveExpressFee.toFixed(2)}</span>
                    </div>
                  )}

                  {effectiveSurgeFee > 0 && (
                    <div className="flex justify-between items-center text-amber-800">
                      <span>Monsoon Rush Surge:</span>
                      <span className="font-mono font-bold">₹{effectiveSurgeFee.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-sky-200 flex justify-between items-center font-black text-sm text-sky-950">
                    <span>Total Customer Pays:</span>
                    <span className="font-mono text-base text-emerald-800">₹{totalCustomerPay.toFixed(2)}</span>
                  </div>
                </div>

                {!isFreeDelivery && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                    <Info className="size-4 shrink-0 text-amber-600" />
                    <span>Customer needs to add <strong>₹{freeDeliveryThreshold - simCartValue}</strong> more to unlock FREE delivery!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE 2: LAUNDROMAT PARTNER COMMERCIALS & SETTLEMENTS
         ========================================================================= */}
      {activeRoleTab === "partner" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      🏪
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Store Revenue Share &amp; Platform Commission</h3>
                      <p className="text-[11px] text-zinc-500">Direct commercial split between Laundromat Store and QuickPress</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    Partner Economics
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-emerald-950">Store Partner Revenue Share (%)</Label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">Store Payout</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="50"
                        max="98"
                        step="0.5"
                        value={editableRules?.commission?.partnerPayoutPercent ?? "85"}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateField("commission.partnerPayoutPercent", val);
                          const num = parseFloat(val);
                          if (!isNaN(num)) {
                            updateField("commission.platformCommissionPercent", String(Math.max(0, 100 - num)));
                            updateField("commission.standardPercent", String(Math.max(0, 100 - num)));
                          }
                        }}
                        className="bg-white border-emerald-300 text-zinc-950 font-black text-lg pr-8 shadow-2xs"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-zinc-500">%</span>
                    </div>
                    <p className="text-[10px] text-emerald-800">Percentage of order value credited to laundry store.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">QuickPress Platform Commission (%)</Label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 font-bold">Platform Take</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        disabled
                        value={platformCommPercent}
                        className="bg-zinc-100 border-zinc-300 text-zinc-900 font-black text-lg pr-8 shadow-2xs"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-zinc-500">%</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Automatically balances (100% - Store Share%).</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-emerald-800">🏪 Store Share: {partnerSharePercent}%</span>
                    <span className="text-blue-800">⚡ QuickPress Take: {platformCommPercent}%</span>
                  </div>
                  <div className="h-3 w-full bg-blue-600 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${partnerSharePercent}%` }}
                      className="h-full bg-emerald-600 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Settlement Settings */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                      🏛️
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Settlement Frequency &amp; Disbursals</h3>
                      <p className="text-[11px] text-zinc-500">Bank disbursal schedules and withdrawal limits</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                    Bank Transfers
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Payout Settlement Frequency</Label>
                    <Select
                      value={editableRules?.settlement?.frequency ?? "T_PLUS_2"}
                      onValueChange={(v) => updateField("settlement.frequency", v)}
                    >
                      <SelectTrigger className="w-full bg-white font-bold text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="T_PLUS_1">T+1 Day (Daily Rolling Settlement)</SelectItem>
                        <SelectItem value="T_PLUS_2">T+2 Days (Standard Recommended)</SelectItem>
                        <SelectItem value="WEEKLY">Weekly Every Monday</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-zinc-500">Automated IMPS/NEFT disbursal cycle.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Min Settlement Payout (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="50"
                        step="50"
                        value={editableRules?.settlement?.minSettlementPayout ?? "100"}
                        onChange={(e) => updateField("settlement.minSettlementPayout", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Minimum balance required for transfer.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Packaging Kit Subsidy (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        value={editableRules?.fees?.packagingFee ?? "15"}
                        onChange={(e) => updateField("fees.packagingFee", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Subsidy credited per delivery kit.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Partner Payout Simulator */}
            <div className="space-y-4">
              <div className="bg-emerald-50/70 rounded-3xl border-2 border-emerald-300 p-6 space-y-5 shadow-sm sticky top-6">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧮</span>
                    <h3 className="text-sm font-black text-emerald-950">Live Partner Settlement Simulator</h3>
                  </div>
                  <Badge className="bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                    Net Disbursal
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-emerald-950 mb-1 block">Test Order GMV (₹):</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="100"
                        step="100"
                        value={simPartnerGmv}
                        onChange={(e) => setSimPartnerGmv(Number(e.target.value) || 0)}
                        className="bg-white border-emerald-300 text-zinc-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-emerald-200 p-4 space-y-2.5 shadow-2xs text-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">
                    Partner Settlement Voucher Preview
                  </div>

                  <div className="flex justify-between items-center text-zinc-700">
                    <span>Order Value (GMV):</span>
                    <span className="font-mono font-bold text-zinc-950">₹{simPartnerGmv.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-800">
                    <span>Partner Share ({partnerSharePercent}%):</span>
                    <span className="font-mono font-bold">₹{partnerGrossShare.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-purple-800">
                    <span>Less: Sec 194-O TDS (1.0%):</span>
                    <span className="font-mono font-bold">-₹{partnerTds194o.toFixed(2)}</span>
                  </div>

                  <div className="pt-2 border-t-2 border-emerald-200 flex justify-between items-center font-black text-sm text-emerald-950">
                    <span>Net Bank Disbursal (T+2):</span>
                    <span className="font-mono text-base text-emerald-800">₹{partnerNetDisbursal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-emerald-200 text-xs space-y-1 text-zinc-600">
                  <div className="flex justify-between">
                    <span>QuickPress Commission ({platformCommPercent}%):</span>
                    <strong className="text-zinc-900 font-mono">₹{platformCommissionAmount.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Applicable GST (18% on Comm):</span>
                    <span className="font-mono">₹{platformGstAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE 3: RIDER CAPTAIN FLEET PAY & LEVEL-WISE INCENTIVES
         ========================================================================= */}
      {activeRoleTab === "rider" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                      🛵
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Transit Distance Pay Slabs</h3>
                      <p className="text-[11px] text-zinc-500">Per-trip base fare, distance rates, and safety caps</p>
                    </div>
                  </div>
                  <Badge className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                    Fleet Compensation
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 bg-teal-50/50 p-3.5 rounded-2xl border border-teal-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-teal-950">Base Pay (First 2 KM)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-200 text-teal-900 font-bold">Base</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="15"
                        step="1"
                        value={editableRules?.riderPayout?.basePay ?? "35"}
                        onChange={(e) => updateField("riderPayout.basePay", e.target.value)}
                        className="bg-white border-teal-300 text-zinc-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-teal-800">Guaranteed fixed pay for first 2 km.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Extra KM Rate (₹/KM)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-bold">&gt; 2 km</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="4"
                        step="0.5"
                        value={editableRules?.riderPayout?.perKmRate ?? "8.0"}
                        onChange={(e) => updateField("riderPayout.perKmRate", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pr-8 shadow-2xs"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-zinc-500">/km</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Rate applied beyond 2 km distance.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Floor Guarantee (₹)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Min</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="20"
                        step="5"
                        value={editableRules?.riderPayout?.minimumFloor ?? "30"}
                        onChange={(e) => updateField("riderPayout.minimumFloor", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Guaranteed minimum trip earning.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Express Priority Order Bonus (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        value={editableRules?.delivery?.expressDeliveryFee ?? "25"}
                        onChange={(e) => updateField("delivery.expressDeliveryFee", e.target.value)}
                        className="bg-white border-zinc-300 text-amber-900 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Bonus for delivering 24h express orders.</p>
                  </div>

                  <div className="space-y-1.5 bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-rose-950">Max COD Cash Limit (₹)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 font-bold">Lockout</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="500"
                        step="500"
                        value={editableRules?.cod?.maxRiderCashLimit ?? "2500"}
                        onChange={(e) => updateField("cod.maxRiderCashLimit", e.target.value)}
                        className="bg-white border-rose-300 text-rose-900 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-rose-800">Orders block when cash in hand $\ge$ limit.</p>
                  </div>
                </div>
              </div>

              {/* LEVEL-WISE INCENTIVE SYSTEM */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                      🏆
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">
                        Level-Wise Milestone Incentives &amp; Gamification
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Riders unlock cash bonuses as they complete order volume tiers
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleAddIncentiveLevel}
                    size="sm"
                    className="h-8 text-xs font-bold gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Tier Level</span>
                  </Button>
                </div>

                <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-black uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 text-left">Level</th>
                        <th className="py-2.5 px-3 text-left">Tier Title</th>
                        <th className="py-2.5 px-3 text-left">Order Target</th>
                        <th className="py-2.5 px-3 text-left">Bonus Reward (₹)</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {(editableRules?.incentives?.candyCrushLevels || []).map((lvl: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50/70">
                          <td className="py-2 px-3 font-bold text-zinc-900">
                            <span className="size-6 rounded-lg bg-amber-100 text-amber-900 font-black flex items-center justify-center text-xs">
                              {lvl.level || idx + 1}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="text"
                              value={lvl.title || ""}
                              onChange={(e) => handleUpdateIncentiveLevel(idx, "title", e.target.value)}
                              className="h-8 text-xs font-bold bg-white border-zinc-300"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                min="1"
                                value={lvl.target || ""}
                                onChange={(e) => handleUpdateIncentiveLevel(idx, "target", e.target.value)}
                                className="h-8 text-xs font-mono font-bold bg-white border-zinc-300 w-24"
                              />
                              <span className="text-[10px] text-zinc-400">orders</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="relative w-28">
                              <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400">₹</span>
                              <Input
                                type="number"
                                min="0"
                                step="10"
                                value={lvl.reward || ""}
                                onChange={(e) => handleUpdateIncentiveLevel(idx, "reward", e.target.value)}
                                className="h-8 text-xs font-mono font-black pl-6 text-emerald-800 bg-white border-zinc-300"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteIncentiveLevel(idx)}
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-amber-600 shrink-0" />
                    <div>
                      <strong className="text-amber-950 font-bold">Weekly Performance Streak Bonus:</strong>
                      <p className="text-[10px] text-amber-800">
                        Awarded if rider completes target weekly orders without cancellation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-600">Target:</span>
                      <Input
                        type="number"
                        min="10"
                        value={editableRules?.incentives?.riderWeeklyStreak?.trips ?? "50"}
                        onChange={(e) => updateField("incentives.riderWeeklyStreak.trips", e.target.value)}
                        className="h-7 w-20 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-zinc-600">Bonus: ₹</span>
                      <Input
                        type="number"
                        min="50"
                        step="50"
                        value={editableRules?.incentives?.riderWeeklyStreak?.reward ?? "800"}
                        onChange={(e) => updateField("incentives.riderWeeklyStreak.reward", e.target.value)}
                        className="h-7 w-24 text-xs font-mono font-black text-emerald-800 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Rider Live Calculator */}
            <div className="space-y-4">
              <div className="bg-teal-50/70 rounded-3xl border-2 border-teal-300 p-6 space-y-5 shadow-sm sticky top-6">
                <div className="flex items-center justify-between border-b border-teal-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <h3 className="text-sm font-black text-teal-950">Live Trip Fare Calculator</h3>
                  </div>
                  <Badge className="bg-teal-200 text-teal-900 font-bold text-[10px]">
                    Captain Earnings
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-teal-950 mb-1">
                      <span>Trip Distance:</span>
                      <span className="font-mono text-sm font-black text-teal-900">{simRiderDistance.toFixed(1)} km</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="15.0"
                      step="0.5"
                      value={simRiderDistance}
                      onChange={(e) => setSimRiderDistance(Number(e.target.value))}
                      className="w-full accent-teal-700 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-teal-700">
                      <span>0.5 km</span>
                      <span>2.0 km (Base)</span>
                      <span>15.0 km</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-teal-950 mb-1">
                      <span>Doorstep Waiting:</span>
                      <span className="font-mono text-sm font-black text-teal-900">{simRiderWaitingMins} mins</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={simRiderWaitingMins}
                      onChange={(e) => setSimRiderWaitingMins(Number(e.target.value))}
                      className="w-full accent-teal-700 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-teal-700">
                      <span>0 min (Free)</span>
                      <span>5 min (Grace)</span>
                      <span>20 mins</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-teal-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-teal-900 font-medium">Express Priority Order:</span>
                      <Switch
                        checked={simRiderIsExpress}
                        onCheckedChange={setSimRiderIsExpress}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-teal-900 font-medium">Monsoon Rain Surcharge:</span>
                      <Switch
                        checked={simRiderIsRain}
                        onCheckedChange={setSimRiderIsRain}
                        disabled={!editableRules?.surge?.enabled}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-teal-200 p-4 space-y-2.5 shadow-2xs text-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 pb-1.5">
                    Captain Trip Earnings Receipt
                  </div>

                  <div className="flex justify-between items-center text-zinc-700">
                    <span>Base Fare (First 2 km):</span>
                    <span className="font-mono font-bold text-zinc-950">₹{riderBasePay.toFixed(2)}</span>
                  </div>

                  {extraDistanceKm > 0 && (
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>Extra Distance ({extraDistanceKm.toFixed(1)} km @ ₹{riderPerKmRate}):</span>
                      <span className="font-mono font-bold text-zinc-950">₹{extraDistancePay.toFixed(2)}</span>
                    </div>
                  )}

                  {waitingPay > 0 && (
                    <div className="flex justify-between items-center text-zinc-700">
                      <span>Waiting Pay ({chargeableWaitingMins} mins @ ₹{riderWaitingRate}):</span>
                      <span className="font-mono font-bold text-zinc-950">₹{waitingPay.toFixed(2)}</span>
                    </div>
                  )}

                  {expressBonusPay > 0 && (
                    <div className="flex justify-between items-center text-amber-800">
                      <span>Express Priority Turnaround Bonus:</span>
                      <span className="font-mono font-bold">₹{expressBonusPay.toFixed(2)}</span>
                    </div>
                  )}

                  {rainBonusPay > 0 && (
                    <div className="flex justify-between items-center text-amber-800">
                      <span>Monsoon Rain Allowance:</span>
                      <span className="font-mono font-bold">₹{rainBonusPay.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-teal-200 flex justify-between items-center font-black text-sm text-teal-950">
                    <span>Total Captain Payout:</span>
                    <span className="font-mono text-base text-emerald-800">₹{totalRiderPay.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE 4: GST & STATUTORY TAX CONFIGURATION ENGINE
         ========================================================================= */}
      {activeRoleTab === "gst" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                      🏛️
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Master GST &amp; Statutory Tax Rates</h3>
                      <p className="text-[11px] text-zinc-500">
                        Goods &amp; Services Tax (CGST, SGST, IGST), Section 52 TCS, and Section 194-O TDS
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-600">GST Active:</span>
                    <Switch
                      checked={Boolean(editableRules?.gst?.enabled !== false)}
                      onCheckedChange={(checked) => updateField("gst.enabled", checked)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 bg-purple-50/50 p-3.5 rounded-2xl border border-purple-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-purple-950">Platform Fee GST (%)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">SAC 998599</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="28"
                        step="1"
                        value={editableRules?.gst?.platformGstPercent ?? "18"}
                        onChange={(e) => updateField("gst.platformGstPercent", e.target.value)}
                        className="bg-white border-purple-300 text-purple-950 font-black text-sm pr-7 shadow-2xs"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-zinc-500">%</span>
                    </div>
                    <p className="text-[10px] text-purple-800">9% CGST + 9% SGST on platform fees.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Delivery Service GST (%)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-bold">SAC 996812</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="28"
                        step="1"
                        value={editableRules?.gst?.deliveryGstPercent ?? "18"}
                        onChange={(e) => updateField("gst.deliveryGstPercent", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pr-7 shadow-2xs"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-zinc-500">%</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">GST on customer delivery charges.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Laundry Service GST (%)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">SAC 999799</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="28"
                        step="1"
                        value={editableRules?.gst?.laundryGstPercent ?? "5"}
                        onChange={(e) => updateField("gst.laundryGstPercent", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pr-7 shadow-2xs"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-zinc-500">%</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Composite GST on laundry washing.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">E-Commerce Section 52 TCS (%)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">GSTR-8</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={editableRules?.gst?.tcsPercent ?? "1.0"}
                        onChange={(e) => updateField("gst.tcsPercent", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pr-7 shadow-2xs"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-zinc-500">%</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Tax Collected at Source from merchant gross sales.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Section 194-O Vendor TDS (%)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Form 16A</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={editableRules?.gst?.tdsPercent ?? "1.0"}
                        onChange={(e) => updateField("gst.tdsPercent", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pr-7 shadow-2xs"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-zinc-500">%</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">TDS deducted on merchant payouts.</p>
                  </div>
                </div>
              </div>

              {/* Category Tax Overrides */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-zinc-950">Category-Wise GST Overrides</h3>
                    <p className="text-[11px] text-zinc-500">Special tax slabs for Dry Cleaning, Leather, or Premium Care</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Category (e.g. Dry Cleaning)"
                      value={newTaxCategory}
                      onChange={(e) => setNewTaxCategory(e.target.value)}
                      className="h-8 text-xs bg-zinc-50 border-zinc-300 w-44"
                    />
                    <Select value={newTaxRate} onValueChange={setNewTaxRate}>
                      <SelectTrigger className="h-8 text-xs w-24 bg-zinc-50 border-zinc-300 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAddTaxOverride}
                      size="sm"
                      className="h-8 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-xs"
                    >
                      <Plus className="size-3.5 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-black uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-4 text-left">Category</th>
                        <th className="py-2.5 px-4 text-left">Applicable GST Rate</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {(editableRules?.gst?.categoryTaxOverrides || []).map((t: any) => (
                        <tr key={t.id} className="hover:bg-zinc-50/70">
                          <td className="py-2.5 px-4 font-bold text-zinc-900">{t.category}</td>
                          <td className="py-2.5 px-4 font-mono font-black text-purple-900">
                            {t.gstRatePercent}% GST
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTaxOverride(t.id)}
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-purple-50/70 rounded-3xl border-2 border-purple-200 p-6 space-y-4 shadow-sm sticky top-6">
                <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                  <h3 className="text-sm font-black text-purple-950">QuickPress GST Credentials</h3>
                  <Badge className="bg-purple-200 text-purple-900 font-bold text-[10px]">
                    Govt. Verified
                  </Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <Label className="text-xs font-bold text-purple-950 mb-1 block">Registered GSTIN:</Label>
                    <Input
                      type="text"
                      value={editableRules?.gst?.quickpressGstin || "07AABCQ1234F1Z5"}
                      onChange={(e) => updateField("gst.quickpressGstin", e.target.value.toUpperCase())}
                      className="bg-white border-purple-300 font-mono font-bold text-purple-900 text-xs shadow-2xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-purple-950 mb-1 block">Default State:</Label>
                    <Input
                      type="text"
                      value={editableRules?.gst?.defaultState || "Uttar Pradesh"}
                      onChange={(e) => updateField("gst.defaultState", e.target.value)}
                      className="bg-white border-purple-300 font-bold text-zinc-900 text-xs shadow-2xs"
                    />
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-purple-200 text-[11px] text-purple-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-purple-700" />
                      <span>Intra-State vs Inter-State Logic:</span>
                    </div>
                    <p className="text-zinc-600 leading-relaxed">
                      Orders within {editableRules?.gst?.defaultState || "Uttar Pradesh"} automatically split into <strong>9% CGST + 9% SGST</strong>. Orders originating from other states file under <strong>18% IGST</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE 5: PENALTIES, FINES & DEDUCTIONS ENGINE
         ========================================================================= */}
      {activeRoleTab === "penalties" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="size-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm">
                    🏪
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-zinc-950">Laundromat Partner Penalties</h3>
                    <p className="text-[11px] text-zinc-500">Deducted from weekly settlement for SLA breaches</p>
                  </div>
                </div>
                <Badge className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                  Store Fines
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
                  <div>
                    <strong className="text-zinc-900">Order Rejection / Unfulfilled Order (₹)</strong>
                    <p className="text-[10px] text-zinc-500">When store declines an active customer booking</p>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={editableRules?.penalties?.orderRejection ?? "50"}
                      onChange={(e) => updateField("penalties.orderRejection", e.target.value)}
                      className="h-8 text-xs font-mono font-black pl-6 text-rose-900 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
                  <div>
                    <strong className="text-zinc-900">Garment Mishandling &amp; Damage Claim (₹)</strong>
                    <p className="text-[10px] text-zinc-500">Torn, faded, or color-bleed damages</p>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="50"
                      value={editableRules?.penalties?.damagedItem ?? "300"}
                      onChange={(e) => updateField("penalties.damagedItem", e.target.value)}
                      className="h-8 text-xs font-mono font-black pl-6 text-rose-900 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
                  <div>
                    <strong className="text-zinc-900">Missing Garment Loss Claim (₹)</strong>
                    <p className="text-[10px] text-zinc-500">Lost garments during store processing</p>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="50"
                      value={editableRules?.penalties?.missingItem ?? "250"}
                      onChange={(e) => updateField("penalties.missingItem", e.target.value)}
                      className="h-8 text-xs font-mono font-black pl-6 text-rose-900 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
                  <div>
                    <strong className="text-zinc-900">False Order Status Update Fine (₹)</strong>
                    <p className="text-[10px] text-zinc-500">Marking "Ready" before actual packaging is complete</p>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={editableRules?.penalties?.falseStatusUpdate ?? "100"}
                      onChange={(e) => updateField("penalties.falseStatusUpdate", e.target.value)}
                      className="h-8 text-xs font-mono font-black pl-6 text-rose-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="size-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm">
                    🛵
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-zinc-950">Rider Fleet &amp; Customer Penalties</h3>
                    <p className="text-[11px] text-zinc-500">Transit delays, doorstep cancellations, and no-shows</p>
                  </div>
                </div>
                <Badge className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                  Fleet &amp; Users
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
                  <div>
                    <strong className="text-zinc-900">Rider Post-Accept Cancellation (₹)</strong>
                    <p className="text-[10px] text-zinc-500">Cancelling order after accepting pickup dispatch</p>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={editableRules?.penalties?.latePickup ?? "75"}
                      onChange={(e) => updateField("penalties.latePickup", e.target.value)}
                      className="h-8 text-xs font-mono font-black pl-6 text-rose-900 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
                  <div>
                    <strong className="text-zinc-900">Customer Late Cancel Fee (₹)</strong>
                    <p className="text-[10px] text-zinc-500">Cancelling after rider has reached or dispatched</p>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={editableRules?.penalties?.customerLateCancel ?? "50"}
                      onChange={(e) => updateField("penalties.customerLateCancel", e.target.value)}
                      className="h-8 text-xs font-mono font-black pl-6 text-rose-900 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
                  <div>
                    <strong className="text-zinc-900">Customer Doorstep No-Show Surcharge (₹)</strong>
                    <p className="text-[10px] text-zinc-500">Customer unreachable at delivery address</p>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={editableRules?.penalties?.customerComplaint ?? "40"}
                      onChange={(e) => updateField("penalties.customerComplaint", e.target.value)}
                      className="h-8 text-xs font-mono font-black pl-6 text-rose-900 bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
                  <div>
                    <strong className="text-zinc-900">Severe Delivery Transit Delay (₹)</strong>
                    <p className="text-[10px] text-zinc-500">Delivery delay exceeding 90 minutes without reason</p>
                  </div>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400">₹</span>
                    <Input
                      type="number"
                      min="0"
                      step="25"
                      value={editableRules?.penalties?.lateDelivery ?? "50"}
                      onChange={(e) => updateField("penalties.lateDelivery", e.target.value)}
                      className="h-8 text-xs font-mono font-black pl-6 text-rose-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE 6: VERSION HISTORY & AUDIT LOG
         ========================================================================= */}
      {activeRoleTab === "history" && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-zinc-950">Rules Audit &amp; Version History</h3>
              <p className="text-xs text-zinc-500">Record of all rule updates published across the platform</p>
            </div>
            <Badge className="bg-zinc-100 text-zinc-800 font-bold text-[10px]">
              Audit Trail
            </Badge>
          </div>

          <div className="divide-y divide-zinc-100 text-xs">
            {auditLogs.length > 0 ? (
              auditLogs.slice(0, 15).map((log: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-zinc-900">{log.action || log.reason || "Financial Rules Published"}</div>
                    <div className="text-[11px] text-zinc-500">
                      By {log.performedBy || log.actor || "Super Admin"} • {log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN") : "Recent"}
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px]">
                    ACTIVE
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-zinc-400">
                Current rules are live and synchronized with the backend.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
