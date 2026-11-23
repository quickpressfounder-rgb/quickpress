import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Eraser,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchPartnerAgreementDetails,
  signAndApprovePartnerAgreement,
  resendPartnerAgreementEmail,
  type PartnerAgreementDetails,
} from "../api/partner/partner-auth-api";
import { partnerRoutes } from "../navigation/partner-routes";

export function PartnerAgreementSigningScreen() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { token?: string };
  const token =
    searchParams?.token ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") || ""
      : "");

  const [loading, setLoading] = useState(true);
  const [agreementData, setAgreementData] = useState<PartnerAgreementDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Signing states
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showFullClauses, setShowFullClauses] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Canvas ref for signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Load agreement details
  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    fetchPartnerAgreementDetails(token)
      .then((res) => {
        if (!active) return;
        setAgreementData(res);
        if (res.agreementApproved || res.agreementStatus === "APPROVED") {
          setIsSuccess(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        setErrorMessage(
          err?.message ||
            "Invalid or expired merchant agreement link. Please check your invitation email or request a new link."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  // Canvas drawing handlers
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if ("touches" in e) {
      e.preventDefault(); // prevent scroll on touch
    }

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Submit digital signature and approve agreement
  const handleSignAndApprove = async () => {
    if (!consentChecked) {
      toast.error("Please accept the agreement terms checkbox to continue.");
      return;
    }

    let signatureUrl = "";
    if (canvasRef.current && hasSignature) {
      try {
        signatureUrl = canvasRef.current.toDataURL("image/png");
      } catch {}
    }

    if (!signatureUrl && !agreementData?.signatureUrl) {
      toast.error("Please draw your signature inside the box before approving.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signAndApprovePartnerAgreement({
        token,
        partnerId: agreementData?.partnerId,
        signatureUrl: signatureUrl || agreementData?.signatureUrl || "",
        signedByName: agreementData?.ownerName,
        agreementVersion: agreementData?.agreementVersion || "QP-SLA-2026-v4.2",
      });

      if (res.ok) {
        toast.success(
          "Master Merchant Agreement successfully approved and executed! Welcome to QuickPress Partner Network."
        );
        setIsSuccess(true);
      } else {
        toast.error("Failed to approve agreement. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not submit agreement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend invitation email
  const handleResendEmail = async () => {
    setResendingEmail(true);
    try {
      const res = await resendPartnerAgreementEmail({
        token,
        partnerId: agreementData?.partnerId,
        email: agreementData?.email,
      });
      if (res.ok) {
        toast.success(res.message || "Signing link resent to your email.");
      } else {
        toast.error("Could not resend email. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not resend invitation email.");
    } finally {
      setResendingEmail(false);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <h2 className="text-base font-bold text-neutral-800">Loading Master Merchant Agreement...</h2>
        <p className="text-xs text-neutral-500 mt-1 max-w-xs">
          Fetching official QuickPress SLA and bilateral partnership clauses...
        </p>
      </div>
    );
  }

  // Error / Invalid Token Screen
  if (errorMessage || !agreementData) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Unable to Load Agreement</h2>
        <p className="text-xs text-neutral-600 mt-2 max-w-sm leading-relaxed">
          {errorMessage || "The agreement signing link is invalid or has expired."}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resendingEmail}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition flex items-center justify-center gap-2"
          >
            {resendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            <span>Resend Signing Link via Email</span>
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: partnerRoutes.submitted })}
            className="px-5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs transition"
          >
            Go to Registration Submitted
          </button>
        </div>
      </div>
    );
  }

  // Success / Already Approved Screen
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center mb-5 shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full mb-2">
          Contract Digitally Executed &amp; Approved
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-neutral-900">
          Master Merchant Agreement Signed!
        </h1>
        <p className="text-xs text-neutral-600 mt-2 max-w-md leading-relaxed">
          Thank you, <strong>{agreementData.ownerName}</strong>! Your Master Merchant Partnership Agreement for{" "}
          <strong>{agreementData.storeName}</strong> has been digitally signed under the Information Technology Act, 2000.
        </p>

        {/* Agreement summary card */}
        <div className="mt-6 w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-4 text-left space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">Agreement Reference</span>
            <span className="text-xs font-mono font-bold text-neutral-900">{agreementData.agreementRef}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">Store Partner</span>
            <span className="font-bold text-neutral-900">{agreementData.storeName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">Store Owner</span>
            <span className="font-bold text-neutral-900">{agreementData.ownerName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">Operating Territory</span>
            <span className="font-bold text-neutral-900">{agreementData.city}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">Status</span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Approved &amp; Awaiting Admin Final Activation
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <button
            type="button"
            onClick={() => navigate({ to: partnerRoutes.submitted })}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Return to Registration Submitted</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Active Contract Review & Sign UI
  return (
    <div className="min-h-screen bg-neutral-100/60 pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              aria-label="Back"
              onClick={() => navigate({ to: partnerRoutes.submitted })}
              className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition active:scale-95 cursor-pointer shrink-0"
            >
              <ArrowLeft className="size-4.5" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-2xs">
              QP
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black text-neutral-900 leading-tight truncate">
                Merchant Master Agreement
              </h1>
              <p className="text-[10px] text-neutral-500 font-medium truncate">
                Ref: {agreementData.agreementRef} · v{agreementData.agreementVersion}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black border border-amber-200/80 flex items-center gap-1 shrink-0">
            <Lock className="w-3 h-3 text-amber-600" />
            <span className="hidden sm:inline">Signature Required</span>
            <span className="sm:hidden">Sign</span>
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Banner Alert */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
          <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
              Official Review &amp; Digital Contract Execution
            </h2>
            <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
              Please review the commercial terms, commission tiers, defect inspection standards, and bank payout rules for{" "}
              <strong>{agreementData.storeName}</strong>. Once signed, the executed agreement will be archived and dispatched to{" "}
              <strong>{agreementData.email}</strong>.
            </p>
          </div>
        </div>

        {/* 1. Contracting Parties Card */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
            <Scale className="w-4 h-4 text-neutral-700" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              1. Contracting Parties &amp; Store Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Marketplace Platform</span>
              <p className="font-bold text-neutral-900">QuickPress Marketplace Private Limited</p>
              <p className="text-[11px] text-neutral-600">Represented by Operations &amp; Merchant Governance Desk</p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Authorized Store Partner</span>
              <p className="font-bold text-neutral-900">{agreementData.storeName}</p>
              <p className="text-[11px] text-neutral-600">
                Proprietor / Signatory: <strong>{agreementData.ownerName}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50">
              <span className="text-[10px] text-neutral-400 font-bold uppercase block">Category</span>
              <span className="font-bold text-neutral-800">{agreementData.category}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50">
              <span className="text-[10px] text-neutral-400 font-bold uppercase block">Operating City</span>
              <span className="font-bold text-neutral-800">{agreementData.city}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50">
              <span className="text-[10px] text-neutral-400 font-bold uppercase block">Partner ID</span>
              <span className="font-mono font-bold text-neutral-800 truncate">{agreementData.partnerId}</span>
            </div>
            <div className="p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50">
              <span className="text-[10px] text-neutral-400 font-bold uppercase block">Pincode</span>
              <span className="font-bold text-neutral-800">{agreementData.pincode || "Registered Zone"}</span>
            </div>
          </div>
        </section>

        {/* 2. Commercial Terms & Settlement Engine */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              2. Commercial Terms, Commissions &amp; Payout Engine
            </h3>
          </div>

          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60">
              <span className="text-neutral-600">Platform Commission Rate:</span>
              <span className="font-mono font-black text-emerald-800 text-sm">
                {agreementData.commissionPct}% + applicable GST
              </span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60">
              <span className="text-neutral-600">Settlement Cycle:</span>
              <span className="font-bold text-neutral-900">7-Day Weekly Automated Bank Settlement</span>
            </div>
            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60">
              <span className="text-neutral-600">Registered Bank Account:</span>
              <span className="font-mono font-bold text-neutral-800">
                {agreementData.bankName} (IFSC: {agreementData.ifsc})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Account Holder:</span>
              <span className="font-bold text-neutral-900">{agreementData.accountHolder}</span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Payouts are computed automatically from completed orders, net of agreed marketplace commission, and credited
            directly to the verified bank account. No manual withdrawal or invoice generation is required.
          </p>
        </section>

        {/* 3. Operational SLA, Pre-Wash Inspection & Garment Defect Liability */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                3. Operational SLA &amp; Pre-Wash Defect Inspection
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowFullClauses(!showFullClauses)}
              className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
            >
              <span>{showFullClauses ? "Collapse" : "Read Full SLA"}</span>
              {showFullClauses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <ul className="space-y-2 text-xs text-neutral-700 leading-relaxed list-disc list-inside">
            <li>
              <strong>Order Intake &amp; Handover:</strong> The Partner Store agrees to intake customer garments delivered by QuickPress Captains and record piece counts promptly.
            </li>
            <li>
              <strong>Mandatory Pre-Wash Inspection:</strong> Before processing, the store must photograph and log any pre-existing tears, missing buttons, color runs, or fabric burns in the Partner Console. QuickPress then obtains automated customer consent.
            </li>
            <li>
              <strong>Standard Turnaround Hours:</strong> The store must adhere to standard processing turnaround times (e.g. 24h for wash &amp; fold, 48h for dry cleaning) to maintain a minimum 95% on-time SLA score.
            </li>
          </ul>

          {showFullClauses && (
            <div className="mt-3 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-[11px] text-neutral-600 leading-relaxed animate-in fade-in duration-200">
              <p>
                <strong>4. Defect Claims &amp; Dispute Policy:</strong> If a garment is damaged during processing and no pre-wash defect was logged with photo evidence, the store assumes liability in accordance with the QuickPress Merchant Fair Play policy.
              </p>
              <p>
                <strong>5. Confidentiality &amp; Data Privacy:</strong> Customer contact information provided on booking tags must strictly be used for order fulfilment. Direct off-platform solicitations are strictly prohibited.
              </p>
              <p>
                <strong>6. Termination &amp; Notice:</strong> Either party may terminate this partnership by providing 30 calendar days of written notice, provided all active orders and outstanding weekly balances have been settled.
              </p>
            </div>
          )}
        </section>

        {/* 4. Digital Signature Pad & IT Act Affirmation */}
        <section className="bg-white border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                4. Digital Signature &amp; Legal Affirmation
              </h3>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">Sec 10A, IT Act 2000</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-800">
                Draw Your Signature Below (Store Owner) <span className="text-red-500">*</span>
              </label>
              {hasSignature && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[11px] font-bold text-neutral-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Eraser className="w-3 h-3" />
                  <span>Clear &amp; Redraw</span>
                </button>
              )}
            </div>

            {/* Signature Pad Box */}
            <div className="relative border-2 border-dashed border-neutral-300 hover:border-emerald-500 focus-within:border-emerald-600 bg-neutral-50/50 rounded-xl overflow-hidden transition-all">
              <canvas
                ref={canvasRef}
                width={500}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 touch-none cursor-crosshair bg-white"
              />

              {!hasSignature && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-neutral-400 text-xs">
                  <p className="font-bold">Draw your signature here with finger or mouse</p>
                  <p className="text-[10px] mt-0.5 text-neutral-400">Official Signatory: {agreementData.ownerName}</p>
                </div>
              )}

              {/* Signature Baseline */}
              <div className="pointer-events-none absolute bottom-4 left-6 right-6 border-b border-dashed border-neutral-200" />
            </div>

            {hasSignature && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Signature Captured: {agreementData.ownerName}
                </span>
                <span className="font-mono text-[10px] text-emerald-700">{new Date().toLocaleDateString("en-IN")}</span>
              </div>
            )}
          </div>

          {/* IT Act Affirmation Checkbox */}
          <div className="pt-2 border-t border-neutral-100">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-neutral-800 select-none">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer shrink-0"
              />
              <span className="leading-snug">
                I, <strong>{agreementData.ownerName}</strong>, authorized proprietor/representative of{" "}
                <strong>{agreementData.storeName}</strong>, hereby declare that I have read and agree to all terms of the
                QuickPress Master Merchant Partnership Agreement (SLA, Commission Tiers &amp; Weekly Payouts) and affix my
                valid digital signature pursuant to Section 10A of the Information Technology Act, 2000.
              </span>
            </label>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            disabled={isSubmitting || !consentChecked || !hasSignature}
            onClick={handleSignAndApprove}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Approving &amp; Executing Agreement...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-4 h-4" />
                <span>Accept Terms &amp; Digitally Sign Agreement</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: partnerRoutes.submitted })}
            className="w-full py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 transition"
          >
            Back to Registration Submitted
          </button>
        </div>
      </main>
    </div>
  );
}

