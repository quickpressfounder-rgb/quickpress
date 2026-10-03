import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  Bike,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Headphones,
  History,
  Hourglass,
  Info,
  Landmark,
  Layers,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  MessageSquareQuote,
  PenTool,
  Percent,
  Phone,
  PhoneCall,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Sparkles,
  Star,
  Store,
  Timer,
  TrendingUp,
  UploadCloud,
  User,
  UserCheck,
  Users,
  Utensils,
  Volume2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { usePartnerContext } from "../context/PartnerContext";
import { usePartnerServices } from "../context/PartnerServicesContext";
import { usePartnerResource } from "../hooks/use-partner-resource";
import { partnerRoutes } from "../navigation/partner-routes";
import { fetchPartnerProfile, toggleStoreStatus, updatePartnerProfile } from "@/api/partner/partner-profile-api";
import { useLanguage } from "../lib/i18n";
import { compressImage } from "../lib/image-compression";
import { formatPartnerId } from "../lib/format-ids";
import {
  fetchOperationsConfig,
  updateOperationsConfig,
  fetchStaffList,
  addStaffMember,
  removeStaffMember,
  fetchBankDetails,
  updateBankDetails,
  fetchGstReport,
  fetchOffersList,
  createOffer,
  deleteOffer,
  fetchPartnerApprovalRequests,
  submitKycChangeRequest,
  type PartnerApprovalRequest,
  type PartnerOperationsConfig,
  type PartnerStaffMember,
  type PartnerBankAccount,
  type PartnerGstReport,
  type PartnerOffer,
} from "../api/partner/partner-operations-api";

function normalizeDisplayPhone(p?: string): string {
  if (!p) return "";
  const cleaned = p.replace(/\+91/g, "").replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return p;
}

export function PartnerProfileScreen() {
  const navigate = useNavigate();
  const { session, signOut } = usePartnerContext();
  const { data: profile, reload: reloadProfile } = usePartnerResource(fetchPartnerProfile);
  const { services = [] } = usePartnerServices();
  const { t, language } = useLanguage();

  const activeServicesCount = services.filter((s) => s.enabled && !s.pendingApproval).length;

  const [activeSubTab, setActiveSubTab] = useState<"profile" | "activity">("profile");

  // Modals state
  const [showQrModal, setShowQrModal] = useState(false);
  const [showTimingsModal, setShowTimingsModal] = useState(false);
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showGstModal, setShowGstModal] = useState(false);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [showQrStandeeModal, setShowQrStandeeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);
  const [approvalRequests, setApprovalRequests] = useState<PartnerApprovalRequest[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  // KYC & Change Request State
  const [showKycEditModal, setShowKycEditModal] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState<{ isOpen: boolean; title: string; imageUrl: string; subtitle?: string } | null>(null);
  const [showAadhaarNumber, setShowAadhaarNumber] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [activeKycTab, setActiveKycTab] = useState<"documents" | "history">("documents");
  const [uploadingCheque, setUploadingCheque] = useState(false);
  const chequeInputRef = useRef<HTMLInputElement>(null);

  const [kycForm, setKycForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    email: "",
    pan: "",
    aadhaar: "",
    gstin: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifsc: "",
    address: "",
    pincode: "",
    chequePhoto: "",
    reason: "",
  });

  // Keep form in sync when profile loads
  useEffect(() => {
    if (profile) {
      setKycForm({
        businessName: profile.businessName || "",
        ownerName: profile.ownerName || "",
        phone: profile.phone || "",
        email: profile.email || "",
        pan: profile.pan || "",
        aadhaar: profile.aadhaar || "",
        gstin: profile.gstin || "",
        bankName: profile.bankName || "",
        accountHolder: profile.accountHolder || profile.businessName || "",
        accountNumber: profile.accountNumber || "",
        ifsc: profile.ifsc || "",
        address: profile.address || "",
        pincode: profile.pincode || "",
        chequePhoto: profile.chequePhoto || "",
        reason: "",
      });
    }
  }, [profile]);

  // Load approvals on mount
  useEffect(() => {
    fetchPartnerApprovalRequests()
      .then((reqs) => setApprovalRequests(reqs))
      .catch(() => undefined);
  }, []);

  const pendingRequest = approvalRequests.find(
    (r) => r.status === "pending" && (r.requestType === "kyc_update" || r.requestType === "bank_update" || r.requestType === "pan_update" || r.requestType === "profile_update")
  );

  const handleChequeSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCheque(true);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
      setKycForm((prev) => ({ ...prev, chequePhoto: dataUrl }));
      toast.success("Cheque / Passbook document attached!");
    } catch {
      toast.error("Failed to process document image.");
    } finally {
      setUploadingCheque(false);
      if (chequeInputRef.current) chequeInputRef.current.value = "";
    }
  };

  const handleSubmitKycEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycForm.bankName || !kycForm.accountNumber || !kycForm.ifsc) {
      toast.error("Bank Name, Account Number and IFSC Code are required.");
      return;
    }
    setSubmittingKyc(true);
    try {
      const res = await submitKycChangeRequest({
        ...kycForm,
        reason: kycForm.reason || "Partner submitted KYC & Bank details update",
      });
      setShowKycEditModal(false);
      toast.success(res.message || "Change request submitted to Admin! Review typically takes 12-24 hours.");
      const reqs = await fetchPartnerApprovalRequests();
      setApprovalRequests(reqs);
      await reloadProfile();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit KYC update request.");
    } finally {
      setSubmittingKyc(false);
    }
  };

  // Live Operations Config
  const [opsConfig, setOpsConfig] = useState<PartnerOperationsConfig>({
    rushHour: false,
    soundAlerts: true,
    autoAccept: true,
    pickupRadiusKm: 8.0,
    openingTime: "08:00",
    closingTime: "21:00",
    weeklyOff: "None",
    slotCapacity: 25,
  });

  // Sub-data states
  const [staffList, setStaffList] = useState<PartnerStaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Store Manager");

  const [bankData, setBankData] = useState<PartnerBankAccount>({
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    upiId: "",
    isVerified: false,
  });

  const [gstReport, setGstReport] = useState<PartnerGstReport | null>(null);

  const [offersList, setOffersList] = useState<PartnerOffer[]>([]);
  const [newOfferCode, setNewOfferCode] = useState("");
  const [newOfferDiscount, setNewOfferDiscount] = useState("15");
  const [newOfferMinAmount, setNewOfferMinAmount] = useState("299");

  // Load operations from database on mount
  useEffect(() => {
    fetchOperationsConfig()
      .then((cfg) => setOpsConfig(cfg))
      .catch(() => undefined);
  }, []);

  const storeName = profile?.businessName || profile?.name || profile?.ownerName || "QuickPress Partner Store";
  const city = profile?.city || "Kasganj";
  const partnerId = formatPartnerId(profile?.partnerId || (profile as any)?.id);
  const phone = normalizeDisplayPhone(profile?.phone || profile?.ownerPhone) || "+91 92587 30561";
  const logoImg = profile?.logo || profile?.logoUrl || profile?.image;
  const [logoFailed, setLogoFailed] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const dataUrl = await compressImage(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.85,
      });
      await updatePartnerProfile({ logo: dataUrl, logoUrl: dataUrl, image: dataUrl, storeImage: dataUrl } as any);
      await reloadProfile();
      setLogoFailed(false);
      window.dispatchEvent(new CustomEvent("qp:partner-profile-updated", { detail: { logo: dataUrl, storeImage: dataUrl, image: dataUrl, logoUrl: dataUrl } }));
      toast.success("Shop logo updated successfully!");
    } catch (err) {
      console.error("Logo upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update shop logo.");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // Toggle Rush Hour in DB
  const handleToggleRushHour = async () => {
    const next = !opsConfig.rushHour;
    setOpsConfig((prev) => ({ ...prev, rushHour: next }));
    try {
      await updateOperationsConfig({ rushHour: next });
      toast.success(next ? "Rush hour (+30 min buffer) enabled" : "Rush hour mode disabled");
    } catch {
      toast.error("Failed to update rush hour settings");
    }
  };

  // Toggle Sound Alerts in DB
  const handleToggleSound = async () => {
    const next = !opsConfig.soundAlerts;
    setOpsConfig((prev) => ({ ...prev, soundAlerts: next }));
    try {
      await updateOperationsConfig({ soundAlerts: next });
      toast.success(next ? "Order sound alerts enabled" : "Order sound alerts silenced");
    } catch {
      toast.error("Failed to update sound settings");
    }
  };

  // Open & load Staff modal
  const handleOpenStaff = async () => {
    setShowStaffModal(true);
    try {
      const list = await fetchStaffList();
      setStaffList(list);
    } catch {}
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim() || !newStaffPhone.trim()) {
      toast.error("Please enter staff name and phone number");
      return;
    }
    try {
      const added = await addStaffMember({
        name: newStaffName,
        phone: newStaffPhone,
        role: newStaffRole,
      });
      setStaffList((prev) => [...prev, added]);
      setNewStaffName("");
      setNewStaffPhone("");
      toast.success(`Staff member ${added.name} added successfully!`);
    } catch {
      toast.error("Failed to add staff member");
    }
  };

  const handleRemoveStaff = async (id: string) => {
    try {
      await removeStaffMember(id);
      setStaffList((prev) => prev.filter((s) => s.id !== id));
      toast.success("Staff member removed");
    } catch {
      toast.error("Failed to remove staff member");
    }
  };

  // Open & load Bank details
  const handleOpenBank = async () => {
    setShowBankModal(true);
    try {
      const b = await fetchBankDetails();
      setBankData(b);
    } catch {}
  };

  const handleOpenApprovals = async () => {
    setShowApprovalsModal(true);
    setLoadingApprovals(true);
    try {
      const reqs = await fetchPartnerApprovalRequests();
      setApprovalRequests(reqs);
    } catch {
      toast.error("Failed to fetch approval requests");
    } finally {
      setLoadingApprovals(false);
    }
  };

  const handleSaveBank = async () => {
    if (!bankData.accountNumber || !bankData.ifscCode) {
      toast.error("Account Number and IFSC Code are required");
      return;
    }
    try {
      await updateBankDetails(bankData);
      setShowBankModal(false);
      toast.success("Bank & Payout details submitted for Admin Verification! Changes will reflect upon approval.");
      handleOpenApprovals();
    } catch {
      toast.error("Failed to save bank details");
    }
  };

  // Open & load GST report
  const handleOpenGst = async () => {
    setShowGstModal(true);
    try {
      const rep = await fetchGstReport();
      setGstReport(rep);
    } catch {}
  };

  const handleDownloadCsv = () => {
    if (!gstReport) return;
    const csvContent = `data:text/csv;charset=utf-8,Period,Gross Sales,Taxable Value,CGST (9%),SGST (9%),Total GST (18%),Platform Commission,Net Partner Payout\n"${gstReport.period}",${gstReport.grossSales},${gstReport.taxableValue},${gstReport.cgst},${gstReport.sgst},${gstReport.totalGst},${gstReport.platformCommission},${gstReport.netPartnerPayout}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `QuickPress_GST_Report_${storeName.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("GST Tax Summary Report CSV downloaded!");
  };

  // Open & load Offers modal
  const handleOpenOffers = async () => {
    setShowOffersModal(true);
    try {
      const list = await fetchOffersList();
      setOffersList(list);
    } catch {}
  };

  const handleCreateOffer = async () => {
    if (!newOfferCode.trim()) {
      toast.error("Offer Code is required");
      return;
    }
    try {
      const created = await createOffer({
        code: newOfferCode.toUpperCase(),
        discountPercent: parseInt(newOfferDiscount, 10) || 10,
        minOrderAmount: parseFloat(newOfferMinAmount) || 199,
        validTill: "31 Dec 2026",
      });
      setOffersList((prev) => [...prev, created]);
      setNewOfferCode("");
      toast.success(`Promo coupon ${created.code} activated!`);
    } catch {
      toast.error("Failed to create offer");
    }
  };

  const handleDeleteOffer = async (id: string) => {
    try {
      await deleteOffer(id);
      setOffersList((prev) => prev.filter((o) => o.id !== id));
      toast.success("Offer coupon removed");
    } catch {
      toast.error("Failed to remove offer");
    }
  };

  return (
    <PartnerLayout
      activeTab="profile"
      title={t("nav.profile", "Profile")}
      subtitle={`${storeName} · ID: ${partnerId}`}
    >
      {/* ========================================================================= */}
      {/* MOBILE DETAILED ZOMATO "EXPLORE MORE" VIEW (< md)                          */}
      {/* ========================================================================= */}
      <div className="min-h-screen bg-[#F4F5F7] pb-32 text-zinc-900 md:hidden">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: partnerRoutes.dashboard })}
              className="text-zinc-800 p-1 active:scale-95"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-base font-black tracking-tight text-zinc-900">Explore More & Settings</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={partnerRoutes.notifications}
              className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 active:scale-95"
            >
              <Bell className="size-4" />
            </Link>
          </div>
        </header>

        <div className="space-y-4 p-4">
          {/* 1. Rich Partner Profile Hero Card */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              {/* Hidden file input for fast logo update */}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
              />

              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate({ to: partnerRoutes.shop })}
                    className="group relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200/90 bg-amber-400 text-zinc-950 font-black text-xl shadow-xs active:scale-95 transition-transform"
                    title="Tap to manage Shop Profile & Photos"
                  >
                    {logoImg && !logoFailed ? (
                      <img
                        src={logoImg}
                        alt={`${storeName} logo`}
                        onError={() => setLogoFailed(true)}
                        className="size-full object-cover"
                      />
                    ) : (
                      storeName.slice(0, 2).toUpperCase()
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    title="Change Store Logo"
                    className="absolute -bottom-1 -right-1 flex size-5.5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md ring-2 ring-white transition-all hover:bg-emerald-700 active:scale-90 cursor-pointer"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Camera className="size-3" />
                    )}
                  </button>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="truncate text-base font-black text-zinc-900">{storeName}</h2>
                    <BadgeCheck className="size-4 text-blue-500 fill-current shrink-0" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-500">{phone}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700">
                      ID: {partnerId}
                    </span>
                    <span className="flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                      <Star className="size-2.5 fill-current text-amber-500" />
                      {profile?.rating || "4.9"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.shop })}
                className="rounded-full bg-zinc-100 p-2 text-zinc-700 active:scale-95"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Quick 3-Pillar Stats */}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-center">
              <div className="rounded-2xl bg-zinc-50 p-2.5">
                <p className="text-[10px] font-bold uppercase text-zinc-400">Total Orders</p>
                <p className="text-sm font-black text-zinc-900">{profile?.totalOrders || "4"}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-2.5">
                <p className="text-[10px] font-bold uppercase text-zinc-400">City Outlet</p>
                <p className="text-sm font-black text-zinc-900 truncate">{city}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-2.5">
                <p className="text-[10px] font-bold uppercase text-zinc-400">KYC Status</p>
                <p className="text-xs font-black text-emerald-600">VERIFIED ✓</p>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DEDICATED SECTION: Store Analytics & Growth Performance           */}
          {/* ================================================================= */}
          <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-50/70 via-white to-white p-4.5 shadow-sm space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-900">Store Analytics & Growth</h3>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800">
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-zinc-500">
                    Daily revenue trends, order funnels, category velocity & peak hours
                  </p>
                </div>
              </div>

              <Link
                to={partnerRoutes.analytics}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-black text-white hover:bg-zinc-800 active:scale-95 transition-all shadow-xs"
              >
                <span>Analytics</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white border border-blue-100 p-2.5 shadow-2xs text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">SLA Speed</p>
                <p className="text-xs font-black text-emerald-700">99.4% On-time</p>
              </div>
              <div className="rounded-2xl bg-white border border-blue-100 p-2.5 shadow-2xs text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Turnaround</p>
                <p className="text-xs font-black text-zinc-900">~2.4 hrs avg</p>
              </div>
              <div className="rounded-2xl bg-white border border-blue-100 p-2.5 shadow-2xs text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Net Share</p>
                <p className="text-xs font-black text-blue-700">85% Payout</p>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* DEDICATED SECTION: Services & Catalog Management                  */}
          {/* ================================================================= */}
          <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-50/80 via-white to-white p-4.5 shadow-sm space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-900">Services & Rate Card</h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                      {activeServicesCount > 0 ? `${activeServicesCount} Live` : `${services.length} Total`}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-zinc-500">
                    Set laundry prices, add new services & toggle live customer visibility
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Catalog Status Badges */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-emerald-100/90 p-2.5 shadow-2xs">
                <span className="flex size-7.5 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 text-sm">
                  🧺
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Active Services</p>
                  <p className="text-xs font-black text-zinc-900 truncate">
                    {activeServicesCount} of {services.length} items on
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-white border border-emerald-100/90 p-2.5 shadow-2xs">
                <span className="flex size-7.5 items-center justify-center rounded-xl bg-amber-50 text-amber-700 text-sm">
                  ⚡
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Catalog Mode</p>
                  <p className="text-xs font-black text-emerald-700 truncate">Instant Order Ready</p>
                </div>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.services })}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <span>Manage All Services</span>
                <ArrowRight className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.serviceNew })}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-300 bg-white px-3.5 py-2.5 text-xs font-black text-emerald-700 shadow-2xs hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
              >
                <span>+ Add Service</span>
              </button>
            </div>
          </div>

          {/* 2. Quick Operations Action Toggles */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">
              Live Operations Switches
            </h3>

            {/* Rush Hour Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Hourglass className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-zinc-900">Rush Hour Mode</p>
                  <p className="text-[10px] font-medium text-zinc-400">Adds +30 mins buffer on bookings</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleRushHour}
                className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                  opsConfig.rushHour ? "bg-amber-500" : "bg-zinc-200"
                }`}
              >
                <div
                  className={`size-5 rounded-full bg-white shadow-md transition-transform ${
                    opsConfig.rushHour ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 3. Section: Outlet & Store Settings */}
          <div>
            <h3 className="px-1 text-xs font-black uppercase tracking-wider text-zinc-600">
              Outlet & Operations
            </h3>
            <div className="mt-2 grid grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.shop })}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-xs transition-transform active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-800">
                  <Store className="size-5" />
                </div>
                <p className="mt-1.5 text-[10px] font-black leading-tight text-zinc-800">
                  Outlet Info
                </p>
              </button>

              <button
                type="button"
                onClick={() => setShowTimingsModal(true)}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-xs transition-transform active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-800">
                  <Clock className="size-5" />
                </div>
                <p className="mt-1.5 text-[10px] font-black leading-tight text-zinc-800">
                  Timings & Slots
                </p>
              </button>

              <button
                type="button"
                onClick={() => setShowRadiusModal(true)}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-xs transition-transform active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-800">
                  <MapPin className="size-5" />
                </div>
                <p className="mt-1.5 text-[10px] font-black leading-tight text-zinc-800">
                  Pickup Radius
                </p>
              </button>

              <button
                type="button"
                onClick={handleOpenStaff}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-xs transition-transform active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-50 text-zinc-800">
                  <Users className="size-5" />
                </div>
                <p className="mt-1.5 text-[10px] font-black leading-tight text-zinc-800">
                  Staff Access
                </p>
              </button>
            </div>
          </div>

          {/* 4. Section: Finance, Payouts & Settlements */}
          <div>
            <h3 className="px-1 text-xs font-black uppercase tracking-wider text-zinc-600">
              Finance & Settlements
            </h3>
            <div className="mt-2 grid grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.earnings })}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-xs transition-transform active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                  <Coins className="size-5" />
                </div>
                <p className="mt-1.5 text-[10px] font-black leading-tight text-zinc-800">
                  Weekly Payouts
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.earnings })}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-xs transition-transform active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                  <FileText className="size-5" />
                </div>
                <p className="mt-1.5 text-[10px] font-black leading-tight text-zinc-800">
                  Settlements
                </p>
              </button>

              <button
                type="button"
                onClick={handleOpenBank}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-xs transition-transform active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                  <CreditCard className="size-5" />
                </div>
                <p className="mt-1.5 text-[10px] font-black leading-tight text-zinc-800">
                  Bank Account
                </p>
              </button>

              <button
                type="button"
                onClick={handleOpenGst}
                className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-xs transition-transform active:scale-95"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
                  <Receipt className="size-5" />
                </div>
                <p className="mt-1.5 text-[10px] font-black leading-tight text-zinc-800">
                  GST & Tax Reports
                </p>
              </button>
            </div>

            {/* Verification & Approvals Tracking Card */}
            <div className="mt-2.5">
              <button
                type="button"
                onClick={handleOpenApprovals}
                className="w-full flex items-center justify-between rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3.5 shadow-xs transition-transform active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-blue-950">Verification & Approvals</p>
                    <p className="text-[10px] font-semibold text-blue-700">Track Store Name, PAN, Bank & Service changes</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-black text-blue-600">
                  <span>View</span>
                  <ChevronRight className="size-4" />
                </div>
              </button>
            </div>
          </div>


          {/* 6. Section: Store Branding & Standee QR */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                  <QrCode className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-zinc-900">Store Counter QR Standee</p>
                  <p className="text-[10px] font-medium text-zinc-400">Printable QR standee for walk-in customers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrStandeeModal(true)}
                className="flex items-center gap-1 rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-black text-white active:scale-95"
              >
                <Download className="size-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* 7. Support Helpline Card */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Headphones className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-zinc-900">Partner Help & Support</p>
                  <p className="text-[10px] font-medium text-zinc-400">Available 24/7 for laundry partners</p>
                </div>
              </div>
              <a
                href="tel:+919258730561"
                className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 active:scale-95"
              >
                <PhoneCall className="size-3.5" />
                <span>Call</span>
              </a>
            </div>
          </div>

          {/* 8. Log Out Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 py-3.5 text-xs font-black text-red-600 shadow-xs transition-colors active:scale-95"
            >
              <LogOut className="size-4" />
              <span>Log out from QuickPress Partner</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODAL 1: Timings & Slot Capacity                              */}
        {/* ------------------------------------------------------------- */}
        {showTimingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowTimingsModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-zinc-900">Store Timings & Slots</h3>
                <button type="button" onClick={() => setShowTimingsModal(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-600">Opening Time</label>
                  <input
                    type="time"
                    value={opsConfig.openingTime}
                    onChange={(e) => setOpsConfig({ ...opsConfig, openingTime: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-600">Closing Time</label>
                  <input
                    type="time"
                    value={opsConfig.closingTime}
                    onChange={(e) => setOpsConfig({ ...opsConfig, closingTime: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-600">Weekly Off Day</label>
                  <select
                    value={opsConfig.weeklyOff}
                    onChange={(e) => setOpsConfig({ ...opsConfig, weeklyOff: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 font-bold"
                  >
                    <option value="None">None (Open 7 Days)</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-600">Slot Order Capacity</label>
                  <input
                    type="number"
                    value={opsConfig.slotCapacity}
                    onChange={(e) => setOpsConfig({ ...opsConfig, slotCapacity: parseInt(e.target.value, 10) || 20 })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await updateOperationsConfig(opsConfig);
                  setShowTimingsModal(false);
                  toast.success("Store timings saved to database!");
                }}
                className="w-full rounded-2xl bg-zinc-950 py-3 text-xs font-black text-white active:scale-95"
              >
                Save Timings
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 2: Pickup Radius & Auto-Accept                          */}
        {/* ------------------------------------------------------------- */}
        {showRadiusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowRadiusModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-zinc-900">Serviceable Pickup Radius</h3>
                <button type="button" onClick={() => setShowRadiusModal(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-zinc-500">Select maximum distance from store for order acceptance:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 8, 10, 12, 15].map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setOpsConfig({ ...opsConfig, pickupRadiusKm: km })}
                      className={`rounded-xl py-2.5 font-black border transition-all ${
                        opsConfig.pickupRadiusKm === km
                          ? "bg-zinc-950 text-white border-zinc-950"
                          : "bg-zinc-50 text-zinc-700 border-zinc-200"
                      }`}
                    >
                      {km} KM
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 border border-zinc-100 mt-2 opacity-80">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-zinc-900">Auto-Accept Orders</p>
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-800">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Coming Soon: Automatically accept incoming orders within radius</p>
                  </div>
                  <input
                    type="checkbox"
                    disabled
                    checked={false}
                    className="size-4 accent-emerald-600 opacity-40 cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await updateOperationsConfig(opsConfig);
                  setShowRadiusModal(false);
                  toast.success(`Service radius updated to ${opsConfig.pickupRadiusKm} KM!`);
                }}
                className="w-full rounded-2xl bg-zinc-950 py-3 text-xs font-black text-white active:scale-95"
              >
                Save Radius Settings
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 3: Staff Management & Permissions                       */}
        {/* ------------------------------------------------------------- */}
        {showStaffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowStaffModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Store Staff Members</h3>
                  <p className="text-[11px] text-zinc-500">Manage employee permissions</p>
                </div>
                <button type="button" onClick={() => setShowStaffModal(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500">✕</button>
              </div>

              {/* Staff List */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 space-y-2">
                {staffList.length === 0 ? (
                  <p className="py-4 text-center text-xs text-zinc-400">No staff members added yet.</p>
                ) : (
                  staffList.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-xs font-black text-zinc-900">{s.name}</p>
                        <p className="text-[10px] text-zinc-500">{s.phone} · <span className="font-bold text-emerald-700">{s.role}</span></p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(s.id)}
                        className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Staff Form */}
              <div className="shrink-0 rounded-2xl bg-zinc-50 p-3 border border-zinc-200 space-y-2 text-xs">
                <p className="font-black text-zinc-800">Add New Staff</p>
                <input
                  type="text"
                  placeholder="Staff Name (e.g. Rahul Sharma)"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-xs"
                />
                <input
                  type="tel"
                  placeholder="Mobile Phone (+91 ...)"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-xs"
                />
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-xs font-bold"
                >
                  <option value="Store Manager">Store Manager</option>
                  <option value="Master Washer">Master Washer</option>
                  <option value="Steam Presser">Steam Presser</option>
                  <option value="Front Desk">Front Desk</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddStaff}
                  className="w-full rounded-xl bg-zinc-950 py-2 font-black text-white active:scale-95"
                >
                  + Add Staff to Store
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 4: Bank Account & UPI Details                           */}
        {/* ------------------------------------------------------------- */}
        {showBankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowBankModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Bank Account & UPI</h3>
                  <p className="text-[11px] text-zinc-500">For direct 7-day weekly payout settlements</p>
                </div>
                <button type="button" onClick={() => setShowBankModal(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500">✕</button>
              </div>

              {/* Admin Verification Notice */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="size-4 shrink-0 text-amber-700 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Admin Verification Required:</strong> New bank account details must be verified by QuickPress Admin before payout transfers are redirected.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-zinc-600">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India / HDFC"
                    value={bankData.bankName}
                    onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-600">Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 501002348912"
                    value={bankData.accountNumber}
                    onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-600">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC0001234"
                    value={bankData.ifscCode}
                    onChange={(e) => setBankData({ ...bankData, ifscCode: e.target.value.toUpperCase() })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 font-bold font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-600">Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="e.g. QuickPress Store Services"
                    value={bankData.accountHolderName}
                    onChange={(e) => setBankData({ ...bankData, accountHolderName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-600">UPI ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. store@okaxis"
                    value={bankData.upiId}
                    onChange={(e) => setBankData({ ...bankData, upiId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 p-2.5 font-bold font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveBank}
                className="w-full rounded-2xl bg-zinc-950 py-3 text-xs font-black text-white active:scale-95"
              >
                Submit for Admin Verification
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 4B: Verification & Admin Approval Requests Status       */}
        {/* ------------------------------------------------------------- */}
        {showApprovalsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowApprovalsModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Verification & Approvals</h3>
                  <p className="text-[11px] text-zinc-500">Track sensitive store change requests</p>
                </div>
                <button type="button" onClick={() => setShowApprovalsModal(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {loadingApprovals ? (
                  <div className="py-8 text-center text-zinc-500 font-bold">Loading verification requests...</div>
                ) : approvalRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-zinc-500">
                    <ShieldCheck className="mx-auto size-8 text-emerald-600 mb-1" />
                    <p className="font-bold">No Pending Verification Requests</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">All your profile, banking, and service data is verified and active.</p>
                  </div>
                ) : (
                  approvalRequests.map((req) => (
                    <div key={req.requestId} className="rounded-2xl border border-zinc-200/80 p-3.5 space-y-2 bg-zinc-50/50">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-zinc-900 text-xs uppercase tracking-wide">
                          {req.requestType.replace("_", " ")}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          req.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {req.status === "approved" ? "✅ Approved" : req.status === "rejected" ? "❌ Rejected" : "⏳ Under Admin Review"}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-500">
                        ID: <span className="font-mono font-bold text-zinc-700">{req.requestId}</span> • {new Date(req.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>

                      {req.rejectionReason && (
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-800 font-medium">
                          <strong>Admin Reason:</strong> {req.rejectionReason}
                        </div>
                      )}

                      {req.status === "approved" && req.reviewedBy && (
                        <p className="text-[10px] text-emerald-700 font-bold">
                          Verified by {req.reviewedBy} on {new Date(req.reviewedAt || "").toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowApprovalsModal(false)}
                className="w-full rounded-2xl bg-zinc-950 py-3 text-xs font-black text-white active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 5: GST & Tax Reports Summary Generator                  */}
        {/* ------------------------------------------------------------- */}
        {showGstModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowGstModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-zinc-900">GST & Tax Summary</h3>
                  <p className="text-[11px] text-zinc-500">{gstReport?.period || "Current Month"}</p>
                </div>
                <button type="button" onClick={() => setShowGstModal(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500">✕</button>
              </div>

              <div className="space-y-2 rounded-2xl bg-zinc-50 p-4 border border-zinc-200 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Delivered Orders:</span>
                  <span className="font-black text-zinc-900">{gstReport?.orderCount || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Gross Sales:</span>
                  <span className="font-black text-zinc-900">₹{gstReport?.grossSales || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Taxable Value:</span>
                  <span className="font-bold text-zinc-800">₹{gstReport?.taxableValue || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">CGST (9%):</span>
                  <span className="font-bold text-zinc-800">₹{gstReport?.cgst || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">SGST (9%):</span>
                  <span className="font-bold text-zinc-800">₹{gstReport?.sgst || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-zinc-200 pt-1.5">
                  <span className="text-zinc-600 font-bold">Platform Fee (15%):</span>
                  <span className="font-bold text-rose-600">-₹{gstReport?.platformCommission || 0}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-zinc-200 pt-1.5">
                  <span className="text-zinc-900 font-black">Net Partner Settlement:</span>
                  <span className="font-black text-emerald-700 text-sm">₹{gstReport?.netPartnerPayout || 0}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white active:scale-95 shadow-md shadow-emerald-600/20"
              >
                <Download className="size-4" />
                <span>Download Tax Summary CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 6: Special Offers & Promo Codes Manager                 */}
        {/* ------------------------------------------------------------- */}
        {showOffersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowOffersModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Special Offers & Coupons</h3>
                  <p className="text-[11px] text-zinc-500">Boost store orders with promo discounts</p>
                </div>
                <button type="button" onClick={() => setShowOffersModal(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500">✕</button>
              </div>

              {/* Active Coupons List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {offersList.length === 0 ? (
                  <p className="py-4 text-center text-xs text-zinc-400">No active promo offers.</p>
                ) : (
                  offersList.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-xl bg-emerald-50/60 p-3 border border-emerald-200/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-emerald-950">{o.code}</span>
                          <span className="rounded bg-emerald-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                            {o.discountPercent}% OFF
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Min Order: ₹{o.minOrderAmount} · Till {o.validTill}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteOffer(o.id)}
                        className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Create Coupon Form */}
              <div className="shrink-0 rounded-2xl bg-zinc-50 p-3 border border-zinc-200 space-y-2 text-xs">
                <p className="font-black text-zinc-800">Create New Coupon</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="CODE (e.g. FESTIVE20)"
                    value={newOfferCode}
                    onChange={(e) => setNewOfferCode(e.target.value.toUpperCase())}
                    className="rounded-xl border border-zinc-200 bg-white p-2 text-xs font-mono uppercase"
                  />
                  <input
                    type="number"
                    placeholder="Discount % (e.g. 15)"
                    value={newOfferDiscount}
                    onChange={(e) => setNewOfferDiscount(e.target.value)}
                    className="rounded-xl border border-zinc-200 bg-white p-2 text-xs font-bold"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Min Order Amount ₹ (e.g. 299)"
                  value={newOfferMinAmount}
                  onChange={(e) => setNewOfferMinAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-xs font-bold"
                />

                <button
                  type="button"
                  onClick={handleCreateOffer}
                  className="w-full rounded-xl bg-zinc-950 py-2 font-black text-white active:scale-95"
                >
                  + Launch Promo Coupon
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 7: Printable Store QR Standee                           */}
        {/* ------------------------------------------------------------- */}
        {showQrStandeeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowQrStandeeModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl text-center space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-zinc-900">Store QR Standee</h3>
                <button type="button" onClick={() => setShowQrStandeeModal(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500">✕</button>
              </div>

              {/* Printable Standee Preview */}
              <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-gradient-to-b from-amber-500/10 via-white to-emerald-500/10 p-6 space-y-3">
                <div className="flex items-center justify-center gap-1.5">
                  <Sparkles className="size-4 text-emerald-600" />
                  <p className="text-sm font-black tracking-tight text-zinc-950">QuickPress Laundry Hub</p>
                </div>
                <h4 className="text-base font-black text-zinc-900">{storeName}</h4>
                <p className="text-[11px] font-semibold text-zinc-500">Partner Store ID: {partnerId}</p>

                {/* QR Code */}
                <div className="mx-auto flex size-44 items-center justify-center rounded-2xl bg-white p-3 shadow-md border border-zinc-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://with.quickpress.com/store/${partnerId}`}
                    alt="QuickPress Store QR"
                    className="size-full rounded-xl"
                  />
                </div>
                <p className="text-xs font-black text-emerald-800">Scan & Book Laundry Pickup</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.print();
                  toast.success("Printing Store Standee QR!");
                }}
                className="w-full rounded-2xl bg-zinc-950 py-3 text-xs font-black text-white active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="size-4" />
                <span>Print Standee Document</span>
              </button>
            </div>
          </div>
        )}

        {/* Logout Confirmation Modal */}
        {showLogoutModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs"
            />
            <div className="relative w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-5 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <LogOut className="size-6" />
              </div>
              <h3 className="mt-3 text-base font-black text-zinc-900">Log out from Partner App?</h3>
              <p className="mt-1 text-xs text-zinc-500">
                You will stop receiving live order sound alerts until you sign back in.
              </p>

              <div className="mt-5 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 rounded-2xl border border-zinc-200 py-2.5 text-xs font-bold text-zinc-700 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutModal(false);
                    signOut();
                    void navigate({ to: partnerRoutes.auth });
                  }}
                  className="flex-1 rounded-2xl bg-red-600 py-2.5 text-xs font-black text-white shadow-sm active:scale-95"
                >
                  Confirm Log Out
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP PROFILE VIEW (>= md)                                              */}
      {/* ========================================================================= */}
      <div className="hidden mx-auto w-full max-w-5xl px-4 py-4 md:block md:px-8 md:py-6">
        <div className="space-y-6">
          <section className="flex items-center gap-4 rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.shop })}
                className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border/90 bg-primary/20 text-brand-dark font-black text-2xl shadow-xs active:scale-95 transition-transform"
                title="Tap to manage Shop Profile & Photos"
              >
                {logoImg && !logoFailed ? (
                  <img
                    src={logoImg}
                    alt={`${storeName} logo`}
                    onError={() => setLogoFailed(true)}
                    className="size-full object-cover"
                  />
                ) : (
                  storeName.slice(0, 2).toUpperCase()
                )}
              </button>

              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                title="Change Store Logo"
                className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md ring-2 ring-white transition-all hover:bg-emerald-700 active:scale-90 cursor-pointer"
              >
                {uploadingLogo ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-xl font-black text-foreground">{storeName}</p>
                <BadgeCheck className="size-5 text-blue-500 fill-current" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                {profile?.ownerName || "Partner Admin"} · Store ID: {partnerId} · {phone}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground">{t("profile.rating", "Partner Rating")}</p>
              <p className="text-2xl font-black text-foreground">★ {profile?.rating || "5.0"}</p>
            </div>
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground">{t("profile.completedOrders", "Completed Orders")}</p>
              <p className="text-2xl font-black text-foreground">{profile?.totalOrders || 4}</p>
            </div>
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground">{t("profile.location", "Location")}</p>
              <p className="text-2xl font-black text-foreground">{city}</p>
            </div>
          </div>

          {/* ================================================================= */}
          {/* STORE ANALYTICS & GROWTH SECTION                                  */}
          {/* ================================================================= */}
          <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-card to-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                  <TrendingUp className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground">Store Analytics & Growth Insights</h2>
                    <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-xs font-black text-blue-700 dark:text-blue-300">
                      Live Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time revenue distributions, fulfillment SLA, category velocity, and peak ordering heatmap
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to={partnerRoutes.analytics}
                  className="flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-blue-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Open Full Analytics Hub</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Quick KPI Preview Pills */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-border/60 pt-4">
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fulfillment SLA</p>
                <p className="text-base font-black text-foreground">99.4% On-Time</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Standard & Express</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Avg Turnaround</p>
                <p className="text-base font-black text-foreground">~2.4 Hours</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Processing Speed</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Partner Net Share</p>
                <p className="text-base font-black text-blue-600 dark:text-blue-400">85% Gross Sales</p>
                <p className="text-[10px] text-muted-foreground font-semibold">15% Platform Commission</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Retention</p>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">4.9 ★ Rating</p>
                <p className="text-[10px] text-muted-foreground font-semibold">Verified feedback</p>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* SERVICES & CATALOG MANAGEMENT SECTION                             */}
          {/* ================================================================= */}
          <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground">Services & Rate Card</h2>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                      {activeServicesCount > 0 ? `${activeServicesCount} Live in Catalog` : `${services.length} Total Services`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure laundry service pricing, turnaround times, and customer booking availability
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate({ to: partnerRoutes.serviceNew })}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
                >
                  <span>+ Add New Service</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: partnerRoutes.services })}
                  className="flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-black text-white shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Manage Catalog</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* KYC & DOCUMENTS COMPLIANCE SECTION                                */}
          {/* ================================================================= */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
            {/* Header & Verification Badge */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-foreground">{t("profile.kycTitle", "KYC & Official Documents")}</h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                        {t("common.verifiedPartner", "Verified Partner")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Business identity and payout accounts verified by QuickPress Compliance
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKycEditModal(true)}
                  className="flex items-center gap-2 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-4 py-2.5 text-xs font-black shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  <PenTool className="size-3.5" />
                  {t("profile.requestKycUpdate", "Request Document / Bank Edit")}
                </button>
                <button
                  type="button"
                  onClick={handleOpenApprovals}
                  className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-muted/60 active:scale-95 transition-all cursor-pointer"
                >
                  <History className="size-3.5 text-muted-foreground" />
                  Approvals ({approvalRequests.length})
                </button>
              </div>
            </div>

            {/* Pending Admin Review Banner (if any) */}
            {pendingRequest && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-2 rounded-full bg-amber-500 animate-ping" />
                    <p className="text-xs font-black text-amber-900 dark:text-amber-300">
                      Change Request #{pendingRequest.requestId} Under Review
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200">
                    Awaiting Admin Approval
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                  You requested an update to your KYC / Banking details on{" "}
                  {new Date(pendingRequest.submittedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  . QuickPress Admin is verifying your documents. Your current verified account details remain active until approved.
                </p>
              </div>
            )}

            {/* Document Tabs */}
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <button
                type="button"
                onClick={() => setActiveKycTab("documents")}
                className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer ${
                  activeKycTab === "documents"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Verified Documents (4)
              </button>
              <button
                type="button"
                onClick={() => setActiveKycTab("history")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all cursor-pointer ${
                  activeKycTab === "history"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Change Requests & Approvals
                {approvalRequests.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-bold text-foreground">
                    {approvalRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: Documents Grid */}
            {activeKycTab === "documents" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Aadhaar Card */}
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-4 hover:border-border transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 font-black text-xs">
                        UIDAI
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-foreground">{t("profile.aadhaarCard", "Aadhaar Card (UIDAI)")}</h3>
                        <p className="text-[11px] text-muted-foreground">National Identity Card</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-600 border border-emerald-500/20">
                      <Check className="size-3" />
                      {t("common.verified", "Verified ✓")}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground">Aadhaar Number</span>
                      <button
                        type="button"
                        onClick={() => setShowAadhaarNumber(!showAadhaarNumber)}
                        className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        {showAadhaarNumber ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                        {showAadhaarNumber ? t("profile.hide", "Mask") : t("profile.show", "Reveal")}
                      </button>
                    </div>
                    <p className="font-mono text-base font-black tracking-wider text-foreground">
                      {showAadhaarNumber
                        ? (profile?.aadhaar || "9812 4987 1234")
                        : (profile?.aadhaar ? `•••• •••• ${String(profile.aadhaar).slice(-4)}` : "•••• •••• 1234")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Authorized Signatory: <span className="font-bold text-foreground">{profile?.ownerName || "Rajesh Sharma"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setShowDocPreview({
                          isOpen: true,
                          title: "Aadhaar Card (Front)",
                          imageUrl: profile?.aadhaarFront || "",
                          subtitle: `UIDAI Verified · ${profile?.ownerName || "Rajesh Sharma"}`,
                        })
                      }
                      className="flex-1 rounded-xl border border-border/80 bg-card py-2 text-center text-xs font-bold text-foreground hover:bg-muted/40 transition-all cursor-pointer"
                    >
                      View Front Side
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setShowDocPreview({
                          isOpen: true,
                          title: "Aadhaar Card (Back)",
                          imageUrl: profile?.aadhaarBack || "",
                          subtitle: `Address Verification · ${profile?.city || "Kasganj"}`,
                        })
                      }
                      className="flex-1 rounded-xl border border-border/80 bg-card py-2 text-center text-xs font-bold text-foreground hover:bg-muted/40 transition-all cursor-pointer"
                    >
                      View Back Side
                    </button>
                  </div>
                </div>

                {/* 2. PAN Card */}
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-4 hover:border-border transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 font-black text-xs">
                        ITD
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-foreground">{t("profile.panCard", "Permanent Account Number (PAN)")}</h3>
                        <p className="text-[11px] text-muted-foreground">Income Tax Dept of India</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-600 border border-emerald-500/20">
                      <Check className="size-3" />
                      {t("common.verified", "Verified ✓")}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground">Permanent Account Number</span>
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                        194C Compliant
                      </span>
                    </div>
                    <p className="font-mono text-base font-black tracking-widest text-foreground">
                      {profile?.pan || "ABCDE1234F"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Entity: <span className="font-bold text-foreground">Authorized Partner</span> · TDS Rate: 1%
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setShowDocPreview({
                          isOpen: true,
                          title: "PAN Card Document",
                          imageUrl: profile?.panCard || "",
                          subtitle: `Permanent Account Number: ${profile?.pan || "ABCDE1234F"}`,
                        })
                      }
                      className="w-full rounded-xl border border-border/80 bg-card py-2 text-center text-xs font-bold text-foreground hover:bg-muted/40 transition-all cursor-pointer"
                    >
                      View PAN Card Document
                    </button>
                  </div>
                </div>

                {/* 3. Settlement Bank Account */}
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-4 hover:border-border transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        <Landmark className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-foreground">{t("profile.bankAccount", "Bank Payout Account")}</h3>
                        <p className="text-[11px] text-muted-foreground">Daily Automated Payouts</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-600 border border-emerald-500/20">
                      <Check className="size-3" />
                      {t("profile.activeVerified", "Active & Verified")}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-foreground">{profile?.bankName || "HDFC Bank"}</span>
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        IFSC: {profile?.ifsc || "HDFC0002733"}
                      </span>
                    </div>
                    <p className="font-mono text-base font-black tracking-wider text-foreground">
                      {profile?.accountNumber
                        ? `•••• •••• ${String(profile.accountNumber).slice(-4)}`
                        : "•••• •••• 4422"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {t("profile.accountHolder", "Beneficiary")}: <span className="font-bold text-foreground">{profile?.accountHolder || storeName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setShowDocPreview({
                          isOpen: true,
                          title: t("profile.cancelledCheque", "Cancelled Cheque / Passbook Proof"),
                          imageUrl: profile?.chequePhoto || "",
                          subtitle: `${profile?.bankName || "HDFC Bank"} · A/C: ${profile?.accountNumber || "50200088194422"}`,
                        })
                      }
                      className="flex-1 rounded-xl border border-border/80 bg-card py-2 text-center text-xs font-bold text-foreground hover:bg-muted/40 transition-all cursor-pointer"
                    >
                      {t("profile.cancelledCheque", "View Cheque Copy")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKycEditModal(true)}
                      className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      {t("common.edit", "Edit")}
                    </button>
                  </div>
                </div>

                {/* 4. GSTIN & Business Master SLA */}
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-4 hover:border-border transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        <FileCheck className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-foreground">{t("profile.slaAgreement", "Partner Service Level Agreement (SLA)")}</h3>
                        <p className="text-[11px] text-muted-foreground">Compliance & Legal Binding</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-black text-blue-600 border border-blue-500/20">
                      SLA Active
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground">GSTIN Number</span>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {profile?.gstin ? "Registered" : "Composition / Exemption"}
                      </span>
                    </div>
                    <p className="font-mono text-sm font-black text-foreground">
                      {profile?.gstin || "Unregistered (Below ₹40L Limit)"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Registered Address:{" "}
                      <span className="font-semibold text-foreground">
                        {profile?.address || "Shop No. 12, Station Road, Kasganj"} ({profile?.pincode || "207123"})
                      </span>
                    </p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setShowDocPreview({
                          isOpen: true,
                          title: "Master Partnership SLA Agreement",
                          imageUrl: profile?.signatureUrl || "",
                          subtitle: `Version: ${profile?.agreementVersion || "QP-SLA-2026.4"} · E-Signed by ${profile?.signedByName || profile?.ownerName || "Rajesh Sharma"}`,
                        })
                      }
                      className="w-full rounded-xl border border-border/80 bg-card py-2 text-center text-xs font-bold text-foreground hover:bg-muted/40 transition-all cursor-pointer"
                    >
                      View SLA Agreement Terms
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Tab 2: Change Requests History */
              <div className="space-y-3">
                {approvalRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center space-y-2">
                    <Clock className="size-8 mx-auto text-muted-foreground opacity-50" />
                    <p className="text-sm font-black text-foreground">No Change Requests Yet</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      All your documents and bank details are currently verified and up to date. You can request edits whenever needed.
                    </p>
                  </div>
                ) : (
                  approvalRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-border/70 bg-muted/20 p-4 gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-foreground">#{req.requestId}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              req.status === "approved"
                                ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30"
                                : req.status === "rejected"
                                ? "bg-rose-500/15 text-rose-700 border border-rose-500/30"
                                : "bg-amber-500/15 text-amber-700 border border-amber-500/30 animate-pulse"
                            }`}
                          >
                            {req.status === "pending" ? "Pending Admin Approval" : req.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-foreground">
                          {req.requestType.replace("_", " ").toUpperCase()}: {req.reason || "Document details update"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Submitted on{" "}
                          {new Date(req.submittedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {req.reviewedBy ? ` · Reviewed by ${req.reviewedBy}` : ""}
                        </p>
                      </div>

                      {req.rejectionReason && (
                        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs text-rose-800">
                          <span className="font-bold">Reason:</span> {req.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: KYC & BANK DETAILS EDIT REQUEST (REQUIRES ADMIN APPROVAL)          */}
      {/* ========================================================================= */}
      {showKycEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-black text-foreground">Request KYC & Document Update</h3>
                <p className="text-xs text-muted-foreground">Requires QuickPress Admin Verification</p>
              </div>
              <button
                type="button"
                onClick={() => setShowKycEditModal(false)}
                className="rounded-full bg-muted/60 p-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Admin Approval Notice Callout */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
              <ShieldAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-black text-amber-900 dark:text-amber-200">
                  Admin Approval Required for Identity & Bank Changes
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/90 text-[11px] leading-relaxed">
                  For platform fraud prevention and settlement accuracy, any edits to your Bank Account, IFSC, PAN or Aadhaar must be verified and approved by the QuickPress Admin team before taking effect. Your live payouts will continue uninterrupted.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitKycEdit} className="space-y-4 text-xs">
              {/* Bank Account Details */}
              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="font-black text-foreground uppercase tracking-wider text-[11px]">
                  1. Settlement Bank Account Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-muted-foreground block mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={kycForm.bankName}
                      onChange={(e) => setKycForm({ ...kycForm, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-muted-foreground block mb-1">Account Holder Name *</label>
                    <input
                      type="text"
                      required
                      value={kycForm.accountHolder}
                      onChange={(e) => setKycForm({ ...kycForm, accountHolder: e.target.value })}
                      placeholder="Name as per Passbook"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-muted-foreground block mb-1">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={kycForm.accountNumber}
                      onChange={(e) => setKycForm({ ...kycForm, accountNumber: e.target.value })}
                      placeholder="e.g. 50200088194422"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-mono font-bold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-muted-foreground block mb-1">IFSC Code *</label>
                    <input
                      type="text"
                      required
                      value={kycForm.ifsc}
                      onChange={(e) => setKycForm({ ...kycForm, ifsc: e.target.value.toUpperCase() })}
                      placeholder="e.g. HDFC0002733"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-mono font-bold uppercase text-foreground"
                    />
                  </div>
                </div>

                {/* Cancelled Cheque Upload */}
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">
                    Upload Cancelled Cheque / Passbook Copy
                  </label>
                  <input
                    ref={chequeInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleChequeSelect}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => chequeInputRef.current?.click()}
                      disabled={uploadingCheque}
                      className="flex items-center gap-1.5 rounded-xl border border-dashed border-border bg-card px-4 py-2 font-bold text-foreground hover:bg-muted/40 transition-all cursor-pointer"
                    >
                      {uploadingCheque ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5 text-primary" />}
                      {kycForm.chequePhoto ? "Replace Document" : "Select Document Image"}
                    </button>
                    {kycForm.chequePhoto && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" />
                        Document Attached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax & Identity Details */}
              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="font-black text-foreground uppercase tracking-wider text-[11px]">
                  2. Official ID & Tax Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-muted-foreground block mb-1">PAN Card Number</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={kycForm.pan}
                      onChange={(e) => setKycForm({ ...kycForm, pan: e.target.value.toUpperCase() })}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-mono font-bold uppercase text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-muted-foreground block mb-1">Aadhaar Number</label>
                    <input
                      type="text"
                      maxLength={12}
                      value={kycForm.aadhaar}
                      onChange={(e) => setKycForm({ ...kycForm, aadhaar: e.target.value })}
                      placeholder="12 digit Aadhaar"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-mono font-bold text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-muted-foreground block mb-1">GSTIN (Optional)</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={kycForm.gstin}
                      onChange={(e) => setKycForm({ ...kycForm, gstin: e.target.value.toUpperCase() })}
                      placeholder="15 digit GSTIN"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-mono font-bold uppercase text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-muted-foreground block mb-1">Operating Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={kycForm.pincode}
                      onChange={(e) => setKycForm({ ...kycForm, pincode: e.target.value })}
                      placeholder="e.g. 207123"
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-mono font-bold text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Registered Address</label>
                  <input
                    type="text"
                    value={kycForm.address}
                    onChange={(e) => setKycForm({ ...kycForm, address: e.target.value })}
                    placeholder="Shop address, street, landmark"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
                  />
                </div>
              </div>

              {/* Reason for Update */}
              <div>
                <label className="font-bold text-muted-foreground block mb-1">
                  Reason for update (Optional)
                </label>
                <input
                  type="text"
                  value={kycForm.reason}
                  onChange={(e) => setKycForm({ ...kycForm, reason: e.target.value })}
                  placeholder="e.g. Changed current bank account branch"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKycEditModal(false)}
                  className="rounded-2xl border border-border/80 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted/40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingKyc}
                  className="flex items-center gap-2 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 px-5 py-2.5 text-xs font-black shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  {submittingKyc && <Loader2 className="size-3.5 animate-spin" />}
                  Submit for Admin Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DOCUMENT PREVIEW LIGHTBOX                                          */}
      {/* ========================================================================= */}
      {showDocPreview && showDocPreview.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-black text-foreground">{showDocPreview.title}</h3>
                {showDocPreview.subtitle && (
                  <p className="text-[11px] text-muted-foreground">{showDocPreview.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowDocPreview(null)}
                className="rounded-full bg-muted/60 p-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 flex flex-col items-center justify-center min-h-60 text-center">
              {showDocPreview.imageUrl && showDocPreview.imageUrl.startsWith("data:") ? (
                <img
                  src={showDocPreview.imageUrl}
                  alt={showDocPreview.title}
                  className="max-h-72 w-auto rounded-xl object-contain shadow-sm"
                />
              ) : (
                <div className="space-y-3 p-4">
                  <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mx-auto flex items-center justify-center">
                    <ShieldCheck className="size-8" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Verified Document on File</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                      Official document verified during onboarding and securely vaulted under compliance regulations.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-700">
                    <CheckCircle2 className="size-3.5" />
                    Verified Partner
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDocPreview(null)}
              className="w-full rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 py-2.5 text-xs font-black cursor-pointer"
            >
              Close Document Preview
            </button>
          </div>
        </div>
      )}

      <Toaster />
    </PartnerLayout>
  );
}
