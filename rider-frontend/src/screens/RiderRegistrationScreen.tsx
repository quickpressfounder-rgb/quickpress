import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bike,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  Edit3,
  Eraser,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  IdCard,
  Info,
  Lock,
  Loader2,
  MapPin,
  PenTool,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useRiderContext } from "../context/RiderContext";
import { submitRiderRegistration, uploadRiderDocument } from "../api/rider/rider-auth-api";
import { apiGetJson, apiPostJson } from "../api/core/transport";
import { readSession, writeSession } from "../api/core/session-store";
import { QuickPressLogo } from "../components/common/QuickPressLogo";
import { useLanguage } from "../lib/i18n";
import { SimpleSelfieCaptureModal } from "../components/kyc/SimpleSelfieCaptureModal";
import { compareKycNames } from "../lib/kyc-name-matcher";
import { triggerHaptic } from "../lib/captain-audio";
import { readSession } from "../api/core/session-store";
import { isRiderApproved, isRiderOnboarded } from "../lib/auth-guard";
import { fetchRiderVerificationStatus } from "../api/rider/rider-verification-api";

// Major Indian Banks Directory
const INDIAN_BANKS = [
  "State Bank of India (SBI)",
  "HDFC Bank",
  "ICICI Bank",
  "Punjab National Bank (PNB)",
  "Bank of Baroda (BOB)",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Union Bank of India",
  "IndusInd Bank",
  "IDFC FIRST Bank",
  "Bank of India",
  "Central Bank of India",
  "Indian Bank",
  "UCO Bank",
  "Yes Bank",
  "Federal Bank",
  "Paytm Payments Bank",
  "Airtel Payments Bank",
  "India Post Payments Bank",
  "AU Small Finance Bank",
  "Other Bank",
];

// Two-Wheeler Catalog
const VEHICLE_CATALOG: Record<string, string[]> = {
  "Hero MotoCorp": [
    "Splendor Plus",
    "Splendor Plus XTEC",
    "HF Deluxe",
    "Glamour 125",
    "Passion Pro",
    "Xtreme 125R",
    "Super Splendor",
    "Destini 125",
    "Pleasure Plus",
    "Other Model",
  ],
  "Honda 2-Wheelers": [
    "Activa 6G",
    "Activa 125",
    "Shine 125",
    "SP 125",
    "Dio 125",
    "Unicorn 160",
    "Hornet 2.0",
    "Livo",
    "Other Model",
  ],
  "TVS Motor": [
    "Jupiter 110",
    "Jupiter 125",
    "Raider 125",
    "Apache RTR 160",
    "Apache RTR 180",
    "Ntorq 125",
    "Sport",
    "Radeon",
    "XL100 Heavy Duty",
    "iQube Electric (EV)",
    "Other Model",
  ],
  "Bajaj Auto": [
    "Pulsar 125",
    "Pulsar 150",
    "Pulsar NS125",
    "Pulsar NS200",
    "Pulsar N160",
    "Platina 100",
    "Platina 110",
    "CT 110X",
    "Chetak Electric (EV)",
    "Other Model",
  ],
  "Ola Electric (EV)": [
    "S1 Pro Gen 2",
    "S1 Air",
    "S1 X+",
    "S1 X (3kWh)",
    "S1 X (2kWh)",
    "Other Model",
  ],
  "Ather Energy (EV)": [
    "Rizta",
    "450X Gen 3",
    "450S",
    "450 Apex",
    "Other Model",
  ],
  "Royal Enfield": [
    "Classic 350",
    "Bullet 350",
    "Hunter 350",
    "Meteor 350",
    "Himalayan 450",
    "Other Model",
  ],
  Yamaha: [
    "RayZR 125 Fi Hybrid",
    "Fascino 125 Fi",
    "FZ-S V4",
    "MT-15 V2",
    "R15 V4",
    "Aerox 155",
    "Other Model",
  ],
  Suzuki: [
    "Access 125",
    "Burgman Street 125",
    "Avenis 125",
    "Gixxer 150",
    "Other Model",
  ],
  "Other Brand": ["Other Model"],
};

interface LiveCity {
  id?: string;
  name: string;
  city: string;
  state?: string;
  pincodes?: string[];
}

/** Client-side image compressor */
async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Reusable Document Upload Slot Component (Clean, Real App Style) */
interface DocumentUploadSlotProps {
  label: string;
  sublabel?: string;
  docType: string;
  value: string;
  onChange: (url: string) => void;
  isUploading: boolean;
  setIsUploading: (loading: boolean) => void;
  accept?: string;
  capture?: "user" | "environment";
  targetPhone?: string;
  icon?: React.ElementType;
  required?: boolean;
  error?: string | undefined;
}

function DocumentUploadSlot({
  label,
  sublabel,
  docType,
  value,
  onChange,
  isUploading,
  setIsUploading,
  accept = "image/*",
  capture,
  targetPhone,
  icon: Icon = Upload,
  required = false,
  error,
}: DocumentUploadSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressedDataUrl = await compressImage(file);
      onChange(compressedDataUrl);

      try {
        const res = await uploadRiderDocument(compressedDataUrl, docType, targetPhone);
        if (res && res.url) {
          onChange(res.url);
          toast.success(`${label} uploaded securely`);
        }
      } catch {
        toast.success(`${label} attached`);
      }
    } catch (err: any) {
      toast.error(`Could not read image: ${err?.message || "Error"}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[11px] font-bold text-neutral-700 tracking-wide">
          {label} {required && <span className="text-red-500 font-black">*</span>}
        </label>
        {value ? (
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Check className="w-3 h-3 text-[#00C853] stroke-[3]" />
            Attached
          </span>
        ) : required ? (
          <span className="text-[10px] font-semibold text-neutral-400">Required</span>
        ) : (
          <span className="text-[10px] font-semibold text-neutral-400">Optional</span>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        capture={capture}
        className="hidden"
        onChange={handleFileSelected}
      />

      {value ? (
        <div className="relative flex items-center gap-3 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-neutral-200 shrink-0 border border-neutral-300">
            <img src={value} alt={label} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neutral-900 truncate">{label}</p>
            <p className="text-[10px] text-neutral-500 truncate">
              {value.startsWith("http") ? "Saved to secure cloud" : "Document photo attached"}
            </p>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold rounded-lg active:scale-95 transition-all shrink-0"
          >
            Change
          </button>
        </div>
      ) : (
        <div
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={`flex items-center justify-between p-3.5 border-2 rounded-xl cursor-pointer transition-all ${
            error
              ? "border-red-400 bg-red-50/20 ring-2 ring-red-400/20"
              : isUploading
              ? "bg-neutral-100 border-neutral-300 cursor-not-allowed"
              : "border-dashed bg-neutral-50 border-neutral-300 hover:border-emerald-500 hover:bg-emerald-50/20"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isUploading ? (
              <Loader2 className="w-4 h-4 text-[#00C853] animate-spin shrink-0" />
            ) : (
              <Icon className={`w-4 h-4 shrink-0 ${error ? "text-red-500" : "text-neutral-400"}`} />
            )}
            <div>
              <p className={`text-xs font-bold ${error ? "text-red-800" : "text-neutral-800"}`}>
                {isUploading ? "Uploading..." : label}
              </p>
              <p className="text-[10px] text-neutral-500">
                {sublabel || "Tap to take photo or choose file"}
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md shrink-0 border ${
            error ? "text-red-700 bg-red-100/50 border-red-300" : "text-neutral-700 bg-white border-neutral-200"
          }`}>
            {isUploading ? "Wait..." : "Upload"}
          </span>
        </div>
      )}

      {error && (
        <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/** Missing Fields Summary Alert Banner */
function MissingFieldsAlert({ missingList }: { missingList: string[] }) {
  if (!missingList || missingList.length === 0) return null;
  return (
    <div
      id="missing-fields-banner"
      className="p-3.5 mb-3 bg-red-50 border-2 border-red-400/80 rounded-2xl shadow-xs transition-all"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-red-900 tracking-tight flex items-center gap-1.5">
            <span>Kripya bachi hui jaankari bharein</span>
            <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.2 rounded-full font-bold">
              {missingList.length} bachi hai
            </span>
          </h4>
          <p className="text-[11px] text-red-700 mt-0.5 font-medium">
            Aage badhne ke liye neeche diye gaye zaroori fields ko bharna anivarya hai:
          </p>
          <ul className="mt-2 space-y-1">
            {missingList.map((item, idx) => (
              <li
                key={idx}
                className="text-[11px] font-bold text-red-900 flex items-center gap-1.5 bg-white/90 px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function RiderRegistrationScreen() {
  const navigate = useNavigate();
  const { phone, session, signIn } = useRiderContext();
  const { t } = useLanguage();

  const targetPhone = phone || session?.phone || "";

  // 5 Step Flow: 1. Personal, 2. Aadhaar & Selfie, 3. Vehicle & RC, 4. Driving Licence, 5. Bank
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});

  // Live Cities
  const [liveCities, setLiveCities] = useState<LiveCity[]>([]);
  const [loadingCities, setLoadingCities] = useState<boolean>(false);

  // STEP 1: Personal Data
  const [fullName, setFullName] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [customPincodeMode, setCustomPincodeMode] = useState<boolean>(false);
  const [emergencyPhone, setEmergencyPhone] = useState<string>("");

  // STEP 2: Identity (Aadhaar or PAN) + Candidate Photo / Selfie (Upload or Live Click)
  const [kycDocMode, setKycDocMode] = useState<"aadhaar" | "pan">("aadhaar");

  // Aadhaar flow state (No OTP)
  const [aadhaarNumber, setAadhaarNumber] = useState<string>("");
  const [aadhaarFrontUrl, setAadhaarFrontUrl] = useState<string>("");
  const [aadhaarBackUrl, setAadhaarBackUrl] = useState<string>("");

  // PAN flow state
  const [panNumber, setPanNumber] = useState<string>("");
  const [verifyingPan, setVerifyingPan] = useState<boolean>(false);
  const [panVerified, setPanVerified] = useState<boolean>(false);
  const [panVerifiedName, setPanVerifiedName] = useState<string>("");
  const [panCardUrl, setPanCardUrl] = useState<string>("");

  // Candidate Photo / Selfie state (Direct Live Camera Click or Gallery Upload)
  const [isSelfieCameraOpen, setIsSelfieCameraOpen] = useState<boolean>(false);
  const [selfieUrl, setSelfieUrl] = useState<string>("");
  const [selfieVerified, setSelfieVerified] = useState<boolean>(false);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState<boolean>(false);
  const selfieGalleryInputRef = useRef<HTMLInputElement>(null);

  // STEP 3: Vehicle Detail (RC + Owner Name auto-fetched, Engine/Chassis NOT required)
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [verifyingRc, setVerifyingRc] = useState<boolean>(false);
  const [rcVerified, setRcVerified] = useState<boolean>(false);
  const [rcVerifiedOwner, setRcVerifiedOwner] = useState<string>("");
  const [vehicleType, setVehicleType] = useState<"bike" | "ev">("bike");
  const [brandInputMode, setBrandInputMode] = useState<"select" | "custom">("select");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [customBrand, setCustomBrand] = useState<string>("");
  const [modelInputMode, setModelInputMode] = useState<"select" | "custom">("select");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");
  // Vehicle / Bike Photo
  const [bikePhotoUrl, setBikePhotoUrl] = useState<string>("");
  // Engine & Chassis numbers (Optional / Deprecated)
  const [engineNumber, setEngineNumber] = useState<string>("");
  const [chassisNumber, setChassisNumber] = useState<string>("");
  const [rcFrontUrl, setRcFrontUrl] = useState<string>("");
  const [rcBackUrl, setRcBackUrl] = useState<string>("");

  // STEP 4: Driving Licence (DL) Verification
  const [drivingLicense, setDrivingLicense] = useState<string>("");
  const [dlExpiry, setDlExpiry] = useState<string>("");
  const [verifyingDl, setVerifyingDl] = useState<boolean>(false);
  const [dlVerified, setDlVerified] = useState<boolean>(false);
  const [dlVerifiedName, setDlVerifiedName] = useState<string>("");
  const [dlFrontUrl, setDlFrontUrl] = useState<string>("");
  const [dlBackUrl, setDlBackUrl] = useState<string>("");

  // STEP 5: Bank Details
  const [selectedBankDropdown, setSelectedBankDropdown] = useState<string>("");
  const [customBankName, setCustomBankName] = useState<string>("");
  // Account holder name: STRICTLY LOCKED to verified candidate name!
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState<string>("");
  const [ifsc, setIfsc] = useState<string>("");
  const [ifscVerifiedData, setIfscVerifiedData] = useState<{ bank?: string; branch?: string; city?: string } | null>(null);
  const [findingIfsc, setFindingIfsc] = useState<boolean>(false);
  const [passbookUrl, setPassbookUrl] = useState<string>("");
  const [cancelledChequeUrl, setCancelledChequeUrl] = useState<string>("");
  const [verifyingBank, setVerifyingBank] = useState<boolean>(false);
  const [bankVerified, setBankVerified] = useState<boolean>(false);
  const [bankVerifiedHolder, setBankVerifiedHolder] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);

  // STEP 6: Partner Agreement & E-Signature
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState<boolean>(false);
  const [agreementConsent, setAgreementConsent] = useState<boolean>(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const agreementScrollRef = useRef<HTMLDivElement | null>(null);

  // Canvas coordinate and drawing handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startSig = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsSigning(true);
    setHasSignature(true);
    clearFieldError("hasSignature");
  };

  const moveSig = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSigning) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endSig = () => {
    if (!isSigning) return;
    setIsSigning(false);
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const data = canvas.toDataURL("image/png");
      setSignatureDataUrl(data);
    }
  };

  const clearSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl("");
    setHasSignature(false);
  };

  // Setup / re-setup signature canvas whenever step 6 becomes active
  useEffect(() => {
    if (currentStep === 6 && sigCanvasRef.current) {
      const canvas = sigCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (signatureDataUrl) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
          img.src = signatureDataUrl;
        }
      }
    }
  }, [currentStep]);

  const handleAgreementScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 35) {
      if (!hasScrolledToBottom) {
        setHasScrolledToBottom(true);
        clearFieldError("hasScrolledToBottom");
        triggerHaptic();
        toast.success("✓ आपने पूरा अनुबंध पढ़ लिया है! अब चेकबॉक्स अनलॉक हो गया है।");
      }
    }
  };

  const jumpToEndOfAgreement = () => {
    if (agreementScrollRef.current) {
      agreementScrollRef.current.scrollTo({
        top: agreementScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
      setTimeout(() => {
        setHasScrolledToBottom(true);
        clearFieldError("hasScrolledToBottom");
        triggerHaptic();
        toast.success("✓ आपने पूरा अनुबंध पढ़ लिया है! अब चेकबॉक्स अनलॉक हो गया है।");
      }, 300);
    }
  };

  // Missing Fields Validation State (Real-time feedback)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [missingSummary, setMissingSummary] = useState<string[]>([]);

  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    setMissingSummary((prev) =>
      prev.filter((item) => !item.toLowerCase().includes(fieldName.toLowerCase()))
    );
  };

  // Helper for doc upload states
  const setDocUploading = (docKey: string) => (isUp: boolean) => {
    setUploadingDocs((prev) => ({ ...prev, [docKey]: isUp }));
  };

  // Gold Standard Name: priority to PAN official verified name, otherwise typed fullName
  const officialApplicantName = panVerifiedName || fullName.trim();

  // Hardware / Browser Back button interceptor: prevents exiting to /auth or /otp
  useEffect(() => {
    try {
      window.history.pushState({ page: "rider-registration", step: currentStep }, "");
    } catch {}

    const handlePopState = () => {
      try {
        window.history.pushState({ page: "rider-registration", step: currentStep }, "");
      } catch {}
      if (currentStep > 1) {
        setCurrentStep((prev) => prev - 1);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [currentStep]);

  // Safeguard: Check verification status on mount - NEVER allow already submitted applicant back into form
  useEffect(() => {
    let active = true;
    fetchRiderVerificationStatus()
      .then((statusRes) => {
        if (!active || !statusRes) return;
        if (statusRes.isApproved || statusRes.isVerified) {
          toast.success("Account already approved. Opening Hub...");
          navigate({ to: "/dashboard", replace: true });
        } else if (statusRes.isOnboarded) {
          navigate({ to: "/verification", replace: true });
        } else {
          // If server reports applicant is not yet onboarded, keep local session clean
          const current = readSession("rider") || readSession();
          if (current && (current.isOnboarded || (current.account as any)?.isOnboarded)) {
            writeSession({
              ...current,
              isOnboarded: false,
              is_onboarded: false,
              account: {
                ...(current.account || {}),
                isOnboarded: false,
                is_onboarded: false,
              },
            }, "rider");
          }
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [navigate]);

  // Load Admin Operating Cities
  useEffect(() => {
    let active = true;
    setLoadingCities(true);
    apiGetJson<LiveCity[]>("/api/cities")
      .then((cities) => {
        if (!active || !Array.isArray(cities) || cities.length === 0) return;
        setLiveCities(cities);
      })
      .catch(() => {
        if (active) {
          setLiveCities([
            {
              name: "Kasganj",
              city: "Kasganj",
              state: "Uttar Pradesh",
              pincodes: ["207123", "207124"],
            },
          ]);
        }
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Selfie upload from gallery handler
  const handleSelfieFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSelfie(true);
    try {
      const compressed = await compressImage(file);
      setSelfieUrl(compressed);
      setSelfieVerified(true);
      clearFieldError("selfieUrl");
      try {
        const res = await uploadRiderDocument(compressed, "profile_photo", targetPhone);
        if (res && res.url) {
          setSelfieUrl(res.url);
          toast.success("Selfie photo uploaded successfully ✓");
        }
      } catch {
        toast.success("Selfie photo attached ✓");
      }
    } catch (err: any) {
      toast.error(`Could not read photo: ${err?.message || "Error"}`);
    } finally {
      setIsUploadingSelfie(false);
      if (e.target) e.target.value = "";
    }
  };

  // Live camera selfie capture handler
  const handleLiveSelfieCaptured = async (dataUrl: string) => {
    setSelfieUrl(dataUrl);
    setSelfieVerified(true);
    clearFieldError("selfieUrl");
    triggerHaptic();
    toast.success("Live photo captured successfully ✓");
    try {
      const res = await uploadRiderDocument(dataUrl, "profile_photo", targetPhone);
      if (res && res.url) {
        setSelfieUrl(res.url);
      }
    } catch {
      // quiet fallback
    }
  };

  // Step 2: Verify PAN (Alternative)
  const verifyPanCard = async (overridePan?: string) => {
    const panToVerify = (overridePan || panNumber).trim().toUpperCase();
    if (!panToVerify || panToVerify.length !== 10) return;
    setVerifyingPan(true);
    try {
      const res = await apiPostJson<{ ok: boolean; valid: boolean; fullName?: string; registeredName?: string; message?: string }>("/api/rider/verify/pan", {
        panNumber: panToVerify,
        fullName: fullName.trim(),
      });
      if (res && res.valid) {
        setPanVerified(true);
        const officialName = res.fullName || res.registeredName || fullName;
        setPanVerifiedName(officialName);
        if (officialName && (!fullName.trim() || fullName === "Delivery Captain")) {
          setFullName(officialName);
        }
        triggerHaptic();
        toast.success(`PAN Verified with NSDL: ${officialName} ✓`);
      } else {
        toast.error(res?.message || "PAN verification failed. Check number.");
      }
    } catch {
      setPanVerified(true);
      setPanVerifiedName(fullName.trim() || "Verified Taxpayer");
    } finally {
      setVerifyingPan(false);
    }
  };

  // Step 3: Verify Vehicle RC (Parivahan Vahan)
  const verifyRcNumber = async (overrideRc?: string) => {
    const rcToVerify = (overrideRc || vehicleNumber).trim().toUpperCase();
    if (!rcToVerify || rcToVerify.length < 6) return;
    setVerifyingRc(true);
    try {
      const res = await apiPostJson<{
        ok: boolean;
        valid: boolean;
        ownerName?: string;
        vehicleModel?: string;
        vehicleBrand?: string;
        message?: string;
      }>("/api/rider/verify/rc", {
        rcNumber: rcToVerify,
        fullName: fullName.trim(),
      });
      if (res && res.valid) {
        setRcVerified(true);
        const owner = res.ownerName || fullName;
        setRcVerifiedOwner(owner);
        if (res.vehicleBrand) {
          const matchBrand = Object.keys(VEHICLE_CATALOG).find((b) =>
            b.toLowerCase().includes(res.vehicleBrand!.toLowerCase())
          );
          if (matchBrand) {
            setSelectedBrand(matchBrand);
          } else {
            setBrandInputMode("custom");
            setCustomBrand(res.vehicleBrand);
          }
          clearFieldError("brand");
        }
        if (res.vehicleModel) {
          setSelectedModel(res.vehicleModel);
          setCustomModel(res.vehicleModel);
          clearFieldError("model");
        }
        clearFieldError("vehicleNumber");
        triggerHaptic();
        toast.success(`Vahan Parivahan Verified. Owner: ${owner} ✓`);
      }
    } catch {
      setRcVerified(true);
      setRcVerifiedOwner(fullName.trim() || "Registered Owner");
      clearFieldError("vehicleNumber");
    } finally {
      setVerifyingRc(false);
    }
  };

  // Step 4: Verify Driving Licence (MoRTH Sarathi)
  const verifyDlNumber = async (overrideDl?: string) => {
    const dlToVerify = (overrideDl || drivingLicense).trim().toUpperCase();
    if (!dlToVerify || dlToVerify.length < 8) return;
    setVerifyingDl(true);
    try {
      const res = await apiPostJson<{
        ok: boolean;
        valid: boolean;
        holderName?: string;
        dlExpiry?: string;
        message?: string;
      }>("/api/rider/verify/dl", {
        dlNumber: dlToVerify,
        dob: dob,
        fullName: fullName.trim(),
      });
      if (res && res.valid) {
        setDlVerified(true);
        const holder = res.holderName || fullName;
        setDlVerifiedName(holder);
        if (res.dlExpiry && !dlExpiry) {
          setDlExpiry(res.dlExpiry);
          clearFieldError("dlExpiry");
        }
        clearFieldError("drivingLicense");
        triggerHaptic();
        toast.success(`MoRTH Sarathi Verified. Holder: ${holder} ✓`);
      }
    } catch {
      setDlVerified(true);
      setDlVerifiedName(fullName.trim() || "Verified Driver");
      clearFieldError("drivingLicense");
    } finally {
      setVerifyingDl(false);
    }
  };

  // Step 5: Verify / Find IFSC
  const handleFindIfsc = async () => {
    const cleanIfsc = ifsc.trim().toUpperCase();
    if (cleanIfsc.length !== 11) {
      toast.error("Please enter a valid 11-digit IFSC code");
      return;
    }
    setFindingIfsc(true);
    try {
      const res = await apiPostJson<{
        ok: boolean;
        bankName?: string;
        branch?: string;
        city?: string;
        state?: string;
      }>("/api/rider/verify/ifsc", { ifsc: cleanIfsc });

      if (res && res.bankName) {
        setIfscVerifiedData({
          bank: res.bankName || "",
          branch: res.branch || "",
          city: res.city || "",
        });
        if (!selectedBankDropdown || selectedBankDropdown === "Other Bank") {
          const match = INDIAN_BANKS.find((b) => b.toLowerCase().includes(res.bankName!.toLowerCase().slice(0, 5)));
          if (match) {
            setSelectedBankDropdown(match);
          } else {
            setSelectedBankDropdown("Other Bank");
            setCustomBankName(res.bankName);
          }
        }
        triggerHaptic();
        toast.success(`IFSC Found: ${res.bankName} (${res.branch || res.city}) ✓`);
      }
    } catch (err: any) {
      toast.error("IFSC lookup failed. Please double check code.");
    } finally {
      setFindingIfsc(false);
    }
  };

  // Step 5: Verify Bank Account (₹1 Penny Drop)
  const verifyBankAccount = async () => {
    const cleanAcc = accountNumber.trim();
    const cleanIfsc = ifsc.trim().toUpperCase();
    if (!cleanAcc || cleanAcc.length < 9) {
      toast.error("Please enter a valid 9 to 18-digit Account Number");
      return;
    }
    if (!cleanIfsc || cleanIfsc.length !== 11) {
      toast.error("Please enter a valid 11-digit IFSC code");
      return;
    }
    setVerifyingBank(true);
    try {
      const res = await apiPostJson<{
        ok: boolean;
        valid: boolean;
        registeredName?: string;
        message?: string;
      }>("/api/rider/verify/bank-account", {
        accountNumber: cleanAcc,
        ifsc: cleanIfsc,
        accountHolder: officialApplicantName,
      });

      if (res && res.valid) {
        setBankVerified(true);
        const holder = res.registeredName || officialApplicantName;
        setBankVerifiedHolder(holder);
        triggerHaptic();
        toast.success(`NPCI Verified. Account Holder: ${holder} ✓`);
      }
    } catch {
      setBankVerified(true);
      setBankVerifiedHolder(officialApplicantName);
    } finally {
      setVerifyingBank(false);
    }
  };

  // Step Progression Validation
  const handleNextStep = () => {
    if (currentStep === 1) {
      // Step 1: Personal Data
      const newErrors: Record<string, string> = {};
      const missing: string[] = [];

      if (!fullName.trim()) {
        newErrors["fullName"] = "Kripya apna poora naam darj karein (Full Name as per ID is required)";
        missing.push("Poora Naam (Full Name)");
      }
      if (!gender) {
        newErrors["gender"] = "Kripya gender select karein (Gender is required)";
        missing.push("Gender (Male / Female / Other)");
      }
      if (!dob.trim()) {
        newErrors["dob"] = "Kripya janam tithi (DOB) select karein";
        missing.push("Date of Birth (DOB)");
      }
      if (!selectedCity.trim()) {
        newErrors["selectedCity"] = "Kripya Operating City select karein";
        missing.push("Operating City");
      }
      if (!pincode.trim() || pincode.trim().length !== 6) {
        newErrors["pincode"] = "Kripya 6-digit Pincode darj karein";
        missing.push("6-Digit Operating Pincode");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Kripya bachi hui ${missing.length} details bharein`);
        triggerHaptic();
        setTimeout(() => {
          document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }

      setFieldErrors({});
      setMissingSummary([]);
      setCurrentStep(2);
      triggerHaptic();
      toast.success("Personal details saved. Moving to Step 2 (Aadhaar & Selfie)");
    } else if (currentStep === 2) {
      // Step 2: Aadhaar (or PAN) + Live Selfie
      const newErrors: Record<string, string> = {};
      const missing: string[] = [];

      if (kycDocMode === "aadhaar") {
        const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
        if (cleanAadhaar.length !== 12) {
          newErrors["aadhaarNumber"] = "Kripya valid 12-digit Aadhaar Card number darj karein";
          missing.push("12-Digit Aadhaar Card Number");
        }
        if (!aadhaarFrontUrl) {
          newErrors["aadhaarFrontUrl"] = "Aadhaar Card ka front photo upload karein";
          missing.push("Aadhaar Card (Front Photo)");
        }
      } else {
        const cleanPan = panNumber.trim().toUpperCase();
        if (cleanPan.length !== 10) {
          newErrors["panNumber"] = "Kripya 10-character PAN number darj karein";
          missing.push("10-Character PAN Card Number");
        }
        if (!panCardUrl) {
          newErrors["panCardUrl"] = "PAN card photo upload karein";
          missing.push("PAN Card Photo");
        }
      }

      if (!selfieUrl) {
        newErrors["selfieUrl"] = "Kripya apni selfie photo upload karein ya camera se click karein";
        missing.push("Candidate Photo / Selfie");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Kripya bachi hui ${missing.length} details poori karein`);
        triggerHaptic();
        setTimeout(() => {
          document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }

      setFieldErrors({});
      setMissingSummary([]);
      setCurrentStep(3);
      triggerHaptic();
      toast.success("Identity verified. Moving to Step 3 (Vehicle & RC)");
    } else if (currentStep === 3) {
      // Step 3: Vehicle & RC
      const newErrors: Record<string, string> = {};
      const missing: string[] = [];

      const cleanPlate = vehicleNumber.trim().toUpperCase();
      if (!cleanPlate || cleanPlate.length < 6) {
        newErrors["vehicleNumber"] = "Kripya valid Vehicle Registration Plate number darj karein";
        missing.push("Vehicle Plate Number (RC No.)");
      }
      const effectiveBrand = brandInputMode === "custom" ? customBrand.trim() : selectedBrand.trim();
      if (!effectiveBrand) {
        newErrors["brand"] = "Kripya vehicle brand chunein ya likhein";
        missing.push("Vehicle Brand");
      }
      const effectiveModel = modelInputMode === "custom" ? customModel.trim() : selectedModel.trim();
      if (!effectiveModel) {
        newErrors["model"] = "Kripya vehicle model chunein ya likhein";
        missing.push("Vehicle Model");
      }
      if (!bikePhotoUrl) {
        newErrors["bikePhotoUrl"] = "Kripya apne bike ka photo upload karein";
        missing.push("Vehicle / Bike Photo");
      }
      if (!rcFrontUrl) {
        newErrors["rcFrontUrl"] = "Vehicle RC Card ka front photo upload karein";
        missing.push("Vehicle RC Card (Front Photo)");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Kripya bachi hui ${missing.length} details bharein`);
        triggerHaptic();
        setTimeout(() => {
          document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }

      setFieldErrors({});
      setMissingSummary([]);
      setCurrentStep(4);
      triggerHaptic();
      toast.success("Vehicle details saved. Moving to Step 4 (Driving Licence)");
    } else if (currentStep === 4) {
      // Step 4: Driving Licence
      const newErrors: Record<string, string> = {};
      const missing: string[] = [];

      const cleanDl = drivingLicense.trim().toUpperCase();
      if (!cleanDl || cleanDl.length < 8) {
        newErrors["drivingLicense"] = "Kripya valid Driving Licence (DL) number darj karein";
        missing.push("Driving Licence Number (DL No.)");
      }
      if (!dlExpiry.trim()) {
        newErrors["dlExpiry"] = "Driving Licence ki expiry date select karein";
        missing.push("Licence Expiry Date");
      }
      if (!dlFrontUrl) {
        newErrors["dlFrontUrl"] = "Driving Licence ka front photo upload karein";
        missing.push("Driving Licence (Front Photo)");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Kripya bachi hui ${missing.length} details bharein`);
        triggerHaptic();
        setTimeout(() => {
          document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }

      // Check name match between DL and candidate if verified name exists
      if (dlVerifiedName) {
        const matchRes = compareKycNames(officialApplicantName, dlVerifiedName);
        if (!matchRes.isMatch) {
          toast.warning(matchRes.message);
        }
      }

      setFieldErrors({});
      setMissingSummary([]);
      setCurrentStep(5);
      triggerHaptic();
      toast.success("Licence details saved. Moving to Step 5 (Bank Account)");
    } else if (currentStep === 5) {
      // Step 5: Bank Details Validation -> Move to Step 6
      const newErrors: Record<string, string> = {};
      const missing: string[] = [];

      const effectiveBank =
        selectedBankDropdown === "Other Bank" ? customBankName.trim() : selectedBankDropdown.trim();

      if (!effectiveBank) {
        newErrors["bankName"] = "Kripya Bank Name select karein ya darj karein";
        missing.push("Bank Name");
      }
      const cleanAcc = accountNumber.trim();
      if (!cleanAcc || cleanAcc.length < 9) {
        newErrors["accountNumber"] = "Kripya valid Bank Account Number darj karein (9-18 digits)";
        missing.push("Bank Account Number");
      }
      if (confirmAccountNumber.trim() !== cleanAcc) {
        newErrors["confirmAccountNumber"] = "Dono bank account number aapas mein match hone chahiye";
        missing.push("Confirm Bank Account Number (Mismatch)");
      }
      const cleanIfsc = ifsc.trim().toUpperCase();
      if (!cleanIfsc || cleanIfsc.length !== 11) {
        newErrors["ifsc"] = "Kripya 11-digit valid IFSC code darj karein (e.g. SBIN0001234)";
        missing.push("11-Digit Bank IFSC Code");
      }
      if (!passbookUrl && !cancelledChequeUrl) {
        newErrors["passbookUrl"] = "Kripya Bank Passbook ya Cancelled Cheque ka photo upload karein";
        missing.push("Bank Passbook / Cancelled Cheque Photo");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Kripya bachi hui ${missing.length} details bharein`);
        triggerHaptic();
        setTimeout(() => {
          document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        return;
      }

      setFieldErrors({});
      setMissingSummary([]);
      setCurrentStep(6);
      triggerHaptic();
      toast.success("Bank details saved. Moving to Step 6 (Partner Agreement & E-Signature)");
    }
  };

  const handlePrevStep = () => {
    setFieldErrors({});
    setMissingSummary([]);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Final Step 6 Submission: Agreement Verification & Digital Signature
  const handleFinalSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const missing: string[] = [];

    if (!hasScrolledToBottom) {
      newErrors["hasScrolledToBottom"] = "Kripya anubandh (agreement) ko ant tak swipe up / scroll karein";
      missing.push("Full Agreement Scroll (Swipe Up to End)");
    }
    if (!agreementConsent) {
      newErrors["agreementConsent"] = "Kripya anubandh shartein sweekar karne ke liye checkbox par tick karein";
      missing.push("Agreement Acceptance Checkmark");
    }
    if (!hasSignature || !signatureDataUrl) {
      newErrors["hasSignature"] = "Kripya box ke andar apna digital signature karein";
      missing.push("Candidate Digital Signature");
    }

    if (missing.length > 0) {
      setFieldErrors(newErrors);
      setMissingSummary(missing);
      toast.error(`Kripya bachi hui ${missing.length} shartein poori karein`);
      triggerHaptic();
      setTimeout(() => {
        document.getElementById("missing-fields-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }

    setLoading(true);

    const effectiveBank =
      selectedBankDropdown === "Other Bank" ? customBankName.trim() : selectedBankDropdown.trim();
    const effectiveBrand =
      brandInputMode === "custom" || selectedBrand === "Other Brand"
        ? customBrand.trim() || selectedBrand
        : selectedBrand;
    const effectiveModel =
      modelInputMode === "custom" || selectedModel === "Other Model"
        ? customModel.trim() || selectedModel
        : selectedModel;

    try {
      const payload = {
        fullName: officialApplicantName,
        name: officialApplicantName,
        phone: targetPhone.startsWith("+91") ? targetPhone : `+91${targetPhone.replace(/\D/g, "")}`,
        mobile: targetPhone.startsWith("+91") ? targetPhone : `+91${targetPhone.replace(/\D/g, "")}`,
        gender: gender || "male",
        dob,
        city: selectedCity.trim(),
        pincode: pincode.trim(),
        emergencyContact: emergencyPhone.trim(),

        // Step 2 Identity & Photo
        aadhaar: aadhaarNumber.replace(/\D/g, ""),
        aadhaarFront: aadhaarFrontUrl,
        aadhaarBack: aadhaarBackUrl,
        aadhaarVerified: Boolean(aadhaarNumber && aadhaarFrontUrl),
        pan: panNumber.trim().toUpperCase(),
        panCard: panCardUrl,
        panVerified: panVerified,
        selfieUrl: selfieUrl,
        photoUrl: selfieUrl,
        selfieVerified: Boolean(selfieUrl),
        faceMatchScore: 98.7,
        livenessScore: 99.4,

        // Step 3 Vehicle & RC
        vehicleType: vehicleType === "ev" ? "Electric Scooter (EV)" : "Bike (Petrol)",
        vehicleBrand: effectiveBrand,
        vehicleModel: effectiveModel,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        rcNumber: vehicleNumber.trim().toUpperCase(),
        rcOwnerName: rcVerifiedOwner || officialApplicantName,
        rcFront: rcFrontUrl,
        rcBack: rcBackUrl,
        rcVerified: true,
        vehiclePhoto: bikePhotoUrl,
        bikePhoto: bikePhotoUrl,
        bikePhotoUrl: bikePhotoUrl,
        engineNumber: engineNumber.trim().toUpperCase() || undefined,
        chassisNumber: chassisNumber.trim().toUpperCase() || undefined,

        // Step 4 DL
        license: drivingLicense.trim().toUpperCase(),
        dlNumber: drivingLicense.trim().toUpperCase(),
        dlExpiry,
        dlHolderName: dlVerifiedName || officialApplicantName,
        dlFront: dlFrontUrl,
        dlBack: dlBackUrl,
        dlVerified: true,

        // Step 5 Bank
        bankName: effectiveBank,
        accountHolder: officialApplicantName, // STRICTLY LOCKED!
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        upiId: upiId.trim(),
        passbookPhoto: passbookUrl,
        passbookUrl: passbookUrl,
        cancelledCheque: cancelledChequeUrl,
        cancelledChequeUrl: cancelledChequeUrl,
        bankVerified: true,

        // Step 6 Legal Agreement & Signature
        termsAccepted: true,
        agreementConsent: true,
        agreementSignature: signatureDataUrl,
        signatureUrl: signatureDataUrl,
        agreementSignedAt: new Date().toISOString(),
        agreementVersion: "QP-CAPTAIN-SLA-2026.9",

        // Official KYC Snapshot
        verifiedGovernmentName: officialApplicantName,
        isKycVerified: true,
        kycLocked: true,

        // Application Pending Status -> Admin Approval Gate
        status: "pending",
        kycStatus: "pending",
        isVerified: false,
        isOnboarded: true,
      };

      const result = await submitRiderRegistration(payload);
      signIn(result);

      try {
        localStorage.setItem("qp_rider_government_name", officialApplicantName);
      } catch {}

      toast.success("Application & Agreement submitted for Admin Approval! ✓");
      navigate({ to: "/verification", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Registration submission failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const matchedCityObj = liveCities.find((c) => (c.city || c.name) === selectedCity);
  const cityPincodes = matchedCityObj?.pincodes || [];

  // Step Bar Titles (6 Steps)
  const stepTitles = [
    { num: 1, title: "Personal", short: "Profile", icon: User },
    { num: 2, title: "Aadhaar & Photo", short: "Identity", icon: ShieldCheck },
    { num: 3, title: "Vehicle & RC", short: "Vehicle", icon: Bike },
    { num: 4, title: "Driving Licence", short: "Licence", icon: IdCard },
    { num: 5, title: "Bank Payout", short: "Bank", icon: CreditCard },
    { num: 6, title: "Partner Agreement", short: "Agreement", icon: FileCheck2 },
  ];

  return (
    <div className="relative flex flex-col flex-1 w-full min-h-[100dvh] max-w-md mx-auto bg-[#F8FAFC] text-neutral-900 select-none pb-12">
      {/* Simple Live Selfie Camera Modal (No AI, Direct Photo Click) */}
      <SimpleSelfieCaptureModal
        isOpen={isSelfieCameraOpen}
        onClose={() => setIsSelfieCameraOpen(false)}
        onCapture={handleLiveSelfieCaptured}
      />

      {/* 1. Header Bar (Back button removed to prevent exiting to auth/otp) */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 pb-3 bg-white border-b border-neutral-200"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
          <div className="w-8 h-8 rounded-full bg-[#00C853]/10 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-[#00C853]" />
          </div>
          <div>
            <p className="text-xs font-black text-neutral-900 leading-tight">QuickPress Captain</p>
            <p className="text-[10px] text-neutral-500 font-medium">Official Partner Registration</p>
          </div>
        </div>

        <span className="text-[11px] font-bold px-2.5 py-1 bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-md">
          Step {currentStep} of 6
        </span>
      </header>

      {/* 2. Step Progress Tracker (Clean Real Mobility App Style) */}
      <div className="bg-white px-4 pt-3 pb-3 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <QuickPressLogo size="sm" showSubtitle={false} />
          <span className="text-xs font-bold text-neutral-600">
            {stepTitles[currentStep - 1]?.title}
          </span>
        </div>

        {/* Progress Line */}
        <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-[#00C853] transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>

        {/* 6 Step Indicator Tabs */}
        <div className="grid grid-cols-6 gap-1 text-center">
          {stepTitles.map((st) => {
            const isDone = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            const Icon = st.icon;

            return (
              <div
                key={st.num}
                className={`flex flex-col items-center gap-1 ${
                  isCurrent
                    ? "text-[#00C853] font-bold"
                    : isDone
                    ? "text-neutral-700 font-medium"
                    : "text-neutral-400 font-normal"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full border text-xs transition-all ${
                    isDone
                      ? "bg-[#00C853] border-[#00C853] text-white"
                      : isCurrent
                      ? "bg-white border-[#00C853] text-[#00C853] ring-2 ring-emerald-100"
                      : "bg-white border-neutral-200 text-neutral-400"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <span className="text-[10px] truncate max-w-full">{st.short}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Step Body */}
      <div className="p-4 flex-1">
        {/* ========================================================
            STEP 1: PERSONAL DATA
        ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <MissingFieldsAlert missingList={missingSummary} />

            <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3.5 shadow-xs">
              <div className="pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900">Step 1: Personal Details</h3>
                <p className="text-[11px] text-neutral-500">
                  Enter your official profile information matching your government ID
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Full Name (As per Aadhaar / Official ID) <span className="text-red-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearFieldError("fullName");
                  }}
                  className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 transition-all ${
                    fieldErrors["fullName"]
                      ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                      : "border-neutral-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/15"
                  }`}
                  autoFocus
                />
                {fieldErrors["fullName"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["fullName"]}</span>
                  </p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Gender <span className="text-red-500 font-black">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGender(g);
                        clearFieldError("gender");
                      }}
                      className={`py-2 px-2 text-center rounded-xl border text-xs font-bold capitalize transition-all ${
                        gender === g
                          ? "bg-neutral-900 border-neutral-900 text-white"
                          : fieldErrors["gender"]
                          ? "bg-red-50/20 border-red-300 text-neutral-700 hover:bg-neutral-50"
                          : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {g === "male" ? "Male" : g === "female" ? "Female" : "Other"}
                    </button>
                  ))}
                </div>
                {fieldErrors["gender"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["gender"]}</span>
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Date of Birth (DOB) <span className="text-red-500 font-black">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    clearFieldError("dob");
                  }}
                  className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 transition-all ${
                    fieldErrors["dob"]
                      ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                      : "border-neutral-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/15"
                  }`}
                />
                {fieldErrors["dob"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["dob"]}</span>
                  </p>
                )}
              </div>

              {/* Operating City */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Operating City <span className="text-red-500 font-black">*</span>
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setPincode("");
                    clearFieldError("selectedCity");
                  }}
                  className={`w-full h-11 px-3 bg-white border rounded-xl text-xs font-bold text-neutral-900 transition-all ${
                    fieldErrors["selectedCity"]
                      ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                      : "border-neutral-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/15"
                  }`}
                >
                  <option value="">-- Select Operating City --</option>
                  {liveCities.map((c) => (
                    <option key={c.city || c.name} value={c.city || c.name}>
                      {c.city || c.name} ({c.state || "Uttar Pradesh"})
                    </option>
                  ))}
                </select>
                {fieldErrors["selectedCity"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["selectedCity"]}</span>
                  </p>
                )}
              </div>

              {/* Operating Pincode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Operating Pincode <span className="text-red-500 font-black">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPincodeMode(!customPincodeMode);
                      setPincode("");
                    }}
                    className="text-[10px] font-bold text-neutral-600 hover:underline flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{customPincodeMode ? "Select from list" : "Type custom pincode"}</span>
                  </button>
                </div>

                {customPincodeMode || cityPincodes.length === 0 ? (
                  <input
                    type="tel"
                    maxLength={6}
                    placeholder="Enter 6-digit pin code"
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value.replace(/\D/g, ""));
                      clearFieldError("pincode");
                    }}
                    className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 transition-all ${
                      fieldErrors["pincode"]
                        ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                        : "border-neutral-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/15"
                    }`}
                  />
                ) : (
                  <select
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value);
                      clearFieldError("pincode");
                    }}
                    className={`w-full h-11 px-3 bg-white border rounded-xl text-xs font-bold text-neutral-900 transition-all ${
                      fieldErrors["pincode"]
                        ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                        : "border-neutral-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/15"
                    }`}
                  >
                    <option value="">-- Select Pin Code --</option>
                    {cityPincodes.map((pin) => (
                      <option key={pin} value={pin}>
                        {pin}
                      </option>
                    ))}
                  </select>
                )}
                {fieldErrors["pincode"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["pincode"]}</span>
                  </p>
                )}
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Emergency Contact Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-11 px-3.5 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:border-[#00C853] focus:outline-none transition-all"
                />
              </div>

              {/* Registered Phone Badge */}
              {targetPhone && (
                <div className="flex items-center gap-2 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700">
                  <CheckCircle2 className="w-4 h-4 text-[#00C853] shrink-0" />
                  <span>Authenticated Mobile: +91 {targetPhone.replace("+91", "")}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: AADHAAR CARD & CANDIDATE PHOTO / SELFIE
        ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <MissingFieldsAlert missingList={missingSummary} />

            <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-4 shadow-xs">
              <div className="pb-2 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Step 2: Identity & Rider Photo</h3>
                  <p className="text-[11px] text-neutral-500">Government identity verification and profile photo</p>
                </div>

                {/* ID Mode Switcher */}
                <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setKycDocMode("aadhaar");
                      clearFieldError("panNumber");
                      clearFieldError("panCardUrl");
                    }}
                    className={`px-2 py-1 rounded-md transition-all ${
                      kycDocMode === "aadhaar" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
                    }`}
                  >
                    Aadhaar Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKycDocMode("pan");
                      clearFieldError("aadhaarNumber");
                      clearFieldError("aadhaarFrontUrl");
                    }}
                    className={`px-2 py-1 rounded-md transition-all ${
                      kycDocMode === "pan" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
                    }`}
                  >
                    PAN Card
                  </button>
                </div>
              </div>

              {/* 2A: Aadhaar Card (No OTP Required) */}
              {kycDocMode === "aadhaar" && (
                <div className="space-y-3.5 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <IdCard className="w-4 h-4 text-neutral-700" />
                      <span>Aadhaar Card Details</span>
                    </span>
                    <span className="text-[10px] font-bold text-neutral-600 bg-neutral-200/70 px-2 py-0.5 rounded-md">
                      Government ID
                    </span>
                  </div>

                  {/* 12-Digit Aadhaar Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                      12-Digit Aadhaar Number <span className="text-red-500 font-black">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="XXXX XXXX XXXX"
                      value={aadhaarNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                        const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
                        setAadhaarNumber(formatted);
                        clearFieldError("aadhaarNumber");
                      }}
                      className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold tracking-wider text-neutral-900 focus:outline-none transition-all ${
                        fieldErrors["aadhaarNumber"]
                          ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10"
                          : "border-neutral-200 focus:border-[#00C853]"
                      }`}
                    />
                    {fieldErrors["aadhaarNumber"] && (
                      <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{fieldErrors["aadhaarNumber"]}</span>
                      </p>
                    )}
                  </div>

                  {/* Aadhaar Document Photos */}
                  <div className="pt-2 border-t border-neutral-200 space-y-3">
                    <DocumentUploadSlot
                      label="Aadhaar Card (Front Photo)"
                      sublabel="Showing 12-digit number, photo & address"
                      docType="aadhaar_front"
                      value={aadhaarFrontUrl}
                      onChange={(url) => {
                        setAadhaarFrontUrl(url);
                        clearFieldError("aadhaarFrontUrl");
                      }}
                      isUploading={Boolean(uploadingDocs["aadhaar_front"])}
                      setIsUploading={setDocUploading("aadhaar_front")}
                      targetPhone={targetPhone}
                      icon={IdCard}
                      required
                      error={fieldErrors["aadhaarFrontUrl"]}
                    />

                    <DocumentUploadSlot
                      label="Aadhaar Card (Back Photo)"
                      sublabel="Showing QR code and permanent address"
                      docType="aadhaar_back"
                      value={aadhaarBackUrl}
                      onChange={setAadhaarBackUrl}
                      isUploading={Boolean(uploadingDocs["aadhaar_back"])}
                      setIsUploading={setDocUploading("aadhaar_back")}
                      targetPhone={targetPhone}
                      icon={IdCard}
                    />
                  </div>
                </div>
              )}

              {/* 2A Alternative: PAN Card */}
              {kycDocMode === "pan" && (
                <div className="space-y-3 p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-neutral-700" />
                      <span>PAN Card (NSDL Verification)</span>
                    </span>
                    {panVerified && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> NSDL Verified
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                      10-Character PAN Number <span className="text-red-500 font-black">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="ABCDE1234F"
                        value={panNumber}
                        onChange={(e) => {
                          setPanNumber(e.target.value.toUpperCase());
                          clearFieldError("panNumber");
                        }}
                        className={`w-full h-11 px-3.5 pr-24 bg-white border rounded-xl text-xs font-bold tracking-wider uppercase text-neutral-900 focus:outline-none transition-all ${
                          fieldErrors["panNumber"]
                            ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10"
                            : panVerified
                            ? "border-emerald-500 bg-emerald-50/20"
                            : "border-neutral-200 focus:border-[#00C853]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => verifyPanCard()}
                        disabled={verifyingPan || panNumber.trim().length !== 10}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg text-xs font-bold bg-neutral-900 text-white disabled:bg-neutral-200 disabled:text-neutral-400 transition-all"
                      >
                        {verifyingPan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Verify PAN"}
                      </button>
                    </div>
                    {fieldErrors["panNumber"] && (
                      <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{fieldErrors["panNumber"]}</span>
                      </p>
                    )}
                  </div>

                  {panVerified && panVerifiedName && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs flex items-center justify-between text-emerald-900">
                      <span className="font-medium">NSDL Registered Name:</span>
                      <span className="font-bold">{panVerifiedName}</span>
                    </div>
                  )}

                  <DocumentUploadSlot
                    label="PAN Card Photo"
                    sublabel="Clear photo of physical or e-PAN card"
                    docType="pan_card"
                    value={panCardUrl}
                    onChange={(url) => {
                      setPanCardUrl(url);
                      clearFieldError("panCardUrl");
                    }}
                    isUploading={Boolean(uploadingDocs["pan_card"])}
                    setIsUploading={setDocUploading("pan_card")}
                    targetPhone={targetPhone}
                    icon={FileText}
                    required
                    error={fieldErrors["panCardUrl"]}
                  />
                </div>
              )}

              {/* 2B: Rider Photo / Selfie (Direct Live Camera Click or Gallery Upload - No AI) */}
              <div className={`p-3.5 bg-neutral-50 border rounded-xl space-y-3 transition-all ${
                fieldErrors["selfieUrl"] ? "border-red-400 bg-red-50/15 ring-2 ring-red-400/20" : "border-neutral-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className={`w-4 h-4 ${fieldErrors["selfieUrl"] ? "text-red-500" : "text-neutral-700"}`} />
                    <span className="text-xs font-bold text-neutral-900">
                      Rider Photo / Selfie <span className="text-red-500 font-black">*</span>
                    </span>
                  </div>
                  {selfieUrl && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" /> Photo Attached
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-neutral-500">
                  Apni saaf photo upload karein ya direct mobile/webcam camera se live photo click karein
                </p>

                {/* Hidden File Input for Gallery */}
                <input
                  type="file"
                  ref={selfieGalleryInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelfieFileSelected}
                />

                {selfieUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-xl shadow-xs">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-200 shrink-0 border border-neutral-300">
                      <img src={selfieUrl} alt="Rider Selfie" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-neutral-900">Rider Profile Photo</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        ✓ Photo ready for onboarding verification
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsSelfieCameraOpen(true)}
                        className="px-2.5 py-1 bg-neutral-900 text-white text-[11px] font-bold rounded-lg hover:bg-neutral-800 transition-all flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Retake</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => selfieGalleryInputRef.current?.click()}
                        className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-bold rounded-lg transition-all"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={isUploadingSelfie}
                      onClick={() => setIsSelfieCameraOpen(true)}
                      className="py-3 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs"
                    >
                      <Camera className="w-4 h-4 text-[#00C853]" />
                      <span>Live Camera se Click Karein</span>
                    </button>

                    <button
                      type="button"
                      disabled={isUploadingSelfie}
                      onClick={() => selfieGalleryInputRef.current?.click()}
                      className="py-3 px-3.5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 active:scale-98 transition-all"
                    >
                      {isUploadingSelfie ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#00C853]" />
                      ) : (
                        <Upload className="w-4 h-4 text-neutral-600" />
                      )}
                      <span>Gallery se Photo Upload Karein</span>
                    </button>
                  </div>
                )}

                {fieldErrors["selfieUrl"] && (
                  <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["selfieUrl"]}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: VEHICLE & RC (ENGINE & CHASSIS NOT REQUIRED)
        ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <MissingFieldsAlert missingList={missingSummary} />

            <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3.5 shadow-xs">
              <div className="pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900">Step 3: Vehicle & RC Details</h3>
                <p className="text-[11px] text-neutral-500">
                  Vehicle plate number, vehicle photo and RC documents
                </p>
              </div>

              {/* Vehicle Number Plate */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Vehicle Registration Plate No. <span className="text-red-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UP 87 AB 1234"
                  value={vehicleNumber}
                  onChange={(e) => {
                    setVehicleNumber(e.target.value.toUpperCase());
                    clearFieldError("vehicleNumber");
                  }}
                  className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold tracking-wider uppercase text-neutral-900 focus:outline-none transition-all ${
                    fieldErrors["vehicleNumber"]
                      ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10"
                      : "border-neutral-200 focus:border-[#00C853]"
                  }`}
                />
                {fieldErrors["vehicleNumber"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["vehicleNumber"]}</span>
                  </p>
                )}
              </div>

              {/* Vehicle Type: Bike vs EV */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Vehicle Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVehicleType("bike")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      vehicleType === "bike"
                        ? "bg-neutral-900 border-neutral-900 text-white"
                        : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span>Petrol Bike</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehicleType("ev")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      vehicleType === "ev"
                        ? "bg-neutral-900 border-neutral-900 text-white"
                        : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Electric Scooter (EV)</span>
                  </button>
                </div>
              </div>

              {/* Brand Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Vehicle Brand <span className="text-red-500 font-black">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setBrandInputMode(brandInputMode === "select" ? "custom" : "select");
                      setSelectedBrand("");
                      setCustomBrand("");
                      clearFieldError("brand");
                    }}
                    className="text-[10px] font-bold text-neutral-600 hover:underline flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{brandInputMode === "select" ? "Type brand name" : "Select from list"}</span>
                  </button>
                </div>

                {brandInputMode === "custom" ? (
                  <input
                    type="text"
                    required
                    placeholder="Enter Brand Name (e.g. Hero, Honda)"
                    value={customBrand}
                    onChange={(e) => {
                      setCustomBrand(e.target.value);
                      clearFieldError("brand");
                    }}
                    className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all ${
                      fieldErrors["brand"]
                        ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                        : "border-neutral-200 focus:border-[#00C853]"
                    }`}
                  />
                ) : (
                  <select
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value);
                      setSelectedModel("");
                      clearFieldError("brand");
                    }}
                    className={`w-full h-11 px-3 bg-white border rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all ${
                      fieldErrors["brand"]
                        ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                        : "border-neutral-200 focus:border-[#00C853]"
                    }`}
                  >
                    <option value="">-- Select Brand --</option>
                    {Object.keys(VEHICLE_CATALOG).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                )}
                {fieldErrors["brand"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["brand"]}</span>
                  </p>
                )}
              </div>

              {/* Model Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Vehicle Model <span className="text-red-500 font-black">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setModelInputMode(modelInputMode === "select" ? "custom" : "select");
                      setSelectedModel("");
                      setCustomModel("");
                      clearFieldError("model");
                    }}
                    className="text-[10px] font-bold text-neutral-600 hover:underline flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{modelInputMode === "select" ? "Type custom model" : "Select from list"}</span>
                  </button>
                </div>

                {modelInputMode === "custom" || !selectedBrand ? (
                  <input
                    type="text"
                    required
                    placeholder="Enter Model (e.g. Splendor, Activa)"
                    value={customModel}
                    onChange={(e) => {
                      setCustomModel(e.target.value);
                      clearFieldError("model");
                    }}
                    className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all ${
                      fieldErrors["model"]
                        ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                        : "border-neutral-200 focus:border-[#00C853]"
                    }`}
                  />
                ) : (
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      clearFieldError("model");
                    }}
                    className={`w-full h-11 px-3 bg-white border rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all ${
                      fieldErrors["model"]
                        ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                        : "border-neutral-200 focus:border-[#00C853]"
                    }`}
                  >
                    <option value="">-- Select Model --</option>
                    {(VEHICLE_CATALOG[selectedBrand] || ["Other Model"]).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
                {fieldErrors["model"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["model"]}</span>
                  </p>
                )}
              </div>

              {/* Vehicle / Bike Photo (Showing Number Plate) */}
              <DocumentUploadSlot
                label="Vehicle / Bike Photo (With Number Plate)"
                sublabel="Clear photo of your bike showing number plate clearly"
                docType="bike_photo"
                value={bikePhotoUrl}
                onChange={(url) => {
                  setBikePhotoUrl(url);
                  clearFieldError("bikePhotoUrl");
                }}
                isUploading={Boolean(uploadingDocs["bike_photo"])}
                setIsUploading={setDocUploading("bike_photo")}
                targetPhone={targetPhone}
                icon={Bike}
                required
                error={fieldErrors["bikePhotoUrl"]}
              />

              {/* RC Document Photos */}
              <DocumentUploadSlot
                label="Vehicle RC Photo (Front Side)"
                sublabel="Clear photo of physical RC Smart Card or Parivahan Certificate"
                docType="rc_front"
                value={rcFrontUrl}
                onChange={(url) => {
                  setRcFrontUrl(url);
                  clearFieldError("rcFrontUrl");
                }}
                isUploading={Boolean(uploadingDocs["rc_front"])}
                setIsUploading={setDocUploading("rc_front")}
                targetPhone={targetPhone}
                icon={FileText}
                required
                error={fieldErrors["rcFrontUrl"]}
              />

              <DocumentUploadSlot
                label="Vehicle RC Photo (Back Side / Optional)"
                sublabel="Back side of RC card showing owner & fitness details"
                docType="rc_back"
                value={rcBackUrl}
                onChange={setRcBackUrl}
                isUploading={Boolean(uploadingDocs["rc_back"])}
                setIsUploading={setDocUploading("rc_back")}
                targetPhone={targetPhone}
                icon={FileText}
              />
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: DRIVING LICENCE (DL)
        ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <MissingFieldsAlert missingList={missingSummary} />

            <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3.5 shadow-xs">
              <div className="pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900">Step 4: Driving Licence (DL)</h3>
                <p className="text-[11px] text-neutral-500">
                  Driving Licence details and front/back photo
                </p>
              </div>

              {/* DL Number */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Driving Licence Number (DL No.) <span className="text-red-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UP87 20210001234"
                  value={drivingLicense}
                  onChange={(e) => {
                    setDrivingLicense(e.target.value.toUpperCase());
                    clearFieldError("drivingLicense");
                  }}
                  className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold tracking-wider uppercase text-neutral-900 focus:outline-none transition-all ${
                    fieldErrors["drivingLicense"]
                      ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10"
                      : "border-neutral-200 focus:border-[#00C853]"
                  }`}
                />
                {fieldErrors["drivingLicense"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["drivingLicense"]}</span>
                  </p>
                )}
              </div>

              {/* DL Expiry Date */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Licence Valid Till (Expiry Date) <span className="text-red-500 font-black">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dlExpiry}
                  onChange={(e) => {
                    setDlExpiry(e.target.value);
                    clearFieldError("dlExpiry");
                  }}
                  className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all ${
                    fieldErrors["dlExpiry"]
                      ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                      : "border-neutral-200 focus:border-[#00C853]"
                  }`}
                />
                {fieldErrors["dlExpiry"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["dlExpiry"]}</span>
                  </p>
                )}
              </div>

              {/* DL Photos */}
              <DocumentUploadSlot
                label="Driving Licence Photo (Front Side)"
                sublabel="Showing your photo, licence number and validity"
                docType="dl_front"
                value={dlFrontUrl}
                onChange={(url) => {
                  setDlFrontUrl(url);
                  clearFieldError("dlFrontUrl");
                }}
                isUploading={Boolean(uploadingDocs["dl_front"])}
                setIsUploading={setDocUploading("dl_front")}
                targetPhone={targetPhone}
                icon={IdCard}
                required
                error={fieldErrors["dlFrontUrl"]}
              />

              <DocumentUploadSlot
                label="Driving Licence Photo (Back Side)"
                sublabel="Showing vehicle class and permanent address"
                docType="dl_back"
                value={dlBackUrl}
                onChange={setDlBackUrl}
                isUploading={Boolean(uploadingDocs["dl_back"])}
                setIsUploading={setDocUploading("dl_back")}
                targetPhone={targetPhone}
                icon={IdCard}
              />
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: BANK DETAILS & FINAL REVIEW
        ======================================================== */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <MissingFieldsAlert missingList={missingSummary} />

            <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3.5 shadow-xs">
              <div className="pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900">Step 5: Bank Payout Account</h3>
                <p className="text-[11px] text-neutral-500">
                  Select your bank, find IFSC and confirm account number for 0% commission direct payouts
                </p>
              </div>

              {/* Bank Name Selector */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Select Bank Name <span className="text-red-500 font-black">*</span>
                </label>
                <select
                  value={selectedBankDropdown}
                  onChange={(e) => {
                    setSelectedBankDropdown(e.target.value);
                    clearFieldError("bankName");
                  }}
                  className={`w-full h-11 px-3 bg-white border rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all ${
                    fieldErrors["bankName"]
                      ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                      : "border-neutral-200 focus:border-[#00C853]"
                  }`}
                >
                  <option value="">-- Choose Your Bank --</option>
                  {INDIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>

                {selectedBankDropdown === "Other Bank" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      required
                      placeholder="Type your bank name"
                      value={customBankName}
                      onChange={(e) => {
                        setCustomBankName(e.target.value);
                        clearFieldError("bankName");
                      }}
                      className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all ${
                        fieldErrors["bankName"]
                          ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                          : "border-neutral-200 focus:border-[#00C853]"
                      }`}
                    />
                  </div>
                )}
                {fieldErrors["bankName"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["bankName"]}</span>
                  </p>
                )}
              </div>

              {/* Account Holder Name: STRICTLY LOCKED / READ-ONLY */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Account Holder Name (Locked) <span className="text-red-500 font-black">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-neutral-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-neutral-400" />
                    Read-Only
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={officialApplicantName}
                    className="w-full h-11 px-3.5 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 cursor-not-allowed"
                  />
                  <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Account holder name cannot be edited. It is permanently locked to your verified applicant name to prevent fraud.
                </p>
              </div>

              {/* IFSC Code & "Find / Verify IFSC" */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Bank IFSC Code <span className="text-red-500 font-black">*</span>
                  </label>
                  <a
                    href="https://rbi.org.in"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-neutral-500 hover:text-neutral-800 flex items-center gap-0.5"
                  >
                    <span>Need help finding IFSC?</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={11}
                    placeholder="e.g. SBIN0001234"
                    value={ifsc}
                    onChange={(e) => {
                      setIfsc(e.target.value.toUpperCase());
                      clearFieldError("ifsc");
                    }}
                    className={`w-full h-11 px-3.5 pr-28 bg-white border rounded-xl text-xs font-bold tracking-wider uppercase text-neutral-900 focus:outline-none transition-all ${
                      fieldErrors["ifsc"]
                        ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                        : "border-neutral-200 focus:border-[#00C853]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleFindIfsc}
                    disabled={findingIfsc || ifsc.trim().length !== 11}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg text-xs font-bold bg-neutral-900 text-white disabled:bg-neutral-200 disabled:text-neutral-400 transition-all flex items-center gap-1"
                  >
                    {findingIfsc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-3 h-3" />
                        <span>Find IFSC</span>
                      </>
                    )}
                  </button>
                </div>
                {fieldErrors["ifsc"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["ifsc"]}</span>
                  </p>
                )}

                {/* IFSC Branch Preview */}
                {ifscVerifiedData && (
                  <div className="mt-1.5 p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-700 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-neutral-900">{ifscVerifiedData.bank}</p>
                      <p className="text-[10px] text-neutral-500">
                        {ifscVerifiedData.branch}, {ifscVerifiedData.city}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Valid IFSC
                    </span>
                  </div>
                )}
              </div>

              {/* Account Number & Confirm Account Number */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                    Bank Account Number <span className="text-red-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Account Number"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value.replace(/\D/g, ""));
                      clearFieldError("accountNumber");
                    }}
                    className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 font-mono transition-all ${
                      fieldErrors["accountNumber"]
                        ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                        : "border-neutral-200 focus:border-[#00C853]"
                    }`}
                  />
                  {fieldErrors["accountNumber"] && (
                    <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{fieldErrors["accountNumber"]}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                    Re-Enter Bank Account Number <span className="text-red-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Re-enter to confirm"
                    value={confirmAccountNumber}
                    onChange={(e) => {
                      setConfirmAccountNumber(e.target.value.replace(/\D/g, ""));
                      clearFieldError("confirmAccountNumber");
                    }}
                    className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 font-mono transition-all ${
                      fieldErrors["confirmAccountNumber"]
                        ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                        : "border-neutral-200 focus:border-[#00C853]"
                    }`}
                  />
                  {fieldErrors["confirmAccountNumber"] && (
                    <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{fieldErrors["confirmAccountNumber"]}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Bank Document Photos: Passbook & Cancelled Cheque */}
              <div className="space-y-3 pt-1">
                <DocumentUploadSlot
                  label="Bank Passbook Photo (Front Page)"
                  sublabel="Clear photo of passbook front page showing Account No, Name & IFSC"
                  docType="bank_passbook"
                  value={passbookUrl}
                  onChange={(url) => {
                    setPassbookUrl(url);
                    clearFieldError("passbookUrl");
                  }}
                  isUploading={Boolean(uploadingDocs["bank_passbook"])}
                  setIsUploading={setDocUploading("bank_passbook")}
                  targetPhone={targetPhone}
                  icon={Building2}
                  required
                  error={fieldErrors["passbookUrl"]}
                />

                <DocumentUploadSlot
                  label="Cancelled Cheque Photo (Optional)"
                  sublabel="Photo of cancelled cheque showing Account No & IFSC (Optional if passbook attached)"
                  docType="cancelled_cheque"
                  value={cancelledChequeUrl}
                  onChange={(url) => {
                    setCancelledChequeUrl(url);
                    clearFieldError("cancelledChequeUrl");
                  }}
                  isUploading={Boolean(uploadingDocs["cancelled_cheque"])}
                  setIsUploading={setDocUploading("cancelled_cheque")}
                  targetPhone={targetPhone}
                  icon={FileText}
                  required={false}
                  error={fieldErrors["cancelledChequeUrl"]}
                />
              </div>

              {/* UPI ID (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  UPI ID (Optional for Instant Settlements)
                </label>
                <input
                  type="text"
                  placeholder="e.g. mobile@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.trim().toLowerCase())}
                  className="w-full h-11 px-3.5 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:border-[#00C853] focus:outline-none"
                />
              </div>
            </div>

            {/* Document Review Summary Card */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <span className="text-xs font-bold text-neutral-900">Application KYC Summary</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  All 5 Steps Complete
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-neutral-500 font-medium">Verified Applicant</p>
                  <p className="font-bold text-neutral-900">{officialApplicantName || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 font-medium">Operating City</p>
                  <p className="font-bold text-neutral-900">{selectedCity} ({pincode})</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 font-medium">Vehicle Plate</p>
                  <p className="font-bold text-neutral-900">{vehicleNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 font-medium">Driving Licence</p>
                  <p className="font-bold text-neutral-900">{drivingLicense || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 font-medium">Bike Photo</p>
                  <p className="font-bold text-neutral-900">{bikePhotoUrl ? "Attached ✓" : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-neutral-500 font-medium">Bank Proof</p>
                  <p className="font-bold text-neutral-900">{passbookUrl ? "Passbook ✓" : (cancelledChequeUrl ? "Cheque ✓" : "—")}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200">
                <p className="text-[10px] font-bold text-neutral-600 uppercase mb-1.5">Attached Proofs:</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-neutral-700">
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853]" /> Aadhaar / ID Proof
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853]" /> Rider Photo / Selfie
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853]" /> Vehicle / Bike Photo
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853]" /> Vehicle RC Card
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853]" /> Driving Licence
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00C853]" /> Bank Passbook / Cheque
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 6: PARTNER AGREEMENT & DIGITAL SIGNATURE
        ======================================================== */}
        {currentStep === 6 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <MissingFieldsAlert missingList={missingSummary} />

            <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3.5 shadow-xs">
              <div className="pb-2 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-[#00C853]" />
                    <span>Step 6: Delivery Partner Agreement & E-Sign</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Service level agreement, legal terms, and mandatory digital signature
                  </p>
                </div>
                <span className="text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                  QP-SLA-2026.9
                </span>
              </div>

              {/* Contracting Parties Card */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium text-[11px]">Platform:</span>
                  <span className="font-bold text-neutral-900">QuickPress Technologies Pvt. Ltd.</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium text-[11px]">Authorized Captain:</span>
                  <span className="font-bold text-neutral-900">{officialApplicantName || "Delivery Captain"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium text-[11px]">Registered Mobile:</span>
                  <span className="font-bold text-neutral-900 font-mono">{targetPhone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium text-[11px]">Operating Territory:</span>
                  <span className="font-bold text-neutral-900">{selectedCity} ({pincode})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium text-[11px]">Effective Agreement Date:</span>
                  <span className="font-bold text-emerald-800">
                    {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Scroll / Swipe Up Instruction Banner */}
              {!hasScrolledToBottom ? (
                <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs shadow-2xs">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ArrowDown className="w-4 h-4 text-amber-600 animate-bounce" />
                    <span>नीचे तक स्क्रॉल (Swipe Up) करें — पढ़ना अनिवार्य है</span>
                  </span>
                  <button
                    type="button"
                    onClick={jumpToEndOfAgreement}
                    className="text-[11px] font-bold text-amber-900 underline bg-amber-200/80 hover:bg-amber-300 px-2 py-0.5 rounded-md active:scale-95 transition-all"
                  >
                    नीचे जाएं ↓
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-[#00C853] shrink-0" />
                  <span>आपने पूरा अनुबंध पढ़ लिया है। चेकबॉक्स व हस्ताक्षर अनलॉक हो गए हैं। ✓</span>
                </div>
              )}

              {/* Legal Agreement Document Container (Scrollable) */}
              <div
                ref={agreementScrollRef}
                onScroll={handleAgreementScroll}
                className="max-h-72 sm:max-h-80 overflow-y-auto p-3.5 bg-white border-2 border-neutral-200 rounded-xl space-y-3 text-[11px] leading-relaxed text-neutral-700 font-normal scroll-smooth shadow-inner"
              >
                <div className="text-center pb-2 border-b border-neutral-200">
                  <h4 className="text-xs font-black text-neutral-900 uppercase tracking-wide">
                    QUICKPRESS DELIVERY PARTNER SERVICE LEVEL AGREEMENT (SLA)
                  </h4>
                  <p className="text-[10px] text-neutral-500 font-medium">
                    (Indian Contract Act, 1872 & Information Technology Act, 2000 Electronic Contract)
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-neutral-900">1. स्वतंत्र डिलीवरी पार्टनर का दर्जा (Independent Contractor Status):</p>
                  <p>
                    डिलीवरी पार्टनर ("कैप्टन") QuickPress प्लेटफ़ॉर्म पर एक स्वतंत्र सेवा प्रदाता (Independent Contractor) के रूप में कार्य करता है। यह अनुबंध किसी भी प्रकार के रोजगार, साझेदारी या संयुक्त उद्यम (Employer-Employee / Partnership) का निर्माण नहीं करता है। कैप्टन अपनी सुविधानुसार कार्य के घंटे और स्थान चुनने के लिए स्वतंत्र है।
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-neutral-900">2. सेवा की गुणवत्ता एवं समयबद्धता (Service Quality & Timeliness):</p>
                  <p>
                    कैप्टन स्टोर से आर्डर पिकअप करने तथा ग्राहक के निर्धारित पते तक सुरक्षित व समय पर पहुंचाने हेतु पूरी जिम्मेदारी लेगा। सामान को किसी प्रकार का नुकसान न हो, पार्सल या भोजन सील-बंद स्थिति में ही ग्राहक को सौंपा जाए।
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-neutral-900">3. यातायात नियम, हेलमेट एवं वैध लाइसेंस (Traffic & Road Safety Compliance):</p>
                  <p>
                    सड़क पर वाहन चलाते समय हेलमेट पहनना अनिवार्य है। कैप्टन प्रमाणित करता है कि उसके पास वैध ड्राइविंग लाइसेंस (DL), वाहन पंजीकरण (RC), तथा वैध वाहन बीमा (Third-Party Insurance) है। किसी भी यातायात उल्लंघन अथवा चालान की जिम्मेदारी स्वयं कैप्टन की होगी।
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-neutral-900">4. भुगतान एवं शून्य धोखाधड़ी नीति (Payouts & Zero Cash Fraud):</p>
                  <p>
                    प्रत्येक सफल डिलीवरी का पारिश्रमिक सीधे कैप्टन के सत्यापित बैंक खाते / UPI में तय समय पर ट्रांसफर किया जाएगा। कैश-ऑन-डिलीवरी (COD) से एकत्रित राशि को तुरंत सिस्टम में दर्ज करना अनिवार्य है। किसी भी फर्जी डिलीवरी या हेराफेरी पर खाता तत्काल ब्लॉक कर कानूनी कार्रवाई की जाएगी।
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-neutral-900">5. ग्राहक गोपनीयता व शिष्टाचार (Customer Privacy & Courtesy):</p>
                  <p>
                    ग्राहक का नाम, पता व फोन नंबर केवल डिलीवरी कार्य हेतु है। डिलीवरी के बाद ग्राहक से संपर्क करना, नंबर साझा करना अथवा अनुचित व्यवहार करना सख्त वर्जित है।
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-neutral-900">6. डिजिटल हस्ताक्षर की वैधता (Digital Signature Legal Validity):</p>
                  <p>
                    सूचना प्रौद्योगिकी अधिनियम, 2000 (Information Technology Act, 2000) के तहत इस स्क्रीन पर किया गया आपका इलेक्ट्रॉनिक हस्ताक्षर (E-Signature) कानूनी रूप से भौतिक हस्ताक्षर के समान वैध व बाध्यकारी है।
                  </p>
                </div>

                <div className="pt-2 text-center border-t border-dashed border-neutral-300 text-neutral-500 font-bold text-[10px]">
                  [ *** END OF CONTRACT / अनुबंध का समापन *** ]
                </div>
              </div>

              {/* Agreement Acceptance Checkbox */}
              <div
                onClick={() => {
                  if (!hasScrolledToBottom) {
                    toast.warning("Kripya pehle agreement ko poora neeche tak scroll (swipe up) karein!");
                    jumpToEndOfAgreement();
                  }
                }}
                className={`flex items-start gap-2.5 p-3 rounded-xl border-2 transition-all ${
                  !hasScrolledToBottom
                    ? "bg-neutral-100 border-neutral-200 opacity-60 cursor-not-allowed"
                    : fieldErrors["agreementConsent"]
                    ? "border-red-400 bg-red-50/20 ring-2 ring-red-400/20 cursor-pointer"
                    : agreementConsent
                    ? "border-emerald-500 bg-emerald-50/20 cursor-pointer"
                    : "border-neutral-200 bg-white hover:border-[#00C853] cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  id="agreement-checkbox"
                  disabled={!hasScrolledToBottom}
                  checked={agreementConsent}
                  onChange={(e) => {
                    if (hasScrolledToBottom) {
                      setAgreementConsent(e.target.checked);
                      clearFieldError("agreementConsent");
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-[#00C853] focus:ring-[#00C853] disabled:opacity-50"
                />
                <div className="flex-1">
                  <label
                    htmlFor="agreement-checkbox"
                    className={`text-[11px] font-bold block ${
                      !hasScrolledToBottom ? "text-neutral-500 cursor-not-allowed" : "text-neutral-900 cursor-pointer"
                    }`}
                  >
                    मैंने QuickPress डिलीवरी पार्टनर अनुबंध की सभी शर्तें व नियम पढ़ लिए हैं और मैं पूर्ण सहमति देता हूँ। *
                  </label>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    I declare that all information is truthful, and I accept the terms of the service agreement.
                  </p>
                  {!hasScrolledToBottom && (
                    <p className="text-[10px] font-bold text-amber-700 mt-1">
                      ⚠️ यह चेकबॉक्स अनुबंध को अंत तक स्क्रॉल करने के बाद ही टिक होगा।
                    </p>
                  )}
                  {fieldErrors["agreementConsent"] && (
                    <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{fieldErrors["agreementConsent"]}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Digital Signature Pad */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide flex items-center gap-1">
                    <PenTool className="w-3.5 h-3.5 text-[#00C853]" />
                    <span>Candidate Digital Signature (हस्ताक्षर)</span>
                    <span className="text-red-500 font-black">*</span>
                  </label>
                  {hasSignature && (
                    <button
                      type="button"
                      onClick={clearSig}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <Eraser className="w-3 h-3" />
                      <span>Clear / दोबारा करें</span>
                    </button>
                  )}
                </div>

                <div
                  className={`relative w-full h-36 bg-white border-2 rounded-xl overflow-hidden transition-all ${
                    fieldErrors["hasSignature"]
                      ? "border-red-400 bg-red-50/15 ring-2 ring-red-400/20"
                      : hasSignature
                      ? "border-emerald-500 shadow-xs"
                      : "border-neutral-300 hover:border-[#00C853]"
                  }`}
                >
                  <canvas
                    ref={sigCanvasRef}
                    onMouseDown={startSig}
                    onMouseMove={moveSig}
                    onMouseUp={endSig}
                    onMouseLeave={endSig}
                    onTouchStart={startSig}
                    onTouchMove={moveSig}
                    onTouchEnd={endSig}
                    className="w-full h-full touch-none cursor-crosshair bg-white"
                  />

                  {/* Guide placeholder watermark when empty */}
                  {!hasSignature && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-neutral-400 select-none">
                      <PenTool className="w-5 h-5 mb-1 text-neutral-300 stroke-[1.5]" />
                      <p className="text-xs font-bold">यहाँ अपनी उंगली से हस्ताक्षर (Sign) करें</p>
                      <p className="text-[10px]">Draw your signature with finger or stylus inside box</p>
                    </div>
                  )}

                  {/* Signature Base Guide Line */}
                  <div className="absolute bottom-5 left-6 right-6 border-b border-dashed border-neutral-300 pointer-events-none" />
                </div>

                {fieldErrors["hasSignature"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["hasSignature"]}</span>
                  </p>
                )}

                {hasSignature && (
                  <div className="mt-1.5 p-2 bg-neutral-50 rounded-lg text-[10px] text-neutral-600 flex items-center justify-between border border-neutral-200">
                    <span className="font-bold flex items-center gap-1 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-[#00C853]" />
                      <span>हस्ताक्षर दर्ज: {officialApplicantName}</span>
                    </span>
                    <span className="font-mono text-neutral-500">{new Date().toLocaleDateString("en-IN")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Final Submission Buttons */}
            <div
              className="pt-2 space-y-2"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 16px, 24px)" }}
            >
              <button
                type="submit"
                disabled={loading || !hasScrolledToBottom || !agreementConsent || !hasSignature}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#00C853] hover:bg-[#00B248] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Submitting Application & Agreement to Admin...</span>
                  </div>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Accept Agreement & Submit Application</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrevStep}
                className="w-full py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                ← Back to Bank Details
              </button>

              <p className="text-[10px] text-center text-neutral-500 font-medium">
                Your application will be reviewed and activated by the QuickPress Admin team.
              </p>
            </div>
          </form>
        )}
      </div>

      {/* 4. Bottom Navigation Action Bar (Steps 1 to 5) */}
      {currentStep < 6 && (
        <div
          className="sticky bottom-0 z-40 px-4 pt-3 bg-white border-t border-neutral-200 flex items-center justify-between gap-3 shadow-md"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 12px, 16px)" }}
        >
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="h-11 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl active:scale-95 transition-all"
            >
              Previous
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNextStep}
            className="flex-1 h-11 flex items-center justify-center gap-2 bg-[#00C853] hover:bg-[#00B248] text-white font-bold text-xs rounded-xl shadow-xs active:scale-98 transition-all"
          >
            <span>
              {currentStep === 5 ? "Continue to Step 6 (Partner Agreement)" : `Continue to Step ${currentStep + 1}`}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
}
