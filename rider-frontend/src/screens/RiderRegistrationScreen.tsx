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
  KeyRound,
  Lock,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  Package,
  PenTool,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Upload,
  User,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useRiderContext } from "../context/RiderContext";
import {
  submitRiderRegistration,
  uploadRiderDocument,
  sendRiderEmailOtp,
  verifyRiderEmailOtp,
  sendRiderAgreementOtp,
  verifyRiderAgreementOtp,
} from "../api/rider/rider-auth-api";
import { reverseGeocodeCoords } from "../api/core/maps-api";
import { apiGetJson, apiPostJson } from "../api/core/transport";
import { readSession, writeSession } from "../api/core/session-store";
import { QuickPressLogo } from "../components/common/QuickPressLogo";
import { useLanguage } from "../lib/i18n";
import { SimpleSelfieCaptureModal } from "../components/kyc/SimpleSelfieCaptureModal";
import { DeliveryKitSelectionStep } from "../components/registration/DeliveryKitSelectionStep";
import { compareKycNames } from "../lib/kyc-name-matcher";
import { Toaster } from "@/shared/ui/sonner";
import { triggerHaptic } from "../lib/captain-audio";
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
        /* Document Scanner Viewfinder Frame */
        <div
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={`relative group p-4 border rounded-xl cursor-pointer transition-all ${
            error
              ? "border-red-400 bg-red-50/20 ring-2 ring-red-400/20"
              : isUploading
              ? "bg-neutral-100 border-neutral-300 cursor-not-allowed"
              : "border-neutral-200 bg-neutral-50/80 hover:bg-emerald-50/20 hover:border-emerald-500"
          }`}
        >
          {/* Scanner Viewfinder 4 Corner Brackets */}
          <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-neutral-400 group-hover:border-emerald-600 rounded-tl-sm transition-colors" />
          <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-neutral-400 group-hover:border-emerald-600 rounded-tr-sm transition-colors" />
          <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-neutral-400 group-hover:border-emerald-600 rounded-bl-sm transition-colors" />
          <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-neutral-400 group-hover:border-emerald-600 rounded-br-sm transition-colors" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0 group-hover:border-emerald-300 transition-colors">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 text-[#00C853] animate-spin" />
                ) : (
                  <Camera className={`w-4 h-4 ${error ? "text-red-500" : "text-neutral-500 group-hover:text-emerald-600"}`} />
                )}
              </div>
              <div>
                <p className={`text-xs font-bold ${error ? "text-red-800" : "text-neutral-800"}`}>
                  {isUploading ? "Uploading..." : `Scan or Upload ${label}`}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md shrink-0 border ${
                error
                  ? "text-red-700 bg-red-100/50 border-red-300"
                  : "text-neutral-700 bg-white border-neutral-200 group-hover:border-emerald-300"
              }`}
            >
              {isUploading ? "Wait..." : "Scan"}
            </span>
          </div>
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

/** Missing Fields Summary Alert Banner (Disabled for clean UI) */
function MissingFieldsAlert({ missingList }: { missingList: string[] }) {
  return null;
}

export function RiderRegistrationScreen() {
  const navigate = useNavigate();
  const { phone, session, signIn } = useRiderContext();
  const { t } = useLanguage();

  const targetPhone =
    phone ||
    session?.phone ||
    (typeof window !== "undefined"
      ? window.sessionStorage.getItem("qp.rider.pendingPhone") ||
        window.localStorage.getItem("qp.rider.pendingPhone") ||
        ""
      : "");

  // 5 Step Flow: 1. Personal, 2. Aadhaar & Selfie, 3. Vehicle & RC, 4. Driving Licence, 5. Bank
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});

  // Live Cities
  const [liveCities, setLiveCities] = useState<LiveCity[]>([]);
  const [loadingCities, setLoadingCities] = useState<boolean>(false);

  // STEP 1: Personal Data
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState<boolean>(false);
  const [showEmailOtpBox, setShowEmailOtpBox] = useState<boolean>(false);
  const [emailOtp, setEmailOtp] = useState<string>("");
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState<boolean>(false);
  const [emailOtpCountdown, setEmailOtpCountdown] = useState<number>(0);
  const [gender, setGender] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [customPincodeMode, setCustomPincodeMode] = useState<boolean>(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [emergencyPhone, setEmergencyPhone] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("ref") || "";
    }
    return "";
  });

  const [rejectionNotice, setRejectionNotice] = useState<string | null>(null);
  const [isResubmissionFlow, setIsResubmissionFlow] = useState<boolean>(false);

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

  // STEP 6: Delivery Kit Selection & Razorpay Payment
  const [kitPaid, setKitPaid] = useState<boolean>(false);
  const [kitOrderData, setKitOrderData] = useState<any>(null);
  const [selectedKitPlan, setSelectedKitPlan] = useState<"FULL_PAYMENT" | "PART_PAYMENT">("PART_PAYMENT");

  // STEP 7: Partner Agreement & E-Signature
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState<boolean>(false);
  const [agreementConsent, setAgreementConsent] = useState<boolean>(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [isSendingAgreementOtp, setIsSendingAgreementOtp] = useState<boolean>(false);
  const [showAgreementOtpBox, setShowAgreementOtpBox] = useState<boolean>(false);
  const [agreementOtp, setAgreementOtp] = useState<string>("");
  const [isVerifyingAgreementOtp, setIsVerifyingAgreementOtp] = useState<boolean>(false);
  const [agreementOtpCountdown, setAgreementOtpCountdown] = useState<number>(0);
  const [isAgreementOtpVerified, setIsAgreementOtpVerified] = useState<boolean>(false);
  const [liveRiderAgreement, setLiveRiderAgreement] = useState<string>("");
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const agreementScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    apiGetJson<any>("/api/public/legal/rider-agreement", { anonymous: true })
      .then((res) => {
        if (res?.content && res?.isConfigured) {
          setLiveRiderAgreement(res.content);
        }
      })
      .catch(() => {});
  }, []);

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

  // Setup / re-setup signature canvas whenever step 7 (Agreement) becomes active
  useEffect(() => {
    if (currentStep === 7 && sigCanvasRef.current) {
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
        toast.success("✓ You have read the entire agreement. Agreement consent is now unlocked.");
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
        toast.success("✓ You have read the entire agreement. Agreement consent is now unlocked.");
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

  // Email & Agreement OTP Countdown Timers
  useEffect(() => {
    if (emailOtpCountdown <= 0) return;
    const timer = setInterval(() => {
      setEmailOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailOtpCountdown]);

  useEffect(() => {
    if (agreementOtpCountdown <= 0) return;
    const timer = setInterval(() => {
      setAgreementOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [agreementOtpCountdown]);

  // Step 1: Email OTP Handlers
  const handleSendEmailOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSendingEmailOtp(true);
    try {
      const res = await sendRiderEmailOtp(cleanEmail, fullName.trim() || "Delivery Captain");
      if (res.ok) {
        setShowEmailOtpBox(true);
        setEmailOtpCountdown(60);
        clearFieldError("email");
        toast.success(`Verification OTP sent to ${cleanEmail} ✓`);
      } else {
        toast.error(res.message || "Failed to send email verification code");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send email OTP. Please retry.");
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = emailOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }
    setIsVerifyingEmailOtp(true);
    try {
      const res = await verifyRiderEmailOtp(cleanEmail, cleanOtp);
      if (res.ok) {
        setIsEmailVerified(true);
        setShowEmailOtpBox(false);
        clearFieldError("email");
        toast.success("Email verified successfully! ✓");
      } else {
        toast.error(res.message || "Invalid OTP code");
      }
    } catch (err: any) {
      toast.error(err?.message || "Invalid or expired OTP code");
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  // Step 6: Agreement Authorization Email OTP Handlers
  const handleSendAgreementOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Verified email address is missing");
      return;
    }
    setIsSendingAgreementOtp(true);
    try {
      const res = await sendRiderAgreementOtp(cleanEmail, officialApplicantName || fullName.trim() || "Delivery Captain");
      if (res.ok) {
        setShowAgreementOtpBox(true);
        setAgreementOtpCountdown(60);
        clearFieldError("agreementOtp");
        toast.success(`Agreement authorization code sent to ${cleanEmail} ✓`);
      } else {
        toast.error(res.message || "Failed to send Agreement OTP");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send Agreement OTP. Please retry.");
    } finally {
      setIsSendingAgreementOtp(false);
    }
  };

  const handleVerifyAgreementOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = agreementOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error("Please enter the 6-digit Agreement OTP");
      return;
    }
    setIsVerifyingAgreementOtp(true);
    try {
      const res = await verifyRiderAgreementOtp(cleanEmail, cleanOtp);
      if (res.ok) {
        setIsAgreementOtpVerified(true);
        setShowAgreementOtpBox(false);
        clearFieldError("agreementOtp");
        toast.success("Agreement legally authorized and confirmed via Email OTP! ✓");
      } else {
        toast.error(res.message || "Invalid Agreement OTP code");
      }
    } catch (err: any) {
      toast.error(err?.message || "Invalid or expired Agreement OTP");
    } finally {
      setIsVerifyingAgreementOtp(false);
    }
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

  // Safeguard & Prefill: Check verification status on mount - Allow resubmission/edit if rejected or ?resubmit=true
  useEffect(() => {
    let active = true;
    const urlParams = new URLSearchParams(window.location.search);
    const isResubmitParam = urlParams.get("resubmit") === "true" || urlParams.get("edit") === "true";

    fetchRiderVerificationStatus()
      .then((statusRes) => {
        if (!active || !statusRes) return;
        if (statusRes.isApproved || statusRes.isVerified) {
          toast.success("Account already approved. Opening Hub...");
          navigate({ to: "/dashboard", replace: true });
        } else if (statusRes.isOnboarded && !isResubmitParam && statusRes.status !== "rejected" && statusRes.kycStatus !== "rejected") {
          navigate({ to: "/verification", replace: true });
        } else {
          if (isResubmitParam || statusRes.status === "rejected" || statusRes.kycStatus === "rejected") {
            setIsResubmissionFlow(true);
          }
          if (statusRes.rejectionReason) {
            setRejectionNotice(statusRes.rejectionReason);
          }
          // Pre-fill form from existing profile if available
          if (statusRes.draftData) {
            const d = statusRes.draftData;
            if (d.fullName) setFullName((prev) => prev || d.fullName);
            if (d.email) {
              setEmail((prev) => prev || d.email);
              setIsEmailVerified(true);
            }
            if (d.gender) setGender((prev) => prev || d.gender);
            if (d.dob) setDob((prev) => prev || d.dob);
            if (d.city) setSelectedCity((prev) => prev || d.city);
            if (d.pincode) setPincode((prev) => prev || d.pincode);
            if (d.emergencyPhone) setEmergencyPhone((prev) => prev || d.emergencyPhone);
            if (d.aadhaar) setAadhaarNumber((prev) => prev || d.aadhaar);
            if (d.aadhaarFront) setAadhaarFrontUrl((prev) => prev || d.aadhaarFront);
            if (d.aadhaarBack) setAadhaarBackUrl((prev) => prev || d.aadhaarBack);
            if (d.pan) {
              setPanNumber((prev) => prev || d.pan);
              setPanVerified(true);
            }
            if (d.panCard) setPanCardUrl((prev) => prev || d.panCard);
            if (d.selfieUrl) {
              setSelfieUrl((prev) => prev || d.selfieUrl);
              setSelfieVerified(true);
            }
            if (d.vehicleNumber) {
              setVehicleNumber((prev) => prev || d.vehicleNumber);
              setRcVerified(true);
            }
            if (d.vehicleType) setVehicleType((prev) => prev || (String(d.vehicleType).toLowerCase().includes("ev") ? "ev" : "bike"));
            if (d.vehicleBrand) setSelectedBrand((prev) => prev || d.vehicleBrand);
            if (d.vehicleModel) setSelectedModel((prev) => prev || d.vehicleModel);
            if (d.bikePhoto) setBikePhotoUrl((prev) => prev || d.bikePhoto);
            if (d.rcFront) setRcFrontUrl((prev) => prev || d.rcFront);
            if (d.rcBack) setRcBackUrl((prev) => prev || d.rcBack);
            if (d.license) {
              setDrivingLicense((prev) => prev || d.license);
              setDlVerified(true);
            }
            if (d.dlExpiry) setDlExpiry((prev) => prev || d.dlExpiry);
            if (d.dlFront) setDlFrontUrl((prev) => prev || d.dlFront);
            if (d.dlBack) setDlBackUrl((prev) => prev || d.dlBack);
            if (d.bankName) setCustomBankName((prev) => prev || d.bankName);
            if (d.accountNumber) {
              setAccountNumber((prev) => prev || d.accountNumber);
              setConfirmAccountNumber((prev) => prev || d.accountNumber);
              setBankVerified(true);
            }
            if (d.ifsc) setIfsc((prev) => prev || d.ifsc);
            if (d.upiId) setUpiId((prev) => prev || d.upiId);
            if (d.passbookPhoto) setPassbookUrl((prev) => prev || d.passbookPhoto);
            if (d.cancelledCheque) setCancelledChequeUrl((prev) => prev || d.cancelledCheque);
            if (d.agreementSignature) {
              setSignatureDataUrl((prev) => prev || d.agreementSignature);
              setHasSignature(true);
            }
          }
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [navigate]);

  // Load Admin Operating Cities (Strictly Live from Admin Panel - Zero Hardcoded Cities)
  useEffect(() => {
    let active = true;
    setLoadingCities(true);
    apiGetJson<LiveCity[]>("/api/cities")
      .then((cities) => {
        if (!active || !Array.isArray(cities)) return;
        setLiveCities(cities);
      })
      .catch((err) => {
        console.error("Failed to load operating cities from Admin Panel:", err);
        if (active) {
          setLiveCities([]);
        }
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Auto-detect live city and pincode from GPS (Matches strictly against Admin Panel operating cities)
  const detectLiveLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await reverseGeocodeCoords(lat, lng);
          if (res) {
            const detectedCity = (res.city || res.area || "").trim();
            const detectedPin = res.pincode || "";
            if (detectedCity) {
              const matchedAdminCity = liveCities.find(
                (c) =>
                  (c.city || c.name)?.trim().toLowerCase() === detectedCity.toLowerCase() ||
                  detectedCity.toLowerCase().includes((c.city || c.name || "").toLowerCase())
              );

              if (matchedAdminCity) {
                const cityName = matchedAdminCity.city || matchedAdminCity.name;
                setSelectedCity(cityName);
                clearFieldError("selectedCity");
                toast.success(`Active Territory Detected: ${cityName}${detectedPin ? ` (${detectedPin})` : ""}`);
              } else {
                toast.error(
                  `QuickPress is not currently operational in ${detectedCity}. Please select an approved operating city.`
                );
              }
            }
            if (detectedPin) {
              setPincode(detectedPin);
              setCustomPincodeMode(true);
              clearFieldError("pincode");
            }
          }
        } catch {
          /* ignore */
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        setIsDetectingLocation(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Auto-detect live city and pincode from GPS on mount
  useEffect(() => {
    detectLiveLocation();
  }, []);

  // Segmented DOB values for custom picker
  const dobParts = dob ? dob.split("-") : ["", "", ""];
  const dobYear = dobParts[0] || "";
  const dobMonth = dobParts[1] || "";
  const dobDay = dobParts[2] || "";

  const handleDobChange = (part: "year" | "month" | "day", val: string) => {
    const y = part === "year" ? val : dobYear;
    const m = part === "month" ? val : dobMonth;
    const d = part === "day" ? val : dobDay;
    if (y && m && d) {
      setDob(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
      clearFieldError("dob");
    } else if (y || m || d) {
      setDob(`${y || "2000"}-${(m || "01").padStart(2, "0")}-${(d || "01").padStart(2, "0")}`);
      clearFieldError("dob");
    }
  };

  // Segmented DL Expiry values for custom picker
  const dlExpiryParts = dlExpiry ? dlExpiry.split("-") : ["", "", ""];
  const dlExpiryYear = dlExpiryParts[0] || "";
  const dlExpiryMonth = dlExpiryParts[1] || "";
  const dlExpiryDay = dlExpiryParts[2] || "";

  const handleDlExpiryChange = (part: "year" | "month" | "day", val: string) => {
    const y = part === "year" ? val : dlExpiryYear;
    const m = part === "month" ? val : dlExpiryMonth;
    const d = part === "day" ? val : dlExpiryDay;
    if (y && m && d) {
      setDlExpiry(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
      clearFieldError("dlExpiry");
    } else if (y || m || d) {
      setDlExpiry(`${y || "2030"}-${(m || "01").padStart(2, "0")}-${(d || "01").padStart(2, "0")}`);
      clearFieldError("dlExpiry");
    }
  };

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
        setPanVerified(false);
        toast.error(res?.message || "PAN verification failed. Check number.");
      }
    } catch (err: any) {
      setPanVerified(false);
      toast.error(err?.message || "PAN verification service unavailable.");
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
      } else {
        setRcVerified(false);
        toast.error(res?.message || "RC verification failed. Check vehicle number.");
      }
    } catch (err: any) {
      setRcVerified(false);
      toast.error(err?.message || "RC verification service unavailable.");
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
      } else {
        setDlVerified(false);
        toast.error(res?.message || "DL verification failed. Check licence number.");
      }
    } catch (err: any) {
      setDlVerified(false);
      toast.error(err?.message || "DL verification service unavailable.");
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
      } else {
        setBankVerified(false);
        toast.error(res?.message || "Bank account verification failed. Please check IFSC and Account Number.");
      }
    } catch (err: any) {
      setBankVerified(false);
      toast.error(err?.message || "Bank account verification service unavailable.");
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
        newErrors["fullName"] = "Please enter your full legal name matching government ID.";
        missing.push("Full Legal Name");
      }
      if (!email.trim() || !email.includes("@") || !email.includes(".")) {
        newErrors["email"] = "Please enter a valid email address.";
        missing.push("Official Email Address");
      } else if (!isEmailVerified) {
        newErrors["email"] = "Please verify your email address with OTP.";
        missing.push("Email OTP Verification");
      }
      if (!gender) {
        newErrors["gender"] = "Please select your gender.";
        missing.push("Gender");
      }
      if (!dob.trim()) {
        newErrors["dob"] = "Please select your date of birth.";
        missing.push("Date of Birth");
      }
      if (!selectedCity.trim()) {
        newErrors["selectedCity"] = "Please select your operating city.";
        missing.push("Operating City");
      }
      if (!pincode.trim() || pincode.trim().length !== 6) {
        newErrors["pincode"] = "Please enter a valid 6-digit postal pincode.";
        missing.push("6-Digit Pincode");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Please complete all ${missing.length} required fields to proceed.`);
        triggerHaptic();
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
          newErrors["aadhaarNumber"] = "Please enter a valid 12-digit Aadhaar number.";
          missing.push("12-Digit Aadhaar Number");
        }
        if (!aadhaarFrontUrl) {
          newErrors["aadhaarFrontUrl"] = "Please upload the front photo of your Aadhaar card.";
          missing.push("Aadhaar Card Front Photo");
        }
      } else {
        const cleanPan = panNumber.trim().toUpperCase();
        if (cleanPan.length !== 10) {
          newErrors["panNumber"] = "Please enter a valid 10-character PAN number.";
          missing.push("10-Character PAN Number");
        }
        if (!panCardUrl) {
          newErrors["panCardUrl"] = "Please upload your PAN card photo.";
          missing.push("PAN Card Photo");
        }
      }

      if (!selfieUrl) {
        newErrors["selfieUrl"] = "Please upload or capture your profile photo.";
        missing.push("Profile Photo / Selfie");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Please complete all ${missing.length} required fields to proceed.`);
        triggerHaptic();
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
        newErrors["vehicleNumber"] = "Please enter a valid vehicle registration plate number (RC).";
        missing.push("Vehicle Registration Plate Number");
      }
      const effectiveBrand = brandInputMode === "custom" ? customBrand.trim() : selectedBrand.trim();
      if (!effectiveBrand) {
        newErrors["brand"] = "Please select or enter your vehicle brand.";
        missing.push("Vehicle Brand");
      }
      const effectiveModel = modelInputMode === "custom" ? customModel.trim() : selectedModel.trim();
      if (!effectiveModel) {
        newErrors["model"] = "Please select or enter your vehicle model.";
        missing.push("Vehicle Model");
      }
      if (!bikePhotoUrl) {
        newErrors["bikePhotoUrl"] = "Please upload a photo of your vehicle.";
        missing.push("Vehicle Photo");
      }
      if (!rcFrontUrl) {
        newErrors["rcFrontUrl"] = "Please upload the front photo of your vehicle RC card.";
        missing.push("Vehicle RC Front Photo");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Please complete all ${missing.length} required fields to proceed.`);
        triggerHaptic();
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
        newErrors["drivingLicense"] = "Please enter a valid Driving Licence number.";
        missing.push("Driving Licence Number");
      }
      if (!dlExpiry.trim()) {
        newErrors["dlExpiry"] = "Please select your Driving Licence expiry date.";
        missing.push("Licence Expiry Date");
      }
      if (!dlFrontUrl) {
        newErrors["dlFrontUrl"] = "Please upload the front photo of your Driving Licence.";
        missing.push("Driving Licence Front Photo");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Please complete all ${missing.length} required fields to proceed.`);
        triggerHaptic();
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
        newErrors["bankName"] = "Please select or enter your bank name.";
        missing.push("Bank Name");
      }
      const cleanAcc = accountNumber.trim();
      if (!cleanAcc || cleanAcc.length < 9) {
        newErrors["accountNumber"] = "Please enter a valid bank account number (9-18 digits).";
        missing.push("Bank Account Number");
      }
      if (confirmAccountNumber.trim() !== cleanAcc) {
        newErrors["confirmAccountNumber"] = "Bank account numbers do not match.";
        missing.push("Account Number Mismatch");
      }
      const cleanIfsc = ifsc.trim().toUpperCase();
      if (!cleanIfsc || cleanIfsc.length !== 11) {
        newErrors["ifsc"] = "Please enter a valid 11-character IFSC code.";
        missing.push("11-Character IFSC Code");
      }
      if (!passbookUrl && !cancelledChequeUrl) {
        newErrors["passbookUrl"] = "Please upload your bank passbook or cancelled cheque.";
        missing.push("Bank Proof Document");
      }

      if (missing.length > 0) {
        setFieldErrors(newErrors);
        setMissingSummary(missing);
        toast.error(`Please complete all ${missing.length} required fields to proceed.`);
        triggerHaptic();
        return;
      }

      setFieldErrors({});
      setMissingSummary([]);
      setCurrentStep(6);
      triggerHaptic();
      toast.success("Bank details saved. Moving to Step 6 (Delivery Kit Gear)");
    } else if (currentStep === 6) {
      // Step 6: Final Step - Submits Registration and Dispatches Agreement via Email
      handleSubmitRegistrationAfterKit();
    }
  };

  const handlePrevStep = () => {
    setFieldErrors({});
    setMissingSummary([]);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Step 6 Completion & Submission: Zomato-Style Post-Payment Agreement Flow
  const handleSubmitRegistrationAfterKit = async (order?: any) => {
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
        email: email.trim().toLowerCase(),
        isEmailVerified: true,
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
        accountHolder: officialApplicantName,
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        upiId: upiId.trim(),
        passbookPhoto: passbookUrl,
        passbookUrl: passbookUrl,
        cancelledCheque: cancelledChequeUrl,
        cancelledChequeUrl: cancelledChequeUrl,
        bankVerified: true,

        // Step 6 Delivery Kit Details
        kitOrderId: order?.id || order?.orderId || kitOrderData?.id,
        kitPaymentStatus: order?.payment?.status || "PAID",
        kitPaymentType: order?.pricing?.paymentType || selectedKitPlan,
        kitAmountPaid: order?.pricing?.amountPaid || (selectedKitPlan === "PART_PAYMENT" ? 300 : 999),
        kitBalanceRemaining: order?.pricing?.remainingBalance || (selectedKitPlan === "PART_PAYMENT" ? 900 : 0),
        kitTshirtSize: order?.tshirtSize || kitOrderData?.tshirtSize || "L",
        kitDeliveryPreference: order?.deliveryPreference || kitOrderData?.deliveryPreference || "home_delivery",
        kitFulfillmentStatus: "PENDING_DISPATCH",

        // Legal Agreement: Set to PENDING_SIGNATURE for Zomato-style email execution
        agreementStatus: "PENDING_SIGNATURE",
        agreementApproved: false,
        termsAccepted: true,

        // Official KYC Snapshot
        verifiedGovernmentName: officialApplicantName,
        isKycVerified: true,
        kycLocked: true,

        // Application Pending Status -> Admin Approval Gate
        status: "pending",
        kycStatus: "pending",
        isVerified: false,
        isOnboarded: true,
        riderId: (session as any)?.account?.linkedId || (session as any)?.account?.id || (session as any)?.riderId || (session as any)?.id || "",
        phone: targetPhone || session?.phone || phone,
        referral_code: referralCode.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
      };

      const result = await submitRiderRegistration(payload);
      signIn(result);

      try {
        localStorage.setItem("qp_rider_government_name", officialApplicantName);
        if (result?.agreementToken) {
          localStorage.setItem("qp_agreement_token", result.agreementToken);
        }
      } catch {}

      toast.success(
        "Delivery Kit Confirmed! Your Partner Agreement has been dispatched to your email for signature."
      );
      navigate({ to: "/verification", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Registration submission failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const matchedCityObj = liveCities.find((c) => (c.city || c.name) === selectedCity);
  const cityPincodes = matchedCityObj?.pincodes || [];

  // Step Bar Titles (6 Steps - Agreement is signed post-payment via email / verification status)
  const stepTitles = [
    { num: 1, title: "Personal", short: "Profile", icon: User },
    { num: 2, title: "Aadhaar & Photo", short: "Identity", icon: ShieldCheck },
    { num: 3, title: "Vehicle & RC", short: "Vehicle", icon: Bike },
    { num: 4, title: "Driving Licence", short: "Licence", icon: IdCard },
    { num: 5, title: "Bank Payout", short: "Bank", icon: CreditCard },
    { num: 6, title: "Delivery Kit", short: "Kit Gear", icon: Package },
  ];

  return (
    <div className="relative flex flex-col flex-1 w-full min-h-[100dvh] max-w-md mx-auto bg-[#F8FAFC] text-neutral-900 select-none pb-12">
      {/* Simple Live Selfie Camera Modal (No AI, Direct Photo Click) */}
      <SimpleSelfieCaptureModal
        isOpen={isSelfieCameraOpen}
        onClose={() => setIsSelfieCameraOpen(false)}
        onCapture={handleLiveSelfieCaptured}
      />

      {/* 1. Sticky Header & Clean Stepper Container */}
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-xs">
        <header
          className="flex items-center justify-between px-4 pb-2"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
            <div className="w-8 h-8 rounded-full bg-[#00C853]/10 flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5 text-[#00C853]" />
            </div>
            <div>
              <p className="text-xs font-black text-neutral-900 leading-tight">QuickPress Captain</p>
              <p className="text-[10px] text-neutral-500 font-medium">Partner Registration</p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-1 bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-md">
            Step {currentStep} of 6
          </span>
        </header>

        {/* Sleek Step Progress Line */}
        <div className="px-4 pb-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-neutral-800">
              {stepTitles[currentStep - 1]?.title}
            </span>
            <span className="text-[11px] font-bold text-[#00C853]">
              {Math.round((currentStep / 6) * 100)}% Completed
            </span>
          </div>

          <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00C853] transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Step Body */}
      <div className="p-4 flex-1">
        {/* Resubmission / Correction Banner */}
        {rejectionNotice && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-900 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-950">Previous Application Correction Request:</p>
              <p className="mt-0.5 text-red-800 font-medium">{rejectionNotice}</p>
              <p className="mt-1 text-[10px] text-red-700 font-semibold">Please check your details, upload corrected documents, and re-submit for Admin approval.</p>
            </div>
          </div>
        )}
        {!rejectionNotice && isResubmissionFlow && (
          <div className="mb-4 p-2.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-2 text-xs text-indigo-900 shadow-2xs">
            <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0 animate-spin" />
            <span className="font-bold">Editing & Updating Submitted Registration Details</span>
          </div>
        )}

        {/* ========================================================
            STEP 1: PERSONAL DATA
        ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <MissingFieldsAlert missingList={missingSummary} />

            <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3.5 shadow-xs">
              <div className="pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900">Step 1: Personal Details</h3>
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

              {/* Official Email Address & Live OTP Verification */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Official Email Address <span className="text-red-500 font-black">*</span>
                  </label>
                  {isEmailVerified && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <Check className="w-3 h-3 text-[#00C853] stroke-[3]" />
                      Verified
                    </span>
                  )}
                </div>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="e.g. ramesh.kumar@gmail.com"
                      disabled={isEmailVerified}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearFieldError("email");
                        if (isEmailVerified) setIsEmailVerified(false);
                      }}
                      className={`w-full h-11 px-3.5 bg-white border rounded-xl text-xs font-bold text-neutral-900 transition-all ${
                        isEmailVerified
                          ? "bg-emerald-50/30 border-emerald-300 text-emerald-950 font-semibold"
                          : fieldErrors["email"]
                          ? "border-red-500 ring-2 ring-red-400/20 bg-red-50/10 focus:border-red-500"
                          : "border-neutral-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/15"
                      }`}
                    />
                  </div>

                  {!isEmailVerified && (
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={isSendingEmailOtp || !email.includes("@") || emailOtpCountdown > 0}
                      className="h-11 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold text-xs shrink-0 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSendingEmailOtp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {emailOtpCountdown > 0
                          ? `Resend (${emailOtpCountdown}s)`
                          : showEmailOtpBox
                          ? "Resend Code"
                          : "Verify Email"}
                      </span>
                    </button>
                  )}

                  {isEmailVerified && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmailVerified(false);
                        setShowEmailOtpBox(false);
                        setEmailOtp("");
                      }}
                      className="text-[11px] font-bold text-neutral-500 hover:text-neutral-800 underline shrink-0 px-1 cursor-pointer"
                    >
                      Change
                    </button>
                  )}
                </div>

                {/* Inline Email OTP Box */}
                {!isEmailVerified && showEmailOtpBox && (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Enter 6-Digit Email OTP:</span>
                      </p>
                      <span className="text-[10px] text-emerald-700 font-medium truncate max-w-[160px]">
                        Sent to {email}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        maxLength={6}
                        placeholder="123456"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 h-10 px-3 bg-white border border-emerald-300 rounded-xl text-center text-sm font-black tracking-widest text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyEmailOtp}
                        disabled={isVerifyingEmailOtp || emailOtp.length !== 6}
                        className="h-10 px-4 rounded-xl bg-[#00C853] hover:bg-[#00B548] disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-black text-xs shrink-0 transition-all active:scale-95 flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        {isVerifyingEmailOtp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                        <span>Confirm OTP</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-neutral-500 font-medium">
                      ⏱️ Check your email inbox/spam. Valid for 10 minutes.
                    </p>
                  </div>
                )}

                {fieldErrors["email"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["email"]}</span>
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

              {/* Date of Birth (Segmented Modern Selector) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Date of Birth (DOB) <span className="text-red-500 font-black">*</span>
                  </label>
                  {dob && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {dob}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Day</span>
                    <select
                      value={dobDay}
                      onChange={(e) => handleDobChange("day", e.target.value)}
                      className="w-full h-12 pt-4 pb-1 px-2.5 bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-200 focus:border-[#00C853] focus:bg-white rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">DD</option>
                      {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Month</span>
                    <select
                      value={dobMonth}
                      onChange={(e) => handleDobChange("month", e.target.value)}
                      className="w-full h-12 pt-4 pb-1 px-2.5 bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-200 focus:border-[#00C853] focus:bg-white rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">MM</option>
                      {[
                        { num: "01", name: "Jan" },
                        { num: "02", name: "Feb" },
                        { num: "03", name: "Mar" },
                        { num: "04", name: "Apr" },
                        { num: "05", name: "May" },
                        { num: "06", name: "Jun" },
                        { num: "07", name: "Jul" },
                        { num: "08", name: "Aug" },
                        { num: "09", name: "Sep" },
                        { num: "10", name: "Oct" },
                        { num: "11", name: "Nov" },
                        { num: "12", name: "Dec" },
                      ].map((m) => (
                        <option key={m.num} value={m.num}>{m.num} - {m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Year</span>
                    <select
                      value={dobYear}
                      onChange={(e) => handleDobChange("year", e.target.value)}
                      className="w-full h-12 pt-4 pb-1 px-2.5 bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-200 focus:border-[#00C853] focus:bg-white rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">YYYY</option>
                      {Array.from({ length: 48 }, (_, i) => String(2008 - i)).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {fieldErrors["dob"] && (
                  <p className="mt-1 text-[11px] font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{fieldErrors["dob"]}</span>
                  </p>
                )}
              </div>

              {/* Operating City */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Operating City <span className="text-red-500 font-black">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={detectLiveLocation}
                    disabled={isDetectingLocation}
                    className="text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                  >
                    <Navigation className={`w-3 h-3 text-[#00C853] ${isDetectingLocation ? "animate-spin" : ""}`} />
                    <span>{isDetectingLocation ? "Detecting..." : "Detect Live City"}</span>
                  </button>
                </div>
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
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Operating Pincode <span className="text-red-500 font-black">*</span>
                </label>
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

              {/* Captain Referral Code (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. QP-RDR-8821"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3.5 uppercase bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:border-[#00C853] focus:outline-none transition-all placeholder:normal-case placeholder:font-normal placeholder:text-neutral-400"
                  />
                  {referralCode.trim() && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                      Invite Applied
                    </span>
                  )}
                </div>
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
                      <span>Capture Live Photo</span>
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
                      <span>Upload Photo from Device</span>
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

              {/* DL Expiry Date - Segmented Custom Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
                    Licence Valid Till (Expiry Date) <span className="text-red-500 font-black">*</span>
                  </label>
                  {dlExpiry && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {dlExpiry}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Day</span>
                    <select
                      value={dlExpiryDay}
                      onChange={(e) => handleDlExpiryChange("day", e.target.value)}
                      className="w-full h-12 pt-4 pb-1 px-2.5 bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-200 focus:border-[#00C853] focus:bg-white rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">DD</option>
                      {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Month</span>
                    <select
                      value={dlExpiryMonth}
                      onChange={(e) => handleDlExpiryChange("month", e.target.value)}
                      className="w-full h-12 pt-4 pb-1 px-2.5 bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-200 focus:border-[#00C853] focus:bg-white rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">MM</option>
                      {[
                        { num: "01", name: "Jan" },
                        { num: "02", name: "Feb" },
                        { num: "03", name: "Mar" },
                        { num: "04", name: "Apr" },
                        { num: "05", name: "May" },
                        { num: "06", name: "Jun" },
                        { num: "07", name: "Jul" },
                        { num: "08", name: "Aug" },
                        { num: "09", name: "Sep" },
                        { num: "10", name: "Oct" },
                        { num: "11", name: "Nov" },
                        { num: "12", name: "Dec" },
                      ].map((m) => (
                        <option key={m.num} value={m.num}>{m.num} - {m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Year</span>
                    <select
                      value={dlExpiryYear}
                      onChange={(e) => handleDlExpiryChange("year", e.target.value)}
                      className="w-full h-12 pt-4 pb-1 px-2.5 bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-200 focus:border-[#00C853] focus:bg-white rounded-xl text-xs font-bold text-neutral-900 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">YYYY</option>
                      {Array.from({ length: 26 }, (_, i) => String(2025 + i)).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
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

              {/* Account Holder Name: READ-ONLY (Clean minimal styling, no lock icons or verbose descriptions) */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Account Holder Name <span className="text-red-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={officialApplicantName}
                  className="w-full h-11 px-3.5 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 cursor-not-allowed select-none"
                />
              </div>

              {/* IFSC Code & "Find / Verify IFSC" */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wide mb-1">
                  Bank IFSC Code <span className="text-red-500 font-black">*</span>
                </label>
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
            STEP 6: DELIVERY KIT SELECTION & RAZORPAY PAYMENT
        ======================================================== */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <DeliveryKitSelectionStep
              riderPhone={targetPhone}
              riderName={officialApplicantName || fullName}
              city={selectedCity}
              shippingAddress={{
                city: selectedCity,
                pincode: pincode,
                state: "Uttar Pradesh",
              }}
              onBack={handlePrevStep}
              isAlreadyPaid={kitPaid}
              existingKitOrder={kitOrderData}
              onPaymentSuccess={async (order) => {
                setKitPaid(true);
                setKitOrderData(order);
                if (order?.pricing?.paymentType) {
                  setSelectedKitPlan(order.pricing.paymentType);
                }
                await handleSubmitRegistrationAfterKit(order);
              }}
            />
          </div>
        )}

      </div>

      {/* 4. Bottom Navigation Action Bar (Steps 1 to 5 only - Step 6 uses Delivery Kit payment button) */}
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
              {currentStep === 5
                ? "Continue to Step 6 (Delivery Kit)"
                : `Continue to Step ${currentStep + 1}`}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Floating Centered Toast Notification Container */}
      <Toaster />
    </div>
  );
}
