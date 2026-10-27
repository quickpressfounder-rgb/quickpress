/**
 * QuickPress Merchant SLA & Franchise Agreement Console:
 * 1. MerchantAgreementsTab: Surveillance of all bilateral agreements, execution status, and delivery audit.
 * 2. DispatchAgreementModal: 1-Click generation and dispatch of official 3-page signed PDF agreements via Hostinger.
 * 3. PdfPreviewModal: Instant browser inspection of generated bilateral legal documents.
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  FileCheck2,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Download,
  Eye,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  Search,
  Filter,
  Copy,
  Check,
  Scale,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";

import {
  fetchMerchantAgreements,
  dispatchMerchantAgreement,
  resendMerchantAgreement,
  getAgreementPdfUrl,
  type MerchantAgreementRecord,
  type DispatchAgreementPayload,
} from "../api/emails";
import { fetchPartners, type AdminPartner } from "../api/partners";

export function MerchantAgreementsTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "signed" | "pending">("all");
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState("");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // 1. Fetch Agreements Query
  const agreementsQuery = useQuery({
    queryKey: ["admin", "merchant-agreements", searchQuery, statusFilter],
    queryFn: () =>
      fetchMerchantAgreements({
        search: searchQuery.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  const data = agreementsQuery.data?.items || [];
  const stats = agreementsQuery.data?.stats || {
    totalAgreements: 0,
    acceptedCount: 0,
    pendingCount: 0,
    acceptanceRate: 0,
    gateway: "Hostinger Business API (info@withquickpress.com)",
    cc: "official.quickpress@gmail.com",
    signatory: "Himanshu Pal",
  };

  // 2. Resend Mutation
  const resendMutation = useMutation({
    mutationFn: (agreementId: string) => resendMerchantAgreement(agreementId),
    onSuccess: (res) => {
      toast.success(res.message || "Agreement letter re-dispatched to partner email! ✓");
      queryClient.invalidateQueries({ queryKey: ["admin", "merchant-agreements"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to re-dispatch agreement");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Action */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900">
                  Franchise &amp; Merchant SLA Agreements
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200/80">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> IT Act 2000 Section 10A
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Bilateral legal agreements executed with QuickPress seal, authorized signatory Himanshu Pal, and partner signatures.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => setIsDispatchModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all cursor-pointer"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Dispatch Agreement Letter
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "merchant-agreements"] })}
            className="border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 cursor-pointer"
            title="Refresh agreements"
          >
            <RefreshCw className={`h-4 w-4 ${agreementsQuery.isFetching ? "animate-spin text-emerald-600" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 2. Key Legal & Dispatch Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Agreements</span>
            <FileCheck2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-zinc-900">{stats.totalAgreements}</div>
          <p className="mt-1 text-[11px] text-zinc-500">Tracked partner store contracts</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <span>Accepted &amp; Signed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{stats.acceptedCount}</div>
          <p className="mt-1 text-[11px] text-emerald-800 font-semibold">
            {stats.acceptanceRate}% execution rate via Email OTP
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider">
            <span>Awaiting Signature</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">{stats.pendingCount}</div>
          <p className="mt-1 text-[11px] text-amber-800 font-semibold">Pending merchant e-sign</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-bold uppercase tracking-wider">
            <span>Outbound Rail</span>
            <Mail className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-sm font-black text-zinc-900 truncate">Hostinger Business API</div>
          <p className="mt-1 text-[11px] text-zinc-500 truncate">
            CC: {stats.cc}
          </p>
        </div>
      </div>

      {/* 3. Search & Status Filter Controls */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by store name, owner, email or phone..."
            className="pl-9 h-9 text-xs bg-zinc-50/50 border-zinc-300"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-400 mr-1 shrink-0 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Status:
          </span>
          {[
            { id: "all", label: "All Agreements", count: stats.totalAgreements },
            { id: "signed", label: "Accepted & Signed", count: stats.acceptedCount },
            { id: "pending", label: "Pending Sign", count: stats.pendingCount },
          ].map((pill) => {
            const active = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs"
                    : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70 border border-zinc-200"
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    active ? "bg-emerald-200 text-emerald-900" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Agreements Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
        {agreementsQuery.isLoading ? (
          <div className="p-12 text-center text-zinc-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs font-bold">Loading merchant agreements from database...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto text-zinc-400">
              <FileText className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-zinc-900">No agreements found</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery
                ? `No agreements matching "${searchQuery}". Try clearing search.`
                : "No partner agreements recorded yet. You can manually dispatch one to any registered store."}
            </p>
            <Button
              size="sm"
              onClick={() => setIsDispatchModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Dispatch First Agreement
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Merchant Store &amp; Owner</th>
                  <th className="py-3 px-4">Verified Email &amp; CC</th>
                  <th className="py-3 px-4">Agreement Status</th>
                  <th className="py-3 px-4">Signatures &amp; Seal</th>
                  <th className="py-3 px-4">Dispatch Rail</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.map((item) => {
                  const pdfUrl = getAgreementPdfUrl(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/60 transition group">
                      {/* Store & Owner */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 font-black text-zinc-700 uppercase">
                            {item.businessName.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-zinc-900 block truncate group-hover:text-emerald-700 transition">
                              {item.businessName}
                            </span>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 truncate">
                              <span>{item.ownerName}</span>
                              {item.city && <span>· {item.city}</span>}
                              {item.phone && <span>· {item.phone}</span>}
                            </div>
                            <span className="text-[9px] font-mono text-zinc-400 block truncate">
                              {item.agreementId}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Verified Email & CC */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                            <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{item.email || "No email on record"}</span>
                            {item.email && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.email)}
                                className="text-zinc-400 hover:text-zinc-700 cursor-pointer ml-1"
                                title="Copy email"
                              >
                                {copiedEmail === item.email ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <span className="font-bold text-zinc-500">CC:</span>
                            <span className="truncate">{item.ccEmail}</span>
                          </div>
                        </div>
                      </td>

                      {/* Legal Status */}
                      <td className="py-3 px-4">
                        {item.isAccepted ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Digitally Executed ✓
                            </span>
                            {item.signedAt && (
                              <p className="text-[10px] text-zinc-500">
                                Executed: {new Date(item.signedAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              Pending Merchant Sign
                            </span>
                            {item.lastDispatchedAt && (
                              <p className="text-[10px] text-zinc-500">
                                Sent: {new Date(item.lastDispatchedAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Signatures & Seal */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {/* Corporate Seal */}
                          <div className="size-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center p-0.5" title="QuickPress Corporate Seal">
                            <img src="/assets/quickpress-seal.png" alt="Seal" className="max-h-full max-w-full object-contain" />
                          </div>

                          {/* Merchant Sign */}
                          <div className="size-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden p-0.5" title={item.hasSignature ? "Merchant Uploaded Signature" : "Signature Pending"}>
                            {item.signatureUrl ? (
                              <img src={item.signatureUrl} alt="Sign" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <User className="h-4 w-4 text-zinc-400" />
                            )}
                          </div>

                          <div className="text-[10px] text-zinc-500 leading-tight">
                            <span className="font-bold text-zinc-800 block">{stats.signatory || "Himanshu Pal"} · Dir</span>
                            <span>{item.hasSignature ? "Partner Signed ✓" : "Partner Pending"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Dispatch Rail */}
                      <td className="py-3 px-4">
                        <div className="text-[11px]">
                          <span className="font-bold text-zinc-900 block">Hostinger API</span>
                          <span className="text-[10px] text-zinc-500">info@withquickpress.com</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPreviewDocTitle(item.businessName);
                              setPreviewPdfUrl(pdfUrl);
                            }}
                            className="h-7 text-xs px-2.5 border-zinc-200 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                            title="Preview / Inspect 3-page Agreement PDF"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-blue-600" />
                            Preview PDF
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resendMutation.isPending || !item.email}
                            onClick={() => resendMutation.mutate(item.id)}
                            className="h-7 text-xs px-2.5 border-zinc-200 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                            title="Re-send Agreement email to partner"
                          >
                            <RotateCcw className={`h-3.5 w-3.5 mr-1 ${resendMutation.isPending ? "animate-spin" : "text-emerald-600"}`} />
                            Re-send
                          </Button>

                          <a
                            href={pdfUrl}
                            download={`QuickPress-Agreement-${item.businessName}.pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center size-7 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. PDF Preview Modal */}
      {previewPdfUrl && (
        <Dialog open={Boolean(previewPdfUrl)} onOpenChange={() => setPreviewPdfUrl(null)}>
          <DialogContent className="max-w-4xl h-[88vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b border-zinc-200 bg-zinc-50/80">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-black text-zinc-900">
                    Bilateral Franchise Agreement — {previewDocTitle}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500">
                    Official 3-page executed contract with QuickPress stamp seal and legal signatories.
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
                  </a>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 bg-zinc-800">
              <iframe
                src={previewPdfUrl}
                title="Agreement PDF Viewer"
                className="w-full h-full border-0"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 6. Dispatch Agreement Letter Modal */}
      <DispatchAgreementModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        onSuccess={() => {
          setIsDispatchModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["admin", "merchant-agreements"] });
        }}
      />
    </div>
  );
}

interface DispatchAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DispatchAgreementModal({ isOpen, onClose, onSuccess }: DispatchAgreementModalProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("custom");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Kasganj");
  const [address, setAddress] = useState("");
  const [pan, setPan] = useState("");
  const [customNote, setCustomNote] = useState("");

  // Fetch registered partners for quick select
  const partnersQuery = useQuery({
    queryKey: ["admin", "partners-quick-list"],
    queryFn: () => fetchPartners(1, 100),
    enabled: isOpen,
  });

  const partnersList = partnersQuery.data || [];

  const handlePartnerSelect = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    if (partnerId === "custom") {
      setBusinessName("");
      setOwnerName("");
      setEmail("");
      setPhone("");
      setCity("Kasganj");
      return;
    }
    const p = partnersList.find((it) => it.id === partnerId);
    if (p) {
      setBusinessName(p.businessName || "");
      setOwnerName(p.ownerName || "");
      setEmail(p.email || "");
      setPhone(p.phone || "");
      setCity(p.city || "Kasganj");
    }
  };

  const dispatchMutation = useMutation({
    mutationFn: (payload: DispatchAgreementPayload) => dispatchMerchantAgreement(payload),
    onSuccess: (res) => {
      toast.success(res.message || "Agreement letter dispatched successfully via Hostinger! ✓");
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dispatch agreement letter");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid recipient email address");
      return;
    }
    if (!businessName.trim() || !ownerName.trim()) {
      toast.error("Please provide both Store Name and Owner Name");
      return;
    }

    dispatchMutation.mutate({
      partnerId: selectedPartnerId !== "custom" ? selectedPartnerId : undefined,
      email: email.trim().toLowerCase(),
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim() || undefined,
      city: city.trim() || "Kasganj",
      state: "Uttar Pradesh",
      address: address.trim() || undefined,
      pan: pan.trim().toUpperCase() || undefined,
      customMessage: customNote.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-zinc-900">
                Dispatch Franchise SLA Agreement Letter
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Generate and email an official 3-page bilateral agreement PDF via Hostinger Business API.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Quick Select from existing partners */}
          <div>
            <Label className="text-xs font-bold text-zinc-700">Select Registered Store (Optional)</Label>
            <Select value={selectedPartnerId} onValueChange={handlePartnerSelect}>
              <SelectTrigger className="mt-1 h-9 text-xs bg-zinc-50">
                <SelectValue placeholder="Choose a registered partner store..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">-- Enter Custom Store / Merchant --</SelectItem>
                {partnersList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.businessName} ({p.ownerName} · {p.city || "Kasganj"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-zinc-400 mt-1">
              Select an existing store to auto-fill details, or type new details manually.
            </p>
          </div>

          {/* Business & Owner Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-zinc-700">
                Store / Business Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. CleanExpress Laundry Hub"
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-700">
                Owner / Authorized Signatory <span className="text-red-500">*</span>
              </Label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="mt-1 h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-zinc-700">
                Official Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ramesh.laundry@gmail.com"
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-700">Primary Phone Number</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          {/* City & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-zinc-700">City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Kasganj"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-zinc-700">Business PAN (Optional)</Label>
              <Input
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                placeholder="ABCDE1234F"
                className="mt-1 h-9 text-xs uppercase"
              />
            </div>
          </div>

          {/* Agreement Terms Summary Card */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <img src="/assets/quickpress-seal.png" alt="Seal" className="size-10 object-contain drop-shadow-2xs" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                  Platform Signatory Stamp
                </span>
                <div className="font-bold text-zinc-900">QUICKPRESS TECHNOLOGIES PRIVATE LIMITED</div>
                <div className="text-[11px] text-zinc-600">Signatory: {stats.signatory || "Himanshu Pal"} (Director &amp; Authorized Signatory)</div>
              </div>
            </div>

            <div className="border-t border-blue-200/60 pt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-700">
              <div>• 15% Platform Commission</div>
              <div>• T+1 Automatic Payouts</div>
              <div>• Sender: info@withquickpress.com</div>
              <div>• CC: official.quickpress@gmail.com</div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="h-9 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={dispatchMutation.isPending}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black"
            >
              {dispatchMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Generating &amp; Dispatching...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Dispatch Agreement PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
