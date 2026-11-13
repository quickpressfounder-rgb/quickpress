import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CloudRain,
  Moon,
  Truck,
  IndianRupee,
  Sparkles,
  Zap,
  Save,
  Check,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Tag,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { updateFinancialRules, type FinancialRules } from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";

interface KasganjPilotQuickBarProps {
  currentRules?: FinancialRules;
  onNavigateToRulesTab?: () => void;
}

export function KasganjPilotQuickBar({
  currentRules,
  onNavigateToRulesTab,
}: KasganjPilotQuickBarProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  // Local state for fast operational adjustments
  const [rainSurgeActive, setRainSurgeActive] = useState<boolean>(false);
  const [nightSurgeActive, setNightSurgeActive] = useState<boolean>(false);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(149);
  const [minOrderValue, setMinOrderValue] = useState<number>(99);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(30);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize from live server rules
  useEffect(() => {
    if (currentRules) {
      const rain = (currentRules.delivery?.rainSurge ?? 0) > 0;
      const night = (currentRules.delivery?.nightSurge ?? 0) > 0;
      const threshold = currentRules.delivery?.freeDeliveryThreshold ?? 149;
      const minVal = currentRules.pricing?.minimumOrderValue ?? 99;
      const baseFee = currentRules.delivery?.baseFee ?? 30;

      setRainSurgeActive(rain);
      setNightSurgeActive(night);
      setFreeDeliveryThreshold(threshold);
      setMinOrderValue(minVal);
      setBaseDeliveryFee(baseFee);
      setIsDirty(false);
    }
  }, [currentRules]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!currentRules) return;
      const updatedRules: Partial<FinancialRules> = {
        ...currentRules,
        delivery: {
          ...currentRules.delivery,
          rainSurge: rainSurgeActive ? 15 : 0,
          nightSurge: nightSurgeActive ? 20 : 0,
          freeDeliveryThreshold: Number(freeDeliveryThreshold) || 149,
          baseFee: Number(baseDeliveryFee) || 30,
        },
        pricing: {
          ...currentRules.pricing,
          minimumOrderValue: Number(minOrderValue) || 99,
        },
      };

      return await updateFinancialRules(
        updatedRules,
        `Quick Control: Rain=${rainSurgeActive}, Night=${nightSurgeActive}, FreeDelivery=₹${freeDeliveryThreshold}, MinOrder=₹${minOrderValue}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", "rules"] });
      queryClient.invalidateQueries({ queryKey: ["finance", "summary"] });
      setIsDirty(false);
      toast.success("Kasganj Pilot Rates successfully broadcasted to live apps!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update pilot rates");
    },
  });

  return (
    <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-2xs overflow-hidden transition-all">
      {/* Quick Action Ribbon (Always Visible) */}
      <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Pilot Status & Badges */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Sliders className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-zinc-950 uppercase tracking-wide">
                Kasganj Pilot Quick Controls
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                Hub: 207123
              </Badge>
              {isDirty && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                  Unsaved Live Overrides
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Instant toggles for weather surcharges, delivery thresholds, and live checkout rules
            </p>
          </div>
        </div>

        {/* Center: High-Frequency Quick Toggles */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* Rain Surge Toggle */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              rainSurgeActive
                ? "bg-sky-50/80 border-sky-300 text-sky-950"
                : "bg-zinc-50 border-zinc-200 text-zinc-600"
            }`}
          >
            <CloudRain
              className={`size-4 ${rainSurgeActive ? "text-sky-600 animate-bounce" : "text-zinc-400"}`}
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase leading-tight">Rain Surge (+₹15)</span>
              <span className="text-[9px] font-bold text-zinc-500">
                {rainSurgeActive ? "Active on Checkout" : "Standard Fare"}
              </span>
            </div>
            <Switch
              checked={rainSurgeActive}
              onCheckedChange={(checked) => {
                setRainSurgeActive(checked);
                setIsDirty(true);
              }}
              className="ml-1 data-[state=checked]:bg-sky-600"
            />
          </div>

          {/* Night Surge Toggle */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              nightSurgeActive
                ? "bg-purple-50/80 border-purple-300 text-purple-950"
                : "bg-zinc-50 border-zinc-200 text-zinc-600"
            }`}
          >
            <Moon className={`size-4 ${nightSurgeActive ? "text-purple-600" : "text-zinc-400"}`} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase leading-tight">Night Surge (+₹20)</span>
              <span className="text-[9px] font-bold text-zinc-500">
                {nightSurgeActive ? "Active (10 PM - 6 AM)" : "Standard Fare"}
              </span>
            </div>
            <Switch
              checked={nightSurgeActive}
              onCheckedChange={(checked) => {
                setNightSurgeActive(checked);
                setIsDirty(true);
              }}
              className="ml-1 data-[state=checked]:bg-purple-600"
            />
          </div>

          {/* Free Delivery Threshold Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
            <Truck className="size-3.5 text-emerald-600" />
            <span className="text-[10px] font-black text-zinc-500 uppercase">Free Delivery ≥</span>
            <span className="text-xs font-black text-zinc-950 tabular-nums">
              ₹{freeDeliveryThreshold}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold gap-1 text-zinc-700"
          >
            <span>{isExpanded ? "Hide Details" : "Quick Adjust"}</span>
            {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>

          {isDirty && (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
            >
              <Save className="size-3.5" />
              <span>{saveMutation.isPending ? "Broadcasting..." : "Save Live"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Adjustments Panel */}
      {isExpanded && (
        <div className="p-4 bg-zinc-50/70 border-t border-zinc-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Free Delivery Preset Selector */}
            <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                Free Delivery Order Threshold
              </label>
              <div className="flex items-center gap-1.5">
                {[99, 149, 199, 249].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setFreeDeliveryThreshold(val);
                      setIsDirty(true);
                    }}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      freeDeliveryThreshold === val
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-zinc-400 block">
                Orders above ₹{freeDeliveryThreshold} get ₹0 delivery fee
              </span>
            </div>

            {/* Minimum Order Value */}
            <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                Minimum Order Basket (₹)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={10}
                  value={minOrderValue}
                  onChange={(e) => {
                    setMinOrderValue(Number(e.target.value) || 0);
                    setIsDirty(true);
                  }}
                  className="h-8 text-xs font-bold tabular-nums"
                />
                <span className="text-xs text-zinc-500 font-bold shrink-0">INR</span>
              </div>
              <span className="text-[10px] text-zinc-400 block">
                Checkout blocked below ₹{minOrderValue}
              </span>
            </div>

            {/* Base Delivery Fee */}
            <div className="p-3 bg-white rounded-xl border border-zinc-200 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                Base Delivery Fee (First 2 KM)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={baseDeliveryFee}
                  onChange={(e) => {
                    setBaseDeliveryFee(Number(e.target.value) || 0);
                    setIsDirty(true);
                  }}
                  className="h-8 text-xs font-bold tabular-nums"
                />
                <span className="text-xs text-zinc-500 font-bold shrink-0">INR</span>
              </div>
              <span className="text-[10px] text-zinc-400 block">
                ₹10/km for distance beyond 2 km
              </span>
            </div>

            {/* Live Kasganj Core Tariffs Summary */}
            <div className="p-3 bg-white rounded-xl border border-zinc-200 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                Kasganj Standard Tariffs
              </span>
              <div className="space-y-1 text-xs font-bold text-zinc-800 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Wash & Fold:</span>
                  <span className="text-emerald-700">₹49 / kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Steam Iron:</span>
                  <span className="text-emerald-700">₹9 / pc</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Dry Clean:</span>
                  <span className="text-emerald-700">₹149 / pc</span>
                </div>
              </div>
              {onNavigateToRulesTab && (
                <button
                  type="button"
                  onClick={onNavigateToRulesTab}
                  className="text-[10px] text-emerald-700 font-black hover:underline mt-2 text-left cursor-pointer"
                >
                  Edit Full Rules Matrix →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
