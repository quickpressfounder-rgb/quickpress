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
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchRiderAgreementDetails,
  signAndApproveRiderAgreement,
  resendRiderAgreementEmail,
} from "../api/rider/rider-verification-api";
import { triggerHaptic } from "../lib/captain-audio";

export function RiderAgreementSigningScreen() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { token?: string };
  const token = searchParams?.token || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || "" : "");

  const [loading, setLoading] = useState(true);
  const [agreementData, setAgreementData] = useState<any>(null);
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

    fetchRiderAgreementDetails(token)
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
          err?.message || "Invalid or expired agreement link. Please check your invitation email or request a new link."
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
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

    // Fallback if typed or existing signature
    if (!signatureUrl || signatureUrl.length < 50) {
      if (agreementData?.agreementSignature) {
        signatureUrl = agreementData.agreementSignature;
      } else {
        toast.error("Please draw your digital signature inside the signing pad.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await signAndApproveRiderAgreement({
        token,
        signatureUrl,
        riderId: agreementData?.riderId,
      });

      triggerHaptic();
      setIsSuccess(true);
      toast.success("Partner Agreement Digitally Approved! ✓ Copy emailed to you.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit agreement. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    try {
      await resendRiderAgreementEmail({
        token,
        riderId: agreementData?.riderId,
        email: agreementData?.email,
      });
      toast.success(`Agreement link resent to ${agreementData?.email || "your email"}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend email.");
    } finally {
      setResendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-[#00C853] animate-spin mb-3" />
        <p className="text-sm font-bold text-neutral-800">Loading Official Partner Agreement...</p>
        <p className="text-xs text-neutral-500 mt-1">Verifying secure digital token</p>
      </div>
    );
  }

  if (errorMessage && !agreementData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-base font-black text-neutral-900 text-center">Agreement Link Expired or Invalid</h2>
        <p className="text-xs text-neutral-600 text-center mt-2 leading-relaxed">{errorMessage}</p>
        <div className="mt-6 flex flex-col gap-2.5 w-full">
          <button
            onClick={() => navigate({ to: "/verification" })}
            className="w-full h-11 bg-[#00C853] hover:bg-[#00B548] text-black font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center cursor-pointer"
          >
            Go to Verification Status
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-11 bg-white border border-neutral-300 text-neutral-700 font-bold text-xs rounded-xl hover:bg-neutral-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-neutral-900 pb-16">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              aria-label="Back"
              onClick={() => navigate({ to: "/verification" })}
              className="flex size-9 items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition active:scale-95 cursor-pointer shrink-0"
            >
              <ArrowLeft className="size-4.5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#00C853]/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-[#00C853]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-black text-neutral-900 leading-tight truncate">QuickPress Captain</h1>
              <p className="text-[10px] text-neutral-500 font-medium truncate">Partner Agreement</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            {agreementData?.agreementRef || "QP-SLA-2026"}
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Success State */}
        {isSuccess ? (
          <div className="p-6 bg-white border border-emerald-200 rounded-3xl text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Agreement Executed ✓
              </span>
              <h2 className="text-lg font-black text-neutral-900 mt-2">Partner Agreement Confirmed &amp; Approved</h2>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Thank you, <strong>{agreementData?.fullName}</strong>. Your Delivery Partner Service Level Agreement has been digitally executed under Section 10A of the IT Act, 2000.
              </p>
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-left text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-neutral-500">Contract Ref:</span>
                <span className="font-mono font-bold text-neutral-900">{agreementData?.agreementRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Signed For:</span>
                <span className="font-bold text-neutral-900">{agreementData?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Operating Territory:</span>
                <span className="font-bold text-neutral-900">{agreementData?.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">PDF Dispatch:</span>
                <span className="font-bold text-emerald-700">Sent to {agreementData?.email}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => navigate({ to: "/verification" })}
                className="w-full h-12 bg-[#00C853] hover:bg-[#00B548] text-black font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Return to Verification Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Agreement Notice Banner */}
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950 shadow-2xs">
              <Scale className="w-4.5 h-4.5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Digital Service Partner Agreement</p>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  Please review the contract details, delivery kit gear terms, and draw your signature below to approve your onboarding application.
                </p>
              </div>
            </div>

            {/* Contracting Parties Card */}
            <section className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 flex items-center gap-1.5 pb-2 border-b border-neutral-100">
                <User className="w-3.5 h-3.5 text-neutral-500" />
                <span>Contracting Parties</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                  <span className="text-[10px] font-bold text-neutral-500 block uppercase">Platform Company</span>
                  <span className="font-bold text-neutral-900 mt-0.5 block leading-tight">QuickPress Logistics Technologies Pvt Ltd</span>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                  <span className="text-[10px] font-bold text-neutral-500 block uppercase">Delivery Captain</span>
                  <span className="font-bold text-neutral-900 mt-0.5 block leading-tight">{agreementData?.fullName || "Candidate"}</span>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                  <span className="text-[10px] font-bold text-neutral-500 block uppercase">Operating Territory</span>
                  <span className="font-bold text-neutral-900 mt-0.5 block">{agreementData?.city || "—"}</span>
                </div>
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
                  <span className="text-[10px] font-bold text-neutral-500 block uppercase">Vehicle Number</span>
                  <span className="font-mono font-bold text-neutral-900 mt-0.5 block">{agreementData?.vehicleNumber || "—"}</span>
                </div>
              </div>
            </section>

            {/* Delivery Kit Commercial Terms Card */}
            <section className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 flex items-center gap-1.5 pb-2 border-b border-neutral-100">
                <Package className="w-3.5 h-3.5 text-[#00C853]" />
                <span>Delivery Kit &amp; Commercial Terms</span>
              </h3>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200">
                  <span className="font-bold text-neutral-800">QuickPress Captain Starter Kit</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                    {agreementData?.kitPaymentType === "part" ? "Part Payment (Installments)" : "Full Payment"}
                  </span>
                </div>
                <ul className="text-[11px] text-neutral-600 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>2x QuickPress Premium Dry-Fit Captain T-Shirts</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>1x High-Visibility Reflective Rain Jacket</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>1x Heavy-Duty Waterproof Insulated Delivery Bag</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>1x Official QR Captain ID Card with Lanyard</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>1x Stainless Steel QuickPress Water Bottle</span>
                  </li>
                </ul>

                {agreementData?.kitPaymentType === "part" && (
                  <div className="mt-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                    <strong>Payment Breakdown:</strong> ₹300 paid today. The remaining balance of ₹900 will be deducted in 3 weekly installments (₹300/week) automatically from your weekly delivery payout with 0% interest.
                  </div>
                )}
              </div>
            </section>

            {/* SLA Clauses Scroll Container */}
            <section className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Key Agreement Clauses (SLA)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFullClauses(!showFullClauses)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>{showFullClauses ? "Collapse Clauses" : "View Full Clauses"}</span>
                  {showFullClauses ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div
                onScroll={(e) => {
                  const target = e.currentTarget;
                  if (target.scrollHeight - target.scrollTop <= target.clientHeight + 40) {
                    setHasScrolledTerms(true);
                  }
                }}
                className={`text-xs text-neutral-700 space-y-3 bg-neutral-50/70 p-3 rounded-xl border border-neutral-200 overflow-y-auto ${
                  showFullClauses ? "max-h-96" : "max-h-48"
                }`}
              >
                <div>
                  <h4 className="font-bold text-neutral-900">1. Independent Service Contractor Status</h4>
                  <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                    The Delivery Captain acts as an independent service provider. Nothing in this agreement shall be construed to create an employer-employee, partnership, or agency relationship between QuickPress and the Captain.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">2. Service Standards &amp; Mandatory Gear</h4>
                  <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                    Captain agrees to wear the official QuickPress T-shirt, carry the insulated delivery bag, display the ID card, and wear a safety helmet during all active deliveries.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">3. Zero-Tolerance Safety Policy</h4>
                  <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                    Zero tolerance towards alcohol, narcotics, traffic violations, customer harassment, or tampering with laundry orders. Violations result in immediate permanent deactivation.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">4. Payouts &amp; Settlements</h4>
                  <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                    Earnings are credited directly to Captain's verified bank account via UPI / IMPS according to the standard weekly settlement schedule.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900">5. Digital Execution under IT Act, 2000</h4>
                  <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                    This digital agreement is executed under Section 10A of the Information Technology Act, 2000 and is legally enforceable upon digital signing and confirmation.
                  </p>
                </div>
              </div>
            </section>

            {/* Digital Signature Pad */}
            <section className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-700">
                    Candidate Digital Signature Pad <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Please draw your signature using finger or stylus</p>
                </div>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[11px] font-bold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-2 py-1 bg-neutral-100 rounded-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-neutral-300 rounded-xl overflow-hidden bg-white touch-none">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 cursor-crosshair block"
                />
              </div>

              {hasSignature && (
                <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Signature captured successfully</span>
                </p>
              )}
            </section>

            {/* Consent Checkbox */}
            <label className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#00C853] focus:ring-[#00C853] border-neutral-300 cursor-pointer"
              />
              <span className="text-xs text-neutral-800 leading-relaxed font-medium">
                I, <strong>{agreementData?.fullName || "Candidate"}</strong>, have read, understood, and accept all clauses of the QuickPress Delivery Partner Agreement. I hereby confirm my digital agreement execution.
              </span>
            </label>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSignAndApprove}
                disabled={isSubmitting || !consentChecked || !hasSignature}
                className="w-full h-12 bg-[#00C853] hover:bg-[#00B548] active:scale-[0.99] text-black font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-black animate-spin" />
                    <span>Executing &amp; Approving Agreement...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-black" />
                    <span>Confirm &amp; Approve Agreement</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendingEmail}
                  className="text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{resendingEmail ? "Resending..." : "Resend Link to My Email"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/verification" })}
                  className="text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  View Verification Status &rarr;
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
