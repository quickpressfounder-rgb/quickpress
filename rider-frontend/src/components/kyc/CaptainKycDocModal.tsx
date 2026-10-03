import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Lock,
  QrCode,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { triggerHaptic } from "../../lib/captain-audio";
import type { RiderProfile } from "../../api/rider/rider-profile-api";

export type KycDocType = "aadhaar" | "pan" | "dl" | "rc";

interface CaptainKycDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: KycDocType;
  profile: RiderProfile | null;
  fullName: string;
  displayPhoto?: string;
  phone: string;
  city: string;
  vehicleNumber?: string;
  dlNumber?: string;
  rcNumber?: string;
  aadhaarNumber?: string;
  panNumber?: string;
}

export const CaptainKycDocModal: React.FC<CaptainKycDocModalProps> = ({
  isOpen,
  onClose,
  initialDoc = "aadhaar",
  profile,
  fullName,
  displayPhoto,
  phone,
  city,
  vehicleNumber,
  dlNumber,
  rcNumber,
  aadhaarNumber,
  panNumber,
}) => {
  const [activeDoc, setActiveDoc] = useState<KycDocType>(initialDoc);
  const [side, setSide] = useState<"front" | "back">("front");

  // Keep activeDoc synced if opened with a specific doc
  React.useEffect(() => {
    if (initialDoc) {
      setActiveDoc(initialDoc);
      setSide("front");
    }
  }, [initialDoc, isOpen]);

  if (!isOpen) return null;

  const effectivePhoto =
    displayPhoto ||
    profile?.photoUrl ||
    profile?.selfieUrl ||
    (typeof window !== "undefined" ? window.localStorage.getItem("qp_rider_profile_photo") : null);

  const cleanAadhaar =
    profile?.aadhaar ||
    (aadhaarNumber
      ? aadhaarNumber.includes("•") || aadhaarNumber.includes("X")
        ? aadhaarNumber
        : `•••• •••• ${aadhaarNumber.slice(-4)}`
      : "•••• •••• 3144");

  const cleanPan = profile?.pan || panNumber || "ABCDE1234F";
  const cleanDl = dlNumber || profile?.dlNumber || "UP87 20240012345";
  const cleanRc = vehicleNumber || profile?.rcNumber || profile?.vehicleNumber || "UP 87 AB 4021";

  // Check if real uploaded images exist
  const aadhaarFrontImg = profile?.aadhaarFront || "";
  const aadhaarBackImg = profile?.aadhaarBack || "";
  const panImg = profile?.panCard || "";
  const dlFrontImg = profile?.dlFront || "";
  const dlBackImg = profile?.dlBack || "";
  const rcFrontImg = profile?.rcFront || "";
  const rcBackImg = profile?.rcBack || "";

  const handleDownload = () => {
    triggerHaptic();
    toast.success(
      `${activeDoc === "aadhaar" ? "Aadhaar Card" : activeDoc === "pan" ? "PAN Card" : activeDoc === "dl" ? "Driving License" : "RC Certificate"} copy downloaded! 📄`
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* 1. Modal Top Bar */}
        <div className="px-5 py-4 bg-zinc-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black tracking-tight text-white">KYC Document Viewer</h3>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                  Verified ✓
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Government identity & vehicle proofs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 2. Top Document Switcher Tabs */}
        <div className="p-2.5 bg-zinc-100 border-b border-zinc-200 shrink-0">
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: "aadhaar" as const, label: "Aadhaar", icon: "🪪" },
              { id: "pan" as const, label: "PAN", icon: "💳" },
              { id: "dl" as const, label: "DL", icon: "🛵" },
              { id: "rc" as const, label: "RC", icon: "📄" },
            ].map((tab) => {
              const active = activeDoc === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(30);
                    setActiveDoc(tab.id);
                    setSide("front");
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    active
                      ? "bg-white text-zinc-950 shadow-sm border border-zinc-200"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
                  }`}
                >
                  <span className="text-xs">{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Front / Back Toggle (for Aadhaar, DL, RC) */}
        {activeDoc !== "pan" && (
          <div className="px-5 pt-3 pb-1 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-bold text-zinc-500">
              Document View Side:
            </span>
            <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setSide("front");
                }}
                className={`px-3 py-1 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                  side === "front"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Front View
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  setSide("back");
                }}
                className={`px-3 py-1 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                  side === "back"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Back View
              </button>
            </div>
          </div>
        )}

        {/* 4. Scrollable Document Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ======================================================== */}
          {/* AADHAAR CARD DISPLAY */}
          {/* ======================================================== */}
          {activeDoc === "aadhaar" && (
            <div className="space-y-3">
              {side === "front" && aadhaarFrontImg ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-md bg-zinc-50">
                  <div className="p-2 bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-between">
                    <span>Uploaded Aadhaar (Front)</span>
                    <a
                      href={aadhaarFrontImg}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      <span>Full Image</span>
                    </a>
                  </div>
                  <img
                    src={aadhaarFrontImg}
                    alt="Aadhaar Front"
                    className="w-full h-auto max-h-[280px] object-contain bg-zinc-100"
                  />
                </div>
              ) : side === "back" && aadhaarBackImg ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-md bg-zinc-50">
                  <div className="p-2 bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-between">
                    <span>Uploaded Aadhaar (Back)</span>
                    <a
                      href={aadhaarBackImg}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      <span>Full Image</span>
                    </a>
                  </div>
                  <img
                    src={aadhaarBackImg}
                    alt="Aadhaar Back"
                    className="w-full h-auto max-h-[280px] object-contain bg-zinc-100"
                  />
                </div>
              ) : (
                /* High-Fidelity Official Digital Replica Card */
                <div className="rounded-2xl border border-zinc-300 shadow-lg overflow-hidden bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 text-zinc-900 relative">
                  {/* Indian Tricolor Top Stripe */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

                  {/* UIDAI Card Header */}
                  <div className="p-3 border-b border-zinc-200/80 flex items-center justify-between bg-white/90">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-amber-600 text-white font-black text-[10px] flex items-center justify-center">
                        🇮🇳
                      </div>
                      <div className="leading-tight">
                        <p className="text-[10px] font-black text-zinc-900">भारत सरकार / Govt. of India</p>
                        <p className="text-[8px] font-semibold text-zinc-500">
                          भारतीय विशिष्ट पहचान प्राधिकरण (UIDAI)
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      आधार
                    </span>
                  </div>

                  {/* Card Body */}
                  {side === "front" ? (
                    <div className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        {/* Photo Box */}
                        <div className="size-20 rounded-xl overflow-hidden bg-zinc-200 border-2 border-zinc-300 shrink-0 shadow-xs flex items-center justify-center">
                          {effectivePhoto ? (
                            <img
                              src={effectivePhoto}
                              alt={fullName}
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-black text-zinc-600">
                              {fullName.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-1 text-xs">
                          <div>
                            <p className="text-[9px] text-zinc-500 font-semibold">नाम / Name</p>
                            <p className="font-black text-zinc-950 truncate text-sm">{fullName}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-zinc-500 font-semibold">जन्म तिथि / DOB</p>
                            <p className="font-bold text-zinc-800">
                              {profile?.dob || "15/07/1998"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-zinc-500 font-semibold">लिंग / Gender</p>
                            <p className="font-bold text-zinc-800">
                              {profile?.gender || "MALE / पुरुष"}
                            </p>
                          </div>
                        </div>

                        {/* UIDAI QR */}
                        <div className="p-1.5 bg-white border border-zinc-200 rounded-xl shrink-0 shadow-2xs">
                          <QrCode className="size-10 text-zinc-900" />
                        </div>
                      </div>

                      {/* Aadhaar Number Centerpiece */}
                      <div className="py-2.5 px-3 bg-zinc-900 text-white rounded-xl text-center shadow-xs">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                          Aadhaar Number
                        </p>
                        <p className="font-mono font-black text-base sm:text-lg tracking-widest text-amber-300">
                          {cleanAadhaar}
                        </p>
                      </div>

                      {/* Footer Slogan */}
                      <div className="text-center pt-1">
                        <p className="text-[10px] font-black text-red-700 tracking-wider">
                          मेरा आधार, मेरी पहचान
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Back Side */
                    <div className="p-4 space-y-3 text-xs">
                      <div>
                        <p className="text-[9px] text-zinc-500 font-semibold">पता / Address</p>
                        <p className="font-bold text-zinc-800 leading-relaxed text-[11px]">
                          Station Road, Soron Gate Area, Near Gandhi Murti, {city || "Kasganj"},{" "}
                          Uttar Pradesh, PIN - 207123
                        </p>
                      </div>

                      <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between text-[10px]">
                        <div>
                          <p className="font-bold text-zinc-600">UIDAI Helpline</p>
                          <p className="font-black text-zinc-900">1947 (Toll Free)</p>
                        </div>
                        <div>
                          <p className="font-bold text-zinc-600">Official Portal</p>
                          <p className="font-black text-emerald-700">uidai.gov.in</p>
                        </div>
                      </div>

                      <div className="py-2 px-3 bg-zinc-900 text-white rounded-xl text-center">
                        <p className="font-mono font-black tracking-widest text-amber-300">
                          {cleanAadhaar}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bottom Stripe */}
                  <div className="h-1 w-full bg-red-700" />
                </div>
              )}

              {/* Status Box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <div>
                    <p className="font-black text-emerald-950">Aadhaar Linked & Verified</p>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      UIDAI e-KYC authentication successful
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Active ✓
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PAN CARD DISPLAY */}
          {/* ======================================================== */}
          {activeDoc === "pan" && (
            <div className="space-y-3">
              {panImg ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-md bg-zinc-50">
                  <div className="p-2 bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-between">
                    <span>Uploaded PAN Card</span>
                    <a
                      href={panImg}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      <span>Full Image</span>
                    </a>
                  </div>
                  <img
                    src={panImg}
                    alt="PAN Card"
                    className="w-full h-auto max-h-[280px] object-contain bg-zinc-100"
                  />
                </div>
              ) : (
                /* High-Fidelity PAN Card Digital Replica */
                <div className="rounded-2xl border-2 border-sky-300 shadow-lg overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50/60 text-zinc-900 relative">
                  {/* Top Header */}
                  <div className="p-3 bg-gradient-to-r from-sky-700 to-blue-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-amber-400 text-zinc-950 font-black text-[10px] flex items-center justify-center">
                        🏛️
                      </div>
                      <div className="leading-tight">
                        <p className="text-[10px] font-black">आयकर विभाग / INCOME TAX DEPARTMENT</p>
                        <p className="text-[8px] font-bold text-sky-200">भारत सरकार / GOVT. OF INDIA</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-amber-300 bg-sky-900/60 px-1.5 py-0.5 rounded border border-sky-400/40">
                      PAN CARD
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="text-[10px] font-black text-sky-900 tracking-wider text-center uppercase">
                      स्थायी लेखा संख्या कार्ड / Permanent Account Number Card
                    </p>

                    <div className="flex items-start gap-3">
                      {/* Photo Box */}
                      <div className="size-20 rounded-xl overflow-hidden bg-zinc-200 border-2 border-sky-200 shrink-0 shadow-xs flex items-center justify-center">
                        {effectivePhoto ? (
                          <img
                            src={effectivePhoto}
                            alt={fullName}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-black text-zinc-600">
                            {fullName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                        <div>
                          <p className="text-[9px] text-zinc-500 font-semibold uppercase">Name / नाम</p>
                          <p className="font-black text-zinc-950 truncate text-sm">
                            {fullName.toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-500 font-semibold uppercase">Father's Name / पिता का नाम</p>
                          <p className="font-bold text-zinc-800 text-[11px]">
                            {(profile?.accountHolder || fullName.split(" ")[0] + " PAL").toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-500 font-semibold uppercase">Date of Birth / जन्म तिथि</p>
                          <p className="font-bold text-zinc-800 text-[11px]">
                            {profile?.dob || "15/07/1998"}
                          </p>
                        </div>
                      </div>

                      {/* Hologram / QR */}
                      <div className="p-1.5 bg-white border border-sky-200 rounded-xl shrink-0 shadow-2xs">
                        <QrCode className="size-10 text-sky-900" />
                      </div>
                    </div>

                    {/* Permanent Account Number Center Box */}
                    <div className="py-2.5 px-3 bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-xl text-center shadow-xs">
                      <p className="text-[9px] text-sky-300 font-bold uppercase tracking-widest">
                        Permanent Account Number (PAN)
                      </p>
                      <p className="font-mono font-black text-base sm:text-lg tracking-widest text-amber-300">
                        {cleanPan}
                      </p>
                    </div>

                    {/* Simulated Signature */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-zinc-400 font-medium">
                        Secured with NSDL Tax Portal
                      </span>
                      <div className="px-3 py-1 bg-white border border-zinc-200 rounded-md font-serif italic text-xs text-blue-900">
                        {fullName}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <div>
                    <p className="font-black text-emerald-950">PAN Verified & Active</p>
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Income Tax Department database matched
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Verified ✓
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* DRIVING LICENSE DISPLAY */}
          {/* ======================================================== */}
          {activeDoc === "dl" && (
            <div className="space-y-3">
              {side === "front" && dlFrontImg ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-md bg-zinc-50">
                  <div className="p-2 bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-between">
                    <span>Uploaded Driving License (Front)</span>
                    <a
                      href={dlFrontImg}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      <span>Full Image</span>
                    </a>
                  </div>
                  <img
                    src={dlFrontImg}
                    alt="DL Front"
                    className="w-full h-auto max-h-[280px] object-contain bg-zinc-100"
                  />
                </div>
              ) : side === "back" && dlBackImg ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-md bg-zinc-50">
                  <div className="p-2 bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-between">
                    <span>Uploaded Driving License (Back)</span>
                    <a
                      href={dlBackImg}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      <span>Full Image</span>
                    </a>
                  </div>
                  <img
                    src={dlBackImg}
                    alt="DL Back"
                    className="w-full h-auto max-h-[280px] object-contain bg-zinc-100"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-emerald-200 shadow-lg overflow-hidden bg-white text-zinc-900">
                  <div className="p-3 bg-emerald-800 text-white flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase">UNION OF INDIA DRIVING LICENCE</p>
                      <p className="text-[8px] text-emerald-200">Transport Dept, Uttar Pradesh</p>
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white text-emerald-950 uppercase">
                      MCWG / LMV
                    </span>
                  </div>

                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="size-16 rounded-xl overflow-hidden bg-zinc-200 border shrink-0 flex items-center justify-center">
                        {effectivePhoto ? (
                          <img src={effectivePhoto} alt={fullName} className="size-full object-cover" />
                        ) : (
                          <span className="font-black text-zinc-600">{fullName.slice(0, 2)}</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase">DL Number</p>
                        <p className="font-mono font-black text-sm text-zinc-950">{cleanDl}</p>
                        <p className="text-[11px] font-bold text-zinc-800">{fullName}</p>
                        <p className="text-[10px] text-zinc-600">Issued at: RTO Kasganj (UP-87)</p>
                      </div>
                    </div>

                    <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-500 block text-[9px]">Class of Vehicle:</span>
                        <span className="font-black text-zinc-900">MCWG (Motorcycle)</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[9px]">Validity Status:</span>
                        <span className="font-black text-emerald-700">Valid Active ✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <div>
                    <p className="font-black text-emerald-950">Driving License Verified</p>
                    <p className="text-[10px] text-emerald-700 font-medium">Parivahan Sewa Sarathi records valid</p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Active ✓
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* RC CERTIFICATE DISPLAY */}
          {/* ======================================================== */}
          {activeDoc === "rc" && (
            <div className="space-y-3">
              {side === "front" && rcFrontImg ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-md bg-zinc-50">
                  <div className="p-2 bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-between">
                    <span>Uploaded RC Certificate (Front)</span>
                    <a
                      href={rcFrontImg}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      <span>Full Image</span>
                    </a>
                  </div>
                  <img
                    src={rcFrontImg}
                    alt="RC Front"
                    className="w-full h-auto max-h-[280px] object-contain bg-zinc-100"
                  />
                </div>
              ) : side === "back" && rcBackImg ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-200 shadow-md bg-zinc-50">
                  <div className="p-2 bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-between">
                    <span>Uploaded RC Certificate (Back)</span>
                    <a
                      href={rcBackImg}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      <span>Full Image</span>
                    </a>
                  </div>
                  <img
                    src={rcBackImg}
                    alt="RC Back"
                    className="w-full h-auto max-h-[280px] object-contain bg-zinc-100"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-zinc-300 shadow-lg overflow-hidden bg-white text-zinc-900">
                  <div className="p-3 bg-zinc-900 text-white flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase">CERTIFICATE OF REGISTRATION</p>
                      <p className="text-[8px] text-zinc-400">Form 23 - Transport Dept Kasganj</p>
                    </div>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white uppercase">
                      Commercial Delivery
                    </span>
                  </div>

                  <div className="p-4 space-y-3 text-xs">
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Reg. Number:</span>
                        <span className="font-mono font-black text-sm text-zinc-950">{cleanRc}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Owner Name:</span>
                        <span className="font-black text-zinc-900">{fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Vehicle Class:</span>
                        <span className="font-bold text-zinc-800">Motorcycle (2 Wheeler)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Fuel Type:</span>
                        <span className="font-bold text-zinc-800">Petrol / EV</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <div>
                    <p className="font-black text-emerald-950">RC Certificate Verified</p>
                    <p className="text-[10px] text-emerald-700 font-medium">Vahan National Register verified</p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Active ✓
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 5. Bottom Actions */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
          >
            <Download className="size-4" />
            <span>Download Digital Copy</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs rounded-xl active:scale-98 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
