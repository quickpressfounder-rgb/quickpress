/**
 * QuickPress Email Hub Superpowers:
 * 1. TemplateStudioTab: Visual No-Code Template Editor with Live Responsive Iframe Preview
 * 2. CampaignsTab: Bulk Marketing Broadcast Manager with Audience Segmentation & Rate-Limited Queue
 * 3. ThreadViewer: Interactive Chronological Conversation Thread & Quick Reply
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Palette,
  Megaphone,
  Sparkles,
  Save,
  RotateCcw,
  Send,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Eye,
  RefreshCw,
  Tag,
  Gift,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import {
  fetchTemplates,
  updateTemplate,
  previewTemplate,
  resetTemplate,
  fetchCampaigns,
  createCampaign,
  fetchEmailThread,
  replyToEmail,
  EmailTemplate,
  EmailCampaign,
  EmailLog,
} from "../api/emails";

// ============================================================================
// 1. TEMPLATE STUDIO TAB
// ============================================================================
const COLOR_PRESETS = [
  { label: "Emerald (Default)", hex: "#059669" },
  { label: "Deep Teal", hex: "#0f766e" },
  { label: "Navy Blue", hex: "#1e3a8a" },
  { label: "Royal Indigo", hex: "#4338ca" },
  { label: "Warm Amber", hex: "#d97706" },
  { label: "Burgundy Red", hex: "#991b1b" },
];

export function TemplateStudioTab() {
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({
    queryKey: ["admin", "emails", "templates"],
    queryFn: fetchTemplates,
  });

  const templates = templatesQuery.data || [];
  const [selectedId, setSelectedId] = useState<string>("welcome_email");

  const activeTemplate = templates.find((t) => t.id === selectedId) || templates[0];

  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [subject, setSubject] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [badgeLabel, setBadgeLabel] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#059669");
  const [footerNote, setFooterNote] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Sync form when selected template changes
  useEffect(() => {
    if (activeTemplate) {
      setHeadline(activeTemplate.headline || "");
      setSubheadline(activeTemplate.subheadline || "");
      setSubject(activeTemplate.subject || "");
      setCouponCode(activeTemplate.couponCode || "");
      setBadgeLabel(activeTemplate.badgeLabel || "");
      setPrimaryColor(activeTemplate.primaryColor || "#059669");
      setFooterNote(activeTemplate.footerNote || "");
    }
  }, [activeTemplate]);

  // Debounced live preview fetch
  useEffect(() => {
    if (!selectedId) return;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await previewTemplate(selectedId, {
          headline,
          subheadline,
          subject,
          couponCode,
          badgeLabel,
          primaryColor,
          footerNote,
        });
        if (res.ok && res.html) {
          setPreviewHtml(res.html);
        }
      } catch (err) {
        console.error("Preview error:", err);
      } finally {
        setPreviewLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [selectedId, headline, subheadline, subject, couponCode, badgeLabel, primaryColor, footerNote]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateTemplate(selectedId, {
        headline,
        subheadline,
        subject,
        couponCode,
        badgeLabel,
        primaryColor,
        footerNote,
      }),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Template "${activeTemplate?.name}" saved to database!`);
        queryClient.invalidateQueries({ queryKey: ["admin", "emails", "templates"] });
      } else {
        toast.error(data.error || "Failed to save template.");
      }
    },
    onError: (err: any) => {
      toast.error(`Save failed: ${err.message || err}`);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => resetTemplate(selectedId),
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Template restored to default configuration.`);
        queryClient.invalidateQueries({ queryKey: ["admin", "emails", "templates"] });
      }
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Template Selector & Customizer Form (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Template Selector Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs">
          <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block mb-2">
            Select Template Category ({templates.length})
          </Label>
          <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
            {templates.map((tmpl) => {
              const active = tmpl.id === selectedId;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedId(tmpl.id)}
                  className={`px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between ${
                    active
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs"
                      : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-transparent"
                  }`}
                >
                  <div className="truncate mr-2">
                    <span>{tmpl.name}</span>
                    <span className="block text-[10px] text-zinc-400 font-normal">
                      Audience: {tmpl.audience.toUpperCase()}
                    </span>
                  </div>
                  {tmpl.isCustomized && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold shrink-0">
                      Edited
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Editor Form */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-emerald-600" />
                Customize Branding &amp; Content
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Editing {activeTemplate?.name}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending || !activeTemplate?.isCustomized}
              className="h-7 text-xs border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset Default
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold text-zinc-700">Subject Line</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-white border-zinc-300 text-xs mt-1 text-zinc-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-zinc-700">Banner Headline</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="bg-white border-zinc-300 text-xs mt-1 text-zinc-900"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-zinc-700">Badge Label</Label>
                <Input
                  value={badgeLabel}
                  onChange={(e) => setBadgeLabel(e.target.value)}
                  className="bg-white border-zinc-300 text-xs mt-1 text-zinc-900"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-700">Subheadline Caption</Label>
              <Input
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                className="bg-white border-zinc-300 text-xs mt-1 text-zinc-900"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-700 flex items-center gap-1">
                <Gift className="h-3.5 w-3.5 text-emerald-600" /> Promotional Voucher Code (Optional)
              </Label>
              <Input
                value={couponCode}
                placeholder="e.g. WELCOME50, FESTIVE100"
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="bg-white border-zinc-300 text-xs mt-1 font-mono uppercase text-zinc-900"
              />
            </div>

            {/* Color Palette Selector */}
            <div>
              <Label className="text-xs font-bold text-zinc-700 block mb-1.5">Header Brand Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setPrimaryColor(color.hex)}
                    style={{ backgroundColor: color.hex }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      primaryColor === color.hex ? "scale-115 border-zinc-900 ring-2 ring-emerald-400" : "border-white"
                    }`}
                    title={color.label}
                  />
                ))}
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-24 h-7 text-xs font-mono ml-2 border-zinc-300"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-700">Custom Footer Note</Label>
              <Input
                value={footerNote}
                onChange={(e) => setFooterNote(e.target.value)}
                className="bg-white border-zinc-300 text-xs mt-1 text-zinc-900"
              />
            </div>
          </div>

          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-xs"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save &amp; Deploy to PostgreSQL Database
          </Button>
        </div>
      </div>

      {/* Right: Live Sandboxed Iframe Preview (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-black text-zinc-900">Live Sandboxed Email Preview</h3>
            {previewLoading && <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />}
          </div>
          <span className="text-[11px] font-mono text-zinc-500">600px Responsive Container</span>
        </div>

        <div className="bg-zinc-100 rounded-xl p-3 border border-zinc-200 flex justify-center">
          <iframe
            srcDoc={previewHtml}
            title="Live Email Template Preview"
            className="w-full max-w-[620px] h-[580px] bg-white rounded-xl shadow-xs border border-zinc-200"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. MARKETING CAMPAIGNS TAB
// ============================================================================
export function CampaignsTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("all_customers");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");

  const campaignsQuery = useQuery({
    queryKey: ["admin", "emails", "campaigns"],
    queryFn: fetchCampaigns,
    refetchInterval: 5000, // live poll active campaigns
  });

  const campaigns = campaignsQuery.data || [];

  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Campaign "${title}" successfully queued for dispatch!`);
        setModalOpen(false);
        setTitle("");
        setSubject("");
        setMessage("");
        setCouponCode("");
        queryClient.invalidateQueries({ queryKey: ["admin", "emails", "campaigns"] });
      } else {
        toast.error("Failed to launch campaign broadcast.");
      }
    },
    onError: (err: any) => {
      toast.error(`Broadcast error: ${err.message || err}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-zinc-900 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-600" />
            Bulk Marketing &amp; Announcement Broadcasts
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Deliver segmented promotional offers, voucher discounts, or service alerts with automated rate-limited batch delivery.
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-xs shrink-0"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          Create Campaign Blast
        </Button>
      </div>

      {/* Campaigns Grid / List */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-400">
          <Megaphone className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
          <h3 className="text-sm font-bold text-zinc-700">No campaigns launched yet</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Click "Create Campaign Blast" to send festive vouchers or re-engagement discounts to segmented customer groups.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((camp) => {
            const isSending = camp.status === "sending";
            const isCompleted = camp.status === "completed";
            const percent =
              camp.totalRecipients > 0 ? Math.round((camp.sentCount / camp.totalRecipients) * 100) : 100;

            return (
              <div key={camp.id} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    #{camp.id}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                      isCompleted
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isSending
                        ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {camp.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-black text-zinc-900">{camp.title}</h4>
                  <p className="text-xs text-zinc-500 truncate mt-0.5" title={camp.subject}>
                    {camp.subject}
                  </p>
                </div>

                {camp.couponCode && (
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-bold">
                    Voucher: {camp.couponCode}
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-zinc-500">Delivered</span>
                    <span className="text-zinc-800">
                      {camp.sentCount} / {camp.totalRecipients} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                  <span>Audience: {camp.audience.replace("_", " ").toUpperCase()}</span>
                  <span>{camp.createdAt.slice(0, 10)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white border-zinc-200 text-zinc-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 font-black text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Launch Marketing Campaign
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Deliver branded promotions or vouchers in throttled batches to prevent SMTP quota burnout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-bold text-zinc-800">Campaign Title *</Label>
              <Input
                placeholder="e.g. Weekend Steam Press 20% Off"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white border-zinc-300 text-xs mt-1 text-zinc-900"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-800">Target Audience *</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="bg-white border-zinc-300 text-xs mt-1 text-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200">
                  <SelectItem value="all_customers">All Registered Customers</SelectItem>
                  <SelectItem value="inactive_customers">Inactive Customers (&gt;14 days)</SelectItem>
                  <SelectItem value="all_partners">All Laundromat Partners</SelectItem>
                  <SelectItem value="all_riders">All Delivery Captains</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-800">Email Subject Line *</Label>
              <Input
                placeholder="Subject line seen in recipient inbox"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-white border-zinc-300 text-xs mt-1 text-zinc-900"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-800">Promo Voucher Code (Optional)</Label>
              <Input
                placeholder="e.g. WEEKEND20"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="bg-white border-zinc-300 text-xs mt-1 font-mono uppercase text-zinc-900"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-800">Campaign Message Body *</Label>
              <Textarea
                placeholder="Write your promotional announcement or offer terms here..."
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-white border-zinc-300 text-xs mt-1 text-zinc-900 leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={createMutation.isPending || !title || !subject || !message}
              onClick={() =>
                createMutation.mutate({
                  title,
                  audience,
                  subject,
                  message,
                  couponCode: couponCode || undefined,
                })
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Queue &amp; Launch Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// 3. THREAD VIEWER COMPONENT (Inside Email Detail Sheet)
// ============================================================================
export function ThreadViewer({ emailId, onReply }: { emailId: string; onReply: (email: EmailLog) => void }) {
  const threadQuery = useQuery({
    queryKey: ["admin", "emails", emailId, "thread"],
    queryFn: () => fetchEmailThread(emailId),
    enabled: Boolean(emailId),
  });

  const threadItems = threadQuery.data || [];

  if (threadQuery.isLoading) {
    return (
      <div className="py-8 text-center text-zinc-400 text-xs">
        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-emerald-600" />
        Loading conversation thread...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-bold text-zinc-700 flex items-center justify-between">
        <span>Conversation History ({threadItems.length} message{threadItems.length !== 1 ? "s" : ""})</span>
        <span className="text-[11px] text-zinc-400">Chronological Order</span>
      </div>

      <div className="space-y-3">
        {threadItems.map((item, idx) => {
          const isAdminReply = item.isReply || item.sender.includes("quickpress");
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                isAdminReply ? "bg-emerald-50/50 border-emerald-200" : "bg-zinc-50 border-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className={isAdminReply ? "text-emerald-800" : "text-zinc-900"}>
                  {isAdminReply ? "QuickPress Operations (Admin)" : item.recipientName}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {item.createdAt.slice(0, 16).replace("T", " ")}
                </span>
              </div>
              <div className="font-semibold text-zinc-800">{item.subject}</div>
              <div className="text-zinc-600 line-clamp-3 whitespace-pre-wrap">{item.plainText || "HTML Message"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
