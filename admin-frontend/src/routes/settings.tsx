import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Save,
  ExternalLink,
  Copy,
  Sparkles,
  Globe,
  Mail,
  Phone,
  MapPin,
  Award,
  PenTool,
  FileCheck,
  Lock,
  RefreshCw,
  Eye,
  AlertCircle,
  Loader2,
  Check,
  FileCheck2,
  BadgeAlert,
  Scale,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { AdminShell } from "../components/AdminShell";
import {
  fetchSettings,
  saveSettings,
  type AdminSettings,
  type CompanyLegalSettings,
} from "../api/settings";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";
import { cn } from "@/shared/lib/utils";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Corporate Legal Profile & Statutory Documents",
      "Single source of truth for QuickPress corporate legal identity, GSTIN, CIN, PAN, registered office address, and statutory documents across all invoices, bills, reports, and public portals."
    ),
  component: SettingsPage,
});

type SettingsTab = "profile" | "entity" | "contact" | "signatory" | "documents" | "policies";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("entity");
  const [previewMode, setPreviewMode] = useState<"invoice" | "letterhead" | "b2b">("invoice");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["admin", "settings", "global"],
    queryFn: () => fetchSettings("global"),
    staleTime: 10 * 1000,
  });

  const [draft, setDraft] = useState<AdminSettings | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(structuredClone(settingsQuery.data));
    }
  }, [settingsQuery.data]);

  const company: CompanyLegalSettings = useMemo(() => {
    if (!draft?.company) {
      return {
        brandName: "QuickPress",
        tagline: "Hyperlocal On-Demand Laundry & Garment Care Platform",
        legalName: "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED",
        cin: "U74999UP2024PTC198141",
        pan: "AADCB1234K",
        gstin: "09AADCB1234K1Z8",
        registeredAddress: "0, Jail Road, Nagla Beni, Near Gadda Factory, Kaliyanpur, Kasganj, Uttar Pradesh - 207123, India",
        operatingAddress: "0, Jail Road, Nagla Beni, Near Gadda Factory, Kaliyanpur, Kasganj, Uttar Pradesh - 207123, India",
        supportEmail: "official.quickpress@gmail.com",
        corporateEmail: "info@withquickpress.com",
        legalEmail: "legal@withquickpress.com",
        supportPhone: "+91 90000 00000",
        tollFreePhone: "1800 012 3456",
        grievanceOfficerName: "Himanshu Pal",
        grievanceOfficerPhone: "+91 90000 00000",
        authorizedSignatoryName: "Himanshu Pal",
        authorizedSignatoryDesignation: "Director & Authorized Signatory",
        digitalSignatureUrl: "",
        companySealUrl: "",
        state: "Uttar Pradesh",
        stateCode: "09",
        websiteUrl: "https://withquickpress.com",
        privacyPolicyUrl: "https://withquickpress.com/#privacy",
        termsUrl: "https://withquickpress.com/#terms",
        grievanceUrl: "https://withquickpress.com/#contact",
        refundPolicyUrl: "https://withquickpress.com/#refund",
        coiDocUrl: "",
        gstCertDocUrl: "",
        panCardDocUrl: "",
        msmeDocUrl: "",
      };
    }
    return draft.company;
  }, [draft]);

  const updateCompanyField = (field: keyof CompanyLegalSettings, value: string) => {
    setDraft((prev) => {
      if (!prev) return null;
      const updatedCompany = { ...prev.company, [field]: value };
      return {
        ...prev,
        company: updatedCompany,
        // Synchronize top-level aliases immediately
        platform: {
          ...prev.platform,
          platformName: updatedCompany.brandName || prev.platform.platformName,
          supportEmail: updatedCompany.supportEmail || prev.platform.supportEmail,
          supportPhone: updatedCompany.supportPhone || prev.platform.supportPhone,
        },
        business: {
          ...prev.business,
          legalName: updatedCompany.legalName || prev.business.legalName,
          gstin: updatedCompany.gstin || prev.business.gstin,
          address: updatedCompany.registeredAddress || prev.business.address,
        },
      };
    });
  };

  const isDirty = useMemo(() => {
    if (!draft || !settingsQuery.data) return false;
    return JSON.stringify(draft.company) !== JSON.stringify(settingsQuery.data.company);
  }, [draft, settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (newSettings: AdminSettings) => saveSettings({ settings: newSettings, scope: "global" }),
    onSuccess: () => {
      toast.success("Corporate Profile & Statutory Legal Documents saved live across QuickPress! 🎉");
      settingsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(`Failed to save settings: ${err?.message || "Server error"}`);
    },
  });

  // Copy to clipboard helper
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Keyboard shortcut for Cmd+S / Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (draft && isDirty && !saveMutation.isPending) {
          saveMutation.mutate(draft);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [draft, isDirty, saveMutation]);

  return (
    <AdminShell title="Settings">
      <div className="space-y-6 pb-28 max-w-7xl mx-auto px-4 sm:px-6">
        {/* =========================================================================
            1. HEADER & CENTRAL RECONCILIATION HUD
        ========================================================================= */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black uppercase tracking-wider">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>Single Source of Truth · Central Legal Engine</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
                <span>Corporate Legal Entity &amp; Statutory Profile</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-3xl leading-relaxed">
                Configure your official company name, CIN, PAN, GSTIN, registered office, and authorized signatory. 
                Any details saved here automatically propagate across all <strong>customer bills, Rapido-style 3-way invoices, partner B2B statements, GSTR filings, emails</strong>, and corporate footers.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => settingsQuery.refetch()}
                disabled={settingsQuery.isFetching}
                className="h-9 px-3 text-xs font-bold rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
              >
                <RefreshCw className={cn("size-3.5 mr-1.5", settingsQuery.isFetching && "animate-spin")} />
                <span>Refresh Sync</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (draft) saveMutation.mutate(draft);
                }}
                disabled={!isDirty || saveMutation.isPending}
                className={cn(
                  "h-9 px-4 text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5",
                  isDirty
                    ? "bg-zinc-950 text-white hover:bg-zinc-800"
                    : "bg-zinc-100 text-zinc-400 border border-zinc-200/80 cursor-not-allowed"
                )}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving to Cloud...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    <span>Save All Changes (⌘S)</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Telemetry Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-zinc-100">
            <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/70 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                <span>BRAND NAME</span>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-sm font-black text-zinc-900 truncate">{company.brandName || "QuickPress"}</div>
              <div className="text-[10px] text-zinc-400 font-mono truncate">{company.websiteUrl}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/70 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                <span>GSTIN NUMBER</span>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-sm font-black text-zinc-900 font-mono tracking-tight truncate">{company.gstin || "09AADCB1234K1Z8"}</div>
              <div className="text-[10px] text-emerald-700 font-bold">15-Digit Verified · GSTR-1/3B Active</div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/70 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                <span>CIN / PAN RECORD</span>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-sm font-black text-zinc-900 font-mono tracking-tight truncate">{company.pan || "AADCB1234K"}</div>
              <div className="text-[10px] text-zinc-400 font-mono truncate">CIN: {company.cin || "U74999UP2024PTC198141"}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/70 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                <span>AUTHORIZED SIGNATORY</span>
                <span className="size-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-sm font-black text-zinc-900 truncate">{company.authorizedSignatoryName || "Himanshu Pal"}</div>
              <div className="text-[10px] text-zinc-400 truncate">{company.authorizedSignatoryDesignation || "Director & Signatory"}</div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. LIVE INTERACTIVE STATUTORY LETTERHEAD & INVOICE PREVIEW CARD
        ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200/90 bg-linear-to-b from-zinc-50 to-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                <Printer className="size-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <span>Live Print &amp; Document Letterhead Header Preview</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Auto-Synchronized
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-500">
                  This is the exact statutory header and legal metadata currently rendering on all QuickPress customer bills, PDF downloads, and emails.
                </p>
              </div>
            </div>

            {/* Preview Mode Selector */}
            <div className="inline-flex items-center p-1 rounded-xl bg-zinc-200/60 border border-zinc-200 self-start sm:self-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setPreviewMode("invoice")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all cursor-pointer",
                  previewMode === "invoice" ? "bg-white text-zinc-950 shadow-2xs font-black" : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                Customer Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("b2b")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all cursor-pointer",
                  previewMode === "b2b" ? "bg-white text-zinc-950 shadow-2xs font-black" : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                B2B Partner Statement
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("letterhead")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-all cursor-pointer",
                  previewMode === "letterhead" ? "bg-white text-zinc-950 shadow-2xs font-black" : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                Official Letterhead
              </button>
            </div>
          </div>

          {/* Actual Letterhead Canvas */}
          <div className="p-5 sm:p-6 rounded-xl bg-white border border-zinc-200 shadow-xs relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-indigo-600" />

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-zinc-100">
              <div className="space-y-1">
                <div className="text-xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
                  <span>{company.brandName || "QuickPress"}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-bold border border-zinc-200">
                    Official Issuer
                  </span>
                </div>
                <div className="text-xs font-bold text-zinc-800">{company.legalName || "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED"}</div>
                <div className="text-[11px] text-zinc-500 max-w-xl leading-relaxed">
                  <strong>Regd. Office:</strong> {company.registeredAddress || "0, Jail Road, Nagla Beni, Near Gadda Factory, Kaliyanpur, Kasganj, Uttar Pradesh - 207123, India"}
                </div>
              </div>

              <div className="text-left sm:text-right space-y-0.5 font-mono text-[11px] text-zinc-600 bg-zinc-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-zinc-100">
                <div>
                  <span className="text-zinc-400 font-sans font-bold text-[10px] uppercase">GSTIN: </span>
                  <strong className="text-zinc-950">{company.gstin || "09AADCB1234K1Z8"}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 font-sans font-bold text-[10px] uppercase">PAN: </span>
                  <strong className="text-zinc-900">{company.pan || "AADCB1234K"}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 font-sans font-bold text-[10px] uppercase">CIN: </span>
                  <span className="text-zinc-800">{company.cin || "U74999UP2024PTC198141"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 font-sans font-bold text-[10px] uppercase">Place of Supply: </span>
                  <span className="text-zinc-800">{company.state || "Uttar Pradesh"} ({company.stateCode || "09"})</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-[11px] text-zinc-500 font-medium">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="size-3 text-zinc-400" />
                  <span>{company.supportEmail || "official.quickpress@gmail.com"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="size-3 text-zinc-400" />
                  <span>{company.supportPhone || "+91 90000 00000"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="size-3 text-zinc-400" />
                  <span>{company.websiteUrl || "https://withquickpress.com"}</span>
                </span>
              </div>

              <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                <span>Signatory: {company.authorizedSignatoryName || "Himanshu Pal"}</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">Digitally Certified [QP-SEC-AUT]</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. TAB NAVIGATION BAR
        ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-200 text-xs font-bold">
          {[
            { id: "entity", label: "Corporate Legal & Tax", icon: Building2, desc: "CIN, PAN, GSTIN & Address" },
            { id: "profile", label: "Brand Identity", icon: Sparkles, desc: "Name, Tagline & Web" },
            { id: "contact", label: "Communications & Grievance", icon: Mail, desc: "Emails, Toll-Free & Nodal Officer" },
            { id: "signatory", label: "Signatory & Digital Seal", icon: PenTool, desc: "Director Signature & Seal" },
            { id: "documents", label: "Legal Document Vault", icon: FileCheck2, desc: "COI, GST REG-06, PAN Proofs" },
            { id: "policies", label: "Public Legal Policies", icon: Scale, desc: "Privacy, Terms & Grievance URLs" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap border text-xs",
                  isSelected
                    ? "bg-zinc-950 text-white border-zinc-950 font-black shadow-xs"
                    : "bg-white text-zinc-600 border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                <Icon className={cn("size-3.5", isSelected ? "text-emerald-400" : "text-zinc-400")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            4. ACTIVE TAB CONTENT
        ========================================================================= */}

        {/* TAB 1: CORPORATE LEGAL & TAX */}
        {activeTab === "entity" && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Building2 className="size-4" />
                </span>
                <h4 className="text-sm font-black text-zinc-950">Corporate Entity &amp; Statutory Tax Registrations</h4>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Official statutory details recorded with the Ministry of Corporate Affairs (MCA) and the Goods and Services Tax Network (GSTN).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-800">
                    Registered Corporate Legal Name <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => handleCopy(company.legalName, "Legal Name")}
                    className="text-[10px] text-zinc-400 hover:text-zinc-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <Input
                  value={company.legalName}
                  onChange={(e) => updateCompanyField("legalName", e.target.value.toUpperCase())}
                  placeholder="e.g. QUICKPRESS TECHNOLOGIES PRIVATE LIMITED"
                  className="h-10 text-xs font-black uppercase bg-white font-mono"
                />
                <p className="text-[10px] text-zinc-400">
                  Exact name on Certificate of Incorporation (COI) and PAN card.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-800">
                    Goods &amp; Services Tax (GSTIN) <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => handleCopy(company.gstin, "GSTIN")}
                    className="text-[10px] text-zinc-400 hover:text-zinc-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <Input
                  value={company.gstin}
                  maxLength={15}
                  onChange={(e) => updateCompanyField("gstin", e.target.value.trim().toUpperCase())}
                  placeholder="e.g. 09AADCB1234K1Z8"
                  className="h-10 text-xs font-black uppercase bg-white font-mono tracking-wider"
                />
                <p className="text-[10px] text-zinc-400">
                  15-character statutory GSTIN. Automatically embeds into GSTR-1, GSTR-3B, and all invoice PDFs.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-800">
                    Corporate Identity Number (CIN) <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => handleCopy(company.cin, "CIN")}
                    className="text-[10px] text-zinc-400 hover:text-zinc-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <Input
                  value={company.cin}
                  maxLength={21}
                  onChange={(e) => updateCompanyField("cin", e.target.value.trim().toUpperCase())}
                  placeholder="e.g. U74999UP2024PTC198141"
                  className="h-10 text-xs font-black uppercase bg-white font-mono tracking-wider"
                />
                <p className="text-[10px] text-zinc-400">
                  21-character MCA corporate identifier.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-800">
                    Company PAN (Permanent Account Number) <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => handleCopy(company.pan, "PAN")}
                    className="text-[10px] text-zinc-400 hover:text-zinc-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </button>
                </div>
                <Input
                  value={company.pan}
                  maxLength={10}
                  onChange={(e) => updateCompanyField("pan", e.target.value.trim().toUpperCase())}
                  placeholder="e.g. AADCB1234K"
                  className="h-10 text-xs font-black uppercase bg-white font-mono tracking-wider"
                />
                <p className="text-[10px] text-zinc-400">
                  10-character Income Tax PAN card number.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">State / Place of Supply</Label>
                <Input
                  value={company.state}
                  onChange={(e) => updateCompanyField("state", e.target.value)}
                  placeholder="e.g. Uttar Pradesh"
                  className="h-10 text-xs font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">State where registered office is situated.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">GST State Code</Label>
                <Input
                  value={company.stateCode}
                  maxLength={2}
                  onChange={(e) => updateCompanyField("stateCode", e.target.value)}
                  placeholder="e.g. 09"
                  className="h-10 text-xs font-mono font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Two-digit statutory state prefix (09 for UP, 07 for DL, 27 for MH).</p>
              </div>
            </div>

            {/* Registered & Operating Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-zinc-500" />
                    <span>Registered Corporate Office Address <span className="text-rose-500">*</span></span>
                  </Label>
                </div>
                <Textarea
                  rows={3}
                  value={company.registeredAddress}
                  onChange={(e) => updateCompanyField("registeredAddress", e.target.value)}
                  placeholder="Full statutory postal address with PIN code"
                  className="text-xs bg-white leading-relaxed resize-none font-medium"
                />
                <p className="text-[10px] text-zinc-400">
                  Printed in the legal footer of tax invoices, statutory filings, and partner agreements.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-zinc-500" />
                  <span>Central Operations Hub / Logistics Facility</span>
                </Label>
                <Textarea
                  rows={3}
                  value={company.operatingAddress}
                  onChange={(e) => updateCompanyField("operatingAddress", e.target.value)}
                  placeholder="Physical dispatch hub / central warehouse address"
                  className="text-xs bg-white leading-relaxed resize-none font-medium"
                />
                <p className="text-[10px] text-zinc-400">
                  Address where rider fleet dispatches and physical laundry sorting occurs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BRAND IDENTITY */}
        {activeTab === "profile" && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Sparkles className="size-4" />
                </span>
                <h4 className="text-sm font-black text-zinc-950">Brand Identity &amp; Digital Presence</h4>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Public-facing brand marks, product tagline, and official platform domain.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">
                  Brand Display Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={company.brandName}
                  onChange={(e) => updateCompanyField("brandName", e.target.value)}
                  placeholder="e.g. QuickPress"
                  className="h-10 text-xs font-black bg-white"
                />
                <p className="text-[10px] text-zinc-400">
                  Used across Customer App, Captain App, Partner Portal, and Customer emails.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Tagline / Business Nature</Label>
                <Input
                  value={company.tagline}
                  onChange={(e) => updateCompanyField("tagline", e.target.value)}
                  placeholder="e.g. Hyperlocal On-Demand Laundry & Garment Care Platform"
                  className="h-10 text-xs font-medium bg-white"
                />
                <p className="text-[10px] text-zinc-400">Descriptive tagline displayed on official receipts.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80 md:col-span-2">
                <Label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Globe className="size-3.5 text-zinc-500" />
                  <span>Official Platform Domain / Website URL <span className="text-rose-500">*</span></span>
                </Label>
                <Input
                  value={company.websiteUrl}
                  onChange={(e) => updateCompanyField("websiteUrl", e.target.value)}
                  placeholder="https://withquickpress.com"
                  className="h-10 text-xs font-mono font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Canonical website URL rendered on letterhead and invoice QR codes.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMMUNICATIONS & GRIEVANCE */}
        {activeTab === "contact" && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                  <Mail className="size-4" />
                </span>
                <h4 className="text-sm font-black text-zinc-950">Official Communications &amp; Grievance Redressal</h4>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Official statutory communication channels and mandatory Nodal Grievance Officer disclosures.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Support Email (Customer Care)</Label>
                <Input
                  value={company.supportEmail}
                  onChange={(e) => updateCompanyField("supportEmail", e.target.value)}
                  placeholder="official.quickpress@gmail.com"
                  className="h-10 text-xs font-mono font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Primary support email printed on bills and receipts.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Corporate Affairs Email</Label>
                <Input
                  value={company.corporateEmail}
                  onChange={(e) => updateCompanyField("corporateEmail", e.target.value)}
                  placeholder="info@withquickpress.com"
                  className="h-10 text-xs font-mono font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Corporate correspondence and vendor billing.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Legal &amp; Grievance Email</Label>
                <Input
                  value={company.legalEmail}
                  onChange={(e) => updateCompanyField("legalEmail", e.target.value)}
                  placeholder="legal@withquickpress.com"
                  className="h-10 text-xs font-mono font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Statutory dispute and legal correspondence.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Helpline / Support Phone</Label>
                <Input
                  value={company.supportPhone}
                  onChange={(e) => updateCompanyField("supportPhone", e.target.value)}
                  placeholder="+91 90000 00000"
                  className="h-10 text-xs font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Primary phone number for dispatch queries.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Toll-Free Helpline</Label>
                <Input
                  value={company.tollFreePhone}
                  onChange={(e) => updateCompanyField("tollFreePhone", e.target.value)}
                  placeholder="1800 012 3456"
                  className="h-10 text-xs font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Toll-free helpline for pan-India customer queries.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Grievance Officer Name</Label>
                <Input
                  value={company.grievanceOfficerName}
                  onChange={(e) => updateCompanyField("grievanceOfficerName", e.target.value)}
                  placeholder="e.g. Himanshu Pal"
                  className="h-10 text-xs font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Mandatory under Consumer Protection Rules 2020.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUTHORIZED SIGNATORY */}
        {activeTab === "signatory" && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                  <PenTool className="size-4" />
                </span>
                <h4 className="text-sm font-black text-zinc-950">Authorized Signatory &amp; Executive Seal</h4>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Official officer credentials and digital stamp rendered on invoices, partner contracts, and payout statements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">
                  Authorized Signatory / Director Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={company.authorizedSignatoryName}
                  onChange={(e) => updateCompanyField("authorizedSignatoryName", e.target.value)}
                  placeholder="e.g. Himanshu Pal"
                  className="h-10 text-xs font-black bg-white"
                />
                <p className="text-[10px] text-zinc-400">
                  Printed in the "For QuickPress Technologies (Authorized Signatory)" box on PDFs.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Designation / Role Title</Label>
                <Input
                  value={company.authorizedSignatoryDesignation}
                  onChange={(e) => updateCompanyField("authorizedSignatoryDesignation", e.target.value)}
                  placeholder="Director & Authorized Signatory"
                  className="h-10 text-xs font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Corporate capacity of the signing officer.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Digital Signature Image URL (PNG/SVG)</Label>
                <Input
                  value={company.digitalSignatureUrl || ""}
                  onChange={(e) => updateCompanyField("digitalSignatureUrl", e.target.value)}
                  placeholder="https://.../signature.png (or transparent PNG asset)"
                  className="h-10 text-xs font-mono bg-white"
                />
                <p className="text-[10px] text-zinc-400">
                  Optional transparent signature image rendered on electronic tax invoices.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <Label className="text-xs font-bold text-zinc-800">Company Round Seal Stamp URL</Label>
                <Input
                  value={company.companySealUrl || ""}
                  onChange={(e) => updateCompanyField("companySealUrl", e.target.value)}
                  placeholder="https://.../company_seal.png"
                  className="h-10 text-xs font-mono bg-white"
                />
                <p className="text-[10px] text-zinc-400">
                  Corporate rubber stamp seal placed next to the director's signature.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STATUTORY DOCUMENT VAULT */}
        {activeTab === "documents" && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                  <FileCheck2 className="size-4" />
                </span>
                <h4 className="text-sm font-black text-zinc-950">Statutory Document Vault &amp; Proofs</h4>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Store references and digital copies of your official government registration certificates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-900">Certificate of Incorporation (COI)</Label>
                    <p className="text-[10px] text-zinc-400">MCA Form INC-11 Certificate of Incorporation</p>
                  </div>
                  {company.coiDocUrl ? (
                    <a
                      href={company.coiDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                    >
                      <Eye className="size-3" />
                      <span>View File</span>
                    </a>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                      Not Uploaded
                    </span>
                  )}
                </div>
                <Input
                  value={company.coiDocUrl || ""}
                  onChange={(e) => updateCompanyField("coiDocUrl", e.target.value)}
                  placeholder="https://.../Certificate_of_Incorporation.pdf"
                  className="h-10 text-xs font-mono bg-white"
                />
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-900">GST Registration Certificate (Form REG-06)</Label>
                    <p className="text-[10px] text-zinc-400">Official GST portal 3-page registration certificate</p>
                  </div>
                  {company.gstCertDocUrl ? (
                    <a
                      href={company.gstCertDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                    >
                      <Eye className="size-3" />
                      <span>View File</span>
                    </a>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                      Not Uploaded
                    </span>
                  )}
                </div>
                <Input
                  value={company.gstCertDocUrl || ""}
                  onChange={(e) => updateCompanyField("gstCertDocUrl", e.target.value)}
                  placeholder="https://.../GST_Registration_Certificate_REG06.pdf"
                  className="h-10 text-xs font-mono bg-white"
                />
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-900">Company PAN Card Document</Label>
                    <p className="text-[10px] text-zinc-400">Corporate PAN card copy issued by Income Tax Department</p>
                  </div>
                  {company.panCardDocUrl ? (
                    <a
                      href={company.panCardDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                    >
                      <Eye className="size-3" />
                      <span>View File</span>
                    </a>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                      Not Uploaded
                    </span>
                  )}
                </div>
                <Input
                  value={company.panCardDocUrl || ""}
                  onChange={(e) => updateCompanyField("panCardDocUrl", e.target.value)}
                  placeholder="https://.../Corporate_PAN_Card.pdf"
                  className="h-10 text-xs font-mono bg-white"
                />
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-zinc-900">MSME / Udyam Certificate (Optional)</Label>
                    <p className="text-[10px] text-zinc-400">Ministry of MSME Udyam registration certificate</p>
                  </div>
                  {company.msmeDocUrl ? (
                    <a
                      href={company.msmeDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                    >
                      <Eye className="size-3" />
                      <span>View File</span>
                    </a>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
                      Optional
                    </span>
                  )}
                </div>
                <Input
                  value={company.msmeDocUrl || ""}
                  onChange={(e) => updateCompanyField("msmeDocUrl", e.target.value)}
                  placeholder="https://.../MSME_Udyam_Registration.pdf"
                  className="h-10 text-xs font-mono bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PUBLIC LEGAL POLICIES */}
        {activeTab === "policies" && (
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <Scale className="size-4" />
                </span>
                <h4 className="text-sm font-black text-zinc-950">Statutory Legal Policy URLs</h4>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Official statutory legal URLs displayed in app stores, website footers, and booking confirmations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-800">Privacy Policy URL</Label>
                  <a
                    href={company.privacyPolicyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                  >
                    <ExternalLink className="size-3" />
                    <span>Open Live</span>
                  </a>
                </div>
                <Input
                  value={company.privacyPolicyUrl}
                  onChange={(e) => updateCompanyField("privacyPolicyUrl", e.target.value)}
                  placeholder="https://withquickpress.com/#privacy"
                  className="h-10 text-xs font-mono font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Discloses data handling, location tracking, and retention.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-800">Terms &amp; Conditions URL</Label>
                  <a
                    href={company.termsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                  >
                    <ExternalLink className="size-3" />
                    <span>Open Live</span>
                  </a>
                </div>
                <Input
                  value={company.termsUrl}
                  onChange={(e) => updateCompanyField("termsUrl", e.target.value)}
                  placeholder="https://withquickpress.com/#terms"
                  className="h-10 text-xs font-mono font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">User contract governing pickup, cleaning, and delivery.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-800">Grievance &amp; Contact URL</Label>
                  <a
                    href={company.grievanceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                  >
                    <ExternalLink className="size-3" />
                    <span>Open Live</span>
                  </a>
                </div>
                <Input
                  value={company.grievanceUrl}
                  onChange={(e) => updateCompanyField("grievanceUrl", e.target.value)}
                  placeholder="https://withquickpress.com/#contact"
                  className="h-10 text-xs font-mono font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Nodal escalation desk for regulatory and consumer disputes.</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-800">Return &amp; Refund Policy URL</Label>
                  <a
                    href={company.refundPolicyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1"
                  >
                    <ExternalLink className="size-3" />
                    <span>Open Live</span>
                  </a>
                </div>
                <Input
                  value={company.refundPolicyUrl}
                  onChange={(e) => updateCompanyField("refundPolicyUrl", e.target.value)}
                  placeholder="https://withquickpress.com/#refund"
                  className="h-10 text-xs font-mono font-bold bg-white"
                />
                <p className="text-[10px] text-zinc-400">Governs damaged garments, re-washes, and wallet refunds.</p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            5. FLOATING UNSAVED CHANGES DOCK
        ========================================================================= */}
        {isDirty && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="rounded-2xl bg-zinc-950 text-white p-4 shadow-2xl backdrop-blur-xl border border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <p className="text-xs font-black text-white">
                    Unsaved modifications in Corporate Profile
                  </p>
                  <p className="text-[10px] text-zinc-400">Press ⌘S or click Save to propagate live across all invoices &amp; reports</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (settingsQuery.data) setDraft(structuredClone(settingsQuery.data));
                    toast.info("Changes reverted to previous saved state");
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
                      <span>Saving...</span>
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
