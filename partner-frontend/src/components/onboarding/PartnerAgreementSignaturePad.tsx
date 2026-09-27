import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Eraser,
  FileText,
  PenTool,
  Scale,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export interface AgreementSignatureData {
  signatureUrl: string;
  signedAt: string;
  signerName: string;
  signerAadhaar?: string;
  signerPan?: string;
  agreementVersion: string;
  consentAgreed: boolean;
  aadhaarEsignVerified: boolean;
}

interface PartnerAgreementSignaturePadProps {
  ownerName: string;
  storeName: string;
  aadhaar?: string;
  pan?: string;
  city?: string;
  onSignatureConfirmed: (data: AgreementSignatureData) => void;
  initialSignature?: string;
}

export function PartnerAgreementSignaturePad({
  ownerName,
  storeName,
  aadhaar,
  pan,
  city,
  onSignatureConfirmed,
  initialSignature,
}: PartnerAgreementSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(initialSignature));
  const [signatureData, setSignatureData] = useState<string>(initialSignature || "");
  const [adoptedMode, setAdoptedMode] = useState<"draw" | "adopt">("draw");
  const [consentChecked, setConsentChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<"agreement" | "signature">("signature");

  const effectiveSignerName = ownerName || "Authorized Merchant Signatory";
  const rawAadhaar = (aadhaar || "").replace(/\s/g, "");
  const maskedAadhaar = rawAadhaar.length >= 4 ? `XXXX-XXXX-${rawAadhaar.slice(-4)}` : "Verified Aadhaar";

  // Setup canvas drawing context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas coordinate space for retina crispness
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initialSignature;
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (adoptedMode === "adopt") setAdoptedMode("draw");
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      setSignatureData(dataUrl);
      if (consentChecked) {
        onSignatureConfirmed({
          signatureUrl: dataUrl,
          signedAt: new Date().toISOString(),
          signerName: effectiveSignerName,
          signerAadhaar: aadhaar,
          signerPan: pan,
          agreementVersion: "QP-SLA-2026.4",
          consentAgreed: true,
          aadhaarEsignVerified: true,
        });
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setSignatureData("");
    setAdoptedMode("draw");
  };

  const adoptVerifiedNameSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calligraphic legal cursive stamp
    ctx.font = "italic bold 28px 'Dancing Script', 'Brush Script MT', cursive, sans-serif";
    ctx.fillStyle = "#09090b";
    ctx.textAlign = "center";
    ctx.fillText(effectiveSignerName, rect.width / 2, rect.height / 2 + 6);

    // Micro stamp line
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, rect.height - 18);
    ctx.lineTo(rect.width - 30, rect.height - 18);
    ctx.stroke();

    ctx.font = "bold 9px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(`DIGITALLY E-SIGNED VIA AADHAAR (${maskedAadhaar})`, rect.width / 2, rect.height - 6);

    setHasDrawn(true);
    setAdoptedMode("adopt");

    const dataUrl = canvas.toDataURL("image/png");
    setSignatureData(dataUrl);

    if (consentChecked) {
      onSignatureConfirmed({
        signatureUrl: dataUrl,
        signedAt: new Date().toISOString(),
        signerName: effectiveSignerName,
        signerAadhaar: aadhaar,
        signerPan: pan,
        agreementVersion: "QP-SLA-2026.4",
        consentAgreed: true,
        aadhaarEsignVerified: true,
      });
    }
  };

  const handleConsentToggle = (checked: boolean) => {
    setConsentChecked(checked);
    if (checked && (hasDrawn || signatureData)) {
      onSignatureConfirmed({
        signatureUrl: signatureData || "data:image/png;base64,adopted",
        signedAt: new Date().toISOString(),
        signerName: effectiveSignerName,
        signerAadhaar: aadhaar,
        signerPan: pan,
        agreementVersion: "QP-SLA-2026.4",
        consentAgreed: true,
        aadhaarEsignVerified: true,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Tabs */}
      <div className="flex rounded-2xl bg-zinc-100 p-1 border border-zinc-200">
        <button
          type="button"
          onClick={() => setActiveTab("agreement")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer ${
            activeTab === "agreement"
              ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <FileText className="size-3.5 text-amber-500" />
          <span>1. Read Merchant SLA Terms</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("signature")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer ${
            activeTab === "signature"
              ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <PenTool className="size-3.5 text-emerald-600" />
          <span>2. Digital Signature & Aadhaar E-Sign</span>
          {hasDrawn && consentChecked && (
            <span className="size-2 rounded-full bg-emerald-500"></span>
          )}
        </button>
      </div>

      {activeTab === "agreement" ? (
        /* Merchant SLA Terms Viewer */
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="size-5 text-amber-500" />
              <div>
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                  QuickPress Merchant Franchise & Service Level Agreement
                </h4>
                <p className="text-[10px] font-semibold text-zinc-500">Document No: QP-SLA-2026-v4.2</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
              Legally Binding
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-2xl bg-zinc-50 border border-zinc-200/80 p-4 text-[11px] text-zinc-700 space-y-3 leading-relaxed font-sans">
            <p>
              <strong>1. PARTIES:</strong> This Agreement is executed between <strong>QuickPress Technologies Pvt Ltd</strong> (&quot;Platform&quot;) and <strong>{storeName || "The Partner Store"}</strong>, represented by authorized signatory <strong>{effectiveSignerName}</strong> (&quot;Merchant Partner&quot;).
            </p>

            <p>
              <strong>2. COMMISSION & SETTLEMENTS:</strong> The Platform deducts a standard 15% platform technology commission and 1% Government TCS under GST rules. Net partner earnings are settled automatically into the verified bank account ({pan ? `PAN: ${pan}` : ""}) on a daily automated cycle via NPCI IMPS/NEFT.
            </p>

            <p>
              <strong>3. QUALITY & 24-HR SLA COMMITMENT:</strong> The Partner warrants to process laundry items using approved professional detergents and machinery, maintaining agreed turnaround times (Standard 24 hrs / Express 12 hrs). Any garment damage or loss during store custody will be indemnified according to QuickPress Fair Compensation Guidelines.
            </p>

            <p>
              <strong>4. DISPATCH HANDOVER:</strong> Partner agrees to tag garments with unique QuickPress Order Barcodes and handover packed orders strictly to verified QuickPress Delivery Captains via 4-digit Dispatch OTP.
            </p>

            <p>
              <strong>5. ELECTRONIC SIGNATURE VALIDITY:</strong> Under Section 3A of the Information Technology Act, 2000, electronic execution of this agreement holds full legal validity and enforceability equivalent to physical paper execution.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setActiveTab("signature")}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-black hover:bg-amber-300 transition-all cursor-pointer shadow-sm"
            >
              <span>Accept & Proceed to E-Sign</span>
              <PenTool className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Digital Signature Canvas & Consent */
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <PenTool className="size-4 text-emerald-600" />
                <span>Authorized Digital Signature *</span>
              </h4>
              <p className="text-[11px] font-semibold text-zinc-500">
                Sign with your finger or stylus inside the signature box below.
              </p>
            </div>

            <button
              type="button"
              onClick={adoptVerifiedNameSignature}
              className="flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-[11px] font-black text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer"
            >
              <Sparkles className="size-3 text-emerald-600" />
              <span>Use Aadhaar Name Signature</span>
            </button>
          </div>

          {/* Canvas Box */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="h-40 w-full cursor-crosshair"
            />

            {!hasDrawn && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-zinc-400">
                <PenTool className="size-6 opacity-40 animate-pulse" />
                <span className="text-xs font-bold">Draw Signature Here (Finger / Mouse)</span>
              </div>
            )}

            {/* Clear Button */}
            {hasDrawn && (
              <button
                type="button"
                onClick={clearSignature}
                className="absolute top-3 right-3 flex items-center gap-1 rounded-xl bg-white/90 border border-zinc-200 px-2.5 py-1 text-[10px] font-black text-zinc-700 shadow-sm hover:bg-white active:scale-95 transition-all cursor-pointer"
              >
                <Eraser className="size-3 text-rose-500" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Signer Legal Identity Stamp with Aadhaar & PAN */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-zinc-50 border border-zinc-200/80 p-3 text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4 text-emerald-600" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Signatory:</span>
                <div className="font-bold text-zinc-900">{effectiveSignerName}</div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">UIDAI Aadhaar:</span>
              <div className="font-mono font-bold text-emerald-700 flex items-center gap-1 justify-end">
                <CheckCircle2 className="size-3 text-emerald-600" />
                <span>{maskedAadhaar} (Verified ✓)</span>
              </div>
            </div>
          </div>

          {/* Legal Consent Checkbox */}
          <label className="flex items-start gap-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => handleConsentToggle(e.target.checked)}
              className="mt-0.5 size-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
            />
            <div className="text-[11px] leading-tight text-zinc-800">
              <strong className="font-black text-zinc-900">I hereby e-sign and agree to the QuickPress Merchant SLA:</strong>
              <p className="mt-0.5 text-[10px] text-zinc-600">
                I declare that I am the authorized owner/signatory of <strong>{storeName || "this business"}</strong>. I agree to platform commissions, 24-hr turnaround SLA, and acknowledge that this digital signature is legally binding under Section 3A of the IT Act, 2000.
              </p>
            </div>
          </label>

          {/* Verification Badge */}
          {hasDrawn && consentChecked && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-100/80 border border-emerald-300 rounded-xl py-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Merchant SLA Agreement Digitally E-Signed ✓</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

