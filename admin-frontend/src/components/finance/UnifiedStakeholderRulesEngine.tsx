import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  MapPin,
  Globe,
  Search,
  CloudRain,
  Moon,
  Eye,
  Edit3,
  Filter,
  Check,
  ChevronDown,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { toast } from "sonner";
import { fetchCities, type CityIntelligence } from "@/api/cities";

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
  // Active Stakeholder Tab
  const [activeRoleTab, setActiveRoleTab] = useState<
    "customer" | "partner" | "rider" | "gst" | "penalties" | "history"
  >("customer");

  // Geographic Scope Selection ("NATIONAL_MASTER" or "City::Area")
  const [selectedScope, setSelectedScope] = useState<string>("NATIONAL_MASTER");

  // Modals for Area Management
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [isAddAreaModalOpen, setIsAddAreaModalOpen] = useState(false);
  const [matrixSearchQuery, setMatrixSearchQuery] = useState("");

  // New Area Form State
  const [newAreaCity, setNewAreaCity] = useState("Kasganj");
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaBaseFee, setNewAreaBaseFee] = useState("25");
  const [newAreaPerKm, setNewAreaPerKm] = useState("7.0");
  const [newAreaFreeDelivery, setNewAreaFreeDelivery] = useState("149");
  const [newAreaCommission, setNewAreaCommission] = useState("12");
  const [newAreaRiderBase, setNewAreaRiderBase] = useState("30");
  const [newAreaRiderPerKm, setNewAreaRiderPerKm] = useState("7.0");

  // Query: Operational Cities & Zones
  const citiesQuery = useQuery<CityIntelligence[]>({
    queryKey: ["admin", "cities", "list"],
    queryFn: fetchCities,
    staleTime: 60000,
  });

  // Consolidated List of Operational Hubs and Areas
  const allOperationalAreas = useMemo(() => {
    const list: Array<{ city: string; area: string; key: string }> = [
      { city: "Kasganj", area: "Soron Gate", key: "Kasganj::Soron Gate" },
      { city: "Kasganj", area: "Outer Bypass", key: "Kasganj::Outer Bypass" },
      { city: "Kasganj", area: "Bilram Gate", key: "Kasganj::Bilram Gate" },
      { city: "Kasganj", area: "City Center", key: "Kasganj::City Center" },
      { city: "New Delhi", area: "Connaught Place", key: "New Delhi::Connaught Place" },
      { city: "New Delhi", area: "South Extension", key: "New Delhi::South Extension" },
      { city: "Aligarh", area: "Center Hub", key: "Aligarh::Center Hub" },
    ];

    // Merge from cities query if available
    if (citiesQuery.data) {
      citiesQuery.data.forEach((c) => {
        if (c.zones) {
          c.zones.forEach((z) => {
            const key = `${c.city}::${z.name}`;
            if (!list.some((item) => item.key.toLowerCase() === key.toLowerCase())) {
              list.push({ city: c.city, area: z.name, key });
            }
          });
        }
      });
    }

    // Merge any existing overrides from editableRules
    const existing = editableRules?.delivery?.cityAreaPricing || [];
    existing.forEach((p: any) => {
      const key = `${p.city}::${p.area}`;
      if (!list.some((item) => item.key.toLowerCase() === key.toLowerCase())) {
        list.push({ city: p.city, area: p.area, key });
      }
    });

    return list;
  }, [citiesQuery.data, editableRules?.delivery?.cityAreaPricing]);

  // Current Scope Helpers
  const isAreaScope = selectedScope !== "NATIONAL_MASTER";

  const activeOverrideIndex = useMemo(() => {
    if (!isAreaScope) return -1;
    const [c, a] = selectedScope.split("::");
    const list = editableRules?.delivery?.cityAreaPricing || [];
    return list.findIndex(
      (item: any) =>
        item.city?.toLowerCase() === c?.toLowerCase() &&
        item.area?.toLowerCase() === a?.toLowerCase()
    );
  }, [selectedScope, isAreaScope, editableRules?.delivery?.cityAreaPricing]);

  const activeAreaOverride = activeOverrideIndex >= 0
    ? editableRules?.delivery?.cityAreaPricing[activeOverrideIndex]
    : null;

  const hasActiveAreaOverride = Boolean(activeAreaOverride);

  const currentScopeCity = isAreaScope ? selectedScope.split("::")[0] : "All India";
  const currentScopeArea = isAreaScope ? selectedScope.split("::")[1] : "National Master";
  const currentScopeLabel = isAreaScope ? `${currentScopeCity} – ${currentScopeArea}` : "All India (National Master)";

  // Update a field specifically for the active area override
  const handleUpdateAreaField = (fieldKey: string, val: any) => {
    if (!isAreaScope) return;
    const [city, area] = selectedScope.split("::");
    const currentList = [...(editableRules?.delivery?.cityAreaPricing || [])];

    if (activeOverrideIndex >= 0) {
      currentList[activeOverrideIndex] = {
        ...currentList[activeOverrideIndex],
        [fieldKey]: val,
      };
    } else {
      // Auto-initialize override cloned from master
      currentList.push({
        id: `del-${Date.now()}`,
        city,
        area,
        baseFee: editableRules?.delivery?.baseFee ?? "29",
        perKmRate: editableRules?.delivery?.perKmRate ?? "8.0",
        minFee: editableRules?.pricing?.minimumOrderValue ?? "99",
        freeDeliveryThreshold: editableRules?.delivery?.freeDeliveryThreshold ?? "149",
        expressDeliveryFee: editableRules?.pricing?.universalExpressPrice ?? "40",
        rainSurge: editableRules?.surge?.rainSurgeFee ?? "20",
        nightSurge: editableRules?.delivery?.nightSurge ?? "25",
        partnerCommissionPercent: String(100 - (Number(editableRules?.commission?.partnerPayoutPercent) || 85)),
        riderBasePay: editableRules?.riderPayout?.basePay ?? "35",
        riderPerKmRate: editableRules?.riderPayout?.perKmRate ?? "8.0",
        minimumFloor: editableRules?.riderPayout?.minimumFloor ?? "30",
        active: true,
        [fieldKey]: val,
      });
    }

    updateField("delivery.cityAreaPricing", currentList);
  };

  // One-click create custom override for the selected area
  const handleCustomizeArea = () => {
    if (!isAreaScope || hasActiveAreaOverride) return;
    const [city, area] = selectedScope.split("::");
    const currentList = [...(editableRules?.delivery?.cityAreaPricing || [])];

    currentList.push({
      id: `del-${Date.now()}`,
      city,
      area,
      baseFee: editableRules?.delivery?.baseFee ?? "25",
      perKmRate: editableRules?.delivery?.perKmRate ?? "7.0",
      minFee: editableRules?.pricing?.minimumOrderValue ?? "99",
      freeDeliveryThreshold: editableRules?.delivery?.freeDeliveryThreshold ?? "149",
      expressDeliveryFee: editableRules?.pricing?.universalExpressPrice ?? "35",
      rainSurge: editableRules?.surge?.rainSurgeFee ?? "15",
      nightSurge: editableRules?.delivery?.nightSurge ?? "20",
      partnerCommissionPercent: "12",
      riderBasePay: "30",
      riderPerKmRate: "7.0",
      minimumFloor: "25",
      active: true,
    });

    updateField("delivery.cityAreaPricing", currentList);
    toast.success(`Custom pricing rules enabled for ${area}, ${city}`);
  };

  // Revert active area to inherit from National Master
  const handleRevertToNationalMaster = () => {
    if (!isAreaScope || !hasActiveAreaOverride) return;
    const currentList = [...(editableRules?.delivery?.cityAreaPricing || [])];
    currentList.splice(activeOverrideIndex, 1);
    updateField("delivery.cityAreaPricing", currentList);
    toast.info(`${currentScopeLabel} reverted to National Master baseline.`);
  };

  // Delete an area override by ID
  const handleDeleteAreaOverrideById = (id: string) => {
    const currentList = (editableRules?.delivery?.cityAreaPricing || []).filter(
      (item: any) => item.id !== id
    );
    updateField("delivery.cityAreaPricing", currentList);
    toast.info("Area override removed.");
  };

  // Add new area override from dialog
  const handleCreateNewAreaFromDialog = () => {
    if (!newAreaName.trim()) {
      toast.error("Please enter an Area / Zone name");
      return;
    }

    const currentList = [...(editableRules?.delivery?.cityAreaPricing || [])];
    const key = `${newAreaCity}::${newAreaName.trim()}`;

    currentList.push({
      id: `del-${Date.now()}`,
      city: newAreaCity,
      area: newAreaName.trim(),
      baseFee: newAreaBaseFee,
      perKmRate: newAreaPerKm,
      minFee: "99",
      freeDeliveryThreshold: newAreaFreeDelivery,
      expressDeliveryFee: "35",
      rainSurge: "15",
      nightSurge: "20",
      partnerCommissionPercent: newAreaCommission,
      riderBasePay: newAreaRiderBase,
      riderPerKmRate: newAreaRiderPerKm,
      minimumFloor: "25",
      active: true,
    });

    updateField("delivery.cityAreaPricing", currentList);
    setSelectedScope(key);
    setIsAddAreaModalOpen(false);
    setNewAreaName("");
    toast.success(`Added new operational area: ${newAreaName.trim()}, ${newAreaCity}`);
  };

  // Effective Values (Takes area override if active, else fallback to national master)
  const effectiveFreeDeliveryThreshold = Number(
    isAreaScope && activeAreaOverride?.freeDeliveryThreshold !== undefined
      ? activeAreaOverride.freeDeliveryThreshold
      : (editableRules?.delivery?.freeDeliveryThreshold ?? 199)
  );

  const effectiveDeliveryBaseFee = Number(
    isAreaScope && activeAreaOverride?.baseFee !== undefined
      ? activeAreaOverride.baseFee
      : (editableRules?.delivery?.baseFee ?? 29)
  );

  const effectivePerKmRate = Number(
    isAreaScope && activeAreaOverride?.perKmRate !== undefined
      ? activeAreaOverride.perKmRate
      : (editableRules?.delivery?.perKmRate ?? 8.0)
  );

  const effectiveMov = Number(
    isAreaScope && activeAreaOverride?.minFee !== undefined
      ? activeAreaOverride.minFee
      : (editableRules?.pricing?.minimumOrderValue ?? 99)
  );

  const effectivePartnerCommission = Number(
    isAreaScope && activeAreaOverride?.partnerCommissionPercent !== undefined
      ? activeAreaOverride.partnerCommissionPercent
      : (100 - (Number(editableRules?.commission?.partnerPayoutPercent) || 85))
  );

  const effectiveRiderBasePay = Number(
    isAreaScope && activeAreaOverride?.riderBasePay !== undefined
      ? activeAreaOverride.riderBasePay
      : (editableRules?.riderPayout?.basePay ?? 35)
  );

  const effectiveRiderPerKmRate = Number(
    isAreaScope && activeAreaOverride?.riderPerKmRate !== undefined
      ? activeAreaOverride.riderPerKmRate
      : (editableRules?.riderPayout?.perKmRate ?? 8.0)
  );

  const effectiveRainSurge = Number(
    isAreaScope && activeAreaOverride?.rainSurge !== undefined
      ? activeAreaOverride.rainSurge
      : (editableRules?.surge?.rainSurgeFee ?? 20)
  );

  const effectiveNightSurge = Number(
    isAreaScope && activeAreaOverride?.nightSurge !== undefined
      ? activeAreaOverride.nightSurge
      : (editableRules?.delivery?.nightSurge ?? 25)
  );

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

  // Customer Cart Simulator State
  const [simCartValue, setSimCartValue] = useState<number>(180);
  const [simCustomerIsExpress, setSimCustomerIsExpress] = useState<boolean>(false);
  const [simCustomerIsRain, setSimCustomerIsRain] = useState<boolean>(false);

  // Customer Cart Calculations
  const isFreeDelivery = simCartValue >= effectiveFreeDeliveryThreshold;
  const effectiveSimDeliveryFee = isFreeDelivery ? 0 : effectiveDeliveryBaseFee;
  const effectiveSimSurgeFee = simCustomerIsRain ? effectiveRainSurge : 0;
  const effectiveSimExpressFee = simCustomerIsExpress ? expressCustomerFee : 0;
  const totalCustomerPay =
    simCartValue +
    effectiveSimDeliveryFee +
    handlingFee +
    packagingFee +
    effectiveSimSurgeFee +
    effectiveSimExpressFee;

  // Partner Calculator State
  const [simPartnerGmv, setSimPartnerGmv] = useState<number>(1000);
  const partnerGrossShare = (simPartnerGmv * (100 - effectivePartnerCommission)) / 100;
  const partnerTds194o = (simPartnerGmv * 1.0) / 100; // 1% Section 194-O TDS
  const partnerNetDisbursal = partnerGrossShare - partnerTds194o;
  const platformCommissionAmount = (simPartnerGmv * effectivePartnerCommission) / 100;
  const platformGstAmount = (platformCommissionAmount * 18) / 100;

  // Rider Fare Simulator State
  const [simRiderDistance, setSimRiderDistance] = useState<number>(3.5);
  const [simRiderWaitingMins, setSimRiderWaitingMins] = useState<number>(5);
  const [simRiderIsExpress, setSimRiderIsExpress] = useState<boolean>(false);
  const [simRiderIsRain, setSimRiderIsRain] = useState<boolean>(false);

  const riderBaseDistance = 2.0;
  const riderWaitingRate = Number(editableRules?.riderPayout?.waitingRatePerMin) || 2.0;
  const riderExpressBonus = Number(editableRules?.delivery?.expressDeliveryFee || 25);

  const extraDistanceKm = Math.max(0, simRiderDistance - riderBaseDistance);
  const extraDistancePay = extraDistanceKm * effectiveRiderPerKmRate;
  const chargeableWaitingMins = Math.max(0, simRiderWaitingMins - 5); // 5 mins free
  const waitingPay = chargeableWaitingMins * riderWaitingRate;
  const expressBonusPay = simRiderIsExpress ? riderExpressBonus : 0;
  const rainBonusPay = simRiderIsRain ? effectiveRainSurge : 0;
  const totalRiderPay = Math.max(
    Number(editableRules?.riderPayout?.minimumFloor || 30),
    Math.min(
      Number(editableRules?.riderPayout?.maximumCap || 600),
      effectiveRiderBasePay + extraDistancePay + waitingPay + expressBonusPay + rainBonusPay
    )
  );

  // Candy Crush Level Milestone Incentives Handlers
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
                Centralized configuration for <strong>Customers</strong>, <strong>Partners</strong>, <strong>Riders</strong>, <strong>GST/Taxes</strong>, and <strong>Penalties</strong> with full <strong>Area &amp; City-Wise Control</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              onClick={() => setIsMatrixModalOpen(true)}
              variant="outline"
              className="border-zinc-300 hover:bg-zinc-100 text-zinc-900 font-bold text-xs px-3.5 py-2.5 rounded-xl gap-2 shadow-2xs cursor-pointer"
            >
              <Globe className="size-4 text-zinc-600" />
              <span>All-Areas Matrix</span>
            </Button>

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

        {/* =========================================================================
            PROMINENT GEOGRAPHIC SCOPE & CITY-AREA CONTROLLER
           ========================================================================= */}
        <div className="bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-blue-50/40 p-4 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-2xs shrink-0">
                <MapPin className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-950">
                    Active Operational Scope:
                  </span>
                  {!isAreaScope ? (
                    <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px]">
                      🇮🇳 All India (National Master Baseline)
                    </Badge>
                  ) : hasActiveAreaOverride ? (
                    <Badge className="bg-blue-100 text-blue-900 border border-blue-300 font-black text-[10px]">
                      📍 Custom Area Override Active
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                      ⚡ Inheriting National Master
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  {!isAreaScope
                    ? `Default baseline applied across all operating cities unless an area has a dedicated override. (${(editableRules?.delivery?.cityAreaPricing || []).length} active area overrides)`
                    : `Configuring rates specifically for ${currentScopeLabel}. Changes affect only this zone.`}
                </p>
              </div>
            </div>

            {/* Scope Selection Dropdown & Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-64">
                <Select value={selectedScope} onValueChange={(v) => setSelectedScope(v)}>
                  <SelectTrigger className="h-9 w-full bg-white border-zinc-300 text-xs font-bold text-zinc-900 shadow-2xs">
                    <SelectValue placeholder="Select Area / City" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="NATIONAL_MASTER" className="text-xs font-black text-emerald-900">
                      🇮🇳 All India (National Master Default)
                    </SelectItem>
                    <div className="px-2 py-1 text-[10px] font-black uppercase text-zinc-400 bg-zinc-50 my-1">
                      Operational Areas &amp; Hubs
                    </div>
                    {allOperationalAreas.map((item) => {
                      const hasOverride = (editableRules?.delivery?.cityAreaPricing || []).some(
                        (p: any) =>
                          p.city?.toLowerCase() === item.city?.toLowerCase() &&
                          p.area?.toLowerCase() === item.area?.toLowerCase()
                      );
                      return (
                        <SelectItem key={item.key} value={item.key} className="text-xs font-medium">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{item.city} – {item.area}</span>
                            {hasOverride && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">
                                Custom
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {isAreaScope && !hasActiveAreaOverride && (
                <Button
                  size="sm"
                  onClick={handleCustomizeArea}
                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs gap-1.5 cursor-pointer"
                >
                  <Zap className="size-3.5" />
                  <span>Customize This Area</span>
                </Button>
              )}

              {isAreaScope && hasActiveAreaOverride && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevertToNationalMaster}
                  className="h-9 border-zinc-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-zinc-700 font-bold text-xs rounded-xl shadow-2xs gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Revert to Master</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => setIsAddAreaModalOpen(true)}
                className="h-9 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-2xs gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Add Area</span>
              </Button>
            </div>
          </div>

          {/* Quick Dynamic Surcharge Strip for Active Scope */}
          <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                <CloudRain className="size-3.5 text-blue-600" />
                <span className="font-bold text-zinc-800">Rain Surge:</span>
                <span className="font-black text-blue-700">+₹{effectiveRainSurge}</span>
              </div>

              <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                <Moon className="size-3.5 text-indigo-600" />
                <span className="font-bold text-zinc-800">Night Surge:</span>
                <span className="font-black text-indigo-700">+₹{effectiveNightSurge}</span>
              </div>

              <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                <Truck className="size-3.5 text-emerald-600" />
                <span className="font-bold text-zinc-800">Free Delivery $\ge$:</span>
                <span className="font-black text-emerald-700">₹{effectiveFreeDeliveryThreshold}</span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 font-medium">
              Scope: <strong>{currentScopeLabel}</strong>
            </div>
          </div>
        </div>

        {/* Stakeholder Role Switcher Tabs */}
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
          ROLE 1: CUSTOMER RULES & CHECKOUT PRICING (AREA-AWARE)
         ========================================================================= */}
      {activeRoleTab === "customer" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Universal Base Pricing */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      🏷️
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Universal Base Pricing &amp; Core Fees</h3>
                      <p className="text-[11px] text-zinc-500">
                        Base item pricing and checkout convenience applicable to {currentScopeLabel}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    {isAreaScope ? "Area Rule" : "National Master"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200">
                    <Label className="text-xs font-black text-emerald-950">Universal Base Price (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        value={editableRules?.pricing?.universalBasePrice ?? "69"}
                        onChange={(e) => updateField("pricing.universalBasePrice", e.target.value)}
                        className="bg-white border-emerald-300 text-emerald-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Standard base per order.</p>
                  </div>

                  <div className="space-y-1.5 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200">
                    <Label className="text-xs font-black text-amber-950">Express Priority Price (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        value={editableRules?.pricing?.universalExpressPrice ?? "99"}
                        onChange={(e) => {
                          updateField("pricing.universalExpressPrice", e.target.value);
                          updateField("delivery.expressDeliveryFee", e.target.value);
                        }}
                        className="bg-white border-amber-300 text-amber-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">24-hour turnaround fee.</p>
                  </div>

                  <div className="space-y-1.5 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-blue-950">Handling Fee (₹)</Label>
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
                        value={editableRules?.fees?.handlingFee ?? "2"}
                        onChange={(e) => updateField("fees.handlingFee", e.target.value)}
                        disabled={editableRules?.fees?.handlingFeeEnabled === false}
                        className="bg-white border-blue-300 text-blue-950 font-black text-sm pl-7 shadow-2xs disabled:bg-zinc-100"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Packaging &amp; sanitization.</p>
                  </div>

                  <div className="space-y-1.5 bg-purple-50/50 p-3.5 rounded-2xl border border-purple-200">
                    <Label className="text-xs font-black text-purple-950">Platform Convenience (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        value={editableRules?.fees?.platformConvenienceFee ?? "5"}
                        onChange={(e) => updateField("fees.platformConvenienceFee", e.target.value)}
                        className="bg-white border-purple-300 text-purple-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Cloud &amp; app infra fee.</p>
                  </div>
                </div>
              </div>

              {/* Free Delivery & Distance Fare */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-sm">
                      📦
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Free Delivery &amp; Distance Fare Limits</h3>
                      <p className="text-[11px] text-zinc-500">
                        Zone thresholds for <strong>{currentScopeLabel}</strong>
                      </p>
                    </div>
                  </div>
                  {isAreaScope && (
                    <Badge className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                      {hasActiveAreaOverride ? "Custom Override" : "Inherits Master"}
                    </Badge>
                  )}
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
                        value={
                          isAreaScope && activeAreaOverride?.freeDeliveryThreshold !== undefined
                            ? activeAreaOverride.freeDeliveryThreshold
                            : (editableRules?.delivery?.freeDeliveryThreshold ?? "149")
                        }
                        onChange={(e) => {
                          if (isAreaScope) handleUpdateAreaField("freeDeliveryThreshold", e.target.value);
                          else updateField("delivery.freeDeliveryThreshold", e.target.value);
                        }}
                        className="bg-white border-zinc-300 text-emerald-800 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Orders $\ge$ this get 100% free delivery.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-zinc-800">Delivery Fee Below Min (₹)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">Fee</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        value={
                          isAreaScope && activeAreaOverride?.baseFee !== undefined
                            ? activeAreaOverride.baseFee
                            : (editableRules?.delivery?.baseFee ?? "29")
                        }
                        onChange={(e) => {
                          if (isAreaScope) handleUpdateAreaField("baseFee", e.target.value);
                          else updateField("delivery.baseFee", e.target.value);
                        }}
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
                        value={
                          isAreaScope && activeAreaOverride?.minFee !== undefined
                            ? activeAreaOverride.minFee
                            : (editableRules?.pricing?.minimumOrderValue ?? "99")
                        }
                        onChange={(e) => {
                          if (isAreaScope) handleUpdateAreaField("minFee", e.target.value);
                          else updateField("pricing.minimumOrderValue", e.target.value);
                        }}
                        className="bg-white border-zinc-300 text-zinc-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Minimum subtotal required to checkout.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Extra Distance Rate (₹/km)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={
                          isAreaScope && activeAreaOverride?.perKmRate !== undefined
                            ? activeAreaOverride.perKmRate
                            : (editableRules?.delivery?.perKmRate ?? "8.0")
                        }
                        onChange={(e) => {
                          if (isAreaScope) handleUpdateAreaField("perKmRate", e.target.value);
                          else updateField("delivery.perKmRate", e.target.value);
                        }}
                        className="bg-white border-zinc-300 text-zinc-900 font-bold text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Delivery charge beyond standard 2 km radius.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Express Turnaround Multiplier (x)</Label>
                    <Input
                      type="number"
                      step="0.05"
                      value={editableRules?.pricing?.expressMultiplier ?? "1.35"}
                      onChange={(e) => updateField("pricing.expressMultiplier", e.target.value)}
                      className="bg-white border-zinc-300 text-zinc-900 font-bold text-sm shadow-2xs"
                    />
                    <p className="text-[10px] text-zinc-500">Multiplier (+35%) applied for priority orders.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Customer Cart Simulator */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-sky-50 via-white to-sky-50/60 rounded-3xl border border-sky-200 p-6 shadow-2xs space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-sky-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-sky-950">
                      Live Customer Cart Simulator
                    </h3>
                  </div>
                  <Badge className="bg-sky-100 text-sky-800 border-sky-300 text-[10px] font-bold">
                    Instant
                  </Badge>
                </div>

                <div className="text-[11px] text-zinc-600 bg-white/80 p-2.5 rounded-xl border border-sky-100 font-medium">
                  Testing pricing for: <strong>{currentScopeLabel}</strong>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-700 mb-1">
                      <span>Simulated Cart Value:</span>
                      <span className="font-black text-zinc-950">₹{simCartValue}</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="600"
                      step="10"
                      value={simCartValue}
                      onChange={(e) => setSimCartValue(Number(e.target.value))}
                      className="w-full accent-sky-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-sky-100 text-xs font-bold">
                    <span>Express 24h Turnaround (+₹{expressCustomerFee})</span>
                    <Switch checked={simCustomerIsExpress} onCheckedChange={setSimCustomerIsExpress} />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-sky-100 text-xs font-bold">
                    <span>Active Weather Surge (+₹{effectiveRainSurge})</span>
                    <Switch checked={simCustomerIsRain} onCheckedChange={setSimCustomerIsRain} />
                  </div>
                </div>

                {/* Receipt Breakdown */}
                <div className="bg-white p-4 rounded-2xl border border-sky-200 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Cart Subtotal</span>
                    <span className="font-bold text-zinc-900">₹{simCartValue}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Delivery Charge</span>
                    <span className={`font-bold ${isFreeDelivery ? "text-emerald-600" : "text-zinc-900"}`}>
                      {isFreeDelivery ? "FREE (Above ₹" + effectiveFreeDeliveryThreshold + ")" : `₹${effectiveSimDeliveryFee}`}
                    </span>
                  </div>
                  {handlingFee > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Handling Fee</span>
                      <span className="font-bold text-zinc-900">₹{handlingFee}</span>
                    </div>
                  )}
                  {packagingFee > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Packaging Fee</span>
                      <span className="font-bold text-zinc-900">₹{packagingFee}</span>
                    </div>
                  )}
                  {simCustomerIsExpress && (
                    <div className="flex justify-between text-amber-700">
                      <span>Express Priority</span>
                      <span className="font-bold">+₹{effectiveSimExpressFee}</span>
                    </div>
                  )}
                  {simCustomerIsRain && (
                    <div className="flex justify-between text-blue-700">
                      <span>Weather Surge</span>
                      <span className="font-bold">+₹{effectiveSimSurgeFee}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-zinc-100 flex justify-between font-black text-sm text-zinc-950">
                    <span>Total Customer Pays</span>
                    <span className="text-emerald-700">₹{totalCustomerPay}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE 2: PARTNER COMMERCIALS & COMMISSION ENGINE (AREA-AWARE)
         ========================================================================= */}
      {activeRoleTab === "partner" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      🤝
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Laundromat Partner Commercials</h3>
                      <p className="text-[11px] text-zinc-500">
                        Commission take rate and settlement terms for <strong>{currentScopeLabel}</strong>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    {isAreaScope ? "Area Rule" : "National Master"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black text-emerald-950">Platform Take Rate / Commission (%)</Label>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {effectivePartnerCommission}% Net
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={effectivePartnerCommission}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (isAreaScope) {
                            handleUpdateAreaField("partnerCommissionPercent", val);
                          } else {
                            updateField("commission.partnerPayoutPercent", String(100 - Number(val)));
                          }
                        }}
                        className="bg-white border-emerald-300 text-emerald-950 font-black text-base shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Partner receives <strong>{100 - effectivePartnerCommission}%</strong> of GMV.
                    </p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-4 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Partner Settlement Schedule</Label>
                    <Select
                      value={editableRules?.settlement?.cycle ?? "T_PLUS_1"}
                      onValueChange={(v) => updateField("settlement.cycle", v)}
                    >
                      <SelectTrigger className="bg-white border-zinc-300 text-xs font-bold text-zinc-900 shadow-2xs h-10">
                        <SelectValue placeholder="Select Cycle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="T_PLUS_1">T+1 Daily Auto-Disbursal (Standard)</SelectItem>
                        <SelectItem value="T_PLUS_2">T+2 Settlement Cycle</SelectItem>
                        <SelectItem value="WEEKLY_MONDAY">Weekly Every Monday</SelectItem>
                        <SelectItem value="INSTANT_FLOAT">Instant Escrow Release (Pre-funded)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-zinc-500">Automated payout disbursal cycle via RazorpayX Escrow.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Section 194-O TDS Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      disabled
                      value="1.0"
                      className="bg-zinc-100 border-zinc-300 font-bold text-xs"
                    />
                    <p className="text-[10px] text-zinc-500">Statutory IT deduction on e-commerce operators.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Minimum Payout Disbursal (₹)</Label>
                    <Input
                      type="number"
                      min="50"
                      value={editableRules?.settlement?.minSettlementPayout ?? "100"}
                      onChange={(e) => updateField("settlement.minSettlementPayout", e.target.value)}
                      className="bg-white border-zinc-300 font-bold text-xs shadow-2xs"
                    />
                    <p className="text-[10px] text-zinc-500">Balances below this roll over to next cycle.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Partner Store Onboarding Fee (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editableRules?.partner?.onboardingFee ?? "0"}
                      onChange={(e) => updateField("partner.onboardingFee", e.target.value)}
                      className="bg-white border-zinc-300 font-bold text-xs shadow-2xs"
                    />
                    <p className="text-[10px] text-zinc-500">One-time kit &amp; verification charge.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Partner Earning Simulator */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 rounded-3xl border border-emerald-200 p-6 shadow-2xs space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-emerald-700" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                      Partner Disbursal Simulator
                    </h3>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                    194-O Reconciled
                  </Badge>
                </div>

                <div className="text-[11px] text-zinc-600 bg-white/80 p-2.5 rounded-xl border border-emerald-100 font-medium">
                  Zone Scope: <strong>{currentScopeLabel}</strong> (Commission: {effectivePartnerCommission}%)
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-700 mb-1">
                      <span>Simulated Order GMV:</span>
                      <span className="font-black text-zinc-950">₹{simPartnerGmv}</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="5000"
                      step="50"
                      value={simPartnerGmv}
                      onChange={(e) => setSimPartnerGmv(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Order Value (GMV)</span>
                    <span className="font-bold text-zinc-900">₹{simPartnerGmv}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>Partner Share ({100 - effectivePartnerCommission}%)</span>
                    <span className="font-bold">₹{partnerGrossShare.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700">
                    <span>Less: 1% Section 194-O TDS</span>
                    <span className="font-bold">-₹{partnerTds194o.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex justify-between font-black text-sm text-zinc-950">
                    <span>Net Partner Bank Disbursal</span>
                    <span className="text-emerald-700">₹{partnerNetDisbursal.toFixed(2)}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-dashed border-zinc-200 space-y-1 text-[11px] text-zinc-500">
                    <div className="flex justify-between">
                      <span>Platform Commission ({effectivePartnerCommission}%)</span>
                      <span className="font-bold text-zinc-800">₹{platformCommissionAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST on Commission (18%)</span>
                      <span className="font-bold text-purple-700">₹{platformGstAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE 3: RIDER PAY & INCENTIVES ENGINE (AREA-AWARE + CANDY CRUSH MILESTONES)
         ========================================================================= */}
      {activeRoleTab === "rider" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Rider Core Tariff */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                      🛵
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">Rider Delivery Tariff &amp; Per-KM Pay</h3>
                      <p className="text-[11px] text-zinc-500">
                        Distance payouts and door waiting fee for <strong>{currentScopeLabel}</strong>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">
                    {isAreaScope ? "Area Rule" : "National Master"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 bg-teal-50/50 p-3.5 rounded-2xl border border-teal-200">
                    <Label className="text-xs font-black text-teal-950">Base Tariff (First 2 KM) (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="10"
                        step="1"
                        value={effectiveRiderBasePay}
                        onChange={(e) => {
                          if (isAreaScope) handleUpdateAreaField("riderBasePay", e.target.value);
                          else updateField("riderPayout.basePay", e.target.value);
                        }}
                        className="bg-white border-teal-300 text-teal-950 font-black text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Guaranteed fixed charge for pickup &amp; first 2 km.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Extra KM Rate (₹/km)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={effectiveRiderPerKmRate}
                        onChange={(e) => {
                          if (isAreaScope) handleUpdateAreaField("riderPerKmRate", e.target.value);
                          else updateField("riderPayout.perKmRate", e.target.value);
                        }}
                        className="bg-white border-zinc-300 text-zinc-950 font-bold text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Rate beyond 2 km distance.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Doorstep Waiting Rate (₹/min)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editableRules?.riderPayout?.waitingRatePerMin ?? "2.0"}
                        onChange={(e) => updateField("riderPayout.waitingRatePerMin", e.target.value)}
                        className="bg-white border-zinc-300 text-zinc-950 font-bold text-sm pl-7 shadow-2xs"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">Applied after 5 mins free waiting.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Minimum Floor Guarantee (₹)</Label>
                    <Input
                      type="number"
                      min="10"
                      value={editableRules?.riderPayout?.minimumFloor ?? "30"}
                      onChange={(e) => updateField("riderPayout.minimumFloor", e.target.value)}
                      className="bg-white border-zinc-300 font-bold text-xs shadow-2xs"
                    />
                    <p className="text-[10px] text-zinc-500">Rider never earns less than this per completed trip.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Maximum Safety Ceiling (₹)</Label>
                    <Input
                      type="number"
                      min="100"
                      value={editableRules?.riderPayout?.maximumCap ?? "600"}
                      onChange={(e) => updateField("riderPayout.maximumCap", e.target.value)}
                      className="bg-white border-zinc-300 font-bold text-xs shadow-2xs"
                    />
                    <p className="text-[10px] text-zinc-500">Single trip upper safety cap.</p>
                  </div>

                  <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                    <Label className="text-xs font-bold text-zinc-800">Express Priority Bonus (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editableRules?.delivery?.expressDeliveryFee ?? "25"}
                      onChange={(e) => updateField("delivery.expressDeliveryFee", e.target.value)}
                      className="bg-white border-zinc-300 font-bold text-xs shadow-2xs"
                    />
                    <p className="text-[10px] text-zinc-500">Bonus paid to rider for urgent express pickups.</p>
                  </div>
                </div>
              </div>

              {/* Candy Crush Level Milestone Incentives */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                      🏆
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-zinc-950">
                        Level-Wise Milestone Incentives (Daily Gamification)
                      </h3>
                      <p className="text-[11px] text-zinc-500">
                        Candy Crush style tiered trip bonuses to motivate rider engagement
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleAddIncentiveLevel}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs gap-1.5 cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Level Tier</span>
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {(editableRules?.incentives?.candyCrushLevels || [
                    { level: 1, title: "Tier 1 Starter", target: "3", reward: "75", badge: "Bronze" },
                    { level: 2, title: "Tier 2 Cruiser", target: "6", reward: "160", badge: "Silver" },
                    { level: 3, title: "Tier 3 Champion", target: "10", reward: "300", badge: "Gold" },
                    { level: 4, title: "Tier 4 Legend", target: "15", reward: "550", badge: "Platinum" },
                    { level: 5, title: "Tier 5 Master", target: "20", reward: "800", badge: "Diamond" },
                  ]).map((lvl: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 bg-zinc-50/90 rounded-2xl border border-zinc-200 gap-3 flex-wrap"
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-7 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xs">
                          L{lvl.level || idx + 1}
                        </span>
                        <div>
                          <input
                            type="text"
                            value={lvl.title || `Tier ${idx + 1}`}
                            onChange={(e) => handleUpdateIncentiveLevel(idx, "title", e.target.value)}
                            className="font-bold text-xs text-zinc-900 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-amber-500 focus:outline-none"
                          />
                          <p className="text-[10px] text-zinc-500">Completed daily trips milestone</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-bold text-zinc-600">Target Trips:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={lvl.target}
                            onChange={(e) => handleUpdateIncentiveLevel(idx, "target", e.target.value)}
                            className="w-16 h-8 text-xs font-black text-zinc-900 bg-white"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-bold text-zinc-600">Bonus Reward (₹):</Label>
                          <Input
                            type="number"
                            min="0"
                            step="25"
                            value={lvl.reward}
                            onChange={(e) => handleUpdateIncentiveLevel(idx, "reward", e.target.value)}
                            className="w-20 h-8 text-xs font-black text-emerald-800 bg-white"
                          />
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteIncentiveLevel(idx)}
                          className="size-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Weekly Streak Bonus */}
                <div className="p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/60 rounded-2xl border border-amber-200 flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-amber-600" />
                      <span className="font-black text-xs text-amber-950">Weekly Consistent Streak Bonus</span>
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      Riders completing 40+ trips across 6 days in a calendar week receive this jackpot.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-700">Weekly Reward:</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs font-bold text-zinc-500">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="50"
                        value={editableRules?.incentives?.riderWeeklyStreak?.reward ?? "1200"}
                        onChange={(e) => updateField("incentives.riderWeeklyStreak.reward", Number(e.target.value))}
                        className="w-24 h-8 text-xs font-black text-amber-950 bg-white pl-6 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Trip Fare Simulator */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-teal-50 via-white to-teal-50/60 rounded-3xl border border-teal-200 p-6 shadow-2xs space-y-4 sticky top-6">
                <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Bike className="size-4 text-teal-700" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-teal-950">
                      Live Trip Fare Simulator
                    </h3>
                  </div>
                  <Badge className="bg-teal-100 text-teal-800 border-teal-300 text-[10px] font-bold">
                    Floor Protected
                  </Badge>
                </div>

                <div className="text-[11px] text-zinc-600 bg-white/80 p-2.5 rounded-xl border border-teal-100 font-medium">
                  Zone Scope: <strong>{currentScopeLabel}</strong> (Base Pay: ₹{effectiveRiderBasePay})
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-700 mb-1">
                      <span>Trip Distance:</span>
                      <span className="font-black text-zinc-950">{simRiderDistance.toFixed(1)} km</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="15.0"
                      step="0.5"
                      value={simRiderDistance}
                      onChange={(e) => setSimRiderDistance(Number(e.target.value))}
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-700 mb-1">
                      <span>Doorstep Waiting:</span>
                      <span className="font-black text-zinc-950">{simRiderWaitingMins} mins</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="1"
                      value={simRiderWaitingMins}
                      onChange={(e) => setSimRiderWaitingMins(Number(e.target.value))}
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-teal-100 text-xs font-bold">
                    <span>Express Priority Pickup (+₹{riderExpressBonus})</span>
                    <Switch checked={simRiderIsExpress} onCheckedChange={setSimRiderIsExpress} />
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-teal-100 text-xs font-bold">
                    <span>Active Rain Bonus (+₹{effectiveRainSurge})</span>
                    <Switch checked={simRiderIsRain} onCheckedChange={setSimRiderIsRain} />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-teal-200 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <span>Base Tariff (First 2 KM)</span>
                    <span className="font-bold text-zinc-900">₹{effectiveRiderBasePay}</span>
                  </div>
                  {extraDistanceKm > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Distance Extra ({extraDistanceKm.toFixed(1)} km @ ₹{effectiveRiderPerKmRate}/km)</span>
                      <span className="font-bold text-zinc-900">₹{extraDistancePay.toFixed(2)}</span>
                    </div>
                  )}
                  {waitingPay > 0 && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Doorstep Waiting ({chargeableWaitingMins} mins)</span>
                      <span className="font-bold text-zinc-900">₹{waitingPay.toFixed(2)}</span>
                    </div>
                  )}
                  {simRiderIsExpress && (
                    <div className="flex justify-between text-amber-700">
                      <span>Express Bonus</span>
                      <span className="font-bold">+₹{expressBonusPay}</span>
                    </div>
                  )}
                  {simRiderIsRain && (
                    <div className="flex justify-between text-blue-700">
                      <span>Rain Surge Bonus</span>
                      <span className="font-bold">+₹{rainBonusPay}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-zinc-100 flex justify-between font-black text-sm text-zinc-950">
                    <span>Total Rider Earnings</span>
                    <span className="text-teal-700">₹{totalRiderPay.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE 4: GST & STATUTORY TAX ENGINE (AREA & STATE SPECIFIC)
         ========================================================================= */}
      {activeRoleTab === "gst" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="size-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                  📜
                </span>
                <div>
                  <h3 className="text-sm font-black text-zinc-950">Statutory GST &amp; Tax Engine Configuration</h3>
                  <p className="text-[11px] text-zinc-500">
                    SAC codes, CGST, SGST, IGST, Section 194-O TDS &amp; 52 TCS parameters
                  </p>
                </div>
              </div>
              <Badge className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                Tax Compliance
              </Badge>
            </div>

            {/* State Tax Jurisdiction Box */}
            <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-purple-700" />
                  <span className="font-black text-xs text-purple-950">
                    Jurisdiction GSTIN &amp; State Classification
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600">
                  Currently active for <strong>{currentScopeCity} Hub</strong>. Intra-state orders split into CGST (9%) + SGST (9%).
                </p>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold bg-white px-3 py-1.5 rounded-xl border border-purple-200 text-purple-950">
                <span>{currentScopeCity?.toLowerCase().includes("delhi") ? "07AABCQ1234F1Z5 (DL)" : "09AAACK1234M1Z5 (UP)"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                <Label className="text-xs font-bold text-zinc-800">Primary Laundry SAC Code</Label>
                <Input
                  value={editableRules?.gst?.defaultSacCode ?? "998721"}
                  onChange={(e) => updateField("gst.defaultSacCode", e.target.value)}
                  className="bg-white font-mono text-xs font-bold shadow-2xs"
                />
                <p className="text-[10px] text-zinc-500">Washing, dry-cleaning &amp; ironing services.</p>
              </div>

              <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                <Label className="text-xs font-bold text-zinc-800">Standard GST Rate (%)</Label>
                <Select
                  value={editableRules?.gst?.standardGstRate ?? "18"}
                  onValueChange={(v) => updateField("gst.standardGstRate", v)}
                >
                  <SelectTrigger className="bg-white border-zinc-300 text-xs font-bold h-9">
                    <SelectValue placeholder="Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5% (Essential Concession)</SelectItem>
                    <SelectItem value="12">12% (Standard Fabric Care)</SelectItem>
                    <SelectItem value="18">18% (Standard Service GST)</SelectItem>
                    <SelectItem value="28">28% (Luxury Surcharge)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-zinc-500">Platform commission &amp; customer orders.</p>
              </div>

              <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                <Label className="text-xs font-bold text-zinc-800">Section 52 TCS Rate (%)</Label>
                <Input
                  disabled
                  value="1.0"
                  className="bg-zinc-100 font-mono text-xs font-bold"
                />
                <p className="text-[10px] text-zinc-500">Collected at source for marketplace sales.</p>
              </div>

              <div className="space-y-1.5 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200">
                <Label className="text-xs font-bold text-zinc-800">Reverse Charge Mechanism (RCM)</Label>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-zinc-700">Apply RCM</span>
                  <Switch
                    checked={Boolean(editableRules?.gst?.rcmEnabled)}
                    onCheckedChange={(c) => updateField("gst.rcmEnabled", c)}
                  />
                </div>
                <p className="text-[10px] text-zinc-500">If partner lacks active GSTIN.</p>
              </div>
            </div>

            {/* Category Tax Overrides Table */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-950">
                  Service Category Tax Rate Overrides
                </h4>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. Premium Silk Care"
                    value={newTaxCategory}
                    onChange={(e) => setNewTaxCategory(e.target.value)}
                    className="w-48 h-8 text-xs bg-white"
                  />
                  <Select value={newTaxRate} onValueChange={setNewTaxRate}>
                    <SelectTrigger className="w-24 h-8 text-xs bg-white">
                      <SelectValue placeholder="Rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleAddTaxOverride}
                    className="h-8 text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-2 text-xs">
                {(editableRules?.gst?.categoryTaxOverrides || [
                  { id: "tax-1", category: "Dry Cleaning (Standard)", gstRatePercent: "18", active: true },
                  { id: "tax-2", category: "Wash & Fold Daily", gstRatePercent: "12", active: true },
                  { id: "tax-3", category: "Shoe & Sneaker Spa", gstRatePercent: "18", active: true },
                  { id: "tax-4", category: "Curtains & Heavy Linens", gstRatePercent: "18", active: true },
                ]).map((tax: any) => (
                  <div key={tax.id} className="py-2.5 px-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900">{tax.category}</span>
                      <span className="text-[10px] text-zinc-500 ml-2 font-mono">SAC 998721</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold text-xs">
                        {tax.gstRatePercent}% GST
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteTaxOverride(tax.id)}
                        className="size-7 text-zinc-400 hover:text-rose-600 rounded-md cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE 5: PENALTIES, CLAIMS & CANCELLATION ENGINE
         ========================================================================= */}
      {activeRoleTab === "penalties" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="size-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm">
                  ⚖️
                </span>
                <div>
                  <h3 className="text-sm font-black text-zinc-950">Platform Penalty, Fines &amp; Protection Engine</h3>
                  <p className="text-[11px] text-zinc-500">
                    Surcharges for SLA violations, unassigned cancellations &amp; garment damage claims
                  </p>
                </div>
              </div>
              <Badge className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                Quality SLA
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 bg-rose-50/50 p-4 rounded-2xl border border-rose-200">
                <Label className="text-xs font-black text-rose-950">Store Rejection / Auto-Timeout Fine (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                  <Input
                    type="number"
                    min="0"
                    value={editableRules?.penalties?.storeRejection ?? "150"}
                    onChange={(e) => updateField("penalties.storeRejection", e.target.value)}
                    className="bg-white border-rose-300 text-rose-950 font-black text-sm pl-7 shadow-2xs"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Deducted from partner next settlement if order ignored &gt; 15 mins.</p>
              </div>

              <div className="space-y-1.5 bg-rose-50/50 p-4 rounded-2xl border border-rose-200">
                <Label className="text-xs font-black text-rose-950">Rider Mid-Trip Rejection Fine (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                  <Input
                    type="number"
                    min="0"
                    value={editableRules?.penalties?.riderCancel ?? "75"}
                    onChange={(e) => updateField("penalties.riderCancel", e.target.value)}
                    className="bg-white border-rose-300 text-rose-950 font-black text-sm pl-7 shadow-2xs"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Deducted from rider float if trip cancelled after acceptance.</p>
              </div>

              <div className="space-y-1.5 bg-rose-50/50 p-4 rounded-2xl border border-rose-200">
                <Label className="text-xs font-black text-rose-950">Customer Late Cancellation Fee (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                  <Input
                    type="number"
                    min="0"
                    value={editableRules?.penalties?.customerLateCancel ?? "50"}
                    onChange={(e) => updateField("penalties.customerLateCancel", e.target.value)}
                    className="bg-white border-rose-300 text-rose-950 font-black text-sm pl-7 shadow-2xs"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Charged if cancelled after rider has reached location.</p>
              </div>

              <div className="space-y-1.5 bg-zinc-50/80 p-4 rounded-2xl border border-zinc-200">
                <Label className="text-xs font-bold text-zinc-800">Damaged Item Max Liability Multiplier (x)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editableRules?.penalties?.damageMultiplier ?? "5.0"}
                  onChange={(e) => updateField("penalties.damageMultiplier", e.target.value)}
                  className="bg-white border-zinc-300 font-bold text-xs shadow-2xs"
                />
                <p className="text-[10px] text-zinc-500">Up to 5x service fee or maximum item invoice proof.</p>
              </div>

              <div className="space-y-1.5 bg-zinc-50/80 p-4 rounded-2xl border border-zinc-200">
                <Label className="text-xs font-bold text-zinc-800">Customer Doorstep No-Show Fee (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                  <Input
                    type="number"
                    min="0"
                    value={editableRules?.penalties?.doorstepNoShow ?? "60"}
                    onChange={(e) => updateField("penalties.doorstepNoShow", e.target.value)}
                    className="bg-white border-zinc-300 font-bold text-xs pl-7 shadow-2xs"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Paid to rider if customer unreachable &gt; 15 mins.</p>
              </div>

              <div className="space-y-1.5 bg-zinc-50/80 p-4 rounded-2xl border border-zinc-200">
                <Label className="text-xs font-bold text-zinc-800">Partner Late Handover Slab (₹/hr)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">₹</span>
                  <Input
                    type="number"
                    min="0"
                    value={editableRules?.penalties?.lateHandoverPerHr ?? "30"}
                    onChange={(e) => updateField("penalties.lateHandoverPerHr", e.target.value)}
                    className="bg-white border-zinc-300 font-bold text-xs pl-7 shadow-2xs"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Surcharge for orders delivered past turnaround promise.</p>
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
              <p className="text-xs text-zinc-500">Record of all rule updates published across operational hubs</p>
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

      {/* =========================================================================
          DIALOG 1: ALL-AREAS PRICING & COMMERCIALS MATRIX
         ========================================================================= */}
      <Dialog open={isMatrixModalOpen} onOpenChange={setIsMatrixModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[88vh] overflow-y-auto rounded-3xl p-6 bg-white">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Globe className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-zinc-950">
                    Pan-India Operational Hubs &amp; Area Pricing Matrix
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500">
                    Compare base delivery fees, per-km rates, partner commission &amp; rider pay across all areas
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {/* Search Filter */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2.5 size-4 text-zinc-400" />
                <Input
                  placeholder="Search by city or area name..."
                  value={matrixSearchQuery}
                  onChange={(e) => setMatrixSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9 bg-zinc-50 border-zinc-200"
                />
              </div>

              <Button
                onClick={() => {
                  setIsMatrixModalOpen(false);
                  setIsAddAreaModalOpen(true);
                }}
                className="h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Add Area Override</span>
              </Button>
            </div>

            {/* Matrix Table */}
            <div className="rounded-2xl border border-zinc-200 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-100/80 text-zinc-700 font-bold uppercase text-[10px] border-b border-zinc-200">
                  <tr>
                    <th className="p-3">City &amp; Area</th>
                    <th className="p-3">Scope Status</th>
                    <th className="p-3">Customer Delivery</th>
                    <th className="p-3">Free Delivery $\ge$</th>
                    <th className="p-3">Partner Comm.</th>
                    <th className="p-3">Rider Base &amp; /km</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {/* National Master Row */}
                  <tr className="bg-emerald-50/40 font-medium">
                    <td className="p-3 font-bold text-emerald-950">
                      🇮🇳 All India (National Master)
                    </td>
                    <td className="p-3">
                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-[9px]">
                        Default Baseline
                      </Badge>
                    </td>
                    <td className="p-3 font-bold">
                      ₹{editableRules?.delivery?.baseFee ?? "29"} (+₹{editableRules?.delivery?.perKmRate ?? "8"}/km)
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      ₹{editableRules?.delivery?.freeDeliveryThreshold ?? "149"}
                    </td>
                    <td className="p-3 font-bold">
                      {100 - (Number(editableRules?.commission?.partnerPayoutPercent) || 85)}%
                    </td>
                    <td className="p-3 font-bold">
                      ₹{editableRules?.riderPayout?.basePay ?? "35"} (+₹{editableRules?.riderPayout?.perKmRate ?? "8"}/km)
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedScope("NATIONAL_MASTER");
                          setIsMatrixModalOpen(false);
                        }}
                        className="h-7 text-[11px] font-bold border-zinc-300 rounded-lg cursor-pointer"
                      >
                        Edit Master
                      </Button>
                    </td>
                  </tr>

                  {/* Operational Areas Rows */}
                  {allOperationalAreas
                    .filter((item) =>
                      matrixSearchQuery
                        ? item.city.toLowerCase().includes(matrixSearchQuery.toLowerCase()) ||
                          item.area.toLowerCase().includes(matrixSearchQuery.toLowerCase())
                        : true
                    )
                    .map((item) => {
                      const override = (editableRules?.delivery?.cityAreaPricing || []).find(
                        (p: any) =>
                          p.city?.toLowerCase() === item.city?.toLowerCase() &&
                          p.area?.toLowerCase() === item.area?.toLowerCase()
                      );
                      const hasOverride = Boolean(override);

                      return (
                        <tr key={item.key} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-zinc-900">{item.area}</span>
                            <span className="text-[10px] text-zinc-500 block">{item.city}</span>
                          </td>

                          <td className="p-3">
                            {hasOverride ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-black text-[9px]">
                                Custom Override
                              </Badge>
                            ) : (
                              <Badge className="bg-zinc-100 text-zinc-700 font-medium text-[9px]">
                                Inherits Default
                              </Badge>
                            )}
                          </td>

                          <td className="p-3 font-bold">
                            ₹{override?.baseFee ?? (editableRules?.delivery?.baseFee ?? "29")}{" "}
                            <span className="text-[10px] text-zinc-500 font-normal">
                              (+₹{override?.perKmRate ?? (editableRules?.delivery?.perKmRate ?? "8")}/km)
                            </span>
                          </td>

                          <td className="p-3 font-bold text-emerald-700">
                            ₹{override?.freeDeliveryThreshold ?? (editableRules?.delivery?.freeDeliveryThreshold ?? "149")}
                          </td>

                          <td className="p-3 font-bold">
                            {override?.partnerCommissionPercent ??
                              (100 - (Number(editableRules?.commission?.partnerPayoutPercent) || 85))}%
                          </td>

                          <td className="p-3 font-bold">
                            ₹{override?.riderBasePay ?? (editableRules?.riderPayout?.basePay ?? "35")}{" "}
                            <span className="text-[10px] text-zinc-500 font-normal">
                              (+₹{override?.riderPerKmRate ?? (editableRules?.riderPayout?.perKmRate ?? "8")}/km)
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedScope(item.key);
                                  setIsMatrixModalOpen(false);
                                }}
                                className="h-7 text-[11px] font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg cursor-pointer"
                              >
                                Configure
                              </Button>

                              {hasOverride && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteAreaOverrideById(override.id)}
                                  className="size-7 text-zinc-400 hover:text-rose-600 rounded-md cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DIALOG 2: ADD NEW OPERATIONAL AREA OVERRIDE
         ========================================================================= */}
      <Dialog open={isAddAreaModalOpen} onOpenChange={setIsAddAreaModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-zinc-950">
              Create New Operational Area Override
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Configure specialized delivery pricing and commissions for a city sector or zone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-800">Operating City</Label>
              <Select value={newAreaCity} onValueChange={setNewAreaCity}>
                <SelectTrigger className="text-xs h-9 bg-zinc-50">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kasganj">Kasganj (Uttar Pradesh)</SelectItem>
                  <SelectItem value="New Delhi">New Delhi (Delhi NCR)</SelectItem>
                  <SelectItem value="Aligarh">Aligarh (Uttar Pradesh)</SelectItem>
                  <SelectItem value="Bareilly">Bareilly (Uttar Pradesh)</SelectItem>
                  <SelectItem value="Agra">Agra (Uttar Pradesh)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-800">Area / Sector Name</Label>
              <Input
                placeholder="e.g. Nadarrai Gate / Rohini Sector 7"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                className="text-xs h-9 bg-zinc-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800">Customer Base Fee (₹)</Label>
                <Input
                  type="number"
                  value={newAreaBaseFee}
                  onChange={(e) => setNewAreaBaseFee(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800">Per KM Rate (₹/km)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={newAreaPerKm}
                  onChange={(e) => setNewAreaPerKm(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800">Free Delivery Above (₹)</Label>
                <Input
                  type="number"
                  value={newAreaFreeDelivery}
                  onChange={(e) => setNewAreaFreeDelivery(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800">Partner Commission (%)</Label>
                <Input
                  type="number"
                  value={newAreaCommission}
                  onChange={(e) => setNewAreaCommission(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800">Rider Base Tariff (₹)</Label>
                <Input
                  type="number"
                  value={newAreaRiderBase}
                  onChange={(e) => setNewAreaRiderBase(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-800">Rider Extra KM (₹/km)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={newAreaRiderPerKm}
                  onChange={(e) => setNewAreaRiderPerKm(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <Button
                variant="outline"
                onClick={() => setIsAddAreaModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNewAreaFromDialog}
                className="text-xs h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                Create Area Override
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
