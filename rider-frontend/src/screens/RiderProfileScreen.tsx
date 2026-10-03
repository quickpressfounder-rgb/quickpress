import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bike,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  Edit2,
  FileCheck,
  FileText,
  Globe,
  Headphones,
  HelpCircle,
  History as HistoryIcon,
  Hourglass,
  LogOut,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  QrCode,
  RefreshCw,
  RotateCw,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  User,
  Wallet,
  X,
  Camera,
  Eye,
  Check,
  ChevronDown,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRiderContext } from "../context/RiderContext";
import {
  fetchRiderProfile,
  updateRiderProfile,
  fetchRiderBank,
  updateRiderBank,
  deleteRiderAccount,
  type RiderProfileDetail,
  type RiderBankAccount,
} from "../api/rider/rider-profile-api";
import { useLanguage } from "../lib/i18n";
import { triggerHaptic } from "../lib/captain-audio";
import { CaptainSupportModal } from "../components/support/CaptainSupportModal";
import { CaptainGuidelinesModal } from "../components/support/CaptainGuidelinesModal";
import { CaptainKycDocModal, type KycDocType } from "../components/kyc/CaptainKycDocModal";
import { CaptainTripDetailView } from "../components/history/CaptainTripDetailView";
import { CaptainGuidelinesScreen } from "./CaptainGuidelinesScreen";
import { CaptainHelpScreen } from "./CaptainHelpScreen";
import { fetchRiderHistory } from "../api/rider/rider-orders-api";
import type { RiderHistoryEntry } from "../shared/types/rider";
import { RiderBottomNav } from "../components/RiderBottomNav";
import { formatCaptainId } from "../lib/format-ids";

function normalizeDisplayPhone(p?: string): string {
  if (!p) return "";
  const cleaned = p.replace(/\+91/g, "").replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return p;
}

export function RiderProfileScreen() {
  const navigate = useNavigate();
  const { session, signOut } = useRiderContext();
  const { t, selectedLanguageObj } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile State (SSR-safe initial state, hydrated instantly on client mount)
  const initialName =
    session?.fullName && session.fullName !== "Delivery Captain" && session.fullName !== "Delivery Partner"
      ? session.fullName
      : "";
  const initialRiderId =
    session?.riderId && session.riderId !== "CAP-100101" && session.riderId !== "CP-9821"
      ? session.riderId
      : "";

  const [profile, setProfile] = useState<RiderProfileDetail | null>(null);
  const [fullName, setFullName] = useState(initialName);
  const [riderId, setRiderId] = useState(() => (initialRiderId ? formatCaptainId(initialRiderId) : ""));
  const [phone, setPhone] = useState(session?.phone || "");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Kasganj");
  const [rating, setRating] = useState(5.0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string>("");

  // Vehicle Details
  const [vehicleType, setVehicleType] = useState("Motorcycle / Two-Wheeler");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [dlNumber, setDlNumber] = useState("");
  const [rcNumber, setRcNumber] = useState("");

  // Bank & Settlement Details
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [accountHolder, setAccountHolder] = useState(initialName);
  const [upiId, setUpiId] = useState("");

  // Instant Client Cache Hydration on Mount (0ms)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("qp_rider_profile_cache");
      const c = raw ? JSON.parse(raw) : null;
      const govtName = localStorage.getItem("qp_rider_government_name") || "";
      const savedId = localStorage.getItem("qp_rider_id") || "";
      const savedPhone = localStorage.getItem("qp_rider_phone") || localStorage.getItem("qp.rider.pendingPhone") || "";
      const savedPhoto = localStorage.getItem("qp_rider_profile_photo") || "";

      if (c) {
        if (c.fullName) setFullName(c.fullName);
        else if (govtName) setFullName(govtName);
        if (c.riderId) setRiderId(formatCaptainId(c.riderId));
        else if (savedId) setRiderId(formatCaptainId(savedId));
        if (c.phone) setPhone(c.phone);
        else if (savedPhone) setPhone(savedPhone);
        if (c.email) setEmail(c.email);
        if (c.city) setCity(c.city);
        if (typeof c.rating === "number") setRating(c.rating);
        if (typeof c.totalTrips === "number") setTotalTrips(c.totalTrips);
        if (c.photoUrl || c.selfieUrl) setProfilePhoto(c.photoUrl || c.selfieUrl);
        else if (savedPhoto) setProfilePhoto(savedPhoto);
        if (c.vehicleType) setVehicleType(c.vehicleType);
        if (c.vehicleNumber) setVehicleNumber(c.vehicleNumber);
        if (c.dlNumber) setDlNumber(c.dlNumber);
        if (c.aadhaar || (c as any).aadhaarNumber) setAadhaarNumber(c.aadhaar || (c as any).aadhaarNumber);
        if (c.pan || (c as any).panNumber) setPanNumber(c.pan || (c as any).panNumber);
        if (c.dob) setDob(c.dob);
        if (c.bankName) setBankName(c.bankName);
        if (c.accountNumber) setAccountNumber(c.accountNumber);
        if (c.ifsc) setIfsc(c.ifsc);
        if (c.accountHolder) setAccountHolder(c.accountHolder);
        if (c.upiId) setUpiId(c.upiId);
      } else {
        if (govtName) setFullName(govtName);
        if (savedId) setRiderId(formatCaptainId(savedId));
        if (savedPhone) setPhone(savedPhone);
        if (savedPhoto) setProfilePhoto(savedPhoto);
      }
    } catch {}
  }, []);

  // Full-page Screen Views ("profile" | "guidelines" | "support")
  const [selectedView, setSelectedView] = useState<"profile" | "guidelines" | "support">("profile");

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [selectedKycDoc, setSelectedKycDoc] = useState<KycDocType | null>(null);
  const [isKycExpanded, setIsKycExpanded] = useState(false);
  const [isBankExpanded, setIsBankExpanded] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [dob, setDob] = useState("");

  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDob, setDeleteDob] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Trip History States
  const [isTripsExpanded, setIsTripsExpanded] = useState(false);
  const [trips, setTrips] = useState<RiderHistoryEntry[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [selectedTripDetail, setSelectedTripDetail] = useState<RiderHistoryEntry | null>(null);

  const loadTrips = async () => {
    setLoadingTrips(true);
    try {
      const data = await fetchRiderHistory();
      setTrips(data || []);
      setTripsLoaded(true);
    } catch {
      toast.error("Could not load trip history");
    } finally {
      setLoadingTrips(false);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "Recent Trip";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ultra-Fast Parallel Fetching (Promise.allSettled)
  const loadProfileData = async () => {
    setLoading(true);
    try {
      const [profileRes, bankRes, historyRes] = await Promise.allSettled([
        fetchRiderProfile(),
        fetchRiderBank(),
        fetchRiderHistory(),
      ]);

      let merged: Partial<RiderProfileDetail> = {};

      if (profileRes.status === "fulfilled" && profileRes.value) {
        const data = profileRes.value;
        setProfile(data);
        merged = { ...merged, ...data };

        const resolvedName =
          data.fullName ||
          (data as any).name ||
          (data as any).verifiedGovernmentName ||
          initialName ||
          data.accountHolder ||
          "";

        if (resolvedName && resolvedName !== "Delivery Captain" && resolvedName !== "Delivery Partner") {
          setFullName(resolvedName);
          merged.fullName = resolvedName;
        }

        const resolvedId = data.riderId || data.id || "";
        if (resolvedId && resolvedId !== "CAP-100101") {
          const formatted = formatCaptainId(resolvedId);
          setRiderId(formatted);
          merged.riderId = formatted;
        }

        if (data.phone) {
          setPhone(data.phone);
          merged.phone = data.phone;
        }
        if (data.email && data.email !== "—") setEmail(data.email);
        if (data.city && data.city !== "—") setCity(data.city);
        if (data.rating !== undefined) setRating(Number(data.rating) || 5.0);
        if (data.totalTrips !== undefined) setTotalTrips(Number(data.totalTrips) || 0);
        if (data.vehicleType) setVehicleType(data.vehicleType);
        if (data.vehicleNumber && data.vehicleNumber !== "—") setVehicleNumber(data.vehicleNumber);
        if (data.dlNumber) setDlNumber(data.dlNumber);
        if (data.rcNumber) setRcNumber(data.rcNumber);
        if (data.aadhaar) setAadhaarNumber(data.aadhaar);
        if (data.pan) setPanNumber(data.pan);
        if (data.dob) setDob(data.dob);

        const realPhoto = data.photoUrl || data.selfieUrl || "";
        if (realPhoto) {
          setProfilePhoto(realPhoto);
          merged.photoUrl = realPhoto;
          try {
            localStorage.setItem("qp_rider_profile_photo", realPhoto);
          } catch {}
        }
      }

      if (bankRes.status === "fulfilled" && bankRes.value) {
        const bank = bankRes.value;
        if (bank.bankName) setBankName(bank.bankName);
        if (bank.accountNumber) setAccountNumber(bank.accountNumber);
        if (bank.ifsc) setIfsc(bank.ifsc);
        if (bank.accountHolder) setAccountHolder(bank.accountHolder);
        merged = { ...merged, ...bank };
      }

      if (historyRes.status === "fulfilled" && historyRes.value) {
        setTrips(historyRes.value || []);
        setTripsLoaded(true);
      }

      try {
        localStorage.setItem("qp_rider_profile_cache", JSON.stringify(merged));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfileData();
  }, []);

  // Handle Photo Upload / Update
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setProfilePhoto(base64);
      try {
        localStorage.setItem("qp_rider_profile_photo", base64);
      } catch {}
      triggerHaptic();
      toast.success(t("profile.photoUpdated") || "Profile selfie updated successfully! 📸");
      try {
        await updateRiderProfile({ photoUrl: base64, selfieUrl: base64 });
      } catch (err) {
        console.warn("Could not save photo to backend:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Copy Rider ID
  const handleCopyId = () => {
    const cleanId = formatCaptainId(riderId);
    navigator.clipboard.writeText(cleanId);
    triggerHaptic();
    toast.success(`Captain ID ${cleanId} copied! 📋`);
  };



  // Save Profile & Bank changes to backend
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    triggerHaptic();
    try {
      const profRes = await updateRiderProfile({
        fullName,
        email,
        city,
        vehicleType,
        vehicleNumber,
      });

      const bankRes = await updateRiderBank({
        bankName,
        accountNumber,
        ifsc,
        accountHolder,
        upiId,
      });

      setShowEditModal(false);
      if (profRes?.requiresApproval || bankRes?.requiresApproval) {
        toast.info(
          profRes?.message ||
            bankRes?.message ||
            "Government-verified details require Admin Approval. Change request submitted! ⏳"
        );
      } else {
        toast.success("Profile details updated successfully! ✅");
      }
      await loadProfileData();
    } catch {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Logout
  const handleConfirmLogout = () => {
    triggerHaptic();
    signOut();
    toast.success("Logged out successfully. See you soon, Captain! 🛵");
    navigate({ to: "/auth" });
  };

  // Handle Delete Rider Account with DOB verification
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteDob) {
      setDeleteError("Kripya apni Date of Birth (DOB) darj karein.");
      return;
    }

    const registeredDob = profile?.dob || dob || "";
    const normalize = (d: string) => {
      const clean = d.replace(/\//g, "-").trim();
      const p = clean.split("-");
      if (p.length === 3) {
        if (p[0].length === 2 && p[2].length === 4) return `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
        if (p[0].length === 4 && p[1].length <= 2) return `${p[0]}-${p[1].padStart(2, "0")}-${p[2].padStart(2, "0")}`;
      }
      return clean;
    };

    if (registeredDob && normalize(deleteDob) !== normalize(registeredDob)) {
      triggerHaptic(50);
      setDeleteError("Galat Date of Birth! Kripya apni registered Date of Birth darj karein.");
      return;
    }

    setDeleting(true);
    setDeleteError("");
    try {
      const res = await deleteRiderAccount(deleteDob);
      if (res?.ok) {
        toast.success("Rider account permanently deleted.");
        setShowDeleteModal(false);
        signOut();
        navigate({ to: "/auth" });
      } else {
        setDeleteError(res?.message || "Failed to delete account. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.message || err?.detail || "Failed to delete account. Please verify your DOB.";
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const displayPhoto =
    profilePhoto ||
    profile?.photoUrl ||
    profile?.selfieUrl ||
    (typeof window !== "undefined" ? localStorage.getItem("qp_rider_profile_photo") : null) ||
    "/captain_profile_real.jpg";

  // Full-page Guidelines & Privacy Policy View (not a popup)
  if (selectedView === "guidelines") {
    return (
      <div className="relative flex flex-col w-full min-h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] shadow-xl overflow-x-hidden text-zinc-800 select-none font-sans">
        <CaptainGuidelinesScreen
          onBack={() => {
            triggerHaptic(20);
            setSelectedView("profile");
          }}
          onOpenSupport={() => {
            triggerHaptic(20);
            setSelectedView("support");
          }}
        />
        <RiderBottomNav active="profile" />
      </div>
    );
  }

  // Full-page 24/7 Helpline & Support View (not a popup)
  if (selectedView === "support") {
    return (
      <div className="relative flex flex-col w-full min-h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] shadow-xl overflow-x-hidden text-zinc-800 select-none font-sans">
        <CaptainHelpScreen
          onBack={() => {
            triggerHaptic(20);
            setSelectedView("profile");
          }}
          onOpenGuidelines={() => {
            triggerHaptic(20);
            setSelectedView("guidelines");
          }}
        />
        <RiderBottomNav active="profile" />
      </div>
    );
  }

  // Full-page Trip Detail View (not a popup)
  if (selectedTripDetail) {
    return (
      <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] shadow-xl overflow-hidden text-zinc-800 select-none font-sans">
        {/* Sticky Header with Back Button */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200/80 shadow-2xs shrink-0"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                setSelectedTripDetail(null);
              }}
              className="p-2 -ml-1 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
              aria-label="Back to Profile"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-base font-black text-zinc-900 tracking-tight leading-tight">
                Trip Details & Receipt
              </h1>
              <p className="text-[11px] font-semibold text-zinc-500">
                Order #{selectedTripDetail.code || (selectedTripDetail.id ? String(selectedTripDetail.id).slice(-6).toUpperCase() : "ORD")}
              </p>
            </div>
          </div>
        </header>

        {/* Full Page Detail View (Not in a popup) */}
        <CaptainTripDetailView
          trip={selectedTripDetail}
          onBack={() => {
            triggerHaptic(20);
            setSelectedTripDetail(null);
          }}
        />

        {/* Floating Bottom Navigation */}
        <RiderBottomNav active="profile" />
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col w-full min-h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] text-zinc-900 select-none font-sans"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
      suppressHydrationWarning
    >
      {/* 1. Sticky Top Header (Partner Design Pattern) */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white px-4 border-b border-zinc-200/70 shadow-2xs"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="text-zinc-800 p-1 active:scale-95 transition-transform"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight text-zinc-900 leading-tight">
              {t("nav.profile") || "Captain Profile & Settings"}
            </h1>
            <p className="text-[10px] font-semibold text-zinc-400" suppressHydrationWarning>
              {fullName ? fullName : (phone ? normalizeDisplayPhone(phone) : "")}
              {riderId ? ` · ID: ${riderId}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowIdCardModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 active:scale-95 transition-all"
            title="Digital Captain ID"
          >
            <QrCode className="size-3.5 text-amber-700" />
            <span>ID Card</span>
          </button>
        </div>
      </header>

      {/* 2. Scrollable Content Body */}
      <div className="space-y-3.5 p-4">
        {/* HERO CARD: Rich Captain Profile Identity (Exact Partner Style) */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Real Registration Photo Avatar with Camera Button */}
              <div className="relative shrink-0">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-950 font-black text-2xl shadow-xs overflow-hidden border-2 border-emerald-500/30">
                  <img
                    src={displayPhoto}
                    alt={fullName || "Captain"}
                    className="size-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/captain_profile_real.jpg";
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all border border-white"
                  title="Update Registration Photo"
                  aria-label="Upload Photo"
                >
                  <Camera className="size-3.5 stroke-[2.2]" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              {/* Captain Basic Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {fullName ? (
                    <h2 className="truncate text-base font-black text-zinc-900" suppressHydrationWarning>{fullName}</h2>
                  ) : loading ? (
                    <span className="inline-block h-5 w-28 bg-zinc-200 animate-pulse rounded-md" />
                  ) : (
                    <h2 className="truncate text-base font-black text-zinc-900" suppressHydrationWarning>
                      {phone ? normalizeDisplayPhone(phone) : ""}
                    </h2>
                  )}
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <BadgeCheck className="size-3 text-emerald-600 fill-current shrink-0" />
                    <span>Verified</span>
                  </span>
                </div>
                <p className="text-xs font-semibold text-zinc-500" suppressHydrationWarning>
                  {phone ? normalizeDisplayPhone(phone) : (loading ? "Loading..." : "Verified Partner")}
                </p>
                <div className="mt-1 flex items-center gap-2" suppressHydrationWarning>
                  <span className="flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700" suppressHydrationWarning>
                    {riderId ? (
                      <>
                        ID: {formatCaptainId(riderId)}
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="text-zinc-400 hover:text-zinc-700 active:scale-95 cursor-pointer"
                          title="Copy Captain ID"
                        >
                          <Copy className="size-2.5" />
                        </button>
                      </>
                    ) : (
                      <span>Active Captain</span>
                    )}
                  </span>
                  <span className="flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                    <Star className="size-2.5 fill-current text-amber-500" />
                    {rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="rounded-full bg-zinc-100 p-2 text-zinc-700 hover:bg-zinc-200 active:scale-95 transition-all shrink-0"
              title="Edit Profile Details"
            >
              <Edit2 className="size-4" />
            </button>
          </div>

          {/* Quick 3-Pillar Stats (Total Deliveries · City Hub · KYC Status) */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-center">
            <div className="rounded-2xl bg-zinc-50 p-2.5">
              <p className="text-[10px] font-bold text-zinc-400">Total Trips</p>
              <p className="text-sm font-black text-zinc-900">{totalTrips}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-2.5">
              <p className="text-[10px] font-bold text-zinc-400">City Hub</p>
              <p className="text-sm font-black text-zinc-900 truncate">{city}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-2.5">
              <p className="text-[10px] font-bold text-zinc-400">Kyc Status</p>
              <p className="text-xs font-black text-emerald-600">Verified ✓</p>
            </div>
          </div>
        </div>

        {/* Pending Change Request Alert (Requires Admin Approval) */}
        {(profile?.pendingChangeRequest || profile?.pendingBankChangeRequest) && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
            <Hourglass className="size-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <p className="font-black text-amber-950">Change Request Pending Admin Review ⏳</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Your request to change government-verified KYC or Bank details is currently waiting for Admin approval. Existing active details remain valid until approved.
              </p>
            </div>
          </div>
        )}



        {/* SECTION: VEHICLE & KYC DOCUMENTS */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm space-y-3">
          <div
            onClick={() => {
              triggerHaptic(30);
              setIsKycExpanded((prev) => !prev);
            }}
            className="flex items-center justify-between cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-800 shrink-0">
                <Bike className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-zinc-900 truncate">
                  Vehicle & Kyc Documents
                </h3>
              </div>
            </div>

            {/* Interactive Checkbox / Accordion Toggle */}
            <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-zinc-50 group-hover:bg-zinc-100 border border-zinc-200/90 transition-all shrink-0">
              <div
                className={`size-4 rounded-md border flex items-center justify-center transition-all ${
                  isKycExpanded
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                    : "border-zinc-400 bg-white"
                }`}
              >
                {isKycExpanded && <Check className="size-3 stroke-[3]" />}
              </div>
              <span className="text-[10px] font-black text-zinc-700">
                {isKycExpanded ? "Close" : "Open"}
              </span>
              <ChevronDown
                className={`size-3.5 text-zinc-500 transition-transform duration-200 ${
                  isKycExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {isKycExpanded && (
            <div className="space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200 pt-2 border-t border-zinc-100">
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-500 font-semibold">Vehicle Type</span>
                <span className="font-black text-zinc-900">{vehicleType}</span>
              </div>

            <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-zinc-500 font-semibold">Number Plate</span>
              <span className="font-mono font-black text-zinc-900">
                {vehicleNumber || "UP 87 AB 4021"}
              </span>
            </div>

            <div
              onClick={() => {
                triggerHaptic();
                setSelectedKycDoc("dl");
              }}
              className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-100 cursor-pointer active:scale-98 transition-all"
              title="View Driving License"
            >
              <span className="text-zinc-500 font-semibold">Driving License (DL)</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-zinc-900">
                  {dlNumber ? `${dlNumber.slice(0, 6)}••••` : "Verified on File ✓"}
                </span>
                <Eye className="size-3.5 text-zinc-400" />
              </div>
            </div>

            <div
              onClick={() => {
                triggerHaptic();
                setSelectedKycDoc("rc");
              }}
              className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-100 cursor-pointer active:scale-98 transition-all"
              title="View RC Certificate"
            >
              <span className="text-zinc-500 font-semibold">RC Certificate</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-zinc-900">
                  {rcNumber ? `${rcNumber.slice(0, 6)}••••` : "Verified Active ✓"}
                </span>
                <Eye className="size-3.5 text-zinc-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setSelectedKycDoc("aadhaar");
                }}
                className="p-2.5 bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-300 rounded-xl text-center active:scale-95 transition-all cursor-pointer shadow-2xs group"
                title="Tap to View Aadhaar Card"
              >
                <div className="flex items-center justify-center gap-1">
                  <p className="text-[10px] font-bold text-emerald-700">Aadhaar Card</p>
                  <Eye className="size-3 text-emerald-600 group-hover:scale-115 transition-transform" />
                </div>
                <p className="text-xs font-black text-emerald-800">Linked ✓</p>
                <span className="text-[9px] font-semibold text-emerald-600/90 block mt-0.5">
                  Tap to View 🪪
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setSelectedKycDoc("pan");
                }}
                className="p-2.5 bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-300 rounded-xl text-center active:scale-95 transition-all cursor-pointer shadow-2xs group"
                title="Tap to View PAN Card"
              >
                <div className="flex items-center justify-center gap-1">
                  <p className="text-[10px] font-bold text-emerald-700">PAN Card</p>
                  <Eye className="size-3 text-emerald-600 group-hover:scale-115 transition-transform" />
                </div>
                <p className="text-xs font-black text-emerald-800">Verified ✓</p>
                <span className="text-[9px] font-semibold text-emerald-600/90 block mt-0.5">
                  Tap to View 🪪
                </span>
              </button>
            </div>
          </div>
          )}
        </div>

        {/* SECTION: BANK & UPI SETTLEMENT DETAILS */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm space-y-3">
          <div
            onClick={() => {
              triggerHaptic(30);
              setIsBankExpanded((prev) => !prev);
            }}
            className="flex items-center justify-between cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 items-center justify-center rounded-xl bg-amber-100/80 text-amber-800 shrink-0">
                <Wallet className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-zinc-900 truncate">
                  Settlement & Bank Details
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditModal(true);
                }}
                className="text-xs font-bold text-emerald-600 hover:underline active:scale-95 px-1 py-0.5"
                title="Update bank details"
              >
                Update
              </button>

              {/* Interactive Checkbox / Accordion Toggle */}
              <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-zinc-50 group-hover:bg-zinc-100 border border-zinc-200/90 transition-all">
                <div
                  className={`size-4 rounded-md border flex items-center justify-center transition-all ${
                    isBankExpanded
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                      : "border-zinc-400 bg-white"
                  }`}
                >
                  {isBankExpanded && <Check className="size-3 stroke-[3]" />}
                </div>
                <span className="text-[10px] font-black text-zinc-700">
                  {isBankExpanded ? "Close" : "Open"}
                </span>
                <ChevronDown
                  className={`size-3.5 text-zinc-500 transition-transform duration-200 ${
                    isBankExpanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </div>

          {isBankExpanded && (
            <div className="space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200 pt-2 border-t border-zinc-100">
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-500 font-semibold">Account Holder</span>
                <span className="font-black text-zinc-900">{accountHolder || fullName}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-500 font-semibold">Bank Name</span>
                <span className="font-black text-zinc-900">{bankName || "Linked Bank Account"}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-500 font-semibold">Account Number</span>
                <span className="font-mono font-black text-zinc-900">
                  {accountNumber ? `•••• •••• ${accountNumber.slice(-4)}` : "Direct Bank Linked"}
                </span>
              </div>

              {ifsc && (
                <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-zinc-500 font-semibold">IFSC Code</span>
                  <span className="font-mono font-black text-zinc-900">{ifsc}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION: TRIP HISTORY (DIRECTLY BELOW SETTLEMENT & BANK) */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm space-y-3">
          <div
            onClick={() => {
              triggerHaptic(30);
              setIsTripsExpanded((prev) => !prev);
              if (!tripsLoaded) loadTrips();
            }}
            className="flex items-center justify-between cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 items-center justify-center rounded-xl bg-blue-100/80 text-blue-800 shrink-0">
                <HistoryIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black text-zinc-900 truncate">
                  Trip History
                </h3>
              </div>
            </div>

            {/* Interactive Checkbox / Accordion Toggle */}
            <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-zinc-50 group-hover:bg-zinc-100 border border-zinc-200/90 transition-all shrink-0">
              <div
                className={`size-4 rounded-md border flex items-center justify-center transition-all ${
                  isTripsExpanded
                    ? "bg-blue-600 border-blue-600 text-white shadow-2xs"
                    : "border-zinc-400 bg-white"
                }`}
              >
                {isTripsExpanded && <Check className="size-3 stroke-[3]" />}
              </div>
              <span className="text-[10px] font-black text-zinc-700">
                {isTripsExpanded ? "Close" : "Open"}
              </span>
              <ChevronDown
                className={`size-3.5 text-zinc-500 transition-transform duration-200 ${
                  isTripsExpanded ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {isTripsExpanded && (
            <div className="space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200 pt-2 border-t border-zinc-100">
              {loadingTrips ? (
                <div className="flex items-center justify-center py-6 text-zinc-400 gap-2">
                  <RotateCw className="size-4 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Loading Trips...</span>
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-6 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                  <p className="text-xs font-bold text-zinc-700">No Trips Found</p>
                  <p className="text-[10px] text-zinc-400">Completed deliveries will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
                  {trips.map((trip) => (
                    <div
                      key={trip.id}
                      onClick={() => {
                        triggerHaptic(30);
                        setSelectedTripDetail(trip);
                      }}
                      className="p-3 bg-zinc-50 hover:bg-zinc-100 rounded-2xl border border-zinc-200/80 cursor-pointer active:scale-98 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-700 font-black text-xs shadow-2xs">
                          <Bike className="size-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-zinc-900 truncate">
                              #{trip.code || (trip.id ? String(trip.id).slice(-6).toUpperCase() : "ORD")}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                trip.outcome === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {trip.outcome === "completed" ? "Completed ✓" : "Cancelled"}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-semibold truncate mt-0.5">
                            {trip.customerName || "Customer Delivery"} · {trip.distanceKm || 2.4} km
                          </p>
                          <p className="text-[9px] text-zinc-400 font-medium">
                            {formatDate(trip.date)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-emerald-600 block">
                          +₹{Number(trip.amount || 30).toFixed(0)}
                        </span>
                        <span className="text-[9px] font-bold text-blue-600 group-hover:underline flex items-center justify-end gap-0.5 mt-0.5">
                          <span>Full Detail</span>
                          <ChevronRight className="size-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION: KNOWLEDGE & SUPPORT ACTION CARDS */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-2 shadow-sm space-y-1">
          {/* Captain Guidelines & SOP */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              setSelectedView("guidelines");
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 active:scale-98 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <FileText className="size-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-zinc-900">Captain Onboarding & Guidelines</p>
                <p className="text-[10px] font-medium text-zinc-500">Privacy Policy, Zero Commission & SOP</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-zinc-400" />
          </button>

          {/* 24/7 Helpline & SOS Support */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              setSelectedView("support");
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 active:scale-98 transition-all border-t border-zinc-100 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <Headphones className="size-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-zinc-900">24/7 Captain Helpline & Support</p>
                <p className="text-[10px] font-semibold text-emerald-600">Live Chat, Support Tickets & Email</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-zinc-400" />
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 active:scale-98 transition-all border-t border-zinc-100"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Globe className="size-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-zinc-900">App Language</p>
                <p className="text-[10px] font-medium text-zinc-500">
                  Currently: {selectedLanguageObj?.nativeName || "English"} ({selectedLanguageObj?.name || "English"})
                </p>
              </div>
            </div>
            <ChevronRight className="size-4 text-zinc-400" />
          </button>
        </div>

        {/* LOGOUT & DELETE ACCOUNT BUTTONS */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-2xl active:scale-98 transition-all"
          >
            <LogOut className="size-4 text-zinc-600" />
            <span>Log Out of QuickPress Captain</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setDeleteDob("");
              setDeleteError("");
              setShowDeleteModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-2xl border border-rose-200 active:scale-98 transition-all"
          >
            <Trash2 className="size-4" />
            <span>Delete Rider Account</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: EDIT PROFILE & SETTLEMENT DETAILS */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-base font-black text-zinc-950">Update Profile & Settlement</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="size-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* KYC Lock Notice */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-950">
              <ShieldCheck className="size-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-blue-950">Government-Verified Account 🔒</p>
                <p className="text-[11px] text-blue-800 leading-tight mt-0.5">
                  Name, Vehicle Plate & Bank Details are linked to verified KYC records. Any changes will be submitted for QuickPress Admin Approval.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Captain Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-black text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Service City Hub</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Vehicle Plate Number</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono font-black text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="border-t border-zinc-200 pt-3">
                <h4 className="font-black text-zinc-800 text-[11px] mb-2">
                  Payout Bank Details
                </h4>

                <div className="space-y-2.5">
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Bank IFSC Code</label>
                    <input
                      type="text"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-[#00C853] hover:bg-[#00B248] text-white font-black rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <Save className="size-4" />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: OFFICIAL DIGITAL ID CARD MODAL */}
      {showIdCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* ID Card Top Header */}
            <div className="bg-zinc-950 p-4 text-white flex items-center justify-between border-b border-amber-400">
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-base text-amber-400">QuickPress</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 bg-amber-400 text-zinc-950 rounded">
                  Captain ID
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowIdCardModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* ID Card Body */}
            <div className="p-5 text-center space-y-3 bg-gradient-to-b from-amber-50/40 to-white">
              <div className="size-20 rounded-2xl overflow-hidden bg-amber-400 border-4 border-white shadow-lg mx-auto flex items-center justify-center text-zinc-950 font-black text-3xl">
                {displayPhoto ? (
                  <img src={displayPhoto} alt={fullName} className="size-full object-cover" />
                ) : (
                  fullName.slice(0, 2).toUpperCase()
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-zinc-950">{fullName}</h3>
                <p className="text-xs font-mono font-bold text-zinc-600">ID: {formatCaptainId(riderId)}</p>
                <p className="text-[11px] font-bold text-emerald-700 bg-emerald-100 inline-block px-2.5 py-0.5 rounded-full mt-1">
                  ✓ Verified QuickPress Captain
                </p>
              </div>

              <div className="p-3 bg-white border border-zinc-200 rounded-xl text-left space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Vehicle:</span>
                  <span className="font-mono font-black text-zinc-900">
                    {vehicleNumber || "UP 87 AB 4021"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">City Hub:</span>
                  <span className="font-black text-zinc-900">{city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status:</span>
                  <span className="font-bold text-emerald-600">Active Duty Captain ✓</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-dashed border-zinc-300 flex items-center justify-center gap-3">
                <QrCode className="size-12 text-zinc-900" />
                <div className="text-left text-[10px] text-zinc-500">
                  <p className="font-black text-zinc-900">Authorized Courier Badge</p>
                  <p>Scan to verify captain identity with QuickPress Logistics.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  toast.success("Captain ID Card downloaded! 🪪");
                  setShowIdCardModal(false);
                }}
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <Download className="size-4" />
                <span>Download Digital Badge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LOGOUT CONFIRMATION */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 text-center">
            <div className="size-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="size-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-zinc-950">Log Out Captain Account?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                You will stop receiving live delivery dispatches until you sign back in.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 bg-zinc-100 font-bold text-xs rounded-xl text-zinc-700 hover:bg-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md active:scale-98 transition-all"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CAPTAIN GUIDELINES & SOP */}
      <CaptainGuidelinesModal
        isOpen={showGuidelinesModal}
        onClose={() => setShowGuidelinesModal(false)}
      />

      {/* MODAL 5: 24/7 HELPLINE & SOS SUPPORT */}
      <CaptainSupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      {/* MODAL 6: KYC DOCUMENT VIEWER (AADHAAR, PAN, DL, RC) */}
      <CaptainKycDocModal
        isOpen={Boolean(selectedKycDoc)}
        initialDoc={selectedKycDoc || "aadhaar"}
        onClose={() => setSelectedKycDoc(null)}
        profile={profile}
        fullName={fullName}
        displayPhoto={displayPhoto}
        phone={phone}
        city={city}
        vehicleNumber={vehicleNumber}
        dlNumber={dlNumber}
        rcNumber={rcNumber}
        aadhaarNumber={aadhaarNumber}
        panNumber={panNumber}
      />

      {/* MODAL 7: DELETE RIDER ACCOUNT (DOB VERIFIED) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950">Delete Rider Account</h3>
                  <p className="text-[10px] font-semibold text-rose-600">Permanent & Irreversible</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError("");
                  setDeleteDob("");
                }}
                className="size-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Warning Box */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-950">
              <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-black text-rose-950">Warning: Permanent Deletion</p>
                <p className="text-[11px] text-rose-800 leading-tight">
                  Your Captain ID, delivery records, KYC documents, and earnings history will be permanently deleted. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* DOB Verification Form */}
            <form onSubmit={handleDeleteAccount} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-zinc-800 block mb-1.5">
                  Enter Your Date of Birth (DOB)
                </label>
                <input
                  type="date"
                  required
                  value={deleteDob}
                  onChange={(e) => {
                    setDeleteDob(e.target.value);
                    setDeleteError("");
                  }}
                  className="w-full p-3 bg-zinc-50 border border-zinc-300 rounded-xl font-medium text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-rose-500 shadow-2xs"
                  placeholder="DD/MM/YYYY"
                />
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Suraksha ke liye, wahi Date of Birth darj karein jo aapke KYC / Registration me darj hai.
                </p>
              </div>

              {deleteError && (
                <div className="p-2.5 bg-rose-100/80 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold animate-in fade-in">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteError("");
                    setDeleteDob("");
                  }}
                  disabled={deleting}
                  className="flex-1 py-3 bg-zinc-100 font-bold text-xs rounded-xl text-zinc-700 hover:bg-zinc-200 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!deleteDob || deleting}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      <span>Delete Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation */}
      <RiderBottomNav active="profile" />
    </div>
  );
}
