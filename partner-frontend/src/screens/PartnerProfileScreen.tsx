import { Link, useNavigate } from "@tanstack/react-router";
import {
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
  FileCheck,
  FileSpreadsheet,
  FileText,
  Headphones,
  History,
  Hourglass,
  Info,
  Layers,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  MessageSquareQuote,
  Percent,
  Phone,
  PhoneCall,
  QrCode,
  Receipt,
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
import { usePartnerResource } from "../hooks/use-partner-resource";
import { partnerRoutes } from "../navigation/partner-routes";
import { fetchPartnerProfile, toggleStoreStatus, updatePartnerProfile } from "@/api/partner/partner-profile-api";
import { compressImage } from "../lib/image-compression";
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
  const partnerId = profile?.partnerId || (profile as any)?.id || "PRT-390624";
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
      await updatePartnerProfile({ logo: dataUrl });
      await reloadProfile();
      setLogoFailed(false);
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
      title="Store Management & Settings"
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

          {/* Primary Feature: Services & Catalog Management */}
          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-white to-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Services & Rate Card</h3>
                  <p className="text-[11px] font-medium text-zinc-500">
                    Manage service pricing, turn on/off items & offers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: partnerRoutes.services })}
                className="flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-xs active:scale-95 transition-all"
              >
                <span>Manage</span>
                <ChevronRight className="size-3.5" />
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
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://quickpress.in/store/${partnerId}`}
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
              <p className="text-xs font-bold text-muted-foreground">Partner Rating</p>
              <p className="text-2xl font-black text-foreground">★ {profile?.rating || "4.9"}</p>
            </div>
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground">Completed Orders</p>
              <p className="text-2xl font-black text-foreground">{profile?.totalOrders || 4}</p>
            </div>
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
              <p className="text-xs font-bold text-muted-foreground">Location</p>
              <p className="text-2xl font-black text-foreground">{city}</p>
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </PartnerLayout>
  );
}
