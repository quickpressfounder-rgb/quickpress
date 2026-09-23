import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Save,
  Building2,
  DollarSign,
  ShieldCheck,
  Zap,
  Lock,
  Sparkles,
  Percent,
  Truck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Key,
  HelpCircle,
  CloudRain,
  CalendarClock,
  Gift,
  FileText,
  ShieldAlert,
  Flame,
  Receipt,
  Layers,
  ChevronRight,
  ArrowUpRight,
  Cpu,
  Info,
  Check,
  Calculator,
  Search,
  ExternalLink,
  Globe2,
  MapPin,
  Store,
  Loader2,
  Compass,
  MessageSquare,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { AdminShell } from "../components/AdminShell";
import {
  changeAdminPin,
  fetchSecurityEvents,
  fetchSettings,
  fetchSettingsScopes,
  saveSettings,
  unlockClientIp,
  type AdminSettings,
  type ScopeOption,
} from "../api/settings";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { cn } from "@/shared/lib/utils";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Platform & Enterprise Governance",
      "Configure nationwide pricing rules, monsoon surge, capacity throttle, referral limits, tax invoicing, and operational safety."
    ),
  component: SettingsPage,
});

// Category Definition for the Left Navigation
const SETTINGS_CATEGORIES = [
  {
    id: "logistics",
    title: "Logistics & Fees",
    subtitle: "Delivery & Thresholds",
    icon: Truck,
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  {
    id: "dispatch",
    title: "Fleet Dispatch & Geofence",
    subtitle: "Auto-Assign & 250m Guard",
    icon: Compass,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    gradient: "from-purple-500/10 to-indigo-500/10",
  },
  {
    id: "surge",
    title: "Monsoon & Surge",
    subtitle: "Weather & Rush Pricing",
    icon: CloudRain,
    badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
    gradient: "from-sky-500/10 to-blue-500/10",
  },
  {
    id: "slots",
    title: "Slots & Capacity",
    subtitle: "Windows & Speed Multipliers",
    icon: CalendarClock,
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    gradient: "from-indigo-500/10 to-violet-500/10",
  },
  {
    id: "referral",
    title: "Referral & Wallet",
    subtitle: "Cashback & Burn Limits",
    icon: Gift,
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    gradient: "from-purple-500/10 to-pink-500/10",
  },
  {
    id: "finance",
    title: "Taxes & Commission",
    subtitle: "GST % & Store Settlement",
    icon: DollarSign,
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    gradient: "from-amber-500/10 to-yellow-500/10",
  },
  {
    id: "compliance",
    title: "SAC 998813 Invoice",
    subtitle: "GST Law & Section 194C",
    icon: FileText,
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    gradient: "from-teal-500/10 to-emerald-500/10",
  },
  {
    id: "safety",
    title: "Fraud & Safety",
    subtitle: "Dual OTP & Anti-Spoofing",
    icon: ShieldAlert,
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    gradient: "from-rose-500/10 to-red-500/10",
  },
  {
    id: "operations",
    title: "Operations Mode",
    subtitle: "Emergency & Onboarding",
    icon: Cpu,
    badgeColor: "bg-zinc-100 text-zinc-800 border-zinc-200",
    gradient: "from-zinc-500/10 to-slate-500/10",
  },
  {
    id: "security",
    title: "Security & PIN",
    subtitle: "Passcode & Audit Logs",
    icon: Lock,
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    gradient: "from-slate-500/10 to-zinc-500/10",
  },
];

export function SettingsPage() {
  const [selectedScopeId, setSelectedScopeId] = useState<string>("global");

  const scopesQuery = useQuery({ queryKey: ["admin", "settings-scopes"], queryFn: fetchSettingsScopes });

  const settings = useQuery({
    queryKey: ["admin", "settings", selectedScopeId],
    queryFn: () => {
      const scope = selectedScopeId === "global" ? "global" : "city";
      const cityId = selectedScopeId === "global" ? undefined : selectedScopeId;
      return fetchSettings(scope, cityId);
    },
  });

  const securityEvents = useQuery({ queryKey: ["admin", "security-events"], queryFn: fetchSecurityEvents });

  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [activeTab, setActiveTab] = useState<string>("logistics");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Interactive Live Simulator states
  const [simCartValue, setSimCartValue] = useState<number>(450);
  const [simInvoiceValue, setSimInvoiceValue] = useState<number>(1000);

  // Passcode update state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);

  // Track if changes are dirty
  const isDirty = useMemo(() => {
    if (!draft || !settings.data) return false;
    return JSON.stringify(draft) !== JSON.stringify(settings.data);
  }, [draft, settings.data]);

  const saveMutation = useMutation({
    mutationFn: (settingsData: AdminSettings) => {
      const scope = selectedScopeId === "global" ? "global" : "city";
      return saveSettings(
        selectedScopeId === "global"
          ? { settings: settingsData, scope }
          : { settings: settingsData, scope, cityId: selectedScopeId }
      );
    },
    onSuccess: () => {
      const currentScope = (scopesQuery.data || []).find((s) => s.id === selectedScopeId);
      const scopeName = currentScope ? currentScope.name : "Platform";
      toast.success(`Platform settings saved and synced live for ${scopeName}! 🎉`);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
      settings.refetch();
      void scopesQuery.refetch();
    },
    onError: () => {
      toast.error("Failed to persist settings.");
    },
  });

  const pinMutation = useMutation({
    mutationFn: async () => {
      if (newPin !== confirmPin) throw new Error("New Passcode and Confirm Passcode do not match.");
      if (newPin.length < 4) throw new Error("Passcode must be at least 4 digits.");
      return changeAdminPin(currentPin, newPin);
    },
    onSuccess: (res) => {
      toast.success(res.message || "Admin Security Passcode updated successfully!");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      void securityEvents.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update passcode.");
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (ip: string) => unlockClientIp(ip),
    onSuccess: (res) => {
      toast.success(res.message);
      void securityEvents.refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to unlock IP.");
    },
  });

  // Keyboard shortcut for Cmd+S / Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (draft && !saveMutation.isPending) {
          saveMutation.mutate(draft);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draft, saveMutation]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchFilter.trim()) return SETTINGS_CATEGORIES;
    const q = searchFilter.toLowerCase();
    return SETTINGS_CATEGORIES.filter(
      (c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q) || c.id.includes(q)
    );
  }, [searchFilter]);

  const selectedScope = (scopesQuery.data || []).find((s) => s.id === selectedScopeId);

  if (!draft) {
    return (
      <AdminShell title="Platform & Business Settings" subtitle="Loading platform settings...">
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="size-10 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Syncing settings repository...</p>
        </div>
      </AdminShell>
    );
  }

  const activeCategory = (SETTINGS_CATEGORIES.find((c) => c.id === activeTab) || SETTINGS_CATEGORIES[0])!;

  return (
    <AdminShell
      title="Platform & Enterprise Settings"
      subtitle="Nationwide business rules, dynamic monsoon surge, slot capacity, tax compliance, and fraud defenses."
      actions={
        <div className="flex items-center gap-2.5">
          {/* Quick Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-black">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Live Sync Active</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={!isDirty}
            className={cn(
              "h-9 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-all",
              !isDirty && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => {
              if (settings.data) setDraft(structuredClone(settings.data));
              toast.info("Reset form to current database values");
            }}
          >
            <RotateCcw className="size-3.5 mr-1" /> Reset
          </Button>

          <Button
            size="sm"
            className={cn(
              "h-9 rounded-xl font-bold text-xs px-5 shadow-sm cursor-pointer transition-all flex items-center gap-1.5",
              justSaved
                ? "bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/30"
                : isDirty
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 shadow-md ring-2 ring-emerald-500/20 animate-pulse"
                : "bg-zinc-900 hover:bg-zinc-800 text-white"
            )}
            disabled={saveMutation.isPending}
            onClick={() => {
              if (draft) saveMutation.mutate(draft);
            }}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-white" />
                <span>Saving to Cloud...</span>
              </>
            ) : justSaved ? (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-300" />
                <span>Saved Live!</span>
              </>
            ) : isDirty ? (
              <>
                <Save className="size-3.5 text-white" />
                <span>Save Changes (⌘S)</span>
              </>
            ) : (
              <>
                <Save className="size-3.5 text-zinc-300" />
                <span>Save Settings</span>
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-20">
        {/* =========================================================================
            0. ENTERPRISE MULTI-TIER CITY & AREA SCOPE SELECTOR HUD
        ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xs backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "size-10 rounded-xl flex items-center justify-center border shadow-xs transition-all",
                selectedScopeId === "global"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}
            >
              {selectedScopeId === "global" ? <Globe2 className="size-5" /> : <MapPin className="size-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Configuration Hierarchy Scope</span>
                {selectedScopeId === "global" ? (
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[9px] font-black uppercase">
                    Nationwide Master Default
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                    City Override Scope
                  </span>
                )}
              </div>
              <p className="text-sm font-black text-zinc-900 mt-0.5 flex items-center gap-2">
                <span>{selectedScope?.name || "Global Platform"}</span>
                {selectedScope?.state && <span className="text-xs font-medium text-zinc-500">• {selectedScope.state}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Label className="text-xs font-bold text-zinc-600 hidden sm:inline">Active Territory Scope:</Label>
            <Select value={selectedScopeId} onValueChange={(val) => setSelectedScopeId(val)}>
              <SelectTrigger className="h-10 min-w-[280px] rounded-xl text-xs font-bold bg-zinc-50 border-zinc-200 cursor-pointer">
                <SelectValue placeholder="Select Territory Scope..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl">
                <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">Master Level</div>
                <SelectItem value="global" className="cursor-pointer font-bold text-xs py-2">
                  🌐 Global Platform Defaults (Nationwide)
                </SelectItem>
                <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-t border-zinc-100 mt-1">
                  City & Territory Overrides
                </div>
                {(scopesQuery.data || [])
                  .filter((s) => s.id !== "global")
                  .map((scope) => (
                    <SelectItem key={scope.id} value={scope.id} className="cursor-pointer text-xs py-2">
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-bold">🏙️ {scope.name}</span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {scope.hasOverride ? "• Custom Override" : `• ${scope.state || "Active"}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* City Override Active Advisory */}
        {selectedScopeId !== "global" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <MapPin className="size-4 text-emerald-700 shrink-0" />
              <span>
                You are currently viewing & configuring settings for <strong>{selectedScope?.name}</strong>. Values saved here take highest priority for customers and delivery captains in this region.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedScopeId("global")}
              className="h-7 text-[11px] font-bold rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer shrink-0"
            >
              Switch to Global Default
            </Button>
          </div>
        )}

        {/* =========================================================================
            1. TOP HIGH-IMPACT TELEMETRY HUD (6 STAT CARDS)
        ========================================================================= */}
        <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-6">
          {/* Card 1: Logistics & Min Cart */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-emerald-300 hover:shadow-md">
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Min Cart Value</span>
              <div className="size-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                <Truck className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg font-black text-zinc-900 truncate">₹{draft.business.minimumOrderValue}</p>
            <div className="mt-2 text-[10px] text-zinc-400 font-medium truncate">Base Delivery: ₹{draft.business.deliveryFee}</div>
          </div>

          {/* Card 2: Monsoon Surge */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-sky-300 hover:shadow-md">
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-500 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Monsoon Surge</span>
              <div
                className={cn(
                  "size-7 rounded-xl flex items-center justify-center border",
                  draft.surge.enabled ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-zinc-50 text-zinc-400 border-zinc-200"
                )}
              >
                <CloudRain className="size-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <p className="text-lg font-black text-zinc-900">
                {draft.surge.enabled ? `+₹${draft.surge.rainSurgeFee}` : "Standard"}
              </p>
              {draft.surge.enabled && (
                <span className="px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[9px] font-black uppercase">
                  LIVE
                </span>
              )}
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 font-medium truncate">
              {draft.surge.enabled ? `+${draft.surge.etaDelayMinutes}m rain delay` : "Normal weather rules"}
            </div>
          </div>

          {/* Card 3: Platform Cut */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-emerald-300 hover:shadow-md">
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Commission</span>
              <div className="size-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
                <Percent className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg font-black text-zinc-900">{draft.finance.defaultCommission}%</p>
            <div className="mt-2 text-[10px] text-zinc-400 font-medium truncate">Per store order settlement</div>
          </div>

          {/* Card 4: SAC Invoicing */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-indigo-300 hover:shadow-md">
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Tax & SAC Code</span>
              <div className="size-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200/60">
                <FileText className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg font-black text-zinc-900 font-mono">{draft.compliance.sacCode || "998813"}</p>
            <div className="mt-2 text-[10px] text-zinc-400 font-medium truncate">GST: {draft.finance.gstPercent}% Laundry</div>
          </div>

          {/* Card 5: Referral Reward */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-purple-300 hover:shadow-md">
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Referral Reward</span>
              <div className="size-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200/60">
                <Gift className="size-3.5" />
              </div>
            </div>
            <p className="mt-2 text-lg font-black text-zinc-900">₹{draft.referral.referrerReward}</p>
            <div className="mt-2 text-[10px] text-zinc-400 font-medium truncate">
              Max {draft.referral.maxWalletUsagePercent}% wallet burn
            </div>
          </div>

          {/* Card 6: Operations Health */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-amber-300 hover:shadow-md">
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-emerald-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">System State</span>
              <div
                className={cn(
                  "size-7 rounded-xl flex items-center justify-center border",
                  draft.business.maintenanceMode
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}
              >
                {draft.business.maintenanceMode ? <AlertTriangle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
              </div>
            </div>
            <p className="mt-2 text-lg font-black text-zinc-900 truncate">
              {draft.business.maintenanceMode ? "Maintenance" : "● Operational"}
            </p>
            <div className="mt-2 text-[10px] text-zinc-400 font-medium truncate">
              {draft.business.maintenanceMode ? "Customer checkout paused" : "All Gateways Active"}
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. MAIN DUAL-PANE ENTERPRISE CONSOLE
        ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* -------------------------------------------------------------
              LEFT COLUMN: ENGINE SELECTOR NAVIGATION (4 COLS)
          ------------------------------------------------------------- */}
          <div className="lg:col-span-4 space-y-3 sticky top-6">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-xs space-y-2">
              {/* Category Search Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <Input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter engine settings..."
                  className="h-9 pl-9 pr-3 text-xs bg-zinc-50/50 border-zinc-200 rounded-xl focus:bg-white"
                />
              </div>

              {/* Navigation List */}
              <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                {filteredCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = activeTab === cat.id;

                  // Dynamic tag indicator
                  let tag = "";
                  if (cat.id === "surge" && draft.surge.enabled) tag = "ACTIVE";
                  if (cat.id === "compliance") tag = "SAC 998813";
                  if (cat.id === "slots") tag = `${draft.slots.express24hMultiplier}x Express`;
                  if (cat.id === "referral") tag = `₹${draft.referral.referrerReward}`;
                  if (cat.id === "finance") tag = `${draft.finance.gstPercent}% GST`;
                  if (cat.id === "safety" && draft.safety.mockGpsGuard) tag = "Anti-Spoof";
                  if (cat.id === "operations" && draft.business.maintenanceMode) tag = "PAUSED";

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer group",
                        isSelected
                          ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10"
                          : "text-zinc-700 hover:bg-zinc-100/80"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "size-8 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                            isSelected
                              ? "bg-zinc-800 text-white border-zinc-700"
                              : cn(cat.badgeColor, "group-hover:scale-105")
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className={cn("text-xs font-bold leading-none", isSelected ? "text-white" : "text-zinc-900")}>
                            {cat.title}
                          </p>
                          <p className={cn("text-[10px] mt-1 line-clamp-1", isSelected ? "text-zinc-400" : "text-zinc-500")}>
                            {cat.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {tag && (
                          <span
                            className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                              isSelected
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                            )}
                          >
                            {tag}
                          </span>
                        )}
                        <ChevronRight
                          className={cn(
                            "size-3.5 transition-transform",
                            isSelected ? "text-emerald-400 translate-x-0.5" : "text-zinc-400 opacity-0 group-hover:opacity-100"
                          )}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Engine Summary Card */}
            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                <Sparkles className="size-4 text-emerald-600" />
                <span>Enterprise Core Guarantee</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Settings update atomically in database. All customer carts, rider algorithms, and partner payouts recalculate immediately upon save for <strong>{selectedScope?.name}</strong>.
              </p>
            </div>
          </div>

          {/* -------------------------------------------------------------
              RIGHT COLUMN: ACTIVE ENGINE CONFIGURATION CANVAS (8 COLS)
          ------------------------------------------------------------- */}
          <div className="lg:col-span-8 space-y-5">
            {/* Engine Hero Header Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs">
              <div className={cn("absolute inset-0 bg-gradient-to-r opacity-50 pointer-events-none", activeCategory.gradient)} />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={cn("size-12 rounded-2xl flex items-center justify-center border shadow-xs", activeCategory.badgeColor)}>
                    <activeCategory.icon className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-zinc-900">{activeCategory.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {selectedScopeId === "global" ? "Global Scope" : `City Scope: ${selectedScope?.name}`}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{activeCategory.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                  <Clock className="size-3.5 text-zinc-400" />
                  <span>Real-time Sync</span>
                </div>
              </div>
            </div>

            {/* =====================================================================
                TAB 2: LOGISTICS, DELIVERY FEES & CART THRESHOLDS
            ===================================================================== */}
            {activeTab === "logistics" && (
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-6">
                <div>
                  <h4 className="text-sm font-black text-zinc-900">Doorstep Logistics & Minimum Order Values</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Controls customer checkout eligibility, free delivery incentives, and handling surcharges for <strong>{selectedScope?.name}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/60">
                    <Label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                      <span>Minimum Order Checkout Amount</span>
                      <span className="text-emerald-700 font-mono text-[11px] font-black">₹{draft.business.minimumOrderValue}</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                      <Input
                        type="number"
                        value={draft.business.minimumOrderValue}
                        onChange={(e) =>
                          setDraft((p) => (p ? { ...p, business: { ...p.business, minimumOrderValue: e.target.value } } : null))
                        }
                        className="h-10 pl-7 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400">Customer cart cannot checkout below this subtotal threshold</p>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/60">
                    <Label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                      <span>Standard Doorstep Delivery Fee</span>
                      <span className="text-blue-700 font-mono text-[11px] font-black">₹{draft.business.deliveryFee}</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                      <Input
                        type="number"
                        value={draft.business.deliveryFee}
                        onChange={(e) =>
                          setDraft((p) => (p ? { ...p, business: { ...p.business, deliveryFee: e.target.value } } : null))
                        }
                        className="h-10 pl-7 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400">Base delivery fee added to carts below free threshold</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/60">
                    <Label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                      <span>Free Delivery Threshold</span>
                      <span className="text-purple-700 font-mono text-[11px] font-black">₹{draft.business.freeDeliveryAbove || "499"}</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                      <Input
                        type="number"
                        value={draft.business.freeDeliveryAbove || "499"}
                        onChange={(e) =>
                          setDraft((p) => (p ? { ...p, business: { ...p.business, freeDeliveryAbove: e.target.value } } : null))
                        }
                        className="h-10 pl-7 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400">Carts exceeding this value get automatic 100% free delivery</p>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/60">
                    <Label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                      <span>Garment Protective Handling Fee</span>
                      <span className="text-amber-700 font-mono text-[11px] font-black">₹{draft.business.handlingFee}</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                      <Input
                        type="number"
                        value={draft.business.handlingFee}
                        onChange={(e) =>
                          setDraft((p) => (p ? { ...p, business: { ...p.business, handlingFee: e.target.value } } : null))
                        }
                        className="h-10 pl-7 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400">Garment sanitization bag and laundry hanger fee</p>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 3: MONSOON & SURGE PRICING ENGINE + INTERACTIVE SIMULATOR
            ===================================================================== */}
            {activeTab === "surge" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-sky-950 flex items-center gap-2">
                        <CloudRain className="size-5 text-sky-600" />
                        <span>Monsoon & Bad Weather Dynamic Surcharge</span>
                      </h4>
                      <p className="text-xs text-sky-700">
                        Compensates delivery captains in <strong>{selectedScope?.name}</strong> during heavy downpour and manages rider fleet retention.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-sky-950">
                        {draft.surge.enabled ? "SURGE ACTIVE" : "SURGE DISABLED"}
                      </span>
                      <Switch
                        checked={Boolean(draft.surge.enabled)}
                        onCheckedChange={(checked) =>
                          setDraft((p) =>
                            p ? { ...p, surge: { ...p.surge, enabled: checked } } : null
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-sky-200/80">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-sky-950">Rain Surcharge Fee</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                        <Input
                          type="number"
                          value={draft.surge.rainSurgeFee}
                          onChange={(e) =>
                            setDraft((p) =>
                              p ? { ...p, surge: { ...p.surge, rainSurgeFee: e.target.value } } : null
                            )
                          }
                          className="h-10 pl-7 text-xs font-mono font-bold bg-white"
                        />
                      </div>
                      <p className="text-[10px] text-sky-700">Flat rider compensation fee</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-sky-950">Peak Rush Surge</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                        <Input
                          type="number"
                          value={draft.surge.peakSurgeFee}
                          onChange={(e) =>
                            setDraft((p) =>
                              p ? { ...p, surge: { ...p.surge, peakSurgeFee: e.target.value } } : null
                            )
                          }
                          className="h-10 pl-7 text-xs font-mono font-bold bg-white"
                        />
                      </div>
                      <p className="text-[10px] text-sky-700">Festival & holiday demand surcharge</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-sky-950">ETA Delay Buffer</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={draft.surge.etaDelayMinutes}
                          onChange={(e) =>
                            setDraft((p) =>
                              p ? { ...p, surge: { ...p.surge, etaDelayMinutes: e.target.value } } : null
                            )
                          }
                          className="h-10 pr-12 text-xs font-mono font-bold bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">mins</span>
                      </div>
                      <p className="text-[10px] text-sky-700">Added to delivery promise clock</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-sky-950">Customer Surge Notification Banner</Label>
                    <Input
                      value={draft.surge.surgeReason || ""}
                      onChange={(e) =>
                        setDraft((p) =>
                          p ? { ...p, surge: { ...p.surge, surgeReason: e.target.value } } : null
                        )
                      }
                      className="h-10 text-xs bg-white"
                      placeholder="e.g. Heavy rainfall in your area. Surcharge applied to support delivery captains."
                    />
                  </div>
                </div>

                {/* Interactive Monsoon Simulator Card */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                      <Calculator className="size-4 text-sky-600" />
                      <span>Live Customer Cart Surge Simulator ({selectedScope?.name})</span>
                    </h5>
                    <span className="text-[10px] font-bold text-zinc-400">Interactive Preview</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                    <div className="w-full sm:w-1/3 space-y-1">
                      <Label className="text-[11px] font-bold text-zinc-600">Test Subtotal Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                        <Input
                          type="number"
                          value={simCartValue}
                          onChange={(e) => setSimCartValue(Number(e.target.value) || 0)}
                          className="h-9 pl-7 text-xs font-mono font-bold bg-white"
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-2/3 grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-lg bg-white border border-zinc-200">
                        <p className="text-[10px] text-zinc-500 font-bold">Base Logistics</p>
                        <p className="text-xs font-mono font-black text-zinc-900">
                          {simCartValue >= Number(draft.business.freeDeliveryAbove || 499) ? (
                            <span className="text-emerald-600">FREE</span>
                          ) : (
                            `₹${draft.business.deliveryFee}`
                          )}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white border border-zinc-200">
                        <p className="text-[10px] text-sky-600 font-bold">Monsoon Surcharge</p>
                        <p className="text-xs font-mono font-black text-sky-950">
                          {draft.surge.enabled ? `+₹${draft.surge.rainSurgeFee}` : "₹0 (Disabled)"}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <p className="text-[10px] text-emerald-800 font-bold">Estimated Delivery ETA</p>
                        <p className="text-xs font-mono font-black text-emerald-900">
                          {draft.surge.enabled ? `+${draft.surge.etaDelayMinutes}m Buffer` : "On Time"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 4: TIME SLOTS & CAPACITY THROTTLE ENGINE
            ===================================================================== */}
            {activeTab === "slots" && (
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-6">
                <div>
                  <h4 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                    <CalendarClock className="size-4 text-emerald-600" />
                    <span>Time Slot Capacity Throttle & Turnaround Speed Multipliers</span>
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Prevents partner store overwhelm and configures pricing multipliers for express 24-hour turnaround in <strong>{selectedScope?.name}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-800">Slot Window Duration</Label>
                    <Select
                      value={String(draft.slots.slotDurationHours)}
                      onValueChange={(v) =>
                        setDraft((p) =>
                          p ? { ...p, slots: { ...p.slots, slotDurationHours: v } } : null
                        )
                      }
                    >
                      <SelectTrigger className="h-10 text-xs cursor-pointer font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1-Hour Precision Slot</SelectItem>
                        <SelectItem value="2">2-Hour Standard Window</SelectItem>
                        <SelectItem value="3">3-Hour Flexible Window</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-800">Max Orders Per Slot</Label>
                    <Input
                      type="number"
                      value={draft.slots.maxOrdersPerSlot}
                      onChange={(e) =>
                        setDraft((p) =>
                          p ? { ...p, slots: { ...p.slots, maxOrdersPerSlot: e.target.value } } : null
                        )
                      }
                      className="h-10 text-xs font-mono font-bold"
                    />
                    <p className="text-[10px] text-zinc-400">Slot auto-greys out upon reaching limit</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-800">Minimum Advance Lead Time</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={draft.slots.leadTimeHours}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, slots: { ...p.slots, leadTimeHours: e.target.value } } : null
                          )
                        }
                        className="h-10 pr-12 text-xs font-mono font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">hours</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Minimum booking lead time prior to pickup</p>
                  </div>
                </div>

                {/* Turnaround speed cards */}
                <div className="pt-4 border-t border-zinc-100 space-y-3">
                  <h5 className="text-xs font-black text-zinc-900">Delivery Turnaround Multiplier Matrix</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-950">⚡ Express 24-Hour</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black">
                          {draft.slots.express24hMultiplier}x
                        </span>
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        value={draft.slots.express24hMultiplier}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, slots: { ...p.slots, express24hMultiplier: e.target.value } } : null
                          )
                        }
                        className="h-9 text-xs font-mono font-bold bg-white"
                      />
                      <p className="text-[10px] text-amber-800">+50% premium rate for urgent laundry</p>
                    </div>

                    <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900">Standard 48-Hour</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-200 text-zinc-800 text-[10px] font-black">
                          {draft.slots.standard48hMultiplier}x
                        </span>
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        value={draft.slots.standard48hMultiplier}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, slots: { ...p.slots, standard48hMultiplier: e.target.value } } : null
                          )
                        }
                        className="h-9 text-xs font-mono font-bold bg-white"
                      />
                      <p className="text-[10px] text-zinc-500">Regular catalog baseline price</p>
                    </div>

                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950">🌱 Economy 72-Hour</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-200 text-emerald-900 text-[10px] font-black">
                          {draft.slots.economy72hMultiplier}x
                        </span>
                      </div>
                      <Input
                        type="number"
                        step="0.1"
                        value={draft.slots.economy72hMultiplier}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, slots: { ...p.slots, economy72hMultiplier: e.target.value } } : null
                          )
                        }
                        className="h-9 text-xs font-mono font-bold bg-white"
                      />
                      <p className="text-[10px] text-emerald-800">10% discount for non-urgent bulk laundry</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 5: REFERRAL, CASHBACK & WALLET LIMITS ENGINE
            ===================================================================== */}
            {activeTab === "referral" && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-purple-950 flex items-center gap-2">
                      <Gift className="size-5 text-purple-600" />
                      <span>Customer Growth & Referral Wallet Rewards</span>
                    </h4>
                    <p className="text-xs text-purple-700">
                      Incentivize organic customer referrals while enforcing maximum wallet burn percentages at checkout.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-purple-950">
                      {draft.referral.enabled ? "ACTIVE" : "PAUSED"}
                    </span>
                    <Switch
                      checked={Boolean(draft.referral.enabled)}
                      onCheckedChange={(checked) =>
                        setDraft((p) =>
                          p ? { ...p, referral: { ...p.referral, enabled: checked } } : null
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-purple-200/80">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-purple-950">Referee Welcome Cash</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                      <Input
                        type="number"
                        value={draft.referral.refereeReward}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, referral: { ...p.referral, refereeReward: e.target.value } } : null
                          )
                        }
                        className="h-10 pl-7 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-purple-700">Instant credit on entering promo code</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-purple-950">Referrer Bonus on 1st Order</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                      <Input
                        type="number"
                        value={draft.referral.referrerReward}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, referral: { ...p.referral, referrerReward: e.target.value } } : null
                          )
                        }
                        className="h-10 pl-7 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-purple-700">Credited to friend upon order delivery</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-purple-950">Max Wallet Burn Per Cart (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={draft.referral.maxWalletUsagePercent}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, referral: { ...p.referral, maxWalletUsagePercent: e.target.value } } : null
                          )
                        }
                        className="h-10 pr-8 text-xs font-mono font-bold bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">%</span>
                    </div>
                    <p className="text-[10px] text-purple-700">Limits platform cash burn per checkout</p>
                  </div>
                </div>

                {/* Example preview */}
                <div className="p-3.5 rounded-xl bg-white border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
                  <span className="font-medium">
                    On a <strong>₹500</strong> order, a customer can use up to <strong>₹{(500 * Number(draft.referral.maxWalletUsagePercent || 35)) / 100}</strong> from wallet balance.
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">
                    {draft.referral.maxWalletUsagePercent}% Cap Active
                  </span>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 6: TAXES, COMMISSION & PARTNER ESCROW
            ===================================================================== */}
            {activeTab === "finance" && (
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-6">
                <div>
                  <h4 className="text-sm font-black text-zinc-900">Platform Commission & Partner Settlement Escrow</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Configures automated platform fee deduction and periodic store payout schedules for <strong>{selectedScope?.name}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-800">QuickPress Platform Commission</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={draft.finance.defaultCommission}
                        onChange={(e) =>
                          setDraft((p) => (p ? { ...p, finance: { ...p.finance, defaultCommission: e.target.value } } : null))
                        }
                        className="h-10 pr-8 text-xs font-mono font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">%</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Deducted from partner store on order completion</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-800">Partner Settlement Payout Cycle</Label>
                    <Select
                      value={draft.business.payoutCycle}
                      onValueChange={(v) =>
                        setDraft((p) => (p ? { ...p, business: { ...p.business, payoutCycle: v } } : null))
                      }
                    >
                      <SelectTrigger className="h-10 text-xs cursor-pointer font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly on Monday">Weekly on Monday</SelectItem>
                        <SelectItem value="Bi-weekly (1st & 16th)">Bi-weekly (1st & 16th)</SelectItem>
                        <SelectItem value="Daily Automated Settlement">Daily Automated Settlement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-800">Registered Legal Entity Name</Label>
                    <Input
                      value={draft.business.legalName}
                      onChange={(e) =>
                        setDraft((p) => (p ? { ...p, business: { ...p.business, legalName: e.target.value } } : null))
                      }
                      className="h-10 text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-800">Corporate GSTIN Number</Label>
                    <Input
                      value={draft.business.gstin}
                      onChange={(e) =>
                        setDraft((p) => (p ? { ...p, business: { ...p.business, gstin: e.target.value } } : null))
                      }
                      className="h-10 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-800">Registered Operating Headquarters Address</Label>
                  <Textarea
                    rows={2}
                    value={draft.business.address}
                    onChange={(e) =>
                      setDraft((p) => (p ? { ...p, business: { ...p.business, address: e.target.value } } : null))
                    }
                    className="text-xs resize-none"
                  />
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 7: SAC 998813 INVOICE & GST COMPLIANCE + SIMULATOR
            ===================================================================== */}
            {activeTab === "compliance" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-6 shadow-xs space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-teal-950 flex items-center gap-2">
                      <FileText className="size-5 text-teal-600" />
                      <span>Indian GST Law & SAC 998813 Compliance Engine</span>
                    </h4>
                    <p className="text-xs text-teal-700 mt-0.5">
                      Adheres to official HSN/SAC classification <strong>998813</strong> for laundry, dry cleaning, and pressing services.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-teal-200/80">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-teal-950">SAC Accounting Code</Label>
                      <Input
                        value={draft.compliance.sacCode}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, compliance: { ...p.compliance, sacCode: e.target.value } } : null
                          )
                        }
                        className="h-10 text-xs font-mono font-bold bg-white"
                      />
                      <p className="text-[10px] text-teal-700">Printed on all customer invoices</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-teal-950">Tax Invoice Prefix</Label>
                      <Input
                        value={draft.compliance.invoicePrefix}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, compliance: { ...p.compliance, invoicePrefix: e.target.value } } : null
                          )
                        }
                        className="h-10 text-xs font-mono font-bold bg-white"
                      />
                      <p className="text-[10px] text-teal-700">e.g. QP/2026-27/ auto-sequence</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-teal-950">Section 194C TDS on Stores (%)</Label>
                      <div className="relative">
                        <Input
                          value={draft.compliance.tdsRate}
                          onChange={(e) =>
                            setDraft((p) =>
                              p ? { ...p, compliance: { ...p.compliance, tdsRate: e.target.value } } : null
                            )
                          }
                          className="h-10 pr-8 text-xs font-mono font-bold bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">%</span>
                      </div>
                      <p className="text-[10px] text-teal-700">TDS deducted on partner payouts</p>
                    </div>
                  </div>

                  {/* GST breakup row */}
                  <div className="pt-4 border-t border-teal-200/80 space-y-3">
                    <h5 className="text-xs font-black text-teal-950">GST Component Breakup (Intra vs Inter-State)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-teal-950">Central GST (CGST %)</Label>
                        <Input
                          value={draft.compliance.cgstPercent}
                          onChange={(e) =>
                            setDraft((p) =>
                              p ? { ...p, compliance: { ...p.compliance, cgstPercent: e.target.value } } : null
                            )
                          }
                          className="h-10 text-xs font-mono font-bold bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-teal-950">State GST (SGST %)</Label>
                        <Input
                          value={draft.compliance.sgstPercent}
                          onChange={(e) =>
                            setDraft((p) =>
                              p ? { ...p, compliance: { ...p.compliance, sgstPercent: e.target.value } } : null
                            )
                          }
                          className="h-10 text-xs font-mono font-bold bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-teal-950">Integrated GST (IGST %)</Label>
                        <Input
                          value={draft.compliance.igstPercent}
                          onChange={(e) =>
                            setDraft((p) =>
                              p ? { ...p, compliance: { ...p.compliance, igstPercent: e.target.value } } : null
                            )
                          }
                          className="h-10 text-xs font-mono font-bold bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live SAC 998813 Tax Invoice Breakdown Simulator */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                      <Receipt className="size-4 text-teal-600" />
                      <span>Live SAC 998813 Invoice & Settlement Calculator</span>
                    </h5>
                    <span className="text-[10px] font-bold text-zinc-400">Preview On Sample Order</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200/80">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-zinc-600">Sample Order Bill</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                        <Input
                          type="number"
                          value={simInvoiceValue}
                          onChange={(e) => setSimInvoiceValue(Number(e.target.value) || 0)}
                          className="h-9 pl-7 text-xs font-mono font-bold bg-white"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-zinc-200 text-center">
                      <p className="text-[10px] text-zinc-500 font-bold">Tax Split (CGST + SGST)</p>
                      <p className="text-xs font-mono font-black text-teal-900">
                        ₹{((simInvoiceValue * Number(draft.compliance.cgstPercent || 2.5)) / 100).toFixed(1)} + ₹{((simInvoiceValue * Number(draft.compliance.sgstPercent || 2.5)) / 100).toFixed(1)}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-zinc-200 text-center">
                      <p className="text-[10px] text-zinc-500 font-bold">Platform Cut ({draft.finance.defaultCommission}%)</p>
                      <p className="text-xs font-mono font-black text-emerald-700">
                        ₹{((simInvoiceValue * Number(draft.finance.defaultCommission || 15)) / 100).toFixed(1)}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-zinc-200 text-center">
                      <p className="text-[10px] text-zinc-500 font-bold">Store Settlement (TDS 194C)</p>
                      <p className="text-xs font-mono font-black text-indigo-900">
                        ₹{(simInvoiceValue - (simInvoiceValue * Number(draft.finance.defaultCommission || 15)) / 100 - (simInvoiceValue * Number(draft.compliance.tdsRate || 1.0)) / 100).toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 8: FRAUD DETECTION & ORDER SAFETY ENGINE
            ===================================================================== */}
            {activeTab === "safety" && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 shadow-xs space-y-6">
                <div>
                  <h4 className="text-sm font-black text-rose-950 flex items-center gap-2">
                    <ShieldAlert className="size-5 text-rose-600" />
                    <span>Fraud Prevention & Rider Anti-Spoofing Engine</span>
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Automated security rules to mitigate fake orders, mock GPS spoofing, and serial cart cancellations for <strong>{selectedScope?.name}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-rose-200/80">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-rose-950">High-Value Dual OTP Threshold</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">₹</span>
                      <Input
                        type="number"
                        value={draft.safety.highValueThreshold}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, safety: { ...p.safety, highValueThreshold: e.target.value } } : null
                          )
                        }
                        className="h-10 pl-7 text-xs font-mono font-bold bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-rose-700">Mandatory double OTP on pickup</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-rose-950">Max Cancellation Strikes / Week</Label>
                    <Input
                      type="number"
                      value={draft.safety.maxCancellationStrikes}
                      onChange={(e) =>
                        setDraft((p) =>
                          p ? { ...p, safety: { ...p.safety, maxCancellationStrikes: e.target.value } } : null
                        )
                      }
                      className="h-10 text-xs font-mono font-bold bg-white"
                    />
                    <p className="text-[10px] text-rose-700">COD blocked upon 3 strikes</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-rose-950">Auto Security Lockout Period</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={draft.safety.autoLockoutHours}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, safety: { ...p.safety, autoLockoutHours: e.target.value } } : null
                          )
                        }
                        className="h-10 pr-12 text-xs font-mono font-bold bg-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">hours</span>
                    </div>
                    <p className="text-[10px] text-rose-700">Account cool-off period</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-rose-200">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-black text-rose-950">Rider Fake Mock Location / GPS Guard</h5>
                    <p className="text-[11px] text-rose-700">
                      Disallow delivery captain order status updates if device reports mock/simulated GPS coordinates.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(draft.safety.mockGpsGuard)}
                    onCheckedChange={(checked) =>
                      setDraft((p) =>
                        p ? { ...p, safety: { ...p.safety, mockGpsGuard: checked } } : null
                      )
                    }
                  />
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 9: OPERATIONS & EMERGENCY MAINTENANCE MODE
            ===================================================================== */}
            {activeTab === "operations" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                        <AlertTriangle className="size-5 text-amber-600" />
                        <span>Platform Emergency Maintenance Mode</span>
                      </h4>
                      <p className="text-xs text-zinc-500">
                        Pauses customer order intake for infrastructure upgrades or emergency operations in <strong>{selectedScope?.name}</strong>.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-zinc-900">
                        {draft.business.maintenanceMode ? "MAINTENANCE ACTIVE" : "PLATFORM LIVE"}
                      </span>
                      <Switch
                        checked={Boolean(draft.business.maintenanceMode)}
                        onCheckedChange={(checked) =>
                          setDraft((p) =>
                            p ? { ...p, business: { ...p.business, maintenanceMode: checked } } : null
                          )
                        }
                      />
                    </div>
                  </div>

                  {draft.business.maintenanceMode && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                      <Label className="text-xs font-bold text-amber-950">Customer Facing Outage Notice</Label>
                      <Textarea
                        rows={2}
                        value={draft.business.maintenanceMessage || ""}
                        onChange={(e) =>
                          setDraft((p) =>
                            p ? { ...p, business: { ...p.business, maintenanceMessage: e.target.value } } : null
                          )
                        }
                        className="text-xs border-amber-300 bg-white resize-none"
                        placeholder="We are upgrading our laundry facilities to serve you better. Orders will resume shortly."
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-black text-zinc-900">Laundry Partner Self-Registration</h5>
                    <p className="text-xs text-zinc-500">
                      Enable the public merchant portal allowing new laundry shops in <strong>{selectedScope?.name}</strong> to submit onboarding KYC documents.
                    </p>
                  </div>
                  <Switch
                    checked={draft.business.partnerRegistrationEnabled !== false}
                    onCheckedChange={(checked) =>
                      setDraft((p) =>
                        p ? { ...p, business: { ...p.business, partnerRegistrationEnabled: checked } } : null
                      )
                    }
                  />
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 10: SECURITY & PIN PASSCODE
            ===================================================================== */}
            {activeTab === "security" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                      <Lock className="size-4 text-emerald-600" />
                      <span>Change Master Admin Security Passcode (PIN)</span>
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Required for high-privilege operations such as manual partner balance adjustments and PIN payouts.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-800">Current Passcode</Label>
                      <Input
                        type="password"
                        maxLength={6}
                        placeholder="••••"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        className="h-10 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-800">New 4-Digit Passcode</Label>
                      <Input
                        type="password"
                        maxLength={6}
                        placeholder="••••"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="h-10 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-800">Confirm Passcode</Label>
                      <Input
                        type="password"
                        maxLength={6}
                        placeholder="••••"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        className="h-10 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => pinMutation.mutate()}
                    disabled={!currentPin || !newPin || !confirmPin || pinMutation.isPending}
                    className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs h-9 px-5 shadow-xs cursor-pointer"
                  >
                    <Key className="size-3.5 mr-1.5" />
                    {pinMutation.isPending ? "Updating Passcode..." : "Update Master Passcode"}
                  </Button>
                </div>

                {/* Security Events Audit Log */}
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-zinc-900 flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span>Security & Authentication Audit Trail</span>
                    </h5>
                    <span className="text-[10px] font-bold text-zinc-400">Immutable Ledger</span>
                  </div>

                  <div className="divide-y divide-zinc-100 text-xs max-h-60 overflow-y-auto">
                    {(securityEvents.data?.events || []).length === 0 ? (
                      <div className="py-6 text-center text-xs text-zinc-400 font-medium">
                        No suspicious security events recorded in this cycle.
                      </div>
                    ) : (
                      securityEvents.data?.events?.map((ev, i) => (
                        <div key={i} className="py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-2.5 rounded-full bg-emerald-500" />
                            <div>
                              <p className="font-bold text-zinc-900 font-mono text-[11px]">{ev.eventType}</p>
                              <p className="text-[10px] text-zinc-400">Client IP: {ev.clientIp}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium font-mono">
                            {ev.timestamp?.slice(0, 16).replace("T", " ")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB: FLEET DISPATCH, GEOFENCING & OMNI-CHANNEL GOVERNANCE
            ===================================================================== */}
            {activeTab === "dispatch" && (
              <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                      <Compass className="size-4" />
                    </span>
                    <h4 className="text-sm font-black text-zinc-900">Fleet Dispatch &amp; Geofencing Controls</h4>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Configure automated 2-ride captain allocation, Haversine perimeter fraud validation, and multi-channel notification triggers for <strong>{selectedScope?.name}</strong>.
                  </p>
                </div>

                {/* 1. SMART AUTO-DISPATCH ENGINE */}
                <div className="p-5 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200/60">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 flex items-center justify-center font-black">
                        ⚡
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-zinc-900">Smart Auto-Dispatch Engine</h5>
                        <p className="text-[11px] text-zinc-500">
                          Automatically searches and flash-offers orders to the nearest online Captain
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        (draft.dispatch?.autoDispatchEnabled ?? true)
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}>
                        {(draft.dispatch?.autoDispatchEnabled ?? true) ? "Auto-Dispatch Active" : "Manual Allocation Only"}
                      </span>
                      <Switch
                        checked={draft.dispatch?.autoDispatchEnabled ?? true}
                        onCheckedChange={(val) =>
                          setDraft((p) =>
                            p
                              ? {
                                  ...p,
                                  dispatch: {
                                    ...(p.dispatch ?? {
                                      geofenceRadiusMeters: 250,
                                      geofenceStrictEnforcement: false,
                                      searchRadiusKm: 5,
                                      captainTimeoutSeconds: 30,
                                      maxActiveRidesPerCaptain: 1,
                                    }),
                                    autoDispatchEnabled: val,
                                  },
                                }
                              : null
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 p-3.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                      <Label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                        <span>Search Radius</span>
                        <span className="font-mono text-purple-700 font-bold">{draft.dispatch?.searchRadiusKm ?? 5} km</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={15}
                        step={0.5}
                        value={draft.dispatch?.searchRadiusKm ?? 5}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value) || 5;
                          setDraft((p) =>
                            p
                              ? {
                                  ...p,
                                  dispatch: {
                                    ...(p.dispatch ?? {
                                      autoDispatchEnabled: true,
                                      geofenceRadiusMeters: 250,
                                      geofenceStrictEnforcement: false,
                                      captainTimeoutSeconds: 30,
                                      maxActiveRidesPerCaptain: 1,
                                    }),
                                    searchRadiusKm: num,
                                  },
                                }
                              : null
                          );
                        }}
                        className="h-9 text-xs font-mono font-bold"
                      />
                      <p className="text-[10px] text-zinc-400">Radius to discover online available riders</p>
                    </div>

                    <div className="space-y-1.5 p-3.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                      <Label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                        <span>Captain Offer Timeout</span>
                        <span className="font-mono text-purple-700 font-bold">{draft.dispatch?.captainTimeoutSeconds ?? 30}s</span>
                      </Label>
                      <Select
                        value={String(draft.dispatch?.captainTimeoutSeconds ?? 30)}
                        onValueChange={(val) => {
                          const num = parseInt(val) || 30;
                          setDraft((p) =>
                            p
                              ? {
                                  ...p,
                                  dispatch: {
                                    ...(p.dispatch ?? {
                                      autoDispatchEnabled: true,
                                      geofenceRadiusMeters: 250,
                                      geofenceStrictEnforcement: false,
                                      searchRadiusKm: 5,
                                      maxActiveRidesPerCaptain: 1,
                                    }),
                                    captainTimeoutSeconds: num,
                                  },
                                }
                              : null
                          );
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 Seconds (Fast)</SelectItem>
                          <SelectItem value="45">45 Seconds (Standard)</SelectItem>
                          <SelectItem value="60">60 Seconds</SelectItem>
                          <SelectItem value="90">90 Seconds (Rural zones)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-zinc-400">Time window before cascading to next captain</p>
                    </div>

                    <div className="space-y-1.5 p-3.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                      <Label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                        <span>Max Active Rides / Captain</span>
                        <span className="font-mono text-purple-700 font-bold">{draft.dispatch?.maxActiveRidesPerCaptain ?? 1}</span>
                      </Label>
                      <Select
                        value={String(draft.dispatch?.maxActiveRidesPerCaptain ?? 1)}
                        onValueChange={(val) => {
                          const num = parseInt(val) || 1;
                          setDraft((p) =>
                            p
                              ? {
                                  ...p,
                                  dispatch: {
                                    ...(p.dispatch ?? {
                                      autoDispatchEnabled: true,
                                      geofenceRadiusMeters: 250,
                                      geofenceStrictEnforcement: false,
                                      searchRadiusKm: 5,
                                      captainTimeoutSeconds: 30,
                                    }),
                                    maxActiveRidesPerCaptain: num,
                                  },
                                }
                              : null
                          );
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Ride (Dedicated 1-to-1 SLA)</SelectItem>
                          <SelectItem value="2">2 Rides (Batch Pickup + Delivery)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-zinc-400">Concurrency limit to prevent order delays</p>
                    </div>
                  </div>
                </div>

                {/* 2. GEOFENCE SECURITY GOVERNANCE */}
                <div className="p-5 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200/60">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center font-black">
                        🛡️
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-zinc-900">Haversine Geofence Security Perimeter Guard</h5>
                        <p className="text-[11px] text-zinc-500">
                          Cross-verifies Captain live GPS coordinates against customer location during OTP handshakes
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                      Haversine Spherical Algorithm
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3 p-4 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                      <Label className="text-xs font-bold text-zinc-800 flex items-center justify-between">
                        <span>Geofence Radius Threshold</span>
                        <span className="font-mono text-emerald-700 font-black">{draft.dispatch?.geofenceRadiusMeters ?? 250} meters</span>
                      </Label>
                      <Input
                        type="number"
                        min={50}
                        max={1000}
                        step={50}
                        value={draft.dispatch?.geofenceRadiusMeters ?? 250}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value) || 250;
                          setDraft((p) =>
                            p
                              ? {
                                  ...p,
                                  dispatch: {
                                    ...(p.dispatch ?? {
                                      autoDispatchEnabled: true,
                                      geofenceStrictEnforcement: false,
                                      searchRadiusKm: 5,
                                      captainTimeoutSeconds: 30,
                                      maxActiveRidesPerCaptain: 1,
                                    }),
                                    geofenceRadiusMeters: num,
                                  },
                                }
                              : null
                          );
                        }}
                        className="h-9 text-xs font-mono font-bold"
                      />
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-[10px] text-zinc-400 font-bold">Quick Presets:</span>
                        {[100, 250, 500, 1000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setDraft((p) =>
                                p
                                  ? {
                                      ...p,
                                      dispatch: {
                                        ...(p.dispatch ?? {
                                          autoDispatchEnabled: true,
                                          geofenceStrictEnforcement: false,
                                          searchRadiusKm: 5,
                                          captainTimeoutSeconds: 30,
                                          maxActiveRidesPerCaptain: 1,
                                        }),
                                        geofenceRadiusMeters: preset,
                                      },
                                    }
                                  : null
                              );
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                              (draft.dispatch?.geofenceRadiusMeters ?? 250) === preset
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                            }`}
                          >
                            {preset}m {preset === 250 ? "(Recommended)" : ""}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-zinc-800">Strict Geofence Enforcement</Label>
                          <Switch
                            checked={draft.dispatch?.geofenceStrictEnforcement ?? false}
                            onCheckedChange={(val) =>
                              setDraft((p) =>
                                p
                                  ? {
                                      ...p,
                                      dispatch: {
                                        ...(p.dispatch ?? {
                                          autoDispatchEnabled: true,
                                          geofenceRadiusMeters: 250,
                                          searchRadiusKm: 5,
                                          captainTimeoutSeconds: 30,
                                          maxActiveRidesPerCaptain: 1,
                                        }),
                                        geofenceStrictEnforcement: val,
                                      },
                                    }
                                  : null
                              )
                            }
                          />
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-2">
                          {(draft.dispatch?.geofenceStrictEnforcement ?? false)
                            ? "🔒 STRICT MODE: Hard-blocks Pickup/Delivery OTP verification if Captain's live GPS is outside the radius. Prevents all fraudulent remote completions."
                            : "⚠️ AUDIT MODE: Allows OTP completion even if outside perimeter, but records a security anomaly warning flag in the Supabase audit trail."}
                        </p>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                        GPS Sensor Check: Active · Accuracy Threshold: High
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. MULTI-CHANNEL AUTOMATED NOTIFICATIONS MASTER TOGGLES */}
                <div className="p-5 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-200/60">
                    <div className="size-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 flex items-center justify-center font-black">
                      💬
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-zinc-900">Omni-Channel Customer Alert Engine</h5>
                      <p className="text-[11px] text-zinc-500">
                        Master delivery toggles for WhatsApp Cloud API &amp; Indian Transactional SMS
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between">
                      <div className="space-y-0.5 pr-3">
                        <p className="text-xs font-black text-zinc-900">Meta WhatsApp Cloud API Triggers</p>
                        <p className="text-[10px] text-zinc-500">
                          Automatic interactive messages with CTA tracking buttons for Order Placed, Captain Assigned, OTP, Delivered
                        </p>
                      </div>
                      <Switch
                        checked={draft.omniChannel?.whatsappEnabled ?? true}
                        onCheckedChange={(val) =>
                          setDraft((p) =>
                            p
                              ? {
                                  ...p,
                                  omniChannel: {
                                    ...(p.omniChannel ?? {
                                      smsEnabled: true,
                                      orderConfirmedWhatsapp: true,
                                      captainAssignedWhatsapp: true,
                                      clothesInspectedWhatsapp: true,
                                      outForDeliveryWhatsapp: true,
                                      orderDeliveredWhatsapp: true,
                                      deliveryOtpSms: true,
                                    }),
                                    whatsappEnabled: val,
                                  },
                                }
                              : null
                          )
                        }
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between">
                      <div className="space-y-0.5 pr-3">
                        <p className="text-xs font-black text-zinc-900">Indian Rapid SMS Gateway Alerts</p>
                        <p className="text-[10px] text-zinc-500">
                          Fast2SMS &amp; MSG91 SMS alerts for customer secure Delivery OTP and urgent operational notices
                        </p>
                      </div>
                      <Switch
                        checked={draft.omniChannel?.smsEnabled ?? true}
                        onCheckedChange={(val) =>
                          setDraft((p) =>
                            p
                              ? {
                                  ...p,
                                  omniChannel: {
                                    ...(p.omniChannel ?? {
                                      whatsappEnabled: true,
                                      orderConfirmedWhatsapp: true,
                                      captainAssignedWhatsapp: true,
                                      clothesInspectedWhatsapp: true,
                                      outForDeliveryWhatsapp: true,
                                      orderDeliveredWhatsapp: true,
                                      deliveryOtpSms: true,
                                    }),
                                    smsEnabled: val,
                                  },
                                }
                              : null
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            3. FLOATING UNSAVED CHANGES DOCK (STICKY BOTTOM BAR)
        ========================================================================= */}
        {isDirty && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="rounded-2xl bg-zinc-900/95 text-white p-4 shadow-2xl backdrop-blur-xl border border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div>
                  <p className="text-xs font-bold text-white">
                    Unsaved modifications in {selectedScope?.name || "Settings"}
                  </p>
                  <p className="text-[10px] text-zinc-400">Press ⌘S or click Save to propagate live to this region</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (settings.data) setDraft(structuredClone(settings.data));
                    toast.info("Changes reverted");
                  }}
                  className="h-8 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-bold cursor-pointer"
                >
                  Discard
                </Button>

                <Button
                  size="sm"
                  disabled={saveMutation.isPending}
                  onClick={() => {
                    if (draft) saveMutation.mutate(draft);
                  }}
                  className="h-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-xs px-4 shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving to Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      <span>Save Now (⌘S)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
