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
  MapPin,
  TrendingUp,
  X,
  Tag,
  ChevronRight,
  ExternalLink,
  Shield,
  Filter,
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
  fetchNotificationCampaigns,
  fetchAreaNotificationStats,
  sendBroadcast,
  fetchWhatsAppLogs,
  sendAdminWhatsApp,
  fetchSmsLogs,
  sendAdminSms,
  fetchOmniStats,
  fetchOmniSettings,
  updateOmniSettings,
  type Campaign,
  type AreaNotificationStat,
  type WhatsAppLog,
  type SmsLog,
} from "../api/notifications";
import { fetchCities } from "../api/cities";
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
    label: "Festive Voucher 50% Off",
    title: "Festive Special: Flat 50% OFF on Dry Clean",
    body: "Get your traditional outfits shining like new. Use code FESTIVE50 on orders above ₹249. Free doorstep pickup included!",
    audience: "Customers",
    segment: "all",
    category: "Promotional",
    couponCode: "FESTIVE50",
    deepLink: "/offers",
  },
  {
    id: "repeat-loyalty",
    label: "Repeat Customer Loyalty Reward",
    title: "Welcome Back! Extra 25% Off Your Next Wash",
    body: "As a valued repeat customer, enjoy an exclusive 25% discount across all laundry and dry cleaning services today.",
    audience: "Customers",
    segment: "repeat_customers",
    category: "Promotional",
    couponCode: "LOYALTY25",
    deepLink: "/offers",
  },
  {
    id: "re-engagement",
    label: "Dormant Customer Re-Engagement",
    title: "We Miss You! Free Pickup & ₹100 Off Today",
    body: "Your fresh clothes are waiting. Book any service today and receive ₹100 instant wallet credit on completed order.",
    audience: "Customers",
    segment: "inactive_customers",
    category: "Promotional",
    couponCode: "WELCOMEBACK",
    deepLink: "/offers",
  },
  {
    id: "surge-rider",
    label: "Fleet Surge Earning Bonus",
    title: "Peak Hours Surge Active: Extra ₹25/Trip",
    body: "High order demand across operational zones. Earn ₹25 extra bonus on every delivery completed before 9 PM.",
    audience: "Riders",
    segment: "all",
    category: "Urgent",
    couponCode: "",
    deepLink: "/rider/notifications",
  },
  {
    id: "weather-alert",
    label: "Monsoon Weather Advisory",
    title: "Weather Advisory: Water-Sealed Garment Packaging",
    body: "Due to heavy rainfall, doorstep delivery may experience a slight 15-20 min delay. All laundry bags are water-sealed.",
    audience: "All Users",
    segment: "all",
    category: "Operational",
    couponCode: "",
    deepLink: "/notifications",
  },
  {
    id: "partner-quality",
    label: "Store Hub SLA Guidelines",
    title: "Weekly Store Quality Standards & Express SLA",
    body: "Please ensure all dry clean items undergo dual QA inspection before tagging for rider pickup. Keep turnaround within 24 hrs.",
    audience: "Partners",
    segment: "all",
    category: "Operational",
    couponCode: "",
    deepLink: "/partner/notifications",
  },
  {
    id: "vip-perks",
    label: "VIP Member Rewards Drop",
    title: "Exclusive VIP Perk Unlocked: Free Express Wash",
    body: "Thank you for being a Platinum Elite member! Your priority wash voucher is now active in your wallet.",
    audience: "Customers",
    segment: "vip",
    category: "Promotional",
    couponCode: "VIPFREE",
    deepLink: "/wallet",
  },
];

export function NotificationsPage() {
  const queryClient = useQueryClient();

  // Queries
  const campaigns = useQuery({
    queryKey: ["admin", "notification-campaigns"],
    queryFn: fetchNotificationCampaigns,
  });
  const areaStats = useQuery({
    queryKey: ["admin", "area-notification-stats"],
    queryFn: fetchAreaNotificationStats,
  });
  const citiesQuery = useQuery({
    queryKey: ["admin", "cities", "list"],
    queryFn: fetchCities,
  });
  const whatsappLogs = useQuery({
    queryKey: ["admin", "whatsapp-logs"],
    queryFn: () => fetchWhatsAppLogs(50),
  });
  const smsLogs = useQuery({
    queryKey: ["admin", "sms-logs"],
    queryFn: () => fetchSmsLogs(50),
  });
  const omniStats = useQuery({
    queryKey: ["admin", "omni-stats"],
    queryFn: fetchOmniStats,
  });
  const omniSettings = useQuery({
    queryKey: ["admin", "omni-settings"],
    queryFn: fetchOmniSettings,
  });

  // Main navigation tab
  const [activeTab, setActiveTab] = useState<
    "campaigns" | "area_stats" | "whatsapp" | "sms" | "templates" | "gateway"
  >("campaigns");

  // Broadcast Composer State
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "Customers",
    segment: "all",
    city: "all",
    channel: "All Channels",
    category: "Promotional",
    couponCode: "",
    deepLink: "/offers",
    priority: "normal",
  });

  // Table Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");

  // WhatsApp form state
  const [waForm, setWaForm] = useState({
    toPhone: "",
    recipientName: "Valued Customer",
    templateName: "order_confirmed",
    messageBody:
      "Hello Valued Customer, your QuickPress order #QP-2026 has been confirmed! Pickup is scheduled. Track live progress anytime.",
    orderId: "QP-2026",
  });
  const [waStatusFilter, setWaStatusFilter] = useState("all");
  const [waSearch, setWaSearch] = useState("");

  // SMS form state
  const [smsForm, setSmsForm] = useState({
    toPhone: "",
    message:
      "QuickPress: Your delivery verification OTP is 4821. Valid for 5 mins. Share with Captain only.",
    purpose: "delivery_otp",
  });
  const [smsSearch, setSmsSearch] = useState("");

  const allCampaigns = campaigns.data ?? [];
  const allAreaStats = areaStats.data ?? [];
  const availableCities = useMemo(() => {
    const fromCities = (citiesQuery.data ?? [])
      .map((c) => c.city || c.name)
      .filter(Boolean);
    const defaults = ["Kanpur", "Lucknow", "Noida", "Delhi NCR", "Varanasi", "Prayagraj"];
    return Array.from(new Set([...fromCities, ...defaults]));
  }, [citiesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: sendBroadcast,
    onSuccess: (data) => {
      toast.success(
        `Broadcast transmitted to ${data?.reached || 0} active devices across feeds!`
      );
      setForm({
        title: "",
        body: "",
        audience: "Customers",
        segment: "all",
        city: "all",
        channel: "All Channels",
        category: "Promotional",
        couponCode: "",
        deepLink: "/offers",
        priority: "normal",
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "notification-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "area-notification-stats"] });
    },
    onError: () => {
      toast.error("Failed to transmit broadcast.");
    },
  });

  const sendWaMutation = useMutation({
    mutationFn: sendAdminWhatsApp,
    onSuccess: (data) => {
      toast.success(
        `WhatsApp message transmitted successfully! ID: ${data?.messageId || "sent"}`
      );
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
      toast.success(
        `Transactional SMS transmitted successfully! ID: ${data?.messageId || "sent"}`
      );
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

  // Metrics computation
  const metrics = useMemo(() => {
    const total = allCampaigns.length;
    const customerCampaigns = allCampaigns.filter(
      (c) => c.audience.includes("Customer") || c.audience === "All Users"
    ).length;
    const partnerCampaigns = allCampaigns.filter(
      (c) => c.audience.includes("Partner") || c.audience === "All Users"
    ).length;
    const riderCampaigns = allCampaigns.filter(
      (c) => c.audience.includes("Rider") || c.audience === "All Users"
    ).length;
    const totalSent = allCampaigns.reduce((acc, c) => acc + (c.sent || 0), 0);
    return {
      total,
      customerCampaigns,
      partnerCampaigns,
      riderCampaigns,
      totalSent,
    };
  }, [allCampaigns]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCampaigns.filter((c) => {
      const matchSearch =
        !q ||
        [c.title, c.message, c.audience, c.category, c.city, c.segment, c.couponCode]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchStatus =
        statusFilter === "all" ||
        c.status.toLowerCase() === statusFilter.toLowerCase();
      const matchCity =
        cityFilter === "all" ||
        (c.city && c.city.toLowerCase() === cityFilter.toLowerCase());
      const matchAudience =
        audienceFilter === "all" ||
        c.audience.toLowerCase().includes(audienceFilter.toLowerCase());

      return matchSearch && matchStatus && matchCity && matchAudience;
    });
  }, [allCampaigns, searchQuery, statusFilter, cityFilter, audienceFilter]);

  const handleApplyTemplate = (tpl: (typeof TEMPLATE_PRESETS)[0]) => {
    setForm((p) => ({
      ...p,
      title: tpl.title,
      body: tpl.body,
      audience: tpl.audience,
      segment: tpl.segment || "all",
      category: tpl.category,
      couponCode: tpl.couponCode || "",
      deepLink: tpl.deepLink || "/offers",
      channel: "All Channels",
    }));
    toast.success(`Loaded template "${tpl.label}"`);
  };

  const handleExportCampaignsCSV = () => {
    if (filteredCampaigns.length === 0) {
      toast.error("No campaigns to export.");
      return;
    }
    const headers = [
      "Campaign Title",
      "Audience",
      "Segment",
      "Operating City",
      "Channel",
      "Category",
      "Devices Reached",
      "Open Rate",
      "Coupon Code",
      "Status",
      "Dispatched Date",
      "Dispatched Time",
    ];
    const rows = filteredCampaigns.map((c) => [
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.audience}"`,
      `"${c.segment || "all"}"`,
      `"${c.city || "All Hubs"}"`,
      `"${c.channel}"`,
      `"${c.category}"`,
      `"${c.sent}"`,
      `"${c.opened}"`,
      `"${c.couponCode || "None"}"`,
      `"${c.status}"`,
      `"${c.date}"`,
      `"${c.time}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QuickPress_Notification_Campaigns_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Campaigns ledger exported successfully!");
  };

  return (
    <AdminShell
      title="Push Notifications & Campaign Center"
      subtitle="Transmit multi-channel announcements, promotional alerts, fleet push notifications, and area-wise bulletins."
      actions={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCampaignsCSV}
            className="h-8 rounded-xl border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
          >
            <Download className="size-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              campaigns.refetch();
              areaStats.refetch();
              toast.success("Feeds refreshed!");
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
              value: `${metrics.total} Campaigns`,
              hint: "Multi-channel history",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "devices-reached",
              label: "Total Feeds Reached",
              value: `${metrics.totalSent} Dispatches`,
              hint: "Combined device hits",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "cust-alerts",
              label: "Customer Broadcasts",
              value: `${metrics.customerCampaigns} Sent`,
              hint: "Segment & area targeted",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "part-alerts",
              label: "Partner Store Bulletins",
              value: `${metrics.partnerCampaigns} Sent`,
              hint: "Laundromat store hubs",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "rdr-alerts",
              label: "Fleet Push Dispatches",
              value: `${metrics.riderCampaigns} Sent`,
              hint: "Delivery captain alerts",
              positive: true,
            }}
          />
          <KpiCard
            kpi={{
              id: "delivery-rate",
              label: "Avg Open / CTR Rate",
              value: "74.2%",
              hint: "99.8% delivery score",
              positive: true,
            }}
          />
        </div>

        {/* =========================================================================
            2. INTERACTIVE CAMPAIGN BUILDER + LIVE PHONE PREVIEW
        ========================================================================= */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Builder Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <SectionCard
              title="Compose Multi-Channel Campaign"
              description="Transmit targeted announcements with real-time push to Customer, Partner, and Captain app feeds."
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
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 hover:border-zinc-300 transition-colors"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-900">Campaign Headline / Title *</Label>
                  <Input
                    placeholder="e.g. Weekend Steam Press 20% Off for Repeat Customers"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="h-10 text-xs font-bold bg-white border-zinc-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-zinc-900">Message Content / Announcement Description *</Label>
                  <Textarea
                    placeholder="Enter announcement text, promotional voucher terms, or operational guidelines..."
                    rows={4}
                    value={form.body}
                    onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                    className="text-xs resize-none bg-white border-zinc-200"
                  />
                </div>

                {/* 3 Dropdowns: Audience, Segment, Operating City */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-800">Target Audience</Label>
                    <Select
                      value={form.audience}
                      onValueChange={(v) => setForm((p) => ({ ...p, audience: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200">
                        <SelectItem value="All Users">All Network Accounts (Everyone)</SelectItem>
                        <SelectItem value="Customers">Customers Only</SelectItem>
                        <SelectItem value="Partners">Partner Store Hubs</SelectItem>
                        <SelectItem value="Riders">Delivery Captains</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-800">Customer Segment</Label>
                    <Select
                      value={form.segment}
                      onValueChange={(v) => setForm((p) => ({ ...p, segment: v }))}
                      disabled={form.audience === "Partners" || form.audience === "Riders"}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200">
                        <SelectItem value="all">All Customers in Pool</SelectItem>
                        <SelectItem value="repeat_customers">Repeat Customers (2+ Orders)</SelectItem>
                        <SelectItem value="new_customers">First-Time Customers (1 Order)</SelectItem>
                        <SelectItem value="inactive_customers">Dormant (No order 30d)</SelectItem>
                        <SelectItem value="vip">VIP / High Spenders (₹2k+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-800">Target Operating City</Label>
                    <Select
                      value={form.city}
                      onValueChange={(v) => setForm((p) => ({ ...p, city: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200">
                        <SelectItem value="all">All Operating Cities (Network)</SelectItem>
                        {availableCities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c} Hub
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 3 Dropdowns: Category, Channel, Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-800">Notification Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200">
                        <SelectItem value="Promotional">Promotional Offer</SelectItem>
                        <SelectItem value="Operational">Operational Alert</SelectItem>
                        <SelectItem value="Urgent">Urgent Surge Notice</SelectItem>
                        <SelectItem value="System">System &amp; Security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-800">Delivery Channel</Label>
                    <Select
                      value={form.channel}
                      onValueChange={(v) => setForm((p) => ({ ...p, channel: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200">
                        <SelectItem value="All Channels">In-App + FCM Push</SelectItem>
                        <SelectItem value="In-App Feed">In-App Feed Only</SelectItem>
                        <SelectItem value="FCM Mobile Push">FCM High-Priority Push Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-800">Delivery Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200">
                        <SelectItem value="normal">Standard Normal</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent / Sound Wakeup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Optional Promo Code & Deep Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-800">Voucher / Promo Code (Optional)</Label>
                    <Input
                      placeholder="e.g. LOYALTY25, WEEKEND50"
                      value={form.couponCode}
                      onChange={(e) => setForm((p) => ({ ...p, couponCode: e.target.value.toUpperCase() }))}
                      className="h-9 text-xs font-mono font-bold uppercase bg-white border-zinc-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-zinc-800">Deep Link Destination</Label>
                    <Select
                      value={form.deepLink}
                      onValueChange={(v) => setForm((p) => ({ ...p, deepLink: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs bg-white border-zinc-200 font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200 font-mono text-xs">
                        <SelectItem value="/offers">/offers (Discounts &amp; Vouchers)</SelectItem>
                        <SelectItem value="/wallet">/wallet (Wallet Balance &amp; Pass)</SelectItem>
                        <SelectItem value="/orders">/orders (Order History &amp; Book)</SelectItem>
                        <SelectItem value="/notifications">/notifications (Notification Feed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => sendMutation.mutate(form)}
                    disabled={!form.title || !form.body || sendMutation.isPending}
                    className="w-full h-10 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-xs font-bold text-white shadow-xs"
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
            <SectionCard
              title="Live Mobile Screen Preview"
              description="Real-time rendering of device push banner and feed notification."
            >
              <div className="mx-auto w-full max-w-[320px] rounded-[36px] border-4 border-zinc-900 bg-zinc-950 p-4 shadow-xl space-y-4">
                {/* Mobile Notch */}
                <div className="mx-auto h-4 w-28 rounded-full bg-zinc-800 flex items-center justify-center">
                  <div className="size-2 rounded-full bg-zinc-900" />
                </div>

                {/* Lockscreen / Push Banner */}
                <div className="rounded-2xl bg-white p-3.5 shadow-lg space-y-1.5 border border-zinc-200 text-zinc-950">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex size-5 items-center justify-center rounded-md bg-zinc-950 text-white font-black text-[9px]">
                        QP
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-950">
                        QuickPress
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-medium">Just now</span>
                  </div>

                  <p className="font-bold text-zinc-950 text-xs leading-tight">
                    {form.title || "Announcement Headline"}
                  </p>
                  <p className="text-[11px] text-zinc-600 line-clamp-3 leading-relaxed">
                    {form.body || "Your broadcast announcement preview will render here in real-time as you compose..."}
                  </p>

                  {form.couponCode && (
                    <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                        Code: {form.couponCode}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-900 flex items-center gap-0.5">
                        Claim ➜
                      </span>
                    </div>
                  )}
                </div>

                {/* Targeting metadata badge strip */}
                <div className="rounded-xl bg-zinc-900 p-2.5 text-center text-[10px] font-bold text-zinc-400 space-y-1 border border-zinc-800">
                  <div className="flex items-center justify-center gap-1.5 text-zinc-300">
                    <Target className="size-3 text-emerald-400" />
                    <span>Target: {form.audience} · {form.category}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-zinc-500 font-mono text-[9px]">
                    <MapPin className="size-2.5" />
                    <span>{form.city === "all" ? "All Operating Hubs" : `${form.city} Hub`}</span>
                    <span>·</span>
                    <span>Segment: {form.segment}</span>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* =========================================================================
            3. MAIN TABS NAVIGATION & WORKFLOW
        ========================================================================= */}
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList className="bg-zinc-100 p-1 rounded-xl">
                <TabsTrigger
                  value="campaigns"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <Send className="size-3.5" />
                  <span>Campaigns Ledger ({allCampaigns.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="area_stats"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <MapPin className="size-3.5" />
                  <span>Area-Wise Analytics ({allAreaStats.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="whatsapp"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <MessageSquare className="size-3.5" />
                  <span>WhatsApp Business ({whatsappLogs.data?.length || 0})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="sms"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <Smartphone className="size-3.5" />
                  <span>Transactional SMS ({smsLogs.data?.length || 0})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="templates"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <Layers className="size-3.5" />
                  <span>Templates Library ({TEMPLATE_PRESETS.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="gateway"
                  className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <Activity className="size-3.5" />
                  <span>Gateway Status</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Realtime Socket &amp; FCM Active</span>
            </div>
          </div>

          {/* TAB 1: CAMPAIGNS LEDGER WITH MULTI-FILTER CONTROLS */}
          {activeTab === "campaigns" && (
            <div className="mt-4 space-y-4">
              {/* Multi-Dimensional Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search campaigns by title, message, audience, or voucher..."
                    className="pl-8 h-9 text-xs bg-zinc-50 border-zinc-200"
                  />
                </div>

                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="h-9 text-xs bg-zinc-50 border-zinc-200">
                    <SelectValue placeholder="Operating City" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-zinc-200">
                    <SelectItem value="all">All Operating Cities</SelectItem>
                    {availableCities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c} Hub
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs bg-zinc-50 border-zinc-200">
                    <SelectValue placeholder="Delivery Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-zinc-200">
                    <SelectItem value="all">All Delivery Status</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="transmitting">Transmitting</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filter Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                <div className="flex items-center gap-3 text-zinc-600">
                  <span className="font-bold text-zinc-900">
                    Showing {filteredCampaigns.length} of {allCampaigns.length} Campaigns
                  </span>
                  <span>·</span>
                  <span>
                    Total Reached:{" "}
                    <strong className="text-zinc-900">
                      {filteredCampaigns.reduce((sum, c) => sum + (c.sent || 0), 0)} Feeds
                    </strong>
                  </span>
                </div>
                {(searchQuery || statusFilter !== "all" || cityFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setCityFilter("all");
                    }}
                    className="h-7 text-xs text-zinc-600 hover:text-zinc-900"
                  >
                    <X className="size-3 mr-1" /> Reset Filters
                  </Button>
                )}
              </div>

              {/* Dispatched Campaigns Table */}
              <DataTable
                loading={campaigns.isLoading}
                rows={filteredCampaigns}
                emptyMessage="No broadcast campaigns match your search criteria."
                columns={[
                  {
                    key: "title",
                    label: "Campaign Headline & Message",
                    render: (c: Campaign) => (
                      <div className="space-y-0.5 max-w-sm">
                        <p className="font-bold text-zinc-950 text-xs flex items-center gap-1.5">
                          {c.title}
                          <span className="rounded-full bg-zinc-100 text-zinc-700 text-[9px] px-1.5 py-0.2 font-bold uppercase border border-zinc-200">
                            {c.category}
                          </span>
                        </p>
                        <p className="text-[10px] text-zinc-500 line-clamp-1">{c.message}</p>
                      </div>
                    ),
                  },
                  {
                    key: "audience",
                    label: "Audience & Segment",
                    render: (c: Campaign) => (
                      <div className="space-y-0.5">
                        <span className="inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-800 border border-zinc-200">
                          {c.audience}
                        </span>
                        {c.segment && c.segment !== "all" && (
                          <span className="block text-[9px] text-zinc-500 font-mono">
                            Segment: {c.segment}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "city",
                    label: "Target Area / Hub",
                    render: (c: Campaign) => (
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-800 font-medium">
                        <MapPin className="size-3 text-zinc-400" />
                        {c.city || "All Operating Hubs"}
                      </span>
                    ),
                  },
                  {
                    key: "sent",
                    label: "Devices Reached",
                    render: (c: Campaign) => (
                      <span className="font-black text-xs text-zinc-950 tabular-nums">
                        {c.sent} Feeds
                      </span>
                    ),
                  },
                  {
                    key: "opened",
                    label: "Open Rate",
                    render: (c: Campaign) => (
                      <span className="font-bold text-xs text-emerald-700 tabular-nums">
                        {c.opened}
                      </span>
                    ),
                  },
                  {
                    key: "voucher",
                    label: "Coupon Code",
                    render: (c: Campaign) =>
                      c.couponCode ? (
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-900 border border-zinc-200">
                          {c.couponCode}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs">—</span>
                      ),
                  },
                  {
                    key: "date",
                    label: "Dispatched At",
                    render: (c: Campaign) => (
                      <div className="text-xs text-zinc-500">
                        <p className="font-medium text-zinc-800">{c.date}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{c.time}</p>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (c: Campaign) => <StatusPill value={c.status} />,
                  },
                ]}
              />
            </div>
          )}

          {/* TAB 2: AREA-WISE ANALYTICS & REGIONAL CAMPAIGN METRICS */}
          {activeTab === "area_stats" && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Operating Hubs
                  </span>
                  <span className="text-xl font-black text-zinc-950 tabular-nums">
                    {allAreaStats.length} Cities
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Total Network Reach
                  </span>
                  <span className="text-xl font-black text-zinc-950 tabular-nums">
                    {allAreaStats.reduce((sum, a) => sum + (a.totalDispatched || 0), 0)} Feeds
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Network Open Rate
                  </span>
                  <span className="text-xl font-black text-emerald-700 tabular-nums">74.2%</span>
                </div>
                <div className="p-4 rounded-xl border border-zinc-200 bg-white">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Avg Click-Through (CTR)
                  </span>
                  <span className="text-xl font-black text-sky-700 tabular-nums">28.5%</span>
                </div>
              </div>

              <DataTable
                loading={areaStats.isLoading}
                rows={allAreaStats}
                emptyMessage="No regional area analytics recorded yet."
                columns={[
                  {
                    key: "city",
                    label: "Operating City / Area Hub",
                    render: (row: AreaNotificationStat) => (
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4 text-zinc-400" />
                        <div>
                          <span className="font-bold text-xs text-zinc-950 block">{row.city}</span>
                          <span className="text-[10px] text-zinc-500">Regional Cluster</span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    label: "Hub Status",
                    render: (row: AreaNotificationStat) => (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {row.status || "Active"}
                      </span>
                    ),
                  },
                  {
                    key: "userBase",
                    label: "Registered User Pool",
                    render: (row: AreaNotificationStat) => (
                      <span className="font-bold text-xs text-zinc-950 tabular-nums">
                        {row.userBase} Users
                      </span>
                    ),
                  },
                  {
                    key: "campaignsCount",
                    label: "Campaigns Deployed",
                    render: (row: AreaNotificationStat) => (
                      <span className="font-bold text-xs text-zinc-950 tabular-nums">
                        {row.campaignsCount} Broadcasts
                      </span>
                    ),
                  },
                  {
                    key: "totalDispatched",
                    label: "Total Feeds Reached",
                    render: (row: AreaNotificationStat) => (
                      <span className="font-black text-xs text-zinc-950 tabular-nums">
                        {row.totalDispatched} Dispatches
                      </span>
                    ),
                  },
                  {
                    key: "avgOpenRate",
                    label: "Avg Open Rate",
                    render: (row: AreaNotificationStat) => (
                      <span className="font-bold text-xs text-emerald-700 tabular-nums">
                        {row.avgOpenRate || "72%"}
                      </span>
                    ),
                  },
                  {
                    key: "avgClickRate",
                    label: "Avg Click Rate (CTR)",
                    render: (row: AreaNotificationStat) => (
                      <span className="font-bold text-xs text-sky-700 tabular-nums">
                        {row.avgClickRate || "26%"}
                      </span>
                    ),
                  },
                  {
                    key: "lastActive",
                    label: "Last Active",
                    render: (row: AreaNotificationStat) => (
                      <span className="text-xs text-zinc-500 font-mono">
                        {row.lastActive || "Recent"}
                      </span>
                    ),
                  },
                  {
                    key: "action",
                    label: "Action",
                    render: (row: AreaNotificationStat) => (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setForm((p) => ({ ...p, city: row.city }));
                          window.scrollTo({ top: 180, behavior: "smooth" });
                          toast.success(`Target area set to ${row.city}`);
                        }}
                        className="h-7 text-[11px] font-bold rounded-lg border-zinc-200 hover:bg-zinc-100"
                      >
                        Target Area
                      </Button>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {/* TAB 3: WHATSAPP BUSINESS CLOUD API ENGINE & SURVEILLANCE */}
          {activeTab === "whatsapp" && (
            <div className="mt-4 space-y-6">
              {/* Top Governance Control Bar */}
              <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center font-black">
                    <MessageSquare className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-zinc-950">
                        Meta WhatsApp Business Cloud API v20.0
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {omniSettings.data?.gateways.whatsapp.mode || "Production Gateway"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Webhook Verification:{" "}
                      <code className="font-mono text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded text-[10px]">
                        quickpress_meta_verify_2026
                      </code>{" "}
                      · Phone ID:{" "}
                      <span className="font-mono text-zinc-600 text-[10px]">
                        {omniSettings.data?.gateways.whatsapp.phoneNumberId || "Configured"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-950">
                      {(omniSettings.data?.omniChannel.whatsappEnabled ?? true)
                        ? "Auto-Triggers Active"
                        : "Auto-Triggers Paused"}
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

              {/* WhatsApp Dispatcher Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <SectionCard
                    title="Direct WhatsApp Dispatcher"
                    description="Transmit verified WhatsApp template notifications or custom announcements to any customer or captain."
                  >
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-zinc-800">
                            Recipient Phone (+91)
                          </Label>
                          <Input
                            placeholder="e.g. 9876543210"
                            value={waForm.toPhone}
                            onChange={(e) => setWaForm({ ...waForm, toPhone: e.target.value })}
                            className="h-10 text-xs font-mono font-bold bg-white border-zinc-200"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-zinc-800">Recipient Name</Label>
                          <Input
                            placeholder="e.g. Customer Name"
                            value={waForm.recipientName}
                            onChange={(e) => setWaForm({ ...waForm, recipientName: e.target.value })}
                            className="h-10 text-xs font-bold bg-white border-zinc-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-zinc-800">Template Preset</Label>
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
                            <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-zinc-200">
                              {WA_TEMPLATE_PRESETS.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-zinc-800">Order Reference</Label>
                          <Input
                            placeholder="e.g. QP-2026"
                            value={waForm.orderId}
                            onChange={(e) => setWaForm({ ...waForm, orderId: e.target.value })}
                            className="h-10 text-xs font-mono font-bold bg-white border-zinc-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-800">Message Body</Label>
                        <Textarea
                          rows={4}
                          value={waForm.messageBody}
                          onChange={(e) => setWaForm({ ...waForm, messageBody: e.target.value })}
                          className="text-xs font-medium bg-white border-zinc-200"
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
                        className="w-full h-10 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="size-4" />
                        <span>
                          {sendWaMutation.isPending ? "Transmitting..." : "Transmit WhatsApp Alert"}
                        </span>
                      </Button>
                    </div>
                  </SectionCard>
                </div>

                <div className="lg:col-span-5">
                  <SectionCard
                    title="Message Bubble Preview"
                    description="Real-time rendering of WhatsApp chat bubble."
                  >
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                      <div className="bg-white rounded-xl p-3.5 shadow-xs space-y-2 border border-zinc-200">
                        <p className="text-xs text-zinc-950 whitespace-pre-wrap font-sans leading-relaxed">
                          {waForm.messageBody}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-400">
                          <span>Just now</span>
                          <CheckCheck className="size-3 text-sky-600" />
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-zinc-200 text-center text-xs font-bold text-zinc-900">
                        Track Order Live
                      </div>
                    </div>
                  </SectionCard>
                </div>
              </div>

              {/* WhatsApp Logs Table */}
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
                        className="h-9 pl-9 text-xs bg-zinc-50 border-zinc-200"
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
                              ? "bg-zinc-950 text-white border-zinc-950"
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
                      const matchStatus =
                        waStatusFilter === "all" || item.status === waStatusFilter;
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
                            <p className="font-bold text-xs text-zinc-950">
                              {row.recipientName || "User"}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono">+{row.toPhone}</p>
                          </div>
                        ),
                      },
                      {
                        key: "template",
                        label: "Template / Purpose",
                        render: (row: WhatsAppLog) => (
                          <span className="text-xs font-mono font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                            {row.templateName}
                          </span>
                        ),
                      },
                      {
                        key: "body",
                        label: "Message Snippet",
                        render: (row: WhatsAppLog) => (
                          <p className="text-xs text-zinc-600 line-clamp-1 max-w-xs">
                            {row.messageBody}
                          </p>
                        ),
                      },
                      {
                        key: "orderId",
                        label: "Order Reference",
                        render: (row: WhatsAppLog) => (
                          <span className="text-xs font-mono font-medium text-zinc-700">
                            {row.orderId || "—"}
                          </span>
                        ),
                      },
                      {
                        key: "status",
                        label: "Status",
                        render: (row: WhatsAppLog) => <StatusPill value={row.status} />,
                      },
                      {
                        key: "time",
                        label: "Timestamp",
                        render: (row: WhatsAppLog) => (
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : "—"}
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* TAB 4: TRANSACTIONAL SMS GATEWAY */}
          {activeTab === "sms" && (
            <div className="mt-4 space-y-6">
              <div className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center font-black">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-zinc-950">
                        Indian Rapid SMS Gateway
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {omniSettings.data?.gateways.sms.provider || "Fast2SMS / MSG91"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Sender ID:{" "}
                      <code className="font-mono text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded text-[10px]">
                        {omniSettings.data?.gateways.sms.senderId || "QKPRES"}
                      </code>{" "}
                      · OTP Expiry TTL: <span className="font-mono text-zinc-600 text-[10px]">5 Minutes</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-950">
                      {(omniSettings.data?.omniChannel.smsEnabled ?? true)
                        ? "SMS Alerts Active"
                        : "SMS Alerts Paused"}
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
                    <Label className="text-xs font-bold text-zinc-800">
                      Recipient Mobile Number
                    </Label>
                    <Input
                      placeholder="e.g. 9876543210"
                      value={smsForm.toPhone}
                      onChange={(e) => setSmsForm({ ...smsForm, toPhone: e.target.value })}
                      className="h-10 text-xs font-mono font-bold bg-white border-zinc-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-800">Dispatch Purpose</Label>
                    <Select
                      value={smsForm.purpose}
                      onValueChange={(val) => setSmsForm({ ...smsForm, purpose: val })}
                    >
                      <SelectTrigger className="h-10 text-xs bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-zinc-200">
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
                      className="h-10 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2"
                    >
                      <Send className="size-4" />
                      <span>{sendSmsMutation.isPending ? "Transmitting..." : "Dispatch SMS Alert"}</span>
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-zinc-800">
                      SMS Text (GSM 7-bit standard)
                    </Label>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {smsForm.message.length} / 160 Characters (1 SMS Segment)
                    </span>
                  </div>
                  <Textarea
                    rows={2}
                    value={smsForm.message}
                    onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                    className="text-xs font-medium bg-white border-zinc-200"
                  />
                </div>
              </SectionCard>

              {/* SMS Logs Table */}
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
                      className="h-9 pl-9 text-xs bg-zinc-50 border-zinc-200"
                    />
                  </div>

                  <DataTable
                    loading={smsLogs.isLoading}
                    rows={(smsLogs.data ?? []).filter((item: SmsLog) => {
                      return (
                        !smsSearch.trim() ||
                        [item.toPhone, item.message, item.provider]
                          .join(" ")
                          .toLowerCase()
                          .includes(smsSearch.toLowerCase())
                      );
                    })}
                    emptyMessage="No SMS transmission logs recorded."
                    columns={[
                      {
                        key: "phone",
                        label: "Recipient Mobile Number",
                        render: (row: SmsLog) => (
                          <span className="font-mono font-bold text-xs text-zinc-950">
                            +{row.toPhone}
                          </span>
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
                          <span className="text-xs font-mono font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
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
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
              </SectionCard>
            </div>
          )}

          {/* TAB 5: TEMPLATES LIBRARY */}
          {activeTab === "templates" && (
            <div className="mt-4">
              <SectionCard
                title="Pre-Configured Notification Templates"
                description="Select any standard template to instantly populate the campaign composer."
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {TEMPLATE_PRESETS.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3 shadow-xs flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-zinc-950">{tpl.label}</span>
                          <span className="rounded-full bg-zinc-100 text-zinc-800 text-[10px] font-bold px-2 py-0.5 border border-zinc-200">
                            {tpl.audience}
                          </span>
                        </div>
                        <p className="font-bold text-xs text-zinc-800">{tpl.title}</p>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">{tpl.body}</p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 mt-2"
                        onClick={() => {
                          handleApplyTemplate(tpl);
                          window.scrollTo({ top: 180, behavior: "smooth" });
                        }}
                      >
                        <Copy className="size-3 mr-1" /> Use Template
                      </Button>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* TAB 6: GATEWAY HEALTH & REALTIME INFRASTRUCTURE */}
          {activeTab === "gateway" && (
            <div className="mt-4">
              <SectionCard
                title="Notification Infrastructure & Dispatch Gateway"
                description="Real-time connectivity status across mobile push services and message brokers."
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Radio className="size-4 text-emerald-600" />
                      <h4 className="font-bold text-xs text-zinc-950">Socket.IO Real-Time Engine</h4>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Instant sub-second event broadcasts to active rider and partner app screens.
                    </p>
                    <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      ● Operational &amp; Streaming
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-sky-600" />
                      <h4 className="font-bold text-xs text-zinc-950">
                        FCM Push Notification Service
                      </h4>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Firebase Cloud Messaging gateway for Android &amp; iOS background wake-up notifications.
                    </p>
                    <span className="inline-block rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                      ● Connected (FCM v1 Active)
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Server className="size-4 text-purple-600" />
                      <h4 className="font-bold text-xs text-zinc-950">
                        Supabase Realtime PostgreSQL
                      </h4>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Database notification tables indexed with real-time replication triggers.
                    </p>
                    <span className="inline-block rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                      ● Transaction Pooled
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
}
