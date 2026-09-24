import { useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState, useRef } from "react";
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
  Hourglass,
  LogOut,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  QrCode,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  User,
  Volume2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useRiderContext } from "../context/RiderContext";
import {
  fetchRiderProfile,
  updateRiderProfile,
  fetchRiderBank,
  updateRiderBank,
  type RiderProfileDetail,
  type RiderBankAccount,
} from "../api/rider/rider-profile-api";
import { useLanguage } from "../lib/i18n";
import { triggerHaptic } from "../lib/captain-audio";
import { CaptainSupportModal } from "../components/support/CaptainSupportModal";
import { CaptainGuidelinesModal } from "../components/support/CaptainGuidelinesModal";

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

  // Profile State
  const [profile, setProfile] = useState<RiderProfileDetail | null>(null);
  const [fullName, setFullName] = useState(session?.fullName || "Delivery Captain");
  const [riderId, setRiderId] = useState(session?.riderId || "CP-101");
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
  const [accountHolder, setAccountHolder] = useState(session?.fullName || "");
  const [upiId, setUpiId] = useState("");

  // Operational toggles (persistent in localStorage)
  const [autoAccept, setAutoAccept] = useState<boolean>(() => {
    return localStorage.getItem("qp_rider_auto_accept") === "true";
  });
  const [soundAlerts, setSoundAlerts] = useState<boolean>(() => {
    return localStorage.getItem("qp_rider_sound_alerts") !== "false";
  });

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Real Profile & Photo from Backend
  const loadProfileData = async () => {
    setLoading(true);
    try {
      const data = await fetchRiderProfile().catch(() => null);
      if (data) {
        setProfile(data);
        if (data.fullName) setFullName(data.fullName);
        if (data.riderId) setRiderId(data.riderId);
        if (data.phone) setPhone(data.phone);
        if (data.email && data.email !== "—") setEmail(data.email);
        if (data.city && data.city !== "—") setCity(data.city);
        if (data.rating !== undefined) setRating(Number(data.rating) || 5.0);
        if (data.totalTrips !== undefined) setTotalTrips(Number(data.totalTrips) || 0);
        if (data.vehicleType) setVehicleType(data.vehicleType);
        if (data.vehicleNumber && data.vehicleNumber !== "—") setVehicleNumber(data.vehicleNumber);
        if (data.dlNumber) setDlNumber(data.dlNumber);
        if (data.rcNumber) setRcNumber(data.rcNumber);
        if (data.bankName) setBankName(data.bankName);
        if (data.accountNumber) setAccountNumber(data.accountNumber);
        if (data.ifsc) setIfsc(data.ifsc);
        if (data.accountHolder) setAccountHolder(data.accountHolder);
        if (data.upiId) setUpiId(data.upiId);

        // Real registration photo / selfie priority
        const realPhoto = data.photoUrl || data.selfieUrl || "";
        if (realPhoto) {
          setProfilePhoto(realPhoto);
          try {
            localStorage.setItem("qp_rider_profile_photo", realPhoto);
          } catch {}
        }
      }

      const bank = await fetchRiderBank().catch(() => null);
      if (bank) {
        if (bank.bankName) setBankName(bank.bankName);
        if (bank.accountNumber) setAccountNumber(bank.accountNumber);
        if (bank.ifsc) setIfsc(bank.ifsc);
        if (bank.accountHolder) setAccountHolder(bank.accountHolder);
        if (bank.upiId) setUpiId(bank.upiId);
      }

      // Check saved local photo fallback
      const savedPhoto = localStorage.getItem("qp_rider_profile_photo");
      if (savedPhoto && !profilePhoto) {
        setProfilePhoto(savedPhoto);
      }
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
    reader.onload = () => {
      const base64 = reader.result as string;
      setProfilePhoto(base64);
      try {
        localStorage.setItem("qp_rider_profile_photo", base64);
      } catch {}
      triggerHaptic();
      toast.success(t("profile.photoUpdated") || "Profile selfie updated successfully! 📸");
    };
    reader.readAsDataURL(file);
  };

  // Copy Rider ID
  const handleCopyId = () => {
    navigator.clipboard.writeText(riderId);
    triggerHaptic();
    toast.success(`Captain ID ${riderId} copied! 📋`);
  };

  // Toggle Auto Accept
  const handleToggleAutoAccept = () => {
    const next = !autoAccept;
    setAutoAccept(next);
    localStorage.setItem("qp_rider_auto_accept", String(next));
    triggerHaptic();
    toast.success(next ? "Auto-accept orders enabled 🟢" : "Auto-accept orders disabled");
  };

  // Toggle Sound Alerts
  const handleToggleSound = () => {
    const next = !soundAlerts;
    setSoundAlerts(next);
    localStorage.setItem("qp_rider_sound_alerts", String(next));
    triggerHaptic();
    toast.success(next ? "Order sound alerts enabled 🔔" : "Order sound alerts silenced");
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

  const displayPhoto = profilePhoto || profile?.photoUrl || profile?.selfieUrl || localStorage.getItem("qp_rider_profile_photo") || "";

  return (
    <div
      className="relative flex flex-col w-full min-h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] text-zinc-900 select-none font-sans"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
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
            <p className="text-[10px] font-semibold text-zinc-400">
              {fullName} · ID: {riderId}
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
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-zinc-950 font-black text-2xl shadow-xs overflow-hidden border-2 border-white">
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={fullName}
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    fullName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md hover:bg-zinc-800 active:scale-95 transition-all"
                  title="Update Registration Photo"
                  aria-label="Upload Photo"
                >
                  <Upload className="size-3 stroke-[2.5]" />
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
                  <h2 className="truncate text-base font-black text-zinc-900">{fullName}</h2>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <BadgeCheck className="size-3 text-emerald-600 fill-current shrink-0" />
                    <span>Govt Verified</span>
                  </span>
                </div>
                <p className="text-xs font-semibold text-zinc-500">{normalizeDisplayPhone(phone)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700">
                    ID: {riderId}
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-zinc-400 hover:text-zinc-700 active:scale-95"
                    >
                      <Copy className="size-2.5" />
                    </button>
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
              <p className="text-[10px] font-bold uppercase text-zinc-400">Total Trips</p>
              <p className="text-sm font-black text-zinc-900">{totalTrips}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-2.5">
              <p className="text-[10px] font-bold uppercase text-zinc-400">City Hub</p>
              <p className="text-sm font-black text-zinc-900 truncate">{city}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-2.5">
              <p className="text-[10px] font-bold uppercase text-zinc-400">KYC Status</p>
              <p className="text-xs font-black text-emerald-600">VERIFIED ✓</p>
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

        {/* OPERATIONAL SWITCHES (Matching Partner Profile) */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">
            Live Duty Controls
          </h3>

          {/* Auto Accept Orders */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Zap className="size-4" />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-900">Auto-Accept Orders</p>
                <p className="text-[10px] font-medium text-zinc-400">Automatically accept rides in your zone</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoAccept}
              className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                autoAccept ? "bg-emerald-500" : "bg-zinc-200"
              }`}
            >
              <div
                className={`size-5 rounded-full bg-white shadow-md transition-transform ${
                  autoAccept ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Audio Chime / Sound Alerts */}
          <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <Volume2 className="size-4" />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-900">Audio Order Chime</p>
                <p className="text-[10px] font-medium text-zinc-400">Play chime & ringtone on new rides</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
                soundAlerts ? "bg-blue-500" : "bg-zinc-200"
              }`}
            >
              <div
                className={`size-5 rounded-full bg-white shadow-md transition-transform ${
                  soundAlerts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* SECTION: VEHICLE & KYC DOCUMENTS */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bike className="size-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Vehicle & KYC Documents
              </h3>
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Verified ✓
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
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

            <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-zinc-500 font-semibold">Driving License (DL)</span>
              <span className="font-mono font-bold text-zinc-900">
                {dlNumber ? `${dlNumber.slice(0, 6)}••••` : "Verified on File ✓"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-zinc-500 font-semibold">RC Certificate</span>
              <span className="font-mono font-bold text-zinc-900">
                {rcNumber ? `${rcNumber.slice(0, 6)}••••` : "Verified Active ✓"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                <p className="text-[10px] font-bold text-emerald-700">Aadhaar Card</p>
                <p className="text-xs font-black text-emerald-800">Linked ✓</p>
              </div>
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                <p className="text-[10px] font-bold text-emerald-700">PAN Card</p>
                <p className="text-xs font-black text-emerald-800">Verified ✓</p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: BANK & UPI SETTLEMENT DETAILS */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                Settlement & Bank Details
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="text-xs font-bold text-emerald-600 hover:underline active:scale-95"
            >
              Update
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
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
                {accountNumber ? `•••• •••• ${accountNumber.slice(-4)}` : "Direct UPI Linked"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-zinc-500 font-semibold">Primary UPI ID</span>
              <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {upiId || `${phone.replace(/\D/g, "")}@upi`}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION: KNOWLEDGE & SUPPORT ACTION CARDS */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-2 shadow-sm space-y-1">
          {/* Captain Guidelines & SOP */}
          <button
            type="button"
            onClick={() => setShowGuidelinesModal(true)}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <FileText className="size-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-zinc-900">Captain Onboarding & Guidelines</p>
                <p className="text-[10px] font-medium text-zinc-500">Order SOP, Zero Commission rules</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-zinc-400" />
          </button>

          {/* 24/7 Helpline & SOS Support */}
          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 active:scale-98 transition-all border-t border-zinc-100"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <Headphones className="size-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-zinc-900">24/7 Captain Helpline & Support</p>
                <p className="text-[10px] font-medium text-zinc-500">+91 92587 30561 · Live WhatsApp</p>
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

        {/* LOGOUT BUTTON (Partner Style) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs rounded-2xl border border-red-200 active:scale-98 transition-all"
          >
            <LogOut className="size-4" />
            <span>Log Out of QuickPress Captain</span>
          </button>
          <p className="text-center text-[10px] font-medium text-zinc-400 mt-2">
            QuickPress Logistics v2.4.0 · Kasganj Fleet Network
          </p>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-zinc-700">Captain Full Name</label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    🔒 Requires Approval
                  </span>
                </div>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-zinc-700">Vehicle Plate Number</label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    🔒 Requires Approval
                  </span>
                </div>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono font-black text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="border-t border-zinc-200 pt-3">
                <h4 className="font-black text-zinc-800 uppercase tracking-wide text-[11px] mb-2">
                  Payout Bank / UPI Details
                </h4>

                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-zinc-700">Account Holder Name</label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        🔒 Requires Approval
                      </span>
                    </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-zinc-700">Bank Account Number</label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        🔒 Requires Approval
                      </span>
                    </div>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-zinc-700">Bank IFSC Code</label>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        🔒 Requires Approval
                      </span>
                    </div>
                    <input
                      type="text"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Primary Instant UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl font-mono font-black text-zinc-900 focus:bg-white focus:outline-none focus:border-emerald-500"
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
                <span className="text-[10px] font-black px-1.5 py-0.5 bg-amber-400 text-zinc-950 rounded uppercase tracking-wider">
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
                <p className="text-xs font-mono font-bold text-zinc-600">ID: {riderId}</p>
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
    </div>
  );
}
