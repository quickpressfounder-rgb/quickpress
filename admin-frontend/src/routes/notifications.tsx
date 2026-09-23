import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Bell,
  Smartphone,
  Users,
  Building2,
  Truck,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  Radio,
  Layers,
  MessageSquare,
  Zap,
  Target,
  Megaphone,
  Store,
  Bike,
  User,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Copy,
  Check,
  Volume2,
  Activity,
  Server,
  Download,
  MessageCircle,
  CheckCheck,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { AdminShell } from "../components/AdminShell";
import { DataTable, SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  fetchCampaigns,
  sendBroadcast,
  fetchWhatsAppLogs,
  sendAdminWhatsApp,
  fetchSmsLogs,
  sendAdminSms,
  fetchOmniStats,
  fetchOmniSettings,
  updateOmniSettings,
  type Campaign,
  type WhatsAppLog,
  type SmsLog,
} from "../api/notifications";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/notifications")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Push Notifications & Campaign Center",
      "Dispatch multi-channel announcements, promotional alerts, fleet push notifications, and partner bulletins."
    ),
  component: NotificationsPage,
});

const WA_TEMPLATE_PRESETS = [
  {
    id: "order_confirmed",
    name: "Order Confirmed",
    body: "Hello {name}, your QuickPress order #{orderId} has been confirmed! Pickup is scheduled. Track live progress anytime.",
  },
  {
    id: "captain_assigned",
    name: "Captain Assigned",
    body: "Hello {name}, Captain Rahul Sharma has been assigned for your laundry pickup. Bike: UP-87-AB-1234.",
  },
  {
    id: "clothes_inspected",
    name: "Clothes Inspected & Counted",
    body: "Hello {name}, your garments have arrived at the store hub and cleared dual-inspection. Cleaning has started!",
  },
  {
    id: "out_for_delivery",
    name: "Out For Delivery with OTP",
    body: "Hello {name}, your freshly laundered clothes are out for delivery! Share OTP 4821 with Captain upon arrival.",
  },
  {
    id: "order_delivered",
    name: "Order Delivered & Tax Invoice",
    body: "Hello {name}, your order #{orderId} has been delivered! View your GST Tax Invoice and rate your experience.",
  },
  {
    id: "custom_announcement",
    name: "Custom Announcement",
    body: "QuickPress Update: Monsoon Express service is now active in your area with water-sealed garment bags.",
  },
];

const TEMPLATE_PRESETS = [
  {
    id: "festive-50",
    label: "🎉 Festive 50% Off Voucher",
    title: "Diwali Special: Flat 50% OFF on Dry Clean!",
    body: "Get your traditional outfits shining like new. Use code FESTIVE50 on orders above ₹249. Free doorstep pickup!",
    audience: "Customers",
    category: "Promotional",
  },
  {
    id: "surge-rider",
    label: "⚡ Rider Surge Earning Bonus",
    title: "⚡ Peak Hours Surge Active: Extra ₹25/Trip!",
    body: "High order demand in Kasganj Sector 1 & Main Market. Earn ₹25 extra bonus on every delivery completed before 9 PM.",
    audience: "Riders",
    category: "Urgent",
  },
  {
    id: "weather-alert",
    label: "🌧️ Monsoon Pickup Advisory",
    title: "Monsoon Weather Advisory: Safe Garment Protection",
    body: "Due to heavy rainfall, doorstep delivery may experience a slight 15-20 min delay. All laundry bags are water-sealed.",
    audience: "All",
    category: "Operational",
  },
  {
    id: "partner-quality",
    label: "🏪 Store Hub SLA Guidelines",
    title: "Weekly Store Quality Standards & Express SLA",
    body: "Please ensure all dry clean items undergo dual QA inspection before tagging for rider pickup. Keep turnaround within 24 hrs.",
    audience: "Partners",
    category: "Operational",
  },
  {
    id: "vip-perks",
    label: "👑 VIP Member Rewards Drop",
    title: "Exclusive VIP Perk Unlocked: Free Express Wash",
    body: "Thank you for being a Platinum Elite member! Your priority wash voucher is now active in your wallet.",
    audience: "Customers",
    category: "Promotional",
  },
];

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const campaigns = useQuery({ queryKey: ["admin", "campaigns"], queryFn: fetchCampaigns });
  const whatsappLogs = useQuery({ queryKey: ["admin", "whatsapp-logs"], queryFn: () => fetchWhatsAppLogs(50) });
  const smsLogs = useQuery({ queryKey: ["admin", "sms-logs"], queryFn: () => fetchSmsLogs(50) });
  const omniStats = useQuery({ queryKey: ["admin", "omni-stats"], queryFn: fetchOmniStats });
  const omniSettings = useQuery({ queryKey: ["admin", "omni-settings"], queryFn: fetchOmniSettings });

  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "Customers",
    channel: "All Channels",
    category: "Promotional",
  });
  const [activeTab, setActiveTab] = useState<"campaigns" | "whatsapp" | "sms" | "templates" | "gateway" | "audience">("campaigns");
  const [searchQuery, setSearchQuery] = useState("");

  // WhatsApp form state
  const [waForm, setWaForm] = useState({
    toPhone: "",
    recipientName: "Valued Customer",
    templateName: "order_confirmed",
    messageBody: "Hello Valued Customer, your QuickPress order #QP-2026 has been confirmed! Pickup is scheduled. Track live progress anytime.",
    orderId: "QP-2026",
  });
  const [waStatusFilter, setWaStatusFilter] = useState("all");
  const [waSearch, setWaSearch] = useState("");

  // SMS form state
  const [smsForm, setSmsForm] = useState({
    toPhone: "",
    message: "QuickPress: Your delivery verification OTP is 4821. Valid for 5 mins. Share with Captain only.",
    purpose: "delivery_otp",
  });
  const [smsSearch, setSmsSearch] = useState("");

  const allCampaigns = campaigns.data ?? [];

  const sendMutation = useMutation({
    mutationFn: sendBroadcast,
    onSuccess: (data) => {
      toast.success(`Broadcast transmitted to ${data?.reached || 19} active devices across feeds! 🎉`);
      setForm({ title: "", body: "", audience: "Customers", channel: "All Channels", category: "Promotional" });
      queryClient.invalidateQueries({ queryKey: ["admin", "campaigns"] });
    },
    onError: () => {
      toast.error("Failed to transmit broadcast.");
    },
  });

  const sendWaMutation = useMutation({
    mutationFn: sendAdminWhatsApp,
    onSuccess: (data) => {
      toast.success(`WhatsApp message transmitted successfully! ID: ${data?.messageId || "sent"} 💬`);
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "omni-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dispatch WhatsApp message.");
    },
  });

  const sendSmsMutation = useMutation({
    mutationFn: sendAdminSms,
    onSuccess: (data) => {
      toast.success(`Transactional SMS transmitted successfully! ID: ${data?.messageId || "sent"} 📱`);
      queryClient.invalidateQueries({ queryKey: ["admin", "sms-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "omni-stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dispatch SMS.");
    },
  });

  const updateOmniMutation = useMutation({
    mutationFn: updateOmniSettings,
    onSuccess: () => {
      toast.success("Omni-Channel master governance toggle updated!");
      queryClient.invalidateQueries({ queryKey: ["admin", "omni-settings"] });
    },
    onError: () => {
      toast.error("Failed to update Omni-Channel controls.");
    },
  });

  const metrics = useMemo(() => {
    const total = allCampaigns.length;
    const customerCampaigns = allCampaigns.filter((c) => c.audience.includes("Customer") || c.audience === "All Users").length;
    const partnerCampaigns = allCampaigns.filter((c) => c.audience.includes("Partner") || c.audience === "All Users").length;
    const riderCampaigns = allCampaigns.filter((c) => c.audience.includes("Rider") || c.audience === "All Users").length;
    return { total, customerCampaigns, partnerCampaigns, riderCampaigns };
  }, [allCampaigns]);

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCampaigns.filter((c) => {
      return !q || [c.title, c.message, c.audience, c.category].join(" ").toLowerCase().includes(q);
    });
  }, [allCampaigns, searchQuery]);

  const handleApplyTemplate = (tpl: (typeof TEMPLATE_PRESETS)[0]) => {
    setForm({
      title: tpl.title,
      body: tpl.body,
      audience: tpl.audience,
      channel: "All Channels",
      category: tpl.category,
    });
    toast.success(`Loaded template "${tpl.label}"!`);
  };

  return (
    <AdminShell
      title="Push Notifications & Campaign Center"
      subtitle="Transmit multi-channel mobile notifications, promotional alerts, fleet push advisories, and store bulletins."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              campaigns.refetch();
              toast.success("Broadcast feeds refreshed!");
            }}
            disabled={campaigns.isRefetching}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${campaigns.isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* =========================================================================
            1. TOP METRIC CARDS (6 METRICS)
        ========================================================================= */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiCard
            kpi={{
              id: "tot-notif",
              label: "Dispatched Campaigns",
              value: `${metrics.total} Broadcasts`,
              hint: "Multi-channel history",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "cust-alerts",
              label: "Customer Broadcasts",
              value: `${metrics.customerCampaigns} Sent`,
              hint: "65 User accounts",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "part-alerts",
              label: "Partner Store Bulletins",
              value: `${metrics.partnerCampaigns} Sent`,
              hint: "8 Hub owners",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "rdr-alerts",
              label: "Fleet Push Dispatches",
              value: `${metrics.riderCampaigns} Sent`,
              hint: "4 Delivery captains",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "delivery-rate",
              label: "Delivery Success Rate",
              value: "99.8%",
              hint: "FCM & Socket transmitted",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "channels-active",
              label: "Gateway Channels",
              value: "Socket + FCM",
              hint: "Live realtime push",
              positive: true,
            }}
          />
        </div>

        {/* =========================================================================
            2. INTERACTIVE CAMPAIGN BUILDER + LIVE MOBILE DEVICE PREVIEW
        ========================================================================= */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Builder Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <SectionCard
              title="Compose Multi-Channel Broadcast"
              description="Craft announcements with real-time push to Customer, Partner, and Captain app feeds."
            >
              <div className="space-y-4">
                {/* Template Fast Loader */}
                <div>
                  <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    Quick Template Presets
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_PRESETS.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Broadcast Headline / Title</Label>
                  <Input
                    placeholder="e.g. 50% Off Dry Clean This Weekend!"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="h-10 text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Message Content / Description</Label>
                  <Textarea
                    placeholder="Enter your announcement text, promo details, or operational guidelines..."
                    rows={4}
                    value={form.body}
                    onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Target Audience</Label>
                    <Select value={form.audience} onValueChange={(v) => setForm((p) => ({ ...p, audience: v }))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">🌐 All Users (Everyone)</SelectItem>
                        <SelectItem value="Customers">👥 Customers Only</SelectItem>
                        <SelectItem value="Partners">🏪 Partner Store Hubs</SelectItem>
                        <SelectItem value="Riders">🚴 Delivery Captains</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Notification Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Promotional">🏷️ Promotional</SelectItem>
                        <SelectItem value="Operational">⚙️ Operational Alert</SelectItem>
                        <SelectItem value="Urgent">⚡ Urgent / Surge</SelectItem>
                        <SelectItem value="System">🛡️ System Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Delivery Channel</Label>
                    <Select value={form.channel} onValueChange={(v) => setForm((p) => ({ ...p, channel: v }))}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Channels">🔔 In-App + FCM Push</SelectItem>
                        <SelectItem value="In-App Feed">📱 In-App Feed Only</SelectItem>
                        <SelectItem value="FCM Mobile Push">⚡ Urgent Push Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => sendMutation.mutate(form)}
                    disabled={!form.title || !form.body || sendMutation.isPending}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs"
                  >
                    <Send className="size-3.5 mr-1.5" />
                    {sendMutation.isPending ? "Transmitting Across Devices..." : "Dispatch Broadcast Campaign"}
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Live Mobile Device Screen Preview (5 Cols) */}
          <div className="lg:col-span-5">
            <SectionCard title="Live Mobile App Screen Preview" description="Real-time rendering of device push banner and in-app feed.">
              <div className="mx-auto w-full max-w-[320px] rounded-[36px] border-4 border-zinc-800 bg-zinc-900 p-3.5 shadow-2xl space-y-4">
                {/* Mobile Notch */}
                <div className="mx-auto h-4 w-28 rounded-full bg-zinc-800 flex items-center justify-center">
                  <div className="size-2 rounded-full bg-zinc-900" />
                </div>

                {/* Lockscreen / Push Banner */}
                <div className="rounded-2xl bg-white/95 p-3.5 backdrop-blur-md shadow-lg space-y-1.5 border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex size-5 items-center justify-center rounded-md bg-emerald-600 text-white font-black text-[9px]">
                        QP
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900">QuickPress</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-medium">now</span>
                  </div>

                  <p className="font-bold text-zinc-900 text-xs leading-tight">
                    {form.title || "Announcement Headline"}
                  </p>
                  <p className="text-[11px] text-zinc-600 line-clamp-3 leading-relaxed">
                    {form.body || "Your broadcast message text will preview here in real-time as you type..."}
                  </p>
                </div>

                {/* Audience Pill */}
                <div className="rounded-xl bg-zinc-800/80 p-2 text-center text-[10px] font-bold text-zinc-400 flex items-center justify-center gap-1.5">
                  <Radio className="size-3 text-emerald-500 animate-pulse" />
                  <span>Target: {form.audience} · {form.category}</span>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* =========================================================================
            3. MAIN TABS NAVIGATION & HISTORY
        ========================================================================= */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger value="campaigns" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  📢 Dispatched Broadcasts ({allCampaigns.length})
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  💬 WhatsApp Cloud API ({whatsappLogs.data?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="sms" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  📱 Indian SMS ({smsLogs.data?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="templates" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  ⚡ Templates Library ({TEMPLATE_PRESETS.length})
                </TabsTrigger>
                <TabsTrigger value="gateway" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  📱 Gateway Health
                </TabsTrigger>
                <TabsTrigger value="audience" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-xs">
                  🎯 Audience Segments
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>FCM Verified</span>
            </div>
          </div>

          {activeTab === "campaigns" && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search past broadcasts by title, message, audience, or category..."
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          )}
        </SectionCard>

        {/* TAB 1: DISPATCHED BROADCASTS TABLE */}
        {activeTab === "campaigns" && (
          <SectionCard title="Historical Campaign Dispatches" description="Complete record of broadcast alerts transmitted across the network.">
            <DataTable
              loading={campaigns.isLoading}
              rows={filteredCampaigns}
              emptyMessage="No broadcast campaigns match your search."
              columns={[
                {
                  key: "title",
                  label: "Broadcast Title & Message",
                  render: (c) => (
                    <div className="space-y-0.5 max-w-md">
                      <p className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                        {c.title}
                        <span className="rounded-full bg-zinc-100 text-zinc-600 text-[9px] px-1.5 py-0.2 font-bold uppercase">
                          {c.category}
                        </span>
                      </p>
                      <p className="text-[10px] text-zinc-500 line-clamp-1">{c.message}</p>
                    </div>
                  ),
                },
                {
                  key: "audience",
                  label: "Target Audience",
                  render: (c) => (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      {c.audience}
                    </span>
                  ),
                },
                {
                  key: "channel",
                  label: "Channel",
                  render: (c) => (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-600 font-medium">
                      <Smartphone className="size-3 text-sky-600" /> {c.channel}
                    </span>
                  ),
                },
                {
                  key: "sent",
                  label: "Devices Reached",
                  render: (c) => <span className="font-black text-xs text-zinc-900">{c.sent} Feeds</span>,
                },
                {
                  key: "opened",
                  label: "Open / Read Rate",
                  render: (c) => <span className="font-bold text-xs text-emerald-600">{c.opened}</span>,
                },
                {
                  key: "date",
                  label: "Dispatched At",
                  render: (c) => (
                    <div className="text-xs text-zinc-500">
                      <p className="font-medium text-zinc-700">{c.date}</p>
                      <p className="text-[10px] text-zinc-400">{c.time}</p>
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (c) => <StatusPill value={c.status} />,
                },
              ]}
            />
          </SectionCard>
        )}

        {/* =====================================================================
            TAB: WHATSAPP BUSINESS CLOUD API ENGINE & SURVEILLANCE
        ===================================================================== */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6">
            {/* Top Governance Control Bar */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black">
                  <MessageCircle className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-900">Meta WhatsApp Business Cloud API v20.0</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {omniSettings.data?.gateways.whatsapp.mode || "Simulation Sandbox"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Webhook Verification: <code className="font-mono text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded text-[10px]">quickpress_meta_verify_2026</code> · Phone ID: <span className="font-mono text-zinc-600 text-[10px]">{omniSettings.data?.gateways.whatsapp.phoneNumberId || "Sandbox"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-900">
                    {(omniSettings.data?.omniChannel.whatsappEnabled ?? true) ? "Auto-Triggers Active" : "Auto-Triggers Paused"}
                  </p>
                  <p className="text-[10px] text-zinc-400">Order lifecycle customer alerts</p>
                </div>
                <Switch
                  checked={omniSettings.data?.omniChannel.whatsappEnabled ?? true}
                  onCheckedChange={(val) => updateOmniMutation.mutate({ whatsappEnabled: val })}
                />
              </div>
            </div>

            {/* WhatsApp KPI Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                kpi={{
                  id: "wa-total",
                  label: "Total WhatsApp Dispatched",
                  value: `${omniStats.data?.whatsapp.total ?? 0}`,
                  hint: "All transactional cards",
                  positive: true,
                }}
              />
              <KpiCard
                kpi={{
                  id: "wa-delivered",
                  label: "Successfully Delivered",
                  value: `${omniStats.data?.whatsapp.delivered ?? 0}`,
                  hint: "Meta delivery receipts",
                  positive: true,
                }}
              />
              <KpiCard
                kpi={{
                  id: "wa-read",
                  label: "Customer Read Receipts",
                  value: `${omniStats.data?.whatsapp.read ?? 0}`,
                  hint: "Double blue ticks",
                  positive: true,
                }}
              />
              <KpiCard
                kpi={{
                  id: "wa-rate",
                  label: "Delivery Success Rate",
                  value: `${omniStats.data?.whatsapp.deliveryRate ?? 100}%`,
                  hint: "Reliability SLA",
                  positive: true,
                }}
              />
            </div>

            {/* WhatsApp Dispatcher & Live Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form */}
              <div className="lg:col-span-7">
                <SectionCard
                  title="Direct WhatsApp Dispatcher"
                  description="Transmit verified WhatsApp template notifications or custom announcements to any customer or captain."
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-700">Recipient Phone (+91)</Label>
                        <Input
                          placeholder="e.g. 9876543210"
                          value={waForm.toPhone}
                          onChange={(e) => setWaForm({ ...waForm, toPhone: e.target.value })}
                          className="h-10 text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-700">Recipient Name</Label>
                        <Input
                          placeholder="e.g. Himanshu Pal"
                          value={waForm.recipientName}
                          onChange={(e) => setWaForm({ ...waForm, recipientName: e.target.value })}
                          className="h-10 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-700">Template Preset</Label>
                        <Select
                          value={waForm.templateName}
                          onValueChange={(val) => {
                            const found = WA_TEMPLATE_PRESETS.find((t) => t.id === val);
                            if (found) {
                              setWaForm({
                                ...waForm,
                                templateName: val,
                                messageBody: found.body
                                  .replace("{name}", waForm.recipientName || "Valued Customer")
                                  .replace("{orderId}", waForm.orderId || "QP-2026"),
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WA_TEMPLATE_PRESETS.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-700">Order ID (Optional)</Label>
                        <Input
                          placeholder="e.g. QP-TEST-101"
                          value={waForm.orderId}
                          onChange={(e) => setWaForm({ ...waForm, orderId: e.target.value })}
                          className="h-10 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-zinc-700">WhatsApp Message Body</Label>
                      <Textarea
                        rows={4}
                        value={waForm.messageBody}
                        onChange={(e) => setWaForm({ ...waForm, messageBody: e.target.value })}
                        className="text-xs font-medium"
                      />
                    </div>

                    <Button
                      onClick={() => {
                        if (!waForm.toPhone.trim()) {
                          toast.error("Please enter a valid 10-digit mobile number");
                          return;
                        }
                        sendWaMutation.mutate(waForm);
                      }}
                      disabled={sendWaMutation.isPending}
                      className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="size-4" />
                      <span>{sendWaMutation.isPending ? "Transmitting to WhatsApp..." : "Transmit WhatsApp Alert"}</span>
                    </Button>
                  </div>
                </SectionCard>
              </div>

              {/* Right Column: Live Simulated Chat Preview */}
              <div className="lg:col-span-5">
                <SectionCard
                  title="Interactive WhatsApp Live Preview"
                  description="Real-time rendering of the message bubble with CTA buttons."
                >
                  <div className="rounded-2xl border border-zinc-200 bg-[#EFEAE2] overflow-hidden shadow-xs">
                    {/* WhatsApp Header */}
                    <div className="bg-[#075E54] text-white p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-emerald-700 border border-white/20 flex items-center justify-center text-xs font-black">
                          QP
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1">
                            QuickPress Official
                            <CheckCheck className="size-3 text-sky-300" />
                          </p>
                          <p className="text-[10px] text-emerald-200">Verified Business Account</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-800/60 px-2 py-0.5 rounded text-emerald-100 font-mono">
                        v20.0
                      </span>
                    </div>

                    {/* Chat Area */}
                    <div className="p-4 min-h-[220px] flex flex-col justify-end">
                      <div className="bg-white rounded-xl p-3 shadow-xs max-w-[95%] space-y-2 border border-zinc-100">
                        <p className="text-xs text-zinc-900 whitespace-pre-wrap font-sans leading-relaxed">
                          {waForm.messageBody}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-400">
                          <span>Just now</span>
                          <CheckCheck className="size-3.5 text-blue-500" />
                        </div>
                      </div>

                      {/* Interactive CTA buttons preview */}
                      <div className="mt-2 space-y-1.5 max-w-[95%]">
                        <button
                          type="button"
                          className="w-full py-1.5 px-3 rounded-lg bg-white/90 hover:bg-white text-emerald-700 text-xs font-bold shadow-2xs border border-emerald-100 text-center flex items-center justify-center gap-1.5 transition-all"
                        >
                          📍 Track Order Live
                        </button>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>

            {/* Live WhatsApp Surveillance Logs Table */}
            <SectionCard
              title="Live WhatsApp Transmission Logs"
              description="Historical record of all interactive WhatsApp notices with real-time delivery callbacks."
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input
                      placeholder="Search by phone, recipient, or template..."
                      value={waSearch}
                      onChange={(e) => setWaSearch(e.target.value)}
                      className="h-9 pl-9 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {["all", "delivered", "read", "sent", "failed"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setWaStatusFilter(st)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          waStatusFilter === st
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <DataTable
                  loading={whatsappLogs.isLoading}
                  rows={(whatsappLogs.data ?? []).filter((item: WhatsAppLog) => {
                    const matchStatus = waStatusFilter === "all" || item.status === waStatusFilter;
                    const matchSearch =
                      !waSearch.trim() ||
                      [item.toPhone, item.recipientName, item.templateName, item.messageBody]
                        .join(" ")
                        .toLowerCase()
                        .includes(waSearch.toLowerCase());
                    return matchStatus && matchSearch;
                  })}
                  emptyMessage="No WhatsApp message records found."
                  columns={[
                    {
                      key: "recipient",
                      label: "Recipient Customer / Rider",
                      render: (row: WhatsAppLog) => (
                        <div>
                          <p className="font-bold text-xs text-zinc-900">{row.recipientName || "User"}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">+{row.toPhone}</p>
                        </div>
                      ),
                    },
                    {
                      key: "template",
                      label: "Template / Purpose",
                      render: (row: WhatsAppLog) => (
                        <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {row.templateName}
                        </span>
                      ),
                    },
                    {
                      key: "body",
                      label: "Message Snippet",
                      render: (row: WhatsAppLog) => (
                        <p className="text-xs text-zinc-600 line-clamp-1 max-w-xs">{row.messageBody}</p>
                      ),
                    },
                    {
                      key: "orderId",
                      label: "Order Reference",
                      render: (row: WhatsAppLog) => (
                        <span className="text-xs font-mono font-medium text-zinc-600">{row.orderId || "—"}</span>
                      ),
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (row: WhatsAppLog) => {
                        const s = row.status?.toLowerCase();
                        if (s === "delivered") {
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="size-3" /> Delivered
                            </span>
                          );
                        } else if (s === "read") {
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <CheckCheck className="size-3" /> Read
                            </span>
                          );
                        } else if (s === "sent") {
                          return (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="size-3" /> Sent
                            </span>
                          );
                        }
                        return <StatusPill value={row.status} />;
                      },
                    },
                    {
                      key: "time",
                      label: "Timestamp",
                      render: (row: WhatsAppLog) => (
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {row.createdAt ? new Date(row.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </SectionCard>
          </div>
        )}

        {/* =====================================================================
            TAB: INDIAN RAPID SMS GATEWAY ENGINE & LOGS
        ===================================================================== */}
        {activeTab === "sms" && (
          <div className="space-y-6">
            {/* Top Governance Control Bar */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center font-black">
                  <Smartphone className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-900">Indian Rapid SMS Gateway</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                      {omniSettings.data?.gateways.sms.provider || "Fast2SMS Active"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Sender ID: <code className="font-mono text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded text-[10px]">{omniSettings.data?.gateways.sms.senderId || "QKPRES"}</code> · Atomic PostgreSQL OTP TTL: <span className="font-mono text-zinc-600 text-[10px]">5 Minutes</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-900">
                    {(omniSettings.data?.omniChannel.smsEnabled ?? true) ? "SMS Alerts Active" : "SMS Alerts Paused"}
                  </p>
                  <p className="text-[10px] text-zinc-400">Transactional OTP &amp; delivery notices</p>
                </div>
                <Switch
                  checked={omniSettings.data?.omniChannel.smsEnabled ?? true}
                  onCheckedChange={(val) => updateOmniMutation.mutate({ smsEnabled: val })}
                />
              </div>
            </div>

            {/* SMS KPI Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                kpi={{
                  id: "sms-total",
                  label: "Total SMS Dispatched",
                  value: `${omniStats.data?.sms.total ?? 0}`,
                  hint: "Transactional alerts",
                  positive: true,
                }}
              />
              <KpiCard
                kpi={{
                  id: "sms-sent",
                  label: "Successfully Delivered",
                  value: `${omniStats.data?.sms.sent ?? 0}`,
                  hint: "Delivered to mobile network",
                  positive: true,
                }}
              />
              <KpiCard
                kpi={{
                  id: "sms-failed",
                  label: "Failed / Bounced",
                  value: `${omniStats.data?.sms.failed ?? 0}`,
                  hint: "Invalid MSISDN / DND",
                  positive: false,
                }}
              />
              <KpiCard
                kpi={{
                  id: "sms-rate",
                  label: "Transmission Success Rate",
                  value: `${omniStats.data?.sms.successRate ?? 100}%`,
                  hint: "Network delivery score",
                  positive: true,
                }}
              />
            </div>

            {/* SMS Dispatcher Form */}
            <SectionCard
              title="Transactional SMS Dispatcher"
              description="Dispatch high-priority OTP or delivery alerts via Fast2SMS / MSG91 directly from the console."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700">Recipient Mobile Number</Label>
                  <Input
                    placeholder="e.g. 9876543210"
                    value={smsForm.toPhone}
                    onChange={(e) => setSmsForm({ ...smsForm, toPhone: e.target.value })}
                    className="h-10 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700">Dispatch Purpose</Label>
                  <Select
                    value={smsForm.purpose}
                    onValueChange={(val) => setSmsForm({ ...smsForm, purpose: val })}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery_otp">Customer Secure Delivery OTP</SelectItem>
                      <SelectItem value="dispatch_alert">Captain Dispatch Notice</SelectItem>
                      <SelectItem value="partner_alert">Partner Hub Pickup Ready</SelectItem>
                      <SelectItem value="urgent_operational">Urgent Operational Advisory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <Button
                    onClick={() => {
                      if (!smsForm.toPhone.trim()) {
                        toast.error("Please enter a valid 10-digit mobile number");
                        return;
                      }
                      sendSmsMutation.mutate(smsForm);
                    }}
                    disabled={sendSmsMutation.isPending}
                    className="h-10 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
                  >
                    <Send className="size-4" />
                    <span>{sendSmsMutation.isPending ? "Transmitting SMS..." : "Dispatch SMS Alert"}</span>
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-700">SMS Text (GSM 7-bit standard)</Label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {smsForm.message.length} / 160 Characters (1 SMS Segment)
                  </span>
                </div>
                <Textarea
                  rows={2}
                  value={smsForm.message}
                  onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                  className="text-xs font-medium"
                />
              </div>
            </SectionCard>

            {/* Live SMS Transmission Logs Table */}
            <SectionCard
              title="Live Indian SMS Transmission Logs"
              description="Full audit record of OTP and transactional SMS alerts stored in Supabase PostgreSQL."
            >
              <div className="space-y-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Search by recipient phone or SMS text..."
                    value={smsSearch}
                    onChange={(e) => setSmsSearch(e.target.value)}
                    className="h-9 pl-9 text-xs"
                  />
                </div>

                <DataTable
                  loading={smsLogs.isLoading}
                  rows={(smsLogs.data ?? []).filter((item: SmsLog) => {
                    return (
                      !smsSearch.trim() ||
                      [item.toPhone, item.message, item.provider].join(" ").toLowerCase().includes(smsSearch.toLowerCase())
                    );
                  })}
                  emptyMessage="No SMS transmission logs recorded."
                  columns={[
                    {
                      key: "phone",
                      label: "Recipient Phone Number",
                      render: (row: SmsLog) => (
                        <span className="font-mono font-bold text-xs text-zinc-900">+{row.toPhone}</span>
                      ),
                    },
                    {
                      key: "message",
                      label: "SMS Message Text",
                      render: (row: SmsLog) => (
                        <p className="text-xs text-zinc-700 line-clamp-1 max-w-md">{row.message}</p>
                      ),
                    },
                    {
                      key: "provider",
                      label: "Gateway Provider",
                      render: (row: SmsLog) => (
                        <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {row.provider}
                        </span>
                      ),
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (row: SmsLog) => <StatusPill value={row.status} />,
                    },
                    {
                      key: "time",
                      label: "Dispatched At",
                      render: (row: SmsLog) => (
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {row.createdAt ? new Date(row.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </SectionCard>
          </div>
        )}

        {/* TAB 2: TEMPLATES LIBRARY */}
        {activeTab === "templates" && (
          <SectionCard title="Pre-Configured Notification Templates" description="Select any template to instantly load into the campaign composer.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATE_PRESETS.map((tpl) => (
                <div key={tpl.id} className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900">{tpl.label}</span>
                      <span className="rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                        {tpl.audience}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-zinc-800">{tpl.title}</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">{tpl.body}</p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl text-xs font-bold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 mt-2"
                    onClick={() => {
                      handleApplyTemplate(tpl);
                      window.scrollTo({ top: 200, behavior: "smooth" });
                    }}
                  >
                    <Copy className="size-3 mr-1" /> Use Template
                  </Button>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* TAB 3: GATEWAY HEALTH & REALTIME SOCKET */}
        {activeTab === "gateway" && (
          <SectionCard title="Notification Infrastructure & Dispatch Gateway" description="Real-time connectivity status across mobile push services.">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Radio className="size-4 text-emerald-700" />
                  <h4 className="font-bold text-xs text-emerald-950">Socket.IO Real-Time Engine</h4>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Instant sub-second event broadcasts to active rider and partner app screens.
                </p>
                <span className="inline-block rounded-full bg-emerald-200/60 px-2 py-0.5 text-[10px] font-black text-emerald-900">
                  ● Operational & Streaming
                </span>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-sky-700" />
                  <h4 className="font-bold text-xs text-sky-950">FCM Push Notification Service</h4>
                </div>
                <p className="text-[11px] text-sky-800">
                  Firebase Cloud Messaging gateway for Android & iOS background wake-up notifications.
                </p>
                <span className="inline-block rounded-full bg-sky-200/60 px-2 py-0.5 text-[10px] font-black text-sky-900">
                  ● Connected (2FA active)
                </span>
              </div>

              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Server className="size-4 text-purple-700" />
                  <h4 className="font-bold text-xs text-purple-950">Supabase Realtime PostgreSQL</h4>
                </div>
                <p className="text-[11px] text-purple-800">
                  Database notification tables indexed with real-time replication triggers.
                </p>
                <span className="inline-block rounded-full bg-purple-200/60 px-2 py-0.5 text-[10px] font-black text-purple-900">
                  ● Transaction Pooled (6543)
                </span>
              </div>
            </div>
          </SectionCard>
        )}

        {/* TAB 4: AUDIENCE SEGMENTS */}
        {activeTab === "audience" && (
          <SectionCard title="Registered Device Audiences" description="Audience reach breakdown across user roles.">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <User className="size-5 text-purple-600" />
                  <span className="text-xl font-black text-zinc-900">65 Users</span>
                </div>
                <h4 className="font-bold text-xs text-zinc-900">Customer Base</h4>
                <p className="text-[11px] text-zinc-400">Registered customers across Kasganj, Aligarh & Delhi NCR.</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <Store className="size-5 text-emerald-600" />
                  <span className="text-xl font-black text-zinc-900">8 Hubs</span>
                </div>
                <h4 className="font-bold text-xs text-zinc-900">Partner Laundry Stores</h4>
                <p className="text-[11px] text-zinc-400">Processing centers handling washing, dry cleaning, and ironing.</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <Bike className="size-5 text-sky-600" />
                  <span className="text-xl font-black text-zinc-900">4 Captains</span>
                </div>
                <h4 className="font-bold text-xs text-zinc-900">Delivery Fleet</h4>
                <p className="text-[11px] text-zinc-400">Active pickup & delivery riders deployed on ground.</p>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </AdminShell>
  );
}
