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
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  Gift,
  Headphones,
  HelpCircle,
  History,
  Hourglass,
  Scale,
  IndianRupee,
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
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCcw,
  RotateCw,
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
  UploadCloud,
  User,
  UserCheck,
  Users,
  Utensils,
  Volume2,
  Wallet,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Toaster } from "@/shared/ui/sonner";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { usePartnerContext } from "../context/PartnerContext";
import { usePartnerServices } from "../context/PartnerServicesContext";
import { usePartnerResource } from "../hooks/use-partner-resource";
import { partnerRoutes } from "../navigation/partner-routes";
import { fetchPartnerProfile, getCachedPartnerProfile, toggleStoreStatus, updatePartnerProfile } from "@/api/partner/partner-profile-api";
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
import {
  fetchPartnerReferralHub,
  claimPartnerReferralReward,
  type PartnerReferralHubResponse,
} from "@/api/partner/partner-referral-api";

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
  const [copiedStoreLink, setCopiedStoreLink] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralHub, setReferralHub] = useState<PartnerReferralHubResponse | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [claimingReferral, setClaimingReferral] = useState(false);
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showPanNumber, setShowPanNumber] = useState(false);
  const [approvalRequests, setApprovalRequests] = useState<PartnerApprovalRequest[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);

  const loadReferralHub = async () => {
    try {
      setLoadingReferral(true);
      const res = await fetchPartnerReferralHub();
      setReferralHub(res);
    } catch (err) {
      console.error("Failed to load partner referral hub:", err);
    } finally {
      setLoadingReferral(false);
    }
  };

  const handleClaimReferral = async (rewardId?: string) => {
    try {
      setClaimingReferral(true);
      const res = await claimPartnerReferralReward(rewardId);
      toast.success(res.message || "Referral reward credited to current weekly cycle!");
      await loadReferralHub();
    } catch (err: any) {
      toast.error(err?.message || "Failed to claim referral reward");
    } finally {
      setClaimingReferral(false);
    }
  };

  useEffect(() => {
    void loadReferralHub();
  }, []);

  // KYC & Change Request State
  const [showDocPreview, setShowDocPreview] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    imageUrl: string;
    backImageUrl?: string;
    activeSide?: "front" | "back";
  } | null>(null);
  const [docZoom, setDocZoom] = useState(1);
  const [docRotation, setDocRotation] = useState(0);
  const [showAadhaarNumber, setShowAadhaarNumber] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [activeKycTab, setActiveKycTab] = useState<"documents" | "update" | "history">("documents");
  const [kycDocFilter, setKycDocFilter] = useState<"all" | "identity" | "finance" | "legal" | "attention">("all");
  const [auditStatusFilter, setAuditStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [uploadingDocField, setUploadingDocField] = useState<"chequePhoto" | "aadhaarFront" | "aadhaarBack" | "panCard" | null>(null);
  const kycUploadTargetRef = useRef<"chequePhoto" | "aadhaarFront" | "aadhaarBack" | "panCard">("chequePhoto");
  const kycFileInputRef = useRef<HTMLInputElement>(null);

  const [kycForm, setKycForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    email: "",
    pan: "",
    panCard: "",
    aadhaar: "",
    aadhaarFront: "",
    aadhaarBack: "",
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
        panCard: profile.panCard || "",
        aadhaar: profile.aadhaar || "",
        aadhaarFront: profile.aadhaarFront || "",
        aadhaarBack: profile.aadhaarBack || "",
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

  const triggerKycFileUpload = (field: "chequePhoto" | "aadhaarFront" | "aadhaarBack" | "panCard") => {
    kycUploadTargetRef.current = field;
    kycFileInputRef.current?.click();
  };

  const handleKycDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetField = kycUploadTargetRef.current;
    const labelMap: Record<typeof targetField, string> = {
      chequePhoto: "Cancelled Cheque / Passbook",
      aadhaarFront: "Aadhaar Front Scan",
      aadhaarBack: "Aadhaar Back Scan",
      panCard: "PAN Card Scan",
    };
    setUploadingDocField(targetField);
    try {
      const dataUrl = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
      setKycForm((prev) => ({ ...prev, [targetField]: dataUrl }));
      toast.success(`${labelMap[targetField]} attached!`);
    } catch {
      toast.error("Failed to process document image.");
    } finally {
      setUploadingDocField(null);
      if (kycFileInputRef.current) kycFileInputRef.current.value = "";
    }
  };

  const openDocumentLightbox = (opts: {
    title: string;
    subtitle?: string;
    imageUrl: string;
    backImageUrl?: string;
  }) => {
    setDocZoom(1);
    setDocRotation(0);
    setShowDocPreview({
      isOpen: true,
      activeSide: "front",
      ...opts,
    });
  };

  const copyKycValue = async (val: string, label: string) => {
    if (!val) {
      toast.error(`No ${label} available to copy`);
      return;
    }
    try {
      await navigator.clipboard.writeText(val);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy to clipboard");
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
      toast.success(res.message || "Change request submitted to Admin! Review typically takes 12-24 hours.");
      const reqs = await fetchPartnerApprovalRequests();
      setApprovalRequests(reqs);
      setActiveKycTab("history");
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

  const cachedProfile = getCachedPartnerProfile();
  const effectiveProfile = profile || cachedProfile;

  const storeName =
    effectiveProfile?.businessName ||
    effectiveProfile?.name ||
    session?.businessName ||
    effectiveProfile?.ownerName ||
    session?.ownerName ||
    "";
  const city = effectiveProfile?.city || session?.city || "";
  const partnerId = formatPartnerId(
    effectiveProfile?.partnerId ||
    (effectiveProfile as any)?.id ||
    session?.partnerId ||
    ""
  );

  const customerBaseUrl = (() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.endsWith(".local");
      if (isLocal) {
        return `${window.location.protocol}//${hostname}:8081`;
      }
    }
    return (
      (import.meta.env.VITE_CUSTOMER_URL as string | undefined) ||
      "https://withquickpress.com"
    );
  })();

  const storeCustomerUrl = `${customerBaseUrl}/store/${encodeURIComponent(partnerId)}`;

  const handleCopyStoreLink = async () => {
    try {
      await navigator.clipboard.writeText(storeCustomerUrl);
      setCopiedStoreLink(true);
      toast.success("Store link copied to clipboard!");
      setTimeout(() => setCopiedStoreLink(false), 2500);
    } catch {
      toast.error("Could not copy link to clipboard");
    }
  };

  const handleShareStoreLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${storeName} on QuickPress`,
          text: `Book laundry and garment care directly from ${storeName} on QuickPress!`,
          url: storeCustomerUrl,
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          handleCopyStoreLink();
        }
      }
    } else {
      handleCopyStoreLink();
    }
  };
  const phone = normalizeDisplayPhone(
    effectiveProfile?.phone ||
    effectiveProfile?.ownerPhone ||
    session?.phone ||
    ""
  );
  const logoImg =
    effectiveProfile?.logo ||
    effectiveProfile?.logoUrl ||
    effectiveProfile?.image ||
    effectiveProfile?.storeImage ||
    (session as any)?.storeImage ||
    (session as any)?.logoUrl ||
    (session as any)?.logo ||
    "";

  const kycStatusRaw = String(
    effectiveProfile?.kycStatus ||
    session?.kycStatus ||
    (effectiveProfile?.isVerified || session?.isVerified ? "verified" : "pending")
  ).toLowerCase();
  const isKycVerified = kycStatusRaw === "verified" || kycStatusRaw === "active" || kycStatusRaw === "approved";
  const isKycPending = kycStatusRaw === "pending" || kycStatusRaw === "under_review" || kycStatusRaw === "submitted";

  const aadhaarValue = effectiveProfile?.aadhaar || "";
  const panValue = effectiveProfile?.pan || "";
  const bankNameValue = bankData.bankName || effectiveProfile?.bankName || "";
  const bankAccountValue = bankData.accountNumber || effectiveProfile?.accountNumber || "";
  const bankIfscValue = bankData.ifscCode || effectiveProfile?.ifsc || "";
  const bankHolderValue = bankData.accountHolderName || effectiveProfile?.accountHolder || effectiveProfile?.ownerName || "";
  const gstinValue = effectiveProfile?.gstin || "";
  const storePhotoUrl =
    effectiveProfile?.banner ||
    effectiveProfile?.bannerUrl ||
    effectiveProfile?.cover ||
    effectiveProfile?.gallery?.[0] ||
    logoImg;
  const hasAadhaarScan = Boolean(effectiveProfile?.aadhaarFront || effectiveProfile?.aadhaarBack);
  const hasPanScan = Boolean(effectiveProfile?.panCard);
  const hasChequeScan = Boolean(kycForm.chequePhoto || effectiveProfile?.chequePhoto);
  const needsUploadCount =
    (!hasAadhaarScan && !aadhaarValue ? 1 : 0) +
    (!hasPanScan ? 1 : 0) +
    (!hasChequeScan && !bankAccountValue ? 1 : 0);
  const kycReadinessChecks = [
    Boolean(aadhaarValue || hasAadhaarScan),
    Boolean(panValue),
    Boolean(hasPanScan),
    Boolean(bankAccountValue && bankIfscValue),
    Boolean(effectiveProfile?.address || city),
    Boolean(effectiveProfile?.signatureUrl || effectiveProfile?.signedAt || isKycVerified),
  ].filter(Boolean).length;
  const kycReadinessPct = Math.round((kycReadinessChecks / 6) * 100);

  const kycChangeDiff = (() => {
    const diffs: Array<{ label: string; from: string; to: string }> = [];
    const baseHolder = profile?.accountHolder || profile?.businessName || "";
    const textPairs: Array<[string, string, string]> = [
      ["Bank Name", profile?.bankName || "", kycForm.bankName],
      ["Account Holder", baseHolder, kycForm.accountHolder],
      ["Account Number", profile?.accountNumber || "", kycForm.accountNumber],
      ["IFSC Code", (profile?.ifsc || "").toUpperCase(), kycForm.ifsc.toUpperCase()],
      ["PAN Number", (profile?.pan || "").toUpperCase(), kycForm.pan.toUpperCase()],
      ["Aadhaar Number", profile?.aadhaar || "", kycForm.aadhaar],
      ["GSTIN", (profile?.gstin || "").toUpperCase(), kycForm.gstin.toUpperCase()],
      ["Pincode", profile?.pincode || "", kycForm.pincode],
      ["Address", profile?.address || "", kycForm.address],
      ["Audit Note", "", kycForm.reason],
    ];
    for (const [label, fromVal, toVal] of textPairs) {
      if (toVal.trim() && toVal !== fromVal) {
        diffs.push({ label, from: fromVal || "Empty", to: toVal });
      }
    }
    if (kycForm.chequePhoto && kycForm.chequePhoto !== (profile?.chequePhoto || "")) {
      diffs.push({ label: "Cancelled Cheque Photo", from: profile?.chequePhoto ? "Existing" : "Empty", to: "New Scan Attached" });
    }
    if (kycForm.aadhaarFront && kycForm.aadhaarFront !== (profile?.aadhaarFront || "")) {
      diffs.push({ label: "Aadhaar Front Scan", from: profile?.aadhaarFront ? "Existing" : "Empty", to: "New Scan Attached" });
    }
    if (kycForm.aadhaarBack && kycForm.aadhaarBack !== (profile?.aadhaarBack || "")) {
      diffs.push({ label: "Aadhaar Back Scan", from: profile?.aadhaarBack ? "Existing" : "Empty", to: "New Scan Attached" });
    }
    if (kycForm.panCard && kycForm.panCard !== (profile?.panCard || "")) {
      diffs.push({ label: "PAN Card Photo", from: profile?.panCard ? "Existing" : "Empty", to: "New Scan Attached" });
    }
    return diffs;
  })();
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

  // Toggle Rush Hour in DB (debounced with unique toast ID to prevent duplicate popups)
  const isUpdatingRushHourRef = useRef(false);
  const handleToggleRushHour = async () => {
    if (isUpdatingRushHourRef.current) return;
    isUpdatingRushHourRef.current = true;
    const next = !opsConfig.rushHour;
    setOpsConfig((prev) => ({ ...prev, rushHour: next }));
    try {
      await updateOperationsConfig({ rushHour: next });
      toast.dismiss("rush-hour-mode-toggle");
      toast.success(next ? "Rush hour (+30 min buffer) enabled" : "Rush hour mode disabled", {
        id: "rush-hour-mode-toggle",
      });
    } catch {
      toast.error("Failed to update rush hour settings", { id: "rush-hour-mode-toggle" });
    } finally {
      setTimeout(() => {
        isUpdatingRushHourRef.current = false;
      }, 500);
    }
  };

  // Toggle Sound Alerts in DB (debounced with unique toast ID)
  const isUpdatingSoundRef = useRef(false);
  const handleToggleSound = async () => {
    if (isUpdatingSoundRef.current) return;
    isUpdatingSoundRef.current = true;
    const next = !opsConfig.soundAlerts;
    setOpsConfig((prev) => ({ ...prev, soundAlerts: next }));
    try {
      await updateOperationsConfig({ soundAlerts: next });
      toast.dismiss("sound-alerts-mode-toggle");
      toast.success(next ? "Order sound alerts enabled" : "Order sound alerts silenced", {
        id: "sound-alerts-mode-toggle",
      });
    } catch {
      toast.error("Failed to update sound settings", { id: "sound-alerts-mode-toggle" });
    } finally {
      setTimeout(() => {
        isUpdatingSoundRef.current = false;
      }, 500);
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

  const handleOpenDocuments = async (tab: "documents" | "update" | "history" = "documents") => {
    setActiveKycTab(tab);
    setKycDocFilter("all");
    setShowDocumentsModal(true);
    setLoadingApprovals(true);
    try {
      const [reqs, bank] = await Promise.all([
        fetchPartnerApprovalRequests(),
        fetchBankDetails().catch(() => null),
      ]);
      setApprovalRequests(reqs);
      if (bank) setBankData(bank);
    } catch {
      toast.error("Failed to fetch approval requests");
    } finally {
      setLoadingApprovals(false);
    }
  };

  const handleOpenApprovals = async () => {
    handleOpenDocuments("history");
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
      {/* UNIFIED RESPONSIVE CLEAN PROFILE WORKSPACE (Mobile & Desktop)             */}
      {/* ========================================================================= */}
      <div className="min-h-full bg-[#FAFAFA] pb-24 text-zinc-950">
        {/* Sticky Clean Header */}
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
          <div className="app-header-safe mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-3 md:px-6 md:pt-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.orders })}
                aria-label="Back to orders"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
              >
                <ArrowLeft className="size-4" />
              </button>
              <h1 className="text-base font-bold tracking-tight text-zinc-950 truncate">
                Partner Profile &amp; Store
              </h1>
            </div>

            <Link
              to={partnerRoutes.settings}
              aria-label="Settings"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-5xl space-y-5 px-4 pt-4 md:px-6 md:pt-5">
          {/* 1. Partner Profile Hero Card + 3-Pillar Stats */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
              />

              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate({ to: partnerRoutes.shop })}
                    className="group relative flex size-14 sm:size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-emerald-50 text-emerald-800 font-bold text-xl active:scale-95 transition-transform cursor-pointer"
                    title="Tap to manage Shop Profile & Photos"
                  >
                    {logoImg && !logoFailed ? (
                      <img
                        src={logoImg}
                        alt={`${storeName || "Store"} logo`}
                        onError={() => setLogoFailed(true)}
                        className="size-full object-cover"
                      />
                    ) : storeName ? (
                      storeName.slice(0, 2).toUpperCase()
                    ) : (
                      <Store className="size-6 text-emerald-700" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    title="Change Store Logo"
                    className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white transition-all hover:bg-emerald-700 active:scale-90 cursor-pointer"
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
                    <h2 className="truncate text-base font-bold text-zinc-950">
                      {storeName || (
                        <span className="inline-block h-5 w-32 rounded bg-zinc-200 animate-pulse" />
                      )}
                    </h2>
                    {isKycVerified ? (
                      <BadgeCheck className="size-4 text-blue-600 shrink-0" />
                    ) : null}
                  </div>
                  {phone ? (
                    <p className="text-xs font-medium text-zinc-500 tabular-nums mt-0.5">{phone}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {partnerId ? (
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 tabular-nums">
                        ID: {partnerId}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 tabular-nums">
                      <Star className="size-2.5 fill-current text-amber-500" />
                      {effectiveProfile?.rating !== undefined && Number(effectiveProfile.rating) > 0
                        ? Number(effectiveProfile.rating).toFixed(1)
                        : "New"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.shop })}
                aria-label="Edit Outlet Profile"
                className="flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 active:scale-95 cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Quick 3-Pillar Stats */}
            <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-zinc-100 pt-3.5 text-center">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Total Orders
                </p>
                <p className="mt-0.5 text-sm font-bold text-zinc-950 tabular-nums">
                  {effectiveProfile?.totalOrders ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  City Outlet
                </p>
                <p className="mt-0.5 text-sm font-bold text-zinc-950 truncate">
                  {city || session?.city || "—"}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  KYC Status
                </p>
                {isKycVerified ? (
                  <p className="mt-0.5 text-xs font-bold text-emerald-600">VERIFIED</p>
                ) : isKycPending ? (
                  <p className="mt-0.5 text-xs font-bold text-amber-600">PENDING</p>
                ) : (
                  <p className="mt-0.5 text-xs font-bold text-rose-600">ACTION REQ</p>
                )}
              </div>
            </div>
          </section>

          {/* 2. Section: Outlet & Operations (4-Tile Grid) */}
          <section>
            <div className="flex items-center justify-between px-0.5 mb-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Outlet &amp; Operations
              </h3>
              <span className="text-[10px] font-semibold text-zinc-400">Settings</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.shop })}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Store className="size-5" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-zinc-950">Outlet Info</p>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                    Profile &amp; details
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowTimingsModal(true)}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Clock className="size-5" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-zinc-950">Timings &amp; Slots</p>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                    Open hours &amp; slots
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowRadiusModal(true)}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <MapPin className="size-5" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-zinc-950">Pickup Radius</p>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                    Delivery coverage
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenDocuments("documents")}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FileCheck2 className="size-5" />
                </div>
                <div className="mt-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-zinc-950">KYC &amp; Docs</p>
                    <span
                      className={`size-1.5 rounded-full ${
                        isKycVerified ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                    {isKycVerified ? "Verified" : "Verification"}
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* 3. Section: Finance & Settlements (4-Tile Grid) */}
          <section>
            <div className="flex items-center justify-between px-0.5 mb-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Finance &amp; Settlements
              </h3>
              <span className="text-[10px] font-semibold text-zinc-400">Realtime Ledger</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.earnings })}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <IndianRupee className="size-5" />
                  </div>
                  <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-600" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-zinc-950">Weekly Payouts</p>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                    Bank transfer cycle
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.earnings })}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <FileText className="size-5" />
                  </div>
                  <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-600" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-zinc-950">Settlements</p>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                    Double-entry ledger
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleOpenBank}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <CreditCard className="size-5" />
                  </div>
                  <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-600" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-zinc-950">Bank Account</p>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                    Linked &amp; Verified
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleOpenGst}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <Receipt className="size-5" />
                  </div>
                  <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-600" />
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-zinc-950">GST &amp; Taxes</p>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
                    18% GST &amp; 1% TDS
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* 4. Section: Growth & Marketing */}
          <section>
            <div className="px-0.5 mb-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Growth &amp; Marketing
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Store Counter QR & Standee */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                    <QrCode className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-950">
                      Store Counter QR &amp; Standee
                    </p>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                      Scan QR to order or share storefront link
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrStandeeModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-white shrink-0 active:scale-95 transition-all cursor-pointer"
                >
                  <QrCode className="size-3.5" />
                  <span>QR &amp; Share</span>
                </button>
              </div>

              {/* Refer & Earn Card */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Gift className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-bold text-zinc-950">
                        Refer &amp; Earn ₹{referralHub?.activeRule?.referrerReward ?? 500}
                      </p>
                      {referralHub?.claimableBalance && referralHub.claimableBalance > 0 ? (
                        <span className="rounded-md bg-emerald-600 text-[10px] font-bold text-white px-1.5 py-0.5">
                          ₹{referralHub.claimableBalance} Ready
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                      Invite a laundromat &amp; earn payout rewards
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowReferralModal(true);
                    void loadReferralHub();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shrink-0 active:scale-95 transition-all cursor-pointer"
                >
                  <Gift className="size-3.5" />
                  <span>Invite &amp; Earn</span>
                </button>
              </div>
            </div>
          </section>

          {/* 5. Section: Support & Feedback */}
          <section>
            <div className="px-0.5 mb-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Support &amp; Feedback
              </h3>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.reviews })}
                className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Star className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-950">
                      Customer Reviews &amp; Ratings
                    </p>
                    <p className="text-[11px] font-medium text-zinc-500 truncate">
                      View customer feedback, store rating &amp; reply
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 shrink-0">
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 tabular-nums">
                    <Star className="size-2.5 fill-current text-amber-500" />
                    <span>
                      {effectiveProfile?.rating !== undefined && Number(effectiveProfile.rating) > 0
                        ? Number(effectiveProfile.rating).toFixed(1)
                        : "5.0"}
                    </span>
                  </span>
                  <ChevronRight className="size-4" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.help })}
                className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50/80 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <HelpCircle className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-950">
                      Help Centre &amp; Support Tickets
                    </p>
                    <p className="text-[11px] font-medium text-zinc-500 truncate">
                      Order assistance, fleet dispute &amp; ticket tracking
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-zinc-400 shrink-0" />
              </button>

              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Headphones className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-950">Partner Help &amp; Support</p>
                    <p className="text-[11px] font-medium text-zinc-500 truncate">
                      Available 24/7 for active laundry partners
                    </p>
                  </div>
                </div>
                <a
                  href="tel:18008890123"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 transition-all shrink-0"
                >
                  <PhoneCall className="size-3" />
                  <span>Call 24/7</span>
                </a>
              </div>
            </div>
          </section>

          {/* 6. Log Out Button */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 py-3.5 text-xs font-bold text-rose-600 transition-all active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="size-4" />
            <span>Log out from QuickPress Partner</span>
          </button>
        </div>
      </div>

      {/* All Working Modals Mounted Globally (Mobile & Desktop) */}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 1: Timings & Slot Capacity                              */}
        {/* ------------------------------------------------------------- */}
        {showTimingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowTimingsModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Clock className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-zinc-950">Shop Timings &amp; Weekly Off</h3>
                    <p className="text-[10px] text-zinc-500">Customer booking and pickup operating windows</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTimingsModal(false)}
                  className="flex size-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:text-zinc-950 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Opening and Closing Hours */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Morning Open</label>
                    <input
                      type="time"
                      value={opsConfig.openingTime}
                      onChange={(e) => setOpsConfig({ ...opsConfig, openingTime: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 font-bold text-zinc-950 focus:bg-white focus:border-zinc-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Evening Close</label>
                    <input
                      type="time"
                      value={opsConfig.closingTime}
                      onChange={(e) => setOpsConfig({ ...opsConfig, closingTime: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 font-bold text-zinc-950 focus:bg-white focus:border-zinc-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Weekly Off Day Select */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-500">Weekly Holiday / Rest Day</label>
                  <select
                    value={opsConfig.weeklyOff}
                    onChange={(e) => setOpsConfig({ ...opsConfig, weeklyOff: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 font-bold text-zinc-950 focus:bg-white focus:border-zinc-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="None">None (Open 7 Days a Week)</option>
                    <option value="Sunday">Sunday Closed (रविवार अवकाश)</option>
                    <option value="Monday">Monday Closed (सोमवार अवकाश)</option>
                    <option value="Tuesday">Tuesday Closed (मंगलवार अवकाश)</option>
                    <option value="Wednesday">Wednesday Closed (बुधवार अवकाश)</option>
                    <option value="Thursday">Thursday Closed (गुरुवार अवकाश)</option>
                    <option value="Friday">Friday Closed (शुक्रवार अवकाश)</option>
                    <option value="Saturday">Saturday Closed (शनिवार अवकाश)</option>
                  </select>
                </div>

                {/* Slot Capacity */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-zinc-500">2-Hour Slot Order Capacity</label>
                    <span className="text-[10px] text-zinc-400">Max pickups per window</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={opsConfig.slotCapacity}
                    onChange={(e) => setOpsConfig({ ...opsConfig, slotCapacity: parseInt(e.target.value, 10) || 20 })}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/70 p-2.5 font-bold text-zinc-950 focus:bg-white focus:border-zinc-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await updateOperationsConfig(opsConfig);
                    setShowTimingsModal(false);
                    toast.success("Store timings & weekly off saved to database!");
                  }}
                  className="w-full rounded-2xl bg-zinc-950 py-3 text-xs font-black text-white hover:bg-zinc-800 shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  Save Store Timings
                </button>
              </div>
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

                <div className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 border border-zinc-200 mt-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-zinc-900">Auto-Accept Orders</p>
                    </div>
                    <p className="text-[10px] text-zinc-500">Automatically accept incoming orders within serviceable radius</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(opsConfig.autoAccept)}
                    onChange={(e) => setOpsConfig({ ...opsConfig, autoAccept: e.target.checked })}
                    className="size-4 accent-emerald-600 cursor-pointer"
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
                  placeholder="Staff Full Name"
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
        {/* MODAL 4B: Store Documents, Government KYC & Verification Hub  */}
        {/* ------------------------------------------------------------- */}
        {/* MODAL 4: KYC & STORE DOCUMENTS VAULT (V4 CLEAN)               */}
        {/* ------------------------------------------------------------- */}
        {(showDocumentsModal || showApprovalsModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              onClick={() => {
                setShowDocumentsModal(false);
                setShowApprovalsModal(false);
              }}
              className="absolute inset-0"
            />
            <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-zinc-200/90 z-10 animate-in zoom-in-95 duration-200">
              {/* Hidden Shared File Input for Aadhaar Front/Back, PAN, Cheque */}
              <input
                ref={kycFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleKycDocSelect}
              />

              {/* Clean Header */}
              <div className="px-4 sm:px-6 pt-4 pb-3.5 border-b border-zinc-200 bg-white shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Readiness SVG Ring */}
                    <div className="relative size-11 shrink-0 flex items-center justify-center">
                      <svg className="size-11 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="23" stroke="#E4E4E7" strokeWidth="5" fill="none" />
                        <circle
                          cx="28"
                          cy="28"
                          r="23"
                          stroke="#10B981"
                          strokeWidth="5"
                          fill="none"
                          strokeDasharray="144.51"
                          strokeDashoffset={144.51 - (144.51 * kycReadinessPct) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-extrabold text-zinc-950">{kycReadinessPct}%</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-zinc-950 tracking-tight truncate">
                          KYC &amp; Store Documents
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border whitespace-nowrap ${
                            isKycVerified
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${isKycVerified ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {isKycVerified ? "Verified" : isKycPending ? "Under Review" : "Action Needed"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5 truncate">
                        {storeName || "Store"} · <span className="font-mono font-semibold text-zinc-700">{partnerId}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDocumentsModal(false);
                      setShowApprovalsModal(false);
                    }}
                    className="rounded-full size-8 border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Non-Overlapping Horizontal Scrollable Tab Bar */}
                <div className="mt-3.5 flex flex-nowrap overflow-x-auto no-scrollbar gap-1 p-1 rounded-2xl bg-zinc-100 border border-zinc-200/80">
                  <button
                    type="button"
                    onClick={() => setActiveKycTab("documents")}
                    className={`flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs transition-all cursor-pointer ${
                      activeKycTab === "documents"
                        ? "bg-white text-zinc-950 shadow-2xs font-bold"
                        : "text-zinc-600 hover:text-zinc-950 font-semibold"
                    }`}
                  >
                    <FileText className="size-3.5 shrink-0" />
                    Documents (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKycTab("update")}
                    className={`flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs transition-all cursor-pointer ${
                      activeKycTab === "update"
                        ? "bg-white text-zinc-950 shadow-2xs font-bold"
                        : "text-zinc-600 hover:text-zinc-950 font-semibold"
                    }`}
                  >
                    <UploadCloud className="size-3.5 shrink-0" />
                    Upload &amp; Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveKycTab("history")}
                    className={`flex-1 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl text-xs transition-all cursor-pointer ${
                      activeKycTab === "history"
                        ? "bg-white text-zinc-950 shadow-2xs font-bold"
                        : "text-zinc-600 hover:text-zinc-950 font-semibold"
                    }`}
                  >
                    <Clock className="size-3.5 shrink-0" />
                    Approvals ({approvalRequests.length})
                    {approvalRequests.filter((r) => r.status === "pending").length > 0 && (
                      <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA] space-y-4">

                {/* ==================== TAB 1: DOCUMENTS VAULT ==================== */}
                {activeKycTab === "documents" && (
                  <div className="space-y-4">
                    {/* Single-Line Horizontal Filter Slider */}
                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                      {(
                        [
                          { id: "all", label: "All (6)" },
                          { id: "identity", label: "Identity (2)" },
                          { id: "finance", label: "Bank & Tax (2)" },
                          { id: "legal", label: "Store & SLA (2)" },
                          ...(needsUploadCount > 0 ? [{ id: "attention", label: `Needs Upload (${needsUploadCount})`, warn: true }] : []),
                        ] as Array<{ id: typeof kycDocFilter; label: string; warn?: boolean }>
                      ).map((pill) => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => setKycDocFilter(pill.id)}
                          className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11.5px] border transition-colors cursor-pointer ${
                            kycDocFilter === pill.id
                              ? pill.warn
                                ? "bg-amber-700 text-white border-amber-700 font-bold"
                                : "bg-zinc-950 text-white border-zinc-950 font-bold"
                              : pill.warn
                              ? "bg-amber-50 text-amber-800 border-amber-200 font-semibold hover:bg-amber-100"
                              : "bg-white text-zinc-600 border-zinc-200 font-semibold hover:text-zinc-950"
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>

                    {/* 2-Column Document Vault Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

                      {/* 1. Aadhaar Card (UIDAI) */}
                      {(kycDocFilter === "all" ||
                        kycDocFilter === "identity" ||
                        (kycDocFilter === "attention" && !hasAadhaarScan && !aadhaarValue)) && (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col justify-between space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                                <Fingerprint className="size-4.5" />
                              </div>
                              <div>
                                <h4 className="text-[13px] font-bold text-zinc-950">Aadhaar Card (UIDAI)</h4>
                                <p className="text-[11px] text-zinc-500">
                                  {hasAadhaarScan ? "Front & Back Scan Attached" : "Proprietor National ID"}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border ${
                                aadhaarValue || hasAadhaarScan
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {aadhaarValue || hasAadhaarScan ? "Verified" : "Pending"}
                            </span>
                          </div>

                          <div className="rounded-xl bg-[#FAFAFA] border border-zinc-200 px-3 py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase text-zinc-400">Aadhaar Number</p>
                              <p className="font-mono text-xs font-bold text-zinc-950 tracking-wider mt-0.5 truncate">
                                {aadhaarValue
                                  ? showAadhaarNumber
                                    ? aadhaarValue
                                    : `XXXX XXXX ${String(aadhaarValue).slice(-4)}`
                                  : "Not provided"}
                              </p>
                            </div>
                            {aadhaarValue && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setShowAadhaarNumber(!showAadhaarNumber)}
                                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                                >
                                  {showAadhaarNumber ? "Mask" : "Reveal"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyKycValue(aadhaarValue, "Aadhaar")}
                                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-[11.5px]">
                            <button
                              type="button"
                              onClick={() =>
                                openDocumentLightbox({
                                  title: "Aadhaar Card (UIDAI)",
                                  subtitle: `Owner: ${effectiveProfile?.ownerName || storeName}`,
                                  imageUrl: effectiveProfile?.aadhaarFront || "",
                                  backImageUrl: effectiveProfile?.aadhaarBack || "",
                                })
                              }
                              className="inline-flex items-center gap-1.5 font-bold text-zinc-950 hover:underline cursor-pointer"
                            >
                              <Eye className="size-3.5 text-zinc-500" />
                              Inspect Front &amp; Back
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveKycTab("update")}
                              className="font-semibold text-zinc-500 hover:text-zinc-950 cursor-pointer"
                            >
                              Update
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 2. PAN Card (Income Tax) */}
                      {(kycDocFilter === "all" ||
                        kycDocFilter === "identity" ||
                        (kycDocFilter === "attention" && !hasPanScan)) && (
                        <div
                          className={`rounded-2xl border bg-white p-4 flex flex-col justify-between space-y-3 ${
                            !hasPanScan ? "border-amber-300" : "border-zinc-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex size-9 items-center justify-center rounded-xl border shrink-0 ${
                                  !hasPanScan
                                    ? "bg-amber-50 text-amber-600 border-amber-200"
                                    : "bg-amber-50 text-amber-700 border-amber-100"
                                }`}
                              >
                                <CreditCard className="size-4.5" />
                              </div>
                              <div>
                                <h4 className="text-[13px] font-bold text-zinc-950">PAN Card (Income Tax)</h4>
                                <p className={`text-[11px] ${!hasPanScan ? "text-amber-700 font-semibold" : "text-zinc-500"}`}>
                                  {hasPanScan ? "PAN Scan Attached" : panValue ? "Number Added · Photo Missing" : "Identity Tax Record"}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border ${
                                !hasPanScan
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {!hasPanScan ? "Scan Missing" : "Verified"}
                            </span>
                          </div>

                          <div className="rounded-xl bg-[#FAFAFA] border border-zinc-200 px-3 py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase text-zinc-400">PAN Number</p>
                              <p className="font-mono text-xs font-bold text-zinc-950 tracking-wider mt-0.5 truncate">
                                {panValue
                                  ? showPanNumber
                                    ? panValue
                                    : `${String(panValue).slice(0, 2)}XXXXX${String(panValue).slice(-2)}`
                                  : "Not provided"}
                              </p>
                            </div>
                            {panValue && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setShowPanNumber(!showPanNumber)}
                                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                                >
                                  {showPanNumber ? "Mask" : "Reveal"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyKycValue(panValue, "PAN Number")}
                                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-[11.5px]">
                            {!hasPanScan ? (
                              <button
                                type="button"
                                onClick={() => setActiveKycTab("update")}
                                className="inline-flex items-center gap-1.5 font-bold text-amber-700 hover:underline cursor-pointer"
                              >
                                <UploadCloud className="size-3.5" />
                                Upload PAN Photo
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  openDocumentLightbox({
                                    title: "Permanent Account Number (PAN)",
                                    subtitle: storeName || "Income Tax Record",
                                    imageUrl: effectiveProfile?.panCard || "",
                                  })
                                }
                                className="inline-flex items-center gap-1.5 font-bold text-zinc-950 hover:underline cursor-pointer"
                              >
                                <Eye className="size-3.5 text-zinc-500" />
                                Inspect PAN Copy
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                openDocumentLightbox({
                                  title: "Permanent Account Number (PAN)",
                                  subtitle: storeName || "Income Tax Record",
                                  imageUrl: effectiveProfile?.panCard || "",
                                })
                              }
                              className="font-semibold text-zinc-500 hover:text-zinc-950 cursor-pointer"
                            >
                              View Record
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 3. Settlement Bank & Cancelled Cheque */}
                      {(kycDocFilter === "all" ||
                        kycDocFilter === "finance" ||
                        (kycDocFilter === "attention" && !hasChequeScan && !bankAccountValue)) && (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col justify-between space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                                <Landmark className="size-4.5" />
                              </div>
                              <div>
                                <h4 className="text-[13px] font-bold text-zinc-950">Settlement Bank &amp; Cheque</h4>
                                <p className="text-[11px] text-zinc-500">
                                  {bankNameValue ? `${bankNameValue} · Payout Account` : "Weekly Payout Account"}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border ${
                                bankAccountValue
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {bankAccountValue ? "Verified" : "Pending"}
                            </span>
                          </div>

                          <div className="rounded-xl bg-[#FAFAFA] border border-zinc-200 p-2.5 space-y-1.5 text-[11.5px]">
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500">Account No</span>
                              <strong className="font-mono text-zinc-950">
                                {bankAccountValue ? `•••• •••• ${String(bankAccountValue).slice(-4)}` : "Not linked"}
                              </strong>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500">IFSC Code</span>
                              <div className="flex items-center gap-1.5">
                                <strong className="font-mono text-zinc-950">{bankIfscValue || "—"}</strong>
                                {bankIfscValue && (
                                  <button
                                    type="button"
                                    onClick={() => copyKycValue(bankIfscValue, "IFSC")}
                                    className="rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                                  >
                                    Copy
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-[11.5px]">
                            <button
                              type="button"
                              onClick={() =>
                                openDocumentLightbox({
                                  title: "Cancelled Cheque / Passbook",
                                  subtitle: bankNameValue ? `${bankNameValue} ••${String(bankAccountValue).slice(-4)}` : "Bank Proof",
                                  imageUrl: kycForm.chequePhoto || effectiveProfile?.chequePhoto || "",
                                })
                              }
                              className="inline-flex items-center gap-1.5 font-bold text-zinc-950 hover:underline cursor-pointer"
                            >
                              <Eye className="size-3.5 text-zinc-500" />
                              Inspect Cancelled Cheque
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveKycTab("update")}
                              className="font-semibold text-zinc-500 hover:text-zinc-950 cursor-pointer"
                            >
                              Switch Bank
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 4. GSTIN Registration */}
                      {(kycDocFilter === "all" || kycDocFilter === "finance") && (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col justify-between space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100 shrink-0">
                                <FileText className="size-4.5" />
                              </div>
                              <div>
                                <h4 className="text-[13px] font-bold text-zinc-950">GSTIN Registration</h4>
                                <p className="text-[11px] text-zinc-500">Goods &amp; Services Tax Record</p>
                              </div>
                            </div>
                            <span className="rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 text-[10.5px] font-bold">
                              {gstinValue ? "Registered" : "Exempt"}
                            </span>
                          </div>

                          <div className="rounded-xl bg-[#FAFAFA] border border-zinc-200 px-3 py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase text-zinc-400">GSTIN Number</p>
                              <p className="font-mono text-xs font-bold text-zinc-950 mt-0.5 truncate">
                                {gstinValue || "Exemption Declared"}
                              </p>
                            </div>
                            {gstinValue && (
                              <button
                                type="button"
                                onClick={() => copyKycValue(gstinValue, "GSTIN")}
                                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer shrink-0"
                              >
                                Copy
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-[11.5px]">
                            <span className="text-zinc-500">Tax Compliance Active</span>
                            <button
                              type="button"
                              onClick={() => setActiveKycTab("update")}
                              className="font-semibold text-zinc-500 hover:text-zinc-950 cursor-pointer"
                            >
                              Update GSTIN
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 5. Outlet Frontage & Address */}
                      {(kycDocFilter === "all" || kycDocFilter === "legal") && (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col justify-between space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 border border-zinc-200 shrink-0">
                                <Store className="size-4.5" />
                              </div>
                              <div>
                                <h4 className="text-[13px] font-bold text-zinc-950">Outlet Frontage &amp; Address</h4>
                                <p className="text-[11px] text-zinc-500">
                                  {city || "City"}{effectiveProfile?.pincode ? ` · PIN ${effectiveProfile.pincode}` : ""}
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10.5px] font-bold">
                              Inspected
                            </span>
                          </div>

                          <div className="rounded-xl bg-[#FAFAFA] border border-zinc-200 p-2.5 text-[11.5px] text-zinc-600 line-clamp-2">
                            {effectiveProfile?.address || city || "Registered store location verified"}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-[11.5px]">
                            <button
                              type="button"
                              onClick={() =>
                                openDocumentLightbox({
                                  title: "Store Frontage Photo",
                                  subtitle: `${city || "Outlet"}${effectiveProfile?.pincode ? ` (${effectiveProfile.pincode})` : ""}`,
                                  imageUrl: storePhotoUrl || "",
                                })
                              }
                              className="inline-flex items-center gap-1.5 font-bold text-zinc-950 hover:underline cursor-pointer"
                            >
                              <Eye className="size-3.5 text-zinc-500" />
                              View Store Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveKycTab("update")}
                              className="font-semibold text-zinc-500 hover:text-zinc-950 cursor-pointer"
                            >
                              Edit Address
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 6. Bilateral Franchise SLA Agreement */}
                      {(kycDocFilter === "all" || kycDocFilter === "legal") && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-col justify-between space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
                                <Scale className="size-4.5" />
                              </div>
                              <div>
                                <h4 className="text-[13px] font-bold text-emerald-950">Franchise SLA Agreement</h4>
                                <p className="text-[11px] text-emerald-700">
                                  {effectiveProfile?.agreementVersion || "QP-SLA-2026.4"} · Digitally Signed
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[10.5px] font-bold">
                              Executed
                            </span>
                          </div>

                          <div className="rounded-xl bg-white/80 border border-emerald-200/80 p-2.5 text-[11.5px] flex items-center justify-between gap-2">
                            <span className="text-emerald-900 truncate">
                              Signatory: <strong>{effectiveProfile?.signedByName || effectiveProfile?.ownerName || "Proprietor"}</strong>
                            </span>
                            {effectiveProfile?.signedAt && (
                              <span className="font-mono text-[11px] font-bold text-emerald-700 shrink-0">
                                {new Date(effectiveProfile.signedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-emerald-200/70 text-[11.5px]">
                            <button
                              type="button"
                              onClick={() =>
                                openDocumentLightbox({
                                  title: "Signed SLA & Signature",
                                  subtitle: effectiveProfile?.agreementVersion || "QP-SLA-2026.4",
                                  imageUrl: effectiveProfile?.signatureUrl || "",
                                })
                              }
                              className="font-bold text-emerald-900 hover:underline cursor-pointer"
                            >
                              View Signature
                            </button>
                            <a
                              href={`/api/admin/emails/agreements/${partnerId}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-white border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
                            >
                              <Download className="size-3" />
                              Download PDF
                            </a>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* ==================== TAB 2: UPLOAD & EDIT KYC ==================== */}
                {activeKycTab === "update" && (
                  <form onSubmit={handleSubmitKycEdit} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    {/* Left 2/3 Form Sections */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Section 1: Settlement Bank & Cancelled Cheque */}
                      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-5.5 items-center justify-center rounded-md bg-zinc-950 text-[11px] font-extrabold text-white">
                            1
                          </span>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-950">
                            Settlement Bank &amp; Cancelled Cheque
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="font-semibold text-zinc-500 block mb-1">Bank Name *</label>
                            <input
                              type="text"
                              required
                              value={kycForm.bankName}
                              onChange={(e) => setKycForm({ ...kycForm, bankName: e.target.value })}
                              placeholder="e.g. HDFC Bank"
                              className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-semibold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-zinc-500 block mb-1">Account Holder Name *</label>
                            <input
                              type="text"
                              required
                              value={kycForm.accountHolder}
                              onChange={(e) => setKycForm({ ...kycForm, accountHolder: e.target.value })}
                              placeholder="Name as per Passbook"
                              className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-semibold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-zinc-500 block mb-1">Account Number *</label>
                            <input
                              type="text"
                              required
                              value={kycForm.accountNumber}
                              onChange={(e) => setKycForm({ ...kycForm, accountNumber: e.target.value })}
                              placeholder="e.g. 50200088194422"
                              className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-mono font-bold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-zinc-500 block mb-1">IFSC Code *</label>
                            <input
                              type="text"
                              required
                              maxLength={11}
                              value={kycForm.ifsc}
                              onChange={(e) => setKycForm({ ...kycForm, ifsc: e.target.value.toUpperCase() })}
                              placeholder="e.g. HDFC0002733"
                              className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-mono font-bold uppercase text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-dashed border-zinc-300 bg-[#FAFAFA] p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-950">Cancelled Cheque / Passbook Proof</p>
                            <p className={`text-[10.5px] font-semibold ${kycForm.chequePhoto ? "text-emerald-700" : "text-zinc-500"}`}>
                              {kycForm.chequePhoto ? "Cheque / passbook image attached" : "Upload clear photo of cheque or passbook"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => triggerKycFileUpload("chequePhoto")}
                            disabled={uploadingDocField === "chequePhoto"}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-900 hover:bg-zinc-50 cursor-pointer"
                          >
                            {uploadingDocField === "chequePhoto" ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <UploadCloud className="size-3.5" />
                            )}
                            {kycForm.chequePhoto ? "Replace" : "Upload"}
                          </button>
                        </div>
                      </div>

                      {/* Section 2: Identity Proofs & Scans */}
                      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-5.5 items-center justify-center rounded-md bg-zinc-950 text-[11px] font-extrabold text-white">
                            2
                          </span>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-950">
                            Identity Proofs &amp; Scans
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="font-semibold text-zinc-500 block mb-1">PAN Number</label>
                            <input
                              type="text"
                              maxLength={10}
                              value={kycForm.pan}
                              onChange={(e) => setKycForm({ ...kycForm, pan: e.target.value.toUpperCase() })}
                              placeholder="e.g. ABCDE1234F"
                              className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-mono font-bold uppercase text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-zinc-500 block mb-1">Aadhaar Number</label>
                            <input
                              type="text"
                              maxLength={12}
                              value={kycForm.aadhaar}
                              onChange={(e) => setKycForm({ ...kycForm, aadhaar: e.target.value })}
                              placeholder="12 digit Aadhaar"
                              className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-mono font-bold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {(
                            [
                              { field: "aadhaarFront", label: "Aadhaar Front", attached: Boolean(kycForm.aadhaarFront) },
                              { field: "aadhaarBack", label: "Aadhaar Back", attached: Boolean(kycForm.aadhaarBack) },
                              { field: "panCard", label: "PAN Card Photo", attached: Boolean(kycForm.panCard) },
                            ] as const
                          ).map((slot) => (
                            <button
                              key={slot.field}
                              type="button"
                              onClick={() => triggerKycFileUpload(slot.field)}
                              disabled={uploadingDocField === slot.field}
                              className={`rounded-xl border border-dashed p-3 text-left transition-colors cursor-pointer ${
                                slot.attached
                                  ? "border-zinc-300 bg-[#FAFAFA] hover:bg-zinc-100"
                                  : "border-amber-300 bg-amber-50/60 hover:bg-amber-100/60"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[11.5px] font-bold ${slot.attached ? "text-zinc-950" : "text-amber-950"}`}>
                                  {slot.label}
                                </span>
                                {uploadingDocField === slot.field ? (
                                  <Loader2 className="size-3 animate-spin text-zinc-500" />
                                ) : (
                                  <span className={`size-2 rounded-full ${slot.attached ? "bg-emerald-500" : "bg-amber-500"}`} />
                                )}
                              </div>
                              <p className={`text-[10px] mt-1 ${slot.attached ? "text-zinc-500" : "text-amber-800 font-semibold"}`}>
                                {slot.attached ? "Attached · Tap to replace" : "Tap to upload scan"}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section 3: GSTIN & Registered Address */}
                      <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex size-5.5 items-center justify-center rounded-md bg-zinc-950 text-[11px] font-extrabold text-white">
                            3
                          </span>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-950">
                            GSTIN &amp; Registered Address
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold text-zinc-500 block mb-1">GSTIN (Optional)</label>
                            <input
                              type="text"
                              maxLength={15}
                              value={kycForm.gstin}
                              onChange={(e) => setKycForm({ ...kycForm, gstin: e.target.value.toUpperCase() })}
                              placeholder="15 digit GSTIN"
                              className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-mono font-bold uppercase text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-zinc-500 block mb-1">Operating Pincode</label>
                            <input
                              type="text"
                              maxLength={6}
                              value={kycForm.pincode}
                              onChange={(e) => setKycForm({ ...kycForm, pincode: e.target.value })}
                              placeholder="e.g. 207123"
                              className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-mono font-bold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-semibold text-zinc-500 block mb-1">Registered Store Address</label>
                          <input
                            type="text"
                            value={kycForm.address}
                            onChange={(e) => setKycForm({ ...kycForm, address: e.target.value })}
                            placeholder="Shop address, street, landmark"
                            className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-semibold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-zinc-500 block mb-1">Reason for Change</label>
                          <input
                            type="text"
                            value={kycForm.reason}
                            onChange={(e) => setKycForm({ ...kycForm, reason: e.target.value })}
                            placeholder="e.g. Uploaded PAN scan or updated current bank account"
                            className="w-full rounded-xl border border-zinc-200 bg-[#FAFAFA] px-3 py-2 text-xs font-semibold text-zinc-950 focus:bg-white focus:border-zinc-950 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right 1/3 Sticky Pre-Submit Change Diff Card */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3.5 lg:sticky lg:top-0">
                      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100">
                        <div>
                          <h4 className="text-[13px] font-extrabold text-zinc-950">Pre-Submit Change Diff</h4>
                          <p className="text-[11px] text-zinc-500">Before → After summary</p>
                        </div>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10.5px] font-bold text-zinc-700">
                          {kycChangeDiff.length} {kycChangeDiff.length === 1 ? "edit" : "edits"}
                        </span>
                      </div>

                      {kycChangeDiff.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-200 bg-[#FAFAFA] p-4 text-center text-[11.5px] text-zinc-500">
                          Edit any field or attach a document on the left to inspect exact Before → After changes before submitting.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                          {kycChangeDiff.map((item) => (
                            <div key={item.label} className="rounded-xl border border-zinc-200 bg-[#FAFAFA] p-2.5 text-[11px]">
                              <div className="text-[10px] font-bold uppercase text-zinc-400">{item.label}</div>
                              <div className="mt-0.5 flex items-center justify-between gap-2 font-mono">
                                <span className="text-zinc-400 line-through truncate">{item.from}</span>
                                <span className="font-bold text-emerald-700 truncate">→ {item.to}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-[11px] text-sky-900 leading-relaxed">
                        Current payouts &amp; store operations remain active during Admin verification (12–24 hrs).
                      </div>

                      <button
                        type="submit"
                        disabled={submittingKyc}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white py-2.5 text-xs font-bold active:scale-[0.98] transition-all cursor-pointer"
                      >
                        {submittingKyc && <Loader2 className="size-3.5 animate-spin" />}
                        Submit Update for Approval
                      </button>
                    </div>
                  </form>
                )}

                {/* ==================== TAB 3: APPROVALS TIMELINE ==================== */}
                {activeKycTab === "history" && (
                  <div className="space-y-3.5">
                    <div className="flex flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-0.5">
                      <div className="flex flex-nowrap items-center gap-1.5">
                        {(
                          [
                            { id: "all", label: `All (${approvalRequests.length})` },
                            { id: "pending", label: `Pending (${approvalRequests.filter((r) => r.status === "pending").length})` },
                            { id: "approved", label: `Approved (${approvalRequests.filter((r) => r.status === "approved").length})` },
                            { id: "rejected", label: `Rejected (${approvalRequests.filter((r) => r.status === "rejected").length})` },
                          ] as const
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setAuditStatusFilter(f.id)}
                            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] border transition-colors cursor-pointer ${
                              auditStatusFilter === f.id
                                ? "bg-zinc-950 text-white border-zinc-950 font-bold"
                                : "bg-white text-zinc-600 border-zinc-200 font-semibold hover:text-zinc-950"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveKycTab("update")}
                        className="shrink-0 whitespace-nowrap rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white px-3.5 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        + New Request
                      </button>
                    </div>

                    {loadingApprovals ? (
                      <div className="py-12 text-center text-zinc-500 font-semibold text-xs">
                        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-zinc-700" />
                        Fetching live verification requests...
                      </div>
                    ) : approvalRequests.filter((r) => auditStatusFilter === "all" || r.status === auditStatusFilter).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center bg-white">
                        <ShieldCheck className="mx-auto size-9 text-emerald-600 mb-2" />
                        <h4 className="text-xs font-bold text-zinc-950">
                          {approvalRequests.length === 0 ? "All Store Documents Verified" : "No Requests in This Filter"}
                        </h4>
                        <p className="text-[11px] text-zinc-500 mt-1 max-w-xs mx-auto">
                          {approvalRequests.length === 0
                            ? "You have no pending change requests. All verified KYC and banking records are active."
                            : "Switch filter pills above to view all approval records."}
                        </p>
                      </div>
                    ) : (
                      approvalRequests
                        .filter((r) => auditStatusFilter === "all" || r.status === auditStatusFilter)
                        .map((req) => (
                          <div
                            key={req.requestId}
                            className={`rounded-2xl border p-4 space-y-2.5 bg-white ${
                              req.status === "pending" ? "border-amber-300" : "border-zinc-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-zinc-950 text-xs uppercase tracking-wide">
                                    {req.requestType?.replace(/_/g, " ") || "KYC & Document Update"}
                                  </span>
                                  <span className="font-mono text-[10.5px] text-zinc-400">{req.requestId}</span>
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                  {new Date(req.submittedAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold border ${
                                  req.status === "approved"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : req.status === "rejected"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                {req.status === "approved" ? "Approved" : req.status === "rejected" ? "Rejected" : "Pending"}
                              </span>
                            </div>

                            {req.requestedChanges && Object.keys(req.requestedChanges).length > 0 && (
                              <div className="rounded-xl bg-[#FAFAFA] border border-zinc-200 p-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                {Object.entries(req.requestedChanges)
                                  .filter(([, v]) => typeof v === "string" && !v.startsWith("data:") && v.trim() !== "")
                                  .slice(0, 4)
                                  .map(([k, v]) => (
                                    <span key={k} className="text-zinc-500">
                                      {k}: <strong className="font-mono text-zinc-900">{String(v)}</strong>
                                    </span>
                                  ))}
                              </div>
                            )}

                            {req.reason && (
                              <p className="text-[11px] text-zinc-600">
                                <span className="font-semibold text-zinc-400">Note:</span> {req.reason}
                              </p>
                            )}

                            {req.rejectionReason && (
                              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-rose-800">
                                <span>
                                  <strong>Rejection Reason:</strong> {req.rejectionReason}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveKycTab("update")}
                                  className="shrink-0 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                                >
                                  Fix &amp; Resubmit
                                </button>
                              </div>
                            )}

                            {req.status === "approved" && (
                              <p className="text-[11px] text-emerald-700 font-semibold">
                                Approved by {req.reviewedBy || "Compliance Team"} on{" "}
                                {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString("en-IN") : "Approval Date"}
                              </p>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>

              {/* Clean Modal Footer */}
              <div className="px-5 py-3.5 border-t border-zinc-200 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  <span>Encrypted Compliance Vault</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDocumentsModal(false);
                    setShowApprovalsModal(false);
                  }}
                  className="rounded-xl bg-zinc-950 hover:bg-zinc-800 px-5 py-1.5 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
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
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-dark py-3 text-xs font-black text-white active:scale-95 shadow-md shadow-primary/20 cursor-pointer"
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
        {/* MODAL 7: Printable Store QR Standee & Direct Share Link       */}
        {/* ------------------------------------------------------------- */}
        {showQrStandeeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setShowQrStandeeModal(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs" />
            <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl text-center space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="text-sm font-black text-zinc-900">Store QR Standee</h3>
                  <p className="text-[10.5px] font-medium text-zinc-500">Scan to open store &amp; order directly</p>
                </div>
                <button type="button" onClick={() => setShowQrStandeeModal(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200">✕</button>
              </div>

              {/* Printable Standee Preview */}
              <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-gradient-to-b from-amber-500/10 via-white to-emerald-500/10 p-5 space-y-2.5">
                <div className="flex items-center justify-center gap-1.5">
                  <Sparkles className="size-4 text-emerald-600" />
                  <p className="text-xs font-black tracking-tight text-zinc-950 uppercase">QuickPress Laundry Hub</p>
                </div>
                <h4 className="text-base font-black text-zinc-900 leading-tight">{storeName}</h4>
                <p className="text-[11px] font-semibold text-zinc-500">Partner Store ID: {partnerId}</p>

                {/* QR Code */}
                <div className="mx-auto flex size-44 items-center justify-center rounded-2xl bg-white p-2 shadow-md border border-zinc-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(storeCustomerUrl)}`}
                    alt={`QuickPress Store QR - ${storeName}`}
                    className="size-full rounded-xl object-contain"
                  />
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-800">Scan &amp; Book Laundry Pickup</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Scans redirect directly to your customer storefront</p>
                </div>
              </div>

              {/* Store Direct Link Box */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Store Direct Link</span>
                  <a
                    href={storeCustomerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-zinc-900 hover:underline"
                  >
                    <span>Open</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5">
                  <span className="truncate text-xs font-medium text-zinc-700 select-all flex-1">
                    {storeCustomerUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyStoreLink}
                    className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-black text-zinc-900 hover:bg-zinc-200 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    {copiedStoreLink ? (
                      <>
                        <Check className="size-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons: Share Link & WhatsApp */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShareStoreLink}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border-2 border-black bg-zinc-100 py-2.5 text-xs font-black text-black active:scale-95 transition-all hover:bg-zinc-200 cursor-pointer shadow-xs"
                >
                  <Share2 className="size-3.5" />
                  <span>Share Link</span>
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Book laundry & dry cleaning from ${storeName} on QuickPress:\n${storeCustomerUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-600 bg-emerald-600 py-2.5 text-xs font-black text-white active:scale-95 transition-all hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  <PhoneCall className="size-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.print();
                  toast.success("Printing Store Standee QR!");
                }}
                className="w-full rounded-2xl bg-zinc-950 py-2.5 text-xs font-black text-white active:scale-95 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <Printer className="size-4" />
                <span>Print Standee Document</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODAL 7b: Refer & Earn (Partner to Partner Hub) - MINIMAL THEME */}
        {/* ------------------------------------------------------------- */}
        {showReferralModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setShowReferralModal(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs"
            />
            <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl border border-zinc-200 space-y-4 text-left animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                      Partner Referral
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-500">
                      {referralHub?.activeRule?.city || "All Cities"}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-black text-zinc-950">
                    {referralHub?.activeRule?.headline || `Refer a Partner & Earn ₹${referralHub?.activeRule?.referrerReward ?? 500}`}
                  </h3>
                  <p className="text-[11px] font-medium text-zinc-500">
                    {referralHub?.activeRule?.subheadline || "Disbursed directly into your weekly bank settlement cycle."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="rounded-full bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200"
                >
                  ✕
                </button>
              </div>

              {/* Claimable Balance Card (if balance is available) */}
              {referralHub && referralHub.claimableBalance > 0 && (
                <div className="rounded-2xl bg-zinc-950 p-4 text-white shadow-md space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Claimable Referral Reward</p>
                      <p className="text-2xl font-black text-white">₹{referralHub.claimableBalance.toLocaleString("en-IN")}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                      {referralHub.unlockedMilestoneCount} Unlocked
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Target order milestone reached! Transfer this reward into your current weekly bank payout cycle.
                  </p>
                  <button
                    type="button"
                    disabled={claimingReferral}
                    onClick={() => handleClaimReferral()}
                    className="w-full rounded-xl bg-white py-2.5 text-xs font-black text-zinc-950 hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    {claimingReferral ? "Transferring to Cycle..." : "Claim to Weekly Settlement Cycle"}
                  </button>
                </div>
              )}

              {/* Referral Code & Share Card */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-700">Your Store Referral Code</span>
                  <span className="text-[10px] text-zinc-400">Share with fellow laundromat owners</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl bg-white px-3.5 py-2.5 font-mono text-sm font-black text-zinc-900 border border-zinc-200 text-center tracking-wider">
                    {referralHub?.code || "QP-PRT-..."}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!referralHub?.code) return;
                      navigator.clipboard.writeText(referralHub.code);
                      setCopiedReferralCode(true);
                      toast.success("Referral code copied!");
                      setTimeout(() => setCopiedReferralCode(false), 2000);
                    }}
                    className="flex items-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100 active:scale-95 transition"
                  >
                    {copiedReferralCode ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    <span>{copiedReferralCode ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                {/* WhatsApp Share Button */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    referralHub?.shareMessage ||
                      `Register your laundromat on QuickPress with my code ${referralHub?.code} and start receiving orders: https://quickpress.online/partner-register?ref=${referralHub?.code}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 active:scale-95 transition"
                >
                  <Share2 className="size-4" />
                  <span>Share via WhatsApp</span>
                </a>
              </div>

              {/* Milestone Progress for Referred Stores */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-900">
                    Referred Laundromats ({referralHub?.ledger?.length ?? 0})
                  </h4>
                  <span className="text-[10px] text-zinc-400">
                    Total Earned: ₹{(referralHub?.totalClaimedBalance ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>

                {loadingReferral ? (
                  <div className="py-6 text-center text-xs text-zinc-400">Loading referral progress...</div>
                ) : !referralHub?.ledger?.length ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 p-4 text-center">
                    <p className="text-xs font-semibold text-zinc-700">No referred stores yet</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Share your code with any laundry store owner. When they complete {referralHub?.activeRule?.targetOrdersCount ?? 10} orders, you get ₹{referralHub?.activeRule?.referrerReward ?? 500}!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {referralHub.ledger.map((item) => {
                      const pct = Math.min(100, Math.round((item.completedOrders / (item.targetOrders || 1)) * 100));

                      return (
                        <div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-zinc-900">{item.refereeName}</p>
                              <p className="text-[10px] text-zinc-400">{item.city || "All Cities"}</p>
                            </div>
                            <span className="text-xs font-black text-zinc-900">₹{item.rewardAmount}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-medium text-zinc-600">
                              <span>{item.completedOrders} of {item.targetOrders} orders completed</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${pct === 100 ? "bg-zinc-900" : "bg-zinc-400"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            {item.status === "unlocked" ? (
                              <button
                                type="button"
                                disabled={claimingReferral}
                                onClick={() => handleClaimReferral(item.id)}
                                className="rounded-lg bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-zinc-800"
                              >
                                Claim ₹{item.rewardAmount}
                              </button>
                            ) : item.status === "claimed_to_cycle" ? (
                              <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                                Added to Weekly Bank Cycle
                              </span>
                            ) : item.status === "settled" ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                Settled in Bank
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-zinc-400">
                                Milestone In Progress ({item.completedOrders}/{item.targetOrders})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* How it Works Guide */}
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3.5 space-y-2">
                <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">How Partner Referral Works</p>
                <div className="space-y-1.5 text-[11px] text-zinc-600">
                  <div className="flex items-start gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800">
                      1
                    </span>
                    <span>Share your store code with any laundromat or dry cleaner owner.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800">
                      2
                    </span>
                    <span>They register their store and complete verification on QuickPress.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800">
                      3
                    </span>
                    <span>
                      Once they complete {referralHub?.activeRule?.targetOrdersCount ?? 10} orders, ₹{referralHub?.activeRule?.referrerReward ?? 500} is credited directly to your weekly bank payout!
                    </span>
                  </div>
                </div>
              </div>
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
      {/* ========================================================================= */}
      {/* MODAL: KYC & BANK DETAILS EDIT REQUEST (REQUIRES ADMIN APPROVAL)          */}
      {/* ========================================================================= */}
      {/* MODAL: DOCUMENT PREVIEW LIGHTBOX (ZOOM + ROTATE + FRONT/BACK)             */}
      {/* ========================================================================= */}
      {showDocPreview && showDocPreview.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white border border-zinc-200 p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-zinc-950">{showDocPreview.title}</h3>
                {showDocPreview.subtitle && (
                  <p className="text-[11px] text-zinc-500">{showDocPreview.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowDocPreview(null)}
                className="rounded-full size-8 bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Side Switcher + Zoom / Rotate Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {showDocPreview.backImageUrl !== undefined && (
                <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
                  <button
                    type="button"
                    onClick={() =>
                      setShowDocPreview((prev) => (prev ? { ...prev, activeSide: "front" } : prev))
                    }
                    className={`px-3 py-1 rounded-lg text-xs cursor-pointer ${
                      showDocPreview.activeSide !== "back"
                        ? "bg-white text-zinc-950 font-bold shadow-2xs"
                        : "text-zinc-500 font-semibold"
                    }`}
                  >
                    Front
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setShowDocPreview((prev) => (prev ? { ...prev, activeSide: "back" } : prev))
                    }
                    className={`px-3 py-1 rounded-lg text-xs cursor-pointer ${
                      showDocPreview.activeSide === "back"
                        ? "bg-white text-zinc-950 font-bold shadow-2xs"
                        : "text-zinc-500 font-semibold"
                    }`}
                  >
                    Back
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
                  className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="font-mono text-[11px] font-bold text-zinc-600 min-w-[38px] text-center">
                  {Math.round(docZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
                  className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocRotation((r) => (r + 90) % 360)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  <RotateCw className="size-3" />
                  90°
                </button>
              </div>
            </div>

            {(() => {
              const displayedUrl =
                showDocPreview.activeSide === "back"
                  ? showDocPreview.backImageUrl || ""
                  : showDocPreview.imageUrl || "";
              return (
                <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col items-center justify-center min-h-60 overflow-hidden text-center">
                  {displayedUrl ? (
                    <img
                      src={displayedUrl}
                      alt={showDocPreview.title}
                      style={{ transform: `scale(${docZoom}) rotate(${docRotation}deg)` }}
                      className="max-h-72 w-auto rounded-xl object-contain transition-transform duration-200"
                    />
                  ) : (
                    <div
                      style={{ transform: `scale(${docZoom}) rotate(${docRotation}deg)` }}
                      className="space-y-3 p-4 transition-transform duration-200"
                    >
                      <div className="size-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 mx-auto flex items-center justify-center">
                        <ShieldCheck className="size-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {showDocPreview.activeSide === "back" ? "Back Side Scan Not Uploaded" : "Verified Digital Record on File"}
                        </p>
                        <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mt-1">
                          {showDocPreview.activeSide === "back"
                            ? "You can upload or replace this side from Upload & Edit."
                            : "Verified compliance record active on QuickPress Partner vault."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDocPreview(null);
                  setShowDocumentsModal(true);
                  setActiveKycTab("update");
                }}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 cursor-pointer"
              >
                Replace Document
              </button>
              <button
                type="button"
                onClick={() => setShowDocPreview(null)}
                className="rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </PartnerLayout>
  );
}
